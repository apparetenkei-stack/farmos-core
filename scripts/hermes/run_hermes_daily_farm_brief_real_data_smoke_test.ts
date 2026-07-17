import { readHermesOperationalReadonlySources } from "../../src/lib/hermes/hermes_operational_readonly_client";
import { readHermesMemoryContext } from "./api_boundary/hermes_memory_context_read_boundary";
import {
  buildHermesDailyFarmBriefExecutionRoleProjection,
  buildHermesDailyFarmBriefExecutionScopeIndex,
  createHermesDailyFarmBriefLatestCandidateFromRoleProjection,
} from "./brief_runtime/hermes_daily_farm_brief_execution_adapter";
import { deriveHermesDailyFarmBusinessDate } from "./brief_runtime/hermes_daily_farm_brief_generation_contract";
import { integrateHermesDailyFarmBriefExecutionBundle } from "./brief_runtime/hermes_daily_farm_brief_integration";

try { process.loadEnvFile(".env.local"); } catch { /* Existing environment remains authoritative. */ }

const enabled =
  process.env.HERMES_DAILY_FARM_BRIEF_REAL_DATA_SMOKE_ENABLED === "true";

if (!enabled) {
  console.log(
    JSON.stringify(
      {
        result: "skipped",
        reason: "real_data_smoke_not_enabled",
        real_data_preview: "not_executed_environment_unavailable",
        external_read_performed: false,
        database_write_performed: false,
        notification_performed: false,
        model_execution_performed: false,
        secret_exposed: false,
      },
      null,
      2,
    ),
  );
} else {
  try {
    const [operationalResult, memoryContext] = await Promise.all([
      readHermesOperationalReadonlySources(),
      readHermesMemoryContext(),
    ]);
    const bundle = await integrateHermesDailyFarmBriefExecutionBundle({
      readOperationalSources: async () => operationalResult,
      readMemoryContext: async () => memoryContext,
      timezone: "Asia/Tokyo",
    });
    const result = bundle.integration_result;
    const scopeIndex = buildHermesDailyFarmBriefExecutionScopeIndex({ snapshot: result.snapshot, brief: result.brief, scopeReferenceInput: bundle.scope_reference_input });
    const projection = buildHermesDailyFarmBriefExecutionRoleProjection({ scopeIndex, snapshot: result.snapshot, role: "administrator", allowedScopeKeys: [] });
    const businessDate = deriveHermesDailyFarmBusinessDate(result.safe_preview.generated_at);
    const candidate = businessDate === null ? null : createHermesDailyFarmBriefLatestCandidateFromRoleProjection({ businessDate, roleProjection: projection });
    if (candidate === null || (candidate.display_state !== "current" && candidate.display_state !== "stale")) throw new Error("preview_projection_failed");

    const operationalDiagnostics = Object.fromEntries([
      operationalResult.inventory,
      operationalResult.work_log,
      operationalResult.field,
      operationalResult.crop_cycle,
    ].map((source) => [source.source_type, {
      endpoint_path: source.endpoint_path,
      fetch_performed: source.fetch_performed,
      http_status: source.http_status,
      result: source.result,
      error_code: source.error_code,
      available: source.available,
      record_count: source.record_count,
      response_source: source.response_source,
      transaction_read_only: source.transaction_read_only,
      write_performed: source.write_performed,
      credentials_exposed: source.credentials_exposed,
      ...((source.source_type === "field" || source.source_type === "crop_cycle")
        ? { response_contract: source.response_contract_diagnostics ?? {
            top_level_keys: [],
            top_level_types: {},
            safety_keys: [],
            safety_types: {},
            first_record_keys: [],
            first_record_types: {},
            validator_failure_reason: source.error_code === "invalid_response" ? "invalid_top_level_keys" : null,
          } }
        : {}),
    }]));
    const sources = Object.fromEntries(result.safe_preview.sources.map((source) => [source.source_type, {
      availability: source.status === "available" || source.status === "empty" ? "available" : "unavailable",
      status: source.status,
      count: source.record_count,
      freshness: source.freshness,
      ...(operationalDiagnostics[source.source_type] ?? {}),
    }]));
    const requiredOperationalSources = ["inventory", "work_log", "field", "crop_cycle"];
    const operationalSourcesNormalized = requiredOperationalSources.every((sourceType) => (sources[sourceType] as { availability?: string } | undefined)?.availability === "available");

    console.log(JSON.stringify({
      result: operationalSourcesNormalized ? "ok" : "failed_closed",
      real_data_preview: "executed_read_only",
      sources,
      overall_display_state: candidate.display_state,
      external_read_performed: true,
      database_write_performed: result.safe_preview.safety.database_write_performed,
      brief_persistence_performed: result.safe_preview.safety.brief_persistence_performed,
      proposal_write_performed: result.safe_preview.safety.proposal_created || result.safe_preview.safety.proposal_saved || result.safe_preview.safety.proposal_apply_performed,
      model_execution_performed: result.safe_preview.safety.model_execution_performed,
      secret_exposed: result.safe_preview.safety.secret_exposed,
    }, null, 2));
    if (!operationalSourcesNormalized) process.exitCode = 1;
  } catch {
    console.log(JSON.stringify({
      result: "failed_closed",
      real_data_preview: "execution_failed",
      database_write_performed: false,
      brief_persistence_performed: false,
      proposal_write_performed: false,
      model_execution_performed: false,
      secret_exposed: false,
    }, null, 2));
    process.exitCode = 1;
  }
}
