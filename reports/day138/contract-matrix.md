# Day138 Contract Matrix

| Operation | Capability | Input state | Result state | Dry-run | Rollback |
|---|---|---|---|---:|---|
| confirmation_task_persist | persist_confirmation_task | draft | open reference record v1 | required | discard_reference_record |
| confirmation_task_cancel | cancel_confirmation_task | open + expected version | cancelled reference record v+1 | required | retain_open_state |

Both require server authority, reauthorization, idempotency, optimistic concurrency, zero business writes, and zero external side effects.
