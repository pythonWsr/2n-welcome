// template/latex.js
//
// ═══════════════════════════════════════════════════════════════
//  用法
// ═══════════════════════════════════════════════════════════════
//
//   {{latex|strict|公式}}
//   {{latex|loose|公式}}
//
//   strict  严格模式。公式必须是合法 LaTeX，出错时显示原文 +
//           红色虚线下划线，鼠标悬停可看到错误信息。
//
//   loose   宽松模式。允许直接使用 Unicode 符号（α、β、∑、≤、²
//           等），模板会自动把 Unicode 转换为 LaTeX 命令后再渲染。
//
// ═══════════════════════════════════════════════════════════════
//  示例
// ═══════════════════════════════════════════════════════════════
//
//   {{latex|strict|E = mc^2}}
//   {{latex|loose|α² + β² = γ²}}
//   {{latex|loose|∑_{i=1}^{n} i = n(n+1)/2}}
//   {{latex|loose|∀x ∈ ℝ, x² ≥ 0}}
//
// ═══════════════════════════════════════════════════════════════
//  注意：公式中不能直接出现 }} 与 |
// ═══════════════════════════════════════════════════════════════
//
//   wikiParser 的模板匹配用 [\s\S]*?，遇到第一个 }} 就结束。
//   因此公式里若出现连续两个右花括号，会被提前截断。例如：
//
//     {{latex|strict|x^{y^{z}}}     ← 错误！在 y^{z} 后被截断
//
//   三种处理方式，任选其一：
//
//   1) 用 \lbrace 和 \rbrace 代替字面花括号：
//        {{latex|strict|x^{y\lbrace z \rbrace}}
//
//   2) 嵌套时把内层用 \lbrace \rbrace 包裹：
//        {{latex|strict|x^{y^{\lbrace z \rbrace}}}
//
//   3) 拆成多个片段：
//        {{latex|strict|x^{y}} + {{latex|strict|z^{w}}}
//
//   同理，公式中的 | 请用 \mid 或 \vert 替代。
//
// ═══════════════════════════════════════════════════════════════
//  实现说明
// ═══════════════════════════════════════════════════════════════
//
//   KaTeX 从 CDN 异步加载。wikiParser 同步返回一个占位符
//   <span class="latex-placeholder">，KaTeX 就绪后由 MutationObserver
//   自动替换为渲染结果。

const KATEX_VERSION = '0.16.9';
const KATEX_CSS = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.css`;
const KATEX_JS  = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.js`;

// ============ 宽松模式：Unicode → LaTeX ============
const UNICODE_MAP = {
  // 小写希腊字母
  'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta',
  'ε': '\\epsilon', 'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta',
  'ι': '\\iota', 'κ': '\\kappa', 'λ': '\\lambda', 'μ': '\\mu',
  'ν': '\\nu', 'ξ': '\\xi', 'π': '\\pi', 'ρ': '\\rho',
  'σ': '\\sigma', 'τ': '\\tau', 'υ': '\\upsilon', 'φ': '\\phi',
  'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega',
  // 大写希腊字母
  'Γ': '\\Gamma', 'Δ': '\\Delta', 'Θ': '\\Theta', 'Λ': '\\Lambda',
  'Ξ': '\\Xi', 'Π': '\\Pi', 'Σ': '\\Sigma', 'Φ': '\\Phi',
  'Ψ': '\\Psi', 'Ω': '\\Omega',
  // 运算符
  '×': '\\times', '÷': '\\div', '±': '\\pm', '∓': '\\mp',
  '·': '\\cdot', '∘': '\\circ', '∗': '\\ast',
  // 关系符
  '≤': '\\le', '≥': '\\ge', '≠': '\\ne', '≈': '\\approx',
  '≡': '\\equiv', '∼': '\\sim', '∝': '\\propto',
  // 集合与逻辑
  '∈': '\\in', '∉': '\\notin', '⊂': '\\subset', '⊆': '\\subseteq',
  '⊃': '\\supset', '⊇': '\\supseteq',
  '∪': '\\cup', '∩': '\\cap', '∅': '\\emptyset',
  '∀': '\\forall', '∃': '\\exists', '¬': '\\neg',
  '∧': '\\wedge', '∨': '\\vee',
  // 箭头
  '→': '\\to', '←': '\\leftarrow', '↔': '\\leftrightarrow',
  '⇒': '\\Rightarrow', '⇐': '\\Leftarrow', '⇔': '\\Leftrightarrow',
  '↦': '\\mapsto',
  // 大运算符
  '∑': '\\sum', '∏': '\\prod', '∫': '\\int', '∮': '\\oint',
  '√': '\\sqrt', '∂': '\\partial', '∇': '\\nabla',
  '∞': '\\infty', 'ℏ': '\\hbar', 'ℓ': '\\ell',
  // 黑板体
  'ℝ': '\\mathbb{R}', 'ℤ': '\\mathbb{Z}', 'ℕ': '\\mathbb{N}',
  'ℚ': '\\mathbb{Q}', 'ℂ': '\\mathbb{C}',
};

const SUPERSCRIPT_MAP = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '⁺': '+', '⁻': '-', '⁼': '=', '⁽': '(', '⁾': ')', 'ⁿ': 'n',
};

const SUBSCRIPT_MAP = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  '₊': '+', '₋': '-', '₌': '=', '₍': '(', '₎': ')',
};

function normalizeLoose(input) {
  let s = String(input);

  // 上标组 → ^{...}
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿ]+/g, m =>
    '^{' + [...m].map(c => SUPERSCRIPT_MAP[c] || c).join('') + '}');

  // 下标组 → _{...}
  s = s.replace(/[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]+/g, m =>
    '_{' + [...m].map(c => SUBSCRIPT_MAP[c] || c).join('') + '}');

  // 单字符映射
  s = [...s].map(c => UNICODE_MAP[c] || c).join('');

  return s;
}

// ============ Base64 编解码（UTF-8 安全）============
function encodeBase64(str) {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch { return ''; }
}
function decodeBase64(b64) {
  try {
    return decodeURIComponent(escape(atob(b64)));
  } catch { return ''; }
}

// ============ 转义工具 ============
function escapeHTML(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ============ KaTeX 懒加载 ============
let katexPromise = null;

function loadKatex() {
  if (katexPromise) return katexPromise;

  katexPromise = new Promise((resolve, reject) => {
    if (window.katex) { resolve(window.katex); return; }

    if (!document.querySelector('link[data-katex]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = KATEX_CSS;
      link.dataset.katex = '1';
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = KATEX_JS;
    script.async = true;
    script.onload = () => resolve(window.katex);
    script.onerror = () => reject(new Error('KaTeX 加载失败'));
    document.head.appendChild(script);
  });

  return katexPromise;
}

// ============ 生成占位符 HTML（供 wikiParser 调用）============
export function renderLatex(mode, formula) {
  const m = (mode === 'strict' || mode === 'loose') ? mode : 'loose';
  const encoded = encodeBase64(formula);
  return `<span class="latex-placeholder" data-mode="${m}" data-formula="${encoded}"></span>`;
}

// ============ 渲染单个占位符 ============
async function renderPlaceholder(el) {
  const mode = el.dataset.mode || 'loose';
  const formula = decodeBase64(el.dataset.formula || '');
  if (!formula) { el.textContent = ''; return; }

  let katex;
  try {
    katex = await loadKatex();
  } catch (e) {
    el.innerHTML = `<span class="latex-error" title="${escapeAttr(e.message)}">${escapeHTML(formula)}</span>`;
    el.classList.add('latex-failed');
    return;
  }

  const source = mode === 'loose' ? normalizeLoose(formula) : formula;

  try {
    katex.render(source, el, {
      throwOnError: mode === 'strict',
      displayMode: false,
      strict: false,
      trust: false,
      errorColor: '#cc0000',
    });
    el.classList.add('latex-rendered');
  } catch (e) {
    el.innerHTML = `<span class="latex-error" title="${escapeAttr(e.message)}">${escapeHTML(formula)}</span>`;
    el.classList.add('latex-failed');
    if (typeof console !== 'undefined') {
      console.warn('[latex] 渲染失败：', formula, e.message);
    }
  }
}

// ============ 扫描并渲染 ============
function scan(root) {
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll('.latex-placeholder').forEach(el => {
    if (el.dataset.latexRendered === '1') return;
    el.dataset.latexRendered = '1';
    renderPlaceholder(el);
  });
}

let observer = null;
function setup() {
  if (observer) return;
  scan(document);

  observer = new MutationObserver(muts => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.matches && n.matches('.latex-placeholder') && n.dataset.latexRendered !== '1') {
          n.dataset.latexRendered = '1';
          renderPlaceholder(n);
        }
        scan(n);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
}

// ============ 通用模板接口（占位，防止被 wikiParser 的通用正则误伤）============
export default {
  name: 'latex',
  isBlock: false,
  render() {
    return '';
  }
};
