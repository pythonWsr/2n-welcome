@echo off
setlocal enabledelayedexpansion

set FORCE=false
set ALLOW_EMPTY=false
set REVERT_MODE=false
set REVERT_SHA=
set MSG=
set HAS_MSG_ARG=false
set HAS_FORCE_ARG=false
set HAS_ALLOW_EMPTY_ARG=false
set HAS_REVERT_ARG=false

:parse
if "%~1"=="" goto :checkConflict
if /i "%~1"=="-f" goto :parse_f
if /i "%~1"=="--allow-empty" goto :parse_ae
if /i "%~1"=="-r" goto :parse_r
if /i "%~1"=="--revert" goto :parse_r
if /i "%~1"=="-m" goto :parse_m
if /i "%~1"=="-h" goto :help
if /i "%~1"=="--help" goto :help
echo.
call :usage
exit /b 1

:parse_f
if "!HAS_FORCE_ARG!"=="true" goto :err_dup_f
set HAS_FORCE_ARG=true
set FORCE=true
shift
goto :parse

:err_dup_f
goto :conflict

:parse_ae
if "!HAS_ALLOW_EMPTY_ARG!"=="true" goto :err_dup_ae
set HAS_ALLOW_EMPTY_ARG=true
set ALLOW_EMPTY=true
shift
goto :parse

:err_dup_ae
goto :conflict

:parse_r
if "!HAS_REVERT_ARG!"=="true" goto :err_dup_r
set HAS_REVERT_ARG=true
set REVERT_MODE=true
if "%~2"=="" goto :parse_r_noval
set "TMPARG=%~2"
if "!TMPARG:~0,1!"=="-" goto :parse_r_noval
set "REVERT_SHA=%~2"
shift
shift
goto :parse

:parse_r_noval
shift
goto :parse

:err_dup_r
goto :conflict

:parse_m
if "!HAS_MSG_ARG!"=="true" goto :err_dup_m
set HAS_MSG_ARG=true
if "%~2"=="" goto :parse_m_noval
set "MSG=%~2"
shift
shift
goto :parse

:parse_m_noval
shift
goto :parse

:err_dup_m
goto :conflict

:checkConflict
if /i "!REVERT_MODE!"=="true" goto :checkConflict_r
goto :checkForce

:checkConflict_r
set "CFL="
if /i "!HAS_MSG_ARG!"=="true"         set "CFL=!CFL! -m"
if /i "!HAS_FORCE_ARG!"=="true"       set "CFL=!CFL! -f"
if /i "!HAS_ALLOW_EMPTY_ARG!"=="true" set "CFL=!CFL! --allow-empty"
if not "!CFL!"=="" goto :checkConflict_fail
goto :checkForce

:checkConflict_fail
goto :conflict

:conflict
echo.
call :usage
exit /b 1

:usage
exit /b 0

:help
call :usage
exit /b 0

:checkForce
if /i "%REVERT_MODE%"=="true" goto :revert

if not defined MSG goto :prompt_msg
goto :checkForce2

:prompt_msg
set /p MSG="commit message: "
if not defined MSG set "MSG=a minor update"

:checkForce2
if /i "%FORCE%"=="true" goto :push

git fetch origin
if %errorlevel% neq 0 goto :err_fetch

set "BRANCH="
for /f "tokens=*" %%i in ('git branch --show-current') do set "BRANCH=%%i"
if "%BRANCH%"=="" goto :err_nobranch

set "DIFFFILE=%temp%\diff_files.txt"
git diff --name-only HEAD "origin/%BRANCH%" > "%DIFFFILE%" 2>&1
set HAS_DIFF=false
for %%F in ("%DIFFFILE%") do if %%~zF gtr 0 set HAS_DIFF=true
if "%HAS_DIFF%"=="true" goto :handle_diff

del "%DIFFFILE%" 2>nul
goto :push

:err_fetch
exit /b 1

:err_nobranch
exit /b 1

:handle_diff
echo.
type "%DIFFFILE%"
echo.

if not exist ".local" mkdir ".local"
for /f "usebackq delims=" %%F in ("%DIFFFILE%") do call :backup_file "%%F"

echo.
for /f "usebackq delims=" %%F in ("%DIFFFILE%") do call :overwrite_file "%%F"

echo.
del "%DIFFFILE%" 2>nul
exit /b 0

:backup_file
set "GFILE=%~1"
if "!GFILE!"=="" exit /b 0
set "FILE=!GFILE:/=\!"
if not exist "!FILE!" exit /b 0
for %%G in ("!FILE!") do mkdir ".local\%%~pG" 2>nul
copy /y "!FILE!" ".local\!FILE!" >nul
exit /b 0

:overwrite_file
set "GFILE=%~1"
if "!GFILE!"=="" exit /b 0
set "FILE=!GFILE:/=\!"
git cat-file -e "origin/%BRANCH%:!GFILE!" 2>nul
if !errorlevel! neq 0 goto :overwrite_delete
git checkout "origin/%BRANCH%" -- "!GFILE!"
exit /b 0

:overwrite_delete
del /f /q "!FILE!" 2>nul
exit /b 0

:push
echo [LOG] git add .
git add .
if /i "!ALLOW_EMPTY!"=="true" goto :push_empty
echo [LOG] git commit -m "!MSG!"
git commit -m "!MSG!"
goto :push_branch

:push_empty
echo [LOG] git commit --allow-empty -m "!MSG!"
git commit --allow-empty -m "!MSG!"

:push_branch
echo [LOG] git branch -M main
git branch -M main
echo [LOG] git push -u origin main -v
git push -u origin main -v
exit /b 0

:revert
echo [LOG] git fetch origin
git fetch origin
if "%REVERT_SHA%"=="" goto :revert_nosha

echo [LOG] git reset --hard %REVERT_SHA%
git reset --hard %REVERT_SHA%
if %errorlevel% neq 0 goto :err_reset

echo [LOG] git branch -M main
git branch -M main
echo [LOG] git push -u origin main --force-with-lease -v
git push -u origin main --force-with-lease -v
exit /b 0

:err_reset
exit /b 1

:revert_nosha
echo [LOG] git log --oneline
git log --oneline
echo.
echo   %~nx0 -r [sha]
exit /b 0
