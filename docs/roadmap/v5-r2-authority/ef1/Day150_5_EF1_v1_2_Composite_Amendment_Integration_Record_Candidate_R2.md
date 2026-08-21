# Day150.5 EF-1 v1.2 Composite Amendment Integration Record - Candidate R2

- Base: EF-1 v1.0 APPROVED
- Existing amendment: EF-1 v1.1 APPROVED (Spec Kit / Development Memory / DCR)
- New amendment: EF-1 v1.2 CANDIDATE (Inference & Data Egress Governance)
- Entry Gate: Day150 formal closure
- Product-Day impact: none
- New post-EF blocking stage: none
- Production DB/data write: 0
- Production release: 0
- Activation: HUMAN_APPROVAL_REQUIRED

## Decision

The egress amendment is integrated into existing A-N SubDays. It does not create `DC-1`, `IEG-1`, a new product Day or a post-EF blocking stage.

```text
Day150 formal closure
  -> EF-1 A-N with v1.1 + human-approved v1.2 overlay (candidate until approved)
  -> roadmap-resume-lock verification
  -> Day151
```

## Integration map

| SubDay | v1.2 addition | Exit evidence |
| --- | --- | --- |
| A | Inventory current cloud/local provider capabilities, policy-engine options, existing egress paths and provider metadata; pin versions/distribution. | capability matrix includes providers, direct paths, policy support and unknowns = 0 or explicit BLOCKED. |
| B | Add inference credentials, endpoint ownership, external-data routes, tenant/installation policy ownership and provider assurance to authority/threat inventory. | authority graph shows Hermes/model/router/policy boundaries; secret values remain absent. |
| E | Bind egress policy to verified environment_id and installation/farm scope; prohibit dev/staging/prod cross-wiring. | environment mismatch and scope mismatch fail closed. |
| H | Network/permission policy denies direct provider endpoints except registered Policy Gateway/provider adapters. | direct Hermes/Codex/Qwen-to-unregistered-provider fixtures denied. |
| I | Add deterministic fixtures: allow, deny, redact, local/private only, unknown->DEFER, fallback non-widening, raw-log redaction. | evidence capsule matches actual policy decision; false allow = 0. |
| J | Add protected Inference & Data Egress Policy, provider assurance registry and policy-change review to Reviewer SOT. | Implementer cannot self-modify or self-approve platform minimums/provider allow-list. |
| K | Model Router receives only Allowed Provider Set; routing may optimize quality/cost/latency but cannot add providers. | router parity and non-widening fallback tests pass. |
| L | Treat Qwen/local runtime as a registered provider adapter with assurance metadata; local is not implicitly trusted. | auth/fixed-schema/redaction/timeout DEFER and no unrestricted LAN path. |
| M | Replay identical requests across agents/providers; seed bypass, reclassification, prompt injection, exfiltration and fallback-widening attacks. | critical egress violation recall 100%; unsafe allow 0; policy parity explained. |
| N | Include policy/provider hashes, egress decision contract, DCR result, Development Memory candidate, Roadmap Update Proposal and Session Bootstrap in closure/resume lock. | post-Day150 source bootstrap contains exact hashes; resume target remains Day151. |

## New artifacts

```text
inference-data-egress-policy.yaml
provider-assurance-registry.yaml
inference-egress-decision.schema.json
egress-policy-fixtures/
egress-policy-evidence/
post-day150-source-bootstrap.md
```

## Runtime enforcement gate

Authority documentation can be activated before implementation, but no new/expanded production external-inference route may be enabled until `IEG-RUNTIME-READY` passes:

```text
verified scope
canonical classification
purpose policy
provider assurance
registered adapter only
direct bypass impossible
fallback non-widening
redacted audit
safe local/private/DEFER path
```

## Rollback

- Candidate amendment rollback: revert docs-only R2 candidate to R1; no runtime/DB rollback required.
- EF-1 implementation rollback: disable policy/router integration and retain current manual provider path only if it is separately inventoried and permitted; otherwise fail closed.
- Production remains unchanged during EF-1.
