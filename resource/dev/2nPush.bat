@echo off
setlocal enabledelayedexpansion

:: 2nPush.bat - 一键 add、commit、推送 main 分支到 GitHub
:: 用法: 2nPush.bat [-m "提交信息"]
:: 无 -m 参数时交互提示，留空则使用 "a minor update"

set "MSG="

:: 解析参数
set "argCount=0"
:parse
if "%~1"=="" goto :checkMsg
if /i "%~1"=="-m" (
    if "%~2"=="" (
        echo 警告: -m 后未提供信息，将进入交互提示
    ) else (
        set "MSG=%~2"
        shift
    )
    shift
    goto :parse
)
if /i "%~1"=="-h" goto :help
if /i "%~1"=="--help" goto :help
echo 未知参数: %~1
echo 使用 -h 查看帮助
exit /b 1

:help
echo 用法: %~nx0 [-m "提交信息"]
echo 示例: %~nx0 -m "fix core path"
echo        %~nx0               # 交互输入，默认 a minor update
exit /b 0

:checkMsg
:: 如果没有通过 -m 获得有效信息则交互输入
if not defined MSG (
    set /p MSG="commit message: "
    if not defined MSG set "MSG=a minor update"
)

:: 执行 Git 命令
echo.
echo ==^> git add .
git add .

echo ==^> git commit -m "!MSG!"
git commit -m "!MSG!"

echo ==^> git branch -M main
git branch -M main

echo ==^> git push -u origin main -v
git push -u origin main -v

echo.
echo 推送完成！
exit /b 0