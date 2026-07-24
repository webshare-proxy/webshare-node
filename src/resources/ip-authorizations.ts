import type { RequestOptions } from '../client.js';
import type { Page } from '../pagination.js';
import { APIResource } from './base.js';

/** An IP authorization: the IP may connect to the proxies without credentials. */
export interface IPAuthorization {
  /** The unique ID of the IP authorization object. */
  id: number;
  /** The IP address authorized to connect to the proxies without username/password. */
  ip_address: string;
  /** The timestamp of when this instance was created (ISO 8601). */
  created_at: string;
  /** The timestamp when this IP address was last used. May be null. */
  last_used_at: string | null;
}

export interface IPAuthorizationListParams {
  /** Target a specific plan; otherwise the default plan is used. */
  plan_id?: number;
  /** Page number. */
  page?: number;
  /** Number of results per page. */
  page_size?: number;
}

export interface IPAuthorizationCreateParams {
  /** The IP address to authorize. May return a 400 error if already authorized in the system. */
  ip_address: string;
  /** Target a specific plan; otherwise the default plan is used. Sent as a query parameter. */
  plan_id?: number;
}

export interface IPAuthorizationScopeParams {
  /** Target a specific plan; otherwise the default plan is used. */
  plan_id?: number;
}

/** Response of the what's-my-IP endpoint. */
export interface WhatsMyIPResponse {
  ip_address: string;
}

export class IPAuthorizations extends APIResource {
  /** Lists IP authorizations in paginated format. */
  list(params?: IPAuthorizationListParams, options?: RequestOptions): Promise<Page<IPAuthorization>> {
    return this._client.requestPage('/api/v2/proxy/ipauthorization/', { ...params }, options);
  }

  /** Creates an IP authorization. */
  create(params: IPAuthorizationCreateParams, options?: RequestOptions): Promise<IPAuthorization> {
    const { plan_id, ...body } = params;
    return this._client.request(
      { method: 'POST', path: '/api/v2/proxy/ipauthorization/', query: { plan_id }, body },
      options,
    );
  }

  /** Retrieves an IP authorization. */
  get(id: number, params?: IPAuthorizationScopeParams, options?: RequestOptions): Promise<IPAuthorization> {
    return this._client.request(
      { method: 'GET', path: `/api/v2/proxy/ipauthorization/${id}/`, query: { ...params } },
      options,
    );
  }

  /** Deletes an IP authorization. */
  delete(id: number, params?: IPAuthorizationScopeParams, options?: RequestOptions): Promise<void> {
    return this._client.request(
      { method: 'DELETE', path: `/api/v2/proxy/ipauthorization/${id}/`, query: { ...params }, responseType: 'void' },
      options,
    );
  }

  /** Returns your public IP address. Useful for IP authorization purposes. */
  whatsMyIP(options?: RequestOptions): Promise<WhatsMyIPResponse> {
    return this._client.request({ method: 'GET', path: '/api/v2/proxy/ipauthorization/whatsmyip/' }, options);
  }
}
