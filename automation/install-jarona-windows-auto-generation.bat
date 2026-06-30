@echo off
setlocal
cd /d "%~dp0\.."

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or newer is required. Install it from https://nodejs.org and try again.
  pause
  exit /b 1
)

set "RUN_SCRIPT=%CD%\automation\run-jarona-scheduled.bat"

schtasks /Delete /TN "Jarona Auto Generate Hourly" /F >nul 2>nul
schtasks /Delete /TN "Jarona Auto Generate On Login" /F >nul 2>nul

schtasks /Create /SC HOURLY /MO 1 /TN "Jarona Auto Generate Hourly" /TR "\"%RUN_SCRIPT%\"" /F
if errorlevel 1 (
  echo Failed to create the hourly Jarona task.
  pause
  exit /b 1
)

schtasks /Create /SC ONLOGON /TN "Jarona Auto Generate On Login" /TR "\"%RUN_SCRIPT%\"" /F
if errorlevel 1 (
  echo Failed to create the on-login Jarona task.
  pause
  exit /b 1
)

echo.
echo Jarona background auto-generation is now installed on this Windows machine.
echo It checks every hour and also checks immediately after you log in.
pause
