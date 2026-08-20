import {
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS,
  FARM_OS_DAY150_PREFIX_REFERENCE_V9_EXECUTION_DESCRIPTOR_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V9_EXTERNAL_PLAN_IDENTITY_DIGEST,
} from "./farm_os_day150_prefix_reference_migration_privilege_authority";

export const FARM_OS_DAY150_PREFIX_REFERENCE_V9_HISTORICAL_STATUS = Object.freeze({
  execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9",
  authorization_revision: 9,
  historical_state: "TERMINAL_CONSUMED_NON_RUNNABLE",
  invocation_allowance: "CONSUMED",
  retry_allowed: false,
  approval_materialization_allowed: false,
  execution_descriptor: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V9,
  execution_descriptor_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V9_EXECUTION_DESCRIPTOR_DIGEST,
  external_plan_identity_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V9_EXTERNAL_PLAN_IDENTITY_DIGEST,
  historical_approval_record_digest:
    "sha256:cd66fc73e3f47833682937ea84dc7cc14551f8d5260c1f4c5aa18cbca293216e",
} as const);

/** Compatibility read for the terminal V9 proposal surface; it grants no authority. */
export function createFarmOsDay150PrefixReferenceV9ProposalRequest(
  _proposalCreatedAt: string,
) {
  void _proposalCreatedAt;
  return Object.freeze({
    requested_revision: 9 as const,
    historical_status: FARM_OS_DAY150_PREFIX_REFERENCE_V9_HISTORICAL_STATUS,
    active_execution_binding: null,
    proposal: null,
    create_approved_record: null,
    current_state: "TERMINAL_CONSUMED_NON_RUNNABLE" as const,
    invocation_allowed: false as const,
    approval_materialization_allowed: false as const,
  });
}
