import type { RequestOptions } from '../client.js';
import { APIResource } from './base.js';

export type IDVerificationState = 'not-required' | 'requested' | 'pending' | 'processing' | 'failed' | 'verified';

/**
 * The ID verification object. Webshare uses Stripe Identity; the Stripe JS
 * library must be used to complete the verification.
 */
export interface IDVerificationObject {
  /** Unique identifier of this instance. */
  id: number;
  /** State of the current ID verification. */
  state: IDVerificationState;
  /** Client secret to use with the Stripe JS API. Null unless the state is `pending`. */
  client_secret: string | null;
  /** Number of times the ID verification has failed. */
  verification_failure_times: number;
  /** Maximum failures before the user can no longer initiate a new ID verification. */
  max_verification_failure_times: number;
  created_at: string;
  updated_at: string;
  /** When the account successfully completed the ID verification. May be null. */
  verified_at: string | null;
}

export class IDVerification extends APIResource {
  /** Retrieves the ID verification object. */
  get(options?: RequestOptions): Promise<IDVerificationObject> {
    return this._client.request({ method: 'GET', path: '/api/v2/idverification/' }, options);
  }
}
