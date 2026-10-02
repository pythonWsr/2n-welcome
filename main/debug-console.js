// debug-console.js – 统一调试参数（?debug=true）+ 自动在内部跳转中传递 + 加载 Eruda
(function() {
  'use strict';

  var params = new URLSearchParams(location.search);
  var debugEnabled = params.get('debug') === 'true';

  window.__debugEnabled = debugEnabled;

  // ---------- 工具：为 URL 附加 debug=true ----------
  window.appendDebugParam = function(url) {
    if (!debugEnabled || !url) return url;
    if (/^(#|javascript:|mailto:|tel:)/i.test(url)) return url;
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
      try {
        var u = new URL(url);
        if (u.origin !== location.origin) return url;
      } catch (e) {
        return url;
      }
    }
    if (/[?&]debug=true(&|#|$)/.test(url)) return url;

    var hashIdx = url.indexOf('#');
    var base = hashIdx === -1 ? url : url.slice(0, hashIdx);
    var hash = hashIdx === -1 ? '' : url.slice(hashIdx);
    var sep = base.indexOf('?') === -1 ? '?' : '&';
    return base + sep + 'debug=true' + hash;
  };

  // ---------- 自动处理所有 <a> ----------
  function processAnchor(a) {
    if (!a || a.dataset.__debugProcessed) return;
    a.dataset.__debugProcessed = '1';
    var href = a.getAttribute('href');
    if (!href) return;
    var next = window.appendDebugParam(href);
    if (next !== href) a.setAttribute('href', next);
  }

  function processTree(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.tagName === 'A') processAnchor(root);
    if (root.querySelectorAll) {
      root.querySelectorAll('a[href]').forEach(processAnchor);
    }
  }

  // 捕获阶段兜底
  document.addEventListener('click', function(e) {
    if (!debugEnabled) return;
    var a = e.target && e.target.closest && e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href) return;
    var next = window.appendDebugParam(href);
    if (next !== href) a.setAttribute('href', next);
  }, true);

  // ---------- 启动 ----------
  function start() {
    if (!debugEnabled) return;

    processTree(document.body);

    if (window.MutationObserver) {
      var observer = new MutationObserver(function(mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var nodes = mutations[i].addedNodes;
          for (var j = 0; j < nodes.length; j++) {
            processTree(nodes[j]);
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    loadEruda();
  }

  function loadEruda() {
    function init() {
      if (!window.eruda) return;
      var tool = params.get('tool') || 'console';
      var theme = params.get('theme') || 'Monokai';
      window.eruda.init({
        tool: ['console', 'elements', 'network', 'resources', 'info', 'sources', 'storage'],
        defaults: { displaySize: 50, theme: theme }
      });
      window.eruda.show();
      try { window.eruda.get(tool).show(); } catch (e) {}
      console.log('[debug] Eruda 已加载，工具=' + tool + '，theme=' + theme);
    }

    if (window.eruda) return init();

    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/eruda';
    s.onload = init;
    s.onerror = function() { console.warn('[debug] Eruda 加载失败'); };
    document.head.appendChild(s);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
