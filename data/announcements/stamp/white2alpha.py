#!/usr/bin/env python3
"""
white_to_alpha.py – 将 PNG 图片中的白色背景转为透明

用法：
    python white_to_alpha.py <文件或目录> [选项]

示例：
    # 处理整个 stamp 目录，直接覆盖原文件
    python white_to_alpha.py data/announcements/stamp/

    # 保留原文件，输出到新目录
    python white_to_alpha.py data/announcements/stamp/ -o data/announcements/stamp/alpha/

    # 调整白色阈值（默认 250，越高越严格）
    python white_to_alpha.py data/announcements/stamp/ -t 240
"""
import sys
import argparse
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("需要 Pillow：pip install Pillow", file=sys.stderr)
    sys.exit(1)


def process_image(src_path, dst_path, threshold):
    img = Image.open(src_path).convert('RGBA')
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            mn = min(r, g, b)
            if mn >= threshold:
                new_a = 0
            else:
                new_a = int(255 * (1 - mn / threshold))
                new_a = max(0, min(255, new_a))
            px[x, y] = (r, g, b, new_a)
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst_path, 'PNG')
    print(f"✓ {src_path} -> {dst_path}")


def collect_files(path):
    p = Path(path)
    if p.is_file():
        return [p]
    if p.is_dir():
        return sorted(p.glob('*.png')) + sorted(p.glob('*.PNG'))
    print(f"路径不存在：{path}", file=sys.stderr)
    return []


def main():
    ap = argparse.ArgumentParser(description='将 PNG 白色背景转为透明')
    ap.add_argument('path', help='文件或目录')
    ap.add_argument('-t', '--threshold', type=int, default=250,
                    help='白色阈值（默认 250，越高越严格）')
    ap.add_argument('-o', '--output', default=None,
                    help='输出目录（默认覆盖原文件）')
    ap.add_argument('-s', '--suffix', default='',
                    help='输出文件名后缀（如 _alpha）')
    args = ap.parse_args()

    files = collect_files(args.path)
    if not files:
        print("未找到 PNG 文件", file=sys.stderr)
        sys.exit(1)

    for src in files:
        if args.output:
            dst = Path(args.output) / src.name
        elif args.suffix:
            dst = src.with_name(src.stem + args.suffix + src.suffix)
        else:
            dst = src
        process_image(src, dst, args.threshold)


if __name__ == '__main__':
    main()
