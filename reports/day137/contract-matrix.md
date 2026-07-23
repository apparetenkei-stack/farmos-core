# Day137 Contract Matrix

| Boundary | Required value |
|---|---|
| Operation | `confirmation_task_draft_apply` |
| Candidate | `confirmation_task`, `review_ready`, unexpired |
| Approval | approved human; matching candidate/hash; capability; fresh |
| Reauthorization | active human; `apply_confirmation_task`; exact scope; current policy; fresh |
| Idempotency | required; replay/conflict/duplicate separated |
| Dry-run | true only |
| Task Draft | `farmos.confirmation-task-draft.v1`, status `draft` |
| Business write / external side effect | false / false |
| Rollback | `discard_draft` |
