import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SECTIONS,
  type FarmOsProductionIdentityQueryV2Section,
} from "./farm_os_production_identity_query_v2_contract";

export const FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ARTIFACT_PATH =
  "scripts/sql/farm_os_production_identity_readonly_v2.sql" as const;
export const FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256 =
  "sha256:202053dadf34063c3ccfc69ede01197a217b968916936f33b7185090659faf95" as const;

export const FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING = Object.freeze({
  schema_version: "farmos.production-identity-query-runtime-binding.v1",
  binding_authority_id: "farmos.production-identity-query-runtime-binding.v2-foundation.1",
  authority_id: "farmos.production-target-identity-query.v2",
  query_artifact_path: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ARTIFACT_PATH,
  query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256,
  result_contract_version: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION,
  minimum_postgres_major: 16,
  postgres_qualification: "PG16_PG17_ISOLATED_EXECUTION_NOT_YET_QUALIFIED",
  enabled: false,
  automatic_latest_selection: false,
  automatic_retry: 0,
  repository_state: "REPOSITORY_ADOPTED",
  availability_state: "RUNTIME_AVAILABLE",
  binding_state: "DEFAULT_DISABLED",
  execution_state: "EXECUTION_DISABLED",
  deployment_artifact_policy: "TRACKED_SOURCE_ARTIFACT_REQUIRED_NO_EMBEDDED_FALLBACK",
} as const);

export type FarmOsProductionIdentityQueryV2RuntimeBinding = {
  schema_version: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING.schema_version;
  binding_authority_id: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING.binding_authority_id;
  authority_id: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING.authority_id;
  query_artifact_path: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ARTIFACT_PATH;
  query_sha256: `sha256:${string}`;
  result_contract_version: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION;
  minimum_postgres_major: 16;
  postgres_qualification: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING.postgres_qualification;
  enabled: boolean;
  automatic_latest_selection: false;
  automatic_retry: 0;
  repository_state: "REPOSITORY_ADOPTED";
  availability_state: "RUNTIME_AVAILABLE";
  binding_state: "DEFAULT_DISABLED";
  execution_state: "EXECUTION_DISABLED";
  deployment_artifact_policy: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING.deployment_artifact_policy;
};

export function parseFarmOsProductionIdentityQueryV2RuntimeBinding(
  value: unknown,
): typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const expected = FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING;
  const expectedRecord = expected as unknown as Record<string, unknown>;
  const keys = Object.keys(expected);
  if (Object.keys(candidate).length !== keys.length || !keys.every((key) => Object.hasOwn(candidate, key))) return null;
  return keys.every((key) => candidate[key] === expectedRecord[key]) ? expected : null;
}

export type FarmOsProductionIdentitySectionPlanEntry = Readonly<{
  ordinal: number;
  section_id: FarmOsProductionIdentityQueryV2Section;
  execution: "ALWAYS" | "ONLY_WHEN_H1_PRESENT";
  statement_sql: string;
}>;

export type FarmOsProductionIdentityArtifactVerification =
  | Readonly<{
    status: "VERIFIED";
    artifact_path: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ARTIFACT_PATH;
    sha256: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256;
    raw_bytes: Uint8Array;
    section_plan: readonly FarmOsProductionIdentitySectionPlanEntry[];
  }>
  | Readonly<{
    status: "BLOCKED";
    reason: "ARTIFACT_MISSING" | "ARTIFACT_SHA_MISMATCH" | "SECTION_PLAN_INVALID";
    artifact_path: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ARTIFACT_PATH;
    actual_sha256: `sha256:${string}` | null;
  }>;

function sha256Bytes(bytes: Uint8Array): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function buildSectionPlan(sql: string): readonly FarmOsProductionIdentitySectionPlanEntry[] | null {
  if (sql.includes("\r") || !sql.endsWith("\n")) return null;
  const marker = /^-- section:([A-Z0-9_]+)$/gmu;
  const matches = [...sql.matchAll(marker)];
  if (matches.length !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SECTIONS.length) return null;
  const entries: FarmOsProductionIdentitySectionPlanEntry[] = [];
  for (let index = 0; index < matches.length; index += 1) {
    const section = FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SECTIONS[index]!;
    const match = matches[index]!;
    if (match[1] !== section || match.index === undefined) return null;
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? sql.length;
    const statement = sql.slice(start, end).trim();
    if (!/^(?:select|with)\b/iu.test(statement) || !statement.endsWith(";") ||
      statement.slice(0, -1).includes(";") ||
      !/order\s+by\s+row_key\s+collate\s+"C"\s*;$/iu.test(statement)) return null;
    entries.push(Object.freeze({
      ordinal: index + 1,
      section_id: section,
      execution: section === "H2_MIGRATION_HISTORY_ROWS_IF_PRESENT" ? "ONLY_WHEN_H1_PRESENT" : "ALWAYS",
      statement_sql: statement,
    }));
  }
  return Object.freeze(entries);
}

export function verifyFarmOsProductionIdentityQueryV2ArtifactBytes(
  bytes: Uint8Array | null,
): FarmOsProductionIdentityArtifactVerification {
  if (bytes === null) {
    return { status: "BLOCKED", reason: "ARTIFACT_MISSING", artifact_path: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ARTIFACT_PATH, actual_sha256: null };
  }
  const actual = sha256Bytes(bytes);
  if (actual !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256) {
    return { status: "BLOCKED", reason: "ARTIFACT_SHA_MISMATCH", artifact_path: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ARTIFACT_PATH, actual_sha256: actual };
  }
  const sectionPlan = buildSectionPlan(Buffer.from(bytes).toString("utf8"));
  if (sectionPlan === null) {
    return { status: "BLOCKED", reason: "SECTION_PLAN_INVALID", artifact_path: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ARTIFACT_PATH, actual_sha256: actual };
  }
  return {
    status: "VERIFIED",
    artifact_path: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ARTIFACT_PATH,
    sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256,
    raw_bytes: bytes,
    section_plan: sectionPlan,
  };
}

const FIXED_ARTIFACT_URL = new URL(
  `../../../${FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ARTIFACT_PATH}`,
  import.meta.url,
);

export function loadFarmOsProductionIdentityQueryV2Artifact(): FarmOsProductionIdentityArtifactVerification {
  try {
    return verifyFarmOsProductionIdentityQueryV2ArtifactBytes(readFileSync(fileURLToPath(FIXED_ARTIFACT_URL)));
  } catch {
    return verifyFarmOsProductionIdentityQueryV2ArtifactBytes(null);
  }
}

export function createFarmOsProductionIdentityH2NotApplicableSentinel(
  h1State: "absent",
): Readonly<{
  section_id: "H2_MIGRATION_HISTORY_ROWS_IF_PRESENT";
  rows: readonly Readonly<{
    section_id: "H2_MIGRATION_HISTORY_ROWS_IF_PRESENT";
    row_key: "__collection_status__";
    payload: Readonly<{
      collection_status: "complete";
      inventory_complete: true;
      queried_target_count: 5;
      row_count: 0;
      state: "not_applicable";
    }>;
    sanitization_class: "SAFE_STRUCTURAL";
  }>[];
}> {
  void h1State;
  return Object.freeze({
    section_id: "H2_MIGRATION_HISTORY_ROWS_IF_PRESENT",
    rows: Object.freeze([Object.freeze({
      section_id: "H2_MIGRATION_HISTORY_ROWS_IF_PRESENT",
      row_key: "__collection_status__",
      payload: Object.freeze({
        collection_status: "complete",
        inventory_complete: true,
        queried_target_count: 5,
        row_count: 0,
        state: "not_applicable",
      }),
      sanitization_class: "SAFE_STRUCTURAL",
    })]),
  });
}

export const FARM_OS_PRODUCTION_IDENTITY_POSTGRES_COMPATIBILITY_POLICY = Object.freeze({
  schema_version: "farmos.production-identity-postgres-compatibility-policy.v1",
  minimum_postgres_major: 16,
  pg14: "BLOCK",
  pg15: "BLOCK",
  pg16: "ELIGIBLE_AT_POLICY_LAYER_ONLY",
  pg17: "ELIGIBLE_AT_POLICY_LAYER_ONLY",
  allowed_postgres_majors: Object.freeze([16, 17] as const),
  qualification_required_before_execution: true,
  basis: "pg_auth_members.inherit_option_and_set_option_exist_from_pg16",
} as const);

export function evaluateFarmOsProductionIdentityPostgresMajor(serverVersionNum: unknown):
  | { result: "BLOCK"; reason: "INVALID_SERVER_VERSION" | "POSTGRES_MAJOR_BELOW_MINIMUM" | "POSTGRES_MAJOR_NOT_REVIEWED" }
  | { result: "ELIGIBLE_AT_POLICY_LAYER"; postgres_major: number } {
  if (typeof serverVersionNum !== "number" || !Number.isSafeInteger(serverVersionNum) || serverVersionNum < 10000) {
    return { result: "BLOCK", reason: "INVALID_SERVER_VERSION" };
  }
  const major = Math.floor(serverVersionNum / 10000);
  if (major < FARM_OS_PRODUCTION_IDENTITY_POSTGRES_COMPATIBILITY_POLICY.minimum_postgres_major) {
    return { result: "BLOCK", reason: "POSTGRES_MAJOR_BELOW_MINIMUM" };
  }
  return !FARM_OS_PRODUCTION_IDENTITY_POSTGRES_COMPATIBILITY_POLICY.allowed_postgres_majors.includes(major as 16 | 17)
    ? { result: "BLOCK", reason: "POSTGRES_MAJOR_NOT_REVIEWED" }
    : { result: "ELIGIBLE_AT_POLICY_LAYER", postgres_major: major };
}

export const FARM_OS_PRODUCTION_IDENTITY_BOOTSTRAP_COMPATIBILITY_REQUIREMENT = Object.freeze({
  schema_version: "farmos.production-identity-bootstrap-compatibility-requirement.v1",
  authority_status: "REQUIRED_NOT_APPROVED",
  authority_id: null,
  purpose: "observe_server_version_num_before_full_v2_query_parsing_or_execution",
  proposed_query_bytes: "SELECT current_setting('server_version_num')::integer AS server_version_num;\n",
  proposed_query_sha256: "sha256:18aa8d2617daaf01fee517d453eeb21c611e9365b020b557881edf6828a8862a",
  execution_order: "AFTER_CONNECTION_AUTHORIZATION_BEFORE_FULL_V2_QUERY",
  version_from_connection_config: false,
} as const);

export type FarmOsProductionIdentityGateStatus = Readonly<{
  postgres_compatibility_authority: "APPROVED" | "MISSING_UNAPPROVED";
  target_manifest: "APPROVED" | "MISSING" | "UNAPPROVED";
  collector_authority: "APPROVED" | "MISSING" | "UNAPPROVED";
  connection_authority: "APPROVED_VERIFY_READER" | "MISSING" | "UNAPPROVED";
  execution_approval: "VALID_RESERVED_ONE_SHOT" | "MISSING" | "INVALID" | "REPLAYED";
}>;

export type FarmOsProductionIdentityPreconnectionPlan =
  | Readonly<{ result: "BLOCKED"; gate: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10; reason: string; credential_resolution_eligible: false }>
  | Readonly<{ result: "ELIGIBLE_TO_RESOLVE_CREDENTIAL"; credential_resolution_eligible: true }>;

export const FARM_OS_PRODUCTION_IDENTITY_PRECONNECTION_GATE_ORDER = Object.freeze([
  "BINDING_ENABLED", "BINDING_AUTHORITY_EXACT", "ARTIFACT_EXISTS", "ARTIFACT_SHA_EXACT",
  "SECTION_PLAN_EXACT", "POSTGRES_COMPATIBILITY_AUTHORITY_AVAILABLE",
  "TARGET_MANIFEST_APPROVED", "COLLECTOR_AUTHORITY_APPROVED",
  "VERIFY_READER_CONNECTION_AUTHORITY_APPROVED", "ONE_SHOT_EXECUTION_APPROVAL_VALID_RESERVED",
] as const);

export function planFarmOsProductionIdentityPreconnection(input: Readonly<{
  binding: unknown;
  artifact: FarmOsProductionIdentityArtifactVerification;
  authorities: FarmOsProductionIdentityGateStatus;
}>): FarmOsProductionIdentityPreconnectionPlan {
  const blocked = (gate: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10, reason: string): FarmOsProductionIdentityPreconnectionPlan =>
    ({ result: "BLOCKED", gate, reason, credential_resolution_eligible: false });
  const candidate = typeof input.binding === "object" && input.binding !== null
    ? input.binding as Record<string, unknown> : null;
  if (candidate?.enabled !== true) return blocked(1, "BINDING_DISABLED");
  const binding = parseFarmOsProductionIdentityQueryV2RuntimeBinding(input.binding);
  if (binding === null) return blocked(2, "BINDING_NOT_EXACT_APPROVED_FOUNDATION_CONTRACT");
  void binding;
  void input.artifact;
  void input.authorities;
  return blocked(1, "BINDING_DISABLED");
}

export type FarmOsApprovedTargetManifestReference = Readonly<{
  target_digest: `sha256:${string}`;
  approval_reference: string;
  revision_digest: `sha256:${string}`;
  approved_at: string;
  expires_at: string;
  revoked: false;
}>;
export interface TargetManifestProvider {
  getApprovedTargetManifest(input: Readonly<{
    target_digest: `sha256:${string}`;
    manifest_version: "farmos.core-db-provisioning-manifest.v1";
    approval_reference: string;
  }>): Promise<FarmOsApprovedTargetManifestReference | null>;
}
export interface CollectorAuthorityProvider {
  getApprovedCollectorAuthority(input: Readonly<{
    collector_authority_id: string;
    revision_digest: `sha256:${string}`;
  }>): Promise<Readonly<{
    collector_authority_id: string;
    revision_digest: `sha256:${string}`;
    approved_at: string;
    expires_at: string;
    revoked: false;
  }> | null>;
}
export interface PostgresCompatibilityAuthorityProvider {
  getApprovedCompatibilityAuthority(input: Readonly<{
    authority_id: string;
    bootstrap_query_sha256: typeof FARM_OS_PRODUCTION_IDENTITY_BOOTSTRAP_COMPATIBILITY_REQUIREMENT.proposed_query_sha256;
    required_postgres_major: 16 | 17;
  }>): Promise<Readonly<{
    authority_id: string;
    bootstrap_query_sha256: typeof FARM_OS_PRODUCTION_IDENTITY_BOOTSTRAP_COMPATIBILITY_REQUIREMENT.proposed_query_sha256;
    qualified_postgres_major: 16 | 17;
    qualification_digest: `sha256:${string}`;
    approved_at: string;
    expires_at: string;
    revoked: false;
  }> | null>;
}
export interface ConnectionAuthorityProvider {
  getApprovedVerifyReaderConnectionAuthority(input: Readonly<{
    connection_authority_id: string;
    approved_target_digest: `sha256:${string}`;
  }>): Promise<Readonly<{
    connection_authority_id: string;
    purpose: "PRODUCTION_IDENTITY_VERIFY_READER";
    approved_target_digest: `sha256:${string}`;
    revision_digest: `sha256:${string}`;
    approved_at: string;
    expires_at: string;
    revoked: false;
  }> | null>;
}
export type FarmOsOneShotExecutionApproval = Readonly<{
  target_digest: `sha256:${string}`;
  collector_authority_id: string;
  query_authority_id: "farmos.production-target-identity-query.v2";
  connection_authority_id: string;
  principal: string;
  execution_id: string;
  nonce_digest: `sha256:${string}`;
  issued_at: string;
  approved_at: string;
  expires_at: string;
  max_executions: 1;
  reservation_state: "RESERVED" | "CONSUMED";
}>;
export interface ExecutionApprovalProvider {
  reserveValidOneShotApproval(input: Readonly<{
    target_digest: `sha256:${string}`;
    collector_authority_id: string;
    query_authority_id: "farmos.production-target-identity-query.v2";
    connection_authority_id: string;
  }>): Promise<FarmOsOneShotExecutionApproval | null>;
  consumeReservedApproval(input: Readonly<{
    execution_id: string;
    nonce_digest: `sha256:${string}`;
    expected_reservation_state: "RESERVED";
  }>): Promise<Readonly<{ consumed: true; execution_id: string }> | Readonly<{ consumed: false; reason: "REPLAYED" | "NOT_RESERVED" | "CONFLICT" }>>;
  releaseReservationAfterFailure(input: Readonly<{
    execution_id: string;
    nonce_digest: `sha256:${string}`;
    failure_digest: `sha256:${string}`;
  }>): Promise<Readonly<{ released: true }> | Readonly<{ released: false; reason: "ALREADY_CONSUMED" | "NOT_RESERVED" }>>;
}
export interface ExecutionApprovalValidator {
  validateReservedOneShot(input: Readonly<{
    approval: unknown;
    expected_target_digest: `sha256:${string}`;
    expected_collector_authority_id: string;
    expected_query_authority_id: "farmos.production-target-identity-query.v2";
    expected_connection_authority_id: string;
    evaluated_at: string;
  }>): Readonly<{ valid: true; approval: FarmOsOneShotExecutionApproval }> |
    Readonly<{ valid: false; reason: "INVALID" | "EXPIRED" | "UNBOUND" | "REPLAYED" | "NOT_RESERVED" }>;
}
export interface VerifyReaderCredentialResolver {
  resolve(input: Readonly<{
    approved_target_digest: `sha256:${string}`;
    purpose: "PRODUCTION_IDENTITY_VERIFY_READER";
    connection_authority_id: string;
    approval_execution_id: string;
  }>): Promise<unknown>;
}
export interface ProductionReadOnlyConnection {
  readonly maxConnections: 1;
  readonly retry: 0;
  readonly readOnly: true;
  readonly transaction: "REPEATABLE READ READ ONLY";
  begin(): Promise<void>;
  executeSection(section: Readonly<{ section_id: FarmOsProductionIdentityQueryV2Section; statement_sql: string }>): Promise<unknown>;
  rollback(): Promise<void>;
}
export interface EvidenceWriter<Envelope> {
  write(input: Readonly<{
    envelope: Envelope;
    validated_complete_sanitized: true;
    bound_target_digest: `sha256:${string}`;
    bound_approval_execution_id: string;
    canonical_json_sha256: `sha256:${string}`;
    mode: "0600_ATOMIC_EXTERNAL_DIRECTORY";
  }>): Promise<Readonly<{ written: true }> | Readonly<{ written: false; reason: string }>>;
}

export const FARM_OS_PRODUCTION_IDENTITY_RUNTIME_PORTS = Object.freeze({
  target_manifest_provider: "NONE",
  postgres_compatibility_authority_provider: "NONE",
  collector_authority_provider: "NONE",
  connection_authority_provider: "NONE",
  execution_approval_provider: "NONE",
  verify_reader_credential_resolver: "NONE",
  production_readonly_connection: "NONE",
  evidence_writer: "NONE",
} as const);
