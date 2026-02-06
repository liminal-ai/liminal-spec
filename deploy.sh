#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-$HOME/.claude/skills/liminal-spec}"

# Files/dirs to exclude from deployment (dev artifacts)
EXCLUDES=(
  "CHANGELOG.md"
  "V2-ROADMAP.md"
  "deploy.sh"
  ".DS_Store"
  ".git"
)

# Build exclude args for rsync
EXCLUDE_ARGS=""
for item in "${EXCLUDES[@]}"; do
  EXCLUDE_ARGS="$EXCLUDE_ARGS --exclude=$item"
done

mkdir -p "$TARGET"
rsync -av --delete $EXCLUDE_ARGS "$SCRIPT_DIR/" "$TARGET/"

echo ""
echo "Deployed liminal-spec skill to: $TARGET"
