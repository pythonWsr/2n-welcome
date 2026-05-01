// main/settings.js – 用户区域与设置菜单（修复子菜单弹出）
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

  // 获取元素
  const settingsIcon = document.getElementById('settingsIcon');
  const dropdown = document.getElementById('settingsDropdown');
  const langOption = document.getElementById('langOption');
  const themeOption = document.getElementById('themeOption');
  const langSubmenu = document.getElementById('langSubmenu');
  const themeSubmenu = document.getElementById('themeSubmenu');

  // 所有菜单初始隐藏
  dropdown.style.display = 'none';
  langSubmenu.style.display = 'none';
  themeSubmenu.style.display = 'none';

  // 关闭所有菜单
  function closeAll() {
    dropdown.style.display = 'none';
    langSubmenu.style.display = 'none';
    themeSubmenu.style.display = 'none';
  }

  // 关闭子菜单
  function closeSubMenus() {
    langSubmenu.style.display = 'none';
    themeSubmenu.style.display = 'none';
  }

  // 设置图标点击 → 切换主菜单
  settingsIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dropdown.style.display === 'block') {
      closeAll();
    } else {
      closeAll();
      dropdown.style.display = 'block';
    }
  });

  // 语言选项点击 → 切换语言子菜单
  langOption.addEventListener('click', (e) => {
    e.stopPropagation();
    closeSubMenus(); // 关闭另一个子菜单
    langSubmenu.style.display = langSubmenu.style.display === 'block' ? 'none' : 'block';
  });

  // 主题选项点击 → 切换主题子菜单
  themeOption.addEventListener('click', (e) => {
    e.stopPropagation();
    closeSubMenus();
    themeSubmenu.style.display = themeSubmenu.style.display === 'block' ? 'none' : 'block';
  });

  // 语言选择
  document.querySelectorAll('.lang-choice').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const lang = item.dataset.lang;
      if (lang !== currentLang) {
        currentLang = lang;
        pipe.setLanguage(lang);
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
      }
      closeAll();
    });
  });

  // 主题选择
  document.querySelectorAll('.theme-choice').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const mode = item.dataset.mode;
      if (mode !== currentMode) {
        currentMode = mode;
        pipe.setColorMode(mode);
        applyThemeManually(mode);
      }
      closeAll();
    });
  });

  // 点击外部关闭
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      closeAll();
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