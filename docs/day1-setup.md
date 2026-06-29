# Day 1 Setup Log

## Completed

- macOS initial setup
- FileVault enabled
- Firewall enabled
- Tailscale connected
- Homebrew installed
- Git / GitHub CLI installed
- Node.js / pnpm installed
- OrbStack installed
- Docker verified with hello-world
- FarmOS Core workspace initialized
- Initial Git commit created

## Security Policy

- Mac mini is not exposed directly to the internet
- Remote access is through Tailscale only
- AI agents must not directly write to production DB
- AI agents must not access secrets or production .env files
- AI agents can only read, summarize, OCR, transcribe, and create proposals
- Human approval is required before production changes

## Next

- Create Docker Compose for local development
- Add PostgreSQL, Redis, MinIO, and Qdrant
- Add backup scripts
- Create AI proposal workflow
