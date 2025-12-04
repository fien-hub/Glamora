#!/bin/bash

# Glamora Database Migration Runner
# This script runs all pending migrations on your Supabase instance

set -e  # Exit on error

echo "🚀 Glamora Database Migration Runner"
echo "===================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "📦 Install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if we're linked to a project
if [ ! -f ".supabase/config.toml" ]; then
    echo "⚠️  Not linked to a Supabase project"
    echo "🔗 Run: supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    echo "Your project ref can be found in your Supabase dashboard URL:"
    echo "https://supabase.com/dashboard/project/YOUR_PROJECT_REF"
    exit 1
fi

echo "📋 Migrations to run:"
echo ""

# List all migration files
for file in migrations/*.sql; do
    if [ -f "$file" ]; then
        echo "  - $(basename "$file")"
    fi
done

echo ""
echo "⚠️  WARNING: This will modify your database!"
echo "📸 Make sure you have a backup if needed."
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled"
    exit 0
fi

echo ""
echo "🔄 Running migrations..."
echo ""

# Run migrations
supabase db push

echo ""
echo "✅ All migrations completed successfully!"
echo ""
echo "📊 Next steps:"
echo "  1. Verify tables in Supabase dashboard"
echo "  2. Check RLS policies are enabled"
echo "  3. Test the app with new features"

