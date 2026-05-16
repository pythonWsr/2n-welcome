// survey.js – 问卷嵌入模块（仅 user 有值时显示）

/**
 * 渲染问卷 iframe
 * @param {HTMLElement} container - 问卷容器元素
 * @param {string} user - 从 pipe 获取的用户名（非空时才显示）
 * @param {boolean} isMobile - 是否为手机端（用于调整高度）
 */
export function renderSurvey(container, user, isMobile = false) {
  if (!container || !user) return;
  
  const height = isMobile ? '500px' : '600px';
  container.innerHTML = `
    <div class="survey-wrapper" style="margin-top:16px;">
      <iframe src="https://v.wjx.cn/vm/mvfSmAf.aspx?width=760&source=iframe&s=t"
              style="width:100%; height:${height}; border:none; border-radius:12px; overflow:auto;"
              frameborder="0"></iframe>
    </div>
  `;
}