# FarmOS Low-Risk Candidate Contract Foundation

Day136 establishes `farmos.low-risk-candidate.v1` as a review-only contract for `safe_metadata`, `confirmation_task`, `administrative_memo`, and `crop_plan_review_request`.

Every kind is L1 proposal/candidate write only. Human review is required. Command conversion, business writes, external side effects, direct Execution Gateway calls, task creation, notification delivery, crop-plan confirmation, assignment, and inventory reservation are forbidden.

The envelope and each discriminated payload use exact-key validation. References use a fixed source-system and reference-type registry; arbitrary URLs and targets are rejected. Timestamps use canonical UTC ISO format and expiry is limited to 168 hours. Unsafe HTML, control characters, secret-like content, execution intent, business-write intent, and oversized content fail closed with specific rejection codes.

Hermes may return only a candidate. Invalid or unavailable Hermes output invokes the deterministic native builder, which is subject to the identical schema, risk mapping, audit fields, and validation. A failed native fallback returns `native_fallback_failed`; it never increases authority.

Audit evidence records validation and correlation metadata with business-write and execution attempted/performed flags fixed to false. Evolution evidence records candidate quality only and fixes automatic Policy and Skill adoption to false.
