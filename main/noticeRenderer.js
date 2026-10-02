// noticeRenderer.js – 把解析后的 notice 数据渲染为 HTML
import { parseWiki } from './wikiParser.js';

// ---------- 列表项渲染 ----------
export function renderNoticeListItem(notice, options = {}) {
  const { file = '', isRead = true } = options;
  const head = resolveHead(notice);
  const color = headColorClass(head);
  // 「维护」类型的通知不显示未读提示
  const isMaintenance = notice.head === '维护';
  const unread = (isRead || isMaintenance) ? '' : '<span class="notice-unread">[未读]</span>';
  const headTag = head ? `<span class="notice-head notice-head-${color}">[${escapeHTML(head)}]</span>` : '';
  const titleCls = `notice-item-title notice-item-title-${color}`;

  const href = `./read/index.html?file=${encodeURIComponent('data/announcements/' + file)}`;

  return `
    <a class="notice-item" href="${href}">
      <div class="notice-item-head">
        ${unread}${headTag}
        <span class="${titleCls}">${escapeHTML(notice.title)}</span>
      </div>
      ${notice.summary ? `<div class="notice-item-summary">${escapeHTML(notice.summary)}</div>` : ''}
    </a>
  `;
}

// ---------- 详情渲染 ----------
export function renderNoticeDetail(notice, options = {}) {
  const { stampDir = './data/announcements/stamp' } = options;
  const parts = [];

  parts.push(`<h1 class="notice-detail-title">${escapeHTML(notice.title)}</h1>`);

  if (notice.time) {
    parts.push(`<div class="notice-detail-time">${escapeHTML(notice.time)}</div>`);
  }

  parts.push('<div class="notice-detail-body">');
  for (const block of notice.blocks) {
    if (block.type === 'empty') {
      parts.push('<p class="notice-paragraph notice-empty">&nbsp;</p>');
    } else if (block.type === 'main') {
      parts.push(`<div class="notice-paragraph">${parseWiki(block.content)}</div>`);
    } else if (block.type === 'file') {
      parts.push(renderFileBlock(block.data));
    }
  }
  parts.push('</div>');

  const hasAuthor = notice.author.length > 0;
  const stampSrc = notice.stamp === 'informal'
    ? `${stampDir}/blue.png`
    : notice.stamp === 'formal'
      ? `${stampDir}/red.png`
      : null;

  if (hasAuthor || stampSrc) {
    parts.push('<div class="notice-signature">');
    if (stampSrc) {
      parts.push(`<img class="notice-stamp" src="${stampSrc}" alt="${escapeHTML(notice.stamp)}" loading="lazy">`);
    }
    if (hasAuthor) {
      const names = notice.author.map(a => escapeHTML(a)).join(' ');
      parts.push(`<span class="notice-author">${names}</span>`);
    }
    parts.push('</div>');
  }

  return parts.join('');
}

// ---------- 附件渲染 ----------
function renderFileBlock(file) {
  const { type, src, alt = '' } = file;
  if (!src) return '';
  const srcEsc = escapeHTML(src);
  const altEsc = escapeHTML(alt);
  const label = altEsc || srcEsc;

  switch (type) {
    case 'image':
      return `<div class="notice-file notice-file-image"><img src="${srcEsc}" alt="${altEsc}" loading="lazy"></div>`;
    case 'video':
      return `<div class="notice-file notice-file-video"><video controls preload="metadata" src="${srcEsc}"></video></div>`;
    case 'audio':
      return `<div class="notice-file notice-file-audio"><audio controls preload="metadata" src="${srcEsc}"></audio></div>`;
    case 'file':
      return `<div class="notice-file notice-file-download"><a href="${srcEsc}" download>${label}</a></div>`;
    case 'url':
      return `<div class="notice-file notice-file-url"><a href="${srcEsc}" target="_blank" rel="noopener noreferrer">${label}</a></div>`;
    default:
      return '';
  }
}

// ---------- head 处理 ----------
export function resolveHead(notice) {
  let head = notice.head || '普通';
  if ((head === '普通' || head === '转发') && notice.time) {
    const t = new Date(notice.time);
    if (!isNaN(t)) {
      const now = new Date();
      const months = (now - t) / (1000 * 60 * 60 * 24 * 30);
      if (months > 3) head = '过时';
    }
  }
  return head;
}

function headColorClass(head) {
  const map = {
    '普通': 'normal',
    '重要': 'important',
    '转发': 'forward',
    '置顶': 'pinned',
    '过时': 'outdated',
    '调试': 'debug',
    '维护': 'maintenance'
  };
  return map[head] || 'normal';
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
