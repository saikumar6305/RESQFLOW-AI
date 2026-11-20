@echo off
cd /d "%~dp0"
set "PYTHON_EXE=backend\venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" set "PYTHON_EXE=backend\.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
  echo Python environment not found. Run start-resqflow.bat first.
  pause
  exit /b 1
)
"%PYTHON_EXE%" backend\integration_check.py
pause
