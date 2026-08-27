import { createHash } from "node:crypto";

export const FARM_OS_CORE_MEMORY_STAGING_PROVIDER_AUTHORITY = Object.freeze({
  authority_id: "farmos.day150-5-e5.core-memory-staging-provider.v1",
  provider_class: "containerized_postgres",
  provider_scope: "customer_owned_staging",
  logical_name: "farmos_core_memory_staging",
  resource_alias: "farmos-core-memory-staging-postgres",
  volume_name: "farmos-core-memory-staging-postgres-data",
  postgres_major: 17,
  image_digest:
    "postgres@sha256:7958605b474b3d264a969cb3a123d6aa00ad1e1fe9da8a69984dabb704d93317",
  listener_address: "127.0.0.1",
  listener_port: 55_432,
  credential_class: "core-memory-staging-readonly",
  persistence: "DEDICATED_LONG_LIVED_VOLUME",
  production_reuse: false,
} as const);

export type FarmOsCoreMemoryStagingResourceEvidence = Readonly<{
  provider_class: "containerized_postgres";
  provider_scope: "customer_owned_staging";
  logical_name: "farmos_core_memory_staging";
  resource_alias: "farmos-core-memory-staging-postgres";
  volume_name: "farmos-core-memory-staging-postgres-data";
  postgres_major: 17;
  image_digest: typeof FARM_OS_CORE_MEMORY_STAGING_PROVIDER_AUTHORITY.image_digest;
  listener_address: "127.0.0.1";
  listener_port: 55432;
}>;

export type FarmOsCoreMemoryStagingResourceResult =
  | Readonly<{
    accepted: true;
    evidence: FarmOsCoreMemoryStagingResourceEvidence;
    resource_fingerprint: `sha256:${string}`;
  }>
  | Readonly<{
    accepted: false;
    reason:
      | "INVALID_EVIDENCE"
      | "PROVIDER_AUTHORITY_MISMATCH"
      | "PRODUCTION_OR_GENERIC_RESOURCE_REUSE";
  }>;

const EVIDENCE_KEYS = Object.freeze([
  "image_digest",
  "listener_address",
  "listener_port",
  "logical_name",
  "postgres_major",
  "provider_class",
  "provider_scope",
  "resource_alias",
  "volume_name",
] as const);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value).sort();
  return keys.length === EVIDENCE_KEYS.length &&
    keys.every((key, index) => key === EVIDENCE_KEYS[index]);
}

export function parseFarmOsCoreMemoryStagingResourceEvidence(
  value: unknown,
): FarmOsCoreMemoryStagingResourceEvidence | null {
  const authority = FARM_OS_CORE_MEMORY_STAGING_PROVIDER_AUTHORITY;
  if (!record(value) || !exact(value) ||
    value.provider_class !== authority.provider_class ||
    value.provider_scope !== authority.provider_scope ||
    value.logical_name !== authority.logical_name ||
    value.resource_alias !== authority.resource_alias ||
    value.volume_name !== authority.volume_name ||
    value.postgres_major !== authority.postgres_major ||
    value.image_digest !== authority.image_digest ||
    value.listener_address !== authority.listener_address ||
    value.listener_port !== authority.listener_port) return null;
  return Object.freeze({ ...value }) as FarmOsCoreMemoryStagingResourceEvidence;
}

export function fingerprintFarmOsCoreMemoryStagingResource(
  value: unknown,
): FarmOsCoreMemoryStagingResourceResult {
  if (!record(value)) {
    return Object.freeze({ accepted: false, reason: "INVALID_EVIDENCE" });
  }
  if (value.resource_alias === "farmos-postgres" ||
    value.volume_name === "./data/postgres" || value.listener_port === 5432) {
    return Object.freeze({
      accepted: false,
      reason: "PRODUCTION_OR_GENERIC_RESOURCE_REUSE",
    });
  }
  const evidence = parseFarmOsCoreMemoryStagingResourceEvidence(value);
  if (evidence === null) {
    return Object.freeze({
      accepted: false,
      reason: "PROVIDER_AUTHORITY_MISMATCH",
    });
  }
  const canonical = JSON.stringify({
    authority_id: FARM_OS_CORE_MEMORY_STAGING_PROVIDER_AUTHORITY.authority_id,
    image_digest: evidence.image_digest,
    logical_name: evidence.logical_name,
    postgres_major: evidence.postgres_major,
    provider_class: evidence.provider_class,
    provider_scope: evidence.provider_scope,
    resource_alias: evidence.resource_alias,
    volume_name: evidence.volume_name,
  });
  return Object.freeze({
    accepted: true,
    evidence,
    resource_fingerprint:
      `sha256:${createHash("sha256").update(canonical, "utf8").digest("hex")}`,
  });
}
