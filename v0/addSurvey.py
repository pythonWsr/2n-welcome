#!/usr/bin/env python3
"""
addSurvey.py – 新增问卷配置文件
用法：
  # 生成 iframe 问卷
  python addSurvey.py --type iframe --link "https://v.wjx.cn/vm/xxx.aspx"

  # 生成自定义问卷（html 类型），指定 main 用户
  python addSurvey.py --type html --main pythonWsr
  python addSurvey.py -t html -m pythonWsr

  # 生成自定义问卷，不指定 main 用户（默认 control 为 main）
  python addSurvey.py --type html
"""

import os
import sys
import json
import hashlib
import secrets
import argparse

SURVEY_DIR = './data/Survey'
INDEX_FILE = os.path.join(SURVEY_DIR, 'index.json')

def ensure_dir():
    os.makedirs(SURVEY_DIR, exist_ok=True)

def generate_hash():
    """生成16位随机十六进制哈希字符串"""
    return secrets.token_hex(8)  # 8 bytes = 16 hex chars

def load_index():
    if not os.path.exists(INDEX_FILE):
        return []
    with open(INDEX_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_index(file_list):
    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        json.dump(file_list, f, ensure_ascii=False, indent=2)

def add_iframe(link):
    """创建 iframe 类型的问卷 JSON 文件并更新索引"""
    ensure_dir()
    hash_name = generate_hash()
    file_name = f"{hash_name}.json"
    file_path = os.path.join(SURVEY_DIR, file_name)

    data = {
        "type": "iframe",
        "link": link,
        "created_at": __import__('time').strftime('%Y-%m-%d %H:%M:%S')
    }

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # 更新索引
    index = load_index()
    index.append({"file": file_name, "start": "2026-01-01", "end": "2099-12-31"})
    save_index(index)

    print(f"✅ 已创建问卷文件: {file_path}")
    print(f"   类型: iframe, 链接: {link}")

def add_html(main_user=None):
    """创建自定义问卷的 JSON 模板（html 类型）"""
    ensure_dir()
    hash_name = generate_hash()
    file_name = f"{hash_name}.json"
    file_path = os.path.join(SURVEY_DIR, file_name)

    # 设置权重
    weights = {}
    if main_user:
        weights[main_user] = "main"
    else:
        weights["control"] = "main"
    weights["awdc"] = 3
    weights["flowerwsr"] = 2

    # 问卷模板（中英文双题示例）
    template = {
        "type": "html",
        "zh": {
            "title": "示例问卷标题",
            "question1": {
                "text": "你的游戏ID是：___id___",
                "blanks": {
                    "id": {
                        "required": True,
                        "type": "str",
                        "min": 3,
                        "max": 12
                    }
                }
            }
            # 可继续添加更多 question
        },
        "en": {
            "title": "Sample Survey Title",
            "question1": {
                "text": "Your game ID: ___id___",
                "blanks": {
                    "id": {
                        "required": True,
                        "type": "str",
                        "min": 3,
                        "max": 12
                    }
                }
            }
        },
        "weights": weights
    }

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(template, f, ensure_ascii=False, indent=2)

    # 更新索引（时间范围为长期有效）
    index = load_index()
    index.append({"file": file_name, "start": "2026-01-01", "end": "2099-12-31"})
    save_index(index)

    print(f"✅ 已创建问卷文件: {file_path}")
    print(f"   类型: html, 权重: {json.dumps(weights, ensure_ascii=False)}")
    if main_user:
        print(f"   main 用户: {main_user}")
    else:
        print(f"   默认 main 用户: control")

def main():
    parser = argparse.ArgumentParser(description='添加问卷配置')
    parser.add_argument('--type', '-t', choices=['iframe', 'html'], required=True,
                        help='问卷类型 (iframe 或 html)')
    parser.add_argument('--link', '-l', help='问卷星链接 (iframe 类型必需)')
    parser.add_argument('--main', '-m', help='设置为 main 权重的用户名 (html 类型可选，默认创建 control 用户)')
    args = parser.parse_args()

    if args.type == 'iframe':
        if not args.link:
            print("❌ iframe 类型需要 --link 参数")
            sys.exit(1)
        add_iframe(args.link)
    elif args.type == 'html':
        add_html(args.main)

if __name__ == '__main__':
    main()