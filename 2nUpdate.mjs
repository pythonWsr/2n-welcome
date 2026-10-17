#!/usr/bin/env node
// 2nUpdate.mjs
//
// 用法：
//   node 2nUpdate.mjs [-c|--check] [-m "提交信息"] [--allow-empty] [-r|--revert [sha]] [--wait <分钟>]
//
// 选项：
//   -c, --check         仅检测当前改动是否涉及受保护文件及落后状态，不执行提交
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
// 脚本在 -c 模式下会检测这些文件并给出提示。
const PROTECTED_PATTERNS = [
  '.github/CODEOWNERS',
  'config/mail-recipients.json',
  '.github/workflows/',
  '2nUpdate.mjs'
];

// ---- CLI 参数解析 ----
let CHECK_ONLY = false;
let ALLOW_EMPTY = false;
let REVERT_MODE = false;
let REVERT_SHA = '';
let MSG = '';
let WAIT_MINUTES = 10;

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '-c' || a === '--check') CHECK_ONLY = true;
  else if (a === '--allow-empty') ALLOW_EMPTY = true;
  else if (a === '-r' || a === '--revert') {
    REVERT_MODE = true;
    // 如果后面跟着的不是参数（比如 -m），则视为 SHA
    if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
      REVERT_SHA = args[i + 1];
      i++;
    }
  } else if (a === '-m') {
    if (i + 1 < args.length) { MSG = args[i + 1]; i++; }
  } else if (a === '--wait') {
    if (i + 1 < args.length) { WAIT_MINUTES = parseInt(args[i + 1], 10) || 10; i++; }
  } else if (a === '-h' || a === '--help') {
    console.log(`用法: node 2nUpdate.mjs [-c] [-m "msg"] [--allow-empty] [-r [sha]] [--wait <分钟>]`);
    process.exit(0);
  }
}

// 参数冲突检查：回退模式不需要也不允许填写 commit message
if (REVERT_MODE && MSG) {
  console.error('[ERROR] -r/--revert 不能与 -m 同时使用');
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

// 执行 gh CLI 命令，静默运行
function gh(args) { 
  return spawnSync('gh', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); 
}

// 终端交互提示
function prompt(q) { 
  return new Promise(res => { 
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); 
    rl.question(q, ans => { rl.close(); res(ans); }); 
  }); 
}

// 带颜色的日志输出封装
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
  // 1. 第一时间拉取远程最新状态，用于判断本地是否落后
  info('获取远程最新状态...');
  if (!gitRun(['fetch', 'origin'])) {
    err('fetch 失败，请检查网络。');
    process.exit(1);
  }

  const currentBranch = gitCapture(['branch', '--show-current']);
  // 计算本地落后远程 main 多少个提交
  const isBehind = parseInt(gitCapture(['rev-list', '--count', `HEAD..origin/main`]) || '0', 10) > 0;
  const files = getChangedFiles();

  // ============ 模式一：预检测模式 (-c) ============
  if (CHECK_ONLY) {
    if (files.length === 0) {
      ok('工作区干净，没有需要提交的文件。');
      process.exit(0);
    }
    console.log('[INFO] 当前修改的文件：');
    files.forEach(f => console.log(`  - ${f}`));

    if (isBehind) {
      warn(`⚠️ 本地当前分支落后远程 main，脚本在提交时会自动基于 origin/main 创建新分支。`);
    }

    const protectedFiles = checkProtected(files);
    if (protectedFiles.length > 0) {
      warn('⚠️ 包含受保护文件，提交后将触发 PR 并【等待审批】：');
      protectedFiles.forEach(f => warn(`  - ${f}`));
    } else {
      ok('未涉及受保护文件，提交后的 PR 将自动合并。');
    }
    process.exit(0);
  }

  // 2. 检查 GitHub CLI 状态（脚本强依赖 gh 进行 PR 操作）
  if (gh(['auth', 'status']).status !== 0) {
    err('未检测到 GitHub CLI 或未登录，请先安装并运行 gh auth login。');
    process.exit(1);
  }

  // ============ 模式二：回退模式 (-r) ============
  if (REVERT_MODE) {
    if (!REVERT_SHA) {
      git(['log', '--oneline', '-n', '20'], { stdio: 'inherit' });
      info('未提供 SHA，未执行回退。请指定: node 2nUpdate.mjs -r <sha>');
      return;
    }
    
    // 创建一个专门用于 revert 的分支，基于 origin/main
    const branch = `pr/revert-${REVERT_SHA.slice(0, 7)}-${Date.now()}`;
    info(`创建回退分支 ${branch}，基于 origin/main`);
    if (!gitRun(['switch', '-c', branch, 'origin/main'])) process.exit(1);

    // 执行反向提交
    info(`执行 git revert ${REVERT_SHA}`);
    if (!gitRun(['revert', '--no-edit', REVERT_SHA])) {
      err('Revert 失败（可能产生冲突）。请手动解决冲突，或 git revert --abort 后重试。');
      process.exit(1);
    }
    
    info(`推送分支 ${branch}...`);
    if (!gitRun(['push', '-u', 'origin', branch])) process.exit(1);

    // 创建 PR 并进入等待合并流程
    info('创建 Pull Request...');
    const prRes = gh(['pr', 'create', '--title', `Revert ${REVERT_SHA.slice(0, 7)}`, '--body', `This reverts commit ${REVERT_SHA}.`, '--base', 'main', '--head', branch]);
    if (prRes.status !== 0) { err(`PR 创建失败: ${prRes.stderr}`); process.exit(1); }
    await handleMergeAndWait(prRes.stdout.trim(), branch);
    return;
  }

  // ============ 模式三：普通提交模式 ============
  if (!MSG) {
    MSG = (await prompt('commit message: ')).trim() || 'a minor update';
  }

  let targetBranch = currentBranch;

  // 【核心防御机制】
  // 如果当前在 main 分支，不要直接提交。
  // 使用 `switch -c <new_branch> origin/main` 会基于最新的远程代码创建新分支，
  // 同时**保留你本地尚未提交的修改**（自动带过去）。
  // 这样既解决了本地落后的分叉问题，又防止了 PR 冲突。
  if (currentBranch === 'main') {
    targetBranch = `pr/${Date.now()}`;
    info(`基于 origin/main 创建新分支 ${targetBranch}（自动携带本地未提交改动）`);
    if (!gitRun(['switch', '-c', targetBranch, 'origin/main'])) process.exit(1);
  }

  info('git add .');
  gitRun(['add', '.']);

  // 检查暂存区是否有内容
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

  // 再次确认，当前分支是否有领先远程的提交
  const ahead = parseInt(gitCapture(['rev-list', '--count', `origin/main..HEAD`]) || '0', 10);
  if (ahead === 0) {
    warn('本地没有领先 origin/main 的提交，无需开 PR。');
    // 如果在切分支前没有改动，或者改动没提交成功，清理掉临时分支并切回 main
    if (targetBranch !== 'main') { 
      gitRun(['switch', 'main']); 
      gitRun(['branch', '-d', targetBranch]); 
    }
    return;
  }

  info(`推送分支 ${targetBranch}...`);
  // 首次推送，如果失败（通常是分支已存在且被修改过），尝试安全强推
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
  // 要求 GitHub 在满足条件（审批通过/无冲突）时自动 Squash 合并并删除远程分支
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

    // 成功合并
    if (data.state === 'MERGED') {
      ok('PR 已成功合并！');
      await syncLocalMain(branch);
      return;
    }
    // PR 被拒绝/关闭
    if (data.state === 'CLOSED') { 
      err('PR 被关闭，未合并。'); 
      process.exit(1); 
    }
    // 存在代码冲突
    if (data.mergeStateStatus === 'DIRTY') { 
      err('PR 存在冲突 (DIRTY)，请手动解决后重新触发。'); 
      process.exit(1); 
    }

    // 检测是否卡在审批阶段
    if (data.reviewDecision === 'REVIEW_REQUIRED' || data.mergeStateStatus === 'BLOCKED') {
      blockCount++;
      // 如果连续 3 次（30秒）都卡着，说明确实需要人工去网页点 Approve，脚本不再傻等
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
  // 因为 PR 合并通常是 Squash（压缩成一个新 commit），
  // 本地原来的旧 commit 的 SHA 和远程不一样，直接 pull 会产生历史分叉（Merge commit）。
  // 强制重置到远程分支即可保持绝对干净。
  if (!gitRun(['reset', '--hard', 'origin/main'])) {
    warn('同步远程 main 失败。');
  }
  
  // 清理临时分支
  if (prBranch !== 'main') {
    info(`清理本地 PR 分支 ${prBranch}`);
    gitRun(['branch', '-D', prBranch]);
  }
  
  ok('本地仓库已是最新。');
}

// 启动脚本并捕获未处理的异常
main().catch(e => { 
  err(e.message); 
  process.exit(1); 
});
