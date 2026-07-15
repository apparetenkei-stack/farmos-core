import type { HermesOperationalReadonlyClientResult } from "../../src/lib/hermes/hermes_operational_readonly_client";
import { buildHermesDailyFarmBrief } from "./brief_runtime/hermes_daily_farm_brief_builder";
import { serveHermesDailyFarmBriefLatestRead } from "./brief_runtime/hermes_daily_farm_brief_latest_read_service";
import { buildHermesDailyFarmBriefScopeIndex } from "./brief_runtime/hermes_daily_farm_brief_scope_builder";
import { createHermesDailyFarmSnapshot } from "./brief_runtime/hermes_daily_farm_snapshot_adapter";

const NOW = "2026-07-15T00:00:00.000Z";

function source(type: "inventory" | "work_log") {
  return { result: "ok" as const, source_type: type, endpoint_path: type === "inventory" ? ("/api/farmos-core/inventory-summary" as const) : ("/api/farmos-core/recent-work-logs" as const), http_method: "GET" as const, fetch_performed: false, available: true, transaction_read_only: true as const, requested_limit: 100, http_status: 200, response_source: type === "inventory" ? ("apparetenkei_inventory_readonly" as const) : ("apparetenkei_work_logs_readonly" as const), generated_at: "2026-07-14T23:00:00.000Z", record_count: 0, records: [], has_more: false, error_code: null, write_performed: false as const, restricted_fields_exposed: false as const, credentials_exposed: false as const };
}

function latestSourceFixture() {
  const operational: HermesOperationalReadonlyClientResult = {
    result: "ok", checked: "hermes_operational_readonly_client", boundary: "day92_hermes_operational_readonly_client", inventory: source("inventory"), work_log: source("work_log"), inventory_source_connected: true, work_log_source_connected: true, external_fetch_performed: false, hermes_context_injection_performed: false, suggestion_generation_performed: false, proposal_created: false, proposal_saved: false, proposal_apply_performed: false, app_db_write_performed: false, core_db_write_performed: false, audit_write_performed: false, database_write_performed: false, credentials_exposed: false, arbitrary_endpoint_allowed: false, arbitrary_method_allowed: false,
  };
  const snapshot = createHermesDailyFarmSnapshot({ operationalSources: operational, memory: { crop_cycles: [], hermes_notes: [], crop_cycle_generated_at: null, hermes_note_generated_at: null }, nowIso: NOW, snapshotIdFactory: () => "preview-snapshot-day111" });
  const brief = buildHermesDailyFarmBrief({ snapshot, generatedAt: NOW, briefIdFactory: () => "preview-brief-day111", factIdFactory: (index) => `preview-fact-day111-${index}` }).brief;
  const scopeIndex = buildHermesDailyFarmBriefScopeIndex({ snapshot, brief, generatedAt: NOW, timezone: "Asia/Tokyo", workLogs: [], cropCycles: [] });
  return { schema_version: "hermes.daily_farm_brief.latest_read_source.v1", source_kind: "projectable_brief", business_date: "2026-07-15", scope_index: scopeIndex, snapshot, generation_state: null };
}

async function main(): Promise<void> {
  let sourceCalls = 0;
  const latestSource = latestSourceFixture();
  const response = await serveHermesDailyFarmBriefLatestRead({
    request: new Request("http://localhost/api/hermes/daily-farm-brief/latest"),
    dependencies: {
      authenticate: async () => ({ schema_version: "hermes.daily_farm_brief.authentication_result.v1", status: "authenticated", principal_ref: "preview-actor" }),
      resolveActorContext: async () => ({ schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: "preview-actor", role: "general_staff", allowed_scope_keys: [], authorization_verified: true }),
      readLatestSource: async () => { sourceCalls += 1; return latestSource; },
      clock: () => NOW,
    },
  });
  const body = await response.json() as { latest?: { display_state?: string; visible_scope_count?: number } };
  console.log(JSON.stringify({
    boundary: "hermes_daily_farm_brief_authenticated_latest_read_api_preview",
    http_status: response.status,
    cache_control: response.headers.get("cache-control"),
    display_state: body.latest?.display_state ?? null,
    visible_scope_count: body.latest?.visible_scope_count ?? null,
    source_reader_calls: sourceCalls,
    fixture_only: true,
    database_write_performed: false,
    raw_identifier_exposed: false,
    raw_record_exposed: false,
    raw_fact_exposed: false,
    secret_exposed: false,
  }));
}

main().catch(() => {
  console.error("day111_preview_failed");
  process.exitCode = 1;
});
