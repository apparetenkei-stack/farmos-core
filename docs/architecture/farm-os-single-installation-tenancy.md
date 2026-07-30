# FarmOS Single-Installation Operational Memory Tenancy

## Status and authority

```yaml
status: APPROVED_FOR_IMPLEMENTATION_PLANNING
authority: user-approved
scope: Day146 Process 3 production integration boundary
runtime_changed_by_this_decision: false
deployment_configuration_changed_by_this_decision: false
```

This Architecture Decision is the canonical tenancy and authorization
authority for the Day146 Process 3
[Projection-first Hermes Read-only Runtime Integration](../roadmap/day146-process-3-projection-first-hermes-integration.md).
It defines the current single-installation deployment boundary. It does not
authorize runtime wiring, database operations, migrations, Slack
configuration, launchd changes, environment changes, or deployment.

## Decision

One FarmOS Core installation owns exactly one farm scope and one dedicated
Operational Memory database.

```yaml
tenancy:
  mode: single_installation
  installations_per_core_runtime: 1
  farm_scopes_per_installation: 1
  operational_memory_databases_per_installation: 1
  mixed_installation_data_in_one_database: prohibited
  mixed_farm_data_in_one_database: prohibited
  cross_farm_query: prohibited
  request_selected_tenant: prohibited
```

The absence of a farm column in the Operational Memory tables is acceptable
only inside this deployment boundary. Ingestion must not mix records from
another installation or farm into the database.

## Server-owned installation binding

The runtime obtains installation identity, farm scope, and timezone from
server-owned deployment configuration. Client values cannot select or
override the tenant.

```yaml
installation_binding:
  installation_id:
    setting: FARMOS_INSTALLATION_ID
    authority: server_configuration
    client_override: prohibited
  farm_scope:
    setting: FARMOS_AUTHORIZED_FARM_SCOPE
    authority: server_configuration
    client_override: prohibited
  timezone:
    setting: FARMOS_BUSINESS_TIMEZONE
    authority: server_configuration
    required_value: Asia/Tokyo
```

These settings are not Secrets, but they remain server-side configuration.
This decision does not authorize setting them or changing launchd. A missing,
empty, invalid, duplicated, or inconsistent binding fails closed with:

```text
PROJECTION_FIRST_INSTALLATION_BINDING_UNAVAILABLE
```

No farm or installation identifier may be hard-coded in source.

The current Mac deployment's approved binding is defined by the canonical
[FarmOS Mac Installation Identity](../deployment/farmos-core-mac-installation-identity.md)
authority:

```yaml
current_deployment_binding:
  installation_id: apparetenkei-farmos-core-mac-01
  farm_scope: apparetenkei-primary-farm
  timezone: Asia/Tokyo
  canonical_authority:
    - docs/deployment/farmos-core-mac-installation-identity.md
```

This records deployment identity only. Applying the values to environment or
launchd configuration remains a separate gated operation.

## Authorization authority

Actor authorization and installation binding are separate checks:

```yaml
authorization:
  actor_authorization:
    purpose: authorize the subject and channel to use FarmOS Hermes
    authorities:
      - authenticated Web or API subject
      - existing Slack workspace, channel, and user allowlist
  installation_binding:
    purpose: identify the installation and farm scope owned by this Core
    authority:
      - server-owned deployment configuration
```

A Slack allowlist is not farm-scope authority. Authorization succeeds only
when:

```yaml
authorization_success:
  actor_authorized: true
  deployment_binding_available: true
  requested_farm_scope_equals_bound_scope: true
  requested_cross_installation_access: false
```

Any failure returns `guard_rejected` with `authorization_failed` and
`writes_performed: false`.

## Canonical authorization context

Adapters construct this server-side context after actor authorization:

```yaml
authorization_context:
  installation_id:
    source: deployment_binding
  bound_farm_scope:
    source: deployment_binding
  subject_id:
    source:
      - authenticated API session
      - authorized Slack user
  channel:
    enum:
      - web
      - slack
      - cli
  actor_authorized:
    type: boolean
  authorization_evidence_id:
    type: opaque_server_generated_reference
```

The request `farm_scope` is not authorization evidence. It is used only for an
exact equality check against `bound_farm_scope`.

## Hermes Web and Slack mapping

Existing integration points are:

```yaml
entrypoints:
  web_api:
    file: src/app/api/hermes/chat/route.ts
  slack:
    adapter: src/lib/slack/hermes_slack_socket_mode.ts
    production_wiring: scripts/slack/run_hermes_slack_socket_mode.ts
```

The Slack adapter may construct an authorization context only after the
existing workspace, channel, and user allowlists pass. It obtains
`installation_id` and `farm_scope` from the deployment binding; it must not
derive a farm identifier from Slack identifiers. Slack-specific types do not
enter the channel-neutral Projection-first service.

For Web or API requests, `subject_id` comes from the authenticated server-side
session. A client-supplied subject is not sufficient.

## Business-date and response-mode mapping

Initial Web and Slack adapters use server-owned defaults when their existing
input lacks canonical structured fields:

```yaml
adapter_defaults:
  business_date:
    value: current_calendar_date
    timezone: Asia/Tokyo
  response_mode:
    value: fast
```

Free text must not implicitly activate `deep`. Only a structured
`response_mode: deep` request returns `deep_analysis_unavailable` with
`mode_used: none`. If a past or arbitrary business date cannot be obtained
from structured input, the adapter returns `clarification_required` instead of
inferring a date from prose.

Projection missing, stale, or unavailable results never fall back to a legacy
raw-history path.

## Operational Memory database boundary

The Operational Memory PostgreSQL database is dedicated to the bound
installation:

```yaml
operational_memory_database:
  tenancy: single_installation
  installation_binding: external_server_owned
  data_scope: bound_farm_scope_only
  mixed_scope_ingestion: prohibited
```

This deployment contract does not authorize returning all database state as a
scoped bundle. Production Projection-first responses must not use
`readState()` as a full-history fallback.

## Exact-date scoped read port

The production read adapter uses SELECT-only access against the existing
schema:

```yaml
scoped_read_port:
  read_active_projection:
    filters:
      - exact business_date
      - active state
      - supported compiler version
  read_projection_lineage:
    filters:
      - selected projection_id
  read_latest_snapshots:
    filters:
      - exact business_date
      - lineage snapshot IDs
      - server hard limit 50
  read_snapshot_state:
    filters:
      - selected snapshot IDs
```

It guarantees:

```yaml
read_guarantees:
  installation_binding_verified_before_read: true
  exact_business_date_only: true
  full_history_scan: false
  unrelated_projection_read: false
  unrelated_snapshot_read: false
  mutation: false
  transaction: read_only
```

The existing schema can support this SELECT-only adapter, so Day146 performs
no migration.

## Failure boundary

The adapter fails closed for:

- unavailable installation binding;
- farm-scope mismatch;
- duplicate active Projection;
- unsupported compiler version;
- lineage mismatch or a lineage count above the hard limit;
- snapshot identity mismatch; or
- repository read failure.

The canonical result is `projection_unavailable` with
`writes_performed: false`. Falling back to raw `readState()` is prohibited.
Authorization runs before this read boundary: an initially missing binding or
request scope mismatch returns `guard_rejected` with `authorization_failed`.
`projection_unavailable` applies when the scoped read adapter detects that its
already-authorized binding precondition has become unavailable or inconsistent.

## Production wiring boundary

Safe wiring proceeds in this order:

1. server deployment-binding loader;
2. actor-authorization adapter;
3. canonical authorization context;
4. exact-date scoped Operational Memory read adapter;
5. `FarmOsProjectionFirstService`; and
6. thin Web or Slack adapter.

Defaults remain fail-closed:

```yaml
defaults:
  missing_binding: deny
  missing_actor_authorization: deny
  scoped_repository_unavailable: projection_unavailable
  legacy_fallback: prohibited
  business_write: false
```

## Day146 boundary

Day146 Process 3 may implement a non-secret deployment-binding parser, the
authorization context and port, a SELECT-only scoped Operational Memory
adapter, thin Web and Slack wiring, and fixture or local read-only tests.

It does not authorize:

- migration or a farm column;
- multi-tenant schema work;
- production database writes;
- Candidate queue, persistence, or promotion;
- active Projection mutation;
- farming-app writes;
- Proposal, Approval, or Apply;
- Slack allowlist changes;
- launchd changes; or
- Secret changes.

## Future multi-farm boundary

The following requirements move to a separate Architecture Decision and
Roadmap item rather than extending Day146:

- multiple farms in one Core runtime;
- multiple installations in one Operational Memory database;
- subject-specific farm assignments; or
- cross-farm analysis.

That future work requires:

```yaml
future_multi_tenancy:
  schema_partition_key: required
  migration: required
  RLS_or_equivalent: required
  membership_authority: required
  data_migration: required
  independent_security_gate: required
```

## Stop conditions

Stop production integration if the server-owned binding cannot be established,
actor authority is unavailable, the requested farm scope differs from the
binding, bounded SELECT-only reads cannot satisfy the contract, mixed-scope
data is detected, or safe integration would require a migration or production
write.
