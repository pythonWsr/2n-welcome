// main/wikiParser.js – 支持自定义模块的 MediaWiki 风格解析器
// 支持：标题、段落、列表、粗体、斜体、内部链接、外部链接、代码块、模块调用、安全 span/table 标签
// 特殊处理：{{code|lang|"""代码"""}} 作为块级元素，保留换行；多行 HTML 块（table/div/ul 等）原样输出
import { moduleMap } from '../module/index.js';
import { renderCodeBlock } from '../module/code.js';

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

  // 多行 HTML 块的起始标签（需要在段落前独立处理）
  const HTML_BLOCK_TAGS = ['table', 'div', 'section', 'article', 'figure', 'ul', 'ol', 'dl', 'blockquote', 'pre', 'aside', 'header', 'footer', 'nav', 'main'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ---------- 三反引号代码块 ----------
    if (line.trim().startsWith('```')) {
      flushParagraph();
      if (inCodeBlock) { flushCodeBlock(); inCodeBlock = false; }
      else { inCodeBlock = true; }
      continue;
    }
    if (inCodeBlock) { codeLines.push(line); continue; }

    // ---------- 4 空格缩进代码块 ----------
    if (/^\s{4}/.test(line)) {
      flushParagraph();
      codeLines.push(line.replace(/^\s{4}/, ''));
      if (!inCodeBlock) inCodeBlock = true;
      continue;
    } else {
      if (inCodeBlock) { flushCodeBlock(); inCodeBlock = false; }
    }

    // ---------- {{code|lang|"""..."""}} 多行代码模块 ----------
    const codeStart = line.match(/^\s*\{\{code\|([^|]+)\|"""(.*)$/);
    if (codeStart && !line.includes('"""}}')) {
      flushParagraph();
      const lang = codeStart[1];
      const parts = [codeStart[2]];
      while (i + 1 < lines.length && !lines[i + 1].includes('"""}}')) {
        i++;
        parts.push(lines[i]);
      }
      if (i + 1 < lines.length) {
        i++;
        const endIdx = lines[i].indexOf('"""}}');
        parts.push(lines[i].slice(0, endIdx));
      }
      while (parts.length && parts[0].trim() === '') parts.shift();
      while (parts.length && parts[parts.length - 1].trim() === '') parts.pop();
      blocks.push({ type: 'code-module', lang, code: parts.join('\n') });
      continue;
    }

    // ---------- 单行完整代码模块 ----------
    const singleCode = line.match(/^\s*\{\{code\|([^|]+)\|"""([\s\S]*?)"""\}\}\s*$/);
    if (singleCode) {
      flushParagraph();
      blocks.push({ type: 'code-module', lang: singleCode[1], code: singleCode[2] });
      continue;
    }

    // ---------- 多行 HTML 块（table / div / ul 等） ----------
    const htmlStart = line.match(new RegExp('^\\s*<(' + HTML_BLOCK_TAGS.join('|') + ')\\b', 'i'));
    if (htmlStart) {
      const tag = htmlStart[1].toLowerCase();
      const closeRe = new RegExp('</' + tag + '\\s*>', 'i');
      // 若同一行已闭合（例如 <ul><li>...</li></ul>），按普通段落处理
      if (!closeRe.test(line)) {
        flushParagraph();
        const parts = [line];
        let closed = false;
        while (i + 1 < lines.length) {
          i++;
          parts.push(lines[i]);
          if (closeRe.test(lines[i])) { closed = true; break; }
        }
        blocks.push({ type: 'html', content: parts.join('\n') });
        continue;
      }
    }

    // ---------- 空行 ----------
    if (line.trim() === '') { flushParagraph(); continue; }

    // ---------- 块级模块调用 ----------
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

    // ---------- 标题 ----------
    const headingMatch = line.match(/^(={2,6})\s*(.*?)\s*\1\s*$/);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length - 1;
      blocks.push({ type: 'heading', level: Math.min(level, 6), content: headingMatch[2] });
      continue;
    }

    // ---------- 无序列表 ----------
    if (/^\*+\s+/.test(line)) {
      flushParagraph();
      const indent = line.match(/^\*+/)[0].length;
      blocks.push({ type: 'ul', indent, content: line.replace(/^\*+\s+/, '') });
      continue;
    }

    // ---------- 有序列表 ----------
    if (/^#+\s+/.test(line)) {
      flushParagraph();
      const indent = line.match(/^#+/)[0].length;
      blocks.push({ type: 'ol', indent, content: line.replace(/^#+\s+/, '') });
      continue;
    }

    // ---------- 普通文本行 ----------
    currentParagraph.push(line);
  }

  flushParagraph();
  if (inCodeBlock) flushCodeBlock();

  return blocks.map(block => renderBlock(block)).join('');
}

function renderBlock(block) {
  switch (block.type) {
    case 'paragraph': {
      const rendered = renderInline(block.content);
      if (/^\s*<(div|pre|table|thead|tbody|tfoot|tr|td|th|caption|colgroup|col|ul|ol|li|dl|dt|dd|blockquote|section|article|aside|nav|figure|figcaption|header|footer|main|h[1-6]|hr|form|fieldset)\b/i.test(rendered)) {
        return rendered;
      }
      return `<p>${rendered}</p>`;
    }
    case 'heading': {
      const tag = `h${block.level}`;
      return `<${tag}>${renderInline(block.content)}</${tag}>`;
    }
    case 'ul':
    case 'ol':
      return renderList(block);
    case 'code':
      return `<pre><code>${escapeHTML(block.content)}</code></pre>`;
    case 'code-module':
      return renderCodeBlock(block.lang, escapeHTML(block.code));
    case 'html':
      // 多行 HTML 块直接输出（管理员编写，可信）
      return block.content;
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

  // <br>
  escaped = escaped.replace(/&lt;br\s*\/?&gt;/gi, '<br>');

  // 还原 <span>
  escaped = escaped.replace(/&lt;span(\s+[^&]*?)?&gt;/gi, (m, attrs) => safeTagReplacement(attrs, 'span'));
  escaped = escaped.replace(/&lt;\/span&gt;/gi, '</span>');

  // 还原表格标签
  escaped = escaped.replace(/&lt;table(\s+[^&]*?)?&gt;/gi, (m, attrs) => safeTagReplacement(attrs, 'table'));
  escaped = escaped.replace(/&lt;\/table&gt;/gi, '</table>');
  escaped = escaped.replace(/&lt;thead(\s+[^&]*?)?&gt;/gi, (m, attrs) => safeTagReplacement(attrs, 'thead'));
  escaped = escaped.replace(/&lt;\/thead&gt;/gi, '</thead>');
  escaped = escaped.replace(/&lt;tbody(\s+[^&]*?)?&gt;/gi, (m, attrs) => safeTagReplacement(attrs, 'tbody'));
  escaped = escaped.replace(/&lt;\/tbody&gt;/gi, '</tbody>');
  escaped = escaped.replace(/&lt;tr(\s+[^&]*?)?&gt;/gi, (m, attrs) => safeTagReplacement(attrs, 'tr'));
  escaped = escaped.replace(/&lt;\/tr&gt;/gi, '</tr>');
  escaped = escaped.replace(/&lt;th(\s+[^&]*?)?&gt;/gi, (m, attrs) => safeTagReplacement(attrs, 'th'));
  escaped = escaped.replace(/&lt;\/th&gt;/gi, '</th>');
  escaped = escaped.replace(/&lt;td(\s+[^&]*?)?&gt;/gi, (m, attrs) => safeTagReplacement(attrs, 'td'));
  escaped = escaped.replace(/&lt;\/td&gt;/gi, '</td>');

  // 内联代码模块
  escaped = escaped.replace(
    /\{\{code\|([^|]+)\|"""([\s\S]*?)"""\}\}/g,
    (match, lang, codeContent) => renderCodeBlock(lang, codeContent)
  );

  // 粗斜体
  escaped = escaped.replace(/'''''(.*?)'''''/g, '<strong><em>$1</em></strong>');
  escaped = escaped.replace(/'''(.*?)'''/g, '<strong>$1</strong>');
  escaped = escaped.replace(/''(.*?)''/g, '<em>$1</em>');

  // 通用模块
  escaped = escaped.replace(/\{\{([a-zA-Z0-9_]+)\|(.+?)\}\}/g, (match, moduleName, paramStr) => {
    const moduleDef = moduleMap[moduleName];
    if (!moduleDef || moduleDef.isBlock) return match;
    return moduleDef.render(parseParams(paramStr));
  });

  // 内部链接
  escaped = escaped.replace(/\[\[([^\[\]|]+)(?:\|([^\[\]]+))?\]\]/g, (match, page, display) => {
    const target = page.trim();
    const text = display ? display.trim() : target;
    return `<a href="#" data-wiki-page="${target}">${escapeHTML(text)}</a>`;
  });

  // 外部链接
  escaped = escaped.replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g, (match, url, text) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${escapeHTML(text)}</a>`;
  });

  // 裸 URL
  escaped = escaped.replace(/(?<!["'>])(https?:\/\/[^\s<]+)/g, (match) => {
    return `<a href="${match}" target="_blank" rel="noopener noreferrer">${match}</a>`;
  });

  return escaped;
}

function safeTagReplacement(attrs, tagName) {
  if (!attrs) return `<${tagName}>`;
  const safeAttrs = [];
  const classMatch = attrs.match(/class\s*=\s*"([^"]*)"/i);
  const styleMatch = attrs.match(/style\s*=\s*"([^"]*)"/i);
  if (classMatch && !/[<>]/.test(classMatch[1])) safeAttrs.push(`class="${classMatch[1]}"`);
  if (styleMatch && !/[<>]/.test(styleMatch[1])) safeAttrs.push(`style="${styleMatch[1]}"`);
  return safeAttrs.length ? `<${tagName} ${safeAttrs.join(' ')}>` : `<${tagName}>`;
}

function parseParams(paramStr) {
  return paramStr.split('|').map(p => p.trim());
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
