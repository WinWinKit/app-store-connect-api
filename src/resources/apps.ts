import type { AppStoreConnect, QueryParams } from '../client.js';
import type { components, operations } from '../generated/openapi.js';

/**
 * Query parameters accepted by {@link Apps.list}.
 *
 * Mirrors the `apps_getCollection` operation in Apple's OpenAPI spec —
 * supports filtering (`filter[bundleId]`, `filter[name]`, ...), sparse
 * fieldsets (`fields[apps]`, ...), sorting (`sort`), pagination (`limit`,
 * `cursor`), and relationship inclusion (`include`, `limit[apps]`, ...).
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/list-apps
 */
export type ListAppsQuery = operations['apps_getCollection']['parameters']['query'];

/**
 * Query parameters accepted by {@link Apps.retrieve}.
 *
 * Mirrors the `apps_getInstance` operation in Apple's OpenAPI spec —
 * supports sparse fieldsets (`fields[apps]`, ...) and relationship
 * inclusion (`include`, `limit[apps]`, ...).
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/read-app-information
 */
export type RetrieveAppQuery = operations['apps_getInstance']['parameters']['query'];

/**
 * JSON:API response returned by {@link Apps.list}.
 *
 * Contains the primary `data` array (each element is a JSON:API resource
 * envelope around an app), plus pagination `links` and optional `meta`
 * totals. Related resources requested via `include` appear under
 * top-level `included`.
 */
export type AppsResponse = components['schemas']['AppsResponse'];

/**
 * JSON:API response returned by {@link Apps.retrieve}.
 *
 * Contains a single `data` element (the JSON:API resource envelope around
 * the requested app) and, if `include` was used, an `included` array of
 * related resources.
 */
export type AppResponse = components['schemas']['AppResponse'];

/**
 * Operations on the App Store Connect `apps` resource.
 *
 * An "app" in App Store Connect corresponds to a single bundle ID registered
 * on your developer account — the parent record that owns builds, versions,
 * in-app purchases, subscriptions, beta groups, reviews, and sales reports.
 *
 * Instances are created by the {@link AppStoreConnect} constructor and
 * accessed via `asc.apps`. Do not construct this class directly.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/app
 */
export class Apps {
  /**
   * @param client - Parent {@link AppStoreConnect} client. Used to issue the
   *   underlying authenticated HTTP requests.
   */
  constructor(private readonly client: AppStoreConnect) {}

  /**
   * List the apps visible to the authenticated team.
   *
   * Accepts the full query-parameter surface documented by Apple — filters,
   * sparse fieldsets, sorting, pagination, and relationship inclusion — all
   * typed end-to-end from the OpenAPI spec. Returns the raw JSON:API
   * envelope; unwrap `.data` to iterate the apps themselves.
   *
   * Pagination is cursor-based via `query.cursor` plus `response.links.next`;
   * a higher-level auto-paginating iterator is planned but not yet
   * implemented.
   *
   * @param query - Optional filters, fieldsets, sort, pagination, and
   *   includes. See {@link ListAppsQuery} for the full shape.
   * @returns The parsed `AppsResponse` body from `GET /v1/apps`.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/list-apps
   */
  async list(query?: ListAppsQuery): Promise<AppsResponse> {
    return this.client.request<AppsResponse>('GET', '/v1/apps', {
      query: query as QueryParams | undefined,
    });
  }

  /**
   * Fetch a single app by its App Store Connect resource ID.
   *
   * The ID is the Apple-internal identifier shown in App Store Connect URLs
   * (e.g. `https://appstoreconnect.apple.com/apps/1234567890/...`), not the
   * bundle ID (`com.example.app`) or the SKU.
   *
   * @param id - Numeric App Store Connect resource ID, as a string.
   * @param query - Optional fieldsets and relationship includes. See
   *   {@link RetrieveAppQuery} for the full shape.
   * @returns The parsed `AppResponse` body from `GET /v1/apps/{id}`.
   * @throws {@link AppStoreConnectAPIError} with status `404` if no app with
   *   the given ID exists within the authenticated team.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/read-app-information
   */
  async retrieve(id: string, query?: RetrieveAppQuery): Promise<AppResponse> {
    return this.client.request<AppResponse>(
      'GET',
      `/v1/apps/${encodeURIComponent(id)}`,
      { query: query as QueryParams | undefined },
    );
  }
}
