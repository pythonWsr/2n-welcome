// color.js – 文本颜色模块（信任输入，允许内联HTML标记）
export default {
  name: 'color',
  isBlock: false,
  render(params) {
    if (params.length < 2) return '';
    const textColor = params[0];
    const text = params[params.length - 1];
    const bgColor = params.length > 2 ? params[1] : null;
    const style = `color:${textColor};${bgColor ? 'background-color:' + bgColor + ';' : ''}`;
    return `<span style="${style}">${text}</span>`;
  }
};
