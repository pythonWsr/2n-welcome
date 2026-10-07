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
setlocal

REM 检查 node
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] node not found in PATH.
  echo Please install Node.js: https://nodejs.org/
  exit /b 1
)

REM 转发到 2nUpdate.mjs，透传所有参数
node "%~dp02nUpdate.mjs" %*
exit /b %errorlevel%
