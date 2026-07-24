import type { RequestOptions } from '../client.js';
import type { Page } from '../pagination.js';
import { APIResource } from './base.js';

/** The payment method summary nested in a transaction. */
export interface TransactionPaymentMethod {
  id: number;
  brand: string;
  last4: string;
  name: string | null;
  expiration_year: number;
  expiration_month: number;
  created_at: string;
  updated_at: string;
}

/** A completed (or refunded) transaction. Failures live on pending payments. */
export interface Transaction {
  /** Unique identifier of the transaction instance. */
  id: number;
  /** Partial refunds also show up as `refunded`. */
  status: 'completed' | 'refunded';
  /** Nested payment method instance. */
  payment_method: TransactionPaymentMethod;
  /** The reason of this transaction. */
  reason: string;
  /** The amount of the transaction in USD. */
  amount: number;
  /** The credits used in the transaction. */
  credits_used: number;
  /** The credits gained in the transaction (in case of downgrading). */
  credits_gained: number;
  /** The amount refunded in USD. */
  refund_amount: number;
  /** The date the last refund was issued. May be null. */
  refund_date: string | null;
  /** Line items of the transaction. Observed on the live API (as null) but undocumented. */
  line_items?: unknown[] | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionListParams {
  /** Page number. */
  page?: number;
  /** Number of results per page. */
  page_size?: number;
}

export class Transactions extends APIResource {
  /** Lists transactions in paginated format. */
  list(params?: TransactionListParams, options?: RequestOptions): Promise<Page<Transaction>> {
    return this._client.requestPage('/api/v2/payment/transaction/', { ...params }, options);
  }

  /** Retrieves a transaction by ID. */
  get(id: number, options?: RequestOptions): Promise<Transaction> {
    return this._client.request({ method: 'GET', path: `/api/v2/payment/transaction/${id}/` }, options);
  }
}
