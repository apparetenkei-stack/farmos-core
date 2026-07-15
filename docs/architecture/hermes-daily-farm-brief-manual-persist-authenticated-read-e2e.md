# Hermes Daily Farm Brief manual persist authenticated read E2E

## Day116 scope

Day116 verifies one server-owned manual administrator path end to end:

`Day109 decision → Day110 execution → Day113 command → Day114 isolated PostgreSQL transaction → Day112 selection → Day115 fixture authentication/actor resolution → Day111 latest API`.

The only database target is the exact `farmos_core_day114_test` database in the local `farmos-postgres` Docker container over its local socket. The Day114 target classifier and in-transaction `current_database()` guard remain authoritative. Known local/restore/default/production-candidate targets fail before the isolation probe or repository call. Production environment configuration is not read.

## Manual and data boundaries

The E2E boundary itself fixes `manual`, administrator, `authorization_verified=true`, empty administrator scope, and zero retry. Force regeneration is an explicit server-owned fixture flag. Request, execution, command, record, and idempotency identifiers and all timestamps originate from deterministic fixture factories; browser input is not accepted. The unchanged Day110 adapter performs one integration, one scope build, and one administrator projection, with no external network, LLM, Queue, or Worker.

Day113 constructs the persisted record from the completed execution and its fingerprint-bound source. Day114 performs the atomic transition. A Day116-specific historical business-date chain avoids existing fixture ownership; a read-only business-date horizon decorator excludes later unrelated fixture records before the unchanged Day112 validation. It does not modify or skip invalid in-horizon records.

The first distinct execution establishes canonical v1, replay reuses its receipt, and a second distinct execution supersedes v1 with canonical v2. A separate Day116 rollback chain injects failure after supersede: the original v1 and receipt remain, v2 and its receipt remain absent, and authenticated latest read still returns the prior current candidate. Re-execution is idempotent and never uses DELETE, TRUNCATE, DROP, or retry.

## Authentication and output

Only the Day115 fixture provider and fixture actor directory are connected. Valid administrator GET returns 200, `Cache-Control: no-store`, current, and full administrator projection. Unauthenticated, unknown, and mismatched principals stop before repository read; general staff with an empty allow-list sees zero scopes. Query, method, and invalid source cases retain Day111 400/405/500 semantics.

The strict E2E result contains aggregate status, business date, display state, role, scope count, bounded call counts, retry count, and Safety only. It excludes record/execution IDs, principal, snapshot, scope index/keys, DB/user/credential, SQL, raw HTTP body, exception, and stack.

Day116 uses local isolated DB writes and fixture authentication only. Production DB/authentication/actor directory remain unconnected; no production migration/write permission, RLS/role change, farming-application change, scheduler, notification, model, Proposal, or Audit operation is added. Day117 hands off to farming-application Daily Brief display. Day118 may consider a minimal scheduler only behind a separate approval gate.

Rollback is the PostgreSQL transaction rollback already verified for each failed operation. Code rollback removes Day116 files and documentation/package-script additions. No destructive database cleanup is provided or required; deterministic receipts make reruns safe.
