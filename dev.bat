@echo off
echo Starting FRM Desktop Development Server...

REM Start Vite dev server in background
start /B npm run dev:renderer

REM Wait a moment for Vite to start
timeout /t 3 /nobreak > nul

REM Start Electron main process
npm run dev:main

pause
