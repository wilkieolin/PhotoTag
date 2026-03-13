#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== PhotoTag Setup ==="

# Backend dependencies
echo "Installing backend dependencies..."
cd "$PROJECT_DIR/backend"
pip install -r requirements.txt

# Frontend dependencies
echo "Installing frontend dependencies..."
cd "$PROJECT_DIR/frontend"
npm install

# Create data directories
mkdir -p "$PROJECT_DIR/data/thumbnails"
mkdir -p "$PROJECT_DIR/data/chromadb"

echo ""
echo "=== Setup complete ==="
echo "Run ./scripts/start.sh to start the application."
