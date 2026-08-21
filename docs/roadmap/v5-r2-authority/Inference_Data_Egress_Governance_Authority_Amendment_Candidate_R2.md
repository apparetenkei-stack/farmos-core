# Inference & Data Egress Governance Authority Amendment - Candidate R2

- Status: `CANDIDATE_AMENDMENT / HUMAN_APPROVAL_REQUIRED`
- Candidate parent: `FarmOS Canonical Master Roadmap v5.0 Candidate R2`
- Date: 2026-08-11 (Asia/Tokyo)
- Product roadmap impact: none; no Day renumbering, no Day151-220 order change, no Day220 target change
- Code/DB/production/credential impact in this revision: zero

## 1. Decision

```text
ROADMAP_REDESIGN_REQUIRED = false
V5_AUTHORITY_AMENDMENT_RECOMMENDED = true
CONSULTANT_DETERMINATION = ADOPT_IN_CANDIDATE
ACTIVE_AUTHORITY = false
```

The proposal is architecturally correct and should be incorporated before v5 activation. It closes a real authority gap between Agent/Model independence and external data transmission.

The wording is refined from unconditional `Cloud-first` to:

```text
CLOUD_ENABLED_POLICY_GOVERNED
LOCAL_RESILIENT
```

Cloud is preferred only after policy permits the workload. Policy, not convenience or Hermes classification, is the authority.

## 2. Why the amendment is needed

Existing R1/v4/EF-1 already provides:

- Proposal First / Human in the Loop;
- direct business-write prohibition;
- agent/model/runtime replaceability;
- fail-closed behavior;
- provider abstraction and Model Router;
- targeted context and prompt minimization;
- an authenticated, fixed-schema local Qwen gateway;
- Day201 Data Sharing Policy.

The gap is that these controls do not yet define a first-class decision for whether a specific data set may be sent to a specific provider for a specific purpose under a specific farm/tenant policy. Day201 is also too late to be the first protection point if cloud inference is used earlier.

## 3. Non-negotiable principles

1. **Provider Independence** - business logic is independent of OpenAI, Qwen, Hermes implementation and future providers.
2. **Cloud-enabled, policy-governed / local-resilient** - eligible workloads may use cloud; basic operations do not depend on it.
3. **Policy Before Inference** - no inference route bypasses the policy gateway.
4. **Hermes Has No Egress Authority** - Hermes proposes labels/recommendations only.
5. **Tenant/Installation-owned Policy** - each farm may be stricter than the platform baseline, never weaker.
6. **Purpose-bound Use** - the same data may be allowed for one purpose and prohibited for another.
7. **Non-widening Fallback** - fallback can only preserve or narrow permissions.
8. **Unknown = deny external egress** - use an approved local/private path, redact and re-evaluate, request confirmation or DEFER.

## 4. Canonical decision

```text
AllowedProviderSet =
  PlatformMinimumPolicy
  INTERSECT TenantOrInstallationPolicy
  INTERSECT PurposePolicy
  INTERSECT DataClassificationPolicy
  INTERSECT ProviderAssurancePolicy
  INTERSECT EnvironmentPolicy
```

The Model Router cannot add providers to this set.

## 5. Baseline classes

| Class | Definition | Default posture |
| --- | --- | --- |
| C0_PUBLIC | Human-approved public/publication-ready data | Cloud eligible when purpose/provider allows. |
| C1_INTERNAL | Routine internal data without sensitive detail | Cloud possible under tenant policy and minimization. |
| C2_CONFIDENTIAL | Customer, employee, financial, commercial, location or operationally sensitive data | Local/private/BYOK by default; managed cloud requires explicit policy. |
| C3_RESTRICTED | Credentials, auth material, security controls, regulated/high-impact personal data, protected raw evidence | External egress denied by default. |

Exact field mappings are not invented by this amendment. They are owned and approved by the relevant bounded context.

## 6. Hermes boundary

Hermes may propose:

```text
sensitivity_candidate
purpose_candidate
provider_recommendation
redaction_candidate
```

Hermes may not produce an authoritative `egress_allowed=true`, choose arbitrary endpoints or override platform/tenant policy.

## 7. Provider assurance

Each provider registration must state, at minimum:

- provider type: managed cloud / private cloud / customer-owned / local;
- authentication and endpoint ownership;
- retention and deletion behavior;
- training/use-of-input behavior;
- residency/jurisdiction;
- encryption and access controls;
- DPA/contract status where applicable;
- BYOK/customer-owned-key support where applicable;
- supported data classes/purposes;
- audit/log redaction behavior;
- availability/fallback characteristics.

`local` is not synonymous with `trusted`.

## 8. Current single-installation compatibility

The current Core architecture binds one installation to one farm scope. For now, `tenant policy` means the verified installation/farm-owned inference policy. Clients cannot supply or switch tenant identity. Future multi-tenant deployment must preserve the same policy contract with authenticated tenant context.

## 9. Audit and evidence

The egress decision ledger records policy hash, scope, purpose, highest classification, provider assurance version, redaction obligations, allowed providers, selected provider, reason codes and correlation ID. Raw sensitive prompt content is excluded unless separately approved and protected.

## 10. Relation to existing Days

No product Day is added or moved.

- EF-1 v1.2 candidate establishes the authority artifacts and deterministic fixtures.
- Day181 anchors source confidentiality metadata.
- Day201 expands provider/data-sharing policy operationally.
- Day213 attacks bypass/exfiltration/fallback widening.
- Day214 proves provider/runtime replacement preserves policy.
- Day216 proves cloud-AI-down degraded operation.
- Day220 requires the egress governance gates.

## 11. Activation boundary

This amendment may be used as `CANDIDATE_SOURCE_MATERIAL` after Day150 completion, but it has no authority until exact-hash human approval and v5 activation.

Before any new or expanded production external inference route is enabled, `IEG-RUNTIME-READY` must pass.
