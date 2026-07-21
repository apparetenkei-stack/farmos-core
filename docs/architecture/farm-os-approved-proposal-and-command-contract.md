# Approved Proposal to Approved Command Contract

Day132 defines a fail-closed, non-executing boundary from a reviewed Proposal to
an Approved Command reservation. FarmOS Core remains the source of truth. The
builder accepts only the exact `farmos.approved.proposal.v1` envelope, an active
Proposal Registry type, an approved human review, canonical timestamps, exact
approval evidence, a known Command Class, and trace and audit references.

The Proposal Registry continues to own the Proposal's base classification. An
Approved Proposal may name exactly one L2 or L3 Command Class after review. Its
declared risk, approval requirement, capabilities, and reauthentication evidence
must exactly match that Command Registry entry. This explicit reviewed envelope
is the only Day132 boundary that may raise a Proposal candidate into a command
classification; callers cannot choose or lower risk independently.

The Command Registry contains `approved_internal_command` and
`approved_external_command`. Both are non-executable in Day132. The builder
creates a deterministic command ID, proposal hash, command hash, and builder
version reservation in memory only. The target reference is derived from and
must equal the approved Proposal reference; arbitrary targets are rejected. It
rejects unknown or extra fields, missing
approval or capability, risk mismatch, invalid version, invalid trace, duplicate
JSON keys, duplicate command hashes, URL/Secret/command-text payloads, and
unknown Command Classes. It does not persist a reservation or call a gateway.

`ExecutionGatewayRequest` and `ExecutionGatewayResult` are reservation-only
contracts. Requests fix `execution_requested=false` and `dry_run_only=true`;
results can only be blocked or unavailable and record zero execution. There is
no Gateway implementation, state machine, route, database repository, Apply,
business adapter, external API, or business write in Day132.

Fixtures A–J cover Approved Proposal, Approved Command, unknown Proposal,
missing approval, missing capability, wrong risk, duplicate command, invalid
schema, invalid trace, and unknown command. Fixture counters are labelled as
test-observed. Production command building, gateway calls, and internal and
external execution remain zero.
