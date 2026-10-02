// module/color.js – 文本颜色模块
// 用法：{{color|#ff0000|文本}} 或 {{color|#ff0000|#ffffff|背景}}
export default {
  name: 'color',
  isBlock: false,
  render(params) {
    if (params.length < 2) return '';
    const textColor = params[0];
    const text = params[params.length - 1];
    const bgColor = params.length > 2 ? params[1] : null;
    const style = `color:${textColor};${bgColor ? 'background-color:' + bgColor + ';' : ''}`;
    // 不再转义 text，允许内联标记（如 <strong>）
    return `<span style="${style}">${text}</span>`;
  }
};
