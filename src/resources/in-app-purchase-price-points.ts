import type { AppStoreConnect, QueryParams } from '../client.js';
import type { components, operations } from '../generated/openapi.js';

/**
 * A canonical in-app purchase price point — Apple's catalogued monetary
 * value tied to a specific territory and currency.
 *
 * Consumers reference these by ID when constructing a new IAP price
 * schedule via {@link InAppPurchases#replacePriceSchedule}.
 */
export type InAppPurchasePricePoint = components['schemas']['InAppPurchasePricePoint'];

/**
 * JSON:API response returned by
 * {@link InAppPurchasePricePoints#listForIap} and its paginated variants.
 */
export type InAppPurchasePricePointsResponse =
  components['schemas']['InAppPurchasePricePointsResponse'];

/**
 * Query parameters accepted by
 * {@link InAppPurchasePricePoints#listForIap} and its auto-paginating
 * variants.
 */
export type ListInAppPurchasePricePointsForIapQuery =
  operations['inAppPurchasesV2_pricePoints_getToManyRelated']['parameters']['query'];

/**
 * Operations on the App Store Connect `inAppPurchasePricePoints`
 * resource.
 *
 * Exposes Apple's IAP price catalog — consumers look price points up here
 * to construct an IAP price schedule payload for
 * {@link InAppPurchases#replacePriceSchedule}.
 *
 * Apple does not expose a top-level `GET /v1/inAppPurchasePricePoints/{id}`
 * endpoint (as of spec v4.3), so this resource only lists price points
 * scoped to a given IAP. Individual price points can still be retrieved
 * as `included` resources on a schedule or price entry.
 *
 * Instances are created by the {@link AppStoreConnect} constructor and
 * accessed via `asc.inAppPurchasePricePoints`. Do not construct this
 * class directly.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/inapppurchasepricepoint
 */
export class InAppPurchasePricePoints {
  /**
   * @param client - Parent {@link AppStoreConnect} client.
   */
  constructor(private readonly client: AppStoreConnect) {}

  /**
   * List the price points available to a given IAP (single page).
   *
   * Prefer {@link listAllForIap} / {@link listAllForIapPages} to iterate
   * every price point without threading cursors by hand.
   *
   * @param iapId - Numeric App Store Connect resource ID of the parent IAP.
   * @param query - Optional filters (e.g. `filter[territory]`), fieldsets,
   *   pagination, and includes.
   */
  async listForIap(
    iapId: string,
    query?: ListInAppPurchasePricePointsForIapQuery,
  ): Promise<InAppPurchasePricePointsResponse> {
    return this.client.request<InAppPurchasePricePointsResponse>(
      'GET',
      `/v2/inAppPurchases/${encodeURIComponent(iapId)}/pricePoints`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * Iterate every page of {@link listForIap}, auto-following `links.next`.
   */
  async *listAllForIapPages(
    iapId: string,
    query?: ListInAppPurchasePricePointsForIapQuery,
  ): AsyncGenerator<InAppPurchasePricePointsResponse, void, void> {
    yield* this.client.paginate<InAppPurchasePricePointsResponse>(
      `/v2/inAppPurchases/${encodeURIComponent(iapId)}/pricePoints`,
      query as QueryParams | undefined,
    );
  }

  /**
   * Iterate every price point for an IAP across every page.
   */
  async *listAllForIap(
    iapId: string,
    query?: ListInAppPurchasePricePointsForIapQuery,
  ): AsyncGenerator<InAppPurchasePricePoint, void, void> {
    for await (const page of this.listAllForIapPages(iapId, query)) {
      yield* page.data;
    }
  }
}
