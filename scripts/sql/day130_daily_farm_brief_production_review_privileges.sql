-- STATIC MANUAL PRIVILEGE PLAN ONLY
-- MANUAL APPROVAL REQUIRED
-- PRODUCTION ONLY
-- EXACT ROLE VERIFICATION REQUIRED
-- NO MIGRATION OR AUTOMATIC EXECUTION
--
-- This plan must not be applied until the shared Day24-compatible
-- audit.proposal_review_decision_events contract exists in the verified
-- production target. The Day130 audit found that contract absent; this file
-- intentionally creates no schema, table, role, or database object.
-- The fixed Day130 provisioning module is the executable source of truth;
-- its contract test requires this reviewed plan to contain the same four
-- runtime grants. This file remains a manual review/rollback artifact.
--
-- Invoke only through an approved psql session with a separately verified
-- role name, for example:
--   psql ... --set=production_review_role='<verified role>' --file=...

\set ON_ERROR_STOP on

\if :{?production_review_role}
\else
  \echo 'required production review role placeholder is missing'
  \quit 3
\endif

select
  exists (
    select 1
    from pg_catalog.pg_roles
    where rolname = :'production_review_role'
      and not rolsuper
      and not rolbypassrls
      and not rolcreaterole
      and not rolcreatedb
      and not rolreplication
  )
  and :'production_review_role' ~ '^[a-z][a-z0-9_]{0,62}$'
  and not exists (
    select 1
    from pg_catalog.pg_auth_members
    where member = (
      select oid
      from pg_catalog.pg_roles
      where rolname = :'production_review_role'
    )
  ) as production_review_role_valid,
  to_regnamespace('ai') is not null
  and to_regclass('ai.proposal_inbox') is not null
  and to_regnamespace('audit') is not null
  and to_regclass('audit.proposal_review_decision_events') is not null
    as required_objects_valid,
  not has_table_privilege(
    :'production_review_role', 'ai.proposal_inbox', 'INSERT'
  )
  and not has_table_privilege(
    :'production_review_role', 'ai.proposal_inbox', 'DELETE'
  )
  and not has_table_privilege(
    :'production_review_role', 'ai.proposal_inbox', 'TRUNCATE'
  )
  and not has_table_privilege(
    :'production_review_role', 'ai.proposal_inbox', 'UPDATE'
  )
  and not exists (
    select 1
    from pg_catalog.pg_attribute
    where attrelid = to_regclass('ai.proposal_inbox')
      and attnum > 0
      and not attisdropped
      and attname not in (
        'status',
        'reviewed_by',
        'reviewed_at',
        'review_note',
        'updated_at'
      )
      and has_column_privilege(
        :'production_review_role',
        attrelid,
        attname,
        'UPDATE'
      )
  )
  and not has_table_privilege(
    :'production_review_role',
    'audit.proposal_review_decision_events',
    'UPDATE'
  )
  and not has_table_privilege(
    :'production_review_role',
    'audit.proposal_review_decision_events',
    'DELETE'
  )
  and not has_table_privilege(
    :'production_review_role',
    'audit.proposal_review_decision_events',
    'TRUNCATE'
  )
  and not exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname not in ('pg_catalog', 'information_schema')
      and n.nspname not like 'pg_toast%'
      and c.relkind in ('r', 'p')
      and c.oid not in (
        to_regclass('ai.proposal_inbox'),
        to_regclass('audit.proposal_review_decision_events')
      )
      and (
        has_table_privilege(
          :'production_review_role', c.oid, 'INSERT'
        )
        or has_table_privilege(
          :'production_review_role', c.oid, 'UPDATE'
        )
        or has_table_privilege(
          :'production_review_role', c.oid, 'DELETE'
        )
        or has_table_privilege(
          :'production_review_role', c.oid, 'TRUNCATE'
        )
        or exists (
          select 1
          from pg_catalog.pg_attribute a
          where a.attrelid = c.oid
            and a.attnum > 0
            and not a.attisdropped
            and has_column_privilege(
              :'production_review_role',
              c.oid,
              a.attname,
              'UPDATE'
            )
        )
      )
  )
  and not exists (
    select 1
    from pg_catalog.pg_namespace
    where nspname in ('ai', 'audit', 'app', 'public')
      and has_schema_privilege(
        :'production_review_role', oid, 'CREATE'
      )
  ) as forbidden_privileges_absent
\gset

\if :production_review_role_valid
\else
  \echo 'production review role is not eligible'
  \quit 3
\endif

\if :required_objects_valid
\else
  \echo 'required Proposal review objects are unavailable'
  \quit 3
\endif

\if :forbidden_privileges_absent
\else
  \echo 'forbidden effective privilege is present'
  \quit 3
\endif

begin;

-- ai schema USAGE was already present in the audited production state.
grant usage on schema audit to :"production_review_role";

grant select
on table ai.proposal_inbox
to :"production_review_role";

grant update (
  status,
  reviewed_by,
  reviewed_at,
  review_note,
  updated_at
)
on table ai.proposal_inbox
to :"production_review_role";

grant insert
on table audit.proposal_review_decision_events
to :"production_review_role";

commit;

-- The audit event ID uses gen_random_uuid(); no sequence privilege is needed.
-- Run the read-only production review readiness after any approved application.
-- Do not attempt a production review POST until readiness is `ready` and a
-- separate human approval authorizes exactly one Proposal review.
--
-- Human-approved rollback counterpart (do not run automatically):
-- begin;
-- revoke insert on table audit.proposal_review_decision_events
--   from :"production_review_role";
-- revoke update (status, reviewed_by, reviewed_at, review_note, updated_at)
--   on table ai.proposal_inbox from :"production_review_role";
-- revoke select on table ai.proposal_inbox from :"production_review_role";
-- revoke usage on schema audit from :"production_review_role";
-- commit;
--
-- Direct REVOKE does not remove privileges supplied by ownership, PUBLIC, or
-- inherited membership. Stop and repair those grants through a separately
-- approved role/ownership change; this plan never changes membership or owner.
