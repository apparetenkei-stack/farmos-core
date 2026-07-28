# FarmOS read-only observer MCP

This stdio MCP server exposes one tool:
`farmos_readonly_observer(operation="get_farm_status", scope="today")`.

It reuses FarmOS Core's operational read-only integration. Endpoint, method,
record limits, timeout, and credentials are server-owned and cannot be supplied
through tool input. The server does not expose resources, prompts, sampling,
database writes, Proposal, Approval, or Apply operations.

Work logs are recent recorded work, not verified completion or planning data.
Each row explicitly carries its completion and source timestamp semantics.
Calendar dates are validated as real `YYYY-MM-DD` dates and as consecutive
calendar days. The server supplies deterministic Japanese labels; clients
should use those labels without recalculating dates or exposing contract field
names in user-facing answers.

`presentation_ja` is a deterministic presentation boundary built only from
validated contract semantics. Its display text uses absolute dates, contains no
relative-date terms, and must be copied without changing its meaning.

`response_guard.ts` validates untrusted Hermes free text before delivery. An
invalid answer is replaced with a deterministic, three-section response built
only from `presentation_ja` and bounded sanitized MCP records. The guard is
currently an independent integration boundary and is not wired into a runtime.

Run it through the fixed `launcher.py`. The launcher reads only the three
allowlisted read-only API settings from the protected local environment file;
do not store their values in Hermes profile configuration.
