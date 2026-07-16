import type {
  HermesDailyFarmSourceType,
} from "./hermes_daily_farm_brief_policy";
import type {
  HermesDailyFarmSnapshot,
} from "./hermes_daily_farm_snapshot_contract";
import type { HermesDailyFarmBriefSourceSelectionCoverage } from "./hermes_daily_farm_brief_source_coverage_contract";

export type HermesDailyFarmBriefFactCode =
  | "source_empty"
  | "source_stale"
  | "source_unavailable"
  | "source_unknown"
  | "inventory_quantity_zero"
  | "inventory_quantity_unknown"
  | "inventory_unit_unknown"
  | "work_log_started_at_missing"
  | "work_log_started_at_invalid";

export type HermesDailyFarmBriefFact = {
  schema_version: "hermes.daily_farm_brief.fact.v1";
  fact_id: string;
  severity: "warning" | "info";
  category:
    | "source_state"
    | "inventory_observation"
    | "work_log_observation";
  fact_code: HermesDailyFarmBriefFactCode;
  source_type: HermesDailyFarmSourceType;
  source_record_id: string | null;
  summary: string;
  observed_at: string | null;
  provenance: {
    snapshot_id: string;
    source_type: HermesDailyFarmSourceType;
    source_generated_at: string | null;
    source_record_id: string | null;
  };
};

export type HermesDailyFarmBriefSourceSummary =
  HermesDailyFarmBriefSourceSelectionCoverage & {
  /** Day106 compatibility alias; equal to source_record_count. */
  record_count: number;
};

export type HermesDailyFarmBrief = {
  schema_version: "hermes.daily_farm_brief.v1";
  brief_id: string;
  snapshot_id: string;
  generated_at: string;
  status: "ready" | "partial" | "unavailable";
  facts: HermesDailyFarmBriefFact[];
  source_summary: HermesDailyFarmBriefSourceSummary[];
  limitations: string[];
  requires_human_review: true;
  safety: {
    snapshot_read_only: true;
    external_fetch_performed: false;
    database_write_performed: false;
    proposal_write_performed: false;
    audit_write_performed: false;
    model_execution_performed: false;
    notification_performed: false;
    fail_closed: true;
  };
};

export type HermesDailyFarmBriefSafeSummary = Pick<
  HermesDailyFarmBrief,
  | "brief_id"
  | "snapshot_id"
  | "generated_at"
  | "status"
  | "source_summary"
  | "limitations"
  | "requires_human_review"
> & {
  fact_count: number;
  warning_count: number;
  info_count: number;
};

export type HermesDailyFarmBriefBuildResult = {
  snapshot: HermesDailyFarmSnapshot;
  brief: HermesDailyFarmBrief;
  summary: HermesDailyFarmBriefSafeSummary;
};
