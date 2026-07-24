import { WebshareError } from './error.js';

/** Default host for backbone-mode proxy connections. */
export const BACKBONE_HOST = 'p.webshare.io';

/** Options for {@link buildProxyUrl}. */
export interface ProxyUrlOptions {
  /**
   * Connection mode.
   * - `direct`: connect to the `proxy_address`/`port` returned by the proxy
   *   list API.
   * - `backbone`: connect to `p.webshare.io`. Required when
   *   `plan.pool_filter` is `residential`.
   */
  mode: 'direct' | 'backbone';
  /** URL scheme. The documentation shows `http`; SOCKS is also supported by the service. Default `http`. */
  scheme?: 'http' | 'socks5';
  /** Proxy username. Omit both username and password to build an IP-authorization URL (no credentials). */
  username?: string;
  /** Proxy password. Required when `username` is set. */
  password?: string;
  /** Direct mode only: the proxy IP address from the proxy list API. */
  proxyAddress?: string;
  /**
   * Port to connect to. Required in direct mode (from the proxy list API).
   * Defaults to 80 in backbone mode (username/password auth ports are 80,
   * 1080, 3128 and 9999-19999).
   */
  port?: number;
  /**
   * Backbone username parameters: ISO 3166-1 alpha-2 country codes appended
   * to the username (lowercased), e.g. `["us", "fr"]`.
   */
  countryCodes?: string[];
  /**
   * Backbone username parameter: city name (`city_` prefix is added). Letters
   * and underscores only. City targeting is only available for residential
   * plans.
   */
  city?: string;
  /**
   * Backbone username parameter: numeric sticky-session ID. The same session
   * ID routes to the same exit IP. Mutually exclusive with `rotate`.
   */
  session?: number | string;
  /**
   * Backbone username parameter: rotate to a new IP on every request.
   * Mutually exclusive with `session`.
   */
  rotate?: boolean;
  /** Override the backbone host (default `p.webshare.io`). */
  host?: string;
}

/**
 * Builds a proxy connection URL.
 *
 * Direct mode produces `http://user:pass@addr:port`; backbone mode produces a
 * URL against `p.webshare.io` using the username parameter grammar
 * `{username}[-{cc}...][-city_{name}][-{session}|-rotate]`.
 *
 * Omitting `username`/`password` builds an IP-authorization URL with no
 * credentials (the source IP must be authorized via the IP authorization API).
 *
 * This is a pure function; it performs validation only and no I/O.
 */
export function buildProxyUrl(options: ProxyUrlOptions): string {
  const scheme = options.scheme ?? 'http';
  const hasUsername = options.username !== undefined && options.username !== '';
  const hasPassword = options.password !== undefined && options.password !== '';

  if (hasUsername !== hasPassword) {
    throw new WebshareError('username and password must be provided together (or both omitted for IP authorization).');
  }

  if (options.mode === 'direct') {
    if (options.countryCodes !== undefined || options.city !== undefined || options.session !== undefined || options.rotate) {
      throw new WebshareError(
        'countryCodes, city, session and rotate are backbone username parameters and cannot be used in direct mode.',
      );
    }
    if (options.proxyAddress === undefined || options.proxyAddress === '') {
      throw new WebshareError('proxyAddress is required in direct mode (use the proxy list API value).');
    }
    if (options.port === undefined) {
      throw new WebshareError('port is required in direct mode (use the proxy list API value).');
    }
    const auth = hasUsername
      ? `${encodeURIComponent(options.username!)}:${encodeURIComponent(options.password!)}@`
      : '';
    return `${scheme}://${auth}${options.proxyAddress}:${options.port}`;
  }

  if (options.mode !== 'backbone') {
    throw new WebshareError(`mode must be "direct" or "backbone", got ${JSON.stringify(options.mode)}.`);
  }

  if (options.proxyAddress !== undefined) {
    throw new WebshareError('proxyAddress cannot be used in backbone mode; backbone connects to p.webshare.io.');
  }

  const host = options.host ?? BACKBONE_HOST;
  const port = options.port ?? 80;

  if (!hasUsername) {
    if (options.countryCodes !== undefined || options.city !== undefined || options.session !== undefined || options.rotate) {
      throw new WebshareError(
        'countryCodes, city, session and rotate are username parameters and require username/password authentication. ' +
          'For IP authorization, geo targeting is configured via the proxy config API instead.',
      );
    }
    return `${scheme}://${host}:${port}`;
  }

  return `${scheme}://${encodeURIComponent(buildBackboneUsername(options))}:${encodeURIComponent(
    options.password!,
  )}@${host}:${port}`;
}

function buildBackboneUsername(options: ProxyUrlOptions): string {
  const parts: string[] = [options.username!];

  if (options.countryCodes !== undefined) {
    for (const code of options.countryCodes) {
      if (!/^[A-Za-z]{2}$/.test(code)) {
        throw new WebshareError(
          `Invalid country code ${JSON.stringify(code)}: must be a 2-letter ISO 3166-1 alpha-2 code.`,
        );
      }
      parts.push(code.toLowerCase());
    }
  }

  if (options.city !== undefined) {
    if (!/^[A-Za-z_]+$/.test(options.city)) {
      throw new WebshareError(
        `Invalid city ${JSON.stringify(options.city)}: city names may contain only letters and underscores.`,
      );
    }
    parts.push(`city_${options.city.toLowerCase()}`);
  }

  if (options.session !== undefined && options.rotate) {
    throw new WebshareError('session and rotate are mutually exclusive.');
  }

  if (options.session !== undefined) {
    const session = String(options.session);
    if (!/^\d+$/.test(session)) {
      throw new WebshareError(`Invalid session ${JSON.stringify(options.session)}: session IDs must be numeric.`);
    }
    parts.push(session);
  } else if (options.rotate) {
    parts.push('rotate');
  }

  return parts.join('-');
}

/** Options for {@link buildProxyListDownloadUrl}. */
export interface ProxyListDownloadUrlOptions {
  /** The `proxy_list_download_token` from the proxy config API. */
  token: string;
  /** ISO 3166-1 alpha-2 country codes; joined with hyphens. Omit for all countries (`-`). */
  country_codes?: string[];
  /** The proxy protocol path segment. The documented value is the literal `any` (default). */
  proxy_protocol?: string;
  /** Authentication method for the downloaded list. Default `username`. */
  authentication_method?: 'username' | 'sourceip';
  /** Endpoint mode. Must be `backbone` if `plan.pool_filter` is `residential`. Default `direct`. */
  endpoint_mode?: 'direct' | 'backbone';
  /** Search terms (URL-encoded into the path). Omit for none (`-`). */
  search?: string;
  /** Target a specific plan; otherwise the default plan is used. */
  plan_id?: number;
  /** Base URL of the API. Default `https://proxy.webshare.io`. */
  baseURL?: string;
}

/**
 * Builds the unauthenticated, path-style proxy list download URL:
 * `/api/v2/proxy/list/download/{token}/{country_codes}/{proxy_protocol}/{authentication_method}/{endpoint_mode}/{search}/`.
 *
 * The response of that URL is plain text, one proxy per line in
 * `address:port:username:password` format.
 */
export function buildProxyListDownloadUrl(options: ProxyListDownloadUrlOptions): string {
  if (options.token === undefined || options.token === '') {
    throw new WebshareError('token is required (proxy_list_download_token from the proxy config API).');
  }
  const base = (options.baseURL ?? 'https://proxy.webshare.io').replace(/\/+$/, '');
  const countryCodes =
    options.country_codes !== undefined && options.country_codes.length > 0
      ? options.country_codes.map((code) => encodeURIComponent(code)).join('-')
      : '-';
  const protocol = options.proxy_protocol ?? 'any';
  const authenticationMethod = options.authentication_method ?? 'username';
  const endpointMode = options.endpoint_mode ?? 'direct';
  const search = options.search !== undefined && options.search !== '' ? encodeURIComponent(options.search) : '-';

  let url =
    `${base}/api/v2/proxy/list/download/` +
    `${encodeURIComponent(options.token)}/${countryCodes}/${encodeURIComponent(protocol)}/` +
    `${authenticationMethod}/${endpointMode}/${search}/`;
  if (options.plan_id !== undefined) {
    url += `?plan_id=${options.plan_id}`;
  }
  return url;
}
