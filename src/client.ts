import { TokenProvider } from './auth.js';
import { AppStoreConnectAPIError, type AppStoreConnectAPIErrorDetail } from './errors.js';
import { AppPricePoints } from './resources/app-price-points.js';
import { AppPriceSchedules } from './resources/app-price-schedules.js';
import { Apps } from './resources/apps.js';
import { BetaGroups } from './resources/beta-groups.js';
import { Builds } from './resources/builds.js';
import { CustomerReviews } from './resources/customer-reviews.js';
import { FinanceReports } from './resources/finance-reports.js';
import { InAppPurchasePricePoints } from './resources/in-app-purchase-price-points.js';
import { InAppPurchasePriceSchedules } from './resources/in-app-purchase-price-schedules.js';
import { InAppPurchases } from './resources/in-app-purchases.js';
import { SalesReports } from './resources/sales-reports.js';
import { SubscriptionGroups } from './resources/subscription-groups.js';
import { SubscriptionOfferCodeCustomCodes } from './resources/subscription-offer-code-custom-codes.js';
import { SubscriptionOfferCodeOneTimeUseCodes } from './resources/subscription-offer-code-one-time-use-codes.js';
import { SubscriptionOfferCodes } from './resources/subscription-offer-codes.js';
import { SubscriptionPricePoints } from './resources/subscription-price-points.js';
import { SubscriptionPrices } from './resources/subscription-prices.js';
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
 * Options controlling automatic retry of transient failures.
 *
 * Passed to the client via {@link AppStoreConnectOptions.retry}. Retries
 * are applied in {@link AppStoreConnect#requestRaw} (and therefore also
 * {@link AppStoreConnect#request}) whenever the response indicates a
 * transient failure and the HTTP method is safe to repeat:
 *
 * - **HTTP 429** ("Too Many Requests") — always retried when attempts
 *   remain, since the server explicitly asserts the request was not
 *   processed. The `Retry-After` response header is honored when present.
 * - **HTTP 5xx** and network errors — retried only on idempotent methods
 *   (`GET`, `HEAD`, `PUT`, `DELETE`, `OPTIONS`) to avoid the risk of
 *   double-submitting a `POST`/`PATCH` the server may or may not have
 *   processed.
 *
 * When a retry is scheduled without a `Retry-After` header, the delay is
 * `random(0, min(baseDelayMs * 2^attempt, maxDelayMs))` (full-jitter
 * exponential backoff).
 */
export interface RetryOptions {
  /**
   * Maximum total attempts per request, including the initial call.
   *
   * `1` disables retries entirely (same as passing `retry: false`). The
   * default is `4` (one initial attempt plus up to three retries).
   */
  maxAttempts?: number;

  /**
   * Base delay in milliseconds for exponential backoff. The actual
   * sleep between attempt `n` and `n+1` is drawn uniformly from
   * `[0, min(baseDelayMs * 2^n, maxDelayMs)]`. Default: `1000`.
   */
  baseDelayMs?: number;

  /**
   * Upper bound in milliseconds on any single sleep between retry
   * attempts. Also caps `Retry-After` values if the server returns an
   * unusually large one. Default: `30000` (30 seconds).
   */
  maxDelayMs?: number;
}

/** HTTP methods considered idempotent by RFC 7231 — safe to retry on 5xx/network failures. */
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS']);

/** Defaults applied to any {@link RetryOptions} not explicitly overridden. */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 4,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
};

/**
 * Resolve with `void` after the given number of milliseconds.
 *
 * Exposed as a module-private helper so retry backoff can be cleanly
 * stubbed or short-circuited in tests (callers can pass `baseDelayMs: 0`
 * to eliminate real sleeps entirely).
 */
function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse an HTTP `Retry-After` header value into milliseconds.
 *
 * The header can be either a delta-seconds integer (per RFC 7231 §7.1.3)
 * or an HTTP-date. Returns `null` if the header is missing or
 * unparseable; callers fall back to exponential backoff in that case.
 */
function parseRetryAfterHeader(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const dateMs = Date.parse(value);
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
  return null;
}

/**
 * Compute the sleep duration before the next retry attempt.
 *
 * When the response is present and carries a usable `Retry-After` header,
 * that value is honored (clamped to `maxDelayMs`). Otherwise the delay is
 * drawn uniformly from `[0, min(baseDelayMs * 2^attempt, maxDelayMs)]`
 * (full-jitter exponential backoff).
 *
 * @param response - The non-2xx response being retried, or `null` for
 *   network-level failures.
 * @param attempt - Zero-based index of the attempt that just failed.
 * @param options - Resolved retry configuration.
 */
function computeBackoffDelay(
  response: Response | null,
  attempt: number,
  options: Required<RetryOptions>,
): number {
  if (response) {
    const fromHeader = parseRetryAfterHeader(response.headers.get('retry-after'));
    if (fromHeader !== null) return Math.min(fromHeader, options.maxDelayMs);
  }
  const expo = Math.min(options.baseDelayMs * 2 ** attempt, options.maxDelayMs);
  return Math.floor(Math.random() * expo);
}

/**
 * Build an {@link AppStoreConnectAPIError} from a non-2xx response,
 * consuming the response body along the way. Used by
 * {@link AppStoreConnect#requestRaw} once retry attempts are exhausted
 * (or the failure is non-retriable).
 */
async function buildAPIErrorFromResponse(response: Response): Promise<AppStoreConnectAPIError> {
  const requestId = response.headers.get('x-apple-request-uuid') ?? undefined;
  let errors: AppStoreConnectAPIErrorDetail[] = [];
  try {
    const body = (await response.json()) as { errors?: AppStoreConnectAPIErrorDetail[] };
    errors = body.errors ?? [];
  } catch {
    /* Response body was absent or not valid JSON; fall back to empty errors[]. */
  }
  return new AppStoreConnectAPIError(
    `App Store Connect API request failed with status ${response.status}`,
    response.status,
    errors,
    requestId,
  );
}

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

  /**
   * Automatic retry behavior for transient failures.
   *
   * Pass a partial {@link RetryOptions} object to override defaults, or
   * `false` to disable retries entirely. When omitted, retries are enabled
   * with the {@link DEFAULT_RETRY_OPTIONS} defaults — four total attempts,
   * 1-second base delay, 30-second cap.
   */
  retry?: RetryOptions | false;
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

  /**
   * Operations on the `subscriptionPricePoints` resource — retrieve a
   * single price point and list the catalog for a subscription.
   */
  readonly subscriptionPricePoints: SubscriptionPricePoints;

  /**
   * Operations on the `inAppPurchasePricePoints` resource — list the
   * price catalog available to a given IAP.
   */
  readonly inAppPurchasePricePoints: InAppPurchasePricePoints;

  /**
   * Operations on the `appPricePoints` resource — list the price
   * catalog available to a given paid app.
   */
  readonly appPricePoints: AppPricePoints;

  /**
   * Operations on the `subscriptionPrices` resource — create (schedule)
   * and cancel price changes, and list a subscription's current
   * price-schedule entries.
   */
  readonly subscriptionPrices: SubscriptionPrices;

  /**
   * Operations on the `inAppPurchasePriceSchedules` resource — retrieve
   * an IAP's price schedule and replace it in full.
   */
  readonly inAppPurchasePriceSchedules: InAppPurchasePriceSchedules;

  /**
   * Operations on the `appPriceSchedules` resource — retrieve a paid
   * app's price schedule and replace it in full.
   */
  readonly appPriceSchedules: AppPriceSchedules;

  /** Fully-qualified base URL including the `/v1` version segment. */
  private readonly baseUrl: string;
  /** Concrete `fetch` implementation used for every outbound request. */
  private readonly fetchImpl: typeof fetch;
  /** `User-Agent` header value sent on every request. */
  private readonly userAgent: string;
  /** Caches and refreshes the ES256 JWT used for authentication. */
  private readonly tokenProvider: TokenProvider;
  /** Resolved retry configuration; `maxAttempts: 1` means retries are disabled. */
  private readonly retryOptions: Required<RetryOptions>;

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
    this.retryOptions =
      options.retry === false
        ? { ...DEFAULT_RETRY_OPTIONS, maxAttempts: 1 }
        : { ...DEFAULT_RETRY_OPTIONS, ...options.retry };
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
    this.subscriptionPricePoints = new SubscriptionPricePoints(this);
    this.inAppPurchasePricePoints = new InAppPurchasePricePoints(this);
    this.appPricePoints = new AppPricePoints(this);
    this.subscriptionPrices = new SubscriptionPrices(this);
    this.inAppPurchasePriceSchedules = new InAppPurchasePriceSchedules(this);
    this.appPriceSchedules = new AppPriceSchedules(this);
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
    const url = this.buildUrl(path, init?.query);
    const verb = method.toUpperCase();
    const idempotent = IDEMPOTENT_METHODS.has(verb);
    const { maxAttempts } = this.retryOptions;

    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await this.sendOnce(method, url, init?.body);
      } catch (err) {
        // Network-level failure (fetch rejected). Retry only on idempotent
        // methods — we can't tell whether a POST/PATCH reached the server.
        if (attempt + 1 < maxAttempts && idempotent) {
          await sleep(computeBackoffDelay(null, attempt, this.retryOptions));
          continue;
        }
        throw err;
      }

      if (response.ok) return response;

      // Non-2xx path. Retry policy:
      //   - 429: always retry while attempts remain (safe for any method —
      //     the server explicitly asserts the request was not processed).
      //   - 5xx: retry only on idempotent methods.
      //   - other 4xx: never retry.
      const retriable =
        attempt + 1 < maxAttempts &&
        (response.status === 429 || (response.status >= 500 && idempotent));

      if (retriable) {
        // Consume the body so the underlying connection can be released
        // before sleeping; ignore decode failures — the body may be empty
        // or non-JSON.
        response.body?.cancel().catch(() => {});
        await sleep(computeBackoffDelay(response, attempt, this.retryOptions));
        continue;
      }

      throw await buildAPIErrorFromResponse(response);
    }
  }

  /**
   * Build the full request URL by joining {@link baseUrl}, the given path,
   * and any query parameters. See {@link QueryValue} for how each value
   * type is serialized.
   */
  private buildUrl(path: string, query: QueryParams | undefined): URL {
    const url = new URL(this.baseUrl + path);
    if (!query) return url;
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        if (value.length === 0) continue;
        url.searchParams.set(key, value.join(','));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
    return url;
  }

  /**
   * Issue a single authenticated HTTP attempt, without any retry logic.
   *
   * Always returns the raw {@link Response} (even for non-2xx statuses);
   * the caller is responsible for checking `response.ok` and/or
   * translating non-2xx responses into thrown errors.
   */
  private async sendOnce(method: string, url: URL, body: unknown): Promise<Response> {
    const token = await this.tokenProvider.getToken();
    const headers: Record<string, string> = {
      authorization: `Bearer ${token}`,
      'user-agent': this.userAgent,
    };
    const requestInit: RequestInit = { method, headers };
    if (body !== undefined) {
      headers['content-type'] = 'application/json';
      requestInit.body = JSON.stringify(body);
    }
    return this.fetchImpl(url, requestInit);
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
