# FarmOS Confirmation Task Apply Foundation

Day137 defines `farmos.confirmation-task-apply.v1` for human-approved, runtime-reauthorized, idempotent dry-run conversion of a Day136 `confirmation_task` candidate into `farmos.confirmation-task-draft.v1`.

The operation is fixed to `confirmation_task_draft_apply`. It requires an approved human decision bound to the canonical candidate snapshot hash, an active human actor with `apply_confirmation_task` in the exact typed-reference scope, the current policy version, fresh reauthorization, and a server-evaluated idempotency boundary.

Only `dry_run_ready`, `already_processed`, and `rejected` results are possible. Task Draft status is fixed to `draft`; `blocking_hint` is display/review metadata and has no process-control effect. Business writes, production commands, notifications, assignment, enforcement, external side effects, and Execution Gateway calls are forbidden. Rollback is `discard_draft`.
