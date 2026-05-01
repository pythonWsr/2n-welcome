// main/settings.js – 用户区域与设置菜单（智能防溢出）
import * as pipe from './pipe.js';

let currentLang = pipe.getLanguage();
let currentMode = pipe.getColorMode();

export async function renderUserArea(container) {
  if (!container) return;
  container.style.position = 'relative';

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

  let html = `
    <div class="user-area">
      <div class="settings-icon" id="settingsIcon"><i class="fas fa-cog"></i></div>
      <div class="user-info" style="${username ? '' : 'display:none;'}">
        ${username ? `
          ${avatarUrl 
            ? `<img class="user-avatar" src="${avatarUrl}" alt="${escapeHTML(username)}">`
            : `<div class="user-avatar-placeholder">${username.charAt(0).toUpperCase()}</div>`
          }
          <span class="user-name">${escapeHTML(username)}</span>
        ` : ''}
      </div>
    </div>

    <div class="settings-dropdown" id="settingsDropdown">
      <div class="settings-option" id="langOption">
        <i class="fas fa-chevron-left"></i> <span>语言 / Language</span>
      </div>
      <div class="settings-option" id="themeOption">
        <i class="fas fa-chevron-left"></i> <span>主题 / Theme</span>
      </div>
    </div>

    <div class="settings-submenu" id="langSubmenu">
      <div class="settings-option lang-choice" data-lang="zh">中文</div>
      <div class="settings-option lang-choice" data-lang="en">English</div>
    </div>

    <div class="settings-submenu" id="themeSubmenu">
      <div class="settings-option theme-choice" data-mode="light">浅色 / Light</div>
      <div class="settings-option theme-choice" data-mode="dark">深色 / Dark</div>
      <div class="settings-option theme-choice" data-mode="auto">跟随系统 / Auto</div>
    </div>
  `;

  container.innerHTML = html;

  const settingsIcon = document.getElementById('settingsIcon');
  const dropdown = document.getElementById('settingsDropdown');
  const langOption = document.getElementById('langOption');
  const themeOption = document.getElementById('themeOption');
  const langSubmenu = document.getElementById('langSubmenu');
  const themeSubmenu = document.getElementById('themeSubmenu');

  // 隐藏所有菜单
  function hideAll() {
    dropdown.style.display = 'none';
    langSubmenu.style.display = 'none';
    themeSubmenu.style.display = 'none';
  }

  // 智能定位下拉菜单（主菜单）
  function positionDropdown(menu) {
    const rect = container.getBoundingClientRect();
    menu.style.top = '40px';
    // 默认右对齐
    menu.style.right = '0';
    menu.style.left = 'auto';
    // 如果超出左侧，改为左对齐
    const menuWidth = menu.offsetWidth;
    if (rect.width - menuWidth < 0) {
      menu.style.right = 'auto';
      menu.style.left = '0';
    }
  }

  // 智能定位子菜单（相对于触发选项）
  function positionSubmenu(submenu, anchor) {
    const anchorRect = anchor.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const submenuWidth = submenu.offsetWidth || 160;

    // 先尝试向左弹出
    let left = anchorRect.left - containerRect.left - submenuWidth - 4;
    if (left >= 0) {
      submenu.style.left = left + 'px';
      submenu.style.right = 'auto';
    } else {
      // 向左空间不足，改为向右弹出
      const right = anchorRect.left - containerRect.left + anchorRect.width + 4;
      submenu.style.left = right + 'px';
      submenu.style.right = 'auto';
      // 如果向右也超出容器，则紧贴右侧
      if (right + submenuWidth > containerRect.width) {
        submenu.style.left = 'auto';
        submenu.style.right = '0';
      }
    }
    submenu.style.top = (anchorRect.top - containerRect.top) + 'px';
  }

  settingsIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dropdown.style.display === 'block') {
      hideAll();
    } else {
      hideAll();
      dropdown.style.display = 'block';
      positionDropdown(dropdown);
    }
  });

  langOption.addEventListener('click', (e) => {
    e.stopPropagation();
    hideAll(); // 先关闭其他
    langSubmenu.style.display = 'block';
    positionSubmenu(langSubmenu, langOption);
  });

  themeOption.addEventListener('click', (e) => {
    e.stopPropagation();
    hideAll();
    themeSubmenu.style.display = 'block';
    positionSubmenu(themeSubmenu, themeOption);
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
      hideAll();
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
      hideAll();
    });
  });

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      hideAll();
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