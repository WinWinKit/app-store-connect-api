import type { AppStoreConnect, QueryParams } from '../client.js';
import type { components, operations } from '../generated/openapi.js';

/**
 * A single App Store Connect user resource, as it appears inside
 * {@link UserResponse.data} and {@link UsersResponse.data}.
 *
 * Represents one team member with their roles, provisioning access, and
 * visibility scopes.
 */
export type User = components['schemas']['User'];

/**
 * JSON:API response returned by {@link Users#retrieve}.
 */
export type UserResponse = components['schemas']['UserResponse'];

/**
 * JSON:API response returned by {@link Users#list} and its paginated
 * variants.
 */
export type UsersResponse = components['schemas']['UsersResponse'];

/**
 * Query parameters accepted by {@link Users#retrieve}.
 */
export type RetrieveUserQuery = operations['users_getInstance']['parameters']['query'];

/**
 * Query parameters accepted by {@link Users#list} and its auto-paginating
 * variants.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/list-users
 */
export type ListUsersQuery = operations['users_getCollection']['parameters']['query'];

/**
 * Operations on the App Store Connect `users` resource.
 *
 * Exposes read-only access to the authenticated team's users. Write
 * operations (inviting users, updating roles, removing users) are available
 * on Apple's API but not yet wrapped by this library.
 *
 * Instances are created by the {@link AppStoreConnect} constructor and
 * accessed via `asc.users`. Do not construct this class directly.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/user
 */
export class Users {
  /**
   * @param client - Parent {@link AppStoreConnect} client.
   */
  constructor(private readonly client: AppStoreConnect) {}

  /**
   * Fetch a single user by their App Store Connect resource ID.
   *
   * @throws {@link AppStoreConnectAPIError} with status `404` if no user
   *   with the given ID exists within the authenticated team.
   */
  async retrieve(id: string, query?: RetrieveUserQuery): Promise<UserResponse> {
    return this.client.request<UserResponse>(
      'GET',
      `/v1/users/${encodeURIComponent(id)}`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * List the users on the authenticated team (single page).
   *
   * Prefer {@link listAll} / {@link listAllPages} for iterating every user.
   */
  async list(query?: ListUsersQuery): Promise<UsersResponse> {
    return this.client.request<UsersResponse>('GET', '/v1/users', {
      query: query as QueryParams | undefined,
    });
  }

  /**
   * Iterate every page of {@link list}, auto-following `links.next`.
   */
  async *listAllPages(query?: ListUsersQuery): AsyncGenerator<UsersResponse, void, void> {
    yield* this.client.paginate<UsersResponse>('/v1/users', query as QueryParams | undefined);
  }

  /**
   * Iterate every user across every page.
   */
  async *listAll(query?: ListUsersQuery): AsyncGenerator<User, void, void> {
    for await (const page of this.listAllPages(query)) {
      yield* page.data;
    }
  }
}
