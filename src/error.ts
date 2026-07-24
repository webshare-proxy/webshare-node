/** Base class for every error thrown by this SDK. */
export class WebshareError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Maximum number of bytes of an error response body that is captured. */
export const MAX_ERROR_BODY_BYTES = 1024 * 1024;
/** Maximum length of the human-facing `detail` / error message. */
export const MAX_DETAIL_LENGTH = 2048;

/**
 * An error response returned by the Webshare API (any non-2xx HTTP status).
 *
 * Instances are always one of the per-status subclasses when the status maps
 * to one ({@link BadRequestError}, {@link AuthenticationError},
 * {@link PermissionDeniedError}, {@link NotFoundError}, {@link RateLimitError},
 * {@link InternalServerError}).
 */
export class APIError extends WebshareError {
  /** HTTP status code of the response. */
  readonly status: number;
  /**
   * Machine-readable API error code from the response body when present
   * (e.g. `2fa_needed`, `account_deleted`, `account_suspended`).
   */
  readonly code: string | null;
  /** Value of the `X-Request-ID` response header when present. */
  readonly requestID: string | null;
  /** Human-readable error message (truncated to ~2 KB). */
  readonly detail: string;
  /**
   * Per-field validation errors from DRF-style bodies such as
   * `{"mode": ["This field is required."]}`. Empty object when none.
   */
  readonly fieldErrors: Record<string, string[]>;
  /**
   * The raw response body (capture capped at 1 MiB): parsed JSON when the
   * body was JSON, otherwise the raw text.
   */
  readonly body: unknown;
  /**
   * Seconds parsed from the `Retry-After` response header, or null when
   * absent/unparseable. Useful to self-throttle calls the SDK does not retry
   * (e.g. a 429 on POST).
   */
  readonly retryAfter: number | null;

  constructor(
    status: number,
    detail: string,
    opts: {
      code?: string | null;
      requestID?: string | null;
      fieldErrors?: Record<string, string[]>;
      body?: unknown;
      retryAfter?: number | null;
    } = {},
  ) {
    const truncated = truncate(detail, MAX_DETAIL_LENGTH);
    super(`${status} ${truncated}`);
    this.status = status;
    this.detail = truncated;
    this.code = opts.code ?? null;
    this.requestID = opts.requestID ?? null;
    this.fieldErrors = opts.fieldErrors ?? {};
    this.body = opts.body;
    this.retryAfter = opts.retryAfter ?? null;
  }

  /**
   * Builds the appropriate APIError subclass from a raw response body.
   * Body parsing is tolerant: accepts `{"detail": "..."}` bodies, DRF
   * field-error maps, bare JSON strings and non-JSON bodies.
   */
  static generate(
    status: number,
    rawBody: string,
    requestID: string | null,
    statusText: string,
    retryAfter: number | null = null,
  ): APIError {
    const parsed = parseErrorBody(rawBody);
    const detail =
      parsed.detail ??
      formatFieldErrors(parsed.fieldErrors) ??
      (rawBody.trim() !== '' ? rawBody.trim() : statusText || 'Request failed');

    const opts = {
      code: parsed.code,
      requestID,
      fieldErrors: parsed.fieldErrors,
      body: parsed.body,
      retryAfter,
    };

    if (status === 400) return new BadRequestError(status, detail, opts);
    if (status === 401) return new AuthenticationError(status, detail, opts);
    if (status === 403) return new PermissionDeniedError(status, detail, opts);
    if (status === 404) return new NotFoundError(status, detail, opts);
    if (status === 429) return new RateLimitError(status, detail, opts);
    if (status >= 500) return new InternalServerError(status, detail, opts);
    return new APIError(status, detail, opts);
  }
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

function parseErrorBody(rawBody: string): {
  body: unknown;
  detail: string | null;
  code: string | null;
  fieldErrors: Record<string, string[]>;
} {
  let body: unknown = rawBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    // Non-JSON body: keep the raw text.
  }

  let detail: string | null = null;
  let code: string | null = null;
  const fieldErrors: Record<string, string[]> = {};

  if (typeof body === 'string') {
    detail = body.trim() !== '' ? body : null;
  } else if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
    const record = body as Record<string, unknown>;
    if (typeof record['detail'] === 'string') detail = record['detail'];
    if (typeof record['code'] === 'string') code = record['code'];
    for (const [key, value] of Object.entries(record)) {
      if (key === 'detail' || key === 'code') continue;
      const messages = extractFieldErrorMessages(value);
      if (messages !== null) fieldErrors[key] = messages;
    }
  }

  return { body, detail, code, fieldErrors };
}

/**
 * Extracts the messages of one field-error entry. The live API returns lists
 * of objects (`[{"message": "...", "code": "required"}]`) while the docs show
 * lists of strings; both are accepted (mixed lists included).
 */
function extractFieldErrorMessages(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const messages: string[] = [];
  for (const item of value) {
    if (typeof item === 'string') {
      messages.push(item);
    } else if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
      const message = (item as Record<string, unknown>)['message'];
      if (typeof message !== 'string') return null;
      messages.push(message);
    } else {
      return null;
    }
  }
  return messages;
}

function formatFieldErrors(fieldErrors: Record<string, string[]>): string | null {
  const entries = Object.entries(fieldErrors);
  if (entries.length === 0) return null;
  return entries.map(([field, messages]) => `${field}: ${messages.join(' ')}`).join('; ');
}

/**
 * Parses a `Retry-After` header into seconds. Returns null (treat the header
 * as absent) for whitespace, NaN, negative values, unparseable dates and
 * HTTP-dates in the past. Naive HTTP-dates (no timezone) are treated as UTC.
 */
export function parseRetryAfter(header: string | null): number | null {
  if (header === null) return null;
  const trimmed = header.trim();
  if (trimmed === '') return null;
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const seconds = Number(trimmed);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
  }
  const hasZone = /(GMT|UTC|Z|[+-]\d{2}:?\d{2})\s*$/i.test(trimmed);
  const parsed = Date.parse(hasZone ? trimmed : `${trimmed} GMT`);
  if (Number.isNaN(parsed)) return null;
  const seconds = (parsed - Date.now()) / 1000;
  return seconds >= 0 ? seconds : null;
}

/** 400 Bad Request. */
export class BadRequestError extends APIError {}
/** 401 Unauthorized. */
export class AuthenticationError extends APIError {}
/** 403 Forbidden. Check `code` for `2fa_needed`, `account_deleted` or `account_suspended`. */
export class PermissionDeniedError extends APIError {}
/** 404 Not Found. */
export class NotFoundError extends APIError {}
/** 429 Too Many Requests. */
export class RateLimitError extends APIError {}
/** Any 5xx server error. */
export class InternalServerError extends APIError {}

/**
 * A 2xx response carried a body the SDK could not decode (non-JSON or
 * structurally invalid, e.g. a malformed pagination envelope).
 */
export class ResponseDecodeError extends WebshareError {
  /** HTTP status of the response that failed to decode. */
  readonly status: number;
  /** A snippet of the raw response body (truncated). */
  readonly bodyText: string;

  constructor(message: string, status: number, bodyText: string) {
    super(message);
    this.status = status;
    this.bodyText = truncate(bodyText, MAX_DETAIL_LENGTH);
  }
}

/** A request failed to reach the API (DNS failure, refused connection, ...). */
export class APIConnectionError extends WebshareError {
  override readonly cause?: unknown;

  constructor(message = 'Connection error.', cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

/** A request timed out before the response (including its body) was fully received. */
export class APIConnectionTimeoutError extends APIConnectionError {
  constructor(message = 'Request timed out.') {
    super(message);
  }
}
