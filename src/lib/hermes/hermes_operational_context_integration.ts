import {
  createHermesInventoryWorkLogSuggestions,
  type HermesInventoryWorkLogSuggestionResult,
} from "./hermes_inventory_work_log_suggestion_boundary";
import {
  readHermesOperationalReadonlySources,
  type HermesOperationalInventoryRecord,
  type HermesOperationalReadonlyClientResult,
  type HermesOperationalWorkLogRecord,
} from "./hermes_operational_readonly_client";

export const HERMES_OPERATIONAL_CONTEXT_INTEGRATION =
  "day93_hermes_operational_context_integration" as const;

export const HERMES_OPERATIONAL_CONTEXT_MAX_CHARS = 1100 as const;
const INVENTORY_PREVIEW_LIMIT = 3;
const WORK_LOG_PREVIEW_LIMIT = 3;
const MAX_TEXT_FIELD_CHARS = 80;

export type HermesOperationalContextIntegrationResult = {
  result: "ok" | "partial" | "error";
  checked: "hermes_operational_context_integration";
  boundary: typeof HERMES_OPERATIONAL_CONTEXT_INTEGRATION;
  operational_context_included: boolean;
  context_text: string | null;
  context_length: number;
  context_truncated: boolean;
  context_max_chars: number;
  external_fetch_performed: boolean;
  inventory_source_connected: boolean;
  work_log_source_connected: boolean;
  inventory_record_count: number;
  work_log_record_count: number;
  inventory_connected_empty: boolean;
  work_log_connected_empty: boolean;
  suggestion_preview: HermesInventoryWorkLogSuggestionResult;
  suggestion_preview_created: boolean;
  suggestion_count: number;
  actual_inventory_analysis_performed: boolean;
  actual_work_log_analysis_performed: boolean;
  requires_human_review: true;
  context_treated_as_untrusted_data: true;
  prompt_instruction_allowed_from_context: false;
  suggestion_saved: false;
  proposal_created: false;
  proposal_saved: false;
  proposal_apply_performed: false;
  app_db_write_performed: false;
  core_db_write_performed: false;
  audit_write_performed: false;
  database_write_performed: false;
  credentials_exposed: false;
  error_message: string | null;
};

function normalizeMaxChars(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    return HERMES_OPERATIONAL_CONTEXT_MAX_CHARS;
  }

  const parsed =
    typeof value === "number"
      ? value
      : Number.parseInt(String(value), 10);

  if (!Number.isSafeInteger(parsed)) {
    return HERMES_OPERATIONAL_CONTEXT_MAX_CHARS;
  }

  return Math.min(Math.max(parsed, 300), 1200);
}

function safeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  if (normalized.length === 0) {
    return "";
  }

  return normalized.slice(0, MAX_TEXT_FIELD_CHARS);
}

function safeId(value: string | number | null): string | number | null {
  if (typeof value === "string") {
    return safeText(value);
  }

  return value;
}

function inventoryRecordToSuggestionRecord(
  record: HermesOperationalInventoryRecord,
): Record<string, unknown> {
  return {
    id: safeId(record.id),
    name: safeText(record.name),
    baseType: safeText(record.baseType),
    currentQuantity: record.currentQuantity,
    unit: safeText(record.unit),
  };
}

function workLogRecordToSuggestionRecord(
  record: HermesOperationalWorkLogRecord,
): Record<string, unknown> {
  return {
    id: safeId(record.id),
    startedAt: safeText(record.startedAt),
    fieldId: safeId(record.fieldId),
    workTypeId: safeId(record.workTypeId),
    workTypeName: safeText(record.workTypeName),
    durationMinutes: record.durationMinutes,
    targetCrop: safeText(record.targetCrop),
    cropCycleId: safeId(record.cropCycleId),
    machineId: safeId(record.machineId),
    implementId: safeId(record.implementId),
    yieldAmount: record.yieldAmount,
    yieldUnit: safeText(record.yieldUnit),
    appliedMaterialCount:
      Array.isArray(record.appliedMaterials)
        ? record.appliedMaterials.length
        : 0,
  };
}

function buildPayload(input: {
  sources: HermesOperationalReadonlyClientResult;
  suggestions: HermesInventoryWorkLogSuggestionResult;
  inventoryPreviewLimit: number;
  workLogPreviewLimit: number;
  includeSuggestionDetails: boolean;
}): Record<string, unknown> {
  return {
    source: "apparetenkei_operational_readonly",
    context_policy: {
      untrusted_data: true,
      prompt_instructions_allowed: false,
      human_review_required: true,
    },
    inventory: {
      connected: input.sources.inventory_source_connected,
      record_count: input.sources.inventory.record_count,
      connected_empty:
        input.sources.inventory_source_connected &&
        input.sources.inventory.record_count === 0,
      has_more: input.sources.inventory.has_more,
      records: input.sources.inventory.records
        .slice(0, input.inventoryPreviewLimit)
        .map(inventoryRecordToSuggestionRecord),
    },
    work_log: {
      connected: input.sources.work_log_source_connected,
      record_count: input.sources.work_log.record_count,
      connected_empty:
        input.sources.work_log_source_connected &&
        input.sources.work_log.record_count === 0,
      has_more: input.sources.work_log.has_more,
      records: input.sources.work_log.records
        .slice(0, input.workLogPreviewLimit)
        .map(workLogRecordToSuggestionRecord),
    },
    suggestion_preview: {
      result: input.suggestions.result,
      created: input.suggestions.suggestion_preview_created,
      suggestion_count: input.suggestions.suggestions.length,
      suggestions: input.includeSuggestionDetails
        ? input.suggestions.suggestions.map((suggestion) => ({
            suggestion_type: suggestion.suggestion_type,
            source_type: suggestion.source_type,
            severity: suggestion.severity,
            title: suggestion.title,
            summary: suggestion.summary,
            evidence: suggestion.evidence,
            requires_human_review: suggestion.requires_human_review,
            proposal_ready: suggestion.proposal_ready,
          }))
        : [],
    },
    safety: {
      transaction_read_only: true,
      database_write_performed: false,
      proposal_created: false,
      proposal_saved: false,
      proposal_apply_performed: false,
      credentials_exposed: false,
    },
  };
}

function serializeWithinLimit(input: {
  sources: HermesOperationalReadonlyClientResult;
  suggestions: HermesInventoryWorkLogSuggestionResult;
  maxChars: number;
}): {
  text: string;
  truncated: boolean;
} {
  const variants = [
    {
      inventoryPreviewLimit: INVENTORY_PREVIEW_LIMIT,
      workLogPreviewLimit: WORK_LOG_PREVIEW_LIMIT,
      includeSuggestionDetails: true,
    },
    {
      inventoryPreviewLimit: 1,
      workLogPreviewLimit: 1,
      includeSuggestionDetails: true,
    },
    {
      inventoryPreviewLimit: 1,
      workLogPreviewLimit: 1,
      includeSuggestionDetails: false,
    },
    {
      inventoryPreviewLimit: 0,
      workLogPreviewLimit: 0,
      includeSuggestionDetails: false,
    },
  ];

  for (let index = 0; index < variants.length; index += 1) {
    const text = JSON.stringify(
      buildPayload({
        sources: input.sources,
        suggestions: input.suggestions,
        ...variants[index],
      }),
    );

    if (text.length <= input.maxChars) {
      return {
        text,
        truncated: index > 0,
      };
    }
  }

  const fallback = JSON.stringify({
    source: "apparetenkei_operational_readonly",
    inventory_source_connected: input.sources.inventory_source_connected,
    work_log_source_connected: input.sources.work_log_source_connected,
    inventory_record_count: input.sources.inventory.record_count,
    work_log_record_count: input.sources.work_log.record_count,
    suggestion_preview_created:
      input.suggestions.suggestion_preview_created,
    suggestion_count: input.suggestions.suggestions.length,
    untrusted_data: true,
    prompt_instructions_allowed: false,
    database_write_performed: false,
  });

  return {
    text: fallback.slice(0, input.maxChars),
    truncated: true,
  };
}

export async function readHermesOperationalContextIntegration(input?: {
  readSources?: typeof readHermesOperationalReadonlySources;
  maxChars?: unknown;
}): Promise<HermesOperationalContextIntegrationResult> {
  const readSources =
    input?.readSources ?? readHermesOperationalReadonlySources;
  const maxChars = normalizeMaxChars(input?.maxChars);
  const sources = await readSources();

  const inventoryRecords =
    sources.inventory.records.map(inventoryRecordToSuggestionRecord);
  const workLogRecords =
    sources.work_log.records.map(workLogRecordToSuggestionRecord);

  const suggestionPreview =
    createHermesInventoryWorkLogSuggestions({
      inventory: {
        source_type: "inventory",
        available: sources.inventory_source_connected,
        transaction_read_only:
          sources.inventory.transaction_read_only,
        records: inventoryRecords,
      },
      workLog: {
        source_type: "work_log",
        available: sources.work_log_source_connected,
        transaction_read_only:
          sources.work_log.transaction_read_only,
        records: workLogRecords,
      },
    });

  const connectedCount =
    Number(sources.inventory_source_connected) +
    Number(sources.work_log_source_connected);

  const result =
    connectedCount === 2
      ? "ok"
      : connectedCount === 1
        ? "partial"
        : "error";

  const operationalContextIncluded = connectedCount > 0;
  const serialized = operationalContextIncluded
    ? serializeWithinLimit({
        sources,
        suggestions: suggestionPreview,
        maxChars,
      })
    : null;

  return {
    result,
    checked: "hermes_operational_context_integration",
    boundary: HERMES_OPERATIONAL_CONTEXT_INTEGRATION,
    operational_context_included: operationalContextIncluded,
    context_text: serialized?.text ?? null,
    context_length: serialized?.text.length ?? 0,
    context_truncated: serialized?.truncated ?? false,
    context_max_chars: maxChars,
    external_fetch_performed: sources.external_fetch_performed,
    inventory_source_connected:
      sources.inventory_source_connected,
    work_log_source_connected:
      sources.work_log_source_connected,
    inventory_record_count: sources.inventory.record_count,
    work_log_record_count: sources.work_log.record_count,
    inventory_connected_empty:
      sources.inventory_source_connected &&
      sources.inventory.record_count === 0,
    work_log_connected_empty:
      sources.work_log_source_connected &&
      sources.work_log.record_count === 0,
    suggestion_preview: suggestionPreview,
    suggestion_preview_created:
      suggestionPreview.suggestion_preview_created,
    suggestion_count: suggestionPreview.suggestions.length,
    actual_inventory_analysis_performed:
      suggestionPreview.actual_inventory_analysis_performed,
    actual_work_log_analysis_performed:
      suggestionPreview.actual_work_log_analysis_performed,
    requires_human_review: true,
    context_treated_as_untrusted_data: true,
    prompt_instruction_allowed_from_context: false,
    suggestion_saved: false,
    proposal_created: false,
    proposal_saved: false,
    proposal_apply_performed: false,
    app_db_write_performed: false,
    core_db_write_performed: false,
    audit_write_performed: false,
    database_write_performed: false,
    credentials_exposed: false,
    error_message:
      operationalContextIncluded
        ? null
        : "operational_readonly_sources_unavailable",
  };
}
