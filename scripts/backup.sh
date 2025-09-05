#!/bin/bash

# ==============================
# BoardOS Backup Script
# ==============================
# Automated backup for Docker volumes and configuration

set -euo pipefail

# Configuration
BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30
LOG_FILE="/var/log/backup.log"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log "Starting BoardOS backup - $TIMESTAMP"

# Create backup archive
BACKUP_FILE="$BACKUP_DIR/boardos_backup_$TIMESTAMP.tar.gz"

# Backup data volumes
log "Backing up application data..."
tar -czf "$BACKUP_FILE" \
    -C /backup-source \
    letsencrypt/ \
    prometheus/ \
    loki/ \
    traefik-logs/ \
    2>/dev/null || true

# Verify backup was created
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup created successfully: $BACKUP_FILE ($BACKUP_SIZE)"
else
    log "ERROR: Backup failed to create"
    exit 1
fi

# Cleanup old backups
log "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "boardos_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Log completion
log "Backup completed successfully"

# Optional: Upload to cloud storage (uncomment and configure as needed)
# if [ ! -z "${AWS_S3_BUCKET:-}" ]; then
#     log "Uploading backup to S3..."
#     aws s3 cp "$BACKUP_FILE" "s3://$AWS_S3_BUCKET/backups/"
#     log "Backup uploaded to S3"
# fi

exit 0