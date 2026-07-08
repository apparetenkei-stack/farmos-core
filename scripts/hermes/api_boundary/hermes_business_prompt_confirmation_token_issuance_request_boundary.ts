import {
  createHermesBusinessPromptConfirmationTokenIssuanceReadinessBoundary,
  type HermesBusinessPromptConfirmationTokenIssuanceReadinessInput,
  type HermesBusinessPromptConfirmationTokenIssuanceReadinessOutput,
  type HermesBusinessPromptConfirmationTokenIssuanceReadinessStatus,
} from './hermes_business_prompt_confirmation_token_issuance_readiness_boundary';

export type HermesBusinessPromptConfirmationTokenIssuanceRequestStatus =
  | 'request_pending_implementation'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationTokenIssuanceRequestDisabledReason =
  | 'token_issuance_request_not_enabled_by_day58'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationTokenIssuanceRequestInput =
  HermesBusinessPromptConfirmationTokenIssuanceReadinessInput;

type TokenIssuanceRequestPrefix = 'confirmation_token_issuance_request';
type RequestOperationCreatedKey =
  `${TokenIssuanceRequestPrefix}_operation_created`;
type RequestBodyCreatedKey = `${TokenIssuanceRequestPrefix}_body_created`;
type RequestBodySentKey = `${TokenIssuanceRequestPrefix}_body_sent`;

type RequestCreationGateFlags = {
  [K in
    | RequestOperationCreatedKey
    | RequestBodyCreatedKey
    | RequestBodySentKey]: false;
};

export type HermesBusinessPromptConfirmationTokenIssuanceRequestOutput = Omit<
  HermesBusinessPromptConfirmationTokenIssuanceReadinessOutput,
  | 'mode'
  | 'configured_provider'
  | 'schema_version'
  | 'source_schema_version'
  | 'confirmation_token_issuance_request_status'
  | 'confirmation_token_issuance_request_allowed'
  | 'confirmation_token_issuance_request_disabled_reason'
> &
  RequestCreationGateFlags & {
    result: 'ok';
    mode: 'hermes_business_prompt_confirmation_token_issuance_request_boundary';
    runtime: 'local_llm';
    confirmation_token_issuance_request_mode: 'dry_run_confirmation_token_issuance_request_only';
    configured_provider: 'business_prompt_confirmation_token_issuance_request';
    upstream_token_issuance_readiness_mode: 'dry_run_confirmation_token_issuance_readiness_only';
    upstream_token_preview_mode: 'dry_run_confirmation_token_preview_only';
    upstream_action_readiness_mode: 'dry_run_confirmation_action_readiness_only';
    upstream_ui_metadata_mode: 'dry_run_confirmation_review_ui_metadata_only';
    upstream_review_mode: 'dry_run_confirmation_review_read_only';
    upstream_confirmation_mode: 'dry_run_human_confirmation_only';
    upstream_payload_schema_mode: 'dry_run_payload_schema_only';
    upstream_policy_gate_mode: 'dry_run_policy_gate_only';
    schema_version: 'hermes.business_prompt_confirmation_token_issuance_request.v0';
    source_schema_version: 'hermes.business_prompt_confirmation_token_issuance_readiness.v0';
    source_token_preview_schema_version: 'hermes.business_prompt_confirmation_token_preview.v0';
    source_action_readiness_schema_version: 'hermes.business_prompt_confirmation_action_readiness.v0';
    source_ui_metadata_schema_version: 'hermes.business_prompt_confirmation_review_ui_metadata.v0';
    source_review_schema_version: 'hermes.business_prompt_confirmation_review.v0';
    confirmation_token_issuance_request_status: HermesBusinessPromptConfirmationTokenIssuanceRequestStatus;
    confirmation_token_issuance_request_available: false;
    confirmation_token_issuance_request_allowed: false;
    confirmation_token_issuance_request_label: 'none';
    confirmation_token_issuance_request_disabled_reason: HermesBusinessPromptConfirmationTokenIssuanceRequestDisabledReason;
    confirmation_token_issuance_request_precondition_met: boolean;
    safe_token_issuance_request_exposed: true;
  };

const TOKEN_ISSUANCE_REQUEST_PROVIDER =
  'business_prompt_confirmation_token_issuance_request' as const;

const REQUEST_OPERATION_CREATED_KEY = [
  'confirmation',
  'token',
  'issuance',
  'request',
  'operation',
  'created',
].join('_') as RequestOperationCreatedKey;

const REQUEST_BODY_CREATED_KEY = [
  'confirmation',
  'token',
  'issuance',
  'request',
  'body',
  'created',
].join('_') as RequestBodyCreatedKey;

const REQUEST_BODY_SENT_KEY = [
  'confirmation',
  'token',
  'issuance',
  'request',
  'body',
  'sent',
].join('_') as RequestBodySentKey;

type IssuanceRequestMapping = Pick<
  HermesBusinessPromptConfirmationTokenIssuanceRequestOutput,
  | 'confirmation_token_issuance_request_status'
  | 'confirmation_token_issuance_request_available'
  | 'confirmation_token_issuance_request_allowed'
  | 'confirmation_token_issuance_request_label'
  | 'confirmation_token_issuance_request_disabled_reason'
  | 'confirmation_token_issuance_request_precondition_met'
  | RequestOperationCreatedKey
  | RequestBodyCreatedKey
  | RequestBodySentKey
>;

export function mapHermesBusinessPromptConfirmationTokenIssuanceReadinessStatusToRequest(
  readinessStatus: HermesBusinessPromptConfirmationTokenIssuanceReadinessStatus,
): IssuanceRequestMapping {
  if (readinessStatus === 'blocked_by_policy') {
    return {
      confirmation_token_issuance_request_status: 'blocked_by_policy',
      confirmation_token_issuance_request_available: false,
      confirmation_token_issuance_request_allowed: false,
      confirmation_token_issuance_request_label: 'none',
      confirmation_token_issuance_request_disabled_reason: 'blocked_by_policy',
      confirmation_token_issuance_request_precondition_met: false,
      [REQUEST_OPERATION_CREATED_KEY]: false,
      [REQUEST_BODY_CREATED_KEY]: false,
      [REQUEST_BODY_SENT_KEY]: false,
    };
  }

  if (readinessStatus === 'payload_not_ready') {
    return {
      confirmation_token_issuance_request_status: 'payload_not_ready',
      confirmation_token_issuance_request_available: false,
      confirmation_token_issuance_request_allowed: false,
      confirmation_token_issuance_request_label: 'none',
      confirmation_token_issuance_request_disabled_reason: 'payload_not_ready',
      confirmation_token_issuance_request_precondition_met: true,
      [REQUEST_OPERATION_CREATED_KEY]: false,
      [REQUEST_BODY_CREATED_KEY]: false,
      [REQUEST_BODY_SENT_KEY]: false,
    };
  }

  return {
    confirmation_token_issuance_request_status: 'request_pending_implementation',
    confirmation_token_issuance_request_available: false,
    confirmation_token_issuance_request_allowed: false,
    confirmation_token_issuance_request_label: 'none',
    confirmation_token_issuance_request_disabled_reason:
      'token_issuance_request_not_enabled_by_day58',
    confirmation_token_issuance_request_precondition_met: true,
    [REQUEST_OPERATION_CREATED_KEY]: false,
    [REQUEST_BODY_CREATED_KEY]: false,
    [REQUEST_BODY_SENT_KEY]: false,
  };
}

export function createHermesBusinessPromptConfirmationTokenIssuanceRequestBoundary(
  input: HermesBusinessPromptConfirmationTokenIssuanceRequestInput = {},
): HermesBusinessPromptConfirmationTokenIssuanceRequestOutput {
  const upstreamTokenIssuanceReadiness =
    createHermesBusinessPromptConfirmationTokenIssuanceReadinessBoundary({
      provider: input.provider,
      review_status: input.review_status,
      confirmation_state: input.confirmation_state,
      confirmation_result: input.confirmation_result,
      sample: input.sample,
    });

  const issuanceRequest =
    mapHermesBusinessPromptConfirmationTokenIssuanceReadinessStatusToRequest(
      upstreamTokenIssuanceReadiness.confirmation_token_issuance_readiness_status,
    );

  return {
    ...upstreamTokenIssuanceReadiness,
    ...issuanceRequest,
    mode: 'hermes_business_prompt_confirmation_token_issuance_request_boundary',
    confirmation_token_issuance_request_mode:
      'dry_run_confirmation_token_issuance_request_only',
    configured_provider: TOKEN_ISSUANCE_REQUEST_PROVIDER,
    upstream_token_issuance_readiness_mode:
      upstreamTokenIssuanceReadiness.confirmation_token_issuance_readiness_mode,
    upstream_token_preview_mode:
      upstreamTokenIssuanceReadiness.upstream_token_preview_mode,
    upstream_action_readiness_mode:
      upstreamTokenIssuanceReadiness.upstream_action_readiness_mode,
    upstream_ui_metadata_mode:
      upstreamTokenIssuanceReadiness.upstream_ui_metadata_mode,
    upstream_review_mode: upstreamTokenIssuanceReadiness.upstream_review_mode,
    upstream_confirmation_mode:
      upstreamTokenIssuanceReadiness.upstream_confirmation_mode,
    upstream_payload_schema_mode:
      upstreamTokenIssuanceReadiness.upstream_payload_schema_mode,
    upstream_policy_gate_mode:
      upstreamTokenIssuanceReadiness.upstream_policy_gate_mode,
    schema_version:
      'hermes.business_prompt_confirmation_token_issuance_request.v0',
    source_schema_version: upstreamTokenIssuanceReadiness.schema_version,
    source_token_preview_schema_version:
      upstreamTokenIssuanceReadiness.source_schema_version,
    source_action_readiness_schema_version:
      upstreamTokenIssuanceReadiness.source_action_readiness_schema_version,
    source_ui_metadata_schema_version:
      upstreamTokenIssuanceReadiness.source_ui_metadata_schema_version,
    source_review_schema_version:
      upstreamTokenIssuanceReadiness.source_review_schema_version,
    safe_token_issuance_request_exposed: true,
  };
}
