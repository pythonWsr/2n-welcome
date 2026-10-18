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
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

REM 检查 node 环境 (两个模式都需要 node 来执行自动化)
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] node not found in PATH.
  echo Please install Node.js: https://nodejs.org/
  pause
  exit /b 1
)

set "MODE=auto"
set "ARGS=%*"

REM === 精准剥离用户传入的控制参数，防止影响 -m 的提交信息 ===
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

REM === 判断用户指定的模式 ===
echo %* | findstr /C:"--email" >nul && set "MODE=email"
echo %* | findstr /C:"--git" >nul && set "MODE=git"

if "!MODE!"=="email" goto RUN_PY
if "!MODE!"=="git" goto RUN_MJS

REM === Auto 模式：自动检测 ===
REM 读取环境变量并比对绝对路径下的 JSON
set "NODE_CHECK=const fs=require('fs'); const p=process.argv[1]; const env=process.env.EMAIL_ADDRESS||process.env.QQ_EMAIL; if(!env) process.exit(1); try { const d=JSON.parse(fs.readFileSync(p,'utf8')); if(d.recipients.some(r=>r.email===env)) process.exit(0); } catch(e){} process.exit(1);"

node -e "!NODE_CHECK!" "%~dp0config\mail-recipients.json"
if !errorlevel! equ 0 (
    echo [INFO] Auto 模式：环境变量邮箱匹配成功，选择【邮件拉取】模式...
    goto RUN_PY
) else (
    echo [INFO] Auto 模式：未匹配到环境变量邮箱，选择【Git 直连】模式...
    goto RUN_MJS
)

:RUN_PY
where python >nul 2>nul
if %errorlevel% neq 0 (
  echo [WARN] 需要邮件模式，但未在 PATH 中找到 python。
  echo [WARN] 环境缺失，正在自动降级至【Git 直连】模式...
  goto RUN_MJS
)

REM 如果你的 Python 脚本名不是 receive_update.py，请在此修改
python "%~dp0receive_update.py" !ARGS!
if !errorlevel! neq 0 (
    echo [WARN] Python 脚本执行异常退出 (错误码 !errorlevel!)，你可以手动运行 --git 模式。
)
exit /b !errorlevel!

:RUN_MJS
node "%~dp02nUpdate.mjs" !ARGS!
exit /b %errorlevel%
