// Error handling: per-status classes, API error codes and field errors.
// Run with: npx tsx examples/error-handling.ts (requires WEBSHARE_API_KEY)
import {
  Webshare,
  APIError,
  APIConnectionError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError,
} from '../src/index.js';

const client = new Webshare();

try {
  await client.notifications.get(999999999);
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log(`Not found (request ${err.requestID ?? 'n/a'}): ${err.detail}`);
  } else if (err instanceof PermissionDeniedError) {
    // Every call can hit these account-state 403 codes:
    if (err.code === 'account_suspended') console.log('Account suspended.');
    else if (err.code === 'account_deleted') console.log('Account deleted.');
    else console.log(`Forbidden: ${err.detail}`);
  } else if (err instanceof RateLimitError) {
    console.log('Rate limited; the SDK already retried with backoff.');
  } else if (err instanceof APIError) {
    console.log(`API error ${err.status}: ${err.detail}`, err.fieldErrors);
  } else if (err instanceof APIConnectionError) {
    console.log(`Could not reach the API: ${err.message}`);
  } else {
    throw err;
  }
}
