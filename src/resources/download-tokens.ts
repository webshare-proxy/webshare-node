import type { RequestOptions } from '../client.js';
import { APIResource } from './base.js';

export type DownloadTokenScope = 'proxy_list' | 'replaced_proxy' | 'activity';

/** A download token used by the replaced-proxy and activity download endpoints. */
export interface DownloadToken {
  id: number;
  /** The token value; pass as the `download_token` query parameter. */
  key: string;
  scope: DownloadTokenScope;
  /** Expiration timestamp (ISO 8601). */
  expire_at: string;
}

export class DownloadTokens extends APIResource {
  /** Returns a download token for the given scope. */
  get(scope: DownloadTokenScope, options?: RequestOptions): Promise<DownloadToken> {
    return this._client.request({ method: 'GET', path: `/api/v2/download_token/${scope}/` }, options);
  }

  /** Resets (rotates) the download token for the given scope. */
  reset(scope: DownloadTokenScope, options?: RequestOptions): Promise<DownloadToken> {
    return this._client.request({ method: 'POST', path: `/api/v2/download_token/${scope}/reset/` }, options);
  }
}
