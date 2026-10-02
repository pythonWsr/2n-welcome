// read.js – 通用文件查看器（支持调试模式编辑器）
import { parseNotice } from '../main/noticeParser.js';
import { renderNoticeDetail } from '../main/noticeRenderer.js';
import { parseWiki } from '../main/wikiParser.js';
import { parseMarkdown } from '../main/markdownParser.js';
import { csvToTable } from '../main/csvParser.js';
import { hashString, markNoticeAsRead } from '../main/announcementList.js';

const params = new URLSearchParams(location.search);
const rawFile = params.get('file') || '';

if (!rawFile) {
  location.replace('../index.html');
} else {
  run(rawFile);
}

async function run(file) {
  const contentEl = document.getElementById('readContent');
  const fileNameEl = document.getElementById('readFileName');
  const backBtn = document.getElementById('readBack');
  const navEl = document.getElementById('readNav');

  backBtn.addEventListener('click', () => {
    if (history.length > 1) history.back();
    else location.href = '../index.html';
  });

  const cleaned = file.replace(/^\.\//, '');
  fileNameEl.textContent = cleaned.split('/').pop();

  try {
    const res = await fetch('../' + cleaned + '?_=' + Date.now());
    if (!res.ok) throw new Error('文件加载失败');
    const text = await res.text();

    const result = await renderByExt(cleaned, text);
    contentEl.innerHTML = result.html;

    // 调试模式：初始化源码编辑器
    if (result.debug) {
      setupDebugEditor(contentEl, result.raw);
    }

    // 通知：标记已读
    if (cleaned.toLowerCase().endsWith('.notice')) {
      try {
        const hash = await hashString(text);
        markNoticeAsRead(hash);
      } catch (e) {
        console.warn('标记已读失败:', e);
      }
    }

    // 上一条/下一条
    await loadSiblingNav(cleaned, navEl);

  } catch (e) {
    console.error(e);
    contentEl.innerHTML = '<div class="loading-placeholder">文件加载失败</div>';
  }
}

// ---------- 调试编辑器 ----------
function setupDebugEditor(container, rawText) {
  const editor = container.querySelector('#debugEditor');
  const content = container.querySelector('#debugContent');
  if (!editor || !content) return;

  editor.value = rawText || '';

  editor.addEventListener('input', () => {
    try {
      const notice = parseNotice(editor.value);
      content.innerHTML = renderNoticeDetail(notice, {
        stampDir: '../data/announcements/stamp'
      });
    } catch (e) {
      content.innerHTML = `<div class="debug-error">解析失败：${escapeHtml(e.message)}</div>`;
    }
  });
}

// ---------- 按后缀渲染 ----------
// 返回 { html, debug?, raw? }
async function renderByExt(path, text) {
  const ext = path.split('.').pop().toLowerCase();

  if (ext === 'notice') {
    const notice = parseNotice(text);
    const contentHtml = renderNoticeDetail(notice, {
      stampDir: '../data/announcements/stamp'
    });

    // 调试类型：下方追加源码编辑器
    if (notice.head === '调试') {
      return {
        html: `
          <div id="debugContent" class="debug-content">${contentHtml}</div>
          <section class="debug-panel">
            <h2 class="debug-heading">源码（可编辑）</h2>
            <textarea id="debugEditor" class="debug-editor" spellcheck="false"></textarea>
          </section>
        `,
        debug: true,
        raw: text
      };
    }
    return { html: contentHtml };
  }

  switch (ext) {
    case 'wiki':
      return { html: parseWiki(text) };
    case 'md':
    case 'markdown':
      return { html: parseMarkdown(text) };
    case 'csv':
      return { html: csvToTable(text) };
    case 'json': {
      try {
        const obj = JSON.parse(text);
        return { html: `<pre class="json-view">${escapeHtml(JSON.stringify(obj, null, 2))}</pre>` };
      } catch {
        return { html: `<pre>${escapeHtml(text)}</pre>` };
      }
    }
    case 'html':
    case 'htm':
      return { html: text };
    case 'png': case 'jpg': case 'jpeg':
    case 'gif': case 'webp': case 'svg':
      return { html: `<img src="../${escapeHtml(path)}" alt="" style="max-width:100%;border-radius:12px;">` };
    case 'mp4': case 'webm': case 'mov':
      return { html: `<video controls preload="metadata" src="../${escapeHtml(path)}" style="max-width:100%;border-radius:12px;"></video>` };
    case 'mp3': case 'wav': case 'ogg':
      return { html: `<audio controls preload="metadata" src="../${escapeHtml(path)}"></audio>` };
    default:
      return { html: `<pre>${escapeHtml(text)}</pre>` };
  }
}

// ---------- 上一条 / 下一条 ----------
async function loadSiblingNav(filePath, navEl) {
  const parts = filePath.split('/');
  const filename = parts.pop();
  const dir = parts.join('/');
  if (!dir) return;

  try {
    const res = await fetch(`../${dir}/index.json?_=${Date.now()}`);
    if (!res.ok) return;
    const data = await res.json();
    const list = Array.isArray(data.notices) ? data.notices : null;
    if (!list || !list.length) return;

    const idx = list.indexOf(filename);
    if (idx < 0) return;

    const prev = idx > 0 ? list[idx - 1] : null;
    const next = idx < list.length - 1 ? list[idx + 1] : null;

    const [prevTitle, nextTitle] = await Promise.all([
      prev ? getTitle(`${dir}/${prev}`) : Promise.resolve(''),
      next ? getTitle(`${dir}/${next}`) : Promise.resolve('')
    ]);

    const makeItem = (target, label, title, cls) => {
      if (!target) return `<div class="read-nav-item disabled"></div>`;
      const href = `./index.html?file=${encodeURIComponent(dir + '/' + target)}`;
      return `<a class="read-nav-item ${cls}" href="${href}">
        <span class="read-nav-label">${label}</span>
        <span class="read-nav-title">${escapeHtml(title)}</span>
      </a>`;
    };

    navEl.innerHTML =
      makeItem(prev, '← 上一条', prevTitle, 'prev') +
      makeItem(next, '下一条 →', nextTitle, 'next');
  } catch {
    // 静默忽略
  }
}

async function getTitle(path) {
  try {
    const res = await fetch(`../${path}?_=${Date.now()}`);
    if (!res.ok) return path.split('/').pop();
    const text = await res.text();
    if (path.endsWith('.notice')) {
      const n = parseNotice(text);
      return n.title || path.split('/').pop();
    }
    return path.split('/').pop();
  } catch {
    return path.split('/').pop();
  }
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
