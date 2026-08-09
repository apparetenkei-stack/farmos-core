import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_CANDIDATE_SECTIONS,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ACL_ROLE_NAMES,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_FUNCTION_SCOPES,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_MIGRATIONS,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_OBJECT_CLASSES,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RELATION_SCOPES,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ROLE_SCOPES,
  type FarmOsProductionIdentityCandidateResultSet,
  type FarmOsProductionIdentityCandidateRow,
  type FarmOsProductionIdentityQueryV2CandidateSection,
  farmOsAclDefaultClassForRelkind,
  transformFarmOsProductionIdentityQueryV2CandidateResultSets,
  validateFarmOsProductionIdentityQueryV2CandidateResultSets,
  validateFarmOsProductionIdentitySanitizedEvidenceCandidate,
} from "./lib/farm_os_production_identity_query_v2_candidate_contract";

const ARTIFACT_PATH = "scripts/sql/farm_os_production_identity_readonly_v2.sql";
const PREVIOUS_REVIEW_SHA256 = "sha256:9d0f2cc06474fb30a20be879001ac12a0d0e710927e870eaac611e0ff117dc1f";
const PREVIOUS_REMEDIATION_REVIEW_SHA256 = "sha256:e4b525a0e24a719f222536c8bf10f165f68b75ffeb2321a735119bfbd00fdc90";
const PREVIOUS_SOL_REVIEW_SHA256 = "sha256:cab18bb51b0abc6fe4face62c2adf00140c0a9ba9cbcf184d80465a799fcd68f";
const EXPECTED_CANDIDATE_SHA256 = "sha256:202053dadf34063c3ccfc69ede01197a217b968916936f33b7185090659faf95";
const bytes = readFileSync(ARTIFACT_PATH);
const sql = bytes.toString("utf8");

assert.equal(bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), false);
assert.equal(sql.includes("\r"), false);
assert.equal(sql.endsWith("\n"), true);
assert.equal(Buffer.from(sql, "utf8").equals(bytes), true);
const computedSha = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
assert.equal(computedSha, EXPECTED_CANDIDATE_SHA256);
assert.notEqual(computedSha, PREVIOUS_REVIEW_SHA256);
assert.notEqual(computedSha, PREVIOUS_REMEDIATION_REVIEW_SHA256);
assert.notEqual(computedSha, PREVIOUS_SOL_REVIEW_SHA256);

const sectionMarkers = [...sql.matchAll(/^-- section:([A-Z0-9_]+)$/gmu)].map((match) => match[1]);
assert.deepEqual(sectionMarkers, FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_CANDIDATE_SECTIONS);
const statements = sql.replace(/--[^\n]*/gu, " ").split(";").map((statement) => statement.trim()).filter(Boolean);
assert.equal(statements.length, FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_CANDIDATE_SECTIONS.length);
for (const statement of statements) {
  assert.match(statement, /^(?:select|with)\b/iu);
  assert.match(statement, /order\s+by\s+row_key\s+collate\s+"C"\s*$/iu);
}
const executableTokens = sql.replace(/--[^\n]*/gu, " ").replace(/'(?:''|[^'])*'/gu, " ");
assert.doesNotMatch(executableTokens, /\b(?:insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|comment|call|do|copy)\b/iu);
assert.doesNotMatch(executableTokens, /\bset\s+role\b|\bexecute\b/iu);
assert.doesNotMatch(sql, /\b(?:dblink|http|inet_server_addr|inet_server_port|inet_client_addr|inet_client_port|client_addr|application_name|current_query)\b/iu);
assert.doesNotMatch(sql, /\b(?:from|join)\s+(?:ai|audit|app|sales)\./iu);
assert.match(sql, /pg_catalog\.pg_policy/u);
assert.match(sql, /'raw_sensitive_texts'/u);
assert.doesNotMatch(sql, /'attributes'[\s\S]{0,200}'(?:default_expression|proconfig|raw_definition)'/iu);
assert.match(sql, /pg_catalog\.acldefault\(\(case class\.relkind when 'S' then 's' else 'r' end\)::"char"/u);
assert.match(sql, /pg_catalog\.acldefault\('n'/u);
assert.match(sql, /pg_catalog\.acldefault\('f'/u);
assert.doesNotMatch(sql, /pg_catalog\.acldefault\('r', class\.relowner\)/u);
assert.match(sql, /select distinct target_roles\.migration_id[\s\S]+where target_roles\.role_name in \(member\.rolname, granted\.rolname\)/u);
assert.doesNotMatch(sql, /membership\.member = scoped\.oid or membership\.roleid = scoped\.oid/u);
assert.doesNotMatch(sql, /(?:quota|available_bytes|free_disk|wal_headroom)/iu);

const migrations = new Set(sql.match(/20260[0-9]{7}_[a-z0-9_]+/gu) ?? []);
assert.deepEqual([...migrations].sort(), [...FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_MIGRATIONS].sort());

const row = (
  section_id: FarmOsProductionIdentityQueryV2CandidateSection,
  row_key: string,
  payload: Record<string, unknown>,
  sanitization_class: FarmOsProductionIdentityCandidateRow["sanitization_class"],
): FarmOsProductionIdentityCandidateRow => ({ section_id, row_key, payload, sanitization_class });
const resultSet = (
  section_id: FarmOsProductionIdentityQueryV2CandidateSection,
  rows: FarmOsProductionIdentityCandidateRow[],
): FarmOsProductionIdentityCandidateResultSet => ({ section_id, rows });
const sortRows = (rows: FarmOsProductionIdentityCandidateRow[]): FarmOsProductionIdentityCandidateRow[] =>
  rows.sort((left, right) => Buffer.compare(Buffer.from(left.row_key), Buffer.from(right.row_key)));
const splitScope = (scope: string): [string, string] => {
  const separator = scope.indexOf(":");
  return [scope.slice(0, separator), scope.slice(separator + 1)];
};

const aclInventoryRows: FarmOsProductionIdentityCandidateRow[] = [
  row("F_ACL_PRINCIPAL_INVENTORY", "function_acl:ai.fn():public:EXECUTE:owner:false", {
    collection_status: "complete", row_kind: "function_acl", object_identity: "ai.fn()", principal: "public",
    privilege: "EXECUTE", grant_option: false, grantor: "owner", acl_default_class: "f", relation_kind: null, role_flags: null,
  }, "SAFE_STRUCTURAL"),
  row("F_ACL_PRINCIPAL_INVENTORY", "relation_acl:ai.seq:public:USAGE:owner:false", {
    collection_status: "complete", row_kind: "relation_acl", object_identity: "ai.seq", principal: "public",
    privilege: "USAGE", grant_option: false, grantor: "owner", acl_default_class: "s", relation_kind: "S", role_flags: null,
  }, "SAFE_STRUCTURAL"),
  row("F_ACL_PRINCIPAL_INVENTORY", "relation_acl:ai.table:owner:SELECT:owner:true", {
    collection_status: "complete", row_kind: "relation_acl", object_identity: "ai.table", principal: "owner",
    privilege: "SELECT", grant_option: true, grantor: "owner", acl_default_class: "r", relation_kind: "r", role_flags: null,
  }, "SAFE_STRUCTURAL"),
  row("F_ACL_PRINCIPAL_INVENTORY", "schema_acl:ai:public:USAGE:owner:false", {
    collection_status: "complete", row_kind: "schema_acl", object_identity: "ai", principal: "public",
    privilege: "USAGE", grant_option: false, grantor: "owner", acl_default_class: "n", relation_kind: null, role_flags: null,
  }, "SAFE_STRUCTURAL"),
];
for (const roleName of FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ACL_ROLE_NAMES) {
  aclInventoryRows.push(row("F_ACL_PRINCIPAL_INVENTORY", `role_flags:${roleName}:${roleName}:::`, {
    collection_status: "complete", row_kind: "role_flags", object_identity: roleName, principal: roleName,
    privilege: null, grant_option: null, grantor: null, acl_default_class: null, relation_kind: null,
    role_flags: { exists: false, rolsuper: null, rolcreatedb: null, rolcreaterole: null, rolinherit: null, rolreplication: null, rolbypassrls: null },
  }, "SAFE_STRUCTURAL"));
}
const aclRows = sortRows(aclInventoryRows);
const fRows = sortRows([
  row("F_ACL_PRINCIPAL_INVENTORY", "__collection_status__", {
    collection_status: "complete", inventory_complete: true,
    query_universe: "ai_audit_core_schema_all_acl_and_scoped_roles", row_count: aclRows.length,
  }, "SAFE_STRUCTURAL"),
  ...aclRows,
]);

const gActual: FarmOsProductionIdentityCandidateRow[] = [];
for (const scope of FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RELATION_SCOPES) {
  const [migration_id, object_identity] = splitScope(scope);
  const isFirst = scope === FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RELATION_SCOPES[0];
  gActual.push(row("G_MIGRATION_CATALOG_INVENTORY", `${migration_id}:table:${object_identity}`, {
    collection_status: "complete", migration_id, object_kind: "table", object_identity,
    attributes: isFirst
      ? { exists: true, relkind: "r", owner: "owner", rls_enabled: true, rls_forced: false }
      : { exists: false, relkind: null, owner: null, rls_enabled: null, rls_forced: null },
    raw_sensitive_texts: {},
  }, "SAFE_STRUCTURAL"));
  gActual.push(row("G_MIGRATION_CATALOG_INVENTORY", `${migration_id}:rls_policy_inventory:${object_identity}`, {
    collection_status: "complete", migration_id, object_kind: "rls_policy_inventory", object_identity,
    attributes: {
      inventory_complete: true, policy_count: isFirst ? 1 : 0,
      rls_enabled: isFirst ? true : null, rls_forced: isFirst ? false : null,
    },
    raw_sensitive_texts: {},
  }, "SAFE_STRUCTURAL"));
}
for (const scope of FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_FUNCTION_SCOPES) {
  const [migration_id, functionName] = splitScope(scope);
  const object_identity = `${functionName}()`;
  const isFirst = scope === FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_FUNCTION_SCOPES[0];
  gActual.push(row("G_MIGRATION_CATALOG_INVENTORY", `${migration_id}:function:${object_identity}`, {
    collection_status: "complete", migration_id, object_kind: "function", object_identity,
    attributes: isFirst
      ? { exists: true, owner: "owner", security_definer: false }
      : { exists: false, owner: null, security_definer: null },
    raw_sensitive_texts: {
      definition: isFirst ? "select 'function-secret-value'" : null,
      proconfig: isFirst ? ["app.token=proconfig-secret-value"] : null,
    },
  }, "INTERNAL_RAW_NEVER_PERSIST"));
}
for (const scope of FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ROLE_SCOPES) {
  const [migration_id, object_identity] = splitScope(scope);
  gActual.push(row("G_MIGRATION_CATALOG_INVENTORY", `${migration_id}:role:${object_identity}`, {
    collection_status: "complete", migration_id, object_kind: "role", object_identity,
    attributes: { exists: false, rolsuper: null, rolcreatedb: null, rolcreaterole: null, rolinherit: null, rolreplication: null, rolbypassrls: null },
    raw_sensitive_texts: {},
  }, "SAFE_STRUCTURAL"));
}
for (const [member, granted] of [
  ["farmos_core_proposal_transaction", "farmos_core_proposal_writer"],
  ["farmos_core_proposal_transaction", "farmos_core_projection_writer"],
  ["farmos_core_proposal_transaction", "farmos_core_proposal_audit_writer"],
] as const) {
  const migration_id = "202607260001_eligible_proposal_persistence";
  const object_identity = `${member}->${granted}`;
  gActual.push(row("G_MIGRATION_CATALOG_INVENTORY", `${migration_id}:role_membership:${object_identity}`, {
    collection_status: "complete", migration_id, object_kind: "role_membership", object_identity,
    attributes: { admin_option: false, inherit_option: true, set_option: true, grantor: "owner" },
    raw_sensitive_texts: {},
  }, "SAFE_STRUCTURAL"));
}
const [firstMigration, firstRelation] = splitScope(FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RELATION_SCOPES[0]);
gActual.push(
  row("G_MIGRATION_CATALOG_INVENTORY", `${firstMigration}:column:${firstRelation}.secret_default`, {
    collection_status: "complete", migration_id: firstMigration, object_kind: "column", object_identity: `${firstRelation}.secret_default`,
    attributes: { data_type: "text", not_null: false }, raw_sensitive_texts: { default_expression: "'default-secret-value'::text" },
  }, "INTERNAL_RAW_NEVER_PERSIST"),
  row("G_MIGRATION_CATALOG_INVENTORY", `${firstMigration}:constraint:${firstRelation}.check_one`, {
    collection_status: "complete", migration_id: firstMigration, object_kind: "constraint", object_identity: `${firstRelation}.check_one`,
    attributes: { type: "c" }, raw_sensitive_texts: { definition: "CHECK (value <> 'constraint-secret-value')" },
  }, "INTERNAL_RAW_NEVER_PERSIST"),
  row("G_MIGRATION_CATALOG_INVENTORY", `${firstMigration}:index:${firstRelation}.idx_one`, {
    collection_status: "complete", migration_id: firstMigration, object_kind: "index", object_identity: `${firstRelation}.idx_one`,
    attributes: { unique: false, valid: true }, raw_sensitive_texts: { definition: "index-expression-secret-value" },
  }, "INTERNAL_RAW_NEVER_PERSIST"),
  row("G_MIGRATION_CATALOG_INVENTORY", `${firstMigration}:trigger:${firstRelation}.trigger_one`, {
    collection_status: "complete", migration_id: firstMigration, object_kind: "trigger", object_identity: `${firstRelation}.trigger_one`,
    attributes: { enabled: "O", function_identity: "ai.trigger_fn()" }, raw_sensitive_texts: { definition: "trigger-secret-value" },
  }, "INTERNAL_RAW_NEVER_PERSIST"),
  row("G_MIGRATION_CATALOG_INVENTORY", `${firstMigration}:rls_policy:${firstRelation}.policy_one`, {
    collection_status: "complete", migration_id: firstMigration, object_kind: "rls_policy", object_identity: `${firstRelation}.policy_one`,
    attributes: { command: "SELECT", permissive: true, policy_name: "policy_one", roles: ["public"] },
    raw_sensitive_texts: { qual: "tenant = 'policy-secret-value'", with_check: "token <> 'policy-check-secret-value'" },
  }, "INTERNAL_RAW_NEVER_PERSIST"),
);
sortRows(gActual);
const gRows = sortRows([
  row("G_MIGRATION_CATALOG_INVENTORY", "__collection_status__", {
    collection_status: "complete", inventory_complete: true,
    migration_count: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_MIGRATIONS.length,
    object_classes: [...FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_OBJECT_CLASSES],
    rls_policy_inventory_complete: true, row_count: gActual.length,
  }, "SAFE_STRUCTURAL"),
  ...gActual,
]);

const positive: FarmOsProductionIdentityCandidateResultSet[] = [
  resultSet("A_TRANSACTION_SERVER_GATE", [row("A_TRANSACTION_SERVER_GATE", "server", {
    collection_status: "complete", server_version_num: 170000, database_logical_name: "production_logical",
    operator_role: "verify_reader", transaction_read_only: "on", in_recovery: false,
  }, "SAFE_STRUCTURAL")]),
  resultSet("B_CLUSTER_IDENTITY_SOURCE", [row("B_CLUSTER_IDENTITY_SOURCE", "cluster", {
    collection_status: "complete", raw_cluster_identifier: "9876543210123456789",
  }, "INTERNAL_RAW_NEVER_PERSIST")]),
  resultSet("C_SCHEMA_IDENTITY", [
    row("C_SCHEMA_IDENTITY", "ai", { collection_status: "complete", schema_name: "ai", exists: true, owner_role: "owner" }, "SAFE_STRUCTURAL"),
    row("C_SCHEMA_IDENTITY", "core_schema", { collection_status: "complete", schema_name: "core_schema", exists: true, owner_role: "owner" }, "SAFE_STRUCTURAL"),
  ]),
  resultSet("D_OPERATOR_AUTHORITY", [row("D_OPERATOR_AUTHORITY", "verify_reader", {
    collection_status: "complete", operator_role: "verify_reader", rolsuper: false, rolcreatedb: false,
    rolcreaterole: false, rolinherit: true, rolreplication: false, rolbypassrls: false,
    ai_schema_create: false, core_schema_create: false, memberships: [],
  }, "SAFE_STRUCTURAL")]),
  resultSet("E_INSTALLATION_FARM_BINDING_AVAILABILITY", [
    row("E_INSTALLATION_FARM_BINDING_AVAILABILITY", "farm_scope", {
      collection_status: "complete", binding_name: "farm_scope", available: false, catalog_sources: [],
    }, "SAFE_STRUCTURAL"),
    row("E_INSTALLATION_FARM_BINDING_AVAILABILITY", "installation_id", {
      collection_status: "complete", binding_name: "installation_id", available: false, catalog_sources: [],
    }, "SAFE_STRUCTURAL"),
  ]),
  resultSet("F_ACL_PRINCIPAL_INVENTORY", fRows),
  resultSet("G_MIGRATION_CATALOG_INVENTORY", gRows),
  resultSet("H1_MIGRATION_HISTORY_EXISTENCE", [row("H1_MIGRATION_HISTORY_EXISTENCE", "core_schema.migration_history", {
    collection_status: "complete", relation: "core_schema.migration_history", state: "absent",
  }, "SAFE_STRUCTURAL")]),
  resultSet("H2_MIGRATION_HISTORY_ROWS_IF_PRESENT", [row("H2_MIGRATION_HISTORY_ROWS_IF_PRESENT", "__collection_status__", {
    collection_status: "complete", inventory_complete: true,
    queried_target_count: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_MIGRATIONS.length, row_count: 0, state: "not_applicable",
  }, "SAFE_STRUCTURAL")]),
  resultSet("I_ACTIVITY_LOCK_AGGREGATES", [row("I_ACTIVITY_LOCK_AGGREGATES", "aggregates", {
    collection_status: "complete", activity_visibility_authorized: true, connection_count: 1, active_count: 1,
    idle_in_transaction_count: 0, long_transaction_count: 0, waiting_lock_count: 0,
  }, "AGGREGATE_ONLY")]),
  resultSet("J_DATABASE_SIZE", [row("J_DATABASE_SIZE", "database_bytes", {
    collection_status: "complete", database_bytes: 1024,
  }, "AGGREGATE_ONLY")]),
];

assert.deepEqual(validateFarmOsProductionIdentityQueryV2CandidateResultSets(positive), { valid: true });

const positiveHistoryPresent = structuredClone(positive) as FarmOsProductionIdentityCandidateResultSet[];
positiveHistoryPresent.find((set) => set.section_id === "H1_MIGRATION_HISTORY_EXISTENCE")!.rows[0]!.payload.state = "present";
const historyMigration = FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_MIGRATIONS[0];
(positiveHistoryPresent.find((set) => set.section_id === "H2_MIGRATION_HISTORY_ROWS_IF_PRESENT") as { rows: FarmOsProductionIdentityCandidateRow[] }).rows = sortRows([
  row("H2_MIGRATION_HISTORY_ROWS_IF_PRESENT", historyMigration, {
    collection_status: "complete", migration_id: historyMigration, sequence: 202607260001,
    checksum: `sha256:${"a".repeat(64)}`,
  }, "SAFE_STRUCTURAL"),
  row("H2_MIGRATION_HISTORY_ROWS_IF_PRESENT", "__collection_status__", {
    collection_status: "complete", inventory_complete: true,
    queried_target_count: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_MIGRATIONS.length, row_count: 1, state: "applicable",
  }, "SAFE_STRUCTURAL"),
]);
assert.deepEqual(validateFarmOsProductionIdentityQueryV2CandidateResultSets(positiveHistoryPresent), { valid: true });

const positiveRlsEnabledZeroPolicies = structuredClone(positive) as FarmOsProductionIdentityCandidateResultSet[];
const zeroPolicySet = positiveRlsEnabledZeroPolicies.find((set) => set.section_id === "G_MIGRATION_CATALOG_INVENTORY")!;
const policyIndex = zeroPolicySet.rows.findIndex((candidate) => candidate.payload.object_kind === "rls_policy");
zeroPolicySet.rows.splice(policyIndex, 1);
const firstPolicyInventory = zeroPolicySet.rows.find((candidate) =>
  candidate.payload.object_kind === "rls_policy_inventory" && candidate.payload.object_identity === firstRelation)!;
(firstPolicyInventory.payload.attributes as Record<string, unknown>).policy_count = 0;
const zeroPolicyStatus = zeroPolicySet.rows.find((candidate) => candidate.row_key === "__collection_status__")!;
zeroPolicyStatus.payload.row_count = zeroPolicySet.rows.length - 1;
assert.deepEqual(validateFarmOsProductionIdentityQueryV2CandidateResultSets(positiveRlsEnabledZeroPolicies), { valid: true });

assert.equal(farmOsAclDefaultClassForRelkind("r"), "r");
assert.equal(farmOsAclDefaultClassForRelkind("S"), "s");
assert.equal(farmOsAclDefaultClassForRelkind("f"), "r");
assert.equal(farmOsAclDefaultClassForRelkind("unknown"), null);

const transformed = transformFarmOsProductionIdentityQueryV2CandidateResultSets(positive);
assert.ok(transformed);
assert.equal(validateFarmOsProductionIdentitySanitizedEvidenceCandidate(transformed), true);
const malformedFinal = structuredClone(transformed) as unknown as { sections: Array<{ section_id: string; rows: Array<{ payload: Record<string, unknown> }> }> };
malformedFinal.sections.find((candidate) => candidate.section_id === "A_TRANSACTION_SERVER_GATE")!.rows[0]!.payload.extra = "business-value";
assert.equal(validateFarmOsProductionIdentitySanitizedEvidenceCandidate(malformedFinal), false);
const serialized = JSON.stringify(transformed);
for (const sensitive of [
  "9876543210123456789", "default-secret-value", "proconfig-secret-value", "function-secret-value",
  "constraint-secret-value", "index-expression-secret-value", "trigger-secret-value", "policy-secret-value",
  "policy-check-secret-value",
]) assert.equal(serialized.includes(sensitive), false);
assert.match(serialized, /cluster_system_identifier_digest/u);
assert.match(serialized, /default_expression_digest/u);
assert.match(serialized, /proconfig_digest/u);
assert.match(serialized, /definition_digest/u);
assert.match(serialized, /qual_digest/u);
assert.match(serialized, /with_check_digest/u);
assert.doesNotMatch(serialized, /raw_sensitive_texts|raw_cluster_identifier/u);
for (const unsafe of [
  { business_record_id: "fake-work-record-id" },
  { attributes: { default_expression: "'fake-secret'::text" } },
  { attributes: { proconfig: ["app.token=fake-secret"] } },
  { raw_cluster_identifier: "123" },
  { default_expression_digest: "fake-secret-not-a-digest" },
]) assert.equal(validateFarmOsProductionIdentitySanitizedEvidenceCandidate(unsafe), false);

const rejects = (mutate: (fixture: FarmOsProductionIdentityCandidateResultSet[]) => void): void => {
  const fixture = structuredClone(positive) as FarmOsProductionIdentityCandidateResultSet[];
  mutate(fixture);
  assert.equal(validateFarmOsProductionIdentityQueryV2CandidateResultSets(fixture).valid, false);
};
const section = (fixture: FarmOsProductionIdentityCandidateResultSet[], id: FarmOsProductionIdentityQueryV2CandidateSection) =>
  fixture.find((set) => set.section_id === id)!;
const updateGCount = (fixture: FarmOsProductionIdentityCandidateResultSet[]): void => {
  const set = section(fixture, "G_MIGRATION_CATALOG_INVENTORY");
  const status = set.rows.find((candidate) => candidate.row_key === "__collection_status__")!;
  status.payload.row_count = set.rows.length - 1;
};

let negativeFixtureCount = 0;
const negative = (mutate: (fixture: FarmOsProductionIdentityCandidateResultSet[]) => void): void => {
  negativeFixtureCount += 1;
  rejects(mutate);
};
negative((fixture) => { (section(fixture, "A_TRANSACTION_SERVER_GATE") as { rows: FarmOsProductionIdentityCandidateRow[] }).rows = []; });
negative((fixture) => { section(fixture, "A_TRANSACTION_SERVER_GATE").rows[0]!.payload.server_version_num = "170000"; });
negative((fixture) => { section(fixture, "A_TRANSACTION_SERVER_GATE").rows[0]!.payload.transaction_read_only = "off"; });
negative((fixture) => { (section(fixture, "C_SCHEMA_IDENTITY") as { rows: FarmOsProductionIdentityCandidateRow[] }).rows.splice(0, 1); });
negative((fixture) => { (section(fixture, "C_SCHEMA_IDENTITY") as { rows: FarmOsProductionIdentityCandidateRow[] }).rows.splice(1, 1); });
negative((fixture) => { (section(fixture, "E_INSTALLATION_FARM_BINDING_AVAILABILITY") as { rows: FarmOsProductionIdentityCandidateRow[] }).rows = [row("E_INSTALLATION_FARM_BINDING_AVAILABILITY", "__collection_status__", { collection_status: "complete" }, "SAFE_STRUCTURAL")]; });
negative((fixture) => { (section(fixture, "F_ACL_PRINCIPAL_INVENTORY") as { rows: FarmOsProductionIdentityCandidateRow[] }).rows = [row("F_ACL_PRINCIPAL_INVENTORY", "__collection_status__", { collection_status: "complete" }, "SAFE_STRUCTURAL")]; });
negative((fixture) => { (section(fixture, "F_ACL_PRINCIPAL_INVENTORY") as { rows: FarmOsProductionIdentityCandidateRow[] }).rows = [...section(fixture, "F_ACL_PRINCIPAL_INVENTORY").rows.slice(1)]; });
negative((fixture) => { (section(fixture, "G_MIGRATION_CATALOG_INVENTORY") as { rows: FarmOsProductionIdentityCandidateRow[] }).rows = [row("G_MIGRATION_CATALOG_INVENTORY", "__collection_status__", { collection_status: "complete" }, "SAFE_STRUCTURAL")]; });
negative((fixture) => {
  const status = section(fixture, "G_MIGRATION_CATALOG_INVENTORY").rows.find((candidate) => candidate.row_key === "__collection_status__")!;
  (status.payload.object_classes as string[]).splice(0, 1);
});
negative((fixture) => {
  section(fixture, "H1_MIGRATION_HISTORY_EXISTENCE").rows[0]!.payload.state = "present";
});
negative((fixture) => {
  const set = section(fixture, "C_SCHEMA_IDENTITY") as { rows: FarmOsProductionIdentityCandidateRow[] };
  set.rows.push(structuredClone(set.rows[0]!));
});
negative((fixture) => { section(fixture, "A_TRANSACTION_SERVER_GATE").rows[0]!.payload.extra = true; });
negative((fixture) => { section(fixture, "I_ACTIVITY_LOCK_AGGREGATES").rows[0]!.payload.connection_count = -1; });
negative((fixture) => { section(fixture, "I_ACTIVITY_LOCK_AGGREGATES").rows[0]!.payload.activity_visibility_authorized = false; });
negative((fixture) => { section(fixture, "J_DATABASE_SIZE").rows[0]!.payload.database_bytes = Number.MAX_SAFE_INTEGER + 1; });
negative((fixture) => {
  const set = section(fixture, "C_SCHEMA_IDENTITY") as { rows: FarmOsProductionIdentityCandidateRow[] };
  set.rows.reverse();
});
negative((fixture) => {
  const set = section(fixture, "G_MIGRATION_CATALOG_INVENTORY") as { rows: FarmOsProductionIdentityCandidateRow[] };
  const index = set.rows.findIndex((candidate) => candidate.payload.object_kind === "rls_policy_inventory");
  set.rows.splice(index, 1);
  updateGCount(fixture);
});
negative((fixture) => {
  const set = section(fixture, "G_MIGRATION_CATALOG_INVENTORY") as { rows: FarmOsProductionIdentityCandidateRow[] };
  const index = set.rows.findIndex((candidate) => candidate.payload.object_kind === "rls_policy");
  set.rows.splice(index, 1);
  updateGCount(fixture);
});
negative((fixture) => {
  const sequenceAcl = section(fixture, "F_ACL_PRINCIPAL_INVENTORY").rows.find((candidate) => candidate.payload.object_identity === "ai.seq")!;
  sequenceAcl.payload.acl_default_class = "r";
});
negative((fixture) => {
  const roleRow = section(fixture, "F_ACL_PRINCIPAL_INVENTORY").rows.find((candidate) => candidate.payload.row_kind === "role_flags")!;
  roleRow.payload.object_identity = "unexpected_role";
  roleRow.payload.principal = "unexpected_role";
  roleRow.row_key = "role_flags:unexpected_role:unexpected_role:::";
});
negative((fixture) => {
  const aclRow = section(fixture, "F_ACL_PRINCIPAL_INVENTORY").rows.find((candidate) => candidate.payload.row_kind === "schema_acl")!;
  aclRow.row_key = `${aclRow.row_key}:spoofed`;
});
negative((fixture) => {
  const set = section(fixture, "G_MIGRATION_CATALOG_INVENTORY") as { rows: FarmOsProductionIdentityCandidateRow[] };
  const roleScope = splitScope(FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ROLE_SCOPES[0]);
  set.rows.push(row("G_MIGRATION_CATALOG_INVENTORY", `${roleScope[0]}:role_membership:orphan_a->orphan_b`, {
    collection_status: "complete", migration_id: roleScope[0], object_kind: "role_membership", object_identity: "orphan_a->orphan_b",
    attributes: { admin_option: false, inherit_option: false, set_option: false, grantor: "owner" }, raw_sensitive_texts: {},
  }, "SAFE_STRUCTURAL"));
  sortRows(set.rows);
  updateGCount(fixture);
});
negative((fixture) => {
  const policy = section(fixture, "G_MIGRATION_CATALOG_INVENTORY").rows.find((candidate) => candidate.payload.object_kind === "rls_policy")!;
  (policy.payload.attributes as Record<string, unknown>).policy_name = "different_policy";
});
negative((fixture) => {
  const set = section(fixture, "G_MIGRATION_CATALOG_INVENTORY");
  const table = set.rows.find((candidate) => candidate.payload.object_kind === "table" && candidate.payload.object_identity === firstRelation)!;
  table.payload.attributes = { exists: false, relkind: null, owner: null, rls_enabled: null, rls_forced: null };
  const inventory = set.rows.find((candidate) => candidate.payload.object_kind === "rls_policy_inventory" && candidate.payload.object_identity === firstRelation)!;
  const attributes = inventory.payload.attributes as Record<string, unknown>;
  attributes.rls_enabled = null;
  attributes.rls_forced = null;
});

assert.equal(negativeFixtureCount, 25);
console.log(JSON.stringify({
  result: "pass",
  negative_fixture_count: negativeFixtureCount,
  relation_scope_count: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RELATION_SCOPES.length,
  function_scope_count: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_FUNCTION_SCOPES.length,
  role_scope_count: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ROLE_SCOPES.length,
  production_operations: 0,
}));
