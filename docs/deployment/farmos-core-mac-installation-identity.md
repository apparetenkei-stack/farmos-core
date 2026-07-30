# FarmOS Mac Installation Identity

## Status and authority

```yaml
status: APPROVED_FOR_DEPLOYMENT_CONFIGURATION
authority: user-approved
runtime_configuration_applied: false
launchd_restarted: false
live_slack_verified: false
```

This document is the canonical deployment authority for the logical identity
owned by the current FarmOS Core Mac. It specializes the
[FarmOS Single-Installation Operational Memory Tenancy](../architecture/farm-os-single-installation-tenancy.md)
decision without changing its single-installation security boundary.

## Formal installation identity

```yaml
installation_identity:
  installation_id: apparetenkei-farmos-core-mac-01
  host_role: FarmOS Core Mac
  tenancy: single_installation
```

`apparetenkei-farmos-core-mac-01` identifies the one FarmOS Core installation
running on the current Mac. It is server-owned and cannot be selected or
overridden by a client request.

## Farm scope binding

```yaml
farm_scope_binding:
  authorized_farm_scope: apparetenkei-primary-farm
  farms_per_installation: 1
  client_override: prohibited
  cross_farm_access: prohibited
```

`apparetenkei-primary-farm` is the single farm data scope owned by this
installation. Slack workspace, channel, and user identifiers are actor
authorization inputs only; they do not define or transform this scope.

## Business timezone

```yaml
business_timezone:
  value: Asia/Tokyo
  purpose: authoritative business_date calculation
  client_override: prohibited
```

## Deployment ownership

```yaml
deployment:
  host_role: FarmOS Core Mac
  tenancy: single_installation
  farms_per_installation: 1
  operational_memory_databases: 1
  mixed_installation_data: prohibited
  mixed_farm_scope_data: prohibited
```

The FarmOS Core Mac owns the binding and its dedicated Operational Memory
database boundary. The farming application remains the business source of
truth and does not receive ownership of these deployment identifiers.

## Non-secret classification

The installation ID, authorized farm scope, and business timezone are not
Secrets. They are nevertheless server-side deployment configuration:

```yaml
classification:
  secret: false
  client_mutable: false
  source_code_hardcode: prohibited
  request_authority: false
  server_configuration_required: true
```

They must not be logged together with credentials, tokens, actor identifiers,
query bodies, Projection bodies, or source bodies.

## Prohibited identity reuse

The deployment identifiers must not be reused as:

- a PostgreSQL primary key or PostgreSQL role;
- a Slack workspace, channel, or user ID;
- an authorization evidence ID;
- a Candidate or Proposal ID; or
- a farm business-record ID.

## Runtime configuration mapping

```yaml
runtime_configuration:
  FARMOS_INSTALLATION_ID:
    value: apparetenkei-farmos-core-mac-01
    source: server-owned deployment configuration
  FARMOS_AUTHORIZED_FARM_SCOPE:
    value: apparetenkei-primary-farm
    source: server-owned deployment configuration
  FARMOS_BUSINESS_TIMEZONE:
    value: Asia/Tokyo
    source: server-owned deployment configuration
```

This authority approves the values for a later Deployment Configuration Gate.
It does not itself modify an environment file, LaunchAgent, wrapper, Secret,
database, or running process.

## Rotation and change boundary

Changing any binding value requires:

1. a new user-approved deployment authority;
2. synchronized updates to the tenancy and Process 3 references;
3. a separate configuration backup and rollback plan;
4. fail-closed runtime validation; and
5. a new live read-only verification.

Values must not rotate implicitly, be inferred from hostnames or Slack IDs, or
be changed by client input. A binding change must not modify PostgreSQL roles,
business records, Candidate state, Proposal state, or active Projections.

## Multi-farm future boundary

Multiple farms per Core, multiple installations per Operational Memory
database, subject-specific farm assignment, and cross-farm queries are outside
Day146. They require a separate Architecture Decision, schema partitioning,
migration, membership authority, and independent security gate.

## Stop conditions

Stop deployment configuration if:

- a configured value differs from this canonical document;
- any binding value is missing, empty, duplicated, or client-controlled;
- the database contains another installation or farm scope;
- an identifier must be hard-coded into source;
- a deployment identifier must be reused for a prohibited purpose; or
- safe application requires a Secret, database, Slack allowlist, or business
  data change.
