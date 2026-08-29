// settings.js – 用户区域与设置菜单（智能防溢出）
import * as implicit from './implicitPipe.js';
import { getUrlParam } from './explicitPipe.js';

let currentLang = implicit.getLanguage();
let currentMode = implicit.getColorMode();

export async function renderUserArea(container) {
  if (!container) return;
  container.style.position = 'relative';

  const rawUser = getUrlParam('user') || '';
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

  dropdown.style.display = 'none';
  langSubmenu.style.display = 'none';
  themeSubmenu.style.display = 'none';

  function hideAll() {
    dropdown.style.display = 'none';
    langSubmenu.style.display = 'none';
    themeSubmenu.style.display = 'none';
  }

  function keepInViewport(menu) {
    if (!menu) return;
    const menuRect = menu.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    if (menuRect.right > winW) {
      menu.style.left = 'auto';
      menu.style.right = '0px';
    }
    if (menuRect.left < 0) {
      menu.style.left = '0px';
      menu.style.right = 'auto';
    }
    if (menuRect.bottom > winH) {
      menu.style.top = Math.max(0, winH - menuRect.height - 10) + 'px';
    }
    if (menuRect.top < 0) {
      menu.style.top = '10px';
    }
  }

  function positionDropdown(menu) {
    menu.style.top = '40px';
    menu.style.right = '0';
    menu.style.left = 'auto';
    requestAnimationFrame(() => keepInViewport(menu));
  }

  function positionSubmenu(submenu, anchor) {
    const anchorRect = anchor.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    submenu.style.top = (anchorRect.top - containerRect.top) + 'px';
    submenu.style.left = (anchorRect.left - containerRect.left - 170) + 'px';
    submenu.style.right = 'auto';
    requestAnimationFrame(() => {
      const subRect = submenu.getBoundingClientRect();
      if (subRect.left < 0) {
        submenu.style.left = 'auto';
        submenu.style.right = (containerRect.width - anchorRect.right + containerRect.left) + 'px';
      }
      keepInViewport(submenu);
    });
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
        implicit.setLanguage(lang);
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
        implicit.setColorMode(mode);
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

function escapeHTML(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}