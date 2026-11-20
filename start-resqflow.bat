@echo off
setlocal
cd /d "%~dp0"
title RESQFLOW AI Launcher

echo ========================================
echo RESQFLOW AI - Local Demo Launcher
echo ========================================

if not exist "backend\requirements.txt" (
  echo ERROR: Run this file from the resqflow-ai project folder.
  pause
  exit /b 1
)

set "PYTHON_EXE=backend\venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" set "PYTHON_EXE=backend\.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
  echo Creating Python virtual environment...
  py -3.12 -m venv backend\venv 2>nul
  if errorlevel 1 python -m venv backend\venv
  if errorlevel 1 (
    echo ERROR: Python is required. Install Python 3.12 and retry.
    pause
    exit /b 1
  )
  set "PYTHON_EXE=backend\venv\Scripts\python.exe"
)

"%PYTHON_EXE%" -c "import uvicorn, fastapi, sqlalchemy, jwt, qrcode" >nul 2>&1
if errorlevel 1 (
  echo Installing backend requirements (first run may take a few minutes)...
  "%PYTHON_EXE%" -m pip install -r backend\requirements.txt
  if errorlevel 1 (
    echo ERROR: Backend dependency installation failed.
    pause
    exit /b 1
  )
)

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js and npm are required. Install Node.js LTS.
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo Installing frontend dependencies (first run may take a few minutes)...
  call npm install
  if errorlevel 1 (
    echo ERROR: Frontend dependency installation failed.
    pause
    exit /b 1
  )
)

rem Keep backend and frontend in separate visible terminal windows.
start "RESQFLOW AI Backend - 8000" "%CD%\backend\start-backend.bat"

echo Waiting for backend health check...
for /l %%N in (1,1,25) do (
  powershell -NoProfile -Command "try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/health' -TimeoutSec 2; if ($r.status -eq 'ok') { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 goto backend_ready
  timeout /t 1 /nobreak >nul
)
echo WARNING: Backend did not pass health check. Review the backend window.
:backend_ready
start "RESQFLOW AI Frontend - 5173" "%CD%\start-frontend.bat"
echo.
echo Backend: http://127.0.0.1:8000/docs
echo Frontend: http://localhost:5173
echo Close both server windows to stop the project.
echo This is a fictional-data simulation, not a real emergency system.
echo.
pause
