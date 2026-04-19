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
export type {
  AppStoreConnectOptions,
  AppStoreConnectCredentials,
  QueryParams,
  QueryValue,
  RetryOptions,
} from './client.js';

/**
 * Per-resource request/response types re-exported for convenience.
 *
 * Consumers rarely need to import these directly — resource methods already
 * return the correct shapes — but they are occasionally useful when passing
 * typed queries through helper functions.
 */
export type {
  App,
  ListAppsQuery,
  RetrieveAppQuery,
  AppsResponse,
  AppResponse,
} from './resources/apps.js';
export type {
  SubscriptionGroup,
  SubscriptionGroupResponse,
  SubscriptionGroupsResponse,
  SubscriptionsResponse,
  RetrieveSubscriptionGroupQuery,
  ListSubscriptionGroupsForAppQuery,
  ListSubscriptionsForGroupQuery,
} from './resources/subscription-groups.js';
export type {
  Subscription,
  SubscriptionResponse,
  SubscriptionPrice,
  SubscriptionPricesResponse,
  RetrieveSubscriptionQuery,
  ListSubscriptionPricesQuery,
} from './resources/subscriptions.js';
export type { DownloadSalesReportQuery } from './resources/sales-reports.js';
export type { DownloadFinanceReportQuery } from './resources/finance-reports.js';
export type {
  SubscriptionOfferCode,
  SubscriptionOfferCodeResponse,
  SubscriptionOfferCodesResponse,
  SubscriptionOfferCodePricesResponse,
  SubscriptionOfferCodeCustomCodesResponse,
  SubscriptionOfferCodeOneTimeUseCodesResponse,
  RetrieveSubscriptionOfferCodeQuery,
  ListSubscriptionOfferCodesForSubscriptionQuery,
  ListSubscriptionOfferCodePricesQuery,
  ListSubscriptionOfferCodeCustomCodesQuery,
  ListSubscriptionOfferCodeOneTimeUseCodesQuery,
} from './resources/subscription-offer-codes.js';
export type {
  SubscriptionOfferCodeCustomCode,
  SubscriptionOfferCodeCustomCodeResponse,
  RetrieveSubscriptionOfferCodeCustomCodeQuery,
} from './resources/subscription-offer-code-custom-codes.js';
export type {
  SubscriptionOfferCodeOneTimeUseCode,
  SubscriptionOfferCodeOneTimeUseCodeResponse,
  RetrieveSubscriptionOfferCodeOneTimeUseCodeQuery,
} from './resources/subscription-offer-code-one-time-use-codes.js';
export type {
  Build,
  BuildResponse,
  BuildsResponse,
  ListBuildsQuery,
  RetrieveBuildQuery,
  ListBuildsForAppQuery,
} from './resources/builds.js';
export type {
  InAppPurchaseV2,
  InAppPurchaseV2Response,
  InAppPurchasesV2Response,
  RetrieveInAppPurchaseQuery,
  ListInAppPurchasesForAppQuery,
} from './resources/in-app-purchases.js';
export type {
  CustomerReview,
  CustomerReviewResponse,
  CustomerReviewsResponse,
  RetrieveCustomerReviewQuery,
  ListCustomerReviewsForAppQuery,
} from './resources/customer-reviews.js';
export type {
  User,
  UserResponse,
  UsersResponse,
  RetrieveUserQuery,
  ListUsersQuery,
} from './resources/users.js';
export type {
  BetaGroup,
  BetaGroupResponse,
  BetaGroupsResponse,
  BetaTestersResponse,
  BetaGroupBuildsResponse,
  RetrieveBetaGroupQuery,
  ListBetaGroupsQuery,
  ListBetaGroupsForAppQuery,
  ListBetaGroupTestersQuery,
  ListBetaGroupBuildsQuery,
} from './resources/beta-groups.js';

/**
 * The full set of types generated from Apple's App Store Connect OpenAPI
 * specification (version 4.3). Re-exported so consumers can reference raw
 * schema types (e.g. `components['schemas']['App']`) when calling
 * {@link AppStoreConnect#request} directly against an endpoint that this
 * library does not yet wrap with a typed resource method.
 *
 * Regenerate this module with `pnpm gen` whenever Apple bumps the spec.
 */
export type { components, operations, paths } from './generated/openapi.js';
