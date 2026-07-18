import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DECISION_BOUNDARY,
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DECISION_SCHEMA_VERSION,
  type ProposalReviewDecisionRepositoryCommand,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_decision_boundary";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const sqlPath = resolve(
  "scripts/sql/day128_daily_farm_brief_proposal_review_decision_contract.sql",
);
const sql = readFileSync(sqlPath, "utf8");
const normalized = sql.replace(/\s+/gu, " ").toLowerCase();
const executable = sql
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n")
  .replace(/\s+/gu, " ")
  .toLowerCase();

assert(sql.includes("-- STATIC CONTRACT ONLY"), "static marker missing");
assert(
  sql.includes("-- DO NOT APPLY WITHOUT EXPLICIT HUMAN APPROVAL"),
  "human approval marker missing",
);
assert(sql.includes("-- ISOLATED DATABASE ONLY"), "isolation marker missing");
assert(sql.includes("-- NO PRODUCTION TARGET"), "production denial marker missing");

assert(
  normalized.includes("create table if not exists audit.proposal_review_decision_events"),
  "Day24 audit table contract missing",
);
for (const column of [
  "id uuid primary key default gen_random_uuid()",
  "proposal_id uuid not null",
  "decision_type text not null",
  "decision_note text not null",
  "decided_by text not null",
  "decided_by_role text not null",
  "decision_source text not null",
  "event_metadata jsonb not null",
  "decided_at timestamptz not null",
  "created_at timestamptz not null",
]) {
  assert(normalized.includes(column), `audit column contract missing: ${column}`);
}
assert(normalized.includes("references ai.proposal_inbox(id)"), "foreign key missing");
assert(normalized.includes("on delete restrict"), "restrict delete policy missing");
assert(!normalized.includes("on delete cascade"), "cascade delete must be absent");
for (const decision of [
  "approve_review",
  "reject_review",
  "request_revision",
  "defer_review",
]) {
  assert(normalized.includes(`'${decision}'`), `decision constraint missing: ${decision}`);
}
assert(
  normalized.includes("decided_by_role = 'administrator'"),
  "administrator constraint missing",
);
assert(
  normalized.includes("decision_source <> 'daily_brief_proposal_review_decision'"),
  "Day128 decision source constraint missing",
);
assert(normalized.includes("gen_random_uuid()"), "UUID generation policy missing");
assert(
  normalized.includes("to_regprocedure('gen_random_uuid()')"),
  "UUID readiness dependency missing",
);

assert(
  normalized.includes("create role farmos_ai_proposal_review_local"),
  "review role contract missing",
);
for (const attribute of [
  "nologin",
  "nosuperuser",
  "nocreatedb",
  "nocreaterole",
  "noinherit",
  "nobypassrls",
]) {
  assert(normalized.includes(attribute), `safe role attribute missing: ${attribute}`);
}

const updateGrant = /grant update \(\s*status,\s*reviewed_by,\s*reviewed_at,\s*review_note,\s*updated_at\s*\)\s*on ai\.proposal_inbox\s*to farmos_ai_proposal_review_local;/u;
assert(updateGrant.test(normalized), "exact five-column UPDATE grant missing");
assert(
  !/grant update\s+on ai\.proposal_inbox/u.test(executable),
  "table-level Proposal UPDATE grant forbidden",
);
assert(
  !/grant insert(?:[^;]*)on ai\.proposal_inbox/u.test(executable),
  "Proposal INSERT grant forbidden",
);
assert(
  !/grant delete(?:[^;]*)on ai\.proposal_inbox/u.test(executable),
  "Proposal DELETE grant forbidden",
);
assert(
  !/grant truncate(?:[^;]*)on ai\.proposal_inbox/u.test(executable),
  "Proposal TRUNCATE grant forbidden",
);
for (const forbiddenColumn of [
  "applied_at",
  "applied_by",
  "payload_json",
  "source_refs_json",
]) {
  assert(
    !new RegExp(`grant update \\([^)]*${forbiddenColumn}`, "u").test(executable),
    `forbidden UPDATE grant found: ${forbiddenColumn}`,
  );
}

assert(
  /grant insert on audit\.proposal_review_decision_events\s+to farmos_ai_proposal_review_local;/u.test(
    normalized,
  ),
  "audit INSERT grant missing",
);
for (const privilege of ["update", "delete", "truncate"]) {
  assert(
    !new RegExp(
      `grant ${privilege}(?:[^;]*)on audit\\.proposal_review_decision_events`,
      "u",
    ).test(executable),
    `audit ${privilege.toUpperCase()} grant forbidden`,
  );
}
assert(!/grant[^;]*on schema app/u.test(executable), "app schema grant forbidden");
assert(!/grant connect/u.test(executable), "database CONNECT grant forbidden");

assert(
  normalized.includes("daily_brief_proposal_<24 lowercase hex>"),
  "safe reference contract missing",
);
assert(normalized.includes("limit 100"), "safe resolution limit missing");
assert(
  normalized.includes("order by created_at desc, id asc"),
  "deterministic safe reference scan missing",
);
assert(
  normalized.includes("no public-reference column or migration is introduced"),
  "no-public-column policy missing",
);

const updatePosition = executable.indexOf("update ai.proposal_inbox");
const insertPosition = executable.indexOf(
  "insert into audit.proposal_review_decision_events",
);
assert(updatePosition >= 0, "CAS UPDATE fragment missing");
assert(insertPosition > updatePosition, "audit INSERT must follow Proposal UPDATE");
for (const condition of [
  "where id = $1",
  "and status = 'pending'",
  "and status = $2",
  "and updated_at = $3",
  "and applied_at is null",
  "and applied_by is null",
  "and (payload_json->>'expires_at')::timestamptz > $4",
]) {
  assert(normalized.includes(condition), `CAS condition missing: ${condition}`);
}
for (const assignment of [
  "status = $5",
  "reviewed_by = $6",
  "reviewed_at = $4",
  "review_note = $7",
  "updated_at = $4",
]) {
  assert(normalized.includes(assignment), `UPDATE assignment missing: ${assignment}`);
}
assert(
  normalized.includes("requires exactly one update row"),
  "UPDATE row-count invariant missing",
);
assert(
  normalized.includes("audit insert (count exactly 1)"),
  "audit row-count invariant missing",
);
assert(normalized.includes("transaction rollback"), "rollback contract missing");
assert(normalized.includes("retry count is fixed at zero"), "retry-zero contract missing");

for (const state of [
  "ready",
  "schema_missing",
  "role_missing",
  "required_privilege_missing",
  "forbidden_privilege_present",
  "invalid_database_target",
  "unavailable",
]) {
  assert(normalized.includes(state), `readiness state missing: ${state}`);
}
for (const evidence of [
  "isolated_database_target=true",
  "local_socket=true",
  "runtime_role_superuser=false",
  "runtime_role_bypassrls=false",
  "proposal_select=true",
  "update_status=true",
  "update_reviewed_by=true",
  "update_reviewed_at=true",
  "update_review_note=true",
  "update_updated_at=true",
  "proposal_insert=false",
  "proposal_delete=false",
  "proposal_truncate=false",
  "proposal_table_update=false",
  "update_applied_at=false",
  "update_applied_by=false",
  "update_payload_json=false",
  "update_source_refs_json=false",
  "audit_insert=true",
  "audit_update=false",
  "audit_delete=false",
  "audit_truncate=false",
  "app_database_write=false",
  "retry_count=0",
]) {
  assert(normalized.includes(evidence), `readiness evidence missing: ${evidence}`);
}
assert(
  normalized.includes("currently audited isolated database is schema_missing"),
  "current blocker must remain schema_missing",
);

assert(!/^\s*begin\s*;/imu.test(executable), "executable BEGIN forbidden");
assert(!/^\s*commit\s*;/imu.test(executable), "executable COMMIT forbidden");
assert(!/^\s*rollback\s*;/imu.test(executable), "executable ROLLBACK forbidden");
assert(!/\\(?:connect|i|include|set)\b/iu.test(executable), "psql command forbidden");
assert(!/docker(?:\s+compose)?/iu.test(executable), "Docker command forbidden");
assert(!/farmos_core_(?!day114_test)/iu.test(executable), "target fallback forbidden");
assert(!/drop table audit\.proposal_review_decision_events/iu.test(executable), "shared audit DROP forbidden");
assert(!/delete\s+from/iu.test(executable), "audit DELETE command forbidden");
assert(!/truncate\s+table/iu.test(executable), "audit TRUNCATE command forbidden");

const phase2Source = readFileSync(
  resolve(
    "src/lib/hermes/hermes_daily_farm_brief_proposal_review_decision_boundary.ts",
  ),
  "utf8",
);
for (const field of [
  "expectedStatus",
  "expectedUpdatedAt",
  "nextStatus",
  "reviewNote",
  "reviewerPrincipalRef",
  "reviewedAt",
  "newUpdatedAt",
  "auditCandidate",
] satisfies Array<keyof ProposalReviewDecisionRepositoryCommand>) {
  assert(phase2Source.includes(`${field}:`), `Phase 2 command field missing: ${field}`);
}
for (const decision of ["approve_review", "reject_review", "request_revision"]) {
  assert(normalized.includes(`'${decision}'`), `audit mapping mismatch: ${decision}`);
}
for (const metadataField of [
  "schema_version",
  "boundary",
  "previous_status",
  "next_status",
  "expected_status",
  "expected_updated_at",
  "proposal_apply_performed",
  "app_database_write_performed",
  "retry_count",
]) {
  assert(phase2Source.includes(`${metadataField}:`), `metadata field missing: ${metadataField}`);
}
assert(
  phase2Source.includes(HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DECISION_SCHEMA_VERSION),
  "Phase 2 schema version mismatch",
);
assert(
  phase2Source.includes(HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DECISION_BOUNDARY),
  "Phase 2 boundary mismatch",
);

console.log(
  JSON.stringify({
    result: "pass",
    boundary: "day128_daily_farm_brief_proposal_review_decision_sql_contract",
    static_contract_only: true,
    day24_audit_compatible: true,
    defer_review_runtime_generated: false,
    dedicated_review_role: true,
    column_limited_update: true,
    proposal_insert_granted: false,
    audit_append_only: true,
    safe_reference_application_resolved: true,
    cas_expected_status_and_updated_at: true,
    atomic_update_before_audit: true,
    current_readiness: "schema_missing",
    database_connection_performed: false,
    database_write_performed: false,
    migration_performed: false,
    retry_count: 0,
  }),
);
