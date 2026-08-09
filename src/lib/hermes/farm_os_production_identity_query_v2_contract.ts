import { createHash } from "node:crypto";

export const FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION =
  "farmos.production-identity-query-v2-sanitized-result.v1" as const;

export const FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_CANDIDATE_SECTIONS = [
  "A_TRANSACTION_SERVER_GATE",
  "B_CLUSTER_IDENTITY_SOURCE",
  "C_SCHEMA_IDENTITY",
  "D_OPERATOR_AUTHORITY",
  "E_INSTALLATION_FARM_BINDING_AVAILABILITY",
  "F_ACL_PRINCIPAL_INVENTORY",
  "G_MIGRATION_CATALOG_INVENTORY",
  "H1_MIGRATION_HISTORY_EXISTENCE",
  "H2_MIGRATION_HISTORY_ROWS_IF_PRESENT",
  "I_ACTIVITY_LOCK_AGGREGATES",
  "J_DATABASE_SIZE",
] as const;

export const FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_MIGRATIONS = [
  "202607260001_eligible_proposal_persistence",
  "202607300001_daily_operational_projection_candidate_foundation",
  "202607310001_daily_operational_projection_candidate_activation",
  "202608030001_daily_operational_projection_command_ledger",
  "202608070001_stable_changes_consumer_persistence",
] as const;

export const FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_OBJECT_CLASSES = [
  "column", "constraint", "function", "index", "rls_policy",
  "rls_policy_inventory", "role", "role_membership", "table", "trigger",
] as const;

export const FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RELATION_SCOPES = [
  "202607260001_eligible_proposal_persistence:ai.proposal_creation_idempotency",
  "202607260001_eligible_proposal_persistence:ai.proposal_execution_state",
  "202607260001_eligible_proposal_persistence:ai.proposal_inbox",
  "202607260001_eligible_proposal_persistence:audit.proposal_creation_events",
  "202607260001_eligible_proposal_persistence:audit.proposal_execution_state_events",
  "202607260001_eligible_proposal_persistence:core_schema.migration_history",
  "202607300001_daily_operational_projection_candidate_foundation:ai.operational_memory_projection_state_events",
  "202607310001_daily_operational_projection_candidate_activation:ai.operational_memory_daily_projections",
  "202607310001_daily_operational_projection_candidate_activation:ai.operational_memory_projection_state_events",
  "202608030001_daily_operational_projection_command_ledger:ai.operational_memory_daily_projections",
  "202608030001_daily_operational_projection_command_ledger:ai.operational_memory_projection_command_receipts",
  "202608030001_daily_operational_projection_command_ledger:ai.operational_memory_projection_lineage",
  "202608030001_daily_operational_projection_command_ledger:ai.operational_memory_projection_review_decisions",
  "202608030001_daily_operational_projection_command_ledger:ai.operational_memory_projection_state_events",
  "202608030001_daily_operational_projection_command_ledger:ai.operational_memory_snapshot_state_events",
  "202608030001_daily_operational_projection_command_ledger:ai.operational_memory_source_snapshots",
  "202608070001_stable_changes_consumer_persistence:ai.stable_changes_consumer_checkpoints",
  "202608070001_stable_changes_consumer_persistence:ai.stable_changes_consumer_scopes",
  "202608070001_stable_changes_consumer_persistence:ai.stable_changes_page_commit_receipts",
  "202608070001_stable_changes_consumer_persistence:ai.stable_changes_validated_ingress",
] as const;

export const FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_FUNCTION_SCOPES = [
  "202607260001_eligible_proposal_persistence:ai.enforce_proposal_creation_idempotency_transition",
  "202607260001_eligible_proposal_persistence:ai.enforce_proposal_execution_state_transition",
  "202607260001_eligible_proposal_persistence:ai.protect_projected_proposal_inbox_binding",
  "202607260001_eligible_proposal_persistence:audit.reject_proposal_audit_mutation",
  "202607310001_daily_operational_projection_candidate_activation:ai.enforce_operational_memory_projection_state_transition",
  "202607310001_daily_operational_projection_candidate_activation:ai.reject_operational_memory_immutable_mutation",
  "202607310001_daily_operational_projection_candidate_activation:ai.require_operational_memory_initial_candidate_event",
  "202608030001_daily_operational_projection_command_ledger:ai.enforce_operational_memory_projection_command_receipt_binding",
  "202608030001_daily_operational_projection_command_ledger:ai.enforce_operational_memory_projection_review_binding",
  "202608030001_daily_operational_projection_command_ledger:ai.enforce_operational_memory_projection_state_transition",
  "202608030001_daily_operational_projection_command_ledger:ai.persist_operational_memory_bundle",
  "202608030001_daily_operational_projection_command_ledger:ai.persist_operational_memory_projection_command",
  "202608030001_daily_operational_projection_command_ledger:ai.reject_operational_memory_projection_command_ledger_mutation",
  "202608030001_daily_operational_projection_command_ledger:ai.require_operational_memory_initial_candidate_event",
  "202608030001_daily_operational_projection_command_ledger:ai.require_operational_memory_projection_command_receipt",
  "202608070001_stable_changes_consumer_persistence:ai.commit_stable_changes_page",
  "202608070001_stable_changes_consumer_persistence:ai.initialize_stable_changes_consumer_scope",
  "202608070001_stable_changes_consumer_persistence:ai.load_stable_changes_checkpoint",
  "202608070001_stable_changes_consumer_persistence:ai.reject_stable_changes_immutable_mutation",
  "202608070001_stable_changes_consumer_persistence:ai.stable_changes_canonical_jsonb",
  "202608070001_stable_changes_consumer_persistence:ai.stable_changes_checkpoint_json",
] as const;

export const FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ROLE_SCOPES = [
  "202607260001_eligible_proposal_persistence:farmos_core_projection_reader",
  "202607260001_eligible_proposal_persistence:farmos_core_projection_writer",
  "202607260001_eligible_proposal_persistence:farmos_core_proposal_audit_writer",
  "202607260001_eligible_proposal_persistence:farmos_core_proposal_reviewer",
  "202607260001_eligible_proposal_persistence:farmos_core_proposal_transaction",
  "202607260001_eligible_proposal_persistence:farmos_core_proposal_writer",
  "202608030001_daily_operational_projection_command_ledger:farmos_core_projection_command_transaction",
  "202608070001_stable_changes_consumer_persistence:farmos_core_stable_changes_runtime",
] as const;
export const FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ACL_ROLE_NAMES = [
  "farmos_core_projection_command_transaction",
  "farmos_core_projection_reader",
  "farmos_core_projection_writer",
  "farmos_core_proposal_audit_writer",
  "farmos_core_proposal_reviewer",
  "farmos_core_proposal_transaction",
  "farmos_core_proposal_writer",
  "farmos_core_stable_changes_runtime",
] as const;

export type FarmOsProductionIdentityQueryV2CandidateSection =
  typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_CANDIDATE_SECTIONS[number];
export type FarmOsProductionIdentityQueryV2Migration =
  typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_MIGRATIONS[number];
export type FarmOsProductionIdentityQueryV2ObjectClass =
  typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_OBJECT_CLASSES[number];
export type FarmOsProductionIdentitySanitizationClass =
  "AGGREGATE_ONLY" | "DIGEST_ONLY" | "INTERNAL_RAW_NEVER_PERSIST" | "SAFE_STRUCTURAL";

export type FarmOsProductionIdentityCandidateRow = {
  section_id: FarmOsProductionIdentityQueryV2CandidateSection;
  row_key: string;
  payload: Record<string, unknown>;
  sanitization_class: FarmOsProductionIdentitySanitizationClass;
};
export type FarmOsProductionIdentityCandidateResultSet = {
  section_id: FarmOsProductionIdentityQueryV2CandidateSection;
  rows: FarmOsProductionIdentityCandidateRow[];
};

export type ServerIdentityRow = FarmOsProductionIdentityCandidateRow & {
  section_id: "A_TRANSACTION_SERVER_GATE";
  payload: {
    collection_status: "complete";
    server_version_num: number;
    database_logical_name: string;
    operator_role: string;
    transaction_read_only: "on";
    in_recovery: boolean;
  };
};
export type SchemaIdentityRow = FarmOsProductionIdentityCandidateRow & {
  section_id: "C_SCHEMA_IDENTITY";
  row_key: "ai" | "core_schema";
  payload: { collection_status: "complete"; schema_name: "ai" | "core_schema"; exists: boolean; owner_role: string | null };
};
export type HistoryStatusRow = FarmOsProductionIdentityCandidateRow & {
  section_id: "H1_MIGRATION_HISTORY_EXISTENCE";
  payload: { collection_status: "complete"; relation: "core_schema.migration_history"; state: "absent" | "present" };
};
export type ActivityRow = FarmOsProductionIdentityCandidateRow & {
  section_id: "I_ACTIVITY_LOCK_AGGREGATES";
  payload: Record<string, boolean | number | "complete">;
};
export type CapacityRow = FarmOsProductionIdentityCandidateRow & {
  section_id: "J_DATABASE_SIZE";
  payload: { collection_status: "complete"; database_bytes: number };
};

type JsonRecord = Record<string, unknown>;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:@() /,+<>-]{0,499}$/u;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const MAX_COUNT = 1_000_000_000;
const F_QUERY_UNIVERSE = "ai_audit_core_schema_all_acl_and_scoped_roles";
const MIGRATION_SET = new Set<string>(FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_MIGRATIONS);
const OBJECT_CLASS_SET = new Set<string>(FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_OBJECT_CLASSES);

const record = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (value: JsonRecord, keys: readonly string[]): boolean => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};
const bounded = (value: unknown, maximum = 500): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maximum;
const nullableBounded = (value: unknown, maximum = 500): value is string | null =>
  value === null || bounded(value, maximum);
const safeInteger = (value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
const booleanOrNull = (value: unknown): value is boolean | null => value === null || typeof value === "boolean";
const sortedStrings = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => bounded(item)) && value.every((item, index) =>
    index === 0 || Buffer.compare(Buffer.from(String(value[index - 1])), Buffer.from(item)) < 0);
const rowOrderValid = (rows: readonly JsonRecord[]): boolean => rows.every((row, index) =>
  index === 0 || Buffer.compare(Buffer.from(String(rows[index - 1]?.row_key)), Buffer.from(String(row.row_key))) < 0);

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("candidate_canonical_json_non_finite");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (!record(value)) throw new Error("candidate_canonical_json_invalid");
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

const sha256 = (value: unknown): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(canonicalJson(value), "utf8").digest("hex")}`;

export function farmOsAclDefaultClassForRelkind(relkind: unknown): "r" | "s" | null {
  if (relkind === "S") return "s";
  return ["r", "p", "v", "m", "f"].includes(String(relkind)) ? "r" : null;
}

function baseRow(value: unknown, section: FarmOsProductionIdentityQueryV2CandidateSection): value is JsonRecord {
  return record(value) && exact(value, ["section_id", "row_key", "payload", "sanitization_class"]) &&
    value.section_id === section && bounded(value.row_key) && record(value.payload) &&
    value.payload.collection_status === "complete" &&
    ["AGGREGATE_ONLY", "INTERNAL_RAW_NEVER_PERSIST", "SAFE_STRUCTURAL"].includes(String(value.sanitization_class));
}

function validateA(rows: readonly JsonRecord[]): boolean {
  if (rows.length !== 1 || rows[0]?.row_key !== "server" || rows[0]?.sanitization_class !== "SAFE_STRUCTURAL") return false;
  const payload = rows[0]?.payload;
  return record(payload) && exact(payload, ["collection_status", "server_version_num", "database_logical_name", "operator_role", "transaction_read_only", "in_recovery"]) &&
    safeInteger(payload.server_version_num, 140000, 999999) && bounded(payload.database_logical_name, 128) &&
    bounded(payload.operator_role, 128) && payload.transaction_read_only === "on" && typeof payload.in_recovery === "boolean";
}

function validateB(rows: readonly JsonRecord[]): boolean {
  const payload = rows[0]?.payload;
  return rows.length === 1 && rows[0]?.row_key === "cluster" && rows[0]?.sanitization_class === "INTERNAL_RAW_NEVER_PERSIST" &&
    record(payload) && exact(payload, ["collection_status", "raw_cluster_identifier"]) &&
    typeof payload.raw_cluster_identifier === "string" && /^[0-9]{1,20}$/u.test(payload.raw_cluster_identifier);
}

function validateC(rows: readonly JsonRecord[]): boolean {
  if (rows.length !== 2 || rows[0]?.row_key !== "ai" || rows[1]?.row_key !== "core_schema") return false;
  return rows.every((row) => {
    const payload = row.payload;
    return row.sanitization_class === "SAFE_STRUCTURAL" && record(payload) &&
      exact(payload, ["collection_status", "schema_name", "exists", "owner_role"]) &&
      payload.schema_name === row.row_key && typeof payload.exists === "boolean" && nullableBounded(payload.owner_role, 128) &&
      (payload.exists ? typeof payload.owner_role === "string" : payload.owner_role === null);
  });
}

function validateMemberships(value: unknown): boolean {
  return Array.isArray(value) && value.every((membership) => record(membership) &&
    exact(membership, ["granted_role", "admin_option", "inherit_option", "set_option"]) &&
    bounded(membership.granted_role, 128) && typeof membership.admin_option === "boolean" &&
    typeof membership.inherit_option === "boolean" && typeof membership.set_option === "boolean") &&
    value.every((membership, index) => index === 0 ||
      Buffer.compare(Buffer.from(String(value[index - 1]?.granted_role)), Buffer.from(String(membership.granted_role))) < 0);
}

function validateD(rows: readonly JsonRecord[]): boolean {
  const payload = rows[0]?.payload;
  return rows.length === 1 && rows[0]?.sanitization_class === "SAFE_STRUCTURAL" && record(payload) &&
    rows[0]?.row_key === payload.operator_role && exact(payload, [
      "collection_status", "operator_role", "rolsuper", "rolcreatedb", "rolcreaterole", "rolinherit",
      "rolreplication", "rolbypassrls", "ai_schema_create", "core_schema_create", "memberships",
    ]) && bounded(payload.operator_role, 128) &&
    [payload.rolsuper, payload.rolcreatedb, payload.rolcreaterole, payload.rolinherit,
      payload.rolreplication, payload.rolbypassrls].every((item) => typeof item === "boolean") &&
    booleanOrNull(payload.ai_schema_create) && booleanOrNull(payload.core_schema_create) && validateMemberships(payload.memberships);
}

function validateCatalogSources(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  const keys: string[] = [];
  for (const source of value) {
    if (!record(source) || !exact(source, ["schema_name", "relation_name", "data_type"]) ||
      !["ai", "core_schema"].includes(String(source.schema_name)) || !bounded(source.relation_name) || !bounded(source.data_type)) return false;
    keys.push(`${source.schema_name}.${source.relation_name}`);
  }
  return keys.every((key, index) => index === 0 || Buffer.compare(Buffer.from(keys[index - 1]!), Buffer.from(key)) < 0);
}

function validateE(rows: readonly JsonRecord[]): boolean {
  if (rows.length !== 2 || rows[0]?.row_key !== "farm_scope" || rows[1]?.row_key !== "installation_id") return false;
  return rows.every((row) => {
    const payload = row.payload;
    return row.sanitization_class === "SAFE_STRUCTURAL" && record(payload) &&
      exact(payload, ["collection_status", "binding_name", "available", "catalog_sources"]) &&
      payload.binding_name === row.row_key && typeof payload.available === "boolean" && validateCatalogSources(payload.catalog_sources) &&
      (payload.available ? (payload.catalog_sources as unknown[]).length > 0 : (payload.catalog_sources as unknown[]).length === 0);
  });
}

function validRoleFlags(value: unknown): boolean {
  return record(value) && exact(value, ["exists", "rolsuper", "rolcreatedb", "rolcreaterole", "rolinherit", "rolreplication", "rolbypassrls"]) &&
    typeof value.exists === "boolean" && [value.rolsuper, value.rolcreatedb, value.rolcreaterole, value.rolinherit, value.rolreplication, value.rolbypassrls]
      .every((item) => value.exists ? typeof item === "boolean" : item === null);
}

function validateF(rows: readonly JsonRecord[]): boolean {
  const statusRows = rows.filter((row) => row.row_key === "__collection_status__");
  if (statusRows.length !== 1) return false;
  const statusRow = statusRows[0]!;
  const actual = rows.filter((row) => row.row_key !== "__collection_status__");
  const status = statusRow.payload;
  if (!record(status) || !exact(status, ["collection_status", "inventory_complete", "query_universe", "row_count"]) ||
    status.inventory_complete !== true || status.query_universe !== F_QUERY_UNIVERSE || !safeInteger(status.row_count, 0, MAX_COUNT) ||
    status.row_count !== actual.length || statusRow.sanitization_class !== "SAFE_STRUCTURAL") return false;
  for (const row of actual) {
    const payload = row.payload;
    if (row.sanitization_class !== "SAFE_STRUCTURAL" || !record(payload) || !exact(payload, [
      "collection_status", "row_kind", "object_identity", "principal", "privilege", "grant_option", "grantor", "acl_default_class", "relation_kind", "role_flags",
    ]) || !bounded(payload.object_identity) || !bounded(payload.principal, 128) ||
      row.row_key !== `${payload.row_kind}:${payload.object_identity}:${payload.principal}:${payload.privilege ?? ""}:${payload.grantor ?? ""}:${payload.grant_option ?? ""}`) return false;
    if (["schema_acl", "relation_acl", "function_acl"].includes(String(payload.row_kind))) {
      const expectedDefault = payload.row_kind === "schema_acl" ? "n" : payload.row_kind === "function_acl" ? "f" : farmOsAclDefaultClassForRelkind(payload.relation_kind);
      if (!bounded(payload.privilege, 64) || typeof payload.grant_option !== "boolean" || !bounded(payload.grantor, 128) ||
        payload.role_flags !== null || !["n", "r", "s", "f"].includes(String(payload.acl_default_class)) || payload.acl_default_class !== expectedDefault ||
        (payload.row_kind === "relation_acl" ? farmOsAclDefaultClassForRelkind(payload.relation_kind) === null : payload.relation_kind !== null)) return false;
    } else if (payload.row_kind === "role_flags") {
      if (payload.privilege !== null || payload.grant_option !== null || payload.grantor !== null || payload.acl_default_class !== null || payload.relation_kind !== null || !validRoleFlags(payload.role_flags)) return false;
    } else if (payload.row_kind === "role_membership") {
      if (!bounded(payload.privilege, 128) || typeof payload.grant_option !== "boolean" || !bounded(payload.grantor, 128) || payload.acl_default_class !== null || payload.relation_kind !== null ||
        !record(payload.role_flags) || !exact(payload.role_flags, ["inherit_option", "set_option"]) ||
        typeof payload.role_flags.inherit_option !== "boolean" || typeof payload.role_flags.set_option !== "boolean") return false;
    } else return false;
  }
  const roleRows = actual.filter((row) => (row.payload as JsonRecord).row_kind === "role_flags");
  const roleNames = roleRows.map((row) => String((row.payload as JsonRecord).object_identity));
  return roleRows.length === FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ACL_ROLE_NAMES.length &&
    new Set(roleNames).size === FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ACL_ROLE_NAMES.length &&
    FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ACL_ROLE_NAMES.every((roleName) => roleNames.includes(roleName)) &&
    roleRows.every((row) => {
      const payload = row.payload as JsonRecord;
      return payload.principal === payload.object_identity;
    });
}

const allowedRawKeys: Readonly<Record<FarmOsProductionIdentityQueryV2ObjectClass, readonly string[]>> = {
  table: [], column: ["default_expression"], constraint: ["definition"], index: ["definition"],
  function: ["definition", "proconfig"], trigger: ["definition"], rls_policy: ["qual", "with_check"],
  rls_policy_inventory: [], role: [], role_membership: [],
};

function validateObjectAttributes(kind: FarmOsProductionIdentityQueryV2ObjectClass, value: unknown): boolean {
  if (!record(value)) return false;
  if (kind === "table") return exact(value, ["exists", "relkind", "owner", "rls_enabled", "rls_forced"]) &&
    typeof value.exists === "boolean" && (value.exists ? ["r", "p"].includes(String(value.relkind)) && bounded(value.owner, 128) && typeof value.rls_enabled === "boolean" && typeof value.rls_forced === "boolean" :
      value.relkind === null && value.owner === null && value.rls_enabled === null && value.rls_forced === null);
  if (kind === "column") return exact(value, ["data_type", "not_null"]) && bounded(value.data_type) && typeof value.not_null === "boolean";
  if (kind === "constraint") return exact(value, ["type"]) && bounded(value.type, 1);
  if (kind === "index") return exact(value, ["unique", "valid"]) && typeof value.unique === "boolean" && typeof value.valid === "boolean";
  if (kind === "function") return exact(value, ["exists", "owner", "security_definer"]) && typeof value.exists === "boolean" &&
    (value.exists ? bounded(value.owner, 128) && typeof value.security_definer === "boolean" : value.owner === null && value.security_definer === null);
  if (kind === "trigger") return exact(value, ["enabled", "function_identity"]) && bounded(value.enabled, 1) && bounded(value.function_identity);
  if (kind === "rls_policy_inventory") return exact(value, ["inventory_complete", "policy_count", "rls_enabled", "rls_forced"]) &&
    value.inventory_complete === true && safeInteger(value.policy_count, 0, MAX_COUNT) && booleanOrNull(value.rls_enabled) && booleanOrNull(value.rls_forced);
  if (kind === "rls_policy") return exact(value, ["command", "permissive", "policy_name", "roles"]) &&
    ["ALL", "SELECT", "INSERT", "UPDATE", "DELETE"].includes(String(value.command)) && typeof value.permissive === "boolean" &&
    bounded(value.policy_name) && sortedStrings(value.roles);
  if (kind === "role") return validRoleFlags(value);
  return exact(value, ["admin_option", "inherit_option", "set_option", "grantor"]) &&
    typeof value.admin_option === "boolean" && typeof value.inherit_option === "boolean" &&
    typeof value.set_option === "boolean" && bounded(value.grantor, 128);
}

function validateRawSensitive(kind: FarmOsProductionIdentityQueryV2ObjectClass, value: unknown): boolean {
  if (!record(value) || !exact(value, allowedRawKeys[kind])) return false;
  return Object.entries(value).every(([key, raw]) => {
    if (key === "proconfig") return raw === null || (Array.isArray(raw) && raw.every((item) => typeof item === "string" && item.length <= 10_000));
    return raw === null || (typeof raw === "string" && raw.length <= 100_000);
  });
}

function validateExactScopes(rows: readonly JsonRecord[], kind: "table" | "function" | "role", expected: readonly string[]): boolean {
  const observed = rows.filter((row) => (row.payload as JsonRecord).object_kind === kind).map((row) => {
    const payload = row.payload as JsonRecord;
    const rawIdentity = String(payload.object_identity);
    const identity = kind === "function" ? rawIdentity.slice(0, rawIdentity.indexOf("(")) : rawIdentity;
    return `${payload.migration_id}:${identity}`;
  });
  return observed.length === expected.length && new Set(observed).size === expected.length && expected.every((scope) => observed.includes(scope));
}

function validateG(rows: readonly JsonRecord[]): boolean {
  const statusRows = rows.filter((row) => row.row_key === "__collection_status__");
  if (statusRows.length !== 1) return false;
  const statusRow = statusRows[0]!;
  const actual = rows.filter((row) => row.row_key !== "__collection_status__");
  if (actual.length < 1) return false;
  const status = statusRow.payload;
  if (!record(status) || !exact(status, ["collection_status", "inventory_complete", "migration_count", "object_classes", "rls_policy_inventory_complete", "row_count"]) ||
    status.inventory_complete !== true || status.rls_policy_inventory_complete !== true ||
    status.migration_count !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_MIGRATIONS.length ||
    !Array.isArray(status.object_classes) || JSON.stringify(status.object_classes) !== JSON.stringify(FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_OBJECT_CLASSES) ||
    !safeInteger(status.row_count, 1, MAX_COUNT) || status.row_count !== actual.length || statusRow.sanitization_class !== "SAFE_STRUCTURAL") return false;
  for (const row of actual) {
    const payload = row.payload;
    if (!record(payload) || !exact(payload, ["collection_status", "migration_id", "object_kind", "object_identity", "attributes", "raw_sensitive_texts"]) ||
      !MIGRATION_SET.has(String(payload.migration_id)) || !OBJECT_CLASS_SET.has(String(payload.object_kind)) || !bounded(payload.object_identity) ||
      row.row_key !== `${payload.migration_id}:${payload.object_kind}:${payload.object_identity}`) return false;
    const kind = payload.object_kind as FarmOsProductionIdentityQueryV2ObjectClass;
    if (!validateObjectAttributes(kind, payload.attributes) || !validateRawSensitive(kind, payload.raw_sensitive_texts)) return false;
    const hasRawKeys = Object.keys(payload.raw_sensitive_texts as JsonRecord).length > 0;
    if ((hasRawKeys ? "INTERNAL_RAW_NEVER_PERSIST" : "SAFE_STRUCTURAL") !== row.sanitization_class) return false;
  }
  if (!validateExactScopes(actual, "table", FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RELATION_SCOPES) ||
    !validateExactScopes(actual, "function", FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_FUNCTION_SCOPES) ||
    !validateExactScopes(actual, "role", FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ROLE_SCOPES)) return false;
  const tables = actual.filter((row) => (row.payload as JsonRecord).object_kind === "table");
  const policyInventories = actual.filter((row) => (row.payload as JsonRecord).object_kind === "rls_policy_inventory");
  if (policyInventories.length !== tables.length) return false;
  for (const table of tables) {
    const tablePayload = table.payload as JsonRecord;
    const matchingInventory = policyInventories.filter((row) => {
      const payload = row.payload as JsonRecord;
      return payload.migration_id === tablePayload.migration_id && payload.object_identity === tablePayload.object_identity;
    });
    if (matchingInventory.length !== 1) return false;
    const inventoryPayload = matchingInventory[0]!.payload as JsonRecord;
    const attributes = inventoryPayload.attributes as JsonRecord;
    const tableAttributes = tablePayload.attributes as JsonRecord;
    if (attributes.rls_enabled !== tableAttributes.rls_enabled || attributes.rls_forced !== tableAttributes.rls_forced) return false;
    const policyPrefix = `${tablePayload.object_identity}.`;
    const policyCount = actual.filter((row) => {
      const payload = row.payload as JsonRecord;
      return payload.object_kind === "rls_policy" && payload.migration_id === tablePayload.migration_id && String(payload.object_identity).startsWith(policyPrefix);
    }).length;
    if (attributes.policy_count !== policyCount) return false;
    if (tableAttributes.exists === false && policyCount !== 0) return false;
  }
  const relationDerivedKinds = new Set(["column", "constraint", "index", "trigger", "rls_policy"]);
  for (const derived of actual.filter((row) => relationDerivedKinds.has(String((row.payload as JsonRecord).object_kind)))) {
    const payload = derived.payload as JsonRecord;
    const owningRelations = tables.filter((table) => {
      const tablePayload = table.payload as JsonRecord;
      return tablePayload.migration_id === payload.migration_id && String(payload.object_identity).startsWith(`${tablePayload.object_identity}.`);
    });
    if (owningRelations.length !== 1) return false;
    if ((payload.object_kind === "rls_policy") && (() => {
      const attributes = payload.attributes as JsonRecord;
      const relationIdentity = (owningRelations[0]!.payload as JsonRecord).object_identity;
      const tableAttributes = (owningRelations[0]!.payload as JsonRecord).attributes as JsonRecord;
      return payload.object_identity !== `${relationIdentity}.${attributes.policy_name}` || tableAttributes.exists !== true;
    })()) return false;
  }
  const rolesByMigration = new Map<string, Set<string>>();
  for (const scope of FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ROLE_SCOPES) {
    const separator = scope.indexOf(":");
    const migration = scope.slice(0, separator);
    const roleName = scope.slice(separator + 1);
    const names = rolesByMigration.get(migration) ?? new Set<string>();
    names.add(roleName);
    rolesByMigration.set(migration, names);
  }
  for (const membership of actual.filter((row) => (row.payload as JsonRecord).object_kind === "role_membership")) {
    const payload = membership.payload as JsonRecord;
    const [member, granted, ...extra] = String(payload.object_identity).split("->");
    const scopedRoles = rolesByMigration.get(String(payload.migration_id));
    if (extra.length > 0 || !member || !granted || scopedRoles === undefined || (!scopedRoles.has(member) && !scopedRoles.has(granted))) return false;
  }
  return true;
}

function validateH1(rows: readonly JsonRecord[]): boolean {
  const payload = rows[0]?.payload;
  return rows.length === 1 && rows[0]?.row_key === "core_schema.migration_history" && rows[0]?.sanitization_class === "SAFE_STRUCTURAL" &&
    record(payload) && exact(payload, ["collection_status", "relation", "state"]) && payload.relation === "core_schema.migration_history" &&
    ["absent", "present"].includes(String(payload.state));
}

function validateH2(rows: readonly JsonRecord[], historyState: "absent" | "present"): boolean {
  const statusRows = rows.filter((row) => row.row_key === "__collection_status__");
  if (statusRows.length !== 1 || statusRows[0]?.sanitization_class !== "SAFE_STRUCTURAL") return false;
  const actual = rows.filter((row) => row.row_key !== "__collection_status__");
  const status = statusRows[0]!.payload;
  if (!record(status) || !exact(status, ["collection_status", "inventory_complete", "queried_target_count", "row_count", "state"]) ||
    status.inventory_complete !== true || status.queried_target_count !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_MIGRATIONS.length ||
    !safeInteger(status.row_count, 0, FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_MIGRATIONS.length) || status.row_count !== actual.length) return false;
  if (historyState === "absent") return status.state === "not_applicable" && actual.length === 0;
  if (status.state !== "applicable") return false;
  return actual.every((row) => {
    const payload = row.payload;
    return row.sanitization_class === "SAFE_STRUCTURAL" && record(payload) && exact(payload, ["collection_status", "migration_id", "sequence", "checksum"]) &&
      row.row_key === payload.migration_id && MIGRATION_SET.has(String(payload.migration_id)) && safeInteger(payload.sequence, 1) &&
      typeof payload.checksum === "string" && DIGEST.test(payload.checksum);
  });
}

function validateI(rows: readonly JsonRecord[]): boolean {
  const payload = rows[0]?.payload;
  return rows.length === 1 && rows[0]?.row_key === "aggregates" && rows[0]?.sanitization_class === "AGGREGATE_ONLY" && record(payload) &&
    exact(payload, ["collection_status", "activity_visibility_authorized", "connection_count", "active_count", "idle_in_transaction_count", "long_transaction_count", "waiting_lock_count"]) &&
    payload.activity_visibility_authorized === true && [payload.connection_count, payload.active_count, payload.idle_in_transaction_count, payload.long_transaction_count, payload.waiting_lock_count]
      .every((item) => safeInteger(item, 0, MAX_COUNT));
}

function validateJ(rows: readonly JsonRecord[]): boolean {
  const payload = rows[0]?.payload;
  return rows.length === 1 && rows[0]?.row_key === "database_bytes" && rows[0]?.sanitization_class === "AGGREGATE_ONLY" &&
    record(payload) && exact(payload, ["collection_status", "database_bytes"]) && safeInteger(payload.database_bytes, 0);
}

function parseResultSets(value: unknown): FarmOsProductionIdentityCandidateResultSet[] | null {
  if (!Array.isArray(value) || value.length !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_CANDIDATE_SECTIONS.length) return null;
  const parsed: FarmOsProductionIdentityCandidateResultSet[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const section = FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_CANDIDATE_SECTIONS[index]!;
    const candidate = value[index];
    if (!record(candidate) || !exact(candidate, ["section_id", "rows"]) || candidate.section_id !== section || !Array.isArray(candidate.rows) || candidate.rows.length === 0) return null;
    const rows = candidate.rows as unknown[];
    if (!rows.every((row) => baseRow(row, section)) || !rowOrderValid(rows as JsonRecord[])) return null;
    parsed.push(candidate as FarmOsProductionIdentityCandidateResultSet);
  }
  const bySection = new Map(parsed.map((set) => [set.section_id, set.rows as unknown as JsonRecord[]]));
  if (!validateA(bySection.get("A_TRANSACTION_SERVER_GATE")!) || !validateB(bySection.get("B_CLUSTER_IDENTITY_SOURCE")!) ||
    !validateC(bySection.get("C_SCHEMA_IDENTITY")!) || !validateD(bySection.get("D_OPERATOR_AUTHORITY")!) ||
    !validateE(bySection.get("E_INSTALLATION_FARM_BINDING_AVAILABILITY")!) || !validateF(bySection.get("F_ACL_PRINCIPAL_INVENTORY")!) ||
    !validateG(bySection.get("G_MIGRATION_CATALOG_INVENTORY")!) || !validateH1(bySection.get("H1_MIGRATION_HISTORY_EXISTENCE")!)) return null;
  const h1Payload = bySection.get("H1_MIGRATION_HISTORY_EXISTENCE")![0]!.payload as JsonRecord;
  if (!validateH2(bySection.get("H2_MIGRATION_HISTORY_ROWS_IF_PRESENT")!, h1Payload.state as "absent" | "present") ||
    !validateI(bySection.get("I_ACTIVITY_LOCK_AGGREGATES")!) || !validateJ(bySection.get("J_DATABASE_SIZE")!)) return null;
  return parsed;
}

export function validateFarmOsProductionIdentityQueryV2CandidateResultSets(
  value: unknown,
): { valid: true } | { valid: false; reason: "candidate_result_contract_invalid" } {
  return parseResultSets(value) === null ? { valid: false, reason: "candidate_result_contract_invalid" } : { valid: true };
}

export type FarmOsProductionIdentitySanitizedCandidateEvidence = {
  schema_version: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION;
  sections: readonly {
    section_id: FarmOsProductionIdentityQueryV2CandidateSection;
    rows: readonly { row_key: string; payload: JsonRecord; sanitization_class: Exclude<FarmOsProductionIdentitySanitizationClass, "INTERNAL_RAW_NEVER_PERSIST"> }[];
  }[];
};

export function transformFarmOsProductionIdentityQueryV2CandidateResultSets(
  value: unknown,
): FarmOsProductionIdentitySanitizedCandidateEvidence | null {
  const parsed = parseResultSets(value);
  if (parsed === null) return null;
  return {
    schema_version: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION,
    sections: parsed.map((set) => ({
      section_id: set.section_id,
      rows: set.rows.map((row) => {
        if (row.section_id === "B_CLUSTER_IDENTITY_SOURCE") {
          return {
            row_key: row.row_key,
            payload: {
              collection_status: "complete",
              cluster_system_identifier_digest: sha256(row.payload.raw_cluster_identifier),
            },
            sanitization_class: "DIGEST_ONLY" as const,
          };
        }
        if (row.section_id === "G_MIGRATION_CATALOG_INVENTORY" && row.row_key !== "__collection_status__") {
          const raw = row.payload.raw_sensitive_texts as JsonRecord;
          const sensitiveDigests = Object.fromEntries(Object.entries(raw).map(([key, rawValue]) => [`${key}_digest`, sha256(rawValue)]));
          const { raw_sensitive_texts: _discarded, ...safePayload } = row.payload;
          return {
            row_key: row.row_key,
            payload: { ...safePayload, sensitive_digests: sensitiveDigests },
            sanitization_class: Object.keys(raw).length > 0 ? "DIGEST_ONLY" as const : "SAFE_STRUCTURAL" as const,
          };
        }
        return { row_key: row.row_key, payload: { ...row.payload }, sanitization_class: row.sanitization_class as "AGGREGATE_ONLY" | "SAFE_STRUCTURAL" };
      }),
    })),
  };
}

const FORBIDDEN_FINAL_KEYS = new Set([
  "business_record_id", "client_addr", "client_ip", "connection_string", "host", "password",
  "query", "raw_cluster_identifier", "raw_definition", "raw_sensitive_texts", "sql", "token",
  "default_expression", "definition", "proconfig", "qual", "with_check",
]);
export function validateFarmOsProductionIdentitySanitizedEvidenceCandidate(value: unknown): boolean {
  const visit = (candidate: unknown): boolean => {
    if (Array.isArray(candidate)) return candidate.every(visit);
    if (!record(candidate)) return typeof candidate !== "number" || Number.isFinite(candidate);
    return Object.entries(candidate).every(([key, nested]) => {
      const normalizedKey = key.toLowerCase();
      if (FORBIDDEN_FINAL_KEYS.has(normalizedKey) || normalizedKey.startsWith("raw_")) return false;
      if (normalizedKey.endsWith("_digest")) return typeof nested === "string" && DIGEST.test(nested);
      return visit(nested);
    });
  };
  if (!record(value) || !exact(value, ["schema_version", "sections"]) ||
    value.schema_version !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION ||
    !Array.isArray(value.sections) || value.sections.length !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_CANDIDATE_SECTIONS.length) return false;
  const reconstructed = new Map<FarmOsProductionIdentityQueryV2CandidateSection, JsonRecord[]>();
  for (let index = 0; index < value.sections.length; index += 1) {
    const section = value.sections[index];
    const expectedSection = FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_CANDIDATE_SECTIONS[index]!;
    if (!record(section) || !exact(section, ["section_id", "rows"]) || section.section_id !== expectedSection ||
      !Array.isArray(section.rows) || section.rows.length === 0 || !rowOrderValid(section.rows as JsonRecord[])) return false;
    if (expectedSection === "B_CLUSTER_IDENTITY_SOURCE" && section.rows.length !== 1) return false;
    for (const finalRow of section.rows) {
      if (!record(finalRow) || !exact(finalRow, ["row_key", "payload", "sanitization_class"]) || !bounded(finalRow.row_key) ||
        !record(finalRow.payload) || !["AGGREGATE_ONLY", "DIGEST_ONLY", "SAFE_STRUCTURAL"].includes(String(finalRow.sanitization_class))) return false;
      if (expectedSection === "B_CLUSTER_IDENTITY_SOURCE" && (!exact(finalRow.payload, ["collection_status", "cluster_system_identifier_digest"]) ||
        finalRow.payload.collection_status !== "complete" || typeof finalRow.payload.cluster_system_identifier_digest !== "string" ||
        !DIGEST.test(finalRow.payload.cluster_system_identifier_digest) || finalRow.row_key !== "cluster" || finalRow.sanitization_class !== "DIGEST_ONLY")) return false;
      if (expectedSection === "G_MIGRATION_CATALOG_INVENTORY" && finalRow.row_key !== "__collection_status__") {
        if (!exact(finalRow.payload, ["collection_status", "migration_id", "object_kind", "object_identity", "attributes", "sensitive_digests"]) ||
          !record(finalRow.payload.sensitive_digests)) return false;
        const kind = finalRow.payload.object_kind as FarmOsProductionIdentityQueryV2ObjectClass;
        if (!OBJECT_CLASS_SET.has(String(kind))) return false;
        const expectedDigestKeys = allowedRawKeys[kind].map((key) => `${key}_digest`).sort();
        if (!exact(finalRow.payload.sensitive_digests, expectedDigestKeys) ||
          (expectedDigestKeys.length > 0 ? finalRow.sanitization_class !== "DIGEST_ONLY" : finalRow.sanitization_class !== "SAFE_STRUCTURAL")) return false;
        const rawSensitiveTexts = Object.fromEntries(allowedRawKeys[kind].map((key) => [key, null]));
        const { sensitive_digests: _digests, ...rawPayload } = finalRow.payload;
        const rows = reconstructed.get(expectedSection) ?? [];
        rows.push({
          section_id: expectedSection,
          row_key: finalRow.row_key,
          payload: { ...rawPayload, raw_sensitive_texts: rawSensitiveTexts },
          sanitization_class: expectedDigestKeys.length > 0 ? "INTERNAL_RAW_NEVER_PERSIST" : "SAFE_STRUCTURAL",
        });
        reconstructed.set(expectedSection, rows);
      } else if (expectedSection !== "B_CLUSTER_IDENTITY_SOURCE") {
        const rows = reconstructed.get(expectedSection) ?? [];
        rows.push({ section_id: expectedSection, row_key: finalRow.row_key, payload: finalRow.payload, sanitization_class: finalRow.sanitization_class });
        reconstructed.set(expectedSection, rows);
      }
    }
  }
  const rows = (section: FarmOsProductionIdentityQueryV2CandidateSection): JsonRecord[] => reconstructed.get(section) ?? [];
  if (!validateA(rows("A_TRANSACTION_SERVER_GATE")) || !validateC(rows("C_SCHEMA_IDENTITY")) ||
    !validateD(rows("D_OPERATOR_AUTHORITY")) || !validateE(rows("E_INSTALLATION_FARM_BINDING_AVAILABILITY")) ||
    !validateF(rows("F_ACL_PRINCIPAL_INVENTORY")) || !validateG(rows("G_MIGRATION_CATALOG_INVENTORY")) ||
    !validateH1(rows("H1_MIGRATION_HISTORY_EXISTENCE"))) return false;
  const h1Payload = rows("H1_MIGRATION_HISTORY_EXISTENCE")[0]!.payload as JsonRecord;
  if (!validateH2(rows("H2_MIGRATION_HISTORY_ROWS_IF_PRESENT"), h1Payload.state as "absent" | "present") ||
    !validateI(rows("I_ACTIVITY_LOCK_AGGREGATES")) || !validateJ(rows("J_DATABASE_SIZE"))) return false;
  return visit(value);
}

export const FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SECTIONS =
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_CANDIDATE_SECTIONS;
export type FarmOsProductionIdentityQueryV2Section =
  FarmOsProductionIdentityQueryV2CandidateSection;
export type FarmOsProductionIdentityQueryV2ResultSet =
  FarmOsProductionIdentityCandidateResultSet;
export type FarmOsProductionIdentityQueryV2Row =
  FarmOsProductionIdentityCandidateRow;
export type FarmOsProductionIdentityQueryV2SanitizedResult =
  FarmOsProductionIdentitySanitizedCandidateEvidence;
export const validateFarmOsProductionIdentityQueryV2ResultSets =
  validateFarmOsProductionIdentityQueryV2CandidateResultSets;
export const sanitizeFarmOsProductionIdentityQueryV2ResultSets =
  transformFarmOsProductionIdentityQueryV2CandidateResultSets;
export const validateFarmOsProductionIdentityQueryV2SanitizedResult =
  validateFarmOsProductionIdentitySanitizedEvidenceCandidate;
