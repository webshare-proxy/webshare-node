import type { RequestOptions } from '../client.js';
import type { Page } from '../pagination.js';
import { buildProxyListDownloadUrl, type ProxyListDownloadUrlOptions } from '../proxy-url.js';
import { APIResource } from './base.js';

/** A proxy from the proxy list API. */
export interface Proxy {
  /** Unique identifier of the proxy instance (a string, e.g. `"d-10513"`). */
  id: string;
  /** Proxy username. */
  username: string;
  /** Proxy password. */
  password: string;
  /**
   * IP address of the proxy. In direct connection mode, connect to this IP
   * address; in backbone mode, connect to `p.webshare.io`. Null if
   * `plan.pool_filter` is `residential`.
   */
  proxy_address: string | null;
  /** Port used to connect to the proxies. In backbone mode, the port is always set for IP authorization. */
  port: number;
  /** Whether the proxy is working as expected (checked every 30 seconds). */
  valid: boolean;
  /** Last time the proxy was checked (ISO 8601). */
  last_verification: string;
  /** ISO 3166-1 alpha-2 country code of the proxy. */
  country_code: string;
  /** The city name of the proxy. */
  city_name: string;
  /** The timestamp of when this instance was created (ISO 8601). */
  created_at: string;
}

export interface ProxyListParams {
  /** `direct` or `backbone`. Required. Must be `backbone` if `plan.pool_filter` is `residential`. */
  mode: 'direct' | 'backbone';
  /** Target a specific plan; otherwise the default plan is used. */
  plan_id?: number;
  /** Page number. */
  page?: number;
  /** Number of results per page. */
  page_size?: number;
  /** Filter by comma separated ISO 3166-1 alpha-2 country codes (e.g. `FR,US`). */
  country_code__in?: string;
  /** Filter by a search phrase. Does not work in `backbone` mode. */
  search?: string;
  /** Comma separated ordering fields; prefix with `-` for descending. Not supported in `backbone` mode. */
  ordering?: string;
  /** Filter by proxy create date. Does not work in `backbone` mode. */
  created_at?: string;
  /** Filter by a specific proxy address. Does not work in `backbone` mode. */
  proxy_address?: string;
  /** Filter by comma separated proxy addresses. Does not work in `backbone` mode. */
  proxy_address__in?: string;
  /** Filter by proxy validity. Does not work in `backbone` mode. */
  valid?: boolean;
  /** Filter by the proxy address ASN number. Does not work in `backbone` mode. */
  asn_number?: string;
  /** Filter by the proxy address ASN name. Does not work in `backbone` mode. */
  asn_name?: string;
}

export interface ProxyRefreshParams {
  /** Target a specific plan; otherwise the default plan is used. */
  plan_id?: number;
}

/**
 * Parameters for downloading the proxy list. Same fields as the URL builder,
 * minus `baseURL` (taken from the client).
 */
export type ProxyListDownloadParams = Omit<ProxyListDownloadUrlOptions, 'baseURL'>;

export class Proxies extends APIResource {
  /** Lists proxies in paginated format. `mode` is required. */
  list(params: ProxyListParams, options?: RequestOptions): Promise<Page<Proxy>> {
    return this._client.requestPage('/api/v2/proxy/list/', { ...params }, options);
  }

  /**
   * Refreshes the entire proxy list on demand. Only available when the plan
   * has `on_demand_refreshes_available`.
   */
  refresh(params?: ProxyRefreshParams, options?: RequestOptions): Promise<void> {
    return this._client.request(
      { method: 'POST', path: '/api/v2/proxy/list/refresh/', query: { ...params }, responseType: 'void' },
      options,
    );
  }

  /**
   * Downloads the proxy list as plain text, one proxy per line in
   * `address:port:username:password` format. The URL embeds the
   * `proxy_list_download_token` from the proxy config API and requires no
   * authentication.
   */
  download(params: ProxyListDownloadParams, options?: RequestOptions): Promise<string> {
    const url = buildProxyListDownloadUrl({ ...params, baseURL: this._client.baseURL });
    return this._client.request({ method: 'GET', url, auth: false, responseType: 'text' }, options);
  }

  /** Builds the unauthenticated proxy list download URL without fetching it. */
  downloadURL(params: ProxyListDownloadParams): string {
    return buildProxyListDownloadUrl({ ...params, baseURL: this._client.baseURL });
  }
}
