import type { AppStoreConnect, QueryParams } from '../client.js';
import type { components, operations } from '../generated/openapi.js';

/**
 * A single subscription offer code resource, as it appears inside
 * {@link SubscriptionOfferCodeResponse.data} and
 * {@link SubscriptionOfferCodesResponse.data}.
 *
 * An offer code is a promotional discount on a subscription — used to
 * deliver promo codes or introductory pricing to customers outside the
 * normal purchase flow.
 */
export type SubscriptionOfferCode = components['schemas']['SubscriptionOfferCode'];

/**
 * JSON:API response returned by {@link SubscriptionOfferCodes#retrieve}.
 *
 * Carries a single {@link SubscriptionOfferCode} under `data` plus optional
 * `included` related resources (prices, custom codes, one-time-use codes).
 */
export type SubscriptionOfferCodeResponse = components['schemas']['SubscriptionOfferCodeResponse'];

/**
 * JSON:API response returned by {@link SubscriptionOfferCodes#listForSubscription}.
 *
 * Carries an array of {@link SubscriptionOfferCode} objects under `data`,
 * plus cursor pagination in `links` and optional totals in `meta.paging`.
 */
export type SubscriptionOfferCodesResponse = components['schemas']['SubscriptionOfferCodesResponse'];

/**
 * JSON:API response returned by {@link SubscriptionOfferCodes#listPrices}.
 *
 * Carries an array of offer-code-specific price entries, each tying a
 * territory to a canonical price point for the discount.
 */
export type SubscriptionOfferCodePricesResponse =
  components['schemas']['SubscriptionOfferCodePricesResponse'];

/**
 * JSON:API response returned by {@link SubscriptionOfferCodes#listCustomCodes}.
 *
 * Carries the static redeemable custom codes configured on the offer code
 * (long-lived codes the developer defines ahead of time).
 */
export type SubscriptionOfferCodeCustomCodesResponse =
  components['schemas']['SubscriptionOfferCodeCustomCodesResponse'];

/**
 * JSON:API response returned by {@link SubscriptionOfferCodes#listOneTimeUseCodes}.
 *
 * Carries the batched one-time-use code requests created for the offer
 * code. Use {@link SubscriptionOfferCodeOneTimeUseCodes#retrieveValues} to
 * download the actual code strings for a batch.
 */
export type SubscriptionOfferCodeOneTimeUseCodesResponse =
  components['schemas']['SubscriptionOfferCodeOneTimeUseCodesResponse'];

/**
 * Query parameters accepted by {@link SubscriptionOfferCodes#retrieve}.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/read-subscription-offer-code-information
 */
export type RetrieveSubscriptionOfferCodeQuery =
  operations['subscriptionOfferCodes_getInstance']['parameters']['query'];

/**
 * Query parameters accepted by {@link SubscriptionOfferCodes#listForSubscription}
 * and its auto-paginating variants.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/list-all-subscription-offer-codes-for-a-subscription
 */
export type ListSubscriptionOfferCodesForSubscriptionQuery =
  operations['subscriptions_offerCodes_getToManyRelated']['parameters']['query'];

/**
 * Query parameters accepted by {@link SubscriptionOfferCodes#listPrices}
 * and its auto-paginating variants.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/list-all-prices-for-a-subscription-offer-code
 */
export type ListSubscriptionOfferCodePricesQuery =
  operations['subscriptionOfferCodes_prices_getToManyRelated']['parameters']['query'];

/**
 * Query parameters accepted by {@link SubscriptionOfferCodes#listCustomCodes}
 * and its auto-paginating variants.
 */
export type ListSubscriptionOfferCodeCustomCodesQuery =
  operations['subscriptionOfferCodes_customCodes_getToManyRelated']['parameters']['query'];

/**
 * Query parameters accepted by {@link SubscriptionOfferCodes#listOneTimeUseCodes}
 * and its auto-paginating variants.
 */
export type ListSubscriptionOfferCodeOneTimeUseCodesQuery =
  operations['subscriptionOfferCodes_oneTimeUseCodes_getToManyRelated']['parameters']['query'];

/**
 * Operations on the App Store Connect `subscriptionOfferCodes` resource.
 *
 * Offer codes are promotional discounts attached to a subscription. Each
 * offer code can have a mix of long-lived custom codes (fixed strings
 * developers define) and one-time-use code batches (single-redemption
 * codes Apple generates for distribution).
 *
 * Instances are created by the {@link AppStoreConnect} constructor and
 * accessed via `asc.subscriptionOfferCodes`. Do not construct this class
 * directly.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/subscriptionoffercode
 */
export class SubscriptionOfferCodes {
  /**
   * @param client - Parent {@link AppStoreConnect} client. Used to issue the
   *   underlying authenticated HTTP requests.
   */
  constructor(private readonly client: AppStoreConnect) {}

  /**
   * Fetch a single subscription offer code by its App Store Connect
   * resource ID.
   *
   * @param id - Numeric App Store Connect resource ID of the offer code.
   * @param query - Optional fieldsets and relationship includes.
   * @returns The parsed `SubscriptionOfferCodeResponse` body.
   * @throws {@link AppStoreConnectAPIError} with status `404` if no offer
   *   code with the given ID exists.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/read-subscription-offer-code-information
   */
  async retrieve(
    id: string,
    query?: RetrieveSubscriptionOfferCodeQuery,
  ): Promise<SubscriptionOfferCodeResponse> {
    return this.client.request<SubscriptionOfferCodeResponse>(
      'GET',
      `/v1/subscriptionOfferCodes/${encodeURIComponent(id)}`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * List the offer codes attached to a given subscription (single page).
   *
   * Prefer {@link listAllForSubscription} / {@link listAllForSubscriptionPages}
   * for iterating every offer code without threading cursors by hand.
   *
   * @param subscriptionId - Numeric App Store Connect resource ID of the
   *   parent subscription.
   * @param query - Optional filters, fieldsets, pagination, and includes.
   * @returns The parsed `SubscriptionOfferCodesResponse` body from
   *   `GET /v1/subscriptions/{id}/offerCodes`.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/list-all-subscription-offer-codes-for-a-subscription
   */
  async listForSubscription(
    subscriptionId: string,
    query?: ListSubscriptionOfferCodesForSubscriptionQuery,
  ): Promise<SubscriptionOfferCodesResponse> {
    return this.client.request<SubscriptionOfferCodesResponse>(
      'GET',
      `/v1/subscriptions/${encodeURIComponent(subscriptionId)}/offerCodes`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * Iterate every page of {@link listForSubscription}, auto-following
   * `links.next`.
   *
   * @param subscriptionId - Numeric App Store Connect resource ID of the
   *   parent subscription.
   * @param query - Same shape as {@link listForSubscription}.
   * @yields Each page of `SubscriptionOfferCodesResponse`.
   */
  async *listAllForSubscriptionPages(
    subscriptionId: string,
    query?: ListSubscriptionOfferCodesForSubscriptionQuery,
  ): AsyncGenerator<SubscriptionOfferCodesResponse, void, void> {
    yield* this.client.paginate<SubscriptionOfferCodesResponse>(
      `/v1/subscriptions/${encodeURIComponent(subscriptionId)}/offerCodes`,
      query as QueryParams | undefined,
    );
  }

  /**
   * Iterate every offer code for a subscription across every page.
   *
   * Item-level convenience on top of {@link listAllForSubscriptionPages}.
   *
   * @param subscriptionId - Numeric App Store Connect resource ID of the
   *   parent subscription.
   * @param query - Same shape as {@link listForSubscription}.
   * @yields Each {@link SubscriptionOfferCode}, in Apple's order.
   */
  async *listAllForSubscription(
    subscriptionId: string,
    query?: ListSubscriptionOfferCodesForSubscriptionQuery,
  ): AsyncGenerator<SubscriptionOfferCode, void, void> {
    for await (const page of this.listAllForSubscriptionPages(subscriptionId, query)) {
      yield* page.data;
    }
  }

  /**
   * List the price entries for a subscription offer code (single page).
   *
   * Used for paid / discounted offer codes — free-trial offer codes have
   * no price entries. Include the `subscriptionPricePoint` relationship to
   * resolve monetary values.
   *
   * @param id - Numeric App Store Connect resource ID of the offer code.
   * @param query - Optional filters, fieldsets, pagination, and includes.
   * @returns The parsed `SubscriptionOfferCodePricesResponse` body.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/list-all-prices-for-a-subscription-offer-code
   */
  async listPrices(
    id: string,
    query?: ListSubscriptionOfferCodePricesQuery,
  ): Promise<SubscriptionOfferCodePricesResponse> {
    return this.client.request<SubscriptionOfferCodePricesResponse>(
      'GET',
      `/v1/subscriptionOfferCodes/${encodeURIComponent(id)}/prices`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * Iterate every page of {@link listPrices}, auto-following `links.next`.
   *
   * @param id - Numeric App Store Connect resource ID of the offer code.
   * @param query - Same shape as {@link listPrices}.
   * @yields Each page of `SubscriptionOfferCodePricesResponse`.
   */
  async *listAllPricesPages(
    id: string,
    query?: ListSubscriptionOfferCodePricesQuery,
  ): AsyncGenerator<SubscriptionOfferCodePricesResponse, void, void> {
    yield* this.client.paginate<SubscriptionOfferCodePricesResponse>(
      `/v1/subscriptionOfferCodes/${encodeURIComponent(id)}/prices`,
      query as QueryParams | undefined,
    );
  }

  /**
   * Iterate every price entry for a subscription offer code across every page.
   *
   * Item-level convenience on top of {@link listAllPricesPages}.
   *
   * @param id - Numeric App Store Connect resource ID of the offer code.
   * @param query - Same shape as {@link listPrices}.
   * @yields Each offer-code price entry, in Apple's order.
   */
  async *listAllPrices(
    id: string,
    query?: ListSubscriptionOfferCodePricesQuery,
  ): AsyncGenerator<SubscriptionOfferCodePricesResponse['data'][number], void, void> {
    for await (const page of this.listAllPricesPages(id, query)) {
      yield* page.data;
    }
  }

  /**
   * List the custom (static, developer-defined) codes configured on an
   * offer code (single page).
   *
   * @param id - Numeric App Store Connect resource ID of the offer code.
   * @param query - Optional filters, fieldsets, pagination, and includes.
   * @returns The parsed `SubscriptionOfferCodeCustomCodesResponse` body.
   */
  async listCustomCodes(
    id: string,
    query?: ListSubscriptionOfferCodeCustomCodesQuery,
  ): Promise<SubscriptionOfferCodeCustomCodesResponse> {
    return this.client.request<SubscriptionOfferCodeCustomCodesResponse>(
      'GET',
      `/v1/subscriptionOfferCodes/${encodeURIComponent(id)}/customCodes`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * Iterate every page of {@link listCustomCodes}, auto-following
   * `links.next`.
   *
   * @param id - Numeric App Store Connect resource ID of the offer code.
   * @param query - Same shape as {@link listCustomCodes}.
   * @yields Each page of `SubscriptionOfferCodeCustomCodesResponse`.
   */
  async *listAllCustomCodesPages(
    id: string,
    query?: ListSubscriptionOfferCodeCustomCodesQuery,
  ): AsyncGenerator<SubscriptionOfferCodeCustomCodesResponse, void, void> {
    yield* this.client.paginate<SubscriptionOfferCodeCustomCodesResponse>(
      `/v1/subscriptionOfferCodes/${encodeURIComponent(id)}/customCodes`,
      query as QueryParams | undefined,
    );
  }

  /**
   * Iterate every custom code for an offer code across every page.
   *
   * @param id - Numeric App Store Connect resource ID of the offer code.
   * @param query - Same shape as {@link listCustomCodes}.
   * @yields Each custom-code envelope, in Apple's order.
   */
  async *listAllCustomCodes(
    id: string,
    query?: ListSubscriptionOfferCodeCustomCodesQuery,
  ): AsyncGenerator<
    SubscriptionOfferCodeCustomCodesResponse['data'][number],
    void,
    void
  > {
    for await (const page of this.listAllCustomCodesPages(id, query)) {
      yield* page.data;
    }
  }

  /**
   * List the one-time-use-code batches configured on an offer code
   * (single page).
   *
   * Each entry is a batch of Apple-generated single-redemption codes. To
   * download the actual code strings in a batch, call
   * {@link SubscriptionOfferCodeOneTimeUseCodes#retrieveValues} with the
   * batch's ID.
   *
   * @param id - Numeric App Store Connect resource ID of the offer code.
   * @param query - Optional filters, fieldsets, pagination, and includes.
   * @returns The parsed `SubscriptionOfferCodeOneTimeUseCodesResponse` body.
   */
  async listOneTimeUseCodes(
    id: string,
    query?: ListSubscriptionOfferCodeOneTimeUseCodesQuery,
  ): Promise<SubscriptionOfferCodeOneTimeUseCodesResponse> {
    return this.client.request<SubscriptionOfferCodeOneTimeUseCodesResponse>(
      'GET',
      `/v1/subscriptionOfferCodes/${encodeURIComponent(id)}/oneTimeUseCodes`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * Iterate every page of {@link listOneTimeUseCodes}, auto-following
   * `links.next`.
   *
   * @param id - Numeric App Store Connect resource ID of the offer code.
   * @param query - Same shape as {@link listOneTimeUseCodes}.
   * @yields Each page of `SubscriptionOfferCodeOneTimeUseCodesResponse`.
   */
  async *listAllOneTimeUseCodesPages(
    id: string,
    query?: ListSubscriptionOfferCodeOneTimeUseCodesQuery,
  ): AsyncGenerator<SubscriptionOfferCodeOneTimeUseCodesResponse, void, void> {
    yield* this.client.paginate<SubscriptionOfferCodeOneTimeUseCodesResponse>(
      `/v1/subscriptionOfferCodes/${encodeURIComponent(id)}/oneTimeUseCodes`,
      query as QueryParams | undefined,
    );
  }

  /**
   * Iterate every one-time-use-code batch for an offer code across every page.
   *
   * @param id - Numeric App Store Connect resource ID of the offer code.
   * @param query - Same shape as {@link listOneTimeUseCodes}.
   * @yields Each batch envelope, in Apple's order.
   */
  async *listAllOneTimeUseCodes(
    id: string,
    query?: ListSubscriptionOfferCodeOneTimeUseCodesQuery,
  ): AsyncGenerator<
    SubscriptionOfferCodeOneTimeUseCodesResponse['data'][number],
    void,
    void
  > {
    for await (const page of this.listAllOneTimeUseCodesPages(id, query)) {
      yield* page.data;
    }
  }
}
