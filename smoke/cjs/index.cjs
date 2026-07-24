// CommonJS consumer smoke test: verifies the require entry of the exports map.
'use strict';
const assert = require('node:assert');
const webshare = require('webshare');
const { Webshare, APIError, WebshareError, NotFoundError, buildProxyUrl } = webshare;

assert.strictEqual(webshare.default, Webshare, 'default export should be the Webshare class');

const client = new Webshare({ apiKey: 'smoke-key' });
assert.strictEqual(typeof client.proxies.list, 'function');
assert.strictEqual(typeof client.subscription.cancelAutoRenewal, 'function');
assert.strictEqual(typeof client.verification.flows.submitEvidence, 'function');

assert.strictEqual(
  buildProxyUrl({ mode: 'direct', username: 'u', password: 'p', proxyAddress: '1.2.3.4', port: 80 }),
  'http://u:p@1.2.3.4:80',
);

const err = new NotFoundError(404, 'missing');
assert.ok(err instanceof APIError);
assert.ok(err instanceof WebshareError);

delete process.env.WEBSHARE_API_KEY;
assert.throws(() => new Webshare({ apiKey: '' }), WebshareError);
assert.doesNotThrow(() => new Webshare({ unauthenticated: true }));

console.log('cjs smoke ok');
