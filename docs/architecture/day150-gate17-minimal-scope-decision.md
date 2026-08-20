# Day150 Gate17 minimal scope decision and worktree classification

Status: `PRODUCT_OWNER_ADOPTED / DAY150_ONLY / NO_EXECUTION_AUTHORIZATION`.

The canonical executable form of this decision is
`src/lib/hermes/farm_os_day150_gate17_scope_authority.ts`. It preserves the existing
Day150 Closure Authority Lock and its 22 gates. It establishes the minimal Gate17 scope,
classifies hostile same-UID and host Trust Root hardening as
`FUTURE_UNASSIGNED_DEFENSE_IN_DEPTH`, and grants no V7 execution, installation, Docker mutation,
PostgreSQL mutation, migration, production, canonical, B2, or formal Gate 2 authority.

## Current candidate classification

The following classification covers the complete working-tree candidate observed when this
decision was recorded. Classification does not delete, approve, stage, or execute a file.

### KEEP_DAY150_CLOSURE_REQUIRED

- `docs/architecture/day150-gate17-minimal-scope-decision.md`
- `docs/architecture/day150-prefix-expected-catalog-reference-derivation.md`
- `package.json`
- `scripts/hermes/lib/farm_os_day150_docker_absence_classifier.ts`
- `scripts/hermes/lib/farm_os_day150_prefix_reference_executor_contract.ts`
- `scripts/hermes/lib/farm_os_day150_prefix_reference_real_adapter.ts`
- `scripts/hermes/run_farm_os_day150_prefix_reference_catalog.ts`
- `scripts/hermes/run_farm_os_day150_prefix_reference_catalog_bootstrap.mjs`
- `scripts/hermes/run_farm_os_day150_prefix_reference_cross_process_qualification.ts`
- `scripts/hermes/run_farm_os_day150_prefix_reference_verified_runtime_qualification.ts`
- `scripts/hermes/test_farm_os_day150_closure_blockers.ts`
- `scripts/hermes/test_farm_os_day150_gate17_scope_authority.ts`
- `scripts/hermes/test_farm_os_day150_phase_a_minimal_observation_and_evidence.ts`
- `scripts/hermes/test_farm_os_day150_phase_b_ownership_boundary.ts`
- `scripts/hermes/test_farm_os_day150_prefix_authority_continuity.ts`
- `scripts/hermes/test_farm_os_day150_prefix_execution_descriptor.ts`
- `scripts/hermes/test_farm_os_day150_prefix_expected_catalog_derivation.ts`
- `scripts/hermes/test_farm_os_day150_prefix_final_source_approval_closure.ts`
- `scripts/hermes/test_farm_os_day150_prefix_initial_catalog_authority.ts`
- `scripts/hermes/test_farm_os_day150_prefix_reference_cross_process.ts`
- `scripts/hermes/test_farm_os_day150_prefix_reference_effect_hangs.ts`
- `scripts/hermes/test_farm_os_day150_prefix_reference_executor.ts`
- `scripts/hermes/test_farm_os_day150_prefix_reference_postgres_readiness.ts`
- `scripts/hermes/test_farm_os_day150_prefix_terminal_outcome_receipt.ts`
- `scripts/hermes/test_farm_os_production_identity_query_authority_v5_candidate.ts`
- `src/lib/hermes/farm_os_day150_gate17_scope_authority.ts`
- `src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation.ts`
- `src/lib/hermes/farm_os_day150_prefix_initial_catalog_authority.ts`
- `src/lib/hermes/farm_os_day150_prefix_reference_durable_store.ts`
- `src/lib/hermes/farm_os_day150_prefix_reference_migration_privilege_authority.ts`
- `src/lib/hermes/farm_os_day150_prefix_reference_primitive_port.ts`
- `src/lib/hermes/farm_os_day150_prefix_reference_source_closure_authority.ts`
- `src/lib/hermes/farm_os_day150_prefix_terminal_outcome_receipt.ts`
- `src/lib/hermes/farm_os_operational_memory_contract.ts`
- `src/lib/hermes/farm_os_operational_memory_postgres_repository.ts`
- `src/lib/hermes/farm_os_production_identity_consumer_entrypoint.ts`
- `src/lib/hermes/farm_os_production_identity_query_v2_contract.ts`
- `src/lib/hermes/farm_os_production_identity_query_v5_adoption.ts`
- `src/lib/hermes/farm_os_production_identity_query_v5_authority.ts`
- `src/lib/hermes/farm_os_production_identity_runtime_evidence_v2.ts`
- `src/lib/hermes/farm_os_production_prefix_fingerprint_matrix_authority.ts`
- `src/lib/hermes/farm_os_production_target_collector_authority.ts`
- `src/lib/hermes/farm_os_production_target_connection_authority.ts`
- `src/lib/hermes/farm_os_production_target_identity_formal_evidence.ts`
- `src/lib/hermes/farm_os_projection_first_contract.ts`
- `src/lib/hermes/farm_os_stable_changes_migration_reconciliation.ts`
- `artifacts/day150/prefix-expected-catalog/reference-runs/v1/reference-execution-approval-registry.json`
- `artifacts/day150/prefix-expected-catalog/reference-runs/v1/v5/reference-catalog-run-receipt-candidate.json.authorization-attempt-claim`
- `artifacts/day150/prefix-expected-catalog/reference-runs/v1/v5/reference-catalog-run-receipt-candidate.json.authorization-consumed`
- `artifacts/day150/prefix-expected-catalog/reference-runs/v1/v6/reference-catalog-run-receipt-candidate.json.authorization-attempt-claim`
- `artifacts/day150/prefix-expected-catalog/reference-runs/v1/v6/reference-catalog-run-receipt-candidate.json.authorization-consumed`
- `artifacts/day150/prefix-expected-catalog/reference-runs/v1/v6/reference-catalog-terminal-outcome-receipt.json`

### KEEP_FORWARD_COMPATIBLE_NON_GATE

- `docs/architecture/day150-phase-c2b-isolated-postgres-durability-qualification.md`
- `docs/architecture/day150-prefix-reference-fixed-official-node-runtime-v1.md`
- `native/day150-c2b-bootstrap/Sources/FarmOSDay150C2BCeremonyClient/main.swift`
- `native/day150-c2b-bootstrap/Sources/FarmOSDay150C2BNativeCore/Broker.swift`
- `native/day150-c2b-bootstrap/Sources/FarmOSDay150C2BNativeCore/DisposableStorage.swift`
- `native/day150-c2b-bootstrap/Sources/FarmOSDay150C2BNativeCore/InstalledIdentity.swift`
- `native/day150-c2b-bootstrap/Sources/FarmOSDay150C2BNativeCore/IntegratedRehearsal.swift`
- `native/day150-c2b-bootstrap/Sources/FarmOSDay150C2BNativeCore/WriterPrivilegeRuntime.swift`
- `native/day150-c2b-bootstrap/Sources/FarmOSDay150C2BValidatorBroker/main.swift`
- `native/day150-c2b-bootstrap/Sources/FarmOSDay150C2BWriterWorker/main.swift`
- `native/day150-c2b-bootstrap/Tests/FarmOSDay150C2BNativeCoreTests/NativeQualificationTests.swift`
- `scripts/hermes/lib/farm_os_day150_durable_authority_bridge.ts`
- `scripts/hermes/lib/farm_os_day150_installer_adoption_executor.ts`
- `scripts/hermes/lib/farm_os_day150_phase_c2b_bootstrap_manifest_contract.ts`
- `scripts/hermes/lib/farm_os_production_target_execution_postgres_qualification_docker_adapter.ts`
- `scripts/hermes/test_farm_os_day150_durable_authority_bridge.ts`
- `scripts/hermes/test_farm_os_day150_installer_adoption_executor.ts`
- `scripts/hermes/test_farm_os_day150_phase_c2b_bootstrap_actor_clock_source.ts`
- `scripts/hermes/test_farm_os_day150_phase_c2b_bootstrap_ledger.ts`
- `scripts/hermes/test_farm_os_day150_phase_c2b_bootstrap_manifest_contract.ts`
- `scripts/hermes/test_farm_os_day150_phase_c2b_qualification_source.ts`
- `scripts/hermes/test_farm_os_day150_prefix_reference_fixed_runtime_authority.ts`
- `src/lib/hermes/farm_os_day150_prefix_reference_fixed_runtime_authority.ts`

These files are source material only. They are excluded from the active execution-revision
executable closure and
are not required by the minimal Gate17 validation surface. Historical or optional package scripts
may still exercise them without making them closure prerequisites. In particular, canonical installation,
canonical Gen0, B2 bridge activation, OS-principal creation, and fixed-runtime adoption are not
Day150 Gate17 prerequisites.

The following paragraph records the classification at the historical V10 scope-decision point; it
does not describe the current active execution revision. At that point V7 was retired historical
and non-runnable, V8 was exhausted and non-runnable, V9 was consumed terminal historical evidence,
and V10 was the sole `PROPOSED_NOT_AUTHORIZED` revision. V9 claim, marker, and terminal receipt retain
the exact approved authorization, plan, source, run, attempt, and durable-path identity. Historical
V7 and V8 artifacts retain their original revision-specific identities. Later V11/V12 history and
the active V13 internal qualification descriptor are governed by the current reference-derivation
authority; this historical scope decision grants none of them approval or invocation authority.

### SUPERSEDED_BY_SCOPE_DECISION

- `artifacts/day150/prefix-expected-catalog/sealed-runtime/v1/day150-prefix-reference-sealed-execution-bundle-v1.mjs`
- `artifacts/day150/prefix-expected-catalog/sealed-runtime/v1/day150-prefix-reference-sealed-execution-bundle-v1.mjs.manifest.json`
- `scripts/hermes/build_farm_os_day150_prefix_reference_sealed_bundle.mjs`
- `scripts/hermes/lib/farm_os_day150_prefix_reference_postgres_worker.ts`
- `scripts/hermes/run_farm_os_day150_prefix_reference_sealed_bundle.ts`
- `scripts/hermes/test_farm_os_day150_prefix_reference_sealed_bundle.ts`
- `src/lib/hermes/farm_os_day150_prefix_reference_sealed_runtime_data.ts`

These candidates are non-runnable, non-gating, and excluded from the active executable source
closure. Their presence grants no execution or future-phase authority.

### PROTECTED_UNTOUCHABLE

- `coordination.lock`
- `tsconfig.tsbuildinfo`
- `scripts/sql/day150_active_projection_read_runtime_select.sql`
- `scripts/sql/day150_active_projection_read_runtime_select.rollback.sql`
- `artifacts/day150/prefix-expected-catalog/reference-runs/v1/reference-catalog-run-receipt-candidate.json.authorization-attempt-claim`
- `artifacts/day150/prefix-expected-catalog/reference-runs/v1/reference-catalog-run-receipt-candidate.json.authorization-consumed`

## Transition note

After `DAY150_COMPLETE`, and before any later execution-foundation implementation begins, the
repository roadmap and authority for that phase must be adopted separately. Its current absence is
not a Day150 blocker.

## Read-only resource preflight

On 2026-08-16, bounded read-only Docker inspect calls for the exact container, network, and volume
each returned the classifier-authorized exact not-found frame. The repository classifier returned
`ABSENT` for all three and aggregate `RESOURCE_PREEXISTENCE_CLEAR`. Docker mutations were zero.
This evidence does not authorize creation of any resource or execution of V9. V8 is historical,
exhausted, and non-runnable.
