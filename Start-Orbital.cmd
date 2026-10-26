@echo off
cd /d "%~dp0"
echo ORBITAL - Local research observatory
echo URL: http://127.0.0.1:5173/
echo Press Ctrl+C to stop the local server.
if not exist node_modules (
  call npm.cmd install
  if errorlevel 1 exit /b 1
)
call npm.cmd run dev
