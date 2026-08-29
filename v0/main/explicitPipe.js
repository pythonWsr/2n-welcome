// explicitPipe.js – URL 查询参数管理（user, pwd, survey 等）

/**
 * 解析当前 URL 中的指定查询参数
 * @param {string} key 参数名
 * @returns {string|null}
 */
export function getUrlParam(key) {
  const url = new URL(window.location.href);
  return url.searchParams.get(key) || null;
}

/**
 * 获取当前 URL 中的 survey 参数（如果没有则返回 null）
 */
export function getSurveyParam() {
  return getUrlParam('survey');
}

/**
 * 获取所有显式参数：user、pwd、survey
 * @returns {{ user: string|null, pwd: string|null, survey: string|null }}
 */
export function getExplicitParams() {
  return {
    user: getUrlParam('user'),
    pwd: getUrlParam('pwd'),
    survey: getSurveyParam()
  };
}

/**
 * 将参数转换为查询字符串（不含 ? 开头）
 * 会自动包含 lang, mode, user, pwd, survey 等
 * @param {object} params
 * @returns {string}
 */
export function buildQueryString(params) {
  const parts = [];
  if (params.lang && params.lang !== 'auto') parts.push(`lang=${encodeURIComponent(params.lang)}`);
  if (params.mode && params.mode !== 'auto') parts.push(`mode=${encodeURIComponent(params.mode)}`);
  if (params.user) parts.push(`user=${encodeURIComponent(params.user)}`);
  if (params.pwd) parts.push(`pwd=${encodeURIComponent(params.pwd)}`);
  if (params.survey) parts.push(`survey=${encodeURIComponent(params.survey)}`);
  return parts.length > 0 ? parts.join('&') : '';
}