// main/csvParser.js – CSV 解析与渲染
// 用法：
//   import { parseCSV, csvToTable } from './csvParser.js';
//   const rows = parseCSV(csvText);          // 返回二维数组
//   const html = csvToTable(csvText);        // 返回 HTML 表格字符串

/**
 * 解析 CSV 字符串为二维数组
 * @param {string} csvText - CSV 文本
 * @param {string} delimiter - 分隔符，默认 ','
 * @returns {string[][]} 二维数组（第一行为表头）
 */
export function parseCSV(csvText, delimiter = ',') {
  if (!csvText) return [];
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < csvText.length) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          // 双引号转义
          currentField += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        currentField += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        // 处理换行（\r\n 或 \n 或 \r）
        if (ch === '\r' && next === '\n') i += 2;
        else i++;
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += ch;
        i++;
      }
    }
  }

  // 处理最后一行
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows;
}

/**
 * 将 CSV 文本转换为 HTML 表格
 * @param {string} csvText
 * @param {string} delimiter
 * @returns {string} HTML 字符串
 */
export function csvToTable(csvText, delimiter = ',') {
  const rows = parseCSV(csvText, delimiter);
  if (rows.length === 0) return '';

  const headers = rows[0];
  const dataRows = rows.slice(1);

  let html = '<table class="csv-table"><thead><tr>';
  headers.forEach(h => {
    html += `<th>${escapeHTML(h)}</th>`;
  });
  html += '</tr></thead><tbody>';

  dataRows.forEach(row => {
    html += '<tr>';
    row.forEach(cell => {
      html += `<td>${escapeHTML(cell)}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  return html;
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

