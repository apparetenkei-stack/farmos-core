import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ACL_ROLE_NAMES,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_FUNCTION_SCOPES,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_MIGRATIONS,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_OBJECT_CLASSES,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RELATION_SCOPES,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ROLE_SCOPES,
  type FarmOsProductionIdentityCandidateResultSet,
  type FarmOsProductionIdentityCandidateRow,
  type FarmOsProductionIdentityQueryV2CandidateSection,
} from "../../../src/lib/hermes/farm_os_production_identity_query_v2_contract";

const row = (
  section_id: FarmOsProductionIdentityQueryV2CandidateSection,
  row_key: string,
  payload: Record<string, unknown>,
  sanitization_class: FarmOsProductionIdentityCandidateRow["sanitization_class"],
): FarmOsProductionIdentityCandidateRow => ({
  section_id, row_key, payload, sanitization_class,
});

const resultSet = (
  section_id: FarmOsProductionIdentityQueryV2CandidateSection,
  rows: FarmOsProductionIdentityCandidateRow[],
): FarmOsProductionIdentityCandidateResultSet => ({ section_id, rows });

const sortRows = (rows: FarmOsProductionIdentityCandidateRow[]) =>
  rows.sort((left, right) =>
    Buffer.compare(Buffer.from(left.row_key), Buffer.from(right.row_key)));

const splitScope = (scope: string): [string, string] => {
  const separator = scope.indexOf(":");
  return [scope.slice(0, separator), scope.slice(separator + 1)];
};

export function buildFarmOsProductionIdentityPositiveExecutorTestFixture(
  major: 16 | 17,
  fixtureCase: "MIGRATION_HISTORY_ABSENT" | "MIGRATION_HISTORY_PRESENT",
): FarmOsProductionIdentityCandidateResultSet[] {
  const aclActual: FarmOsProductionIdentityCandidateRow[] = [
    row("F_ACL_PRINCIPAL_INVENTORY", "function_acl:ai.fn():public:EXECUTE:owner:false", {
      collection_status: "complete", row_kind: "function_acl", object_identity: "ai.fn()",
      principal: "public", privilege: "EXECUTE", grant_option: false, grantor: "owner",
      acl_default_class: "f", relation_kind: null, role_flags: null,
    }, "SAFE_STRUCTURAL"),
    row("F_ACL_PRINCIPAL_INVENTORY", "relation_acl:ai.seq:public:USAGE:owner:false", {
      collection_status: "complete", row_kind: "relation_acl", object_identity: "ai.seq",
      principal: "public", privilege: "USAGE", grant_option: false, grantor: "owner",
      acl_default_class: "s", relation_kind: "S", role_flags: null,
    }, "SAFE_STRUCTURAL"),
    row("F_ACL_PRINCIPAL_INVENTORY", "relation_acl:ai.table:owner:SELECT:owner:true", {
      collection_status: "complete", row_kind: "relation_acl", object_identity: "ai.table",
      principal: "owner", privilege: "SELECT", grant_option: true, grantor: "owner",
      acl_default_class: "r", relation_kind: "r", role_flags: null,
    }, "SAFE_STRUCTURAL"),
    row("F_ACL_PRINCIPAL_INVENTORY", "schema_acl:ai:public:USAGE:owner:false", {
      collection_status: "complete", row_kind: "schema_acl", object_identity: "ai",
      principal: "public", privilege: "USAGE", grant_option: false, grantor: "owner",
      acl_default_class: "n", relation_kind: null, role_flags: null,
    }, "SAFE_STRUCTURAL"),
    row("F_ACL_PRINCIPAL_INVENTORY",
      "role_membership:farmos_core_projection_reader<-farmos_identity_qualification:farmos_identity_qualification:farmos_core_projection_reader:owner:false", {
        collection_status: "complete", row_kind: "role_membership",
        object_identity: "farmos_core_projection_reader<-farmos_identity_qualification",
        principal: "farmos_identity_qualification", privilege: "farmos_core_projection_reader",
        grant_option: false, grantor: "owner", acl_default_class: null, relation_kind: null,
        role_flags: { inherit_option: true, set_option: true },
      }, "SAFE_STRUCTURAL"),
  ];
  for (const roleName of FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ACL_ROLE_NAMES) {
    aclActual.push(row("F_ACL_PRINCIPAL_INVENTORY",
      `role_flags:${roleName}:${roleName}:::`, {
        collection_status: "complete", row_kind: "role_flags", object_identity: roleName,
        principal: roleName, privilege: null, grant_option: null, grantor: null,
        acl_default_class: null, relation_kind: null,
        role_flags: {
          exists: true, rolsuper: false, rolcreatedb: false, rolcreaterole: false,
          rolinherit: true, rolreplication: false, rolbypassrls: false,
        },
      }, "SAFE_STRUCTURAL"));
  }
  sortRows(aclActual);
  const fRows = sortRows([
    row("F_ACL_PRINCIPAL_INVENTORY", "__collection_status__", {
      collection_status: "complete", inventory_complete: true,
      query_universe: "ai_audit_core_schema_all_acl_and_scoped_roles",
      row_count: aclActual.length,
    }, "SAFE_STRUCTURAL"),
    ...aclActual,
  ]);

  const gActual: FarmOsProductionIdentityCandidateRow[] = [];
  const tableState = new Map<string, Readonly<{
    exists: boolean;
    rls_enabled: boolean | null;
    policy_count: number;
  }>>([
    ["ai.proposal_inbox", { exists: true, rls_enabled: false, policy_count: 0 }],
    ["ai.proposal_creation_idempotency", { exists: true, rls_enabled: true, policy_count: 0 }],
    ["ai.proposal_execution_state", { exists: true, rls_enabled: true, policy_count: 5 }],
    ["core_schema.migration_history", {
      exists: fixtureCase === "MIGRATION_HISTORY_PRESENT",
      rls_enabled: fixtureCase === "MIGRATION_HISTORY_PRESENT" ? false : null,
      policy_count: 0,
    }],
  ]);
  for (const scope of FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RELATION_SCOPES) {
    const [migration_id, object_identity] = splitScope(scope);
    const state = tableState.get(object_identity) ?? {
      exists: false, rls_enabled: null, policy_count: 0,
    };
    gActual.push(row("G_MIGRATION_CATALOG_INVENTORY",
      `${migration_id}:table:${object_identity}`, {
        collection_status: "complete", migration_id, object_kind: "table", object_identity,
        attributes: state.exists
          ? { exists: true, relkind: "r", owner: "owner", rls_enabled: state.rls_enabled, rls_forced: false }
          : { exists: false, relkind: null, owner: null, rls_enabled: null, rls_forced: null },
        raw_sensitive_texts: {},
      }, "SAFE_STRUCTURAL"));
    gActual.push(row("G_MIGRATION_CATALOG_INVENTORY",
      `${migration_id}:rls_policy_inventory:${object_identity}`, {
        collection_status: "complete", migration_id,
        object_kind: "rls_policy_inventory", object_identity,
        attributes: {
          inventory_complete: true, policy_count: state.policy_count,
          rls_enabled: state.rls_enabled, rls_forced: state.exists ? false : null,
        },
        raw_sensitive_texts: {},
      }, "SAFE_STRUCTURAL"));
  }
  for (const scope of FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_FUNCTION_SCOPES) {
    const [migration_id, functionName] = splitScope(scope);
    const object_identity = `${functionName}()`;
    const exists = scope === FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_FUNCTION_SCOPES[0];
    gActual.push(row("G_MIGRATION_CATALOG_INVENTORY",
      `${migration_id}:function:${object_identity}`, {
        collection_status: "complete", migration_id, object_kind: "function", object_identity,
        attributes: exists
          ? { exists: true, owner: "owner", security_definer: false }
          : { exists: false, owner: null, security_definer: null },
        raw_sensitive_texts: {
          definition: exists ? "SYNTHETIC_SECRET_MARKER_FUNCTION_BODY" : null,
          proconfig: exists ? ["fixture.marker=SYNTHETIC_SECRET_MARKER_PROCONFIG"] : null,
        },
      }, "INTERNAL_RAW_NEVER_PERSIST"));
  }
  for (const scope of FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ROLE_SCOPES) {
    const [migration_id, object_identity] = splitScope(scope);
    gActual.push(row("G_MIGRATION_CATALOG_INVENTORY",
      `${migration_id}:role:${object_identity}`, {
        collection_status: "complete", migration_id, object_kind: "role", object_identity,
        attributes: {
          exists: true, rolsuper: false, rolcreatedb: false, rolcreaterole: false,
          rolinherit: true, rolreplication: false, rolbypassrls: false,
        },
        raw_sensitive_texts: {},
      }, "SAFE_STRUCTURAL"));
  }
  const proposalMigration = FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_MIGRATIONS[0];
  gActual.push(row("G_MIGRATION_CATALOG_INVENTORY",
    `${proposalMigration}:role_membership:farmos_identity_qualification->farmos_core_projection_reader`, {
      collection_status: "complete", migration_id: proposalMigration,
      object_kind: "role_membership",
      object_identity: "farmos_identity_qualification->farmos_core_projection_reader",
      attributes: { admin_option: false, inherit_option: true, set_option: true, grantor: "owner" },
      raw_sensitive_texts: {},
    }, "SAFE_STRUCTURAL"));
  const derived = [
    ["column", "marker", { data_type: "text", not_null: false },
      { default_expression: "SYNTHETIC_SECRET_MARKER_COLUMN_DEFAULT" }],
    ["constraint", "marker_check", { type: "c" },
      { definition: "SYNTHETIC_SECRET_MARKER_CONSTRAINT" }],
    ["index", "marker_index", { unique: false, valid: true },
      { definition: "SYNTHETIC_SECRET_MARKER_PARTIAL_INDEX" }],
    ["trigger", "marker_trigger", { enabled: "O", function_identity: "ai.enforce_proposal_creation_idempotency_transition()" },
      { definition: "SYNTHETIC_SECRET_MARKER_TRIGGER_WHEN" }],
  ] as const;
  for (const [kind, suffix, attributes, raw_sensitive_texts] of derived) {
    const object_identity = `ai.proposal_execution_state.${suffix}`;
    gActual.push(row("G_MIGRATION_CATALOG_INVENTORY",
      `${proposalMigration}:${kind}:${object_identity}`, {
        collection_status: "complete", migration_id: proposalMigration,
        object_kind: kind, object_identity, attributes: { ...attributes },
        raw_sensitive_texts: { ...raw_sensitive_texts },
      }, "INTERNAL_RAW_NEVER_PERSIST"));
  }
  const policies = [
    ["all_permissive", "ALL", true, ["public"],
      "SYNTHETIC_SECRET_MARKER_RLS_USING", "SYNTHETIC_SECRET_MARKER_RLS_WITH_CHECK"],
    ["select_restrictive", "SELECT", false, ["farmos_core_projection_reader"], "owner_name = current_user", null],
    ["insert_permissive", "INSERT", true, ["farmos_core_projection_writer"], null, "owner_name = current_user"],
    ["update_restrictive", "UPDATE", false, ["farmos_core_projection_writer"], "owner_name = current_user", "owner_name = current_user"],
    ["delete_permissive", "DELETE", true, ["farmos_core_proposal_reviewer"], "owner_name = current_user", null],
  ] as const;
  for (const [name, command, permissive, roles, qual, withCheck] of policies) {
    const object_identity = `ai.proposal_execution_state.${name}`;
    gActual.push(row("G_MIGRATION_CATALOG_INVENTORY",
      `${proposalMigration}:rls_policy:${object_identity}`, {
        collection_status: "complete", migration_id: proposalMigration,
        object_kind: "rls_policy", object_identity,
        attributes: { command, permissive, policy_name: name, roles: [...roles] },
        raw_sensitive_texts: { qual, with_check: withCheck },
      }, "INTERNAL_RAW_NEVER_PERSIST"));
  }
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
  const h2Rows = fixtureCase === "MIGRATION_HISTORY_PRESENT"
    ? FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_MIGRATIONS.map((migrationId, index) =>
      row("H2_MIGRATION_HISTORY_ROWS_IF_PRESENT", migrationId, {
        collection_status: "complete", migration_id: migrationId,
        sequence: 202607260001 + index,
        checksum: `sha256:${String(index + 1).repeat(64)}`,
      }, "SAFE_STRUCTURAL"))
    : [];
  h2Rows.push(row("H2_MIGRATION_HISTORY_ROWS_IF_PRESENT", "__collection_status__", {
    collection_status: "complete", inventory_complete: true, queried_target_count: 5,
    row_count: fixtureCase === "MIGRATION_HISTORY_PRESENT" ? 5 : 0,
    state: fixtureCase === "MIGRATION_HISTORY_PRESENT" ? "applicable" : "not_applicable",
  }, "SAFE_STRUCTURAL"));
  sortRows(h2Rows);
  return [
    resultSet("A_TRANSACTION_SERVER_GATE", [row("A_TRANSACTION_SERVER_GATE", "server", {
      collection_status: "complete", server_version_num: major * 10_000 + 7,
      database_logical_name: "farmos_identity_qualification",
      operator_role: "farmos_identity_qualification", transaction_read_only: "on", in_recovery: false,
    }, "SAFE_STRUCTURAL")]),
    resultSet("B_CLUSTER_IDENTITY_SOURCE", [row("B_CLUSTER_IDENTITY_SOURCE", "cluster", {
      collection_status: "complete", raw_cluster_identifier: "9876543210123456789",
    }, "INTERNAL_RAW_NEVER_PERSIST")]),
    resultSet("C_SCHEMA_IDENTITY", [
      row("C_SCHEMA_IDENTITY", "ai", {
        collection_status: "complete", schema_name: "ai", exists: true, owner_role: "postgres",
      }, "SAFE_STRUCTURAL"),
      row("C_SCHEMA_IDENTITY", "core_schema", {
        collection_status: "complete", schema_name: "core_schema", exists: true, owner_role: "postgres",
      }, "SAFE_STRUCTURAL"),
    ]),
    resultSet("D_OPERATOR_AUTHORITY", [row("D_OPERATOR_AUTHORITY", "farmos_identity_qualification", {
      collection_status: "complete", operator_role: "farmos_identity_qualification",
      rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolinherit: true,
      rolreplication: false, rolbypassrls: false, ai_schema_create: false,
      core_schema_create: false, memberships: [],
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
    resultSet("H1_MIGRATION_HISTORY_EXISTENCE", [row("H1_MIGRATION_HISTORY_EXISTENCE",
      "core_schema.migration_history", {
        collection_status: "complete", relation: "core_schema.migration_history",
        state: fixtureCase === "MIGRATION_HISTORY_PRESENT" ? "present" : "absent",
      }, "SAFE_STRUCTURAL")]),
    resultSet("H2_MIGRATION_HISTORY_ROWS_IF_PRESENT", h2Rows),
    resultSet("I_ACTIVITY_LOCK_AGGREGATES", [row("I_ACTIVITY_LOCK_AGGREGATES", "aggregates", {
      collection_status: "complete", activity_visibility_authorized: true,
      connection_count: 1, active_count: 1, idle_in_transaction_count: 0,
      long_transaction_count: 0, waiting_lock_count: 0,
    }, "AGGREGATE_ONLY")]),
    resultSet("J_DATABASE_SIZE", [row("J_DATABASE_SIZE", "database_bytes", {
      collection_status: "complete", database_bytes: 1024,
    }, "AGGREGATE_ONLY")]),
  ];
}
