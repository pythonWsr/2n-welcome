// media.js – 媒体插入模块（图片/视频）
// 用法：{{media|image|src|alt|width}} 或 {{media|video|src|width}}
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
