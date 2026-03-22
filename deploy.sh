#!/bin/bash
# Dungeon X — Push to GitHub Pages
# Run: ./deploy.sh "optional commit message"
# Commits all changes and pushes to main, triggering GitHub Actions deploy.

set -e

cd "$(dirname "$0")"

MSG="${1:-DX update $(date '+%Y-%m-%d %H:%M')}"

echo "=== Dungeon X Deploy ==="
echo "Commit message: $MSG"
echo ""

# Show what's changing — files AND a diff summary
git status --short
echo ""
git diff --stat HEAD 2>/dev/null || true
echo ""

# SW cache version check
SW_VER=$(grep -o "dungeon-x-v[0-9.]*" sw.js | head -1)
echo "SW cache version: $SW_VER"
echo "(If you changed code, make sure sw.js cache was bumped!)"
echo ""

read -p "Push to GitHub Pages? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  git add -A
  git commit -m "$MSG"
  git push origin main
  echo ""
  echo "Pushed. GitHub Actions deploying now."
  echo "Check: https://github.com/ben-whitesides/dungeon-x/actions"
  echo "Live:  https://ben-whitesides.github.io/dungeon-x/"
else
  echo "Cancelled."
fi
