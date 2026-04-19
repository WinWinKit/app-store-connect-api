import { TokenProvider } from './auth.js';
import { AppStoreConnectAPIError, type AppStoreConnectAPIErrorDetail } from './errors.js';
import { Apps } from './resources/apps.js';
import { BetaGroups } from './resources/beta-groups.js';
import { Builds } from './resources/builds.js';
import { CustomerReviews } from './resources/customer-reviews.js';
import { FinanceReports } from './resources/finance-reports.js';
import { InAppPurchases } from './resources/in-app-purchases.js';
import { SalesReports } from './resources/sales-reports.js';
import { SubscriptionGroups } from './resources/subscription-groups.js';
import { SubscriptionOfferCodeCustomCodes } from './resources/subscription-offer-code-custom-codes.js';
import { SubscriptionOfferCodeOneTimeUseCodes } from './resources/subscription-offer-code-one-time-use-codes.js';
import { SubscriptionOfferCodes } from './resources/subscription-offer-codes.js';
import { Subscriptions } from './resources/subscriptions.js';
import { Users } from './resources/users.js';

/**
 * A single value accepted inside {@link QueryParams}.
 *
 * Primitives become the literal query value; arrays are serialized as a
 * single comma-separated string (the App Store Connect / JSON:API
 * convention, e.g. `?filter[bundleId]=com.acme.one,com.acme.two`); empty
 * arrays, `null`, and `undefined` cause the parameter to be omitted.
 */
export type QueryValue =
  | string
  | number
  | boolean
  | ReadonlyArray<string | number | boolean>
  | null
  | undefined;

/**
 * Query parameters accepted by {@link AppStoreConnect#request}.
 *
 * Keys are parameter names exactly as Apple documents them (e.g.
 * `"filter[bundleId]"`, `"fields[apps]"`). Values are either a single
 * primitive or an array of primitives; see {@link QueryValue} for the
 * serialization rules.
 */
export type QueryParams = Record<string, QueryValue>;

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
 * Each resource namespace (e.g. {@link AppStoreConnect#apps}) exposes
 * strongly-typed methods for a specific Apple resource. Use
 * {@link AppStoreConnect#request} directly only when you need to call an
 * endpoint that doesn't yet have a typed resource wrapper.
 */
export class AppStoreConnect {
  /** Operations on the `apps` resource (list, retrieve, ...). */
  readonly apps: Apps;

  /**
   * Operations on the `subscriptionGroups` resource — retrieve a group,
   * list groups for an app, list subscriptions within a group.
   */
  readonly subscriptionGroups: SubscriptionGroups;

  /**
   * Operations on the `subscriptions` resource — retrieve a single
   * subscription and list its price schedule.
   */
  readonly subscriptions: Subscriptions;

  /**
   * Operations on the `salesReports` resource — download gzipped TSV
   * sales and trends reports for a vendor.
   */
  readonly salesReports: SalesReports;

  /**
   * Operations on the `financeReports` resource — download gzipped TSV
   * financial payout reports for a vendor and region.
   */
  readonly financeReports: FinanceReports;

  /**
   * Operations on the `subscriptionOfferCodes` resource — retrieve an
   * offer code, list offer codes for a subscription, list an offer
   * code's prices / custom codes / one-time-use-code batches.
   */
  readonly subscriptionOfferCodes: SubscriptionOfferCodes;

  /**
   * Operations on the `subscriptionOfferCodeCustomCodes` resource —
   * retrieve a developer-defined custom code attached to an offer code.
   */
  readonly subscriptionOfferCodeCustomCodes: SubscriptionOfferCodeCustomCodes;

  /**
   * Operations on the `subscriptionOfferCodeOneTimeUseCodes` resource —
   * retrieve a one-time-use-code batch and download its CSV of
   * single-redemption code strings.
   */
  readonly subscriptionOfferCodeOneTimeUseCodes: SubscriptionOfferCodeOneTimeUseCodes;

  /**
   * Operations on the `builds` resource — retrieve a single build and
   * list builds (flat collection or scoped to an app).
   */
  readonly builds: Builds;

  /**
   * Operations on the v2 `inAppPurchases` resource — retrieve a single
   * non-subscription IAP and list IAPs for an app.
   */
  readonly inAppPurchases: InAppPurchases;

  /**
   * Operations on the `customerReviews` resource — retrieve a single
   * review and list reviews for an app.
   */
  readonly customerReviews: CustomerReviews;

  /**
   * Operations on the `users` resource — retrieve a single team member
   * and list the authenticated team's users.
   */
  readonly users: Users;

  /**
   * Operations on the `betaGroups` resource — retrieve a group, list
   * groups (flat or scoped to an app), enumerate testers and builds per
   * group.
   */
  readonly betaGroups: BetaGroups;

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
    this.subscriptionGroups = new SubscriptionGroups(this);
    this.subscriptions = new Subscriptions(this);
    this.salesReports = new SalesReports(this);
    this.financeReports = new FinanceReports(this);
    this.subscriptionOfferCodes = new SubscriptionOfferCodes(this);
    this.subscriptionOfferCodeCustomCodes = new SubscriptionOfferCodeCustomCodes(this);
    this.subscriptionOfferCodeOneTimeUseCodes = new SubscriptionOfferCodeOneTimeUseCodes(this);
    this.builds = new Builds(this);
    this.inAppPurchases = new InAppPurchases(this);
    this.customerReviews = new CustomerReviews(this);
    this.users = new Users(this);
    this.betaGroups = new BetaGroups(this);
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
   *   follow the rules in {@link QueryValue} (arrays become
   *   comma-separated, `undefined`/`null`/empty arrays are omitted); `body`
   *   is JSON-serialized and a `content-type: application/json` header is
   *   added automatically.
   * @returns The parsed JSON response body, or `undefined` when Apple
   *   responds with `204 No Content`.
   * @throws {@link AppStoreConnectAPIError} - When Apple returns a non-2xx
   *   response. The thrown error carries the status code, Apple's structured
   *   `errors[]` array, and the `x-apple-request-uuid` request ID.
   */
  async request<T>(
    method: string,
    path: string,
    init?: { query?: QueryParams | undefined; body?: unknown },
  ): Promise<T> {
    const response = await this.requestRaw(method, path, init);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  /**
   * Issue a raw, authenticated request and return the unconsumed
   * {@link Response} object.
   *
   * Use this when you need non-JSON handling — for example, Apple's sales
   * and finance report endpoints return gzipped CSV (`application/a-gzip`),
   * and some download endpoints stream binary data. The returned response
   * is guaranteed to be 2xx (non-2xx responses raise
   * {@link AppStoreConnectAPIError} before this method returns), so
   * consumers can call `.blob()`, `.arrayBuffer()`, `.text()`, or consume
   * the `.body` stream without re-checking `response.ok`.
   *
   * Shares the auth / URL building / query serialization / error-mapping
   * pipeline with {@link AppStoreConnect#request}; the only difference is
   * that the response body is not decoded as JSON.
   *
   * @param method - HTTP verb (`GET`, `POST`, `PATCH`, `DELETE`, ...).
   * @param path - Path relative to the base URL, beginning with a slash and
   *   including the API version segment (e.g. `"/v1/salesReports"`).
   * @param init - Optional query parameters and request body. Same rules
   *   as {@link AppStoreConnect#request}.
   * @returns The unconsumed {@link Response} from the underlying `fetch`.
   * @throws {@link AppStoreConnectAPIError} - When Apple returns a non-2xx
   *   response; the thrown error carries the status code, Apple's
   *   structured `errors[]` array, and the `x-apple-request-uuid`.
   */
  async requestRaw(
    method: string,
    path: string,
    init?: { query?: QueryParams | undefined; body?: unknown },
  ): Promise<Response> {
    const token = await this.tokenProvider.getToken();
    const url = new URL(this.baseUrl + path);

    if (init?.query) {
      for (const [key, value] of Object.entries(init.query)) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) {
          if (value.length === 0) continue;
          url.searchParams.set(key, value.join(','));
        } else {
          url.searchParams.set(key, String(value));
        }
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

    return response;
  }

  /**
   * Iterate every page of a paginated App Store Connect collection endpoint.
   *
   * Apple uses JSON:API cursor pagination: each response carries a
   * `links.next` URL pointing at the next page when more results exist. This
   * generator yields the full typed page objects one at a time, fetching the
   * next page only when the caller advances the iterator — so breaking out
   * of the loop early is free.
   *
   * Resource classes use this under the hood to implement their
   * `listAllPages()` / `listAll()` helpers; call it directly only when
   * paging through a collection endpoint that does not yet have a typed
   * resource wrapper.
   *
   * @typeParam T - Typed page shape, constrained to the JSON:API collection
   *   envelope (`{ data, links, meta? }`). Pass the generated response type
   *   from {@link operations} or {@link components}, e.g.
   *   `components['schemas']['AppsResponse']`.
   * @param path - Starting path, same rules as {@link AppStoreConnect#request}
   *   (`"/v1/apps"`, etc.).
   * @param query - Optional query parameters for the first page. Subsequent
   *   pages use the `links.next` URL verbatim, so Apple-provided cursor and
   *   pagination state carry over automatically.
   * @yields Each successive page response, starting with the first.
   */
  async *paginate<T extends { data: readonly unknown[]; links: { next?: string | undefined } }>(
    path: string,
    query?: QueryParams | undefined,
  ): AsyncGenerator<T, void, void> {
    let page = await this.request<T>('GET', path, query ? { query } : undefined);
    yield page;

    while (page.links.next) {
      // `links.next` is a fully-qualified URL from Apple, including any
      // opaque cursor parameters. Strip the origin (it must match ours or
      // Apple's override) and reuse just the path + query.
      const nextUrl = new URL(page.links.next);
      page = await this.request<T>('GET', nextUrl.pathname + nextUrl.search);
      yield page;
    }
  }
}
