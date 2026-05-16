#!/bin/bash
# fix_dup.sh - 检测并修复相邻重复代码行

FILE="$1"
if [ -z "$FILE" ]; then
    echo "用法: $0 <文件名>"
    exit 1
fi

if [ ! -f "$FILE" ]; then
    echo "文件不存在: $FILE"
    exit 1
fi

TEMP_FILE="${FILE}.tmp"
prev=""
while IFS= read -r line; do
    # 跳过空行判断
    trimmed_line=$(echo "$line" | sed 's/[[:space:]]*$//')
    trimmed_prev=$(echo "$prev" | sed 's/[[:space:]]*$//')
    
    # 如果当前行与上一行完全相同（忽略尾部空格），则跳过该行
    if [ "$trimmed_line" != "$trimmed_prev" ] || [ -z "$trimmed_line" ]; then
        echo "$line" >> "$TEMP_FILE"
    else
        echo "移除重复行: $line" >&2
    fi
    prev="$line"
done < "$FILE"

mv "$TEMP_FILE" "$FILE"
echo "已修复: $FILE"
