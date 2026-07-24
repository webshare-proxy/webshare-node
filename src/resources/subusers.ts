import type { RequestOptions } from '../client.js';
import type { Page } from '../pagination.js';
import type { AggregateStats, CountMap } from './shared.js';
import { APIResource } from './base.js';

/**
 * A sub-user. The Sub-User API is only available after accepting additional
 * terms for the Webshare sub-user portal (https://proxy.webshare.io/subuser/).
 */
export interface Subuser {
  /** Unique identifier of the user; never changes and is never reused. */
  id: number;
  /** Label to identify your users. */
  label: string;
  /**
   * Null disables custom proxy lists; otherwise a dictionary of country code
   * to number of proxies. `ZZ` means any available country.
   */
  proxy_countries: CountMap | null;
  /** The user proxy limit in GBs. 0 means unlimited bandwidth. */
  proxy_limit: number;
  /** The maximum number of concurrent proxy requests this user can have. */
  max_thread_count: number;
  /** Proxy stats for this sub-user, in the aggregate stats format. */
  aggregate_stats: AggregateStats;
  /** Read-only: when this user was created. */
  created_at: string;
  /** Read-only: when this user was last updated. */
  updated_at: string;
  /** The time bandwidth use calculation starts. Editable. */
  bandwidth_use_start_date: string;
  /** Read-only: the time the user bandwidth use will reset. */
  bandwidth_use_end_date: string;
}

export interface SubuserListParams {
  /** Page number. */
  page?: number;
  /** Number of results per page. */
  page_size?: number;
  /** Target a specific plan; otherwise the default plan is used. */
  plan_id?: number;
}

export interface SubuserCreateParams {
  /** Label to identify the user. */
  label?: string;
  /** The user proxy limit in GBs. Set to 0 for unlimited bandwidth. */
  proxy_limit?: number;
  /** The maximum number of concurrent proxy requests this user can have. */
  max_thread_count?: number;
  /** Null disables custom proxy lists; otherwise country code to proxy count (`ZZ` = any country). */
  proxy_countries?: CountMap | null;
  /** The time bandwidth use calculation starts. */
  bandwidth_use_start_date?: string;
  /** Target a specific plan; otherwise the default plan is used. Sent as a query parameter. */
  plan_id?: number;
}

export interface SubuserUpdateParams {
  /** The label of the user. */
  label?: string;
  /** Null disables custom proxy lists; otherwise country code to proxy count. */
  proxy_countries?: CountMap | null;
  /** The user proxy limit in GBs. */
  proxy_limit?: number;
  /** The maximum number of concurrent proxy requests. */
  max_thread_count?: number;
  /** The time bandwidth use calculation starts. */
  bandwidth_use_start_date?: string;
  /** Target a specific plan; otherwise the default plan is used. Sent as a query parameter. */
  plan_id?: number;
}

export interface SubuserScopeParams {
  /** Target a specific plan; otherwise the default plan is used. */
  plan_id?: number;
}

export class Subusers extends APIResource {
  /** Lists all sub-users in paginated format. */
  list(params?: SubuserListParams, options?: RequestOptions): Promise<Page<Subuser>> {
    return this._client.requestPage('/api/v2/subuser/', { ...params }, options);
  }

  /** Creates a new sub-user. */
  create(params: SubuserCreateParams, options?: RequestOptions): Promise<Subuser> {
    const { plan_id, ...body } = params;
    return this._client.request({ method: 'POST', path: '/api/v2/subuser/', query: { plan_id }, body }, options);
  }

  /** Retrieves a specific sub-user. */
  get(id: number, params?: SubuserScopeParams, options?: RequestOptions): Promise<Subuser> {
    return this._client.request({ method: 'GET', path: `/api/v2/subuser/${id}/`, query: { ...params } }, options);
  }

  /** Partially updates an existing sub-user. */
  update(id: number, params: SubuserUpdateParams, options?: RequestOptions): Promise<Subuser> {
    const { plan_id, ...body } = params;
    return this._client.request({ method: 'PATCH', path: `/api/v2/subuser/${id}/`, query: { plan_id }, body }, options);
  }

  /** Deletes a sub-user. */
  delete(id: number, params?: SubuserScopeParams, options?: RequestOptions): Promise<void> {
    return this._client.request(
      { method: 'DELETE', path: `/api/v2/subuser/${id}/`, query: { ...params }, responseType: 'void' },
      options,
    );
  }

  /** Refreshes the proxy list of a sub-user (requires a custom proxy list). */
  refreshProxyList(id: number, options?: RequestOptions): Promise<Subuser> {
    return this._client.request({ method: 'POST', path: `/api/v2/subuser/${id}/refresh/` }, options);
  }
}
