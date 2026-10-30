@echo off
setlocal
cd /d "%~dp0"
title UNLOCK Lab - Local Setup
where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo [UNLOCK Lab] Node.js was not found.
  echo Install Node.js 20 or newer from https://nodejs.org/
  echo Then double-click this file again.
  echo.
  pause
  exit /b 1
)
set "PORT=3000"
echo Launching UNLOCK Lab on http://localhost:%PORT%
echo Keep the new server window open while using the app.
start "UNLOCK Lab Server" cmd /k "node server.js"
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"
echo.
echo If the page does not open, visit http://localhost:3000 in your browser.
echo To stop UNLOCK Lab, close the UNLOCK Lab Server window.
exit /b 0
