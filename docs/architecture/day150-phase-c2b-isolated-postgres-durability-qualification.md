# Day150 Phase C2-B1: isolated PostgreSQL durability qualification source

## Classification and authority ceiling

Phase C2-B1 creates source-only qualification contracts for the C2-A PostgreSQL artifacts. Its maximum state is `QUALIFICATION_SOURCE_ARTIFACT_CREATED_CANDIDATE`. It does not start Docker, connect to PostgreSQL, apply or verify a migration, create canonical run evidence, qualify durability, establish a trusted clock, adopt G2-A readiness, bind runtime, or authorize production.

The exact C2-A lineage is commit `19889a78ae3a7d751c51f9b412f63c78bfc83a78`, migration `202608110001_production_target_execution_durability`, apply SHA-256 `f97eca5134c44c5a144523ea19b44b679051f3592f9fd28dbf38c441be7b8131`, and verify SHA-256 `f5294d29b6407d6ed789e2c229c394e62be09b0d31407065d99ca620e2473036`. There is no latest, manifest-tail, fallback, or alternate-migration resolution.

## Image and isolation authority

Future B2 execution accepts only PostgreSQL major 17 at `docker.io/library/postgres@sha256:<64-lowercase-hex>`. The repository digest is a human-approved B2 input and is not pinned by B1. Tag-only images, mutable tags, implicit discovery, and fallback pull are rejected. Every container plan uses `--pull=never`; a missing exact local image is `BLOCKED_ENVIRONMENT` until separately approved image acquisition.

Owned resources derive only from a caller-supplied 24-lowercase-hex execution nonce:

- container `farmos-pte-c2b-pg17-<nonce>`;
- label `farmos.day150.phase-c2b=<nonce>`;
- volume `farmos-pte-c2b-data-<nonce>`;
- internal network `farmos-pte-c2b-net-<nonce>`;
- test database `farmos_pte_c2b`;
- application name `farmos-day150-c2b-qualification`.

The container is non-privileged, has no host network, Docker socket mount, repository mount, credential-file mount, or production volume. It uses an internal bridge, localhost-only ephemeral port publication, bounded memory/CPU/pids, `--restart=no`, and an exact owned volume so state can survive an exact container restart inside one run. No wider binding or default-network fallback is permitted.

Docker command execution is argv-only with `shell:false`, a fixed local Docker socket, and an explicit environment allowlist. The allowlist contains exact image inspect, owned network/volume create/inspect/remove, exact container run/inspect/stop/start/kill/remove. It contains no pull, exec, prune, wildcard removal, or unowned deletion. Raw inspect JSON never crosses the Docker transport boundary: a positive projection retains only the exact image, container, network, volume, label, state, and localhost port fields required by qualification. `Config.Env`, full host configuration, mounts, unknown nested fields, and raw errors are discarded before any result is returned, followed by a defense-in-depth secret-pattern rejection.

Resource creation is tracked monotonically per container, volume, and network. Cleanup proves and removes each `CREATED_OWNED` resource independently in container, volume, network order. A missing container does not block an owned volume or network cleanup. `CREATED_UNOWNED_COLLISION` and `UNKNOWN` are never deleted and prevent qualification. Cleanup evidence records the exact final state and bounded identity of all three resources.

## Fixture and credential boundary

The fixture uses only `farmos_pte_c2b_owner`, `farmos_pte_c2b_runtime`, `farmos_pte_c2b_attacker`, database `farmos_pte_c2b`, and password grammar `c2b_<64-lowercase-hex>`. Credential material is injected from the isolated runner, never loaded from environment or a broker, and never enters evidence, a DSN log, Docker output, or raw error.

Synthetic records cover Proposal, Approval, Approval Receipt, Revocation Event and Head, Command, lifecycle, Reservation, Attempt, Receipt, Clock Evidence and Floor, Phase B snapshot, target binding, and reconciliation. They contain no production target, farm data, user data, provider identity, or production credential. C1 remains the semantic owner; the fixture only supplies deterministic C1-shaped inputs.

The isolated migration-history fixture reproduces the existing `core_schema.migration_history` column and constraint contract. Future B2 records only the exact C2-A ID, sequence, and apply checksum after exact apply bytes succeed, then executes the exact read-only verifier bytes. It never imports production database state.

## Executor and adapter separation

The executor owns orchestration, fixed migration and verifier plans, ordered case execution, fault/restart sequencing, evidence assembly, and cleanup invocation. It depends on an injected adapter and contains no Docker, PostgreSQL, environment, credential, G2-A, or production fallback.

Adapter behavior and real-execution authority are separate. The Docker adapter module owns a private WeakMap-bound capability that is issued only with its frozen real-adapter instance; public discriminator strings, booleans, object fields, and type assertions are not authority. A fake adapter may exercise the fixed source registry and return `SOURCE_VALIDATION_PASS`, but that path cannot emit QUALIFIED evidence, receipt, or commit marker. The B1 real boundary is deliberately fail-closed until a later authorized B2 implementation binds real operations inside the same authority-owning module.

The B2 authorization envelope authority is `farmos.production-target-execution-postgres-isolated-qualification-authorization.v1`. Its canonical digest binds the operation, nonce, exact C2-A identity, expected pinned B1 commit, exact image repository digest, case and fault registry identities, migration/apply/verify identities, expiry, and human-approval reference digest. It defines the shape of future authorization but does not manufacture human approval. Qualification also requires an independently injected source-lineage resolver to return `PINNED_B1_COMMIT`, equal to the envelope. CLI source-commit strings, `true` flags, and `--real` switches are not accepted.

Concurrency uses independent PostgreSQL clients and transactions in one ordinary Node process. No process-local mutex is authority. Restart closes all pools, clients, and repository instances, restarts only the exact owned container while retaining the exact volume, and creates fresh instances before state readback. No custom IPC server, Unix socket listener, background daemon, or `tsx` CLI is required.

## Case and fault registries

The ordered case registry authority is `farmos.production-target-execution-postgres-qualification-case-registry.v1`. It has exactly 66 statically defined cases: MIG 8, GRD 5, SOT 9, RSV 4, REV 2, ATT 1, TERM 5, CLK 4, FLT-RSV 5, FLT-ATT 3, FLT-FIN 3, FLT-RCP 1, RST 9, CLN 4, and SAF 3. Each tuple binds case ID, category, expected-result profile, expected winner count, and bounded loser results. A PASS result must exact-match that profile and winner count; its authoritative mutation-row count must equal the fixed winner-count expectation, and every observed loser classification must be a unique member of the tuple allowlist. The domain-separated registry digest changes when any ordered authority field changes. Runtime callers cannot add cases.

The fixed fault registry distinguishes `APPLICATION_OBSERVATION_BOUNDARY_AND_CONTAINER_CRASH_BOUNDARY`. A committed-but-unobserved ACK case means the underlying COMMIT succeeds and the adapter suppresses success from the repository boundary; it is not represented as a wire-level proxy test. Deterministic pre-write faults use a fixture-admin lock and terminate only the exact observed fixture backend. They do not install schema-changing test triggers or accept an arbitrary backend ID.

## Evidence and failure preservation

The evidence authority is `farmos.production-target-execution-postgres-isolated-qualification-evidence.v2`. Exact parsers reject missing and unknown keys. Evidence mode is exactly `ISOLATED_POSTGRES_QUALIFICATION` and binds executor, authorization digest, case and fault registries, nonce, C2-A commit, expected and independently observed B1 commits, migration and verifier identities, approved/observed image identities, platform/server version, resource identity digests, all ordered case results, per-resource cleanup states, residual resources, production/external-network operations, retry count, bounded timestamps, fault model, and classification.

Classifications are `BLOCKED_ENVIRONMENT`, `FAILED_EXECUTION`, and `QUALIFIED`. Process exit alone cannot qualify. `QUALIFIED` requires all 66 exact PASS results, exactly three owned resources created and removed, successful cleanup, residual resources zero, production operations zero, external-network operations zero, and automatic retry zero. Receipt and commit-marker parsers also reject missing, additional, or digest-inconsistent fields.

The canonical path is `reports/day150-phase-c2b-isolated-postgres/runs/<nonce>/`. A completed run owns `evidence.json`; only exact QUALIFIED evidence may produce a receipt candidate; only evidence plus its exact receipt may produce a commit-marker candidate. Syntax parsers establish no semantic authority. The single high-level accepted-chain validator recomputes evidence, receipt, and chain digests and binds authorization, nonce, expected/observed source commits, registry digest, image digest, and classification. Orphan receipts, orphan commit markers, and cross-evidence chains fail. Files remain canonical JSON, exclusive-create, and digest-linked; a later run cannot overwrite or delete an earlier blocked, failed, or qualified run. B1 creates no canonical run directory or file.

## B2 hold and completion gate

B2 remains HOLD until B1 source is reviewed, committed, and pushed; an exact C2-B source commit and exact PostgreSQL repository digest are approved; the exact image is local or acquisition is separately approved; Docker daemon and isolated-DB operations are explicitly approved; the case registry digest is pinned; source denylist and cleanup-plan checks pass; and no conflicting owned resource exists.

Technical QUALIFIED evidence requires exact migration apply/history/verifier/catalog/ACL/guards, Approval SOT durability, reservation/revocation/attempt/terminal/clock concurrency, every ACK-loss branch, restart/reopen/replay rejection, client closure, exact cleanup, residual resources zero, production access zero, P1 zero, P2 zero, and Sol GO. Successful evidence remains a candidate for a separate G2-A adoption decision. Trusted clock, external probe, Gate 2, runtime binding, production access, and production execution remain unauthorized.
