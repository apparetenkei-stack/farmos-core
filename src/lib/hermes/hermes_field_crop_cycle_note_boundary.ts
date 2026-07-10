import {
  readHermesMemoryContext
} from "../../../scripts/hermes/api_boundary/hermes_memory_context_read_boundary";

export const HERMES_FIELD_CROP_CYCLE_NOTE_BOUNDARY =
  "day90_hermes_field_crop_cycle_note_boundary";

export type HermesNoteTargetType =
  | "crop_cycle"
  | "field";

export type HermesFieldCropCycleNoteInput = {
  targetType: HermesNoteTargetType;
  targetId: string;
  context: Awaited<ReturnType<typeof readHermesMemoryContext>>;
};

export type HermesFieldCropCycleNoteResult = {
  result: "preview" | "blocked";
  checked: "hermes_field_crop_cycle_note_boundary";
  boundary: typeof HERMES_FIELD_CROP_CYCLE_NOTE_BOUNDARY;
  target_type: HermesNoteTargetType;
  requested_target_id: string;
  resolved_target_id: string | null;
  target_found: boolean;
  target_fixture_like: boolean;
  crop_cycle_id: string | null;
  field_name: string | null;
  crop: string | null;
  note_title: string | null;
  note_summary: string | null;
  evidence: string[];
  warnings: string[];
  requires_human_review: true;
  note_candidate_created: boolean;
  note_saved: false;
  proposal_saved: false;
  app_write_performed: false;
  audit_write_performed: false;
  database_write_performed: false;
  restricted_domain_data_exposed: boolean;
  blockers: string[];
};

type JsonRecord = Record<string, unknown>;

type CropCycleRecord = {
  id: string;
  crop: string | null;
  field_name: string | null;
  fixture_like: boolean;
};

function text(value: unknown): string | null {
  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
  }

  return null;
}

function normalizeCropCycle(
  row: JsonRecord
): CropCycleRecord {
  const id = text(row.id) ?? "";
  const fieldName =
    text(row.field_name) ??
    text(row.field_id);

  const crop =
    text(row.crop) ??
    text(row.crop_name) ??
    text(row.crop_type);

  const searchable = [
    fieldName,
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
    fixture_like:
      searchable.includes("day34") ||
      searchable.includes("fixture") ||
      searchable.includes("test")
  };
}

export function createHermesFieldCropCycleNote(
  input: HermesFieldCropCycleNoteInput
): HermesFieldCropCycleNoteResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const evidence: string[] = [];

  const requestedTargetId =
    input.targetId.trim();

  const contextValid =
    input.context.result === "ok" &&
    Boolean(input.context.context) &&
    input.context.boundary.transaction_read_only === true &&
    input.context.boundary.writes_performed === false &&
    input.context.boundary.commands_executed === false;

  if (!contextValid) {
    blockers.push("readonly_context_invalid");
  }

  if (requestedTargetId.length === 0) {
    blockers.push("target_id_required");
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
    blockers.push("restricted_domain_data_exposed");
  }

  const cropCycles = (
    input.context.context
      ?.safe_app_context.crop_cycles_summary ?? []
  ).map((row) =>
    normalizeCropCycle(row as JsonRecord)
  );

  const target =
    input.targetType === "crop_cycle"
      ? cropCycles.find(
          (cycle) =>
            cycle.id === requestedTargetId
        )
      : cropCycles.find(
          (cycle) =>
            cycle.field_name === requestedTargetId
        );

  if (!target) {
    blockers.push("target_not_found");
  }

  if (target?.fixture_like) {
    warnings.push("fixture_target_detected");
    blockers.push(
      "fixture_target_not_allowed_for_operational_note"
    );
  }

  if (target) {
    evidence.push(
      `crop_cycle_id:${target.id}`
    );

    if (target.field_name) {
      evidence.push(
        `field_name:${target.field_name}`
      );
    }

    if (target.crop) {
      evidence.push(
        `crop:${target.crop}`
      );
    }
  }

  const noteCandidateCreated =
    blockers.length === 0 &&
    Boolean(target);

  return {
    result:
      noteCandidateCreated
        ? "preview"
        : "blocked",
    checked:
      "hermes_field_crop_cycle_note_boundary",
    boundary:
      HERMES_FIELD_CROP_CYCLE_NOTE_BOUNDARY,
    target_type: input.targetType,
    requested_target_id:
      requestedTargetId,
    resolved_target_id:
      target
        ? input.targetType === "crop_cycle"
          ? target.id
          : target.field_name
        : null,
    target_found: Boolean(target),
    target_fixture_like:
      target?.fixture_like ?? false,
    crop_cycle_id: target?.id ?? null,
    field_name:
      target?.field_name ?? null,
    crop: target?.crop ?? null,
    note_title: noteCandidateCreated
      ? `Hermes note preview: ${target?.crop ?? "crop"} / ${target?.field_name ?? "field"}`
      : null,
    note_summary: noteCandidateCreated
      ? "Read-only crop-cycle context was resolved. Human review is required before any note persistence or proposal creation."
      : null,
    evidence,
    warnings,
    requires_human_review: true,
    note_candidate_created:
      noteCandidateCreated,
    note_saved: false,
    proposal_saved: false,
    app_write_performed: false,
    audit_write_performed: false,
    database_write_performed: false,
    restricted_domain_data_exposed:
      restrictedDomainDataExposed,
    blockers
  };
}
