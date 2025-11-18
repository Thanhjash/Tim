#!/bin/bash

# SQLite Database Backup Script
# Usage: ./backup.sh

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_FILE="./data/expenses.db"

# Create backup directory
mkdir -p $BACKUP_DIR

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
    echo "❌ Database file not found: $DB_FILE"
    exit 1
fi

# Create backup
echo "💾 Creating backup..."
BACKUP_FILE="$BACKUP_DIR/expenses_backup_$TIMESTAMP.db"

# Copy database (SQLite safe backup)
cp $DB_FILE $BACKUP_FILE

# Compress backup
echo "🗜️  Compressing backup..."
gzip $BACKUP_FILE

COMPRESSED_FILE="$BACKUP_FILE.gz"
BACKUP_SIZE=$(du -h $COMPRESSED_FILE | cut -f1)

echo "✅ Backup created successfully!"
echo "📦 File: $COMPRESSED_FILE"
echo "📊 Size: $BACKUP_SIZE"

# Keep only last 30 backups
echo "🧹 Cleaning old backups (keeping last 30)..."
cd $BACKUP_DIR
ls -t expenses_backup_*.db.gz | tail -n +31 | xargs -r rm --
REMAINING=$(ls -1 expenses_backup_*.db.gz | wc -l)
echo "📂 Remaining backups: $REMAINING"

echo ""
echo "📝 To restore a backup:"
echo "   gunzip -c $COMPRESSED_FILE > ./data/expenses.db"
echo "   docker compose -f docker-compose.prod.yml restart"
echo ""
echo "💡 To setup automatic daily backup, add to crontab:"
echo "   0 2 * * * cd $(pwd) && ./backup.sh >> ./logs/backup.log 2>&1"
