#!/bin/bash
# Update YGOFM Helper on Raspberry Pi: pull, install, build, restart.
# Run from anywhere; uses the repo directory where this script lives.
# Usage: ./scripts/update-on-pi.sh   (or bash scripts/update-on-pi.sh)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Optional: backup decks/userdata before updating (survives failed updates)
if [ -f data/userdata.json ]; then
  BACKUP="data/userdata.json.bak.$(date +%Y%m%d-%H%M%S)"
  cp data/userdata.json "$BACKUP"
  echo "Backed up userdata to $BACKUP"
fi

git pull
pnpm install
pnpm run build
sudo systemctl restart yugiohfm.service

echo "YGOFM Helper updated and restarted."
