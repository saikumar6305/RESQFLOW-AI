@echo off
cd /d "%~dp0"
call npm run dev
echo Frontend stopped or failed.
pause
