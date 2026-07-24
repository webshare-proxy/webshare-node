// Download the proxy list as plain text (address:port:username:password lines).
// Run with: npx tsx examples/download-proxy-list.ts (requires WEBSHARE_API_KEY)
import { Webshare } from '../src/index.js';

const client = new Webshare();

// The download URL embeds the proxy_list_download_token from the proxy config.
const subscription = await client.subscription.get();
const config = await client.proxyConfig.get({ plan_id: subscription.plan });

// Fetch the list directly:
const list = await client.proxies.download({
  token: config.proxy_list_download_token,
  endpoint_mode: 'direct',
});
console.log(list.split('\n').slice(0, 5).join('\n'));

// Or just build the shareable URL without fetching it:
console.log(client.proxies.downloadURL({ token: config.proxy_list_download_token }));
