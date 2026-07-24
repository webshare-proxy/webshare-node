import type { RequestOptions } from '../client.js';
import { APIResource } from './base.js';

/** The billing information singleton (one per account). */
export interface BillingInfo {
  /** Unique identifier of the billing information instance. */
  id: number;
  /** Name for the invoices. Can be a company name. Default is empty string. */
  name: string;
  /** Address for the invoices. Can be a corporate address. Default is empty string. */
  address: string;
  /** Email address for the invoices. Default is empty string. */
  billing_email: string;
  created_at: string;
  updated_at: string;
}

export interface BillingInfoUpdateParams {
  /** Name for the invoices. */
  name?: string;
  /** Address for the invoices. */
  address?: string;
  /** Email address for the invoices. */
  billing_email?: string;
}

export class Billing extends APIResource {
  /** Returns the billing information object associated with the account. */
  getInfo(options?: RequestOptions): Promise<BillingInfo> {
    return this._client.request({ method: 'GET', path: '/api/v2/subscription/billing_info/' }, options);
  }

  /** Updates the billing information object associated with the account. */
  updateInfo(params: BillingInfoUpdateParams, options?: RequestOptions): Promise<BillingInfo> {
    return this._client.request(
      { method: 'PATCH', path: '/api/v2/subscription/billing_info/', body: params },
      options,
    );
  }
}
