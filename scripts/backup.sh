#!/bin/bash
# Backup automático PostgreSQL
BACKUP_DIR="/opt/mapeople/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/pg_backup_$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"
docker exec mapeople_postgres pg_dump -U mapeople mapeople_db | gzip > "$FILE"

# Manter apenas os últimos 7 backups
ls -t "$BACKUP_DIR"/pg_backup_*.sql.gz | tail -n +8 | xargs -r rm
echo "[$(date)] Backup criado: $FILE"
