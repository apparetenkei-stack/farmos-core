# Day150.5-C Final Reconciliation and R4.11 Success Evidence

Status: `FINAL_SOL_PASS__READY_FOR_PUBLICATION`

Scope: Day150.5-C only. C discovers, classifies, and registers reconciliation
work. Day150.5-D owns reproducible database baseline and reconciliation
implementation. No SQL was executed by Core reconciliation; no production
repair, apply, reset, or `db push` was performed.

## 1. Active C authority

The active C composition is bound to the post-activation state recorded by the
Day150.5-A entry baseline:

- Canonical Master Roadmap v5.0 R2: `sha256:c496b1fdb192c3fcdd974ccce5f4d2b660aa53e1ea345e33c915149f8a5090b6`, `ACTIVE`.
- Current-state/resume authority: `sha256:a61729d7985c72404e86be333042928f8adf08f0db866d6ac992963571ce43ea`, `VERIFIED`; Day151 remains `BLOCKED_UNTIL_EF1_RESUME_LOCK`.
- EF-1 v1.0: `sha256:c58b52c48fb1c6fa49213a4d57b2187da30187fa7230c6e2e381bfb898c5e546`, approved primary authority.
- Approved EF-1 v1.1: `sha256:87060e0f03331539cc4e78ffb872d8bc95f12c69b8c115abdd9685b9b6cdc070`.
- Active R2/v1.2 overlay as recorded by A: `sha256:9c45ae7c07b3c0d5b3a5dc96ac22e826f5c126ccaec50d1c0cbf0eb7b1ec2aaf`.
- Day150.5-A completion authority: `artifacts/day150-5/ef1-a/ef1-entry-baseline.json`.
- Day150.5-B completion authority: `artifacts/day150-5/ef1-b/authority-graph.yaml`.

The C exit contract is therefore discovery/classification/ownership evidence
only. It does not import D's replay or repair implementation requirements.

## 2. Retained successful primary evidence

The retained R4.11 execution root is:

`r4-11-session-pooler-production-execution-20260822T065537Z`

The independently reproducible evidence chain is:

`APPROVED QUERY CONTRACT -> TARGET BINDING -> EXECUTION JOURNAL -> QUERY SUCCESS -> SANITIZED RESULT -> FINAL AUDIT -> MANIFEST`

Bindings retained in `artifacts/day150-5/ef1-c/evidence-provenance.json`:

- Query ID: `day150_5_c_catalog_metadata_snapshot_v1`.
- Query SHA-256: `3d5a37ace1be8238baa139d97ef8898f63d65588274dec33489472a26181e87d`.
- Session Pooler target verification: `PASS`.
- Result SHA-256: `e59d5276bec6afe2b1ae71dfd14e321b63c5dfd2792af70caba053c4a92cb7a8`.
- Final audit SHA-256: `ea2c2368c2d97fb13006ba4f3155ad0baf853001e18c08f979a97e886fd27e57`.
- Journal SHA-256: `dbb3e309f974ae028ab824c4f4248578938d65fb0857fee9ffcf0c605a5614f9`.
- Execution manifest SHA-256: `7b0f8edfc3980646480d5df54c5621ee75ae2a0f9b946015f52d756a0d6787d5`.
- Query result contract: `DAY150.5-C/1.0`.
- PostgreSQL: `17.6`.

The exact successful counters are connection attempts/successes `1 / 1`,
approved query calls attempted/succeeded `1 / 1`, five approved SQL statements
(`BEGIN`, `SET`, `SET`, `SELECT`, `ROLLBACK`), unexpected statements `0`,
retry/reconnect `0 / 0`, result validation `PASS`, and final journal event
`EXECUTION_COMPLETED / SUCCESS`. Production DDL, DML, migration mutations,
business-row reads, and credential-value exposure are all `0`.

## 3. Migration identity and SQL-body dual SOT

Production migration history is the `EXECUTED_MIGRATION_IDENTITY_SOT`: it
establishes executed migration identity/version only. Git timestamp migration
files are the `MIGRATION_SQL_BODY_SOT`: they retain authoritative SQL source
bodies. Production SQL-body equality is `NOT_ESTABLISHED`; no equality claim is
made from identity-only history.

- Production executed migration identities: `19`.
- Git timestamp migration SQL sources: `24`.
- Exact identity overlap: `19`.
- Git-only: `5`.
- Production-only: `0`.
- `migration_identity_mismatch_count`: `0`.
- Order anomalies: `0`.
- Duplicates: `0`.
- Unsupported SQL-body equality claims: `0`.

The five Git-only identities are each registered in the reconciliation register
with a Day150.5-D owner and Product Owner approval requirement:

| Identity | Classification | Reconciliation | Later treatment |
| --- | --- | --- | --- |
| 20260724000001 | `HISTORICAL_SOT_DIVERGENCE` | `C-RECON-GIT-ONLY-20260724000001` | approved D identity/body/effect proposal; no C apply or repair |
| 20260724000002 | `HISTORICAL_SOT_DIVERGENCE` | `C-RECON-GIT-ONLY-20260724000002` | approved D identity/body/effect proposal; no C apply or repair |
| 20260724000003 | `HISTORICAL_SOT_DIVERGENCE` | `C-RECON-GIT-ONLY-20260724000003` | approved D identity/body/effect proposal; no C apply or repair |
| 20260724000004 | `HISTORICAL_SOT_DIVERGENCE` | `C-RECON-GIT-ONLY-20260724000004` | approved D identity/body/effect proposal; no C apply or repair |
| 20260724000005 | `HISTORICAL_SOT_DIVERGENCE` | `C-RECON-GIT-ONLY-20260724000005` | approved D identity/body/effect proposal; no C apply or repair |

## 4. Timestamp-external SQL

The active C taxonomy is fully classified: `A=0`, `B=6`, `C=0`, `D=2`,
`unclassified=0`. Every row in
`artifacts/day150-5/ef1-c/legacy-sql-classification.csv` binds path/name,
classification, evidence basis, Production relationship, migration-history
relationship, future treatment, owner, reconciliation ID, approval boundary,
and whether later mutation is required. B rows use
`C-RECON-B-LEGACY-REPRESENTATION`; D rows use
`C-RECON-D-LEGACY-TREATMENT`.

## 5. App-owned fingerprint and R4.11 metadata difference

The previous app-owned fingerprint is
`a11ff4532126c06d3c90c8548ff121e0494876f4e1365da6ed51468a40bd1cd1`.
R4.11 reproduces the same fingerprint under the same `public`-schema ownership
and category-canonicalization basis. Direct comparison is established;
unexplained app-owned drift count is `0`.

A deterministic safe comparison was performed between the earlier sanitized
result (`sha256:5891a37a378dccb68ca793f48e145d5a9d6842306bb2b1bf7e153e4ccbc0dcd7`)
and the R4.11 result. Counts are identical, but the payloads are not
byte-equivalent or semantically identical. Five semantic array differences are
present:

| Metadata path | Exact observed difference | Classification |
| --- | --- | --- |
| relations | `realtime.messages_2026_08_18` -> `realtime.messages_2026_08_25` | `MANAGED_OR_PLATFORM_METADATA_DRIFT` |
| columns | partition columns for the same managed relation changed with the suffix | `MANAGED_OR_PLATFORM_METADATA_DRIFT` |
| constraints | partition constraints for the same managed relation changed with the suffix | `MANAGED_OR_PLATFORM_METADATA_DRIFT` |
| indexes | partition indexes for the same managed relation changed with the suffix | `MANAGED_OR_PLATFORM_METADATA_DRIFT` |
| grants | grants for the same managed relation changed with the suffix | `MANAGED_OR_PLATFORM_METADATA_DRIFT` |

There are zero execution-context metadata differences, zero ordering or
serialization-only differences, zero app-owned metadata differences, and zero
unexplained app-owned drift. The managed/platform transition is explained and
registered as `C-RECON-R4-11-MANAGED-METADATA-DRIFT`; it does not authorize a
production change.

## 6. Non-DB environment inventory

All eight required categories are inventoried without inventing configuration
facts. Each status has evidence source, confidence, current owner,
reconciliation owner, reconciliation record, and future gate in
`environment-manifest.draft.yaml`.

| Category | Status | Record | Future gate |
| --- | --- | --- | --- |
| Auth provider configuration | `NOT_ESTABLISHED_FROM_RETAINED_EVIDENCE` | `C-RECON-NONDB-AUTH-PROVIDER` | Day150.5-D |
| Storage buckets | `NOT_ESTABLISHED_FROM_RETAINED_EVIDENCE` | `C-RECON-NONDB-STORAGE-BUCKETS` | Day150.5-D |
| Storage policies | `NOT_ESTABLISHED_FROM_RETAINED_EVIDENCE` | `C-RECON-NONDB-STORAGE-POLICIES` | Day150.5-D |
| Edge Functions | `NOT_ESTABLISHED_FROM_RETAINED_EVIDENCE` | `C-RECON-NONDB-EDGE-FUNCTIONS` | Day150.5-D |
| Edge Function secret presence/metadata | `NOT_ESTABLISHED_FROM_RETAINED_EVIDENCE` | `C-RECON-NONDB-EDGE-SECRET-METADATA` | Day150.5-D |
| Realtime | `REQUIRES_LATER_VERIFICATION` | `C-RECON-NONDB-REALTIME` | Day150.5-D |
| cron | `NOT_ESTABLISHED_FROM_RETAINED_EVIDENCE` | `C-RECON-NONDB-CRON` | Day150.5-D |
| webhooks/integrations | `NOT_ESTABLISHED_FROM_RETAINED_EVIDENCE` | `C-RECON-NONDB-WEBHOOKS` | Day150.5-D |

Secret values were not read or exposed. This is truthful inventory and
ownership, not implementation of later controls.

## 7. Owned reconciliation records

The narrow register contains `16` records: five Git-only migration identities,
one B-class, one D-class, one R4.11 managed metadata drift, and eight non-DB
verification dependencies. Every record binds finding, evidence, owner, target
subday/gate, proposed treatment, later mutation status, human approval, and
current status. All are proposal/verification records only; no treatment was
performed.

## 8. C/D boundary and operation truth

C completed discovery, classification, safe comparison, evidence retention
binding, and reconciliation registration. D remains responsible for any
reproducible database baseline, migration-chain reconciliation, Git-only
treatment, B/D SQL treatment, or other implementation. C did not repair
migration history, apply SQL, run `db push`, reset production, create schema
changes, or perform fresh replay implementation.

| Operation | Count |
| --- | ---: |
| Production DDL | 0 |
| Production DML | 0 |
| Production migration mutations | 0 |
| `db push` | 0 |
| Migration repair | 0 |
| Production reset | 0 |
| Business-row reads | 0 |
| Credential-value exposure | 0 |
| Core reconciliation production connections | 0 |

## 9. C exit gate

The deterministic gate asserts: successful primary evidence is retained and
hash-bound; execution reproducibility passes; both migration SOTs are explicit;
unsupported SQL-body equality claims are zero; timestamp-external SQL is fully
classified; all five Git-only identities are owned; Production-only is zero;
app-owned drift is zero; all non-DB categories are inventoried; all unknowns
have owners and records; and all production mutation/read/secret counters are
zero; the final independent Sol review is recorded below.

## 10. Final independent Sol review

Exactly one new `farmos_sol_reviewer` reviewed active Day150.5-C only:

- P1: `0`.
- P2: `0`.
- GO: `YES`.
- Prior finding 1, primary evidence retention: `CLOSED`.
- Prior finding 2, dual migration SOT and unsupported equality claim: `CLOSED`.
- Prior finding 3, non-DB inventory and owned records: `CLOSED`.
- Day150.5-D requirements were not imported; no production mutation occurred.
