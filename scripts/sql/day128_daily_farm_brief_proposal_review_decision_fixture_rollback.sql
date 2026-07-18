-- DAY128 ISOLATED FIXTURE ROLLBACK
-- EXPLICIT HUMAN ROLLBACK APPROVAL REQUIRED
-- DATABASE MUST EQUAL farmos_core_day114_test
-- LOCAL SOCKET ONLY
-- NO PRODUCTION TARGET
-- SHARED AUDIT EVENTS MUST NOT BE REMOVED

begin isolation level serializable read write;
set local timezone = 'UTC';
set local lock_timeout = '3s';
set local statement_timeout = '15s';

do $day128_rollback_guard$ begin
  if current_database() <> 'farmos_core_day114_test' then raise exception 'database_target_invalid'; end if;
  if inet_server_addr() is not null then raise exception 'isolation_not_verified'; end if;
  if exists(select 1 from pg_catalog.pg_stat_activity where usename='farmos_ai_proposal_review_local' and pid<>pg_backend_pid()) then raise exception 'runtime_role_active'; end if;
end $day128_rollback_guard$;

do $day128_rollback$ begin
  if exists(select 1 from pg_catalog.pg_roles where rolname='farmos_ai_proposal_review_local') then
    revoke all on schema ai from farmos_ai_proposal_review_local;
    if to_regclass('ai.proposal_inbox') is not null then revoke all on ai.proposal_inbox from farmos_ai_proposal_review_local; end if;
    if to_regnamespace('audit') is not null then revoke all on schema audit from farmos_ai_proposal_review_local; end if;
    if to_regclass('audit.proposal_review_decision_events') is not null then revoke all on audit.proposal_review_decision_events from farmos_ai_proposal_review_local; end if;
    drop role farmos_ai_proposal_review_local;
  end if;
end $day128_rollback$;

select jsonb_build_object(
  'fixture_state','rolled_back',
  'postcondition_verified',not exists(select 1 from pg_catalog.pg_roles where rolname='farmos_ai_proposal_review_local'),
  'audit_table_preserved',to_regclass('audit.proposal_review_decision_events') is not null
)::text;
commit;
