// module/code.js – 代码块模块（DeepSeek 风格）
// 由 wikiParser 特殊处理 {{code|lang|"""code"""}}，不走通用模块流程

export default {
  name: 'code',
  isBlock: true,
  render() { return ''; }
};

// ---------- 渲染 ----------
export function renderCodeBlock(lang, escapedCode) {
  const langLabel = String(lang || 'text').trim();
  let code = String(escapedCode || '');
  code = code.replace(/^\n+/, '').replace(/\n+$/, '');

  const highlighted = highlight(code, langLabel);
  const encoded = encodeBase64(code);

  return `<div class="wiki-code-block" data-lang="${escapeAttr(langLabel)}" data-code="${encoded}">` +
    `<div class="wiki-code-header">` +
      `<span class="wiki-code-lang">${escapeHTML(langLabel)}</span>` +
      `<button type="button" class="wiki-code-copy" aria-label="复制代码">复制</button>` +
    `</div>` +
    `<pre class="wiki-code-body"><code>${highlighted}</code></pre>` +
  `</div>`;
}

// ---------- 语法高亮 ----------
function highlight(code, lang) {
  const l = String(lang).toLowerCase();
  const aliases = {
    javascript: 'js', ts: 'js', typescript: 'js',
    py: 'python',
    sh: 'bash', shell: 'bash', zsh: 'bash',
    ps: 'powershell', pwsh: 'powershell',
    htm: 'html', xml: 'html',
    scss: 'css', less: 'css'
  };
  const key = aliases[l] || l;

  if (key === 'html') return highlightHTML(code);
  if (key === 'css')  return highlightCSS(code);

  // 通用流程
  let s = code;
  const tokens = [];
  const store = (html) => {
    const id = `\uE000T${tokens.length}Z\uE001`;
    tokens.push(html);
    return id;
  };

  // 字符串
  s = s.replace(/"[^"\n]*"/g, m => store(`<span class="tok-str">${m}</span>`));
  s = s.replace(/'[^'\n]*'/g, m => store(`<span class="tok-str">${m}</span>`));
  s = s.replace(/`[^`\n]*`/g, m => store(`<span class="tok-str">${m}</span>`));

  const bashLike = ['bash', 'python', 'yaml', 'yml', 'ini', 'conf'];
  const cLike = ['js', 'c', 'cpp', 'java', 'go', 'rust'];

  if (bashLike.includes(key)) {
    s = s.replace(/#[^\n]*/g, m => store(`<span class="tok-comment">${m}</span>`));
  } else if (cLike.includes(key)) {
    s = s.replace(/\/\*[\s\S]*?\*\//g, m => store(`<span class="tok-comment">${m}</span>`));
    s = s.replace(/\/\/[^\n]*/g, m => store(`<span class="tok-comment">${m}</span>`));
  }

  // 数字
  s = s.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');

  // 关键字
  const keywords = {
    js: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'new', 'this', 'async', 'await', 'try', 'catch', 'import', 'export', 'from', 'default', 'null', 'undefined', 'true', 'false'],
    python: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'import', 'from', 'lambda', 'yield', 'pass', 'raise', 'in', 'not', 'and', 'or', 'is', 'None', 'True', 'False', 'self'],
    bash: ['if', 'then', 'else', 'fi', 'for', 'in', 'do', 'done', 'while', 'case', 'esac', 'function', 'return', 'echo', 'cd', 'ls', 'pwd', 'export', 'source', 'alias', 'sudo', 'apt', 'apt-get', 'yum', 'dnf', 'pacman', 'brew', 'pkg', 'git', 'update', 'upgrade', 'install', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'chmod'],
    powershell: ['Get', 'Set', 'New', 'Remove', 'Install', 'Uninstall', 'Write', 'Read', 'If', 'Else', 'ForEach', 'While', 'Function', 'Return', 'winget'],
    json: ['true', 'false', 'null']
  };
  const kws = keywords[key];
  if (kws) {
    const re = new RegExp(`\\b(${kws.join('|')})\\b`, 'g');
    s = s.replace(re, '<span class="tok-kw">$1</span>');
  }

  s = s.replace(/\uE000T(\d+)Z\uE001/g, (_, i) => tokens[+i]);
  return s;
}

// ---------- HTML 高亮 ----------
function highlightHTML(code) {
  let s = code;
  const tokens = [];
  const store = (html) => {
    const id = `\uE000T${tokens.length}Z\uE001`;
    tokens.push(html);
    return id;
  };

  // 注释：&lt;!-- ... --&gt;
  s = s.replace(/&lt;!--[\s\S]*?--&gt;/g, m => store(`<span class="tok-comment">${m}</span>`));

  // 标签
  s = s.replace(
    /&lt;(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[a-zA-Z_:][a-zA-Z0-9_:.-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s&gt;]+))?)*)\s*(\/?)&gt;/g,
    (match, slash, tagName, attrs, selfClose) => {
      let attrHTML = '';
      if (attrs) {
        const attrRe = /(\s+)([a-zA-Z_:][a-zA-Z0-9_:.-]*)(\s*=\s*)("[^"]*"|'[^']*'|[^\s&gt;]+)?/g;
        let lastIdx = 0;
        let am;
        while ((am = attrRe.exec(attrs)) !== null) {
          attrHTML += attrs.slice(lastIdx, am.index);
          attrHTML += am[1];
          attrHTML += `<span class="tok-attr">${am[2]}</span>`;
          if (am[3]) attrHTML += am[3];
          if (am[4]) attrHTML += `<span class="tok-str">${am[4]}</span>`;
          lastIdx = am.index + am[0].length;
        }
        attrHTML += attrs.slice(lastIdx);
      }
      return `&lt;${slash}<span class="tok-tag">${tagName}</span>${attrHTML}${selfClose}&gt;`;
    }
  );

  s = s.replace(/\uE000T(\d+)Z\uE001/g, (_, i) => tokens[+i]);
  return s;
}

// ---------- CSS 高亮 ----------
function highlightCSS(code) {
  let s = code;
  const tokens = [];
  const store = (html) => {
    const id = `\uE000T${tokens.length}Z\uE001`;
    tokens.push(html);
    return id;
  };

  // 注释
  s = s.replace(/\/\*[\s\S]*?\*\//g, m => store(`<span class="tok-comment">${m}</span>`));
  // 字符串
  s = s.replace(/"[^"\n]*"/g, m => store(`<span class="tok-str">${m}</span>`));
  s = s.replace(/'[^'\n]*'/g, m => store(`<span class="tok-str">${m}</span>`));
  // at-rules
  s = s.replace(/@[a-zA-Z-]+/g, m => store(`<span class="tok-kw">${m}</span>`));
  // !important
  s = s.replace(/!important\b/g, m => store(`<span class="tok-kw">${m}</span>`));
  // 数字（含单位）
  s = s.replace(/\b(\d+(?:\.\d+)?)([a-zA-Z%]*)\b/g, (m, num, unit) => store(`<span class="tok-num">${num}${unit}</span>`));
  // 属性名（ident 后跟冒号）
  s = s.replace(/([a-zA-Z-]+)(\s*:)/g, (m, prop, colon) => `<span class="tok-attr">${prop}</span>${colon}`);

  s = s.replace(/\uE000T(\d+)Z\uE001/g, (_, i) => tokens[+i]);
  return s;
}

// ---------- 复制时去掉注释 ----------
export function stripComments(code, lang) {
  const l = String(lang).toLowerCase();
  const aliases = {
    javascript: 'js', ts: 'js', typescript: 'js',
    py: 'python',
    sh: 'bash', shell: 'bash', zsh: 'bash',
    ps: 'powershell', pwsh: 'powershell',
    htm: 'html', xml: 'html',
    scss: 'css', less: 'css'
  };
  const key = aliases[l] || l;

  if (['bash', 'python', 'yaml', 'yml', 'ini', 'conf'].includes(key)) {
    return code.split('\n')
      .map(line => {
        const idx = line.indexOf('#');
        return idx === -1 ? line : line.slice(0, idx).replace(/\s+$/, '');
      })
      .filter(line => line.trim() !== '')
      .join('\n');
  }
  if (['js', 'c', 'cpp', 'java', 'go', 'rust'].includes(key)) {
    const s = code.replace(/\/\*[\s\S]*?\*\//g, '');
    return s.split('\n')
      .map(line => {
        const idx = line.indexOf('//');
        return idx === -1 ? line : line.slice(0, idx).replace(/\s+$/, '');
      })
      .filter(line => line.trim() !== '')
      .join('\n');
  }
  if (key === 'css') {
    return code.replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter(line => line.trim() !== '')
      .join('\n');
  }
  if (key === 'html') {
    return code.replace(/<!--[\s\S]*?-->/g, '')
      .split('\n')
      .filter(line => line.trim() !== '')
      .join('\n');
  }
  return code;
}

// ---------- 复制动作 ----------
export async function copyCode(blockEl) {
  if (!blockEl) return;
  const encoded = blockEl.dataset.code || '';
  const lang = blockEl.dataset.lang || '';
  const escapedCode = decodeBase64(encoded);
  const rawCode = unescapeHTML(escapedCode);
  const cleaned = stripComments(rawCode, lang);

  let ok = false;
  try {
    await navigator.clipboard.writeText(cleaned);
    ok = true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = cleaned;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); ok = true; } catch {}
    document.body.removeChild(ta);
  }
  if (ok) showCopyFeedback(blockEl);
}

function showCopyFeedback(blockEl) {
  const btn = blockEl.querySelector('.wiki-code-copy');
  if (!btn) return;
  if (btn.dataset.feedback) return;
  btn.dataset.feedback = '1';
  const orig = btn.textContent;
  btn.textContent = '已复制';
  btn.classList.add('copied');
  setTimeout(() => {
    btn.textContent = orig;
    btn.classList.remove('copied');
    delete btn.dataset.feedback;
  }, 1500);
}

// ---------- 工具 ----------
function encodeBase64(str) {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    return '';
  }
}

function decodeBase64(b64) {
  try {
    return decodeURIComponent(escape(atob(b64)));
  } catch {
    return '';
  }
}

function unescapeHTML(str) {
  return String(str)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function escapeHTML(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------- 全局点击监听（只注册一次） ----------
if (typeof document !== 'undefined' && !window.__wikiCodeCopyBound) {
  window.__wikiCodeCopyBound = true;
  document.addEventListener('click', async (event) => {
    const btn = event.target.closest && event.target.closest('.wiki-code-copy');
    if (!btn) return;
    event.preventDefault();
    const block = btn.closest('.wiki-code-block');
    if (!block) return;
    await copyCode(block);
  });
}
