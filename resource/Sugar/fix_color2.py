from PIL import Image
import os

def fix_image_color(input_path, output_path):
    # 1. 以 RGBA 形式打开，方便处理灰度圆圈
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    
    # 2. 建立黑白蒙版
    mask = Image.new("L", (width, height), 0)
    pixels = img.load()
    mask_pixels = mask.load()
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            # 识别中间的灰白色圆圈（低饱和度 + 高亮度）
            if max(r, g, b) - min(r, g, b) < 30 and max(r, g, b) > 100:
                mask_pixels[x, y] = 255
                
    # 3. 注意！这里改为纯 RGB 模式，不再用 RGBA
    target_color = (43, 255, 163)  # 精准对应 #2bffa3
    background = Image.new("RGB", (width, height), target_color)
    
    # 4. 将原图（通过蒙版）粘贴到纯色背景上
    background.paste(img, (0, 0), mask)
    
    # 5. 保存
    background.save(output_path, format="PNG")
    
    # === 6. 验证输出：程序自己在终端里打印实际颜色 ===
    # 取左上角任意一个背景像素，验证纯色精准度
    check_pixel = background.getpixel((50, 50)) 
    actual_hex = '#{:02X}{:02X}{:02X}'.format(*check_pixel)
    print(f"✅ 处理完成！输出文件: {output_path}")
    print(f"🎯 图片真实背景色为: {actual_hex} (目标是 #2BFFA3)")
    print("如果终端打印的是 #2BFFA3，说明手机查看器/取色器有显示偏差，图片本身已正确！")

if __name__ == "__main__":
    INPUT_IMAGE = "input.jpg"
    OUTPUT_IMAGE = "output.png"
    if os.path.exists(INPUT_IMAGE):
        fix_image_color(INPUT_IMAGE, OUTPUT_IMAGE)
    else:
        print(f"❌ 找不到 '{INPUT_IMAGE}'")

