@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo ==========================================
echo ==========================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo.
  echo.
  exit /b 1
)

node "%~dp0sync-from-copy.mjs" %*

set "EXITCODE=%errorlevel%"
echo.
if %EXITCODE% neq 0 (
) else (
)
exit /b %EXITCODE%
