#!/usr/bin/env node
// data/3d/sync-from-copy.mjs
//
// 从 origin/copy/* 分支同步 3D 项目源码到 main 分支。
//
// 规则：
//   1. 本地从未改过 → 直接用上游覆盖
//   2. 本地改过（LOCALLY_MODIFIED）或位于 LOCALLY_RESERVED_PREFIXES 前缀下
//      的文件 → 保留本地，上游版本另存到 .local/3d-sync/<path>.upstream，
//      并尝试自动应用已知补丁
//   3. 本地删过的文件（LOCALLY_DELETED）→ 不从上游同步回来
//   4. 上游新增的文件 → 直接落地
//   5. 上游已删、本地还在的文件 → 移到 .history/<时间戳>/
//   6. SYNC_EXCLUDES 里的路径 → 完全跳过
//   7. 上游 .gitignore 的规则（除 GITIGNORE_SKIP_RULES）→ 加前缀后写入
//      根 .gitignore 的自动区块
//
// 提取前检查：
//   选定分支后，先验证上游和本地目标目录是同一个项目。检查项：
//     a) 顶层关键标志全部存在（src/public/content/scripts/
//        package.json/vite.config.js）
//     b) package.json 能被解析，且 name 字段严格等于
//        STRUCTURE_IDENTITY_NAME
//   任一失败 → 拒绝执行，除非同时指定 --branch=... 和 -f/--force。
//   这样可避免误把错误的 copy 分支同步到本地，破坏项目结构。
//
// 用法：
//   node data/3d/sync-from-copy.mjs
//   node data/3d/sync-from-copy.mjs --dry-run
//   node data/3d/sync-from-copy.mjs --branch=origin/copy/xxx
//   node data/3d/sync-from-copy.mjs --branch=origin/copy/xxx --force

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// ============ 配置 ============
const CONFIG = {
  COPY_BRANCH_PREFIX: 'origin/copy/',
  COPY_SOURCE_PATH: '',
  LOCAL_TARGET: 'data/3d/2n-spatial-world',
  BACKUP_DIR: '.local/3d-sync',
  HISTORY_DIR: '.history',
  ROOT_GITIGNORE: '.gitignore',
  GITIGNORE_BLOCK_BEGIN: '# BEGIN 3d-auto-sync',
  GITIGNORE_BLOCK_END: '# END 3d-auto-sync',
  GITIGNORE_PATH_PREFIX: '/data/3d/2n-spatial-world/',
  GITIGNORE_SKIP_RULES: ['dist/', 'dist'],

  // 结构身份检查
  STRUCTURE_MARKERS: [
    'src',
    'public',
    'content',
    'scripts',
    'package.json',
    'vite.config.js',
  ],
  STRUCTURE_IDENTITY_NAME: '2n-spatial-world',

  // 差异比例阈值（仅作警告，不阻断）
  STRUCTURE_DIFF_WARN: 0.5,

  LOCALLY_MODIFIED: ['vite.config.js'],
  LOCALLY_DELETED: [
    '.github/workflows/pages.yml',
    '.gitignore',
  ],
  LOCALLY_RESERVED_PREFIXES: ['.github/'],
  SYNC_EXCLUDES: [
    'node_modules',
    'dist',
    '.git',
    'public/assets/model-transport',
  ],
};
// ============================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const LOCAL_TARGET_ABS = path.resolve(REPO_ROOT, CONFIG.LOCAL_TARGET);
const BACKUP_ABS = path.resolve(REPO_ROOT, CONFIG.BACKUP_DIR);
const HISTORY_ABS = path.resolve(REPO_ROOT, CONFIG.HISTORY_DIR);
const ROOT_GITIGNORE_ABS = path.resolve(REPO_ROOT, CONFIG.ROOT_GITIGNORE);

// ---------- CLI ----------
let DRY_RUN = false;
let BRANCH_ARG = '';
let FORCE = false;
for (const arg of process.argv.slice(2)) {
  if (arg === '--dry-run') DRY_RUN = true;
  else if (arg === '-f' || arg === '--force') FORCE = true;
  else if (arg.startsWith('--branch=')) BRANCH_ARG = arg.slice('--branch='.length);
  else if (arg === '-h' || arg === '--help') {
    console.log('用法：node sync-from-copy.mjs [--dry-run] [--branch=<name>] [-f|--force]');
    console.log('  --dry-run        只显示将要做什么，不实际改动');
    console.log('  --branch=<name>  直接指定上游分支，跳过交互选择');
    console.log('  -f, --force      仅与 --branch 同时使用时，跳过结构检查');
    process.exit(0);
  } else {
    console.error(`未知参数：${arg}`);
    process.exit(1);
  }
}

// ---------- 工具 ----------
const log = (...args) => console.log(...args);

function git(args, opts = {}) {
  const r = spawnSync('git', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: opts.stdio || ['ignore', 'pipe', 'pipe'],
  });
  if (r.status !== 0 && !opts.ignoreError) {
    if (r.stderr) console.error(r.stderr);
    throw new Error(`git ${args.join(' ')} 退出码 ${r.status}`);
  }
  return (r.stdout || '').trim();
}

function hasCommand(cmd) {
  const which = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(which, [cmd], { encoding: 'utf8' }).status === 0;
}

function rel(p) {
  const r = path.relative(REPO_ROOT, p);
  if (r.startsWith('..') || path.isAbsolute(r)) return p;
  return r.split(path.sep).join('/');
}

function doCopy(src, dst) {
  if (DRY_RUN) { log(`  [dry] cp ${rel(src)} -> ${rel(dst)}`); return; }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function doMove(src, dst) {
  if (DRY_RUN) { log(`  [dry] mv ${rel(src)} -> ${rel(dst)}`); return; }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  try {
    fs.renameSync(src, dst);
  } catch (e) {
    if (e.code === 'EXDEV') {
      fs.copyFileSync(src, dst);
      fs.unlinkSync(src);
    } else throw e;
  }
}

function walkFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
    for (const ent of entries) {
      const full = path.join(cur, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (ent.isFile()) {
        out.push({
          abs: full,
          rel: path.relative(dir, full).split(path.sep).join('/'),
        });
      }
    }
  }
  out.sort((a, b) => a.rel.localeCompare(b.rel));
  return out;
}

function filesEqual(a, b) {
  try {
    const sa = fs.statSync(a);
    const sb = fs.statSync(b);
    if (sa.size !== sb.size) return false;
    return fs.readFileSync(a).equals(fs.readFileSync(b));
  } catch {
    return false;
  }
}

function timestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// ---------- 谓词 ----------
const isLocallyModified = r => CONFIG.LOCALLY_MODIFIED.includes(r);
const isLocallyDeleted = r => CONFIG.LOCALLY_DELETED.includes(r);
const isReserved = r => CONFIG.LOCALLY_RESERVED_PREFIXES.some(p => r.startsWith(p));
const isExcluded = r => CONFIG.SYNC_EXCLUDES.some(e => r === e || r.startsWith(e + '/'));

// ---------- 分支选择 ----------
function listCopyBranches() {
  return git(['branch', '-r', '--format=%(refname:short)'])
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .filter(l => l.startsWith(CONFIG.COPY_BRANCH_PREFIX));
}

function prompt(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, ans => { rl.close(); resolve(ans); });
  });
}

async function selectBranch() {
  const branches = listCopyBranches();
  if (branches.length === 0) {
    console.error(`[ERROR] 未找到任何 ${CONFIG.COPY_BRANCH_PREFIX}* 分支`);
    process.exit(1);
  }
  if (branches.length === 1) {
    log(`[LOG] 使用分支：${branches[0]}`);
    return branches[0];
  }
  log('发现多个候选分支，请选择：');
  branches.forEach((b, i) => log(`  ${i + 1}) ${b}`));
  const ans = (await prompt('输入序号：')).trim();
  const idx = parseInt(ans, 10);
  if (!Number.isInteger(idx) || idx < 1 || idx > branches.length) {
    console.error('[ERROR] 无效选择');
    process.exit(1);
  }
  const chosen = branches[idx - 1];
  log(`[LOG] 使用分支：${chosen}`);
  return chosen;
}

// ---------- 检出上游到临时目录 ----------
function fetchUpstream(branch, tmpDir) {
  if (hasCommand('tar')) {
    const tarFile = path.join(tmpDir, '_upstream.tar');
    const r1 = spawnSync('git', ['archive', '--format=tar', `--output=${tarFile}`, branch], {
      cwd: REPO_ROOT, stdio: 'inherit',
    });
    if (r1.status !== 0) throw new Error('git archive 失败');
    const r2 = spawnSync('tar', ['-xf', tarFile, '-C', tmpDir], { stdio: 'inherit' });
    if (r2.status !== 0) throw new Error('tar 解压失败');
    fs.unlinkSync(tarFile);
    return;
  }

  log('  [注意] 系统无 tar 命令，使用逐文件提取（可能较慢）');
  const files = git(['ls-tree', '-r', '--name-only', branch])
    .split('\n').map(l => l.trim()).filter(Boolean);
  for (const r of files) {
    const res = spawnSync('git', ['show', `${branch}:${r}`], {
      cwd: REPO_ROOT, encoding: 'buffer', maxBuffer: 512 * 1024 * 1024,
    });
    if (res.status !== 0) continue;
    const dest = path.join(tmpDir, r);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, res.stdout);
  }
}

// ---------- 提取前结构检查 ----------
function listTopEntries(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .map(e => e.name)
      .filter(n => !isExcluded(n))
      .sort();
  } catch {
    return [];
  }
}

// 检查单个目录是否通过了身份验证
// 返回 { ok, missingMarkers, identityName, identityError }
function checkIdentity(dir) {
  const result = { ok: false, missingMarkers: [], identityName: null, identityError: null };

  if (!fs.existsSync(dir)) {
    result.identityError = '目录不存在';
    return result;
  }

  // 1) 关键标志
  for (const m of CONFIG.STRUCTURE_MARKERS) {
    if (!fs.existsSync(path.join(dir, m))) {
      result.missingMarkers.push(m);
    }
  }

  // 2) package.json 身份
  const pkgPath = path.join(dir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      result.identityName = pkg.name || null;
      if (pkg.name !== CONFIG.STRUCTURE_IDENTITY_NAME) {
        result.identityError = `package.json 的 name 是 "${pkg.name}"，期望 "${CONFIG.STRUCTURE_IDENTITY_NAME}"`;
      }
    } catch (e) {
      result.identityError = `package.json 解析失败：${e.message}`;
    }
  }

  result.ok =
    result.missingMarkers.length === 0 &&
    !result.identityError;

  return result;
}

// 结构差异比例（仅作警告）
function computeDiffRatio(upstreamAbs, localAbs) {
  const upEntries = listTopEntries(upstreamAbs);
  const loEntries = listTopEntries(localAbs);
  if (upEntries.length === 0 && loEntries.length === 0) return { ratio: 0, onlyUp: [], onlyLo: [] };

  const upSet = new Set(upEntries);
  const loSet = new Set(loEntries);
  const onlyUp = upEntries.filter(x => !loSet.has(x));
  const onlyLo = loEntries.filter(x => !upSet.has(x));
  const total = new Set([...upEntries, ...loEntries]).size;

  return {
    ratio: (onlyUp.length + onlyLo.length) / Math.max(1, total),
    onlyUp,
    onlyLo,
  };
}

function printIdentityFailure(upCheck, loCheck, branch) {
  console.error('[ERROR] 结构检查失败：身份验证未通过，已拒绝执行。');
  console.error('');

  const show = (label, r) => {
    console.error(`  ${label}:`);
    if (r.missingMarkers.length) {
      console.error(`    - 缺少关键标志: ${r.missingMarkers.join(', ')}`);
    }
    if (r.identityError) {
      console.error(`    - ${r.identityError}`);
    }
    if (!r.missingMarkers.length && !r.identityError) {
      console.error('    - 通过');
    }
  };

  show('上游', upCheck);
  console.error('');
  show('本地', loCheck);
  console.error('');

  console.error('  这通常意味着:');
  console.error('    1) 上游分支不是 2n-spatial-world 项目（可能选错了分支）；');
  console.error('    2) 本地目录被大幅改动过，或首次同步未完成。');
  console.error('');
  console.error('  如果确认要覆盖，请直接指定分支名并加 --force：');
  console.error(`    node data/3d/sync-from-copy.mjs --branch=${branch} --force`);
  console.error('');
  console.error('  或先用 --dry-run 查看将要做出的改动：');
  console.error(`    node data/3d/sync-from-copy.mjs --branch=${branch} --dry-run`);
}

// ---------- 补丁 ----------
function applyPatches(r, upstreamFile, backupFile) {
  if (r !== 'vite.config.js') return;

  let content;
  try { content = fs.readFileSync(upstreamFile, 'utf8'); } catch { return; }
  if (content.includes('base:')) return;

  log("    >> 补丁：vite.config.js 增加 base: './'");
  if (DRY_RUN) return;

  const anchor = 'defineConfig({';
  const idx = content.indexOf(anchor);
  if (idx < 0) return;
  const patched = content.slice(0, idx + anchor.length)
    + "base:'./',"
    + content.slice(idx + anchor.length);
  fs.writeFileSync(backupFile, patched);
}

// ---------- .gitignore 同步 ----------
function syncGitignore(upstreamAbs) {
  const upstreamGi = path.join(upstreamAbs, '.gitignore');
  if (!fs.existsSync(upstreamGi)) {
    log('  [跳过] 上游无 .gitignore');
    return;
  }

  const skip = new Set(CONFIG.GITIGNORE_SKIP_RULES);
  const rules = fs.readFileSync(upstreamGi, 'utf8').split(/\r?\n/);
  const converted = [];
  for (const raw of rules) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (skip.has(line)) continue;
    let out;
    if (line.startsWith('!')) out = '!' + CONFIG.GITIGNORE_PATH_PREFIX + line.slice(1);
    else if (line.startsWith('/')) out = CONFIG.GITIGNORE_PATH_PREFIX + line.slice(1);
    else out = CONFIG.GITIGNORE_PATH_PREFIX + line;
    converted.push(out);
  }

  const seen = new Set();
  const unique = [];
  for (const line of converted) {
    const key = line.replace(/\/+$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(line);
  }

  const rootContent = fs.readFileSync(ROOT_GITIGNORE_ABS, 'utf8');
  if (!rootContent.includes(CONFIG.GITIGNORE_BLOCK_BEGIN)) {
    log(`  [跳过] 根 .gitignore 缺少标记区 ${CONFIG.GITIGNORE_BLOCK_BEGIN}`);
    return;
  }

  if (DRY_RUN) {
    log(`  [dry] 将用以下内容替换 ${CONFIG.ROOT_GITIGNORE} 的 3d-auto-sync 区块（已排除：${[...skip].join('|')}）：`);
    for (const l of unique) log('    ' + l);
    return;
  }

  const lines = rootContent.split(/\r?\n/);
  const result = [];
  let inBlock = false;
  for (const line of lines) {
    if (line.trim() === CONFIG.GITIGNORE_BLOCK_BEGIN) {
      result.push(line, ...unique);
      inBlock = true;
      continue;
    }
    if (line.trim() === CONFIG.GITIGNORE_BLOCK_END) {
      inBlock = false;
      result.push(line);
      continue;
    }
    if (!inBlock) result.push(line);
  }
  fs.writeFileSync(ROOT_GITIGNORE_ABS, result.join('\n'));
  log(`  [更新] ${CONFIG.ROOT_GITIGNORE} 的 3d-auto-sync 区块`);
}

// ---------- 主流程 ----------
function runSync(upstreamAbs) {
  const ts = timestamp();
  const historyTarget = path.join(HISTORY_ABS, ts);

  if (!DRY_RUN) fs.mkdirSync(BACKUP_ABS, { recursive: true });

  let added = 0, updated = 0, kept = 0, skipped = 0, archived = 0;

  for (const { abs: srcFile, rel: r } of walkFiles(upstreamAbs)) {
    if (isExcluded(r)) continue;

    if (isLocallyDeleted(r)) {
      log(`  [跳过-本地已删] ${r}`);
      skipped++;
      continue;
    }

    const dstFile = path.join(LOCAL_TARGET_ABS, r);

    if (!fs.existsSync(dstFile)) {
      doCopy(srcFile, dstFile);
      log(`  [新增] ${r}`);
      added++;
      continue;
    }

    if (filesEqual(srcFile, dstFile)) continue;

    if (isLocallyModified(r) || isReserved(r)) {
      const backupFile = path.join(BACKUP_ABS, r + '.upstream');
      doCopy(srcFile, backupFile);
      log(`  [保留-本地有改动] ${r}`);
      applyPatches(r, srcFile, backupFile);
      kept++;
    } else {
      doCopy(srcFile, dstFile);
      log(`  [更新] ${r}`);
      updated++;
    }
  }

  for (const { abs: localFile, rel: r } of walkFiles(LOCAL_TARGET_ABS)) {
    if (isExcluded(r)) continue;
    if (isLocallyModified(r)) continue;
    if (isLocallyDeleted(r)) continue;
    if (isReserved(r)) continue;

    const upstreamFile = path.join(upstreamAbs, r);
    if (!fs.existsSync(upstreamFile)) {
      const dstFile = path.join(historyTarget, r);
      doMove(localFile, dstFile);
      log(`  [归档-上游已删] ${r} -> ${CONFIG.HISTORY_DIR}/${ts}/${r}`);
      archived++;
    }
  }

  syncGitignore(upstreamAbs);

  log('');
  log('---- 汇总 ----');
  log(`  新增             : ${added}`);
  log(`  更新             : ${updated}`);
  log(`  保留（本地有改动）: ${kept}`);
  log(`  跳过（本地已删）  : ${skipped}`);
  log(`  归档（上游已删）  : ${archived}`);
  log('');
  log('后续：');
  log(`  1. 查看 [${CONFIG.BACKUP_DIR}] 下 *.upstream，人工比对上游改动`);
  log(`  2. 查看 [${CONFIG.HISTORY_DIR}/${ts}]（如有），确认归档的文件`);
  log(`  3. 检查根 ${CONFIG.ROOT_GITIGNORE} 的 3d-auto-sync 区块是否合理`);
  log('  4. 若确认无误，git add / git commit');
}

// ---------- 主入口 ----------
(async () => {
  const current = git(['branch', '--show-current']);
  if (current !== 'main') {
    console.error(`[ERROR] 请在 main 分支运行（当前：${current}）`);
    process.exit(1);
  }

  if (git(['status', '--porcelain']) !== '') {
    console.error('[ERROR] 工作区有未提交改动，请先提交或 git stash');
    process.exit(1);
  }

  log('[LOG] 拉取远端分支信息');
  const fr = spawnSync('git', ['fetch', '--prune', 'origin'], { cwd: REPO_ROOT, stdio: 'inherit' });
  if (fr.status !== 0) { console.error('[ERROR] git fetch 失败'); process.exit(1); }

  let branch;
  if (BRANCH_ARG) {
    branch = BRANCH_ARG;
    const r = spawnSync('git', ['rev-parse', '--verify', branch], { cwd: REPO_ROOT });
    if (r.status !== 0) { console.error(`[ERROR] 分支不存在：${branch}`); process.exit(1); }
    log(`[LOG] 使用分支：${branch}`);
  } else {
    branch = await selectBranch();
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-3d-'));
  try {
    log(`[LOG] 检出 ${branch} 到临时目录`);
    fetchUpstream(branch, tmpDir);

    const upstreamAbs = CONFIG.COPY_SOURCE_PATH
      ? path.join(tmpDir, CONFIG.COPY_SOURCE_PATH)
      : tmpDir;
    if (!fs.existsSync(upstreamAbs)) {
      console.error(`[ERROR] 上游里没有目录：${CONFIG.COPY_SOURCE_PATH}`);
      process.exit(1);
    }

    // ---------- 提取前结构检查 ----------
    const skipCheck = BRANCH_ARG && FORCE;
    if (!skipCheck) {
      const upCheck = checkIdentity(upstreamAbs);
      const loCheck = checkIdentity(LOCAL_TARGET_ABS);

      if (!upCheck.ok || !loCheck.ok) {
        printIdentityFailure(upCheck, loCheck, branch);
        process.exit(1);
      }

      // 通过检查后，附加差异比例警告
      const diff = computeDiffRatio(upstreamAbs, LOCAL_TARGET_ABS);
      const pct = (diff.ratio * 100).toFixed(1);
      log(`  [结构检查] 通过（关键标志齐全，身份匹配；差异比例 ${pct}%）`);
      if (diff.ratio > CONFIG.STRUCTURE_DIFF_WARN) {
        console.warn('  [WARN] 差异比例偏高，同步后请务必检查结果');
      }
    } else {
      log('  [结构检查] 已跳过（--branch 与 --force 同时指定）');
    }

    runSync(upstreamAbs);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
})().catch(err => {
  console.error('[ERROR]', err.message);
  process.exit(1);
});
