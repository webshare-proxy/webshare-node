import type { RequestOptions } from '../client.js';
import type { Page } from '../pagination.js';
import { APIResource } from './base.js';

export type ReplacedProxyReason =
  | 'list_updated'
  | 'proxy_replaced'
  | 'auto_invalidated'
  | 'auto_out_of_rotation'
  | 'auto_low_country_confidence'
  | 'auto_deleted'
  | 'auto_site_check';

/** A replaced proxy record. */
export interface ReplacedProxy {
  /** Unique identifier of the replaced proxy instance. */
  id: number;
  /** The reason this proxy was replaced. */
  reason: ReplacedProxyReason;
  /** The IP address of the replaced proxy. */
  proxy: string;
  /** The port of the replaced proxy. */
  proxy_port: number;
  /** Country code in ISO-3166 format. */
  proxy_country_code: string;
  /** The IP address of the new proxy. */
  replaced_with: string;
  /** The port of the new proxy. */
  replaced_with_port: number;
  /** Country code in ISO-3166 format. */
  replaced_with_country_code: string;
  /** The timestamp of when this instance was created (ISO 8601). */
  created_at: string;
}

export interface ReplacedProxyListParams {
  /** Filter the replaced proxies by a specific proxy replacement ID. */
  proxy_list_replacement?: number;
  /** Target a specific plan; otherwise the default plan is used. */
  plan_id?: number;
  /** Page number. */
  page?: number;
  /** Number of results per page. */
  page_size?: number;
}

export interface ReplacedProxyDownloadParams {
  /** Token retrieved from the download token API with scope `replaced_proxy`. */
  download_token: string;
  /** ISO 3166-1 alpha-2 country codes separated by hyphen (`-`); `-` alone selects all countries. */
  country_codes?: string;
  /** Authentication method for the downloaded list. */
  authentication_type?: 'username' | 'sourceip';
  /** `backbone` or `direct`. Must be `backbone` if `plan.pool_filter` is `residential`. */
  mode?: 'backbone' | 'direct';
  /** URL encoded search terms; `-` indicates no search terms. */
  search?: string;
  /** Filter the replaced proxies by a specific proxy replacement ID. */
  proxy_list_replacement?: number;
  /** Proxy protocol; request examples use `any`. */
  proxy_protocol?: string;
}

export class ReplacedProxies extends APIResource {
  /** Lists replaced proxies in paginated format. */
  list(params?: ReplacedProxyListParams, options?: RequestOptions): Promise<Page<ReplacedProxy>> {
    return this._client.requestPage('/api/v2/proxy/list/replaced/', { ...params }, options);
  }

  /**
   * Downloads the replaced proxy list as plain text; each line is
   * `new_address:new_port:username:password:replaced_address`. Requires a
   * download token with scope `replaced_proxy` (unauthenticated endpoint).
   */
  download(params: ReplacedProxyDownloadParams, options?: RequestOptions): Promise<string> {
    return this._client.request(
      {
        method: 'GET',
        path: '/api/v2/proxy/list/replaced/download/',
        query: { ...params },
        auth: false,
        responseType: 'text',
      },
      options,
    );
  }
}
