#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import urllib.parse
import subprocess

def copy_to_clipboard(text: str) -> bool:
    """Termux 优先，否则用 pyperclip / tkinter"""
    # Termux 专用命令
    try:
        subprocess.run(['termux-clipboard-set'], input=text, text=True, check=True, capture_output=True)
        return True
    except (subprocess.SubprocessError, FileNotFoundError):
        pass

    # 回退方案：pyperclip
    try:
        import pyperclip
        pyperclip.copy(text)
        return True
    except ImportError:
        pass
    except Exception as e:
        print(f"pyperclip 错误: {e}", file=sys.stderr)

    # 最后尝试 tkinter
    try:
        import tkinter as tk
        root = tk.Tk()
        root.withdraw()
        root.clipboard_clear()
        root.clipboard_append(text)
        root.update()
        root.destroy()
        return True
    except ImportError:
        pass
    except Exception as e:
        print(f"tkinter 错误: {e}", file=sys.stderr)

    print("无法复制到剪贴板", file=sys.stderr)
    return False

def url_encode(text: str) -> str:
    return urllib.parse.quote(text, safe='-_.~')

def main():
    print("=== URL 编码工具（UTF-8）===")
    try:
        raw = input("请输入原始文本: ")
    except KeyboardInterrupt:
        print("\n取消输入。")
        sys.exit(0)
    if not raw:
        print("未输入内容。")
        return
    encoded = url_encode(raw)
    print("\nURL 编码结果:")
    print(encoded)
    if copy_to_clipboard(encoded):
        print("\n✅ 已复制到剪贴板。")
    else:
        print("\n❌ 复制失败，请手动复制。")

if __name__ == "__main__":
    main()