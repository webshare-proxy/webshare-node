// Plans-first workflow: list plans, pick one, and scope other calls to it.
// Run with: npx tsx examples/plans.ts (requires WEBSHARE_API_KEY)
import { Webshare } from '../src/index.js';

const client = new Webshare();

// 1. List your plans and pick the one to work with. The plan id is also
//    visible in the dashboard URL when viewing a plan.
const plans = await client.plans.list();
for (const plan of plans.results) {
  console.log(`plan ${plan.id}: ${plan.status}, ${plan.proxy_count} ${plan.proxy_type} proxies`);
}
const plan = plans.results.find((p) => p.status === 'active');
if (plan === undefined) throw new Error('no active plan');

// 2. Pass its id to plan-scoped calls.
const proxies = await client.proxies.list({ mode: 'direct', plan_id: plan.id, page_size: 5 });
console.log(`plan ${plan.id} has ${proxies.count} proxies`);

const config = await client.proxyConfig.get({ plan_id: plan.id });
console.log(`request timeout: ${config.request_timeout}s`);

// 3. The download URL is plan-scoped too.
console.log(
  client.proxies.downloadURL({
    token: config.proxy_list_download_token,
    plan_id: plan.id,
  }),
);
