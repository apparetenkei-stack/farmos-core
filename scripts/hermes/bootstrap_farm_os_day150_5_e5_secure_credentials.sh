#!/bin/sh
set -eu

EXPECTED_BRANCH="feature/day150-5-e-environment-identity-handshake"
EXPECTED_HEAD="72ceaa6f779e875776d2f916c1fa003d08fb3528"

if [ "$(git branch --show-current)" != "$EXPECTED_BRANCH" ]; then
  echo "E5_SECURE_BOOTSTRAP_BLOCKED_BRANCH" >&2
  exit 1
fi
if [ "$(git rev-parse HEAD)" != "$EXPECTED_HEAD" ]; then
  echo "E5_SECURE_BOOTSTRAP_BLOCKED_HEAD" >&2
  exit 1
fi
if ! git diff --check; then
  echo "E5_SECURE_BOOTSTRAP_BLOCKED_DIFF" >&2
  exit 1
fi

echo "One Keychain prompt follows. The value is hidden by macOS Keychain."
echo "1/1 App Business Staging read-only DB password"
security add-generic-password -U \
  -a "app-business-staging-readonly" \
  -s "jp.apparetenkei.farmos-core-staging.app-business-readonly" -w
expect scripts/hermes/farm_os_day150_5_e5_keychain_secret_materializer.expect

echo "E5_SECURE_CREDENTIAL_INPUT_COMPLETE"
