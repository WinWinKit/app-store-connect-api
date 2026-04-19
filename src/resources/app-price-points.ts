import type { AppStoreConnect, QueryParams } from '../client.js';
import type { components, operations } from '../generated/openapi.js';

/**
 * A canonical v3 app price point — Apple's catalogued monetary value for
 * paid apps in a specific territory.
 *
 * Consumers reference these by ID when constructing a new app price
 * schedule via {@link Apps#replacePriceSchedule}.
 */
export type AppPricePointV3 = components['schemas']['AppPricePointV3'];

/**
 * JSON:API response returned by {@link AppPricePoints#listForApp} and
 * its paginated variants.
 */
export type AppPricePointsV3Response = components['schemas']['AppPricePointsV3Response'];

/**
 * Query parameters accepted by {@link AppPricePoints#listForApp} and its
 * auto-paginating variants.
 */
export type ListAppPricePointsForAppQuery =
  operations['apps_appPricePoints_getToManyRelated']['parameters']['query'];

/**
 * Operations on the App Store Connect `appPricePoints` resource.
 *
 * Exposes Apple's catalog of paid-app price points — consumers look
 * price points up here to construct an app price schedule payload for
 * {@link Apps#replacePriceSchedule}.
 *
 * Apple does not expose a top-level `GET /v1/appPricePoints/{id}`
 * endpoint (as of spec v4.3), so this resource only lists price points
 * scoped to a given app. Individual price points can still be retrieved
 * as `included` resources on a schedule or price entry.
 *
 * Instances are created by the {@link AppStoreConnect} constructor and
 * accessed via `asc.appPricePoints`. Do not construct this class directly.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/apppricepointv3
 */
export class AppPricePoints {
  /**
   * @param client - Parent {@link AppStoreConnect} client.
   */
  constructor(private readonly client: AppStoreConnect) {}

  /**
   * List the price points available to a given app (single page).
   *
   * Prefer {@link listAllForApp} / {@link listAllForAppPages} to iterate
   * every price point without threading cursors by hand.
   *
   * @param appId - Numeric App Store Connect resource ID of the parent app.
   * @param query - Optional filters (e.g. `filter[territory]`), fieldsets,
   *   pagination, and includes.
   */
  async listForApp(
    appId: string,
    query?: ListAppPricePointsForAppQuery,
  ): Promise<AppPricePointsV3Response> {
    return this.client.request<AppPricePointsV3Response>(
      'GET',
      `/v1/apps/${encodeURIComponent(appId)}/appPricePoints`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * Iterate every page of {@link listForApp}, auto-following `links.next`.
   */
  async *listAllForAppPages(
    appId: string,
    query?: ListAppPricePointsForAppQuery,
  ): AsyncGenerator<AppPricePointsV3Response, void, void> {
    yield* this.client.paginate<AppPricePointsV3Response>(
      `/v1/apps/${encodeURIComponent(appId)}/appPricePoints`,
      query as QueryParams | undefined,
    );
  }

  /**
   * Iterate every price point for an app across every page.
   */
  async *listAllForApp(
    appId: string,
    query?: ListAppPricePointsForAppQuery,
  ): AsyncGenerator<AppPricePointV3, void, void> {
    for await (const page of this.listAllForAppPages(appId, query)) {
      yield* page.data;
    }
  }
}
