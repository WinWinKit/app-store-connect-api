import type { AppStoreConnect, QueryParams } from '../client.js';
import type { components, operations } from '../generated/openapi.js';

/**
 * A single one-time-use offer code batch — an Apple-generated pool of
 * single-redemption code strings for a subscription offer code.
 */
export type SubscriptionOfferCodeOneTimeUseCode =
  components['schemas']['SubscriptionOfferCodeOneTimeUseCode'];

/**
 * JSON:API response returned by {@link SubscriptionOfferCodeOneTimeUseCodes#retrieve}.
 *
 * Carries a single {@link SubscriptionOfferCodeOneTimeUseCode} under
 * `data` plus optional `included` related resources.
 */
export type SubscriptionOfferCodeOneTimeUseCodeResponse =
  components['schemas']['SubscriptionOfferCodeOneTimeUseCodeResponse'];

/**
 * Query parameters accepted by {@link SubscriptionOfferCodeOneTimeUseCodes#retrieve}.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/read-subscription-offer-code-one-time-use-code-information
 */
export type RetrieveSubscriptionOfferCodeOneTimeUseCodeQuery =
  operations['subscriptionOfferCodeOneTimeUseCodes_getInstance']['parameters']['query'];

/**
 * Operations on the App Store Connect
 * `subscriptionOfferCodeOneTimeUseCodes` resource.
 *
 * A one-time-use code request represents a batch of Apple-generated
 * single-redemption codes for an offer code. Each batch has a size and an
 * expiration date; once Apple finishes minting the codes, the actual
 * redeemable strings can be downloaded via {@link retrieveValues} (as a
 * CSV file) for distribution to end users.
 *
 * Instances are created by the {@link AppStoreConnect} constructor and
 * accessed via `asc.subscriptionOfferCodeOneTimeUseCodes`. Do not
 * construct this class directly.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/subscriptionoffercodeonetimeusecode
 */
export class SubscriptionOfferCodeOneTimeUseCodes {
  /**
   * @param client - Parent {@link AppStoreConnect} client. Used to issue the
   *   underlying authenticated HTTP requests.
   */
  constructor(private readonly client: AppStoreConnect) {}

  /**
   * Fetch a single one-time-use-code batch by its App Store Connect
   * resource ID.
   *
   * @param id - Numeric App Store Connect resource ID of the batch.
   * @param query - Optional fieldsets and relationship includes.
   * @returns The parsed `SubscriptionOfferCodeOneTimeUseCodeResponse` body.
   * @throws {@link AppStoreConnectAPIError} with status `404` if no batch
   *   with the given ID exists.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/read-subscription-offer-code-one-time-use-code-information
   */
  async retrieve(
    id: string,
    query?: RetrieveSubscriptionOfferCodeOneTimeUseCodeQuery,
  ): Promise<SubscriptionOfferCodeOneTimeUseCodeResponse> {
    return this.client.request<SubscriptionOfferCodeOneTimeUseCodeResponse>(
      'GET',
      `/v1/subscriptionOfferCodeOneTimeUseCodes/${encodeURIComponent(id)}`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * Download the generated single-redemption code strings for a batch,
   * decoded as CSV text.
   *
   * Apple returns the body with `content-type: text/csv`. Each row
   * contains one redeemable code. If you need to stream the body or
   * inspect headers, call {@link retrieveValuesResponse} instead.
   *
   * @param id - Numeric App Store Connect resource ID of the batch.
   * @returns The CSV body as a string (one code per row).
   * @throws {@link AppStoreConnectAPIError} if the batch is not ready,
   *   has expired, or does not exist.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/read-one-time-use-code-values
   */
  async retrieveValues(id: string): Promise<string> {
    const response = await this.retrieveValuesResponse(id);
    return response.text();
  }

  /**
   * Download a one-time-use-code batch's values, returning the unconsumed
   * {@link Response}.
   *
   * Thin typed wrapper over {@link AppStoreConnect#requestRaw} — use when
   * you need to stream the body or inspect headers directly.
   *
   * @param id - Numeric App Store Connect resource ID of the batch.
   * @returns The unconsumed {@link Response} from
   *   `GET /v1/subscriptionOfferCodeOneTimeUseCodes/{id}/values`.
   */
  async retrieveValuesResponse(id: string): Promise<Response> {
    return this.client.requestRaw(
      'GET',
      `/v1/subscriptionOfferCodeOneTimeUseCodes/${encodeURIComponent(id)}/values`,
    );
  }
}
