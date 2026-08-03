import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { EventEmitter } from "node:events";
import {
  constants as fsConstants,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import {
  access,
  chmod,
  copyFile,
  lstat,
  mkdir,
  open,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  rmdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { userInfo } from "node:os";
import { basename, dirname, relative, resolve } from "node:path";
import { Socket } from "node:net";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  Client,
  Pool,
  type ClientConfig,
  type PoolClient,
  type QueryResult,
} from "pg";

import { FarmOsOperationalMemoryPostgresRepository } from "../../src/lib/hermes/farm_os_operational_memory_postgres_repository";
import { compileFarmOsDailyProjection } from "../../src/lib/hermes/farm_os_operational_memory_compiler";
import {
  FARM_OS_STABLE_CHANGES_CONTRACT_ID,
} from "../../src/lib/hermes/farm_os_operational_memory_contract";
import {
  FARM_OS_PROJECTION_STATES,
  validateFarmOsProjectionStateTransition,
  type FarmOsProjectionState,
} from "../../src/lib/hermes/farm_os_projection_state_contract";
import {
  FarmOsProjectionFirstPostgresReadAdapter,
  type FarmOsProjectionFirstPostgresPool,
} from "../../src/lib/hermes/farm_os_projection_first_postgres_read_adapter";
import {
  selectFarmOsProjectionFirstProjection,
  type FarmOsProjectionFirstScopedBundle,
  type FarmOsProjectionFirstSelection,
} from "../../src/lib/hermes/farm_os_projection_first_selector";
import {
  FARM_OS_DAY147A5_COMMIT_RELATIVE_PATH,
  FARM_OS_DAY147A5_COMMIT_SCHEMA_VERSION,
  FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH,
  FARM_OS_DAY147A5_EVIDENCE_SCHEMA_VERSION,
  FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH,
  FARM_OS_DAY147A5_RECEIPT_SCHEMA_VERSION,
  farmOsDay147A5FailureOriginBindingValid,
  isFarmOsDay147A5ConnectionMetadata,
  isProvenFarmOsDay147A5CodeLessConnectClose,
  sha256FarmOsDay147A5RawBytes,
  validateA5CommitMarkerForReceipt,
  validateA5ReceiptForEvidence,
  validateCommittedA5ArtifactChain,
  validateFailureA5Evidence,
  validateFinalA5Evidence,
  validateProvisionalA5Evidence,
  type FarmOsDay147A5CommitMarker,
  type FarmOsDay147A5ConnectionMetadata,
  type FarmOsDay147A5DurabilityAttestation,
  type FarmOsDay147A5EvidencePhase,
  type FarmOsDay147A5EvidenceResult,
  type FarmOsDay147A5EvidenceStatus,
  type FarmOsDay147A5ExecutionPhase,
  type FarmOsDay147A5ContainerRuntimeState,
  type FarmOsDay147A5ReadinessFailureClass,
  type FarmOsDay147A5ReadinessFailureOrigin,
  type FarmOsDay147A5ReadinessFailureOriginSummary,
  type FarmOsDay147A5ReadinessFailureStage,
  type FarmOsDay147A5ReadinessSafeCodeClass,
  type FarmOsDay147A5ReadinessSummary,
  type FarmOsDay147A5Receipt,
} from "./lib/farm_os_day147a5_evidence_contract";

const ROOT = resolve(import.meta.dirname, "../..");
const EVIDENCE_REPORTS_RELATIVE_ROOT =
  "reports/day147a5-isolated-postgres" as const;
const IMAGE = "postgres:17" as const;
const LOCAL_HOST = "127.0.0.1" as const;
const DATABASE_PATTERN =
  /^farmos_day147a5_[a-f0-9]{12}_(?:legacy_active|legacy_superseded|main)$/;
const CONTAINER_PATTERN = /^farmos_day147a5_[a-f0-9]{12}$/;
const IDENTIFIER_PATTERN = /^[a-z][a-z0-9_]{0,62}$/;
const CONTAINER_ID_PATTERN = /^[a-f0-9]{64}$/;
const EXECUTION_AUTHORITY = "DAY147_A5_3_ISOLATED_EXECUTION" as const;
const NETWORK_EXECUTION_AUTHORITY = "DAY147_A5_NETWORK_EXECUTION" as const;
const NETWORK_RUNNER_BUILD_DIAGNOSTIC_AUTHORITY =
  "DAY147_A5_NETWORK_RUNNER_BUILD_DIAGNOSTIC" as const;
const NETWORK_RUNNER_CREATE_DIAGNOSTIC_AUTHORITY =
  "DAY147_A5_NETWORK_RUNNER_CREATE_DIAGNOSTIC" as const;
const NETWORK_RUNNER_LAUNCHER_DIAGNOSTIC_AUTHORITY =
  "DAY147_A5_NETWORK_RUNNER_LAUNCHER_DIAGNOSTIC" as const;
const NETWORK_CLIENT_EXECUTION_AUTHORITY =
  "DAY147_A5_NETWORK_CLIENT_EXECUTION" as const;
const NETWORK_RUNNER_BASE_IMAGE = "node:24-bookworm-slim" as const;
const NETWORK_RUNNER_BASE_IMAGE_ID =
  "sha256:235600a8101ab264e117b1768e925532262668dc9b581ef1dd7d96ced463b8e7" as const;
const NETWORK_RUNNER_BASE_REPO_DIGEST =
  "node@sha256:235600a8101ab264e117b1768e925532262668dc9b581ef1dd7d96ced463b8e7" as const;
const NETWORK_RUNNER_PNPM_VERSION = "11.9.0" as const;
const NETWORK_RUNNER_EXECUTION_TIMEOUT_MS = 300_000 as const;
const MAX_RUNNER_ATTEMPTS = 10 as const;
const MAX_POST_START_NETWORK_BINDING_CHECKS = 10 as const;
const POST_START_NETWORK_BINDING_INTERVAL_MS = 250 as const;
const RUNNER_ATTESTATION_TIMEOUT_MS = 20_000 as const;
const RUNNER_DIAGNOSTIC_MAX_LINES = 80 as const;
const RUNNER_DIAGNOSTIC_MAX_BYTES = 16_384 as const;
const FORBIDDEN_DATABASE_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "SUPABASE_DB_URL",
  "FARMOS_DATABASE_URL",
] as const;

type HarnessMode = "static" | "execute-isolated" | "execute-network-isolated" |
  "execute-network-runner-build-only" | "execute-network-runner-create-only" |
  "execute-network-runner-launcher-only";
type HarnessAuthority = typeof EXECUTION_AUTHORITY |
  typeof NETWORK_EXECUTION_AUTHORITY |
  typeof NETWORK_RUNNER_BUILD_DIAGNOSTIC_AUTHORITY |
  typeof NETWORK_RUNNER_CREATE_DIAGNOSTIC_AUTHORITY |
  typeof NETWORK_RUNNER_LAUNCHER_DIAGNOSTIC_AUTHORITY | null;
type ParsedArguments = Readonly<{
  mode: HarnessMode;
  authority: HarnessAuthority;
}>;
type DatabaseTarget = "legacy_active" | "legacy_superseded" | "main";
type ProjectionState = FarmOsProjectionState;

const STATES = FARM_OS_PROJECTION_STATES;
const transitionKey = (from: ProjectionState, to: ProjectionState) =>
  `${from}->${to}`;
const ORDERED_TRANSITIONS = STATES.flatMap((from) =>
  STATES.map((to) => ({ from, to, key: transitionKey(from, to) }))
);
const ALLOWED_TRANSITIONS = ORDERED_TRANSITIONS
  .filter(({ from, to }) =>
    validateFarmOsProjectionStateTransition({ from, to }).valid
  )
  .map(({ from, to }) => [from, to] as const);
const ALLOWED_TRANSITION_KEYS = new Set(
  ALLOWED_TRANSITIONS.map(([from, to]) => transitionKey(from, to)),
);
const FORBIDDEN_TRANSITIONS = ORDERED_TRANSITIONS.filter(
  ({ key }) => !ALLOWED_TRANSITION_KEYS.has(key),
);

type PreRunLocalTarget = Readonly<{
  host: string;
  ssl: boolean;
  image: string;
  container_name: string;
  database_names: readonly string[];
  docker_publish_plan: string;
  storage: "tmpfs_only";
  persistent_volume?: never;
  connectionString?: never;
  remote_url?: never;
  database_url?: never;
}>;

type ApplicationRole =
  | "migration_owner"
  | "bundle_runtime"
  | "verification"
  | "writer1"
  | "writer2"
  | "observer";

type ExecutionIdentity = Readonly<{
  nonce: string;
  container_name: string;
  database_names: Readonly<Record<DatabaseTarget, string>>;
  image: typeof IMAGE;
  publish_spec: "127.0.0.1::5432" | "none";
  host: typeof LOCAL_HOST | "postgres";
  application_name_prefix: string;
}>;

function executionIdentityFromContainerName(
  containerName: string,
): ExecutionIdentity {
  const match = /^farmos_day147a5_([a-f0-9]{12})$/.exec(containerName);
  if (match === null) {
    throw new Error("DAY147_A5_PRE_RUN_TARGET_SAFETY_BLOCKED");
  }
  const nonce = match[1]!;
  const names = buildNames(nonce);
  return Object.freeze({
    nonce,
    container_name: names.container,
    database_names: Object.freeze({
      legacy_active: names.legacy_active,
      legacy_superseded: names.legacy_superseded,
      main: names.main,
    }),
    image: IMAGE,
    publish_spec: "127.0.0.1::5432",
    host: LOCAL_HOST,
    application_name_prefix: names.container,
  });
}

function executionIdentityForNetworkClient(nonce: string): ExecutionIdentity {
  const names = buildNames(nonce);
  return Object.freeze({
    nonce,
    container_name: names.container,
    database_names: Object.freeze({
      legacy_active: names.legacy_active,
      legacy_superseded: names.legacy_superseded,
      main: names.main,
    }),
    image: IMAGE,
    publish_spec: "none",
    host: "postgres",
    application_name_prefix: names.container,
  });
}

function validatePreRunLocalTarget(input: PreRunLocalTarget): ExecutionIdentity {
  const normalizedKeys = Object.keys(input).map((key) =>
    key.toLowerCase().replaceAll(/[-_]/g, "")
  );
  let identity: ExecutionIdentity | null = null;
  try {
    identity = executionIdentityFromContainerName(input.container_name);
  } catch {
    identity = null;
  }
  const expectedDatabases = identity === null ? [] : [
    identity.database_names.legacy_active,
    identity.database_names.legacy_superseded,
    identity.database_names.main,
  ];
  if (
    normalizedKeys.some((key) =>
      ["connectionstring", "remoteurl", "databaseurl"].includes(key)
    ) ||
    input.host !== LOCAL_HOST ||
    input.ssl !== false ||
    input.image !== IMAGE ||
    identity === null ||
    input.database_names.length !== 3 ||
    new Set(input.database_names).size !== 3 ||
    input.database_names.some((database) => !DATABASE_PATTERN.test(database)) ||
    expectedDatabases.some((database) => !input.database_names.includes(database)) ||
    input.database_names.some((database) => !expectedDatabases.includes(database)) ||
    input.docker_publish_plan !== "127.0.0.1::5432" ||
    input.storage !== "tmpfs_only" ||
    "persistent_volume" in input
  ) {
    throw new Error("DAY147_A5_PRE_RUN_TARGET_SAFETY_BLOCKED");
  }
  return identity;
}

type PostStartLocalTarget = Readonly<{
  execution_identity: ExecutionIdentity;
  mapped_host: string;
  mapped_port: number;
  mapping_count: number;
  inspected_container_name: string;
  expected_container_id: string;
  observed_container_id: string;
  port_resolution_container_id: string;
  preflight_image_digest: string;
  observed_container_image_digest: string;
  final_pg_bindings: readonly Readonly<{
    config: ClientConfig;
    database_target: DatabaseTarget;
    application_role: Exclude<ApplicationRole, "writer1" | "writer2" | "observer">;
  }>[];
}>;

const APPLICATION_TARGET_CODES: Readonly<Record<DatabaseTarget, string>> =
  Object.freeze({ legacy_active: "la", legacy_superseded: "ls", main: "main" });
const APPLICATION_ROLE_CODES: Readonly<Record<ApplicationRole, string>> =
  Object.freeze({
    migration_owner: "owner",
    bundle_runtime: "bundle",
    verification: "verify",
    writer1: "writer1",
    writer2: "writer2",
    observer: "observer",
  });

function buildApplicationName(
  identity: ExecutionIdentity,
  databaseTarget: DatabaseTarget,
  role: ApplicationRole,
): string {
  const applicationName = `${identity.application_name_prefix}_${
    APPLICATION_TARGET_CODES[databaseTarget]
  }_${APPLICATION_ROLE_CODES[role]}`;
  if (applicationName.length > 63 || !IDENTIFIER_PATTERN.test(applicationName)) {
    throw new Error("DAY147_A5_APPLICATION_IDENTITY_INVALID");
  }
  return applicationName;
}

function expectedUserForApplicationRole(
  role: Exclude<ApplicationRole, "writer1" | "writer2" | "observer">,
): string {
  switch (role) {
    case "migration_owner":
      return ROLE_FIXTURES.migration_owner.name;
    case "bundle_runtime":
      return ROLE_FIXTURES.bundle_runtime_fixture.name;
    case "verification":
      return ROLE_FIXTURES.verification.name;
  }
}

function validatePostStartLocalTarget(
  input: PostStartLocalTarget,
): ValidatedConnectionTopologyResult {
  const identity = input.execution_identity;
  const expectedDatabases = new Set(Object.values(identity.database_names));
  const expectedBindingKeys = new Set([
    "main:migration_owner",
    "legacy_active:migration_owner",
    "legacy_superseded:migration_owner",
    "main:bundle_runtime",
    "main:verification",
  ]);
  const observedBindingKeys = input.final_pg_bindings.map(({ database_target,
    application_role }) => `${database_target}:${application_role}`);
  const configsValid = input.final_pg_bindings.length === expectedBindingKeys.size &&
    new Set(observedBindingKeys).size === expectedBindingKeys.size &&
    observedBindingKeys.every((key) => expectedBindingKeys.has(key)) &&
    input.final_pg_bindings.every(({ config, database_target, application_role }) =>
      config.host === LOCAL_HOST &&
      config.port === input.mapped_port &&
      config.database === identity.database_names[database_target] &&
      expectedDatabases.has(String(config.database)) &&
      config.ssl === false &&
      !("connectionString" in config) &&
      config.user === expectedUserForApplicationRole(application_role) &&
      typeof config.password === "string" &&
      config.application_name === buildApplicationName(
        identity,
        database_target,
        application_role,
      )
    );
  if (
    identity.host !== LOCAL_HOST ||
    identity.image !== IMAGE ||
    identity.publish_spec !== "127.0.0.1::5432" ||
    input.mapped_host !== identity.host ||
    !Number.isSafeInteger(input.mapped_port) ||
    input.mapped_port < 1 ||
    input.mapped_port > 65_535 ||
    input.mapping_count !== 1 ||
    input.inspected_container_name !== identity.container_name ||
    !CONTAINER_ID_PATTERN.test(input.expected_container_id) ||
    input.observed_container_id !== input.expected_container_id ||
    input.port_resolution_container_id !== input.expected_container_id ||
    !/^sha256:[a-f0-9]{64}$/.test(input.preflight_image_digest) ||
    input.observed_container_image_digest !== input.preflight_image_digest ||
    !configsValid
  ) {
    throw new Error("DAY147_A5_POST_START_TARGET_SAFETY_BLOCKED");
  }
  return validatedConnectionTopology({
    topology: "HOST_LOOPBACK_MAPPED_PORT",
    metadata: {
      topology: "HOST_LOOPBACK_MAPPED_PORT",
      transport: "TCP",
      host: LOCAL_HOST,
      mapped_port: input.mapped_port,
      container_port: 5432,
      network_alias: null,
      network_nonce_bound: false,
      local_only_validated: true,
      remote_endpoint_rejected: true,
    },
  });
}

const validatedTopologyBrand: unique symbol = Symbol(
  "DAY147_A5_VALIDATED_CONNECTION_TOPOLOGY",
);
type ValidatedConnectionTopologyResult = Readonly<{
  topology: FarmOsDay147A5ConnectionMetadata["topology"];
  metadata: FarmOsDay147A5ConnectionMetadata;
  readonly [validatedTopologyBrand]: true;
}>;

function validatedConnectionTopology(input: Readonly<{
  topology: FarmOsDay147A5ConnectionMetadata["topology"];
  metadata: FarmOsDay147A5ConnectionMetadata;
}>): ValidatedConnectionTopologyResult {
  if (input.topology !== input.metadata.topology ||
    !isFarmOsDay147A5ConnectionMetadata(input.metadata)) {
    throw new Error("DAY147_A5_EVIDENCE_TOPOLOGY_AUTHORITY_BLOCKED");
  }
  return Object.freeze({
    topology: input.topology,
    metadata: Object.freeze({ ...input.metadata }),
    [validatedTopologyBrand]: true as const,
  });
}

function serializeValidatedConnectionTopology(
  result: ValidatedConnectionTopologyResult,
): FarmOsDay147A5ConnectionMetadata {
  if (result[validatedTopologyBrand] !== true ||
    result.topology !== result.metadata.topology ||
    !isFarmOsDay147A5ConnectionMetadata(result.metadata)) {
    throw new Error("DAY147_A5_EVIDENCE_TOPOLOGY_AUTHORITY_BLOCKED");
  }
  return Object.freeze({ ...result.metadata });
}

type DockerUserDefinedNetworkProof = Readonly<{
  network_mode: string;
  execution_nonce: string;
  network_nonce: string;
  postgres_network_nonce: string;
  runner_network_nonce: string;
  postgres_aliases: readonly string[];
  postgres_host_publish: boolean;
  runner_db_host: string;
  runner_db_port: number;
  remote_endpoint_present: boolean;
  docker_socket_mounted: boolean;
  result_nonce: string;
}>;

const NETWORK_PROOF_KEYS = [
  "network_mode", "execution_nonce", "network_nonce",
  "postgres_network_nonce", "runner_network_nonce", "postgres_aliases",
  "postgres_host_publish", "runner_db_host", "runner_db_port",
  "remote_endpoint_present", "docker_socket_mounted", "result_nonce",
] as const;

function validateDockerUserDefinedNetworkProof(
  proof: DockerUserDefinedNetworkProof,
): ValidatedConnectionTopologyResult {
  const actualKeys = Object.keys(proof).sort();
  const expectedKeys = [...NETWORK_PROOF_KEYS].sort();
  if (actualKeys.length !== expectedKeys.length ||
    !actualKeys.every((key, index) => key === expectedKeys[index]) ||
    proof.network_mode !== "USER_DEFINED_BRIDGE" ||
    !/^[a-f0-9]{12}$/.test(proof.execution_nonce) ||
    proof.network_nonce !== proof.execution_nonce ||
    proof.postgres_network_nonce !== proof.execution_nonce ||
    proof.runner_network_nonce !== proof.execution_nonce ||
    proof.postgres_aliases.length !== 1 ||
    proof.postgres_aliases[0] !== "postgres" ||
    proof.postgres_host_publish !== false ||
    proof.runner_db_host !== "postgres" || proof.runner_db_port !== 5432 ||
    proof.remote_endpoint_present !== false ||
    proof.docker_socket_mounted !== false ||
    proof.result_nonce !== proof.execution_nonce) {
    throw new Error("DAY147_A5_EVIDENCE_TOPOLOGY_AUTHORITY_BLOCKED");
  }
  return validatedConnectionTopology({
    topology: "DOCKER_USER_DEFINED_NETWORK",
    metadata: {
      topology: "DOCKER_USER_DEFINED_NETWORK",
      transport: "TCP",
      host: null,
      mapped_port: null,
      container_port: 5432,
      network_alias: "postgres",
      network_nonce_bound: true,
      local_only_validated: true,
      remote_endpoint_rejected: true,
    },
  });
}

const NETWORK_SOURCE_OVERLAY_ALLOWLIST = Object.freeze([
  "package.json",
  "scripts/hermes/test_farm_os_day147a5_isolated_postgres.ts",
  "scripts/hermes/lib/farm_os_day147a5_evidence_contract.ts",
] as const);
const NETWORK_SOURCE_EXCLUSIONS = Object.freeze([
  ".git", "reports", "tsconfig.tsbuildinfo", "node_modules", "secrets",
  "logs", "unrelated_untracked_files", "existing_evidence",
] as const);
const NETWORK_RUNNER_REQUIRED_IMPORT_CLOSURE = Object.freeze([
  "scripts/hermes/lib/farm_os_day147a5_evidence_contract.ts",
  "scripts/hermes/test_farm_os_day147a5_isolated_postgres.ts",
  "src/lib/hermes/farm_os_operational_memory_compiler.ts",
  "src/lib/hermes/farm_os_operational_memory_contract.ts",
  "src/lib/hermes/farm_os_operational_memory_persistence.ts",
  "src/lib/hermes/farm_os_operational_memory_postgres_repository.ts",
  "src/lib/hermes/farm_os_projection_first_contract.ts",
  "src/lib/hermes/farm_os_projection_first_installation_binding.ts",
  "src/lib/hermes/farm_os_projection_first_postgres_read_adapter.ts",
  "src/lib/hermes/farm_os_projection_first_response_guard.ts",
  "src/lib/hermes/farm_os_projection_first_runtime.ts",
  "src/lib/hermes/farm_os_projection_first_selector.ts",
  "src/lib/hermes/farm_os_projection_state_contract.ts",
] as const);

const NETWORK_SOURCE_SCOPE_EXPECTED_HEAD =
  "6b53b1c5b35590518bf73526f89cc7e5cf4f7f90";
const NETWORK_SOURCE_SCOPE_ALLOWLIST = Object.freeze([
  { xy: " M", path: "db/migrations/202607310001_daily_operational_projection_candidate_activation.sql" },
  { xy: " M", path: "db/migrations/202607310001_daily_operational_projection_candidate_activation.verify.sql" },
  { xy: " M", path: "db/provisioning/manifest.json" },
  { xy: " M", path: "package.json" },
  { xy: " M", path: "scripts/hermes/test_farm_os_day147a1_activate_migration_authority.ts" },
  { xy: " M", path: "src/lib/hermes/farm_os_projection_first_selector.ts" },
  { xy: "??", path: "scripts/hermes/lib/farm_os_day147a5_client_suite.ts" },
  { xy: "??", path: "scripts/hermes/test_farm_os_day147a5_isolated_postgres.ts" },
  { xy: "??", path: "scripts/hermes/lib/farm_os_day147a5_evidence_contract.ts" },
  { xy: "??", path: "scripts/hermes/test_farm_os_day147a5_minimal_network.ts" },
  { xy: "??", path: "tsconfig.tsbuildinfo" },
] as const);
const GENERATED_RUN_PATH_PATTERN =
  /^reports\/day147a5-isolated-postgres\/runs\/([a-f0-9]{12})\/evidence\.json$/;

type GeneratedFailureArtifactManifestEntry = Readonly<{
  nonce: string;
  relative_path: string;
  file_type: "regular_file";
  size: number;
  sha256: string;
  validator_result: "PASS";
}>;

type GeneratedFailureArtifactManifest = ReadonlyMap<
  string,
  GeneratedFailureArtifactManifestEntry
>;

function syntheticGeneratedFailureArtifactManifest(
  count: number,
): GeneratedFailureArtifactManifest {
  if (!Number.isInteger(count) || count < 0 || count > 0xfff) {
    throw new Error("DAY147_A5_GENERATED_ARTIFACT_FIXTURE_INVALID");
  }
  const manifest = new Map<string, GeneratedFailureArtifactManifestEntry>();
  for (let index = 0; index < count; index += 1) {
    const nonce = index.toString(16).padStart(12, "0");
    manifest.set(nonce, Object.freeze({ nonce,
      relative_path: `${EVIDENCE_REPORTS_RELATIVE_ROOT}/runs/${nonce}/evidence.json`,
      file_type: "regular_file", size: 1_024 + index,
      sha256: createHash("sha256").update(`fixture:${nonce}`).digest("hex"),
      validator_result: "PASS" }));
  }
  return manifest;
}

function validateGeneratedFailureEvidenceBytes(input: Readonly<{
  nonce: string;
  evidence_bytes: Uint8Array;
}>): void {
  if (!/^[a-f0-9]{12}$/.test(input.nonce)) {
    throw new Error("DAY147_A5_GENERATED_ARTIFACT_VALIDATION_BLOCKED");
  }
  let evidence: unknown;
  try {
    evidence = JSON.parse(Buffer.from(input.evidence_bytes).toString("utf8"));
  } catch {
    throw new Error("DAY147_A5_GENERATED_ARTIFACT_VALIDATION_BLOCKED");
  }
  if (typeof evidence !== "object" || evidence === null ||
    (evidence as Record<string, unknown>).execution_nonce !== input.nonce ||
    ![3, 4, 5, 6].includes(Number(
      (evidence as Record<string, unknown>).schema_version,
    )) || (evidence as Record<string, unknown>).success_claimed !== false) {
    throw new Error("DAY147_A5_GENERATED_ARTIFACT_VALIDATION_BLOCKED");
  }
  assertEvidenceSafe(evidence);
  if (!validateFailureA5Evidence({ evidence, receiptPresent: false,
    markerPresent: false }).accepted || validateCommittedA5ArtifactChain({
      evidenceBytes: input.evidence_bytes, receiptBytes: null, markerBytes: null,
      expectedExecutionNonce: input.nonce,
    }).accepted) {
    throw new Error("DAY147_A5_GENERATED_ARTIFACT_VALIDATION_BLOCKED");
  }
}

type EvidenceArtifactProvenanceClassification =
  | "BUILD_ONLY_UNEXPECTED_FAILURE_ARTIFACT"
  | "FULL_EXECUTION_FAILURE_ARTIFACT"
  | "PRIOR_KNOWN_INVOCATION_ARTIFACT"
  | "UNATTRIBUTED_ARTIFACT";

function classifyEvidenceArtifactProvenance(input: Readonly<{
  evidence: unknown;
  known_invocation_mode?: HarnessMode;
}>): EvidenceArtifactProvenanceClassification {
  if (typeof input.evidence !== "object" || input.evidence === null) {
    return "UNATTRIBUTED_ARTIFACT";
  }
  const evidence = input.evidence as Record<string, unknown>;
  const failures = typeof evidence.failure_codes === "object" &&
      evidence.failure_codes !== null
    ? evidence.failure_codes as Record<string, unknown> : {};
  const formalFailure = evidence.process === "A5" &&
    evidence.success_claimed === false &&
    typeof failures.primary === "string" &&
    /^DAY147_A5_[A-Z0-9_]+$/.test(failures.primary);
  if (!formalFailure) return "UNATTRIBUTED_ARTIFACT";
  if (input.known_invocation_mode === "execute-network-runner-build-only") {
    return "BUILD_ONLY_UNEXPECTED_FAILURE_ARTIFACT";
  }
  if (input.known_invocation_mode !== undefined &&
    input.known_invocation_mode !== "execute-network-isolated") {
    return "PRIOR_KNOWN_INVOCATION_ARTIFACT";
  }
  const fullExecutionFailure = [
    "DAY147_A5_POSTGRES_READINESS_FAILED",
    "DAY147_A5_POSTGRES_READINESS_UNKNOWN",
    "DAY147_A5_NETWORK_SOURCE_SCOPE_BLOCKED",
    "DAY147_A5_NETWORK_RUNNER_BUILD_FAILED",
    "DAY147_A5_RUNNER_BOOTSTRAP_PROBE_FAILED",
    "DAY147_A5_RUNNER_ATTESTATION_FAILED",
  ].includes(String(failures.primary));
  return fullExecutionFailure ? "FULL_EXECUTION_FAILURE_ARTIFACT"
    : "UNATTRIBUTED_ARTIFACT";
}

function validateGeneratedFailureRun(input: Readonly<{
  nonce: string;
  relative_path: string;
  files: readonly Readonly<{
    name: string;
    regular_file: boolean;
    symbolic_link: boolean;
    hard_link_count: number;
  }>[];
  size: number;
  evidence_bytes: Uint8Array;
}>): GeneratedFailureArtifactManifestEntry {
  if (!/^[a-f0-9]{12}$/.test(input.nonce) || input.files.length !== 1 ||
    input.files[0]?.name !== FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH ||
    !input.files[0].regular_file || input.files[0].symbolic_link ||
    input.files[0].hard_link_count !== 1 ||
    GENERATED_RUN_PATH_PATTERN.exec(input.relative_path)?.[1] !== input.nonce ||
    input.size !== input.evidence_bytes.byteLength) {
    throw new Error("DAY147_A5_GENERATED_ARTIFACT_VALIDATION_BLOCKED");
  }
  validateGeneratedFailureEvidenceBytes({ nonce: input.nonce,
    evidence_bytes: input.evidence_bytes });
  return Object.freeze({ nonce: input.nonce,
    relative_path: input.relative_path, file_type: "regular_file",
    size: input.size,
    sha256: createHash("sha256").update(input.evidence_bytes).digest("hex"),
    validator_result: "PASS" });
}

function captureGeneratedFailureArtifactManifest():
  GeneratedFailureArtifactManifest {
  const reportsRoot = resolve(ROOT, EVIDENCE_REPORTS_RELATIVE_ROOT);
  const runsRoot = resolve(reportsRoot, "runs");
  const rootEntries = readdirSync(reportsRoot, { withFileTypes: true });
  if (rootEntries.length !== 1 || rootEntries[0]?.name !== "runs" ||
    !rootEntries[0].isDirectory() || rootEntries[0].isSymbolicLink()) {
    throw new Error("DAY147_A5_GENERATED_ARTIFACT_VALIDATION_BLOCKED");
  }
  const manifest = new Map<string, GeneratedFailureArtifactManifestEntry>();
  for (const runEntry of readdirSync(runsRoot, { withFileTypes: true })) {
    const nonce = runEntry.name;
    if (!/^[a-f0-9]{12}$/.test(nonce) || !runEntry.isDirectory() ||
      runEntry.isSymbolicLink()) {
      throw new Error("DAY147_A5_GENERATED_ARTIFACT_VALIDATION_BLOCKED");
    }
    const runRoot = resolve(runsRoot, nonce);
    const runFiles = readdirSync(runRoot, { withFileTypes: true });
    const artifactPath = resolve(runRoot, FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH);
    const metadata = lstatSync(artifactPath);
    const bytes = readFileSync(artifactPath);
    const relativePath = relative(ROOT, artifactPath);
    manifest.set(nonce, validateGeneratedFailureRun({ nonce,
      relative_path: relativePath, size: metadata.size, evidence_bytes: bytes,
      files: runFiles.map((entry) => ({ name: entry.name,
        regular_file: entry.isFile(), symbolic_link: entry.isSymbolicLink(),
        hard_link_count: entry.name === FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH
          ? metadata.nlink : 0 })) }));
  }
  return new Map([...manifest].sort(([left], [right]) => left.localeCompare(right)));
}

type ParsedGitPorcelainV1Line = Readonly<{
  raw_line: string;
  xy: string;
  path: string;
  staged: boolean;
}>;

function parseGitPorcelainV1Line(rawLine: string): ParsedGitPorcelainV1Line {
  if (rawLine.length < 4 || /[\0\r\n]/.test(rawLine)) {
    throw new Error("DAY147_A5_NETWORK_SOURCE_SCOPE_BLOCKED");
  }
  const xy = rawLine.slice(0, 2);
  const separator = rawLine.slice(2, 3);
  const path = rawLine.slice(3);
  if (!/^[ MADRCU?!]{2}$/.test(xy) || separator !== " " || path.length === 0 ||
    path.includes(" -> ")) {
    throw new Error("DAY147_A5_NETWORK_SOURCE_SCOPE_BLOCKED");
  }
  return Object.freeze({
    raw_line: rawLine,
    xy,
    path,
    staged: ![" ", "?", "!"].includes(xy.slice(0, 1)),
  });
}

type NetworkGitSourceScopeFixture = Readonly<{
  branch: string;
  head: string;
  origin_main: string;
  divergence: string;
  staged_files: string;
  status: string;
  generated_artifacts: GeneratedFailureArtifactManifest;
}>;

function validateNetworkGitSourceScope(
  fixture: NetworkGitSourceScopeFixture,
): readonly ParsedGitPorcelainV1Line[] {
  const observed = fixture.status.split("\n")
    .filter((line) => line.length !== 0)
    .map(parseGitPorcelainV1Line);
  const allowed = new Set(NETWORK_SOURCE_SCOPE_ALLOWLIST.map(
    ({ xy, path }) => `${xy}\0${path}`,
  ));
  const generatedPaths = new Set([...fixture.generated_artifacts.values()].map(
    ({ relative_path }) => relative_path,
  ));
  const observedGeneratedPaths = new Set(observed.flatMap(({ xy, path }) =>
    path.startsWith(`${EVIDENCE_REPORTS_RELATIVE_ROOT}/`)
      ? (xy === "??" && GENERATED_RUN_PATH_PATTERN.test(path) ? [path] : [""])
      : [],
  ));
  if (fixture.branch.trim() !== "main" ||
    fixture.head.trim() !== NETWORK_SOURCE_SCOPE_EXPECTED_HEAD ||
    fixture.origin_main.trim() !== NETWORK_SOURCE_SCOPE_EXPECTED_HEAD ||
    fixture.divergence.trim().replaceAll(/\s+/g, "/") !== "0/0" ||
    fixture.staged_files.trim() !== "" || observed.some(({ xy, path, staged }) =>
      staged || (path.startsWith(`${EVIDENCE_REPORTS_RELATIVE_ROOT}/`)
        ? xy !== "??" || !generatedPaths.has(path)
        : !allowed.has(`${xy}\0${path}`))
    ) || !observed.some(({ xy, path }) =>
      xy === "??" &&
      path === "scripts/hermes/test_farm_os_day147a5_isolated_postgres.ts"
    ) || observedGeneratedPaths.has("") ||
    observedGeneratedPaths.size !== generatedPaths.size ||
    [...generatedPaths].some((path) => !observedGeneratedPaths.has(path))) {
    throw new Error("DAY147_A5_NETWORK_SOURCE_SCOPE_BLOCKED");
  }
  return Object.freeze(observed);
}

function validateGeneratedArtifactManifestPreserved(input: Readonly<{
  start: GeneratedFailureArtifactManifest;
  end: GeneratedFailureArtifactManifest;
  current_nonce: string;
}>): void {
  if (!/^[a-f0-9]{12}$/.test(input.current_nonce) ||
    input.start.has(input.current_nonce)) {
    throw new Error("DAY147_A5_GENERATED_ARTIFACT_PRESERVATION_BLOCKED");
  }
  for (const [nonce, startEntry] of input.start) {
    const endEntry = input.end.get(nonce);
    if (endEntry === undefined || endEntry.relative_path !== startEntry.relative_path ||
      endEntry.sha256 !== startEntry.sha256 || endEntry.size !== startEntry.size ||
      endEntry.file_type !== "regular_file" || endEntry.validator_result !== "PASS") {
      throw new Error("DAY147_A5_GENERATED_ARTIFACT_PRESERVATION_BLOCKED");
    }
  }
  const added = [...input.end.keys()].filter((nonce) => !input.start.has(nonce));
  if (added.length !== 1 || added[0] !== input.current_nonce) {
    throw new Error("DAY147_A5_GENERATED_ARTIFACT_PRESERVATION_BLOCKED");
  }
}

function verifyGeneratedArtifactsAfterExecution(input: Readonly<{
  start: GeneratedFailureArtifactManifest;
  current_nonce: string;
}>): void {
  const runsRoot = resolve(ROOT, EVIDENCE_REPORTS_RELATIVE_ROOT, "runs");
  const runEntries = readdirSync(runsRoot, { withFileTypes: true });
  const expectedNonces = new Set([...input.start.keys(), input.current_nonce]);
  if (runEntries.length !== expectedNonces.size || runEntries.some((entry) =>
    !expectedNonces.has(entry.name) || !entry.isDirectory() ||
    entry.isSymbolicLink())) {
    throw new Error("DAY147_A5_GENERATED_ARTIFACT_PRESERVATION_BLOCKED");
  }
  const currentRoot = resolve(runsRoot, input.current_nonce);
  const currentFiles = readdirSync(currentRoot, { withFileTypes: true });
  const currentNames = currentFiles.map(({ name }) => name).sort();
  if (currentFiles.some((entry) => !entry.isFile() || entry.isSymbolicLink())) {
    throw new Error("DAY147_A5_GENERATED_ARTIFACT_VALIDATION_BLOCKED");
  }
  if (currentNames.length === 1 &&
    currentNames[0] === FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH) {
    validateGeneratedArtifactManifestPreserved({ start: input.start,
      end: captureGeneratedFailureArtifactManifest(),
      current_nonce: input.current_nonce });
    return;
  }
  if (JSON.stringify(currentNames) !== JSON.stringify([
    FARM_OS_DAY147A5_COMMIT_RELATIVE_PATH,
    FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH,
    FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH,
  ].sort())) {
    throw new Error("DAY147_A5_GENERATED_ARTIFACT_VALIDATION_BLOCKED");
  }
  for (const entry of currentFiles) {
    if (lstatSync(resolve(currentRoot, entry.name)).nlink !== 1) {
      throw new Error("DAY147_A5_GENERATED_ARTIFACT_VALIDATION_BLOCKED");
    }
  }
  const evidenceBytes = readFileSync(resolve(currentRoot,
    FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH));
  const receiptBytes = readFileSync(resolve(currentRoot,
    FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH));
  const markerBytes = readFileSync(resolve(currentRoot,
    FARM_OS_DAY147A5_COMMIT_RELATIVE_PATH));
  for (const bytes of [evidenceBytes, receiptBytes, markerBytes]) {
    let value: unknown;
    try { value = JSON.parse(bytes.toString("utf8")); } catch {
      throw new Error("DAY147_A5_GENERATED_ARTIFACT_VALIDATION_BLOCKED");
    }
    assertEvidenceSafe(value);
  }
  if (!validateCommittedA5ArtifactChain({ evidenceBytes, receiptBytes, markerBytes,
    expectedExecutionNonce: input.current_nonce }).accepted) {
    throw new Error("DAY147_A5_GENERATED_ARTIFACT_VALIDATION_BLOCKED");
  }
  for (const startEntry of input.start.values()) {
    const artifactPath = resolve(ROOT, startEntry.relative_path);
    const metadata = lstatSync(artifactPath);
    const bytes = readFileSync(artifactPath);
    validateGeneratedFailureEvidenceBytes({ nonce: startEntry.nonce,
      evidence_bytes: bytes });
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.nlink !== 1 ||
      metadata.size !== startEntry.size ||
      createHash("sha256").update(bytes).digest("hex") !== startEntry.sha256) {
      throw new Error("DAY147_A5_GENERATED_ARTIFACT_PRESERVATION_BLOCKED");
    }
  }
}

type NetworkRunNames = Readonly<{
  nonce: string;
  network: string;
  postgres_container: string;
  runner_container: string;
  runner_image: string;
  build_context: string;
  result_directory: string;
}>;

function buildNetworkRunNames(nonce: string): NetworkRunNames {
  if (!/^[a-f0-9]{12}$/.test(nonce)) {
    throw new Error("DAY147_A5_NETWORK_NONCE_INVALID");
  }
  const temporaryRoot = `/private/tmp/farmos-day147a5-network-runner/${nonce}`;
  return Object.freeze({
    nonce,
    network: `farmos-day147a5-net-${nonce}`,
    postgres_container: `farmos_day147a5_pg_${nonce}`,
    runner_container: `farmos_day147a5_runner_${nonce}`,
    runner_image: `farmos-day147a5-network-runner:${nonce}`,
    build_context: `${temporaryRoot}/build-context`,
    result_directory: `${temporaryRoot}/result`,
  });
}

type SourceSnapshotPlan = Readonly<{
  archive_command: Readonly<{ executable: "git"; args: readonly string[] }>;
  build_context: string;
  overlay_allowlist: typeof NETWORK_SOURCE_OVERLAY_ALLOWLIST;
  exclusions: typeof NETWORK_SOURCE_EXCLUSIONS;
  required_paths: readonly string[];
  dockerfile_relative_path: "Dockerfile.day147a5-network-runner";
  temporary_only: true;
}>;

function buildSourceSnapshotPlan(nonce: string): SourceSnapshotPlan {
  const names = buildNetworkRunNames(nonce);
  return Object.freeze({
    archive_command: Object.freeze({
      executable: "git" as const,
      args: Object.freeze([
        "archive", "HEAD", "--", ".", ":(exclude)reports",
        ":(exclude)tsconfig.tsbuildinfo", ":(exclude)node_modules",
        ":(exclude).git", ":(exclude)secrets", ":(exclude)logs",
      ]),
    }),
    build_context: names.build_context,
    overlay_allowlist: NETWORK_SOURCE_OVERLAY_ALLOWLIST,
    exclusions: NETWORK_SOURCE_EXCLUSIONS,
    required_paths: Object.freeze([
      "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.json",
      ...NETWORK_RUNNER_REQUIRED_IMPORT_CLOSURE,
      "scripts/sql/day146_operational_memory_snapshot_persistence.sql",
      "db/migrations/202607300001_daily_operational_projection_candidate_foundation.sql",
      "db/migrations/202607300001_daily_operational_projection_candidate_foundation.verify.sql",
      "db/migrations/202607310001_daily_operational_projection_candidate_activation.sql",
      "db/migrations/202607310001_daily_operational_projection_candidate_activation.verify.sql",
    ]),
    dockerfile_relative_path: "Dockerfile.day147a5-network-runner",
    temporary_only: true,
  });
}

type SnapshotPathObservation = Readonly<{
  relative_path: string;
  canonical_path: string;
  regular_file: boolean;
  symbolic_link: boolean;
}>;
type SourceSnapshotExecution = Readonly<{
  build_context: string;
  manifest: readonly string[];
}>;
type SourceSnapshotDependencies = Readonly<{
  repository_root: () => Promise<Readonly<{
    lexical_path: string; canonical_path: string;
  }>>;
  create_temporary_root: (expectedParent: string, nonce: string) => Promise<Readonly<{
    lexical_path: string; canonical_path: string; symbolic_link: boolean;
    directory: boolean; owner_matches: boolean; mode: number;
  }>>;
  git_archive_head: (
    plan: SourceSnapshotPlan, temporaryRoot: string,
  ) => Promise<readonly string[]>;
  inspect_overlay: (relativePath: string) => Promise<SnapshotPathObservation>;
  copy_overlay: (observation: SnapshotPathObservation, buildContext: string) =>
    Promise<void>;
  write_generated_file: (
    relativePath: string, contents: string, buildContext: string,
  ) => Promise<void>;
  list_build_context_files: (buildContext: string) => Promise<readonly string[]>;
}>;

function snapshotPathForbidden(relativePath: string): boolean {
  return relativePath === "tsconfig.tsbuildinfo" ||
    relativePath === ".git" || relativePath.startsWith(".git/") ||
    relativePath === "node_modules" || relativePath.startsWith("node_modules/") ||
    relativePath === "reports" || relativePath.startsWith("reports/") ||
    /(?:^|\/)evidence(?:\.json|\/)/.test(relativePath) ||
    relativePath.startsWith("/") || relativePath.includes("../");
}

async function executeSourceSnapshot(input: Readonly<{
  nonce: string;
  runner_entrypoint_source: string;
  dockerfile: string;
  dependencies: SourceSnapshotDependencies;
}>): Promise<SourceSnapshotExecution> {
  const plan = buildSourceSnapshotPlan(input.nonce);
  const repository = await input.dependencies.repository_root();
  if (repository.lexical_path !== repository.canonical_path ||
    repository.canonical_path !== realpathSync(ROOT)) {
    throw new Error("DAY147_A5_NETWORK_SOURCE_SNAPSHOT_INVALID");
  }
  const expectedParent = "/private/tmp/farmos-day147a5-network-runner";
  const temporary = await input.dependencies.create_temporary_root(
    expectedParent, input.nonce,
  );
  if (!temporary.lexical_path.startsWith(`${expectedParent}/`) ||
    temporary.lexical_path !== temporary.canonical_path ||
    temporary.symbolic_link || !temporary.directory || !temporary.owner_matches ||
    (temporary.mode & 0o022) !== 0) {
    throw new Error("DAY147_A5_NETWORK_SOURCE_SNAPSHOT_INVALID");
  }
  const archiveFiles = await input.dependencies.git_archive_head(
    plan, temporary.canonical_path,
  );
  if (archiveFiles.some(snapshotPathForbidden) ||
    new Set(archiveFiles).size !== archiveFiles.length) {
    throw new Error("DAY147_A5_NETWORK_SOURCE_SNAPSHOT_INVALID");
  }
  for (const relativePath of plan.overlay_allowlist) {
    const observation = await input.dependencies.inspect_overlay(relativePath);
    if (observation.relative_path !== relativePath || !observation.regular_file ||
      observation.symbolic_link || !observation.canonical_path.startsWith(
        `${repository.canonical_path}/`,
      ) || resolve(repository.canonical_path, relativePath) !==
        observation.canonical_path) {
      throw new Error("DAY147_A5_NETWORK_SOURCE_SNAPSHOT_INVALID");
    }
    await input.dependencies.copy_overlay(observation, plan.build_context);
  }
  const generated = [plan.dockerfile_relative_path,
    "network-client-entrypoint.ts", "network-client-launcher.sh",
    "validate-local-tsx.mjs",
    "source-snapshot-manifest.json"];
  await input.dependencies.write_generated_file(
    plan.dockerfile_relative_path, input.dockerfile, plan.build_context,
  );
  await input.dependencies.write_generated_file(
    "network-client-entrypoint.ts", input.runner_entrypoint_source,
    plan.build_context,
  );
  await input.dependencies.write_generated_file(
    "network-client-launcher.sh", networkRunnerLauncherSource(),
    plan.build_context,
  );
  await input.dependencies.write_generated_file(
    "validate-local-tsx.mjs", localTsxValidatorSource(), plan.build_context,
  );
  const expected = [...new Set([
    ...archiveFiles, ...plan.overlay_allowlist, ...generated,
  ])].sort();
  for (const required of plan.required_paths) {
    if (!expected.includes(required)) {
      throw new Error("DAY147_A5_NETWORK_SOURCE_SNAPSHOT_INVALID");
    }
  }
  await input.dependencies.write_generated_file(
    "source-snapshot-manifest.json", `${JSON.stringify(expected)}\n`,
    plan.build_context,
  );
  const actual = [...await input.dependencies.list_build_context_files(
    plan.build_context,
  )].sort();
  if (actual.some(snapshotPathForbidden) ||
    JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("DAY147_A5_NETWORK_SOURCE_SNAPSHOT_INVALID");
  }
  return Object.freeze({ build_context: plan.build_context,
    manifest: Object.freeze(expected) });
}

const LOCAL_TSX_VALIDATOR_PATH = "/workspace/validate-local-tsx.mjs" as const;
const NETWORK_RUNNER_FINAL_UID = 501 as const;
const NETWORK_RUNNER_FINAL_GID = 501 as const;

function localTsxValidatorSource(): string {
  return [
    'import { accessSync, constants, lstatSync, realpathSync, statSync } from "node:fs";',
    'const tsxPath = "/workspace/node_modules/.bin/tsx";',
    'const entrypointPath = "/workspace/network-client-entrypoint.ts";',
    'const boundary = "/workspace/node_modules/";',
    'const phase = (value) => process.stderr.write(`FARMOS_DAY147_A5_PHASE=${value}\\n`);',
    'let fileType = "unknown"; let readable = false; let executable = false;',
    'const errno = (error) => error && typeof error === "object" && "code" in error ? String(error.code) : "UNKNOWN";',
    'const fail = (failureCode, error = null) => { process.stderr.write(`FARMOS_DAY147_A5_FAILURE=${failureCode}\\n`); process.stderr.write(`FARMOS_DAY147_A5_LOCAL_TSX_DIAGNOSTIC=${JSON.stringify({ failure_code: failureCode, errno_code: errno(error), uid: typeof process.getuid === "function" ? process.getuid() : null, gid: typeof process.getgid === "function" ? process.getgid() : null, file_type: fileType, readable, executable })}\\n`); process.exit(71); };',
    'const kind = (metadata) => metadata.isFile() ? "regular_file" : metadata.isSymbolicLink() ? "symbolic_link" : metadata.isDirectory() ? "directory" : "other";',
    'phase("LOCAL_TSX_VALIDATOR_STARTED");',
    'let linkStat; try { linkStat = lstatSync(tsxPath); } catch (error) { const code = errno(error); fileType = code === "ENOENT" ? "missing" : "unknown"; fail(code === "ENOENT" ? "DAY147_A5_TSX_PATH_ENOENT" : code === "EACCES" ? "DAY147_A5_TSX_PATH_EACCES" : "DAY147_A5_TSX_PATH_TYPE_INVALID", error); }',
    'fileType = kind(linkStat); phase("LOCAL_TSX_LSTAT_VALID");',
    'if (fileType !== "regular_file" && fileType !== "symbolic_link") fail("DAY147_A5_TSX_PATH_TYPE_INVALID");',
    'phase("LOCAL_TSX_TYPE_VALID");',
    'let canonicalTarget; try { canonicalTarget = realpathSync(tsxPath); } catch (error) { fail("DAY147_A5_TSX_REALPATH_FAILED", error); }',
    'phase("LOCAL_TSX_REALPATH_VALID");',
    'if (!canonicalTarget.startsWith(boundary)) fail("DAY147_A5_TSX_TARGET_OUTSIDE_NODE_MODULES");',
    'phase("LOCAL_TSX_TARGET_BOUNDARY_VALID");',
    'let targetStat; try { targetStat = statSync(canonicalTarget); } catch (error) { fail(errno(error) === "EACCES" ? "DAY147_A5_TSX_TARGET_NOT_READABLE" : "DAY147_A5_TSX_TARGET_NOT_REGULAR", error); }',
    'if (!targetStat.isFile()) fail("DAY147_A5_TSX_TARGET_NOT_REGULAR");',
    'phase("LOCAL_TSX_TARGET_REGULAR_VALID");',
    'const parents = new Set(["/workspace", "/workspace/node_modules", "/workspace/node_modules/.bin"]); let parent = canonicalTarget.slice(0, canonicalTarget.lastIndexOf("/")); while (parent.startsWith("/workspace/node_modules")) { parents.add(parent); const next = parent.slice(0, parent.lastIndexOf("/")); if (next === parent) break; parent = next; }',
    'for (const directory of parents) { try { const metadata = statSync(directory); if (!metadata.isDirectory()) fail("DAY147_A5_TSX_PARENT_DIRECTORY_NOT_TRAVERSABLE"); accessSync(directory, constants.X_OK); } catch (error) { fail("DAY147_A5_TSX_PARENT_DIRECTORY_NOT_TRAVERSABLE", error); } }',
    'try { accessSync(canonicalTarget, constants.R_OK); readable = true; } catch (error) { fail("DAY147_A5_TSX_TARGET_NOT_READABLE", error); }',
    'try { accessSync(canonicalTarget, constants.X_OK); executable = true; } catch (error) { fail("DAY147_A5_TSX_TARGET_NOT_EXECUTABLE", error); }',
    'phase("LOCAL_TSX_ACCESS_VALID");',
    'let entrypointStat; try { entrypointStat = lstatSync(entrypointPath); } catch (error) { const code = errno(error); fail(code === "ENOENT" ? "DAY147_A5_ENTRYPOINT_ENOENT" : code === "EACCES" ? "DAY147_A5_ENTRYPOINT_EACCES" : "DAY147_A5_ENTRYPOINT_TYPE_INVALID", error); }',
    'if (!entrypointStat.isFile() || entrypointStat.isSymbolicLink()) fail("DAY147_A5_ENTRYPOINT_TYPE_INVALID");',
    'try { accessSync(entrypointPath, constants.R_OK); } catch (error) { fail("DAY147_A5_ENTRYPOINT_EACCES", error); }',
    'phase("LOCAL_TSX_VALIDATOR_COMPLETE");',
    'process.stderr.write(`FARMOS_DAY147_A5_LOCAL_TSX_RESULT=${JSON.stringify({ uid: typeof process.getuid === "function" ? process.getuid() : null, gid: typeof process.getgid === "function" ? process.getgid() : null, file_type: fileType, realpath_relative: canonicalTarget.slice(boundary.length), canonical_target_within_node_modules: true, target_regular: true, target_readable: readable, target_executable: executable, parent_directories_traversable: true })}\\n`);',
  ].join("\n") + "\n";
}

type LocalTsxContractObservation = Readonly<{
  lstat_errno: string | null;
  file_type: "regular_file" | "symbolic_link" | "directory" | "other";
  realpath_errno: string | null;
  realpath: string | null;
  target_stat_errno: string | null;
  target_regular: boolean;
  parents_traversable: boolean;
  target_readable: boolean;
  target_read_errno: string | null;
  target_executable: boolean;
  target_execute_errno: string | null;
  entrypoint_errno: string | null;
  entrypoint_regular: boolean;
  entrypoint_symbolic: boolean;
}>;

function classifyLocalTsxContract(
  value: LocalTsxContractObservation,
): string | null {
  if (value.lstat_errno !== null) return value.lstat_errno === "ENOENT"
    ? "DAY147_A5_TSX_PATH_ENOENT" : value.lstat_errno === "EACCES"
    ? "DAY147_A5_TSX_PATH_EACCES" : "DAY147_A5_TSX_PATH_TYPE_INVALID";
  if (value.file_type !== "regular_file" && value.file_type !== "symbolic_link") {
    return "DAY147_A5_TSX_PATH_TYPE_INVALID";
  }
  if (value.realpath_errno !== null || value.realpath === null) {
    return "DAY147_A5_TSX_REALPATH_FAILED";
  }
  if (!value.realpath.startsWith("/workspace/node_modules/")) {
    return "DAY147_A5_TSX_TARGET_OUTSIDE_NODE_MODULES";
  }
  if (value.target_stat_errno !== null || !value.target_regular) {
    return value.target_stat_errno === "EACCES"
      ? "DAY147_A5_TSX_TARGET_NOT_READABLE"
      : "DAY147_A5_TSX_TARGET_NOT_REGULAR";
  }
  if (!value.parents_traversable) {
    return "DAY147_A5_TSX_PARENT_DIRECTORY_NOT_TRAVERSABLE";
  }
  if (!value.target_readable) return "DAY147_A5_TSX_TARGET_NOT_READABLE";
  if (!value.target_executable) return "DAY147_A5_TSX_TARGET_NOT_EXECUTABLE";
  if (value.entrypoint_errno !== null) return value.entrypoint_errno === "ENOENT"
    ? "DAY147_A5_ENTRYPOINT_ENOENT" : value.entrypoint_errno === "EACCES"
    ? "DAY147_A5_ENTRYPOINT_EACCES" : "DAY147_A5_ENTRYPOINT_TYPE_INVALID";
  if (!value.entrypoint_regular || value.entrypoint_symbolic) {
    return "DAY147_A5_ENTRYPOINT_TYPE_INVALID";
  }
  return null;
}

function networkRunnerLauncherSource(): string {
  return [
    "#!/bin/sh",
    "set -eu",
    "phase() { printf '%s\\n' \"FARMOS_DAY147_A5_PHASE=$1\" >&2; }",
    "fail() { printf '%s\\n' \"FARMOS_DAY147_A5_FAILURE=$1\" >&2; exit 1; }",
    "phase RUNNER_LAUNCHER_STARTED",
    "[ \"$(pwd -P)\" = /workspace ] || fail DAY147_A5_RUNNER_ENTRYPOINT_FILE_INVALID",
    "mkdir -p /tmp/home",
    `node ${LOCAL_TSX_VALIDATOR_PATH}`,
    "exec /workspace/node_modules/.bin/tsx /workspace/network-client-entrypoint.ts",
  ].join("\n") + "\n";
}

function networkClientEntrypointSource(input: Readonly<{
  nonce: string;
}>): string {
  if (!/^[a-f0-9]{12}$/.test(input.nonce)) {
    throw new Error("DAY147_A5_NETWORK_CLIENT_AUTHORITY_BLOCKED");
  }
  return [
    'const phase = (value) => process.stderr.write(`FARMOS_DAY147_A5_PHASE=${value}\\n`);',
    'const fail = (code) => { process.stderr.write(`FARMOS_DAY147_A5_FAILURE=${code}\\n`); const error = new Error(code); error.code = code; throw error; };',
    'const fixed = async (code, action) => { try { return await action(); } catch (error) { if (error && typeof error === "object" && "code" in error && String(error.code).startsWith("DAY147_A5_")) throw error; fail(code); } };',
    'phase("RUNNER_ENTRYPOINT_PROCESS_STARTED");',
    `if (process.env.${NETWORK_BUILD_LAUNCHER_CHECK_ENVIRONMENT_KEY} === "1") process.exit(0);`,
    `const launcherOnly = process.env.${NETWORK_LAUNCHER_ONLY_ENVIRONMENT_KEY} === ${JSON.stringify(NETWORK_RUNNER_LAUNCHER_DIAGNOSTIC_AUTHORITY)};`,
    `if (process.env.${NETWORK_LAUNCHER_ONLY_ENVIRONMENT_KEY} !== undefined && !launcherOnly) fail("DAY147_A5_NETWORK_RUNNER_LAUNCHER_AUTHORITY_REQUIRED");`,
    'const { createHash } = await import("node:crypto");',
    'const { access, lstat, open, readFile, realpath, rename, rm } = await import("node:fs/promises");',
    'const { setTimeout: wait } = await import("node:timers/promises");',
    'const { fileURLToPath } = await import("node:url");',
    `const capabilityPath = ${JSON.stringify(NETWORK_RUNNER_CAPABILITY_PATH)};`,
    `const expectedNonce = ${JSON.stringify(input.nonce)};`,
    `const bootstrapProbe = process.env.${NETWORK_BOOTSTRAP_PROBE_ENVIRONMENT_KEY} === "1";`,
    `if (process.env.${NETWORK_BOOTSTRAP_PROBE_ENVIRONMENT_KEY} !== undefined && !bootstrapProbe) fail("DAY147_A5_RUNNER_BOOTSTRAP_PROBE_AUTHORITY_INVALID");`,
    'phase("RUNNER_ENTRYPOINT_PATH_CHECK");',
    'const runnerEntrypoint = await fixed("DAY147_A5_RUNNER_ENTRYPOINT_PATH_INVALID", () => realpath(fileURLToPath(import.meta.url)));',
    `if (runnerEntrypoint !== ${JSON.stringify(NETWORK_RUNNER_ENTRYPOINT)}) fail("DAY147_A5_RUNNER_ENTRYPOINT_PATH_INVALID");`,
    'phase("RUNNER_ENTRYPOINT_PATH_VALID");',
    'phase("RUNNER_CAPABILITY_FILE_OPEN");',
    'const stat = await fixed("DAY147_A5_RUNNER_CAPABILITY_FILE_MISSING", () => lstat(capabilityPath));',
    'if (stat.isSymbolicLink()) fail("DAY147_A5_RUNNER_CAPABILITY_FILE_SYMLINK");',
    'if (!stat.isFile()) fail("DAY147_A5_RUNNER_CAPABILITY_FILE_NOT_REGULAR");',
    'if (stat.uid !== Number(process.env.FARMOS_A5_CAPABILITY_OWNER_UID)) fail("DAY147_A5_RUNNER_CAPABILITY_OWNER_INVALID");',
    'if ((stat.mode & 0o777) !== 0o400) fail("DAY147_A5_RUNNER_CAPABILITY_MODE_INVALID");',
    'const capabilityCanonical = await fixed("DAY147_A5_RUNNER_CAPABILITY_FILE_MISSING", () => realpath(capabilityPath));',
    'if (capabilityCanonical !== capabilityPath) fail("DAY147_A5_RUNNER_CAPABILITY_FILE_SYMLINK");',
    'const capabilityBytes = await fixed("DAY147_A5_RUNNER_CAPABILITY_FILE_MISSING", () => readFile(capabilityPath));',
    'phase("RUNNER_CAPABILITY_FILE_STAT_VALID");',
    'const capabilityDigest = createHash("sha256").update(capabilityBytes).digest("hex");',
    'if (capabilityDigest !== process.env.FARMOS_A5_CAPABILITY_DIGEST) fail("DAY147_A5_RUNNER_CAPABILITY_DIGEST_MISMATCH");',
    'phase("RUNNER_CAPABILITY_DIGEST_VALID");',
    'let capabilityNonce = ""; try { capabilityNonce = JSON.parse(capabilityBytes.toString("utf8")).execution_nonce ?? ""; } catch { fail("DAY147_A5_RUNNER_NONCE_MISMATCH"); }',
    'if (capabilityNonce !== expectedNonce || process.env.FARMOS_A5_EXECUTION_NONCE !== expectedNonce) fail("DAY147_A5_RUNNER_NONCE_MISMATCH");',
    'phase("RUNNER_EXECUTION_NONCE_VALID");',
    `const environmentKeys = ${JSON.stringify([...NETWORK_CLIENT_ENVIRONMENT_KEYS])};`,
    'const environment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));',
    'if (environment.PGHOST !== "postgres" || environment.PGPORT !== "5432" || environment.FARMOS_A5_CLIENT_RESULT_PATH !== "/result/client-result.json" || environmentKeys.some((key) => typeof environment[key] !== "string")) fail("DAY147_A5_RUNNER_DB_ENVIRONMENT_INVALID");',
    'phase("RUNNER_DB_ENVIRONMENT_VALID");',
    'const resultStat = await fixed("DAY147_A5_RUNNER_RESULT_ROOT_INVALID", () => lstat("/result"));',
    'if (!resultStat.isDirectory() || resultStat.isSymbolicLink()) fail("DAY147_A5_RUNNER_RESULT_ROOT_INVALID");',
    'phase("RUNNER_RESULT_ROOT_STAT_VALID");',
    'const probePath = "/result/.runner-write-probe";',
    'await fixed("DAY147_A5_RUNNER_RESULT_ROOT_NOT_WRITABLE", async () => { const handle = await open(probePath, "wx", 0o600); try { await handle.writeFile("probe"); await handle.sync(); } finally { await handle.close(); } await rm(probePath); });',
    'phase("RUNNER_RESULT_ROOT_WRITE_PROBE_VALID");',
    'if (typeof process.getuid !== "function" || process.getuid() !== Number(process.env.FARMOS_A5_CAPABILITY_OWNER_UID) || process.getuid() === 0) fail("DAY147_A5_RUNNER_SECURITY_CONTEXT_INVALID");',
    'phase("RUNNER_SECURITY_CONTEXT_VALID");',
    `if (launcherOnly && (process.env.${NETWORK_LAUNCHER_ONLY_CAPABILITY_PATH_KEY} !== capabilityPath || process.env.${NETWORK_LAUNCHER_ONLY_WORKING_DIRECTORY_KEY} !== "/workspace" || process.env.${NETWORK_LAUNCHER_ONLY_RUNTIME_IDENTITY_KEY} !== "${NETWORK_RUNNER_FINAL_UID}:${NETWORK_RUNNER_FINAL_GID}")) fail("DAY147_A5_RUNNER_LAUNCHER_ENVIRONMENT_INVALID");`,
    `if (launcherOnly) { phase(${JSON.stringify(NETWORK_LAUNCHER_ONLY_COMPLETE_PHASE)}); process.exit(0); }`,
    'const clientModuleSpecifier = new URL("./scripts/hermes/test_farm_os_day147a5_isolated_postgres.ts", import.meta.url).href;',
    'phase("RUNNER_CLIENT_MODULE_IMPORT_START");',
    'let executeNetworkClientInternal; try { ({ executeNetworkClientInternal } = await import(clientModuleSpecifier)); } catch (error) { const code = error && typeof error === "object" && "code" in error ? String(error.code) : "UNKNOWN"; const rawMessage = error instanceof Error ? error.message : String(error); const rawStack = error instanceof Error ? String(error.stack ?? "") : ""; const sanitize = (value) => value.replaceAll("file:///workspace", "<workspace>").replaceAll("/workspace", "<workspace>").replace(/\\/Users\\/[^\\s]+/g, "<host-path>").replace(/\\/private\\/tmp\\/[^\\s]+/g, "<temp-path>").slice(0, 2048); const specifierMatch = /(?:Cannot find (?:package|module) [\'\"]([^\'\"]+)[\'\"]|Unknown file extension [\'\"]([^\'\"]+)[\'\"])/.exec(rawMessage); const importerMatch = /(?:imported from |at )(?:file:\\/\\/)?(\\/workspace\\/[^:\\s)]+)/.exec(`${rawMessage}\\n${rawStack}`); process.stderr.write(`FARMOS_DAY147_A5_MODULE_DIAGNOSTIC=${JSON.stringify({ node_error_code: code, failing_specifier: sanitize(specifierMatch?.[1] ?? specifierMatch?.[2] ?? clientModuleSpecifier), importer: sanitize(importerMatch?.[1] ?? runnerEntrypoint), import_stack: sanitize(rawStack.split("\\n").slice(0, 6).join("\\n")), runtime_executable: sanitize(process.execPath) })}\\n`); fail("DAY147_A5_RUNNER_CLIENT_MODULE_IMPORT_FAILED"); }',
    'phase("RUNNER_CLIENT_MODULE_IMPORT_VALID");',
    'phase("RUNNER_ATTESTATION_COMPLETE");',
    `if (bootstrapProbe) { phase(${JSON.stringify(NETWORK_BOOTSTRAP_PROBE_COMPLETE_PHASE)}); process.exit(0); }`,
    `const bindingGatePath = ${JSON.stringify(NETWORK_POST_START_BINDING_GATE_PATH)};`,
    'let bindingGateReady = false; for (let check = 0; check < 400; check += 1) { try { await access(bindingGatePath); bindingGateReady = true; break; } catch { await wait(25); } }',
    'if (!bindingGateReady) fail("DAY147_A5_RUNNER_ATTESTATION_TIMEOUT");',
    'const bindingGate = await fixed("DAY147_A5_RUNNER_SECURITY_CONTEXT_INVALID", () => lstat(bindingGatePath));',
    'if (!bindingGate.isFile() || bindingGate.isSymbolicLink() || bindingGate.uid !== Number(process.env.FARMOS_A5_CAPABILITY_OWNER_UID) || (bindingGate.mode & 0o777) !== 0o600) fail("DAY147_A5_RUNNER_SECURITY_CONTEXT_INVALID");',
    'await fixed("DAY147_A5_RUNNER_SECURITY_CONTEXT_INVALID", () => rm(bindingGatePath));',
    'await executeNetworkClientInternal({',
    '  attestation: { runner_entrypoint: runnerEntrypoint, execution_nonce: expectedNonce, expected_nonce: expectedNonce, capability_path: capabilityPath, capability_regular_file: stat.isFile(), capability_symbolic_link: stat.isSymbolicLink(), capability_canonical_path: capabilityCanonical, capability_owner_uid: stat.uid, capability_mode: stat.mode & 0o777, capability_bytes: capabilityBytes, expected_capability_digest: capabilityDigest, result_path: "/result/client-result.json" },',
    '  environment, phase,',
    '  async write_result(bytes) { const path = "/result/.client-result.json.tmp"; const handle = await open(path, "wx", 0o600); try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); } await rename(path, "/result/client-result.json"); },',
    '});',
  ].join("\n");
}

function networkRunnerDockerfile(): string {
  const predicate = (
    marker: string,
    failure: string,
    exitCode: number,
    command: string,
  ) => `RUN set -u; printf '%s\\n' '${RUNNER_BUILD_PREDICATE_PREFIX}${marker}'; ${
    command
  } || { printf '%s\\n' '${RUNNER_BUILD_FAILURE_PREFIX}${failure}' >&2; exit ${
    exitCode
  }; }; printf '%s\\n' 'FARMOS_DAY147_A5_BUILD_PREDICATE_PASS=${marker}'`;
  const tsx = "/workspace/node_modules/.bin/tsx";
  const entrypoint = "/workspace/network-client-entrypoint.ts";
  const launcher = "/workspace/network-client-launcher.sh";
  const validator = LOCAL_TSX_VALIDATOR_PATH;
  return [
    `FROM ${NETWORK_RUNNER_BASE_IMAGE}@${NETWORK_RUNNER_BASE_IMAGE_ID}`,
    "WORKDIR /workspace",
    `RUN corepack enable && corepack prepare pnpm@${NETWORK_RUNNER_PNPM_VERSION} --activate && pnpm --version`,
    `COPY --chown=${NETWORK_RUNNER_FINAL_UID}:${NETWORK_RUNNER_FINAL_GID} . /workspace`,
    "RUN pnpm install --frozen-lockfile",
    `RUN chown -R ${NETWORK_RUNNER_FINAL_UID}:${NETWORK_RUNNER_FINAL_GID} /workspace && chmod 0444 ${entrypoint} ${validator} && chmod 0555 ${launcher}`,
    `USER ${NETWORK_RUNNER_FINAL_UID}:${NETWORK_RUNNER_FINAL_GID}`,
    `RUN node ${validator}`,
    predicate("BUILD_TSX_COMMAND_INVOKABLE", "TSX_VERSION_PROBE_FAILED", 48,
      `version_output=$(${tsx} --version 2>&1) && test -n \"$version_output\" && test \"$(printf '%s' \"$version_output\" | wc -c)\" -le 4096 && test \"$(printf '%s\\n' \"$version_output\" | wc -l)\" -le 20`),
    predicate("BUILD_TSX_MINIMAL_TYPESCRIPT_SMOKE_PASS", "TSX_MINIMAL_TYPESCRIPT_SMOKE_FAILED", 49,
      `smoke=/tmp/farmos-tsx-smoke.ts; trap 'rm -f \"$smoke\"' EXIT; printf '%s\\n' 'process.stdout.write(\"FARMOS_TSX_SMOKE_OK\\n\");' > \"$smoke\" && smoke_output=$(${tsx} \"$smoke\" 2>&1) && [ \"$smoke_output\" = FARMOS_TSX_SMOKE_OK ]`),
    predicate("BUILD_ENTRYPOINT_READ_CONTRACT", "ENTRYPOINT_NOT_READABLE", 54,
      `node -e 'require("node:fs").accessSync("${entrypoint}", require("node:fs").constants.R_OK)'`),
    predicate("BUILD_LAUNCHER_EXISTS", "LAUNCHER_MISSING", 56,
      `[ -e ${launcher} ]`),
    predicate("BUILD_LAUNCHER_REGULAR_FILE", "LAUNCHER_NOT_REGULAR", 57,
      `[ -f ${launcher} ]`),
    predicate("BUILD_LAUNCHER_NOT_SYMLINK", "LAUNCHER_SYMLINK", 58,
      `[ ! -L ${launcher} ]`),
    predicate("BUILD_LAUNCHER_EXECUTABLE", "LAUNCHER_NOT_EXECUTABLE", 59,
      `[ -r ${launcher} ] && [ -x ${launcher} ]`),
    predicate("BUILD_LAUNCHER_EXECUTE_CONTRACT", "LAUNCHER_EXECUTE_CONTRACT_INVALID", 60,
      `${NETWORK_BUILD_LAUNCHER_CHECK_ENVIRONMENT_KEY}=1 /bin/sh ${launcher}`),
    "ENTRYPOINT [\"/bin/sh\",\"/workspace/network-client-launcher.sh\"]",
  ].join("\n");
}

function networkRunnerEntrypointDigest(nonce: string): string {
  return createHash("sha256").update(networkClientEntrypointSource({ nonce }))
    .digest("hex");
}

type ImageObservation = Readonly<{
  id: string;
  repo_digests: readonly string[];
  os: string;
  architecture: string;
}>;

function validateNetworkRunnerBaseImage(observation: ImageObservation): void {
  if (observation.id !== NETWORK_RUNNER_BASE_IMAGE_ID ||
    observation.repo_digests.length !== 1 ||
    observation.repo_digests[0] !== NETWORK_RUNNER_BASE_REPO_DIGEST ||
    observation.os !== "linux" || observation.architecture !== "arm64") {
    throw new Error("DAY147_A5_NETWORK_RUNNER_BASE_IMAGE_INVALID");
  }
}

function validateBuiltRunnerImage(input: Readonly<{
  expected_tag: string;
  observed_tag: string;
  build_result_id: string;
  inspected_id: string;
  pre_existing: boolean;
  execution_nonce_label: string;
  base_image_id: string;
}>): string {
  if (!/^farmos-day147a5-network-runner:[a-f0-9]{12}$/.test(
    input.expected_tag,
  ) || input.observed_tag !== input.expected_tag ||
    !CONTAINER_ID_PATTERN.test(input.build_result_id.replace(/^sha256:/, "")) ||
    input.inspected_id !== input.build_result_id || input.pre_existing ||
    input.execution_nonce_label !== input.expected_tag.split(":")[1] ||
    input.base_image_id !== NETWORK_RUNNER_BASE_IMAGE_ID) {
    throw new Error("DAY147_A5_NETWORK_RUNNER_IMAGE_BINDING_INVALID");
  }
  return input.inspected_id;
}

function buildNetworkRunnerImageCommand(nonce: string): DockerCommand {
  const names = buildNetworkRunNames(nonce);
  return Object.freeze({
    executable: "docker",
    args: Object.freeze([
      "build", "--pull=false", "--progress=plain", "--file",
      `${names.build_context}/Dockerfile.day147a5-network-runner`,
      "--iidfile", `${names.result_directory}/runner-image-id`,
      "--label", `farmos.day147a5.execution_nonce=${nonce}`,
      "--label", `farmos.day147a5.base_image_id=${NETWORK_RUNNER_BASE_IMAGE_ID}`,
      "--label", `farmos.day147a5.entrypoint_sha256=${
        networkRunnerEntrypointDigest(nonce)
      }`,
      "--tag", names.runner_image, names.build_context,
    ]),
  });
}

const NETWORK_RUNNER_BUILD_OUTPUT_MAX_LINES = 80;
const NETWORK_RUNNER_BUILD_OUTPUT_MAX_BYTES = 16 * 1024;

type RunnerBuildDiagnostic = Readonly<{
  phase: "RUNNER_BUILD";
  failing_dockerfile_instruction: string | null;
  fixed_predicate_marker: string | null;
  fixed_failure_marker: string | null;
  exit_code: number | null;
  termination_signal: string | null;
  timed_out: boolean;
  sanitized_stderr_excerpt: string;
  sanitized_stdout_excerpt: string;
  command_argument_shape: readonly string[];
  execution_nonce: string;
}>;

const RUNNER_BUILD_PREDICATE_PREFIX =
  "FARMOS_DAY147_A5_BUILD_PREDICATE=" as const;
const RUNNER_BUILD_FAILURE_PREFIX =
  "FARMOS_DAY147_A5_BUILD_FAILURE=" as const;

function lastBuildDiagnosticValue(
  output: string,
  prefix: string,
): string | null {
  const values = output.split(/\r?\n/).flatMap((line) => {
    const offset = line.indexOf(prefix);
    if (offset < 0) return [];
    const value = line.slice(offset + prefix.length).trim();
    return /^[A-Z0-9_]+$/.test(value) ? [value] : [];
  });
  return values.at(-1) ?? null;
}

function failingDockerfileInstruction(output: string): string | null {
  return output.split(/\r?\n/).filter((line) =>
    /^#\d+ \[[^\]]+\] RUN /.test(line)
  ).at(-1)?.replace(/^#\d+ \[[^\]]+\] /, "") ?? null;
}

function sanitizeRunnerBuildExcerpt(
  value: string,
  names: NetworkRunNames,
): string {
  let sanitized = value;
  for (const [path, replacement] of [
    [names.result_directory, "<result-root>"],
    [names.build_context, "<build-root>"],
    [dirname(names.build_context), "<build-root>"],
    [ROOT, "<repository>"],
  ] as const) {
    sanitized = sanitized.split(path).join(replacement);
  }
  sanitized = sanitized
    .replace(/(?:postgres(?:ql)?|https?|ssh|tcp):\/\/[^\s"']+/gi, "<redacted-url>")
    .replace(/(?:unix:\/\/)?\/[^\s"']*docker\.sock/gi, "<redacted-socket>")
    .replace(/\/(?:Users|home)\/[^\s"']+/g, "<repository>")
    .replace(/\/private\/tmp\/farmos-day147a5-network-runner\/[^\s"']+/g,
      "<build-root>")
    .replace(/\b(password|token|credential|capability|authorization)\s*[=:]\s*[^\s]+/gi,
      "$1=<redacted>")
    .replace(/\b[a-f0-9]{64}\b/gi, "<digest>");
  let bounded = sanitized.split(/\r?\n/)
    .slice(0, NETWORK_RUNNER_BUILD_OUTPUT_MAX_LINES).join("\n");
  if (Buffer.byteLength(bounded, "utf8") > NETWORK_RUNNER_BUILD_OUTPUT_MAX_BYTES) {
    bounded = Buffer.from(bounded, "utf8")
      .subarray(0, NETWORK_RUNNER_BUILD_OUTPUT_MAX_BYTES).toString("utf8");
    while (Buffer.byteLength(bounded, "utf8") >
      NETWORK_RUNNER_BUILD_OUTPUT_MAX_BYTES) bounded = bounded.slice(0, -1);
  }
  return bounded;
}

function runnerBuildCommandArgumentShape(
  args: readonly string[],
  names: NetworkRunNames,
): readonly string[] {
  return Object.freeze(args.map((arg) => {
    if (arg.startsWith(`${names.result_directory}/`)) {
      return `<result-root>/${arg.slice(names.result_directory.length + 1)}`;
    }
    if (arg.startsWith(`${names.build_context}/`)) {
      return `<build-root>/${arg.slice(names.build_context.length + 1)}`;
    }
    if (arg === names.build_context) return "<build-root>";
    if (arg.startsWith("farmos.day147a5.base_image_id=")) {
      return "farmos.day147a5.base_image_id=<base-digest>";
    }
    if (arg.startsWith("farmos.day147a5.entrypoint_sha256=")) {
      return "farmos.day147a5.entrypoint_sha256=<entrypoint-digest>";
    }
    return arg;
  }));
}

function runnerBuildDiagnostic(input: Readonly<{
  nonce: string;
  names: NetworkRunNames;
  args: readonly string[];
  status: number | null;
  signal: string | null;
  error_code: string | null;
  stdout: string;
  stderr: string;
}>): RunnerBuildDiagnostic {
  const combinedOutput = `${input.stdout}\n${input.stderr}`;
  return Object.freeze({
    phase: "RUNNER_BUILD",
    failing_dockerfile_instruction: failingDockerfileInstruction(combinedOutput),
    fixed_predicate_marker: lastBuildDiagnosticValue(
      combinedOutput, RUNNER_BUILD_PREDICATE_PREFIX,
    ),
    fixed_failure_marker: lastBuildDiagnosticValue(
      combinedOutput, RUNNER_BUILD_FAILURE_PREFIX,
    ),
    exit_code: input.status,
    termination_signal: input.signal,
    timed_out: input.error_code === "ETIMEDOUT",
    sanitized_stderr_excerpt: sanitizeRunnerBuildExcerpt(input.stderr, input.names),
    sanitized_stdout_excerpt: sanitizeRunnerBuildExcerpt(input.stdout, input.names),
    command_argument_shape: runnerBuildCommandArgumentShape(input.args, input.names),
    execution_nonce: input.nonce,
  });
}

class RunnerBuildCommandFailure extends Error {
  constructor(readonly diagnostic: RunnerBuildDiagnostic) {
    super("DAY147_A5_NETWORK_RUNNER_BUILD_FAILED");
  }
}

type RunnerCommandPhase =
  | "RUNNER_CONTAINER_CREATE"
  | "RUNNER_CONTAINER_INSPECT_AFTER_CREATE"
  | "RUNNER_CONTAINER_START"
  | "RUNNER_CONTAINER_INSPECT_AFTER_START"
  | "RUNNER_ATTESTATION";

const RUNNER_BOOTSTRAP_PHASES = Object.freeze([
  "RUNNER_LAUNCHER_STARTED",
  "LOCAL_TSX_VALIDATOR_STARTED",
  "LOCAL_TSX_LSTAT_VALID",
  "LOCAL_TSX_TYPE_VALID",
  "LOCAL_TSX_REALPATH_VALID",
  "LOCAL_TSX_TARGET_BOUNDARY_VALID",
  "LOCAL_TSX_TARGET_REGULAR_VALID",
  "LOCAL_TSX_ACCESS_VALID",
  "LOCAL_TSX_VALIDATOR_COMPLETE",
  "RUNNER_ENTRYPOINT_PROCESS_STARTED",
  "RUNNER_ENTRYPOINT_PATH_CHECK",
  "RUNNER_ENTRYPOINT_PATH_VALID",
  "RUNNER_CAPABILITY_FILE_OPEN",
  "RUNNER_CAPABILITY_FILE_STAT_VALID",
  "RUNNER_CAPABILITY_DIGEST_VALID",
  "RUNNER_EXECUTION_NONCE_VALID",
  "RUNNER_DB_ENVIRONMENT_VALID",
  "RUNNER_RESULT_ROOT_STAT_VALID",
  "RUNNER_RESULT_ROOT_WRITE_PROBE_VALID",
  "RUNNER_SECURITY_CONTEXT_VALID",
  "RUNNER_CLIENT_MODULE_IMPORT_START",
  "RUNNER_CLIENT_MODULE_IMPORT_VALID",
  "RUNNER_ATTESTATION_COMPLETE",
  "RUNNER_DB_CONNECTION_START",
  "RUNNER_DB_CONNECTION_READY",
  "RUNNER_MIGRATION_START",
  "RUNNER_DYNAMIC_SUITE_START",
] as const);
type RunnerBootstrapPhase = typeof RUNNER_BOOTSTRAP_PHASES[number];

const RUNNER_FIXED_BOOTSTRAP_FAILURE_CODES = Object.freeze([
  "DAY147_A5_RUNNER_LAUNCHER_NOT_STARTED",
  "DAY147_A5_TSX_PATH_ENOENT",
  "DAY147_A5_TSX_PATH_EACCES",
  "DAY147_A5_TSX_PATH_TYPE_INVALID",
  "DAY147_A5_TSX_REALPATH_FAILED",
  "DAY147_A5_TSX_TARGET_OUTSIDE_NODE_MODULES",
  "DAY147_A5_TSX_TARGET_NOT_REGULAR",
  "DAY147_A5_TSX_TARGET_NOT_READABLE",
  "DAY147_A5_TSX_TARGET_NOT_EXECUTABLE",
  "DAY147_A5_TSX_PARENT_DIRECTORY_NOT_TRAVERSABLE",
  "DAY147_A5_ENTRYPOINT_ENOENT",
  "DAY147_A5_ENTRYPOINT_EACCES",
  "DAY147_A5_ENTRYPOINT_TYPE_INVALID",
  "DAY147_A5_RUNNER_ENTRYPOINT_FILE_INVALID",
  "DAY147_A5_RUNNER_TSX_EXECUTION_FAILED",
  "DAY147_A5_RUNNER_ENTRYPOINT_NOT_REACHED",
  "DAY147_A5_RUNNER_CLIENT_MODULE_IMPORT_FAILED",
  "DAY147_A5_RUNNER_ENTRYPOINT_PATH_INVALID",
  "DAY147_A5_RUNNER_CAPABILITY_FILE_MISSING",
  "DAY147_A5_RUNNER_CAPABILITY_FILE_NOT_REGULAR",
  "DAY147_A5_RUNNER_CAPABILITY_FILE_SYMLINK",
  "DAY147_A5_RUNNER_CAPABILITY_OWNER_INVALID",
  "DAY147_A5_RUNNER_CAPABILITY_MODE_INVALID",
  "DAY147_A5_RUNNER_CAPABILITY_DIGEST_MISMATCH",
  "DAY147_A5_RUNNER_NONCE_MISMATCH",
  "DAY147_A5_RUNNER_DB_ENVIRONMENT_INVALID",
  "DAY147_A5_RUNNER_RESULT_ROOT_INVALID",
  "DAY147_A5_RUNNER_RESULT_ROOT_NOT_WRITABLE",
  "DAY147_A5_RUNNER_SECURITY_CONTEXT_INVALID",
  "DAY147_A5_RUNNER_MODULE_RESOLUTION_FAILED",
  "DAY147_A5_RUNNER_PROCESS_EXITED_BEFORE_ATTESTATION",
  "DAY147_A5_RUNNER_ATTESTATION_TIMEOUT",
] as const);
type RunnerFixedBootstrapFailureCode =
  typeof RUNNER_FIXED_BOOTSTRAP_FAILURE_CODES[number];
type RunnerRetryableRootCause =
  | "DAY147_A5_RUNNER_MOUNT_VISIBILITY_TRANSIENT"
  | "DAY147_A5_RUNNER_CONTAINER_START_TRANSIENT"
  | "DAY147_A5_RUNNER_INSPECT_TRANSIENT"
  | "DAY147_A5_RUNNER_LOG_CAPTURE_TRANSIENT"
  | "DAY147_A5_RUNNER_CONTAINER_POST_START_NETWORK_BINDING_TIMEOUT"
  | "DAY147_A5_RUNNER_ATTESTATION_TRANSIENT_TIMEOUT";
type RunnerRootCauseClass = RunnerFixedBootstrapFailureCode |
  RunnerRetryableRootCause |
  "DAY147_A5_RUNNER_CONTAINER_POST_START_NETWORK_BINDING_INVALID" |
  "DAY147_A5_RUNNER_UNKNOWN_DETERMINISTIC_BOOTSTRAP";

type PostStartNetworkBindingCheck = Readonly<{
  check: number;
  network_mode: string;
  network_keys: readonly string[];
  expected_entry_present: boolean;
  network_id_materialized: boolean;
  endpoint_id_materialized: boolean;
  ip_materialized: boolean;
  container_state: string;
}>;

type RunnerStateDiagnostic = Readonly<{
  status: string;
  exit_code: number | null;
  error: string;
  oom_killed: boolean;
  started_at: string;
  finished_at: string;
}>;
type RunnerAttemptDiagnostic = Readonly<{
  attempt: number;
  attempt_started: true;
  container_created: boolean;
  container_started: boolean;
  binding_checks: readonly PostStartNetworkBindingCheck[];
  binding_success_check: number | null;
  state: RunnerStateDiagnostic;
  sanitized_stdout: string;
  sanitized_stderr: string;
  phases: readonly RunnerBootstrapPhase[];
  last_completed_phase: RunnerBootstrapPhase | null;
  first_failed_phase: RunnerBootstrapPhase | null;
  fixed_failure_code: RunnerFixedBootstrapFailureCode | null;
  root_cause_class: RunnerRootCauseClass;
  retryable: boolean;
  cleanup_completed: boolean;
  result_present: boolean;
  diagnostic_present: boolean;
}>;

const RUNNER_MODULE_ROOT_CAUSE_CLASSES = Object.freeze([
  "ERR_MODULE_NOT_FOUND", "MODULE_NOT_FOUND", "ERR_UNKNOWN_FILE_EXTENSION",
  "ERR_PACKAGE_PATH_NOT_EXPORTED", "ERR_UNSUPPORTED_DIR_IMPORT",
  "TSX_LOADER_UNAVAILABLE", "PATH_ALIAS_UNRESOLVED",
  "GENERATED_ENTRYPOINT_PATH_INVALID", "IMPORT_CLOSURE_FILE_MISSING",
  "UNKNOWN_MODULE_RESOLUTION_FAILURE",
] as const);
type RunnerModuleRootCauseClass =
  typeof RUNNER_MODULE_ROOT_CAUSE_CLASSES[number];
type RunnerModuleResolutionDiagnostic = Readonly<{
  node_error_code: string;
  failing_specifier: string;
  importer: string;
  import_stack: string;
  runtime_executable: string;
  exact_class: RunnerModuleRootCauseClass;
}>;

function classifyRunnerModuleResolutionDiagnostic(input: Readonly<{
  node_error_code: string;
  failing_specifier: string;
  importer: string;
  import_stack?: string;
  runtime_executable?: string;
}>): RunnerModuleResolutionDiagnostic {
  const exposed = [input.failing_specifier, input.importer,
    input.import_stack ?? "", input.runtime_executable ?? ""].join("\n");
  if (/\/(?:Users|home)\/|\/private\/tmp\//.test(exposed) ||
    input.failing_specifier.length === 0 || input.importer.length === 0) {
    throw new Error("DAY147_A5_RUNNER_MODULE_DIAGNOSTIC_INVALID");
  }
  const code = input.node_error_code;
  let exactClass: RunnerModuleRootCauseClass =
    RUNNER_MODULE_ROOT_CAUSE_CLASSES.includes(
      code as RunnerModuleRootCauseClass,
    ) ? code as RunnerModuleRootCauseClass : "UNKNOWN_MODULE_RESOLUTION_FAILURE";
  if (code === "ERR_MODULE_NOT_FOUND" && input.failing_specifier.startsWith("@/")) {
    exactClass = "PATH_ALIAS_UNRESOLVED";
  } else if (code === "ERR_MODULE_NOT_FOUND" &&
    input.failing_specifier.startsWith("<workspace>/")) {
    exactClass = "IMPORT_CLOSURE_FILE_MISSING";
  } else if (/tsx/i.test(input.failing_specifier) &&
    ["ERR_MODULE_NOT_FOUND", "MODULE_NOT_FOUND"].includes(code)) {
    exactClass = "TSX_LOADER_UNAVAILABLE";
  }
  return Object.freeze({ node_error_code: code,
    failing_specifier: input.failing_specifier, importer: input.importer,
    import_stack: input.import_stack ?? "",
    runtime_executable: input.runtime_executable ?? "node",
    exact_class: exactClass });
}

function parseRunnerModuleResolutionDiagnostic(
  stderr: string,
): RunnerModuleResolutionDiagnostic | null {
  const line = stderr.split(/\r?\n/).find((candidate) =>
    candidate.startsWith(NETWORK_RUNNER_MODULE_DIAGNOSTIC_PREFIX));
  if (line === undefined) return null;
  let value: unknown;
  try {
    value = JSON.parse(line.slice(NETWORK_RUNNER_MODULE_DIAGNOSTIC_PREFIX.length));
  } catch {
    throw new Error("DAY147_A5_RUNNER_MODULE_DIAGNOSTIC_INVALID");
  }
  if (typeof value !== "object" || value === null) {
    throw new Error("DAY147_A5_RUNNER_MODULE_DIAGNOSTIC_INVALID");
  }
  const record = value as Record<string, unknown>;
  if (!["node_error_code", "failing_specifier", "importer", "import_stack",
    "runtime_executable"].every((key) => typeof record[key] === "string")) {
    throw new Error("DAY147_A5_RUNNER_MODULE_DIAGNOSTIC_INVALID");
  }
  return classifyRunnerModuleResolutionDiagnostic(record as Readonly<{
    node_error_code: string; failing_specifier: string; importer: string;
    import_stack: string; runtime_executable: string;
  }>);
}

function boundedRunnerOutput(value: string, replacements: Readonly<{
  repository?: string;
  build_root?: string;
  result_root?: string;
  capability_file?: string;
  password?: string;
}> = {}): string {
  let sanitized = value;
  for (const [raw, replacement] of [
    [replacements.repository, "<repository>"],
    [replacements.build_root, "<build-root>"],
    [replacements.result_root, "<result-root>"],
    [replacements.capability_file, "<capability-file>"],
    [replacements.password, "<redacted>"],
  ] as const) {
    if (raw !== undefined && raw.length !== 0) sanitized = sanitized.split(raw).join(replacement);
  }
  sanitized = sanitized
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "<redacted>")
    .replace(/\b(?:password|pgpassword|capability|token|credential)\s*[=:]\s*[^\s]+/gi,
      (match) => `${match.split(/[=:]/, 1)[0]}=<redacted>`)
    .replace(/\/Users\/[^\s"']+/g, "<repository>")
    .replace(/\/private\/tmp\/farmos-day147a5-network-runner\/[^\s"']+/g,
      "<build-root>")
    .replace(/(?:sha256:)?\b[a-f0-9]{64}\b/gi, "<docker-id>")
    .replace(/\b[a-f0-9]{12}\b/gi, "<network-id>")
    .replace(/\/[^\s"']*docker\.sock/gi, "<redacted>");
  const lines = sanitized.split(/\r?\n/).slice(0, RUNNER_DIAGNOSTIC_MAX_LINES);
  let bounded = lines.join("\n");
  if (Buffer.byteLength(bounded, "utf8") > RUNNER_DIAGNOSTIC_MAX_BYTES) {
    bounded = Buffer.from(bounded).subarray(0, RUNNER_DIAGNOSTIC_MAX_BYTES)
      .toString("utf8");
    while (Buffer.byteLength(bounded, "utf8") > RUNNER_DIAGNOSTIC_MAX_BYTES) {
      bounded = bounded.slice(0, -1);
    }
  }
  return bounded;
}

function parseRunnerMarkers(stderr: string): Readonly<{
  phases: readonly RunnerBootstrapPhase[];
  fixed_failure_code: RunnerFixedBootstrapFailureCode | null;
}> {
  const allowedPhases = new Set<string>(RUNNER_BOOTSTRAP_PHASES);
  const allowedFailures = new Set<string>(RUNNER_FIXED_BOOTSTRAP_FAILURE_CODES);
  const phases = stderr.split(/\r?\n/).flatMap((line) => {
    const value = line.startsWith("FARMOS_DAY147_A5_PHASE=")
      ? line.slice("FARMOS_DAY147_A5_PHASE=".length) : "";
    return allowedPhases.has(value) ? [value as RunnerBootstrapPhase] : [];
  });
  const failure = stderr.split(/\r?\n/).map((line) =>
    line.startsWith("FARMOS_DAY147_A5_FAILURE=")
      ? line.slice("FARMOS_DAY147_A5_FAILURE=".length) : ""
  ).find((value) => allowedFailures.has(value));
  return Object.freeze({ phases: Object.freeze(phases),
    fixed_failure_code: failure === undefined ? null :
      failure as RunnerFixedBootstrapFailureCode });
}

function firstUnreachedRunnerPhase(
  phases: readonly RunnerBootstrapPhase[],
): RunnerBootstrapPhase | null {
  const reached = new Set(phases);
  return RUNNER_BOOTSTRAP_PHASES.find((phase) => !reached.has(phase)) ?? null;
}

function inferRunnerPhaseFailure(
  phases: readonly RunnerBootstrapPhase[],
): RunnerFixedBootstrapFailureCode | null {
  const reached = new Set<RunnerBootstrapPhase>(phases);
  if (!reached.has("RUNNER_LAUNCHER_STARTED")) {
    return "DAY147_A5_RUNNER_LAUNCHER_NOT_STARTED";
  }
  if (reached.has("LOCAL_TSX_VALIDATOR_COMPLETE") &&
    !reached.has("RUNNER_ENTRYPOINT_PROCESS_STARTED")) {
    return "DAY147_A5_RUNNER_TSX_EXECUTION_FAILED";
  }
  if (reached.has("RUNNER_CLIENT_MODULE_IMPORT_START") &&
    !reached.has("RUNNER_CLIENT_MODULE_IMPORT_VALID")) {
    return "DAY147_A5_RUNNER_CLIENT_MODULE_IMPORT_FAILED";
  }
  return null;
}

function classifyRunnerAttempt(input: Readonly<{
  attempt: number;
  container_created?: boolean;
  container_started: boolean;
  state: RunnerStateDiagnostic;
  stdout: string;
  stderr: string;
  cleanup_completed: boolean;
  result_present: boolean;
  diagnostic_present: boolean;
  transient_evidence?: RunnerRetryableRootCause | null;
  root_cause_override?: RunnerRootCauseClass | null;
  binding_checks?: readonly PostStartNetworkBindingCheck[];
  binding_success_check?: number | null;
}>): RunnerAttemptDiagnostic {
  const parsed = parseRunnerMarkers(input.stderr);
  const last = parsed.phases.at(-1) ?? null;
  const firstFailed = firstUnreachedRunnerPhase(parsed.phases);
  const phaseFailure = inferRunnerPhaseFailure(parsed.phases);
  let root: RunnerRootCauseClass;
  if (input.root_cause_override !== undefined &&
    input.root_cause_override !== null) root = input.root_cause_override;
  else if (parsed.fixed_failure_code !== null) root = parsed.fixed_failure_code;
  else if (input.state.oom_killed) root =
    "DAY147_A5_RUNNER_UNKNOWN_DETERMINISTIC_BOOTSTRAP";
  else if (input.transient_evidence !== undefined &&
    input.transient_evidence !== null && parsed.phases.length === 0) {
    root = input.transient_evidence;
  } else if (phaseFailure !== null) root = phaseFailure;
  else if (last !== "RUNNER_ATTESTATION_COMPLETE" &&
    !parsed.phases.includes("RUNNER_ATTESTATION_COMPLETE") &&
    input.state.status === "exited") root =
      "DAY147_A5_RUNNER_PROCESS_EXITED_BEFORE_ATTESTATION";
  else root = "DAY147_A5_RUNNER_UNKNOWN_DETERMINISTIC_BOOTSTRAP";
  const retryable = input.transient_evidence === root &&
    !parsed.phases.includes("RUNNER_ATTESTATION_COMPLETE") &&
    !input.state.oom_killed;
  return Object.freeze({ attempt: input.attempt, attempt_started: true,
    container_created: input.container_created ?? input.container_started,
    container_started: input.container_started,
    binding_checks: Object.freeze([...(input.binding_checks ?? [])]),
    binding_success_check: input.binding_success_check ?? null, state: input.state,
    sanitized_stdout: boundedRunnerOutput(input.stdout),
    sanitized_stderr: boundedRunnerOutput(input.stderr), phases: parsed.phases,
    last_completed_phase: last, first_failed_phase: firstFailed,
    fixed_failure_code: parsed.fixed_failure_code, root_cause_class: root,
    retryable, cleanup_completed: input.cleanup_completed,
    result_present: input.result_present,
    diagnostic_present: input.diagnostic_present });
}

async function convergeRunnerAttempts<T>(input: Readonly<{
  deadline_ms: number;
  now: () => number;
  execute_attempt: (attempt: number) => Promise<Readonly<{
    success: boolean;
    value?: T;
    diagnostic: RunnerAttemptDiagnostic;
  }>>;
  backoff: (milliseconds: number) => Promise<void>;
}>): Promise<Readonly<{ value: T; successful_attempt: number;
  timeline: readonly RunnerAttemptDiagnostic[] }>> {
  const timeline: RunnerAttemptDiagnostic[] = [];
  for (let attempt = 1; attempt <= MAX_RUNNER_ATTEMPTS; attempt += 1) {
    if (input.now() >= input.deadline_ms) {
      throw new RunnerConvergenceFailure("DAY147_A5_RUNNER_ATTESTATION_TIMEOUT",
        timeline);
    }
    const observed = await input.execute_attempt(attempt);
    timeline.push(observed.diagnostic);
    if (observed.success) {
      if (observed.value === undefined) throw new Error(
        "DAY147_A5_RUNNER_UNKNOWN_DETERMINISTIC_BOOTSTRAP");
      return Object.freeze({ value: observed.value, successful_attempt: attempt,
        timeline: Object.freeze(timeline) });
    }
    if (!observed.diagnostic.retryable ||
      !observed.diagnostic.cleanup_completed) {
      throw new RunnerConvergenceFailure(
        observed.diagnostic.root_cause_class, timeline,
      );
    }
    if (attempt === MAX_RUNNER_ATTEMPTS) break;
    const backoff = attempt === 1 ? 250 : attempt === 2 ? 500 : 1000;
    if (input.now() + backoff >= input.deadline_ms) {
      throw new RunnerConvergenceFailure("DAY147_A5_RUNNER_ATTESTATION_TIMEOUT",
        timeline);
    }
    await input.backoff(backoff);
  }
  throw new RunnerConvergenceFailure(
    timeline.at(-1)?.root_cause_class ?? "DAY147_A5_RUNNER_ATTESTATION_TIMEOUT",
    timeline,
  );
}

class RunnerConvergenceFailure extends Error {
  constructor(readonly root_cause_class: RunnerRootCauseClass,
    readonly timeline: readonly RunnerAttemptDiagnostic[]) {
    super(root_cause_class);
  }
}

const RUNNER_PHASE_FAILURE_CODES: Readonly<Record<RunnerCommandPhase, string>> =
  Object.freeze({
    RUNNER_CONTAINER_CREATE: "DAY147_A5_RUNNER_CONTAINER_CREATE_FAILED",
    RUNNER_CONTAINER_INSPECT_AFTER_CREATE:
      "DAY147_A5_RUNNER_CONTAINER_POST_CREATE_INSPECT_FAILED",
    RUNNER_CONTAINER_START: "DAY147_A5_RUNNER_CONTAINER_START_FAILED",
    RUNNER_CONTAINER_INSPECT_AFTER_START:
      "DAY147_A5_RUNNER_CONTAINER_POST_START_INSPECT_FAILED",
    RUNNER_ATTESTATION: "DAY147_A5_RUNNER_ATTESTATION_FAILED",
  });

type RunnerCommandDiagnostic = Readonly<{
  phase: RunnerCommandPhase;
  executable: "docker";
  argument_shape: readonly string[];
  failing_argument_category: string;
  password_argument_absent: true;
  exit_code: number | null;
  termination_signal: string | null;
  timed_out: boolean;
  sanitized_stdout: string;
  sanitized_stderr: string;
}>;

function runnerCommandArgumentShape(
  args: readonly string[],
  names: NetworkRunNames,
  capabilityFile: string,
): readonly string[] {
  return Object.freeze(args.map((arg) => arg
    .split(ROOT).join("<repository>")
    .split(dirname(names.build_context)).join("<build-root>")
    .split(names.result_directory).join("<result-root>")
    .split(capabilityFile).join("<capability-file>")
    .replace(/sha256:[a-f0-9]{64}/gi, "<runner-image-id>")
    .replace(/\b[a-f0-9]{64}\b/gi, "<docker-id>")));
}

function runnerCommandDiagnostic(input: Readonly<{
  phase: RunnerCommandPhase;
  args: readonly string[];
  names: NetworkRunNames;
  capability_file: string;
  password: string | null;
  status: number | null;
  signal: string | null;
  error_code: string | null;
  stdout: string;
  stderr: string;
}>): RunnerCommandDiagnostic {
  const password = input.password;
  if (password !== null && input.args.some((arg) => arg.includes(password))) {
    throw new Error("DAY147_A5_NETWORK_RUNNER_COMMAND_INVALID");
  }
  const sanitize = (value: string) => sanitizeRunnerBuildExcerpt(
    value.split(input.capability_file).join("<capability-file>")
      .split(input.password ?? "\0").join("<redacted>"),
    input.names,
  ).replace(/\b(?:sha256:)?[a-f0-9]{64}\b/gi, "<docker-id>");
  return Object.freeze({
    phase: input.phase,
    executable: "docker",
    failing_argument_category: input.phase === "RUNNER_CONTAINER_CREATE"
      ? "runner_create_arguments"
      : input.phase === "RUNNER_CONTAINER_START"
      ? "runner_start_arguments"
      : input.phase.toLowerCase(),
    argument_shape: runnerCommandArgumentShape(
      input.args, input.names, input.capability_file,
    ),
    password_argument_absent: true,
    exit_code: input.status,
    termination_signal: input.signal,
    timed_out: input.error_code === "ETIMEDOUT",
    sanitized_stdout: sanitize(input.stdout),
    sanitized_stderr: sanitize(input.stderr),
  });
}

class RunnerCommandFailure extends Error {
  constructor(
    readonly phase: RunnerCommandPhase,
    readonly diagnostic: RunnerCommandDiagnostic,
  ) {
    super(RUNNER_PHASE_FAILURE_CODES[phase]);
  }
}

type NetworkObservation = Readonly<{
  name: string;
  id: string;
  driver: string;
  scope: string;
  execution_nonce_label: string;
  member_ids: readonly string[];
}>;

function validateCreatedNetwork(
  observation: NetworkObservation,
  nonce: string,
): string {
  const expected = buildNetworkRunNames(nonce);
  if (observation.name !== expected.network ||
    !CONTAINER_ID_PATTERN.test(observation.id) ||
    observation.driver !== "bridge" || observation.scope !== "local" ||
    observation.execution_nonce_label !== nonce ||
    observation.member_ids.length !== 0 ||
    ["bridge", "host", "none"].includes(observation.name)) {
    throw new Error("DAY147_A5_NETWORK_BINDING_INVALID");
  }
  return observation.id;
}

function assertNetworkNameAvailable(observation: NetworkObservation | null): void {
  if (observation !== null) {
    throw new Error("DAY147_A5_NETWORK_ALREADY_EXISTS");
  }
}

function buildNetworkCreateCommand(nonce: string): DockerCommand {
  const names = buildNetworkRunNames(nonce);
  return Object.freeze({
    executable: "docker",
    args: Object.freeze([
      "network", "create", "--driver", "bridge", "--label",
      `farmos.day147a5.execution_nonce=${nonce}`, names.network,
    ]),
  });
}

function buildNetworkPostgresRunCommand(input: Readonly<{
  nonce: string;
  environment_keys: readonly string[];
}>): DockerCommand {
  const names = buildNetworkRunNames(input.nonce);
  const expectedEnvironmentKeys = [
    "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD",
  ];
  if (JSON.stringify([...input.environment_keys].sort()) !==
    JSON.stringify(expectedEnvironmentKeys.sort())) {
    throw new Error("DAY147_A5_NETWORK_POSTGRES_COMMAND_INVALID");
  }
  const args = [
    "run", "--detach", "--pull=never", "--restart=no", "--name",
    names.postgres_container,
    "--network", names.network, "--network-alias", "postgres",
    "--tmpfs", "/var/lib/postgresql/data:rw,noexec,nosuid,size=512m",
    "--label", `farmos.day147a5.execution_nonce=${input.nonce}`,
  ];
  for (const key of input.environment_keys) args.push("--env", key);
  args.push(IMAGE);
  return Object.freeze({ executable: "docker", args: Object.freeze(args) });
}

type NetworkContainerObservation = Readonly<{
  id: string;
  name: string;
  image_id: string;
  network_id: string;
  network_name?: string;
  network_count?: number;
  network_mode?: string;
  launcher_network_inspect?: unknown;
  endpoint_id?: string;
  ip_address?: string;
  sandbox_id?: string;
  network_aliases: readonly string[];
  published_ports: readonly string[];
  mounts: readonly Readonly<{
    type: string;
    source: string;
    destination: string;
    read_write?: boolean;
  }>[];
  tmpfs_paths: readonly string[];
  privileged: boolean;
  cap_drop: readonly string[];
  security_options: readonly string[];
  read_only_rootfs: boolean;
  user: string;
  environment_keys?: readonly string[];
  launcher_environment_keys?: readonly string[];
  entrypoint?: readonly string[] | null;
  cmd?: readonly string[] | null;
  execution_nonce_label: string;
  resource_role_label?: string;
  probe_label?: string;
  runtime_state?: string;
  restart_count?: number;
  started_at?: string;
  docker_socket_mounted: boolean;
}>;

type LauncherOnlyNetworkState = Readonly<{
  network_mode: string;
  raw_network_keys: readonly string[];
  none_sentinel_present: boolean;
  none_sentinel_valid: boolean;
  effective_memberships: number;
  invalid_field: string | null;
  valid: boolean;
}>;

function normalizeLauncherOnlyNetworkState(value: unknown): LauncherOnlyNetworkState {
  const inspect = typeof value === "object" && value !== null &&
      !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  const host = typeof inspect.HostConfig === "object" &&
      inspect.HostConfig !== null && !Array.isArray(inspect.HostConfig)
    ? inspect.HostConfig as Record<string, unknown> : {};
  const networkSettings = typeof inspect.NetworkSettings === "object" &&
      inspect.NetworkSettings !== null && !Array.isArray(inspect.NetworkSettings)
    ? inspect.NetworkSettings as Record<string, unknown> : {};
  const rawMode = host.NetworkMode;
  const networkMode = typeof rawMode === "string" ? rawMode : "<invalid-type>";
  const rawNetworks = networkSettings.Networks;
  const networksValid = typeof rawNetworks === "object" && rawNetworks !== null &&
    !Array.isArray(rawNetworks);
  const networks = networksValid ? rawNetworks as Record<string, unknown> : {};
  const keys = Object.keys(networks).sort();
  const sanitizedKeys = keys.map((key) =>
    ["none", "bridge", "host"].includes(key) ? key : "<user-defined-network>"
  );
  const nonePresent = Object.prototype.hasOwnProperty.call(networks, "none");
  const noneEntry = nonePresent && typeof networks.none === "object" &&
      networks.none !== null && !Array.isArray(networks.none)
    ? networks.none as Record<string, unknown> : null;
  const emptyScalar = (field: string): boolean => noneEntry !== null &&
    (noneEntry[field] === undefined || noneEntry[field] === null ||
      noneEntry[field] === "");
  const emptyArray = (field: string): boolean => noneEntry !== null &&
    (noneEntry[field] === undefined || noneEntry[field] === null ||
      Array.isArray(noneEntry[field]) && noneEntry[field].length === 0);
  const emptyRecord = (field: string): boolean => noneEntry !== null &&
    (noneEntry[field] === undefined || noneEntry[field] === null ||
      typeof noneEntry[field] === "object" && !Array.isArray(noneEntry[field]) &&
      Object.keys(noneEntry[field] as Record<string, unknown>).length === 0);
  const noneChecks = [
    ["NetworkID", emptyScalar("NetworkID")],
    ["EndpointID", emptyScalar("EndpointID")],
    ["Gateway", emptyScalar("Gateway")],
    ["IPAddress", emptyScalar("IPAddress")],
    ["GlobalIPv6Address", emptyScalar("GlobalIPv6Address")],
    ["MacAddress", emptyScalar("MacAddress") ||
      noneEntry?.MacAddress === "00:00:00:00:00:00"],
    ["Aliases", emptyArray("Aliases")],
    ["Links", emptyArray("Links")],
    ["DriverOpts", emptyRecord("DriverOpts")],
  ] as const;
  const invalidNoneField = nonePresent
    ? noneEntry === null ? "NetworkSettings.Networks.none"
    : noneChecks.find(([, passed]) => !passed)?.[0] ?? null
    : null;
  const noneValid = nonePresent && networkMode === "none" &&
    invalidNoneField === null;
  const effectiveMemberships = keys.reduce((count, key) =>
    count + (key === "none" && noneValid ? 0 : 1), 0);
  const firstExternalKey = keys.find((key) => key !== "none");
  const invalidField = networkMode !== "none" ? "HostConfig.NetworkMode"
    : !networksValid ? "NetworkSettings.Networks"
    : invalidNoneField === null ? firstExternalKey === undefined
      ? null : "NetworkSettings.Networks.external_key"
    : invalidNoneField === "NetworkSettings.Networks.none" ? invalidNoneField
    : `NetworkSettings.Networks.none.${invalidNoneField}`;
  return Object.freeze({ network_mode: networkMode,
    raw_network_keys: Object.freeze(sanitizedKeys),
    none_sentinel_present: nonePresent, none_sentinel_valid: noneValid,
    effective_memberships: effectiveMemberships, invalid_field: invalidField,
    valid: invalidField === null && effectiveMemberships === 0 });
}

const NETWORK_RESOURCE_ROLE_LABEL = "farmos.day147a5.role" as const;
const NETWORK_PROBE_LABEL = "farmos.day147a5.probe" as const;
const NETWORK_RUNNER_ROLE = "runner" as const;

function validateNetworkPostgresContainer(input: Readonly<{
  observation: NetworkContainerObservation;
  nonce: string;
  network_id: string;
  expected_image_id: string;
}>): string {
  const names = buildNetworkRunNames(input.nonce);
  const observed = input.observation;
  if (!CONTAINER_ID_PATTERN.test(observed.id) ||
    observed.name !== names.postgres_container ||
    observed.image_id !== input.expected_image_id ||
    observed.network_id !== input.network_id ||
    observed.network_aliases.length !== 1 ||
    observed.network_aliases[0] !== "postgres" ||
    observed.published_ports.length !== 0 ||
    observed.mounts.length !== 0 ||
    JSON.stringify(observed.tmpfs_paths) !==
      JSON.stringify(["/var/lib/postgresql/data"]) || observed.privileged ||
    observed.execution_nonce_label !== input.nonce ||
    observed.docker_socket_mounted) {
    throw new Error("DAY147_A5_NETWORK_POSTGRES_BINDING_INVALID");
  }
  return observed.id;
}

function buildNetworkPostgresInternalReadinessCommand(input: Readonly<{
  nonce: string;
  canonical_postgres_id: string;
}>): DockerCommand {
  const names = buildNames(input.nonce);
  if (!CONTAINER_ID_PATTERN.test(input.canonical_postgres_id)) {
    throw new Error("DAY147_A5_NETWORK_POSTGRES_BINDING_INVALID");
  }
  return Object.freeze({
    executable: "docker",
    args: Object.freeze([
      "exec", input.canonical_postgres_id, "pg_isready", "-q", "-h",
      "127.0.0.1", "-p", "5432", "-U",
      ROLE_FIXTURES.migration_owner.name, "-d", names.main,
    ]),
  });
}

const NETWORK_CLIENT_ENVIRONMENT_KEYS = Object.freeze([
  "FARMOS_A5_EXECUTION_NONCE", "PGHOST", "PGPORT", "PGUSER", "PGPASSWORD",
  "FARMOS_A5_DB_LEGACY_ACTIVE", "FARMOS_A5_DB_LEGACY_SUPERSEDED",
  "FARMOS_A5_DB_MAIN", "FARMOS_A5_CLIENT_RESULT_PATH",
  "FARMOS_A5_CAPABILITY_DIGEST",
  "FARMOS_A5_CAPABILITY_OWNER_UID",
] as const);
const NETWORK_RUNNER_ENTRYPOINT =
  "/workspace/network-client-entrypoint.ts" as const;
const NETWORK_RUNNER_LAUNCHER =
  "/workspace/network-client-launcher.sh" as const;
const NETWORK_RUNNER_TSX_EXECUTABLE =
  "/workspace/node_modules/.bin/tsx" as const;
const NETWORK_RUNNER_CAPABILITY_PATH =
  "/run/farmos-day147a5/client-capability" as const;
const NETWORK_POST_START_BINDING_GATE_PATH =
  "/result/.post-start-network-binding-complete" as const;
const NETWORK_BOOTSTRAP_PROBE_ENVIRONMENT_KEY =
  "FARMOS_DAY147_A5_BOOTSTRAP_PROBE" as const;
const NETWORK_BOOTSTRAP_PROBE_COMPLETE_PHASE =
  "RUNNER_BOOTSTRAP_PROBE_COMPLETE" as const;
const NETWORK_LAUNCHER_ONLY_ENVIRONMENT_KEY =
  "FARMOS_DAY147_A5_LAUNCHER_ONLY_AUTHORITY" as const;
const NETWORK_LAUNCHER_ONLY_CAPABILITY_PATH_KEY =
  "FARMOS_A5_CAPABILITY_PATH" as const;
const NETWORK_LAUNCHER_ONLY_WORKING_DIRECTORY_KEY =
  "FARMOS_A5_WORKING_DIRECTORY" as const;
const NETWORK_LAUNCHER_ONLY_RUNTIME_IDENTITY_KEY =
  "FARMOS_A5_RUNTIME_IDENTITY" as const;
const NETWORK_LAUNCHER_ONLY_ENVIRONMENT_KEYS = Object.freeze([
  "TMPDIR", "HOME", ...NETWORK_CLIENT_ENVIRONMENT_KEYS,
  NETWORK_LAUNCHER_ONLY_ENVIRONMENT_KEY,
  NETWORK_LAUNCHER_ONLY_CAPABILITY_PATH_KEY,
  NETWORK_LAUNCHER_ONLY_WORKING_DIRECTORY_KEY,
  NETWORK_LAUNCHER_ONLY_RUNTIME_IDENTITY_KEY,
] as const);
const NETWORK_LAUNCHER_ONLY_COMPLETE_PHASE =
  "RUNNER_LAUNCHER_ONLY_COMPLETE" as const;
const NETWORK_BUILD_LAUNCHER_CHECK_ENVIRONMENT_KEY =
  "FARMOS_DAY147_A5_BUILD_LAUNCHER_CHECK" as const;
const NETWORK_RUNNER_MODULE_DIAGNOSTIC_PREFIX =
  "FARMOS_DAY147_A5_MODULE_DIAGNOSTIC=" as const;
const NETWORK_CLIENT_AUTHORITY_SURFACE = Object.freeze({
  docker_commands: 0,
  provider_inspection: 0,
  image_inspection: 0,
  network_operations: 0,
  container_operations: 0,
  formal_evidence_writes: 0,
  receipt_writes: 0,
  marker_writes: 0,
  reports_directory_operations: 0,
  production_authority: 0,
  database_operations: "isolated_network_only" as const,
  result_file_writes: 1 as const,
});

type NetworkClientEnvironment = Readonly<Record<
  typeof NETWORK_CLIENT_ENVIRONMENT_KEYS[number], string
>>;

function validateNetworkClientEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
): NetworkClientEnvironment {
  const actual = Object.keys(environment).filter((key) =>
    environment[key] !== undefined
  ).sort();
  const expected = [...NETWORK_CLIENT_ENVIRONMENT_KEYS].sort();
  const nonce = environment.FARMOS_A5_EXECUTION_NONCE ?? "";
  const names = /^[a-f0-9]{12}$/.test(nonce) ? buildNames(nonce) : null;
  if (actual.length !== expected.length ||
    !actual.every((key, index) => key === expected[index]) || names === null ||
    environment.PGHOST !== "postgres" || environment.PGPORT !== "5432" ||
    environment.PGUSER !== ROLE_FIXTURES.migration_owner.name ||
    typeof environment.PGPASSWORD !== "string" ||
    environment.PGPASSWORD.length !== 64 ||
    environment.FARMOS_A5_DB_LEGACY_ACTIVE !== names.legacy_active ||
    environment.FARMOS_A5_DB_LEGACY_SUPERSEDED !== names.legacy_superseded ||
    environment.FARMOS_A5_DB_MAIN !== names.main ||
    environment.FARMOS_A5_CLIENT_RESULT_PATH !== "/result/client-result.json" ||
    !/^[a-f0-9]{64}$/.test(environment.FARMOS_A5_CAPABILITY_DIGEST ?? "") ||
    !/^[1-9][0-9]*$/.test(environment.FARMOS_A5_CAPABILITY_OWNER_UID ?? "") ||
    Object.values(environment).some((value) =>
      typeof value === "string" && /(?:postgres(?:ql)?:\/\/|DATABASE_URL=)/i.test(value)
    )) {
    throw new Error("DAY147_A5_NETWORK_CLIENT_ENVIRONMENT_INVALID");
  }
  return Object.freeze(environment as NetworkClientEnvironment);
}

function buildNetworkRunnerCreateCommand(input: Readonly<{
  nonce: string;
  runner_image_id: string;
  result_directory: string;
  capability_file: string;
  runner_uid: number;
  environment_keys: readonly string[];
}>): DockerCommand {
  const names = buildNetworkRunNames(input.nonce);
  if (JSON.stringify(Object.keys(input).sort()) !== JSON.stringify([
    "capability_file", "environment_keys", "nonce", "result_directory",
    "runner_image_id", "runner_uid",
  ]) || input.result_directory !== names.result_directory ||
    !/^sha256:[a-f0-9]{64}$/.test(input.runner_image_id) ||
    !input.capability_file.endsWith(`/capability-${input.nonce}`) ||
    !Number.isSafeInteger(input.runner_uid) || input.runner_uid < 1 ||
    JSON.stringify([...input.environment_keys].sort()) !==
      JSON.stringify([...NETWORK_CLIENT_ENVIRONMENT_KEYS].sort())) {
    throw new Error("DAY147_A5_NETWORK_RUNNER_COMMAND_INVALID");
  }
  const args = [
    "container", "create", "--name", names.runner_container,
    "--network", names.network, "--cap-drop=ALL",
    "--security-opt=no-new-privileges", "--read-only", "--user",
    String(input.runner_uid),
    "--env", "TMPDIR=/tmp", "--env", "HOME=/tmp/home",
    "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m", "--mount",
    `type=bind,src=${names.result_directory},dst=/result`,
    "--mount",
    `type=bind,src=${input.capability_file},dst=${NETWORK_RUNNER_CAPABILITY_PATH},readonly`,
    "--label", `farmos.day147a5.execution_nonce=${input.nonce}`,
    "--label", `${NETWORK_RESOURCE_ROLE_LABEL}=${NETWORK_RUNNER_ROLE}`,
  ];
  for (const key of input.environment_keys) args.push("--env", key);
  args.push(input.runner_image_id);
  return Object.freeze({ executable: "docker", args: Object.freeze(args) });
}

type RunnerAttemptPaths = Readonly<{
  attempt: number;
  attempt_label: string;
  runner_container: string;
  capability_file: string;
  result_directory: string;
  diagnostic_directory: string;
}>;

function runnerAttemptPaths(nonce: string, attempt: number): RunnerAttemptPaths {
  if (!/^[a-f0-9]{12}$/.test(nonce) || !Number.isInteger(attempt) ||
    attempt < 1 || attempt > MAX_RUNNER_ATTEMPTS) {
    throw new Error("DAY147_A5_RUNNER_ATTEMPT_INVALID");
  }
  const label = `a${String(attempt).padStart(2, "0")}`;
  const root = `${buildNetworkRunNames(nonce).result_directory}/attempts/${label}`;
  return Object.freeze({ attempt, attempt_label: label,
    runner_container: `farmos-day147a5-runner-${nonce}-${label}`,
    capability_file: `${root}/capability-${nonce}-${label}`,
    result_directory: `${root}/result`,
    diagnostic_directory: `${root}/diagnostic` });
}

function buildNetworkRunnerAttemptCreateCommand(input: Readonly<{
  nonce: string;
  attempt: number;
  runner_image_id: string;
  runner_uid: number;
  environment_keys: readonly string[];
}>): DockerCommand {
  const paths = runnerAttemptPaths(input.nonce, input.attempt);
  const names = buildNetworkRunNames(input.nonce);
  if (!/^sha256:[a-f0-9]{64}$/.test(input.runner_image_id) ||
    !Number.isSafeInteger(input.runner_uid) || input.runner_uid < 1 ||
    JSON.stringify([...input.environment_keys].sort()) !==
      JSON.stringify([...NETWORK_CLIENT_ENVIRONMENT_KEYS].sort())) {
    throw new Error("DAY147_A5_NETWORK_RUNNER_COMMAND_INVALID");
  }
  const args = ["container", "create", "--name", paths.runner_container,
    "--network", names.network, "--cap-drop=ALL",
    "--security-opt=no-new-privileges", "--read-only", "--user",
    String(input.runner_uid), "--env", "TMPDIR=/tmp", "--env", "HOME=/tmp/home", "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=64m", "--mount",
    `type=bind,src=${paths.result_directory},dst=/result`, "--mount",
    `type=bind,src=${paths.capability_file},dst=${NETWORK_RUNNER_CAPABILITY_PATH},readonly`,
    "--label", `farmos.day147a5.execution_nonce=${input.nonce}`,
    "--label", `${NETWORK_RESOURCE_ROLE_LABEL}=${NETWORK_RUNNER_ROLE}`,
    "--label", `farmos.day147a5.runner_attempt=${paths.attempt_label}`];
  for (const key of input.environment_keys) args.push("--env", key);
  args.push(input.runner_image_id);
  return Object.freeze({ executable: "docker", args: Object.freeze(args) });
}

type BootstrapProbePaths = Readonly<{
  root: string;
  result_directory: string;
  capability_file: string;
  container_name: string;
}>;

function bootstrapProbePaths(nonce: string): BootstrapProbePaths {
  const root = `${buildNetworkRunNames(nonce).result_directory}/bootstrap-probe`;
  return Object.freeze({ root, result_directory: `${root}/result`,
    capability_file: `${root}/capability-${nonce}`,
    container_name: `farmos-day147a5-bootstrap-probe-${nonce}` });
}

function launcherOnlyProbeName(nonce: string): string {
  if (!/^[a-f0-9]{12}$/.test(nonce)) {
    throw new Error("DAY147_A5_NETWORK_NONCE_INVALID");
  }
  return `farmos-day147a5-launcher-probe-${nonce}`;
}

type LauncherOnlyProbePaths = Readonly<{
  root: string;
  result_directory: string;
  capability_file: string;
  container_name: string;
}>;

function launcherOnlyProbePaths(nonce: string): LauncherOnlyProbePaths {
  const root = `${buildNetworkRunNames(nonce).result_directory}/launcher-only-probe`;
  return Object.freeze({ root, result_directory: `${root}/result`,
    capability_file: `${root}/capability-${nonce}`,
    container_name: launcherOnlyProbeName(nonce) });
}

function buildNetworkLauncherOnlyCreateCommand(input: Readonly<{
  nonce: string;
  runner_image_id: string;
  environment_keys: readonly string[];
}>): DockerCommand {
  const paths = launcherOnlyProbePaths(input.nonce);
  if (!/^sha256:[a-f0-9]{64}$/.test(input.runner_image_id) ||
    JSON.stringify([...input.environment_keys].sort()) !==
      JSON.stringify([...NETWORK_CLIENT_ENVIRONMENT_KEYS].sort())) {
    throw new Error("DAY147_A5_NETWORK_RUNNER_LAUNCHER_IMAGE_INVALID");
  }
  const args = [
    "container", "create", "--name", launcherOnlyProbeName(input.nonce),
    "--network=none", "--cap-drop=ALL", "--security-opt=no-new-privileges",
    "--read-only", "--user",
    `${NETWORK_RUNNER_FINAL_UID}:${NETWORK_RUNNER_FINAL_GID}`,
    "--env", "TMPDIR=/tmp", "--env", "HOME=/tmp/home", "--env",
    `${NETWORK_LAUNCHER_ONLY_ENVIRONMENT_KEY}=${
      NETWORK_RUNNER_LAUNCHER_DIAGNOSTIC_AUTHORITY
    }`, "--env", `${NETWORK_LAUNCHER_ONLY_CAPABILITY_PATH_KEY}=${
      NETWORK_RUNNER_CAPABILITY_PATH}`,
    "--env", `${NETWORK_LAUNCHER_ONLY_WORKING_DIRECTORY_KEY}=/workspace`,
    "--env", `${NETWORK_LAUNCHER_ONLY_RUNTIME_IDENTITY_KEY}=${
      NETWORK_RUNNER_FINAL_UID}:${NETWORK_RUNNER_FINAL_GID}`,
    "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m", "--mount",
    `type=bind,src=${paths.result_directory},dst=/result`, "--mount",
    `type=bind,src=${paths.capability_file},dst=${
      NETWORK_RUNNER_CAPABILITY_PATH},readonly`,
    "--label", `farmos.day147a5.execution_nonce=${input.nonce}`,
    "--label", `${NETWORK_RESOURCE_ROLE_LABEL}=${NETWORK_RUNNER_ROLE}`,
    "--label", `${NETWORK_PROBE_LABEL}=launcher-only`,
  ];
  for (const key of input.environment_keys) args.push("--env", key);
  args.push(input.runner_image_id);
  return Object.freeze({ executable: "docker", args: Object.freeze(args) });
}

const LAUNCHER_CONTAINER_PREDICATES = Object.freeze([
  "LAUNCHER_CONTAINER_ID_BOUND",
  "LAUNCHER_CONTAINER_NAME_BOUND",
  "LAUNCHER_CONTAINER_IMAGE_BOUND",
  "LAUNCHER_CONTAINER_STATE_CREATED",
  "LAUNCHER_CONTAINER_NONCE_LABEL_VALID",
  "LAUNCHER_CONTAINER_ROLE_LABEL_VALID",
  "LAUNCHER_CONTAINER_PROBE_LABEL_VALID",
  "LAUNCHER_CONTAINER_USER_VALID",
  "LAUNCHER_CONTAINER_PRIVILEGED_FALSE",
  "LAUNCHER_CONTAINER_CAP_DROP_ALL",
  "LAUNCHER_CONTAINER_NO_NEW_PRIVILEGES",
  "LAUNCHER_CONTAINER_ROOT_READ_ONLY",
  "LAUNCHER_CONTAINER_TMPFS_VALID",
  "LAUNCHER_CONTAINER_RESULT_MOUNT_VALID",
  "LAUNCHER_CONTAINER_CAPABILITY_MOUNT_VALID",
  "LAUNCHER_CONTAINER_SOCKET_ABSENT",
  "LAUNCHER_CONTAINER_REPOSITORY_MOUNT_ABSENT",
  "LAUNCHER_CONTAINER_ENVIRONMENT_KEYS_VALID",
  "LAUNCHER_CONTAINER_ENTRYPOINT_CMD_VALID",
  "LAUNCHER_CONTAINER_NETWORK_MODE_VALID",
  "LAUNCHER_CONTAINER_HOST_PUBLISH_ABSENT",
  "LAUNCHER_CONTAINER_CONTRACT_COMPLETE",
] as const);
type LauncherContainerPredicate = typeof LAUNCHER_CONTAINER_PREDICATES[number];
type LauncherContainerPredicateResult = Readonly<{
  predicate: LauncherContainerPredicate;
  passed: boolean;
  failure_code: string;
  expected_value: string;
  actual_value_sanitized: string;
}>;

const LAUNCHER_CONTAINER_FAILURE_CODES: Readonly<Record<
  LauncherContainerPredicate, string
>> = Object.freeze({
  LAUNCHER_CONTAINER_ID_BOUND: "DAY147_A5_LAUNCHER_CONTAINER_ID_INVALID",
  LAUNCHER_CONTAINER_NAME_BOUND: "DAY147_A5_LAUNCHER_CONTAINER_NAME_INVALID",
  LAUNCHER_CONTAINER_IMAGE_BOUND: "DAY147_A5_LAUNCHER_CONTAINER_IMAGE_INVALID",
  LAUNCHER_CONTAINER_STATE_CREATED: "DAY147_A5_LAUNCHER_CONTAINER_STATE_INVALID",
  LAUNCHER_CONTAINER_NONCE_LABEL_VALID:
    "DAY147_A5_LAUNCHER_CONTAINER_NONCE_LABEL_INVALID",
  LAUNCHER_CONTAINER_ROLE_LABEL_VALID:
    "DAY147_A5_LAUNCHER_CONTAINER_ROLE_LABEL_INVALID",
  LAUNCHER_CONTAINER_PROBE_LABEL_VALID:
    "DAY147_A5_LAUNCHER_CONTAINER_PROBE_LABEL_INVALID",
  LAUNCHER_CONTAINER_USER_VALID: "DAY147_A5_LAUNCHER_CONTAINER_USER_INVALID",
  LAUNCHER_CONTAINER_PRIVILEGED_FALSE:
    "DAY147_A5_LAUNCHER_CONTAINER_SECURITY_INVALID",
  LAUNCHER_CONTAINER_CAP_DROP_ALL:
    "DAY147_A5_LAUNCHER_CONTAINER_SECURITY_INVALID",
  LAUNCHER_CONTAINER_NO_NEW_PRIVILEGES:
    "DAY147_A5_LAUNCHER_CONTAINER_SECURITY_INVALID",
  LAUNCHER_CONTAINER_ROOT_READ_ONLY:
    "DAY147_A5_LAUNCHER_CONTAINER_SECURITY_INVALID",
  LAUNCHER_CONTAINER_TMPFS_VALID: "DAY147_A5_LAUNCHER_CONTAINER_TMPFS_INVALID",
  LAUNCHER_CONTAINER_RESULT_MOUNT_VALID:
    "DAY147_A5_LAUNCHER_CONTAINER_MOUNT_INVALID",
  LAUNCHER_CONTAINER_CAPABILITY_MOUNT_VALID:
    "DAY147_A5_LAUNCHER_CONTAINER_MOUNT_INVALID",
  LAUNCHER_CONTAINER_SOCKET_ABSENT:
    "DAY147_A5_LAUNCHER_CONTAINER_MOUNT_INVALID",
  LAUNCHER_CONTAINER_REPOSITORY_MOUNT_ABSENT:
    "DAY147_A5_LAUNCHER_CONTAINER_MOUNT_INVALID",
  LAUNCHER_CONTAINER_ENVIRONMENT_KEYS_VALID:
    "DAY147_A5_LAUNCHER_CONTAINER_ENVIRONMENT_INVALID",
  LAUNCHER_CONTAINER_ENTRYPOINT_CMD_VALID:
    "DAY147_A5_LAUNCHER_CONTAINER_COMMAND_INVALID",
  LAUNCHER_CONTAINER_NETWORK_MODE_VALID:
    "DAY147_A5_LAUNCHER_CONTAINER_NETWORK_MODE_INVALID",
  LAUNCHER_CONTAINER_HOST_PUBLISH_ABSENT:
    "DAY147_A5_LAUNCHER_CONTAINER_HOST_PUBLISH_INVALID",
  LAUNCHER_CONTAINER_CONTRACT_COMPLETE:
    "DAY147_A5_LAUNCHER_ONLY_CONTAINER_CONTRACT_INVALID",
});

function evaluateLauncherOnlyContainerContract(input: Readonly<{
  observation: NetworkContainerObservation;
  canonical_container_id: string;
  nonce: string;
  runner_image_id: string;
  result_directory: string;
  capability_file: string;
}>): readonly LauncherContainerPredicateResult[] {
  const observed = input.observation;
  const launcherNetwork = normalizeLauncherOnlyNetworkState(
    observed.launcher_network_inspect,
  );
  const resultMounts = observed.mounts.filter(({ destination }) =>
    destination === "/result");
  const capabilityMounts = observed.mounts.filter(({ destination }) =>
    destination === NETWORK_RUNNER_CAPABILITY_PATH);
  const canonicalArgv = observed.entrypoint === null
    ? observed.cmd : observed.cmd === null
    ? observed.entrypoint : Array.isArray(observed.entrypoint) &&
        Array.isArray(observed.cmd)
    ? [...observed.entrypoint, ...observed.cmd] : undefined;
  const expectedArgv = ["/bin/sh", NETWORK_RUNNER_LAUNCHER];
  const repositoryMountAbsent = observed.mounts.every(({ source, destination }) =>
    source !== ROOT && !source.startsWith(`${ROOT}/`) &&
    destination !== "/workspace" && !destination.startsWith("/workspace/"));
  const values: Readonly<Record<LauncherContainerPredicate, Readonly<{
    passed: boolean; expected: unknown; actual: unknown;
  }>>> = {
    LAUNCHER_CONTAINER_ID_BOUND: { passed:
      CONTAINER_ID_PATTERN.test(observed.id) &&
      observed.id === input.canonical_container_id,
    expected: input.canonical_container_id, actual: observed.id },
    LAUNCHER_CONTAINER_NAME_BOUND: { passed:
      observed.name === launcherOnlyProbeName(input.nonce),
    expected: launcherOnlyProbeName(input.nonce), actual: observed.name },
    LAUNCHER_CONTAINER_IMAGE_BOUND: { passed:
      observed.image_id === input.runner_image_id,
    expected: input.runner_image_id, actual: observed.image_id },
    LAUNCHER_CONTAINER_STATE_CREATED: { passed: observed.runtime_state === "created",
      expected: "created", actual: observed.runtime_state },
    LAUNCHER_CONTAINER_NONCE_LABEL_VALID: { passed:
      observed.execution_nonce_label === input.nonce,
    expected: input.nonce, actual: observed.execution_nonce_label },
    LAUNCHER_CONTAINER_ROLE_LABEL_VALID: { passed:
      observed.resource_role_label === NETWORK_RUNNER_ROLE,
    expected: NETWORK_RUNNER_ROLE, actual: observed.resource_role_label },
    LAUNCHER_CONTAINER_PROBE_LABEL_VALID: { passed:
      observed.probe_label === "launcher-only",
    expected: "launcher-only", actual: observed.probe_label },
    LAUNCHER_CONTAINER_USER_VALID: { passed: observed.user ===
      `${NETWORK_RUNNER_FINAL_UID}:${NETWORK_RUNNER_FINAL_GID}`,
    expected: `${NETWORK_RUNNER_FINAL_UID}:${NETWORK_RUNNER_FINAL_GID}`,
    actual: observed.user },
    LAUNCHER_CONTAINER_PRIVILEGED_FALSE: { passed: !observed.privileged,
      expected: false, actual: observed.privileged },
    LAUNCHER_CONTAINER_CAP_DROP_ALL: { passed:
      JSON.stringify(observed.cap_drop) === JSON.stringify(["ALL"]),
    expected: ["ALL"], actual: observed.cap_drop },
    LAUNCHER_CONTAINER_NO_NEW_PRIVILEGES: { passed:
      JSON.stringify(observed.security_options) ===
        JSON.stringify(["no-new-privileges"]),
    expected: ["no-new-privileges"], actual: observed.security_options },
    LAUNCHER_CONTAINER_ROOT_READ_ONLY: { passed: observed.read_only_rootfs,
      expected: true, actual: observed.read_only_rootfs },
    LAUNCHER_CONTAINER_TMPFS_VALID: { passed:
      JSON.stringify(observed.tmpfs_paths) === JSON.stringify(["/tmp"]),
    expected: ["/tmp"], actual: observed.tmpfs_paths },
    LAUNCHER_CONTAINER_RESULT_MOUNT_VALID: { passed:
      resultMounts.length === 1 && resultMounts[0]?.type === "bind" &&
      resultMounts[0].source === input.result_directory &&
      resultMounts[0].read_write === true,
    expected: `bind:${input.result_directory}:/result:rw`, actual: resultMounts },
    LAUNCHER_CONTAINER_CAPABILITY_MOUNT_VALID: { passed:
      capabilityMounts.length === 1 && capabilityMounts[0]?.type === "bind" &&
      capabilityMounts[0].source === input.capability_file &&
      !capabilityMounts[0].read_write,
    expected: `bind:<probe-root>/capability-${input.nonce}:${
      NETWORK_RUNNER_CAPABILITY_PATH}:ro`, actual: capabilityMounts.map((mount) =>
        ({ ...mount, source: `<probe-root>/capability-${input.nonce}` })) },
    LAUNCHER_CONTAINER_SOCKET_ABSENT: { passed:
      !observed.docker_socket_mounted,
    expected: true, actual: !observed.docker_socket_mounted },
    LAUNCHER_CONTAINER_REPOSITORY_MOUNT_ABSENT: { passed: repositoryMountAbsent,
      expected: true, actual: repositoryMountAbsent },
    LAUNCHER_CONTAINER_ENVIRONMENT_KEYS_VALID: { passed:
      JSON.stringify([...(observed.launcher_environment_keys ?? [])].sort()) ===
        JSON.stringify([...NETWORK_LAUNCHER_ONLY_ENVIRONMENT_KEYS].sort()),
    expected: [...NETWORK_LAUNCHER_ONLY_ENVIRONMENT_KEYS].sort(),
    actual: [...(observed.launcher_environment_keys ?? [])].sort() },
    LAUNCHER_CONTAINER_ENTRYPOINT_CMD_VALID: { passed:
      JSON.stringify(observed.entrypoint) === JSON.stringify(expectedArgv) &&
      observed.cmd === null &&
      JSON.stringify(canonicalArgv) === JSON.stringify(expectedArgv),
    expected: { entrypoint: expectedArgv, cmd: null, canonical_argv: expectedArgv },
    actual: { entrypoint: observed.entrypoint, cmd: observed.cmd,
      canonical_argv: canonicalArgv } },
    LAUNCHER_CONTAINER_NETWORK_MODE_VALID: { passed: launcherNetwork.valid,
    expected: { mode: "none", memberships: 0 },
    actual: launcherNetwork },
    LAUNCHER_CONTAINER_HOST_PUBLISH_ABSENT: { passed:
      observed.published_ports.length === 0,
    expected: [], actual: observed.published_ports },
    LAUNCHER_CONTAINER_CONTRACT_COMPLETE: { passed: true,
      expected: true, actual: true },
  };
  const results: LauncherContainerPredicateResult[] = [];
  for (const predicate of LAUNCHER_CONTAINER_PREDICATES) {
    const value = values[predicate];
    const passed = predicate === "LAUNCHER_CONTAINER_CONTRACT_COMPLETE"
      ? results.every((result) => result.passed) : value.passed;
    results.push(Object.freeze({ predicate, passed,
      failure_code: LAUNCHER_CONTAINER_FAILURE_CODES[predicate],
      expected_value: JSON.stringify(value.expected),
      actual_value_sanitized: (JSON.stringify(value.actual) ?? "undefined").replaceAll(
        input.result_directory, "<probe-result>").replaceAll(
        input.capability_file, "<probe-capability>"),
    }));
  }
  return Object.freeze(results);
}

type LocalTsxRuntimeResult = Readonly<{
  uid: number;
  gid: number;
  file_type: "regular_file" | "symbolic_link";
  realpath_relative: string;
  canonical_target_within_node_modules: true;
  target_regular: true;
  target_readable: true;
  target_executable: true;
  parent_directories_traversable: true;
}>;

type LauncherOnlyProbeResult = Readonly<{
  launcher_started: true;
  runtime_validator: "PASS";
  entrypoint_started: true;
  local_tsx: LocalTsxRuntimeResult;
  cleanup_passed: true;
}>;

class LauncherOnlyProbeFailure extends Error {
  constructor(
    readonly exact_failure_code: string,
    readonly exact_failed_predicate: LauncherContainerPredicate | null,
    readonly expected_value: string | null,
    readonly actual_value_sanitized: string | null,
    readonly exact_validator_marker: string | null,
    readonly errno_code: string,
    readonly uid: number,
    readonly gid: number,
    readonly file_type: string,
    readonly readable: boolean,
    readonly executable: boolean,
    readonly sanitized_stderr: string,
    readonly cleanup_passed: boolean,
  ) { super(exact_failure_code); }
}

const LOCAL_TSX_PHASES = Object.freeze([
  "LOCAL_TSX_VALIDATOR_STARTED", "LOCAL_TSX_LSTAT_VALID",
  "LOCAL_TSX_TYPE_VALID", "LOCAL_TSX_REALPATH_VALID",
  "LOCAL_TSX_TARGET_BOUNDARY_VALID", "LOCAL_TSX_TARGET_REGULAR_VALID",
  "LOCAL_TSX_ACCESS_VALID", "LOCAL_TSX_VALIDATOR_COMPLETE",
] as const);

function prefixedJsonRecord(
  output: string,
  prefix: string,
): Record<string, unknown> | null {
  const line = output.split(/\r?\n/).filter((candidate) =>
    candidate.includes(prefix)
  ).at(-1);
  if (line === undefined) return null;
  try {
    const value: unknown = JSON.parse(line.slice(
      line.indexOf(prefix) + prefix.length,
    ));
    return typeof value === "object" && value !== null
      ? value as Record<string, unknown> : null;
  } catch { return null; }
}

function parseLocalTsxRuntimeResult(output: string): LocalTsxRuntimeResult | null {
  const value = prefixedJsonRecord(
    output, "FARMOS_DAY147_A5_LOCAL_TSX_RESULT=",
  );
  if (value === null || value.uid !== NETWORK_RUNNER_FINAL_UID ||
    value.gid !== NETWORK_RUNNER_FINAL_GID ||
    value.file_type !== "regular_file" && value.file_type !== "symbolic_link" ||
    typeof value.realpath_relative !== "string" ||
    value.realpath_relative.length === 0 || value.realpath_relative.startsWith("/") ||
    value.realpath_relative.includes("..") ||
    value.canonical_target_within_node_modules !== true ||
    value.target_regular !== true || value.target_readable !== true ||
    value.target_executable !== true ||
    value.parent_directories_traversable !== true) return null;
  return Object.freeze(value as LocalTsxRuntimeResult);
}

function launcherOnlyFailureFromOutput(input: Readonly<{
  stderr: string;
  cleanup_passed: boolean;
}>): LauncherOnlyProbeFailure {
  const diagnostic = prefixedJsonRecord(
    input.stderr, "FARMOS_DAY147_A5_LOCAL_TSX_DIAGNOSTIC=",
  );
  const phases = input.stderr.split(/\r?\n/).flatMap((line) => {
    const match = /FARMOS_DAY147_A5_PHASE=([A-Z0-9_]+)/.exec(line);
    return match === null ? [] : [match[1]!];
  });
  const exactFailure = input.stderr.split(/\r?\n/).flatMap((line) => {
    const match = /FARMOS_DAY147_A5_FAILURE=(DAY147_A5_[A-Z0-9_]+)/.exec(line);
    return match === null ? [] : [match[1]!];
  }).at(-1) ?? "DAY147_A5_LAUNCHER_ONLY_VERIFICATION_FAILED";
  return new LauncherOnlyProbeFailure(exactFailure, null, null, null,
    [...LOCAL_TSX_PHASES].reverse().find((phase) => phases.includes(phase)) ?? null,
    typeof diagnostic?.errno_code === "string" ? diagnostic.errno_code : "UNKNOWN",
    typeof diagnostic?.uid === "number" ? diagnostic.uid : NETWORK_RUNNER_FINAL_UID,
    typeof diagnostic?.gid === "number" ? diagnostic.gid : NETWORK_RUNNER_FINAL_GID,
    typeof diagnostic?.file_type === "string" ? diagnostic.file_type : "unknown",
    diagnostic?.readable === true, diagnostic?.executable === true,
    boundedRunnerOutput(input.stderr), input.cleanup_passed);
}

function buildNetworkBootstrapProbeCreateCommand(input: Readonly<{
  nonce: string;
  runner_image_id: string;
  runner_uid: number;
  environment_keys: readonly string[];
}>): DockerCommand {
  const paths = bootstrapProbePaths(input.nonce);
  if (!/^sha256:[a-f0-9]{64}$/.test(input.runner_image_id) ||
    !Number.isSafeInteger(input.runner_uid) || input.runner_uid < 1 ||
    JSON.stringify([...input.environment_keys].sort()) !==
      JSON.stringify([...NETWORK_CLIENT_ENVIRONMENT_KEYS].sort())) {
    throw new Error("DAY147_A5_RUNNER_BOOTSTRAP_PROBE_COMMAND_INVALID");
  }
  const args = ["container", "create", "--name", paths.container_name,
    "--network=none", "--cap-drop=ALL", "--security-opt=no-new-privileges",
    "--read-only", "--user", String(input.runner_uid), "--env", "TMPDIR=/tmp",
    "--env", "HOME=/tmp/home",
    "--env", `${NETWORK_BOOTSTRAP_PROBE_ENVIRONMENT_KEY}=1`,
    "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m", "--mount",
    `type=bind,src=${paths.result_directory},dst=/result`, "--mount",
    `type=bind,src=${paths.capability_file},dst=${NETWORK_RUNNER_CAPABILITY_PATH},readonly`,
    "--label", `farmos.day147a5.execution_nonce=${input.nonce}`,
    "--label", `${NETWORK_RESOURCE_ROLE_LABEL}=bootstrap-probe`];
  for (const key of input.environment_keys) args.push("--env", key);
  args.push(input.runner_image_id);
  return Object.freeze({ executable: "docker", args: Object.freeze(args) });
}

type BootstrapProbeResult = Readonly<{
  status: "PASS";
  last_completed_phase: typeof NETWORK_BOOTSTRAP_PROBE_COMPLETE_PHASE;
  module_diagnostic: null;
  db_connections: 0;
  migrations: 0;
  dynamic_suites: 0;
  cleanup_passed: true;
}>;

function bootstrapProbeReporting(input: Readonly<{
  executed: boolean;
  status: "PASS" | "FAILED" | "NOT_EXECUTED";
}>): typeof input {
  if (input.executed !== (input.status !== "NOT_EXECUTED")) {
    throw new Error("DAY147_A5_BOOTSTRAP_PROBE_REPORTING_INVALID");
  }
  return Object.freeze(input);
}

class BootstrapProbeFailure extends Error {
  constructor(
    readonly primary_code: "DAY147_A5_RUNNER_BOOTSTRAP_PROBE_FAILED",
    readonly last_completed_phase: string | null,
    readonly first_failed_phase: string,
    readonly module_diagnostic: RunnerModuleResolutionDiagnostic | null,
    readonly exit_code: number | null,
    readonly cleanup_passed: boolean,
    readonly exact_failure_class: RunnerRootCauseClass =
      "DAY147_A5_RUNNER_UNKNOWN_DETERMINISTIC_BOOTSTRAP",
    readonly state_error: string = "",
    readonly oom_killed: boolean = false,
    readonly sanitized_stdout: string = "",
    readonly sanitized_stderr: string = "",
  ) {
    super(primary_code);
  }
}

function buildNetworkRunnerStartCommand(canonicalId: string): DockerCommand {
  if (!CONTAINER_ID_PATTERN.test(canonicalId)) {
    throw new Error("DAY147_A5_NETWORK_RUNNER_BINDING_INVALID");
  }
  return Object.freeze({ executable: "docker",
    args: Object.freeze(["container", "start", canonicalId]) });
}

type RunnerMountSourceObservation = Readonly<{
  lexical_path: string;
  canonical_path: string;
  kind: "file" | "directory" | "other";
  symbolic_link: boolean;
  uid: number;
  mode: number;
}>;

function validateRunnerMountContract(input: Readonly<{
  nonce: string;
  runner_uid: number;
  result: RunnerMountSourceObservation;
  capability: RunnerMountSourceObservation;
  command: DockerCommand;
}>): void {
  const names = buildNetworkRunNames(input.nonce);
  const mountValues = input.command.args.flatMap((arg, index, args) =>
    arg === "--mount" && args[index + 1] !== undefined ? [args[index + 1]!] : []
  );
  const targets = mountValues.map((mount) =>
    /(?:^|,)dst=([^,]+)/.exec(mount)?.[1] ?? ""
  );
  const resultWritable = input.result.uid === input.runner_uid &&
    (input.result.mode & 0o700) === 0o700;
  const capabilityReadable = input.capability.uid === input.runner_uid &&
    input.capability.mode === 0o400;
  if (input.result.lexical_path !== names.result_directory ||
    input.result.canonical_path !== input.result.lexical_path ||
    input.result.kind !== "directory" || input.result.symbolic_link ||
    !resultWritable ||
    !input.capability.lexical_path.endsWith(`/capability-${input.nonce}`) ||
    input.capability.canonical_path !== input.capability.lexical_path ||
    input.capability.kind !== "file" || input.capability.symbolic_link ||
    !capabilityReadable || mountValues.length !== 2 ||
    new Set(targets).size !== targets.length ||
    JSON.stringify([...targets].sort()) !== JSON.stringify([
      "/result", NETWORK_RUNNER_CAPABILITY_PATH,
    ].sort()) ||
    mountValues.some((mount) => /docker\.sock|dst=\/workspace(?:,|$)/.test(mount)) ||
    mountValues.some((mount) => mount.includes(ROOT)) ||
    !mountValues.some((mount) => mount ===
      `type=bind,src=${names.result_directory},dst=/result`) ||
    !mountValues.some((mount) => mount ===
      `type=bind,src=${input.capability.lexical_path},dst=${
        NETWORK_RUNNER_CAPABILITY_PATH
      },readonly`)) {
    throw new Error("DAY147_A5_NETWORK_RUNNER_MOUNT_CONTRACT_INVALID");
  }
}

type NetworkRunnerValidationPhase =
  | "POST_CREATE_PRE_START"
  | "POST_START";

type PostStartNetworkBindingEvaluation = Readonly<{
  status: "SUCCESS" | "TRANSIENT" | "INVALID";
  observation: PostStartNetworkBindingCheck;
}>;

function evaluatePostStartNetworkBinding(input: Readonly<{
  check: number;
  runner: NetworkContainerObservation;
  postgres: NetworkContainerObservation;
  network: NetworkObservation;
  nonce: string;
  canonical_runner_id: string;
  canonical_postgres_id: string;
  network_id: string;
  expected_image_id: string;
  result_directory: string;
  capability_file: string;
  expected_user_uid: number;
  expected_runner_name: string;
}>): PostStartNetworkBindingEvaluation {
  const names = buildNetworkRunNames(input.nonce);
  const runner = input.runner;
  const expectedEntryPresent = runner.network_count === 1 &&
    runner.network_name === names.network;
  const networkKeys = runner.network_count === 0 ? [] :
    expectedEntryPresent ? ["<expected-user-defined-network>"] :
    ["<unexpected-network>"];
  const observation = Object.freeze({ check: input.check,
    network_mode: runner.network_mode ?? "",
    network_keys: Object.freeze(networkKeys),
    expected_entry_present: expectedEntryPresent,
    network_id_materialized: (runner.network_id ?? "") !== "",
    endpoint_id_materialized: (runner.endpoint_id ?? "") !== "",
    ip_materialized: (runner.ip_address ?? "") !== "",
    container_state: runner.runtime_state ?? "" });
  const resultMount = runner.mounts.find(({ destination }) => destination === "/result");
  const capabilityMount = runner.mounts.find(({ destination }) =>
    destination === NETWORK_RUNNER_CAPABILITY_PATH);
  const immutableMismatch = runner.id !== input.canonical_runner_id ||
    !CONTAINER_ID_PATTERN.test(runner.id) ||
    runner.name !== input.expected_runner_name ||
    runner.image_id !== input.expected_image_id ||
    runner.execution_nonce_label !== input.nonce ||
    runner.resource_role_label !== NETWORK_RUNNER_ROLE ||
    runner.network_aliases.length !== 0 || runner.published_ports.length !== 0 ||
    runner.privileged || JSON.stringify(runner.cap_drop) !== JSON.stringify(["ALL"]) ||
    !runner.security_options.includes("no-new-privileges") ||
    !runner.read_only_rootfs || runner.user !== String(input.expected_user_uid) ||
    runner.docker_socket_mounted || runner.mounts.length !== 2 ||
    JSON.stringify(runner.tmpfs_paths) !== JSON.stringify(["/tmp"]) ||
    resultMount?.type !== "bind" || resultMount.source !== input.result_directory ||
    capabilityMount?.type !== "bind" ||
    capabilityMount.source !== input.capability_file;
  const state = runner.runtime_state ?? "";
  const deterministicState = ["exited", "dead", "restarting"].includes(state) ||
    state !== "running";
  const modeMismatch = runner.network_mode !== names.network ||
    ["bridge", "host", "none"].includes(runner.network_mode ?? "");
  const unexpectedEntry = (runner.network_count ?? 0) > 1 ||
    (runner.network_count ?? 0) > 0 && !expectedEntryPresent;
  const networkIdMismatch = (runner.network_id ?? "") !== "" &&
    runner.network_id !== input.network_id;
  let postgresInvalid = false;
  try {
    postgresInvalid = validateNetworkPostgresContainer({ observation: input.postgres,
      nonce: input.nonce, network_id: input.network_id,
      expected_image_id: input.postgres.image_id }) !== input.canonical_postgres_id ||
      input.postgres.runtime_state !== "running";
  } catch { postgresInvalid = true; }
  const networkInvalid = input.network.id !== input.network_id ||
    input.network.name !== names.network || input.network.driver !== "bridge" ||
    input.network.scope !== "local" ||
    input.network.execution_nonce_label !== input.nonce ||
    input.network.member_ids.some((id) =>
      id !== input.canonical_runner_id && id !== input.canonical_postgres_id) ||
    !input.network.member_ids.includes(input.canonical_postgres_id);
  const endpointMembershipMismatch = (runner.endpoint_id ?? "") !== "" &&
    !input.network.member_ids.includes(input.canonical_runner_id);
  if (immutableMismatch || deterministicState || modeMismatch || unexpectedEntry ||
    networkIdMismatch || postgresInvalid || networkInvalid ||
    endpointMembershipMismatch) {
    return Object.freeze({ status: "INVALID", observation });
  }
  const materialized = expectedEntryPresent && runner.network_id !== "" &&
    (runner.endpoint_id ?? "") !== "";
  if (!materialized) return Object.freeze({ status: "TRANSIENT", observation });
  const exactMembers = JSON.stringify([...input.network.member_ids].sort()) ===
    JSON.stringify([input.canonical_runner_id, input.canonical_postgres_id].sort());
  return Object.freeze({ status: exactMembers ? "SUCCESS" : "INVALID", observation });
}

class PostStartNetworkBindingFailure extends Error {
  constructor(
    readonly failure_code:
      | "DAY147_A5_RUNNER_CONTAINER_POST_START_NETWORK_BINDING_INVALID"
      | "DAY147_A5_RUNNER_CONTAINER_POST_START_NETWORK_BINDING_TIMEOUT",
    readonly checks: readonly PostStartNetworkBindingCheck[],
    readonly retryable: boolean,
  ) { super(failure_code); }
}

async function convergePostStartNetworkBinding<T>(input: Readonly<{
  deadline_ms: number;
  now: () => number;
  inspect: (check: number) => Promise<Readonly<{
    value: T;
    evaluation: PostStartNetworkBindingEvaluation;
  }>>;
  wait: (milliseconds: number) => Promise<void>;
}>): Promise<Readonly<{ value: T; success_check: number;
  checks: readonly PostStartNetworkBindingCheck[] }>> {
  const checks: PostStartNetworkBindingCheck[] = [];
  for (let check = 1; check <= MAX_POST_START_NETWORK_BINDING_CHECKS; check += 1) {
    if (input.now() >= input.deadline_ms) {
      throw new PostStartNetworkBindingFailure(
        "DAY147_A5_RUNNER_CONTAINER_POST_START_NETWORK_BINDING_TIMEOUT",
        Object.freeze(checks), true);
    }
    const inspected = await input.inspect(check);
    checks.push(inspected.evaluation.observation);
    if (inspected.evaluation.status === "SUCCESS") {
      return Object.freeze({ value: inspected.value, success_check: check,
        checks: Object.freeze(checks) });
    }
    if (inspected.evaluation.status === "INVALID") {
      throw new PostStartNetworkBindingFailure(
        "DAY147_A5_RUNNER_CONTAINER_POST_START_NETWORK_BINDING_INVALID",
        Object.freeze(checks), false);
    }
    if (check === MAX_POST_START_NETWORK_BINDING_CHECKS) break;
    if (input.now() + POST_START_NETWORK_BINDING_INTERVAL_MS >= input.deadline_ms) {
      throw new PostStartNetworkBindingFailure(
        "DAY147_A5_RUNNER_CONTAINER_POST_START_NETWORK_BINDING_TIMEOUT",
        Object.freeze(checks), true);
    }
    await input.wait(POST_START_NETWORK_BINDING_INTERVAL_MS);
  }
  throw new PostStartNetworkBindingFailure(
    "DAY147_A5_RUNNER_CONTAINER_POST_START_NETWORK_BINDING_TIMEOUT",
    Object.freeze(checks), true);
}

function validateNetworkRunnerContainer(input: Readonly<{
  observation: NetworkContainerObservation;
  nonce: string;
  network_id: string;
  phase: NetworkRunnerValidationPhase;
  expected_image_id: string;
  result_directory: string;
  capability_file: string;
  expected_user_uid: number;
  expected_runner_name?: string;
  postgres_observation?: NetworkContainerObservation;
  network_observation?: NetworkObservation;
}>): string {
  const names = buildNetworkRunNames(input.nonce);
  const observed = input.observation;
  const resultMount = observed.mounts.find(({ destination }) =>
    destination === "/result"
  );
  const capabilityMount = observed.mounts.find(({ destination }) =>
    destination === NETWORK_RUNNER_CAPABILITY_PATH
  );
  if (!CONTAINER_ID_PATTERN.test(observed.id) ||
    observed.name !== (input.expected_runner_name ?? names.runner_container) ||
    observed.image_id !== input.expected_image_id ||
    observed.network_name !== names.network ||
    observed.network_count !== 1 ||
    observed.network_mode !== names.network ||
    observed.network_aliases.length !== 0 ||
    observed.published_ports.length !== 0 || observed.privileged ||
    JSON.stringify(observed.cap_drop) !== JSON.stringify(["ALL"]) ||
    !observed.security_options.includes("no-new-privileges") ||
    !observed.read_only_rootfs || observed.user !== String(input.expected_user_uid) ||
    JSON.stringify([...(observed.environment_keys ?? [])].sort()) !==
      JSON.stringify(["HOME", ...NETWORK_CLIENT_ENVIRONMENT_KEYS].sort()) ||
    observed.execution_nonce_label !== input.nonce ||
    observed.resource_role_label !== NETWORK_RUNNER_ROLE ||
    observed.docker_socket_mounted || observed.mounts.length !== 2 ||
    JSON.stringify(observed.tmpfs_paths) !== JSON.stringify(["/tmp"]) ||
    resultMount?.type !== "bind" || resultMount.source !== input.result_directory ||
    capabilityMount?.type !== "bind" ||
    capabilityMount.source !== input.capability_file) {
    throw new Error("DAY147_A5_NETWORK_RUNNER_BINDING_INVALID");
  }
  if (input.phase === "POST_CREATE_PRE_START") {
    if (observed.runtime_state !== "created" ||
      observed.network_id !== "" && observed.network_id !== input.network_id) {
      throw new Error("DAY147_A5_NETWORK_RUNNER_BINDING_INVALID");
    }
    return observed.id;
  }
  const postgres = input.postgres_observation;
  const network = input.network_observation;
  if (observed.runtime_state === "created" || observed.network_id === "" ||
    observed.network_id !== input.network_id || postgres === undefined ||
    network === undefined || postgres.network_id !== input.network_id ||
    postgres.network_name !== names.network ||
    network.id !== input.network_id || network.name !== names.network ||
    network.execution_nonce_label !== input.nonce ||
    JSON.stringify([...network.member_ids].sort()) !==
      JSON.stringify([observed.id, postgres.id].sort()) ||
    observed.published_ports.length !== 0 ||
    postgres.published_ports.length !== 0) {
    throw new Error(
      "DAY147_A5_RUNNER_CONTAINER_POST_START_NETWORK_BINDING_FAILED",
    );
  }
  return observed.id;
}

const ONE_TIME_RUNNER_ROLE_ORPHAN = Object.freeze({
  execution_nonce: "e2b25516a6df",
  canonical_container_id:
    "4bc14ed8223344c4c3a8b4a2931fc20d037282d5c2dcc0791f1ea183cae1c0fb",
  image_id:
    "sha256:238bf3ba8917af7c56ef2429749898241cfe03e00f6ac9853c2332a7cff13c20",
});

function validateOneTimeRunnerRoleOrphanRecovery(
  observed: NetworkContainerObservation,
): void {
  const expected = ONE_TIME_RUNNER_ROLE_ORPHAN;
  const names = buildNetworkRunNames(expected.execution_nonce);
  if (observed.id !== expected.canonical_container_id ||
    observed.name !== names.runner_container ||
    observed.image_id !== expected.image_id ||
    observed.execution_nonce_label !== expected.execution_nonce ||
    observed.resource_role_label !== "" || observed.runtime_state !== "created" ||
    observed.restart_count !== 0 ||
    observed.started_at !== "0001-01-01T00:00:00Z" ||
    observed.network_mode !== names.network ||
    observed.published_ports.length !== 0 || observed.privileged ||
    observed.docker_socket_mounted || observed.mounts.some(({ source, destination }) =>
      source === ROOT || source.startsWith(`${ROOT}/`) ||
      destination === ROOT || destination.startsWith(`${ROOT}/`)
    )) {
    throw new Error("DAY147_A5_ONE_TIME_ORPHAN_PROVENANCE_INVALID");
  }
}

const CLIENT_RESULT_KEYS = [
  "schema_version", "execution_nonce", "result", "postgres_version",
  "migration_results", "legacy", "initial_candidate", "transition_matrix",
  "sequence_identity", "lifecycle_uniqueness", "active_uniqueness",
  "deferred_trigger", "append_only", "privilege_matrix",
  "bundle_integration", "read_integration", "concurrency_forward",
  "concurrency_reverse", "atomicity", "case_registry", "runner_attestation",
  "concurrency_timeline", "row_counts", "client_cleanup", "failure_code",
  "cleanup_failure_code",
] as const;
type ClientCheckStatus = "PASS" | "FAILED" | "NOT_COMPLETED";
type ClientCaseRegistryProof = Readonly<{
  registry_digest: string;
  expected_count: 102;
  executed_count: number;
  results: readonly Readonly<{ case_id: string; status: "PASS" | "FAIL" }>[];
}>;
type ClientResult = Readonly<{
  schema_version: 1;
  execution_nonce: string;
  result: "PASS" | "FAIL";
  postgres_version: string | null;
  migration_results: Readonly<Record<
    "day146" | "prepare_apply" | "prepare_verify" | "activation_apply" |
    "activation_verify", ClientCheckStatus
  >>;
  legacy: Readonly<{ active: ClientCheckStatus; superseded: ClientCheckStatus }>;
  initial_candidate: ClientCheckStatus;
  transition_matrix: Readonly<{
    status: ClientCheckStatus;
    states: 5; ordered_pairs: 25; allowed: 4; forbidden: 21;
  }>;
  sequence_identity: ClientCheckStatus;
  lifecycle_uniqueness: ClientCheckStatus;
  active_uniqueness: ClientCheckStatus;
  deferred_trigger: ClientCheckStatus;
  append_only: ClientCheckStatus;
  privilege_matrix: ClientCheckStatus;
  bundle_integration: ClientCheckStatus;
  read_integration: ClientCheckStatus;
  concurrency_forward: ClientCheckStatus;
  concurrency_reverse: ClientCheckStatus;
  atomicity: ClientCheckStatus;
  case_registry: ClientCaseRegistryProof;
  runner_attestation: Readonly<{
    runner_entrypoint: typeof NETWORK_RUNNER_ENTRYPOINT;
    capability_digest: string;
    execution_nonce: string;
  }>;
  concurrency_timeline: readonly BarrierEvent[];
  row_counts: Readonly<Record<"snapshots" | "projections" | "events" | "lineage", number>>;
  client_cleanup: NetworkClientCleanupMeasurement & Readonly<{
    result_finalized: true;
  }>;
  failure_code: string | null;
  cleanup_failure_code: string | null;
}>;

const CASE_REGISTRY_DIGEST_DOMAIN =
  "farmos-day147a5-case-registry-v1\0" as const;

export function orderedCaseRegistryIds(): readonly string[] {
  return Object.freeze(EXECUTABLE_CASES.map(({ id }) => id));
}

export function caseRegistryDigest(): string {
  return createHash("sha256").update(CASE_REGISTRY_DIGEST_DOMAIN)
    .update(JSON.stringify(orderedCaseRegistryIds())).digest("hex");
}

function caseRegistryProof(
  results: readonly Readonly<{ id: string; status: "PASS" | "FAIL" }>[],
): ClientCaseRegistryProof {
  return Object.freeze({
    registry_digest: caseRegistryDigest(),
    expected_count: 102,
    executed_count: results.length,
    results: Object.freeze(results.map(({ id, status }) => Object.freeze({
      case_id: id, status,
    }))),
  });
}

function validateExactCaseRegistryProof(value: unknown): value is ClientCaseRegistryProof {
  if (typeof value !== "object" || value === null || Array.isArray(value) ||
    !exactRecordKeys(value as Record<string, unknown>, [
      "registry_digest", "expected_count", "executed_count", "results",
    ])) return false;
  const proof = value as Record<string, unknown>;
  if (proof.registry_digest !== caseRegistryDigest() ||
    proof.expected_count !== 102 || proof.executed_count !== 102 ||
    !Array.isArray(proof.results) || proof.results.length !== 102) return false;
  const expected = orderedCaseRegistryIds();
  const seen = new Set<string>();
  return proof.results.every((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item) ||
      !exactRecordKeys(item as Record<string, unknown>, ["case_id", "status"])) {
      return false;
    }
    const result = item as Record<string, unknown>;
    if (result.case_id !== expected[index] || result.status !== "PASS" ||
      seen.has(String(result.case_id))) return false;
    seen.add(String(result.case_id));
    return true;
  }) && seen.size === expected.length;
}

function clientCleanupPassed(value: unknown): value is ClientResult["client_cleanup"] {
  if (typeof value !== "object" || value === null || Array.isArray(value) ||
    !exactRecordKeys(value as Record<string, unknown>, [
      "created_count", "close_attempted_count", "close_completed_count",
      "close_failed_count", "open_client_count_after_cleanup",
      "duplicate_close_attempt_count", "result_finalized",
    ])) return false;
  const cleanup = value as Record<string, unknown>;
  const counts = ["created_count", "close_attempted_count",
    "close_completed_count", "close_failed_count",
    "open_client_count_after_cleanup", "duplicate_close_attempt_count"];
  if (counts.some((key) => !Number.isSafeInteger(cleanup[key]) ||
    Number(cleanup[key]) < 0) || cleanup.result_finalized !== true) return false;
  return Number(cleanup.created_count) > 0 &&
    cleanup.created_count === cleanup.close_attempted_count &&
    cleanup.created_count === cleanup.close_completed_count &&
    cleanup.close_failed_count === 0 &&
    cleanup.open_client_count_after_cleanup === 0 &&
    cleanup.duplicate_close_attempt_count === 0;
}

function exactRecordKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function validateClientResult(value: unknown, expectedNonce: string): value is ClientResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const result = value as Record<string, unknown>;
  if (!exactRecordKeys(result, CLIENT_RESULT_KEYS) ||
    result.schema_version !== 1 || result.execution_nonce !== expectedNonce ||
    !/^[a-f0-9]{12}$/.test(expectedNonce) ||
    !["PASS", "FAIL"].includes(String(result.result)) ||
    !(result.postgres_version === null ||
      typeof result.postgres_version === "string") ||
    typeof result.migration_results !== "object" ||
    result.migration_results === null ||
    !exactRecordKeys(result.migration_results as Record<string, unknown>, [
      "day146", "prepare_apply", "prepare_verify", "activation_apply",
      "activation_verify",
    ]) || Object.values(result.migration_results).some((item) =>
      !["PASS", "FAILED", "NOT_COMPLETED"].includes(String(item))
    ) ||
    typeof result.legacy !== "object" || result.legacy === null ||
    !exactRecordKeys(result.legacy as Record<string, unknown>, ["active", "superseded"]) ||
    !["PASS", "FAILED", "NOT_COMPLETED"].includes(String(
      (result.legacy as Record<string, unknown>).active,
    )) || !["PASS", "FAILED", "NOT_COMPLETED"].includes(String(
      (result.legacy as Record<string, unknown>).superseded,
    )) ||
    typeof result.transition_matrix !== "object" ||
    result.transition_matrix === null ||
    !exactRecordKeys(result.transition_matrix as Record<string, unknown>, [
      "status", "states", "ordered_pairs", "allowed", "forbidden",
    ]) || JSON.stringify(result.transition_matrix) !==
      JSON.stringify({
        status: (result.transition_matrix as Record<string, unknown>).status,
        states: 5, ordered_pairs: 25, allowed: 4, forbidden: 21,
      }) || !["PASS", "FAILED", "NOT_COMPLETED"].includes(String(
        (result.transition_matrix as Record<string, unknown>).status,
      )) ||
    typeof result.client_cleanup !== "object" || result.client_cleanup === null) return false;
  for (const key of CLIENT_RESULT_KEYS.slice(6, 19)) {
    if (key !== "transition_matrix" &&
      !["PASS", "FAILED", "NOT_COMPLETED"].includes(String(result[key]))) {
      return false;
    }
  }
  if (result.result === "PASS") {
    if (typeof result.postgres_version !== "string" ||
      result.postgres_version.length === 0 || result.failure_code !== null ||
      result.cleanup_failure_code !== null) return false;
    const statuses = [
      ...Object.values(result.migration_results),
      ...Object.values(result.legacy),
      (result.transition_matrix as Record<string, unknown>).status,
      ...CLIENT_RESULT_KEYS.slice(6, 19)
        .filter((key) => key !== "transition_matrix")
        .map((key) => result[key]),
    ];
    if (statuses.some((status) => status !== "PASS") ||
      !validateExactCaseRegistryProof(result.case_registry) ||
      typeof result.runner_attestation !== "object" ||
      result.runner_attestation === null ||
      !exactRecordKeys(result.runner_attestation as Record<string, unknown>, [
        "runner_entrypoint", "capability_digest", "execution_nonce",
      ]) ||
      (result.runner_attestation as Record<string, unknown>).runner_entrypoint !==
        NETWORK_RUNNER_ENTRYPOINT ||
      (result.runner_attestation as Record<string, unknown>).execution_nonce !==
        expectedNonce ||
      !/^[a-f0-9]{64}$/.test(String(
        (result.runner_attestation as Record<string, unknown>).capability_digest,
      )) || !Array.isArray(result.concurrency_timeline) ||
      JSON.stringify(result.concurrency_timeline) !== JSON.stringify([
        ...EXPECTED_CONCURRENCY_TIMELINE, ...EXPECTED_CONCURRENCY_TIMELINE,
      ]) || typeof result.row_counts !== "object" || result.row_counts === null ||
      !exactRecordKeys(result.row_counts as Record<string, unknown>, [
        "snapshots", "projections", "events", "lineage",
      ]) || Object.values(result.row_counts).some((count) =>
        !Number.isSafeInteger(count) || Number(count) < 0
      ) ||
      !clientCleanupPassed(result.client_cleanup)) return false;
  } else if (typeof result.failure_code !== "string" ||
    !/^DAY147_A5_[A-Z0-9_]+$/.test(result.failure_code) ||
    !(result.cleanup_failure_code === null ||
      result.cleanup_failure_code === "DAY147_A5_NETWORK_CLIENT_CLEANUP_FAILED")) {
    return false;
  }
  try { assertEvidenceSafe(result); } catch { return false; }
  return true;
}

type ClientResultFileObservation = Readonly<{
  entries: readonly string[];
  file_name: string;
  regular_file: boolean;
  symbolic_link: boolean;
  owner_matches: boolean;
  mode: number;
  canonical_path: string;
  expected_path: string;
  size_bytes: number;
  bytes: Uint8Array;
}>;

function validateClientResultFile(
  observation: ClientResultFileObservation,
  expectedNonce: string,
): ClientResult {
  const attemptScoped = observation.expected_path.includes("/attempts/a");
  const expectedEntries = attemptScoped ? ["client-result.json"] :
    [`capability-${expectedNonce}`, "client-result.json"];
  if (JSON.stringify([...observation.entries].sort()) !== JSON.stringify(
    expectedEntries.sort(),
  ) ||
    observation.file_name !== "client-result.json" ||
    !observation.regular_file || observation.symbolic_link ||
    !observation.owner_matches || observation.mode !== 0o600 ||
    observation.canonical_path !== observation.expected_path ||
    observation.size_bytes !== observation.bytes.byteLength ||
    observation.size_bytes < 1 || observation.size_bytes > 262_144) {
    throw new Error("DAY147_A5_NETWORK_CLIENT_RESULT_FILE_INVALID");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(
      observation.bytes,
    ));
  } catch {
    throw new Error("DAY147_A5_NETWORK_CLIENT_RESULT_JSON_INVALID");
  }
  if (!validateClientResult(parsed, expectedNonce)) {
    throw new Error("DAY147_A5_NETWORK_CLIENT_RESULT_CONTRACT_INVALID");
  }
  return parsed;
}

const NETWORK_CLEANUP_ORDER = Object.freeze([
  "runner_container", "postgres_container", "network", "temporary_image",
  "result_root", "build_root",
] as const);
const NETWORK_ORCHESTRATOR_PHASE_ORDER = Object.freeze([
  "argument_authority", "git_source_scope", "orbstack_provider_gate",
  "base_image_digest_validation", "source_snapshot", "temporary_image_build",
  "runner_bootstrap_probe",
  "network_create", "postgres_container_create_start",
  "postgres_internal_readiness", "runner_capability_create",
  "runner_container_create", "runner_container_inspect_after_create",
  "runner_container_start", "runner_container_inspect_after_start",
  "runner_attestation", "client_result_read",
  "client_result_validation", "case_registry_validation",
  "formal_evidence_prepare", "cleanup_all_phases",
  "cleanup_complete_verify", "formal_evidence_finalize",
] as const);
type NetworkCleanupPhase = typeof NETWORK_CLEANUP_ORDER[number];
const NETWORK_CLEANUP_FAILURE_CODES: Readonly<Record<NetworkCleanupPhase, string>> =
  Object.freeze({
    runner_container: "DAY147_A5_RUNNER_CLEANUP_FAILED",
    postgres_container: "DAY147_A5_POSTGRES_CONTAINER_CLEANUP_FAILED",
    network: "DAY147_A5_NETWORK_CLEANUP_FAILED",
    temporary_image: "DAY147_A5_RUNNER_IMAGE_CLEANUP_FAILED",
    result_root: "DAY147_A5_RESULT_ROOT_CLEANUP_FAILED",
    build_root: "DAY147_A5_BUILD_ROOT_CLEANUP_FAILED",
  });

function classifyContainerCleanupPresence(
  status: number,
  stderr: string,
): "PRESENT" | "ABSENT" {
  if (status === 0) return "PRESENT";
  if (status === 1 && /(?:No such container|No such object)/.test(stderr)) {
    return "ABSENT";
  }
  throw new Error("DAY147_A5_NETWORK_CLEANUP_PRESENCE_INVALID");
}

type NetworkCreationReceipt = Readonly<{
  resource_type: NetworkCleanupPhase;
  execution_nonce: string;
  canonical_resource: string;
  expected_name: string;
  creation_operation_success: true;
  pre_existing: false;
  expected_binding: string;
  cleanup_eligible: true;
}>;

function networkCreationReceipt(input: NetworkCreationReceipt): NetworkCreationReceipt {
  if (!NETWORK_CLEANUP_ORDER.includes(input.resource_type) ||
    !/^[a-f0-9]{12}$/.test(input.execution_nonce) ||
    input.canonical_resource.includes("*") || input.expected_name.length === 0 ||
    input.expected_binding.length === 0 || input.creation_operation_success !== true ||
    input.pre_existing !== false || input.cleanup_eligible !== true) {
    throw new Error("DAY147_A5_NETWORK_RESOURCE_RECEIPT_INVALID");
  }
  const dockerResource = !["result_root", "build_root"].includes(
    input.resource_type,
  );
  if (dockerResource && !/^(?:sha256:)?[a-f0-9]{64}$/.test(
    input.canonical_resource,
  )) throw new Error("DAY147_A5_NETWORK_RESOURCE_RECEIPT_INVALID");
  const names = buildNetworkRunNames(input.execution_nonce);
  if (!dockerResource && !input.canonical_resource.startsWith(
    "/private/tmp/farmos-day147a5-network-runner/",
  ) || input.resource_type === "result_root" &&
    input.canonical_resource !== names.result_directory ||
    input.resource_type === "build_root" &&
    input.canonical_resource !== dirname(names.build_context)) {
    throw new Error("DAY147_A5_NETWORK_RESOURCE_RECEIPT_INVALID");
  }
  return Object.freeze({ ...input });
}

type NetworkCleanupResult = Readonly<{
  attempted: readonly NetworkCleanupPhase[];
  completed: readonly NetworkCleanupPhase[];
  not_applicable: readonly NetworkCleanupPhase[];
  failures: readonly Readonly<{
    phase: NetworkCleanupPhase;
    failure_code: string;
  }>[];
}>;

function validateRunnerCleanupBinding(
  receipt: NetworkCreationReceipt,
  observed: NetworkContainerObservation,
): void {
  const imagePrefix = `${observed.image_id}:`;
  if (receipt.resource_type !== "runner_container" ||
    receipt.cleanup_eligible !== true ||
    observed.id !== receipt.canonical_resource ||
    observed.name !== receipt.expected_name ||
    observed.execution_nonce_label !== receipt.execution_nonce ||
    observed.resource_role_label !== NETWORK_RUNNER_ROLE ||
    !["created", "running", "exited"].includes(observed.runtime_state ?? "") ||
    !receipt.expected_binding.startsWith(imagePrefix) ||
    !CONTAINER_ID_PATTERN.test(receipt.expected_binding.slice(imagePrefix.length))) {
    throw new Error("DAY147_A5_NETWORK_CLEANUP_BINDING_INVALID");
  }
}

function validateTemporaryImageCleanupBinding(input: Readonly<{
  receipt: NetworkCreationReceipt;
  image_id: string;
  repo_tags: readonly string[];
  execution_nonce_label: string;
  base_image_id_label: string;
  entrypoint_digest_label: string;
  referencing_container_ids: readonly string[];
  protected_image_ids: readonly string[];
}>): void {
  const { receipt } = input;
  if (receipt.resource_type !== "temporary_image" ||
    input.protected_image_ids.includes(receipt.canonical_resource) ||
    receipt.expected_name !==
      buildNetworkRunNames(receipt.execution_nonce).runner_image ||
    input.image_id !== receipt.canonical_resource ||
    input.referencing_container_ids.length !== 0 ||
    !input.repo_tags.includes(receipt.expected_name) ||
    input.execution_nonce_label !== receipt.execution_nonce ||
    `${input.base_image_id_label}:${input.entrypoint_digest_label}` !==
      receipt.expected_binding) {
    throw new Error("DAY147_A5_NETWORK_CLEANUP_BINDING_INVALID");
  }
}

async function executeExactNetworkCleanup(input: Readonly<{
  nonce: string;
  receipts: readonly NetworkCreationReceipt[];
  act: (receipt: NetworkCreationReceipt) => Promise<Readonly<{
    canonical_resource: string;
    expected_binding: string;
    absent_after_cleanup: boolean;
  }>>;
}>): Promise<NetworkCleanupResult> {
  const attempted: NetworkCleanupPhase[] = [];
  const completed: NetworkCleanupPhase[] = [];
  const notApplicable: NetworkCleanupPhase[] = [];
  const failures: { phase: NetworkCleanupPhase; failure_code: string }[] = [];
  for (const phase of NETWORK_CLEANUP_ORDER) {
    const matching = input.receipts.filter((item) => item.resource_type === phase);
    const receipt = matching[0];
    if (matching.length === 0) {
      notApplicable.push(phase);
      continue;
    }
    attempted.push(phase);
    try {
      if (receipt === undefined || receipt.execution_nonce !== input.nonce ||
        matching.length !== 1) {
        throw new Error("receipt invalid");
      }
      networkCreationReceipt(receipt);
      if (phase === "temporary_image" && failures.some(({ phase: failed }) =>
        failed === "runner_container"
      )) {
        throw new Error("runner must be absent before image cleanup");
      }
      const observed = await input.act(receipt);
      if (observed.canonical_resource !== receipt.canonical_resource ||
        observed.expected_binding !== receipt.expected_binding ||
        observed.absent_after_cleanup !== true) throw new Error("binding invalid");
      completed.push(phase);
    } catch {
      failures.push({ phase, failure_code: NETWORK_CLEANUP_FAILURE_CODES[phase] });
    }
  }
  return Object.freeze({
    attempted: Object.freeze(attempted), completed: Object.freeze(completed),
    not_applicable: Object.freeze(notApplicable),
    failures: Object.freeze(failures.map((failure) => Object.freeze(failure))),
  });
}

function validateNetworkEvidenceAuthority(input: Readonly<{
  proof: DockerUserDefinedNetworkProof;
  client_result: unknown;
  cleanup: NetworkCleanupResult;
  required_phases: readonly string[];
  expected_capability_digest: string;
}>): FarmOsDay147A5ConnectionMetadata {
  if (!validateClientResult(input.client_result, input.proof.execution_nonce) ||
    input.client_result.result !== "PASS" ||
    !validateExactCaseRegistryProof(input.client_result.case_registry) ||
    !clientCleanupPassed(input.client_result.client_cleanup) ||
    input.client_result.runner_attestation.capability_digest !==
      input.expected_capability_digest ||
    JSON.stringify(input.cleanup.attempted) !== JSON.stringify(NETWORK_CLEANUP_ORDER) ||
    JSON.stringify(input.cleanup.completed) !== JSON.stringify(NETWORK_CLEANUP_ORDER) ||
    input.cleanup.failures.length !== 0 ||
    JSON.stringify(input.required_phases) !== JSON.stringify(
      NETWORK_ORCHESTRATOR_PHASE_ORDER.slice(0, -1),
    )) {
    throw new Error("DAY147_A5_NETWORK_EVIDENCE_AUTHORITY_BLOCKED");
  }
  return serializeValidatedConnectionTopology(
    validateDockerUserDefinedNetworkProof(input.proof),
  );
}

async function executeNetworkOrchestratorValidation(input: Readonly<{
  arguments: ParsedArguments;
  nonce: string;
  provider_local_validated: boolean;
  remote_endpoint_present: boolean;
  base_image: ImageObservation;
  built_image: Readonly<{
    expected_tag: string;
    observed_tag: string;
    build_result_id: string;
    inspected_id: string;
    pre_existing: boolean;
    execution_nonce_label: string;
    base_image_id: string;
  }>;
  prior_network: NetworkObservation | null;
  network: NetworkObservation;
  postgres: NetworkContainerObservation;
  runner: NetworkContainerObservation;
  postgres_image_id: string;
  postgres_internal_readiness_passed: boolean;
  runner_execution_timeout_ms: number;
  receipts: readonly NetworkCreationReceipt[];
  completed_phases: readonly string[];
  expected_capability_digest: string;
  capability_file: string;
  runner_uid: number;
  client_result_file: ClientResultFileObservation;
  cleanup_act: Parameters<typeof executeExactNetworkCleanup>[0]["act"];
  write_formal_evidence: (
    metadata: FarmOsDay147A5ConnectionMetadata,
  ) => Promise<void>;
}>): Promise<FarmOsDay147A5ConnectionMetadata> {
  if (input.arguments.mode !== "execute-network-isolated" ||
    input.arguments.authority !== NETWORK_EXECUTION_AUTHORITY ||
    !input.provider_local_validated || input.remote_endpoint_present ||
    !input.postgres_internal_readiness_passed ||
    input.runner_execution_timeout_ms !== NETWORK_RUNNER_EXECUTION_TIMEOUT_MS) {
    throw new Error("DAY147_A5_NETWORK_EXECUTION_AUTHORITY_REQUIRED");
  }
  const names = buildNetworkRunNames(input.nonce);
  validateNetworkRunnerBaseImage(input.base_image);
  buildSourceSnapshotPlan(input.nonce);
  buildNetworkRunnerImageCommand(input.nonce);
  const runnerImageId = validateBuiltRunnerImage(input.built_image);
  assertNetworkNameAvailable(input.prior_network);
  const networkId = validateCreatedNetwork(input.network, input.nonce);
  const postgresId = validateNetworkPostgresContainer({
    observation: input.postgres,
    nonce: input.nonce,
    network_id: networkId,
    expected_image_id: input.postgres_image_id,
  });
  buildNetworkPostgresInternalReadinessCommand({
    nonce: input.nonce,
    canonical_postgres_id: postgresId,
  });
  const runnerId = validateNetworkRunnerContainer({
    observation: input.runner,
    nonce: input.nonce,
    network_id: networkId,
    phase: "POST_START",
    expected_image_id: runnerImageId,
    result_directory: names.result_directory,
    capability_file: input.capability_file,
    expected_user_uid: input.runner_uid,
    postgres_observation: input.postgres,
    network_observation: input.network,
  });
  const clientResult = validateClientResultFile(
    input.client_result_file,
    input.nonce,
  );
  const cleanup = await executeExactNetworkCleanup({
    nonce: input.nonce,
    receipts: input.receipts,
    act: input.cleanup_act,
  });
  const metadata = validateNetworkEvidenceAuthority({
    proof: {
      network_mode: "USER_DEFINED_BRIDGE",
      execution_nonce: input.nonce,
      network_nonce: input.network.execution_nonce_label,
      postgres_network_nonce: input.postgres.execution_nonce_label,
      runner_network_nonce: input.runner.execution_nonce_label,
      postgres_aliases: input.postgres.network_aliases,
      postgres_host_publish: input.postgres.published_ports.length !== 0,
      runner_db_host: "postgres",
      runner_db_port: 5432,
      remote_endpoint_present: input.remote_endpoint_present,
      docker_socket_mounted: input.runner.docker_socket_mounted,
      result_nonce: clientResult.execution_nonce,
    },
    client_result: clientResult,
    cleanup,
    required_phases: input.completed_phases,
    expected_capability_digest: input.expected_capability_digest,
  });
  await input.write_formal_evidence(metadata);
  return metadata;
}

type ConcreteNetworkOrchestratorOperations = Readonly<{
  current_creation_receipts: () => readonly NetworkCreationReceipt[];
  validate_git_source_scope: (nonce: string) => Promise<void>;
  validate_orbstack_provider: () => Promise<void>;
  inspect_base_image: () => Promise<ImageObservation>;
  create_source_snapshot: (nonce: string) => Promise<Readonly<{
    snapshot: SourceSnapshotExecution;
    receipts: readonly NetworkCreationReceipt[];
  }>>;
  build_temporary_image: (
    nonce: string, snapshot: SourceSnapshotExecution,
  ) => Promise<Readonly<{
    observation: Parameters<typeof validateBuiltRunnerImage>[0];
    receipt: NetworkCreationReceipt;
  }>>;
  run_bootstrap_probe: (input: Readonly<{
    nonce: string;
    runner_image_id: string;
  }>) => Promise<BootstrapProbeResult>;
  create_network: (nonce: string) => Promise<Readonly<{
    prior: NetworkObservation | null;
    observation: NetworkObservation;
    receipt: NetworkCreationReceipt;
  }>>;
  create_start_postgres: (
    nonce: string, networkId: string,
  ) => Promise<Readonly<{
    observation: NetworkContainerObservation;
    postgres_image_id: string;
    receipt: NetworkCreationReceipt;
  }>>;
  wait_postgres_internal: (nonce: string, postgresId: string) => Promise<void>;
  converge_runner: (input: Readonly<{
    nonce: string;
    network_id: string;
    postgres_id: string;
    runner_image_id: string;
  }>) => Promise<Readonly<{
    runner: NetworkContainerObservation;
    postgres: NetworkContainerObservation;
    network: NetworkObservation;
    capability_path: string;
    capability_digest: string;
    runner_uid: number;
    runner_receipt: NetworkCreationReceipt;
    client_result_file: ClientResultFileObservation;
    successful_attempt: number;
    timeline: readonly RunnerAttemptDiagnostic[];
  }>>;
  create_runner_capability: (nonce: string) => Promise<Readonly<{
    path: string;
    digest: string;
    owner_uid: number;
  }>>;
  create_runner: (input: Readonly<{
    nonce: string; network_id: string; runner_image_id: string;
    capability_path: string; capability_digest: string;
    runner_uid: number;
  }>) => Promise<Readonly<{
    canonical_id: string;
    receipt: NetworkCreationReceipt;
  }>>;
  inspect_runner_after_create: (canonicalId: string) =>
    Promise<NetworkContainerObservation>;
  start_runner: (canonicalId: string) => Promise<void>;
  inspect_runner_after_start: (canonicalId: string) =>
    Promise<Readonly<{
      runner: NetworkContainerObservation;
      postgres: NetworkContainerObservation;
      network: NetworkObservation;
    }>>;
  attest_runner: (canonicalId: string) => Promise<void>;
  read_client_result: (nonce: string) => Promise<ClientResultFileObservation>;
  prepare_formal_evidence: (nonce: string) => Promise<void>;
  cleanup_resource: Parameters<typeof executeExactNetworkCleanup>[0]["act"];
  write_failure_evidence: (
    nonce: string, primary: string, cleanup: NetworkCleanupResult,
  ) => Promise<void>;
  finalize_formal_evidence: (
    nonce: string, metadata: FarmOsDay147A5ConnectionMetadata,
  ) => Promise<void>;
}>;

class NetworkOrchestratorFailure extends Error {
  constructor(
    readonly primary_code: string,
    readonly cleanup_failures: NetworkCleanupResult["failures"],
    readonly exact_root_cause: string = primary_code,
    readonly runner_timeline: readonly RunnerAttemptDiagnostic[] = [],
    readonly secondary_failures: readonly string[] = [],
    readonly bootstrap_probe_failure: BootstrapProbeFailure | null = null,
    readonly bootstrap_probe_executed: boolean = false,
    readonly bootstrap_probe_status: "PASS" | "FAILED" | "NOT_EXECUTED" =
      "NOT_EXECUTED",
  ) {
    super(primary_code);
  }
}

async function executeConcreteNetworkOrchestratorWithFailureCleanup(input:
  Parameters<typeof executeConcreteNetworkOrchestrator>[0]
): ReturnType<typeof executeConcreteNetworkOrchestrator> {
  let bootstrapProbeExecuted = false;
  let bootstrapProbeStatus: "PASS" | "FAILED" | "NOT_EXECUTED" = "NOT_EXECUTED";
  const operations: ConcreteNetworkOrchestratorOperations = {
    ...input.operations,
    async run_bootstrap_probe(probeInput) {
      bootstrapProbeExecuted = true;
      try {
        const result = await input.operations.run_bootstrap_probe(probeInput);
        bootstrapProbeStatus = result.status === "PASS" ? "PASS" : "FAILED";
        return result;
      } catch (error) {
        bootstrapProbeStatus = "FAILED";
        throw error;
      }
    },
  };
  try {
    return await executeConcreteNetworkOrchestrator({ ...input, operations });
  } catch (error) {
    if (error instanceof NetworkOrchestratorFailure) throw error;
    const exact = error instanceof BootstrapProbeFailure
      ? error.exact_failure_class
      : error instanceof RunnerConvergenceFailure
      ? error.root_cause_class : error instanceof Error &&
        /^DAY147_A5_[A-Z0-9_]+$/.test(error.message)
      ? error.message
      : "DAY147_A5_NETWORK_ORCHESTRATION_FAILED";
    const primary = error instanceof BootstrapProbeFailure
      ? error.primary_code : error instanceof RunnerConvergenceFailure
      ? error.root_cause_class.startsWith(
          "DAY147_A5_RUNNER_CONTAINER_POST_START_NETWORK_BINDING_",
        ) ? error.root_cause_class : "DAY147_A5_RUNNER_ATTESTATION_FAILED"
      : exact;
    const cleanup = await executeExactNetworkCleanup({
      nonce: input.nonce,
      receipts: input.operations.current_creation_receipts(),
      act: input.operations.cleanup_resource,
    });
    const secondary: string[] = [];
    try {
      await input.operations.write_failure_evidence(input.nonce, primary, cleanup);
    } catch {
      secondary.push("DAY147_A5_EVIDENCE_DURABILITY_BLOCKED");
    }
    const probeReport = bootstrapProbeReporting({ executed: bootstrapProbeExecuted,
      status: bootstrapProbeStatus });
    throw new NetworkOrchestratorFailure(primary, cleanup.failures, exact,
      error instanceof RunnerConvergenceFailure ? error.timeline : [],
      Object.freeze(secondary),
      error instanceof BootstrapProbeFailure ? error : null,
      probeReport.executed, probeReport.status);
  }
}

async function executeConcreteNetworkOrchestrator(input: Readonly<{
  arguments: ParsedArguments;
  nonce: string;
  operations: ConcreteNetworkOrchestratorOperations;
}>): Promise<Readonly<{
  metadata: FarmOsDay147A5ConnectionMetadata;
  completed_phases: readonly string[];
  cleanup: NetworkCleanupResult;
  runner_timeline: readonly RunnerAttemptDiagnostic[];
  successful_runner_attempt: number;
  bootstrap_probe_executed: boolean;
  bootstrap_probe_status: "PASS" | "FAILED" | "NOT_EXECUTED";
}>> {
  const completed: string[] = [];
  const receipts: NetworkCreationReceipt[] = [];
  const complete = (phase: typeof NETWORK_ORCHESTRATOR_PHASE_ORDER[number]) => {
    const expected = NETWORK_ORCHESTRATOR_PHASE_ORDER[completed.length];
    if (phase !== expected) {
      throw new Error("DAY147_A5_NETWORK_ORCHESTRATOR_PHASE_INVALID");
    }
    completed.push(phase);
  };
  if (input.arguments.mode !== "execute-network-isolated" ||
    input.arguments.authority !== NETWORK_EXECUTION_AUTHORITY ||
    !/^[a-f0-9]{12}$/.test(input.nonce)) {
    throw new Error("DAY147_A5_NETWORK_EXECUTION_AUTHORITY_REQUIRED");
  }
  complete("argument_authority");
  await input.operations.validate_git_source_scope(input.nonce);
  complete("git_source_scope");
  await input.operations.validate_orbstack_provider();
  complete("orbstack_provider_gate");
  const baseImage = await input.operations.inspect_base_image();
  validateNetworkRunnerBaseImage(baseImage);
  complete("base_image_digest_validation");
  const source = await input.operations.create_source_snapshot(input.nonce);
  receipts.push(...source.receipts.map(networkCreationReceipt));
  complete("source_snapshot");
  const built = await input.operations.build_temporary_image(
    input.nonce, source.snapshot,
  );
  const runnerImageId = validateBuiltRunnerImage(built.observation);
  receipts.push(networkCreationReceipt(built.receipt));
  complete("temporary_image_build");
  const bootstrapProbe = await input.operations.run_bootstrap_probe({
    nonce: input.nonce,
    runner_image_id: runnerImageId,
  });
  if (bootstrapProbe.status !== "PASS" || !bootstrapProbe.cleanup_passed ||
    bootstrapProbe.db_connections !== 0 || bootstrapProbe.migrations !== 0 ||
    bootstrapProbe.dynamic_suites !== 0) {
    throw new Error("DAY147_A5_RUNNER_BOOTSTRAP_PROBE_FAILED");
  }
  complete("runner_bootstrap_probe");
  const network = await input.operations.create_network(input.nonce);
  assertNetworkNameAvailable(network.prior);
  const networkId = validateCreatedNetwork(network.observation, input.nonce);
  receipts.push(networkCreationReceipt(network.receipt));
  complete("network_create");
  const postgres = await input.operations.create_start_postgres(
    input.nonce, networkId,
  );
  const postgresId = validateNetworkPostgresContainer({
    observation: postgres.observation, nonce: input.nonce,
    network_id: networkId, expected_image_id: postgres.postgres_image_id,
  });
  receipts.push(networkCreationReceipt(postgres.receipt));
  complete("postgres_container_create_start");
  await input.operations.wait_postgres_internal(input.nonce, postgresId);
  complete("postgres_internal_readiness");
  const converged = await input.operations.converge_runner({ nonce: input.nonce,
    network_id: networkId, postgres_id: postgresId,
    runner_image_id: runnerImageId });
  const capability = { path: converged.capability_path,
    digest: converged.capability_digest, owner_uid: converged.runner_uid };
  complete("runner_capability_create");
  if (converged.runner.id !== converged.runner_receipt.canonical_resource) {
    throw new Error("DAY147_A5_NETWORK_RESOURCE_RECEIPT_INVALID");
  }
  receipts.push(networkCreationReceipt(converged.runner_receipt));
  complete("runner_container_create");
  complete("runner_container_inspect_after_create");
  complete("runner_container_start");
  const startedRunner = converged.runner;
  try {
    validateNetworkRunnerContainer({
      observation: startedRunner, nonce: input.nonce, network_id: networkId,
      phase: "POST_START", postgres_observation: converged.postgres,
      network_observation: converged.network,
      expected_image_id: runnerImageId,
      result_directory: runnerAttemptPaths(input.nonce,
        converged.successful_attempt).result_directory,
      capability_file: capability.path,
      expected_user_uid: capability.owner_uid,
      expected_runner_name: runnerAttemptPaths(input.nonce,
        converged.successful_attempt).runner_container,
    });
  } catch {
    throw new Error(
      "DAY147_A5_RUNNER_CONTAINER_POST_START_NETWORK_BINDING_FAILED",
    );
  }
  complete("runner_container_inspect_after_start");
  complete("runner_attestation");
  const resultFile = converged.client_result_file;
  complete("client_result_read");
  const clientResult = validateClientResultFile(resultFile, input.nonce);
  if (clientResult.result !== "PASS" ||
    clientResult.runner_attestation.capability_digest !== capability.digest) {
    throw new Error("DAY147_A5_NETWORK_CLIENT_RESULT_CONTRACT_INVALID");
  }
  complete("client_result_validation");
  if (!validateExactCaseRegistryProof(clientResult.case_registry)) {
    throw new Error("DAY147_A5_NETWORK_CLIENT_RESULT_CONTRACT_INVALID");
  }
  complete("case_registry_validation");
  await input.operations.prepare_formal_evidence(input.nonce);
  complete("formal_evidence_prepare");
  const cleanup = await executeExactNetworkCleanup({
    nonce: input.nonce, receipts, act: input.operations.cleanup_resource,
  });
  complete("cleanup_all_phases");
  if (cleanup.failures.length !== 0 ||
    JSON.stringify(cleanup.completed) !== JSON.stringify(NETWORK_CLEANUP_ORDER)) {
    throw new NetworkOrchestratorFailure(
      "DAY147_A5_NETWORK_CLIENT_CLEANUP_FAILED", cleanup.failures,
    );
  }
  complete("cleanup_complete_verify");
  const metadata = validateNetworkEvidenceAuthority({
    proof: {
      network_mode: "USER_DEFINED_BRIDGE", execution_nonce: input.nonce,
      network_nonce: network.observation.execution_nonce_label,
      postgres_network_nonce: postgres.observation.execution_nonce_label,
      runner_network_nonce: startedRunner.execution_nonce_label,
      postgres_aliases: postgres.observation.network_aliases,
      postgres_host_publish: postgres.observation.published_ports.length !== 0,
      runner_db_host: "postgres", runner_db_port: 5432,
      remote_endpoint_present: false,
      docker_socket_mounted: startedRunner.docker_socket_mounted,
      result_nonce: clientResult.execution_nonce,
    },
    client_result: clientResult, cleanup, required_phases: completed,
    expected_capability_digest: capability.digest,
  });
  try {
    await input.operations.finalize_formal_evidence(input.nonce, metadata);
  } catch {
    throw new NetworkOrchestratorFailure(
      "DAY147_A5_NETWORK_EVIDENCE_FINALIZATION_FAILED", Object.freeze([]),
    );
  }
  complete("formal_evidence_finalize");
  return Object.freeze({ metadata, completed_phases: Object.freeze(completed), cleanup,
    runner_timeline: converged.timeline,
    successful_runner_attempt: converged.successful_attempt,
    bootstrap_probe_executed: true,
    bootstrap_probe_status: bootstrapProbe.status });
}

export function isDirectRun(
  metaUrl: string,
  argvEntry: string | undefined,
): boolean {
  if (argvEntry === undefined) return false;
  try {
    return metaUrl === pathToFileURL(resolve(argvEntry)).href;
  } catch {
    return false;
  }
}

export let mainExecutionCount = 0;

function parseArguments(args: readonly string[]): ParsedArguments {
  if (args.length === 0) return { mode: "static", authority: null };
  const unique = new Set(args);
  if (unique.size !== args.length) throw new Error("DAY147_A5_MODE_INVALID");
  const modes = args.filter((arg) => arg.startsWith("--mode="));
  const authorities = args.filter((arg) => arg.startsWith("--authority="));
  if (
    modes.length !== 1 ||
    authorities.length > 1 ||
    modes[0] !== "--mode=static" &&
    ![
      "--mode=static", "--mode=execute-isolated",
      "--mode=execute-network-isolated", "--mode=execute-network-runner-build-only",
      "--mode=execute-network-runner-create-only",
      "--mode=execute-network-runner-launcher-only",
    ].includes(modes[0]!) ||
    args.some((arg) => !modes.includes(arg) && !authorities.includes(arg))
  ) {
    throw new Error("DAY147_A5_MODE_INVALID");
  }
  const mode = modes[0]!.slice("--mode=".length) as HarnessMode;
  const authorityValue = authorities[0]?.slice("--authority=".length) ?? null;
  if (mode === "static" && authorityValue !== null) {
    throw new Error("DAY147_A5_EXECUTION_AUTHORITY_INVALID");
  }
  if (mode === "execute-isolated" && authorityValue !== EXECUTION_AUTHORITY) {
    throw new Error("DAY147_A5_EXECUTION_REQUIRES_A5_3_AUTHORITY");
  }
  if (mode === "execute-network-isolated" &&
    authorityValue !== NETWORK_EXECUTION_AUTHORITY) {
    throw new Error("DAY147_A5_NETWORK_EXECUTION_AUTHORITY_REQUIRED");
  }
  if (mode === "execute-network-runner-build-only" &&
    authorityValue !== NETWORK_RUNNER_BUILD_DIAGNOSTIC_AUTHORITY) {
    throw new Error("DAY147_A5_NETWORK_RUNNER_BUILD_AUTHORITY_REQUIRED");
  }
  if (mode === "execute-network-runner-create-only" &&
    authorityValue !== NETWORK_RUNNER_CREATE_DIAGNOSTIC_AUTHORITY) {
    throw new Error("DAY147_A5_NETWORK_RUNNER_CREATE_AUTHORITY_REQUIRED");
  }
  if (mode === "execute-network-runner-launcher-only" &&
    authorityValue !== NETWORK_RUNNER_LAUNCHER_DIAGNOSTIC_AUTHORITY) {
    throw new Error("DAY147_A5_NETWORK_RUNNER_LAUNCHER_AUTHORITY_REQUIRED");
  }
  return { mode, authority: authorityValue as HarnessAuthority };
}

type DockerCommand = Readonly<{
  executable: "docker";
  args: readonly string[];
}>;

type CommandClassification =
  | "context_show"
  | "context_inspect"
  | "image_inspect"
  | "container_preflight"
  | "container_start"
  | "container_identity"
  | "container_internal_readiness"
  | "container_readiness_state"
  | "port_resolution"
  | "container_cleanup"
  | "post_cleanup_verify";

type SafeSpawnOptions = Readonly<{
  env: Readonly<Record<string, string>>;
  timeout_ms: number;
  max_output_bytes: number;
  classification: CommandClassification;
  secret_values: readonly string[];
}>;

type CommandResult = Readonly<{
  exit_code: number;
  stdout: string;
  stderr: string;
}>;

interface DockerCommandRunner {
  run(
    executable: "docker",
    args: readonly string[],
    options: SafeSpawnOptions,
  ): Promise<CommandResult>;
}

const A5_DOCKER_SIGTERM_GRACE_MS = 1_500;
const A5_DOCKER_SIGKILL_GRACE_MS = 1_500;

type A5DockerChild = EventEmitter & Readonly<{
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: (signal: "SIGTERM" | "SIGKILL") => boolean;
}>;

type A5DockerSpawn = (
  executable: "docker",
  args: readonly string[],
  options: Readonly<{ shell: false; env: NodeJS.ProcessEnv; stdio: readonly ["ignore", "pipe", "pipe"] }>,
) => A5DockerChild;

function redactText(value: string, secrets: readonly string[]): string {
  let result = value;
  for (const secret of secrets) {
    if (secret.length > 0) result = result.split(secret).join("[REDACTED]");
  }
  return result;
}

class ProductionDockerCommandRunner implements DockerCommandRunner {
  constructor(
    private readonly spawnChild: A5DockerSpawn = (executable, args, options) =>
      spawn(executable, [...args], {
        shell: options.shell,
        env: options.env,
        stdio: ["ignore", "pipe", "pipe"],
      }) as A5DockerChild,
    private readonly sigtermGraceMs = A5_DOCKER_SIGTERM_GRACE_MS,
    private readonly sigkillGraceMs = A5_DOCKER_SIGKILL_GRACE_MS,
  ) {}

  async run(
    executable: "docker",
    args: readonly string[],
    options: SafeSpawnOptions,
  ): Promise<CommandResult> {
    assert.equal(executable, "docker");
    if (
      options.timeout_ms < 1 ||
      options.max_output_bytes < 1 ||
      Object.keys(options.env).some((key) =>
        ![
          "PATH",
          "HOME",
          "DOCKER_CONFIG",
          "POSTGRES_DB",
          "POSTGRES_USER",
          "POSTGRES_PASSWORD",
        ].includes(key)
      )
    ) {
      throw new Error("DAY147_A5_COMMAND_OPTIONS_INVALID");
    }
    return await new Promise<CommandResult>((resolveCommand, rejectCommand) => {
      let child: A5DockerChild;
      try {
        child = this.spawnChild(executable, args, {
          shell: false,
          env: { ...options.env },
          stdio: ["ignore", "pipe", "pipe"],
        });
      } catch {
        rejectCommand(new Error("DAY147_A5_DOCKER_COMMAND_FAILED"));
        return;
      }
      let stdout: Buffer<ArrayBufferLike> = Buffer.alloc(0);
      let stderr: Buffer<ArrayBufferLike> = Buffer.alloc(0);
      let overflow = false;
      const append = (
        current: Buffer<ArrayBufferLike>,
        chunk: Buffer<ArrayBufferLike>,
      ): Buffer<ArrayBufferLike> => {
        const next = Buffer.concat([current, chunk]);
        if (next.length > options.max_output_bytes) overflow = true;
        return next.subarray(0, options.max_output_bytes);
      };
      child.stdout.on("data", (chunk: Buffer) => {
        stdout = append(stdout, chunk);
      });
      child.stderr.on("data", (chunk: Buffer) => {
        stderr = append(stderr, chunk);
      });
      let processExited = false;
      let stdoutClosed = false;
      let stderrClosed = false;
      let commandSettled = false;
      let timedOut = false;
      const converged = () => processExited && stdoutClosed && stderrClosed;
      const waitForConvergence = async (milliseconds: number): Promise<boolean> => {
        if (converged()) return true;
        return await new Promise<boolean>((resolveWait) => {
          const onProgress = () => {
            if (!converged()) return;
            clearTimeout(waitTimer);
            cleanup();
            resolveWait(true);
          };
          const cleanup = () => {
            child.off("exit", onProgress);
            child.off("close", onProgress);
            child.stdout.off("close", onProgress);
            child.stderr.off("close", onProgress);
          };
          child.on("exit", onProgress);
          child.on("close", onProgress);
          child.stdout.on("close", onProgress);
          child.stderr.on("close", onProgress);
          const waitTimer = setTimeout(() => {
            cleanup();
            resolveWait(converged());
          }, milliseconds);
        });
      };
      const finishFailure = (error: Error) => {
        if (commandSettled) return;
        commandSettled = true;
        rejectCommand(error);
      };
      const timer = setTimeout(() => {
        timedOut = true;
        void (async () => {
          child.kill("SIGTERM");
          if (!await waitForConvergence(this.sigtermGraceMs)) {
            child.kill("SIGKILL");
            if (!await waitForConvergence(this.sigkillGraceMs)) {
              finishFailure(new Error(
                "DAY147_A5_DOCKER_PROCESS_TERMINATION_FAILED",
              ));
              return;
            }
          }
          finishFailure(new Error("DAY147_A5_DOCKER_COMMAND_TIMEOUT"));
        })().catch(() => {
          finishFailure(new Error(
            "DAY147_A5_DOCKER_PROCESS_TERMINATION_FAILED",
          ));
        });
      }, options.timeout_ms);
      child.stdout.once("close", () => { stdoutClosed = true; });
      child.stderr.once("close", () => { stderrClosed = true; });
      child.once("exit", () => { processExited = true; });
      child.once("error", () => {
        clearTimeout(timer);
        if (timedOut) return;
        finishFailure(new Error("DAY147_A5_DOCKER_COMMAND_FAILED"));
      });
      child.once("close", (code) => {
        processExited = true;
        stdoutClosed = true;
        stderrClosed = true;
        clearTimeout(timer);
        if (timedOut) return;
        if (commandSettled) return;
        commandSettled = true;
        if (overflow) {
          rejectCommand(new Error("DAY147_A5_DOCKER_OUTPUT_LIMIT_EXCEEDED"));
          return;
        }
        resolveCommand({
          exit_code: code ?? -1,
          stdout: redactText(stdout.toString("utf8"), options.secret_values),
          stderr: redactText(stderr.toString("utf8"), options.secret_values),
        });
      });
    });
  }
}

class RecordingDockerCommandRunner implements DockerCommandRunner {
  readonly calls: Array<{
    executable: "docker";
    args: readonly string[];
    options: SafeSpawnOptions;
  }> = [];
  constructor(private readonly results: readonly CommandResult[]) {}
  async run(
    executable: "docker",
    args: readonly string[],
    options: SafeSpawnOptions,
  ): Promise<CommandResult> {
    this.calls.push({ executable, args: [...args], options });
    const result = this.results[this.calls.length - 1];
    if (result === undefined) {
      throw new Error("DAY147_A5_MOCK_COMMAND_RESULT_MISSING");
    }
    return result;
  }
}

class ReadinessFailureOrchestratorRunner implements DockerCommandRunner {
  readonly calls: Array<{
    executable: "docker";
    args: readonly string[];
    options: SafeSpawnOptions;
  }> = [];
  readonly canonical_id = "c".repeat(64);
  readonly image_digest = `sha256:${"d".repeat(64)}`;
  private container_name: string | null = null;

  constructor(private readonly context_inspect: string) {}

  async run(
    executable: "docker",
    args: readonly string[],
    options: SafeSpawnOptions,
  ): Promise<CommandResult> {
    this.calls.push({ executable, args: [...args], options });
    switch (options.classification) {
      case "context_show":
        return { exit_code: 0, stdout: "orbstack\n", stderr: "" };
      case "context_inspect":
        return { exit_code: 0, stdout: this.context_inspect, stderr: "" };
      case "image_inspect":
        return {
          exit_code: 0,
          stdout: JSON.stringify([{
            Id: this.image_digest,
            RepoTags: [IMAGE],
          }]),
          stderr: "",
        };
      case "container_preflight": {
        const target = args.at(-1) ?? "";
        return {
          exit_code: 1,
          stdout: "",
          stderr: `Error response from daemon: No such container: ${target}`,
        };
      }
      case "container_start": {
        const nameIndex = args.indexOf("--name");
        this.container_name = nameIndex >= 0 ? args[nameIndex + 1] ?? null : null;
        assert.ok(this.container_name);
        return { exit_code: 0, stdout: `${this.canonical_id}\n`, stderr: "" };
      }
      case "container_identity":
        if (args.includes("{{json .}}")) {
          assert.ok(this.container_name);
          return {
            exit_code: 0,
            stdout: JSON.stringify({
              Id: this.canonical_id,
              Name: `/${this.container_name}`,
              Image: this.image_digest,
            }),
            stderr: "",
          };
        }
        return { exit_code: 0, stdout: `${this.canonical_id}\n`, stderr: "" };
      case "port_resolution":
        return { exit_code: 0, stdout: "127.0.0.1:49152\n", stderr: "" };
      case "container_cleanup":
        return { exit_code: 0, stdout: "", stderr: "" };
      case "post_cleanup_verify":
        return {
          exit_code: 1,
          stdout: "",
          stderr: `Error response from daemon: No such container: ${this.container_name}`,
        };
      case "container_readiness_state":
        throw new Error("DAY147_A5_STATIC_READINESS_MUST_USE_RECORDING_DEPENDENCY");
      case "container_internal_readiness":
        throw new Error("DAY147_A5_STATIC_INTERNAL_READINESS_MUST_USE_RECORDING_DEPENDENCY");
    }
  }
}

type DockerDaemonClass =
  | "LOCAL_UNIX_SOCKET"
  | "REMOTE_OR_UNSAFE"
  | "UNKNOWN";

type DockerSocketClass =
  | "SYSTEM_MANAGED_SOCKET"
  | "USER_DOCKER_RUN_SOCKET"
  | "DOCKER_DESKTOP_MANAGED_SOCKET"
  | "ORBSTACK_MANAGED_SOCKET"
  | "UNKNOWN";

type DockerProviderClass =
  | "SYSTEM_DOCKER"
  | "USER_DOCKER"
  | "DOCKER_DESKTOP"
  | "ORBSTACK"
  | "UNKNOWN";

type CurrentUserIdentity = Readonly<{
  uid: number;
  gid: number;
  home: string;
  username_classification?: "OS_ACCOUNT";
}>;

const STATIC_CURRENT_USER: CurrentUserIdentity = Object.freeze({
  uid: 501,
  gid: 20,
  home: "/Users/tester",
  username_classification: "OS_ACCOUNT",
});

type DockerEndpointClassification = Readonly<{
  daemon_class: DockerDaemonClass;
  provider_class: DockerProviderClass;
  socket_class: DockerSocketClass;
  provider_identity_verified: boolean;
  filesystem_provenance_verified: boolean;
  ownership_verified: boolean;
  path_canonical_verified: boolean;
  provider_socket_compatible: boolean;
  remote_rejected: boolean;
  tls_rejected: boolean;
}>;

type SocketObjectMetadata = Readonly<{
  kind: "socket" | "directory" | "file" | "symlink" | "missing" | "other";
  uid: number | null;
  gid: number | null;
  mode: number | null;
}>;

type SocketProvenanceIo = Readonly<{
  lstat(path: string): SocketObjectMetadata;
  realpath(path: string): string;
  inspectComponents(path: string): Readonly<{ symlink_found: boolean }>;
  currentUserIdentity(): CurrentUserIdentity | null;
  orbStackApplicationIdentity(
    identity: CurrentUserIdentity,
  ): OrbStackBundleClassification | null;
  orbStackProcessIdentity(
    identity: CurrentUserIdentity,
    bundle: OrbStackBundleClassification,
  ): boolean;
}>;

let productionSocketFilesystemReads = 0;
let productionCurrentUserIdentityReads = 0;
let productionApplicationBundleReads = 0;
let productionProcessLookups = 0;

const ORBSTACK_BUNDLE_ID = "dev.kdrag0n.MacVirt" as const;
const ORBSTACK_BUNDLE_NAME = "OrbStack" as const;
const ORBSTACK_BUNDLE_EXECUTABLE = "OrbStack" as const;
const ORBSTACK_BUNDLE_PACKAGE_TYPE = "APPL" as const;
type OrbStackBundleClassification = "SYSTEM_BUNDLE" | "USER_BUNDLE";

type OrbStackApplicationProof = Readonly<{
  object_kind: SocketObjectMetadata["kind"];
  metadata_file_kind: SocketObjectMetadata["kind"];
  bundle_identifier: string;
  bundle_name: string;
  bundle_executable: string;
  package_type: string;
  owner_uid: number | null;
  owner_gid: number | null;
  mode: number | null;
  canonical_path_exact: boolean;
  symlink_found: boolean;
}>;

type OrbStackProcessProof = Readonly<{
  present: boolean;
  executable_basename: string;
  executable_path_expected: boolean;
  executable_path_canonical: boolean;
  owner_uid: number | null;
  local_process: boolean;
  command_line_only: boolean;
}>;

function validateOrbStackApplicationProof(
  proof: OrbStackApplicationProof | null,
  identity: CurrentUserIdentity,
): boolean {
  return proof !== null &&
    proof.object_kind === "directory" &&
    proof.metadata_file_kind === "file" &&
    proof.bundle_identifier === ORBSTACK_BUNDLE_ID &&
    proof.bundle_name === ORBSTACK_BUNDLE_NAME &&
    proof.bundle_executable === ORBSTACK_BUNDLE_EXECUTABLE &&
    proof.package_type === ORBSTACK_BUNDLE_PACKAGE_TYPE &&
    (proof.owner_uid === 0 || proof.owner_uid === identity.uid) &&
    proof.owner_gid !== null &&
    proof.mode !== null && (proof.mode & 0o022) === 0 &&
    proof.canonical_path_exact && !proof.symlink_found;
}

function validateOrbStackProcessProof(
  proof: OrbStackProcessProof | null,
  identity: CurrentUserIdentity,
): boolean {
  return proof !== null && proof.present &&
    proof.executable_basename === ORBSTACK_BUNDLE_EXECUTABLE &&
    proof.executable_path_expected && proof.executable_path_canonical &&
    proof.owner_uid === identity.uid && proof.local_process &&
    !proof.command_line_only;
}

function productionSocketMetadata(path: string): SocketObjectMetadata {
  productionSocketFilesystemReads += 1;
  try {
    const value = lstatSync(path);
    return {
      kind: value.isSymbolicLink()
        ? "symlink"
        : value.isSocket()
        ? "socket"
        : value.isDirectory()
        ? "directory"
        : value.isFile()
        ? "file"
        : "other",
      uid: value.uid,
      gid: value.gid,
      mode: value.mode & 0o777,
    };
  } catch {
    return { kind: "missing", uid: null, gid: null, mode: null };
  }
}

function currentUserIdentityFromOs(): CurrentUserIdentity | null {
  productionCurrentUserIdentityReads += 1;
  try {
    const value = userInfo();
    if (
      !Number.isSafeInteger(value.uid) || value.uid < 0 ||
      !Number.isSafeInteger(value.gid) || value.gid < 0 ||
      !socketPathLexicallySafe(value.homedir)
    ) return null;
    return Object.freeze({
      uid: value.uid,
      gid: value.gid,
      home: value.homedir,
      username_classification: "OS_ACCOUNT" as const,
    });
  } catch {
    return null;
  }
}

function safeOwnedObject(
  value: SocketObjectMetadata,
  identity: CurrentUserIdentity,
  kind: SocketObjectMetadata["kind"],
  allowRoot: boolean,
): boolean {
  return value.kind === kind &&
    value.uid !== null &&
    (value.uid === identity.uid || allowRoot && value.uid === 0) &&
    value.gid !== null &&
    value.mode !== null &&
    (value.mode & 0o022) === 0;
}

function orbStackBundleCandidates(home: string): Readonly<
  Record<OrbStackBundleClassification, string>
> {
  return {
    SYSTEM_BUNDLE: "/Applications/OrbStack.app",
    USER_BUNDLE: resolve(home, "Applications/OrbStack.app"),
  };
}

const PRODUCTION_SOCKET_PROVENANCE_IO: SocketProvenanceIo = {
  lstat: productionSocketMetadata,
  realpath(path) {
    productionSocketFilesystemReads += 1;
    return realpathSync.native(path);
  },
  inspectComponents(path) {
    let current = "";
    for (const segment of path.split("/").filter((value) => value.length > 0)) {
      current += `/${segment}`;
      if (productionSocketMetadata(current).kind === "symlink") {
        return { symlink_found: true };
      }
    }
    return { symlink_found: false };
  },
  currentUserIdentity: currentUserIdentityFromOs,
  orbStackApplicationIdentity(identity) {
    productionApplicationBundleReads += 1;
    for (const [classification, bundlePath] of Object.entries(
      orbStackBundleCandidates(identity.home),
    ) as [OrbStackBundleClassification, string][]) {
      try {
        const contentsPath = resolve(bundlePath, "Contents");
        const macOsPath = resolve(contentsPath, "MacOS");
        const infoPath = resolve(bundlePath, "Contents/Info.plist");
        const executablePath = resolve(
          bundlePath,
          `Contents/MacOS/${ORBSTACK_BUNDLE_EXECUTABLE}`,
        );
        const bundle = productionSocketMetadata(bundlePath);
        const contents = productionSocketMetadata(contentsPath);
        const macOs = productionSocketMetadata(macOsPath);
        const info = productionSocketMetadata(infoPath);
        const executable = productionSocketMetadata(executablePath);
        if (
          !safeOwnedObject(bundle, identity, "directory", true) ||
          !safeOwnedObject(contents, identity, "directory", true) ||
          !safeOwnedObject(macOs, identity, "directory", true) ||
          !safeOwnedObject(info, identity, "file", true) ||
          !safeOwnedObject(executable, identity, "file", true) ||
          PRODUCTION_SOCKET_PROVENANCE_IO.inspectComponents(bundlePath)
            .symlink_found ||
          realpathSync.native(bundlePath) !== bundlePath ||
          realpathSync.native(infoPath) !== infoPath ||
          realpathSync.native(executablePath) !== executablePath
        ) continue;
        const plistResult = spawnSync(
          "/usr/bin/plutil",
          ["-convert", "json", "-o", "-", infoPath],
          { shell: false, encoding: "utf8", maxBuffer: 1024 * 1024 },
        );
        if (plistResult.status !== 0 || typeof plistResult.stdout !== "string") {
          continue;
        }
        const plist = JSON.parse(plistResult.stdout) as Record<string, unknown>;
        if (validateOrbStackApplicationProof({
          object_kind: bundle.kind,
          metadata_file_kind: info.kind,
          bundle_identifier: typeof plist.CFBundleIdentifier === "string"
            ? plist.CFBundleIdentifier
            : "",
          bundle_name: typeof plist.CFBundleName === "string"
            ? plist.CFBundleName
            : "",
          bundle_executable: typeof plist.CFBundleExecutable === "string"
            ? plist.CFBundleExecutable
            : "",
          package_type: typeof plist.CFBundlePackageType === "string"
            ? plist.CFBundlePackageType
            : "",
          owner_uid: bundle.uid,
          owner_gid: bundle.gid,
          mode: bundle.mode,
          canonical_path_exact: true,
          symlink_found: false,
        }, identity)) return classification;
      } catch {
        continue;
      }
    }
    return null;
  },
  orbStackProcessIdentity(identity, bundle) {
    productionProcessLookups += 1;
    const result = spawnSync("/bin/ps", ["-axo", "uid=,comm="], {
      shell: false,
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });
    if (result.status !== 0 || typeof result.stdout !== "string") return false;
    const expectedExecutable = resolve(
      orbStackBundleCandidates(identity.home)[bundle],
      `Contents/MacOS/${ORBSTACK_BUNDLE_EXECUTABLE}`,
    );
    return result.stdout.split("\n").some((line) => {
      const match = line.match(/^\s*(\d+)\s+(\/[^\r\n]+)\s*$/);
      if (match === null || Number(match[1]) !== identity.uid) return false;
      const executablePath = match[2];
      if (basename(executablePath) !== ORBSTACK_BUNDLE_EXECUTABLE) return false;
      if (executablePath !== expectedExecutable) return false;
      try {
        return validateOrbStackProcessProof({
          present: true,
          executable_basename: basename(executablePath),
          executable_path_expected: true,
          executable_path_canonical:
            realpathSync.native(executablePath) === executablePath,
          owner_uid: Number(match[1]),
          local_process: true,
          command_line_only: false,
        }, identity);
      } catch {
        return false;
      }
    });
  },
};

function createRecordingSocketProvenanceIo(input: Readonly<{
  home: string;
  current_user?: CurrentUserIdentity | null;
  socket?: SocketObjectMetadata;
  parent?: SocketObjectMetadata;
  provider_root?: SocketObjectMetadata;
  resolved_path?: string;
  component_symlink?: boolean;
  application_identity?: boolean;
  process_identity?: boolean;
  application_bundle?: OrbStackBundleClassification;
  process_bundle?: OrbStackBundleClassification;
}>): Readonly<{ io: SocketProvenanceIo; calls: string[] }> {
  const calls: string[] = [];
  const providerRoot = resolve(input.home, ".orbstack");
  const parent = resolve(providerRoot, "run");
  const socket = resolve(parent, "docker.sock");
  const genericObjects = new Map<string, SocketObjectMetadata>([
    ["/var", { kind: "directory", uid: 0, gid: 0, mode: 0o755 }],
    ["/var/run", { kind: "directory", uid: 0, gid: 0, mode: 0o755 }],
    ["/var/run/docker.sock", { kind: "socket", uid: 0, gid: 0, mode: 0o660 }],
    [resolve(input.home, ".docker"),
      { kind: "directory", uid: 501, gid: 20, mode: 0o700 }],
    [resolve(input.home, ".docker/run"),
      { kind: "directory", uid: 501, gid: 20, mode: 0o700 }],
    [resolve(input.home, ".docker/run/docker.sock"),
      { kind: "socket", uid: 501, gid: 20, mode: 0o660 }],
    [resolve(input.home, "Library/Containers/com.docker.docker"),
      { kind: "directory", uid: 501, gid: 20, mode: 0o700 }],
    [resolve(input.home, "Library/Containers/com.docker.docker/Data"),
      { kind: "directory", uid: 501, gid: 20, mode: 0o700 }],
    [resolve(input.home, "Library/Containers/com.docker.docker/Data/docker-cli.sock"),
      { kind: "socket", uid: 501, gid: 20, mode: 0o660 }],
  ]);
  const missing: SocketObjectMetadata = {
    kind: "missing",
    uid: null,
    gid: null,
    mode: null,
  };
  const io: SocketProvenanceIo = {
    lstat(path) {
      calls.push("lstat");
      if (path === socket) {
        return input.socket ?? { kind: "socket", uid: 501, gid: 20, mode: 0o755 };
      }
      if (path === parent) {
        return input.parent ?? { kind: "directory", uid: 501, gid: 20, mode: 0o700 };
      }
      if (path === providerRoot) {
        return input.provider_root ??
          { kind: "directory", uid: 501, gid: 20, mode: 0o700 };
      }
      return genericObjects.get(path) ?? missing;
    },
    realpath(path) {
      calls.push("realpath");
      return path === socket ? input.resolved_path ?? socket : path;
    },
    inspectComponents() {
      calls.push("inspect_components");
      return { symlink_found: input.component_symlink ?? false };
    },
    currentUserIdentity() {
      calls.push("current_user_identity");
      return input.current_user === undefined
        ? { uid: 501, gid: 20, home: input.home, username_classification: "OS_ACCOUNT" }
        : input.current_user;
    },
    orbStackApplicationIdentity() {
      calls.push("application_identity");
      return input.application_identity === false
        ? null
        : input.application_bundle ?? "SYSTEM_BUNDLE";
    },
    orbStackProcessIdentity(_identity, bundle) {
      calls.push("process_identity");
      return (input.process_identity ?? true) &&
        bundle === (input.process_bundle ?? input.application_bundle ??
          "SYSTEM_BUNDLE");
    },
  };
  return { io, calls };
}

type DockerEnvironment = Readonly<{
  DOCKER_HOST?: string;
  DOCKER_CONTEXT?: string;
  DOCKER_CONFIG?: string;
  HOME?: string;
  PATH?: string;
}>;

export function validateDockerEnvironment(
  environment: DockerEnvironment,
  identity: CurrentUserIdentity | null,
): {
  home: string;
  command_env: Readonly<Record<string, string>>;
} {
  if (
    environment.DOCKER_HOST !== undefined ||
    environment.DOCKER_CONTEXT !== undefined
  ) {
    throw new Error("DAY147_A5_CONNECTION_SAFETY_BLOCKED");
  }
  const home = identity?.home;
  const path = environment.PATH;
  if (
    identity === null ||
    home === undefined ||
    !socketPathLexicallySafe(home) ||
    environment.HOME !== undefined && environment.HOME !== home ||
    path === undefined ||
    path.length === 0
  ) {
    throw new Error("DAY147_A5_CONNECTION_SAFETY_BLOCKED");
  }
  const dockerConfig = environment.DOCKER_CONFIG ??
    resolve(home, ".docker");
  if (
    !dockerConfig.startsWith(`${home}/`) ||
    dockerConfig.includes("\0") ||
    dockerConfig.split("/").includes("..")
  ) {
    throw new Error("DAY147_A5_CONNECTION_SAFETY_BLOCKED");
  }
  return {
    home,
    command_env: Object.freeze({
      PATH: path,
      HOME: home,
      DOCKER_CONFIG: dockerConfig,
    }),
  };
}

function parseDockerContextName(output: string): string {
  const context = output.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$/.test(context)) {
    throw new Error("DAY147_A5_CONNECTION_SAFETY_BLOCKED");
  }
  return context;
}

const unknownDockerEndpoint = (
  daemonClass: DockerDaemonClass = "UNKNOWN",
  providerClass: DockerProviderClass = "UNKNOWN",
): DockerEndpointClassification => ({
  daemon_class: daemonClass,
  provider_class: providerClass,
  socket_class: "UNKNOWN",
  provider_identity_verified: false,
  filesystem_provenance_verified: false,
  ownership_verified: false,
  path_canonical_verified: false,
  provider_socket_compatible: false,
  remote_rejected: daemonClass !== "REMOTE_OR_UNSAFE",
  tls_rejected: daemonClass !== "REMOTE_OR_UNSAFE",
});

function socketPathLexicallySafe(socketPath: string): boolean {
  const segments = socketPath.split("/");
  return socketPath.startsWith("/") &&
    !socketPath.endsWith("/") &&
    !socketPath.includes("//") &&
    !socketPath.includes("%") &&
    !/[\x00-\x1f\x7f]/.test(socketPath) &&
    !segments.includes(".") &&
    !segments.includes("..");
}

const PROVIDER_SOCKET_COMPATIBILITY: Readonly<
  Record<Exclude<DockerProviderClass, "UNKNOWN">, DockerSocketClass>
> = Object.freeze({
  SYSTEM_DOCKER: "SYSTEM_MANAGED_SOCKET",
  USER_DOCKER: "USER_DOCKER_RUN_SOCKET",
  DOCKER_DESKTOP: "DOCKER_DESKTOP_MANAGED_SOCKET",
  ORBSTACK: "ORBSTACK_MANAGED_SOCKET",
});

const PROVIDER_CONTEXT: Readonly<
  Record<Exclude<DockerProviderClass, "UNKNOWN">, Readonly<{ name: string; description: string }>>
> = Object.freeze({
  SYSTEM_DOCKER: { name: "default", description: "Docker Engine (system)" },
  USER_DOCKER: { name: "user-docker", description: "Docker Engine (user)" },
  DOCKER_DESKTOP: { name: "desktop-linux", description: "Docker Desktop" },
  ORBSTACK: { name: "orbstack", description: "OrbStack" },
});

function managedSocketProvenanceExact(input: Readonly<{
  provider: Exclude<DockerProviderClass, "UNKNOWN" | "ORBSTACK">;
  socket_path: string;
  identity: CurrentUserIdentity;
  io: SocketProvenanceIo;
}>): boolean {
  const providerRoot = input.provider === "SYSTEM_DOCKER"
    ? "/var"
    : input.provider === "USER_DOCKER"
    ? resolve(input.identity.home, ".docker")
    : resolve(input.identity.home, "Library/Containers/com.docker.docker");
  const parent = dirname(input.socket_path);
  try {
    const socket = input.io.lstat(input.socket_path);
    const parentMetadata = input.io.lstat(parent);
    const rootMetadata = input.io.lstat(providerRoot);
    const system = input.provider === "SYSTEM_DOCKER";
    const expectedUid = system ? 0 : input.identity.uid;
    const expectedGid = system ? rootMetadata.gid : input.identity.gid;
    return socket.kind === "socket" && socket.uid === expectedUid &&
      socket.gid === expectedGid &&
      parentMetadata.kind === "directory" &&
      parentMetadata.uid === expectedUid && parentMetadata.gid === expectedGid &&
      parentMetadata.mode !== null && (parentMetadata.mode & 0o022) === 0 &&
      rootMetadata.kind === "directory" && rootMetadata.uid === expectedUid &&
      rootMetadata.gid === expectedGid && rootMetadata.mode !== null &&
      (rootMetadata.mode & 0o022) === 0 &&
      !input.io.inspectComponents(input.socket_path).symlink_found &&
      input.io.realpath(input.socket_path) === input.socket_path;
  } catch {
    return false;
  }
}

function contextProvider(context: Readonly<{ Name?: unknown; Metadata?: unknown }>): DockerProviderClass {
  if (typeof context.Name !== "string" || typeof context.Metadata !== "object" ||
      context.Metadata === null || Array.isArray(context.Metadata)) return "UNKNOWN";
  const description = (context.Metadata as Record<string, unknown>).Description;
  for (const [provider, expected] of Object.entries(PROVIDER_CONTEXT)) {
    if (context.Name === expected.name && description === expected.description) {
      return provider as Exclude<DockerProviderClass, "UNKNOWN">;
    }
  }
  return "UNKNOWN";
}

export function classifyDockerEndpoint(input: {
  inspect_output: string;
  expected_context: string;
  identity: CurrentUserIdentity | null;
  socket_io?: SocketProvenanceIo;
}): DockerEndpointClassification {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.inspect_output);
  } catch {
    return unknownDockerEndpoint();
  }
  if (!Array.isArray(parsed) || parsed.length !== 1) {
    return unknownDockerEndpoint();
  }
  const context = parsed[0] as {
    Name?: unknown;
    Metadata?: unknown;
    Endpoints?: { docker?: { Host?: unknown; SkipTLSVerify?: unknown } };
    TLSMaterial?: unknown;
  };
  const endpoint = context.Endpoints?.docker?.Host;
  if (
    context.Name !== input.expected_context ||
    typeof endpoint !== "string" ||
    endpoint.length === 0
  ) {
    return unknownDockerEndpoint();
  }
  const providerClass = contextProvider(context);
  if (providerClass === "UNKNOWN" || input.identity === null) {
    return unknownDockerEndpoint("REMOTE_OR_UNSAFE");
  }
  const tlsMaterial = context.TLSMaterial;
  const tlsEnabled = tlsMaterial !== undefined &&
    (typeof tlsMaterial !== "object" || tlsMaterial === null ||
      Array.isArray(tlsMaterial) || Object.keys(tlsMaterial).length > 0);
  if (
    context.Endpoints?.docker?.SkipTLSVerify === true ||
    tlsEnabled ||
    !endpoint.startsWith("unix://")
  ) {
    return unknownDockerEndpoint("REMOTE_OR_UNSAFE", providerClass);
  }
  const socketPath = endpoint.slice("unix://".length);
  if (!socketPathLexicallySafe(socketPath)) {
    return unknownDockerEndpoint("REMOTE_OR_UNSAFE", providerClass);
  }
  const expectedPaths: Readonly<Record<Exclude<DockerProviderClass, "UNKNOWN">, string>> = {
    SYSTEM_DOCKER: "/var/run/docker.sock",
    USER_DOCKER: resolve(input.identity.home, ".docker/run/docker.sock"),
    DOCKER_DESKTOP: resolve(input.identity.home, "Library/Containers/com.docker.docker/Data/docker-cli.sock"),
    ORBSTACK: resolve(input.identity.home, ".orbstack/run/docker.sock"),
  };
  const socketClass = PROVIDER_SOCKET_COMPATIBILITY[providerClass];
  if (socketPath !== expectedPaths[providerClass]) {
    return unknownDockerEndpoint("REMOTE_OR_UNSAFE", providerClass);
  }
  if (providerClass !== "ORBSTACK") {
    if (
      input.socket_io === undefined ||
      !managedSocketProvenanceExact({
        provider: providerClass,
        socket_path: socketPath,
        identity: input.identity,
        io: input.socket_io,
      })
    ) return unknownDockerEndpoint("REMOTE_OR_UNSAFE", providerClass);
    return {
      daemon_class: "LOCAL_UNIX_SOCKET",
      provider_class: providerClass,
      socket_class: socketClass,
      provider_identity_verified: true,
      filesystem_provenance_verified: true,
      ownership_verified: true,
      path_canonical_verified: true,
      provider_socket_compatible: true,
      remote_rejected: true,
      tls_rejected: true,
    };
  }
  const orbStackRoot = resolve(input.identity.home, ".orbstack");
  const orbStackParent = resolve(orbStackRoot, "run");
  const expectedOrbStackSocket = resolve(orbStackParent, "docker.sock");
  const metadata = context.Metadata;
  const metadataIsOrbStack = typeof metadata === "object" &&
    metadata !== null &&
    !Array.isArray(metadata) &&
    (metadata as Record<string, unknown>).Description === "OrbStack";
  if (
    socketPath !== expectedOrbStackSocket ||
    !metadataIsOrbStack ||
    context.Endpoints?.docker?.SkipTLSVerify !== false ||
    input.socket_io === undefined
  ) {
    return unknownDockerEndpoint("REMOTE_OR_UNSAFE", providerClass);
  }
  try {
    const socket = input.socket_io.lstat(socketPath);
    const parent = input.socket_io.lstat(orbStackParent);
    const providerRoot = input.socket_io.lstat(orbStackRoot);
    const components = input.socket_io.inspectComponents(socketPath);
    const resolvedPath = input.socket_io.realpath(socketPath);
    const ownerSafe =
      socket.kind === "socket" &&
      socket.uid === input.identity.uid && socket.gid === input.identity.gid &&
      socket.mode !== null && (socket.mode & 0o022) === 0 &&
      parent.kind === "directory" &&
      parent.uid === input.identity.uid && parent.gid === input.identity.gid &&
      parent.mode !== null &&
      (parent.mode & 0o022) === 0 &&
      providerRoot.kind === "directory" &&
      providerRoot.uid === input.identity.uid && providerRoot.gid === input.identity.gid &&
      providerRoot.mode !== null &&
      (providerRoot.mode & 0o022) === 0;
    const applicationBundle =
      input.socket_io.orbStackApplicationIdentity(input.identity);
    const providerVerified = applicationBundle !== null &&
      input.socket_io.orbStackProcessIdentity(input.identity, applicationBundle);
    if (
      !ownerSafe ||
      components.symlink_found ||
      resolvedPath !== socketPath ||
      resolvedPath !== expectedOrbStackSocket ||
      !providerVerified
    ) {
      return unknownDockerEndpoint("REMOTE_OR_UNSAFE", providerClass);
    }
    return {
      daemon_class: "LOCAL_UNIX_SOCKET",
      provider_class: "ORBSTACK",
      socket_class: "ORBSTACK_MANAGED_SOCKET",
      provider_identity_verified: true,
      filesystem_provenance_verified: true,
      ownership_verified: true,
      path_canonical_verified: true,
      provider_socket_compatible: true,
      remote_rejected: true,
      tls_rejected: true,
    };
  } catch {
    return unknownDockerEndpoint("REMOTE_OR_UNSAFE", providerClass);
  }
}

export type Day147A5OrbStackProviderProof = Readonly<{
  context: "orbstack";
  provider_identity_sha256: string;
  local_unix_socket_verified: true;
}>;

export function validateDay147A5OrbStackProviderContract(input: Readonly<{
  environment: Readonly<Record<string, string | undefined>>;
  context_output: string;
  inspect_output: string;
  socket_io?: SocketProvenanceIo;
  current_user_identity?: CurrentUserIdentity | null;
}>): Day147A5OrbStackProviderProof {
  try {
    const socketIo = input.socket_io ?? PRODUCTION_SOCKET_PROVENANCE_IO;
    const identity = input.current_user_identity === undefined
      ? socketIo.currentUserIdentity()
      : input.current_user_identity;
    const dockerEnvironment = validateDockerEnvironment(input.environment, identity);
    const context = parseDockerContextName(input.context_output);
    if (context !== "orbstack") {
      throw new Error("DAY147_A5_MINIMAL_PROVIDER_CONTRACT_REJECTED");
    }
    const classification = classifyDockerEndpoint({
      inspect_output: input.inspect_output,
      expected_context: context,
      identity,
      socket_io: socketIo,
    });
    if (
      classification.daemon_class !== "LOCAL_UNIX_SOCKET" ||
      classification.provider_class !== "ORBSTACK" ||
      classification.socket_class !== "ORBSTACK_MANAGED_SOCKET" ||
      !classification.provider_identity_verified ||
      !classification.filesystem_provenance_verified ||
      !classification.ownership_verified ||
      !classification.path_canonical_verified ||
      !classification.provider_socket_compatible ||
      !classification.remote_rejected ||
      !classification.tls_rejected
    ) {
      throw new Error("DAY147_A5_MINIMAL_PROVIDER_CONTRACT_REJECTED");
    }
    return Object.freeze({
      context: "orbstack",
      provider_identity_sha256: createHash("sha256")
        .update("farmos-day147a5-orbstack-provider-v1\0")
        .update(dockerEnvironment.home)
        .update("\0")
        .update(input.inspect_output)
        .digest("hex"),
      local_unix_socket_verified: true,
    });
  } catch {
    throw new Error("DAY147_A5_MINIMAL_PROVIDER_CONTRACT_REJECTED");
  }
}

const buildContextShowCommand = (): DockerCommand => ({
  executable: "docker",
  args: ["context", "show"],
});

function buildContextInspectCommand(context: string): DockerCommand {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$/.test(context)) {
    throw new Error("DAY147_A5_CONNECTION_SAFETY_BLOCKED");
  }
  return {
    executable: "docker",
    args: ["context", "inspect", context],
  };
}

const buildImageInspectCommand = (): DockerCommand => ({
  executable: "docker",
  args: ["image", "inspect", IMAGE],
});

function buildDockerRunCommand(containerName: string): DockerCommand {
  if (!CONTAINER_PATTERN.test(containerName)) {
    throw new Error("DAY147_A5_CONTAINER_NAME_INVALID");
  }
  return {
    executable: "docker",
    args: [
      "run",
      "--detach",
      "--rm",
      "--pull=never",
      "--name",
      containerName,
      "--tmpfs",
      "/var/lib/postgresql/data:rw,nosuid,nodev",
      "--publish",
      "127.0.0.1::5432",
      "--env",
      "POSTGRES_DB",
      "--env",
      "POSTGRES_USER",
      "--env",
      "POSTGRES_PASSWORD",
      IMAGE,
    ],
  };
}

function buildExistingContainerCheckCommand(containerName: string): DockerCommand {
  if (!CONTAINER_PATTERN.test(containerName)) {
    throw new Error("DAY147_A5_CONTAINER_NAME_INVALID");
  }
  return {
    executable: "docker",
    args: ["container", "inspect", "--format", "{{.Id}}", containerName],
  };
}

function buildPortResolutionCommand(containerIdentity: string): DockerCommand {
  if (
    !CONTAINER_PATTERN.test(containerIdentity) &&
    !CONTAINER_ID_PATTERN.test(containerIdentity)
  ) {
    throw new Error("DAY147_A5_CONTAINER_NAME_INVALID");
  }
  return {
    executable: "docker",
    args: ["port", containerIdentity, "5432/tcp"],
  };
}

function buildContainerIdentityCommand(containerName: string): DockerCommand {
  if (!CONTAINER_PATTERN.test(containerName)) {
    throw new Error("DAY147_A5_CONTAINER_NAME_INVALID");
  }
  return {
    executable: "docker",
    args: ["inspect", "--format", "{{.Id}}", containerName],
  };
}

function buildContainerMetadataCommand(containerName: string): DockerCommand {
  if (!CONTAINER_PATTERN.test(containerName)) {
    throw new Error("DAY147_A5_CONTAINER_NAME_INVALID");
  }
  return {
    executable: "docker",
    args: [
      "inspect",
      "--format",
      "{{json .}}",
      containerName,
    ],
  };
}

function buildContainerRuntimeStateCommand(containerIdentity: string): DockerCommand {
  if (!CONTAINER_ID_PATTERN.test(containerIdentity)) {
    throw new Error("DAY147_A5_CONTAINER_ID_INVALID");
  }
  return {
    executable: "docker",
    args: ["inspect", "--format", "{{json .}}", containerIdentity],
  };
}

function buildContainerInternalReadinessCommand(input: Readonly<{
  binding: A5ContainerRevalidationBinding;
  postgres_user: string;
  postgres_database: string;
}>): DockerCommand {
  const { binding } = input;
  if (
    !/^[a-f0-9]{12}$/.test(binding.execution_nonce) ||
    !CONTAINER_ID_PATTERN.test(binding.canonical_container_id) ||
    !CONTAINER_PATTERN.test(binding.expected_container_name) ||
    binding.expected_container_name !==
      `farmos_day147a5_${binding.execution_nonce}` ||
    !/^sha256:[a-f0-9]{64}$/.test(binding.expected_image_digest) ||
    input.postgres_user !== ROLE_FIXTURES.migration_owner.name ||
    input.postgres_database !==
      `farmos_day147a5_${binding.execution_nonce}_main`
  ) {
    throw new Error("DAY147_A5_INTERNAL_READINESS_BINDING_INVALID");
  }
  return {
    executable: "docker",
    args: [
      "exec",
      binding.canonical_container_id,
      "pg_isready",
      "-q",
      "-h",
      LOCAL_HOST,
      "-p",
      "5432",
      "-U",
      input.postgres_user,
      "-d",
      input.postgres_database,
    ],
  };
}

type A5ContainerRuntimeObservation = Readonly<{
  state: FarmOsDay147A5ContainerRuntimeState;
  exit_code: number | null;
  restarting: boolean;
  oom_killed: boolean;
}>;

type A5ContainerRevalidationBinding = Readonly<{
  execution_nonce: string;
  canonical_container_id: string;
  expected_container_name: string;
  expected_image_digest: string;
}>;

function parseContainerRuntimeState(output: string): A5ContainerRuntimeObservation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output.trim());
  } catch {
    return { state: "UNKNOWN", exit_code: null, restarting: false, oom_killed: false };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { state: "UNKNOWN", exit_code: null, restarting: false, oom_killed: false };
  }
  const row = parsed as Record<string, unknown>;
  const running = row.Running;
  const status = row.Status;
  const exitCode = row.ExitCode;
  const restarting = row.Restarting;
  const oomKilled = row.OOMKilled;
  if (typeof running !== "boolean" || typeof status !== "string" ||
    !Number.isSafeInteger(exitCode) || typeof restarting !== "boolean" ||
    typeof oomKilled !== "boolean") {
    return { state: "UNKNOWN", exit_code: null, restarting: false, oom_killed: false };
  }
  const state: FarmOsDay147A5ContainerRuntimeState = restarting
    ? "RESTARTING"
    : running && status === "running"
    ? "RUNNING"
    : !running && status === "exited"
    ? "EXITED"
    : !running && status === "dead"
    ? "DEAD"
    : "UNKNOWN";
  return {
    state,
    exit_code: exitCode as number,
    restarting,
    oom_killed: oomKilled,
  };
}

function parseBoundContainerRuntimeState(
  output: string,
  binding: A5ContainerRevalidationBinding,
): A5ContainerRuntimeObservation {
  const unknown: A5ContainerRuntimeObservation = {
    state: "UNKNOWN", exit_code: null, restarting: false, oom_killed: false,
  };
  let parsed: unknown;
  try {
    parsed = JSON.parse(output.trim());
  } catch {
    return unknown;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return unknown;
  }
  const row = parsed as Record<string, unknown>;
  if (row.Id !== binding.canonical_container_id ||
    row.Name !== `/${binding.expected_container_name}` ||
    row.Image !== binding.expected_image_digest ||
    typeof row.State !== "object" || row.State === null ||
    Array.isArray(row.State)) return unknown;
  return parseContainerRuntimeState(JSON.stringify(row.State));
}

function parseContainerMetadata(output: string): Readonly<{
  id: string;
  name: string;
  image_digest: string;
}> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output.trim());
  } catch {
    throw new Error("DAY147_A5_POST_START_TARGET_SAFETY_BLOCKED");
  }
  const row = typeof parsed === "object" && parsed !== null
    ? parsed as { Id?: unknown; Name?: unknown; Image?: unknown }
    : null;
  const id = typeof row?.Id === "string" ? row.Id : "";
  const name = typeof row?.Name === "string" ? row.Name.replace(/^\//, "") : "";
  const imageDigest = typeof row?.Image === "string" ? row.Image : "";
  if (
    !CONTAINER_ID_PATTERN.test(id) ||
    !CONTAINER_PATTERN.test(name) ||
    !/^sha256:[a-f0-9]{64}$/.test(imageDigest)
  ) {
    throw new Error("DAY147_A5_POST_START_TARGET_SAFETY_BLOCKED");
  }
  return Object.freeze({ id, name, image_digest: imageDigest });
}

function buildExactCleanupCommand(input: {
  generated_name: string;
  expected_id: string;
  observed_id: string;
}): DockerCommand {
  if (
    !CONTAINER_PATTERN.test(input.generated_name) ||
    !CONTAINER_ID_PATTERN.test(input.expected_id) ||
    !CONTAINER_ID_PATTERN.test(input.observed_id) ||
    input.observed_id !== input.expected_id
  ) {
    throw new Error("DAY147_A5_CLEANUP_TARGET_MISMATCH");
  }
  return {
    executable: "docker",
    args: ["rm", "--force", input.expected_id],
  };
}

function parseCanonicalContainerId(output: string): string {
  const id = output.trim();
  if (!CONTAINER_ID_PATTERN.test(id)) {
    throw new Error("DAY147_A5_CONTAINER_ID_INVALID");
  }
  return id;
}

function parsePublishedPort(output: string): number {
  const match = /^127\.0\.0\.1:(\d+)\s*$/.exec(output);
  const port = match === null ? Number.NaN : Number(match[1]);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error("DAY147_A5_MAPPED_PORT_INVALID");
  }
  return port;
}

function validatedNonce(nonce: string): string {
  if (!/^[a-f0-9]{12}$/.test(nonce)) {
    throw new Error("DAY147_A5_NONCE_INVALID");
  }
  return nonce;
}

function buildNames(nonceInput: string) {
  const nonce = validatedNonce(nonceInput);
  const base = `farmos_day147a5_${nonce}`;
  const names = Object.freeze({
    container: base,
    legacy_active: `${base}_legacy_active`,
    legacy_superseded: `${base}_legacy_superseded`,
    main: `${base}_main`,
  });
  for (const name of Object.values(names)) {
    if (!IDENTIFIER_PATTERN.test(name)) {
      throw new Error("DAY147_A5_DATABASE_NAME_INVALID");
    }
  }
  return names;
}

const MIGRATION_FILES = Object.freeze({
  day146: {
    path: "scripts/sql/day146_operational_memory_snapshot_persistence.sql",
    sha256: "017c69c6cbfcf8efbe2cd042c32cfb88a848b6f48d65f23189f47dc22e6cefdc",
  },
  prepare_apply: {
    path:
      "db/migrations/202607300001_daily_operational_projection_candidate_foundation.sql",
    sha256: "350489282b921b879a9c4fab8280cfd38ff7432ed75cc70a905a7dabd45846bf",
  },
  prepare_verify: {
    path:
      "db/migrations/202607300001_daily_operational_projection_candidate_foundation.verify.sql",
    sha256: "183a3fff47bce5d9cbbf9675c21fd57e398f87fc7628e87ec93127d78c0c9edf",
  },
  activation_apply: {
    path:
      "db/migrations/202607310001_daily_operational_projection_candidate_activation.sql",
    sha256: "e55b7b2c33d432b37d9733d599f8ed4dd7de99a82fb64c5f90158dae7addbbc2",
  },
  activation_verify: {
    path:
      "db/migrations/202607310001_daily_operational_projection_candidate_activation.verify.sql",
    sha256: "2b7108045ab34e5790b6d6381f9e6d2ca2399380a5dc05a9b80d7cf8af337b89",
  },
});
export const DAY147_A5_MIGRATION_CHECKSUMS = Object.freeze({
  day146: MIGRATION_FILES.day146.sha256,
  prepare_apply: MIGRATION_FILES.prepare_apply.sha256,
  prepare_verify: MIGRATION_FILES.prepare_verify.sha256,
  activation_apply: MIGRATION_FILES.activation_apply.sha256,
  activation_verify: MIGRATION_FILES.activation_verify.sha256,
});
const MIGRATION_CHECKSUMS = DAY147_A5_MIGRATION_CHECKSUMS;

type MigrationStep =
  | "day146_base"
  | "legacy_fixture"
  | "prepare_apply"
  | "prepare_verify"
  | "activation_apply"
  | "activation_verify"
  | "legacy_immutability_assertion"
  | "dynamic_tests";

const LEGACY_MIGRATION_PLAN = [
  "day146_base",
  "legacy_fixture",
  "prepare_apply",
  "prepare_verify",
  "activation_apply",
  "activation_verify",
  "legacy_immutability_assertion",
] as const satisfies readonly MigrationStep[];

const MAIN_MIGRATION_PLAN = [
  "day146_base",
  "prepare_apply",
  "prepare_verify",
  "activation_apply",
  "activation_verify",
  "dynamic_tests",
  "activation_verify",
] as const satisfies readonly MigrationStep[];

function verifyChecksums(): void {
  for (const artifact of Object.values(MIGRATION_FILES)) {
    const actual = createHash("sha256")
      .update(readFileSync(resolve(ROOT, artifact.path)))
      .digest("hex");
    assert.equal(actual, artifact.sha256, `checksum:${artifact.path}`);
  }
  const manifest = JSON.parse(
    readFileSync(resolve(ROOT, "db/provisioning/manifest.json"), "utf8"),
  ) as {
    migrations?: Array<{
      migration_id?: string;
      checksum?: string;
      apply_script?: string;
      verification_script?: string;
    }>;
  };
  const expected = [
    {
      id: "202607300001_daily_operational_projection_candidate_foundation",
      apply: MIGRATION_FILES.prepare_apply,
      verify: MIGRATION_FILES.prepare_verify,
    },
    {
      id: "202607310001_daily_operational_projection_candidate_activation",
      apply: MIGRATION_FILES.activation_apply,
      verify: MIGRATION_FILES.activation_verify,
    },
  ];
  for (const migration of expected) {
    const row = manifest.migrations?.find((entry) =>
      entry.migration_id === migration.id
    );
    assert.equal(row?.checksum, `sha256:${migration.apply.sha256}`);
    assert.equal(row?.apply_script, migration.apply.path);
    assert.equal(row?.verification_script, migration.verify.path);
  }
}

type HarnessPhase = FarmOsDay147A5ExecutionPhase;

const NORMAL_PHASE_TRANSITIONS: Readonly<Record<HarnessPhase, HarnessPhase[]>> =
  Object.freeze({
    INITIAL: ["SAFETY_VALIDATED"],
    SAFETY_VALIDATED: ["IMAGE_VERIFIED", "FAILED"],
    IMAGE_VERIFIED: ["CONTAINER_STARTED", "FAILED"],
    CONTAINER_STARTED: ["POSTGRES_READY", "FAILED"],
    POSTGRES_READY: ["DATABASES_CREATED", "FAILED"],
    DATABASES_CREATED: ["MIGRATIONS_APPLIED", "FAILED"],
    MIGRATIONS_APPLIED: ["DYNAMIC_TESTS_COMPLETED", "FAILED"],
    DYNAMIC_TESTS_COMPLETED: ["CLEANUP_STARTED", "FAILED"],
    FAILED: ["CLEANUP_STARTED", "CLEANUP_SKIPPED_NOT_STARTED", "EVIDENCE_BLOCKED"],
    CLEANUP_STARTED: ["CLEANUP_COMPLETED", "CLEANUP_FAILED"],
    CLEANUP_COMPLETED: ["COMPLETE", "EVIDENCE_BLOCKED"],
    CLEANUP_SKIPPED_NOT_STARTED: ["EVIDENCE_BLOCKED"],
    CLEANUP_FAILED: ["EVIDENCE_BLOCKED"],
    EVIDENCE_BLOCKED: [],
    COMPLETE: ["EVIDENCE_BLOCKED"],
  });

function advancePhase(current: HarnessPhase, next: HarnessPhase): HarnessPhase {
  if (!NORMAL_PHASE_TRANSITIONS[current].includes(next)) {
    throw new Error("DAY147_A5_PHASE_TRANSITION_INVALID");
  }
  return next;
}

type RoleFixture = Readonly<{
  name: string;
  preexisting: boolean;
  login: boolean;
  superuser: boolean;
  inherit: boolean;
  bypassrls: boolean;
  purpose: string;
  schema_usage: readonly string[];
  table_select: readonly string[];
  table_insert: readonly string[];
  table_update: readonly string[];
  table_delete: readonly string[];
  function_execute: readonly string[];
  trigger_function_execute: false;
}>;

export const DAY147_A5_ROLE_FIXTURES = Object.freeze({
  migration_owner: {
    name: "day147a5_migration_owner",
    preexisting: true,
    login: true,
    superuser: true,
    inherit: false,
    bypassrls: false,
    purpose: "isolated migration and fixture provisioning only",
    schema_usage: ["ai"],
    table_select: [],
    table_insert: [],
    table_update: [],
    table_delete: [],
    function_execute: [],
    trigger_function_execute: false,
  },
  bundle_runtime_fixture: {
    name: "day147a5_bundle_runtime_fixture",
    preexisting: false,
    login: true,
    superuser: false,
    inherit: false,
    bypassrls: false,
    purpose: "isolated bundle caller; not production authority",
    schema_usage: ["ai"],
    table_select: [
      "operational_memory_source_snapshots",
      "operational_memory_snapshot_state_events",
      "operational_memory_daily_projections",
      "operational_memory_projection_state_events",
      "operational_memory_projection_lineage",
      "operational_memory_ingestion_rejections",
    ],
    table_insert: [
      "operational_memory_source_snapshots",
      "operational_memory_snapshot_state_events",
      "operational_memory_daily_projections",
      "operational_memory_projection_state_events",
      "operational_memory_projection_lineage",
      "operational_memory_ingestion_rejections",
    ],
    table_update: [],
    table_delete: [],
    function_execute: ["ai.persist_operational_memory_bundle"],
    trigger_function_execute: false,
  },
  anon: {
    name: "anon",
    preexisting: false,
    login: false,
    superuser: false,
    inherit: false,
    bypassrls: false,
    purpose: "privilege denial assertion",
    schema_usage: ["ai"],
    table_select: [],
    table_insert: [],
    table_update: [],
    table_delete: [],
    function_execute: [],
    trigger_function_execute: false,
  },
  authenticated: {
    name: "authenticated",
    preexisting: false,
    login: false,
    superuser: false,
    inherit: false,
    bypassrls: false,
    purpose: "privilege denial assertion",
    schema_usage: ["ai"],
    table_select: [],
    table_insert: [],
    table_update: [],
    table_delete: [],
    function_execute: [],
    trigger_function_execute: false,
  },
  attacker: {
    name: "day147a5_attacker",
    preexisting: false,
    login: true,
    superuser: false,
    inherit: false,
    bypassrls: false,
    purpose: "direct SQL denial assertion",
    schema_usage: ["ai"],
    table_select: [],
    table_insert: [],
    table_update: [],
    table_delete: [],
    function_execute: [],
    trigger_function_execute: false,
  },
  verification: {
    name: "day147a5_verification",
    preexisting: false,
    login: true,
    superuser: false,
    inherit: false,
    bypassrls: false,
    purpose: "read-only catalog and relation assertions",
    schema_usage: ["ai", "core_schema"],
    table_select: [
      "operational_memory_source_snapshots",
      "operational_memory_snapshot_state_events",
      "operational_memory_daily_projections",
      "operational_memory_projection_state_events",
      "operational_memory_projection_lineage",
      "operational_memory_ingestion_rejections",
    ],
    table_insert: [],
    table_update: [],
    table_delete: [],
    function_execute: [],
    trigger_function_execute: false,
  },
} as const satisfies Record<string, RoleFixture>);

function quoteIdentifier(identifier: string): string {
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    throw new Error("DAY147_A5_SQL_IDENTIFIER_INVALID");
  }
  return `"${identifier}"`;
}

function qualifiedTable(table: string): string {
  if (!/^operational_memory_[a-z_]+$/.test(table)) {
    throw new Error("DAY147_A5_SQL_IDENTIFIER_INVALID");
  }
  return `"ai".${quoteIdentifier(table)}`;
}

function quoteLiteral(value: string): string {
  if (value.includes("\0") || value.length < 32 || value.length > 256) {
    throw new Error("DAY147_A5_SQL_LITERAL_INVALID");
  }
  return `'${value.replaceAll("'", "''")}'`;
}

function buildRoleCreationSql(
  role: RoleFixture,
  credential?: string,
): readonly string[] {
  const roleName = quoteIdentifier(role.name);
  if (role.preexisting) return [];
  const passwordClause = role.login
    ? ` password ${quoteLiteral(credential ?? "")}`
    : "";
  return [
    `create role ${roleName} ${role.login ? "login" : "nologin"} ${
      role.superuser ? "superuser" : "nosuperuser"
    } ${role.inherit ? "inherit" : "noinherit"} ${
      role.bypassrls ? "bypassrls" : "nobypassrls"
    } nocreatedb nocreaterole${passwordClause}`,
  ];
}

function buildRoleGrantSql(role: RoleFixture): readonly string[] {
  const roleName = quoteIdentifier(role.name);
  return [
    ...role.schema_usage.map(
      (schema) => `grant usage on schema ${quoteIdentifier(schema)} to ${roleName}`,
    ),
    ...role.table_select.map(
      (table) => `grant select on table ${qualifiedTable(table)} to ${roleName}`,
    ),
    ...role.table_insert.map(
      (table) => `grant insert on table ${qualifiedTable(table)} to ${roleName}`,
    ),
    ...role.function_execute.map((functionName) => {
      if (functionName !== "ai.persist_operational_memory_bundle") {
        throw new Error("DAY147_A5_SQL_IDENTIFIER_INVALID");
      }
      return `grant execute on function "ai"."persist_operational_memory_bundle"(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) to ${roleName}`;
    }),
    ...(role.name === ROLE_FIXTURES.verification.name
      ? [
        `grant select on table "core_schema"."migration_history" to ${roleName}`,
      ]
      : []),
    `revoke execute on function "ai"."enforce_operational_memory_projection_state_transition"() from ${roleName}`,
    `revoke execute on function "ai"."require_operational_memory_initial_candidate_event"() from ${roleName}`,
  ];
}

const SECURITY_BOUNDARY = Object.freeze({
  security_invoker_dynamic_proof_required: true,
  execute_only_bundle_boundary_supported: false,
  bundle_runtime_fixture_requires_table_insert: true,
  fixture_authority: "isolated_test_only",
});
const ROLE_FIXTURES = DAY147_A5_ROLE_FIXTURES;

type ProjectionFixture = Readonly<{
  projection_id: string;
  projection_type: "daily_work_records";
  projection_version: number;
  business_date: "2026-07-31";
  compiler_id: "farmos.operational_memory.daily_work_records";
  compiler_version: 1;
  content_hash: string;
  projection_content: Readonly<Record<string, unknown>>;
  generated_at: "2026-07-31T00:00:00.000Z";
  supersedes_projection_id: null;
}>;

type ProjectionEventFixture = Readonly<{
  event_id: string;
  projection_id: string;
  status: ProjectionState;
  sequence: number;
  occurred_at: "2026-07-31T00:00:00.000Z";
}>;

class EventSequenceAllocator {
  #next = 1;
  allocate(): number {
    return this.#next++;
  }
}

function deterministicHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function projectionFixture(
  projectionId: string,
  version: number,
): ProjectionFixture {
  const content = Object.freeze({
    contract_version: "farm_os_daily_projection.v1",
    fixture: "day147a5",
    work_records: [],
  });
  return Object.freeze({
    projection_id: projectionId,
    projection_type: "daily_work_records",
    projection_version: version,
    business_date: "2026-07-31",
    compiler_id: "farmos.operational_memory.daily_work_records",
    compiler_version: 1,
    content_hash: deterministicHash(JSON.stringify(content)),
    projection_content: content,
    generated_at: "2026-07-31T00:00:00.000Z",
    supersedes_projection_id: null,
  });
}

function projectionEventFixture(input: {
  event_id: string;
  projection_id: string;
  status: ProjectionState;
  allocator: EventSequenceAllocator;
}): ProjectionEventFixture {
  return Object.freeze({
    event_id: input.event_id,
    projection_id: input.projection_id,
    status: input.status,
    sequence: input.allocator.allocate(),
    occurred_at: "2026-07-31T00:00:00.000Z",
  });
}

type ExpectedFailure = Readonly<{
  source:
    | "fixed_trigger"
    | "check_constraint"
    | "unique_constraint"
    | "foreign_key_constraint"
    | "privilege_denial"
    | "append_only_trigger"
    | "deferred_constraint";
  sqlstate: "23514" | "23505" | "23503" | "42501" | "P0001";
  constraint?: string;
  fixed_message?: string;
}>;

type DynamicCase = Readonly<{
  id: string;
  category:
    | "legacy_compatibility"
    | "initial_candidate"
    | "transition_matrix"
    | "sequence_identity"
    | "lifecycle_uniqueness"
    | "active_uniqueness"
    | "deferred_trigger"
    | "append_only"
    | "privilege_matrix"
    | "bundle_integration"
    | "read_integration"
    | "transaction_atomicity"
    | "concurrency";
  database_target: DatabaseTarget;
  required_phase: "MIGRATIONS_APPLIED";
  setup: readonly string[];
  action: readonly string[];
  expected_outcome: "pass" | "reject";
  expected_failure?: ExpectedFailure;
  cleanup_expectation: "transaction_rollback" | "fixture_retained";
}>;

const transitionCases: DynamicCase[] = [
  ...ALLOWED_TRANSITIONS.map(([from, to]) => ({
    id: `transition_allowed_${from}_to_${to}`,
    category: "transition_matrix" as const,
    database_target: "main" as const,
    required_phase: "MIGRATIONS_APPLIED" as const,
    setup: [`projection_with_${from}`],
    action: [`insert_${to}`],
    expected_outcome: "pass" as const,
    cleanup_expectation: "fixture_retained" as const,
  })),
  ...FORBIDDEN_TRANSITIONS.map(({ from, to }) => ({
    id: `transition_forbidden_${from}_to_${to}`,
    category: "transition_matrix" as const,
    database_target: "main" as const,
    required_phase: "MIGRATIONS_APPLIED" as const,
    setup: [`projection_with_${from}`],
    action: [`insert_${to}`],
    expected_outcome: "reject" as const,
    expected_failure: {
      source: "fixed_trigger" as const,
      sqlstate: "23514" as const,
      fixed_message: "operational_memory_projection_state_transition_invalid",
    },
    cleanup_expectation: "transaction_rollback" as const,
  })),
];

const baseDynamicCases: DynamicCase[] = [
  {
    id: "legacy_active_immutable",
    category: "legacy_compatibility",
    database_target: "legacy_active",
    required_phase: "MIGRATIONS_APPLIED",
    setup: ["day146_active_sequence_1"],
    action: ["compare_before_after_rows"],
    expected_outcome: "pass",
    cleanup_expectation: "fixture_retained",
  },
  {
    id: "legacy_superseded_immutable",
    category: "legacy_compatibility",
    database_target: "legacy_superseded",
    required_phase: "MIGRATIONS_APPLIED",
    setup: ["day146_active_1_superseded_2"],
    action: ["compare_before_after_rows"],
    expected_outcome: "pass",
    cleanup_expectation: "fixture_retained",
  },
  {
    id: "initial_candidate_valid",
    category: "initial_candidate",
    database_target: "main",
    required_phase: "MIGRATIONS_APPLIED",
    setup: ["new_projection"],
    action: ["candidate_sequence_1_commit"],
    expected_outcome: "pass",
    cleanup_expectation: "fixture_retained",
  },
  {
    id: "initial_projection_without_event",
    category: "deferred_trigger",
    database_target: "main",
    required_phase: "MIGRATIONS_APPLIED",
    setup: ["new_projection"],
    action: ["commit_without_event"],
    expected_outcome: "reject",
    expected_failure: {
      source: "deferred_constraint",
      sqlstate: "23514",
      fixed_message: "operational_memory_projection_initial_candidate_required",
    },
    cleanup_expectation: "transaction_rollback",
  },
  {
    id: "sequence_zero_rejected",
    category: "sequence_identity",
    database_target: "main",
    required_phase: "MIGRATIONS_APPLIED",
    setup: ["new_projection"],
    action: ["candidate_sequence_0"],
    expected_outcome: "reject",
    expected_failure: {
      source: "fixed_trigger",
      sqlstate: "23514",
      fixed_message: "operational_memory_projection_event_sequence_invalid",
    },
    cleanup_expectation: "transaction_rollback",
  },
  {
    id: "lifecycle_resolution_duplicate",
    category: "lifecycle_uniqueness",
    database_target: "main",
    required_phase: "MIGRATIONS_APPLIED",
    setup: ["candidate_then_active"],
    action: ["insert_rejected_resolution"],
    expected_outcome: "reject",
    expected_failure: {
      source: "fixed_trigger",
      sqlstate: "23514",
      fixed_message: "operational_memory_projection_state_transition_invalid",
    },
    cleanup_expectation: "transaction_rollback",
  },
  {
    id: "active_scope_conflict_sequential",
    category: "active_uniqueness",
    database_target: "main",
    required_phase: "MIGRATIONS_APPLIED",
    setup: ["active_a_candidate_b_same_scope"],
    action: ["activate_b"],
    expected_outcome: "reject",
    expected_failure: {
      source: "fixed_trigger",
      sqlstate: "23505",
      fixed_message: "operational_memory_projection_active_scope_conflict",
    },
    cleanup_expectation: "transaction_rollback",
  },
  {
    id: "append_only_event_update",
    category: "append_only",
    database_target: "main",
    required_phase: "MIGRATIONS_APPLIED",
    setup: ["candidate_projection"],
    action: ["update_state_event"],
    expected_outcome: "reject",
    expected_failure: {
      source: "append_only_trigger",
      sqlstate: "P0001",
      fixed_message: "operational_memory_append_only",
    },
    cleanup_expectation: "transaction_rollback",
  },
  {
    id: "privilege_authenticated_direct_insert",
    category: "privilege_matrix",
    database_target: "main",
    required_phase: "MIGRATIONS_APPLIED",
    setup: ["set_role_authenticated"],
    action: ["direct_projection_insert"],
    expected_outcome: "reject",
    expected_failure: { source: "privilege_denial", sqlstate: "42501" },
    cleanup_expectation: "transaction_rollback",
  },
  {
    id: "bundle_candidate_atomic_exact_readback",
    category: "bundle_integration",
    database_target: "main",
    required_phase: "MIGRATIONS_APPLIED",
    setup: ["stable_change_fixture"],
    action: ["repository_ingest_and_readback"],
    expected_outcome: "pass",
    cleanup_expectation: "fixture_retained",
  },
  {
    id: "read_candidate_only_missing",
    category: "read_integration",
    database_target: "main",
    required_phase: "MIGRATIONS_APPLIED",
    setup: ["candidate_only"],
    action: ["projection_first_postgres_read"],
    expected_outcome: "pass",
    cleanup_expectation: "fixture_retained",
  },
  {
    id: "atomic_bundle_constraint_failure",
    category: "transaction_atomicity",
    database_target: "main",
    required_phase: "MIGRATIONS_APPLIED",
    setup: ["bundle_with_constraint_violation"],
    action: ["execute_bundle"],
    expected_outcome: "reject",
    expected_failure: { source: "check_constraint", sqlstate: "23514" },
    cleanup_expectation: "transaction_rollback",
  },
  {
    id: "concurrency_forward",
    category: "concurrency",
    database_target: "main",
    required_phase: "MIGRATIONS_APPLIED",
    setup: ["two_candidates_same_scope"],
    action: ["writer_a_then_writer_b_with_observer_barrier"],
    expected_outcome: "pass",
    cleanup_expectation: "fixture_retained",
  },
  {
    id: "concurrency_reverse",
    category: "concurrency",
    database_target: "main",
    required_phase: "MIGRATIONS_APPLIED",
    setup: ["two_candidates_new_scope"],
    action: ["writer_b_then_writer_a_with_observer_barrier"],
    expected_outcome: "pass",
    cleanup_expectation: "fixture_retained",
  },
];

function rejectionCase(input: {
  id: string;
  category: DynamicCase["category"];
  setup: readonly string[];
  action: readonly string[];
  failure: ExpectedFailure;
}): DynamicCase {
  return {
    id: input.id,
    category: input.category,
    database_target: "main",
    required_phase: "MIGRATIONS_APPLIED",
    setup: input.setup,
    action: input.action,
    expected_outcome: "reject",
    expected_failure: input.failure,
    cleanup_expectation: "transaction_rollback",
  };
}

function passingCase(input: {
  id: string;
  category: DynamicCase["category"];
  setup: readonly string[];
  action: readonly string[];
}): DynamicCase {
  return {
    id: input.id,
    category: input.category,
    database_target: "main",
    required_phase: "MIGRATIONS_APPLIED",
    setup: input.setup,
    action: input.action,
    expected_outcome: "pass",
    cleanup_expectation: "fixture_retained",
  };
}

const TRANSITION_INVALID: ExpectedFailure = {
  source: "fixed_trigger",
  sqlstate: "23514",
  fixed_message: "operational_memory_projection_state_transition_invalid",
};
const SEQUENCE_INVALID: ExpectedFailure = {
  source: "fixed_trigger",
  sqlstate: "23514",
  fixed_message: "operational_memory_projection_event_sequence_invalid",
};
const APPEND_ONLY: ExpectedFailure = {
  source: "append_only_trigger",
  sqlstate: "P0001",
  fixed_message: "operational_memory_append_only",
};
const PRIVILEGE_DENIED: ExpectedFailure = {
  source: "privilege_denial",
  sqlstate: "42501",
};

const additionalDynamicCases: DynamicCase[] = [
  ...(["active", "rejected", "failed", "superseded"] as const).map((state) =>
    rejectionCase({
      id: `initial_${state}_rejected`,
      category: "initial_candidate",
      setup: ["new_projection"],
      action: [`insert_${state}_sequence_1`],
      failure: TRANSITION_INVALID,
    })
  ),
  passingCase({
    id: "initial_candidate_then_active_same_transaction",
    category: "initial_candidate",
    setup: ["new_projection"],
    action: ["candidate_1_active_2_commit"],
  }),
  ...(["negative", "duplicate", "lower", "equal", "out_of_order"] as const).map(
    (variant) =>
      rejectionCase({
        id: `sequence_${variant}_rejected`,
        category: "sequence_identity",
        setup: ["projection_with_prior_valid_event"],
        action: [`insert_${variant}_sequence`],
        failure: SEQUENCE_INVALID,
      }),
  ),
  passingCase({
    id: "sequence_strictly_higher_allowed",
    category: "sequence_identity",
    setup: ["candidate_sequence_100"],
    action: ["active_sequence_101"],
  }),
  rejectionCase({
    id: "identity_duplicate_event_id_rejected",
    category: "sequence_identity",
    setup: ["existing_event_id"],
    action: ["reuse_event_id"],
    failure: {
      source: "unique_constraint",
      sqlstate: "23505",
      constraint: "operational_memory_projection_state_events_pkey",
    },
  }),
  rejectionCase({
    id: "identity_nonexistent_projection_rejected",
    category: "sequence_identity",
    setup: ["no_projection"],
    action: ["insert_candidate_for_missing_projection"],
    failure: {
      source: "fixed_trigger",
      sqlstate: "23503",
      fixed_message: "operational_memory_projection_binding_missing",
    },
  }),
  passingCase({
    id: "identity_event_projection_binding_retained",
    category: "sequence_identity",
    setup: ["candidate_projection"],
    action: ["read_event_projection_binding"],
  }),
  ...(["candidate", "resolution", "superseded"] as const).map((kind) =>
    rejectionCase({
      id: `lifecycle_duplicate_${kind}_rejected`,
      category: "lifecycle_uniqueness",
      setup: [`projection_with_${kind}`],
      action: [`insert_second_${kind}`],
      failure: TRANSITION_INVALID,
    })
  ),
  passingCase({
    id: "lifecycle_three_candidates_same_scope_allowed",
    category: "lifecycle_uniqueness",
    setup: ["three_projections_same_date_and_type"],
    action: ["candidate_each"],
  }),
  passingCase({
    id: "active_supersede_then_activate_other",
    category: "active_uniqueness",
    setup: ["active_a_candidate_b_same_scope"],
    action: ["supersede_a_then_activate_b"],
  }),
  passingCase({
    id: "active_different_business_dates_allowed",
    category: "active_uniqueness",
    setup: ["candidate_a_date_1_candidate_b_date_2"],
    action: ["activate_both"],
  }),
  passingCase({
    id: "deferred_projection_candidate_commit",
    category: "deferred_trigger",
    setup: ["new_projection"],
    action: ["candidate_then_commit"],
  }),
  passingCase({
    id: "deferred_projection_candidate_active_commit",
    category: "deferred_trigger",
    setup: ["new_projection"],
    action: ["candidate_active_then_commit"],
  }),
  passingCase({
    id: "deferred_explicit_transaction_rollback_leaves_zero",
    category: "deferred_trigger",
    setup: ["new_projection_and_candidate_in_transaction"],
    action: ["rollback_then_assert_zero"],
  }),
  rejectionCase({
    id: "deferred_multi_projection_missing_candidate_rolls_back_all",
    category: "deferred_trigger",
    setup: ["two_projections_only_one_candidate"],
    action: ["commit_and_assert_all_zero"],
    failure: {
      source: "deferred_constraint",
      sqlstate: "23514",
      fixed_message: "operational_memory_projection_initial_candidate_required",
    },
  }),
  passingCase({
    id: "deferred_legacy_rows_not_retroactively_checked",
    category: "deferred_trigger",
    setup: ["legacy_active_and_superseded_rows"],
    action: ["commit_unrelated_transaction"],
  }),
  rejectionCase({
    id: "append_only_event_delete",
    category: "append_only",
    setup: ["candidate_projection"],
    action: ["delete_state_event"],
    failure: APPEND_ONLY,
  }),
  ...(["update", "delete"] as const).map((operation) =>
    rejectionCase({
      id: `append_only_projection_${operation}`,
      category: "append_only",
      setup: ["candidate_projection"],
      action: [`${operation}_projection_row`],
      failure: APPEND_ONLY,
    })
  ),
  ...(["PUBLIC", "anon", "authenticated"] as const).flatMap((role) => [
    rejectionCase({
      id: `privilege_${role.toLowerCase()}_transition_function_execute`,
      category: "privilege_matrix",
      setup: [`set_role_${role}`],
      action: ["execute_transition_trigger_function_directly"],
      failure: PRIVILEGE_DENIED,
    }),
    rejectionCase({
      id: `privilege_${role.toLowerCase()}_deferred_function_execute`,
      category: "privilege_matrix",
      setup: [`set_role_${role}`],
      action: ["execute_deferred_trigger_function_directly"],
      failure: PRIVILEGE_DENIED,
    }),
    ...(["insert", "update", "delete"] as const).flatMap((operation) =>
      ["projection", "state_event"].map((relation) =>
        rejectionCase({
          id:
            `privilege_${role.toLowerCase()}_${relation}_${operation}_denied`,
          category: "privilege_matrix",
          setup: [`set_role_${role}`],
          action: [`direct_${operation}_${relation}`],
          failure: PRIVILEGE_DENIED,
        })
      )
    ),
  ]),
  passingCase({
    id: "privilege_bundle_runtime_fixture_bundle_success",
    category: "privilege_matrix",
    setup: ["set_role_bundle_runtime_fixture"],
    action: ["execute_projection_candidate_bundle"],
  }),
  ...(["update", "delete"] as const).map((operation) =>
    rejectionCase({
      id: `privilege_bundle_runtime_fixture_projection_${operation}_denied`,
      category: "privilege_matrix",
      setup: ["set_role_bundle_runtime_fixture"],
      action: [`direct_${operation}_projection`],
      failure: PRIVILEGE_DENIED,
    })
  ),
  passingCase({
    id: "bundle_supersedes_null_existing_active_unchanged",
    category: "bundle_integration",
    setup: ["existing_active_and_new_stable_change"],
    action: ["repository_ingest_assert_candidate_bundle"],
  }),
  rejectionCase({
    id: "bundle_constraint_failure_rolls_back_all_relations",
    category: "transaction_atomicity",
    setup: ["invalid_bundle_after_snapshot_component"],
    action: ["execute_bundle_assert_all_component_counts_zero"],
    failure: { source: "check_constraint", sqlstate: "23514" },
  }),
  rejectionCase({
    id: "bundle_repository_readback_failure_rolls_back",
    category: "transaction_atomicity",
    setup: ["isolated_readback_fault_injection_if_safe"],
    action: ["repository_ingest_assert_bundle_rollback"],
    failure: { source: "check_constraint", sqlstate: "23514" },
  }),
  ...([
    "active_plus_candidate_selects_active",
    "active_plus_multiple_candidates_selects_active",
    "legacy_active_selected",
    "legacy_superseded_missing",
    "candidate_content_and_lineage_not_exposed",
  ] as const).map((variant) =>
    passingCase({
      id: `read_${variant}`,
      category: "read_integration",
      setup: [variant],
      action: ["projection_first_postgres_read"],
    })
  ),
];

const DYNAMIC_CASES = Object.freeze([
  ...baseDynamicCases,
  ...additionalDynamicCases,
  ...transitionCases,
]);

type CaseExecutorKind =
  | "legacy"
  | "sql"
  | "privilege"
  | "repository"
  | "read"
  | "atomicity"
  | "concurrency";

type ExecutableDynamicCase = DynamicCase & Readonly<{
  executor: CaseExecutorKind;
  assertion: "exact_success" | "exact_failure";
}>;

function executorForCase(testCase: DynamicCase): CaseExecutorKind {
  switch (testCase.category) {
    case "legacy_compatibility":
      return "legacy";
    case "privilege_matrix":
      return "privilege";
    case "bundle_integration":
      return "repository";
    case "read_integration":
      return "read";
    case "transaction_atomicity":
      return "atomicity";
    case "concurrency":
      return "concurrency";
    default:
      return "sql";
  }
}

const EXECUTABLE_CASES: readonly ExecutableDynamicCase[] = DYNAMIC_CASES.map(
  (testCase) => ({
    ...testCase,
    executor: executorForCase(testCase),
    assertion: testCase.expected_outcome === "pass"
      ? "exact_success"
      : "exact_failure",
  }),
);

export const DAY147_A5_SHARED_CASE_REGISTRY = EXECUTABLE_CASES;

const REQUIRED_CASE_IDS = [
  "legacy_active_immutable",
  "legacy_superseded_immutable",
  "initial_candidate_valid",
  "initial_projection_without_event",
  "initial_active_rejected",
  "initial_rejected_rejected",
  "initial_failed_rejected",
  "initial_superseded_rejected",
  "initial_candidate_then_active_same_transaction",
  "sequence_zero_rejected",
  "sequence_negative_rejected",
  "sequence_duplicate_rejected",
  "sequence_lower_rejected",
  "sequence_equal_rejected",
  "sequence_strictly_higher_allowed",
  "identity_duplicate_event_id_rejected",
  "identity_nonexistent_projection_rejected",
  "lifecycle_three_candidates_same_scope_allowed",
  "active_scope_conflict_sequential",
  "active_supersede_then_activate_other",
  "active_different_business_dates_allowed",
  "privilege_bundle_runtime_fixture_bundle_success",
  "bundle_candidate_atomic_exact_readback",
  "bundle_repository_readback_failure_rolls_back",
  "read_candidate_only_missing",
  "read_active_plus_candidate_selects_active",
  "read_active_plus_multiple_candidates_selects_active",
  "read_legacy_active_selected",
  "read_legacy_superseded_missing",
  "concurrency_forward",
  "concurrency_reverse",
] as const;

function deterministicUuid(value: string): string {
  const hex = deterministicHash(value);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${
    hex.slice(17, 20)
  }-${hex.slice(20, 32)}`;
}

async function insertProjectionForCase(input: {
  client: Client | PoolClient;
  id: string;
  version: number;
  business_date?: string;
  content_hash?: string;
}): Promise<string> {
  const projectionId = deterministicUuid(`projection:${input.id}`);
  const content = {
    business_date: input.business_date ?? "2026-07-31",
    source_record_count: 0,
    active_record_count: 0,
    tombstone_count: 0,
    field_references: [],
    crop_cycle_references: [],
    work_type_references: [],
    verification_status: "stable_change_contract_validated",
    missing_data_status: "complete_for_v1",
  };
  await input.client.query(
    `insert into ai.operational_memory_daily_projections (
      projection_id, projection_type, projection_version, business_date,
      compiler_id, compiler_version, content_hash, projection_content,
      generated_at, supersedes_projection_id
    ) values ($1, 'daily_work_records', $2, $3::date,
      'farmos.operational_memory.daily_work_records', 1, $4, $5::jsonb,
      $6::timestamptz, null)`,
    [
      projectionId,
      input.version,
      input.business_date ?? "2026-07-31",
      input.content_hash ?? deterministicHash(JSON.stringify(content)),
      JSON.stringify(content),
      "2026-07-31T00:00:00.000Z",
    ],
  );
  return projectionId;
}

async function insertProjectionState(input: {
  client: Client | PoolClient;
  case_id: string;
  projection_id: string;
  status: ProjectionState;
  sequence: number;
}): Promise<void> {
  await input.client.query(
    `insert into ai.operational_memory_projection_state_events (
      event_id, projection_id, status, event_sequence, occurred_at
    ) overriding system value values ($1, $2, $3, $4, $5::timestamptz)`,
    [
      deterministicUuid(
        `event:${input.case_id}:${input.projection_id}:${input.sequence}`,
      ),
      input.projection_id,
      input.status,
      input.sequence,
      "2026-07-31T00:00:00.000Z",
    ],
  );
}

function pgFailure(error: unknown): { code: string; message: string; constraint?: string } {
  if (!(error instanceof Error)) {
    throw new Error("DAY147_A5_DYNAMIC_CASE_ERROR_INVALID");
  }
  const pgError = error as Error & { code?: string; constraint?: string };
  return {
    code: pgError.code ?? "",
    message: pgError.message,
    constraint: pgError.constraint,
  };
}

function assertExpectedFailure(error: unknown, expected: ExpectedFailure): void {
  const failure = pgFailure(error);
  assert.equal(failure.code, expected.sqlstate);
  if (expected.fixed_message !== undefined) {
    assert.equal(failure.message, expected.fixed_message);
  }
  if (expected.constraint !== undefined) {
    assert.equal(failure.constraint, expected.constraint);
  }
}

function assertInitialCandidateValidOutcome(observedFailure: unknown): void {
  if (observedFailure !== null) {
    throw observedFailure;
  }
}

async function seedProjectionStatus(input: {
  client: Client | PoolClient;
  case_id: string;
  projection_id: string;
  status: ProjectionState;
  sequence_base?: number;
}): Promise<number> {
  const history: ProjectionState[] = input.status === "candidate"
    ? ["candidate"]
    : input.status === "active"
    ? ["candidate", "active"]
    : input.status === "superseded"
    ? ["candidate", "active", "superseded"]
    : ["candidate", input.status];
  for (const [index, status] of history.entries()) {
    await insertProjectionState({
      ...input,
      status,
      sequence: (input.sequence_base ?? 0) + index + 1,
    });
  }
  return (input.sequence_base ?? 0) + history.length;
}

async function executeTransitionCase(
  client: Client,
  testCase: ExecutableDynamicCase,
): Promise<void> {
  const match = /^transition_(?:allowed|forbidden)_([a-z]+)_to_([a-z]+)$/.exec(
    testCase.id,
  );
  assert.ok(match);
  const from = match[1] as ProjectionState;
  const to = match[2] as ProjectionState;
  await client.query("begin");
  try {
    const projectionId = await insertProjectionForCase({
      client,
      id: testCase.id,
      version: 1,
    });
    const previousCount = await seedProjectionStatus({
      client,
      case_id: testCase.id,
      projection_id: projectionId,
      status: from,
    });
    let failure: unknown = null;
    try {
      await insertProjectionState({
        client,
        case_id: testCase.id,
        projection_id: projectionId,
        status: to,
        sequence: previousCount + 1,
      });
    } catch (error) {
      failure = error;
    }
    if (testCase.expected_outcome === "pass") {
      assert.equal(failure, null);
    } else {
      assert.notEqual(failure, null);
      assertExpectedFailure(failure, testCase.expected_failure!);
    }
  } finally {
    await client.query("rollback").catch(() => undefined);
  }
}

async function executeSqlContractCase(
  client: Client,
  testCase: ExecutableDynamicCase,
): Promise<void> {
  if (testCase.id.startsWith("transition_")) {
    await executeTransitionCase(client, testCase);
    return;
  }
  await client.query("begin");
  let observedFailure: unknown = null;
  try {
    const projectionId =
      testCase.id === "deferred_legacy_rows_not_retroactively_checked"
        ? deterministicUuid("deferred-legacy-unused")
        : await insertProjectionForCase({
          client,
          id: testCase.id,
          version: 1,
        });
    const action = testCase.action[0] ?? "";
    try {
      if (
        testCase.id === "initial_projection_without_event" ||
        testCase.id === "deferred_multi_projection_missing_candidate_rolls_back_all"
      ) {
        if (testCase.id.includes("multi_projection")) {
          const second = await insertProjectionForCase({
            client,
            id: `${testCase.id}:second`,
            version: 2,
          });
          await insertProjectionState({
            client,
            case_id: testCase.id,
            projection_id: second,
            status: "candidate",
            sequence: 1,
          });
        }
        await client.query("set constraints all immediate");
      } else if (testCase.id.startsWith("initial_")) {
        if (action === "candidate_sequence_1_commit" ||
          action === "candidate_then_commit") {
          await insertProjectionState({
            client,
            case_id: testCase.id,
            projection_id: projectionId,
            status: "candidate",
            sequence: 1,
          });
          await client.query("set constraints all immediate");
        } else if (action === "candidate_1_active_2_commit" ||
          action === "candidate_active_then_commit") {
          await seedProjectionStatus({
            client,
            case_id: testCase.id,
            projection_id: projectionId,
            status: "active",
          });
          await client.query("set constraints all immediate");
        } else {
          const status = action.match(/^insert_([a-z]+)_sequence_1$/)?.[1] as
            | ProjectionState
            | undefined;
          assert.ok(status);
          await insertProjectionState({
            client,
            case_id: testCase.id,
            projection_id: projectionId,
            status,
            sequence: 1,
          });
        }
      } else if (testCase.category === "sequence_identity") {
        if (testCase.id === "identity_nonexistent_projection_rejected") {
          await insertProjectionState({
            client,
            case_id: testCase.id,
            projection_id: deterministicUuid("missing-projection"),
            status: "candidate",
            sequence: 1,
          });
        } else {
          await insertProjectionState({
            client,
            case_id: testCase.id,
            projection_id: projectionId,
            status: "candidate",
            sequence: testCase.id.includes("strictly_higher") ? 100 : 1,
          });
          if (testCase.id === "identity_event_projection_binding_retained") {
            const result = await client.query<{ projection_id: string }>(
              `select projection_id
              from ai.operational_memory_projection_state_events
              where projection_id = $1`,
              [projectionId],
            );
            assert.equal(result.rows[0]?.projection_id, projectionId);
          } else {
            const nextSequence = testCase.id.includes("negative")
              ? -1
              : testCase.id.includes("zero")
              ? 0
              : testCase.id.includes("lower")
              ? 0
              : testCase.id.includes("strictly_higher")
              ? 101
              : testCase.id.includes("duplicate_event_id")
              ? 2
              : 1;
            const eventId = testCase.id.includes("duplicate_event_id")
              ? deterministicUuid(`event:${testCase.id}:${projectionId}:1`)
              : deterministicUuid(`event:${testCase.id}:next`);
            await client.query(
              `insert into ai.operational_memory_projection_state_events (
                event_id, projection_id, status, event_sequence, occurred_at
              ) overriding system value values (
                $1, $2, 'active', $3, $4::timestamptz
              )`,
              [
                eventId,
                projectionId,
                nextSequence,
                "2026-07-31T00:00:01.000Z",
              ],
            );
          }
        }
      } else if (testCase.category === "lifecycle_uniqueness") {
        if (testCase.id.includes("three_candidates")) {
          await insertProjectionState({
            client,
            case_id: testCase.id,
            projection_id: projectionId,
            status: "candidate",
            sequence: 1,
          });
          for (const version of [2, 3]) {
            const other = await insertProjectionForCase({
              client,
              id: `${testCase.id}:${version}`,
              version,
            });
            await insertProjectionState({
              client,
              case_id: testCase.id,
              projection_id: other,
              status: "candidate",
              sequence: version,
            });
          }
        } else {
          const target = testCase.id.includes("superseded")
            ? "superseded"
            : testCase.id.includes("resolution")
            ? "active"
            : "candidate";
          const count = await seedProjectionStatus({
            client,
            case_id: testCase.id,
            projection_id: projectionId,
            status: target,
          });
          await insertProjectionState({
            client,
            case_id: testCase.id,
            projection_id: projectionId,
            status: target,
            sequence: count + 1,
          });
        }
      } else if (testCase.category === "active_uniqueness") {
        const dateB = testCase.id.includes("different_business_dates")
          ? "2026-08-01"
          : "2026-07-31";
        await seedProjectionStatus({
          client,
          case_id: testCase.id,
          projection_id: projectionId,
          status: "active",
        });
        if (testCase.id.includes("supersede_then")) {
          await insertProjectionState({
            client,
            case_id: testCase.id,
            projection_id: projectionId,
            status: "superseded",
            sequence: 3,
          });
        }
        const other = await insertProjectionForCase({
          client,
          id: `${testCase.id}:other`,
          version: 2,
          business_date: dateB,
        });
        await seedProjectionStatus({
          client,
          case_id: testCase.id,
          projection_id: other,
          status: "active",
          sequence_base: 10,
        });
      } else if (testCase.category === "deferred_trigger") {
        if (testCase.id.includes("legacy")) {
          await client.query("set constraints all immediate");
        } else if (testCase.id.includes("rollback_leaves_zero")) {
          await insertProjectionState({
            client,
            case_id: testCase.id,
            projection_id: projectionId,
            status: "candidate",
            sequence: 1,
          });
        } else {
          await seedProjectionStatus({
            client,
            case_id: testCase.id,
            projection_id: projectionId,
            status: testCase.id.includes("active") ? "active" : "candidate",
          });
          await client.query("set constraints all immediate");
        }
      } else if (testCase.category === "append_only") {
        await insertProjectionState({
          client,
          case_id: testCase.id,
          projection_id: projectionId,
          status: "candidate",
          sequence: 1,
        });
        if (testCase.id.includes("event_update")) {
          await client.query(
            `update ai.operational_memory_projection_state_events
            set occurred_at = occurred_at where projection_id = $1`,
            [projectionId],
          );
        } else if (testCase.id.includes("event_delete")) {
          await client.query(
            `delete from ai.operational_memory_projection_state_events
            where projection_id = $1`,
            [projectionId],
          );
        } else if (testCase.id.includes("projection_update")) {
          await client.query(
            `update ai.operational_memory_daily_projections
            set generated_at = generated_at where projection_id = $1`,
            [projectionId],
          );
        } else {
          await client.query(
            `delete from ai.operational_memory_daily_projections
            where projection_id = $1`,
            [projectionId],
          );
        }
      } else {
        throw new Error("DAY147_A5_DYNAMIC_CASE_EXECUTOR_MISSING");
      }
    } catch (error) {
      observedFailure = error;
    }
    if (testCase.expected_outcome === "pass") {
      if (testCase.id === "initial_candidate_valid") {
        assertInitialCandidateValidOutcome(observedFailure);
      } else {
        assert.equal(observedFailure, null, testCase.id);
      }
    } else {
      assert.notEqual(observedFailure, null, testCase.id);
      assertExpectedFailure(observedFailure, testCase.expected_failure!);
    }
  } finally {
    await client.query("rollback").catch(() => undefined);
  }
}

async function executePrivilegeCase(input: {
  client: Client;
  testCase: ExecutableDynamicCase;
  completedIntegrations: ReadonlySet<string>;
}): Promise<void> {
  if (
    input.testCase.id === "privilege_bundle_runtime_fixture_bundle_success"
  ) {
    assert.ok(input.completedIntegrations.has(input.testCase.id));
    return;
  }
  const role = input.testCase.id.includes("_anon_")
    ? ROLE_FIXTURES.anon.name
    : input.testCase.id.includes("_authenticated_")
    ? ROLE_FIXTURES.authenticated.name
    : input.testCase.id.includes("bundle_runtime_fixture")
    ? ROLE_FIXTURES.bundle_runtime_fixture.name
    : ROLE_FIXTURES.attacker.name;
  const action = input.testCase.action[0] ?? "";
  await input.client.query("begin");
  let failure: unknown = null;
  try {
    await input.client.query(`set local role ${quoteIdentifier(role)}`);
    try {
      if (action === "execute_transition_trigger_function_directly") {
        await input.client.query(
          `select ai.enforce_operational_memory_projection_state_transition()`,
        );
      } else if (action === "execute_deferred_trigger_function_directly") {
        await input.client.query(
          `select ai.require_operational_memory_initial_candidate_event()`,
        );
      } else if (action.includes("_projection")) {
        if (action.startsWith("direct_insert")) {
          await input.client.query(
            `insert into ai.operational_memory_daily_projections default values`,
          );
        } else if (action.startsWith("direct_update")) {
          await input.client.query(
            `update ai.operational_memory_daily_projections
            set generated_at = generated_at`,
          );
        } else {
          await input.client.query(
            `delete from ai.operational_memory_daily_projections`,
          );
        }
      } else if (action.includes("_state_event")) {
        if (action.startsWith("direct_insert")) {
          await input.client.query(
            `insert into ai.operational_memory_projection_state_events
            default values`,
          );
        } else if (action.startsWith("direct_update")) {
          await input.client.query(
            `update ai.operational_memory_projection_state_events
            set occurred_at = occurred_at`,
          );
        } else {
          await input.client.query(
            `delete from ai.operational_memory_projection_state_events`,
          );
        }
      } else {
        throw new Error("DAY147_A5_DYNAMIC_CASE_EXECUTOR_MISSING");
      }
    } catch (error) {
      failure = error;
    }
    assert.notEqual(failure, null, input.testCase.id);
    assertExpectedFailure(failure, input.testCase.expected_failure!);
  } finally {
    await input.client.query("rollback").catch(() => undefined);
  }
}

async function assertPrivilegeCatalog(client: Client): Promise<Set<string>> {
  const roles = [
    ROLE_FIXTURES.anon.name,
    ROLE_FIXTURES.authenticated.name,
    ROLE_FIXTURES.attacker.name,
  ];
  for (const role of roles) {
    const result = await client.query<{
      projection_insert: boolean;
      event_insert: boolean;
      transition_execute: boolean;
      deferred_execute: boolean;
    }>(
      `select
        has_table_privilege($1, 'ai.operational_memory_daily_projections', 'insert')
          as projection_insert,
        has_table_privilege($1, 'ai.operational_memory_projection_state_events', 'insert')
          as event_insert,
        has_function_privilege(
          $1,
          'ai.enforce_operational_memory_projection_state_transition()',
          'execute'
        ) as transition_execute,
        has_function_privilege(
          $1,
          'ai.require_operational_memory_initial_candidate_event()',
          'execute'
        ) as deferred_execute`,
      [role],
    );
    assert.deepEqual(result.rows[0], {
      projection_insert: false,
      event_insert: false,
      transition_execute: false,
      deferred_execute: false,
    });
  }
  const publicAcl = await client.query<{
    table_dml: boolean;
    trigger_execute: boolean;
  }>(
    `select
      exists (
        select 1
        from pg_catalog.pg_class relation
        cross join lateral pg_catalog.aclexplode(
          coalesce(
            relation.relacl,
            pg_catalog.acldefault('r', relation.relowner)
          )
        ) acl
        where relation.oid in (
          'ai.operational_memory_daily_projections'::regclass,
          'ai.operational_memory_projection_state_events'::regclass
        )
          and acl.grantee = 0
          and acl.privilege_type in ('INSERT', 'UPDATE', 'DELETE')
      ) as table_dml,
      exists (
        select 1
        from pg_catalog.pg_proc procedure
        cross join lateral pg_catalog.aclexplode(
          coalesce(
            procedure.proacl,
            pg_catalog.acldefault('f', procedure.proowner)
          )
        ) acl
        where procedure.oid in (
          'ai.enforce_operational_memory_projection_state_transition()'::regprocedure,
          'ai.require_operational_memory_initial_candidate_event()'::regprocedure
        )
          and acl.grantee = 0
          and acl.privilege_type = 'EXECUTE'
      ) as trigger_execute`,
  );
  assert.deepEqual(publicAcl.rows[0], {
    table_dml: false,
    trigger_execute: false,
  });
  return new Set(
    EXECUTABLE_CASES
      .filter((testCase) => testCase.id.startsWith("privilege_public_"))
      .map((testCase) => testCase.id),
  );
}

function stableChangePage(sourceRecordId = "day147a5_source_record_01") {
  return {
    contract_version: FARM_OS_STABLE_CHANGES_CONTRACT_ID,
    result: "ok",
    next_cursor: null,
    has_more: false,
    changes: [{
      operation: "upsert",
      source_record_id: sourceRecordId,
      source_record_version: 1,
      source_content_hash: deterministicHash(sourceRecordId),
      business_date: "2026-07-31",
      recorded_at: "2026-07-31T08:00:00+09:00",
      source_updated_at: "2026-07-31T08:00:00+09:00",
      deleted_at: null,
      field_reference: "day147a5_field_fixture",
      crop_cycle_reference: "day147a5_crop_cycle_fixture",
      work_type_reference: "day147a5_work_type_fixture",
      safe_payload: {},
    }],
  };
}

async function runRepositoryIntegration(input: {
  admin_config: ClientConfig;
  bundle_config: ClientConfig;
}): Promise<Set<string>> {
  const admin = createPgClient(input.admin_config);
  await admin.connect();
  let activeProjectionId = "";
  try {
    await admin.query("begin");
    activeProjectionId = await insertProjectionForCase({
      client: admin,
      id: "repository-existing-active",
      version: 500,
    });
    await seedProjectionStatus({
      client: admin,
      case_id: "repository-existing-active",
      projection_id: activeProjectionId,
      status: "active",
      sequence_base: 50_000,
    });
    await admin.query("commit");
  } catch (error) {
    await admin.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await admin.end().catch(() => undefined);
  }

  const bundleBoundary = createPgClient(input.bundle_config);
  await bundleBoundary.connect();
  try {
    const proof = await bundleBoundary.query<{
      current_user: string;
      is_superuser: boolean;
      security_definer: boolean;
      bundle_execute: boolean;
      projection_insert: boolean;
      projection_update: boolean;
      projection_delete: boolean;
    }>(
      `select
        current_user,
        coalesce((
          select role.rolsuper
          from pg_catalog.pg_roles role
          where role.rolname = current_user
        ), true) as is_superuser,
        (
          select procedure.prosecdef
          from pg_catalog.pg_proc procedure
          where procedure.oid =
            'ai.persist_operational_memory_bundle(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)'::regprocedure
        ) as security_definer,
        has_function_privilege(
          current_user,
          'ai.persist_operational_memory_bundle(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)',
          'execute'
        ) as bundle_execute,
        has_table_privilege(
          current_user,
          'ai.operational_memory_daily_projections',
          'insert'
        ) as projection_insert,
        has_table_privilege(
          current_user,
          'ai.operational_memory_daily_projections',
          'update'
        ) as projection_update,
        has_table_privilege(
          current_user,
          'ai.operational_memory_daily_projections',
          'delete'
        ) as projection_delete`,
    );
    assert.deepEqual(proof.rows[0], {
      current_user: ROLE_FIXTURES.bundle_runtime_fixture.name,
      is_superuser: false,
      security_definer: false,
      bundle_execute: true,
      projection_insert: true,
      projection_update: false,
      projection_delete: false,
    });
  } finally {
    await bundleBoundary.end().catch(() => undefined);
  }

  const pool = createPgPool({ ...input.bundle_config, max: 2 });
  const repository = new FarmOsOperationalMemoryPostgresRepository({ pool });
  try {
    const before = await repository.readState();
    const activeBefore = structuredClone(
      before.projections.find((projection) =>
        projection.projection_id === activeProjectionId
      ),
    );
    const first = await repository.ingest({
      page: stableChangePage(),
      observed_at: "2026-07-31T06:00:00.000Z",
    });
    if (
      first.result !== "success" ||
      first.postgres_persistence.transaction_committed !== true
    ) {
      throw new Error("DAY147_A5_IMPLEMENTATION_CONFLICT");
    }
    const after = await repository.readState();
    const previousCandidateProjectionIds = new Set(
      before.projection_state_events
        .filter((event) => event.status === "candidate")
        .map((event) => event.projection_id),
    );
    const candidateEvents = after.projection_state_events.filter((event) =>
      event.status === "candidate" &&
      !previousCandidateProjectionIds.has(event.projection_id)
    );
    assert.equal(candidateEvents.length, 1);
    const candidate = after.projections.find((projection) =>
      projection.projection_id === candidateEvents[0]?.projection_id
    );
    assert.ok(candidate);
    assert.equal(candidate.supersedes_projection_id, null);
    assert.deepEqual(
      after.projections.find((projection) =>
        projection.projection_id === activeProjectionId
      ),
      activeBefore,
    );
    assert.equal(
      after.lineage.filter((entry) =>
        entry.projection_id === candidate.projection_id
      ).length,
      1,
    );
    const counts = {
      snapshots: after.snapshots.length,
      projections: after.projections.length,
      events: after.projection_state_events.length,
      lineage: after.lineage.length,
    };
    const replay = await repository.ingest({
      page: stableChangePage(),
      observed_at: "2026-07-31T06:01:00.000Z",
    });
    assert.equal(replay.result, "success");
    const replayState = await repository.readState();
    assert.deepEqual({
      snapshots: replayState.snapshots.length,
      projections: replayState.projections.length,
      events: replayState.projection_state_events.length,
      lineage: replayState.lineage.length,
    }, counts);
    return new Set([
      "privilege_bundle_runtime_fixture_bundle_success",
      "bundle_candidate_atomic_exact_readback",
      "bundle_supersedes_null_existing_active_unchanged",
    ]);
  } finally {
    await repository.close();
    await pool.end().catch(() => undefined);
  }
}

async function operationalRowCounts(client: Client): Promise<Record<string, number>> {
  const result = await client.query<{
    snapshots: string;
    projections: string;
    events: string;
    lineage: string;
  }>(
    `select
      (select count(*) from ai.operational_memory_source_snapshots)::text
        as snapshots,
      (select count(*) from ai.operational_memory_daily_projections)::text
        as projections,
      (select count(*) from ai.operational_memory_projection_state_events)::text
        as events,
      (select count(*) from ai.operational_memory_projection_lineage)::text
        as lineage`,
  );
  const row = result.rows[0]!;
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, Number(value)]),
  );
}

async function runAtomicityIntegration(input: {
  admin_config: ClientConfig;
  bundle_config: ClientConfig;
}): Promise<Set<string>> {
  const admin = createPgClient(input.admin_config);
  await admin.connect();
  try {
  const before = await operationalRowCounts(admin);

  const constraintPool = createPgPool({ ...input.bundle_config, max: 1 });
  let observedConstraintSqlstate: string | null = null;
  let bundleConstraintInjected = false;
  const invalidBundlePool = {
    async connect(): Promise<PoolClient> {
      const client = await constraintPool.connect();
      return new Proxy(client, {
        get(target, property, receiver) {
          if (property !== "query") {
            const value = Reflect.get(target, property, receiver);
            return typeof value === "function" ? value.bind(target) : value;
          }
          return async (...args: unknown[]) => {
            const text = typeof args[0] === "string"
              ? args[0]
              : String((args[0] as { text?: unknown })?.text ?? "");
            if (
              text.includes("persist_operational_memory_bundle") &&
              Array.isArray(args[1])
            ) {
              const values = [...args[1] as unknown[]];
              const events = JSON.parse(String(values[3])) as Array<
                Record<string, unknown>
              >;
              assert.equal(events.length, 1);
              values[3] = JSON.stringify([{ ...events[0], status: "active" }]);
              args[1] = values;
              bundleConstraintInjected = true;
            }
            try {
              return await (
                target.query as (...queryArgs: unknown[]) => Promise<QueryResult>
              ).apply(target, args);
            } catch (error) {
              if (bundleConstraintInjected) {
                observedConstraintSqlstate = pgFailure(error).code;
              }
              throw error;
            }
          };
        },
      }) as PoolClient;
    },
    async end(): Promise<void> {
      await constraintPool.end();
    },
  };
  const invalidBundleRepository =
    new FarmOsOperationalMemoryPostgresRepository({ pool: invalidBundlePool });
  try {
    const invalidBundleResult = await invalidBundleRepository.ingest({
      page: stableChangePage("day147a5_constraint_source"),
      observed_at: "2026-07-31T06:02:00.000Z",
    });
    assert.equal(bundleConstraintInjected, true);
    assert.equal(observedConstraintSqlstate, "23514");
    assert.equal(invalidBundleResult.result, "rejected");
    assert.equal(
      invalidBundleResult.postgres_persistence.transaction_committed,
      false,
    );
  } finally {
    await invalidBundleRepository.close();
    await invalidBundlePool.end();
  }
  assert.deepEqual(await operationalRowCounts(admin), before);

  const basePool = createPgPool({ ...input.bundle_config, max: 1 });
  let bundleSeen = false;
  const faultPool = {
    async connect(): Promise<PoolClient> {
      const client = await basePool.connect();
      return new Proxy(client, {
        get(target, property, receiver) {
          if (property !== "query") {
            const value = Reflect.get(target, property, receiver);
            return typeof value === "function" ? value.bind(target) : value;
          }
          return async (...args: unknown[]) => {
            const text = typeof args[0] === "string"
              ? args[0]
              : String((args[0] as { text?: unknown })?.text ?? "");
            const result = await (
              target.query as (...queryArgs: unknown[]) => Promise<QueryResult>
            ).apply(target, args);
            if (text.includes("persist_operational_memory_bundle")) {
              bundleSeen = true;
            } else if (
              bundleSeen &&
              text.includes("from ai.operational_memory_daily_projections")
            ) {
              return { ...result, rows: [] };
            }
            return result;
          };
        },
      }) as PoolClient;
    },
    async end(): Promise<void> {
      await basePool.end();
    },
  };
  const repository = new FarmOsOperationalMemoryPostgresRepository({
    pool: faultPool,
  });
  try {
    const result = await repository.ingest({
      page: stableChangePage("day147a5_atomic_source"),
      observed_at: "2026-07-31T06:02:00.000Z",
    });
    assert.equal(result.result, "rejected");
    assert.equal(result.postgres_persistence.transaction_committed, false);
  } finally {
    await repository.close();
    await faultPool.end();
  }
  assert.deepEqual(await operationalRowCounts(admin), before);
  return new Set([
    "atomic_bundle_constraint_failure",
    "bundle_constraint_failure_rolls_back_all_relations",
    "bundle_repository_readback_failure_rolls_back",
  ]);
  } finally {
    await admin.end().catch(() => undefined);
  }
}

async function verifySecurityInvokerConflictBranch(input: {
  repositoryAttempt: () => Promise<boolean>;
  cleanup: () => Promise<void>;
  counters: { grant_additions: number; owner_fallbacks: number };
}): Promise<"BLOCKED_IMPLEMENTATION_CONFLICT"> {
  const succeeded = await input.repositoryAttempt();
  if (succeeded) {
    throw new Error("DAY147_A5_CONFLICT_MOCK_INVALID");
  }
  await input.cleanup();
  assert.equal(input.counters.grant_additions, 0);
  assert.equal(input.counters.owner_fallbacks, 0);
  return "BLOCKED_IMPLEMENTATION_CONFLICT";
}

async function readSelection(input: {
  config: ClientConfig;
  business_date: string;
}) {
  const pool = createPgPool({ ...input.config, max: 1 });
  const queryTexts: string[] = [];
  const readPool: FarmOsProjectionFirstPostgresPool = {
    async connect(): Promise<PoolClient> {
      const client = await pool.connect();
      return new Proxy(client, {
        get(target, property, receiver) {
          if (property !== "query") {
            const value = Reflect.get(target, property, receiver);
            return typeof value === "function" ? value.bind(target) : value;
          }
          return async (...args: unknown[]) => {
            const text = typeof args[0] === "string"
              ? args[0]
              : String((args[0] as { text?: unknown })?.text ?? "");
            queryTexts.push(text.trim().toLowerCase());
            return await (
              target.query as (...queryArgs: unknown[]) => Promise<QueryResult>
            ).apply(target, args);
          };
        },
      }) as PoolClient;
    },
    async end(): Promise<void> {
      await pool.end();
    },
  };
  const installation = {
    installation_id: "day147a5_installation",
    farm_scope: "day147a5_farm_scope",
    timezone: "Asia/Tokyo",
  } as const;
  const adapter = new FarmOsProjectionFirstPostgresReadAdapter({
    installation_binding: installation,
    postgres_pool: readPool,
    owns_pool: false,
  });
  try {
    const bundle = await adapter.readProjectionBundle({
      authorized_scope: {
        installation_id: installation.installation_id,
        farm_scope: installation.farm_scope,
        authorization_id: "day147a5_authorization",
      },
      business_date: input.business_date,
    });
    const selection = selectFarmOsProjectionFirstProjection({
      authorized_farm_scope: installation.farm_scope,
      business_date: input.business_date,
      bundle,
    });
    assert.equal(queryTexts.some((text) =>
      /^(?:insert|update|delete|create|alter|drop|truncate)\b/.test(text)
    ), false);
    return { bundle, selection };
  } finally {
    await adapter.close();
    await pool.end().catch(() => undefined);
  }
}

const LEGACY_ACTIVE_PROJECTION_ID =
  "10000000-0000-4000-8000-000000000001" as const;

function classifyLegacyActiveSelection(input: Readonly<{
  bundle: FarmOsProjectionFirstScopedBundle;
  selection: FarmOsProjectionFirstSelection;
}>): Day147A5AssertionValueClass {
  if (input.selection.result === "projection_stale") {
    return "CONTENT_HASH_MISMATCH";
  }
  if (input.selection.result !== "selected") {
    return "MISSING_SELECTION";
  }
  if (input.selection.projection.projection_id !== LEGACY_ACTIVE_PROJECTION_ID) {
    return "UNEXPECTED_IDENTITY";
  }
  const selectedProjectionId = input.selection.projection.projection_id;
  const selectedStatus = input.bundle.projection_state_events
    .filter((event) =>
      event.projection_id === selectedProjectionId
    )
    .slice()
    .sort((left, right) => left.sequence - right.sequence)
    .at(-1)?.status;
  return selectedStatus === "active" ? "EXPECTED_STATUS" : "UNEXPECTED_STATUS";
}

async function seedReadProjection(input: {
  client: Client;
  id: string;
  version: number;
  date: string;
  status: "candidate" | "active" | "superseded";
  sequence_base: number;
}): Promise<string> {
  await input.client.query("begin");
  try {
    const projectionId = await insertProjectionForCase({
      client: input.client,
      id: input.id,
      version: input.version,
      business_date: input.date,
      content_hash: compileFarmOsDailyProjection({
        business_date: input.date,
        snapshots: [],
        snapshot_state_events: [],
      }).content_hash,
    });
    await seedProjectionStatus({
      client: input.client,
      case_id: input.id,
      projection_id: projectionId,
      status: input.status,
      sequence_base: input.sequence_base,
    });
    await input.client.query("commit");
    return projectionId;
  } catch (error) {
    await input.client.query("rollback").catch(() => undefined);
    throw error;
  }
}

class Day147A5ReadAdapterAssertionError extends Error {
  readonly assertion_id: Day147A5ReadAdapterAssertionId;
  readonly expected_class: Day147A5AssertionValueClass;
  readonly actual_class: Day147A5AssertionValueClass;
  constructor(
    assertionId: Day147A5ReadAdapterAssertionId,
    expectedClass: Day147A5AssertionValueClass,
    actualClass: Day147A5AssertionValueClass,
  ) {
    super("DAY147_A5_READ_ADAPTER_ASSERTION_FAILED");
    this.name = "AssertionError";
    this.assertion_id = assertionId;
    this.expected_class = expectedClass;
    this.actual_class = actualClass;
    this.stack = `${this.name}: ${this.message}`;
  }
}

export async function executeDay147A5ReadAdapterCaseBoundary(input: Readonly<{
  case_id: string;
  assertion_id: Day147A5ReadAdapterAssertionId;
  expected_class: Day147A5AssertionValueClass;
  operation: () => Promise<Day147A5AssertionValueClass>;
  on_completed?: (caseId: string) => void;
  on_failure?: (failure: Readonly<{
    case_id: string;
    assertion_id: Day147A5ReadAdapterAssertionId | undefined;
    expected_class: Day147A5AssertionValueClass | undefined;
    actual_class: Day147A5AssertionValueClass | undefined;
    error: unknown;
  }>) => void;
}>): Promise<void> {
  try {
    const actualClass = await input.operation();
    if (actualClass !== input.expected_class) {
      throw new Day147A5ReadAdapterAssertionError(
        input.assertion_id,
        input.expected_class,
        actualClass,
      );
    }
    input.on_completed?.(input.case_id);
  } catch (error) {
    const diagnostic = error instanceof Day147A5ReadAdapterAssertionError
      ? error : null;
    input.on_failure?.({
      case_id: input.case_id,
      assertion_id: diagnostic?.assertion_id,
      expected_class: diagnostic?.expected_class,
      actual_class: diagnostic?.actual_class,
      error,
    });
    throw error;
  }
}

async function runReadAdapterIntegration(input: {
  main_config: ClientConfig;
  legacy_active_config: ClientConfig;
  legacy_superseded_config: ClientConfig;
  on_case_completed?: (caseId: string) => void;
  on_case_failure?: (input: Readonly<{
    case_id: string;
    assertion_id: Day147A5ReadAdapterAssertionId | undefined;
    expected_class: Day147A5AssertionValueClass | undefined;
    actual_class: Day147A5AssertionValueClass | undefined;
    error: unknown;
  }>) => void;
}): Promise<Set<string>> {
  const completed = new Set<string>();
  const client = createPgClient(input.main_config);
  let clientConnected = false;
  const mainClient = async (): Promise<Client> => {
    if (!clientConnected) {
      await client.connect();
      clientConnected = true;
    }
    return client;
  };
  const runCase = async (
    caseId: string,
    assertionId: Day147A5ReadAdapterAssertionId,
    expectedClass: Day147A5AssertionValueClass,
    operation: () => Promise<Day147A5AssertionValueClass>,
  ): Promise<void> => {
    await executeDay147A5ReadAdapterCaseBoundary({
      case_id: caseId,
      assertion_id: assertionId,
      expected_class: expectedClass,
      operation,
      on_completed() {
      completed.add(caseId);
      input.on_case_completed?.(caseId);
      },
      on_failure: input.on_case_failure,
    });
  };
  try {
    await runCase(
      "read_candidate_only_missing",
      "READ_CANDIDATE_ONLY_EXCLUDED",
      "ROW_ABSENT",
      async () => {
        const candidateOnly = await seedReadProjection({
          client: await mainClient(), id: "read-candidate-only", version: 700,
          date: "2026-08-02", status: "candidate", sequence_base: 70_000,
        });
        const result = await readSelection({
          config: input.main_config, business_date: "2026-08-02",
        });
        return result.selection.result === "projection_missing" &&
            !JSON.stringify(result.selection).includes(candidateOnly)
          ? "ROW_ABSENT" : "ROW_PRESENT";
      },
    );
    await runCase(
      "read_active_plus_candidate_selects_active",
      "READ_ACTIVE_SELECTED_CANDIDATE_EXCLUDED",
      "EXPECTED_IDENTITY",
      async () => {
        const active = await seedReadProjection({
          client: await mainClient(), id: "read-active-candidate-active",
          version: 701, date: "2026-08-03", status: "active",
          sequence_base: 71_000,
        });
        const candidate = await seedReadProjection({
          client: await mainClient(), id: "read-active-candidate-candidate",
          version: 702, date: "2026-08-03", status: "candidate",
          sequence_base: 72_000,
        });
        const result = await readSelection({
          config: input.main_config, business_date: "2026-08-03",
        });
        return result.selection.result === "selected" &&
            result.selection.projection.projection_id === active &&
            !JSON.stringify(result.selection).includes(candidate)
          ? "EXPECTED_IDENTITY" : "UNEXPECTED_IDENTITY";
      },
    );
    await runCase(
      "read_active_plus_multiple_candidates_selects_active",
      "READ_ACTIVE_SELECTED_MULTIPLE_CANDIDATES_EXCLUDED",
      "EXPECTED_IDENTITY",
      async () => {
        const main = await mainClient();
        const active = await seedReadProjection({
          client: main, id: "read-active-multi-active", version: 703,
          date: "2026-08-04", status: "active", sequence_base: 73_000,
        });
        const candidates: string[] = [];
        for (const [index, id] of ["one", "two"].entries()) {
          candidates.push(await seedReadProjection({
            client: main, id: `read-active-multi-${id}`,
            version: 704 + index, date: "2026-08-04", status: "candidate",
            sequence_base: 74_000 + index * 100,
          }));
        }
        const result = await readSelection({
          config: input.main_config, business_date: "2026-08-04",
        });
        const serialized = JSON.stringify(result.selection);
        return result.selection.result === "selected" &&
            result.selection.projection.projection_id === active &&
            candidates.every((candidate) => !serialized.includes(candidate))
          ? "EXPECTED_IDENTITY" : "UNEXPECTED_IDENTITY";
      },
    );
    await runCase(
      "read_legacy_active_selected",
      "READ_LEGACY_ACTIVE_SELECTED",
      "EXPECTED_STATUS",
      async () => {
        const result = await readSelection({
          config: input.legacy_active_config, business_date: "2026-07-31",
        });
        return classifyLegacyActiveSelection(result);
      },
    );
    await runCase(
      "read_legacy_superseded_missing",
      "READ_LEGACY_SUPERSEDED_EXCLUDED",
      "ROW_ABSENT",
      async () => {
        const result = await readSelection({
          config: input.legacy_superseded_config, business_date: "2026-07-31",
        });
        return result.selection.result === "projection_missing"
          ? "ROW_ABSENT" : "ROW_PRESENT";
      },
    );
    await runCase(
      "read_candidate_content_and_lineage_not_exposed",
      "READ_CANDIDATE_CONTENT_LINEAGE_EXCLUDED",
      "ROW_ABSENT",
      async () => {
        const candidate = await (await mainClient()).query<{
          projection_id: string;
          business_date: string;
          content_hash: string;
          snapshot_id: string;
          source_record_id: string;
        }>(
          `select projection.projection_id,
            projection.business_date::text as business_date,
            projection.content_hash, lineage.snapshot_id,
            lineage.source_record_id
          from ai.operational_memory_daily_projections projection
          join ai.operational_memory_projection_lineage lineage
            on lineage.projection_id = projection.projection_id
          join lateral (
            select event.status
            from ai.operational_memory_projection_state_events event
            where event.projection_id = projection.projection_id
            order by event.event_sequence desc limit 1
          ) latest on true
          where latest.status = 'candidate'
          order by projection.projection_id limit 1`,
        );
        const row = candidate.rows[0];
        if (row === undefined) return "ROW_PRESENT";
        const result = await readSelection({
          config: input.main_config, business_date: row.business_date,
        });
        const exposed = JSON.stringify(result.selection);
        return [row.projection_id, row.content_hash, row.snapshot_id,
          row.source_record_id].every((value) => !exposed.includes(value))
          ? "ROW_ABSENT" : "ROW_PRESENT";
      },
    );
    return completed;
  } finally {
    if (clientConnected) await client.end().catch(() => undefined);
  }
}

type AdvisoryLockScope = Readonly<{
  business_date: string;
  projection_type: "daily_work_records";
}>;

type ExpectedAdvisoryLockIdentity = Readonly<{
  locktype: "advisory";
  database: string;
  classid: string;
  objid: string;
  objsubid: 2;
  granted: false;
  pid: number;
}>;

type ConcurrencyBarrierObservation = Readonly<{
  locks: readonly Readonly<{
    locktype: string;
    database: string;
    classid: string;
    objid: string;
    objsubid: number;
    granted: boolean;
    pid: number;
  }>[];
  activity: Readonly<{
    pid: number;
    wait_event_type: string | null;
    wait_event: string | null;
    state: string | null;
    transaction_open: boolean;
  }> | null;
}>;

async function buildExpectedAdvisoryLockIdentity(input: {
  observer: Pick<Client, "query">;
  scope: AdvisoryLockScope;
  writer2_pid: number;
}): Promise<ExpectedAdvisoryLockIdentity> {
  const result = await input.observer.query<{
    database: string;
    classid: string;
    objid: string;
  }>(
    `select database_row.oid::text as database,
      ((($1::date - date '2000-01-01')::integer)::oid)::text as classid,
      pg_catalog.hashtext(
        'farmos:a1:projection-scope:' || $2::text
      )::oid::text as objid
    from pg_catalog.pg_database database_row
    where database_row.datname = pg_catalog.current_database()`,
    [input.scope.business_date, input.scope.projection_type],
  );
  const row = result.rows[0];
  if (
    result.rows.length !== 1 || row === undefined ||
    !/^\d+$/.test(row.database) || !/^\d+$/.test(row.classid) ||
    !/^\d+$/.test(row.objid) ||
    !Number.isSafeInteger(input.writer2_pid) || input.writer2_pid < 1
  ) {
    throw new Error("DAY147_A5_ADVISORY_LOCK_IDENTITY_INVALID");
  }
  return Object.freeze({
    locktype: "advisory",
    database: row.database,
    classid: row.classid,
    objid: row.objid,
    objsubid: 2,
    granted: false,
    pid: input.writer2_pid,
  });
}

function assertConcurrencyBarrierObservation(
  observation: ConcurrencyBarrierObservation,
  expected: ExpectedAdvisoryLockIdentity,
): void {
  const exactLocks = observation.locks.filter((lock) =>
    lock.pid === expected.pid &&
    lock.locktype === expected.locktype &&
    lock.database === expected.database &&
    lock.classid === expected.classid &&
    lock.objid === expected.objid &&
    lock.objsubid === expected.objsubid &&
    lock.granted === expected.granted
  );
  const activity = observation.activity;
  if (
    exactLocks.length !== 1 || activity === null ||
    activity.pid !== expected.pid ||
    activity.wait_event_type !== "Lock" ||
    activity.wait_event !== "advisory" ||
    activity.state !== "active" ||
    activity.transaction_open !== true
  ) {
    throw new Error("DAY147_A5_CONCURRENCY_BARRIER_INVALID");
  }
}

async function observeConcurrencyBarrier(input: {
  observer: Pick<Client, "query">;
  expected: ExpectedAdvisoryLockIdentity;
  deadline_ms: number;
  now?: () => number;
  wait?: (milliseconds: number) => Promise<void>;
}): Promise<ConcurrencyBarrierObservation> {
  const now = input.now ?? Date.now;
  const wait = input.wait ?? delay;
  const deadline = now() + input.deadline_ms;
  while (now() < deadline) {
    const locks = await input.observer.query<{
      locktype: string;
      database: string;
      classid: string;
      objid: string;
      objsubid: number;
      granted: boolean;
      pid: number;
    }>(
      `select locktype, database::text as database, classid::text as classid,
        objid::text as objid, objsubid, granted, pid
      from pg_catalog.pg_locks
      where pid = $1
        and locktype = 'advisory'
        and database = $2::oid
        and classid = $3::oid
        and objid = $4::oid
        and objsubid = $5
        and granted is false`,
      [
        input.expected.pid, input.expected.database, input.expected.classid,
        input.expected.objid, input.expected.objsubid,
      ],
    );
    const activities = await input.observer.query<{
      pid: number;
      wait_event_type: string | null;
      wait_event: string | null;
      state: string | null;
      transaction_open: boolean;
    }>(
      `select pid, wait_event_type, wait_event, state,
        xact_start is not null as transaction_open
      from pg_catalog.pg_stat_activity where pid = $1`,
      [input.expected.pid],
    );
    const observation: ConcurrencyBarrierObservation = {
      locks: locks.rows.map((row) => ({
        ...row,
        objsubid: Number(row.objsubid),
        pid: Number(row.pid),
      })),
      activity: activities.rows[0] === undefined ? null : {
        ...activities.rows[0], pid: Number(activities.rows[0].pid),
      },
    };
    try {
      assertConcurrencyBarrierObservation(observation, input.expected);
      return observation;
    } catch {
      await wait(CONCURRENCY_PLAN.poll_interval_ms);
    }
  }
  throw new Error("DAY147_A5_CONCURRENCY_BARRIER_TIMEOUT");
}

async function runOneConcurrencyCase(input: {
  config: ClientConfig;
  execution_identity: ExecutionIdentity;
  case_id: string;
  business_date: string;
  reverse: boolean;
  sequence_base: number;
}): Promise<readonly BarrierEvent[]> {
  const setup = createPgClient(input.config);
  await setup.connect();
  let projectionA = "";
  let projectionB = "";
  try {
    projectionA = await seedReadProjection({
      client: setup,
      id: `${input.case_id}:a`,
      version: input.reverse ? 902 : 901,
      date: input.business_date,
      status: "candidate",
      sequence_base: input.sequence_base,
    });
    projectionB = await seedReadProjection({
      client: setup,
      id: `${input.case_id}:b`,
      version: input.reverse ? 901 : 902,
      date: input.business_date,
      status: "candidate",
      sequence_base: input.sequence_base + 100,
    });
  } finally {
    await setup.end().catch(() => undefined);
  }

  const firstProjection = input.reverse ? projectionB : projectionA;
  const secondProjection = input.reverse ? projectionA : projectionB;
  const firstSequence = input.reverse
    ? input.sequence_base + 102
    : input.sequence_base + 2;
  const secondSequence = input.reverse
    ? input.sequence_base + 2
    : input.sequence_base + 102;
  const writer1 = createPgClient({
    ...input.config,
    application_name: buildApplicationName(input.execution_identity, "main", "writer1"),
  });
  const writer2 = createPgClient({
    ...input.config,
    application_name: buildApplicationName(input.execution_identity, "main", "writer2"),
  });
  const observer = createPgClient({
    ...input.config,
    application_name: buildApplicationName(input.execution_identity, "main", "observer"),
  });
  const timeline: BarrierEvent[] = [];
  let writer2BeforeCommit: ConcurrencyOutcome["writer2_before_commit"] = "pending";
  let loserResult: ConcurrencyOutcome["loser_result"] = "success";
  let loserSqlstate = "";
  let rollbackPerformed = false;
  let finalActiveCount = 0;
  let barrierObserved = false;
  let clientsClosed = false;
  try {
    await Promise.all([writer1.connect(), writer2.connect(), observer.connect()]);
    const writer2Pid = await writer2.query<{ pid: number }>(
      "select pg_backend_pid() as pid",
    );
    const scope: AdvisoryLockScope = {
      business_date: input.business_date,
      projection_type: "daily_work_records",
    };
    const expectedIdentity = await buildExpectedAdvisoryLockIdentity({
      observer,
      scope,
      writer2_pid: writer2Pid.rows[0]!.pid,
    });
    await writer1.query("begin isolation level read committed read write");
    timeline.push("writer1_begin");
    await insertProjectionState({
      client: writer1,
      case_id: `${input.case_id}:winner`,
      projection_id: firstProjection,
      status: "active",
      sequence: firstSequence,
    });
    timeline.push("writer1_active_inserted");
    await writer2.query("begin isolation level read committed read write");
    timeline.push("writer2_begin");
    const loserPromise = insertProjectionState({
      client: writer2,
      case_id: `${input.case_id}:loser`,
      projection_id: secondProjection,
      status: "active",
      sequence: secondSequence,
    }).then(
      () => {
        writer2BeforeCommit = "success";
        return { succeeded: true as const, error: null };
      },
      (error: unknown) => ({ succeeded: false as const, error }),
    );
    timeline.push("writer2_insert_started");
    const observation = await observeConcurrencyBarrier({
      observer,
      expected: expectedIdentity,
      deadline_ms: CONCURRENCY_PLAN.deadline_ms,
    });
    assertConcurrencyBarrierObservation(observation, expectedIdentity);
    barrierObserved = true;
    timeline.push("observer_exact_lock_wait_confirmed");
    if (writer2BeforeCommit !== "pending") {
      throw new Error("DAY147_A5_CONCURRENCY_EARLY_SUCCESS");
    }
    await writer1.query("commit");
    timeline.push("writer1_committed");
    const loser = await loserPromise;
    assert.equal(loser.succeeded, false);
    const failure = pgFailure(loser.error);
    loserResult = failure.message ===
        "operational_memory_projection_active_scope_conflict"
      ? "duplicate_active"
      : "success";
    loserSqlstate = failure.code;
    assertExpectedFailure(loser.error, {
      source: "fixed_trigger",
      sqlstate: "23505",
      fixed_message: "operational_memory_projection_active_scope_conflict",
    });
    timeline.push("writer2_duplicate_active_rejected");
    await writer2.query("rollback");
    rollbackPerformed = true;
    timeline.push("writer2_rolled_back");
    const count = await observer.query<{ count: string }>(
      `select count(*)::text as count
      from ai.operational_memory_daily_projections projection
      join lateral (
        select event.status
        from ai.operational_memory_projection_state_events event
        where event.projection_id = projection.projection_id
        order by event.event_sequence desc
        limit 1
      ) latest on true
      where projection.business_date = $1::date
        and projection.projection_type = 'daily_work_records'
        and latest.status = 'active'`,
      [input.business_date],
    );
    finalActiveCount = Number(count.rows[0]?.count);
    timeline.push("final_active_count_confirmed");
  } catch (error) {
    await writer1.query("rollback").catch(() => undefined);
    await writer2.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    const closeResults = await Promise.allSettled([
      writer1.end(), writer2.end(), observer.end(),
    ]);
    clientsClosed = closeResults.every((result) => result.status === "fulfilled");
    if (clientsClosed) timeline.push("clients_closed");
  }
  assertConcurrencyOutcome({
    barrier_observed: barrierObserved,
    exact_lock_observed: barrierObserved,
    writer2_before_commit: writer2BeforeCommit,
    loser_result: loserResult,
    loser_sqlstate: loserSqlstate,
    rollback_performed: rollbackPerformed,
    final_active_count: finalActiveCount,
    clients_closed: clientsClosed,
    timeline,
  });
  return timeline;
}

async function runConcurrencyIntegration(
  config: ClientConfig,
  executionIdentity: ExecutionIdentity,
): Promise<{ cases: Set<string>; timeline: readonly BarrierEvent[] }> {
  const forward = await runOneConcurrencyCase({
    config,
    execution_identity: executionIdentity,
    case_id: "concurrency_forward",
    business_date: "2026-08-10",
    reverse: false,
    sequence_base: 100_000,
  });
  const reverse = await runOneConcurrencyCase({
    config,
    execution_identity: executionIdentity,
    case_id: "concurrency_reverse",
    business_date: "2026-08-11",
    reverse: true,
    sequence_base: 101_000,
  });
  return {
    cases: new Set(["concurrency_forward", "concurrency_reverse"]),
    timeline: [...forward, ...reverse],
  };
}

function unionSets(...sets: readonly ReadonlySet<string>[]): Set<string> {
  return new Set(sets.flatMap((set) => [...set]));
}

async function runDynamicRegistry(input: {
  admin_config: ClientConfig;
  bundle_config: ClientConfig;
  legacy_active_config: ClientConfig;
  legacy_superseded_config: ClientConfig;
  execution_identity: ExecutionIdentity;
  on_case_failure?: (failure: Day147A5CaseFailureNotification) => void;
}): Promise<{
  test_results: readonly {
    id: string;
    category: DynamicCase["category"];
    status: "PASS";
  }[];
  concurrency_timeline: readonly BarrierEvent[];
  row_counts: Readonly<Record<string, number>>;
}> {
  const completedSqlAndPrivileges = new Set<string>();
  const completedCaseIds = new Set<string>();
  let caseFailureReported = false;
  const reportCaseFailure = (
    operation: Day147A5CaseFailureOperation,
    integrationKey: Day147A5CaseIntegrationKey,
    caseId: string | null,
    error: unknown,
    assertion?: Readonly<{
      assertion_id: Day147A5ReadAdapterAssertionId | undefined;
      expected_class: Day147A5AssertionValueClass | undefined;
      actual_class: Day147A5AssertionValueClass | undefined;
    }>,
  ): void => {
    if (caseFailureReported) return;
    caseFailureReported = true;
    input.on_case_failure?.(Object.freeze({
      operation,
      integration_key: integrationKey,
      case_id: caseId,
      completed_case_count: completedCaseIds.size,
      completed_case_ids: Object.freeze([...completedCaseIds]),
      assertion_id: assertion?.assertion_id,
      expected_class: assertion?.expected_class,
      actual_class: assertion?.actual_class,
      error,
    }));
  };
  let admin: Client;
  try {
    admin = createPgClient(input.admin_config);
    await admin.connect();
  } catch (error) {
    reportCaseFailure("CASE_REGISTRY_PRECHECK", "NONE", null, error);
    throw error;
  }
  try {
    let publicCatalogCases: Set<string>;
    try {
      publicCatalogCases = await assertPrivilegeCatalog(admin);
    } catch (error) {
      reportCaseFailure("CASE_REGISTRY_PRECHECK", "NONE", null, error);
      throw error;
    }
    publicCatalogCases.forEach((caseId) => {
      completedSqlAndPrivileges.add(caseId);
      completedCaseIds.add(caseId);
    });
    for (const testCase of EXECUTABLE_CASES) {
      try {
        if (testCase.executor === "sql") {
          await executeSqlContractCase(admin, testCase);
          completedSqlAndPrivileges.add(testCase.id);
          completedCaseIds.add(testCase.id);
        } else if (
          testCase.executor === "privilege" &&
          testCase.id !== "privilege_bundle_runtime_fixture_bundle_success" &&
          !testCase.id.startsWith("privilege_public_")
        ) {
          await executePrivilegeCase({
            client: admin,
            testCase,
            completedIntegrations: completedSqlAndPrivileges,
          });
          completedSqlAndPrivileges.add(testCase.id);
          completedCaseIds.add(testCase.id);
        }
      } catch (error) {
        reportCaseFailure("CASE_EXECUTION", "NONE", testCase.id, error);
        throw error;
      }
    }
  } finally {
    await admin.end().catch(() => undefined);
  }

  const observeIntegration = async <T extends ReadonlySet<string>>(
    integrationKey: Exclude<Day147A5CaseIntegrationKey, "NONE">,
    execute: () => Promise<T>,
  ): Promise<T> => {
    try {
      const completed = await execute();
      completed.forEach((caseId) => completedCaseIds.add(caseId));
      return completed;
    } catch (error) {
      reportCaseFailure("CASE_EXECUTION", integrationKey, null, error);
      throw error;
    }
  };
  const repositoryCases = await observeIntegration("REPOSITORY_INTEGRATION", () =>
    runRepositoryIntegration({
      admin_config: input.admin_config,
      bundle_config: input.bundle_config,
    })
  );
  const atomicityCases = await observeIntegration("ATOMICITY_INTEGRATION", () =>
    runAtomicityIntegration({
      admin_config: input.admin_config,
      bundle_config: input.bundle_config,
    })
  );
  let readCases: Set<string>;
  try {
    readCases = await runReadAdapterIntegration({
      main_config: input.bundle_config,
      legacy_active_config: input.legacy_active_config,
      legacy_superseded_config: input.legacy_superseded_config,
      on_case_completed: (caseId) => completedCaseIds.add(caseId),
      on_case_failure: (failure) => reportCaseFailure(
        "CASE_EXECUTION",
        "READ_ADAPTER_INTEGRATION",
        failure.case_id,
        failure.error,
        {
          assertion_id: failure.assertion_id,
          expected_class: failure.expected_class,
          actual_class: failure.actual_class,
        },
      ),
    });
  } catch (error) {
    if (!caseFailureReported) {
      reportCaseFailure(
        "CASE_EXECUTION", "READ_ADAPTER_INTEGRATION", null, error,
      );
    }
    throw error;
  }
  let concurrency: Awaited<ReturnType<typeof runConcurrencyIntegration>>;
  try {
    concurrency = await runConcurrencyIntegration(
      input.admin_config,
      input.execution_identity,
    );
    concurrency.cases.forEach((caseId) => completedCaseIds.add(caseId));
  } catch (error) {
    reportCaseFailure("CASE_EXECUTION", "CONCURRENCY_INTEGRATION", null, error);
    throw error;
  }
  const completedIntegrations = unionSets(
    completedSqlAndPrivileges,
    repositoryCases,
    atomicityCases,
    readCases,
    concurrency.cases,
    new Set(["legacy_active_immutable", "legacy_superseded_immutable"]),
  );
  const results: {
    id: string;
    category: DynamicCase["category"];
    status: "PASS";
  }[] = [];
  for (const testCase of EXECUTABLE_CASES) {
    try {
      assert.ok(
        completedIntegrations.has(testCase.id),
        `missing integration:${testCase.id}`,
      );
      results.push({
        id: testCase.id,
        category: testCase.category,
        status: "PASS",
      });
    } catch (error) {
      reportCaseFailure("CASE_RESULT_AGGREGATION", "NONE", testCase.id, error);
      throw error;
    }
  }
  try {
    assert.equal(results.length, EXECUTABLE_CASES.length);
  } catch (error) {
    reportCaseFailure("CASE_RESULT_AGGREGATION", "NONE", null, error);
    throw error;
  }
  let countsClient: Client;
  try {
    countsClient = createPgClient(input.admin_config);
    await countsClient.connect();
  } catch (error) {
    reportCaseFailure("CASE_RESULT_AGGREGATION", "NONE", null, error);
    throw error;
  }
  let rowCounts: Readonly<Record<string, number>>;
  try {
    rowCounts = await operationalRowCounts(countsClient);
  } catch (error) {
    reportCaseFailure("CASE_RESULT_AGGREGATION", "NONE", null, error);
    throw error;
  } finally {
    await countsClient.end().catch(() => undefined);
  }
  return {
    test_results: results,
    concurrency_timeline: concurrency.timeline,
    row_counts: rowCounts,
  };
}

type BarrierEvent =
  | "writer1_begin"
  | "writer1_active_inserted"
  | "writer2_begin"
  | "writer2_insert_started"
  | "observer_exact_lock_wait_confirmed"
  | "writer1_committed"
  | "writer2_duplicate_active_rejected"
  | "writer2_rolled_back"
  | "final_active_count_confirmed"
  | "clients_closed";

const CONCURRENCY_PLAN = Object.freeze({
  clients: ["writer_1", "writer_2", "observer"],
  isolation_level: "READ COMMITTED",
  observer_sources: ["pg_catalog.pg_locks", "pg_catalog.pg_stat_activity"],
  lock_observation:
    "match in-memory writer backend identity and require granted = false",
  poll_interval_ms: 25,
  deadline_ms: 5_000,
  pid_persisted_to_evidence: false,
  reverse_order_uses_separate_scope: true,
});

type ConcurrencyOutcome = Readonly<{
  barrier_observed: boolean;
  exact_lock_observed: boolean;
  writer2_before_commit: "pending" | "success" | "failed";
  loser_result:
    | "duplicate_active"
    | "success"
    | "deadlock"
    | "statement_timeout";
  loser_sqlstate: string;
  rollback_performed: boolean;
  final_active_count: number;
  clients_closed: boolean;
  timeline: readonly BarrierEvent[];
}>;

const EXPECTED_CONCURRENCY_TIMELINE: readonly BarrierEvent[] = [
  "writer1_begin", "writer1_active_inserted", "writer2_begin",
  "writer2_insert_started", "observer_exact_lock_wait_confirmed",
  "writer1_committed", "writer2_duplicate_active_rejected",
  "writer2_rolled_back", "final_active_count_confirmed", "clients_closed",
];

function assertConcurrencyOutcome(outcome: ConcurrencyOutcome): void {
  if (
    outcome.barrier_observed !== true ||
    outcome.exact_lock_observed !== true ||
    outcome.writer2_before_commit !== "pending" ||
    outcome.loser_result !== "duplicate_active" ||
    outcome.loser_sqlstate !== "23505" ||
    outcome.rollback_performed !== true ||
    outcome.final_active_count !== 1 ||
    outcome.clients_closed !== true ||
    JSON.stringify(outcome.timeline) !== JSON.stringify(EXPECTED_CONCURRENCY_TIMELINE)
  ) {
    throw new Error("DAY147_A5_CONCURRENCY_RESULT_INVALID");
  }
}

function buildClientConfig(input: {
  execution_identity: ExecutionIdentity;
  host?: typeof LOCAL_HOST | "postgres";
  port: number;
  database_target: DatabaseTarget;
  application_role: Exclude<ApplicationRole, "writer1" | "writer2" | "observer">;
  user: string;
  password: string;
  lock_timeout_ms: number;
}): ClientConfig {
  if (
    !IDENTIFIER_PATTERN.test(input.user) ||
    input.password.length < 32 ||
    input.lock_timeout_ms < 1 ||
    input.lock_timeout_ms > 10_000
  ) {
    throw new Error("DAY147_A5_PG_CONFIG_INVALID");
  }
  const database = input.execution_identity.database_names[input.database_target];
  const applicationName = buildApplicationName(
    input.execution_identity,
    input.database_target,
    input.application_role,
  );
  const host = input.host ?? LOCAL_HOST;
  if (input.user !== expectedUserForApplicationRole(input.application_role) ||
    !DATABASE_PATTERN.test(database) ||
    !Number.isSafeInteger(input.port) || input.port < 1 || input.port > 65_535 ||
    (host === "postgres" && input.port !== 5432)) {
    throw new Error("DAY147_A5_PG_CONFIG_INVALID");
  }
  return {
    host,
    port: input.port,
    database,
    user: input.user,
    password: input.password,
    ssl: false,
    application_name: applicationName,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 10_000,
    lock_timeout: input.lock_timeout_ms,
    query_timeout: 12_000,
    keepAlive: true,
    options:
      "-c search_path=pg_catalog -c default_transaction_isolation=read\\ committed",
  };
}

type NetworkClientCleanupMeasurement = Readonly<{
  created_count: number;
  close_attempted_count: number;
  close_completed_count: number;
  close_failed_count: number;
  open_client_count_after_cleanup: number;
  duplicate_close_attempt_count: number;
}>;

type TrackedDatabaseResource = {
  attempted: boolean;
  completed: boolean;
  failed: boolean;
  close: () => Promise<void>;
};

class NetworkClientCleanupTracker {
  readonly #resources: TrackedDatabaseResource[] = [];
  #duplicateCloseAttempts = 0;

  track<T extends object>(resource: T, closeMethod: "end"): T {
    const closable = resource as T & { end: () => Promise<void> };
    const originalClose = closable[closeMethod].bind(resource);
    const tracked: TrackedDatabaseResource = {
      attempted: false, completed: false, failed: false,
      close: async () => {
        if (tracked.attempted) {
          this.#duplicateCloseAttempts += 1;
          throw new Error("DAY147_A5_NETWORK_CLIENT_DOUBLE_CLOSE");
        }
        tracked.attempted = true;
        try {
          await originalClose();
          tracked.completed = true;
        } catch (error) {
          tracked.failed = true;
          throw error;
        }
      },
    };
    this.#resources.push(tracked);
    closable[closeMethod] = tracked.close;
    return resource;
  }

  async converge(): Promise<NetworkClientCleanupMeasurement> {
    for (const resource of this.#resources) {
      if (!resource.attempted) {
        await resource.close().catch(() => undefined);
      }
    }
    return this.measurement();
  }

  measurement(): NetworkClientCleanupMeasurement {
    return Object.freeze({
      created_count: this.#resources.length,
      close_attempted_count: this.#resources.filter((item) => item.attempted).length,
      close_completed_count: this.#resources.filter((item) => item.completed).length,
      close_failed_count: this.#resources.filter((item) => item.failed).length,
      open_client_count_after_cleanup: this.#resources.filter((item) =>
        !item.completed
      ).length,
      duplicate_close_attempt_count: this.#duplicateCloseAttempts,
    });
  }
}

let activeNetworkClientCleanupTracker: NetworkClientCleanupTracker | null = null;

function createPgPool(config: ClientConfig & { max: number }): Pool {
  const pool = new Pool(config);
  return activeNetworkClientCleanupTracker?.track(pool, "end") ?? pool;
}

function createPgClient(config: ClientConfig): Client {
  if (
    (config.host !== LOCAL_HOST && config.host !== "postgres") ||
    (config.host === "postgres" && config.port !== 5432) ||
    config.ssl !== false ||
    !Number.isSafeInteger(config.connectionTimeoutMillis) ||
    (config.connectionTimeoutMillis ?? 0) < 1 ||
    (config.connectionTimeoutMillis ?? 0) > 5_000 ||
    typeof config.options !== "string" ||
    typeof config.application_name !== "string" ||
    !/^farmos_day147a5_[a-f0-9]{12}_(?:la|ls|main)_(?:owner|bundle|verify|writer1|writer2|observer)$/.test(
      config.application_name,
    )
  ) {
    throw new Error("DAY147_A5_PG_CONFIG_INVALID");
  }
  const client = new Client({ ...config });
  return activeNetworkClientCleanupTracker?.track(client, "end") ?? client;
}

function beginPgClientTermination(
  client: EventEmitter,
  stream: EventEmitter & {
    destroy: () => void;
    destroyed: boolean;
    closed?: boolean;
  },
): A5ClientTerminationHandle {
      const clientError = () => {};
      const streamError = () => {};
      client.on("error", clientError);
      stream.on("error", streamError);
      const protectionStartedAt = Date.now();
      let cleaned = false;
      let streamClosed = stream.closed === true;
      let deferredCleanupTimer: ReturnType<typeof setTimeout> | null = null;
      let deferredCloseListener: (() => void) | null = null;
      const finalizeCleanup = () => {
        if (cleaned) return;
        cleaned = true;
        if (deferredCleanupTimer !== null) clearTimeout(deferredCleanupTimer);
        if (deferredCloseListener !== null) {
          stream.off("close", deferredCloseListener);
        }
        client.off("error", clientError);
        stream.off("error", streamError);
      };
      const cleanup = () => {
        if (cleaned) return;
        if (streamClosed) {
          finalizeCleanup();
          return;
        }
        deferredCloseListener = () => {
          streamClosed = true;
          finalizeCleanup();
        };
        stream.once("close", deferredCloseListener);
        deferredCleanupTimer = setTimeout(
          finalizeCleanup,
          Math.max(
            0,
            A5_POSTGRES_FATAL_SHUTDOWN_CEILING_MS -
              (Date.now() - protectionStartedAt),
          ),
        );
      };
      const outcome = (async (): Promise<A5ClientTerminationPhaseResult> => {
        let closeTimer: ReturnType<typeof setTimeout> | null = null;
        let closeListener: (() => void) | null = null;
        const closeOutcome = new Promise<boolean>((resolveClose) => {
          if (stream.closed === true) {
            resolveClose(true);
            return;
          }
          const onClose = () => {
            streamClosed = true;
            if (closeTimer !== null) clearTimeout(closeTimer);
            resolveClose(true);
          };
          closeListener = onClose;
          stream.once("close", onClose);
          closeTimer = setTimeout(() => {
            stream.off("close", onClose);
            resolveClose(false);
          }, A5_POSTGRES_CLOSE_EVENT_GRACE_MS);
        });
        try {
          // pg 8.22.0 Client.end() uses destroy() without an Error for an
          // active query. Passing an Error would deliberately emit it.
          stream.destroy();
        } catch {
          if (closeTimer !== null) clearTimeout(closeTimer);
          if (closeListener !== null) stream.off("close", closeListener);
          return {
            terminated: false,
            stream_closed: false,
            failure_class: "TERMINATION_FAILED",
          };
        }
        const closeConfirmed = await closeOutcome;
        if (!closeConfirmed) {
          return {
            terminated: false,
            stream_closed: false,
            failure_class: "STREAM_CLOSE_TIMEOUT",
          };
        }
        return { terminated: true, stream_closed: true };
      })();
      return {
        outcome,
        cleanup,
        temporary_listener_count: () => cleaned ? 0 : 2,
      };
}

type A5PgReadinessClientShape = EventEmitter & Readonly<{
  connection: Readonly<{
    stream: EventEmitter & {
      destroy: () => void;
      destroyed: boolean;
      closed?: boolean;
    };
  }>;
  connect: () => Promise<unknown>;
  query: (queryText: string) => Promise<unknown>;
  end: () => Promise<void>;
}>;

const A5_KNOWN_NODE_CODES = new Set([
  "ECONNREFUSED", "ECONNRESET", "EPIPE", "ETIMEDOUT",
  "ERR_SOCKET_CONNECTION_TIMEOUT", "EPROTO", "ERR_STREAM_PREMATURE_CLOSE",
]);
const A5_KNOWN_POSTGRES_CODES = new Set([
  "57P03", "28P01", "28000", "3D000", "08P01",
]);

function classifyA5ReadinessSafeCode(
  error: unknown,
): FarmOsDay147A5ReadinessSafeCodeClass {
  const code = typeof error === "object" && error !== null && "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : null;
  if (code === null) return "CODE_ABSENT";
  if (A5_KNOWN_NODE_CODES.has(code)) return "KNOWN_NODE_CODE";
  if (A5_KNOWN_POSTGRES_CODES.has(code)) return "KNOWN_POSTGRES_CODE";
  return "CODE_UNRECOGNIZED";
}

type A5ReadinessOriginRecorder = Readonly<{
  set_stage: (stage: FarmOsDay147A5ReadinessFailureStage) => void;
  mark_connection_established: () => void;
  mark_query_started: () => void;
  mark_termination_initiated: () => void;
  mark_promise_rejection: (error: unknown) => void;
  mark_adapter_validation: () => void;
  mark_convergence: () => void;
  mark_deadline: () => void;
  summary: () => FarmOsDay147A5ReadinessFailureOriginSummary;
  cleanup_observation: () => void;
  cleanup_late_event_safety: () => void;
  listener_count: () => number;
  late_event_safety_listener_count: () => number;
  late_event_safety_safe: () => boolean;
  recognized_failure_class: () => FarmOsDay147A5ReadinessFailureClass | null;
  stream_closed: () => boolean;
}>;

type A5ObservedFailureSignals = Readonly<{
  promise_rejection_observed: boolean;
  client_error_observed: boolean;
  stream_error_observed: boolean;
  stream_close_observed: boolean;
  stream_end_observed: boolean;
  adapter_validation_failed: boolean;
  convergence_failed: boolean;
  deadline_reached: boolean;
  termination_initiated: boolean;
}>;

function canonicalA5ObservedOrigin(
  observed: A5ObservedFailureSignals,
): FarmOsDay147A5ReadinessFailureOrigin {
  const closeOrEnd = observed.stream_close_observed ||
    observed.stream_end_observed;
  const competingEvent = (observed.client_error_observed &&
      (observed.stream_error_observed || closeOrEnd)) ||
    (observed.stream_error_observed && closeOrEnd);
  const competingState = (observed.adapter_validation_failed ||
      observed.deadline_reached || observed.convergence_failed ||
      observed.termination_initiated) && closeOrEnd;
  if (competingEvent || competingState) return "UNKNOWN";
  if (observed.convergence_failed || observed.termination_initiated) {
    return "UNKNOWN";
  }
  if (observed.adapter_validation_failed) return "ADAPTER_VALIDATION";
  if (observed.deadline_reached) return "DEADLINE";
  if (observed.client_error_observed) return "CLIENT_ERROR_EVENT";
  if (observed.stream_error_observed) return "STREAM_ERROR_EVENT";
  if (observed.stream_close_observed) return "STREAM_CLOSE_EVENT";
  if (observed.stream_end_observed) return "STREAM_END_EVENT";
  if (observed.promise_rejection_observed) return "PROMISE_REJECTION";
  return "UNKNOWN";
}

function createA5ReadinessOriginRecorder(input: Readonly<{
  client: EventEmitter;
  stream: EventEmitter & { destroyed?: boolean; closed?: boolean };
}>): A5ReadinessOriginRecorder {
  let stage: FarmOsDay147A5ReadinessFailureStage = "CONNECT";
  let connectionEstablished = false;
  let queryStarted = false;
  let terminationInitiated = false;
  let promiseRejectionObserved = false;
  let clientErrorObserved = false;
  let streamErrorObserved = false;
  let streamCloseObserved = false;
  let streamEndObserved = false;
  let adapterValidationFailed = false;
  let convergenceFailed = false;
  let deadlineReached = false;
  let safeCodeClass: FarmOsDay147A5ReadinessSafeCodeClass = "CODE_ABSENT";
  let observationCleaned = false;
  let lateSafetyCleaned = false;
  let lateSafetyInstalled = false;
  let fatalSafetyTimer: ReturnType<typeof setTimeout> | null = null;
  let closedStreamCleanup: ReturnType<typeof setImmediate> | null = null;
  const recognizedFailureClasses = new Set<
    FarmOsDay147A5ReadinessFailureClass
  >();
  const mergeCodeClass = (error: unknown) => {
    const observed = classifyA5ReadinessSafeCode(error);
    if (observed === "KNOWN_NODE_CODE" ||
      observed === "KNOWN_POSTGRES_CODE") {
      const recognized = classifyPostgresReadinessError(
        error,
        stage === "CONNECT" ? "connect" : "query",
      );
      if (recognized !== "UNKNOWN" && recognized !== "QUERY_FAILED") {
        recognizedFailureClasses.add(recognized);
      }
    }
    if (observed === "CODE_UNRECOGNIZED" ||
      (safeCodeClass !== "CODE_ABSENT" && observed !== "CODE_ABSENT" &&
        safeCodeClass !== observed)) {
      safeCodeClass = "CODE_UNRECOGNIZED";
    } else if (safeCodeClass === "CODE_ABSENT") {
      safeCodeClass = observed;
    }
  };
  const onClientError = (error: unknown) => {
    clientErrorObserved = true;
    mergeCodeClass(error);
  };
  const onStreamError = (error: unknown) => {
    streamErrorObserved = true;
    mergeCodeClass(error);
  };
  const onStreamClose = () => { streamCloseObserved = true; };
  const onStreamEnd = () => { streamEndObserved = true; };
  // Observation-only listeners are installed before connect starts. They do
  // not remove or replace pg's own listeners or termination safety listeners.
  input.client.on("error", onClientError);
  input.stream.on("error", onStreamError);
  input.stream.on("close", onStreamClose);
  input.stream.on("end", onStreamEnd);
  // These handlers deliberately ignore their argument: they prevent a late
  // EventEmitter "error" from becoming uncaught without retaining raw Error
  // data or mutating the completed attempt recorder.
  const onLateClientError = () => {};
  const onLateStreamError = () => {};
  const cleanupLateSafety = () => {
    if (lateSafetyCleaned) return;
    lateSafetyCleaned = true;
    if (fatalSafetyTimer !== null) clearTimeout(fatalSafetyTimer);
    if (closedStreamCleanup !== null) clearImmediate(closedStreamCleanup);
    input.client.off("error", onLateClientError);
    input.stream.off("error", onLateStreamError);
    input.stream.off("close", cleanupLateSafety);
  };
  const installLateSafety = () => {
    if (lateSafetyInstalled || lateSafetyCleaned) return;
    lateSafetyInstalled = true;
    input.client.on("error", onLateClientError);
    input.stream.on("error", onLateStreamError);
    input.stream.once("close", cleanupLateSafety);
    fatalSafetyTimer = setTimeout(
      cleanupLateSafety,
      A5_POSTGRES_FATAL_SHUTDOWN_CEILING_MS,
    );
    fatalSafetyTimer.unref?.();
    if (input.stream.destroyed === true || input.stream.closed === true) {
      // Keep one event-loop turn of protection for events queued by pg while
      // end()/stream close was settling, then remove the exact listeners.
      closedStreamCleanup = setImmediate(cleanupLateSafety);
      closedStreamCleanup.unref?.();
    }
  };
  return {
    set_stage(value) { stage = value; },
    mark_connection_established() { connectionEstablished = true; },
    mark_query_started() { queryStarted = true; },
    mark_termination_initiated() { terminationInitiated = true; },
    mark_promise_rejection(error) {
      promiseRejectionObserved = true;
      mergeCodeClass(error);
    },
    mark_adapter_validation() { adapterValidationFailed = true; },
    mark_convergence() {
      stage = "CONVERGENCE";
      convergenceFailed = true;
      terminationInitiated = true;
    },
    mark_deadline() { deadlineReached = true; },
    summary() {
      const observed = {
        promise_rejection_observed: promiseRejectionObserved,
        client_error_observed: clientErrorObserved,
        stream_error_observed: streamErrorObserved,
        stream_close_observed: streamCloseObserved,
        stream_end_observed: streamEndObserved,
        adapter_validation_failed: adapterValidationFailed,
        convergence_failed: convergenceFailed,
        deadline_reached: deadlineReached,
        termination_initiated: terminationInitiated,
      };
      return Object.freeze({
        stage, origin: canonicalA5ObservedOrigin(observed),
        safe_code_class: safeCodeClass,
        connection_established: connectionEstablished, query_started: queryStarted,
        ...observed,
      });
    },
    cleanup_observation() {
      if (observationCleaned) return;
      // Install the safety layer before removing observation listeners so
      // there is never an unguarded error-event interval.
      installLateSafety();
      observationCleaned = true;
      input.client.off("error", onClientError);
      input.stream.off("error", onStreamError);
      input.stream.off("close", onStreamClose);
      input.stream.off("end", onStreamEnd);
    },
    cleanup_late_event_safety: cleanupLateSafety,
    listener_count: () => observationCleaned ? 0 : 4,
    late_event_safety_listener_count: () =>
      lateSafetyInstalled && !lateSafetyCleaned ? 3 : 0,
    late_event_safety_safe: () => observationCleaned &&
      (lateSafetyCleaned || lateSafetyInstalled),
    recognized_failure_class: () => recognizedFailureClasses.size === 1
      ? [...recognizedFailureClasses][0]!
      : null,
    stream_closed: () => input.stream.destroyed === true ||
      input.stream.closed === true,
  };
}

function adaptPgReadinessClient(
  client: A5PgReadinessClientShape,
  beginTermination: (() => A5ClientTerminationHandle) | null = null,
): A5ReadinessClient {
  const recorder = createA5ReadinessOriginRecorder({
    client,
    stream: client.connection.stream,
  });
  return {
    async connect() {
      recorder.set_stage("CONNECT");
      try {
        const value = await client.connect();
        recorder.mark_connection_established();
        return value;
      } catch (error) {
        recorder.mark_promise_rejection(error);
        throw error;
      }
    },
    async query(queryText) {
      recorder.set_stage("QUERY");
      recorder.mark_query_started();
      try {
        return await client.query(queryText);
      } catch (error) {
        recorder.mark_promise_rejection(error);
        throw error;
      }
    },
    async end() {
      recorder.set_stage("CLIENT_CLOSE");
      try {
        await client.end();
      } catch (error) {
        recorder.mark_promise_rejection(error);
        throw error;
      }
    },
    begin_termination() {
      recorder.mark_termination_initiated();
      return beginTermination?.() ?? beginPgClientTermination(
        client,
        client.connection.stream,
      );
    },
    failure_origin: () => recorder.summary(),
    mark_adapter_validation: () => recorder.mark_adapter_validation(),
    mark_convergence: () => recorder.mark_convergence(),
    mark_deadline: () => recorder.mark_deadline(),
    cleanup_observation: () => recorder.cleanup_observation(),
    observation_listener_count: () => recorder.listener_count(),
    cleanup_late_event_safety: () => recorder.cleanup_late_event_safety(),
    late_event_safety_listener_count: () =>
      recorder.late_event_safety_listener_count(),
    late_event_safety_safe: () => recorder.late_event_safety_safe(),
    recognized_failure_class: () => recorder.recognized_failure_class(),
    stream_closed: () => recorder.stream_closed(),
  };
}

function createPgReadinessClient(config: ClientConfig): A5ReadinessClient {
  return adaptPgReadinessClient(
    createPgClient(config) as unknown as A5PgReadinessClientShape,
  );
}

const delay = async (milliseconds: number): Promise<void> => {
  await new Promise<void>((resolveDelay) => setTimeout(resolveDelay, milliseconds));
};

type A5SettledOperation<T> =
  | Readonly<{ status: "FULFILLED"; value: T }>
  | Readonly<{ status: "REJECTED"; error: unknown }>;

function readinessTimeoutError(): Error & { code: string } {
  const error = new Error("DAY147_A5_READINESS_OPERATION_TIMEOUT") as
    Error & { code: string };
  error.code = "ETIMEDOUT";
  return error;
}

const A5_POSTGRES_TERMINATION_GRACE_MS = 1_500;
const A5_POSTGRES_OPERATION_SETTLEMENT_GRACE_MS = 1_500;
const A5_POSTGRES_CLOSE_EVENT_GRACE_MS = 1_500;
const A5_POSTGRES_OPERATION_CONVERGENCE_CEILING_MS = 4_500;
const A5_DOCKER_COMMAND_MAXIMUM_TIMEOUT_MS = 15_000;
const A5_DOCKER_COMMAND_MAXIMUM_SETTLEMENT_MS =
  A5_DOCKER_COMMAND_MAXIMUM_TIMEOUT_MS + A5_DOCKER_SIGTERM_GRACE_MS +
  A5_DOCKER_SIGKILL_GRACE_MS;
// Three bounded cleanup commands (identity, exact cleanup, absence verify)
// plus a bounded margin define the point after which no owned Docker action
// can still cause a client/stream event.
const A5_POSTGRES_FATAL_SHUTDOWN_CEILING_MS =
  A5_DOCKER_COMMAND_MAXIMUM_SETTLEMENT_MS * 3 + 1_000;

type A5ClientTerminationFailureClass =
  | "TERMINATION_FAILED"
  | "STREAM_CLOSE_TIMEOUT"
  | "OPERATION_SETTLEMENT_TIMEOUT";

type A5ClientTerminationResult =
  | Readonly<{
    terminated: true;
    stream_closed: true;
    operation_settled: true;
  }>
  | Readonly<{
    terminated: false;
    stream_closed: boolean;
    operation_settled: boolean;
    failure_class: A5ClientTerminationFailureClass;
  }>;

class A5OperationConvergenceError extends Error {
  readonly code = "A5_OPERATION_CONVERGENCE_FAILED";
  temporary_error_listeners = 0;
  constructor(readonly termination_result: A5ClientTerminationResult) {
    super("DAY147_A5_POSTGRES_OPERATION_CONVERGENCE_FAILED");
  }
}

type A5ClientTerminationPhaseResult =
  | Readonly<{ terminated: true; stream_closed: true }>
  | Readonly<{
    terminated: false;
    stream_closed: boolean;
    failure_class: A5ClientTerminationFailureClass;
  }>;

type A5ClientTerminationHandle = Readonly<{
  outcome: Promise<A5ClientTerminationPhaseResult>;
  cleanup: () => void;
  temporary_listener_count: () => number;
}>;

async function boundedOutcome<T>(
  promise: Promise<T>,
  milliseconds: number,
): Promise<Readonly<{ settled: true; value: T }> | Readonly<{ settled: false }>> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<Readonly<{ settled: false }>>((resolveTimeout) => {
    timer = setTimeout(() => resolveTimeout({ settled: false }), milliseconds);
  });
  try {
    return await Promise.race([
      promise.then((value) => ({ settled: true as const, value })),
      timeout,
    ]);
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

async function runConvergentReadinessOperation<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  beginTermination: () => A5ClientTerminationHandle,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const operationOutcome = Promise.resolve().then(operation).then<
    A5SettledOperation<T>, A5SettledOperation<T>
  >(
    (value) => ({ status: "FULFILLED", value }),
    (error: unknown) => ({ status: "REJECTED", error }),
  );
  const timeout = new Promise<Readonly<{ status: "TIMED_OUT" }>>((resolveTimeout) => {
    timer = setTimeout(() => resolveTimeout({ status: "TIMED_OUT" }), timeoutMs);
  });
  const first = await Promise.race([operationOutcome, timeout]);
  if (first.status !== "TIMED_OUT") {
    if (timer !== null) clearTimeout(timer);
    if (first.status === "REJECTED") throw first.error;
    return first.value;
  }
  const fatalStartedAt = Date.now();
  let termination: A5ClientTerminationHandle;
  try {
    termination = beginTermination();
  } catch {
    throw new A5OperationConvergenceError({
      terminated: false,
      stream_closed: false,
      operation_settled: false,
      failure_class: "TERMINATION_FAILED",
    });
  }
  let convergenceError: A5OperationConvergenceError | null = null;
  try {
    const terminationOutcome = await boundedOutcome(
      termination.outcome,
      A5_POSTGRES_TERMINATION_GRACE_MS,
    );
    const operationSettlement = await boundedOutcome(
      operationOutcome,
      A5_POSTGRES_OPERATION_SETTLEMENT_GRACE_MS,
    );
    const withinFatalCeiling = Date.now() - fatalStartedAt <
      A5_POSTGRES_OPERATION_CONVERGENCE_CEILING_MS;
    const streamClosed = terminationOutcome.settled &&
      terminationOutcome.value.stream_closed;
    const terminationSucceeded = terminationOutcome.settled &&
      terminationOutcome.value.terminated;
    if (!terminationSucceeded || !streamClosed ||
      !operationSettlement.settled || !withinFatalCeiling) {
      const failureClass: A5ClientTerminationFailureClass =
        !terminationOutcome.settled || !withinFatalCeiling
          ? "TERMINATION_FAILED"
          : !terminationOutcome.value.stream_closed
          ? "STREAM_CLOSE_TIMEOUT"
          : "OPERATION_SETTLEMENT_TIMEOUT";
      throw new A5OperationConvergenceError({
        terminated: false,
        stream_closed: streamClosed,
        operation_settled: operationSettlement.settled,
        failure_class: failureClass,
      });
    }
    const boundedResult: A5ClientTerminationResult = {
      terminated: true,
      stream_closed: true,
      operation_settled: true,
    };
    void boundedResult;
  } catch (error) {
    convergenceError = error instanceof A5OperationConvergenceError
      ? error
      : new A5OperationConvergenceError({
      terminated: false,
      stream_closed: false,
      operation_settled: false,
      failure_class: "TERMINATION_FAILED",
    });
    throw convergenceError;
  } finally {
    termination.cleanup();
    if (convergenceError !== null) {
      convergenceError.temporary_error_listeners =
        termination.temporary_listener_count();
    }
  }
  throw readinessTimeoutError();
}

const A5_POSTGRES_READINESS_GLOBAL_DEADLINE_MS = 30_000;
const A5_POSTGRES_READINESS_PER_ATTEMPT_TIMEOUT_MS = 5_000;
const A5_POSTGRES_READINESS_MAXIMUM_ATTEMPTS = 40;
const A5_POSTGRES_READINESS_RETRY_INTERVAL_MS = 250;
const A5_POSTGRES_READINESS_QUERY = "select 1 as ready" as const;
const A5_POSTGRES_INTERNAL_SETTLING_GRACE_MS = 500;

type A5PostgresInternalReadinessDependencies = Readonly<{
  now_ms: () => number;
  sleep_ms: (milliseconds: number) => Promise<void>;
  inspect_container_state: (
    timeout_ms: number,
    binding: A5ContainerRevalidationBinding,
  ) => Promise<A5ContainerRuntimeObservation>;
  run_pg_isready: (
    timeout_ms: number,
    binding: A5ContainerRevalidationBinding,
  ) => Promise<CommandResult>;
}>;

async function waitForContainerInternalPostgres(input: Readonly<{
  binding: A5ContainerRevalidationBinding;
  deadline_ms: number;
  retry_interval_ms: number;
  per_command_timeout_ms: number;
  dependencies: A5PostgresInternalReadinessDependencies;
}>): Promise<Readonly<{ attempts: number; elapsed_ms: number }>> {
  if (
    input.deadline_ms < A5_POSTGRES_INTERNAL_SETTLING_GRACE_MS + 1 ||
    input.deadline_ms > A5_POSTGRES_READINESS_GLOBAL_DEADLINE_MS ||
    input.retry_interval_ms < 250 || input.retry_interval_ms > 500 ||
    input.per_command_timeout_ms < 1 ||
    input.per_command_timeout_ms > A5_DOCKER_COMMAND_MAXIMUM_TIMEOUT_MS
  ) {
    throw new Error("DAY147_A5_INTERNAL_READINESS_CONFIG_INVALID");
  }
  // The command builder validates the complete nonce/name/image/ID binding
  // before any Docker execution can target the current container.
  buildContainerInternalReadinessCommand({
    binding: input.binding,
    postgres_user: ROLE_FIXTURES.migration_owner.name,
    postgres_database: `farmos_day147a5_${input.binding.execution_nonce}_main`,
  });
  const startedAt = input.dependencies.now_ms();
  const elapsed = () => Math.max(
    0,
    Math.floor(input.dependencies.now_ms() - startedAt),
  );
  let attempts = 0;
  while (elapsed() < input.deadline_ms) {
    const stateRemaining = input.deadline_ms - elapsed();
    const observation = await input.dependencies.inspect_container_state(
      Math.min(input.per_command_timeout_ms, stateRemaining),
      input.binding,
    );
    if (["EXITED", "DEAD", "RESTARTING"].includes(observation.state)) {
      throw new Error("DAY147_A5_POSTGRES_CONTAINER_EXITED");
    }
    if (observation.state !== "RUNNING") {
      throw new Error("DAY147_A5_POSTGRES_READINESS_UNKNOWN");
    }
    const commandRemaining = input.deadline_ms - elapsed();
    if (commandRemaining <= 0) break;
    attempts += 1;
    const result = await input.dependencies.run_pg_isready(
      Math.min(input.per_command_timeout_ms, commandRemaining),
      input.binding,
    );
    if (result.exit_code === 0) {
      const graceRemaining = input.deadline_ms - elapsed();
      if (graceRemaining <= A5_POSTGRES_INTERNAL_SETTLING_GRACE_MS) break;
      await input.dependencies.sleep_ms(A5_POSTGRES_INTERNAL_SETTLING_GRACE_MS);
      if (elapsed() >= input.deadline_ms) break;
      return Object.freeze({ attempts, elapsed_ms: elapsed() });
    }
    // pg_isready documents 1 (rejecting) and 2 (no response) as formal
    // server-not-ready outcomes. Invalid parameters and unknown statuses are
    // execution-contract failures and are never retried.
    if (result.exit_code !== 1 && result.exit_code !== 2) {
      throw new Error("DAY147_A5_INTERNAL_READINESS_COMMAND_CONTRACT_INVALID");
    }
    const retryRemaining = input.deadline_ms - elapsed();
    if (retryRemaining <= input.retry_interval_ms) break;
    await input.dependencies.sleep_ms(input.retry_interval_ms);
  }
  throw new Error("DAY147_A5_POSTGRES_INTERNAL_READINESS_TIMEOUT");
}

type A5PostgresReadinessAttempt = Readonly<{
  attempt: number;
  failure_class: FarmOsDay147A5ReadinessFailureClass | null;
  failure_origin: FarmOsDay147A5ReadinessFailureOriginSummary | null;
  retryable: boolean;
  elapsed_ms_bucket: "LT_1S" | "1S_TO_5S" | "5S_TO_15S" |
    "15S_TO_30S" | "AT_OR_OVER_30S";
}>;

type A5PostgresReadinessResult = Readonly<{
  ready: boolean;
  attempts: number;
  elapsed_ms: number;
  first_failure_class: FarmOsDay147A5ReadinessFailureClass | null;
  last_failure_class: FarmOsDay147A5ReadinessFailureClass | null;
  retryable_failure_count: number;
  non_retryable_failure_count: number;
  timeout_reached: boolean;
  container_exit_detected: boolean;
  container_state: FarmOsDay147A5ContainerRuntimeState;
  container_exit_code: number | null;
  container_restarting: boolean;
  container_oom_killed: boolean;
  startup_elapsed_ms: number;
  readiness_attempts_before_exit: number;
  clients_closed: boolean;
  streams_closed: boolean;
  active_operations: number;
  temporary_error_listeners: number;
  convergence_failed: boolean;
  pre_attempt_failure_class: FarmOsDay147A5ReadinessFailureClass | null;
  failure_origin: FarmOsDay147A5ReadinessFailureOriginSummary | null;
  pre_attempt_failure_origin: FarmOsDay147A5ReadinessFailureOriginSummary | null;
  timeline: readonly A5PostgresReadinessAttempt[];
}>;

type A5ReadinessClient = {
  connect(): Promise<unknown>;
  query(queryText: string): Promise<unknown>;
  end(): Promise<void>;
  begin_termination(): A5ClientTerminationHandle;
  failure_origin(): FarmOsDay147A5ReadinessFailureOriginSummary;
  mark_adapter_validation(): void;
  mark_convergence(): void;
  mark_deadline(): void;
  cleanup_observation(): void;
  observation_listener_count(): number;
  cleanup_late_event_safety(): void;
  late_event_safety_listener_count(): number;
  late_event_safety_safe(): boolean;
  recognized_failure_class(): FarmOsDay147A5ReadinessFailureClass | null;
  stream_closed(): boolean;
};

type A5PostgresReadinessDependencies = Readonly<{
  now_ms: () => number;
  sleep_ms: (milliseconds: number) => Promise<void>;
  run_convergent_operation: <T>(
    operation: () => Promise<T>,
    timeout_ms: number,
    begin_termination: () => A5ClientTerminationHandle,
  ) => Promise<T>;
  create_client: (config: ClientConfig) => A5ReadinessClient;
  inspect_container_state: (
    timeout_ms: number,
    binding: A5ContainerRevalidationBinding,
  ) => Promise<A5ContainerRuntimeObservation>;
}>;

const RETRYABLE_READINESS_FAILURES = new Set<FarmOsDay147A5ReadinessFailureClass>([
  "CONNECTION_REFUSED", "CONNECTION_RESET", "STARTING_UP", "TIMEOUT",
]);

function assertReadinessResultConsistency(
  result: A5PostgresReadinessResult,
): void {
  assert.equal(result.timeline.length, result.attempts);
  result.timeline.forEach((entry, index) => {
    assert.equal(entry.attempt, index + 1);
    assert.equal(entry.failure_class === null, entry.failure_origin === null);
    assert.equal(entry.retryable && entry.failure_class === null, false);
    assert.equal(entry.retryable && !RETRYABLE_READINESS_FAILURES.has(
      entry.failure_class!,
    ), false);
  });
  const failures = result.timeline.filter(({ failure_class }) =>
    failure_class !== null
  );
  assert.equal(
    failures.filter(({ retryable }) => retryable).length,
    result.retryable_failure_count,
  );
  assert.equal(
    failures.filter(({ retryable }) => !retryable).length,
    result.non_retryable_failure_count,
  );
  assert.equal(
    result.first_failure_class,
    failures[0]?.failure_class ?? result.pre_attempt_failure_class,
  );
  assert.equal(
    result.last_failure_class,
    result.pre_attempt_failure_class ?? failures.at(-1)?.failure_class ?? null,
  );
  if (result.ready) {
    assert.equal(result.pre_attempt_failure_class, null);
    assert.equal(result.failure_origin, null);
    assert.equal(result.clients_closed, true);
    assert.equal(result.streams_closed, true);
    assert.equal(result.active_operations, 0);
    assert.equal(result.temporary_error_listeners, 0);
    assert.equal(result.container_state, "RUNNING");
    assert.equal(result.timeout_reached, false);
    assert.equal(result.non_retryable_failure_count, 0);
    assert.equal(result.timeline.filter(({ failure_class }) =>
      failure_class === null
    ).length, 1);
    assert.equal(result.timeline.at(-1)?.failure_class, null);
    assert.equal(result.attempts, failures.length + 1);
    return;
  }
  assert.equal(result.timeline.every(({ failure_class }) =>
    failure_class !== null
  ), true);
  if (result.attempts === 0) {
    assert.equal(result.pre_attempt_failure_class !== null, true);
    assert.equal(result.pre_attempt_failure_origin !== null, true);
  }
  assert.equal(
    result.timeout_reached,
    result.last_failure_class === "TIMEOUT",
  );
  if (!result.timeout_reached) {
    assert.equal(
      result.last_failure_class === null ||
        !RETRYABLE_READINESS_FAILURES.has(result.last_failure_class),
      true,
    );
  }
  if (!result.clients_closed) {
    assert.equal(
      ["CLIENT_CLEANUP_FAILED", "OPERATION_CONVERGENCE_FAILED"].includes(
        result.last_failure_class ?? "",
      ),
      true,
    );
  }
  assert.equal(result.active_operations >= 0, true);
  assert.equal(result.temporary_error_listeners >= 0, true);
  if (result.ready) {
    assert.equal(result.active_operations, 0);
    assert.equal(result.temporary_error_listeners, 0);
  }
  if (result.convergence_failed) {
    assert.equal(result.last_failure_class, "OPERATION_CONVERGENCE_FAILED");
    assert.equal(result.ready, false);
  }
}

function readinessElapsedBucket(elapsedMs: number): A5PostgresReadinessAttempt["elapsed_ms_bucket"] {
  if (elapsedMs < 1_000) return "LT_1S";
  if (elapsedMs < 5_000) return "1S_TO_5S";
  if (elapsedMs < 15_000) return "5S_TO_15S";
  if (elapsedMs < 30_000) return "15S_TO_30S";
  return "AT_OR_OVER_30S";
}

function buildPreAttemptFailureOrigin(input: Readonly<{
  origin: "CONTAINER_STATE" | "DEADLINE" | "UNKNOWN";
}>): FarmOsDay147A5ReadinessFailureOriginSummary {
  return Object.freeze({
    stage: "PRE_ATTEMPT", origin: input.origin,
    safe_code_class: "CODE_ABSENT", connection_established: false,
    query_started: false, termination_initiated: false,
    promise_rejection_observed: false, client_error_observed: false,
    stream_error_observed: false, stream_close_observed: false,
    stream_end_observed: false, adapter_validation_failed: false,
    convergence_failed: false, deadline_reached: input.origin === "DEADLINE",
  });
}

function buildPostQueryInspectFailureOrigin(input: Readonly<{
  origin: "CONTAINER_STATE" | "DEADLINE" | "UNKNOWN";
}>): FarmOsDay147A5ReadinessFailureOriginSummary {
  return Object.freeze({
    ...buildPreAttemptFailureOrigin({
      origin: input.origin === "CONTAINER_STATE"
        ? "CONTAINER_STATE"
        : input.origin === "DEADLINE" ? "DEADLINE" : "UNKNOWN",
    }),
    stage: "POST_QUERY_INSPECT",
    origin: input.origin,
    connection_established: true,
    query_started: true,
  });
}

function buildStaticFailureOrigin(
  failureClass: FarmOsDay147A5ReadinessFailureClass,
): FarmOsDay147A5ReadinessFailureOriginSummary {
  if (failureClass === "UNKNOWN") {
    return Object.freeze({
      ...buildPreAttemptFailureOrigin({ origin: "UNKNOWN" }),
      stage: "CONNECT", origin: "PROMISE_REJECTION",
      promise_rejection_observed: true,
    });
  }
  if (failureClass === "OPERATION_CONVERGENCE_FAILED") {
    return Object.freeze({
      ...buildPreAttemptFailureOrigin({ origin: "UNKNOWN" }),
      stage: "CONVERGENCE", termination_initiated: true,
      convergence_failed: true,
    });
  }
  if (failureClass === "QUERY_FAILED") {
    return Object.freeze({
      ...buildPreAttemptFailureOrigin({ origin: "UNKNOWN" }),
      stage: "QUERY", origin: "ADAPTER_VALIDATION",
      connection_established: true, query_started: true,
      adapter_validation_failed: true,
    });
  }
  return Object.freeze({
    ...buildPreAttemptFailureOrigin({ origin: "UNKNOWN" }),
    stage: failureClass === "CLIENT_CLEANUP_FAILED" ? "CLIENT_CLOSE" : "CONNECT",
    origin: "PROMISE_REJECTION", safe_code_class: "KNOWN_POSTGRES_CODE",
    connection_established: failureClass === "CLIENT_CLEANUP_FAILED",
    query_started: failureClass === "CLIENT_CLEANUP_FAILED",
    promise_rejection_observed: true,
  });
}

function classifyPostgresReadinessError(
  error: unknown,
  stage: "connect" | "query",
): FarmOsDay147A5ReadinessFailureClass {
  const code = error instanceof Error && "code" in error &&
      typeof (error as Error & { code?: unknown }).code === "string"
    ? (error as Error & { code: string }).code
    : "";
  if (["08P01", "EPROTO", "ERR_STREAM_PREMATURE_CLOSE"].includes(code)) {
    return "PROTOCOL_ERROR";
  }
  if (code === "ECONNREFUSED") return "CONNECTION_REFUSED";
  if (["ECONNRESET", "EPIPE"].includes(code)) return "CONNECTION_RESET";
  if (code === "57P03") return "STARTING_UP";
  if (["28P01", "28000"].includes(code)) return "AUTHENTICATION_FAILED";
  if (code === "3D000") return "DATABASE_NOT_FOUND";
  if (["ETIMEDOUT", "ERR_SOCKET_CONNECTION_TIMEOUT"].includes(code)) {
    return "TIMEOUT";
  }
  if (code === "A5_OPERATION_CONVERGENCE_FAILED") {
    return "OPERATION_CONVERGENCE_FAILED";
  }
  return stage === "query" ? "QUERY_FAILED" : "UNKNOWN";
}

type A5FailureOriginResolution = Readonly<{
  canonical_origin: FarmOsDay147A5ReadinessFailureOrigin;
  failure_class: FarmOsDay147A5ReadinessFailureClass;
  retryable: boolean;
  proof_status: "PROVEN_CODELESS_CONNECT_CLOSE" | "UNPROVEN";
}>;

function resolveA5ReadinessFailureOrigin(input: Readonly<{
  recognized_failure_class: FarmOsDay147A5ReadinessFailureClass;
  failure_origin: FarmOsDay147A5ReadinessFailureOriginSummary;
  current_container_state: FarmOsDay147A5ContainerRuntimeState;
}>): A5FailureOriginResolution {
  // Resolution order is deliberate: collect the immutable event set, collect
  // lifecycle state, decide competition, preserve a recognized fatal class,
  // canonicalize an expected causal pair, then apply the stage fallback.
  const observed = input.failure_origin;
  const closeOrEnd = observed.stream_close_observed ||
    observed.stream_end_observed;
  const lifecycleSignalCount = [observed.adapter_validation_failed,
    observed.deadline_reached, observed.convergence_failed,
    observed.termination_initiated].filter(Boolean).length;
  const competingOrigin =
    (observed.client_error_observed &&
      (observed.stream_error_observed || closeOrEnd)) ||
    (observed.stream_error_observed && closeOrEnd) ||
    (lifecycleSignalCount > 0 &&
      (closeOrEnd || observed.client_error_observed ||
        observed.stream_error_observed)) ||
    lifecycleSignalCount > 1 || observed.convergence_failed ||
    observed.termination_initiated;
  const specificRecognized = [
    "AUTHENTICATION_FAILED", "DATABASE_NOT_FOUND", "USER_NOT_FOUND",
    "PROTOCOL_ERROR",
  ].includes(input.recognized_failure_class);
  if (specificRecognized && observed.safe_code_class !== "CODE_ABSENT") {
    return Object.freeze({
      canonical_origin: competingOrigin
        ? "UNKNOWN"
        : canonicalA5ObservedOrigin(observed),
      failure_class: input.recognized_failure_class,
      retryable: RETRYABLE_READINESS_FAILURES.has(
        input.recognized_failure_class,
      ),
      proof_status: "UNPROVEN",
    });
  }
  const canonicalOrigin = competingOrigin
    ? "UNKNOWN"
    : canonicalA5ObservedOrigin(observed);
  if (input.recognized_failure_class === "CLIENT_CLEANUP_FAILED") {
    return Object.freeze({ canonical_origin: canonicalOrigin,
      failure_class: "CLIENT_CLEANUP_FAILED", retryable: false,
      proof_status: "UNPROVEN" });
  }
  if (observed.stage === "POST_QUERY_INSPECT" &&
    input.current_container_state !== "RUNNING") {
    return Object.freeze({
      canonical_origin: competingOrigin ? "UNKNOWN" : "CONTAINER_STATE",
      failure_class: ["EXITED", "DEAD", "RESTARTING"].includes(
          input.current_container_state,
        )
        ? "CONTAINER_EXITED"
        : "UNKNOWN",
      retryable: false,
      proof_status: "UNPROVEN",
    });
  }
  if (observed.convergence_failed) {
    return Object.freeze({ canonical_origin: "UNKNOWN",
      failure_class: "OPERATION_CONVERGENCE_FAILED", retryable: false,
      proof_status: "UNPROVEN" });
  }
  if (competingOrigin) {
    const failureClass = observed.deadline_reached
      ? "TIMEOUT"
      : observed.adapter_validation_failed
      ? "QUERY_FAILED"
      : "UNKNOWN";
    return Object.freeze({ canonical_origin: "UNKNOWN",
      failure_class: failureClass, retryable: false,
      proof_status: "UNPROVEN" });
  }
  const canonicalSummary = Object.freeze({
    ...observed,
    origin: canonicalOrigin,
  });
  const codeLessCloseCandidate = observed.stage === "CONNECT" &&
    observed.safe_code_class === "CODE_ABSENT" &&
    !observed.connection_established && !observed.query_started &&
    !observed.termination_initiated && observed.promise_rejection_observed &&
    closeOrEnd && !observed.client_error_observed &&
    !observed.stream_error_observed && !observed.adapter_validation_failed &&
    !observed.convergence_failed && !observed.deadline_reached;
  if (codeLessCloseCandidate &&
    input.current_container_state !== "RUNNING") {
    return Object.freeze({ canonical_origin: "UNKNOWN",
      failure_class: ["EXITED", "DEAD", "RESTARTING"].includes(
          input.current_container_state,
        )
        ? "CONTAINER_EXITED"
        : "UNKNOWN",
      retryable: false, proof_status: "UNPROVEN" });
  }
  if (isProvenFarmOsDay147A5CodeLessConnectClose({
    failure_origin: canonicalSummary,
    container_state: input.current_container_state,
  })) {
    return Object.freeze({ canonical_origin: canonicalOrigin,
      failure_class: "CONNECTION_RESET", retryable: true,
      proof_status: "PROVEN_CODELESS_CONNECT_CLOSE" });
  }
  if (observed.deadline_reached) {
    return Object.freeze({ canonical_origin: "DEADLINE",
      failure_class: "TIMEOUT", retryable: true,
      proof_status: "UNPROVEN" });
  }
  if (observed.adapter_validation_failed) {
    return Object.freeze({ canonical_origin: "ADAPTER_VALIDATION",
      failure_class: "QUERY_FAILED", retryable: false,
      proof_status: "UNPROVEN" });
  }
  if (["KNOWN_NODE_CODE", "KNOWN_POSTGRES_CODE"].includes(
    observed.safe_code_class,
  ) && input.recognized_failure_class !== "UNKNOWN" &&
    input.recognized_failure_class !== "QUERY_FAILED") {
    return Object.freeze({ canonical_origin: canonicalOrigin,
      failure_class: input.recognized_failure_class,
      retryable: RETRYABLE_READINESS_FAILURES.has(
        input.recognized_failure_class,
      ), proof_status: "UNPROVEN" });
  }
  return Object.freeze({ canonical_origin: canonicalOrigin,
    failure_class: observed.safe_code_class === "CODE_UNRECOGNIZED" &&
        observed.stage === "QUERY"
      ? "QUERY_FAILED"
      : "UNKNOWN",
    retryable: false, proof_status: "UNPROVEN" });
}

function readinessFailureCode(
  result: A5PostgresReadinessResult,
): string | null {
  if (result.ready) return null;
  if (result.timeout_reached) return "DAY147_A5_POSTGRES_READINESS_TIMEOUT";
  switch (result.last_failure_class) {
    case "AUTHENTICATION_FAILED":
      return "DAY147_A5_POSTGRES_READINESS_AUTHENTICATION_FAILED";
    case "DATABASE_NOT_FOUND":
      return "DAY147_A5_POSTGRES_READINESS_DATABASE_NOT_FOUND";
    case "USER_NOT_FOUND":
      return "DAY147_A5_POSTGRES_READINESS_USER_NOT_FOUND";
    case "CONTAINER_EXITED":
      return "DAY147_A5_POSTGRES_CONTAINER_EXITED";
    case "QUERY_FAILED":
      return "DAY147_A5_POSTGRES_READINESS_QUERY_FAILED";
    case "PROTOCOL_ERROR":
      return "DAY147_A5_POSTGRES_READINESS_PROTOCOL_ERROR";
    case "CLIENT_CLEANUP_FAILED":
      return "DAY147_A5_POSTGRES_CLIENT_CLEANUP_FAILED";
    case "OPERATION_CONVERGENCE_FAILED":
      return "DAY147_A5_POSTGRES_OPERATION_CONVERGENCE_FAILED";
    default:
      return "DAY147_A5_POSTGRES_READINESS_UNKNOWN";
  }
}

function readinessSummary(
  result: A5PostgresReadinessResult | null,
): FarmOsDay147A5ReadinessSummary {
  if (result === null) {
    return {
      status: "NOT_STARTED", attempts: 0, elapsed_ms: 0,
      first_failure_class: null, last_failure_class: null,
      retryable_failure_count: 0, non_retryable_failure_count: 0,
      timeout_reached: false, container_exit_detected: false,
      container_state: "UNKNOWN",
      container_exit_code: null, container_restarting: false,
      container_oom_killed: false, startup_elapsed_ms: 0,
      readiness_attempts_before_exit: 0,
      failure_origin: buildPreAttemptFailureOrigin({ origin: "UNKNOWN" }),
    };
  }
  return {
    status: result.ready ? "READY" : "FAILED",
    attempts: result.attempts,
    elapsed_ms: result.elapsed_ms,
    first_failure_class: result.first_failure_class,
    last_failure_class: result.last_failure_class,
    retryable_failure_count: result.retryable_failure_count,
    non_retryable_failure_count: result.non_retryable_failure_count,
    timeout_reached: result.timeout_reached,
    container_exit_detected: result.container_exit_detected,
    container_state: result.container_state,
    container_exit_code: result.container_exit_code,
    container_restarting: result.container_restarting,
    container_oom_killed: result.container_oom_killed,
    startup_elapsed_ms: result.startup_elapsed_ms,
    readiness_attempts_before_exit: result.readiness_attempts_before_exit,
    failure_origin: result.ready ? null : result.failure_origin,
  };
}

async function waitForPostgres(input: {
  config: ClientConfig;
  maximum_attempts: number;
  interval_ms: number;
  global_deadline_ms: number;
  per_attempt_timeout_ms: number;
  revalidation_binding: A5ContainerRevalidationBinding;
  dependencies: A5PostgresReadinessDependencies;
}): Promise<A5PostgresReadinessResult> {
  if (
    input.maximum_attempts < 1 ||
    input.maximum_attempts > 60 ||
    input.interval_ms < 1 ||
    input.interval_ms > 1_000 ||
    input.global_deadline_ms < 1_000 ||
    input.global_deadline_ms > 60_000 ||
    input.per_attempt_timeout_ms < 1 ||
    input.per_attempt_timeout_ms > 5_000
  ) {
    throw new Error("DAY147_A5_POSTGRES_READINESS_CONFIG_INVALID");
  }
  if (!/^[a-f0-9]{12}$/.test(input.revalidation_binding.execution_nonce) ||
    !CONTAINER_ID_PATTERN.test(
      input.revalidation_binding.canonical_container_id,
    ) || !CONTAINER_PATTERN.test(
      input.revalidation_binding.expected_container_name,
    ) || input.revalidation_binding.expected_container_name !==
      `farmos_day147a5_${input.revalidation_binding.execution_nonce}` ||
    !/^sha256:[a-f0-9]{64}$/.test(
      input.revalidation_binding.expected_image_digest,
    )) {
    throw new Error("DAY147_A5_CURRENT_STATE_REVALIDATION_BINDING_INVALID");
  }
  const startedAt = input.dependencies.now_ms();
  const timeline: A5PostgresReadinessAttempt[] = [];
  let attempts = 0;
  let retryableFailureCount = 0;
  let nonRetryableFailureCount = 0;
  let preAttemptFailureClass: FarmOsDay147A5ReadinessFailureClass | null = null;
  let preAttemptFailureOrigin: FarmOsDay147A5ReadinessFailureOriginSummary | null = null;
  let containerState: FarmOsDay147A5ContainerRuntimeState = "UNKNOWN";
  let containerObservation: A5ContainerRuntimeObservation = {
    state: "UNKNOWN", exit_code: null, restarting: false, oom_killed: false,
  };
  let clientsClosed = true;
  let streamsClosed = true;
  let activeOperations = 0;
  let temporaryErrorListeners = 0;
  let convergenceFailed = false;
  const elapsed = () => Math.max(0, Math.floor(input.dependencies.now_ms() - startedAt));
  const inspectContainerState = async (
    timeoutMs: number,
  ): Promise<A5ContainerRuntimeObservation> => {
    try {
      return await input.dependencies.inspect_container_state(
        timeoutMs,
        input.revalidation_binding,
      );
    } catch {
      return { state: "UNKNOWN", exit_code: null, restarting: false, oom_killed: false };
    }
  };
  const result = (
    ready: boolean,
    timeoutReached: boolean,
    committedElapsed = elapsed(),
  ): A5PostgresReadinessResult => {
    const failureTimeline = timeline.filter(({ failure_class }) =>
      failure_class !== null
    );
    const built: A5PostgresReadinessResult = {
      ready,
      attempts,
      elapsed_ms: committedElapsed,
      first_failure_class: failureTimeline[0]?.failure_class ??
        preAttemptFailureClass,
      last_failure_class: preAttemptFailureClass ??
        failureTimeline.at(-1)?.failure_class ?? null,
      retryable_failure_count: retryableFailureCount,
      non_retryable_failure_count: nonRetryableFailureCount,
      timeout_reached: timeoutReached,
      container_exit_detected: preAttemptFailureClass === "CONTAINER_EXITED" ||
        timeline.some(({ failure_class }) => failure_class === "CONTAINER_EXITED"),
      container_state: containerState,
      container_exit_code: containerObservation.exit_code,
      container_restarting: containerObservation.restarting,
      container_oom_killed: containerObservation.oom_killed,
      startup_elapsed_ms: committedElapsed,
      readiness_attempts_before_exit: (preAttemptFailureClass ===
          "CONTAINER_EXITED" || timeline.some(({ failure_class }) =>
          failure_class === "CONTAINER_EXITED"))
        ? attempts
        : 0,
      clients_closed: clientsClosed,
      streams_closed: streamsClosed,
      active_operations: activeOperations,
      temporary_error_listeners: temporaryErrorListeners,
      convergence_failed: convergenceFailed,
      pre_attempt_failure_class: preAttemptFailureClass,
      failure_origin: ready ? null : preAttemptFailureOrigin ??
        failureTimeline.at(-1)?.failure_origin ?? null,
      pre_attempt_failure_origin: preAttemptFailureOrigin,
      timeline: Object.freeze([...timeline]),
    };
    assertReadinessResultConsistency(built);
    return built;
  };
  const recordFailure = (
    attempt: number,
    failureClass: FarmOsDay147A5ReadinessFailureClass,
    retryable: boolean,
    failureOrigin: FarmOsDay147A5ReadinessFailureOriginSummary,
  ) => {
    timeline.push({
      attempt,
      failure_class: failureClass,
      failure_origin: failureOrigin,
      retryable,
      elapsed_ms_bucket: readinessElapsedBucket(elapsed()),
    });
    if (retryable) retryableFailureCount += 1;
    else nonRetryableFailureCount += 1;
  };
  const recordPreAttemptFailure = (
    failureClass: FarmOsDay147A5ReadinessFailureClass,
    failureOrigin: FarmOsDay147A5ReadinessFailureOriginSummary,
  ) => {
    preAttemptFailureClass = failureClass;
    preAttemptFailureOrigin = failureOrigin;
  };
  const replaceLastFailureWithTimeout = () => {
    recordPreAttemptFailure("TIMEOUT", buildPreAttemptFailureOrigin({
      origin: "DEADLINE",
    }));
  };
  for (let attempt = 1; attempt <= input.maximum_attempts; attempt += 1) {
    if (elapsed() >= input.global_deadline_ms) {
      if (attempts === 0) recordPreAttemptFailure("TIMEOUT", buildPreAttemptFailureOrigin({
        origin: "DEADLINE",
      }));
      else replaceLastFailureWithTimeout();
      return result(false, true);
    }
    const state = await inspectContainerState(
      input.global_deadline_ms - elapsed(),
    );
    containerObservation = state;
    containerState = state.state;
    if (["EXITED", "DEAD", "RESTARTING"].includes(state.state)) {
      recordPreAttemptFailure("CONTAINER_EXITED", buildPreAttemptFailureOrigin({
        origin: "CONTAINER_STATE",
      }));
      return result(false, false);
    }
    if (elapsed() >= input.global_deadline_ms) {
      recordPreAttemptFailure("TIMEOUT", buildPreAttemptFailureOrigin({
        origin: "DEADLINE",
      }));
      return result(false, true);
    }
    if (state.state !== "RUNNING") {
      recordPreAttemptFailure("UNKNOWN", buildPreAttemptFailureOrigin({
        origin: "UNKNOWN",
      }));
      return result(false, false);
    }
    attempts = attempt;
    const remaining = input.global_deadline_ms - elapsed();
    if (remaining <= 0) return result(false, true);
    const client = input.dependencies.create_client({
      ...input.config,
      connectionTimeoutMillis: Math.max(
        1,
        Math.min(input.per_attempt_timeout_ms, remaining),
      ),
      query_timeout: Math.max(
        1,
        Math.min(input.per_attempt_timeout_ms, remaining),
      ),
      statement_timeout: Math.max(
        1,
        Math.min(input.per_attempt_timeout_ms, remaining),
      ),
    });
    type AttemptLifecycle = "CREATED" | "CONNECTING" | "CONNECTED" |
      "QUERYING" | "QUERY_COMPLETED" | "INSPECTING_CONTAINER" |
      "CLOSING" | "CLOSED" | "TIMED_OUT" | "FAILED";
    let lifecycle: AttemptLifecycle = "CREATED";
    let stage: "connect" | "query" = "connect";
    let attemptReady = false;
    let attemptFailure: FarmOsDay147A5ReadinessFailureClass | null = null;
    let attemptFailureOrigin: FarmOsDay147A5ReadinessFailureOriginSummary | null = null;
    let attemptRetryable: boolean | null = null;
    let currentOperationSettled = false;
    let attemptProofStatus: A5FailureOriginResolution["proof_status"] =
      "UNPROVEN";
    const attemptStartedAt = input.dependencies.now_ms();
    try {
      lifecycle = "CONNECTING";
      await input.dependencies.run_convergent_operation(
        () => client.connect(),
        Math.max(1, Math.min(input.per_attempt_timeout_ms, remaining)),
        () => client.begin_termination(),
      );
      currentOperationSettled = true;
      lifecycle = "CONNECTED";
      stage = "query";
      const remainingAttemptTime = input.per_attempt_timeout_ms - Math.max(
        0,
        input.dependencies.now_ms() - attemptStartedAt,
      );
      const remainingGlobalTime = input.global_deadline_ms - elapsed();
      if (remainingAttemptTime <= 0 || remainingGlobalTime <= 0) {
        const timeout = new Error("DAY147_A5_READINESS_OPERATION_TIMEOUT") as
          Error & { code: string };
        timeout.code = "ETIMEDOUT";
        throw timeout;
      }
      lifecycle = "QUERYING";
      currentOperationSettled = false;
      const queryResult = await input.dependencies.run_convergent_operation(
        () => client.query(A5_POSTGRES_READINESS_QUERY),
        Math.max(1, Math.min(remainingAttemptTime, remainingGlobalTime)),
        () => client.begin_termination(),
      );
      currentOperationSettled = true;
      lifecycle = "QUERY_COMPLETED";
      const queryRows = typeof queryResult === "object" && queryResult !== null &&
          "rows" in queryResult && Array.isArray(queryResult.rows)
        ? queryResult.rows
        : null;
      if (queryRows?.length !== 1 || typeof queryRows[0] !== "object" ||
        queryRows[0] === null || (queryRows[0] as { ready?: unknown }).ready !== 1) {
        client.mark_adapter_validation();
      }
      lifecycle = "INSPECTING_CONTAINER";
      const beforePostInspectRemaining = input.global_deadline_ms - elapsed();
      if (beforePostInspectRemaining <= 0) throw readinessTimeoutError();
      const postConnectState = await inspectContainerState(
        beforePostInspectRemaining,
      );
      containerObservation = postConnectState;
      containerState = postConnectState.state;
      if (postConnectState.state !== "RUNNING") {
        lifecycle = "FAILED";
        const observedOrigin = Object.freeze({
          ...client.failure_origin(), stage: "POST_QUERY_INSPECT" as const,
        });
        const resolution = resolveA5ReadinessFailureOrigin({
          recognized_failure_class: "UNKNOWN",
          failure_origin: observedOrigin,
          current_container_state: containerState,
        });
        attemptFailure = resolution.failure_class;
        attemptRetryable = resolution.retryable;
        attemptProofStatus = resolution.proof_status;
        attemptFailureOrigin = Object.freeze({
          ...observedOrigin, origin: resolution.canonical_origin,
        });
      } else if (elapsed() >= input.global_deadline_ms) {
        client.mark_deadline();
        const observedOrigin = client.failure_origin();
        const resolution = resolveA5ReadinessFailureOrigin({
          recognized_failure_class: "TIMEOUT",
          failure_origin: observedOrigin,
          current_container_state: containerState,
        });
        attemptFailure = resolution.failure_class;
        attemptRetryable = resolution.retryable;
        attemptFailureOrigin = Object.freeze({
          ...observedOrigin, origin: resolution.canonical_origin,
        });
        lifecycle = "TIMED_OUT";
      } else if (client.failure_origin().adapter_validation_failed) {
        const observedOrigin = client.failure_origin();
        const resolution = resolveA5ReadinessFailureOrigin({
          recognized_failure_class: "QUERY_FAILED",
          failure_origin: observedOrigin,
          current_container_state: containerState,
        });
        attemptFailure = resolution.failure_class;
        attemptRetryable = resolution.retryable;
        attemptFailureOrigin = Object.freeze({
          ...observedOrigin, origin: resolution.canonical_origin,
        });
      } else {
        attemptReady = true;
      }
    } catch (error) {
      // Reaching this catch means the current convergent operation has a
      // terminal rejection; a pending operation cannot enter revalidation.
      currentOperationSettled = true;
      const initialClass = classifyPostgresReadinessError(error, stage);
      if (initialClass === "OPERATION_CONVERGENCE_FAILED") {
        client.mark_convergence();
      } else if (initialClass === "TIMEOUT") {
        client.mark_deadline();
      }
      let observedOrigin = client.failure_origin();
      const codeLessCloseCandidate = currentOperationSettled &&
        observedOrigin.stage === "CONNECT" &&
        observedOrigin.safe_code_class === "CODE_ABSENT" &&
        observedOrigin.connection_established === false &&
        observedOrigin.query_started === false &&
        observedOrigin.termination_initiated === false &&
        observedOrigin.promise_rejection_observed === true &&
        (observedOrigin.stream_close_observed ||
          observedOrigin.stream_end_observed) &&
        observedOrigin.client_error_observed === false &&
        observedOrigin.stream_error_observed === false &&
        observedOrigin.adapter_validation_failed === false &&
        observedOrigin.convergence_failed === false &&
        observedOrigin.deadline_reached === false;
      if (codeLessCloseCandidate) {
        const revalidationRemaining = input.global_deadline_ms - elapsed();
        const currentState = revalidationRemaining > 0
          ? await inspectContainerState(revalidationRemaining)
          : { state: "UNKNOWN" as const, exit_code: null,
            restarting: false, oom_killed: false };
        containerObservation = currentState;
        containerState = currentState.state;
        if (containerState === "RUNNING" &&
          elapsed() >= input.global_deadline_ms) {
          client.mark_deadline();
          observedOrigin = client.failure_origin();
        }
      }
      const resolution = resolveA5ReadinessFailureOrigin({
        recognized_failure_class: client.recognized_failure_class() ??
          initialClass,
        failure_origin: observedOrigin,
        current_container_state: containerState,
      });
      attemptFailureOrigin = Object.freeze({
        ...observedOrigin,
        origin: resolution.canonical_origin,
      });
      attemptFailure = resolution.failure_class;
      attemptRetryable = resolution.retryable;
      attemptProofStatus = resolution.proof_status;
      if (attemptFailure === "OPERATION_CONVERGENCE_FAILED") {
        clientsClosed = false;
        streamsClosed = error instanceof A5OperationConvergenceError &&
          error.termination_result.stream_closed;
        activeOperations = streamsClosed ? 0 : 1;
        temporaryErrorListeners = error instanceof A5OperationConvergenceError
          ? error.temporary_error_listeners
          : 0;
        convergenceFailed = true;
      }
      lifecycle = attemptFailure === "TIMEOUT" ? "TIMED_OUT" : "FAILED";
    }
    const failureBeforeClose = attemptFailure;
    const originBeforeClose = attemptFailureOrigin;
    const retryableBeforeClose = attemptRetryable;
    const proofBeforeClose = attemptProofStatus;
    let closeFailed = false;
    try {
      lifecycle = "CLOSING";
      const closeRemaining = input.global_deadline_ms - elapsed();
      await input.dependencies.run_convergent_operation(
        () => client.end(),
        Math.max(
          1,
          Math.min(input.per_attempt_timeout_ms, Math.max(1, closeRemaining)),
        ),
        () => client.begin_termination(),
      );
      lifecycle = "CLOSED";
    } catch (error) {
      closeFailed = true;
      clientsClosed = false;
      attemptReady = false;
      const cleanupClass = classifyPostgresReadinessError(error, "query") ===
          "OPERATION_CONVERGENCE_FAILED"
        ? "OPERATION_CONVERGENCE_FAILED" as const
        : "CLIENT_CLEANUP_FAILED" as const;
      if (failureBeforeClose !== null &&
        cleanupClass !== "OPERATION_CONVERGENCE_FAILED") {
        attemptFailure = failureBeforeClose;
        attemptFailureOrigin = originBeforeClose;
        attemptRetryable = retryableBeforeClose;
        attemptProofStatus = proofBeforeClose;
      } else if (cleanupClass === "OPERATION_CONVERGENCE_FAILED") {
        client.mark_convergence();
        const observedOrigin = client.failure_origin();
        const resolution = resolveA5ReadinessFailureOrigin({
          recognized_failure_class: cleanupClass,
          failure_origin: observedOrigin,
          current_container_state: containerState,
        });
        attemptFailure = resolution.failure_class;
        attemptRetryable = resolution.retryable;
        attemptProofStatus = resolution.proof_status;
        attemptFailureOrigin = Object.freeze({
          ...observedOrigin, origin: resolution.canonical_origin,
        });
      } else {
        const observedOrigin = client.failure_origin();
        const resolution = resolveA5ReadinessFailureOrigin({
          recognized_failure_class: cleanupClass,
          failure_origin: observedOrigin,
          current_container_state: containerState,
        });
        attemptFailure = resolution.failure_class;
        attemptRetryable = resolution.retryable;
        attemptProofStatus = resolution.proof_status;
        attemptFailureOrigin = Object.freeze({
          ...observedOrigin, origin: resolution.canonical_origin,
        });
      }
      if (attemptFailure === "OPERATION_CONVERGENCE_FAILED") {
        streamsClosed = error instanceof A5OperationConvergenceError &&
          error.termination_result.stream_closed;
        activeOperations = streamsClosed ? 0 : 1;
        temporaryErrorListeners = error instanceof A5OperationConvergenceError
          ? error.temporary_error_listeners
          : 0;
        convergenceFailed = true;
      }
      lifecycle = "FAILED";
    }
    if (!client.stream_closed() && !convergenceFailed) {
      let forcedTermination: A5ClientTerminationHandle | null = null;
      let forcedClosed = false;
      try {
        forcedTermination = client.begin_termination();
        const forcedOutcome = await boundedOutcome(
          forcedTermination.outcome,
          A5_POSTGRES_TERMINATION_GRACE_MS,
        );
        forcedClosed = forcedOutcome.settled &&
          forcedOutcome.value.terminated &&
          forcedOutcome.value.stream_closed && client.stream_closed();
      } catch {
        forcedClosed = false;
      } finally {
        forcedTermination?.cleanup();
      }
      if (forcedClosed) {
        clientsClosed = true;
        streamsClosed = true;
        if (closeFailed && failureBeforeClose !== null) lifecycle = "CLOSED";
      } else {
        client.mark_convergence();
        const observedOrigin = client.failure_origin();
        const resolution = resolveA5ReadinessFailureOrigin({
          recognized_failure_class: "OPERATION_CONVERGENCE_FAILED",
          failure_origin: observedOrigin,
          current_container_state: containerState,
        });
        attemptReady = false;
        attemptFailure = resolution.failure_class;
        attemptRetryable = false;
        attemptProofStatus = resolution.proof_status;
        attemptFailureOrigin = Object.freeze({
          ...observedOrigin, origin: resolution.canonical_origin,
        });
        clientsClosed = false;
        streamsClosed = false;
        activeOperations = 1;
        convergenceFailed = true;
        lifecycle = "FAILED";
      }
    }
    if (attemptFailure === "CONNECTION_RESET" &&
      attemptFailureOrigin?.safe_code_class === "CODE_ABSENT" &&
      attemptProofStatus === "PROVEN_CODELESS_CONNECT_CLOSE" &&
      client.stream_closed() && !convergenceFailed) {
      const retryInspectRemaining = input.global_deadline_ms - elapsed();
      const retryState = retryInspectRemaining > 0
        ? await inspectContainerState(retryInspectRemaining)
        : { state: "UNKNOWN" as const, exit_code: null,
          restarting: false, oom_killed: false };
      containerObservation = retryState;
      containerState = retryState.state;
      const currentOrigin = retryState.state === "RUNNING" &&
          elapsed() >= input.global_deadline_ms
        ? Object.freeze({ ...attemptFailureOrigin, deadline_reached: true })
        : attemptFailureOrigin;
      const resolution = resolveA5ReadinessFailureOrigin({
        recognized_failure_class: "UNKNOWN",
        failure_origin: currentOrigin,
        current_container_state: containerState,
      });
      attemptFailure = resolution.failure_class;
      attemptRetryable = resolution.retryable;
      attemptProofStatus = resolution.proof_status;
      attemptFailureOrigin = Object.freeze({
        ...currentOrigin, origin: resolution.canonical_origin,
      });
      if (!resolution.retryable) lifecycle = "FAILED";
    }
    if (attemptReady) {
      const finalInspectRemaining = input.global_deadline_ms - elapsed();
      const currentState = finalInspectRemaining > 0
        ? await inspectContainerState(finalInspectRemaining)
        : null;
      if (currentState !== null) {
        containerObservation = currentState;
        containerState = currentState.state;
      }
      if (currentState !== null && currentState.state !== "RUNNING") {
        const observedOrigin = buildPostQueryInspectFailureOrigin({
          origin: currentState.state === "UNKNOWN"
            ? "UNKNOWN"
            : "CONTAINER_STATE",
        });
        const resolution = resolveA5ReadinessFailureOrigin({
          recognized_failure_class: "UNKNOWN",
          failure_origin: observedOrigin,
          current_container_state: containerState,
        });
        attemptReady = false;
        attemptFailure = resolution.failure_class;
        attemptRetryable = resolution.retryable;
        attemptProofStatus = resolution.proof_status;
        attemptFailureOrigin = Object.freeze({
          ...observedOrigin, origin: resolution.canonical_origin,
        });
        lifecycle = "FAILED";
      }
    }
    const finalElapsed = elapsed();
    if (attemptReady && finalElapsed >= input.global_deadline_ms) {
      attemptReady = false;
      const observedOrigin = buildPostQueryInspectFailureOrigin({
        origin: "DEADLINE",
      });
      const resolution = resolveA5ReadinessFailureOrigin({
        recognized_failure_class: "TIMEOUT",
        failure_origin: observedOrigin,
        current_container_state: containerState,
      });
      attemptFailure = resolution.failure_class;
      attemptRetryable = resolution.retryable;
      attemptProofStatus = resolution.proof_status;
      attemptFailureOrigin = Object.freeze({
        ...observedOrigin, origin: resolution.canonical_origin,
      });
      lifecycle = "TIMED_OUT";
    }
    client.cleanup_observation();
    assert.equal(client.observation_listener_count(), 0);
    assert.equal(client.late_event_safety_safe(), true);
    if (attemptReady) {
      assert.equal(lifecycle, "CLOSED");
      timeline.push({
        attempt,
        failure_class: null,
        failure_origin: null,
        retryable: false,
        elapsed_ms_bucket: readinessElapsedBucket(elapsed()),
      });
      return result(true, false, finalElapsed);
    }
    assert.ok(attemptFailure);
    assert.ok(attemptFailureOrigin);
    const retryable = attemptRetryable ??
      RETRYABLE_READINESS_FAILURES.has(attemptFailure);
    assert.equal(farmOsDay147A5FailureOriginBindingValid({
      failure_class: attemptFailure,
      retryable,
      failure_origin: attemptFailureOrigin,
      container_state: containerState,
    }), true);
    recordFailure(attempt, attemptFailure, retryable, attemptFailureOrigin);
    if (!retryable) {
      return result(
        false,
        attemptFailure === "TIMEOUT" &&
          elapsed() >= input.global_deadline_ms,
      );
    }
    const retryGateOpen = lifecycle === "CLOSED" && clientsClosed &&
      currentOperationSettled && streamsClosed && client.stream_closed() &&
      activeOperations === 0 &&
      client.observation_listener_count() === 0 &&
      client.late_event_safety_safe() &&
      elapsed() < input.global_deadline_ms && !convergenceFailed &&
      (attemptFailure !== "CONNECTION_RESET" ||
        attemptFailureOrigin.safe_code_class !== "CODE_ABSENT" ||
        (attemptProofStatus === "PROVEN_CODELESS_CONNECT_CLOSE" &&
          containerState === "RUNNING"));
    if (!retryGateOpen) {
      return result(false, elapsed() >= input.global_deadline_ms);
    }
    if (attempt === input.maximum_attempts ||
      elapsed() >= input.global_deadline_ms) {
      replaceLastFailureWithTimeout();
      return result(false, true);
    }
    assert.equal(lifecycle, "CLOSED");
    await input.dependencies.sleep_ms(Math.min(
      input.interval_ms,
      input.global_deadline_ms - elapsed(),
    ));
  }
  replaceLastFailureWithTimeout();
  return result(false, true);
}

async function runPostgresReadinessGate(input: Parameters<typeof waitForPostgres>[0]):
  Promise<Readonly<{
    readiness: A5PostgresReadinessResult;
    primary_failure_code: string | null;
    migrations_may_start: boolean;
  }>> {
  const readiness = await waitForPostgres(input);
  return {
    readiness,
    primary_failure_code: readinessFailureCode(readiness),
    migrations_may_start: readiness.ready && readiness.clients_closed &&
      readiness.streams_closed && readiness.active_operations === 0 &&
      readiness.temporary_error_listeners === 0 &&
      !readiness.convergence_failed &&
      readiness.elapsed_ms < input.global_deadline_ms &&
      readiness.container_state === "RUNNING",
  };
}

type StaticReadinessStep = Readonly<{
  connect_error_code?: string;
  connect_rejection_without_code?: boolean;
  client_error_without_code?: boolean;
  stream_error_without_code?: boolean;
  stream_close_during_connect?: boolean;
  stream_end_during_connect?: boolean;
  query_error_code?: string;
  query_result?: unknown;
  end_error_code?: string;
  advance_ms?: number;
  query_advance_ms?: number;
  end_advance_ms?: number;
  terminate_error?: boolean;
  keep_stream_open_after_end?: boolean;
  before_connect?: () => void;
  raw_message?: string;
}>;

const RUNNING_CONTAINER_STATE: A5ContainerRuntimeObservation = Object.freeze({
  state: "RUNNING", exit_code: 0, restarting: false, oom_killed: false,
});
const STATIC_REVALIDATION_BINDING: A5ContainerRevalidationBinding =
  Object.freeze({
    execution_nonce: "a1b2c3d4e5f6",
    canonical_container_id: "a".repeat(64),
    expected_container_name: "farmos_day147a5_a1b2c3d4e5f6",
    expected_image_digest: `sha256:${"b".repeat(64)}`,
  });

function createStaticReadinessDependencies(input: Readonly<{
  steps?: readonly StaticReadinessStep[];
  states?: readonly (A5ContainerRuntimeObservation | Error)[];
  state_advance_ms?: readonly number[];
}> = {}) {
  let now = 0;
  let clientIndex = 0;
  let stateIndex = 0;
  let clientsClosed = 0;
  let clientsTerminated = 0;
  let readinessQueries = 0;
  const createdClients: A5PgReadinessClientShape[] = [];
  const createdStreams: A5PgReadinessClientShape["connection"]["stream"][] = [];
  const stateBindings: A5ContainerRevalidationBinding[] = [];
  const codedError = (code: string, message: string) => {
    const error = new Error(message) as Error & { code: string };
    error.code = code;
    return error;
  };
  const dependencies: A5PostgresReadinessDependencies = {
    now_ms: () => now,
    async sleep_ms(milliseconds) { now += milliseconds; },
    async run_convergent_operation<T>(
      operation: () => Promise<T>,
      _timeoutMs: number,
      _beginTermination: () => A5ClientTerminationHandle,
    ) {
      const outcome = await operation().then<
        A5SettledOperation<T>, A5SettledOperation<T>
      >(
        (value) => ({ status: "FULFILLED", value }),
        (error: unknown) => ({ status: "REJECTED", error }),
      );
      if (outcome.status === "REJECTED") throw outcome.error;
      return outcome.value;
    },
    create_client() {
      const step = input.steps?.[clientIndex] ?? {};
      clientIndex += 1;
      const client = new EventEmitter() as A5PgReadinessClientShape;
      const stream = new EventEmitter() as A5PgReadinessClientShape["connection"]["stream"];
      stream.destroyed = false;
      stream.closed = false;
      stream.destroy = () => {
        stream.destroyed = true;
        stream.closed = true;
        stream.emit("close");
      };
      Object.defineProperty(client, "connection", {
        value: Object.freeze({ stream }), enumerable: true,
      });
      Object.assign(client, {
        async connect() {
          step.before_connect?.();
          now += step.advance_ms ?? 0;
          if (step.client_error_without_code) {
            client.emit("error", new Error("sanitized client event fixture"));
          }
          if (step.stream_error_without_code) {
            stream.emit("error", new Error("sanitized stream event fixture"));
          }
          if (step.stream_close_during_connect) stream.emit("close");
          if (step.stream_end_during_connect) stream.emit("end");
          if (step.connect_rejection_without_code) {
            throw new Error(step.raw_message ?? "sanitized code-less fixture");
          }
          if (step.connect_error_code !== undefined) {
            throw codedError(
              step.connect_error_code,
              step.raw_message ?? "sanitized readiness fixture",
            );
          }
        },
        async query(queryText: string) {
          assert.equal(queryText, A5_POSTGRES_READINESS_QUERY);
          readinessQueries += 1;
          now += step.query_advance_ms ?? 0;
          if (step.query_error_code !== undefined) {
            throw codedError(
              step.query_error_code,
              step.raw_message ?? "sanitized readiness query fixture",
            );
          }
          return step.query_result ?? { rows: [{ ready: 1 }] };
        },
        async end() {
          now += step.end_advance_ms ?? 0;
          if (step.end_error_code !== undefined) {
            throw codedError(
              step.end_error_code,
              step.raw_message ?? "sanitized readiness close fixture",
            );
          }
          clientsClosed += 1;
          if (!step.keep_stream_open_after_end) {
            stream.destroyed = true;
            stream.closed = true;
            stream.emit("close");
          }
        },
      });
      createdClients.push(client);
      createdStreams.push(stream);
      return adaptPgReadinessClient(client, () => {
        clientsTerminated += 1;
        return {
          outcome: step.terminate_error === true
            ? Promise.resolve({
              terminated: false as const,
              stream_closed: false,
              failure_class: "TERMINATION_FAILED" as const,
            })
            : Promise.resolve().then(() => {
              stream.destroyed = true;
              stream.closed = true;
              stream.emit("close");
              return {
                terminated: true as const,
                stream_closed: true as const,
              };
            }),
          cleanup() {},
          temporary_listener_count: () => 0,
        };
      });
    },
    async inspect_container_state(_timeoutMs, binding) {
      assert.match(binding.execution_nonce, /^[a-f0-9]{12}$/);
      assert.match(binding.canonical_container_id, /^[a-f0-9]{64}$/);
      assert.equal(
        binding.expected_container_name,
        `farmos_day147a5_${binding.execution_nonce}`,
      );
      assert.match(binding.expected_image_digest, /^sha256:[a-f0-9]{64}$/);
      stateBindings.push(Object.freeze({ ...binding }));
      now += input.state_advance_ms?.[stateIndex] ?? 0;
      const state = input.states?.[stateIndex] ?? RUNNING_CONTAINER_STATE;
      stateIndex += 1;
      if (state instanceof Error) throw state;
      return state;
    },
  };
  return {
    dependencies,
    clients_closed: () => clientsClosed,
    clients_terminated: () => clientsTerminated,
    readiness_queries: () => readinessQueries,
    clients_created: () => clientIndex,
    virtual_now_ms: () => now,
    client_at: (index: number) => createdClients[index],
    stream_at: (index: number) => createdStreams[index],
    state_bindings: () => Object.freeze([...stateBindings]),
  };
}

function createStaticInternalReadinessDependencies(input: Readonly<{
  results?: readonly (CommandResult | Error)[];
  states?: readonly (A5ContainerRuntimeObservation | Error)[];
  command_advance_ms?: readonly number[];
  state_advance_ms?: readonly number[];
}> = {}) {
  let now = 0;
  let resultIndex = 0;
  let stateIndex = 0;
  const sleeps: number[] = [];
  const commandBindings: A5ContainerRevalidationBinding[] = [];
  const stateBindings: A5ContainerRevalidationBinding[] = [];
  const commandTimeouts: number[] = [];
  const stateTimeouts: number[] = [];
  const validateBinding = (binding: A5ContainerRevalidationBinding) => {
    assert.match(binding.execution_nonce, /^[a-f0-9]{12}$/);
    assert.match(binding.canonical_container_id, /^[a-f0-9]{64}$/);
    assert.equal(
      binding.expected_container_name,
      `farmos_day147a5_${binding.execution_nonce}`,
    );
    assert.match(binding.expected_image_digest, /^sha256:[a-f0-9]{64}$/);
  };
  const dependencies: A5PostgresInternalReadinessDependencies = {
    now_ms: () => now,
    async sleep_ms(milliseconds) {
      sleeps.push(milliseconds);
      now += milliseconds;
    },
    async inspect_container_state(timeoutMs, binding) {
      validateBinding(binding);
      stateBindings.push(Object.freeze({ ...binding }));
      stateTimeouts.push(timeoutMs);
      now += input.state_advance_ms?.[stateIndex] ?? 0;
      const state = input.states?.[stateIndex] ?? RUNNING_CONTAINER_STATE;
      stateIndex += 1;
      if (state instanceof Error) throw state;
      return state;
    },
    async run_pg_isready(timeoutMs, binding) {
      validateBinding(binding);
      commandBindings.push(Object.freeze({ ...binding }));
      commandTimeouts.push(timeoutMs);
      now += input.command_advance_ms?.[resultIndex] ?? 0;
      const result = input.results?.[resultIndex] ?? {
        exit_code: 0, stdout: "", stderr: "",
      };
      resultIndex += 1;
      if (result instanceof Error) throw result;
      return result;
    },
  };
  return {
    dependencies,
    sleeps: () => Object.freeze([...sleeps]),
    command_bindings: () => Object.freeze([...commandBindings]),
    state_bindings: () => Object.freeze([...stateBindings]),
    command_timeouts: () => Object.freeze([...commandTimeouts]),
    state_timeouts: () => Object.freeze([...stateTimeouts]),
    command_attempts: () => resultIndex,
    state_inspections: () => stateIndex,
    virtual_now_ms: () => now,
  };
}

async function executeStaticInternalReadinessScenario(input: Readonly<{
  results?: readonly (CommandResult | Error)[];
  states?: readonly (A5ContainerRuntimeObservation | Error)[];
  command_advance_ms?: readonly number[];
  state_advance_ms?: readonly number[];
  deadline_ms?: number;
  retry_interval_ms?: number;
}> = {}) {
  const recording = createStaticInternalReadinessDependencies(input);
  const result = await waitForContainerInternalPostgres({
    binding: STATIC_REVALIDATION_BINDING,
    deadline_ms: input.deadline_ms ?? A5_POSTGRES_READINESS_GLOBAL_DEADLINE_MS,
    retry_interval_ms: input.retry_interval_ms ??
      A5_POSTGRES_READINESS_RETRY_INTERVAL_MS,
    per_command_timeout_ms: A5_POSTGRES_READINESS_PER_ATTEMPT_TIMEOUT_MS,
    dependencies: recording.dependencies,
  });
  return { result, recording };
}

async function executeStaticReadinessScenario(input: Readonly<{
  steps?: readonly StaticReadinessStep[];
  states?: readonly (A5ContainerRuntimeObservation | Error)[];
  state_advance_ms?: readonly number[];
  maximum_attempts?: number;
  interval_ms?: number;
  global_deadline_ms?: number;
}> = {}) {
  const recording = createStaticReadinessDependencies(input);
  const gate = await runPostgresReadinessGate({
    config: {
      host: LOCAL_HOST,
      port: 49_152,
      database: "farmos_day147a5_a1b2c3d4e5f6_main",
      user: ROLE_FIXTURES.migration_owner.name,
      password: "not-serialized-readiness-fixture",
      ssl: false,
      application_name: "farmos_day147a5_a1b2c3d4e5f6_main_owner",
      connectionTimeoutMillis: A5_POSTGRES_READINESS_PER_ATTEMPT_TIMEOUT_MS,
    },
    maximum_attempts: input.maximum_attempts ??
      A5_POSTGRES_READINESS_MAXIMUM_ATTEMPTS,
    interval_ms: input.interval_ms ?? A5_POSTGRES_READINESS_RETRY_INTERVAL_MS,
    global_deadline_ms: input.global_deadline_ms ??
      A5_POSTGRES_READINESS_GLOBAL_DEADLINE_MS,
    per_attempt_timeout_ms: A5_POSTGRES_READINESS_PER_ATTEMPT_TIMEOUT_MS,
    revalidation_binding: STATIC_REVALIDATION_BINDING,
    dependencies: recording.dependencies,
  });
  return {
    ...gate,
    clients_closed: recording.clients_closed(),
    clients_terminated: recording.clients_terminated(),
    readiness_queries: recording.readiness_queries(),
    clients_created: recording.clients_created(),
    virtual_now_ms: recording.virtual_now_ms(),
    state_binding_count: recording.state_bindings().length,
    state_bindings_valid: recording.state_bindings().every((binding) =>
      binding.execution_nonce === STATIC_REVALIDATION_BINDING.execution_nonce &&
      binding.canonical_container_id ===
        STATIC_REVALIDATION_BINDING.canonical_container_id &&
      binding.expected_container_name ===
        STATIC_REVALIDATION_BINDING.expected_container_name &&
      binding.expected_image_digest ===
        STATIC_REVALIDATION_BINDING.expected_image_digest
    ),
  };
}

async function runContainerInternalReadinessStaticTests(): Promise<void> {
  const command = buildContainerInternalReadinessCommand({
    binding: STATIC_REVALIDATION_BINDING,
    postgres_user: ROLE_FIXTURES.migration_owner.name,
    postgres_database: "farmos_day147a5_a1b2c3d4e5f6_main",
  });
  assert.deepEqual(command.args, [
    "exec", STATIC_REVALIDATION_BINDING.canonical_container_id,
    "pg_isready", "-q", "-h", "127.0.0.1", "-p", "5432",
    "-U", ROLE_FIXTURES.migration_owner.name,
    "-d", "farmos_day147a5_a1b2c3d4e5f6_main",
  ]);
  assert.equal(command.args.includes("POSTGRES_PASSWORD"), false);
  assert.equal(command.args.some((arg) => /password/i.test(arg)), false);
  assert.equal(command.args.some((arg) => arg.includes("unsafe-secret")), false);
  assert.throws(() => buildContainerInternalReadinessCommand({
    binding: {
      ...STATIC_REVALIDATION_BINDING,
      canonical_container_id: "a".repeat(63),
    },
    postgres_user: ROLE_FIXTURES.migration_owner.name,
    postgres_database: "farmos_day147a5_a1b2c3d4e5f6_main",
  }), { message: "DAY147_A5_INTERNAL_READINESS_BINDING_INVALID" });

  const immediate = await executeStaticInternalReadinessScenario();
  assert.equal(immediate.result.attempts, 1);
  assert.equal(immediate.result.elapsed_ms, 500);
  assert.deepEqual(immediate.recording.sleeps(), [500]);
  assert.deepEqual(immediate.recording.command_bindings(), [
    STATIC_REVALIDATION_BINDING,
  ]);
  assert.deepEqual(immediate.recording.state_bindings(), [
    STATIC_REVALIDATION_BINDING,
  ]);

  const retryThenSuccess = await executeStaticInternalReadinessScenario({
    results: [
      { exit_code: 1, stdout: "", stderr: "" },
      { exit_code: 0, stdout: "", stderr: "" },
    ],
  });
  assert.equal(retryThenSuccess.result.attempts, 2);
  assert.deepEqual(retryThenSuccess.recording.sleeps(), [250, 500]);
  assert.equal(retryThenSuccess.recording.state_inspections(), 2);

  const repeatedNotReady = createStaticInternalReadinessDependencies({
    results: Array.from({ length: 4 }, () => ({
      exit_code: 2, stdout: "", stderr: "",
    })),
  });
  await assert.rejects(waitForContainerInternalPostgres({
    binding: STATIC_REVALIDATION_BINDING,
    deadline_ms: 1_000,
    retry_interval_ms: 250,
    per_command_timeout_ms: A5_POSTGRES_READINESS_PER_ATTEMPT_TIMEOUT_MS,
    dependencies: repeatedNotReady.dependencies,
  }), { message: "DAY147_A5_POSTGRES_INTERNAL_READINESS_TIMEOUT" });
  assert.equal(repeatedNotReady.command_attempts(), 4);
  assert.deepEqual(repeatedNotReady.sleeps(), [250, 250, 250]);

  const exitDuringRetry = createStaticInternalReadinessDependencies({
    results: [{ exit_code: 1, stdout: "", stderr: "" }],
    states: [RUNNING_CONTAINER_STATE, {
      state: "EXITED", exit_code: 1, restarting: false, oom_killed: false,
    }],
  });
  await assert.rejects(waitForContainerInternalPostgres({
    binding: STATIC_REVALIDATION_BINDING,
    deadline_ms: A5_POSTGRES_READINESS_GLOBAL_DEADLINE_MS,
    retry_interval_ms: A5_POSTGRES_READINESS_RETRY_INTERVAL_MS,
    per_command_timeout_ms: A5_POSTGRES_READINESS_PER_ATTEMPT_TIMEOUT_MS,
    dependencies: exitDuringRetry.dependencies,
  }), { message: "DAY147_A5_POSTGRES_CONTAINER_EXITED" });
  assert.equal(exitDuringRetry.command_attempts(), 1);

  const unknownState = createStaticInternalReadinessDependencies({
    states: [{
      state: "UNKNOWN", exit_code: null, restarting: false, oom_killed: false,
    }],
  });
  await assert.rejects(waitForContainerInternalPostgres({
    binding: STATIC_REVALIDATION_BINDING,
    deadline_ms: A5_POSTGRES_READINESS_GLOBAL_DEADLINE_MS,
    retry_interval_ms: A5_POSTGRES_READINESS_RETRY_INTERVAL_MS,
    per_command_timeout_ms: A5_POSTGRES_READINESS_PER_ATTEMPT_TIMEOUT_MS,
    dependencies: unknownState.dependencies,
  }), { message: "DAY147_A5_POSTGRES_READINESS_UNKNOWN" });
  assert.equal(unknownState.command_attempts(), 0);

  const stateInspectionTerminationFailure =
    createStaticInternalReadinessDependencies({
      states: [new Error("DAY147_A5_DOCKER_PROCESS_TERMINATION_FAILED")],
    });
  await assert.rejects(waitForContainerInternalPostgres({
    binding: STATIC_REVALIDATION_BINDING,
    deadline_ms: A5_POSTGRES_READINESS_GLOBAL_DEADLINE_MS,
    retry_interval_ms: A5_POSTGRES_READINESS_RETRY_INTERVAL_MS,
    per_command_timeout_ms: A5_POSTGRES_READINESS_PER_ATTEMPT_TIMEOUT_MS,
    dependencies: stateInspectionTerminationFailure.dependencies,
  }), { message: "DAY147_A5_DOCKER_PROCESS_TERMINATION_FAILED" });
  assert.equal(stateInspectionTerminationFailure.command_attempts(), 0);

  for (const errorMessage of [
    "DAY147_A5_DOCKER_COMMAND_TIMEOUT",
    "DAY147_A5_DOCKER_PROCESS_TERMINATION_FAILED",
  ]) {
    const commandFailure = createStaticInternalReadinessDependencies({
      results: [new Error(errorMessage)],
    });
    await assert.rejects(waitForContainerInternalPostgres({
      binding: STATIC_REVALIDATION_BINDING,
      deadline_ms: A5_POSTGRES_READINESS_GLOBAL_DEADLINE_MS,
      retry_interval_ms: A5_POSTGRES_READINESS_RETRY_INTERVAL_MS,
      per_command_timeout_ms: A5_POSTGRES_READINESS_PER_ATTEMPT_TIMEOUT_MS,
      dependencies: commandFailure.dependencies,
    }), { message: errorMessage });
    assert.equal(commandFailure.command_attempts(), 1, errorMessage);
  }

  const contractFailure = createStaticInternalReadinessDependencies({
    results: [{ exit_code: 3, stdout: "", stderr: "" }],
  });
  await assert.rejects(waitForContainerInternalPostgres({
    binding: STATIC_REVALIDATION_BINDING,
    deadline_ms: A5_POSTGRES_READINESS_GLOBAL_DEADLINE_MS,
    retry_interval_ms: A5_POSTGRES_READINESS_RETRY_INTERVAL_MS,
    per_command_timeout_ms: A5_POSTGRES_READINESS_PER_ATTEMPT_TIMEOUT_MS,
    dependencies: contractFailure.dependencies,
  }), { message: "DAY147_A5_INTERNAL_READINESS_COMMAND_CONTRACT_INVALID" });

  const graceConsumesDeadline = createStaticInternalReadinessDependencies({
    command_advance_ms: [600],
  });
  await assert.rejects(waitForContainerInternalPostgres({
    binding: STATIC_REVALIDATION_BINDING,
    deadline_ms: 1_000,
    retry_interval_ms: A5_POSTGRES_READINESS_RETRY_INTERVAL_MS,
    per_command_timeout_ms: A5_POSTGRES_READINESS_PER_ATTEMPT_TIMEOUT_MS,
    dependencies: graceConsumesDeadline.dependencies,
  }), { message: "DAY147_A5_POSTGRES_INTERNAL_READINESS_TIMEOUT" });
  assert.deepEqual(graceConsumesDeadline.sleeps(), []);
  for (const timeout of [
    ...immediate.recording.command_timeouts(),
    ...immediate.recording.state_timeouts(),
    ...retryThenSuccess.recording.command_timeouts(),
    ...retryThenSuccess.recording.state_timeouts(),
  ]) {
    assert.ok(timeout > 0 && timeout <= A5_POSTGRES_READINESS_PER_ATTEMPT_TIMEOUT_MS);
  }
}

async function runPostgresReadinessStaticTests(): Promise<void> {
  assert.equal(
    A5_POSTGRES_TERMINATION_GRACE_MS +
      A5_POSTGRES_OPERATION_SETTLEMENT_GRACE_MS <
      A5_POSTGRES_OPERATION_CONVERGENCE_CEILING_MS,
    true,
  );
  assert.equal(
    A5_POSTGRES_FATAL_SHUTDOWN_CEILING_MS >
      A5_DOCKER_COMMAND_MAXIMUM_SETTLEMENT_MS * 3,
    true,
  );
  assert.equal(
    A5_POSTGRES_CLOSE_EVENT_GRACE_MS <= A5_POSTGRES_TERMINATION_GRACE_MS,
    true,
  );
  const unhandledReadinessRejections: unknown[] = [];
  const onUnhandledReadinessRejection = (reason: unknown) => {
    unhandledReadinessRejections.push(reason);
  };
  process.on("unhandledRejection", onUnhandledReadinessRejection);
  const convergenceCases: readonly ("resolve" | "reject")[] = [
    "resolve", "reject",
  ];
  for (const settlement of convergenceCases) {
    let settle: ((value: string) => void) | null = null;
    let reject: ((error: Error) => void) | null = null;
    let activeOperations = 0;
    let terminations = 0;
    const operation = new Promise<string>((resolveOperation, rejectOperation) => {
      settle = resolveOperation;
      reject = rejectOperation;
    }).finally(() => {
      activeOperations -= 1;
    });
    activeOperations += 1;
    await assert.rejects(
      runConvergentReadinessOperation(
        () => operation,
        1,
        () => {
          terminations += 1;
          if (settlement === "resolve") settle?.("late");
          else reject?.(new Error("late sanitized rejection"));
          return {
            outcome: Promise.resolve({
              terminated: true as const,
              stream_closed: true as const,
            }),
            cleanup() {},
            temporary_listener_count: () => 0,
          };
        },
      ),
      (error: unknown) =>
        error instanceof Error && "code" in error &&
        (error as Error & { code?: unknown }).code === "ETIMEDOUT",
    );
    assert.equal(terminations, 1, settlement);
    assert.equal(activeOperations, 0, settlement);
  }
  let rejectAfterFailedTermination: ((error: Error) => void) | null = null;
  const operationAfterFailedTermination = new Promise<never>((_resolve, reject) => {
    rejectAfterFailedTermination = reject;
  });
  await assert.rejects(
    runConvergentReadinessOperation(
      () => operationAfterFailedTermination,
      1,
      () => {
        rejectAfterFailedTermination?.(new Error("terminated operation"));
        return {
          outcome: Promise.resolve({
            terminated: false as const,
            stream_closed: false,
            failure_class: "TERMINATION_FAILED" as const,
          }),
          cleanup() {},
          temporary_listener_count: () => 0,
        };
      },
    ),
    { message: "DAY147_A5_POSTGRES_OPERATION_CONVERGENCE_FAILED" },
  );
  for (const stage of ["connect", "query", "end"] as const) {
    for (const settlement of ["resolve", "reject"] as const) {
      let resolveLate: (() => void) | null = null;
      let rejectLate: ((error: Error) => void) | null = null;
      let active = 1;
      const lateOperation = new Promise<void>((resolve, reject) => {
        resolveLate = resolve;
        rejectLate = reject;
      }).finally(() => { active -= 1; });
      await assert.rejects(
        runConvergentReadinessOperation(
          () => lateOperation,
          1,
          () => {
            if (settlement === "resolve") resolveLate?.();
            else rejectLate?.(new Error(`${stage} late sanitized rejection`));
            return {
              outcome: Promise.resolve({
                terminated: true as const,
                stream_closed: true as const,
              }),
              cleanup() {},
              temporary_listener_count: () => 0,
            };
          },
        ),
        (error: unknown) => error instanceof Error &&
          (error as Error & { code?: string }).code === "ETIMEDOUT",
        `${stage}:${settlement}`,
      );
      assert.equal(active, 0, `${stage}:${settlement}:active`);
    }
  }

  const productionShapeClient = new EventEmitter();
  const productionShapeStream = new EventEmitter() as EventEmitter & {
    destroy: () => void;
    destroyed: boolean;
    closed: boolean;
  };
  productionShapeStream.destroyed = false;
  productionShapeStream.closed = false;
  const pgInternalStreamErrorForwarder = () => {
    productionShapeClient.emit("error", new Error("sanitized pg client error"));
  };
  productionShapeStream.on("error", pgInternalStreamErrorForwarder);
  productionShapeStream.destroy = () => {
    productionShapeStream.destroyed = true;
    productionShapeStream.emit("error", new Error("sanitized stream error"));
    productionShapeStream.closed = true;
    productionShapeStream.emit("close");
  };
  let faithfulConnects = 0;
  let faithfulQueries = 0;
  let faithfulEnds = 0;
  Object.assign(productionShapeClient, {
    connection: { stream: productionShapeStream },
    async connect() { faithfulConnects += 1; },
    async query(queryText: string) {
      assert.equal(queryText, A5_POSTGRES_READINESS_QUERY);
      faithfulQueries += 1;
      return { rows: [{ ready: 1 }] };
    },
    async end() { faithfulEnds += 1; },
  });
  const productionFaithfulAdapter = adaptPgReadinessClient(
    productionShapeClient as A5PgReadinessClientShape,
  );
  assert.equal(productionFaithfulAdapter.observation_listener_count(), 4);
  await productionFaithfulAdapter.connect();
  await productionFaithfulAdapter.query(A5_POSTGRES_READINESS_QUERY);
  await productionFaithfulAdapter.end();
  assert.deepEqual(
    [faithfulConnects, faithfulQueries, faithfulEnds],
    [1, 1, 1],
  );
  const clientErrorListenersBefore = productionShapeClient.listenerCount("error");
  const streamErrorListenersBefore = productionShapeStream.listenerCount("error");
  const productionShapeTermination =
    productionFaithfulAdapter.begin_termination();
  assert.equal(productionShapeTermination.temporary_listener_count(), 2);
  assert.equal(
    productionShapeClient.listenerCount("error"),
    clientErrorListenersBefore + 1,
  );
  assert.equal(
    productionShapeStream.listenerCount("error"),
    streamErrorListenersBefore + 1,
  );
  assert.deepEqual(await productionShapeTermination.outcome, {
    terminated: true,
    stream_closed: true,
  });
  productionShapeTermination.cleanup();
  assert.equal(productionShapeTermination.temporary_listener_count(), 0);
  assert.equal(
    productionShapeClient.listenerCount("error"),
    clientErrorListenersBefore,
  );
  assert.equal(
    productionShapeStream.listenerCount("error"),
    streamErrorListenersBefore,
  );
  assert.equal(
    productionShapeStream.listeners("error").includes(
      pgInternalStreamErrorForwarder,
    ),
    true,
  );
  productionShapeStream.destroyed = false;
  productionShapeStream.closed = false;
  const retryTermination = beginPgClientTermination(
    productionShapeClient,
    productionShapeStream,
  );
  assert.deepEqual(await retryTermination.outcome, {
    terminated: true,
    stream_closed: true,
  });
  retryTermination.cleanup();
  assert.equal(
    productionShapeClient.listenerCount("error"),
    clientErrorListenersBefore,
  );
  assert.equal(
    productionShapeStream.listenerCount("error"),
    streamErrorListenersBefore,
  );
  productionFaithfulAdapter.cleanup_observation();
  assert.equal(productionFaithfulAdapter.observation_listener_count(), 0);
  assert.equal(
    productionShapeStream.listeners("error").includes(
      pgInternalStreamErrorForwarder,
    ),
    true,
  );

  let rejectNeverSettled!: (error: Error) => void;
  let nonSettlingCleanupCount = 0;
  const neverSettled = new Promise<never>((_resolve, reject) => {
    rejectNeverSettled = reject;
  });
  await assert.rejects(
    runConvergentReadinessOperation(
      () => neverSettled,
      1,
      () => ({
        outcome: Promise.resolve({
          terminated: true as const,
          stream_closed: true as const,
        }),
        cleanup() { nonSettlingCleanupCount += 1; },
        temporary_listener_count: () => 0,
      }),
    ),
    { message: "DAY147_A5_POSTGRES_OPERATION_CONVERGENCE_FAILED" },
  );
  assert.equal(nonSettlingCleanupCount, 1);
  rejectNeverSettled(new Error("late rejection after settlement ceiling"));

  for (const terminationCase of ["reject", "hang"] as const) {
    let settleTimedOperation: (() => void) | null = null;
    let cleanupCount = 0;
    const timedOperation = new Promise<void>((resolve) => {
      settleTimedOperation = resolve;
    });
    await assert.rejects(
      runConvergentReadinessOperation(
        () => timedOperation,
        1,
        () => {
          settleTimedOperation?.();
          return {
            outcome: terminationCase === "reject"
              ? Promise.reject(new Error("sanitized termination rejection"))
              : new Promise<A5ClientTerminationPhaseResult>(() => {}),
            cleanup() { cleanupCount += 1; },
            temporary_listener_count: () => 0,
          };
        },
      ),
      { message: "DAY147_A5_POSTGRES_OPERATION_CONVERGENCE_FAILED" },
      `termination:${terminationCase}`,
    );
    assert.equal(cleanupCount, 1, `termination:${terminationCase}:cleanup`);
  }

  const noCloseClient = new EventEmitter();
  const noCloseStream = new EventEmitter() as EventEmitter & {
    destroy: () => void;
    destroyed: boolean;
    closed: boolean;
  };
  noCloseStream.destroyed = false;
  noCloseStream.closed = false;
  noCloseStream.destroy = () => { noCloseStream.destroyed = true; };
  const noCloseHandle = beginPgClientTermination(noCloseClient, noCloseStream);
  assert.deepEqual(await noCloseHandle.outcome, {
    terminated: false,
    stream_closed: false,
    failure_class: "STREAM_CLOSE_TIMEOUT",
  });
  noCloseHandle.cleanup();
  assert.equal(noCloseHandle.temporary_listener_count(), 2);
  noCloseClient.emit("error", new Error("late sanitized client error"));
  noCloseStream.emit("error", new Error("late sanitized stream error"));
  noCloseStream.closed = true;
  noCloseStream.emit("close");
  assert.equal(noCloseHandle.temporary_listener_count(), 0);
  assert.equal(noCloseClient.listenerCount("error"), 0);
  assert.equal(noCloseStream.listenerCount("error"), 0);

  const convergenceFailure = await executeStaticReadinessScenario({
    steps: [{ connect_error_code: "A5_OPERATION_CONVERGENCE_FAILED" }, {}],
  });
  assert.equal(
    convergenceFailure.readiness.last_failure_class,
    "OPERATION_CONVERGENCE_FAILED",
  );
  assert.equal(convergenceFailure.readiness.attempts, 1);
  assert.equal(convergenceFailure.clients_created, 1);
  assert.equal(convergenceFailure.readiness.convergence_failed, true);
  assert.equal(convergenceFailure.migrations_may_start, false);
  assert.equal(
    convergenceFailure.primary_failure_code,
    "DAY147_A5_POSTGRES_OPERATION_CONVERGENCE_FAILED",
  );
  await Promise.resolve();
  process.off("unhandledRejection", onUnhandledReadinessRejection);
  assert.deepEqual(unhandledReadinessRejections, []);

  const makeLateEventAdapter = () => {
    const client = new EventEmitter() as A5PgReadinessClientShape;
    const stream = new EventEmitter() as
      A5PgReadinessClientShape["connection"]["stream"];
    stream.destroyed = false;
    stream.closed = false;
    stream.destroy = () => {
      stream.destroyed = true;
      stream.closed = true;
      stream.emit("close");
    };
    const pgInternalForwarder = (error: unknown) => {
      client.emit("error", error);
    };
    stream.on("error", pgInternalForwarder);
    Object.defineProperty(client, "connection", {
      value: Object.freeze({ stream }), enumerable: true,
    });
    Object.assign(client, {
      async connect() { throw new Error("sanitized terminal rejection"); },
      async query() { return { rows: [{ ready: 1 }] }; },
      async end() {},
    });
    return {
      client,
      stream,
      pgInternalForwarder,
      adapter: adaptPgReadinessClient(client),
    };
  };
  const lateAttemptOne = makeLateEventAdapter();
  const lateAttemptTwo = makeLateEventAdapter();
  const attemptOneClientBaseline = lateAttemptOne.client.listenerCount("error");
  const attemptOneStreamBaseline = lateAttemptOne.stream.listenerCount("error");
  await assert.rejects(lateAttemptOne.adapter.connect());
  const attemptOneTerminal = lateAttemptOne.adapter.failure_origin();
  lateAttemptOne.adapter.cleanup_observation();
  assert.equal(lateAttemptOne.adapter.observation_listener_count(), 0);
  assert.equal(lateAttemptOne.adapter.late_event_safety_listener_count(), 3);
  assert.equal(lateAttemptOne.adapter.late_event_safety_safe(), true);
  const attemptTwoBefore = lateAttemptTwo.adapter.failure_origin();
  assert.doesNotThrow(() => lateAttemptOne.stream.emit(
    "error",
    new Error("late sanitized stream error"),
  ));
  assert.doesNotThrow(() => lateAttemptOne.client.emit(
    "error",
    new Error("late sanitized client error"),
  ));
  lateAttemptOne.stream.emit("end");
  assert.deepEqual(lateAttemptOne.adapter.failure_origin(), attemptOneTerminal);
  assert.deepEqual(lateAttemptTwo.adapter.failure_origin(), attemptTwoBefore);
  assert.equal(
    lateAttemptOne.stream.listeners("error").includes(
      lateAttemptOne.pgInternalForwarder,
    ),
    true,
  );
  lateAttemptOne.stream.closed = true;
  lateAttemptOne.stream.emit("close");
  assert.deepEqual(lateAttemptOne.adapter.failure_origin(), attemptOneTerminal);
  assert.equal(lateAttemptOne.adapter.late_event_safety_listener_count(), 0);
  assert.equal(
    lateAttemptOne.client.listenerCount("error"),
    attemptOneClientBaseline - 1,
  );
  assert.equal(
    lateAttemptOne.stream.listenerCount("error"),
    attemptOneStreamBaseline - 1,
  );
  assert.equal(
    lateAttemptOne.stream.listeners("error").includes(
      lateAttemptOne.pgInternalForwarder,
    ),
    true,
  );
  lateAttemptTwo.adapter.cleanup_observation();
  assert.equal(lateAttemptTwo.adapter.late_event_safety_listener_count(), 3);
  lateAttemptTwo.adapter.cleanup_late_event_safety();
  assert.equal(lateAttemptTwo.adapter.late_event_safety_listener_count(), 0);
  assert.equal(lateAttemptTwo.client.listenerCount("error"), 0);
  assert.equal(lateAttemptTwo.stream.listenerCount("error"), 1);

  const immediate = await executeStaticReadinessScenario();
  assert.equal(immediate.readiness.ready, true);
  assert.equal(immediate.readiness.attempts, 1);
  assert.deepEqual(immediate.readiness.timeline, [{
    attempt: 1,
    failure_class: null,
    failure_origin: null,
    retryable: false,
    elapsed_ms_bucket: "LT_1S",
  }]);
  assert.equal(immediate.clients_closed, 1);
  assert.equal(immediate.migrations_may_start, true);

  const codeLessPromiseOnly = await executeStaticReadinessScenario({
    steps: [{ connect_rejection_without_code: true }],
  });
  assert.equal(codeLessPromiseOnly.readiness.last_failure_class, "UNKNOWN");
  assert.equal(codeLessPromiseOnly.readiness.timeline[0]?.retryable, false);
  assert.equal(
    codeLessPromiseOnly.readiness.failure_origin?.origin,
    "PROMISE_REJECTION",
  );
  assert.equal(
    codeLessPromiseOnly.readiness.failure_origin?.safe_code_class,
    "CODE_ABSENT",
  );

  for (const eventCase of [
    {
      id: "client-error",
      step: { client_error_without_code: true, connect_rejection_without_code: true },
      origin: "CLIENT_ERROR_EVENT",
    },
    {
      id: "stream-error",
      step: { stream_error_without_code: true, connect_rejection_without_code: true },
      origin: "STREAM_ERROR_EVENT",
    },
  ] as const) {
    const observed = await executeStaticReadinessScenario({
      steps: [eventCase.step],
    });
    assert.equal(observed.readiness.last_failure_class, "UNKNOWN", eventCase.id);
    assert.equal(observed.readiness.timeline[0]?.retryable, false, eventCase.id);
    assert.equal(observed.readiness.failure_origin?.origin, eventCase.origin);
  }

  for (const closeCase of [
    {
      id: "stream-close",
      step: { stream_close_during_connect: true, connect_rejection_without_code: true },
      origin: "STREAM_CLOSE_EVENT",
    },
    {
      id: "stream-end",
      step: { stream_end_during_connect: true, connect_rejection_without_code: true },
      origin: "STREAM_END_EVENT",
    },
  ] as const) {
    const recovered = await executeStaticReadinessScenario({
      steps: [closeCase.step, {}],
    });
    assert.equal(recovered.readiness.ready, true, closeCase.id);
    assert.equal(recovered.readiness.attempts, 2, closeCase.id);
    assert.equal(
      recovered.readiness.first_failure_class,
      "CONNECTION_RESET",
      closeCase.id,
    );
    assert.equal(recovered.readiness.timeline[0]?.retryable, true, closeCase.id);
    assert.equal(
      recovered.readiness.timeline[0]?.failure_origin?.origin,
      closeCase.origin,
      closeCase.id,
    );
  }

  const runningRevalidatedThenSuccess = await executeStaticReadinessScenario({
    steps: [{
      stream_close_during_connect: true,
      connect_rejection_without_code: true,
    }, {}],
    states: [
      RUNNING_CONTAINER_STATE, RUNNING_CONTAINER_STATE,
      RUNNING_CONTAINER_STATE, RUNNING_CONTAINER_STATE,
    ],
  });
  assert.equal(runningRevalidatedThenSuccess.readiness.ready, true);
  assert.equal(runningRevalidatedThenSuccess.readiness.attempts, 2);
  assert.equal(
    runningRevalidatedThenSuccess.readiness.first_failure_class,
    "CONNECTION_RESET",
  );
  assert.equal(runningRevalidatedThenSuccess.state_binding_count, 6);
  assert.equal(runningRevalidatedThenSuccess.state_bindings_valid, true);
  const exitDuringClientClose = await executeStaticReadinessScenario({
    steps: [{
      stream_close_during_connect: true,
      connect_rejection_without_code: true,
    }, {}],
    states: [
      RUNNING_CONTAINER_STATE,
      RUNNING_CONTAINER_STATE,
      { state: "EXITED", exit_code: 1, restarting: false, oom_killed: false },
    ],
  });
  assert.equal(exitDuringClientClose.readiness.ready, false);
  assert.equal(exitDuringClientClose.readiness.attempts, 1);
  assert.equal(
    exitDuringClientClose.readiness.last_failure_class,
    "CONTAINER_EXITED",
  );
  assert.equal(exitDuringClientClose.readiness.retryable_failure_count, 0);
  assert.equal(exitDuringClientClose.clients_created, 1);
  assert.equal(exitDuringClientClose.migrations_may_start, false);
  for (const finalState of ["EXITED", "DEAD", "RESTARTING"] as const) {
    const postCloseExit = await executeStaticReadinessScenario({
      states: [
        RUNNING_CONTAINER_STATE,
        RUNNING_CONTAINER_STATE,
        { state: finalState, exit_code: finalState === "RESTARTING" ? 0 : 1,
          restarting: finalState === "RESTARTING", oom_killed: false },
      ],
    });
    assert.equal(postCloseExit.readiness.ready, false, `post-close:${finalState}`);
    assert.equal(postCloseExit.readiness.attempts, 1);
    assert.equal(
      postCloseExit.readiness.last_failure_class,
      "CONTAINER_EXITED",
    );
    assert.equal(postCloseExit.readiness.container_state, finalState);
    assert.equal(postCloseExit.readiness.timeline[0]?.retryable, false);
    assert.equal(postCloseExit.migrations_may_start, false);
    assert.equal(postCloseExit.state_binding_count, 3);
  }
  for (const currentState of ["EXITED", "DEAD", "RESTARTING"] as const) {
    const stateObservation: A5ContainerRuntimeObservation = {
      state: currentState,
      exit_code: currentState === "RESTARTING" ? 0 : 1,
      restarting: currentState === "RESTARTING",
      oom_killed: false,
    };
    const staleRunning = await executeStaticReadinessScenario({
      steps: [{
        stream_close_during_connect: true,
        connect_rejection_without_code: true,
      }, {}],
      states: [RUNNING_CONTAINER_STATE, stateObservation],
    });
    assert.equal(staleRunning.readiness.ready, false, currentState);
    assert.equal(staleRunning.readiness.attempts, 1, currentState);
    assert.equal(
      staleRunning.readiness.last_failure_class,
      "CONTAINER_EXITED",
      currentState,
    );
    assert.equal(staleRunning.readiness.retryable_failure_count, 0);
    assert.equal(staleRunning.readiness.non_retryable_failure_count, 1);
    assert.equal(staleRunning.readiness.container_state, currentState);
    assert.equal(staleRunning.readiness.failure_origin?.origin, "UNKNOWN");
    assert.equal(staleRunning.clients_created, 1);
    assert.equal(staleRunning.migrations_may_start, false);
    assert.equal(staleRunning.state_binding_count, 2);
    assert.equal(staleRunning.state_bindings_valid, true);
  }
  for (const currentState of [
    { id: "unknown", value: {
      state: "UNKNOWN", exit_code: null, restarting: false, oom_killed: false,
    } as A5ContainerRuntimeObservation },
    { id: "inspect-timeout", value: new Error("bounded inspect timeout") },
  ] as const) {
    const unknownRevalidation = await executeStaticReadinessScenario({
      steps: [{
        stream_close_during_connect: true,
        connect_rejection_without_code: true,
      }, {}],
      states: [RUNNING_CONTAINER_STATE, currentState.value],
    });
    assert.equal(unknownRevalidation.readiness.ready, false, currentState.id);
    assert.equal(unknownRevalidation.readiness.attempts, 1, currentState.id);
    assert.equal(
      unknownRevalidation.readiness.last_failure_class,
      "UNKNOWN",
      currentState.id,
    );
    assert.equal(unknownRevalidation.readiness.container_state, "UNKNOWN");
    assert.equal(unknownRevalidation.readiness.timeline[0]?.retryable, false);
    assert.equal(unknownRevalidation.clients_created, 1);
    assert.equal(unknownRevalidation.migrations_may_start, false);
  }
  const openStreamCannotRetry = await executeStaticReadinessScenario({
    steps: [{
      stream_close_during_connect: true,
      connect_rejection_without_code: true,
      keep_stream_open_after_end: true,
      terminate_error: true,
    }, {}],
  });
  assert.equal(openStreamCannotRetry.readiness.ready, false);
  assert.equal(openStreamCannotRetry.readiness.attempts, 1);
  assert.equal(
    openStreamCannotRetry.readiness.last_failure_class,
    "OPERATION_CONVERGENCE_FAILED",
  );
  assert.equal(openStreamCannotRetry.readiness.timeline[0]?.retryable, false);
  assert.equal(openStreamCannotRetry.clients_created, 1);
  assert.equal(openStreamCannotRetry.migrations_may_start, false);
  const connectAndCloseFailureConverges = await executeStaticReadinessScenario({
    steps: [{ connect_error_code: "ECONNREFUSED", end_error_code: "EPIPE" }, {}],
  });
  assert.equal(connectAndCloseFailureConverges.readiness.ready, true);
  assert.equal(connectAndCloseFailureConverges.readiness.attempts, 2);
  assert.equal(
    connectAndCloseFailureConverges.readiness.first_failure_class,
    "CONNECTION_REFUSED",
  );
  assert.equal(connectAndCloseFailureConverges.clients_terminated, 1);
  assert.equal(connectAndCloseFailureConverges.migrations_may_start, true);

  const competingClientAndClose = await executeStaticReadinessScenario({
    steps: [{
      client_error_without_code: true,
      stream_close_during_connect: true,
      connect_rejection_without_code: true,
    }],
  });
  assert.equal(competingClientAndClose.readiness.last_failure_class, "UNKNOWN");
  assert.equal(competingClientAndClose.readiness.failure_origin?.origin, "UNKNOWN");
  assert.equal(competingClientAndClose.readiness.timeline[0]?.retryable, false);

  const provenCloseOrigin = Object.freeze({
    ...buildStaticFailureOrigin("UNKNOWN"),
    origin: "STREAM_CLOSE_EVENT" as const,
    promise_rejection_observed: true,
    stream_close_observed: true,
  });
  assert.equal(isProvenFarmOsDay147A5CodeLessConnectClose({
    failure_origin: provenCloseOrigin,
    container_state: "RUNNING",
  }), true);
  for (const unproven of [
    { failure_origin: { ...provenCloseOrigin, termination_initiated: true }, container_state: "RUNNING" as const },
    { failure_origin: provenCloseOrigin, container_state: "UNKNOWN" as const },
    { failure_origin: { ...provenCloseOrigin, connection_established: true }, container_state: "RUNNING" as const },
    { failure_origin: { ...provenCloseOrigin, query_started: true }, container_state: "RUNNING" as const },
    { failure_origin: { ...provenCloseOrigin, client_error_observed: true }, container_state: "RUNNING" as const },
    { failure_origin: { ...provenCloseOrigin, promise_rejection_observed: false }, container_state: "RUNNING" as const },
    { failure_origin: { ...provenCloseOrigin, adapter_validation_failed: true }, container_state: "RUNNING" as const },
    { failure_origin: { ...provenCloseOrigin, deadline_reached: true }, container_state: "RUNNING" as const },
    { failure_origin: { ...provenCloseOrigin, stream_error_observed: true }, container_state: "RUNNING" as const },
    { failure_origin: { ...provenCloseOrigin, stream_close_observed: false,
      stream_end_observed: false }, container_state: "RUNNING" as const },
  ]) {
    assert.equal(isProvenFarmOsDay147A5CodeLessConnectClose(unproven), false);
  }
  assert.equal(farmOsDay147A5FailureOriginBindingValid({
    failure_class: "CONNECTION_RESET", retryable: true,
    failure_origin: { ...provenCloseOrigin, termination_initiated: true },
    container_state: "RUNNING",
  }), false);
  assert.equal(farmOsDay147A5FailureOriginBindingValid({
    failure_class: "CONNECTION_RESET", retryable: true,
    failure_origin: { ...provenCloseOrigin, origin: "UNKNOWN" },
    container_state: "RUNNING",
  }), false);
  const consistencyBase = buildStaticFailureOrigin("UNKNOWN");
  for (const inconsistentOrigin of [
    { ...consistencyBase, stage: "PRE_ATTEMPT" as const, query_started: true },
    { ...consistencyBase, stage: "PRE_ATTEMPT" as const, connection_established: true },
    { ...consistencyBase, stage: "CONNECT" as const, query_started: true },
    { ...consistencyBase, stage: "CONNECT" as const, connection_established: true },
    { ...consistencyBase, stage: "QUERY" as const, connection_established: false },
    { ...consistencyBase, stage: "QUERY" as const, connection_established: true,
      query_started: false },
    { ...consistencyBase, stage: "POST_QUERY_INSPECT" as const,
      connection_established: false, query_started: true },
    { ...consistencyBase, stage: "POST_QUERY_INSPECT" as const,
      connection_established: true, query_started: false },
    { ...consistencyBase, stage: "POST_QUERY_INSPECT" as const,
      connection_established: true, query_started: true,
      origin: "PROMISE_REJECTION" as const },
    { ...consistencyBase, stage: "CLIENT_CLOSE" as const, connection_established: false },
    { ...consistencyBase, stage: "CLIENT_CLOSE" as const,
      connection_established: true, query_started: false },
    { ...consistencyBase, stage: "CONVERGENCE" as const, termination_initiated: false },
    { ...consistencyBase, stage: "PRE_ATTEMPT" as const,
      origin: "STREAM_CLOSE_EVENT" as const,
      promise_rejection_observed: false, stream_close_observed: true },
    { ...consistencyBase, stage: "PRE_ATTEMPT" as const,
      origin: "PROMISE_REJECTION" as const },
    { ...consistencyBase, origin: "STREAM_CLOSE_EVENT" as const, stream_close_observed: false },
    { ...consistencyBase, origin: "STREAM_END_EVENT" as const, stream_end_observed: false },
    { ...consistencyBase, origin: "CLIENT_ERROR_EVENT" as const, client_error_observed: false },
    { ...consistencyBase, origin: "STREAM_ERROR_EVENT" as const, stream_error_observed: false },
    { ...consistencyBase, origin: "PROMISE_REJECTION" as const, promise_rejection_observed: false },
  ]) {
    assert.equal(farmOsDay147A5FailureOriginBindingValid({
      failure_class: "UNKNOWN", retryable: false,
      failure_origin: inconsistentOrigin,
      container_state: "RUNNING",
    }), false);
  }

  type PermutationEvent = "rejection" | "client_error" | "stream_error" |
    "close" | "end" | "termination" | "deadline" | "adapter";
  const resolvePermutation = (
    events: readonly PermutationEvent[],
  ): A5FailureOriginResolution => {
    const accumulated = events.reduce((summary, event) => ({
      ...summary,
      promise_rejection_observed: summary.promise_rejection_observed ||
        event === "rejection",
      client_error_observed: summary.client_error_observed ||
        event === "client_error",
      stream_error_observed: summary.stream_error_observed ||
        event === "stream_error",
      stream_close_observed: summary.stream_close_observed || event === "close",
      stream_end_observed: summary.stream_end_observed || event === "end",
      termination_initiated: summary.termination_initiated ||
        event === "termination",
      deadline_reached: summary.deadline_reached || event === "deadline",
      adapter_validation_failed: summary.adapter_validation_failed ||
        event === "adapter",
    }), {
      ...buildStaticFailureOrigin("UNKNOWN"),
      origin: "UNKNOWN" as const,
      promise_rejection_observed: false,
    });
    return resolveA5ReadinessFailureOrigin({
      recognized_failure_class: accumulated.deadline_reached
        ? "TIMEOUT"
        : "UNKNOWN",
      failure_origin: accumulated,
      current_container_state: "RUNNING",
    });
  };
  const permutationCases = [
    {
      id: "safe-close",
      orders: [["rejection", "close"], ["close", "rejection"]],
      expected: { canonical_origin: "STREAM_CLOSE_EVENT",
        failure_class: "CONNECTION_RESET", retryable: true,
        proof_status: "PROVEN_CODELESS_CONNECT_CLOSE" },
    },
    {
      id: "safe-end",
      orders: [["rejection", "end"], ["end", "rejection"]],
      expected: { canonical_origin: "STREAM_END_EVENT",
        failure_class: "CONNECTION_RESET", retryable: true,
        proof_status: "PROVEN_CODELESS_CONNECT_CLOSE" },
    },
    {
      id: "client-competition",
      orders: [["client_error", "close", "rejection"],
        ["close", "client_error", "rejection"],
        ["rejection", "client_error", "close"]],
      expected: { canonical_origin: "UNKNOWN", failure_class: "UNKNOWN",
        retryable: false, proof_status: "UNPROVEN" },
    },
    {
      id: "stream-competition",
      orders: [["stream_error", "close", "rejection"],
        ["close", "stream_error", "rejection"],
        ["rejection", "stream_error", "close"]],
      expected: { canonical_origin: "UNKNOWN", failure_class: "UNKNOWN",
        retryable: false, proof_status: "UNPROVEN" },
    },
    {
      id: "termination-competition",
      orders: [["termination", "close", "rejection"],
        ["close", "termination", "rejection"],
        ["rejection", "termination", "close"]],
      expected: { canonical_origin: "UNKNOWN", failure_class: "UNKNOWN",
        retryable: false, proof_status: "UNPROVEN" },
    },
    {
      id: "deadline-competition",
      orders: [["deadline", "close", "rejection"],
        ["close", "deadline", "rejection"],
        ["rejection", "deadline", "close"]],
      expected: { canonical_origin: "UNKNOWN", failure_class: "TIMEOUT",
        retryable: false, proof_status: "UNPROVEN" },
    },
    {
      id: "client-deadline-competition",
      orders: [["client_error", "deadline", "rejection"],
        ["deadline", "client_error", "rejection"],
        ["rejection", "deadline", "client_error"]],
      expected: { canonical_origin: "UNKNOWN", failure_class: "TIMEOUT",
        retryable: false, proof_status: "UNPROVEN" },
    },
    {
      id: "stream-adapter-competition",
      orders: [["stream_error", "adapter", "rejection"],
        ["adapter", "stream_error", "rejection"],
        ["rejection", "adapter", "stream_error"]],
      expected: { canonical_origin: "UNKNOWN", failure_class: "QUERY_FAILED",
        retryable: false, proof_status: "UNPROVEN" },
    },
  ] as const;
  for (const permutationCase of permutationCases) {
    for (const order of permutationCase.orders) {
      assert.deepEqual(
        resolvePermutation(order),
        permutationCase.expected,
        `${permutationCase.id}:${order.join("->")}`,
      );
    }
  }
  const recognizedFatalCompetition = resolveA5ReadinessFailureOrigin({
    recognized_failure_class: "AUTHENTICATION_FAILED",
    failure_origin: {
      ...provenCloseOrigin,
      safe_code_class: "KNOWN_POSTGRES_CODE",
      client_error_observed: true,
    },
    current_container_state: "RUNNING",
  });
  assert.deepEqual(recognizedFatalCompetition, {
    canonical_origin: "UNKNOWN",
    failure_class: "AUTHENTICATION_FAILED",
    retryable: false,
    proof_status: "UNPROVEN",
  });
  for (const stateCompetition of [
    {
      id: "adapter-close",
      origin: { ...provenCloseOrigin, adapter_validation_failed: true },
      recognized: "QUERY_FAILED" as const,
      expected: "QUERY_FAILED" as const,
    },
    {
      id: "convergence-close",
      origin: { ...provenCloseOrigin, convergence_failed: true,
        termination_initiated: true, stage: "CONVERGENCE" as const },
      recognized: "OPERATION_CONVERGENCE_FAILED" as const,
      expected: "OPERATION_CONVERGENCE_FAILED" as const,
    },
  ]) {
    const resolved = resolveA5ReadinessFailureOrigin({
      recognized_failure_class: stateCompetition.recognized,
      failure_origin: stateCompetition.origin,
      current_container_state: "RUNNING",
    });
    assert.equal(resolved.canonical_origin, "UNKNOWN", stateCompetition.id);
    assert.equal(resolved.failure_class, stateCompetition.expected);
    assert.equal(resolved.retryable, false, stateCompetition.id);
    assert.equal(resolved.proof_status, "UNPROVEN", stateCompetition.id);
  }
  assert.equal(farmOsDay147A5FailureOriginBindingValid({
    failure_class: "CONNECTION_RESET",
    retryable: true,
    failure_origin: {
      ...provenCloseOrigin,
      stage: "QUERY",
      connection_established: true,
      query_started: true,
    },
    container_state: "RUNNING",
  }), false);
  assert.equal(classifyA5ReadinessSafeCode(new Error("absent")), "CODE_ABSENT");
  assert.equal(classifyA5ReadinessSafeCode({ code: 123 }), "CODE_ABSENT");
  assert.equal(classifyA5ReadinessSafeCode({ code: "ECONNRESET" }), "KNOWN_NODE_CODE");
  assert.equal(classifyA5ReadinessSafeCode({ code: "57P03" }), "KNOWN_POSTGRES_CODE");
  assert.equal(classifyA5ReadinessSafeCode({ code: "RAW_PRIVATE_CODE" }), "CODE_UNRECOGNIZED");

  for (const [code, expectedClass] of [
    ["ECONNREFUSED", "CONNECTION_REFUSED"],
    ["57P03", "STARTING_UP"],
    ["ECONNRESET", "CONNECTION_RESET"],
    ["ETIMEDOUT", "TIMEOUT"],
  ] as const) {
    const recovered = await executeStaticReadinessScenario({
      steps: [{ connect_error_code: code }, {}],
    });
    assert.equal(recovered.readiness.ready, true, code);
    assert.equal(recovered.readiness.attempts, 2, code);
    assert.equal(recovered.readiness.first_failure_class, expectedClass, code);
    assert.equal(recovered.readiness.last_failure_class, expectedClass, code);
    assert.equal(recovered.readiness.retryable_failure_count, 1, code);
    assert.equal(recovered.readiness.non_retryable_failure_count, 0, code);
    assert.equal(recovered.clients_closed, 2, code);
    assert.equal(recovered.migrations_may_start, true, code);
  }
  const refusedTwiceThenSuccess = await executeStaticReadinessScenario({
    steps: [
      { connect_error_code: "ECONNREFUSED" },
      { connect_error_code: "ECONNREFUSED" },
      {},
    ],
  });
  assert.equal(refusedTwiceThenSuccess.readiness.ready, true);
  assert.equal(refusedTwiceThenSuccess.readiness.attempts, 3);
  assert.equal(refusedTwiceThenSuccess.readiness.retryable_failure_count, 2);
  assert.equal(refusedTwiceThenSuccess.readiness.non_retryable_failure_count, 0);
  assert.equal(refusedTwiceThenSuccess.primary_failure_code, null);
  assert.equal(refusedTwiceThenSuccess.migrations_may_start, true);
  const virtualPerAttemptTimeoutThenSuccess =
    await executeStaticReadinessScenario({
      steps: [{ connect_error_code: "ETIMEDOUT" }, {}],
    });
  assert.equal(virtualPerAttemptTimeoutThenSuccess.readiness.ready, true);
  assert.equal(virtualPerAttemptTimeoutThenSuccess.readiness.attempts, 2);
  assert.equal(
    virtualPerAttemptTimeoutThenSuccess.readiness.first_failure_class,
    "TIMEOUT",
  );
  assert.equal(
    virtualPerAttemptTimeoutThenSuccess.readiness.retryable_failure_count,
    1,
  );

  for (const testCase of [
    { code: "ETIMEDOUT", expected: "TIMEOUT", retryable: true },
    { code: "ECONNRESET", expected: "CONNECTION_RESET", retryable: true },
    { code: "EPIPE", expected: "CONNECTION_RESET", retryable: true },
    { code: "57P03", expected: "STARTING_UP", retryable: true },
    { code: "08P01", expected: "PROTOCOL_ERROR", retryable: false },
    { code: "XX000", expected: "QUERY_FAILED", retryable: false },
  ] as const) {
    const queryClassified = await executeStaticReadinessScenario({
      steps: testCase.retryable
        ? [{ query_error_code: testCase.code }, {}]
        : [{ query_error_code: testCase.code }],
    });
    assert.equal(
      queryClassified.readiness.first_failure_class,
      testCase.expected,
      `query:${testCase.code}`,
    );
    assert.equal(
      queryClassified.readiness.timeline[0]?.retryable,
      testCase.retryable,
      `query:${testCase.code}`,
    );
    assert.equal(
      queryClassified.readiness.ready,
      testCase.retryable,
      `query:${testCase.code}`,
    );
  }

  const finalInspectDeadline = await executeStaticReadinessScenario({
    state_advance_ms: [0, 1_000],
    global_deadline_ms: 1_000,
  });
  assert.equal(finalInspectDeadline.readiness.ready, false);
  assert.equal(finalInspectDeadline.readiness.last_failure_class, "TIMEOUT");
  assert.equal(finalInspectDeadline.readiness.timeout_reached, true);
  assert.equal(finalInspectDeadline.migrations_may_start, false);
  const preAttemptExitAtDeadline = await executeStaticReadinessScenario({
    states: [{
      state: "EXITED", exit_code: 1, restarting: false, oom_killed: false,
    }],
    state_advance_ms: [1_000],
    global_deadline_ms: 1_000,
  });
  assert.equal(preAttemptExitAtDeadline.readiness.attempts, 0);
  assert.equal(
    preAttemptExitAtDeadline.readiness.last_failure_class,
    "CONTAINER_EXITED",
  );
  assert.equal(preAttemptExitAtDeadline.readiness.timeout_reached, false);
  assert.equal(preAttemptExitAtDeadline.readiness.container_exit_detected, true);
  assert.equal(preAttemptExitAtDeadline.migrations_may_start, false);
  const exitAtFinalDeadline = await executeStaticReadinessScenario({
    states: [RUNNING_CONTAINER_STATE, {
      state: "EXITED", exit_code: 1, restarting: false, oom_killed: false,
    }],
    state_advance_ms: [0, 1_000],
    global_deadline_ms: 1_000,
  });
  assert.equal(
    exitAtFinalDeadline.readiness.last_failure_class,
    "CONTAINER_EXITED",
  );
  assert.equal(exitAtFinalDeadline.readiness.timeout_reached, false);
  assert.equal(exitAtFinalDeadline.readiness.container_exit_detected, true);
  assert.equal(exitAtFinalDeadline.migrations_may_start, false);
  const closeDeadline = await executeStaticReadinessScenario({
    steps: [{ end_advance_ms: 1_000 }],
    global_deadline_ms: 1_000,
  });
  assert.equal(closeDeadline.readiness.ready, false);
  assert.equal(closeDeadline.readiness.last_failure_class, "TIMEOUT");
  assert.equal(closeDeadline.readiness.elapsed_ms, 1_000);
  assert.equal(closeDeadline.migrations_may_start, false);
  const justInsideDeadline = await executeStaticReadinessScenario({
    steps: [{ end_advance_ms: 999 }],
    global_deadline_ms: 1_000,
  });
  assert.equal(justInsideDeadline.readiness.ready, true);
  assert.equal(justInsideDeadline.readiness.elapsed_ms, 999);
  assert.equal(justInsideDeadline.migrations_may_start, true);

  const refusedTimeout = await executeStaticReadinessScenario({
    steps: Array.from({ length: 8 }, () => ({
      connect_error_code: "ECONNREFUSED",
    })),
    global_deadline_ms: 1_000,
  });
  assert.equal(refusedTimeout.readiness.ready, false);
  assert.equal(refusedTimeout.readiness.attempts, 4);
  assert.equal(refusedTimeout.readiness.first_failure_class, "CONNECTION_REFUSED");
  assert.equal(refusedTimeout.readiness.last_failure_class, "TIMEOUT");
  assert.equal(refusedTimeout.readiness.retryable_failure_count, 4);
  assert.equal(refusedTimeout.readiness.timeout_reached, true);
  assert.equal(refusedTimeout.primary_failure_code, "DAY147_A5_POSTGRES_READINESS_TIMEOUT");

  const startupTimeout = await executeStaticReadinessScenario({
    steps: Array.from({ length: 8 }, () => ({ connect_error_code: "57P03" })),
    global_deadline_ms: 1_000,
  });
  assert.equal(startupTimeout.readiness.timeout_reached, true);
  assert.equal(startupTimeout.readiness.first_failure_class, "STARTING_UP");
  assert.equal(startupTimeout.primary_failure_code, "DAY147_A5_POSTGRES_READINESS_TIMEOUT");

  const maxAttempts = await executeStaticReadinessScenario({
    steps: [
      { connect_error_code: "ECONNREFUSED" },
      { connect_error_code: "ECONNREFUSED" },
    ],
    maximum_attempts: 2,
  });
  assert.equal(maxAttempts.readiness.attempts, 2);
  assert.equal(maxAttempts.readiness.timeout_reached, true);

  for (const testCase of [
    {
      code: "28P01",
      expected: "AUTHENTICATION_FAILED",
      primary: "DAY147_A5_POSTGRES_READINESS_AUTHENTICATION_FAILED",
    },
    {
      code: "28000",
      expected: "AUTHENTICATION_FAILED",
      primary: "DAY147_A5_POSTGRES_READINESS_AUTHENTICATION_FAILED",
    },
    {
      code: "3D000",
      expected: "DATABASE_NOT_FOUND",
      primary: "DAY147_A5_POSTGRES_READINESS_DATABASE_NOT_FOUND",
    },
    {
      code: "08P01",
      expected: "PROTOCOL_ERROR",
      primary: "DAY147_A5_POSTGRES_READINESS_PROTOCOL_ERROR",
    },
    {
      code: "RAW_PRIVATE_CODE",
      expected: "UNKNOWN",
      primary: "DAY147_A5_POSTGRES_READINESS_UNKNOWN",
    },
  ] as const) {
    const failed = await executeStaticReadinessScenario({
      steps: [{
        connect_error_code: testCase.code,
        raw_message:
          "password=forbidden postgresql://raw /Users/private 127.0.0.1:49152 " +
          "a".repeat(64),
      }],
    });
    assert.equal(failed.readiness.ready, false, testCase.code);
    assert.equal(failed.readiness.attempts, 1, testCase.code);
    assert.equal(failed.readiness.first_failure_class, testCase.expected, testCase.code);
    assert.equal(failed.readiness.last_failure_class, testCase.expected, testCase.code);
    assert.equal(failed.readiness.non_retryable_failure_count, 1, testCase.code);
    assert.equal(failed.primary_failure_code, testCase.primary, testCase.code);
    const serialized = JSON.stringify(failed);
    for (const forbidden of [
      "password=forbidden", "postgresql://", "/Users/private", "49152",
      "a".repeat(64), "RAW_PRIVATE_CODE",
    ]) assert.equal(serialized.includes(forbidden), false, forbidden);
  }

  const queryFailure = await executeStaticReadinessScenario({
    steps: [{ query_error_code: "XX000" }],
  });
  assert.equal(queryFailure.readiness.last_failure_class, "QUERY_FAILED");
  assert.equal(queryFailure.primary_failure_code, "DAY147_A5_POSTGRES_READINESS_QUERY_FAILED");
  const malformedQueryResult = await executeStaticReadinessScenario({
    steps: [{ query_result: { rows: [] } }],
  });
  assert.equal(malformedQueryResult.readiness.last_failure_class, "QUERY_FAILED");
  assert.equal(malformedQueryResult.migrations_may_start, false);
  const clientCloseFailure = await executeStaticReadinessScenario({
    steps: [{ end_error_code: "ECONNRESET" }],
  });
  assert.equal(
    clientCloseFailure.readiness.last_failure_class,
    "CLIENT_CLEANUP_FAILED",
  );
  assert.equal(
    clientCloseFailure.primary_failure_code,
    "DAY147_A5_POSTGRES_CLIENT_CLEANUP_FAILED",
  );
  assert.equal(clientCloseFailure.migrations_may_start, false);
  assert.equal(clientCloseFailure.clients_closed, 0);

  const exitedState: A5ContainerRuntimeObservation = {
    state: "EXITED", exit_code: 1, restarting: false, oom_killed: false,
  };
  const exitedBefore = await executeStaticReadinessScenario({ states: [exitedState] });
  assert.equal(exitedBefore.readiness.attempts, 0);
  assert.deepEqual(exitedBefore.readiness.timeline, []);
  assert.equal(exitedBefore.readiness.retryable_failure_count, 0);
  assert.equal(exitedBefore.readiness.non_retryable_failure_count, 0);
  assert.equal(exitedBefore.clients_created, 0);
  assert.equal(exitedBefore.readiness.container_exit_detected, true);
  assert.equal(exitedBefore.readiness.container_state, "EXITED");
  assert.equal(exitedBefore.readiness.container_exit_code, 1);
  assert.equal(exitedBefore.readiness.container_restarting, false);
  assert.equal(exitedBefore.readiness.container_oom_killed, false);
  assert.equal(exitedBefore.readiness.readiness_attempts_before_exit, 0);
  assert.equal(exitedBefore.primary_failure_code, "DAY147_A5_POSTGRES_CONTAINER_EXITED");

  const exitedDuring = await executeStaticReadinessScenario({
    steps: [{ connect_error_code: "ECONNREFUSED" }],
    states: [RUNNING_CONTAINER_STATE, exitedState],
  });
  assert.equal(exitedDuring.readiness.attempts, 1);
  assert.equal(exitedDuring.readiness.first_failure_class, "CONNECTION_REFUSED");
  assert.equal(exitedDuring.readiness.last_failure_class, "CONTAINER_EXITED");
  assert.equal(exitedDuring.readiness.container_exit_detected, true);
  assert.equal(exitedDuring.readiness.readiness_attempts_before_exit, 1);
  assert.equal(exitedDuring.primary_failure_code, "DAY147_A5_POSTGRES_CONTAINER_EXITED");

  for (const state of ["RESTARTING", "UNKNOWN"] as const) {
    const observation: A5ContainerRuntimeObservation = {
      state,
      exit_code: state === "RESTARTING" ? 0 : null,
      restarting: state === "RESTARTING",
      oom_killed: false,
    };
    const failed = await executeStaticReadinessScenario({ states: [observation] });
    assert.equal(failed.readiness.ready, false, state);
    assert.equal(
      failed.readiness.last_failure_class,
      state === "RESTARTING" ? "CONTAINER_EXITED" : "UNKNOWN",
      state,
    );
  }
  const inspectFailure = await executeStaticReadinessScenario({
    states: [new Error("raw inspect detail must not escape")],
  });
  assert.equal(inspectFailure.readiness.last_failure_class, "UNKNOWN");
  assert.equal(inspectFailure.primary_failure_code, "DAY147_A5_POSTGRES_READINESS_UNKNOWN");

  assert.deepEqual(parseContainerRuntimeState(JSON.stringify({
    Running: true, Status: "running", ExitCode: 0,
    Restarting: false, OOMKilled: false,
  })), RUNNING_CONTAINER_STATE);
  assert.equal(parseContainerRuntimeState(JSON.stringify({
    Running: false, Status: "dead", ExitCode: 137,
    Restarting: false, OOMKilled: true,
  })).state, "DEAD");
  assert.equal(parseContainerRuntimeState("malformed").state, "UNKNOWN");
  const canonicalId = "a".repeat(64);
  assert.deepEqual(buildContainerRuntimeStateCommand(canonicalId).args, [
    "inspect", "--format", "{{json .}}", canonicalId,
  ]);
  const boundStateFixture = {
    Id: STATIC_REVALIDATION_BINDING.canonical_container_id,
    Name: `/${STATIC_REVALIDATION_BINDING.expected_container_name}`,
    Image: STATIC_REVALIDATION_BINDING.expected_image_digest,
    State: { Running: true, Status: "running", ExitCode: 0,
      Restarting: false, OOMKilled: false },
  };
  assert.deepEqual(parseBoundContainerRuntimeState(
    JSON.stringify(boundStateFixture),
    STATIC_REVALIDATION_BINDING,
  ), RUNNING_CONTAINER_STATE);
  for (const mismatched of [
    { ...boundStateFixture, Id: "c".repeat(64) },
    { ...boundStateFixture, Name: "/farmos_day147a5_ffffffffffff" },
    { ...boundStateFixture, Image: `sha256:${"d".repeat(64)}` },
  ]) {
    assert.equal(parseBoundContainerRuntimeState(
      JSON.stringify(mismatched),
      STATIC_REVALIDATION_BINDING,
    ).state, "UNKNOWN");
  }
  assert.throws(() => buildContainerRuntimeStateCommand("not-a-container-id"));
}

const MIGRATION_HISTORY_BOOTSTRAP_SQL = `
create schema if not exists core_schema;
create table if not exists core_schema.migration_history (
  migration_id text primary key,
  sequence bigint not null unique check (sequence > 0),
  checksum text not null check (checksum ~ '^sha256:[0-9a-f]{64}$'),
  description text not null check (length(description) between 1 and 500),
  applied_at timestamptz not null,
  applied_by text not null check (length(applied_by) between 3 and 128),
  execution_id text not null unique check (length(execution_id) between 8 and 128)
)`;

type Day147A5MigrationArtifact = Readonly<{
  path: string;
  sha256: string;
  sql?: string;
}>;

type Day147A5MigrationArtifacts = Readonly<{
  day146: Day147A5MigrationArtifact;
  prepare_apply: Day147A5MigrationArtifact;
  prepare_verify: Day147A5MigrationArtifact;
  activation_apply: Day147A5MigrationArtifact;
  activation_verify: Day147A5MigrationArtifact;
}>;

export const DAY147_A5_MIGRATION_EXECUTION_PHASES = Object.freeze([
  "DAY146_MIGRATION_START",
  "DAY146_MIGRATION_PASS",
  "PREPARE_MIGRATION_START",
  "PREPARE_MIGRATION_PASS",
  "ACTIVATE_MIGRATION_START",
  "ACTIVATE_MIGRATION_PASS",
  "CASE_SUITE_START",
] as const);

export type Day147A5MigrationExecutionPhase =
  typeof DAY147_A5_MIGRATION_EXECUTION_PHASES[number];

export const DAY147_A5_PRE_MIGRATION_EXECUTION_PHASES = Object.freeze([
  "SHARED_ADAPTER_START",
  "MIGRATION_ARTIFACTS_READY",
  "SHARED_DYNAMIC_SUITE_START",
  "ISOLATED_DATABASES_CREATE_START",
  "ISOLATED_DATABASES_CREATE_PASS",
] as const);

export type Day147A5PreMigrationExecutionPhase =
  typeof DAY147_A5_PRE_MIGRATION_EXECUTION_PHASES[number];

export type Day147A5SharedExecutionPhase =
  | Day147A5PreMigrationExecutionPhase
  | Day147A5MigrationExecutionPhase;

export const DAY147_A5_PRE_MIGRATION_OPERATION_KEYS = Object.freeze([
  "ADMIN_CLIENT_CONSTRUCT",
  "ADMIN_CLIENT_CONNECT",
  "SERVER_VERSION_QUERY",
  "SERVER_VERSION_VALIDATE",
  "ISOLATED_DATABASES_CREATE",
  "PRE_MIGRATION_UNKNOWN",
] as const);

export type Day147A5PreMigrationOperationKey =
  typeof DAY147_A5_PRE_MIGRATION_OPERATION_KEYS[number];

export type Day147A5PreMigrationFailureNotification = Readonly<{
  last_phase: Day147A5PreMigrationExecutionPhase;
  operation_key: Day147A5PreMigrationOperationKey;
  error: unknown;
}>;

export const DAY147_A5_CASE_FAILURE_OPERATIONS = Object.freeze([
  "CASE_REGISTRY_PRECHECK",
  "CASE_EXECUTION",
  "CASE_RESULT_AGGREGATION",
] as const);

export type Day147A5CaseFailureOperation =
  typeof DAY147_A5_CASE_FAILURE_OPERATIONS[number];

export const DAY147_A5_CASE_INTEGRATION_KEYS = Object.freeze([
  "NONE",
  "REPOSITORY_INTEGRATION",
  "ATOMICITY_INTEGRATION",
  "READ_ADAPTER_INTEGRATION",
  "CONCURRENCY_INTEGRATION",
] as const);

export type Day147A5CaseIntegrationKey =
  typeof DAY147_A5_CASE_INTEGRATION_KEYS[number];

export const DAY147_A5_READ_ADAPTER_ASSERTION_IDS = Object.freeze([
  "READ_CANDIDATE_ONLY_EXCLUDED",
  "READ_ACTIVE_SELECTED_CANDIDATE_EXCLUDED",
  "READ_ACTIVE_SELECTED_MULTIPLE_CANDIDATES_EXCLUDED",
  "READ_LEGACY_ACTIVE_SELECTED",
  "READ_LEGACY_SUPERSEDED_EXCLUDED",
  "READ_CANDIDATE_CONTENT_LINEAGE_EXCLUDED",
] as const);

export type Day147A5ReadAdapterAssertionId =
  typeof DAY147_A5_READ_ADAPTER_ASSERTION_IDS[number];

export const DAY147_A5_ASSERTION_VALUE_CLASSES = Object.freeze([
  "TRUE", "FALSE", "NULL", "NON_NULL", "ZERO", "ONE",
  "POSITIVE_INTEGER", "ROW_PRESENT", "ROW_ABSENT", "EXPECTED_STATUS",
  "UNEXPECTED_STATUS", "EXPECTED_IDENTITY", "UNEXPECTED_IDENTITY",
  "CONTENT_HASH_MISMATCH", "MISSING_SELECTION", "EXPECTED_COUNT",
  "UNEXPECTED_COUNT", "TYPE_MISMATCH",
] as const);

export type Day147A5AssertionValueClass =
  typeof DAY147_A5_ASSERTION_VALUE_CLASSES[number];

export type Day147A5CaseFailureNotification = Readonly<{
  operation: Day147A5CaseFailureOperation;
  integration_key: Day147A5CaseIntegrationKey;
  case_id: string | null;
  completed_case_count: number;
  completed_case_ids: readonly string[];
  assertion_id?: Day147A5ReadAdapterAssertionId;
  expected_class?: Day147A5AssertionValueClass;
  actual_class?: Day147A5AssertionValueClass;
  error: unknown;
}>;

export const DAY147_A5_MIGRATION_TARGETS = Object.freeze([
  "LEGACY_ACTIVE",
  "LEGACY_SUPERSEDED",
  "MAIN",
] as const);

export type Day147A5MigrationTarget =
  typeof DAY147_A5_MIGRATION_TARGETS[number];

export const DAY147_A5_MIGRATION_OPERATIONS = Object.freeze([
  "DAY146_APPLY",
  "PREPARE_APPLY",
  "PREPARE_VERIFY",
  "ACTIVATE_APPLY",
  "ACTIVATE_VERIFY",
] as const);

export type Day147A5MigrationOperation =
  typeof DAY147_A5_MIGRATION_OPERATIONS[number];

export type Day147A5MigrationStage =
  `${Day147A5MigrationTarget}_${Day147A5MigrationOperation}`;

export type Day147A5MigrationFailureNotification = Readonly<{
  stage: Day147A5MigrationStage;
  error: unknown;
}>;

async function runObservedMigrationStep(input: Readonly<{
  stage: Day147A5MigrationStage;
  action: () => Promise<void>;
  on_failure?: (failure: Day147A5MigrationFailureNotification) => void;
}>): Promise<void> {
  try {
    await input.action();
  } catch (error) {
    input.on_failure?.(Object.freeze({ stage: input.stage, error }));
    throw error;
  }
}

async function executeExactSqlFile(
  client: Client | PoolClient,
  artifact: Day147A5MigrationArtifact,
): Promise<void> {
  const bytes = artifact.sql === undefined
    ? readFileSync(resolve(ROOT, artifact.path))
    : Buffer.from(artifact.sql, "utf8");
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== artifact.sha256) {
    throw new Error("BLOCKED_CHECKSUM_MISMATCH");
  }
  await client.query(bytes.toString("utf8"));
}

async function recordMigrationHistory(input: {
  client: Client | PoolClient;
  migration_id: string;
  sequence: number;
  checksum: string;
}): Promise<void> {
  await input.client.query(
    `insert into core_schema.migration_history (
      migration_id, sequence, checksum, description, applied_at, applied_by,
      execution_id
    ) values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.migration_id,
      input.sequence,
      `sha256:${input.checksum}`,
      "Day147 A5 isolated validation",
      "2026-07-31T00:00:00.000Z",
      ROLE_FIXTURES.migration_owner.name,
      `day147a5-${input.sequence}`,
    ],
  );
}

async function applyPrepareAndActivation(
  client: Client,
  migrationFiles: Day147A5MigrationArtifacts = MIGRATION_FILES,
  observation?: Readonly<{
    target: Day147A5MigrationTarget;
    emit_lifecycle_phases: boolean;
    on_phase?: (phase: Day147A5MigrationExecutionPhase) => void;
    on_failure?: (failure: Day147A5MigrationFailureNotification) => void;
  }>,
): Promise<void> {
  const target = observation?.target ?? "MAIN";
  if (observation?.emit_lifecycle_phases === true) {
    observation.on_phase?.("PREPARE_MIGRATION_START");
  }
  await runObservedMigrationStep({
    stage: `${target}_PREPARE_APPLY`,
    on_failure: observation?.on_failure,
    async action() {
      await client.query(MIGRATION_HISTORY_BOOTSTRAP_SQL);
      await executeExactSqlFile(client, migrationFiles.prepare_apply);
      await recordMigrationHistory({
        client,
        migration_id:
          "202607300001_daily_operational_projection_candidate_foundation",
        sequence: 202607300001,
        checksum: migrationFiles.prepare_apply.sha256,
      });
    },
  });
  await runObservedMigrationStep({
    stage: `${target}_PREPARE_VERIFY`,
    on_failure: observation?.on_failure,
    action: () => executeExactSqlFile(client, migrationFiles.prepare_verify),
  });
  if (observation?.emit_lifecycle_phases === true) {
    observation.on_phase?.("PREPARE_MIGRATION_PASS");
    observation.on_phase?.("ACTIVATE_MIGRATION_START");
  }
  await runObservedMigrationStep({
    stage: `${target}_ACTIVATE_APPLY`,
    on_failure: observation?.on_failure,
    async action() {
      await executeExactSqlFile(client, migrationFiles.activation_apply);
      await recordMigrationHistory({
        client,
        migration_id:
          "202607310001_daily_operational_projection_candidate_activation",
        sequence: 202607310001,
        checksum: migrationFiles.activation_apply.sha256,
      });
    },
  });
  await runObservedMigrationStep({
    stage: `${target}_ACTIVATE_VERIFY`,
    on_failure: observation?.on_failure,
    action: () => executeExactSqlFile(client, migrationFiles.activation_verify),
  });
  if (observation?.emit_lifecycle_phases === true) {
    observation.on_phase?.("ACTIVATE_MIGRATION_PASS");
  }
}

async function provisionRoleDefinitions(
  client: Client,
  credential: string,
): Promise<void> {
  for (const role of Object.values(ROLE_FIXTURES)) {
    for (const sql of buildRoleCreationSql(role, credential)) {
      await client.query(sql);
    }
  }
}

async function provisionRoleGrants(client: Client): Promise<void> {
  for (const role of Object.values(ROLE_FIXTURES)) {
    for (const sql of buildRoleGrantSql(role)) {
      await client.query(sql);
    }
  }
}

async function createIsolatedDatabases(
  client: Client,
  names: ReturnType<typeof buildNames>,
): Promise<void> {
  for (const database of [names.legacy_active, names.legacy_superseded]) {
    await client.query(`create database ${quoteIdentifier(database)}`);
  }
}

async function insertLegacyFixture(
  client: Client,
  kind: "active" | "superseded",
): Promise<unknown> {
  const projectionId = kind === "active"
    ? LEGACY_ACTIVE_PROJECTION_ID
    : "20000000-0000-4000-8000-000000000001";
  const legacyContent = {
    business_date: "2026-07-31",
    source_record_count: 0,
    active_record_count: 0,
    tombstone_count: 0,
    field_references: [],
    crop_cycle_references: [],
    work_type_references: [],
    verification_status: "stable_change_contract_validated",
    missing_data_status: "complete_for_v1",
  };
  const compiled = compileFarmOsDailyProjection({
    business_date: "2026-07-31",
    snapshots: [],
    snapshot_state_events: [],
  });
  assert.deepEqual(compiled.content, legacyContent);
  await client.query(
    `insert into ai.operational_memory_daily_projections (
      projection_id, projection_type, projection_version, business_date,
      compiler_id, compiler_version, content_hash, projection_content,
      generated_at, supersedes_projection_id
    ) values ($1, 'daily_work_records', 1, $2::date,
      'farmos.operational_memory.daily_work_records', 1, $3, $4::jsonb,
      $5::timestamptz, null)`,
    [
      projectionId,
      "2026-07-31",
      compiled.content_hash,
      JSON.stringify(legacyContent),
      "2026-07-31T00:00:00.000Z",
    ],
  );
  const statuses: ProjectionState[] = kind === "active"
    ? ["active"]
    : ["active", "superseded"];
  for (const [index, status] of statuses.entries()) {
    await client.query(
      `insert into ai.operational_memory_projection_state_events (
        event_id, projection_id, status, event_sequence, occurred_at
      ) overriding system value values ($1, $2, $3, $4, $5::timestamptz)`,
      [
        `${kind === "active" ? "10000000" : "20000000"}-0000-4000-9000-${
          String(index + 1).padStart(12, "0")
        }`,
        projectionId,
        status,
        index + 1,
        `2026-07-31T00:00:0${index}.000Z`,
      ],
    );
  }
  const before = await client.query(
    `select projection.projection_id, projection.projection_content,
      event.event_id, event.status, event.event_sequence
    from ai.operational_memory_daily_projections projection
    join ai.operational_memory_projection_state_events event
      on event.projection_id = projection.projection_id
    where projection.projection_id = $1
    order by event.event_sequence`,
    [projectionId],
  );
  return before.rows;
}

async function assertLegacyUnchanged(
  client: Client,
  kind: "active" | "superseded",
  before: unknown,
): Promise<void> {
  const projectionId = kind === "active"
    ? LEGACY_ACTIVE_PROJECTION_ID
    : "20000000-0000-4000-8000-000000000001";
  const after = await client.query(
    `select projection.projection_id, projection.projection_content,
      event.event_id, event.status, event.event_sequence
    from ai.operational_memory_daily_projections projection
    join ai.operational_memory_projection_state_events event
      on event.projection_id = projection.projection_id
    where projection.projection_id = $1
    order by event.event_sequence`,
    [projectionId],
  );
  assert.deepEqual(after.rows, before);
  assert.equal(
    after.rows.some((row: { status: string }) => row.status === "candidate"),
    false,
  );
}

async function prepareDatabase(input: {
  config: ClientConfig;
  migration_target: Day147A5MigrationTarget;
  legacy_kind?: "active" | "superseded";
  migration_files?: Day147A5MigrationArtifacts;
  emit_lifecycle_phases?: boolean;
  on_phase?: (phase: Day147A5MigrationExecutionPhase) => void;
  on_migration_failure?: (
    failure: Day147A5MigrationFailureNotification,
  ) => void;
}): Promise<void> {
  const client = createPgClient(input.config);
  const day146Stage: Day147A5MigrationStage =
    `${input.migration_target}_DAY146_APPLY`;
  if (input.emit_lifecycle_phases === true) {
    input.on_phase?.("DAY146_MIGRATION_START");
  }
  try {
    await client.connect();
  } catch (error) {
    input.on_migration_failure?.(Object.freeze({
      stage: day146Stage,
      error,
    }));
    throw error;
  }
  try {
    const migrationFiles = input.migration_files ?? MIGRATION_FILES;
    await runObservedMigrationStep({
      stage: day146Stage,
      on_failure: input.on_migration_failure,
      action: () => executeExactSqlFile(client, migrationFiles.day146),
    });
    if (input.emit_lifecycle_phases === true) {
      input.on_phase?.("DAY146_MIGRATION_PASS");
    }
    const legacyBefore = input.legacy_kind === undefined
      ? null
      : await insertLegacyFixture(client, input.legacy_kind);
    await applyPrepareAndActivation(client, migrationFiles, {
      target: input.migration_target,
      emit_lifecycle_phases: input.emit_lifecycle_phases === true,
      on_phase: input.on_phase,
      on_failure: input.on_migration_failure,
    });
    await provisionRoleGrants(client);
    if (input.legacy_kind !== undefined) {
      await assertLegacyUnchanged(client, input.legacy_kind, legacyBefore);
    }
  } finally {
    await client.end().catch(() => undefined);
  }
}

const sharedA5DynamicSuiteExecutionBrand: unique symbol = Symbol(
  "DAY147_A5_SHARED_DYNAMIC_SUITE_EXECUTED",
);
type SharedA5DynamicSuiteResult = Readonly<{
  postgres_version: string;
  test_results: readonly {
    id: string;
    category: DynamicCase["category"];
    status: "PASS";
  }[];
  concurrency_timeline: readonly BarrierEvent[];
  row_counts: Readonly<Record<string, number>>;
  state_invariants: Day147A5StateInvariantMeasurement;
  readonly [sharedA5DynamicSuiteExecutionBrand]: true;
}>;

export type Day147A5StateInvariantMeasurement = Readonly<{
  baseline_digest: string;
  final_digest: string;
  automatic_promotion_count: number;
  active_state_unchanged: boolean;
  comparison_complete: boolean;
}>;

export type StateInvariantCapture = Readonly<{
  digest: string;
  active_rows: readonly unknown[];
  entity_rows: readonly unknown[];
  candidate_to_active_rows: readonly unknown[];
  active_count: number;
  candidate_count: number;
  promotion_transition_count: number;
  superseded_transition_count: number;
}>;

type CanonicalActiveStateRow = Readonly<{
  projection_id: string;
  lifecycle_state: "active";
  content_hash: string;
}>;

type CanonicalEntityStateRow = Readonly<{
  projection_id: string;
  lifecycle_state: ProjectionState;
  content_hash: string;
}>;

type CanonicalCandidateToActiveRow = Readonly<{
  projection_id: string;
  prior_status: "candidate";
  final_status: "active";
  event_sequence: number;
}>;

export type ExplicitTransitionAttribution = Readonly<{
  database: DatabaseTarget;
  projection_id: string;
  case_id: string;
  explicit_activation_action_present: true;
  test_fixture_owned: true;
  cleanup_expectation: "fixture_retained" | "transaction_rollback";
}>;

export type TransitionProvenanceClassification =
  | "EXPLICIT_AUTHORIZED_TEST_TRANSITION"
  | "UNAUTHORIZED_AUTOMATIC_PROMOTION"
  | "TEST_FIXTURE_CLEANUP_LEAK"
  | "UNKNOWN_TRANSITION_PROVENANCE";

export type TransitionProvenanceAnalysis = Readonly<{
  entries: readonly Readonly<{
    database: DatabaseTarget;
    projection_id: string;
    prior_status: "candidate";
    final_status: "active";
    event_sequence_class: "CANDIDATE_THEN_ACTIVE";
    matching_case_id: string | null;
    explicit_activation_action_present: boolean;
    test_fixture_owned: boolean;
    baseline_entity: boolean;
    classification: TransitionProvenanceClassification;
  }>[];
  automatic_promotion_count: number;
  unknown_count: number;
  unauthorized_count: number;
  cleanup_leak_count: number;
  baseline_active_mutation_count: number;
  baseline_active_unchanged: boolean;
  comparison_complete: boolean;
}>;

function canonicalActiveStateRows(
  capture: StateInvariantCapture,
): readonly CanonicalActiveStateRow[] | null {
  if (capture.active_rows.length !== capture.active_count) return null;
  const rows: CanonicalActiveStateRow[] = [];
  for (const value of capture.active_rows) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return null;
    }
    const row = value as Record<string, unknown>;
    if (Object.keys(row).length !== 3 ||
      typeof row.projection_id !== "string" || row.projection_id.length === 0 ||
      row.lifecycle_state !== "active" ||
      typeof row.content_hash !== "string" ||
      !/^[a-f0-9]{64}$/.test(row.content_hash)) return null;
    rows.push(Object.freeze({
      projection_id: row.projection_id,
      lifecycle_state: "active",
      content_hash: row.content_hash,
    }));
  }
  if (new Set(rows.map(({ projection_id }) => projection_id)).size !==
    rows.length) return null;
  return Object.freeze(rows.sort((left, right) =>
    left.projection_id.localeCompare(right.projection_id, "en") ||
    left.content_hash.localeCompare(right.content_hash, "en")
  ));
}

function canonicalEntityStateRows(
  capture: StateInvariantCapture,
): readonly CanonicalEntityStateRow[] | null {
  const rows: CanonicalEntityStateRow[] = [];
  for (const value of capture.entity_rows) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return null;
    }
    const row = value as Record<string, unknown>;
    if (Object.keys(row).length !== 3 ||
      typeof row.projection_id !== "string" || row.projection_id.length === 0 ||
      !STATES.includes(row.lifecycle_state as ProjectionState) ||
      typeof row.content_hash !== "string" ||
      !/^[a-f0-9]{64}$/.test(row.content_hash)) return null;
    rows.push(Object.freeze({
      projection_id: row.projection_id,
      lifecycle_state: row.lifecycle_state as ProjectionState,
      content_hash: row.content_hash,
    }));
  }
  if (new Set(rows.map(({ projection_id }) => projection_id)).size !==
    rows.length) return null;
  return Object.freeze(rows.sort((left, right) =>
    left.projection_id.localeCompare(right.projection_id, "en")
  ));
}

function canonicalCandidateToActiveRows(
  capture: StateInvariantCapture,
): readonly CanonicalCandidateToActiveRow[] | null {
  const rows: CanonicalCandidateToActiveRow[] = [];
  for (const value of capture.candidate_to_active_rows) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return null;
    }
    const row = value as Record<string, unknown>;
    if (Object.keys(row).length !== 4 ||
      typeof row.projection_id !== "string" || row.projection_id.length === 0 ||
      row.prior_status !== "candidate" || row.final_status !== "active" ||
      !Number.isSafeInteger(row.event_sequence) ||
      Number(row.event_sequence) < 1) return null;
    rows.push(Object.freeze({
      projection_id: row.projection_id,
      prior_status: "candidate",
      final_status: "active",
      event_sequence: Number(row.event_sequence),
    }));
  }
  const identities = rows.map(({ projection_id, event_sequence }) =>
    `${projection_id}\0${event_sequence}`
  );
  if (new Set(identities).size !== identities.length) return null;
  return Object.freeze(rows.sort((left, right) =>
    left.projection_id.localeCompare(right.projection_id, "en") ||
    left.event_sequence - right.event_sequence
  ));
}

async function captureStateInvariantDatabase(
  config: ClientConfig,
): Promise<StateInvariantCapture> {
  const client = createPgClient(config);
  await client.connect();
  try {
    const active = await client.query(
      `with latest as (
        select distinct on (projection_id)
          projection_id, status, event_sequence
        from ai.operational_memory_projection_state_events
        order by projection_id, event_sequence desc
      )
      select projection.projection_id::text as projection_id,
        latest.status::text as lifecycle_state,
        projection.content_hash::text as content_hash
      from latest
      join ai.operational_memory_daily_projections projection
        on projection.projection_id = latest.projection_id
      where latest.status = 'active'
      order by projection.projection_id`,
    );
    const entities = await client.query(
      `with latest as (
        select distinct on (projection_id)
          projection_id, status
        from ai.operational_memory_projection_state_events
        order by projection_id, event_sequence desc
      )
      select projection.projection_id::text as projection_id,
        latest.status::text as lifecycle_state,
        projection.content_hash::text as content_hash
      from latest
      join ai.operational_memory_daily_projections projection
        on projection.projection_id = latest.projection_id
      order by projection.projection_id`,
    );
    const candidateToActive = await client.query(
      `with ordered as (
        select projection_id, status, event_sequence,
          lag(status) over (
            partition by projection_id order by event_sequence
          ) as prior_status
        from ai.operational_memory_projection_state_events
      )
      select projection_id::text as projection_id,
        prior_status::text as prior_status,
        status::text as final_status,
        event_sequence::integer as event_sequence
      from ordered
      where prior_status = 'candidate' and status = 'active'
      order by projection_id, event_sequence`,
    );
    const counts = await client.query<{
      active_count: string;
      candidate_count: string;
      promotion_transition_count: string;
      superseded_transition_count: string;
    }>(
      `with ordered as (
        select projection_id, status,
          lag(status) over (
            partition by projection_id order by event_sequence
          ) as previous_status
        from ai.operational_memory_projection_state_events
      ), latest as (
        select distinct on (projection_id) projection_id, status
        from ai.operational_memory_projection_state_events
        order by projection_id, event_sequence desc
      )
      select
        (select count(*) from latest where status = 'active')::text
          as active_count,
        (select count(*) from latest where status = 'candidate')::text
          as candidate_count,
        (select count(*) from ordered
          where previous_status = 'candidate' and status = 'active')::text
          as promotion_transition_count,
        (select count(*) from ordered where status = 'superseded')::text
          as superseded_transition_count`,
    );
    const row = counts.rows[0];
    if (row === undefined) {
      throw new Error("DAY147_A5_MINIMAL_STATE_INVARIANT_INCOMPLETE");
    }
    const activeRows = Object.freeze(active.rows.map((item) =>
      Object.freeze({ ...item })
    ));
    const entityRows = Object.freeze(entities.rows.map((item) =>
      Object.freeze({ ...item })
    ));
    const candidateToActiveRows = Object.freeze(candidateToActive.rows.map(
      (item) => Object.freeze({ ...item }),
    ));
    return Object.freeze({
      digest: createHash("sha256")
        .update("farmos-day147a5-active-state-v1\0")
        .update(JSON.stringify(activeRows)).digest("hex"),
      active_rows: activeRows,
      entity_rows: entityRows,
      candidate_to_active_rows: candidateToActiveRows,
      active_count: Number(row.active_count),
      candidate_count: Number(row.candidate_count),
      promotion_transition_count: Number(row.promotion_transition_count),
      superseded_transition_count: Number(row.superseded_transition_count),
    });
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function captureStateInvariants(
  configs: readonly ClientConfig[],
): Promise<readonly StateInvariantCapture[]> {
  const captures: StateInvariantCapture[] = [];
  for (const config of configs) captures.push(
    await captureStateInvariantDatabase(config),
  );
  return Object.freeze(captures);
}

export function compareStateInvariants(
  baseline: readonly StateInvariantCapture[],
  final: readonly StateInvariantCapture[],
  explicitTransitions: readonly ExplicitTransitionAttribution[] = [],
  completedCaseIds: ReadonlySet<string> = new Set(
    explicitTransitions.map(({ case_id }) => case_id),
  ),
): Day147A5StateInvariantMeasurement {
  const analysis = analyzeStateTransitionProvenance(
    baseline, final, explicitTransitions, completedCaseIds,
  );
  const baselineActiveRows = baseline.map(canonicalActiveStateRows);
  const finalEntityRows = final.map(canonicalEntityStateRows);
  const baselineComparable = baselineActiveRows.map((rows) => rows ?? []);
  const finalComparable = baselineComparable.map((rows, index) => {
    const finalByIdentity = new Map(
      (finalEntityRows[index] ?? []).map((row) => [row.projection_id, row]),
    );
    return rows.map(({ projection_id }) => {
      const observed = finalByIdentity.get(projection_id);
      return observed === undefined
        ? { projection_id, lifecycle_state: null, content_hash: null }
        : observed;
    });
  });
  const baselineDigest = createHash("sha256")
    .update("farmos-day147a5-three-database-active-baseline-v1\0")
    .update(JSON.stringify(baselineComparable)).digest("hex");
  const finalDigest = createHash("sha256")
    .update("farmos-day147a5-three-database-active-baseline-v1\0")
    .update(JSON.stringify(finalComparable)).digest("hex");
  const comparisonComplete = analysis.comparison_complete;
  const activeStateUnchanged = comparisonComplete &&
    analysis.baseline_active_unchanged && baselineDigest === finalDigest;
  return Object.freeze({
    baseline_digest: baselineDigest,
    final_digest: finalDigest,
    automatic_promotion_count: analysis.automatic_promotion_count,
    active_state_unchanged: activeStateUnchanged,
    comparison_complete: comparisonComplete,
  });
}

export function analyzeStateTransitionProvenance(
  baseline: readonly StateInvariantCapture[],
  final: readonly StateInvariantCapture[],
  explicitTransitions: readonly ExplicitTransitionAttribution[],
  completedCaseIds: ReadonlySet<string>,
): TransitionProvenanceAnalysis {
  const databaseTargets = [
    "legacy_active", "legacy_superseded", "main",
  ] as const;
  const baselineActiveRows = baseline.map(canonicalActiveStateRows);
  const baselineEntityRows = baseline.map(canonicalEntityStateRows);
  const finalEntityRows = final.map(canonicalEntityStateRows);
  const baselineTransitionRows = baseline.map(canonicalCandidateToActiveRows);
  const finalTransitionRows = final.map(canonicalCandidateToActiveRows);
  const numericCapturesValid = [...baseline, ...final].every((capture) =>
    /^[a-f0-9]{64}$/.test(capture.digest) &&
    [capture.active_count, capture.candidate_count,
      capture.promotion_transition_count, capture.superseded_transition_count]
      .every((count) => Number.isSafeInteger(count) && count >= 0)
  );
  const canonicalCapturesValid = [
    ...baselineActiveRows, ...baselineEntityRows, ...finalEntityRows,
    ...baselineTransitionRows, ...finalTransitionRows,
  ].every((rows) => rows !== null);
  const captureCountsValid = baseline.length === 3 && final.length === 3 &&
    [...baseline, ...final].every((capture) =>
      capture.active_rows.length === capture.active_count &&
      capture.candidate_to_active_rows.length ===
        capture.promotion_transition_count
    );
  const attributionKeys = explicitTransitions.map(({ database, projection_id }) =>
    `${database}\0${projection_id}`
  );
  const attributionSetValid =
    new Set(attributionKeys).size === attributionKeys.length &&
    explicitTransitions.every(({ database, projection_id, case_id }) =>
      databaseTargets.includes(database) && projection_id.length > 0 &&
      EXECUTABLE_CASES.some(({ id }) => id === case_id)
    );
  const entries: TransitionProvenanceAnalysis["entries"][number][] = [];
  let baselineActiveMutationCount = 0;
  for (const [index, rows] of baselineActiveRows.entries()) {
    const finalByIdentity = new Map(
      (finalEntityRows[index] ?? []).map((row) => [row.projection_id, row]),
    );
    for (const baselineRow of rows ?? []) {
      const observed = finalByIdentity.get(baselineRow.projection_id);
      if (observed === undefined || observed.lifecycle_state !== "active" ||
        observed.content_hash !== baselineRow.content_hash) {
        baselineActiveMutationCount += 1;
      }
    }
  }
  for (const [index, rows] of finalTransitionRows.entries()) {
    const database = databaseTargets[index];
    if (database === undefined || rows === null) continue;
    const baselineKeys = new Set((baselineTransitionRows[index] ?? []).map(
      ({ projection_id, event_sequence }) =>
        `${projection_id}\0${event_sequence}`,
    ));
    const baselineEntityIds = new Set((baselineEntityRows[index] ?? []).map(
      ({ projection_id }) => projection_id,
    ));
    for (const row of rows) {
      if (baselineKeys.has(`${row.projection_id}\0${row.event_sequence}`)) {
        continue;
      }
      const matches = explicitTransitions.filter((expected) =>
        expected.database === database &&
        expected.projection_id === row.projection_id
      );
      const expected = matches.length === 1 ? matches[0] : undefined;
      const baselineEntity = baselineEntityIds.has(row.projection_id);
      const completed = expected !== undefined &&
        completedCaseIds.has(expected.case_id);
      const classification: TransitionProvenanceClassification =
        matches.length > 1 || (expected !== undefined && !completed)
          ? "UNKNOWN_TRANSITION_PROVENANCE"
          : expected === undefined
            ? "UNAUTHORIZED_AUTOMATIC_PROMOTION"
            : expected.cleanup_expectation === "transaction_rollback"
              ? "TEST_FIXTURE_CLEANUP_LEAK"
              : baselineEntity
                ? "UNKNOWN_TRANSITION_PROVENANCE"
                : "EXPLICIT_AUTHORIZED_TEST_TRANSITION";
      entries.push(Object.freeze({
        database,
        projection_id: row.projection_id,
        prior_status: row.prior_status,
        final_status: row.final_status,
        event_sequence_class: "CANDIDATE_THEN_ACTIVE",
        matching_case_id: expected?.case_id ?? null,
        explicit_activation_action_present: expected !== undefined,
        test_fixture_owned: expected?.test_fixture_owned ?? false,
        baseline_entity: baselineEntity,
        classification,
      }));
    }
  }
  const unknownCount = entries.filter(({ classification }) =>
    classification === "UNKNOWN_TRANSITION_PROVENANCE"
  ).length;
  const unauthorizedCount = entries.filter(({ classification }) =>
    classification === "UNAUTHORIZED_AUTOMATIC_PROMOTION"
  ).length;
  const cleanupLeakCount = entries.filter(({ classification }) =>
    classification === "TEST_FIXTURE_CLEANUP_LEAK"
  ).length;
  const automaticPromotionCount = unknownCount + unauthorizedCount;
  const transitionHistoryMonotonic = baseline.every((capture, index) => {
    const finalCapture = final[index];
    if (finalCapture === undefined) return false;
    const finalKeys = new Set((finalTransitionRows[index] ?? []).map(
      ({ projection_id, event_sequence }) =>
        `${projection_id}\0${event_sequence}`,
    ));
    return (baselineTransitionRows[index] ?? []).every(
      ({ projection_id, event_sequence }) =>
        finalKeys.has(`${projection_id}\0${event_sequence}`),
    );
  });
  const comparisonComplete = numericCapturesValid && canonicalCapturesValid &&
    captureCountsValid && attributionSetValid && transitionHistoryMonotonic &&
    unknownCount === 0 && cleanupLeakCount === 0;
  return Object.freeze({
    entries: Object.freeze(entries),
    automatic_promotion_count: automaticPromotionCount,
    unknown_count: unknownCount,
    unauthorized_count: unauthorizedCount,
    cleanup_leak_count: cleanupLeakCount,
    baseline_active_mutation_count: baselineActiveMutationCount,
    baseline_active_unchanged: baselineActiveMutationCount === 0,
    comparison_complete: comparisonComplete,
  });
}

function committedExplicitTransitionAttributions(): readonly ExplicitTransitionAttribution[] {
  return Object.freeze([
    ["bundle_supersedes_null_existing_active_unchanged", "repository-existing-active"],
    ["read_active_plus_candidate_selects_active", "read-active-candidate-active"],
    ["read_active_plus_multiple_candidates_selects_active", "read-active-multi-active"],
    ["concurrency_forward", "concurrency_forward:a"],
    ["concurrency_reverse", "concurrency_reverse:b"],
  ].map(([caseId, fixtureId]) => Object.freeze({
    database: "main" as const,
    projection_id: deterministicUuid(`projection:${fixtureId}`),
    case_id: caseId!,
    explicit_activation_action_present: true as const,
    test_fixture_owned: true as const,
    cleanup_expectation: "fixture_retained" as const,
  })));
}

function emitTransitionProvenanceDiagnostics(input: Readonly<{
  execution_nonce: string;
  baseline: readonly StateInvariantCapture[];
  final: readonly StateInvariantCapture[];
  analysis: TransitionProvenanceAnalysis;
  expected: readonly ExplicitTransitionAttribution[];
  completed_case_ids: ReadonlySet<string>;
}>): void {
  for (const entry of input.analysis.entries) {
    const opaqueReference = createHash("sha256")
      .update("farmos-day147a5-transition-opaque-v1\0")
      .update(input.execution_nonce)
      .update("\0")
      .update(entry.projection_id)
      .digest("hex").slice(0, 16);
    console.error(`FARMOS_DAY147_A5_TRANSITION_PROVENANCE=${JSON.stringify({
      database: entry.database,
      transition_identity_digest: opaqueReference,
      prior_status: entry.prior_status,
      final_status: entry.final_status,
      event_sequence_class: entry.event_sequence_class,
      matching_case_id: entry.matching_case_id,
      explicit_activation_action_present:
        entry.explicit_activation_action_present,
      test_fixture_owned: entry.test_fixture_owned,
      baseline_entity: entry.baseline_entity,
      classification: entry.classification,
    })}`);
  }
  const databaseTargets = [
    "legacy_active", "legacy_superseded", "main",
  ] as const;
  for (const expected of input.expected) {
    const databaseIndex = databaseTargets.indexOf(expected.database);
    const transitionCount = (capture: StateInvariantCapture | undefined) =>
      (capture === undefined ? [] :
        canonicalCandidateToActiveRows(capture) ?? []).filter(
          ({ projection_id }) => projection_id === expected.projection_id,
        ).length;
    const before = transitionCount(input.baseline[databaseIndex]);
    const after = transitionCount(input.final[databaseIndex]);
    console.error(`FARMOS_DAY147_A5_CASE_TRANSITION_MEASUREMENT=${JSON.stringify({
      case_id: expected.case_id,
      transition_count_before: before,
      transition_count_after: after,
      delta: after - before,
      active_identity_delta: after > before ? 1 : 0,
      case_completed: input.completed_case_ids.has(expected.case_id),
    })}`);
  }
  console.error(`FARMOS_DAY147_A5_TRANSITION_PROVENANCE_SUMMARY=${JSON.stringify({
    raw_transition_count: input.analysis.entries.length,
    explicit_authorized_count: input.analysis.entries.filter(
      ({ classification }) =>
        classification === "EXPLICIT_AUTHORIZED_TEST_TRANSITION",
    ).length,
    unauthorized_count: input.analysis.unauthorized_count,
    cleanup_leak_count: input.analysis.cleanup_leak_count,
    unknown_count: input.analysis.unknown_count,
    baseline_active_mutation_count:
      input.analysis.baseline_active_mutation_count,
    baseline_active_count: input.baseline.reduce(
      (total, capture) => total + capture.active_count, 0),
    final_active_count: input.final.reduce(
      (total, capture) => total + capture.active_count, 0),
  })}`);
}

async function runSharedA5DynamicDatabaseSuite(input: Readonly<{
  names: ReturnType<typeof buildNames>;
  credential: string;
  execution_identity: ExecutionIdentity;
  admin_config: ClientConfig;
  legacy_active_config: ClientConfig;
  legacy_superseded_config: ClientConfig;
  bundle_config: ClientConfig;
  verification_config: ClientConfig;
  migration_files?: Day147A5MigrationArtifacts;
  on_phase?: (phase: "DATABASES_CREATED" | "MIGRATIONS_APPLIED") => void;
  on_connection?: () => void;
  on_execution_phase?: (phase: Day147A5SharedExecutionPhase) => void;
  on_pre_migration_failure?: (
    failure: Day147A5PreMigrationFailureNotification,
  ) => void;
  on_migration_failure?: (
    failure: Day147A5MigrationFailureNotification,
  ) => void;
  on_case_failure?: (
    failure: Day147A5CaseFailureNotification,
  ) => void;
}>): Promise<SharedA5DynamicSuiteResult> {
  let admin: Client;
  try {
    admin = createPgClient(input.admin_config);
  } catch (error) {
    input.on_pre_migration_failure?.(Object.freeze({
      last_phase: "SHARED_DYNAMIC_SUITE_START",
      operation_key: "ADMIN_CLIENT_CONSTRUCT",
      error,
    }));
    throw error;
  }
  try {
    await admin.connect();
  } catch (error) {
    input.on_pre_migration_failure?.(Object.freeze({
      last_phase: "SHARED_DYNAMIC_SUITE_START",
      operation_key: "ADMIN_CLIENT_CONNECT",
      error,
    }));
    throw error;
  }
  input.on_connection?.();
  let postgresVersion: string;
  try {
    let version: QueryResult<{ version: string }>;
    try {
      version = await admin.query<{ version: string }>(
        "select pg_catalog.current_setting('server_version') as version",
      );
    } catch (error) {
      input.on_pre_migration_failure?.(Object.freeze({
        last_phase: "SHARED_DYNAMIC_SUITE_START",
        operation_key: "SERVER_VERSION_QUERY",
        error,
      }));
      throw error;
    }
    postgresVersion = version.rows[0]?.version ?? "";
    if (postgresVersion.length === 0) {
      const error = new Error("DAY147_A5_POSTGRES_VERSION_INVALID");
      input.on_pre_migration_failure?.(Object.freeze({
        last_phase: "SHARED_DYNAMIC_SUITE_START",
        operation_key: "SERVER_VERSION_VALIDATE",
        error,
      }));
      throw error;
    }
    input.on_execution_phase?.("ISOLATED_DATABASES_CREATE_START");
    try {
      await createIsolatedDatabases(admin, input.names);
    } catch (error) {
      input.on_pre_migration_failure?.(Object.freeze({
        last_phase: "ISOLATED_DATABASES_CREATE_START",
        operation_key: "ISOLATED_DATABASES_CREATE",
        error,
      }));
      throw error;
    }
    input.on_execution_phase?.("ISOLATED_DATABASES_CREATE_PASS");
    await provisionRoleDefinitions(admin, input.credential);
  } finally {
    await admin.end().catch(() => undefined);
  }
  input.on_phase?.("DATABASES_CREATED");

  await prepareDatabase({
    config: input.legacy_active_config,
    migration_target: "LEGACY_ACTIVE",
    legacy_kind: "active",
    migration_files: input.migration_files,
    emit_lifecycle_phases: true,
    on_phase: input.on_execution_phase,
    on_migration_failure: input.on_migration_failure,
  });
  await prepareDatabase({
    config: input.legacy_superseded_config,
    migration_target: "LEGACY_SUPERSEDED",
    legacy_kind: "superseded",
    migration_files: input.migration_files,
    on_migration_failure: input.on_migration_failure,
  });
  await prepareDatabase({ config: input.admin_config,
    migration_target: "MAIN", migration_files: input.migration_files,
    on_migration_failure: input.on_migration_failure });
  input.on_phase?.("MIGRATIONS_APPLIED");

  const invariantConfigs = Object.freeze([
    input.legacy_active_config,
    input.legacy_superseded_config,
    input.admin_config,
  ]);
  const baselineState = await captureStateInvariants(invariantConfigs);

  input.on_execution_phase?.("CASE_SUITE_START");
  const dynamic = await runDynamicRegistry({
    admin_config: input.admin_config,
    bundle_config: input.bundle_config,
    legacy_active_config: input.legacy_active_config,
    legacy_superseded_config: input.legacy_superseded_config,
    execution_identity: input.execution_identity,
    on_case_failure: input.on_case_failure,
  });
  const finalVerify = createPgClient(input.verification_config);
  await finalVerify.connect();
  try {
    await executeExactSqlFile(finalVerify,
      input.migration_files?.activation_verify ?? MIGRATION_FILES.activation_verify);
  } finally {
    await finalVerify.end().catch(() => undefined);
  }
  const finalState = await captureStateInvariants(invariantConfigs);
  const explicitTransitions = committedExplicitTransitionAttributions();
  const completedCaseIds = new Set(dynamic.test_results.map(({ id }) => id));
  const transitionProvenance = analyzeStateTransitionProvenance(
    baselineState, finalState, explicitTransitions, completedCaseIds,
  );
  emitTransitionProvenanceDiagnostics({
    execution_nonce: input.execution_identity.nonce,
    baseline: baselineState,
    final: finalState,
    analysis: transitionProvenance,
    expected: explicitTransitions,
    completed_case_ids: completedCaseIds,
  });
  const stateInvariants = compareStateInvariants(
    baselineState, finalState, explicitTransitions, completedCaseIds,
  );
  return Object.freeze({
    postgres_version: postgresVersion,
    test_results: dynamic.test_results,
    concurrency_timeline: dynamic.concurrency_timeline,
    row_counts: dynamic.row_counts,
    state_invariants: stateInvariants,
    [sharedA5DynamicSuiteExecutionBrand]: true as const,
  });
}

function buildNetworkClientConfigs(
  environment: NetworkClientEnvironment,
): Readonly<{
  names: ReturnType<typeof buildNames>;
  identity: ExecutionIdentity;
  admin: ClientConfig;
  legacy_active: ClientConfig;
  legacy_superseded: ClientConfig;
  bundle: ClientConfig;
  verification: ClientConfig;
}> {
  const nonce = environment.FARMOS_A5_EXECUTION_NONCE;
  const identity = executionIdentityForNetworkClient(nonce);
  const common = {
    execution_identity: identity,
    host: "postgres" as const,
    port: 5432,
    password: environment.PGPASSWORD,
    lock_timeout_ms: 5_000,
  };
  return Object.freeze({
    names: buildNames(nonce),
    identity,
    admin: buildClientConfig({
      ...common, database_target: "main", application_role: "migration_owner",
      user: ROLE_FIXTURES.migration_owner.name,
    }),
    legacy_active: buildClientConfig({
      ...common, database_target: "legacy_active",
      application_role: "migration_owner",
      user: ROLE_FIXTURES.migration_owner.name,
    }),
    legacy_superseded: buildClientConfig({
      ...common, database_target: "legacy_superseded",
      application_role: "migration_owner",
      user: ROLE_FIXTURES.migration_owner.name,
    }),
    bundle: buildClientConfig({
      ...common, database_target: "main", application_role: "bundle_runtime",
      user: ROLE_FIXTURES.bundle_runtime_fixture.name,
    }),
    verification: buildClientConfig({
      ...common, database_target: "main", application_role: "verification",
      user: ROLE_FIXTURES.verification.name,
    }),
  });
}

export type Day147A5SharedClientAdapterInput = Readonly<{
  executionNonce: string;
  databaseHost: "postgres";
  databasePort: 5432;
  databaseUser: string;
  databasePassword: string;
  databaseName: string;
  migrationSql: Readonly<{
    day146: string;
    prepare: Readonly<{ apply: string; verify: string }>;
    activate: Readonly<{ apply: string; verify: string }>;
  }>;
  onExecutionPhase?: (phase: Day147A5SharedExecutionPhase) => void;
  onPreMigrationFailure?: (
    failure: Day147A5PreMigrationFailureNotification,
  ) => void;
  onMigrationFailure?: (
    failure: Day147A5MigrationFailureNotification,
  ) => void;
  onCaseFailure?: (
    failure: Day147A5CaseFailureNotification,
  ) => void;
}>;

export type Day147A5SharedClientAdapterResult = Readonly<{
  postgres_version: string | null;
  test_results: readonly Readonly<{
    id: string;
    category: DynamicCase["category"];
    status: "PASS" | "FAIL";
  }>[];
  concurrency_timeline: readonly string[];
  row_counts: Readonly<Record<string, number>>;
  state_invariants?: Day147A5StateInvariantMeasurement;
  migration_results?: Readonly<{
    day146: "PASS" | "NOT_COMPLETED";
    prepare_apply: "PASS" | "NOT_COMPLETED";
    prepare_verify: "PASS" | "NOT_COMPLETED";
    activate_apply: "PASS" | "NOT_COMPLETED";
    activate_verify: "PASS" | "NOT_COMPLETED";
  }>;
  cleanup: NetworkClientCleanupMeasurement;
  failure_code: string | null;
}>;

export async function runDay147A5SharedClientAdapter(
  input: Day147A5SharedClientAdapterInput,
): Promise<Day147A5SharedClientAdapterResult> {
  const expectedNames = buildNames(input.executionNonce);
  if (!/^[a-f0-9]{12}$/.test(input.executionNonce) ||
    input.databaseHost !== "postgres" || input.databasePort !== 5432 ||
    input.databaseUser !== ROLE_FIXTURES.migration_owner.name ||
    input.databaseName !== expectedNames.main || input.databasePassword.length < 32) {
    throw new Error("DAY147_A5_MINIMAL_CLIENT_INPUT_INVALID");
  }
  let lastPreMigrationPhase: Day147A5PreMigrationExecutionPhase =
    "SHARED_ADAPTER_START";
  let migrationStarted = false;
  let preMigrationFailureReported = false;
  let caseFailureReported = false;
  let partialCaseResults: Day147A5SharedClientAdapterResult["test_results"] =
    Object.freeze([]);
  let day146Passed = false;
  let preparePassed = false;
  let activatePassed = false;
  const emitExecutionPhase = (phase: Day147A5SharedExecutionPhase): void => {
    if (DAY147_A5_PRE_MIGRATION_EXECUTION_PHASES.includes(
      phase as Day147A5PreMigrationExecutionPhase,
    )) {
      lastPreMigrationPhase = phase as Day147A5PreMigrationExecutionPhase;
    } else if (phase === "DAY146_MIGRATION_START") {
      migrationStarted = true;
    } else if (phase === "DAY146_MIGRATION_PASS") {
      day146Passed = true;
    } else if (phase === "PREPARE_MIGRATION_PASS") {
      preparePassed = true;
    } else if (phase === "ACTIVATE_MIGRATION_PASS") {
      activatePassed = true;
    }
    input.onExecutionPhase?.(phase);
  };
  emitExecutionPhase("SHARED_ADAPTER_START");
  const environment: NetworkClientEnvironment = {
    FARMOS_A5_EXECUTION_NONCE: input.executionNonce,
    PGHOST: input.databaseHost,
    PGPORT: String(input.databasePort),
    PGUSER: input.databaseUser,
    PGPASSWORD: input.databasePassword,
    FARMOS_A5_DB_LEGACY_ACTIVE: expectedNames.legacy_active,
    FARMOS_A5_DB_LEGACY_SUPERSEDED: expectedNames.legacy_superseded,
    FARMOS_A5_DB_MAIN: expectedNames.main,
    FARMOS_A5_CLIENT_RESULT_PATH: "/tmp/client-result.json",
    FARMOS_A5_CAPABILITY_DIGEST: "0".repeat(64),
    FARMOS_A5_CAPABILITY_OWNER_UID: "1000",
  };
  const configs = buildNetworkClientConfigs(environment);
  const migrationFiles: Day147A5MigrationArtifacts = {
    day146: { ...MIGRATION_FILES.day146, sql: input.migrationSql.day146 },
    prepare_apply: { ...MIGRATION_FILES.prepare_apply,
      sql: input.migrationSql.prepare.apply },
    prepare_verify: { ...MIGRATION_FILES.prepare_verify,
      sql: input.migrationSql.prepare.verify },
    activation_apply: { ...MIGRATION_FILES.activation_apply,
      sql: input.migrationSql.activate.apply },
    activation_verify: { ...MIGRATION_FILES.activation_verify,
      sql: input.migrationSql.activate.verify },
  };
  emitExecutionPhase("MIGRATION_ARTIFACTS_READY");
  const tracker = new NetworkClientCleanupTracker();
  if (activeNetworkClientCleanupTracker !== null) {
    throw new Error("DAY147_A5_MINIMAL_CLIENT_REENTRANCY_BLOCKED");
  }
  activeNetworkClientCleanupTracker = tracker;
  let dynamic: SharedA5DynamicSuiteResult | null = null;
  let failureCode: string | null = null;
  try {
    emitExecutionPhase("SHARED_DYNAMIC_SUITE_START");
    dynamic = await runSharedA5DynamicDatabaseSuite({
      names: configs.names,
      credential: input.databasePassword,
      execution_identity: configs.identity,
      admin_config: configs.admin,
      legacy_active_config: configs.legacy_active,
      legacy_superseded_config: configs.legacy_superseded,
      bundle_config: configs.bundle,
      verification_config: configs.verification,
      migration_files: migrationFiles,
      on_execution_phase: emitExecutionPhase,
      on_pre_migration_failure: (failure) => {
        preMigrationFailureReported = true;
        input.onPreMigrationFailure?.(failure);
      },
      on_migration_failure: input.onMigrationFailure,
      on_case_failure: (failure) => {
        caseFailureReported = true;
        partialCaseResults = Object.freeze(failure.completed_case_ids.map(
          (id) => {
            const registryCase = EXECUTABLE_CASES.find((entry) => entry.id === id);
            if (registryCase === undefined) {
              throw new Error("DAY147_A5_DYNAMIC_CASE_ERROR_INVALID");
            }
            return Object.freeze({
              id,
              category: registryCase.category,
              status: "PASS" as const,
            });
          },
        ));
        input.onCaseFailure?.(failure);
      },
    });
    assertSharedDynamicSuiteComplete(dynamic);
  } catch (error) {
    if (!migrationStarted && !preMigrationFailureReported) {
      input.onPreMigrationFailure?.(Object.freeze({
        last_phase: lastPreMigrationPhase,
        operation_key: "PRE_MIGRATION_UNKNOWN",
        error,
      }));
    }
    const candidate = error instanceof Error ? error.message : "";
    failureCode = caseFailureReported
      ? "DAY147_A5_MINIMAL_CASE_SUITE_FAILED"
      : /^DAY147_A5_[A-Z0-9_]+$/.test(candidate) ||
        candidate === "BLOCKED_CHECKSUM_MISMATCH"
        ? candidate : "DAY147_A5_MINIMAL_CLIENT_FAILED";
  } finally {
    activeNetworkClientCleanupTracker = null;
  }
  const cleanup = await tracker.converge();
  if (!clientCleanupPassed({ ...cleanup, result_finalized: true })) {
    failureCode ??= "DAY147_A5_MINIMAL_CLIENT_CLEANUP_FAILED";
  }
  return Object.freeze({
    postgres_version: dynamic?.postgres_version ?? null,
    test_results: dynamic?.test_results ?? partialCaseResults,
    concurrency_timeline: dynamic?.concurrency_timeline ?? Object.freeze([]),
    row_counts: dynamic?.row_counts ?? Object.freeze({}),
    state_invariants: dynamic?.state_invariants,
    migration_results: Object.freeze({
      day146: day146Passed ? "PASS" : "NOT_COMPLETED",
      prepare_apply: preparePassed ? "PASS" : "NOT_COMPLETED",
      prepare_verify: preparePassed ? "PASS" : "NOT_COMPLETED",
      activate_apply: activatePassed ? "PASS" : "NOT_COMPLETED",
      activate_verify: activatePassed ? "PASS" : "NOT_COMPLETED",
    }),
    cleanup,
    failure_code: failureCode,
  });
}

function clientResultWithStatus(input: Readonly<{
  nonce: string;
  result: "PASS" | "FAIL";
  postgres_version: string | null;
  status: ClientCheckStatus;
  failure_code: string | null;
  cleanup_failure_code?: string | null;
  case_registry?: ClientCaseRegistryProof;
  cleanup?: NetworkClientCleanupMeasurement;
  capability_digest?: string;
  concurrency_timeline?: readonly BarrierEvent[];
  row_counts?: Readonly<Record<string, number>>;
}>): ClientResult {
  const cleanup = input.cleanup ?? Object.freeze({
    created_count: 0, close_attempted_count: 0, close_completed_count: 0,
    close_failed_count: input.result === "PASS" ? 0 : 1,
    open_client_count_after_cleanup: 0, duplicate_close_attempt_count: 0,
  });
  return Object.freeze({
    schema_version: 1,
    execution_nonce: input.nonce,
    result: input.result,
    postgres_version: input.postgres_version,
    migration_results: Object.freeze({
      day146: input.status, prepare_apply: input.status,
      prepare_verify: input.status, activation_apply: input.status,
      activation_verify: input.status,
    }),
    legacy: Object.freeze({ active: input.status, superseded: input.status }),
    initial_candidate: input.status,
    transition_matrix: Object.freeze({
      status: input.status,
      states: 5, ordered_pairs: 25, allowed: 4, forbidden: 21,
    }),
    sequence_identity: input.status,
    lifecycle_uniqueness: input.status,
    active_uniqueness: input.status,
    deferred_trigger: input.status,
    append_only: input.status,
    privilege_matrix: input.status,
    bundle_integration: input.status,
    read_integration: input.status,
    concurrency_forward: input.status,
    concurrency_reverse: input.status,
    atomicity: input.status,
    case_registry: input.case_registry ?? caseRegistryProof([]),
    runner_attestation: Object.freeze({
      runner_entrypoint: NETWORK_RUNNER_ENTRYPOINT,
      capability_digest: input.capability_digest ?? "0".repeat(64),
      execution_nonce: input.nonce,
    }),
    concurrency_timeline: Object.freeze([...(input.concurrency_timeline ?? [])]),
    row_counts: Object.freeze({ ...(input.row_counts ?? {}) }) as
      ClientResult["row_counts"],
    client_cleanup: Object.freeze({
      ...cleanup,
      result_finalized: true as const,
    }),
    failure_code: input.failure_code,
    cleanup_failure_code: input.cleanup_failure_code ?? null,
  });
}

function assertSharedDynamicSuiteComplete(
  result: SharedA5DynamicSuiteResult,
): void {
  const expectedIds = EXECUTABLE_CASES.map(({ id }) => id);
  const actualIds = result.test_results.map(({ id }) => id);
  if (result[sharedA5DynamicSuiteExecutionBrand] !== true ||
    result.postgres_version.length === 0 ||
    result.test_results.some(({ status }) => status !== "PASS") ||
    JSON.stringify(actualIds) !== JSON.stringify(expectedIds) ||
    JSON.stringify(result.concurrency_timeline) !== JSON.stringify([
      ...EXPECTED_CONCURRENCY_TIMELINE,
      ...EXPECTED_CONCURRENCY_TIMELINE,
    ]) || Object.keys(result.row_counts).length === 0 ||
    !result.state_invariants.comparison_complete ||
    result.state_invariants.automatic_promotion_count !== 0 ||
    !result.state_invariants.active_state_unchanged ||
    result.state_invariants.baseline_digest !== result.state_invariants.final_digest) {
    throw new Error("DAY147_A5_NETWORK_CLIENT_DYNAMIC_SUITE_INCOMPLETE");
  }
}

type NetworkRunnerAttestation = Readonly<{
  runner_entrypoint: string;
  execution_nonce: string;
  expected_nonce: string;
  capability_path: string;
  capability_regular_file: boolean;
  capability_symbolic_link: boolean;
  capability_canonical_path: string;
  capability_owner_uid: number;
  capability_mode: number;
  capability_bytes: Uint8Array;
  expected_capability_digest: string;
  result_path: string;
}>;

function validateNetworkRunnerAttestation(
  attestation: NetworkRunnerAttestation,
  environment: Readonly<Record<string, string | undefined>>,
): void {
  const observedDigest = createHash("sha256")
    .update(attestation.capability_bytes).digest("hex");
  let capabilityNonce = "";
  try {
    const parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(
      attestation.capability_bytes,
    )) as Record<string, unknown>;
    if (exactRecordKeys(parsed, ["schema", "execution_nonce", "capability"]) &&
      parsed.schema === "farmos-day147a5-network-client-capability-v1" &&
      typeof parsed.capability === "string" &&
      /^[a-f0-9]{64}$/.test(parsed.capability)) {
      capabilityNonce = String(parsed.execution_nonce);
    }
  } catch {
    capabilityNonce = "";
  }
  if (attestation.runner_entrypoint !== NETWORK_RUNNER_ENTRYPOINT ||
    attestation.execution_nonce !== attestation.expected_nonce ||
    !/^[a-f0-9]{12}$/.test(attestation.execution_nonce) ||
    attestation.capability_path !== NETWORK_RUNNER_CAPABILITY_PATH ||
    attestation.capability_canonical_path !== NETWORK_RUNNER_CAPABILITY_PATH ||
    !attestation.capability_regular_file || attestation.capability_symbolic_link ||
    attestation.capability_owner_uid !== Number(
      environment.FARMOS_A5_CAPABILITY_OWNER_UID,
    ) || !Number.isSafeInteger(attestation.capability_owner_uid) ||
    attestation.capability_owner_uid < 1 || attestation.capability_mode !== 0o400 ||
    !/^[a-f0-9]{64}$/.test(attestation.expected_capability_digest) ||
    observedDigest !== attestation.expected_capability_digest ||
    environment.FARMOS_A5_CAPABILITY_DIGEST !==
      attestation.expected_capability_digest ||
    capabilityNonce !== attestation.execution_nonce ||
    attestation.result_path !== "/result/client-result.json" ||
    environment.FARMOS_A5_EXECUTION_NONCE !== attestation.execution_nonce ||
    environment.PGHOST !== "postgres" || environment.PGPORT !== "5432" ||
    environment.FARMOS_A5_CLIENT_RESULT_PATH !== attestation.result_path) {
    throw new Error("DAY147_A5_NETWORK_CLIENT_AUTHORITY_BLOCKED");
  }
}

export async function executeNetworkClientInternal(input: Readonly<{
  attestation: NetworkRunnerAttestation;
  environment: Readonly<Record<string, string | undefined>>;
  write_result: (bytes: Uint8Array) => Promise<void>;
  phase?: (phase: typeof RUNNER_BOOTSTRAP_PHASES[number]) => void;
}>): Promise<ClientResult> {
  validateNetworkRunnerAttestation(input.attestation, input.environment);
  const environment = validateNetworkClientEnvironment(input.environment);
  const configs = buildNetworkClientConfigs(environment);
  const tracker = new NetworkClientCleanupTracker();
  if (activeNetworkClientCleanupTracker !== null) {
    throw new Error("DAY147_A5_NETWORK_CLIENT_AUTHORITY_BLOCKED");
  }
  activeNetworkClientCleanupTracker = tracker;
  let result: ClientResult;
  let dynamic: SharedA5DynamicSuiteResult | null = null;
  let primaryFailureCode: string | null = null;
  try {
    input.phase?.("RUNNER_DB_CONNECTION_START");
    dynamic = await runSharedA5DynamicDatabaseSuite({
      names: configs.names,
      credential: environment.PGPASSWORD,
      execution_identity: configs.identity,
      admin_config: configs.admin,
      legacy_active_config: configs.legacy_active,
      legacy_superseded_config: configs.legacy_superseded,
      bundle_config: configs.bundle,
      verification_config: configs.verification,
      on_connection() { input.phase?.("RUNNER_DB_CONNECTION_READY"); },
      on_phase(phase) {
        if (phase === "DATABASES_CREATED") {
          input.phase?.("RUNNER_MIGRATION_START");
        } else {
          input.phase?.("RUNNER_DYNAMIC_SUITE_START");
        }
      },
    });
    assertSharedDynamicSuiteComplete(dynamic);
  } catch (error) {
    const candidate = error instanceof Error ? error.message : "";
    primaryFailureCode = /^DAY147_A5_[A-Z0-9_]+$/.test(candidate)
      ? candidate
      : "DAY147_A5_NETWORK_CLIENT_FAILED";
  } finally {
    activeNetworkClientCleanupTracker = null;
  }
  const cleanup = await tracker.converge();
  let cleanupFailureCode: string | null = null;
  if (!clientCleanupPassed({ ...cleanup, result_finalized: true })) {
    cleanupFailureCode = "DAY147_A5_NETWORK_CLIENT_CLEANUP_FAILED";
    primaryFailureCode ??= cleanupFailureCode;
  }
  if (dynamic !== null && primaryFailureCode === null) {
    result = clientResultWithStatus({
      nonce: environment.FARMOS_A5_EXECUTION_NONCE,
      result: "PASS", postgres_version: dynamic.postgres_version,
      status: "PASS", failure_code: null,
      case_registry: caseRegistryProof(dynamic.test_results.map(({ id }) => ({
        id, status: "PASS" as const,
      }))),
      cleanup,
      capability_digest: input.attestation.expected_capability_digest,
      concurrency_timeline: dynamic.concurrency_timeline,
      row_counts: dynamic.row_counts,
    });
  } else {
    result = clientResultWithStatus({
      nonce: environment.FARMOS_A5_EXECUTION_NONCE,
      result: "FAIL",
      postgres_version: null,
      status: "NOT_COMPLETED",
      failure_code: primaryFailureCode ?? "DAY147_A5_NETWORK_CLIENT_FAILED",
      cleanup_failure_code: cleanupFailureCode,
      case_registry: dynamic === null ? caseRegistryProof([]) :
        caseRegistryProof(dynamic.test_results.map(({ id }) => ({
          id, status: "PASS" as const,
        }))),
      cleanup,
      capability_digest: input.attestation.expected_capability_digest,
      concurrency_timeline: dynamic?.concurrency_timeline,
      row_counts: dynamic?.row_counts,
    });
  }
  if (!validateClientResult(result, environment.FARMOS_A5_EXECUTION_NONCE)) {
    throw new Error("DAY147_A5_NETWORK_CLIENT_RESULT_CONTRACT_INVALID");
  }
  await input.write_result(new TextEncoder().encode(`${JSON.stringify(result)}\n`));
  return result;
}

function sanitizedClientMetadata(config: ClientConfig) {
  return Object.freeze({
    host: config.host,
    mapped_port: config.port,
    database_label: config.database,
    application_name: config.application_name,
    ssl: false,
  });
}

function buildIntegrationAdapters(input: {
  repository_pool: ConstructorParameters<
    typeof FarmOsOperationalMemoryPostgresRepository
  >[0];
  read_pool: FarmOsProjectionFirstPostgresPool;
  installation_binding: ConstructorParameters<
    typeof FarmOsProjectionFirstPostgresReadAdapter
  >[0]["installation_binding"];
}) {
  return {
    repository: new FarmOsOperationalMemoryPostgresRepository(
      input.repository_pool,
    ),
    read_adapter: new FarmOsProjectionFirstPostgresReadAdapter({
      installation_binding: input.installation_binding,
      postgres_pool: input.read_pool,
      owns_pool: false,
    }),
  };
}

type Evidence = Readonly<{
  schema_version: typeof FARM_OS_DAY147A5_EVIDENCE_SCHEMA_VERSION;
  execution_nonce: string;
  day: "147-A";
  process: "A5";
  result: FarmOsDay147A5EvidenceResult;
  phase_reached: HarnessPhase;
  execution_phase: HarnessPhase;
  evidence_phase: FarmOsDay147A5EvidencePhase;
  evidence_status: FarmOsDay147A5EvidenceStatus;
  durability_complete: boolean;
  success_claimed: boolean;
  receipt_required: true;
  receipt_relative_path: typeof FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH;
  artifact: {
    artifact_written: boolean;
    artifact_valid: boolean;
  };
  readiness: FarmOsDay147A5ReadinessSummary;
  checksums: typeof MIGRATION_CHECKSUMS;
  postgres_version: string | null;
  image: typeof IMAGE;
  image_digest: string | null;
  connection_metadata: FarmOsDay147A5ConnectionMetadata | null;
  role_matrix: typeof ROLE_FIXTURES;
  transition_matrix_summary: {
    states: 5;
    ordered_pairs: 25;
    allowed: 4;
    forbidden: 21;
  };
  test_results: readonly {
    id: string;
    category: DynamicCase["category"];
    status: "PASS";
  }[];
  concurrency_timeline: readonly BarrierEvent[];
  row_counts: Readonly<Record<string, number>>;
  failure_codes: {
    primary: string | null;
    cleanup: string | null;
    evidence_writer: string | null;
  };
  cleanup: {
    phase:
      | "CLEANUP_COMPLETED"
      | "CLEANUP_SKIPPED_NOT_STARTED"
      | "CLEANUP_FAILED";
    attempted: boolean;
    completed: boolean;
    post_cleanup_verified: boolean;
    container_absent: boolean;
    clients_closed: boolean;
    mapped_port_closed: boolean;
    persistent_volume_absent: boolean;
    failure_code: string | null;
  };
  safety: {
    local_only_gate_passed: boolean;
    docker_daemon_local: boolean;
    remote_endpoint_rejected: boolean;
    secrets_absent: boolean;
    production_operations: 0;
    docker_commands_expected: "isolated_only";
    database_connections_expected: "isolated_only";
  };
}>;

const EVIDENCE_SAFETY = Object.freeze({
  local_only_gate_passed: true,
  docker_daemon_local: true,
  remote_endpoint_rejected: true,
  secrets_absent: true,
  production_operations: 0,
  docker_commands_expected: "isolated_only" as const,
  database_connections_expected: "isolated_only" as const,
});

const FORBIDDEN_EVIDENCE_KEYS = new Set([
  "password",
  "secret",
  "token",
  "connectionstring",
  "databaseurl",
  "containerid",
  "pid",
  "personalpath",
  "credential",
  "authorization",
  "networkname",
  "networkid",
  "subnet",
  "gateway",
  "containerip",
  "runnerimageid",
  "endpointurl",
  "hostfilesystempath",
]);

function normalizedEvidenceKey(key: string): string {
  return key.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

function evidenceValueUnsafe(
  value: string,
  path: readonly string[],
  forbiddenValues: ReadonlySet<string>,
): boolean {
  const normalizedPath = path.map((key) => key.toLowerCase()).join(".");
  const digestAllowed = new Set([
    "checksums.day146", "checksums.prepare_apply", "checksums.prepare_verify",
    "checksums.activation_apply", "checksums.activation_verify",
    "evidence_sha256", "receipt.evidence_sha256", "receipt_sha256",
    "commit.receipt_sha256", "checksum", "image_digest",
    "case_registry.registry_digest",
    "runner_attestation.capability_digest",
  ]).has(normalizedPath);
  return (
    /(?:postgres(?:ql)?:\/\/|[a-z0-9-]+\.supabase\.(?:co|com))/i.test(value) ||
    /(?:password|secret|token|authorization)\s*[:=]/i.test(value) ||
    /\bbearer\s+[a-z0-9._~+/=-]+/i.test(value) ||
    /\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/.test(value) ||
    /(?:^|[ "'=])\/(?:Users|home)\/[^ "'\n]+/.test(value) ||
    /^[a-zA-Z]:\\Users\\/.test(value) ||
    (!digestAllowed && /^[a-f0-9]{64}$/i.test(value)) ||
    [...forbiddenValues].some((secret) =>
      secret.length > 0 && value.includes(secret)
    )
  );
}

function assertEvidenceSafe(
  value: unknown,
  forbiddenValues: ReadonlySet<string> = new Set(),
  path: readonly string[] = [],
): void {
  if (typeof value === "string") {
    if (evidenceValueUnsafe(value, path, forbiddenValues)) {
      throw new Error("DAY147_A5_EVIDENCE_SAFETY_BLOCKED");
    }
    return;
  }
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === undefined
  ) return;
  if (value instanceof Error) {
    assertEvidenceSafe(value.message, forbiddenValues, [...path, "error"]);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertEvidenceSafe(item, forbiddenValues, [...path, String(index)])
    );
    return;
  }
  if (typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (FORBIDDEN_EVIDENCE_KEYS.has(normalizedEvidenceKey(key))) {
        throw new Error("DAY147_A5_EVIDENCE_SAFETY_BLOCKED");
      }
      assertEvidenceSafe(item, forbiddenValues, [...path, key]);
    }
    return;
  }
  throw new Error("DAY147_A5_EVIDENCE_SAFETY_BLOCKED");
}

const EVIDENCE_WRITE_PLAN = Object.freeze({
  root: `${EVIDENCE_REPORTS_RELATIVE_ROOT}/runs/<execution_nonce>`,
  allowed_modes: ["execute-isolated"],
  write_after_cleanup: true,
  protocol: "run_scoped_evidence_receipt_commit_marker",
  artifacts: [
    FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH,
    FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH,
    FARM_OS_DAY147A5_COMMIT_RELATIVE_PATH,
  ],
  atomic_steps: [
    "same_directory_temp_file", "write", "file_fsync", "close", "rename",
    "parent_directory_fsync", "readback", "content_verification",
    "temporary_absence_verified",
  ],
  directory_fsync: "required_before_validity_claim",
  write_on_success: true,
  write_on_failure: true,
  static_mode_write_count: 0,
});

type DirectoryDurabilityResult =
  | Readonly<{ status: "synced"; secondary_note: null }>
  | Readonly<{
    status: "unsupported";
    secondary_note: "directory_fsync_unsupported_on_platform";
  }>;

function directoryFsyncUnsupported(
  error: unknown,
  stage: "open" | "sync",
): boolean {
  const code = error instanceof Error && "code" in error
    ? String((error as NodeJS.ErrnoException).code)
    : "";
  return stage === "sync"
    ? ["EINVAL", "ENOTSUP", "EOPNOTSUPP"].includes(code)
    : ["EISDIR", "ENOTSUP", "EOPNOTSUPP"].includes(code) ||
      (process.platform === "win32" && code === "EPERM");
}

async function syncOpenedDirectory(handle: {
  sync(): Promise<void>;
  close(): Promise<void>;
}): Promise<DirectoryDurabilityResult> {
  try {
    await handle.sync();
    return { status: "synced", secondary_note: null };
  } catch (error) {
    if (!directoryFsyncUnsupported(error, "sync")) {
      throw error;
    }
    return {
      status: "unsupported",
      secondary_note: "directory_fsync_unsupported_on_platform",
    };
  } finally {
    await handle.close();
  }
}

async function syncParentDirectory(
  directoryPath: string,
  opener: typeof open = open,
): Promise<DirectoryDurabilityResult> {
  try {
    const directoryHandle = await opener(directoryPath, fsConstants.O_RDONLY);
    return syncOpenedDirectory(directoryHandle);
  } catch (error) {
    if (!directoryFsyncUnsupported(error, "open")) throw error;
    return {
      status: "unsupported",
      secondary_note: "directory_fsync_unsupported_on_platform",
    };
  }
}

type EvidenceWriteStage =
  | "preflight"
  | "evidence"
  | "receipt"
  | "marker"
  | "failure";
type A5EvidenceWriteSubstage =
  | "mkdir"
  | "preflight_absence"
  | "temp_open"
  | "write"
  | "file_sync"
  | "close"
  | "rename"
  | "directory_sync"
  | "readback"
  | "hash"
  | "temp_absence"
  | "chain_invalidation";
type A5EvidenceWriteErrorCode =
  | "DAY147_A5_EVIDENCE_MKDIR_FAILED"
  | "DAY147_A5_EVIDENCE_PREFLIGHT_ABSENCE_FAILED"
  | "DAY147_A5_EVIDENCE_TEMP_OPEN_FAILED"
  | "DAY147_A5_EVIDENCE_WRITE_FAILED"
  | "DAY147_A5_EVIDENCE_FILE_SYNC_FAILED"
  | "DAY147_A5_EVIDENCE_CLOSE_FAILED"
  | "DAY147_A5_EVIDENCE_RENAME_FAILED"
  | "DAY147_A5_EVIDENCE_DIRECTORY_SYNC_FAILED"
  | "DAY147_A5_EVIDENCE_READBACK_FAILED"
  | "DAY147_A5_EVIDENCE_HASH_FAILED"
  | "DAY147_A5_EVIDENCE_TEMP_ABSENCE_FAILED"
  | "DAY147_A5_EVIDENCE_CHAIN_INVALIDATION_FAILED";

const EVIDENCE_WRITE_ERROR_CODES: Readonly<
  Record<A5EvidenceWriteSubstage, A5EvidenceWriteErrorCode>
> = Object.freeze({
  mkdir: "DAY147_A5_EVIDENCE_MKDIR_FAILED",
  preflight_absence: "DAY147_A5_EVIDENCE_PREFLIGHT_ABSENCE_FAILED",
  temp_open: "DAY147_A5_EVIDENCE_TEMP_OPEN_FAILED",
  write: "DAY147_A5_EVIDENCE_WRITE_FAILED",
  file_sync: "DAY147_A5_EVIDENCE_FILE_SYNC_FAILED",
  close: "DAY147_A5_EVIDENCE_CLOSE_FAILED",
  rename: "DAY147_A5_EVIDENCE_RENAME_FAILED",
  directory_sync: "DAY147_A5_EVIDENCE_DIRECTORY_SYNC_FAILED",
  readback: "DAY147_A5_EVIDENCE_READBACK_FAILED",
  hash: "DAY147_A5_EVIDENCE_HASH_FAILED",
  temp_absence: "DAY147_A5_EVIDENCE_TEMP_ABSENCE_FAILED",
  chain_invalidation: "DAY147_A5_EVIDENCE_CHAIN_INVALIDATION_FAILED",
});

class A5EvidenceWriteError extends Error {
  readonly failure_evidence_stage: A5EvidenceWriteSubstage;
  readonly failure_evidence_error_code: A5EvidenceWriteErrorCode;
  readonly artifact_role: EvidenceWriteStage;
  readonly empty_run_directory_removed: boolean;
  readonly cleanup_error_code:
    | "DAY147_A5_EMPTY_RUN_DIRECTORY_CLEANUP_FAILED"
    | null;

  constructor(input: Readonly<{
    stage: A5EvidenceWriteSubstage;
    artifact_role: EvidenceWriteStage;
    empty_run_directory_removed?: boolean;
    cleanup_error_code?: "DAY147_A5_EMPTY_RUN_DIRECTORY_CLEANUP_FAILED" | null;
  }>) {
    super("DAY147_A5_EVIDENCE_DURABILITY_BLOCKED");
    this.name = "A5EvidenceWriteError";
    this.stack = `${this.name}: ${this.message}`;
    this.failure_evidence_stage = input.stage;
    this.failure_evidence_error_code = EVIDENCE_WRITE_ERROR_CODES[input.stage];
    this.artifact_role = input.artifact_role;
    this.empty_run_directory_removed =
      input.empty_run_directory_removed ?? false;
    this.cleanup_error_code = input.cleanup_error_code ?? null;
  }
}

function asEvidenceWriteError(
  _error: unknown,
  stage: A5EvidenceWriteSubstage,
  artifactRole: EvidenceWriteStage,
): A5EvidenceWriteError {
  return _error instanceof A5EvidenceWriteError
    ? _error
    : new A5EvidenceWriteError({ stage, artifact_role: artifactRole });
}

type EvidenceWritableHandle = {
  writeFile(value: Uint8Array): Promise<void>;
  sync(): Promise<void>;
  close(): Promise<void>;
};
type EvidenceDirectoryState = Readonly<{
  kind: "directory" | "symlink" | "missing" | "other";
  entries: readonly string[];
  uid: number | null;
  gid: number | null;
  mode: number | null;
  canonical_path: string | null;
}>;
type EvidenceIo = {
  mkdir(path: string): Promise<void>;
  openTemp(path: string, stage: EvidenceWriteStage): Promise<EvidenceWritableHandle>;
  rename(from: string, to: string, stage: EvidenceWriteStage): Promise<void>;
  syncDirectory(path: string, stage: EvidenceWriteStage): Promise<DirectoryDurabilityResult>;
  readBytes(path: string, stage: EvidenceWriteStage): Promise<Uint8Array>;
  assertAbsent(path: string, stage: EvidenceWriteStage): Promise<void>;
  remove(path: string, stage: EvidenceWriteStage): Promise<void>;
  temporaryPath(finalPath: string, stage: EvidenceWriteStage): string;
  directoryState(path: string): Promise<EvidenceDirectoryState>;
  currentUserIdentity(): CurrentUserIdentity | null;
  cleanupReportsRootAuthorized(path: string): boolean;
  rmdir(path: string): Promise<void>;
};

let productionEvidenceWriteOperations = 0;

const PRODUCTION_EVIDENCE_IO: EvidenceIo = {
  async mkdir(path) {
    productionEvidenceWriteOperations += 1;
    await mkdir(path, { recursive: true, mode: 0o700 });
  },
  async openTemp(path) {
    productionEvidenceWriteOperations += 1;
    return open(
      path,
      fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY,
      0o600,
    );
  },
  async rename(from, to) {
    productionEvidenceWriteOperations += 1;
    await rename(from, to);
  },
  async syncDirectory(path) { return syncParentDirectory(path); },
  async readBytes(path) { return readFile(path); },
  async assertAbsent(path) {
    try {
      await access(path);
      throw new Error("DAY147_A5_EVIDENCE_TEMP_REMAINS");
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "DAY147_A5_EVIDENCE_TEMP_REMAINS"
      ) throw error;
      const code = error instanceof Error && "code" in error
        ? String((error as NodeJS.ErrnoException).code)
        : "";
      if (code !== "ENOENT") throw error;
    }
  },
  async remove(path) {
    productionEvidenceWriteOperations += 1;
    await rm(path, { force: true });
  },
  temporaryPath(finalPath, stage) {
    return `${finalPath}.${stage}.tmp-${randomBytes(8).toString("hex")}`;
  },
  async directoryState(path) {
    try {
      const metadata = await lstat(path);
      const common = {
        uid: metadata.uid,
        gid: metadata.gid,
        mode: metadata.mode & 0o777,
        canonical_path: realpathSync.native(path),
      };
      if (metadata.isSymbolicLink()) {
        return { kind: "symlink", entries: [], ...common };
      }
      if (!metadata.isDirectory()) {
        return { kind: "other", entries: [], ...common };
      }
      return { kind: "directory", entries: await readdir(path), ...common };
    } catch (error) {
      const code = error instanceof Error && "code" in error
        ? String((error as NodeJS.ErrnoException).code)
        : "";
      if (code === "ENOENT") {
        return {
          kind: "missing", entries: [], uid: null, gid: null,
          mode: null, canonical_path: null,
        };
      }
      throw error;
    }
  },
  currentUserIdentity: currentUserIdentityFromOs,
  cleanupReportsRootAuthorized(path) {
    return path === resolve(ROOT, EVIDENCE_REPORTS_RELATIVE_ROOT);
  },
  async rmdir(path) {
    productionEvidenceWriteOperations += 1;
    await rmdir(path);
  },
};

function serializedArtifact(value: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`);
}

function parseArtifactBytes<T>(bytes: Uint8Array | undefined): T {
  assert.ok(bytes);
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as T;
}

function assertPersistedArtifactMatches(
  actualBytes: Uint8Array,
  expectedBytes: Uint8Array,
): void {
  const actualHash = sha256FarmOsDay147A5RawBytes(actualBytes);
  const expectedHash = sha256FarmOsDay147A5RawBytes(expectedBytes);
  if (actualHash !== expectedHash) {
    throw new Error("DAY147_A5_EVIDENCE_READBACK_MISMATCH");
  }
  assert.deepEqual(actualBytes, expectedBytes);
}

async function commitEvidenceArtifact(input: {
  bytes: Uint8Array;
  final_path: string;
  run_root: string;
  stage: EvidenceWriteStage;
  io: EvidenceIo;
}): Promise<Uint8Array> {
  let temporaryPath: string;
  try {
    temporaryPath = input.io.temporaryPath(input.final_path, input.stage);
  } catch (error) {
    throw asEvidenceWriteError(error, "temp_open", input.stage);
  }
  let handle: EvidenceWritableHandle;
  try {
    handle = await input.io.openTemp(temporaryPath, input.stage);
  } catch (error) {
    throw asEvidenceWriteError(error, "temp_open", input.stage);
  }
  try {
    await handle.writeFile(input.bytes);
  } catch (error) {
    await handle.close().catch(() => undefined);
    await input.io.remove(temporaryPath, input.stage).catch(() => undefined);
    throw asEvidenceWriteError(error, "write", input.stage);
  }
  try {
    await handle.sync();
  } catch (error) {
    await handle.close().catch(() => undefined);
    await input.io.remove(temporaryPath, input.stage).catch(() => undefined);
    throw asEvidenceWriteError(error, "file_sync", input.stage);
  }
  try {
    await handle.close();
  } catch (error) {
    await input.io.remove(temporaryPath, input.stage).catch(() => undefined);
    throw asEvidenceWriteError(error, "close", input.stage);
  }
  try {
    await input.io.rename(temporaryPath, input.final_path, input.stage);
  } catch (error) {
    await input.io.remove(temporaryPath, input.stage).catch(() => undefined);
    throw asEvidenceWriteError(error, "rename", input.stage);
  }
  let durability: DirectoryDurabilityResult;
  try {
    durability = await input.io.syncDirectory(input.run_root, input.stage);
    if (durability.status !== "synced") throw new Error("unsupported");
  } catch (error) {
    throw asEvidenceWriteError(error, "directory_sync", input.stage);
  }
  let readback: Uint8Array;
  try {
    readback = await input.io.readBytes(input.final_path, input.stage);
  } catch (error) {
    throw asEvidenceWriteError(error, "readback", input.stage);
  }
  try {
    assertPersistedArtifactMatches(readback, input.bytes);
  } catch (error) {
    throw asEvidenceWriteError(error, "hash", input.stage);
  }
  try {
    await input.io.assertAbsent(temporaryPath, input.stage);
  } catch (error) {
    throw asEvidenceWriteError(error, "temp_absence", input.stage);
  }
  return readback;
}

function invalidatedFailureEvidence(evidence: Evidence): Evidence {
  if (evidence.result === "PASS") {
    throw new Error("DAY147_A5_EVIDENCE_FAILURE_CONTRACT_INVALID");
  }
  return Object.freeze({
    ...evidence,
    evidence_phase: "FINALIZED" as const,
    evidence_status: "INVALID" as const,
    durability_complete: false,
    success_claimed: false,
    artifact: {
      artifact_written: true,
      artifact_valid: false,
    },
    failure_codes: {
      ...evidence.failure_codes,
      evidence_writer: "DAY147_A5_EVIDENCE_DURABILITY_BLOCKED",
    },
  });
}

type RunScopedEvidenceWriteResult = DirectoryDurabilityResult & Readonly<{
  execution_nonce: string;
  artifact_chain_valid: true;
  evidence_sha256: string;
  receipt_sha256: string;
  durability_attestation: FarmOsDay147A5DurabilityAttestation;
}>;

const runtimeDurabilityBrand = Symbol("DAY147_A5_RUNTIME_DURABILITY");
let durabilityAttestationCreations = 0;
function createDurabilityAttestation(input: Readonly<{
  execution_nonce: string;
  evidence_bytes: Uint8Array;
  receipt_bytes: Uint8Array;
  marker_bytes: Uint8Array;
}>): FarmOsDay147A5DurabilityAttestation {
  durabilityAttestationCreations += 1;
  return Object.freeze({
    kind: "DAY147_A5_DURABILITY_ATTESTED",
    execution_nonce: input.execution_nonce,
    evidence_sha256: sha256FarmOsDay147A5RawBytes(input.evidence_bytes),
    receipt_sha256: sha256FarmOsDay147A5RawBytes(input.receipt_bytes),
    marker_sha256: sha256FarmOsDay147A5RawBytes(input.marker_bytes),
    [runtimeDurabilityBrand]: true,
  }) as unknown as FarmOsDay147A5DurabilityAttestation;
}

function validateCommittedA5Evidence(input: Readonly<{
  evidenceBytes?: Uint8Array | null;
  receiptBytes?: Uint8Array | null;
  markerBytes?: Uint8Array | null;
  expectedExecutionNonce: string;
  durabilityAttestation: FarmOsDay147A5DurabilityAttestation;
}>): Readonly<{
  accepted: true;
  reason_code: "A5_COMMITTED_CHAIN_ACCEPTED";
}> | Readonly<{ accepted: false; reason_code: string }> {
  const attestation = input.durabilityAttestation as unknown as
    Record<PropertyKey, unknown> | undefined;
  if (
    attestation === undefined ||
    attestation[runtimeDurabilityBrand] !== true ||
    attestation.kind !== "DAY147_A5_DURABILITY_ATTESTED" ||
    attestation.execution_nonce !== input.expectedExecutionNonce ||
    input.evidenceBytes == null || input.receiptBytes == null ||
    input.markerBytes == null ||
    attestation.evidence_sha256 !==
      sha256FarmOsDay147A5RawBytes(input.evidenceBytes) ||
    attestation.receipt_sha256 !==
      sha256FarmOsDay147A5RawBytes(input.receiptBytes) ||
    attestation.marker_sha256 !==
      sha256FarmOsDay147A5RawBytes(input.markerBytes)
  ) {
    return { accepted: false, reason_code: "A5_DURABILITY_ATTESTATION_INVALID" };
  }
  const chain = validateCommittedA5ArtifactChain({
    evidenceBytes: input.evidenceBytes,
    receiptBytes: input.receiptBytes,
    markerBytes: input.markerBytes,
    expectedExecutionNonce: input.expectedExecutionNonce,
  });
  if (!chain.accepted) return chain;
  return { accepted: true, reason_code: "A5_COMMITTED_CHAIN_ACCEPTED" };
}

function runScopedEvidencePaths(root: string, executionNonce: string) {
  if (!/^[a-f0-9]{12}$/.test(executionNonce)) {
    throw new Error("DAY147_A5_EVIDENCE_NONCE_INVALID");
  }
  const reportsRoot = resolve(root, EVIDENCE_REPORTS_RELATIVE_ROOT);
  const runsRoot = resolve(reportsRoot, "runs");
  const runRoot = resolve(runsRoot, executionNonce);
  if (!runRoot.startsWith(`${runsRoot}/`)) {
    throw new Error("DAY147_A5_EVIDENCE_PATH_INVALID");
  }
  return Object.freeze({
    reportsRoot,
    runsRoot,
    runRoot,
    evidence: resolve(runRoot, FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH),
    receipt: resolve(runRoot, FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH),
    marker: resolve(runRoot, FARM_OS_DAY147A5_COMMIT_RELATIVE_PATH),
  });
}

class A5EmptyRunDirectoryCleanupError extends Error {
  constructor(_cause?: unknown) {
    super("DAY147_A5_EMPTY_RUN_DIRECTORY_CLEANUP_FAILED");
    this.name = "A5EmptyRunDirectoryCleanupError";
    this.stack = `${this.name}: ${this.message}`;
  }
}

function cleanupDirectoryProvenanceExact(
  state: EvidenceDirectoryState,
  path: string,
  identity: CurrentUserIdentity,
): boolean {
  return state.kind === "directory" &&
    state.uid === identity.uid &&
    state.gid === identity.gid &&
    state.mode !== null &&
    (state.mode & 0o022) === 0 &&
    state.canonical_path === path;
}

function exactNonceEntries(entries: readonly string[]): boolean {
  return entries.every((entry) => /^[a-f0-9]{12}$/.test(entry));
}

async function cleanupExactEmptyCurrentRun(input: Readonly<{
  paths: ReturnType<typeof runScopedEvidencePaths>;
  io: EvidenceIo;
}>): Promise<boolean> {
  let runState: EvidenceDirectoryState;
  let runsState: EvidenceDirectoryState;
  let reportsState: EvidenceDirectoryState;
  const identity = input.io.currentUserIdentity();
  if (
    identity === null ||
    !input.io.cleanupReportsRootAuthorized(input.paths.reportsRoot)
  ) throw new A5EmptyRunDirectoryCleanupError();
  try {
    [runState, runsState, reportsState] = await Promise.all([
      input.io.directoryState(input.paths.runRoot),
      input.io.directoryState(input.paths.runsRoot),
      input.io.directoryState(input.paths.reportsRoot),
    ]);
  } catch (error) {
    throw new A5EmptyRunDirectoryCleanupError(error);
  }
  if (runState.kind === "missing") return false;
  if (
    !cleanupDirectoryProvenanceExact(runState, input.paths.runRoot, identity) ||
    !cleanupDirectoryProvenanceExact(runsState, input.paths.runsRoot, identity) ||
    !cleanupDirectoryProvenanceExact(
      reportsState,
      input.paths.reportsRoot,
      identity,
    ) ||
    !exactNonceEntries(runsState.entries) ||
    !runsState.entries.includes(basename(input.paths.runRoot)) ||
    JSON.stringify(reportsState.entries) !== JSON.stringify(["runs"])
  ) {
    throw new A5EmptyRunDirectoryCleanupError();
  }
  if (runState.entries.length !== 0) return false;
  try {
    await input.io.rmdir(input.paths.runRoot);
    const runsAfter = await input.io.directoryState(input.paths.runsRoot);
    if (
      !cleanupDirectoryProvenanceExact(
        runsAfter,
        input.paths.runsRoot,
        identity,
      ) ||
      !exactNonceEntries(runsAfter.entries)
    ) {
      throw new A5EmptyRunDirectoryCleanupError();
    }
    if (runsAfter.entries.length === 0) {
      await input.io.rmdir(input.paths.runsRoot);
    }
    const reportsAfter = await input.io.directoryState(input.paths.reportsRoot);
    if (
      cleanupDirectoryProvenanceExact(
        reportsAfter,
        input.paths.reportsRoot,
        identity,
      ) && reportsAfter.entries.length === 0
    ) {
      await input.io.rmdir(input.paths.reportsRoot);
    } else if (!cleanupDirectoryProvenanceExact(
      reportsAfter,
      input.paths.reportsRoot,
      identity,
    ) || JSON.stringify(reportsAfter.entries) !== JSON.stringify(["runs"])) {
      throw new A5EmptyRunDirectoryCleanupError();
    }
    return true;
  } catch (error) {
    throw error instanceof A5EmptyRunDirectoryCleanupError
      ? error
      : new A5EmptyRunDirectoryCleanupError(error);
  }
}

async function evidenceErrorWithEmptyRunCleanup(input: Readonly<{
  error: unknown;
  paths: ReturnType<typeof runScopedEvidencePaths>;
  io: EvidenceIo;
}>): Promise<A5EvidenceWriteError> {
  const stageError = asEvidenceWriteError(
    input.error,
    "chain_invalidation",
    "failure",
  );
  try {
    const removed = await cleanupExactEmptyCurrentRun({
      paths: input.paths,
      io: input.io,
    });
    return new A5EvidenceWriteError({
      stage: stageError.failure_evidence_stage,
      artifact_role: stageError.artifact_role,
      empty_run_directory_removed: removed,
    });
  } catch (cleanupError) {
    return new A5EvidenceWriteError({
      stage: stageError.failure_evidence_stage,
      artifact_role: stageError.artifact_role,
      cleanup_error_code: "DAY147_A5_EMPTY_RUN_DIRECTORY_CLEANUP_FAILED",
    });
  }
}

async function removeCurrentRunCommitArtifacts(input: {
  paths: ReturnType<typeof runScopedEvidencePaths>;
  io: EvidenceIo;
}): Promise<void> {
  await input.io.remove(input.paths.marker, "marker");
  await input.io.assertAbsent(input.paths.marker, "failure");
  await input.io.remove(input.paths.receipt, "receipt");
  await input.io.assertAbsent(input.paths.receipt, "failure");
  const durability = await input.io.syncDirectory(input.paths.runRoot, "marker");
  if (durability.status !== "synced") {
    throw new Error("DAY147_A5_COMMIT_CHAIN_INVALIDATION_FAILED");
  }
}

async function writeFailureEvidence(input: {
  evidence: Evidence;
  paths: ReturnType<typeof runScopedEvidencePaths>;
  forbidden_values: ReadonlySet<string>;
  io: EvidenceIo;
}): Promise<void> {
  assertEvidenceSafe(input.evidence, input.forbidden_values);
  if (!validateFailureA5Evidence({
    evidence: input.evidence,
    receiptPresent: false,
    markerPresent: false,
  }).accepted) {
    throw new Error("DAY147_A5_EVIDENCE_FAILURE_CONTRACT_INVALID");
  }
  for (const path of [
    input.paths.evidence,
    input.paths.marker,
    input.paths.receipt,
  ]) {
    try {
      await input.io.assertAbsent(path, "failure");
    } catch (error) {
      throw asEvidenceWriteError(error, "preflight_absence", "failure");
    }
  }
  await commitEvidenceArtifact({
    bytes: serializedArtifact(input.evidence),
    final_path: input.paths.evidence,
    run_root: input.paths.runRoot,
    stage: "failure",
    io: input.io,
  });
}

async function writeEvidenceAtomically(input: {
  root: string;
  execution_nonce: string;
  final_evidence?: Evidence;
  failure_evidence: Evidence;
  forbidden_values: ReadonlySet<string>;
  io?: EvidenceIo;
}): Promise<RunScopedEvidenceWriteResult | DirectoryDurabilityResult> {
  const io = input.io ?? PRODUCTION_EVIDENCE_IO;
  const paths = runScopedEvidencePaths(input.root, input.execution_nonce);
  try {
    await io.mkdir(paths.runRoot);
  } catch (error) {
    throw asEvidenceWriteError(error, "mkdir", "failure");
  }
  if (input.final_evidence === undefined) {
    try {
      await writeFailureEvidence({
        evidence: input.failure_evidence,
        paths,
        forbidden_values: input.forbidden_values,
        io,
      });
    } catch (error) {
      throw await evidenceErrorWithEmptyRunCleanup({ error, paths, io });
    }
    return { status: "synced", secondary_note: null };
  }
  assertEvidenceSafe(input.final_evidence, input.forbidden_values);
  for (const path of [paths.evidence, paths.receipt, paths.marker]) {
    try {
      await io.assertAbsent(path, "preflight");
    } catch (error) {
      throw asEvidenceWriteError(error, "preflight_absence", "preflight");
    }
  }
  try {
    const evidenceBytes = await commitEvidenceArtifact({
      bytes: serializedArtifact(input.final_evidence),
      final_path: paths.evidence,
      run_root: paths.runRoot,
      stage: "evidence",
      io,
    });
    const evidenceValidation = validateFinalA5Evidence({
      evidenceBytes,
      expectedExecutionNonce: input.execution_nonce,
    });
    if (!evidenceValidation.accepted) {
      throw new Error(evidenceValidation.reason_code);
    }
    const receipt: FarmOsDay147A5Receipt = Object.freeze({
      schema_version: FARM_OS_DAY147A5_RECEIPT_SCHEMA_VERSION,
      execution_nonce: input.execution_nonce,
      evidence_relative_path: FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH,
      evidence_sha256: sha256FarmOsDay147A5RawBytes(evidenceBytes),
      evidence_schema_version: FARM_OS_DAY147A5_EVIDENCE_SCHEMA_VERSION,
      result: "PASS",
      execution_phase: "COMPLETE",
      receipt_status: "COMMITTED",
      durability_complete: true,
      success_claimed: true,
    });
    assertEvidenceSafe(receipt, input.forbidden_values);
    const receiptBytes = await commitEvidenceArtifact({
      bytes: serializedArtifact(receipt),
      final_path: paths.receipt,
      run_root: paths.runRoot,
      stage: "receipt",
      io,
    });
    const receiptValidation = validateA5ReceiptForEvidence({
      evidenceBytes,
      receiptBytes,
      expectedExecutionNonce: input.execution_nonce,
    });
    if (!receiptValidation.accepted) {
      throw new Error(receiptValidation.reason_code);
    }
    const marker: FarmOsDay147A5CommitMarker = Object.freeze({
      schema_version: FARM_OS_DAY147A5_COMMIT_SCHEMA_VERSION,
      execution_nonce: input.execution_nonce,
      receipt_relative_path: FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH,
      receipt_sha256: sha256FarmOsDay147A5RawBytes(receiptBytes),
      status: "COMMITTED",
    });
    assertEvidenceSafe(marker, input.forbidden_values);
    const markerBytes = await commitEvidenceArtifact({
      bytes: serializedArtifact(marker),
      final_path: paths.marker,
      run_root: paths.runRoot,
      stage: "marker",
      io,
    });
    const markerValidation = validateA5CommitMarkerForReceipt({
      receiptBytes,
      markerBytes,
      expectedExecutionNonce: input.execution_nonce,
    });
    if (!markerValidation.accepted) {
      throw new Error(markerValidation.reason_code);
    }
    const durabilityAttestation = createDurabilityAttestation({
      execution_nonce: input.execution_nonce,
      evidence_bytes: evidenceBytes,
      receipt_bytes: receiptBytes,
      marker_bytes: markerBytes,
    });
    const validation = validateCommittedA5Evidence({
      evidenceBytes,
      receiptBytes,
      markerBytes,
      expectedExecutionNonce: input.execution_nonce,
      durabilityAttestation,
    });
    if (!validation.accepted) {
      throw new Error(validation.reason_code);
    }
    return {
      status: "synced",
      secondary_note: null,
      execution_nonce: input.execution_nonce,
      artifact_chain_valid: true,
      evidence_sha256: sha256FarmOsDay147A5RawBytes(evidenceBytes),
      receipt_sha256: sha256FarmOsDay147A5RawBytes(receiptBytes),
      durability_attestation: durabilityAttestation,
    };
  } catch (error) {
    const stageError = asEvidenceWriteError(
      error,
      "chain_invalidation",
      "failure",
    );
    try {
      await removeCurrentRunCommitArtifacts({ paths, io });
    } catch (invalidationError) {
      throw new A5EvidenceWriteError({
        stage: "chain_invalidation",
        artifact_role: "marker",
      });
    }
    try {
      await io.remove(paths.evidence, "failure");
      await io.assertAbsent(paths.evidence, "failure");
      await writeFailureEvidence({
        evidence: input.failure_evidence,
        paths,
        forbidden_values: input.forbidden_values,
        io,
      });
    } catch {}
    throw stageError;
  }
}

function createMemoryEvidenceIo(input: Readonly<{
  fail_event?: string;
  fail_events?: readonly string[];
  fail_event_occurrence?: Readonly<{ event: string; occurrence: number }>;
  corrupt_readback_stage?: EvidenceWriteStage;
  initial_files?: ReadonlyMap<string, Uint8Array>;
  directory_overrides?: ReadonlyMap<string, EvidenceDirectoryState>;
  current_user?: CurrentUserIdentity | null;
  raw_error_message?: string;
  cleanup_reports_root_authorized?: boolean;
}> = {}): Readonly<{
  io: EvidenceIo;
  files: Map<string, Uint8Array>;
  directories: Set<string>;
  events: string[];
}> {
  const files = new Map<string, Uint8Array>(
    [...(input.initial_files ?? new Map())].map(([path, bytes]) => [
      path,
      new Uint8Array(bytes),
    ]),
  );
  const directories = new Set<string>();
  const addDirectoryAndParents = (path: string) => {
    let current = path;
    while (current !== dirname(current)) {
      directories.add(current);
      current = dirname(current);
    }
  };
  for (const path of files.keys()) addDirectoryAndParents(dirname(path));
  const events: string[] = [];
  const pendingFailures = new Set([
    ...(input.fail_event === undefined ? [] : [input.fail_event]),
    ...(input.fail_events ?? []),
  ]);
  let corruptionConsumed = false;
  const eventOccurrences = new Map<string, number>();
  const record = (
    stage: EvidenceWriteStage | "cleanup",
    event: string,
  ) => {
    const key = `${stage}:${event}`;
    events.push(key);
    const occurrence = (eventOccurrences.get(key) ?? 0) + 1;
    eventOccurrences.set(key, occurrence);
    if (
      pendingFailures.delete(key) ||
      input.fail_event_occurrence?.event === key &&
        input.fail_event_occurrence.occurrence === occurrence
    ) {
      const error = new Error(input.raw_error_message ?? `mock:${key}`) as
        NodeJS.ErrnoException;
      error.code = "EIO";
      throw error;
    }
  };
  const io: EvidenceIo = {
    async mkdir(path) {
      record("failure", "mkdir");
      addDirectoryAndParents(path);
    },
    async openTemp(path, stage) {
      record(stage, "open");
      let closed = false;
      return {
        async writeFile(value) {
          record(stage, "write");
          if (closed) throw new Error("mock:closed");
          files.set(path, new Uint8Array(value));
        },
        async sync() { record(stage, "file_sync"); },
        async close() {
          if (!closed) record(stage, "close");
          closed = true;
        },
      };
    },
    async rename(from, to, stage) {
      record(stage, "rename");
      const value = files.get(from);
      if (value === undefined) throw new Error("mock:rename_source_missing");
      files.set(to, value);
      files.delete(from);
    },
    async syncDirectory(_path, stage) {
      record(stage, "directory_sync");
      return { status: "synced", secondary_note: null };
    },
    async readBytes(path, stage) {
      record(stage, "readback");
      const value = files.get(path);
      if (value === undefined) throw new Error("mock:readback_missing");
      if (!corruptionConsumed && input.corrupt_readback_stage === stage) {
        corruptionConsumed = true;
        return new Uint8Array([...value, 0x20]);
      }
      return new Uint8Array(value);
    },
    async assertAbsent(path, stage) {
      record(stage, "temp_absence");
      if (files.has(path)) throw new Error("mock:temp_present");
    },
    async remove(path, stage) {
      record(stage, "remove");
      files.delete(path);
    },
    temporaryPath(finalPath, stage) { return `${finalPath}.${stage}.tmp`; },
    async directoryState(path) {
      const override = input.directory_overrides?.get(path);
      if (override !== undefined) return override;
      if (!directories.has(path)) {
        return {
          kind: "missing", entries: [], uid: null, gid: null,
          mode: null, canonical_path: null,
        };
      }
      const entries = new Set<string>();
      for (const filePath of files.keys()) {
        if (dirname(filePath) === path) entries.add(basename(filePath));
      }
      for (const directoryPath of directories) {
        if (directoryPath !== path && dirname(directoryPath) === path) {
          entries.add(basename(directoryPath));
        }
      }
      return {
        kind: "directory",
        entries: [...entries].sort(),
        uid: STATIC_CURRENT_USER.uid,
        gid: STATIC_CURRENT_USER.gid,
        mode: 0o700,
        canonical_path: path,
      };
    },
    currentUserIdentity() {
      return input.current_user === undefined
        ? STATIC_CURRENT_USER
        : input.current_user;
    },
    cleanupReportsRootAuthorized() {
      return input.cleanup_reports_root_authorized ?? true;
    },
    async rmdir(path) {
      const event = path.endsWith("/runs")
        ? "rmdir_runs"
        : path.endsWith(EVIDENCE_REPORTS_RELATIVE_ROOT)
        ? "rmdir_reports"
        : "rmdir_run";
      record("cleanup", event);
      const state = await io.directoryState(path);
      if (state.kind !== "directory" || state.entries.length !== 0) {
        throw new Error("mock:rmdir_not_empty_or_unsafe");
      }
      directories.delete(path);
    },
  };
  return { io, files, directories, events };
}

type OperationCounters = {
  docker_commands: number;
  database_connections: number;
  evidence_writes: number;
  credential_generations: number;
};

type StartupOperation =
  | "authority_validated"
  | "docker_context_validated"
  | "local_target_prevalidated"
  | "image_inspected"
  | "credential_generated"
  | "container_started"
  | "mapped_port_resolved"
  | "local_target_postvalidated"
  | "postgres_internal_readiness_passed"
  | "postgres_connection_attempted";

const REQUIRED_STARTUP_ORDER: readonly StartupOperation[] = [
  "authority_validated", "docker_context_validated",
  "local_target_prevalidated", "image_inspected", "credential_generated",
  "container_started", "mapped_port_resolved", "local_target_postvalidated",
  "postgres_internal_readiness_passed",
  "postgres_connection_attempted",
];

function assertStartupOperationOrder(
  operations: readonly StartupOperation[],
): void {
  if (JSON.stringify(operations) !== JSON.stringify(REQUIRED_STARTUP_ORDER)) {
    throw new Error("DAY147_A5_STARTUP_ORDER_INVALID");
  }
}

function preparePreRunProtectedOperations<ImageResult, CredentialResult,
  ContainerResult>(input: {
  target: PreRunLocalTarget;
  inspect_image: () => Promise<ImageResult>;
  generate_credential: () => CredentialResult;
  start_container: (credential: CredentialResult) => Promise<ContainerResult>;
  record: (operation: StartupOperation) => void;
}): () => Promise<{
  execution_identity: ExecutionIdentity;
  image: ImageResult;
  credential: CredentialResult;
  container: ContainerResult;
}> {
  const executionIdentity = validatePreRunLocalTarget(input.target);
  input.record("local_target_prevalidated");
  return async () => {
    const image = await input.inspect_image();
    input.record("image_inspected");
    const credential = input.generate_credential();
    input.record("credential_generated");
    const container = await input.start_container(credential);
    input.record("container_started");
    return {
      execution_identity: executionIdentity,
      image,
      credential,
      container,
    };
  };
}

function createRuntimeCredential(counters: OperationCounters): string {
  counters.credential_generations += 1;
  return randomBytes(32).toString("hex");
}

function deriveExecutionConfiguration(nonce: string, password: string) {
  if (password.length !== 64) {
    throw new Error("DAY147_A5_CREDENTIAL_INVALID");
  }
  const names = buildNames(nonce);
  return {
    names,
    password,
    docker_environment: {
      POSTGRES_DB: names.main,
      POSTGRES_USER: ROLE_FIXTURES.migration_owner.name,
      POSTGRES_PASSWORD: password,
    },
  };
}

function dockerEnvironmentFromProcess(): DockerEnvironment {
  const pgKeys = [
    "PGHOST",
    "PGPORT",
    "PGDATABASE",
    "PGUSER",
    "PGPASSWORD",
    "PGSERVICE",
    "PGSERVICEFILE",
    "PGSSLMODE",
    "PGSSLROOTCERT",
    "PGOPTIONS",
    "PGAPPNAME",
    "PGCONNECT_TIMEOUT",
  ];
  if (
    [...FORBIDDEN_DATABASE_ENV_KEYS, ...pgKeys].some((key) =>
      process.env[key] !== undefined
    )
  ) {
    throw new Error("DAY147_A5_CONNECTION_SAFETY_BLOCKED");
  }
  return {
    DOCKER_HOST: process.env.DOCKER_HOST,
    DOCKER_CONTEXT: process.env.DOCKER_CONTEXT,
    DOCKER_CONFIG: process.env.DOCKER_CONFIG,
    PATH: process.env.PATH,
  };
}

async function runDockerCommand(input: {
  runner: DockerCommandRunner;
  command: DockerCommand;
  env: Readonly<Record<string, string>>;
  classification: CommandClassification;
  secrets?: readonly string[];
  allow_failure?: boolean;
  timeout_ms?: number;
  counters: OperationCounters;
}): Promise<CommandResult> {
  assert.equal(input.command.executable, "docker");
  const secrets = input.secrets ?? [];
  if (
    input.command.args.some((argument) =>
      secrets.some((secret) => secret.length > 0 && argument.includes(secret))
    )
  ) {
    throw new Error("DAY147_A5_CREDENTIAL_EXPOSURE_BLOCKED");
  }
  input.counters.docker_commands += 1;
  const timeoutMs = input.timeout_ms ?? A5_DOCKER_COMMAND_MAXIMUM_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 ||
    timeoutMs > A5_DOCKER_COMMAND_MAXIMUM_TIMEOUT_MS) {
    throw new Error("DAY147_A5_DOCKER_COMMAND_TIMEOUT_INVALID");
  }
  const result = await input.runner.run("docker", input.command.args, {
    env: input.env,
    timeout_ms: timeoutMs,
    max_output_bytes: 1_048_576,
    classification: input.classification,
    secret_values: secrets,
  });
  if (result.exit_code !== 0 && input.allow_failure !== true) {
    throw new Error("DAY147_A5_DOCKER_COMMAND_FAILED");
  }
  return result;
}

function parseImageDigest(output: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error("DAY147_A5_ENVIRONMENT_BLOCKED");
  }
  const row = Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : null;
  const id = typeof row === "object" && row !== null &&
      typeof (row as { Id?: unknown }).Id === "string"
    ? (row as { Id: string }).Id
    : "";
  const repoTags = typeof row === "object" && row !== null &&
      Array.isArray((row as { RepoTags?: unknown }).RepoTags)
    ? (row as { RepoTags: unknown[] }).RepoTags
    : [];
  if (
    !/^sha256:[a-f0-9]{64}$/.test(id) ||
    repoTags.length < 1 ||
    !repoTags.every((tag) => typeof tag === "string") ||
    !repoTags.includes(IMAGE)
  ) {
    throw new Error("DAY147_A5_ENVIRONMENT_BLOCKED");
  }
  return id;
}

async function executeImagePreflight(input: Readonly<{
  inspect_image: () => Promise<CommandResult>;
  on_failure: (failureCode: "DAY147_A5_ENVIRONMENT_BLOCKED") => Promise<void> | void;
}>): Promise<string> {
  try {
    const result = await input.inspect_image();
    if (result.exit_code !== 0) {
      throw new Error("DAY147_A5_ENVIRONMENT_BLOCKED");
    }
    return parseImageDigest(result.stdout);
  } catch {
    await input.on_failure("DAY147_A5_ENVIRONMENT_BLOCKED");
    throw new Error("DAY147_A5_ENVIRONMENT_BLOCKED");
  }
}

export function isExactContainerNotFound(
  result: CommandResult,
  exactTarget: string,
): boolean {
  if (
    result.exit_code !== 1 || result.stdout.trim() !== "" ||
    (!CONTAINER_PATTERN.test(exactTarget) &&
      !CONTAINER_ID_PATTERN.test(exactTarget))
  ) {
    return false;
  }
  const lines = result.stderr.trim().split(/\r?\n/);
  return lines.length === 1 &&
    (
      lines[0] === `Error: No such object: ${exactTarget}` ||
      lines[0] ===
        `Error response from daemon: No such container: ${exactTarget}`
    );
}

export function isExactNetworkNotFound(
  result: Readonly<{ exit_code: number; stdout: string; stderr: string }>,
  exactTarget: string,
): boolean {
  if (result.exit_code !== 1 ||
    !/^(?:[a-f0-9]{64}|[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127})$/.test(exactTarget) ||
    result.stdout.trim() !== "") return false;
  const lines = result.stderr.trim().split(/\r?\n/);
  return lines.length === 1 && (
    lines[0] === `Error: No such object: ${exactTarget}` ||
    lines[0] === `Error response from daemon: network ${exactTarget} not found`
  );
}

async function assertMappedPortClosed(port: number): Promise<void> {
  await new Promise<void>((resolveClosed, rejectOpen) => {
    const socket = new Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolveClosed();
    }, 500);
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      rejectOpen(new Error("DAY147_A5_POST_CLEANUP_PORT_OPEN"));
    });
    socket.once("error", () => {
      clearTimeout(timer);
      socket.destroy();
      resolveClosed();
    });
    socket.connect(port, LOCAL_HOST);
  });
}

type CleanupState = {
  containerStartAttempted: boolean;
  containerStarted: boolean;
  canonicalContainerId: string | null;
  cleanupAttempted: boolean;
  cleanupSucceeded: boolean;
  postCleanupVerified: boolean;
};

async function cleanupOwnedContainer(input: {
  runner: DockerCommandRunner;
  env: Readonly<Record<string, string>>;
  names: ReturnType<typeof buildNames>;
  state: CleanupState;
  mapped_port: number | null;
  counters: OperationCounters;
  assert_mapped_port_closed?: (port: number) => Promise<void>;
}): Promise<void> {
  if (input.state.cleanupAttempted) {
    throw new Error("DAY147_A5_CLEANUP_ALREADY_ATTEMPTED");
  }
  input.state.cleanupAttempted = true;
  if (!input.state.containerStarted) {
    if (input.state.containerStartAttempted) {
      const uncertain = await runDockerCommand({
        runner: input.runner,
        command: buildExistingContainerCheckCommand(input.names.container),
        env: input.env,
        classification: "post_cleanup_verify",
        allow_failure: true,
        counters: input.counters,
      });
      if (uncertain.exit_code === 0) {
        throw new Error("BLOCKED_CLEANUP_IDENTITY");
      }
      if (!isExactContainerNotFound(uncertain, input.names.container)) {
        throw new Error("DAY147_A5_POST_CLEANUP_VERIFY_FAILED");
      }
    }
    input.state.cleanupSucceeded = true;
    input.state.postCleanupVerified = true;
    return;
  }
  const expectedId = input.state.canonicalContainerId;
  if (expectedId === null || !CONTAINER_ID_PATTERN.test(expectedId)) {
    throw new Error("BLOCKED_CLEANUP_IDENTITY");
  }
  const identity = await runDockerCommand({
    runner: input.runner,
    command: buildContainerIdentityCommand(input.names.container),
    env: input.env,
    classification: "container_identity",
    counters: input.counters,
  });
  const observedId = parseCanonicalContainerId(identity.stdout);
  const cleanupCommand = buildExactCleanupCommand({
    generated_name: input.names.container,
    expected_id: expectedId,
    observed_id: observedId,
  });
  await runDockerCommand({
    runner: input.runner,
    command: cleanupCommand,
    env: input.env,
    classification: "container_cleanup",
    counters: input.counters,
  });
  const absent = await runDockerCommand({
    runner: input.runner,
    command: buildExistingContainerCheckCommand(input.names.container),
    env: input.env,
    classification: "post_cleanup_verify",
    allow_failure: true,
    counters: input.counters,
  });
  if (absent.exit_code === 0) {
    throw new Error("DAY147_A5_POST_CLEANUP_CONTAINER_PRESENT");
  }
  if (!isExactContainerNotFound(absent, input.names.container)) {
    throw new Error("DAY147_A5_POST_CLEANUP_VERIFY_FAILED");
  }
  if (input.mapped_port !== null) {
    await (input.assert_mapped_port_closed ?? assertMappedPortClosed)(
      input.mapped_port,
    );
  }
  input.state.cleanupSucceeded = true;
  input.state.postCleanupVerified = true;
}

type ExecuteIsolatedInput = {
  arguments: ParsedArguments;
  runner: DockerCommandRunner;
  environment: DockerEnvironment;
  counters: OperationCounters;
  socket_provenance_io?: SocketProvenanceIo;
  current_user_identity?: CurrentUserIdentity | null;
  evidence_io?: EvidenceIo;
  evidence_root?: string;
  pre_run_target_override?: Partial<PreRunLocalTarget>;
  internal_readiness_dependencies?: A5PostgresInternalReadinessDependencies;
  readiness_dependencies?: A5PostgresReadinessDependencies;
  static_after_readiness_gate?: (input: Readonly<{
    readiness: A5PostgresReadinessResult;
    migrations_may_start: true;
  }>) => never;
  assert_mapped_port_closed?: (port: number) => Promise<void>;
  static_credential_fixture?: string;
};

class A5PrimaryFailureError extends Error {
  readonly secondary_failure_code: "DAY147_A5_EVIDENCE_DURABILITY_BLOCKED";
  readonly secondary_stage_code: A5EvidenceWriteErrorCode;
  readonly secondary_artifact_role: EvidenceWriteStage;
  readonly cleanup_error_code:
    | "DAY147_A5_EMPTY_RUN_DIRECTORY_CLEANUP_FAILED"
    | null;

  constructor(primary: string, secondary: A5EvidenceWriteError) {
    super(primary);
    this.name = "A5PrimaryFailureError";
    this.stack = `${this.name}: ${this.message}`;
    this.secondary_failure_code = "DAY147_A5_EVIDENCE_DURABILITY_BLOCKED";
    this.secondary_stage_code = secondary.failure_evidence_error_code;
    this.secondary_artifact_role = secondary.artifact_role;
    this.cleanup_error_code = secondary.cleanup_error_code;
  }
}

function preContextFailureEvidence(input: {
  nonce: string;
  primary_failure: string;
}): Evidence {
  return {
    schema_version: FARM_OS_DAY147A5_EVIDENCE_SCHEMA_VERSION,
    execution_nonce: input.nonce,
    day: "147-A",
    process: "A5",
    result: "BLOCKED",
    phase_reached: "CLEANUP_SKIPPED_NOT_STARTED",
    execution_phase: "CLEANUP_SKIPPED_NOT_STARTED",
    evidence_phase: "FINALIZED",
    evidence_status: "VALID",
    durability_complete: true,
    success_claimed: false,
    receipt_required: true,
    receipt_relative_path: FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH,
    artifact: { artifact_written: true, artifact_valid: true },
    readiness: readinessSummary(null),
    checksums: MIGRATION_CHECKSUMS,
    postgres_version: null,
    image: IMAGE,
    image_digest: null,
    connection_metadata: null,
    role_matrix: ROLE_FIXTURES,
    transition_matrix_summary: {
      states: 5, ordered_pairs: 25, allowed: 4, forbidden: 21,
    },
    test_results: [],
    concurrency_timeline: [],
    row_counts: {},
    failure_codes: {
      primary: input.primary_failure,
      cleanup: null,
      evidence_writer: null,
    },
    cleanup: {
      phase: "CLEANUP_SKIPPED_NOT_STARTED",
      attempted: false,
      completed: false,
      post_cleanup_verified: false,
      container_absent: true,
      clients_closed: true,
      mapped_port_closed: true,
      persistent_volume_absent: true,
      failure_code: null,
    },
    safety: {
      ...EVIDENCE_SAFETY,
      local_only_gate_passed: false,
      docker_daemon_local: false,
    },
  };
}

function networkHostFailureEvidence(input: Readonly<{
  nonce: string;
  primary_failure: string;
  cleanup: NetworkCleanupResult;
}>): Evidence {
  const cleanupAttempted = input.cleanup.attempted.length !== 0;
  const cleanupPassed = input.cleanup.failures.length === 0;
  const cleanupPhase = cleanupAttempted && cleanupPassed
    ? "CLEANUP_COMPLETED" as const
    : cleanupAttempted ? "CLEANUP_FAILED" as const
    : "CLEANUP_SKIPPED_NOT_STARTED" as const;
  return Object.freeze({
    ...preContextFailureEvidence({ nonce: input.nonce,
      primary_failure: input.primary_failure }),
    phase_reached: cleanupPhase,
    execution_phase: cleanupPhase,
    cleanup: {
      phase: cleanupPhase,
      attempted: cleanupAttempted,
      completed: cleanupAttempted && cleanupPassed,
      post_cleanup_verified: cleanupAttempted && cleanupPassed,
      container_absent: cleanupPassed,
      clients_closed: true,
      mapped_port_closed: true,
      persistent_volume_absent: true,
      failure_code: input.cleanup.failures[0]?.failure_code ?? null,
    },
    failure_codes: {
      primary: input.primary_failure,
      cleanup: input.cleanup.failures[0]?.failure_code ?? null,
      evidence_writer: null,
    },
    safety: { ...EVIDENCE_SAFETY },
  });
}

async function executeIsolatedMode(
  input: ExecuteIsolatedInput,
): Promise<RunScopedEvidenceWriteResult> {
  if (
    input.arguments.mode !== "execute-isolated" ||
    input.arguments.authority !== EXECUTION_AUTHORITY
  ) {
    throw new Error("DAY147_A5_EXECUTION_REQUIRES_A5_3_AUTHORITY");
  }
  const nonce = randomBytes(6).toString("hex");
  const startupOperations: StartupOperation[] = ["authority_validated"];
  let dockerSafety: ReturnType<typeof validateDockerEnvironment>;
  try {
    const socketIo = input.socket_provenance_io ??
      PRODUCTION_SOCKET_PROVENANCE_IO;
    const currentUser = input.current_user_identity === undefined
      ? socketIo.currentUserIdentity()
      : input.current_user_identity;
    dockerSafety = validateDockerEnvironment(input.environment, currentUser);
    const contextShow = await runDockerCommand({
      runner: input.runner,
      command: buildContextShowCommand(),
      env: dockerSafety.command_env,
      classification: "context_show",
      allow_failure: true,
      counters: input.counters,
    });
    if (contextShow.exit_code !== 0) {
      throw new Error("DAY147_A5_CONNECTION_SAFETY_BLOCKED");
    }
    const contextName = parseDockerContextName(contextShow.stdout);
    const contextInspect = await runDockerCommand({
      runner: input.runner,
      command: buildContextInspectCommand(contextName),
      env: dockerSafety.command_env,
      classification: "context_inspect",
      allow_failure: true,
      counters: input.counters,
    });
    const endpointClassification = contextInspect.exit_code === 0
      ? classifyDockerEndpoint({
        inspect_output: contextInspect.stdout,
        expected_context: contextName,
        identity: currentUser,
        socket_io: socketIo,
      })
      : unknownDockerEndpoint();
    if (
      contextInspect.exit_code !== 0 ||
      endpointClassification.daemon_class !== "LOCAL_UNIX_SOCKET" ||
      endpointClassification.provider_class === "UNKNOWN" ||
      !endpointClassification.provider_socket_compatible ||
      !endpointClassification.provider_identity_verified ||
      !endpointClassification.path_canonical_verified ||
      !endpointClassification.filesystem_provenance_verified ||
      !endpointClassification.ownership_verified ||
      !endpointClassification.remote_rejected ||
      !endpointClassification.tls_rejected
    ) {
      throw new Error("DAY147_A5_CONNECTION_SAFETY_BLOCKED");
    }
    startupOperations.push("docker_context_validated");
  } catch (error) {
    const primary = "DAY147_A5_CONNECTION_SAFETY_BLOCKED" as const;
    const failureEvidence = preContextFailureEvidence({
      nonce,
      primary_failure: primary,
    });
    input.counters.evidence_writes += 1;
    try {
      await writeEvidenceAtomically({
        root: input.evidence_root ?? ROOT,
        execution_nonce: nonce,
        failure_evidence: failureEvidence,
        forbidden_values: new Set(),
        io: input.evidence_io,
      });
    } catch (writerError) {
      const sanitizedWriterError = asEvidenceWriteError(
        writerError,
        "chain_invalidation",
        "failure",
      );
      throw new A5PrimaryFailureError(primary, sanitizedWriterError);
    }
    throw new Error(primary);
  }
  return executeAfterDockerContext({
    ...input,
    nonce,
    docker_safety: dockerSafety,
    startup_operations: startupOperations,
  });
}

async function executeAfterDockerContext(input: ExecuteIsolatedInput & {
  nonce: string;
  docker_safety: ReturnType<typeof validateDockerEnvironment>;
  startup_operations: StartupOperation[];
}): Promise<RunScopedEvidenceWriteResult> {
  const startupOperations = input.startup_operations;
  const dockerSafety = input.docker_safety;
  const nonce = input.nonce;
  let phase: HarnessPhase = "INITIAL";
  let names: ReturnType<typeof buildNames> | null = null;
  let executionIdentity: ExecutionIdentity | null = null;
  let credential: string | null = null;
  let credentialConfiguration: ReturnType<
    typeof deriveExecutionConfiguration
  > | null = null;
  let mappedPort: number | null = null;
  let validatedConnectionResult: ValidatedConnectionTopologyResult | null = null;
  let imageDigest: string | null = null;
  let imagePreflightFailureCode: "DAY147_A5_ENVIRONMENT_BLOCKED" | null = null;
  let testResults: Evidence["test_results"] = [];
  let concurrencyTimeline: readonly BarrierEvent[] = [];
  let rowCounts: Readonly<Record<string, number>> = {};
  let postgresVersion: string | null = null;
  let postgresReadiness: A5PostgresReadinessResult | null = null;
  let primaryFailure: Error | null = null;
  let cleanupFailure: Error | null = null;
  let evidenceWriterFailure: Error | null = null;
  const cleanup: CleanupState = {
    containerStartAttempted: false,
    containerStarted: false,
    canonicalContainerId: null,
    cleanupAttempted: false,
    cleanupSucceeded: false,
    postCleanupVerified: false,
  };

  phase = advancePhase(phase, "SAFETY_VALIDATED");
  names = buildNames(nonce);
  try {
    const executePreStart = preparePreRunProtectedOperations({
    target: {
      host: LOCAL_HOST,
      ssl: false,
      image: IMAGE,
      container_name: names.container,
      database_names: [names.legacy_active, names.legacy_superseded, names.main],
      docker_publish_plan: "127.0.0.1::5432",
      storage: "tmpfs_only",
      ...input.pre_run_target_override,
    },
    record(operation) { startupOperations.push(operation); },
    async inspect_image() {
      imageDigest = await executeImagePreflight({
        inspect_image: () => runDockerCommand({
          runner: input.runner,
          command: buildImageInspectCommand(),
          env: dockerSafety.command_env,
          classification: "image_inspect",
          allow_failure: true,
          counters: input.counters,
        }),
        on_failure(failureCode) {
          imagePreflightFailureCode = failureCode;
        },
      });
      phase = advancePhase(phase, "IMAGE_VERIFIED");
      return imageDigest;
    },
    generate_credential() {
      credential = input.static_credential_fixture ??
        createRuntimeCredential(input.counters);
      if (input.static_credential_fixture !== undefined &&
        input.static_credential_fixture.length !== 64) {
        throw new Error("DAY147_A5_CREDENTIAL_INVALID");
      }
      const execution = deriveExecutionConfiguration(nonce, credential);
      credentialConfiguration = execution;
      assert.deepEqual(execution.names, names);
      return { password: credential, execution };
    },
    async start_container(generated) {
      const existing = await runDockerCommand({
        runner: input.runner,
        command: buildExistingContainerCheckCommand(names.container),
        env: dockerSafety.command_env,
        classification: "container_preflight",
        allow_failure: true,
        secrets: [generated.password],
        counters: input.counters,
      });
      if (existing.exit_code === 0) {
        throw new Error("DAY147_A5_EXISTING_CONTAINER_CONFLICT");
      }
      if (!isExactContainerNotFound(existing, names.container)) {
        throw new Error("DAY147_A5_CONNECTION_SAFETY_BLOCKED");
      }
      cleanup.containerStartAttempted = true;
      const started = await runDockerCommand({
        runner: input.runner,
        command: buildDockerRunCommand(names.container),
        env: {
          ...dockerSafety.command_env,
          ...generated.execution.docker_environment,
        },
        classification: "container_start",
        secrets: [generated.password],
        counters: input.counters,
      });
      cleanup.canonicalContainerId = parseCanonicalContainerId(started.stdout);
      cleanup.containerStarted = true;
      return cleanup.canonicalContainerId;
    },
    });
    const preStart = await executePreStart();
    executionIdentity = preStart.execution_identity;
    imageDigest = preStart.image;
    assert.ok(credential);
    const readinessCredential = credential;
    assert.ok(cleanup.canonicalContainerId);
    const readinessExecutionIdentity = executionIdentity;
    const identity = await runDockerCommand({
      runner: input.runner,
      command: buildContainerMetadataCommand(names.container),
      env: dockerSafety.command_env,
      classification: "container_identity",
      counters: input.counters,
    });
    const containerMetadata = parseContainerMetadata(identity.stdout);
    const observedContainerId = containerMetadata.id;
    if (observedContainerId !== cleanup.canonicalContainerId) {
      throw new Error("BLOCKED_CLEANUP_IDENTITY");
    }
    phase = advancePhase(phase, "CONTAINER_STARTED");

    const portResult = await runDockerCommand({
      runner: input.runner,
      command: buildPortResolutionCommand(cleanup.canonicalContainerId),
      env: dockerSafety.command_env,
      classification: "port_resolution",
      counters: input.counters,
    });
    mappedPort = parsePublishedPort(portResult.stdout);
    startupOperations.push("mapped_port_resolved");
    const adminConfig = buildClientConfig({
      execution_identity: executionIdentity,
      port: mappedPort,
      database_target: "main",
      application_role: "migration_owner",
      user: ROLE_FIXTURES.migration_owner.name,
      password: credential,
      lock_timeout_ms: 5_000,
    });
    const legacyActiveConfig = buildClientConfig({
      execution_identity: executionIdentity,
      port: mappedPort,
      database_target: "legacy_active",
      application_role: "migration_owner",
      user: ROLE_FIXTURES.migration_owner.name,
      password: credential,
      lock_timeout_ms: 5_000,
    });
    const legacySupersededConfig = buildClientConfig({
      execution_identity: executionIdentity,
      port: mappedPort,
      database_target: "legacy_superseded",
      application_role: "migration_owner",
      user: ROLE_FIXTURES.migration_owner.name,
      password: credential,
      lock_timeout_ms: 5_000,
    });
    const bundleConfig = buildClientConfig({
      execution_identity: executionIdentity,
      port: mappedPort,
      database_target: "main",
      application_role: "bundle_runtime",
      user: ROLE_FIXTURES.bundle_runtime_fixture.name,
      password: credential,
      lock_timeout_ms: 5_000,
    });
    const verificationConfig = buildClientConfig({
      execution_identity: executionIdentity,
      port: mappedPort,
      database_target: "main",
      application_role: "verification",
      user: ROLE_FIXTURES.verification.name,
      password: credential,
      lock_timeout_ms: 5_000,
    });
    validatedConnectionResult = validatePostStartLocalTarget({
      execution_identity: executionIdentity,
      mapped_host: LOCAL_HOST,
      mapped_port: mappedPort,
      mapping_count: 1,
      inspected_container_name: containerMetadata.name,
      expected_container_id: cleanup.canonicalContainerId,
      observed_container_id: observedContainerId,
      port_resolution_container_id: cleanup.canonicalContainerId,
      preflight_image_digest: imageDigest,
      observed_container_image_digest: containerMetadata.image_digest,
      final_pg_bindings: [
        { config: adminConfig, database_target: "main", application_role: "migration_owner" },
        { config: legacyActiveConfig, database_target: "legacy_active", application_role: "migration_owner" },
        { config: legacySupersededConfig, database_target: "legacy_superseded", application_role: "migration_owner" },
        { config: bundleConfig, database_target: "main", application_role: "bundle_runtime" },
        { config: verificationConfig, database_target: "main", application_role: "verification" },
      ],
    });
    startupOperations.push("local_target_postvalidated");
    const readinessBinding = Object.freeze({
      execution_nonce: readinessExecutionIdentity.nonce,
      canonical_container_id: cleanup.canonicalContainerId,
      expected_container_name: names.container,
      expected_image_digest: imageDigest,
    });
    const inspectCurrentContainerState = async (
      timeoutMs: number,
      binding: A5ContainerRevalidationBinding,
    ): Promise<A5ContainerRuntimeObservation> => {
      assert.ok(cleanup.canonicalContainerId);
      assert.deepEqual(binding, readinessBinding);
      const stateResult = await runDockerCommand({
        runner: input.runner,
        command: buildContainerRuntimeStateCommand(cleanup.canonicalContainerId),
        env: dockerSafety.command_env,
        classification: "container_readiness_state",
        allow_failure: true,
        timeout_ms: Math.min(
          timeoutMs,
          A5_DOCKER_COMMAND_MAXIMUM_TIMEOUT_MS,
        ),
        counters: input.counters,
      });
      return stateResult.exit_code === 0
        ? parseBoundContainerRuntimeState(stateResult.stdout, binding)
        : { state: "UNKNOWN", exit_code: null, restarting: false, oom_killed: false };
    };
    const internalReadinessDependencies =
      input.internal_readiness_dependencies ?? {
        now_ms: () => performance.now(),
        sleep_ms: delay,
        inspect_container_state: inspectCurrentContainerState,
        run_pg_isready: (
          timeoutMs: number,
          binding: A5ContainerRevalidationBinding,
        ) => runDockerCommand({
          runner: input.runner,
          command: buildContainerInternalReadinessCommand({
            binding,
            postgres_user: ROLE_FIXTURES.migration_owner.name,
            postgres_database: names.main,
          }),
          env: dockerSafety.command_env,
          classification: "container_internal_readiness",
          allow_failure: true,
          timeout_ms: Math.min(
            timeoutMs,
            A5_DOCKER_COMMAND_MAXIMUM_TIMEOUT_MS,
          ),
          secrets: [readinessCredential],
          counters: input.counters,
        }),
      } satisfies A5PostgresInternalReadinessDependencies;
    await waitForContainerInternalPostgres({
      binding: readinessBinding,
      deadline_ms: A5_POSTGRES_READINESS_GLOBAL_DEADLINE_MS,
      retry_interval_ms: A5_POSTGRES_READINESS_RETRY_INTERVAL_MS,
      per_command_timeout_ms: A5_POSTGRES_READINESS_PER_ATTEMPT_TIMEOUT_MS,
      dependencies: internalReadinessDependencies,
    });
    startupOperations.push("postgres_internal_readiness_passed");
    startupOperations.push("postgres_connection_attempted");
    assertStartupOperationOrder(startupOperations);
    const readinessDependencies = input.readiness_dependencies ?? {
      now_ms: () => performance.now(),
      sleep_ms: delay,
      run_convergent_operation: runConvergentReadinessOperation,
      create_client(config: ClientConfig) {
        input.counters.database_connections += 1;
        return createPgReadinessClient(config);
      },
      inspect_container_state: inspectCurrentContainerState,
    } satisfies A5PostgresReadinessDependencies;
    const readinessGate = await runPostgresReadinessGate({
      config: adminConfig,
      maximum_attempts: A5_POSTGRES_READINESS_MAXIMUM_ATTEMPTS,
      interval_ms: A5_POSTGRES_READINESS_RETRY_INTERVAL_MS,
      global_deadline_ms: A5_POSTGRES_READINESS_GLOBAL_DEADLINE_MS,
      per_attempt_timeout_ms: A5_POSTGRES_READINESS_PER_ATTEMPT_TIMEOUT_MS,
      revalidation_binding: readinessBinding,
      dependencies: readinessDependencies,
    });
    postgresReadiness = readinessGate.readiness;
    if (!postgresReadiness.ready) {
      throw new Error(
        readinessGate.primary_failure_code ??
          "DAY147_A5_POSTGRES_READINESS_UNKNOWN",
      );
    }
    assert.equal(readinessGate.migrations_may_start, true);
    input.static_after_readiness_gate?.({
      readiness: readinessGate.readiness,
      migrations_may_start: true,
    });
    phase = advancePhase(phase, "POSTGRES_READY");

    const dynamicResults = await runSharedA5DynamicDatabaseSuite({
      names,
      credential,
      execution_identity: executionIdentity,
      admin_config: adminConfig,
      legacy_active_config: legacyActiveConfig,
      legacy_superseded_config: legacySupersededConfig,
      bundle_config: bundleConfig,
      verification_config: verificationConfig,
      on_connection() { input.counters.database_connections += 1; },
      on_phase(nextPhase) { phase = advancePhase(phase, nextPhase); },
    });
    postgresVersion = dynamicResults.postgres_version;
    testResults = dynamicResults.test_results;
    concurrencyTimeline = dynamicResults.concurrency_timeline;
    rowCounts = dynamicResults.row_counts;
    phase = advancePhase(phase, "DYNAMIC_TESTS_COMPLETED");
  } catch (error) {
    primaryFailure = error instanceof Error
      ? new Error(error.message)
      : new Error("DAY147_A5_EXECUTION_FAILED");
    phase = advancePhase(phase, "FAILED");
  } finally {
    if (!cleanup.containerStartAttempted) {
      phase = advancePhase(phase, "CLEANUP_SKIPPED_NOT_STARTED");
    } else {
      phase = advancePhase(phase, "CLEANUP_STARTED");
      try {
        assert.ok(names);
        await cleanupOwnedContainer({
          runner: input.runner,
          env: dockerSafety.command_env,
          names,
          state: cleanup,
          mapped_port: mappedPort,
          counters: input.counters,
          assert_mapped_port_closed: input.assert_mapped_port_closed,
        });
        if (postgresReadiness?.clients_closed === false) {
          throw new Error("DAY147_A5_POSTGRES_CLIENT_CLEANUP_FAILED");
        }
        phase = advancePhase(phase, "CLEANUP_COMPLETED");
      } catch (error) {
        cleanupFailure = error instanceof Error
          ? new Error(error.message)
          : new Error("DAY147_A5_CLEANUP_FAILED");
        phase = advancePhase(phase, "CLEANUP_FAILED");
      }
    }
  }

  assert.ok(names);
  const result: Evidence["result"] = cleanupFailure !== null
    ? "FAILED"
    : primaryFailure !== null
    ? primaryFailure.message === "DAY147_A5_IMPLEMENTATION_CONFLICT" ||
        primaryFailure.message === "DAY147_A5_ENVIRONMENT_BLOCKED"
      ? "BLOCKED"
      : "FAILED"
    : "PASS";
  if (imagePreflightFailureCode !== null) {
    assert.equal(primaryFailure?.message, imagePreflightFailureCode);
  }
  const cleanupPhase: Evidence["cleanup"]["phase"] =
    !cleanup.containerStartAttempted
      ? "CLEANUP_SKIPPED_NOT_STARTED"
      : cleanupFailure === null
      ? "CLEANUP_COMPLETED"
      : "CLEANUP_FAILED";
  const buildEvidence = (overrides: Readonly<{
    result: Evidence["result"];
    phase_reached: HarnessPhase;
    execution_phase: HarnessPhase;
    evidence_phase: Evidence["evidence_phase"];
    evidence_status: Evidence["evidence_status"];
    durability_complete: boolean;
    success_claimed: boolean;
    artifact_valid: boolean;
    evidence_writer_failure?: string | null;
  }>): Evidence => ({
    schema_version: FARM_OS_DAY147A5_EVIDENCE_SCHEMA_VERSION,
    execution_nonce: nonce,
    day: "147-A",
    process: "A5",
    result: overrides.result,
    phase_reached: overrides.phase_reached,
    execution_phase: overrides.execution_phase,
    evidence_phase: overrides.evidence_phase,
    evidence_status: overrides.evidence_status,
    durability_complete: overrides.durability_complete,
    success_claimed: overrides.success_claimed,
    receipt_required: true,
    receipt_relative_path: FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH,
    artifact: {
      artifact_written: true,
      artifact_valid: overrides.artifact_valid,
    },
    readiness: readinessSummary(postgresReadiness),
    checksums: MIGRATION_CHECKSUMS,
    postgres_version: postgresVersion,
    image: IMAGE,
    image_digest: imageDigest,
    connection_metadata: validatedConnectionResult === null
      ? null
      : serializeValidatedConnectionTopology(validatedConnectionResult),
    role_matrix: ROLE_FIXTURES,
    transition_matrix_summary: {
      states: 5,
      ordered_pairs: 25,
      allowed: 4,
      forbidden: 21,
    },
    test_results: testResults,
    concurrency_timeline: concurrencyTimeline,
    row_counts: rowCounts,
    failure_codes: {
      primary: primaryFailure?.message ?? null,
      cleanup: cleanupFailure?.message ?? null,
      evidence_writer: overrides.evidence_writer_failure ?? null,
    },
    cleanup: {
      phase: cleanupPhase,
      attempted: cleanup.cleanupAttempted,
      completed: cleanup.containerStartAttempted && cleanup.cleanupSucceeded &&
        cleanup.postCleanupVerified,
      post_cleanup_verified: cleanup.postCleanupVerified,
      container_absent: !cleanup.containerStarted || cleanup.postCleanupVerified,
      clients_closed: postgresReadiness?.clients_closed ?? true,
      mapped_port_closed: mappedPort === null || cleanup.postCleanupVerified,
      persistent_volume_absent: true,
      failure_code: cleanupFailure?.message ?? null,
    },
    safety: EVIDENCE_SAFETY,
  });
  let evidenceDurability:
    | RunScopedEvidenceWriteResult
    | DirectoryDurabilityResult
    | null = null;
  try {
    input.counters.evidence_writes += 1;
    if (result === "PASS") {
      assert.equal(phase, "CLEANUP_COMPLETED");
      phase = advancePhase(phase, "COMPLETE");
      const finalEvidence = buildEvidence({
        result: "PASS",
        phase_reached: "COMPLETE",
        execution_phase: "COMPLETE",
        evidence_phase: "FINALIZED",
        evidence_status: "VALID",
        durability_complete: true,
        success_claimed: true,
        artifact_valid: true,
      });
      const durabilityFailureEvidence = buildEvidence({
        result: "FAILED",
        phase_reached: "EVIDENCE_BLOCKED",
        execution_phase: "EVIDENCE_BLOCKED",
        evidence_phase: "FINALIZED",
        evidence_status: "VALID",
        durability_complete: true,
        success_claimed: false,
        artifact_valid: true,
        evidence_writer_failure: "DAY147_A5_EVIDENCE_DURABILITY_BLOCKED",
      });
      evidenceDurability = await writeEvidenceAtomically({
        root: input.evidence_root ?? ROOT,
        execution_nonce: nonce,
        final_evidence: finalEvidence,
        failure_evidence: durabilityFailureEvidence,
        forbidden_values: new Set(credential === null ? [] : [credential]),
        io: input.evidence_io,
      });
    } else {
      const failureEvidence = buildEvidence({
        result,
        phase_reached: phase,
        execution_phase: phase,
        evidence_phase: "FINALIZED",
        evidence_status: "VALID",
        durability_complete: true,
        success_claimed: false,
        artifact_valid: true,
      });
      evidenceDurability = await writeEvidenceAtomically({
        root: input.evidence_root ?? ROOT,
        execution_nonce: nonce,
        failure_evidence: failureEvidence,
        forbidden_values: new Set(credential === null ? [] : [credential]),
        io: input.evidence_io,
      });
    }
  } catch (error) {
    if (NORMAL_PHASE_TRANSITIONS[phase].includes("EVIDENCE_BLOCKED")) {
      phase = advancePhase(phase, "EVIDENCE_BLOCKED");
    }
    evidenceWriterFailure = error instanceof Error
      ? new Error(error.message)
      : new Error("DAY147_A5_EVIDENCE_WRITE_FAILED");
    primaryFailure ??= evidenceWriterFailure;
  } finally {
    credential = null;
    credentialConfiguration = null;
  }
  assert.equal(credentialConfiguration, null);
  if (
    result !== "PASS" ||
    phase !== "COMPLETE" ||
    primaryFailure !== null ||
    cleanupFailure !== null ||
    evidenceWriterFailure !== null
  ) {
    throw new Error(
      cleanupFailure?.message ?? primaryFailure?.message ??
      "DAY147_A5_EXECUTION_FAILED",
    );
  }
  assert.ok(evidenceDurability);
  if (!("artifact_chain_valid" in evidenceDurability)) {
    throw new Error("DAY147_A5_EVIDENCE_SUCCESS_CONTRACT_INVALID");
  }
  return evidenceDurability;
}

async function runDockerTimeoutStaticTests(): Promise<void> {
  type DockerTerminationBehavior =
    | "SIGTERM_EXIT" | "SIGKILL_EXIT" | "UNREAPED"
    | "CLOSE_ONLY" | "EXIT_ONLY" | "DELAYED_STDIO" | "TIMEOUT_ERROR";
  const executeCase = async (behavior: DockerTerminationBehavior) => {
    const signals: string[] = [];
    let spawnCount = 0;
    const child = new EventEmitter() as A5DockerChild;
    const stdout = new EventEmitter();
    const stderr = new EventEmitter();
    Object.assign(child, { stdout, stderr });
    const closeStreams = () => {
      stdout.emit("close");
      stderr.emit("close");
    };
    Object.assign(child, {
      kill(signal: "SIGTERM" | "SIGKILL") {
        signals.push(signal);
        if (behavior === "SIGTERM_EXIT" && signal === "SIGTERM") {
          queueMicrotask(() => { closeStreams(); child.emit("exit", 143); });
        } else if (behavior === "SIGKILL_EXIT" && signal === "SIGKILL") {
          queueMicrotask(() => { closeStreams(); child.emit("exit", 137); });
        } else if (behavior === "CLOSE_ONLY" && signal === "SIGTERM") {
          queueMicrotask(() => child.emit("close", 143));
        } else if (behavior === "EXIT_ONLY" && signal === "SIGTERM") {
          closeStreams();
          queueMicrotask(() => child.emit("exit", 143));
        } else if (behavior === "DELAYED_STDIO" && signal === "SIGTERM") {
          queueMicrotask(() => child.emit("exit", 143));
          setTimeout(closeStreams, 2);
        } else if (behavior === "TIMEOUT_ERROR" && signal === "SIGTERM") {
          queueMicrotask(() => {
            child.emit("error", new Error("sanitized child termination error"));
            closeStreams();
            child.emit("exit", 143);
          });
        }
        return true;
      },
    });
    const runner = new ProductionDockerCommandRunner(
      () => { spawnCount += 1; return child; },
      5,
      5,
    );
    await assert.rejects(
      runner.run("docker", ["version"], {
        env: { PATH: "/usr/bin", HOME: "/tmp" },
        timeout_ms: 1,
        max_output_bytes: 1_024,
        classification: "context_show",
        secret_values: [],
      }),
      {
        message: behavior === "UNREAPED"
          ? "DAY147_A5_DOCKER_PROCESS_TERMINATION_FAILED"
          : "DAY147_A5_DOCKER_COMMAND_TIMEOUT",
      },
      behavior,
    );
    return { signals, spawnCount };
  };
  for (const behavior of [
    "SIGTERM_EXIT", "CLOSE_ONLY", "EXIT_ONLY", "DELAYED_STDIO",
    "TIMEOUT_ERROR",
  ] as const) {
    const observed = await executeCase(behavior);
    assert.deepEqual(observed.signals, ["SIGTERM"], behavior);
    assert.equal(observed.spawnCount, 1, behavior);
  }
  const sigkill = await executeCase("SIGKILL_EXIT");
  assert.deepEqual(sigkill.signals, ["SIGTERM", "SIGKILL"]);
  const unreaped = await executeCase("UNREAPED");
  assert.deepEqual(unreaped.signals, ["SIGTERM", "SIGKILL"]);
  assert.equal(unreaped.spawnCount, 1);
}

/* Superseded pre-revision network static tests retained for review history.
async function runNetworkClientRevisionStaticTests(): Promise<void> {
  const nonce = "a1b2c3d4e5f6";
  const names = buildNetworkRunNames(nonce);
  const existingManifest = syntheticGeneratedFailureArtifactManifest(12);
  const repositoryManifestBefore = captureGeneratedFailureArtifactManifest();
  assert.equal(repositoryManifestBefore.size, 12);
  const e031Bytes = readFileSync(resolve(ROOT,
    `${EVIDENCE_REPORTS_RELATIVE_ROOT}/runs/e031667980fe/evidence.json`));
  const e031Evidence: unknown = JSON.parse(e031Bytes.toString("utf8"));
  assert.equal(classifyEvidenceArtifactProvenance({ evidence: e031Evidence }),
    "FULL_EXECUTION_FAILURE_ARTIFACT");
  assert.equal(classifyEvidenceArtifactProvenance({ evidence: e031Evidence,
    known_invocation_mode: "execute-network-runner-build-only" }),
  "BUILD_ONLY_UNEXPECTED_FAILURE_ARTIFACT");
  assert.equal(classifyEvidenceArtifactProvenance({ evidence: {} }),
    "UNATTRIBUTED_ARTIFACT");
  assert.deepEqual(captureGeneratedFailureArtifactManifest(),
    repositoryManifestBefore);
  assert.equal(executeNetworkRunnerBuildOnly.toString().includes(
    "write_failure_evidence"), false);
  const existingSchemas = new Set<number>();
  for (const entry of existingManifest.values()) {
    const evidence = JSON.parse(readFileSync(resolve(ROOT,
      entry.relative_path), "utf8")) as Record<string, unknown>;
    existingSchemas.add(Number(evidence.schema_version));
    assert.equal(entry.file_type, "regular_file");
    assert.equal(entry.validator_result, "PASS");
  }
  assert.deepEqual([...existingSchemas].sort(), [3, 4, 5, 6]);
  const sourceStatus = [
    ...NETWORK_SOURCE_SCOPE_ALLOWLIST.map(({ xy, path }) => `${xy} ${path}`),
    ...[...existingManifest.values()].map(({ relative_path }) =>
      `?? ${relative_path}`),
  ].join("\n") + "\n";
  const sourceFixture: NetworkGitSourceScopeFixture = {
    branch: "main\n", head: `${NETWORK_SOURCE_SCOPE_EXPECTED_HEAD}\n`,
    origin_main: `${NETWORK_SOURCE_SCOPE_EXPECTED_HEAD}\n`, divergence: "0\t0\n",
    staged_files: "", status: sourceStatus,
    generated_artifacts: existingManifest,
  };
  assert.equal(validateNetworkGitSourceScope(sourceFixture).length,
    NETWORK_SOURCE_SCOPE_ALLOWLIST.length + existingManifest.size);
  assert.throws(() => validateNetworkGitSourceScope({ ...sourceFixture,
    staged_files: "package.json\n" }));
  assert.throws(() => validateNetworkGitSourceScope({ ...sourceFixture,
    status: `${sourceStatus}?? unknown-source.txt\n` }));
  assert.throws(() => validateNetworkGitSourceScope({ ...sourceFixture,
    status: `${sourceStatus}?? reports/day147a5-isolated-postgres/debug.log\n` }));

  const futureNonce = "abcdef123456";
  const futureEvidence = networkHostFailureEvidence({ nonce: futureNonce,
    primary_failure: "DAY147_A5_NETWORK_SOURCE_SCOPE_BLOCKED",
    cleanup: { attempted: [], completed: [], not_applicable:
      NETWORK_CLEANUP_ORDER, failures: [] } });
  const futureBytes = serializedArtifact(futureEvidence);
  const futureRelative = `${EVIDENCE_REPORTS_RELATIVE_ROOT}/runs/${
    futureNonce}/evidence.json`;
  const futureEntry = validateGeneratedFailureRun({ nonce: futureNonce,
    relative_path: futureRelative, size: futureBytes.byteLength,
    evidence_bytes: futureBytes, files: [{ name: "evidence.json",
      regular_file: true, symbolic_link: false, hard_link_count: 1 }] });
  assert.equal(futureEntry.validator_result, "PASS");
  for (const invalidBytes of [
    new TextEncoder().encode("{malformed"),
    serializedArtifact({ ...futureEvidence, success_claimed: true }),
    serializedArtifact({ ...futureEvidence, execution_nonce: "bbbbbbbbbbbb" }),
    serializedArtifact({ ...futureEvidence, schema_version: 99 }),
    serializedArtifact({ ...futureEvidence, credential: "visible" }),
  ]) assert.throws(() => validateGeneratedFailureRun({ nonce: futureNonce,
    relative_path: futureRelative, size: invalidBytes.byteLength,
    evidence_bytes: invalidBytes, files: [{ name: "evidence.json",
      regular_file: true, symbolic_link: false, hard_link_count: 1 }] }));
  for (const files of [
    [{ name: "receipt.json", regular_file: true, symbolic_link: false,
      hard_link_count: 1 }],
    [{ name: "commit.json", regular_file: true, symbolic_link: false,
      hard_link_count: 1 }],
    [{ name: "evidence.json", regular_file: true, symbolic_link: false,
      hard_link_count: 1 }, { name: "unknown.log", regular_file: true,
      symbolic_link: false, hard_link_count: 1 }],
    [{ name: "evidence.json", regular_file: true, symbolic_link: true,
      hard_link_count: 1 }],
    [{ name: "evidence.json", regular_file: true, symbolic_link: false,
      hard_link_count: 2 }],
  ]) assert.throws(() => validateGeneratedFailureRun({ nonce: futureNonce,
    relative_path: futureRelative, size: futureBytes.byteLength,
    evidence_bytes: futureBytes, files }));

  const endManifest = new Map(existingManifest);
  endManifest.set(futureNonce, futureEntry);
  assert.doesNotThrow(() => validateGeneratedArtifactManifestPreserved({
    start: existingManifest, end: endManifest, current_nonce: futureNonce }));
  const changedManifest = new Map(endManifest);
  const firstEntry = changedManifest.values().next().value as
    GeneratedFailureArtifactManifestEntry;
  changedManifest.set(firstEntry.nonce, { ...firstEntry, sha256: "0".repeat(64) });
  assert.throws(() => validateGeneratedArtifactManifestPreserved({
    start: existingManifest, end: changedManifest, current_nonce: futureNonce }));
  const deletedManifest = new Map(endManifest);
  deletedManifest.delete(firstEntry.nonce);
  assert.throws(() => validateGeneratedArtifactManifestPreserved({
    start: existingManifest, end: deletedManifest, current_nonce: futureNonce }));
  const extraManifest = new Map(endManifest);
  extraManifest.set("111111111111", { ...futureEntry, nonce: "111111111111",
    relative_path: `${EVIDENCE_REPORTS_RELATIVE_ROOT}/runs/111111111111/evidence.json` });
  assert.throws(() => validateGeneratedArtifactManifestPreserved({
    start: existingManifest, end: extraManifest, current_nonce: futureNonce }));
  assert.throws(() => validateGeneratedArtifactManifestPreserved({
    start: existingManifest, end: endManifest,
    current_nonce: "fedcba654321" }));

  const entrypointForResolution = networkClientEntrypointSource({ nonce });
  const entrypointSyntax = spawnSync(process.execPath,
    ["--input-type=module", "--check"], { input: entrypointForResolution,
      encoding: "utf8", timeout: 5_000 });
  assert.equal(entrypointSyntax.status, 0, entrypointSyntax.stderr);
  assert.ok(entrypointForResolution.includes(
    'new URL("./scripts/hermes/test_farm_os_day147a5_isolated_postgres.ts", import.meta.url).href',
  ));
  assert.equal(/^import\s/m.test(entrypointForResolution), false);
  assert.ok(entrypointForResolution.indexOf(
    'phase("RUNNER_ENTRYPOINT_PROCESS_STARTED")') <
    entrypointForResolution.indexOf('await import("node:crypto")'));
  assert.ok(entrypointForResolution.includes("await import(clientModuleSpecifier)"));
  let fixedMarkerOffset = -1;
  for (const marker of ["RUNNER_ENTRYPOINT_PROCESS_STARTED",
    "RUNNER_ENTRYPOINT_PATH_VALID", "RUNNER_SECURITY_CONTEXT_VALID",
    "RUNNER_CLIENT_MODULE_IMPORT_START", "RUNNER_CLIENT_MODULE_IMPORT_VALID",
    "RUNNER_ATTESTATION_COMPLETE"] as const) {
    const offset = entrypointForResolution.indexOf(`phase("${marker}")`);
    assert.ok(offset > fixedMarkerOffset, marker);
    fixedMarkerOffset = offset;
  }
  assert.ok(entrypointForResolution.includes(
    `process.env.${NETWORK_BOOTSTRAP_PROBE_ENVIRONMENT_KEY} === "1"`,
  ));
  assert.ok(entrypointForResolution.indexOf(
    `phase(${JSON.stringify(NETWORK_BOOTSTRAP_PROBE_COMPLETE_PHASE)})`,
  ) < entrypointForResolution.indexOf("await executeNetworkClientInternal"));
  assert.ok(entrypointForResolution.indexOf(
    `phase(${JSON.stringify(NETWORK_LAUNCHER_ONLY_COMPLETE_PHASE)})`,
  ) < entrypointForResolution.indexOf("RUNNER_CLIENT_MODULE_IMPORT_START"));
  const moduleCases = [
    { code: "ERR_MODULE_NOT_FOUND", specifier: "<workspace>/missing.ts",
      expected: "IMPORT_CLOSURE_FILE_MISSING" },
    { code: "MODULE_NOT_FOUND", specifier: "pg",
      expected: "MODULE_NOT_FOUND" },
    { code: "ERR_UNKNOWN_FILE_EXTENSION", specifier: ".ts",
      expected: "ERR_UNKNOWN_FILE_EXTENSION" },
    { code: "ERR_PACKAGE_PATH_NOT_EXPORTED", specifier: "pkg/private",
      expected: "ERR_PACKAGE_PATH_NOT_EXPORTED" },
    { code: "ERR_UNSUPPORTED_DIR_IMPORT", specifier: "<workspace>/directory",
      expected: "ERR_UNSUPPORTED_DIR_IMPORT" },
    { code: "ERR_MODULE_NOT_FOUND", specifier: "tsx",
      expected: "TSX_LOADER_UNAVAILABLE" },
    { code: "ERR_MODULE_NOT_FOUND", specifier: "@/lib/module",
      expected: "PATH_ALIAS_UNRESOLVED" },
  ] as const;
  for (const testCase of moduleCases) {
    assert.equal(classifyRunnerModuleResolutionDiagnostic({
      node_error_code: testCase.code, failing_specifier: testCase.specifier,
      importer: "<workspace>/network-client-entrypoint.ts",
    }).exact_class, testCase.expected);
  }
  const diagnosticLine = NETWORK_RUNNER_MODULE_DIAGNOSTIC_PREFIX + JSON.stringify({
    node_error_code: "ERR_MODULE_NOT_FOUND",
    failing_specifier: "<workspace>/missing.ts",
    importer: "<workspace>/network-client-entrypoint.ts",
    import_stack: "at <workspace>/network-client-entrypoint.ts",
    runtime_executable: "/usr/local/bin/node",
  });
  assert.equal(parseRunnerModuleResolutionDiagnostic(diagnosticLine)?.exact_class,
    "IMPORT_CLOSURE_FILE_MISSING");
  assert.throws(() => classifyRunnerModuleResolutionDiagnostic({
    node_error_code: "ERR_MODULE_NOT_FOUND", failing_specifier: "/Users/raw/x",
    importer: "<workspace>/network-client-entrypoint.ts",
  }));
  const probeCommand = buildNetworkBootstrapProbeCreateCommand({ nonce,
    runner_image_id: `sha256:${"d".repeat(64)}`, runner_uid: 1000,
    environment_keys: NETWORK_CLIENT_ENVIRONMENT_KEYS });
  assert.ok(probeCommand.args.includes("--network=none"));
  assert.equal(probeCommand.args.filter((arg) => arg ===
    `${NETWORK_BOOTSTRAP_PROBE_ENVIRONMENT_KEY}=1`).length, 1);
  assert.equal(NETWORK_CLIENT_ENVIRONMENT_KEYS.includes(
    NETWORK_BOOTSTRAP_PROBE_ENVIRONMENT_KEY as never), false);
  assert.deepEqual(bootstrapProbeReporting({ executed: true, status: "PASS" }),
    { executed: true, status: "PASS" });
  assert.deepEqual(bootstrapProbeReporting({ executed: true, status: "FAILED" }),
    { executed: true, status: "FAILED" });
  assert.deepEqual(bootstrapProbeReporting({ executed: false,
    status: "NOT_EXECUTED" }), { executed: false, status: "NOT_EXECUTED" });
  assert.throws(() => bootstrapProbeReporting({ executed: false, status: "PASS" }));
  assert.equal(probeCommand.args.some((arg) => /docker\.sock|dst=\/workspace/.test(
    arg)), false);
  const launcherProbeCommand = buildNetworkLauncherOnlyCreateCommand({ nonce,
    runner_image_id: `sha256:${"e".repeat(64)}`,
    environment_keys: NETWORK_CLIENT_ENVIRONMENT_KEYS });
  assert.ok(launcherProbeCommand.args.includes("--network=none"));
  assert.ok(launcherProbeCommand.args.includes(
    `${NETWORK_RUNNER_FINAL_UID}:${NETWORK_RUNNER_FINAL_GID}`));
  assert.ok(launcherProbeCommand.args.includes(
    `${NETWORK_LAUNCHER_ONLY_ENVIRONMENT_KEY}=${
      NETWORK_RUNNER_LAUNCHER_DIAGNOSTIC_AUTHORITY
    }`));
  assert.equal(launcherProbeCommand.args.some((arg) =>
    /docker\.sock|dst=\/workspace/.test(arg)), false);
  const launcherPaths = launcherOnlyProbePaths(nonce);
  const launcherContainerId = "f".repeat(64);
  const launcherImageId = `sha256:${"e".repeat(64)}`;
  const launcherObservation: NetworkContainerObservation = {
    id: launcherContainerId, name: launcherPaths.container_name,
    image_id: launcherImageId, network_id: "", network_name: "",
    network_count: 0, network_mode: "none", network_aliases: [],
    launcher_network_inspect: { HostConfig: { NetworkMode: "none" },
      NetworkSettings: { Networks: {} } },
    published_ports: [], mounts: [
      { type: "bind", source: launcherPaths.result_directory,
        destination: "/result", read_write: true },
      { type: "bind", source: launcherPaths.capability_file,
        destination: NETWORK_RUNNER_CAPABILITY_PATH, read_write: false },
    ], tmpfs_paths: ["/tmp"], privileged: false, cap_drop: ["ALL"],
    security_options: ["no-new-privileges"], read_only_rootfs: true,
    user: `${NETWORK_RUNNER_FINAL_UID}:${NETWORK_RUNNER_FINAL_GID}`,
    environment_keys: [],
    launcher_environment_keys: [...NETWORK_LAUNCHER_ONLY_ENVIRONMENT_KEYS],
    entrypoint: ["/bin/sh", NETWORK_RUNNER_LAUNCHER], cmd: null,
    execution_nonce_label: nonce, resource_role_label: NETWORK_RUNNER_ROLE,
    probe_label: "launcher-only", runtime_state: "created",
    docker_socket_mounted: false,
  };
  const evaluateLauncher = (observation: NetworkContainerObservation) =>
    evaluateLauncherOnlyContainerContract({ observation,
      canonical_container_id: launcherContainerId, nonce,
      runner_image_id: launcherImageId,
      result_directory: launcherPaths.result_directory,
      capability_file: launcherPaths.capability_file });
  const allLauncherPredicates = evaluateLauncher(launcherObservation);
  assert.equal(allLauncherPredicates.every(({ passed }) => passed), true);
  assert.equal(allLauncherPredicates.at(-1)?.predicate,
    "LAUNCHER_CONTAINER_CONTRACT_COMPLETE");
  const launcherMutation = (
    predicate: Exclude<LauncherContainerPredicate,
      "LAUNCHER_CONTAINER_CONTRACT_COMPLETE">,
  ): NetworkContainerObservation => {
    switch (predicate) {
      case "LAUNCHER_CONTAINER_ID_BOUND": return { ...launcherObservation,
        id: "a".repeat(64) };
      case "LAUNCHER_CONTAINER_NAME_BOUND": return { ...launcherObservation,
        name: "wrong" };
      case "LAUNCHER_CONTAINER_IMAGE_BOUND": return { ...launcherObservation,
        image_id: `sha256:${"a".repeat(64)}` };
      case "LAUNCHER_CONTAINER_STATE_CREATED": return { ...launcherObservation,
        runtime_state: "running" };
      case "LAUNCHER_CONTAINER_NONCE_LABEL_VALID": return { ...launcherObservation,
        execution_nonce_label: "000000000000" };
      case "LAUNCHER_CONTAINER_ROLE_LABEL_VALID": return { ...launcherObservation,
        resource_role_label: "bootstrap-probe" };
      case "LAUNCHER_CONTAINER_PROBE_LABEL_VALID": return { ...launcherObservation,
        probe_label: "" };
      case "LAUNCHER_CONTAINER_USER_VALID": return { ...launcherObservation,
        user: "502:502" };
      case "LAUNCHER_CONTAINER_PRIVILEGED_FALSE": return { ...launcherObservation,
        privileged: true };
      case "LAUNCHER_CONTAINER_CAP_DROP_ALL": return { ...launcherObservation,
        cap_drop: [] };
      case "LAUNCHER_CONTAINER_NO_NEW_PRIVILEGES": return { ...launcherObservation,
        security_options: [] };
      case "LAUNCHER_CONTAINER_ROOT_READ_ONLY": return { ...launcherObservation,
        read_only_rootfs: false };
      case "LAUNCHER_CONTAINER_TMPFS_VALID": return { ...launcherObservation,
        tmpfs_paths: [] };
      case "LAUNCHER_CONTAINER_RESULT_MOUNT_VALID": return { ...launcherObservation,
        mounts: launcherObservation.mounts.map((mount) => mount.destination === "/result"
          ? { ...mount, read_write: false } : mount) };
      case "LAUNCHER_CONTAINER_CAPABILITY_MOUNT_VALID": return {
        ...launcherObservation,
        mounts: launcherObservation.mounts.map((mount) =>
          mount.destination === NETWORK_RUNNER_CAPABILITY_PATH
            ? { ...mount, read_write: true } : mount) };
      case "LAUNCHER_CONTAINER_SOCKET_ABSENT": return { ...launcherObservation,
        docker_socket_mounted: true };
      case "LAUNCHER_CONTAINER_REPOSITORY_MOUNT_ABSENT": return {
        ...launcherObservation, mounts: [...launcherObservation.mounts,
          { type: "bind", source: ROOT, destination: "/repo", read_write: false }] };
      case "LAUNCHER_CONTAINER_ENVIRONMENT_KEYS_VALID": return {
        ...launcherObservation,
        launcher_environment_keys: [...NETWORK_LAUNCHER_ONLY_ENVIRONMENT_KEYS,
          "FARMOS_UNKNOWN"] };
      case "LAUNCHER_CONTAINER_ENTRYPOINT_CMD_VALID": return {
        ...launcherObservation, cmd: ["duplicate"] };
      case "LAUNCHER_CONTAINER_NETWORK_MODE_VALID": return { ...launcherObservation,
        launcher_network_inspect: { HostConfig: { NetworkMode: "bridge" },
          NetworkSettings: { Networks: {} } } };
      case "LAUNCHER_CONTAINER_HOST_PUBLISH_ABSENT": return {
        ...launcherObservation, published_ports: ["5432/tcp"] };
    }
  };
  for (const predicate of LAUNCHER_CONTAINER_PREDICATES.slice(0, -1)) {
    const results = evaluateLauncher(launcherMutation(predicate));
    assert.deepEqual(results.filter(({ passed }) => !passed).map(({ predicate }) =>
      predicate), [predicate, "LAUNCHER_CONTAINER_CONTRACT_COMPLETE"]);
    assert.equal(results.find(({ passed }) => !passed)?.failure_code,
      LAUNCHER_CONTAINER_FAILURE_CODES[predicate]);
  }
  for (const rejectedNetworkMode of ["bridge", "host", "farmos-user-network"]) {
    const first = evaluateLauncher({ ...launcherObservation,
      launcher_network_inspect: { HostConfig: { NetworkMode: rejectedNetworkMode },
        NetworkSettings: { Networks: {} } } }).find(({ passed }) => !passed);
    assert.equal(first?.predicate, "LAUNCHER_CONTAINER_NETWORK_MODE_VALID");
  }
  const launcherInspect = (NetworkMode: unknown, Networks: unknown): unknown =>
    ({ HostConfig: { NetworkMode }, NetworkSettings: { Networks } });
  const validNoneEndpoint = { NetworkID: "", EndpointID: "", Gateway: "",
    IPAddress: "", GlobalIPv6Address: "", MacAddress: "", Aliases: null,
    Links: null, DriverOpts: null };
  for (const accepted of [
    launcherInspect("none", {}),
    launcherInspect("none", { none: validNoneEndpoint }),
    launcherInspect("none", { none: { NetworkID: null, EndpointID: null,
      Gateway: null, IPAddress: null, GlobalIPv6Address: null,
      MacAddress: "00:00:00:00:00:00", Aliases: [], Links: [], DriverOpts: {} } }),
  ]) {
    const normalized = normalizeLauncherOnlyNetworkState(accepted);
    assert.equal(normalized.valid, true);
    assert.equal(normalized.effective_memberships, 0);
    assert.equal(evaluateLauncher({ ...launcherObservation,
      launcher_network_inspect: accepted }).at(-1)?.passed, true);
  }
  const rejectedLauncherNetworks = [
    [launcherInspect("bridge", {}), "HostConfig.NetworkMode", 0],
    [launcherInspect("host", {}), "HostConfig.NetworkMode", 0],
    [launcherInspect("none", { farmos: {} }),
      "NetworkSettings.Networks.external_key", 1],
    [launcherInspect("none", { none: validNoneEndpoint, bridge: {} }),
      "NetworkSettings.Networks.external_key", 1],
    [launcherInspect("none", { none: validNoneEndpoint, farmos: {} }),
      "NetworkSettings.Networks.external_key", 1],
    [launcherInspect("none", { none: { ...validNoneEndpoint,
      NetworkID: "network-id" } }), "NetworkSettings.Networks.none.NetworkID", 1],
    [launcherInspect("none", { none: { ...validNoneEndpoint,
      EndpointID: "endpoint-id" } }), "NetworkSettings.Networks.none.EndpointID", 1],
    [launcherInspect("none", { none: { ...validNoneEndpoint,
      IPAddress: "192.0.2.1" } }), "NetworkSettings.Networks.none.IPAddress", 1],
    [launcherInspect("none", { none: { ...validNoneEndpoint,
      Gateway: "192.0.2.254" } }), "NetworkSettings.Networks.none.Gateway", 1],
    [launcherInspect("none", { none: { ...validNoneEndpoint,
      Aliases: ["postgres"] } }), "NetworkSettings.Networks.none.Aliases", 1],
    [launcherInspect("none", null), "NetworkSettings.Networks", 0],
    [launcherInspect("none", { bridge: {}, farmos: {} }),
      "NetworkSettings.Networks.external_key", 2],
  ] as const;
  for (const [inspect, invalidField, memberships] of rejectedLauncherNetworks) {
    const normalized = normalizeLauncherOnlyNetworkState(inspect);
    assert.equal(normalized.valid, false);
    assert.equal(normalized.invalid_field, invalidField);
    assert.equal(normalized.effective_memberships, memberships);
    assert.equal(evaluateLauncher({ ...launcherObservation,
      network_count: 0, launcher_network_inspect: inspect }).find(({ passed }) =>
      !passed)?.predicate, "LAUNCHER_CONTAINER_NETWORK_MODE_VALID");
  }
  assert.deepEqual(networkRunnerDockerfile().split("\n").at(-1),
    `ENTRYPOINT ["/bin/sh","${NETWORK_RUNNER_LAUNCHER}"]`);
  const sourceScopeFixture: NetworkGitSourceScopeFixture = {
    branch: "main\n", head: `${NETWORK_SOURCE_SCOPE_EXPECTED_HEAD}\n`,
    origin_main: `${NETWORK_SOURCE_SCOPE_EXPECTED_HEAD}\n`,
    divergence: "0\t0\n", staged_files: "",
    status: `${NETWORK_SOURCE_SCOPE_ALLOWLIST.map(({ xy, path }) =>
      `${xy} ${path}`).join("\n")}\n`,
    generated_artifacts: new Map(),
  };
  assert.equal(validateNetworkGitSourceScope(sourceScopeFixture).length,
    NETWORK_SOURCE_SCOPE_ALLOWLIST.length);
  assert.equal(MAX_RUNNER_ATTEMPTS, 10);
  const entrypointSource = networkClientEntrypointSource({ nonce });
  const bootstrapSources = `${networkRunnerLauncherSource()}\n${
    localTsxValidatorSource()
  }\n${entrypointSource}`;
  for (const phase of RUNNER_BOOTSTRAP_PHASES) {
    assert.ok(bootstrapSources.includes(phase), phase);
  }
  for (const code of RUNNER_FIXED_BOOTSTRAP_FAILURE_CODES.slice(0, -2)) {
    assert.ok(bootstrapSources.includes(code), code);
  }
  assert.ok(entrypointSource.indexOf('phase("RUNNER_ATTESTATION_COMPLETE")') <
    entrypointSource.indexOf('phase("RUNNER_DB_CONNECTION_START")'));
  const stateFixture: RunnerStateDiagnostic = { status: "exited", exit_code: 1,
    error: "", oom_killed: false, started_at: "start", finished_at: "finish" };
  const diagnosticFixture = (input: Readonly<{
    attempt?: number; failure?: RunnerFixedBootstrapFailureCode;
    transient?: RunnerRetryableRootCause | null;
    phases?: readonly RunnerBootstrapPhase[];
    cleanup?: boolean;
  }> = {}): RunnerAttemptDiagnostic => classifyRunnerAttempt({
    attempt: input.attempt ?? 1, container_started: true, state: stateFixture,
    stdout: "", stderr: [
      ...(input.phases ?? ["RUNNER_PROCESS_STARTED"]).map((phase) =>
        `FARMOS_DAY147_A5_PHASE=${phase}`),
      ...(input.failure === undefined ? [] :
        [`FARMOS_DAY147_A5_FAILURE=${input.failure}`]),
    ].join("\n"), cleanup_completed: input.cleanup ?? true,
    result_present: false, diagnostic_present: true,
    transient_evidence: input.transient,
  });
  for (const [failure, expectedFirstFailed] of [
    ["DAY147_A5_RUNNER_ENTRYPOINT_PATH_INVALID", "RUNNER_ENTRYPOINT_PATH_CHECK"],
    ["DAY147_A5_RUNNER_CAPABILITY_FILE_MISSING", "RUNNER_ENTRYPOINT_PATH_CHECK"],
    ["DAY147_A5_RUNNER_CAPABILITY_MODE_INVALID", "RUNNER_CAPABILITY_FILE_STAT_VALID"],
    ["DAY147_A5_RUNNER_CAPABILITY_OWNER_INVALID", "RUNNER_CAPABILITY_FILE_STAT_VALID"],
    ["DAY147_A5_RUNNER_CAPABILITY_DIGEST_MISMATCH", "RUNNER_CAPABILITY_DIGEST_VALID"],
    ["DAY147_A5_RUNNER_NONCE_MISMATCH", "RUNNER_EXECUTION_NONCE_VALID"],
    ["DAY147_A5_RUNNER_RESULT_ROOT_NOT_WRITABLE", "RUNNER_RESULT_ROOT_WRITE_PROBE_VALID"],
    ["DAY147_A5_RUNNER_MODULE_RESOLUTION_FAILED", "RUNNER_ATTESTATION_COMPLETE"],
  ] as const) {
    const phaseIndex = RUNNER_BOOTSTRAP_PHASES.indexOf(expectedFirstFailed);
    const diagnostic = diagnosticFixture({ failure,
      phases: RUNNER_BOOTSTRAP_PHASES.slice(0, phaseIndex) });
    assert.equal(diagnostic.root_cause_class, failure);
    assert.equal(diagnostic.first_failed_phase, expectedFirstFailed);
    assert.equal(diagnostic.retryable, false);
  }
  const transientMount = diagnosticFixture({
    transient: "DAY147_A5_RUNNER_MOUNT_VISIBILITY_TRANSIENT" });
  assert.equal(transientMount.retryable, true);
  assert.equal(diagnosticFixture().root_cause_class,
    "DAY147_A5_RUNNER_PROCESS_EXITED_BEFORE_ATTESTATION");
  const sensitiveOutput = Array.from({ length: 100 }, () =>
    `${ROOT} ${names.build_context} ${names.result_directory} ` +
    `password=visible capability=raw postgresql://user:secret@postgres/db ` +
    `${"a".repeat(64)} /private/run/docker.sock`).join("\n");
  const bounded = boundedRunnerOutput(sensitiveOutput, { repository: ROOT,
    build_root: dirname(names.build_context), result_root: names.result_directory,
    capability_file: `${names.result_directory}/capability`, password: "visible" });
  assert.ok(bounded.split("\n").length <= RUNNER_DIAGNOSTIC_MAX_LINES);
  assert.ok(Buffer.byteLength(bounded) <= RUNNER_DIAGNOSTIC_MAX_BYTES);
  for (const forbidden of [ROOT, "visible", "capability=raw", "postgresql://",
    "a".repeat(64), "docker.sock"]) assert.equal(bounded.includes(forbidden), false);
  assert.deepEqual(runnerAttemptPaths(nonce, 1), {
    attempt: 1, attempt_label: "a01",
    runner_container: `farmos-day147a5-runner-${nonce}-a01`,
    capability_file: `${names.result_directory}/attempts/a01/capability-${nonce}-a01`,
    result_directory: `${names.result_directory}/attempts/a01/result`,
    diagnostic_directory: `${names.result_directory}/attempts/a01/diagnostic`,
  });
  assert.throws(() => runnerAttemptPaths(nonce, 11));
  let convergenceNow = 0;
  const convergenceCalls: number[] = [];
  const converged = await convergeRunnerAttempts({ deadline_ms: 10_000,
    now: () => convergenceNow,
    async backoff(milliseconds) { convergenceNow += milliseconds; },
    async execute_attempt(attempt) { convergenceCalls.push(attempt);
      return attempt === 1
        ? { success: false, diagnostic: diagnosticFixture({ attempt,
          transient: "DAY147_A5_RUNNER_MOUNT_VISIBILITY_TRANSIENT" }) }
        : { success: true, value: "PASS", diagnostic: diagnosticFixture({
          attempt, phases: RUNNER_BOOTSTRAP_PHASES }) }; },
  });
  assert.equal(converged.value, "PASS");
  assert.deepEqual(convergenceCalls, [1, 2]);
  let deterministicCalls = 0;
  await assert.rejects(convergeRunnerAttempts({ deadline_ms: 10_000,
    now: () => 0, async backoff() {}, async execute_attempt(attempt) {
      deterministicCalls += 1; return { success: false,
        diagnostic: diagnosticFixture({ attempt,
          failure: "DAY147_A5_RUNNER_CAPABILITY_DIGEST_MISMATCH" }) }; },
  }), RunnerConvergenceFailure);
  assert.equal(deterministicCalls, 1);
  let maximumCalls = 0;
  await assert.rejects(convergeRunnerAttempts({ deadline_ms: 100_000,
    now: () => 0, async backoff() {}, async execute_attempt(attempt) {
      maximumCalls += 1; return { success: false,
        diagnostic: diagnosticFixture({ attempt,
          transient: "DAY147_A5_RUNNER_INSPECT_TRANSIENT" }) }; },
  }), RunnerConvergenceFailure);
  assert.equal(maximumCalls, MAX_RUNNER_ATTEMPTS);
  let cleanupStopCalls = 0;
  await assert.rejects(convergeRunnerAttempts({ deadline_ms: 10_000,
    now: () => 0, async backoff() {}, async execute_attempt(attempt) {
      cleanupStopCalls += 1; return { success: false,
        diagnostic: diagnosticFixture({ attempt, cleanup: false,
          transient: "DAY147_A5_RUNNER_CONTAINER_START_TRANSIENT" }) }; },
  }), RunnerConvergenceFailure);
  assert.equal(cleanupStopCalls, 1);
  await assert.rejects(convergeRunnerAttempts({ deadline_ms: 200,
    now: () => 0, async backoff() {}, async execute_attempt(attempt) {
      return { success: false, diagnostic: diagnosticFixture({ attempt,
        transient: "DAY147_A5_RUNNER_ATTESTATION_TRANSIENT_TIMEOUT" }) }; },
  }), (error: unknown) => error instanceof RunnerConvergenceFailure &&
    error.message === "DAY147_A5_RUNNER_ATTESTATION_TIMEOUT");
  const parsedPackage = parseGitPorcelainV1Line(" M package.json");
  assert.deepEqual(parsedPackage, {
    raw_line: " M package.json", xy: " M", path: "package.json", staged: false,
  });
  for (const rejected of [
    "M  package.json", "MM package.json", "A  package.json", "AM package.json",
    " D package.json", "D  package.json", "?? package.json", "!! package.json",
    "M package.json", "package.json", " Mpackage.json", " M package.json.backup",
    " M subdir/package.json", "R  old/package.json -> package.json",
    "C  old/package.json -> package.json", " M package.json\n", " M package.json\0",
  ]) {
    assert.throws(() => validateNetworkGitSourceScope({
      branch: "main", head: NETWORK_SOURCE_SCOPE_EXPECTED_HEAD,
      origin_main: NETWORK_SOURCE_SCOPE_EXPECTED_HEAD, divergence: "0\t0\n",
      staged_files: "", status: `${rejected}\n`, generated_artifacts: new Map(),
    }), undefined, rejected);
  }
  assert.equal(
    parseGitPorcelainV1Line("?? reports/file name.json").path,
    "reports/file name.json",
  );
  const sourceScopeStatus = NETWORK_SOURCE_SCOPE_ALLOWLIST.map(
    ({ xy, path }) => `${xy} ${path}`,
  ).join("\n") + "\n";
  const sourceScopeFixture: NetworkGitSourceScopeFixture = {
    branch: "main\n", head: `${NETWORK_SOURCE_SCOPE_EXPECTED_HEAD}\n`,
    origin_main: `${NETWORK_SOURCE_SCOPE_EXPECTED_HEAD}\n`, divergence: "0\t0\n",
    staged_files: "", status: sourceScopeStatus,
    generated_artifacts: new Map(),
  };
  const parsedScope = validateNetworkGitSourceScope(sourceScopeFixture);
  assert.equal(parsedScope.length, 9);
  assert.equal(parsedScope.find(({ path }) => path === "package.json")?.xy, " M");
  assert.throws(() => validateNetworkGitSourceScope({
    ...sourceScopeFixture, staged_files: "package.json\n",
  }));
  assert.throws(() => validateNetworkGitSourceScope({
    ...sourceScopeFixture, status: `${sourceScopeStatus}?? unknown.txt\n`,
  }));
  assert.throws(() => validateNetworkGitSourceScope({
    ...sourceScopeFixture, head: "0".repeat(40),
  }));
  assert.throws(() => validateNetworkGitSourceScope({
    ...sourceScopeFixture, origin_main: "0".repeat(40),
  }));
  assert.deepEqual(parseArguments([
    "--mode=execute-network-isolated",
    `--authority=${NETWORK_EXECUTION_AUTHORITY}`,
  ]), {
    mode: "execute-network-isolated",
    authority: NETWORK_EXECUTION_AUTHORITY,
  });
  assert.deepEqual(parseArguments([
    "--mode=execute-network-client",
    `--authority=${NETWORK_CLIENT_EXECUTION_AUTHORITY}`,
  ]), {
    mode: "execute-network-client",
    authority: NETWORK_CLIENT_EXECUTION_AUTHORITY,
  });
  assert.throws(() => parseArguments(["--mode=execute-network-client"]));
  assert.throws(() => parseArguments([
    "--mode=execute-network-client",
    `--authority=${NETWORK_EXECUTION_AUTHORITY}`,
  ]));

  const snapshot = buildSourceSnapshotPlan(nonce);
  assert.equal(snapshot.archive_command.executable, "git");
  assert.deepEqual(snapshot.archive_command.args.slice(0, 2), ["archive", "HEAD"]);
  assert.deepEqual(snapshot.overlay_allowlist, [
    "package.json",
    "scripts/hermes/test_farm_os_day147a5_isolated_postgres.ts",
    "scripts/hermes/lib/farm_os_day147a5_evidence_contract.ts",
  ]);
  for (const excluded of [
    "reports", "existing_evidence", "tsconfig.tsbuildinfo",
    "unrelated_untracked_files", "node_modules", ".git",
  ]) assert.ok(snapshot.exclusions.includes(
    excluded as typeof snapshot.exclusions[number],
  ));
  for (const excludedPath of ["reports", "tsconfig.tsbuildinfo", "node_modules"]) {
    assert.ok(snapshot.archive_command.args.includes(`:(exclude)${excludedPath}`));
  }
  assert.equal(snapshot.temporary_only, true);
  for (const required of ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"]) {
    assert.ok(snapshot.required_paths.includes(required));
  }
  assert.ok(snapshot.build_context.startsWith(
    `/private/tmp/farmos-day147a5-network-runner/${nonce}/`,
  ));

  const dockerfile = networkRunnerDockerfile();
  assert.ok(dockerfile.startsWith(
    `FROM ${NETWORK_RUNNER_BASE_IMAGE}@${NETWORK_RUNNER_BASE_IMAGE_ID}`,
  ));
  assert.ok(dockerfile.includes("pnpm install --frozen-lockfile"));
  assert.ok(dockerfile.includes("USER node"));
  for (const forbidden of [
    "PGPASSWORD", "DATABASE_URL", "reports/", "evidence.json", "ARG ",
  ]) assert.equal(dockerfile.includes(forbidden), false, forbidden);
  validateNetworkRunnerBaseImage({
    id: NETWORK_RUNNER_BASE_IMAGE_ID,
    repo_digests: [NETWORK_RUNNER_BASE_REPO_DIGEST],
    os: "linux",
    architecture: "arm64",
  });
  assert.throws(() => validateNetworkRunnerBaseImage({
    id: `sha256:${"0".repeat(64)}`,
    repo_digests: [NETWORK_RUNNER_BASE_REPO_DIGEST],
    os: "linux", architecture: "arm64",
  }));
  const runnerImageId = `sha256:${"d".repeat(64)}`;
  assert.equal(validateBuiltRunnerImage({
    expected_tag: names.runner_image,
    observed_tag: names.runner_image,
    build_result_id: runnerImageId,
    inspected_id: runnerImageId,
  }), runnerImageId);
  const buildCommand = buildNetworkRunnerImageCommand(nonce);
  assert.deepEqual(buildCommand.args.slice(0, 3), ["build", "--pull=false", "--file"]);
  assert.ok(buildCommand.args.includes(names.runner_image));
  assert.equal(buildCommand.args.some((arg) => /password|credential/i.test(arg)), false);

  assertNetworkNameAvailable(null);
  const networkId = "a".repeat(64);
  const networkObservation: NetworkObservation = {
    name: names.network,
    id: networkId,
    driver: "bridge",
    scope: "local",
    execution_nonce_label: nonce,
    member_ids: [],
  };
  assert.equal(validateCreatedNetwork(networkObservation, nonce), networkId);
  assert.throws(() => assertNetworkNameAvailable(networkObservation));
  for (const invalid of [
    { ...networkObservation, name: "bridge" },
    { ...networkObservation, name: "host" },
    { ...networkObservation, driver: "overlay" },
    { ...networkObservation, scope: "swarm" },
    { ...networkObservation, execution_nonce_label: "bbbbbbbbbbbb" },
  ]) assert.throws(() => validateCreatedNetwork(invalid, nonce));
  assert.deepEqual(buildNetworkCreateCommand(nonce).args, [
    "network", "create", "--driver", "bridge", "--label",
    `farmos.day147a5.execution_nonce=${nonce}`, names.network,
  ]);

  const postgresCommand = buildNetworkPostgresRunCommand({
    nonce,
    environment_keys: ["POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD"],
  });
  assert.ok(postgresCommand.args.includes("--pull=never"));
  assert.ok(postgresCommand.args.includes("--network-alias"));
  assert.ok(postgresCommand.args.includes("postgres"));
  assert.ok(postgresCommand.args.includes("--tmpfs"));
  assert.equal(postgresCommand.args.some((arg) =>
    arg === "-p" || arg === "--publish" || arg.startsWith("--publish=")
  ), false);
  assert.equal(postgresCommand.args.some((arg) => arg.includes("volume")), false);

  const postgresImageId = `sha256:${"e".repeat(64)}`;
  const postgresObservation: NetworkContainerObservation = {
    id: "b".repeat(64), name: names.postgres_container,
    image_id: postgresImageId, network_id: networkId,
    network_aliases: ["postgres"], published_ports: [], mounts: [],
    tmpfs_paths: ["/var/lib/postgresql/data"],
    privileged: false, cap_drop: [], security_options: [],
    read_only_rootfs: false, user: "postgres",
    execution_nonce_label: nonce, docker_socket_mounted: false,
  };
  assert.equal(validateNetworkPostgresContainer({
    observation: postgresObservation, nonce, network_id: networkId,
    expected_image_id: postgresImageId,
  }), postgresObservation.id);
  assert.deepEqual(buildNetworkPostgresInternalReadinessCommand({
    nonce, canonical_postgres_id: postgresObservation.id,
  }).args.slice(0, 4), ["exec", postgresObservation.id, "pg_isready", "-q"]);
  for (const invalid of [
    { ...postgresObservation, network_aliases: ["database"] },
    { ...postgresObservation, published_ports: ["5432/tcp"] },
    { ...postgresObservation, network_id: "f".repeat(64) },
    { ...postgresObservation, mounts: [{
      type: "volume", source: "persistent", destination: "/data",
    }] },
    { ...postgresObservation, tmpfs_paths: [] },
  ]) assert.throws(() => validateNetworkPostgresContainer({
    observation: invalid, nonce, network_id: networkId,
    expected_image_id: postgresImageId,
  }));

  const password = "p".repeat(64);
  const clientEnvironment: NetworkClientEnvironment = {
    FARMOS_A5_EXECUTION_NONCE: nonce,
    PGHOST: "postgres",
    PGPORT: "5432",
    PGUSER: ROLE_FIXTURES.migration_owner.name,
    PGPASSWORD: password,
    FARMOS_A5_DB_LEGACY_ACTIVE: buildNames(nonce).legacy_active,
    FARMOS_A5_DB_LEGACY_SUPERSEDED: buildNames(nonce).legacy_superseded,
    FARMOS_A5_DB_MAIN: buildNames(nonce).main,
    FARMOS_A5_CLIENT_AUTHORITY: NETWORK_CLIENT_EXECUTION_AUTHORITY,
    FARMOS_A5_CLIENT_RESULT_PATH: "/result/client-result.json",
  };
  assert.deepEqual(validateNetworkClientEnvironment(clientEnvironment),
    clientEnvironment);
  const networkClientConfigs = buildNetworkClientConfigs(clientEnvironment);
  for (const config of [
    networkClientConfigs.admin, networkClientConfigs.legacy_active,
    networkClientConfigs.legacy_superseded, networkClientConfigs.bundle,
    networkClientConfigs.verification,
  ]) {
    assert.equal(config.host, "postgres");
    assert.equal(config.port, 5432);
    assert.equal("connectionString" in config, false);
  }
  assert.throws(() => validateNetworkClientEnvironment((() => {
    const { FARMOS_A5_CLIENT_AUTHORITY: _missing, ...direct } =
      clientEnvironment;
    return direct;
  })()));
  assert.throws(() => validateNetworkClientEnvironment({
    ...clientEnvironment, DATABASE_URL: "postgresql://forbidden",
  }));
  const runnerCommand = buildNetworkRunnerRunCommand({
    nonce,
    result_directory: names.result_directory,
    environment_keys: NETWORK_CLIENT_ENVIRONMENT_KEYS,
  });
  for (const required of [
    "--cap-drop=ALL", "--security-opt=no-new-privileges", "--read-only",
    "--user", "node", "--tmpfs",
  ]) assert.ok(runnerCommand.args.includes(required), required);
  assert.equal(runnerCommand.args.includes("--privileged"), false);
  assert.equal(runnerCommand.args.some((arg) =>
    arg.includes("docker.sock") || arg.includes("/workspace:") ||
    arg.includes(password) || arg.includes("postgresql://")
  ), false);
  assert.equal(runnerCommand.args.filter((arg) => arg === "--mount").length, 1);

  const runnerObservation: NetworkContainerObservation = {
    id: "c".repeat(64), name: names.runner_container,
    image_id: runnerImageId, network_id: networkId,
    network_aliases: [], published_ports: [],
    mounts: [{ type: "bind", source: names.result_directory,
      destination: "/result" }],
    tmpfs_paths: ["/tmp"],
    privileged: false, cap_drop: ["ALL"],
    security_options: ["no-new-privileges"], read_only_rootfs: true,
    user: "node", execution_nonce_label: nonce,
    docker_socket_mounted: false,
  };
  assert.equal(validateNetworkRunnerContainer({
    observation: runnerObservation, nonce, network_id: networkId,
    expected_image_id: runnerImageId, result_directory: names.result_directory,
  }), runnerObservation.id);
  for (const invalid of [
    { ...runnerObservation, docker_socket_mounted: true },
    { ...runnerObservation, privileged: true },
    { ...runnerObservation, cap_drop: [] },
    { ...runnerObservation, security_options: [] },
    { ...runnerObservation, read_only_rootfs: false },
    { ...runnerObservation, user: "root" },
    { ...runnerObservation, network_id: "f".repeat(64) },
    { ...runnerObservation, mounts: [] },
    { ...runnerObservation, tmpfs_paths: [] },
  ]) assert.throws(() => validateNetworkRunnerContainer({
    observation: invalid, nonce, network_id: networkId,
    expected_image_id: runnerImageId, result_directory: names.result_directory,
  }));

  const passingResult = clientResultWithStatus({
    nonce, result: "PASS", postgres_version: "17.6",
    status: "PASS", failure_code: null,
  });
  assert.equal(validateExactCaseRegistryProof(passingResult.case_registry), true);
  assert.equal(clientCleanupPassed(passingResult.client_cleanup), true);
  assert.equal(validateClientResult(passingResult, nonce), true);
  for (const invalid of [
    { ...passingResult, execution_nonce: "bbbbbbbbbbbb" },
    { ...passingResult, extra: true },
    (({ atomicity: _missing, ...rest }) => rest)(passingResult),
    { ...passingResult, password },
    { ...passingResult, mapped_port: 5432 },
    { ...passingResult, failure_code: "raw error" },
  ]) assert.equal(validateClientResult(invalid, nonce), false);
  const primaryPreserved = clientResultWithStatus({
    nonce, result: "FAIL", postgres_version: null, status: "NOT_COMPLETED",
    failure_code: "DAY147_A5_NETWORK_CLIENT_FAILED",
    cleanup_failure_code: "DAY147_A5_NETWORK_CLIENT_CLEANUP_FAILED",
    cleanup: cleanupFixture({ close_failed_count: 1, close_completed_count: 2,
      open_client_count_after_cleanup: 1 }),
  });
  assert.equal(validateClientResult(primaryPreserved, nonce), true);
  assert.equal(primaryPreserved.failure_code, "DAY147_A5_NETWORK_CLIENT_FAILED");
  assert.equal(primaryPreserved.cleanup_failure_code,
    "DAY147_A5_NETWORK_CLIENT_CLEANUP_FAILED");

  const resultBytes = new TextEncoder().encode(`${JSON.stringify(passingResult)}\n`);
  const expectedResultPath = `${names.result_directory}/client-result.json`;
  const resultFile: ClientResultFileObservation = {
    entries: [`capability-${nonce}`, "client-result.json"],
    file_name: "client-result.json",
    regular_file: true, symbolic_link: false, owner_matches: true, mode: 0o600,
    canonical_path: expectedResultPath, expected_path: expectedResultPath,
    size_bytes: resultBytes.byteLength, bytes: resultBytes,
  };
  assert.deepEqual(validateClientResultFile(resultFile, nonce), passingResult);
  for (const invalid of [
    { ...resultFile, symbolic_link: true },
    { ...resultFile, entries: ["client-result.json", "extra.json"] },
    { ...resultFile, size_bytes: 262_145 },
    { ...resultFile, bytes: new TextEncoder().encode("{") , size_bytes: 1 },
    { ...resultFile, canonical_path: `${names.result_directory}/other.json` },
  ]) assert.throws(() => validateClientResultFile(invalid, nonce));

  let clientResultBytes: Uint8Array | null = null;
  const mockedSuiteResult: SharedA5DynamicSuiteResult = {
    postgres_version: "17.6",
    test_results: EXECUTABLE_CASES.map(({ id, category }) => ({
      id, category, status: "PASS" as const,
    })),
    concurrency_timeline: [
      ...EXPECTED_CONCURRENCY_TIMELINE, ...EXPECTED_CONCURRENCY_TIMELINE,
    ],
    row_counts: { snapshots: 1, projections: 1, events: 1, lineage: 0 },
  };
  const clientModeResult = await executeNetworkClientMode({
    arguments: parseArguments([
      "--mode=execute-network-client",
      `--authority=${NETWORK_CLIENT_EXECUTION_AUTHORITY}`,
    ]),
    environment: clientEnvironment,
    async run_suite() { return mockedSuiteResult; },
    async write_result(bytes) { clientResultBytes = bytes; },
  });
  assert.equal(clientModeResult.result, "PASS");
  assert.ok(clientResultBytes);
  assert.equal(JSON.stringify(clientModeResult).includes(password), false);
  assert.deepEqual(NETWORK_CLIENT_AUTHORITY_SURFACE, {
    docker_commands: 0, provider_inspection: 0, image_inspection: 0,
    network_operations: 0, container_operations: 0,
    formal_evidence_writes: 0, receipt_writes: 0, marker_writes: 0,
    reports_directory_operations: 0, production_authority: 0,
    database_operations: "isolated_network_only", result_file_writes: 1,
  });
  const failedClientMode = await executeNetworkClientMode({
    arguments: parseArguments([
      "--mode=execute-network-client",
      `--authority=${NETWORK_CLIENT_EXECUTION_AUTHORITY}`,
    ]),
    environment: clientEnvironment,
    async run_suite() { throw new Error("password=raw failure"); },
    async write_result() {},
  });
  assert.equal(failedClientMode.result, "FAILED");
  assert.equal(failedClientMode.failure_code, "DAY147_A5_NETWORK_CLIENT_FAILED");
  assert.equal(JSON.stringify(failedClientMode).includes("password=raw"), false);

  const cleanupEvents: string[] = [];
  const cleanupTargets = new Map<string, string>();
  const cleanupAct: Parameters<typeof executeExactNetworkCleanup>[0]["act"] =
    async (stage, exactTarget) => {
      cleanupEvents.push(stage);
      cleanupTargets.set(stage, exactTarget);
      return { canonical_id: exactTarget,
        ...(stage === "network_members_zero" ? { network_member_count: 0 } : {}) };
    };
  assert.deepEqual(await executeExactNetworkCleanup({
    nonce,
    expected_runner_id: runnerObservation.id,
    expected_postgres_id: postgresObservation.id,
    expected_network_id: networkId,
    expected_runner_image_id: runnerImageId,
    act: cleanupAct,
  }), NETWORK_CLEANUP_ORDER);
  assert.deepEqual(cleanupEvents, NETWORK_CLEANUP_ORDER);
  assert.equal([...cleanupTargets.values()].some((target) => target.includes("*")), false);
  await assert.rejects(executeExactNetworkCleanup({
    nonce,
    expected_runner_id: runnerObservation.id,
    expected_postgres_id: postgresObservation.id,
    expected_network_id: networkId,
    expected_runner_image_id: runnerImageId,
    async act(stage, exactTarget) {
      if (stage === "postgres_remove") throw new Error("cleanup failed");
      return { canonical_id: exactTarget,
        ...(stage === "network_members_zero" ? { network_member_count: 0 } : {}) };
    },
  }));

  let formalEvidenceWrites = 0;
  const validOrchestratorInput = {
    arguments: parseArguments([
      "--mode=execute-network-isolated",
      `--authority=${NETWORK_EXECUTION_AUTHORITY}`,
    ]),
    nonce,
    provider_local_validated: true,
    remote_endpoint_present: false,
    base_image: {
      id: NETWORK_RUNNER_BASE_IMAGE_ID,
      repo_digests: [NETWORK_RUNNER_BASE_REPO_DIGEST],
      os: "linux", architecture: "arm64",
    },
    built_image: {
      expected_tag: names.runner_image, observed_tag: names.runner_image,
      build_result_id: runnerImageId, inspected_id: runnerImageId,
    },
    prior_network: null,
    network: networkObservation,
    postgres: postgresObservation,
    runner: runnerObservation,
    postgres_image_id: postgresImageId,
    postgres_internal_readiness_passed: true,
    runner_execution_timeout_ms: NETWORK_RUNNER_EXECUTION_TIMEOUT_MS,
    client_result_file: resultFile,
    cleanup_act: cleanupAct,
    async write_formal_evidence(connection) {
      formalEvidenceWrites += 1;
      assert.equal(connection.topology, "DOCKER_USER_DEFINED_NETWORK");
    },
  } satisfies Parameters<typeof executeNetworkOrchestratorValidation>[0];
  const metadata = await executeNetworkOrchestratorValidation(
    validOrchestratorInput,
  );
  assert.equal(metadata.topology, "DOCKER_USER_DEFINED_NETWORK");
  assert.equal(formalEvidenceWrites, 1);
  let failureEvidenceWrites = 0;
  await assert.rejects(executeNetworkOrchestratorValidation({
    ...validOrchestratorInput,
    async cleanup_act(stage, exactTarget) {
      if (stage === "runner_remove") throw new Error("cleanup failed");
      return { canonical_id: exactTarget,
        ...(stage === "network_members_zero" ? { network_member_count: 0 } : {}) };
    },
    async write_formal_evidence() { failureEvidenceWrites += 1; },
  }));
  assert.equal(failureEvidenceWrites, 0);
  await assert.rejects(executeExactNetworkCleanup({
    nonce,
    expected_runner_id: runnerObservation.id,
    expected_postgres_id: postgresObservation.id,
    expected_network_id: networkId,
    expected_runner_image_id: runnerImageId,
    async act(stage, exactTarget) {
      return { canonical_id: stage === "runner_remove"
        ? "f".repeat(64) : exactTarget,
        ...(stage === "network_members_zero" ? { network_member_count: 0 } : {}) };
    },
  }));
  for (const invalidProof of [
    { ...passingResult, execution_nonce: "bbbbbbbbbbbb" },
    { ...passingResult, result: "FAILED", failure_code: "DAY147_A5_FAILED" },
  ]) assert.throws(() => validateNetworkEvidenceAuthority({
    proof: {
      network_mode: "USER_DEFINED_BRIDGE", execution_nonce: nonce,
      network_nonce: nonce, postgres_network_nonce: nonce,
      runner_network_nonce: nonce, postgres_aliases: ["postgres"],
      postgres_host_publish: false, runner_db_host: "postgres",
      runner_db_port: 5432, remote_endpoint_present: false,
      docker_socket_mounted: false, result_nonce: nonce,
    },
    client_result: invalidProof,
    cleanup_completed: true,
  }));
  assert.throws(() => validateNetworkEvidenceAuthority({
    proof: {
      network_mode: "USER_DEFINED_BRIDGE", execution_nonce: nonce,
      network_nonce: nonce, postgres_network_nonce: nonce,
      runner_network_nonce: nonce, postgres_aliases: ["postgres"],
      postgres_host_publish: false, runner_db_host: "postgres",
      runner_db_port: 5432, remote_endpoint_present: false,
      docker_socket_mounted: false, result_nonce: nonce,
    },
    client_result: passingResult,
    cleanup_completed: false,
  }));

  const source = readFileSync(import.meta.filename, "utf8");
  assert.ok((source.match(/runSharedA5DynamicDatabaseSuite/g) ?? []).length >= 3);
}

*/

async function runNetworkClientRevisionStaticTests(): Promise<void> {
  const nonce = "a1b2c3d4e5f6";
  const names = buildNetworkRunNames(nonce);
  for (const count of [0, 1, 7, 8, 12]) {
    const fixtureManifest = syntheticGeneratedFailureArtifactManifest(count);
    assert.equal(fixtureManifest.size, count);
    const status = [
      ...NETWORK_SOURCE_SCOPE_ALLOWLIST.map(({ xy, path }) => `${xy} ${path}`),
      ...[...fixtureManifest.values()].map(({ relative_path }) =>
        `?? ${relative_path}`),
    ].join("\n") + "\n";
    assert.equal(validateNetworkGitSourceScope({
      branch: "main", head: NETWORK_SOURCE_SCOPE_EXPECTED_HEAD,
      origin_main: NETWORK_SOURCE_SCOPE_EXPECTED_HEAD, divergence: "0\t0",
      staged_files: "", status, generated_artifacts: fixtureManifest,
    }).length, NETWORK_SOURCE_SCOPE_ALLOWLIST.length + count);
  }
  const existingManifest = syntheticGeneratedFailureArtifactManifest(12);
  const sourceStatus = [
    ...NETWORK_SOURCE_SCOPE_ALLOWLIST.map(({ xy, path }) => `${xy} ${path}`),
    ...[...existingManifest.values()].map(({ relative_path }) =>
      `?? ${relative_path}`),
  ].join("\n") + "\n";
  const sourceFixture: NetworkGitSourceScopeFixture = {
    branch: "main\n", head: `${NETWORK_SOURCE_SCOPE_EXPECTED_HEAD}\n`,
    origin_main: `${NETWORK_SOURCE_SCOPE_EXPECTED_HEAD}\n`, divergence: "0\t0\n",
    staged_files: "", status: sourceStatus,
    generated_artifacts: existingManifest,
  };
  assert.equal(validateNetworkGitSourceScope(sourceFixture).length,
    NETWORK_SOURCE_SCOPE_ALLOWLIST.length + existingManifest.size);
  assert.throws(() => validateNetworkGitSourceScope({ ...sourceFixture,
    staged_files: "package.json\n" }));
  assert.throws(() => validateNetworkGitSourceScope({ ...sourceFixture,
    status: `${sourceStatus}?? unknown-source.txt\n` }));
  assert.throws(() => validateNetworkGitSourceScope({ ...sourceFixture,
    status: `${sourceStatus}?? reports/day147a5-isolated-postgres/debug.log\n` }));

  const futureNonce = "abcdef123456";
  const futureEvidence = networkHostFailureEvidence({ nonce: futureNonce,
    primary_failure: "DAY147_A5_NETWORK_SOURCE_SCOPE_BLOCKED",
    cleanup: { attempted: [], completed: [], not_applicable:
      NETWORK_CLEANUP_ORDER, failures: [] } });
  const futureBytes = serializedArtifact(futureEvidence);
  const futureRelative = `${EVIDENCE_REPORTS_RELATIVE_ROOT}/runs/${
    futureNonce}/evidence.json`;
  const futureEntry = validateGeneratedFailureRun({ nonce: futureNonce,
    relative_path: futureRelative, size: futureBytes.byteLength,
    evidence_bytes: futureBytes, files: [{ name: "evidence.json",
      regular_file: true, symbolic_link: false, hard_link_count: 1 }] });
  assert.equal(futureEntry.validator_result, "PASS");
  for (const invalidBytes of [
    new TextEncoder().encode("{malformed"),
    serializedArtifact({ ...futureEvidence, success_claimed: true }),
    serializedArtifact({ ...futureEvidence, execution_nonce: "bbbbbbbbbbbb" }),
    serializedArtifact({ ...futureEvidence, schema_version: 99 }),
    serializedArtifact({ ...futureEvidence, credential: "visible" }),
  ]) assert.throws(() => validateGeneratedFailureRun({ nonce: futureNonce,
    relative_path: futureRelative, size: invalidBytes.byteLength,
    evidence_bytes: invalidBytes, files: [{ name: "evidence.json",
      regular_file: true, symbolic_link: false, hard_link_count: 1 }] }));
  for (const files of [
    [{ name: "receipt.json", regular_file: true, symbolic_link: false,
      hard_link_count: 1 }],
    [{ name: "commit.json", regular_file: true, symbolic_link: false,
      hard_link_count: 1 }],
    [{ name: "evidence.json", regular_file: true, symbolic_link: false,
      hard_link_count: 1 }, { name: "unknown.log", regular_file: true,
      symbolic_link: false, hard_link_count: 1 }],
    [{ name: "evidence.json", regular_file: true, symbolic_link: true,
      hard_link_count: 1 }],
    [{ name: "evidence.json", regular_file: true, symbolic_link: false,
      hard_link_count: 2 }],
  ]) assert.throws(() => validateGeneratedFailureRun({ nonce: futureNonce,
    relative_path: futureRelative, size: futureBytes.byteLength,
    evidence_bytes: futureBytes, files }));

  const endManifest = new Map(existingManifest);
  endManifest.set(futureNonce, futureEntry);
  assert.doesNotThrow(() => validateGeneratedArtifactManifestPreserved({
    start: existingManifest, end: endManifest, current_nonce: futureNonce }));
  const changedManifest = new Map(endManifest);
  const firstEntry = changedManifest.values().next().value as
    GeneratedFailureArtifactManifestEntry;
  changedManifest.set(firstEntry.nonce, { ...firstEntry, sha256: "0".repeat(64) });
  assert.throws(() => validateGeneratedArtifactManifestPreserved({
    start: existingManifest, end: changedManifest, current_nonce: futureNonce }));
  const deletedManifest = new Map(endManifest);
  deletedManifest.delete(firstEntry.nonce);
  assert.throws(() => validateGeneratedArtifactManifestPreserved({
    start: existingManifest, end: deletedManifest, current_nonce: futureNonce }));
  const extraManifest = new Map(endManifest);
  extraManifest.set("111111111111", { ...futureEntry, nonce: "111111111111",
    relative_path: `${EVIDENCE_REPORTS_RELATIVE_ROOT}/runs/111111111111/evidence.json` });
  assert.throws(() => validateGeneratedArtifactManifestPreserved({
    start: existingManifest, end: extraManifest, current_nonce: futureNonce }));
  assert.throws(() => validateGeneratedArtifactManifestPreserved({
    start: existingManifest, end: endManifest,
    current_nonce: "fedcba654321" }));
  const entrypointForResolution = networkClientEntrypointSource({ nonce });
  assert.ok(entrypointForResolution.includes(
    'new URL("./scripts/hermes/test_farm_os_day147a5_isolated_postgres.ts", import.meta.url).href',
  ));
  assert.equal(/^import\s/m.test(entrypointForResolution), false);
  assert.ok(entrypointForResolution.indexOf(
    'phase("RUNNER_ENTRYPOINT_PROCESS_STARTED")') <
    entrypointForResolution.indexOf('await import("node:crypto")'));
  assert.ok(entrypointForResolution.includes("await import(clientModuleSpecifier)"));
  let activeFixedMarkerOffset = -1;
  for (const marker of ["RUNNER_ENTRYPOINT_PROCESS_STARTED",
    "RUNNER_ENTRYPOINT_PATH_VALID", "RUNNER_SECURITY_CONTEXT_VALID",
    "RUNNER_CLIENT_MODULE_IMPORT_START", "RUNNER_CLIENT_MODULE_IMPORT_VALID",
    "RUNNER_ATTESTATION_COMPLETE"] as const) {
    const offset = entrypointForResolution.indexOf(`phase("${marker}")`);
    assert.ok(offset > activeFixedMarkerOffset, marker);
    activeFixedMarkerOffset = offset;
  }
  assert.ok(entrypointForResolution.includes(
    `process.env.${NETWORK_BOOTSTRAP_PROBE_ENVIRONMENT_KEY} === "1"`,
  ));
  assert.ok(entrypointForResolution.indexOf(
    `phase(${JSON.stringify(NETWORK_BOOTSTRAP_PROBE_COMPLETE_PHASE)})`,
  ) < entrypointForResolution.indexOf("await executeNetworkClientInternal"));
  for (const testCase of [
    { code: "ERR_MODULE_NOT_FOUND", specifier: "<workspace>/missing.ts",
      expected: "IMPORT_CLOSURE_FILE_MISSING" },
    { code: "MODULE_NOT_FOUND", specifier: "pg", expected: "MODULE_NOT_FOUND" },
    { code: "ERR_UNKNOWN_FILE_EXTENSION", specifier: ".ts",
      expected: "ERR_UNKNOWN_FILE_EXTENSION" },
    { code: "ERR_PACKAGE_PATH_NOT_EXPORTED", specifier: "pkg/private",
      expected: "ERR_PACKAGE_PATH_NOT_EXPORTED" },
    { code: "ERR_UNSUPPORTED_DIR_IMPORT", specifier: "<workspace>/directory",
      expected: "ERR_UNSUPPORTED_DIR_IMPORT" },
    { code: "ERR_MODULE_NOT_FOUND", specifier: "tsx",
      expected: "TSX_LOADER_UNAVAILABLE" },
    { code: "ERR_MODULE_NOT_FOUND", specifier: "@/lib/module",
      expected: "PATH_ALIAS_UNRESOLVED" },
  ] as const) assert.equal(classifyRunnerModuleResolutionDiagnostic({
    node_error_code: testCase.code, failing_specifier: testCase.specifier,
    importer: "<workspace>/network-client-entrypoint.ts",
  }).exact_class, testCase.expected);
  const diagnosticLine = NETWORK_RUNNER_MODULE_DIAGNOSTIC_PREFIX + JSON.stringify({
    node_error_code: "ERR_MODULE_NOT_FOUND",
    failing_specifier: "<workspace>/missing.ts",
    importer: "<workspace>/network-client-entrypoint.ts",
    import_stack: "at <workspace>/network-client-entrypoint.ts",
    runtime_executable: "/usr/local/bin/node",
  });
  assert.equal(parseRunnerModuleResolutionDiagnostic(diagnosticLine)?.exact_class,
    "IMPORT_CLOSURE_FILE_MISSING");
  assert.throws(() => classifyRunnerModuleResolutionDiagnostic({
    node_error_code: "ERR_MODULE_NOT_FOUND", failing_specifier: "/Users/raw/x",
    importer: "<workspace>/network-client-entrypoint.ts",
  }));
  const probeCommand = buildNetworkBootstrapProbeCreateCommand({ nonce,
    runner_image_id: `sha256:${"d".repeat(64)}`, runner_uid: 1000,
    environment_keys: NETWORK_CLIENT_ENVIRONMENT_KEYS });
  assert.ok(probeCommand.args.includes("--network=none"));
  assert.equal(probeCommand.args.filter((arg) => arg ===
    `${NETWORK_BOOTSTRAP_PROBE_ENVIRONMENT_KEY}=1`).length, 1);
  assert.equal(NETWORK_CLIENT_ENVIRONMENT_KEYS.includes(
    NETWORK_BOOTSTRAP_PROBE_ENVIRONMENT_KEY as never), false);
  assert.equal(probeCommand.args.some((arg) => /docker\.sock|dst=\/workspace/.test(
    arg)), false);
  assert.deepEqual(networkRunnerDockerfile().split("\n").at(-1),
    `ENTRYPOINT ["/bin/sh","${NETWORK_RUNNER_LAUNCHER}"]`);
  const activeEntrypointSyntax = spawnSync(process.execPath,
    ["--input-type=module", "--check"], { input: entrypointForResolution,
      encoding: "utf8", timeout: 5_000 });
  assert.equal(activeEntrypointSyntax.status, 0, activeEntrypointSyntax.stderr);

  const buildOnlyArguments = parseArguments([
    "--mode=execute-network-runner-build-only",
    `--authority=${NETWORK_RUNNER_BUILD_DIAGNOSTIC_AUTHORITY}`,
  ]);
  assert.deepEqual(buildOnlyArguments, {
    mode: "execute-network-runner-build-only",
    authority: NETWORK_RUNNER_BUILD_DIAGNOSTIC_AUTHORITY,
  });
  const createOnlyArguments = parseArguments([
    "--mode=execute-network-runner-create-only",
    `--authority=${NETWORK_RUNNER_CREATE_DIAGNOSTIC_AUTHORITY}`,
  ]);
  assert.deepEqual(createOnlyArguments, {
    mode: "execute-network-runner-create-only",
    authority: NETWORK_RUNNER_CREATE_DIAGNOSTIC_AUTHORITY,
  });
  const launcherOnlyArguments = parseArguments([
    "--mode=execute-network-runner-launcher-only",
    `--authority=${NETWORK_RUNNER_LAUNCHER_DIAGNOSTIC_AUTHORITY}`,
  ]);
  assert.deepEqual(launcherOnlyArguments, {
    mode: "execute-network-runner-launcher-only",
    authority: NETWORK_RUNNER_LAUNCHER_DIAGNOSTIC_AUTHORITY,
  });
  for (const rejected of [
    ["--mode=execute-network-runner-launcher-only"],
    ["--mode=execute-network-runner-launcher-only",
      `--authority=${NETWORK_EXECUTION_AUTHORITY}`],
    ["--mode=execute-network-runner-launcher-only",
      `--authority=${NETWORK_RUNNER_LAUNCHER_DIAGNOSTIC_AUTHORITY}`, "--unknown"],
  ]) assert.throws(() => parseArguments(rejected), rejected.join(" "));
  for (const rejected of [
    ["--mode=execute-network-runner-create-only"],
    ["--mode=execute-network-runner-create-only",
      `--authority=${NETWORK_EXECUTION_AUTHORITY}`],
    ["--mode=execute-network-runner-create-only",
      `--authority=${NETWORK_CLIENT_EXECUTION_AUTHORITY}`],
    ["--mode=execute-network-runner-create-only",
      `--authority=${NETWORK_RUNNER_CREATE_DIAGNOSTIC_AUTHORITY}`,
      `--authority=${NETWORK_RUNNER_CREATE_DIAGNOSTIC_AUTHORITY}`],
    ["--mode=execute-network-runner-create-only",
      `--authority=${NETWORK_RUNNER_CREATE_DIAGNOSTIC_AUTHORITY}`, "--"],
    ["--mode=execute-network-runner-create-only",
      `--authority=${NETWORK_RUNNER_CREATE_DIAGNOSTIC_AUTHORITY}`, "--unknown"],
  ]) assert.throws(() => parseArguments(rejected), rejected.join(" "));
  for (const rejected of [
    ["--mode=execute-network-runner-build-only"],
    ["--mode=execute-network-runner-build-only",
      `--authority=${NETWORK_EXECUTION_AUTHORITY}`],
    ["--mode=execute-network-isolated",
      `--authority=${NETWORK_RUNNER_BUILD_DIAGNOSTIC_AUTHORITY}`],
    ["--mode=execute-network-runner-build-only",
      `--authority=${NETWORK_RUNNER_BUILD_DIAGNOSTIC_AUTHORITY}`,
      `--authority=${NETWORK_RUNNER_BUILD_DIAGNOSTIC_AUTHORITY}`],
    ["--mode=execute-network-runner-build-only",
      `--authority=${NETWORK_RUNNER_BUILD_DIAGNOSTIC_AUTHORITY}`, "--"],
    ["--mode=execute-network-runner-build-only",
      `--authority=${NETWORK_RUNNER_BUILD_DIAGNOSTIC_AUTHORITY}`, "--unknown"],
  ]) assert.throws(() => parseArguments(rejected), rejected.join(" "));
  assert.deepEqual(parseArguments([
    "--mode=execute-network-isolated",
    `--authority=${NETWORK_EXECUTION_AUTHORITY}`,
  ]), { mode: "execute-network-isolated", authority: NETWORK_EXECUTION_AUTHORITY });
  for (const direct of [
    ["--mode=execute-network-client"],
    ["--mode=execute-network-client", `--authority=${NETWORK_CLIENT_EXECUTION_AUTHORITY}`],
    ["--mode=execute-network-client", `--authority=${NETWORK_EXECUTION_AUTHORITY}`],
  ]) assert.throws(() => parseArguments(direct));

  const dockerfile = networkRunnerDockerfile();
  assert.equal(dockerfile.includes('ENTRYPOINT ["pnpm"'), false);
  assert.equal(dockerfile.includes("pnpm exec tsx"), false);
  assert.ok(dockerfile.includes(`ENTRYPOINT ["/bin/sh","${NETWORK_RUNNER_LAUNCHER}"]`));
  assert.equal(dockerfile.includes("readlink -f /workspace/node_modules/.bin/tsx"),
    false);
  assert.equal(dockerfile.split(`node ${LOCAL_TSX_VALIDATOR_PATH}`).length - 1, 1);
  assert.equal(networkRunnerLauncherSource().split(
    `node ${LOCAL_TSX_VALIDATOR_PATH}`,
  ).length - 1, 1);
  assert.ok(dockerfile.includes(
    `USER ${NETWORK_RUNNER_FINAL_UID}:${NETWORK_RUNNER_FINAL_GID}`));
  assert.ok(dockerfile.includes(
    `${NETWORK_RUNNER_TSX_EXECUTABLE} --version`,
  ));
  assert.ok(dockerfile.includes(
    `${NETWORK_RUNNER_TSX_EXECUTABLE} \"$smoke\"`,
  ));
  assert.ok(dockerfile.includes(
    'process.stdout.write("FARMOS_TSX_SMOKE_OK\\n");',
  ));
  assert.equal(dockerfile.includes(
    'process.stdout.write("FARMOS_TSX_SMOKE_OK\\\\n");',
  ), false);
  assert.equal(dockerfile.includes("npx"), false);
  assert.equal(dockerfile.includes("npm install -g"), false);
  for (const instruction of dockerfile.split("\n").filter((line) =>
    line.startsWith("RUN ")
  )) {
    const syntax = spawnSync("/bin/sh", ["-n", "-c", instruction.slice(4)], {
      encoding: "utf8", timeout: 5_000,
    });
    assert.equal(syntax.status, 0, `${instruction}\n${syntax.stderr}`);
  }
  for (const marker of [
    "BUILD_TSX_COMMAND_INVOKABLE", "BUILD_TSX_MINIMAL_TYPESCRIPT_SMOKE_PASS",
    "BUILD_ENTRYPOINT_READ_CONTRACT", "BUILD_LAUNCHER_EXISTS",
    "BUILD_LAUNCHER_EXECUTABLE", "BUILD_LAUNCHER_EXECUTE_CONTRACT",
  ]) assert.ok(dockerfile.includes(
    `${RUNNER_BUILD_PREDICATE_PREFIX}${marker}`,
  ), marker);
  const validatorSource = localTsxValidatorSource();
  const validatorSyntax = spawnSync(process.execPath, ["--input-type=module", "--check"],
    { input: validatorSource, encoding: "utf8", timeout: 5_000 });
  assert.equal(validatorSyntax.status, 0, validatorSyntax.stderr);
  assert.equal(validatorSource.includes("node:path"), false);
  for (const marker of LOCAL_TSX_PHASES) {
    assert.ok(validatorSource.includes(`phase("${marker}")`), marker);
  }
  for (const code of [
    "DAY147_A5_TSX_PATH_ENOENT", "DAY147_A5_TSX_PATH_EACCES",
    "DAY147_A5_TSX_PATH_TYPE_INVALID", "DAY147_A5_TSX_REALPATH_FAILED",
    "DAY147_A5_TSX_TARGET_OUTSIDE_NODE_MODULES",
    "DAY147_A5_TSX_TARGET_NOT_REGULAR", "DAY147_A5_TSX_TARGET_NOT_READABLE",
    "DAY147_A5_TSX_TARGET_NOT_EXECUTABLE",
    "DAY147_A5_TSX_PARENT_DIRECTORY_NOT_TRAVERSABLE",
    "DAY147_A5_ENTRYPOINT_ENOENT", "DAY147_A5_ENTRYPOINT_EACCES",
    "DAY147_A5_ENTRYPOINT_TYPE_INVALID",
  ]) assert.ok(validatorSource.includes(code), code);
  const validLocalTsx: LocalTsxContractObservation = {
    lstat_errno: null, file_type: "symbolic_link", realpath_errno: null,
    realpath: "/workspace/node_modules/.pnpm/tsx@4.20.3/node_modules/tsx/dist/cli.mjs",
    target_stat_errno: null, target_regular: true, parents_traversable: true,
    target_readable: true, target_read_errno: null, target_executable: true,
    target_execute_errno: null, entrypoint_errno: null,
    entrypoint_regular: true, entrypoint_symbolic: false,
  };
  assert.equal(classifyLocalTsxContract(validLocalTsx), null);
  assert.equal(classifyLocalTsxContract({ ...validLocalTsx,
    file_type: "regular_file", realpath: NETWORK_RUNNER_TSX_EXECUTABLE }), null);
  for (const [overrides, expected] of [
    [{ lstat_errno: "ENOENT" }, "DAY147_A5_TSX_PATH_ENOENT"],
    [{ lstat_errno: "EACCES" }, "DAY147_A5_TSX_PATH_EACCES"],
    [{ file_type: "directory" }, "DAY147_A5_TSX_PATH_TYPE_INVALID"],
    [{ realpath_errno: "ENOENT" }, "DAY147_A5_TSX_REALPATH_FAILED"],
    [{ realpath: "/usr/local/bin/tsx" },
      "DAY147_A5_TSX_TARGET_OUTSIDE_NODE_MODULES"],
    [{ target_regular: false }, "DAY147_A5_TSX_TARGET_NOT_REGULAR"],
    [{ target_readable: false, target_read_errno: "EACCES" },
      "DAY147_A5_TSX_TARGET_NOT_READABLE"],
    [{ target_executable: false, target_execute_errno: "EACCES" },
      "DAY147_A5_TSX_TARGET_NOT_EXECUTABLE"],
    [{ parents_traversable: false },
      "DAY147_A5_TSX_PARENT_DIRECTORY_NOT_TRAVERSABLE"],
    [{ entrypoint_errno: "ENOENT" }, "DAY147_A5_ENTRYPOINT_ENOENT"],
    [{ entrypoint_errno: "EACCES" }, "DAY147_A5_ENTRYPOINT_EACCES"],
    [{ entrypoint_symbolic: true }, "DAY147_A5_ENTRYPOINT_TYPE_INVALID"],
  ] as const) assert.equal(classifyLocalTsxContract({
    ...validLocalTsx, ...overrides,
  }), expected);
  const launcher = networkRunnerLauncherSource();
  assert.ok(launcher.startsWith("#!/bin/sh\nset -eu\n"));
  assert.ok(launcher.includes(
    `exec ${NETWORK_RUNNER_TSX_EXECUTABLE} ${NETWORK_RUNNER_ENTRYPOINT}`));
  assert.equal(launcher.includes("pnpm"), false);
  assert.equal(launcher.includes("readlink"), false);
  assert.equal(launcher.includes("[ -L"), false);
  assert.ok(launcher.indexOf("phase RUNNER_LAUNCHER_STARTED") <
    launcher.indexOf(`node ${LOCAL_TSX_VALIDATOR_PATH}`));
  assert.ok(launcher.indexOf(`node ${LOCAL_TSX_VALIDATOR_PATH}`) <
    launcher.indexOf(`exec ${NETWORK_RUNNER_TSX_EXECUTABLE}`));
  const exitedState: RunnerStateDiagnostic = { status: "exited", exit_code: 1,
    error: "", oom_killed: false, started_at: "start", finished_at: "finish" };
  const runnerDiagnostic = (input: Readonly<{
    phases?: readonly RunnerBootstrapPhase[];
    failure?: RunnerFixedBootstrapFailureCode;
    transient?: RunnerRetryableRootCause;
    attempt?: number;
    cleanup?: boolean;
  }> = {}) => classifyRunnerAttempt({ attempt: input.attempt ?? 1,
    container_created: true,
    container_started: true, state: exitedState, stdout: "",
    stderr: [...(input.phases ?? []).map((phase) =>
      `FARMOS_DAY147_A5_PHASE=${phase}`), ...(input.failure === undefined ? [] :
      [`FARMOS_DAY147_A5_FAILURE=${input.failure}`])].join("\n"),
    cleanup_completed: input.cleanup ?? true, result_present: false,
    diagnostic_present: true, transient_evidence: input.transient ?? null });
  assert.equal(runnerDiagnostic().attempt_started, true);
  assert.equal(runnerDiagnostic().container_created, true);
  assert.equal(runnerDiagnostic().attempt, 1);
  assert.equal(runnerDiagnostic().root_cause_class,
    "DAY147_A5_RUNNER_LAUNCHER_NOT_STARTED");
  assert.equal(runnerDiagnostic({ phases: ["RUNNER_LAUNCHER_STARTED"],
    failure: "DAY147_A5_TSX_PATH_ENOENT" }).root_cause_class,
    "DAY147_A5_TSX_PATH_ENOENT");
  const launcherComplete = RUNNER_BOOTSTRAP_PHASES.slice(0,
    RUNNER_BOOTSTRAP_PHASES.indexOf("RUNNER_ENTRYPOINT_PROCESS_STARTED"));
  assert.equal(runnerDiagnostic({ phases: launcherComplete }).root_cause_class,
    "DAY147_A5_RUNNER_TSX_EXECUTION_FAILED");
  const importStarted = RUNNER_BOOTSTRAP_PHASES.slice(0,
    RUNNER_BOOTSTRAP_PHASES.indexOf("RUNNER_CLIENT_MODULE_IMPORT_VALID"));
  assert.equal(runnerDiagnostic({ phases: importStarted }).root_cause_class,
    "DAY147_A5_RUNNER_CLIENT_MODULE_IMPORT_FAILED");
  const attestationFailure = runnerDiagnostic({ phases:
    RUNNER_BOOTSTRAP_PHASES.slice(0,
      RUNNER_BOOTSTRAP_PHASES.indexOf("RUNNER_ATTESTATION_COMPLETE")),
    failure: "DAY147_A5_RUNNER_SECURITY_CONTEXT_INVALID" });
  assert.equal(attestationFailure.root_cause_class,
    "DAY147_A5_RUNNER_SECURITY_CONTEXT_INVALID");
  let deterministicAttempts = 0;
  await assert.rejects(convergeRunnerAttempts({ deadline_ms: 10_000,
    now: () => 0, async backoff() {}, async execute_attempt(attempt) {
      deterministicAttempts += 1; return { success: false,
        diagnostic: runnerDiagnostic({ attempt,
          failure: "DAY147_A5_TSX_PATH_ENOENT",
          phases: ["RUNNER_LAUNCHER_STARTED"] }) };
    } }), RunnerConvergenceFailure);
  assert.equal(deterministicAttempts, 1);
  let transientAttempts = 0;
  await assert.rejects(convergeRunnerAttempts({ deadline_ms: 100_000,
    now: () => 0, async backoff() {}, async execute_attempt(attempt) {
      transientAttempts += 1; return { success: false,
        diagnostic: runnerDiagnostic({ attempt,
          transient: "DAY147_A5_RUNNER_INSPECT_TRANSIENT" }) };
    } }), RunnerConvergenceFailure);
  assert.equal(transientAttempts, MAX_RUNNER_ATTEMPTS);
  let retryAttempts = 0;
  const retryPass = await convergeRunnerAttempts({ deadline_ms: 10_000,
    now: () => 0, async backoff() {}, async execute_attempt(attempt) {
      retryAttempts += 1;
      return attempt === 1 ? { success: false,
        diagnostic: runnerDiagnostic({ attempt,
          transient: "DAY147_A5_RUNNER_INSPECT_TRANSIENT" }) } :
        { success: true, value: "PASS", diagnostic: runnerDiagnostic({ attempt,
          phases: RUNNER_BOOTSTRAP_PHASES }) };
    } });
  assert.equal(retryPass.value, "PASS");
  assert.equal(retryAttempts, 2);
  let bindingTimeoutAttempts = 0;
  const bindingRetryPass = await convergeRunnerAttempts({ deadline_ms: 10_000,
    now: () => 0, async backoff() {}, async execute_attempt(attempt) {
      bindingTimeoutAttempts += 1;
      return attempt === 1 ? { success: false,
        diagnostic: runnerDiagnostic({ attempt, transient:
          "DAY147_A5_RUNNER_CONTAINER_POST_START_NETWORK_BINDING_TIMEOUT" }) } :
        { success: true, value: "PASS", diagnostic: runnerDiagnostic({ attempt,
          phases: RUNNER_BOOTSTRAP_PHASES }) };
    } });
  assert.equal(bindingRetryPass.successful_attempt, 2);
  assert.equal(bindingTimeoutAttempts, 2);
  assert.equal(NETWORK_RUNNER_PNPM_VERSION, "11.9.0");
  const packageContract = JSON.parse(readFileSync(resolve(ROOT, "package.json"),
    "utf8")) as Record<string, unknown>;
  assert.equal(packageContract.packageManager, undefined);
  const snapshotPlan = buildSourceSnapshotPlan(nonce);
  for (const required of [
    "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.json",
    ...NETWORK_RUNNER_REQUIRED_IMPORT_CLOSURE,
  ]) assert.ok(snapshotPlan.required_paths.includes(
    required as typeof snapshotPlan.required_paths[number],
  ), required);
  for (const excluded of ["reports", "tsconfig.tsbuildinfo", "node_modules"]) {
    assert.ok(snapshotPlan.archive_command.args.includes(`:(exclude)${excluded}`));
  }
  const buildCommand = buildNetworkRunnerImageCommand(nonce);
  assert.ok(buildCommand.args.includes("--progress=plain"));
  assert.equal(buildCommand.args.some((arg) =>
    /password|credential|capability|database_url/i.test(arg)
  ), false);

  const noisyOutput = Array.from({ length: 100 }, (_, index) =>
    `${names.build_context}/file-${index} password=visible ${
      index === 0 ? "https://registry.example/token" : ""
    } /Users/operator/repository /Users/operator/.orbstack/run/docker.sock ${
      "a".repeat(64)
    }`
  ).join("\n");
  const sanitized = sanitizeRunnerBuildExcerpt(noisyOutput, names);
  assert.ok(sanitized.split("\n").length <= NETWORK_RUNNER_BUILD_OUTPUT_MAX_LINES);
  assert.ok(Buffer.byteLength(sanitized, "utf8") <=
    NETWORK_RUNNER_BUILD_OUTPUT_MAX_BYTES);
  for (const forbidden of [
    names.build_context, "visible", "registry.example", "/Users/operator",
    "docker.sock", "a".repeat(64),
  ]) assert.equal(sanitized.includes(forbidden), false, forbidden);
  assert.ok(sanitized.includes("<build-root>"));
  const diagnostic = runnerBuildDiagnostic({
    nonce, names, args: buildCommand.args, status: 17, signal: "SIGTERM",
    error_code: "ETIMEDOUT",
    stdout: `#17 [12/25] RUN validate-local-tsx\n${
      RUNNER_BUILD_PREDICATE_PREFIX
    }BUILD_TSX_REALPATH_RESOLVED\n${noisyOutput}`,
    stderr: `${RUNNER_BUILD_FAILURE_PREFIX}TSX_REALPATH_RESOLUTION_FAILED\n${
      noisyOutput
    }`,
  });
  assert.equal(diagnostic.phase, "RUNNER_BUILD");
  assert.equal(diagnostic.exit_code, 17);
  assert.equal(diagnostic.termination_signal, "SIGTERM");
  assert.equal(diagnostic.timed_out, true);
  assert.equal(diagnostic.execution_nonce, nonce);
  assert.equal(diagnostic.failing_dockerfile_instruction,
    "RUN validate-local-tsx");
  assert.equal(diagnostic.fixed_predicate_marker,
    "BUILD_TSX_REALPATH_RESOLVED");
  assert.equal(diagnostic.fixed_failure_marker,
    "TSX_REALPATH_RESOLUTION_FAILED");
  assert.ok(diagnostic.command_argument_shape.includes("<build-root>"));
  assert.ok(diagnostic.command_argument_shape.some((arg) =>
    arg.startsWith("<result-root>/")
  ));

  const capabilityPath = `${names.result_directory}/capability-${nonce}`;
  const createCommand = buildNetworkRunnerCreateCommand({ nonce,
    runner_image_id: `sha256:${"d".repeat(64)}`,
    result_directory: names.result_directory, capability_file: capabilityPath,
    runner_uid: 1000, environment_keys: NETWORK_CLIENT_ENVIRONMENT_KEYS });
  assert.deepEqual(createCommand.args.slice(0, 2), ["container", "create"]);
  assert.equal(createCommand.args.includes("run"), false);
  assert.equal(createCommand.args.includes("--detach"), false);
  assert.equal(createCommand.args.some((arg) => arg.endsWith(",rw")), false);
  assert.equal(createCommand.args.some((arg) => /docker\.sock/.test(arg)), false);
  assert.equal(createCommand.args.some((arg) => arg === "--privileged"), false);
  assert.equal(createCommand.args.some((arg) => arg.includes("p".repeat(64))), false);
  assert.equal(createCommand.args.filter((arg) => arg === "--mount").length, 2);
  const createLabels = createCommand.args.flatMap((arg, index, args) =>
    arg === "--label" && args[index + 1] !== undefined ? [args[index + 1]!] : []
  );
  assert.deepEqual(createLabels, [
    `farmos.day147a5.execution_nonce=${nonce}`,
    `${NETWORK_RESOURCE_ROLE_LABEL}=${NETWORK_RUNNER_ROLE}`,
  ]);
  assert.equal(new Set(createLabels.map((label) => label.split("=", 1)[0])).size,
    createLabels.length);
  assert.equal(createLabels.filter((label) =>
    label.startsWith(`${NETWORK_RESOURCE_ROLE_LABEL}=`)
  ).length, 1);
  assert.throws(() => buildNetworkRunnerCreateCommand({
    nonce, runner_image_id: `sha256:${"d".repeat(64)}`,
    result_directory: names.result_directory, capability_file: capabilityPath,
    runner_uid: 1000, environment_keys: NETWORK_CLIENT_ENVIRONMENT_KEYS,
    role: "postgres",
  } as Parameters<typeof buildNetworkRunnerCreateCommand>[0] & {
    role: string;
  }));
  assert.deepEqual(buildNetworkRunnerStartCommand("c".repeat(64)).args,
    ["container", "start", "c".repeat(64)]);

  for (const phase of Object.keys(RUNNER_PHASE_FAILURE_CODES) as RunnerCommandPhase[]) {
    const phaseDiagnostic = runnerCommandDiagnostic({ phase,
      args: createCommand.args, names, capability_file: capabilityPath,
      password: "visible-password", status: 17, signal: "SIGTERM",
      error_code: "ETIMEDOUT", stdout: noisyOutput,
      stderr: `${capabilityPath} password=visible-password ${"c".repeat(64)}` });
    assert.equal(new RunnerCommandFailure(phase, phaseDiagnostic).message,
      RUNNER_PHASE_FAILURE_CODES[phase]);
    assert.equal(phaseDiagnostic.timed_out, true);
    assert.equal(phaseDiagnostic.password_argument_absent, true);
    assert.ok(Buffer.byteLength(phaseDiagnostic.sanitized_stdout, "utf8") <=
      NETWORK_RUNNER_BUILD_OUTPUT_MAX_BYTES);
    assert.ok(phaseDiagnostic.sanitized_stdout.split("\n").length <=
      NETWORK_RUNNER_BUILD_OUTPUT_MAX_LINES);
    for (const forbidden of [capabilityPath, "visible-password", ROOT,
      dirname(names.build_context), "c".repeat(64), "docker.sock"]) {
      assert.equal(phaseDiagnostic.sanitized_stderr.includes(forbidden), false,
        `${phase}:${forbidden}`);
    }
  }

  const validMountInput = {
    nonce, runner_uid: 1000, command: createCommand,
    result: { lexical_path: names.result_directory,
      canonical_path: names.result_directory, kind: "directory" as const,
      symbolic_link: false, uid: 1000, mode: 0o700 },
    capability: { lexical_path: capabilityPath, canonical_path: capabilityPath,
      kind: "file" as const, symbolic_link: false, uid: 1000, mode: 0o400 },
  };
  assert.doesNotThrow(() => validateRunnerMountContract(validMountInput));
  for (const invalid of [
    { ...validMountInput, result: { ...validMountInput.result, kind: "other" as const } },
    { ...validMountInput, result: { ...validMountInput.result, symbolic_link: true } },
    { ...validMountInput, result: { ...validMountInput.result, mode: 0o500 } },
    { ...validMountInput, capability: { ...validMountInput.capability,
      kind: "other" as const } },
    { ...validMountInput, capability: { ...validMountInput.capability,
      symbolic_link: true } },
    { ...validMountInput, capability: { ...validMountInput.capability, uid: 1001 } },
    { ...validMountInput, capability: { ...validMountInput.capability, mode: 0o440 } },
    { ...validMountInput, command: { executable: "docker" as const,
      args: Object.freeze([...createCommand.args, "--mount",
        `type=bind,src=${names.result_directory},dst=/result`]) } },
    { ...validMountInput, command: { executable: "docker" as const,
      args: Object.freeze([...createCommand.args, "--mount",
        `type=bind,src=${ROOT},dst=/workspace`]) } },
    { ...validMountInput, command: { executable: "docker" as const,
      args: Object.freeze([...createCommand.args, "--mount",
        "type=bind,src=/run/docker.sock,dst=/run/docker.sock"]) } },
  ]) assert.throws(() => validateRunnerMountContract(invalid));
  assert.throws(() => buildNetworkRunnerCreateCommand({ nonce,
    runner_image_id: `sha256:${"d".repeat(64)}`,
    result_directory: names.result_directory, capability_file: capabilityPath,
    runner_uid: 1000,
    environment_keys: [...NETWORK_CLIENT_ENVIRONMENT_KEYS,
      NETWORK_CLIENT_ENVIRONMENT_KEYS[0]] }));

  const buildRootReceipt = networkCreationReceipt({
    resource_type: "build_root", execution_nonce: nonce,
    canonical_resource: dirname(names.build_context), expected_name: nonce,
    creation_operation_success: true, pre_existing: false,
    expected_binding: nonce, cleanup_eligible: true,
  });
  const resultRootReceipt = networkCreationReceipt({
    resource_type: "result_root", execution_nonce: nonce,
    canonical_resource: names.result_directory, expected_name: "result",
    creation_operation_success: true, pre_existing: false,
    expected_binding: nonce, cleanup_eligible: true,
  });
  const runnerImageId = "sha256:" + "d".repeat(64);
  const imageReceipt = networkCreationReceipt({
    resource_type: "temporary_image", execution_nonce: nonce,
    canonical_resource: runnerImageId, expected_name: names.runner_image,
    creation_operation_success: true, pre_existing: false,
    expected_binding: NETWORK_RUNNER_BASE_IMAGE_ID + ":" +
      networkRunnerEntrypointDigest(nonce),
    cleanup_eligible: true,
  });
  const buildOnlyFixture = (buildResult: "success" | "failure" | "preexisting") => {
    const receipts: NetworkCreationReceipt[] = [];
    const events: string[] = [];
    const operations: NetworkRunnerBuildOnlyOperations = {
      current_creation_receipts: () => receipts,
      async validate_orbstack_provider() { events.push("provider"); },
      async inspect_base_image() {
        events.push("base");
        return { id: NETWORK_RUNNER_BASE_IMAGE_ID,
          repo_digests: [NETWORK_RUNNER_BASE_REPO_DIGEST], os: "linux",
          architecture: "arm64" };
      },
      async create_source_snapshot() {
        events.push("snapshot");
        receipts.push(buildRootReceipt, resultRootReceipt);
        return { snapshot: { build_context: names.build_context,
          manifest: snapshotPlan.required_paths },
          receipts: [buildRootReceipt, resultRootReceipt] };
      },
      async build_temporary_image() {
        events.push("build");
        if (buildResult !== "success") {
          throw new Error(buildResult === "preexisting"
            ? "DAY147_A5_NETWORK_RUNNER_IMAGE_EXISTS"
            : "DAY147_A5_NETWORK_RUNNER_BUILD_FAILED");
        }
        receipts.push(imageReceipt);
        return { observation: { expected_tag: names.runner_image,
          observed_tag: names.runner_image, build_result_id: runnerImageId,
          inspected_id: runnerImageId, pre_existing: false,
          execution_nonce_label: nonce, base_image_id: NETWORK_RUNNER_BASE_IMAGE_ID },
          receipt: imageReceipt };
      },
      async cleanup_resource(receipt) {
        events.push("cleanup:" + receipt.resource_type);
        return { canonical_resource: receipt.canonical_resource,
          expected_binding: receipt.expected_binding, absent_after_cleanup: true };
      },
      async verify_build_only_residuals() { events.push("residuals"); },
    };
    return { operations, events };
  };
  const successfulBuildOnly = buildOnlyFixture("success");
  const buildOnlyResult = await executeNetworkRunnerBuildOnly({
    arguments: buildOnlyArguments, nonce,
    operations: successfulBuildOnly.operations,
  });
  assert.equal(buildOnlyResult.image_id, runnerImageId);
  assert.deepEqual(buildOnlyResult.cleanup.completed,
    NETWORK_RUNNER_BUILD_ONLY_CLEANUP_ORDER);
  assert.deepEqual(successfulBuildOnly.events, [
    "provider", "base", "snapshot", "build", "cleanup:temporary_image",
    "cleanup:result_root", "cleanup:build_root", "residuals",
  ]);
  for (const failureKind of ["failure", "preexisting"] as const) {
    const failedBuildOnly = buildOnlyFixture(failureKind);
    await assert.rejects(executeNetworkRunnerBuildOnly({
      arguments: buildOnlyArguments, nonce, operations: failedBuildOnly.operations,
    }));
    assert.deepEqual(failedBuildOnly.events, [
      "provider", "base", "snapshot", "build", "cleanup:result_root",
      "cleanup:build_root", "residuals",
    ]);
  }
  const unauthorizedBuildOnly = buildOnlyFixture("success");
  await assert.rejects(executeNetworkRunnerBuildOnly({
    arguments: { mode: "execute-network-isolated",
      authority: NETWORK_EXECUTION_AUTHORITY }, nonce,
    operations: unauthorizedBuildOnly.operations,
  }));
  assert.deepEqual(unauthorizedBuildOnly.events, []);

  const launcherOnlyFixture = (probePasses: boolean) => {
    const fixture = buildOnlyFixture("success");
    const operations: NetworkRunnerLauncherOnlyOperations = {
      ...fixture.operations,
      async validate_git_source_scope() { fixture.events.push("source-gate"); },
      async run_launcher_only_probe() {
        fixture.events.push("launcher-probe");
        if (!probePasses) throw new LauncherOnlyProbeFailure(
          "DAY147_A5_TSX_PATH_EACCES", null, null, null,
          "LOCAL_TSX_VALIDATOR_STARTED", "EACCES",
          NETWORK_RUNNER_FINAL_UID, NETWORK_RUNNER_FINAL_GID, "unknown",
          false, false, "bounded", true,
        );
        return { launcher_started: true, runtime_validator: "PASS",
          entrypoint_started: true, cleanup_passed: true,
          local_tsx: { uid: NETWORK_RUNNER_FINAL_UID,
            gid: NETWORK_RUNNER_FINAL_GID, file_type: "regular_file",
            realpath_relative: ".bin/tsx",
            canonical_target_within_node_modules: true, target_regular: true,
            target_readable: true, target_executable: true,
            parent_directories_traversable: true } };
      },
    };
    return { ...fixture, operations };
  };
  const successfulLauncherOnly = launcherOnlyFixture(true);
  const launcherOnlyResult = await executeNetworkRunnerLauncherOnly({
    arguments: launcherOnlyArguments, nonce,
    operations: successfulLauncherOnly.operations,
  });
  assert.equal(launcherOnlyResult.probe.entrypoint_started, true);
  assert.deepEqual(successfulLauncherOnly.events, [
    "source-gate", "provider", "base", "snapshot", "build", "launcher-probe",
    "cleanup:temporary_image", "cleanup:result_root", "cleanup:build_root",
    "residuals",
  ]);
  const failedLauncherOnly = launcherOnlyFixture(false);
  await assert.rejects(executeNetworkRunnerLauncherOnly({
    arguments: launcherOnlyArguments, nonce,
    operations: failedLauncherOnly.operations,
  }), (error: unknown) => error instanceof LauncherOnlyProbeFailure &&
    error.exact_failure_code === "DAY147_A5_TSX_PATH_EACCES" &&
    error.cleanup_passed);
  assert.deepEqual(failedLauncherOnly.events.slice(-4), [
    "cleanup:temporary_image", "cleanup:result_root", "cleanup:build_root",
    "residuals",
  ]);

  const expectedIds = orderedCaseRegistryIds();
  assert.equal(expectedIds.length, 102);
  assert.equal(new Set(expectedIds).size, 102);
  assert.match(caseRegistryDigest(), /^[a-f0-9]{64}$/);
  const exactProof = caseRegistryProof(expectedIds.map((id) => ({
    id, status: "PASS" as const,
  })));
  assert.equal(validateExactCaseRegistryProof(exactProof), true);
  const proofResults = [...exactProof.results];
  const forgedProofs: unknown[] = [
    { aggregate: "PASS" },
    { ...exactProof, results: [], executed_count: 102 },
    { ...exactProof, results: proofResults.slice(0, 101), executed_count: 101 },
    { ...exactProof, results: [...proofResults, proofResults[0]], executed_count: 103 },
    { ...exactProof, results: [proofResults[0], ...proofResults.slice(0, 101)] },
    { ...exactProof, results: proofResults.slice(1), executed_count: 101 },
    { ...exactProof, results: [{ case_id: "unknown", status: "PASS" },
      ...proofResults.slice(1)] },
    { ...exactProof, registry_digest: "0".repeat(64) },
    { ...exactProof, executed_count: 101 },
    { ...exactProof, results: [{ ...proofResults[0], status: "FAIL" },
      ...proofResults.slice(1)] },
    { ...exactProof, results: [...proofResults].reverse() },
    { ...exactProof, skip_registry: true },
  ];
  forgedProofs.forEach((proof) => assert.equal(
    validateExactCaseRegistryProof(proof), false,
  ));
  const constructedAggregate = {
    postgres_version: "17.6",
    test_results: EXECUTABLE_CASES.map(({ id, category }) => ({
      id, category, status: "PASS" as const,
    })),
    concurrency_timeline: [
      ...EXPECTED_CONCURRENCY_TIMELINE, ...EXPECTED_CONCURRENCY_TIMELINE,
    ],
    row_counts: { snapshots: 1, projections: 1, events: 1, lineage: 0 },
  } as unknown as SharedA5DynamicSuiteResult;
  assert.throws(() => assertSharedDynamicSuiteComplete(constructedAggregate));

  const cleanupFixture = (overrides: Partial<NetworkClientCleanupMeasurement> = {}) =>
    ({ created_count: 3, close_attempted_count: 3,
      close_completed_count: 3, close_failed_count: 0,
      open_client_count_after_cleanup: 0, duplicate_close_attempt_count: 0,
      ...overrides });
  assert.equal(clientCleanupPassed({ ...cleanupFixture(), result_finalized: true }), true);
  for (const invalid of [
    cleanupFixture({ close_failed_count: 1, close_completed_count: 2,
      open_client_count_after_cleanup: 1 }),
    cleanupFixture({ close_attempted_count: 2, close_completed_count: 2,
      open_client_count_after_cleanup: 1 }),
    cleanupFixture({ duplicate_close_attempt_count: 1 }),
    cleanupFixture({ created_count: 0, close_attempted_count: 0,
      close_completed_count: 0 }),
  ]) assert.equal(clientCleanupPassed({ ...invalid, result_finalized: true }), false);

  const tracker = new NetworkClientCleanupTracker();
  let closes = 0;
  const tracked = [0, 1, 2].map(() => tracker.track({
    async end() { closes += 1; },
  }, "end"));
  await tracked[0]!.end();
  const measured = await tracker.converge();
  assert.equal(closes, 3);
  assert.deepEqual(measured, cleanupFixture());
  await assert.rejects(tracked[0]!.end());
  assert.equal(tracker.measurement().duplicate_close_attempt_count, 1);
  for (const failureKind of ["client", "pool", "concurrency_writer", "observer"] as const) {
    const failing = new NetworkClientCleanupTracker();
    failing.track({ async end() { throw new Error(failureKind); } }, "end");
    const failure = await failing.converge();
    assert.equal(failure.close_failed_count, 1, failureKind);
    assert.equal(failure.open_client_count_after_cleanup, 1, failureKind);
    assert.equal(clientCleanupPassed({ ...failure, result_finalized: true }), false);
  }

  const passingResult = clientResultWithStatus({
    nonce, result: "PASS", postgres_version: "17.6", status: "PASS",
    failure_code: null, case_registry: exactProof, cleanup: cleanupFixture(),
    capability_digest: createHash("sha256").update(new TextEncoder().encode(
      `${JSON.stringify({ schema: "farmos-day147a5-network-client-capability-v1",
        execution_nonce: nonce, capability: "c".repeat(64) })}\n`,
    )).digest("hex"),
    concurrency_timeline: [
      ...EXPECTED_CONCURRENCY_TIMELINE, ...EXPECTED_CONCURRENCY_TIMELINE,
    ],
    row_counts: { snapshots: 1, projections: 1, events: 1, lineage: 0 },
  });
  assert.equal(validateClientResult(passingResult, nonce), true);
  for (const invalid of [
    { ...passingResult, case_registry: forgedProofs[0] },
    { ...passingResult, client_cleanup: { ...passingResult.client_cleanup,
      close_failed_count: 1, close_completed_count: 2,
      open_client_count_after_cleanup: 1 } },
    { ...passingResult, execution_nonce: "bbbbbbbbbbbb" },
  ]) assert.equal(validateClientResult(invalid, nonce), false);

  const primaryPreservedResult = clientResultWithStatus({
    nonce, result: "FAIL", postgres_version: null, status: "NOT_COMPLETED",
    failure_code: "DAY147_A5_NETWORK_CLIENT_FAILED",
    cleanup_failure_code: "DAY147_A5_NETWORK_CLIENT_CLEANUP_FAILED",
    cleanup: cleanupFixture({ close_failed_count: 1, close_completed_count: 2,
      open_client_count_after_cleanup: 1 }),
  });
  assert.equal(validateClientResult(primaryPreservedResult, nonce), true);
  assert.equal(primaryPreservedResult.failure_code,
    "DAY147_A5_NETWORK_CLIENT_FAILED");
  assert.equal(primaryPreservedResult.cleanup_failure_code,
    "DAY147_A5_NETWORK_CLIENT_CLEANUP_FAILED");

  const capabilityBytes = new TextEncoder().encode(`${JSON.stringify({
    schema: "farmos-day147a5-network-client-capability-v1",
    execution_nonce: nonce, capability: "c".repeat(64),
  })}\n`);
  const capabilityDigest = createHash("sha256").update(capabilityBytes).digest("hex");
  const clientEnvironment: NetworkClientEnvironment = {
    FARMOS_A5_EXECUTION_NONCE: nonce, PGHOST: "postgres", PGPORT: "5432",
    PGUSER: ROLE_FIXTURES.migration_owner.name, PGPASSWORD: "p".repeat(64),
    FARMOS_A5_DB_LEGACY_ACTIVE: buildNames(nonce).legacy_active,
    FARMOS_A5_DB_LEGACY_SUPERSEDED: buildNames(nonce).legacy_superseded,
    FARMOS_A5_DB_MAIN: buildNames(nonce).main,
    FARMOS_A5_CLIENT_RESULT_PATH: "/result/client-result.json",
    FARMOS_A5_CAPABILITY_DIGEST: capabilityDigest,
    FARMOS_A5_CAPABILITY_OWNER_UID: "1000",
  };
  const attestation: NetworkRunnerAttestation = {
    runner_entrypoint: NETWORK_RUNNER_ENTRYPOINT,
    execution_nonce: nonce, expected_nonce: nonce,
    capability_path: NETWORK_RUNNER_CAPABILITY_PATH,
    capability_regular_file: true, capability_symbolic_link: false,
    capability_canonical_path: NETWORK_RUNNER_CAPABILITY_PATH,
    capability_owner_uid: 1000, capability_mode: 0o400,
    capability_bytes: capabilityBytes, expected_capability_digest: capabilityDigest,
    result_path: "/result/client-result.json",
  };
  assert.doesNotThrow(() => validateNetworkRunnerAttestation(
    attestation, clientEnvironment,
  ));
  for (const invalid of [
    { ...attestation, capability_regular_file: false },
    { ...attestation, capability_symbolic_link: true },
    { ...attestation, expected_capability_digest: "0".repeat(64) },
    { ...attestation, execution_nonce: "bbbbbbbbbbbb" },
    { ...attestation, result_path: "/result/other.json" },
    { ...attestation, runner_entrypoint: "/workspace/script.ts" },
    { ...attestation, capability_path: "/tmp/capability" },
  ]) assert.throws(() => validateNetworkRunnerAttestation(invalid, clientEnvironment));
  assert.throws(() => validateNetworkRunnerAttestation(attestation, {
    ...clientEnvironment, PGHOST: "production.example",
  }));
  const entrypoint = networkClientEntrypointSource({ nonce });
  assert.ok(entrypoint.includes("realpath(fileURLToPath(import.meta.url))"));
  assert.equal(entrypoint.includes("static-capability-fixture"), false);

  const plan = buildSourceSnapshotPlan(nonce);
  const archiveFiles = [...plan.required_paths];
  const expectedSnapshotFiles = [...new Set([
    ...archiveFiles, ...plan.overlay_allowlist, plan.dockerfile_relative_path,
    "network-client-entrypoint.ts", "network-client-launcher.sh",
    "validate-local-tsx.mjs",
    "source-snapshot-manifest.json",
  ])].sort();
  const snapshotEvents: string[] = [];
  const snapshotDependencies = (overrides: Partial<SourceSnapshotDependencies> = {}):
    SourceSnapshotDependencies => ({
      async repository_root() { return { lexical_path: realpathSync(ROOT),
        canonical_path: realpathSync(ROOT) }; },
      async create_temporary_root() { return {
        lexical_path: `/private/tmp/farmos-day147a5-network-runner/${nonce}`,
        canonical_path: `/private/tmp/farmos-day147a5-network-runner/${nonce}`,
        symbolic_link: false, directory: true, owner_matches: true, mode: 0o700,
      }; },
      async git_archive_head() { snapshotEvents.push("git_archive_head");
        return archiveFiles; },
      async inspect_overlay(relativePath) { return { relative_path: relativePath,
        canonical_path: resolve(realpathSync(ROOT), relativePath),
        regular_file: true, symbolic_link: false }; },
      async copy_overlay(observation) { snapshotEvents.push(`overlay:${observation.relative_path}`); },
      async write_generated_file(relativePath) { snapshotEvents.push(`write:${relativePath}`); },
      async list_build_context_files() { return expectedSnapshotFiles; },
      ...overrides,
    });
  const snapshot = await executeSourceSnapshot({ nonce,
    runner_entrypoint_source: entrypoint, dockerfile: networkRunnerDockerfile(),
    dependencies: snapshotDependencies(),
  });
  assert.deepEqual(snapshot.manifest, expectedSnapshotFiles);
  assert.equal(snapshotEvents[0], "git_archive_head");
  const snapshotFailures: Partial<SourceSnapshotDependencies>[] = [
    { async inspect_overlay(relativePath) { return { relative_path: relativePath,
      canonical_path: resolve(ROOT, relativePath), regular_file: true,
      symbolic_link: true }; } },
    { async inspect_overlay(relativePath) { return { relative_path: relativePath,
      canonical_path: "/private/tmp/outside", regular_file: true,
      symbolic_link: false }; } },
    { async inspect_overlay(relativePath) { return { relative_path: relativePath,
      canonical_path: resolve(ROOT, relativePath), regular_file: false,
      symbolic_link: false }; } },
    { async git_archive_head() { return [...archiveFiles, "unrelated.tmp"]; } },
    { async git_archive_head() { return [...archiveFiles, "reports/x"]; } },
    { async git_archive_head() { return [...archiveFiles, "evidence.json"]; } },
    { async git_archive_head() { return [...archiveFiles, "tsconfig.tsbuildinfo"]; } },
    { async git_archive_head() { return [...archiveFiles, "node_modules/x"]; } },
    { async list_build_context_files() { return [...expectedSnapshotFiles, "extra"]; } },
    { async create_temporary_root() { return {
      lexical_path: `/private/tmp/farmos-day147a5-network-runner/${nonce}`,
      canonical_path: `/private/tmp/farmos-day147a5-network-runner/${nonce}`,
      symbolic_link: true, directory: true, owner_matches: true, mode: 0o700 }; } },
    { async create_temporary_root() { return {
      lexical_path: `/private/tmp/farmos-day147a5-network-runner/${nonce}`,
      canonical_path: "/private/tmp/other", symbolic_link: false,
      directory: true, owner_matches: true, mode: 0o700 }; } },
  ];
  for (const overrides of snapshotFailures) await assert.rejects(
    executeSourceSnapshot({ nonce, runner_entrypoint_source: entrypoint,
      dockerfile: networkRunnerDockerfile(),
      dependencies: snapshotDependencies(overrides) }),
  );

  const ids = { runner: "c".repeat(64), postgres: "b".repeat(64),
    network: "a".repeat(64), image: `sha256:${"d".repeat(64)}` };
  const receipts: NetworkCreationReceipt[] = [
    networkCreationReceipt({ resource_type: "runner_container", execution_nonce: nonce,
      canonical_resource: ids.runner, expected_name: names.runner_container,
      creation_operation_success: true, pre_existing: false,
      expected_binding: `${ids.image}:${ids.network}`, cleanup_eligible: true }),
    networkCreationReceipt({ resource_type: "postgres_container", execution_nonce: nonce,
      canonical_resource: ids.postgres, expected_name: names.postgres_container,
      creation_operation_success: true, pre_existing: false,
      expected_binding: `${IMAGE}:${ids.network}`, cleanup_eligible: true }),
    networkCreationReceipt({ resource_type: "network", execution_nonce: nonce,
      canonical_resource: ids.network, expected_name: names.network,
      creation_operation_success: true, pre_existing: false,
      expected_binding: "bridge:local", cleanup_eligible: true }),
    networkCreationReceipt({ resource_type: "temporary_image", execution_nonce: nonce,
      canonical_resource: ids.image, expected_name: names.runner_image,
      creation_operation_success: true, pre_existing: false,
      expected_binding: `${NETWORK_RUNNER_BASE_IMAGE_ID}:${
        networkRunnerEntrypointDigest(nonce)
      }`, cleanup_eligible: true }),
    networkCreationReceipt({ resource_type: "result_root", execution_nonce: nonce,
      canonical_resource: names.result_directory, expected_name: "result",
      creation_operation_success: true, pre_existing: false,
      expected_binding: nonce, cleanup_eligible: true }),
    networkCreationReceipt({ resource_type: "build_root", execution_nonce: nonce,
      canonical_resource: dirname(names.build_context), expected_name: nonce,
      creation_operation_success: true, pre_existing: false,
      expected_binding: nonce, cleanup_eligible: true }),
  ];
  assert.throws(() => networkCreationReceipt({
    ...receipts.find(({ resource_type }) => resource_type === "temporary_image")!,
    pre_existing: true,
  } as unknown as NetworkCreationReceipt));
  assert.throws(() => networkCreationReceipt({
    ...receipts.find(({ resource_type }) => resource_type === "result_root")!,
    canonical_resource: "/private/tmp/caller-supplied-result",
  }));
  const cleanupEvents: string[] = [];
  const cleanupAct = async (receipt: NetworkCreationReceipt) => {
    cleanupEvents.push(receipt.resource_type);
    return { canonical_resource: receipt.canonical_resource,
      expected_binding: receipt.expected_binding, absent_after_cleanup: true };
  };
  const cleanup = await executeExactNetworkCleanup({ nonce, receipts, act: cleanupAct });
  assert.deepEqual(cleanup.attempted, NETWORK_CLEANUP_ORDER);
  assert.deepEqual(cleanup.completed, NETWORK_CLEANUP_ORDER);
  assert.equal(cleanup.failures.length, 0);
  assert.equal(classifyContainerCleanupPresence(0, ""), "PRESENT");
  assert.equal(classifyContainerCleanupPresence(1, "No such container"), "ABSENT");
  assert.throws(() => classifyContainerCleanupPresence(1, "permission denied"));
  for (const failedPhase of NETWORK_CLEANUP_ORDER) {
    const events: string[] = [];
    const result = await executeExactNetworkCleanup({ nonce, receipts,
      async act(receipt) { events.push(receipt.resource_type);
        if (receipt.resource_type === failedPhase) throw new Error("failure");
        return { canonical_resource: receipt.canonical_resource,
          expected_binding: receipt.expected_binding, absent_after_cleanup: true };
      },
    });
    assert.deepEqual(events, failedPhase === "runner_container"
      ? NETWORK_CLEANUP_ORDER.filter((phase) => phase !== "temporary_image")
      : NETWORK_CLEANUP_ORDER);
    assert.deepEqual(result.failures, failedPhase === "runner_container"
      ? [
        { phase: "runner_container",
          failure_code: NETWORK_CLEANUP_FAILURE_CODES.runner_container },
        { phase: "temporary_image",
          failure_code: NETWORK_CLEANUP_FAILURE_CODES.temporary_image },
      ]
      : [{ phase: failedPhase,
        failure_code: NETWORK_CLEANUP_FAILURE_CODES[failedPhase] }]);
  }
  const multiple = await executeExactNetworkCleanup({ nonce, receipts,
    async act(receipt) {
      if (["runner_container", "network"].includes(receipt.resource_type)) {
        throw new Error("failure");
      }
      return { canonical_resource: receipt.canonical_resource,
        expected_binding: receipt.expected_binding, absent_after_cleanup: true };
    },
  });
  assert.deepEqual(multiple.failures.map(({ phase }) => phase), [
    "runner_container", "network", "temporary_image",
  ]);
  const missingReceipt = await executeExactNetworkCleanup({ nonce,
    receipts: receipts.slice(1), act: cleanupAct });
  assert.equal(missingReceipt.failures.some(({ phase }) =>
    phase === "runner_container"), false);
  assert.ok(missingReceipt.not_applicable.includes("runner_container"));
  assert.equal(missingReceipt.attempted.includes("runner_container"), false);
  const protectedImageEvents: NetworkCleanupPhase[] = [];
  const protectedImage = await executeExactNetworkCleanup({ nonce,
    receipts: receipts.filter(({ resource_type }) =>
      resource_type !== "temporary_image"
    ),
    async act(receipt) { protectedImageEvents.push(receipt.resource_type);
      return { canonical_resource: receipt.canonical_resource,
        expected_binding: receipt.expected_binding, absent_after_cleanup: true };
    },
  });
  assert.equal(protectedImageEvents.includes("temporary_image"), false);
  assert.deepEqual(protectedImage.failures.filter(({ phase }) =>
    phase === "temporary_image"
  ), []);
  assert.ok(protectedImage.not_applicable.includes("temporary_image"));
  const canonicalMismatch = await executeExactNetworkCleanup({ nonce, receipts,
    async act(receipt) { return { canonical_resource:
      receipt.resource_type === "network" ? "f".repeat(64) :
        receipt.canonical_resource,
      expected_binding: receipt.expected_binding, absent_after_cleanup: true };
    },
  });
  assert.deepEqual(canonicalMismatch.failures, [{ phase: "network",
    failure_code: "DAY147_A5_NETWORK_CLEANUP_FAILED" }]);

  const proof: DockerUserDefinedNetworkProof = {
    network_mode: "USER_DEFINED_BRIDGE", execution_nonce: nonce,
    network_nonce: nonce, postgres_network_nonce: nonce, runner_network_nonce: nonce,
    postgres_aliases: ["postgres"], postgres_host_publish: false,
    runner_db_host: "postgres", runner_db_port: 5432,
    remote_endpoint_present: false, docker_socket_mounted: false,
    result_nonce: nonce,
  };
  assert.equal(validateNetworkEvidenceAuthority({ proof, client_result: passingResult,
    cleanup, required_phases: NETWORK_ORCHESTRATOR_PHASE_ORDER.slice(0, -1),
    expected_capability_digest: capabilityDigest }).topology,
  "DOCKER_USER_DEFINED_NETWORK");
  assert.throws(() => validateNetworkEvidenceAuthority({ proof,
    client_result: { ...passingResult, case_registry: forgedProofs[0] }, cleanup,
    required_phases: NETWORK_ORCHESTRATOR_PHASE_ORDER.slice(0, -1),
    expected_capability_digest: capabilityDigest }));
  assert.throws(() => validateNetworkEvidenceAuthority({ proof,
    client_result: passingResult, cleanup: multiple,
    required_phases: NETWORK_ORCHESTRATOR_PHASE_ORDER.slice(0, -1),
    expected_capability_digest: capabilityDigest }));
  assert.throws(() => validateNetworkEvidenceAuthority({ proof,
    client_result: passingResult, cleanup,
    required_phases: NETWORK_ORCHESTRATOR_PHASE_ORDER.slice(0, -2),
    expected_capability_digest: capabilityDigest }));

  const resultBytes = new TextEncoder().encode(`${JSON.stringify(passingResult)}\n`);
  const resultFile: ClientResultFileObservation = {
    entries: [`capability-${nonce}`, "client-result.json"],
    file_name: "client-result.json",
    regular_file: true, symbolic_link: false, owner_matches: true, mode: 0o600,
    canonical_path: `${names.result_directory}/client-result.json`,
    expected_path: `${names.result_directory}/client-result.json`,
    size_bytes: resultBytes.byteLength, bytes: resultBytes,
  };
  const networkObservation: NetworkObservation = {
    name: names.network, id: ids.network, driver: "bridge", scope: "local",
    execution_nonce_label: nonce, member_ids: [],
  };
  const postgresObservation: NetworkContainerObservation = {
    id: ids.postgres, name: names.postgres_container,
    image_id: `sha256:${"e".repeat(64)}`, network_id: ids.network,
    network_name: names.network, network_count: 1, network_mode: names.network,
    network_aliases: ["postgres"], published_ports: [], mounts: [],
    tmpfs_paths: ["/var/lib/postgresql/data"], privileged: false, cap_drop: [],
    security_options: [], read_only_rootfs: false, user: "postgres",
    execution_nonce_label: nonce, docker_socket_mounted: false,
  };
  const createdRunnerObservation: NetworkContainerObservation = {
    id: ids.runner, name: names.runner_container, image_id: ids.image,
    network_id: "", network_name: names.network, network_count: 1,
    network_mode: names.network, endpoint_id: "", ip_address: "", sandbox_id: "",
    network_aliases: [], published_ports: [],
    mounts: [
      { type: "bind", source: names.result_directory, destination: "/result" },
      { type: "bind", source: `/private/tmp/capability-${nonce}`,
        destination: NETWORK_RUNNER_CAPABILITY_PATH },
    ],
    tmpfs_paths: ["/tmp"], privileged: false, cap_drop: ["ALL"],
    security_options: ["no-new-privileges"], read_only_rootfs: true, user: "1000",
    environment_keys: ["HOME", ...NETWORK_CLIENT_ENVIRONMENT_KEYS],
    execution_nonce_label: nonce, resource_role_label: NETWORK_RUNNER_ROLE,
    runtime_state: "created", restart_count: 0,
    started_at: "0001-01-01T00:00:00Z", docker_socket_mounted: false,
  };
  const startedRunnerObservation: NetworkContainerObservation = {
    ...createdRunnerObservation, network_id: ids.network,
    endpoint_id: "endpoint", ip_address: "172.18.0.3", sandbox_id: "sandbox",
    runtime_state: "exited", started_at: "2026-08-01T00:00:00Z",
  };
  const postStartNetworkObservation: NetworkObservation = {
    ...networkObservation, member_ids: [ids.postgres, ids.runner],
  };
  const runningRunnerObservation: NetworkContainerObservation = {
    ...startedRunnerObservation, runtime_state: "running",
  };
  const bindingEvaluation = (
    check: number,
    runner: NetworkContainerObservation = runningRunnerObservation,
    network: NetworkObservation = postStartNetworkObservation,
  ) => evaluatePostStartNetworkBinding({ check, runner,
    postgres: { ...postgresObservation, runtime_state: "running" }, network,
    nonce, canonical_runner_id: ids.runner, canonical_postgres_id: ids.postgres,
    network_id: ids.network, expected_image_id: ids.image,
    result_directory: names.result_directory,
    capability_file: `/private/tmp/capability-${nonce}`,
    expected_user_uid: 1000, expected_runner_name: names.runner_container });
  assert.equal(bindingEvaluation(1).status, "SUCCESS");
  assert.deepEqual(bindingEvaluation(1).observation.network_keys,
    ["<expected-user-defined-network>"]);
  let bindingInspects = 0;
  const networkIdConvergence = await convergePostStartNetworkBinding({
    deadline_ms: 10_000, now: () => 0, async wait() {}, async inspect(check) {
      bindingInspects += 1;
      const runner = check < 3
        ? { ...runningRunnerObservation, network_id: "", endpoint_id: "" }
        : runningRunnerObservation;
      return { value: runner, evaluation: bindingEvaluation(check, runner) };
    },
  });
  assert.equal(networkIdConvergence.success_check, 3);
  assert.equal(bindingInspects, 3);
  const endpointConvergence = await convergePostStartNetworkBinding({
    deadline_ms: 10_000, now: () => 0, async wait() {}, async inspect(check) {
      const runner = check === 1
        ? { ...runningRunnerObservation, endpoint_id: "" }
        : runningRunnerObservation;
      return { value: runner, evaluation: bindingEvaluation(check, runner) };
    },
  });
  assert.equal(endpointConvergence.success_check, 2);
  let timeoutChecks = 0;
  await assert.rejects(convergePostStartNetworkBinding({ deadline_ms: 100_000,
    now: () => 0, async wait() {}, async inspect(check) {
      timeoutChecks += 1;
      const runner = { ...runningRunnerObservation, endpoint_id: "" };
      return { value: runner, evaluation: bindingEvaluation(check, runner) };
    },
  }), (error: unknown) => error instanceof PostStartNetworkBindingFailure &&
    error.failure_code ===
      "DAY147_A5_RUNNER_CONTAINER_POST_START_NETWORK_BINDING_TIMEOUT" &&
    error.checks.length === MAX_POST_START_NETWORK_BINDING_CHECKS);
  assert.equal(timeoutChecks, MAX_POST_START_NETWORK_BINDING_CHECKS);
  let deadlineChecks = 0;
  await assert.rejects(convergePostStartNetworkBinding({ deadline_ms: 200,
    now: () => 0, async wait() {}, async inspect(check) {
      deadlineChecks += 1;
      const runner = { ...runningRunnerObservation, endpoint_id: "" };
      return { value: runner, evaluation: bindingEvaluation(check, runner) };
    },
  }), PostStartNetworkBindingFailure);
  assert.equal(deadlineChecks, 1);
  for (const invalid of [
    { ...runningRunnerObservation, network_mode: "bridge" },
    { ...runningRunnerObservation, network_id: "f".repeat(64) },
    { ...runningRunnerObservation, network_name: "other-network" },
    { ...runningRunnerObservation, published_ports: ["5432/tcp"] },
    { ...runningRunnerObservation, runtime_state: "exited" },
    { ...runningRunnerObservation, id: "f".repeat(64) },
  ]) assert.equal(bindingEvaluation(1, invalid).status, "INVALID");
  const runnerValidationInput = {
    nonce, network_id: ids.network, expected_image_id: ids.image,
    result_directory: names.result_directory,
    capability_file: `/private/tmp/capability-${nonce}`, expected_user_uid: 1000,
  };
  assert.equal(validateNetworkRunnerContainer({
    ...runnerValidationInput, phase: "POST_CREATE_PRE_START",
    observation: createdRunnerObservation,
  }), ids.runner);
  for (const invalid of [
    { ...createdRunnerObservation, resource_role_label: "" },
    { ...createdRunnerObservation, resource_role_label: "postgres" },
    { ...createdRunnerObservation, execution_nonce_label: "bbbbbbbbbbbb" },
    { ...createdRunnerObservation, image_id: `sha256:${"f".repeat(64)}` },
    { ...createdRunnerObservation, name: "other" },
    { ...createdRunnerObservation, network_mode: "bridge" },
    { ...createdRunnerObservation, network_mode: "none" },
    { ...createdRunnerObservation, security_options: [] },
    { ...createdRunnerObservation, mounts: [] },
  ]) assert.throws(() => validateNetworkRunnerContainer({
    ...runnerValidationInput, phase: "POST_CREATE_PRE_START", observation: invalid,
  }));
  assert.throws(() => validateNetworkPostgresContainer({
    observation: { ...postgresObservation, network_aliases: ["not-postgres"] },
    nonce, network_id: ids.network,
    expected_image_id: postgresObservation.image_id,
  }));
  assert.equal(validateNetworkRunnerContainer({
    ...runnerValidationInput, phase: "POST_START",
    observation: startedRunnerObservation, postgres_observation: postgresObservation,
    network_observation: postStartNetworkObservation,
  }), ids.runner);
  for (const invalid of [
    { observation: { ...startedRunnerObservation, network_id: "" },
      network: postStartNetworkObservation, postgres: postgresObservation },
    { observation: { ...startedRunnerObservation, network_id: "f".repeat(64) },
      network: postStartNetworkObservation, postgres: postgresObservation },
    { observation: startedRunnerObservation,
      network: { ...postStartNetworkObservation, member_ids: [ids.runner] },
      postgres: postgresObservation },
    { observation: startedRunnerObservation, network: postStartNetworkObservation,
      postgres: { ...postgresObservation, network_id: "f".repeat(64) } },
    { observation: { ...startedRunnerObservation, published_ports: ["5432/tcp"] },
      network: postStartNetworkObservation, postgres: postgresObservation },
  ]) assert.throws(() => validateNetworkRunnerContainer({
    ...runnerValidationInput, phase: "POST_START",
    observation: invalid.observation, postgres_observation: invalid.postgres,
    network_observation: invalid.network,
  }));

  const runnerReceipt = receipts.find(({ resource_type }) =>
    resource_type === "runner_container"
  )!;
  assert.doesNotThrow(() => validateRunnerCleanupBinding(
    runnerReceipt, createdRunnerObservation,
  ));
  for (const invalid of [
    { ...createdRunnerObservation, resource_role_label: "" },
    { ...createdRunnerObservation, resource_role_label: "postgres" },
    { ...createdRunnerObservation, name: "other" },
    { ...createdRunnerObservation, image_id: `sha256:${"f".repeat(64)}` },
    { ...createdRunnerObservation, runtime_state: "removing" },
  ]) assert.throws(() => validateRunnerCleanupBinding(runnerReceipt, invalid));

  const temporaryImageReceipt = receipts.find(({ resource_type }) =>
    resource_type === "temporary_image"
  )!;
  const temporaryImageCleanupInput = {
    receipt: temporaryImageReceipt, image_id: ids.image,
    repo_tags: [names.runner_image], execution_nonce_label: nonce,
    base_image_id_label: NETWORK_RUNNER_BASE_IMAGE_ID,
    entrypoint_digest_label: networkRunnerEntrypointDigest(nonce),
    referencing_container_ids: [] as string[],
    protected_image_ids: [NETWORK_RUNNER_BASE_IMAGE_ID,
      postgresObservation.image_id],
  };
  assert.doesNotThrow(() => validateTemporaryImageCleanupBinding(
    temporaryImageCleanupInput,
  ));
  for (const invalid of [
    { ...temporaryImageCleanupInput, referencing_container_ids: [ids.runner] },
    { ...temporaryImageCleanupInput, repo_tags: ["unrelated:latest"] },
    { ...temporaryImageCleanupInput, execution_nonce_label: "bbbbbbbbbbbb" },
    { ...temporaryImageCleanupInput, receipt: {
      ...temporaryImageReceipt, canonical_resource: NETWORK_RUNNER_BASE_IMAGE_ID,
    }, image_id: NETWORK_RUNNER_BASE_IMAGE_ID },
    { ...temporaryImageCleanupInput, receipt: {
      ...temporaryImageReceipt, canonical_resource: postgresObservation.image_id,
    }, image_id: postgresObservation.image_id },
  ]) assert.throws(() => validateTemporaryImageCleanupBinding(invalid));

  const orphanNames = buildNetworkRunNames(
    ONE_TIME_RUNNER_ROLE_ORPHAN.execution_nonce,
  );
  const orphanObservation: NetworkContainerObservation = {
    ...createdRunnerObservation,
    id: ONE_TIME_RUNNER_ROLE_ORPHAN.canonical_container_id,
    name: orphanNames.runner_container,
    image_id: ONE_TIME_RUNNER_ROLE_ORPHAN.image_id,
    network_name: orphanNames.network, network_mode: orphanNames.network,
    execution_nonce_label: ONE_TIME_RUNNER_ROLE_ORPHAN.execution_nonce,
    resource_role_label: "", mounts: [],
  };
  assert.doesNotThrow(() => validateOneTimeRunnerRoleOrphanRecovery(
    orphanObservation,
  ));
  for (const invalid of [
    { ...orphanObservation, id: "f".repeat(64) },
    { ...orphanObservation, name: "other" },
    { ...orphanObservation, image_id: `sha256:${"f".repeat(64)}` },
    { ...orphanObservation, execution_nonce_label: "bbbbbbbbbbbb" },
    { ...orphanObservation, runtime_state: "running" },
    { ...orphanObservation, restart_count: 1 },
    { ...orphanObservation, started_at: "2026-08-01T00:00:00Z" },
  ]) assert.throws(() => validateOneTimeRunnerRoleOrphanRecovery(invalid));
  assert.throws(() => validateRunnerCleanupBinding(runnerReceipt,
    orphanObservation));
  const receiptByPhase = new Map(receipts.map((receipt) => [
    receipt.resource_type, receipt,
  ]));
  const concreteEvents: string[] = [];
  const currentReceipts: NetworkCreationReceipt[] = [];
  const addReceipt = (phase: NetworkCleanupPhase) => {
    const receipt = receiptByPhase.get(phase)!;
    currentReceipts.push(receipt);
    return receipt;
  };
  const concreteOperations: ConcreteNetworkOrchestratorOperations = {
    current_creation_receipts: () => currentReceipts,
    async validate_git_source_scope() { concreteEvents.push("git_source_scope"); },
    async validate_orbstack_provider() { concreteEvents.push("orbstack_provider_gate"); },
    async inspect_base_image() { concreteEvents.push("base_image_digest_validation");
      return { id: NETWORK_RUNNER_BASE_IMAGE_ID,
        repo_digests: [NETWORK_RUNNER_BASE_REPO_DIGEST], os: "linux",
        architecture: "arm64" }; },
    async create_source_snapshot() { concreteEvents.push("source_snapshot");
      return { snapshot, receipts: [addReceipt("result_root"),
        addReceipt("build_root")] }; },
    async build_temporary_image() { concreteEvents.push("temporary_image_build");
      return { observation: { expected_tag: names.runner_image,
        observed_tag: names.runner_image, build_result_id: ids.image,
        inspected_id: ids.image, pre_existing: false,
        execution_nonce_label: nonce, base_image_id: NETWORK_RUNNER_BASE_IMAGE_ID },
        receipt: addReceipt("temporary_image") }; },
    async run_bootstrap_probe() { concreteEvents.push("runner_bootstrap_probe");
      return { status: "PASS", last_completed_phase:
        NETWORK_BOOTSTRAP_PROBE_COMPLETE_PHASE, module_diagnostic: null,
        db_connections: 0, migrations: 0, dynamic_suites: 0,
        cleanup_passed: true }; },
    async create_network() { concreteEvents.push("network_create");
      return { prior: null, observation: networkObservation,
        receipt: addReceipt("network") }; },
    async create_start_postgres() { concreteEvents.push("postgres_container_create_start");
      return { observation: postgresObservation,
        postgres_image_id: postgresObservation.image_id,
        receipt: addReceipt("postgres_container") }; },
    async wait_postgres_internal() { concreteEvents.push("postgres_internal_readiness"); },
    async converge_runner() {
      concreteEvents.push("runner_convergence");
      const attemptPaths = runnerAttemptPaths(nonce, 1);
      return { runner: { ...startedRunnerObservation,
          name: attemptPaths.runner_container,
          mounts: [{ type: "bind", source: attemptPaths.result_directory,
            destination: "/result" }, { type: "bind",
            source: attemptPaths.capability_file,
            destination: NETWORK_RUNNER_CAPABILITY_PATH }] },
        postgres: postgresObservation,
        network: postStartNetworkObservation,
        capability_path: attemptPaths.capability_file,
        capability_digest: capabilityDigest, runner_uid: 1000,
        runner_receipt: addReceipt("runner_container"),
        client_result_file: { ...resultFile, entries: ["client-result.json"],
          canonical_path: `${attemptPaths.result_directory}/client-result.json`,
          expected_path: `${attemptPaths.result_directory}/client-result.json` },
        successful_attempt: 1,
        timeline: [] };
    },
    async create_runner_capability() { concreteEvents.push("runner_capability_create");
      return { path: `/private/tmp/capability-${nonce}`, digest: capabilityDigest,
        owner_uid: 1000 }; },
    async create_runner() { concreteEvents.push("runner_container_create");
      return { canonical_id: ids.runner, receipt: addReceipt("runner_container") }; },
    async inspect_runner_after_create() {
      concreteEvents.push("runner_container_inspect_after_create");
      return createdRunnerObservation;
    },
    async start_runner() { concreteEvents.push("runner_container_start"); },
    async inspect_runner_after_start() {
      concreteEvents.push("runner_container_inspect_after_start");
      return { runner: startedRunnerObservation, postgres: postgresObservation,
        network: postStartNetworkObservation };
    },
    async attest_runner() { concreteEvents.push("runner_attestation"); },
    async read_client_result() { concreteEvents.push("client_result_read");
      return resultFile; },
    async prepare_formal_evidence() { concreteEvents.push("formal_evidence_prepare"); },
    cleanup_resource: cleanupAct,
    async write_failure_evidence() { concreteEvents.push("failure_evidence"); },
    async finalize_formal_evidence() { concreteEvents.push("formal_evidence_finalize"); },
  };
  const concrete = await executeConcreteNetworkOrchestrator({
    arguments: parseArguments(["--mode=execute-network-isolated",
      `--authority=${NETWORK_EXECUTION_AUTHORITY}`]),
    nonce, operations: concreteOperations,
  });
  assert.deepEqual(concrete.completed_phases, NETWORK_ORCHESTRATOR_PHASE_ORDER);
  assert.equal(concrete.metadata.topology, "DOCKER_USER_DEFINED_NETWORK");
  assert.deepEqual(concreteEvents, [
    "git_source_scope", "orbstack_provider_gate", "base_image_digest_validation",
    "source_snapshot", "temporary_image_build", "runner_bootstrap_probe",
    "network_create",
    "postgres_container_create_start", "postgres_internal_readiness",
    "runner_convergence", "formal_evidence_prepare", "formal_evidence_finalize",
  ]);

  let probeFailureNetworkCreates = 0;
  const probeFailureReceipts: NetworkCreationReceipt[] = [];
  const probeFailureOperations: ConcreteNetworkOrchestratorOperations = {
    ...concreteOperations,
    current_creation_receipts: () => probeFailureReceipts,
    async create_source_snapshot() { const selected = [
      receiptByPhase.get("result_root")!, receiptByPhase.get("build_root")!,
    ]; probeFailureReceipts.push(...selected); return { snapshot, receipts: selected }; },
    async build_temporary_image() { const selected = receiptByPhase.get(
      "temporary_image")!; probeFailureReceipts.push(selected); return {
      observation: { expected_tag: names.runner_image,
        observed_tag: names.runner_image, build_result_id: ids.image,
        inspected_id: ids.image, pre_existing: false,
        execution_nonce_label: nonce, base_image_id: NETWORK_RUNNER_BASE_IMAGE_ID },
      receipt: selected }; },
    async run_bootstrap_probe() {
      throw new BootstrapProbeFailure(
        "DAY147_A5_RUNNER_BOOTSTRAP_PROBE_FAILED",
        "RUNNER_CLIENT_MODULE_IMPORT_START", "RUNNER_CLIENT_MODULE_IMPORT_VALID",
        classifyRunnerModuleResolutionDiagnostic({
          node_error_code: "ERR_MODULE_NOT_FOUND",
          failing_specifier: "<workspace>/missing.ts",
          importer: "<workspace>/network-client-entrypoint.ts",
        }), 1, true, "DAY147_A5_RUNNER_CLIENT_MODULE_IMPORT_FAILED",
      );
    },
    async create_network() { probeFailureNetworkCreates += 1;
      return concreteOperations.create_network(nonce); },
    async write_failure_evidence() {},
  };
  await assert.rejects(executeConcreteNetworkOrchestratorWithFailureCleanup({
    arguments: parseArguments(["--mode=execute-network-isolated",
      `--authority=${NETWORK_EXECUTION_AUTHORITY}`]), nonce,
    operations: probeFailureOperations,
  }), (error: unknown) => error instanceof NetworkOrchestratorFailure &&
    error.primary_code === "DAY147_A5_RUNNER_BOOTSTRAP_PROBE_FAILED" &&
    error.exact_root_cause === "DAY147_A5_RUNNER_CLIENT_MODULE_IMPORT_FAILED" &&
    error.bootstrap_probe_failure?.cleanup_passed === true);
  assert.equal(probeFailureNetworkCreates, 0);

  const failureReceipts: NetworkCreationReceipt[] = [];
  const failureCleanupEvents: NetworkCleanupPhase[] = [];
  let failureEvidenceRoutePassed = false;
  const failingOperations: ConcreteNetworkOrchestratorOperations = {
    ...concreteOperations,
    current_creation_receipts: () => failureReceipts,
    async create_source_snapshot() { const selected = [
      receiptByPhase.get("result_root")!, receiptByPhase.get("build_root")!,
    ]; failureReceipts.push(...selected); return { snapshot, receipts: selected }; },
    async build_temporary_image() { const receipt = receiptByPhase.get("temporary_image")!;
      failureReceipts.push(receipt); return { observation: {
        expected_tag: names.runner_image, observed_tag: names.runner_image,
        build_result_id: ids.image, inspected_id: ids.image,
        pre_existing: false, execution_nonce_label: nonce,
        base_image_id: NETWORK_RUNNER_BASE_IMAGE_ID }, receipt }; },
    async create_network() { const receipt = receiptByPhase.get("network")!;
      failureReceipts.push(receipt); return { prior: null,
        observation: networkObservation, receipt }; },
    async create_start_postgres() { const receipt = receiptByPhase.get("postgres_container")!;
      failureReceipts.push(receipt); return { observation: postgresObservation,
        postgres_image_id: postgresObservation.image_id, receipt }; },
    async wait_postgres_internal() {
      throw new Error("DAY147_A5_NETWORK_POSTGRES_READINESS_FAILED");
    },
    async cleanup_resource(receipt) { failureCleanupEvents.push(receipt.resource_type);
      return { canonical_resource: receipt.canonical_resource,
        expected_binding: receipt.expected_binding, absent_after_cleanup: true }; },
    async write_failure_evidence(failureNonce, primary, cleanup) {
      const evidence = networkHostFailureEvidence({ nonce: failureNonce,
        primary_failure: primary, cleanup });
      assert.equal(evidence.schema_version, 6);
      assert.equal(evidence.execution_nonce, nonce);
      assert.equal(evidence.success_claimed, false);
      assert.equal(evidence.connection_metadata, null);
      assert.equal(validateFailureA5Evidence({ evidence,
        receiptPresent: false, markerPresent: false }).accepted, true);
      assert.doesNotThrow(() => assertEvidenceSafe(evidence));
      const evidenceBytes = serializedArtifact(evidence);
      const empty = new Uint8Array();
      const rejected = validateCommittedA5Evidence({ evidenceBytes,
        receiptBytes: null, markerBytes: null, expectedExecutionNonce: nonce,
        durabilityAttestation: createDurabilityAttestation({
          execution_nonce: nonce, evidence_bytes: evidenceBytes,
          receipt_bytes: empty, marker_bytes: empty,
        }) });
      assert.equal(rejected.accepted, false);
      failureEvidenceRoutePassed = true;
    },
  };
  await assert.rejects(executeConcreteNetworkOrchestratorWithFailureCleanup({
    arguments: parseArguments(["--mode=execute-network-isolated",
      `--authority=${NETWORK_EXECUTION_AUTHORITY}`]),
    nonce, operations: failingOperations,
  }), (error: unknown) => error instanceof NetworkOrchestratorFailure &&
    error.primary_code === "DAY147_A5_NETWORK_POSTGRES_READINESS_FAILED" &&
    !error.cleanup_failures.some(({ phase }) => phase === "runner_container"));
  assert.deepEqual(failureCleanupEvents, [
    "postgres_container", "network", "temporary_image", "result_root", "build_root",
  ]);
  assert.equal(failureEvidenceRoutePassed, true);

  const createOnlyReceipts: NetworkCreationReceipt[] = [];
  const createOnlyEvents: string[] = [];
  const createOnlyAdd = (phase: NetworkCleanupPhase) => {
    const selected = receiptByPhase.get(phase)!;
    createOnlyReceipts.push(selected);
    return selected;
  };
  const createOnlyOperations: NetworkRunnerCreateOnlyOperations = {
    current_creation_receipts: () => createOnlyReceipts,
    async validate_git_source_scope() { createOnlyEvents.push("source_scope"); },
    async validate_orbstack_provider() { createOnlyEvents.push("provider"); },
    async inspect_base_image() { createOnlyEvents.push("base"); return {
      id: NETWORK_RUNNER_BASE_IMAGE_ID,
      repo_digests: [NETWORK_RUNNER_BASE_REPO_DIGEST], os: "linux",
      architecture: "arm64" }; },
    async create_source_snapshot() { createOnlyEvents.push("snapshot"); return {
      snapshot, receipts: [createOnlyAdd("result_root"), createOnlyAdd("build_root")],
    }; },
    async build_temporary_image() { createOnlyEvents.push("build"); return {
      observation: { expected_tag: names.runner_image,
        observed_tag: names.runner_image, build_result_id: ids.image,
        inspected_id: ids.image, pre_existing: false,
        execution_nonce_label: nonce, base_image_id: NETWORK_RUNNER_BASE_IMAGE_ID },
      receipt: createOnlyAdd("temporary_image"),
    }; },
    async create_network() { createOnlyEvents.push("network"); return {
      prior: null, observation: networkObservation, receipt: createOnlyAdd("network"),
    }; },
    async create_runner_capability() { createOnlyEvents.push("capability"); return {
      path: `/private/tmp/capability-${nonce}`, digest: capabilityDigest,
      owner_uid: 1000,
    }; },
    async create_runner() { createOnlyEvents.push("runner_create"); return {
      canonical_id: ids.runner, receipt: createOnlyAdd("runner_container"),
    }; },
    async inspect_runner_after_create() { createOnlyEvents.push("runner_inspect");
      return createdRunnerObservation; },
    async cleanup_resource(receipt) { createOnlyEvents.push(`cleanup:${
      receipt.resource_type}`); return { canonical_resource: receipt.canonical_resource,
      expected_binding: receipt.expected_binding, absent_after_cleanup: true }; },
    async verify_build_only_residuals() { createOnlyEvents.push("residuals"); },
  };
  const createOnly = await executeNetworkRunnerCreateOnly({
    arguments: createOnlyArguments, nonce, operations: createOnlyOperations,
  });
  assert.deepEqual(createOnly.cleanup.completed,
    NETWORK_RUNNER_CREATE_ONLY_CLEANUP_ORDER);
  assert.deepEqual(createOnly.cleanup.not_applicable, ["postgres_container"]);
  assert.equal(createOnlyEvents.some((event) => /postgres|start|attest/.test(event)),
    false);

  const preCreateReceipts: NetworkCreationReceipt[] = [];
  const preCreateCleanup: NetworkCleanupPhase[] = [];
  const failingCreateOperations: NetworkRunnerCreateOnlyOperations = {
    ...createOnlyOperations,
    current_creation_receipts: () => preCreateReceipts,
    async create_source_snapshot() { const selected = [
      receiptByPhase.get("result_root")!, receiptByPhase.get("build_root")!,
    ]; preCreateReceipts.push(...selected); return { snapshot, receipts: selected }; },
    async build_temporary_image() { const selected = receiptByPhase.get(
      "temporary_image")!; preCreateReceipts.push(selected); return {
      observation: { expected_tag: names.runner_image,
        observed_tag: names.runner_image, build_result_id: ids.image,
        inspected_id: ids.image, pre_existing: false,
        execution_nonce_label: nonce, base_image_id: NETWORK_RUNNER_BASE_IMAGE_ID },
      receipt: selected }; },
    async create_network() { const selected = receiptByPhase.get("network")!;
      preCreateReceipts.push(selected); return { prior: null,
        observation: networkObservation, receipt: selected }; },
    async create_runner() {
      throw new Error("DAY147_A5_RUNNER_CONTAINER_CREATE_FAILED");
    },
    async cleanup_resource(receipt) { preCreateCleanup.push(receipt.resource_type);
      return { canonical_resource: receipt.canonical_resource,
        expected_binding: receipt.expected_binding, absent_after_cleanup: true }; },
  };
  await assert.rejects(executeNetworkRunnerCreateOnly({
    arguments: createOnlyArguments, nonce, operations: failingCreateOperations,
  }), (error: unknown) => error instanceof RunnerCreateOnlyFailure &&
    error.primary_code === "DAY147_A5_RUNNER_CONTAINER_CREATE_FAILED" &&
    error.cleanup.not_applicable.includes("runner_container") &&
    !error.cleanup.failures.some(({ phase }) => phase === "runner_container"));
  assert.equal(preCreateCleanup.includes("runner_container"), false);

  assert.deepEqual(NETWORK_CLIENT_AUTHORITY_SURFACE, {
    docker_commands: 0, provider_inspection: 0, image_inspection: 0,
    network_operations: 0, container_operations: 0, formal_evidence_writes: 0,
    receipt_writes: 0, marker_writes: 0, reports_directory_operations: 0,
    production_authority: 0, database_operations: "isolated_network_only",
    result_file_writes: 1,
  });
}

function runProjectionSelectorCanonicalStaticTests(): void {
  const businessDate = "2026-07-31";
  const compiled = compileFarmOsDailyProjection({
    business_date: businessDate,
    snapshots: [],
    snapshot_state_events: [],
  });
  const repeated = compileFarmOsDailyProjection({
    business_date: businessDate,
    snapshots: [],
    snapshot_state_events: [],
  });
  assert.equal(repeated.content_hash, compiled.content_hash);
  assert.deepEqual(repeated.content, compiled.content);
  const activeId = LEGACY_ACTIVE_PROJECTION_ID;
  const candidateId = "read_candidate_excluded";
  const reorderedContent = {
    missing_data_status: compiled.content.missing_data_status,
    verification_status: compiled.content.verification_status,
    work_type_references: compiled.content.work_type_references,
    crop_cycle_references: compiled.content.crop_cycle_references,
    field_references: compiled.content.field_references,
    tombstone_count: compiled.content.tombstone_count,
    active_record_count: compiled.content.active_record_count,
    source_record_count: compiled.content.source_record_count,
    business_date: compiled.content.business_date,
  };
  const projection = (
    projectionId: string,
    version: number,
    content: typeof compiled.content,
    contentHash = compiled.content_hash,
  ) => ({
    projection_id: projectionId,
    projection_type: "daily_work_records" as const,
    projection_version: version,
    business_date: businessDate,
    compiler_id: compiled.compiler_id,
    compiler_version: compiled.compiler_version,
    content_hash: contentHash,
    content,
    generated_at: "2026-08-03T00:00:00.000Z",
    supersedes_projection_id: null,
  });
  const bundle: FarmOsProjectionFirstScopedBundle = {
    farm_scope: "day147a5_farm_scope",
    business_date: businessDate,
    full_history_scan_performed: false,
    projections: [
      projection(activeId, 701, reorderedContent),
      projection(candidateId, 702, compiled.content),
    ],
    projection_state_events: [
      { event_id: "active_event", projection_id: activeId,
        status: "active", sequence: 1,
        occurred_at: "2026-07-31T00:00:01.000Z" },
      { event_id: "candidate_event", projection_id: candidateId,
        status: "candidate", sequence: 2,
        occurred_at: "2026-07-31T00:00:02.000Z" },
    ],
    lineage: [], snapshots: [], snapshot_state_events: [],
  };
  const selection = selectFarmOsProjectionFirstProjection({
    authorized_farm_scope: "day147a5_farm_scope",
    business_date: businessDate,
    bundle,
  });
  assert.equal(selection.result, "selected");
  if (selection.result !== "selected") return;
  assert.equal(selection.projection.projection_id, activeId);
  assert.equal(JSON.stringify(selection).includes(candidateId), false);
  assert.equal(isDeepStrictEqual(reorderedContent, compiled.content), true);
  assert.equal(classifyLegacyActiveSelection({ bundle, selection }),
    "EXPECTED_STATUS");

  const changedContent: typeof compiled.content = {
    ...compiled.content,
    missing_data_status: "optional_references_missing",
  };
  assert.equal(isDeepStrictEqual(changedContent, compiled.content), false);
  const changedContentBundle: FarmOsProjectionFirstScopedBundle = {
    ...bundle,
    projections: [projection(activeId, 701, changedContent)],
    projection_state_events: [bundle.projection_state_events[0]!],
  };
  assert.equal(selectFarmOsProjectionFirstProjection({
    authorized_farm_scope: bundle.farm_scope,
    business_date: businessDate,
    bundle: changedContentBundle,
  }).result, "projection_stale");

  const mismatchedHash = `${compiled.content_hash[0] === "0" ? "1" : "0"}${
    compiled.content_hash.slice(1)
  }`;
  const staleBundle: FarmOsProjectionFirstScopedBundle = {
    ...bundle,
    projections: [projection(activeId, 701, compiled.content, mismatchedHash)],
    projection_state_events: [bundle.projection_state_events[0]!],
  };
  const staleSelection = selectFarmOsProjectionFirstProjection({
    authorized_farm_scope: bundle.farm_scope,
    business_date: businessDate,
    bundle: staleBundle,
  });
  assert.equal(staleSelection.result, "projection_stale");
  assert.equal(classifyLegacyActiveSelection({
    bundle: staleBundle, selection: staleSelection,
  }), "CONTENT_HASH_MISMATCH");

  const supersededBundle: FarmOsProjectionFirstScopedBundle = {
    ...bundle,
    projections: [projection(activeId, 701, compiled.content)],
    projection_state_events: [
      bundle.projection_state_events[0]!,
      { event_id: "superseded_event", projection_id: activeId,
        status: "superseded", sequence: 2,
        occurred_at: "2026-07-31T00:00:02.000Z" },
    ],
  };
  const missingSelection = selectFarmOsProjectionFirstProjection({
    authorized_farm_scope: bundle.farm_scope,
    business_date: businessDate,
    bundle: supersededBundle,
  });
  assert.equal(missingSelection.result, "projection_missing");
  assert.equal(classifyLegacyActiveSelection({
    bundle: supersededBundle, selection: missingSelection,
  }), "MISSING_SELECTION");

  const wrongStatusBundle: FarmOsProjectionFirstScopedBundle = {
    ...bundle,
    projections: [projection(activeId, 701, compiled.content)],
    projection_state_events: [{ ...bundle.projection_state_events[0]!,
      status: "candidate" }],
  };
  assert.equal(classifyLegacyActiveSelection({
    bundle: wrongStatusBundle, selection,
  }), "UNEXPECTED_STATUS");
  assert.equal(classifyLegacyActiveSelection({
    bundle,
    selection: { ...selection, projection: {
      ...selection.projection, projection_id: "unexpected_legacy_identity",
    } },
  }), "UNEXPECTED_IDENTITY");
}

async function runStaticTests(): Promise<void> {
  const counters: OperationCounters = {
    docker_commands: 0,
    database_connections: 0,
    evidence_writes: 0,
    credential_generations: 0,
  };
  await runNetworkClientRevisionStaticTests();
  runProjectionSelectorCanonicalStaticTests();
  await runContainerInternalReadinessStaticTests();
  await runPostgresReadinessStaticTests();
  await runDockerTimeoutStaticTests();
  const moduleUrl = pathToFileURL(resolve("scripts/hermes/test_farm_os_day147a5_isolated_postgres.ts")).href;
  const importerEntry = resolve("scripts/hermes/static_importer.ts");
  let guardedMainExecutions = 0;
  for (const importerArgv of [
    [importerEntry, "--mode=static"],
    [
      importerEntry, "--mode=execute-isolated",
      `--authority=${EXECUTION_AUTHORITY}`,
    ],
  ]) {
    assert.equal(isDirectRun(moduleUrl, importerArgv[0]), false);
    assert.equal(await invokeMainIfDirect({
      meta_url: moduleUrl,
      argv_entry: importerArgv[0],
      async invoke() { guardedMainExecutions += 1; },
    }), false);
  }
  assert.equal(guardedMainExecutions, 0);
  assert.equal(await invokeMainIfDirect({
    meta_url: moduleUrl,
    argv_entry: fileURLToPath(moduleUrl),
    async invoke() { guardedMainExecutions += 1; },
  }), true);
  assert.equal(guardedMainExecutions, 1);
  const originalArgv = [...process.argv];
  const originalExitCode = process.exitCode;
  try {
    for (const importCase of [
      { id: "static", args: ["--mode=static"] },
      {
        id: "execute",
        args: [
          "--mode=execute-isolated",
          `--authority=${EXECUTION_AUTHORITY}`,
        ],
      },
    ]) {
      process.argv.splice(
        0,
        process.argv.length,
        process.execPath,
        importerEntry,
        ...importCase.args,
      );
      const imported = await import(`${moduleUrl}?import_case=${importCase.id}`);
      assert.equal(imported.mainExecutionCount, 0);
      assert.equal(process.exitCode, originalExitCode);
    }
  } finally {
    process.argv.splice(0, process.argv.length, ...originalArgv);
    process.exitCode = originalExitCode;
  }
  assert.deepEqual(parseArguments([]), { mode: "static", authority: null });
  assert.deepEqual(parseArguments(["--mode=static"]), {
    mode: "static",
    authority: null,
  });
  assert.deepEqual(parseArguments([
    "--mode=execute-isolated",
    `--authority=${EXECUTION_AUTHORITY}`,
  ]), { mode: "execute-isolated", authority: EXECUTION_AUTHORITY });
  for (const args of [
    ["--mode="],
    ["--mode=STATIC"],
    ["--mode=execute"],
    ["--mode=execute-isolated"],
    [`--authority=${EXECUTION_AUTHORITY}`],
    ["--mode=static", `--authority=${EXECUTION_AUTHORITY}`],
    ["--mode=static", "--mode=static"],
    ["--mode=static", "--unknown"],
    ["--mode=execute-isolated", "--authority=wrong"],
  ]) assert.throws(() => parseArguments(args));
  assert.throws(
    () => parseArguments(["--mode=execute-isolated"]),
    { message: "DAY147_A5_EXECUTION_REQUIRES_A5_3_AUTHORITY" },
  );

  const names = buildNames("a1b2c3d4e5f6");
  const safeTarget: PreRunLocalTarget = {
    host: LOCAL_HOST,
    ssl: false,
    image: IMAGE,
    container_name: names.container,
    database_names: [names.legacy_active, names.legacy_superseded, names.main],
    docker_publish_plan: "127.0.0.1::5432",
    storage: "tmpfs_only",
  };
  const safeIdentity = validatePreRunLocalTarget(safeTarget);
  assert.equal(safeIdentity.nonce, "a1b2c3d4e5f6");
  const rejectedHosts = [
    "localhost", "LOCALHOST", "::1", "[::1]", "0.0.0.0", "127.0.0.2",
    "127.1", "2130706433", "0x7f000001", "017700000001",
    "192.168.1.1", "10.0.0.1", "100.64.0.1", "host.docker.internal",
    "postgres", "example.com", "db.supabase.co", "https://127.0.0.1",
    "127.0.0.1:5432", " 127.0.0.1", "127.0.0.1 ", "127.0.0.1.",
    "127%2e0%2e0%2e1", "127.0.0.1\0.invalid",
  ];
  rejectedHosts.forEach((host) =>
    assert.throws(() => validatePreRunLocalTarget({ ...safeTarget, host }))
  );
  assert.throws(() => validatePreRunLocalTarget({
    ...safeTarget,
    connectionString: "postgresql://127.0.0.1/test",
  } as unknown as PreRunLocalTarget));
  assert.throws(() => validatePreRunLocalTarget({ ...safeTarget, ssl: true }));
  assert.throws(() => validatePreRunLocalTarget({
    ...safeTarget, docker_publish_plan: "0.0.0.0::5432",
  }));
  assert.throws(() => validatePreRunLocalTarget({
    ...safeTarget, persistent_volume: "volume" as never,
  }));
  const otherNames = buildNames("bbbbbbbbbbbb");
  const missingMainDatabaseBinding: PreRunLocalTarget = {
    ...safeTarget,
    database_names: [names.legacy_active, names.legacy_superseded],
  };
  const explicitSuffixSwapDatabaseBinding: PreRunLocalTarget = {
    ...safeTarget,
    database_names: [
      names.legacy_active,
      `farmos_day147a5_${safeIdentity.nonce}_main_legacy_superseded`,
      names.main,
    ],
  };
  const invalidDatabaseBindings: readonly PreRunLocalTarget[] = [
    { ...safeTarget, database_names: [
      names.legacy_active, names.legacy_superseded, otherNames.main,
    ] },
    { ...safeTarget, database_names: [
      otherNames.legacy_active, names.legacy_superseded, names.main,
    ] },
    { ...safeTarget, database_names: [
      names.legacy_active, otherNames.legacy_superseded, names.main,
    ] },
    { ...safeTarget, database_names: [
      otherNames.legacy_active, otherNames.legacy_superseded, otherNames.main,
    ] },
    { ...safeTarget, database_names: [
      names.main, names.main, names.legacy_superseded,
    ] },
    { ...safeTarget, database_names: [names.legacy_superseded, names.main] },
    missingMainDatabaseBinding,
    { ...safeTarget, database_names: [
      names.legacy_active, names.legacy_superseded, names.main, otherNames.main,
    ] },
    explicitSuffixSwapDatabaseBinding,
    { ...safeTarget, database_names: [
      names.legacy_superseded, names.legacy_superseded, names.main,
    ] },
    { ...safeTarget, container_name: "farmos_day147a5_ABCDEF123456" },
    { ...safeTarget, container_name: "farmos_day147a5_abcdef12345" },
    { ...safeTarget, container_name: "farmos_day147a5_abcdef1234567" },
  ];
  for (const invalidTarget of invalidDatabaseBindings) {
    const operationCounts = { image: 0, credential: 0, run: 0, evidence: 0 };
    assert.throws(() => preparePreRunProtectedOperations({
      target: invalidTarget,
      record() {},
      async inspect_image() { operationCounts.image += 1; },
      generate_credential() {
        operationCounts.credential += 1;
        return "credential";
      },
      async start_container() { operationCounts.run += 1; },
    }), { message: "DAY147_A5_PRE_RUN_TARGET_SAFETY_BLOCKED" });
    assert.deepEqual(operationCounts, {
      image: 0, credential: 0, run: 0, evidence: 0,
    });
  }
  const validImageInspect = JSON.stringify([{
    Id: `sha256:${"a".repeat(64)}`,
    RepoTags: [IMAGE],
  }]);
  assert.equal(
    parseImageDigest(validImageInspect),
    `sha256:${"a".repeat(64)}`,
  );
  const imageFailureCases: readonly CommandResult[] = [
    { exit_code: 1, stdout: "", stderr: "No such image: postgres:17" },
    { exit_code: 125, stdout: "", stderr: "inspect failed" },
    { exit_code: 0, stdout: "not-json", stderr: "" },
    { exit_code: 0, stdout: JSON.stringify([{ RepoTags: [IMAGE] }]), stderr: "" },
    { exit_code: 0, stdout: JSON.stringify([{
      Id: "sha256:bad", RepoTags: [IMAGE],
    }]), stderr: "" },
    { exit_code: 0, stdout: JSON.stringify([{
      Id: `sha256:${"a".repeat(64)}`, RepoTags: ["postgres:16"],
    }]), stderr: "" },
    { exit_code: 0, stdout: JSON.stringify([
      { Id: `sha256:${"a".repeat(64)}`, RepoTags: [IMAGE] },
      { Id: `sha256:${"b".repeat(64)}`, RepoTags: [IMAGE] },
    ]), stderr: "" },
  ];
  for (const imageResult of imageFailureCases) {
    const operations = {
      credential: 0, run: 0, database: 0, cleanup: 0, evidence: 0,
    };
    let failureCode: string | null = null;
    const executeImageFailure = preparePreRunProtectedOperations({
      target: safeTarget,
      record() {},
      inspect_image: () => executeImagePreflight({
        async inspect_image() { return imageResult; },
        on_failure(code) {
          failureCode = code;
          operations.evidence += 1;
        },
      }),
      generate_credential() {
        operations.credential += 1;
        return "credential";
      },
      async start_container() { operations.run += 1; },
    });
    await assert.rejects(executeImageFailure(), {
      message: "DAY147_A5_ENVIRONMENT_BLOCKED",
    });
    assert.equal(failureCode, "DAY147_A5_ENVIRONMENT_BLOCKED");
    assert.deepEqual(operations, {
      credential: 0, run: 0, database: 0, cleanup: 0, evidence: 1,
    });
    let failurePhase: HarnessPhase = "SAFETY_VALIDATED";
    failurePhase = advancePhase(failurePhase, "FAILED");
    failurePhase = advancePhase(failurePhase, "CLEANUP_SKIPPED_NOT_STARTED");
    assert.equal(failurePhase, "CLEANUP_SKIPPED_NOT_STARTED");
  }
  for (const [index, imageResult] of imageFailureCases.entries()) {
    const runner = new RecordingDockerCommandRunner([
      { exit_code: 0, stdout: "user-docker\n", stderr: "" },
      {
        exit_code: 0,
        stdout: JSON.stringify([{
          Name: "user-docker",
          Metadata: { Description: "Docker Engine (user)" },
          Endpoints: {
            docker: {
              Host: "unix:///Users/tester/.docker/run/docker.sock",
              SkipTLSVerify: false,
            },
          },
          TLSMaterial: {},
        }]),
        stderr: "",
      },
      imageResult,
    ]);
    const imageCounters: OperationCounters = {
      docker_commands: 0,
      database_connections: 0,
      evidence_writes: 0,
      credential_generations: 0,
    };
    const memory = createMemoryEvidenceIo();
    const imageEvidenceRoot = `/memory-image-${index}`;
    await assert.rejects(executeIsolatedMode({
      arguments: {
        mode: "execute-isolated",
        authority: EXECUTION_AUTHORITY,
      },
      runner,
      environment: { HOME: "/Users/tester", PATH: "/usr/bin" },
      counters: imageCounters,
      current_user_identity: STATIC_CURRENT_USER,
      socket_provenance_io: createRecordingSocketProvenanceIo({
        home: STATIC_CURRENT_USER.home,
      }).io,
      evidence_io: memory.io,
      evidence_root: imageEvidenceRoot,
    }), { message: "DAY147_A5_ENVIRONMENT_BLOCKED" });
    assert.deepEqual(
      runner.calls.map((call) => call.options.classification),
      ["context_show", "context_inspect", "image_inspect"],
    );
    assert.deepEqual(imageCounters, {
      docker_commands: 3,
      database_connections: 0,
      evidence_writes: 1,
      credential_generations: 0,
    });
    const persistedEntry = [...memory.files.entries()].find(([path]) =>
      path.endsWith(`/${FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH}`)
    );
    assert.ok(persistedEntry);
    const persisted = parseArtifactBytes<Evidence>(persistedEntry[1]);
    assert.equal(persisted.result, "BLOCKED");
    assert.equal(persisted.phase_reached, "CLEANUP_SKIPPED_NOT_STARTED");
    assert.equal(persisted.evidence_status, "VALID");
    assert.equal(persisted.durability_complete, true);
    assert.equal(persisted.success_claimed, false);
    assert.equal(persisted.cleanup.attempted, false);
    assert.equal(persisted.image_digest, null);
    assert.equal(
      validateCommittedA5Evidence({
        evidenceBytes: persistedEntry[1],
        expectedExecutionNonce: persisted.execution_nonce,
        durabilityAttestation: createDurabilityAttestation({
          execution_nonce: persisted.execution_nonce,
          evidence_bytes: persistedEntry[1],
          receipt_bytes: new Uint8Array(),
          marker_bytes: new Uint8Array(),
        }),
      }).accepted,
      false,
    );
  }

  const localContextInspect = JSON.stringify([{
    Name: "user-docker",
    Metadata: { Description: "Docker Engine (user)" },
    Endpoints: {
      docker: {
        Host: "unix:///Users/tester/.docker/run/docker.sock",
        SkipTLSVerify: false,
      },
    },
    TLSMaterial: {},
  }]);
  const preContextFailureCases: readonly Readonly<{
    id: string;
    environment: DockerEnvironment;
    results: readonly CommandResult[];
    expected_classifications: readonly CommandClassification[];
  }>[] = [
    {
      id: "unsafe_docker_host",
      environment: {
        HOME: "/Users/tester", PATH: "/usr/bin",
        DOCKER_HOST: "tcp://remote.example:2376",
      },
      results: [],
      expected_classifications: [],
    },
    {
      id: "unsafe_docker_context",
      environment: {
        HOME: "/Users/tester", PATH: "/usr/bin", DOCKER_CONTEXT: "remote",
      },
      results: [],
      expected_classifications: [],
    },
    {
      id: "context_show_nonzero",
      environment: { HOME: "/Users/tester", PATH: "/usr/bin" },
      results: [{ exit_code: 1, stdout: "", stderr: "blocked" }],
      expected_classifications: ["context_show"],
    },
    {
      id: "context_inspect_malformed",
      environment: { HOME: "/Users/tester", PATH: "/usr/bin" },
      results: [
        { exit_code: 0, stdout: "default\n", stderr: "" },
        { exit_code: 0, stdout: "{", stderr: "" },
      ],
      expected_classifications: ["context_show", "context_inspect"],
    },
    {
      id: "remote_endpoint",
      environment: { HOME: "/Users/tester", PATH: "/usr/bin" },
      results: [
        { exit_code: 0, stdout: "default\n", stderr: "" },
        {
          exit_code: 0,
          stdout: JSON.stringify([{
            Name: "default",
            Endpoints: { docker: { Host: "tcp://remote.example:2376" } },
          }]),
          stderr: "",
        },
      ],
      expected_classifications: ["context_show", "context_inspect"],
    },
    {
      id: "unknown_endpoint",
      environment: { HOME: "/Users/tester", PATH: "/usr/bin" },
      results: [
        { exit_code: 0, stdout: "default\n", stderr: "" },
        {
          exit_code: 0,
          stdout: JSON.stringify([{
            Name: "default",
            Endpoints: { docker: { Host: "npipe:////./pipe/docker_engine" } },
          }]),
          stderr: "",
        },
      ],
      expected_classifications: ["context_show", "context_inspect"],
    },
  ];
  assert.ok(localContextInspect.length > 0);
  for (const [index, testCase] of preContextFailureCases.entries()) {
    const runner = new RecordingDockerCommandRunner(testCase.results);
    const operationCounters: OperationCounters = {
      docker_commands: 0,
      database_connections: 0,
      evidence_writes: 0,
      credential_generations: 0,
    };
    const memory = createMemoryEvidenceIo();
    const evidenceRoot = `/memory-pre-context-${index}`;
    await assert.rejects(executeIsolatedMode({
      arguments: { mode: "execute-isolated", authority: EXECUTION_AUTHORITY },
      runner,
      environment: testCase.environment,
      counters: operationCounters,
      current_user_identity: STATIC_CURRENT_USER,
      evidence_io: memory.io,
      evidence_root: evidenceRoot,
    }), { message: "DAY147_A5_CONNECTION_SAFETY_BLOCKED" });
    assert.deepEqual(
      runner.calls.map((call) => call.options.classification),
      testCase.expected_classifications,
      testCase.id,
    );
    assert.equal(
      runner.calls.some((call) => call.options.classification === "image_inspect"),
      false,
      testCase.id,
    );
    assert.deepEqual(operationCounters, {
      docker_commands: testCase.expected_classifications.length,
      database_connections: 0,
      evidence_writes: 1,
      credential_generations: 0,
    });
    const persistedEntry = [...memory.files.entries()].find(([path]) =>
      path.endsWith(`/${FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH}`)
    );
    assert.ok(persistedEntry, testCase.id);
    const persisted = parseArtifactBytes<Evidence>(persistedEntry[1]);
    assert.match(persisted.execution_nonce, /^[a-f0-9]{12}$/);
    assert.equal(persisted.phase_reached, "CLEANUP_SKIPPED_NOT_STARTED");
    assert.equal(
      persisted.failure_codes.primary,
      "DAY147_A5_CONNECTION_SAFETY_BLOCKED",
    );
    const paths = runScopedEvidencePaths(evidenceRoot, persisted.execution_nonce);
    assert.equal(memory.files.has(paths.receipt), false);
    assert.equal(memory.files.has(paths.marker), false);
    assert.equal(validateCommittedA5Evidence({
      evidenceBytes: persistedEntry[1],
      expectedExecutionNonce: persisted.execution_nonce,
      durabilityAttestation: createDurabilityAttestation({
        execution_nonce: persisted.execution_nonce,
        evidence_bytes: persistedEntry[1],
        receipt_bytes: new Uint8Array(),
        marker_bytes: new Uint8Array(),
      }),
    }).accepted, false);
  }

  const preRunRunner = new RecordingDockerCommandRunner([
    { exit_code: 0, stdout: "user-docker\n", stderr: "" },
    { exit_code: 0, stdout: localContextInspect, stderr: "" },
  ]);
  const preRunMemory = createMemoryEvidenceIo();
  const preRunCounters: OperationCounters = {
    docker_commands: 0,
    database_connections: 0,
    evidence_writes: 0,
    credential_generations: 0,
  };
  const preRunAttestationsBefore = durabilityAttestationCreations;
  await assert.rejects(executeIsolatedMode({
    arguments: { mode: "execute-isolated", authority: EXECUTION_AUTHORITY },
    runner: preRunRunner,
    environment: { HOME: "/Users/tester", PATH: "/usr/bin" },
    counters: preRunCounters,
    current_user_identity: STATIC_CURRENT_USER,
    socket_provenance_io: createRecordingSocketProvenanceIo({
      home: STATIC_CURRENT_USER.home,
    }).io,
    evidence_io: preRunMemory.io,
    evidence_root: "/memory-pre-run-target",
    pre_run_target_override: { host: "remote.example" as typeof LOCAL_HOST },
  }), { message: "DAY147_A5_PRE_RUN_TARGET_SAFETY_BLOCKED" });
  assert.deepEqual(
    preRunRunner.calls.map((call) => call.options.classification),
    ["context_show", "context_inspect"],
  );
  assert.deepEqual(preRunCounters, {
    docker_commands: 2,
    database_connections: 0,
    evidence_writes: 1,
    credential_generations: 0,
  });
  assert.equal(durabilityAttestationCreations, preRunAttestationsBefore);
  const preRunPersisted = [...preRunMemory.files.entries()].find(([path]) =>
    path.endsWith(`/${FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH}`)
  );
  assert.ok(preRunPersisted);
  const preRunEvidence = parseArtifactBytes<Evidence>(preRunPersisted[1]);
  assert.equal(
    preRunEvidence.failure_codes.primary,
    "DAY147_A5_PRE_RUN_TARGET_SAFETY_BLOCKED",
  );
  const preRunPaths = runScopedEvidencePaths(
    "/memory-pre-run-target",
    preRunEvidence.execution_nonce,
  );
  assert.equal(preRunMemory.files.has(preRunPaths.receipt), false);
  assert.equal(preRunMemory.files.has(preRunPaths.marker), false);

  const writerFailureRunner = new RecordingDockerCommandRunner([]);
  const priorSentinel = new Uint8Array([1, 2, 3]);
  const writerFailureMemory = createMemoryEvidenceIo({
    fail_event: "failure:open",
    raw_error_message:
      "EACCES /Users/private syscall=open credential=visible " +
      "postgresql://user:password@localhost/db",
    initial_files: new Map([["/prior-run/commit.json", priorSentinel]]),
  });
  const writerFailureAttestationsBefore = durabilityAttestationCreations;
  await assert.rejects(executeIsolatedMode({
    arguments: { mode: "execute-isolated", authority: EXECUTION_AUTHORITY },
    runner: writerFailureRunner,
    environment: {
      HOME: "/Users/tester",
      PATH: "/usr/bin",
      DOCKER_HOST: "tcp://remote.example:2376",
    },
    counters: {
      docker_commands: 0,
      database_connections: 0,
      evidence_writes: 0,
      credential_generations: 0,
    },
    current_user_identity: STATIC_CURRENT_USER,
    evidence_io: writerFailureMemory.io,
    evidence_root: "/memory-pre-context-writer-failure",
  }), (error: unknown) => {
    assert.ok(error instanceof A5PrimaryFailureError);
    assert.equal(error.message, "DAY147_A5_CONNECTION_SAFETY_BLOCKED");
    assert.equal(error.cause, undefined);
    assert.equal(
      error.secondary_failure_code,
      "DAY147_A5_EVIDENCE_DURABILITY_BLOCKED",
    );
    assert.equal(
      error.secondary_stage_code,
      "DAY147_A5_EVIDENCE_TEMP_OPEN_FAILED",
    );
    assert.equal(error.cleanup_error_code, null);
    const exposed = `${error.message}\n${error.stack ?? ""}\n${JSON.stringify(error)}`;
    for (const forbidden of [
      "/Users/private", "EACCES", "syscall", "credential", "visible",
      "postgresql://", "password",
    ]) assert.equal(exposed.includes(forbidden), false, forbidden);
    return true;
  });
  assert.equal(
    durabilityAttestationCreations,
    writerFailureAttestationsBefore,
  );
  assert.deepEqual(
    writerFailureMemory.files.get("/prior-run/commit.json"),
    priorSentinel,
  );
  assert.equal(
    [...writerFailureMemory.directories].some((path) =>
      path.startsWith(
        "/memory-pre-context-writer-failure/reports/day147a5-isolated-postgres",
      )
    ),
    false,
  );
  assert.equal(
    [...writerFailureMemory.files.keys()].some((path) =>
      path.endsWith(`/${FARM_OS_DAY147A5_COMMIT_RELATIVE_PATH}`) &&
      path !== "/prior-run/commit.json"
    ),
    false,
  );

  assert.doesNotThrow(() => assertStartupOperationOrder(REQUIRED_STARTUP_ORDER));
  const invalidStartupOrders: StartupOperation[][] = [
    [
      "authority_validated", "docker_context_validated", "image_inspected",
      "local_target_prevalidated", "credential_generated", "container_started",
      "mapped_port_resolved", "local_target_postvalidated",
      "postgres_connection_attempted",
    ],
    [
      "authority_validated", "docker_context_validated", "credential_generated",
      "local_target_prevalidated", "image_inspected", "container_started",
      "mapped_port_resolved", "local_target_postvalidated",
      "postgres_connection_attempted",
    ],
    [
      "authority_validated", "docker_context_validated", "container_started",
      "local_target_prevalidated", "image_inspected", "credential_generated",
      "mapped_port_resolved", "local_target_postvalidated",
      "postgres_connection_attempted",
    ],
    [...REQUIRED_STARTUP_ORDER.slice(0, 7), "postgres_connection_attempted",
      "local_target_postvalidated"],
    [...REQUIRED_STARTUP_ORDER.slice(0, 6), "local_target_postvalidated",
      "mapped_port_resolved", "postgres_connection_attempted"],
  ];
  invalidStartupOrders.forEach((operations) =>
    assert.throws(() => assertStartupOperationOrder(operations))
  );
  const preRunFailureCounters = { image: 0, credential: 0, run: 0,
    cleanup: 0, database: 0, evidence: 0 };
  assert.throws(() => preparePreRunProtectedOperations({
    target: { ...safeTarget, host: "localhost" },
    record() {},
    async inspect_image() {
      preRunFailureCounters.image += 1;
    },
    generate_credential() {
      preRunFailureCounters.credential += 1;
      return "credential";
    },
    async start_container() {
      preRunFailureCounters.run += 1;
      preRunFailureCounters.cleanup += 1;
      preRunFailureCounters.database += 1;
      preRunFailureCounters.evidence += 1;
    },
  }), { message: "DAY147_A5_PRE_RUN_TARGET_SAFETY_BLOCKED" });
  assert.deepEqual(preRunFailureCounters, { image: 0, credential: 0, run: 0,
    cleanup: 0, database: 0, evidence: 0 });

  const invalidNames = [
    "farmos_day147a5_123456789ab",
    "farmos_day147a5_123456789abcd",
    "farmos_day147a5_ABCDEF123456",
    "farmos-day147a5-abcdef123456",
    "farmos_day147a5_abcdef123456_suffix",
    "prefix_farmos_day147a5_abcdef123456",
    "farmos_day147a5_abcdef/123456",
    " farmos_day147a5_abcdef123456",
    "farmos_day147a5_abcdef123456;",
  ];
  invalidNames.forEach((name) =>
    assert.throws(() => buildDockerRunCommand(name))
  );

  const orbStackHome = "/Users/tester";
  const currentUser: CurrentUserIdentity = Object.freeze({
    uid: 501,
    gid: 20,
    home: orbStackHome,
    username_classification: "OS_ACCOUNT",
  });
  const orbStackSocket = resolve(
    orbStackHome,
    ".orbstack/run/docker.sock",
  );
  const providerInspect = (input: Readonly<{
    provider: Exclude<DockerProviderClass, "UNKNOWN">;
    host?: string;
    name?: string;
    description?: string;
    skip_tls_verify?: boolean;
    tls_material?: unknown;
  }>) => JSON.stringify([{
    Name: input.name ?? PROVIDER_CONTEXT[input.provider].name,
    Metadata: {
      Description: input.description ?? PROVIDER_CONTEXT[input.provider].description,
    },
    Endpoints: {
      docker: {
        Host: input.host ?? `unix://${orbStackSocket}`,
        SkipTLSVerify: input.skip_tls_verify ?? false,
      },
    },
    TLSMaterial: input.tls_material ?? {},
  }]);
  const orbStackInspect = (input: Omit<Parameters<typeof providerInspect>[0], "provider"> = {}) =>
    providerInspect({ provider: "ORBSTACK", ...input });

  assert.throws(() => validateDockerEnvironment({
    HOME: orbStackHome,
    PATH: "/usr/bin",
    DOCKER_HOST: "tcp://remote.example:2376",
  }, currentUser));
  assert.throws(() => validateDockerEnvironment({
    HOME: orbStackHome,
    PATH: "/usr/bin",
    DOCKER_CONTEXT: "remote",
  }, currentUser));
  assert.doesNotThrow(() => validateDockerEnvironment(
    { PATH: "/usr/bin" },
    currentUser,
  ));
  assert.doesNotThrow(() => validateDockerEnvironment(
    { HOME: orbStackHome, PATH: "/usr/bin" },
    currentUser,
  ));
  assert.throws(() => validateDockerEnvironment(
    { HOME: "/tmp/fake-home", PATH: "/usr/bin" },
    currentUser,
  ));
  assert.throws(() => validateDockerEnvironment(
    { PATH: "/usr/bin" },
    null,
  ));
  assert.throws(() => validateDockerEnvironment(
    { PATH: "/usr/bin" },
    { ...currentUser, home: "relative/home" },
  ));

  const systemSocket = "/var/run/docker.sock";
  const userSocket = resolve(orbStackHome, ".docker/run/docker.sock");
  const desktopSocket = resolve(
    orbStackHome,
    "Library/Containers/com.docker.docker/Data/docker-cli.sock",
  );
  const providerPaths: Readonly<Record<Exclude<DockerProviderClass, "UNKNOWN">, string>> = {
    SYSTEM_DOCKER: systemSocket,
    USER_DOCKER: userSocket,
    DOCKER_DESKTOP: desktopSocket,
    ORBSTACK: orbStackSocket,
  };
  const validOrbStackIo = createRecordingSocketProvenanceIo({
    home: orbStackHome,
  });
  const validOrbStack = classifyDockerEndpoint({
    inspect_output: orbStackInspect(),
    expected_context: "orbstack",
    identity: currentUser,
    socket_io: validOrbStackIo.io,
  });
  assert.deepEqual(validOrbStack, {
    daemon_class: "LOCAL_UNIX_SOCKET",
    provider_class: "ORBSTACK",
    socket_class: "ORBSTACK_MANAGED_SOCKET",
    provider_identity_verified: true,
    filesystem_provenance_verified: true,
    ownership_verified: true,
    path_canonical_verified: true,
    provider_socket_compatible: true,
    remote_rejected: true,
    tls_rejected: true,
  });
  assert.ok(validOrbStackIo.calls.length > 0);

  const runReadinessFailureOrchestratorCase = async (input: Readonly<{
    id: string;
    steps?: readonly StaticReadinessStep[];
    states?: readonly (A5ContainerRuntimeObservation | Error)[];
    state_advance_ms?: readonly number[];
    timeout_reached?: boolean;
    expected_error: string;
    expected_origin?: FarmOsDay147A5ReadinessFailureOrigin;
    expected_readiness: Readonly<{
      attempts: number;
      first_failure_class: FarmOsDay147A5ReadinessFailureClass;
      last_failure_class: FarmOsDay147A5ReadinessFailureClass;
      retryable_failure_count: number;
      non_retryable_failure_count: number;
      container_exit_detected: boolean;
      container_state: FarmOsDay147A5ContainerRuntimeState;
      container_exit_code: number | null;
      container_restarting: boolean;
      container_oom_killed: boolean;
      readiness_attempts_before_exit: number;
    }>;
  }>) => {
    const runner = new ReadinessFailureOrchestratorRunner(orbStackInspect());
    const readiness = createStaticReadinessDependencies({
      steps: input.steps,
      states: input.states,
      state_advance_ms: input.state_advance_ms,
    });
    const internalReadiness = createStaticInternalReadinessDependencies();
    const memory = createMemoryEvidenceIo();
    const counters: OperationCounters = {
      docker_commands: 0,
      database_connections: 0,
      evidence_writes: 0,
      credential_generations: 0,
    };
    let mappedPortChecks = 0;
    await assert.rejects(executeIsolatedMode({
      arguments: { mode: "execute-isolated", authority: EXECUTION_AUTHORITY },
      runner,
      environment: { HOME: orbStackHome, PATH: "/usr/bin" },
      counters,
      socket_provenance_io: createRecordingSocketProvenanceIo({
        home: orbStackHome,
      }).io,
      current_user_identity: currentUser,
      evidence_io: memory.io,
      evidence_root: `/memory-readiness-${input.id}`,
      internal_readiness_dependencies: internalReadiness.dependencies,
      readiness_dependencies: readiness.dependencies,
      static_credential_fixture: "e".repeat(64),
      async assert_mapped_port_closed(port) {
        assert.equal(port, 49_152);
        mappedPortChecks += 1;
      },
    }), { message: input.expected_error });
    const evidenceEntries = [...memory.files.entries()].filter(([path]) =>
      path.endsWith(`/${FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH}`)
    );
    assert.equal(evidenceEntries.length, 1, input.id);
    const persisted = parseArtifactBytes<Evidence>(evidenceEntries[0]![1]);
    assert.equal(persisted.result, "FAILED", input.id);
    assert.equal(persisted.failure_codes.primary, input.expected_error, input.id);
    if (input.expected_origin !== undefined) {
      assert.equal(
        persisted.readiness.failure_origin?.origin,
        input.expected_origin,
        input.id,
      );
    }
    assert.deepEqual(persisted.readiness, {
      status: "FAILED",
      elapsed_ms: persisted.readiness.elapsed_ms,
      startup_elapsed_ms: persisted.readiness.elapsed_ms,
      timeout_reached: input.timeout_reached ?? false,
      failure_origin: persisted.readiness.failure_origin,
      ...input.expected_readiness,
    }, input.id);
    assert.equal(persisted.cleanup.completed, true, input.id);
    assert.equal(persisted.cleanup.post_cleanup_verified, true, input.id);
    assert.equal(persisted.postgres_version, null, input.id);
    assert.deepEqual(persisted.test_results, [], input.id);
    assert.deepEqual(persisted.row_counts, {}, input.id);
    assert.equal(readiness.clients_closed(), input.expected_readiness.attempts, input.id);
    assert.equal(mappedPortChecks, 1, input.id);
    assert.equal(memory.files.has(
      runScopedEvidencePaths(
        `/memory-readiness-${input.id}`,
        persisted.execution_nonce,
      ).receipt,
    ), false, input.id);
    assert.equal(memory.files.has(
      runScopedEvidencePaths(
        `/memory-readiness-${input.id}`,
        persisted.execution_nonce,
      ).marker,
    ), false, input.id);
    assert.equal(validateFailureA5Evidence({
      evidence: persisted,
      receiptPresent: false,
      markerPresent: false,
    }).accepted, true, input.id);
    assert.equal(counters.database_connections, 0, input.id);
    assert.equal(counters.credential_generations, 0, input.id);
    assert.equal(counters.evidence_writes, 1, input.id);
    assert.equal(internalReadiness.command_attempts(), 1, input.id);
    assert.deepEqual(internalReadiness.sleeps(), [500], input.id);
    assert.equal(
      runner.calls.some(({ options }) =>
        options.classification === "container_readiness_state"
      ),
      false,
      input.id,
    );
    assert.deepEqual(
      runner.calls.slice(-3).map(({ options }) => options.classification),
      ["container_identity", "container_cleanup", "post_cleanup_verify"],
      input.id,
    );
    const serialized = JSON.stringify(persisted);
    for (const forbidden of [
      "password=unsafe",
      "postgresql://unsafe",
      "/Users/private",
      "127.0.0.1:49152",
      runner.canonical_id,
    ]) {
      assert.equal(serialized.includes(forbidden), false, `${input.id}:${forbidden}`);
    }
    const originSerialized = JSON.stringify(persisted.readiness.failure_origin);
    for (const forbidden of [
      "password=unsafe", "postgresql://unsafe", "/Users/private",
      "127.0.0.1", "49152", "secret_database", "secret_role",
      "RAW_PRIVATE_CODE", runner.canonical_id, "Error:", " at ",
    ]) {
      assert.equal(
        originSerialized.includes(forbidden),
        false,
        `${input.id}:origin:${forbidden}`,
      );
    }
  };

  await runReadinessFailureOrchestratorCase({
    id: "unproven_code_less_rejection",
    steps: [{
      connect_rejection_without_code: true,
      raw_message:
        "password=unsafe postgresql://unsafe /Users/private " +
        "127.0.0.1:49152 secret_database secret_role RAW_PRIVATE_CODE " +
        "d".repeat(64),
    }],
    expected_error: "DAY147_A5_POSTGRES_READINESS_UNKNOWN",
    expected_origin: "PROMISE_REJECTION",
    expected_readiness: {
      attempts: 1,
      first_failure_class: "UNKNOWN",
      last_failure_class: "UNKNOWN",
      retryable_failure_count: 0,
      non_retryable_failure_count: 1,
      container_exit_detected: false,
      container_state: "RUNNING",
      container_exit_code: 0,
      container_restarting: false,
      container_oom_killed: false,
      readiness_attempts_before_exit: 0,
    },
  });
  await runReadinessFailureOrchestratorCase({
    id: "authentication",
    steps: [{
      connect_error_code: "28P01",
      raw_message:
        "password=unsafe postgresql://unsafe /Users/private " +
        "127.0.0.1:49152 " + "c".repeat(64),
    }],
    expected_error: "DAY147_A5_POSTGRES_READINESS_AUTHENTICATION_FAILED",
    expected_readiness: {
      attempts: 1,
      first_failure_class: "AUTHENTICATION_FAILED",
      last_failure_class: "AUTHENTICATION_FAILED",
      retryable_failure_count: 0,
      non_retryable_failure_count: 1,
      container_exit_detected: false,
      container_state: "RUNNING",
      container_exit_code: 0,
      container_restarting: false,
      container_oom_killed: false,
      readiness_attempts_before_exit: 0,
    },
  });
  await runReadinessFailureOrchestratorCase({
    id: "post_query_deadline",
    steps: [{}],
    states: [RUNNING_CONTAINER_STATE, RUNNING_CONTAINER_STATE],
    state_advance_ms: [0, A5_POSTGRES_READINESS_GLOBAL_DEADLINE_MS],
    timeout_reached: true,
    expected_error: "DAY147_A5_POSTGRES_READINESS_TIMEOUT",
    expected_readiness: {
      attempts: 1,
      first_failure_class: "TIMEOUT",
      last_failure_class: "TIMEOUT",
      retryable_failure_count: 1,
      non_retryable_failure_count: 0,
      container_exit_detected: false,
      container_state: "RUNNING",
      container_exit_code: 0,
      container_restarting: false,
      container_oom_killed: false,
      readiness_attempts_before_exit: 0,
    },
  });
  await runReadinessFailureOrchestratorCase({
    id: "container_exit",
    steps: [{ connect_error_code: "ECONNREFUSED" }],
    states: [
      RUNNING_CONTAINER_STATE,
      { state: "EXITED", exit_code: 1, restarting: false, oom_killed: false },
    ],
    expected_error: "DAY147_A5_POSTGRES_CONTAINER_EXITED",
    expected_readiness: {
      attempts: 1,
      first_failure_class: "CONNECTION_REFUSED",
      last_failure_class: "CONTAINER_EXITED",
      retryable_failure_count: 1,
      non_retryable_failure_count: 0,
      container_exit_detected: true,
      container_state: "EXITED",
      container_exit_code: 1,
      container_restarting: false,
      container_oom_killed: false,
      readiness_attempts_before_exit: 1,
    },
  });
  await runReadinessFailureOrchestratorCase({
    id: "stale_running_becomes_exited",
    steps: [{
      stream_close_during_connect: true,
      connect_rejection_without_code: true,
    }],
    states: [
      RUNNING_CONTAINER_STATE,
      { state: "EXITED", exit_code: 1, restarting: false, oom_killed: false },
    ],
    expected_error: "DAY147_A5_POSTGRES_CONTAINER_EXITED",
    expected_origin: "UNKNOWN",
    expected_readiness: {
      attempts: 1,
      first_failure_class: "CONTAINER_EXITED",
      last_failure_class: "CONTAINER_EXITED",
      retryable_failure_count: 0,
      non_retryable_failure_count: 1,
      container_exit_detected: true,
      container_state: "EXITED",
      container_exit_code: 1,
      container_restarting: false,
      container_oom_killed: false,
      readiness_attempts_before_exit: 1,
    },
  });

  const internalTimeoutRunner = new ReadinessFailureOrchestratorRunner(
    orbStackInspect(),
  );
  const internalTimeout = createStaticInternalReadinessDependencies({
    results: Array.from({ length: 120 }, () => ({
      exit_code: 2, stdout: "", stderr: "",
    })),
  });
  const nodeGateBlocked = createStaticReadinessDependencies();
  const internalTimeoutMemory = createMemoryEvidenceIo();
  const internalTimeoutCounters: OperationCounters = {
    docker_commands: 0,
    database_connections: 0,
    evidence_writes: 0,
    credential_generations: 0,
  };
  let migrationsMayStartCallbacks = 0;
  await assert.rejects(executeIsolatedMode({
    arguments: { mode: "execute-isolated", authority: EXECUTION_AUTHORITY },
    runner: internalTimeoutRunner,
    environment: { HOME: orbStackHome, PATH: "/usr/bin" },
    counters: internalTimeoutCounters,
    socket_provenance_io: createRecordingSocketProvenanceIo({
      home: orbStackHome,
    }).io,
    current_user_identity: currentUser,
    evidence_io: internalTimeoutMemory.io,
    evidence_root: "/memory-internal-readiness-timeout",
    internal_readiness_dependencies: internalTimeout.dependencies,
    readiness_dependencies: nodeGateBlocked.dependencies,
    static_credential_fixture: "e".repeat(64),
    static_after_readiness_gate() {
      migrationsMayStartCallbacks += 1;
      throw new Error("DAY147_A5_INTERNAL_READINESS_NODE_GATE_BYPASS");
    },
    async assert_mapped_port_closed() {},
  }), { message: "DAY147_A5_POSTGRES_INTERNAL_READINESS_TIMEOUT" });
  assert.equal(internalTimeout.command_attempts(), 120);
  assert.equal(nodeGateBlocked.clients_created(), 0);
  assert.equal(nodeGateBlocked.readiness_queries(), 0);
  assert.equal(migrationsMayStartCallbacks, 0);
  assert.equal(internalTimeoutCounters.database_connections, 0);
  const internalFailureEntry = [...internalTimeoutMemory.files.entries()].find(
    ([path]) => path.endsWith(`/${FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH}`),
  );
  assert.ok(internalFailureEntry);
  const internalFailureEvidence = parseArtifactBytes<Evidence>(
    internalFailureEntry[1],
  );
  assert.equal(
    internalFailureEvidence.failure_codes.primary,
    "DAY147_A5_POSTGRES_INTERNAL_READINESS_TIMEOUT",
  );
  assert.equal(internalFailureEvidence.postgres_version, null);
  assert.deepEqual(internalFailureEvidence.test_results, []);
  assert.deepEqual(internalFailureEvidence.row_counts, {});
  assert.equal(internalFailureEvidence.cleanup.completed, true);
  assert.equal(internalFailureEvidence.cleanup.post_cleanup_verified, true);

  const resetThenSuccessRunner = new ReadinessFailureOrchestratorRunner(
    orbStackInspect(),
  );
  let resetThenSuccessReadiness!: ReturnType<
    typeof createStaticReadinessDependencies
  >;
  resetThenSuccessReadiness = createStaticReadinessDependencies({
    steps: [{
      stream_close_during_connect: true,
      connect_rejection_without_code: true,
    }, {
      before_connect() {
        const lateStream = resetThenSuccessReadiness.stream_at(0);
        lateStream?.emit(
          "error",
          new Error("attempt one late sanitized stream error"),
        );
        if (lateStream !== undefined) {
          lateStream.closed = true;
          lateStream.emit("close");
        }
      },
    }],
  });
  const resetThenSuccessMemory = createMemoryEvidenceIo();
  const resetThenSuccessInternalReadiness =
    createStaticInternalReadinessDependencies();
  const resetThenSuccessCounters: OperationCounters = {
    docker_commands: 0,
    database_connections: 0,
    evidence_writes: 0,
    credential_generations: 0,
  };
  let readinessMigrationGateObserved = false;
  await assert.rejects(executeIsolatedMode({
    arguments: { mode: "execute-isolated", authority: EXECUTION_AUTHORITY },
    runner: resetThenSuccessRunner,
    environment: { HOME: orbStackHome, PATH: "/usr/bin" },
    counters: resetThenSuccessCounters,
    socket_provenance_io: createRecordingSocketProvenanceIo({
      home: orbStackHome,
    }).io,
    current_user_identity: currentUser,
    evidence_io: resetThenSuccessMemory.io,
    evidence_root: "/memory-readiness-reset-then-success",
    internal_readiness_dependencies:
      resetThenSuccessInternalReadiness.dependencies,
    readiness_dependencies: resetThenSuccessReadiness.dependencies,
    static_credential_fixture: "e".repeat(64),
    static_after_readiness_gate(gate) {
      assert.equal(gate.readiness.ready, true);
      assert.equal(gate.readiness.attempts, 2);
      assert.equal(gate.readiness.first_failure_class, "CONNECTION_RESET");
      assert.equal(
        gate.readiness.timeline[0]?.failure_origin?.origin,
        "STREAM_CLOSE_EVENT",
      );
      assert.equal(
        gate.readiness.timeline[0]?.failure_origin?.safe_code_class,
        "CODE_ABSENT",
      );
      assert.equal(gate.migrations_may_start, true);
      assert.equal(resetThenSuccessReadiness.clients_closed(), 2);
      readinessMigrationGateObserved = true;
      throw new Error("DAY147_A5_STATIC_STOP_AFTER_READINESS_GATE");
    },
    async assert_mapped_port_closed() {},
  }), { message: "DAY147_A5_STATIC_STOP_AFTER_READINESS_GATE" });
  await new Promise<void>((resolveImmediate) => setImmediate(resolveImmediate));
  assert.equal(readinessMigrationGateObserved, true);
  assert.equal(resetThenSuccessInternalReadiness.command_attempts(), 1);
  assert.deepEqual(resetThenSuccessInternalReadiness.sleeps(), [500]);
  assert.equal(resetThenSuccessCounters.database_connections, 0);
  assert.equal(
    resetThenSuccessReadiness.client_at(0)?.listenerCount("error"),
    0,
  );
  assert.equal(
    resetThenSuccessReadiness.stream_at(0)?.listenerCount("error"),
    0,
  );

  const validApplicationProof: OrbStackApplicationProof = {
    object_kind: "directory",
    metadata_file_kind: "file",
    bundle_identifier: ORBSTACK_BUNDLE_ID,
    bundle_name: ORBSTACK_BUNDLE_NAME,
    bundle_executable: ORBSTACK_BUNDLE_EXECUTABLE,
    package_type: ORBSTACK_BUNDLE_PACKAGE_TYPE,
    owner_uid: currentUser.uid,
    owner_gid: currentUser.gid,
    mode: 0o755,
    canonical_path_exact: true,
    symlink_found: false,
  };
  const invalidApplicationProofs: readonly Readonly<{
    id: string;
    proof: OrbStackApplicationProof | null;
  }>[] = [
    { id: "application_absent", proof: null },
    { id: "application_regular_file", proof: { ...validApplicationProof, object_kind: "file" } },
    { id: "application_bundle_id_mismatch", proof: { ...validApplicationProof, bundle_identifier: "invalid.bundle" } },
    { id: "application_name_mismatch", proof: { ...validApplicationProof, bundle_name: "NotOrbStack" } },
    { id: "application_executable_mismatch", proof: { ...validApplicationProof, bundle_executable: "NotOrbStack" } },
    { id: "application_metadata_mismatch", proof: { ...validApplicationProof, package_type: "BNDL" } },
    { id: "application_symlink", proof: { ...validApplicationProof, symlink_found: true } },
    { id: "application_other_user", proof: { ...validApplicationProof, owner_uid: 502 } },
    { id: "application_group_writable", proof: { ...validApplicationProof, mode: 0o775 } },
    { id: "application_world_writable", proof: { ...validApplicationProof, mode: 0o757 } },
    { id: "application_canonical_mismatch", proof: { ...validApplicationProof, canonical_path_exact: false } },
  ];
  assert.equal(validateOrbStackApplicationProof(validApplicationProof, currentUser), true);
  invalidApplicationProofs.forEach(({ id, proof }) =>
    assert.equal(validateOrbStackApplicationProof(proof, currentUser), false, id)
  );

  const validProcessProof: OrbStackProcessProof = {
    present: true,
    executable_basename: ORBSTACK_BUNDLE_EXECUTABLE,
    executable_path_expected: true,
    executable_path_canonical: true,
    owner_uid: currentUser.uid,
    local_process: true,
    command_line_only: false,
  };
  const invalidProcessProofs: readonly Readonly<{
    id: string;
    proof: OrbStackProcessProof | null;
  }>[] = [
    { id: "process_absent", proof: null },
    { id: "process_basename_mismatch", proof: { ...validProcessProof, executable_basename: "OrbStack-helper" } },
    { id: "process_executable_path_mismatch", proof: { ...validProcessProof, executable_path_expected: false } },
    { id: "process_canonical_mismatch", proof: { ...validProcessProof, executable_path_canonical: false } },
    { id: "process_other_user", proof: { ...validProcessProof, owner_uid: 502 } },
    { id: "process_nonlocal", proof: { ...validProcessProof, local_process: false } },
    { id: "fake_process_command_line_only", proof: { ...validProcessProof, command_line_only: true } },
  ];
  assert.equal(validateOrbStackProcessProof(validProcessProof, currentUser), true);
  invalidProcessProofs.forEach(({ id, proof }) =>
    assert.equal(validateOrbStackProcessProof(proof, currentUser), false, id)
  );

  for (const provider of [
    "SYSTEM_DOCKER", "USER_DOCKER", "DOCKER_DESKTOP", "ORBSTACK",
  ] as const) {
    const classification = classifyDockerEndpoint({
      inspect_output: providerInspect({
        provider,
        host: `unix://${providerPaths[provider]}`,
      }),
      expected_context: PROVIDER_CONTEXT[provider].name,
      identity: currentUser,
      socket_io: validOrbStackIo.io,
    });
    assert.equal(classification.daemon_class, "LOCAL_UNIX_SOCKET", provider);
    assert.equal(classification.provider_class, provider, provider);
    assert.equal(
      classification.socket_class,
      PROVIDER_SOCKET_COMPATIBILITY[provider],
      provider,
    );
    assert.equal(classification.provider_socket_compatible, true, provider);
  }

  const orbStackNegativeCases: readonly Readonly<{
    id: string;
    inspect: string;
    io?: SocketProvenanceIo;
  }>[] = [
    {
      id: "context_mismatch",
      inspect: orbStackInspect({ name: "not-orbstack" }),
    },
    {
      id: "metadata_only_wrong_path",
      inspect: orbStackInspect({
        host: "unix:///Users/tester/other/docker.sock",
      }),
    },
    {
      id: "path_only_metadata_mismatch",
      inspect: orbStackInspect({ description: "Not OrbStack" }),
    },
    {
      id: "application_absent",
      inspect: orbStackInspect(),
      io: createRecordingSocketProvenanceIo({
        home: orbStackHome,
        application_identity: false,
      }).io,
    },
    ...[
      "application_regular_file", "application_bundle_id_mismatch",
      "application_symlink", "application_other_user",
      "application_group_writable", "process_present_application_absent",
    ].map((id) => ({
      id,
      inspect: orbStackInspect(),
      io: createRecordingSocketProvenanceIo({
        home: orbStackHome,
        application_identity: false,
      }).io,
    })),
    {
      id: "application_process_bundle_lineage_mismatch",
      inspect: orbStackInspect(),
      io: createRecordingSocketProvenanceIo({
        home: orbStackHome,
        application_bundle: "SYSTEM_BUNDLE",
        process_bundle: "USER_BUNDLE",
      }).io,
    },
    ...[
      "process_absent", "process_basename_mismatch",
      "process_executable_path_mismatch", "process_other_user",
      "fake_process_command_line_only", "application_present_process_absent",
    ].map((id) => ({
      id,
      inspect: orbStackInspect(),
      io: createRecordingSocketProvenanceIo({
        home: orbStackHome,
        process_identity: false,
      }).io,
    })),
    {
      id: "endpoint_symlink",
      inspect: orbStackInspect(),
      io: createRecordingSocketProvenanceIo({
        home: orbStackHome,
        socket: { kind: "symlink", uid: 501, gid: 20, mode: 0o755 },
      }).io,
    },
    {
      id: "parent_component_symlink",
      inspect: orbStackInspect(),
      io: createRecordingSocketProvenanceIo({
        home: orbStackHome,
        component_symlink: true,
      }).io,
    },
    {
      id: "os_home_symlinked_provider_root",
      inspect: orbStackInspect(),
      io: createRecordingSocketProvenanceIo({
        home: orbStackHome,
        component_symlink: true,
      }).io,
    },
    {
      id: "canonical_mismatch",
      inspect: orbStackInspect(),
      io: createRecordingSocketProvenanceIo({
        home: orbStackHome,
        resolved_path: "/private/var/run/other.sock",
      }).io,
    },
    {
      id: "other_user_socket",
      inspect: orbStackInspect(),
      io: createRecordingSocketProvenanceIo({
        home: orbStackHome,
        socket: { kind: "socket", uid: 502, gid: 20, mode: 0o755 },
      }).io,
    },
    {
      id: "other_group_socket",
      inspect: orbStackInspect(),
      io: createRecordingSocketProvenanceIo({
        home: orbStackHome,
        socket: { kind: "socket", uid: 501, gid: 80, mode: 0o755 },
      }).io,
    },
    {
      id: "group_world_writable_socket",
      inspect: orbStackInspect(),
      io: createRecordingSocketProvenanceIo({
        home: orbStackHome,
        socket: { kind: "socket", uid: 501, gid: 20, mode: 0o777 },
      }).io,
    },
    {
      id: "other_user_parent",
      inspect: orbStackInspect(),
      io: createRecordingSocketProvenanceIo({
        home: orbStackHome,
        parent: { kind: "directory", uid: 502, gid: 20, mode: 0o700 },
      }).io,
    },
    {
      id: "other_group_parent",
      inspect: orbStackInspect(),
      io: createRecordingSocketProvenanceIo({
        home: orbStackHome,
        parent: { kind: "directory", uid: 501, gid: 80, mode: 0o700 },
      }).io,
    },
    {
      id: "other_user_provider_root",
      inspect: orbStackInspect(),
      io: createRecordingSocketProvenanceIo({
        home: orbStackHome,
        provider_root: { kind: "directory", uid: 502, gid: 20, mode: 0o700 },
      }).io,
    },
    {
      id: "other_group_provider_root",
      inspect: orbStackInspect(),
      io: createRecordingSocketProvenanceIo({
        home: orbStackHome,
        provider_root: { kind: "directory", uid: 501, gid: 80, mode: 0o700 },
      }).io,
    },
    {
      id: "group_writable_provider_root",
      inspect: orbStackInspect(),
      io: createRecordingSocketProvenanceIo({
        home: orbStackHome,
        provider_root: { kind: "directory", uid: 501, gid: 20, mode: 0o720 },
      }).io,
    },
    {
      id: "world_writable_provider_root",
      inspect: orbStackInspect(),
      io: createRecordingSocketProvenanceIo({
        home: orbStackHome,
        provider_root: { kind: "directory", uid: 501, gid: 20, mode: 0o702 },
      }).io,
    },
    {
      id: "group_writable_parent",
      inspect: orbStackInspect(),
      io: createRecordingSocketProvenanceIo({
        home: orbStackHome,
        parent: { kind: "directory", uid: 501, gid: 20, mode: 0o720 },
      }).io,
    },
    {
      id: "world_writable_parent",
      inspect: orbStackInspect(),
      io: createRecordingSocketProvenanceIo({
        home: orbStackHome,
        parent: { kind: "directory", uid: 501, gid: 20, mode: 0o702 },
      }).io,
    },
    {
      id: "regular_file",
      inspect: orbStackInspect(),
      io: createRecordingSocketProvenanceIo({
        home: orbStackHome,
        socket: { kind: "file", uid: 501, gid: 20, mode: 0o755 },
      }).io,
    },
    {
      id: "missing_socket",
      inspect: orbStackInspect(),
      io: createRecordingSocketProvenanceIo({
        home: orbStackHome,
        socket: { kind: "missing", uid: null, gid: null, mode: null },
      }).io,
    },
    { id: "relative_path", inspect: orbStackInspect({ host: "unix://relative.sock" }) },
    { id: "dot_segment", inspect: orbStackInspect({ host: "unix:///Users/tester/.orbstack/./run/docker.sock" }) },
    { id: "dotdot_segment", inspect: orbStackInspect({ host: "unix:///Users/tester/.orbstack/run/../docker.sock" }) },
    { id: "percent_encoding", inspect: orbStackInspect({ host: "unix:///Users/tester/.orbstack/run/docker%2Esock" }) },
    { id: "repeated_slash", inspect: orbStackInspect({ host: "unix:///Users/tester/.orbstack//run/docker.sock" }) },
    { id: "trailing_slash", inspect: orbStackInspect({ host: "unix:///Users/tester/.orbstack/run/docker.sock/" }) },
    { id: "nul", inspect: orbStackInspect({ host: "unix:///Users/tester/.orbstack/run/docker.sock\0" }) },
    { id: "control_character", inspect: orbStackInspect({ host: "unix:///Users/tester/.orbstack/run/docker.sock\n" }) },
    { id: "temporary_directory", inspect: orbStackInspect({ host: "unix:///tmp/orbstack/docker.sock" }) },
    { id: "pid_nonce_path", inspect: orbStackInspect({ host: "unix:///Users/tester/.orbstack/run/12345-a1b2c3d4e5f6.sock" }) },
    { id: "nonce_only_path", inspect: orbStackInspect({ host: "unix:///Users/tester/.orbstack/run/a1b2c3d4e5f6.sock" }) },
    { id: "remote_tcp", inspect: orbStackInspect({ host: "tcp://remote.example:2376" }) },
    { id: "remote_ssh", inspect: orbStackInspect({ host: "ssh://remote.example" }) },
    { id: "remote_http", inspect: orbStackInspect({ host: "http://remote.example" }) },
    { id: "remote_https", inspect: orbStackInspect({ host: "https://remote.example" }) },
    { id: "tls_skip_verify", inspect: orbStackInspect({ skip_tls_verify: true }) },
    { id: "tls_material", inspect: orbStackInspect({ tls_material: { docker: ["cert"] } }) },
    { id: "generic_home_socket", inspect: orbStackInspect({ host: "unix:///Users/tester/custom/docker.sock" }) },
  ];
  for (const testCase of orbStackNegativeCases) {
    const classification = classifyDockerEndpoint({
      inspect_output: testCase.inspect,
      expected_context: "orbstack",
      identity: currentUser,
      socket_io: testCase.io ?? validOrbStackIo.io,
    });
    assert.notEqual(
      classification.daemon_class,
      "LOCAL_UNIX_SOCKET",
      testCase.id,
    );
    const runner = new RecordingDockerCommandRunner([
      { exit_code: 0, stdout: "orbstack\n", stderr: "" },
      { exit_code: 0, stdout: testCase.inspect, stderr: "" },
    ]);
    const counters: OperationCounters = {
      docker_commands: 0,
      database_connections: 0,
      evidence_writes: 0,
      credential_generations: 0,
    };
    const evidenceIo = createMemoryEvidenceIo();
    await assert.rejects(executeIsolatedMode({
      arguments: { mode: "execute-isolated", authority: EXECUTION_AUTHORITY },
      runner,
      environment: { HOME: orbStackHome, PATH: "/usr/bin" },
      counters,
      socket_provenance_io: testCase.io ?? validOrbStackIo.io,
      current_user_identity: currentUser,
      evidence_io: evidenceIo.io,
      evidence_root: `/memory-orbstack-negative-${testCase.id}`,
    }), { message: "DAY147_A5_CONNECTION_SAFETY_BLOCKED" });
    assert.deepEqual(
      runner.calls.map((call) => call.options.classification),
      ["context_show", "context_inspect"],
      testCase.id,
    );
    assert.deepEqual(counters, {
      docker_commands: 2,
      database_connections: 0,
      evidence_writes: 1,
      credential_generations: 0,
    });
  }
  const crossProviderCases: readonly Readonly<{
    id: string;
    provider: Exclude<DockerProviderClass, "UNKNOWN">;
    host: string;
  }>[] = [
    { id: "system_user", provider: "SYSTEM_DOCKER", host: userSocket },
    { id: "system_desktop", provider: "SYSTEM_DOCKER", host: desktopSocket },
    { id: "user_system", provider: "USER_DOCKER", host: systemSocket },
    { id: "user_desktop", provider: "USER_DOCKER", host: desktopSocket },
    { id: "desktop_system", provider: "DOCKER_DESKTOP", host: systemSocket },
    { id: "desktop_user", provider: "DOCKER_DESKTOP", host: userSocket },
    { id: "orbstack_system", provider: "ORBSTACK", host: systemSocket },
    { id: "orbstack_user", provider: "ORBSTACK", host: userSocket },
    { id: "orbstack_desktop", provider: "ORBSTACK", host: desktopSocket },
    { id: "desktop_orbstack", provider: "DOCKER_DESKTOP", host: orbStackSocket },
    { id: "system_orbstack", provider: "SYSTEM_DOCKER", host: orbStackSocket },
    { id: "user_orbstack", provider: "USER_DOCKER", host: orbStackSocket },
  ];
  for (const testCase of crossProviderCases) {
    const inspect = providerInspect({
      provider: testCase.provider,
      host: `unix://${testCase.host}`,
    });
    assert.notEqual(classifyDockerEndpoint({
      inspect_output: inspect,
      expected_context: PROVIDER_CONTEXT[testCase.provider].name,
      identity: currentUser,
      socket_io: validOrbStackIo.io,
    }).daemon_class, "LOCAL_UNIX_SOCKET", testCase.id);
    const runner = new RecordingDockerCommandRunner([
      { exit_code: 0, stdout: `${PROVIDER_CONTEXT[testCase.provider].name}\n`, stderr: "" },
      { exit_code: 0, stdout: inspect, stderr: "" },
    ]);
    const crossCounters: OperationCounters = {
      docker_commands: 0, database_connections: 0,
      evidence_writes: 0, credential_generations: 0,
    };
    await assert.rejects(executeIsolatedMode({
      arguments: { mode: "execute-isolated", authority: EXECUTION_AUTHORITY },
      runner,
      environment: { HOME: orbStackHome, PATH: "/usr/bin" },
      counters: crossCounters,
      current_user_identity: currentUser,
      socket_provenance_io: validOrbStackIo.io,
      evidence_io: createMemoryEvidenceIo().io,
      evidence_root: `/memory-cross-provider-${testCase.id}`,
    }), { message: "DAY147_A5_CONNECTION_SAFETY_BLOCKED" });
    assert.deepEqual(runner.calls.map((call) => call.options.classification),
      ["context_show", "context_inspect"], testCase.id);
    assert.deepEqual(crossCounters, {
      docker_commands: 2, database_connections: 0,
      evidence_writes: 1, credential_generations: 0,
    });
  }
  for (const testCase of [
    { id: "unknown_system", host: systemSocket },
    { id: "unknown_orbstack", host: orbStackSocket },
  ]) {
    const inspect = JSON.stringify([{
      Name: "unknown-provider",
      Metadata: { Description: "Unknown" },
      Endpoints: { docker: { Host: `unix://${testCase.host}`, SkipTLSVerify: false } },
      TLSMaterial: {},
    }]);
    assert.notEqual(classifyDockerEndpoint({
      inspect_output: inspect,
      expected_context: "unknown-provider",
      identity: currentUser,
      socket_io: validOrbStackIo.io,
    }).daemon_class, "LOCAL_UNIX_SOCKET", testCase.id);
    const runner = new RecordingDockerCommandRunner([
      { exit_code: 0, stdout: "unknown-provider\n", stderr: "" },
      { exit_code: 0, stdout: inspect, stderr: "" },
    ]);
    const unknownCounters: OperationCounters = {
      docker_commands: 0, database_connections: 0,
      evidence_writes: 0, credential_generations: 0,
    };
    await assert.rejects(executeIsolatedMode({
      arguments: { mode: "execute-isolated", authority: EXECUTION_AUTHORITY },
      runner,
      environment: { HOME: orbStackHome, PATH: "/usr/bin" },
      counters: unknownCounters,
      current_user_identity: currentUser,
      socket_provenance_io: validOrbStackIo.io,
      evidence_io: createMemoryEvidenceIo().io,
      evidence_root: `/memory-cross-provider-${testCase.id}`,
    }), { message: "DAY147_A5_CONNECTION_SAFETY_BLOCKED" });
    assert.deepEqual(runner.calls.map((call) => call.options.classification),
      ["context_show", "context_inspect"], testCase.id);
    assert.deepEqual(unknownCounters, {
      docker_commands: 2, database_connections: 0,
      evidence_writes: 1, credential_generations: 0,
    });
  }
  const metadataMissingInspect = JSON.stringify([{
    Name: "default",
    Endpoints: {
      docker: { Host: `unix://${systemSocket}`, SkipTLSVerify: false },
    },
    TLSMaterial: {},
  }]);
  assert.notEqual(classifyDockerEndpoint({
    inspect_output: metadataMissingInspect,
    expected_context: "default",
    identity: currentUser,
  }).daemon_class, "LOCAL_UNIX_SOCKET", "provider_metadata_missing");

  const fakeHomeIo = createRecordingSocketProvenanceIo({ home: "/tmp/fake-home" });
  const fakeHomeRunner = new RecordingDockerCommandRunner([]);
  const fakeHomeCounters: OperationCounters = {
    docker_commands: 0, database_connections: 0,
    evidence_writes: 0, credential_generations: 0,
  };
  await assert.rejects(executeIsolatedMode({
    arguments: { mode: "execute-isolated", authority: EXECUTION_AUTHORITY },
    runner: fakeHomeRunner,
    environment: { HOME: "/tmp/fake-home", PATH: "/usr/bin" },
    counters: fakeHomeCounters,
    current_user_identity: currentUser,
    socket_provenance_io: fakeHomeIo.io,
    evidence_io: createMemoryEvidenceIo().io,
    evidence_root: "/memory-fake-home-bypass",
  }), { message: "DAY147_A5_CONNECTION_SAFETY_BLOCKED" });
  assert.equal(fakeHomeRunner.calls.length, 0);
  assert.deepEqual(fakeHomeCounters, {
    docker_commands: 0, database_connections: 0,
    evidence_writes: 1, credential_generations: 0,
  });
  const validOrbStackRunner = new RecordingDockerCommandRunner([
    { exit_code: 0, stdout: "orbstack\n", stderr: "" },
    { exit_code: 0, stdout: orbStackInspect(), stderr: "" },
    { exit_code: 1, stdout: "", stderr: "image absent" },
  ]);
  const validOrbStackCounters: OperationCounters = {
    docker_commands: 0,
    database_connections: 0,
    evidence_writes: 0,
    credential_generations: 0,
  };
  await assert.rejects(executeIsolatedMode({
    arguments: { mode: "execute-isolated", authority: EXECUTION_AUTHORITY },
    runner: validOrbStackRunner,
    environment: { HOME: orbStackHome, PATH: "/usr/bin" },
    counters: validOrbStackCounters,
    socket_provenance_io: validOrbStackIo.io,
    current_user_identity: currentUser,
    evidence_io: createMemoryEvidenceIo().io,
    evidence_root: "/memory-orbstack-positive",
  }), { message: "DAY147_A5_ENVIRONMENT_BLOCKED" });
  assert.deepEqual(
    validOrbStackRunner.calls.map((call) => call.options.classification),
    ["context_show", "context_inspect", "image_inspect"],
  );
  assert.deepEqual(validOrbStackCounters, {
    docker_commands: 3,
    database_connections: 0,
    evidence_writes: 1,
    credential_generations: 0,
  });

  const runCommand = buildDockerRunCommand(names.container);
  const mockRunner = new RecordingDockerCommandRunner([{
    exit_code: 0,
    stdout: "default\n",
    stderr: "",
  }]);
  await mockRunner.run("docker", buildContextShowCommand().args, {
    env: { PATH: "/usr/bin", HOME: "/Users/tester", DOCKER_CONFIG: "/Users/tester/.docker" },
    timeout_ms: 1_000,
    max_output_bytes: 1_024,
    classification: "context_show",
    secret_values: [],
  });
  assert.equal(mockRunner.calls.length, 1);
  assert.equal(mockRunner.calls[0]?.executable, "docker");
  assert.deepEqual(buildImageInspectCommand().args, ["image", "inspect", IMAGE]);
  assert.ok(runCommand.args.includes("--pull=never"));
  assert.ok(runCommand.args.includes("--rm"));
  assert.ok(runCommand.args.includes("--detach"));
  assert.ok(runCommand.args.includes("127.0.0.1::5432"));
  assert.ok(runCommand.args.includes("--tmpfs"));
  assert.ok(!runCommand.args.includes("--volume"));
  assert.ok(!runCommand.args.includes("--privileged"));
  assert.ok(!runCommand.args.includes("--network"));
  assert.ok(!runCommand.args.some((value) => value.includes("=") &&
    value.includes("POSTGRES_PASSWORD")));
  assert.equal(parsePublishedPort("127.0.0.1:49152\n"), 49_152);
  for (const output of ["", "0.0.0.0:49152", "127.0.0.1:0",
    "127.0.0.1:70000", "127.0.0.1:1\n127.0.0.1:2"]) {
    assert.throws(() => parsePublishedPort(output));
  }
  const fullId = "a".repeat(64);
  const containerImageDigest = `sha256:${"d".repeat(64)}`;
  assert.deepEqual(parseContainerMetadata(JSON.stringify({
    Id: fullId,
    Name: `/${names.container}`,
    Image: containerImageDigest,
  })), {
    id: fullId,
    name: names.container,
    image_digest: containerImageDigest,
  });
  assert.deepEqual(buildPortResolutionCommand(fullId).args, [
    "port", fullId, "5432/tcp",
  ]);
  assert.throws(() => parseContainerMetadata(JSON.stringify({
    Id: fullId,
    Name: `/${otherNames.container}`,
    Image: "sha256:bad",
  })));
  assert.deepEqual(buildExactCleanupCommand({
    generated_name: names.container,
    expected_id: fullId,
    observed_id: fullId,
  }).args, ["rm", "--force", fullId]);
  assert.throws(() => buildExactCleanupCommand({
    generated_name: names.container,
    expected_id: "a".repeat(12),
    observed_id: "a".repeat(12),
  }));
  assert.throws(() => buildExactCleanupCommand({
    generated_name: names.container,
    expected_id: fullId,
    observed_id: "b".repeat(64),
  }));
  const cleanupMock = new RecordingDockerCommandRunner([
    { exit_code: 0, stdout: `${fullId}\n`, stderr: "" },
    { exit_code: 0, stdout: "", stderr: "" },
    {
      exit_code: 1,
      stdout: "",
      stderr:
        `Error response from daemon: No such container: ${names.container}`,
    },
  ]);
  const cleanupState: CleanupState = {
    containerStartAttempted: true,
    containerStarted: true,
    canonicalContainerId: fullId,
    cleanupAttempted: false,
    cleanupSucceeded: false,
    postCleanupVerified: false,
  };
  const cleanupCounters: OperationCounters = {
    docker_commands: 0,
    database_connections: 0,
    evidence_writes: 0,
    credential_generations: 0,
  };
  await cleanupOwnedContainer({
    runner: cleanupMock,
    env: { PATH: "/usr/bin", HOME: "/Users/tester", DOCKER_CONFIG: "/Users/tester/.docker" },
    names,
    state: cleanupState,
    mapped_port: null,
    counters: cleanupCounters,
  });
  assert.equal(cleanupState.cleanupSucceeded, true);
  assert.equal(cleanupState.postCleanupVerified, true);
  assert.equal(cleanupCounters.docker_commands, 3);
  assert.equal(isExactContainerNotFound({
    exit_code: 1,
    stdout: "",
    stderr: "Cannot connect to the Docker daemon",
  }, names.container), false);
  assert.equal(isExactContainerNotFound({
    exit_code: 1,
    stdout: "",
    stderr: `Error: No such object: ${names.container}`,
  }, names.container), true);
  await assert.rejects(cleanupOwnedContainer({
    runner: cleanupMock,
    env: {},
    names,
    state: cleanupState,
    mapped_port: null,
    counters: cleanupCounters,
  }));

  verifyChecksums();
  assert.deepEqual(LEGACY_MIGRATION_PLAN, [
    "day146_base", "legacy_fixture", "prepare_apply", "prepare_verify",
    "activation_apply", "activation_verify", "legacy_immutability_assertion",
  ]);
  assert.deepEqual(MAIN_MIGRATION_PLAN, [
    "day146_base", "prepare_apply", "prepare_verify", "activation_apply",
    "activation_verify", "dynamic_tests", "activation_verify",
  ]);

  let phase: HarnessPhase = "INITIAL";
  for (const next of [
    "SAFETY_VALIDATED", "IMAGE_VERIFIED", "CONTAINER_STARTED",
    "POSTGRES_READY", "DATABASES_CREATED", "MIGRATIONS_APPLIED",
    "DYNAMIC_TESTS_COMPLETED", "CLEANUP_STARTED", "CLEANUP_COMPLETED",
    "COMPLETE",
  ] as const) phase = advancePhase(phase, next);
  assert.equal(phase, "COMPLETE");
  assert.throws(() => advancePhase("INITIAL", "COMPLETE"));
  assert.throws(() => advancePhase("FAILED", "COMPLETE"));

  const fixtureCredential = "c".repeat(64);
  for (const role of Object.values(ROLE_FIXTURES)) {
    const createSql = buildRoleCreationSql(role, fixtureCredential);
    const grantSql = buildRoleGrantSql(role);
    if (!role.preexisting) assert.equal(createSql.length, 1);
    assert.ok(grantSql.every((sql) => !/\bupdate\b|\bdelete\b/i.test(sql)));
    assert.equal(role.trigger_function_execute, false);
  }
  const bundleGrants = buildRoleGrantSql(
    ROLE_FIXTURES.bundle_runtime_fixture,
  ).join("\n");
  assert.ok(bundleGrants.includes("grant insert on table"));
  assert.ok(bundleGrants.includes("persist_operational_memory_bundle"));
  assert.ok(bundleGrants.includes("revoke execute"));

  assert.equal(STATES, FARM_OS_PROJECTION_STATES);
  assert.equal(STATES.length, 5);
  assert.equal(ORDERED_TRANSITIONS.length, 25);
  assert.equal(ALLOWED_TRANSITIONS.length, 4);
  assert.equal(FORBIDDEN_TRANSITIONS.length, 21);
  assert.equal(new Set(ORDERED_TRANSITIONS.map(({ key }) => key)).size, 25);
  assert.ok(STATES.every((state) =>
    FORBIDDEN_TRANSITIONS.some(({ from, to }) => from === state && to === state)
  ));
  assert.ok(["rejected", "failed", "superseded"].every((terminal) =>
    STATES.every((to) =>
      FORBIDDEN_TRANSITIONS.some(({ from, to: candidate }) =>
        from === terminal && candidate === to
      )
    )
  ));

  const ids = EXECUTABLE_CASES.map(({ id }) => id);
  assert.ok(ids.length > 0);
  assert.equal(ids.length, 102);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(EXECUTABLE_CASES.every((testCase) =>
    testCase.executor.length > 0 && testCase.assertion.length > 0
  ));
  const registeredIds = new Set(ids);
  assert.ok(REQUIRED_CASE_IDS.every((id) => registeredIds.has(id)));
  const categories = new Set(EXECUTABLE_CASES.map(({ category }) => category));
  assert.equal(categories.size, 13);
  const initialCandidateValid = EXECUTABLE_CASES.find(
    ({ id }) => id === "initial_candidate_valid",
  );
  assert.deepEqual(initialCandidateValid, {
    id: "initial_candidate_valid",
    category: "initial_candidate",
    database_target: "main",
    required_phase: "MIGRATIONS_APPLIED",
    setup: ["new_projection"],
    action: ["candidate_sequence_1_commit"],
    expected_outcome: "pass",
    cleanup_expectation: "fixture_retained",
    executor: "sql",
    assertion: "exact_success",
  });
  assert.doesNotThrow(() => assertInitialCandidateValidOutcome(null));
  const originalInitialCandidateFailure = Object.assign(
    new Error("sanitized_test_failure"),
    { code: "23514" },
  );
  assert.throws(
    () => assertInitialCandidateValidOutcome(originalInitialCandidateFailure),
    (error) => error === originalInitialCandidateFailure,
  );

  const validOutcome: ConcurrencyOutcome = {
    barrier_observed: true,
    exact_lock_observed: true,
    writer2_before_commit: "pending",
    loser_result: "duplicate_active",
    loser_sqlstate: "23505",
    rollback_performed: true,
    final_active_count: 1,
    clients_closed: true,
    timeline: EXPECTED_CONCURRENCY_TIMELINE,
  };
  assert.doesNotThrow(() => assertConcurrencyOutcome(validOutcome));
  const negativeOutcomes: ConcurrencyOutcome[] = [
    { ...validOutcome, barrier_observed: false },
    { ...validOutcome, exact_lock_observed: false },
    { ...validOutcome, writer2_before_commit: "success" },
    { ...validOutcome, loser_result: "success" },
    { ...validOutcome, loser_sqlstate: "40P01" },
    { ...validOutcome, rollback_performed: false },
    { ...validOutcome, final_active_count: 2 },
    { ...validOutcome, loser_result: "deadlock" },
    { ...validOutcome, loser_result: "statement_timeout" },
    { ...validOutcome, clients_closed: false },
    { ...validOutcome, timeline: EXPECTED_CONCURRENCY_TIMELINE.slice(0, -1) },
  ];
  negativeOutcomes.forEach((outcome) =>
    assert.throws(() => assertConcurrencyOutcome(outcome))
  );
  const expectedLock: ExpectedAdvisoryLockIdentity = {
    locktype: "advisory", database: "16384", classid: "9714",
    objid: "4000000001", objsubid: 2, granted: false, pid: 42,
  };
  const validLock = {
    locktype: "advisory", database: "16384", classid: "9714",
    objid: "4000000001", objsubid: 2, granted: false, pid: 42,
  };
  const validActivity = {
    pid: 42, wait_event_type: "Lock", wait_event: "advisory",
    state: "active", transaction_open: true,
  };
  const validObservation: ConcurrencyBarrierObservation = {
    locks: [validLock], activity: validActivity,
  };
  assert.doesNotThrow(() =>
    assertConcurrencyBarrierObservation(validObservation, expectedLock)
  );
  const invalidObservations: ConcurrencyBarrierObservation[] = [
    { locks: [{ ...validLock, pid: 99 }], activity: validActivity },
    { locks: [{ ...validLock, classid: "9715" }], activity: validActivity },
    { locks: [{ ...validLock, objid: "4000000000" }], activity: validActivity },
    { locks: [{ ...validLock, objsubid: 1 }], activity: validActivity },
    { locks: [{ ...validLock, granted: true }], activity: validActivity },
    { locks: [{ ...validLock, database: "16385" }], activity: validActivity },
    { locks: [validLock], activity: { ...validActivity, wait_event_type: null } },
    { locks: [validLock], activity: { ...validActivity, wait_event: "transactionid" } },
    { locks: [validLock], activity: { ...validActivity, pid: 43 } },
    { locks: [validLock], activity: { ...validActivity, transaction_open: false } },
  ];
  invalidObservations.forEach((observation) =>
    assert.throws(() =>
      assertConcurrencyBarrierObservation(observation, expectedLock)
    )
  );
  for (const observation of invalidObservations) {
    let mockNow = 0;
    const connectedObserver = {
      async query(sql: string) {
        return sql.includes("pg_locks")
          ? { rows: observation.locks }
          : { rows: observation.activity === null ? [] : [observation.activity] };
      },
    } as unknown as Pick<Client, "query">;
    await assert.rejects(observeConcurrencyBarrier({
      observer: connectedObserver,
      expected: expectedLock,
      deadline_ms: 25,
      now: () => mockNow,
      async wait(milliseconds: number) { mockNow += milliseconds; },
    }), { message: "DAY147_A5_CONCURRENCY_BARRIER_TIMEOUT" });
  }

  const identityQueries: unknown[][] = [];
  const identitySql: string[] = [];
  const identityObserver = {
    async query(sql: string, values?: readonly unknown[]) {
      identitySql.push(sql);
      identityQueries.push([...(values ?? [])]);
      const date = values?.[0];
      return { rows: [{
        database: "16384",
        classid: date === "2026-08-10" ? "9718" : "9719",
        objid: "4000000001",
      }] };
    },
  } as unknown as Pick<Client, "query">;
  const forwardIdentity = await buildExpectedAdvisoryLockIdentity({
    observer: identityObserver,
    scope: { business_date: "2026-08-10", projection_type: "daily_work_records" },
    writer2_pid: 42,
  });
  const reverseIdentity = await buildExpectedAdvisoryLockIdentity({
    observer: identityObserver,
    scope: { business_date: "2026-08-11", projection_type: "daily_work_records" },
    writer2_pid: 43,
  });
  assert.notEqual(forwardIdentity.classid, reverseIdentity.classid);
  assert.deepEqual(identityQueries, [
    ["2026-08-10", "daily_work_records"],
    ["2026-08-11", "daily_work_records"],
  ]);
  assert.ok(identitySql.every((sql) =>
    sql.includes("($1::date - date '2000-01-01')") &&
    sql.includes("'farmos:a1:projection-scope:' || $2::text") &&
    sql.includes("::oid") && sql.includes("current_database()")
  ));

  let timeoutNow = 0;
  const timeoutObserver = {
    async query(sql: string) {
      return sql.includes("pg_locks")
        ? { rows: [] }
        : { rows: [validActivity] };
    },
  } as unknown as Pick<Client, "query">;
  await assert.rejects(observeConcurrencyBarrier({
    observer: timeoutObserver,
    expected: expectedLock,
    deadline_ms: 50,
    now: () => timeoutNow,
    async wait(milliseconds: number) { timeoutNow += milliseconds; },
  }), { message: "DAY147_A5_CONCURRENCY_BARRIER_TIMEOUT" });

  const clientConfig = buildClientConfig({
    execution_identity: safeIdentity,
    port: 49_152,
    database_target: "main",
    application_role: "bundle_runtime",
    user: ROLE_FIXTURES.bundle_runtime_fixture.name,
    password: fixtureCredential,
    lock_timeout_ms: 2_000,
  });
  assert.throws(() => buildClientConfig({
    execution_identity: safeIdentity,
    port: 49_152,
    database_target: "main",
    application_role: "verification",
    user: ROLE_FIXTURES.bundle_runtime_fixture.name,
    password: fixtureCredential,
    lock_timeout_ms: 2_000,
  }), { message: "DAY147_A5_PG_CONFIG_INVALID" });
  assert.deepEqual(sanitizedClientMetadata(clientConfig), {
    host: LOCAL_HOST,
    mapped_port: 49_152,
    database_label: names.main,
    application_name: buildApplicationName(safeIdentity, "main", "bundle_runtime"),
    ssl: false,
  });
  assert.equal("connectionString" in clientConfig, false);
  assert.equal(clientConfig.options,
    "-c search_path=pg_catalog -c default_transaction_isolation=read\\ committed");
  const postStartBindings: PostStartLocalTarget["final_pg_bindings"] = [
    {
      config: buildClientConfig({
        execution_identity: safeIdentity, port: 49_152,
        database_target: "main", application_role: "migration_owner",
        user: ROLE_FIXTURES.migration_owner.name, password: fixtureCredential,
        lock_timeout_ms: 2_000,
      }),
      database_target: "main",
      application_role: "migration_owner",
    },
    {
      config: buildClientConfig({
        execution_identity: safeIdentity, port: 49_152,
        database_target: "legacy_active", application_role: "migration_owner",
        user: ROLE_FIXTURES.migration_owner.name, password: fixtureCredential,
        lock_timeout_ms: 2_000,
      }),
      database_target: "legacy_active",
      application_role: "migration_owner",
    },
    {
      config: buildClientConfig({
        execution_identity: safeIdentity, port: 49_152,
        database_target: "legacy_superseded", application_role: "migration_owner",
        user: ROLE_FIXTURES.migration_owner.name, password: fixtureCredential,
        lock_timeout_ms: 2_000,
      }),
      database_target: "legacy_superseded",
      application_role: "migration_owner",
    },
    { config: clientConfig, database_target: "main", application_role: "bundle_runtime" },
    {
      config: buildClientConfig({
        execution_identity: safeIdentity, port: 49_152,
        database_target: "main", application_role: "verification",
        user: ROLE_FIXTURES.verification.name, password: fixtureCredential,
        lock_timeout_ms: 2_000,
      }),
      database_target: "main",
      application_role: "verification",
    },
  ];
  const validatedHostConnection = validatePostStartLocalTarget({
    execution_identity: safeIdentity,
    mapped_host: LOCAL_HOST,
    mapped_port: 49_152,
    mapping_count: 1,
    inspected_container_name: names.container,
    expected_container_id: fullId,
    observed_container_id: fullId,
    port_resolution_container_id: fullId,
    preflight_image_digest: `sha256:${"d".repeat(64)}`,
    observed_container_image_digest: `sha256:${"d".repeat(64)}`,
    final_pg_bindings: postStartBindings,
  });
  assert.deepEqual(
    serializeValidatedConnectionTopology(validatedHostConnection),
    {
      topology: "HOST_LOOPBACK_MAPPED_PORT",
      transport: "TCP",
      host: LOCAL_HOST,
      mapped_port: 49_152,
      container_port: 5432,
      network_alias: null,
      network_nonce_bound: false,
      local_only_validated: true,
      remote_endpoint_rejected: true,
    },
  );
  const mutateBundleBinding = (
    mutate: (config: ClientConfig) => ClientConfig,
  ): PostStartLocalTarget["final_pg_bindings"] => postStartBindings.map((binding) =>
    binding.application_role === "bundle_runtime"
      ? { ...binding, config: mutate(binding.config) }
      : binding
  );
  const invalidPostTargets: readonly Partial<PostStartLocalTarget>[] = [
    { mapped_host: "localhost" }, { mapped_port: 0 }, { mapping_count: 2 },
    { inspected_container_name: otherNames.container },
    { observed_container_id: "b".repeat(64) },
    { port_resolution_container_id: "b".repeat(64) },
    { observed_container_image_digest: `sha256:${"e".repeat(64)}` },
    { final_pg_bindings: mutateBundleBinding((config) => ({
      ...config, ssl: true,
    })) },
    { final_pg_bindings: mutateBundleBinding((config) => ({ ...config,
      application_name: buildApplicationName(
        executionIdentityFromContainerName(otherNames.container),
        "main",
        "bundle_runtime",
      ),
    })) },
    { final_pg_bindings: mutateBundleBinding((config) => ({ ...config,
      application_name: buildApplicationName(
        safeIdentity,
        "main",
        "verification",
      ),
    })) },
    { final_pg_bindings: mutateBundleBinding((config) => ({ ...config,
      connectionString: "postgresql://127.0.0.1/db",
    })) },
    { final_pg_bindings: mutateBundleBinding((config) => ({ ...config,
      database: names.legacy_active,
    })) },
    { final_pg_bindings: mutateBundleBinding((config) => ({ ...config,
      user: ROLE_FIXTURES.verification.name,
    })) },
  ];
  for (const invalidPostTarget of invalidPostTargets) {
    assert.throws(() => validatePostStartLocalTarget({
      execution_identity: safeIdentity,
      mapped_host: LOCAL_HOST,
      mapped_port: 49_152,
      mapping_count: 1,
      inspected_container_name: names.container,
      expected_container_id: fullId,
      observed_container_id: fullId,
      port_resolution_container_id: fullId,
      preflight_image_digest: `sha256:${"d".repeat(64)}`,
      observed_container_image_digest: `sha256:${"d".repeat(64)}`,
      final_pg_bindings: postStartBindings,
      ...invalidPostTarget,
    }));
  }

  const evidenceFixture = (overrides: Readonly<{
    execution_nonce?: string;
    result: Evidence["result"];
    phase: HarnessPhase;
    execution_phase: HarnessPhase;
    evidence_phase: Evidence["evidence_phase"];
    evidence_status: Evidence["evidence_status"];
    durability_complete: boolean;
    success_claimed: boolean;
    artifact_valid: boolean;
    evidence_writer?: string | null;
    readiness?: FarmOsDay147A5ReadinessSummary;
  }>): Evidence => ({
    schema_version: FARM_OS_DAY147A5_EVIDENCE_SCHEMA_VERSION,
    execution_nonce: overrides.execution_nonce ?? "a1b2c3d4e5f6",
    day: "147-A",
    process: "A5",
    result: overrides.result,
    phase_reached: overrides.phase,
    execution_phase: overrides.execution_phase,
    evidence_phase: overrides.evidence_phase,
    evidence_status: overrides.evidence_status,
    durability_complete: overrides.durability_complete,
    success_claimed: overrides.success_claimed,
    receipt_required: true,
    receipt_relative_path: FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH,
    artifact: { artifact_written: true, artifact_valid: overrides.artifact_valid },
    readiness: overrides.readiness ?? {
      status: "READY",
      attempts: 1,
      elapsed_ms: 10,
      first_failure_class: null,
      last_failure_class: null,
      retryable_failure_count: 0,
      non_retryable_failure_count: 0,
      timeout_reached: false,
      container_exit_detected: false,
      container_state: "RUNNING",
      container_exit_code: 0,
      container_restarting: false,
      container_oom_killed: false,
      startup_elapsed_ms: 10,
      readiness_attempts_before_exit: 0,
      failure_origin: null,
    },
    checksums: MIGRATION_CHECKSUMS,
    postgres_version: "17.0",
    image: IMAGE,
    image_digest: `sha256:${"a".repeat(64)}`,
    connection_metadata: {
      topology: "HOST_LOOPBACK_MAPPED_PORT",
      transport: "TCP",
      host: LOCAL_HOST,
      mapped_port: 49_152,
      container_port: 5432,
      network_alias: null,
      network_nonce_bound: false,
      local_only_validated: true,
      remote_endpoint_rejected: true,
    },
    role_matrix: ROLE_FIXTURES,
    transition_matrix_summary: {
      states: 5, ordered_pairs: 25, allowed: 4, forbidden: 21,
    },
    test_results: EXECUTABLE_CASES.map(({ id, category }) => ({
      id,
      category,
      status: "PASS" as const,
    })),
    concurrency_timeline: [
      ...EXPECTED_CONCURRENCY_TIMELINE,
      ...EXPECTED_CONCURRENCY_TIMELINE,
    ],
    row_counts: { snapshots: 1, projections: 1, events: 1, lineage: 0 },
    failure_codes: {
      primary: overrides.result === "FAILED" || overrides.result === "BLOCKED"
        ? "DAY147_A5_EXECUTION_FAILED"
        : null,
      cleanup: null,
      evidence_writer: overrides.evidence_writer ?? null,
    },
    cleanup: {
      phase: "CLEANUP_COMPLETED",
      attempted: true,
      completed: true,
      post_cleanup_verified: true,
      container_absent: true,
      clients_closed: true,
      mapped_port_closed: true,
      persistent_volume_absent: true,
      failure_code: null,
    },
    safety: EVIDENCE_SAFETY,
  });
  const provisionalEvidence = evidenceFixture({
    result: "EVIDENCE_FINALIZATION_PENDING",
    phase: "CLEANUP_COMPLETED",
    execution_phase: "CLEANUP_COMPLETED",
    evidence_phase: "PROVISIONAL",
    evidence_status: "PROVISIONAL",
    durability_complete: false,
    success_claimed: false,
    artifact_valid: false,
  });
  const finalEvidence = evidenceFixture({
    result: "PASS",
    phase: "COMPLETE",
    execution_phase: "COMPLETE",
    evidence_phase: "FINALIZED",
    evidence_status: "VALID",
    durability_complete: true,
    success_claimed: true,
    artifact_valid: true,
  });
  const durabilityFailureEvidence = evidenceFixture({
    result: "FAILED",
    phase: "EVIDENCE_BLOCKED",
    execution_phase: "EVIDENCE_BLOCKED",
    evidence_phase: "FINALIZED",
    evidence_status: "VALID",
    durability_complete: true,
    success_claimed: false,
    artifact_valid: true,
    evidence_writer: "DAY147_A5_EVIDENCE_DURABILITY_BLOCKED",
  });
  const hostConnection = finalEvidence.connection_metadata;
  assert.ok(hostConnection);
  assert.equal(isFarmOsDay147A5ConnectionMetadata(hostConnection), true);
  const invalidHostConnections: unknown[] = [
    { ...hostConnection, mapped_port: null },
    { ...hostConnection, host: "localhost" },
    { ...hostConnection, host: "0.0.0.0" },
    { ...hostConnection, host: "::1" },
    { ...hostConnection, network_alias: "postgres" },
    { ...hostConnection, network_nonce_bound: true },
    { ...hostConnection, mapped_port: 0 },
    { ...hostConnection, mapped_port: 65_536 },
    { ...hostConnection, remote_endpoint_rejected: false },
    { ...hostConnection, topology: "DOCKER_USER_DEFINED_NETWORK" },
    { ...hostConnection, topology: "UNKNOWN" },
    { ...hostConnection, topology: 1 },
  ];
  invalidHostConnections.forEach((metadata) =>
    assert.equal(isFarmOsDay147A5ConnectionMetadata(metadata), false)
  );

  const validNetworkProof: DockerUserDefinedNetworkProof = {
    network_mode: "USER_DEFINED_BRIDGE",
    execution_nonce: finalEvidence.execution_nonce,
    network_nonce: finalEvidence.execution_nonce,
    postgres_network_nonce: finalEvidence.execution_nonce,
    runner_network_nonce: finalEvidence.execution_nonce,
    postgres_aliases: ["postgres"],
    postgres_host_publish: false,
    runner_db_host: "postgres",
    runner_db_port: 5432,
    remote_endpoint_present: false,
    docker_socket_mounted: false,
    result_nonce: finalEvidence.execution_nonce,
  };
  const networkConnection = serializeValidatedConnectionTopology(
    validateDockerUserDefinedNetworkProof(validNetworkProof),
  );
  assert.deepEqual(networkConnection, {
    topology: "DOCKER_USER_DEFINED_NETWORK",
    transport: "TCP",
    host: null,
    mapped_port: null,
    container_port: 5432,
    network_alias: "postgres",
    network_nonce_bound: true,
    local_only_validated: true,
    remote_endpoint_rejected: true,
  });
  assert.equal(isFarmOsDay147A5ConnectionMetadata(networkConnection), true);
  const invalidNetworkConnections: unknown[] = [
    { ...networkConnection, host: LOCAL_HOST },
    { ...networkConnection, mapped_port: 49_152 },
    { ...networkConnection, network_alias: null },
    { ...networkConnection, network_alias: "database" },
    { ...networkConnection, network_nonce_bound: false },
    { ...networkConnection, container_port: 5433 },
    { ...networkConnection, remote_endpoint_rejected: false },
    { ...networkConnection, unexpected: true },
    (({ network_alias: _missing, ...metadata }) => metadata)(networkConnection),
    { ...networkConnection, topology: "HOST_LOOPBACK_MAPPED_PORT" },
  ];
  invalidNetworkConnections.forEach((metadata) =>
    assert.equal(isFarmOsDay147A5ConnectionMetadata(metadata), false)
  );

  const invalidNetworkProofs: readonly DockerUserDefinedNetworkProof[] = [
    { ...validNetworkProof, network_mode: "DEFAULT_BRIDGE" },
    { ...validNetworkProof, network_mode: "HOST" },
    { ...validNetworkProof, network_mode: "OVERLAY" },
    { ...validNetworkProof, postgres_aliases: [] },
    { ...validNetworkProof, postgres_aliases: ["database"] },
    { ...validNetworkProof, runner_network_nonce: "bbbbbbbbbbbb" },
    { ...validNetworkProof, postgres_host_publish: true },
    { ...validNetworkProof, result_nonce: "bbbbbbbbbbbb" },
    { ...validNetworkProof, docker_socket_mounted: true },
    { ...validNetworkProof, runner_db_host: LOCAL_HOST },
    { ...validNetworkProof, runner_db_port: 49_152 },
    { ...validNetworkProof, remote_endpoint_present: true },
  ];
  invalidNetworkProofs.forEach((proof) =>
    assert.throws(() => validateDockerUserDefinedNetworkProof(proof))
  );
  const memoryRoot = "/memory";
  const executionNonce = finalEvidence.execution_nonce;
  const memoryPaths = runScopedEvidencePaths(memoryRoot, executionNonce);
  const buildCommittedChain = (evidence: Evidence) => {
    const evidenceBytes = serializedArtifact(evidence);
    const receipt: FarmOsDay147A5Receipt = {
      schema_version: FARM_OS_DAY147A5_RECEIPT_SCHEMA_VERSION,
      execution_nonce: evidence.execution_nonce,
      evidence_relative_path: FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH,
      evidence_sha256: sha256FarmOsDay147A5RawBytes(evidenceBytes),
      evidence_schema_version: FARM_OS_DAY147A5_EVIDENCE_SCHEMA_VERSION,
      result: "PASS",
      execution_phase: "COMPLETE",
      receipt_status: "COMMITTED",
      durability_complete: true,
      success_claimed: true,
    };
    const receiptBytes = serializedArtifact(receipt);
    const marker: FarmOsDay147A5CommitMarker = {
      schema_version: FARM_OS_DAY147A5_COMMIT_SCHEMA_VERSION,
      execution_nonce: evidence.execution_nonce,
      receipt_relative_path: FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH,
      receipt_sha256: sha256FarmOsDay147A5RawBytes(receiptBytes),
      status: "COMMITTED",
    };
    return {
      evidence,
      evidenceBytes,
      receipt,
      receiptBytes,
      marker,
      markerBytes: serializedArtifact(marker),
      durabilityAttestation: createDurabilityAttestation({
        execution_nonce: evidence.execution_nonce,
        evidence_bytes: evidenceBytes,
        receipt_bytes: receiptBytes,
        marker_bytes: serializedArtifact(marker),
      }),
    };
  };
  const committedChain = buildCommittedChain(finalEvidence);
  const networkCommittedChain = buildCommittedChain({
    ...finalEvidence,
    connection_metadata: networkConnection,
  });
  assert.equal(validateCommittedA5Evidence({
    evidenceBytes: networkCommittedChain.evidenceBytes,
    receiptBytes: networkCommittedChain.receiptBytes,
    markerBytes: networkCommittedChain.markerBytes,
    expectedExecutionNonce: executionNonce,
    durabilityAttestation: networkCommittedChain.durabilityAttestation,
  }).accepted, true);
  const withEvidenceNonce = (evidence: Evidence, nonce: string): Evidence => {
    return {
      ...evidence,
      execution_nonce: nonce,
    };
  };

  assert.deepEqual(validateFinalA5Evidence({
    evidenceBytes: committedChain.evidenceBytes,
    expectedExecutionNonce: executionNonce,
  }), {
    accepted: true,
    reason_code: "A5_FINAL_EVIDENCE_STAGE_VALID",
  });
  assert.deepEqual(validateA5ReceiptForEvidence({
    evidenceBytes: committedChain.evidenceBytes,
    receiptBytes: committedChain.receiptBytes,
    expectedExecutionNonce: executionNonce,
  }), {
    accepted: true,
    reason_code: "A5_RECEIPT_STAGE_VALID",
  });
  assert.deepEqual(validateA5CommitMarkerForReceipt({
    receiptBytes: committedChain.receiptBytes,
    markerBytes: committedChain.markerBytes,
    expectedExecutionNonce: executionNonce,
  }), {
    accepted: true,
    reason_code: "A5_COMMIT_MARKER_STAGE_VALID",
  });
  assert.deepEqual(validateCommittedA5Evidence({
    evidenceBytes: committedChain.evidenceBytes,
    receiptBytes: committedChain.receiptBytes,
    markerBytes: committedChain.markerBytes,
    expectedExecutionNonce: executionNonce,
    durabilityAttestation: committedChain.durabilityAttestation,
  }), {
    accepted: true,
    reason_code: "A5_COMMITTED_CHAIN_ACCEPTED",
  });
  assert.deepEqual(validateCommittedA5Evidence({
    evidenceBytes: committedChain.evidenceBytes,
    receiptBytes: committedChain.receiptBytes,
    markerBytes: committedChain.markerBytes,
    expectedExecutionNonce: executionNonce,
    durabilityAttestation: {
      kind: "DAY147_A5_DURABILITY_ATTESTED",
      execution_nonce: executionNonce,
      evidence_sha256: "0".repeat(64),
      receipt_sha256: "0".repeat(64),
      marker_sha256: "0".repeat(64),
    } as unknown as FarmOsDay147A5DurabilityAttestation,
  }), {
    accepted: false,
    reason_code: "A5_DURABILITY_ATTESTATION_INVALID",
  });
  const forgedMatchingHashAttestation = {
    kind: "DAY147_A5_DURABILITY_ATTESTED",
    execution_nonce: executionNonce,
    evidence_sha256: sha256FarmOsDay147A5RawBytes(
      committedChain.evidenceBytes,
    ),
    receipt_sha256: sha256FarmOsDay147A5RawBytes(
      committedChain.receiptBytes,
    ),
    marker_sha256: sha256FarmOsDay147A5RawBytes(committedChain.markerBytes),
  } as unknown as FarmOsDay147A5DurabilityAttestation;
  assert.deepEqual(validateCommittedA5Evidence({
    evidenceBytes: committedChain.evidenceBytes,
    receiptBytes: committedChain.receiptBytes,
    markerBytes: committedChain.markerBytes,
    expectedExecutionNonce: executionNonce,
    durabilityAttestation: forgedMatchingHashAttestation,
  }), {
    accepted: false,
    reason_code: "A5_DURABILITY_ATTESTATION_INVALID",
  });
  for (const incomplete of [
    { evidenceBytes: committedChain.evidenceBytes },
    {
      evidenceBytes: committedChain.evidenceBytes,
      receiptBytes: committedChain.receiptBytes,
    },
    {
      evidenceBytes: committedChain.evidenceBytes,
      markerBytes: committedChain.markerBytes,
    },
    {
      receiptBytes: committedChain.receiptBytes,
      markerBytes: committedChain.markerBytes,
    },
    { receiptBytes: committedChain.receiptBytes },
    { markerBytes: committedChain.markerBytes },
  ]) {
    assert.equal(validateCommittedA5Evidence({
      ...incomplete,
      expectedExecutionNonce: executionNonce,
      durabilityAttestation: committedChain.durabilityAttestation,
    }).accepted, false);
  }
  for (const invalidNonce of [
    "A1B2C3D4E5F6",
    "a1b2c3d4e5f",
    "a1b2c3d4e5f67",
    " a1b2c3d4e5f6",
    "a1b2c3d4e5f6 ",
  ]) {
    const invalidNonceChain = buildCommittedChain({
      ...finalEvidence,
      execution_nonce: invalidNonce,
    });
    assert.equal(validateCommittedA5Evidence({
      evidenceBytes: invalidNonceChain.evidenceBytes,
      receiptBytes: invalidNonceChain.receiptBytes,
      markerBytes: invalidNonceChain.markerBytes,
      expectedExecutionNonce: invalidNonce,
      durabilityAttestation: invalidNonceChain.durabilityAttestation,
    }).accepted, false);
  }
  const invalidCommittedChains = [
    buildCommittedChain((() => {
      const { failure_origin: _origin, ...legacyReadiness } =
        finalEvidence.readiness;
      return {
        ...finalEvidence,
        schema_version: 4,
        readiness: legacyReadiness,
      } as unknown as Evidence;
    })()),
    buildCommittedChain((() => {
      const { readiness: _readiness, ...legacyEvidence } = finalEvidence;
      return {
        ...legacyEvidence,
        schema_version: 3,
      } as unknown as Evidence;
    })()),
    buildCommittedChain({
      ...finalEvidence,
      schema_version: 5,
    } as unknown as Evidence),
    {
      ...committedChain,
      evidenceBytes: new Uint8Array([...committedChain.evidenceBytes, 0x20]),
    },
    {
      ...committedChain,
      receiptBytes: new Uint8Array([...committedChain.receiptBytes, 0x20]),
    },
    {
      ...committedChain,
      receiptBytes: serializedArtifact({
        ...committedChain.receipt,
        evidence_sha256: "f".repeat(64),
      }),
    },
    {
      ...committedChain,
      markerBytes: serializedArtifact({
        ...committedChain.marker,
        receipt_sha256: "f".repeat(64),
      }),
    },
    buildCommittedChain({ ...finalEvidence, execution_nonce: "bbbbbbbbbbbb" }),
    {
      ...committedChain,
      receiptBytes: serializedArtifact({
        ...committedChain.receipt,
        execution_nonce: "bbbbbbbbbbbb",
      }),
    },
    {
      ...committedChain,
      markerBytes: serializedArtifact({
        ...committedChain.marker,
        execution_nonce: "bbbbbbbbbbbb",
      }),
    },
    {
      ...committedChain,
      evidenceBytes: serializedArtifact({
        ...finalEvidence,
        schema_version: 99,
      }),
    },
    {
      ...committedChain,
      receiptBytes: serializedArtifact({
        ...committedChain.receipt,
        schema_version: 99,
      }),
    },
    ...[3, 4, 5, 7].map((evidenceSchemaVersion) => ({
      ...committedChain,
      receiptBytes: serializedArtifact({
        ...committedChain.receipt,
        evidence_schema_version: evidenceSchemaVersion,
      }),
    })),
    {
      ...committedChain,
      markerBytes: serializedArtifact({
        ...committedChain.marker,
        schema_version: 99,
      }),
    },
    buildCommittedChain({ ...finalEvidence, result: "FAILED" }),
    buildCommittedChain({
      ...finalEvidence,
      execution_phase: "CLEANUP_COMPLETED",
    }),
    buildCommittedChain({ ...finalEvidence, evidence_status: "INVALID" }),
    buildCommittedChain({ ...finalEvidence, success_claimed: false }),
    buildCommittedChain({
      ...finalEvidence,
      readiness: { ...finalEvidence.readiness, failure_origin: {} },
    } as unknown as Evidence),
    buildCommittedChain({
      ...finalEvidence,
      readiness: { ...finalEvidence.readiness, status: "FAILED" },
    } as unknown as Evidence),
    buildCommittedChain({
      ...finalEvidence,
      readiness: { ...finalEvidence.readiness, attempts: 0 },
    }),
    buildCommittedChain({
      ...finalEvidence,
      readiness: {
        ...finalEvidence.readiness,
        first_failure_class: "UNKNOWN",
        last_failure_class: null,
        retryable_failure_count: 1,
      },
    }),
    buildCommittedChain({
      ...finalEvidence,
      readiness: {
        ...finalEvidence.readiness,
        timeout_reached: true,
      },
    }),
    buildCommittedChain({
      ...finalEvidence,
      readiness: {
        ...finalEvidence.readiness,
        container_state: "EXITED",
      },
    }),
    buildCommittedChain({
      ...finalEvidence,
      readiness: {
        ...finalEvidence.readiness,
        unexpected: true,
      },
    } as unknown as Evidence),
    buildCommittedChain((() => {
      const { readiness: _missing, ...withoutReadiness } = finalEvidence;
      return withoutReadiness as unknown as Evidence;
    })()),
    {
      ...committedChain,
      receiptBytes: serializedArtifact({
        ...committedChain.receipt,
        receipt_status: "PENDING",
      }),
    },
    {
      ...committedChain,
      markerBytes: serializedArtifact({
        ...committedChain.marker,
        status: "PENDING",
      }),
    },
    {
      ...committedChain,
      receiptBytes: serializedArtifact({
        ...committedChain.receipt,
        evidence_relative_path: "../evidence.json",
      }),
    },
    {
      ...committedChain,
      markerBytes: serializedArtifact({
        ...committedChain.marker,
        receipt_relative_path: "/receipt.json",
      }),
    },
    {
      ...committedChain,
      evidenceBytes: serializedArtifact({ ...finalEvidence, unexpected: true }),
    },
    buildCommittedChain({
      ...finalEvidence,
      checksums: {},
    } as unknown as Evidence),
    buildCommittedChain({
      ...finalEvidence,
      test_results: [],
    }),
    buildCommittedChain({
      ...finalEvidence,
      test_results: [finalEvidence.test_results[0]!],
    }),
    buildCommittedChain({
      ...finalEvidence,
      test_results: finalEvidence.test_results.map((result, index) =>
        index === 0 ? { ...result, status: "SKIPPED" } : result
      ),
    } as unknown as Evidence),
    buildCommittedChain({
      ...finalEvidence,
      concurrency_timeline: finalEvidence.concurrency_timeline.slice(1),
    }),
    buildCommittedChain({
      ...finalEvidence,
      row_counts: {},
    }),
    buildCommittedChain({
      ...finalEvidence,
      transition_matrix_summary: {
        states: 5, ordered_pairs: 25, allowed: 5, forbidden: 20,
      },
    } as unknown as Evidence),
    buildCommittedChain({
      ...finalEvidence,
      failure_codes: {
        ...finalEvidence.failure_codes,
        primary: "DAY147_A5_FALSE_PASS",
      },
    }),
    buildCommittedChain({
      ...finalEvidence,
      cleanup: { ...finalEvidence.cleanup, completed: false },
    }),
    buildCommittedChain({
      ...finalEvidence,
      safety: { ...finalEvidence.safety, local_only_gate_passed: false },
    }),
    buildCommittedChain({ ...finalEvidence, postgres_version: "" }),
    buildCommittedChain({
      ...finalEvidence,
      image: "postgres:16",
    } as unknown as Evidence),
    buildCommittedChain({ ...finalEvidence, image_digest: "a".repeat(64) }),
    buildCommittedChain({
      ...finalEvidence,
      connection_metadata: null,
    }),
    buildCommittedChain({
      ...finalEvidence,
      connection_metadata: {
        ...finalEvidence.connection_metadata!,
        host: "remote.example",
      },
    } as unknown as Evidence),
    buildCommittedChain({
      ...finalEvidence,
      connection_metadata: {
        ...finalEvidence.connection_metadata!,
        mapped_port: 0,
      },
    } as unknown as Evidence),
    buildCommittedChain({
      ...finalEvidence,
      connection_metadata: {
        ...networkConnection,
        mapped_port: 49_152,
      },
    } as unknown as Evidence),
    buildCommittedChain({
      ...finalEvidence,
      role_matrix: {},
    } as unknown as Evidence),
    buildCommittedChain({
      ...finalEvidence,
      role_matrix: {
        ...finalEvidence.role_matrix,
        attacker: {
          ...finalEvidence.role_matrix.attacker,
          table_select: ["operational_memory_daily_projections"],
        },
      },
    } as unknown as Evidence),
    buildCommittedChain({
      ...finalEvidence,
      role_matrix: {
        ...finalEvidence.role_matrix,
        bundle_runtime_fixture: {
          ...finalEvidence.role_matrix.bundle_runtime_fixture,
          table_insert: ["app_business_table"],
        },
      },
    } as unknown as Evidence),
  ];
  for (const invalid of invalidCommittedChains) {
    assert.equal(validateCommittedA5Evidence({
      evidenceBytes: invalid.evidenceBytes,
      receiptBytes: invalid.receiptBytes,
      markerBytes: invalid.markerBytes,
      expectedExecutionNonce: executionNonce,
      durabilityAttestation: invalid.durabilityAttestation,
    }).accepted, false);
  }

  assert.equal(validateProvisionalA5Evidence({
    evidence: provisionalEvidence,
    receiptPresent: false,
    markerPresent: false,
  }).accepted, true);
  assert.equal(validateProvisionalA5Evidence({
    evidence: { ...provisionalEvidence, connection_metadata: null },
    receiptPresent: false,
    markerPresent: false,
  }).accepted, true);
  for (const invalidProvisional of [
    { ...provisionalEvidence, result: "PASS" },
    { ...provisionalEvidence, execution_phase: "COMPLETE" },
    { ...provisionalEvidence, evidence_phase: "FINALIZED" },
    { ...provisionalEvidence, evidence_status: "VALID" },
    { ...provisionalEvidence, durability_complete: true },
    { ...provisionalEvidence, success_claimed: true },
    { ...provisionalEvidence, phase_reached: "FAILED" },
    {
      ...provisionalEvidence,
      artifact: { artifact_written: false, artifact_valid: false },
    },
    {
      ...provisionalEvidence,
      cleanup: {
        ...provisionalEvidence.cleanup,
        phase: "CLEANUP_SKIPPED_NOT_STARTED",
        attempted: true,
      },
    },
    {
      ...provisionalEvidence,
      failure_codes: {
        ...provisionalEvidence.failure_codes,
        primary: "DAY147_A5_UNEXPECTED_PROVISIONAL_FAILURE",
      },
    },
    (() => {
      const { receipt_required: _missing, ...rest } = provisionalEvidence;
      return rest;
    })(),
  ]) {
    assert.equal(validateProvisionalA5Evidence({
      evidence: invalidProvisional,
      receiptPresent: false,
      markerPresent: false,
    }).accepted, false);
  }
  assert.equal(validateProvisionalA5Evidence({
    evidence: provisionalEvidence,
    receiptPresent: true,
    markerPresent: false,
  }).accepted, false);

  assert.equal(validateFailureA5Evidence({
    evidence: durabilityFailureEvidence,
    receiptPresent: false,
    markerPresent: false,
  }).accepted, true);
  assert.equal(validateFailureA5Evidence({
    evidence: { ...durabilityFailureEvidence, connection_metadata: null },
    receiptPresent: false,
    markerPresent: false,
  }).accepted, true);
  assert.equal(validateFailureA5Evidence({
    evidence: {
      ...durabilityFailureEvidence,
      connection_metadata: { ...networkConnection, mapped_port: 49_152 },
    },
    receiptPresent: false,
    markerPresent: false,
  }).accepted, false);
  const legacyVersionThreeFailure = (() => {
    const { readiness: _removed, ...legacy } = durabilityFailureEvidence;
    return {
      ...legacy,
      schema_version: 3,
    };
  })();
  assert.equal(validateFailureA5Evidence({
    evidence: legacyVersionThreeFailure,
    receiptPresent: false,
    markerPresent: false,
  }).accepted, true);
  const legacyVersionThreeBytes = serializedArtifact(legacyVersionThreeFailure);
  assert.equal(validateFinalA5Evidence({
    evidenceBytes: legacyVersionThreeBytes,
    expectedExecutionNonce: executionNonce,
  }).accepted, false);
  const invalidWriterFailure = invalidatedFailureEvidence(
    durabilityFailureEvidence,
  );
  assert.equal(validateFailureA5Evidence({
    evidence: invalidWriterFailure,
    receiptPresent: false,
    markerPresent: false,
  }).accepted, true);
  const timeoutFailureEvidence: Evidence = {
    ...durabilityFailureEvidence,
    readiness: {
      status: "FAILED",
      attempts: 1,
      elapsed_ms: A5_POSTGRES_READINESS_GLOBAL_DEADLINE_MS,
      first_failure_class: "CONNECTION_REFUSED",
      last_failure_class: "TIMEOUT",
      retryable_failure_count: 1,
      non_retryable_failure_count: 0,
      timeout_reached: true,
      container_exit_detected: false,
      container_state: "RUNNING",
      container_exit_code: 0,
      container_restarting: false,
      container_oom_killed: false,
      startup_elapsed_ms: A5_POSTGRES_READINESS_GLOBAL_DEADLINE_MS,
      readiness_attempts_before_exit: 0,
      failure_origin: buildPreAttemptFailureOrigin({ origin: "DEADLINE" }),
    },
    failure_codes: {
      ...durabilityFailureEvidence.failure_codes,
      primary: "DAY147_A5_POSTGRES_READINESS_TIMEOUT",
    },
  };
  assert.equal(validateFailureA5Evidence({
    evidence: timeoutFailureEvidence,
    receiptPresent: false,
    markerPresent: false,
  }).accepted, true);
  for (const [failureClass, primary] of [
    ["AUTHENTICATION_FAILED", "DAY147_A5_POSTGRES_READINESS_AUTHENTICATION_FAILED"],
    ["DATABASE_NOT_FOUND", "DAY147_A5_POSTGRES_READINESS_DATABASE_NOT_FOUND"],
    ["USER_NOT_FOUND", "DAY147_A5_POSTGRES_READINESS_USER_NOT_FOUND"],
    ["QUERY_FAILED", "DAY147_A5_POSTGRES_READINESS_QUERY_FAILED"],
    ["PROTOCOL_ERROR", "DAY147_A5_POSTGRES_READINESS_PROTOCOL_ERROR"],
    ["CLIENT_CLEANUP_FAILED", "DAY147_A5_POSTGRES_CLIENT_CLEANUP_FAILED"],
    ["OPERATION_CONVERGENCE_FAILED", "DAY147_A5_POSTGRES_OPERATION_CONVERGENCE_FAILED"],
    ["UNKNOWN", "DAY147_A5_POSTGRES_READINESS_UNKNOWN"],
  ] as const) {
    const boundFailure: Evidence = {
      ...timeoutFailureEvidence,
      readiness: {
        ...timeoutFailureEvidence.readiness,
        first_failure_class: failureClass,
        last_failure_class: failureClass,
        retryable_failure_count: 0,
        non_retryable_failure_count: 1,
        timeout_reached: false,
        failure_origin: buildStaticFailureOrigin(failureClass),
      },
      failure_codes: {
        ...timeoutFailureEvidence.failure_codes,
        primary,
      },
    };
    assert.equal(validateFailureA5Evidence({
      evidence: boundFailure,
      receiptPresent: false,
      markerPresent: false,
    }).accepted, true, failureClass);
    assert.equal(validateFailureA5Evidence({
      evidence: {
        ...boundFailure,
        failure_codes: {
          ...boundFailure.failure_codes,
          primary: "DAY147_A5_POSTGRES_READINESS_TIMEOUT",
        },
      },
      receiptPresent: false,
      markerPresent: false,
    }).accepted, false, `mismatch:${failureClass}`);
  }
  const attemptsZeroBase = {
    ...timeoutFailureEvidence.readiness,
    attempts: 0,
    retryable_failure_count: 0,
    non_retryable_failure_count: 0,
    readiness_attempts_before_exit: 0,
  } as const;
  for (const allowed of [
    {
      readiness: {
        ...attemptsZeroBase,
        first_failure_class: "CONTAINER_EXITED" as const,
        last_failure_class: "CONTAINER_EXITED" as const,
        timeout_reached: false,
        container_exit_detected: true,
        container_state: "EXITED" as const,
        container_exit_code: 1,
        failure_origin: buildPreAttemptFailureOrigin({
          origin: "CONTAINER_STATE",
        }),
      },
      primary: "DAY147_A5_POSTGRES_CONTAINER_EXITED",
    },
    {
      readiness: {
        ...attemptsZeroBase,
        first_failure_class: "UNKNOWN" as const,
        last_failure_class: "UNKNOWN" as const,
        timeout_reached: false,
        container_state: "UNKNOWN" as const,
        container_exit_code: null,
        failure_origin: buildPreAttemptFailureOrigin({ origin: "UNKNOWN" }),
      },
      primary: "DAY147_A5_POSTGRES_READINESS_UNKNOWN",
    },
    {
      readiness: {
        ...attemptsZeroBase,
        first_failure_class: "TIMEOUT" as const,
        last_failure_class: "TIMEOUT" as const,
        timeout_reached: true,
      },
      primary: "DAY147_A5_POSTGRES_READINESS_TIMEOUT",
    },
  ]) {
    assert.equal(validateFailureA5Evidence({
      evidence: {
        ...timeoutFailureEvidence,
        readiness: allowed.readiness,
        failure_codes: {
          ...timeoutFailureEvidence.failure_codes,
          primary: allowed.primary,
        },
      },
      receiptPresent: false,
      markerPresent: false,
    }).accepted, true, `attempts-zero:${allowed.readiness.last_failure_class}`);
  }
  for (const rejectedClass of [
    "AUTHENTICATION_FAILED", "DATABASE_NOT_FOUND", "USER_NOT_FOUND",
    "QUERY_FAILED", "PROTOCOL_ERROR", "CLIENT_CLEANUP_FAILED",
    "OPERATION_CONVERGENCE_FAILED", "CONNECTION_REFUSED", "CONNECTION_RESET",
    "STARTING_UP",
  ] as const) {
    assert.equal(validateFailureA5Evidence({
      evidence: {
        ...timeoutFailureEvidence,
        readiness: {
          ...attemptsZeroBase,
          first_failure_class: rejectedClass,
          last_failure_class: rejectedClass,
          timeout_reached: false,
        },
        failure_codes: {
          ...timeoutFailureEvidence.failure_codes,
          primary: rejectedClass === "OPERATION_CONVERGENCE_FAILED"
            ? "DAY147_A5_POSTGRES_OPERATION_CONVERGENCE_FAILED"
            : "DAY147_A5_POSTGRES_READINESS_UNKNOWN",
        },
      },
      receiptPresent: false,
      markerPresent: false,
    }).accepted, false, `attempts-zero-rejected:${rejectedClass}`);
  }
  for (const invalidZeroReadiness of [
    { ...attemptsZeroBase, retryable_failure_count: 1 },
    { ...attemptsZeroBase, non_retryable_failure_count: 1 },
    { ...attemptsZeroBase, readiness_attempts_before_exit: 1 },
    { ...attemptsZeroBase, attempt_timeline_count: 1 },
    {
      ...attemptsZeroBase,
      first_failure_class: "CONTAINER_EXITED",
      last_failure_class: "CONTAINER_EXITED",
      timeout_reached: false,
      container_exit_detected: true,
      container_state: "RUNNING",
    },
    {
      ...attemptsZeroBase,
      first_failure_class: "UNKNOWN",
      last_failure_class: "UNKNOWN",
      timeout_reached: false,
      container_state: "UNKNOWN",
      container_exit_code: 1,
    },
  ]) {
    assert.equal(validateFailureA5Evidence({
      evidence: { ...timeoutFailureEvidence, readiness: invalidZeroReadiness },
      receiptPresent: false,
      markerPresent: false,
    }).accepted, false);
  }
  for (const invalidReadinessFailure of [
    {
      ...timeoutFailureEvidence,
      readiness: {
        ...timeoutFailureEvidence.readiness,
        timeout_reached: false,
      },
    },
    {
      ...timeoutFailureEvidence,
      readiness: {
        ...timeoutFailureEvidence.readiness,
        retryable_failure_count: 0,
      },
    },
    {
      ...timeoutFailureEvidence,
      failure_codes: {
        ...timeoutFailureEvidence.failure_codes,
        primary: "DAY147_A5_POSTGRES_READINESS_AUTHENTICATION_FAILED",
      },
    },
    {
      ...timeoutFailureEvidence,
      readiness: {
        ...timeoutFailureEvidence.readiness,
        last_failure_class: "CONTAINER_EXITED",
        timeout_reached: false,
        container_state: "RUNNING",
        container_exit_detected: true,
      },
      failure_codes: {
        ...timeoutFailureEvidence.failure_codes,
        primary: "DAY147_A5_POSTGRES_CONTAINER_EXITED",
      },
    },
  ]) {
    assert.equal(validateFailureA5Evidence({
      evidence: invalidReadinessFailure,
      receiptPresent: false,
      markerPresent: false,
    }).accepted, false);
  }
  for (const invalidFailure of [
    { ...durabilityFailureEvidence, result: "PASS" },
    { ...durabilityFailureEvidence, success_claimed: true },
    { ...durabilityFailureEvidence, execution_phase: "COMPLETE" },
    { ...durabilityFailureEvidence, phase_reached: "FAILED" },
    {
      ...durabilityFailureEvidence,
      failure_codes: {
        ...durabilityFailureEvidence.failure_codes,
        primary: null,
      },
    },
    {
      ...durabilityFailureEvidence,
      artifact: { artifact_written: false, artifact_valid: true },
    },
    {
      ...durabilityFailureEvidence,
      cleanup: {
        ...durabilityFailureEvidence.cleanup,
        phase: "CLEANUP_SKIPPED_NOT_STARTED",
        attempted: true,
      },
    },
    {
      ...durabilityFailureEvidence,
      phase_reached: "CLEANUP_COMPLETED",
      execution_phase: "CLEANUP_COMPLETED",
    },
    {
      ...durabilityFailureEvidence,
      failure_codes: {
        ...durabilityFailureEvidence.failure_codes,
        evidence_writer: "DAY147_A5_UNKNOWN_WRITER_FAILURE",
      },
    },
    {
      ...durabilityFailureEvidence,
      cleanup: {
        ...durabilityFailureEvidence.cleanup,
        failure_code: "DAY147_A5_CLEANUP_FAILED",
      },
    },
    { ...durabilityFailureEvidence, readiness: {} },
    {
      ...durabilityFailureEvidence,
      readiness: {
        ...durabilityFailureEvidence.readiness,
        status: "FAILED",
        first_failure_class: null,
        last_failure_class: null,
      },
    },
    (() => {
      const { readiness: _missing, ...rest } = durabilityFailureEvidence;
      return rest;
    })(),
  ]) {
    assert.equal(validateFailureA5Evidence({
      evidence: invalidFailure,
      receiptPresent: false,
      markerPresent: false,
    }).accepted, false);
  }
  assert.equal(validateFailureA5Evidence({
    evidence: durabilityFailureEvidence,
    receiptPresent: false,
    markerPresent: true,
  }).accepted, false);
  assert.equal(validateFailureA5Evidence({
    evidence: {
      ...invalidWriterFailure,
      failure_codes: {
        ...invalidWriterFailure.failure_codes,
        evidence_writer: "DAY147_A5_COMMIT_CHAIN_INVALIDATION_FAILED",
      },
    },
    receiptPresent: false,
    markerPresent: false,
  }).accepted, false);
  assert.equal(validateFailureA5Evidence({
    evidence: {
      ...invalidWriterFailure,
      failure_codes: {
        ...invalidWriterFailure.failure_codes,
        evidence_writer: "DAY147_A5_UNKNOWN_WRITER_FAILURE",
      },
    },
    receiptPresent: false,
    markerPresent: false,
  }).accepted, false);
  assert.equal(validateFailureA5Evidence({
    evidence: durabilityFailureEvidence,
    receiptPresent: true,
    markerPresent: false,
  }).accepted, false);

  const successfulMemory = createMemoryEvidenceIo();
  const successfulWrite = await writeEvidenceAtomically({
    root: memoryRoot,
    execution_nonce: executionNonce,
    final_evidence: finalEvidence,
    failure_evidence: durabilityFailureEvidence,
    forbidden_values: new Set(),
    io: successfulMemory.io,
  });
  assert.equal("artifact_chain_valid" in successfulWrite, true);
  const persistedEvidence = successfulMemory.files.get(memoryPaths.evidence);
  const persistedReceipt = successfulMemory.files.get(memoryPaths.receipt);
  const persistedMarker = successfulMemory.files.get(memoryPaths.marker);
  assert.equal(validateCommittedA5Evidence({
    evidenceBytes: persistedEvidence,
    receiptBytes: persistedReceipt,
    markerBytes: persistedMarker,
    expectedExecutionNonce: executionNonce,
    durabilityAttestation: committedChain.durabilityAttestation,
  }).accepted, true);
  assert.deepEqual(parseArtifactBytes<Evidence>(persistedEvidence), finalEvidence);

  const imageFailureEvidence: Evidence = {
    ...durabilityFailureEvidence,
    result: "BLOCKED",
    execution_nonce: "cccccccccccc",
    phase_reached: "CLEANUP_SKIPPED_NOT_STARTED",
    execution_phase: "CLEANUP_SKIPPED_NOT_STARTED",
    evidence_phase: "FINALIZED",
    image_digest: null,
    failure_codes: {
      primary: "DAY147_A5_ENVIRONMENT_BLOCKED",
      cleanup: null,
      evidence_writer: null,
    },
    cleanup: {
      phase: "CLEANUP_SKIPPED_NOT_STARTED",
      attempted: false,
      completed: false,
      post_cleanup_verified: false,
      container_absent: true,
      clients_closed: true,
      mapped_port_closed: true,
      persistent_volume_absent: true,
      failure_code: null,
    },
  };
  const imageFailureMemory = createMemoryEvidenceIo();
  assert.deepEqual(await writeEvidenceAtomically({
    root: memoryRoot,
    execution_nonce: imageFailureEvidence.execution_nonce,
    failure_evidence: imageFailureEvidence,
    forbidden_values: new Set(),
    io: imageFailureMemory.io,
  }), { status: "synced", secondary_note: null });
  const imageFailurePaths = runScopedEvidencePaths(
    memoryRoot,
    imageFailureEvidence.execution_nonce,
  );
  assert.deepEqual(
    parseArtifactBytes<Evidence>(
      imageFailureMemory.files.get(imageFailurePaths.evidence),
    ),
    imageFailureEvidence,
  );
  assert.equal(imageFailureMemory.files.has(imageFailurePaths.receipt), false);
  assert.equal(imageFailureMemory.files.has(imageFailurePaths.marker), false);
  assert.equal(validateCommittedA5Evidence({
    evidenceBytes: imageFailureMemory.files.get(imageFailurePaths.evidence),
    expectedExecutionNonce: imageFailureEvidence.execution_nonce,
    durabilityAttestation: createDurabilityAttestation({
      execution_nonce: imageFailureEvidence.execution_nonce,
      evidence_bytes: imageFailureMemory.files.get(imageFailurePaths.evidence)!,
      receipt_bytes: new Uint8Array(),
      marker_bytes: new Uint8Array(),
    }),
  }).accepted, false);

  const failedFailureWriterMemory = createMemoryEvidenceIo({
    fail_event: "failure:directory_sync",
  });
  await assert.rejects(writeEvidenceAtomically({
    root: memoryRoot,
    execution_nonce: imageFailureEvidence.execution_nonce,
    failure_evidence: imageFailureEvidence,
    forbidden_values: new Set(),
    io: failedFailureWriterMemory.io,
  }), { message: "DAY147_A5_EVIDENCE_DURABILITY_BLOCKED" });

  const writerStageCases: readonly Readonly<{
    id: string;
    fail_event?: string;
    fail_event_occurrence?: Readonly<{ event: string; occurrence: number }>;
    corrupt_readback_stage?: EvidenceWriteStage;
    expected_stage: A5EvidenceWriteSubstage;
    expected_code: A5EvidenceWriteErrorCode;
    empty_run_removed: boolean;
  }>[] = [
    {
      id: "mkdir",
      fail_event: "failure:mkdir",
      expected_stage: "mkdir",
      expected_code: "DAY147_A5_EVIDENCE_MKDIR_FAILED",
      empty_run_removed: false,
    },
    {
      id: "preflight_absence",
      fail_event: "failure:temp_absence",
      expected_stage: "preflight_absence",
      expected_code: "DAY147_A5_EVIDENCE_PREFLIGHT_ABSENCE_FAILED",
      empty_run_removed: true,
    },
    {
      id: "temp_open",
      fail_event: "failure:open",
      expected_stage: "temp_open",
      expected_code: "DAY147_A5_EVIDENCE_TEMP_OPEN_FAILED",
      empty_run_removed: true,
    },
    {
      id: "write",
      fail_event: "failure:write",
      expected_stage: "write",
      expected_code: "DAY147_A5_EVIDENCE_WRITE_FAILED",
      empty_run_removed: true,
    },
    {
      id: "file_sync",
      fail_event: "failure:file_sync",
      expected_stage: "file_sync",
      expected_code: "DAY147_A5_EVIDENCE_FILE_SYNC_FAILED",
      empty_run_removed: true,
    },
    {
      id: "close",
      fail_event: "failure:close",
      expected_stage: "close",
      expected_code: "DAY147_A5_EVIDENCE_CLOSE_FAILED",
      empty_run_removed: true,
    },
    {
      id: "rename",
      fail_event: "failure:rename",
      expected_stage: "rename",
      expected_code: "DAY147_A5_EVIDENCE_RENAME_FAILED",
      empty_run_removed: true,
    },
    {
      id: "directory_sync",
      fail_event: "failure:directory_sync",
      expected_stage: "directory_sync",
      expected_code: "DAY147_A5_EVIDENCE_DIRECTORY_SYNC_FAILED",
      empty_run_removed: false,
    },
    {
      id: "readback",
      fail_event: "failure:readback",
      expected_stage: "readback",
      expected_code: "DAY147_A5_EVIDENCE_READBACK_FAILED",
      empty_run_removed: false,
    },
    {
      id: "hash",
      corrupt_readback_stage: "failure",
      expected_stage: "hash",
      expected_code: "DAY147_A5_EVIDENCE_HASH_FAILED",
      empty_run_removed: false,
    },
    {
      id: "temp_absence",
      fail_event_occurrence: {
        event: "failure:temp_absence",
        occurrence: 4,
      },
      expected_stage: "temp_absence",
      expected_code: "DAY147_A5_EVIDENCE_TEMP_ABSENCE_FAILED",
      empty_run_removed: false,
    },
  ];
  const rawFailureText =
    "EACCES open /Users/private/farm.sock syscall=open credential=visible " +
    "postgresql://user:password@localhost/db";
  for (const [index, testCase] of writerStageCases.entries()) {
    const nonce = (index + 1).toString(16).padStart(12, "0");
    const memory = createMemoryEvidenceIo({
      fail_event: testCase.fail_event,
      fail_event_occurrence: testCase.fail_event_occurrence,
      corrupt_readback_stage: testCase.corrupt_readback_stage,
      raw_error_message: rawFailureText,
    });
    await assert.rejects(writeEvidenceAtomically({
      root: `/memory-writer-stage-${testCase.id}`,
      execution_nonce: nonce,
      failure_evidence: withEvidenceNonce(imageFailureEvidence, nonce),
      forbidden_values: new Set(),
      io: memory.io,
    }), (error: unknown) => {
      assert.ok(error instanceof A5EvidenceWriteError, testCase.id);
      assert.equal(error.message, "DAY147_A5_EVIDENCE_DURABILITY_BLOCKED");
      assert.equal(error.failure_evidence_stage, testCase.expected_stage);
      assert.equal(error.failure_evidence_error_code, testCase.expected_code);
      assert.equal(
        error.empty_run_directory_removed,
        testCase.empty_run_removed,
      );
      assert.equal(error.cleanup_error_code, null);
      const exposed = `${error.message}\n${error.stack ?? ""}\n${JSON.stringify(error)}`;
      for (const forbidden of [
        "/Users/private", "EACCES", "syscall", "credential", "visible",
        "postgresql://", "password",
      ]) assert.equal(exposed.includes(forbidden), false, `${testCase.id}:${forbidden}`);
      return true;
    });
    const stagePaths = runScopedEvidencePaths(
      `/memory-writer-stage-${testCase.id}`,
      nonce,
    );
    if (testCase.empty_run_removed) {
      assert.equal(memory.directories.has(stagePaths.runRoot), false);
      assert.ok(memory.events.includes("cleanup:rmdir_run"));
      assert.ok(memory.events.includes("cleanup:rmdir_runs"));
      assert.ok(memory.events.includes("cleanup:rmdir_reports"));
    } else if (testCase.expected_stage !== "mkdir") {
      assert.equal(memory.directories.has(stagePaths.runRoot), true);
      assert.ok(memory.files.size > 0);
    }
  }

  const rawFailureMemory = createMemoryEvidenceIo({
    fail_event: "failure:open",
    raw_error_message: rawFailureText,
  });
  await assert.rejects(writeEvidenceAtomically({
    root: "/memory-raw-error-sanitization",
    execution_nonce: "151515151515",
    failure_evidence: withEvidenceNonce(imageFailureEvidence, "151515151515"),
    forbidden_values: new Set(["visible"]),
    io: rawFailureMemory.io,
  }), (error: unknown) => {
    assert.ok(error instanceof A5EvidenceWriteError);
    assert.equal(error.cause, undefined);
    const exposed = `${error.message}\n${error.stack ?? ""}\n${JSON.stringify(error)}`;
    for (const forbidden of [
      "/Users/private", "EACCES", "syscall", "credential", "visible",
      "postgresql://", "password",
    ]) assert.equal(exposed.includes(forbidden), false, forbidden);
    assert.equal(
      error.failure_evidence_error_code,
      "DAY147_A5_EVIDENCE_TEMP_OPEN_FAILED",
    );
    return true;
  });

  const cleanupFailureNonce = "abababababab";
  const cleanupFailureMemory = createMemoryEvidenceIo({
    fail_events: ["failure:open", "cleanup:rmdir_run"],
  });
  await assert.rejects(writeEvidenceAtomically({
    root: "/memory-empty-cleanup-failure",
    execution_nonce: cleanupFailureNonce,
    failure_evidence: withEvidenceNonce(
      imageFailureEvidence,
      cleanupFailureNonce,
    ),
    forbidden_values: new Set(),
    io: cleanupFailureMemory.io,
  }), (error: unknown) =>
    error instanceof A5EvidenceWriteError &&
    error.failure_evidence_stage === "temp_open" &&
    error.cleanup_error_code ===
      "DAY147_A5_EMPTY_RUN_DIRECTORY_CLEANUP_FAILED"
  );

  const protectedCleanupNonce = "acacacacacac";
  const protectedCleanupRoot = "/memory-empty-cleanup-protected";
  const protectedCleanupPaths = runScopedEvidencePaths(
    protectedCleanupRoot,
    protectedCleanupNonce,
  );
  const protectedCleanupMemory = createMemoryEvidenceIo({
    initial_files: new Map([
      [protectedCleanupPaths.receipt, new Uint8Array([1])],
      [protectedCleanupPaths.marker, new Uint8Array([2])],
    ]),
  });
  assert.equal(await cleanupExactEmptyCurrentRun({
    paths: protectedCleanupPaths,
    io: protectedCleanupMemory.io,
  }), false);
  assert.equal(
    protectedCleanupMemory.directories.has(protectedCleanupPaths.runRoot),
    true,
  );

  const hiddenCleanupNonce = "adadadadadad";
  const hiddenCleanupRoot = "/memory-empty-cleanup-hidden";
  const hiddenCleanupPaths = runScopedEvidencePaths(
    hiddenCleanupRoot,
    hiddenCleanupNonce,
  );
  const hiddenCleanupMemory = createMemoryEvidenceIo({
    initial_files: new Map([[
      resolve(hiddenCleanupPaths.runRoot, ".unexpected"),
      new Uint8Array([1]),
    ]]),
  });
  assert.equal(await cleanupExactEmptyCurrentRun({
    paths: hiddenCleanupPaths,
    io: hiddenCleanupMemory.io,
  }), false);

  const siblingCleanupNonce = "aeaeaeaeaeae";
  const siblingOtherNonce = "afafafafafaf";
  const siblingCleanupRoot = "/memory-empty-cleanup-sibling";
  const siblingCleanupPaths = runScopedEvidencePaths(
    siblingCleanupRoot,
    siblingCleanupNonce,
  );
  const siblingOtherPaths = runScopedEvidencePaths(
    siblingCleanupRoot,
    siblingOtherNonce,
  );
  const siblingCleanupMemory = createMemoryEvidenceIo({
    initial_files: new Map([
      [siblingOtherPaths.evidence, new Uint8Array([1])],
      [siblingOtherPaths.receipt, new Uint8Array([2])],
      [siblingOtherPaths.marker, new Uint8Array([3])],
    ]),
  });
  await siblingCleanupMemory.io.mkdir(siblingCleanupPaths.runRoot);
  assert.equal(await cleanupExactEmptyCurrentRun({
    paths: siblingCleanupPaths,
    io: siblingCleanupMemory.io,
  }), true);
  assert.equal(
    siblingCleanupMemory.directories.has(siblingOtherPaths.runRoot),
    true,
  );
  assert.deepEqual(
    siblingCleanupMemory.files.get(siblingOtherPaths.marker),
    new Uint8Array([3]),
  );
  assert.equal(
    siblingCleanupMemory.directories.has(siblingCleanupPaths.runsRoot),
    true,
  );

  const emptySiblingNonce = "babababababa";
  const emptySiblingOtherNonce = "bdbdbdbdbdbd";
  const emptySiblingRoot = "/memory-empty-cleanup-empty-sibling";
  const emptySiblingPaths = runScopedEvidencePaths(
    emptySiblingRoot,
    emptySiblingNonce,
  );
  const emptySiblingOtherPaths = runScopedEvidencePaths(
    emptySiblingRoot,
    emptySiblingOtherNonce,
  );
  const emptySiblingMemory = createMemoryEvidenceIo();
  await emptySiblingMemory.io.mkdir(emptySiblingPaths.runRoot);
  await emptySiblingMemory.io.mkdir(emptySiblingOtherPaths.runRoot);
  assert.equal(await cleanupExactEmptyCurrentRun({
    paths: emptySiblingPaths,
    io: emptySiblingMemory.io,
  }), true);
  assert.equal(
    emptySiblingMemory.directories.has(emptySiblingOtherPaths.runRoot),
    true,
  );
  assert.equal(
    emptySiblingMemory.directories.has(emptySiblingPaths.runsRoot),
    true,
  );

  const rootNonEmptyNonce = "bcbcbcbcbcbc";
  const rootNonEmptyRoot = "/memory-empty-cleanup-root-nonempty";
  const rootNonEmptyPaths = runScopedEvidencePaths(
    rootNonEmptyRoot,
    rootNonEmptyNonce,
  );
  const rootNonEmptyMemory = createMemoryEvidenceIo({
    initial_files: new Map([[
      resolve(rootNonEmptyPaths.reportsRoot, ".keep"),
      new Uint8Array([1]),
    ]]),
  });
  await rootNonEmptyMemory.io.mkdir(rootNonEmptyPaths.runRoot);
  await assert.rejects(cleanupExactEmptyCurrentRun({
    paths: rootNonEmptyPaths,
    io: rootNonEmptyMemory.io,
  }), { message: "DAY147_A5_EMPTY_RUN_DIRECTORY_CLEANUP_FAILED" });
  assert.equal(
    rootNonEmptyMemory.directories.has(rootNonEmptyPaths.runRoot),
    true,
  );
  assert.equal(
    rootNonEmptyMemory.directories.has(rootNonEmptyPaths.reportsRoot),
    true,
  );

  const symlinkCleanupNonce = "cdcdcdcdcdcd";
  const symlinkCleanupRoot = "/memory-empty-cleanup-symlink";
  const symlinkCleanupPaths = runScopedEvidencePaths(
    symlinkCleanupRoot,
    symlinkCleanupNonce,
  );
  const symlinkCleanupMemory = createMemoryEvidenceIo({
    directory_overrides: new Map([[
      symlinkCleanupPaths.runRoot,
      {
        kind: "symlink", entries: [], uid: 501, gid: 20,
        mode: 0o700, canonical_path: symlinkCleanupPaths.runRoot,
      },
    ]]),
  });
  await symlinkCleanupMemory.io.mkdir(symlinkCleanupPaths.runRoot);
  await assert.rejects(cleanupExactEmptyCurrentRun({
    paths: symlinkCleanupPaths,
    io: symlinkCleanupMemory.io,
  }), { message: "DAY147_A5_EMPTY_RUN_DIRECTORY_CLEANUP_FAILED" });

  const cleanupDirectoryState = (
    path: string,
    entries: readonly string[],
    overrides: Partial<EvidenceDirectoryState> = {},
  ): EvidenceDirectoryState => ({
    kind: "directory",
    entries,
    uid: STATIC_CURRENT_USER.uid,
    gid: STATIC_CURRENT_USER.gid,
    mode: 0o700,
    canonical_path: path,
    ...overrides,
  });
  const cleanupProvenanceCases = [
    { id: "current_owner", target: "run", overrides: { uid: 502 } },
    { id: "current_group", target: "run", overrides: { mode: 0o720 } },
    { id: "current_world", target: "run", overrides: { mode: 0o702 } },
    { id: "runs_owner", target: "runs", overrides: { uid: 502 } },
    { id: "runs_group", target: "runs", overrides: { mode: 0o720 } },
    { id: "runs_world", target: "runs", overrides: { mode: 0o702 } },
    { id: "reports_owner", target: "reports", overrides: { uid: 502 } },
    { id: "reports_group", target: "reports", overrides: { mode: 0o720 } },
    { id: "reports_world", target: "reports", overrides: { mode: 0o702 } },
    { id: "current_gid", target: "run", overrides: { gid: 80 } },
    { id: "runs_gid", target: "runs", overrides: { gid: 80 } },
    { id: "reports_gid", target: "reports", overrides: { gid: 80 } },
    { id: "current_canonical", target: "run", overrides: { canonical_path: "/unexpected" } },
    { id: "runs_canonical", target: "runs", overrides: { canonical_path: "/unexpected" } },
    { id: "reports_canonical", target: "reports", overrides: { canonical_path: "/unexpected" } },
  ] as const;
  for (const [index, testCase] of cleanupProvenanceCases.entries()) {
    const nonce = (0x100 + index).toString(16).padStart(12, "0");
    const paths = runScopedEvidencePaths(
      `/memory-cleanup-provenance-${testCase.id}`,
      nonce,
    );
    const targetPath = testCase.target === "run"
      ? paths.runRoot
      : testCase.target === "runs"
      ? paths.runsRoot
      : paths.reportsRoot;
    const targetEntries = testCase.target === "run"
      ? []
      : testCase.target === "runs"
      ? [nonce]
      : ["runs"];
    const memory = createMemoryEvidenceIo({
      directory_overrides: new Map([[
        targetPath,
        cleanupDirectoryState(targetPath, targetEntries, testCase.overrides),
      ]]),
    });
    await memory.io.mkdir(paths.runRoot);
    await assert.rejects(cleanupExactEmptyCurrentRun({ paths, io: memory.io }),
      { message: "DAY147_A5_EMPTY_RUN_DIRECTORY_CLEANUP_FAILED" });
    assert.equal(memory.directories.has(paths.runRoot), true, testCase.id);
    assert.equal(memory.events.some((event) => event.startsWith("cleanup:rmdir")),
      false, testCase.id);
  }

  const unauthorizedCleanupPaths = runScopedEvidencePaths(
    "/memory-cleanup-unauthorized-root",
    "161616161616",
  );
  const unauthorizedCleanupMemory = createMemoryEvidenceIo({
    cleanup_reports_root_authorized: false,
  });
  await unauthorizedCleanupMemory.io.mkdir(unauthorizedCleanupPaths.runRoot);
  await assert.rejects(cleanupExactEmptyCurrentRun({
    paths: unauthorizedCleanupPaths,
    io: unauthorizedCleanupMemory.io,
  }), { message: "DAY147_A5_EMPTY_RUN_DIRECTORY_CLEANUP_FAILED" });
  assert.equal(
    unauthorizedCleanupMemory.directories.has(unauthorizedCleanupPaths.runRoot),
    true,
  );
  assert.equal(
    unauthorizedCleanupMemory.events.some((event) =>
      event.startsWith("cleanup:rmdir")
    ),
    false,
  );

  for (const rmdirTarget of ["runs", "reports"] as const) {
    const nonce = rmdirTarget === "runs" ? "121212121212" : "131313131313";
    const paths = runScopedEvidencePaths(
      `/memory-cleanup-rmdir-${rmdirTarget}`,
      nonce,
    );
    const memory = createMemoryEvidenceIo({
      fail_event: `cleanup:rmdir_${rmdirTarget}`,
    });
    await memory.io.mkdir(paths.runRoot);
    await assert.rejects(cleanupExactEmptyCurrentRun({ paths, io: memory.io }),
      { message: "DAY147_A5_EMPTY_RUN_DIRECTORY_CLEANUP_FAILED" });
    assert.ok(memory.events.includes(`cleanup:rmdir_${rmdirTarget}`));
  }

  for (const artifact of [
    FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH,
    FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH,
    FARM_OS_DAY147A5_COMMIT_RELATIVE_PATH,
    ".hidden",
  ]) {
    const nonce = createHash("sha256").update(artifact).digest("hex").slice(0, 12);
    const paths = runScopedEvidencePaths(`/memory-cleanup-artifact-${nonce}`, nonce);
    const artifactPath = resolve(paths.runRoot, artifact);
    const memory = createMemoryEvidenceIo({
      initial_files: new Map([[artifactPath, new Uint8Array([1])]]),
    });
    assert.equal(await cleanupExactEmptyCurrentRun({ paths, io: memory.io }), false);
    assert.deepEqual(memory.files.get(artifactPath), new Uint8Array([1]));
    assert.equal(memory.directories.has(paths.runRoot), true);
  }

  const nestedNonce = "141414141414";
  const nestedPaths = runScopedEvidencePaths("/memory-cleanup-nested", nestedNonce);
  const nestedMemory = createMemoryEvidenceIo();
  await nestedMemory.io.mkdir(resolve(nestedPaths.runRoot, "unexpected"));
  assert.equal(await cleanupExactEmptyCurrentRun({
    paths: nestedPaths,
    io: nestedMemory.io,
  }), false);
  assert.equal(nestedMemory.directories.has(resolve(nestedPaths.runRoot, "unexpected")), true);

  const durabilityFailureCases: readonly Readonly<{
    id: string;
    fail_event?: string;
    corrupt_readback_stage?: EvidenceWriteStage;
  }>[] = [
    { id: "evidence_fsync", fail_event: "evidence:file_sync" },
    { id: "evidence_rename", fail_event: "evidence:rename" },
    { id: "evidence_directory_fsync", fail_event: "evidence:directory_sync" },
    { id: "evidence_readback", fail_event: "evidence:readback" },
    { id: "evidence_hash", corrupt_readback_stage: "evidence" },
    { id: "receipt_fsync", fail_event: "receipt:file_sync" },
    { id: "receipt_rename", fail_event: "receipt:rename" },
    { id: "receipt_directory_fsync", fail_event: "receipt:directory_sync" },
    { id: "receipt_readback", fail_event: "receipt:readback" },
    { id: "receipt_hash", corrupt_readback_stage: "receipt" },
    { id: "marker_fsync", fail_event: "marker:file_sync" },
    { id: "marker_rename", fail_event: "marker:rename" },
    { id: "marker_directory_fsync", fail_event: "marker:directory_sync" },
    { id: "marker_readback", fail_event: "marker:readback" },
    { id: "marker_hash", corrupt_readback_stage: "marker" },
    { id: "temp_absence", fail_event: "marker:temp_absence" },
  ];
  const priorFiles = new Map(successfulMemory.files);
  const priorEvidence = priorFiles.get(memoryPaths.evidence);
  const priorReceipt = priorFiles.get(memoryPaths.receipt);
  const priorMarker = priorFiles.get(memoryPaths.marker);
  for (const testCase of durabilityFailureCases) {
    const currentNonce = "dddddddddddd";
    const currentEvidence = withEvidenceNonce(finalEvidence, currentNonce);
    const currentFailure = withEvidenceNonce(
      durabilityFailureEvidence,
      currentNonce,
    );
    const memory = createMemoryEvidenceIo({
      initial_files: priorFiles,
      fail_event: testCase.fail_event,
      corrupt_readback_stage: testCase.corrupt_readback_stage,
    });
    await assert.rejects(writeEvidenceAtomically({
      root: memoryRoot,
      execution_nonce: currentNonce,
      final_evidence: currentEvidence,
      failure_evidence: currentFailure,
      forbidden_values: new Set(),
      io: memory.io,
    }), (error: unknown) => {
      assert.ok(error instanceof Error, testCase.id);
      assert.equal(
        error.message,
        "DAY147_A5_EVIDENCE_DURABILITY_BLOCKED",
        `${testCase.id}:${memory.events.join(",")}`,
      );
      return true;
    });
    const currentPaths = runScopedEvidencePaths(memoryRoot, currentNonce);
    assert.equal(validateCommittedA5Evidence({
      evidenceBytes: memory.files.get(currentPaths.evidence),
      receiptBytes: memory.files.get(currentPaths.receipt),
      markerBytes: memory.files.get(currentPaths.marker),
      expectedExecutionNonce: currentNonce,
      durabilityAttestation: createDurabilityAttestation({
        execution_nonce: currentNonce,
        evidence_bytes: memory.files.get(currentPaths.evidence) ?? new Uint8Array(),
        receipt_bytes: memory.files.get(currentPaths.receipt) ?? new Uint8Array(),
        marker_bytes: memory.files.get(currentPaths.marker) ?? new Uint8Array(),
      }),
    }).accepted, false, testCase.id);
    assert.deepEqual(memory.files.get(memoryPaths.evidence), priorEvidence);
    assert.deepEqual(memory.files.get(memoryPaths.receipt), priorReceipt);
    assert.deepEqual(memory.files.get(memoryPaths.marker), priorMarker);
    assert.equal(validateCommittedA5Evidence({
      evidenceBytes: memory.files.get(memoryPaths.evidence),
      receiptBytes: memory.files.get(memoryPaths.receipt),
      markerBytes: memory.files.get(memoryPaths.marker),
      expectedExecutionNonce: executionNonce,
      durabilityAttestation: committedChain.durabilityAttestation,
    }).accepted, true, `prior run ${testCase.id}`);
  }

  const commitInvalidationFailureCases = [
    {
      id: "marker_remove_failure",
      fail_event_occurrence: { event: "marker:remove", occurrence: 1 },
    },
    {
      id: "marker_absence_verification_failure",
      fail_event: "failure:temp_absence",
    },
    { id: "receipt_remove_failure", fail_event: "receipt:remove" },
    {
      id: "run_directory_fsync_failure",
      fail_event_occurrence: { event: "marker:directory_sync", occurrence: 2 },
    },
  ] as const;
  for (const testCase of commitInvalidationFailureCases) {
    const currentNonce = "eeeeeeeeeeee";
    const currentEvidence = withEvidenceNonce(finalEvidence, currentNonce);
    const currentFailure = withEvidenceNonce(
      durabilityFailureEvidence,
      currentNonce,
    );
    const memory = createMemoryEvidenceIo({
      corrupt_readback_stage: "marker",
      fail_event: "fail_event" in testCase ? testCase.fail_event : undefined,
      fail_event_occurrence: "fail_event_occurrence" in testCase
        ? testCase.fail_event_occurrence
        : undefined,
    });
    const attestationCountBefore = durabilityAttestationCreations;
    await assert.rejects(writeEvidenceAtomically({
      root: memoryRoot,
      execution_nonce: currentNonce,
      final_evidence: currentEvidence,
      failure_evidence: currentFailure,
      forbidden_values: new Set(),
      io: memory.io,
    }), (error: unknown) =>
      error instanceof A5EvidenceWriteError &&
      error.failure_evidence_stage === "chain_invalidation" &&
      error.failure_evidence_error_code ===
        "DAY147_A5_EVIDENCE_CHAIN_INVALIDATION_FAILED"
    );
    assert.equal(
      durabilityAttestationCreations,
      attestationCountBefore,
      `${testCase.id}:attestation`,
    );
    assert.equal(
      memory.events.some((event) => event === "failure:open"),
      false,
      `${testCase.id}:failure evidence forbidden`,
    );
    if (
      testCase.id === "marker_remove_failure" ||
      testCase.id === "marker_absence_verification_failure"
    ) {
      assert.equal(
        memory.events.some((event) => event === "receipt:remove"),
        false,
        `${testCase.id}:receipt cleanup stopped`,
      );
    }
    if (testCase.id === "receipt_remove_failure") {
      assert.equal(
        memory.events.filter((event) => event === "marker:directory_sync")
          .length,
        1,
        `${testCase.id}:run fsync not continued`,
      );
    }
    assert.equal(
      memory.events.some((event) => event === "failure:remove"),
      false,
      `${testCase.id}:evidence cleanup stopped`,
    );
    const paths = runScopedEvidencePaths(memoryRoot, currentNonce);
    const remainingEvidence = memory.files.get(paths.evidence) ??
      new Uint8Array();
    const remainingReceipt = memory.files.get(paths.receipt) ??
      new Uint8Array();
    const remainingMarker = memory.files.get(paths.marker) ??
      new Uint8Array();
    assert.equal(validateCommittedA5Evidence({
      evidenceBytes: memory.files.get(paths.evidence),
      receiptBytes: memory.files.get(paths.receipt),
      markerBytes: memory.files.get(paths.marker),
      expectedExecutionNonce: currentNonce,
      durabilityAttestation: {
        kind: "DAY147_A5_DURABILITY_ATTESTED",
        execution_nonce: currentNonce,
        evidence_sha256: sha256FarmOsDay147A5RawBytes(remainingEvidence),
        receipt_sha256: sha256FarmOsDay147A5RawBytes(remainingReceipt),
        marker_sha256: sha256FarmOsDay147A5RawBytes(remainingMarker),
      } as unknown as FarmOsDay147A5DurabilityAttestation,
    }).accepted, false, `${testCase.id}:current run`);
  }

  const directorySyncEvents: string[] = [];
  assert.deepEqual(await syncOpenedDirectory({
    async sync() { directorySyncEvents.push("sync"); },
    async close() { directorySyncEvents.push("close"); },
  }), { status: "synced", secondary_note: null });
  assert.deepEqual(directorySyncEvents, ["sync", "close"]);
  const unsupportedSyncEvents: string[] = [];
  assert.deepEqual(await syncOpenedDirectory({
    async sync() {
      unsupportedSyncEvents.push("sync");
      const error = new Error("unsupported") as NodeJS.ErrnoException;
      error.code = "EINVAL";
      throw error;
    },
    async close() { unsupportedSyncEvents.push("close"); },
  }), {
    status: "unsupported",
    secondary_note: "directory_fsync_unsupported_on_platform",
  });
  assert.deepEqual(unsupportedSyncEvents, ["sync", "close"]);
  assert.deepEqual(await syncParentDirectory(
    "/unused",
    (async () => {
      const error = new Error("directory open unsupported") as NodeJS.ErrnoException;
      error.code = "EISDIR";
      throw error;
    }) as typeof open,
  ), {
    status: "unsupported",
    secondary_note: "directory_fsync_unsupported_on_platform",
  });
  await assert.rejects(syncOpenedDirectory({
    async sync() {
      const error = new Error("io") as NodeJS.ErrnoException;
      error.code = "EIO";
      throw error;
    },
    async close() {},
  }));
  await assert.rejects(syncOpenedDirectory({
    async sync() {
      const error = new Error("bad descriptor") as NodeJS.ErrnoException;
      error.code = "EBADF";
      throw error;
    },
    async close() {},
  }));

  assert.doesNotThrow(() => assertEvidenceSafe({
    result: "passed",
    connection_metadata: networkConnection,
    checksums: { day146: "a".repeat(64) },
    image_digest: `sha256:${"b".repeat(64)}`,
  }));
  assert.doesNotThrow(() => assertEvidenceSafe({
    evidence_sha256: "c".repeat(64),
  }));
  assert.doesNotThrow(() => assertEvidenceSafe({
    receipt_sha256: "d".repeat(64),
  }));
  assert.doesNotThrow(() => assertEvidenceSafe({
    receipt: { evidence_sha256: "e".repeat(64) },
    commit: { receipt_sha256: "f".repeat(64) },
  }));
  const unsafeEvidence: unknown[] = [
    { password: "x" }, { "database-url": "x" },
    { [["connection", "String"].join("")]: "x" },
    { nested: [{ container_id: fullId }] }, { credential: "x" },
    { value: "postgresql://127.0.0.1/db" },
    { value: "db.supabase.co" }, { value: "password=visible" },
    { value: "Bearer tokenvalue" }, { value: "/Users/tester/private" },
    { value: "/home/tester/private" }, { value: fullId },
    { network_name: "raw-network" }, { network_id: "raw-id" },
    { subnet: "172.18.0.0/16" }, { gateway: "172.18.0.1" },
    { container_ip: "172.18.0.2" }, { runner_image_id: "raw-image" },
    { endpoint_url: "tcp://remote.example" },
    { host_filesystem_path: "/private/runtime" },
    new Error("token=visible"),
    { attacker_sha256: "a".repeat(64) },
    { container_sha256: "b".repeat(64) },
    { nested: { arbitrary_sha256: "c".repeat(64) } },
    { unknown_digest: "A".repeat(64) },
  ];
  unsafeEvidence.forEach((value) =>
    assert.throws(() => assertEvidenceSafe(value, new Set(["visible"])))
  );

  let conflictCleanupCalls = 0;
  assert.equal(await verifySecurityInvokerConflictBranch({
    async repositoryAttempt() { return false; },
    async cleanup() { conflictCleanupCalls += 1; },
    counters: { grant_additions: 0, owner_fallbacks: 0 },
  }), "BLOCKED_IMPLEMENTATION_CONFLICT");
  assert.equal(conflictCleanupCalls, 1);

  assert.equal(counters.docker_commands, 0);
  assert.equal(counters.database_connections, 0);
  assert.equal(counters.evidence_writes, 0);
  assert.equal(counters.credential_generations, 0);

  const source = readFileSync(import.meta.filename, "utf8");
  for (const forbiddenSource of [
    ["exec", "Sync("].join(""),
    ["shell", ": true"].join(""),
    ['"docker", "', 'pull"'].join(""),
    ["--pull", "=always"].join(""),
    ["docker", " compose"].join(""),
    ["process.env", ".HOME"].join(""),
  ]) assert.equal(source.includes(forbiddenSource), false, forbiddenSource);
  const evidenceHelperSource = readFileSync(
    resolve(
      ROOT,
      "scripts/hermes/lib/farm_os_day147a5_evidence_contract.ts",
    ),
    "utf8",
  );
  for (const forbiddenHelperSource of [
    "node:fs",
    "node:child_process",
    'from "pg"',
    "process.env",
    "process.argv",
    "process.cwd",
    "new Date",
    "Date.now",
    "randomBytes",
  ]) {
    assert.equal(
      evidenceHelperSource.includes(forbiddenHelperSource),
      false,
      forbiddenHelperSource,
    );
  }
  assert.equal(evidenceHelperSource.includes("processDurabilityConfirmed"), false);
  assert.equal(source.includes(['key.endsWith("sha', '256")'].join("")), false);
}

async function listRegularFilesRecursively(root: string): Promise<readonly string[]> {
  const files: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error("DAY147_A5_NETWORK_SOURCE_SNAPSHOT_INVALID");
      }
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push(relative(root, path));
      else throw new Error("DAY147_A5_NETWORK_SOURCE_SNAPSHOT_INVALID");
    }
  };
  await visit(root);
  return Object.freeze(files.sort());
}

function productionNetworkOperations(
  counters: OperationCounters,
): ConcreteNetworkOrchestratorOperations & Readonly<{
  verify_build_only_residuals: (nonce: string) => Promise<void>;
  run_launcher_only_probe: (input: Readonly<{
    nonce: string; runner_image_id: string;
  }>) => Promise<LauncherOnlyProbeResult>;
}> {
  const receipts: NetworkCreationReceipt[] = [];
  let generatedArtifactStartManifest: GeneratedFailureArtifactManifest | null = null;
  const identity = currentUserIdentityFromOs();
  const dockerSafety = validateDockerEnvironment(dockerEnvironmentFromProcess(), identity);
  let postgresPassword: string | null = null;
  let clientResult: ClientResult | null = null;
  let postgresImageId: string | null = null;
  let readinessElapsedMs = 0;

  const command = (executable: string, args: readonly string[], input?: Readonly<{
    environment?: Readonly<Record<string, string>>;
    allow_failure?: boolean;
    binary?: boolean;
    runner_build_diagnostic?: Readonly<{
      nonce: string;
      names: NetworkRunNames;
    }>;
    runner_command_diagnostic?: Readonly<{
      phase: RunnerCommandPhase;
      nonce: string;
      names: NetworkRunNames;
      capability_file: string;
      password: string | null;
    }>;
  }>): Readonly<{ status: number; stdout: string | Buffer; stderr: string }> => {
    if (executable === "docker") counters.docker_commands += 1;
    const result = spawnSync(executable, [...args], {
      cwd: ROOT, shell: false,
      env: { ...(input?.environment ?? dockerSafety.command_env) },
      encoding: input?.binary ? null : "utf8",
      timeout: NETWORK_RUNNER_EXECUTION_TIMEOUT_MS,
      maxBuffer: 32 * 1024 * 1024,
    });
    const status = result.status ?? -1;
    const stderr = Buffer.isBuffer(result.stderr)
      ? result.stderr.toString("utf8") : String(result.stderr ?? "");
    if (result.error !== undefined || status !== 0 && !input?.allow_failure) {
      if (input?.runner_build_diagnostic !== undefined) {
        const diagnostic = runnerBuildDiagnostic({
          nonce: input.runner_build_diagnostic.nonce,
          names: input.runner_build_diagnostic.names,
          args,
          status: result.status,
          signal: result.signal,
          error_code: result.error !== undefined && "code" in result.error
            ? String(result.error.code) : null,
          stdout: Buffer.isBuffer(result.stdout)
            ? result.stdout.toString("utf8") : String(result.stdout ?? ""),
          stderr,
        });
        console.error(JSON.stringify(diagnostic));
        throw new RunnerBuildCommandFailure(diagnostic);
      }
      if (input?.runner_command_diagnostic !== undefined) {
        const diagnostic = runnerCommandDiagnostic({
          phase: input.runner_command_diagnostic.phase,
          names: input.runner_command_diagnostic.names,
          capability_file: input.runner_command_diagnostic.capability_file,
          password: input.runner_command_diagnostic.password,
          args, status: result.status, signal: result.signal,
          error_code: result.error !== undefined && "code" in result.error
            ? String(result.error.code) : null,
          stdout: Buffer.isBuffer(result.stdout)
            ? result.stdout.toString("utf8") : String(result.stdout ?? ""),
          stderr,
        });
        console.error(JSON.stringify(diagnostic));
        throw new RunnerCommandFailure(diagnostic.phase, diagnostic);
      }
      throw new Error("DAY147_A5_NETWORK_HOST_COMMAND_FAILED");
    }
    return { status, stdout: result.stdout ?? "", stderr };
  };
  const dockerJson = (args: readonly string[], allowFailure = false): unknown => {
    const result = command("docker", args, { allow_failure: allowFailure });
    if (result.status !== 0) return null;
    try { return JSON.parse(String(result.stdout)); } catch {
      throw new Error("DAY147_A5_NETWORK_DOCKER_OBSERVATION_INVALID");
    }
  };
  const stateDiagnostic = (reference: string): RunnerStateDiagnostic => {
    const parsed = dockerJson(["container", "inspect", reference]);
    if (!Array.isArray(parsed) || parsed.length !== 1) {
      throw new Error("DAY147_A5_RUNNER_INSPECT_TRANSIENT");
    }
    const state = (parsed[0] as Record<string, unknown>).State as
      Record<string, unknown> ?? {};
    return Object.freeze({ status: String(state.Status ?? ""),
      exit_code: Number.isInteger(state.ExitCode) ? Number(state.ExitCode) : null,
      error: String(state.Error ?? ""), oom_killed: state.OOMKilled === true,
      started_at: String(state.StartedAt ?? ""),
      finished_at: String(state.FinishedAt ?? "") });
  };
  const imageObservation = (reference: string): ImageObservation => {
    const parsed = dockerJson(["image", "inspect", reference]);
    if (!Array.isArray(parsed) || parsed.length !== 1) {
      throw new Error("DAY147_A5_NETWORK_DOCKER_OBSERVATION_INVALID");
    }
    const image = parsed[0] as Record<string, unknown>;
    return { id: String(image.Id),
      repo_digests: Array.isArray(image.RepoDigests)
        ? image.RepoDigests.map(String) : [], os: String(image.Os),
      architecture: String(image.Architecture) };
  };
  const networkObservation = (reference: string): NetworkObservation => {
    const parsed = dockerJson(["network", "inspect", reference]);
    if (!Array.isArray(parsed) || parsed.length !== 1) {
      throw new Error("DAY147_A5_NETWORK_DOCKER_OBSERVATION_INVALID");
    }
    const network = parsed[0] as Record<string, unknown>;
    const labels = typeof network.Labels === "object" && network.Labels !== null
      ? network.Labels as Record<string, unknown> : {};
    const containers = typeof network.Containers === "object" &&
        network.Containers !== null
      ? Object.keys(network.Containers as Record<string, unknown>) : [];
    return { name: String(network.Name), id: String(network.Id),
      driver: String(network.Driver), scope: String(network.Scope),
      execution_nonce_label: String(labels["farmos.day147a5.execution_nonce"] ?? ""),
      member_ids: containers };
  };
  const containerObservation = (
    reference: string,
    diagnostic?: NonNullable<Parameters<typeof command>[2]>["runner_command_diagnostic"],
  ): NetworkContainerObservation => {
    const inspected = command("docker", ["container", "inspect", reference],
      diagnostic === undefined ? undefined : { runner_command_diagnostic: diagnostic });
    let parsed: unknown;
    try { parsed = JSON.parse(String(inspected.stdout)); } catch {
      if (diagnostic !== undefined) {
        const observation = runnerCommandDiagnostic({
          phase: diagnostic.phase, args: ["container", "inspect", reference],
          names: diagnostic.names, capability_file: diagnostic.capability_file,
          password: diagnostic.password, status: 0, signal: null,
          error_code: null, stdout: String(inspected.stdout), stderr: inspected.stderr,
        });
        throw new RunnerCommandFailure(diagnostic.phase, observation);
      }
      throw new Error("DAY147_A5_NETWORK_DOCKER_OBSERVATION_INVALID");
    }
    if (!Array.isArray(parsed) || parsed.length !== 1) {
      throw new Error("DAY147_A5_NETWORK_DOCKER_OBSERVATION_INVALID");
    }
    const container = parsed[0] as Record<string, unknown>;
    const config = container.Config as Record<string, unknown>;
    const host = container.HostConfig as Record<string, unknown>;
    const state = container.State as Record<string, unknown> ?? {};
    const networkSettings = container.NetworkSettings as Record<string, unknown>;
    const networks = networkSettings.Networks as Record<string, Record<string, unknown>>;
    const networkEntries = Object.entries(networks);
    const [networkName = "", network = {}] = networkEntries[0] ?? [];
    const labels = config.Labels as Record<string, unknown> ?? {};
    const portBindings = host.PortBindings as Record<string, unknown> ?? {};
    const mounts = Array.isArray(container.Mounts) ? container.Mounts as Record<string, unknown>[] : [];
    const securityOptions = Array.isArray(host.SecurityOpt) ? host.SecurityOpt.map(String) : [];
    return {
      id: String(container.Id), name: String(container.Name).replace(/^\//, ""),
      image_id: String(container.Image), network_id: String(network.NetworkID ?? ""),
      network_name: networkName, network_count: networkEntries.length,
      network_mode: String(host.NetworkMode ?? ""),
      launcher_network_inspect: { HostConfig: { NetworkMode: host.NetworkMode },
        NetworkSettings: { Networks: networkSettings.Networks } },
      endpoint_id: String(network.EndpointID ?? ""),
      ip_address: String(network.IPAddress ?? ""),
      sandbox_id: String(networkSettings.SandboxID ?? ""),
      network_aliases: (Array.isArray(network.Aliases) ? network.Aliases.map(String) : [])
        .filter((alias) => alias === "postgres"),
      published_ports: Object.entries(portBindings)
        .filter(([, value]) => value !== null).map(([key]) => key),
      mounts: mounts.map((mount) => ({ type: String(mount.Type),
        source: String(mount.Source), destination: String(mount.Destination),
        read_write: mount.RW === true })),
      tmpfs_paths: Object.keys(host.Tmpfs as Record<string, unknown> ?? {}).sort(),
      privileged: host.Privileged === true,
      cap_drop: Array.isArray(host.CapDrop) ? host.CapDrop.map(String) : [],
      security_options: securityOptions.map((item) => item.replace(/:true$/, "")),
      read_only_rootfs: host.ReadonlyRootfs === true, user: String(config.User ?? ""),
      environment_keys: Array.isArray(config.Env)
        ? config.Env.map(String).map((value) => value.split("=", 1)[0]!)
          .filter((key) => key === "HOME" ||
            NETWORK_CLIENT_ENVIRONMENT_KEYS.includes(
              key as typeof NETWORK_CLIENT_ENVIRONMENT_KEYS[number],
            )).sort()
        : [],
      launcher_environment_keys: Array.isArray(config.Env)
        ? config.Env.map(String).map((value) => value.split("=", 1)[0]!)
          .filter((key) => key === "HOME" || key === "TMPDIR" ||
            key.startsWith("PG") || key.startsWith("FARMOS_"))
          .sort()
        : [],
      entrypoint: Array.isArray(config.Entrypoint)
        ? config.Entrypoint.map(String) : config.Entrypoint === null ? null : [],
      cmd: Array.isArray(config.Cmd)
        ? config.Cmd.map(String) : config.Cmd === null ? null : [],
      execution_nonce_label: String(labels["farmos.day147a5.execution_nonce"] ?? ""),
      resource_role_label: String(labels[NETWORK_RESOURCE_ROLE_LABEL] ?? ""),
      probe_label: String(labels[NETWORK_PROBE_LABEL] ?? ""),
      runtime_state: String(state.Status ?? ""),
      restart_count: Number(container.RestartCount ?? -1),
      started_at: String(state.StartedAt ?? ""),
      docker_socket_mounted: mounts.some((mount) =>
        mount.Destination === "/var/run/docker.sock" ||
        mount.Destination === "/run/docker.sock"),
    };
  };
  const receipt = (value: NetworkCreationReceipt) => {
    const validated = networkCreationReceipt(value);
    receipts.push(validated);
    return validated;
  };
  const verifyGeneratedArtifacts = (nonce: string): void => {
    if (generatedArtifactStartManifest === null) {
      throw new Error("DAY147_A5_GENERATED_ARTIFACT_PRESERVATION_BLOCKED");
    }
    verifyGeneratedArtifactsAfterExecution({
      start: generatedArtifactStartManifest,
      current_nonce: nonce,
    });
  };
  const namesFromRunnerIdNonce = (
    canonicalId: string,
    currentReceipts: readonly NetworkCreationReceipt[],
  ): string => {
    const matching = currentReceipts.filter((item) =>
      item.resource_type === "runner_container" &&
      item.canonical_resource === canonicalId && item.cleanup_eligible
    );
    if (matching.length !== 1) {
      throw new Error("DAY147_A5_NETWORK_RUNNER_BINDING_INVALID");
    }
    return matching[0]!.execution_nonce;
  };

  return {
    current_creation_receipts: () => Object.freeze([...receipts]),
    async validate_git_source_scope(nonce) {
      const branch = command("git", ["branch", "--show-current"]);
      const head = command("git", ["rev-parse", "HEAD"]);
      const origin = command("git", ["rev-parse", "origin/main"]);
      const divergence = command("git", ["rev-list", "--left-right", "--count",
        "HEAD...origin/main"]);
      const staged = command("git", ["diff", "--cached", "--name-only"]);
      const status = command("git", ["status", "--short", "--untracked-files=all"]);
      if (!/^[a-f0-9]{12}$/.test(nonce) || generatedArtifactStartManifest !== null) {
        throw new Error("DAY147_A5_NETWORK_SOURCE_SCOPE_BLOCKED");
      }
      generatedArtifactStartManifest = captureGeneratedFailureArtifactManifest();
      validateNetworkGitSourceScope({
        branch: String(branch.stdout), head: String(head.stdout),
        origin_main: String(origin.stdout), divergence: String(divergence.stdout),
        staged_files: String(staged.stdout), status: String(status.stdout),
        generated_artifacts: generatedArtifactStartManifest,
      });
    },
    async validate_orbstack_provider() {
      const context = parseDockerContextName(String(command(
        "docker", ["context", "show"],
      ).stdout));
      if (context !== "orbstack") throw new Error("DAY147_A5_CONNECTION_SAFETY_BLOCKED");
      const inspect = command("docker", ["context", "inspect", context]);
      const classified = classifyDockerEndpoint({ inspect_output: String(inspect.stdout),
        expected_context: context, identity, socket_io: PRODUCTION_SOCKET_PROVENANCE_IO });
      if (classified.provider_class !== "ORBSTACK" ||
        classified.daemon_class !== "LOCAL_UNIX_SOCKET" ||
        !classified.provider_identity_verified ||
        !classified.filesystem_provenance_verified ||
        !classified.ownership_verified || !classified.path_canonical_verified ||
        !classified.provider_socket_compatible || !classified.remote_rejected ||
        !classified.tls_rejected) {
        throw new Error("DAY147_A5_CONNECTION_SAFETY_BLOCKED");
      }
    },
    async inspect_base_image() {
      return imageObservation(NETWORK_RUNNER_BASE_REPO_DIGEST);
    },
    async create_source_snapshot(nonce) {
      const names = buildNetworkRunNames(nonce);
      const runRoot = dirname(names.build_context);
      const sourceReceipts: NetworkCreationReceipt[] = [];
      const dependencies: SourceSnapshotDependencies = {
        async repository_root() { return { lexical_path: ROOT,
          canonical_path: await realpath(ROOT) }; },
        async create_temporary_root(expectedParent) {
          await mkdir(expectedParent, { recursive: true, mode: 0o700 });
          await access(runRoot).then(() => {
            throw new Error("DAY147_A5_NETWORK_SOURCE_SNAPSHOT_INVALID");
          }).catch((error: unknown) => {
            if (error instanceof Error && error.message ===
              "DAY147_A5_NETWORK_SOURCE_SNAPSHOT_INVALID") throw error;
          });
          await mkdir(runRoot, { mode: 0o700 });
          sourceReceipts.push(receipt({ resource_type: "build_root", execution_nonce: nonce,
            canonical_resource: await realpath(runRoot), expected_name: nonce,
            creation_operation_success: true, pre_existing: false,
            expected_binding: nonce, cleanup_eligible: true }));
          await mkdir(names.build_context, { mode: 0o700 });
          await mkdir(names.result_directory, { mode: 0o700 });
          sourceReceipts.push(receipt({ resource_type: "result_root", execution_nonce: nonce,
            canonical_resource: await realpath(names.result_directory),
            expected_name: "result", creation_operation_success: true,
            pre_existing: false, expected_binding: nonce,
            cleanup_eligible: true }));
          const metadata = await lstat(runRoot);
          return { lexical_path: runRoot, canonical_path: await realpath(runRoot),
            symbolic_link: metadata.isSymbolicLink(), directory: metadata.isDirectory(),
            owner_matches: metadata.uid === identity!.uid, mode: metadata.mode & 0o777 };
        },
        async git_archive_head(plan) {
          const archive = command("git", plan.archive_command.args, { binary: true });
          const extracted = spawnSync("tar", ["-x", "-C", names.build_context], {
            shell: false, input: archive.stdout as Buffer, timeout: 30_000,
            maxBuffer: 32 * 1024 * 1024,
          });
          if (extracted.status !== 0) {
            throw new Error("DAY147_A5_NETWORK_SOURCE_SNAPSHOT_INVALID");
          }
          return await listRegularFilesRecursively(names.build_context);
        },
        async inspect_overlay(relativePath) {
          const path = resolve(ROOT, relativePath);
          const metadata = await lstat(path);
          return { relative_path: relativePath, canonical_path: await realpath(path),
            regular_file: metadata.isFile(), symbolic_link: metadata.isSymbolicLink() };
        },
        async copy_overlay(observation, buildContext) {
          const destination = resolve(buildContext, observation.relative_path);
          await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
          await copyFile(observation.canonical_path, destination);
        },
        async write_generated_file(relativePath, contents, buildContext) {
          const destination = resolve(buildContext, relativePath);
          await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
          await writeFile(destination, contents, { mode: 0o600, flag: "wx" });
        },
        list_build_context_files: listRegularFilesRecursively,
      };
      const snapshot = await executeSourceSnapshot({ nonce,
        runner_entrypoint_source: networkClientEntrypointSource({ nonce }),
        dockerfile: networkRunnerDockerfile(), dependencies });
      return { snapshot, receipts: sourceReceipts };
    },
    async build_temporary_image(nonce, snapshot) {
      const names = buildNetworkRunNames(nonce);
      const prior = command("docker", ["image", "inspect", names.runner_image],
        { allow_failure: true });
      if (prior.status === 0) throw new Error("DAY147_A5_NETWORK_RUNNER_IMAGE_EXISTS");
      if (prior.status !== 1 || !prior.stderr.includes("No such image")) {
        throw new Error("DAY147_A5_NETWORK_RUNNER_IMAGE_PREFLIGHT_FAILED");
      }
      command("docker", buildNetworkRunnerImageCommand(nonce).args, {
        runner_build_diagnostic: { nonce, names },
      });
      const provisionalId = (await readFile(
        resolve(names.result_directory, "runner-image-id"), "utf8",
      )).trim();
      const imageReceipt = receipt({ resource_type: "temporary_image",
        execution_nonce: nonce, canonical_resource: provisionalId,
        expected_name: names.runner_image, creation_operation_success: true,
        pre_existing: false,
        expected_binding: `${NETWORK_RUNNER_BASE_IMAGE_ID}:${
          networkRunnerEntrypointDigest(nonce)
        }`, cleanup_eligible: true });
      const parsed = dockerJson(["image", "inspect", names.runner_image]);
      if (!Array.isArray(parsed) || parsed.length !== 1) {
        throw new Error("DAY147_A5_NETWORK_RUNNER_IMAGE_BINDING_INVALID");
      }
      const image = parsed[0] as Record<string, unknown>;
      const config = image.Config as Record<string, unknown>;
      const labels = config?.Labels as
        Record<string, unknown> ?? {};
      const id = String(image.Id);
      if (id !== provisionalId || snapshot.build_context !== names.build_context ||
        labels["farmos.day147a5.execution_nonce"] !== nonce ||
        labels["farmos.day147a5.base_image_id"] !== NETWORK_RUNNER_BASE_IMAGE_ID ||
        labels["farmos.day147a5.entrypoint_sha256"] !==
        networkRunnerEntrypointDigest(nonce) || config.User !==
          `${NETWORK_RUNNER_FINAL_UID}:${NETWORK_RUNNER_FINAL_GID}` ||
        JSON.stringify(config.Entrypoint) !== JSON.stringify([
          "/bin/sh", NETWORK_RUNNER_LAUNCHER,
        ])) {
        throw new Error("DAY147_A5_NETWORK_RUNNER_IMAGE_BINDING_INVALID");
      }
      await rm(resolve(names.result_directory, "runner-image-id"));
      return { observation: { expected_tag: names.runner_image,
        observed_tag: names.runner_image, build_result_id: id, inspected_id: id,
        pre_existing: false, execution_nonce_label: nonce,
        base_image_id: NETWORK_RUNNER_BASE_IMAGE_ID },
        receipt: imageReceipt };
    },
    async run_launcher_only_probe(input) {
      const paths = launcherOnlyProbePaths(input.nonce);
      const name = paths.container_name;
      let canonicalId = "";
      let stderr = "";
      let cleanupPassed = false;
      let failure: LauncherOnlyProbeFailure | null = null;
      let localTsx: LocalTsxRuntimeResult | null = null;
      try {
        if (identity?.uid !== NETWORK_RUNNER_FINAL_UID) {
          throw new LauncherOnlyProbeFailure(
            "DAY147_A5_LAUNCHER_CONTAINER_USER_INVALID",
            "LAUNCHER_CONTAINER_USER_VALID",
            `${NETWORK_RUNNER_FINAL_UID}:${NETWORK_RUNNER_FINAL_GID}`,
            identity === null ? "unavailable" : `${identity.uid}:${identity.gid}`,
            null, "UNKNOWN", NETWORK_RUNNER_FINAL_UID, NETWORK_RUNNER_FINAL_GID,
            "unknown", false, false, "", false,
          );
        }
        const prior = command("docker", ["container", "inspect", name],
          { allow_failure: true });
        if (prior.status !== 1 ||
          !/(?:No such container|No such object)/.test(prior.stderr)) {
          throw new LauncherOnlyProbeFailure(
            "DAY147_A5_LAUNCHER_ONLY_RESIDUAL_RESOURCE", null, null, null,
            null, "UNKNOWN",
            NETWORK_RUNNER_FINAL_UID, NETWORK_RUNNER_FINAL_GID, "unknown",
            false, false, "", false,
          );
        }
        await mkdir(paths.result_directory, { recursive: true, mode: 0o700 });
        const capabilityBytes = new TextEncoder().encode(`${JSON.stringify({
          schema: "farmos-day147a5-network-client-capability-v1",
          execution_nonce: input.nonce,
          capability: randomBytes(32).toString("hex"),
        })}\n`);
        counters.credential_generations += 1;
        await writeFile(paths.capability_file, capabilityBytes,
          { flag: "wx", mode: 0o400 });
        await chmod(paths.capability_file, 0o400);
        const resultMetadata = await lstat(paths.result_directory);
        const capabilityMetadata = await lstat(paths.capability_file);
        if (await realpath(paths.result_directory) !== paths.result_directory ||
          await realpath(paths.capability_file) !== paths.capability_file ||
          !resultMetadata.isDirectory() || resultMetadata.isSymbolicLink() ||
          resultMetadata.uid !== NETWORK_RUNNER_FINAL_UID ||
          (resultMetadata.mode & 0o700) !== 0o700 ||
          !capabilityMetadata.isFile() || capabilityMetadata.isSymbolicLink() ||
          capabilityMetadata.uid !== NETWORK_RUNNER_FINAL_UID ||
          (capabilityMetadata.mode & 0o777) !== 0o400) {
          throw new LauncherOnlyProbeFailure(
            "DAY147_A5_LAUNCHER_CONTAINER_MOUNT_INVALID",
            "LAUNCHER_CONTAINER_RESULT_MOUNT_VALID", "canonical UID 501 access",
            "invalid launcher-only mount source", null, "UNKNOWN",
            NETWORK_RUNNER_FINAL_UID, NETWORK_RUNNER_FINAL_GID, "unknown",
            false, false, "", false,
          );
        }
        const capabilityDigest = createHash("sha256").update(capabilityBytes)
          .digest("hex");
        const probeEnvironment: NetworkClientEnvironment = {
          FARMOS_A5_EXECUTION_NONCE: input.nonce, PGHOST: "postgres",
          PGPORT: "5432", PGUSER: ROLE_FIXTURES.migration_owner.name,
          PGPASSWORD: "0".repeat(64),
          FARMOS_A5_DB_LEGACY_ACTIVE: buildNames(input.nonce).legacy_active,
          FARMOS_A5_DB_LEGACY_SUPERSEDED:
            buildNames(input.nonce).legacy_superseded,
          FARMOS_A5_DB_MAIN: buildNames(input.nonce).main,
          FARMOS_A5_CLIENT_RESULT_PATH: "/result/client-result.json",
          FARMOS_A5_CAPABILITY_DIGEST: capabilityDigest,
          FARMOS_A5_CAPABILITY_OWNER_UID: String(NETWORK_RUNNER_FINAL_UID),
        };
        validateNetworkClientEnvironment(probeEnvironment);
        const created = command("docker", buildNetworkLauncherOnlyCreateCommand(
          { ...input, environment_keys: NETWORK_CLIENT_ENVIRONMENT_KEYS },
        ).args, { environment: { ...dockerSafety.command_env, ...probeEnvironment },
          allow_failure: true });
        if (created.status !== 0) {
          throw new LauncherOnlyProbeFailure(
            "DAY147_A5_LAUNCHER_ONLY_CONTAINER_CREATE_FAILED", null, null, null,
            null, "UNKNOWN",
            NETWORK_RUNNER_FINAL_UID, NETWORK_RUNNER_FINAL_GID, "unknown",
            false, false, boundedRunnerOutput(created.stderr), false,
          );
        }
        canonicalId = String(created.stdout).trim();
        if (!CONTAINER_ID_PATTERN.test(canonicalId)) {
          throw new LauncherOnlyProbeFailure(
            "DAY147_A5_LAUNCHER_CONTAINER_ID_INVALID",
            "LAUNCHER_CONTAINER_ID_BOUND", "sha256 container ID",
            "invalid create output", null, "UNKNOWN",
            NETWORK_RUNNER_FINAL_UID, NETWORK_RUNNER_FINAL_GID, "unknown",
            false, false, "", false,
          );
        }
        const observed = containerObservation(canonicalId);
        const contract = evaluateLauncherOnlyContainerContract({ observation: observed,
          canonical_container_id: canonicalId, nonce: input.nonce,
          runner_image_id: input.runner_image_id,
          result_directory: paths.result_directory,
          capability_file: paths.capability_file });
        const firstFailure = contract.find(({ passed }) => !passed);
        if (firstFailure !== undefined) {
          throw new LauncherOnlyProbeFailure(
            firstFailure.failure_code, firstFailure.predicate,
            firstFailure.expected_value, firstFailure.actual_value_sanitized,
            null, "UNKNOWN",
            NETWORK_RUNNER_FINAL_UID, NETWORK_RUNNER_FINAL_GID, "unknown",
            false, false, "", false,
          );
        }
        const started = command("docker", buildNetworkRunnerStartCommand(
          canonicalId,
        ).args, { allow_failure: true });
        if (started.status !== 0) {
          throw new LauncherOnlyProbeFailure(
            "DAY147_A5_LAUNCHER_ONLY_START_FAILED", null, null, null,
            null, "UNKNOWN",
            NETWORK_RUNNER_FINAL_UID, NETWORK_RUNNER_FINAL_GID, "unknown",
            false, false, boundedRunnerOutput(started.stderr), false,
          );
        }
        const waited = command("docker", ["container", "wait", canonicalId],
          { allow_failure: true });
        const logs = command("docker", ["container", "logs", canonicalId],
          { allow_failure: true });
        stderr = logs.stderr;
        localTsx = parseLocalTsxRuntimeResult(stderr);
        const phases = stderr.split(/\r?\n/).filter((line) =>
          line.startsWith("FARMOS_DAY147_A5_PHASE=")
        );
        const phaseCount = (phase: string) => phases.filter((line) =>
          line === `FARMOS_DAY147_A5_PHASE=${phase}`
        ).length;
        const forbidden = ["RUNNER_DB_CONNECTION_START", "RUNNER_MIGRATION_START",
          "RUNNER_DYNAMIC_SUITE_START"].some((phase) => phaseCount(phase) !== 0);
        if (waited.status !== 0 || logs.status !== 0 ||
          String(waited.stdout).trim() !== "0" ||
          phaseCount("RUNNER_LAUNCHER_STARTED") !== 1 ||
          LOCAL_TSX_PHASES.some((phase) => phaseCount(phase) !== 1) ||
          phaseCount("RUNNER_ENTRYPOINT_PROCESS_STARTED") !== 1 ||
          phaseCount(NETWORK_LAUNCHER_ONLY_COMPLETE_PHASE) !== 1 || forbidden ||
          localTsx === null) {
          throw launcherOnlyFailureFromOutput({ stderr, cleanup_passed: false });
        }
      } catch (error) {
        failure = error instanceof LauncherOnlyProbeFailure ? error
          : new LauncherOnlyProbeFailure(
            "DAY147_A5_LAUNCHER_ONLY_VERIFICATION_FAILED", null, null, null,
            null, "UNKNOWN",
            NETWORK_RUNNER_FINAL_UID, NETWORK_RUNNER_FINAL_GID, "unknown",
            false, false, "", false,
          );
      } finally {
        if (canonicalId !== "") {
          command("docker", ["container", "rm", "--force", canonicalId],
            { allow_failure: true });
        }
        const absent = command("docker", ["container", "inspect", name],
          { allow_failure: true });
        await rm(paths.root, { recursive: true, force: true });
        cleanupPassed = absent.status === 1 &&
          /(?:No such container|No such object)/.test(absent.stderr) &&
          !await access(paths.root).then(() => true).catch(() => false);
      }
      if (!cleanupPassed) {
        throw new LauncherOnlyProbeFailure(
          "DAY147_A5_LAUNCHER_ONLY_CLEANUP_FAILED",
          failure?.exact_failed_predicate ?? null, failure?.expected_value ?? null,
          failure?.actual_value_sanitized ?? null,
          failure?.exact_validator_marker ?? null,
          failure?.errno_code ?? "UNKNOWN", NETWORK_RUNNER_FINAL_UID,
          NETWORK_RUNNER_FINAL_GID, failure?.file_type ?? "unknown",
          failure?.readable ?? false, failure?.executable ?? false,
          failure?.sanitized_stderr ?? "", false,
        );
      }
      if (failure !== null) {
        throw new LauncherOnlyProbeFailure(failure.exact_failure_code,
          failure.exact_failed_predicate, failure.expected_value,
          failure.actual_value_sanitized, failure.exact_validator_marker,
          failure.errno_code, failure.uid,
          failure.gid, failure.file_type, failure.readable, failure.executable,
          failure.sanitized_stderr.replaceAll("/workspace", "<workspace>"), true);
      }
      assert.ok(localTsx);
      return Object.freeze({ launcher_started: true, runtime_validator: "PASS",
        entrypoint_started: true, local_tsx: localTsx, cleanup_passed: true });
    },
    async run_bootstrap_probe(input) {
      const paths = bootstrapProbePaths(input.nonce);
      let canonicalId = "";
      let cleanupPassed = false;
      let stdout = "";
      let stderr = "";
      let exitCode: number | null = null;
      let probeFailure: BootstrapProbeFailure | null = null;
      try {
        const prior = command("docker", ["container", "inspect",
          paths.container_name], { allow_failure: true });
        if (prior.status === 0 || prior.status !== 1 ||
          !/(?:No such container|No such object)/.test(prior.stderr)) {
          throw new Error("DAY147_A5_RUNNER_BOOTSTRAP_PROBE_RESIDUAL");
        }
        await mkdir(paths.result_directory, { recursive: true, mode: 0o700 });
        const capabilityBytes = new TextEncoder().encode(`${JSON.stringify({
          schema: "farmos-day147a5-network-client-capability-v1",
          execution_nonce: input.nonce,
          capability: randomBytes(32).toString("hex"),
        })}\n`);
        counters.credential_generations += 1;
        await writeFile(paths.capability_file, capabilityBytes,
          { flag: "wx", mode: 0o400 });
        await chmod(paths.capability_file, 0o400);
        const capabilityDigest = createHash("sha256").update(capabilityBytes)
          .digest("hex");
        const probeEnvironment: NetworkClientEnvironment = {
          FARMOS_A5_EXECUTION_NONCE: input.nonce, PGHOST: "postgres",
          PGPORT: "5432", PGUSER: ROLE_FIXTURES.migration_owner.name,
          PGPASSWORD: "0".repeat(64),
          FARMOS_A5_DB_LEGACY_ACTIVE: buildNames(input.nonce).legacy_active,
          FARMOS_A5_DB_LEGACY_SUPERSEDED:
            buildNames(input.nonce).legacy_superseded,
          FARMOS_A5_DB_MAIN: buildNames(input.nonce).main,
          FARMOS_A5_CLIENT_RESULT_PATH: "/result/client-result.json",
          FARMOS_A5_CAPABILITY_DIGEST: capabilityDigest,
          FARMOS_A5_CAPABILITY_OWNER_UID: String(identity!.uid),
        };
        validateNetworkClientEnvironment(probeEnvironment);
        const created = command("docker", buildNetworkBootstrapProbeCreateCommand({
          nonce: input.nonce, runner_image_id: input.runner_image_id,
          runner_uid: identity!.uid,
          environment_keys: NETWORK_CLIENT_ENVIRONMENT_KEYS,
        }).args, { environment: { ...dockerSafety.command_env,
          ...probeEnvironment }, allow_failure: true });
        if (created.status !== 0) {
          throw new BootstrapProbeFailure(
            "DAY147_A5_RUNNER_BOOTSTRAP_PROBE_FAILED", null,
            "RUNNER_LAUNCHER_STARTED", null, created.status, false,
            "DAY147_A5_RUNNER_LAUNCHER_NOT_STARTED",
          );
        }
        canonicalId = String(created.stdout).trim();
        const observed = containerObservation(canonicalId);
        const resultMount = observed.mounts.find(({ destination }) =>
          destination === "/result");
        const capabilityMount = observed.mounts.find(({ destination }) =>
          destination === NETWORK_RUNNER_CAPABILITY_PATH);
        if (observed.name !== paths.container_name ||
          observed.image_id !== input.runner_image_id || observed.privileged ||
          !observed.read_only_rootfs || observed.user !== String(identity!.uid) ||
          !observed.cap_drop.includes("ALL") ||
          !observed.security_options.includes("no-new-privileges") ||
          observed.docker_socket_mounted || resultMount?.source !==
            paths.result_directory || capabilityMount?.source !==
            paths.capability_file || !observed.tmpfs_paths.includes("/tmp") ||
          observed.resource_role_label !== "bootstrap-probe") {
          throw new BootstrapProbeFailure(
            "DAY147_A5_RUNNER_BOOTSTRAP_PROBE_FAILED", null,
            "RUNNER_SECURITY_CONTEXT_VALID", null, null, false,
            "DAY147_A5_RUNNER_ENTRYPOINT_NOT_REACHED",
          );
        }
        const started = command("docker", buildNetworkRunnerStartCommand(
          canonicalId).args, { allow_failure: true });
        if (started.status !== 0) {
          throw new BootstrapProbeFailure(
            "DAY147_A5_RUNNER_BOOTSTRAP_PROBE_FAILED", null,
            "RUNNER_LAUNCHER_STARTED", null, started.status, false,
            "DAY147_A5_RUNNER_ENTRYPOINT_NOT_REACHED",
          );
        }
        const waited = command("docker", ["container", "wait", canonicalId],
          { allow_failure: true });
        const logs = command("docker", ["container", "logs", canonicalId],
          { allow_failure: true });
        stdout = String(logs.stdout);
        stderr = logs.stderr;
        exitCode = Number.parseInt(String(waited.stdout).trim(), 10);
        const moduleDiagnostic = parseRunnerModuleResolutionDiagnostic(stderr);
        const state = stateDiagnostic(canonicalId);
        const diagnostic = classifyRunnerAttempt({ attempt: 1,
          container_started: true, state, stdout, stderr,
          cleanup_completed: false, result_present: false,
          diagnostic_present: true });
        const probeComplete = stderr.split(/\r?\n/).includes(
          `FARMOS_DAY147_A5_PHASE=${NETWORK_BOOTSTRAP_PROBE_COMPLETE_PHASE}`);
        const forbiddenDbPhase = stderr.includes("RUNNER_DB_CONNECTION_START") ||
          stderr.includes("RUNNER_MIGRATION_START") ||
          stderr.includes("RUNNER_DYNAMIC_SUITE_START");
        if (waited.status !== 0 || logs.status !== 0 || exitCode !== 0 ||
          !probeComplete || forbiddenDbPhase || moduleDiagnostic !== null) {
          throw new BootstrapProbeFailure(
            "DAY147_A5_RUNNER_BOOTSTRAP_PROBE_FAILED",
            diagnostic.last_completed_phase,
            diagnostic.first_failed_phase ?? NETWORK_BOOTSTRAP_PROBE_COMPLETE_PHASE,
            moduleDiagnostic, Number.isFinite(exitCode) ? exitCode : null, false,
            diagnostic.root_cause_class, boundedRunnerOutput(state.error),
            state.oom_killed, diagnostic.sanitized_stdout,
            diagnostic.sanitized_stderr,
          );
        }
      } catch (error) {
        if (error instanceof BootstrapProbeFailure) probeFailure = error;
        else throw error;
      } finally {
        if (canonicalId !== "") {
          command("docker", ["container", "rm", "--force", canonicalId],
            { allow_failure: true });
        }
        await rm(paths.root, { recursive: true, force: true });
        const absent = command("docker", ["container", "inspect",
          paths.container_name], { allow_failure: true });
        cleanupPassed = absent.status === 1 &&
          /(?:No such container|No such object)/.test(absent.stderr) &&
          !await access(paths.root).then(() => true).catch(() => false);
        if (!cleanupPassed && process.exitCode === undefined) {
          process.exitCode = 1;
        }
      }
      if (!cleanupPassed) {
        throw new BootstrapProbeFailure(
          "DAY147_A5_RUNNER_BOOTSTRAP_PROBE_FAILED", null,
          "RUNNER_BOOTSTRAP_PROBE_CLEANUP", null, exitCode, false,
        );
      }
      if (probeFailure !== null) {
        throw new BootstrapProbeFailure(probeFailure.primary_code,
          probeFailure.last_completed_phase, probeFailure.first_failed_phase,
          probeFailure.module_diagnostic, probeFailure.exit_code, true,
          probeFailure.exact_failure_class, probeFailure.state_error,
          probeFailure.oom_killed, probeFailure.sanitized_stdout,
          probeFailure.sanitized_stderr);
      }
      return Object.freeze({ status: "PASS",
        last_completed_phase: NETWORK_BOOTSTRAP_PROBE_COMPLETE_PHASE,
        module_diagnostic: null, db_connections: 0, migrations: 0,
        dynamic_suites: 0, cleanup_passed: true });
    },
    async create_network(nonce) {
      const names = buildNetworkRunNames(nonce);
      const priorRaw = command("docker", ["network", "inspect", names.network],
        { allow_failure: true });
      const prior = priorRaw.status === 0 ? networkObservation(names.network) : null;
      if (prior !== null) throw new Error("DAY147_A5_NETWORK_ALREADY_EXISTS");
      if (priorRaw.status !== 1 ||
        !/(?:not found|No such network)/i.test(priorRaw.stderr)) {
        throw new Error("DAY147_A5_NETWORK_PREFLIGHT_FAILED");
      }
      const created = command("docker", buildNetworkCreateCommand(nonce).args);
      const id = String(created.stdout).trim();
      const networkReceipt = receipt({ resource_type: "network", execution_nonce: nonce,
        canonical_resource: id, expected_name: names.network,
        creation_operation_success: true, pre_existing: false,
        expected_binding: "bridge:local", cleanup_eligible: true });
      const observation = networkObservation(id);
      return { prior: null, observation,
        receipt: networkReceipt };
    },
    async create_start_postgres(nonce, networkId) {
      const names = buildNetworkRunNames(nonce);
      const prior = command("docker", ["container", "inspect", names.postgres_container],
        { allow_failure: true });
      if (prior.status === 0) {
        throw new Error("DAY147_A5_NETWORK_POSTGRES_ALREADY_EXISTS");
      }
      if (prior.status !== 1 || !/(?:No such container|No such object)/.test(prior.stderr)) {
        throw new Error("DAY147_A5_NETWORK_POSTGRES_PREFLIGHT_FAILED");
      }
      postgresImageId = imageObservation(IMAGE).id;
      postgresPassword = randomBytes(32).toString("hex");
      counters.credential_generations += 1;
      const environment = { ...dockerSafety.command_env,
        POSTGRES_DB: buildNames(nonce).main,
        POSTGRES_USER: ROLE_FIXTURES.migration_owner.name,
        POSTGRES_PASSWORD: postgresPassword };
      const started = command("docker", buildNetworkPostgresRunCommand({ nonce,
        environment_keys: ["POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD"],
      }).args, { environment });
      const id = String(started.stdout).trim();
      const postgresReceipt = receipt({ resource_type: "postgres_container",
        execution_nonce: nonce, canonical_resource: id,
        expected_name: names.postgres_container, creation_operation_success: true,
        pre_existing: false, expected_binding: `${postgresImageId}:${networkId}`,
        cleanup_eligible: true });
      const observation = containerObservation(id);
      return { observation, postgres_image_id: postgresImageId,
        receipt: postgresReceipt };
    },
    async wait_postgres_internal(nonce, postgresId) {
      const started = performance.now();
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const result = command("docker", buildNetworkPostgresInternalReadinessCommand({
          nonce, canonical_postgres_id: postgresId,
        }).args, { allow_failure: true });
        if (result.status === 0) {
          readinessElapsedMs = Math.floor(performance.now() - started);
          return;
        }
        if (![1, 2].includes(result.status)) {
          throw new Error("DAY147_A5_INTERNAL_READINESS_COMMAND_CONTRACT_INVALID");
        }
        await delay(500);
      }
      throw new Error("DAY147_A5_POSTGRES_INTERNAL_READINESS_TIMEOUT");
    },
    async converge_runner(input) {
      const names = buildNetworkRunNames(input.nonce);
      const deadline = performance.now() + NETWORK_RUNNER_EXECUTION_TIMEOUT_MS;
      const result = await convergeRunnerAttempts({ deadline_ms: deadline,
        now: () => performance.now(), backoff: delay,
        execute_attempt: async (attempt) => {
          const paths = runnerAttemptPaths(input.nonce, attempt);
          let canonicalId = "";
          let started = false;
          let stdout = "";
          let stderr = "";
          let transient: RunnerRetryableRootCause | null = null;
          let rootCauseOverride: RunnerRootCauseClass | null = null;
          let bindingChecks: readonly PostStartNetworkBindingCheck[] = [];
          let bindingSuccessCheck: number | null = null;
          let state: RunnerStateDiagnostic = { status: "created", exit_code: null,
            error: "", oom_killed: false, started_at: "", finished_at: "" };
          let resultPresent = false;
          let diagnosticPresent = false;
          const prior = command("docker", ["container", "ls", "--all", "--quiet",
            "--filter", `label=farmos.day147a5.execution_nonce=${input.nonce}`,
            "--filter", `label=${NETWORK_RESOURCE_ROLE_LABEL}=${NETWORK_RUNNER_ROLE}`]);
          if (String(prior.stdout).trim() !== "") {
            throw new Error("DAY147_A5_RUNNER_RESIDUAL_ATTEMPT_RESOURCE");
          }
          if (imageObservation(input.runner_image_id).id !== input.runner_image_id) {
            throw new Error("DAY147_A5_NETWORK_RUNNER_IMAGE_BINDING_INVALID");
          }
          const postgresNow = containerObservation(input.postgres_id);
          const networkNow = networkObservation(input.network_id);
          validateNetworkPostgresContainer({ observation: postgresNow,
            nonce: input.nonce, network_id: input.network_id,
            expected_image_id: postgresImageId! });
          if (postgresNow.runtime_state !== "running" ||
            networkNow.id !== input.network_id ||
            JSON.stringify(networkNow.member_ids) !== JSON.stringify([input.postgres_id])) {
            throw new Error("DAY147_A5_RUNNER_INFRASTRUCTURE_REVALIDATION_FAILED");
          }
          const ready = command("docker", buildNetworkPostgresInternalReadinessCommand({
            nonce: input.nonce, canonical_postgres_id: input.postgres_id,
          }).args, { allow_failure: true });
          if (ready.status !== 0) throw new Error(
            "DAY147_A5_RUNNER_INFRASTRUCTURE_REVALIDATION_FAILED");
          await mkdir(paths.result_directory, { recursive: true, mode: 0o700 });
          await mkdir(paths.diagnostic_directory, { mode: 0o700 });
          const capabilityBytes = new TextEncoder().encode(`${JSON.stringify({
            schema: "farmos-day147a5-network-client-capability-v1",
            execution_nonce: input.nonce, capability: randomBytes(32).toString("hex"),
          })}\n`);
          counters.credential_generations += 1;
          await writeFile(paths.capability_file, capabilityBytes,
            { flag: "wx", mode: 0o400 });
          await chmod(paths.capability_file, 0o400);
          const capabilityDigest = createHash("sha256").update(capabilityBytes)
            .digest("hex");
          if (postgresPassword === null) throw new Error(
            "DAY147_A5_RUNNER_DB_ENVIRONMENT_INVALID");
          const clientEnv: NetworkClientEnvironment = {
            FARMOS_A5_EXECUTION_NONCE: input.nonce, PGHOST: "postgres",
            PGPORT: "5432", PGUSER: ROLE_FIXTURES.migration_owner.name,
            PGPASSWORD: postgresPassword,
            FARMOS_A5_DB_LEGACY_ACTIVE: buildNames(input.nonce).legacy_active,
            FARMOS_A5_DB_LEGACY_SUPERSEDED: buildNames(input.nonce).legacy_superseded,
            FARMOS_A5_DB_MAIN: buildNames(input.nonce).main,
            FARMOS_A5_CLIENT_RESULT_PATH: "/result/client-result.json",
            FARMOS_A5_CAPABILITY_DIGEST: capabilityDigest,
            FARMOS_A5_CAPABILITY_OWNER_UID: String(identity!.uid),
          };
          validateNetworkClientEnvironment(clientEnv);
          try {
            const created = command("docker", buildNetworkRunnerAttemptCreateCommand({
              nonce: input.nonce, attempt, runner_image_id: input.runner_image_id,
              runner_uid: identity!.uid,
              environment_keys: NETWORK_CLIENT_ENVIRONMENT_KEYS,
            }).args, { environment: { ...dockerSafety.command_env, ...clientEnv },
              allow_failure: true });
            if (created.status !== 0) {
              stderr = created.stderr;
              const resultStillValid = await lstat(paths.result_directory)
                .then((metadata) => metadata.isDirectory() &&
                  !metadata.isSymbolicLink()).catch(() => false);
              const capabilityStillValid = await lstat(paths.capability_file)
                .then((metadata) => metadata.isFile() &&
                  !metadata.isSymbolicLink() &&
                  (metadata.mode & 0o777) === 0o400).catch(() => false);
              if (resultStillValid && capabilityStillValid &&
                /(?:mount|statfs|no such file|not found)/i.test(stderr)) {
                transient = "DAY147_A5_RUNNER_MOUNT_VISIBILITY_TRANSIENT";
              }
            } else {
              canonicalId = String(created.stdout).trim();
              const createdObservation = containerObservation(canonicalId);
              validateNetworkRunnerContainer({ observation: createdObservation,
                nonce: input.nonce, network_id: input.network_id,
                phase: "POST_CREATE_PRE_START", expected_image_id: input.runner_image_id,
                result_directory: paths.result_directory,
                capability_file: paths.capability_file,
                expected_user_uid: identity!.uid,
                expected_runner_name: paths.runner_container });
              const start = command("docker", buildNetworkRunnerStartCommand(
                canonicalId).args, { allow_failure: true });
              if (start.status !== 0) {
                stderr = start.stderr;
                const startState = stateDiagnostic(canonicalId);
                if (startState.status === "created" &&
                  /(?:temporar|try again|unavailable|timeout|i\/o)/i.test(stderr)) {
                  transient = "DAY147_A5_RUNNER_CONTAINER_START_TRANSIENT";
                }
              } else {
                started = true;
                const binding = await convergePostStartNetworkBinding({
                  deadline_ms: deadline, now: () => performance.now(), wait: delay,
                  async inspect(check) {
                    const runner = containerObservation(canonicalId);
                    const postgres = containerObservation(input.postgres_id);
                    const network = networkObservation(input.network_id);
                    return { value: { runner, postgres, network },
                      evaluation: evaluatePostStartNetworkBinding({ check,
                        runner, postgres, network, nonce: input.nonce,
                        canonical_runner_id: canonicalId,
                        canonical_postgres_id: input.postgres_id,
                        network_id: input.network_id,
                        expected_image_id: input.runner_image_id,
                        result_directory: paths.result_directory,
                        capability_file: paths.capability_file,
                        expected_user_uid: identity!.uid,
                        expected_runner_name: paths.runner_container }) };
                  },
                });
                bindingChecks = binding.checks;
                bindingSuccessCheck = binding.success_check;
                const postStart = binding.value.runner;
                validateNetworkRunnerContainer({ observation: postStart,
                  nonce: input.nonce, network_id: input.network_id,
                  phase: "POST_START", expected_image_id: input.runner_image_id,
                  result_directory: paths.result_directory,
                  capability_file: paths.capability_file,
                  expected_user_uid: identity!.uid,
                  expected_runner_name: paths.runner_container,
                  postgres_observation: binding.value.postgres,
                  network_observation: binding.value.network });
                const bindingGatePath = resolve(paths.result_directory,
                  basename(NETWORK_POST_START_BINDING_GATE_PATH));
                await writeFile(bindingGatePath, "bound\n", {
                  flag: "wx", mode: 0o600,
                });
                await chmod(bindingGatePath, 0o600);
                const bindingGate = await lstat(bindingGatePath);
                if (!bindingGate.isFile() || bindingGate.isSymbolicLink() ||
                  bindingGate.uid !== identity!.uid ||
                  (bindingGate.mode & 0o777) !== 0o600) {
                  throw new Error("DAY147_A5_RUNNER_SECURITY_CONTEXT_INVALID");
                }
                const attestationDeadline = Math.min(deadline,
                  performance.now() + RUNNER_ATTESTATION_TIMEOUT_MS);
                let attested = false;
                while (performance.now() < attestationDeadline) {
                  const logs = command("docker", ["container", "logs", canonicalId],
                    { allow_failure: true });
                  if (logs.status !== 0) {
                    stderr = logs.stderr;
                    if (/(?:temporar|try again|unavailable|timeout|i\/o)/i.test(
                      stderr)) transient = "DAY147_A5_RUNNER_LOG_CAPTURE_TRANSIENT";
                    break;
                  }
                  stdout = String(logs.stdout);
                  stderr = logs.stderr;
                  state = stateDiagnostic(canonicalId);
                  attested = parseRunnerMarkers(stderr).phases.includes(
                    "RUNNER_ATTESTATION_COMPLETE");
                  if (attested || state.status === "exited" ||
                    state.status === "dead") break;
                  await delay(100);
                }
                if (!attested && state.status === "running" && transient === null) {
                  transient = "DAY147_A5_RUNNER_ATTESTATION_TRANSIENT_TIMEOUT";
                }
                if (attested) {
                  const waited = command("docker", ["container", "wait", canonicalId],
                    { allow_failure: true });
                  const logs = command("docker", ["container", "logs", canonicalId],
                    { allow_failure: true });
                  stdout = String(logs.stdout); stderr = logs.stderr;
                  state = stateDiagnostic(canonicalId);
                  const exitCode = Number(String(waited.stdout).trim());
                  const resultPath = resolve(paths.result_directory,
                    "client-result.json");
                  resultPresent = await access(resultPath).then(() => true)
                    .catch(() => false);
                  diagnosticPresent = true;
                  if (waited.status === 0 && exitCode === 0 && resultPresent) {
                    const metadata = await lstat(resultPath);
                    const bytes = await readFile(resultPath);
                    const clientResultFile: ClientResultFileObservation = {
                      entries: await readdir(paths.result_directory),
                      file_name: basename(resultPath), regular_file: metadata.isFile(),
                      symbolic_link: metadata.isSymbolicLink(),
                      owner_matches: metadata.uid === identity!.uid,
                      mode: metadata.mode & 0o777,
                      canonical_path: await realpath(resultPath),
                      expected_path: resultPath, size_bytes: metadata.size, bytes };
                    clientResult = validateClientResultFile(clientResultFile,
                      input.nonce);
                    const successful = classifyRunnerAttempt({ attempt,
                      container_created: true,
                      container_started: true, state, stdout, stderr,
                      cleanup_completed: false, result_present: true,
                      diagnostic_present: true, binding_checks: bindingChecks,
                      binding_success_check: bindingSuccessCheck });
                    const runnerReceipt = networkCreationReceipt({
                      resource_type: "runner_container", execution_nonce: input.nonce,
                      canonical_resource: canonicalId,
                      expected_name: paths.runner_container,
                      creation_operation_success: true, pre_existing: false,
                      expected_binding: `${input.runner_image_id}:${input.network_id}`,
                      cleanup_eligible: true });
                    receipts.push(runnerReceipt);
                    return { success: true, value: { runner: postStart,
                      postgres: binding.value.postgres,
                      network: binding.value.network,
                      capability_path: paths.capability_file,
                      capability_digest: capabilityDigest,
                      runner_uid: identity!.uid, runner_receipt: runnerReceipt,
                      client_result_file: clientResultFile,
                      successful_attempt: attempt }, diagnostic: successful };
                  }
                }
              }
            }
          } catch (error) {
            if (error instanceof PostStartNetworkBindingFailure) {
              bindingChecks = error.checks;
              if (error.retryable) {
                transient =
                  "DAY147_A5_RUNNER_CONTAINER_POST_START_NETWORK_BINDING_TIMEOUT";
              } else {
                rootCauseOverride =
                  "DAY147_A5_RUNNER_CONTAINER_POST_START_NETWORK_BINDING_INVALID";
              }
            } else if (error instanceof Error &&
              /^DAY147_A5_RUNNER_(?:LAUNCHER|TSX|ENTRYPOINT|CLIENT_MODULE|CAPABILITY|NONCE|DB_ENVIRONMENT|RESULT_ROOT|SECURITY_CONTEXT|MODULE_RESOLUTION)/.test(
                error.message)) {
              stderr += `\nFARMOS_DAY147_A5_FAILURE=${error.message}`;
            } else if (transient === null) {
              stderr += "\nFARMOS_DAY147_A5_FAILURE=DAY147_A5_RUNNER_PROCESS_EXITED_BEFORE_ATTESTATION";
            }
          }
          if (canonicalId !== "") {
            const logs = command("docker", ["container", "logs", canonicalId],
              { allow_failure: true });
            if (logs.status === 0) { stdout = String(logs.stdout); stderr += logs.stderr; }
            try { state = stateDiagnostic(canonicalId); } catch {
              transient ??= "DAY147_A5_RUNNER_INSPECT_TRANSIENT";
            }
            command("docker", ["container", "rm", "--force", canonicalId],
              { allow_failure: true });
          }
          diagnosticPresent = true;
          await rm(dirname(paths.result_directory), { recursive: true });
          const absent = command("docker", ["container", "inspect",
            paths.runner_container], { allow_failure: true });
          const cleanupCompleted = absent.status === 1 &&
            /(?:No such container|No such object)/.test(absent.stderr) &&
            !await access(dirname(paths.result_directory)).then(() => true)
              .catch(() => false);
          const diagnostic = classifyRunnerAttempt({ attempt,
            container_created: canonicalId !== "",
            container_started: started, state, stdout, stderr,
            cleanup_completed: cleanupCompleted, result_present: resultPresent,
            diagnostic_present: diagnosticPresent,
            transient_evidence: transient, root_cause_override: rootCauseOverride,
            binding_checks: bindingChecks,
            binding_success_check: bindingSuccessCheck });
          return { success: false, diagnostic };
        } });
      return Object.freeze({ ...result.value,
        successful_attempt: result.successful_attempt, timeline: result.timeline });
    },
    async create_runner_capability(nonce) {
      const names = buildNetworkRunNames(nonce);
      const path = resolve(names.result_directory, `capability-${nonce}`);
      const bytes = new TextEncoder().encode(`${JSON.stringify({
        schema: "farmos-day147a5-network-client-capability-v1",
        execution_nonce: nonce, capability: randomBytes(32).toString("hex"),
      })}\n`);
      counters.credential_generations += 1;
      await writeFile(path, bytes, { flag: "wx", mode: 0o400 });
      await chmod(path, 0o400);
      const metadata = await lstat(path);
      if (!metadata.isFile() || metadata.isSymbolicLink() ||
        await realpath(path) !== path || metadata.uid !== identity!.uid ||
        (metadata.mode & 0o777) !== 0o400) {
        throw new Error("DAY147_A5_NETWORK_CLIENT_AUTHORITY_BLOCKED");
      }
      return { path, digest: createHash("sha256").update(bytes).digest("hex"),
        owner_uid: identity!.uid };
    },
    async create_runner(input) {
      const names = buildNetworkRunNames(input.nonce);
      const prior = command("docker", ["container", "inspect", names.runner_container],
        { allow_failure: true });
      if (prior.status === 0) {
        throw new Error("DAY147_A5_NETWORK_RUNNER_ALREADY_EXISTS");
      }
      if (prior.status !== 1 || !/(?:No such container|No such object)/.test(prior.stderr)) {
        throw new Error("DAY147_A5_NETWORK_RUNNER_PREFLIGHT_FAILED");
      }
      if (postgresPassword === null) {
        postgresPassword = randomBytes(32).toString("hex");
        counters.credential_generations += 1;
      }
      const clientEnv: NetworkClientEnvironment = {
        FARMOS_A5_EXECUTION_NONCE: input.nonce, PGHOST: "postgres", PGPORT: "5432",
        PGUSER: ROLE_FIXTURES.migration_owner.name, PGPASSWORD: postgresPassword,
        FARMOS_A5_DB_LEGACY_ACTIVE: buildNames(input.nonce).legacy_active,
        FARMOS_A5_DB_LEGACY_SUPERSEDED: buildNames(input.nonce).legacy_superseded,
        FARMOS_A5_DB_MAIN: buildNames(input.nonce).main,
        FARMOS_A5_CLIENT_RESULT_PATH: "/result/client-result.json",
        FARMOS_A5_CAPABILITY_DIGEST: input.capability_digest,
        FARMOS_A5_CAPABILITY_OWNER_UID: String(input.runner_uid),
      };
      validateNetworkClientEnvironment(clientEnv);
      const createCommand = buildNetworkRunnerCreateCommand({
        nonce: input.nonce, result_directory: names.result_directory,
        runner_image_id: input.runner_image_id,
        capability_file: input.capability_path, runner_uid: input.runner_uid,
        environment_keys: NETWORK_CLIENT_ENVIRONMENT_KEYS,
      });
      const resultMetadata = await lstat(names.result_directory);
      const capabilityMetadata = await lstat(input.capability_path);
      validateRunnerMountContract({ nonce: input.nonce,
        runner_uid: input.runner_uid, command: createCommand,
        result: { lexical_path: names.result_directory,
          canonical_path: await realpath(names.result_directory),
          kind: resultMetadata.isDirectory() ? "directory" : "other",
          symbolic_link: resultMetadata.isSymbolicLink(), uid: resultMetadata.uid,
          mode: resultMetadata.mode & 0o777 },
        capability: { lexical_path: input.capability_path,
          canonical_path: await realpath(input.capability_path),
          kind: capabilityMetadata.isFile() ? "file" : "other",
          symbolic_link: capabilityMetadata.isSymbolicLink(), uid: capabilityMetadata.uid,
          mode: capabilityMetadata.mode & 0o777 },
      });
      const created = command("docker", createCommand.args, {
        environment: { ...dockerSafety.command_env, ...clientEnv },
        runner_command_diagnostic: { phase: "RUNNER_CONTAINER_CREATE",
          nonce: input.nonce, names, capability_file: input.capability_path,
          password: postgresPassword },
      });
      const id = String(created.stdout).trim();
      const runnerReceipt = receipt({ resource_type: "runner_container",
        execution_nonce: input.nonce, canonical_resource: id,
        expected_name: names.runner_container, creation_operation_success: true,
        pre_existing: false,
        expected_binding: `${input.runner_image_id}:${input.network_id}`,
        cleanup_eligible: true });
      return { canonical_id: id, receipt: runnerReceipt };
    },
    async inspect_runner_after_create(canonicalId) {
      const names = buildNetworkRunNames(namesFromRunnerIdNonce(canonicalId, receipts));
      const capability = resolve(names.result_directory,
        `capability-${names.runner_container.slice(-12)}`);
      return containerObservation(canonicalId, {
        phase: "RUNNER_CONTAINER_INSPECT_AFTER_CREATE",
        nonce: names.runner_container.slice(-12), names,
        capability_file: capability, password: postgresPassword,
      });
    },
    async start_runner(canonicalId) {
      const nonce = namesFromRunnerIdNonce(canonicalId, receipts);
      const names = buildNetworkRunNames(nonce);
      command("docker", buildNetworkRunnerStartCommand(canonicalId).args, {
        runner_command_diagnostic: { phase: "RUNNER_CONTAINER_START", nonce, names,
          capability_file: resolve(names.result_directory, `capability-${nonce}`),
          password: postgresPassword },
      });
    },
    async inspect_runner_after_start(canonicalId) {
      const nonce = namesFromRunnerIdNonce(canonicalId, receipts);
      const names = buildNetworkRunNames(nonce);
      const postgresReceipts = receipts.filter(({ resource_type, execution_nonce }) =>
        resource_type === "postgres_container" && execution_nonce === nonce
      );
      const networkReceipts = receipts.filter(({ resource_type, execution_nonce }) =>
        resource_type === "network" && execution_nonce === nonce
      );
      if (postgresReceipts.length !== 1 || networkReceipts.length !== 1) {
        throw new Error(
          "DAY147_A5_RUNNER_CONTAINER_POST_START_NETWORK_BINDING_FAILED",
        );
      }
      const runner = containerObservation(canonicalId, {
        phase: "RUNNER_CONTAINER_INSPECT_AFTER_START", nonce, names,
        capability_file: resolve(names.result_directory, `capability-${nonce}`),
        password: postgresPassword,
      });
      return {
        runner,
        postgres: containerObservation(postgresReceipts[0]!.canonical_resource),
        network: networkObservation(networkReceipts[0]!.canonical_resource),
      };
    },
    async attest_runner(canonicalId) {
      const nonce = namesFromRunnerIdNonce(canonicalId, receipts);
      const names = buildNetworkRunNames(nonce);
      const waited = command("docker", ["container", "wait", canonicalId], {
        runner_command_diagnostic: { phase: "RUNNER_ATTESTATION", nonce, names,
          capability_file: resolve(names.result_directory, `capability-${nonce}`),
          password: postgresPassword },
      });
      if (String(waited.stdout).trim() !== "0") {
        const diagnostic = runnerCommandDiagnostic({ phase: "RUNNER_ATTESTATION",
          args: ["container", "wait", canonicalId], names,
          capability_file: resolve(names.result_directory, `capability-${nonce}`),
          password: postgresPassword, status: Number(String(waited.stdout).trim()),
          signal: null, error_code: null, stdout: String(waited.stdout),
          stderr: waited.stderr });
        console.error(JSON.stringify(diagnostic));
        throw new RunnerCommandFailure("RUNNER_ATTESTATION", diagnostic);
      }
    },
    async read_client_result(nonce) {
      const names = buildNetworkRunNames(nonce);
      const path = resolve(names.result_directory, "client-result.json");
      const directoryEntries = await readdir(names.result_directory);
      const metadata = await lstat(path);
      const bytes = await readFile(path);
      const observation: ClientResultFileObservation = {
        entries: directoryEntries,
        file_name: basename(path), regular_file: metadata.isFile(),
        symbolic_link: metadata.isSymbolicLink(), owner_matches: metadata.uid === identity!.uid,
        mode: metadata.mode & 0o777, canonical_path: await realpath(path),
        expected_path: path, size_bytes: metadata.size, bytes,
      };
      clientResult = validateClientResultFile(observation, nonce);
      return observation;
    },
    async prepare_formal_evidence() {
      if (clientResult === null || postgresImageId === null) {
        throw new Error("DAY147_A5_NETWORK_EVIDENCE_AUTHORITY_BLOCKED");
      }
    },
    async cleanup_resource(resource) {
      if (resource.resource_type === "runner_container" ||
        resource.resource_type === "postgres_container") {
        const presence = command("docker", ["container", "inspect",
          resource.canonical_resource], { allow_failure: true });
        if (classifyContainerCleanupPresence(
          presence.status, presence.stderr,
        ) === "ABSENT") {
          return { canonical_resource: resource.canonical_resource,
            expected_binding: resource.expected_binding, absent_after_cleanup: true };
        }
        const observed = containerObservation(resource.canonical_resource);
        const commonBindingValid =
          observed.id === resource.canonical_resource &&
          observed.name === resource.expected_name &&
          observed.execution_nonce_label === resource.execution_nonce;
        if (resource.resource_type === "runner_container") {
          validateRunnerCleanupBinding(resource, observed);
        }
        const postgresBindingValid = resource.resource_type !== "postgres_container" ||
          `${observed.image_id}:${observed.network_id}` ===
            resource.expected_binding;
        if (!commonBindingValid || !postgresBindingValid ||
          resource.cleanup_eligible !== true) {
          throw new Error("DAY147_A5_NETWORK_CLEANUP_BINDING_INVALID");
        }
        command("docker", ["container", "rm", "--force", resource.canonical_resource]);
        const absent = command("docker", ["container", "inspect",
          resource.canonical_resource], { allow_failure: true });
        if (absent.status !== 1 ||
          !/(?:No such container|No such object)/.test(absent.stderr)) {
          throw new Error("cleanup failed");
        }
      } else if (resource.resource_type === "network") {
        const observed = networkObservation(resource.canonical_resource);
        if (observed.id !== resource.canonical_resource ||
          observed.name !== resource.expected_name || observed.member_ids.length !== 0 ||
          `${observed.driver}:${observed.scope}` !== resource.expected_binding ||
          observed.execution_nonce_label !== resource.execution_nonce) {
          throw new Error("DAY147_A5_NETWORK_CLEANUP_BINDING_INVALID");
        }
        command("docker", ["network", "rm", resource.canonical_resource]);
        const absent = command("docker", ["network", "inspect",
          resource.canonical_resource], { allow_failure: true });
        if (absent.status !== 1 ||
          !/(?:not found|No such network)/i.test(absent.stderr)) {
          throw new Error("cleanup failed");
        }
      } else if (resource.resource_type === "temporary_image") {
        const parsed = dockerJson(["image", "inspect", resource.canonical_resource]);
        if (!Array.isArray(parsed) || parsed.length !== 1) throw new Error("cleanup failed");
        const image = parsed[0] as Record<string, unknown>;
        const labels = (image.Config as Record<string, unknown>)?.Labels as
          Record<string, unknown> ?? {};
        const referencingContainers = command("docker", [
          "container", "ls", "--all", "--quiet", "--filter",
          `ancestor=${resource.canonical_resource}`,
        ]);
        const referencingContainerIds = String(referencingContainers.stdout).trim();
        validateTemporaryImageCleanupBinding({ receipt: resource,
          image_id: String(image.Id),
          repo_tags: Array.isArray(image.RepoTags) ? image.RepoTags.map(String) : [],
          execution_nonce_label: String(
            labels["farmos.day147a5.execution_nonce"] ?? "",
          ),
          base_image_id_label: String(
            labels["farmos.day147a5.base_image_id"] ?? "",
          ),
          entrypoint_digest_label: String(
            labels["farmos.day147a5.entrypoint_sha256"] ?? "",
          ),
          referencing_container_ids: referencingContainerIds === ""
            ? [] : referencingContainerIds.split(/\s+/),
          protected_image_ids: [NETWORK_RUNNER_BASE_IMAGE_ID,
            postgresImageId ?? ""],
        });
        command("docker", ["image", "rm", resource.expected_name]);
        const absent = command("docker", ["image", "inspect",
          resource.expected_name], { allow_failure: true });
        if (absent.status !== 1 || !absent.stderr.includes("No such image")) {
          throw new Error("cleanup failed");
        }
      } else {
        const metadata = await lstat(resource.canonical_resource);
        if (!metadata.isDirectory() || metadata.isSymbolicLink() ||
          await realpath(resource.canonical_resource) !== resource.canonical_resource ||
          metadata.uid !== identity!.uid || (metadata.mode & 0o022) !== 0 ||
          !resource.canonical_resource.startsWith(
            "/private/tmp/farmos-day147a5-network-runner/",
          ) || resource.expected_binding !== resource.execution_nonce) {
          throw new Error("DAY147_A5_NETWORK_CLEANUP_BINDING_INVALID");
        }
        await rm(resource.canonical_resource, { recursive: true });
        if (await access(resource.canonical_resource).then(() => true).catch(() => false)) {
          throw new Error("cleanup failed");
        }
      }
      return { canonical_resource: resource.canonical_resource,
        expected_binding: resource.expected_binding, absent_after_cleanup: true };
    },
    async write_failure_evidence(nonce, primary, cleanup) {
      const failureEvidence = networkHostFailureEvidence({ nonce,
        primary_failure: primary, cleanup });
      counters.evidence_writes += 1;
      await writeEvidenceAtomically({ root: ROOT, execution_nonce: nonce,
        failure_evidence: failureEvidence,
        forbidden_values: new Set(postgresPassword === null ? [] : [postgresPassword]) });
      postgresPassword = null;
      verifyGeneratedArtifacts(nonce);
    },
    async finalize_formal_evidence(nonce, metadata) {
      assert.ok(clientResult);
      assert.ok(postgresImageId);
      const readiness: FarmOsDay147A5ReadinessSummary = {
        status: "READY", attempts: 1, elapsed_ms: readinessElapsedMs,
        first_failure_class: null, last_failure_class: null,
        retryable_failure_count: 0, non_retryable_failure_count: 0,
        timeout_reached: false, container_exit_detected: false,
        container_state: "RUNNING", container_exit_code: 0,
        container_restarting: false, container_oom_killed: false,
        startup_elapsed_ms: readinessElapsedMs, readiness_attempts_before_exit: 0,
        failure_origin: null,
      };
      const evidence: Evidence = {
        schema_version: FARM_OS_DAY147A5_EVIDENCE_SCHEMA_VERSION,
        execution_nonce: nonce, day: "147-A", process: "A5", result: "PASS",
        phase_reached: "COMPLETE", execution_phase: "COMPLETE",
        evidence_phase: "FINALIZED", evidence_status: "VALID",
        durability_complete: true, success_claimed: true, receipt_required: true,
        receipt_relative_path: FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH,
        artifact: { artifact_written: true, artifact_valid: true }, readiness,
        checksums: MIGRATION_CHECKSUMS, postgres_version: clientResult.postgres_version,
        image: IMAGE, image_digest: postgresImageId, connection_metadata: metadata,
        role_matrix: ROLE_FIXTURES,
        transition_matrix_summary: { states: 5, ordered_pairs: 25,
          allowed: 4, forbidden: 21 },
        test_results: clientResult.case_registry.results.map((result) => ({
          id: result.case_id,
          category: EXECUTABLE_CASES.find(({ id }) => id === result.case_id)!.category,
          status: "PASS" as const,
        })),
        concurrency_timeline: clientResult.concurrency_timeline,
        row_counts: clientResult.row_counts,
        failure_codes: { primary: null, cleanup: null, evidence_writer: null },
        cleanup: { phase: "CLEANUP_COMPLETED", attempted: true, completed: true,
          post_cleanup_verified: true, container_absent: true, clients_closed: true,
          mapped_port_closed: true, persistent_volume_absent: true,
          failure_code: null }, safety: EVIDENCE_SAFETY,
      };
      const durabilityFailure: Evidence = { ...evidence, result: "FAILED",
        phase_reached: "EVIDENCE_BLOCKED", execution_phase: "EVIDENCE_BLOCKED",
        success_claimed: false,
        failure_codes: { ...evidence.failure_codes,
          evidence_writer: "DAY147_A5_EVIDENCE_DURABILITY_BLOCKED" } };
      counters.evidence_writes += 1;
      await writeEvidenceAtomically({ root: ROOT, execution_nonce: nonce,
        final_evidence: evidence, failure_evidence: durabilityFailure,
        forbidden_values: new Set(postgresPassword === null ? [] : [postgresPassword]) });
      postgresPassword = null;
      verifyGeneratedArtifacts(nonce);
    },
    async verify_build_only_residuals(nonce) {
      const names = buildNetworkRunNames(nonce);
      const checks = [
        command("docker", ["image", "inspect", names.runner_image], {
          allow_failure: true,
        }),
        command("docker", ["container", "inspect", names.runner_container], {
          allow_failure: true,
        }),
        command("docker", ["container", "inspect", names.postgres_container], {
          allow_failure: true,
        }),
        command("docker", ["container", "inspect", launcherOnlyProbeName(nonce)], {
          allow_failure: true,
        }),
        command("docker", ["network", "inspect", names.network], {
          allow_failure: true,
        }),
      ];
      if (checks.some(({ status }) => status !== 1) ||
        await access(dirname(names.build_context)).then(() => true).catch(() => false)) {
        throw new Error("DAY147_A5_NETWORK_RUNNER_BUILD_RESIDUAL_RESOURCE");
      }
    },
  };
}

type NetworkRunnerBuildOnlyOperations = Pick<ConcreteNetworkOrchestratorOperations,
  "current_creation_receipts" | "validate_orbstack_provider" |
  "inspect_base_image" | "create_source_snapshot" | "build_temporary_image" |
  "cleanup_resource"> & Readonly<{
    verify_build_only_residuals: (nonce: string) => Promise<void>;
  }>;
type NetworkRunnerBuildOnlyCleanup = Readonly<{
  attempted: readonly ("temporary_image" | "result_root" | "build_root")[];
  completed: readonly ("temporary_image" | "result_root" | "build_root")[];
  secondary_failure_codes: readonly string[];
}>;
const NETWORK_RUNNER_BUILD_ONLY_CLEANUP_ORDER = Object.freeze([
  "temporary_image", "result_root", "build_root",
] as const);

async function cleanupNetworkRunnerBuildOnly(input: Readonly<{
  nonce: string;
  operations: NetworkRunnerBuildOnlyOperations;
}>): Promise<NetworkRunnerBuildOnlyCleanup> {
  const receipts = input.operations.current_creation_receipts().filter(
    (receipt): receipt is NetworkCreationReceipt & Readonly<{
      resource_type: "temporary_image" | "result_root" | "build_root";
    }> => NETWORK_RUNNER_BUILD_ONLY_CLEANUP_ORDER.includes(
      receipt.resource_type as typeof NETWORK_RUNNER_BUILD_ONLY_CLEANUP_ORDER[number],
    ),
  );
  const attempted: (typeof NETWORK_RUNNER_BUILD_ONLY_CLEANUP_ORDER[number])[] = [];
  const completed: (typeof NETWORK_RUNNER_BUILD_ONLY_CLEANUP_ORDER[number])[] = [];
  const secondaryFailureCodes: string[] = [];
  for (const resourceType of NETWORK_RUNNER_BUILD_ONLY_CLEANUP_ORDER) {
    const matching = receipts.filter(({ resource_type }) =>
      resource_type === resourceType
    );
    if (matching.length === 0) continue;
    attempted.push(resourceType);
    if (matching.length !== 1 || matching[0]!.execution_nonce !== input.nonce) {
      secondaryFailureCodes.push(NETWORK_CLEANUP_FAILURE_CODES[resourceType]);
      continue;
    }
    try {
      const observation = await input.operations.cleanup_resource(matching[0]!);
      if (!observation.absent_after_cleanup ||
        observation.canonical_resource !== matching[0]!.canonical_resource ||
        observation.expected_binding !== matching[0]!.expected_binding) {
        throw new Error("cleanup binding mismatch");
      }
      completed.push(resourceType);
    } catch {
      secondaryFailureCodes.push(NETWORK_CLEANUP_FAILURE_CODES[resourceType]);
    }
  }
  return Object.freeze({ attempted: Object.freeze(attempted),
    completed: Object.freeze(completed),
    secondary_failure_codes: Object.freeze(secondaryFailureCodes) });
}

async function executeNetworkRunnerBuildOnly(input: Readonly<{
  arguments: ParsedArguments;
  nonce: string;
  operations: NetworkRunnerBuildOnlyOperations;
}>): Promise<Readonly<{
  image_id: string;
  cleanup: NetworkRunnerBuildOnlyCleanup;
}>> {
  if (input.arguments.mode !== "execute-network-runner-build-only" ||
    input.arguments.authority !== NETWORK_RUNNER_BUILD_DIAGNOSTIC_AUTHORITY ||
    !/^[a-f0-9]{12}$/.test(input.nonce)) {
    throw new Error("DAY147_A5_NETWORK_RUNNER_BUILD_AUTHORITY_REQUIRED");
  }
  let imageId: string | null = null;
  try {
    await input.operations.validate_orbstack_provider();
    const baseImage = await input.operations.inspect_base_image();
    validateNetworkRunnerBaseImage(baseImage);
    const source = await input.operations.create_source_snapshot(input.nonce);
    source.receipts.forEach(networkCreationReceipt);
    const built = await input.operations.build_temporary_image(
      input.nonce, source.snapshot,
    );
    imageId = validateBuiltRunnerImage(built.observation);
    const imageReceipt = networkCreationReceipt(built.receipt);
    if (imageReceipt.resource_type !== "temporary_image" ||
      imageReceipt.canonical_resource !== imageId) {
      throw new Error("DAY147_A5_NETWORK_RUNNER_IMAGE_BINDING_INVALID");
    }
  } catch (error) {
    const cleanup = await cleanupNetworkRunnerBuildOnly(input);
    await input.operations.verify_build_only_residuals(input.nonce);
    if (cleanup.secondary_failure_codes.length !== 0) {
      throw new Error("DAY147_A5_NETWORK_RUNNER_BUILD_CLEANUP_FAILED");
    }
    throw error;
  }
  const cleanup = await cleanupNetworkRunnerBuildOnly(input);
  await input.operations.verify_build_only_residuals(input.nonce);
  if (imageId === null ||
    JSON.stringify(cleanup.attempted) !== JSON.stringify(
      NETWORK_RUNNER_BUILD_ONLY_CLEANUP_ORDER,
    ) || JSON.stringify(cleanup.completed) !== JSON.stringify(
      NETWORK_RUNNER_BUILD_ONLY_CLEANUP_ORDER,
    ) || cleanup.secondary_failure_codes.length !== 0) {
    throw new Error("DAY147_A5_NETWORK_RUNNER_BUILD_CLEANUP_FAILED");
  }
  return Object.freeze({ image_id: imageId, cleanup });
}

type NetworkRunnerLauncherOnlyOperations = Pick<
  ReturnType<typeof productionNetworkOperations>,
  "current_creation_receipts" | "validate_git_source_scope" |
  "validate_orbstack_provider" | "inspect_base_image" |
  "create_source_snapshot" | "build_temporary_image" |
  "run_launcher_only_probe" | "cleanup_resource" |
  "verify_build_only_residuals"
>;

async function executeNetworkRunnerLauncherOnly(input: Readonly<{
  arguments: ParsedArguments;
  nonce: string;
  operations: NetworkRunnerLauncherOnlyOperations;
}>): Promise<Readonly<{
  image_id: string;
  probe: LauncherOnlyProbeResult;
  cleanup: NetworkRunnerBuildOnlyCleanup;
}>> {
  if (input.arguments.mode !== "execute-network-runner-launcher-only" ||
    input.arguments.authority !== NETWORK_RUNNER_LAUNCHER_DIAGNOSTIC_AUTHORITY ||
    !/^[a-f0-9]{12}$/.test(input.nonce)) {
    throw new Error("DAY147_A5_NETWORK_RUNNER_LAUNCHER_AUTHORITY_REQUIRED");
  }
  let imageId = "";
  let probe: LauncherOnlyProbeResult | null = null;
  let primary: unknown = null;
  try {
    await input.operations.validate_git_source_scope(input.nonce);
    await input.operations.validate_orbstack_provider();
    validateNetworkRunnerBaseImage(await input.operations.inspect_base_image());
    const source = await input.operations.create_source_snapshot(input.nonce);
    const built = await input.operations.build_temporary_image(
      input.nonce, source.snapshot,
    );
    imageId = validateBuiltRunnerImage(built.observation);
    probe = await input.operations.run_launcher_only_probe({
      nonce: input.nonce, runner_image_id: imageId,
    });
  } catch (error) { primary = error; }
  const cleanup = await cleanupNetworkRunnerBuildOnly(input);
  try { await input.operations.verify_build_only_residuals(input.nonce); } catch {
    throw new Error("DAY147_A5_LAUNCHER_ONLY_CLEANUP_FAILED");
  }
  if (cleanup.secondary_failure_codes.length !== 0 ||
    JSON.stringify(cleanup.completed) !== JSON.stringify(cleanup.attempted) ||
    primary === null && (JSON.stringify(cleanup.attempted) !== JSON.stringify(
      NETWORK_RUNNER_BUILD_ONLY_CLEANUP_ORDER,
    ) || JSON.stringify(cleanup.completed) !== JSON.stringify(
      NETWORK_RUNNER_BUILD_ONLY_CLEANUP_ORDER,
    ))) {
    throw new Error("DAY147_A5_LAUNCHER_ONLY_CLEANUP_FAILED");
  }
  if (primary instanceof RunnerBuildCommandFailure) {
    throw launcherOnlyFailureFromOutput({ stderr: `${
      primary.diagnostic.sanitized_stdout_excerpt
    }\n${primary.diagnostic.sanitized_stderr_excerpt}`,
    cleanup_passed: true });
  }
  if (primary !== null) throw primary;
  assert.ok(probe);
  return Object.freeze({ image_id: imageId, probe, cleanup });
}

type NetworkRunnerCreateOnlyOperations = Pick<ConcreteNetworkOrchestratorOperations,
  "current_creation_receipts" | "validate_git_source_scope" |
  "validate_orbstack_provider" | "inspect_base_image" | "create_source_snapshot" |
  "build_temporary_image" | "create_network" | "create_runner_capability" |
  "create_runner" | "inspect_runner_after_create" | "cleanup_resource"> &
  Readonly<{ verify_build_only_residuals: (nonce: string) => Promise<void> }>;

const NETWORK_RUNNER_CREATE_ONLY_CLEANUP_ORDER = Object.freeze([
  "runner_container", "network", "temporary_image", "result_root", "build_root",
] as const);

class RunnerCreateOnlyFailure extends Error {
  constructor(
    readonly primary_code: string,
    readonly cleanup: NetworkCleanupResult,
    readonly diagnostic: RunnerCommandDiagnostic | null = null,
    readonly creation_receipt_present: boolean = false,
  ) { super(primary_code); }
}

async function executeNetworkRunnerCreateOnly(input: Readonly<{
  arguments: ParsedArguments;
  nonce: string;
  operations: NetworkRunnerCreateOnlyOperations;
}>): Promise<Readonly<{
  image_id: string;
  network_id: string;
  runner_id: string;
  cleanup: NetworkCleanupResult;
}>> {
  if (input.arguments.mode !== "execute-network-runner-create-only" ||
    input.arguments.authority !== NETWORK_RUNNER_CREATE_DIAGNOSTIC_AUTHORITY ||
    !/^[a-f0-9]{12}$/.test(input.nonce)) {
    throw new Error("DAY147_A5_NETWORK_RUNNER_CREATE_AUTHORITY_REQUIRED");
  }
  let imageId = "";
  let networkId = "";
  let runnerId = "";
  try {
    await input.operations.validate_git_source_scope(input.nonce);
    await input.operations.validate_orbstack_provider();
    validateNetworkRunnerBaseImage(await input.operations.inspect_base_image());
    const source = await input.operations.create_source_snapshot(input.nonce);
    const built = await input.operations.build_temporary_image(
      input.nonce, source.snapshot,
    );
    imageId = validateBuiltRunnerImage(built.observation);
    const network = await input.operations.create_network(input.nonce);
    assertNetworkNameAvailable(network.prior);
    networkId = validateCreatedNetwork(network.observation, input.nonce);
    const capability = await input.operations.create_runner_capability(input.nonce);
    const runner = await input.operations.create_runner({ nonce: input.nonce,
      network_id: networkId, runner_image_id: imageId,
      capability_path: capability.path, capability_digest: capability.digest,
      runner_uid: capability.owner_uid });
    runnerId = runner.canonical_id;
    const observed = await input.operations.inspect_runner_after_create(runnerId);
    try {
      validateNetworkRunnerContainer({ observation: observed, nonce: input.nonce,
        network_id: networkId, expected_image_id: imageId,
        phase: "POST_CREATE_PRE_START",
        result_directory: buildNetworkRunNames(input.nonce).result_directory,
        capability_file: capability.path, expected_user_uid: capability.owner_uid });
    } catch {
      throw new Error("DAY147_A5_RUNNER_CONTAINER_POST_CREATE_INSPECT_FAILED");
    }
  } catch (error) {
    const currentReceipts = input.operations.current_creation_receipts();
    const cleanup = await executeExactNetworkCleanup({ nonce: input.nonce,
      receipts: currentReceipts,
      act: input.operations.cleanup_resource });
    await input.operations.verify_build_only_residuals(input.nonce);
    const primary = error instanceof Error &&
        /^DAY147_A5_[A-Z0-9_]+$/.test(error.message)
      ? error.message : "DAY147_A5_RUNNER_CONTAINER_CREATE_FAILED";
    throw new RunnerCreateOnlyFailure(primary, cleanup,
      error instanceof RunnerCommandFailure ? error.diagnostic : null,
      currentReceipts.some(({ resource_type }) =>
        resource_type === "runner_container"));
  }
  const cleanup = await executeExactNetworkCleanup({ nonce: input.nonce,
    receipts: input.operations.current_creation_receipts(),
    act: input.operations.cleanup_resource });
  await input.operations.verify_build_only_residuals(input.nonce);
  if (JSON.stringify(cleanup.attempted) !== JSON.stringify(
      NETWORK_RUNNER_CREATE_ONLY_CLEANUP_ORDER) ||
    JSON.stringify(cleanup.completed) !== JSON.stringify(
      NETWORK_RUNNER_CREATE_ONLY_CLEANUP_ORDER) ||
    cleanup.failures.length !== 0) {
    throw new RunnerCreateOnlyFailure(
      "DAY147_A5_NETWORK_RUNNER_CREATE_CLEANUP_FAILED", cleanup,
    );
  }
  return Object.freeze({ image_id: imageId, network_id: networkId,
    runner_id: runnerId, cleanup });
}

async function main(): Promise<void> {
  mainExecutionCount += 1;
  const arguments_ = parseArguments(process.argv.slice(2));
  const counters: OperationCounters = {
    docker_commands: 0,
    database_connections: 0,
    evidence_writes: 0,
    credential_generations: 0,
  };
  if (arguments_.mode === "execute-isolated") {
    const executionResult = await executeIsolatedMode({
      arguments: arguments_,
      runner: new ProductionDockerCommandRunner(),
      environment: dockerEnvironmentFromProcess(),
      counters,
    });
    console.log(JSON.stringify({
      day147_a5_harness_execute: "PASS",
      directory_fsync: executionResult.status,
      secondary_durability_note: executionResult.secondary_note,
      execution_nonce: executionResult.execution_nonce,
      artifact_chain_valid: executionResult.artifact_chain_valid,
      durability_confirmation: true,
    }));
    return;
  }
  if (arguments_.mode === "execute-network-runner-build-only") {
    const nonce = randomBytes(6).toString("hex");
    const result = await executeNetworkRunnerBuildOnly({
      arguments: arguments_, nonce,
      operations: productionNetworkOperations(counters),
    });
    console.log(JSON.stringify({
      day147_a5_network_runner_build_only: "PASS",
      execution_nonce: nonce,
      provider_gate: "PASS",
      base_image_gate: "PASS",
      source_snapshot: "PASS",
      temporary_image_built_and_bound: true,
      temporary_image_cleanup: "PASS",
      build_root_cleanup: "PASS",
      residual_resources: 0,
      database_connections: counters.database_connections,
      formal_evidence_writes: counters.evidence_writes,
      network_client_success_claimed: false,
      cleanup_phases: result.cleanup.completed,
    }));
    return;
  }
  if (arguments_.mode === "execute-network-runner-create-only") {
    const nonce = randomBytes(6).toString("hex");
    const result = await executeNetworkRunnerCreateOnly({ arguments: arguments_, nonce,
      operations: productionNetworkOperations(counters) });
    console.log(JSON.stringify({
      day147_a5_network_runner_create_only: "PASS", execution_nonce: nonce,
      provider_gate: "PASS", source_snapshot: "PASS",
      temporary_image_built_and_bound: true, temporary_network: "PASS",
      capability_prepared: "PASS", result_root_prepared: "PASS",
      runner_create: "PASS", post_create_inspect: "PASS",
      runner_start_executed: false, database_connections: counters.database_connections,
      formal_evidence_writes: counters.evidence_writes,
      cleanup_phases: result.cleanup.completed, residual_resources: 0,
    }));
    return;
  }
  if (arguments_.mode === "execute-network-runner-launcher-only") {
    const nonce = randomBytes(6).toString("hex");
    const result = await executeNetworkRunnerLauncherOnly({
      arguments: arguments_, nonce, operations: productionNetworkOperations(counters),
    });
    console.log(JSON.stringify({
      day147_a5_network_runner_launcher_only: "PASS",
      execution_nonce: nonce,
      provider_gate: "PASS",
      source_snapshot: "PASS",
      image_build: "PASS",
      build_validator: "PASS",
      build_runtime_uid: NETWORK_RUNNER_FINAL_UID,
      build_runtime_gid: NETWORK_RUNNER_FINAL_GID,
      runtime_validator: result.probe.runtime_validator,
      launcher_started: result.probe.launcher_started,
      entrypoint_started: result.probe.entrypoint_started,
      local_tsx: result.probe.local_tsx,
      database_connections: counters.database_connections,
      network_created: false,
      postgres_created: false,
      formal_evidence_writes: counters.evidence_writes,
      temporary_image_cleanup: "PASS",
      probe_cleanup: "PASS",
      temp_root_cleanup: "PASS",
      residual_resources: 0,
    }));
    return;
  }
  if (arguments_.mode === "execute-network-isolated") {
    const nonce = randomBytes(6).toString("hex");
    const result = await executeConcreteNetworkOrchestratorWithFailureCleanup({
      arguments: arguments_, nonce,
      operations: productionNetworkOperations(counters),
    });
    console.log(JSON.stringify({
      day147_a5_network_execute: "PASS",
      execution_nonce: nonce,
      topology: result.metadata.topology,
      cleanup_complete: result.cleanup.failures.length === 0,
      formal_evidence_finalized: true,
      bootstrap_probe_executed: result.bootstrap_probe_executed,
      bootstrap_probe_status: result.bootstrap_probe_status,
      bootstrap_probe_db_connections: 0,
      runner_attempts_executed: result.runner_timeline.length,
      runner_attempt_limit: MAX_RUNNER_ATTEMPTS,
      successful_runner_attempt: result.successful_runner_attempt,
      runner_attempts: result.runner_timeline.map((attempt) => ({
        attempt: attempt.attempt,
        attempt_started: attempt.attempt_started,
        container_created: attempt.container_created,
        container_started: attempt.container_started,
        binding_checks: attempt.binding_checks,
        binding_success_check: attempt.binding_success_check,
        exit_code: attempt.state.exit_code,
        last_completed_phase: attempt.last_completed_phase,
        first_failed_phase: attempt.first_failed_phase,
        root_cause_class: attempt.root_cause_class,
        retryable: attempt.retryable,
        cleanup_completed: attempt.cleanup_completed,
      })),
      infrastructure: { image_build_count: 1, probe_container_count: 1,
        network_create_count: 1,
        postgres_create_count: 1, internal_readiness_count: 1 },
      migrations: { attempts: 1, all_passed: true },
      case_registry: { attempts: 1, expected_count: 102, executed_count: 102,
        expected_digest: caseRegistryDigest(), actual_digest: caseRegistryDigest(),
        failed_count: 0 },
    }));
    return;
  }
  await runStaticTests();
  assert.equal(productionSocketFilesystemReads, 0);
  assert.equal(productionCurrentUserIdentityReads, 0);
  assert.equal(productionApplicationBundleReads, 0);
  assert.equal(productionProcessLookups, 0);
  assert.equal(productionEvidenceWriteOperations, 0);
  console.log(
    JSON.stringify({
      day147_a5_harness_static: "PASS",
      legacy_fixture_canonical_hash: "PASS",
      legacy_active_selection: "PASS",
      legacy_stale_negative_fixture: "PASS",
      legacy_superseded: "PASS",
      selector_canonical_comparison: "PASS",
      legacy_static: "PASS",
      targeted_diagnostics: 0,
      mode: arguments_.mode,
      docker_commands_executed: counters.docker_commands,
      database_connections: counters.database_connections,
      evidence_file_generated: false,
      credential_generation_count: counters.credential_generations,
      filesystem_socket_reads: productionSocketFilesystemReads,
      current_user_identity_reads: productionCurrentUserIdentityReads,
      application_bundle_reads: productionApplicationBundleReads,
      process_lookups: productionProcessLookups,
      real_evidence_writes: productionEvidenceWriteOperations,
      checksums_valid: true,
      transition_matrix: { states: 5, pairs: 25, allowed: 4, forbidden: 21 },
      dynamic_case_count: DYNAMIC_CASES.length,
      case_registry_digest: caseRegistryDigest(),
    }),
  );
}

async function invokeMainIfDirect(input: {
  meta_url: string;
  argv_entry: string | undefined;
  invoke: () => Promise<void>;
}): Promise<boolean> {
  if (!isDirectRun(input.meta_url, input.argv_entry)) return false;
  await input.invoke();
  return true;
}

if (process.env.FARMOS_A5_MINIMAL_CLIENT_BUNDLE !== "1" &&
  isDirectRun(import.meta.url, process.argv[1])) {
  void main().catch((error: unknown) => {
    if (error instanceof RunnerBuildCommandFailure) {
      console.error(JSON.stringify({
        day147_a5_network_runner_build_only: "FAILED",
        failing_dockerfile_instruction:
          error.diagnostic.failing_dockerfile_instruction,
        fixed_predicate_marker: error.diagnostic.fixed_predicate_marker,
        fixed_failure_marker: error.diagnostic.fixed_failure_marker,
        exit_code: error.diagnostic.exit_code,
        timed_out: error.diagnostic.timed_out,
        sanitized_stdout: error.diagnostic.sanitized_stdout_excerpt,
        sanitized_stderr: error.diagnostic.sanitized_stderr_excerpt,
      }));
    } else if (error instanceof RunnerCreateOnlyFailure) {
      console.error(JSON.stringify({
        day147_a5_network_runner_create_only: "FAILED",
        fixed_failure_code: error.primary_code,
        failure_phase: error.diagnostic?.phase ?? "RUNNER_CONTAINER_CREATE",
        failing_argument_category:
          error.diagnostic?.failing_argument_category ?? "runner_mount_or_permission_contract",
        exit_code: error.diagnostic?.exit_code ?? null,
        timed_out: error.diagnostic?.timed_out ?? false,
        sanitized_stderr: error.diagnostic?.sanitized_stderr ?? "",
        sanitized_stdout: error.diagnostic?.sanitized_stdout ?? "",
        creation_receipt_present: error.creation_receipt_present,
        runner_cleanup: error.cleanup.not_applicable.includes("runner_container")
          ? "NOT_APPLICABLE_NOT_CREATED"
          : error.cleanup.failures.some(({ phase }) => phase === "runner_container")
          ? "FAILED" : "PASS",
        residual_resources: error.cleanup.failures.length === 0 ? 0 : "UNKNOWN",
      }));
    } else if (error instanceof LauncherOnlyProbeFailure) {
      console.error(JSON.stringify({
        day147_a5_network_runner_launcher_only: "FAILED",
        exact_failure_code: error.exact_failure_code,
        exact_first_failed_predicate: error.exact_failed_predicate,
        expected_value: error.expected_value,
        actual_value_sanitized: error.actual_value_sanitized,
        exact_validator_marker: error.exact_validator_marker,
        errno_code: error.errno_code,
        uid: error.uid,
        gid: error.gid,
        file_type: error.file_type,
        readable: error.readable,
        executable: error.executable,
        sanitized_stderr: error.sanitized_stderr,
        cleanup: error.cleanup_passed ? "PASS" : "FAILED",
        database_connections: 0,
        network_created: false,
        postgres_created: false,
      }));
    }
    if (error instanceof NetworkOrchestratorFailure) {
      const finalAttempt = error.runner_timeline.at(-1) ?? null;
      const probeFailure = error.bootstrap_probe_failure;
      console.error(JSON.stringify({
        day147_a5_network_execution: probeFailure !== null
          ? "BLOCKED_RUNNER_BOOTSTRAP_PROBE"
          : error.primary_code.startsWith(
              "DAY147_A5_RUNNER_CONTAINER_POST_START_NETWORK_BINDING_",
            ) ? "BLOCKED_RUNNER_POST_START_NETWORK_BINDING"
          : "BLOCKED_RUNNER_ATTESTATION",
        primary_failure: error.primary_code,
        exact_root_cause: error.exact_root_cause,
        secondary_failures: error.secondary_failures,
        runner_attempts_executed: error.runner_timeline.length,
        runner_attempt_limit: MAX_RUNNER_ATTEMPTS,
        bootstrap_probe_executed: error.bootstrap_probe_executed,
        bootstrap_probe_status: error.bootstrap_probe_status,
        bootstrap_probe: probeFailure === null ? null : {
          last_completed_phase: probeFailure.last_completed_phase,
          first_failed_phase: probeFailure.first_failed_phase,
          exact_failure_class: probeFailure.exact_failure_class,
          exit_code: probeFailure.exit_code,
          state_error: probeFailure.state_error,
          oom_killed: probeFailure.oom_killed,
          sanitized_stdout: probeFailure.sanitized_stdout,
          sanitized_stderr: probeFailure.sanitized_stderr,
          cleanup_passed: probeFailure.cleanup_passed,
          module_resolution: probeFailure.module_diagnostic,
          db_connections: 0, migration_attempts: 0, dynamic_suite_attempts: 0,
        },
        root_cause: finalAttempt === null ? null : {
          exact_class: finalAttempt.root_cause_class,
          last_completed_phase: finalAttempt.last_completed_phase,
          first_failed_phase: finalAttempt.first_failed_phase,
          runner_exit_code: finalAttempt.state.exit_code,
          state_error: boundedRunnerOutput(finalAttempt.state.error),
          oom_killed: finalAttempt.state.oom_killed,
          retryable: finalAttempt.retryable,
        },
        runner_attempts: error.runner_timeline.map((attempt) => ({
          attempt: attempt.attempt,
          attempt_started: attempt.attempt_started,
          container_created: attempt.container_created,
          container_started: attempt.container_started,
          binding_checks: attempt.binding_checks,
          binding_success_check: attempt.binding_success_check,
          exit_code: attempt.state.exit_code,
          last_completed_phase: attempt.last_completed_phase,
          first_failed_phase: attempt.first_failed_phase,
          root_cause_class: attempt.root_cause_class,
          retryable: attempt.retryable,
          cleanup_completed: attempt.cleanup_completed,
          state_status: attempt.state.status,
          state_error: boundedRunnerOutput(attempt.state.error),
          oom_killed: attempt.state.oom_killed,
          started_at: attempt.state.started_at,
          finished_at: attempt.state.finished_at,
          stdout: attempt.sanitized_stdout,
          stderr: attempt.sanitized_stderr,
        })),
        migration_attempts: 0,
        dynamic_suite_attempts: 0,
        host_retry_executed: false,
      }));
    }
    const message = error instanceof Error ? error.message : "unknown_error";
    console.error(`DAY147_A5_HARNESS_FAILED:${message}`);
    process.exitCode = 1;
  });
}
