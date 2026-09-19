:; # ===== bash polyglot 开始：Termux 中运行，Windows 忽略 =====
:; if [ -n "$BASH_VERSION" ]; then
:;     HAS_SHIFT=false
:;     for arg in "$@"; do
:;         [ "$arg" = "--shift" ] && HAS_SHIFT=true
:;     done
:;     if [ "$HAS_SHIFT" != "true" ]; then
:;         echo "Termux 模式仅支持 --shift 参数，其他参数将被忽略" >&2
:;         echo "用法: bash $0 --shift" >&2
:;         exit 1
:;     fi
:;     DIR="$(cd "$(dirname "$0")" && pwd)"
:;     OUT="$DIR/2nUpdate-gbk.bat"
:;     if iconv -f UTF-8 -t GBK//TRANSLIT "$0" | grep -v '^:;' > "$OUT"; then
:;         echo "✅ 已生成: $OUT"
:;         exit 0
:;     else
:;         echo "❌ 转换失败，请确认 iconv 已安装（pkg install iconv）" >&2
:;         exit 1
:;     fi
:; fi
:; # ===== bash polyglot 结束 =====
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
        set "CONFLICT_MSG=-f 重复出现"
        goto :conflict
    )
    set HAS_FORCE_ARG=true
    set FORCE=true
    shift
    goto :parse
)
if /i "%~1"=="--allow-empty" (
    if "!HAS_ALLOW_EMPTY_ARG!"=="true" (
        set "CONFLICT_MSG=--allow-empty 重复出现"
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
        set "CONFLICT_MSG=-m 重复出现"
        goto :conflict
    )
    set HAS_MSG_ARG=true
    if "%~2"=="" (
        echo 警告: -m 后未提供信息，将进入交互提示
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
echo 未知参数: %~1
echo.
call :usage
exit /b 1

:parseRevert
if "!HAS_REVERT_ARG!"=="true" (
    set "CONFLICT_MSG=%~1 重复出现"
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
        set "CONFLICT_MSG=-r/--revert 不能与!CFL! 同时使用"
        goto :conflict
    )
)
goto :checkForce

:conflict
echo 参数冲突: !CONFLICT_MSG!
echo.
call :usage
exit /b 1

:usage
echo 用法: %~nx0 [-f] [-m "提交信息"] [--allow-empty] [-r ^| --revert [sha]]
echo   -f                  强制模式，跳过远程差异检查
echo   -m "提交信息"        提交信息
echo   --allow-empty       允许空提交
echo   -r, --revert ^<sha^  回退到指定提交并强制推送
echo                       不带 ^<sha^ 时仅 fetch 并显示 git log --oneline
echo   -h, --help          显示本帮助
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

echo ==^> 获取远程最新状态...
git fetch origin
if %errorlevel% neq 0 (
    echo 获取失败，请检查网络或SSH配置
    exit /b 1
)

for /f "tokens=*" %%i in ('git branch --show-current') do set "BRANCH=%%i"
if "%BRANCH%"=="" (
    echo 无法检测当前分支
    exit /b 1
)

git diff --name-only HEAD "origin/%BRANCH%" > %temp%\diff_files.txt 2>&1
set HAS_DIFF=false
for %%F in (%temp%\diff_files.txt) do if %%~zF gtr 0 set HAS_DIFF=true
if "%HAS_DIFF%"=="true" (
    echo.
    echo 警告: 本地与远程 %BRANCH% 存在差异的文件:
    type %temp%\diff_files.txt
    echo.

    echo 备份本地版本到 .local\ ...
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
                echo   已备份: !GFILE! -^> .local\!GFILE!
            )
        )
    )

    echo.
    echo 使用远程 origin/%BRANCH% 覆盖本地文件...
    for /f "usebackq delims=" %%F in ("%temp%\diff_files.txt") do (
        set "GFILE=%%F"
        set "FILE=!GFILE:/=\!"
        if not "!GFILE!"=="" (
            git cat-file -e "origin/%BRANCH%:!GFILE!" 2>nul
            if !errorlevel! == 0 (
                git checkout "origin/%BRANCH%" -- "!GFILE!"
                echo   已覆盖: !GFILE!
            ) else (
                del /f /q "!FILE!" 2>nul
                echo   已删除: !GFILE! ^(远程已不存在^)
            )
        )
    )

    echo.
    echo 已用远程文件覆盖本地文件，本地版本已备份到 .local\
    echo 请手动合并 .local\ 中的内容到项目文件后再推送。
    del %temp%\diff_files.txt 2>nul
    exit /b 0
) else (
    echo 本地与远程无差异，继续推送流程...
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
echo 推送完成！
exit /b 0

:revert
echo ==^> git fetch origin
git fetch origin

if "%REVERT_SHA%"=="" (
    echo ==^> git log --oneline
    git log --oneline
    echo.
    echo 未提供 SHA，未执行回退。
    echo 请重新运行并指定要回退到的 SHA，例如:
    echo   %~nx0 -r ^<sha^>
    exit /b 0
)

echo ==^> git reset --hard %REVERT_SHA%
git reset --hard %REVERT_SHA%
if %errorlevel% neq 0 (
    echo 回退失败，请检查 SHA 是否有效。
    exit /b 1
)

echo ==^> git branch -M main
git branch -M main
echo ==^> git push -u origin main --force-with-lease -v
git push -u origin main --force-with-lease -v
echo 回退并推送完成！
exit /b 0
