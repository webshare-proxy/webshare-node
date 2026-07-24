import type { RequestOptions } from '../client.js';
import type { Page } from '../pagination.js';
import type { CountMap } from './shared.js';
import type { ProxySubtype, ProxyType } from './subscription.js';
import { APIResource } from './base.js';

/** A plan. A new plan object is created each time the customer re-customizes. */
export interface Plan {
  /** Unique identifier of the plan instance. */
  id: number;
  status: 'active' | 'cancelled';
  /** Bandwidth limit in GBs. 0 means unlimited bandwidth. */
  bandwidth_limit: number;
  /** Price in USD for the monthly term. */
  monthly_price: number;
  /** Price in USD for the yearly term. */
  yearly_price: number;
  /** Category of proxies. */
  proxy_type: ProxyType;
  /** Sub category of the proxies. */
  proxy_subtype: ProxySubtype;
  /** Number of proxies in the plan. */
  proxy_count: number;
  /** Number of proxies from each country code; `ZZ` means randomly allocated. */
  proxy_countries: CountMap;
  /** List of site checks the proxy list has to work with. */
  required_site_checks: string[];
  /** Number of on-demand refreshes purchased as part of this plan. */
  on_demand_refreshes_total: number;
  /** On-demand refreshes used since `subscription.start_date`. */
  on_demand_refreshes_used: number;
  /** On-demand refreshes available for this plan. */
  on_demand_refreshes_available: number;
  /** Auto-refresh frequency in seconds. 0 means no automatic refreshes. */
  automatic_refresh_frequency: number;
  /** Last auto-refresh time. Comes as null in the list plans endpoint. */
  automatic_refresh_last_at: string | null;
  /** Next auto-refresh time. Comes as null in the list plans endpoint. */
  automatic_refresh_next_at: string | null;
  /** Individual proxy replacements purchased as part of this plan. */
  proxy_replacements_total: number;
  /** Proxy replacements used since `subscription.start_date`. */
  proxy_replacements_used: number;
  /** Proxy replacements available for this plan. */
  proxy_replacements_available: number;
  /** Number of subusers allowed in this plan. */
  subusers_total: number;
  subusers_used: number;
  subusers_available: number;
  /** Whether this plan has unlimited IP authorizations. */
  is_unlimited_ip_authorizations: boolean;
  /** Whether this plan has high concurrency (3,000 concurrent requests). */
  is_high_concurrency: boolean;
  /** Whether this plan has 2x concurrency (1,000 concurrent requests). */
  is_2x_concurrency: boolean;
  /** Whether this plan has high priority network. */
  is_high_priority_network: boolean;
  /** Whether this plan only uses high quality IPs (30% price premium). */
  high_quality_ips_only: boolean;
  /** Set when this plan is an addon in a bundle; otherwise null. */
  bundle_info: { primary_plan_id: number | null; discount_rate: number } | null;
  /** Set when this plan is the primary plan of a bundle; otherwise an empty list. */
  bundle_addons: Array<{ plan_id: number; discount_rate: number }>;
  created_at: string;
  updated_at: string;
}

export interface PlanListParams {
  /** Page number. */
  page?: number;
  /** Number of results per page. */
  page_size?: number;
}

export interface PlanUpdateParams {
  /** Next time the proxy list will be auto-refreshed. The only updatable field. */
  automatic_refresh_next_at?: string;
}

/** Response of cancelling a plan. */
export interface PlanCancelResponse {
  success: boolean;
  /** ID of the credit transaction created by the cancellation. */
  transaction: number;
}

export class Plans extends APIResource {
  /** Lists all plans created by the user (even non-active ones) in paginated format. */
  list(params?: PlanListParams, options?: RequestOptions): Promise<Page<Plan>> {
    return this._client.requestPage('/api/v2/subscription/plan/', { ...params }, options);
  }

  /** Retrieves a plan (the active plan ID is on the subscription object). */
  get(id: number, options?: RequestOptions): Promise<Plan> {
    return this._client.request({ method: 'GET', path: `/api/v2/subscription/plan/${id}/` }, options);
  }

  /** Updates a plan. Only `automatic_refresh_next_at` can be updated. */
  update(id: number, params: PlanUpdateParams, options?: RequestOptions): Promise<Plan> {
    return this._client.request({ method: 'PATCH', path: `/api/v2/subscription/plan/${id}/`, body: params }, options);
  }

  /** Cancels a plan; the subscription is credited for what is left in it. */
  cancel(id: number, options?: RequestOptions): Promise<PlanCancelResponse> {
    return this._client.request({ method: 'POST', path: `/api/v2/subscription/plan/${id}/cancel/`, body: {} }, options);
  }
}
