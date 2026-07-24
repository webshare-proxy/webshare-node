import type { RequestOptions } from '../client.js';
import type { Page } from '../pagination.js';
import { APIResource } from './base.js';

/** A proxy activity record (one per authenticated proxy request). */
export interface ProxyActivityRecord {
  /** The timestamp of the proxy request (ISO 8601). */
  timestamp: string;
  /** The proxy protocol. */
  protocol: 'http' | 'socks';
  /** Total proxy request duration in seconds. */
  request_duration: number;
  /** Duration to authenticate and establish the proxy connection, in seconds. */
  handshake_duration: number;
  /** Duration the connection stayed active after the handshake, in seconds. May be null. */
  tunnel_duration: number | null;
  /** Error reason for the proxy request. May be null. */
  error_reason: string | null;
  /** User-friendly explanation on how to fix the error. May be null. */
  error_reason_how_to_fix: string | null;
  /** The proxy username used. Only set if `error_reason` is `no_proxies_allocated`. May be null. */
  auth_username: string | null;
  /**
   * The IP address of the proxy used to access the target site. May be null;
   * null if `plan.pool_filter` is `residential`.
   */
  proxy_address: string | null;
  /** Number of bytes consumed (downloaded + uploaded). */
  bytes: number;
  /** The IP address you used to connect to the proxy server. */
  client_address: string;
  /** The IP address of the target site. May be null. */
  ip_address: string | null;
  /** The hostname of the target site. May be null. */
  hostname: string | null;
  /** The domain name of the target site. May be null. */
  domain: string | null;
  /** The port of the target site. May be null. */
  port: number | null;
  /** The source port used to connect to the target site. May be null. */
  proxy_port: number | null;
  /** The IP address of the proxy server you connected to. */
  listen_address: string;
  /** The port of the proxy server you connected to. */
  listen_port: number;
}

export interface ProxyActivityListParams {
  /** The timestamp (ISO 8601) of the activity will be less than this. */
  timestamp__lte?: string;
  /** The timestamp (ISO 8601) of the activity will be greater than this. Cannot be older than 90 days. */
  timestamp__gte?: string;
  /** Generic search query. */
  search?: string;
  /** Match only requests with the given error reason; pass `*` for any error. */
  error_reason?: string;
  /** Pass the timestamp of the last proxy activity to retrieve the next page. */
  starting_after?: string;
  /** Number of results per page (used with `starting_after`). */
  page_size?: number;
  /** Filter requests with bytes equal or greater than the given value. */
  bytes__gte?: string;
  /** Filter requests with bytes equal or less than the given value. */
  bytes__lte?: string;
  /** The account verification category to filter with. */
  verification_category?: string;
  /** Target a specific plan; otherwise the default plan is used. */
  plan_id?: number;
}

export interface ProxyActivityDownloadParams {
  /** Token retrieved from the download token API with scope `activity`. */
  download_token: string;
  timestamp__lte?: string;
  timestamp__gte?: string;
  search?: string;
  /** Match only requests with the given error reason; pass `*` for any error. */
  error_reason?: string;
  starting_after?: string;
  bytes__gte?: string;
  bytes__lte?: string;
  /** Target a specific plan; otherwise the default plan is used. */
  plan_id?: number;
}

export class ProxyActivity extends APIResource {
  /**
   * Lists proxy activity within a time period. Paginates with
   * `starting_after`/`page_size` (pass the `timestamp` of the latest activity
   * as `starting_after` to view the next page); the returned page also
   * auto-iterates by following the envelope `next` URL.
   */
  list(params?: ProxyActivityListParams, options?: RequestOptions): Promise<Page<ProxyActivityRecord>> {
    return this._client.requestPage('/api/v2/proxy/activity/', { ...params }, options);
  }

  /**
   * Downloads the proxy activity list as a CSV file (returned as a string).
   * Requires a download token with scope `activity` (unauthenticated
   * endpoint).
   */
  download(params: ProxyActivityDownloadParams, options?: RequestOptions): Promise<string> {
    return this._client.request(
      { method: 'GET', path: '/api/v2/proxy/activity/download/', query: { ...params }, auth: false, responseType: 'text' },
      options,
    );
  }
}
