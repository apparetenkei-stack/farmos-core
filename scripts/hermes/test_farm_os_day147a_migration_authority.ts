import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  parseFarmOsCoreMigrationManifest,
  planFarmOsCoreMigrations,
  type FarmOsCoreMigrationEntry,
} from "../../src/lib/hermes/farm_os_core_db_migration_manifest";

const MIGRATION_ID =
  "202607300001_daily_operational_projection_candidate_foundation";
const MIGRATION_CHECKSUM =
  "sha256:350489282b921b879a9c4fab8280cfd38ff7432ed75cc70a905a7dabd45846bf";
const VERIFY_CHECKSUM =
  "sha256:183a3fff47bce5d9cbbf9675c21fd57e398f87fc7628e87ec93127d78c0c9edf";
const APPLY_PATH = `db/migrations/${MIGRATION_ID}.sql`;
const VERIFY_PATH = `db/migrations/${MIGRATION_ID}.verify.sql`;
const ACTIVATION_ID =
  "202607310001_daily_operational_projection_candidate_activation";
const COMMAND_LEDGER_ID =
  "202608030001_daily_operational_projection_command_ledger";
const STABLE_CHANGES_PERSISTENCE_ID =
  "202608070001_stable_changes_consumer_persistence";
const STABLE_CHANGES_APPLY_PATH =
  `db/migrations/${STABLE_CHANGES_PERSISTENCE_ID}.sql`;
const STABLE_CHANGES_VERIFY_PATH =
  `db/migrations/${STABLE_CHANGES_PERSISTENCE_ID}.verify.sql`;
const DAY146_SQL_PATH =
  "scripts/sql/day146_operational_memory_snapshot_persistence.sql";
const DAY146_SQL_CHECKSUM =
  "017c69c6cbfcf8efbe2cd042c32cfb88a848b6f48d65f23189f47dc22e6cefdc";
const EXISTING_MIGRATION_CHECKSUM =
  "sha256:41fbbfb931f03ad42c0c52159749fa8529c84321d6fcc643930c2b03c5c2ee4b";

const POSTGRES_TRIGGER_TYPE = {
  ROW: 1,
  BEFORE: 2,
  INSERT: 4,
  DELETE: 8,
  UPDATE: 16,
} as const;
const EXPECTED_PROJECTION_STATE_EVENT_TRIGGER = {
  relation: "ai.operational_memory_projection_state_events",
  name: "operational_memory_projection_state_events_append_only",
  enabled: "O",
  type:
    POSTGRES_TRIGGER_TYPE.ROW |
    POSTGRES_TRIGGER_TYPE.BEFORE |
    POSTGRES_TRIGGER_TYPE.DELETE |
    POSTGRES_TRIGGER_TYPE.UPDATE,
  function: "ai.reject_operational_memory_immutable_mutation()",
  constraintOid: 0,
  deferrable: false,
  initiallyDeferred: false,
} as const;

const sha256 = (value: string): string =>
  `sha256:${createHash("sha256").update(value).digest("hex")}`;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

const existingEntry = {
  migration_id: "202607260001_eligible_proposal_persistence",
  sequence: 202607260001,
  description:
    "Add eligible proposal persistence and execution projection foundation",
  checksum: EXISTING_MIGRATION_CHECKSUM,
  apply_script:
    "db/migrations/202607260001_eligible_proposal_persistence.sql",
  verification_script:
    "db/migrations/202607260001_eligible_proposal_persistence.verify.sql",
  created_at: "2026-07-26T00:00:00.000Z",
} satisfies FarmOsCoreMigrationEntry;

const prepareEntry = {
  migration_id: MIGRATION_ID,
  sequence: 202607300001,
  description:
    "Prepare exact five-state storage compatibility for Operational Memory projections",
  checksum: MIGRATION_CHECKSUM,
  apply_script: APPLY_PATH,
  verification_script: VERIFY_PATH,
  created_at: "2026-07-30T00:00:00.000Z",
} satisfies FarmOsCoreMigrationEntry;

const manifestFixture = (
  migrations: readonly FarmOsCoreMigrationEntry[],
) => ({
  manifest_version: "farmos.core-db-provisioning-manifest.v1",
  startup_auto_apply: false,
  production_apply_authority: "authenticated_human_operator",
  history_table: "core_schema.migration_history",
  migrations,
});

const singleEntryFixture = manifestFixture([prepareEntry]);
const multiEntryFixture = manifestFixture([existingEntry, prepareEntry]);

assert.deepEqual(
  parseFarmOsCoreMigrationManifest(singleEntryFixture),
  singleEntryFixture,
);
assert.deepEqual(
  parseFarmOsCoreMigrationManifest(multiEntryFixture),
  multiEntryFixture,
);

const manifestRaw = JSON.parse(
  readFileSync("db/provisioning/manifest.json", "utf8"),
) as unknown;
const manifest = parseFarmOsCoreMigrationManifest(manifestRaw);
assert.ok(manifest);
const manifestPrepareEntries = manifest.migrations.filter(
  (entry) => entry.migration_id === MIGRATION_ID,
);
assert.equal(manifestPrepareEntries.length, 1);
assert.deepEqual(manifestPrepareEntries[0], prepareEntry);
assert.equal(manifestPrepareEntries[0]?.apply_script, APPLY_PATH);
assert.equal(manifestPrepareEntries[0]?.verification_script, VERIFY_PATH);
assert.equal(manifest.startup_auto_apply, false);
assert.equal(
  manifest.production_apply_authority,
  "authenticated_human_operator",
);

for (const entry of manifest.migrations) {
  assert.equal(entry.sequence, Number(entry.migration_id.slice(0, 12)));
  assert.equal(entry.apply_script, `db/migrations/${entry.migration_id}.sql`);
  assert.equal(
    entry.verification_script,
    `db/migrations/${entry.migration_id}.verify.sql`,
  );
}
const stableChangesEntry = manifest.migrations.find((entry) =>
  entry.migration_id === STABLE_CHANGES_PERSISTENCE_ID
);
assert.ok(stableChangesEntry);
assert.equal(stableChangesEntry.apply_script, STABLE_CHANGES_APPLY_PATH);
assert.equal(stableChangesEntry.verification_script, STABLE_CHANGES_VERIFY_PATH);
assert.equal(
  stableChangesEntry.checksum,
  sha256(readFileSync(STABLE_CHANGES_APPLY_PATH, "utf8")),
);
assert.ok(readFileSync(STABLE_CHANGES_VERIFY_PATH, "utf8").length > 0);

const stored = (entry: FarmOsCoreMigrationEntry) => ({
  migration_id: entry.migration_id,
  sequence: entry.sequence,
  checksum: entry.checksum,
});
const pendingPlan = planFarmOsCoreMigrations({
  manifest: manifestRaw,
  stored: [stored(existingEntry)],
});
assert.equal(pendingPlan.result, "ready");
assert.deepEqual(
  pendingPlan.result === "ready"
    ? pendingPlan.pending.map((entry) => entry.migration_id)
    : [],
  [MIGRATION_ID, ACTIVATION_ID, COMMAND_LEDGER_ID, STABLE_CHANGES_PERSISTENCE_ID],
);
const activationPendingPlan = planFarmOsCoreMigrations({
  manifest: manifestRaw,
  stored: [stored(existingEntry), stored(prepareEntry)],
});
assert.equal(activationPendingPlan.result, "ready");
assert.deepEqual(
  activationPendingPlan.result === "ready"
    ? activationPendingPlan.pending.map((entry) => entry.migration_id)
    : [],
  [ACTIVATION_ID, COMMAND_LEDGER_ID, STABLE_CHANGES_PERSISTENCE_ID],
);
assert.equal(
  planFarmOsCoreMigrations({
    manifest: manifestRaw,
    stored: manifest.migrations.map(stored),
  }).result,
  "already_applied",
);

type MutableManifestFixture = {
  migrations: Array<Record<string, unknown>>;
};
const invalidFixture = (
  mutate: (entry: Record<string, unknown>) => void,
): MutableManifestFixture => {
  const fixture = structuredClone(
    multiEntryFixture,
  ) as unknown as MutableManifestFixture;
  mutate(fixture.migrations[1]!);
  return fixture;
};

assert.equal(
  parseFarmOsCoreMigrationManifest(
    invalidFixture((entry) => {
      entry.sequence = 202607300002;
    }),
  ),
  null,
);
assert.equal(
  parseFarmOsCoreMigrationManifest(
    invalidFixture((entry) => {
      entry.migration_id =
        "202607300002_daily_operational_projection_candidate_foundation";
    }),
  ),
  null,
);
assert.equal(
  parseFarmOsCoreMigrationManifest(
    invalidFixture((entry) => {
      entry.apply_script = "db/migrations/202607300001_wrong.sql";
    }),
  ),
  null,
);
assert.equal(
  parseFarmOsCoreMigrationManifest(
    invalidFixture((entry) => {
      entry.verification_script =
        "db/migrations/202607300001_wrong.verify.sql";
    }),
  ),
  null,
);
assert.equal(
  parseFarmOsCoreMigrationManifest(
    invalidFixture((entry) => {
      entry.apply_script =
        "db/migrations/../202607300001_daily_operational_projection_candidate_foundation.sql";
    }),
  ),
  null,
);
assert.equal(
  parseFarmOsCoreMigrationManifest(
    invalidFixture((entry) => {
      entry.verification_script =
        "db/migrations/../202607300001_daily_operational_projection_candidate_foundation.verify.sql";
    }),
  ),
  null,
);

const applySql = readFileSync(APPLY_PATH, "utf8");
const verifySql = readFileSync(VERIFY_PATH, "utf8");
const day146Sql = readFileSync(DAY146_SQL_PATH, "utf8");
const existingMigrationSql = readFileSync(existingEntry.apply_script, "utf8");

assert.equal(sha256(applySql), MIGRATION_CHECKSUM);
assert.equal(sha256(verifySql), VERIFY_CHECKSUM);
assert.equal(sha256(existingMigrationSql), EXISTING_MIGRATION_CHECKSUM);
assert.equal(
  createHash("sha256").update(day146Sql).digest("hex"),
  DAY146_SQL_CHECKSUM,
);
assert.match(
  day146Sql,
  /create or replace function ai\.persist_operational_memory_bundle\(\s*p_snapshots jsonb,\s*p_snapshot_events jsonb,\s*p_projections jsonb,\s*p_projection_events jsonb,\s*p_lineage jsonb,\s*p_rejections jsonb\s*\)/u,
);
assert.ok(
  day146Sql.indexOf(
    "insert into ai.operational_memory_daily_projections",
  ) <
    day146Sql.indexOf(
      "insert into ai.operational_memory_projection_state_events",
    ),
);
assert.equal(EXPECTED_PROJECTION_STATE_EVENT_TRIGGER.type, 27);
assert.notEqual(
  EXPECTED_PROJECTION_STATE_EVENT_TRIGGER.type & POSTGRES_TRIGGER_TYPE.ROW,
  0,
);
assert.notEqual(
  EXPECTED_PROJECTION_STATE_EVENT_TRIGGER.type &
    POSTGRES_TRIGGER_TYPE.BEFORE,
  0,
);
assert.equal(
  EXPECTED_PROJECTION_STATE_EVENT_TRIGGER.type &
    POSTGRES_TRIGGER_TYPE.INSERT,
  0,
);
assert.notEqual(
  EXPECTED_PROJECTION_STATE_EVENT_TRIGGER.type & POSTGRES_TRIGGER_TYPE.DELETE,
  0,
);
assert.notEqual(
  EXPECTED_PROJECTION_STATE_EVENT_TRIGGER.type & POSTGRES_TRIGGER_TYPE.UPDATE,
  0,
);
assert.equal(EXPECTED_PROJECTION_STATE_EVENT_TRIGGER.constraintOid, 0);
assert.equal(EXPECTED_PROJECTION_STATE_EVENT_TRIGGER.deferrable, false);
assert.equal(EXPECTED_PROJECTION_STATE_EVENT_TRIGGER.initiallyDeferred, false);
assert.match(
  day146Sql,
  new RegExp(
    `'${EXPECTED_PROJECTION_STATE_EVENT_TRIGGER.relation.split(".")[1]}'`,
    "u",
  ),
);
assert.match(
  day146Sql,
  /trigger_name := table_name \|\| '_append_only'/u,
);
assert.match(
  day146Sql,
  new RegExp(
    `create trigger %I before update or delete on ai\\.%I[\\s\\S]*for each row execute function[\\s\\S]*${escapeRegExp(EXPECTED_PROJECTION_STATE_EVENT_TRIGGER.function)}`,
    "u",
  ),
);

const compactApply = applySql.replace(/\s+/gu, "");
const compactVerify = verifySql.replace(/\s+/gu, "");
assert.match(applySql, /^-- FarmOS Core immutable forward-only migration\./u);
assert.match(applySql, /\bbegin\s*;/u);
assert.match(applySql, /\bcommit\s*;\s*$/u);
assert.match(applySql, /pg_catalog\.to_regnamespace\('ai'\)/u);
assert.match(
  applySql,
  /class_row\.relname = 'operational_memory_projection_state_events'/u,
);
assert.match(applySql, /class_row\.relkind = 'r'/u);
assert.match(
  applySql,
  /select attribute\.attnum, attribute\.attnotnull\s+into status_attribute, status_not_null/u,
);
assert.match(applySql, /status_not_null is not true/u);
assert.match(applySql, /status_check_count <> 1/u);
assert.match(applySql, /old_constraint_validated is not true/u);
assert.match(
  applySql,
  /old_constraint_definition\s*<>\s*'CHECK\(\(status=ANY\(ARRAY\[''active''::text,''superseded''::text,''failed''::text\]\)\)\)'/u,
);
assert.match(
  compactApply,
  /check\(statusin\(''candidate'',''active'',''rejected'',''superseded'',''failed''\)\)notvalid/u,
);
assert.match(
  applySql,
  /where event\.status not in \(\s*'candidate',\s*'active',\s*'rejected',\s*'superseded',\s*'failed'\s*\)/u,
);
assert.match(applySql, /drop constraint %I/u);

const addConstraint = compactApply.indexOf(
  "addconstraintoperational_memory_projection_state_events_status_day147_check",
);
const validateConstraint = compactApply.indexOf(
  "validateconstraintoperational_memory_projection_state_events_status_day147_check",
);
const dropOldConstraint = compactApply.indexOf("dropconstraint%I");
assert.ok(addConstraint >= 0);
assert.ok(validateConstraint > addConstraint);
assert.ok(dropOldConstraint > validateConstraint);

assert.doesNotMatch(
  applySql,
  /ai\.enforce_operational_memory_projection_state_transition/u,
);
assert.doesNotMatch(
  applySql,
  /operational_memory_projection_state_transition_guard/u,
);
assert.doesNotMatch(
  applySql,
  /ai\.require_operational_memory_initial_candidate_event/u,
);
assert.doesNotMatch(
  applySql,
  /operational_memory_projection_initial_candidate_guard/u,
);
assert.doesNotMatch(applySql, /\bcreate\s+(?:unique\s+)?index\b/iu);
assert.doesNotMatch(
  applySql,
  /(?:row_number|lag)\s*\(|state_history_(?:missing|invalid)/iu,
);
assert.doesNotMatch(
  applySql,
  /create or replace function ai\.persist_operational_memory_bundle/iu,
);
assert.doesNotMatch(
  applySql,
  /\b(?:insert\s+into|update|delete|truncate)\s+(?:from\s+)?ai\.operational_memory_/iu,
);
assert.doesNotMatch(
  applySql,
  /\bgrant\b|\brevoke\b|\balter\s+(?:table|function)\b[^;]*\bowner\s+to\b/iu,
);

assert.match(verifySql, /^begin transaction read only;/u);
assert.doesNotMatch(verifySql, /\bcommit\s*;/iu);
assert.match(verifySql, /\brollback\s*;\s*$/iu);
assert.match(verifySql, new RegExp(MIGRATION_ID, "u"));
assert.match(verifySql, new RegExp(MIGRATION_CHECKSUM, "u"));
assert.match(
  verifySql,
  /select attribute\.attnum, attribute\.attnotnull\s+into status_attribute, status_not_null/u,
);
assert.match(verifySql, /status_not_null is not true/u);
assert.match(
  verifySql,
  /status_check_definition\s*<>\s*'CHECK\(\(status=ANY\(ARRAY\[''candidate''::text,''active''::text,''rejected''::text,''superseded''::text,''failed''::text\]\)\)\)'/u,
);
assert.match(
  verifySql,
  /'CHECK\(\(status=ANY\(ARRAY\[''active''::text,''superseded''::text,''failed''::text\]\)\)\)'/u,
);
assert.match(
  verifySql,
  new RegExp(
    `pg_catalog\\.to_regprocedure\\(\\s*'${escapeRegExp(EXPECTED_PROJECTION_STATE_EVENT_TRIGGER.function)}'\\s*\\)`,
    "u",
  ),
);
assert.match(
  verifySql,
  new RegExp(
    `pg_catalog\\.to_regclass\\('${escapeRegExp(EXPECTED_PROJECTION_STATE_EVENT_TRIGGER.relation)}'\\)`,
    "u",
  ),
);

const statementContaining = (source: string, marker: string): string => {
  const markerIndex = source.indexOf(marker);
  assert.ok(markerIndex >= 0, `missing SQL marker: ${marker}`);
  const statementStart = source.lastIndexOf("  select", markerIndex);
  const statementEnd = source.indexOf(";", markerIndex);
  assert.ok(statementStart >= 0, `missing SELECT for SQL marker: ${marker}`);
  assert.ok(statementEnd > markerIndex, `missing terminator for SQL marker: ${marker}`);
  return source.slice(statementStart, statementEnd + 1);
};

const triggerEnumerationSql = statementContaining(
  verifySql,
  "into noninternal_trigger_count, unexpected_trigger_count",
);
assert.match(triggerEnumerationSql, /from pg_catalog\.pg_trigger/u);
assert.match(
  triggerEnumerationSql,
  /trigger_row\.tgrelid = projection_events_table/u,
);
assert.match(triggerEnumerationSql, /not trigger_row\.tgisinternal/u);
assert.match(triggerEnumerationSql, /pg_catalog\.count\(\*\) filter/u);
assert.match(
  triggerEnumerationSql,
  new RegExp(
    `trigger_row\\.tgname <>\\s*'${EXPECTED_PROJECTION_STATE_EVENT_TRIGGER.name}'`,
    "u",
  ),
);
assert.match(
  triggerEnumerationSql,
  new RegExp(
    `trigger_row\\.tgenabled <> '${EXPECTED_PROJECTION_STATE_EVENT_TRIGGER.enabled}'`,
    "u",
  ),
);
assert.match(
  triggerEnumerationSql,
  new RegExp(
    `trigger_row\\.tgtype <> ${EXPECTED_PROJECTION_STATE_EVENT_TRIGGER.type}`,
    "u",
  ),
);
assert.match(
  triggerEnumerationSql,
  /trigger_row\.tgfoid <> append_only_function/u,
);
assert.match(
  triggerEnumerationSql,
  new RegExp(
    `trigger_row\\.tgconstraint <> ${EXPECTED_PROJECTION_STATE_EVENT_TRIGGER.constraintOid}`,
    "u",
  ),
);
assert.match(triggerEnumerationSql, /trigger_row\.tgdeferrable/u);
assert.match(triggerEnumerationSql, /trigger_row\.tginitdeferred/u);

const constraintTriggerSql = statementContaining(
  verifySql,
  "into constraint_trigger_count",
);
assert.match(constraintTriggerSql, /from pg_catalog\.pg_trigger/u);
assert.match(
  constraintTriggerSql,
  /left join pg_catalog\.pg_constraint/u,
);
assert.match(
  constraintTriggerSql,
  /trigger_constraint\.oid = trigger_row\.tgconstraint/u,
);
assert.match(
  constraintTriggerSql,
  /trigger_row\.tgrelid = projection_events_table/u,
);
assert.match(constraintTriggerSql, /not trigger_row\.tgisinternal/u);
assert.match(constraintTriggerSql, /trigger_row\.tgconstraint <> 0/u);
assert.match(
  constraintTriggerSql,
  /trigger_constraint\.oid is not null/u,
);
assert.match(constraintTriggerSql, /trigger_row\.tgdeferrable/u);
assert.match(constraintTriggerSql, /trigger_row\.tginitdeferred/u);

const partialUniqueIndexSql = statementContaining(
  verifySql,
  "into partial_unique_index_count, valid_partial_unique_index_count",
);
assert.match(partialUniqueIndexSql, /from pg_catalog\.pg_index/u);
assert.match(
  partialUniqueIndexSql,
  /index_row\.indrelid = projection_events_table/u,
);
assert.match(partialUniqueIndexSql, /index_row\.indisunique/u);
assert.match(partialUniqueIndexSql, /index_row\.indisvalid/u);
assert.match(partialUniqueIndexSql, /index_row\.indpred is not null/u);

const triggerFailClosedBlock = verifySql.match(
  /if noninternal_trigger_count <> 1[\s\S]*?end if;/u,
)?.[0];
assert.ok(triggerFailClosedBlock);
assert.match(triggerFailClosedBlock, /unexpected_trigger_count <> 0/u);
assert.match(triggerFailClosedBlock, /constraint_trigger_count <> 0/u);
assert.match(triggerFailClosedBlock, /partial_unique_index_count <> 0/u);
assert.match(
  triggerFailClosedBlock,
  /valid_partial_unique_index_count <> 0/u,
);
assert.match(triggerFailClosedBlock, /or not exists \(/u);
assert.match(
  triggerFailClosedBlock,
  new RegExp(
    `trigger_row\\.tgname =\\s*'${EXPECTED_PROJECTION_STATE_EVENT_TRIGGER.name}'`,
    "u",
  ),
);
assert.match(
  triggerFailClosedBlock,
  new RegExp(
    `trigger_row\\.tgenabled = '${EXPECTED_PROJECTION_STATE_EVENT_TRIGGER.enabled}'`,
    "u",
  ),
);
assert.match(
  triggerFailClosedBlock,
  new RegExp(
    `trigger_row\\.tgtype = ${EXPECTED_PROJECTION_STATE_EVENT_TRIGGER.type}`,
    "u",
  ),
);
assert.match(
  triggerFailClosedBlock,
  /trigger_row\.tgfoid = append_only_function/u,
);
assert.match(triggerFailClosedBlock, /trigger_row\.tgconstraint = 0/u);
assert.match(triggerFailClosedBlock, /not trigger_row\.tgdeferrable/u);
assert.match(triggerFailClosedBlock, /not trigger_row\.tginitdeferred/u);
assert.match(triggerFailClosedBlock, /not trigger_row\.tgisinternal/u);
assert.match(
  triggerFailClosedBlock,
  /raise exception\s+'daily_operational_projection_candidate_prepare_verification_failed'/u,
);

assert.match(
  verifySql,
  /'ai\.enforce_operational_memory_projection_state_transition\(\)'\s*\)\s*is not null/u,
);
assert.match(
  verifySql,
  /trigger_row\.tgname =\s*'operational_memory_projection_state_transition_guard'/u,
);
assert.match(
  verifySql,
  /'ai\.require_operational_memory_initial_candidate_event\(\)'\s*\)\s*is not null/u,
);
assert.match(
  verifySql,
  /trigger_row\.tgname =\s*'operational_memory_projection_initial_candidate_guard'/u,
);
assert.match(verifySql, /'compatibility_prepare'::text as deployment_mode/u);
assert.match(verifySql, /false as candidate_first_enforced/u);
assert.match(verifySql, /true as day146_writer_compatible/u);
assert.match(verifySql, /false as transition_trigger_created/u);
assert.match(verifySql, /false as initial_candidate_constraint_created/u);
assert.match(verifySql, /0::integer as partial_unique_indexes_created/u);

assert.doesNotMatch(
  `${applySql}\n${verifySql}`,
  /service_role|authorization|bearer|api[_-]?key|password|secret|production_/iu,
);
const packageDocument = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
assert.equal(
  packageDocument.scripts["test-farm-os-day147a-migration-authority"],
  "tsx scripts/hermes/test_farm_os_day147a_migration_authority.ts",
);
assert.equal(
  packageDocument.scripts["typecheck-farm-os-day147a-migration-manifest"],
  "tsc --ignoreConfig --noEmit --strict --skipLibCheck --target ES2022 --lib ES2022,DOM --types node --module ESNext --moduleResolution Bundler --esModuleInterop src/lib/hermes/farm_os_core_db_migration_manifest.ts",
);

console.log("farm_os_day147a_prepare_migration_authority: PASS");
