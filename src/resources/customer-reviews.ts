import type { AppStoreConnect, QueryParams } from '../client.js';
import type { components, operations } from '../generated/openapi.js';

/**
 * A single customer review resource, as it appears inside
 * {@link CustomerReviewResponse.data} and
 * {@link CustomerReviewsResponse.data}.
 *
 * Carries the reviewer's rating, title, body, territory, and timestamps,
 * plus a relationship to the developer's response (if any).
 */
export type CustomerReview = components['schemas']['CustomerReview'];

/**
 * JSON:API response returned by {@link CustomerReviews#retrieve}.
 */
export type CustomerReviewResponse = components['schemas']['CustomerReviewResponse'];

/**
 * JSON:API response returned by {@link CustomerReviews#listForApp} and its
 * paginated variants.
 */
export type CustomerReviewsResponse = components['schemas']['CustomerReviewsResponse'];

/**
 * Query parameters accepted by {@link CustomerReviews#retrieve}.
 */
export type RetrieveCustomerReviewQuery =
  operations['customerReviews_getInstance']['parameters']['query'];

/**
 * Query parameters accepted by {@link CustomerReviews#listForApp} and its
 * auto-paginating variants.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/list-all-customer-reviews-for-an-app
 */
export type ListCustomerReviewsForAppQuery =
  operations['apps_customerReviews_getToManyRelated']['parameters']['query'];

/**
 * Operations on the App Store Connect `customerReviews` resource.
 *
 * Exposes read-only access to customer reviews left on App Store listings.
 * Apple does not provide a flat collection endpoint for reviews — they are
 * always scoped to a specific app.
 *
 * Instances are created by the {@link AppStoreConnect} constructor and
 * accessed via `asc.customerReviews`. Do not construct this class directly.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/customerreview
 */
export class CustomerReviews {
  /**
   * @param client - Parent {@link AppStoreConnect} client.
   */
  constructor(private readonly client: AppStoreConnect) {}

  /**
   * Fetch a single customer review by its App Store Connect resource ID.
   *
   * @throws {@link AppStoreConnectAPIError} with status `404` if no review
   *   with the given ID exists or is accessible to the authenticated team.
   */
  async retrieve(
    id: string,
    query?: RetrieveCustomerReviewQuery,
  ): Promise<CustomerReviewResponse> {
    return this.client.request<CustomerReviewResponse>(
      'GET',
      `/v1/customerReviews/${encodeURIComponent(id)}`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * List the customer reviews for a given app (single page).
   *
   * Prefer {@link listAllForApp} / {@link listAllForAppPages} for iterating
   * every review of an app.
   */
  async listForApp(
    appId: string,
    query?: ListCustomerReviewsForAppQuery,
  ): Promise<CustomerReviewsResponse> {
    return this.client.request<CustomerReviewsResponse>(
      'GET',
      `/v1/apps/${encodeURIComponent(appId)}/customerReviews`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * Iterate every page of {@link listForApp}, auto-following `links.next`.
   */
  async *listAllForAppPages(
    appId: string,
    query?: ListCustomerReviewsForAppQuery,
  ): AsyncGenerator<CustomerReviewsResponse, void, void> {
    yield* this.client.paginate<CustomerReviewsResponse>(
      `/v1/apps/${encodeURIComponent(appId)}/customerReviews`,
      query as QueryParams | undefined,
    );
  }

  /**
   * Iterate every customer review for an app across every page.
   */
  async *listAllForApp(
    appId: string,
    query?: ListCustomerReviewsForAppQuery,
  ): AsyncGenerator<CustomerReview, void, void> {
    for await (const page of this.listAllForAppPages(appId, query)) {
      yield* page.data;
    }
  }
}
