import { createHash } from "node:crypto";

import { isFarmOsBusinessDate } from "./farm_os_business_date";
import {
  FARM_OS_STABLE_CHANGES_CONTRACT_ID,
  compareFarmOsStableChangeOrdering,
  parseFarmOsStableChangesPage,
  type FarmOsStableChange,
  type FarmOsStableChangesPage,
} from "./farm_os_operational_memory_contract";

export const FARM_OS_STABLE_CHANGES_SCOPE_CONTRACT =
  "farmos.stable_changes.consumer-scope.v1" as const;
export const FARM_OS_STABLE_CHANGES_MAX_PAGE_SIZE = 100 as const;
export const FARM_OS_STABLE_CHANGES_MAX_RANGE_DAYS = 31 as const;

export type FarmOsStableChangesScope = Readonly<{
  contract_version: typeof FARM_OS_STABLE_CHANGES_CONTRACT_ID;
  installation_id: string;
  farm_id: string;
  from_business_date: string;
  to_business_date: string;
  page_size: number;
}>;

export type FarmOsStableChangesCheckpoint = Readonly<{
  stable_changes_scope_id: string;
  cursor: string | null;
  generation: string;
  last_source_updated_at: string | null;
  last_change_sequence: string | null;
  last_successful_page_at: string | null;
  last_returned_count: number | null;
  last_accepted_count: number | null;
  last_duplicate_count: number | null;
  last_has_more: boolean | null;
  last_page_fingerprint: string | null;
  created_at: string;
  updated_at: string;
}>;

export type FarmOsStableChangesPersistenceErrorCode =
  | "CHECKPOINT_NOT_FOUND"
  | "CHECKPOINT_CONFLICT"
  | "ORDERING_REGRESSION"
  | "DEDUPE_CONFLICT"
  | "INGRESS_CONTRACT_INVALID"
  | "PERSISTENCE_UNAVAILABLE"
  | "TRANSACTION_FAILED"
  | "COMMIT_OUTCOME_UNKNOWN";

export class FarmOsStableChangesPersistenceError extends Error {
  readonly code: FarmOsStableChangesPersistenceErrorCode;

  constructor(code: FarmOsStableChangesPersistenceErrorCode) {
    super(code);
    this.name = "FarmOsStableChangesPersistenceError";
    this.code = code;
  }
}

export type FarmOsStableChangesIngressDisposition =
  | "accepted"
  | "semantic_duplicate";

export type FarmOsStableChangesIngressHistory = Readonly<{
  change: FarmOsStableChange;
  disposition: FarmOsStableChangesIngressDisposition;
}>;

export type FarmOsStableChangesDedupeDecision =
  | { result: "accepted"; duplicate_target_sequence: null }
  | { result: "semantic_duplicate"; duplicate_target_sequence: string }
  | { result: "conflict"; duplicate_target_sequence: null };

type JsonRecord = Record<string, unknown>;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

function record(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function canonicalFarmOsStableChangesJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new FarmOsStableChangesPersistenceError("INGRESS_CONTRACT_INVALID");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalFarmOsStableChangesJson).join(",")}]`;
  }
  if (!record(value)) {
    throw new FarmOsStableChangesPersistenceError("INGRESS_CONTRACT_INVALID");
  }
  return `{${Object.keys(value).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalFarmOsStableChangesJson(value[key])}`
  ).join(",")}}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function dateOrdinal(value: string): bigint {
  const [year, month, day] = value.split("-").map(Number);
  const adjustedYear = year! - (month! <= 2 ? 1 : 0);
  const era = Math.floor(adjustedYear / 400);
  const yearOfEra = adjustedYear - era * 400;
  const adjustedMonth = month! + (month! > 2 ? -3 : 9);
  const dayOfYear = Math.floor((153 * adjustedMonth + 2) / 5) + day! - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) -
    Math.floor(yearOfEra / 100) + dayOfYear;
  return BigInt(era * 146097 + dayOfEra);
}

export function parseFarmOsStableChangesScope(
  value: unknown,
): FarmOsStableChangesScope | null {
  if (!record(value) || Object.keys(value).length !== 6 ||
    ![
      "contract_version", "installation_id", "farm_id",
      "from_business_date", "to_business_date", "page_size",
    ].every((key) => Object.hasOwn(value, key)) ||
    value.contract_version !== FARM_OS_STABLE_CHANGES_CONTRACT_ID ||
    typeof value.installation_id !== "string" ||
    !IDENTIFIER.test(value.installation_id) ||
    typeof value.farm_id !== "string" || !IDENTIFIER.test(value.farm_id) ||
    !isFarmOsBusinessDate(value.from_business_date) ||
    !isFarmOsBusinessDate(value.to_business_date) ||
    !Number.isSafeInteger(value.page_size) || Number(value.page_size) < 1 ||
    Number(value.page_size) > FARM_OS_STABLE_CHANGES_MAX_PAGE_SIZE) return null;
  const rangeDays = dateOrdinal(value.to_business_date) -
    dateOrdinal(value.from_business_date) + 1n;
  if (rangeDays < 1n || rangeDays > BigInt(FARM_OS_STABLE_CHANGES_MAX_RANGE_DAYS)) {
    return null;
  }
  return Object.freeze({
    contract_version: FARM_OS_STABLE_CHANGES_CONTRACT_ID,
    installation_id: value.installation_id,
    farm_id: value.farm_id,
    from_business_date: value.from_business_date,
    to_business_date: value.to_business_date,
    page_size: Number(value.page_size),
  });
}

export function createFarmOsStableChangesScopeId(
  scope: FarmOsStableChangesScope,
): string {
  const parsed = parseFarmOsStableChangesScope(scope);
  if (parsed === null) {
    throw new FarmOsStableChangesPersistenceError("INGRESS_CONTRACT_INVALID");
  }
  return `scs1_${sha256(canonicalFarmOsStableChangesJson(parsed))}`;
}

export function createFarmOsStableChangesCursorDigest(
  cursor: string | null,
): string {
  return sha256(`farmos.stable_changes.cursor.v1\n${cursor === null ? "<null>" : cursor}`);
}

export function createFarmOsStableChangesPageFingerprint(input: {
  scope: FarmOsStableChangesScope;
  request_cursor: string | null;
  page: FarmOsStableChangesPage;
}): string {
  return sha256(canonicalFarmOsStableChangesJson({
    scope_id: createFarmOsStableChangesScopeId(input.scope),
    request_cursor: input.request_cursor,
    page: input.page,
  }));
}

export function createFarmOsStableChangeIdentityDigest(
  change: FarmOsStableChange,
): string {
  return sha256(canonicalFarmOsStableChangesJson(change));
}

function sameEffectiveState(
  left: FarmOsStableChange,
  right: FarmOsStableChange,
): boolean {
  return left.operation === right.operation &&
    left.source_record_version === right.source_record_version &&
    left.source_content_hash === right.source_content_hash &&
    left.business_date === right.business_date &&
    left.recorded_at === right.recorded_at &&
    left.deleted_at === right.deleted_at &&
    left.field_reference === right.field_reference &&
    left.crop_cycle_reference === right.crop_cycle_reference &&
    left.work_type_reference === right.work_type_reference;
}

export function classifyFarmOsStableChangesSemanticDedupe(input: {
  change: FarmOsStableChange;
  history: readonly FarmOsStableChangesIngressHistory[];
}): FarmOsStableChangesDedupeDecision {
  const accepted = input.history.filter((entry) =>
    entry.disposition === "accepted" &&
    entry.change.source_record_id === input.change.source_record_id
  );
  if (input.change.source_record_version !== null && accepted.some((entry) =>
    entry.change.source_record_version === input.change.source_record_version &&
    entry.change.source_content_hash !== input.change.source_content_hash
  )) return { result: "conflict", duplicate_target_sequence: null };
  const latest = accepted.sort((left, right) =>
    -compareFarmOsStableChangeOrdering(left.change, right.change)
  )[0];
  if (latest !== undefined && sameEffectiveState(latest.change, input.change)) {
    return {
      result: "semantic_duplicate",
      duplicate_target_sequence: latest.change.change_sequence,
    };
  }
  return { result: "accepted", duplicate_target_sequence: null };
}

export function validateFarmOsStableChangesPageForScope(input: {
  scope: FarmOsStableChangesScope;
  page: unknown;
  lower_bound: Pick<FarmOsStableChange, "source_updated_at" | "change_sequence"> | null;
  known_sequence_digests?: ReadonlyMap<string, string>;
}): FarmOsStableChangesPage {
  const scope = parseFarmOsStableChangesScope(input.scope);
  const parsed = parseFarmOsStableChangesPage(input.page);
  if (scope === null || !parsed.valid || parsed.value.changes.length > scope.page_size) {
    throw new FarmOsStableChangesPersistenceError("INGRESS_CONTRACT_INVALID");
  }
  for (const change of parsed.value.changes) {
    if (change.business_date < scope.from_business_date ||
      change.business_date > scope.to_business_date) {
      throw new FarmOsStableChangesPersistenceError("INGRESS_CONTRACT_INVALID");
    }
    const known = input.known_sequence_digests?.get(change.change_sequence);
    if (known !== undefined) {
      if (known !== createFarmOsStableChangeIdentityDigest(change)) {
        throw new FarmOsStableChangesPersistenceError("DEDUPE_CONFLICT");
      }
      continue;
    }
    if (input.lower_bound !== null &&
      compareFarmOsStableChangeOrdering(input.lower_bound, change) >= 0) {
      throw new FarmOsStableChangesPersistenceError("ORDERING_REGRESSION");
    }
  }
  return parsed.value;
}

export type FarmOsStableChangesCommitPageInput = Readonly<{
  scope: FarmOsStableChangesScope;
  expectedGeneration: string;
  requestCursor: string | null;
  validatedPage: FarmOsStableChangesPage;
  observedAt: string;
}>;

export type FarmOsStableChangesCommitPageResult = Readonly<{
  result: "committed" | "already_committed";
  checkpoint: FarmOsStableChangesCheckpoint;
}>;

export interface FarmOsStableChangesPersistenceRepository {
  loadCheckpoint(
    scope: FarmOsStableChangesScope,
  ): Promise<FarmOsStableChangesCheckpoint>;
  commitPage(
    input: FarmOsStableChangesCommitPageInput,
  ): Promise<FarmOsStableChangesCommitPageResult>;
}
