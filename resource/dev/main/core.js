// core.js (灰测版) – 主逻辑，集成权限、Mark List、贡献榜等
import * as pipe from './pipe.js';
import { decodeRichText } from './decode.js';
import { checkForUpdate } from './checkUpdate.js';
import { loadAnnouncements } from '../data/announcement.js';
import { initChallenge } from './challenge.js';
import { show403 } from './error403.js';

// 主题切换
function applyTheme() {
  const mode = pipe.getColorMode();
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
let currentLang = pipe.getLanguage();

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

async function checkUserMark() {
  const user = pipe.getUrlParam('user');
  if (!user) return;
  try {
    const res = await fetch('./data/mark.json');
    const list = await res.json();
    if (list.includes(user)) {
      show403(4);
      throw new Error('User in mark list');
    }
  } catch(e) {}
}

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
    loadLanguage(newLang).then(data =>Lang = newLang;
    loadLanguage(newLang).then(data => {
      if ( {
      if (data) {
        renderWithData(data);
       data) {
        renderWithData(data);
        loadAnnouncements loadAnnouncementsWrapper();
        loadChangelog();
Wrapper();
        loadChangelog();
      }
    });
      }
    });
  }
});

async function loadBilib  }
});

async function loadBilibiliManualiliManual() {
  const() {
  const container = document.getElementById('bilibiliFeed');
 container = document.getElementById('bilibiliFeed');
  try {
    const res = await fetch('./data/bilibili  try {
    const res = await fetch('./data/bilibili.json');
    const data = await res.json();
    let html =.json');
    const data = await res.json();
    let html = `<div `<div class="up-info"><img class="up-info"><img class="up- class="up-avatar" src="${avatar" src="${data.up.face}" onerror="data.up.face}" onerror="this.srcthis.src='data:image/svg+xml,...'='data:image/svg+xml,...'"><div class="up-name"><a href="${data.up"><div class="up-name"><a href="${data.up.homepage}" target="_blank">${data.up.name}</a></div></.homepage}" target="_blank">${data.up.name}</a></div></div><div class="video-scroll-container"><div classdiv><div class="video-scroll-container"><div class="video-list">`;
    data.v="video-list">`;
    data.videos.forEach(v =>ideos.forEach(v => {
      html += `<div class=" {
      html += `<div class="video-card"><divvideo-card"><div class="video-iframe-wrapper">${ class="video-iframe-wrapper">${v.iframe.replace('<iframe',v.iframe.replace('<iframe', '<iframe style="position:absolute '<iframe style="position:absolute; top:0; left:0; width; top:0; left:0; width:100:100%; height:100%;"')}</div><div class%; height:100%;"')}</div><div class="video-title"><a href="https://www="video-title"><a href="https://www.bilibili.com/video/${v.bvid}" target.bilibili.com/video/${v.bvid}" target="_blank">${v.title}</a="_blank">${v.title}</a></div><div class="video-meta"><span>${v.date}</></div><div class="video-meta"><span>${v.date}</span><span><i class="far fa-play-circle"></span><span><i class="far fa-play-circle"></i> ${v.play||''}</span></div></div>i> ${v.play||''}</span></div></div>`;
    });
    html += `</div></`;
    });
    html += `</div></div>`;
    container.innerHTML = html;
  } catchdiv>`;
    container.innerHTML = html;
  } catch(e) { container.innerHTML =(e) { container.innerHTML = '<div class="loading-place '<div class="loading-placeholder">holder">资讯加载失败</div>资讯加载失败</div>'; }
}

async function loadChangelog()'; }
}

async function loadChangelog() {
  const desktop = document.getElementById(' {
  const desktop = document.getElementById('changelchangelogContentDesktop');
  const mobile = document.getElementById('chogContentDesktop');
  const mobile = document.getElementById('changelogangelogContentMobile');
  try {
    const res = await fetchContentMobile');
  try {
    const res = await fetch('./README('./README.md');
    const text = await res.md');
    const text = await res.text();
    const versions =.text();
    const versions = parseChangelog(text);
    const langData = langCache[currentLang] parseChangelog(text);
    const langData = langCache[currentLang] || {};
    const expand = || {};
    const expand = langData.changelogExpand || ( langData.changelogExpand || (currentLang === 'zh' ? 'currentLang === 'zh' ? '查看全部' : 'Show查看全部' : 'Show All');
    const collapse = langData All');
    const collapse = langData.changelogCollapse ||.changelogCollapse || (currentLang === 'zh' ? (currentLang === 'zh' ? '折叠' : 'Collapse');
    renderChangel '折叠' : 'Collapse');
    renderChangelog(versions, desktop,og(versions, desktop, expand, collapse);
    renderChangelog( expand, collapse);
    renderChangelog(versions, mobile, expand, collapse);
versions, mobile, expand, collapse);
  } catch(e) {
  } catch(e) {
    desktop.innerHTML = '<div class="    desktop.innerHTML = '<div class="loading-placeholder">更新日志不可用</div>';
   loading-placeholder">更新日志不可用</div>';
    mobile.innerHTML = '<div class mobile.innerHTML = '<div class="loading-placeholder">更新日志不可用</="loading-placeholder">更新日志不可用</div>';
  }
}

function parseChangelog(md) {
  const lines =div>';
  }
}

function parseChangelog(md) {
  const lines = md.split('\n');
  const blocks = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(/^#{0, md.split('\n');
  const blocks = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(/^#{0,6}\s*Version\s+([\d.]+)/6}\s*Version\s+([\d.]+)/);
    if (m) {
      if (current));
    if (m) {
      if (current) blocks.push blocks.push(current);
      current = { version: 'Version ' + m(current);
      current = { version: 'Version ' + m[1], items: [] };
    } else if (current && /^\s*·[1], items: [] };
    } else if (current && /^\s*·/.test(line)) {
      current.items.push(line.replace(/^\s*·/.test(line)) {
      current.items.push(line.replace(/^\s*·\s*/, ''));
    }
  }
  if (current) blocks\s*/, ''));
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

function renderChangel.push(current);
  return blocks;
}

function renderChangelog(versions, container, expandText, collapseText) {
 og(versions, container, expandText, collapseText) {
  if (!versions.length) { container.innerHTML = '<div class="loading-placeholder">暂无更新日志 if (!versions.length) { container.innerHTML = '<div class="loading-placeholder">暂无</div>'; return; }
  const showCount =更新日志</div>'; return; }
  const showCount = 5;
  const initial = versions.slice(0, showCount);
  let expanded 5;
  const initial = versions.slice(0, showCount);
  let expanded = false;
  const listDiv = document.createElement('div = false;
  const listDiv = document.createElement('div');
  listDiv.className = 'changelog-list';

 ');
  listDiv.className = 'changelog-list';

  function isRed(v) { function isRed(v) { const m=v.match(/^ const m=v.match(/^Version\s+(\d+)\.Version\s+(\d+)\.(\d+)\.(\d+)$(\d+)\.(\d+)$/); return m/); return m&&parseInt(m[3&&parseInt(m[3])===])===0; }
  function render0; }
  function renderList(items) {
    listDiv.innerHTML = '';
    items.forEach(List(items) {
    listDiv.innerHTML = '';
    items.forEach(ver => {
      const vever => {
      const ve = document.createElement('div');
      ve = document.createElement('div');
      ve.className = 'changelog-.className = 'changelog-version';
      ve.textContent = verversion';
      ve.textContent = ver.version;
      if.version;
      if (isRed(ver.version (isRed(ver.version)) ve.style.color = '#de1)) ve.style.color = '#de1f1f';
      listf1f';
      listDiv.appendChild(ve);
     Div.appendChild(ve);
      ver.items.forEach(item => {
        const ver.items.forEach(item => {
        const ie = document.createElement ie = document.createElement('div');
        ie.class('div');
        ie.className = 'changelog-item';
        ie.textName = 'changelog-item';
        ieContent = '· ' + item;
        if (.textContent = '· ' + item;
        if (isRed(ver.version)) ie.style.color = '#deisRed(ver.version)) ie.style.color = '#de1f1f';
        listDiv.appendChild(ie);
      });
1f1f';
        listDiv.appendChild(ie);
      });
    });
  }
  renderList(initial);
    });
  }
  renderList(initial);
  const btn = document.createElement  const btn = document.createElement('button');
  btn.className = 'changelog-toggle';
('button');
  btn.className = 'changelog-toggle';
  btn.innerHTML =  btn.innerHTML = `${expandText} <i class=" `${expandText} <i class="fas fa-chevron-down"></i>`;
  btn.onclickfas fa-chevron-down"></i>`;
  btn = () => {
    expanded = !.onclick = () => {
    expanded = !expanded;
    if (expanded) {
expanded;
    if (expanded) {
      renderList(versions);
      btn      renderList(versions);
      btn.innerHTML = `${collapseText} <i.innerHTML = `${collapseText} <i class="fas fa-chevron-up class="fas fa-chevron-up"></i>`;
    }"></i>`;
    } else {
      renderList(initial);
      btn.innerHTML = `${expand else {
      renderList(initial);
      btn.innerHTML = `${expandText} <i class="fas fa-chevText} <i class="fas fa-chevron-down"></i>`;
    }
  };
  container.innerHTML = '';
 ron-down"></i>`;
    }
  };
  container.innerHTML = '';
  container.appendChild(listDiv);
  container.appendChild(btn);
}

 container.appendChild(listDiv);
  container.appendChild(btn);
}

async function loadAnnouncementsWrapper() {
  const langasync function loadAnnouncementsWrapper() {
  const langData = langCache[currentLang] || {};
  const moreData = langCache[currentLang] || {};
  const moreText = langData.announcementMore || (currentLangText = langData.announcementMore || (currentLang === 'zh' ? '查看更多历史通知' === 'zh' ? '查看更多历史通知' : 'View More History');
  const containers = : 'View More History');
  const containers = [document.getElementById('announceDesktop'), document.getElementById('announceMobile [document.getElementById('announceDesktop'), document.getElementById('announceMobile')].filter(Boolean);
  for (const c of')].filter(Boolean);
  for (const c of containers containers) {
    await loadAnnouncements(c, current) {
    await loadAnnouncements(c, currentLang, { moreText, moreArrowLang, { moreText, moreArrow: '→' });
  }
}

//: '→' });
  }
}

// 初始化入口
async function init() {
  // 1. 初始化入口
async function init() {
  // 1. 权限与挑战（失败会显示错误码并中止）
  权限与挑战（失败会显示错误码并中止）
  await initChallenge();
  // 2. Mark await initChallenge();
  // 2. Mark List 封禁检查
  await checkUserMark();
  // 3. 正常内容加载
  List 封禁检查
  await checkUserMark();
  // 3. 正常内容加载
  loadLanguage('en').catch(() => {});
  const data = await loadLanguage('zh');
  if (data) {
    render loadLanguage('en').catch(() => {});
  const data = await loadLanguage('zh');
  if (data) {
    renderWithData(data);
    checkForUpdate({ language: currentLang, countdown: 10 });
  }
  loadBilibiliManual();
  loadChangelog();
  loadAnnWithData(data);
    checkForUpdate({ language: currentLang, countdown: 10 });
  }
  loadBilibiliManual();
  loadChangelog();
  loadAnnouncementsWrapper();
ouncementsWrapper();
}

init();