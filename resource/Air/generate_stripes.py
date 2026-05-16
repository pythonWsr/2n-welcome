#!/usr/bin/env python3
"""生成一张 100x100 的纯色条纹图片，依次使用 10 种颜色，每种颜色占 10 行。"""

from PIL import Image

# 颜色列表（从上到下）
colors = [
    "#7eef6d", "#ffe65d", "#4d52e3", "#861fde", "#de1f1f",
    "#1fdbde", "#ff2b75", "#2bffa3", "#eeeeee", "#555555"
]

# 图片尺寸
width, height = 100, 100
stripe_height = height // len(colors)  # 10

# 创建新图像（RGB 模式）
img = Image.new("RGB", (width, height))

# 填充每一行像素
for y in range(height):
    idx = y // stripe_height
    if idx >= len(colors):
        idx = len(colors) - 1  # 防止索引越界（理论上不会）
    hex_color = colors[idx].lstrip("#")
    r, g, b = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    for x in range(width):
        img.putpixel((x, y), (r, g, b))

# 保存图片
output_path = "color_stripes.png"
img.save(output_path)
print(f"图片已保存为：{output_path}")