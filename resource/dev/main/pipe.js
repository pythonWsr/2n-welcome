// pipe.js – 跨页面参数管理（修复语言/颜色同步）

const STORAGE_PREFIX = '2n_';

/**
 * 获取当前语言
 * @returns {string} 'zh' 或 'en'
 */
export function getLanguage() {
  const stored = localStorage.getItem(STORAGE_PREFIX + 'lang');
  if (stored === 'zh' || stored === 'en') return stored;
  // 默认跟随浏览器语言
  const navLang = navigator.language || navigator.userLanguage || 'zh';
  const defaultLang = navLang.startsWith('zh') ? 'zh' : 'en';
  // 首次加载时写入缓存
  localStorage.setItem(STORAGE_PREFIX + 'lang', defaultLang);
  return defaultLang;
}

/**
 * 设置语言并持久化
 * @param {string} lang 'zh' 或 'en'
 */
export function setLanguage(lang) {
  if (lang === 'zh' || lang === 'en') {
    localStorage.setItem(STORAGE_PREFIX + 'lang', lang);
    // 同时触发自定义事件，确保 settings.js 感知语言变化
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  }
}

/**
 * 获取颜色模式偏好
 * @returns {'auto' | 'light' | 'dark'}
 */
export function getColorMode() {
  const stored = localStorage.getItem(STORAGE_PREFIX + 'colorMode');
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored;
  // 默认跟随系统
  localStorage.setItem(STORAGE_PREFIX + 'colorMode', 'auto');
  return 'auto';
}

/**
 * 设置颜色模式
 * @param {'auto' | 'light' | 'dark'} mode
 */
export function setColorMode(mode) {
  if (mode === 'auto' || mode === 'light' || mode === 'dark') {
    localStorage.setItem(STORAGE_PREFIX + 'colorMode', mode);
    // 同步更新主题样式
    applyThemeFromMode(mode);
  }
}

/**
 * 根据手动模式立即切换主题（不依赖系统监听）
 * @param {string} mode
 */
function applyThemeFromMode(mode) {
  let theme = mode;
  if (mode === 'auto') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  const themeLink = document.getElementById('theme-link');
  if (themeLink) {
    themeLink.href = `./main/theme-${theme}.css`;
  }
}

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
 * 获取所有传递参数：语言、颜色模式、user、pwd
 * @returns {{ lang: string, mode: string, user: string|null, pwd: string|null }}
 */
export function getPipeParams() {
  return {
    lang: getLanguage(),
    mode: getColorMode(),
    user: getUrlParam('user'),
    pwd: getUrlParam('pwd')
  };
}

/**
 * 将参数转换为查询字符串（不含 ? 开头）
 * @param {object} params
 * @returns {string}
 */
export function buildQueryString(params) {
  const parts = [];
  if (params.lang && params.lang !== 'auto') parts.push(`lang=${encodeURIComponent(params.lang)}`);
  if (params.mode && params.mode !== 'auto') parts.push(`mode=${encodeURIComponent(params.mode)}`);
  if (params.user) parts.push(`user=${encodeURIComponent(params.user)}`);
  if (params.pwd) parts.push(`pwd=${encodeURIComponent(params.pwd)}`);
  return parts.length > 0 ? parts.join('&') : '';
}

/**
 * 在当前页面跳转时自动附加语言、颜色模式、user、pwd 参数
 * @param {string} url 目标地址（相对或绝对）
 * @param {object} [extraParams] 额外参数（会覆盖 pipe 中的值）
 */
export function navigate(url, extraParams = {}) {
  const params = { ...getPipeParams(), ...extraParams };
  const qs = buildQueryString(params);
  const separator = url.includes('?') ? '&' : '?';
  const finalUrl = qs ? `${url}${separator}${qs}` : url;
  window.location.href = finalUrl;
}

/**
 * 为链接生成完整的 query 字符串（用于手动构建链接）
 * @returns {string}
 */
export function getLinkQuery() {
  return buildQueryString(getPipeParams());
}