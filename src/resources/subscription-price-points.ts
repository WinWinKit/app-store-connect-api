import type { AppStoreConnect, QueryParams } from '../client.js';
import type { components, operations } from '../generated/openapi.js';

/**
 * A canonical subscription price point — Apple's catalogued price value
 * tied to a specific territory and currency.
 *
 * Price points are Apple's price catalog: consumers don't create them
 * directly, they reference them by ID when scheduling a subscription
 * price change (see
 * {@link Subscriptions#createPriceChange} / {@link CreateSubscriptionPriceChangeBody}).
 */
export type SubscriptionPricePoint = components['schemas']['SubscriptionPricePoint'];

/**
 * JSON:API response returned by {@link SubscriptionPricePoints#retrieve}.
 */
export type SubscriptionPricePointResponse =
  components['schemas']['SubscriptionPricePointResponse'];

/**
 * JSON:API response returned by
 * {@link SubscriptionPricePoints#listForSubscription} and its paginated
 * variants.
 */
export type SubscriptionPricePointsResponse =
  components['schemas']['SubscriptionPricePointsResponse'];

/**
 * Query parameters accepted by {@link SubscriptionPricePoints#retrieve}.
 */
export type RetrieveSubscriptionPricePointQuery =
  operations['subscriptionPricePoints_getInstance']['parameters']['query'];

/**
 * Query parameters accepted by
 * {@link SubscriptionPricePoints#listForSubscription} and its
 * auto-paginating variants.
 */
export type ListSubscriptionPricePointsForSubscriptionQuery =
  operations['subscriptions_pricePoints_getToManyRelated']['parameters']['query'];

/**
 * Operations on the App Store Connect `subscriptionPricePoints` resource.
 *
 * Exposes Apple's canonical subscription-price catalog. Each price point
 * represents one monetary value (e.g. "$4.99") in one territory. Consumers
 * look price points up here to obtain the IDs required by
 * {@link Subscriptions#createPriceChange}.
 *
 * Instances are created by the {@link AppStoreConnect} constructor and
 * accessed via `asc.subscriptionPricePoints`. Do not construct this class
 * directly.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/subscriptionpricepoint
 */
export class SubscriptionPricePoints {
  /**
   * @param client - Parent {@link AppStoreConnect} client.
   */
  constructor(private readonly client: AppStoreConnect) {}

  /**
   * Fetch a single subscription price point by its App Store Connect
   * resource ID.
   *
   * Rarely needed directly — in most flows price points arrive either
   * via {@link listForSubscription} or as `included` resources on a
   * subscription-price schedule entry.
   */
  async retrieve(
    id: string,
    query?: RetrieveSubscriptionPricePointQuery,
  ): Promise<SubscriptionPricePointResponse> {
    return this.client.request<SubscriptionPricePointResponse>(
      'GET',
      `/v1/subscriptionPricePoints/${encodeURIComponent(id)}`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * List the price points available to a specific subscription
   * (single page).
   *
   * Prefer {@link listAllForSubscription} / {@link listAllForSubscriptionPages}
   * to iterate every price point without threading cursors by hand.
   *
   * @param subscriptionId - Numeric App Store Connect resource ID of the
   *   parent subscription.
   * @param query - Optional filters (e.g. `filter[territory]`), fieldsets,
   *   pagination, and includes.
   */
  async listForSubscription(
    subscriptionId: string,
    query?: ListSubscriptionPricePointsForSubscriptionQuery,
  ): Promise<SubscriptionPricePointsResponse> {
    return this.client.request<SubscriptionPricePointsResponse>(
      'GET',
      `/v1/subscriptions/${encodeURIComponent(subscriptionId)}/pricePoints`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * Iterate every page of {@link listForSubscription}, auto-following
   * `links.next`.
   */
  async *listAllForSubscriptionPages(
    subscriptionId: string,
    query?: ListSubscriptionPricePointsForSubscriptionQuery,
  ): AsyncGenerator<SubscriptionPricePointsResponse, void, void> {
    yield* this.client.paginate<SubscriptionPricePointsResponse>(
      `/v1/subscriptions/${encodeURIComponent(subscriptionId)}/pricePoints`,
      query as QueryParams | undefined,
    );
  }

  /**
   * Iterate every price point for a subscription across every page.
   */
  async *listAllForSubscription(
    subscriptionId: string,
    query?: ListSubscriptionPricePointsForSubscriptionQuery,
  ): AsyncGenerator<SubscriptionPricePoint, void, void> {
    for await (const page of this.listAllForSubscriptionPages(subscriptionId, query)) {
      yield* page.data;
    }
  }
}
