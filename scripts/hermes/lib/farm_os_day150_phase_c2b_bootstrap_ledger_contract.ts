import {
  canonicalizeFarmOsProductionTargetExecutionContract,
  hashFarmOsProductionTargetExecutionContract,
} from "../../../src/lib/hermes/farm_os_production_target_execution_trusted_clock_contract";
import {
  FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_AUTHORITY,
  FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE,
} from "./farm_os_day150_phase_c2b_bootstrap_manifest_contract";

export const FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_AUTHORITY =
  "farmos.day150-c2b-bootstrap-ledger-record.v1" as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_REVISION = 1 as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_DIGEST_DOMAIN =
  "farmos.day150-c2b-bootstrap-ledger-record.v1:record-body" as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_EVENT_AUTHORITY =
  "farmos.day150-c2b-bootstrap-ledger-event.v1" as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_PROJECTION_AUTHORITY =
  "farmos.day150-c2b-bootstrap-source-projection.v1" as const;

export const FARM_OS_DAY150_C2B_BOOTSTRAP_QUARANTINE_REASONS = Object.freeze([
  "FORK_DETECTED",
  "CHAIN_CORRUPTION",
  "OBSERVATION_AMBIGUOUS",
  "GENESIS_MISMATCH",
  "PREDECESSOR_MISMATCH",
  "UNSUPPORTED_SCHEMA",
  "UNKNOWN_EVENT_KIND",
  "PROJECTED_STATE_MISMATCH",
] as const);

export type FarmOsDay150C2bBootstrapQuarantineReason =
  typeof FARM_OS_DAY150_C2B_BOOTSTRAP_QUARANTINE_REASONS[number];

export type FarmOsDay150C2bBootstrapGenesisEvent = Readonly<{
  schema_version: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_EVENT_AUTHORITY;
  event_kind: "BOOTSTRAP_GENESIS";
  payload: Readonly<{
    manifest_authority: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_AUTHORITY;
    source_state: "BOOTSTRAP_GENESIS_SOURCE_CONTRACT";
  }>;
}>;

export type FarmOsDay150C2bBootstrapQuarantineEvent = Readonly<{
  schema_version: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_EVENT_AUTHORITY;
  event_kind: "QUARANTINE_ENTERED";
  payload: Readonly<{
    reason: FarmOsDay150C2bBootstrapQuarantineReason;
    terminal: true;
    repeatable: false;
    recoverable_in_r2: false;
  }>;
}>;

export type FarmOsDay150C2bBootstrapLedgerEvent =
  | FarmOsDay150C2bBootstrapGenesisEvent
  | FarmOsDay150C2bBootstrapQuarantineEvent;

export type FarmOsDay150C2bBootstrapSourceProjection = Readonly<{
  schema_version: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_PROJECTION_AUTHORITY;
  bootstrap_manifest_digest: `sha256:${string}`;
  bootstrap_authority_state: "NOT_ACTIVE";
  quarantine_state:
    | "NOT_QUARANTINED"
    | "QUARANTINE_REQUIRED_IF_TRUSTEDLY_OBSERVED";
}>;

export type FarmOsDay150C2bBootstrapLedgerRecordBody = Readonly<{
  schema_version: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_AUTHORITY;
  authority_id: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_AUTHORITY;
  authority_revision: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_REVISION;
  generation: number;
  previous_generation: number | null;
  previous_record_digest: `sha256:${string}` | null;
  bootstrap_manifest_digest: `sha256:${string}`;
  event: FarmOsDay150C2bBootstrapLedgerEvent;
  projected_state_claim: FarmOsDay150C2bBootstrapSourceProjection;
}>;

export type FarmOsDay150C2bBootstrapLedgerRecordSourceCandidate = Readonly<{
  record_body: FarmOsDay150C2bBootstrapLedgerRecordBody;
  record_digest: `sha256:${string}`;
}>;

export type FarmOsDay150C2bBootstrapRecordFailureReason =
  | "INVALID_RECORD_ENVELOPE"
  | "INVALID_RECORD_BODY_SHAPE"
  | "UNKNOWN_SCHEMA"
  | "INVALID_GENERATION"
  | "INVALID_PREDECESSOR_SHAPE"
  | "MANIFEST_MISMATCH"
  | "UNKNOWN_EVENT_KIND"
  | "INVALID_EVENT_PAYLOAD"
  | "INVALID_PROJECTED_STATE_SHAPE"
  | "MALFORMED_RECORD_DIGEST"
  | "RECORD_DIGEST_MISMATCH";

export interface FarmOsDay150C2bBootstrapDataSnapshotArray extends
  ReadonlyArray<FarmOsDay150C2bBootstrapDataSnapshot> {}

export interface FarmOsDay150C2bBootstrapDataSnapshotObject {
  readonly [key: string]: FarmOsDay150C2bBootstrapDataSnapshot;
}

export type FarmOsDay150C2bBootstrapDataSnapshot =
  | null
  | boolean
  | number
  | string
  | FarmOsDay150C2bBootstrapDataSnapshotArray
  | FarmOsDay150C2bBootstrapDataSnapshotObject;

export type FarmOsDay150C2bBootstrapDataSnapshotResult =
  | Readonly<{ accepted: true; snapshot: FarmOsDay150C2bBootstrapDataSnapshot }>
  | Readonly<{ accepted: false }>;

const SNAPSHOT_FAILED = Symbol("FARM_OS_DAY150_C2B_BOOTSTRAP_SNAPSHOT_FAILED");
const SHA256 = /^sha256:[a-f0-9]{64}$/u;

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function snapshotData(
  value: unknown,
): FarmOsDay150C2bBootstrapDataSnapshot | typeof SNAPSHOT_FAILED {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : SNAPSHOT_FAILED;
  if (typeof value !== "object") return SNAPSHOT_FAILED;
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) return SNAPSHOT_FAILED;
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
      if (!lengthDescriptor || !("value" in lengthDescriptor) ||
        !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) {
        return SNAPSHOT_FAILED;
      }
      const length = lengthDescriptor.value as number;
      const ownKeys = Reflect.ownKeys(value);
      if (ownKeys.some((key) => typeof key !== "string") || ownKeys.length !== length + 1 ||
        !ownKeys.includes("length")) return SNAPSHOT_FAILED;
      const snapshot: FarmOsDay150C2bBootstrapDataSnapshot[] = [];
      for (let index = 0; index < length; index += 1) {
        const key = String(index);
        if (!ownKeys.includes(key)) return SNAPSHOT_FAILED;
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
          return SNAPSHOT_FAILED;
        }
        const child = snapshotData(descriptor.value);
        if (child === SNAPSHOT_FAILED) return SNAPSHOT_FAILED;
        snapshot.push(child);
      }
      return Object.freeze(snapshot);
    }
    if (Object.getPrototypeOf(value) !== Object.prototype) return SNAPSHOT_FAILED;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) return SNAPSHOT_FAILED;
    const snapshot: Record<string, FarmOsDay150C2bBootstrapDataSnapshot> = {};
    for (const key of ownKeys as string[]) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
        return SNAPSHOT_FAILED;
      }
      const child = snapshotData(descriptor.value);
      if (child === SNAPSHOT_FAILED) return SNAPSHOT_FAILED;
      Object.defineProperty(snapshot, key, {
        value: child, enumerable: true, configurable: false, writable: false,
      });
    }
    return Object.freeze(snapshot);
  } catch {
    return SNAPSHOT_FAILED;
  }
}

export function snapshotFarmOsDay150C2bBootstrapData(
  value: unknown,
): FarmOsDay150C2bBootstrapDataSnapshotResult {
  const snapshot = snapshotData(value);
  return snapshot === SNAPSHOT_FAILED
    ? Object.freeze({ accepted: false })
    : Object.freeze({ accepted: true, snapshot });
}

function asRecord(
  value: FarmOsDay150C2bBootstrapDataSnapshot,
): Readonly<Record<string, FarmOsDay150C2bBootstrapDataSnapshot>> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, FarmOsDay150C2bBootstrapDataSnapshot>>
    : null;
}

function hasExactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function isDigest(value: unknown): value is `sha256:${string}` {
  return typeof value === "string" && SHA256.test(value);
}

function isQuarantineReason(value: unknown): value is FarmOsDay150C2bBootstrapQuarantineReason {
  return typeof value === "string" &&
    (FARM_OS_DAY150_C2B_BOOTSTRAP_QUARANTINE_REASONS as readonly string[]).includes(value);
}

function parseEvent(
  value: FarmOsDay150C2bBootstrapDataSnapshot,
): Readonly<{ accepted: true; event: FarmOsDay150C2bBootstrapLedgerEvent }> |
  Readonly<{ accepted: false; reason: "UNKNOWN_EVENT_KIND" | "INVALID_EVENT_PAYLOAD" }> {
  const event = asRecord(value);
  if (!event || !hasExactKeys(event, ["schema_version", "event_kind", "payload"])) {
    return Object.freeze({ accepted: false, reason: "INVALID_EVENT_PAYLOAD" });
  }
  if (event.schema_version !== FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_EVENT_AUTHORITY ||
    (event.event_kind !== "BOOTSTRAP_GENESIS" && event.event_kind !== "QUARANTINE_ENTERED")) {
    return Object.freeze({ accepted: false, reason: "UNKNOWN_EVENT_KIND" });
  }
  const payload = asRecord(event.payload);
  if (event.event_kind === "BOOTSTRAP_GENESIS") {
    if (!payload || !hasExactKeys(payload, ["manifest_authority", "source_state"]) ||
      payload.manifest_authority !== FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_AUTHORITY ||
      payload.source_state !== "BOOTSTRAP_GENESIS_SOURCE_CONTRACT") {
      return Object.freeze({ accepted: false, reason: "INVALID_EVENT_PAYLOAD" });
    }
    const parsedEvent: FarmOsDay150C2bBootstrapGenesisEvent = deepFreeze({
      schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_EVENT_AUTHORITY,
      event_kind: "BOOTSTRAP_GENESIS",
      payload: {
        manifest_authority: FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_AUTHORITY,
        source_state: "BOOTSTRAP_GENESIS_SOURCE_CONTRACT",
      },
    } as const);
    return Object.freeze({ accepted: true, event: parsedEvent });
  }
  if (!payload || !hasExactKeys(payload,
    ["reason", "terminal", "repeatable", "recoverable_in_r2"]) ||
    !isQuarantineReason(payload.reason) || payload.terminal !== true ||
    payload.repeatable !== false || payload.recoverable_in_r2 !== false) {
    return Object.freeze({ accepted: false, reason: "INVALID_EVENT_PAYLOAD" });
  }
  const parsedEvent: FarmOsDay150C2bBootstrapQuarantineEvent = deepFreeze({
    schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_EVENT_AUTHORITY,
    event_kind: "QUARANTINE_ENTERED",
    payload: {
      reason: payload.reason,
      terminal: true,
      repeatable: false,
      recoverable_in_r2: false,
    },
  } as const);
  return Object.freeze({ accepted: true, event: parsedEvent });
}

function parseProjection(
  value: FarmOsDay150C2bBootstrapDataSnapshot,
): FarmOsDay150C2bBootstrapSourceProjection | null {
  const projection = asRecord(value);
  if (!projection || !hasExactKeys(projection, [
    "schema_version", "bootstrap_manifest_digest", "bootstrap_authority_state",
    "quarantine_state",
  ]) || projection.schema_version !== FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_PROJECTION_AUTHORITY ||
    projection.bootstrap_manifest_digest !==
      FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE.manifest_digest ||
    projection.bootstrap_authority_state !== "NOT_ACTIVE" ||
    (projection.quarantine_state !== "NOT_QUARANTINED" &&
      projection.quarantine_state !== "QUARANTINE_REQUIRED_IF_TRUSTEDLY_OBSERVED")) return null;
  return deepFreeze({
    schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_PROJECTION_AUTHORITY,
    bootstrap_manifest_digest:
      FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE.manifest_digest,
    bootstrap_authority_state: "NOT_ACTIVE",
    quarantine_state: projection.quarantine_state,
  });
}

export type FarmOsDay150C2bBootstrapRecordParseResult =
  | Readonly<{ accepted: true; record: FarmOsDay150C2bBootstrapLedgerRecordSourceCandidate }>
  | Readonly<{ accepted: false; reason: FarmOsDay150C2bBootstrapRecordFailureReason }>;

function parseRecordSnapshot(
  value: FarmOsDay150C2bBootstrapDataSnapshot,
): FarmOsDay150C2bBootstrapRecordParseResult {
  const envelope = asRecord(value);
  if (!envelope || !hasExactKeys(envelope, ["record_body", "record_digest"])) {
    return Object.freeze({ accepted: false, reason: "INVALID_RECORD_ENVELOPE" });
  }
  const body = asRecord(envelope.record_body);
  if (!body || !hasExactKeys(body, [
    "schema_version", "authority_id", "authority_revision", "generation",
    "previous_generation", "previous_record_digest", "bootstrap_manifest_digest", "event",
    "projected_state_claim",
  ])) return Object.freeze({ accepted: false, reason: "INVALID_RECORD_BODY_SHAPE" });
  if (body.schema_version !== FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_AUTHORITY ||
    body.authority_id !== FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_AUTHORITY ||
    body.authority_revision !== FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_REVISION) {
    return Object.freeze({ accepted: false, reason: "UNKNOWN_SCHEMA" });
  }
  if (typeof body.generation !== "number" || !Number.isSafeInteger(body.generation) ||
    body.generation < 0) return Object.freeze({ accepted: false, reason: "INVALID_GENERATION" });
  if (!(body.previous_generation === null || (typeof body.previous_generation === "number" &&
    Number.isSafeInteger(body.previous_generation) && body.previous_generation >= 0)) ||
    !(body.previous_record_digest === null || isDigest(body.previous_record_digest))) {
    return Object.freeze({ accepted: false, reason: "INVALID_PREDECESSOR_SHAPE" });
  }
  if (body.bootstrap_manifest_digest !==
    FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE.manifest_digest) {
    return Object.freeze({ accepted: false, reason: "MANIFEST_MISMATCH" });
  }
  const parsedEvent = parseEvent(body.event);
  if (!parsedEvent.accepted) return parsedEvent;
  const projection = parseProjection(body.projected_state_claim);
  if (!projection) {
    return Object.freeze({ accepted: false, reason: "INVALID_PROJECTED_STATE_SHAPE" });
  }
  if (!isDigest(envelope.record_digest)) {
    return Object.freeze({ accepted: false, reason: "MALFORMED_RECORD_DIGEST" });
  }
  const recordBody: FarmOsDay150C2bBootstrapLedgerRecordBody = deepFreeze({
    schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_AUTHORITY,
    authority_id: FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_AUTHORITY,
    authority_revision: FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_REVISION,
    generation: body.generation,
    previous_generation: body.previous_generation,
    previous_record_digest: body.previous_record_digest,
    bootstrap_manifest_digest:
      FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE.manifest_digest,
    event: parsedEvent.event,
    projected_state_claim: projection,
  });
  const expectedDigest = computeFarmOsDay150C2bBootstrapLedgerRecordDigest(recordBody);
  if (envelope.record_digest !== expectedDigest) {
    return Object.freeze({ accepted: false, reason: "RECORD_DIGEST_MISMATCH" });
  }
  return Object.freeze({ accepted: true, record: deepFreeze({
    record_body: recordBody,
    record_digest: expectedDigest,
  }) });
}

export function parseFarmOsDay150C2bBootstrapRecordSourceCandidate(
  value: unknown,
): FarmOsDay150C2bBootstrapRecordParseResult {
  const snapshot = snapshotFarmOsDay150C2bBootstrapData(value);
  return snapshot.accepted
    ? parseRecordSnapshot(snapshot.snapshot)
    : Object.freeze({ accepted: false, reason: "INVALID_RECORD_ENVELOPE" });
}

export function canonicalizeFarmOsDay150C2bBootstrapLedgerRecordBody(
  body: FarmOsDay150C2bBootstrapLedgerRecordBody,
): string {
  return canonicalizeFarmOsProductionTargetExecutionContract(snapshotRecordBodyForHash(body));
}

export function computeFarmOsDay150C2bBootstrapLedgerRecordDigest(
  body: FarmOsDay150C2bBootstrapLedgerRecordBody,
): `sha256:${string}` {
  return hashFarmOsProductionTargetExecutionContract(
    FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_DIGEST_DOMAIN,
    snapshotRecordBodyForHash(body),
  );
}

function snapshotRecordBodyForHash(
  body: FarmOsDay150C2bBootstrapLedgerRecordBody,
): FarmOsDay150C2bBootstrapLedgerRecordBody {
  const snapshot = snapshotFarmOsDay150C2bBootstrapData(body);
  if (!snapshot.accepted || typeof snapshot.snapshot !== "object" ||
    snapshot.snapshot === null || Array.isArray(snapshot.snapshot)) {
    throw new TypeError("FARM_OS_DAY150_C2B_BOOTSTRAP_RECORD_BODY_NOT_DATA_ONLY");
  }
  return snapshot.snapshot as unknown as FarmOsDay150C2bBootstrapLedgerRecordBody;
}

export function createFarmOsDay150C2bBootstrapRecordSourceCandidate(
  body: FarmOsDay150C2bBootstrapLedgerRecordBody,
): FarmOsDay150C2bBootstrapLedgerRecordSourceCandidate {
  const safeBody = snapshotRecordBodyForHash(body);
  const record = deepFreeze({
    record_body: safeBody,
    record_digest: hashFarmOsProductionTargetExecutionContract(
      FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_DIGEST_DOMAIN,
      safeBody,
    ),
  });
  const parsed = parseFarmOsDay150C2bBootstrapRecordSourceCandidate(record);
  if (!parsed.accepted) throw new TypeError(parsed.reason);
  return parsed.record;
}

export const FARM_OS_DAY150_C2B_BOOTSTRAP_GENESIS_SOURCE_CONTRACT_CANDIDATE =
  createFarmOsDay150C2bBootstrapRecordSourceCandidate(deepFreeze({
    schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_AUTHORITY,
    authority_id: FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_AUTHORITY,
    authority_revision: FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_REVISION,
    generation: 0,
    previous_generation: null,
    previous_record_digest: null,
    bootstrap_manifest_digest:
      FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE.manifest_digest,
    event: {
      schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_EVENT_AUTHORITY,
      event_kind: "BOOTSTRAP_GENESIS",
      payload: {
        manifest_authority: FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_AUTHORITY,
        source_state: "BOOTSTRAP_GENESIS_SOURCE_CONTRACT",
      },
    },
    projected_state_claim: {
      schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_PROJECTION_AUTHORITY,
      bootstrap_manifest_digest:
        FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE.manifest_digest,
      bootstrap_authority_state: "NOT_ACTIVE",
      quarantine_state: "NOT_QUARANTINED",
    },
  }));

export function farmOsDay150C2bBootstrapRecordsAreExactlyEqual(
  left: unknown,
  right: unknown,
): boolean {
  const parsedLeft = parseFarmOsDay150C2bBootstrapRecordSourceCandidate(left);
  const parsedRight = parseFarmOsDay150C2bBootstrapRecordSourceCandidate(right);
  return parsedLeft.accepted && parsedRight.accepted &&
    parsedLeft.record.record_digest === parsedRight.record.record_digest &&
    canonicalizeFarmOsProductionTargetExecutionContract(parsedLeft.record) ===
      canonicalizeFarmOsProductionTargetExecutionContract(parsedRight.record);
}
