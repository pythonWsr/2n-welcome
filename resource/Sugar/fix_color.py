from PIL import Image
import os

def fix_image_color(input_path, output_path):
    # 1. 打开图片并转换为RGBA模式（保留透明度信息）
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size

    # 2. 创建一个掩码图层 (用来标记中间圆圈的位置)
    # 白色(255)代表保留圆圈，黑色(0)代表待替换的背景
    mask = Image.new("L", (width, height), 0)
    pixels = img.load()
    mask_pixels = mask.load()

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            
            # 如果是完全透明的边缘，直接跳过（交给背景处理）
            if a == 0:
                continue

            # 核心判断逻辑：背景是鲜艳的绿色，而圆圈是灰白色
            # 灰白色的 RGB 差值极小（如 190,190,190），而绿色的 RGB 差值极大（如 43,255,163）
            # 同时过滤掉纯黑色阴影，只保留亮度大于 100 的灰度
            if max(r, g, b) - min(r, g, b) < 30 and max(r, g, b) > 100:
                mask_pixels[x, y] = 255  # 标记这部分像素需要保留

    # 3. 创建精确色号 #2bffa3 的纯色背景
    target_color = (43, 255, 163, 255) # RGBA 格式
    background = Image.new("RGBA", (width, height), target_color)

    # 4. 将原图贴在背景上，仅保留掩码指定的区域
    background.paste(img, (0, 0), mask)

    # 5. 保存图片
    background.save(output_path, format="PNG")
    print(f"✅ 处理完成！输出图片保存至: {output_path}")

if __name__ == "__main__":
    # 修改这里为你的图片文件名
    INPUT_IMAGE = "input.jpg"   # 你的原图文件名
    OUTPUT_IMAGE = "output.jpg" # 处理后的文件名

    if os.path.exists(INPUT_IMAGE):
        fix_image_color(INPUT_IMAGE, OUTPUT_IMAGE)
    else:
        print(f"❌ 错误：找不到文件 '{INPUT_IMAGE}'，请确保图片和脚本在同一目录。")
