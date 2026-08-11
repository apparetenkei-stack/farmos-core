import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPEND_ONLY_RELATIONS,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_PATH,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_FUNCTIONS,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_SEQUENCE,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MUTABLE_CAS_RELATIONS,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_RELATIONS,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_ROLE,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_TRIGGERS,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_VERIFY_PATH,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_VERIFY_SHA256,
} from "../../src/lib/hermes/farm_os_production_target_execution_postgres_contract";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const digest = (value: string) =>
  `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;

const manifest = JSON.parse(read("db/provisioning/manifest.json")) as {
  manifest_version: string;
  startup_auto_apply: boolean;
  production_apply_authority: string;
  migrations: readonly Record<string, unknown>[];
};
const applySql = read(FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_PATH);
const verifySql = read(FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_VERIFY_PATH);
const entry = manifest.migrations.at(-1);

assert.equal(FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID,
  "202608110001_production_target_execution_durability");
assert.equal(FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_SEQUENCE, 202608110001);
assert.deepEqual(entry, {
  migration_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID,
  sequence: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_SEQUENCE,
  description: "Add source-only production target execution durability storage foundation",
  checksum: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256,
  apply_script: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_PATH,
  verification_script: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_VERIFY_PATH,
  created_at: "2026-08-11T00:00:00.000Z",
});
assert.equal(manifest.manifest_version, "farmos.core-db-provisioning-manifest.v1");
assert.equal(manifest.startup_auto_apply, false);
assert.equal(manifest.production_apply_authority, "authenticated_human_operator");
assert.equal(digest(applySql), FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256);
assert.equal(digest(verifySql), FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_VERIFY_SHA256);
assert.equal(new Set(manifest.migrations.map((migration) => migration.migration_id)).size,
  manifest.migrations.length);
assert.deepEqual(manifest.migrations.map((migration) => migration.sequence),
  [...manifest.migrations.map((migration) => migration.sequence)].sort((a, b) =>
    Number(a) - Number(b)));
assert.equal(existsSync(resolve(root,
  `db/migrations/${FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID}.rollback.sql`)),
false);

for (const relation of FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_RELATIONS) {
  assert.match(applySql, new RegExp(`create table ai\\.${relation} \\(`));
  assert.match(verifySql, new RegExp(`['\"]${relation}['\"]`));
}
for (const signature of FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_FUNCTIONS) {
  assert.ok(applySql.includes(`function ai.${signature.slice(0, signature.indexOf("("))}(`),
    signature);
}
for (const trigger of FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_TRIGGERS) {
  assert.ok(applySql.includes(`'${trigger.replace(/_(ao|truncate|cas|delete)$/, "")}'`) ||
    applySql.includes(`'${trigger}'`), trigger);
  assert.ok(verifySql.includes(`'${trigger}'`), trigger);
}
for (const relation of FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPEND_ONLY_RELATIONS) {
  assert.ok(applySql.includes(`'${relation}'`));
}
for (const relation of FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MUTABLE_CAS_RELATIONS) {
  assert.ok(applySql.includes(`'${relation}'`));
}

assert.ok(applySql.startsWith("-- FarmOS Core immutable forward-only migration artifact."));
assert.match(applySql, /begin;[\s\S]*commit;\s*$/);
assert.match(applySql, new RegExp(`create role ${FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_ROLE}`));
for (const posture of ["NOLOGIN", "NOSUPERUSER", "NOCREATEDB", "NOCREATEROLE",
  "NOINHERIT", "NOREPLICATION", "NOBYPASSRLS"])
  assert.ok(applySql.toUpperCase().includes(posture));
assert.match(applySql, /security definer/g);
assert.match(applySql, /set search_path = pg_catalog/g);
assert.match(applySql, /revoke all on function %s from public/);
assert.match(applySql, /pg_auth_members membership/);
assert.match(applySql, /membership\.roleid = runtime_role or membership\.member = runtime_role/);
assert.match(applySql, /revoke create on schema ai from farmos_core_production_target_execution_transaction/);
assert.match(applySql, /assert_production_target_execution_exact_record/);
assert.match(applySql, /assert_production_target_execution_receipt_binding/);
assert.match(applySql, /farmos\.production-target-phase-b-authority-bundle\.v1/);
assert.match(applySql, /g2cmd_/);
assert.match(applySql, /probecmd_/);
assert.match(applySql, /farmos\.production-target-identity-minimal-observation-query\.v1/);
assert.match(applySql, /array_agg\(class_row\.relname order by class_row\.relname\)/);
assert.match(applySql, /oidvectortypes\(procedure_row\.proargtypes\)/);
assert.match(applySql, /array_agg\(trigger_row\.tgname order by trigger_row\.tgname\)/);
assert.match(applySql, /expected_approval_digest' <> approval_row\.approval_digest/);
assert.match(applySql, /old\.state in \('RESERVATION_OUTCOME_UNKNOWN','CONSUMED_SUCCESS'/);
assert.match(applySql, /old\.binding_state in \('QUARANTINED','CONSUMED'\)/);
assert.match(applySql, /message = 'REVOCATION_CONFLICT'/);
assert.match(applySql, /message = 'CLOCK_REGRESSION'/);
assert.doesNotMatch(applySql, /^\s*drop\s/im);
assert.doesNotMatch(applySql, /^\s*truncate\s/im);
assert.doesNotMatch(applySql, /grant\s+all|grant\s+.*\s+to\s+(public|anon|authenticated)/i);
assert.doesNotMatch(applySql,
  /password\s*=|credential\s*=|secret\s*=|database_url|dblink|postgres_fdw|http_/i);
assert.doesNotMatch(applySql, /startup_auto_apply/i);
assert.match(verifySql, /^-- Day150[\s\S]*begin transaction read only;/);
assert.match(verifySql, /rollback;\s*$/);
assert.doesNotMatch(verifySql,
  /^\s*(insert|update|delete|truncate|create|alter|drop|grant|revoke)\b/im);
for (const required of [
  "expected_columns jsonb", "pg_catalog.format_type", "pg_auth_members membership",
  "pg_catalog.has_schema_privilege", "procedure_row.prosecdef",
  "procedure_row.proowner <> metadata_owner", "BEFORE DELETE", "BEFORE TRUNCATE",
  "public", "anon", "authenticated",
]) assert.ok(verifySql.includes(required), required);

const assertStaticMigrationAuthority = (apply: string, verify: string): void => {
  for (const relation of FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_RELATIONS) {
    assert.ok(apply.includes(`create table ai.${relation} (`));
    assert.ok(verify.includes(`"${relation}"`) || verify.includes(`'${relation}'`));
  }
  for (const required of ["before delete", "before truncate", "noinherit",
    "nobypassrls", "pg_auth_members", "set search_path = pg_catalog"]) {
    assert.ok(apply.toLowerCase().includes(required));
  }
  assert.ok(verify.includes("expected_columns jsonb"));
  assert.ok(verify.includes("pg_catalog.format_type"));
};
assertStaticMigrationAuthority(applySql, verifySql);
for (const broken of [
  applySql.replace("create table ai.production_target_execution_commands (", ""),
  applySql.replaceAll("before truncate on ai.%I", "before update on ai.%I"),
  applySql.replace("noinherit", "inherit"),
  applySql.replaceAll("set search_path = pg_catalog", "set search_path = public"),
]) assert.throws(() => assertStaticMigrationAuthority(broken, verifySql));
assert.throws(() => assertStaticMigrationAuthority(applySql,
  verifySql.replace("expected_columns jsonb", "missing_columns_contract")));

console.log("farm_os_day150_phase_c2a_migration_authority: PASS");
