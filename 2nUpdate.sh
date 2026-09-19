#!/data/data/com.termux/files/usr/bin/bash
set -e

FORCE=false
ALLOW_EMPTY=false
REVERT_MODE=false
REVERT_SHA=""
MSG=""
HAS_MSG_ARG=false
HAS_FORCE_ARG=false
HAS_ALLOW_EMPTY_ARG=false
HAS_REVERT_ARG=false

usage() {
    cat <<EOF
用法: $0 [-f] [-m "提交信息"] [--allow-empty] [-r|--revert [sha]]
选项:
  -f                  强制模式，跳过远程差异检查
  -m "提交信息"        提交信息
  --allow-empty       允许空提交
  -r, --revert <sha>  回退到指定提交并强制推送
                      不带 <sha> 时仅 fetch 并显示 git log --oneline
  -h, --help          显示本帮助
EOF
}

conflict_exit() {
    echo "❌ 参数冲突: $1" >&2
    echo "" >&2
    usage >&2
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -f)
            [[ "$HAS_FORCE_ARG" == true ]] && conflict_exit "-f 重复出现"
            HAS_FORCE_ARG=true
            FORCE=true
            shift
            ;;
        --allow-empty)
            [[ "$HAS_ALLOW_EMPTY_ARG" == true ]] && conflict_exit "--allow-empty 重复出现"
            HAS_ALLOW_EMPTY_ARG=true
            ALLOW_EMPTY=true
            shift
            ;;
        -r|--revert)
            [[ "$HAS_REVERT_ARG" == true ]] && conflict_exit "$1 重复出现"
            HAS_REVERT_ARG=true
            REVERT_MODE=true
            if [[ $# -gt 1 && "$2" != -* ]]; then
                REVERT_SHA="$2"
                shift 2
            else
                shift
            fi
            ;;
        -m)
            [[ "$HAS_MSG_ARG" == true ]] && conflict_exit "-m 重复出现"
            HAS_MSG_ARG=true
            shift
            if [[ $# -gt 0 ]]; then
                MSG="$1"
                shift
            else
                echo "⚠️  -m 后未提供信息，将进入交互提示" >&2
            fi
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "❌ 未知参数: $1" >&2
            echo "" >&2
            usage >&2
            exit 1
            ;;
    esac
done

# ============ 冲突检测 ============
if [[ "$REVERT_MODE" == true ]]; then
    conflicts=()
    [[ "$HAS_MSG_ARG" == true ]]         && conflicts+=("-m")
    [[ "$HAS_FORCE_ARG" == true ]]       && conflicts+=("-f")
    [[ "$HAS_ALLOW_EMPTY_ARG" == true ]] && conflicts+=("--allow-empty")
    if [[ ${#conflicts[@]} -gt 0 ]]; then
        conflict_exit "-r/--revert 不能与 ${conflicts[*]} 同时使用"
    fi
fi

# ============ 回退模式 ============
if [[ "$REVERT_MODE" == true ]]; then
    echo "👉 获取远程最新状态..."
    git fetch origin

    if [[ -z "$REVERT_SHA" ]]; then
        echo "👉 git log --oneline"
        git log --oneline
        echo ""
        echo "ℹ️  未提供 SHA，未执行回退。"
        echo "   请重新运行并指定要回退到的 SHA，例如:"
        echo "     $0 -r <sha>"
        exit 0
    fi

    echo "👉 git reset --hard $REVERT_SHA"
    git reset --hard "$REVERT_SHA"

    echo "👉 git branch -M main"
    git branch -M main

    echo "👉 git push -u origin main --force-with-lease -v"
    git push -u origin main --force-with-lease -v

    echo "✅ 回退并推送完成！"
    exit 0
fi

# ============ 提交信息获取 ============
if [[ -z "$MSG" ]]; then
    read -p "commit message: " MSG
    [[ -z "$MSG" ]] && MSG="a minor update"
fi

# ============ 非强制模式：检查远程差异 ============
if [[ "$FORCE" != true ]]; then
    echo "👉 获取远程最新状态..."
    git fetch origin

    BRANCH=$(git branch --show-current)
    if [[ -z "$BRANCH" ]]; then
        echo "❌ 无法检测当前分支"
        exit 1
    fi

    DIFF_FILES=$(git diff --name-only HEAD "origin/$BRANCH" 2>/dev/null || true)
    if [[ -n "$DIFF_FILES" ]]; then
        echo ""
        echo "⚠️  本地与远程 $BRANCH 存在差异的文件:"
        echo "$DIFF_FILES" | sed 's/^/  /'
        echo ""

        # ---- 备份本地版本到 .local/ ----
        echo "📦 备份本地版本到 .local/ ..."
        mkdir -p .local
        while IFS= read -r f; do
            [[ -z "$f" ]] && continue
            if [[ -f "$f" ]]; then
                d=$(dirname "$f")
                [[ "$d" != "." ]] && mkdir -p ".local/$d"
                cp -p "$f" ".local/$f"
                echo "  已备份: $f -> .local/$f"
            fi
        done <<< "$DIFF_FILES"

        # ---- 强制用远程文件覆盖本地 ----
        echo "👉 使用远程 origin/$BRANCH 覆盖本地文件..."
        while IFS= read -r f; do
            [[ -z "$f" ]] && continue
            if git cat-file -e "origin/$BRANCH:$f" 2>/dev/null; then
                git checkout "origin/$BRANCH" -- "$f"
                echo "  已覆盖: $f"
            else
                rm -f "$f"
                echo "  已删除: $f（远程已不存在）"
            fi
        done <<< "$DIFF_FILES"

        echo ""
        echo "✅ 已用远程文件覆盖本地文件，本地版本已备份到 .local/"
        echo "   请手动合并 .local/ 中的内容到项目文件后再推送。"
        exit 0
    else
        echo "✅ 本地与远程无差异，继续推送流程..."
    fi
fi

# ============ 正常推送 ============
echo "👉 git add ."
git add .
if [[ "$ALLOW_EMPTY" == true ]]; then
    echo "👉 git commit --allow-empty -m \"$MSG\""
    git commit --allow-empty -m "$MSG"
else
    echo "👉 git commit -m \"$MSG\""
    git commit -m "$MSG"
fi
echo "👉 git branch -M main"
git branch -M main
echo "👉 git push -u origin main -v"
git push -u origin main -v
echo "✅ 推送完成！"
