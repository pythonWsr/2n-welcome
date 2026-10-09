// template/fold.js
//
// ═══════════════════════════════════════════════════════════════
//  用法
// ═══════════════════════════════════════════════════════════════
//
//   {{fold|类型|显示行数|初始状态|内容}}
//
//   类型：
//     common   常规文本。至多显示 N 行，超出部分由上至下渐隐；
//              下方一个向下的按钮，点击后展开全部。
//              内容中的表格 / 图片 / 视频 / 文件等特殊元素，
//              整体算作 1 行。
//
//     title    以标题折叠。内容中第一个 <br> 之前是标题；
//              标题至多显示 N 行，显示不下的部分在行末显示 …；
//              标题字号与 ===标题=== 生成的 h3 一致；
//              按钮初始朝右，点击后朝下并展开剩余内容。
//
//     table    表格折叠。显示表格前 N 行；
//              按钮逻辑与 common 相同（朝下，点击展开全部）。
//
//   初始状态：
//     fold     默认折叠
//     unfold   默认展开
//
// ═══════════════════════════════════════════════════════════════
//  示例
// ═══════════════════════════════════════════════════════════════
//
//   {{fold|common|3|fold|这是一段很长很长的文本……}}
//
//   {{fold|title|2|fold|公会简介<br>这里是被折叠起来的正文……}}
//
//   {{fold|table|5|fold|{{table|序号,名称|1,A|2,B|...}}}}
//
// ═══════════════════════════════════════════════════════════════
//  注意：内容中不能出现 }}
// ═══════════════════════════════════════════════════════════════
//
//   与其它模板一致，内容里出现连续两个右花括号会被提前截断。
//   需要字面花括号时用 HTML 实体 &#125;&#125;，或拆成多个片段。
//   内容中的 | 会被 wikiParser 当作参数分隔符，需避免。
//
// ═══════════════════════════════════════════════════════════════
//  实现说明
// ═══════════════════════════════════════════════════════════════
//
//   wikiParser 输出结构，CSS 负责视觉折叠，JS 只负责切换 state。
//   table 类型在渲染时标记超出 N 行的 <tr>，展开时通过 CSS 取消隐藏。

const TYPES = ['common', 'title', 'table'];

// ---------- 对外：生成 HTML ----------
export function renderFold(type, num, state, innerHtml) {
  const t = TYPES.includes(type) ? type : 'common';
  const s = state === 'unfold' ? 'unfold' : 'fold';
  const n = Math.max(1, parseInt(num, 10) || 3);

  if (t === 'title') return renderTitle(n, s, innerHtml);
  return renderBody(t, n, s, innerHtml);
}

function renderBody(type, num, state, innerHtml) {
  return `<div class="wiki-fold wiki-fold-${type}" data-type="${type}" data-lines="${num}" data-state="${state}" style="--fold-lines:${num};">
  <div class="wiki-fold-body">${innerHtml}</div>
  <div class="wiki-fold-actions">
    <button class="wiki-fold-btn" type="button" aria-label="切换折叠"></button>
  </div>
</div>`;
}

function renderTitle(num, state, innerHtml) {
  const idx = innerHtml.indexOf('<br>');
  let title, body;
  if (idx === -1) {
    title = innerHtml;
    body = '';
  } else {
    title = innerHtml.slice(0, idx);
    body = innerHtml.slice(idx + 4);
  }

  return `<div class="wiki-fold wiki-fold-title" data-type="title" data-lines="${num}" data-state="${state}" style="--fold-lines:${num};">
  <div class="wiki-fold-title-bar">
    <div class="wiki-fold-title-text">${title}</div>
    <button class="wiki-fold-btn wiki-fold-btn-title" type="button" aria-label="切换折叠"></button>
  </div>
  <div class="wiki-fold-body">${body}</div>
</div>`;
}

// ---------- 交互 ----------
function setupOne(el) {
  if (el.dataset.foldReady === '1') return;
  el.dataset.foldReady = '1';

  const btn = el.querySelector('.wiki-fold-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      el.dataset.state = el.dataset.state === 'fold' ? 'unfold' : 'fold';
      updateBtn(el);
    });
  }
  updateBtn(el);

  if (el.dataset.type === 'table') markTableOverflow(el);
}

function updateBtn(el) {
  const btn = el.querySelector('.wiki-fold-btn');
  if (!btn) return;
  const folded = el.dataset.state === 'fold';
  btn.setAttribute('aria-label', folded ? '展开内容' : '折叠内容');
  btn.setAttribute('aria-expanded', String(!folded));
}

function markTableOverflow(el) {
  const body = el.querySelector('.wiki-fold-body');
  if (!body) return;
  const table = body.querySelector('table');
  if (!table) return;
  const rows = table.querySelectorAll('tr');
  const lines = parseInt(el.dataset.lines, 10) || 3;
  rows.forEach((r, i) => {
    r.classList.toggle('wiki-fold-row-overflow', i >= lines);
  });
}

function scan(root) {
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll('.wiki-fold').forEach(el => {
    if (el.dataset.foldReady !== '1') setupOne(el);
  });
}

let observer = null;
function setup() {
  if (observer) return;
  scan(document);

  observer = new MutationObserver(muts => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.matches && n.matches('.wiki-fold')) setupOne(n);
        scan(n);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
}

// ---------- 通用模板接口（占位，避免被 wikiParser 通用正则误伤）----------
export default {
  name: 'fold',
  isBlock: true,
  render() { return ''; }
};
