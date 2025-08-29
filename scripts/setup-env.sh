#!/bin/bash

# Unix/Mac environment setup script for BoardOS
# Sets up environment variables for the BoardOS Construction Scheduler

echo "🚀 BoardOS Environment Setup (Unix/Mac)"
echo "======================================="

# Check if .env file exists
if [ -f .env ]; then
    echo "✅ Found .env file"
    # Source the .env file to load variables
    export $(cat .env | grep -v '^#' | xargs)
    echo "📝 Environment variables loaded from .env file"
else
    echo "❌ No .env file found! Creating from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your Supabase credentials"
    echo "   Run: nano .env  (or your preferred editor)"
    exit 1
fi

# Verify required environment variables
if [ -z "$VITE_SUPABASE_URL" ]; then
    echo "❌ VITE_SUPABASE_URL not found in environment"
    exit 1
fi

if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "❌ VITE_SUPABASE_ANON_KEY not found in environment"
    exit 1
fi

echo "✅ Environment variables configured:"
echo "   📊 VITE_SUPABASE_URL: $VITE_SUPABASE_URL"
echo "   🔑 VITE_SUPABASE_ANON_KEY: [configured]"

echo ""
echo "🎯 Ready to run BoardOS commands:"
echo "   npm run dev           - Start development server"
echo "   npm run claude:start  - Start Claude session"
echo "   npm run migration:check - Check database status"
echo ""

# Test database connection
echo "🔍 Testing database connection..."
node scripts/check-migration.js

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful!"
else
    echo "⚠️  Database connection issues detected"
fi

echo ""
echo "🎉 Environment setup complete!"

# Make this script executable
chmod +x "$0"