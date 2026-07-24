# FarmOS Work Plan and Assignment Apply Foundation

## Purpose and SOT boundary

Day145-A recovers the contract path from an approved proposal to a human-editable Work Plan Draft and Assignment Candidate. FarmOS Core owns candidates, draft contracts, validation, policy results, audit lineage, and Gateway-ready Command Drafts. The farming app remains the source of truth for confirmed work plans, authoritative assignments, and operational results.

`Work Plan Draft ≠ Confirmed Work Plan`, `Assignment Candidate ≠ Final Assignment`, and `Command Draft ≠ Executed Command`. Core generation is limited to `draft` or `review_ready`; confirmed state is accepted only as an external reference and cannot be emitted by the Day145-A path.

## Lifecycles and human review

Work Plan lifecycle is `draft → review_ready → farming-app human confirmation`; `confirmed`, `cancelled`, and `superseded` are non-generatable reference states. Assignment lifecycle is `candidate → review_ready → farming-app human confirmation`; rejected, expired, and superseded candidates never become assignments.

Administrators may edit assignee, planned date/time, duration, priority, scope, and reason. Every edit requires authority, conflict, freshness, expected-version, and idempotency revalidation before another Command Draft can be produced.

## Authority, capability, and concurrency

The server-owned authority port binds the active human actor, approved proposal and approval, `edit_work_plan` or `assign_staff`, exact target scope, current policy, target version, current membership/participation, member capabilities, availability, overlap, duplicate assignment, and workload. Caller-, Hermes-, or client-asserted authority is never sufficient.

Canonical request fingerprints use the existing FarmOS hash utility. The in-memory reference reservation supports same-key replay, fingerprint conflict, unique proposal draft, approval reuse rejection, duplicate member assignment rejection, and expected-version checks. Authority timeout returns `outcome_unknown` with `authoritative_state_required=true`; a new key is not generated and authoritative state must be fetched.

## Runtime and Observer boundaries

Hermes may propose Work Plan or Assignment content and missing-information questions only. Native Runtime remains the deterministic validator and fallback reference. Hermes cannot approve, assert authority, create a final assignment, confirm a work plan, execute a Command, or write production data.

Observer outputs read-only Finding candidates for duplicate assignment, stale availability, scope/capability mismatch, workload conflict, missing evidence, and runtime disagreement. Findings cannot automatically adopt Policy or Skill.

## Audit, handoff, and rollback

Audit evidence binds proposal, approval, draft, assignment candidate, actor, capability, scope, hashed idempotency key, fingerprint, correlation/causation, human-edit revalidation, outcome-unknown state, and zero production execution/write/side effects. Original, superseding, and compensation command references are reserved for Day145-C without implementing compensation.

Antigravity consumers require list/edit/review states for Work Plan Drafts and Assignment Candidates, explicit validation errors, and server-side checks for approval, actor, capabilities, scope, member state, availability, conflicts, expected version, and idempotency. Browsers must not infer approval or write directly. Fixtures are in `scripts/hermes/farm_os_day145a_fixture.ts`; executable evidence is in `scripts/hermes/test_farm_os_day145a_work_plan_assignment.ts`.

Consumer contract: `farmos.work-plan-assignment.v1`. Editable fields: assignee, planned date, planned start time, estimated duration, priority, scope, and reason. Prohibited assumptions: Draft is confirmed, Candidate is assigned, unknown availability is available, client role/capability is authoritative, or timeout means failure/success. Core feature commit SHA: `9edcfab483b895683e56ed420109e8ad13402e24`.

Day145-B depends on Day145-A completion with P1/P2 zero and does not enable production execution. Rollback is removal or revert of this isolated contract/test/docs slice; reference-store state is process-local and discarded, with no business record to compensate.
