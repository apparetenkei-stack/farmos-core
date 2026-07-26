begin transaction read only;
do $verify$
begin
  if to_regclass('core_schema.migration_history') is null
    or to_regclass('ai.proposal_execution_state') is null
    or to_regclass('ai.proposal_creation_idempotency') is null
    or to_regclass('audit.proposal_creation_events') is null
    or to_regclass('audit.proposal_execution_state_events') is null
    or has_table_privilege('public','ai.proposal_execution_state','SELECT')
    or has_table_privilege('public','ai.proposal_execution_state','INSERT')
    or has_table_privilege('public','ai.proposal_execution_state','UPDATE')
    or has_table_privilege('public','ai.proposal_execution_state','DELETE')
    or has_table_privilege('public','audit.proposal_creation_events','UPDATE')
    or has_table_privilege('public','audit.proposal_creation_events','DELETE')
    or exists(select 1 from ai.proposal_execution_state)
  then
    raise exception 'eligible_proposal_persistence_verification_failed';
  end if;
end
$verify$;
select
  to_regclass('core_schema.migration_history') is not null as migration_history,
  to_regclass('ai.proposal_execution_state') is not null as projection_table,
  to_regclass('ai.proposal_creation_idempotency') is not null as idempotency_table,
  to_regclass('audit.proposal_creation_events') is not null as proposal_audit,
  to_regclass('audit.proposal_execution_state_events') is not null as projection_audit,
  not has_table_privilege('public','ai.proposal_execution_state','SELECT')
    and not has_table_privilege('public','ai.proposal_execution_state','INSERT')
    and not has_table_privilege('public','ai.proposal_execution_state','UPDATE')
    and not has_table_privilege('public','ai.proposal_execution_state','DELETE')
    as public_projection_denied,
  not has_table_privilege('public','audit.proposal_creation_events','UPDATE')
    and not has_table_privilege('public','audit.proposal_creation_events','DELETE')
    as public_audit_mutation_denied,
  not exists(select 1 from ai.proposal_execution_state) as no_projection_backfill;
rollback;
