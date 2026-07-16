import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

import { GET as productionGET } from "../../src/app/api/hermes/daily-farm-brief/latest-display/route";
import type { HermesOperationalReadonlyClientResult } from "../../src/lib/hermes/hermes_operational_readonly_client";
import { buildHermesDailyFarmBrief } from "./brief_runtime/hermes_daily_farm_brief_builder";
import { createHermesDailyFarmBriefDisplayProjection } from "./brief_runtime/hermes_daily_farm_brief_display_projection_boundary";
import { createHermesDailyFarmBriefRoleAwareLatestArtifacts } from "./brief_runtime/hermes_daily_farm_brief_latest_read_boundary";
import {
  HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_API_SAFETY,
  parseHermesDailyFarmBriefLatestDisplayApiResponse,
} from "./brief_runtime/hermes_daily_farm_brief_latest_display_api_contract";
import { serveHermesDailyFarmBriefLatestDisplay, type HermesDailyFarmBriefLatestDisplayDependencies } from "./brief_runtime/hermes_daily_farm_brief_latest_display_service";
import { buildHermesDailyFarmBriefScopeIndex } from "./brief_runtime/hermes_daily_farm_brief_scope_builder";
import { createHermesDailyFarmSnapshot } from "./brief_runtime/hermes_daily_farm_snapshot_adapter";

const URL = "http://localhost/api/hermes/daily-farm-brief/latest-display";
const NOW = "2026-07-15T00:00:00.000Z";
const PRINCIPAL = "day119-actor";
type Counts = { authentication: number; actor: number; source: number; clock: number };

function source<T>(type: "inventory" | "work_log", records: T[], generatedAt: string) {
  return { result: "ok" as const, source_type: type, endpoint_path: type === "inventory" ? ("/api/farmos-core/inventory-summary" as const) : ("/api/farmos-core/recent-work-logs" as const), http_method: "GET" as const, fetch_performed: false, available: true, transaction_read_only: true as const, requested_limit: 100, http_status: 200, response_source: type === "inventory" ? ("apparetenkei_inventory_readonly" as const) : ("apparetenkei_work_logs_readonly" as const), generated_at: generatedAt, record_count: records.length, records, has_more: false, error_code: null, write_performed: false as const, restricted_fields_exposed: false as const, credentials_exposed: false as const };
}

function day122Source<T>(type: "field" | "crop_cycle", records: T[]) {
  return { result: "ok" as const, source_type: type, endpoint_path: type === "field" ? ("/api/farmos-core/fields" as const) : ("/api/farmos-core/crop-cycles" as const), http_method: "GET" as const, fetch_performed: false, available: true, transaction_read_only: true as const, requested_limit: 100, http_status: 200, response_source: type === "field" ? ("apparetenkei_fields_readonly" as const) : ("apparetenkei_crop_cycles_readonly" as const), generated_at: NOW, record_count: records.length, records, has_more: false, error_code: null, write_performed: false as const, restricted_fields_exposed: false as const, credentials_exposed: false as const };
}

function projectableFixture() {
  const logs = [
    { id: "source-record-day119-allowed", startedAt: "2026-07-14T22:00:00.000Z", fieldId: null, workTypeId: null, workTypeName: "raw work log text day119 allowed", durationMinutes: 10, targetCrop: "cabbage", cropCycleId: null, machineId: null, implementId: null, yieldAmount: null, yieldUnit: null, appliedMaterials: null },
    { id: "source-record-day119-outside", startedAt: "2026-07-14T22:10:00.000Z", fieldId: null, workTypeId: null, workTypeName: "raw work log text day119 outside", durationMinutes: 20, targetCrop: "lettuce", cropCycleId: null, machineId: null, implementId: null, yieldAmount: null, yieldUnit: null, appliedMaterials: null },
  ];
  const fieldReference = "550e8400-e29b-41d4-a716-446655440000";
  const cropCycleReference = "crop-cycle:day122_sensitive";
  const operational: HermesOperationalReadonlyClientResult = { result: "ok", checked: "hermes_operational_readonly_client", boundary: "day92_hermes_operational_readonly_client", inventory: source("inventory", [], NOW), work_log: source("work_log", logs, NOW), field: day122Source("field", [{ reference: fieldReference, display_name: "Sensitive field label", active_state: "unknown", source_updated_at: null }]), crop_cycle: day122Source("crop_cycle", [{ reference: cropCycleReference, field_references: [fieldReference], crop_display_name: "Sensitive crop label", cycle_state: "unknown", operational_start_date: "2026-07-01", source_updated_at: null }]), inventory_source_connected: true, work_log_source_connected: true, field_source_connected: true, crop_cycle_source_connected: true, external_fetch_performed: false, hermes_context_injection_performed: false, suggestion_generation_performed: false, proposal_created: false, proposal_saved: false, proposal_apply_performed: false, app_db_write_performed: false, core_db_write_performed: false, audit_write_performed: false, database_write_performed: false, credentials_exposed: false, arbitrary_endpoint_allowed: false, arbitrary_method_allowed: false };
  const snapshot = createHermesDailyFarmSnapshot({ operationalSources: operational, memory: { crop_cycles: [], hermes_notes: [], crop_cycle_generated_at: null, hermes_note_generated_at: null }, nowIso: NOW, snapshotIdFactory: () => "snapshot-id-day119-sensitive" });
  const brief = buildHermesDailyFarmBrief({ snapshot, generatedAt: NOW, briefIdFactory: () => "brief-id-day119-sensitive", factIdFactory: (index) => `fact-id-day119-${index}` }).brief;
  const scopeIndex = buildHermesDailyFarmBriefScopeIndex({ snapshot, brief, generatedAt: NOW, timezone: "Asia/Tokyo", workLogs: logs.map((record) => ({ id: record.id, field_id: null, target_crop: record.targetCrop, crop_cycle_id: null })), cropCycles: [] });
  assert.equal(scopeIndex.scopes.length, 2);
  scopeIndex.scopes[0].warning_count = 1; scopeIndex.scopes[0].info_count = 0; scopeIndex.scopes[0].inventory_fact_count = 0;
  scopeIndex.scopes[1].warning_count = 0; scopeIndex.scopes[1].info_count = 1; scopeIndex.scopes[1].inventory_fact_count = 0;
  scopeIndex.summary.warning_count = 1; scopeIndex.summary.info_count = 1;
  return { allowedScopeKey: scopeIndex.scopes[0].scope_key, outsideScopeKey: scopeIndex.scopes[1].scope_key, allowedLabel: scopeIndex.scopes[0].display_label, outsideLabel: scopeIndex.scopes[1].display_label, source: { schema_version: "hermes.daily_farm_brief.latest_read_source.v1", source_kind: "projectable_brief", business_date: "2026-07-15", scope_index: scopeIndex, snapshot, generation_state: null } };
}
function statusSource(generationState: "in_progress" | "failed" | "unavailable") { return { schema_version: "hermes.daily_farm_brief.latest_read_source.v1", source_kind: "generation_state", business_date: "2026-07-15", scope_index: null, snapshot: null, generation_state: generationState }; }
function authenticated() { return { schema_version: "hermes.daily_farm_brief.authentication_result.v1", status: "authenticated", principal_ref: PRINCIPAL }; }
function actor(role: "administrator" | "general_staff" = "administrator", scopes: string[] = [], principal = PRINCIPAL) { return { schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: principal, role, allowed_scope_keys: scopes, authorization_verified: true }; }
function fixture(input: { authentication?: unknown | (() => unknown); actor?: unknown | (() => unknown); source?: unknown | (() => unknown) } = {}) {
  const counts: Counts = { authentication: 0, actor: 0, source: 0, clock: 0 };
  const value = (candidate: unknown | (() => unknown), fallback: unknown) => typeof candidate === "function" ? candidate() : candidate === undefined ? fallback : candidate;
  const dependencies: HermesDailyFarmBriefLatestDisplayDependencies = { authenticate: async () => { counts.authentication += 1; return value(input.authentication, authenticated()); }, resolveActorContext: async () => { counts.actor += 1; return value(input.actor, actor()); }, readLatestSource: async () => { counts.source += 1; return value(input.source, statusSource("unavailable")); }, clock: () => { counts.clock += 1; return NOW; } };
  return { dependencies, counts };
}
async function invoke(input: Parameters<typeof fixture>[0] = {}, request = new Request(URL)) {
  const prepared = fixture(input); const response = await serveHermesDailyFarmBriefLatestDisplay({ request, dependencies: prepared.dependencies }); const text = await response.text(); let body: unknown = null; try { body = JSON.parse(text); } catch { /* asserted by caller */ } return { response, text, body, counts: prepared.counts };
}
function assertHeaders(response: Response) { assert.equal(response.headers.get("cache-control"), "no-store"); assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8"); assert.equal(response.headers.get("x-content-type-options"), "nosniff"); }

export async function runDay119LatestDisplayScenario() {
  const data = projectableFixture();
  const artifacts = createHermesDailyFarmBriefRoleAwareLatestArtifacts({ businessDate: "2026-07-15", requestedBusinessDate: "2026-07-15", scopeIndex: data.source.scope_index, snapshot: data.source.snapshot, role: "administrator", allowedScopeKeys: [] }); assert(artifacts);
  assert.equal(artifacts.latest_candidate.role, artifacts.role_projection.role); assert.equal(artifacts.latest_candidate.generated_at, artifacts.role_projection.generated_at); assert.equal(artifacts.latest_candidate.brief_status, artifacts.role_projection.brief_status); assert.equal(artifacts.latest_candidate.visible_scope_count, artifacts.role_projection.visible_scope_count); assert.deepEqual(artifacts.latest_candidate.source_status, artifacts.role_projection.summary.source_status); assert(createHermesDailyFarmBriefDisplayProjection({ latestCandidate: artifacts.latest_candidate, roleProjection: artifacts.role_projection }));

  const current = await invoke({ source: data.source }); assert.equal(current.response.status, 200); assertHeaders(current.response); const currentParsed = parseHermesDailyFarmBriefLatestDisplayApiResponse(current.body); assert(currentParsed?.result === "ok"); assert.equal(currentParsed.display_state, "current"); assert(currentParsed.display); assert.equal(current.counts.source, 1); assert.equal(current.counts.authentication, 1); assert.equal(current.counts.actor, 1);
  const staleSource = { ...structuredClone(data.source), business_date: "2026-07-14" };
  const stale = await invoke({ source: staleSource }); const staleParsed = parseHermesDailyFarmBriefLatestDisplayApiResponse(stale.body); assert(staleParsed?.result === "ok" && staleParsed.display_state === "stale" && staleParsed.display); assert(staleParsed.display.summary.endsWith("この情報は最新でない可能性があります。")); assert(staleParsed.display.attention_items.some((item) => item.label === "Daily Brief")); assert(staleParsed.display.limitations.includes("前営業日の情報を表示しています。"));

  const staff = await invoke({ source: data.source, actor: actor("general_staff", [data.allowedScopeKey]) }); const staffParsed = parseHermesDailyFarmBriefLatestDisplayApiResponse(staff.body); assert(staffParsed?.result === "ok" && staffParsed.display); assert(staffParsed.display.priorities.some((item) => item.label === data.allowedLabel)); assert(!staffParsed.display.priorities.some((item) => item.label === data.outsideLabel)); assert(!staff.text.includes(data.allowedScopeKey)); assert(!staff.text.includes(data.outsideScopeKey));
  const emptyStaff = await invoke({ source: data.source, actor: actor("general_staff", []) }); const emptyParsed = parseHermesDailyFarmBriefLatestDisplayApiResponse(emptyStaff.body); assert(emptyParsed?.result === "ok" && emptyParsed.display); assert.deepEqual(emptyParsed.display.priorities, []);

  const statusStates = new Map<string, string>([["in_progress", "generation_in_progress"], ["failed", "generation_failed"], ["unavailable", "unavailable"]]);
  for (const state of ["in_progress", "failed", "unavailable"] as const) { const item = await invoke({ source: statusSource(state) }); const parsed = parseHermesDailyFarmBriefLatestDisplayApiResponse(item.body); assert(parsed?.result === "ok"); assert.equal(parsed.display_state, statusStates.get(state)); assert.equal(parsed.display, null); assert.equal(item.counts.source, 1); }

  for (const authentication of [{ schema_version: "hermes.daily_farm_brief.authentication_result.v1", status: "unauthenticated", principal_ref: null }, { invalid: true }, () => { throw new Error("fixture-secret-auth"); }]) { const item = await invoke({ authentication, source: data.source }); assert.equal(item.response.status, 401); assert.deepEqual(item.counts, { authentication: 1, actor: 0, source: 0, clock: 1 }); assertHeaders(item.response); }
  for (const invalidActor of [{ ...actor(), role: "unknown" }, actor("administrator", [], "other-principal"), actor("administrator", [data.allowedScopeKey]), () => { throw new Error("fixture-token-actor"); }]) { const item = await invoke({ actor: invalidActor, source: data.source }); assert.equal(item.response.status, 403); assert.equal(item.counts.authentication, 1); assert.equal(item.counts.actor, 1); assert.equal(item.counts.source, 0); }

  const unionTamper = { ...statusSource("failed"), snapshot: data.source.snapshot }; const invalidScope = structuredClone(data.source); invalidScope.scope_index = { invalid: true }; const safetyTamper = structuredClone(data.source); safetyTamper.snapshot.safety.database_write_performed = true;
  for (const invalidSource of [unionTamper, invalidScope, safetyTamper, () => { throw new Error("internal-source-error"); }]) { const item = await invoke({ source: invalidSource }); assert.equal(item.response.status, 500); assert.equal(item.counts.source, 1); }
  const mismatchDisplay = createHermesDailyFarmBriefDisplayProjection({ latestCandidate: { ...artifacts.latest_candidate, visible_scope_count: 999 }, roleProjection: artifacts.role_projection }); assert.equal(mismatchDisplay, null);

  const post = await invoke({}, new Request(URL, { method: "POST" })); assert.equal(post.response.status, 405); assert.equal(post.response.headers.get("allow"), "GET"); assert.equal(post.counts.authentication, 0);
  for (const query of ["role=administrator", "allowed_scope_keys=crop%3Aabc", "arbitrary=value"]) { const item = await invoke({}, new Request(`${URL}?${query}`)); assert.equal(item.response.status, 400); assert.equal(item.counts.authentication, 0); assert.equal(item.counts.source, 0); }

  assert(currentParsed?.result === "ok"); const valid = currentParsed;
  assert.equal(parseHermesDailyFarmBriefLatestDisplayApiResponse({ ...valid, unknown: true }), null); const missing = structuredClone(valid) as Record<string, unknown>; delete missing.display_state; assert.equal(parseHermesDailyFarmBriefLatestDisplayApiResponse(missing), null); assert.equal(parseHermesDailyFarmBriefLatestDisplayApiResponse({ ...valid, display_state: "stale" }), null); assert.equal(parseHermesDailyFarmBriefLatestDisplayApiResponse({ ...valid, display: null }), null);
  const unavailable = parseHermesDailyFarmBriefLatestDisplayApiResponse((await invoke({ source: statusSource("unavailable") })).body); assert(unavailable?.result === "ok"); assert.equal(parseHermesDailyFarmBriefLatestDisplayApiResponse({ ...unavailable, display: valid.display }), null); assert.equal(parseHermesDailyFarmBriefLatestDisplayApiResponse({ ...valid, latest_candidate: artifacts.latest_candidate }), null); assert.equal(parseHermesDailyFarmBriefLatestDisplayApiResponse({ ...valid, role_projection: artifacts.role_projection }), null);
  for (const mutation of ["modified", "missing", "extra"] as const) { const item = structuredClone(valid) as unknown as { safety: Record<string, unknown> }; if (mutation === "modified") item.safety.cache_disabled = false; if (mutation === "missing") delete item.safety.fail_closed; if (mutation === "extra") item.safety.extra = false; assert.equal(parseHermesDailyFarmBriefLatestDisplayApiResponse(item), null); }
  assert(parseHermesDailyFarmBriefLatestDisplayApiResponse(JSON.stringify(valid))); assert.equal(parseHermesDailyFarmBriefLatestDisplayApiResponse("{invalid"), null);

  const serialized = current.text;
  for (const forbidden of [PRINCIPAL, data.allowedScopeKey, data.outsideScopeKey, "snapshot-id-day119-sensitive", "brief-id-day119-sensitive", "source-record-day119", "550e8400-e29b-41d4-a716-446655440000", "crop-cycle:day122_sensitive", "field_references", "raw work log text day119", "independent_field_source_unavailable", "fixture-secret", "fixture-token"]) assert(!serialized.includes(forbidden));
  const top = current.body as Record<string, unknown>; for (const forbiddenKey of ["principal_ref", "allowed_scope_keys", "scope_key", "record_id", "field_id", "crop_cycle_id", "source_record_id", "scope_index", "snapshot", "role_projection", "latest_candidate", "record_count"]) assert(!Object.hasOwn(top, forbiddenKey));
  const deterministic = await invoke({ source: data.source }); assert.equal(deterministic.text, current.text);
  const production = await productionGET(new Request(URL)); assert.equal(production.status, 401); assertHeaders(production); const productionBody = parseHermesDailyFarmBriefLatestDisplayApiResponse(await production.json()); assert(productionBody?.result === "error" && productionBody.error === "authentication_required");
  assert.equal(HERMES_DAILY_FARM_BRIEF_LATEST_DISPLAY_API_SAFETY.database_write_performed, false);
  return { states: ["current", "stale", "generation_in_progress", "generation_failed", "unavailable"], roles: ["administrator", "general_staff"], http_statuses: [200, 400, 401, 403, 405, 500], source_read_maximum: 1, auth_failure_source_reads: 0, deterministic: true, production_route_state: "deny_by_default_401" };
}

async function main() { console.log(JSON.stringify({ result: "pass", boundary: "hermes_daily_farm_brief_authenticated_latest_display_api", ...(await runDay119LatestDisplayScenario()) })); }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
