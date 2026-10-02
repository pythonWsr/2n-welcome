// module/table.js – 表格模块
// 用法（推荐换行分隔行）：
//   {{table|表头1,表头2
//   行1列1,行1列2
//   行2列1,行2列2}}
export default {
  name: 'table',
  isBlock: true,
  rawParams: true,
  render(rawContent) {
    // 逐行清理：去掉行首行尾多余的 |，忽略空行
    const lines = rawContent
      .split('\n')
      .map(l => l.trim())
      .map(l => l.replace(/^\|+/, '').replace(/\|+$/, '').trim())
      .filter(l => l !== '');

    if (lines.length < 1) return '';

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const cells = line.split(',').map(c => c.trim());
      // 去掉末尾空 cell（源于行尾多余逗号）
      while (cells.length && cells[cells.length - 1] === '') cells.pop();
      return cells;
    });

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

// ---------- cell 内的简化内联渲染 ----------
// 支持：{{color|#xxx|文本}}、{{color|#xxx|#yyy|文本}}、'''粗体'''、''斜体''
function renderCell(text) {
  let s = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 带背景色的 color
  s = s.replace(/\{\{color\|([^|}]+)\|([^|}]+)\|(.+?)\}\}/g, (m, c1, c2, inner) => {
    return `<span style="color:${c1};background-color:${c2}">${inner}</span>`;
  });
  // 仅前景色的 color
  s = s.replace(/\{\{color\|([^|}]+)\|(.+?)\}\}/g, (m, c1, inner) => {
    return `<span style="color:${c1}">${inner}</span>`;
  });

  // 粗体、斜体
  s = s.replace(/'''(.*?)'''/g, '<strong>$1</strong>');
  s = s.replace(/''(.*?)''/g, '<em>$1</em>');

  return s;
}
