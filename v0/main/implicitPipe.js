// implicitPipe.js – 隐式状态管理（语言、颜色模式）

const STORAGE_PREFIX = '2n_';

export function getLanguage() {
  const stored = localStorage.getItem(STORAGE_PREFIX + 'lang');
  if (stored === 'zh' || stored === 'en') return stored;
  const navLang = navigator.language || navigator.userLanguage || 'zh';
  const defaultLang = navLang.startsWith('zh') ? 'zh' : 'en';
  localStorage.setItem(STORAGE_PREFIX + 'lang', defaultLang);
  return defaultLang;
}

export function setLanguage(lang) {
  if (lang === 'zh' || lang === 'en') {
    localStorage.setItem(STORAGE_PREFIX + 'lang', lang);
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  }
}

export function getColorMode() {
  const stored = localStorage.getItem(STORAGE_PREFIX + 'colorMode');
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored;
  localStorage.setItem(STORAGE_PREFIX + 'colorMode', 'auto');
  return 'auto';
}

export function setColorMode(mode) {
  if (mode === 'auto' || mode === 'light' || mode === 'dark') {
    localStorage.setItem(STORAGE_PREFIX + 'colorMode', mode);
    applyThemeFromMode(mode);
  }
}

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

export function getImplicitParams() {
  return {
    lang: getLanguage(),
    mode: getColorMode()
  };
}