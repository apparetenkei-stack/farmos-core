import {
  canonicalizeFarmOsProductionTargetExecutionContract,
  hashFarmOsProductionTargetExecutionContract,
  isCanonicalFarmOsProductionTargetExecutionTimestamp,
} from "../../../src/lib/hermes/farm_os_production_target_execution_trusted_clock_contract";
import { FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE } from
  "./farm_os_day150_phase_c2b_bootstrap_manifest_contract";

export const FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY =
  "farmos.day150-c2b-bootstrap-clock-intent-source.v1" as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_REVISION = 1 as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_DIGEST_DOMAIN =
  "farmos.day150-c2b-bootstrap-clock-intent-source.v1:candidate-body" as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_SOURCE_DISCRIMINATOR =
  "CLOCK_TRANSITION_INTENT_SOURCE_CANDIDATE" as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_POLICY_REVISION = 1 as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_DIGEST_UTILITY_CEILING =
  "SOURCE_CONSTRUCTION_ONLY_NOT_VALIDATION_OR_AUTHORITY" as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_KINDS = Object.freeze([
  "CLOCK_GENESIS_INTENT", "CLOCK_COMPARISON_INTENT", "CLOCK_EPOCH_SUPERSESSION_INTENT",
] as const);
export const FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_CONDITIONAL_CLASSIFICATIONS = Object.freeze([
  "NON_REGRESSING_IF_TRUSTEDLY_OBSERVED",
  "ROLLBACK_CONDITION_IF_TRUSTEDLY_OBSERVED",
  "FORWARD_POISON_CONDITION_IF_TRUSTEDLY_OBSERVED",
] as const);

type Digest = `sha256:${string}`;
type CommonBody = Readonly<{
  schema_version: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY;
  authority_id: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY;
  authority_revision: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_REVISION;
  source_discriminator: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_SOURCE_DISCRIMINATOR;
  bootstrap_manifest_digest: Digest;
  installation_identity_digest_candidate: Digest;
  expected_r2_source_base_generation: number;
  expected_r2_source_base_head_digest: Digest;
  policy_revision: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_POLICY_REVISION;
}>;
export type FarmOsDay150C2bBootstrapClockGenesisIntentBody = CommonBody & Readonly<{
  intent_kind: "CLOCK_GENESIS_INTENT";
  actor_reference_digest_candidate: Digest;
  capability_reference_digest_candidate: Digest;
  proposed_epoch_reference_digest_candidate: Digest;
  proposed_genesis_timestamp: string;
}>;
export type FarmOsDay150C2bBootstrapClockComparisonIntentBody = CommonBody & Readonly<{
  intent_kind: "CLOCK_COMPARISON_INTENT";
  epoch_reference_digest_candidate: Digest;
  previous_floor_timestamp_candidate: string;
  proposed_observation_timestamp_candidate: string;
  forward_poison_upper_bound_timestamp_candidate: string;
}>;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_POISON_REASONS = Object.freeze([
  "FORWARD_POISON_CONDITION_CANDIDATE",
] as const);
export const FARM_OS_DAY150_C2B_BOOTSTRAP_AFFECTED_RECORD_POLICIES = Object.freeze([
  "QUARANTINE_SUSPECT_INTERVAL_PENDING_SEPARATE_REVIEW",
] as const);
export type FarmOsDay150C2bBootstrapClockEpochSupersessionIntentBody = CommonBody & Readonly<{
  intent_kind: "CLOCK_EPOCH_SUPERSESSION_INTENT";
  previous_epoch_reference_digest_candidate: Digest;
  poison_reason: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_POISON_REASONS[number];
  last_trusted_pre_suspect_reference_digest_candidate: Digest;
  suspect_interval_start_candidate: string;
  suspect_interval_end_candidate: string;
  proposed_corrected_genesis_timestamp: string;
  recovery_actor_reference_digest_candidate: Digest;
  capability_reference_digest_candidate: Digest;
  affected_record_policy: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_AFFECTED_RECORD_POLICIES[number];
  proposed_new_epoch_reference_digest_candidate: Digest;
}>;
export type FarmOsDay150C2bBootstrapClockIntentSourceCandidateBody =
  | FarmOsDay150C2bBootstrapClockGenesisIntentBody
  | FarmOsDay150C2bBootstrapClockComparisonIntentBody
  | FarmOsDay150C2bBootstrapClockEpochSupersessionIntentBody;
export type FarmOsDay150C2bBootstrapClockIntentSourceCandidate = Readonly<{
  candidate_body: FarmOsDay150C2bBootstrapClockIntentSourceCandidateBody;
  candidate_digest: Digest;
}>;

export type FarmOsDay150C2bBootstrapClockConditionalClassification =
  typeof FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_CONDITIONAL_CLASSIFICATIONS[number];
export type FarmOsDay150C2bBootstrapClockIntentInvalidReason =
  | "UNTRUSTED_CLOCK_INTENT_INPUT" | "INVALID_CLOCK_INTENT_ENVELOPE"
  | "CLOCK_INTENT_AUTHORITY_MISMATCH" | "UNKNOWN_CLOCK_INTENT_KIND"
  | "CLOCK_INTENT_MANIFEST_OR_INSTALLATION_MISMATCH" | "INVALID_CLOCK_INTENT_SOURCE_BASE"
  | "INVALID_CLOCK_EPOCH_OR_REFERENCE" | "INVALID_CLOCK_TIMESTAMP"
  | "INVALID_CLOCK_ACTOR_OR_CAPABILITY_REFERENCE" | "INVALID_CLOCK_POLICY_OR_ENUM"
  | "CLOCK_INTENT_CROSS_FIELD_INCONSISTENCY" | "MALFORMED_CLOCK_INTENT_DIGEST"
  | "CLOCK_INTENT_DIGEST_MISMATCH";
export type FarmOsDay150C2bBootstrapClockIntentParseResult =
  | Readonly<{
    schema_version: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY;
    authority_id: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY;
    authority_revision: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_REVISION;
    classification: "STRUCTURALLY_VALID_CLOCK_INTENT_SOURCE_CANDIDATE";
    source_discriminator: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_SOURCE_DISCRIMINATOR;
    intent_kind: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_KINDS[number];
    candidate_digest: Digest;
    conditional_source_comparison?: Readonly<{
      result: FarmOsDay150C2bBootstrapClockConditionalClassification;
      basis: "SOURCE_RELATIVE_CANDIDATE_COMPARISON_ONLY";
      future_trusted_bindings_required:
        "EPOCH_DURABLE_FLOOR_POLICY_OS_OBSERVATION_AND_STORAGE_READBACK";
    }>;
  }>
  | Readonly<{
    schema_version: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY;
    authority_id: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY;
    authority_revision: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_REVISION;
    classification: "INVALID_CLOCK_INTENT_SOURCE_CANDIDATE";
    reason: FarmOsDay150C2bBootstrapClockIntentInvalidReason;
  }>;

interface SnapshotArray extends ReadonlyArray<Snapshot> {}
interface SnapshotObject { readonly [key: string]: Snapshot }
type Snapshot = null | boolean | number | string | SnapshotArray | SnapshotObject;
const SNAPSHOT_FAILED = Symbol("R3_CLOCK_SNAPSHOT_FAILED");
const SHA256 = /^sha256:[a-f0-9]{64}$/u;
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
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return SNAPSHOT_FAILED;
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
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return SNAPSHOT_FAILED;
      const child = snapshotData(descriptor.value);
      if (child === SNAPSHOT_FAILED) return SNAPSHOT_FAILED;
      Object.defineProperty(result, key, { value: child, enumerable: true });
    }
    return Object.freeze(result);
  } catch { return SNAPSHOT_FAILED; }
}
function record(value: Snapshot): Readonly<Record<string, Snapshot>> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, Snapshot>> : null;
}
function exact(value: Readonly<Record<string, Snapshot>>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}
function isDigest(value: unknown): value is Digest {
  return typeof value === "string" && SHA256.test(value);
}
function invalid(reason: FarmOsDay150C2bBootstrapClockIntentInvalidReason):
FarmOsDay150C2bBootstrapClockIntentParseResult {
  return Object.freeze({ schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY,
    authority_id: FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY,
    authority_revision: FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_REVISION,
    classification: "INVALID_CLOCK_INTENT_SOURCE_CANDIDATE", reason });
}
const COMMON_KEYS = ["schema_version", "authority_id", "authority_revision", "source_discriminator",
  "intent_kind", "bootstrap_manifest_digest", "installation_identity_digest_candidate",
  "expected_r2_source_base_generation", "expected_r2_source_base_head_digest", "policy_revision"];
const KIND_KEYS = Object.freeze({
  CLOCK_GENESIS_INTENT: ["actor_reference_digest_candidate", "capability_reference_digest_candidate",
    "proposed_epoch_reference_digest_candidate", "proposed_genesis_timestamp"],
  CLOCK_COMPARISON_INTENT: ["epoch_reference_digest_candidate", "previous_floor_timestamp_candidate",
    "proposed_observation_timestamp_candidate", "forward_poison_upper_bound_timestamp_candidate"],
  CLOCK_EPOCH_SUPERSESSION_INTENT: ["previous_epoch_reference_digest_candidate", "poison_reason",
    "last_trusted_pre_suspect_reference_digest_candidate", "suspect_interval_start_candidate",
    "suspect_interval_end_candidate", "proposed_corrected_genesis_timestamp",
    "recovery_actor_reference_digest_candidate", "capability_reference_digest_candidate",
    "affected_record_policy", "proposed_new_epoch_reference_digest_candidate"],
} as const);

export function computeFarmOsDay150C2bBootstrapClockIntentSourceCandidateDigest(
  body: FarmOsDay150C2bBootstrapClockIntentSourceCandidateBody,
): Digest {
  return hashFarmOsProductionTargetExecutionContract(
    FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_DIGEST_DOMAIN, body,
  );
}
export function canonicalizeFarmOsDay150C2bBootstrapClockIntentSourceCandidateBody(
  body: FarmOsDay150C2bBootstrapClockIntentSourceCandidateBody,
): string { return canonicalizeFarmOsProductionTargetExecutionContract(body); }

function reconstruct(body: Readonly<Record<string, Snapshot>>):
FarmOsDay150C2bBootstrapClockIntentSourceCandidateBody {
  const common = {
    schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY,
    authority_id: FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY,
    authority_revision: FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_REVISION,
    source_discriminator: FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_SOURCE_DISCRIMINATOR,
    bootstrap_manifest_digest: body.bootstrap_manifest_digest as Digest,
    installation_identity_digest_candidate: body.installation_identity_digest_candidate as Digest,
    expected_r2_source_base_generation: body.expected_r2_source_base_generation as number,
    expected_r2_source_base_head_digest: body.expected_r2_source_base_head_digest as Digest,
    policy_revision: FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_POLICY_REVISION,
  } as const;
  if (body.intent_kind === "CLOCK_GENESIS_INTENT") return Object.freeze({ ...common,
    intent_kind: body.intent_kind,
    actor_reference_digest_candidate: body.actor_reference_digest_candidate as Digest,
    capability_reference_digest_candidate: body.capability_reference_digest_candidate as Digest,
    proposed_epoch_reference_digest_candidate: body.proposed_epoch_reference_digest_candidate as Digest,
    proposed_genesis_timestamp: body.proposed_genesis_timestamp as string });
  if (body.intent_kind === "CLOCK_COMPARISON_INTENT") return Object.freeze({ ...common,
    intent_kind: body.intent_kind,
    epoch_reference_digest_candidate: body.epoch_reference_digest_candidate as Digest,
    previous_floor_timestamp_candidate: body.previous_floor_timestamp_candidate as string,
    proposed_observation_timestamp_candidate: body.proposed_observation_timestamp_candidate as string,
    forward_poison_upper_bound_timestamp_candidate:
      body.forward_poison_upper_bound_timestamp_candidate as string });
  return Object.freeze({ ...common, intent_kind: "CLOCK_EPOCH_SUPERSESSION_INTENT",
    previous_epoch_reference_digest_candidate: body.previous_epoch_reference_digest_candidate as Digest,
    poison_reason: body.poison_reason as "FORWARD_POISON_CONDITION_CANDIDATE",
    last_trusted_pre_suspect_reference_digest_candidate:
      body.last_trusted_pre_suspect_reference_digest_candidate as Digest,
    suspect_interval_start_candidate: body.suspect_interval_start_candidate as string,
    suspect_interval_end_candidate: body.suspect_interval_end_candidate as string,
    proposed_corrected_genesis_timestamp: body.proposed_corrected_genesis_timestamp as string,
    recovery_actor_reference_digest_candidate: body.recovery_actor_reference_digest_candidate as Digest,
    capability_reference_digest_candidate: body.capability_reference_digest_candidate as Digest,
    affected_record_policy: body.affected_record_policy as
      "QUARANTINE_SUSPECT_INTERVAL_PENDING_SEPARATE_REVIEW",
    proposed_new_epoch_reference_digest_candidate:
      body.proposed_new_epoch_reference_digest_candidate as Digest });
}

export function parseFarmOsDay150C2bBootstrapClockIntentSourceCandidate(
  value: unknown,
): FarmOsDay150C2bBootstrapClockIntentParseResult {
  const snapshot = snapshotData(value);
  if (snapshot === SNAPSHOT_FAILED) return invalid("UNTRUSTED_CLOCK_INTENT_INPUT");
  const envelope = record(snapshot);
  if (!envelope || !exact(envelope, ["candidate_body", "candidate_digest"])) {
    return invalid("INVALID_CLOCK_INTENT_ENVELOPE");
  }
  const body = record(envelope.candidate_body);
  if (!body) return invalid("INVALID_CLOCK_INTENT_ENVELOPE");
  const kind = body.intent_kind;
  const kindKeys = typeof kind === "string" && Object.hasOwn(KIND_KEYS, kind)
    ? KIND_KEYS[kind as keyof typeof KIND_KEYS] : null;
  const allKnownKeys = new Set([...COMMON_KEYS, ...Object.values(KIND_KEYS).flat()]);
  if (Object.keys(body).some((key) => !allKnownKeys.has(key))) {
    return invalid("INVALID_CLOCK_INTENT_ENVELOPE");
  }
  if (body.schema_version !== FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY ||
    body.authority_id !== FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY ||
    body.authority_revision !== FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_REVISION ||
    body.source_discriminator !== FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_SOURCE_DISCRIMINATOR) {
    return invalid("CLOCK_INTENT_AUTHORITY_MISMATCH");
  }
  if (!kindKeys) return invalid("UNKNOWN_CLOCK_INTENT_KIND");
  if (!exact(body, [...COMMON_KEYS, ...kindKeys])) return invalid("INVALID_CLOCK_INTENT_ENVELOPE");
  if (body.bootstrap_manifest_digest !==
    FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE.manifest_digest ||
    !isDigest(body.installation_identity_digest_candidate)) {
    return invalid("CLOCK_INTENT_MANIFEST_OR_INSTALLATION_MISMATCH");
  }
  if (typeof body.expected_r2_source_base_generation !== "number" ||
    !Number.isSafeInteger(body.expected_r2_source_base_generation) ||
    body.expected_r2_source_base_generation < 0 || !isDigest(body.expected_r2_source_base_head_digest)) {
    return invalid("INVALID_CLOCK_INTENT_SOURCE_BASE");
  }
  const epochKeys = kind === "CLOCK_GENESIS_INTENT"
    ? ["proposed_epoch_reference_digest_candidate"]
    : kind === "CLOCK_COMPARISON_INTENT" ? ["epoch_reference_digest_candidate"]
      : ["previous_epoch_reference_digest_candidate", "last_trusted_pre_suspect_reference_digest_candidate",
        "proposed_new_epoch_reference_digest_candidate"];
  if (epochKeys.some((key) => !isDigest(body[key]))) {
    return invalid("INVALID_CLOCK_EPOCH_OR_REFERENCE");
  }
  const timestampKeys = kind === "CLOCK_GENESIS_INTENT" ? ["proposed_genesis_timestamp"]
    : kind === "CLOCK_COMPARISON_INTENT" ? ["previous_floor_timestamp_candidate",
      "proposed_observation_timestamp_candidate", "forward_poison_upper_bound_timestamp_candidate"]
      : ["suspect_interval_start_candidate", "suspect_interval_end_candidate",
        "proposed_corrected_genesis_timestamp"];
  if (timestampKeys.some((key) => !isCanonicalFarmOsProductionTargetExecutionTimestamp(body[key]))) {
    return invalid("INVALID_CLOCK_TIMESTAMP");
  }
  if (kind === "CLOCK_GENESIS_INTENT" &&
    (!isDigest(body.actor_reference_digest_candidate) ||
      !isDigest(body.capability_reference_digest_candidate)) ||
    kind === "CLOCK_EPOCH_SUPERSESSION_INTENT" &&
    (!isDigest(body.recovery_actor_reference_digest_candidate) ||
      !isDigest(body.capability_reference_digest_candidate))) {
    return invalid("INVALID_CLOCK_ACTOR_OR_CAPABILITY_REFERENCE");
  }
  if (body.policy_revision !== FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_POLICY_REVISION ||
    kind === "CLOCK_EPOCH_SUPERSESSION_INTENT" &&
    (!(FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_POISON_REASONS as readonly unknown[]).includes(body.poison_reason) ||
      !(FARM_OS_DAY150_C2B_BOOTSTRAP_AFFECTED_RECORD_POLICIES as readonly unknown[])
        .includes(body.affected_record_policy))) {
    return invalid("INVALID_CLOCK_POLICY_OR_ENUM");
  }
  if (kind === "CLOCK_COMPARISON_INTENT" &&
    Date.parse(body.forward_poison_upper_bound_timestamp_candidate as string) <
      Date.parse(body.previous_floor_timestamp_candidate as string) ||
    kind === "CLOCK_EPOCH_SUPERSESSION_INTENT" &&
    (Date.parse(body.suspect_interval_end_candidate as string) <
      Date.parse(body.suspect_interval_start_candidate as string) ||
      body.previous_epoch_reference_digest_candidate ===
        body.proposed_new_epoch_reference_digest_candidate) ||
    kind === "CLOCK_GENESIS_INTENT" &&
    body.actor_reference_digest_candidate === body.capability_reference_digest_candidate) {
    return invalid("CLOCK_INTENT_CROSS_FIELD_INCONSISTENCY");
  }
  if (!isDigest(envelope.candidate_digest)) return invalid("MALFORMED_CLOCK_INTENT_DIGEST");
  const safeBody = reconstruct(body);
  const expectedDigest = computeFarmOsDay150C2bBootstrapClockIntentSourceCandidateDigest(safeBody);
  if (envelope.candidate_digest !== expectedDigest) return invalid("CLOCK_INTENT_DIGEST_MISMATCH");
  const conditional = kind === "CLOCK_COMPARISON_INTENT"
    ? Date.parse(body.proposed_observation_timestamp_candidate as string) <
      Date.parse(body.previous_floor_timestamp_candidate as string)
      ? "ROLLBACK_CONDITION_IF_TRUSTEDLY_OBSERVED" as const
      : Date.parse(body.proposed_observation_timestamp_candidate as string) >
        Date.parse(body.forward_poison_upper_bound_timestamp_candidate as string)
        ? "FORWARD_POISON_CONDITION_IF_TRUSTEDLY_OBSERVED" as const
        : "NON_REGRESSING_IF_TRUSTEDLY_OBSERVED" as const
    : undefined;
  return Object.freeze({
    schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY,
    authority_id: FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY,
    authority_revision: FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_REVISION,
    classification: "STRUCTURALLY_VALID_CLOCK_INTENT_SOURCE_CANDIDATE",
    source_discriminator: FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_SOURCE_DISCRIMINATOR,
    intent_kind: kind as typeof FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_KINDS[number],
    candidate_digest: expectedDigest,
    ...(conditional === undefined ? {} : { conditional_source_comparison: Object.freeze({
      result: conditional,
      basis: "SOURCE_RELATIVE_CANDIDATE_COMPARISON_ONLY" as const,
      future_trusted_bindings_required:
        "EPOCH_DURABLE_FLOOR_POLICY_OS_OBSERVATION_AND_STORAGE_READBACK" as const,
    }) }),
  });
}
