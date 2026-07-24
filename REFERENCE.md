# API reference

Every public method of the `webshare` SDK, grouped by resource. Each entry
links to the official API documentation page it implements. See the
[README](./README.md) for concepts (authentication, pagination, retries,
errors) and the plans-first usage pattern: list plans with
`client.plans.list()` and pass the chosen `plan_id` to plan-scoped calls.

All methods accept an optional final `options` argument
([per-request options](#per-request-options)). Paginated methods return
[`Page<T>`](#paget).

## client.proxies

| Method | Description | Docs |
|---|---|---|
| `client.proxies.list({ mode, plan_id?, ... })` | List the proxies of a plan (paginated; `mode` required). | [docs](https://apidocs.webshare.io/proxy-list/list) |
| `client.proxies.refresh({ plan_id? }?)` | Refresh the proxy list on demand. | [docs](https://apidocs.webshare.io/proxy-list/ondemand_refresh) |
| `client.proxies.download({ token, plan_id?, ... })` | Download the proxy list as `address:port:username:password` text. | [docs](https://apidocs.webshare.io/proxy-list/download) |
| `client.proxies.downloadURL({ token, plan_id?, ... })` | Build the unauthenticated proxy list download URL without fetching it. | [docs](https://apidocs.webshare.io/proxy-list/download) |

## client.proxyConfig

| Method | Description | Docs |
|---|---|---|
| `client.proxyConfig.get({ plan_id })` | Read a plan's proxy configuration (v3). | [docs](https://apidocs.webshare.io/proxy-config/get_proxy_config) |
| `client.proxyConfig.getStats({ plan_id })` | Read the proxy list composition: countries, IP ranges, ASNs (v3). | [docs](https://apidocs.webshare.io/proxy-config/get_proxy_stats) |
| `client.proxyConfig.getStatus({ plan_id })` | Read the proxy list readiness state and credentials (v3). | [docs](https://apidocs.webshare.io/proxy-config/get_proxy_status) |
| `client.proxyConfig.update({ plan_id?, ... })` | Update the proxy configuration (partial). | [docs](https://apidocs.webshare.io/proxy-config/update) |
| `client.proxyConfig.allocateUnallocatedCountries({ new_countries, plan_id? })` | Allocate proxies stuck in `unallocated_countries`. | [docs](https://apidocs.webshare.io/proxy-config/allocate_unallocated_countries) |

## client.proxyReplacements

| Method | Description | Docs |
|---|---|---|
| `client.proxyReplacements.list(params?)` | List proxy replacement requests (paginated). | [docs](https://apidocs.webshare.io/proxy-replacement/proxy_replacement/proxy_replacement_list) |
| `client.proxyReplacements.create({ to_replace, replace_with, dry_run?, plan_id? })` | Create an asynchronous proxy replacement; poll `get` until completed. | [docs](https://apidocs.webshare.io/proxy-replacement/proxy_replacement/proxy_replacement_create) |
| `client.proxyReplacements.get(id, { plan_id? }?)` | Get a proxy replacement (poll its `state`). | [docs](https://apidocs.webshare.io/proxy-replacement/proxy_replacement/proxy_replacement_retrieve) |

## client.replacedProxies

| Method | Description | Docs |
|---|---|---|
| `client.replacedProxies.list(params?)` | List replaced proxies (paginated). | [docs](https://apidocs.webshare.io/proxy-replacement/replaced_proxy/list_replaced_proxy) |
| `client.replacedProxies.download({ download_token, ... })` | Download replaced proxies as text (token scope `replaced_proxy`). | [docs](https://apidocs.webshare.io/proxy-replacement/replaced_proxy/download) |

## client.stats

| Method | Description | Docs |
|---|---|---|
| `client.stats.list(params?)` | List hourly proxy usage stats (bare array, not paginated). | [docs](https://apidocs.webshare.io/proxystats/list_stats) |
| `client.stats.aggregate(params?)` | Aggregate proxy usage stats for a period. | [docs](https://apidocs.webshare.io/proxystats/aggregate) |

## client.proxyActivity

| Method | Description | Docs |
|---|---|---|
| `client.proxyActivity.list(params?)` | List proxy activity (paginated via `starting_after`). | [docs](https://apidocs.webshare.io/proxystats/list_activity) |
| `client.proxyActivity.download({ download_token, ... })` | Download proxy activity as CSV text (token scope `activity`). | [docs](https://apidocs.webshare.io/proxystats/download_activity) |

## client.downloadTokens

| Method | Description | Docs |
|---|---|---|
| `client.downloadTokens.get(scope)` | Get the download token for a scope (`proxy_list`, `replaced_proxy`, `activity`). | [docs](https://apidocs.webshare.io/downloads/get_download_token) |
| `client.downloadTokens.reset(scope)` | Rotate the download token for a scope. | [docs](https://apidocs.webshare.io/downloads/reset_download_token) |

## client.ipAuthorizations

| Method | Description | Docs |
|---|---|---|
| `client.ipAuthorizations.list(params?)` | List IP authorizations (paginated). | [docs](https://apidocs.webshare.io/ipauthorization/list) |
| `client.ipAuthorizations.create({ ip_address, plan_id? })` | Authorize an IP address to use the proxies without credentials. | [docs](https://apidocs.webshare.io/ipauthorization/create) |
| `client.ipAuthorizations.get(id, { plan_id? }?)` | Get an IP authorization. | [docs](https://apidocs.webshare.io/ipauthorization/retrieve) |
| `client.ipAuthorizations.delete(id, { plan_id? }?)` | Delete an IP authorization. | [docs](https://apidocs.webshare.io/ipauthorization/delete) |
| `client.ipAuthorizations.whatsMyIP()` | Return your public IP address. | [docs](https://apidocs.webshare.io/ipauthorization/whatsmyip) |

## client.subusers

| Method | Description | Docs |
|---|---|---|
| `client.subusers.list(params?)` | List sub-users (paginated). | [docs](https://apidocs.webshare.io/subuser/list) |
| `client.subusers.create(params)` | Create a sub-user. | [docs](https://apidocs.webshare.io/subuser/create) |
| `client.subusers.get(id, { plan_id? }?)` | Get a sub-user. | [docs](https://apidocs.webshare.io/subuser/retrieve) |
| `client.subusers.update(id, params)` | Update a sub-user (partial). | [docs](https://apidocs.webshare.io/subuser/update) |
| `client.subusers.delete(id, { plan_id? }?)` | Delete a sub-user. | [docs](https://apidocs.webshare.io/subuser/delete) |
| `client.subusers.refreshProxyList(id)` | Refresh a sub-user's custom proxy list. | [docs](https://apidocs.webshare.io/subuser/refresh_proxy_list) |

## client.profile

| Method | Description | Docs |
|---|---|---|
| `client.profile.get()` | Get the user profile. | [docs](https://apidocs.webshare.io/userprofile/retrieve) |
| `client.profile.update(params)` | Update the user profile (partial). | [docs](https://apidocs.webshare.io/userprofile/update) |
| `client.profile.getPreferences()` | Get the user preferences. | [docs](https://apidocs.webshare.io/userprofile/retrivePreferences) |
| `client.profile.updatePreferences(params)` | Update the user preferences (any subset). | [docs](https://apidocs.webshare.io/userprofile/updatePreferences) |

## client.notifications

| Method | Description | Docs |
|---|---|---|
| `client.notifications.list(params?)` | List account notifications (paginated). | [docs](https://apidocs.webshare.io/notifications/list) |
| `client.notifications.get(id)` | Get a notification. | [docs](https://apidocs.webshare.io/notifications/retrieve) |
| `client.notifications.dismiss(id)` | Dismiss a notification. | [docs](https://apidocs.webshare.io/notifications/dismiss) |
| `client.notifications.restore(id)` | Restore a dismissed notification. | [docs](https://apidocs.webshare.io/notifications/restore) |

## client.idVerification

| Method | Description | Docs |
|---|---|---|
| `client.idVerification.get()` | Get the ID verification state. | [docs](https://apidocs.webshare.io/idverification/retrieve) |

## client.verification

| Method | Description | Docs |
|---|---|---|
| `client.verification.flows.list(params?)` | List account verification flows (paginated). | [docs](https://apidocs.webshare.io/verification/list) |
| `client.verification.flows.get(id)` | Get a verification flow. | [docs](https://apidocs.webshare.io/verification/retrieve) |
| `client.verification.flows.submitEvidence(id, { explanation?, files? })` | Submit evidence (multipart). | [docs](https://apidocs.webshare.io/verification/submit_evidence) |
| `client.verification.flows.submitSecurityCode(id, { security_code })` | Submit the bank-statement security code. | [docs](https://apidocs.webshare.io/verification/submit_security_code) |
| `client.verification.questions.list(params?)` | List compliance questions (paginated). | [docs](https://apidocs.webshare.io/verification/list_questions) |
| `client.verification.questions.submitAnswer(questionId, { answer?, files? })` | Answer a question (multipart). | [docs](https://apidocs.webshare.io/verification/submit_answer) |
| `client.verification.appeals.list(params?)` | List suspension appeals (paginated). | [docs](https://apidocs.webshare.io/verification/list_appeals) |
| `client.verification.appeals.create({ appeal })` | Submit a suspension appeal. | [docs](https://apidocs.webshare.io/verification/submit_appeal) |
| `client.verification.abuseReports.list(params?)` | List abuse reports (paginated). | [docs](https://apidocs.webshare.io/verification/list_abuse_reports) |
| `client.verification.getSuspension()` | Get the suspension record (works while suspended). | [docs](https://apidocs.webshare.io/verification/view_suspension) |
| `client.verification.getCategories()` | Get verification categories (map keyed by category). | [docs](https://apidocs.webshare.io/verification/categories) |
| `client.verification.getLimits()` | Get the account's proxy limit state. | [docs](https://apidocs.webshare.io/verification/limits) |
| `client.verification.getThresholds()` | Get verification thresholds (map keyed by category). | [docs](https://apidocs.webshare.io/verification/thresholds) |

## client.billing

| Method | Description | Docs |
|---|---|---|
| `client.billing.getInfo()` | Get the billing information singleton. | [docs](https://apidocs.webshare.io/billing/billing) |
| `client.billing.updateInfo(params)` | Update the billing information. | [docs](https://apidocs.webshare.io/billing/billing) |

## client.paymentMethods

| Method | Description | Docs |
|---|---|---|
| `client.paymentMethods.list(params?)` | List payment methods (paginated; polymorphic on `type`). | [docs](https://apidocs.webshare.io/billing/payment_methods) |
| `client.paymentMethods.get(id)` | Get a payment method. | [docs](https://apidocs.webshare.io/billing/payment_methods) |

## client.pendingPayments

| Method | Description | Docs |
|---|---|---|
| `client.pendingPayments.list(params?)` | List pending payments (paginated). | [docs](https://apidocs.webshare.io/billing/pending_payments) |
| `client.pendingPayments.get(id)` | Get a pending payment (poll after Stripe confirm). | [docs](https://apidocs.webshare.io/billing/pending_payments) |

## client.transactions

| Method | Description | Docs |
|---|---|---|
| `client.transactions.list(params?)` | List transactions (paginated). | [docs](https://apidocs.webshare.io/billing/transactions) |
| `client.transactions.get(id)` | Get a transaction. | [docs](https://apidocs.webshare.io/billing/transactions) |

## client.subscription

| Method | Description | Docs |
|---|---|---|
| `client.subscription.get()` | Get the subscription singleton (its `plan` is the active plan id). | [docs](https://apidocs.webshare.io/subscription) |
| `client.subscription.getAvailableAssets()` | Get available assets per proxy category/subtype. | [docs](https://apidocs.webshare.io/subscription/assets) |
| `client.subscription.customize(params)` | Get customization limits/options for a plan. | [docs](https://apidocs.webshare.io/subscription/customize) |
| `client.subscription.pricing(params)` | Get pricing for a custom plan. | [docs](https://apidocs.webshare.io/subscription/pricing) |
| `client.subscription.enableAutoRenewal()` | Enable auto-renewal (PUT). | [docs](https://apidocs.webshare.io/subscription/auto_renewal) |
| `client.subscription.cancelAutoRenewal()` | Cancel auto-renewal (DELETE; returns the subscription). | [docs](https://apidocs.webshare.io/subscription/auto_renewal) |

## client.plans

| Method | Description | Docs |
|---|---|---|
| `client.plans.list(params?)` | List all plans, including cancelled ones (paginated). | [docs](https://apidocs.webshare.io/subscription/plan) |
| `client.plans.get(id)` | Get a plan. | [docs](https://apidocs.webshare.io/subscription/plan) |
| `client.plans.update(id, { automatic_refresh_next_at? })` | Update a plan (only `automatic_refresh_next_at`). | [docs](https://apidocs.webshare.io/subscription/plan) |
| `client.plans.cancel(id)` | Cancel a plan (credits the subscription). | [docs](https://apidocs.webshare.io/subscription/plan) |

## client.invoices

| Method | Description | Docs |
|---|---|---|
| `client.invoices.download({ subscription_transaction_id })` | Download an invoice as PDF bytes (`Uint8Array`). | [docs](https://apidocs.webshare.io/subscription/download_invoice) |

## client.referral

| Method | Description | Docs |
|---|---|---|
| `client.referral.getConfig()` | Get the referral/affiliate config. | [docs](https://apidocs.webshare.io/referral) |
| `client.referral.updateConfig(params)` | Update the referral config (`mode`, `paypal_payout_email`). | [docs](https://apidocs.webshare.io/referral) |
| `client.referral.getCouponCode()` | Get the applied coupon code (fields null when none). | [docs](https://apidocs.webshare.io/referral/coupon_code) |
| `client.referral.applyCouponCode({ code })` | Apply a coupon code (5/min rate limit). | [docs](https://apidocs.webshare.io/referral/coupon_code) |
| `client.referral.removeCouponCode()` | Remove the applied coupon code. | [docs](https://apidocs.webshare.io/referral/coupon_code) |
| `client.referral.listChannels()` | List owned referral channels (bare array, not paginated). | [docs](https://apidocs.webshare.io/referral/referral_channel) |
| `client.referral.listCredits(params?)` | List referral credits (paginated). | [docs](https://apidocs.webshare.io/referral/referral_credit) |
| `client.referral.getCredit(id)` | Get a referral credit. | [docs](https://apidocs.webshare.io/referral/referral_credit) |
| `client.referral.listEarnouts(params?)` | List earn-outs (paginated). | [docs](https://apidocs.webshare.io/referral/referral_earnout) |
| `client.referral.getEarnout(id)` | Get an earn-out. | [docs](https://apidocs.webshare.io/referral/referral_earnout) |
| `client.referral.getCodeInfo({ referral_code })` | Get public info about a referral code (unauthenticated). | [docs](https://apidocs.webshare.io/referral/referral_info) |

## Client options

`new Webshare(options)` accepts: `apiKey` (default `WEBSHARE_API_KEY` env),
`credentials` (provider called per attempt), `unauthenticated` (opt out of
credentials; unauthenticated endpoints only), `baseURL` (default
`https://proxy.webshare.io`), `timeout` (per-attempt, default 60s),
`maxRetries` (default 2), `fetch`, `defaultHeaders`, `subuserId`
(`X-Subuser`), `federatedUserId` (`X-Webshare-Federated-Access`),
`retryNonIdempotent`, `source` (`X-Webshare-Source` value).

## Per-request options

Every method takes a final options argument:
`{ timeout, headers, maxRetries, subuserId, federatedUserId, signal, retryNonIdempotent }`.

## Error classes

`WebshareError` (base) — `APIError` (`status`, `code`, `requestID`, `detail`,
`fieldErrors`, `retryAfter`, `body`) with per-status subclasses
`BadRequestError` (400), `AuthenticationError` (401), `PermissionDeniedError`
(403), `NotFoundError` (404), `RateLimitError` (429), `InternalServerError`
(5xx) — `ResponseDecodeError` (undecodable 2xx body) —
`APIConnectionError` / `APIConnectionTimeoutError` (transport).

## Page&lt;T&gt;

Returned by every paginated `list` method: `results`, `count`, `next`,
`previous`, `hasNextPage()`, `nextPage()`, and `AsyncIterable<T>` support
that yields items across all pages by following the envelope `next` URL.

## Helpers

| Function | Description | Docs |
|---|---|---|
| `buildProxyUrl(options)` | Build direct/backbone proxy connection URLs (country/city/session/rotate username grammar, IP-auth mode). | [docs](https://apidocs.webshare.io/proxy-connection) |
| `buildProxyListDownloadUrl(options)` | Build the unauthenticated, path-style proxy list download URL. | [docs](https://apidocs.webshare.io/proxy-list/download) |
