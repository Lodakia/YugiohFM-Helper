#!/bin/bash
# Startup script for YGOFM Helper on Raspberry Pi
# This script can be used with systemd or run manually
# Supports both npm and pnpm (uses pnpm if available).

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Use pnpm if available, otherwise npm
if command -v pnpm &> /dev/null; then
    PKG_MGR="pnpm"
else
    PKG_MGR="npm"
fi

# Check if we should use production build or dev mode
MODE="${1:-production}"

if [ "$MODE" = "production" ]; then
    # Production mode: serve built files on port 3000
    if [ ! -d "dist" ]; then
        echo "Error: dist folder not found. Run '$PKG_MGR run build' first."
        exit 1
    fi
    
    # Check if serve is installed
    if ! command -v serve &> /dev/null; then
        echo "Installing 'serve' package..."
        $PKG_MGR install -g serve 2>/dev/null || npm install -g serve
    fi
    
    echo "Starting YGOFM Helper in production mode on port 3000..."
    echo "Access at http://<this-machine-ip>:3000"
    serve -s dist -l 3000 --hostname 0.0.0.0
else
    # Development mode: Vite dev server on port 5173 (not 3000!)
    echo "Starting YGOFM Helper in development mode on port 5173..."
    echo "Access at http://<this-machine-ip>:5173"
    $PKG_MGR run dev
fi
