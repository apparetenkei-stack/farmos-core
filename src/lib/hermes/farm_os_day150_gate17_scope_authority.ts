import { createHash } from "node:crypto";

const canonical = (value: unknown): string => {
  if (value === null || typeof value === "boolean" || typeof value === "string" ||
    typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value !== "object") throw new Error("NON_JSON_SCOPE_AUTHORITY");
  const source = value as Record<string, unknown>;
  return `{${Object.keys(source).sort().map((key) =>
    `${JSON.stringify(key)}:${canonical(source[key])}`).join(",")}}`;
};

export const FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY = Object.freeze({
  schema_version: "farmos.day150-gate17-scope-authority.v1",
  authority_id: "DAY150_GATE17_MINIMAL_SCOPE_AUTHORITY_V1",
  authority_revision: 1,
  authority_state: "PRODUCT_OWNER_ADOPTED",
  adopted_on: "2026-08-16",
  closure_authority_lock_sha256:
    "4f7104bb063fbc1dc7b425773e228d8ab6b17b8291559d9218c4ec270609e35f",
  minimal_business_scope: Object.freeze([
    "ISOLATED_POSTGRESQL_17_REFERENCE_EXECUTION",
    "MINIMAL_INITIAL_CATALOG_AUTHORITY",
    "EXACT_FIVE_PINNED_MIGRATIONS_APPLIED_ONCE_IN_ORDER",
    "EXACT_FIVE_TRUSTED_CATALOG_SNAPSHOTS",
    "EXACT_FIVE_EXPECTED_CATALOG_CANDIDATES",
    "BOUNDED_OWNED_DISPOSABLE_DOCKER_RESOURCE_CLEANUP",
    "INDEPENDENT_ZERO_RESIDUAL_VERIFICATION",
    "EXACT_FIVE_PRODUCT_OWNER_REVIEW_AND_PROMOTION_BOUNDARY",
  ]),
  operation_limits: Object.freeze({
    production: 0,
    canonical: 0,
    b2: 0,
    formal_production_gate2: 0,
  }),
  required_gate13_properties: Object.freeze([
    "EXACT_PRODUCT_OWNER_AUTHORIZATION_BINDING",
    "DURABLE_ONE_SHOT_EXECUTION",
    "CONSUMED_AUTHORIZATION_REPLAY_REJECTION",
    "RESTART_AND_PROCESS_LOSS_RECONSTRUCTION",
    "CLAIM_MARKER_CONSISTENCY",
    "SUCCESS_XOR_TERMINAL_RECEIPT_CONSISTENCY",
    "STALE_AUTHORIZATION_REJECTION",
    "HUMAN_EXACT_FIVE_PROMOTION_BOUNDARY",
  ]),
  readiness_evidence_requirements: Object.freeze([
    "ACTUAL_POSTGRESQL_READINESS_BEHAVIOR",
    "BOUNDED_READINESS",
    "NO_OVERSTATED_PROBE_OR_RETRY_CLAIMS",
    "POSTGRESQL_MAJOR_17_VERIFICATION",
    "EXACT_MIGRATION_AND_SNAPSHOT_PROVENANCE",
  ]),
  same_uid_hostile_mutation_threat:
    "FUTURE_UNASSIGNED_DEFENSE_IN_DEPTH",
  non_gate_implementation_techniques: Object.freeze([
    "ROOT_OWNED_FIXED_NODE_RUNTIME",
    "ADMINISTRATOR_OWNED_IMMUTABLE_NODE_TREE",
    "IMMUTABLE_DOCKER_CLI_TRUST_ROOT",
    "HOSTILE_SAME_UID_MUTATION_RESISTANCE",
    "ROOT_OWNED_APPROVAL_OR_EVIDENCE_STORE",
    "ACTUAL_ACL_OR_ANCESTOR_HOSTILE_MUTATION_QUALIFICATION",
    "PRODUCTION_GRADE_HOST_RUNTIME_ISOLATION",
    "DEDICATED_OS_PRINCIPAL_FOR_DEFENSE_IN_DEPTH",
    "SEALED_BUNDLE_FOR_HOSTILE_SAME_UID_RESISTANCE",
  ]),
  future_phase_authority: "NOT_ADOPTED_NOT_A_DAY150_BLOCKER",
  closure_gate_count_unchanged: 22,
} as const);

export const FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST =
  `sha256:${createHash("sha256").update(
    `farmos.day150-gate17-scope-authority.v1\n${canonical(
      FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY)}`,
  ).digest("hex")}` as const;
