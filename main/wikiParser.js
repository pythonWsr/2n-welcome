// main/wikiParser.js
//
// ═══════════════════════════════════════════════════════════════
//  MediaWiki 风格解析器（template 版）
// ═══════════════════════════════════════════════════════════════
//
//  支持：
//    标题            == 标题 ==  /  === 标题 ===
//    段落            空行分隔
//    无序列表        * 项
//    有序列表        # 项
//    粗体            '''text'''
//    斜体            ''text''
//    粗斜体          '''''text'''''
//    内部链接        [[页面|显示]]
//    外部链接        [https://example.com 文本]
//    裸 URL          自动链接
//    行内 HTML       <br>、<span class/style>、<table...> 等安全标签
//    代码块          ``` 围栏 / 4 空格缩进 / {{code|lang|"""..."""}}
//    块级模板        {{table|...}}、{{media|...}}、{{fold|...}}
//    行内模板        {{color|...}}、{{latex|...}}、{{base64|...}}
//
//  模板定义见 ../template/index.js
//
// ═══════════════════════════════════════════════════════════════

import { templateMap } from '../template/index.js';
import { renderCodeBlock } from '../template/code.js';
import { renderLatex } from '../template/latex.js';
import { renderBase64 } from '../template/base64.js';
import { renderFold } from '../template/fold.js';

// ─────────────────────────────────────────────────────────────
//  公共入口
// ─────────────────────────────────────────────────────────────
export function parseWiki(text) {
  if (!text) return '';

  // <br> 紧跟 * 或 # 时，替换为真实换行（让列表识别生效）
  text = text.replace(/<br\s*\/?>\s*(?=[*#]\s)/gi, '\n');

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

  const HTML_BLOCK_TAGS = [
    'table', 'div', 'section', 'article', 'figure', 'ul', 'ol', 'dl',
    'blockquote', 'pre', 'aside', 'header', 'footer', 'nav', 'main'
  ];

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

    // ---------- {{code|lang|"""..."""}} 多行 ----------
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

    // ---------- {{code|lang|"""..."""}} 单行 ----------
    const singleCode = line.match(/^\s*\{\{code\|([^|]+)\|"""([\s\S]*?)"""\}\}\s*$/);
    if (singleCode) {
      flushParagraph();
      blocks.push({ type: 'code-module', lang: singleCode[1], code: singleCode[2] });
      continue;
    }

    // ---------- 块级模板（平衡计数） ----------
    const blockModMatch = line.match(/^\s*\{\{([a-zA-Z0-9_]+)\|/);
    if (blockModMatch) {
      const modName = blockModMatch[1];
      const modDef = templateMap[modName];
      if (modDef && modDef.isBlock) {
        const collected = collectUntilBalanced(lines, i);
        if (collected) {
          i = collected.endLine;
          flushParagraph();
          const html = dispatchBlock(modName, collected.text);
          if (html) blocks.push({ type: 'raw', html });
          // 同一行 fold 之后若还有文字，作为新行继续处理
          if (collected.rest.trim()) {
            currentParagraph.push(collected.rest);
          }
          continue;
        }
      }
    }

    // ---------- 多行 HTML 块 ----------
    const htmlStart = line.match(
      new RegExp('^\\s*<(' + HTML_BLOCK_TAGS.join('|') + ')\\b', 'i')
    );
    if (htmlStart) {
      const tag = htmlStart[1].toLowerCase();
      const closeRe = new RegExp('</' + tag + '\\s*>', 'i');
      if (!closeRe.test(line)) {
        flushParagraph();
        const parts = [line];
        while (i + 1 < lines.length) {
          i++;
          parts.push(lines[i]);
          if (closeRe.test(lines[i])) break;
        }
        blocks.push({ type: 'html', content: parts.join('\n') });
        continue;
      }
    }

    // ---------- 空行 ----------
    if (line.trim() === '') { flushParagraph(); continue; }

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

    // ---------- 普通文本 ----------
    currentParagraph.push(line);
  }

  flushParagraph();
  if (inCodeBlock) flushCodeBlock();

  return blocks.map(block => renderBlock(block)).join('');
}

// ─────────────────────────────────────────────────────────────
//  块级模板的平衡计数收集
// ─────────────────────────────────────────────────────────────
// 从 lines[startLine] 开始，收集所有行直到 {{...}} 平衡。
// 返回 { text, rest, endLine } 或 null（未闭合）。
function collectUntilBalanced(lines, startLine) {
  let acc = lines[startLine];
  let startPos = acc.indexOf('{{');
  if (startPos === -1) return null;

  let endPos = findMatchingClose(acc, startPos);
  let endLine = startLine;
  while (endPos === -1 && endLine + 1 < lines.length) {
    endLine++;
    acc += '\n' + lines[endLine];
    endPos = findMatchingClose(acc, startPos);
  }
  if (endPos === -1) return null;

  return {
    text: acc.slice(startPos, endPos),
    rest: acc.slice(endPos),
    endLine,
  };
}

// 从 text[start] 处的 '{{' 开始，找到与之匹配的 '}}' 结束位置（不含）
function findMatchingClose(text, start) {
  if (text[start] !== '{' || text[start + 1] !== '{') return -1;
  let depth = 0;
  let i = start;
  while (i < text.length - 1) {
    const c = text[i], n = text[i + 1];
    if (c === '{' && n === '{') { depth++; i += 2; continue; }
    if (c === '}' && n === '}') {
      depth--;
      if (depth === 0) return i + 2;
      i += 2;
      continue;
    }
    i++;
  }
  return -1;
}

// 顶层分割：只在不处于 {{...}} 内的位置按 sep 切
function splitTop(text, sep) {
  const parts = [];
  let current = '';
  let depth = 0;
  let i = 0;
  while (i < text.length) {
    if (text[i] === '{' && text[i + 1] === '{') {
      depth++; current += '{{'; i += 2; continue;
    }
    if (text[i] === '}' && text[i + 1] === '}') {
      depth--; current += '}}'; i += 2; continue;
    }
    if (depth === 0 && text[i] === sep) {
      parts.push(current); current = ''; i++; continue;
    }
    current += text[i]; i++;
  }
  parts.push(current);
  return parts;
}

// ─────────────────────────────────────────────────────────────
//  块级模板分发
// ─────────────────────────────────────────────────────────────
// tmplText 形如 "{{name|param1|param2|...}}"
function dispatchBlock(name, tmplText) {
  const inner = tmplText.slice(2, -2); // 去掉 {{ }}
  const firstPipe = inner.indexOf('|');
  if (firstPipe === -1) return '';
  const paramStr = inner.slice(firstPipe + 1);

  // fold：需要递归解析内容
  if (name === 'fold') {
    const parts = splitTop(paramStr, '|');
    if (parts.length < 4) return '';
    const type = parts[0].trim();
    const num = parts[1].trim();
    const state = parts[2].trim();
    const content = parts.slice(3).join('|');
    const innerHtml = parseWiki(content);
    return renderFold(type, num, state, innerHtml);
  }

  // 其他块级模板：查 templateMap
  const modDef = templateMap[name];
  if (!modDef || !modDef.isBlock) return '';

  if (modDef.rawParams) {
    return modDef.render(paramStr) || '';
  }
  return modDef.render(paramStr.split('|').map(p => p.trim())) || '';
}

// ─────────────────────────────────────────────────────────────
//  块级渲染
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
//  行内渲染
// ─────────────────────────────────────────────────────────────
function renderInline(text) {
  let escaped = escapeHTML(text);

  // <br>
  escaped = escaped.replace(/&lt;br\s*\/?&gt;/gi, '<br>');

  // <span>
  escaped = escaped.replace(/&lt;span(\s+[^&]*?)?&gt;/gi, (m, a) => safeTagReplacement(a, 'span'));
  escaped = escaped.replace(/&lt;\/span&gt;/gi, '</span>');

  // 表格相关标签
  const tags = ['table','thead','tbody','tr','th','td'];
  for (const t of tags) {
    const re = new RegExp('&lt;' + t + '(\\s+[^&]*?)?&gt;', 'gi');
    escaped = escaped.replace(re, (m, a) => safeTagReplacement(a, t));
    escaped = escaped.replace(new RegExp('&lt;/' + t + '&gt;', 'gi'), `</${t}>`);
  }

  // 内联代码模板
  escaped = escaped.replace(
    /\{\{code\|([^|]+)\|"""([\s\S]*?)"""\}\}/g,
    (m, lang, codeContent) => renderCodeBlock(lang, codeContent)
  );

  // latex 模板
  escaped = escaped.replace(
    /\{\{latex\|(strict|loose)\|([\s\S]*?)\}\}/g,
    (m, mode, formula) => {
      const raw = formula
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
      return renderLatex(mode, raw);
    }
  );

  // base64 模板
  escaped = escaped.replace(
    /\{\{base64\|(encode|decode)\|([\s\S]*?)\}\}/g,
    (m, mode, content) => {
      const raw = content
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
      return renderBase64(mode, raw);
    }
  );

  // 粗斜体、粗体、斜体
  escaped = escaped.replace(/'''''(.*?)'''''/g, '<strong><em>$1</em></strong>');
  escaped = escaped.replace(/'''(.*?)'''/g, '<strong>$1</strong>');
  escaped = escaped.replace(/''(.*?)''/g, '<em>$1</em>');

  // 通用行内模板（如 color）
  escaped = escaped.replace(/\{\{([a-zA-Z0-9_]+)\|(.+?)\}\}/g, (m, name, paramStr) => {
    const modDef = templateMap[name];
    if (!modDef || modDef.isBlock) return m;
    return modDef.render(paramStr.split('|').map(p => p.trim()));
  });

  // 内部链接
  escaped = escaped.replace(/\[\[([^\[\]|]+)(?:\|([^\[\]]+))?\]\]/g, (m, page, display) => {
    const target = page.trim();
    const text = display ? display.trim() : target;
    return `<a href="#" data-wiki-page="${target}">${escapeHTML(text)}</a>`;
  });

  // 外部链接
  escaped = escaped.replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g, (m, url, text) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${escapeHTML(text)}</a>`;
  });

  // 裸 URL
  escaped = escaped.replace(/(?<!["'>])(https?:\/\/[^\s<]+)/g, (m) => {
    return `<a href="${m}" target="_blank" rel="noopener noreferrer">${m}</a>`;
  });

  return escaped;
}

// ─────────────────────────────────────────────────────────────
//  工具
// ─────────────────────────────────────────────────────────────
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

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // 注意：不转义双引号，避免影响标签属性还原
}
