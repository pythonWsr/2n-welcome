// table.js – 表格模块
// 用法：{{table|列1,列2|数据1,数据2|数据3,数据4}}
export default {
  name: 'table',
  isBlock: true,
  render(params) {
    if (params.length < 2) return '';
    const headers = params[0].split(',').map(h => h.trim());
    const rows = params.slice(1).map(row => row.split(',').map(cell => cell.trim()));
    let html = '<table class="wiki-table"><thead><tr>';
    headers.forEach(h => {
      html += `<th>${escapeHTML(h)}</th>`;
    });
    html += '</tr></thead><tbody>';
    rows.forEach(row => {
      html += '<tr>';
      row.forEach(cell => {
        html += `<td>${escapeHTML(cell)}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }
};

function escapeHTML(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
