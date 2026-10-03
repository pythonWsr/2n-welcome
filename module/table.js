// module/table.js – 表格模块（支持多行 / 单行、顶层分割、单元格内联模块）
// 用法（两种都兼容）：
//
// 多行：
// {{table|序号,玩家,q花瓣,锻造时间
// 1,{{color|#555555|q}},Champion's Crown,
// 2,...}}
//
// 单行：
// {{table|序号,玩家,q花瓣,锻造时间| 1,{{color|#555555|q}},Champion's Crown,| 2,...}}
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
