#!/bin/bash
set -e

echo "========================================"
echo "🎨 Formatting and Linting Frontend..."
echo "========================================"
cd frontend
npm run format
npm run lint
cd ..

echo ""
echo "========================================"
echo "🎨 Formatting and Linting Backend..."
echo "========================================"
cd backend
make format
make lint
cd ..

echo ""
echo "✅ Done! All code formatted and linted."
