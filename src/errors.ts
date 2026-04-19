/**
 * Base error thrown by this library.
 *
 * All errors raised by `@winwinkit/app-store-connect-api` extend this class,
 * which makes it easy for consumers to catch any library-originating failure
 * with a single `instanceof` check:
 *
 * ```ts
 * try {
 *   await asc.apps.list();
 * } catch (err) {
 *   if (err instanceof AppStoreConnectError) {
 *     // library-level failure (network, auth, API error, ...)
 *   }
 * }
 * ```
 */
export class AppStoreConnectError extends Error {
  /**
   * @param message - Human-readable description of the failure.
   * @param options - Standard {@link ErrorOptions}, primarily used to attach a `cause`.
   */
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AppStoreConnectError';
  }
}

/**
 * Points to the specific location inside the submitted request that caused
 * a validation failure. Apple populates exactly one of the two variants:
 *
 * - `{ pointer }` — a JSON Pointer (RFC 6901) into the request body, used
 *   for schema / field-level errors (e.g. `"/data/attributes/name"`).
 * - `{ parameter }` — the name of the offending query or URL parameter
 *   (e.g. `"filter[bundleId]"`).
 */
export type AppStoreConnectAPIErrorSource = { pointer: string } | { parameter: string };

/**
 * A single entry from the `errors[]` array returned by the App Store Connect API.
 *
 * See Apple's
 * [Interpreting and handling errors](https://developer.apple.com/documentation/appstoreconnectapi/interpreting_and_handling_errors)
 * for the full schema and the meaning of each field.
 */
export interface AppStoreConnectAPIErrorDetail {
  /** Opaque identifier for this specific error occurrence. */
  id?: string;
  /** HTTP status code as a string (e.g. `"404"`). */
  status?: string;
  /** Apple-defined machine-readable error code (e.g. `"NOT_FOUND"`). */
  code?: string;
  /** Short, human-readable summary of the error. */
  title?: string;
  /** Longer, human-readable description of why the request failed. */
  detail?: string;
  /**
   * For validation errors, points to the offending field or parameter.
   * Absent for non-validation errors (auth failures, not-found, etc.).
   *
   * @see {@link AppStoreConnectAPIErrorSource}
   */
  source?: AppStoreConnectAPIErrorSource;
}

/**
 * Error thrown when the App Store Connect API returns a non-2xx response.
 *
 * Carries the HTTP status, any structured error details from the response
 * body, and Apple's `x-apple-request-uuid` header (useful when filing
 * support tickets).
 *
 * @example
 * ```ts
 * try {
 *   await asc.apps.retrieve('bogus-id');
 * } catch (err) {
 *   if (err instanceof AppStoreConnectAPIError && err.status === 404) {
 *     console.log('App not found. Request ID:', err.requestId);
 *   }
 * }
 * ```
 */
export class AppStoreConnectAPIError extends AppStoreConnectError {
  /**
   * @param message - Human-readable summary (typically includes the HTTP status).
   * @param status - HTTP status code returned by the API.
   * @param errors - Parsed `errors[]` array from the response body, if present.
   * @param requestId - Value of Apple's `x-apple-request-uuid` response header, if present.
   */
  constructor(
    message: string,
    readonly status: number,
    readonly errors: AppStoreConnectAPIErrorDetail[] = [],
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'AppStoreConnectAPIError';
  }
}
