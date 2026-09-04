// color.js – 文本颜色模块
// 用法：{{color|#ff0000|红色文字}} 或 {{color|#ff0000|#ffffff|红底白字}}
export default {
  name: 'color',
  isBlock: false,
  render(params) {
    if (params.length < 2) return '';
    const textColor = params[0];
    const text = params[params.length - 1];
    const bgColor = params.length > 2 ? params[1] : null;
    const style = `color:${textColor};${bgColor ? 'background-color:' + bgColor + ';' : ''}`;
    return `<span style="${style}">${escapeHTML(text)}</span>`;
  }
};

function escapeHTML(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
