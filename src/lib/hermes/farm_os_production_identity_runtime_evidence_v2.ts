import { createHash } from "node:crypto";

export const FARM_OS_PRODUCTION_IDENTITY_RUNTIME_EVIDENCE_V2 =
  "farmos.production-identity-runtime-evidence.v2" as const;
export const FARM_OS_PRODUCTION_TARGET_LIVE_EVIDENCE_V2 =
  "farmos.production-target-live-evidence.v2" as const;
export const FARM_OS_PRODUCTION_IDENTITY_COLLECTOR_ENTRYPOINT_V1 =
  "farmos.production-identity-collector-entrypoint.v1" as const;

const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const REFERENCE = /^[a-z0-9][a-z0-9._:/-]{0,199}$/u;
const FORBIDDEN = /(?:password|secret|token|credential|dsn|connection[_-]?string|raw_)/iu;
function canonical(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("NON_FINITE");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value !== "object") throw new Error("NON_JSON");
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => FORBIDDEN.test(key))) throw new Error("FORBIDDEN_FIELD");
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
}
function hash(domain: string, value: unknown): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(`${domain}\n${canonical(value)}`).digest("hex")}`;
}
function canonicalTime(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

export type FarmOsProductionIdentityTrustedCollection = Readonly<{
  target_manifest_digest: `sha256:${string}`;
  target_identity_digest: `sha256:${string}`;
  query_authority_id: "farmos.production-target-identity-query.v5";
  query_sha256: `sha256:${string}`;
  collector_authority_id: "farmos.production-target-collector-authority.v1";
  connection_authority_id: "farmos.production-target-connection-authority.v1";
  approval_receipt_digest: `sha256:${string}`;
  command_record_digest: `sha256:${string}`;
  lifecycle_record_digest: `sha256:${string}`;
  canonical_authority_head_digest: `sha256:${string}`;
  collected_at: string;
  sanitized_result_digest: `sha256:${string}`;
  collection_complete: true;
  transaction_read_only: true;
  production_write_count: 0;
}>;

export interface FarmOsProductionIdentityCollectorPort {
  readonly port_authority: "farmos.production-identity-trusted-collector-port.v1";
  collectExactV5ReadOnly(): Promise<FarmOsProductionIdentityTrustedCollection>;
}

declare const COLLECTION: unique symbol;
declare const RUNTIME: unique symbol;
declare const LIVE: unique symbol;
export type FarmOsProductionIdentityCollectionCapability = Readonly<{ [COLLECTION]: true }>;
export type FarmOsProductionIdentityRuntimeEvidenceCapability = Readonly<{ [RUNTIME]: true }>;
export type FarmOsProductionTargetLiveEvidenceCapability = Readonly<{ [LIVE]: true }>;
const collections = new WeakMap<object, FarmOsProductionIdentityTrustedCollection>();
const runtimeCapabilities = new WeakMap<object, FarmOsProductionIdentityRuntimeEvidenceV2>();
const liveCapabilities = new WeakMap<object, FarmOsProductionTargetLiveEvidenceV2>();
const opaque = <T>(): T => Object.freeze(Object.create(null)) as T;

function validCollection(value: FarmOsProductionIdentityTrustedCollection): boolean {
  const digests = [value.target_manifest_digest, value.target_identity_digest,
    value.query_sha256, value.approval_receipt_digest, value.command_record_digest,
    value.lifecycle_record_digest, value.canonical_authority_head_digest,
    value.sanitized_result_digest];
  return digests.every((digest) => DIGEST.test(digest)) && canonicalTime(value.collected_at) &&
    value.query_authority_id === "farmos.production-target-identity-query.v5" &&
    value.collector_authority_id === "farmos.production-target-collector-authority.v1" &&
    value.connection_authority_id === "farmos.production-target-connection-authority.v1" &&
    value.collection_complete === true && value.transaction_read_only === true &&
    value.production_write_count === 0;
}

export class FarmOsProductionIdentityCollectorEntrypoint {
  readonly authority_id = FARM_OS_PRODUCTION_IDENTITY_COLLECTOR_ENTRYPOINT_V1;
  constructor(private readonly port: FarmOsProductionIdentityCollectorPort) {
    if (port.port_authority !== "farmos.production-identity-trusted-collector-port.v1") {
      throw new Error("TRUSTED_COLLECTOR_PORT_REQUIRED");
    }
  }
  async collect(): Promise<FarmOsProductionIdentityCollectionCapability> {
    const result = await this.port.collectExactV5ReadOnly();
    if (!validCollection(result)) throw new Error("TRUSTED_COLLECTION_REJECTED");
    const capability = opaque<FarmOsProductionIdentityCollectionCapability>();
    collections.set(capability, Object.freeze(result));
    return capability;
  }
}

export type FarmOsProductionIdentityRuntimeEvidenceV2 = Readonly<{
  schema_version: typeof FARM_OS_PRODUCTION_IDENTITY_RUNTIME_EVIDENCE_V2;
  target_manifest_digest: `sha256:${string}`; target_identity_digest: `sha256:${string}`;
  query_authority_id: "farmos.production-target-identity-query.v5";
  query_sha256: `sha256:${string}`;
  collector_authority_id: "farmos.production-target-collector-authority.v1";
  connection_authority_id: "farmos.production-target-connection-authority.v1";
  approval_receipt_digest: `sha256:${string}`; command_record_digest: `sha256:${string}`;
  lifecycle_record_digest: `sha256:${string}`;
  canonical_authority_head_digest: `sha256:${string}`;
  collected_at: string; sanitized_result_digest: `sha256:${string}`;
  collection_complete: true; transaction_read_only: true; production_write_count: 0;
  evidence_digest: `sha256:${string}`;
}>;

export function assembleFarmOsProductionIdentityRuntimeEvidenceV2(
  capability: FarmOsProductionIdentityCollectionCapability,
): Readonly<{ capability: FarmOsProductionIdentityRuntimeEvidenceCapability;
  evidence: FarmOsProductionIdentityRuntimeEvidenceV2 }> {
  const collection = collections.get(capability);
  if (!collection) throw new Error("TRUSTED_COLLECTION_CAPABILITY_REQUIRED");
  const material = Object.freeze({ schema_version: FARM_OS_PRODUCTION_IDENTITY_RUNTIME_EVIDENCE_V2,
    ...collection });
  const evidence = Object.freeze({ ...material,
    evidence_digest: hash(FARM_OS_PRODUCTION_IDENTITY_RUNTIME_EVIDENCE_V2, material) });
  const runtime = opaque<FarmOsProductionIdentityRuntimeEvidenceCapability>();
  runtimeCapabilities.set(runtime, evidence);
  return Object.freeze({ capability: runtime, evidence });
}

export type FarmOsProductionTargetLiveEvidenceV2 = Readonly<{
  schema_version: typeof FARM_OS_PRODUCTION_TARGET_LIVE_EVIDENCE_V2;
  runtime_evidence_digest: `sha256:${string}`;
  target_manifest_digest: `sha256:${string}`;
  target_identity_digest: `sha256:${string}`;
  canonical_authority_head_digest: `sha256:${string}`;
  observed_at: string; collection_complete: true; transaction_read_only: true;
  production_write_count: 0; live_evidence_digest: `sha256:${string}`;
}>;

export function assembleFarmOsProductionTargetLiveEvidenceV2(input: Readonly<{
  runtime: FarmOsProductionIdentityRuntimeEvidenceCapability; observed_at: string;
}>): Readonly<{ capability: FarmOsProductionTargetLiveEvidenceCapability;
  evidence: FarmOsProductionTargetLiveEvidenceV2 }> {
  const runtime = runtimeCapabilities.get(input.runtime);
  if (!runtime || !canonicalTime(input.observed_at) ||
    Date.parse(input.observed_at) < Date.parse(runtime.collected_at)) {
    throw new Error("TRUSTED_RUNTIME_EVIDENCE_AND_TIME_REQUIRED");
  }
  const material = Object.freeze({ schema_version: FARM_OS_PRODUCTION_TARGET_LIVE_EVIDENCE_V2,
    runtime_evidence_digest: runtime.evidence_digest,
    target_manifest_digest: runtime.target_manifest_digest,
    target_identity_digest: runtime.target_identity_digest,
    canonical_authority_head_digest: runtime.canonical_authority_head_digest,
    observed_at: input.observed_at, collection_complete: true as const,
    transaction_read_only: true as const, production_write_count: 0 as const });
  const evidence = Object.freeze({ ...material,
    live_evidence_digest: hash(FARM_OS_PRODUCTION_TARGET_LIVE_EVIDENCE_V2, material) });
  const live = opaque<FarmOsProductionTargetLiveEvidenceCapability>();
  liveCapabilities.set(live, evidence);
  return Object.freeze({ capability: live, evidence });
}

export function readTrustedFarmOsProductionTargetLiveEvidenceV2(
  capability: FarmOsProductionTargetLiveEvidenceCapability,
): FarmOsProductionTargetLiveEvidenceV2 | null {
  return liveCapabilities.get(capability) ?? null;
}

export const FARM_OS_PRODUCTION_IDENTITY_V2_SOURCE_BOUNDARY = Object.freeze({
  collector_consumer_separate: true, production_collection_enabled: false,
  runtime_binding_enabled: false, automatic_latest_selection: false,
  production_operations: 0,
} as const);
