# Approved Proposal to Approved Command Contract

Day132 defines the non-executing boundary `Proposal → Human Review → Approved
Proposal → Approved Command`. The existing `approved` Proposal status and
`approve` review decision are the only accepted success states. Pending,
rejected, needs-revision, expired, applied, superseded, and unknown states fail
closed. Approval evidence binds the reviewer, timestamp, Proposal version and
integrity hash, approved capabilities, and approved output classes.

The static Command Registry derives its L2/L3 risk, capability,
reauthorization, rollback, and external-execution classifications from the
Day131 Risk Policy. It restricts Proposal types, command versions, output
classes, target-system identifiers, and an exact typed payload per Command
Class. Arbitrary URLs, table names, service names, natural-language commands,
unknown payload fields, and caller-selected risk are not accepted.

`ApprovedCommandBuilder` is a pure boundary. It validates the Approved Proposal,
the exact Build Request, Proposal and Command registries, and the Day131
`approved_command_builder` Policy Matrix entry before deterministically deriving
the command identity and hashes. Idempotency data is a non-persisted reservation;
known hashes may classify a duplicate fixture, but Day132 creates no DB lock,
reservation store, or replay-protection persistence.

`ExecutionGatewayRequest` and `ExecutionGatewayResult` are types only. Approved
Command does not mean Executed Command. Command Builder is not an Execution
Gateway. The existence of an ExecutionGatewayRequest type does not authorize a
gateway call. Day132 contains no gateway implementation, adapter, dispatcher,
state machine, route, DB mutation, business write, Proposal Apply, external API,
or runtime tool.

Fixtures A–J cover Approved Proposal, deterministic Approved Command, unknown
Proposal, missing approval, missing capability, risk mismatch, duplicate
identity, schema error, trace discontinuity, and unknown Command. Duplicate JSON
keys are detected only at the raw duplicate-aware parser boundary. Reports use
assertion and test-observed counters; gateway, internal/external execution,
business write, and Proposal Apply remain zero.

Day133 may introduce an Execution Gateway skeleton, fake adapter, command state
machine, Agent-result responsibility boundary, and correlation handling. None of
those implementations are part of Day132.
