// decode.js – 解析带格式标记的文本为 HTML，支持\n换行

export function decodeRichText(input, baseFontSize = 16) {
  if (!input || typeof input !== 'string') return input;

  const blockRegex = /(\x27?)\{((?:\\.|[^{}])*)\}\1/g;

  let result = input.replace(blockRegex, (match, quote, content) => {
    if (quote === "'") {
      return escapeHTML(content);
    }
    const parsed = parseBlock(content, baseFontSize);
    if (!parsed) return escapeHTML(`{${content}}`);

    const { text, link, color, font, size } = parsed;
    const styles = [];
    if (color) styles.push(`color:${color}`);
    if (font) styles.push(`font-family:${font}`);
    if (size != null) {
      const min = baseFontSize * 0.35;
      const max = baseFontSize * 3;
      const clamped = Math.min(Math.max(size, min), max);
      styles.push(`font-size:${clamped.toFixed(1)}px`);
    }
    const styleAttr = styles.length > 0 ? ` style="${styles.join(';')}"` : '';
    const escapedText = escapeHTML(text);

    if (link) {
      return `<a href="${escapeAttr(link)}"${styleAttr}>${escapedText}</a>`;
    } else {
      return `<span${styleAttr}>${escapedText}</span>`;
    }
  });

  // 将剩余文本中的 \n 替换为 <br>
  result = result.replace(/\n/g, '<br>');
  return result;
}

function parseBlock(content, baseFontSize) {
  content = content.trim();

  // 1. 提取文本字符串
  const strMatch = content.match(/^"((?:\\.|[^"\\])*)"/);
  if (!strMatch) return null;
  let text = strMatch[1].replace(/\\(.)/g, '$1');
  let rest = content.substring(strMatch[0].length);

  // 2. 尝试提取 link (可选)
  let link = null;
  const linkMatch = rest.match(/^\s*\|\s*"link"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (linkMatch) {
    link = linkMatch[1].replace(/\\(.)/g, '$1');
    rest = rest.substring(linkMatch[0].length);
  }

  // 3. 提取其他属性（兼容有无逗号的情况）
  let color = null, font = null, size = null;
  rest = rest.replace(/^\s*\|\s*/, '');
  
  const propRegex = /^\s*,?\s*"(\w+)"\s*:\s*(?:"((?:\\.|[^"\\])*)"|([^,\s}]+))/;
  while (rest.length > 0) {
    const propMatch = rest.match(propRegex);
    if (!propMatch) break;
    const key = propMatch[1].toLowerCase();
    let rawValue = propMatch[2] !== undefined ? propMatch[2] : propMatch[3];
    rawValue = rawValue.trim();

    switch (key) {
      case 'color': color = resolveColor(rawValue); break;
      case 'font': font = rawValue; break;
      case 'size': size = parseSize(rawValue, baseFontSize); break;
    }
    rest = rest.substring(propMatch[0].length);
  }

  return { text, link, color, font, size };
}

function resolveColor(value) {
  const colors = {
    'c': '#7eef6d', 'un': '#ffe65d', 'r': '#4d52e3', 'e': '#861fde',
    'l': '#de1f1f', 'm': '#1fdbde', 'u': '#ff2b75', 's': '#2bffa3',
    'en': '#eeeeee', 'uq': '#555555'
  };
  const lower = value.toLowerCase();
  return colors[lower] || value;
}

function parseSize(value, base) {
  let num;
  if (/^[+-]/.test(value)) num = base + parseFloat(value);
  else num = parseFloat(value);
  return isNaN(num) ? null : num;
}

function escapeHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function escapeAttr(str) {
  return str.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
}