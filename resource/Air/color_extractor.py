#!/usr/bin/env python3
"""
快速提取图片主色（按像素数），输出 #rrggbb 并复制到剪贴板。
适用于 Android / Termux，也可在桌面系统运行。
依赖：Pillow, pyperclip（或 termux-api）。
"""

import sys
import os
from collections import Counter
from PIL import Image

# ---------- 剪贴板支持 ----------
def get_clipboard_handler():
    """
    返回一个函数，调用它可以复制文本到剪贴板。
    按顺序尝试 pyperclip、termux-clipboard-set，都失败则返回仅打印的函数。
    """
    # 1. 尝试 pyperclip（跨平台，桌面/部分 Termux 可用）
    try:
        import pyperclip
        # 测试是否真的可用（有些环境会导入成功但无法使用）
        pyperclip.copy("")
        return lambda text: pyperclip.copy(text)
    except Exception:
        pass

    # 2. 尝试 termux-clipboard-set（Termux:API）
    import subprocess
    if os.path.exists("/data/data/com.termux/files/usr/bin/termux-clipboard-set"):
        def _termux_copy(text):
            subprocess.run(["termux-clipboard-set", text], check=False)
        return _termux_copy

    # 3. 无法使用剪贴板
    return lambda text: print(f"(剪贴板不可用，请手动复制) 色号: {text}")

copy_to_clipboard = get_clipboard_handler()

# ---------- 主循环 ----------
def main():
    print("=== 图片主色提取器 ===")
    print("输入图片路径，将输出出现次数最多的颜色 (#rrggbb) 并复制到剪贴板。")
    print("输入 'exit' 退出程序。\n")

    while True:
        try:
            path = input("图片路径: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n退出。")
            break

        if path.lower() == "exit":
            print("再见！")
            break

        if not path:
            continue

        # 检查文件是否存在
        if not os.path.isfile(path):
            print(f"错误：文件不存在 -> {path}\n")
            continue

        try:
            # 打开图像并转为 RGB（忽略透明通道）
            img = Image.open(path).convert("RGB")

            # 获取所有像素数据
            pixels = list(img.getdata())

            # 统计频率
            counter = Counter(pixels)
            most_common_color, count = counter.most_common(1)[0]
            total = len(pixels)

            # 格式化为 #rrggbb
            hex_color = "#{:02x}{:02x}{:02x}".format(*most_common_color)

            # 输出结果
            print(f"主色: {hex_color}  像素数: {count}/{total} ({100*count/total:.1f}%)")

            # 复制到剪贴板
            copy_to_clipboard(hex_color)
            print("已复制到剪贴板 ✓\n")

        except Exception as e:
            print(f"处理图片时出错: {e}\n")

if __name__ == "__main__":
    main()