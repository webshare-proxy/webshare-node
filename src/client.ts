import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  MAX_ERROR_BODY_BYTES,
  ResponseDecodeError,
  WebshareError,
  parseRetryAfter,
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
import { Profile } from './resources/profile.js';
import { Notifications } from './resources/notifications.js';
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
 * request attempt, so short-lived credentials (e.g. OAuth tokens) refreshed
 * mid-backoff are picked up by retries.
 */
export type CredentialsProvider = () => string | Promise<string>;

/** A minimal fetch signature compatible with the global `fetch`. */
export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export interface ClientOptions {
  /**
   * Webshare API key. Defaults to the `WEBSHARE_API_KEY` environment
   * variable (an empty string is treated as absent). Shorthand for a static
   * {@link CredentialsProvider}.
   */
  apiKey?: string;
  /**
   * Pluggable credentials provider; takes precedence over `apiKey`. The
   * returned value is sent as `Authorization: Token <value>`.
   */
  credentials?: CredentialsProvider;
  /**
   * Construct the client without credentials. Only operations that do not
   * require authentication (`referral.getCodeInfo` and the tokenized
   * download endpoints) can be called; authenticated operations throw a
   * client-side error.
   */
  unauthenticated?: boolean;
  /**
   * Base URL of the API (the bare host; operation paths carry their own
   * `/api/vN/...` prefix). Default `https://proxy.webshare.io`.
   */
  baseURL?: string;
  /**
   * Timeout in milliseconds for a single HTTP attempt, covering the full
   * response body read. Default 60000 (60 seconds). Total call time may
   * exceed it when retries and Retry-After waits apply.
   */
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
  /**
   * Value of the `X-Webshare-Source` header sent with every request for
   * API-side caller identification. Defaults to
   * `WebshareSDK/<version> (Node; <node version>)`. Replaces the whole
   * value; per-request headers still take precedence.
   */
  source?: string;
}

/** Options accepted by every resource method as the final argument. */
export interface RequestOptions {
  /**
   * Timeout in milliseconds for a single HTTP attempt of this request,
   * covering the full response body read. Total call time may exceed it when
   * retries and Retry-After waits apply.
   */
  timeout?: number;
  /** Extra headers for this request. A `null` value removes the header. */
  headers?: Record<string, string | null>;
  /** Maximum number of retries for this request. */
  maxRetries?: number;
  /** Sub-user ID for the `X-Subuser` header (overrides the client option). */
  subuserId?: string | number;
  /** User ID for the `X-Webshare-Federated-Access` header (overrides the client option). */
  federatedUserId?: string | number;
  /** Abort signal; aborting cancels the request (including the body read) and any pending retry. */
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

type AttemptResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: APIError; retryAfter: number | null; retryableStatus: boolean };

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

  private readonly credentials: CredentialsProvider | null;
  private readonly fetchFn: Fetch;
  private readonly defaultHeaders: Record<string, string>;
  private readonly subuserId: string | number | undefined;
  private readonly federatedUserId: string | number | undefined;
  private readonly retryNonIdempotent: boolean;
  private readonly source: string;

  readonly proxies: Proxies;
  readonly proxyConfig: ProxyConfig;
  readonly proxyReplacements: ProxyReplacements;
  readonly replacedProxies: ReplacedProxies;
  readonly stats: Stats;
  readonly proxyActivity: ProxyActivity;
  readonly downloadTokens: DownloadTokens;
  readonly ipAuthorizations: IPAuthorizations;
  readonly subusers: Subusers;
  readonly profile: Profile;
  readonly notifications: Notifications;
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
    // Empty-string API keys are treated as absent (fall back to env, then error).
    const apiKey = nonEmpty(options.apiKey) ?? nonEmpty(process.env['WEBSHARE_API_KEY']);
    if (options.credentials !== undefined) {
      this.credentials = options.credentials;
    } else if (apiKey !== undefined) {
      const key = apiKey;
      this.credentials = () => key;
    } else if (options.unauthenticated === true) {
      this.credentials = null;
    } else {
      throw new WebshareError(
        'Missing credentials. Pass an apiKey (new Webshare({ apiKey: "..." })), set the ' +
          'WEBSHARE_API_KEY environment variable, provide a credentials provider, or opt out ' +
          'with { unauthenticated: true } to call only unauthenticated endpoints.',
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
    this.source = options.source ?? defaultSource();

    this.proxies = new Proxies(this);
    this.proxyConfig = new ProxyConfig(this);
    this.proxyReplacements = new ProxyReplacements(this);
    this.replacedProxies = new ReplacedProxies(this);
    this.stats = new Stats(this);
    this.proxyActivity = new ProxyActivity(this);
    this.downloadTokens = new DownloadTokens(this);
    this.ipAuthorizations = new IPAuthorizations(this);
    this.subusers = new Subusers(this);
    this.profile = new Profile(this);
    this.notifications = new Notifications(this);
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
    const timeout = options.timeout ?? this.timeout;
    const maxRetries = options.maxRetries ?? this.maxRetries;
    const retryAllowed =
      IDEMPOTENT_METHODS.has(req.method) ||
      (options.retryNonIdempotent ?? this.retryNonIdempotent);

    for (let attempt = 0; ; attempt++) {
      const canRetry = retryAllowed && attempt < maxRetries;
      let result: AttemptResult<T>;
      try {
        result = await this.performAttempt<T>(req, url, timeout, options);
      } catch (err) {
        if (options.signal?.aborted) throw err;
        if (canRetry && err instanceof APIConnectionError) {
          await sleep(backoffMs(attempt), options.signal);
          continue;
        }
        throw err;
      }

      if (result.ok) return result.value;

      if (canRetry && result.retryableStatus) {
        const delay =
          result.retryAfter !== null
            ? Math.min(result.retryAfter, RETRY_AFTER_CAP_SECONDS) * 1000
            : backoffMs(attempt);
        await sleep(delay, options.signal);
        continue;
      }

      throw result.error;
    }
  }

  /**
   * Performs a single HTTP attempt. The per-attempt timeout and the caller's
   * abort signal cover the entire attempt, including consuming the response
   * body (both on the success path and when capturing an error body).
   */
  private async performAttempt<T>(
    req: APIRequest,
    url: string,
    timeout: number,
    options: RequestOptions,
  ): Promise<AttemptResult<T>> {
    options.signal?.throwIfAborted();
    // Credentials are fetched per attempt so refreshed tokens are picked up.
    const headers = await this.buildHeaders(req, options);
    const body =
      req.form !== undefined ? req.form
      : req.body !== undefined ? JSON.stringify(req.body)
      : undefined;

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeout);
    const onAbort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener('abort', onAbort, { once: true });

    const mapTransportError = (err: unknown): never => {
      if (options.signal?.aborted) throw err;
      if (timedOut) throw new APIConnectionTimeoutError(`Request timed out after ${timeout} ms.`);
      throw new APIConnectionError('Connection error.', err);
    };

    try {
      let response: Response;
      try {
        response = await this.fetchFn(url, { method: req.method, headers, body, signal: controller.signal });
      } catch (err) {
        return mapTransportError(err);
      }

      if (response.ok) {
        try {
          return { ok: true, value: await this.decodeResponse<T>(response, req.responseType ?? 'json') };
        } catch (err) {
          // Decode-shape failures pass through; aborted/stalled body reads map
          // to timeout/connection errors like any transport failure.
          if (err instanceof ResponseDecodeError) throw err;
          return mapTransportError(err);
        }
      }

      const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
      const requestID = response.headers.get('x-request-id');
      let rawBody = '';
      try {
        rawBody = await readBodyCapped(response, MAX_ERROR_BODY_BYTES);
      } catch (err) {
        // The error body could not be read; a stalled/aborted read still maps
        // to a transport error, otherwise the status alone is enough.
        if (timedOut || options.signal?.aborted) return mapTransportError(err);
      }
      return {
        ok: false,
        error: APIError.generate(response.status, rawBody, requestID, response.statusText, retryAfter),
        retryAfter,
        retryableStatus: RETRYABLE_STATUSES.has(response.status),
      };
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', onAbort);
    }
  }

  /** @internal Performs a paginated GET and wraps the envelope in a {@link Page}. */
  async requestPage<T>(path: string, query: Query | undefined, options: RequestOptions = {}): Promise<Page<T>> {
    const fetchURL = async (url: string): Promise<PageEnvelope<T>> => {
      this.assertSameOrigin(url);
      return validateEnvelope<T>(await this.request<unknown>({ method: 'GET', url }, options));
    };
    const envelope = validateEnvelope<T>(await this.request<unknown>({ method: 'GET', path, query }, options));
    return new Page(fetchURL, envelope);
  }

  /**
   * Refuses to follow envelope-provided absolute URLs (pagination `next`)
   * whose origin differs from the client base URL, so the Authorization
   * header is never sent cross-origin.
   */
  private assertSameOrigin(url: string): void {
    let origin: string;
    try {
      origin = new URL(url).origin;
    } catch {
      throw new WebshareError(`Refusing to follow invalid pagination next URL: ${url}`);
    }
    const baseOrigin = new URL(this.baseURL).origin;
    if (origin !== baseOrigin) {
      throw new WebshareError(
        `Refusing to follow pagination next URL with origin ${origin}: it does not match the ` +
          `client baseURL origin ${baseOrigin}. Credentials are never sent cross-origin.`,
      );
    }
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
      'X-Webshare-Source': this.source,
    });
    if (req.body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }
    if (req.auth !== false) {
      if (this.credentials === null) {
        throw new WebshareError(
          'This operation requires authentication, but the client was constructed with ' +
            '{ unauthenticated: true }. Provide an apiKey or a credentials provider to call ' +
            'authenticated endpoints.',
        );
      }
      headers.set('Authorization', authorizationHeader(await this.credentials()));
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
          throw new ResponseDecodeError(
            `Could not decode response body as JSON (HTTP ${response.status}).`,
            response.status,
            text,
          );
        }
      }
    }
  }
}

function nonEmpty(value: string | undefined): string | undefined {
  return value !== undefined && value !== '' ? value : undefined;
}

/** Default `X-Webshare-Source` value identifying the SDK and runtime. */
function defaultSource(): string {
  const runtime =
    typeof process !== 'undefined' && process.versions !== undefined && process.versions.node !== undefined
      ? process.versions.node
      : 'unknown';
  return `WebshareSDK/${VERSION} (Node; ${runtime})`;
}

/** Builds the `Authorization` header value. Single place that knows the scheme. */
function authorizationHeader(token: string): string {
  return `Token ${token}`;
}

function validateEnvelope<T>(value: unknown): PageEnvelope<T> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !Array.isArray((value as { results?: unknown }).results)
  ) {
    let snippet = '';
    try {
      snippet = JSON.stringify(value) ?? '';
    } catch {
      snippet = String(value);
    }
    throw new ResponseDecodeError('Expected a pagination envelope with a results array.', 200, snippet);
  }
  return value as PageEnvelope<T>;
}

/** Reads a response body as text, capped at `maxBytes` (excess is discarded). */
async function readBodyCapped(response: Response, maxBytes: number): Promise<string> {
  const body = response.body;
  if (body === null) return '';
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return Buffer.concat(chunks).subarray(0, maxBytes).toString('utf8');
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
