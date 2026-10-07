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
:;     OUT="$DIR/sync-from-copy-gbk.bat"
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

echo ==========================================
echo   3D 项目同步：调用 sync-from-copy.mjs
echo ==========================================
echo.

REM ---------- 检查 node ----------
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] 未找到 node 命令。
  echo.
  echo 请安装 Node.js: https://nodejs.org/
  echo 安装后重新运行本脚本。
  echo.
  exit /b 1
)

REM ---------- 调用 .mjs 脚本 ----------
REM %~dp0 = 本 .bat 所在目录（带尾部反斜杠）
REM sync-from-copy.mjs 就在同目录下
node "%~dp0sync-from-copy.mjs" %*

set "EXITCODE=%errorlevel%"
echo.
if %EXITCODE% neq 0 (
  echo [FAIL] sync-from-copy.mjs 退出码：%EXITCODE%
) else (
  echo [OK] 同步完成。
)
exit /b %EXITCODE%
