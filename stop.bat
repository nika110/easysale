@echo off
REM EasySale - Stop All Services Script (Windows)

echo Stopping EasySale services...
echo.

REM Stop Hardhat node
taskkill /F /FI "WINDOWTITLE eq hardhat*" >nul 2>&1
taskkill /F /FI "IMAGENAME eq node.exe" /FI "COMMANDLINE eq *hardhat node*" >nul 2>&1

REM Stop backend
taskkill /F /FI "IMAGENAME eq python.exe" /FI "COMMANDLINE eq *uvicorn*" >nul 2>&1

echo All services stopped!
echo.
pause

