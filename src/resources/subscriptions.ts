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
 * Query parameters accepted by {@link Subscriptions#retrieve}.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/read-subscription-information
 */
export type RetrieveSubscriptionQuery =
  operations['subscriptions_getInstance']['parameters']['query'];

/**
 * Operations on the App Store Connect `subscriptions` resource.
 *
 * Subscriptions in App Store Connect are the individual auto-renewable
 * subscription products users can buy (e.g. "Monthly — $4.99/mo"). They
 * belong to a {@link SubscriptionGroup}, which is how Apple models the
 * mutual-exclusion between different tiers of the same service.
 *
 * This class exposes lifecycle operations for a single subscription.
 * Price-related operations live on dedicated resources:
 * {@link SubscriptionPrices} for scheduled price changes and
 * {@link SubscriptionPricePoints} for the canonical price catalog.
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
}
