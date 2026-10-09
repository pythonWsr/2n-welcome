// template/table.js
//
// ═══════════════════════════════════════════════════════════════
//  用法
// ═══════════════════════════════════════════════════════════════
//
//   多行写法（推荐）：
//     {{table|表头1,表头2,表头3
//     行1列1,行1列2,行1列3
//     行2列1,行2列2,行2列3}}
//
//   单行写法（兼容）：
//     {{table|表头1,表头2,表头3| 行1列1,行1列2,行1列3| 行2列1,...}}
//
//   行分隔    换行 \n 或 | （两者等价）
//   列分隔    逗号 ,
//   表头      第一行
//   数据行    其余行
//
// ═══════════════════════════════════════════════════════════════
//  单元格内联支持
// ═══════════════════════════════════════════════════════════════
//
//   {{color|#xxx|文本}}               单色文本
//   {{color|#xxx|#yyy|文本}}          带背景色的文本
//   '''粗体'''                        加粗
//   ''斜体''                          斜体
//
//   可组合使用，例如：
//     {{color|#555555|'''q'''}}
//   会渲染为灰色加粗的 "q"。
//
// ═══════════════════════════════════════════════════════════════
//  示例
// ═══════════════════════════════════════════════════════════════
//
//   {{table|序号,玩家,q花瓣,锻造时间
//   1,{{color|#555555|'''q'''}},Champion's Crown,
//   2,{{color|#555555|'''0irrolf'''}},q Coin,2026.8.18
//   3,{{color|#555555|'''physical37'''}},q Coin,2026.8.22}}
//
// ═══════════════════════════════════════════════════════════════
//  注意：内容中不能出现 }}
// ═══════════════════════════════════════════════════════════════
//
//   单元格文本中若含 | 会被当作行分隔符，请避免。
//   连续两个右花括号会被 wikiParser 的模板匹配提前截断，
//   需要字面 }} 时，请使用 HTML 实体 &#125;&#125;。
//
// ═══════════════════════════════════════════════════════════════
//  实现说明
// ═══════════════════════════════════════════════════════════════
//
//   本模板为块级模板，rawParams: true 表示 wikiParser 传入的是
//   完整参数字符串（不做 | 分割），由模板自行控制顶层切分。
//
//   splitTop() 是"深度感知"的分割函数：只在不在 {{...}} 内部时
//   才按分隔符切分，因此单元格里的 {{color|...}} 不会被误切。
//
//   renderCell() 对单元格内容先做 HTML 转义，再单独处理 color /
//   粗体 / 斜体这三种内联标记。因此单元格内的 < > & 是安全的，
//   不会破坏表格结构。

export default {
  name: 'table',
  isBlock: true,
  rawParams: true,
  render(rawContent) {
    // 按顶层（不在 {{...}} 内）的 \n 或 | 切分为行
    const lines = splitTop(rawContent, ['\n', '|'])
      .map(l => l.trim())
      .filter(l => l !== '');

    if (!lines.length) return '';

    const headers = splitTop(lines[0], [',']).map(c => c.trim());
    const rows = lines.slice(1).map(line =>
      splitTop(line, [',']).map(c => c.trim())
    );

    let html = '<table class="wiki-table"><thead><tr>';
    headers.forEach(h => {
      html += `<th>${renderCell(h)}</th>`;
    });
    html += '</tr></thead><tbody>';
    rows.forEach(row => {
      html += '<tr>';
      row.forEach(cell => {
        html += `<td>${renderCell(cell)}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }
};

// ---------- 顶层分割：跳过 {{...}} 内部 ----------
function splitTop(text, separators) {
  const result = [];
  let current = '';
  let depth = 0;
  let i = 0;
  const seps = new Set(separators);

  while (i < text.length) {
    const ch = text[i];

    // 进入 {{...}}
    if (ch === '{' && text[i + 1] === '{') {
      depth++;
      current += '{{';
      i += 2;
      continue;
    }
    // 离开 {{...}}
    if (ch === '}' && text[i + 1] === '}') {
      depth--;
      current += '}}';
      i += 2;
      continue;
    }
    // 只在 depth === 0 时按分隔符切分
    if (depth === 0 && seps.has(ch)) {
      result.push(current);
      current = '';
      i++;
      continue;
    }
    current += ch;
    i++;
  }
  if (current !== '') result.push(current);
  return result;
}

// ---------- 单元格内联渲染 ----------
// 支持：{{color|#xxx|inner}}、{{color|#xxx|#yyy|inner}}、'''粗体'''、''斜体''
function renderCell(text) {
  // 先转义 HTML 特殊字符
  let s = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 带背景色：{{color|前景|背景|文本}}
  s = s.replace(/\{\{color\|([^|}]+)\|([^|}]+)\|(.+?)\}\}/g, (m, c1, c2, inner) => {
    return `<span style="color:${c1};background-color:${c2}">${inner}</span>`;
  });
  // 仅前景色：{{color|前景|文本}}
  s = s.replace(/\{\{color\|([^|}]+)\|(.+?)\}\}/g, (m, c1, inner) => {
    return `<span style="color:${c1}">${inner}</span>`;
  });

  // 粗体、斜体
  s = s.replace(/'''(.*?)'''/g, '<strong>$1</strong>');
  s = s.replace(/''(.*?)''/g, '<em>$1</em>');

  return s;
}
