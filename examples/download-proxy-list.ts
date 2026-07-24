// Download the proxy list of a plan as plain text
// (address:port:username:password lines).
// Run with: npx tsx examples/download-proxy-list.ts (requires WEBSHARE_API_KEY)
import { Webshare } from '../src/index.js';

const client = new Webshare();

// Pick the plan to work with; the active plan id also lives on the
// subscription object (subscription.plan).
const planId =
  process.env['WEBSHARE_PLAN_ID'] !== undefined
    ? Number(process.env['WEBSHARE_PLAN_ID'])
    : (await client.subscription.get()).plan;

// The download URL embeds the proxy_list_download_token from the proxy config.
const config = await client.proxyConfig.get({ plan_id: planId });

// Fetch the list directly:
const list = await client.proxies.download({
  token: config.proxy_list_download_token,
  endpoint_mode: 'direct',
  plan_id: planId,
});
console.log(list.split('\n').slice(0, 5).join('\n'));

// Or just build the shareable URL without fetching it:
console.log(
  client.proxies.downloadURL({ token: config.proxy_list_download_token, plan_id: planId }),
);
