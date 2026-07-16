import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

import { createHermesDailyFarmBriefLatestCandidateFromRoleProjection } from "./brief_runtime/hermes_daily_farm_brief_execution_adapter";
import { parseHermesDailyFarmBriefLatestCandidate } from "./brief_runtime/hermes_daily_farm_brief_execution_contract";
import { createHermesDailyFarmBriefGenerationStateLatestCandidate } from "./brief_runtime/hermes_daily_farm_brief_latest_read_boundary";
import { HERMES_DAILY_FARM_SOURCE_ORDER } from "./brief_runtime/hermes_daily_farm_brief_policy";
import {
  HERMES_DAILY_FARM_BRIEF_PROJECTION_SAFETY,
  parseHermesDailyFarmBriefRoleProjection,
  type HermesDailyFarmBriefRoleProjection,
  type HermesDailyFarmBriefScope,
} from "./brief_runtime/hermes_daily_farm_brief_scope_contract";
import { createHermesDailyFarmBriefDisplayProjection } from "./brief_runtime/hermes_daily_farm_brief_display_projection_boundary";
import {
  HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_SAFETY,
  parseHermesDailyFarmBriefDisplayProjection,
} from "./brief_runtime/hermes_daily_farm_brief_display_projection_contract";

const GENERATED_AT = "2026-07-15T01:00:00.000Z";
const BUSINESS_DATE = "2026-07-15";

function scope(input: { type: "crop" | "field" | "crop_cycle"; hex: string; label: string; warning: number; info: number }): HermesDailyFarmBriefScope {
  const sourceRefs = input.warning + input.info > 0 ? ["work_log" as const] : ["crop_cycle" as const];
  return { scope_type: input.type, scope_key: `${input.type}:${input.hex.repeat(24)}`, display_label: input.label, source_refs: sourceRefs, work_log_count: sourceRefs[0] === "work_log" ? 1 : 0, crop_cycle_count: sourceRefs[0] === "crop_cycle" ? 1 : 0, inventory_fact_count: 0, warning_count: input.warning, info_count: input.info, limitation_codes: [], data_gap_codes: [] };
}

const ADMIN_SCOPES = [
  scope({ type: "crop", hex: "a", label: "キャベツ", warning: 2, info: 1 }),
  scope({ type: "field", hex: "b", label: "第一圃場", warning: 0, info: 3 }),
  scope({ type: "crop_cycle", hex: "c", label: "春作", warning: 0, info: 0 }),
];

function sourceStatus(role: "administrator" | "general_staff") {
  return HERMES_DAILY_FARM_SOURCE_ORDER.map((sourceType, index) => ({
    source_type: sourceType,
    status: role === "administrator" ? (index === 2 ? "unavailable" as const : index === 4 ? "empty" as const : "available" as const) : (index === 0 ? "available" as const : index === 4 ? "empty" as const : "limited" as const),
    freshness: index === 3 ? "stale" as const : index === 4 ? "unknown" as const : "fresh" as const,
    record_count: role === "administrator" ? (index === 4 ? 0 : 1) : null,
  }));
}

function projection(role: "administrator" | "general_staff", mode: "all" | "allowed" | "empty" = "all"): HermesDailyFarmBriefRoleProjection {
  const scopes = role === "administrator" ? structuredClone(ADMIN_SCOPES) : mode === "allowed" ? [structuredClone(ADMIN_SCOPES[1])] : [];
  const value: HermesDailyFarmBriefRoleProjection = {
    schema_version: "hermes.daily_farm_brief.role_projection.v1", role, generated_at: GENERATED_AT, timezone: "Asia/Tokyo", brief_status: "ready", visible_scope_count: scopes.length, scopes,
    summary: { crop_scope_count: scopes.filter((item) => item.scope_type === "crop").length, field_scope_count: scopes.filter((item) => item.scope_type === "field").length, crop_cycle_scope_count: scopes.filter((item) => item.scope_type === "crop_cycle").length, warning_count: scopes.reduce((sum, item) => sum + item.warning_count, 0), info_count: scopes.reduce((sum, item) => sum + item.info_count, 0), source_status: sourceStatus(role), unscoped_work_log_count: role === "administrator" ? 0 : null, unscoped_crop_cycle_count: role === "administrator" ? 0 : null, unresolved_field_reference_count: role === "administrator" ? 0 : null, unresolved_crop_cycle_reference_count: role === "administrator" ? 0 : null },
    limitations: role === "administrator" ? ["independent_field_source_unavailable", "secret_internal_code"] : ["scope_access_limited"], safety: HERMES_DAILY_FARM_BRIEF_PROJECTION_SAFETY,
  };
  const parsed = parseHermesDailyFarmBriefRoleProjection(value); assert(parsed); return parsed;
}

function candidate(roleProjection: HermesDailyFarmBriefRoleProjection, stale = false) {
  const current = createHermesDailyFarmBriefLatestCandidateFromRoleProjection({ businessDate: BUSINESS_DATE, roleProjection }); assert(current);
  if (!stale) return current;
  const value = parseHermesDailyFarmBriefLatestCandidate({ ...current, stale: true, stale_reason_codes: ["previous_business_date"], display_state: "stale" }); assert(value); return value;
}

function clone<T>(value: T): T { return structuredClone(value); }
function assertReject(value: unknown) { assert.equal(parseHermesDailyFarmBriefDisplayProjection(value), null); }

export async function runDay118DisplayProjectionScenario() {
  let repositoryReadCount = 0;
  const adminProjection = projection("administrator");
  const adminCandidate = candidate(adminProjection);
  const beforeCandidate = JSON.stringify(adminCandidate); const beforeProjection = JSON.stringify(adminProjection);
  const current = createHermesDailyFarmBriefDisplayProjection({ latestCandidate: adminCandidate, roleProjection: adminProjection }); assert(current);
  assert(parseHermesDailyFarmBriefDisplayProjection(current)); assert.equal(current.display_state, "current"); assert.equal(current.title, "今日の農場状況"); assert.equal(current.priorities.length, 2); assert.equal(current.priorities[0].severity, "attention"); assert.equal(current.source_disclosure.length, HERMES_DAILY_FARM_SOURCE_ORDER.length); assert.equal(repositoryReadCount, 0);
  assert.equal(JSON.stringify(adminCandidate), beforeCandidate); assert.equal(JSON.stringify(adminProjection), beforeProjection);
  assert.equal(JSON.stringify(createHermesDailyFarmBriefDisplayProjection({ latestCandidate: adminCandidate, roleProjection: adminProjection })), JSON.stringify(current));

  const stale = createHermesDailyFarmBriefDisplayProjection({ latestCandidate: candidate(adminProjection, true), roleProjection: adminProjection }); assert(stale); assert.equal(stale.display_state, "stale"); assert(stale.summary.endsWith("この情報は最新でない可能性があります。")); assert(stale.limitations.includes("前営業日の情報を表示しています。")); assert(stale.attention_items.some((item) => item.label === "Daily Brief" && item.detail === "前営業日の情報を表示しています。"));
  const staffAllowedProjection = projection("general_staff", "allowed");
  const staffAllowed = createHermesDailyFarmBriefDisplayProjection({ latestCandidate: candidate(staffAllowedProjection), roleProjection: staffAllowedProjection }); assert(staffAllowed); assert.deepEqual(staffAllowed.priorities.map((item) => item.label), ["第一圃場"]);
  const staffEmptyProjection = projection("general_staff", "empty");
  const staffEmpty = createHermesDailyFarmBriefDisplayProjection({ latestCandidate: candidate(staffEmptyProjection), roleProjection: staffEmptyProjection }); assert(staffEmpty); assert.equal(staffEmpty.priorities.length, 0);

  for (const state of ["in_progress", "failed", "unavailable"] as const) {
    const statusCandidate = createHermesDailyFarmBriefGenerationStateLatestCandidate({ businessDate: BUSINESS_DATE, role: "administrator", generationState: state }); assert(statusCandidate);
    assert.equal(createHermesDailyFarmBriefDisplayProjection({ latestCandidate: statusCandidate, roleProjection: adminProjection }), null);
  }
  assert.equal(createHermesDailyFarmBriefDisplayProjection({ latestCandidate: adminCandidate, roleProjection: { ...adminProjection, role: "unknown" } }), null);
  assert.equal(createHermesDailyFarmBriefDisplayProjection({ latestCandidate: { ...adminCandidate, role: "general_staff" }, roleProjection: adminProjection }), null);
  assert.equal(createHermesDailyFarmBriefDisplayProjection({ latestCandidate: { ...adminCandidate, generated_at: "2026-07-15T01:01:00.000Z" }, roleProjection: adminProjection }), null);
  assert.equal(createHermesDailyFarmBriefDisplayProjection({ latestCandidate: { ...adminCandidate, brief_status: "partial" }, roleProjection: adminProjection }), null);
  assert.equal(createHermesDailyFarmBriefDisplayProjection({ latestCandidate: { ...adminCandidate, visible_scope_count: 2 }, roleProjection: adminProjection }), null);

  const topUnknown = { ...current, unexpected: true }; assertReject(topUnknown);
  const topMissing = clone(current) as Record<string, unknown>; delete topMissing.summary; assertReject(topMissing);
  const nestedUnknown = clone(current); nestedUnknown.priorities[0] = { ...nestedUnknown.priorities[0], unexpected: true } as typeof nestedUnknown.priorities[number]; assertReject(nestedUnknown);
  const nestedMissing = clone(current) as unknown as { priorities: Array<Record<string, unknown>> }; delete nestedMissing.priorities[0].detail; assertReject(nestedMissing);
  const duplicatePriority = clone(current); duplicatePriority.priorities.push(clone(duplicatePriority.priorities[0])); assertReject(duplicatePriority);
  const duplicateAttention = clone(current); duplicateAttention.attention_items.push(clone(duplicateAttention.attention_items[0])); assertReject(duplicateAttention);
  const duplicateSource = clone(current); duplicateSource.source_disclosure[1] = clone(duplicateSource.source_disclosure[0]); assertReject(duplicateSource);
  const invalidSeverity = clone(current) as unknown as { priorities: Array<Record<string, unknown>> }; invalidSeverity.priorities[0].severity = "urgent"; assertReject(invalidSeverity);
  assertReject({ ...current, business_date: "2026-02-30" }); assertReject({ ...current, generated_at: "2026-07-15T01:00:00Z" }); assertReject({ ...current, title: "x".repeat(121) }); assertReject({ ...current, summary: "x".repeat(501) });
  const oversizedDetail = clone(current); oversizedDetail.priorities[0].detail = "x".repeat(301); assertReject(oversizedDetail);
  assertReject({ ...current, summary: "unsafe\u0000text" });
  const htmlLabel = clone(current); htmlLabel.priorities[0].label = "<script>alert(1)</script>"; assertReject(htmlLabel);
  const rawJsonLabel = clone(current); rawJsonLabel.priorities[0].label = "{\"raw\":true}"; assertReject(rawJsonLabel);
  const tooManyPriorities = clone(current); tooManyPriorities.priorities = Array.from({ length: 11 }, (_, index) => ({ label: `label-${index}`, detail: `参考情報が${index + 1}件あります。`, severity: "info" as const })); assertReject(tooManyPriorities);
  assertReject({ ...current, limitations: Array.from({ length: 21 }, (_, index) => index === 0 ? "一部の情報を表示できません。" : `unknown-${index}`) });
  assertReject("{invalid-json");

  const serialized = JSON.stringify(current);
  for (const forbidden of [ADMIN_SCOPES[0].scope_key, "record_id", "field_id", "crop_cycle_id", "source_record_id", "principal_ref", "allowed_scope_keys", "snapshot_id", "brief_id", "facts", "independent_field_source_unavailable", "secret_internal_code", "fixture-secret", "fixture-token"]) assert(!serialized.includes(forbidden));
  assert.equal(current.safety, HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_SAFETY); assert.equal(current.safety.database_write_performed, false); assert.equal(current.safety.proposal_write_performed, false); assert.equal(current.safety.model_execution_performed, false); assert.equal(repositoryReadCount, 0);
  const safetyTamper = clone(current) as unknown as { safety: Record<string, unknown> }; safetyTamper.safety.database_write_performed = true; assertReject(safetyTamper);
  return { states: ["current", "stale"], roles: ["administrator", "general_staff"], bodyless_states_rejected: ["generation_in_progress", "generation_failed", "unavailable"], priority_count: current.priorities.length, attention_item_count: current.attention_items.length, repository_read_count: repositoryReadCount, deterministic: true, safety: HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_SAFETY };
}

async function main() { console.log(JSON.stringify({ result: "pass", boundary: "hermes_daily_farm_brief_display_projection", ...(await runDay118DisplayProjectionScenario()) })); }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
