import type { RequestOptions } from '../client.js';
import type { AsnMap, CountMap } from './shared.js';
import { APIResource } from './base.js';

/** The v3 proxy config subset returned by `GET /api/v3/proxy/config`. */
export interface ProxyConfigV3 {
  /** Maximum number of seconds a proxy request can be used. Min 15 seconds, max 7 days. */
  request_timeout: number;
  /** Maximum number of seconds a proxy request can stay idle. Min 15 seconds, max 2 hours. */
  request_idle_timeout: number;
  /** Country codes served for IP authorization in backbone mode. Null means all countries. */
  ip_authorization_country_codes: string[] | null;
  /** City for IP authorization geo targeting (residential plans only). Null disables. */
  ip_authorization_city: string | null;
  /**
   * State for IP authorization geo targeting. Null disables. Mutually
   * exclusive with the other IP authorization geo filters. Observed on the
   * live API; referenced in the docs' mutual-exclusion notes but not in the
   * field tables.
   */
  ip_authorization_state?: string | null;
  /**
   * Postal code for IP authorization geo targeting. Null disables. Mutually
   * exclusive with the other IP authorization geo filters. Observed on the
   * live API; referenced in the docs' mutual-exclusion notes but not in the
   * field tables.
   */
  ip_authorization_postalcode?: string | null;
  /** ASN targeted for IP authorization in backbone mode. Null disables. */
  ip_authorization_asn: string | null;
  /** Auto-replace proxies that are invalid for 15 minutes. Cannot be edited for free plans. */
  auto_replace_invalid_proxies: boolean;
  /** Auto-replace proxies with low country confidence. Cannot be edited for free plans. */
  auto_replace_low_country_confidence_proxies: boolean;
  /** Auto-replace proxies performing slower than usual. */
  auto_replace_out_of_rotation_proxies: boolean;
  /** Auto-replace proxies that no longer pass site checks. */
  auto_replace_failed_site_check_proxies: boolean;
  /** Alpha-numeric token used for proxy list download links. */
  proxy_list_download_token: string;
}

/** The full (v2) proxy config object returned by update/allocate. */
export interface ProxyConfigObject {
  /** Unique identifier of the proxy configuration instance. */
  id: number;
  /** Whether the proxy list is ready to use. */
  state: 'pending' | 'processing' | 'completed';
  /** Proxy countries by count in the proxy list. */
  countries: CountMap;
  /** Proxy countries by count available (not in the current proxy list). */
  available_countries: CountMap;
  /** Unallocated proxy countries by count. */
  unallocated_countries: CountMap;
  /** IP ranges in /24 subnets by count in the proxy list (CIDR:count). Empty for residential plans. */
  ip_ranges_24: CountMap;
  /** IP ranges in /16 subnets by count in the proxy list. Empty for residential plans. */
  ip_ranges_16: CountMap;
  /** IP ranges in /8 subnets by count in the proxy list. Empty for residential plans. */
  ip_ranges_8: CountMap;
  /** Available IP ranges in /24 subnets by count. Empty for residential plans. */
  available_ip_ranges_24: CountMap;
  /** Available IP ranges in /16 subnets by count. Empty for residential plans. */
  available_ip_ranges_16: CountMap;
  /** Available IP ranges in /8 subnets by count. */
  available_ip_ranges_8: CountMap;
  /** ASNs in `{asn_number: [asn_name, count]}` format. Empty for residential plans. */
  asns: AsnMap;
  /** Available ASNs in `{asn_number: [asn_name, count]}` format. Empty for residential plans. */
  available_asns: AsnMap;
  /** Proxy username (8-32 characters, alphanumeric). */
  username: string;
  /** Proxy password (8-32 characters, alphanumeric). */
  password: string;
  request_timeout: number;
  request_idle_timeout: number;
  ip_authorization_country_codes: string[] | null;
  ip_authorization_city: string | null;
  /** State for IP authorization geo targeting. Observed on the live API. */
  ip_authorization_state?: string | null;
  /** Postal code for IP authorization geo targeting. Observed on the live API. */
  ip_authorization_postalcode?: string | null;
  ip_authorization_asn: string | null;
  auto_replace_invalid_proxies: boolean;
  auto_replace_low_country_confidence_proxies: boolean;
  auto_replace_out_of_rotation_proxies: boolean;
  auto_replace_failed_site_check_proxies: boolean;
  /** Alpha-numeric token used for proxy list download links. */
  proxy_list_download_token: string;
  /** Indicates whether a proxy has been used. */
  is_proxy_used: boolean;
  created_at: string;
  updated_at: string;
}

/** The v3 proxy list stats (list composition) from `GET /api/v3/proxy/list/stats`. */
export interface ProxyListStats {
  available_countries: CountMap;
  ip_ranges_24: CountMap;
  ip_ranges_16: CountMap;
  ip_ranges_8: CountMap;
  available_ip_ranges_24: CountMap;
  available_ip_ranges_16: CountMap;
  available_ip_ranges_8: CountMap;
  /** `{asn_number: [asn_name, count]}` */
  asns: AsnMap;
  /** `{asn_number: [asn_name, count]}` */
  available_asns: AsnMap;
}

/** The v3 proxy list status from `GET /api/v3/proxy/list/status`. */
export interface ProxyListStatus {
  state: 'pending' | 'processing' | 'completed';
  countries: CountMap;
  unallocated_countries: CountMap;
  username: string;
  password: string;
  is_proxy_used: boolean;
}

export interface ProxyConfigGetParams {
  /** The plan to retrieve the config for. Required. */
  plan_id: number;
}

export interface ProxyConfigUpdateParams {
  /** Target a specific plan; otherwise the default plan is used. Sent as a query parameter. */
  plan_id?: number;
  /** Proxy username. Must be between 8-32 characters, alphanumeric. */
  username?: string;
  /** Proxy password. Must be between 8-32 characters, alphanumeric. */
  password?: string;
  /** Maximum number of seconds a proxy request can be used. Min 15 seconds, max 7 days. */
  request_timeout?: number;
  /** Maximum number of seconds a proxy request can stay idle. Min 15 seconds, max 2 hours. */
  request_idle_timeout?: number;
  /** Country codes served for IP authorization in backbone mode. Null means all countries. */
  ip_authorization_country_codes?: string[] | null;
  /** City for IP authorization geo targeting. Residential plans only. Null disables. */
  ip_authorization_city?: string | null;
  /**
   * State for IP authorization geo targeting. Mutually exclusive with the
   * other IP authorization geo filters. Null disables.
   */
  ip_authorization_state?: string | null;
  /**
   * Postal code for IP authorization geo targeting. Mutually exclusive with
   * the other IP authorization geo filters. Null disables.
   */
  ip_authorization_postalcode?: string | null;
  /** ASN for IP authorization targeting (`7922` or `AS7922`). Null disables. */
  ip_authorization_asn?: string | null;
  /** Cannot be edited for free proxy plans. */
  auto_replace_invalid_proxies?: boolean;
  /** Cannot be edited for free proxy plans. */
  auto_replace_low_country_confidence_proxies?: boolean;
  auto_replace_out_of_rotation_proxies?: boolean;
  auto_replace_failed_site_check_proxies?: boolean;
}

export interface AllocateUnallocatedCountriesParams {
  /**
   * Number of proxies by `country_code: count`. Country codes must be upper
   * case and counts greater than 0; totals must exactly match the number of
   * unallocated proxies.
   */
  new_countries: CountMap;
  /** Target a specific plan; otherwise the default plan is used. Sent as a query parameter. */
  plan_id?: number;
}

export class ProxyConfig extends APIResource {
  /** Retrieves the proxy config (v3 endpoint, no trailing slash). `plan_id` is required. */
  get(params: ProxyConfigGetParams, options?: RequestOptions): Promise<ProxyConfigV3> {
    return this._client.request({ method: 'GET', path: '/api/v3/proxy/config', query: { ...params } }, options);
  }

  /** Retrieves the proxy stats (v3): available countries, IP ranges and ASNs of the current proxy list. */
  getStats(params: ProxyConfigGetParams, options?: RequestOptions): Promise<ProxyListStats> {
    return this._client.request({ method: 'GET', path: '/api/v3/proxy/list/stats', query: { ...params } }, options);
  }

  /** Retrieves the proxy status (v3): list readiness state, allocated countries and proxy credentials. */
  getStatus(params: ProxyConfigGetParams, options?: RequestOptions): Promise<ProxyListStatus> {
    return this._client.request({ method: 'GET', path: '/api/v3/proxy/list/status', query: { ...params } }, options);
  }

  /** Updates the proxy config (v2 PATCH). Send only the fields to change. */
  update(params: ProxyConfigUpdateParams, options?: RequestOptions): Promise<ProxyConfigObject> {
    const { plan_id, ...body } = params;
    return this._client.request(
      { method: 'PATCH', path: '/api/v2/proxy/config/', query: { plan_id }, body },
      options,
    );
  }

  /**
   * Allocates the proxies in `unallocated_countries` state. All
   * `new_countries` must be valid and available.
   */
  allocateUnallocatedCountries(
    params: AllocateUnallocatedCountriesParams,
    options?: RequestOptions,
  ): Promise<ProxyConfigObject> {
    const { plan_id, ...body } = params;
    return this._client.request(
      { method: 'POST', path: '/api/v2/proxy/config/allocate_unallocated_countries/', query: { plan_id }, body },
      options,
    );
  }
}
