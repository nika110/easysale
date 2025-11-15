#!/bin/bash

# EasySale - Stop All Services Script

echo "🛑 Stopping EasySale services..."
echo ""

# Stop backend
if [ -f .backend.pid ]; then
    BACKEND_PID=$(cat .backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo "✅ Backend stopped (PID: $BACKEND_PID)"
    fi
    rm .backend.pid
fi

# Stop Hardhat node
if [ -f .hardhat.pid ]; then
    HARDHAT_PID=$(cat .hardhat.pid)
    if kill -0 $HARDHAT_PID 2>/dev/null; then
        kill $HARDHAT_PID
        echo "✅ Blockchain node stopped (PID: $HARDHAT_PID)"
    fi
    rm .hardhat.pid
fi

# Kill any remaining processes
pkill -f "hardhat node" 2>/dev/null && echo "✅ Cleaned up remaining Hardhat processes"
pkill -f "uvicorn app.main:app" 2>/dev/null && echo "✅ Cleaned up remaining backend processes"

echo ""
echo "🎉 All services stopped!"

