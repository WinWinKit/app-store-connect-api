import type { AppStoreConnect, QueryParams } from '../client.js';
import type { components, operations } from '../generated/openapi.js';

/**
 * A single subscription resource, as it appears inside
 * {@link SubscriptionResponse.data} (and inside subscription group
 * collections).
 *
 * Represents one auto-renewable subscription product — its product ID,
 * pricing schedule, duration, state, localized names, and relationships.
 */
export type Subscription = components['schemas']['Subscription'];

/**
 * JSON:API response returned by {@link Subscriptions#retrieve}.
 *
 * Carries a single {@link Subscription} under `data` plus optional
 * `included` related resources (prices, offer codes, localizations, ...).
 */
export type SubscriptionResponse = components['schemas']['SubscriptionResponse'];

/**
 * A single price-schedule entry for a subscription, as it appears inside
 * {@link SubscriptionPricesResponse.data}.
 *
 * Each `SubscriptionPrice` represents the price of one subscription in one
 * territory starting on a specific date, pointing at the canonical
 * `subscriptionPricePoint` that carries the actual monetary value.
 */
export type SubscriptionPrice = components['schemas']['SubscriptionPrice'];

/**
 * JSON:API response returned by {@link Subscriptions#listPrices}.
 *
 * Carries an array of {@link SubscriptionPrice} objects under `data`, plus
 * cursor pagination in `links` and optional totals in `meta.paging`.
 */
export type SubscriptionPricesResponse = components['schemas']['SubscriptionPricesResponse'];

/**
 * Query parameters accepted by {@link Subscriptions#retrieve}.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/read-subscription-information
 */
export type RetrieveSubscriptionQuery =
  operations['subscriptions_getInstance']['parameters']['query'];

/**
 * Query parameters accepted by {@link Subscriptions#listPrices} and its
 * auto-paginating variants.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/list-all-prices-for-a-subscription
 */
export type ListSubscriptionPricesQuery =
  operations['subscriptions_prices_getToManyRelated']['parameters']['query'];

/**
 * Operations on the App Store Connect `subscriptions` resource.
 *
 * Subscriptions in App Store Connect are the individual auto-renewable
 * subscription products users can buy (e.g. "Monthly — $4.99/mo"). They
 * belong to a {@link SubscriptionGroup}, which is how Apple models the
 * mutual-exclusion between different tiers of the same service.
 *
 * This class exposes read-only lookups for a single subscription and for its
 * price schedule across territories. Create / update / delete operations are
 * intentionally not exposed yet.
 *
 * Instances are created by the {@link AppStoreConnect} constructor and
 * accessed via `asc.subscriptions`. Do not construct this class directly.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/subscription
 */
export class Subscriptions {
  /**
   * @param client - Parent {@link AppStoreConnect} client. Used to issue the
   *   underlying authenticated HTTP requests.
   */
  constructor(private readonly client: AppStoreConnect) {}

  /**
   * Fetch a single subscription by its App Store Connect resource ID.
   *
   * @param id - Numeric App Store Connect resource ID of the subscription.
   * @param query - Optional fieldsets and relationship includes.
   * @returns The parsed `SubscriptionResponse` body from
   *   `GET /v1/subscriptions/{id}`.
   * @throws {@link AppStoreConnectAPIError} with status `404` if no
   *   subscription with the given ID exists.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/read-subscription-information
   */
  async retrieve(
    id: string,
    query?: RetrieveSubscriptionQuery,
  ): Promise<SubscriptionResponse> {
    return this.client.request<SubscriptionResponse>(
      'GET',
      `/v1/subscriptions/${encodeURIComponent(id)}`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * List the price-schedule entries for a subscription (single page).
   *
   * Each entry ties a subscription to a territory and a price point starting
   * on a given date. To resolve the actual monetary value, include the
   * `subscriptionPricePoint` relationship.
   *
   * Prefer {@link listAllPrices} / {@link listAllPricesPages} when you need
   * every territory's schedule.
   *
   * @param id - Numeric App Store Connect resource ID of the subscription.
   * @param query - Optional filters, fieldsets, pagination, and includes.
   * @returns The parsed `SubscriptionPricesResponse` body from
   *   `GET /v1/subscriptions/{id}/prices`.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/list-all-prices-for-a-subscription
   */
  async listPrices(
    id: string,
    query?: ListSubscriptionPricesQuery,
  ): Promise<SubscriptionPricesResponse> {
    return this.client.request<SubscriptionPricesResponse>(
      'GET',
      `/v1/subscriptions/${encodeURIComponent(id)}/prices`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * Iterate every page of {@link listPrices}, auto-following `links.next`.
   *
   * @param id - Numeric App Store Connect resource ID of the subscription.
   * @param query - Same shape as {@link listPrices}. Reused only for the
   *   first request; subsequent pages follow Apple's `links.next`.
   * @yields Each page of `SubscriptionPricesResponse`, starting with the first.
   */
  async *listAllPricesPages(
    id: string,
    query?: ListSubscriptionPricesQuery,
  ): AsyncGenerator<SubscriptionPricesResponse, void, void> {
    yield* this.client.paginate<SubscriptionPricesResponse>(
      `/v1/subscriptions/${encodeURIComponent(id)}/prices`,
      query as QueryParams | undefined,
    );
  }

  /**
   * Iterate every price-schedule entry for a subscription across every page.
   *
   * Item-level convenience on top of {@link listAllPricesPages}.
   *
   * @param id - Numeric App Store Connect resource ID of the subscription.
   * @param query - Same shape as {@link listPrices}.
   * @yields Each {@link SubscriptionPrice}, in Apple's order.
   */
  async *listAllPrices(
    id: string,
    query?: ListSubscriptionPricesQuery,
  ): AsyncGenerator<SubscriptionPrice, void, void> {
    for await (const page of this.listAllPricesPages(id, query)) {
      yield* page.data;
    }
  }
}
