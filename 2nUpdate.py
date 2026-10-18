#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
2n 仓库增量自动同步工具 (Windows/Linux/macOS 通用)

功能：
1. 读取本地 HEAD，尝试直接 fetch 小增量；若超时/失败，自动触发 GitHub Actions 发送邮件。
2. 从 IMAP 邮箱拉取分片，合并并校验 SHA256。
3. 自动使用 bundle 更新本地仓库，并修复 remote 地址。
4. 支持 --bundle 离线导入，支持 -c 强制触发工作流。
"""

import os
import sys
import argparse
import time
import imaplib
import email
import hashlib
import subprocess
import pathlib
import shutil
import json
import urllib.request
from datetime import datetime
import getpass

# 强制 Windows 终端使用 UTF-8 编码
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

# ================= 配置区 =================
DEFAULT_REPO_DIR = pathlib.Path(__file__).parent.absolute()
TMP_DIR = DEFAULT_REPO_DIR / ".sync_tmp"
CONFIG_FILE = pathlib.Path.home() / ".2n_sync_config.json"

GITHUB_RAW_WHITELIST = "https://raw.githubusercontent.com/pythonWsr/2n-welcome/main/config/mail-recipients.json"
GITHUB_REPO = "pythonWsr/2n-welcome"

IMAP_SERVER = "imap.qq.com"
IMAP_PORT = 993

# ================= 工具函数 =================
def log(msg, level="INFO"):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")

def run_cmd(args, cwd=DEFAULT_REPO_DIR, timeout=None, check=True):
    try:
        res = subprocess.run(args, cwd=str(cwd), capture_output=True, text=True, 
                             encoding="utf-8", errors="replace", timeout=timeout)
        if check and res.returncode != 0:
            log(f"命令失败: {' '.join(args)}\n{res.stderr}", "ERROR")
            return None
        return res
    except subprocess.TimeoutExpired:
        return "TIMEOUT"
    except Exception as e:
        log(f"命令异常: {e}", "ERROR")
        return None

def get_local_head():
    res = run_cmd(["git", "rev-parse", "HEAD"])
    return res.stdout.strip() if res else ""

def load_config():
    if CONFIG_FILE.exists():
        try: return json.loads(CONFIG_FILE.read_text("utf-8"))
        except: pass
    return {}

def save_config(email_addr, authkey):
    try:
        CONFIG_FILE.write_text(json.dumps({"email": email_addr, "authkey": authkey}), "utf-8")
        log("凭据已保存到本地配置文件。")
    except Exception as e:
        log(f"保存凭据失败: {e}", "WARN")

# ================= 核心类 =================

class UpdateManager:
    def __init__(self, email_addr, authkey):
        self.email = email_addr
        self.authkey = authkey
        self.local_head = get_local_head()
        log(f"本地当前 HEAD: {self.local_head[:7]}")

    def verify_email_whitelist(self):
        log("正在校验邮箱是否在 GitHub 白名单中...")
        try:
            req = urllib.request.Request(GITHUB_RAW_WHITELIST, headers={'User-Agent': '2n-sync'})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.load(resp)
                emails = [r["email"] for r in data.get("recipients", [])]
                if self.email not in emails:
                    log(f"警告: 邮箱 {self.email} 未在仓库白名单 config/mail-recipients.json 中！", "ERROR")
                    return False
                log("邮箱白名单校验通过。")
                return True
        except Exception as e:
            log(f"读取白名单失败: {e} (可能是网络问题，继续尝试)", "WARN")
            return True

    def verify_imap_login(self):
        log("正在测试 IMAP 授权码...")
        try:
            mail = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT)
            mail.login(self.email, self.authkey)
            mail.logout()
            log("IMAP 登录成功。")
            return True
        except imaplib.IMAP4.error:
            log("IMAP 授权码错误，请检查。", "ERROR")
            return False
        except Exception as e:
            log(f"IMAP 连接失败: {e}", "ERROR")
            return False

    def trigger_workflow(self):
        log(f"正在触发 GitHub Actions (base_sha: {self.local_head[:7]})...")
        cmd = ["gh", "workflow", "run", "bundle.yml", "-f", f"base_sha={self.local_head}", "-f", "part_size=256K"]
        res = run_cmd(cmd, check=False)
        if res and res.returncode == 0:
            log("[OK] Actions 触发成功，请等待邮件送达。")
            return True
        else:
            log("[ERROR] gh 触发失败。请确认已安装 GitHub CLI (gh auth login)，或去网页手动触发。", "ERROR")
            if res and res.stderr:
                log(f"错误信息: {res.stderr.strip()}", "ERROR")
            return False

    def try_direct_fetch(self):
        log("尝试直接 fetch (限时 10 秒)...")
        res = run_cmd(["git", "fetch", "origin", "main"], timeout=10, check=False)
        
        if res == "TIMEOUT" or res is None or res.returncode != 0:
            log("直接 fetch 超时或失败，转为邮件同步模式。", "WARN")
            return False
            
        target_head = run_cmd(["git", "rev-parse", "origin/main"]).stdout.strip()
        if target_head == self.local_head:
            log("已经是最新版本，无需更新。")
            return True
            
        log("直接 fetch 成功，正在应用更新...")
        self.apply_git_changes(target_head)
        return True

    def poll_mail(self, timeout_mins=10):
        log("开始轮询邮箱接收分片...")
        start_time = time.time()
        job_id = None
        bundle_sha = None
        parts_expected = 0
        parts_received = {}

        while time.time() - start_time < timeout_mins * 60:
            try:
                mail = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT)
                mail.login(self.email, self.authkey)
                mail.select("INBOX")
                
                status, messages = mail.search(None, '(SUBJECT "[2n Sync]")')
                if status == "OK" and messages[0]:
                    for m_id in reversed(messages[0].split()[-20:]):
                        status, data = mail.fetch(m_id, "(RFC822)")
                        if status != "OK": continue
                        
                        msg = email.message_from_bytes(data[0][1])
                        if msg.get("X-2N-Base-SHA") != self.local_head:
                            continue
                            
                        job_id = msg.get("X-2N-Job-ID")
                        bundle_sha = msg.get("X-2N-Bundle-SHA256")
                        part_str = msg.get("X-2N-Part", "")
                        if not part_str: continue
                        
                        idx, total = map(int, part_str.split("/"))
                        parts_expected = total
                        
                        if idx not in parts_received:
                            for part in msg.walk():
                                fn = part.get_filename()
                                if fn and fn.startswith("bundle.part."):
                                    payload = part.get_payload(decode=True)
                                    parts_received[idx] = payload
                                    log(f"  收到分片 {idx}/{total} ({len(payload)} bytes)")
                                    break
                
                mail.logout()
                
                if len(parts_received) == parts_expected and parts_expected > 0:
                    log(f"分片全部接收完毕 ({parts_expected}/{parts_expected})。")
                    break
            except Exception as e:
                log(f"IMAP 轮询异常: {e}", "WARN")
                
            time.sleep(10)
        else:
            log("轮询超时，未能收到全部分片。", "ERROR")
            return False

        log("正在合并并校验...")
        if TMP_DIR.exists(): shutil.rmtree(TMP_DIR)
        TMP_DIR.mkdir(parents=True)
        
        bundle_path = TMP_DIR / "update.bundle"
        with open(bundle_path, "wb") as f:
            for i in range(1, parts_expected + 1):
                f.write(parts_received[i])
                
        actual_sha = hashlib.sha256(bundle_path.read_bytes()).hexdigest()
        if actual_sha != bundle_sha:
            log(f"合并后 Bundle SHA256 校验失败！期望 {bundle_sha}，实际 {actual_sha}", "ERROR")
            return False
            
        log("Bundle SHA256 校验通过。")
        return self.apply_bundle(bundle_path)

    def apply_bundle(self, bundle_path):
        log("正在验证 Git Bundle...")
        res = run_cmd(["git", "bundle", "verify", str(bundle_path)], check=False)
        if not res or res.returncode != 0:
            log("git bundle verify 失败，文件可能损坏。", "ERROR")
            return False

        log("正在从 Bundle 提取数据...")
        res = run_cmd(["git", "bundle", "list-heads", str(bundle_path)])
        target_sha = ""
        for line in res.stdout.splitlines():
            if "refs/heads/main" in line or "refs/heads/snapshot-target" in line:
                target_sha = line.split()[0]
                break
                
        if not target_sha:
            log("Bundle 中未找到可用的分支。", "ERROR")
            return False
            
        self.apply_git_changes(target_sha, bundle_path)
        return True

    def apply_git_changes(self, target_sha, bundle_path=None):
        status = run_cmd(["git", "status", "--porcelain"]).stdout.strip()
        if status:
            log("[WARN] 本地有未提交的修改！请先提交或 stash 后再更新。", "ERROR")
            return False
            
        if bundle_path:
            run_cmd(["git", "fetch", str(bundle_path), f"{target_sha}:refs/remotes/bundle-temp/main"])
            merge_target = "bundle-temp/main"
        else:
            merge_target = "origin/main"

        res = run_cmd(["git", "merge", "--ff-only", merge_target], check=False)
        if not res or res.returncode != 0:
            log("无法 Fast-forward，尝试 Rebase...")
            res = run_cmd(["git", "rebase", merge_target], check=False)
            if not res or res.returncode != 0:
                log("[WARN] Rebase 冲突！自动更新中止。", "ERROR")
                return False

        # 智能检查并修复 remote (改为 SSH 协议)
        res_remote = run_cmd(["git", "remote", "get-url", "origin"], check=False)
        if not res_remote or res_remote.returncode != 0 or "github.com" not in res_remote.stdout:
            log("检测到 remote 缺失或非 GitHub 地址，正在修复为 SSH 协议...")
            ssh_url = f"git@github.com:{GITHUB_REPO}.git"
            run_cmd(["git", "remote", "set-url", "origin", ssh_url], check=False)
            run_cmd(["git", "remote", "add", "origin", ssh_url], check=False)
        else:
            log("Remote 地址正常，保留现有配置。")

        if bundle_path:
            run_cmd(["git", "update-ref", "-d", "refs/remotes/bundle-temp/main"], check=False)
            shutil.rmtree(TMP_DIR, ignore_errors=True)
            
        log(f"[OK] 更新成功！当前 HEAD: {target_sha[:7]}")
        return True

# ================= 主程序 =================
def main():
    parser = argparse.ArgumentParser(description="2n 仓库增量同步工具")
    parser.add_argument("--email-address", help="接收邮件的 QQ 邮箱地址")
    parser.add_argument("--email-authkey", help="QQ 邮箱 IMAP/SMTP 授权码")
    parser.add_argument("--bundle", help="直接应用指定的本地 bundle 文件")
    parser.add_argument("-c", "--check", action="store_true", help="强制触发 GitHub Actions 工作流，不尝试直接 fetch")
    args = parser.parse_args()

    config = load_config()
    email_addr = args.email_address or config.get("email") or os.environ.get("EMAIL_ADDRESS")
    authkey = args.email_authkey or config.get("authkey") or os.environ.get("QQ_IMAP_AUTH_CODE")

    if args.check:
        log("=== 强制触发 GitHub Actions 工作流 ===")
        mgr = UpdateManager(email_addr or "", authkey or "")
        
        res_gh = run_cmd(["gh", "--version"], check=False)
        if not res_gh or res_gh.returncode != 0:
            log("[ERROR] 未检测到 GitHub CLI (gh)。", "ERROR")
            sys.exit(1)
            
        log("[OK] 环境检查通过，准备触发...")
        if not mgr.trigger_workflow():
            sys.exit(1)
            
        if email_addr and authkey:
            mgr.poll_mail()
        return

    if args.bundle:
        log(f"离线模式：直接应用 {args.bundle}")
        mgr = UpdateManager("", "")
        mgr.apply_bundle(pathlib.Path(args.bundle).absolute())
        return

    if not email_addr:
        email_addr = input("请输入收件 QQ 邮箱: ").strip()
    if not authkey:
        authkey = getpass.getpass("请输入授权码 (IMAP 授权码，输入不可见): ").strip()
        
    if not email_addr or not authkey:
        log("必须提供邮箱和授权码才能执行在线拉取。", "ERROR")
        sys.exit(1)
        
    save_config(email_addr, authkey)

    mgr = UpdateManager(email_addr, authkey)
    
    if not mgr.verify_email_whitelist():
        sys.exit(1)
        
    if not mgr.verify_imap_login():
        sys.exit(1)

    if mgr.try_direct_fetch():
        return

    log("网络较慢或包较大，切换至邮件同步通道。")
    if not mgr.trigger_workflow():
        log("请前往 Actions 页面手动触发 Incremental Bundle Mail。", "WARN")
        
    mgr.poll_mail(timeout_mins=10)

if __name__ == "__main__":
    main()
