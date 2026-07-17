import assert from "node:assert/strict";

import type { HermesDailyFarmBriefPersistenceCommand } from "./brief_runtime/hermes_daily_farm_brief_persistence_command_contract";
import {
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_CONFIRMATION,
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_ENV,
  applyHermesDailyFarmBriefReviewedPrivilegeHardening,
  createHermesDailyFarmBriefProductionRepositoryBundle,
  type HermesDailyFarmBriefProductionRepositoryExecutor,
  type HermesDailyFarmBriefRawPrivilegeCandidates,
} from "../../src/lib/hermes/hermes_daily_farm_brief_production_repository_bundle";

const DATABASE_CREDENTIAL_VALUE = "test-value-c";
const VALID_ENV = {
  HERMES_DAILY_BRIEF_DATABASE_ENABLED: "true", HERMES_DAILY_BRIEF_DATABASE_HOST: "db.internal", HERMES_DAILY_BRIEF_DATABASE_PORT: "5432", HERMES_DAILY_BRIEF_DATABASE_NAME: "farmos_core_production", HERMES_DAILY_BRIEF_DATABASE_USER: "hermes_reader", HERMES_DAILY_BRIEF_DATABASE_PASSWORD: DATABASE_CREDENTIAL_VALUE, HERMES_DAILY_BRIEF_DATABASE_SSL_MODE: "verify-full", HERMES_DAILY_BRIEF_DATABASE_CONNECT_TIMEOUT_MS: "1000", HERMES_DAILY_BRIEF_DATABASE_STATEMENT_TIMEOUT_MS: "3000", HERMES_DAILY_BRIEF_DATABASE_LOCK_TIMEOUT_MS: "500",
} as const;
const OWNER_VALUE = "candidate_owner_value";
const RUNTIME_VALUE = "candidate_runtime_value";

function raw(overrides: Partial<HermesDailyFarmBriefRawPrivilegeCandidates> = {}): HermesDailyFarmBriefRawPrivilegeCandidates {
  return { ownerRole: OWNER_VALUE, runtimeRole: RUNTIME_VALUE, recordsOwnerRole: OWNER_VALUE, commandsOwnerRole: OWNER_VALUE, ownerEligible: true, runtimeEligible: true, runtimeMatchesConnectionPrincipal: true, functionSignatureMatches: true, transactionRolledBack: true, catalogFingerprint: "a".repeat(64), priorState: { securityDefiner: false, searchPathFixed: false, publicExecute: false, runtimeExecute: false, runtimeDirectDml: false }, ...overrides };
}

function executor(candidate: HermesDailyFarmBriefRawPrivilegeCandidates): HermesDailyFarmBriefProductionRepositoryExecutor {
  return {
    async executeReadOnly() { return { database_matches: true, user_present: true, transaction_read_only: true, rows: [] }; },
    async executeCanonicalTransition(_command: HermesDailyFarmBriefPersistenceCommand) { throw new Error("not expected"); },
    async resolvePrivilegeCandidates() { return structuredClone(candidate); },
  };
}

async function resolution(candidate: HermesDailyFarmBriefRawPrivilegeCandidates) {
  const bundle = createHermesDailyFarmBriefProductionRepositoryBundle(VALID_ENV, executor(candidate));
  return { bundle, ...(await bundle.resolvePrivilegeCandidates()) };
}

const valid = await resolution(raw());
assert.equal(valid.preflight.ready_for_manual_apply, true);
assert.equal(valid.preflight.owner_candidate_resolved, true);
assert.equal(valid.preflight.owner_candidate_eligible, true);
assert.equal(valid.preflight.runtime_candidate_resolved, true);
assert.equal(valid.preflight.runtime_candidate_eligible, true);
assert.equal(valid.preflight.runtime_matches_connection_principal, true);
assert.equal(valid.preflight.function_relation_ownership_aligned, true);
assert.equal(valid.preflight.owner_change_required, false);
assert.equal(valid.preflight.function_change_required, true);
assert.equal(valid.preflight.grant_execute_required, true);
assert.ok(valid.token);

for (const candidate of [
  raw({ runtimeRole: OWNER_VALUE }),
  raw({ ownerEligible: false }),
  raw({ runtimeEligible: false }),
  raw({ runtimeMatchesConnectionPrincipal: false }),
  raw({ recordsOwnerRole: "different_owner_value" }),
  raw({ ownerRole: "invalid/owner" }),
]) {
  const rejected = await resolution(candidate);
  assert.equal(rejected.preflight.ready_for_manual_apply, false);
  assert.equal(rejected.token, null);
}

let applyCalls = 0;
const applyExecutor = {
  async executeReviewedHardening(input: { ownerRole: string; runtimeRole: string; expectedCatalogFingerprint: string }) {
    applyCalls += 1;
    assert.equal(input.ownerRole, OWNER_VALUE);
    assert.equal(input.runtimeRole, RUNTIME_VALUE);
    assert.equal(input.expectedCatalogFingerprint, "a".repeat(64));
    return { schema_version: "hermes.daily_farm_brief.privilege_apply_transaction.v1", catalog_fingerprint_matched: false, transaction_committed: false, transaction_rolled_back: true };
  },
};
const disabled = await applyHermesDailyFarmBriefReviewedPrivilegeHardening({ environment: {}, repositoryBundle: valid.bundle, candidateToken: valid.token, executor: applyExecutor });
assert.equal(disabled.status, "disabled");
assert.equal(applyCalls, 0);
const missingConfirmation = await applyHermesDailyFarmBriefReviewedPrivilegeHardening({ environment: { [HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_ENV.enabled]: "true" }, repositoryBundle: valid.bundle, candidateToken: valid.token, executor: applyExecutor });
assert.equal(missingConfirmation.status, "disabled");
assert.equal(applyCalls, 0);
const override = await applyHermesDailyFarmBriefReviewedPrivilegeHardening({ environment: { [HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_ENV.enabled]: "true", [HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_ENV.confirmation]: HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_CONFIRMATION, HERMES_DAILY_FARM_BRIEF_PERSISTENCE_OWNER_ROLE: "caller_override" }, repositoryBundle: valid.bundle, candidateToken: valid.token, executor: applyExecutor });
assert.equal(override.status, "rejected");
assert.equal(applyCalls, 0);
const fingerprintMismatch = await applyHermesDailyFarmBriefReviewedPrivilegeHardening({ environment: { [HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_ENV.enabled]: "true", [HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_ENV.confirmation]: HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_CONFIRMATION }, repositoryBundle: valid.bundle, candidateToken: valid.token, executor: applyExecutor });
assert.equal(fingerprintMismatch.error_code, "catalog_fingerprint_mismatch");
assert.equal(fingerprintMismatch.transaction_committed, false);
assert.equal(fingerprintMismatch.production_change_performed, false);
assert.equal(applyCalls, 1);
const rolledBack = await applyHermesDailyFarmBriefReviewedPrivilegeHardening({ environment: { [HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_ENV.enabled]: "true", [HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_ENV.confirmation]: HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_CONFIRMATION }, repositoryBundle: valid.bundle, candidateToken: valid.token, executor: { async executeReviewedHardening() { return { schema_version: "hermes.daily_farm_brief.privilege_apply_transaction.v1", catalog_fingerprint_matched: true, transaction_committed: false, transaction_rolled_back: true }; } } });
assert.equal(rolledBack.status, "failed_closed");
assert.equal(rolledBack.transaction_committed, false);
assert.equal(rolledBack.production_change_performed, false);

const serialized = JSON.stringify({ preflight: valid.preflight, disabled, missingConfirmation, override, fingerprintMismatch, rolledBack });
for (const forbidden of [OWNER_VALUE, RUNTIME_VALUE, DATABASE_CREDENTIAL_VALUE, VALID_ENV.HERMES_DAILY_BRIEF_DATABASE_NAME, VALID_ENV.HERMES_DAILY_BRIEF_DATABASE_USER]) assert.equal(serialized.includes(forbidden), false);

console.log(JSON.stringify({ result: "pass", boundary: "hermes_daily_farm_brief_privilege_candidate_resolution", safe_owner_auto_resolution: true, runtime_auto_resolution: true, ownership_alignment: true, caller_override_rejected: true, default_disabled: true, confirmation_required: true, catalog_fingerprint_mismatch: "rejected", rollback_only: true, retry_count: 0, production_change_performed: false, raw_role_exposed: false, secret_exposed: false }));
