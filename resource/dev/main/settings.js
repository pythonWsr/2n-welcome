// settings.js – 用户区域与设置菜单（智能防溢出，修正图片路径）
import * as pipe from './pipe.js';

let currentLang = pipe.getLanguage();
let currentMode = pipe.getColorMode();

export async function renderUserArea(container) {
  if (!container) return;
  container.style.position = 'relative';

  const rawUser = pipe.getUrlParam('user') || '';
  const username = rawUser ? decodeURIComponent(rawUser) : '';

  // 修正头像路径：dev/index.html -> ./data/faces -> ../data/faces
  let avatarUrl = '';
  if (username) {
    const formats = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
    for (const fmt of formats) {
      const tryUrl = `../data/faces/${username}.${fmt}`;
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

  // 强制隐藏所有菜单（初始状态）
  dropdown.style.display = 'none';
  langSubmenu.style.display = 'none';
  themeSubmenu.style.display = 'none';

  // 关闭所有菜单
  function hideAll() {
    dropdown.style.display = 'none';
    langSubmenu.style.display = 'none';
    themeSubmenu.style.display = 'none';
  }

  // 智能定位：确保菜单不超出窗口
  function keepInViewport(menu, anchorRect = null) {
    if (!menu) return;
    const menuRect = menu.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    // 水平修正
    if (menuRect.right > winW) {
      menu.style.left = 'auto';
      menu.style.right = '0px';
    }
    if (menuRect.left < 0) {
      menu.style.left = '0px';
      menu.style.right = 'auto';
    }
    // 垂直修正
    if (menuRect.bottom > winH) {
      menu.style.top = Math.max(0, winH - menuRect.height - 10) + 'px';
    }
    if (menuRect.top < 0) {
      menu.style.top = '10px';
    }
  }

  // 定位主菜单（相对于容器）
  function positionDropdown(menu) {
    menu.style.top = '40px';
    menu.style.right = '0';
    menu.style.left = 'auto';
    // 强制重排后检查溢出
    requestAnimationFrame(() => keepInViewport(menu));
  }

  // 定位子菜单（相对于触发选项）
  function positionSubmenu(submenu, anchor) {
    const anchorRect = anchor.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    // 先放置到默认左侧
    submenu.style.top = (anchorRect.top - containerRect.top) + 'px';
    submenu.style.left = (anchorRect.left - containerRect.left - 170) + 'px'; // 假设宽度170
    submenu.style.right = 'auto';
    requestAnimationFrame(() => {
      // 如果超出左边界，改为右侧弹出
      const subRect = submenu.getBoundingClientRect();
      if (subRect.left < 0) {
        submenu.style.left = 'auto';
        submenu.style.right = (containerRect.width - anchorRect.right + containerRect.left) + 'px';
      }
      keepInViewport(submenu);
    });
  }

  // 设置图标点击
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

  // 语言选项点击
  langOption.addEventListener('click', (e) => {
    e.stopPropagation();
    hideAll(); // 关闭其他，但保留本身需要打开的
    langSubmenu.style.display = 'block';
    positionSubmenu(langSubmenu, langOption);
  });

  // 主题选项点击
  themeOption.addEventListener('click', (e) => {
    e.stopPropagation();
    hideAll();
    themeSubmenu.style.display = 'block';
    positionSubmenu(themeSubmenu, themeOption);
  });

  // 语言选择
  document.querySelectorAll('.lang-choice').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const lang = item.dataset.lang;
      if (lang !== currentLang) {
        currentLang = lang;
        pipe.setLanguage(lang);
      }
      hideAll();
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
      }
      hideAll();
    });
  });

  // 点击外部关闭
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      hideAll();
    }
  });
}

function escapeHTML(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}