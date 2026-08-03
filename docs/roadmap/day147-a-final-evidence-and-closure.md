# Day147-A Final Evidence and Closure

## Status

```yaml
day147_a6_final_evidence_and_closure:
  status: READY_FOR_DAY147_A_COMMIT
  a6_complete: true
  day147_a_closed_pending_commit: true
  closure_scope_complete: true
  dynamic_reexecution: false
  source_behavior_changes: false
  staged_files: 0
  git_commit_created: false
  push_executed: false
  day147_b_started: false
```

This document closes the Day147-A implementation evidence scope. It does not
apply a migration, access a production service, modify an artifact, promote a
Projection, start Day147-B, or authorize any production operation.

## Repository baseline

```yaml
repository: /Users/hayate/projects/farmos-core
branch: main
base_head: 6b53b1c5b35590518bf73526f89cc7e5cf4f7f90
origin_main: 6b53b1c5b35590518bf73526f89cc7e5cf4f7f90
ahead_behind: 0/0
staged_files: 0
initial_git_diff_check: PASS
```

## Day147-A scope and final behavior

The closed Day147-A process scope is:

1. A1-PREPARE
2. A2 Projection State Model and Transition Validator
3. A3 Explicit Candidate Writer
4. A4 Projection-first Candidate Exclusion
5. A1-ACTIVATE Strict Candidate-first Database Enforcement
6. A5 Isolated PostgreSQL Integration Validation
7. A5-4 Independent Evidence Review
8. A6 Final Evidence and Closure

The resulting contract has exactly five Projection lifecycle states:
`candidate`, `active`, `rejected`, `superseded`, and `failed`. New Projection
history begins only as `candidate`; lifecycle changes require explicit valid
transitions; no automatic promotion exists; and Projection-first selection
returns only `active`. Candidate content and lineage are not exposed through
the active Projection read. Lifecycle history remains append-only. The
authoritative integration evidence validates transition provenance and proves
that the baseline Active Projection was unchanged.

## Exact final change scope

```yaml
change_classification:
  day147_a_required:
    - db/migrations/202607310001_daily_operational_projection_candidate_activation.sql
    - db/migrations/202607310001_daily_operational_projection_candidate_activation.verify.sql
    - db/provisioning/manifest.json
    - package.json
    - scripts/hermes/test_farm_os_day147a1_activate_migration_authority.ts
    - src/lib/hermes/farm_os_projection_first_selector.ts
    - scripts/hermes/lib/farm_os_day147a5_client_suite.ts
    - scripts/hermes/lib/farm_os_day147a5_evidence_contract.ts
    - scripts/hermes/test_farm_os_day147a5_isolated_postgres.ts
    - scripts/hermes/test_farm_os_day147a5_minimal_network.ts
  preexisting_unrelated: []
  protected:
    - tsconfig.tsbuildinfo
  generated_failure_artifacts: 33
  legacy_success_artifacts:
    - reports/day147a5-isolated-postgres/runs/102714e7f162/evidence.json
    - reports/day147a5-isolated-postgres/runs/102714e7f162/receipt.json
    - reports/day147a5-isolated-postgres/runs/102714e7f162/commit.json
  authoritative_success_artifacts:
    - reports/day147a5-isolated-postgres/runs/813faed4c9ee/evidence.json
    - reports/day147a5-isolated-postgres/runs/813faed4c9ee/receipt.json
    - reports/day147a5-isolated-postgres/runs/813faed4c9ee/commit.json
  unexpected: []
```

`package.json` is in the Day147-A scope because its complete current diff adds
only the A5 minimal-static, legacy-static, and targeted-typecheck commands.
The A5 harness also identifies it in both its expected worktree allowlist and
network source overlay allowlist. No unrelated `package.json` change is present
in the current diff.

## Start-of-A6 SHA-256 manifest

The following manifest was enumerated from the start-of-A6 worktree. It fixes
the exact bytes of tracked modifications, untracked source files, historical
artifacts, the authoritative chain, and the protected build-info file without
changing any of them.

### Tracked modified files

```text
e55b7b2c33d432b37d9733d599f8ed4dd7de99a82fb64c5f90158dae7addbbc2  db/migrations/202607310001_daily_operational_projection_candidate_activation.sql
2b7108045ab34e5790b6d6381f9e6d2ca2399380a5dc05a9b80d7cf8af337b89  db/migrations/202607310001_daily_operational_projection_candidate_activation.verify.sql
9995eaaafb2543758c4e79155721de76e0c84b41081129f877f2c9325a48e410  db/provisioning/manifest.json
80b72f6281d0145ffeedfd183ef6ff5c61e61cec6849b1d4d4fdf49157afe8b6  package.json
5ba88b51ead73c91dcf45b4afc3e8f3926009da5264435f6e455d7dfaedf07d4  scripts/hermes/test_farm_os_day147a1_activate_migration_authority.ts
78f5ad88ae56afe79f8190587a4d560fbcc393bc06738ef6bc8471bcecb8a84b  src/lib/hermes/farm_os_projection_first_selector.ts
```

### Untracked source files

```text
dcbfba34ee8e2349253ea114ca5e698252f30bd40664ed7b23e7b07149c211ea  scripts/hermes/lib/farm_os_day147a5_client_suite.ts
a6ac8bab22f95daed87fafb36e3e6334d1ffdbfaa3d73cf1fd5ecc78d80c73cb  scripts/hermes/lib/farm_os_day147a5_evidence_contract.ts
0e14a07b63dbd11712b97e594f77501a5fc4a13a0798690d1dc94f6c0564b59f  scripts/hermes/test_farm_os_day147a5_isolated_postgres.ts
43f19e6756ceb1295e602836d0ba8f4d5a2cb52130c67c4e2e88419e93f4fe45  scripts/hermes/test_farm_os_day147a5_minimal_network.ts
```

### Failure artifacts — `VALID_FAILURE_EVIDENCE`

These 33 artifacts are retained as historical failure evidence. They are not
Day147-A closure authority and are excluded from the proposed commit.

```text
50c2d1ae7de78c9891d59428f7616ec7db7eabedc7db022b24e09d61cd3ba205  reports/day147a5-isolated-postgres/runs/0d47aabdc206/evidence.json
4fc35869d4f4cd700faa6fd690d75cb7afcf522c6330e986ce9eceb8dc1912f9  reports/day147a5-isolated-postgres/runs/16d30be8e56e/evidence.json
8b9359775c1d70cf36261248d16e448f35b597ff79f2de3f952e741d0b947696  reports/day147a5-isolated-postgres/runs/34faaf756de9/evidence.json
0fc81719aafa6f5e28287a80929a98ca990fe1aea0dffdb26058eb8a3e5d0115  reports/day147a5-isolated-postgres/runs/35f85f615231/evidence.json
42850962a66eca0bdfd28ab64f5e888a0b131d35e23beb2ab3ba349df80ddf3f  reports/day147a5-isolated-postgres/runs/3a602a916e94/evidence.json
13924d3018a09e41cfef2ce0cc51b5ccf9de42f84582649a1fef540f7d6206c5  reports/day147a5-isolated-postgres/runs/52fed321b200/evidence.json
d5d0b0e018f52895434014a7e4ccd830ea0133585c804d3041dc1f35a76b9889  reports/day147a5-isolated-postgres/runs/5803082f29f8/evidence.json
83e6e7540b3a2ce22d6740288295421e24ab36c42d65c4dff390c4eba777505c  reports/day147a5-isolated-postgres/runs/5acbfdeab403/evidence.json
4a509c6187116e37d9adf46c9db1f6f03bc158cd26594184905974216a231998  reports/day147a5-isolated-postgres/runs/5cffba9c2692/evidence.json
4bb24725ae5bb6ca4784fa10ff8df8aad896122198a9193e38c7542325b82e08  reports/day147a5-isolated-postgres/runs/62c081b236ec/evidence.json
055f5392bafdd72c26e105b73f2680f64a71cd04d7527be5026e2dbd4bc0dc27  reports/day147a5-isolated-postgres/runs/68aac0ace9ee/evidence.json
6ab86d8f651d47eb59eedf3bf5ec3acd4d3ba80812f5dff4e100737a67b1ae6c  reports/day147a5-isolated-postgres/runs/7f68091fc5df/evidence.json
34cd0e9e6eb753d2eb97e78031b07486daef2c0b7b31e9d96849b0e6802144dc  reports/day147a5-isolated-postgres/runs/87c412620eeb/evidence.json
3455b2b65f377e2cdd543a70376557b735fa6fa464790b8fa9d5f7eb60e61869  reports/day147a5-isolated-postgres/runs/8f44713cf3a2/evidence.json
e62668c4c6a471c6d809da36842a013763987a286bde0ff343c88a4fa692b5a4  reports/day147a5-isolated-postgres/runs/9364d5ae069a/evidence.json
7c28ae2b971abafa7d33e1247d6767cc974260660ce1c910eb56cbe5736953e0  reports/day147a5-isolated-postgres/runs/9543d32dac1c/evidence.json
a6d8c896e2d85550716f4787c739850fe24ef42ba6d6f8eac8132ca5e10fbdd6  reports/day147a5-isolated-postgres/runs/954fc4646af3/evidence.json
7bf2b1daf876204d6b813d235b50e03e283fa41a512cf733dc40f48ce21ddbc9  reports/day147a5-isolated-postgres/runs/975deace5a77/evidence.json
55f45bbdd679eca0777398f5a3b4db683c6c2aa504eb9d15eb25a749a251ac56  reports/day147a5-isolated-postgres/runs/9d5f765f70e0/evidence.json
6ad16c752d8a2d66ca0ad2be875bc4c241878b581cf2218202818fa4b91cd22d  reports/day147a5-isolated-postgres/runs/9f792c34d880/evidence.json
f4f2ef4d058f11d7de635e783845ae95b6b6493a31f707e8c5752994b8ca9e45  reports/day147a5-isolated-postgres/runs/b2bc0aa5b22b/evidence.json
48a0d9225264bfe7aa5ca23a86ce20c95fd6a2c58520425d84fde9a9b5a9bf79  reports/day147a5-isolated-postgres/runs/b3d0dc3008be/evidence.json
2748cde37eecce401339d50dde9d010161cd202197b8ec37c5244d44db4c5189  reports/day147a5-isolated-postgres/runs/bdcfefc3b5ef/evidence.json
69431dd20167371f0b5cdaba3fb0abefb03550b8566adbe795df9da0288a47f5  reports/day147a5-isolated-postgres/runs/cafc666a9935/evidence.json
21e9cba7e7b2e8550b40d83598af07c3e1970da281f92be7e1ef881f9998261f  reports/day147a5-isolated-postgres/runs/ceef631d715b/evidence.json
48a4ec31fcfa819852a246272c0d51c0df7c0c1a27ae6198dbba570df14eb22e  reports/day147a5-isolated-postgres/runs/e031667980fe/evidence.json
3f3bbe7ca229d183851582159c37bc1e7b9f81e44f36c8fd3c47e866d50b628f  reports/day147a5-isolated-postgres/runs/e392b32840ac/evidence.json
d4d6376fbfdab8ac14a94543a0bd8eb7733db25d69adb06a430e2bac3f525ddd  reports/day147a5-isolated-postgres/runs/e7e7cfbc33a8/evidence.json
f1a60f5b31a2d57dfe6aee65a5e6d206a507369c609528c895e095ad4daa8e28  reports/day147a5-isolated-postgres/runs/ec82dd4e720e/evidence.json
359c227a1e8cd5df07d4439de55736757e24060b7bdf376131b09b38542ef765  reports/day147a5-isolated-postgres/runs/f1e35fdaa140/evidence.json
3d130eb581c8c31673229b29bb6e7710479edee23d20569e17fa70fdbc51209a  reports/day147a5-isolated-postgres/runs/f5f9570d13b8/evidence.json
26c49a66399e0155dc0c0bd7dd5663978b70e8443f7626e386e3086f6fdaefb1  reports/day147a5-isolated-postgres/runs/f60a2cfeb84d/evidence.json
fd8bfb1c7ec6d1dee36bdb92b3796c50907c9f2c933d14eb901f8e813a8b09ca  reports/day147a5-isolated-postgres/runs/fb3240c732cc/evidence.json
```

### Legacy success chain — `VALID_LEGACY_SUCCESS_CHAIN_SEMANTICALLY_INCOMPLETE`

The legacy schema-6 chain has a valid hash chain but is semantically incomplete
for closure and is not used as closure authority.

```text
88b51595ffb3128668fe68c225596468d11891e78ec7b519a80004e376fd57a6  reports/day147a5-isolated-postgres/runs/102714e7f162/evidence.json
f21c0954562e66578ad0fde18be63d8891972a3ed007f856cd229609e4ea0e39  reports/day147a5-isolated-postgres/runs/102714e7f162/receipt.json
3f7c339106469713a223775b93d9f5da4888d5a8a3e2073a392fcbb0e308e516  reports/day147a5-isolated-postgres/runs/102714e7f162/commit.json
```

### Authoritative success chain — `VALID_COMPLETE_COMMITTED_SUCCESS_CHAIN`

```text
21f29d2655db666852e7e1af183aaeb24336b7d1e2b7f417540eca41f301243b  reports/day147a5-isolated-postgres/runs/813faed4c9ee/evidence.json
a7145d55ac4ac2f9ade781d8f0b2db647bc60144e3c7836b1842c5a4285d53df  reports/day147a5-isolated-postgres/runs/813faed4c9ee/receipt.json
40100db8e4819d6fc9bd815959ff0e9d9248b68330983041b97eb2c5dfdcce02  reports/day147a5-isolated-postgres/runs/813faed4c9ee/commit.json
```

### Protected file

```text
4ec54d59e72843bbf8f7fdf19c8dbd351738920457ff715979964637f3d35ccb  tsconfig.tsbuildinfo
```

`tsconfig.tsbuildinfo` remains untracked and protected. A6 does not delete,
stage, clean, restore, or rename it.

## Authoritative dynamic evidence

The sole dynamic closure authority is execution `813faed4c9ee`.

```yaml
execution_nonce: 813faed4c9ee
schema_version: 7
migrations:
  day146: PASS
  prepare_apply: PASS
  prepare_verify: PASS
  activate_apply: PASS
  activate_verify: PASS
case_registry:
  expected_count: 102
  executed_count: 102
  failed_count: 0
  exact_case_set: true
  digest: 16a9402d7c0b6696cded4ecb7282cce550dd9745c662d75edf5e1426eb819eaa
transition_provenance:
  raw: 5
  explicit_authorized: 5
  unauthorized: 0
  unknown: 0
  cleanup_leak: 0
  baseline_active_mutation: 0
state_invariants:
  comparison_complete: true
  automatic_promotion_count: 0
  active_state_unchanged: true
result_transport: PASS
client_cleanup:
  clients_created: 34
  close_attempted: 34
  close_completed: 34
  close_failed: 0
  open_clients_after_cleanup: 0
resource_cleanup:
  residual_resources: 0
production_operations: 0
```

## Evidence chain

```yaml
schema_version: 7
evidence_sha256: 21f29d2655db666852e7e1af183aaeb24336b7d1e2b7f417540eca41f301243b
receipt_sha256: a7145d55ac4ac2f9ade781d8f0b2db647bc60144e3c7836b1842c5a4285d53df
commit_artifact_sha256: 40100db8e4819d6fc9bd815959ff0e9d9248b68330983041b97eb2c5dfdcce02
semantic_validator: ACCEPTED
committed_chain_validator: ACCEPTED
```

The artifact named `commit.json` is an artifact-chain durability marker. It is
not a Git commit, does not create a Git commit, and does not indicate that the
worktree has been staged or committed.

## Static validation

```yaml
minimal_static: PASS
legacy_a5_static: PASS
targeted_typecheck: PASS
a1_prepare: PASS
a1_activate: PASS
a2: PASS
a3: PASS
a4: PASS
git_diff_check: PASS
static_external_operations:
  docker: 0
  database_connections: 0
  migrations: 0
  dynamic_cases: 0
  evidence_writes: 0
repository_wide_typecheck:
  status: KNOWN_BASELINE_DIAGNOSTICS_ONLY
  diagnostic_count: 5
  farm_os_operational_memory_contract.ts: 1
  farm_os_projection_first_contract.ts: 4
  caused_by_day147_a_changes: false
```

The repository-wide typecheck diagnostics are known baseline diagnostics and
are not caused by the Day147-A change scope.

The minimal static command was executed after this closure document was
created, as required by A6, and passed with the exact static-only closure
classification below. The A5 dynamic execution source scope remains unchanged
and rejects the closure document rather than ignoring it.

```yaml
resolved_a6_gate_conflict:
  prior_failure: SOURCE_PATH_UNEXPECTED
  resolution: exact static-only A6_CLOSURE_DOCUMENT contract
  dynamic_scope_widened: false
  exact_path: docs/roadmap/day147-a-final-evidence-and-closure.md
```

## Artifact policy and proposed Git commit unit

```yaml
artifact_policy:
  failure_artifacts: VALID_FAILURE_EVIDENCE_EXCLUDED
  legacy_success_chain: VALID_LEGACY_SUCCESS_CHAIN_SEMANTICALLY_INCOMPLETE_EXCLUDED
  authoritative_success_chain: VALID_COMPLETE_COMMITTED_SUCCESS_CHAIN
  git_commit_recommendation: INCLUDE_AUTHORITATIVE_SUCCESS_CHAIN
```

The recommendation is to include only the three authoritative schema-7 chain
files. The chain is the sole dynamic closure authority, all three files are
required to preserve evidence-to-receipt-to-marker verification, and no
`.gitignore` rule excludes them. Repository precedent records final Day evidence
as version-controlled evidence documents, while runtime JSON under `reports`
has no earlier tracked precedent. For this Day, the stronger reproducibility
requirement is decisive: include the complete authoritative chain, exclude all
33 failure artifacts and the semantically incomplete legacy success chain, and
record their hashes in this closure document.

The proposed future commit is one independently revertible unit. A6 does not
stage or create it.

```yaml
proposed_commit:
  file_count: 14
  files:
    - db/migrations/202607310001_daily_operational_projection_candidate_activation.sql
    - db/migrations/202607310001_daily_operational_projection_candidate_activation.verify.sql
    - db/provisioning/manifest.json
    - package.json
    - scripts/hermes/test_farm_os_day147a1_activate_migration_authority.ts
    - src/lib/hermes/farm_os_projection_first_selector.ts
    - scripts/hermes/lib/farm_os_day147a5_client_suite.ts
    - scripts/hermes/lib/farm_os_day147a5_evidence_contract.ts
    - scripts/hermes/test_farm_os_day147a5_isolated_postgres.ts
    - scripts/hermes/test_farm_os_day147a5_minimal_network.ts
    - reports/day147a5-isolated-postgres/runs/813faed4c9ee/evidence.json
    - reports/day147a5-isolated-postgres/runs/813faed4c9ee/receipt.json
    - reports/day147a5-isolated-postgres/runs/813faed4c9ee/commit.json
    - docs/roadmap/day147-a-final-evidence-and-closure.md
  subject: "feat(hermes): complete Day147 candidate-first projection enforcement"
  body:
    - enforce explicit candidate-first projection lifecycle
    - exclude candidate projections from projection-first reads
    - validate Day146/PREPARE/ACTIVATE migrations in isolated PostgreSQL
    - persist schema-7 semantic success evidence and committed artifact chain
    - prove 102/102 cases, zero unauthorized promotion, and unchanged baseline Active state
```

Excluded from the proposed commit are `tsconfig.tsbuildinfo`, all 33 failure
artifacts, and all three legacy run `102714e7f162` artifacts. There are no
preexisting unrelated or unexpected files in the final classified scope.

## Rollback procedure

```yaml
production_operations: 0
production_database_rollback_required: false
```

### Before a Git commit

The work is uncommitted. A rollback would restore only the explicitly listed
Day147-A target files to their content at starting HEAD
`6b53b1c5b35590518bf73526f89cc7e5cf4f7f90` and remove only the explicitly
listed new Day147-A files through a separately authorized, targeted procedure.
A6 does not perform this rollback. Repository-wide restore, `git reset --hard`,
and `git clean` are prohibited; unrelated and protected files must remain
untouched.

### After a future Git commit

The proposed unit is one commit so that it can be rolled back with:

```text
git revert <day147-a-commit>
```

If a production migration is applied in the future, do not automatically run
a simple SQL down migration. Lifecycle events are append-only, migration
history exists, rollback of trigger and constraint authority requires an
operational decision, and compatibility with existing Projection state must be
verified first.

## Production safety statement

No production database, Runtime, Worker, Docker/PostgreSQL service, farming
application, external service, Proposal Apply, or active Projection was
operated by A6. Production operations remain zero. Proposal First, Human in the
Loop, active-only reads, fail-closed handling, append-only history, and Secret
non-exposure remain unchanged.

## Day147-B entry gate

```yaml
day147_b_entry_gate:
  day147_a_closed: true
  authoritative_success_run: 813faed4c9ee
  schema_7_semantic_chain: VALID
  unauthorized_promotion_count: 0
  active_state_unchanged: true
  production_operations: 0
  git_commit_required_before_day147_b: true
  push_required_before_day147_b: true
  ready_after_commit_and_push: true
  blockers:
    - exact Day147-A Git commit has not been created
    - push has not been executed
```

Day147-B implementation has not started. Day147-B remains blocked until the
exact Day147-A commit is created and pushed under separate explicit human
authority.

## A6 definition of done

```yaml
a6_definition_of_done:
  closure_document_present: true
  closure_document_static_contract: PASS
  dynamic_scope_widened: false
  final_scope_classified: true
  authoritative_evidence_documented: true
  legacy_and_failure_artifacts_classified: true
  rollback_documented: true
  production_operations_zero_documented: true
  proposed_commit_scope_exact: true
  proposed_commit_message_ready: true
  day147_b_entry_gate_documented: true
  commit_scope_exact: true
  static_gate_pass: true
  a6_complete: true
  day147_a_closed_pending_commit: true
  day147_b_started: false
  dynamic_reexecution: false
  staged_files: 0
  git_commit_created: false
  push_executed: false
```
