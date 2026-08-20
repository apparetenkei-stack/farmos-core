import {
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS,
  FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXECUTION_DESCRIPTOR_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXTERNAL_PLAN_IDENTITY_DIGEST,
} from "./farm_os_day150_prefix_reference_migration_privilege_authority";

export const FARM_OS_DAY150_PREFIX_REFERENCE_V8_HISTORICAL_STATUS = Object.freeze({
  execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V8",
  authorization_revision: 8,
  historical_state: "EXHAUSTED_NON_RUNNABLE",
  invocation_allowance: "EXHAUSTED",
  retry_allowed: false,
  approval_materialization_allowed: false,
  execution_descriptor: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V8,
  execution_descriptor_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXECUTION_DESCRIPTOR_DIGEST,
  external_plan_identity_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXTERNAL_PLAN_IDENTITY_DIGEST,
} as const);

/**
 * Compatibility read for callers that still name the retired V8 proposal surface.
 * It exposes historical exhausted state only and cannot create a proposal, approval,
 * active binding, invocation capability, or replacement attempt.
 */
export function createFarmOsDay150PrefixReferenceV8ProposalRequest(
  _proposalCreatedAt: string,
) {
  void _proposalCreatedAt;
  return Object.freeze({
    requested_revision: 8 as const,
    historical_status: FARM_OS_DAY150_PREFIX_REFERENCE_V8_HISTORICAL_STATUS,
    active_execution_binding: null,
    proposal: null,
    create_approved_record: null,
    current_state: "EXHAUSTED_NON_RUNNABLE" as const,
    invocation_allowed: false as const,
    approval_materialization_allowed: false as const,
  });
}
