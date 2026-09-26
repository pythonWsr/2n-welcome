// main/wikiParser.js – 支持自定义模块的 MediaWiki 风格解析器
// 支持：标题、段落、列表、粗体、斜体、内部链接、外部链接、代码块、模块调用（支持嵌套）、安全 span/table 标签
import { moduleMap } from '../module/index.js';

export function parseWiki(text) {
  if (!text) return '';

  const lines = text.split('\n');
  const blocks = [];
  let currentParagraph = [];
  let inCodeBlock = false;
  let codeLines = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      blocks.push({ type: 'paragraph', content: currentParagraph.join(' ') });
      currentParagraph = [];
    }
  };

  const flushCodeBlock = () => {
    if (codeLines.length > 0) {
      blocks.push({ type: 'code', content: codeLines.join('\n') });
      codeLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 代码块
    if (line.trim().startsWith('```')) {
      flushParagraph();
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }
    if (/^\s{4}/.test(line)) {
      flushParagraph();
      codeLines.push(line.replace(/^\s{4}/, ''));
      if (!inCodeBlock) inCodeBlock = true;
      continue;
    } else {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      }
    }

    // 空行结束段落
    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    // 块级模块调用（整行，支持嵌套）
    const blockModule = tryParseFullModule(line);
    if (blockModule && blockModule.moduleDef.isBlock) {
      flushParagraph();
      const html = blockModule.moduleDef.render(blockModule.params);
      if (html) blocks.push({ type: 'raw', html });
      continue;
    }

    // 标题
    const headingMatch = line.match(/^(={2,6})\s*(.*?)\s*\1\s*$/);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length - 1;
      const content = headingMatch[2];
      blocks.push({ type: 'heading', level: Math.min(level, 6), content });
      continue;
    }

    // 无序列表
    if (/^\*+\s+/.test(line)) {
      flushParagraph();
      const indent = line.match(/^\*+/)[0].length;
      const content = line.replace(/^\*+\s+/, '');
      blocks.push({ type: 'ul', indent, content });
      continue;
    }

    // 有序列表
    if (/^#+\s+/.test(line)) {
      flushParagraph();
      const indent = line.match(/^#+/)[0].length;
      const content = line.replace(/^#+\s+/, '');
      blocks.push({ type: 'ol', indent, content });
      continue;
    }

    // 普通段落行
    currentParagraph.push(line);
  }

  flushParagraph();
  if (inCodeBlock) flushCodeBlock();

  return blocks.map(block => renderBlock(block)).join('');
}

function renderBlock(block) {
  switch (block.type) {
    case 'paragraph':
      return `<p>${renderInline(block.content)}</p>`;
    case 'heading': {
      const tag = `h${block.level}`;
      return `<${tag}>${renderInline(block.content)}</${tag}>`;
    }
    case 'ul':
    case 'ol':
      return renderList(block);
    case 'code':
      return `<pre><code>${escapeHTML(block.content)}</code></pre>`;
    case 'raw':
      return block.html;
    default:
      return '';
  }
}

function renderList(block) {
  const tag = block.type === 'ul' ? 'ul' : 'ol';
  const indent = block.indent || 1;
  const paddingLeft = indent * 20;
  return `<${tag} style="padding-left:${paddingLeft}px;"><li>${renderInline(block.content)}</li></${tag}>`;
}

function renderInline(text) {
  let out = escapeHTML(text);

  // 1) 还原行内换行
  out = out.replace(/&lt;br\s*\/?&gt;/gi, '<br>');

  // 2) 还原安全 HTML 标签（span / table 系）
  out = restoreSafeTag(out, 'span');
  out = restoreSafeTag(out, 'table');
  out = restoreSafeTag(out, 'thead');
  out = restoreSafeTag(out, 'tbody');
  out = restoreSafeTag(out, 'tr');
  out = restoreSafeTag(out, 'th');
  out = restoreSafeTag(out, 'td');

  // 3) 粗斜体、粗体、斜体（使模块参数中的标记能生效）
  out = out.replace(/'''''(.*?)'''''/g, '<strong><em>$1</em></strong>');
  out = out.replace(/'''(.*?)'''/g, '<strong>$1</strong>');
  out = out.replace(/''(.*?)''/g, '<em>$1</em>');

  // 4) 模块调用（支持嵌套）
  out = renderModules(out, false);

  // 5) 内部链接 [[页面名|显示文本]]
  out = out.replace(/\[\[([^\[\]|]+)(?:\|([^\[\]]+))?\]\]/g, (match, page, display) => {
    const target = page.trim();
    const label = display ? display.trim() : target;
    return `<a href="#" data-wiki-page="${target}">${escapeHTML(label)}</a>`;
  });

  // 6) 外部链接 [https://example.com 显示文本]
  out = out.replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g, (match, url, label) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${escapeHTML(label)}</a>`;
  });

  // 7) 裸 URL 自动链接
  out = out.replace(/(?<!["'>])(https?:\/\/[^\s<]+)/g, (match) => {
    return `<a href="${match}" target="_blank" rel="noopener noreferrer">${match}</a>`;
  });

  return out;
}

// ============ 安全 HTML 标签还原 ============

function restoreSafeTag(text, tagName) {
  const openRe = new RegExp(`&lt;${tagName}(\\s+[^&]*?)?&gt;`, 'gi');
  const closeRe = new RegExp(`&lt;/${tagName}&gt;`, 'gi');
  text = text.replace(openRe, (match, attrs) => safeTagReplacement(attrs, tagName));
  text = text.replace(closeRe, `</${tagName}>`);
  return text;
}

// 只允许 class 和 style，值里不能包含 < >
function safeTagReplacement(attrs, tagName) {
  if (!attrs) return `<${tagName}>`;
  const safeAttrs = [];
  const classMatch = attrs.match(/class\s*=\s*"([^"]*)"/i);
  const styleMatch = attrs.match(/style\s*=\s*"([^"]*)"/i);
  if (classMatch && !/[<>]/.test(classMatch[1])) {
    safeAttrs.push(`class="${classMatch[1]}"`);
  }
  if (styleMatch && !/[<>]/.test(styleMatch[1])) {
    safeAttrs.push(`style="${styleMatch[1]}"`);
  }
  return safeAttrs.length ? `<${tagName} ${safeAttrs.join(' ')}>` : `<${tagName}>`;
}

// ============ 模块解析（支持嵌套） ============

// 深度扫描 {{...}}，只处理指定类型的模块（includeBlock 为 false 时跳过块级模块）
function renderModules(text, includeBlock) {
  let result = '';
  let i = 0;
  const len = text.length;
  while (i < len) {
    if (text[i] === '{' && text[i + 1] === '{') {
      let depth = 1;
      let j = i + 2;
      while (j < len && depth > 0) {
        if (text[j] === '{' && text[j + 1] === '{') { depth++; j += 2; }
        else if (text[j] === '}' && text[j + 1] === '}') {
          depth--;
          if (depth === 0) break;
          j += 2;
        } else j++;
      }
      if (depth === 0) {
        const inner = text.slice(i + 2, j);
        const parts = splitTopLevel(inner, '|');
        const moduleName = parts[0].trim();
        const moduleDef = moduleMap[moduleName];
        if (moduleDef && (includeBlock || !moduleDef.isBlock)) {
          // 递归处理每个参数（使嵌套模块先渲染）
          const params = parts.slice(1).map(p => renderModules(p.trim(), includeBlock));
          result += moduleDef.render(params);
          i = j + 2;
          continue;
        }
      }
    }
    result += text[i];
    i++;
  }
  return result;
}

// 在括号深度为 0 的层级按 delimiter 切分（忽略 {{...}} 内部的 delimiter）
function splitTopLevel(text, delimiter) {
  const parts = [];
  let current = '';
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '{' && text[i + 1] === '{') { depth++; current += '{{'; i++; }
    else if (c === '}' && text[i + 1] === '}') { depth--; current += '}}'; i++; }
    else if (c === delimiter && depth === 0) { parts.push(current); current = ''; }
    else current += c;
  }
  parts.push(current);
  return parts;
}

// 判断整行是否是一个完整的模块调用（支持嵌套），返回 { moduleDef, params } 或 null
function tryParseFullModule(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{{') || !trimmed.endsWith('}}')) return null;
  // 校验括号完全配对，且最外层 }} 恰好落在结尾
  let depth = 0;
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '{' && trimmed[i + 1] === '{') { depth++; i++; }
    else if (trimmed[i] === '}' && trimmed[i + 1] === '}') {
      depth--; i++;
      if (depth === 0 && i !== trimmed.length - 1) return null;
    }
  }
  if (depth !== 0) return null;

  const inner = trimmed.slice(2, -2);
  const parts = splitTopLevel(inner, '|');
  const moduleName = parts[0].trim();
  const moduleDef = moduleMap[moduleName];
  if (!moduleDef) return null;
  const params = parts.slice(1).map(p => renderModules(p.trim(), true));
  return { moduleDef, params };
}

// ============ 工具函数 ============

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // 注意：不转义双引号，否则带属性的 HTML 标签无法还原
}
