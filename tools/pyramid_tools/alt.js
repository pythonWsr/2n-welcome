// ==UserScript==
// @name         Florr.io 移动端 Alt/K 按钮 (模拟真实按键)
// @namespace    https://pythonwsr.github.io/2n-welcome/
// @version      2.4
// @description  在 florr.io 显示可拖拽悬浮窗，按钮模拟真实 Alt 键与 K 键（K 松开延时 0.5s）
// @author       pythonWsr
// @match        *://florr.io/*
// @grant        none
// @run-at       document-end
// @downloadURL  https://pythonwsr.github.io/2n-welcome/tools/pyramid_tools/alt.js
// @updateURL    https://pythonwsr.github.io/2n-welcome/tools/pyramid_tools/alt.js
// ==/UserScript==

(function () {
    'use strict';

    // ========== 按键定义 ==========
    const ALT_KEY = { key: 'Alt', code: 'AltLeft', keyCode: 18, location: 1 };
    const K_KEY   = { key: 'k',   code: 'KeyK',    keyCode: 75, location: 0 };
    const K_RELEASE_DELAY = 500; // 松开 K 键的延时（毫秒）

    // ========== 通用按钮样式 ==========
    function styleBtn(btn, pressed) {
        if (pressed) {
            btn.style.background = '#3a6ea5';
            btn.style.color = '#fff';
            btn.style.borderColor = '#5a8ec5';
        } else {
            btn.style.background = '#2a2a3a';
            btn.style.color = '#aaa';
            btn.style.borderColor = '#555';
        }
    }

    // ========== 1. 创建悬浮窗 ==========
    const panel = document.createElement('div');
    panel.id = 'florr-alt-panel';
    panel.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        background: rgba(20, 20, 30, 0.92);
        color: #e0e0e0;
        border: 1px solid #444;
        border-radius: 10px;
        padding: 8px 10px;
        font-family: system-ui, sans-serif;
        font-size: 13px;
        cursor: move;
        user-select: none;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        gap: 8px;
        backdrop-filter: blur(6px);
    `;

    const handle = document.createElement('span');
    handle.textContent = '⇅';
    handle.style.cssText = `cursor: move; font-weight: bold; opacity: 0.7; padding: 0 2px;`;

    const btnBaseCss = `
        border: 1px solid #555;
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.15s;
        outline: none;
        min-width: 44px;
        font-weight: bold;
    `;

    const altBtn = document.createElement('button');
    altBtn.textContent = 'Alt';
    altBtn.style.cssText = btnBaseCss;
    styleBtn(altBtn, false);

    const kBtn = document.createElement('button');
    kBtn.textContent = 'K';
    kBtn.style.cssText = btnBaseCss;
    styleBtn(kBtn, false);

    panel.appendChild(handle);
    panel.appendChild(altBtn);
    panel.appendChild(kBtn);
    document.body.appendChild(panel);

    // ========== 2. 拖拽逻辑 ==========
    let dragging = false;
    let offsetX = 0, offsetY = 0;

    function startDrag(clientX, clientY) {
        dragging = true;
        const rect = panel.getBoundingClientRect();
        offsetX = clientX - rect.left;
        offsetY = clientY - rect.top;
    }

    function moveDrag(clientX, clientY) {
        if (!dragging) return;
        let x = clientX - offsetX;
        let y = clientY - offsetY;
        x = Math.max(0, Math.min(x, window.innerWidth - panel.offsetWidth));
        y = Math.max(0, Math.min(y, window.innerHeight - panel.offsetHeight));
        panel.style.left = x + 'px';
        panel.style.top = y + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
    }

    handle.addEventListener('mousedown', (e) => {
        startDrag(e.clientX, e.clientY);
        e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
    document.addEventListener('mouseup', () => { dragging = false; });

    handle.addEventListener('touchstart', (e) => {
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
    }, { passive: false });
    document.addEventListener('touchmove', (e) => {
        if (!dragging) return;
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
    }, { passive: false });
    document.addEventListener('touchend', () => { dragging = false; });

    // ========== 3. 模拟真实键盘事件 ==========
    let synthesizing = false;
    let altPressed = false;

    function makeKeyEvent(type, keyInfo, altActive) {
        const ev = new KeyboardEvent(type, {
            key: keyInfo.key,
            code: keyInfo.code,
            location: keyInfo.location,
            altKey: altActive,
            ctrlKey: false,
            shiftKey: false,
            metaKey: false,
            repeat: false,
            bubbles: true,
            cancelable: true,
            composed: true,
        });
        try {
            Object.defineProperty(ev, 'keyCode', { get: () => keyInfo.keyCode, configurable: true });
            Object.defineProperty(ev, 'which',   { get: () => keyInfo.keyCode, configurable: true });
        } catch (_) { /* 忽略 */ }
        return ev;
    }

    function dispatchKey(type, keyInfo) {
        synthesizing = true;
        try {
            // Alt 自身 keyup 时 altKey 必须为 false；其他键跟随当前 Alt 状态
            const altActive = (keyInfo.key === 'Alt') ? (type === 'keydown') : altPressed;

            const targets = [document, window];
            const canvas = document.querySelector('canvas');
            if (canvas && !targets.includes(canvas)) targets.push(canvas);

            for (const t of targets) {
                t.dispatchEvent(makeKeyEvent(type, keyInfo, altActive));
            }
        } finally {
            synthesizing = false;
        }
    }

    // ========== 4. Alt 状态 ==========
    function setAltState(pressed, fromRealKey = false) {
        if (altPressed === pressed) return;
        altPressed = pressed;
        styleBtn(altBtn, pressed);
        window.__florrAltPressed = pressed;
        if (!fromRealKey) {
            dispatchKey(pressed ? 'keydown' : 'keyup', ALT_KEY);
        }
    }

    altBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setAltState(!altPressed);
    });

    // ========== 5. K 状态（按下后点击任意位置延时 0.5s 松开） ==========
    let kPressed = false;
    let kReleaseTimer = null;
    let kCancelListener = null;
    let kCancelEvents = null;

    // 真正执行松开
    function doReleaseK() {
        if (kReleaseTimer) {
            clearTimeout(kReleaseTimer);
            kReleaseTimer = null;
        }
        if (!kPressed) return;

        kPressed = false;
        styleBtn(kBtn, false);
        window.__florrKPressed = false;
        dispatchKey('keyup', K_KEY);

        if (kCancelEvents) {
            for (const evName of kCancelEvents) {
                document.removeEventListener(evName, kCancelListener, true);
            }
            kCancelEvents = null;
            kCancelListener = null;
        }
    }

    // 启动/刷新 0.5s 延时松开
    function scheduleKRelease() {
        if (!kPressed) return;
        if (kReleaseTimer) clearTimeout(kReleaseTimer);
        kReleaseTimer = setTimeout(() => {
            kReleaseTimer = null;
            doReleaseK();
        }, K_RELEASE_DELAY);
    }

    // 立即按下 K（仅在松开状态可用）
    function setKPressed() {
        if (kPressed) return;
        if (kReleaseTimer) {
            clearTimeout(kReleaseTimer);
            kReleaseTimer = null;
        }

        kPressed = true;
        styleBtn(kBtn, true);
        window.__florrKPressed = true;
        dispatchKey('keydown', K_KEY);

        // 延迟注册捕获监听，避免激活 K 的那一次点击立刻触发取消
        setTimeout(() => {
            if (!kPressed) return;
            kCancelListener = function () {
                scheduleKRelease();
            };
            kCancelEvents = window.PointerEvent ? ['pointerdown'] : ['mousedown', 'touchstart'];
            for (const evName of kCancelEvents) {
                document.addEventListener(evName, kCancelListener, true);
            }
        }, 0);
    }

    kBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (kPressed) {
            // 点击 K 按钮也视为“点击任意位置”，启动/刷新延时松开
            scheduleKRelease();
        } else {
            setKPressed();
        }
    });

    // ========== 6. 真实键盘 Alt 联动 UI ==========
    document.addEventListener('keydown', (e) => {
        if (synthesizing) return;
        if (e.key === 'Alt' && !altPressed) setAltState(true, true);
    });
    document.addEventListener('keyup', (e) => {
        if (synthesizing) return;
        if (e.key === 'Alt' && altPressed) setAltState(false, true);
    });

    // ========== 初始化 ==========
    window.__florrAltPressed = false;
    window.__florrKPressed = false;
})();
