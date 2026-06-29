# FarmOS Core

Mac mini M4 を FarmOS / 農園オペレーションOS の常時稼働コアとして使うためのローカル基盤。

## Day 1 completed

- macOS initial setup
- FileVault enabled
- Firewall enabled
- Homebrew installed
- Git installed
- Node.js installed
- pnpm installed
- GitHub CLI installed
- Tailscale connected
- OrbStack installed
- Docker hello-world verified

## Policy

AI agents must not directly write to production DB.
AI agents can read, summarize, OCR, transcribe, and create proposals.
All production changes require human approval.
