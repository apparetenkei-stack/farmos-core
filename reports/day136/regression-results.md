# Day136 Regression Results

Required evidence commands:

- `pnpm run test-farm-os-day136-boundary`
- `pnpm run test-farm-agent-risk-policy-contract`
- `pnpm run test-farm-os-day133-boundary`
- `pnpm run test-farm-os-day134-boundary`
- `pnpm run test-farm-os-day135-boundary`
- `pnpm run test-farm-os-day135-foundation-boundary`
- `pnpm exec tsc --noEmit --tsBuildInfoFile /private/tmp/farmos-core-day136.tsbuildinfo --pretty false`
- `pnpm run run-farm-os-day136-isolated-build`
- `git diff --check`

Outcomes: Day136 targeted 43/43 assertions PASS; Day131 risk/policy PASS; Day133 gateway 20/20 fixtures PASS; Day134 idempotency 37/37 PASS; Day135 runtime reauthorization 22/22 PASS; Day135 foundation 40/40 PASS; typecheck PASS; isolated build PASS; `git diff --check` PASS.
