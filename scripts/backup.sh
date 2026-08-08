#!/bin/bash
# Backup news database and n8n data (all workflows)
# Usage: ./scripts/backup.sh [output_dir]

set -e

OUTPUT_DIR="${1:-./backups/$(date +%Y%m%d_%H%M%S)}"
mkdir -p "$OUTPUT_DIR"

echo "=== News Platform Backup ==="
echo "Output: $OUTPUT_DIR"

# Backup SQLite database
echo "[1/4] Backing up news database..."
docker exec news-backend cp /data/news.db /data/news.db.bak
docker cp news-backend:/data/news.db.bak "$OUTPUT_DIR/news.db"
echo "  -> news.db backed up"

# Backup n8n database (contains all workflows, credentials, executions)
echo "[2/4] Backing up n8n database..."
docker exec n8n cp /home/node/.n8n/database.sqlite /home/node/.n8n/database.sqlite.bak
docker cp n8n:/home/node/.n8n/database.sqlite.bak "$OUTPUT_DIR/n8n_database.sqlite"
echo "  -> n8n database backed up"

# Export all workflows as JSON (for easy import)
echo "[3/4] Exporting all n8n workflows..."
docker exec n8n n8n export:workflow --all --output=/tmp/workflows_export.json 2>/dev/null
docker cp n8n:/tmp/workflows_export.json "$OUTPUT_DIR/workflows_all.json"
WORKFLOW_COUNT=$(python3 -c "import json; print(len(json.load(open('$OUTPUT_DIR/workflows_all.json'))))" 2>/dev/null || echo "?")
echo "  -> Exported $WORKFLOW_COUNT workflows"

# Export credentials (if any)
echo "[4/4] Exporting n8n credentials..."
docker exec n8n n8n export:credentials --all --decrypted --output=/tmp/credentials_export.json 2>/dev/null || true
docker cp n8n:/tmp/credentials_export.json "$OUTPUT_DIR/credentials_all.json" 2>/dev/null || echo "  -> No credentials to export"

echo ""
echo "=== Backup Complete ==="
echo "Files:"
ls -lh "$OUTPUT_DIR"
echo ""
echo "Workflows included:"
python3 -c "import json; [print(f'  - {w.get(\"name\",\"unnamed\")}') for w in json.load(open('$OUTPUT_DIR/workflows_all.json'))]" 2>/dev/null || true
echo ""
echo "To restore on new server:"
echo "  1. Copy $OUTPUT_DIR to new server"
echo "  2. Run: ./scripts/restore.sh $OUTPUT_DIR"
