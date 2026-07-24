// ESM + TypeScript consumer smoke test: verifies the package's exports map,
// shipped type declarations (tsc --strict) and basic runtime behavior.
import WebshareDefault, {
  Webshare,
  Page,
  APIError,
  NotFoundError,
  WebshareError,
  buildProxyUrl,
  buildProxyListDownloadUrl,
} from 'webshare';
import type { ClientOptions, Proxy, ProxyListParams, RequestOptions, SubscriptionObject } from 'webshare';

const options: ClientOptions = { apiKey: 'smoke-key', maxRetries: 1, timeout: 5_000 };
const client = new Webshare(options);

// Type-level checks; never executed at runtime.
async function typeChecks(): Promise<void> {
  const params: ProxyListParams = { mode: 'backbone', page_size: 10 };
  const requestOptions: RequestOptions = { timeout: 1_000, subuserId: 7 };
  const page: Page<Proxy> = await client.proxies.list(params, requestOptions);
  for await (const proxy of page) {
    const id: string = proxy.id;
    const address: string | null = proxy.proxy_address;
    void id;
    void address;
  }
  const subscription: SubscriptionObject = await client.subscription.get();
  void subscription.free_credits;
  const pdf: Uint8Array = await client.invoices.download({ subscription_transaction_id: '1' });
  void pdf;
}
void typeChecks;

if (WebshareDefault !== Webshare) throw new Error('default export should be the Webshare class');
if (typeof client.proxies.list !== 'function') throw new Error('client.proxies.list missing');
if (typeof client.referral.getCodeInfo !== 'function') throw new Error('client.referral.getCodeInfo missing');

const url = buildProxyUrl({ mode: 'backbone', username: 'u', password: 'p', countryCodes: ['us'], session: 42 });
if (url !== 'http://u-us-42:p@p.webshare.io:80') throw new Error(`unexpected proxy url: ${url}`);

const downloadUrl = buildProxyListDownloadUrl({ token: 't' });
if (!downloadUrl.includes('/api/v2/proxy/list/download/t/')) throw new Error(`unexpected download url: ${downloadUrl}`);

const err = new NotFoundError(404, 'missing');
if (!(err instanceof APIError) || !(err instanceof WebshareError)) throw new Error('error hierarchy broken');

console.log('esm smoke ok');
