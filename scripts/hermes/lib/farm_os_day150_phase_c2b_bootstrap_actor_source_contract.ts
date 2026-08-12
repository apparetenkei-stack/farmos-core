import {
  canonicalizeFarmOsProductionTargetExecutionContract,
  hashFarmOsProductionTargetExecutionContract,
  isCanonicalFarmOsProductionTargetExecutionTimestamp,
} from "../../../src/lib/hermes/farm_os_production_target_execution_trusted_clock_contract";
import { FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE } from
  "./farm_os_day150_phase_c2b_bootstrap_manifest_contract";

export const FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY =
  "farmos.day150-c2b-bootstrap-actor-intent-source.v1" as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_REVISION = 1 as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_DIGEST_DOMAIN =
  "farmos.day150-c2b-bootstrap-actor-intent-source.v1:candidate-body" as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_REFERENCE_DIGEST_DOMAIN =
  "farmos.day150-c2b-bootstrap-actor-reference.v1:generateduid-install-binding" as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_SOURCE_DISCRIMINATOR =
  "ACTOR_AUTHORIZATION_INTENT_SOURCE_CANDIDATE" as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_KIND =
  "DAY150_PHASE_C2B_BOOTSTRAP_AUTHORIZATION_INTENT" as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_CAPABILITY_SCOPE =
  "EXECUTE_DAY150_PHASE_C2B_ISOLATED_DURABILITY_QUALIFICATION" as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_AUTHENTICATION_MECHANISM_REVISION = 1 as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_DIGEST_UTILITY_CEILING =
  "SOURCE_CONSTRUCTION_ONLY_NOT_VALIDATION_OR_AUTHORITY" as const;

const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const MAX_PROPOSED_VALIDITY_MS = 900_000;

export type FarmOsDay150C2bBootstrapActorIntentSourceCandidateBody = Readonly<{
  schema_version: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY;
  authority_id: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY;
  authority_revision: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_REVISION;
  source_discriminator: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_SOURCE_DISCRIMINATOR;
  candidate_kind: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_KIND;
  bootstrap_manifest_digest: `sha256:${string}`;
  expected_r2_source_base_generation: number;
  expected_r2_source_base_head_digest: `sha256:${string}`;
  purpose: "DAY150_PHASE_C2B_ISOLATED_DURABILITY_QUALIFICATION";
  requested_capability_scope: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_CAPABILITY_SCOPE;
  actor_reference_digest_candidate: `sha256:${string}`;
  challenge_reference_digest_candidate: `sha256:${string}`;
  authentication_mechanism_revision: number;
  proposed_capability_generation: number;
  previous_capability_or_revocation_digest_candidate: `sha256:${string}` | null;
  proposed_valid_from: string;
  proposed_expires_at: string;
}>;

export type FarmOsDay150C2bBootstrapActorIntentSourceCandidate = Readonly<{
  candidate_body: FarmOsDay150C2bBootstrapActorIntentSourceCandidateBody;
  candidate_digest: `sha256:${string}`;
}>;

export type FarmOsDay150C2bBootstrapActorIntentInvalidReason =
  | "UNTRUSTED_ACTOR_INTENT_INPUT"
  | "INVALID_ACTOR_INTENT_ENVELOPE"
  | "ACTOR_INTENT_AUTHORITY_MISMATCH"
  | "UNKNOWN_ACTOR_INTENT_KIND"
  | "ACTOR_INTENT_MANIFEST_MISMATCH"
  | "INVALID_ACTOR_INTENT_SOURCE_BASE"
  | "INVALID_ACTOR_INTENT_PURPOSE_OR_SCOPE"
  | "INVALID_ACTOR_OR_CHALLENGE_REFERENCE"
  | "INVALID_AUTHENTICATION_MECHANISM_REVISION"
  | "INVALID_CAPABILITY_GENERATION_OR_LINEAGE"
  | "INVALID_PROPOSED_VALIDITY_WINDOW"
  | "ACTOR_INTENT_CROSS_FIELD_INCONSISTENCY"
  | "MALFORMED_ACTOR_INTENT_DIGEST"
  | "ACTOR_INTENT_DIGEST_MISMATCH";

export type FarmOsDay150C2bBootstrapActorIntentParseResult =
  | Readonly<{
    schema_version: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY;
    authority_id: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY;
    authority_revision: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_REVISION;
    classification: "STRUCTURALLY_VALID_ACTOR_INTENT_SOURCE_CANDIDATE";
    source_discriminator: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_SOURCE_DISCRIMINATOR;
    candidate_kind: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_KIND;
    candidate_digest: `sha256:${string}`;
  }>
  | Readonly<{
    schema_version: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY;
    authority_id: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY;
    authority_revision: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_REVISION;
    classification: "INVALID_ACTOR_INTENT_SOURCE_CANDIDATE";
    reason: FarmOsDay150C2bBootstrapActorIntentInvalidReason;
  }>;

interface SnapshotArray extends ReadonlyArray<Snapshot> {}
interface SnapshotObject { readonly [key: string]: Snapshot }
type Snapshot = null | boolean | number | string | SnapshotArray | SnapshotObject;
const SNAPSHOT_FAILED = Symbol("R3_ACTOR_SNAPSHOT_FAILED");

function snapshotData(value: unknown): Snapshot | typeof SNAPSHOT_FAILED {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : SNAPSHOT_FAILED;
  if (typeof value !== "object") return SNAPSHOT_FAILED;
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) return SNAPSHOT_FAILED;
      const length = Object.getOwnPropertyDescriptor(value, "length");
      if (!length || !("value" in length) || !Number.isSafeInteger(length.value) ||
        length.value < 0) return SNAPSHOT_FAILED;
      const keys = Reflect.ownKeys(value);
      if (keys.some((key) => typeof key !== "string") || keys.length !== length.value + 1 ||
        !keys.includes("length")) return SNAPSHOT_FAILED;
      const result: Snapshot[] = [];
      for (let index = 0; index < length.value; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          return SNAPSHOT_FAILED;
        }
        const child = snapshotData(descriptor.value);
        if (child === SNAPSHOT_FAILED) return SNAPSHOT_FAILED;
        result.push(child);
      }
      return Object.freeze(result);
    }
    if (Object.getPrototypeOf(value) !== Object.prototype) return SNAPSHOT_FAILED;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string")) return SNAPSHOT_FAILED;
    const result: Record<string, Snapshot> = {};
    for (const key of keys as string[]) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        return SNAPSHOT_FAILED;
      }
      const child = snapshotData(descriptor.value);
      if (child === SNAPSHOT_FAILED) return SNAPSHOT_FAILED;
      Object.defineProperty(result, key, { value: child, enumerable: true });
    }
    return Object.freeze(result);
  } catch {
    return SNAPSHOT_FAILED;
  }
}

function record(value: Snapshot): Readonly<Record<string, Snapshot>> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, Snapshot>> : null;
}

function hasExactKeys(value: Readonly<Record<string, Snapshot>>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index]);
}

function isDigest(value: unknown): value is `sha256:${string}` {
  return typeof value === "string" && SHA256.test(value);
}

function invalid(
  reason: FarmOsDay150C2bBootstrapActorIntentInvalidReason,
): FarmOsDay150C2bBootstrapActorIntentParseResult {
  return Object.freeze({
    schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY,
    authority_id: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY,
    authority_revision: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_REVISION,
    classification: "INVALID_ACTOR_INTENT_SOURCE_CANDIDATE",
    reason,
  });
}

const BODY_KEYS = Object.freeze([
  "schema_version", "authority_id", "authority_revision", "source_discriminator",
  "candidate_kind", "bootstrap_manifest_digest", "expected_r2_source_base_generation",
  "expected_r2_source_base_head_digest", "purpose", "requested_capability_scope",
  "actor_reference_digest_candidate", "challenge_reference_digest_candidate",
  "authentication_mechanism_revision", "proposed_capability_generation",
  "previous_capability_or_revocation_digest_candidate", "proposed_valid_from",
  "proposed_expires_at",
] as const);

function reconstruct(body: Readonly<Record<string, Snapshot>>):
FarmOsDay150C2bBootstrapActorIntentSourceCandidateBody {
  return Object.freeze({
    schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY,
    authority_id: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY,
    authority_revision: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_REVISION,
    source_discriminator: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_SOURCE_DISCRIMINATOR,
    candidate_kind: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_KIND,
    bootstrap_manifest_digest: body.bootstrap_manifest_digest as `sha256:${string}`,
    expected_r2_source_base_generation: body.expected_r2_source_base_generation as number,
    expected_r2_source_base_head_digest:
      body.expected_r2_source_base_head_digest as `sha256:${string}`,
    purpose: "DAY150_PHASE_C2B_ISOLATED_DURABILITY_QUALIFICATION",
    requested_capability_scope: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_CAPABILITY_SCOPE,
    actor_reference_digest_candidate: body.actor_reference_digest_candidate as `sha256:${string}`,
    challenge_reference_digest_candidate:
      body.challenge_reference_digest_candidate as `sha256:${string}`,
    authentication_mechanism_revision: body.authentication_mechanism_revision as number,
    proposed_capability_generation: body.proposed_capability_generation as number,
    previous_capability_or_revocation_digest_candidate:
      body.previous_capability_or_revocation_digest_candidate as `sha256:${string}` | null,
    proposed_valid_from: body.proposed_valid_from as string,
    proposed_expires_at: body.proposed_expires_at as string,
  });
}

export function computeFarmOsDay150C2bBootstrapActorIntentSourceCandidateDigest(
  body: FarmOsDay150C2bBootstrapActorIntentSourceCandidateBody,
): `sha256:${string}` {
  return hashFarmOsProductionTargetExecutionContract(
    FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_DIGEST_DOMAIN, body,
  );
}

export function canonicalizeFarmOsDay150C2bBootstrapActorIntentSourceCandidateBody(
  body: FarmOsDay150C2bBootstrapActorIntentSourceCandidateBody,
): string {
  return canonicalizeFarmOsProductionTargetExecutionContract(body);
}

export function parseFarmOsDay150C2bBootstrapActorIntentSourceCandidate(
  value: unknown,
): FarmOsDay150C2bBootstrapActorIntentParseResult {
  const snapshot = snapshotData(value);
  if (snapshot === SNAPSHOT_FAILED) return invalid("UNTRUSTED_ACTOR_INTENT_INPUT");
  const envelope = record(snapshot);
  if (!envelope || !hasExactKeys(envelope, ["candidate_body", "candidate_digest"])) {
    return invalid("INVALID_ACTOR_INTENT_ENVELOPE");
  }
  const body = record(envelope.candidate_body);
  if (!body || !hasExactKeys(body, BODY_KEYS)) return invalid("INVALID_ACTOR_INTENT_ENVELOPE");
  if (body.schema_version !== FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY ||
    body.authority_id !== FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY ||
    body.authority_revision !== FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_REVISION ||
    body.source_discriminator !== FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_SOURCE_DISCRIMINATOR) {
    return invalid("ACTOR_INTENT_AUTHORITY_MISMATCH");
  }
  if (body.candidate_kind !== FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_KIND) {
    return invalid("UNKNOWN_ACTOR_INTENT_KIND");
  }
  if (body.bootstrap_manifest_digest !==
    FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE.manifest_digest) {
    return invalid("ACTOR_INTENT_MANIFEST_MISMATCH");
  }
  if (typeof body.expected_r2_source_base_generation !== "number" ||
    !Number.isSafeInteger(body.expected_r2_source_base_generation) ||
    body.expected_r2_source_base_generation < 0 ||
    !isDigest(body.expected_r2_source_base_head_digest)) {
    return invalid("INVALID_ACTOR_INTENT_SOURCE_BASE");
  }
  if (body.purpose !== "DAY150_PHASE_C2B_ISOLATED_DURABILITY_QUALIFICATION" ||
    body.requested_capability_scope !== FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_CAPABILITY_SCOPE) {
    return invalid("INVALID_ACTOR_INTENT_PURPOSE_OR_SCOPE");
  }
  if (!isDigest(body.actor_reference_digest_candidate) ||
    !isDigest(body.challenge_reference_digest_candidate)) {
    return invalid("INVALID_ACTOR_OR_CHALLENGE_REFERENCE");
  }
  if (body.authentication_mechanism_revision !==
    FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_AUTHENTICATION_MECHANISM_REVISION) {
    return invalid("INVALID_AUTHENTICATION_MECHANISM_REVISION");
  }
  if (typeof body.proposed_capability_generation !== "number" ||
    !Number.isSafeInteger(body.proposed_capability_generation) ||
    body.proposed_capability_generation < 0 ||
    !(body.previous_capability_or_revocation_digest_candidate === null ||
      isDigest(body.previous_capability_or_revocation_digest_candidate))) {
    return invalid("INVALID_CAPABILITY_GENERATION_OR_LINEAGE");
  }
  if (!isCanonicalFarmOsProductionTargetExecutionTimestamp(body.proposed_valid_from) ||
    !isCanonicalFarmOsProductionTargetExecutionTimestamp(body.proposed_expires_at)) {
    return invalid("INVALID_PROPOSED_VALIDITY_WINDOW");
  }
  const validFrom = Date.parse(body.proposed_valid_from);
  const expiresAt = Date.parse(body.proposed_expires_at);
  if (expiresAt <= validFrom || expiresAt - validFrom > MAX_PROPOSED_VALIDITY_MS) {
    return invalid("INVALID_PROPOSED_VALIDITY_WINDOW");
  }
  if ((body.proposed_capability_generation === 0) !==
    (body.previous_capability_or_revocation_digest_candidate === null) ||
    body.actor_reference_digest_candidate === body.challenge_reference_digest_candidate) {
    return invalid("ACTOR_INTENT_CROSS_FIELD_INCONSISTENCY");
  }
  if (!isDigest(envelope.candidate_digest)) return invalid("MALFORMED_ACTOR_INTENT_DIGEST");
  const safeBody = reconstruct(body);
  const expectedDigest = computeFarmOsDay150C2bBootstrapActorIntentSourceCandidateDigest(safeBody);
  if (envelope.candidate_digest !== expectedDigest) return invalid("ACTOR_INTENT_DIGEST_MISMATCH");
  return Object.freeze({
    schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY,
    authority_id: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY,
    authority_revision: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_REVISION,
    classification: "STRUCTURALLY_VALID_ACTOR_INTENT_SOURCE_CANDIDATE",
    source_discriminator: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_SOURCE_DISCRIMINATOR,
    candidate_kind: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_KIND,
    candidate_digest: expectedDigest,
  });
}
