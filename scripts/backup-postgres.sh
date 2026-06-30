#!/bin/bash
set -euo pipefail

# FarmOS Core PostgreSQL backup script
# Day 2: local-only draft
# Production use requires restore testing.

BACKUP_DIR="./backups/postgres"
DATE="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/farmos_core_local_$DATE.dump"

mkdir -p "$BACKUP_DIR"

docker exec farmos-postgres pg_dump \
  -U farmos_local_admin \
  -d farmos_core_local \
  -F c \
  > "$FILE"

echo "Backup created:"
echo "$FILE"
