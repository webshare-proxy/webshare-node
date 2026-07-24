import type { RequestOptions } from '../client.js';
import type { Page } from '../pagination.js';
import { APIResource } from './base.js';

export type PendingPaymentStatus = 'pending' | 'processing' | 'successful' | 'failed';

/** A payment that has been initiated (authorized) but not yet completed. */
export interface PendingPayment {
  /** Unique identifier of the pending payment object. */
  id: number;
  status: PendingPaymentStatus;
  /** User-friendly reason if the status is `failed`; otherwise null. */
  failure_reason: string | null;
  /** ID of the payment method. */
  payment_method: number;
  /** ID of the plan. */
  plan: number;
  /** Transaction reference; only set once the status is `successful`. */
  transaction: number | null;
  /** Whether the payment renews the subscription or immediately changes it. */
  is_renewal: boolean;
  /** Term of the payment. */
  term: 'monthly' | 'yearly';
  created_at: string;
  updated_at: string;
  /** When the payment completed. May be null. */
  completed_at: string | null;
}

export interface PendingPaymentListParams {
  /** Page number. */
  page?: number;
  /** Number of results per page. */
  page_size?: number;
}

export class PendingPayments extends APIResource {
  /** Lists pending payments in paginated format. */
  list(params?: PendingPaymentListParams, options?: RequestOptions): Promise<Page<PendingPayment>> {
    return this._client.requestPage('/api/v2/payment/pending/', { ...params }, options);
  }

  /** Returns a pending payment; poll after confirming a Stripe PaymentIntent. */
  get(id: number, options?: RequestOptions): Promise<PendingPayment> {
    return this._client.request({ method: 'GET', path: `/api/v2/payment/pending/${id}/` }, options);
  }
}
