// error403.js – 统一 403 错误页面

/**
 * 显示 403 页面
 * @param {number} code 错误码
 */
export function show403(code) {
  document.documentElement.innerHTML = '';
  document.body.innerHTML = `
    <div style="text-align:center;margin-top:20vh;font-family:system-ui;">
      <h1 style="color:#de1f1f;">403 Forbidden</h1>
      <p style="font-size:1.2rem;margin-top:10px;">ERROR:${code}</p>
    </div>
  `;
}