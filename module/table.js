// module/table.js – 表格模块（支持单元格内嵌模块输出的 HTML）
// 用法：{{table|列1,列2,列3|行1列1,行1列2,行1列3|行2列1,行2列2,行2列3}}
export default {
  name: 'table',
  isBlock: true,
  render(params) {
    if (params.length < 2) return '';

    const headers = params[0].split(',').map(h => h.trim());
    const rows = params.slice(1).map(row =>
      row.split(',').map(cell => cell.trim())
    );

    let html = '<table class="wiki-table"><thead><tr>';
    headers.forEach(h => {
      html += `<th>${h}</th>`;
    });
    html += '</tr></thead><tbody>';
    rows.forEach(row => {
      html += '<tr>';
      row.forEach(cell => {
        html += `<td>${cell}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }
};

