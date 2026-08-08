#!/bin/bash
# Restore news database and n8n data
# Usage: ./scripts/restore.sh <backup_dir>

set -e

BACKUP_DIR="${1:?Usage: ./scripts/restore.sh <backup_dir>}"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "Error: Backup directory not found: $BACKUP_DIR"
  exit 1
fi

echo "=== News Platform Restore ==="
echo "Source: $BACKUP_DIR"

# Check if docker-compose is running
if ! docker compose ps > /dev/null 2>&1; then
  echo "Starting services..."
  docker compose up -d
  sleep 5
fi

# Restore SQLite database
if [ -f "$BACKUP_DIR/news.db" ]; then
  echo "[1/2] Restoring news database..."
  docker cp "$BACKUP_DIR/news.db" news-backend:/data/news.db
  docker restart news-backend
  echo "  -> Database restored and backend restarted"
else
  echo "[1/2] No database backup found, skipping"
fi

# Restore n8n data
if [ -f "$BACKUP_DIR/n8n_backup.tar.gz" ]; then
  echo "[2/2] Restoring n8n data..."
  docker cp "$BACKUP_DIR/n8n_backup.tar.gz" n8n:/tmp/
  docker exec n8n tar xzf /tmp/n8n_backup.tar.gz -C /home/node 2>/dev/null || true
  docker restart n8n
  echo "  -> n8n data restored and restarted"
else
  echo "[2/2] No n8n backup found, skipping"
fi

echo ""
echo "=== Restore Complete ==="
echo "Services:"
docker compose ps
echo ""
echo "Access:"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:3456"
echo "  n8n:       http://localhost:5678"
