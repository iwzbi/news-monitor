#!/bin/bash
# Backup news database and n8n data
# Usage: ./scripts/backup.sh [output_dir]

set -e

OUTPUT_DIR="${1:-./backups/$(date +%Y%m%d_%H%M%S)}"
mkdir -p "$OUTPUT_DIR"

echo "=== News Platform Backup ==="
echo "Output: $OUTPUT_DIR"

# Backup SQLite database
echo "[1/3] Backing up news database..."
docker exec news-backend cp /data/news.db /data/news.db.bak
docker cp news-backend:/data/news.db.bak "$OUTPUT_DIR/news.db"
echo "  -> news.db backed up"

# Backup n8n data
echo "[2/3] Backing up n8n data..."
docker exec n8n tar czf /tmp/n8n_backup.tar.gz -C /home/node .n8n 2>/dev/null || true
docker cp n8n:/tmp/n8n_backup.tar.gz "$OUTPUT_DIR/n8n_backup.tar.gz" 2>/dev/null || echo "  -> n8n backup skipped (n8n not running)"

# Export workflow
echo "[3/3] Exporting n8n workflow..."
docker cp n8n:/home/node/.n8n/config "$OUTPUT_DIR/n8n_config" 2>/dev/null || true

echo ""
echo "=== Backup Complete ==="
echo "Files:"
ls -lh "$OUTPUT_DIR"
echo ""
echo "To restore on new server:"
echo "  1. Copy $OUTPUT_DIR to new server"
echo "  2. Run: ./scripts/restore.sh $OUTPUT_DIR"
