import type {
  HermesDailyFarmFreshness,
  HermesDailyFarmSourceType,
} from "./hermes_daily_farm_brief_policy";

export type HermesDailyFarmSourceStatus =
  | "available"
  | "empty"
  | "unavailable"
  | "invalid";

export type HermesDailyFarmInventoryRecord = {
  id: string | null;
  base_type: string | null;
  current_quantity: string | number | null;
  unit: string | null;
};

export type HermesDailyFarmWorkLogRecord = {
  id: string | null;
  started_at: string | null;
  field_id: string | null;
  work_type_name: string | null;
  duration_minutes: string | number | null;
  target_crop: string | null;
};

export type HermesDailyFarmMemoryRecord = {
  id: string | null;
  label: string | null;
  status: string | null;
  source_timestamp: string | null;
};

export type HermesDailyFarmSource<T> = {
  source_type: HermesDailyFarmSourceType;
  status: HermesDailyFarmSourceStatus;
  available: boolean;
  generated_at: string | null;
  freshness: HermesDailyFarmFreshness;
  record_count: number;
  records: T[];
  truncated: boolean;
  limitations: string[];
};

export type HermesDailyFarmSnapshot = {
  schema_version: "hermes.daily_farm_snapshot.v1";
  snapshot_id: string;
  generated_at: string;
  status: "ready" | "partial" | "unavailable";
  sources: {
    inventory: HermesDailyFarmSource<HermesDailyFarmInventoryRecord>;
    work_log: HermesDailyFarmSource<HermesDailyFarmWorkLogRecord>;
    field: HermesDailyFarmSource<never>;
    crop_cycle: HermesDailyFarmSource<HermesDailyFarmMemoryRecord>;
    hermes_note: HermesDailyFarmSource<HermesDailyFarmMemoryRecord>;
  };
  limitations: string[];
  safety: {
    transaction_read_only: true;
    external_fetch_performed: false;
    database_write_performed: false;
    proposal_write_performed: false;
    model_execution_performed: false;
    secret_exposed: false;
    fail_closed: true;
  };
};
