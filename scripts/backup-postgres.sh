#!/usr/bin/env bash
set -euo pipefail

mkdir -p backups/postgres

STAMP=$(date +"%Y%m%d-%H%M%S")
OUT="backups/postgres/farmos_core_local-${STAMP}.dump"

docker exec farmos-postgres pg_dump \
  -U farmos_local_admin \
  -d farmos_core_local \
  -Fc \
  > "$OUT"

echo "Backup created:"
echo "$OUT"
