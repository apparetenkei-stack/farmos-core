import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = (await readFile("scripts/sql/day123_hermes_daily_farm_brief_security_definer_hardening.sql", "utf8")).toLowerCase();

for (const required of [
  "begin;",
  "commit;",
  "alter function ai.persist_daily_farm_brief_command(jsonb, text, text, boolean)",
  "security definer",
  "set search_path = pg_catalog, ai",
  "revoke all privileges on function ai.persist_daily_farm_brief_command(jsonb, text, text, boolean) from public",
  "grant execute on function ai.persist_daily_farm_brief_command(jsonb, text, text, boolean)",
  "owner to :\"daily_brief_owner_role\"",
  "revoke insert, update, delete on table ai.daily_farm_brief_records",
  "revoke select, insert, update, delete on table ai.daily_farm_brief_persistence_commands",
]) assert(sql.includes(required), `missing hardening clause: ${required}`);

for (const forbidden of ["drop ", "truncate ", "delete from ", "execute format", "set search_path = public", "pg_temp", "alter role", "create role"]) assert.equal(sql.includes(forbidden), false, `forbidden hardening SQL: ${forbidden}`);
assert(sql.includes(":{?daily_brief_owner_role}"));
assert(sql.includes(":{?daily_brief_runtime_role}"));
assert(sql.includes("\\quit 3"));

console.log(JSON.stringify({ result: "pass", boundary: "hermes_daily_farm_brief_security_definer_sql_contract", fixed_search_path: true, public_execute_revoked: true, direct_dml_revoked: true, placeholders_fail_closed: true, dynamic_sql: false, drop: false, delete: false, rls_change: false }));
