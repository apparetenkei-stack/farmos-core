import assert from "node:assert/strict";

import { GET } from "../../src/app/api/hermes/daily-farm-brief/latest/route";
import type { HermesOperationalReadonlyClientResult } from "../../src/lib/hermes/hermes_operational_readonly_client";
import { buildHermesDailyFarmBrief } from "./brief_runtime/hermes_daily_farm_brief_builder";
import {
  HERMES_DAILY_FARM_BRIEF_LATEST_API_SAFETY,
  createHermesDailyFarmBriefLatestReadRequest,
  parseHermesDailyFarmBriefAuthenticatedActorContext,
  parseHermesDailyFarmBriefAuthenticationResult,
  parseHermesDailyFarmBriefLatestApiResponse,
  parseHermesDailyFarmBriefLatestReadSource,
} from "./brief_runtime/hermes_daily_farm_brief_latest_api_contract";
import type { HermesDailyFarmBriefLatestCandidate } from "./brief_runtime/hermes_daily_farm_brief_execution_contract";
import {
  serveHermesDailyFarmBriefLatestRead,
  type HermesDailyFarmBriefLatestReadDependencies,
} from "./brief_runtime/hermes_daily_farm_brief_latest_read_service";
import { buildHermesDailyFarmBriefScopeIndex } from "./brief_runtime/hermes_daily_farm_brief_scope_builder";
import { createHermesDailyFarmSnapshot } from "./brief_runtime/hermes_daily_farm_snapshot_adapter";

const URL = "http://localhost/api/hermes/daily-farm-brief/latest";
const NOW = "2026-07-15T00:00:00.000Z";
const VALID_ABSENT_SCOPE = "crop:0123456789abcdef01234567";

type Counts = { authentication: number; role: number; source: number; clock: number };

function source<T>(type: "inventory" | "work_log", records: T[], generatedAt: string) {
  return { result: "ok" as const, source_type: type, endpoint_path: type === "inventory" ? ("/api/farmos-core/inventory-summary" as const) : ("/api/farmos-core/recent-work-logs" as const), http_method: "GET" as const, fetch_performed: false, available: true, transaction_read_only: true as const, requested_limit: 100, http_status: 200, response_source: type === "inventory" ? ("apparetenkei_inventory_readonly" as const) : ("apparetenkei_work_logs_readonly" as const), generated_at: generatedAt, record_count: records.length, records, has_more: false, error_code: null, write_performed: false as const, restricted_fields_exposed: false as const, credentials_exposed: false as const };
}

function roleAwareFixture(generatedAt = "2026-07-14T23:00:00.000Z") {
  const logs = [
    { id: "raw-record-allowed-day111", startedAt: "2026-07-14T22:00:00.000Z", fieldId: null, workTypeId: null, workTypeName: "raw-fact-allowed-day111", durationMinutes: 10, targetCrop: "cabbage", cropCycleId: null, machineId: null, implementId: null, yieldAmount: null, yieldUnit: null, appliedMaterials: null },
    { id: "raw-record-outside-day111", startedAt: "2026-07-14T22:10:00.000Z", fieldId: null, workTypeId: null, workTypeName: "raw-fact-outside-day111", durationMinutes: 20, targetCrop: "lettuce", cropCycleId: null, machineId: null, implementId: null, yieldAmount: null, yieldUnit: null, appliedMaterials: null },
  ];
  const operational: HermesOperationalReadonlyClientResult = {
    result: "ok", checked: "hermes_operational_readonly_client", boundary: "day92_hermes_operational_readonly_client", inventory: source("inventory", [], generatedAt), work_log: source("work_log", logs, generatedAt), inventory_source_connected: true, work_log_source_connected: true, external_fetch_performed: false, hermes_context_injection_performed: false, suggestion_generation_performed: false, proposal_created: false, proposal_saved: false, proposal_apply_performed: false, app_db_write_performed: false, core_db_write_performed: false, audit_write_performed: false, database_write_performed: false, credentials_exposed: false, arbitrary_endpoint_allowed: false, arbitrary_method_allowed: false,
  };
  const snapshot = createHermesDailyFarmSnapshot({ operationalSources: operational, memory: { crop_cycles: [], hermes_notes: [], crop_cycle_generated_at: null, hermes_note_generated_at: null }, nowIso: NOW, snapshotIdFactory: () => "snapshot-day111" });
  const brief = buildHermesDailyFarmBrief({ snapshot, generatedAt: NOW, briefIdFactory: () => "brief-day111", factIdFactory: (index) => `fact-day111-${index}` }).brief;
  const scopeIndex = buildHermesDailyFarmBriefScopeIndex({ snapshot, brief, generatedAt: NOW, timezone: "Asia/Tokyo", workLogs: logs.map((record) => ({ id: record.id, field_id: null, target_crop: record.targetCrop, crop_cycle_id: null })), cropCycles: [] });
  assert.equal(scopeIndex.scopes.length, 2);
  const allowedScopeKey = scopeIndex.scopes[0].scope_key;
  const outsideScopeKey = scopeIndex.scopes[1].scope_key;
  return {
    allowedScopeKey,
    outsideScopeKey,
    source: {
      schema_version: "hermes.daily_farm_brief.latest_read_source.v1",
      source_kind: "projectable_brief",
      business_date: "2026-07-15",
      scope_index: scopeIndex,
      snapshot,
      generation_state: null,
    },
  };
}

function generationStateSource(generationState: "in_progress" | "failed" | "unavailable") {
  return {
    schema_version: "hermes.daily_farm_brief.latest_read_source.v1",
    source_kind: "generation_state",
    business_date: "2026-07-15",
    scope_index: null,
    snapshot: null,
    generation_state: generationState,
  };
}

function latest(
  displayState: HermesDailyFarmBriefLatestCandidate["display_state"],
  role: HermesDailyFarmBriefLatestCandidate["role"] = "administrator",
): HermesDailyFarmBriefLatestCandidate {
  const hasContent = displayState === "current" || displayState === "stale";
  return {
    schema_version: "hermes.daily_farm_brief.latest_candidate.v1",
    business_date: displayState === "stale" ? "2026-07-14" : "2026-07-15",
    generated_at: hasContent ? "2026-07-14T23:00:00.000Z" : null,
    brief_status: hasContent ? "ready" : null,
    role,
    visible_scope_count: hasContent && role === "general_staff" ? 1 : hasContent ? 3 : 0,
    source_status: hasContent ? [
      { source_type: "inventory", status: "available", freshness: "fresh", record_count: role === "administrator" ? 2 : null },
      { source_type: "work_log", status: "available", freshness: "fresh", record_count: role === "administrator" ? 1 : null },
      { source_type: "field", status: "unknown", freshness: "unknown", record_count: null },
      { source_type: "crop_cycle", status: "unknown", freshness: "unknown", record_count: null },
      { source_type: "hermes_note", status: "unknown", freshness: "unknown", record_count: null },
    ] : [],
    stale: displayState === "stale",
    stale_reason_codes: displayState === "stale" ? ["previous_business_date"] : [],
    limitations: hasContent ? ["scope_projection_summary_only"] : [
      displayState === "generation_in_progress" ? "generation_in_progress" :
      displayState === "generation_failed" ? "generation_failed" : "latest_brief_unavailable",
    ],
    display_state: displayState,
  };
}

function dependencies(input: {
  authentication?: unknown | (() => unknown);
  actor?: unknown | (() => unknown);
  source?: unknown | (() => unknown);
} = {}): { dependencies: HermesDailyFarmBriefLatestReadDependencies; counts: Counts; sourceReaderArgumentCounts: number[] } {
  const counts: Counts = { authentication: 0, role: 0, source: 0, clock: 0 };
  const sourceReaderArgumentCounts: number[] = [];
  const authenticated = {
    schema_version: "hermes.daily_farm_brief.authentication_result.v1",
    status: "authenticated",
    principal_ref: "actor-sensitive-day111",
  };
  const actor = {
    schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1",
    principal_ref: "actor-sensitive-day111",
    role: "administrator",
    allowed_scope_keys: [],
    authorization_verified: true,
  };
  function value(source: unknown | (() => unknown), fallback: unknown): unknown {
    return typeof source === "function" ? source() : source === undefined ? fallback : source;
  }
  return {
    counts,
    sourceReaderArgumentCounts,
    dependencies: {
      authenticate: async () => { counts.authentication += 1; return value(input.authentication, authenticated); },
      resolveActorContext: async () => { counts.role += 1; return value(input.actor, actor); },
      readLatestSource: async (...readerArguments: unknown[]) => {
        counts.source += 1;
        sourceReaderArgumentCounts.push(readerArguments.length);
        return value(input.source, null);
      },
      clock: () => { counts.clock += 1; return NOW; },
    },
  };
}

async function invoke(input: Parameters<typeof dependencies>[0] = {}, request = new Request(URL)): Promise<{ response: Response; body: unknown; counts: Counts; sourceReaderArgumentCounts: number[]; dependencies: HermesDailyFarmBriefLatestReadDependencies }> {
  const fixture = dependencies(input);
  const response = await serveHermesDailyFarmBriefLatestRead({ request, dependencies: fixture.dependencies });
  return { response, body: await response.json(), counts: fixture.counts, sourceReaderArgumentCounts: fixture.sourceReaderArgumentCounts, dependencies: fixture.dependencies };
}

function assertNoStore(response: Response): void {
  assert.equal(response.headers.get("cache-control"), "no-store");
}

async function main(): Promise<void> {
  const canonicalRequest = createHermesDailyFarmBriefLatestReadRequest({ request: new Request(URL), clock: () => NOW });
  assert(canonicalRequest);
  assert.equal(createHermesDailyFarmBriefLatestReadRequest({ request: new Request(`${URL}?role=administrator`), clock: () => NOW }), null);
  assert.equal(createHermesDailyFarmBriefLatestReadRequest({ request: new Request(URL, { method: "POST" }), clock: () => NOW }), null);
  assert(parseHermesDailyFarmBriefAuthenticationResult({ schema_version: "hermes.daily_farm_brief.authentication_result.v1", status: "authenticated", principal_ref: "actor-1" }));
  assert.equal(parseHermesDailyFarmBriefAuthenticationResult({ schema_version: "hermes.daily_farm_brief.authentication_result.v1", status: "authenticated", principal_ref: null }), null);
  assert(parseHermesDailyFarmBriefAuthenticatedActorContext({ schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: "actor-1", role: "general_staff", allowed_scope_keys: [VALID_ABSENT_SCOPE], authorization_verified: true }));

  for (const authentication of [
    { schema_version: "hermes.daily_farm_brief.authentication_result.v1", status: "unauthenticated", principal_ref: null },
    { schema_version: "hermes.daily_farm_brief.authentication_result.v1", status: "authenticated", principal_ref: null },
    () => { throw new Error("secret-day111-auth"); },
  ]) {
    const result = await invoke({ authentication });
    assert.equal(result.response.status, 401);
    assertNoStore(result.response);
    assert.deepEqual(result.counts, { authentication: 1, role: 0, source: 0, clock: 1 });
    assert.equal(parseHermesDailyFarmBriefLatestApiResponse(result.body)?.error, "authentication_required");
  }

  for (const actor of [
    null,
    { schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: "actor-sensitive-day111", role: "unknown", allowed_scope_keys: [], authorization_verified: true },
    { schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: "other-actor", role: "administrator", allowed_scope_keys: [], authorization_verified: true },
    { schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: "actor-sensitive-day111", role: "administrator", allowed_scope_keys: [VALID_ABSENT_SCOPE], authorization_verified: true },
    () => { throw new Error("secret-day111-role"); },
  ]) {
    const result = await invoke({ actor });
    assert.equal(result.response.status, 403);
    assertNoStore(result.response);
    assert.deepEqual(result.counts, { authentication: 1, role: 1, source: 0, clock: 1 });
    assert.equal(parseHermesDailyFarmBriefLatestApiResponse(result.body)?.error, "access_forbidden");
  }

  const scopedFixture = roleAwareFixture();
  assert(parseHermesDailyFarmBriefLatestReadSource(scopedFixture.source));
  assert.equal(parseHermesDailyFarmBriefLatestReadSource({ ...scopedFixture.source, latest_candidate: latest("current") }), null, "direct candidate injection must not be part of the source contract");
  const staffActor = { schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: "actor-sensitive-day111", role: "general_staff", allowed_scope_keys: [scopedFixture.allowedScopeKey], authorization_verified: true };
  const allowedStaff = await invoke({ actor: staffActor, source: scopedFixture.source });
  assert.equal(allowedStaff.response.status, 200);
  assertNoStore(allowedStaff.response);
  assert.deepEqual(allowedStaff.counts, { authentication: 1, role: 1, source: 1, clock: 1 });
  assert.deepEqual(allowedStaff.sourceReaderArgumentCounts, [0], "source reader must receive neither role nor allow-list");
  assert.equal(Object.hasOwn(allowedStaff.dependencies, "readLatestCandidate"), false, "direct candidate dependency must not exist");
  const allowedStaffBody = parseHermesDailyFarmBriefLatestApiResponse(allowedStaff.body);
  assert.equal(allowedStaffBody?.latest?.visible_scope_count, 1);
  assert.equal(allowedStaffBody?.latest?.display_state, "current");
  assert.doesNotMatch(JSON.stringify(allowedStaffBody), new RegExp(`${scopedFixture.allowedScopeKey}|${scopedFixture.outsideScopeKey}`, "u"));

  const emptyStaffActor = { ...staffActor, allowed_scope_keys: [] };
  const emptyStaff = await invoke({ actor: emptyStaffActor, source: scopedFixture.source });
  assert.equal(emptyStaff.response.status, 200);
  assert.equal(parseHermesDailyFarmBriefLatestApiResponse(emptyStaff.body)?.latest?.visible_scope_count, 0);
  assert.deepEqual(emptyStaff.sourceReaderArgumentCounts, [0]);
  assert.equal(emptyStaff.counts.source, 1);

  const absentScopeActor = { ...staffActor, allowed_scope_keys: [VALID_ABSENT_SCOPE] };
  const absentScope = await invoke({ actor: absentScopeActor, source: scopedFixture.source });
  assert.equal(absentScope.response.status, 200);
  assert.equal(parseHermesDailyFarmBriefLatestApiResponse(absentScope.body)?.latest?.visible_scope_count, 0, "an out-of-allow fixture scope must not contribute to a candidate");
  assert.deepEqual(absentScope.sourceReaderArgumentCounts, [0]);

  const administrator = await invoke({ source: scopedFixture.source });
  assert.equal(administrator.response.status, 200);
  assert.equal(parseHermesDailyFarmBriefLatestApiResponse(administrator.body)?.latest?.visible_scope_count, 2);
  assert.deepEqual(administrator.sourceReaderArgumentCounts, [0]);

  const staleFixture = roleAwareFixture("2026-07-13T00:00:00.000Z");
  const stale = await invoke({ source: staleFixture.source });
  assert.equal(stale.response.status, 200);
  assert.equal(parseHermesDailyFarmBriefLatestApiResponse(stale.body)?.latest?.display_state, "stale");
  assert.equal(stale.counts.source, 1);

  for (const [generationState, displayState] of [
    ["in_progress", "generation_in_progress"],
    ["failed", "generation_failed"],
    ["unavailable", "unavailable"],
  ] as const) {
    const statusSource = generationStateSource(generationState);
    assert(parseHermesDailyFarmBriefLatestReadSource(statusSource));
    assert.equal(statusSource.scope_index, null);
    assert.equal(statusSource.snapshot, null);
    const statusOnly = await invoke({ actor: staffActor, source: statusSource });
    assert.equal(statusOnly.response.status, 200);
    const parsed = parseHermesDailyFarmBriefLatestApiResponse(statusOnly.body);
    assert.equal(parsed?.latest?.display_state, displayState, "status-only sources must succeed without scope projection");
    assert.equal(parsed?.latest?.visible_scope_count, 0);
    assert.deepEqual(statusOnly.counts, { authentication: 1, role: 1, source: 1, clock: 1 });
    assert.deepEqual(statusOnly.sourceReaderArgumentCounts, [0]);
  }

  const unionTamperCases: unknown[] = [
    { ...scopedFixture.source, generation_state: "failed" },
    { ...generationStateSource("failed"), scope_index: scopedFixture.source.scope_index },
    { ...generationStateSource("failed"), snapshot: scopedFixture.source.snapshot },
    { ...generationStateSource("failed"), generation_state: "unknown" },
    { ...generationStateSource("failed"), source_kind: "projectable_brief" },
    { ...generationStateSource("failed"), latest_candidate: latest("generation_failed") },
    { ...generationStateSource("failed"), execution_result: { status: "failed_closed", raw_id: "raw-execution-day111" } },
  ];
  for (const tampered of unionTamperCases) {
    assert.equal(parseHermesDailyFarmBriefLatestReadSource(tampered), null);
    const rejected = await invoke({ source: tampered });
    assert.equal(rejected.response.status, 500);
    assert.equal(rejected.counts.source, 1);
  }

  const invalidSources: unknown[] = [
    { ...scopedFixture.source, latest_candidate: latest("current") },
    { ...scopedFixture.source, snapshot: { ...scopedFixture.source.snapshot, safety: { ...scopedFixture.source.snapshot.safety, database_write_performed: true } } },
    () => { throw new Error("secret-day111-reader"); },
  ];
  for (const sourceValue of invalidSources) {
    const result = await invoke({ source: sourceValue });
    assert.equal(result.response.status, 500);
    assertNoStore(result.response);
    assert.equal(result.counts.source, 1);
    assert.equal(parseHermesDailyFarmBriefLatestApiResponse(result.body)?.error, "latest_read_failed");
  }

  const method = await invoke({}, new Request(URL, { method: "POST" }));
  assert.equal(method.response.status, 405);
  assert.equal(method.response.headers.get("allow"), "GET");
  assertNoStore(method.response);
  assert.deepEqual(method.counts, { authentication: 0, role: 0, source: 0, clock: 0 });
  const query = await invoke({}, new Request(`${URL}?allowed_scope_keys=*`));
  assert.equal(query.response.status, 400);
  assert.deepEqual(query.counts, { authentication: 0, role: 0, source: 0, clock: 1 });

  const routeClosed = await GET(new Request(URL));
  assert.equal(routeClosed.status, 401);
  assertNoStore(routeClosed);

  const deterministicA = await invoke({ actor: staffActor, source: scopedFixture.source });
  const deterministicB = await invoke({ actor: staffActor, source: scopedFixture.source });
  assert.equal(JSON.stringify(deterministicA.body), JSON.stringify(deterministicB.body));
  const serialized = JSON.stringify(deterministicA.body);
  assert.doesNotMatch(serialized, /actor-sensitive-day111|raw-id-day111|raw-record|raw-fact|secret-day111|crop:[a-f0-9]{24}/iu);
  assert.doesNotMatch(serialized, /snapshot-day111/iu);
  assert.deepEqual((deterministicA.body as { safety: unknown }).safety, HERMES_DAILY_FARM_BRIEF_LATEST_API_SAFETY);
  const candidateTamper = structuredClone(deterministicA.body) as { latest: Record<string, unknown> };
  candidateTamper.latest.raw_scope_key = scopedFixture.outsideScopeKey;
  assert.equal(parseHermesDailyFarmBriefLatestApiResponse(candidateTamper), null);
  const safetyValueTamper = structuredClone(deterministicA.body) as { safety: Record<string, unknown> };
  safetyValueTamper.safety.database_write_performed = true;
  assert.equal(parseHermesDailyFarmBriefLatestApiResponse(safetyValueTamper), null);
  const safetyMissingKey = structuredClone(deterministicA.body) as { safety: Record<string, unknown> };
  delete safetyMissingKey.safety.scheduler_registration_performed;
  assert.equal(parseHermesDailyFarmBriefLatestApiResponse(safetyMissingKey), null);
  const safetyExtraKey = structuredClone(deterministicA.body) as { safety: Record<string, unknown> };
  safetyExtraKey.safety.unknown_safety_flag = false;
  assert.equal(parseHermesDailyFarmBriefLatestApiResponse(safetyExtraKey), null);

  console.log(JSON.stringify({
    result: "pass",
    boundary: "hermes_daily_farm_brief_authenticated_latest_read_api",
    authentication_matrix: true,
    role_matrix: true,
    scope_authorization: { allowed: 1, outside_allow_list: 0, empty_allow_list: 0, administrator: 2 },
    display_states: ["current", "stale", "generation_in_progress", "generation_failed", "unavailable"],
    status_source_projection_calls: 0,
    http_statuses: [200, 400, 401, 403, 405, 500],
    source_reader_max_calls: 1,
    auth_failure_source_calls: 0,
    cache_control: "no-store",
    deterministic: true,
    database_write_performed: false,
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "day111_test_failed");
  process.exitCode = 1;
});
