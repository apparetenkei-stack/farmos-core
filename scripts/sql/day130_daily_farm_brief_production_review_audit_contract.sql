-- STATIC MANUAL DDL PLAN ONLY
-- MANUAL APPROVAL REQUIRED
-- PRODUCTION ONLY
-- NO AUTOMATIC EXECUTION
-- NO ROLE OR PRIVILEGE MUTATION
-- POST-APPLY READINESS REQUIRED
--
-- This is a reviewable application plan, not a migration. It creates only the
-- shared Day24-compatible audit schema/table/index contract. It performs no
-- GRANT, REVOKE, role mutation, data mutation, or Proposal review.
--
-- The approved operator must SET ROLE to a separately verified NOLOGIN owner
-- before invoking this file and pass that same role as audit_owner_role. No
-- actual production role name is stored here.
-- The fixed Day130 provisioning module is the executable source of truth;
-- its contract test requires this reviewed plan to contain the same table and
-- index definitions. This file remains a manual review/rollback artifact.

\set ON_ERROR_STOP on

\if :{?audit_owner_role}
\else
  \echo 'required audit owner role placeholder is missing'
  \quit 3
\endif

select
  exists (
    select 1
    from pg_catalog.pg_roles
    where rolname = :'audit_owner_role'
      and not rolcanlogin
      and not rolsuper
      and not rolbypassrls
      and not rolcreaterole
      and not rolcreatedb
      and not rolreplication
  )
  and current_user = :'audit_owner_role'
  and :'audit_owner_role' ~ '^[a-z][a-z0-9_]{0,62}$'
    as audit_owner_valid,
  to_regclass('ai.proposal_inbox') is not null
  and to_regprocedure('gen_random_uuid()') is not null
  and exists (
    select 1
    from pg_catalog.pg_attribute
    where attrelid = to_regclass('ai.proposal_inbox')
      and attname = 'id'
      and atttypid = 'uuid'::regtype
      and attnotnull
      and not attisdropped
  ) as proposal_contract_valid,
  to_regnamespace('audit') is not null as audit_schema_present,
  to_regclass('audit.proposal_review_decision_events') is not null
    as audit_table_present,
  to_regclass('audit.idx_proposal_review_decision_events_proposal_id')
    is not null as proposal_index_present,
  to_regclass('audit.idx_proposal_review_decision_events_decision_type')
    is not null as decision_type_index_present,
  to_regclass('audit.idx_proposal_review_decision_events_decided_at')
    is not null as decided_at_index_present
\gset

\if :audit_owner_valid
\else
  \echo 'verified audit owner is not active or is unsafe'
  \quit 3
\endif

\if :proposal_contract_valid
\else
  \echo 'required Proposal or UUID contract is unavailable'
  \quit 3
\endif

begin;

\if :audit_schema_present
do $day130_existing_schema$ begin
  if not coalesce((
    select nspowner = (
      select oid
      from pg_catalog.pg_roles
      where rolname = current_user
    )
    from pg_catalog.pg_namespace
    where oid = to_regnamespace('audit')
  ), false) then
    raise exception 'audit_schema_owner_mismatch';
  end if;

  if exists (
    select 1
    from pg_catalog.aclexplode(coalesce(
      (select nspacl from pg_catalog.pg_namespace
       where oid = to_regnamespace('audit')),
      pg_catalog.acldefault(
        'n',
        (select nspowner from pg_catalog.pg_namespace
         where oid = to_regnamespace('audit'))
      )
    )) acl
    where acl.grantee = 0
      and acl.privilege_type in ('USAGE', 'CREATE')
  ) then
    raise exception 'audit_schema_public_privilege_present';
  end if;
end $day130_existing_schema$;
\else
create schema audit authorization :"audit_owner_role";
\endif

\if :audit_table_present
do $day130_existing_table$ begin
  if not coalesce((
    select relowner = (
      select oid
      from pg_catalog.pg_roles
      where rolname = current_user
    )
      and relkind = 'r'
      and not relrowsecurity
      and not relforcerowsecurity
    from pg_catalog.pg_class
    where oid = to_regclass('audit.proposal_review_decision_events')
  ), false) then
    raise exception 'audit_table_owner_or_rls_mismatch';
  end if;

  if not (
    select count(*) = 10
      and bool_and(case a.attname
        when 'id' then
          a.atttypid = 'uuid'::regtype
          and a.attnotnull
          and pg_catalog.pg_get_expr(d.adbin, d.adrelid) =
            'gen_random_uuid()'
        when 'proposal_id' then
          a.atttypid = 'uuid'::regtype
          and a.attnotnull
          and d.oid is null
        when 'decision_type' then
          a.atttypid = 'text'::regtype
          and a.attnotnull
          and d.oid is null
        when 'decision_note' then
          a.atttypid = 'text'::regtype
          and not a.attnotnull
          and d.oid is null
        when 'decided_by' then
          a.atttypid = 'text'::regtype
          and a.attnotnull
          and d.oid is null
        when 'decided_by_role' then
          a.atttypid = 'text'::regtype
          and a.attnotnull
          and d.oid is null
        when 'decision_source' then
          a.atttypid = 'text'::regtype
          and a.attnotnull
          and pg_catalog.pg_get_expr(d.adbin, d.adrelid) =
            '''local_cli''::text'
        when 'event_metadata' then
          a.atttypid = 'jsonb'::regtype
          and a.attnotnull
          and pg_catalog.pg_get_expr(d.adbin, d.adrelid) =
            '''{}''::jsonb'
        when 'decided_at' then
          a.atttypid = 'timestamptz'::regtype
          and a.attnotnull
          and pg_catalog.pg_get_expr(d.adbin, d.adrelid) = 'now()'
        when 'created_at' then
          a.atttypid = 'timestamptz'::regtype
          and a.attnotnull
          and pg_catalog.pg_get_expr(d.adbin, d.adrelid) = 'now()'
        else false
      end)
      and bool_and(a.attidentity = '' and a.attgenerated = '')
    from pg_catalog.pg_attribute a
    left join pg_catalog.pg_attrdef d
      on d.adrelid = a.attrelid and d.adnum = a.attnum
    where a.attrelid =
      to_regclass('audit.proposal_review_decision_events')
      and a.attnum > 0
      and not a.attisdropped
  ) then
    raise exception 'audit_table_column_contract_mismatch';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid =
      to_regclass('audit.proposal_review_decision_events')
      and contype = 'p'
      and conname = 'proposal_review_decision_events_pkey'
      and conkey = array[(
        select attnum
        from pg_catalog.pg_attribute
        where attrelid =
          to_regclass('audit.proposal_review_decision_events')
          and attname = 'id'
      )]::smallint[]
  ) then
    raise exception 'audit_primary_key_contract_mismatch';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid =
      to_regclass('audit.proposal_review_decision_events')
      and contype = 'f'
      and conname =
        'proposal_review_decision_events_proposal_id_fkey'
      and confrelid = to_regclass('ai.proposal_inbox')
      and confupdtype = 'c'
      and confdeltype = 'r'
      and conkey = array[(
        select attnum
        from pg_catalog.pg_attribute
        where attrelid =
          to_regclass('audit.proposal_review_decision_events')
          and attname = 'proposal_id'
      )]::smallint[]
      and confkey = array[(
        select attnum
        from pg_catalog.pg_attribute
        where attrelid = to_regclass('ai.proposal_inbox')
          and attname = 'id'
      )]::smallint[]
  ) then
    raise exception 'audit_foreign_key_contract_mismatch';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid =
      to_regclass('audit.proposal_review_decision_events')
      and contype = 'c'
      and conname =
        'proposal_review_decision_events_decision_type_check'
      and pg_catalog.pg_get_constraintdef(oid) like '%approve_review%'
      and pg_catalog.pg_get_constraintdef(oid) like '%reject_review%'
      and pg_catalog.pg_get_constraintdef(oid) like '%request_revision%'
      and pg_catalog.pg_get_constraintdef(oid) like '%defer_review%'
      and pg_catalog.regexp_replace(
        pg_catalog.pg_get_constraintdef(oid),
        '[[:space:]]+',
        '',
        'g'
      ) =
        'CHECK((decision_type=ANY(ARRAY[''approve_review''::text,' ||
        '''reject_review''::text,''request_revision''::text,' ||
        '''defer_review''::text])))'
  ) then
    raise exception 'audit_decision_check_contract_mismatch';
  end if;

  if (
    select count(*)
    from pg_catalog.pg_constraint
    where conrelid =
      to_regclass('audit.proposal_review_decision_events')
      and contype in ('p', 'f', 'c')
  ) <> 3 then
    raise exception 'audit_constraint_set_mismatch';
  end if;

  if exists (
    select 1
    from pg_catalog.aclexplode(coalesce(
      (select relacl from pg_catalog.pg_class
       where oid =
         to_regclass('audit.proposal_review_decision_events')),
      pg_catalog.acldefault(
        'r',
        (select relowner from pg_catalog.pg_class
         where oid =
           to_regclass('audit.proposal_review_decision_events'))
      )
    )) acl
    where acl.grantee = 0
      and acl.privilege_type in (
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE',
        'REFERENCES', 'TRIGGER'
      )
  ) then
    raise exception 'audit_table_public_privilege_present';
  end if;
end $day130_existing_table$;
\else
create table audit.proposal_review_decision_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null
    references ai.proposal_inbox(id)
    on update cascade
    on delete restrict,
  decision_type text not null,
  decision_note text,
  decided_by text not null,
  decided_by_role text not null,
  decision_source text not null default 'local_cli',
  event_metadata jsonb not null default '{}'::jsonb,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint proposal_review_decision_events_decision_type_check
    check (decision_type in (
      'approve_review',
      'reject_review',
      'request_revision',
      'defer_review'
    ))
);
\endif

\if :proposal_index_present
\else
create index idx_proposal_review_decision_events_proposal_id
  on audit.proposal_review_decision_events(proposal_id);
\endif

\if :decision_type_index_present
\else
create index idx_proposal_review_decision_events_decision_type
  on audit.proposal_review_decision_events(decision_type);
\endif

\if :decided_at_index_present
\else
create index idx_proposal_review_decision_events_decided_at
  on audit.proposal_review_decision_events(decided_at desc);
\endif

do $day130_postcondition$ begin
  if not coalesce((
    select
      pg_catalog.pg_get_indexdef(
        to_regclass(
          'audit.idx_proposal_review_decision_events_proposal_id'
        )
      ) like '%USING btree (proposal_id)'
      and pg_catalog.pg_get_indexdef(
        to_regclass(
          'audit.idx_proposal_review_decision_events_decision_type'
        )
      ) like '%USING btree (decision_type)'
      and pg_catalog.pg_get_indexdef(
        to_regclass(
          'audit.idx_proposal_review_decision_events_decided_at'
        )
      ) like '%USING btree (decided_at DESC)'
  ), false) then
    raise exception 'audit_index_contract_mismatch';
  end if;

  if not coalesce((
    select relowner = (
      select oid
      from pg_catalog.pg_roles
      where rolname = current_user
    )
      and not relrowsecurity
      and not relforcerowsecurity
    from pg_catalog.pg_class
    where oid = to_regclass('audit.proposal_review_decision_events')
  ), false) then
    raise exception 'audit_postcondition_invalid';
  end if;

  if exists (
    select 1
    from pg_catalog.aclexplode(coalesce(
      (select nspacl from pg_catalog.pg_namespace
       where oid = to_regnamespace('audit')),
      pg_catalog.acldefault(
        'n',
        (select nspowner from pg_catalog.pg_namespace
         where oid = to_regnamespace('audit'))
      )
    )) acl
    where acl.grantee = 0
      and acl.privilege_type in ('USAGE', 'CREATE')
  ) or exists (
    select 1
    from pg_catalog.aclexplode(coalesce(
      (select relacl from pg_catalog.pg_class
       where oid =
         to_regclass('audit.proposal_review_decision_events')),
      pg_catalog.acldefault(
        'r',
        (select relowner from pg_catalog.pg_class
         where oid =
           to_regclass('audit.proposal_review_decision_events'))
      )
    )) acl
    where acl.grantee = 0
      and acl.privilege_type in (
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE',
        'REFERENCES', 'TRIGGER'
      )
  ) then
    raise exception 'audit_public_privilege_postcondition_invalid';
  end if;
end $day130_postcondition$;

commit;

-- The shared Day24 latest-decision view is not required by the Day128/Day130
-- atomic repository and is intentionally outside this minimal production plan.
-- The Day128 boundary supplies non-empty notes, administrator role/source,
-- previous_status, next_status, expected_status, expected_updated_at, and the
-- write/retry safety flags. Status values remain inside event_metadata rather
-- than becoming additional shared-table columns.
--
-- This plan does not enable or alter RLS because the existing Day24-compatible
-- contract uses owner separation and append-only ACLs. Runtime INSERT-only
-- access is applied later by the separately approved privilege plan.
--
-- On mismatch, ON_ERROR_STOP plus the raised exception aborts and rolls back
-- the transaction. Never repair an existing object automatically. Perform a
-- manual catalog inspection and issue a new human approval instead.
