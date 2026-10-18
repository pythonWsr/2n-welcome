@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] node not found in PATH.
  echo Please install Node.js: https://nodejs.org/
  pause
  exit /b 1
)

set "MODE=auto"
set "ARGS=%*"

set "ARGS=!ARGS: --git=!"
set "ARGS=!ARGS: --email=!"
set "ARGS=!ARGS: --auto=!"
set "ARGS=!ARGS:--git =!"
set "ARGS=!ARGS:--email =!"
set "ARGS=!ARGS:--auto =!"
if "!ARGS:~0,6!"=="--git " set "ARGS=!ARGS:~6!"
if "!ARGS:~0,8!"=="--email " set "ARGS=!ARGS:~8!"
if "!ARGS:~0,7!"=="--auto " set "ARGS=!ARGS:~7!"
if "!ARGS!"=="--git" set "ARGS="
if "!ARGS!"=="--email" set "ARGS="
if "!ARGS!"=="--auto" set "ARGS="

echo %* | findstr /C:"--email" >nul && set "MODE=email"
echo %* | findstr /C:"--git" >nul && set "MODE=git"

if "!MODE!"=="email" goto RUN_PY
if "!MODE!"=="git" goto RUN_MJS

set "NODE_CHECK=const fs=require('fs'); const p=process.argv[1]; const env=process.env.EMAIL_ADDRESS||process.env.QQ_EMAIL; if(!env) process.exit(1); try { const d=JSON.parse(fs.readFileSync(p,'utf8')); if(d.recipients.some(r=>r.email===env)) process.exit(0); } catch(e){} process.exit(1);"

node -e "!NODE_CHECK!" "%~dp0config\mail-recipients.json"
if !errorlevel! equ 0 (
    goto RUN_PY
) else (
    goto RUN_MJS
)

:RUN_PY
where python >nul 2>nul
if %errorlevel% neq 0 (
  goto RUN_MJS
)

python "%~dp0receive_update.py" !ARGS!
if !errorlevel! neq 0 (
)
exit /b !errorlevel!

:RUN_MJS
node "%~dp02nUpdate.mjs" !ARGS!
exit /b %errorlevel%
