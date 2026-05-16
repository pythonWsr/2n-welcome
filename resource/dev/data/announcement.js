// announcement.js – 通知渲染（适配 index.json 新结构 + visibility 权限）
import { decodeRichText } from '../main/decode.js';
import * as pipe from '../main/pipe.js';

function getLocalizedString(raw, lang) {
  if (!raw || typeof raw !== 'string') return '';
  if (!raw.includes('|')) return raw.trim();
  const parts = raw.split('|');
  const left = (parts[0] || '').trim();
  const right = (parts[1] || '').trim();
  return lang === 'zh' ? (left || right) : (right || left);
}

export async function loadAnnouncements(container, lang, text) {
  try {
    const indexRes = await fetch('./data/Announcement/index.json');
    if (!indexRes.ok) throw new Error('索引加载失败');
    const indexData = await indexRes.json();

    // 从对象结构中提取文件名列表，并获取每个通知的 visibility 和图片信息
    const fileEntries = Object.entries(indexData);
    const allNotices = [];
    const user = pipe.getUrlParam('user'); // 当前用户名
    const pwd = pipe.getUrlParam('pwd');

    for (const [file, info] of fileEntries) {
      // 权限检查
      if (!canViewNotice(info.visibility, user)) continue;

      const res = await fetch(`./data/Announcement/${file}`);
      if (res.ok) {
        const notice = await res.json();
        notice._file = file;
        notice._visibility = info.visibility || 'public';
        notice._images = extractImages(info); // 提取图片字段，按顺序排列
        allNotices.push(notice);
      }
    }

    // 如果没有有权限的通知，显示提示
    if (allNotices.length === 0) {
      container.innerHTML = `<div class="loading-placeholder">${lang === 'zh' ? '暂无通知' : 'No notices'}</div>`;
      return;
    }

    const recent = allNotices.slice(-3).reverse();
    let importantNotice = null;
    const importants = recent.filter(n => n.tag?.toLowerCase() === 'important');
    if (importants.length) {
      importantNotice = importants[importants.length - 1];
    } else {
      for (let i = allNotices.length - 1; i >= 0; i--) {
        if (allNotices[i].tag?.toLowerCase() === 'important') {
          importantNotice = allNotices[i];
          break;
        }
      }
    }

    let html = '';
    if (importantNotice) {
      html += renderNotice(importantNotice, lang);
    }
    for (const notice of recent) {
      if (notice !== importantNotice) html += renderNotice(notice, lang);
    }

    const queryString = pipe.buildQueryString({ lang: lang, mode: pipe.getColorMode() });
    const href = 'announcement.html' + (queryString ? '?' + queryString : '');

    html += `
      <div class="announce-more">
        <button class="changelog-toggle" onclick="location.href='${href}'">
          ${text.moreText} <i class="fas fa-arrow-right"></i>
        </button>
      </div>
    `;
    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = `<div class="loading-placeholder">${lang === 'zh' ? '通知加载失败' : 'Failed to load notices'}</div>`;
  }
}

/**
 * 检查当前用户是否有权查看该通知
 * @param {string} vis visibility 值
 * @param {string|null} user
 * @returns {boolean}
 */
function canViewNotice(vis, user) {
  if (!vis || vis === 'public') return true;
  if (vis === 'guest') return !user;
  if (vis === 'private') return !!user;
  if (vis === 'test') return ['debug', 'dev', 'admin', 'pythonWsr', 'awdc-jskysdzl'].includes(user);
  if (vis === 'secret') return true; // secret 通知显示，但内容加密提示由渲染函数处理
  if (Array.isArray(vis)) {
    return user && vis.includes(user);
  }
  return true;
}

/**
 * 从 index.json 的通知条目中提取图片字段，按数字排序返回数组
 * @param {object} info index.json 中单个通知的值对象
 * @returns {Array} [{file: path}, ...]
 */
function extractImages(info) {
  const images = [];
  const keys = Object.keys(info).filter(k => k.startsWith('image') && /\d+$/.test(k));
  keys.sort((a, b) => {
    const numA = parseInt(a.replace('image', ''), 10) || 0;
    const numB = parseInt(b.replace('image', ''), 10) || 0;
    return numA - numB;
  });
  for (const key of keys) {
    if (info[key]) {
      images.push({ file: info[key] });
    }
  }
  return images;
}

function renderNotice(notice, lang) {
  const titleText = getLocalizedString(notice.title, lang);
  const tag = (notice.tag || '').toLowerCase();
  let titleClass = 'notice-title ';
  if (tag === 'important') titleClass += 'notice-title-important';
  else if (tag === 'joke') titleClass += 'notice-title-joke';
  else titleClass += 'notice-title-normal';
  titleClass += ' notice-title-center';

  const isSecret = notice._visibility === 'secret';
  const user = pipe.getUrlParam('user');
  const pwd = pipe.getUrlParam('pwd');
  const hasCredentials = !!(user && pwd);

  // 正文内容处理
  const content = lang === 'zh' ? (notice.zh || '') : (notice.en || notice.zh || '');
  let bodyHTML = '';
  if (isSecret && !hasCredentials) {
    const tip = lang === 'zh'
      ? '该通知中含有加密内容，请到历史通知界面查看'
      : 'This notice contains encrypted content. Please view it on the history page.';
    bodyHTML = `<p class="notice-body">${tip}</p>`;
  } else {
    const paragraphs = content.split('\n').filter(p => p.trim() !== '');
    const decodedParagraphs = paragraphs.map(p => decodeRichText(p, 14));
    bodyHTML = decodedParagraphs.map(p => `<p class="notice-body">${p}</p>`).join('');
  }

  // 图片处理（暂不显示加密图片，只显示公开图片）
  let imagesHTML = '';
  if (notice._images && notice._images.length > 0) {
    for (let i = 0; i < notice._images.length; i++) {
      const imgFile = notice._images[i].file;
      // 如果是 .txt 文件则为加密图片，首页不显示（提示跳转）
      if (imgFile.endsWith('.txt')) {
        const tip = `[${lang === 'zh' ? '加密图片' : 'Encrypted image'}] `;
        imagesHTML += `<div class="image-wrapper"><div class="notice-image-placeholder">${tip}${lang === 'zh' ? '图' : 'Fig.'}${i+1}</div></div>`;
      } else {
        imagesHTML += `<div class="image-wrapper"><img class="notice-image" src="${imgFile}" alt="图${i+1}" onerror="this.style.display='none'"><div class="image-caption">${lang === 'zh' ? '图' : 'Fig.'}${i+1}</div></div>`;
      }
    }
  }

  const timeStr = formatTime(notice._file, lang);
  const writer = escapeHTML(notice.writer || '');

  return `
    <div class="notice-item">
      <div class="${titleClass}">${escapeHTML(titleText)}</div>
      <div class="notice-tag ${titleClass}">[${escapeHTML(tag)}]</div>
      ${bodyHTML}
      ${imagesHTML}
      <div class="notice-writer">${writer}</div>
      <div class="notice-time">${timeStr}</div>
    </div>
  `;
}

function formatTime(filename, lang) {
  if (!filename) return '';
  const match = filename.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (!match) return filename;
  const [, y, m, d, h, min] = match;
  if (lang === 'zh') return `${y}.${m}.${d} ${h}:${min}`;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[+m-1]} ${+d}, ${y} ${h}:${min}`;
}

function escapeHTML(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}