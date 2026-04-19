import { TokenProvider } from './auth.js';
import { AppStoreConnectAPIError, type AppStoreConnectAPIErrorDetail } from './errors.js';
import { Apps } from './resources/apps.js';

/**
 * Credentials required to sign App Store Connect API requests.
 *
 * Obtain these from App Store Connect → Users and Access → Keys. Each key is
 * shown only once at download time; store the `.p8` contents securely (e.g.,
 * a secrets manager or environment variable, never committed to source).
 */
export interface AppStoreConnectCredentials {
  /**
   * The 10-character Key ID (shown next to the key in App Store Connect,
   * e.g. `"ABC123DEFG"`). Included as the `kid` header of each JWT.
   */
  keyId: string;

  /**
   * The Issuer ID (a UUID shown on the Keys page). Required only for **team**
   * API keys — included as the `iss` claim of each JWT to identify the
   * App Store Connect team.
   *
   * Omit this field when authenticating with an **individual** API key. In
   * that case the JWT is signed with a `sub: "user"` claim instead, since
   * individual keys are scoped to the user who created them and have no
   * team-level issuer.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/generating-tokens-for-api-requests
   */
  issuerId?: string;

  /**
   * PEM-encoded contents of the `.p8` private key file, including the
   * `-----BEGIN PRIVATE KEY-----` / `-----END PRIVATE KEY-----` lines.
   * This is the full file content, not a path — read the file yourself and
   * pass the string.
   */
  privateKey: string;

  /**
   * JWT lifetime in seconds. Defaults to 1200 (20 minutes), which is the
   * maximum Apple accepts. Lower values reduce the window in which a leaked
   * token can be abused, at the cost of more frequent signing work.
   */
  tokenTtlSeconds?: number;
}

/**
 * Options accepted by the {@link AppStoreConnect} constructor.
 *
 * Extends {@link AppStoreConnectCredentials} with runtime overrides useful
 * for testing (custom `fetch`) and non-production environments (custom
 * `baseUrl`).
 */
export interface AppStoreConnectOptions extends AppStoreConnectCredentials {
  /**
   * Override the API base URL. Defaults to Apple's production endpoint
   * ({@link DEFAULT_BASE_URL}). Primarily useful for recording fixtures
   * through a local proxy.
   */
  baseUrl?: string;

  /**
   * Custom `fetch` implementation. Defaults to `globalThis.fetch`. Useful for
   * injecting mocks in tests, or for using `undici` / Node's agent pooling in
   * server environments.
   */
  fetch?: typeof fetch;

  /**
   * Value of the outbound `User-Agent` header. Defaults to the package name.
   * Apple recommends that API clients identify themselves so they can be
   * contacted about breaking changes.
   */
  userAgent?: string;
}

/**
 * Production App Store Connect API base URL.
 *
 * Does **not** include a version segment — resource paths are expected to
 * begin with `/v1/...` to match the paths declared in Apple's OpenAPI spec
 * (e.g. `/v1/apps`, `/v1/salesReports`). Overridable via
 * {@link AppStoreConnectOptions.baseUrl}.
 */
const DEFAULT_BASE_URL = 'https://api.appstoreconnect.apple.com';

/**
 * Top-level client for the App Store Connect API.
 *
 * Create one instance per team (i.e., per `issuerId` / `keyId` pair) and
 * reuse it. The client holds a cached JWT internally, so repeated requests
 * avoid re-signing on every call.
 *
 * Resource-oriented usage:
 *
 * ```ts
 * const asc = new AppStoreConnect({
 *   keyId: 'ABC123DEFG',
 *   issuerId: '57246542-96fe-1a63-e053-0824d011072a',
 *   privateKey: `-----BEGIN PRIVATE KEY-----
 * MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgEvL...
 * -----END PRIVATE KEY-----`,
 * });
 *
 * const apps = await asc.apps.list();
 * const app = await asc.apps.retrieve('1234567890');
 * ```
 *
 * Each resource namespace (e.g. {@link AppStoreConnect.apps}) exposes
 * strongly-typed methods for a specific Apple resource. Use
 * {@link AppStoreConnect.request} directly only when you need to call an
 * endpoint that doesn't yet have a typed resource wrapper.
 */
export class AppStoreConnect {
  /** Operations on the `apps` resource (list, retrieve, ...). */
  readonly apps: Apps;

  /** Fully-qualified base URL including the `/v1` version segment. */
  private readonly baseUrl: string;
  /** Concrete `fetch` implementation used for every outbound request. */
  private readonly fetchImpl: typeof fetch;
  /** `User-Agent` header value sent on every request. */
  private readonly userAgent: string;
  /** Caches and refreshes the ES256 JWT used for authentication. */
  private readonly tokenProvider: TokenProvider;

  /**
   * Construct a new client.
   *
   * @param options - Credentials plus optional runtime overrides. See
   *   {@link AppStoreConnectOptions} for each field.
   */
  constructor(options: AppStoreConnectOptions) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.userAgent = options.userAgent ?? '@winwinkit/app-store-connect-api';
    this.tokenProvider = new TokenProvider(options);
    this.apps = new Apps(this);
  }

  /**
   * Issue a raw, authenticated request against the App Store Connect API.
   *
   * Resource classes use this under the hood; call it directly when you need
   * to reach an endpoint not yet covered by a typed wrapper. The request is
   * signed with a fresh-or-cached JWT and decoded as JSON on success.
   *
   * @typeParam T - Expected shape of the JSON response body.
   * @param method - HTTP verb (`GET`, `POST`, `PATCH`, `DELETE`, ...).
   * @param path - Path relative to the base URL, beginning with a slash and
   *   including the API version segment (e.g. `"/v1/apps"`,
   *   `"/v1/apps/123"`). This matches the paths declared in Apple's
   *   OpenAPI spec.
   * @param init - Optional query parameters and request body. `query` values
   *   that are `undefined` are omitted; `body` is JSON-serialized and a
   *   `content-type: application/json` header is added automatically.
   * @returns The parsed JSON response body, or `undefined` when Apple
   *   responds with `204 No Content`.
   * @throws {@link AppStoreConnectAPIError} - When Apple returns a non-2xx
   *   response. The thrown error carries the status code, Apple's structured
   *   `errors[]` array, and the `x-apple-request-uuid` request ID.
   */
  async request<T>(
    method: string,
    path: string,
    init?: { query?: Record<string, string | number | undefined>; body?: unknown },
  ): Promise<T> {
    const token = await this.tokenProvider.getToken();
    const url = new URL(this.baseUrl + path);

    if (init?.query) {
      for (const [key, value] of Object.entries(init.query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }

    const headers: Record<string, string> = {
      authorization: `Bearer ${token}`,
      'user-agent': this.userAgent,
    };
    const requestInit: RequestInit = { method, headers };
    if (init?.body !== undefined) {
      headers['content-type'] = 'application/json';
      requestInit.body = JSON.stringify(init.body);
    }

    const response = await this.fetchImpl(url, requestInit);

    if (!response.ok) {
      const requestId = response.headers.get('x-apple-request-uuid') ?? undefined;
      let errors: AppStoreConnectAPIErrorDetail[] = [];
      try {
        const body = (await response.json()) as { errors?: AppStoreConnectAPIErrorDetail[] };
        errors = body.errors ?? [];
      } catch {
        /* Response body was absent or not valid JSON; fall back to empty errors[]. */
      }
      throw new AppStoreConnectAPIError(
        `App Store Connect API request failed with status ${response.status}`,
        response.status,
        errors,
        requestId,
      );
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
}
