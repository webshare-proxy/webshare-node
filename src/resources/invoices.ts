import type { RequestOptions } from '../client.js';
import { APIResource } from './base.js';

export interface InvoiceDownloadParams {
  /** The unique identifier of the subscription transaction. */
  subscription_transaction_id: string;
}

export class Invoices extends APIResource {
  /**
   * Downloads the invoice as a PDF, returned as raw bytes. (Note: the path
   * has no trailing slash, unlike most endpoints.)
   */
  download(params: InvoiceDownloadParams, options?: RequestOptions): Promise<Uint8Array> {
    return this._client.request(
      { method: 'GET', path: '/api/v2/invoices/download', query: { ...params }, responseType: 'binary' },
      options,
    );
  }
}
