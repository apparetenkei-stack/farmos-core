import { createHash } from "node:crypto";

import { FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_AUTHORITY_ID } from
  "./farm_os_production_target_execution_approval_authority";
import { FARM_OS_PRODUCTION_TARGET_EXECUTION_COMMAND_AUTHORITY_ID } from
  "./farm_os_production_target_execution_command_authority";
import { FARM_OS_PRODUCTION_TARGET_EXECUTION_LIFECYCLE_AUTHORITY_ID } from
  "./farm_os_production_target_execution_lifecycle";
import { FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_PORT_VERSION } from
  "./farm_os_production_target_execution_persistence_ports";
import { FARM_OS_PRODUCTION_TARGET_EXECUTION_RECEIPT_AUTHORITY_ID } from
  "./farm_os_production_target_execution_receipt_authority";
import {
  FARM_OS_PRODUCTION_TARGET_EXECUTION_TRUSTED_CLOCK_AUTHORITY_ID,
  hashFarmOsProductionTargetExecutionContract,
} from
  "./farm_os_production_target_execution_trusted_clock_contract";

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID =
  "202608110001_production_target_execution_durability" as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_SEQUENCE =
  202608110001 as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_PATH =
  `db/migrations/${FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID}.sql` as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_VERIFY_PATH =
  `db/migrations/${FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID}.verify.sql` as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256 =
  "sha256:e230647582fc3b1fb26d017034227cdf9b86384f6be7767f0c266ba4768ebc34" as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_VERIFY_SHA256 =
  "sha256:ef8484ea130e930cd65e3b847869749727f00b2bf6ee373a2dc1d6d8fca0384f" as const;

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_SCHEMA = "ai" as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_SCHEMA_VERSION =
  "farmos.production-target-execution-postgres-schema.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_ROLE =
  "farmos_core_production_target_execution_transaction" as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_STATEMENT_TIMEOUT_MS = 10_000 as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_LOCK_TIMEOUT_MS = 5_000 as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_AUTOMATIC_RETRY = 0 as const;

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_LOCK_ORDER = Object.freeze([
  "CLOCK_FLOOR", "PROPOSAL", "APPROVAL", "APPROVAL_RECEIPT", "REVOCATION_HEAD",
  "APPROVAL_USE", "COMMAND", "LIFECYCLE", "RESERVATION", "ATTEMPT",
  "EXECUTION_RECEIPT_OR_RECONCILIATION",
] as const);

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_RELATIONS = Object.freeze([
  "production_target_execution_schema_metadata",
  "production_target_execution_proposals",
  "production_target_execution_approvals",
  "production_target_execution_approval_receipts",
  "production_target_execution_approval_revocation_events",
  "production_target_execution_approval_revocation_heads",
  "production_target_execution_approval_uses",
  "production_target_execution_commands",
  "production_target_execution_lifecycles",
  "production_target_execution_reservations",
  "production_target_execution_attempts",
  "production_target_execution_execution_receipts",
  "production_target_execution_clock_evidence",
  "production_target_execution_clock_floors",
  "production_target_execution_reconciliation_records",
] as const);

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_FUNCTIONS = Object.freeze([
  "reject_production_target_execution_append_only_mutation()",
  "enforce_production_target_execution_cas_progression()",
  "production_target_execution_canonical_jsonb(jsonb)",
  "production_target_execution_digest(text,jsonb)",
  "assert_production_target_execution_exact_record(jsonb,text[],text,text,text[])",
  "assert_production_target_execution_receipt_binding(jsonb,jsonb,jsonb,text[])",
  "assert_production_target_execution_schema_identity()",
  "advance_production_target_execution_clock_floor(jsonb)",
  "read_production_target_execution_schema_identity()",
  "append_production_target_execution_proposal(jsonb)",
  "append_production_target_execution_approval_and_receipt(jsonb)",
  "read_production_target_execution_approval_lineage(jsonb)",
  "append_production_target_execution_revocation_and_advance_head(jsonb)",
  "read_production_target_execution_revocation_state(jsonb)",
  "append_production_target_execution_command(jsonb)",
  "read_production_target_execution_command(jsonb)",
  "reserve_production_target_execution(jsonb)",
  "start_production_target_execution_attempt(jsonb)",
  "terminate_production_target_execution_pre_start(jsonb)",
  "finalize_production_target_execution(jsonb)",
  "read_production_target_execution_reservation_reconciliation(jsonb)",
  "resolve_production_target_execution_reservation_absent(jsonb)",
  "resolve_production_target_execution_reservation_present(jsonb)",
  "read_production_target_execution_post_reservation_ambiguity(jsonb)",
  "resolve_production_target_execution_post_reservation_ambiguity(jsonb)",
  "read_production_target_execution_lifecycle(jsonb)",
  "read_production_target_execution_receipt(jsonb)",
] as const);

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPEND_ONLY_RELATIONS =
  Object.freeze([
    "production_target_execution_schema_metadata",
    "production_target_execution_proposals",
    "production_target_execution_approvals",
    "production_target_execution_approval_receipts",
    "production_target_execution_approval_revocation_events",
    "production_target_execution_commands",
    "production_target_execution_reservations",
    "production_target_execution_attempts",
    "production_target_execution_execution_receipts",
    "production_target_execution_clock_evidence",
    "production_target_execution_reconciliation_records",
  ] as const);

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MUTABLE_CAS_RELATIONS =
  Object.freeze([
    "production_target_execution_approval_revocation_heads",
    "production_target_execution_approval_uses",
    "production_target_execution_lifecycles",
    "production_target_execution_clock_floors",
  ] as const);

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_TRIGGERS = Object.freeze([
  "pte_metadata_ao", "pte_metadata_truncate",
  "pte_proposals_ao", "pte_proposals_truncate",
  "pte_approvals_ao", "pte_approvals_truncate",
  "pte_approval_receipts_ao", "pte_approval_receipts_truncate",
  "pte_revocation_events_ao", "pte_revocation_events_truncate",
  "pte_commands_ao", "pte_commands_truncate",
  "pte_reservations_ao", "pte_reservations_truncate",
  "pte_attempts_ao", "pte_attempts_truncate",
  "pte_execution_receipts_ao", "pte_execution_receipts_truncate",
  "pte_clock_evidence_ao", "pte_clock_evidence_truncate",
  "pte_reconciliation_ao", "pte_reconciliation_truncate",
  "pte_revocation_heads_cas", "pte_approval_uses_cas",
  "pte_lifecycles_cas", "pte_clock_floors_cas",
  "pte_revocation_heads_delete", "pte_revocation_heads_truncate",
  "pte_approval_uses_delete", "pte_approval_uses_truncate",
  "pte_lifecycles_delete", "pte_lifecycles_truncate",
  "pte_clock_floors_delete", "pte_clock_floors_truncate",
] as const);

export type FarmOsProductionTargetExecutionPostgresErrorCode =
  | "CONFLICT" | "STALE_EXPECTED_VERSION" | "ALREADY_RESERVED"
  | "ALREADY_STARTED" | "ALREADY_FINALIZED" | "APPROVAL_BOUND"
  | "RECEIPT_CONFLICT" | "CLOCK_REGRESSION" | "SERIALIZATION_FAILURE"
  | "TRANSACTION_OUTCOME_UNKNOWN" | "STORAGE_UNAVAILABLE" | "SCHEMA_MISMATCH"
  | "REVOCATION_CONFLICT" | "OBSERVATION_UNKNOWN" | "INGRESS_CONTRACT_INVALID"
  | "DIGEST_MISMATCH" | "DEPENDENCY_REVALIDATION_FAILED";

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_ERROR_CODES = Object.freeze([
  "CONFLICT", "STALE_EXPECTED_VERSION", "ALREADY_RESERVED", "ALREADY_STARTED",
  "ALREADY_FINALIZED", "APPROVAL_BOUND", "RECEIPT_CONFLICT", "CLOCK_REGRESSION",
  "SERIALIZATION_FAILURE", "TRANSACTION_OUTCOME_UNKNOWN", "STORAGE_UNAVAILABLE",
  "SCHEMA_MISMATCH", "REVOCATION_CONFLICT", "OBSERVATION_UNKNOWN",
  "INGRESS_CONTRACT_INVALID", "DIGEST_MISMATCH", "DEPENDENCY_REVALIDATION_FAILED",
] as const satisfies readonly FarmOsProductionTargetExecutionPostgresErrorCode[]);

const digestRegistry = (domain: string, values: readonly unknown[]): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(`${domain}\n${JSON.stringify(values)}`, "utf8")
    .digest("hex")}`;

export function deriveFarmOsProductionTargetExecutionPostgresReservationIdentity(input: Readonly<{
  command_id: string;
  execution_binding_digest: `sha256:${string}`;
  approval_id: string;
  approval_receipt_id: string;
  clock_evidence_id: string;
  lifecycle_version: number;
}>): Readonly<{ reservation_id: string; reservation_digest: `sha256:${string}` }> {
  const material = Object.freeze({
    command_id: input.command_id,
    execution_binding_digest: input.execution_binding_digest,
    approval_id: input.approval_id,
    approval_receipt_id: input.approval_receipt_id,
    clock_evidence_id: input.clock_evidence_id,
    lifecycle_version: input.lifecycle_version,
  });
  const reservation_digest = hashFarmOsProductionTargetExecutionContract(
    "farmos.production-target-execution-postgres-reservation.v1",
    material,
  );
  return Object.freeze({
    reservation_id: `reservation.${reservation_digest.slice(7)}`,
    reservation_digest,
  });
}

export function deriveFarmOsProductionTargetExecutionPostgresAttemptDigest(input: Readonly<{
  attempt_id: string;
  reservation_id: string;
  reservation_digest: `sha256:${string}`;
  command_id: string;
  execution_binding_digest: `sha256:${string}`;
}>): `sha256:${string}` {
  return hashFarmOsProductionTargetExecutionContract(
    "farmos.production-target-execution-postgres-attempt.v1",
    Object.freeze(input),
  );
}

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_RELATION_REGISTRY_DIGEST =
  digestRegistry("farmos.production-target-execution-postgres-relations.v1",
    FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_RELATIONS);
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_FUNCTION_REGISTRY_DIGEST =
  digestRegistry("farmos.production-target-execution-postgres-functions.v1",
    FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_FUNCTIONS);
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_TRIGGER_REGISTRY_DIGEST =
  digestRegistry("farmos.production-target-execution-postgres-triggers.v1",
    FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_TRIGGERS);

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_AUTHORITY_REGISTRY = Object.freeze([
  [FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_AUTHORITY_ID, 1],
  [FARM_OS_PRODUCTION_TARGET_EXECUTION_COMMAND_AUTHORITY_ID, 1],
  [FARM_OS_PRODUCTION_TARGET_EXECUTION_LIFECYCLE_AUTHORITY_ID, 1],
  [FARM_OS_PRODUCTION_TARGET_EXECUTION_RECEIPT_AUTHORITY_ID, 1],
  [FARM_OS_PRODUCTION_TARGET_EXECUTION_TRUSTED_CLOCK_AUTHORITY_ID, 1],
] as const);
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_AUTHORITY_REGISTRY_DIGEST =
  digestRegistry("farmos.production-target-execution-postgres-authorities.v1",
    FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_AUTHORITY_REGISTRY);

export type FarmOsProductionTargetExecutionPostgresSchemaIdentity = Readonly<{
  migration_id: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID;
  apply_checksum: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256;
  schema_version: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_SCHEMA_VERSION;
  persistence_port_version: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_PORT_VERSION;
  relation_registry_digest: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_RELATION_REGISTRY_DIGEST;
  function_registry_digest: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_FUNCTION_REGISTRY_DIGEST;
  trigger_registry_digest: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_TRIGGER_REGISTRY_DIGEST;
  authority_registry_digest: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_AUTHORITY_REGISTRY_DIGEST;
}>;

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_EXPECTED_SCHEMA_IDENTITY =
  Object.freeze({
    migration_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID,
    apply_checksum: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256,
    schema_version: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_SCHEMA_VERSION,
    persistence_port_version: FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_PORT_VERSION,
    relation_registry_digest:
      FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_RELATION_REGISTRY_DIGEST,
    function_registry_digest:
      FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_FUNCTION_REGISTRY_DIGEST,
    trigger_registry_digest:
      FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_TRIGGER_REGISTRY_DIGEST,
    authority_registry_digest:
      FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_AUTHORITY_REGISTRY_DIGEST,
  } satisfies FarmOsProductionTargetExecutionPostgresSchemaIdentity);

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_CONTRACT = Object.freeze({
  status: "ISOLATED_MIGRATION_QUALIFIED",
  migration_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID,
  schema_version: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_SCHEMA_VERSION,
  persistence_port_version: FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_PORT_VERSION,
  schema: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_SCHEMA,
  role: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_ROLE,
  isolation: "SERIALIZABLE",
  mode: "READ WRITE",
  statement_timeout_ms: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_STATEMENT_TIMEOUT_MS,
  lock_timeout_ms: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_LOCK_TIMEOUT_MS,
  automatic_retry: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_AUTOMATIC_RETRY,
  startup_auto_apply: false,
  production_apply_authority: "authenticated_human_operator",
  auto_migration: false,
  database_connection_implemented_by_contract: false,
  environment_lookup: false,
  trusted_clock_producer_established: false,
  isolated_migration_qualified: true,
  durability_established: true,
  external_execution_authorized: false,
} as const);

export function parseFarmOsProductionTargetExecutionPostgresSchemaIdentity(
  value: unknown,
): FarmOsProductionTargetExecutionPostgresSchemaIdentity | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const expected = FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_EXPECTED_SCHEMA_IDENTITY;
  const keys = Object.keys(expected);
  return Object.keys(record).length === keys.length &&
      keys.every((key) => record[key] === expected[key as keyof typeof expected])
    ? expected
    : null;
}
