/**
 * Public entry point for `@winwinkit/app-store-connect-api`.
 *
 * Consumers import the {@link AppStoreConnect} client to talk to Apple's
 * App Store Connect REST API, and the exported error classes to narrow
 * failures with `instanceof` checks.
 *
 * ```ts
 * import { AppStoreConnect, AppStoreConnectAPIError } from '@winwinkit/app-store-connect-api';
 * ```
 *
 * @packageDocumentation
 */

export { AppStoreConnect } from './client.js';
export { AppStoreConnectError, AppStoreConnectAPIError } from './errors.js';
export type { AppStoreConnectAPIErrorDetail, AppStoreConnectAPIErrorSource } from './errors.js';
export type { AppStoreConnectOptions, AppStoreConnectCredentials } from './client.js';
