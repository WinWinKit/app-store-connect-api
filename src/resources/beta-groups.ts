import type { AppStoreConnect, QueryParams } from '../client.js';
import type { components, operations } from '../generated/openapi.js';

/**
 * A single beta group resource, as it appears inside
 * {@link BetaGroupResponse.data} and {@link BetaGroupsResponse.data}.
 *
 * Represents one TestFlight tester group attached to an app — carrying the
 * group name, internal/external flag, public-link settings, build
 * availability, and relationships to testers and builds.
 */
export type BetaGroup = components['schemas']['BetaGroup'];

/**
 * JSON:API response returned by {@link BetaGroups#retrieve}.
 */
export type BetaGroupResponse = components['schemas']['BetaGroupResponse'];

/**
 * JSON:API response returned by {@link BetaGroups#list},
 * {@link BetaGroups#listForApp}, and their paginated variants.
 */
export type BetaGroupsResponse = components['schemas']['BetaGroupsResponse'];

/**
 * JSON:API response returned by {@link BetaGroups#listTesters} and its
 * paginated variants.
 */
export type BetaTestersResponse = components['schemas']['BetaTestersResponse'];

/**
 * JSON:API response returned by {@link BetaGroups#listBuilds} and its
 * paginated variants.
 */
export type BetaGroupBuildsResponse = components['schemas']['BuildsWithoutIncludesResponse'];

/**
 * Query parameters accepted by {@link BetaGroups#retrieve}.
 */
export type RetrieveBetaGroupQuery = operations['betaGroups_getInstance']['parameters']['query'];

/**
 * Query parameters accepted by {@link BetaGroups#list} and its
 * auto-paginating variants.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/list-beta-groups
 */
export type ListBetaGroupsQuery = operations['betaGroups_getCollection']['parameters']['query'];

/**
 * Query parameters accepted by {@link BetaGroups#listForApp} and its
 * auto-paginating variants.
 */
export type ListBetaGroupsForAppQuery =
  operations['apps_betaGroups_getToManyRelated']['parameters']['query'];

/**
 * Query parameters accepted by {@link BetaGroups#listTesters} and its
 * auto-paginating variants.
 */
export type ListBetaGroupTestersQuery =
  operations['betaGroups_betaTesters_getToManyRelated']['parameters']['query'];

/**
 * Query parameters accepted by {@link BetaGroups#listBuilds} and its
 * auto-paginating variants.
 */
export type ListBetaGroupBuildsQuery =
  operations['betaGroups_builds_getToManyRelated']['parameters']['query'];

/**
 * Operations on the App Store Connect `betaGroups` resource.
 *
 * Beta groups organize TestFlight testers into addressable buckets for
 * build distribution. This class exposes read-only endpoints for looking
 * up groups, listing groups belonging to an app, and enumerating the
 * testers and builds attached to a given group.
 *
 * Instances are created by the {@link AppStoreConnect} constructor and
 * accessed via `asc.betaGroups`. Do not construct this class directly.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/betagroup
 */
export class BetaGroups {
  /**
   * @param client - Parent {@link AppStoreConnect} client.
   */
  constructor(private readonly client: AppStoreConnect) {}

  /**
   * Fetch a single beta group by its App Store Connect resource ID.
   *
   * @throws {@link AppStoreConnectAPIError} with status `404` if no beta
   *   group with the given ID exists.
   */
  async retrieve(id: string, query?: RetrieveBetaGroupQuery): Promise<BetaGroupResponse> {
    return this.client.request<BetaGroupResponse>(
      'GET',
      `/v1/betaGroups/${encodeURIComponent(id)}`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * List the beta groups visible to the authenticated team (single page).
   *
   * Prefer {@link listAll} / {@link listAllPages} for iterating every group.
   */
  async list(query?: ListBetaGroupsQuery): Promise<BetaGroupsResponse> {
    return this.client.request<BetaGroupsResponse>('GET', '/v1/betaGroups', {
      query: query as QueryParams | undefined,
    });
  }

  /**
   * Iterate every page of {@link list}, auto-following `links.next`.
   */
  async *listAllPages(
    query?: ListBetaGroupsQuery,
  ): AsyncGenerator<BetaGroupsResponse, void, void> {
    yield* this.client.paginate<BetaGroupsResponse>(
      '/v1/betaGroups',
      query as QueryParams | undefined,
    );
  }

  /**
   * Iterate every beta group across every page.
   */
  async *listAll(query?: ListBetaGroupsQuery): AsyncGenerator<BetaGroup, void, void> {
    for await (const page of this.listAllPages(query)) {
      yield* page.data;
    }
  }

  /**
   * List the beta groups of a specific app (single page).
   */
  async listForApp(
    appId: string,
    query?: ListBetaGroupsForAppQuery,
  ): Promise<BetaGroupsResponse> {
    return this.client.request<BetaGroupsResponse>(
      'GET',
      `/v1/apps/${encodeURIComponent(appId)}/betaGroups`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * Iterate every page of {@link listForApp}, auto-following `links.next`.
   */
  async *listAllForAppPages(
    appId: string,
    query?: ListBetaGroupsForAppQuery,
  ): AsyncGenerator<BetaGroupsResponse, void, void> {
    yield* this.client.paginate<BetaGroupsResponse>(
      `/v1/apps/${encodeURIComponent(appId)}/betaGroups`,
      query as QueryParams | undefined,
    );
  }

  /**
   * Iterate every beta group of an app across every page.
   */
  async *listAllForApp(
    appId: string,
    query?: ListBetaGroupsForAppQuery,
  ): AsyncGenerator<BetaGroup, void, void> {
    for await (const page of this.listAllForAppPages(appId, query)) {
      yield* page.data;
    }
  }

  /**
   * List the beta testers belonging to a group (single page).
   */
  async listTesters(
    id: string,
    query?: ListBetaGroupTestersQuery,
  ): Promise<BetaTestersResponse> {
    return this.client.request<BetaTestersResponse>(
      'GET',
      `/v1/betaGroups/${encodeURIComponent(id)}/betaTesters`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * Iterate every page of {@link listTesters}, auto-following `links.next`.
   */
  async *listAllTestersPages(
    id: string,
    query?: ListBetaGroupTestersQuery,
  ): AsyncGenerator<BetaTestersResponse, void, void> {
    yield* this.client.paginate<BetaTestersResponse>(
      `/v1/betaGroups/${encodeURIComponent(id)}/betaTesters`,
      query as QueryParams | undefined,
    );
  }

  /**
   * Iterate every tester in a beta group across every page.
   */
  async *listAllTesters(
    id: string,
    query?: ListBetaGroupTestersQuery,
  ): AsyncGenerator<BetaTestersResponse['data'][number], void, void> {
    for await (const page of this.listAllTestersPages(id, query)) {
      yield* page.data;
    }
  }

  /**
   * List the builds distributed to a beta group (single page).
   */
  async listBuilds(
    id: string,
    query?: ListBetaGroupBuildsQuery,
  ): Promise<BetaGroupBuildsResponse> {
    return this.client.request<BetaGroupBuildsResponse>(
      'GET',
      `/v1/betaGroups/${encodeURIComponent(id)}/builds`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * Iterate every page of {@link listBuilds}, auto-following `links.next`.
   */
  async *listAllBuildsPages(
    id: string,
    query?: ListBetaGroupBuildsQuery,
  ): AsyncGenerator<BetaGroupBuildsResponse, void, void> {
    yield* this.client.paginate<BetaGroupBuildsResponse>(
      `/v1/betaGroups/${encodeURIComponent(id)}/builds`,
      query as QueryParams | undefined,
    );
  }

  /**
   * Iterate every build distributed to a beta group across every page.
   */
  async *listAllBuilds(
    id: string,
    query?: ListBetaGroupBuildsQuery,
  ): AsyncGenerator<BetaGroupBuildsResponse['data'][number], void, void> {
    for await (const page of this.listAllBuildsPages(id, query)) {
      yield* page.data;
    }
  }
}
