import type { RequestOptions } from '../client.js';
import type { Page } from '../pagination.js';
import { APIResource } from './base.js';

export type ProxyReplacementState = 'validating' | 'validated' | 'processing' | 'completed' | 'failed';

export type ProxyReplacementReason =
  | 'list_updated'
  | 'proxy_replaced'
  | 'auto_invalidated'
  | 'auto_out_of_rotation'
  | 'auto_low_country_confidence'
  | 'auto_deleted';

/** Selector for which proxies to replace. */
export type ToReplace =
  | { type: 'ip_range'; ip_ranges: string[]; count?: number }
  | { type: 'ip_address'; ip_addresses: string[]; count?: number }
  | { type: 'asn'; asn_numbers: Array<string | number>; count?: number }
  | { type: 'country'; country_code: string; count?: number };

/** Selector for which proxies to replace with. `ip_address` cannot be used here. */
export type ReplaceWith =
  | { type: 'ip_range'; ip_ranges: string[]; count?: number }
  | { type: 'asn'; asn_numbers: Array<string | number>; count?: number }
  | { type: 'country'; country_code: string; count?: number }
  | { type: 'any'; count?: number };

/** A proxy replacement request (asynchronous; poll `get` until `completed`/`failed`). */
export interface ProxyReplacement {
  /** Unique identifier of the proxy replacement instance. */
  id: number;
  /** Dictionary indicating which proxies to replace. */
  to_replace: ToReplace;
  /** List of dictionaries indicating which proxies to replace with. */
  replace_with: ReplaceWith[];
  /** Whether this is a dry run (does not modify the proxy list). */
  dry_run: boolean;
  state: ProxyReplacementState;
  /** Number of proxies removed from the proxy list. May be null. */
  proxies_removed: number | null;
  /** Number of proxies added to the proxy list. May be null. */
  proxies_added: number | null;
  /** The reason proxies were replaced. Manual replacements set `proxy_replaced`. */
  reason: ProxyReplacementReason | string;
  /** The error code when state is `failed`. May be null. */
  error_code: string | null;
  /** The error message when state is `failed`. May be null. */
  error: string | null;
  created_at: string;
  /** When this instance's state became `validated`. May be null. */
  dry_run_completed_at: string | null;
  /** When this instance's state became `completed`. May be null. */
  completed_at: string | null;
}

export interface ProxyReplacementListParams {
  /** Target a specific plan; otherwise the default plan is used. */
  plan_id?: number;
  /** Default ordering is `id`. Available fields: `id`, `created_at`, `completed_at`. */
  ordering?: string;
  /** Filter by whether the replacement is a dry run. */
  dry_run?: boolean;
  /** Filter by state. */
  state?: ProxyReplacementState;
  /** Page number. */
  page?: number;
  /** Number of results per page. */
  page_size?: number;
}

export interface ProxyReplacementCreateParams {
  /** Which proxies to replace. */
  to_replace: ToReplace;
  /** Which proxies to replace with (may span multiple selectors). */
  replace_with: ReplaceWith[];
  /**
   * Dry-run the replacement to learn the number of proxies removed/added
   * without modifying the proxy list.
   */
  dry_run?: boolean;
  /** Target a specific plan; otherwise the default plan is used. Sent as a query parameter. */
  plan_id?: number;
}

export interface ProxyReplacementGetParams {
  /** Target a specific plan; otherwise the default plan is used. */
  plan_id?: number;
}

export class ProxyReplacements extends APIResource {
  /** Lists proxy replacements (v3) in paginated format. */
  list(params?: ProxyReplacementListParams, options?: RequestOptions): Promise<Page<ProxyReplacement>> {
    return this._client.requestPage('/api/v3/proxy/replace/', { ...params }, options);
  }

  /**
   * Creates a proxy replacement (v3). This is an asynchronous API: it returns
   * a request in `validating` state; poll {@link get} until it is `completed`
   * or `failed`. Not available when `plan.pool_filter` is `residential`.
   */
  create(params: ProxyReplacementCreateParams, options?: RequestOptions): Promise<ProxyReplacement> {
    const { plan_id, ...body } = params;
    return this._client.request(
      { method: 'POST', path: '/api/v3/proxy/replace/', query: { plan_id }, body },
      options,
    );
  }

  /** Retrieves a proxy replacement (v3); use to poll the state after creation. */
  get(id: number, params?: ProxyReplacementGetParams, options?: RequestOptions): Promise<ProxyReplacement> {
    return this._client.request(
      { method: 'GET', path: `/api/v3/proxy/replace/${id}/`, query: { ...params } },
      options,
    );
  }
}
