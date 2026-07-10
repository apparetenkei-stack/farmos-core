export const HERMES_INVENTORY_WORK_LOG_SUGGESTION_BOUNDARY =
  "day90_hermes_inventory_work_log_suggestion_boundary";

export type HermesSuggestionSourceType =
  | "inventory"
  | "work_log";

export type HermesSuggestionType =
  | "data_source_gap"
  | "stock_attention"
  | "work_log_attention";

export type HermesInventoryWorkLogSource = {
  source_type: HermesSuggestionSourceType;
  available: boolean;
  transaction_read_only: boolean;
  records: Record<string, unknown>[];
};

export type HermesInventoryWorkLogSuggestionInput = {
  inventory: HermesInventoryWorkLogSource;
  workLog: HermesInventoryWorkLogSource;
};

export type HermesOperationalSuggestion = {
  suggestion_type: HermesSuggestionType;
  source_type: HermesSuggestionSourceType;
  severity: "info" | "warning";
  title: string;
  summary: string;
  evidence: string[];
  target_type: "data_source" | "inventory_item" | "work_log";
  target_id: string | null;
  confidence: number;
  requires_human_review: true;
  proposal_ready: boolean;
};

export type HermesInventoryWorkLogSuggestionResult = {
  result: "preview" | "blocked";
  checked:
    "hermes_inventory_work_log_suggestion_boundary";
  boundary:
    typeof HERMES_INVENTORY_WORK_LOG_SUGGESTION_BOUNDARY;
  inventory_source_available: boolean;
  work_log_source_available: boolean;
  inventory_transaction_read_only: boolean;
  work_log_transaction_read_only: boolean;
  inventory_record_count: number;
  work_log_record_count: number;
  suggestions: HermesOperationalSuggestion[];
  actual_inventory_analysis_performed: boolean;
  actual_work_log_analysis_performed: boolean;
  requires_human_review: true;
  suggestion_preview_created: boolean;
  suggestion_saved: false;
  proposal_saved: false;
  app_write_performed: false;
  audit_write_performed: false;
  database_write_performed: false;
  blockers: string[];
};

function createDataSourceGapSuggestion(
  sourceType: HermesSuggestionSourceType
): HermesOperationalSuggestion {
  const label =
    sourceType === "inventory"
      ? "Inventory"
      : "Work log";

  return {
    suggestion_type: "data_source_gap",
    source_type: sourceType,
    severity: "info",
    title: `${label} read-only source is not connected`,
    summary:
      `${label} suggestions cannot be generated from operational records until a safe read-only source is connected.`,
    evidence: [
      `source_type:${sourceType}`,
      "source_available:false",
      "actual_record_analysis:false"
    ],
    target_type: "data_source",
    target_id: null,
    confidence: 1,
    requires_human_review: true,
    proposal_ready: false
  };
}

function createInventorySuggestion(
  records: Record<string, unknown>[]
): HermesOperationalSuggestion | null {
  if (records.length === 0) {
    return null;
  }

  return {
    suggestion_type: "stock_attention",
    source_type: "inventory",
    severity: "warning",
    title: "Inventory records require human inspection",
    summary:
      "Read-only inventory records are available, but this boundary does not automatically change stock or create an apply-ready proposal.",
    evidence: [
      `inventory_record_count:${records.length}`,
      "inventory_write_performed:false"
    ],
    target_type: "inventory_item",
    target_id: null,
    confidence: 0.5,
    requires_human_review: true,
    proposal_ready: false
  };
}

function createWorkLogSuggestion(
  records: Record<string, unknown>[]
): HermesOperationalSuggestion | null {
  if (records.length === 0) {
    return null;
  }

  return {
    suggestion_type: "work_log_attention",
    source_type: "work_log",
    severity: "warning",
    title: "Work-log records require human inspection",
    summary:
      "Read-only work-log records are available, but this boundary does not automatically create, correct, or delete work records.",
    evidence: [
      `work_log_record_count:${records.length}`,
      "work_log_write_performed:false"
    ],
    target_type: "work_log",
    target_id: null,
    confidence: 0.5,
    requires_human_review: true,
    proposal_ready: false
  };
}

export function createHermesInventoryWorkLogSuggestions(
  input: HermesInventoryWorkLogSuggestionInput
): HermesInventoryWorkLogSuggestionResult {
  const blockers: string[] = [];
  const suggestions: HermesOperationalSuggestion[] = [];

  const inventoryValid =
    input.inventory.source_type === "inventory" &&
    (
      !input.inventory.available ||
      input.inventory.transaction_read_only
    );

  const workLogValid =
    input.workLog.source_type === "work_log" &&
    (
      !input.workLog.available ||
      input.workLog.transaction_read_only
    );

  if (!inventoryValid) {
    blockers.push(
      "inventory_source_not_read_only"
    );
  }

  if (!workLogValid) {
    blockers.push(
      "work_log_source_not_read_only"
    );
  }

  if (!input.inventory.available) {
    suggestions.push(
      createDataSourceGapSuggestion("inventory")
    );
  } else {
    const suggestion =
      createInventorySuggestion(
        input.inventory.records
      );

    if (suggestion) {
      suggestions.push(suggestion);
    }
  }

  if (!input.workLog.available) {
    suggestions.push(
      createDataSourceGapSuggestion("work_log")
    );
  } else {
    const suggestion =
      createWorkLogSuggestion(
        input.workLog.records
      );

    if (suggestion) {
      suggestions.push(suggestion);
    }
  }

  const actualInventoryAnalysisPerformed =
    input.inventory.available &&
    input.inventory.transaction_read_only &&
    input.inventory.records.length > 0;

  const actualWorkLogAnalysisPerformed =
    input.workLog.available &&
    input.workLog.transaction_read_only &&
    input.workLog.records.length > 0;

  const suggestionPreviewCreated =
    blockers.length === 0 &&
    suggestions.length > 0;

  return {
    result:
      blockers.length === 0
        ? "preview"
        : "blocked",
    checked:
      "hermes_inventory_work_log_suggestion_boundary",
    boundary:
      HERMES_INVENTORY_WORK_LOG_SUGGESTION_BOUNDARY,
    inventory_source_available:
      input.inventory.available,
    work_log_source_available:
      input.workLog.available,
    inventory_transaction_read_only:
      input.inventory.transaction_read_only,
    work_log_transaction_read_only:
      input.workLog.transaction_read_only,
    inventory_record_count:
      input.inventory.records.length,
    work_log_record_count:
      input.workLog.records.length,
    suggestions,
    actual_inventory_analysis_performed:
      actualInventoryAnalysisPerformed,
    actual_work_log_analysis_performed:
      actualWorkLogAnalysisPerformed,
    requires_human_review: true,
    suggestion_preview_created:
      suggestionPreviewCreated,
    suggestion_saved: false,
    proposal_saved: false,
    app_write_performed: false,
    audit_write_performed: false,
    database_write_performed: false,
    blockers
  };
}
