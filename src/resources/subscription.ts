import type { RequestOptions } from '../client.js';
import type { CountMap } from './shared.js';
import { APIResource } from './base.js';

export type SubscriptionPromoType =
  | 'first_time_value_off'
  | 'first_time_percent_off'
  | 'always_value_off'
  | 'always_percent_off';

export type ProxyType = 'free' | 'shared' | 'semidedicated' | 'dedicated';
export type ProxySubtype = 'default' | 'premium' | 'isp' | 'residential' | 'datacenter_and_isp';
export type SubscriptionTerm = 'monthly' | 'yearly';

/** The subscription singleton (one per account; its ID never changes). */
export interface SubscriptionObject {
  /** Unique identifier of the subscription instance. Should not change for the user. */
  id: number;
  /** Unique identifier of the active plan instance. Changes whenever the plan is re-customized. */
  plan: number;
  /** Unique identifier of the payment method. Null when auto-renewal is cancelled. */
  payment_method: number | null;
  /** Free credits available for the account in USD. */
  free_credits: number;
  /** Used to determine the amount to charge in the next renewal. */
  term: SubscriptionTerm;
  /** Start of the current renewal term. Always 30 days before `end_date`, even on yearly terms. */
  start_date: string;
  /** End of the current renewal term. */
  end_date: string;
  /** Number of 30 day renewals paid. Yearly terms pay for 12 renewals at once. */
  renewals_paid: number;
  /** Whether auto-renewal is enabled. */
  renewals_enabled: boolean;
  /** Number of times an automated renewal payment failed. */
  failed_payment_times: number;
  /** Discount percentage for the account. */
  account_discount_percentage: number;
  /** Whether the 25% off for renewals is available. */
  promotion_available_first_time_renewal_25_off: boolean;
  /** Whether the subscription is customizable (VIP accounts usually are not). */
  customizable: boolean;
  /** Whether the subscription is paused. */
  paused: boolean;
  /** When the subscription will be unpaused and resumed. May be null. */
  reactivation_date: string | null;
  /** The period left in the subscription while paused. May be null. */
  reactivation_period_left: string | null;
  /** The type of promotion this account will receive. May be null. */
  promo_type: SubscriptionPromoType | null;
  /** The value of the promotion (10 or 20). Null if `promo_type` is null. */
  promo_value: number | null;
  /** Whether the subscription is throttled (usually high bandwidth with few proxies). */
  throttled: boolean;
  /** Whether the subscription will renew at the end of the term. Observed on the live API but undocumented. */
  will_renew?: boolean;
  created_at: string;
  updated_at: string;
}

/** Asset availability for one proxy category/subtype. */
export interface AvailableAsset {
  /** The number of subnets available under the proxy category. */
  total_subnets: number;
  /** ISO 3166-1 alpha-2 country code to number of proxies available. */
  available_countries: CountMap;
}

/** Map of proxy category to map of proxy subtype to asset info. */
export type AvailableAssets = Record<string, Record<string, AvailableAsset>>;

export interface SubscriptionCustomizeParams {
  /** Category of proxies. */
  proxy_type?: ProxyType;
  /** Sub category of the proxies. */
  proxy_subtype?: ProxySubtype;
  /** Country code to count; `ZZ` means randomly allocated. Other customizations are based on this field. */
  proxy_countries?: CountMap;
  /** List of required site checks. */
  required_site_checks?: string[];
  /** Only use high quality IPs. Not available for residential plans. */
  high_quality_ips_only?: boolean;
  /** Target a specific plan; otherwise the default plan is used. Sent as a normal query parameter. */
  plan_id?: number;
}

/** The customization limits/options available for a plan. */
export interface SubscriptionCustomization {
  proxy_type: string;
  proxy_subtype: string;
  proxy_count_max: number;
  proxy_count_min: number;
  available_countries: CountMap;
  on_demand_refreshes_max: number;
  on_demand_refreshes_min: number;
  automatic_refresh_frequency_max: number;
  automatic_refresh_frequency_min: number;
  proxy_replacements_max: number;
  proxy_replacements_min: number;
  bandwidth_limit_max: number;
  bandwidth_limit_min: number;
  subusers_max: number;
  subusers_min: number;
  available_features: Array<{ feature: string; required?: boolean }>;
  available_site_checks: Array<{ name: string }>;
  terms: Array<{ term: SubscriptionTerm; renewals_paid: number }>;
}

/** The plan-shape fields shared by the pricing/purchase/upgrade endpoints. */
export interface PlanConfigurationParams {
  proxy_type?: ProxyType;
  proxy_subtype?: ProxySubtype;
  /** Country code to count; `ZZ` means randomly allocated. */
  proxy_countries?: CountMap;
  /** Bandwidth limit in GBs. 0 means unlimited bandwidth. */
  bandwidth_limit?: number;
  /** Number of on-demand refreshes purchased as part of this plan. */
  on_demand_refreshes_total?: number;
  /** Auto-refresh the proxy list every N seconds. 0 means no automatic refreshes. */
  automatic_refresh_frequency?: number;
  /** Individual proxy replacements purchased as part of this plan. */
  proxy_replacements_total?: number;
  /** Number of subusers allowed in this plan. */
  subusers_total?: number;
  is_unlimited_ip_authorizations?: boolean;
  is_high_concurrency?: boolean;
  is_2x_concurrency?: boolean;
  is_high_priority_network?: boolean;
  /** Only use high quality IPs (30% price premium). Not available for residential plans. */
  high_quality_ips_only?: boolean;
  /** List of required site checks. */
  required_site_checks?: string[];
  term?: SubscriptionTerm;
}

export interface SubscriptionPricingParams extends PlanConfigurationParams {
  /**
   * `replace` (default; only for single-plan subscriptions), `add`, or
   * `upgrade`.
   */
  behavior?: 'replace' | 'add' | 'upgrade';
  /** Include tax details in the response. Default false. */
  with_tax?: boolean;
  /** Target a specific plan; otherwise the default plan is used. Sent as a normal query parameter. */
  plan_id?: number;
}

/** The pricing breakdown for a custom plan. */
export interface SubscriptionPricing {
  /** Percentage of discount applied to the final price. */
  discount_percentage: number;
  /** Original price for the term before discounts. */
  non_discounted_price: number;
  /** The price after discounts are applied. */
  price: number;
  /** The amount which needs to be paid today (credits are applied to this). */
  paid_today: number;
  /** USD value of the promo discount applied to `price`. */
  promo_discount?: number;
  /** Credits added to the plan to make this subscription change. */
  credits_added: number;
  /** The total credits used to change the subscription. */
  credits_used: number;
  /** Discount tiers by proxy count; `from` exclusive, `to` inclusive (null = infinity). */
  proxy_count_discount_tiers: Array<{
    from: number;
    to: number | null;
    discount_percentage: number;
    per_proxy_price: number;
  }>;
  /** Per-GB price tiers; `from` exclusive, `to` inclusive (null = infinity). */
  bandwidth_discount_tiers: Array<{ from: number; to: number | null; per_gb_price: number | null }>;
  /** List of features and their prices. */
  features: Array<{ feature: string; is_selected: boolean; price: number }>;
  /** Tax entries when `with_tax` was true. */
  tax_breakdown?: Array<{
    amount: string;
    tax_rate_details: { percentage_decimal: string; tax_type: string };
    taxable_amount: string;
  }>;
  /** The coupon code currently applied to the user, or null when none. */
  coupon_discount?: {
    code: string;
    promo_type: 'percent_off' | 'value_off';
    promo_value: string;
    is_recurring: boolean;
  } | null;
}

/**
 * The shared response shape of purchase/upgrade/renew. When
 * `payment_required` is true, confirm the Stripe PaymentIntent with Stripe.js
 * and poll the pending payment.
 */
export interface CheckoutResponse {
  /** If false, the purchase is completed and the account has the new plan. */
  payment_required: boolean;
  /** The ID of the new Plan object. */
  plan: number;
  /** The ID of the PendingPayment instance. Only present if `payment_required` is true. */
  pending_payment?: number;
  /** The client_secret for the Stripe PaymentIntent. Only present if `payment_required` is true. */
  stripe_client_secret?: string;
  /** The Stripe PaymentIntent ID. Only present if `payment_required` is true. */
  stripe_payment_intent?: string;
  /** The Stripe PaymentMethod ID. Only present if `payment_required` is true. */
  stripe_payment_method?: string;
}

export interface SubscriptionPurchaseParams extends PlanConfigurationParams {
  /**
   * `replace` (default; only for single-plan subscriptions) or `add` (adds
   * the plan to the subscription).
   */
  behavior?: 'replace' | 'add';
  /**
   * Payment method: `null` uses the payment on file, a number is an existing
   * Webshare PaymentMethod ID, and a string is a new Stripe PaymentMethod ID
   * (usually `pm_...`).
   */
  payment_method?: number | string | null;
  /** The recaptcha token. Only required when a payment is required. */
  recaptcha?: string;
}

export interface SubscriptionRenewParams {
  /** The payment method to use; null uses the payment on file. */
  payment_method?: number | null;
  /** The term to renew. */
  term?: SubscriptionTerm;
  /** The recaptcha token. Only required when a payment is required. */
  recaptcha?: string;
}

export class Subscription extends APIResource {
  /** Returns the subscription object associated with the account. */
  get(options?: RequestOptions): Promise<SubscriptionObject> {
    return this._client.request({ method: 'GET', path: '/api/v2/subscription/' }, options);
  }

  /** Returns the available assets for each proxy category and subtype. */
  getAvailableAssets(options?: RequestOptions): Promise<AvailableAssets> {
    return this._client.request({ method: 'GET', path: '/api/v2/subscription/available_assets/' }, options);
  }

  /**
   * Returns the limits/options available to customize a plan. The API
   * JSON-encodes the request into a single `query` GET parameter; this method
   * hides that convention.
   */
  customize(params: SubscriptionCustomizeParams, options?: RequestOptions): Promise<SubscriptionCustomization> {
    const { plan_id, ...queryObject } = params;
    return this._client.request(
      {
        method: 'GET',
        path: '/api/v2/subscription/customize/',
        query: { query: JSON.stringify(queryObject), plan_id },
      },
      options,
    );
  }

  /**
   * Returns the pricing for a custom plan. The API JSON-encodes the request
   * into a single `query` GET parameter; this method hides that convention.
   */
  pricing(params: SubscriptionPricingParams, options?: RequestOptions): Promise<SubscriptionPricing> {
    const { plan_id, ...queryObject } = params;
    return this._client.request(
      {
        method: 'GET',
        path: '/api/v2/subscription/pricing/',
        query: { query: JSON.stringify(queryObject), plan_id },
      },
      options,
    );
  }

  /**
   * Purchases a new plan. Requires recaptcha only when a payment is required
   * (in which case the docs say to use the dashboard instead); when account
   * credits cover the change, no recaptcha or payment is needed.
   */
  purchase(params: SubscriptionPurchaseParams, options?: RequestOptions): Promise<CheckoutResponse> {
    return this._client.request(
      { method: 'POST', path: '/api/v2/subscription/checkout/purchase/', body: params },
      options,
    );
  }

  /** Renews the subscription; adds to `subscription.renewals_paid`. */
  renew(params: SubscriptionRenewParams, options?: RequestOptions): Promise<CheckoutResponse> {
    return this._client.request(
      { method: 'POST', path: '/api/v2/subscription/checkout/renew/', body: params },
      options,
    );
  }

  /**
   * Enables auto-renewal (PUT). A payment method must already be on file.
   * Not available for free plans.
   */
  enableAutoRenewal(options?: RequestOptions): Promise<SubscriptionObject> {
    return this._client.request({ method: 'PUT', path: '/api/v2/subscription/renewal/' }, options);
  }

  /**
   * Cancels auto-renewal (DELETE) and removes the payment method. Unlike most
   * DELETEs this returns 200 with the full subscription object.
   */
  cancelAutoRenewal(options?: RequestOptions): Promise<SubscriptionObject> {
    return this._client.request({ method: 'DELETE', path: '/api/v2/subscription/renewal/' }, options);
  }
}
