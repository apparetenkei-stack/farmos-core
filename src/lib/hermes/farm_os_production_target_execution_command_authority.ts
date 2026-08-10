import {
  deriveFarmOsProductionTargetEvidenceCommandId,
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_COMMAND_IDENTITY_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION,
  isFarmOsProductionTargetEvidenceCommandId,
} from "./farm_os_production_target_evidence_command_identity";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
} from "./farm_os_production_identity_query_v5_authority";
import {
  FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256,
} from "./farm_os_production_target_identity_minimal_observation_authority";
import { FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY_AUTHORITY_ID } from
  "./farm_os_production_target_external_feasibility_policy";
import {
  FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_POLICY,
} from "./farm_os_production_target_provider_credential_authority";
import {
  FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_POLICY,
} from "./farm_os_production_target_database_credential_authority";
import {
  FARM_OS_PRODUCTION_TARGET_CONNECTION_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_CONNECTION_POLICY,
} from
  "./farm_os_production_target_connection_authority";
import {
  FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_COLLECTOR_POLICY,
} from
  "./farm_os_production_target_collector_authority";
import {
  FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_POLICY,
} from
  "./farm_os_production_target_principal_capability_authority";
import {
  FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_POLICY,
  FARM_OS_PRODUCTION_TARGET_PROVIDER_TLS_ATTESTATION_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_PROVIDER_TLS_ATTESTATION_POLICY,
} from "./farm_os_production_target_tls_attestation_authority";
import {
  validateFarmOsProductionTargetExecutionApprovalLineage,
  type FarmOsProductionTargetExecutionApprovalLineage,
  type FarmOsProductionTargetExecutionOperationScope,
} from "./farm_os_production_target_execution_approval_authority";
import {
  canonicalizeFarmOsProductionTargetExecutionContract,
  hashFarmOsProductionTargetExecutionContract,
  hasExactFarmOsProductionTargetExecutionKeys,
  isFarmOsProductionTargetExecutionDigest,
  isFarmOsProductionTargetExecutionIdentifier,
  isFarmOsProductionTargetExecutionRecord,
  isCanonicalFarmOsProductionTargetExecutionTimestamp,
  type FarmOsProductionTargetExecutionClockEvidence,
} from "./farm_os_production_target_execution_trusted_clock_contract";

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_COMMAND_AUTHORITY_ID =
  "farmos.production-target-execution-command-authority.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_COMMAND_AUTHORITY_REVISION = 1 as const;
export const FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_COMMAND_IDENTITY_AUTHORITY_ID =
  "farmos.production-target-noncanonical-capability-probe-command-id.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_OPERATION =
  "PROBE_PRODUCTION_TARGET_EXTERNAL_CAPABILITY_NONCANONICAL" as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_COMMAND_SCHEMA_VERSION =
  "farmos.production-target-execution-command-envelope.v1" as const;

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_OPERATION_PROFILES = Object.freeze({
  FORMAL_GATE_2: Object.freeze({
    operation: FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION,
    identity_authority_id: FARM_OS_PRODUCTION_TARGET_EVIDENCE_COMMAND_IDENTITY_AUTHORITY_ID,
    id_grammar: "^g2cmd_[a-f0-9]{64}$",
    noncanonical: false,
    result_reusable: false,
    formal_evidence_eligible: true,
    readiness_auto_promotion: false,
    manifest_effect: false,
    runtime_effect: false,
    production_evidence_receipt_created_by_phase_c: false,
    human_approval_required: true,
    maximum_provider_calls: 1,
    maximum_database_connections: 1,
    automatic_retry: 0,
  }),
  NONCANONICAL_CAPABILITY_PROBE: Object.freeze({
    operation: FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_OPERATION,
    identity_authority_id:
      FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_COMMAND_IDENTITY_AUTHORITY_ID,
    id_grammar: "^probecmd_[a-f0-9]{64}$",
    noncanonical: true,
    result_reusable: false,
    formal_evidence_eligible: false,
    readiness_auto_promotion: false,
    manifest_effect: false,
    runtime_effect: false,
    production_evidence_receipt_created_by_phase_c: false,
    human_approval_required: true,
    maximum_provider_calls: 1,
    maximum_database_connections: 1,
    automatic_retry: 0,
    operation_artifact_authority_id:
      FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY_AUTHORITY_ID,
    operation_artifact_sha256_state: "EXACT_APPROVAL_PIN_REQUIRED_NOT_ESTABLISHED_BY_C1",
  }),
} as const);

export type FarmOsProductionTargetPhaseBAuthorityBundle = Readonly<{
  provider_credential_authority_id:
    typeof FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_AUTHORITY_ID;
  provider_credential_authority_revision: 1;
  provider_credential_and_broker_policy_digest: `sha256:${string}`;
  provider_broker_authority_id:
    typeof FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID;
  provider_broker_authority_revision: 1;
  database_credential_authority_id:
    typeof FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_ID;
  database_credential_authority_revision: 1;
  database_credential_and_broker_policy_digest: `sha256:${string}`;
  database_broker_authority_id:
    typeof FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID;
  database_broker_authority_revision: 1;
  connection_authority_id: typeof FARM_OS_PRODUCTION_TARGET_CONNECTION_AUTHORITY_ID;
  connection_authority_revision: 1;
  connection_policy_digest: `sha256:${string}`;
  collector_authority_id: typeof FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID;
  collector_authority_revision: 1;
  collector_policy_digest: `sha256:${string}`;
  principal_authority_id: typeof FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID;
  principal_authority_revision: 1;
  principal_policy_digest: `sha256:${string}`;
  provider_tls_authority_id:
    typeof FARM_OS_PRODUCTION_TARGET_PROVIDER_TLS_ATTESTATION_AUTHORITY_ID;
  provider_tls_authority_revision: 1;
  provider_tls_policy_digest: `sha256:${string}`;
  postgres_tls_authority_id:
    typeof FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_AUTHORITY_ID;
  postgres_tls_authority_revision: 1;
  postgres_tls_policy_digest: `sha256:${string}`;
}>;

function phaseBPolicyBindingDigest(label: string, value: unknown): `sha256:${string}` {
  return hashFarmOsProductionTargetExecutionContract(
    `farmos.production-target-phase-b-policy-binding.v1:${label}`,
    value,
  );
}

export const FARM_OS_PRODUCTION_TARGET_PHASE_B_AUTHORITY_BUNDLE:
  FarmOsProductionTargetPhaseBAuthorityBundle = Object.freeze({
    provider_credential_authority_id: FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_AUTHORITY_ID,
    provider_credential_authority_revision: 1,
    provider_credential_and_broker_policy_digest: phaseBPolicyBindingDigest(
      "provider-credential-and-broker", FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_POLICY,
    ),
    provider_broker_authority_id: FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID,
    provider_broker_authority_revision: 1,
    database_credential_authority_id: FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_ID,
    database_credential_authority_revision: 1,
    database_credential_and_broker_policy_digest: phaseBPolicyBindingDigest(
      "database-credential-and-broker", FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_POLICY,
    ),
    database_broker_authority_id: FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID,
    database_broker_authority_revision: 1,
    connection_authority_id: FARM_OS_PRODUCTION_TARGET_CONNECTION_AUTHORITY_ID,
    connection_authority_revision: 1,
    connection_policy_digest: phaseBPolicyBindingDigest(
      "connection", FARM_OS_PRODUCTION_TARGET_CONNECTION_POLICY,
    ),
    collector_authority_id: FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID,
    collector_authority_revision: 1,
    collector_policy_digest: phaseBPolicyBindingDigest(
      "collector", FARM_OS_PRODUCTION_TARGET_COLLECTOR_POLICY,
    ),
    principal_authority_id: FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID,
    principal_authority_revision: 1,
    principal_policy_digest: phaseBPolicyBindingDigest(
      "principal", FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_POLICY,
    ),
    provider_tls_authority_id: FARM_OS_PRODUCTION_TARGET_PROVIDER_TLS_ATTESTATION_AUTHORITY_ID,
    provider_tls_authority_revision: 1,
    provider_tls_policy_digest: phaseBPolicyBindingDigest(
      "provider-tls", FARM_OS_PRODUCTION_TARGET_PROVIDER_TLS_ATTESTATION_POLICY,
    ),
    postgres_tls_authority_id: FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_AUTHORITY_ID,
    postgres_tls_authority_revision: 1,
    postgres_tls_policy_digest: phaseBPolicyBindingDigest(
      "postgres-tls", FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_POLICY,
    ),
  });

export type FarmOsProductionTargetExecutionLimits = Readonly<{
  maximum_provider_calls: 1;
  maximum_database_connections: 1;
  automatic_retry: 0;
}>;

export type FarmOsProductionTargetExecutionCommand = Readonly<{
  schema_version: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_COMMAND_SCHEMA_VERSION;
  command_authority_id: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_COMMAND_AUTHORITY_ID;
  command_authority_revision: 1;
  identity_authority_id:
    | typeof FARM_OS_PRODUCTION_TARGET_EVIDENCE_COMMAND_IDENTITY_AUTHORITY_ID
    | typeof FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_COMMAND_IDENTITY_AUTHORITY_ID;
  command_id: string;
  command_record_digest: `sha256:${string}`;
  operation: FarmOsProductionTargetExecutionOperationScope;
  execution_binding_digest: `sha256:${string}`;
  target_manifest_id: string;
  target_binding_digest: `sha256:${string}`;
  v5_authority_id: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id;
  v5_artifact_sha256: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256;
  operation_artifact_authority_id: string;
  operation_artifact_sha256: `sha256:${string}`;
  phase_b_authority_bundle: FarmOsProductionTargetPhaseBAuthorityBundle;
  phase_b_authority_bundle_digest: `sha256:${string}`;
  proposal_id: string;
  proposal_digest: `sha256:${string}`;
  approval_id: string;
  approval_digest: `sha256:${string}`;
  approval_receipt_id: string;
  approval_receipt_digest: `sha256:${string}`;
  purpose: "PRODUCTION_TARGET_IDENTITY_AUTHORITY_QUALIFICATION";
  scope_digest: `sha256:${string}`;
  nonce_digest: `sha256:${string}`;
  limits: FarmOsProductionTargetExecutionLimits;
  issued_at: string;
  expires_at: string;
  trusted_clock_evidence_id: string;
  trusted_clock_evidence_digest: `sha256:${string}`;
  source_build_identity_digest: `sha256:${string}`;
  noncanonical: boolean;
  result_reusable: false;
  formal_evidence_eligible: boolean;
  readiness_auto_promotion: false;
  manifest_effect: false;
  runtime_effect: false;
  production_evidence_receipt_created_by_phase_c: false;
  human_approval_required: true;
}>;

export type FarmOsProductionTargetExecutionCommandValidation =
  | Readonly<{ accepted: true; command: FarmOsProductionTargetExecutionCommand;
    lineage: FarmOsProductionTargetExecutionApprovalLineage }>
  | Readonly<{ accepted: false; reason:
    | "COMMAND_SCHEMA_INVALID" | "COMMAND_IDENTITY_INVALID" | "OPERATION_PROFILE_MISMATCH"
    | "PHASE_B_AUTHORITY_BUNDLE_MISMATCH" | "APPROVAL_LINEAGE_INVALID"
    | "EXECUTION_BINDING_DIGEST_MISMATCH" | "COMMAND_RECORD_DIGEST_MISMATCH"
    | "COMMAND_EXPIRED" | "CLOCK_EVIDENCE_MISMATCH" | "COMMAND_IDENTITY_CONFLICT" }>;

const COMMAND_KEYS = [
  "approval_digest", "approval_id", "approval_receipt_digest", "approval_receipt_id",
  "command_authority_id", "command_authority_revision", "command_id", "command_record_digest",
  "execution_binding_digest", "expires_at", "formal_evidence_eligible", "human_approval_required",
  "identity_authority_id", "issued_at", "limits", "manifest_effect", "noncanonical",
  "nonce_digest", "operation", "operation_artifact_authority_id", "operation_artifact_sha256",
  "phase_b_authority_bundle", "phase_b_authority_bundle_digest", "production_evidence_receipt_created_by_phase_c",
  "proposal_digest", "proposal_id", "purpose", "readiness_auto_promotion", "result_reusable",
  "runtime_effect", "schema_version", "scope_digest", "source_build_identity_digest",
  "target_binding_digest", "target_manifest_id", "trusted_clock_evidence_digest",
  "trusted_clock_evidence_id", "v5_artifact_sha256", "v5_authority_id",
] as const;
const BUNDLE_KEYS = Object.keys(FARM_OS_PRODUCTION_TARGET_PHASE_B_AUTHORITY_BUNDLE).sort();
const LIMIT_KEYS = ["automatic_retry", "maximum_database_connections", "maximum_provider_calls"];
const PROBE_COMMAND_ID = /^probecmd_[a-f0-9]{64}$/u;

export function computeFarmOsProductionTargetPhaseBAuthorityBundleDigest(
  bundle: FarmOsProductionTargetPhaseBAuthorityBundle,
): `sha256:${string}` {
  return hashFarmOsProductionTargetExecutionContract(
    "farmos.production-target-phase-b-authority-bundle.v1",
    bundle,
  );
}

export function deriveFarmOsProductionTargetNoncanonicalProbeCommandId(input: Readonly<{
  proposal_id: string;
  approval_id: string;
  approval_receipt_id: string;
  nonce_digest: `sha256:${string}`;
  target_binding_digest: `sha256:${string}`;
  operation_artifact_authority_id: string;
  operation_artifact_sha256: `sha256:${string}`;
}>): `probecmd_${string}` {
  const digest = hashFarmOsProductionTargetExecutionContract(
    "farmos.production-target-noncanonical-capability-probe-command-id.v1",
    {
      approval_id: input.approval_id,
      approval_receipt_id: input.approval_receipt_id,
      authority_id: FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_COMMAND_IDENTITY_AUTHORITY_ID,
      nonce_digest: input.nonce_digest,
      operation: FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_OPERATION,
      operation_artifact_authority_id: input.operation_artifact_authority_id,
      operation_artifact_sha256: input.operation_artifact_sha256,
      proposal_id: input.proposal_id,
      target_binding_digest: input.target_binding_digest,
    },
  );
  return `probecmd_${digest.slice(7)}`;
}

function withoutKeys(value: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

export function computeFarmOsProductionTargetExecutionBindingDigest(
  command: Omit<FarmOsProductionTargetExecutionCommand,
    "execution_binding_digest" | "command_record_digest">,
): `sha256:${string}` {
  return hashFarmOsProductionTargetExecutionContract(
    "farmos.production-target-execution-binding.v1",
    command,
  );
}

export function computeFarmOsProductionTargetExecutionCommandRecordDigest(
  command: Omit<FarmOsProductionTargetExecutionCommand, "command_record_digest">,
): `sha256:${string}` {
  return hashFarmOsProductionTargetExecutionContract(
    "farmos.production-target-execution-command-envelope.v1",
    command,
  );
}

function expectedProfile(operation: FarmOsProductionTargetExecutionOperationScope) {
  return operation === FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION
    ? FARM_OS_PRODUCTION_TARGET_EXECUTION_OPERATION_PROFILES.FORMAL_GATE_2
    : FARM_OS_PRODUCTION_TARGET_EXECUTION_OPERATION_PROFILES.NONCANONICAL_CAPABILITY_PROBE;
}

function validPhaseBBundle(value: unknown): value is FarmOsProductionTargetPhaseBAuthorityBundle {
  return isFarmOsProductionTargetExecutionRecord(value) &&
    hasExactFarmOsProductionTargetExecutionKeys(value, BUNDLE_KEYS) &&
    canonicalizeFarmOsProductionTargetExecutionContract(value) ===
      canonicalizeFarmOsProductionTargetExecutionContract(
        FARM_OS_PRODUCTION_TARGET_PHASE_B_AUTHORITY_BUNDLE,
      );
}

export function validateFarmOsProductionTargetExecutionCommand(input: Readonly<{
  command: unknown;
  proposal: unknown;
  approval: unknown;
  approval_receipt: unknown;
  clock_evidence: unknown;
  persisted_clock_lower_bound: string | null;
}>): FarmOsProductionTargetExecutionCommandValidation {
  const value = input.command;
  if (!isFarmOsProductionTargetExecutionRecord(value) ||
    !hasExactFarmOsProductionTargetExecutionKeys(value, COMMAND_KEYS) ||
    value.schema_version !== FARM_OS_PRODUCTION_TARGET_EXECUTION_COMMAND_SCHEMA_VERSION ||
    value.command_authority_id !== FARM_OS_PRODUCTION_TARGET_EXECUTION_COMMAND_AUTHORITY_ID ||
    value.command_authority_revision !== 1 ||
    (value.operation !== FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION &&
      value.operation !== FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_OPERATION) ||
    !isFarmOsProductionTargetExecutionIdentifier(value.target_manifest_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.target_binding_digest) ||
    value.v5_authority_id !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id ||
    value.v5_artifact_sha256 !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256 ||
    !isFarmOsProductionTargetExecutionIdentifier(value.operation_artifact_authority_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.operation_artifact_sha256) ||
    !isFarmOsProductionTargetExecutionDigest(value.phase_b_authority_bundle_digest) ||
    !isFarmOsProductionTargetExecutionIdentifier(value.proposal_id) ||
    !isFarmOsProductionTargetExecutionIdentifier(value.approval_id) ||
    !isFarmOsProductionTargetExecutionIdentifier(value.approval_receipt_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.proposal_digest) ||
    !isFarmOsProductionTargetExecutionDigest(value.approval_digest) ||
    !isFarmOsProductionTargetExecutionDigest(value.approval_receipt_digest) ||
    !isFarmOsProductionTargetExecutionDigest(value.scope_digest) ||
    !isFarmOsProductionTargetExecutionDigest(value.nonce_digest) ||
    !isCanonicalFarmOsProductionTargetExecutionTimestamp(value.issued_at) ||
    !isCanonicalFarmOsProductionTargetExecutionTimestamp(value.expires_at) ||
    Date.parse(value.expires_at) <= Date.parse(value.issued_at) ||
    !isFarmOsProductionTargetExecutionIdentifier(value.trusted_clock_evidence_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.trusted_clock_evidence_digest) ||
    !isFarmOsProductionTargetExecutionDigest(value.source_build_identity_digest) ||
    !isFarmOsProductionTargetExecutionDigest(value.execution_binding_digest) ||
    !isFarmOsProductionTargetExecutionDigest(value.command_record_digest) ||
    value.purpose !== "PRODUCTION_TARGET_IDENTITY_AUTHORITY_QUALIFICATION" ||
    !isFarmOsProductionTargetExecutionRecord(value.limits) ||
    !hasExactFarmOsProductionTargetExecutionKeys(value.limits, LIMIT_KEYS) ||
    value.limits.maximum_provider_calls !== 1 ||
    value.limits.maximum_database_connections !== 1 || value.limits.automatic_retry !== 0) {
    return Object.freeze({ accepted: false, reason: "COMMAND_SCHEMA_INVALID" });
  }
  if (!validPhaseBBundle(value.phase_b_authority_bundle) ||
    value.phase_b_authority_bundle_digest !== computeFarmOsProductionTargetPhaseBAuthorityBundleDigest(
      value.phase_b_authority_bundle,
    )) return Object.freeze({ accepted: false, reason: "PHASE_B_AUTHORITY_BUNDLE_MISMATCH" });

  const command = value as unknown as FarmOsProductionTargetExecutionCommand;
  const profile = expectedProfile(command.operation);
  if (command.identity_authority_id !== profile.identity_authority_id ||
    command.noncanonical !== profile.noncanonical || command.result_reusable !== false ||
    command.formal_evidence_eligible !== profile.formal_evidence_eligible ||
    command.readiness_auto_promotion !== false || command.manifest_effect !== false ||
    command.runtime_effect !== false ||
    command.production_evidence_receipt_created_by_phase_c !== false ||
    command.human_approval_required !== true) {
    return Object.freeze({ accepted: false, reason: "OPERATION_PROFILE_MISMATCH" });
  }
  if (command.operation === FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION) {
    if (command.operation_artifact_authority_id !==
      FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID ||
      command.operation_artifact_sha256 !==
        FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256) {
      return Object.freeze({ accepted: false, reason: "OPERATION_PROFILE_MISMATCH" });
    }
    const identity = deriveFarmOsProductionTargetEvidenceCommandId({
      approval_id: command.approval_id,
      approval_receipt_id: command.approval_receipt_id,
      authority_id: FARM_OS_PRODUCTION_TARGET_EVIDENCE_COMMAND_IDENTITY_AUTHORITY_ID,
      nonce_digest: command.nonce_digest,
      operation: FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION,
      proposal_id: command.proposal_id,
      query_artifact_sha256: command.operation_artifact_sha256,
      target_binding_digest: command.target_binding_digest,
    });
    if (!identity.accepted || !isFarmOsProductionTargetEvidenceCommandId(command.command_id) ||
      identity.command_id !== command.command_id) {
      return Object.freeze({ accepted: false, reason: "COMMAND_IDENTITY_INVALID" });
    }
  } else {
    if (command.operation_artifact_authority_id !==
      FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY_AUTHORITY_ID) {
      return Object.freeze({ accepted: false, reason: "OPERATION_PROFILE_MISMATCH" });
    }
    const expectedId = deriveFarmOsProductionTargetNoncanonicalProbeCommandId({
      proposal_id: command.proposal_id,
      approval_id: command.approval_id,
      approval_receipt_id: command.approval_receipt_id,
      nonce_digest: command.nonce_digest,
      target_binding_digest: command.target_binding_digest,
      operation_artifact_authority_id: command.operation_artifact_authority_id,
      operation_artifact_sha256: command.operation_artifact_sha256,
    });
    if (!PROBE_COMMAND_ID.test(command.command_id) || command.command_id !== expectedId ||
      isFarmOsProductionTargetEvidenceCommandId(command.command_id)) {
      return Object.freeze({ accepted: false, reason: "COMMAND_IDENTITY_INVALID" });
    }
  }
  const lineage = validateFarmOsProductionTargetExecutionApprovalLineage({
    proposal: input.proposal,
    approval: input.approval,
    approval_receipt: input.approval_receipt,
    clock_evidence: input.clock_evidence,
    persisted_clock_lower_bound: input.persisted_clock_lower_bound,
  });
  if (!lineage.accepted || lineage.lineage.proposal.proposal_id !== command.proposal_id ||
    lineage.lineage.proposal.proposal_digest !== command.proposal_digest ||
    lineage.lineage.approval.approval_id !== command.approval_id ||
    lineage.lineage.approval.approval_digest !== command.approval_digest ||
    lineage.lineage.approval_receipt.approval_receipt_id !== command.approval_receipt_id ||
    lineage.lineage.approval_receipt.approval_receipt_digest !== command.approval_receipt_digest ||
    lineage.lineage.proposal.target_binding_digest !== command.target_binding_digest ||
    lineage.lineage.proposal.operation_scope !== command.operation) {
    return Object.freeze({ accepted: false, reason: "APPROVAL_LINEAGE_INVALID" });
  }
  if (Date.parse(command.issued_at) < Date.parse(lineage.lineage.approval_receipt.issued_at) ||
    Date.parse(command.expires_at) > Date.parse(lineage.lineage.proposal.expires_at) ||
    Date.parse(command.expires_at) > Date.parse(lineage.lineage.approval.expires_at) ||
    Date.parse(command.expires_at) > Date.parse(lineage.lineage.approval_receipt.expires_at)) {
    return Object.freeze({ accepted: false, reason: "APPROVAL_LINEAGE_INVALID" });
  }
  const clock = input.clock_evidence as FarmOsProductionTargetExecutionClockEvidence;
  if (clock.evidence_id !== command.trusted_clock_evidence_id ||
    clock.evidence_digest !== command.trusted_clock_evidence_digest) {
    return Object.freeze({ accepted: false, reason: "CLOCK_EVIDENCE_MISMATCH" });
  }
  if (Date.parse(clock.observed_at) < Date.parse(command.issued_at) ||
    Date.parse(clock.observed_at) >= Date.parse(command.expires_at)) {
    return Object.freeze({ accepted: false, reason: "COMMAND_EXPIRED" });
  }
  const bindingMaterial = withoutKeys(command as unknown as Record<string, unknown>, [
    "execution_binding_digest", "command_record_digest",
  ]);
  const expectedBinding = hashFarmOsProductionTargetExecutionContract(
    "farmos.production-target-execution-binding.v1",
    bindingMaterial,
  );
  if (command.execution_binding_digest !== expectedBinding) {
    return Object.freeze({ accepted: false, reason: "EXECUTION_BINDING_DIGEST_MISMATCH" });
  }
  const commandMaterial = withoutKeys(command as unknown as Record<string, unknown>, [
    "command_record_digest",
  ]);
  const expectedRecord = hashFarmOsProductionTargetExecutionContract(
    "farmos.production-target-execution-command-envelope.v1",
    commandMaterial,
  );
  if (command.command_record_digest !== expectedRecord) {
    return Object.freeze({ accepted: false, reason: "COMMAND_RECORD_DIGEST_MISMATCH" });
  }
  return Object.freeze({ accepted: true, command, lineage: lineage.lineage });
}

export function compareFarmOsProductionTargetExecutionCommandIdentity(
  existing: FarmOsProductionTargetExecutionCommand,
  candidate: FarmOsProductionTargetExecutionCommand,
): "MATCH" | "COMMAND_IDENTITY_CONFLICT" {
  return existing.command_id === candidate.command_id &&
    existing.execution_binding_digest === candidate.execution_binding_digest &&
    existing.command_record_digest === candidate.command_record_digest
    ? "MATCH" : "COMMAND_IDENTITY_CONFLICT";
}
