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
if /i "%~1"=="-f" (
    if "!HAS_FORCE_ARG!"=="true" (
        goto :conflict
    )
    set HAS_FORCE_ARG=true
    set FORCE=true
    shift
    goto :parse
)
if /i "%~1"=="--allow-empty" (
    if "!HAS_ALLOW_EMPTY_ARG!"=="true" (
        goto :conflict
    )
    set HAS_ALLOW_EMPTY_ARG=true
    set ALLOW_EMPTY=true
    shift
    goto :parse
)
if /i "%~1"=="-r" goto :parseRevert
if /i "%~1"=="--revert" goto :parseRevert
if /i "%~1"=="-m" (
    if "!HAS_MSG_ARG!"=="true" (
        goto :conflict
    )
    set HAS_MSG_ARG=true
    if "%~2"=="" (
        shift
        goto :parse
    ) else (
        set "MSG=%~2"
        shift
        shift
        goto :parse
    )
)
if /i "%~1"=="-h" goto :help
if /i "%~1"=="--help" goto :help
echo.
call :usage
exit /b 1

:parseRevert
if "!HAS_REVERT_ARG!"=="true" (
    goto :conflict
)
set HAS_REVERT_ARG=true
set REVERT_MODE=true
if "%~2"=="" (
    shift
    goto :parse
)
set "TMPARG=%~2"
if "!TMPARG:~0,1!"=="-" (
    shift
    goto :parse
)
set "REVERT_SHA=%~2"
shift
shift
goto :parse

:checkConflict
if /i "!REVERT_MODE!"=="true" (
    set "CFL="
    if /i "!HAS_MSG_ARG!"=="true"         set "CFL=!CFL! -m"
    if /i "!HAS_FORCE_ARG!"=="true"       set "CFL=!CFL! -f"
    if /i "!HAS_ALLOW_EMPTY_ARG!"=="true" set "CFL=!CFL! --allow-empty"
    if not "!CFL!"=="" (
        goto :conflict
    )
)
goto :checkForce

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

if not defined MSG (
    set /p MSG="commit message: "
    if not defined MSG set "MSG=a minor update"
)

if /i "%FORCE%"=="true" goto :push

git fetch origin
if %errorlevel% neq 0 (
    exit /b 1
)

for /f "tokens=*" %%i in ('git branch --show-current') do set "BRANCH=%%i"
if "%BRANCH%"=="" (
    exit /b 1
)

git diff --name-only HEAD "origin/%BRANCH%" > %temp%\diff_files.txt 2>&1
set HAS_DIFF=false
for %%F in (%temp%\diff_files.txt) do if %%~zF gtr 0 set HAS_DIFF=true
if "%HAS_DIFF%"=="true" (
    echo.
    type %temp%\diff_files.txt
    echo.

    if not exist ".local" mkdir ".local"
    for /f "usebackq delims=" %%F in ("%temp%\diff_files.txt") do (
        set "GFILE=%%F"
        set "FILE=!GFILE:/=\!"
        if not "!GFILE!"=="" (
            if exist "!FILE!" (
                for %%G in ("!FILE!") do (
                    if not "%%~pG"=="" if not exist ".local\%%~pG" mkdir ".local\%%~pG" 2>nul
                )
                copy /y "!FILE!" ".local\!FILE!" >nul
            )
        )
    )

    echo.
    for /f "usebackq delims=" %%F in ("%temp%\diff_files.txt") do (
        set "GFILE=%%F"
        set "FILE=!GFILE:/=\!"
        if not "!GFILE!"=="" (
            git cat-file -e "origin/%BRANCH%:!GFILE!" 2>nul
            if !errorlevel! == 0 (
                git checkout "origin/%BRANCH%" -- "!GFILE!"
            ) else (
                del /f /q "!FILE!" 2>nul
            )
        )
    )

    echo.
    del %temp%\diff_files.txt 2>nul
    exit /b 0
) else (
)
del %temp%\diff_files.txt 2>nul

:push
echo ==^> git add .
git add .
if /i "!ALLOW_EMPTY!"=="true" (
    echo ==^> git commit --allow-empty -m "!MSG!"
    git commit --allow-empty -m "!MSG!"
) else (
    echo ==^> git commit -m "!MSG!"
    git commit -m "!MSG!"
)
echo ==^> git branch -M main
git branch -M main
echo ==^> git push -u origin main -v
git push -u origin main -v
exit /b 0

:revert
echo ==^> git fetch origin
git fetch origin

if "%REVERT_SHA%"=="" (
    echo ==^> git log --oneline
    git log --oneline
    echo.
    echo   %~nx0 -r ^<sha^>
    exit /b 0
)

echo ==^> git reset --hard %REVERT_SHA%
git reset --hard %REVERT_SHA%
if %errorlevel% neq 0 (
    exit /b 1
)

echo ==^> git branch -M main
git branch -M main
echo ==^> git push -u origin main --force-with-lease -v
git push -u origin main --force-with-lease -v
exit /b 0
