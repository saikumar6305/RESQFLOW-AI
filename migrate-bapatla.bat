@echo off
cd /d "%~dp0"
echo STOP the backend before running this migration.
echo Existing database will be backed up. Only original Hyderabad demo rows are updated.
choice /M "Continue"
if errorlevel 2 exit /b 0
set "PY=backend\venv\Scripts\python.exe"
if not exist "%PY%" set "PY=backend\.venv\Scripts\python.exe"
if not exist "%PY%" (
  echo Python environment missing. Run start-resqflow.bat first.
  pause
  exit /b 1
)
"%PY%" backend\migrate_bapatla.py
pause
