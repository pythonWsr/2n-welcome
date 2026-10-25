// ==UserScript==
// @name         Florr.io 移动端 Alt 按钮 (模拟真实按键)
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  在 florr.io 显示可拖拽悬浮窗，按钮模拟真实 Alt 键按下/松开（修复 keyup 的 altKey 状态）
// @match        https://florr.io/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

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
        padding: 10px 12px;
        font-family: system-ui, sans-serif;
        font-size: 13px;
        cursor: move;
        user-select: none;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        gap: 10px;
        backdrop-filter: blur(6px);
    `;

    const handle = document.createElement('span');
    handle.textContent = '⇅ Alt';
    handle.style.cssText = `cursor: move; font-weight: bold; opacity: 0.7;`;

    const btn = document.createElement('button');
    btn.textContent = 'Alt: 松开';
    btn.style.cssText = `
        background: #2a2a3a;
        color: #aaa;
        border: 1px solid #555;
        border-radius: 6px;
        padding: 6px 14px;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.15s;
        outline: none;
        min-width: 90px;
    `;

    panel.appendChild(handle);
    panel.appendChild(btn);
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

    // ========== 3. 模拟真实 Alt 键（修复核心） ==========
    let altPressed = false;
    let synthesizing = false;

    function updateButton() {
        if (altPressed) {
            btn.textContent = 'Alt: 按住';
            btn.style.background = '#3a6ea5';
            btn.style.color = '#fff';
            btn.style.borderColor = '#5a8ec5';
        } else {
            btn.textContent = 'Alt: 松开';
            btn.style.background = '#2a2a3a';
            btn.style.color = '#aaa';
            btn.style.borderColor = '#555';
        }
    }

    function makeAltKeyboardEvent(type) {
        const isDown = type === 'keydown';
        const ev = new KeyboardEvent(type, {
            key: 'Alt',
            code: 'AltLeft',
            location: 1,               // 左 Alt
            altKey: isDown,            // ★ 修复：keydown 为 true，keyup 为 false
            ctrlKey: false,
            shiftKey: false,
            metaKey: false,
            repeat: false,
            bubbles: true,
            cancelable: true,
            composed: true,
        });

        // 构造器会忽略 keyCode/which（非标准字段），手动覆盖以兼容旧逻辑
        try {
            Object.defineProperty(ev, 'keyCode', { get: () => 18, configurable: true });
            Object.defineProperty(ev, 'which',   { get: () => 18, configurable: true });
        } catch (_) { /* 忽略 */ }

        return ev;
    }

    function dispatchAltEvent(type) {
        synthesizing = true;
        try {
            document.dispatchEvent(makeAltKeyboardEvent(type));
            if (window !== document) {
                window.dispatchEvent(makeAltKeyboardEvent(type));
            }
        } finally {
            synthesizing = false;
        }
    }

    function setAltState(pressed, fromRealKey = false) {
        if (altPressed === pressed) return;
        altPressed = pressed;
        updateButton();
        window.__florrAltPressed = altPressed;

        // 真实键盘已由浏览器派发，不需要再合成一次，避免重复触发
        if (!fromRealKey) {
            dispatchAltEvent(altPressed ? 'keydown' : 'keyup');
        }
    }

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setAltState(!altPressed);
    });

    // ========== 4. 真实键盘联动（外接键盘） ==========
    document.addEventListener('keydown', (e) => {
        if (synthesizing) return;                 // 忽略自己派发的合成事件
        if (e.key === 'Alt' && !altPressed) setAltState(true, true);
    });
    document.addEventListener('keyup', (e) => {
        if (synthesizing) return;
        if (e.key === 'Alt' && altPressed) setAltState(false, true);
    });

    // 初始化
    updateButton();
    window.__florrAltPressed = false;
})();
