// refactorNotice.js – 页面打开时显示重构提示弹窗
(function() {
  // 防止重复执行
  if (window.__refactorNoticeShown) return;
  window.__refactorNoticeShown = true;

  function showNotice() {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(2px);
    `;

    // 创建弹窗卡片
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: #ffffff;
      color: #1e2b3c;
      border-radius: 20px;
      padding: 24px;
      max-width: 90%;
      width: 400px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      text-align: center;
      font-family: system-ui, 'Segoe UI', Roboto, sans-serif;
    `;

    dialog.innerHTML = `
      <div style="font-size: 1.5rem; margin-bottom: 12px;">🔧</div>
      <h2 style="font-size: 1.2rem; margin-bottom: 12px; color: #0b3b5c;">公会页面正在重构</h2>
      <p style="font-size: 0.95rem; line-height: 1.6; margin-bottom: 16px; color: #2b4e65;">
        当前公会页面正在重构，可能会看到一些调试信息。<br>
        您可以点击右上角设置按钮回到旧版本。<br>
        感谢您的理解！
      </p>
      <button id="refactorNoticeClose" style="
        padding: 8px 24px;
        border-radius: 30px;
        border: none;
        background: #2563eb;
        color: white;
        font-size: 0.95rem;
        cursor: pointer;
        transition: background 0.2s;
      ">我知道了</button>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // 关闭逻辑
    const closeBtn = dialog.querySelector('#refactorNoticeClose');
    closeBtn.addEventListener('click', () => {
      overlay.remove();
    });

    // 点击遮罩层空白处也可关闭（可选）
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  // DOM 加载完成后显示
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showNotice);
  } else {
    showNotice();
  }
})();
