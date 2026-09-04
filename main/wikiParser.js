// main/wikiParser.js – 支持自定义模块的 MediaWiki 风格解析器
// 支持：标题、段落、列表、粗体、斜体、内部链接、外部链接、代码块、模块调用
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

    // 代码块处理
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

    // 模块调用（单独一行且为块级模块）
    const moduleMatch = line.match(/^\s*\{\{([a-zA-Z0-9_]+)\|(.+?)\}\}\s*$/);
    if (moduleMatch) {
      const moduleName = moduleMatch[1];
      const moduleDef = moduleMap[moduleName];
      if (moduleDef && moduleDef.isBlock) {
        flushParagraph();
        const params = parseParams(moduleMatch[2]);
        const html = moduleDef.render(params);
        if (html) blocks.push({ type: 'raw', html });
        continue;
      }
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

    // 普通文本行
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
    case 'heading':
      const tag = `h${block.level}`;
      return `<${tag}>${renderInline(block.content)}</${tag}>`;
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
  let escaped = escapeHTML(text);

  // 模块调用（内联模块）
  escaped = escaped.replace(/\{\{([a-zA-Z0-9_]+)\|(.+?)\}\}/g, (match, moduleName, paramStr) => {
    const moduleDef = moduleMap[moduleName];
    if (!moduleDef || moduleDef.isBlock) return match; // 块级模块不在此处理
    const params = parseParams(paramStr);
    return moduleDef.render(params);
  });

  // 内部链接 [[页面名|显示文本]]
  escaped = escaped.replace(/\[\[([^\[\]|]+)(?:\|([^\[\]]+))?\]\]/g, (match, page, display) => {
    const target = page.trim();
    const text = display ? display.trim() : target;
    return `<a href="#" data-wiki-page="${target}">${escapeHTML(text)}</a>`;
  });

  // 外部链接 [https://example.com 显示文本]
  escaped = escaped.replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g, (match, url, text) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${escapeHTML(text)}</a>`;
  });

  // 裸 URL 自动链接
  escaped = escaped.replace(/(?<!["'>])(https?:\/\/[^\s<]+)/g, (match) => {
    return `<a href="${match}" target="_blank" rel="noopener noreferrer">${match}</a>`;
  });

  // 粗斜体 '''''text'''''
  escaped = escaped.replace(/'''''(.*?)'''''/g, '<strong><em>$1</em></strong>');
  // 粗体 '''text'''
  escaped = escaped.replace(/'''(.*?)'''/g, '<strong>$1</strong>');
  // 斜体 ''text''
  escaped = escaped.replace(/''(.*?)''/g, '<em>$1</em>');

  return escaped;
}

function parseParams(paramStr) {
  // 简单的参数分割，以 '|' 分隔，并去除首尾空格
  return paramStr.split('|').map(p => p.trim());
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
