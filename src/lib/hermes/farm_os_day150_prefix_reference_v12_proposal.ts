import { FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12_REQUEST } from
  "./farm_os_day150_prefix_reference_migration_privilege_authority";

export const FARM_OS_DAY150_PREFIX_REFERENCE_V12_APPROVAL_SCHEMA =
  "farmos.day150-prefix-reference-execution-approval-record.v2" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V12_APPROVAL_REVISION = 2 as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V12_APPROVED_AT_REQUIREMENT =
  "<PRODUCT_OWNER_REQUIRED>" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V12_APPROVAL_RECORD_DIGEST_STATUS =
  "<PENDING_PRODUCT_OWNER_APPROVED_AT>" as const;

export const FARM_OS_DAY150_PREFIX_REFERENCE_V12_APPROVAL_RECORD_CANONICAL_FIELD_NAMES =
  Object.freeze([
    "schema_version", "approval_record_revision", "authority_id", "authority_revision",
    "execution_authorization_id", "authorization_revision", "executable_source_digest",
    "gate17_scope_digest", "authorization_digest", "plan_digest", "run_identity",
    "attempt_identity", "execution_descriptor_revision", "execution_descriptor_digest",
    "external_plan_identity_digest", "approval_candidate_identity", "proposal_identity",
    "proposal_created_at", "approval_reference", "approved_at",
  ] as const);

export function createFarmOsDay150PrefixReferenceV12ProposalRequest(
  proposalCreatedAt: string,
): null {
  void proposalCreatedAt;
  void FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12_REQUEST;
  return null;
}
