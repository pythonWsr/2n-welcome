// main/settings.js – 右上角用户区域与设置菜单
import * as pipe from './pipe.js';

let currentLang = pipe.getLanguage();
let currentMode = pipe.getColorMode(); // auto, light, dark

export async function renderUserArea(container) {
  if (!container) return;

  const rawUser = pipe.getUrlParam('user') || '';
  const username = rawUser ? decodeURIComponent(rawUser) : '';

  // 尝试加载头像
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
  // 设置按钮
  html += '<div class="settings-icon" id="settingsIcon"><i class="fas fa-cog"></i></div>';
  // 用户信息（有用户名才显示）
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

  // 设置下拉菜单 (默认隐藏)
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

  // 语言子菜单
  html += `
    <div class="settings-submenu" id="langSubmenu" style="display:none;">
      <div class="settings-option lang-choice" data-lang="zh">中文</div>
      <div class="settings-option lang-choice" data-lang="en">English</div>
    </div>
  `;

  // 主题子菜单
  html += `
    <div class="settings-submenu" id="themeSubmenu" style="display:none;">
      <div class="settings-option theme-choice" data-mode="light">浅色 / Light</div>
      <div class="settings-option theme-choice" data-mode="dark">深色 / Dark</div>
      <div class="settings-option theme-choice" data-mode="auto">跟随系统 / Auto</div>
    </div>
  `;

  container.innerHTML = html;

  // 绑定事件
  const settingsIcon = document.getElementById('settingsIcon');
  const dropdown = document.getElementById('settingsDropdown');
  const langOption = document.getElementById('langOption');
  const themeOption = document.getElementById('themeOption');
  const langSubmenu = document.getElementById('langSubmenu');
  const themeSubmenu = document.getElementById('themeSubmenu');

  if (settingsIcon) {
    settingsIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.style.display === 'block';
      closeAllMenus();
      if (!isOpen) {
        dropdown.style.display = 'block';
      }
    });
  }

  function closeAllMenus() {
    if (dropdown) dropdown.style.display = 'none';
    if (langSubmenu) langSubmenu.style.display = 'none';
    if (themeSubmenu) themeSubmenu.style.display = 'none';
  }

  function closeSubmenus() {
    if (langSubmenu) langSubmenu.style.display = 'none';
    if (themeSubmenu) themeSubmenu.style.display = 'none';
  }

  if (langOption) {
    langOption.addEventListener('click', (e) => {
      e.stopPropagation();
      closeSubmenus();
      if (langSubmenu) langSubmenu.style.display = 'block';
    });
  }

  if (themeOption) {
    themeOption.addEventListener('click', (e) => {
      e.stopPropagation();
      closeSubmenus();
      if (themeSubmenu) themeSubmenu.style.display = 'block';
    });
  }

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
}

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

function escapeHTML(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}