#!/data/data/com.termux/files/usr/bin/bash
# 提取历史中存在但当前不存在的文件到 .history/

TMP="${TMPDIR:-$PWD/.tmp-extract}"
mkdir -p "$TMP"
echo "使用临时目录: $TMP"

# 1. 当前追踪的文件
git ls-files | sort -u > "$TMP/2n_current.txt"

# 2. 历史中所有文件（用 -z 保证路径不被转义）
echo "收集历史文件列表..."
git log --all --pretty=format: --name-only -z \
  | tr '\0' '\n' \
  | grep -v '^$' \
  | sort -u > "$TMP/2n_historical.txt"

# 3. 差集
comm -23 "$TMP/2n_historical.txt" "$TMP/2n_current.txt" > "$TMP/2n_deleted.txt"
total=$(wc -l < "$TMP/2n_deleted.txt")
echo "找到 $total 个历史文件需要提取"

if [ "$total" -eq 0 ]; then
  echo "无需提取"
  exit 0
fi

# 4. 构建 (path → 最新非删除 commit) 映射
#    关键：加 -z，避免中文/空格路径被 git 转义
echo "构建文件→最新提交映射..."
git log --all --diff-filter=ACMRT --pretty=format:'COMMIT:%H' --name-only -z \
  | tr '\0' '\n' > "$TMP/2n_map_raw.txt"

awk '
  /^COMMIT:/ { current = substr($0, 8); next }
  /^[[:space:]]*$/ { next }
  {
    if (!($0 in seen)) {
      seen[$0] = 1
      print $0 "\t" current
    }
  }
' "$TMP/2n_map_raw.txt" > "$TMP/2n_map.txt"

echo "映射条目数: $(wc -l < "$TMP/2n_map.txt")"

# 5. 只保留 deleted 列表中的文件
awk -F'\t' '
  NR==FNR { wanted[$0] = 1; next; }
  { if ($1 in wanted) print $0; }
' "$TMP/2n_deleted.txt" "$TMP/2n_map.txt" > "$TMP/2n_targets.txt"

echo "待提取目标数: $(wc -l < "$TMP/2n_targets.txt")"

mkdir -p .history
count=0
failed=0
skipped=0
conflicts="$TMP/2n_conflicts.txt"
> "$conflicts"

while IFS=$'\t' read -r f commit; do
  [ -z "$f" ] && continue
  [ -z "$commit" ] && continue

  target=".history/$f"
  parent_dir=".history/$(dirname "$f")"

  if [ -e "$target" ] || [ -d "$target" ]; then
    echo "跳过（目标已存在）: $f" >> "$conflicts"
    skipped=$((skipped + 1))
    continue
  fi

  if [ -f "$parent_dir" ]; then
    echo "跳过（父路径是文件）: $f" >> "$conflicts"
    skipped=$((skipped + 1))
    continue
  fi

  if ! mkdir -p "$parent_dir" 2>/dev/null; then
    echo "跳过（无法创建父目录）: $f" >> "$conflicts"
    skipped=$((skipped + 1))
    continue
  fi

  if git show "$commit:$f" > "$target" 2>/dev/null; then
    count=$((count + 1))
    if [ $((count % 1000)) -eq 0 ]; then
      echo "已提取 $count 个..."
    fi
  else
    echo "提取失败: $f" >> "$conflicts"
    failed=$((failed + 1))
  fi
done < "$TMP/2n_targets.txt"

echo "完成：提取 $count，失败 $failed，跳过 $skipped"
echo "冲突/失败清单：$conflicts"

# 6. 更新 .gitignore
if ! grep -qx '.history/' .gitignore 2>/dev/null; then
  printf '\n# 历史文件备份（不纳入版本管理）\n.history/\n' >> .gitignore
  echo "已添加 .history/ 到 .gitignore"
fi
