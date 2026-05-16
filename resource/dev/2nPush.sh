#!/data/data/com.termux/files/usr/bin/bash
# 2nPush.sh - 一键 add、commit、推送 main 分支到 GitHub
# 用法: ./2nPush.sh [-m "提交信息"]
# 无 -m 参数时交互提示，留空则使用 "a minor update"

set -e

# 参数解析
while [[ $# -gt 0 ]]; do
    case "$1" in
        -m)
            shift
            if [[ $# -gt 0 ]]; then
                MSG="$1"
                shift
            else
                echo "⚠️  -m 后未提供信息，将进入交互提示" >&2
            fi
            ;;
        -h|--help)
            echo "用法: $0 [-m \"提交信息\"]"
            echo "示例: $0 -m \"fix core path\""
            echo "       $0               # 交互输入，默认 a minor update"
            exit 0
            ;;
        *)
            echo "❌ 未知参数: $1"
            echo "使用 -h 查看帮助"
            exit 1
            ;;
    esac
done

# 没有通过 -m 获得有效信息则交互输入
if [[ -z "$MSG" ]]; then
    read -p "commit message: " MSG
    if [[ -z "$MSG" ]]; then
        MSG="a minor update"
    fi
fi

echo "👉 git add ."
git add .

echo "👉 git commit -m \"$MSG\""
git commit -m "$MSG"

echo "👉 git branch -M main"
git branch -M main

echo "👉 git push -u origin main -v"
git push -u origin main -v

echo "✅ 推送完成！"