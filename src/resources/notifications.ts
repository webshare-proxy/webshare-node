import type { RequestOptions } from '../client.js';
import type { Page } from '../pagination.js';
import { APIResource } from './base.js';

/**
 * An account notification (activity feed entry). Known types include
 * `too_much_bandwidth_too_little_proxies`, `unlimited_bandwidth_gets_throttled`,
 * `subscription_renew_failed`, `subscription_cc_will_expire_soon`,
 * `reminder_to_use_proxy`, `projected_proxy_usage_over_80`,
 * `projected_proxy_usage_over_100`, `high_concurrency_error`,
 * `100_percent_bandwidth_used`, `proxies_are_unallocated`, `question_is_added`.
 */
export interface Notification {
  /** The unique ID of the notification object. */
  id: number;
  /** The type of notification. */
  type: string;
  /** Whether this notification is dismissable by the end-user. */
  is_dismissable: boolean;
  /**
   * Additional context for this notification; keys vary by type (e.g. `plan`,
   * `plan_limit`, `effect`, `projected_bandwidth_gbs`).
   */
  context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  /** When this notification was dismissed. May be null. */
  dismissed_at: string | null;
}

export interface NotificationListParams {
  /**
   * Filter on whether `dismissed_at` is null. (The docs describe `true` as
   * "show only dismissed notifications", which appears inverted; `isnull=true`
   * normally matches notifications that are NOT dismissed.)
   */
  dismissed_at__isnull?: boolean;
  /** Default ordering is `-created_at`. Available fields: `id`, `created_at`, `dismissed_at`. */
  ordering?: string;
  /** Filter by type. */
  type?: string;
  /** Page number. */
  page?: number;
  /** Number of results per page. */
  page_size?: number;
}

export class Notifications extends APIResource {
  /** Lists notifications in paginated format. */
  list(params?: NotificationListParams, options?: RequestOptions): Promise<Page<Notification>> {
    return this._client.requestPage('/api/v2/notification/', { ...params }, options);
  }

  /** Retrieves a notification. */
  get(id: number, options?: RequestOptions): Promise<Notification> {
    return this._client.request({ method: 'GET', path: `/api/v2/notification/${id}/` }, options);
  }

  /** Dismisses a notification; returns it with `dismissed_at` set. */
  dismiss(id: number, options?: RequestOptions): Promise<Notification> {
    return this._client.request({ method: 'POST', path: `/api/v2/notification/${id}/dismiss/` }, options);
  }

  /** Restores a dismissed notification; returns it with `dismissed_at` cleared. */
  restore(id: number, options?: RequestOptions): Promise<Notification> {
    return this._client.request({ method: 'POST', path: `/api/v2/notification/${id}/restore/` }, options);
  }
}
