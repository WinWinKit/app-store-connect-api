import type { AppStoreConnect, QueryParams } from '../client.js';
import type { components, operations } from '../generated/openapi.js';

/**
 * A single v2 in-app purchase resource, as it appears inside
 * {@link InAppPurchaseV2Response.data} and
 * {@link InAppPurchasesV2Response.data}.
 *
 * Represents one non-consumable, consumable, or non-renewing subscription
 * product (for auto-renewable subscriptions, see the
 * {@link Subscriptions} resource).
 */
export type InAppPurchaseV2 = components['schemas']['InAppPurchaseV2'];

/**
 * JSON:API response returned by {@link InAppPurchases#retrieve}.
 */
export type InAppPurchaseV2Response = components['schemas']['InAppPurchaseV2Response'];

/**
 * JSON:API response returned by {@link InAppPurchases#listForApp} and its
 * paginated variants.
 */
export type InAppPurchasesV2Response = components['schemas']['InAppPurchasesV2Response'];

/**
 * Query parameters accepted by {@link InAppPurchases#retrieve}.
 */
export type RetrieveInAppPurchaseQuery =
  operations['inAppPurchasesV2_getInstance']['parameters']['query'];

/**
 * Query parameters accepted by {@link InAppPurchases#listForApp} and its
 * auto-paginating variants.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/list-all-in-app-purchases-for-an-app
 */
export type ListInAppPurchasesForAppQuery =
  operations['apps_inAppPurchasesV2_getToManyRelated']['parameters']['query'];

/**
 * Operations on the App Store Connect `inAppPurchases` (v2) resource.
 *
 * Uses the v2 API surface (`/v2/inAppPurchases/{id}`,
 * `/v1/apps/{id}/inAppPurchasesV2`), which Apple recommends over the
 * deprecated v1 endpoints. Auto-renewable subscriptions live on the
 * separate {@link Subscriptions} resource.
 *
 * Instances are created by the {@link AppStoreConnect} constructor and
 * accessed via `asc.inAppPurchases`. Do not construct this class directly.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/inapppurchasev2
 */
export class InAppPurchases {
  /**
   * @param client - Parent {@link AppStoreConnect} client.
   */
  constructor(private readonly client: AppStoreConnect) {}

  /**
   * Fetch a single in-app purchase by its App Store Connect resource ID.
   *
   * Uses `GET /v2/inAppPurchases/{id}`.
   *
   * @throws {@link AppStoreConnectAPIError} with status `404` if no IAP
   *   with the given ID exists.
   */
  async retrieve(
    id: string,
    query?: RetrieveInAppPurchaseQuery,
  ): Promise<InAppPurchaseV2Response> {
    return this.client.request<InAppPurchaseV2Response>(
      'GET',
      `/v2/inAppPurchases/${encodeURIComponent(id)}`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * List the in-app purchases of a given app (single page).
   *
   * Prefer {@link listAllForApp} / {@link listAllForAppPages} for iterating
   * every IAP of an app.
   */
  async listForApp(
    appId: string,
    query?: ListInAppPurchasesForAppQuery,
  ): Promise<InAppPurchasesV2Response> {
    return this.client.request<InAppPurchasesV2Response>(
      'GET',
      `/v1/apps/${encodeURIComponent(appId)}/inAppPurchasesV2`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * Iterate every page of {@link listForApp}, auto-following `links.next`.
   */
  async *listAllForAppPages(
    appId: string,
    query?: ListInAppPurchasesForAppQuery,
  ): AsyncGenerator<InAppPurchasesV2Response, void, void> {
    yield* this.client.paginate<InAppPurchasesV2Response>(
      `/v1/apps/${encodeURIComponent(appId)}/inAppPurchasesV2`,
      query as QueryParams | undefined,
    );
  }

  /**
   * Iterate every in-app purchase for an app across every page.
   */
  async *listAllForApp(
    appId: string,
    query?: ListInAppPurchasesForAppQuery,
  ): AsyncGenerator<InAppPurchaseV2, void, void> {
    for await (const page of this.listAllForAppPages(appId, query)) {
      yield* page.data;
    }
  }
}
