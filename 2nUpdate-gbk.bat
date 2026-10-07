@echo off
chcp 65001 >nul 2>&1
setlocal

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] node not found in PATH.
  echo Please install Node.js: https://nodejs.org/
  exit /b 1
)

node "%~dp02nUpdate.mjs" %*
exit /b %errorlevel%
