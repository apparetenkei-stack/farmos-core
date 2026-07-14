export const HERMES_DAILY_FARM_BRIEF_TIMEZONE = "Asia/Tokyo" as const;

export const HERMES_DAILY_FARM_BRIEF_GENERATION_POLICY = {
  schema_version: "hermes.daily_farm_brief.generation_policy.v1" as const,
  timezone: HERMES_DAILY_FARM_BRIEF_TIMEZONE,
  schedule: {
    status: "not_configured" as const,
    scheduled_local_time: null,
    allowed_lateness_minutes: null,
  },
  maximum_scheduled_retry_count: 1,
  generated_brief_stale_after_ms: 24 * 60 * 60 * 1_000,
  source: "server_policy" as const,
  safety: {
    client_business_date_override_allowed: false,
    client_timezone_override_allowed: false,
    client_role_override_allowed: false,
    client_force_override_allowed: false,
    client_retry_override_allowed: false,
    scheduler_registration_allowed: false,
    database_write_allowed: false,
    brief_persistence_allowed: false,
    notification_allowed: false,
    queue_operation_allowed: false,
    worker_claim_allowed: false,
    model_execution_allowed: false,
    external_fetch_allowed: false,
    fail_closed: true,
  },
} as const;

export type HermesDailyFarmBriefServerSchedule = {
  scheduled_local_time: `${number}${number}:${number}${number}`;
  allowed_lateness_minutes: number;
};

