# FarmOS Risk Taxonomy and Agent Policy Matrix

Risk Level Policy describes which outputs, approvals, capabilities, and rollback
classes may exist at L0–L3 across Core. Agent Policy Matrix separately controls
which actor may directly perform each action. An output being present in a Risk
Policy never grants that action to an agent.

L0 is read-only and discardable. L1 contains review-required Proposal, Policy,
Skill, and Evolution candidates and uses reject-or-supersede rollback. L2 is an
internal approved-command classification with privileged approval,
reauthorization, and reversible-internal rollback. L3 is an external-command
classification with final confirmation, reauthentication, and
cancellation-or-correction rollback. Every level fixes direct agent execution to
false. Day131 defines no command builder, persistence, gateway, or execution.

`work_log_follow_up` is the only active Proposal type. Its registry policy does
not grant persistence to Native Runtime, Hermes Operator, or Hermes Observer.
Native may generate a candidate only. Hermes Operator remains shadow-only.
Hermes Observer may perform L0 observation actions and create review-required L1
Policy, Skill, and Evolution candidates, but cannot persist a Formal Proposal,
review, apply, adopt, install, accept, build commands, or call a gateway.

The full actor × action matrix includes deny entries. Capability and approval
evidence are checked before future Human Reviewer, Approved Command Builder, or
Execution Gateway classifications can be allowed. These are policy
classifications only and are not connected to runtime implementations.

Policy override validation prevents lower policy classes from changing
Constitutional or Operational Policy, lowering risk, adding capability, reducing
approval, or enabling direct execution. Temporary Exceptions use exact keys,
finite timestamps, bounded validity, mandatory audit/revoke/post-review fields,
and reject approval bypass, risk downgrade, capability additions, arbitrary URL,
Secret access, direct execution, and invariant override.

The A–J fixture suite covers L0, L1, L2, L3, unknown Proposal, Observer Apply,
Preference downgrade, invalid Temporary Exception, Policy Candidate, and
Evolution Candidate. Reports contain assertion-derived case results and
test-observed counters. Day130.5 Runtime and Evolution boundaries remain intact;
Day132 command and gateway work is explicitly not implemented here.
