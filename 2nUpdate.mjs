#!/usr/bin/env node
// 2nUpdate.mjs
//
// 用法：
//   node 2nUpdate.mjs [-c|--check] [--commit-only] [-m "提交信息"] [--allow-empty] [-r|--revert [sha]] [--wait <分钟>]
//
// 选项：
//   -c, --check         仅检测当前改动是否涉及受保护文件及落后状态，不执行提交
//   --commit-only       仅在本地执行提交，不切换分支、不推送、不创建 PR
//   -m "提交信息"        提交信息
//   --allow-empty       允许空提交
//   -r, --revert <sha>  生成回退指定提交的 PR
//   --wait <分钟>       等待 PR 合并的超时时间（默认 10 分钟）
//   -h, --help          显示本帮助

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.dirname(__filename);

// ---- 配置：哪些文件受 CODEOWNERS 保护 ----
// 这些文件被修改后，PR 会被 GitHub 的 Ruleset 拦截，必须由 pythonWsr 审批才能合并。
const PROTECTED_PATTERNS = [
  '.github/CODEOWNERS',
  'config/mail-recipients.json',
  '.github/workflows/',
  '2nUpdate.mjs'
];

// ---- CLI 参数解析 ----
let CHECK_ONLY = false;
let COMMIT_ONLY = false;
let ALLOW_EMPTY = false;
let REVERT_MODE = false;
let REVERT_SHA = '';
let MSG = '';
let WAIT_MINUTES = 10;

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '-c' || a === '--check') {
    CHECK_ONLY = true;
  } else if (a === '--commit-only') {
    COMMIT_ONLY = true;
  } else if (a === '--allow-empty') {
    ALLOW_EMPTY = true;
  } else if (a === '-r' || a === '--revert') {
    REVERT_MODE = true;
    // 如果后面跟着的不是新参数（比如 -m），则视为回退的 SHA
    if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
      REVERT_SHA = args[i + 1];
      i++;
    }
  } else if (a === '-m') {
    if (i + 1 < args.length) { 
      MSG = args[i + 1]; 
      i++; 
    }
  } else if (a === '--wait') {
    if (i + 1 < args.length) { 
      WAIT_MINUTES = parseInt(args[i + 1], 10) || 10; 
      i++; 
    }
  } else if (a === '-h' || a === '--help') {
    console.log(`用法: node 2nUpdate.mjs [-c] [--commit-only] [-m "msg"] [--allow-empty] [-r [sha]] [--wait <分钟>]`);
    process.exit(0);
  }
}

// 参数冲突检查
if (REVERT_MODE && MSG) {
  console.error('[ERROR] -r/--revert 不能与 -m 同时使用');
  process.exit(1);
}
if (COMMIT_ONLY && REVERT_MODE) {
  console.error('[ERROR] --commit-only 不能与 -r/--revert 同时使用');
  process.exit(1);
}

// ---- 基础工具函数封装 ----

// 执行 git 命令，返回结果对象（默认静默模式，不打印到终端）
function git(args, opts = {}) { 
  return spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: opts.stdio || ['ignore', 'pipe', 'pipe'] }); 
}

// 执行 git 命令，并将输出直接打印到终端（用于 push、switch 等需要看进度的操作）
function gitRun(args) { 
  return git(args, { stdio: 'inherit' }).status === 0; 
}

// 执行 git 命令，返回清理后的 stdout 字符串（用于获取分支名、提交数等）
function gitCapture(args) { 
  const r = git(args); 
  return r.status !== 0 ? '' : (r.stdout || '').trim(); 
}

// 执行 gh (GitHub CLI) 命令，静默运行
function gh(args) { 
  return spawnSync('gh', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); 
}

// 终端交互提示（用于输入 commit message）
function prompt(q) { 
  return new Promise(res => { 
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); 
    rl.question(q, ans => { rl.close(); res(ans); }); 
  }); 
}

// 日志输出封装，带前缀和颜色
const info = m => console.log(`[INFO] ${m}`);
const ok = m => console.log(`[OK] ${m}`);
const warn = m => console.warn(`[WARN] ${m}`);
const err = m => console.error(`[ERROR] ${m}`);

// ---- 辅助检查函数 ----

// 获取当前工作区修改的文件列表（解析 git status）
function getChangedFiles() {
  const res = git(['status', '--porcelain']);
  if (!res.stdout) return [];
  return res.stdout.trim().split('\n').filter(Boolean).map(line => {
    let file = line.substring(3).trim();
    // 处理重命名情况 "old -> new"
    if (file.includes(' -> ')) file = file.split(' -> ')[1];
    // 处理带引号的特殊路径
    return file.replace(/^"|"$/g, '');
  });
}

// 检查文件列表是否命中受保护规则
function checkProtected(files) {
  return files.filter(f => PROTECTED_PATTERNS.some(p => f === p || f.startsWith(p)));
}

// ---- 主流程 ----
async function main() {
  const currentBranch = gitCapture(['branch', '--show-current']);
  
  // ============ 模式一：预检测模式 (-c) ============
  if (CHECK_ONLY) {
    info('获取远程最新状态...');
    gitRun(['fetch', 'origin']);
    
    // 计算本地落后远程 main 多少个提交
    const isBehind = parseInt(gitCapture(['rev-list', '--count', `HEAD..origin/main`]) || '0', 10) > 0;
    const files = getChangedFiles();

    if (files.length === 0) { 
      ok('工作区干净，没有需要提交的文件。'); 
      process.exit(0); 
    }
    console.log('[INFO] 当前修改的文件：');
    files.forEach(f => console.log(`  - ${f}`));

    if (isBehind) {
      warn(`⚠️ 本地当前分支落后远程 main。`);
    }

    const protectedFiles = checkProtected(files);
    if (protectedFiles.length > 0) {
      warn('⚠️ 包含受保护文件，提交后将触发 PR 并【等待 CODEOWNERS 审批】：');
      protectedFiles.forEach(f => warn(`  - ${f}`));
    } else {
      ok('未涉及受保护文件，提交后的 PR 将自动合并。');
    }
    process.exit(0);
  }

  // ============ 模式二：仅本地提交 (--commit-only) ============
  if (COMMIT_ONLY) {
    info('尝试获取远程状态用于参考...');
    // 尝试 fetch，即使断网失败也不阻塞本地 commit 流程
    const fetchOk = gitRun(['fetch', 'origin']);
    
    if (!fetchOk) {
      warn('无法拉取远程状态（可能断网）。将直接执行本地提交。');
    } else {
      const isBehind = parseInt(gitCapture(['rev-list', '--count', `HEAD..origin/main`]) || '0', 10) > 0;
      if (isBehind && currentBranch === 'main') {
        warn(`⚠️ 警告：你正在落后的 main 分支上直接提交。`);
        warn(`   稍后运行默认的 node 2nUpdate.mjs 时，脚本会自动帮你切分支并 rebase 到最新代码。`);
      }
    }

    if (!MSG) {
      MSG = (await prompt('commit message: ')).trim() || 'a minor update';
    }
    
    info('git add .');
    gitRun(['add', '.']);
    
    const hasStaged = git(['diff', '--cached', '--quiet']).status === 1;
    if (hasStaged) {
      info(`git commit -m "${MSG}"`);
      if (!gitRun(['commit', '-m', MSG])) process.exit(1);
    } else if (ALLOW_EMPTY) {
      info(`git commit --allow-empty -m "${MSG}"`);
      if (!gitRun(['commit', '--allow-empty', '-m', MSG])) process.exit(1);
    } else {
      warn('工作区无改动，跳过 commit');
    }
    
    ok(`提交完成。当前所在分支: ${currentBranch} (未执行 push)`);
    return;
  }

  // ============ 以下模式需要联网和 gh 环境 ============
  info('获取远程最新状态...');
  if (!gitRun(['fetch', 'origin'])) {
    err('fetch 失败，请检查网络。');
    process.exit(1);
  }

  if (gh(['auth', 'status']).status !== 0) {
    err('未检测到 GitHub CLI 或未登录，请先安装并运行 gh auth login。');
    process.exit(1);
  }

  // ============ 模式三：回退模式 (-r) ============
  if (REVERT_MODE) {
    if (!REVERT_SHA) {
      git(['log', '--oneline', '-n', '20'], { stdio: 'inherit' });
      info('未提供 SHA，未执行回退。请指定: node 2nUpdate.mjs -r <sha>');
      return;
    }
    
    // 创建专门的回退分支，严格基于 origin/main 开始
    const branch = `pr/revert-${REVERT_SHA.slice(0, 7)}-${Date.now()}`;
    info(`创建回退分支 ${branch}，基于 origin/main`);
    if (!gitRun(['switch', '-c', branch, 'origin/main'])) process.exit(1);

    // 执行反向提交（保留历史，避免破坏分支）
    info(`执行 git revert ${REVERT_SHA}`);
    if (!gitRun(['revert', '--no-edit', REVERT_SHA])) {
      err('Revert 失败（可能产生冲突）。请手动解决冲突，或 git revert --abort 后重试。');
      process.exit(1);
    }
    
    info(`推送分支 ${branch}...`);
    if (!gitRun(['push', '-u', 'origin', branch])) process.exit(1);

    info('创建 Pull Request...');
    const prRes = gh(['pr', 'create', '--title', `Revert ${REVERT_SHA.slice(0, 7)}`, '--body', `This reverts commit ${REVERT_SHA}.`, '--base', 'main', '--head', branch]);
    if (prRes.status !== 0) { 
      err(`PR 创建失败: ${prRes.stderr}`); 
      process.exit(1); 
    }
    await handleMergeAndWait(prRes.stdout.trim(), branch);
    return;
  }

  // ============ 模式四：普通 PR 提交模式 ============
  if (!MSG) {
    MSG = (await prompt('commit message: ')).trim() || 'a minor update';
  }

  let targetBranch = currentBranch;

  // 【核心防御机制：处理在 main 分支上的各种情况】
  if (currentBranch === 'main') {
    targetBranch = `pr/${Date.now()}`;
    
    // 计算本地 main 是否有未推送的 commit（比如用户之前用了 --commit-only）
    const ahead = parseInt(gitCapture(['rev-list', '--count', `origin/main..HEAD`]) || '0', 10);
    
    if (ahead > 0) {
      // 场景 A：本地已经有 commit 了，且可能落后于远程
      warn(`⚠️ 发现本地 main 有 ${ahead} 个未推送提交，且可能落后于远程。`);
      info(`正在创建新分支 ${targetBranch} 并自动变基 (rebase) 到最新 origin/main...`);
      
      // 1. 先把已有的 commit 带到新分支上
      if (!gitRun(['switch', '-c', targetBranch])) process.exit(1);
      
      // 2. 把新分支 rebase 到最新的 origin/main（自动解决“本地落后”的问题）
      if (!gitRun(['rebase', 'origin/main'])) {
        err('Rebase 失败（可能存在冲突）。');
        err('请手动解决冲突后运行: git rebase --continue，或运行 git rebase --abort 放弃。');
        process.exit(1);
      }
      ok('自动变基成功，你的提交已应用到最新代码之上。');
      
    } else {
      // 场景 B：本地只有工作区未提交的改动
      info(`基于 origin/main 创建新分支 ${targetBranch}（自动携带本地未提交改动）`);
      if (!gitRun(['switch', '-c', targetBranch, 'origin/main'])) process.exit(1);
    }
  }

  info('git add .');
  gitRun(['add', '.']);

  const hasStaged = git(['diff', '--cached', '--quiet']).status === 1;
  if (hasStaged) {
    info(`git commit -m "${MSG}"`);
    if (!gitRun(['commit', '-m', MSG])) process.exit(1);
  } else if (ALLOW_EMPTY) {
    info(`git commit --allow-empty -m "${MSG}"`);
    if (!gitRun(['commit', '--allow-empty', '-m', MSG])) process.exit(1);
  } else {
    warn('工作区无改动，跳过 commit');
  }

  // 再次确认当前分支是否有领先远程的提交
  const ahead = parseInt(gitCapture(['rev-list', '--count', `origin/main..HEAD`]) || '0', 10);
  if (ahead === 0) {
    warn('本地没有领先 origin/main 的提交，无需开 PR。');
    if (targetBranch !== 'main') { 
      gitRun(['switch', 'main']); 
      gitRun(['branch', '-d', targetBranch]); 
    }
    return;
  }

  info(`推送分支 ${targetBranch}...`);
  if (!gitRun(['push', '-u', 'origin', targetBranch])) {
    warn('普通 push 失败，尝试 force-with-lease...');
    if (!gitRun(['push', '-u', 'origin', targetBranch, '--force-with-lease'])) process.exit(1);
  }

  info('创建 Pull Request...');
  const prRes = gh(['pr', 'create', '--title', MSG, '--body', 'Auto-generated PR by 2nUpdate.mjs', '--base', 'main', '--head', targetBranch]);
  let prUrl = '';
  if (prRes.status === 0) {
    prUrl = prRes.stdout.trim();
  } else if (prRes.stderr.includes('already exists')) {
    warn('该分支的 PR 已存在，获取现有 PR URL...');
    prUrl = gh(['pr', 'view', targetBranch, '--json', 'url', '-q', '.url']).stdout.trim();
  } else { 
    err(`PR 创建失败: ${prRes.stderr}`); 
    process.exit(1); 
  }

  info(`PR 地址: ${prUrl}`);
  await handleMergeAndWait(prUrl, targetBranch);
}

// ---- 核心流程：等待 PR 合并及智能退出 ----
async function handleMergeAndWait(prUrl, branch) {
  info('设置 Auto-merge (Squash)...');
  // 要求 GitHub 在满足条件（无冲突/审批通过）时自动 Squash 合并并删除远程分支
  const mergeRes = gh(['pr', 'merge', prUrl, '--auto', '--squash', '--delete-branch']);
  if (mergeRes.status !== 0 && !mergeRes.stderr.includes('not enabled')) {
    warn(`开启 Auto-merge 失败: ${mergeRes.stderr.trim()}`);
  }

  info(`等待 PR 合并... (超时 ${WAIT_MINUTES} 分钟)`);
  const maxAttempts = WAIT_MINUTES * 6; 
  let blockCount = 0; // 记录处于被阻塞状态的次数

  // 每 10 秒轮询一次 PR 状态
  for (let i = 1; i <= maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const viewRes = gh(['pr', 'view', prUrl, '--json', 'state,mergeStateStatus,reviewDecision']);
    if (viewRes.status !== 0) continue; // 网络波动忽略
    
    const data = JSON.parse(viewRes.stdout);

    // 1. 成功合并
    if (data.state === 'MERGED') {
      ok('PR 已成功合并！');
      await syncLocalMain(branch);
      return;
    }
    // 2. PR 被拒绝/关闭
    if (data.state === 'CLOSED') { 
      err('PR 被关闭，未合并。'); 
      process.exit(1); 
    }
    // 3. 存在代码冲突
    if (data.mergeStateStatus === 'DIRTY') { 
      err('PR 存在冲突 (DIRTY)，请手动解决后重新触发。'); 
      process.exit(1); 
    }

    // 4. 检测是否卡在审批阶段
    if (data.reviewDecision === 'REVIEW_REQUIRED' || data.mergeStateStatus === 'BLOCKED') {
      blockCount++;
      // 如果连续 3 次（即 30 秒）都卡着，说明确实需要人工去网页点 Approve，脚本不再傻等
      if (blockCount >= 3) {
        warn(`\n⏸️ 检测到 PR 被挂起（需要 CODEOWNERS 审批）。`);
        warn(`脚本已自动退出，请前往 GitHub 审批后，PR 会自动合并：\n👉 ${prUrl}\n`);
        process.exit(2); 
      }
      console.log(`[WAIT] 正在等待审批或状态变化... (${i * 10}s)`);
    } else {
      // 其他状态（比如 GitHub 正在处理）
      console.log(`[WAIT] 当前状态: ${data.state} / ${data.mergeStateStatus}... (${i * 10}s)`);
    }
  }
  
  // 超时仍未合并
  warn(`等待超时 (${WAIT_MINUTES} 分钟)。PR 仍保持开启：${prUrl}`);
  process.exit(2);
}

// ---- 合并成功后的本地清理 ----
async function syncLocalMain(prBranch) {
  info('同步本地 main 分支...');
  
  // 切回主分支
  if (!gitRun(['switch', 'main'])) {
    warn('切换回 main 失败，请手动切回。');
    return;
  }
  
  // 【关键点】使用 reset --hard 而不是 pull。
  // 因为 PR 合并是 Squash（压缩成一个新 commit），本地原来的旧 commit 的 SHA 和远程不一样，
  // 直接 pull 会产生历史分叉（Merge commit）。强制重置到远程分支即可保持绝对干净。
  if (!gitRun(['reset', '--hard', 'origin/main'])) {
    warn('同步远程 main 失败。');
  }
  
  // 清理临时分支
  if (prBranch !== 'main') {
    // 检查本地分支是否存在，防止 gh 的 --delete-branch 已经把它删了导致报错
    const branchExists = git(['show-ref', '--verify', '--quiet', `refs/heads/${prBranch}`]).status === 0;
    if (branchExists) {
      info(`清理本地 PR 分支 ${prBranch}`);
      gitRun(['branch', '-D', prBranch]);
    }
  }
  
  ok('本地仓库已是最新。');
}

main().catch(e => { 
  err(e.message); 
  process.exit(1); 
});
