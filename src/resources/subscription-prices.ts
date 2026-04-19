import type { AppStoreConnect, QueryParams } from '../client.js';
import type { components, operations } from '../generated/openapi.js';

/**
 * A single price-schedule entry for a subscription.
 *
 * Each `SubscriptionPrice` represents the price of one subscription in one
 * territory starting on a specific date, referencing a canonical
 * `SubscriptionPricePoint` for the monetary value.
 */
export type SubscriptionPrice = components['schemas']['SubscriptionPrice'];

/**
 * JSON:API response returned by {@link SubscriptionPrices#create}.
 */
export type SubscriptionPriceResponse = components['schemas']['SubscriptionPriceResponse'];

/**
 * JSON:API response returned by
 * {@link SubscriptionPrices#listForSubscription} and its paginated
 * variants.
 */
export type SubscriptionPricesResponse = components['schemas']['SubscriptionPricesResponse'];

/**
 * Request body for {@link SubscriptionPrices#create}.
 *
 * Describes a new scheduled price entry — pointing at the target
 * subscription, the new `SubscriptionPricePoint`, the territory, and the
 * date the new price should take effect.
 */
export type CreateSubscriptionPriceBody =
  components['schemas']['SubscriptionPriceCreateRequest'];

/**
 * Query parameters accepted by
 * {@link SubscriptionPrices#listForSubscription} and its auto-paginating
 * variants.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/list-all-prices-for-a-subscription
 */
export type ListSubscriptionPricesForSubscriptionQuery =
  operations['subscriptions_prices_getToManyRelated']['parameters']['query'];

/**
 * Operations on the App Store Connect `subscriptionPrices` resource.
 *
 * `SubscriptionPrice` entries are Apple's model for scheduled
 * subscription price changes — each row ties a subscription to one
 * `SubscriptionPricePoint` in one territory starting on a specific date.
 *
 * Apple's API does not support editing a price in place; to change a
 * subscription's price, {@link create} a new `SubscriptionPrice` with
 * the new effective date, or {@link cancel} a previously-scheduled
 * upcoming change.
 *
 * Instances are created by the {@link AppStoreConnect} constructor and
 * accessed via `asc.subscriptionPrices`. Do not construct this class
 * directly.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/subscriptionprice
 */
export class SubscriptionPrices {
  /**
   * @param client - Parent {@link AppStoreConnect} client.
   */
  constructor(private readonly client: AppStoreConnect) {}

  /**
   * Schedule a new price change for a subscription in a specific
   * territory.
   *
   * The body describes the target subscription, the new price point, the
   * territory, and the effective date.
   *
   * @param body - Fully-formed `SubscriptionPriceCreateRequest`.
   * @returns The parsed `SubscriptionPriceResponse` describing the new
   *   schedule entry.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/post-v1-subscriptionprices
   */
  async create(body: CreateSubscriptionPriceBody): Promise<SubscriptionPriceResponse> {
    return this.client.request<SubscriptionPriceResponse>('POST', '/v1/subscriptionPrices', {
      body,
    });
  }

  /**
   * Cancel a previously scheduled subscription price change.
   *
   * Only upcoming scheduled changes can be cancelled; past or currently
   * active prices cannot be removed via this endpoint.
   *
   * @param priceId - Numeric App Store Connect resource ID of the
   *   `SubscriptionPrice` entry to cancel.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/delete-v1-subscriptionprices-_id_
   */
  async cancel(priceId: string): Promise<void> {
    await this.client.request<void>(
      'DELETE',
      `/v1/subscriptionPrices/${encodeURIComponent(priceId)}`,
    );
  }

  /**
   * List the price-schedule entries for a subscription (single page).
   *
   * Each entry ties the subscription to a territory and a price point
   * starting on a given date. To resolve monetary values, include the
   * `subscriptionPricePoint` relationship via the `include` query param.
   *
   * Prefer {@link listAllForSubscription} / {@link listAllForSubscriptionPages}
   * when iterating every territory's schedule.
   *
   * @param subscriptionId - Numeric App Store Connect resource ID of the
   *   parent subscription.
   * @param query - Optional filters, fieldsets, pagination, and includes.
   * @returns The parsed `SubscriptionPricesResponse` body from
   *   `GET /v1/subscriptions/{id}/prices`.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/list-all-prices-for-a-subscription
   */
  async listForSubscription(
    subscriptionId: string,
    query?: ListSubscriptionPricesForSubscriptionQuery,
  ): Promise<SubscriptionPricesResponse> {
    return this.client.request<SubscriptionPricesResponse>(
      'GET',
      `/v1/subscriptions/${encodeURIComponent(subscriptionId)}/prices`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * Iterate every page of {@link listForSubscription}, auto-following
   * `links.next`.
   */
  async *listAllForSubscriptionPages(
    subscriptionId: string,
    query?: ListSubscriptionPricesForSubscriptionQuery,
  ): AsyncGenerator<SubscriptionPricesResponse, void, void> {
    yield* this.client.paginate<SubscriptionPricesResponse>(
      `/v1/subscriptions/${encodeURIComponent(subscriptionId)}/prices`,
      query as QueryParams | undefined,
    );
  }

  /**
   * Iterate every price-schedule entry for a subscription across every page.
   */
  async *listAllForSubscription(
    subscriptionId: string,
    query?: ListSubscriptionPricesForSubscriptionQuery,
  ): AsyncGenerator<SubscriptionPrice, void, void> {
    for await (const page of this.listAllForSubscriptionPages(subscriptionId, query)) {
      yield* page.data;
    }
  }
}
