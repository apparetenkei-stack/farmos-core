import assert from "node:assert/strict";

import type { HermesOperationalReadonlyClientResult } from "../../src/lib/hermes/hermes_operational_readonly_client";
import {
  buildHermesDailyFarmBriefAuthorizedRealDataPersistenceCommand,
  prepareHermesDailyFarmBriefRealDataPersistence,
} from "./brief_runtime/hermes_daily_farm_brief_authorized_real_data_persistence";
import {
  classifyHermesDailyFarmBriefProductionWriteReadiness,
  type HermesDailyFarmBriefWriteReadinessEvidence,
} from "./brief_runtime/hermes_daily_farm_brief_production_write_readiness_contract";

const TARGET_DATE = "2026-07-17" as const;
const GENERATED_AT = "2026-07-17T01:00:00.000Z";

function source<T>(sourceType: "inventory" | "work_log" | "field" | "crop_cycle", records: T[]) {
  return { result: "ok" as const, source_type: sourceType, endpoint_path: "/fixed", http_method: "GET" as const, fetch_performed: true, available: true, transaction_read_only: true as const, requested_limit: 100, http_status: 200, response_source: sourceType === "field" ? "apparetenkei_fields_readonly" : sourceType === "crop_cycle" ? "apparetenkei_crop_cycles_readonly" : sourceType === "inventory" ? "apparetenkei_inventory_readonly" : "apparetenkei_work_logs_readonly", generated_at: GENERATED_AT, record_count: records.length, records, has_more: false, error_code: null, write_performed: false as const, restricted_fields_exposed: false as const, credentials_exposed: false as const };
}

const fields = [{ reference: "field-a", display_name: "field a", active_state: "unknown" as const, source_updated_at: null }];
const operational = {
  result: "ok", checked: "hermes_operational_readonly_client", boundary: "day92_hermes_operational_readonly_client",
  inventory: source("inventory", []), work_log: source("work_log", []), field: source("field", fields), crop_cycle: source("crop_cycle", [{ reference: "cycle-a", field_references: ["field-a"], crop_display_name: "crop a", cycle_state: "unknown" as const, operational_start_date: null, source_updated_at: null }]),
  inventory_source_connected: true, work_log_source_connected: true, field_source_connected: true, crop_cycle_source_connected: true, external_fetch_performed: true,
  hermes_context_injection_performed: false, suggestion_generation_performed: false, proposal_created: false, proposal_saved: false, proposal_apply_performed: false,
  app_db_write_performed: false, core_db_write_performed: false, audit_write_performed: false, database_write_performed: false, credentials_exposed: false, arbitrary_endpoint_allowed: false, arbitrary_method_allowed: false,
} as HermesOperationalReadonlyClientResult;

const prepared = await prepareHermesDailyFarmBriefRealDataPersistence({ targetDate: TARGET_DATE, generatedAt: GENERATED_AT, readOperationalSources: async () => operational, readMemoryContext: async () => ({ result: "error" }) });
assert.ok(prepared);
const command = buildHermesDailyFarmBriefAuthorizedRealDataPersistenceCommand({ prepared, targetDate: TARGET_DATE, generatedAt: GENERATED_AT, expectedCurrentVersion: null });
assert.ok(command);

const readyEvidence: HermesDailyFarmBriefWriteReadinessEvidence = { connection_available: true, transaction_read_only: false, records_relation_exists: true, commands_relation_exists: true, function_exists: true, function_signature_matches: true, function_security_definer: true, function_search_path_safe: true, schema_public_create: false, schema_owner_safe: true, public_execute: false, runtime_execute_privilege: true, runtime_direct_dml: false, owner_relation_privileges: true, owner_role_safe: true, relation_owners_match_function_owner: true, owner_candidate_eligible: true, runtime_candidate_eligible: true, canonical_record_count: 0, expected_version_matches: true, rollback_verified: true };
const classify = (evidence: HermesDailyFarmBriefWriteReadinessEvidence, value: unknown = command) => classifyHermesDailyFarmBriefProductionWriteReadiness({ command: value, targetDate: TARGET_DATE, expectedCurrentVersion: null, evidence });

assert.equal(classify(readyEvidence).classification, "ready");
assert.equal(classify({ ...readyEvidence, transaction_read_only: true }).classification, "transaction_read_only");
assert.equal(classify({ ...readyEvidence, records_relation_exists: false }).classification, "relation_missing");
assert.equal(classify({ ...readyEvidence, function_exists: false, function_signature_matches: false }).classification, "function_missing");
assert.equal(classify({ ...readyEvidence, function_signature_matches: false }).classification, "function_signature_mismatch");
assert.equal(classify({ ...readyEvidence, function_security_definer: false }).classification, "function_not_security_definer");
assert.equal(classify({ ...readyEvidence, function_search_path_safe: false }).classification, "unsafe_search_path");
assert.equal(classify({ ...readyEvidence, public_execute: true }).classification, "public_execute_present");
assert.equal(classify({ ...readyEvidence, runtime_execute_privilege: false }).classification, "execute_privilege_missing");
assert.equal(classify({ ...readyEvidence, runtime_direct_dml: true }).classification, "runtime_direct_dml_present");
assert.equal(classify({ ...readyEvidence, owner_role_safe: false }).classification, "owner_role_unsafe");
assert.equal(classify({ ...readyEvidence, owner_relation_privileges: false }).classification, "owner_privilege_missing");
assert.equal(classify({ ...readyEvidence, canonical_record_count: 1, expected_version_matches: false }).classification, "existing_record_conflict");
assert.equal(classify(readyEvidence, { invalid: true }).classification, "command_invalid");
const rollbackFailure = classify({ ...readyEvidence, rollback_verified: false });
assert.equal(rollbackFailure.classification, "unknown_failure");
assert.equal(rollbackFailure.transaction_committed, false);
assert.equal(rollbackFailure.database_write_performed, false);
assert.equal(rollbackFailure.application_database_write_performed, false);
assert.equal(rollbackFailure.retry_count, 0);

const serialized = JSON.stringify([classify(readyEvidence), rollbackFailure]);
for (const forbidden of ["record_id", "principal_ref", "connection_string", "credential", "field-a", "cycle-a"]) assert.equal(serialized.includes(forbidden), false);

console.log(JSON.stringify({ result: "pass", boundary: "hermes_daily_farm_brief_production_write_readiness", read_only_role: "rejected", missing_function: "rejected", missing_execute_privilege: "rejected", existing_record_conflict: "rejected", invalid_command: "rejected", rollback_only: true, database_write_performed: false, application_database_write_performed: false, retry_count: 0, secret_exposed: false }));
