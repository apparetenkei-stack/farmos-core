import { parseHermesDailyFarmBrief } from "./hermes_daily_farm_brief_builder";
import {
  HERMES_DAILY_FARM_BRIEF_EXECUTION_SAFETY,
  parseHermesDailyFarmBriefExecutionRequest,
  parseHermesDailyFarmBriefExecutionResult,
  parseHermesDailyFarmBriefLatestCandidate,
  type HermesDailyFarmBriefExecutionFailureCode,
  type HermesDailyFarmBriefExecutionRequest,
  type HermesDailyFarmBriefExecutionResult,
  type HermesDailyFarmBriefLatestCandidate,
  type HermesDailyFarmBriefLatestSourceStatus,
} from "./hermes_daily_farm_brief_execution_contract";
import { isCanonicalIso, isHermesDailyFarmBusinessDate, parseHermesDailyFarmBriefGenerationDecision } from "./hermes_daily_farm_brief_generation_contract";
import {
  parseHermesDailyFarmBriefExecutionIntegrationBundle,
  parseHermesDailyFarmBriefScopeReferenceInput,
  type HermesDailyFarmBriefRealDataIntegrationResult,
  type HermesDailyFarmBriefScopeReferenceInput,
} from "./hermes_daily_farm_brief_integration";
import { parseHermesDailyFarmBriefAllowedScopeKeys, parseHermesDailyFarmBriefRoleProjection, parseHermesDailyFarmBriefScopeIndex, type HermesDailyFarmBriefRole, type HermesDailyFarmBriefRoleProjection, type HermesDailyFarmBriefScopeIndex } from "./hermes_daily_farm_brief_scope_contract";
import { buildHermesDailyFarmBriefScopeIndex } from "./hermes_daily_farm_brief_scope_builder";
import { buildHermesDailyFarmBriefRoleProjection } from "./hermes_daily_farm_brief_role_projection";
import { parseHermesDailyFarmSnapshot } from "./hermes_daily_farm_snapshot_adapter";
import type { HermesDailyFarmSnapshot } from "./hermes_daily_farm_snapshot_contract";

export type HermesDailyFarmBriefExecutionDependencies = {
  integrate: () => Promise<unknown>;
  buildScopeIndex: (input: {
    snapshot: HermesDailyFarmSnapshot;
    brief: HermesDailyFarmBriefRealDataIntegrationResult["brief"];
    scopeReferenceInput: HermesDailyFarmBriefScopeReferenceInput;
  }) => unknown;
  buildRoleProjection: (input: {
    scopeIndex: HermesDailyFarmBriefScopeIndex;
    snapshot: HermesDailyFarmSnapshot;
    role: HermesDailyFarmBriefRole;
    allowedScopeKeys: string[];
  }) => unknown;
  clock: () => string;
};

export function createHermesDailyFarmBriefExecutionRequest(input: {
  generationDecision: unknown;
  roleProjectionTarget: HermesDailyFarmBriefRole;
  allowedScopeKeys: unknown;
  clock: () => string;
  executionIdFactory: () => string;
}): HermesDailyFarmBriefExecutionRequest | null {
  const decision = parseHermesDailyFarmBriefGenerationDecision(input.generationDecision);
  const allowedScopeKeys = parseHermesDailyFarmBriefAllowedScopeKeys(input.allowedScopeKeys);
  if (decision === null || allowedScopeKeys === null) return null;
  let executionRequestedAt: string;
  let executionId: string;
  try {
    executionRequestedAt = input.clock();
    executionId = input.executionIdFactory();
  } catch {
    return null;
  }
  const request: HermesDailyFarmBriefExecutionRequest = {
    schema_version: "hermes.daily_farm_brief.execution_request.v1",
    generation_decision: decision,
    execution_id: executionId,
    execution_requested_at: executionRequestedAt,
    timezone: decision.request.timezone,
    business_date: decision.request.business_date,
    role_projection_target: input.roleProjectionTarget,
    allowed_scope_keys: allowedScopeKeys,
  };
  return parseHermesDailyFarmBriefExecutionRequest(request);
}

export function buildHermesDailyFarmBriefExecutionScopeIndex(input: {
  snapshot: HermesDailyFarmSnapshot;
  brief: HermesDailyFarmBriefRealDataIntegrationResult["brief"];
  scopeReferenceInput: HermesDailyFarmBriefScopeReferenceInput;
}): HermesDailyFarmBriefScopeIndex {
  const references = parseHermesDailyFarmBriefScopeReferenceInput(input.scopeReferenceInput);
  if (references === null) throw new Error("daily_farm_brief_scope_reference_invalid");
  return buildHermesDailyFarmBriefScopeIndex({
    snapshot: input.snapshot,
    brief: input.brief,
    generatedAt: input.brief.generated_at,
    timezone: "Asia/Tokyo",
    workLogs: references.workLogs,
    cropCycles: references.cropCycles,
  });
}

export function buildHermesDailyFarmBriefExecutionRoleProjection(input: {
  scopeIndex: HermesDailyFarmBriefScopeIndex;
  snapshot: HermesDailyFarmSnapshot;
  role: HermesDailyFarmBriefRole;
  allowedScopeKeys: string[];
}): HermesDailyFarmBriefRoleProjection {
  return buildHermesDailyFarmBriefRoleProjection({
    scopeIndex: input.scopeIndex,
    snapshot: input.snapshot,
    role: input.role,
    allowedScopeKeys: input.allowedScopeKeys,
  });
}

function sourceStatus(projection: HermesDailyFarmBriefRoleProjection): HermesDailyFarmBriefLatestSourceStatus[] {
  return projection.summary.source_status.map((source) => ({ ...source }));
}

export function createHermesDailyFarmBriefLatestCandidateFromRoleProjection(input: {
  businessDate: string;
  roleProjection: unknown;
}): HermesDailyFarmBriefLatestCandidate | null {
  const projection = parseHermesDailyFarmBriefRoleProjection(input.roleProjection);
  if (projection === null || !isHermesDailyFarmBusinessDate(input.businessDate)) return null;
  const staleSources = projection.summary.source_status.filter((source) => (source.source_type === "inventory" || source.source_type === "work_log") && source.freshness !== "fresh");
  const reasons: HermesDailyFarmBriefLatestCandidate["stale_reason_codes"] = staleSources.length > 0 ? ["required_source_stale"] : [];
  const limitations = [...new Set(projection.limitations)].sort();
  const candidate: HermesDailyFarmBriefLatestCandidate = {
    schema_version: "hermes.daily_farm_brief.latest_candidate.v1",
    business_date: input.businessDate,
    generated_at: projection.generated_at,
    brief_status: projection.brief_status,
    role: projection.role,
    visible_scope_count: projection.visible_scope_count,
    source_status: sourceStatus(projection),
    stale: reasons.length > 0,
    stale_reason_codes: reasons,
    limitations,
    display_state: reasons.length > 0 ? "stale" : "current",
  };
  return parseHermesDailyFarmBriefLatestCandidate(candidate);
}

function result(input: {
  request: HermesDailyFarmBriefExecutionRequest;
  executedAt: string;
  status: HermesDailyFarmBriefExecutionResult["status"];
  flags: [boolean, boolean, boolean, boolean];
  failureCode: HermesDailyFarmBriefExecutionFailureCode | null;
  projection?: HermesDailyFarmBriefRoleProjection;
  candidate?: HermesDailyFarmBriefLatestCandidate;
}): HermesDailyFarmBriefExecutionResult | null {
  const projection = input.projection;
  const value: HermesDailyFarmBriefExecutionResult = {
    schema_version: "hermes.daily_farm_brief.execution_result.v1",
    execution_id: input.request.execution_id,
    generation_request_id: input.request.generation_decision.request.request_id,
    business_date: input.request.business_date,
    execution_requested_at: input.request.execution_requested_at,
    executed_at: input.executedAt,
    status: input.status,
    generation_decision: input.request.generation_decision,
    brief_status: input.status === "completed" ? projection?.brief_status ?? null : null,
    snapshot_generated: input.flags[0],
    brief_generated: input.flags[1],
    scope_index_generated: input.flags[2],
    role_projection_generated: input.flags[3],
    role: input.request.role_projection_target,
    visible_scope_count: input.status === "completed" ? projection?.visible_scope_count ?? 0 : 0,
    source_status: input.status === "completed" && projection ? sourceStatus(projection) : [],
    limitations: input.status === "completed" && projection ? [...new Set(projection.limitations)].sort() : [],
    failure_code: input.failureCode,
    latest_candidate: input.candidate ?? null,
    safety: HERMES_DAILY_FARM_BRIEF_EXECUTION_SAFETY,
  };
  return parseHermesDailyFarmBriefExecutionResult(value);
}

function completionTime(dependencies: HermesDailyFarmBriefExecutionDependencies): string | null {
  try {
    const value = dependencies.clock();
    return isCanonicalIso(value) ? value : null;
  } catch {
    return null;
  }
}

export async function executeHermesDailyFarmBriefGeneration(input: {
  executionRequest: unknown;
  dependencies: HermesDailyFarmBriefExecutionDependencies;
}): Promise<HermesDailyFarmBriefExecutionResult | null> {
  const request = parseHermesDailyFarmBriefExecutionRequest(input.executionRequest);
  if (request === null) return null;
  const decision = request.generation_decision;
  if (decision.decision !== "generate" || !decision.should_execute_generation || decision.should_reuse_existing || !decision.safety.duplicate_prevention_enforced || !decision.safety.fail_closed) {
    const executedAt = completionTime(input.dependencies);
    return executedAt === null ? null : result({ request, executedAt, status: "skipped", flags: [false, false, false, false], failureCode: "generation_not_authorized" });
  }

  let integration: unknown;
  try {
    integration = await input.dependencies.integrate();
  } catch {
    const executedAt = completionTime(input.dependencies);
    return executedAt === null ? null : result({ request, executedAt, status: "failed_closed", flags: [false, false, false, false], failureCode: "integration_threw" });
  }
  const bundle = parseHermesDailyFarmBriefExecutionIntegrationBundle(integration);
  if (bundle === null) {
    const executedAt = completionTime(input.dependencies);
    return executedAt === null ? null : result({ request, executedAt, status: "failed_closed", flags: [false, false, false, false], failureCode: "integration_result_invalid" });
  }
  const shell = bundle.integration_result;
  const snapshot = parseHermesDailyFarmSnapshot(shell.snapshot);
  if (snapshot === null) {
    const executedAt = completionTime(input.dependencies);
    return executedAt === null ? null : result({ request, executedAt, status: "failed_closed", flags: [false, false, false, false], failureCode: "snapshot_invalid" });
  }
  const brief = parseHermesDailyFarmBrief(shell.brief);
  if (brief === null) {
    const executedAt = completionTime(input.dependencies);
    return executedAt === null ? null : result({ request, executedAt, status: "failed_closed", flags: [true, false, false, false], failureCode: "brief_invalid" });
  }
  if (shell.result !== snapshot.status || brief.status !== snapshot.status || brief.snapshot_id !== snapshot.snapshot_id || brief.generated_at !== snapshot.generated_at) {
    const executedAt = completionTime(input.dependencies);
    return executedAt === null ? null : result({ request, executedAt, status: "failed_closed", flags: [true, true, false, false], failureCode: "integration_result_invalid" });
  }
  const scopeReferenceInput = bundle.scope_reference_input;

  let scopeIndexValue: unknown;
  try {
    scopeIndexValue = input.dependencies.buildScopeIndex({ snapshot, brief, scopeReferenceInput });
  } catch {
    const executedAt = completionTime(input.dependencies);
    return executedAt === null ? null : result({ request, executedAt, status: "failed_closed", flags: [true, true, false, false], failureCode: "scope_index_invalid" });
  }
  const scopeIndex = parseHermesDailyFarmBriefScopeIndex(scopeIndexValue);
  if (scopeIndex === null || scopeIndex.generated_at !== brief.generated_at || scopeIndex.brief_status !== brief.status || scopeIndex.timezone !== request.timezone) {
    const executedAt = completionTime(input.dependencies);
    return executedAt === null ? null : result({ request, executedAt, status: "failed_closed", flags: [true, true, false, false], failureCode: "scope_index_invalid" });
  }

  let projectionValue: unknown;
  try {
    projectionValue = input.dependencies.buildRoleProjection({ scopeIndex, snapshot, role: request.role_projection_target, allowedScopeKeys: request.allowed_scope_keys });
  } catch {
    const executedAt = completionTime(input.dependencies);
    return executedAt === null ? null : result({ request, executedAt, status: "failed_closed", flags: [true, true, true, false], failureCode: "role_projection_invalid" });
  }
  const projection = parseHermesDailyFarmBriefRoleProjection(projectionValue);
  if (projection === null || projection.role !== request.role_projection_target || projection.generated_at !== brief.generated_at || projection.timezone !== request.timezone || projection.brief_status !== brief.status) {
    const executedAt = completionTime(input.dependencies);
    return executedAt === null ? null : result({ request, executedAt, status: "failed_closed", flags: [true, true, true, false], failureCode: "role_projection_invalid" });
  }

  const executedAt = completionTime(input.dependencies);
  if (executedAt === null || Date.parse(request.execution_requested_at) > Date.parse(executedAt) || Date.parse(snapshot.generated_at) < Date.parse(request.execution_requested_at) || Date.parse(snapshot.generated_at) > Date.parse(executedAt)) return executedAt === null ? null : result({ request, executedAt, status: "failed_closed", flags: [true, true, true, true], failureCode: "timestamp_invalid" });
  const candidate = createHermesDailyFarmBriefLatestCandidateFromRoleProjection({ businessDate: request.business_date, roleProjection: projection });
  if (candidate === null || Date.parse(candidate.generated_at as string) > Date.parse(executedAt)) return result({ request, executedAt, status: "failed_closed", flags: [true, true, true, true], failureCode: "latest_candidate_invalid" });
  return result({ request, executedAt, status: "completed", flags: [true, true, true, true], failureCode: null, projection, candidate });
}
