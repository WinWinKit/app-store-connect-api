import type { AppStoreConnect, QueryParams } from '../client.js';
import type { operations } from '../generated/openapi.js';

/**
 * Query parameters accepted by {@link SalesReports#download}.
 *
 * Mirrors the `salesReports_getCollection` operation in Apple's OpenAPI
 * spec. All five filter parameters except `filter[reportDate]` and
 * `filter[version]` are required.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/download-sales-and-trends-reports
 */
export type DownloadSalesReportQuery = NonNullable<
  operations['salesReports_getCollection']['parameters']['query']
>;

/**
 * Operations on the App Store Connect `salesReports` resource.
 *
 * App Store Connect exposes sales and trends data as downloadable reports
 * at daily / weekly / monthly / yearly granularity. Each report is a
 * gzipped CSV file tailored to a specific `reportType`, `reportSubType`,
 * `frequency`, and `reportDate` combination for a vendor. This class
 * issues the authenticated download request and returns the raw bytes,
 * leaving decompression and CSV parsing to the caller.
 *
 * Instances are created by the {@link AppStoreConnect} constructor and
 * accessed via `asc.salesReports`. Do not construct this class directly.
 *
 * @see https://developer.apple.com/documentation/appstoreconnectapi/download-sales-and-trends-reports
 */
export class SalesReports {
  /**
   * @param client - Parent {@link AppStoreConnect} client. Used to issue the
   *   underlying authenticated HTTP requests.
   */
  constructor(private readonly client: AppStoreConnect) {}

  /**
   * Download a single sales report as a gzipped binary {@link Blob}.
   *
   * The blob contains a gzip-compressed, tab-separated values (TSV) file.
   * Consumers are responsible for decompression (`zlib.gunzip` on Node,
   * `DecompressionStream('gzip')` in browsers / Workers / Deno) and TSV
   * parsing.
   *
   * If you need to stream the body or inspect headers, call
   * {@link downloadResponse} instead.
   *
   * @param query - Required filter combination — vendor number, report
   *   type, sub-type, frequency, and (for most types) report date.
   * @returns A {@link Blob} of the gzipped report bytes.
   * @throws {@link AppStoreConnectAPIError} - When Apple rejects the
   *   request (invalid filter combination, no report for that date, etc.).
   *
   * @see https://developer.apple.com/documentation/appstoreconnectapi/download-sales-and-trends-reports
   */
  async download(query: DownloadSalesReportQuery): Promise<Blob> {
    const response = await this.downloadResponse(query);
    return response.blob();
  }

  /**
   * Download a sales report, returning the unconsumed {@link Response}.
   *
   * Thin typed wrapper over {@link AppStoreConnect#requestRaw}. Useful
   * when the caller needs to stream the body, inspect response headers
   * (e.g. `content-length`, `content-disposition`), or decode to something
   * other than a {@link Blob} (e.g. `response.arrayBuffer()`).
   *
   * @param query - Same shape as {@link download}.
   * @returns The unconsumed {@link Response} from `GET /v1/salesReports`.
   */
  async downloadResponse(query: DownloadSalesReportQuery): Promise<Response> {
    return this.client.requestRaw('GET', '/v1/salesReports', {
      query: query as QueryParams,
    });
  }
}
