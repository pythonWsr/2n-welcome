// main/settings.js – 用户区域与设置菜单（修复子菜单）
import * as pipe from './pipe.js';

let currentLang = pipe.getLanguage();
let currentMode = pipe.getColorMode();

export async function renderUserArea(container) {
  if (!container) return;

  const rawUser = pipe.getUrlParam('user') || '';
  const username = rawUser ? decodeURIComponent(rawUser) : '';

  let avatarUrl = '';
  if (username) {
    const formats = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
    for (const fmt of formats) {
      const tryUrl = `./data/faces/${username}.${fmt}`;
      try {
        const res = await fetch(tryUrl, { method: 'HEAD' });
        if (res.ok) {
          avatarUrl = tryUrl;
          break;
        }
      } catch (e) {}
    }
  }

  let html = '';
  html += '<div class="user-area">';
  html += '<div class="settings-icon" id="settingsIcon"><i class="fas fa-cog"></i></div>';
  html += '<div class="user-info" style="' + (username ? '' : 'display:none;') + '">';
  if (username) {
    if (avatarUrl) {
      html += `<img class="user-avatar" src="${avatarUrl}" alt="${username}">`;
    } else {
      const initial = username.charAt(0).toUpperCase();
      html += `<div class="user-avatar-placeholder">${initial}</div>`;
    }
    html += `<span class="user-name">${escapeHTML(username)}</span>`;
  }
  html += '</div>';
  html += '</div>';

  // 下拉菜单
  html += `
    <div class="settings-dropdown" id="settingsDropdown" style="display:none;">
      <div class="settings-option" id="langOption">
        <i class="fas fa-chevron-left"></i> <span>语言 / Language</span>
      </div>
      <div class="settings-option" id="themeOption">
        <i class="fas fa-chevron-left"></i> <span>主题 / Theme</span>
      </div>
    </div>
  `;

  // 子菜单（默认隐藏）
  html += `<div class="settings-submenu" id="langSubmenu" style="display:none;">
    <div class="settings-option lang-choice" data-lang="zh">中文</div>
    <div class="settings-option lang-choice" data-lang="en">English</div>
  </div>`;
  html += `<div class="settings-submenu" id="themeSubmenu" style="display:none;">
    <div class="settings-option theme-choice" data-mode="light">浅色 / Light</div>
    <div class="settings-option theme-choice" data-mode="dark">深色 / Dark</div>
    <div class="settings-option theme-choice" data-mode="auto">跟随系统 / Auto</div>
  </div>`;

  container.innerHTML = html;

  const settingsIcon = document.getElementById('settingsIcon');
  const dropdown = document.getElementById('settingsDropdown');
  const langOption = document.getElementById('langOption');
  const themeOption = document.getElementById('themeOption');
  const langSubmenu = document.getElementById('langSubmenu');
  const themeSubmenu = document.getElementById('themeSubmenu');

  // 确保容器有相对定位
  container.style.position = 'relative';

  function closeAllMenus() {
    if (dropdown) dropdown.style.display = 'none';
    if (langSubmenu) langSubmenu.style.display = 'none';
    if (themeSubmenu) themeSubmenu.style.display = 'none';
  }

  function closeSubmenus() {
    if (langSubmenu) langSubmenu.style.display = 'none';
    if (themeSubmenu) themeSubmenu.style.display = 'none';
  }

  function positionSubmenu(submenu, anchorElement) {
    if (!submenu || !anchorElement) return;
    const rect = anchorElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    submenu.style.top = (rect.top - containerRect.top) + 'px';
    submenu.style.left = 'auto';
    submenu.style.right = (containerRect.width - rect.left + containerRect.left) + 'px';
    // 确保不超出容器左边界
    const submenuWidth = submenu.offsetWidth;
    const rightPos = containerRect.width - rect.left;
    if (rightPos - submenuWidth < 0) {
      submenu.style.right = 'auto';
      submenu.style.left = '0px';
    }
  }

  settingsIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dropdown.style.display === 'block') {
      closeAllMenus();
    } else {
      closeAllMenus();
      dropdown.style.display = 'block';
    }
  });

  langOption.addEventListener('click', (e) => {
    e.stopPropagation();
    if (langSubmenu.style.display === 'block') {
      closeSubmenus();
    } else {
      closeSubmenus();
      positionSubmenu(langSubmenu, langOption);
      langSubmenu.style.display = 'block';
    }
  });

  themeOption.addEventListener('click', (e) => {
    e.stopPropagation();
    if (themeSubmenu.style.display === 'block') {
      closeSubmenus();
    } else {
      closeSubmenus();
      positionSubmenu(themeSubmenu, themeOption);
      themeSubmenu.style.display = 'block';
    }
  });

  document.querySelectorAll('.lang-choice').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const lang = item.dataset.lang;
      if (lang !== currentLang) {
        currentLang = lang;
        pipe.setLanguage(lang);
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
      }
      closeAllMenus();
    });
  });

  document.querySelectorAll('.theme-choice').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const mode = item.dataset.mode;
      if (mode !== currentMode) {
        currentMode = mode;
        pipe.setColorMode(mode);
        applyThemeManually(mode);
      }
      closeAllMenus();
    });
  });

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      closeAllMenus();
    }
  });

  function applyThemeManually(mode) {
    let theme = mode;
    if (mode === 'auto') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    const themeLink = document.getElementById('theme-link');
    if (themeLink) {
      themeLink.href = `./main/theme-${theme}.css`;
    }
  }
}

function escapeHTML(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}