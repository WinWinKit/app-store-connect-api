import type { AppStoreConnect, QueryParams } from '../client.js';
import type { components, operations } from '../generated/openapi.js';

/**
 * JSON:API response returned by
 * {@link InAppPurchasePriceSchedules#retrieve} and
 * {@link InAppPurchasePriceSchedules#retrieveForIap}.
 */
export type InAppPurchasePriceScheduleResponse =
  components['schemas']['InAppPurchasePriceScheduleResponse'];

/**
 * Request body for {@link InAppPurchasePriceSchedules#replace}.
 *
 * POSTing a new schedule fully **replaces** the IAP's current schedule —
 * there is no PATCH variant. The payload ties the schedule to a parent
 * IAP and supplies the base territory plus the full list of manual
 * prices per territory.
 */
export type ReplaceInAppPurchasePriceScheduleBody =
  components['schemas']['InAppPurchasePriceScheduleCreateRequest'];

/**
 * Query parameters accepted by
 * {@link InAppPurchasePriceSchedules#retrieve}.
 */
export type RetrieveInAppPurchasePriceScheduleQuery =
  operations['inAppPurchasePriceSchedules_getInstance']['parameters']['query'];

/**
 * Query parameters accepted by
 * {@link InAppPurchasePriceSchedules#retrieveForIap}.
 */
export type RetrieveInAppPurchasePriceScheduleForIapQuery =
  operations['inAppPurchasesV2_iapPriceSchedule_getToOneRelated']['parameters']['query'];

/**
 * Operations on the App Store Connect `inAppPurchasePriceSchedules`
 * resource.
 *
 * Apple models IAP prices as a single, immutable-per-version "schedule"
 * per IAP: one base territory plus a full list of manual price overrides.
 * Instead of PATCHing individual prices, consumers POST a new schedule
 * that replaces the previous one in full.
 *
 * Instances are created by the {@link AppStoreConnect} constructor and
 * accessed via `asc.inAppPurchasePriceSchedules`. Do not construct this
 * class directly.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/inapppurchasepriceschedule
 */
export class InAppPurchasePriceSchedules {
  /**
   * @param client - Parent {@link AppStoreConnect} client.
   */
  constructor(private readonly client: AppStoreConnect) {}

  /**
   * Fetch an IAP's price schedule by the schedule's App Store Connect
   * resource ID.
   *
   * If you have an IAP ID (not a schedule ID), use {@link retrieveForIap}
   * instead — it follows the relationship for you.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/read-in-app-purchase-price-schedule-information
   */
  async retrieve(
    scheduleId: string,
    query?: RetrieveInAppPurchasePriceScheduleQuery,
  ): Promise<InAppPurchasePriceScheduleResponse> {
    return this.client.request<InAppPurchasePriceScheduleResponse>(
      'GET',
      `/v1/inAppPurchasePriceSchedules/${encodeURIComponent(scheduleId)}`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * Fetch the currently-active price schedule for a given IAP, by the
   * IAP's ID.
   *
   * Follows `GET /v2/inAppPurchases/{id}/iapPriceSchedule`.
   */
  async retrieveForIap(
    iapId: string,
    query?: RetrieveInAppPurchasePriceScheduleForIapQuery,
  ): Promise<InAppPurchasePriceScheduleResponse> {
    return this.client.request<InAppPurchasePriceScheduleResponse>(
      'GET',
      `/v2/inAppPurchases/${encodeURIComponent(iapId)}/iapPriceSchedule`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * Replace an IAP's price schedule in full.
   *
   * Apple does not expose PATCH / PUT on IAP price schedules — each POST
   * creates a fresh schedule that supersedes the previous one. The body
   * describes the parent IAP, the base territory (the anchor price that
   * drives automatic conversions), and the full list of manual price
   * overrides per territory.
   *
   * @param body - Fully-formed `InAppPurchasePriceScheduleCreateRequest`.
   * @returns The parsed `InAppPurchasePriceScheduleResponse` for the new
   *   schedule.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/post-v1-inapppurchasepriceschedules
   */
  async replace(
    body: ReplaceInAppPurchasePriceScheduleBody,
  ): Promise<InAppPurchasePriceScheduleResponse> {
    return this.client.request<InAppPurchasePriceScheduleResponse>(
      'POST',
      '/v1/inAppPurchasePriceSchedules',
      { body },
    );
  }
}
