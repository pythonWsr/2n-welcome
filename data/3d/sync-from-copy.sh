#!/usr/bin/env bash
# data/3d/sync-from-copy.sh
#
# 从 origin/copy/* 分支同步 3D 项目源码到 main 分支。
#
# 规则：
#   1. 本地从未改过 → 直接用上游覆盖
#   2. 本地改过（LOCALLY_MODIFIED）或位于 LOCALLY_RESERVED_PREFIXES 前缀下
#      的文件 → 保留本地，上游版本另存到 .local/3d-sync/<path>.upstream，
#      并尝试自动应用已知补丁
#   3. 本地删过的文件（LOCALLY_DELETED）→ 不从上游同步回来
#   4. 上游新增的文件 → 直接落地
#   5. 上游已删、本地还在的文件 → 移到 .history/<时间戳>/
#   6. SYNC_EXCLUDES 里的路径 → 完全跳过
#   7. 上游 .gitignore 的规则（除 GITIGNORE_SKIP_RULES）→ 加前缀后写入
#      根 .gitignore 的自动区块
#
# 用法：
#   bash data/3d/sync-from-copy.sh
#   bash data/3d/sync-from-copy.sh --dry-run
#   bash data/3d/sync-from-copy.sh --branch=<name>

set -euo pipefail

# ============ 配置 ============
COPY_BRANCH_PREFIX="origin/copy/"
COPY_SOURCE_PATH=""                                 # copy 分支里 3D 项目路径；空=仓库根
LOCAL_TARGET="data/3d/2n-spatial-world"
BACKUP_DIR=".local/3d-sync"
HISTORY_DIR=".history"

# 根 .gitignore 的自动区块标记
ROOT_GITIGNORE=".gitignore"
GITIGNORE_BLOCK_BEGIN="# BEGIN 3d-auto-sync"
GITIGNORE_BLOCK_END="# END 3d-auto-sync"
GITIGNORE_PATH_PREFIX="/data/3d/2n-spatial-world/"

# 上游 .gitignore 中需要跳过的规则（不写入根文件）
# dist/ 需要被提交，故排除
GITIGNORE_SKIP_RULES=(
  "dist/"
  "dist"
)

# 本地修改过的文件（相对 LOCAL_TARGET）
LOCALLY_MODIFIED=(
  "vite.config.js"
)

# 本地删除过的文件（不从上游同步回来）
LOCALLY_DELETED=(
  ".github/workflows/pages.yml"
  ".gitignore"
)

# 本地保留前缀：这些路径下的文件，无论内容是否变化，
# 都不被上游直接覆盖。上游有更新时，另存到 .local/ 供人工审阅。
LOCALLY_RESERVED_PREFIXES=(
  ".github/"
)

# 不同步的路径（即使上游有，也跳过）
#   node_modules/                    - npm 依赖
#   dist/                            - 构建产物（由 Actions 生成）
#   public/assets/model-transport/   - 构建脚本运行时生成
#   .git/                            - git 元数据
SYNC_EXCLUDES=(
  "node_modules"
  "dist"
  ".git"
  "public/assets/model-transport"
)
# ==============================

DRY_RUN=0
BRANCH_ARG=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --branch=*) BRANCH_ARG="${arg#--branch=}" ;;
    *) echo "未知参数：$arg"; exit 1 ;;
  esac
done

log()  { printf '%s\n' "$*"; }
say()  { log "  [dry] $*"; }
do_cp()    { if [ "$DRY_RUN" -eq 1 ]; then say "cp $1 → $2"; else cp "$1" "$2"; fi; }
do_mv()    { if [ "$DRY_RUN" -eq 1 ]; then say "mv $1 → $2"; else mv "$1" "$2"; fi; }
do_mkdir() { if [ "$DRY_RUN" -eq 1 ]; then say "mkdir -p $1"; else mkdir -p "$1"; fi; }

# ---------- 位置与状态检查 ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

CURRENT_BRANCH="$(git branch --show-current)"
[ "$CURRENT_BRANCH" = "main" ] || { log "❌ 请在 main 分支运行（当前：$CURRENT_BRANCH）"; exit 1; }

git diff --quiet && git diff --cached --quiet \
  || { log "❌ 工作区有未提交改动，请先提交或 git stash"; exit 1; }

# ---------- 选择分支 ----------
log "→ 拉取远端分支信息"
git fetch --prune origin

if [ -n "$BRANCH_ARG" ]; then
  COPY_BRANCH="$BRANCH_ARG"
  git rev-parse --verify "$COPY_BRANCH" >/dev/null 2>&1 \
    || { log "❌ 分支不存在：$COPY_BRANCH"; exit 1; }
else
  mapfile -t COPY_BRANCHES < <(
    git branch -r \
      | grep -E "^[[:space:]]*${COPY_BRANCH_PREFIX}" \
      | sed 's/^[[:space:]]*//'
  )

  case "${#COPY_BRANCHES[@]}" in
    0)
      log "❌ 未找到任何 ${COPY_BRANCH_PREFIX}* 分支"
      exit 1
      ;;
    1)
      COPY_BRANCH="${COPY_BRANCHES[0]}"
      log "→ 使用分支：$COPY_BRANCH"
      ;;
    *)
      log "发现多个候选分支，请选择："
      i=1
      for b in "${COPY_BRANCHES[@]}"; do
        log "  $i) $b"
        i=$((i+1))
      done
      printf '输入序号：'
      read -r choice
      if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt "${#COPY_BRANCHES[@]}" ]; then
        log "❌ 无效选择"
        exit 1
      fi
      COPY_BRANCH="${COPY_BRANCHES[$((choice-1))]}"
      log "→ 使用分支：$COPY_BRANCH"
      ;;
  esac
fi

# ---------- 检出上游到临时目录 ----------
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
log "→ 检出 $COPY_BRANCH 到临时目录"
git archive "$COPY_BRANCH" | tar -x -C "$TMP_DIR"

SRC="$TMP_DIR${COPY_SOURCE_PATH:+/$COPY_SOURCE_PATH}"
[ -d "$SRC" ] || { log "❌ 上游里没有目录：$COPY_SOURCE_PATH"; exit 1; }

# ---------- 谓词 ----------
is_locally_modified() {
  for m in "${LOCALLY_MODIFIED[@]}"; do [ "$m" = "$1" ] && return 0; done
  return 1
}
is_locally_deleted() {
  for m in "${LOCALLY_DELETED[@]}"; do [ "$m" = "$1" ] && return 0; done
  return 1
}
is_reserved() {
  for prefix in "${LOCALLY_RESERVED_PREFIXES[@]}"; do
    case "$1" in "$prefix"*) return 0;; esac
  done
  return 1
}
is_excluded() {
  for m in "${SYNC_EXCLUDES[@]}"; do
    case "$1" in "$m"|"$m"/*) return 0;; esac
  done
  return 1
}

# ---------- 已知补丁 ----------
apply_patches() {
  local rel="$1" file="$2"

  case "$rel" in
    vite.config.js)
      grep -q "base:" "$file" && return 0
      log "    ↳ 补丁：vite.config.js 增加 base: './'"
      [ "$DRY_RUN" -eq 1 ] && return 0
      local tmp="${file}.tmp.$$"
      awk '
        { if (!done && match($0, /defineConfig\(\{/)) {
            print substr($0, 1, RSTART+RLENGTH-1) "base: \x27./\x27," substr($0, RSTART+RLENGTH);
            done=1
          } else print }
      ' "$file" > "$tmp"
      mv "$tmp" "$file"
      ;;
  esac
}

# ---------- 同步 .gitignore 到根文件标记区 ----------
sync_gitignore() {
  local upstream="$SRC/.gitignore"
  [ -f "$upstream" ] || { log "  [跳过] 上游无 .gitignore"; return 0; }

  # 把排除名单转成 awk 可用的紧凑字符串
  local skip_pattern
  skip_pattern="$(printf '%s\n' "${GITIGNORE_SKIP_RULES[@]}" | paste -sd'|' -)"

  local converted
  converted="$(awk -v pfx="$GITIGNORE_PATH_PREFIX" -v skip="$skip_pattern" '
    BEGIN {
      n = split(skip, arr, "|")
      for (i = 1; i <= n; i++) skip_set[arr[i]] = 1
    }
    /^[[:space:]]*$/ { next }
    /^[[:space:]]*#/ { next }
    {
      line = $0
      sub(/^[[:space:]]+/, "", line)
      sub(/[[:space:]]+$/, "", line)
      if (line in skip_set) next
      if (substr(line,1,1) == "!") {
        print "!" pfx substr(line,2)
      } else if (substr(line,1,1) == "/") {
        print pfx substr(line,2)
      } else {
        print pfx line
      }
    }
  ' "$upstream")"

  if ! grep -qF "$GITIGNORE_BLOCK_BEGIN" "$ROOT_GITIGNORE"; then
    log "  [跳过] 根 .gitignore 缺少标记区 $GITIGNORE_BLOCK_BEGIN，请先手工添加"
    return 0
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    log "  [dry] 将用以下内容替换 $ROOT_GITIGNORE 的 3d-auto-sync 区块（已排除：$skip_pattern）："
    printf '%s\n' "$converted" | sed 's/^/    /'
    return 0
  fi

  local tmp="${ROOT_GITIGNORE}.tmp.$$"
  awk -v begin="$GITIGNORE_BLOCK_BEGIN" -v end="$GITIGNORE_BLOCK_END" -v body="$converted" '
    $0 == begin { print; print body; inblock=1; next }
    $0 == end   { inblock=0; print; next }
    !inblock    { print }
  ' "$ROOT_GITIGNORE" > "$tmp"
  mv "$tmp" "$ROOT_GITIGNORE"
  log "  [更新] $ROOT_GITIGNORE 的 3d-auto-sync 区块"
}

# ---------- 同步主流程 ----------
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
HISTORY_TARGET="$HISTORY_DIR/$TIMESTAMP"

do_mkdir "$BACKUP_DIR"

ADDED=0; UPDATED=0; KEPT=0; SKIPPED=0; ARCHIVED=0

# ---- 1. 上游 → 本地 ----
while IFS= read -r -d '' src_file; do
  rel="${src_file#$SRC/}"

  is_excluded "$rel" && continue

  if is_locally_deleted "$rel"; then
    log "  [跳过-本地已删] $rel"
    SKIPPED=$((SKIPPED+1))
    continue
  fi

  dst_file="$LOCAL_TARGET/$rel"

  if [ ! -e "$dst_file" ]; then
    do_mkdir "$(dirname "$dst_file")"
    do_cp "$src_file" "$dst_file"
    log "  [新增] $rel"
    ADDED=$((ADDED+1))
    continue
  fi

  cmp -s "$src_file" "$dst_file" && continue

  if is_locally_modified "$rel" || is_reserved "$rel"; then
    do_mkdir "$(dirname "$BACKUP_DIR/$rel")"
    do_cp "$src_file" "$BACKUP_DIR/$rel.upstream"
    log "  [保留-本地有改动] $rel"
    apply_patches "$rel" "$BACKUP_DIR/$rel.upstream"
    KEPT=$((KEPT+1))
  else
    do_cp "$src_file" "$dst_file"
    log "  [更新] $rel"
    UPDATED=$((UPDATED+1))
  fi
done < <(find "$SRC" -type f -print0)

# ---- 2. 上游已删 → 归档本地 ----
while IFS= read -r -d '' local_file; do
  rel="${local_file#$LOCAL_TARGET/}"

  is_excluded "$rel" && continue
  is_locally_modified "$rel" && continue
  is_locally_deleted "$rel" && continue
  is_reserved "$rel" && continue

  if [ ! -e "$SRC/$rel" ]; then
    do_mkdir "$(dirname "$HISTORY_TARGET/$rel")"
    do_mv "$local_file" "$HISTORY_TARGET/$rel"
    log "  [归档-上游已删] $rel → $HISTORY_TARGET/$rel"
    ARCHIVED=$((ARCHIVED+1))
  fi
done < <(find "$LOCAL_TARGET" -type f -print0)

# ---- 3. 同步 .gitignore ----
sync_gitignore

# ---------- 汇总 ----------
log ""
log "──── 汇总 ────"
log "  新增             : $ADDED"
log "  更新             : $UPDATED"
log "  保留（本地有改动）: $KEPT"
log "  跳过（本地已删）  : $SKIPPED"
log "  归档（上游已删）  : $ARCHIVED"
log ""
log "后续："
log "  1. 查看 [$BACKUP_DIR] 下 *.upstream，人工比对上游改动"
log "  2. 查看 [$HISTORY_TARGET]（如有），确认归档的文件"
log "  3. 检查根 $ROOT_GITIGNORE 的 3d-auto-sync 区块是否合理"
log "  4. 若确认无误，git add / git commit"
