# img2base64.py – 图片 ⇄ Base64 TXT 转换工具
import base64, os

def image_to_base64_txt(image_path):
    """
    将图片文件转换为 base64 文本并保存为 .txt
    返回：保存后的 .txt 文件路径、base64 字符串
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"图片文件不存在: {image_path}")
    with open(image_path, 'rb') as f:
        img_bytes = f.read()
    b64_str = base64.b64encode(img_bytes).decode('utf-8')
    txt_path = image_path + '.txt'
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write(b64_str)
    return txt_path, b64_str

def base64_txt_to_image(txt_path, output_image_path=None):
    """
    从 base64 TXT 文件还原图片
    如果未指定 output_image_path，则自动根据原图片后缀生成文件名
    返回：保存后的图片文件路径
    """
    if not os.path.exists(txt_path):
        raise FileNotFoundError(f"TXT 文件不存在: {txt_path}")
    with open(txt_path, 'r', encoding='utf-8') as f:
        b64_str = f.read()
    img_bytes = base64.b64decode(b64_str)
    if output_image_path is None:
        # 假设 TXT 文件名为 image.png.txt，则还原为 image.png
        base_name = txt_path[:-4] if txt_path.endswith('.txt') else txt_path
        output_image_path = base_name
    with open(output_image_path, 'wb') as f:
        f.write(img_bytes)
    return output_image_path