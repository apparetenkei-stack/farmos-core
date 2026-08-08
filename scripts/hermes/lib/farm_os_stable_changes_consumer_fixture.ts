import {
  FARM_OS_STABLE_CHANGES_CONTRACT_ID,
  type FarmOsStableChange,
  type FarmOsStableChangesPage,
} from "../../../src/lib/hermes/farm_os_operational_memory_contract";
import type {
  FarmOsStableChangesScope,
} from "../../../src/lib/hermes/farm_os_stable_changes_persistence";

export const STABLE_CHANGES_SCOPE: FarmOsStableChangesScope = Object.freeze({
  contract_version: FARM_OS_STABLE_CHANGES_CONTRACT_ID,
  installation_id: "installation_fixture_01",
  farm_id: "farm_fixture_01",
  from_business_date: "2026-08-01",
  to_business_date: "2026-08-07",
  page_size: 100,
});

export function stableChange(input: Partial<FarmOsStableChange> & {
  change_sequence: string;
}): FarmOsStableChange {
  return {
    change_sequence: input.change_sequence,
    operation: input.operation ?? "upsert",
    source_record_id: input.source_record_id ?? "work_fixture_01",
    source_record_version: input.source_record_version === undefined
      ? 1
      : input.source_record_version,
    source_content_hash: input.source_content_hash ?? "a".repeat(64),
    business_date: input.business_date ?? "2026-08-01",
    recorded_at: input.recorded_at === undefined
      ? "2026-08-01T09:00:00.000001+09:00"
      : input.recorded_at,
    source_updated_at: input.source_updated_at ??
      "2026-08-01T09:00:00.000001+09:00",
    deleted_at: input.deleted_at ?? null,
    field_reference: input.field_reference === undefined
      ? "field_fixture_01"
      : input.field_reference,
    crop_cycle_reference: null,
    work_type_reference: input.work_type_reference === undefined
      ? "work_type_fixture_01"
      : input.work_type_reference,
    safe_payload: {},
  };
}

export function stableTombstone(
  input: Partial<FarmOsStableChange> & { change_sequence: string },
): FarmOsStableChange {
  return stableChange({
    ...input,
    operation: "tombstone",
    recorded_at: input.recorded_at ?? null,
    deleted_at: input.deleted_at ?? "2026-08-01T10:00:00.000001+09:00",
  });
}

export function stablePage(input: {
  changes: FarmOsStableChange[];
  next_cursor?: string | null;
  has_more?: boolean;
}): FarmOsStableChangesPage {
  const hasMore = input.has_more ?? false;
  return {
    contract_version: FARM_OS_STABLE_CHANGES_CONTRACT_ID,
    result: "ok",
    next_cursor: input.next_cursor === undefined
      ? hasMore ? "cursor_fixture_next" : null
      : input.next_cursor,
    has_more: hasMore,
    changes: input.changes,
  };
}
