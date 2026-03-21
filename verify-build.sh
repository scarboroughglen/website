#!/bin/bash

echo "🔍 Verifying Scarborough Glen HOA Portal Build..."
echo ""

# Check for essential files
echo "📁 Checking essential files..."
files=(
    "Dockerfile"
    "docker-compose.yml"
    "package.json"
    "prisma/schema.prisma"
    "app/page.tsx"
    "app/login/page.tsx"
    "app/dashboard/page.tsx"
    "lib/auth.ts"
    "lib/prisma.ts"
)

missing=0
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file - MISSING"
        missing=$((missing + 1))
    fi
done

echo ""
if [ $missing -eq 0 ]; then
    echo "✅ All essential files present!"
else
    echo "❌ $missing files missing"
    exit 1
fi

# Check directory structure
echo ""
echo "📂 Checking directories..."
dirs=(
    "app/api/auth"
    "app/api/documents"
    "data"
    "prisma/migrations"
    "lib"
)

for dir in "${dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "  ✅ $dir"
    else
        echo "  ❌ $dir - MISSING"
    fi
done

echo ""
echo "🎉 Build verification complete!"
echo ""
echo "To start the application:"
echo "  docker compose up --build"
echo ""
echo "Then visit: http://localhost:3000"
