#!/bin/sh
set -eu

TOKEN_ACCOUNT="active-projection-read-staging"
TOKEN_SERVICE="jp.apparetenkei.farmos-core-staging.active-projection-read"
CORE_MEMORY_ACCOUNT="core-memory-staging-readonly"
CORE_MEMORY_SERVICE="jp.apparetenkei.farmos-core-staging.core-memory-readonly"

if ! HERMES_ACTIVE_PROJECTION_READ_TOKEN="$(
  /usr/bin/security find-generic-password \
    -a "$TOKEN_ACCOUNT" \
    -s "$TOKEN_SERVICE" \
    -w 2>/dev/null
)"; then
  echo "CORE_STAGING_ACTIVE_PROJECTION_TOKEN_UNAVAILABLE" >&2
  exit 1
fi
if [ -z "$HERMES_ACTIVE_PROJECTION_READ_TOKEN" ]; then
  echo "CORE_STAGING_ACTIVE_PROJECTION_TOKEN_EMPTY" >&2
  exit 1
fi

export HERMES_ACTIVE_PROJECTION_READ_TOKEN
export HERMES_ACTIVE_PROJECTION_READ_PRINCIPAL_REF="farmos-core-staging-active-projection-reader"
export HERMES_ACTIVE_PROJECTION_READ_ROLE="administrator"
export HERMES_ACTIVE_PROJECTION_READ_ALLOWED_SCOPE_KEYS='["active_projection_read"]'

if ! FARMOS_CORE_MEMORY_READ_PASSWORD="$(
  /usr/bin/security find-generic-password \
    -a "$CORE_MEMORY_ACCOUNT" \
    -s "$CORE_MEMORY_SERVICE" \
    -w 2>/dev/null
)"; then
  echo "CORE_STAGING_CORE_MEMORY_READ_CREDENTIAL_UNAVAILABLE" >&2
  exit 1
fi
if [ -z "$FARMOS_CORE_MEMORY_READ_PASSWORD" ]; then
  echo "CORE_STAGING_CORE_MEMORY_READ_CREDENTIAL_EMPTY" >&2
  exit 1
fi

export FARMOS_CORE_MEMORY_READ_PASSWORD
export FARMOS_INSTALLATION_ID="apparetenkei-farmos-core-staging-01"
export FARMOS_AUTHORIZED_FARM_SCOPE="apparetenkei-primary-farm"
export FARMOS_BUSINESS_TIMEZONE="Asia/Tokyo"

exec /opt/homebrew/opt/node@24/bin/node \
  /Users/hayate/projects/farmos-core-day150-5-e/node_modules/next/dist/bin/next \
  start -H 127.0.0.1 -p 3100
