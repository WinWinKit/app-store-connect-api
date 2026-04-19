import type { AppStoreConnect, QueryParams } from '../client.js';
import type { components, operations } from '../generated/openapi.js';

/**
 * A single custom offer code resource — a static, developer-defined code
 * string attached to a subscription offer code.
 */
export type SubscriptionOfferCodeCustomCode =
  components['schemas']['SubscriptionOfferCodeCustomCode'];

/**
 * JSON:API response returned by {@link SubscriptionOfferCodeCustomCodes#retrieve}.
 *
 * Carries a single {@link SubscriptionOfferCodeCustomCode} under `data`
 * plus optional `included` related resources.
 */
export type SubscriptionOfferCodeCustomCodeResponse =
  components['schemas']['SubscriptionOfferCodeCustomCodeResponse'];

/**
 * Query parameters accepted by {@link SubscriptionOfferCodeCustomCodes#retrieve}.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/read-subscription-offer-code-custom-code-information
 */
export type RetrieveSubscriptionOfferCodeCustomCodeQuery =
  operations['subscriptionOfferCodeCustomCodes_getInstance']['parameters']['query'];

/**
 * Operations on the App Store Connect `subscriptionOfferCodeCustomCodes`
 * resource.
 *
 * Custom codes are long-lived, developer-defined string tokens attached
 * to an offer code. End users enter them to unlock the discount; the same
 * code can be redeemed by many users.
 *
 * Instances are created by the {@link AppStoreConnect} constructor and
 * accessed via `asc.subscriptionOfferCodeCustomCodes`. Do not construct
 * this class directly.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/subscriptionoffercodecustomcode
 */
export class SubscriptionOfferCodeCustomCodes {
  /**
   * @param client - Parent {@link AppStoreConnect} client. Used to issue the
   *   underlying authenticated HTTP requests.
   */
  constructor(private readonly client: AppStoreConnect) {}

  /**
   * Fetch a single custom offer code by its App Store Connect resource ID.
   *
   * @param id - Numeric App Store Connect resource ID of the custom code.
   * @param query - Optional fieldsets and relationship includes.
   * @returns The parsed `SubscriptionOfferCodeCustomCodeResponse` body.
   * @throws {@link AppStoreConnectAPIError} with status `404` if no custom
   *   code with the given ID exists.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/read-subscription-offer-code-custom-code-information
   */
  async retrieve(
    id: string,
    query?: RetrieveSubscriptionOfferCodeCustomCodeQuery,
  ): Promise<SubscriptionOfferCodeCustomCodeResponse> {
    return this.client.request<SubscriptionOfferCodeCustomCodeResponse>(
      'GET',
      `/v1/subscriptionOfferCodeCustomCodes/${encodeURIComponent(id)}`,
      { query: query as QueryParams | undefined },
    );
  }
}
