// main/settings.js – 设置菜单交互（打开/关闭、外部点击关闭、回到旧版本、清除缓存）
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    const settingsIcon = document.getElementById('settingsIcon');
    const settingsDropdown = document.getElementById('settingsDropdown');
    const backBtn = document.getElementById('backToOldVersion');
    const clearCacheBtn = document.getElementById('clearCache');

    if (!settingsIcon || !settingsDropdown || !backBtn || !clearCacheBtn) {
      console.warn('设置菜单所需元素未找到');
      return;
    }

    // 打开/关闭设置菜单
    settingsIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      settingsDropdown.style.display = settingsDropdown.style.display === 'none' ? 'block' : 'none';
    });

    // 点击外部关闭菜单
    document.addEventListener('click', (e) => {
      if (!settingsIcon.contains(e.target) && !settingsDropdown.contains(e.target)) {
        settingsDropdown.style.display = 'none';
      }
    });

    // 回到旧版本
    backBtn.addEventListener('click', () => {
      settingsDropdown.style.display = 'none';
      window.location.href = './v0/index.html';
    });

    // 清除缓存
    clearCacheBtn.addEventListener('click', async () => {
      settingsDropdown.style.display = 'none';
      // 清除 Cache Storage 缓存
      if ('caches' in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map(key => caches.delete(key)));
        } catch (e) {
          console.warn('缓存清除失败:', e);
        }
      }
      // 添加时间戳强制刷新，绕过 HTTP 缓存
      const url = new URL(window.location.href);
      url.searchParams.set('_', Date.now());
      window.location.href = url.toString();
    });
  });
})();
