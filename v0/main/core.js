// core.js – 主逻辑（集成访问控制、更新日志、贡献榜、Mark List、资讯等）
import * as implicit from './implicitPipe.js';
import { getUrlParam } from './explicitPipe.js';
import { decodeRichText } from './decode.js';
import { checkForUpdate } from './checkUpdate.js';
import { loadAnnouncements } from '../data/announcement.js';
import { initChallenge, isDeveloper } from './challenge.js';
import { show403 } from './error403.js';
import { other_admission } from '../admission.js';

// 主题切换
function applyTheme() {
  const mode = implicit.getColorMode();
  let isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (mode === 'light') isDark = false;
  else if (mode === 'dark') isDark = true;
  const themeLink = document.getElementById('theme-link');
  if (themeLink) {
    themeLink.href = isDark ? './main/theme-dark.css' : './main/theme-light.css';
  }
}
applyTheme();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

const LANG_FOLDER = { zh: './data/zh-CN', en: './data/en-US' };
const langCache = {};
let currentLang = implicit.getLanguage();

// DOM 引用
const guildTitleEl = document.getElementById('guildTitle');
const leaderLabel1 = document.getElementById('leaderLabel1');
const leaderLabel2 = document.getElementById('leaderLabel2');
const quickStartTitleEl = document.getElementById('quickStartTitle');
const portalTitleEl = document.getElementById('portalTitle');
const infoTitleEl = document.getElementById('infoTitle');
const quickstartContent = document.getElementById('quickstartContent');
const portalList = document.getElementById('portalList');
const contributionTitleEl = document.getElementById('contributionTitle');
const markTitleEl = document.getElementById('markTitle');

// 语言加载
async function loadLanguage(langCode) {
  const folder = LANG_FOLDER[langCode];
  if (!folder) return null;
  if (langCache[langCode]) return langCache[langCode];
  const baseUrl = `${folder}/`;
  try {
    const [titlesRes, startRes, linksRes] = await Promise.all([
      fetch(baseUrl + 'titles.json'),
      fetch(baseUrl + 'start.json'),
      fetch(baseUrl + 'links.json')
    ]);
    if (!titlesRes.ok || !startRes.ok || !linksRes.ok) throw new Error('Missing');
    const titles = await titlesRes.json();
    const start = await startRes.json();
    const links = await linksRes.json();
    const merged = { ...titles, quickHtml: start.quickHtml, portalItems: links.portalItems };
    langCache[langCode] = merged;
    return merged;
  } catch (e) { console.error(e); return null; }
}

function renderWithData(data) {
  if (!data) return;
  guildTitleEl.textContent = data.guildTitle;
  leaderLabel1.textContent = data.leader1;
  leaderLabel2.textContent = data.leader2;
  quickStartTitleEl.textContent = data.quickStartTitle;
  portalTitleEl.textContent = data.portalTitle;
  infoTitleEl.textContent = data.infoTitle || '资讯';

  document.getElementById('announceTitleDesktop').textContent = data.announcementTitle || (currentLang === 'zh' ? '通知' : 'Announcement');
  document.getElementById('announceTitleMobile').textContent = data.announcementTitle || (currentLang === 'zh' ? '通知' : 'Announcement');
  document.getElementById('changelogTitleDesktop').textContent = data.changeLogTitle || (currentLang === 'zh' ? '更新日志' : 'Change Log');
  document.getElementById('changelogTitleMobile').textContent = data.changeLogTitle || (currentLang === 'zh' ? '更新日志' : 'Change Log');

  if (contributionTitleEl) contributionTitleEl.textContent = data.contributionTitle || (currentLang === 'zh' ? '贡献榜' : 'Contributions');
  if (markTitleEl) markTitleEl.textContent = data.markTitle || 'Mark List';

  quickstartContent.innerHTML = decodeRichText(data.quickHtml, 16);
  renderPortalItems(data.portalItems);
  loadContribution();
  loadMarkList();
}

// 贡献榜
async function loadContribution() {
  const container = document.getElementById('contributionContent');
  try {
    const res = await fetch('./data/contribution.json');
    const data = await res.json();
    let html = '';
    for (const [name, score] of Object.entries(data)) {
      html += `<div class="contrib-row"><span class="contrib-name">${escapeHTML(name)}</span><span class="contrib-score">${score}</span></div>`;
    }
    container.innerHTML = html || '<div class="loading-placeholder">暂无数据</div>';
  } catch(e) {
    container.innerHTML = '<div class="loading-placeholder">加载失败</div>';
  }
}

// Mark List
async function loadMarkList() {
  const container = document.getElementById('markContent');
  try {
    const res = await fetch('./data/mark.json');
    const list = await res.json();
    let html = '';
    for (const name of list) {
      html += `<div class="mark-name">${escapeHTML(name)}</div>`;
    }
    container.innerHTML = html || '<div class="loading-placeholder">暂无数据</div>';
  } catch(e) {
    container.innerHTML = '<div class="loading-placeholder">加载失败</div>';
  }
}

// 检查当前 user 是否在 Mark List 中并 403
async function checkUserMark() {
  const user = getUrlParam('user');
  if (!user) return;
  try {
    const res = await fetch('./data/mark.json');
    const list = await res.json();
    if (list.includes(user)) {
      document.body.innerHTML = `<h1 style="text-align:center;margin-top:20%;">403 Forbidden</h1><p style="text-align:center;">您处于公会的 Mark List 当中</p>`;
      throw new Error('User in mark list');
    }
  } catch(e) {}
}

// 渲染传送门
function renderPortalItems(items) {
  portalList.innerHTML = '';
  items.forEach(item => {
    const li = document.createElement('li');
    li.className = 'portal-item';
    const labelDiv = document.createElement('div');
    labelDiv.className = 'portal-label';
    labelDiv.innerHTML = decodeRichText(item.label, 14);
    const valueRow = document.createElement('div');
    valueRow.className = 'portal-value-row';
    const valueSpan = document.createElement('span');
    valueSpan.className = 'portal-value-text';
    valueSpan.innerHTML = decodeRichText(item.value, 14);
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.innerHTML = '<i class="far fa-copy"></i>';
    copyBtn.onclick = (e) => {
      e.stopPropagation();
      const raw = item.value.replace(/<[^>]*>/g, '');
      navigator.clipboard?.writeText(raw).then(() => showToast('已复制')).catch(() => fallbackCopy(raw));
    };
    valueRow.appendChild(valueSpan);
    valueRow.appendChild(copyBtn);
    li.appendChild(labelDiv);
    li.appendChild(valueRow);
    portalList.appendChild(li);
  });
}

function escapeHTML(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast('已复制');
}

const toast = document.getElementById('copyToast');
let toastTimer;
function showToast(msg) {
  toast.textContent = `📋 ${msg}`;
  toast.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.style.opacity = '0', 1500);
}

window.addEventListener('languageChanged', (e) => {
  const newLang = e.detail.lang;
  if (newLang !== currentLang) {
    currentLang = newLang;
    loadLanguage(newLang).then(data => {
      if (data) {
        renderWithData(data);
        loadAnnouncementsWrapper();
        loadChangelog();
      }
    });
  }
});

// 资讯加载
async function loadBilibiliManual() {
  const container = document.getElementById('bilibiliFeed');
  try {
    const res = await fetch('./data/bilibili.json');
    const data = await res.json();
    let html = `<div class="up-info"><img class="up-avatar" src="${data.up.face}" onerror="this.src='data:image/svg+xml,...'"><div class="up-name"><a href="${data.up.homepage}" target="_blank">${data.up.name}</a></div></div><div class="video-scroll-container"><div class="video-list">`;
    data.videos.forEach(v => {
      html += `<div class="video-card"><div class="video-iframe-wrapper">${v.iframe.replace('<iframe', '<iframe style="position:absolute; top:0; left:0; width:100%; height:100%;"')}</div><div class="video-title"><a href="https://www.bilibili.com/video/${v.bvid}" target="_blank">${v.title}</a></div><div class="video-meta"><span>${v.date}</span><span><i class="far fa-play-circle"></i> ${v.play||''}</span></div></div>`;
    });
    html += `</div></div>`;
    container.innerHTML = html;
  } catch(e) { container.innerHTML = '<div class="loading-placeholder">资讯加载失败</div>'; }
}

// 更新日志
async function loadChangelog() {
  const desktop = document.getElementById('changelogContentDesktop');
  const mobile = document.getElementById('changelogContentMobile');
  try {
    const res = await fetch('./README.md');
    const text = await res.text();
    const versions = parseChangelog(text);
    const langData = langCache[currentLang] || {};
    const expand = langData.changelogExpand || (currentLang === 'zh' ? '查看全部' : 'Show All');
    const collapse = langData.changelogCollapse || (currentLang === 'zh' ? '折叠' : 'Collapse');
    renderChangelog(versions, desktop, expand, collapse);
    renderChangelog(versions, mobile, expand, collapse);
  } catch(e) {
    desktop.innerHTML = '<div class="loading-placeholder">更新日志不可用</div>';
    mobile.innerHTML = '<div class="loading-placeholder">更新日志不可用</div>';
  }
}

function parseChangelog(md) {
  const lines = md.split('\n');
  const blocks = [];
  let current = null;
  for (const line of lines) {
    // 移除 <br> 标签（不区分大小写，可带或不带闭合斜杠）
    const cleanLine = line.replace(/<br\s*\/?>/gi, '');
    const verMatch = cleanLine.match(/^#{0,6}\s*Version\s+([\d.]+)/);
    if (verMatch) {
      if (current) blocks.push(current);
      current = { version: 'Version ' + verMatch[1], items: [] };
    } else if (current && /^\s*·/.test(cleanLine)) {
      current.items.push(cleanLine.replace(/^\s*·\s*/, ''));
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

function renderChangelog(versions, container, expandText, collapseText) {
  if (!versions.length) { container.innerHTML = '<div class="loading-placeholder">暂无更新日志</div>'; return; }
  const showCount = 5;
  const initial = versions.slice(0, showCount);
  let expanded = false;
  const listDiv = document.createElement('div');
  listDiv.className = 'changelog-list';

  function isRed(v) { const m=v.match(/^Version\s+(\d+)\.(\d+)\.(\d+)$/); return m&&parseInt(m[3])===0; }
  function renderList(items) {
    listDiv.innerHTML = '';
    items.forEach(ver => {
      const ve = document.createElement('div');
      ve.className = 'changelog-version';
      ve.textContent = ver.version;
      if (isRed(ver.version)) ve.style.color = '#de1f1f';
      listDiv.appendChild(ve);
      ver.items.forEach(item => {
        const ie = document.createElement('div');
        ie.className = 'changelog-item';
        ie.textContent = '· ' + item;
        if (isRed(ver.version)) ie.style.color = '#de1f1f';
        listDiv.appendChild(ie);
      });
    });
  }
  renderList(initial);
  const btn = document.createElement('button');
  btn.className = 'changelog-toggle';
  btn.innerHTML = `${expandText} <i class="fas fa-chevron-down"></i>`;
  btn.onclick = () => {
    expanded = !expanded;
    if (expanded) {
      renderList(versions);
      btn.innerHTML = `${collapseText} <i class="fas fa-chevron-up"></i>`;
    } else {
      renderList(initial);
      btn.innerHTML = `${expandText} <i class="fas fa-chevron-down"></i>`;
    }
  };
  container.innerHTML = '';
  container.appendChild(listDiv);
  container.appendChild(btn);
}

// 通知加载
async function loadAnnouncementsWrapper() {
  const langData = langCache[currentLang] || {};
  const moreText = langData.announcementMore || (currentLang === 'zh' ? '查看更多历史通知' : 'View More History');
  const containers = [document.getElementById('announceDesktop'), document.getElementById('announceMobile')].filter(Boolean);
  for (const c of containers) {
    await loadAnnouncements(c, currentLang, { moreText, moreArrow: '→' });
  }
}

// 初始化
async function init() {
  const user = getUrlParam('user');

  // 统一权限检查：非调试用户且 other_admission 为 false 时直接拦截
  if (!isDeveloper(user) && !other_admission) {
    show403(1);
    return;
  }

  // 调试用户的挑战验证（由 challenge.js 根据 test_admission 决定是否执行）
  await initChallenge(user);

  await checkUserMark();
  loadLanguage('en').catch(() => {});
  const data = await loadLanguage('zh');
  if (data) {
    renderWithData(data);
    checkForUpdate({ language: currentLang, countdown: 10 });
  }
  loadBilibiliManual();
  loadChangelog();
  loadAnnouncementsWrapper();
}

init();