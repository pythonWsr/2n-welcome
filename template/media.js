// template/media.js
//
// ═══════════════════════════════════════════════════════════════
//  用法
// ═══════════════════════════════════════════════════════════════
//
//   {{media|image|src|alt|width}}
//   {{media|video|src|width}}
//
//   类型      image 或 video（不区分大小写）
//
//   src       资源地址。可以是相对路径、绝对路径或外链 URL。
//
//   alt       仅 image 使用，替代文本。可选。
//             图片无法加载时显示，也用于屏幕阅读器。
//
//   width     显示宽度。可选。支持任意 CSS 长度：
//             px / em / % / vw 等，例如 300px、50%。
//             省略时按容器宽度自动缩放（max-width: 100%）。
//
// ═══════════════════════════════════════════════════════════════
//  示例
// ═══════════════════════════════════════════════════════════════
//
//   {{media|image|./data/announcements/img/welcome.png|欢迎图|400px}}
//   {{media|image|https://example.com/pic.jpg}}
//   {{media|video|./data/announcements/video/demo.mp4}}
//   {{media|video|./video.mp4|640px}}
//
// ═══════════════════════════════════════════════════════════════
//  注意
// ═══════════════════════════════════════════════════════════════
//
//   参数以 | 分隔，因此 src / alt 中不能含 | 字符。
//   内容中也不能出现连续两个右花括号。
//
//   本模板为块级模板（isBlock: true），可以单独占一行。
//
// ═══════════════════════════════════════════════════════════════
//  实现说明
// ═══════════════════════════════════════════════════════════════
//
//   src / alt 会经过 HTML 转义后再写入属性，避免属性注入。
//   width 不做转义，直接写入 style，由调用方负责输入可信。

export default {
  name: 'media',
  isBlock: true,
  render(params) {
    if (params.length < 2) return '';
    const type = params[0].toLowerCase();
    const src = params[1];
    const alt = params[2] || '';
    const width = params[3] || '';

    if (type === 'image') {
      const style = width ? `width:${width};` : '';
      return `<img src="${escapeHTML(src)}" alt="${escapeHTML(alt)}" style="${style}max-width:100%;">`;
    } else if (type === 'video') {
      const style = width ? `width:${width};` : '';
      return `<video controls src="${escapeHTML(src)}" style="${style}max-width:100%;"></video>`;
    }
    return '';
  }
};

function escapeHTML(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
