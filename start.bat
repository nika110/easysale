@echo off
REM EasySale - Complete Setup and Start Script (Windows)

echo ================================
echo EasySale - Complete Setup
echo ================================
echo.

REM Step 1: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.11+
    exit /b 1
)

REM Step 2: Create virtual environment
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

REM Step 3: Activate venv and install Python dependencies
echo Installing Python dependencies...
call venv\Scripts\activate.bat
pip install -q -r requirements.txt

REM Step 4: Install blockchain dependencies
echo Installing blockchain dependencies...
cd blockchain
if not exist node_modules (
    call npm install --silent
)

REM Step 5: Start Hardhat node
echo Starting Hardhat blockchain node...
start /B cmd /c "npx hardhat node > ..\hardhat.log 2>&1"
timeout /t 5 /nobreak >nul

REM Step 6: Deploy contracts
echo Deploying smart contracts...
call npx hardhat run scripts/deploy_all.ts --network localhost > ..\deploy.log 2>&1

REM Step 7: Extract addresses and update .env
echo Updating configuration...
cd ..

REM Parse deployment log for addresses (simplified for Windows)
for /f "tokens=2" %%a in ('findstr /C:"PropertyFactory:" deploy.log') do set FACTORY_ADDRESS=%%a
for /f "tokens=2" %%a in ('findstr /C:"Marketplace:" deploy.log') do set MARKETPLACE_ADDRESS=%%a
for /f "tokens=2" %%a in ('findstr /C:"USDC:" deploy.log') do set USDC_ADDRESS=%%a

REM Create .env file
(
echo # Database
echo DATABASE_URL=sqlite+aiosqlite:///./app.db
echo.
echo # Initial user balance
echo INITIAL_USER_BALANCE_USD=10000.0
echo.
echo # Blockchain configuration
echo PROPERTY_FACTORY_ADDRESS=%FACTORY_ADDRESS%
echo BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
echo OWNER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
echo CHAIN_ID=1337
echo.
echo # Admin API key
echo ADMIN_API_KEY=your-secret-admin-key-change-this
) > .env

REM Step 8: Clean database
if exist app.db del app.db

REM Step 9: Start backend
echo Starting FastAPI backend...
start /B cmd /c "uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > backend.log 2>&1"
timeout /t 3 /nobreak >nul

echo.
echo ================================
echo EasySale is now running!
echo ================================
echo.
echo Service URLs:
echo   Backend API: http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo   Blockchain RPC: http://localhost:8545
echo.
echo Contract Addresses:
echo   PropertyFactory: %FACTORY_ADDRESS%
echo   Marketplace: %MARKETPLACE_ADDRESS%
echo   USDC: %USDC_ADDRESS%
echo.
echo To stop all services, run: stop.bat
echo.
echo Ready to use! Visit http://localhost:8000/docs
echo.
pause

