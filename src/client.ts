import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  WebshareError,
} from './error.js';
import { Page, type PageEnvelope } from './pagination.js';
import { Proxies } from './resources/proxies.js';
import { ProxyConfig } from './resources/proxy-config.js';
import { ProxyReplacements } from './resources/proxy-replacements.js';
import { ReplacedProxies } from './resources/replaced-proxies.js';
import { Stats } from './resources/stats.js';
import { ProxyActivity } from './resources/proxy-activity.js';
import { DownloadTokens } from './resources/download-tokens.js';
import { IPAuthorizations } from './resources/ip-authorizations.js';
import { Subusers } from './resources/subusers.js';
import { APIKeys } from './resources/api-keys.js';
import { Profile } from './resources/profile.js';
import { Notifications } from './resources/notifications.js';
import { Auth } from './resources/auth.js';
import { TwoFactorAuth } from './resources/two-factor-auth.js';
import { IDVerification } from './resources/id-verification.js';
import { Verification } from './resources/verification.js';
import { Billing } from './resources/billing.js';
import { PaymentMethods } from './resources/payment-methods.js';
import { PendingPayments } from './resources/pending-payments.js';
import { Transactions } from './resources/transactions.js';
import { Subscription } from './resources/subscription.js';
import { Plans } from './resources/plans.js';
import { Invoices } from './resources/invoices.js';
import { Referral } from './resources/referral.js';

export const VERSION = '0.1.0';

/**
 * Returns the token part of the `Authorization` header. Called once per
 * request, so short-lived credentials (e.g. OAuth tokens) can be refreshed.
 */
export type CredentialsProvider = () => string | Promise<string>;

/** A minimal fetch signature compatible with the global `fetch`. */
export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export interface ClientOptions {
  /**
   * Webshare API key. Defaults to the `WEBSHARE_API_KEY` environment
   * variable. Shorthand for a static {@link CredentialsProvider}.
   */
  apiKey?: string;
  /**
   * Pluggable credentials provider; takes precedence over `apiKey`. The
   * returned value is sent as `Authorization: Token <value>`.
   */
  credentials?: CredentialsProvider;
  /**
   * Base URL of the API (the bare host; operation paths carry their own
   * `/api/vN/...` prefix). Default `https://proxy.webshare.io`.
   */
  baseURL?: string;
  /** Request timeout in milliseconds. Default 60000 (60 seconds). */
  timeout?: number;
  /** Maximum number of retries for retryable failures. Default 2 (3 attempts total). */
  maxRetries?: number;
  /** Custom fetch implementation. Defaults to the global `fetch` (Node 20+). */
  fetch?: Fetch;
  /** Headers added to every request. Overridden by per-request headers. */
  defaultHeaders?: Record<string, string>;
  /**
   * Sub-user ID sent as the `X-Subuser` header on every request, to act as
   * that sub-user on proxy config/list/stats/activity APIs.
   */
  subuserId?: string | number;
  /**
   * User ID sent as the `X-Webshare-Federated-Access` header on every
   * request (admin-only federated access).
   */
  federatedUserId?: string | number;
  /**
   * Opt in to retrying non-idempotent requests (POST/PATCH) as well. By
   * default only GET/PUT/DELETE requests are retried.
   */
  retryNonIdempotent?: boolean;
}

/** Options accepted by every resource method as the final argument. */
export interface RequestOptions {
  /** Overall timeout for this request in milliseconds. */
  timeout?: number;
  /** Extra headers for this request. A `null` value removes the header. */
  headers?: Record<string, string | null>;
  /** Maximum number of retries for this request. */
  maxRetries?: number;
  /** Sub-user ID for the `X-Subuser` header (overrides the client option). */
  subuserId?: string | number;
  /** User ID for the `X-Webshare-Federated-Access` header (overrides the client option). */
  federatedUserId?: string | number;
  /** Abort signal; aborting cancels the request (and any pending retry). */
  signal?: AbortSignal;
  /** Opt in to retrying this request even if it uses POST/PATCH. */
  retryNonIdempotent?: boolean;
}

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryValue = string | number | boolean | string[] | number[] | null | undefined;
export type Query = Record<string, QueryValue>;

/** @internal Parameters for a single API request. */
export interface APIRequest {
  method: HTTPMethod;
  /** Operation path including its `/api/vN/...` prefix. */
  path?: string;
  /** Absolute URL; used verbatim (pagination `next` URLs). Takes precedence over `path`. */
  url?: string;
  query?: Query;
  /** JSON request body. */
  body?: unknown;
  /** multipart/form-data request body (mutually exclusive with `body`). */
  form?: FormData;
  /** Whether to send the `Authorization` header. Default true. */
  auth?: boolean;
  /** How to decode the response. Default `json`. */
  responseType?: 'json' | 'text' | 'binary' | 'void';
}

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const IDEMPOTENT_METHODS = new Set<HTTPMethod>(['GET', 'PUT', 'DELETE']);

const BACKOFF_BASE_SECONDS = 0.5;
const BACKOFF_CAP_SECONDS = 8;
const RETRY_AFTER_CAP_SECONDS = 60;

/**
 * The Webshare API client.
 *
 * ```ts
 * const client = new Webshare({ apiKey: "..." }); // or WEBSHARE_API_KEY env var
 * const page = await client.proxies.list({ mode: "direct" });
 * ```
 */
export class Webshare {
  readonly baseURL: string;
  readonly timeout: number;
  readonly maxRetries: number;

  private readonly credentials: CredentialsProvider;
  private readonly fetchFn: Fetch;
  private readonly defaultHeaders: Record<string, string>;
  private readonly subuserId: string | number | undefined;
  private readonly federatedUserId: string | number | undefined;
  private readonly retryNonIdempotent: boolean;

  readonly proxies: Proxies;
  readonly proxyConfig: ProxyConfig;
  readonly proxyReplacements: ProxyReplacements;
  readonly replacedProxies: ReplacedProxies;
  readonly stats: Stats;
  readonly proxyActivity: ProxyActivity;
  readonly downloadTokens: DownloadTokens;
  readonly ipAuthorizations: IPAuthorizations;
  readonly subusers: Subusers;
  readonly apiKeys: APIKeys;
  readonly profile: Profile;
  readonly notifications: Notifications;
  readonly auth: Auth;
  readonly twoFactorAuth: TwoFactorAuth;
  readonly idVerification: IDVerification;
  readonly verification: Verification;
  readonly billing: Billing;
  readonly paymentMethods: PaymentMethods;
  readonly pendingPayments: PendingPayments;
  readonly transactions: Transactions;
  readonly subscription: Subscription;
  readonly plans: Plans;
  readonly invoices: Invoices;
  readonly referral: Referral;

  constructor(options: ClientOptions = {}) {
    const apiKey = options.apiKey ?? process.env['WEBSHARE_API_KEY'];
    if (options.credentials !== undefined) {
      this.credentials = options.credentials;
    } else if (apiKey !== undefined && apiKey !== '') {
      this.credentials = () => apiKey;
    } else {
      throw new WebshareError(
        'Missing credentials. Pass an apiKey (new Webshare({ apiKey: "..." })), set the ' +
          'WEBSHARE_API_KEY environment variable, or provide a credentials provider.',
      );
    }

    this.baseURL = (options.baseURL ?? 'https://proxy.webshare.io').replace(/\/+$/, '');
    this.timeout = options.timeout ?? 60_000;
    this.maxRetries = options.maxRetries ?? 2;
    this.fetchFn = options.fetch ?? ((url, init) => globalThis.fetch(url, init));
    this.defaultHeaders = options.defaultHeaders ?? {};
    this.subuserId = options.subuserId;
    this.federatedUserId = options.federatedUserId;
    this.retryNonIdempotent = options.retryNonIdempotent ?? false;

    this.proxies = new Proxies(this);
    this.proxyConfig = new ProxyConfig(this);
    this.proxyReplacements = new ProxyReplacements(this);
    this.replacedProxies = new ReplacedProxies(this);
    this.stats = new Stats(this);
    this.proxyActivity = new ProxyActivity(this);
    this.downloadTokens = new DownloadTokens(this);
    this.ipAuthorizations = new IPAuthorizations(this);
    this.subusers = new Subusers(this);
    this.apiKeys = new APIKeys(this);
    this.profile = new Profile(this);
    this.notifications = new Notifications(this);
    this.auth = new Auth(this);
    this.twoFactorAuth = new TwoFactorAuth(this);
    this.idVerification = new IDVerification(this);
    this.verification = new Verification(this);
    this.billing = new Billing(this);
    this.paymentMethods = new PaymentMethods(this);
    this.pendingPayments = new PendingPayments(this);
    this.transactions = new Transactions(this);
    this.subscription = new Subscription(this);
    this.plans = new Plans(this);
    this.invoices = new Invoices(this);
    this.referral = new Referral(this);
  }

  /** @internal Performs a request against the API with retries and error mapping. */
  async request<T>(req: APIRequest, options: RequestOptions = {}): Promise<T> {
    const url = req.url ?? this.buildURL(req.path!, req.query);
    const headers = await this.buildHeaders(req, options);
    const timeout = options.timeout ?? this.timeout;
    const maxRetries = options.maxRetries ?? this.maxRetries;
    const retryAllowed =
      IDEMPOTENT_METHODS.has(req.method) ||
      (options.retryNonIdempotent ?? this.retryNonIdempotent);

    const body =
      req.form !== undefined ? req.form
      : req.body !== undefined ? JSON.stringify(req.body)
      : undefined;

    for (let attempt = 0; ; attempt++) {
      const canRetry = retryAllowed && attempt < maxRetries;
      let response: Response;
      try {
        response = await this.fetchWithTimeout(url, { method: req.method, headers, body }, timeout, options.signal);
      } catch (err) {
        if (options.signal?.aborted) throw err;
        if (canRetry && err instanceof APIConnectionError) {
          await sleep(backoffMs(attempt), options.signal);
          continue;
        }
        throw err;
      }

      if (response.ok) {
        return await this.decodeResponse<T>(response, req.responseType ?? 'json');
      }

      if (canRetry && RETRYABLE_STATUSES.has(response.status)) {
        const delay = retryAfterMs(response) ?? backoffMs(attempt);
        await response.body?.cancel().catch(() => undefined);
        await sleep(delay, options.signal);
        continue;
      }

      const requestID = response.headers.get('x-request-id');
      const rawBody = await response.text().catch(() => '');
      throw APIError.generate(response.status, rawBody, requestID, response.statusText);
    }
  }

  /** @internal Performs a paginated GET and wraps the envelope in a {@link Page}. */
  async requestPage<T>(path: string, query: Query | undefined, options: RequestOptions = {}): Promise<Page<T>> {
    const fetchURL = (url: string) => this.request<PageEnvelope<T>>({ method: 'GET', url }, options);
    const envelope = await this.request<PageEnvelope<T>>({ method: 'GET', path, query }, options);
    return new Page(fetchURL, envelope);
  }

  private buildURL(path: string, query: Query | undefined): string {
    let url = this.baseURL + path;
    const search = serializeQuery(query);
    if (search !== '') url += `?${search}`;
    return url;
  }

  private async buildHeaders(req: APIRequest, options: RequestOptions): Promise<Headers> {
    const headers = new Headers({
      'User-Agent': `webshare-node/${VERSION}`,
      Accept: 'application/json',
    });
    if (req.body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }
    if (req.auth !== false) {
      const token = await this.credentials();
      headers.set('Authorization', authorizationHeader(token));
    }
    for (const [name, value] of Object.entries(this.defaultHeaders)) {
      headers.set(name, value);
    }
    const subuserId = options.subuserId ?? this.subuserId;
    if (subuserId !== undefined) headers.set('X-Subuser', String(subuserId));
    const federatedUserId = options.federatedUserId ?? this.federatedUserId;
    if (federatedUserId !== undefined) headers.set('X-Webshare-Federated-Access', String(federatedUserId));
    if (options.headers !== undefined) {
      for (const [name, value] of Object.entries(options.headers)) {
        if (value === null) headers.delete(name);
        else headers.set(name, value);
      }
    }
    return headers;
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeout: number,
    signal: AbortSignal | undefined,
  ): Promise<Response> {
    signal?.throwIfAborted();
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeout);
    const onAbort = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      return await this.fetchFn(url, { ...init, signal: controller.signal });
    } catch (err) {
      if (signal?.aborted) throw err;
      if (timedOut) throw new APIConnectionTimeoutError(`Request timed out after ${timeout} ms.`);
      throw new APIConnectionError('Connection error.', err);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  private async decodeResponse<T>(response: Response, responseType: 'json' | 'text' | 'binary' | 'void'): Promise<T> {
    switch (responseType) {
      case 'text':
        return (await response.text()) as T;
      case 'binary':
        return new Uint8Array(await response.arrayBuffer()) as T;
      case 'void':
        await response.body?.cancel().catch(() => undefined);
        return undefined as T;
      case 'json': {
        const text = await response.text();
        if (response.status === 204 || text === '') return undefined as T;
        try {
          return JSON.parse(text) as T;
        } catch {
          throw new WebshareError(`Could not parse response body as JSON: ${text.slice(0, 200)}`);
        }
      }
    }
  }
}

/** Builds the `Authorization` header value. Single place that knows the scheme. */
function authorizationHeader(token: string): string {
  return `Token ${token}`;
}

function serializeQuery(query: Query | undefined): string {
  if (query === undefined) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      // Lists are comma-joined (used by `__in` style filters).
      params.set(key, value.map(String).join(','));
    } else if (typeof value === 'boolean') {
      params.set(key, value ? 'true' : 'false');
    } else {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

function backoffMs(attempt: number): number {
  // Exponential backoff with full jitter: base 0.5s, cap 8s.
  const cap = Math.min(BACKOFF_CAP_SECONDS, BACKOFF_BASE_SECONDS * 2 ** attempt);
  return Math.random() * cap * 1000;
}

function retryAfterMs(response: Response): number | null {
  const header = response.headers.get('retry-after');
  if (header === null) return null;
  let seconds = Number(header);
  if (Number.isNaN(seconds)) {
    const date = Date.parse(header);
    if (Number.isNaN(date)) return null;
    seconds = (date - Date.now()) / 1000;
  }
  if (seconds < 0) return null;
  return Math.min(seconds, RETRY_AFTER_CAP_SECONDS) * 1000;
}

function sleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason instanceof Error ? signal.reason : new DOMException('This operation was aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
