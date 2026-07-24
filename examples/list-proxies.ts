// List proxies and iterate across all pages automatically.
// Run with: npx tsx examples/list-proxies.ts (requires WEBSHARE_API_KEY)
import { Webshare } from '../src/index.js';

const client = new Webshare();

// A single page, with the raw envelope available:
const page = await client.proxies.list({ mode: 'direct', page_size: 25 });
console.log(`Total proxies: ${page.count}`);
for (const proxy of page.results) {
  console.log(`${proxy.id} ${proxy.proxy_address}:${proxy.port} (${proxy.country_code})`);
}

// Or iterate every proxy across all pages (the SDK follows `next` URLs):
let total = 0;
for await (const proxy of await client.proxies.list({ mode: 'direct', page_size: 100 })) {
  total += 1;
  if (!proxy.valid) console.log(`invalid proxy: ${proxy.id}`);
}
console.log(`Iterated ${total} proxies`);
