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
:;         echo "[OK] 已生成: $OUT"
:;         exit 0
:;     else
:;         echo "[ERROR] 转换失败，请确认 iconv 已安装（pkg install iconv）" >&2
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
if /i "%~1"=="-f" goto :parse_f
if /i "%~1"=="--allow-empty" goto :parse_ae
if /i "%~1"=="-r" goto :parse_r
if /i "%~1"=="--revert" goto :parse_r
if /i "%~1"=="-m" goto :parse_m
if /i "%~1"=="-h" goto :help
if /i "%~1"=="--help" goto :help
echo 未知参数: %~1
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
set "CONFLICT_MSG=-f 重复出现"
goto :conflict

:parse_ae
if "!HAS_ALLOW_EMPTY_ARG!"=="true" goto :err_dup_ae
set HAS_ALLOW_EMPTY_ARG=true
set ALLOW_EMPTY=true
shift
goto :parse

:err_dup_ae
set "CONFLICT_MSG=--allow-empty 重复出现"
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
set "CONFLICT_MSG=%~1 重复出现"
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
echo [WARN] -m 后未提供信息，将进入交互提示
shift
goto :parse

:err_dup_m
set "CONFLICT_MSG=-m 重复出现"
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
set "CONFLICT_MSG=-r/--revert 不能与!CFL! 同时使用"
goto :conflict

:conflict
echo [ERROR] 参数冲突: !CONFLICT_MSG!
echo.
call :usage
exit /b 1

:usage
echo 用法: %~nx0 [-f] [-m "提交信息"] [--allow-empty] [-r ^| --revert [sha]]
echo   -f                  强制模式，跳过远程差异检查
echo   -m "提交信息"        提交信息
echo   --allow-empty       允许空提交
echo   -r, --revert [sha]  回退到指定提交并强制推送
echo                       不带 sha 时仅 fetch 并显示 git log --oneline
echo   -h, --help          显示本帮助
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

echo [LOG] 获取远程最新状态...
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

echo [OK] 本地与远程无差异，继续推送流程...
del "%DIFFFILE%" 2>nul
goto :push

:err_fetch
echo 获取失败，请检查网络或SSH配置
exit /b 1

:err_nobranch
echo 无法检测当前分支
exit /b 1

:handle_diff
echo.
echo [WARN] 本地与远程 %BRANCH% 存在差异的文件:
type "%DIFFFILE%"
echo.

echo [BACKUP] 备份本地版本到 .local\ ...
if not exist ".local" mkdir ".local"
for /f "usebackq delims=" %%F in ("%DIFFFILE%") do call :backup_file "%%F"

echo.
echo 使用远程 origin/%BRANCH% 覆盖本地文件...
for /f "usebackq delims=" %%F in ("%DIFFFILE%") do call :overwrite_file "%%F"

echo.
echo [OK] 已用远程文件覆盖本地文件，本地版本已备份到 .local\
echo 请手动合并 .local\ 中的内容到项目文件后再推送。
del "%DIFFFILE%" 2>nul
exit /b 0

:backup_file
set "GFILE=%~1"
if "!GFILE!"=="" exit /b 0
set "FILE=!GFILE:/=\!"
if not exist "!FILE!" exit /b 0
for %%G in ("!FILE!") do mkdir ".local\%%~pG" 2>nul
copy /y "!FILE!" ".local\!FILE!" >nul
echo   已备份: !GFILE! -^> .local\!GFILE!
exit /b 0

:overwrite_file
set "GFILE=%~1"
if "!GFILE!"=="" exit /b 0
set "FILE=!GFILE:/=\!"
git cat-file -e "origin/%BRANCH%:!GFILE!" 2>nul
if !errorlevel! neq 0 goto :overwrite_delete
git checkout "origin/%BRANCH%" -- "!GFILE!"
echo   已覆盖: !GFILE!
exit /b 0

:overwrite_delete
del /f /q "!FILE!" 2>nul
echo   已删除: !GFILE! [远程已不存在]
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
echo [OK] 推送完成！
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
echo [OK] 回退并推送完成！
exit /b 0

:err_reset
echo 回退失败，请检查 SHA 是否有效。
exit /b 1

:revert_nosha
echo [LOG] git log --oneline
git log --oneline
echo.
echo [INFO] 未提供 SHA，未执行回退。
echo 请重新运行并指定要回退到的 SHA，例如:
echo   %~nx0 -r [sha]
exit /b 0
