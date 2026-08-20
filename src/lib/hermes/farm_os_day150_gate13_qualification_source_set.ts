import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  canonicalFarmOsDay150Json,
  publishCanonicalFarmOsDay150ArtifactExclusive,
  reconcileCanonicalFarmOsDay150ArtifactDurability,
  reopenCanonicalFarmOsDay150Artifact,
} from "./farm_os_day150_prefix_reference_durable_store";

export const FARM_OS_DAY150_GATE13_SOURCE_SET_SCHEMA =
  "farmos.day150-gate13-qualification-source-set.v1" as const;
export const FARM_OS_DAY150_GATE13_FOURTH_EXECUTION_SNAPSHOT_SCHEMA =
  "farmos.day150-gate13-fourth-execution-source-snapshot.v1" as const;
export const FARM_OS_DAY150_GATE13_FOURTH_EXECUTION_SNAPSHOT_PATH =
  "artifacts/day150/gate13-durability/qualification/v1/fourth-real-attempt-execution-source-snapshot.json" as const;

export const FARM_OS_DAY150_GATE13_REQUIRED_SOURCE_PATHS = Object.freeze([
  ["scripts/hermes/run_farm_os_day150_gate13_isolated_durability_qualification.ts", "RUNNER"],
  ["scripts/hermes/run_farm_os_day150_gate13_durability_readback_worker.ts", "WORKER"],
  ["scripts/hermes/lib/farm_os_day150_gate13_ephemeral_port_topology.ts", "TOPOLOGY"],
  ["scripts/hermes/lib/farm_os_day150_gate13_owned_resource_reconciliation.ts", "RESOURCE_RECONCILIATION"],
  ["scripts/hermes/lib/farm_os_day150_docker_absence_classifier.ts", "RESOURCE_ABSENCE_CLASSIFIER"],
  ["scripts/hermes/lib/farm_os_production_target_execution_postgres_qualification_fixture.ts", "EFFECTFUL_FIXTURE"],
  ["scripts/hermes/lib/farm_os_day150_gate13_finite_acceptance_qualification.ts", "FINITE_D1_D5_QUALIFICATION"],
  ["scripts/hermes/lib/farm_os_day150_gate13_terminal_truthfulness.ts", "TERMINAL_TRUTHFULNESS"],
  ["scripts/hermes/lib/farm_os_day150_gate13_persisted_clock_evidence.ts", "PERSISTED_CLOCK_EVIDENCE_READBACK"],
  ["scripts/hermes/lib/farm_os_production_target_execution_postgres_qualification_contract.ts", "QUALIFICATION_CONTRACT"],
  ["src/lib/hermes/farm_os_day150_gate13_third_attempt_authority.ts", "ATTEMPT_AUTHORITY"],
  ["src/lib/hermes/farm_os_day150_gate13_durability_qualification_evidence.ts", "EVIDENCE_CONTRACT"],
  ["src/lib/hermes/farm_os_day150_gate13_qualification_source_set.ts", "SOURCE_SET_AUTHORITY"],
  ["src/lib/hermes/farm_os_day150_prefix_reference_durable_store.ts", "DURABLE_PUBLICATION"],
  ["src/lib/hermes/farm_os_production_target_execution_approval_authority.ts", "APPROVAL_VALIDATOR"],
  ["src/lib/hermes/farm_os_production_target_execution_command_authority.ts", "COMMAND_VALIDATOR"],
  ["src/lib/hermes/farm_os_production_target_evidence_command_identity.ts", "COMMAND_IDENTITY"],
  ["src/lib/hermes/farm_os_production_identity_query_v2_contract.ts", "COMMAND_QUERY_CONTRACT"],
  ["src/lib/hermes/farm_os_production_identity_query_v5_authority.ts", "COMMAND_QUERY_AUTHORITY"],
  ["src/lib/hermes/farm_os_production_target_identity_minimal_observation_authority.ts", "COMMAND_OBSERVATION_AUTHORITY"],
  ["src/lib/hermes/farm_os_postgres_cluster_system_identifier_digest.ts", "OBSERVATION_DIGEST_HELPER"],
  ["src/lib/hermes/farm_os_production_target_external_feasibility_policy.ts", "COMMAND_FEASIBILITY_POLICY"],
  ["src/lib/hermes/farm_os_production_target_provider_credential_authority.ts", "COMMAND_PROVIDER_CREDENTIAL_AUTHORITY"],
  ["src/lib/hermes/farm_os_production_target_database_credential_authority.ts", "COMMAND_DATABASE_CREDENTIAL_AUTHORITY"],
  ["src/lib/hermes/farm_os_production_target_connection_authority.ts", "COMMAND_CONNECTION_AUTHORITY"],
  ["src/lib/hermes/farm_os_production_target_collector_authority.ts", "COMMAND_COLLECTOR_AUTHORITY"],
  ["src/lib/hermes/farm_os_production_target_principal_capability_authority.ts", "COMMAND_PRINCIPAL_AUTHORITY"],
  ["src/lib/hermes/farm_os_production_target_tls_attestation_authority.ts", "COMMAND_TLS_AUTHORITY"],
  ["src/lib/hermes/farm_os_production_target_authority_lifecycle.ts", "COMMAND_AUTHORITY_LIFECYCLE"],
  ["src/lib/hermes/farm_os_supabase_project_resource_fingerprint.ts", "COMMAND_RESOURCE_FINGERPRINT"],
  ["src/lib/hermes/farm_os_supabase_project_resource_source_authority.ts", "COMMAND_RESOURCE_SOURCE_AUTHORITY"],
  ["src/lib/hermes/farm_os_production_target_execution_lifecycle.ts", "LIFECYCLE_CONTRACT"],
  ["src/lib/hermes/farm_os_production_target_execution_receipt_authority.ts", "RECEIPT_VALIDATOR"],
  ["src/lib/hermes/farm_os_production_target_execution_trusted_clock_contract.ts", "CLOCK_VALIDATOR"],
  ["src/lib/hermes/farm_os_production_target_execution_persistence_ports.ts", "PERSISTENCE_CONTRACT"],
  ["src/lib/hermes/farm_os_production_target_execution_postgres_contract.ts", "POSTGRES_CONTRACT"],
  ["src/lib/hermes/farm_os_production_target_execution_postgres_repository.ts", "POSTGRES_IMPLEMENTATION"],
  ["db/migrations/202608110001_production_target_execution_durability.sql", "EFFECTFUL_SQL"],
  ["db/migrations/202608110001_production_target_execution_durability.verify.sql", "VERIFY_SQL"],
  ["package.json", "RUNTIME_DEPENDENCY_MANIFEST"],
  ["pnpm-lock.yaml", "RUNTIME_DEPENDENCY_LOCK"],
] as const satisfies readonly (readonly [string, string])[]);

export type FarmOsDay150Gate13SourceSetEntry = Readonly<{
  path: string;
  content_sha256: `sha256:${string}`;
  role: string;
}>;
export type FarmOsDay150Gate13SourceSetManifest = Readonly<{
  schema_version: typeof FARM_OS_DAY150_GATE13_SOURCE_SET_SCHEMA;
  entries: readonly FarmOsDay150Gate13SourceSetEntry[];
  qualification_source_set_digest: `sha256:${string}`;
}>;
export type FarmOsDay150Gate13FourthExecutionSnapshot = Readonly<{
  schema_version: typeof FARM_OS_DAY150_GATE13_FOURTH_EXECUTION_SNAPSHOT_SCHEMA;
  qualification_source_set_digest: `sha256:${string}`;
  entries: readonly FarmOsDay150Gate13SourceSetEntry[];
  execution_snapshot_digest: `sha256:${string}`;
}>;

const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const hash = (value: string | Buffer): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(value).digest("hex")}`;
const canonical = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b, "en")).map(([key, nested]) =>
      `${JSON.stringify(key)}:${canonical(nested)}`).join(",")}}`;
};

export function createFarmOsDay150Gate13SourceSetManifest(
  entries: readonly FarmOsDay150Gate13SourceSetEntry[],
): FarmOsDay150Gate13SourceSetManifest {
  const expected = new Map<string, string>(FARM_OS_DAY150_GATE13_REQUIRED_SOURCE_PATHS);
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.path)) throw new Error("GATE13_SOURCE_SET_DUPLICATE_PATH");
    seen.add(entry.path);
    if (expected.get(entry.path) !== entry.role || !DIGEST.test(entry.content_sha256)) {
      throw new Error("GATE13_SOURCE_SET_UNEXPECTED_OR_INVALID_ENTRY");
    }
  }
  if (seen.size !== expected.size || [...expected.keys()].some((path) => !seen.has(path))) {
    throw new Error("GATE13_SOURCE_SET_REQUIRED_PATH_MISSING");
  }
  const ordered = Object.freeze([...entries].sort((left, right) =>
    left.path.localeCompare(right.path, "en")).map((entry) => Object.freeze({ ...entry })));
  const material = Object.freeze({ schema_version: FARM_OS_DAY150_GATE13_SOURCE_SET_SCHEMA,
    entries: ordered });
  return Object.freeze({ ...material, qualification_source_set_digest: hash(
    `${FARM_OS_DAY150_GATE13_SOURCE_SET_SCHEMA}\0${canonical(material)}`) });
}

export function loadFarmOsDay150Gate13SourceSetManifest(
  repositoryRoot: string,
): FarmOsDay150Gate13SourceSetManifest {
  return createFarmOsDay150Gate13SourceSetManifest(
    FARM_OS_DAY150_GATE13_REQUIRED_SOURCE_PATHS.map(([path, role]) => Object.freeze({
      path, role, content_sha256: hash(readFileSync(resolve(repositoryRoot, path))),
    })),
  );
}

export function createFarmOsDay150Gate13FourthExecutionSnapshot(
  manifest: FarmOsDay150Gate13SourceSetManifest,
): FarmOsDay150Gate13FourthExecutionSnapshot {
  const body = Object.freeze({ schema_version:
    FARM_OS_DAY150_GATE13_FOURTH_EXECUTION_SNAPSHOT_SCHEMA,
    qualification_source_set_digest: manifest.qualification_source_set_digest,
    entries: manifest.entries });
  return Object.freeze({ ...body, execution_snapshot_digest: hash(
    `${FARM_OS_DAY150_GATE13_FOURTH_EXECUTION_SNAPSHOT_SCHEMA}\0${canonical(body)}`) });
}

export function parseFarmOsDay150Gate13FourthExecutionSnapshot(
  value: unknown,
): FarmOsDay150Gate13FourthExecutionSnapshot | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).sort().join("\0") !== ["schema_version",
    "qualification_source_set_digest", "entries", "execution_snapshot_digest"]
    .sort().join("\0") || candidate.schema_version !==
      FARM_OS_DAY150_GATE13_FOURTH_EXECUTION_SNAPSHOT_SCHEMA ||
    !Array.isArray(candidate.entries)) return null;
  try {
    const manifest = createFarmOsDay150Gate13SourceSetManifest(
      candidate.entries as FarmOsDay150Gate13SourceSetEntry[]);
    const expected = createFarmOsDay150Gate13FourthExecutionSnapshot(manifest);
    return canonical(value) === canonical(expected) ? expected : null;
  } catch { return null; }
}

export async function publishFarmOsDay150Gate13FourthExecutionSnapshot(input: Readonly<{
  repository_root: string;
  snapshot: FarmOsDay150Gate13FourthExecutionSnapshot;
}>): Promise<FarmOsDay150Gate13FourthExecutionSnapshot> {
  const path = resolve(input.repository_root,
    FARM_OS_DAY150_GATE13_FOURTH_EXECUTION_SNAPSHOT_PATH);
  await publishCanonicalFarmOsDay150ArtifactExclusive(path, input.snapshot);
  await reconcileCanonicalFarmOsDay150ArtifactDurability(path, input.snapshot);
  const reopened = parseFarmOsDay150Gate13FourthExecutionSnapshot(
    await reopenCanonicalFarmOsDay150Artifact(path));
  if (!reopened || canonicalFarmOsDay150Json(reopened) !==
    canonicalFarmOsDay150Json(input.snapshot)) {
    throw new Error("GATE13_FOURTH_EXECUTION_SNAPSHOT_READBACK_FAILED");
  }
  return reopened;
}
