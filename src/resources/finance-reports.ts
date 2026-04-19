import type { AppStoreConnect, QueryParams } from '../client.js';
import type { operations } from '../generated/openapi.js';

/**
 * Query parameters accepted by {@link FinanceReports#download}.
 *
 * Mirrors the `financeReports_getCollection` operation in Apple's OpenAPI
 * spec. All four filters are required: vendor number, report type, region
 * code, and report date.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/download-finance-reports
 */
export type DownloadFinanceReportQuery = NonNullable<
  operations['financeReports_getCollection']['parameters']['query']
>;

/**
 * Operations on the App Store Connect `financeReports` resource.
 *
 * Finance reports are monthly payout and financial detail exports covering
 * a single region and fiscal period. Like sales reports, they are returned
 * as gzipped CSV files — consumers are responsible for decompression and
 * parsing.
 *
 * Instances are created by the {@link AppStoreConnect} constructor and
 * accessed via `asc.financeReports`. Do not construct this class directly.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/download-finance-reports
 */
export class FinanceReports {
  /**
   * @param client - Parent {@link AppStoreConnect} client. Used to issue the
   *   underlying authenticated HTTP requests.
   */
  constructor(private readonly client: AppStoreConnect) {}

  /**
   * Download a single finance report as a gzipped binary {@link Blob}.
   *
   * The blob contains a gzip-compressed, tab-separated values (TSV) file.
   * Consumers are responsible for decompression and parsing.
   *
   * If you need to stream the body or inspect headers, call
   * {@link downloadResponse} instead.
   *
   * @param query - Required filter combination — vendor number, region
   *   code, report type, and report date (Apple's fiscal month format).
   * @returns A {@link Blob} of the gzipped report bytes.
   * @throws {@link AppStoreConnectAPIError} - When Apple rejects the
   *   request (invalid filter combination, no report for that period, etc.).
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/download-finance-reports
   */
  async download(query: DownloadFinanceReportQuery): Promise<Blob> {
    const response = await this.downloadResponse(query);
    return response.blob();
  }

  /**
   * Download a finance report, returning the unconsumed {@link Response}.
   *
   * Thin typed wrapper over {@link AppStoreConnect#requestRaw} — use when
   * you need to stream the body, inspect headers, or decode to something
   * other than a {@link Blob}.
   *
   * @param query - Same shape as {@link download}.
   * @returns The unconsumed {@link Response} from `GET /v1/financeReports`.
   */
  async downloadResponse(query: DownloadFinanceReportQuery): Promise<Response> {
    return this.client.requestRaw('GET', '/v1/financeReports', {
      query: query as QueryParams,
    });
  }
}
