# Day150.5 EF-1 v1.1 Amendment - Canonical Integration Record

## Status

```text
AMENDMENT_DECISION = APPROVED
EXECUTION = NOT_STARTED
PRODUCT_DAY_RENUMBERING = false
POST_EF_DC1_GATE = false
PRODUCTION_DB_DATA_WRITE = 0
PRODUCTION_RELEASE = 0
```

## Placement

```text
Day150 formal closure
  -> Day150.5 EF-1 v1.1 A-N
  -> roadmap-resume-lock verification
  -> Day151
```

No independent `DC-1` stage is inserted. `Development Control` is a logical cross-cutting namespace implemented inside EF-1.

## Amendment mapping

### A - Entry Baseline, Capability Preflight and Spec Kit Core Qualification

Add to the existing A scope:

- discover the actual Spec Kit installation/capability;
- pin exact tool version and distribution fingerprint;
- record supported commands and output schemas;
- validate that the tool can operate without production credentials;
- record compatibility with the current Coordination SOT and repository toolchains;
- fail closed as `BLOCKED_ENVIRONMENT` or `BLOCKED_SPECIFICATION` when qualification cannot be proven.

Required amendment artifacts:

- `spec-kit-version.lock`
- `spec-kit-capability-matrix.yaml`
- `spec-kit-core-qualification-report.md`
- Spec Kit entry in `toolchain-manifest.lock`

### I - Spec to Converge and Autonomous Evidence Loop

Integrate this deterministic lifecycle:

```text
Spec -> Plan -> Tasks -> Analyze -> Implement -> Converge
  -> deterministic verification
  -> evidence capsule
  -> failure classification / bounded repair
  -> COMPLETE or explicit BLOCKED state
```

Requirements:

- each stage has an immutable input/output reference;
- scope expansion creates a proposal or blocked state;
- Analyze cannot alter authority or product scope;
- Converge cannot weaken tests/fixtures/policies to obtain PASS;
- Git/test/DB/command evidence is collected by tools, not accepted from LLM self-report;
- cycle, token, wall-clock and resource budgets remain enforced.

### J - Independent Reviewer and Governance

The independent reviewer validates:

- roadmap/current-state hash;
- Spec/Plan/Tasks consistency;
- scope and non-goals;
- architecture invariants and SOT boundaries;
- evidence sufficiency and test integrity;
- rollback and next dependency;
- whether a DCR candidate may be issued.

Reviewer output remains fixed-schema and cannot self-approve production or roadmap activation.

### M - Agent Portability and Shadow Parity

Prove that the same Task Contract, Spec Kit package, evidence capsule and review contract can be consumed by an alternate agent/runtime without semantic drift.

Minimum checks:

- vendor-neutral schema;
- no hidden conversation-memory dependency;
- deterministic gate result parity;
- critical violation recall 100%;
- false COMPLETE 0;
- Qwen remains Shadow/Advisory with production authority 0;
- manual ChatGPT review fallback remains operational.

### N - DCR, Development Memory, Roadmap Update Proposal and Session Bootstrap

N additionally produces:

1. **Day Completion Record Candidate** linked to exact Git/test/evidence hashes.
2. **Development Memory Candidate** containing source-linked decisions, failures and reusable lessons, with candidate/approved state separation.
3. **Roadmap Update Proposal** describing current-position/roadmap effects; it does not mutate the roadmap.
4. **Session Bootstrap** for the next agent/session containing exact canonical roadmap hash, verified current state, resume lock, Day151 specification pointer, unresolved blockers and protected-resource list.
5. Confirmation that the `roadmap-resume-lock` still points to Day151 and that no separate DC-1 dependency exists.

## Closure rule

EF-1 v1.1 is complete only if all original EF-1 gates and amendment gates pass. Completion returns directly to Day151 after resume-lock verification. Any missing amendment artifact or authority ambiguity leaves EF-1 incomplete.
