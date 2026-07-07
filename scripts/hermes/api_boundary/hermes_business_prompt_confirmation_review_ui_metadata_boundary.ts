export type HermesBusinessPromptConfirmationReviewStatus =
  | 'needs_human_review'
  | 'blocked_by_policy'
  | 'not_ready';

export type HermesBusinessPromptConfirmationState =
  | 'required'
  | 'blocked'
  | 'not_configured';

export type HermesBusinessPromptConfirmationResult =
  | 'not_confirmed'
  | 'blocked'
  | 'not_configured';

export type HermesBusinessPromptConfirmationReviewUiStatus =
  | 'review_required'
  | 'blocked'
  | 'not_ready';

export type HermesBusinessPromptConfirmationReviewUiSeverity =
  | 'warning'
  | 'danger'
  | 'neutral';

export type HermesBusinessPromptConfirmationReviewUiDisabledReason =
  | 'confirmation_not_enabled_by_day54'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationReviewUiMetadataInput = {
  provider?: string;
  review_status?: HermesBusinessPromptConfirmationReviewStatus;
  confirmation_state?: HermesBusinessPromptConfirmationState;
  confirmation_result?: HermesBusinessPromptConfirmationResult;
  sample?: string;
};

export type HermesBusinessPromptConfirmationReviewUiMetadataOutput = {
  result: 'ok';
  mode: 'hermes_business_prompt_confirmation_review_ui_metadata_boundary';
  runtime: 'local_llm';
  ui_metadata_mode: 'dry_run_confirmation_review_ui_metadata_only';
  configured_provider: 'business_prompt_confirmation_review_ui_metadata';
  upstream_review_mode: 'dry_run_confirmation_review_read_only';
  upstream_confirmation_mode: 'dry_run_human_confirmation_only';
  upstream_payload_schema_mode: 'dry_run_payload_schema_only';
  upstream_policy_gate_mode: 'dry_run_policy_gate_only';
  schema_version: 'hermes.business_prompt_confirmation_review_ui_metadata.v0';
  source_schema_version: 'hermes.business_prompt_confirmation_review.v0';
  confirmation_required: true;
  human_confirmed: false;
  confirmation_state: HermesBusinessPromptConfirmationState;
  confirmation_result: HermesBusinessPromptConfirmationResult;
  review_status: HermesBusinessPromptConfirmationReviewStatus;
  ui_status: HermesBusinessPromptConfirmationReviewUiStatus;
  ui_severity: HermesBusinessPromptConfirmationReviewUiSeverity;
  ui_badge_label: '確認が必要' | '送信不可' | '未準備';
  ui_primary_message: string;
  ui_secondary_message: string;
  ui_action_available: false;
  ui_action_label: 'none';
  ui_disabled_reason: HermesBusinessPromptConfirmationReviewUiDisabledReason;
  safe_ui_metadata_exposed: true;
  safe_review_summary_exposed: true;
  raw_prompt_exposed: false;
  sanitized_prompt_included: false;
  business_context_included: false;
  proposal_body_included: false;
  restricted_domain_data_included: false;
  endpoint_value_exposed: false;
  model_value_exposed: false;
  credentials_exposed: false;
  confirmation_token_created: false;
  confirmation_token_exposed: false;
  confirmation_record_created: false;
  confirmation_record_saved: false;
  payload_send_allowed: false;
  runtime_call_allowed: false;
  request_body_created: false;
  request_body_sent: false;
  prompt_sent: false;
  response_body_exposed: false;
  selected_provider: 'mock';
  fallback_provider: 'mock';
  tokens_used: 0;
};

const UI_METADATA_PROVIDER = 'business_prompt_confirmation_review_ui_metadata' as const;

function inferReviewStatusFromSample(
  sample: string | undefined,
): HermesBusinessPromptConfirmationReviewStatus {
  const normalizedSample = String(sample ?? '').trim();

  if (normalizedSample.length === 0) {
    return 'not_ready';
  }

  if (
    /顧客|注文金額|取引先|単価|売上|請求|住所|電話|メール|個人情報|credential|secret|password|token/i.test(
      normalizedSample,
    )
  ) {
    return 'blocked_by_policy';
  }

  return 'needs_human_review';
}

function deriveConfirmationState(
  reviewStatus: HermesBusinessPromptConfirmationReviewStatus,
  explicitState: HermesBusinessPromptConfirmationState | undefined,
): HermesBusinessPromptConfirmationState {
  if (explicitState) {
    return explicitState;
  }

  if (reviewStatus === 'blocked_by_policy') {
    return 'blocked';
  }

  if (reviewStatus === 'not_ready') {
    return 'not_configured';
  }

  return 'required';
}

function deriveConfirmationResult(
  reviewStatus: HermesBusinessPromptConfirmationReviewStatus,
  explicitResult: HermesBusinessPromptConfirmationResult | undefined,
): HermesBusinessPromptConfirmationResult {
  if (explicitResult) {
    return explicitResult;
  }

  if (reviewStatus === 'blocked_by_policy') {
    return 'blocked';
  }

  if (reviewStatus === 'not_ready') {
    return 'not_configured';
  }

  return 'not_confirmed';
}

export function mapHermesBusinessPromptConfirmationReviewStatusToUiMetadata(
  reviewStatus: HermesBusinessPromptConfirmationReviewStatus,
): Pick<
  HermesBusinessPromptConfirmationReviewUiMetadataOutput,
  | 'ui_status'
  | 'ui_severity'
  | 'ui_badge_label'
  | 'ui_primary_message'
  | 'ui_secondary_message'
  | 'ui_action_available'
  | 'ui_action_label'
  | 'ui_disabled_reason'
> {
  if (reviewStatus === 'blocked_by_policy') {
    return {
      ui_status: 'blocked',
      ui_severity: 'danger',
      ui_badge_label: '送信不可',
      ui_primary_message: 'この内容はポリシーにより送信できません。',
      ui_secondary_message: 'Day54では安全な表示用メタデータのみを返します。',
      ui_action_available: false,
      ui_action_label: 'none',
      ui_disabled_reason: 'blocked_by_policy',
    };
  }

  if (reviewStatus === 'not_ready') {
    return {
      ui_status: 'not_ready',
      ui_severity: 'neutral',
      ui_badge_label: '未準備',
      ui_primary_message: '送信用payloadはまだ準備されていません。',
      ui_secondary_message: 'Day54では確認・送信・保存の導線は無効です。',
      ui_action_available: false,
      ui_action_label: 'none',
      ui_disabled_reason: 'payload_not_ready',
    };
  }

  return {
    ui_status: 'review_required',
    ui_severity: 'warning',
    ui_badge_label: '確認が必要',
    ui_primary_message: '送信前に人間による確認が必要です。',
    ui_secondary_message: 'Day54では確認ボタンと確認保存はまだ有効化しません。',
    ui_action_available: false,
    ui_action_label: 'none',
    ui_disabled_reason: 'confirmation_not_enabled_by_day54',
  };
}

export function createHermesBusinessPromptConfirmationReviewUiMetadataBoundary(
  input: HermesBusinessPromptConfirmationReviewUiMetadataInput = {},
): HermesBusinessPromptConfirmationReviewUiMetadataOutput {
  const reviewStatus =
    input.review_status ?? inferReviewStatusFromSample(input.sample);
  const mappedUiMetadata =
    mapHermesBusinessPromptConfirmationReviewStatusToUiMetadata(reviewStatus);

  return {
    result: 'ok',
    mode: 'hermes_business_prompt_confirmation_review_ui_metadata_boundary',
    runtime: 'local_llm',
    ui_metadata_mode: 'dry_run_confirmation_review_ui_metadata_only',
    configured_provider: UI_METADATA_PROVIDER,
    upstream_review_mode: 'dry_run_confirmation_review_read_only',
    upstream_confirmation_mode: 'dry_run_human_confirmation_only',
    upstream_payload_schema_mode: 'dry_run_payload_schema_only',
    upstream_policy_gate_mode: 'dry_run_policy_gate_only',
    schema_version: 'hermes.business_prompt_confirmation_review_ui_metadata.v0',
    source_schema_version: 'hermes.business_prompt_confirmation_review.v0',
    confirmation_required: true,
    human_confirmed: false,
    confirmation_state: deriveConfirmationState(
      reviewStatus,
      input.confirmation_state,
    ),
    confirmation_result: deriveConfirmationResult(
      reviewStatus,
      input.confirmation_result,
    ),
    review_status: reviewStatus,
    ...mappedUiMetadata,
    safe_ui_metadata_exposed: true,
    safe_review_summary_exposed: true,
    raw_prompt_exposed: false,
    sanitized_prompt_included: false,
    business_context_included: false,
    proposal_body_included: false,
    restricted_domain_data_included: false,
    endpoint_value_exposed: false,
    model_value_exposed: false,
    credentials_exposed: false,
    confirmation_token_created: false,
    confirmation_token_exposed: false,
    confirmation_record_created: false,
    confirmation_record_saved: false,
    payload_send_allowed: false,
    runtime_call_allowed: false,
    request_body_created: false,
    request_body_sent: false,
    prompt_sent: false,
    response_body_exposed: false,
    selected_provider: 'mock',
    fallback_provider: 'mock',
    tokens_used: 0,
  };
}

export const hermesBusinessPromptConfirmationReviewUiMetadataBoundary = {
  provider: UI_METADATA_PROVIDER,
  localProviderAlias: 'local_llm_business_prompt_confirmation_review_ui_metadata',
  create: createHermesBusinessPromptConfirmationReviewUiMetadataBoundary,
  mapReviewStatus: mapHermesBusinessPromptConfirmationReviewStatusToUiMetadata,
} as const;
