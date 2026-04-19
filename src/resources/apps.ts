import type { AppStoreConnect } from '../client.js';

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
   * Placeholder implementation — response is untyped and pagination is not
   * yet wired up. Typed models and auto-paginating iterators will replace the
   * `unknown` return type once OpenAPI codegen is in place.
   *
   * @returns The raw JSON response body from `GET /apps`.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/list_apps
   */
  async list(): Promise<unknown> {
    return this.client.request('GET', '/v1/apps');
  }

  /**
   * Fetch a single app by its App Store Connect resource ID.
   *
   * The ID is the Apple-internal identifier shown in App Store Connect URLs
   * (e.g. `https://appstoreconnect.apple.com/apps/1234567890/...`), not the
   * bundle ID (`com.example.app`) or the SKU.
   *
   * @param id - Numeric App Store Connect resource ID, as a string.
   * @returns The raw JSON response body from `GET /apps/{id}`.
   * @throws {@link AppStoreConnectAPIError} with status `404` if no app with
   *   the given ID exists within the authenticated team.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/read_app_information
   */
  async retrieve(id: string): Promise<unknown> {
    return this.client.request('GET', `/v1/apps/${encodeURIComponent(id)}`);
  }
}
