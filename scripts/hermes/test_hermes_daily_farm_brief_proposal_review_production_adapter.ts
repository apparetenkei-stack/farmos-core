import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_ENABLED_ENV,
  HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_BEGIN_SQL,
  HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_READINESS_SQL,
  PgProductionReviewExecutor,
  createHermesDailyFarmBriefProposalProductionReviewAdapter,
  type HermesDailyFarmBriefProductionReviewExecutor,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_production_adapter";
import { createHermesDailyFarmBriefProposalSafeReference } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_read_boundary";
import { HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS } from "./brief_runtime/hermes_daily_farm_brief_production_readiness_contract";
import {
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS,
  parseHermesDailyFarmBriefProposalReviewDatabaseEnvironment,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_database_contract";
import type { Pool } from "pg";
import { createDay127ApiTestRow } from "./test_hermes_daily_farm_brief_proposal_review_service";

const AUTH = {
  schema_version: "hermes.daily_farm_brief.authentication_result.v1",
  status: "authenticated",
  principal_ref: "production-review-administrator",
} as const;
const ADMIN = {
  schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1",
  principal_ref: AUTH.principal_ref,
  role: "administrator",
  allowed_scope_keys: [],
  authorization_verified: true,
} as const;
const STAFF = { ...ADMIN, role: "general_staff", allowed_scope_keys: ["scope"] } as const;
const ENV = {
  [HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_ENABLED_ENV]: "true",
  [HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.enabled]: "true",
  [HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.host]: "daily-brief.internal.example",
  [HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.port]: "5432",
  [HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.database]: "farmos_core_pilot",
  [HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.user]: "daily_brief_runtime",
  [HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.credential]: "daily-brief-fixture-value",
  [HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.ssl]: "verify-full",
  [HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.connect]: "1000",
  [HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.statement]: "3000",
  [HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.lock]: "1000",
  [HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.enabled]: "true",
  [HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.host]: "proposal-review.internal.example",
  [HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.port]: "5433",
  [HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.database]: "farmos_core_local",
  [HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.user]: "proposal_review_runtime",
  [HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.credential]: "proposal-review-fixture-value",
  [HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.ssl]: "verify-full",
  [HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.connect]: "1000",
  [HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.statement]: "3000",
  [HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.lock]: "1000",
} as const;

const READY = {
  database_matches: true,
  user_matches: true,
  transaction_read_only: true,
  transaction_rolled_back: true,
  runtime_role_safe: true,
  proposal_relation_present: true,
  audit_contract_valid: true,
  proposal_select: true,
  update_status: true,
  update_reviewed_by: true,
  update_reviewed_at: true,
  update_review_note: true,
  update_updated_at: true,
  proposal_insert: false,
  proposal_delete: false,
  proposal_truncate: false,
  proposal_table_update: false,
  update_applied_at: false,
  update_applied_by: false,
  update_payload_json: false,
  update_source_refs_json: false,
  audit_insert: true,
  audit_update: false,
  audit_delete: false,
  audit_truncate: false,
  app_write: false,
  other_table_write: false,
  schema_create: false,
};
const {
  database_matches: _databaseMatches,
  user_matches: _userMatches,
  transaction_read_only: _transactionReadOnly,
  transaction_rolled_back: _transactionRolledBack,
  ...DATABASE_READY
} = READY;

class FakeExecutor implements HermesDailyFarmBriefProductionReviewExecutor {
  readCalls: number[] = [];
  transactionCalls = 0;
  closeCalls = 0;
  constructor(
    private readonly evidence: typeof READY = READY,
    private readonly rows: unknown[] = [],
    private readonly diagnosis: "ok" | "connection_unavailable" | "transaction_unavailable" = "ok",
  ) {}
  async diagnoseReadiness() {
    return this.diagnosis === "ok"
      ? { result: "ok" as const, evidence: this.evidence }
      : { result: this.diagnosis };
  }
  async readCandidates(limit: number) { this.readCalls.push(limit); return structuredClone(this.rows); }
  async executeSingleConnectionTransaction<T>() {
    this.transactionCalls += 1;
    return { ok: false, committed: false } as { ok: boolean; committed: boolean; value?: T };
  }
  async close() { this.closeCalls += 1; }
}

let factoryCalls = 0;
const factory = (executor: FakeExecutor) => () => { factoryCalls += 1; return executor; };
async function create(input: {
  environment?: Readonly<Record<string, string | undefined>>;
  authentication?: typeof AUTH | { schema_version: typeof AUTH.schema_version; status: "unauthenticated"; principal_ref: null };
  actor?: typeof ADMIN | typeof STAFF;
  executor?: FakeExecutor;
} = {}) {
  const executor = input.executor ?? new FakeExecutor();
  const result = await createHermesDailyFarmBriefProposalProductionReviewAdapter({
    environment: input.environment ?? ENV,
    authentication: input.authentication ?? AUTH,
    actor: input.actor ?? ADMIN,
    executorFactory: factory(executor),
  });
  return { result, executor };
}

factoryCalls = 0;
const disabled = await create({ environment: { HERMES_DAY128_LOCAL_REVIEW_RUNTIME_ENABLED: "true" } });
assert.equal(disabled.result.readiness.state, "disabled");
assert.equal(factoryCalls, 0, "local flag must not select production");

const productionFlagOnly = await create({ environment: { [HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_ENABLED_ENV]: "true" } });
assert.equal(productionFlagOnly.result.readiness.state, "environment_missing");
assert.equal(factoryCalls, 0);

const dailyBriefOnly = await create({ environment: Object.fromEntries(
  [
    ...Object.entries(ENV).filter(([key]) => !key.startsWith("HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_")),
    ["PGHOST", "legacy-postgres.invalid"],
    ["POSTGRES_HOST", "legacy-postgres.invalid"],
  ],
) });
assert.equal(dailyBriefOnly.result.readiness.state, "environment_missing");
assert.equal(factoryCalls, 0, "Daily Brief credentials must not be a Proposal Review fallback");
assert.equal(Object.values(HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS).length, 10);
assert(Object.values(HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS).every(
  (key) => key.startsWith("HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_") && !key.startsWith("NEXT_PUBLIC_"),
));

const isolated = await create({ environment: { ...ENV, [HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.database]: "farmos_core_day114_test" } });
assert.equal(isolated.result.readiness.state, "environment_missing");
assert.equal(factoryCalls, 0, "production adapter must reject isolated fixture target");

const unauthenticated = await create({ authentication: { schema_version: AUTH.schema_version, status: "unauthenticated", principal_ref: null } });
assert.equal(unauthenticated.result.readiness.state, "authentication_unavailable");
assert.equal(factoryCalls, 0);
const forbidden = await create({ actor: STAFF });
assert.equal(forbidden.result.readiness.state, "administrator_required");
assert.equal(factoryCalls, 0);
const malformedActor = await createHermesDailyFarmBriefProposalProductionReviewAdapter({
  environment: ENV,
  authentication: AUTH,
  actor: { ...ADMIN, unexpected: true },
  executorFactory: factory(new FakeExecutor()),
});
assert.equal(malformedActor.readiness.state, "administrator_required");
assert.equal(factoryCalls, 0);

const connection = await create({ executor: new FakeExecutor(READY, [], "connection_unavailable") });
assert.equal(connection.result.readiness.state, "connection_unavailable");
const transaction = await create({ executor: new FakeExecutor(READY, [], "transaction_unavailable") });
assert.equal(transaction.result.readiness.state, "transaction_unavailable");
for (const [change, state] of [
  [{ proposal_select: false }, "proposal_read_denied"],
  [{ update_review_note: false }, "proposal_update_denied"],
  [{ audit_insert: false }, "audit_insert_denied"],
  [{ proposal_insert: true }, "forbidden_privilege_present"],
  [{ proposal_delete: true }, "forbidden_privilege_present"],
  [{ app_write: true }, "forbidden_privilege_present"],
  [{ other_table_write: true }, "forbidden_privilege_present"],
  [{ schema_create: true }, "forbidden_privilege_present"],
] as const) {
  const checked = await create({ executor: new FakeExecutor({ ...READY, ...change }) });
  assert.equal(checked.result.readiness.state, state);
  assert.equal(checked.result.readiness.database_write_performed, false);
  assert.equal(checked.result.readiness.retry_count, 0);
}

const row = createDay127ApiTestRow();
const proposalRef = createHermesDailyFarmBriefProposalSafeReference(row.source_refs_json.idempotency_key);
const ready = await create({ executor: new FakeExecutor(READY, [row]) });
assert.equal(ready.result.readiness.state, "ready");
assert(ready.result.readRepository);
assert(ready.result.reviewRepository);
assert.equal((await ready.result.readRepository.listDailyBriefProposalRows(100)).length, 1);
assert.equal((await ready.result.readRepository.findDailyBriefProposalRowBySafeReference(proposalRef))?.id, row.id);
assert.deepEqual(ready.executor.readCalls, [100, 100]);
assert.equal(ready.result.readiness.proposal_five_column_update_available, true);
assert.equal(ready.result.readiness.audit_insert_available, true);
assert.equal(ready.result.readiness.forbidden_privileges_absent, true);
assert.equal(ready.result.readiness.app_database_write_privilege_present, false);
assert.equal(ready.result.readiness.production_connection_performed, true);
await ready.result.close();
assert.equal(ready.executor.closeCalls, 1);

assert.doesNotMatch(HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_READINESS_SQL, /insert\s+into|update\s+ai\.|delete\s+from|truncate\s+table/iu);
assert.doesNotMatch(HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_READINESS_SQL, /farmos_core_day114_test|farmos_ai_proposal_review_local/u);
assert.match(HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_READINESS_SQL, /has_column_privilege/u);
assert.match(HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_READINESS_SQL, /proposal_review_decision_events/u);
assert(!JSON.stringify(ready.result.readiness).includes(ENV[HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.credential]));
for (const relative of [
  "../../src/app/api/hermes/daily-farm-brief/proposals/route.ts",
  "../../src/app/api/hermes/daily-farm-brief/proposals/[proposalRef]/route.ts",
  "../../src/app/api/hermes/daily-farm-brief/proposals/[proposalRef]/review/route.ts",
]) {
  const routeSource = readFileSync(new URL(relative, import.meta.url), "utf8");
  assert.doesNotMatch(routeSource, /PROPOSAL_REVIEW_DATABASE|DATABASE_PASSWORD|NEXT_PUBLIC_/u);
}

class FakeClient {
  queries: string[] = [];
  releases = 0;
  async query(sql: string) {
    this.queries.push(sql);
    if (sql.includes("select current_database()")) return { rowCount: 1, rows: [{ current_database: ENV[HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.database], current_user: ENV[HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.user], transaction_read_only: this.queries.some((item) => item === "begin transaction read only") && !this.queries.some((item) => item === HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_BEGIN_SQL) ? "on" : "off" }] };
    if (sql === HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_READINESS_SQL) return { rowCount: 1, rows: [{ evidence: DATABASE_READY }] };
    if (sql.includes("from ai.proposal_inbox")) return { rowCount: 1, rows: [row] };
    return { rowCount: 1, rows: [{ value: 1 }] };
  }
  release() { this.releases += 1; }
}
class FakePool {
  clients: FakeClient[] = [];
  endCalls = 0;
  async connect() { const client = new FakeClient(); this.clients.push(client); return client; }
  async end() { this.endCalls += 1; }
}
const productionConfig = parseHermesDailyFarmBriefProposalReviewDatabaseEnvironment(ENV);
assert(productionConfig);
const fakePool = new FakePool();
const pgExecutor = new PgProductionReviewExecutor(productionConfig, {
  host: ENV[HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.host],
  user: ENV[HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.user],
  credential: ENV[HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.credential],
}, fakePool as unknown as Pool);
assert.equal((await pgExecutor.diagnoseReadiness()).result, "ok");
assert.equal((await pgExecutor.readCandidates(100)).length, 1);
const committed = await pgExecutor.executeSingleConnectionTransaction({
  databaseTarget: productionConfig.database_name,
  beginSql: HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_BEGIN_SQL,
  operation: async (transaction) => { await transaction.query("select 1"); return { commit: true, value: "committed" }; },
});
assert.deepEqual(committed, { ok: true, committed: true, value: "committed" });
const rolledBack = await pgExecutor.executeSingleConnectionTransaction({
  databaseTarget: productionConfig.database_name,
  beginSql: HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_BEGIN_SQL,
  operation: async () => ({ commit: false, value: "denied" }),
});
assert.deepEqual(rolledBack, { ok: true, committed: false, value: "denied" });
const failed = await pgExecutor.executeSingleConnectionTransaction({
  databaseTarget: productionConfig.database_name,
  beginSql: HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_BEGIN_SQL,
  operation: async () => { throw new Error("raw-database-error"); },
});
assert.deepEqual(failed, { ok: false, committed: false });
assert.equal(fakePool.clients.length, 5);
assert(fakePool.clients.every((client) => client.releases === 1));
assert(fakePool.clients[0].queries.includes("rollback"));
assert(fakePool.clients[2].queries.includes("commit"));
assert(fakePool.clients[3].queries.includes("rollback"));
assert(fakePool.clients[4].queries.includes("rollback"));
assert(fakePool.clients.flatMap((client) => client.queries).every((sql) => !sql.includes("set local role") && !sql.includes("farmos_core_day114_test")));
await pgExecutor.close();
assert.equal(fakePool.endCalls, 1);

console.log(JSON.stringify({
  result: "pass",
  boundary: "production_proposal_review_adapter",
  deny_by_default: true,
  administrator_required: true,
  isolated_target_rejected: true,
  local_production_isolation: true,
  split_database_contract: true,
  daily_brief_fallback_forbidden: true,
  pg_fallback_forbidden: true,
  http_credential_exposure: false,
  five_column_update_required: true,
  audit_insert_required: true,
  app_write_forbidden: true,
  database_write_performed: false,
  production_connection_performed: false,
  retry_count: 0,
  credential_exposed: false,
}));
