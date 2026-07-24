import type { RequestOptions } from '../client.js';
import { APIResource } from './base.js';

/** Response containing a login token usable to authorize API requests. */
export interface TokenResponse {
  token: string;
}

/** Response of register endpoints. */
export interface RegisterResponse {
  token: string;
  logged_in_existing_user: boolean;
}

/** The account activation status. */
export interface ActivationStatus {
  /** Whether the email is verified or not. */
  email_is_verified: boolean;
  /** Last time the account activation email was sent. May be null. */
  last_time_email_verification_email_sent: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegisterParams {
  /** Email address to register with. */
  email?: string;
  /** Password: 8 characters minimum, not too similar to the email, not all numeric, not a common password. */
  password?: string;
  /** The recaptcha token (can be invisible recaptcha). */
  recaptcha?: string;
  /** Must be `true` to process the request. */
  tos_accepted?: boolean;
  /** Whether the service should send marketing emails to the customer. */
  marketing_email_accepted?: boolean;
}

export interface RegisterSocialParams {
  /** Social provider; currently only `google` is supported. */
  provider?: 'google';
  /** The auth code received from the social provider. */
  code?: string;
  /** Must match the authorized redirect URIs in the Google credentials. */
  redirect_uri?: string;
  /** Must be `true` to process the request. */
  tos_accepted?: boolean;
  /** Whether the service should send marketing emails to the customer. */
  marketing_email_accepted?: boolean;
}

export interface LoginParams {
  /** Email address previously registered with. */
  email?: string;
  /** Password previously registered with. */
  password?: string;
  /** The recaptcha token (can be invisible recaptcha). */
  recaptcha?: string;
}

export interface LoginSocialParams {
  /** Social provider; currently only `google` is supported. */
  provider?: 'google';
  /** The auth code received from the social provider. */
  code?: string;
  /** Must match the authorized redirect URIs in the Google credentials. */
  redirect_uri?: string;
}

export interface ChangePasswordParams {
  /** Current password. */
  password?: string;
  /** New password. Must meet all password requirements. */
  new_password?: string;
}

export interface RequestPasswordResetParams {
  /** Email of the existing user. */
  email?: string;
  /** The recaptcha token (can be invisible recaptcha). */
  recaptcha?: string;
}

export interface CompletePasswordResetParams {
  /** The new password. */
  password?: string;
  /** The password reset token retrieved from the email. */
  password_reset_token?: string;
  /** The recaptcha token (can be invisible recaptcha). */
  recaptcha?: string;
}

export interface RequestEmailChangeParams {
  /** Password of the user. */
  password?: string;
  /** New email address to switch to. */
  new_email?: string;
}

export interface CompleteEmailChangeParams {
  /** Confirmation code retrieved from the email. */
  confirmation_code?: string;
}

export interface CompleteActivationParams {
  /** Activation token retrieved from the email. */
  activation_token?: string;
}

export interface DeleteAccountParams {
  /** Password of the user. */
  password?: string;
  /** The recaptcha token (can be invisible recaptcha). */
  recaptcha?: string;
}

export interface DeleteAccountSocialParams {
  /** Social provider; currently only `google` is supported. */
  provider?: 'google';
  /** The auth code received from the social provider. */
  code?: string;
  /** Must match the authorized redirect URIs in the Google credentials. */
  redirect_uri?: string;
}

/**
 * Session/dashboard authentication flows.
 *
 * Note: the API docs mark `register`, `login` and `deleteAccount` as
 * dashboard-only (they require recaptcha validation and should not be called
 * programmatically). They are included for completeness.
 */
export class Auth extends APIResource {
  /**
   * Registers a new account with email and password. Unauthenticated;
   * recaptcha-gated (dashboard-only per the docs).
   */
  register(params: RegisterParams, options?: RequestOptions): Promise<RegisterResponse> {
    return this._client.request({ method: 'POST', path: '/api/v2/register/', body: params, auth: false }, options);
  }

  /** Registers a new account with a social provider (Google OAuth2). Unauthenticated. */
  registerSocial(params: RegisterSocialParams, options?: RequestOptions): Promise<RegisterResponse> {
    return this._client.request(
      { method: 'POST', path: '/api/v2/register/social/', body: params, auth: false },
      options,
    );
  }

  /**
   * Logs in to an existing account with email and password. Unauthenticated;
   * recaptcha-gated (dashboard-only per the docs).
   */
  login(params: LoginParams, options?: RequestOptions): Promise<TokenResponse> {
    return this._client.request({ method: 'POST', path: '/api/v2/login/', body: params, auth: false }, options);
  }

  /** Logs in to an existing account with a social provider (Google OAuth2). Unauthenticated. */
  loginSocial(params: LoginSocialParams, options?: RequestOptions): Promise<TokenResponse> {
    return this._client.request({ method: 'POST', path: '/api/v2/login/social/', body: params, auth: false }, options);
  }

  /** Logs out and invalidates the token used to make this request. */
  logout(options?: RequestOptions): Promise<void> {
    return this._client.request({ method: 'POST', path: '/api/v2/logout/', responseType: 'void' }, options);
  }

  /**
   * Changes the current password. On success, all API tokens are disabled
   * except the current one.
   */
  changePassword(params: ChangePasswordParams, options?: RequestOptions): Promise<void> {
    return this._client.request(
      { method: 'POST', path: '/api/v2/changepassword/', body: params, responseType: 'void' },
      options,
    );
  }

  /**
   * Requests a password reset email. Unauthenticated; always returns 204 even
   * if the email is not found.
   */
  requestPasswordReset(params: RequestPasswordResetParams, options?: RequestOptions): Promise<void> {
    return this._client.request(
      { method: 'POST', path: '/api/v2/resetpassword/', body: params, auth: false, responseType: 'void' },
      options,
    );
  }

  /**
   * Completes a password reset using the token from the email. Unauthenticated;
   * recaptcha-gated. On success all previous tokens are invalidated and a new
   * token is returned.
   */
  completePasswordReset(params: CompletePasswordResetParams, options?: RequestOptions): Promise<TokenResponse> {
    return this._client.request(
      { method: 'POST', path: '/api/v2/resetpassword/complete/', body: params, auth: false },
      options,
    );
  }

  /** Requests an email change; on success an email is sent. */
  requestEmailChange(params: RequestEmailChangeParams, options?: RequestOptions): Promise<void> {
    return this._client.request(
      { method: 'POST', path: '/api/v2/changeemail/', body: params, responseType: 'void' },
      options,
    );
  }

  /** Completes the email change using the confirmation code from the email. Requires authentication. */
  completeEmailChange(params: CompleteEmailChangeParams, options?: RequestOptions): Promise<void> {
    return this._client.request(
      { method: 'POST', path: '/api/v2/changeemail/complete/', body: params, responseType: 'void' },
      options,
    );
  }

  /** Retrieves the current state of the account activation. */
  getActivation(options?: RequestOptions): Promise<ActivationStatus> {
    return this._client.request({ method: 'GET', path: '/api/v2/activation/' }, options);
  }

  /** Re-sends the activation email (rate limited). */
  resendActivation(options?: RequestOptions): Promise<ActivationStatus> {
    return this._client.request({ method: 'POST', path: '/api/v2/activation/resend/' }, options);
  }

  /**
   * Completes account activation using the token from the email. Returns a
   * new API token (the existing token keeps working). Authentication is
   * optional but encouraged; this client sends its credentials.
   */
  completeActivation(params: CompleteActivationParams, options?: RequestOptions): Promise<TokenResponse> {
    return this._client.request({ method: 'POST', path: '/api/v2/activation/complete/', body: params }, options);
  }

  /**
   * Deletes the Webshare account. Recaptcha-gated (dashboard-only per the
   * docs). After deletion all API requests return 403 with code
   * `account_deleted`.
   */
  deleteAccount(params: DeleteAccountParams, options?: RequestOptions): Promise<void> {
    return this._client.request(
      { method: 'POST', path: '/api/v2/deleteaccount/', body: params, responseType: 'void' },
      options,
    );
  }

  /** Deletes a Webshare account registered via a social provider. */
  deleteAccountSocial(params: DeleteAccountSocialParams, options?: RequestOptions): Promise<void> {
    return this._client.request(
      { method: 'POST', path: '/api/v2/deleteaccount/social/', body: params, responseType: 'void' },
      options,
    );
  }
}
