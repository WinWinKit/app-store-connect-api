import type { AppStoreConnect, QueryParams } from '../client.js';
import type { components, operations } from '../generated/openapi.js';

/**
 * A single build resource, as it appears inside
 * {@link BuildsResponse.data} and {@link BuildResponse.data}.
 *
 * A build is an uploaded binary for an app — one entry per Xcode / Transporter
 * submission, carrying the processing state, version/build numbers, expiry,
 * minimum OS version, and relationships to the app, pre-release version,
 * App Store version, and beta groups it's distributed to.
 */
export type Build = components['schemas']['Build'];

/**
 * JSON:API response returned by {@link Builds#retrieve}.
 */
export type BuildResponse = components['schemas']['BuildResponse'];

/**
 * JSON:API response returned by {@link Builds#list} and its paginated
 * variants.
 */
export type BuildsResponse = components['schemas']['BuildsResponse'];

/**
 * Query parameters accepted by {@link Builds#list} and its
 * auto-paginating variants.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/list-builds
 */
export type ListBuildsQuery = operations['builds_getCollection']['parameters']['query'];

/**
 * Query parameters accepted by {@link Builds#retrieve}.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/read-build-information
 */
export type RetrieveBuildQuery = operations['builds_getInstance']['parameters']['query'];

/**
 * Query parameters accepted by {@link Builds#listForApp} and its
 * auto-paginating variants.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/list-all-builds-of-an-app
 */
export type ListBuildsForAppQuery =
  operations['apps_builds_getToManyRelated']['parameters']['query'];

/**
 * Operations on the App Store Connect `builds` resource.
 *
 * Exposes read-only access to the flat `/v1/builds` collection (with Apple's
 * full filter/sort/fieldset surface) and the app-scoped
 * `/v1/apps/{id}/builds` relationship collection. Single-build lookup by ID
 * is also available.
 *
 * Instances are created by the {@link AppStoreConnect} constructor and
 * accessed via `asc.builds`. Do not construct this class directly.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/build
 */
export class Builds {
  /**
   * @param client - Parent {@link AppStoreConnect} client. Used to issue the
   *   underlying authenticated HTTP requests.
   */
  constructor(private readonly client: AppStoreConnect) {}

  /**
   * Fetch a single build by its App Store Connect resource ID.
   *
   * @param id - Numeric App Store Connect resource ID of the build.
   * @param query - Optional fieldsets and relationship includes.
   * @returns The parsed `BuildResponse` body.
   * @throws {@link AppStoreConnectAPIError} with status `404` if no build
   *   with the given ID exists.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/read-build-information
   */
  async retrieve(id: string, query?: RetrieveBuildQuery): Promise<BuildResponse> {
    return this.client.request<BuildResponse>(
      'GET',
      `/v1/builds/${encodeURIComponent(id)}`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * List builds visible to the authenticated team (single page).
   *
   * Supports filters like `filter[app]`, `filter[processingState]`,
   * `filter[expired]`, sorting, sparse fieldsets, and relationship
   * inclusion. Prefer {@link listAll} / {@link listAllPages} for iterating
   * every build.
   */
  async list(query?: ListBuildsQuery): Promise<BuildsResponse> {
    return this.client.request<BuildsResponse>('GET', '/v1/builds', {
      query: query as QueryParams | undefined,
    });
  }

  /**
   * Iterate every page of {@link list}, auto-following `links.next`.
   */
  async *listAllPages(query?: ListBuildsQuery): AsyncGenerator<BuildsResponse, void, void> {
    yield* this.client.paginate<BuildsResponse>('/v1/builds', query as QueryParams | undefined);
  }

  /**
   * Iterate every build across every page.
   */
  async *listAll(query?: ListBuildsQuery): AsyncGenerator<Build, void, void> {
    for await (const page of this.listAllPages(query)) {
      yield* page.data;
    }
  }

  /**
   * List the builds of a specific app (single page).
   *
   * Prefer {@link listAllForApp} / {@link listAllForAppPages} for iterating
   * every build of an app.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/list-all-builds-of-an-app
   */
  async listForApp(
    appId: string,
    query?: ListBuildsForAppQuery,
  ): Promise<BuildsResponse> {
    return this.client.request<BuildsResponse>(
      'GET',
      `/v1/apps/${encodeURIComponent(appId)}/builds`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * Iterate every page of {@link listForApp}, auto-following `links.next`.
   */
  async *listAllForAppPages(
    appId: string,
    query?: ListBuildsForAppQuery,
  ): AsyncGenerator<BuildsResponse, void, void> {
    yield* this.client.paginate<BuildsResponse>(
      `/v1/apps/${encodeURIComponent(appId)}/builds`,
      query as QueryParams | undefined,
    );
  }

  /**
   * Iterate every build of an app across every page.
   */
  async *listAllForApp(
    appId: string,
    query?: ListBuildsForAppQuery,
  ): AsyncGenerator<Build, void, void> {
    for await (const page of this.listAllForAppPages(appId, query)) {
      yield* page.data;
    }
  }
}
