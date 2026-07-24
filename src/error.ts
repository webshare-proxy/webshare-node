/** Base class for every error thrown by this SDK. */
export class WebshareError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

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
  /** Human-readable error message. */
  readonly detail: string;
  /**
   * Per-field validation errors from DRF-style bodies such as
   * `{"mode": ["This field is required."]}`. Empty object when none.
   */
  readonly fieldErrors: Record<string, string[]>;
  /** The raw response body: parsed JSON when the body was JSON, otherwise the raw text. */
  readonly body: unknown;

  constructor(
    status: number,
    detail: string,
    opts: {
      code?: string | null;
      requestID?: string | null;
      fieldErrors?: Record<string, string[]>;
      body?: unknown;
    } = {},
  ) {
    super(`${status} ${detail}`);
    this.status = status;
    this.detail = detail;
    this.code = opts.code ?? null;
    this.requestID = opts.requestID ?? null;
    this.fieldErrors = opts.fieldErrors ?? {};
    this.body = opts.body;
  }

  /**
   * Builds the appropriate APIError subclass from a raw response body.
   * Body parsing is tolerant: accepts `{"detail": "..."}` bodies, DRF
   * field-error maps, bare JSON strings and non-JSON bodies.
   */
  static generate(status: number, rawBody: string, requestID: string | null, statusText: string): APIError {
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
      if (Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'string')) {
        fieldErrors[key] = value as string[];
      }
    }
  }

  return { body, detail, code, fieldErrors };
}

function formatFieldErrors(fieldErrors: Record<string, string[]>): string | null {
  const entries = Object.entries(fieldErrors);
  if (entries.length === 0) return null;
  return entries.map(([field, messages]) => `${field}: ${messages.join(' ')}`).join('; ');
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

/** A request failed to reach the API (DNS failure, refused connection, ...). */
export class APIConnectionError extends WebshareError {
  override readonly cause?: unknown;

  constructor(message = 'Connection error.', cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

/** A request timed out before a response was received. */
export class APIConnectionTimeoutError extends APIConnectionError {
  constructor(message = 'Request timed out.') {
    super(message);
  }
}
