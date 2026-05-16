// admin.js – 简易网页控制台

(function() {
  // 防止重复创建
  if (document.getElementById('admin-console')) return;

  const style = document.createElement('style');
  style.textContent = `
    #admin-console {
      position: fixed;
      bottom: 10px;
      right: 10px;
      width: 350px;
      max-height: 300px;
      background: #1e1e1e;
      color: #d4d4d4;
      font-family: monospace;
      font-size: 13px;
      border-radius: 12px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.5);
      z-index: 99998;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .admin-output {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .admin-input-row {
      display: flex;
      border-top: 1px solid #333;
    }
    .admin-input-row input {
      flex: 1;
      background: #2d2d2d;
      border: none;
      color: white;
      padding: 8px;
      font-family: monospace;
    }
    .admin-input-row input:focus {
      outline: none;
    }
  `;
  document.head.appendChild(style);

  const consoleDiv = document.createElement('div');
  consoleDiv.id = 'admin-console';
  consoleDiv.innerHTML = `
    <div class="admin-output" id="adminOutput"></div>
    <div class="admin-input-row">
      <input type="text" id="adminInput" placeholder="输入 JavaScript 命令..." autofocus>
    </div>
  `;
  document.body.appendChild(consoleDiv);

  const output = document.getElementById('adminOutput');
  const input = document.getElementById('adminInput');

  function logResult(text) {
    output.textContent += `\n> ${text}`;
    output.scrollTop = output.scrollHeight;
  }

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const command = input.value.trim();
      if (!command) return;
      logResult(command);
      try {
        const result = eval(command);
        logResult(result === undefined ? 'undefined' : String(result));
      } catch (err) {
        logResult(`Error: ${err.message}`);
      }
      input.value = '';
    }
  });

  // 点击外部不关闭控制台
  document.addEventListener('click', function(e) {
    if (e.target === consoleDiv) {
      input.focus();
    }
  });

  console.log('🖥️ admin.js 已激活：网页控制台已就绪');
})();