@echo off
setlocal

cd /d "%~dp0.."

where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found. Please install Python and add it to PATH.
  pause
  exit /b 1
)

python ".\resource-tools\app.py"
if errorlevel 1 (
  echo.
  echo Resource Tools exited with an error.
  pause
  exit /b 1
)

endlocal
