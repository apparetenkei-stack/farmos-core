import {
  buildHermesDailyFarmBriefProjectablePersistenceCommand,
} from "./hermes_daily_farm_brief_persistence_command_contract";
import {
  buildHermesDailyFarmBriefExecutionRoleProjection,
  buildHermesDailyFarmBriefExecutionScopeIndex,
  createHermesDailyFarmBriefExecutionRequest,
  executeHermesDailyFarmBriefGeneration,
} from "./hermes_daily_farm_brief_execution_adapter";
import { parseHermesDailyFarmBriefExecutionResult } from "./hermes_daily_farm_brief_execution_contract";
import { parseHermesDailyFarmBriefExecutionIntegrationBundle } from "./hermes_daily_farm_brief_integration";
import { orchestrateHermesDailyFarmBriefGeneration } from "./hermes_daily_farm_brief_generation_orchestrator";
import { isHermesDailyFarmBusinessDate, parseHermesDailyFarmBriefGenerationDecision } from "./hermes_daily_farm_brief_generation_contract";
import {
  parseHermesDailyFarmBriefLatestApiResponse,
  parseHermesDailyFarmBriefLatestReadSource,
} from "./hermes_daily_farm_brief_latest_api_contract";
import {
  parseHermesDailyFarmBriefPersistedRepositoryResult,
} from "./hermes_daily_farm_brief_persisted_record_contract";
import type { HermesDailyFarmBriefPersistedReadRepository } from "./hermes_daily_farm_brief_persisted_latest_source_boundary";
import { persistHermesDailyFarmBrief } from "./hermes_daily_farm_brief_persistence_write_boundary";
import type { HermesDailyFarmBriefPersistenceWriteRepository } from "./hermes_daily_farm_brief_persistence_write_boundary";
import {
  classifyHermesDailyFarmBriefDay114DatabaseTarget,
  HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
} from "./hermes_daily_farm_brief_postgres_persistence_boundary";
import { classifyHermesDailyFarmBriefDatabaseTarget, type HermesDailyFarmBriefActorDirectory, type HermesDailyFarmBriefServerAuthenticationProvider } from "./hermes_daily_farm_brief_production_readiness_contract";
import { createHermesDailyFarmBriefLatestServerDependencies } from "../../../src/lib/hermes/hermes_daily_farm_brief_latest_server_boundary";
import { serveHermesDailyFarmBriefLatestRead } from "./hermes_daily_farm_brief_latest_read_service";

export const HERMES_DAILY_FARM_BRIEF_DAY116_SAFETY = {
  isolated_database_connection_performed: true,
  isolated_database_read_performed: true,
  isolated_database_write_performed: true,
  production_database_connection_performed: false,
  production_database_read_performed: false,
  production_database_write_performed: false,
  production_migration_performed: false,
  production_rls_change_performed: false,
  production_role_change_performed: false,
  fixture_authentication_used: true,
  production_authentication_connected: false,
  production_actor_directory_connected: false,
  farming_application_changed: false,
  browser_input_accepted: false,
  browser_credential_accepted: false,
  client_role_override_allowed: false,
  client_scope_override_allowed: false,
  queue_operation_performed: false,
  worker_operation_performed: false,
  model_execution_performed: false,
  notification_performed: false,
  proposal_write_performed: false,
  audit_write_performed: false,
  scheduler_registered: false,
  retry_performed: false,
  secret_exposed: false,
  fail_closed: true,
} as const;

export type HermesDailyFarmBriefManualPersistReadE2EResult = {
  schema_version: "hermes.daily_farm_brief.manual_persist_read_e2e_result.v1";
  status: "completed" | "reused" | "rejected" | "failed_closed";
  stage: "request" | "decision" | "execution" | "persistence" | "authentication" | "latest_read" | "completed";
  business_date: string | null;
  generation_decision: "generate" | null;
  execution_status: "completed" | null;
  persistence_status: "persisted" | "reused" | null;
  http_status: number | null;
  latest_display_state: "current" | "stale" | "generation_in_progress" | "generation_failed" | "unavailable" | null;
  latest_role: "administrator" | "general_staff" | null;
  visible_scope_count: number | null;
  call_counts: { integration: number; scope: number; projection: number; persistence_transaction: number; repository_read: number };
  retry_count: 0;
  safety: typeof HERMES_DAILY_FARM_BRIEF_DAY116_SAFETY;
};

export type HermesDailyFarmBriefDay116IsolationEvidence = {
  schema_version: "hermes.daily_farm_brief.day116_isolation_evidence.v1";
  database_target: "farmos_core_day114_test";
  local_docker_container: true;
  local_socket: true;
  production_candidate: false;
};

export class HermesDailyFarmBriefBusinessDateBoundedReadRepository implements HermesDailyFarmBriefPersistedReadRepository {
  readCount = 0;
  constructor(private readonly repository: HermesDailyFarmBriefPersistedReadRepository, private readonly maximumBusinessDate: string) {}
  async readRecordCandidates(): Promise<unknown> {
    this.readCount += 1;
    const parsed = parseHermesDailyFarmBriefPersistedRepositoryResult(await this.repository.readRecordCandidates());
    if (parsed === null || parsed.status !== "ok") return null;
    return {
      ...parsed,
      records: parsed.records.filter((candidate) => typeof candidate === "object" && candidate !== null && !Array.isArray(candidate) && typeof (candidate as Record<string, unknown>).business_date === "string" && String((candidate as Record<string, unknown>).business_date) <= this.maximumBusinessDate),
    };
  }
}

type Input = {
  databaseTarget: unknown;
  verifyIsolation: () => Promise<unknown>;
  requestedAt: string;
  forceRegeneration: boolean;
  existingState: unknown | null;
  requestIdFactory: () => string;
  executionRequestedAt: string;
  executionIdFactory: () => string;
  executedAt: string;
  integrate: () => Promise<unknown>;
  expectedCurrentVersion: number | null;
  persistenceRequestedAt: string;
  persistenceClock: () => string;
  latestClock: () => string;
  commandIdFactory: () => string;
  recordIdFactory: (businessDate: string, recordKind: "projectable_brief") => string;
  writeRepository: HermesDailyFarmBriefPersistenceWriteRepository;
  readRepository: HermesDailyFarmBriefPersistedReadRepository & { readCount?: number };
  authenticationProvider: HermesDailyFarmBriefServerAuthenticationProvider;
  actorDirectory: HermesDailyFarmBriefActorDirectory;
  latestRequest?: Request;
};

function emptyCounts() { return { integration: 0, scope: 0, projection: 0, persistence_transaction: 0, repository_read: 0 }; }
function result(input: Partial<HermesDailyFarmBriefManualPersistReadE2EResult> & Pick<HermesDailyFarmBriefManualPersistReadE2EResult, "status" | "stage">): HermesDailyFarmBriefManualPersistReadE2EResult {
  return { schema_version: "hermes.daily_farm_brief.manual_persist_read_e2e_result.v1", business_date: null, generation_decision: null, execution_status: null, persistence_status: null, http_status: null, latest_display_state: null, latest_role: null, visible_scope_count: null, call_counts: emptyCounts(), retry_count: 0, safety: HERMES_DAILY_FARM_BRIEF_DAY116_SAFETY, ...input };
}
function isolationEvidence(value: unknown): value is HermesDailyFarmBriefDay116IsolationEvidence {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return Object.keys(item).length === 5 && item.schema_version === "hermes.daily_farm_brief.day116_isolation_evidence.v1" && item.database_target === HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE && item.local_docker_container === true && item.local_socket === true && item.production_candidate === false;
}

export function parseHermesDailyFarmBriefManualPersistReadE2EResult(value: unknown): HermesDailyFarmBriefManualPersistReadE2EResult | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const keys = ["schema_version", "status", "stage", "business_date", "generation_decision", "execution_status", "persistence_status", "http_status", "latest_display_state", "latest_role", "visible_scope_count", "call_counts", "retry_count", "safety"];
  if (Object.keys(item).length !== keys.length || !keys.every((key) => Object.hasOwn(item, key)) || item.schema_version !== "hermes.daily_farm_brief.manual_persist_read_e2e_result.v1" || !["completed", "reused", "rejected", "failed_closed"].includes(String(item.status)) || !["request", "decision", "execution", "persistence", "authentication", "latest_read", "completed"].includes(String(item.stage)) || item.retry_count !== 0) return null;
  if (typeof item.safety !== "object" || item.safety === null || Array.isArray(item.safety) || Object.keys(item.safety).length !== Object.keys(HERMES_DAILY_FARM_BRIEF_DAY116_SAFETY).length || !Object.entries(HERMES_DAILY_FARM_BRIEF_DAY116_SAFETY).every(([key, expected]) => (item.safety as Record<string, unknown>)[key] === expected)) return null;
  if ((item.business_date !== null && !isHermesDailyFarmBusinessDate(item.business_date)) || ![null, "generate"].includes(item.generation_decision as null | string) || ![null, "completed"].includes(item.execution_status as null | string) || ![null, "persisted", "reused"].includes(item.persistence_status as null | string) || (item.http_status !== null && (!Number.isInteger(item.http_status) || Number(item.http_status) < 100 || Number(item.http_status) > 599)) || ![null, "current", "stale", "generation_in_progress", "generation_failed", "unavailable"].includes(item.latest_display_state as null | string) || ![null, "administrator", "general_staff"].includes(item.latest_role as null | string) || (item.visible_scope_count !== null && (!Number.isInteger(item.visible_scope_count) || Number(item.visible_scope_count) < 0))) return null;
  if (typeof item.call_counts !== "object" || item.call_counts === null || Array.isArray(item.call_counts)) return null;
  const counts = item.call_counts as Record<string, unknown>; const countKeys = ["integration", "scope", "projection", "persistence_transaction", "repository_read"];
  if (Object.keys(counts).length !== countKeys.length || !countKeys.every((key) => Object.hasOwn(counts, key) && Number.isInteger(counts[key]) && Number(counts[key]) >= 0 && Number(counts[key]) <= 1)) return null;
  if (item.stage === "completed" && (item.http_status !== 200 || !["completed", "reused"].includes(String(item.status)) || item.generation_decision !== "generate" || item.execution_status !== "completed" || !["persisted", "reused"].includes(String(item.persistence_status)) || !["current", "stale", "generation_in_progress", "generation_failed", "unavailable"].includes(String(item.latest_display_state)) || !["administrator", "general_staff"].includes(String(item.latest_role)) || !Number.isInteger(item.visible_scope_count))) return null;
  return item as HermesDailyFarmBriefManualPersistReadE2EResult;
}

export async function runHermesDailyFarmBriefManualPersistReadE2E(input: Input): Promise<HermesDailyFarmBriefManualPersistReadE2EResult> {
  const counts = emptyCounts();
  if (!classifyHermesDailyFarmBriefDay114DatabaseTarget(input.databaseTarget).allowed || classifyHermesDailyFarmBriefDatabaseTarget(input.databaseTarget) === "production_candidate") return result({ status: "rejected", stage: "request", call_counts: counts });
  let evidence: unknown;
  try { evidence = await input.verifyIsolation(); } catch { return result({ status: "failed_closed", stage: "request", call_counts: counts }); }
  if (!isolationEvidence(evidence)) return result({ status: "rejected", stage: "request", call_counts: counts });

  const decision = parseHermesDailyFarmBriefGenerationDecision(orchestrateHermesDailyFarmBriefGeneration({ requestCreation: { triggerType: "manual", requestedAt: input.requestedAt, actorRole: "administrator", authorizationVerified: true, serverForceRegenerationAllowed: input.forceRegeneration, requestIdFactory: input.requestIdFactory }, existingState: input.existingState }));
  if (decision === null) return result({ status: "rejected", stage: "request", call_counts: counts });
  if (decision.decision !== "generate" || !decision.should_execute_generation) return result({ status: "rejected", stage: "decision", business_date: decision.request.business_date, call_counts: counts });
  const executionRequest = createHermesDailyFarmBriefExecutionRequest({ generationDecision: decision, roleProjectionTarget: "administrator", allowedScopeKeys: [], clock: () => input.executionRequestedAt, executionIdFactory: input.executionIdFactory });
  if (executionRequest === null) return result({ status: "failed_closed", stage: "execution", business_date: decision.request.business_date, generation_decision: "generate", call_counts: counts });

  let capturedBundle: ReturnType<typeof parseHermesDailyFarmBriefExecutionIntegrationBundle> = null;
  let capturedScope: unknown = null;
  const execution = parseHermesDailyFarmBriefExecutionResult(await executeHermesDailyFarmBriefGeneration({ executionRequest, dependencies: {
    integrate: async () => { counts.integration += 1; capturedBundle = parseHermesDailyFarmBriefExecutionIntegrationBundle(await input.integrate()); return capturedBundle; },
    buildScopeIndex: (value) => { counts.scope += 1; capturedScope = buildHermesDailyFarmBriefExecutionScopeIndex(value); return capturedScope; },
    buildRoleProjection: (value) => { counts.projection += 1; return buildHermesDailyFarmBriefExecutionRoleProjection(value); },
    clock: () => input.executedAt,
  } }));
  if (execution === null || execution.status !== "completed" || capturedBundle === null || capturedScope === null) return result({ status: "failed_closed", stage: "execution", business_date: decision.request.business_date, generation_decision: "generate", call_counts: counts });
  const source = parseHermesDailyFarmBriefLatestReadSource({ schema_version: "hermes.daily_farm_brief.latest_read_source.v1", source_kind: "projectable_brief", business_date: decision.request.business_date, scope_index: capturedScope, snapshot: capturedBundle.integration_result.snapshot, generation_state: null });
  const command = source === null ? null : buildHermesDailyFarmBriefProjectablePersistenceCommand({ executionResult: execution, latestSource: source, expectedCurrentVersion: input.expectedCurrentVersion, requestedAt: input.persistenceRequestedAt, commandIdFactory: input.commandIdFactory, recordIdFactory: input.recordIdFactory });
  if (command === null) return result({ status: "failed_closed", stage: "persistence", business_date: decision.request.business_date, generation_decision: "generate", execution_status: "completed", call_counts: counts });
  const persistence = await persistHermesDailyFarmBrief({ command, repository: input.writeRepository, clock: input.persistenceClock });
  counts.persistence_transaction = persistence.repository_transaction_call_count;
  if (!['persisted', 'reused'].includes(persistence.status)) return result({ status: persistence.status === "rejected" ? "rejected" : "failed_closed", stage: "persistence", business_date: decision.request.business_date, generation_decision: "generate", execution_status: "completed", call_counts: counts });

  const dependencies = createHermesDailyFarmBriefLatestServerDependencies({ authenticationProvider: input.authenticationProvider, actorDirectory: input.actorDirectory, readRepository: input.readRepository, clock: input.latestClock });
  const response = await serveHermesDailyFarmBriefLatestRead({ request: input.latestRequest ?? new Request("http://localhost/api/hermes/daily-farm-brief/latest"), dependencies });
  counts.repository_read = input.readRepository.readCount ?? 0;
  let body: unknown = null; try { body = await response.json(); } catch { /* fail closed */ }
  const parsed = parseHermesDailyFarmBriefLatestApiResponse(body);
  if (response.status !== 200 || response.headers.get("cache-control") !== "no-store" || parsed === null || parsed.result !== "ok" || parsed.latest === null) return result({ status: "failed_closed", stage: response.status === 401 || response.status === 403 ? "authentication" : "latest_read", business_date: decision.request.business_date, generation_decision: "generate", execution_status: "completed", persistence_status: persistence.status, http_status: response.status, call_counts: counts });
  return result({ status: persistence.status === "reused" ? "reused" : "completed", stage: "completed", business_date: decision.request.business_date, generation_decision: "generate", execution_status: "completed", persistence_status: persistence.status, http_status: 200, latest_display_state: parsed.latest.display_state, latest_role: parsed.latest.role, visible_scope_count: parsed.latest.visible_scope_count, call_counts: counts });
}
