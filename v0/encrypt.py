#!/usr/bin/env python3
"""
加密通知工具（更新版）
用法：
  加密：python encrypt.py <通知文件名>
  解密：python encrypt.py <通知文件名> --decrypt --key <私钥PEM>
"""
import sys, os, json, re, urllib.parse
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.backends import default_backend
from img2base64 import image_to_base64_txt, base64_txt_to_image

INDEX_FILE = 'index.json'
NOTICES_DIR = '.'

def load_index():
    with open(INDEX_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_index(index):
    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

def generate_keypair():
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')
    return private_pem, public_pem

def encrypt_data(public_pem: str, plaintext: str) -> str:
    public_key = serialization.load_pem_public_key(
        public_pem.encode('utf-8'),
        backend=default_backend()
    )
    encrypted = public_key.encrypt(
        plaintext.encode('utf-8'),
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    return base64.b64encode(encrypted).decode('utf-8')

def decrypt_data(private_pem: str, cipher_b64: str) -> str:
    private_key = serialization.load_pem_private_key(
        private_pem.encode('utf-8'),
        password=None,
        backend=default_backend()
    )
    encrypted = base64.b64decode(cipher_b64)
    decrypted = private_key.decrypt(
        encrypted,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    return decrypted.decode('utf-8')

def encrypt_notice(file_name, public_pem):
    """加密通知并处理图片，返回更新后的通知数据"""
    with open(file_name, 'r', encoding='utf-8') as f:
        notice = json.load(f)

    # 加密正文
    if 'zh' in notice and notice['zh']:
        notice['zh'] = encrypt_data(public_pem, notice['zh'])
    if 'en' in notice and notice['en']:
        notice['en'] = encrypt_data(public_pem, notice['en'])

    # 处理图片字段
    image_fields = [k for k in notice if re.match(r'^image\d*$', k)]
    for field in sorted(image_fields):
        img_path = notice[field]
        if not os.path.exists(img_path):
            print(f"警告：图片文件 {img_path} 不存在，跳过")
            continue
        # 使用 img2base64 工具转为 .txt 并获取 base64 内容
        txt_path, b64_content = image_to_base64_txt(img_path)
        # 加密 base64 字符串
        encrypted_b64 = encrypt_data(public_pem, b64_content)
        # 将加密后的 base64 写入 .txt 文件
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write(encrypted_b64)
        # 修改通知中的字段路径指向 .txt
        notice[field] = txt_path

    return notice

def update_index_for_notice(file_name, notice):
    """根据通知内容更新 index.json 中的对应条目"""
    index = load_index()
    if file_name not in index:
        print(f"警告：{file_name} 不在 index.json 中，跳过更新")
        return
    entry = index[file_name]
    # 更新 visibility
    entry['visibility'] = notice.get('visibility', entry.get('visibility', 'public'))
    # 更新图片字段：如果通知中的 image* 指向了新的 .txt 路径，则替换 index 中的值
    for key, value in notice.items():
        if re.match(r'^image\d*$', key) and value.endswith('.txt'):
            entry[key] = value
    index[file_name] = entry
    save_index(index)
    print(f"已更新 index.json 中的 {file_name}")

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    file_name = sys.argv[1]
    decrypt_mode = '--decrypt' in sys.argv
    key_arg = None
    if '--key' in sys.argv:
        key_idx = sys.argv.index('--key') + 1
        if key_idx < len(sys.argv):
            key_arg = sys.argv[key_idx]

    if decrypt_mode:
        if not key_arg:
            print("解密模式需要提供私钥参数： --key \"私钥内容\"")
            return
        private_pem = key_arg
        with open(file_name, 'r', encoding='utf-8') as f:
            notice = json.load(f)
        print("===== 解密内容预览 =====")
        if 'zh' in notice:
            print("中文:", decrypt_data(private_pem, notice.get('zh', '')))
        if 'en' in notice:
            print("英文:", decrypt_data(private_pem, notice.get('en', '')))
        ans = input("是否将解密内容覆写回文件? (y/n): ").strip().lower()
        if ans == 'y':
            # 正文覆盖
            if 'zh' in notice:
                notice['zh'] = decrypt_data(private_pem, notice['zh'])
            if 'en' in notice:
                notice['en'] = decrypt_data(private_pem, notice['en'])
            # 图片解密还原
            image_fields = [k for k in notice if re.match(r'^image\d*$', k)]
            for field in image_fields:
                txt_path = notice[field]
                if not txt_path.endswith('.txt'):
                    continue
                # 从 TXT 读取加密 base64
                with open(txt_path, 'r', encoding='utf-8') as f:
                    enc_b64 = f.read()
                try:
                    decrypted_b64 = decrypt_data(private_pem, enc_b64)
                    # 将解密后的 base64 写回原图片路径（去掉 .txt 后缀）
                    img_path = txt_path[:-4]
                    with open(img_path, 'wb') as f:
                        f.write(base64.b64decode(decrypted_b64))
                    notice[field] = img_path  # 更新路径
                    print(f"图片已还原: {img_path}")
                except Exception as e:
                    print(f"图片解密失败 {field}: {e}")
            with open(file_name, 'w', encoding='utf-8') as f:
                json.dump(notice, f, ensure_ascii=False, indent=2)
            print("文件已更新")
    else:
        with open(file_name, 'r', encoding='utf-8') as f:
            notice = json.load(f)
        vis = notice.get('visibility', 'public')
        if vis == 'secret':
            print("该通知已经是加密状态，请使用 --decrypt 解密")
            return

        private_pem, public_pem = generate_keypair()
        print("===== 私钥 (请妥善保管) =====")
        print(private_pem)
        url_encoded_key = urllib.parse.quote(private_pem, safe='')
        print("===== URL 参数 pwd (直接复制使用) =====")
        print(f"pwd={url_encoded_key}")

        updated_notice = encrypt_notice(file_name, public_pem)
        if vis == 'test':
            updated_notice['visibility'] = 'test'
        else:
            updated_notice['visibility'] = 'secret'

        with open(file_name, 'w', encoding='utf-8') as f:
            json.dump(updated_notice, f, ensure_ascii=False, indent=2)

        # 更新 index.json
        update_index_for_notice(file_name, updated_notice)

        print(f"已加密并保存 {file_name}，并更新了 index.json")

if __name__ == '__main__':
    main()