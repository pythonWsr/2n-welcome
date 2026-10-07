#!/usr/bin/env node
// 2nUpdate.mjs
//
// 用法：
//   node 2nUpdate.mjs [-f] [-m "提交信息"] [--allow-empty] [-r|--revert [sha]]
//
// 选项：
//   -f                  强制模式，跳过 push 前的落后检查
//   -m "提交信息"        提交信息
//   --allow-empty       允许空提交
//   -r, --revert <sha>  回退到指定提交并强制推送
//                       不带 <sha> 时仅 fetch 并显示 git log --oneline
//   -h, --help          显示本帮助

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.dirname(__filename);

// ---- CLI 参数 ----
let FORCE = false;
let ALLOW_EMPTY = false;
let REVERT_MODE = false;
let REVERT_SHA = '';
let MSG = '';
let HAS_MSG_ARG = false;
let HAS_FORCE_ARG = false;
let HAS_ALLOW_EMPTY_ARG = false;
let HAS_REVERT_ARG = false;

function usage() {
  const name = path.basename(process.argv[1]);
  console.log(`用法: ${name} [-f] [-m "提交信息"] [--allow-empty] [-r|--revert [sha]]`);
  console.log('选项:');
  console.log('  -f                  强制模式，跳过 push 前的落后检查');
  console.log('  -m "提交信息"        提交信息');
  console.log('  --allow-empty       允许空提交');
  console.log('  -r, --revert <sha>  回退到指定提交并强制推送');
  console.log('                      不带 <sha> 时仅 fetch 并显示 git log --oneline');
  console.log('  -h, --help          显示本帮助');
}

function conflictExit(msg) {
  console.error(`[ERROR] 参数冲突: ${msg}`);
  console.error('');
  usage();
  process.exit(1);
}

// ---- 参数解析 ----
const args = process.argv.slice(2);
let i = 0;
while (i < args.length) {
  const a = args[i];
  if (a === '-f') {
    if (HAS_FORCE_ARG) conflictExit('-f 重复出现');
    HAS_FORCE_ARG = true;
    FORCE = true;
    i++;
  } else if (a === '--allow-empty') {
    if (HAS_ALLOW_EMPTY_ARG) conflictExit('--allow-empty 重复出现');
    HAS_ALLOW_EMPTY_ARG = true;
    ALLOW_EMPTY = true;
    i++;
  } else if (a === '-r' || a === '--revert') {
    if (HAS_REVERT_ARG) conflictExit(`${a} 重复出现`);
    HAS_REVERT_ARG = true;
    REVERT_MODE = true;
    if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
      REVERT_SHA = args[i + 1];
      i += 2;
    } else {
      i++;
    }
  } else if (a === '-m') {
    if (HAS_MSG_ARG) conflictExit('-m 重复出现');
    HAS_MSG_ARG = true;
    if (i + 1 < args.length) {
      MSG = args[i + 1];
      i += 2;
    } else {
      console.error('[WARN] -m 后未提供信息，将进入交互提示');
      i++;
    }
  } else if (a === '-h' || a === '--help') {
    usage();
    process.exit(0);
  } else {
    console.error(`[ERROR] 未知参数: ${a}`);
    console.error('');
    usage();
    process.exit(1);
  }
}

// ---- 冲突检测 ----
if (REVERT_MODE) {
  const conflicts = [];
  if (HAS_MSG_ARG) conflicts.push('-m');
  if (HAS_FORCE_ARG) conflicts.push('-f');
  if (HAS_ALLOW_EMPTY_ARG) conflicts.push('--allow-empty');
  if (conflicts.length > 0) {
    conflictExit(`-r/--revert 不能与 ${conflicts.join(' ')} 同时使用`);
  }
}

// ---- 工具 ----
function git(args, opts = {}) {
  return spawnSync('git', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: opts.stdio || ['ignore', 'pipe', 'pipe'],
  });
}

function gitRun(args) {
  const r = git(args, { stdio: 'inherit' });
  return r.status === 0;
}

function gitCapture(args) {
  const r = git(args);
  if (r.status !== 0) return '';
  return (r.stdout || '').trim();
}

function prompt(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, ans => { rl.close(); resolve(ans); });
  });
}

const log = (...a) => console.log(...a);
const info = m => console.log(`[LOG] ${m}`);
const ok = m => console.log(`[OK] ${m}`);
const warn = m => console.error(`[WARN] ${m}`);
const err = m => console.error(`[ERROR] ${m}`);

// ---- 检测 rebase 是否处于进行中 ----
function isRebaseInProgress() {
  const g = path.join(REPO_ROOT, '.git');
  return fs.existsSync(path.join(g, 'rebase-merge')) || fs.existsSync(path.join(g, 'rebase-apply'));
}

// ---- rebase 失败处理 ----
function handleRebaseFailure() {
  console.error('');
  if (isRebaseInProgress()) {
    err('rebase 冲突，请手动处理：');
    console.error('  1. 编辑冲突文件（git status 可查看）');
    console.error('  2. git add <已解决的文件>');
    console.error('  3. git rebase --continue');
    console.error('  或放弃本次 rebase：');
    console.error('     git rebase --abort');
  } else {
    err('rebase 失败，请检查网络或本地状态。');
  }
  console.error('');
  console.error('处理完后可重新运行：node 2nUpdate.mjs');
  process.exit(1);
}

// ---- 主流程 ----
async function main() {
  // ============ 回退模式 ============
  if (REVERT_MODE) {
    info('获取远程最新状态...');
    if (!gitRun(['fetch', 'origin'])) {
      err('获取失败，请检查网络或 SSH 配置');
      process.exit(1);
    }

    if (!REVERT_SHA) {
      info('git log --oneline');
      git(['log', '--oneline'], { stdio: 'inherit' });
      console.log('');
      log('[INFO] 未提供 SHA，未执行回退。');
      log('   请重新运行并指定要回退到的 SHA，例如:');
      log(`     ${path.basename(process.argv[1])} -r <sha>`);
      return;
    }

    info(`git reset --hard ${REVERT_SHA}`);
    if (!gitRun(['reset', '--hard', REVERT_SHA])) {
      err('回退失败，请检查 SHA 是否有效。');
      process.exit(1);
    }

    info('git branch -M main');
    gitRun(['branch', '-M', 'main']);

    info('git push -u origin main --force-with-lease -v');
    if (!gitRun(['push', '-u', 'origin', 'main', '--force-with-lease', '-v'])) {
      err('推送失败');
      process.exit(1);
    }

    ok('回退并推送完成！');
    return;
  }

  // ============ 提交信息获取 ============
  if (!MSG) {
    MSG = (await prompt('commit message: ')).trim();
    if (!MSG) MSG = 'a minor update';
  }

  // ============ 提交本地改动 ============
  info('git add .');
  gitRun(['add', '.']);

  const hasStaged = git(['diff', '--cached', '--quiet']).status === 1;
  const willCommit = hasStaged || ALLOW_EMPTY;

  if (willCommit) {
    if (hasStaged) {
      info(`git commit -m "${MSG}"`);
      if (!gitRun(['commit', '-m', MSG])) {
        err('commit 失败');
        process.exit(1);
      }
    } else {
      // 无暂存内容但允许空提交
      info(`git commit --allow-empty -m "${MSG}"`);
      if (!gitRun(['commit', '--allow-empty', '-m', MSG])) {
        err('commit 失败');
        process.exit(1);
      }
    }
  } else {
    warn('工作区无改动，跳过 commit');
  }

  // ============ 拉取远程状态 ============
  info('获取远程最新状态...');
  if (!gitRun(['fetch', 'origin'])) {
    err('获取失败，请检查网络或 SSH 配置');
    process.exit(1);
  }

  const BRANCH = gitCapture(['branch', '--show-current']);
  if (!BRANCH) {
    err('无法检测当前分支');
    process.exit(1);
  }

  // ============ 判断 ahead / behind ============
  if (!FORCE) {
    const behind = parseInt(gitCapture(['rev-list', '--count', `HEAD..origin/${BRANCH}`]) || '0', 10);
    const ahead = parseInt(gitCapture(['rev-list', '--count', `origin/${BRANCH}..HEAD`]) || '0', 10);

    if (behind > 0) {
      info(`本地落后远程 ${behind} 个提交，执行 git pull --rebase`);
      if (!gitRun(['pull', '--rebase', 'origin', BRANCH])) {
        handleRebaseFailure();
      }
      ok('rebase 成功');
    } else if (ahead === 0 && behind === 0) {
      warn('本地与远程无差异');
    } else {
      ok(`本地领先远程 ${ahead} 个提交`);
    }
  }

  // ============ 推送 ============
  info('git branch -M main');
  gitRun(['branch', '-M', 'main']);

  info('git push -u origin main -v');
  if (gitRun(['push', '-u', 'origin', 'main', '-v'])) {
    ok('推送完成！');
    return;
  }

  // push 被拒 → 尝试自动 rebase 后重试
  warn('push 被拒，尝试自动 pull --rebase 后重试...');
  if (!gitRun(['pull', '--rebase', 'origin', 'main'])) {
    handleRebaseFailure();
  }

  info('重试 git push -u origin main -v');
  if (!gitRun(['push', '-u', 'origin', 'main', '-v'])) {
    err('推送仍然失败，请手动排查。');
    process.exit(1);
  }

  ok('推送完成！');
}

main().catch(e => {
  err(e.message);
  process.exit(1);
});
