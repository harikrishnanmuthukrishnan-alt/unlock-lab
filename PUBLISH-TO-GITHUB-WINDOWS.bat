@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title UNLOCK Lab - Publish to GitHub

echo ========================================================
echo  UNLOCK Lab - Publish project to YOUR GitHub repository

echo  Repository: harikrishnanmuthukrishnan-alt/unlock-lab

echo ========================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo ERROR: Git is not installed or not on PATH.
  echo Install Git for Windows: https://git-scm.com/downloads/win
  echo Then reopen this script.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo ERROR: package.json not found. Run this file inside the unlock-lab folder.
  pause
  exit /b 1
)

if not exist ".git" git init
if errorlevel 1 goto :failure

REM Never send real secrets or runtime demo data to a public repository.
git add .
if errorlevel 1 goto :failure

git diff --cached --name-only | findstr /I /R "^\.env$ ^data/db\.json$" >nul
if not errorlevel 1 (
  echo ERROR: A private .env or runtime db.json was staged. Publish stopped.
  git reset -q -- .env data/db.json >nul 2>nul
  pause
  exit /b 1
)

for /f "delims=" %%i in ('git config --get user.name 2^>nul') do set "GITNAME=%%i"
if not defined GITNAME (
  echo Git needs a display name for the commit author.
  set /p "GITNAME=Enter Git commit author name: "
  git config user.name "!GITNAME!"
)
for /f "delims=" %%i in ('git config --get user.email 2^>nul') do set "GITEMAIL=%%i"
if not defined GITEMAIL (
  echo Git needs an email for commit attribution (a GitHub no-reply email also works).
  set /p "GITEMAIL=Enter commit email: "
  git config user.email "!GITEMAIL!"
)

git diff --cached --quiet
if errorlevel 1 (
  git commit -m "UNLOCK Lab hackathon demo - source and judging kit"
  if errorlevel 1 goto :failure
) else (
  echo No new tracked changes to commit.
)

git branch -M main
if errorlevel 1 goto :failure

git remote get-url origin >nul 2>nul
if errorlevel 1 (
  git remote add origin https://github.com/harikrishnanmuthukrishnan-alt/unlock-lab.git
  if errorlevel 1 goto :failure
) else (
  for /f "delims=" %%i in ('git remote get-url origin') do set "CURRENT_REMOTE=%%i"
  if /I not "!CURRENT_REMOTE!"=="https://github.com/harikrishnanmuthukrishnan-alt/unlock-lab.git" (
    echo ERROR: This folder points to a different remote: !CURRENT_REMOTE!
    echo Aborting to protect your other repositories.
    pause
    exit /b 1
  )
)

echo.
echo Pushing code to your GitHub account. A browser authentication prompt may open.
git push -u origin main
if errorlevel 1 goto :failure

echo.
echo SUCCESS: Source published to:
echo https://github.com/harikrishnanmuthukrishnan-alt/unlock-lab
echo.
echo Next: Create a Render Web Service from this GitHub repository.
pause
exit /b 0

:failure
echo.
echo Publish failed. Nothing was uploaded completely.
echo Check the error above. GitHub login may be required in your browser.
pause
exit /b 1
