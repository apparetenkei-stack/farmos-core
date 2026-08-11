import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const APPLY_PATH =
  "db/migrations/202608030001_daily_operational_projection_command_ledger.sql";
const VERIFY_PATH = `${APPLY_PATH.slice(0, -4)}.verify.sql`;
const APPLY_SHA256 =
  "98504d23be1922d339acf0c7384ad1a5f9b6257e44a07a9073200b21bd79ef0a";
const VERIFY_SHA256 =
  "daddee61d384bb5f93662152bb52a760f2733ccc11dec026c5911ffd66524093";
const DAY149_HISTORICAL_MANIFEST_PREFIX_SHA256 =
  "2ffb2d6ff890f032793a0f02988e97e469ae2367fa90ab464786f91d5421e9f0";

const VERIFY_PREDICATES = Object.freeze({
  V001: "required_objects_exist",
  V002: "migration_history_matches",
  V003: "table_owner_matches",
  V004: "function_owner_matches",
  V005: "review_columns_exact",
  V006: "receipt_columns_exact",
  V007: "review_constraint_count",
  V008: "receipt_constraint_count",
  V009: "required_constraint_names",
  V010: "review_index_definition",
  V011: "function_security_and_config",
  V012: "function_body_hashes",
  V013: "writer_function_shape",
  V014: "trigger_count",
  V015: "append_only_trigger_shapes",
  V016: "review_guard_trigger_shape",
  V017: "receipt_guard_trigger_shape",
  V018: "receipt_required_trigger_shape",
  V019: "predecessor_triggers_preserved",
  V020: "transaction_role_attributes",
  V021: "transaction_role_membership",
  V022: "transaction_role_schema_privilege",
  V023: "transaction_role_table_selects",
  V024: "transaction_role_table_write_denials",
  V025: "transaction_role_column_write_denials",
  V026: "transaction_role_sequence_denials",
  V027: "writer_execute_privilege",
  V028: "trigger_function_execute_denials",
  V029: "anon_authenticated_denials",
  V030: "unexpected_table_acl",
  V031: "unexpected_column_acl",
  V032: "unexpected_function_acl",
  V033: "unexpected_schema_acl",
  V034: "unexpected_database_acl",
  V035: "unexpected_default_acl",
  V036: "new_object_acl_exactness",
  V037: "public_table_denial",
  V038: "public_writer_execute_denial",
} as const);

function read(path: string): string {
  return readFileSync(resolve(ROOT, path), "utf8");
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function createTableDefinition(tableName: string): string {
  const match = apply.match(new RegExp(
    `create table ai\\.${tableName} \\(([\\s\\S]*?)\\n\\);`,
    "i",
  ));
  assert.ok(match, tableName);
  return match[1] as string;
}

function functionBody(tag: string): string {
  const marker = `as $${tag}$`;
  const start = apply.indexOf(marker);
  assert.ok(start >= 0, tag);
  const bodyStart = start + marker.length;
  const bodyEnd = apply.indexOf(`$${tag}$;`, bodyStart);
  assert.ok(bodyEnd > bodyStart, tag);
  return apply.slice(bodyStart, bodyEnd);
}

function inlineConstraintCount(definition: string): number {
  return [...definition.matchAll(
    /^\s*[a-z0-9_]+\s+[^,\n]*(?:\bprimary key\b|\bunique\b)\s*,?$/gim,
  )].length;
}

const apply = read(APPLY_PATH);
const verify = read(VERIFY_PATH);
const v026MessageIndex = verify.indexOf("message = 'day149_verify_failed:V026'");
assert.ok(v026MessageIndex >= 0);
const v026StartIndex = verify.lastIndexOf("  if exists (", v026MessageIndex);
assert.ok(v026StartIndex >= 0);
const v026Block = verify.slice(v026StartIndex, v026MessageIndex);
const predicateIds = Object.keys(VERIFY_PREDICATES);
const raisedPredicateIds = [...verify.matchAll(
  /raise exception using errcode = 'P0001',\s*message = 'day149_verify_failed:(V\d{3})';/g,
)].map((match) => match[1] as string);
const allRaiseBoundaries = [...verify.matchAll(/\braise exception\b/gi)];
const manifestSource = read("db/provisioning/manifest.json");
const manifest = JSON.parse(manifestSource) as {
  manifest_version: string;
  startup_auto_apply: boolean;
  migrations: Array<Record<string, unknown>>;
};
const reviewDefinition = createTableDefinition(
  "operational_memory_projection_review_decisions",
);
const receiptDefinition = createTableDefinition(
  "operational_memory_projection_command_receipts",
);
const reviewGuardBody = functionBody("day149_review_binding");
const receiptGuardBody = functionBody("day149_receipt_binding");
const writerBody = functionBody("day149_writer");
const promotionBranchStart = receiptGuardBody.indexOf(
  "elsif new.command_type = 'promote_projection_candidate' then",
);
const oneEventBranchStart = receiptGuardBody.indexOf(
  "if event_slot_count = 1 then",
  promotionBranchStart,
);
const twoEventBranchStart = receiptGuardBody.indexOf(
  "elsif event_slot_count = 2 then",
  oneEventBranchStart,
);
const promotionBranchEnd = receiptGuardBody.indexOf(
  "elsif new.command_type = 'reject_projection_candidate' then",
  twoEventBranchStart,
);
const resultPayloadValidationStart = receiptGuardBody.indexOf(
  "if (new.result_payload -> 'review_decision_id')",
  promotionBranchEnd,
);
assert.ok(promotionBranchStart >= 0);
assert.ok(oneEventBranchStart > promotionBranchStart);
assert.ok(twoEventBranchStart > oneEventBranchStart);
assert.ok(promotionBranchEnd > twoEventBranchStart);
assert.ok(resultPayloadValidationStart > promotionBranchEnd);
const promotionCommonValidation = receiptGuardBody.slice(
  promotionBranchStart,
  oneEventBranchStart,
);
const oneEventPromotionValidation = receiptGuardBody.slice(
  oneEventBranchStart,
  twoEventBranchStart,
);
const twoEventPromotionValidation = receiptGuardBody.slice(
  twoEventBranchStart,
  promotionBranchEnd,
);
assert.match(promotionCommonValidation, /event_slot_count not in \(1, 2\)/);
assert.match(promotionCommonValidation, /review_row\.decision <> 'approve'/);
assert.match(oneEventPromotionValidation, /event_one\.status <> 'active'/);
assert.match(
  oneEventPromotionValidation,
  /event_one\.projection_id <> review_row\.candidate_projection_id/,
);
assert.equal(/\bevent_two\b/.test(oneEventPromotionValidation), false);
assert.match(twoEventPromotionValidation, /event_two\.status <> 'active'/);
assert.match(
  twoEventPromotionValidation,
  /event_two\.projection_id <> review_row\.candidate_projection_id/,
);
assert.equal(
  (receiptGuardBody.match(
    /message = 'operational_memory_projection_receipt_promotion_invalid'/g,
  ) ?? []).length,
  4,
);
assert.equal(
  (promotionCommonValidation.match(/errcode = '23514'/g) ?? []).length,
  1,
);
assert.equal(
  (oneEventPromotionValidation.match(/errcode = '23514'/g) ?? []).length,
  1,
);
assert.equal(
  (twoEventPromotionValidation.match(/errcode = '23514'/g) ?? []).length,
  2,
);
const reviewOrdinaryConstraintCount =
  [...reviewDefinition.matchAll(/^\s*constraint\s+/gim)].length +
  inlineConstraintCount(reviewDefinition) +
  [...apply.matchAll(
    /alter table ai\.operational_memory_projection_review_decisions\s+add constraint\s+/gi,
  )].length;
const receiptOrdinaryConstraintCount =
  [...receiptDefinition.matchAll(/^\s*constraint\s+/gim)].length +
  inlineConstraintCount(receiptDefinition) +
  [...apply.matchAll(
    /alter table ai\.operational_memory_projection_command_receipts\s+add constraint\s+/gi,
  )].length;
const reviewConstraintTriggerCount = [...apply.matchAll(
  /create constraint trigger\s+[a-z0-9_]+\s+after insert on ai\.operational_memory_projection_review_decisions\b/gi,
)].length;
const receiptConstraintTriggers = [...apply.matchAll(
  /create constraint trigger\s+([a-z0-9_]+)\s+after insert on ai\.operational_memory_projection_command_receipts\b/gi,
)].map((match) => match[1] as string);

const explicitConstraintNames = [
  ...apply.matchAll(/\bconstraint\s+(?!trigger\b)([a-z0-9_]+)/gi),
].map((match) => match[1] as string);
const explicitConstraintNameSet = new Set(explicitConstraintNames);
const catalogConstraintNameSet = new Set([
  ...explicitConstraintNames,
  ...receiptConstraintTriggers,
]);
const postgresTruncatedConstraintNames = explicitConstraintNames.map((name) =>
  Buffer.from(name, "utf8").subarray(0, 63).toString("utf8")
);
const verifierConstraintNames = [
  ...verify.matchAll(/constraint_row\.conname\s*=\s*'([^']+)'/g),
].map((match) => match[1] as string);
for (const match of verify.matchAll(
  /constraint_row\.conname\s+in\s*\(([^)]+)\)/gs,
)) {
  verifierConstraintNames.push(
    ...[...match[1]!.matchAll(/'([^']+)'/g)].map((nameMatch) =>
      nameMatch[1] as string
    ),
  );
}

assert.equal(apply.includes("pg_catalog.current_user"), false);
assert.match(apply, /role_row\.rolname\s*=\s*current_user/);
assert.ok(explicitConstraintNames.length > 0);
assert.ok(explicitConstraintNames.every((name) => /^[a-z0-9_]+$/.test(name)));
assert.ok(explicitConstraintNames.every((name) =>
  Buffer.byteLength(name, "utf8") <= 63
));
assert.equal(explicitConstraintNameSet.size, explicitConstraintNames.length);
assert.equal(
  new Set(postgresTruncatedConstraintNames).size,
  explicitConstraintNames.length,
);
assert.ok(verifierConstraintNames.length >= 6);
assert.ok(verifierConstraintNames.every((name) =>
  catalogConstraintNameSet.has(name)
));
for (const name of [
  "om_projection_review_candidate_seq_uq",
  "om_projection_command_idempotency_uq",
  "om_projection_command_projection_1_fk",
  "om_projection_command_projection_2_fk",
  "om_projection_command_event_1_fk",
  "om_projection_command_event_2_fk",
]) {
  assert.ok(explicitConstraintNameSet.has(name), name);
  assert.ok(verifierConstraintNames.includes(name), name);
}

assert.equal(sha256(apply), APPLY_SHA256);
assert.equal(sha256(verify), VERIFY_SHA256);
assert.equal(sha256(JSON.stringify(manifest.migrations.slice(0, 4))),
  DAY149_HISTORICAL_MANIFEST_PREFIX_SHA256);
assert.equal(/pg_catalog\.coalesce\s*\(/i.test(apply), false);
assert.equal(/pg_catalog\.coalesce\s*\(/i.test(verify), false);
assert.match(
  reviewGuardBody,
  /select coalesce\(pg_catalog\.max\(review\.review_sequence\), 0\) \+ 1/,
);
assert.match(
  receiptGuardBody,
  /is distinct from\s+coalesce\(pg_catalog\.to_jsonb\(new\.review_decision_id\), 'null'::jsonb\)/s,
);
assert.equal(verify.match(/\bcoalesce\s*\(/gi)?.length, 2);
assert.match(
  verify,
  /pg_catalog\.aclexplode\(coalesce\(\s*class_row\.relacl,\s*pg_catalog\.acldefault\('r', class_row\.relowner\)\s*\)\)/s,
);
assert.match(
  verify,
  /pg_catalog\.aclexplode\(coalesce\(\s*procedure_row\.proacl,\s*pg_catalog\.acldefault\('f', procedure_row\.proowner\)\s*\)\)/s,
);
assert.match(
  v026Block,
  /where class_row\.relnamespace = pg_catalog\.to_regnamespace\('ai'\)\s+and case\s+when class_row\.relkind = 'S' then\s+pg_catalog\.has_sequence_privilege\(\s*'farmos_core_projection_command_transaction', class_row\.oid,\s*'USAGE,SELECT,UPDATE'\s*\)\s+else false\s+end\s*\)/s,
);
assert.equal(
  /class_row\.relkind\s*=\s*'S'\s+and\s+pg_catalog\.has_sequence_privilege\s*\(/s
    .test(v026Block),
  false,
);
assert.equal(new Set(predicateIds).size, predicateIds.length);
assert.deepEqual(predicateIds, Array.from(
  { length: 38 },
  (_, index) => `V${String(index + 1).padStart(3, "0")}`,
));
assert.equal(allRaiseBoundaries.length, predicateIds.length);
assert.equal(raisedPredicateIds.length, allRaiseBoundaries.length);
assert.equal(new Set(raisedPredicateIds).size, predicateIds.length);
assert.deepEqual([...raisedPredicateIds].sort(), [...predicateIds].sort());
assert.equal(verify.includes(
  "daily_operational_projection_command_ledger_verification_failed",
), false);
assert.equal(/raise exception\s+(?!using errcode)/i.test(verify), false);
assert.equal(/\braise\b[^;]*(?:format\s*\(|%)/i.test(verify), false);
assert.match(verify,
  /where conrelid = receipt_table and contype <> 't'\) <> 19[\s\S]*where conrelid = receipt_table and contype = 't'\) <> 1[\s\S]*where conrelid = receipt_table\) <> 20[\s\S]*message = 'day149_verify_failed:V008'/,
);
assert.match(verify,
  /constraint_row\.conname =\s*'operational_memory_projection_command_receipt_binding_guard'[\s\S]*constraint_row\.contype = 't'[\s\S]*message = 'day149_verify_failed:V009'/,
);
assert.equal(reviewOrdinaryConstraintCount, 15);
assert.equal(reviewConstraintTriggerCount, 0);
assert.equal(receiptOrdinaryConstraintCount, 19);
assert.deepEqual(receiptConstraintTriggers, [
  "operational_memory_projection_command_receipt_binding_guard",
]);
assert.equal(manifest.manifest_version, "farmos.core-db-provisioning-manifest.v1");
assert.equal(manifest.startup_auto_apply, false);
assert.ok(manifest.migrations.length >= 4);
assert.deepEqual(
  manifest.migrations.slice(0, 3).map((entry) => ({
    migration_id: entry.migration_id,
    sequence: entry.sequence,
    checksum: entry.checksum,
  })),
  [
    {
      migration_id: "202607260001_eligible_proposal_persistence",
      sequence: 202607260001,
      checksum: "sha256:41fbbfb931f03ad42c0c52159749fa8529c84321d6fcc643930c2b03c5c2ee4b",
    },
    {
      migration_id: "202607300001_daily_operational_projection_candidate_foundation",
      sequence: 202607300001,
      checksum: "sha256:350489282b921b879a9c4fab8280cfd38ff7432ed75cc70a905a7dabd45846bf",
    },
    {
      migration_id: "202607310001_daily_operational_projection_candidate_activation",
      sequence: 202607310001,
      checksum: "sha256:e55b7b2c33d432b37d9733d599f8ed4dd7de99a82fb64c5f90158dae7addbbc2",
    },
  ],
);
assert.deepEqual(manifest.migrations[3], {
  migration_id: "202608030001_daily_operational_projection_command_ledger",
  sequence: 202608030001,
  description: "Add durable review decisions and atomic Projection command receipts",
  checksum: `sha256:${APPLY_SHA256}`,
  apply_script: APPLY_PATH,
  verification_script: VERIFY_PATH,
  created_at: "2026-08-03T00:00:00.000Z",
});
assert.ok(manifest.migrations.slice(4).every((entry) =>
  typeof entry.sequence === "number" && entry.sequence > 202608030001
));

for (const token of [
  "create table ai.operational_memory_projection_review_decisions",
  "create table ai.operational_memory_projection_command_receipts",
  "create function ai.persist_operational_memory_projection_command(",
  "security definer",
  "set search_path = pg_catalog",
  "operational_memory_projection_review_decisions_append_only",
  "operational_memory_projection_command_receipts_append_only",
  "operational_memory_projection_review_binding_guard",
  "operational_memory_projection_command_receipt_binding_guard",
  "operational_memory_projection_command_receipt_required",
  "farmos_core_projection_command_transaction",
  "nologin nosuperuser nocreatedb nocreaterole",
  "role_row.rolinherit",
  "pg_catalog.pg_auth_members",
  "pg_catalog.pg_default_acl",
  "pg_catalog.pg_attribute",
  "attribute_row.attacl",
  "class_row.relowner = transaction_role",
  "not acl.is_grantable",
  "$day149_exact_function_acl$",
  "event_two.projection_id <> review_row.candidate_projection_id",
  "event_one.projection_id <> review_row.candidate_projection_id",
  "rebuilt_projection.business_date = reviewed_projection.business_date",
  "new.result_code not in",
  "order by sequence",
  "new.status = 'candidate'",
  "farmos.day149_projection_command_writer",
  "revoke all on table ai.operational_memory_projection_review_decisions from public",
  "grant execute on function",
  "commit;",
]) assert.ok(apply.toLowerCase().includes(token.toLowerCase()), token);

const writerStart = apply.indexOf(
  "create function ai.persist_operational_memory_projection_command(",
);
const writerEnd = apply.indexOf("$day149_writer$;", writerStart);
assert.ok(writerStart >= 0 && writerEnd > writerStart);
const writer = apply.slice(writerStart, writerEnd).toLowerCase();
assert.equal(writer.includes("execute "), false);
assert.equal(writer.includes("security definer"), true);
assert.equal(writer.includes("set search_path = pg_catalog"), true);
assert.equal(writer.includes("insert into ai.operational_memory_projection_command_receipts"), true);
const receiptInsertStart = writerBody.indexOf(
  "insert into ai.operational_memory_projection_command_receipts (",
);
const receiptInsertEnd = writerBody.indexOf(
  ") returning result_payload into stored_result;",
  receiptInsertStart,
);
assert.ok(receiptInsertStart >= 0 && receiptInsertEnd > receiptInsertStart);
const receiptInsert = writerBody.slice(receiptInsertStart, receiptInsertEnd);
const receiptAliasMatch = receiptInsert.match(
  /from pg_catalog\.jsonb_to_record\(p_receipt\) as ([a-z][a-z0-9_]*)\(/,
);
assert.ok(receiptAliasMatch);
const receiptAlias = receiptAliasMatch[1] as string;
assert.equal(receiptAlias, "receipt");
const receiptSelectStart = receiptInsert.indexOf(") select ") + ") select ".length;
const receiptSelectEnd = receiptInsert.indexOf(
  "from pg_catalog.jsonb_to_record(p_receipt)",
  receiptSelectStart,
);
assert.ok(receiptSelectStart > 0 && receiptSelectEnd > receiptSelectStart);
const receiptSelect = receiptInsert.slice(receiptSelectStart, receiptSelectEnd);
const receiptRecordColumns = [
  "receipt_schema_version", "command_id", "idempotency_key_hash", "command_type",
  "canonical_payload_hash", "result_status", "result_code", "result_payload",
  "result_payload_hash", "requested_by", "requested_at", "committed_at",
  "review_decision_id", "affected_projection_id_1", "committed_state_event_id_1",
  "committed_state_event_sequence_1", "affected_projection_id_2",
  "committed_state_event_id_2", "committed_state_event_sequence_2",
] as const;
assert.deepEqual(
  [...receiptSelect.matchAll(/receipt\.([a-z0-9_]+)/g)].map((match) => match[1]),
  receiptRecordColumns,
);
assert.equal(/(?<!\.)\bcommand_type\b/.test(receiptSelect), false);
assert.equal(/(?<!\.)\bresult_status\b/.test(receiptSelect), false);
const functionBodyHashes = {
  review_guard: sha256(reviewGuardBody),
  receipt_guard: sha256(receiptGuardBody),
  writer: sha256(writerBody),
};
assert.deepEqual(functionBodyHashes, {
  review_guard: "5c43ab335aacec0de6721102e9e62dc71789d7ace8c82877514c33d043825d80",
  receipt_guard: "6713f913b5ea6959bfe3765262521b4b4bafa7de5e8cddd3aa5b1f61cddff7ab",
  writer: "4c3ff78befab8b718ab15dd0d8c7847894f029b8cb6ade783fa2ea49d7a20b52",
});
for (const hash of Object.values(functionBodyHashes)) {
  assert.ok(verify.includes(`'${hash}'`));
}
assert.ok(verify.includes(
  "'3b5aa7875761f036e96fb6a7c43a8cf13f28d3d889cbb9ccba5c853e122bb764'",
));
assert.ok(verify.includes(
  "'6dcfcf6705ff8928845fe7fe911111b17c14d58593e12f56cb09ca3b50d7bb92'",
));

assert.match(verify, /^begin transaction read only;/);
assert.match(verify, /rollback;\s*$/);
assert.ok(verify.includes(`sha256:${APPLY_SHA256}`));
assert.ok(verify.includes(
  "ai.persist_operational_memory_bundle(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)",
));
assert.ok(verify.includes("operational_memory_projection_state_transition_guard"));
assert.ok(verify.includes("operational_memory_projection_initial_candidate_guard"));
for (const pattern of [
  /where conrelid = review_table and contype <> 't'\) <> 15/,
  /where conrelid = review_table and contype = 't'\) <> 0/,
  /where conrelid = review_table\) <> 15/,
  /where conrelid = receipt_table and contype <> 't'\) <> 19/,
  /where conrelid = receipt_table and contype = 't'\) <> 1/,
  /where conrelid = receipt_table\) <> 20/,
  /constraint_row\.conname =\s*'operational_memory_projection_command_receipt_binding_guard'\s*and constraint_row\.contype = 't'\s*and constraint_row\.condeferrable and constraint_row\.condeferred/s,
]) assert.match(verify, pattern);
for (const token of [
  "role_row.rolinherit",
  "pg_catalog.pg_auth_members",
  "has_sequence_privilege",
  "has_any_column_privilege",
  "attribute_row.attacl",
  "not acl.is_grantable",
  "event_two.projection_id <> review_row.candidate_projection_id",
  "rebuilt_projection.business_date = reviewed_projection.business_date",
  "order by sequence",
  "trigger_row.tgfoid = receipt_guard",
  "trigger_row.tgfoid = receipt_required",
  "trigger_row.tgenabled = 'O'",
  "trigger_row.tgtype = 27",
  "trigger_row.tgtype = 7",
  "trigger_row.tgtype = 5",
  "acl.grantee <> procedure_row.proowner",
  "pg_catalog.sha256(pg_catalog.convert_to(",
]) assert.ok(verify.includes(token), token);
assert.equal(/\bdrop\s+(?:table|function|role|schema)\b/i.test(apply), false);
assert.equal(/\btruncate\s+table\b/i.test(apply), false);
assert.equal(/startup_auto_apply\s*[:=]\s*true/i.test(apply + verify), false);

console.log(JSON.stringify({
  status: "PASS",
  apply_sha256: APPLY_SHA256,
  verify_sha256: VERIFY_SHA256,
  historical_manifest_prefix_sha256: DAY149_HISTORICAL_MANIFEST_PREFIX_SHA256,
  coalesce_regression: {
    apply_pg_catalog_coalesce_count: 0,
    review_guard_unqualified_coalesce_present: "PASS",
    receipt_guard_unqualified_coalesce_present: "PASS",
    verify_pg_catalog_coalesce_count: 0,
    pg_catalog_coalesce_absent: "PASS",
    unqualified_coalesce_count: 2,
    table_acl_fallback_present: "PASS",
    function_acl_fallback_present: "PASS",
    acldefault_r_preserved: "PASS",
    acldefault_f_preserved: "PASS",
  },
  receipt_record_regression: {
    jsonb_to_record_alias_detected: "PASS",
    command_type_qualified_with_detected_alias: "PASS",
    result_status_qualified_with_detected_alias: "PASS",
    bare_command_type_in_receipt_select_absent: "PASS",
    bare_result_status_in_receipt_select_absent: "PASS",
    receipt_insert_column_order_preserved: "PASS",
  },
  function_body_regression: {
    ...functionBodyHashes,
    unrelated_hashes_unchanged: "PASS",
  },
  verify_observability: {
    predicate_count: predicateIds.length,
    predicate_ids_unique: true,
    predicate_ids_contiguous: true,
    every_failure_boundary_has_predicate: true,
    generic_unidentified_raise_count: 0,
    dynamic_value_output_count: 0,
    failure_prefix: "day149_verify_failed",
  },
  constraint_count_regression: {
    review_table: {
      ordinary_constraints: reviewOrdinaryConstraintCount,
      constraint_triggers: reviewConstraintTriggerCount,
      total_pg_constraint: reviewOrdinaryConstraintCount + reviewConstraintTriggerCount,
    },
    receipt_table: {
      ordinary_constraints: receiptOrdinaryConstraintCount,
      constraint_triggers: receiptConstraintTriggers.length,
      total_pg_constraint:
        receiptOrdinaryConstraintCount + receiptConstraintTriggers.length,
    },
  },
  sequence_guard_regression: {
    case_guard_present: "PASS",
    relkind_S_branch_contains_has_sequence_privilege: "PASS",
    else_false_present: "PASS",
    unsafe_sibling_and_shape_absent: "PASS",
    target_role_exact: "PASS",
    privilege_string_exact: "PASS",
  },
  manifest_migration_count: manifest.migrations.length,
  static_database_connections: 0,
  static_migration_apply_count: 0,
  production_operations: 0,
}));
