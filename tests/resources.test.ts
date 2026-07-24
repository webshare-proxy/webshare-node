import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { Webshare } from '../src/index.js';
import { TestServer, empty, json, page, text } from './server.js';

let server: TestServer;
let client: Webshare;

beforeAll(async () => {
  server = await new TestServer().start();
  client = new Webshare({ apiKey: 'test-key', baseURL: server.url });
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  server.reset();
});

describe('proxies', () => {
  test('list requires mode and hits /api/v2/proxy/list/', async () => {
    server.respond(
      page([
        {
          id: 'd-10513',
          username: 'username',
          password: 'password',
          proxy_address: '1.2.3.4',
          port: 8168,
          valid: true,
          last_verification: '2019-06-09T23:34:00.095501-07:00',
          country_code: 'US',
          city_name: 'New York',
          created_at: '2022-06-14T11:58:10.246406-07:00',
        },
      ]),
    );
    const result = await client.proxies.list({ mode: 'direct', plan_id: 1 });
    expect(result.results[0]?.id).toBe('d-10513');
    const url = new URL(server.lastRequest.url, server.url);
    expect(url.pathname).toBe('/api/v2/proxy/list/');
    expect(url.searchParams.get('mode')).toBe('direct');
    expect(url.searchParams.get('plan_id')).toBe('1');
  });

  test('refresh POSTs and returns void on 204', async () => {
    server.respond(empty(204));
    await expect(client.proxies.refresh()).resolves.toBeUndefined();
    expect(server.lastRequest.method).toBe('POST');
    expect(server.lastRequest.url).toBe('/api/v2/proxy/list/refresh/');
  });

  test('download fetches the path-style URL unauthenticated and returns text', async () => {
    server.respond(text(200, '10.1.2.3:9421:user:pass\n'));
    const body = await client.proxies.download({ token: 'tok', country_codes: ['US'] });
    expect(body).toBe('10.1.2.3:9421:user:pass\n');
    expect(server.lastRequest.url).toBe('/api/v2/proxy/list/download/tok/US/any/username/direct/-/');
    expect(server.lastRequest.headers['authorization']).toBeUndefined();
  });

  test('downloadURL builds against the client baseURL', () => {
    expect(client.proxies.downloadURL({ token: 'tok' })).toBe(
      `${server.url}/api/v2/proxy/list/download/tok/-/any/username/direct/-/`,
    );
  });
});

describe('proxyConfig', () => {
  test('get uses the v3 path with no trailing slash and required plan_id', async () => {
    server.respond(json(200, { request_timeout: 86400, proxy_list_download_token: 'aa' }));
    const config = await client.proxyConfig.get({ plan_id: 5 });
    expect(config.proxy_list_download_token).toBe('aa');
    expect(server.lastRequest.url).toBe('/api/v3/proxy/config?plan_id=5');
  });

  test('update PATCHes v2 with plan_id in the query and fields in the body', async () => {
    server.respond(json(200, { id: 1, username: 'new_username' }));
    await client.proxyConfig.update({ plan_id: 5, username: 'new_username' });
    expect(server.lastRequest.method).toBe('PATCH');
    expect(server.lastRequest.url).toBe('/api/v2/proxy/config/?plan_id=5');
    expect(JSON.parse(server.lastRequest.body)).toEqual({ username: 'new_username' });
  });

  test('getStats and getStatus use the v3 paths', async () => {
    server.respond(json(200, { asns: { '6137': ['ASN NAME', 105] } }), json(200, { state: 'completed' }));
    const stats = await client.proxyConfig.getStats({ plan_id: 1 });
    expect(stats.asns['6137']).toEqual(['ASN NAME', 105]);
    expect(server.lastRequest.url).toBe('/api/v3/proxy/list/stats?plan_id=1');
    await client.proxyConfig.getStatus({ plan_id: 1 });
    expect(server.lastRequest.url).toBe('/api/v3/proxy/list/status?plan_id=1');
  });
});

describe('proxyReplacements', () => {
  test('create POSTs to the v3 path and get polls it', async () => {
    server.respond(
      json(200, { id: 98315, state: 'validating' }),
      json(200, { id: 98315, state: 'completed', proxies_removed: 1, proxies_added: 1 }),
    );
    const created = await client.proxyReplacements.create({
      to_replace: { type: 'ip_range', ip_ranges: ['1.2.3.0/24'] },
      replace_with: [{ type: 'country', country_code: 'US' }],
      dry_run: false,
    });
    expect(created.state).toBe('validating');
    expect(server.lastRequest.url).toBe('/api/v3/proxy/replace/');
    expect(JSON.parse(server.lastRequest.body)).toEqual({
      to_replace: { type: 'ip_range', ip_ranges: ['1.2.3.0/24'] },
      replace_with: [{ type: 'country', country_code: 'US' }],
      dry_run: false,
    });
    const polled = await client.proxyReplacements.get(98315);
    expect(polled.state).toBe('completed');
    expect(server.lastRequest.url).toBe('/api/v3/proxy/replace/98315/');
  });
});

describe('replacedProxies / stats / activity / downloadTokens', () => {
  test('replacedProxies.download passes the download_token query param', async () => {
    server.respond(text(200, '10.1.2.3:9421:u:p:10.1.2.7\n'));
    const body = await client.replacedProxies.download({ download_token: 'key123', proxy_protocol: 'any' });
    expect(body).toContain('10.1.2.3');
    const url = new URL(server.lastRequest.url, server.url);
    expect(url.pathname).toBe('/api/v2/proxy/list/replaced/download/');
    expect(url.searchParams.get('download_token')).toBe('key123');
    expect(server.lastRequest.headers['authorization']).toBeUndefined();
  });

  test('stats.list returns a bare array (not paginated)', async () => {
    server.respond(json(200, [{ timestamp: '2022-08-11T17:00:00-07:00', is_projected: false }]));
    const stats = await client.stats.list({ timestamp__gte: '2022-08-01T00:00:00Z' });
    expect(Array.isArray(stats)).toBe(true);
    expect(stats[0]?.is_projected).toBe(false);
    const url = new URL(server.lastRequest.url, server.url);
    expect(url.pathname).toBe('/api/v2/stats/');
  });

  test('stats.aggregate hits /api/v2/stats/aggregate/', async () => {
    server.respond(json(200, { bandwidth_total: 5000 }));
    const agg = await client.stats.aggregate();
    expect(agg.bandwidth_total).toBe(5000);
    expect(server.lastRequest.url).toBe('/api/v2/stats/aggregate/');
  });

  test('proxyActivity.download returns CSV text', async () => {
    server.respond(text(200, 'Time,Hostname\n'));
    const csv = await client.proxyActivity.download({ download_token: 'key' });
    expect(csv.startsWith('Time,')).toBe(true);
  });

  test('downloadTokens get/reset use the scope in the path', async () => {
    server.respond(
      json(200, { id: 56, key: 'k', scope: 'activity', expire_at: 'x' }),
      json(200, { id: 57, key: 'k2', scope: 'activity', expire_at: 'x' }),
    );
    const token = await client.downloadTokens.get('activity');
    expect(token.key).toBe('k');
    expect(server.lastRequest.url).toBe('/api/v2/download_token/activity/');
    await client.downloadTokens.reset('activity');
    expect(server.lastRequest.method).toBe('POST');
    expect(server.lastRequest.url).toBe('/api/v2/download_token/activity/reset/');
  });
});

describe('ipAuthorizations / subusers', () => {
  test('whatsMyIP then create', async () => {
    server.respond(
      json(200, { ip_address: '1.2.3.4' }),
      json(200, { id: 1337, ip_address: '1.2.3.4', created_at: 'x', last_used_at: null }),
    );
    const me = await client.ipAuthorizations.whatsMyIP();
    const created = await client.ipAuthorizations.create({ ip_address: me.ip_address });
    expect(created.id).toBe(1337);
    expect(server.lastRequest.method).toBe('POST');
    expect(server.lastRequest.url).toBe('/api/v2/proxy/ipauthorization/');
    expect(JSON.parse(server.lastRequest.body)).toEqual({ ip_address: '1.2.3.4' });
  });

  test('ipAuthorizations.delete returns void', async () => {
    server.respond(empty(204));
    await expect(client.ipAuthorizations.delete(1337)).resolves.toBeUndefined();
    expect(server.lastRequest.method).toBe('DELETE');
    expect(server.lastRequest.url).toBe('/api/v2/proxy/ipauthorization/1337/');
  });

  test('subusers update PATCHes and refreshProxyList POSTs', async () => {
    server.respond(json(200, { id: 7, label: 'newlabel' }), json(200, { id: 7, label: 'newlabel' }));
    await client.subusers.update(7, { label: 'newlabel' });
    expect(server.lastRequest.method).toBe('PATCH');
    expect(server.lastRequest.url).toBe('/api/v2/subuser/7/');
    await client.subusers.refreshProxyList(7);
    expect(server.lastRequest.method).toBe('POST');
    expect(server.lastRequest.url).toBe('/api/v2/subuser/7/refresh/');
  });
});

describe('account resources', () => {
  test('profile get and updatePreferences', async () => {
    server.respond(json(200, { id: 1, email: 'user@webshare.io' }), json(200, { id: 1 }));
    const profile = await client.profile.get();
    expect(profile.email).toBe('user@webshare.io');
    await client.profile.updatePreferences({ onboarding_activity_page_viewed_at: '2022-06-14T15:59:06Z' });
    expect(server.lastRequest.method).toBe('PATCH');
    expect(server.lastRequest.url).toBe('/api/v2/profile/preferences/');
  });

  test('notifications dismiss POSTs', async () => {
    server.respond(json(200, { id: 13, dismissed_at: 'x' }));
    const dismissed = await client.notifications.dismiss(13);
    expect(dismissed.dismissed_at).toBe('x');
    expect(server.lastRequest.method).toBe('POST');
    expect(server.lastRequest.url).toBe('/api/v2/notification/13/dismiss/');
  });

  test('idVerification.get reads the verification state', async () => {
    server.respond(json(200, { id: 1, state: 'not-required', client_secret: null }));
    const idv = await client.idVerification.get();
    expect(idv.state).toBe('not-required');
    expect(server.lastRequest.url).toBe('/api/v2/idverification/');
  });
});

describe('verification', () => {
  test('flows.submitEvidence sends multipart/form-data with files', async () => {
    server.respond(json(200, { id: 1, state: 'inflow' }));
    const file = new File(['evidence-bytes'], 'evidence.txt', { type: 'text/plain' });
    await client.verification.flows.submitEvidence(1, { explanation: 'my explanation', files: [file] });
    const req = server.lastRequest;
    expect(req.method).toBe('POST');
    expect(req.url).toBe('/api/v2/verification/flow/1/submit_evidence/');
    expect(req.headers['content-type']).toMatch(/^multipart\/form-data; boundary=/);
    expect(req.body).toContain('name="explanation"');
    expect(req.body).toContain('my explanation');
    expect(req.body).toContain('name="files"; filename="evidence.txt"');
    expect(req.body).toContain('evidence-bytes');
  });

  test('questions.submitAnswer sends multipart/form-data', async () => {
    server.respond(json(200, { id: 1, answer: 'the answer' }));
    await client.verification.questions.submitAnswer(9, { answer: 'the answer' });
    expect(server.lastRequest.url).toBe('/api/v2/verification/question/9/answer/');
    expect(server.lastRequest.headers['content-type']).toMatch(/^multipart\/form-data/);
  });

  test('getCategories returns a map keyed by category', async () => {
    server.respond(
      json(200, {
        requests_to_financial_institutions: {
          description: 'd',
          request_threshold: null,
          id_verification_required: true,
          id_verification_restores_access: true,
        },
      }),
    );
    const categories = await client.verification.getCategories();
    expect(categories['requests_to_financial_institutions']?.id_verification_required).toBe(true);
  });
});

describe('commerce resources', () => {
  test('billing.getInfo hits the singleton path', async () => {
    server.respond(json(200, { id: 1, name: 'n', address: 'a', billing_email: 'e' }));
    const info = await client.billing.getInfo();
    expect(info.id).toBe(1);
    expect(server.lastRequest.url).toBe('/api/v2/subscription/billing_info/');
  });

  test('paymentMethods.list returns polymorphic entries', async () => {
    server.respond(page([{ id: 1, type: 'StripeCard', brand: 'visa', last4: '4242' }, { id: 2, type: 'LinkPayment' }]));
    const methods = await client.paymentMethods.list();
    expect(methods.results[0]?.brand).toBe('visa');
    expect(methods.results[1]?.type).toBe('LinkPayment');
  });

  test('pendingPayments.get polls a pending payment', async () => {
    server.respond(json(200, { id: 3, status: 'successful', transaction: 12 }));
    const pending = await client.pendingPayments.get(3);
    expect(pending.status).toBe('successful');
    expect(server.lastRequest.url).toBe('/api/v2/payment/pending/3/');
  });

  test('transactions.list hits /api/v2/payment/transaction/', async () => {
    server.respond(page([{ id: 1, status: 'completed' }]));
    const transactions = await client.transactions.list();
    expect(transactions.results[0]?.status).toBe('completed');
  });

  test('subscription.customize hides the JSON-in-query convention', async () => {
    server.respond(json(200, { proxy_type: 'shared', proxy_count_max: 60000 }));
    await client.subscription.customize({ proxy_type: 'shared', proxy_countries: { US: 100 }, plan_id: 3 });
    const url = new URL(server.lastRequest.url, server.url);
    expect(url.pathname).toBe('/api/v2/subscription/customize/');
    expect(url.searchParams.get('plan_id')).toBe('3');
    expect(JSON.parse(url.searchParams.get('query') ?? '')).toEqual({
      proxy_type: 'shared',
      proxy_countries: { US: 100 },
    });
  });

  test('subscription.pricing uses the same query convention', async () => {
    server.respond(json(200, { price: 13.94, paid_today: 8.94 }));
    const pricing = await client.subscription.pricing({ proxy_type: 'shared', term: 'monthly', with_tax: true });
    expect(pricing.paid_today).toBe(8.94);
    const url = new URL(server.lastRequest.url, server.url);
    expect(JSON.parse(url.searchParams.get('query') ?? '')).toEqual({
      proxy_type: 'shared',
      term: 'monthly',
      with_tax: true,
    });
  });

  test('auto-renewal: enable is PUT, cancel is DELETE returning the subscription', async () => {
    server.respond(json(200, { id: 1, renewals_enabled: true }), json(200, { id: 1, renewals_enabled: false, payment_method: null }));
    const enabled = await client.subscription.enableAutoRenewal();
    expect(server.lastRequest.method).toBe('PUT');
    expect(server.lastRequest.url).toBe('/api/v2/subscription/renewal/');
    expect(enabled.renewals_enabled).toBe(true);
    const cancelled = await client.subscription.cancelAutoRenewal();
    expect(server.lastRequest.method).toBe('DELETE');
    expect(cancelled.payment_method).toBeNull();
  });

  test('plans list/update/cancel', async () => {
    server.respond(
      page([{ id: 2, status: 'active' }]),
      json(200, { id: 2, automatic_refresh_next_at: '2022-06-14T11:58:10Z' }),
      json(200, { success: true, transaction: 12 }),
    );
    const plans = await client.plans.list();
    expect(plans.results[0]?.id).toBe(2);
    const updated = await client.plans.update(2, { automatic_refresh_next_at: '2022-06-14T11:58:10Z' });
    expect(updated.id).toBe(2);
    expect(server.lastRequest.method).toBe('PATCH');
    expect(server.lastRequest.url).toBe('/api/v2/subscription/plan/2/');
    const cancelled = await client.plans.cancel(2);
    expect(cancelled.success).toBe(true);
    expect(server.lastRequest.url).toBe('/api/v2/subscription/plan/2/cancel/');
  });

  test('invoices.download returns bytes from the no-trailing-slash path', async () => {
    server.respond((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/pdf' });
      res.end(Buffer.from('%PDF-1.4 fake'));
    });
    const bytes = await client.invoices.download({ subscription_transaction_id: '77' });
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(bytes).toString('utf8')).toBe('%PDF-1.4 fake');
    expect(server.lastRequest.url).toBe('/api/v2/invoices/download?subscription_transaction_id=77');
  });

  test('referral.listChannels returns a bare array; getCodeInfo is unauthenticated', async () => {
    server.respond(
      json(200, [{ id: 1, code: 'SUMMER20', promo_type: 'percent_off', promo_value: '0.20' }]),
      json(200, { referral_code: 'a8b', promo_type: 'first_time_value_off', promo_value: 10 }),
    );
    const channels = await client.referral.listChannels();
    expect(Array.isArray(channels)).toBe(true);
    expect(channels[0]?.code).toBe('SUMMER20');
    const info = await client.referral.getCodeInfo({ referral_code: 'a8b' });
    expect(info.promo_value).toBe(10);
    expect(server.lastRequest.headers['authorization']).toBeUndefined();
    expect(server.lastRequest.url).toBe('/api/v2/referral/code/info/?referral_code=a8b');
  });

  test('referral.listEarnouts uses the path without a trailing slash', async () => {
    server.respond(page([{ id: 1, mode: 'credits' }]));
    await client.referral.listEarnouts();
    expect(server.lastRequest.url).toBe('/api/v2/referral/earnout');
  });

  test('referral.removeCouponCode DELETEs and returns void', async () => {
    server.respond(empty(204));
    await expect(client.referral.removeCouponCode()).resolves.toBeUndefined();
    expect(server.lastRequest.method).toBe('DELETE');
    expect(server.lastRequest.url).toBe('/api/v2/referral/coupon-code/');
  });
});
