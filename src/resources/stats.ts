import type { RequestOptions } from '../client.js';
import type { AggregateStats, CountMap, StatsErrorReason } from './shared.js';
import { APIResource } from './base.js';

/** An hourly proxy usage stat entry. */
export interface ProxyStat {
  /** The timestamp of the stat; always aggregated per hour (ISO 8601). */
  timestamp: string;
  /** Whether the stat is projected (future) or real. */
  is_projected: boolean;
  /** Total bandwidth use in bytes for the 1 hour window. */
  bandwidth_total: number;
  /** Average bandwidth in bytes per request. */
  bandwidth_average: number;
  /** Number of proxy requests made. */
  requests_total: number;
  /** Number of successful proxy requests. */
  requests_successful: number;
  /** Number of proxy requests failed. */
  requests_failed: number;
  /** List of error reasons. `[]` if `is_projected` is true. */
  error_reasons: StatsErrorReason[];
  /** Number of proxy requests per country code. `{}` if projected. */
  countries_used: CountMap;
  /** Number of unique proxy addresses used (estimated). `0` if projected. */
  number_of_proxies_used: number;
  /** Number of requests per proxy protocol (`http` or `socks`). `{}` if projected. */
  protocols_used: CountMap;
  /** Average number of concurrent proxy requests (estimated). Null if projected. */
  average_concurrency: number | null;
  /** Average proxy requests per second (estimated). Null if projected. */
  average_rps: number | null;
  /** The time the last proxy request was sent within the window. Null if projected. */
  last_request_sent_at: string | null;
}

export interface StatsListParams {
  /**
   * The timestamp (ISO 8601) of the stats will be less than this. A future
   * date includes projected stats. Cannot be after `subscription.end_date`.
   */
  timestamp__lte?: string;
  /**
   * The timestamp (ISO 8601) of the stats will be greater than this. Must be
   * before `timestamp__lte`; cannot be older than 90 days.
   */
  timestamp__gte?: string;
  /** Target a specific plan; otherwise the default plan is used. */
  plan_id?: number;
}

export type StatsAggregateParams = StatsListParams;

export type { AggregateStats };

export class Stats extends APIResource {
  /**
   * Lists hourly proxy stats within a time period. NOT paginated — returns a
   * bare array. Hours without proxy usage have no stat object.
   */
  list(params?: StatsListParams, options?: RequestOptions): Promise<ProxyStat[]> {
    return this._client.request({ method: 'GET', path: '/api/v2/stats/', query: { ...params } }, options);
  }

  /** Aggregates the proxy stats for the given period. */
  aggregate(params?: StatsAggregateParams, options?: RequestOptions): Promise<AggregateStats> {
    return this._client.request({ method: 'GET', path: '/api/v2/stats/aggregate/', query: { ...params } }, options);
  }
}
