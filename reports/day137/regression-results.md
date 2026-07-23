# Day137 Regression Results

Required commands:

- `pnpm run test-farm-os-day137-boundary`
- `pnpm run test-farm-os-approved-command-boundary`
- `pnpm run test-farm-os-day133-boundary`
- `pnpm run test-farm-os-day134-boundary`
- `pnpm run test-farm-os-day135-boundary`
- `pnpm run test-farm-os-day136-boundary`
- `pnpm exec tsc --noEmit --tsBuildInfoFile /private/tmp/farmos-core-day137.tsbuildinfo --pretty false`
- `pnpm run run-farm-os-day137-isolated-build`
- `git diff --check`

Outcomes: Day137 targeted 46/46 PASS; dependency boundary PASS; Day132 approved proposal/command PASS; Day133 gateway 20/20 PASS; Day134 idempotency 37/37 PASS; Day135 reauthorization 22/22 PASS; Day136 candidate 43/43 PASS; typecheck PASS; isolated build PASS; `git diff --check` PASS.
