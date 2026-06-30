# Day 3 - DB Security and Restore Test

## Goal

Make FarmOS Core safer for long-term local operation.

Day 3 focuses on:

- Docker Compose environment cleanup
- PostgreSQL role separation
- Schema separation
- ai.proposal_inbox minimal implementation
- Backup and restore test
- Node.js LTS policy review

## Security Policy

AI agents must not directly write to app schema.
AI agents must not run migrations.
AI agents must not access secrets.
AI agents may only create proposals in ai.proposal_inbox.

## Restore Policy

Never delete the active local DB during restore tests.
Always restore into a separate restore_test database.
