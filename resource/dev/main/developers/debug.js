// debug.js – 调试模式：捕获错误并显示在页面上（已移至 developers 目录）

(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const isDebug = urlParams.get('user') === 'debug';

  if (!isDebug) return;

  // 创建错误显示容器
  const debugContainer = document.createElement('div');
  debugContainer.id = 'debug-panel';
  debugContainer.style.cssText = `
    position: fixed;
    bottom: 10px;
    left: 10px;
    right: 10px;
    max-height: 40vh;
    overflow-y: auto;
    background: #1e1e1e;
    color: #ff6666;
    font-family: monospace;
    font-size: 12px;
    padding: 12px;
    border-radius: 12px;
    z-index: 99999;
    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    white-space: pre-wrap;
    word-break: break-all;
  `;
  document.body.appendChild(debugContainer);

  // 保存原始 fetch
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    try {
      const response = await originalFetch(...args);
      const clone = response.clone();
      if (!response.ok || isDebug) {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown';
        const status = response.status;
        try {
          const text = await clone.text();
          if (!response.ok) {
            logError(`❌ FETCH ${status} ${url}\n${text.substring(0, 500)}`);
          } else {
            logError(`✅ FETCH ${status} ${url}`);
          }
        } catch (e) {
          logError(`⚠️ FETCH ${status} ${url} (无法读取响应)`);
        }
      }
      return response;
    } catch (err) {
      logError(`🔥 FETCH 网络错误: ${err.message}`);
      throw err;
    }
  };

  // 捕获全局错误
  window.addEventListener('error', (event) => {
    if (event.target && event.target.tagName === 'IMG') {
      logError(`🖼️ 图片加载失败: ${event.target.src}`);
    } else {
      logError(`💥 JS错误: ${event.message} at ${event.filename}:${event.lineno}`);
    }
    return false;
  });

  // 未捕获 Promise 错误
  window.addEventListener('unhandledrejection', (event) => {
    logError(`⛔ Promise 错误: ${event.reason?.message || event.reason}`);
  });

  function logError(msg) {
    const entry = document.createElement('div');
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    debugContainer.appendChild(entry);
    debugContainer.scrollTop = debugContainer.scrollHeight;
  }

  console.log('🐞 Debug mode activated');
})();