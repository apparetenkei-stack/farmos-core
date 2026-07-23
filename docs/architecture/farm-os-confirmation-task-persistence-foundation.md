# FarmOS Confirmation Task Persistence Foundation

Day138 defines `farmos.confirmation-task-persistence.v1`, `farmos.confirmation-task-cancellation.v1`, and the reference-only `farmos.confirmation-task-record.v1`.

Persistence and cancellation are dry-run simulations backed only by an in-memory deterministic reference repository. Both require server-owned authority-port evidence, current reauthorization, exact target scope, canonical hashes, durable-style idempotency reservation, audit correlation, and optimistic concurrency. Persistence creates an `open` reference record at version 1. Cancellation is the only transition and changes `open` to `cancelled` with a version increment; physical deletion is unavailable.

`blocking_hint` remains display metadata and cannot stop processing, lock UI, escalate, or enforce deadlines. There is no Execution Gateway, production repository, database, network, filesystem writer, notification, assignment, migration, or external side-effect dependency.
