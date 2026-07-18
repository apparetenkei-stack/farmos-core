-- STATIC CONTRACT ONLY
-- DO NOT APPLY WITHOUT EXPLICIT HUMAN APPROVAL
-- ISOLATED DATABASE ONLY
-- NO PRODUCTION TARGET
--
-- This file is a reviewable database contract artifact. It is not a migration,
-- fixture, runner, or executable deployment script. It intentionally contains
-- no transaction wrapper and must never be passed directly to psql.

-- ---------------------------------------------------------------------------
-- Shared Day24-compatible append-only audit table contract
-- ---------------------------------------------------------------------------
-- Day128 reuses audit.proposal_review_decision_events. `defer_review` remains
-- in the shared constraint for Day24 compatibility, but the Day128 boundary
-- never generates it. Day128 requires a non-empty note for every decision.

create table if not exists audit.proposal_review_decision_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null
    references ai.proposal_inbox(id)
    on update cascade
    on delete restrict,
  decision_type text not null,
  decision_note text not null,
  decided_by text not null,
  decided_by_role text not null,
  decision_source text not null,
  event_metadata jsonb not null default '{}'::jsonb,
  decided_at timestamptz not null,
  created_at timestamptz not null,
  constraint proposal_review_decision_events_decision_type_check
    check (decision_type in (
      'approve_review',
      'reject_review',
      'request_revision',
      'defer_review'
    )),
  constraint proposal_review_decision_events_day128_source_check
    check (
      decision_source <> 'daily_brief_proposal_review_decision'
      or (
        decided_by_role = 'administrator'
        and decision_type in (
          'approve_review',
          'reject_review',
          'request_revision'
        )
        and length(btrim(decision_note)) > 0
      )
    )
);

create index if not exists idx_proposal_review_decision_events_proposal_id
  on audit.proposal_review_decision_events(proposal_id);

create index if not exists idx_proposal_review_decision_events_decided_at
  on audit.proposal_review_decision_events(decided_at desc);

-- gen_random_uuid() is the existing Day24 ID policy. Phase 4 readiness must
-- verify that pg_catalog.to_regprocedure('gen_random_uuid()') is present.
-- No sequence privilege is required by this contract.

-- ---------------------------------------------------------------------------
-- Dedicated least-privilege review role contract
-- ---------------------------------------------------------------------------
-- The save role is not reused because it retains Proposal INSERT permission.
-- This role is server-selected and is never accepted from a browser request.

create role farmos_ai_proposal_review_local
  nologin
  nosuperuser
  nocreatedb
  nocreaterole
  noinherit
  nobypassrls;

revoke all on schema ai from farmos_ai_proposal_review_local;
revoke all on schema audit from farmos_ai_proposal_review_local;
revoke all on ai.proposal_inbox from farmos_ai_proposal_review_local;
revoke all on audit.proposal_review_decision_events
  from farmos_ai_proposal_review_local;

grant usage on schema ai to farmos_ai_proposal_review_local;
grant select on ai.proposal_inbox to farmos_ai_proposal_review_local;
grant update (
  status,
  reviewed_by,
  reviewed_at,
  review_note,
  updated_at
)
on ai.proposal_inbox
to farmos_ai_proposal_review_local;

grant usage on schema audit to farmos_ai_proposal_review_local;
grant insert on audit.proposal_review_decision_events
to farmos_ai_proposal_review_local;

revoke insert, delete, truncate on ai.proposal_inbox
  from farmos_ai_proposal_review_local;
revoke update (applied_at, applied_by, payload_json, source_refs_json)
  on ai.proposal_inbox
  from farmos_ai_proposal_review_local;
revoke update, delete, truncate on audit.proposal_review_decision_events
  from farmos_ai_proposal_review_local;
revoke create on schema ai from farmos_ai_proposal_review_local;
revoke create on schema audit from farmos_ai_proposal_review_local;

-- No privileges on app or public schemas are granted by this contract.
-- No CONNECT privilege is granted by this contract. The isolated target and
-- local-socket identity are enforced before SET LOCAL ROLE in Phase 4.

-- ---------------------------------------------------------------------------
-- Safe-reference resolution contract (read phase, inside one transaction)
-- ---------------------------------------------------------------------------
-- Public input contains only daily_brief_proposal_<24 lowercase hex>.
-- The repository selects at most 100 strict Day126 candidate rows in the same
-- deterministic order as Day127, parses each row using the Day127 exact schema,
-- recomputes its safe reference in application code, and requires exactly one
-- match. Zero matches is not_found; multiple matches is contract_invalid.
--
-- Internal-only values used for resolution are never public response fields:
-- id, candidate_id, duplicate_signature, idempotency_key, decided_by,
-- payload_json, and source_refs_json.
-- No public-reference column or migration is introduced.

select
  id,
  proposal_type,
  title,
  body,
  payload_json,
  source_refs_json,
  model_name,
  agent_name,
  confidence,
  reason,
  risk_level,
  status,
  reviewed_by,
  reviewed_at,
  review_note,
  applied_at,
  applied_by,
  created_at,
  updated_at
from ai.proposal_inbox
where proposal_type = 'work_log_follow_up'
  and payload_json->>'schema_version' =
    'hermes.daily_farm_brief.proposal_inbox_record.v1'
  and payload_json->>'boundary' =
    'day126_daily_farm_brief_explicit_save'
  and source_refs_json->>'source' = 'daily_farm_brief_attention'
  and source_refs_json->>'boundary' =
    'day126_daily_farm_brief_explicit_save'
order by created_at desc, id asc
limit 100;

-- ---------------------------------------------------------------------------
-- Atomic CAS write fragments (one connection, one future transaction)
-- ---------------------------------------------------------------------------
-- Parameter contract:
-- $1 internal proposal UUID resolved above
-- $2 expected status (must be pending)
-- $3 expected updated_at
-- $4 server-owned instant
-- $5 next status (approved, rejected, or needs_revision)
-- $6 reviewer principal (internal only)
-- $7 normalized review note
--
-- ai.proposal_inbox has no expires_at column. The strict Day126 payload owns
-- expires_at, so the same verified field is checked again in the CAS predicate.
-- The repository must fail closed before this statement if the payload timestamp
-- is absent, non-canonical, or cannot be parsed.

update ai.proposal_inbox
set
  status = $5,
  reviewed_by = $6,
  reviewed_at = $4,
  review_note = $7,
  updated_at = $4
where id = $1
  and status = 'pending'
  and status = $2
  and updated_at = $3
  and applied_at is null
  and applied_by is null
  and (payload_json->>'expires_at')::timestamptz > $4
returning id, status, updated_at;

-- The repository requires exactly one UPDATE row before executing this append.
-- $8 internal audit decision type
-- $9 fixed administrator role
-- $10 fixed daily_brief_proposal_review_decision source
-- $11 exact Phase 2 metadata JSON

insert into audit.proposal_review_decision_events (
  proposal_id,
  decision_type,
  decision_note,
  decided_by,
  decided_by_role,
  decision_source,
  event_metadata,
  decided_at,
  created_at
)
values ($1, $8, $7, $6, $9, $10, $11, $4, $4)
returning id;

-- Future executor transaction order:
-- TRANSACTION START -> SET LOCAL timezone UTC -> SET LOCAL ROLE review role
-- -> resolve safe reference -> reject protected/non-pending/stale/expired/applied
-- -> CAS UPDATE (count exactly 1) -> audit INSERT (count exactly 1)
-- -> TRANSACTION COMMIT.
-- Every failure performs TRANSACTION ROLLBACK and connection release.
-- Retry count is fixed at zero and no alternate database target is attempted.

-- ---------------------------------------------------------------------------
-- Phase 4 readiness evidence contract
-- ---------------------------------------------------------------------------
-- ReviewDecisionReadinessState:
-- ready | schema_missing | role_missing | required_privilege_missing |
-- forbidden_privilege_present | invalid_database_target | unavailable
--
-- Required evidence (all server-owned):
-- isolated_database_target=true; local_socket=true; production=false;
-- runtime_role_exists=true; runtime_role_superuser=false;
-- runtime_role_bypassrls=false; ai_schema_usage=true;
-- proposal_select=true; update_status=true; update_reviewed_by=true;
-- update_reviewed_at=true; update_review_note=true; update_updated_at=true;
-- proposal_insert=false; proposal_delete=false; proposal_truncate=false;
-- proposal_table_update=false; update_applied_at=false;
-- update_applied_by=false; update_payload_json=false;
-- update_source_refs_json=false; audit_schema_usage=true;
-- audit_insert=true; audit_update=false; audit_delete=false;
-- audit_truncate=false; app_database_write=false; retry_count=0.
--
-- The currently audited isolated database is schema_missing and is not ready.

-- ---------------------------------------------------------------------------
-- Human-approved rollback contract (never automatic)
-- ---------------------------------------------------------------------------
-- 1. Stop callers and verify no transaction is using the review role.
-- 2. Revoke only this role's audit INSERT, proposal SELECT, five column UPDATE,
--    and ai/audit schema USAGE privileges.
-- 3. Drop only farmos_ai_proposal_review_local after dependency verification.
-- 4. Never drop audit.proposal_review_decision_events when it is the shared
--    Day24 table or contains events. Never delete or truncate audit events.
-- 5. Never drop the audit schema as part of Day128 rollback.
-- Rollback requires separate explicit human approval and a verified isolated
-- target. This static artifact contains no executable rollback statements.
