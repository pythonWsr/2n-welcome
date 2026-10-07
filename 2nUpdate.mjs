#!/usr/bin/env node
// 2nUpdate.mjs
//
// 用法：
//   node 2nUpdate.mjs [-f] [-m "提交信息"] [--allow-empty] [-r|--revert [sha]]
//
// 选项：
//   -f                  强制模式，跳过远程差异检查
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
  console.log('  -f                  强制模式，跳过远程差异检查');
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
  if (r.status !== 0) process.exit(r.status || 1);
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

// ---- 主流程 ----
async function main() {
  // ============ 回退模式 ============
  if (REVERT_MODE) {
    info('获取远程最新状态...');
    gitRun(['fetch', 'origin']);

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
    const r1 = git(['reset', '--hard', REVERT_SHA], { stdio: 'inherit' });
    if (r1.status !== 0) {
      err('回退失败，请检查 SHA 是否有效。');
      process.exit(1);
    }

    info('git branch -M main');
    gitRun(['branch', '-M', 'main']);

    info('git push -u origin main --force-with-lease -v');
    gitRun(['push', '-u', 'origin', 'main', '--force-with-lease', '-v']);

    ok('回退并推送完成！');
    return;
  }

  // ============ 提交信息获取 ============
  if (!MSG) {
    MSG = (await prompt('commit message: ')).trim();
    if (!MSG) MSG = 'a minor update';
  }

  // ============ 非强制模式：检查远程差异 ============
  if (!FORCE) {
    info('获取远程最新状态...');
    const fetchR = git(['fetch', 'origin'], { stdio: 'inherit' });
    if (fetchR.status !== 0) {
      err('获取失败，请检查网络或SSH配置');
      process.exit(1);
    }

    const BRANCH = gitCapture(['branch', '--show-current']);
    if (!BRANCH) {
      err('无法检测当前分支');
      process.exit(1);
    }

    const diffR = git(['diff', '--name-only', 'HEAD', `origin/${BRANCH}`]);
    const diffFiles = (diffR.stdout || '').trim().split('\n').filter(Boolean);

    if (diffFiles.length > 0) {
      console.log('');
      warn(`本地与远程 ${BRANCH} 存在差异的文件:`);
      diffFiles.forEach(f => log(`  ${f}`));
      console.log('');

      // 备份本地版本到 .local/
      log('[BACKUP] 备份本地版本到 .local/ ...');
      fs.mkdirSync(path.join(REPO_ROOT, '.local'), { recursive: true });
      for (const f of diffFiles) {
        const abs = path.join(REPO_ROOT, f);
        if (!fs.existsSync(abs)) continue;
        const dest = path.join(REPO_ROOT, '.local', f);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(abs, dest);
        log(`  已备份: ${f} -> .local/${f}`);
      }

      // 用远程覆盖本地
      info(`使用远程 origin/${BRANCH} 覆盖本地文件...`);
      for (const f of diffFiles) {
        const abs = path.join(REPO_ROOT, f);
        const existsRemote = git(['cat-file', '-e', `origin/${BRANCH}:${f}`]).status === 0;
        if (existsRemote) {
          const co = git(['checkout', `origin/${BRANCH}`, '--', f]);
          if (co.status === 0) log(`  已覆盖: ${f}`);
          else warn(`  覆盖失败: ${f}`);
        } else {
          try { fs.unlinkSync(abs); } catch {}
          log(`  已删除: ${f}（远程已不存在）`);
        }
      }

      console.log('');
      ok('已用远程文件覆盖本地文件，本地版本已备份到 .local/');
      log('   请手动合并 .local/ 中的内容到项目文件后再推送。');
      return;
    } else {
      ok('本地与远程无差异，继续推送流程...');
    }
  }

  // ============ 正常推送 ============
  info('git add .');
  gitRun(['add', '.']);

  if (ALLOW_EMPTY) {
    info(`git commit --allow-empty -m "${MSG}"`);
    gitRun(['commit', '--allow-empty', '-m', MSG]);
  } else {
    info(`git commit -m "${MSG}"`);
    gitRun(['commit', '-m', MSG]);
  }

  info('git branch -M main');
  gitRun(['branch', '-M', 'main']);

  info('git push -u origin main -v');
  gitRun(['push', '-u', 'origin', 'main', '-v']);

  ok('推送完成！');
}

main().catch(e => {
  err(e.message);
  process.exit(1);
});
