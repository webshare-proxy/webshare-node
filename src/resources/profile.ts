import type { RequestOptions } from '../client.js';
import { APIResource } from './base.js';

/** The user profile. */
export interface UserProfile {
  /** Unique identifier of the profile instance. */
  id: number;
  /** Email address of the user (read-only). */
  email: string;
  /** First name of the user. Can be set to empty. */
  first_name: string;
  /** Last name of the user. Can be set to empty. */
  last_name: string;
  /** The date the user last logged in (read-only). */
  last_login: string;
  /** The preferred timezone set by the user. */
  timezone: string;
  /** Subscribed to email notifications for bandwidth usage. */
  subscribed_bandwidth_usage_notifications: boolean;
  /** Subscribed to email notifications for subscription updates. */
  subscribed_subscription_notifications: boolean;
  /** Subscribed to email notifications for proxy usage statistics/insights. */
  subscribed_proxy_usage_statistics: boolean;
  /** Subscribed to email notifications for proxy usage warnings. */
  subscribed_usage_warnings: boolean;
  /** Subscribed to email notifications for guides and tips. */
  subscribed_guides_and_tips: boolean;
  /** Subscribed to email notifications for surveys. */
  subscribed_survey_emails: boolean;
  /** Unique ID for this user; may be used to identify the user with external services. */
  tracking_id: string;
  /** AnnounceKit user token. Observed on the live API but undocumented. */
  announce_kit_user_token?: string;
  /** Help Scout beacon signature. Observed on the live API but undocumented. */
  helpscout_beacon_signature?: string;
  /** Intercom identity-verification signature. Observed on the live API but undocumented. */
  intercom_signature?: string;
  /** Whether the account is a VIP customer. Observed on the live API but undocumented. */
  is_vip_customer?: boolean;
  /** The date the user registered (read-only). */
  created_at: string;
  /** The timestamp when this instance was last updated. */
  updated_at: string;
}

export interface ProfileUpdateParams {
  first_name?: string;
  last_name?: string;
  timezone?: string;
  subscribed_bandwidth_usage_notifications?: boolean;
  subscribed_subscription_notifications?: boolean;
  subscribed_proxy_usage_statistics?: boolean;
  subscribed_usage_warnings?: boolean;
  subscribed_guides_and_tips?: boolean;
  subscribed_survey_emails?: boolean;
}

/** The user preferences. */
export interface UserPreferences {
  id: number;
  /** When the customer satisfaction survey was dismissed. May be null. */
  customer_satisfaction_survey_last_dismissed_at: string | null;
  /** When the customer satisfaction survey was completed. May be null. */
  customer_satisfaction_survey_last_completed_at: string | null;
  /** When the onboarding activity page was viewed. May be null. */
  onboarding_activity_page_viewed_at: string | null;
  /** Observed on the live API but undocumented. */
  created_at?: string;
  /** Observed on the live API but undocumented. */
  updated_at?: string;
}

export interface PreferencesUpdateParams {
  customer_satisfaction_survey_last_dismissed_at?: string;
  customer_satisfaction_survey_last_completed_at?: string;
  onboarding_activity_page_viewed_at?: string;
}

export class Profile extends APIResource {
  /** Retrieves the user profile. */
  get(options?: RequestOptions): Promise<UserProfile> {
    return this._client.request({ method: 'GET', path: '/api/v2/profile/' }, options);
  }

  /** Updates the user profile (partial update). */
  update(params: ProfileUpdateParams, options?: RequestOptions): Promise<UserProfile> {
    return this._client.request({ method: 'PATCH', path: '/api/v2/profile/', body: params }, options);
  }

  /** Retrieves the user preferences. */
  getPreferences(options?: RequestOptions): Promise<UserPreferences> {
    return this._client.request({ method: 'GET', path: '/api/v2/profile/preferences/' }, options);
  }

  /** Updates the user preferences; send any subset of the fields. */
  updatePreferences(params: PreferencesUpdateParams, options?: RequestOptions): Promise<UserPreferences> {
    return this._client.request({ method: 'PATCH', path: '/api/v2/profile/preferences/', body: params }, options);
  }
}
