// dev.js – 开发者模式：可视化命令追踪面板，每条命令后延迟5ms
(function() {
  if (typeof window.__devEnabled !== 'undefined') return;
  window.__devEnabled = true;

  // ========== 创建命令显示面板 ==========
  const panel = document.createElement('div');
  panel.id = 'dev-command-panel';
  panel.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    width: 420px;
    max-height: 350px;
    background: #1e1e1e;
    color: #4ec9b0;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    border-radius: 12px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.5);
    z-index: 99997;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    resize: both;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    background: #2d2d2d;
    color: #cccccc;
    padding: 4px 12px;
    font-size: 12px;
    display: flex;
    justify-content: space-between;
    cursor: move;
    user-select: none;
  `;
  header.innerHTML = '<span>🛠️ 命令追踪 (DEV)</span><span id="dev-clear-btn" style="cursor:pointer;">✖ 清空</span>';
  panel.appendChild(header);

  const output = document.createElement('div');
  output.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    white-space: pre-wrap;
    word-break: break-all;
    line-height: 1.4;
  `;
  panel.appendChild(output);
  document.body.appendChild(panel);

  // 清空按钮
  document.getElementById('dev-clear-btn').addEventListener('click', () => {
    output.textContent = '';
  });

  // 简单拖拽（只实现头部拖拽）
  let dragging = false, startX, startY, startLeft, startTop;
  header.addEventListener('mousedown', (e) => {
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = panel.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    panel.style.cursor = 'grabbing';
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panel.style.left = (startLeft + dx) + 'px';
    panel.style.top = (startTop + dy) + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
    panel.style.cursor = 'default';
  });

  // 面板中显示命令
  function logCommand(type, args) {
    const time = new Date().toLocaleTimeString();
    const shortArgs = Array.from(args).map(a => {
      if (typeof a === 'function') return 'function()';
      if (typeof a === 'object') return JSON.stringify(a).substring(0, 80);
      return String(a).substring(0, 80);
    }).join(', ');
    const line = `[${time}] ${type}(${shortArgs})\n`;
    output.textContent += line;
    output.scrollTop = output.scrollHeight;
  }

  // 包装定时器和 fetch
  const origSetTimeout = window.setTimeout;
  const origSetInterval = window.setInterval;
  const origFetch = window.fetch;

  window.setTimeout = function(fn, delay, ...args) {
    logCommand('setTimeout', [fn, delay, ...args]);
    return origSetTimeout.call(window, fn, delay, ...args);
  };
  window.setInterval = function(fn, delay, ...args) {
    logCommand('setInterval', [fn, delay, ...args]);
    return origSetInterval.call(window, fn, delay, ...args);
  };
  window.fetch = function(...args) {
    logCommand('fetch', args);
    return origFetch.apply(window, args).then(response => response);
  };

  // 模拟每条命令后延迟5ms（微任务延迟）
  const origPromiseThen = Promise.prototype.then;
  Promise.prototype.then = function(onFulfilled, onRejected) {
    const start = Date.now();
    const wrappedFulfilled = typeof onFulfilled === 'function' ? function(value) {
      const now = Date.now();
      const diff = now - start;
      if (diff < 5) {
        return new Promise(resolve => setTimeout(() => resolve(onFulfilled(value)), 5 - diff));
      }
      return onFulfilled(value);
    } : onFulfilled;
    return origPromiseThen.call(this, wrappedFulfilled, onRejected);
  };

  console.log('🔧 dev.js 已激活：命令追踪面板已显示');
})();