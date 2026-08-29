// checkUpdate.js – 版本检测弹窗（适配主题）
export async function checkForUpdate({ language = 'zh', countdown = 10 } = {}) {
  const STORAGE_KEY = 'cachedVersion';
  let latestVersion = null;
  try {
    const res = await fetch('./README.md');
    const text = await res.text();
    const match = text.match(/^#{0,6}\s*Version\s+([\d.]+)/m);
    if (match) latestVersion = match[1];
  } catch (e) { return; }
  
  const cachedVersion = localStorage.getItem(STORAGE_KEY);
  if (!cachedVersion) {
    localStorage.setItem(STORAGE_KEY, latestVersion);
    return;
  }
  if (cachedVersion === latestVersion) return;

  const lang = await loadCheckLang(language);

  const overlay = document.createElement('div');
  overlay.className = 'update-overlay';
  const dialog = document.createElement('div');
  dialog.className = 'update-dialog';
  const titleEl = document.createElement('h3');
  titleEl.textContent = lang.title;
  titleEl.style.margin = '0 0 12px';
  const msgEl = document.createElement('p');
  msgEl.textContent = lang.message;
  msgEl.style.margin = '0 0 20px';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'update-btn cancel';
  cancelBtn.textContent = lang.cancel;
  const updateBtn = document.createElement('button');
  updateBtn.className = 'update-btn confirm';
  updateBtn.style.marginLeft = '12px';
  let remain = countdown;
  const updateText = () => `${lang.update}${remain > 0 ? ` (${remain}s)` : ''}`;
  updateBtn.textContent = updateText();

  dialog.appendChild(titleEl);
  dialog.appendChild(msgEl);
  dialog.appendChild(cancelBtn);
  dialog.appendChild(updateBtn);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  let resolved = false;
  const finish = (doUpdate) => {
    if (resolved) return;
    resolved = true;
    clearInterval(timer);
    document.body.removeChild(overlay);
    if (doUpdate) {
      localStorage.setItem(STORAGE_KEY, latestVersion);
      location.reload();
    }
  };
  const timer = setInterval(() => {
    remain--;
    updateBtn.textContent = updateText();
    if (remain <= 0) finish(true);
  }, 1000);
  cancelBtn.onclick = () => finish(false);
  updateBtn.onclick = () => finish(true);
}

async function loadCheckLang(langCode) {
  const folder = langCode === 'zh' ? 'zh-CN' : 'en-US';
  try {
    const res = await fetch(`./data/${folder}/check.json`);
    return await res.json();
  } catch (e) {
    return {
      title: 'Notice',
      message: 'A new version is available. Update now?',
      cancel: 'Cancel',
      update: 'Update'
    };
  }
}