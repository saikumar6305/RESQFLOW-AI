@echo off
cd /d "%~dp0"
set "PY=backend\venv\Scripts\python.exe"
if not exist "%PY%" set "PY=backend\.venv\Scripts\python.exe"
if not exist "%PY%" (
  echo Python environment missing. Run start-resqflow.bat first.
  pause
  exit /b 1
)
"%PY%" backend\setup_admin.py
pause
