# Slack Hermes Interactive Response Governance

## Interactive Response

A direct response to an authenticated and explicitly user-initiated request.
It is not autonomous external publication.
It may return read-only information without a separate approval,
provided authorization, allowlist, data minimization, and audit boundaries hold.

For the Slack Hermes MVP, an Interactive Response:

- starts only from an allowlisted `/hermes` Slash Command;
- is sent ephemerally to the authenticated invoking user;
- reads through the existing Hermes read-only application boundary;
- does not persist the question or response;
- does not read Slack conversation history;
- does not write business data or create, save, approve, or apply a Proposal;
- does not use normal channel posts.

## Notification

A message sent to a preconfigured subscriber or destination. Notifications,
scheduled delivery, and daily automatic posts are outside the Slack Hermes MVP.

## Autonomous Publication

An AI-initiated or scheduled publication to third parties or broad audiences.
It requires Proposal, Human Approval, and an Execution Gateway.

The Slack Hermes MVP does not implement Autonomous Publication.
