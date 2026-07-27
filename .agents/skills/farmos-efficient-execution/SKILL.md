---
name: farmos-efficient-execution
description: >
  Use for all FarmOS Core Day implementation, debugging, testing,
  review, handoff, completion-gate, and Codex execution tasks.
  Minimizes weekly Codex usage through scoped reading, Luna/Terra/Sol
  task classification, bounded retries, staged validation, and
  safety-preserving escalation. Do not use for unrelated repositories.
---

# FarmOS Efficient Execution

## Objective

Complete FarmOS Core work with the minimum sufficient model capability and
minimum duplicated processing while preserving architecture, safety, test
coverage, rollback, and Human-in-the-Loop governance.

## Task classes

### LUNA_CLASS

Use for:

- read-only Git and repository inspection
- exact symbol or filename search
- targeted test execution
- build, lint, typecheck, and diff checks
- test-log classification
- evidence and artifact collection
- protected-file hash checks
- staged-file set verification
- strictly mechanical fixture, wording, or type-name updates
- local changes that exactly follow an already verified pattern

Do not use as the final authority for architecture, authorization, persistence,
migration, production execution, rollback, secrets, or P1/P2 semantic review.

### TERRA_CLASS

Use for:

- ordinary FarmOS Day implementation
- coordinated multi-file changes
- API, parser, normalizer, validator, and state-machine work
- ordinary TypeScript debugging
- UI/API/test vertical slices
- extensions that preserve existing contracts and bounded contexts
- targeted root-cause repair
- ordinary regression fixes

Terra-class work is the default implementation tier.

### SOL_CLASS

Reserve for:

- architecture or bounded-context changes
- source-of-truth changes
- authentication or authorization boundaries
- RLS, migrations, schema changes, and production persistence
- Level 2 Internal Apply
- Level 3 External Execution
- Execution Gateway
- idempotency and concurrency design
- rollback and compensation
- Secret and credential boundaries
- conflicting safety requirements
- unresolved multi-cause failures
- final P1/P2 semantic review
- final commit or push readiness decision for Level 1–3 changes

## Escalation rules

```text
One failed LUNA_CLASS attempt
→ TERRA_CLASS

Two TERRA_CLASS repairs failing for the same root cause
→ SOL_CLASS

Authorization, RLS, migration, production write,
external execution, secret, rollback, or compensation
→ SOL_CLASS from the start
```

A failure includes:

* the same targeted test fails for the same reason
* forbidden scope is modified
* the contract is not satisfied
* the root cause cannot be explained
* the proposed fix expands scope unexpectedly
* required safety evidence cannot be produced

Do not reset the retry counter by rephrasing the same repair.

## Scoped inspection

Inspect only what is necessary, in this order:

1. branch, HEAD, working tree, and current diff
2. files explicitly named in the Day instruction
3. their direct imports and dependencies
4. related tests and fixtures
5. surrounding implementation only when required by a concrete finding

Do not recursively read the entire repository without a specific reason.

Cache stable findings during the task. Do not repeatedly reread unchanged
files, package-manager configuration, contracts, fixtures, or protected hashes.

## Subagent policy

Default to no subagents.

Use delegation only when:

* tasks are independent
* work is read-heavy
* results can be returned as compact summaries
* delegation reduces total work rather than duplicating it

Use at most one independent reviewer per Day, only at the final semantic gate
when required.

Good delegation targets:

* bounded repository exploration
* independent test execution
* log triage
* read-only security or contract review

Avoid parallel write-heavy agents and overlapping code ownership.

Never claim a Luna, Terra, or Sol model was used unless the runtime confirms
the model selection. When the runtime cannot confirm routing, report that the
classification was applied but execution remained on the current session model.

## Token management

* Maximize evidence per token.
* Check the Git baseline once and inspect the current diff first.
* Prefer targeted searches and targeted tests.
* Do not repeat an audit or root-cause investigation without new evidence.
* Stop when more work cannot change the decision.
* Keep the final handoff compact.

## Validation sequence

Use the smallest meaningful validation first:

1. targeted test reproducing or protecting the changed behavior
2. directly related regression tests
3. typecheck or production build
4. broader regression tests only when required by the change or Day gate
5. `git diff --check`
6. changed-file review
7. Secret, write-boundary, and protected-file checks
8. final semantic review appropriate to the risk level

Do not repeatedly run the full build while a targeted test remains red.

Do not omit a required Day gate solely to save usage.

## Output discipline

Do not reproduce large successful logs.

For intermediate findings, retain:

```text
command or check
result
failure classification
next decision
```

For the final report, include:

1. completion decision
2. practical value delivered
3. files changed
4. contract and architecture impact
5. risk level
6. model class applied
7. confirmed model delegation, if any
8. escalation history
9. tests and build results
10. safety-boundary evidence
11. rollback method
12. unresolved items
13. next Day impact

## FarmOS invariants

Never weaken:

* Proposal First
* Human Approval
* Fail Closed
* AI isolation from confirmed business data
* server-side authorization
* least privilege
* Secret non-exposure
* stale-data rejection
* idempotency
* auditability
* rollback or compensation
* bounded-context ownership
* Core/App responsibility separation
* protected-file constraints

AI output is a proposal or candidate until the designated human workflow
confirms it.

## Prohibited actions without explicit approval

* commit
* push
* merge
* rebase
* deploy
* migration apply
* RLS change
* production data mutation
* Proposal Apply
* external execution
* Secret access or rotation
* destructive cleanup

## Day-specific instructions

Day-specific scope, files, acceptance criteria, tests, protected assets, and
completion gates remain authoritative.

This skill optimizes execution; it does not override the Day's safety boundary
or invent permissions that were not explicitly granted.
