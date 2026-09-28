// announcementList.js – 通知列表渲染（分页 + 已读标记）
import { parseNotice } from './noticeParser.js';
import { renderNoticeListItem } from './noticeRenderer.js';

const BASE = './data/announcements/';
const PAGE_SIZE = 10;
const READ_KEY = 'notice-read-';

export function initNoticeList() {
  const listEl = document.getElementById('noticeList');
  const paginationEl = document.getElementById('noticePagination');
  if (!listEl) return;

  let notices = [];
  let currentPage = 1;

  loadList();

  async function loadList() {
    try {
      const res = await fetch(BASE + 'index.json?_=' + Date.now());
      if (!res.ok) throw new Error('索引加载失败');
      const index = await res.json();
      const files = index.notices || [];

      if (!files.length) {
        listEl.innerHTML = '<div class="loading-placeholder">暂无通知</div>';
        return;
      }

      // 并行加载所有 .notice 文件
      const loaded = await Promise.all(files.map(async file => {
        try {
          const r = await fetch(BASE + file + '?_=' + Date.now());
          if (!r.ok) return null;
          const text = await r.text();
          const hash = await hashString(text);
          const notice = parseNotice(text);
          return { file, notice, hash };
        } catch (e) {
          console.error('通知解析失败:', file, e);
          return null;
        }
      }));

      notices = loaded.filter(Boolean);
      if (!notices.length) {
        listEl.innerHTML = '<div class="loading-placeholder">通知加载失败</div>';
        return;
      }

      renderPage();
    } catch (e) {
      console.error(e);
      listEl.innerHTML = '<div class="loading-placeholder">通知加载失败</div>';
    }
  }

  function renderPage() {
    const total = notices.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, total);
    const pageItems = notices.slice(start, end);

    listEl.innerHTML = pageItems.map(({ file, notice, hash }) => {
      const isRead = localStorage.getItem(READ_KEY + hash) === '1';
      return renderNoticeListItem(notice, { file, isRead });
    }).join('');

    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      paginationEl.innerHTML = '';
      return;
    }
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="notice-page-btn${i === currentPage ? ' active' : ''}" data-page="${i}">${i}</button>`;
    }
    paginationEl.innerHTML = html;
    paginationEl.querySelectorAll('.notice-page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.dataset.page, 10);
        renderPage();
        listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // 供详情页标记已读（其他模块可 import）
  // 详情页读取同一 localStorage 键判断已读
}

// 字符串哈希（SHA-256 前 16 位十六进制；无 SubtleCrypto 时退回到 djb2）
export async function hashString(str) {
  if (window.crypto?.subtle) {
    const data = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 16);
  }
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(16);
}

// 详情页调用：标记为已读
export function markNoticeAsRead(hash) {
  localStorage.setItem(READ_KEY + hash, '1');
}

// 详情页调用：判断是否已读
export function isNoticeRead(hash) {
  return localStorage.getItem(READ_KEY + hash) === '1';
}
