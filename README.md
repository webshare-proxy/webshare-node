# Webshare Node.js SDK

Official Node.js/TypeScript SDK for the [Webshare](https://www.webshare.io) proxy API.

[![CI](https://github.com/webshare-proxy/webshare-node/actions/workflows/ci.yml/badge.svg)](https://github.com/webshare-proxy/webshare-node/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/webshare.svg)](https://www.npmjs.com/package/webshare)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

TypeScript-first, zero runtime dependencies, built on the global `fetch` (Node 20+).
Ships ESM and CommonJS builds with full type declarations.

## Install

```sh
npm install webshare
```

## Quickstart

```ts
import { Webshare } from "webshare";

const client = new Webshare(); // reads WEBSHARE_API_KEY from the environment
const page = await client.proxies.list({ mode: "direct" });
console.log(page.results[0]);
```

The snippet uses top-level `await`, which requires an ESM context (a `.mjs`
file or `"type": "module"` in package.json). In CommonJS, `require("webshare")`
works the same way inside an `async` function.

## Working with plans

Most proxy operations are scoped to a plan. When `plan_id` is omitted the API
falls back to the account's default plan, but the standard pattern is to list
your plans, pick the one you want, and pass its id explicitly:

```ts
const plans = await client.plans.list();
const plan = plans.results.find((p) => p.status === "active")!;

const proxies = await client.proxies.list({ mode: "direct", plan_id: plan.id });
const config = await client.proxyConfig.get({ plan_id: plan.id });
const url = client.proxies.downloadURL({
  token: config.proxy_list_download_token,
  plan_id: plan.id,
});
```

`plan_id` is accepted by the proxy list, proxy config/stats/status, download
URLs, IP authorizations, sub-users, stats and replacement APIs. The plan id is
also visible in the dashboard URL when viewing a plan. The active plan id for
the account is available as `subscription.plan` on `client.subscription.get()`.

## Key functions

| Function | Description |
|---|---|
| `client.plans.list()` | List your plans; the id of the plan you pick scopes most other calls. |
| `client.proxies.list({ mode, plan_id })` | List the proxies of a plan (paginated, async-iterable). |
| `client.proxies.download({ token, plan_id })` | Download the proxy list as `address:port:username:password` text. |
| `client.proxyConfig.get({ plan_id })` | Read a plan's proxy configuration (timeouts, IP-auth targeting, download token). |
| `client.stats.aggregate({ plan_id })` | Aggregate proxy usage stats for a period. |
| `buildProxyUrl(...)` | Pure helper that builds direct/backbone proxy connection URLs. |

See [REFERENCE.md](./REFERENCE.md) for every method.

## Authentication

Pass an API key explicitly, or set the `WEBSHARE_API_KEY` environment variable:

```ts
const client = new Webshare({ apiKey: "your-api-key" });
```

For short-lived credentials (e.g. OAuth tokens), plug in a credentials
provider; it is called once per request:

```ts
const client = new Webshare({ credentials: async () => refreshTokenSomehow() });
```

The constructor throws if no credential is available (an empty-string
`apiKey` is treated as absent). To use only endpoints that require no
authentication (`referral.getCodeInfo` and the tokenized download
endpoints), opt out explicitly with `new Webshare({ unauthenticated: true })`;
calling an authenticated endpoint on such a client throws a clear
client-side error. Operations the API documents as unauthenticated never
send the `Authorization` header, even on a credentialed client.

### Acting as a sub-user or federated user

`subuserId` sends the `X-Subuser` header (proxy config/list/stats/activity
masquerading); `federatedUserId` sends `X-Webshare-Federated-Access`
(admin-only). Both can be set on the client or per request:

```ts
const client = new Webshare({ subuserId: 7 });
await client.stats.aggregate(undefined, { subuserId: 9 }); // per-request override
```

## Pagination

Every `list` method returns a `Page<T>` exposing the raw envelope
(`results`, `count`, `next`, `previous`) plus `hasNextPage()` / `nextPage()`.
Pages are async-iterable and automatically follow the server's `next` URL
across page boundaries:

```ts
for await (const proxy of await client.proxies.list({ mode: "direct" })) {
  console.log(proxy.proxy_address);
}
```

This also works for the `starting_after`-style pagination used by
`client.proxyActivity.list()`.

## Error handling

All SDK errors extend `WebshareError`. API responses with non-2xx statuses
throw an `APIError` subclass by status: `BadRequestError` (400),
`AuthenticationError` (401), `PermissionDeniedError` (403), `NotFoundError`
(404), `RateLimitError` (429), `InternalServerError` (5xx). Transport
failures throw `APIConnectionError` / `APIConnectionTimeoutError`.

```ts
import { APIError, PermissionDeniedError } from "webshare";

try {
  await client.profile.get();
} catch (err) {
  if (err instanceof PermissionDeniedError && err.code === "account_suspended") {
    // the account is suspended; see the verification APIs
  } else if (err instanceof APIError) {
    console.error(err.status, err.detail, err.fieldErrors, err.requestID);
  }
}
```

`code` carries the API's machine-readable error code — with an API key you
may see `account_suspended` or `account_deleted` on any call. (If you plug in
a login token via a credentials provider, calls can also return 403
`2fa_needed`; completing the two-factor challenge is a dashboard/session
flow.) `fieldErrors` carries per-field validation messages,
`requestID` echoes the `X-Request-ID` response header, and `retryAfter`
exposes the parsed `Retry-After` header in seconds (useful to self-throttle
calls the SDK does not retry). A 2xx response whose body cannot be decoded
throws `ResponseDecodeError`.

## Retries and timeouts

Failed requests are retried up to `maxRetries` times (default 2) with
exponential backoff and full jitter, on connection errors, timeouts, 408,
429 and 5xx responses. A `Retry-After` response header is honored (capped at
60 seconds). Only idempotent requests (GET/PUT/DELETE) are retried by
default; opt in for POST/PATCH with `retryNonIdempotent` on the client or per
request. Note for multipart endpoints: in-memory `File`/`Blob` uploads are
safely re-sent on retry, but stream-backed blobs (e.g. `fs.openAsBlob()`)
may not be replayable — avoid `retryNonIdempotent` with those.

`timeout` bounds a single HTTP attempt (default 60 seconds), including
reading the response body; the total call time may exceed it when retries
and `Retry-After` waits apply. Every method accepts per-request options as
its final argument:

```ts
await client.proxies.list(
  { mode: "direct" },
  { timeout: 10_000, maxRetries: 0, headers: { "X-Trace": "1" }, signal: abortController.signal },
);
```

Other client options: `baseURL` (default `https://proxy.webshare.io`),
`fetch` (custom fetch implementation), `defaultHeaders`.

## Request identification

Every request carries an `X-Webshare-Source` header identifying the SDK and
runtime only (e.g. `WebshareSDK/0.1.0 (Node; 22.14.0)`) — no user data. Tools
built on the SDK can replace the whole value with the `source` client option;
per-request headers take precedence as usual.

## Proxy connection helper

`buildProxyUrl` is a pure helper that builds proxy connection URLs for both
connection modes, including the backbone username parameter grammar
(countries, city, sticky sessions, rotation):

```ts
import { buildProxyUrl } from "webshare";

buildProxyUrl({ mode: "direct", username: "user", password: "pass", proxyAddress: "1.2.3.4", port: 8168 });
// "http://user:pass@1.2.3.4:8168"

buildProxyUrl({ mode: "backbone", username: "user", password: "pass", countryCodes: ["us"], session: 1234 });
// "http://user-us-1234:pass@p.webshare.io:80"

buildProxyUrl({ mode: "direct", proxyAddress: "1.2.3.4", port: 8168 });
// "http://1.2.3.4:8168"  (IP authorization: no credentials)
```

Invalid combinations (e.g. `session` together with `rotate`, malformed
country codes) throw a `WebshareError`.

`buildProxyListDownloadUrl` (also available as
`client.proxies.downloadURL(...)`) builds the unauthenticated proxy list
download URL; `client.proxies.download(...)` fetches it and returns the plain
text `address:port:username:password` lines. The invoice download returns PDF
bytes as a `Uint8Array`.

## Resources

The client mirrors the API's resource groups: `proxies`, `proxyConfig`,
`proxyReplacements`, `replacedProxies`, `stats`, `proxyActivity`,
`downloadTokens`, `ipAuthorizations`, `subusers`, `profile`,
`notifications`, `idVerification`, `verification` (with nested `flows`,
`questions`, `appeals`, `abuseReports`), `billing`, `paymentMethods`,
`pendingPayments`, `transactions`, `subscription`, `plans`, `invoices` and
`referral`. See the [API documentation](https://apidocs.webshare.io) for
endpoint semantics.

Runnable examples live in [`examples/`](./examples) (`npx tsx examples/list-proxies.ts`).

## Supported versions

| SDK | Node.js |
|---|---|
| webshare 0.x | 20, 22, 24 |

## License

[MIT](./LICENSE). Issues and pull requests are welcome.
