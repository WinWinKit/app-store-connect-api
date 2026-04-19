import type { AppStoreConnect, QueryParams } from '../client.js';
import type { components, operations } from '../generated/openapi.js';

/**
 * A single subscription group resource, as it appears inside
 * {@link SubscriptionGroupsResponse.data} and
 * {@link SubscriptionGroupResponse.data}.
 *
 * A subscription group is the parent container for a family of related
 * auto-renewable subscriptions on the same app (e.g. "Monthly / Yearly /
 * Family" tiers of the same service). Users can only subscribe to one
 * subscription from each group at a time.
 */
export type SubscriptionGroup = components['schemas']['SubscriptionGroup'];

/**
 * JSON:API response returned by {@link SubscriptionGroups#retrieve}.
 *
 * Carries a single {@link SubscriptionGroup} under `data` plus optional
 * `included` related resources.
 */
export type SubscriptionGroupResponse = components['schemas']['SubscriptionGroupResponse'];

/**
 * JSON:API response returned by {@link SubscriptionGroups#listForApp}.
 *
 * Carries an array of {@link SubscriptionGroup} objects under `data`, with
 * cursor pagination in `links` and optional totals in `meta.paging`.
 */
export type SubscriptionGroupsResponse = components['schemas']['SubscriptionGroupsResponse'];

/**
 * JSON:API response returned by {@link SubscriptionGroups#listSubscriptions}.
 *
 * Carries an array of subscription objects under `data`, with cursor
 * pagination in `links` and optional totals in `meta.paging`.
 */
export type SubscriptionsResponse = components['schemas']['SubscriptionsResponse'];

/**
 * Query parameters accepted by {@link SubscriptionGroups#retrieve}.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/read-subscription-group-information
 */
export type RetrieveSubscriptionGroupQuery =
  operations['subscriptionGroups_getInstance']['parameters']['query'];

/**
 * Query parameters accepted by {@link SubscriptionGroups#listForApp} and its
 * auto-paginating variants.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/list-all-subscription-groups-for-an-app
 */
export type ListSubscriptionGroupsForAppQuery =
  operations['apps_subscriptionGroups_getToManyRelated']['parameters']['query'];

/**
 * Query parameters accepted by {@link SubscriptionGroups#listSubscriptions}
 * and its auto-paginating variants.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/list-all-subscriptions-for-a-subscription-group
 */
export type ListSubscriptionsForGroupQuery =
  operations['subscriptionGroups_subscriptions_getToManyRelated']['parameters']['query'];

/**
 * Operations on the App Store Connect `subscriptionGroups` resource.
 *
 * Subscription groups are containers for related auto-renewable
 * subscriptions. Each app can have multiple groups, and each group can
 * contain multiple subscription tiers. This class exposes the read-only
 * endpoints needed to discover groups belonging to an app and the
 * subscriptions inside each group.
 *
 * Instances are created by the {@link AppStoreConnect} constructor and
 * accessed via `asc.subscriptionGroups`. Do not construct this class
 * directly.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/subscriptiongroup
 */
export class SubscriptionGroups {
  /**
   * @param client - Parent {@link AppStoreConnect} client. Used to issue the
   *   underlying authenticated HTTP requests.
   */
  constructor(private readonly client: AppStoreConnect) {}

  /**
   * Fetch a single subscription group by its App Store Connect resource ID.
   *
   * @param id - Numeric App Store Connect resource ID of the group.
   * @param query - Optional fieldsets and relationship includes.
   * @returns The parsed `SubscriptionGroupResponse` body from
   *   `GET /v1/subscriptionGroups/{id}`.
   * @throws {@link AppStoreConnectAPIError} with status `404` if no
   *   subscription group with the given ID exists.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/read-subscription-group-information
   */
  async retrieve(
    id: string,
    query?: RetrieveSubscriptionGroupQuery,
  ): Promise<SubscriptionGroupResponse> {
    return this.client.request<SubscriptionGroupResponse>(
      'GET',
      `/v1/subscriptionGroups/${encodeURIComponent(id)}`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * List the subscription groups belonging to a given app (single page).
   *
   * Prefer {@link listAllForApp} / {@link listAllForAppPages} for iterating
   * every group without threading cursors by hand.
   *
   * @param appId - Numeric App Store Connect resource ID of the parent app.
   * @param query - Optional filters, fieldsets, sort, pagination, and
   *   includes.
   * @returns The parsed `SubscriptionGroupsResponse` body from
   *   `GET /v1/apps/{id}/subscriptionGroups`.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/list-all-subscription-groups-for-an-app
   */
  async listForApp(
    appId: string,
    query?: ListSubscriptionGroupsForAppQuery,
  ): Promise<SubscriptionGroupsResponse> {
    return this.client.request<SubscriptionGroupsResponse>(
      'GET',
      `/v1/apps/${encodeURIComponent(appId)}/subscriptionGroups`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * Iterate every page of {@link listForApp}, auto-following `links.next`.
   *
   * Same pagination semantics as {@link Apps#listAllPages}: lazy, breaking
   * out of the loop stops further fetches.
   *
   * @param appId - Numeric App Store Connect resource ID of the parent app.
   * @param query - Same shape as {@link listForApp}. Reused only for the
   *   first request; subsequent pages follow Apple's `links.next`.
   * @yields Each page of `SubscriptionGroupsResponse`, starting with the first.
   */
  async *listAllForAppPages(
    appId: string,
    query?: ListSubscriptionGroupsForAppQuery,
  ): AsyncGenerator<SubscriptionGroupsResponse, void, void> {
    yield* this.client.paginate<SubscriptionGroupsResponse>(
      `/v1/apps/${encodeURIComponent(appId)}/subscriptionGroups`,
      query as QueryParams | undefined,
    );
  }

  /**
   * Iterate every subscription group across every page.
   *
   * Item-level convenience on top of {@link listAllForAppPages}.
   *
   * @param appId - Numeric App Store Connect resource ID of the parent app.
   * @param query - Same shape as {@link listForApp}.
   * @yields Each {@link SubscriptionGroup}, in Apple's order.
   */
  async *listAllForApp(
    appId: string,
    query?: ListSubscriptionGroupsForAppQuery,
  ): AsyncGenerator<SubscriptionGroup, void, void> {
    for await (const page of this.listAllForAppPages(appId, query)) {
      yield* page.data;
    }
  }

  /**
   * List the subscriptions belonging to a given subscription group (single page).
   *
   * Prefer {@link listAllSubscriptions} / {@link listAllSubscriptionsPages}
   * for iterating every subscription without threading cursors by hand.
   *
   * @param id - Numeric App Store Connect resource ID of the parent group.
   * @param query - Optional filters, fieldsets, sort, pagination, and
   *   includes.
   * @returns The parsed `SubscriptionsResponse` body from
   *   `GET /v1/subscriptionGroups/{id}/subscriptions`.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/list-all-subscriptions-for-a-subscription-group
   */
  async listSubscriptions(
    id: string,
    query?: ListSubscriptionsForGroupQuery,
  ): Promise<SubscriptionsResponse> {
    return this.client.request<SubscriptionsResponse>(
      'GET',
      `/v1/subscriptionGroups/${encodeURIComponent(id)}/subscriptions`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * Iterate every page of {@link listSubscriptions}, auto-following `links.next`.
   *
   * @param id - Numeric App Store Connect resource ID of the parent group.
   * @param query - Same shape as {@link listSubscriptions}.
   * @yields Each page of `SubscriptionsResponse`, starting with the first.
   */
  async *listAllSubscriptionsPages(
    id: string,
    query?: ListSubscriptionsForGroupQuery,
  ): AsyncGenerator<SubscriptionsResponse, void, void> {
    yield* this.client.paginate<SubscriptionsResponse>(
      `/v1/subscriptionGroups/${encodeURIComponent(id)}/subscriptions`,
      query as QueryParams | undefined,
    );
  }

  /**
   * Iterate every subscription across every page of a group.
   *
   * Item-level convenience on top of {@link listAllSubscriptionsPages}.
   *
   * @param id - Numeric App Store Connect resource ID of the parent group.
   * @param query - Same shape as {@link listSubscriptions}.
   * @yields Each subscription envelope, in Apple's order.
   */
  async *listAllSubscriptions(
    id: string,
    query?: ListSubscriptionsForGroupQuery,
  ): AsyncGenerator<SubscriptionsResponse['data'][number], void, void> {
    for await (const page of this.listAllSubscriptionsPages(id, query)) {
      yield* page.data;
    }
  }
}
