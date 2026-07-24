export { Webshare, VERSION } from './client.js';
export type { ClientOptions, CredentialsProvider, Fetch, RequestOptions } from './client.js';

export {
  WebshareError,
  APIError,
  BadRequestError,
  AuthenticationError,
  PermissionDeniedError,
  NotFoundError,
  RateLimitError,
  InternalServerError,
  ResponseDecodeError,
  APIConnectionError,
  APIConnectionTimeoutError,
} from './error.js';

export { Page } from './pagination.js';
export type { PageEnvelope } from './pagination.js';

export { buildProxyUrl, buildProxyListDownloadUrl, BACKBONE_HOST } from './proxy-url.js';
export type { ProxyUrlOptions, ProxyListDownloadUrlOptions } from './proxy-url.js';

export type { AsnMap, CountMap, StatsErrorReason, AggregateStats } from './resources/shared.js';

export { Proxies } from './resources/proxies.js';
export type { Proxy, ProxyListParams, ProxyRefreshParams, ProxyListDownloadParams } from './resources/proxies.js';

export { ProxyConfig } from './resources/proxy-config.js';
export type {
  ProxyConfigV3,
  ProxyConfigObject,
  ProxyListStats,
  ProxyListStatus,
  ProxyConfigGetParams,
  ProxyConfigUpdateParams,
  AllocateUnallocatedCountriesParams,
} from './resources/proxy-config.js';

export { ProxyReplacements } from './resources/proxy-replacements.js';
export type {
  ProxyReplacement,
  ProxyReplacementState,
  ProxyReplacementReason,
  ToReplace,
  ReplaceWith,
  ProxyReplacementListParams,
  ProxyReplacementCreateParams,
  ProxyReplacementGetParams,
} from './resources/proxy-replacements.js';

export { ReplacedProxies } from './resources/replaced-proxies.js';
export type {
  ReplacedProxy,
  ReplacedProxyReason,
  ReplacedProxyListParams,
  ReplacedProxyDownloadParams,
} from './resources/replaced-proxies.js';

export { Stats } from './resources/stats.js';
export type { ProxyStat, StatsListParams, StatsAggregateParams } from './resources/stats.js';

export { ProxyActivity } from './resources/proxy-activity.js';
export type {
  ProxyActivityRecord,
  ProxyActivityListParams,
  ProxyActivityDownloadParams,
} from './resources/proxy-activity.js';

export { DownloadTokens } from './resources/download-tokens.js';
export type { DownloadToken, DownloadTokenScope } from './resources/download-tokens.js';

export { IPAuthorizations } from './resources/ip-authorizations.js';
export type {
  IPAuthorization,
  IPAuthorizationListParams,
  IPAuthorizationCreateParams,
  IPAuthorizationScopeParams,
  WhatsMyIPResponse,
} from './resources/ip-authorizations.js';

export { Subusers } from './resources/subusers.js';
export type {
  Subuser,
  SubuserListParams,
  SubuserCreateParams,
  SubuserUpdateParams,
  SubuserScopeParams,
} from './resources/subusers.js';

export { Profile } from './resources/profile.js';
export type {
  UserProfile,
  ProfileUpdateParams,
  UserPreferences,
  PreferencesUpdateParams,
} from './resources/profile.js';

export { Notifications } from './resources/notifications.js';
export type { Notification, NotificationListParams } from './resources/notifications.js';

export { IDVerification } from './resources/id-verification.js';
export type { IDVerificationObject, IDVerificationState } from './resources/id-verification.js';

export {
  Verification,
  VerificationFlows,
  VerificationQuestions,
  VerificationAppeals,
  VerificationAbuseReports,
} from './resources/verification.js';
export type {
  VerificationFlow,
  VerificationFlowType,
  VerificationFlowState,
  VerificationFile,
  VerificationEvidence,
  Uploadable,
  SubmitEvidenceParams,
  SubmitSecurityCodeParams,
  VerificationAnswer,
  VerificationQuestion,
  VerificationQuestionListParams,
  SubmitAnswerParams,
  VerificationAppeal,
  VerificationAppealState,
  VerificationAppealListParams,
  VerificationAppealCreateParams,
  VerificationAbuseReport,
  VerificationAbuseReportListParams,
  VerificationSuspension,
  VerificationCategory,
  VerificationLimits,
  VerificationThreshold,
} from './resources/verification.js';

export { Billing } from './resources/billing.js';
export type { BillingInfo, BillingInfoUpdateParams } from './resources/billing.js';

export { PaymentMethods } from './resources/payment-methods.js';
export type {
  PaymentMethod,
  PaymentMethodBrand,
  PaymentMethodListParams,
} from './resources/payment-methods.js';

export { PendingPayments } from './resources/pending-payments.js';
export type { PendingPayment, PendingPaymentStatus, PendingPaymentListParams } from './resources/pending-payments.js';

export { Transactions } from './resources/transactions.js';
export type { Transaction, TransactionPaymentMethod, TransactionListParams } from './resources/transactions.js';

export { Subscription } from './resources/subscription.js';
export type {
  SubscriptionObject,
  SubscriptionPromoType,
  SubscriptionTerm,
  ProxyType,
  ProxySubtype,
  AvailableAsset,
  AvailableAssets,
  SubscriptionCustomizeParams,
  SubscriptionCustomization,
  PlanConfigurationParams,
  SubscriptionPricingParams,
  SubscriptionPricing,
} from './resources/subscription.js';

export { Plans } from './resources/plans.js';
export type {
  Plan,
  PlanListParams,
  PlanUpdateParams,
  PlanCancelResponse,
} from './resources/plans.js';

export { Invoices } from './resources/invoices.js';
export type { InvoiceDownloadParams } from './resources/invoices.js';

export { Referral } from './resources/referral.js';
export type {
  ReferralConfig,
  ReferralConfigUpdateParams,
  ReferralPromoType,
  CouponPromoType,
  CouponCode,
  CouponCodeApplyParams,
  ReferralChannel,
  ReferralCredit,
  ReferralCreditListParams,
  ReferralEarnout,
  ReferralEarnoutListParams,
  ReferralCodeInfo,
  ReferralCodeInfoParams,
} from './resources/referral.js';

import { Webshare } from './client.js';
export default Webshare;
