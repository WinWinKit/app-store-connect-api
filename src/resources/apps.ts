import type { AppStoreConnect, QueryParams } from '../client.js';
import type { components, operations } from '../generated/openapi.js';

/**
 * A single app resource, as it appears inside
 * {@link AppsResponse.data} and {@link AppResponse.data}.
 *
 * Carries the JSON:API envelope (`id`, `type`, `attributes`, `relationships`)
 * for one App Store Connect app.
 */
export type App = components['schemas']['App'];

/**
 * Query parameters accepted by {@link Apps#list}.
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
 * Query parameters accepted by {@link Apps#retrieve}.
 *
 * Mirrors the `apps_getInstance` operation in Apple's OpenAPI spec —
 * supports sparse fieldsets (`fields[apps]`, ...) and relationship
 * inclusion (`include`, `limit[apps]`, ...).
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/read-app-information
 */
export type RetrieveAppQuery = operations['apps_getInstance']['parameters']['query'];

/**
 * JSON:API response returned by {@link Apps#list}.
 *
 * Contains the primary `data` array (each element is a JSON:API resource
 * envelope around an app), plus pagination `links` and optional `meta`
 * totals. Related resources requested via `include` appear under
 * top-level `included`.
 */
export type AppsResponse = components['schemas']['AppsResponse'];

/**
 * JSON:API response returned by {@link Apps#retrieve}.
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
 * Price-related operations live on dedicated resources:
 * {@link AppPriceSchedules} for the paid-app price schedule and
 * {@link AppPricePoints} for the canonical price catalog.
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
   * Returns a single page. To iterate every page automatically, use
   * {@link listAllPages} (for page-level access) or {@link listAll} (for
   * item-level iteration) instead of threading cursors by hand.
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
   * Iterate every page of the apps collection, auto-following `links.next`.
   *
   * Prefer this over calling {@link list} in a loop — it carries Apple's
   * opaque cursor from one page to the next automatically and lazily fetches
   * only as far as the caller consumes the iterator. Yields full page
   * responses so consumers can access `meta.paging`, `included`, and
   * `links` per page.
   *
   * ```ts
   * for await (const page of asc.apps.listAllPages({ limit: 200 })) {
   *   console.log(`got ${page.data.length} apps in this page`);
   * }
   * ```
   *
   * @param query - Same shape as {@link list}. Re-used only for the first
   *   request; subsequent requests reuse the parameters Apple embeds in
   *   `links.next`.
   * @yields Each page of `AppsResponse`, starting with the first.
   */
  async *listAllPages(query?: ListAppsQuery): AsyncGenerator<AppsResponse, void, void> {
    yield* this.client.paginate<AppsResponse>('/v1/apps', query as QueryParams | undefined);
  }

  /**
   * Iterate every app across every page, auto-following `links.next`.
   *
   * Thin item-level convenience on top of {@link listAllPages} — yields
   * individual {@link App} objects from each page's `data` array. Drop down
   * to {@link listAllPages} when you need access to per-page metadata
   * (`meta.paging`, `included`, `links`).
   *
   * ```ts
   * for await (const app of asc.apps.listAll({ limit: 200 })) {
   *   console.log(app.attributes?.bundleId);
   * }
   * ```
   *
   * @param query - Same shape as {@link list}. See {@link listAllPages} for
   *   how it is applied across pages.
   * @yields Each {@link App}, in the order Apple returns them.
   */
  async *listAll(query?: ListAppsQuery): AsyncGenerator<App, void, void> {
    for await (const page of this.listAllPages(query)) {
      yield* page.data;
    }
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
    return this.client.request<AppResponse>('GET', `/v1/apps/${encodeURIComponent(id)}`, {
      query: query as QueryParams | undefined,
    });
  }
}
