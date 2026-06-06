@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start-dev.ps1" %*

if errorlevel 1 (
  echo.
  echo Startup failed. Press any key to close this window.
  pause >nul
)
