// main/markdownParser.js – 轻量级 Markdown 解析器
// 用法：
//   import { parseMarkdown } from './markdownParser.js';
//   const html = parseMarkdown(mdText);

export function parseMarkdown(text) {
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

    // 代码块 ``` 或 ~~~
    if (/^\s*```/.test(line) || /^\s*~~~/.test(line)) {
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
    // 四空格缩进代码块
    if (/^\s{4}/.test(line)) {
      flushParagraph();
      codeLines.push(line.replace(/^\s{4}/, ''));
      if (!inCodeBlock) inCodeBlock = true;
      continue;
    } else if (inCodeBlock) {
      flushCodeBlock();
      inCodeBlock = false;
    }

    // 空行
    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    // 水平线
    if (/^\s*([-*_])\s*\1\s*\1\s*$/.test(line)) {
      flushParagraph();
      blocks.push({ type: 'hr' });
      continue;
    }

    // 标题
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length;
      blocks.push({ type: 'heading', level, content: headingMatch[2] });
      continue;
    }

    // 引用
    if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      blocks.push({ type: 'quote', content: line.replace(/^\s*>\s?/, '') });
      continue;
    }

    // 无序列表 -  * + 
    if (/^\s*[-*+]\s+/.test(line)) {
      flushParagraph();
      blocks.push({ type: 'ul', content: line.replace(/^\s*[-*+]\s+/, '') });
      continue;
    }

    // 有序列表 1. 2. 
    if (/^\s*\d+\.\s+/.test(line)) {
      flushParagraph();
      blocks.push({ type: 'ol', content: line.replace(/^\s*\d+\.\s+/, '') });
      continue;
    }

    // 普通段落
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
      return `<h${block.level}>${renderInline(block.content)}</h${block.level}>`;
    case 'code':
      return `<pre><code>${escapeHTML(block.content)}</code></pre>`;
    case 'quote':
      return `<blockquote>${renderInline(block.content)}</blockquote>`;
    case 'ul':
      return `<ul><li>${renderInline(block.content)}</li></ul>`;
    case 'ol':
      return `<ol><li>${renderInline(block.content)}</li></ol>`;
    case 'hr':
      return '<hr>';
    default:
      return '';
  }
}

function renderInline(text) {
  let escaped = escapeHTML(text);

  // 行内代码 `code`
  escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 图片 ![alt](url)
  escaped = escaped.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    return `<img src="${src}" alt="${escapeHTML(alt)}" style="max-width:100%;">`;
  });

  // 链接 [text](url)
  escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${escapeHTML(text)}</a>`;
  });

  // 裸 URL 自动链接
  escaped = escaped.replace(/(?<!["'>])(https?:\/\/[^\s<]+)/g, (match) => {
    return `<a href="${match}" target="_blank" rel="noopener noreferrer">${match}</a>`;
  });

  // 粗斜体 ***text*** 或 __text__
  escaped = escaped.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  escaped = escaped.replace(/___(.*?)___/g, '<strong><em>$1</em></strong>');
  // 粗体 **text** 或 __text__
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  escaped = escaped.replace(/__(.*?)__/g, '<strong>$1</strong>');
  // 斜体 *text* 或 _text_
  escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
  escaped = escaped.replace(/_(.*?)_/g, '<em>$1</em>');

  // 删除线 ~~text~~
  escaped = escaped.replace(/~~(.*?)~~/g, '<del>$1</del>');

  return escaped;
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
