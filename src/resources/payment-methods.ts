import type { RequestOptions } from '../client.js';
import type { Page } from '../pagination.js';
import { APIResource } from './base.js';

export type PaymentMethodBrand = 'mastercard' | 'amex' | 'visa' | 'diners club' | 'jcb' | 'unionpay';

/**
 * A payment method. Polymorphic on `type` (e.g. `StripeCard`, `LinkPayment`);
 * card-specific fields (`brand`, `last4`, `expiration_year`,
 * `expiration_month`) are present only for `StripeCard`.
 */
export interface PaymentMethod {
  /** Unique identifier of the payment method instance. */
  id: number;
  /** Payment type discriminator, e.g. `StripeCard`, `LinkPayment`. */
  type: string;
  /** Brand of the card (StripeCard only). */
  brand?: PaymentMethodBrand;
  /** Last 4 digits of the card (StripeCard only). */
  last4?: string;
  name?: string | null;
  /** Expiration year of the card (StripeCard only). */
  expiration_year?: number;
  /** Expiration month of the card (StripeCard only); 6 means June. */
  expiration_month?: number;
  created_at: string;
  updated_at: string;
  /** Billing address line. */
  line?: string;
  /** Billing address city. */
  city?: string;
  /** Billing address state. */
  state?: string | null;
  /** Billing address postal code. */
  postal_code?: string;
  /** Billing address country. */
  country?: string;
}

export interface PaymentMethodListParams {
  /** Page number. */
  page?: number;
  /** Number of results per page. */
  page_size?: number;
}

export interface PaymentMethodCreateParams {
  /** The recaptcha token (can be invisible recaptcha). */
  recaptcha: string;
}

/**
 * Response of the update-payment-method (SetupIntent) flow. Confirm
 * `stripe_client_secret` via Stripe.js, then poll the pending payment.
 */
export interface PaymentMethodCreateResponse {
  /** The ID of the PendingPayment instance. */
  pending_payment: number;
  /** The client_secret for the Stripe SetupIntent. */
  stripe_client_secret: string;
  /** The Stripe SetupIntent ID (per the documented response fields). */
  stripe_setup_intent?: string;
  /** Shown in the docs' example response instead of `stripe_setup_intent`; the docs are inconsistent. */
  stripe_payment_intent?: string;
}

export class PaymentMethods extends APIResource {
  /** Lists payment methods in paginated format. Polymorphic on `type`. */
  list(params?: PaymentMethodListParams, options?: RequestOptions): Promise<Page<PaymentMethod>> {
    return this._client.requestPage('/api/v2/payment/method/', { ...params }, options);
  }

  /**
   * Starts the update-payment-method flow (a Stripe SetupIntent, not a
   * charge). Requires recaptcha validation; the returned
   * `stripe_client_secret` must be confirmed via Stripe.js.
   */
  create(params: PaymentMethodCreateParams, options?: RequestOptions): Promise<PaymentMethodCreateResponse> {
    return this._client.request({ method: 'POST', path: '/api/v2/payment/method/', body: params }, options);
  }

  /** Retrieves a payment method by ID (the active one is on the subscription object). */
  get(id: number, options?: RequestOptions): Promise<PaymentMethod> {
    return this._client.request({ method: 'GET', path: `/api/v2/payment/method/${id}/` }, options);
  }
}
