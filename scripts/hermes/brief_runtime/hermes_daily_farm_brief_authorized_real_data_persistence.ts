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
import {
  integrateHermesDailyFarmBriefExecutionBundle,
  parseHermesDailyFarmBriefExecutionIntegrationBundle,
} from "./hermes_daily_farm_brief_integration";
import {
  isCanonicalIso,
  isHermesDailyFarmBusinessDate,
} from "./hermes_daily_farm_brief_generation_contract";
import { orchestrateHermesDailyFarmBriefGeneration } from "./hermes_daily_farm_brief_generation_orchestrator";
import {
  parseHermesDailyFarmBriefLatestReadSource,
  type HermesDailyFarmBriefAuthenticatedActorContext,
} from "./hermes_daily_farm_brief_latest_api_contract";
import { parseHermesDailyFarmBriefLatestDisplayApiResponse } from "./hermes_daily_farm_brief_latest_display_api_contract";
import { serveHermesDailyFarmBriefLatestDisplay } from "./hermes_daily_farm_brief_latest_display_service";
import {
  readHermesDailyFarmBriefPersistedLatestSource,
} from "./hermes_daily_farm_brief_persisted_latest_source_boundary";
import {
  persistHermesDailyFarmBrief,
} from "./hermes_daily_farm_brief_persistence_write_boundary";
import type { HermesDailyFarmBriefSourceSelectionCoverage } from "./hermes_daily_farm_brief_source_coverage_contract";
import type { HermesDailyFarmBriefWriteReadinessClassification } from "./hermes_daily_farm_brief_production_write_readiness_contract";
import {
  inspectHermesDailyFarmBriefRepositoryBundle,
  type HermesDailyFarmBriefRepositoryBundle,
} from "../../../src/lib/hermes/hermes_daily_farm_brief_production_repository_bundle";

export const HERMES_DAILY_FARM_BRIEF_REAL_DATA_PERSISTENCE_ENV = {
  enabled: "HERMES_DAILY_FARM_BRIEF_REAL_DATA_PERSISTENCE_ENABLED",
  confirmation: "HERMES_DAILY_FARM_BRIEF_REAL_DATA_PERSISTENCE_CONFIRMATION",
  generatedAt: "HERMES_DAILY_FARM_BRIEF_REAL_DATA_PERSISTENCE_GENERATED_AT",
} as const;

export const HERMES_DAILY_FARM_BRIEF_REAL_DATA_PERSISTENCE_CONFIRMATION_VALUE =
  "confirm-day123-one-shot";

export const HERMES_DAILY_FARM_BRIEF_REAL_DATA_PERSISTENCE_SAFETY = {
  server_owned_actor: true,
  explicit_authorization_required: true,
  repository_identity_required: true,
  application_database_write_performed: false,
  business_database_write_performed: false,
  proposal_saved: false,
  proposal_apply_performed: false,
  model_execution_performed: false,
  migration_performed: false,
  rls_change_performed: false,
  retry_performed: false,
  raw_identifier_exposed: false,
  raw_record_exposed: false,
  secret_exposed: false,
  fail_closed: true,
} as const;

export type HermesDailyFarmBriefPreparedRealDataPersistence = {
  execution_result: NonNullable<ReturnType<typeof parseHermesDailyFarmBriefExecutionResult>>;
  latest_source: Extract<NonNullable<ReturnType<typeof parseHermesDailyFarmBriefLatestReadSource>>, { source_kind: "projectable_brief" }>;
  brief_status: "ready" | "partial" | "unavailable";
  source_coverage: HermesDailyFarmBriefSourceSelectionCoverage[];
  relation_validation: "passed" | "failed_closed";
  call_counts: { operational_read: 1; memory_read: 1; scope_build: 1; role_projection: 1 };
};

export type HermesDailyFarmBriefAuthorizedRealDataPersistenceResult = {
  schema_version: "hermes.daily_farm_brief.authorized_real_data_persistence_result.v1";
  result: "preflight" | "inserted" | "reused" | "rejected" | "failed_closed";
  stage: "configuration" | "date" | "repository_identity" | "generation" | "persistence" | "read_after_write" | "completed";
  target_date: string;
  generated_at: string | null;
  brief_status: "ready" | "partial" | "unavailable" | null;
  source_coverage: HermesDailyFarmBriefSourceSelectionCoverage[];
  relation_validation: "passed" | "failed_closed" | "not_checked";
  target_repository_identity_check: "matched" | "not_matched";
  persistence_enabled: boolean;
  current_version_resolution: "not_run" | "resolved" | "failed_closed";
  expected_current_version: number | null;
  read_after_write: "pass" | "not_run";
  latest_selector: "pass" | "not_run";
  latest_display_projection: "pass" | "not_run";
  administrator_display_state: "current" | "stale" | null;
  general_staff_counts_redacted: boolean | null;
  call_counts: {
    operational_read: 0 | 1;
    memory_read: 0 | 1;
    scope_build: 0 | 1;
    role_projection: 0 | 1;
    persistence_transaction: 0 | 1;
    repository_read: 0 | 1;
  };
  database_write_performed: boolean;
  transaction_committed: boolean;
  persistence_failure_code: HermesDailyFarmBriefWriteReadinessClassification | null;
  safety: typeof HERMES_DAILY_FARM_BRIEF_REAL_DATA_PERSISTENCE_SAFETY;
};

type PrepareInput = {
  targetDate: string;
  generatedAt: string;
  readOperationalSources: () => Promise<unknown>;
  readMemoryContext: () => Promise<unknown>;
};

export async function prepareHermesDailyFarmBriefRealDataPersistence(input: PrepareInput): Promise<HermesDailyFarmBriefPreparedRealDataPersistence | null> {
  if (!isHermesDailyFarmBusinessDate(input.targetDate) || !isCanonicalIso(input.generatedAt)) return null;
  const requestedDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(input.generatedAt));
  if (requestedDate !== input.targetDate) return null;
  const decision = orchestrateHermesDailyFarmBriefGeneration({ requestCreation: { triggerType: "manual", requestedAt: input.generatedAt, actorRole: "administrator", authorizationVerified: true, serverForceRegenerationAllowed: true, requestIdFactory: () => `day123-real-request-${input.targetDate}` }, existingState: null });
  if (decision === null || decision.decision !== "generate" || decision.request.business_date !== input.targetDate) return null;
  const request = createHermesDailyFarmBriefExecutionRequest({ generationDecision: decision, roleProjectionTarget: "administrator", allowedScopeKeys: [], clock: () => input.generatedAt, executionIdFactory: () => `day123-real-execution-${input.targetDate}` });
  if (request === null) return null;
  let operationalRead = 0;
  let memoryRead = 0;
  let scopeBuild = 0;
  let roleProjection = 0;
  let bundle: ReturnType<typeof parseHermesDailyFarmBriefExecutionIntegrationBundle> = null;
  let scopeIndex: unknown = null;
  const execution = parseHermesDailyFarmBriefExecutionResult(await executeHermesDailyFarmBriefGeneration({ executionRequest: request, dependencies: {
    integrate: async () => {
      bundle = parseHermesDailyFarmBriefExecutionIntegrationBundle(await integrateHermesDailyFarmBriefExecutionBundle({
        readOperationalSources: async () => { operationalRead += 1; return input.readOperationalSources(); },
        readMemoryContext: async () => { memoryRead += 1; return input.readMemoryContext(); },
        now: () => input.generatedAt,
        timezone: "Asia/Tokyo",
        snapshotIdFactory: () => `day123-real-snapshot-${input.targetDate}`,
        briefIdFactory: () => `day123-real-brief-${input.targetDate}`,
        factIdFactory: (index) => `day123-real-fact-${input.targetDate}-${index}`,
      }));
      return bundle;
    },
    buildScopeIndex: (value) => { scopeBuild += 1; scopeIndex = buildHermesDailyFarmBriefExecutionScopeIndex(value); return scopeIndex; },
    buildRoleProjection: (value) => { roleProjection += 1; return buildHermesDailyFarmBriefExecutionRoleProjection(value); },
    clock: () => input.generatedAt,
  } }));
  if (execution === null || execution.status !== "completed" || bundle === null || scopeIndex === null || operationalRead !== 1 || memoryRead !== 1 || scopeBuild !== 1 || roleProjection !== 1) return null;
  const source = parseHermesDailyFarmBriefLatestReadSource({ schema_version: "hermes.daily_farm_brief.latest_read_source.v1", source_kind: "projectable_brief", business_date: input.targetDate, scope_index: scopeIndex, snapshot: bundle.integration_result.snapshot, generation_state: null });
  if (source === null || source.source_kind !== "projectable_brief") return null;
  return {
    execution_result: execution,
    latest_source: source,
    brief_status: bundle.integration_result.brief.status,
    source_coverage: structuredClone(bundle.integration_result.safe_preview.source_coverage),
    relation_validation:
      (source.snapshot.sources.field.status === "available" || source.snapshot.sources.field.status === "empty") &&
      (source.snapshot.sources.crop_cycle.status === "available" || source.snapshot.sources.crop_cycle.status === "empty")
        ? "passed"
        : "failed_closed",
    call_counts: { operational_read: 1, memory_read: 1, scope_build: 1, role_projection: 1 },
  };
}

type RunInput = {
  mode: "dry_run" | "persist";
  environment: Readonly<Record<string, string | undefined>>;
  targetDate: "2026-07-17";
  generatedAt: string;
  prepare: () => Promise<HermesDailyFarmBriefPreparedRealDataPersistence | null>;
  repositoryBundle: HermesDailyFarmBriefRepositoryBundle;
  administratorActor: HermesDailyFarmBriefAuthenticatedActorContext;
  generalStaffActor: HermesDailyFarmBriefAuthenticatedActorContext;
};

function base(input: RunInput, partial: Partial<HermesDailyFarmBriefAuthorizedRealDataPersistenceResult> = {}): HermesDailyFarmBriefAuthorizedRealDataPersistenceResult {
  return {
    schema_version: "hermes.daily_farm_brief.authorized_real_data_persistence_result.v1",
    result: "rejected",
    stage: "configuration",
    target_date: input.targetDate,
    generated_at: null,
    brief_status: null,
    source_coverage: [],
    relation_validation: "not_checked",
    target_repository_identity_check: "not_matched",
    persistence_enabled: false,
    current_version_resolution: "not_run",
    expected_current_version: null,
    read_after_write: "not_run",
    latest_selector: "not_run",
    latest_display_projection: "not_run",
    administrator_display_state: null,
    general_staff_counts_redacted: null,
    call_counts: { operational_read: 0, memory_read: 0, scope_build: 0, role_projection: 0, persistence_transaction: 0, repository_read: 0 },
    database_write_performed: false,
    transaction_committed: false,
    persistence_failure_code: null,
    safety: HERMES_DAILY_FARM_BRIEF_REAL_DATA_PERSISTENCE_SAFETY,
    ...partial,
  };
}

export function buildHermesDailyFarmBriefAuthorizedRealDataPersistenceCommand(input: {
  prepared: HermesDailyFarmBriefPreparedRealDataPersistence;
  targetDate: "2026-07-17";
  generatedAt: string;
  expectedCurrentVersion: number | null;
}) {
  return buildHermesDailyFarmBriefProjectablePersistenceCommand({
    executionResult: input.prepared.execution_result,
    latestSource: input.prepared.latest_source,
    expectedCurrentVersion: input.expectedCurrentVersion,
    requestedAt: input.generatedAt,
    commandIdFactory: () => `day123-real-command-${input.targetDate}`,
    recordIdFactory: (date) => `daily-farm-brief-${date}-projectable`,
  });
}

function safePersistenceFailureCode(error: string | null): HermesDailyFarmBriefWriteReadinessClassification {
  if (error === "version_conflict" || error === "concurrency_conflict" || error === "invalid_existing_chain" || error === "idempotency_conflict" || error === "source_execution_conflict") return "existing_record_conflict";
  if (error === "invalid_command" || error === "invalid_record" || error === "future_timestamp" || error === "invalid_repository_result") return "command_invalid";
  return "unknown_failure";
}

function actorValid(actor: HermesDailyFarmBriefAuthenticatedActorContext, role: "administrator" | "general_staff"): boolean {
  return actor.role === role && actor.authorization_verified === true && (role !== "administrator" || actor.allowed_scope_keys.length === 0);
}

export async function runHermesDailyFarmBriefAuthorizedRealDataPersistence(input: RunInput): Promise<HermesDailyFarmBriefAuthorizedRealDataPersistenceResult> {
  const dateAtRun = isCanonicalIso(input.generatedAt) ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(input.generatedAt)) : null;
  if (dateAtRun !== input.targetDate) return base(input, { stage: "date" });
  const identity = inspectHermesDailyFarmBriefRepositoryBundle(input.repositoryBundle);
  const matched = identity.matched;
  const enabled = input.environment[HERMES_DAILY_FARM_BRIEF_REAL_DATA_PERSISTENCE_ENV.enabled] === "true" && input.environment[HERMES_DAILY_FARM_BRIEF_REAL_DATA_PERSISTENCE_ENV.confirmation] === HERMES_DAILY_FARM_BRIEF_REAL_DATA_PERSISTENCE_CONFIRMATION_VALUE && identity.write_capability === "enabled";
  const prepared = await input.prepare();
  if (prepared === null || prepared.latest_source.business_date !== input.targetDate || prepared.latest_source.snapshot.generated_at !== input.generatedAt) return base(input, { stage: "generation", target_repository_identity_check: matched ? "matched" : "not_matched", persistence_enabled: enabled });
  const preflight = base(input, {
    result: "preflight",
    stage: matched ? "completed" : "repository_identity",
    generated_at: input.generatedAt,
    brief_status: prepared.brief_status,
    source_coverage: prepared.source_coverage,
    relation_validation: prepared.relation_validation,
    target_repository_identity_check: matched ? "matched" : "not_matched",
    persistence_enabled: enabled,
    call_counts: { ...prepared.call_counts, persistence_transaction: 0, repository_read: 0 },
  });
  if (input.mode === "dry_run" || !enabled || !matched) return preflight;
  if (!actorValid(input.administratorActor, "administrator") || !actorValid(input.generalStaffActor, "general_staff")) return { ...preflight, result: "rejected", stage: "configuration" };
  const currentVersionResolution = await input.repositoryBundle.resolveCanonicalCurrentVersion(input.targetDate);
  if (currentVersionResolution.status !== "resolved") return { ...preflight, result: "failed_closed", stage: "persistence", current_version_resolution: "failed_closed", persistence_failure_code: "unknown_failure" };
  const expectedCurrentVersion = currentVersionResolution.current_version;
  const resolvedPreflight = { ...preflight, current_version_resolution: "resolved" as const, expected_current_version: expectedCurrentVersion };
  const command = buildHermesDailyFarmBriefAuthorizedRealDataPersistenceCommand({ prepared, targetDate: input.targetDate, generatedAt: input.generatedAt, expectedCurrentVersion });
  if (command === null) return { ...resolvedPreflight, result: "failed_closed", stage: "persistence", persistence_failure_code: "command_invalid" };
  if (identity.write_kind === "database") {
    const readiness = await input.repositoryBundle.diagnoseWriteReadiness({ command, targetDate: input.targetDate, expectedCurrentVersion });
    if (readiness.classification !== "ready") return { ...resolvedPreflight, result: "failed_closed", stage: "persistence", persistence_failure_code: readiness.classification };
  }
  const persisted = await persistHermesDailyFarmBrief({ command, repository: input.repositoryBundle.writeRepository, clock: () => input.generatedAt });
  const wroteDatabase = persisted.status === "persisted" && identity.write_kind === "database";
  if (persisted.status !== "persisted" && persisted.status !== "reused") return { ...resolvedPreflight, result: persisted.status === "rejected" ? "rejected" : "failed_closed", stage: "persistence", call_counts: { ...resolvedPreflight.call_counts, persistence_transaction: persisted.repository_transaction_call_count }, database_write_performed: wroteDatabase, transaction_committed: false, persistence_failure_code: safePersistenceFailureCode(persisted.error_code) };
  const readCountBefore = input.repositoryBundle.readRepository.readCount ?? 0;
  const selected = await readHermesDailyFarmBriefPersistedLatestSource({ repository: input.repositoryBundle.readRepository, requestedBusinessDate: input.targetDate, now: input.generatedAt });
  const repositoryReads = (input.repositoryBundle.readRepository.readCount ?? readCountBefore) - readCountBefore === 1 ? 1 : 0;
  if (selected.status !== "selected" || selected.source?.source_kind !== "projectable_brief" || selected.source.business_date !== input.targetDate) return { ...resolvedPreflight, result: "failed_closed", stage: "read_after_write", call_counts: { ...resolvedPreflight.call_counts, persistence_transaction: 1, repository_read: repositoryReads }, database_write_performed: wroteDatabase, transaction_committed: persisted.safety.transaction_committed };
  const authentication = { schema_version: "hermes.daily_farm_brief.authentication_result.v1", status: "authenticated", principal_ref: input.administratorActor.principal_ref } as const;
  const responseFor = (actor: HermesDailyFarmBriefAuthenticatedActorContext) => serveHermesDailyFarmBriefLatestDisplay({ request: new Request("http://localhost/api/hermes/daily-farm-brief/latest-display"), dependencies: { authenticate: async () => ({ ...authentication, principal_ref: actor.principal_ref }), resolveActorContext: async () => actor, readLatestSource: async () => selected.source, clock: () => input.generatedAt } });
  const administratorResponse = await responseFor(input.administratorActor);
  const generalStaffResponse = await responseFor(input.generalStaffActor);
  const administratorBody = parseHermesDailyFarmBriefLatestDisplayApiResponse(await administratorResponse.json());
  const generalStaffBody = parseHermesDailyFarmBriefLatestDisplayApiResponse(await generalStaffResponse.json());
  const administratorDisplay = administratorBody?.result === "ok" ? administratorBody.display : null;
  const generalStaffDisplay = generalStaffBody?.result === "ok" ? generalStaffBody.display : null;
  const staffRedacted = generalStaffDisplay !== null && generalStaffDisplay.source_disclosure.every((source) => source.source_record_count === null && source.input_record_count === null && source.selected_fact_count === null && source.attention_count === null && source.available_but_no_selected_facts === null && source.available_but_no_attention === null);
  const safeSerialized = JSON.stringify({ administratorBody, generalStaffBody });
  const exposed = [input.administratorActor.principal_ref, input.generalStaffActor.principal_ref, command.record.record_id, command.source_execution_reference].some((value) => safeSerialized.includes(value));
  const administratorDisplayVerified =
    administratorDisplay?.display_state === "current" ||
    administratorDisplay?.display_state === "stale";
  if (administratorResponse.status !== 200 || !administratorDisplayVerified || administratorDisplay.business_date !== input.targetDate || generalStaffResponse.status !== 200 || !staffRedacted || exposed) return { ...resolvedPreflight, result: "failed_closed", stage: "read_after_write", call_counts: { ...resolvedPreflight.call_counts, persistence_transaction: 1, repository_read: repositoryReads }, database_write_performed: wroteDatabase, transaction_committed: persisted.safety.transaction_committed };
  return {
    ...resolvedPreflight,
    result: persisted.status === "reused" ? "reused" : "inserted",
    stage: "completed",
    read_after_write: "pass",
    latest_selector: "pass",
    latest_display_projection: "pass",
    administrator_display_state: administratorDisplay.display_state,
    general_staff_counts_redacted: true,
    call_counts: { ...resolvedPreflight.call_counts, persistence_transaction: 1, repository_read: repositoryReads },
    database_write_performed: wroteDatabase,
    transaction_committed: persisted.safety.transaction_committed,
  };
}
