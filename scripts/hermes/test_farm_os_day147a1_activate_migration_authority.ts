import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  parseFarmOsCoreMigrationManifest,
  planFarmOsCoreMigrations,
  type FarmOsCoreMigrationEntry,
} from "../../src/lib/hermes/farm_os_core_db_migration_manifest";

const PREPARE_ID =
  "202607300001_daily_operational_projection_candidate_foundation";
const PREPARE_CHECKSUM =
  "sha256:350489282b921b879a9c4fab8280cfd38ff7432ed75cc70a905a7dabd45846bf";
const ACTIVATION_ID =
  "202607310001_daily_operational_projection_candidate_activation";
const ACTIVATION_CHECKSUM =
  "sha256:ab88f3c33d4befc340e75a105f5c76ee0ba590aa8c65043e863dded6c352774a";
const APPLY_PATH = `db/migrations/${ACTIVATION_ID}.sql`;
const VERIFY_PATH = `db/migrations/${ACTIVATION_ID}.verify.sql`;
const DAY146_SQL_PATH =
  "scripts/sql/day146_operational_memory_snapshot_persistence.sql";
const DAY146_SQL_CHECKSUM =
  "017c69c6cbfcf8efbe2cd042c32cfb88a848b6f48d65f23189f47dc22e6cefdc";

const sha256 = (value: string): string =>
  `sha256:${createHash("sha256").update(value).digest("hex")}`;
const compact = (value: string): string => value.replace(/\s+/gu, "");
const quotedValues = (value: string): string[] =>
  [...value.matchAll(/'([^']+)'/gu)].map((match) => match[1]!);

const applySql = readFileSync(APPLY_PATH, "utf8");
const verifySql = readFileSync(VERIFY_PATH, "utf8");
const prepareSql = readFileSync(`db/migrations/${PREPARE_ID}.sql`, "utf8");
const prepareVerifySql = readFileSync(
  `db/migrations/${PREPARE_ID}.verify.sql`,
  "utf8",
);
const day146Sql = readFileSync(DAY146_SQL_PATH, "utf8");
const persistenceSource = readFileSync(
  "src/lib/hermes/farm_os_operational_memory_persistence.ts",
  "utf8",
);
const postgresRepositorySource = readFileSync(
  "src/lib/hermes/farm_os_operational_memory_postgres_repository.ts",
  "utf8",
);

const manifestRaw = JSON.parse(
  readFileSync("db/provisioning/manifest.json", "utf8"),
) as unknown;
const manifest = parseFarmOsCoreMigrationManifest(manifestRaw);
assert.ok(manifest);
assert.equal(manifest.startup_auto_apply, false);
assert.equal(
  manifest.production_apply_authority,
  "authenticated_human_operator",
);
assert.deepEqual(
  manifest.migrations.map((entry) => entry.sequence),
  [202607260001, 202607300001, 202607310001],
);

const prepareEntry = manifest.migrations.find((entry) =>
  entry.migration_id === PREPARE_ID
);
assert.ok(prepareEntry);
assert.deepEqual(prepareEntry, {
  migration_id: PREPARE_ID,
  sequence: 202607300001,
  description:
    "Prepare exact five-state storage compatibility for Operational Memory projections",
  checksum: PREPARE_CHECKSUM,
  apply_script: `db/migrations/${PREPARE_ID}.sql`,
  verification_script: `db/migrations/${PREPARE_ID}.verify.sql`,
  created_at: "2026-07-30T00:00:00.000Z",
} satisfies FarmOsCoreMigrationEntry);
assert.equal(sha256(prepareSql), PREPARE_CHECKSUM);
assert.match(prepareVerifySql, /compatibility_prepare/u);
assert.doesNotMatch(
  prepareSql,
  /enforce_operational_memory_projection_state_transition/u,
);

const activationEntry = manifest.migrations.at(-1);
assert.ok(activationEntry);
assert.deepEqual(activationEntry, {
  migration_id: ACTIVATION_ID,
  sequence: 202607310001,
  description:
    "Activate strict Candidate-first lifecycle enforcement for Operational Memory projections",
  checksum: ACTIVATION_CHECKSUM,
  apply_script: APPLY_PATH,
  verification_script: VERIFY_PATH,
  created_at: "2026-07-31T00:00:00.000Z",
} satisfies FarmOsCoreMigrationEntry);
assert.equal(sha256(applySql), ACTIVATION_CHECKSUM);
assert.equal(activationEntry.checksum, sha256(applySql));
assert.match(applySql, /^-- FarmOS Core immutable forward-only migration\./u);
assert.match(applySql, /\bbegin\s*;/u);
assert.match(applySql, /\bcommit\s*;\s*$/u);
assert.doesNotMatch(
  applySql,
  /\bdrop\s+(?:table|schema|constraint|column|function|index)\b/iu,
);

const ids = manifest.migrations.map((entry) => entry.migration_id);
const applyPaths = manifest.migrations.map((entry) => entry.apply_script);
const verifyPaths = manifest.migrations.map(
  (entry) => entry.verification_script,
);
assert.equal(new Set(ids).size, ids.length);
assert.equal(new Set(applyPaths).size, applyPaths.length);
assert.equal(new Set(verifyPaths).size, verifyPaths.length);
assert.deepEqual(
  [...manifest.migrations]
    .map((entry) => entry.sequence)
    .sort((left, right) => left - right),
  manifest.migrations.map((entry) => entry.sequence),
);
for (const entry of manifest.migrations) {
  assert.equal(entry.sequence, Number(entry.migration_id.slice(0, 12)));
  assert.equal(entry.apply_script, `db/migrations/${entry.migration_id}.sql`);
  assert.equal(
    entry.verification_script,
    `db/migrations/${entry.migration_id}.verify.sql`,
  );
}

const functionBody = (name: string, label: string): string => {
  const match = applySql.match(
    new RegExp(
      `create function ${name.replace(/[.()]/gu, "\\$&")}\\s*`
        + `[\\s\\S]*?as \\$${label}\\$([\\s\\S]*?)\\$${label}\\$;`,
      "u",
    ),
  );
  assert.ok(match, `missing function ${name}`);
  return match[1]!;
};
const transitionBody = functionBody(
  "ai.enforce_operational_memory_projection_state_transition()",
  "day147_a1_activate_transition",
);
const initialCandidateBody = functionBody(
  "ai.require_operational_memory_initial_candidate_event()",
  "day147_a1_activate_initial_candidate",
);

const EXPECTED_TRANSITIONS = new Set([
  "missing->candidate",
  "candidate->active",
  "candidate->rejected",
  "candidate->failed",
  "active->superseded",
]);

const validateTransitionSemantics = (body: string): void => {
  assert.match(body, /allowed_transition boolean := false;/u);
  const actualTransitions = new Set<string>();
  const initialTransition = body.match(
    /when previous_status is null then\s+new\.status = '([^']+)'/u,
  );
  assert.ok(initialTransition);
  actualTransitions.add(`missing->${initialTransition[1]}`);
  const candidateTransition = body.match(
    /when previous_status = 'candidate' then\s+new\.status = any\(array\[([^\]]+)\]::text\[\]\)/u,
  );
  assert.ok(candidateTransition);
  for (const state of quotedValues(candidateTransition[1]!)) {
    actualTransitions.add(`candidate->${state}`);
  }
  const activeTransition = body.match(
    /when previous_status = 'active' then\s+new\.status = '([^']+)'/u,
  );
  assert.ok(activeTransition);
  actualTransitions.add(`active->${activeTransition[1]}`);
  assert.deepEqual(actualTransitions, EXPECTED_TRANSITIONS);
  assert.deepEqual(
    [...body.matchAll(/when previous_status (?:is null|= '[^']+') then/gu)]
      .map((match) => match[0]),
    [
      "when previous_status is null then",
      "when previous_status = 'candidate' then",
      "when previous_status = 'active' then",
    ],
  );
  assert.equal(
    (body.match(/allowed_transition\s*(?::=|=(?!=))/gu) ?? []).length,
    1,
  );
  assert.match(body, /allowed_transition := case[\s\S]*else false\s+end;/u);
  assert.match(
    body,
    /if allowed_transition is not true then[\s\S]*?raise exception using[\s\S]*?message = 'operational_memory_projection_state_transition_invalid';\s+end if;/u,
  );

  const bindingPosition = body.indexOf(
    "select projection.business_date, projection.projection_type",
  );
  const lockPosition = body.indexOf(
    "perform pg_catalog.pg_advisory_xact_lock(",
  );
  const previousStatePosition = body.indexOf(
    "select event.status, event.event_sequence",
  );
  const transitionDecisionPosition = body.indexOf(
    "allowed_transition := case",
  );
  const invalidTransitionRaisePosition = body.indexOf(
    "message = 'operational_memory_projection_state_transition_invalid'",
  );
  const activeBranchPosition = body.indexOf(
    "if new.status = 'active'",
  );
  const activeConflictPosition = body.indexOf(
    "select 1",
    activeBranchPosition,
  );
  const returnPosition = body.indexOf("return new;");
  assert.ok(bindingPosition >= 0);
  assert.ok(lockPosition > bindingPosition);
  assert.ok(previousStatePosition > lockPosition);
  assert.ok(transitionDecisionPosition > previousStatePosition);
  assert.ok(invalidTransitionRaisePosition > transitionDecisionPosition);
  assert.ok(activeBranchPosition > invalidTransitionRaisePosition);
  assert.ok(activeConflictPosition > activeBranchPosition);
  assert.ok(activeConflictPosition > transitionDecisionPosition);
  assert.ok(activeConflictPosition > lockPosition);
  assert.ok(returnPosition > activeConflictPosition);
  assert.match(
    body,
    /from ai\.operational_memory_daily_projections as projection\s+where projection\.projection_id = new\.projection_id;/u,
  );
  assert.match(body, /if not found then/u);

  const bindingStatement = body.match(
    /select projection\.business_date, projection\.projection_type[\s\S]*?where projection\.projection_id = new\.projection_id;/u,
  );
  assert.ok(bindingStatement);
  assert.ok(
    bindingPosition + bindingStatement[0].length <= lockPosition,
    "Projection binding query and lock must be separate ordered statements",
  );
  const lockStatement = body.match(
    /perform pg_catalog\.pg_advisory_xact_lock\(([\s\S]*?)\);/u,
  );
  assert.ok(lockStatement);
  assert.ok(
    lockPosition + lockStatement[0].length <= previousStatePosition,
    "lock and previous-state query must be separate ordered statements",
  );
  const previousStateStatement = body.match(
    /select event\.status, event\.event_sequence[\s\S]*?limit 1;/u,
  );
  assert.ok(previousStateStatement);
  assert.ok(
    previousStatePosition + previousStateStatement[0].length
      <= transitionDecisionPosition,
    "previous-state query and transition decision must be separate statements",
  );
  assert.match(
    lockStatement[1]!,
    /projection_business_date - date '2000-01-01'/u,
  );
  assert.match(lockStatement[1]!, /pg_catalog\.hashtext/u);
  assert.match(lockStatement[1]!, /projection_type/u);
  assert.doesNotMatch(
    lockStatement[1]!,
    /projection_id|projection_content|content_hash|payload|source_/u,
  );
  assert.doesNotMatch(body, /\bpg_advisory_lock\s*\(/u);

  assert.match(
    body,
    /new\.event_sequence is null[\s\S]*new\.event_sequence < 1/u,
  );
  assert.match(body, /new\.event_sequence <= previous_sequence/u);
  assert.match(
    body,
    /order by event\.event_sequence desc\s+limit 1/u,
  );

  const activeConflictEnd = body.indexOf(
    "message = 'operational_memory_projection_active_scope_conflict'",
    activeConflictPosition,
  );
  assert.ok(activeConflictEnd > activeConflictPosition);
  const activeConflictBlock = body.slice(
    activeConflictPosition,
    activeConflictEnd,
  );
  assert.match(
    activeConflictBlock,
    /join lateral \([\s\S]*from ai\.operational_memory_projection_state_events as other_event[\s\S]*where other_event\.projection_id = other_projection\.projection_id[\s\S]*order by other_event\.event_sequence desc\s+limit 1\s+\) as latest_state on true/u,
  );
  assert.match(
    activeConflictBlock,
    /other_projection\.business_date = projection_business_date/u,
  );
  assert.match(
    activeConflictBlock,
    /other_projection\.projection_type = projection_type/u,
  );
  assert.match(
    activeConflictBlock,
    /other_projection\.projection_id <> new\.projection_id/u,
  );
  assert.match(activeConflictBlock, /latest_state\.status = 'active'/u);

  const fixedErrors = new Map(
    [...body.matchAll(
      /raise exception using\s+errcode = '([0-9A-Z]{5})',\s+message = '([^']+)'/gu,
    )].map((match) => [match[2]!, match[1]!] as const),
  );
  assert.equal(
    fixedErrors.get("operational_memory_projection_binding_missing"),
    "23503",
  );
  assert.equal(
    fixedErrors.get("operational_memory_projection_event_sequence_invalid"),
    "23514",
  );
  assert.equal(
    fixedErrors.get("operational_memory_projection_state_transition_invalid"),
    "23514",
  );
  assert.equal(
    fixedErrors.get("operational_memory_projection_active_scope_conflict"),
    "23505",
  );
  for (const raiseBlock of body.matchAll(
    /raise exception using[\s\S]*?;/gu,
  )) {
    assert.doesNotMatch(
      raiseBlock[0],
      /\|\||projection_content|content_hash|payload|source_record|new\.projection_id/iu,
    );
  }

  assert.deepEqual(
    [...body.matchAll(/\breturn\s+([^;]+);/gu)].map((match) =>
      `return ${match[1]!.trim()};`
    ),
    ["return new;"],
  );
  assert.doesNotMatch(
    body,
    /highest|projection_version[\s\S]*(?:winner|max)|auto.*supersede/iu,
  );
};

validateTransitionSemantics(transitionBody);
assert.match(
  applySql,
  /hashtext can only cause safe false contention[\s\S]*32-bit output/u,
);
assert.match(applySql, /transaction lock is database-local/u);

const lockStatement = transitionBody.match(
  /perform pg_catalog\.pg_advisory_xact_lock\([\s\S]*?\);/u,
)?.[0];
assert.ok(lockStatement);
const replaceExactly = (
  source: string,
  from: string,
  to: string,
): string => {
  assert.notEqual(from, to);
  assert.equal(source.split(from).length - 1, 1);
  const mutated = source.replace(from, to);
  assert.notEqual(mutated, source);
  return mutated;
};
const requiredMemoryMutations: string[] = [];
const assertRejectedMutation = (
  name: string,
  original: string,
  mutate: (source: string) => string,
  checker: (source: string) => void,
): void => {
  const cloned = structuredClone(original);
  assert.equal(cloned, original);
  const mutated = mutate(cloned);
  assert.notEqual(mutated, original, `${name}: mutation was not applied`);
  assert.throws(() => checker(mutated), `${name}: checker accepted mutation`);
  requiredMemoryMutations.push(name);
};

const previousStateStatement = transitionBody.match(
  /  select event\.status, event\.event_sequence[\s\S]*?  limit 1;/u,
)?.[0];
assert.ok(previousStateStatement);

assertRejectedMutation(
  "transition_removed",
  transitionBody,
  (source) =>
    replaceExactly(
      source,
      "'active', 'rejected', 'failed'",
      "'active', 'failed'",
    ),
  validateTransitionSemantics,
);
assertRejectedMutation(
  "transition_added",
  transitionBody,
  (source) =>
    replaceExactly(
      source,
      "'active', 'rejected', 'failed'",
      "'active', 'rejected', 'failed', 'superseded'",
    ),
  validateTransitionSemantics,
);
assertRejectedMutation(
  "transition_overwritten_colon_equal",
  transitionBody,
  (source) =>
    replaceExactly(
      source,
      "  if allowed_transition is not true then",
      "  allowed_transition := true;\n\n  if allowed_transition is not true then",
    ),
  validateTransitionSemantics,
);
assertRejectedMutation(
  "transition_overwritten_equal",
  transitionBody,
  (source) =>
    replaceExactly(
      source,
      "  if allowed_transition is not true then",
      "  allowed_transition = true;\n\n  if allowed_transition is not true then",
    ),
  validateTransitionSemantics,
);
assertRejectedMutation(
  "lock_removed",
  transitionBody,
  (source) => replaceExactly(source, lockStatement, ""),
  validateTransitionSemantics,
);
assertRejectedMutation(
  "lock_moved_after_previous_state",
  transitionBody,
  (source) =>
    replaceExactly(
      replaceExactly(source, lockStatement, ""),
      previousStateStatement,
      `${previousStateStatement}\n\n${lockStatement}`,
    ),
  validateTransitionSemantics,
);
assertRejectedMutation(
  "lock_moved_after_active_conflict",
  transitionBody,
  (source) =>
    replaceExactly(
      replaceExactly(source, lockStatement, ""),
      "  return new;",
      `  ${lockStatement}\n\n  return new;`,
    ),
  validateTransitionSemantics,
);
assertRejectedMutation(
  "latest_desc_removed",
  transitionBody,
  (source) =>
    replaceExactly(
      source,
      "order by other_event.event_sequence desc",
      "order by other_event.event_sequence",
    ),
  validateTransitionSemantics,
);
assertRejectedMutation(
  "latest_desc_reversed",
  transitionBody,
  (source) =>
    replaceExactly(
      source,
      "order by other_event.event_sequence desc",
      "order by other_event.event_sequence asc",
    ),
  validateTransitionSemantics,
);
assertRejectedMutation(
  "self_projection_filter_removed",
  transitionBody,
  (source) =>
    replaceExactly(
      source,
      "        and other_projection.projection_id <> new.projection_id\n",
      "",
    ),
  validateTransitionSemantics,
);
assertRejectedMutation(
  "business_date_filter_removed",
  transitionBody,
  (source) =>
    replaceExactly(
      source,
      "      where other_projection.business_date = projection_business_date\n",
      "      where true\n",
    ),
  validateTransitionSemantics,
);
assertRejectedMutation(
  "projection_type_filter_removed",
  transitionBody,
  (source) =>
    replaceExactly(
      source,
      "        and other_projection.projection_type = projection_type\n",
      "",
    ),
  validateTransitionSemantics,
);
assertRejectedMutation(
  "sqlstate_changed",
  transitionBody,
  (source) =>
    replaceExactly(source, "errcode = '23503'", "errcode = '23514'"),
  validateTransitionSemantics,
);
assertRejectedMutation(
  "fixed_message_changed",
  transitionBody,
  (source) =>
    replaceExactly(
      source,
      "message = 'operational_memory_projection_state_transition_invalid'",
      "message = 'operational_memory_projection_state_transition_changed'",
    ),
  validateTransitionSemantics,
);
assertRejectedMutation(
  "return_new_changed",
  transitionBody,
  (source) => replaceExactly(source, "return new;", "return null;"),
  validateTransitionSemantics,
);

const validatePlannerActivationSemantics = (source: unknown): void => {
  const parsed = parseFarmOsCoreMigrationManifest(source);
  assert.ok(parsed);
  const activationEntries = parsed.migrations.filter(
    (entry) => entry.migration_id === ACTIVATION_ID,
  );
  assert.equal(activationEntries.length, 1);
  assert.equal(activationEntries[0]?.checksum, ACTIVATION_CHECKSUM);
  const existingEntry = parsed.migrations[0]!;
  const pending = planFarmOsCoreMigrations({
    manifest: source,
    stored: [{
      migration_id: existingEntry.migration_id,
      sequence: existingEntry.sequence,
      checksum: existingEntry.checksum,
    }],
  });
  assert.equal(pending.result, "ready");
  assert.deepEqual(
    pending.result === "ready"
      ? pending.pending.map((entry) => entry.migration_id)
      : [],
    [PREPARE_ID, ACTIVATION_ID],
  );
};
validatePlannerActivationSemantics(manifestRaw);
const plannerActivationMissing = structuredClone(manifestRaw) as {
  migrations: Array<{ migration_id?: unknown }>;
};
const plannerOriginalLength = plannerActivationMissing.migrations.length;
plannerActivationMissing.migrations =
  plannerActivationMissing.migrations.filter(
    (entry) => entry.migration_id !== ACTIVATION_ID,
  );
assert.equal(
  plannerActivationMissing.migrations.length,
  plannerOriginalLength - 1,
);
assert.equal(
  plannerActivationMissing.migrations.some(
    (entry) => entry.migration_id === ACTIVATION_ID,
  ),
  false,
);
assert.throws(
  () => validatePlannerActivationSemantics(plannerActivationMissing),
  "planner_activation_missing: checker accepted mutation",
);
requiredMemoryMutations.push("planner_activation_missing");

type IndexDefinition = {
  key: string;
  predicate: string;
};
const EXPECTED_INDEXES = new Map<string, IndexDefinition>([
    [
      "uq_operational_memory_projection_initial_candidate",
      { key: "projection_id", predicate: "status='candidate'" },
    ],
    [
      "uq_operational_memory_projection_candidate_resolution",
      {
        key: "projection_id",
        predicate: "statusin('active','rejected','failed')",
      },
    ],
    [
      "uq_operational_memory_projection_superseded",
      { key: "projection_id", predicate: "status='superseded'" },
    ],
  ]);
const validateLifecycleIndexes = (source: string): void => {
  const actualIndexes = new Map<string, IndexDefinition>();
  for (
    const match of source.matchAll(
      /create unique index\s+([a-z0-9_]+)\s+on ai\.operational_memory_projection_state_events\s*\(([^)]+)\)\s*where\s+([^;]+);/gu,
    )
  ) {
    actualIndexes.set(match[1]!, {
      key: compact(match[2]!),
      predicate: compact(match[3]!),
    });
  }
  assert.deepEqual(actualIndexes, EXPECTED_INDEXES);
  assert.doesNotMatch(
    source,
    /create\s+unique\s+index[\s\S]{0,300}business_date[\s\S]{0,300}candidate/iu,
  );
  assert.equal(
    [...actualIndexes.values()].every((definition) =>
      definition.key === "projection_id"
    ),
    true,
  );
};
validateLifecycleIndexes(applySql);
assertRejectedMutation(
  "lifecycle_predicate_changed",
  applySql,
  (source) =>
    replaceExactly(
      source,
      "where status in ('active', 'rejected', 'failed');",
      "where status in ('active', 'rejected');",
    ),
  validateLifecycleIndexes,
);

assert.match(
  applySql,
  /create trigger operational_memory_projection_state_transition_guard\s+before insert on ai\.operational_memory_projection_state_events\s+for each row\s+execute function ai\.enforce_operational_memory_projection_state_transition\(\);/u,
);
assert.match(
  applySql,
  /create constraint trigger operational_memory_projection_initial_candidate_guard\s+after insert on ai\.operational_memory_daily_projections\s+deferrable initially deferred\s+for each row\s+execute function ai\.require_operational_memory_initial_candidate_event\(\);/u,
);
assert.match(initialCandidateBody, /event_count < 1/u);
assert.match(
  initialCandidateBody,
  /initial_status is distinct from 'candidate'/u,
);
assert.match(
  initialCandidateBody,
  /event\.projection_id = new\.projection_id/gu,
);
assert.doesNotMatch(
  initialCandidateBody,
  /from ai\.operational_memory_daily_projections/u,
);

for (const functionName of [
  "enforce_operational_memory_projection_state_transition",
  "require_operational_memory_initial_candidate_event",
]) {
  const header = applySql.match(
    new RegExp(
      `create function ai\\.${functionName}\\(\\)([\\s\\S]*?)as \\$`,
      "u",
    ),
  )?.[1];
  assert.ok(header);
  assert.match(header, /security invoker/u);
  assert.match(header, /\bvolatile\b/u);
  assert.match(header, /set search_path = pg_catalog/u);
}
assert.equal(
  (applySql.match(/^revoke all on function/gmu) ?? []).length,
  2,
);
const validateFunctionRevokes = (source: string): void => {
  const compactSource = compact(source);
  for (const functionName of [
    "ai.enforce_operational_memory_projection_state_transition()",
    "ai.require_operational_memory_initial_candidate_event()",
  ]) {
    assert.ok(
      compactSource.includes(
        `revokeallonfunction${functionName}frompublic;`,
      ),
    );
    for (const role of ["anon", "authenticated"]) {
      assert.ok(
        compactSource.includes(
          `'revokeallonfunction'||'${functionName}'||'from${role}'`,
        ),
      );
    }
  }
  assert.match(source, /pg_catalog\.to_regrole\('anon'\)/u);
  assert.match(source, /pg_catalog\.to_regrole\('authenticated'\)/u);
};
validateFunctionRevokes(applySql);
assertRejectedMutation(
  "authenticated_function_revoke_removed",
  applySql,
  (source) =>
    replaceExactly(
      source,
      "      || 'ai.enforce_operational_memory_projection_state_transition() '\n"
        + "      || 'from authenticated';",
      "      || 'ai.enforce_operational_memory_projection_state_transition() '\n"
        + "      || 'from removed';",
    ),
  validateFunctionRevokes,
);
assert.doesNotMatch(applySql, /\bgrant\b/iu);

assert.match(
  day146Sql,
  /create trigger %I before update or delete on ai\\?\.%I[\s\S]*for each row execute function[\s\S]*ai\.reject_operational_memory_immutable_mutation\(\)/u,
);
assert.doesNotMatch(
  applySql,
  /drop trigger[^;]*operational_memory_projection_state_events_append_only/iu,
);
assert.doesNotMatch(
  applySql,
  /create(?: or replace)? function ai\.reject_operational_memory_immutable_mutation/iu,
);

assert.equal(
  createHash("sha256").update(day146Sql).digest("hex"),
  DAY146_SQL_CHECKSUM,
);
assert.match(
  day146Sql,
  /create table if not exists ai\.operational_memory_projection_state_events \(\s*event_id text primary key,\s*projection_id text not null\s+references ai\.operational_memory_daily_projections,[\s\S]*?event_sequence bigint generated always as identity unique/u,
);
assert.ok(
  day146Sql.indexOf("insert into ai.operational_memory_daily_projections")
    < day146Sql.indexOf(
      "insert into ai.operational_memory_projection_state_events",
    ),
);
assert.match(
  persistenceSource,
  /input\.state\.projections\.push\([\s\S]*?appendProjectionState\(\s*input\.state,\s*projectionId,\s*"candidate"/u,
);
assert.match(
  postgresRepositorySource,
  /begin isolation level read committed read write/u,
);
assert.match(
  postgresRepositorySource,
  /select ai\.persist_operational_memory_bundle/u,
);

const sqlWithoutComments = applySql.replace(/--[^\n]*/gu, "");
assert.doesNotMatch(
  sqlWithoutComments,
  /\b(?:insert\s+into|update\s+ai\.|delete\s+from|truncate)\b/iu,
);
assert.doesNotMatch(
  applySql,
  /backfill|synthetic candidate|row_number\s*\(|lag\s*\(/iu,
);
assert.doesNotMatch(
  applySql,
  /create or replace function ai\.persist_operational_memory_bundle/iu,
);

const topLevelStatements = (source: string): string[] => {
  const statements: string[] = [];
  let start = 0;
  let index = 0;
  let singleQuoted = false;
  let lineComment = false;
  let blockComment = false;
  let dollarTag: string | null = null;
  while (index < source.length) {
    if (lineComment) {
      if (source[index] === "\n") lineComment = false;
      index += 1;
      continue;
    }
    if (blockComment) {
      if (source.slice(index, index + 2) === "*/") {
        blockComment = false;
        index += 2;
      } else {
        index += 1;
      }
      continue;
    }
    if (dollarTag !== null) {
      if (source.startsWith(dollarTag, index)) {
        index += dollarTag.length;
        dollarTag = null;
      } else {
        index += 1;
      }
      continue;
    }
    if (singleQuoted) {
      if (source[index] === "'" && source[index + 1] === "'") {
        index += 2;
      } else if (source[index] === "'") {
        singleQuoted = false;
        index += 1;
      } else {
        index += 1;
      }
      continue;
    }
    if (source.slice(index, index + 2) === "--") {
      lineComment = true;
      index += 2;
      continue;
    }
    if (source.slice(index, index + 2) === "/*") {
      blockComment = true;
      index += 2;
      continue;
    }
    if (source[index] === "'") {
      singleQuoted = true;
      index += 1;
      continue;
    }
    if (source[index] === "$") {
      const match = source.slice(index).match(/^\$[a-z0-9_]*\$/u);
      if (match) {
        dollarTag = match[0];
        index += dollarTag.length;
        continue;
      }
    }
    if (source[index] === ";") {
      statements.push(source.slice(start, index + 1));
      start = index + 1;
    }
    index += 1;
  }
  assert.equal(source.slice(start).trim(), "");
  return statements;
};
const statementKind = (statement: string): string => {
  const withoutLeadingComments = statement.replace(
    /^\s*(?:--[^\n]*(?:\n|$)\s*)*/u,
    "",
  );
  const normalized = withoutLeadingComments.trim().toLowerCase();
  return [
    "create constraint trigger",
    "create unique index",
    "create function",
    "create trigger",
    "begin",
    "commit",
    "do",
    "revoke",
  ].find((prefix) => normalized.startsWith(prefix)) ?? "unexpected";
};
assert.deepEqual(
  topLevelStatements(applySql).map(statementKind),
  [
    "begin",
    "do",
    "create unique index",
    "create unique index",
    "create unique index",
    "create function",
    "create trigger",
    "create function",
    "create constraint trigger",
    "do",
    "revoke",
    "revoke",
    "do",
    "commit",
  ],
);

assert.match(verifySql, /^begin transaction read only;/u);
assert.match(verifySql, new RegExp(ACTIVATION_ID, "u"));
assert.match(verifySql, new RegExp(activationEntry.checksum, "u"));
assert.doesNotMatch(verifySql, /\bcommit\s*;/iu);
assert.match(verifySql, /\brollback\s*;\s*$/iu);
assert.doesNotMatch(
  verifySql,
  /\b(?:insert\s+into|update\s+ai\.|delete\s+from|truncate|alter\s+|create\s+|drop\s+)\b/iu,
);

const actualVerifyEvidence = new Set(
  [...verifySql.matchAll(/true as ([a-z0-9_]+)/gu)].map((match) => match[1]!),
);
assert.deepEqual(
  actualVerifyEvidence,
  new Set([
    "exact_five_state_check",
    "transition_trigger_exact",
    "initial_candidate_enforced",
    "sequence_monotonic_enforced",
    "lifecycle_uniqueness_enforced",
    "same_date_multiple_candidates_allowed",
    "active_scope_lock_enforced",
    "duplicate_active_rejected",
    "deferred_initial_candidate_enforced",
    "append_only_preserved",
    "public_anon_authenticated_execute_denied",
    "public_anon_authenticated_table_dml_denied",
    "no_legacy_rewrite",
  ]),
);
for (const semanticMarker of [
  "prosecdef",
  "provolatile = 'v'",
  "search_path=pg_catalog",
  "pg_get_functiondef",
  "pg_advisory_xact_lock",
  "transition_binding_position >= transition_lock_position",
  "transition_lock_position >= transition_previous_state_position",
  "transition_previous_state_position >= transition_decision_position",
  "transition_decision_position >= transition_active_conflict_position",
  "transition_invalid_raise_position >= transition_active_conflict_position",
  "transition_active_branch_position >= transition_active_conflict_position",
  "transition_lock_position >= transition_active_conflict_position",
  "transition_active_conflict_position >= transition_return_position",
  "orderbyevent.event_sequencedesclimit1",
  "orderbyother_event.event_sequencedesclimit1",
  "joinlateral(selectother_event.statusfromai.operational_memory_projection_state_eventsasother_event",
  "errcode=''23503'',message=''operational_memory_projection_binding_missing''",
  "errcode=''23514'',message=''operational_memory_projection_event_sequence_invalid''",
  "errcode=''23514'',message=''operational_memory_projection_state_transition_invalid''",
  "ifallowed_transitionisnottruethenraiseexceptionusingerrcode=''23514'',message=''operational_memory_projection_state_transition_invalid'';endif;",
  "errcode=''23505'',message=''operational_memory_projection_active_scope_conflict''",
  "returnnew;",
  "allowed_transitionboolean:=false;",
  "'allowed_transition='",
  "whenprevious_statusisnullthennew.status=''candidate''",
  "whenprevious_status=''candidate''thennew.status=any(array[",
  "whenprevious_status=''active''thennew.status=''superseded''",
  "new.event_sequence<1",
  "new.event_sequence<=previous_sequence",
  "latest_state.status=''active''",
  "tgtype = 7",
  "tgtype = 5",
  "tgtype = 27",
  "tgdeferrable",
  "tginitdeferred",
  "indisunique",
  "indisvalid",
  "indpred is not null",
  "business_date.*candidate|candidate.*business_date",
  "has_function_privilege",
  "has_table_privilege",
]) {
  assert.ok(verifySql.includes(semanticMarker), `verify missing ${semanticMarker}`);
}

const validateVerifyPrivilegeCoverage = (source: string): void => {
  const functionPrivilegeCalls = new Set(
    [...source.matchAll(
      /has_function_privilege\(\s*([^,]+),\s*([^,]+),\s*'EXECUTE'\s*\)/gu,
    )].map((match) => `${compact(match[1]!)}|${compact(match[2]!)}`),
  );
  assert.deepEqual(
    functionPrivilegeCalls,
    new Set([
      "'public'|transition_function",
      "'public'|initial_candidate_function",
      "anon_role|transition_function",
      "anon_role|initial_candidate_function",
      "authenticated_role|transition_function",
      "authenticated_role|initial_candidate_function",
    ]),
  );

  const tablePrivilegeCalls = new Set(
    [...source.matchAll(
      /has_table_privilege\(\s*([^,]+),\s*([^,]+),\s*'(INSERT|UPDATE|DELETE)'\s*\)/gu,
    )].map((match) =>
      `${compact(match[1]!)}|${compact(match[2]!)}|${match[3]!}`
    ),
  );
  const expectedTablePrivilegeCalls = new Set<string>();
  for (
    const [role, relation] of [
      ["'public'", "'ai.operational_memory_projection_state_events'"],
      ["anon_role", "projection_events_table"],
      ["authenticated_role", "projection_events_table"],
      ["'public'", "'ai.operational_memory_daily_projections'"],
      ["anon_role", "projections_table"],
      ["authenticated_role", "projections_table"],
    ] as const
  ) {
    for (const privilege of ["INSERT", "UPDATE", "DELETE"]) {
      expectedTablePrivilegeCalls.add(`${role}|${relation}|${privilege}`);
    }
  }
  assert.deepEqual(tablePrivilegeCalls, expectedTablePrivilegeCalls);
};
validateVerifyPrivilegeCoverage(verifySql);
assertRejectedMutation(
  "authenticated_table_assertion_removed",
  verifySql,
  (source) =>
    replaceExactly(
      source,
      "          authenticated_role,\n          projection_events_table,\n          'INSERT'",
      "          removed_role,\n          projection_events_table,\n          'INSERT'",
    ),
  validateVerifyPrivilegeCoverage,
);

assert.deepEqual(new Set(requiredMemoryMutations), new Set([
  "transition_removed",
  "transition_added",
  "transition_overwritten_colon_equal",
  "transition_overwritten_equal",
  "lock_removed",
  "lock_moved_after_previous_state",
  "lock_moved_after_active_conflict",
  "latest_desc_removed",
  "latest_desc_reversed",
  "self_projection_filter_removed",
  "business_date_filter_removed",
  "projection_type_filter_removed",
  "sqlstate_changed",
  "fixed_message_changed",
  "return_new_changed",
  "planner_activation_missing",
  "lifecycle_predicate_changed",
  "authenticated_function_revoke_removed",
  "authenticated_table_assertion_removed",
]));

assert.doesNotMatch(
  `${applySql}\n${verifySql}`,
  /service_role|authorization:\s*bearer|api[_-]?key|password|private[_-]?key|supabase[_-]?url/iu,
);
assert.doesNotMatch(
  transitionBody,
  /raise[\s\S]*(?:projection_content|content_hash|payload|source_record)/iu,
);

const packageDocument = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
assert.equal(
  packageDocument.scripts[
    "test-farm-os-day147a1-activate-migration-authority"
  ],
  "tsx scripts/hermes/test_farm_os_day147a1_activate_migration_authority.ts",
);
assert.equal(
  packageDocument.scripts[
    "typecheck-farm-os-day147a1-activate-migration-authority"
  ],
  "tsc --ignoreConfig --noEmit --strict --skipLibCheck --target ES2022 --lib ES2022,DOM --types node --module ESNext --moduleResolution Bundler --esModuleInterop scripts/hermes/test_farm_os_day147a1_activate_migration_authority.ts",
);

console.log("farm_os_day147a1_activate_migration_authority: PASS");
