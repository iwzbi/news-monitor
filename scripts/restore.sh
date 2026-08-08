#!/bin/bash
# Restore news database and n8n data (all workflows)
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

# Restore news database
if [ -f "$BACKUP_DIR/news.db" ]; then
  echo "[1/4] Restoring news database..."
  docker cp "$BACKUP_DIR/news.db" news-backend:/data/news.db
  docker restart news-backend
  echo "  -> Database restored and backend restarted"
else
  echo "[1/4] No news database backup found, skipping"
fi

# Restore n8n database (contains all workflows)
if [ -f "$BACKUP_DIR/n8n_database.sqlite" ]; then
  echo "[2/4] Restoring n8n database..."
  docker stop n8n 2>/dev/null || true
  docker cp "$BACKUP_DIR/n8n_database.sqlite" n8n:/home/node/.n8n/database.sqlite
  docker start n8n
  sleep 3
  echo "  -> n8n database restored and restarted"
else
  echo "[2/4] No n8n database backup found, skipping"
fi

# Import workflows from JSON (backup method)
if [ -f "$BACKUP_DIR/workflows_all.json" ]; then
  echo "[3/4] Importing workflows from JSON..."
  docker cp "$BACKUP_DIR/workflows_all.json" n8n:/tmp/workflows_all.json
  docker exec n8n n8n import:workflow --input=/tmp/workflows_all.json 2>/dev/null || true
  WORKFLOW_COUNT=$(python3 -c "import json; print(len(json.load(open('$BACKUP_DIR/workflows_all.json'))))" 2>/dev/null || echo "?")
  echo "  -> Imported $WORKFLOW_COUNT workflows"
else
  echo "[3/4] No workflow JSON found, skipping"
fi

# Import credentials (if any)
if [ -f "$BACKUP_DIR/credentials_all.json" ]; then
  echo "[4/4] Importing credentials..."
  docker cp "$BACKUP_DIR/credentials_all.json" n8n:/tmp/credentials_all.json
  docker exec n8n n8n import:credentials --input=/tmp/credentials_all.json 2>/dev/null || true
  echo "  -> Credentials imported"
else
  echo "[4/4] No credentials to import, skipping"
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
echo ""
echo "Workflows restored:"
docker exec n8n n8n list:workflow 2>/dev/null || echo "  (check n8n UI)"
