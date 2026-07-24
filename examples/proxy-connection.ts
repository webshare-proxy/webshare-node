// Build proxy connection URLs with the pure helper (no API calls needed).
// Run with: npx tsx examples/proxy-connection.ts
import { buildProxyUrl } from '../src/index.js';

// Direct mode: connect straight to a proxy from the proxy list API.
console.log(
  buildProxyUrl({
    mode: 'direct',
    username: 'myuser',
    password: 'password',
    proxyAddress: '1.2.3.4',
    port: 8168,
  }),
);
// -> http://myuser:password@1.2.3.4:8168

// Backbone mode with a sticky session pinned to US exits:
console.log(
  buildProxyUrl({
    mode: 'backbone',
    username: 'myuser',
    password: 'password',
    countryCodes: ['us'],
    session: 1234,
  }),
);
// -> http://myuser-us-1234:password@p.webshare.io:80

// Backbone mode rotating through Los Angeles residential IPs:
console.log(
  buildProxyUrl({
    mode: 'backbone',
    username: 'myuser',
    password: 'password',
    countryCodes: ['us'],
    city: 'los_angeles',
    rotate: true,
  }),
);
// -> http://myuser-us-city_los_angeles-rotate:password@p.webshare.io:80

// IP authorization (no credentials; source IP must be authorized):
console.log(buildProxyUrl({ mode: 'direct', proxyAddress: '1.2.3.4', port: 8168 }));
// -> http://1.2.3.4:8168
