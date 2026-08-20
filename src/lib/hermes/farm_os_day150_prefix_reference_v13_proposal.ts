import {
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13_REQUEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE,
  createFarmOsDay150PrefixReferenceExecutionApprovalRecord,
  materializeFarmOsDay150PrefixReferenceExecutionProposal,
} from "./farm_os_day150_prefix_reference_migration_privilege_authority";

export const FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_SCHEMA =
  "farmos.day150-prefix-reference-execution-approval-record.v2" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_REVISION = 2 as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVED_AT_REQUIREMENT =
  "<PRODUCT_OWNER_REQUIRED>" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_DIGEST_STATUS =
  "<PENDING_PRODUCT_OWNER_APPROVED_AT>" as const;

export const FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANONICAL_FIELD_NAMES =
  Object.freeze([
    "schema_version", "approval_record_revision", "authority_id", "authority_revision",
    "execution_authorization_id", "authorization_revision", "executable_source_digest",
    "gate17_scope_digest", "authorization_digest", "plan_digest", "run_identity",
    "attempt_identity", "execution_descriptor_revision", "execution_descriptor_digest",
    "external_plan_identity_digest", "approval_candidate_identity", "proposal_identity",
    "proposal_created_at", "approval_reference", "approved_at",
  ] as const);

export function createFarmOsDay150PrefixReferenceV13ProposalRequest(
  proposalCreatedAt: string,
) {
  const proposal = materializeFarmOsDay150PrefixReferenceExecutionProposal({
    candidate: FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE,
    proposal_created_at: proposalCreatedAt,
  });
  if (!proposal) return null;
  const { schema_version: _candidateSchema, proposal_identity, proposal_created_at,
    approval_reference, ...candidateBindings } = proposal;
  void _candidateSchema;
  return Object.freeze({
    authorization_request: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13_REQUEST,
    active_execution_binding: FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING,
    proposal,
    approval_record_canonical_fields_before_human_approval: Object.freeze({
      schema_version: FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_SCHEMA,
      approval_record_revision: FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_REVISION,
      ...candidateBindings,
      proposal_identity,
      proposal_created_at,
      approval_reference,
      approved_at: FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVED_AT_REQUIREMENT,
    }),
    approval_record_digest: FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_DIGEST_STATUS,
    create_approved_record: (approvedAt: string) =>
      createFarmOsDay150PrefixReferenceExecutionApprovalRecord({
        proposal, approved_at: approvedAt,
      }),
    current_state: "PROPOSED_NOT_AUTHORIZED" as const,
    invocation_allowed: false as const,
  });
}
