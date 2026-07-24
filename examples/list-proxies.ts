// List proxies of a plan and iterate across all pages automatically.
// Run with: npx tsx examples/list-proxies.ts (requires WEBSHARE_API_KEY)
import { Webshare } from '../src/index.js';

const client = new Webshare();

// Pick the plan to work with (or set WEBSHARE_PLAN_ID to skip the lookup).
const planId =
  process.env['WEBSHARE_PLAN_ID'] !== undefined
    ? Number(process.env['WEBSHARE_PLAN_ID'])
    : (await client.plans.list()).results.find((p) => p.status === 'active')?.id;
if (planId === undefined) throw new Error('no active plan');

// A single page, with the raw envelope available:
const page = await client.proxies.list({ mode: 'direct', plan_id: planId, page_size: 25 });
console.log(`Plan ${planId} has ${page.count} proxies`);
for (const proxy of page.results) {
  console.log(`${proxy.id} ${proxy.proxy_address}:${proxy.port} (${proxy.country_code})`);
}

// Or iterate every proxy across all pages (the SDK follows `next` URLs):
let total = 0;
for await (const proxy of await client.proxies.list({ mode: 'direct', plan_id: planId, page_size: 100 })) {
  total += 1;
  if (!proxy.valid) console.log(`invalid proxy: ${proxy.id}`);
}
console.log(`Iterated ${total} proxies`);
