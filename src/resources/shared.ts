/**
 * ASN map shape used by the proxy config and proxy list stats APIs:
 * `{ "1234": ["ASN NAME", 105] }` — a heterogeneous `[name, count]` tuple
 * keyed by ASN number.
 */
export type AsnMap = Record<string, [string, number]>;

/** Country code (or CIDR) to count maps used across the proxy config APIs. */
export type CountMap = Record<string, number>;

/** A single error-reason entry in proxy usage stats. */
export interface StatsErrorReason {
  /**
   * Code for the error. The same code is present in the
   * `X-Webshare-Error-Reason` header when making requests to the HTTP proxy
   * endpoint.
   */
  reason: string;
  /** Whether the error is a configuration or connection error. */
  type: 'configuration' | 'connection';
  /** Guide for the end-user on how to fix the error. */
  how_to_fix: string;
  /** HTTP status the proxy endpoint may return for this error. May be null. */
  http_status: number | null;
  /** Number of failed proxy requests with this error reason. */
  count: number;
}

/** Aggregated proxy usage stats (also embedded in sub-user objects). */
export interface AggregateStats {
  /** Projected bandwidth for the period, in bytes. */
  bandwidth_projected: number;
  /** Total bandwidth use in bytes. */
  bandwidth_total: number;
  /** Average bandwidth in bytes per request. */
  bandwidth_average: number;
  /** Number of proxy requests made. */
  requests_total: number;
  /** Number of successful proxy requests. */
  requests_successful: number;
  /** Number of proxy requests failed. */
  requests_failed: number;
  /** List of error reasons. */
  error_reasons: StatsErrorReason[];
  /** Number of proxy requests per country code. */
  countries_used: CountMap;
  /** Number of unique proxy addresses used (estimated). */
  number_of_proxies_used: number;
  /** Number of requests per proxy protocol (`http` or `socks`). */
  protocols_used: CountMap;
  /** Average number of concurrent proxy requests (estimated). May be null. */
  average_concurrency: number | null;
  /** Average proxy requests per second (estimated). May be null. */
  average_rps: number | null;
  /** The time the last proxy request was sent (ISO 8601). May be null. */
  last_request_sent_at: string | null;
}
