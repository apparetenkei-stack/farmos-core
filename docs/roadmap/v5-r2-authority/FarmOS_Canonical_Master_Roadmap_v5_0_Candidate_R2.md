# FarmOS Canonical Master Roadmap v5.0 Candidate - Revision R2

# 14. Canonical Master Roadmap Candidate

> Base revision decision: **APPROVE WITH REVISIONS** (Product Owner, 2026-08-09).
> R2 consultant determination: **ADOPT_IN_CANDIDATE** for Inference & Data Egress Governance (2026-08-11).
> Activation remains prohibited until M0 verification, final gate review, and explicit human activation approval.

## 14.1 Document Authority

- Document status: **CANDIDATE_R2**.
- Route decision: **ROUTE B - New Canonical Major Version Route = APPROVED_DIRECTION**.
- Candidate name: **FarmOS Canonical Master Roadmap v5.0 Candidate = APPROVED**.
- Activation status: **HUMAN_APPROVAL_REQUIRED** and `CANONICAL_MASTER_ROADMAP_ACTIVE = false`.
- The Product North Star, existing Day numbering, Day151-220 product order and Day220 target are **frozen and unchanged** by this revision.
- The v5.0 major-version reason is not a product-roadmap redesign. It elevates Source Registry, Decision Ledger, Day Completion Record, Development Memory, Supersession Registry, Current State Lock, and Agent/Model independence into first-class authority structures. R2 adds **Inference & Data Egress Governance** as a first-class extension of Agent/Model independence and production-authority boundaries; this does not redesign the product roadmap or change the approved major-version rationale.
- The legacy roadmap authority is temporarily classified as:

```text
ACTIVE_LEGACY
CONTENT_VERIFICATION_PENDING
MUTATION_FROZEN
```

- The uploaded v4.0 Draft is `DRAFT_SOURCE_MATERIAL` and must never substitute for the exact legacy active artifact.
- Current-position claims are `PROVISIONAL_VERIFIED_FROM_AVAILABLE_SOURCES` until M0 reads the live repositories and exact roadmap/coordination artifacts.
- This candidate does not modify code, database schema/data, credentials, production runtime, release state, or roadmap authority.
- The R2 egress amendment is included as a **candidate authority amendment**. It becomes active only through explicit Product Owner approval of the exact R2 artifact hashes.
- Authority precedence remains: safety/data-loss prevention -> current Product Owner instruction -> CHARTER/approved ADR/contract -> verified active roadmap/current-state lock -> approved Day specification -> implementation convenience.

## 14.2 North Star

Build an **Agricultural Knowledge OS** that connects verified farm facts, operational memory, scenarios, decisions, outcomes, knowledge, sales, risk and succession so humans make faster, more accurate and more profitable decisions. At Day220 it operates as an **Agricultural Chief-of-Staff & Farm Succession OS**, not as an unaccountable autonomous farm owner.

## 14.3 System Boundaries

| Bounded context | Owns | Must not own/do |
| --- | --- | --- |
| Farming Application | Operational facts, work records, active sessions, fields, crop cycles, people, resources, inventory transactions, plans/assignments, approval UI, execution results | AI inference/knowledge SOT; direct exposure of Core secrets |
| FarmOS Core | Observation, Attention, Projection, Proposal, Knowledge, Policy, Audit, Digital Twin, Decision Intelligence, provenance/freshness | Competing app business SOT; direct business/external execution |
| Sales / Commerce | Product/order/customer/price/shipment/sales result/fees/margin truth | Production facts mixed into sales tables; AI-only confirmation |
| Farm Web / Brand / Content | Public projection, brand rules, content drafts, review and publishing history | Internal DB direct connection; unapproved publication; breaking existing URLs/SEO |
| Execution Gateways | Only human-approved typed commands, idempotency, result, retry/compensation | Free inference, Proposal creation, arbitrary URL/credential selection |
| Inference Policy Gateway | Deterministic classification/purpose/tenant-installation/provider policy evaluation, redaction obligations, Allowed Provider Set and egress-decision evidence | Business advice, classification invention, unrestricted provider selection, model routing, business truth |
| AI Runtime / Worker | Replaceable inference execution and structured result | Business truth, policy activation, self-approval, egress authorization |
| Development Coordination Plane | Charter, glossary, SOT map, contracts, handoffs, ADRs, integration evidence, roadmap/supersession records | Production business data, secrets, second domain SOT, production-write capability |

## 14.4 Non-Negotiable Architecture Invariants

- AI output is candidate/advice until human-reviewed and, where applicable, executed by a governed gateway.
- No AI direct write to farming-app, Sales or external services.
- Preview, Proposal, Approval Intent, Review Decision, Command, Apply Result and Business Fact remain distinct.
- Candidate/active separation and append-only lineage are preserved.
- Zero, not fetched, unavailable, unauthorized, failed and stale are distinct.
- Missing values are not inferred into confirmed facts.
- Runtime, model and agent framework are replaceable; Knowledge/Policy/Domain remain FarmOS-owned.
- **Policy Before Inference:** every external or local inference request passes a deterministic Inference Policy Gateway before provider selection.
- **Hermes Has No Egress Authority:** Hermes may propose sensitivity/purpose/provider candidates but cannot authorize transmission or expand the Allowed Provider Set.
- **Cloud-enabled, policy-governed / local-resilient:** policy-eligible workloads may use cloud providers, while basic farming operations remain available without cloud AI and restricted workloads can use approved local/private paths or safe DEFER.
- Provider fallback must never silently widen data egress, retention, training-use, residency or tenant-policy permissions.
- Unknown data classification, purpose, tenant/installation scope or provider assurance denies external egress and routes only to an explicitly allowed local/private path or DEFER.
- Core failure does not stop basic farming-app operations.
- Secrets never enter clients, prompts, URLs, fixtures, handoffs or evidence.
- Unknown authority, contract mismatch or stale evidence fails closed.
- Production activation always requires human approval and rollback evidence.

## 14.5 Source of Truth Map

| Question | Canonical source |
| --- | --- |
| What is implemented? | Git commit, executable code, migration history, deterministic tests and release evidence. |
| What was approved? | Current Product Owner decision, CHARTER, approved ADR/contract and active roadmap. |
| What is the next Day? | Active canonical roadmap + current-state record + predecessor completion gate. |
| What happened in a Day? | Structured Day Completion Record linked to Git/test evidence. |
| Why was a decision made? | Decision Ledger / ADR / approved Development Memory object. |
| What is farm business truth? | The owning business bounded context, not chat memory or agent memory. |
| What classifies a data field? | Canonical classification taxonomy plus field/schema metadata approved by the owning bounded context; Hermes suggestions are candidates only. |
| Who owns inference/egress policy? | FarmOS platform minimum policy + tenant/installation policy + purpose policy + provider assurance registry, all versioned and human-approved. |
| What proves an inference was permitted? | Immutable egress-decision evidence: policy hash, verified scope, purpose, classification, redaction obligations, provider selected and reason codes - without raw sensitive payload. |
| What is derived/rebuildable? | Projection, vector index, model output, display view and runtime memory. |

## 14.6 Current Position

**Verification state:** `PROVISIONAL_VERIFIED_FROM_AVAILABLE_SOURCES`.

| Field | Candidate determination | Promotion requirement |
| --- | --- | --- |
| Last formally completed | Day149 | M0 must verify exact Core HEAD, remote main, completion evidence and repository state. |
| Current active Day | Day150 | M0 must verify exact Day150 branch/HEAD, evidence set and relevant Core/App working state. |
| Day150 state | ACTIVE_BLOCKED | M0 must confirm the PostgreSQL bootstrap authority state and current blocker wording. |
| Day150.5 | APPROVED_NOT_STARTED | Start remains prohibited until Day150 formal closure. |
| Next product Day | Day151 | Only after EF-1 v1.1 closure and resume-lock verification. |

Candidate progression:

```text
M0 exact read-only verification
  -> Current Position = VERIFIED
  -> v5 activation final gate and explicit human approval
  -> Day150 formal closure
  -> Day150.5 EF-1 v1.1 A-N
  -> roadmap-resume-lock verification
  -> Day151 resume
```

M0 verification may establish that the live state differs from this candidate. In that case, the candidate is revised; the repository is not reinterpreted to fit the roadmap.

## 14.7 Completed Milestones

Milestone history is the Day Timeline Ledger in section 4. Completion status must not be upgraded beyond its evidence confidence. Day147–149 are the strongest recent formal baseline.

## 14.8 Current Engineering Foundation

Day150.5 EF-1 is an approved temporary Engineering Foundation, not a product feature sequence. The approved **v1.1 Amendment** integrates Spec Kit, Development Memory and Day Completion Record into EF-1 itself; no separate post-EF `DC-1` gate is created. R2 adds an **EF-1 v1.2 Composite Amendment Candidate** for Inference & Data Egress Governance. It is not a new Day, does not alter A-N ordering, and remains human-approval-gated.

`Development Control` remains a logical cross-cutting namespace implemented through the following EF-1 SubDays:

| EF-1 SubDay | v1.1 integrated responsibility |
| --- | --- |
| A | Spec Kit Core qualification, capability check and exact version pin; record tool/runtime availability in the entry baseline. |
| I | Integrate `Spec -> Plan -> Tasks -> Analyze -> Implement -> Converge` with the Autonomous Evidence Loop and deterministic completion states. |
| J | Independent Reviewer / Governance validates scope, authority, evidence, Spec Kit artifacts and completion claims. |
| M | Agent portability and Shadow parity prove that task packages, evidence and review contracts are not bound to one model/agent runtime. |
| N | Generate Day Completion Record candidate, Development Memory candidate, Roadmap Update Proposal and Session Bootstrap; verify resume lock and close EF-1. |

The v1.2 candidate overlays egress controls across existing SubDays without adding a new blocking stage: A provider/policy capability baseline; B egress authority/threat inventory; E environment-specific egress identity; H direct-provider network deny; I deterministic allow/deny/redact/local/defer fixtures; J protected policy governance; K router constrained to the Allowed Provider Set; L local-provider assurance; M provider/agent parity and bypass attacks; N policy hashes in DCR, Development Memory, Roadmap Update Proposal, Session Bootstrap and resume lock.

EF-1 continues to establish environment separation, authority inventory, reproducible migrations, branch/release protection, runtime isolation, least privilege, evidence collection, independent review, model routing, Qwen shadow, parity testing, release runner and recovery drills. It performs **no production DB/data write and no production release**.

## 14.9 Remaining Day Roadmap

| Day | Objective | Completion outcome |
| --- | --- | --- |
| 151 | Canonical Entity Reference & Unit Registry v1 | field/crop/crop-cycle/material/machine/person and kg/L/ha/time exact parser |
| 152 | Data Quality / Freshness / Coverage Ledger | source update time, missing, count, unit and identifier mismatch visibility |
| 153 | Work Item Input Profile Contract | none/single/multiple location and hidden/optional/required resource profiles |
| 154 | Dynamic Mobile Input UI | required-first, optional collapsible, category inheritance and override |
| 155 | Material / Machinery Usage v1 | none/unconfirmed/not-applicable/recorded distinctions; units and inventory/maintenance references |
| 156 | Offline Queue & Idempotent Sync | retry, duplicate, stale device, conflict and cancellation safety |
| 157 | Voice / Photo / OCR Draft Intake | raw preservation, extraction candidate, confidence, source reference, human correction, business write zero |
| 158 | Information Gap Registry | missing fact, reason, decision impact, owner, deadline, evidence and lifecycle |
| 159 | Value-of-Information Question Task | only high-value questions that can change a decision and cannot be answered from existing evidence |
| 160 | Operational Advisory v1 Gate | five-business-day evidence, input load, gaps, duplicates, offline and projection SLA |
| 161 | Crop Cycle / Season Normalization | summer/winter/continuous/multi-harvest; planned/approved/actual |
| 162 | Field State Twin v1 | area, condition, accessibility, soil observations, recent work, crop state, freshness |
| 163 | Crop / Lot State Twin v1 | sowing, nursery, transplant, growth, harvest, quality, lot and forecast range |
| 164 | Resource Twin v1 | inventory, machinery use/maintenance, workforce availability/capability/load |
| 165 | External Observation Adapter Contract | weather/sensor/API time, location, unit, quality, license and failure |
| 166 | Scenario Snapshot / Clone Contract | isolated assumptions, horizon, baseline and version without production mutation |
| 167 | Workload & Schedule Scenario | 7/30-day work, people, machinery and field conflicts |
| 168 | Compost / Amendment Scenario | next crop, access, past season, volume, delivery/application/incorporation separation |
| 169 | Harvest / Sales Scenario | 7/30-day harvest range, grade, sales constraints, surplus/shortage and margin range |
| 170 | Farm Digital Twin Gate | lineage, scenario isolation, uncertainty, recomputation and UI comparison |
| 171 | Farm Objective Policy v1 | profit, cash, safety, quality, soil, law, workload, trust and continuity priorities/constraints |
| 172 | Proposal Envelope v2 | basis, objectives, alternatives, counterevidence, uncertainty, gaps and expiry |
| 173 | Decision Feedback Ledger | approve/reject/revise/partial/conditional with actor, scope and context |
| 174 | Conditional Approval Contract | conditions, evidence, expiry, re-evaluation and reauthorization |
| 175 | Proposal → Command → Actual → Outcome Link | correlation across cost, time, yield, quality and sales outcome |
| 176 | Forecast Error & Calibration Registry | point/range forecasts, actuals, error, coverage, model/rule/LLM contribution |
| 177 | Experiment / Backtest Registry | hypothesis, comparison, intervention, counterexample, causal-claim level and scope |
| 178 | Proactive Attention Policy | immediate/daily/defer, repeat interval, question budget and expected-loss threshold |
| 179 | Decision Memory & Observer Candidate | candidate-only recurring decisions with counterexamples, scope, expiry and stop conditions |
| 180 | Adaptive Advisory Loop Gate | gap→question→proposal→decision→execution→outcome→memory candidate E2E |
| 181 | Source Authority Registry | issuer, version, date, license, freshness and confidentiality |
| 182 | Verified Knowledge Object v1 | raw/extracted/candidate/reviewed/verified/superseded with provenance |
| 183 | Human Correction & Citation UI | original comparison, correction, partial approval and cited location |
| 184 | SOP / Playbook Builder | normal steps, prerequisites, decision points, prohibitions, stop conditions and capability |
| 185 | Exception & Decision Story Library | why, feared outcomes, alternatives and result—not only what happened |
| 186 | Competency Evidence Matrix | experience, training, supervision need, expiry and evidence; no personality inference |
| 187 | Delegation & Escalation Matrix | role/capability/scope/validity, deputy, emergency stop and no self-escalation |
| 188 | Successor Shadow Mode | compare successor and owner decisions on the same evidence |
| 189 | Emergency Continuity Pack | contacts, critical contracts, daily operations, authority, stop/recovery and absence runbook |
| 190 | Knowledge Succession Gate | auditable SOP, exception, competence, delegation, shadow and emergency operation |
| 191 | Sales Operational Projection | product, variant, customer, order, shipment, fee, shipping and sales result |
| 192 | Procurement & Inventory Planning | order candidate, lead time, minimum stock, supplier, receipt and substitute |
| 193 | Cost Attribution v1 | labor, material, machinery, logistics and packaging by crop cycle/field/crop |
| 194 | Gross Margin & Cash Commitment | margin range, payables/receivables, locked cash and explainable assumptions |
| 195 | Machinery Maintenance & Asset Lifecycle | operation, fuel, service, failure, parts, replacement and downtime risk |
| 196 | Annual Integrated Plan | crop, harvest, sales, workforce, material, machinery and cash scenarios |
| 197 | Compliance & Farm Risk Register | Organic JAS, pesticide, labor, safety, contract, weather, supply, owner and mitigation |
| 198 | Brand / Public Projection v1 | publishable farm/product/crop data, existing site preview, approval and rollback |
| 199 | Executive Dashboard & Weekly Board Brief | profit, cash, workload, stock, harvest, sales, major risks and decisions |
| 200 | Executive Operations Gate | production-sales-cost-cash-risk-public projection with authority E2E |
| 201 | Adapter Registry & Data Sharing Policy | originator, purpose, scope, retention, revocation, export and third-party access |
| 202 | WAGRI Read Adapter Pilot | one high-value bounded read with freshness/license/failure |
| 203 | Official Agronomic / Regulatory Source Adapter | versioned effective-date primary sources |
| 204 | ADAPT-compatible Import/Export Subset | limited field-operation/reference/geospatial mapping with evidence |
| 205 | OGC SensorThings Observation Adapter | one sensor type mapped to Thing/Location/ObservedProperty/Datastream |
| 206 | Generic Machine / CSV Import | vendor formats to canonical candidate observation |
| 207 | Sales External Gateway Pilot | one low-risk draft operation, preview, confirmation and idempotency |
| 208 | Publishing or Notification Gateway Pilot | one medium/operation with final recipient/content/time/scope confirmation |
| 209 | External Result & Compensation | external id, retry, rate limit, cancel, correction and correlation |
| 210 | Interoperability & Portability Gate | full export, adapter shutdown, third-party revocation, re-import and audit |
| 211 | Advisor Evaluation Suite | supported claims, citations, tool accuracy, abstention, unsafe action and stale handling |
| 212 | Business Outcome KPI | time, rework, stock loss, calibration, accepted outcome, avoided loss and regret |
| 213 | AI / Tool / Document Red Team | prompt/tool injection, malicious OCR, exfiltration and self-escalation |
| 214 | Model & Runtime Replacement Drill | same fixtures through alternative adapter without domain migration |
| 215 | Backup / Restore / Full Export | DB, objects, vectors, knowledge, policy, audit, website and secret metadata |
| 216 | Offline / Degraded / AI-down Operation | work recording, review, emergency contact and confirmed-data access continue |
| 217 | Load / Observability / SLO | 10–20 users, queue, latency, failure, cost, GPU/CPU and alerts |
| 218 | Chaos & Incident Drill | Core, DB, worker, network, model, external API, wrong publish and duplicate command |
| 219 | 7-day Owner-absence Pilot & Handover | proxy manager uses SOP/authority/Hermes; emergency-only escalation |
| 220 | Agricultural Chief-of-Staff & Farm Succession OS v1 Gate | all canonical state, advisory, succession, ERP, interoperability, security, recovery and handover gates pass |

### R2 cross-cutting governance overlay (no Day renumbering or objective-order change)

The Day151-220 product table above is byte-preserved from R1. Inference & Data Egress Governance is implemented as a cross-cutting acceptance overlay:

- **Day181 Source Authority Registry:** classification/confidentiality metadata becomes source-linked and reviewable.
- **Day201 Adapter Registry & Data Sharing Policy:** expands the already scheduled data-sharing policy into provider assurance, retention/training-use, residency, revocation, BYOK/customer-owned-provider and third-party inference controls. Day201 is not the first protection point; the v5 authority principle applies from activation.
- **Day213 AI/Tool/Document Red Team:** includes policy bypass, data exfiltration, malicious reclassification, direct-provider access and fallback-widening attacks.
- **Day214 Model & Runtime Replacement Drill:** replacement must preserve identical egress decisions and may only route within the same Allowed Provider Set.
- **Day216 Offline / Degraded / AI-down Operation:** validates cloud outage behavior, approved local/private paths and safe DEFER while basic farming-app operations continue.
- **Day220 Gate:** adds `inference_data_egress_governance_valid`, `policy_before_inference_valid`, `tenant_purpose_provider_policy_valid`, `hermes_egress_authority_zero`, `provider_fallback_non_widening_valid` and `cloud_ai_down_local_resilience_valid`.

## 14.10 Dependencies

```text
Available-source reconciliation evidence
  -> M0 exact live-repository verification
  -> VERIFIED Current State + exact legacy roadmap artifact/hash
  -> v5 activation final gate + explicit Product Owner approval
  -> docs-only v5 activation (does not complete or mutate Day150)
  -> Day150 PostgreSQL compatibility authority + qualification
  -> Day150 formal closure
  -> Day150.5 EF-1 v1.1 A-N + v1.2 egress overlay (explicit approval required before execution)
       A: Spec Kit qualification/version pin + provider/policy capability baseline
       I: spec-plan-tasks-analyze-implement-converge + evidence loop
       J: independent review/governance + protected egress policy review
       K: Model Router restricted to Policy Gateway Allowed Provider Set
       M: agent/provider portability, egress parity and bypass/adversarial validation
       N: DCR/Development Memory/Roadmap Proposal/Session Bootstrap + policy hashes
  -> resume-lock verification
  -> Day151 Canonical Entity & Unit foundation
  -> Day160 / 170 / 180 / 190 / 200 / 210 / 220 gates
```

There is no separate `DC-1` product Day, Engineering SubDay, or post-EF blocking gate.

## 14.11 Day Completion Standard

A Day is complete only when Business Outcome, contract, implementation, deterministic tests, failure behavior, authority boundary, secret/write checks, rollback and next dependency are evidenced. A roadmap statement alone cannot complete a Day.

## 14.12 AI / Agent Governance

- Implementer and Reviewer are independent identities/contexts.
- Deterministic gates run before LLM review.
- Qwen/local models are advisory/shadow unless separately activated; no production authority.
- Agent may create candidates and evidence requests; it may not activate policy, knowledge, roadmap or production state.
- All specialized agents use typed contracts and bounded capabilities rather than unrestricted mutual chat.
- Provider selection is two-stage: the deterministic Inference Policy Gateway computes the Allowed Provider Set; the Model Router selects only within that set.
- Hermes may emit `sensitivity_candidate`, `purpose_candidate` and `provider_recommendation`, but those fields never authorize egress.
- Local is not automatically trusted. Local/private providers still require authenticated adapters, fixed schemas, least privilege, redaction rules and auditable provider assurance metadata.

## 14.13 Human Approval Boundaries

Product Owner approval remains mandatory for roadmap activation, bounded-context/SOT changes, breaking contracts, migrations/RLS/roles/auth, production data/release, external execution, charter changes and any self-improvement activation. It is also mandatory for platform-minimum egress policy, classification taxonomy changes, tenant/installation policy activation, provider allow-list/assurance changes, BYOK/customer-owned-provider activation and any exception that would permit C3/RESTRICTED data to leave an approved private boundary.

## 14.14 Production Authority Boundaries

Only a dedicated Release Runner / Execution Gateway may access production credentials after human approval. Development agents cannot directly connect to or mutate production. Day150.5 explicitly keeps production write and release at zero. Inference credentials are similarly isolated behind registered provider adapters; no browser, Hermes agent or model may choose arbitrary endpoints or credentials. An egress permission is not equivalent to a production-write permission, and neither implies the other.

## 14.15 Development Control

Development Control is a **logical cross-cutting namespace**, not a new product Day and not a blocking stage between Day150.5 and Day151. Its approved implementation location is EF-1 v1.1:

- A: qualification/version pin and capability baseline.
- I: autonomous development/evidence convergence loop.
- J: independent reviewer and governance.
- M: agent/runtime portability and parity.
- N: DCR, Development Memory, Roadmap Update Proposal and Session Bootstrap.

It covers task classification, authority/scope lock, Spec Kit orchestration, evidence collection, independent review, completion-state machine, release proposal, rollback and audit. R2 extends this logical namespace with versioned inference policy, provider assurance registry, egress-decision fixtures and policy-change review. It does not own farm business truth and cannot activate roadmap, production, policy or knowledge by itself.

## 14.16 Spec Kit Relationship

Spec Kit is integrated through EF-1 v1.1 rather than activated by a separate `DC-1` gate.

```text
Canonical Master Roadmap + VERIFIED Current State
  -> Human-approved Day Specification
  -> EF-1-qualified and version-pinned Spec Kit
  -> Spec
  -> Plan
  -> Tasks
  -> Analyze
  -> Implement
  -> Converge
  -> Autonomous Evidence Loop
  -> Independent Review
  -> Day Completion Record Candidate
  -> Roadmap Update Proposal
  -> Human / Governance Approval
  -> Canonical update
```

Spec Kit is a planning and execution-structuring compiler, not roadmap authority. It cannot expand scope, relax invariants, redefine SOT, approve itself, mark a Day complete without evidence, or write production state.

## 14.17 Development Memory Relationship

Development Memory is produced and validated within EF-1 v1.1, primarily at SubDay N, using evidence collected through I and governance from J/M. It stores structured, source-linked candidate/approved knowledge about design decisions, failure patterns, operational lessons and reusable procedures.

It must separate:

- conversation memory,
- user preference,
- implementation evidence,
- approved architecture/policy,
- and farm business facts.

It must not duplicate raw Git diff, silently become business or roadmap authority, or activate a lesson without the required approval state.

## 14.18 Day Completion Record

The Day Completion Record is an EF-1 v1.1 SubDay N output built from deterministic evidence collected by SubDay I and reviewed under J/M.

Required fields include: Day/SubDay ID; canonical roadmap version/hash; Current State Lock; objective/business value; scope/non-goals; baseline commits; changed files; contracts; architecture decisions; Spec/Plan/Tasks identifiers; tests/build; evidence hashes; writes/external operations; failures; rollback; deferred items; superseded designs; next dependency; roadmap impact; reviewer decision; and human approval state.

Automation may generate a DCR **candidate** and Roadmap Update Proposal. It may not mark the Day complete, mutate the canonical roadmap, or promote Development Memory without deterministic validation and the applicable human/governance approval.

## 14.19 Inference & Data Egress Governance

### 14.19.1 Canonical posture

FarmOS adopts **CLOUD_ENABLED_POLICY_GOVERNED / LOCAL_RESILIENT**, not unconditional cloud-first routing.

- Cloud providers may be preferred for policy-eligible workloads when they provide the required quality, availability and cost profile.
- Cloud unavailability must not stop the Farming Application or confirmed operational data access.
- Restricted workloads use an approved local/private/customer-owned provider or return a safe `DEFER`; they do not silently downgrade policy.
- BYOK and customer-owned providers are supported future capabilities, not mandatory for initial activation.

### 14.19.2 Decision contract

```text
Inference Request
  -> verified installation/farm scope
  -> canonical data classification
  -> purpose classification
  -> platform minimum policy
  -> tenant/installation policy
  -> provider assurance + environment policy
  -> redaction/minimization obligations
  -> Allowed Provider Set
  -> Model Router selection inside that set
  -> inference
  -> egress-decision evidence
```

```text
AllowedProviderSet =
  PlatformMinimumPolicy
  INTERSECT TenantOrInstallationPolicy
  INTERSECT PurposePolicy
  INTERSECT DataClassificationPolicy
  INTERSECT ProviderAssurancePolicy
  INTERSECT EnvironmentPolicy
```

The current single-installation architecture derives tenant context from verified installation/farm scope. The client cannot choose a tenant. Future multi-tenant deployments must preserve the same contract with authenticated tenant context.

### 14.19.3 Baseline classification taxonomy

| Class | Meaning | Default external egress posture |
| --- | --- | --- |
| C0_PUBLIC | Approved public or publication-ready data | Eligible when purpose/provider policy permits. |
| C1_INTERNAL | Routine internal operational data without sensitive personal/commercial detail | Tenant policy + minimization required; cloud may be permitted. |
| C2_CONFIDENTIAL | Commercial, employee, customer, financial, location or operationally sensitive detail | Default local/private/BYOK; managed cloud requires explicit approved policy and provider assurance. |
| C3_RESTRICTED | Credentials, authentication material, regulated/high-impact personal data, security controls, protected raw evidence | External egress denied by default; exceptional policy requires explicit human approval and a documented private boundary. |

The taxonomy is canonical, but exact field mappings belong to the owning bounded context and require source-linked review. Hermes classification output remains a candidate only.

### 14.19.4 Hermes non-authority

Hermes may propose:

- `sensitivity_candidate`,
- `purpose_candidate`,
- `provider_recommendation`,
- `redaction_candidate`.

Hermes may not:

- authorize external transmission,
- override canonical field classification,
- weaken tenant/installation policy,
- select a provider outside the Allowed Provider Set,
- or use fallback to widen retention, residency, training-use or disclosure permissions.

### 14.19.5 Failure and fallback behavior

Unknown classification, purpose, scope or provider assurance produces `EGRESS_POLICY_UNRESOLVED`. External egress is denied. Permitted next actions are limited to:

1. use an explicitly allowed local/private provider;
2. redact/minimize and re-evaluate;
3. request human classification/purpose confirmation;
4. return `DEFER` / AI unavailable while core operations continue.

Fallback is quality/availability routing only; it cannot enlarge the permission set.

### 14.19.6 Evidence and privacy

Each inference decision records policy version/hash, installation/farm scope, purpose, highest classification, provider assurance version, redaction/minimization obligations, Allowed Provider Set, selected provider, reason codes, timestamp and correlation ID. Raw confidential payload is not stored in the decision ledger unless separately required and protected by an approved retention policy.

### 14.19.7 Activation and runtime-enforcement gates

- Roadmap authority activation requires exact R2 artifact-hash approval.
- Before any **new or expanded** production external-inference route is enabled, an `IEG-RUNTIME-READY` gate must prove direct-provider bypass is impossible, fail-closed fixtures pass, tenant/installation context is verified, fallback is non-widening, logs are redacted and a safe local/private/DEFER path exists.
- Existing egress routes discovered by M0 are classified and mutation-frozen until their policy enforcement is verified; this candidate does not silently certify them.

## 14.20 Model / Agent Replaceability

FarmOS owns Domain contracts, Knowledge, Policy, Skills, Decision/Evolution Ledger, Current State Lock and Evidence. Runtime adapters translate generic FarmOS development or farm-agent tasks/results.

EF-1 v1.1 SubDay M, extended by the v1.2 candidate, must demonstrate agent/provider portability and Shadow parity for the Spec Kit task package, evidence capsule, reviewer contract, completion-state output and egress decision contract. Replacing a provider must preserve or narrow the Allowed Provider Set; it may never widen policy. No model- or agent-specific memory may become canonical authority. At least one replacement drill must pass by Day214/220 without migrating business knowledge into a vendor-specific memory format.

## 14.21 Rollback / Recovery

- Candidate revision is file-only and leaves all repositories, databases, credentials and production systems unchanged.
- v5 activation, when later approved, is a separate docs-only authority commit with an exact activation manifest and revert target.
- Until activation, legacy v4 authority is mutation-frozen; the v4 Draft upload is never promoted as a substitute.
- EF-1 v1.1 retains its own rollback per SubDay and must return through the exact `roadmap-resume-lock` to Day151.
- Product migrations follow expand/backfill/contract and tested restore paths.
- Candidate state is never destroyed to force active state.
- External operations use compensation/correction with recorded correlation.
- Vector/runtime artifacts remain rebuildable from canonical sources.

## 14.22 Day220 Completion Definition

Day220 requires the v4.0 final gate plus: Farm Web/Brand protections from v3.1; canonical development knowledge operational; roadmap/source/decision/DCR registries consistent; 7-day owner absence; runtime replacement; full export/restore; production/external execution approved-only; zero direct Agent business writes; operator handover; and verified Inference & Data Egress Governance with policy-before-inference, tenant/purpose/provider controls, Hermes egress authority zero, non-widening fallback and cloud-AI-down local/degraded resilience.

## 14.23 Post-Day220 Extension Policy

Use Capability Packs (Advanced Agronomy, Vision/Robotics, Multi-Agent Chief-of-Staff, Full Finance/Corporate Continuity, Multi-Farm Benchmark, Brand/CRM/Demand). States: idea → research_candidate → architecture_candidate → approved_for_roadmap → scheduled → implemented → pilot → operational → suspended/retired/superseded. Completed Day numbers do not change.

## 14.24 Superseded Roadmaps

See the machine-readable `ROADMAP_SUPERSESSION_REGISTRY_Candidate_R2.yaml`. Historical, superseded, draft and source-material roadmaps remain preserved and searchable.

Until v5 activation:

- the exact legacy v4 authority is `ACTIVE_LEGACY / CONTENT_VERIFICATION_PENDING / MUTATION_FROZEN`;
- the uploaded v4 Draft remains `DRAFT_SOURCE_MATERIAL`;
- v5 R2 remains `CANDIDATE_R2` and has no execution authority.

## 14.25 Change Control

Every canonical change requires a Roadmap Amendment Proposal containing reason, benefits, disadvantages, future impact, evidence, migration, rollback and supersession updates. Inference/egress policy changes additionally require affected data classes, purposes, tenant/installation scopes, providers, retention/training-use, residency, redaction, bypass tests and rollback-to-deny behavior. AI may prepare the proposal; only a human/governance approval can activate it.

Before v5 activation, M0 must verify the live repositories, exact legacy roadmap artifact/hash, coordination lock, protected resources and Day150 state. Any mismatch produces a candidate revision, not an automatic repository or roadmap mutation.

# Candidate Status

```text
ROADMAP_RECONCILIATION_COMPLETE
CANONICAL_MASTER_ROADMAP_CANDIDATE_READY
HUMAN_APPROVAL_REQUIRED
CANONICAL_MASTER_ROADMAP_ACTIVE = false
```

Approved direction does not equal activated authority. Activation requires successful M0 verification, the final pre-activation gate, and explicit Product Owner approval of the exact artifact hashes.
