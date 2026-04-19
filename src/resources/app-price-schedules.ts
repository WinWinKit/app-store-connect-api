import type { AppStoreConnect, QueryParams } from '../client.js';
import type { components, operations } from '../generated/openapi.js';

/**
 * JSON:API response returned by {@link AppPriceSchedules#retrieve} and
 * {@link AppPriceSchedules#retrieveForApp}.
 */
export type AppPriceScheduleResponse = components['schemas']['AppPriceScheduleResponse'];

/**
 * Request body for {@link AppPriceSchedules#replace}.
 *
 * POSTing a new schedule fully **replaces** the app's current schedule —
 * there is no PATCH variant. The payload ties the schedule to a parent
 * app and supplies the base territory plus the full list of manual
 * price overrides per territory.
 */
export type ReplaceAppPriceScheduleBody = components['schemas']['AppPriceScheduleCreateRequest'];

/**
 * Query parameters accepted by {@link AppPriceSchedules#retrieve}.
 */
export type RetrieveAppPriceScheduleQuery =
  operations['appPriceSchedules_getInstance']['parameters']['query'];

/**
 * Query parameters accepted by {@link AppPriceSchedules#retrieveForApp}.
 */
export type RetrieveAppPriceScheduleForAppQuery =
  operations['apps_appPriceSchedule_getToOneRelated']['parameters']['query'];

/**
 * Operations on the App Store Connect `appPriceSchedules` resource.
 *
 * Apple models paid-app pricing as a single schedule per app: one base
 * territory plus a full list of manual price overrides. Instead of
 * PATCHing individual prices, consumers POST a new schedule that
 * replaces the previous one in full.
 *
 * Instances are created by the {@link AppStoreConnect} constructor and
 * accessed via `asc.appPriceSchedules`. Do not construct this class
 * directly.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/apppriceschedule
 */
export class AppPriceSchedules {
  /**
   * @param client - Parent {@link AppStoreConnect} client.
   */
  constructor(private readonly client: AppStoreConnect) {}

  /**
   * Fetch an app's price schedule by the schedule's App Store Connect
   * resource ID.
   *
   * If you have an app ID (not a schedule ID), use {@link retrieveForApp}
   * instead — it follows the relationship for you.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/read-app-price-schedule-information
   */
  async retrieve(
    scheduleId: string,
    query?: RetrieveAppPriceScheduleQuery,
  ): Promise<AppPriceScheduleResponse> {
    return this.client.request<AppPriceScheduleResponse>(
      'GET',
      `/v1/appPriceSchedules/${encodeURIComponent(scheduleId)}`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * Fetch the currently-active price schedule for a given app, by the
   * app's ID.
   *
   * Follows `GET /v1/apps/{id}/appPriceSchedule`.
   */
  async retrieveForApp(
    appId: string,
    query?: RetrieveAppPriceScheduleForAppQuery,
  ): Promise<AppPriceScheduleResponse> {
    return this.client.request<AppPriceScheduleResponse>(
      'GET',
      `/v1/apps/${encodeURIComponent(appId)}/appPriceSchedule`,
      { query: query as QueryParams | undefined },
    );
  }

  /**
   * Replace an app's price schedule in full.
   *
   * Apple does not expose PATCH / PUT on app price schedules — each POST
   * creates a fresh schedule that supersedes the previous one. The body
   * describes the parent app, the base territory (the anchor price that
   * drives automatic conversions), and the full list of manual price
   * overrides per territory.
   *
   * @param body - Fully-formed `AppPriceScheduleCreateRequest`.
   * @returns The parsed `AppPriceScheduleResponse` for the new schedule.
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/post-v1-apppriceschedules
   */
  async replace(body: ReplaceAppPriceScheduleBody): Promise<AppPriceScheduleResponse> {
    return this.client.request<AppPriceScheduleResponse>('POST', '/v1/appPriceSchedules', {
      body,
    });
  }
}
