# Farm Agent Runtime Port and Observation Adapter

`FarmAgentRuntimePort` is a product-neutral boundary. The existing Native Runtime remains the formal output owner and default production path.

`FarmOsNativeRuntimeAdapter` delegates to the existing Native Runtime. Native failures are blocked; they do not fall back to Hermes for formal output.

`NousHermesObservationAdapter` is shadow-only. It accepts fixture or explicit read-only input and permits only observation, architecture finding, skill candidate, and migration readiness drafts. It rejects formal task types and unknown capabilities. Its result is always `runtime_mode=shadow` and `formal_contract_created=false`.

The separation is:

- observation draft is not a Formal Proposal
- observation draft is not a Daily Brief
- observation draft is not a Review decision
- observation draft is not an Apply or execution command

Operator uses the Native Runtime only. Observer may use the Hermes observation boundary with isolated storage. No Core environment, Production credential, database, Funnel, launchd, cron, memory persistence, or skill persistence is shared or changed by this boundary.
## Evolution Ledger boundary

Observation drafts from the shadow adapter may be deterministically wrapped as
`farmos.evolution.ledger.candidate.v1` fixture candidates. The wrapper requires
explicit evidence, preserves the draft content, fixes `review_state` to
`review_required`, and rejects unsafe flags, unknown kinds, and missing evidence.
It does not persist candidates, create formal contracts, or provide an accepted
state transition. Native Runtime remains the formal production output owner.

Policy candidates are allowed as review-required drafts only. Automatic policy
acceptance is not reachable; adoption requires a future human review boundary.
