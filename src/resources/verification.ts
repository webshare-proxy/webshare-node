import type { RequestOptions, Webshare } from '../client.js';
import type { Page } from '../pagination.js';
import { APIResource } from './base.js';

export type VerificationFlowType = 'acceptable_use_violation' | 'abuse_report' | 'fraudulent_payment';
export type VerificationFlowState = 'inflow' | 'successful_verification' | 'failed_verification';

/** A file uploaded as part of verification evidence or an answer. */
export interface VerificationFile {
  id: number;
  file: string;
  created_at: string;
}

/** Evidence submitted for a verification flow. */
export interface VerificationEvidence {
  id: number;
  explanation: string;
  created_at: string;
  updated_at: string;
  files: VerificationFile[];
}

/** An account verification flow. */
export interface VerificationFlow {
  /** Unique identifier of the verification instance. */
  id: number;
  type: VerificationFlowType;
  state: VerificationFlowState;
  /** When this verification started (ISO 8601). */
  started_at: string;
  updated_at: string;
  /** Whether this verification requires evidence from the user. */
  needs_evidence: boolean;
  /** Evidence submitted for this verification. May be null. */
  evidence?: VerificationEvidence | null;
  /** Whether completing ID verification restores proxy access. */
  id_verification_restores_access: boolean;
  /** Whether this verification requires ID verification. */
  id_verification_required: boolean;
}

/** A file (or blob) accepted by multipart upload endpoints. */
export type Uploadable = File | Blob;

export interface SubmitEvidenceParams {
  /** The explanation submitted as part of the verification. */
  explanation?: string;
  /** Files submitted as part of the verification. */
  files?: Uploadable[];
}

export interface SubmitSecurityCodeParams {
  /** The two-character security code found in Webshare charges on the bank statement. */
  security_code?: string;
}

/** An answer submitted for a verification question. */
export interface VerificationAnswer {
  id: number;
  answer: string;
  created_at: string;
  updated_at: string;
  files: VerificationFile[];
}

/** A question submitted by the compliance team. */
export interface VerificationQuestion {
  id: number;
  question: string;
  created_at: string;
  updated_at: string;
  /** ID of the related verification flow. */
  flow: number;
  /** The answer submitted by the user, or null if not answered yet. */
  answer: VerificationAnswer | null;
}

export interface VerificationQuestionListParams {
  /** Match only questions whose verification flow has this type. */
  flow__type?: VerificationFlowType;
  /** Match only questions whose verification flow is in this state. */
  flow__state?: VerificationFlowState;
  /** `true` shows only questions without answers; `false` only questions with answers. */
  answer__isnull?: boolean;
  /** Flow start date is greater than this ISO 8601 timestamp. */
  flow__started_at__gte?: string;
  /** Flow start date is less than this ISO 8601 timestamp. */
  flow__started_at__lte?: string;
  /** Match only questions with the given question text. */
  question?: string;
  /** Match only questions with the given answer text. */
  answer__answer?: string;
  /** Page number. */
  page?: number;
  /** Number of results per page. */
  page_size?: number;
}

export interface SubmitAnswerParams {
  /** The answer to the question. */
  answer?: string;
  /** Attachments to submit with the answer (optional). */
  files?: Uploadable[];
}

export type VerificationAppealState = 'approved' | 'rejected' | 'submitted';

/** An appeal submitted for an account suspension. */
export interface VerificationAppeal {
  id: number;
  appeal: string;
  state: VerificationAppealState;
  created_at: string;
  updated_at: string;
}

export interface VerificationAppealListParams {
  /** Match only appeals in a specific state. */
  state?: VerificationAppealState;
  /** Page number. */
  page?: number;
  /** Number of results per page. */
  page_size?: number;
}

export interface VerificationAppealCreateParams {
  /** The appeal you want to submit for an account suspension. */
  appeal?: string;
}

/** An abuse report raised against the account. */
export interface VerificationAbuseReport {
  id: number;
  /** The content of the abuse report. */
  content: string;
  /** The related account verification flow ID. May be null. */
  flow: number | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationAbuseReportListParams {
  /** Page number. */
  page?: number;
  /** Number of results per page. */
  page_size?: number;
}

/** The account suspension record. */
export interface VerificationSuspension {
  created_at: string;
  reason: VerificationFlowType;
}

/** A verification category (the response is a map keyed by category name). */
export interface VerificationCategory {
  /** Description of the verification category. Can be user visible. */
  description: string;
  /** Deprecated; now always null. */
  request_threshold: number | null;
  /** Whether this category requires ID verification when triggered. */
  id_verification_required: boolean;
  /** Whether this category restores proxy access when ID verification completes. */
  id_verification_restores_access: boolean;
}

/** The verification limits applied to the account's proxies. */
export interface VerificationLimits {
  /** `limited` means slower proxies; `paused` means proxies are not working. */
  proxy_state: 'active' | 'limited' | 'paused';
}

/** A verification threshold (the response is a map keyed by category name). */
export interface VerificationThreshold {
  /** Description of the verification trigger. Can be user visible. */
  description: string;
  /** Whether this threshold requires ID verification when triggered. */
  id_verification_required: boolean;
  /** Whether this threshold restores proxy access when ID verification completes. */
  id_verification_restores_access: boolean;
  /** Number of proxy requests sent matching this verification trigger. */
  request_count: number;
  /** Deprecated; now always null. */
  request_threshold: number | null;
  /** Whether this verification threshold has been triggered. */
  triggered: boolean;
}

function buildMultipart(fields: Record<string, string | undefined>, files: Uploadable[] | undefined): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    if (value !== undefined) form.append(name, value);
  }
  if (files !== undefined) {
    for (const file of files) {
      if (file instanceof File) form.append('files', file, file.name);
      else form.append('files', file);
    }
  }
  return form;
}

/** Account verification flows (compliance). */
export class VerificationFlows extends APIResource {
  /** Lists account verifications in paginated format. */
  list(params?: { page?: number; page_size?: number }, options?: RequestOptions): Promise<Page<VerificationFlow>> {
    return this._client.requestPage('/api/v2/verification/flow/', { ...params }, options);
  }

  /** Retrieves an account verification. */
  get(id: number, options?: RequestOptions): Promise<VerificationFlow> {
    return this._client.request({ method: 'GET', path: `/api/v2/verification/flow/${id}/` }, options);
  }

  /** Submits evidence for a verification. Sent as `multipart/form-data`. */
  submitEvidence(id: number, params: SubmitEvidenceParams, options?: RequestOptions): Promise<VerificationFlow> {
    const form = buildMultipart({ explanation: params.explanation }, params.files);
    return this._client.request(
      { method: 'POST', path: `/api/v2/verification/flow/${id}/submit_evidence/`, form },
      options,
    );
  }

  /** Submits a security code (two characters from the bank statement) for a verification flow. */
  submitSecurityCode(id: number, params: SubmitSecurityCodeParams, options?: RequestOptions): Promise<VerificationFlow> {
    return this._client.request(
      { method: 'POST', path: `/api/v2/verification/flow/${id}/submit_verification_code/`, body: params },
      options,
    );
  }
}

/** Verification questions from the compliance team. */
export class VerificationQuestions extends APIResource {
  /** Lists verification questions in paginated format. */
  list(params?: VerificationQuestionListParams, options?: RequestOptions): Promise<Page<VerificationQuestion>> {
    return this._client.requestPage('/api/v2/verification/question/', { ...params }, options);
  }

  /** Submits an answer for a question, with optional attachments. Sent as `multipart/form-data`. */
  submitAnswer(questionId: number, params: SubmitAnswerParams, options?: RequestOptions): Promise<VerificationAnswer> {
    const form = buildMultipart({ answer: params.answer }, params.files);
    return this._client.request(
      { method: 'POST', path: `/api/v2/verification/question/${questionId}/answer/`, form },
      options,
    );
  }
}

/** Suspension appeals. */
export class VerificationAppeals extends APIResource {
  /** Lists the appeals submitted for the account in paginated format. */
  list(params?: VerificationAppealListParams, options?: RequestOptions): Promise<Page<VerificationAppeal>> {
    return this._client.requestPage('/api/v2/verification/appeal/', { ...params }, options);
  }

  /** Submits an appeal for an account suspension (one at a time). */
  create(params: VerificationAppealCreateParams, options?: RequestOptions): Promise<VerificationAppeal> {
    return this._client.request({ method: 'POST', path: '/api/v2/verification/appeal/', body: params }, options);
  }
}

/** Abuse reports raised against the account. */
export class VerificationAbuseReports extends APIResource {
  /** Lists the abuse reports raised against the account in paginated format. */
  list(params?: VerificationAbuseReportListParams, options?: RequestOptions): Promise<Page<VerificationAbuseReport>> {
    return this._client.requestPage('/api/v2/verification/abuse_report/', { ...params }, options);
  }
}

/** Account verification (compliance) APIs. */
export class Verification extends APIResource {
  readonly flows: VerificationFlows;
  readonly questions: VerificationQuestions;
  readonly appeals: VerificationAppeals;
  readonly abuseReports: VerificationAbuseReports;

  constructor(client: Webshare) {
    super(client);
    this.flows = new VerificationFlows(client);
    this.questions = new VerificationQuestions(client);
    this.appeals = new VerificationAppeals(client);
    this.abuseReports = new VerificationAbuseReports(client);
  }

  /** Returns when and why the account was suspended. Works even while suspended. */
  getSuspension(options?: RequestOptions): Promise<VerificationSuspension> {
    return this._client.request({ method: 'GET', path: '/api/v2/verification/suspension/' }, options);
  }

  /** Retrieves the verification categories. Returns a map keyed by category name. */
  getCategories(options?: RequestOptions): Promise<Record<string, VerificationCategory>> {
    return this._client.request({ method: 'GET', path: '/api/v2/verification/categories/' }, options);
  }

  /** Retrieves the verification limits which the account may have received. */
  getLimits(options?: RequestOptions): Promise<VerificationLimits> {
    return this._client.request({ method: 'GET', path: '/api/v2/verification/limits/' }, options);
  }

  /** Retrieves the verification thresholds. Returns a map keyed by category name. */
  getThresholds(options?: RequestOptions): Promise<Record<string, VerificationThreshold>> {
    return this._client.request({ method: 'GET', path: '/api/v2/verification/thresholds/' }, options);
  }
}
