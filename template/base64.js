// template/base64.js
//
// ═══════════════════════════════════════════════════════════════
//  用法
// ═══════════════════════════════════════════════════════════════
//
//   {{base64|encode|内容}}
//   {{base64|decode|Base64 字符串}}
//
//   encode   把内容编码为 Base64。支持 UTF-8（中文、emoji 等）。
//
//   decode   把 Base64 字符串解码为原文。
//            输入不合法时显示原文，并加红色虚线标记，鼠标悬停
//            可看到提示。
//
// ═══════════════════════════════════════════════════════════════
//  示例
// ═══════════════════════════════════════════════════════════════
//
//   {{base64|encode|你好，世界}}         → 5L2g5aW977yM5LiW55WM
//   {{base64|decode|5L2g5aW977yM5LiW55WM}} → 你好，世界
//   {{base64|decode|not_valid}}          → not_valid（红色标记）
//
// ═══════════════════════════════════════════════════════════════
//  注意：内容中不能出现 }} 与 |
// ═══════════════════════════════════════════════════════════════
//
//   与其它模板一致，内容里出现连续两个右花括号会被提前截断。
//   内容中的 | 会被 wikiParser 当作参数分隔符，需避免。
//   Base64 字母表本身不含这两个字符，因此 decode 时通常无碍；
//   encode 的输入若含 | 或 }}，请用 HTML 实体或拆分。
//
// ═══════════════════════════════════════════════════════════════
//  实现说明
// ═══════════════════════════════════════════════════════════════
//
//   同步模板，不依赖外部库。wikiParser 单独用正则匹配，
//   不走通用模板分发，因此内容可以含 | （但仍不能含 }}）。

function encodeBase64(str) {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    return '';
  }
}

function decodeBase64(str) {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch {
    return null;
  }
}

function escapeHTML(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------- 对外：生成 HTML ----------
export function renderBase64(mode, content) {
  const m = mode === 'decode' ? 'decode' : 'encode';

  if (m === 'encode') {
    const out = encodeBase64(content);
    return `<span class="wiki-base64" data-mode="encode">${escapeHTML(out)}</span>`;
  }

  const out = decodeBase64(content.trim());
  if (out === null) {
    return `<span class="wiki-base64 wiki-base64-error" title="无效的 Base64 输入">${escapeHTML(content)}</span>`;
  }
  return `<span class="wiki-base64" data-mode="decode">${escapeHTML(out)}</span>`;
}

// ---------- 通用模板接口（占位，避免被 wikiParser 通用正则误伤）----------
export default {
  name: 'base64',
  isBlock: false,
  render() { return ''; }
};
