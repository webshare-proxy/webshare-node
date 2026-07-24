import type { RequestOptions } from '../client.js';
import type { Page } from '../pagination.js';
import { APIResource } from './base.js';

/** An API key. All API keys have the same permissions and full account access. */
export interface APIKey {
  /** The unique ID of the API key. */
  id: number;
  /** The 40 character alpha-numeric API key. */
  key: string;
  /** The label for this API key. May be duplicated across keys. */
  label: string;
  created_at: string;
  updated_at: string;
}

export interface APIKeyListParams {
  /** Page number. */
  page?: number;
  /** Number of results per page. */
  page_size?: number;
}

export interface APIKeyCreateParams {
  /** The label to assign to this API key. May be duplicated across keys. */
  label?: string;
}

export interface APIKeyUpdateParams {
  /** The label to assign to this API key. */
  label?: string;
}

export class APIKeys extends APIResource {
  /** Lists API keys in paginated format. */
  list(params?: APIKeyListParams, options?: RequestOptions): Promise<Page<APIKey>> {
    return this._client.requestPage('/api/v2/apikey/', { ...params }, options);
  }

  /** Creates an API key. The response is the only place the full `key` appears. */
  create(params: APIKeyCreateParams, options?: RequestOptions): Promise<APIKey> {
    return this._client.request({ method: 'POST', path: '/api/v2/apikey/', body: params }, options);
  }

  /** Retrieves an API key by ID. */
  get(id: number, options?: RequestOptions): Promise<APIKey> {
    return this._client.request({ method: 'GET', path: `/api/v2/apikey/${id}/` }, options);
  }

  /** Updates an API key. */
  update(id: number, params: APIKeyUpdateParams, options?: RequestOptions): Promise<APIKey> {
    return this._client.request({ method: 'PATCH', path: `/api/v2/apikey/${id}/`, body: params }, options);
  }

  /** Deletes an API key. */
  delete(id: number, options?: RequestOptions): Promise<void> {
    return this._client.request({ method: 'DELETE', path: `/api/v2/apikey/${id}/`, responseType: 'void' }, options);
  }
}
