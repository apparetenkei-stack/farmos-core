-- Candidate authority: farmos.production-target-identity-query.v3
-- Purpose: production_target_identity_collection
-- Exact-byte policy: UTF-8, no BOM, LF, trailing newline, entire-file SHA-256.
-- Execution plan: collector-owned REPEATABLE READ READ ONLY transaction; H2 runs only when H1 reports present.

-- section:A_TRANSACTION_SERVER_GATE
select
  'A_TRANSACTION_SERVER_GATE'::text as section_id,
  'server'::text as row_key,
  jsonb_build_object(
    'collection_status', 'complete',
    'server_version_num', current_setting('server_version_num')::integer,
    'database_logical_name', current_database()::text,
    'operator_role', current_user::text,
    'transaction_read_only', current_setting('transaction_read_only'),
    'in_recovery', pg_is_in_recovery()
  ) as payload,
  'SAFE_STRUCTURAL'::text as sanitization_class;

-- section:B_CLUSTER_IDENTITY_SOURCE
select
  'B_CLUSTER_IDENTITY_SOURCE'::text as section_id,
  'cluster'::text as row_key,
  jsonb_build_object(
    'collection_status', 'complete',
    'raw_cluster_identifier', control.system_identifier::text
  ) as payload,
  'INTERNAL_RAW_NEVER_PERSIST'::text as sanitization_class
from pg_catalog.pg_control_system() as control
order by row_key collate "C";

-- section:C_SCHEMA_IDENTITY
with expected(schema_name) as (
  values ('ai'::text), ('core_schema'::text)
)
select
  'C_SCHEMA_IDENTITY'::text as section_id,
  expected.schema_name as row_key,
  jsonb_build_object(
    'collection_status', 'complete',
    'schema_name', expected.schema_name,
    'exists', namespace.oid is not null,
    'owner_role', case when namespace.oid is null then null else pg_catalog.pg_get_userbyid(namespace.nspowner) end
  ) as payload,
  'SAFE_STRUCTURAL'::text as sanitization_class
from expected
left join pg_catalog.pg_namespace as namespace on namespace.nspname = expected.schema_name
order by row_key collate "C";

-- section:D_OPERATOR_AUTHORITY
with operator_role as (
  select role.oid, role.rolname, role.rolsuper, role.rolcreatedb, role.rolcreaterole,
    role.rolinherit, role.rolreplication, role.rolbypassrls
  from pg_catalog.pg_roles as role
  where role.rolname = current_user
), memberships as (
  select granted.rolname::text as granted_role,
    membership.admin_option,
    membership.inherit_option,
    membership.set_option
  from operator_role
  join pg_catalog.pg_auth_members as membership on membership.member = operator_role.oid
  join pg_catalog.pg_roles as granted on granted.oid = membership.roleid
)
select
  'D_OPERATOR_AUTHORITY'::text as section_id,
  operator_role.rolname::text as row_key,
  jsonb_build_object(
    'collection_status', 'complete',
    'operator_role', operator_role.rolname::text,
    'rolsuper', operator_role.rolsuper,
    'rolcreatedb', operator_role.rolcreatedb,
    'rolcreaterole', operator_role.rolcreaterole,
    'rolinherit', operator_role.rolinherit,
    'rolreplication', operator_role.rolreplication,
    'rolbypassrls', operator_role.rolbypassrls,
    'ai_schema_create', (
      select pg_catalog.has_schema_privilege(operator_role.oid, namespace.oid, 'CREATE')
      from pg_catalog.pg_namespace as namespace
      where namespace.nspname = 'ai'
    ),
    'core_schema_create', (
      select pg_catalog.has_schema_privilege(operator_role.oid, namespace.oid, 'CREATE')
      from pg_catalog.pg_namespace as namespace
      where namespace.nspname = 'core_schema'
    ),
    'memberships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'granted_role', memberships.granted_role,
        'admin_option', memberships.admin_option,
        'inherit_option', memberships.inherit_option,
        'set_option', memberships.set_option
      ) order by memberships.granted_role collate "C")
      from memberships
    ), '[]'::jsonb)
  ) as payload,
  'SAFE_STRUCTURAL'::text as sanitization_class
from operator_role
order by row_key collate "C";

-- section:E_INSTALLATION_FARM_BINDING_AVAILABILITY
with expected(binding_name) as (
  values ('farm_scope'::text), ('installation_id'::text)
), sources as (
  select attribute.attname::text as binding_name,
    namespace.nspname::text as schema_name,
    class.relname::text as relation_name,
    pg_catalog.format_type(attribute.atttypid, attribute.atttypmod) as data_type
  from pg_catalog.pg_attribute as attribute
  join pg_catalog.pg_class as class on class.oid = attribute.attrelid
  join pg_catalog.pg_namespace as namespace on namespace.oid = class.relnamespace
  where namespace.nspname in ('ai', 'core_schema')
    and attribute.attnum > 0
    and not attribute.attisdropped
    and attribute.attname in ('farm_scope', 'installation_id')
)
select
  'E_INSTALLATION_FARM_BINDING_AVAILABILITY'::text as section_id,
  expected.binding_name as row_key,
  jsonb_build_object(
    'collection_status', 'complete',
    'binding_name', expected.binding_name,
    'available', exists(select 1 from sources where sources.binding_name = expected.binding_name),
    'catalog_sources', coalesce((
      select jsonb_agg(jsonb_build_object(
        'schema_name', sources.schema_name,
        'relation_name', sources.relation_name,
        'data_type', sources.data_type
      ) order by sources.schema_name collate "C", sources.relation_name collate "C")
      from sources
      where sources.binding_name = expected.binding_name
    ), '[]'::jsonb)
  ) as payload,
  'SAFE_STRUCTURAL'::text as sanitization_class
from expected
order by row_key collate "C";

-- section:F_ACL_PRINCIPAL_INVENTORY
with target_schemas(schema_name) as (
  values ('ai'::text), ('audit'::text), ('core_schema'::text)
), target_roles(role_name) as (
  values
    ('farmos_core_projection_command_transaction'::text),
    ('farmos_core_projection_reader'::text),
    ('farmos_core_projection_writer'::text),
    ('farmos_core_proposal_audit_writer'::text),
    ('farmos_core_proposal_reviewer'::text),
    ('farmos_core_proposal_transaction'::text),
    ('farmos_core_proposal_writer'::text),
    ('farmos_core_stable_changes_runtime'::text)
), acl_rows as (
  select 'schema_acl'::text as row_kind,
    namespace.nspname::text as object_identity,
    case acl.grantee when 0 then 'public' else pg_catalog.pg_get_userbyid(acl.grantee) end as principal,
    acl.privilege_type::text as privilege,
    acl.is_grantable as grant_option,
    pg_catalog.pg_get_userbyid(acl.grantor) as grantor,
    'n'::text as acl_default_class,
    null::text as relation_kind
  from pg_catalog.pg_namespace as namespace
  join target_schemas on target_schemas.schema_name = namespace.nspname
  cross join lateral pg_catalog.aclexplode(coalesce(namespace.nspacl, pg_catalog.acldefault('n', namespace.nspowner))) as acl
  union all
  select 'relation_acl', namespace.nspname::text || '.' || class.relname::text,
    case acl.grantee when 0 then 'public' else pg_catalog.pg_get_userbyid(acl.grantee) end,
    acl.privilege_type::text, acl.is_grantable, pg_catalog.pg_get_userbyid(acl.grantor),
    case class.relkind when 'S' then 's' else 'r' end,
    class.relkind::text
  from pg_catalog.pg_class as class
  join pg_catalog.pg_namespace as namespace on namespace.oid = class.relnamespace
  join target_schemas on target_schemas.schema_name = namespace.nspname
  cross join lateral pg_catalog.aclexplode(coalesce(
    class.relacl,
    pg_catalog.acldefault((case class.relkind when 'S' then 's' else 'r' end)::"char", class.relowner)
  )) as acl
  where class.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
  union all
  select 'function_acl', namespace.nspname::text || '.' || procedure.proname::text || '(' ||
      pg_catalog.pg_get_function_identity_arguments(procedure.oid) || ')',
    case acl.grantee when 0 then 'public' else pg_catalog.pg_get_userbyid(acl.grantee) end,
    acl.privilege_type::text, acl.is_grantable, pg_catalog.pg_get_userbyid(acl.grantor),
    'f'::text,
    null::text
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  join target_schemas on target_schemas.schema_name = namespace.nspname
  cross join lateral pg_catalog.aclexplode(coalesce(procedure.proacl, pg_catalog.acldefault('f', procedure.proowner))) as acl
), role_rows as (
  select 'role_flags'::text as row_kind,
    target_roles.role_name as object_identity,
    target_roles.role_name as principal,
    null::text as privilege,
    null::boolean as grant_option,
    null::text as grantor,
    null::text as acl_default_class,
    null::text as relation_kind,
    jsonb_build_object(
      'exists', role.oid is not null,
      'rolsuper', role.rolsuper,
      'rolcreatedb', role.rolcreatedb,
      'rolcreaterole', role.rolcreaterole,
      'rolinherit', role.rolinherit,
      'rolreplication', role.rolreplication,
      'rolbypassrls', role.rolbypassrls
    ) as role_flags
  from target_roles
  left join pg_catalog.pg_roles as role on role.rolname = target_roles.role_name
), membership_rows as (
  select 'role_membership'::text as row_kind,
    granted.rolname::text || '<-' || member.rolname::text as object_identity,
    member.rolname::text as principal,
    granted.rolname::text as privilege,
    membership.admin_option as grant_option,
    pg_catalog.pg_get_userbyid(membership.grantor) as grantor,
    null::text as acl_default_class,
    null::text as relation_kind,
    jsonb_build_object('inherit_option', membership.inherit_option, 'set_option', membership.set_option) as role_flags
  from pg_catalog.pg_auth_members as membership
  join pg_catalog.pg_roles as granted on granted.oid = membership.roleid
  join pg_catalog.pg_roles as member on member.oid = membership.member
  where granted.rolname in (select role_name from target_roles)
     or member.rolname in (select role_name from target_roles)
), inventory as (
  select acl_rows.row_kind, acl_rows.object_identity, acl_rows.principal,
    acl_rows.privilege, acl_rows.grant_option, acl_rows.grantor, acl_rows.acl_default_class,
    acl_rows.relation_kind, null::jsonb as role_flags
  from acl_rows
  union all
  select * from role_rows
  union all
  select * from membership_rows
), output as (
  select '__collection_status__'::text as row_key,
    jsonb_build_object(
      'collection_status', 'complete',
      'inventory_complete', true,
      'query_universe', 'ai_audit_core_schema_all_acl_and_scoped_roles',
      'row_count', (select count(*) from inventory)
    ) as payload
  union all
  select inventory.row_kind || ':' || inventory.object_identity || ':' || coalesce(inventory.principal, '') || ':' ||
      coalesce(inventory.privilege, '') || ':' || coalesce(inventory.grantor, '') || ':' || coalesce(inventory.grant_option::text, ''),
    jsonb_build_object(
      'collection_status', 'complete',
      'row_kind', inventory.row_kind,
      'object_identity', inventory.object_identity,
      'principal', inventory.principal,
      'privilege', inventory.privilege,
      'grant_option', inventory.grant_option,
      'grantor', inventory.grantor,
      'acl_default_class', inventory.acl_default_class,
      'relation_kind', inventory.relation_kind,
      'role_flags', inventory.role_flags
    )
  from inventory
)
select
  'F_ACL_PRINCIPAL_INVENTORY'::text as section_id,
  output.row_key,
  output.payload,
  'SAFE_STRUCTURAL'::text as sanitization_class
from output
order by row_key collate "C";

-- section:G_MIGRATION_CATALOG_INVENTORY
with target_relations(migration_id, schema_name, object_name) as (
  values
    ('202607260001_eligible_proposal_persistence', 'ai', 'proposal_creation_idempotency'),
    ('202607260001_eligible_proposal_persistence', 'ai', 'proposal_execution_state'),
    ('202607260001_eligible_proposal_persistence', 'ai', 'proposal_inbox'),
    ('202607260001_eligible_proposal_persistence', 'audit', 'proposal_creation_events'),
    ('202607260001_eligible_proposal_persistence', 'audit', 'proposal_execution_state_events'),
    ('202607260001_eligible_proposal_persistence', 'core_schema', 'migration_history'),
    ('202607300001_daily_operational_projection_candidate_foundation', 'ai', 'operational_memory_projection_state_events'),
    ('202607310001_daily_operational_projection_candidate_activation', 'ai', 'operational_memory_daily_projections'),
    ('202607310001_daily_operational_projection_candidate_activation', 'ai', 'operational_memory_projection_state_events'),
    ('202608030001_daily_operational_projection_command_ledger', 'ai', 'operational_memory_daily_projections'),
    ('202608030001_daily_operational_projection_command_ledger', 'ai', 'operational_memory_projection_command_receipts'),
    ('202608030001_daily_operational_projection_command_ledger', 'ai', 'operational_memory_projection_lineage'),
    ('202608030001_daily_operational_projection_command_ledger', 'ai', 'operational_memory_projection_review_decisions'),
    ('202608030001_daily_operational_projection_command_ledger', 'ai', 'operational_memory_projection_state_events'),
    ('202608030001_daily_operational_projection_command_ledger', 'ai', 'operational_memory_snapshot_state_events'),
    ('202608030001_daily_operational_projection_command_ledger', 'ai', 'operational_memory_source_snapshots'),
    ('202608070001_stable_changes_consumer_persistence', 'ai', 'stable_changes_consumer_checkpoints'),
    ('202608070001_stable_changes_consumer_persistence', 'ai', 'stable_changes_consumer_scopes'),
    ('202608070001_stable_changes_consumer_persistence', 'ai', 'stable_changes_page_commit_receipts'),
    ('202608070001_stable_changes_consumer_persistence', 'ai', 'stable_changes_validated_ingress')
), target_functions(migration_id, schema_name, object_name) as (
  values
    ('202607260001_eligible_proposal_persistence', 'ai', 'enforce_proposal_creation_idempotency_transition'),
    ('202607260001_eligible_proposal_persistence', 'ai', 'enforce_proposal_execution_state_transition'),
    ('202607260001_eligible_proposal_persistence', 'ai', 'protect_projected_proposal_inbox_binding'),
    ('202607260001_eligible_proposal_persistence', 'audit', 'reject_proposal_audit_mutation'),
    ('202607310001_daily_operational_projection_candidate_activation', 'ai', 'enforce_operational_memory_projection_state_transition'),
    ('202607310001_daily_operational_projection_candidate_activation', 'ai', 'reject_operational_memory_immutable_mutation'),
    ('202607310001_daily_operational_projection_candidate_activation', 'ai', 'require_operational_memory_initial_candidate_event'),
    ('202608030001_daily_operational_projection_command_ledger', 'ai', 'enforce_operational_memory_projection_command_receipt_binding'),
    ('202608030001_daily_operational_projection_command_ledger', 'ai', 'enforce_operational_memory_projection_review_binding'),
    ('202608030001_daily_operational_projection_command_ledger', 'ai', 'enforce_operational_memory_projection_state_transition'),
    ('202608030001_daily_operational_projection_command_ledger', 'ai', 'persist_operational_memory_bundle'),
    ('202608030001_daily_operational_projection_command_ledger', 'ai', 'persist_operational_memory_projection_command'),
    ('202608030001_daily_operational_projection_command_ledger', 'ai', 'reject_operational_memory_projection_command_ledger_mutation'),
    ('202608030001_daily_operational_projection_command_ledger', 'ai', 'require_operational_memory_initial_candidate_event'),
    ('202608030001_daily_operational_projection_command_ledger', 'ai', 'require_operational_memory_projection_command_receipt'),
    ('202608070001_stable_changes_consumer_persistence', 'ai', 'commit_stable_changes_page'),
    ('202608070001_stable_changes_consumer_persistence', 'ai', 'initialize_stable_changes_consumer_scope'),
    ('202608070001_stable_changes_consumer_persistence', 'ai', 'load_stable_changes_checkpoint'),
    ('202608070001_stable_changes_consumer_persistence', 'ai', 'reject_stable_changes_immutable_mutation'),
    ('202608070001_stable_changes_consumer_persistence', 'ai', 'stable_changes_canonical_jsonb'),
    ('202608070001_stable_changes_consumer_persistence', 'ai', 'stable_changes_checkpoint_json')
), target_roles(migration_id, role_name) as (
  values
    ('202607260001_eligible_proposal_persistence', 'farmos_core_projection_reader'),
    ('202607260001_eligible_proposal_persistence', 'farmos_core_projection_writer'),
    ('202607260001_eligible_proposal_persistence', 'farmos_core_proposal_audit_writer'),
    ('202607260001_eligible_proposal_persistence', 'farmos_core_proposal_reviewer'),
    ('202607260001_eligible_proposal_persistence', 'farmos_core_proposal_transaction'),
    ('202607260001_eligible_proposal_persistence', 'farmos_core_proposal_writer'),
    ('202608030001_daily_operational_projection_command_ledger', 'farmos_core_projection_command_transaction'),
    ('202608070001_stable_changes_consumer_persistence', 'farmos_core_stable_changes_runtime')
), relation_objects as (
  select target_relations.migration_id,
    'table'::text as object_kind,
    target_relations.schema_name || '.' || target_relations.object_name as object_identity,
    jsonb_build_object(
      'exists', class.oid is not null,
      'relkind', class.relkind,
      'owner', case when class.oid is null then null else pg_catalog.pg_get_userbyid(class.relowner) end,
      'rls_enabled', class.relrowsecurity,
      'rls_forced', class.relforcerowsecurity
    ) as attributes,
    '{}'::jsonb as raw_sensitive_texts
  from target_relations
  left join pg_catalog.pg_namespace as namespace on namespace.nspname = target_relations.schema_name
  left join pg_catalog.pg_class as class on class.relnamespace = namespace.oid and class.relname = target_relations.object_name
), column_objects as (
  select target_relations.migration_id, 'column'::text,
    target_relations.schema_name || '.' || target_relations.object_name || '.' || attribute.attname::text,
    jsonb_build_object(
      'data_type', pg_catalog.format_type(attribute.atttypid, attribute.atttypmod),
      'not_null', attribute.attnotnull
    ),
    jsonb_build_object(
      'default_expression', pg_catalog.pg_get_expr(default_value.adbin, default_value.adrelid)
    )
  from target_relations
  join pg_catalog.pg_namespace as namespace on namespace.nspname = target_relations.schema_name
  join pg_catalog.pg_class as class on class.relnamespace = namespace.oid and class.relname = target_relations.object_name
  join pg_catalog.pg_attribute as attribute on attribute.attrelid = class.oid and attribute.attnum > 0 and not attribute.attisdropped
  left join pg_catalog.pg_attrdef as default_value on default_value.adrelid = class.oid and default_value.adnum = attribute.attnum
), constraint_objects as (
  select target_relations.migration_id, 'constraint'::text,
    target_relations.schema_name || '.' || target_relations.object_name || '.' || constraint_record.conname::text,
    jsonb_build_object('type', constraint_record.contype),
    jsonb_build_object('definition', pg_catalog.pg_get_constraintdef(constraint_record.oid, false))
  from target_relations
  join pg_catalog.pg_namespace as namespace on namespace.nspname = target_relations.schema_name
  join pg_catalog.pg_class as class on class.relnamespace = namespace.oid and class.relname = target_relations.object_name
  join pg_catalog.pg_constraint as constraint_record on constraint_record.conrelid = class.oid
), index_objects as (
  select target_relations.migration_id, 'index'::text,
    target_relations.schema_name || '.' || target_relations.object_name || '.' || index_class.relname::text,
    jsonb_build_object('unique', index_record.indisunique, 'valid', index_record.indisvalid),
    jsonb_build_object('definition', pg_catalog.pg_get_indexdef(index_record.indexrelid, 0, false))
  from target_relations
  join pg_catalog.pg_namespace as namespace on namespace.nspname = target_relations.schema_name
  join pg_catalog.pg_class as class on class.relnamespace = namespace.oid and class.relname = target_relations.object_name
  join pg_catalog.pg_index as index_record on index_record.indrelid = class.oid
  join pg_catalog.pg_class as index_class on index_class.oid = index_record.indexrelid
), function_objects as (
  select target_functions.migration_id, 'function'::text,
    target_functions.schema_name || '.' || target_functions.object_name || '(' ||
      coalesce(pg_catalog.pg_get_function_identity_arguments(procedure.oid), '') || ')',
    jsonb_build_object(
      'exists', procedure.oid is not null,
      'owner', case when procedure.oid is null then null else pg_catalog.pg_get_userbyid(procedure.proowner) end,
      'security_definer', procedure.prosecdef
    ),
    jsonb_build_object(
      'definition', case when procedure.oid is null then null else pg_catalog.pg_get_functiondef(procedure.oid) end,
      'proconfig', procedure.proconfig
    )
  from target_functions
  left join pg_catalog.pg_namespace as namespace on namespace.nspname = target_functions.schema_name
  left join pg_catalog.pg_proc as procedure on procedure.pronamespace = namespace.oid and procedure.proname = target_functions.object_name
), trigger_objects as (
  select target_relations.migration_id, 'trigger'::text,
    target_relations.schema_name || '.' || target_relations.object_name || '.' || trigger_record.tgname::text,
    jsonb_build_object(
      'enabled', trigger_record.tgenabled,
      'function_identity', function_namespace.nspname::text || '.' || trigger_function.proname::text || '(' ||
        pg_catalog.pg_get_function_identity_arguments(trigger_function.oid) || ')'
    ),
    jsonb_build_object('definition', pg_catalog.pg_get_triggerdef(trigger_record.oid, false))
  from target_relations
  join pg_catalog.pg_namespace as namespace on namespace.nspname = target_relations.schema_name
  join pg_catalog.pg_class as class on class.relnamespace = namespace.oid and class.relname = target_relations.object_name
  join pg_catalog.pg_trigger as trigger_record on trigger_record.tgrelid = class.oid and not trigger_record.tgisinternal
  join pg_catalog.pg_proc as trigger_function on trigger_function.oid = trigger_record.tgfoid
  join pg_catalog.pg_namespace as function_namespace on function_namespace.oid = trigger_function.pronamespace
), policy_inventory_objects as (
  select target_relations.migration_id, 'rls_policy_inventory'::text,
    target_relations.schema_name || '.' || target_relations.object_name,
    jsonb_build_object(
      'inventory_complete', true,
      'policy_count', case when class.oid is null then 0 else (select count(*) from pg_catalog.pg_policy as policy where policy.polrelid = class.oid) end,
      'rls_enabled', class.relrowsecurity,
      'rls_forced', class.relforcerowsecurity
    ),
    '{}'::jsonb
  from target_relations
  left join pg_catalog.pg_namespace as namespace on namespace.nspname = target_relations.schema_name
  left join pg_catalog.pg_class as class on class.relnamespace = namespace.oid and class.relname = target_relations.object_name
), policy_objects as (
  select target_relations.migration_id, 'rls_policy'::text,
    target_relations.schema_name || '.' || target_relations.object_name || '.' || policy.polname::text,
    jsonb_build_object(
      'command', case policy.polcmd when '*' then 'ALL' when 'r' then 'SELECT' when 'a' then 'INSERT' when 'w' then 'UPDATE' when 'd' then 'DELETE' end,
      'permissive', policy.polpermissive,
      'policy_name', policy.polname::text,
      'roles', coalesce((
        select jsonb_agg(
          case policy_role when 0 then 'public' else pg_catalog.pg_get_userbyid(policy_role) end
          order by case policy_role when 0 then 'public' else pg_catalog.pg_get_userbyid(policy_role) end collate "C"
        )
        from unnest(policy.polroles) as role_oid(policy_role)
      ), '[]'::jsonb)
    ),
    jsonb_build_object(
      'qual', pg_catalog.pg_get_expr(policy.polqual, policy.polrelid),
      'with_check', pg_catalog.pg_get_expr(policy.polwithcheck, policy.polrelid)
    )
  from target_relations
  join pg_catalog.pg_namespace as namespace on namespace.nspname = target_relations.schema_name
  join pg_catalog.pg_class as class on class.relnamespace = namespace.oid and class.relname = target_relations.object_name
  join pg_catalog.pg_policy as policy on policy.polrelid = class.oid
), role_objects as (
  select target_roles.migration_id, 'role'::text, target_roles.role_name,
    jsonb_build_object(
      'exists', role.oid is not null,
      'rolsuper', role.rolsuper,
      'rolcreatedb', role.rolcreatedb,
      'rolcreaterole', role.rolcreaterole,
      'rolinherit', role.rolinherit,
      'rolreplication', role.rolreplication,
      'rolbypassrls', role.rolbypassrls
    ),
    '{}'::jsonb
  from target_roles
  left join pg_catalog.pg_roles as role on role.rolname = target_roles.role_name
), membership_objects as (
  select scoped_migrations.migration_id, 'role_membership'::text,
    member.rolname::text || '->' || granted.rolname::text,
    jsonb_build_object(
      'admin_option', membership.admin_option,
      'inherit_option', membership.inherit_option,
      'set_option', membership.set_option,
      'grantor', pg_catalog.pg_get_userbyid(membership.grantor)
    ),
    '{}'::jsonb
  from pg_catalog.pg_auth_members as membership
  join pg_catalog.pg_roles as member on member.oid = membership.member
  join pg_catalog.pg_roles as granted on granted.oid = membership.roleid
  cross join lateral (
    select distinct target_roles.migration_id
    from target_roles
    where target_roles.role_name in (member.rolname, granted.rolname)
  ) as scoped_migrations
), objects as (
  select * from relation_objects
  union all select * from column_objects
  union all select * from constraint_objects
  union all select * from index_objects
  union all select * from function_objects
  union all select * from trigger_objects
  union all select * from policy_inventory_objects
  union all select * from policy_objects
  union all select * from role_objects
  union all select * from membership_objects
), output as (
  select '__collection_status__'::text as row_key,
    jsonb_build_object(
      'collection_status', 'complete',
      'inventory_complete', true,
      'migration_count', 5,
      'object_classes', jsonb_build_array(
        'column', 'constraint', 'function', 'index', 'rls_policy',
        'rls_policy_inventory', 'role', 'role_membership', 'table', 'trigger'
      ),
      'rls_policy_inventory_complete', true,
      'row_count', (select count(*) from objects)
    ) as payload,
    'SAFE_STRUCTURAL'::text as sanitization_class
  union all
  select objects.migration_id || ':' || objects.object_kind || ':' || objects.object_identity,
    jsonb_build_object(
      'collection_status', 'complete',
      'migration_id', objects.migration_id,
      'object_kind', objects.object_kind,
      'object_identity', objects.object_identity,
      'attributes', objects.attributes,
      'raw_sensitive_texts', objects.raw_sensitive_texts
    ),
    case when objects.raw_sensitive_texts = '{}'::jsonb then 'SAFE_STRUCTURAL' else 'INTERNAL_RAW_NEVER_PERSIST' end
  from objects
)
select
  'G_MIGRATION_CATALOG_INVENTORY'::text as section_id,
  output.row_key,
  output.payload,
  output.sanitization_class
from output
order by row_key collate "C";

-- section:H1_MIGRATION_HISTORY_EXISTENCE
select
  'H1_MIGRATION_HISTORY_EXISTENCE'::text as section_id,
  'core_schema.migration_history'::text as row_key,
  jsonb_build_object(
    'collection_status', 'complete',
    'relation', 'core_schema.migration_history',
    'state', case when pg_catalog.to_regclass('core_schema.migration_history') is null then 'absent' else 'present' end
  ) as payload,
  'SAFE_STRUCTURAL'::text as sanitization_class
order by row_key collate "C";

-- section:H2_MIGRATION_HISTORY_ROWS_IF_PRESENT
with target_migrations(migration_id) as (
  values
    ('202607260001_eligible_proposal_persistence'::text),
    ('202607300001_daily_operational_projection_candidate_foundation'::text),
    ('202607310001_daily_operational_projection_candidate_activation'::text),
    ('202608030001_daily_operational_projection_command_ledger'::text),
    ('202608070001_stable_changes_consumer_persistence'::text)
), history_rows as (
  select history.migration_id::text as migration_id,
    history.sequence,
    history.checksum::text as checksum
  from core_schema.migration_history as history
  join target_migrations on target_migrations.migration_id = history.migration_id
), output as (
  select '__collection_status__'::text as row_key,
    jsonb_build_object(
      'collection_status', 'complete',
      'inventory_complete', true,
      'queried_target_count', 5,
      'row_count', (select count(*) from history_rows),
      'state', 'applicable'
    ) as payload
  union all
  select history_rows.migration_id,
    jsonb_build_object(
      'collection_status', 'complete',
      'migration_id', history_rows.migration_id,
      'sequence', history_rows.sequence,
      'checksum', history_rows.checksum
    )
  from history_rows
)
select
  'H2_MIGRATION_HISTORY_ROWS_IF_PRESENT'::text as section_id,
  output.row_key,
  output.payload,
  'SAFE_STRUCTURAL'::text as sanitization_class
from output
order by row_key collate "C";

-- section:I_ACTIVITY_LOCK_AGGREGATES
with operator_authority as (
  select operator_role.*,
    operator_role.rolsuper
      or pg_catalog.pg_has_role(current_user, 'pg_monitor', 'MEMBER')
      or pg_catalog.pg_has_role(current_user, 'pg_read_all_stats', 'MEMBER') as activity_visibility_authorized
  from pg_catalog.pg_roles as operator_role
  where operator_role.rolname = current_user
)
select
  'I_ACTIVITY_LOCK_AGGREGATES'::text as section_id,
  'aggregates'::text as row_key,
  jsonb_build_object(
    'collection_status', case when operator_authority.activity_visibility_authorized then 'complete' else 'incomplete' end,
    'activity_visibility_authorized', operator_authority.activity_visibility_authorized,
    'connection_count', (select count(*) from pg_catalog.pg_stat_activity where datname = current_database()),
    'active_count', (select count(*) from pg_catalog.pg_stat_activity where datname = current_database() and state = 'active'),
    'idle_in_transaction_count', (select count(*) from pg_catalog.pg_stat_activity where datname = current_database() and state = 'idle in transaction'),
    'long_transaction_count', (select count(*) from pg_catalog.pg_stat_activity where datname = current_database() and xact_start < pg_catalog.clock_timestamp() - interval '5 minutes'),
    'waiting_lock_count', (
      select count(*)
      from pg_catalog.pg_locks as lock_record
      join pg_catalog.pg_stat_activity as activity on activity.pid = lock_record.pid
      where activity.datname = current_database() and not lock_record.granted
    )
  ) as payload,
  'AGGREGATE_ONLY'::text as sanitization_class
from operator_authority
order by row_key collate "C";

-- section:J_DATABASE_SIZE
select
  'J_DATABASE_SIZE'::text as section_id,
  'database_bytes'::text as row_key,
  jsonb_build_object(
    'collection_status', 'complete',
    'database_bytes', pg_catalog.pg_database_size(current_database())
  ) as payload,
  'AGGREGATE_ONLY'::text as sanitization_class
order by row_key collate "C";
