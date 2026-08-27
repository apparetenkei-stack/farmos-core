#!/bin/sh
set -eu

CORE_MEMORY_ACCOUNT="core-memory-production-readonly"
CORE_MEMORY_SERVICE="jp.apparetenkei.farmos-core-production.core-memory-readonly"

if [ "${FARMOS_CORE_RUNTIME_ENVIRONMENT:-}" != "production" ]; then
  echo "CORE_PRODUCTION_RUNTIME_SELECTOR_INVALID" >&2
  exit 1
fi
if [ "${FARMOS_CORE_PRODUCTION_RUNTIME_IDENTITY:-}" != \
  "farmos-core-production-primary" ]; then
  echo "CORE_PRODUCTION_RUNTIME_IDENTITY_INVALID" >&2
  exit 1
fi
if ! FARMOS_CORE_MEMORY_READ_PASSWORD="$(
  /usr/bin/security find-generic-password \
    -a "$CORE_MEMORY_ACCOUNT" \
    -s "$CORE_MEMORY_SERVICE" \
    -w 2>/dev/null
)"; then
  echo "CORE_PRODUCTION_CORE_MEMORY_READ_CREDENTIAL_UNAVAILABLE" >&2
  exit 1
fi
if [ -z "$FARMOS_CORE_MEMORY_READ_PASSWORD" ]; then
  echo "CORE_PRODUCTION_CORE_MEMORY_READ_CREDENTIAL_EMPTY" >&2
  exit 1
fi

export FARMOS_CORE_MEMORY_READ_PASSWORD
export FARMOS_INSTALLATION_ID="apparetenkei-farmos-core-mac-01"
export FARMOS_AUTHORIZED_FARM_SCOPE="apparetenkei-primary-farm"
export FARMOS_BUSINESS_TIMEZONE="Asia/Tokyo"

exec /opt/homebrew/opt/node@24/bin/node \
  "$FARMOS_CORE_RELEASE_DIRECTORY/scripts/hermes/run_farm_os_day150_5_e_production_core.mjs"
