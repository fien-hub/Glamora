#!/bin/bash

# Glamora Installation Script
# This script helps set up the Glamora beauty services platform

set -e  # Exit on error

echo "🎨 Glamora Beauty Services Platform - Installation Script"
echo "=========================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo "📦 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo ""
    echo "Please install Node.js first:"
    echo "  macOS: brew install node"
    echo "  Or download from: https://nodejs.org/"
    echo ""
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js ${NODE_VERSION} is installed${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✅ npm ${NPM_VERSION} is installed${NC}"
echo ""

# Install mobile app dependencies
echo "📱 Installing mobile app dependencies..."
cd glamora-app
if [ -f "package.json" ]; then
    npm install
    echo -e "${GREEN}✅ Mobile app dependencies installed${NC}"
else
    echo -e "${RED}❌ package.json not found in glamora-app${NC}"
    exit 1
fi
cd ..
echo ""

# Install backend dependencies
echo "🔧 Installing backend dependencies..."
cd glamora-backend
if [ -f "package.json" ]; then
    npm install
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${RED}❌ package.json not found in glamora-backend${NC}"
    exit 1
fi
cd ..
echo ""

# Check for environment files
echo "🔐 Checking environment configuration..."

if [ ! -f "glamora-app/.env" ]; then
    echo -e "${YELLOW}⚠️  Mobile app .env file not found${NC}"
    echo "Creating from example..."
    cp glamora-app/.env.example glamora-app/.env
    echo -e "${YELLOW}⚠️  Please edit glamora-app/.env with your Supabase and Stripe keys${NC}"
fi

if [ ! -f "glamora-backend/.env" ]; then
    echo -e "${YELLOW}⚠️  Backend .env file not found${NC}"
    echo "Creating from example..."
    cp glamora-backend/.env.example glamora-backend/.env
    echo -e "${YELLOW}⚠️  Please edit glamora-backend/.env with your Supabase and Stripe keys${NC}"
fi
echo ""

# Installation complete
echo "=========================================================="
echo -e "${GREEN}✅ Installation Complete!${NC}"
echo "=========================================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Set up Supabase:"
echo "   - Create a project at https://supabase.com"
echo "   - Run the SQL migrations from glamora-backend/supabase/"
echo "   - Copy your Supabase URL and keys"
echo ""
echo "2. Set up Stripe:"
echo "   - Create an account at https://stripe.com"
echo "   - Get your API keys from the dashboard"
echo ""
echo "3. Configure environment variables:"
echo "   - Edit glamora-app/.env"
echo "   - Edit glamora-backend/.env"
echo ""
echo "4. Start the backend:"
echo "   cd glamora-backend"
echo "   npm run dev"
echo ""
echo "5. Start the mobile app (in a new terminal):"
echo "   cd glamora-app"
echo "   npm start"
echo ""
echo "📖 For detailed setup instructions, see SETUP_GUIDE.md"
echo ""
echo "🎉 Happy coding!"

