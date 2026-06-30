# Day 1 Setup Log

## Machine

- Machine: Mac mini M4
- Memory: 16GB
- Internal SSD: 256GB
- macOS account: hayate
- Computer name: farm-os-core-mac

## Security

- FileVault: enabled
- Firewall: enabled
- Apple Account: signed in
- iCloud Drive Desktop/Documents sync: disabled policy

## Network

- Tailscale: installed
- Tailnet devices connected:
  - Windows PC
  - farm-os-core-mac
  - Pixel 10 Pro XL

Current Tailscale policy:

- Device Approval: off
- Tailnet Lock: not used
- Key Expiry: 180 days
- Auto-update: on

## Developer tools

Installed and verified:

- Xcode Command Line Tools
- Homebrew
- Git
- GitHub CLI
- Node.js
- pnpm
- wget
- jq
- tree
- Tailscale
- OrbStack
- Docker
- Docker Compose

Verified versions:

- Node.js: v26.4.0
- pnpm: 11.9.0
- GitHub CLI: 2.95.0
- Docker: 29.4.0
- Docker Compose: v5.1.2

## Docker test

Command:

docker run hello-world

Result:

Hello from Docker!

## FarmOS Core workspace

Path:

/Users/hayate/projects/farmos-core

Created directories:

- backups
- data
- docker
- docs
- scripts

Initial policy in README.md:

AI agents must not directly write to production DB.
AI agents can read, summarize, OCR, transcribe, and create proposals.
All production changes require human approval.

## Git

Initial commit:

303b9c9 chore: initialize FarmOS Core workspace

## Notes

A Supabase official repository was accidentally cloned and then removed.

Removed directory:

rm -rf supabase

Future command guidance:

- Prefer short commands.
- Avoid long one-line commands when possible.
- Check current directory before file operations.
- Do not place production secrets on this machine during early setup.
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
