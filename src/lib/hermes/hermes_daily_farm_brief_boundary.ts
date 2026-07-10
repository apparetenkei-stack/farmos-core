import {
  readHermesMemoryContext
} from "../../../scripts/hermes/api_boundary/hermes_memory_context_read_boundary";

export const HERMES_DAILY_FARM_BRIEF_BOUNDARY =
  "day90_hermes_daily_farm_brief_boundary";

export type HermesDailyFarmBriefWarning =
  | "inventory_source_not_available"
  | "work_log_source_not_available"
  | "field_table_not_available"
  | "fixture_crop_cycle_detected"
  | "crop_cycle_context_empty"
  | "hermes_note_context_empty"
  | "readonly_context_invalid"
  | "restricted_domain_data_exposed";

export type HermesDailyFarmBriefInput = {
  briefDate: string;
  context: Awaited<ReturnType<typeof readHermesMemoryContext>>;
  inventorySourceAvailable: boolean;
  workLogSourceAvailable: boolean;
  fieldTableAvailable: boolean;
};

export type HermesDailyFarmBriefCropCycle = {
  id: string | number | null;
  crop: string | null;
  field_name: string | null;
  status: string | null;
  created_at: string | null;
  fixture_like: boolean;
};

export type HermesDailyFarmBriefResult = {
  result: "preview" | "blocked";
  checked: "hermes_daily_farm_brief_boundary";
  boundary: typeof HERMES_DAILY_FARM_BRIEF_BOUNDARY;
  brief_date: string;
  generated_at: string;
  source: "farmos_readonly_context";
  transaction_read_only: boolean;
  crop_cycle_count: number;
  distinct_field_count: number;
  hermes_note_count: number;
  crop_cycles: HermesDailyFarmBriefCropCycle[];
  inventory_source_available: boolean;
  work_log_source_available: boolean;
  field_table_available: boolean;
  priority_items: string[];
  warnings: HermesDailyFarmBriefWarning[];
  data_gaps: string[];
  requires_human_review: true;
  brief_saved: false;
  proposal_saved: false;
  app_write_performed: false;
  database_write_performed: false;
  restricted_domain_data_exposed: boolean;
  blockers: string[];
};

type JsonRecord = Record<string, unknown>;

function text(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return null;
}

function cropCycleFromRecord(
  row: JsonRecord
): HermesDailyFarmBriefCropCycle {
  const fieldName =
    text(row.field_name) ??
    text(row.field_id);

  const crop =
    text(row.crop) ??
    text(row.crop_name) ??
    text(row.crop_type);

  const id =
    typeof row.id === "number" ||
    typeof row.id === "string"
      ? row.id
      : null;

  const fixtureText = [
    text(row.field_name),
    text(row.name),
    text(row.cycle_name)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    id,
    crop,
    field_name: fieldName,
    status: text(row.status),
    created_at: text(row.created_at),
    fixture_like:
      fixtureText.includes("test") ||
      fixtureText.includes("fixture") ||
      fixtureText.includes("day34")
  };
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function createHermesDailyFarmBrief(
  input: HermesDailyFarmBriefInput
): HermesDailyFarmBriefResult {
  const warnings: HermesDailyFarmBriefWarning[] = [];
  const blockers: string[] = [];
  const dataGaps: string[] = [];
  const priorityItems: string[] = [];

  const contextValid =
    input.context.result === "ok" &&
    Boolean(input.context.context) &&
    input.context.boundary.transaction_read_only === true &&
    input.context.boundary.writes_performed === false &&
    input.context.boundary.commands_executed === false;

  if (!contextValid) {
    warnings.push("readonly_context_invalid");
    blockers.push("readonly_context_invalid");
  }

  const restrictedDomainDataExposed =
    Boolean(
      (
        input.context.context as
          | { restricted_domain_data_exposed?: boolean }
          | undefined
      )?.restricted_domain_data_exposed
    );

  if (restrictedDomainDataExposed) {
    warnings.push("restricted_domain_data_exposed");
    blockers.push("restricted_domain_data_exposed");
  }

  const cropCycles = (
    input.context.context?.safe_app_context
      .crop_cycles_summary ?? []
  ).map((row) =>
    cropCycleFromRecord(row as JsonRecord)
  );

  const hermesNotes =
    input.context.context?.latest_hermes_notes ?? [];

  if (cropCycles.length === 0) {
    warnings.push("crop_cycle_context_empty");
    dataGaps.push("crop_cycle_context_unavailable");
  }

  if (hermesNotes.length === 0) {
    warnings.push("hermes_note_context_empty");
    dataGaps.push("hermes_note_context_unavailable");
  }

  if (!input.inventorySourceAvailable) {
    warnings.push("inventory_source_not_available");
    dataGaps.push("inventory_readonly_source_not_connected");
  }

  if (!input.workLogSourceAvailable) {
    warnings.push("work_log_source_not_available");
    dataGaps.push("work_log_readonly_source_not_connected");
  }

  if (!input.fieldTableAvailable) {
    warnings.push("field_table_not_available");
    dataGaps.push(
      "field_context_derived_from_crop_cycles_field_name"
    );
  }

  if (cropCycles.some((cycle) => cycle.fixture_like)) {
    warnings.push("fixture_crop_cycle_detected");
    priorityItems.push(
      "Exclude fixture-like crop cycles before production brief use"
    );
  }

  if (hermesNotes.length > 0) {
    priorityItems.push(
      `${hermesNotes.length} Hermes review notes require inspection`
    );
  }

  if (!input.inventorySourceAvailable) {
    priorityItems.push(
      "Connect inventory read-only source before stock alerts"
    );
  }

  if (!input.workLogSourceAvailable) {
    priorityItems.push(
      "Connect work-log read-only source before missing-record alerts"
    );
  }

  const distinctFields = unique(
    cropCycles
      .map((cycle) => cycle.field_name)
      .filter((value): value is string => Boolean(value))
  );

  return {
    result: blockers.length === 0 ? "preview" : "blocked",
    checked: "hermes_daily_farm_brief_boundary",
    boundary: HERMES_DAILY_FARM_BRIEF_BOUNDARY,
    brief_date: input.briefDate,
    generated_at: new Date().toISOString(),
    source: "farmos_readonly_context",
    transaction_read_only:
      input.context.boundary.transaction_read_only,
    crop_cycle_count: cropCycles.length,
    distinct_field_count: distinctFields.length,
    hermes_note_count: hermesNotes.length,
    crop_cycles: cropCycles,
    inventory_source_available:
      input.inventorySourceAvailable,
    work_log_source_available:
      input.workLogSourceAvailable,
    field_table_available:
      input.fieldTableAvailable,
    priority_items: unique(priorityItems),
    warnings: unique(warnings),
    data_gaps: unique(dataGaps),
    requires_human_review: true,
    brief_saved: false,
    proposal_saved: false,
    app_write_performed: false,
    database_write_performed: false,
    restricted_domain_data_exposed:
      restrictedDomainDataExposed,
    blockers: unique(blockers)
  };
}
