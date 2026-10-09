// template/code.js
//
// ═══════════════════════════════════════════════════════════════
//  用法
// ═══════════════════════════════════════════════════════════════
//
//   {{code|语言|"""代码内容"""}}
//
//   语言        显示在代码块左上角，同时决定语法高亮与去注释规则。
//               支持：bash/sh/zsh/shell、python/py、javascript/js、
//                     typescript/ts、html/htm/xml、css/scss/less、
//                     powershell/ps、json、yaml/yml/ini/conf，
//                     以及 c/cpp/java/go/rust（仅注释与字符串高亮）。
//               其他语言原样显示，不做高亮，也不删注释。
//
//   代码内容    用三个双引号包裹，允许换行。
//               首尾多余换行会被自动去掉。
//
// ═══════════════════════════════════════════════════════════════
//  示例
// ═══════════════════════════════════════════════════════════════
//
//   {{code|bash|"""sudo apt update
//   sudo apt install -y git"""}}
//
//   {{code|JavaScript|"""const x = 1; // 注释会被复制时去掉
//   console.log(x);"""}}
//
// ═══════════════════════════════════════════════════════════════
//  注意：内容中不能出现 """ 与 }}
// ═══════════════════════════════════════════════════════════════
//
//   代码本身不能包含三个连续的双引号，否则会被提前终止。
//   同理，内容里出现连续两个右花括号会被 wikiParser 的模板
//   匹配提前截断。需要字面 }} 时，请使用 HTML 实体 &#125;&#125;，
//   或拆成两段代码块。
//
// ═══════════════════════════════════════════════════════════════
//  实现说明
// ═══════════════════════════════════════════════════════════════
//
//   wikiParser 对 {{code|...}} 做了特殊处理，不走通用模板分发：
//     - 多行代码块在 parseWiki 主循环里被整体收集，保留换行
//     - 语法高亮由本文件的 highlight() 完成
//     - 复制按钮通过全局点击监听调用 copyCode()
//     - 复制时按语言剥离注释
//
//   由 wikiParser 特殊处理 {{code|lang|"""code"""}}，不走通用模板流程。

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
  try {
    return doHighlight(code, lang);
  } catch (e) {
    console.warn('[code] highlight failed:', e);
    return code;
  }
}

function doHighlight(code, lang) {
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

  let s = code;
  const tokens = [];
  const store = (html) => {
    const id = '\uE000T' + tokens.length + 'Z\uE001';
    tokens.push(html);
    return id;
  };

  // 1. 字符串
  s = s.replace(/"[^"\n]*"/g, m => store(`<span class="tok-str">${m}</span>`));
  s = s.replace(/'[^'\n]*'/g, m => store(`<span class="tok-str">${m}</span>`));
  s = s.replace(/`[^`\n]*`/g, m => store(`<span class="tok-str">${m}</span>`));

  // 2. 注释
  const bashLike = ['bash', 'python', 'yaml', 'yml', 'ini', 'conf'];
  const cLike = ['js', 'c', 'cpp', 'java', 'go', 'rust'];

  if (bashLike.includes(key)) {
    s = s.replace(/#[^\n]*/g, m => store(`<span class="tok-comment">${m}</span>`));
  } else if (cLike.includes(key)) {
    s = s.replace(/\/\*[\s\S]*?\*\//g, m => store(`<span class="tok-comment">${m}</span>`));
    s = s.replace(/\/\/[^\n]*/g, m => store(`<span class="tok-comment">${m}</span>`));
  }

  // 3. 数字（也走 store，避免破坏之前已存的占位符）
  s = s.replace(/\b(\d+(?:\.\d+)?)\b/g, m => store(`<span class="tok-num">${m}</span>`));

  // 4. 关键字（也走 store）
  const keywords = {
    js: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'new', 'this', 'async', 'await', 'try', 'catch', 'import', 'export', 'from', 'default', 'null', 'undefined', 'true', 'false'],
    python: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'import', 'from', 'lambda', 'yield', 'pass', 'raise', 'in', 'not', 'and', 'or', 'is', 'None', 'True', 'False', 'self'],
    bash: ['if', 'then', 'else', 'fi', 'for', 'in', 'do', 'done', 'while', 'case', 'esac', 'function', 'return', 'echo', 'cd', 'ls', 'pwd', 'export', 'source', 'alias', 'sudo', 'apt', 'apt-get', 'yum', 'dnf', 'pacman', 'brew', 'pkg', 'git', 'update', 'upgrade', 'install', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'chmod'],
    powershell: ['Get', 'Set', 'New', 'Remove', 'Install', 'Uninstall', 'Write', 'Read', 'If', 'Else', 'ForEach', 'While', 'Function', 'Return', 'winget'],
    json: ['true', 'false', 'null']
  };
  const kws = keywords[key];
  if (kws) {
    const re = new RegExp('\\b(' + kws.join('|') + ')\\b', 'g');
    s = s.replace(re, m => store(`<span class="tok-kw">${m}</span>`));
  }

  // 5. 恢复所有 token
  s = s.replace(/\uE000T(\d+)Z\uE001/g, (_, i) => tokens[+i]);

  return s;
}

// ---------- HTML 高亮 ----------
function highlightHTML(code) {
  let s = code;
  const tokens = [];
  const store = (html) => {
    const id = '\uE000T' + tokens.length + 'Z\uE001';
    tokens.push(html);
    return id;
  };

  // 注释 <!-- ... -->
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
      return store(`&lt;${slash}<span class="tok-tag">${tagName}</span>${attrHTML}${selfClose}&gt;`);
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
    const id = '\uE000T' + tokens.length + 'Z\uE001';
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
  // 属性名
  s = s.replace(/([a-zA-Z-]+)(\s*:)/g, (m, prop, colon) => store(`<span class="tok-attr">${prop}</span>${colon}`));

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
