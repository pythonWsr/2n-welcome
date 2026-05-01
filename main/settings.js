// main/settings.js – 用户区域与设置菜单（强化防溢出定位）
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

  function hideAll() {
    dropdown.style.display = 'none';
    langSubmenu.style.display = 'none';
    themeSubmenu.style.display = 'none';
  }

  // 确保下拉菜单（主菜单）不超出容器边界
  function positionDropdown(menu) {
    const containerRect = container.getBoundingClientRect();
    menu.style.top = '40px';
    // 默认右对齐
    menu.style.right = '0';
    menu.style.left = 'auto';
    // 如果菜单宽度超过容器左侧剩余空间，改为左对齐
    const menuWidth = menu.offsetWidth;
    if (menuWidth > containerRect.width) {
      // 菜单比容器还宽，则左对齐并允许稍微超出（或设置 max-width）
      menu.style.right = 'auto';
      menu.style.left = '0';
      menu.style.maxWidth = containerRect.width + 'px';
    } else if (containerRect.width - menuWidth < 0) {
      menu.style.right = 'auto';
      menu.style.left = '0';
    }
  }

  // 子菜单智能定位：优先向左弹出，若空间不够则向右，若仍不够则贴边并设置 max-width
  function positionSubmenu(submenu, anchor) {
    const anchorRect = anchor.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const submenuWidth = submenu.offsetWidth || 160;

    // 清除旧样式
    submenu.style.left = 'auto';
    submenu.style.right = 'auto';
    submenu.style.maxWidth = 'none';

    // 先尝试向左弹出
    const spaceOnLeft = anchorRect.left - containerRect.left;
    if (spaceOnLeft >= submenuWidth + 4) {
      submenu.style.right = (containerRect.width - anchorRect.left + containerRect.left) + 'px';
      submenu.style.marginRight = '4px';
      submenu.style.left = 'auto';
    } else {
      // 向左空间不足，尝试向右弹出
      const spaceOnRight = containerRect.width - (anchorRect.left + anchorRect.width) - containerRect.left;
      if (spaceOnRight >= submenuWidth + 4) {
        submenu.style.left = (anchorRect.left + anchorRect.width - containerRect.left + 4) + 'px';
        submenu.style.right = 'auto';
        submenu.style.marginRight = '0';
      } else {
        // 两侧都不够，则强制定位在容器内，必要时缩小宽度
        const maxAvail = containerRect.width - 8;
        if (submenuWidth > maxAvail) {
          submenu.style.maxWidth = maxAvail + 'px';
          submenu.style.whiteSpace = 'normal';
        }
        // 紧贴容器右侧
        submenu.style.right = '0';
        submenu.style.left = 'auto';
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
    hideAll();
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