# FarmOS Execution Gateway Skeleton

Day133 accepts only a Day132 `ApprovedCommand`. The strict Gateway Request
revalidates its command/proposal hashes, registry class and target, correlation,
approval evidence, and trusted-clock L3 reauthentication. The request actor and
Gateway version are fixed; unknown and duplicate raw fields fail closed.

The declarative transition table owns `requested → approved → executing`, then
either `succeeded` or `failed`, with optional `compensation_required →
compensated`. Every rule records audit data and fixes
`business_write_allowed=false`. Invalid transitions and state versions are
rejected. State records exist only in fixture memory.

The Adapter Registry contains exactly `fake_execution_adapter`. Gateway code,
not Command input, resolves it from registered command class, target, typed
payload schema, and risk. It is deterministic, fake-only, and has neither
business-write nor external-execution authority. Success means only that the
fake technical path completed; it is not a Business Fact and does not mean the
farm application was updated.

Agent Result, Gateway Execution Result, and Fake Adapter Result are distinct
contracts. Agent output cannot alter command state. The Gateway inherits the
Day132 trace and adds gateway/adapter IDs without replacing proposal, approval,
command, correlation, source-event, or integrity hashes.

The recursive AST boundary uses explicit local/external allowlists and rejects
DB/repository clients, network, filesystem writes, process execution, runtime
tools, Proposal Apply, Review POST, dynamic imports, `eval`, constructors, and
arbitrary `.call()`. Safety zeroes in the report are derived from this absent
dependency path, not from Adapter self-reporting.

Day133 adds no route, persistence, real adapter, Business Write, external API,
or permanent idempotency reservation. Day134 owns persistent reservation,
atomic duplicate prevention, retry/replay handling, and one-business-execution
semantics.
