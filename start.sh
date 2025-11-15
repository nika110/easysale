#!/bin/bash

# EasySale - Complete Setup and Start Script
# This script does everything: blockchain, contracts, backend

set -e  # Exit on error

echo "🚀 EasySale - Complete Setup"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "requirements.txt" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Step 1: Check dependencies
echo "📋 Step 1: Checking dependencies..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js first.${NC}"
    exit 1
fi

if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python not found. Please install Python 3.11+ first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies OK${NC}"
echo ""

# Step 2: Install Python dependencies
echo "📦 Step 2: Installing Python dependencies..."
if [ ! -d "venv" ]; then
    python -m venv venv 2>/dev/null || python3 -m venv venv
fi

source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null || . venv/bin/activate

pip install -q -r requirements.txt
echo -e "${GREEN}✅ Python dependencies installed${NC}"
echo ""

# Step 3: Install blockchain dependencies
echo "📦 Step 3: Installing blockchain dependencies..."
cd blockchain
if [ ! -d "node_modules" ]; then
    npm install --silent
fi
echo -e "${GREEN}✅ Blockchain dependencies installed${NC}"
echo ""

# Step 4: Start Hardhat node in background
echo "⛓️  Step 4: Starting Hardhat blockchain node..."
pkill -f "hardhat node" 2>/dev/null || true
npx hardhat node > ../hardhat.log 2>&1 &
HARDHAT_PID=$!
echo "Hardhat PID: $HARDHAT_PID"
sleep 5  # Wait for node to start
echo -e "${GREEN}✅ Blockchain node started${NC}"
echo ""

# Step 5: Deploy contracts
echo "📜 Step 5: Deploying smart contracts..."
npx hardhat run scripts/deploy_all.ts --network localhost > ../deploy.log 2>&1

# Extract addresses from deployment
FACTORY_ADDRESS=$(grep -oP 'PropertyFactory:\s+\K0x[a-fA-F0-9]{40}' ../deploy.log | head -1)
MARKETPLACE_ADDRESS=$(grep -oP 'Marketplace:\s+\K0x[a-fA-F0-9]{40}' ../deploy.log | head -1)
USDC_ADDRESS=$(grep -oP 'USDC:\s+\K0x[a-fA-F0-9]{40}' ../deploy.log | head -1)

echo -e "${GREEN}✅ Contracts deployed${NC}"
echo "  Factory: $FACTORY_ADDRESS"
echo "  Marketplace: $MARKETPLACE_ADDRESS"
echo "  USDC: $USDC_ADDRESS"
echo ""

cd ..

# Step 6: Update .env file
echo "⚙️  Step 6: Updating .env configuration..."
cat > .env << EOF
# Database
DATABASE_URL=sqlite+aiosqlite:///./app.db

# Initial user balance
INITIAL_USER_BALANCE_USD=10000.0

# Blockchain configuration
PROPERTY_FACTORY_ADDRESS=$FACTORY_ADDRESS
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
OWNER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CHAIN_ID=1337

# Admin API key for protected endpoints
ADMIN_API_KEY=your-secret-admin-key-change-this
EOF

echo -e "${GREEN}✅ Configuration updated${NC}"
echo ""

# Step 7: Initialize database
echo "💾 Step 7: Initializing database..."
rm -f app.db 2>/dev/null || true
echo -e "${GREEN}✅ Database ready${NC}"
echo ""

# Step 8: Start backend
echo "🌐 Step 8: Starting FastAPI backend..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 3
echo -e "${GREEN}✅ Backend started${NC}"
echo ""

# Save PIDs for cleanup
echo $HARDHAT_PID > .hardhat.pid
echo $BACKEND_PID > .backend.pid

# Final summary
echo "=============================="
echo -e "${GREEN}🎉 EasySale is now running!${NC}"
echo "=============================="
echo ""
echo "📋 Service URLs:"
echo "  Backend API: http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo "  Blockchain RPC: http://localhost:8545"
echo ""
echo "📝 Contract Addresses:"
echo "  PropertyFactory: $FACTORY_ADDRESS"
echo "  Marketplace: $MARKETPLACE_ADDRESS"
echo "  USDC: $USDC_ADDRESS"
echo ""
echo "📊 Logs:"
echo "  Blockchain: hardhat.log"
echo "  Deployment: deploy.log"
echo "  Backend: backend.log"
echo ""
echo "🛑 To stop all services, run: ./stop.sh"
echo ""
echo "✨ Ready to use! Visit http://localhost:8000/docs to get started."

