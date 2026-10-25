// ==UserScript==
// @name         Florr.io 移动端 Alt/K 按钮 (模拟真实按键)
// @namespace    https://pythonwsr.github.io/2n-welcome/
// @version      3.0.2
// @description  在 florr.io 显示可拖拽悬浮窗，按钮模拟真实 Alt 键与 K 键
// @author       pythonWsr
// @supportURL   https://github.com/pythonWsr/2n-welcome/issues
// @match        *://florr.io/*
// @grant        none
// @run-at       document-end
// @downloadURL  https://pythonwsr.github.io/2n-welcome/tools/pyramid_tools/alt.user.js
// @updateURL    https://pythonwsr.github.io/2n-welcome/tools/pyramid_tools/alt.user.js
// ==/UserScript==

(function () {
    'use strict';

    // ========== 按键定义 ==========
    const ALT_KEY = { key: 'Alt', code: 'AltLeft', keyCode: 18, location: 1 };
    const K_KEY   = { key: 'k',   code: 'KeyK',    keyCode: 75, location: 0 };
    const SEMI_KEY = { key: ';',  code: 'Semicolon', keyCode: 186, location: 0 };

    // ========== 设置状态 ==========
    const SETTINGS_KEY = 'florrAltPanel.settings';
    let kReleaseDelay = 150;
    let kAutoRelease = true;
    let altEnabled = true;
    let kEnabled = true;
    let realKeySyncEnabled = true;

    function loadSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (!raw) return;
            const s = JSON.parse(raw);
            if (typeof s.kReleaseDelay === 'number' && s.kReleaseDelay >= 10 && s.kReleaseDelay <= 1000) kReleaseDelay = s.kReleaseDelay;
            if (typeof s.kAutoRelease === 'boolean') kAutoRelease = s.kAutoRelease;
            if (typeof s.altEnabled === 'boolean') altEnabled = s.altEnabled;
            if (typeof s.kEnabled === 'boolean') kEnabled = s.kEnabled;
            if (typeof s.realKeySync === 'boolean') realKeySyncEnabled = s.realKeySync;
        } catch (_) { /* 忽略 */ }
    }

    function saveSettings() {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({
                kReleaseDelay, kAutoRelease, altEnabled, kEnabled, realKeySync: realKeySyncEnabled,
            }));
        } catch (_) { /* 忽略 */ }
    }

    loadSettings();

    // ========== 样式注入 ==========
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        .florr-switch { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; }
        .florr-switch input { opacity: 0; width: 0; height: 0; }
        .florr-switch span { position: absolute; inset: 0; background: #444; border-radius: 11px; transition: .2s; cursor: pointer; }
        .florr-switch span::before { content: ""; position: absolute; width: 18px; height: 18px; left: 2px; top: 2px; background: #ccc; border-radius: 50%; transition: .2s; }
        .florr-switch input:checked + span { background: #3a6ea5; }
        .florr-switch input:checked + span::before { transform: translateX(18px); background: #fff; }
        .florr-nav-item { padding: 8px 12px; cursor: pointer; border-radius: 6px; font-size: 14px; color: #aaa; }
        .florr-nav-item.active { background: #2a2a3a; color: #fff; }
        .florr-nav-item:hover:not(.active) { background: #222230; }
        .florr-row { display: flex; flex-direction: column; gap: 4px; padding: 12px 0; border-bottom: 1px solid #2a2a3a; }
        .florr-row:last-child { border-bottom: none; }
        .florr-row-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .florr-label { font-size: 14px; color: #e0e0e0; }
        .florr-hint { font-size: 12px; color: #888; line-height: 1.5; }
        .florr-list-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 4px; border-bottom: 1px solid #2a2a3a; cursor: pointer; font-size: 14px; color: #e0e0e0; }
        .florr-list-item:hover { background: #222230; }
        .florr-list-item:last-child { border-bottom: none; }
        .florr-back { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; cursor: pointer; color: #aaa; font-size: 13px; border-radius: 4px; }
        .florr-back:hover { background: #222230; color: #fff; }
        .florr-btn { background: #2a2a3a; color: #ccc; border: 1px solid #555; border-radius: 6px; padding: 6px 14px; font-size: 13px; cursor: pointer; }
        .florr-btn:hover { background: #333344; }
        .florr-btn.danger { background: #14141e; color: #e05a5a; border-color: #555; }
        .florr-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .florr-link { color: #5a9bd5; word-break: break-all; }
        .florr-input-num { width: 70px; background: #2a2a3a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; padding: 4px 6px; font-size: 13px; }
    `;
    document.head.appendChild(styleEl);

    // ========== 通用按钮样式 ==========
    function styleBtn(btn, pressed) {
        if (pressed) {
            btn.style.background = '#3a6ea5'; btn.style.color = '#fff'; btn.style.borderColor = '#5a8ec5';
        } else {
            btn.style.background = '#2a2a3a'; btn.style.color = '#aaa'; btn.style.borderColor = '#555';
        }
    }

    // ========== 悬浮窗 ==========
    const panel = document.createElement('div');
    panel.id = 'florr-alt-panel';
    panel.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 999999;
        background: rgba(20, 20, 30, 0.92); color: #e0e0e0; border: 1px solid #444;
        border-radius: 10px; padding: 8px 10px; font-family: system-ui, sans-serif;
        font-size: 13px; cursor: move; user-select: none;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5); display: none;
        align-items: center; gap: 8px; backdrop-filter: blur(6px);
    `;

    const handle = document.createElement('span');
    handle.textContent = '⇅';
    handle.style.cssText = `cursor: move; font-weight: bold; opacity: 0.7; padding: 0 2px;`;

    const btnBaseCss = `
        border: 1px solid #555; border-radius: 6px; padding: 6px 10px;
        font-size: 13px; cursor: pointer; transition: all 0.15s;
        outline: none; min-width: 44px; font-weight: bold;
    `;

    const altBtn = document.createElement('button');
    altBtn.textContent = 'Alt';
    altBtn.style.cssText = btnBaseCss;
    styleBtn(altBtn, false);

    const kBtn = document.createElement('button');
    kBtn.textContent = 'K';
    kBtn.style.cssText = btnBaseCss;
    styleBtn(kBtn, false);

    const gearBtn = document.createElement('button');
    gearBtn.textContent = '⚙';
    gearBtn.style.cssText = btnBaseCss + `min-width: 32px; padding: 6px 8px;`;
    styleBtn(gearBtn, false);
    gearBtn.style.display = 'none';

    panel.appendChild(handle);
    panel.appendChild(altBtn);
    panel.appendChild(kBtn);
    panel.appendChild(gearBtn);
    document.body.appendChild(panel);

    function updatePanel() {
        altBtn.style.display = altEnabled ? '' : 'none';
        gearBtn.style.display = altEnabled ? 'none' : '';
        kBtn.style.display = kEnabled ? '' : 'none';
        if (!altEnabled && altPressed) setAltState(false);
        if (!kEnabled && kPressed) doReleaseK();
    }

    // ========== 拖拽 ==========
    let dragging = false, offsetX = 0, offsetY = 0;
    function startDrag(cx, cy) {
        dragging = true;
        const rect = panel.getBoundingClientRect();
        offsetX = cx - rect.left; offsetY = cy - rect.top;
    }
    function moveDrag(cx, cy) {
        if (!dragging) return;
        const x = Math.max(0, Math.min(cx - offsetX, window.innerWidth - panel.offsetWidth));
        const y = Math.max(0, Math.min(cy - offsetY, window.innerHeight - panel.offsetHeight));
        panel.style.left = x + 'px'; panel.style.top = y + 'px';
        panel.style.right = 'auto'; panel.style.bottom = 'auto';
    }
    handle.addEventListener('mousedown', e => { startDrag(e.clientX, e.clientY); e.preventDefault(); });
    document.addEventListener('mousemove', e => moveDrag(e.clientX, e.clientY));
    document.addEventListener('mouseup', () => { dragging = false; });
    handle.addEventListener('touchstart', e => { startDrag(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }, { passive: false });
    document.addEventListener('touchmove', e => { if (!dragging) return; moveDrag(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }, { passive: false });
    document.addEventListener('touchend', () => { dragging = false; });

    // ========== 键盘事件 ==========
    let synthesizing = false;
    let altPressed = false;

    function makeKeyEvent(type, keyInfo, altActive) {
        const ev = new KeyboardEvent(type, {
            key: keyInfo.key, code: keyInfo.code, location: keyInfo.location,
            altKey: altActive, ctrlKey: false, shiftKey: false, metaKey: false,
            repeat: false, bubbles: true, cancelable: true, composed: true,
        });
        try {
            Object.defineProperty(ev, 'keyCode', { get: () => keyInfo.keyCode, configurable: true });
            Object.defineProperty(ev, 'which', { get: () => keyInfo.keyCode, configurable: true });
        } catch (_) { /* 忽略 */ }
        return ev;
    }

    function dispatchKey(type, keyInfo) {
        synthesizing = true;
        try {
            const altActive = (keyInfo.key === 'Alt') ? (type === 'keydown') : altPressed;
            const targets = [document, window];
            const canvas = document.querySelector('canvas');
            if (canvas && !targets.includes(canvas)) targets.push(canvas);
            for (const t of targets) t.dispatchEvent(makeKeyEvent(type, keyInfo, altActive));
        } finally { synthesizing = false; }
    }

    // ========== Alt ==========
    function setAltState(pressed, fromRealKey = false) {
        if (altPressed === pressed) return;
        altPressed = pressed;
        styleBtn(altBtn, pressed);
        window.__florrAltPressed = pressed;
        if (!fromRealKey) dispatchKey(pressed ? 'keydown' : 'keyup', ALT_KEY);
    }

    // ========== K ==========
    let kPressed = false, kReleaseTimer = null, kCancelListener = null, kCancelEvents = null;

    function doReleaseK() {
        if (kReleaseTimer) { clearTimeout(kReleaseTimer); kReleaseTimer = null; }
        if (!kPressed) return;
        kPressed = false;
        styleBtn(kBtn, false);
        window.__florrKPressed = false;
        dispatchKey('keyup', K_KEY);
        if (kCancelEvents) {
            for (const n of kCancelEvents) document.removeEventListener(n, kCancelListener, true);
            kCancelEvents = null; kCancelListener = null;
        }
    }

    function scheduleKRelease() {
        if (!kPressed || !kAutoRelease) return;
        if (kReleaseTimer) clearTimeout(kReleaseTimer);
        kReleaseTimer = setTimeout(() => { kReleaseTimer = null; doReleaseK(); }, kReleaseDelay);
    }

    function setKPressed() {
        if (kPressed) return;
        if (kReleaseTimer) { clearTimeout(kReleaseTimer); kReleaseTimer = null; }
        kPressed = true;
        styleBtn(kBtn, true);
        window.__florrKPressed = true;
        dispatchKey('keydown', K_KEY);
        setTimeout(() => {
            if (!kPressed) return;
            kCancelListener = e => {
                if (panel.contains(e.target)) return;
                if (settingsOverlay && settingsOverlay.contains(e.target)) return;
                scheduleKRelease();
            };
            kCancelEvents = window.PointerEvent ? ['pointerdown'] : ['mousedown', 'touchstart'];
            for (const n of kCancelEvents) document.addEventListener(n, kCancelListener, true);
        }, 0);
    }

    kBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (kPressed) doReleaseK(); else setKPressed();
    });

    // ========== 连点 4 次 Alt ==========
    let altClickTimes = [];
    const QUAD_CLICK_WINDOW = 800;

    altBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (settingsOverlay) return;
        const now = Date.now();
        altClickTimes = altClickTimes.filter(t => now - t < QUAD_CLICK_WINDOW);
        altClickTimes.push(now);
        if (altClickTimes.length >= 4) { altClickTimes = []; openSettings(); return; }
        setAltState(!altPressed);
    });

    gearBtn.addEventListener('click', e => { e.stopPropagation(); openSettings(); });

    // ========== 设置界面 ==========
    let settingsOverlay = null;
    let settingsPage = 'general';
    let settingsSubPage = null;
    let withdrawTimer = null;

    function openSettings() {
        if (altPressed) setAltState(false);
        if (kPressed) doReleaseK();
        if (settingsOverlay) return;

        settingsPage = 'general';
        settingsSubPage = null;

        const overlay = document.createElement('div');
        overlay.style.cssText = `position: fixed; inset: 0; z-index: 1000000; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; font-family: system-ui, sans-serif;`;

        const card = document.createElement('div');
        card.style.cssText = `background: #1a1a24; border: 1px solid #444; border-radius: 12px; color: #e0e0e0; width: 100%; max-width: 640px; height: 70vh; max-height: 600px; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.6); overflow: hidden;`;

        const header = document.createElement('div');
        header.style.cssText = `display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #333; flex-shrink: 0;`;
        const titleEl = document.createElement('div');
        titleEl.textContent = '设置';
        titleEl.style.cssText = `font-size: 16px; font-weight: bold;`;
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `background: none; border: none; color: #aaa; font-size: 24px; cursor: pointer; padding: 0 4px; line-height: 1;`;
        closeBtn.addEventListener('click', closeSettings);
        header.appendChild(titleEl);
        header.appendChild(closeBtn);

        const body = document.createElement('div');
        body.style.cssText = `display: flex; flex: 1; min-height: 0;`;

        const nav = document.createElement('div');
        nav.style.cssText = `width: 100px; flex-shrink: 0; padding: 12px 8px; display: flex; flex-direction: column; gap: 4px;`;
        const generalNav = document.createElement('div');
        generalNav.className = 'florr-nav-item';
        generalNav.textContent = '通用';
        const aboutNav = document.createElement('div');
        aboutNav.className = 'florr-nav-item';
        aboutNav.textContent = '关于';

        const divider = document.createElement('div');
        divider.style.cssText = `width: 1px; background: #333; flex-shrink: 0;`;

        const content = document.createElement('div');
        content.style.cssText = `flex: 1; padding: 16px 20px; overflow-y: auto; min-width: 0;`;

        nav.appendChild(generalNav);
        nav.appendChild(aboutNav);
        body.appendChild(nav);
        body.appendChild(divider);
        body.appendChild(content);

        const footer = document.createElement('div');
        footer.style.cssText = `display: flex; justify-content: flex-end; padding: 12px 18px; border-top: 1px solid #333; flex-shrink: 0;`;
        const footerCloseBtn = document.createElement('button');
        footerCloseBtn.className = 'florr-btn';
        footerCloseBtn.textContent = '关闭';
        footerCloseBtn.addEventListener('click', closeSettings);
        footer.appendChild(footerCloseBtn);

        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(footer);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        settingsOverlay = overlay;

        overlay.addEventListener('click', e => { if (e.target === overlay) closeSettings(); });

        function updateNav() {
            generalNav.classList.toggle('active', settingsPage === 'general');
            aboutNav.classList.toggle('active', settingsPage === 'about');
        }

        generalNav.addEventListener('click', () => { settingsPage = 'general'; settingsSubPage = null; updateNav(); renderContent(); });
        aboutNav.addEventListener('click', () => { settingsPage = 'about'; settingsSubPage = null; updateNav(); renderContent(); });

        function clearWithdrawTimer() {
            if (withdrawTimer) { clearInterval(withdrawTimer); withdrawTimer = null; }
        }

        function renderContent() {
            clearWithdrawTimer();
            content.innerHTML = '';
            if (settingsSubPage) { renderSubPage(); return; }
            if (settingsPage === 'general') { renderGeneral(); return; }
            if (settingsPage === 'about') { renderAbout(); return; }
        }

        function makeRow(labelText, hintText) {
            const row = document.createElement('div');
            row.className = 'florr-row';
            const head = document.createElement('div');
            head.className = 'florr-row-head';
            const lbl = document.createElement('div');
            lbl.className = 'florr-label';
            lbl.textContent = labelText;
            head.appendChild(lbl);
            row.appendChild(head);
            if (hintText) {
                const hint = document.createElement('div');
                hint.className = 'florr-hint';
                hint.textContent = hintText;
                row.appendChild(hint);
            }
            return { row, head };
        }

        function makeSwitch(checked, onChange) {
            const wrap = document.createElement('label');
            wrap.className = 'florr-switch';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = checked;
            const slider = document.createElement('span');
            input.addEventListener('change', () => onChange(input.checked));
            wrap.appendChild(input);
            wrap.appendChild(slider);
            return wrap;
        }

        function renderGeneral() {
            {
                const { row, head } = makeRow('Alt 是否启用', '用于显示或关闭详细信息');
                head.appendChild(makeSwitch(altEnabled, v => {
                    altEnabled = v; saveSettings(); updatePanel();
                }));
                content.appendChild(row);
            }
            {
                const { row, head } = makeRow('K 是否启用', '用于打开或关闭 K 物品栏');
                head.appendChild(makeSwitch(kEnabled, v => {
                    kEnabled = v; saveSettings(); updatePanel();
                }));
                content.appendChild(row);
            }
            {
                const row = document.createElement('div');
                row.className = 'florr-row';
                const head = document.createElement('div');
                head.className = 'florr-row-head';
                const lbl = document.createElement('div');
                lbl.className = 'florr-label';
                lbl.textContent = '点击 K 后的延时';
                head.appendChild(lbl);
                row.appendChild(head);

                const controls = document.createElement('div');
                controls.style.cssText = `display: flex; align-items: center; gap: 10px; margin-top: 6px; flex-wrap: wrap;`;

                const slider = document.createElement('input');
                slider.type = 'range';
                slider.min = '10'; slider.max = '1000'; slider.step = '10';
                slider.value = String(kReleaseDelay);
                slider.style.cssText = `flex: 1; min-width: 100px; cursor: pointer;`;
                slider.disabled = !kAutoRelease;

                const numInput = document.createElement('input');
                numInput.type = 'number';
                numInput.min = '10'; numInput.max = '1000'; numInput.step = '10';
                numInput.value = String(kReleaseDelay);
                numInput.className = 'florr-input-num';
                numInput.disabled = !kAutoRelease;

                const unit = document.createElement('span');
                unit.textContent = 'ms';
                unit.style.cssText = `font-size: 12px; color: #888;`;

                const autoLabel = document.createElement('label');
                autoLabel.style.cssText = `display: flex; align-items: center; gap: 4px; font-size: 12px; color: #aaa; cursor: pointer; white-space: nowrap;`;
                const autoCheck = document.createElement('input');
                autoCheck.type = 'checkbox';
                autoCheck.checked = !kAutoRelease;
                autoCheck.style.cssText = `cursor: pointer;`;
                const autoText = document.createElement('span');
                autoText.textContent = '不启用自动松开';
                autoLabel.appendChild(autoCheck);
                autoLabel.appendChild(autoText);

                controls.appendChild(slider);
                controls.appendChild(numInput);
                controls.appendChild(unit);
                controls.appendChild(autoLabel);
                row.appendChild(controls);

                const hint = document.createElement('div');
                hint.className = 'florr-hint';
                hint.textContent = '若设备延时较高，应相应调高该值，以保证按键状态与游戏响应同步。';
                row.appendChild(hint);

                slider.addEventListener('input', () => {
                    kReleaseDelay = Number(slider.value);
                    numInput.value = slider.value;
                    saveSettings();
                });
                numInput.addEventListener('change', () => {
                    let v = Number(numInput.value);
                    if (isNaN(v)) v = kReleaseDelay;
                    v = Math.max(10, Math.min(1000, Math.round(v)));
                    kReleaseDelay = v;
                    slider.value = String(v);
                    numInput.value = String(v);
                    saveSettings();
                });
                autoCheck.addEventListener('change', () => {
                    kAutoRelease = !autoCheck.checked;
                    slider.disabled = !kAutoRelease;
                    numInput.disabled = !kAutoRelease;
                    saveSettings();
                });

                content.appendChild(row);
            }
            {
                const { row, head } = makeRow('分号键 ( ; )', '用于显示或关闭游戏调试信息');
                const btn = document.createElement('button');
                btn.className = 'florr-btn';
                btn.textContent = '触发';
                btn.addEventListener('click', () => {
                    dispatchKey('keydown', SEMI_KEY);
                    setTimeout(() => dispatchKey('keyup', SEMI_KEY), 30);
                });
                head.appendChild(btn);
                content.appendChild(row);
            }
        }

        function renderAbout() {
            const items = [
                { label: '查看免责声明', page: 'disclaimer' },
                { label: '查看版权信息', page: 'copyright' },
                { label: '进行意见反馈', page: 'feedback' },
                { label: '撤回同意', page: 'withdraw' },
            ];
            for (const item of items) {
                const row = document.createElement('div');
                row.className = 'florr-list-item';
                const t = document.createElement('div');
                t.textContent = item.label;
                const arrow = document.createElement('div');
                arrow.textContent = '›';
                arrow.style.cssText = `color: #888; font-size: 18px;`;
                row.appendChild(t);
                row.appendChild(arrow);
                row.addEventListener('click', () => { settingsSubPage = item.page; renderContent(); });
                content.appendChild(row);
            }
        }

        function renderSubPage() {
            const page = settingsSubPage;
            const back = document.createElement('div');
            back.className = 'florr-back';
            back.textContent = '‹ 返回';
            back.addEventListener('click', () => { settingsSubPage = null; renderContent(); });
            content.appendChild(back);

            const box = document.createElement('div');
            box.style.cssText = `font-size: 13px; line-height: 1.8; color: #c8c8c8;`;

            if (page === 'disclaimer') {
                for (const p of DISCLAIMER_PARAGRAPHS) {
                    const el = document.createElement('p');
                    el.style.margin = '0 0 1em 0';
                    if (p.warn) { el.style.color = '#e05a5a'; el.style.fontWeight = 'bold'; }
                    el.textContent = p.text;
                    box.appendChild(el);
                }
                content.appendChild(box);
            } else if (page === 'copyright') {
                box.innerHTML = `
                    <p><strong>脚本名称：</strong>Florr.io 移动端 Alt/K 按钮</p>
                    <p><strong>作者：</strong>pythonWsr</p>
                    <p><strong>版本：</strong>3.0.2</p>
                    <p><strong>开源协议：</strong>Mozilla Public License 2.0 (MPL-2.0)</p>
                    <p><strong>版权年份：</strong>2026</p>
                    <p><strong>协议链接：</strong><a class="florr-link" href="https://www.mozilla.org/media/MPL/2.0/index.815ca599c9df.txt" target="_blank" rel="noopener">https://www.mozilla.org/media/MPL/2.0/index.815ca599c9df.txt</a></p>
                `;
                content.appendChild(box);
            } else if (page === 'feedback') {
                box.innerHTML = `
                    <p>如您在使用本脚本的过程中遇到问题或有任何建议，可通过以下途径反馈：</p>
                    <p><strong>GitHub Issues：</strong><br><a class="florr-link" href="https://github.com/pythonWsr/2n-welcome/issues" target="_blank" rel="noopener">https://github.com/pythonWsr/2n-welcome/issues</a></p>
                    <p><strong>florr.io 中文维基讨论页：</strong><br><a class="florr-link" href="https://florrio.wiki.gg/zh/wiki/User_talk:Pythonwsr/alt_user_js%E6%84%8F%E8%A7%81%E5%8F%8D%E9%A6%88" target="_blank" rel="noopener">https://florrio.wiki.gg/zh/wiki/User_talk:Pythonwsr/alt_user_js意见反馈</a></p>
                `;
                content.appendChild(box);
            } else if (page === 'withdraw') {
                box.innerHTML = `
                    <p>撤回同意后，本脚本将停止向您提供相关服务，悬浮窗将被隐藏。如需重新启用，请刷新页面并在弹出的免责声明中再次选择同意。</p>
                    <p style="color:#e05a5a;">此操作不可撤销，确定要撤回您的同意吗？</p>
                `;
                content.appendChild(box);

                const btnWrap = document.createElement('div');
                btnWrap.style.cssText = `margin-top: 16px;`;
                const confirmBtn = document.createElement('button');
                confirmBtn.className = 'florr-btn danger';
                confirmBtn.disabled = true;
                let remain = 3;
                confirmBtn.textContent = `确定撤回 (${remain}s)`;
                withdrawTimer = setInterval(() => {
                    remain--;
                    if (remain > 0) confirmBtn.textContent = `确定撤回 (${remain}s)`;
                    else {
                        clearInterval(withdrawTimer); withdrawTimer = null;
                        confirmBtn.disabled = false;
                        confirmBtn.textContent = '确定撤回';
                    }
                }, 1000);

                confirmBtn.addEventListener('click', () => {
                    if (confirmBtn.disabled) return;
                    clearWithdrawTimer();
                    try { localStorage.removeItem(DISCLAIMER_KEY); } catch (_) { /* 忽略 */ }
                    closeSettings();
                    panel.style.display = 'none';
                    if (altPressed) setAltState(false);
                    if (kPressed) doReleaseK();
                });
                btnWrap.appendChild(confirmBtn);
                content.appendChild(btnWrap);
            }
        }

        updateNav();
        renderContent();
    }

    function closeSettings() {
        if (withdrawTimer) { clearInterval(withdrawTimer); withdrawTimer = null; }
        if (!settingsOverlay) return;
        settingsOverlay.remove();
        settingsOverlay = null;
    }

    // ========== 免责声明 ==========
    const DISCLAIMER_KEY = 'florrAltPanel.disclaimer';
    const READ_SECONDS = 10;
    let disclaimerOverlay = null;

    const DISCLAIMER_PARAGRAPHS = [
        { warn: true, text: '警告：在 florr.io 中使用任何脚本（包括本脚本）均存在账号被处罚的风险，且可能违反游戏服务条款。使用本脚本即视为您已知悉并自愿承担该风险。' },
        { text: '本脚本作者仅作为脚本的提供方，不对用户使用本脚本所引发的任何直接或间接后果承担任何责任，包括但不限于账号封禁、永久封停、数据丢失或游戏体验受损。' },
        { text: '您可在同意本声明后，随时通过「设置 → 关于 → 撤回同意」路径撤回您的同意。撤回同意后，本脚本将停止向您提供相关服务。' },
        { text: '打开设置的方式：在悬浮窗内连续点击 Alt 按钮 4 次，相邻两次点击间隔不超过 800 毫秒，即可打开设置界面。' },
        { text: '本脚本的设计初衷如下：在获取金字塔地图后，由于移动端无法通过 Alt 键查看地图对应区域的稀有等级，故通过脚本补充了 Alt 键功能；此后，在其他用户的建议下，又补充了移动端所缺失的 K 键与 ; 键功能。' },
        { text: '若您仅需获取金字塔地图，而不希望使用本脚本的其他功能，并希望规避使用脚本可能带来的风险，可使用替代工具「金字塔地图染色器」。该工具无需安装脚本即可独立使用，地址如下：https://pythonwsr.github.io/2n-welcome/tools/pyramid_tools/pymap.html' },
        { text: '脚本的实现逻辑是：通过悬浮窗按钮维护 Alt 与 K 两个按键的按下状态，并将该状态转换为符合浏览器规范的键盘事件（KeyboardEvent），其中包含正确的按键标识、修饰键状态与键码，随后将事件派发至 document、window 及页面中的 canvas 元素，以模拟真实键盘输入。脚本不会修改游戏代码，也不会拦截或阻止游戏原有的键盘行为。' },
        { text: '可能存在的缺陷有：合成键盘事件的 isTrusted 属性为 false，若游戏校验该属性，脚本可能无法生效；游戏更新后若改变输入监听方式，脚本可能失效；不同移动端浏览器对合成事件的派发与处理存在差异，可能导致行为不一致；脚本仅在 document、window 与 canvas 上派发事件，若游戏将监听器绑定于其他元素或 iframe 内，事件可能无法送达；悬浮窗可能遮挡部分游戏界面。' },
        { text: '使用方法：首次使用时阅读并同意免责声明后，悬浮窗将显示于页面右上角，可按住左侧手柄拖动位置。点击 Alt 按钮可在按下与松开之间切换，按钮颜色表示当前状态。点击 K 按钮使其进入按下状态，随后点击页面任意位置，将在设定的延时后自动松开；再次点击 K 按钮可立即松开。在悬浮窗内连续点击 Alt 按钮 4 次可打开设置界面。' },
        { text: '设置界面分为「通用」与「关于」两个页面。「通用」页提供以下设置：是否启用 Alt 键；是否启用 K 键；点击 K 键后的延时，若设备延时较高，应相应调高该值，以保证按键状态与游戏响应同步；以及分号键（;）的触发入口，用于显示或关闭游戏调试信息。「关于」页提供以下入口：查看免责声明、查看版权信息、进行意见反馈、撤回同意。' },
        { text: '遵循的开源协议是 Mozilla Public License 2.0（MPL-2.0），完整协议文本可在以下地址下载：https://www.mozilla.org/media/MPL/2.0/index.815ca599c9df.txt' },
        { text: '意见反馈途径：GitHub Issues：https://github.com/pythonWsr/2n-welcome/issues ；florr.io 中文维基讨论页：https://florrio.wiki.gg/zh/wiki/User_talk:Pythonwsr/alt_user_js%E6%84%8F%E8%A7%81%E5%8F%8D%E9%A6%88' },
    ];

    function getDisclaimerState() {
        try {
            const raw = localStorage.getItem(DISCLAIMER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (_) { return null; }
    }
    function isDisclaimerAccepted() {
        const s = getDisclaimerState();
        return !!(s && s.accepted === true);
    }
    function isDismissedToday() {
        const s = getDisclaimerState();
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return !!(s && s.dismissedDate === today);
    }

    function showDisclaimer() {
        if (disclaimerOverlay) return;

        const overlay = document.createElement('div');
        overlay.style.cssText = `position: fixed; inset: 0; z-index: 2000000; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; font-family: system-ui, sans-serif; padding: 16px; box-sizing: border-box;`;

        const card = document.createElement('div');
        card.style.cssText = `background: #1a1a24; border: 1px solid #444; border-radius: 12px; color: #e0e0e0; width: 100%; max-width: 560px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.6); overflow: hidden;`;

        const title = document.createElement('div');
        title.textContent = '免责声明';
        title.style.cssText = `padding: 16px 20px; font-size: 18px; font-weight: bold; text-align: center; border-bottom: 1px solid #333; flex-shrink: 0;`;

        const scroll = document.createElement('div');
        scroll.style.cssText = `padding: 16px 20px; overflow-y: auto; flex: 1; min-height: 0; font-size: 14px; line-height: 1.85; color: #c8c8c8; word-break: break-word;`;
        for (const p of DISCLAIMER_PARAGRAPHS) {
            const el = document.createElement('p');
            el.style.margin = '0 0 1em 0';
            if (p.warn) { el.style.color = '#e05a5a'; el.style.fontWeight = 'bold'; el.style.marginBottom = '1.2em'; }
            el.textContent = p.text;
            scroll.appendChild(el);
        }

        const footer = document.createElement('div');
        footer.style.cssText = `padding: 12px 20px 16px; border-top: 1px solid #333; display: flex; flex-direction: column; gap: 10px; flex-shrink: 0;`;

        // 倒计时 / 滚动状态提示
        const statusText = document.createElement('div');
        statusText.style.cssText = `font-size: 12px; color: #999; text-align: center; min-height: 16px;`;

        const agreeBtn = document.createElement('button');
        agreeBtn.textContent = '我已知晓，且自愿承担所有后果';
        agreeBtn.style.cssText = `background: #fff; color: #14141e; border: 1px solid #ccc; border-radius: 8px; padding: 10px 14px; font-size: 14px; font-weight: bold; cursor: not-allowed; opacity: 0.4; transition: opacity 0.2s; outline: none;`;

        const rejectBtn = document.createElement('button');
        rejectBtn.textContent = '拒绝';
        rejectBtn.style.cssText = `background: #14141e; color: #e05a5a; border: 1px solid #555; border-radius: 8px; padding: 10px 14px; font-size: 14px; cursor: pointer; outline: none;`;

        const dismissRow = document.createElement('label');
        dismissRow.style.cssText = `display: flex; align-items: center; gap: 8px; font-size: 12px; color: #999; cursor: pointer; justify-content: center;`;
        const dismissCheck = document.createElement('input');
        dismissCheck.type = 'checkbox';
        dismissCheck.style.cssText = `width: 14px; height: 14px; cursor: pointer;`;
        const dismissText = document.createElement('span');
        dismissText.textContent = '当日不再提示';
        dismissRow.appendChild(dismissCheck);
        dismissRow.appendChild(dismissText);

        footer.appendChild(statusText);
        footer.appendChild(agreeBtn);
        footer.appendChild(rejectBtn);
        footer.appendChild(dismissRow);

        card.appendChild(title);
        card.appendChild(scroll);
        card.appendChild(footer);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        disclaimerOverlay = overlay;

        // ---- 解锁条件：阅读满 10 秒 且 滚动到底部 ----
        let timeElapsed = false;
        let scrolledToBottom = false;
        let remainSeconds = READ_SECONDS;

        function updateAgreeBtn() {
            const can = timeElapsed && scrolledToBottom;
            agreeBtn.disabled = !can;
            agreeBtn.style.opacity = can ? '1' : '0.4';
            agreeBtn.style.cursor = can ? 'pointer' : 'not-allowed';
        }

        function updateStatusText() {
            if (timeElapsed && scrolledToBottom) {
                statusText.textContent = '';
                return;
            }
            if (timeElapsed && !scrolledToBottom) {
                statusText.textContent = '请滑动至文本底部';
                return;
            }
            if (!scrolledToBottom) {
                statusText.textContent = `请阅读全文并滑动至底部，剩余 ${remainSeconds} 秒`;
            } else {
                statusText.textContent = `请继续阅读，剩余 ${remainSeconds} 秒`;
            }
        }

        function checkScrollBottom() {
            const atBottom = scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 4;
            if (atBottom && !scrolledToBottom) {
                scrolledToBottom = true;
                updateAgreeBtn();
                updateStatusText();
            }
        }

        requestAnimationFrame(() => { checkScrollBottom(); updateStatusText(); });
        scroll.addEventListener('scroll', checkScrollBottom);

        const countdownInterval = setInterval(() => {
            remainSeconds--;
            if (remainSeconds <= 0) {
                clearInterval(countdownInterval);
                timeElapsed = true;
                updateAgreeBtn();
                updateStatusText();
            } else {
                updateStatusText();
            }
        }, 1000);

        function cleanup() {
            clearInterval(countdownInterval);
        }

        agreeBtn.addEventListener('click', () => {
            if (agreeBtn.disabled) return;
            cleanup();
            try { localStorage.setItem(DISCLAIMER_KEY, JSON.stringify({ accepted: true })); } catch (_) { /* 忽略 */ }
            overlay.remove();
            disclaimerOverlay = null;
            panel.style.display = 'flex';
        });

        rejectBtn.addEventListener('click', () => {
            cleanup();
            if (dismissCheck.checked) {
                const d = new Date();
                const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                try { localStorage.setItem(DISCLAIMER_KEY, JSON.stringify({ dismissedDate: today })); } catch (_) { /* 忽略 */ }
            }
            overlay.remove();
            disclaimerOverlay = null;
            panel.style.display = 'none';
        });
    }

    // ========== 真实键盘 Alt 联动 ==========
    document.addEventListener('keydown', e => {
        if (synthesizing || !realKeySyncEnabled) return;
        if (e.key === 'Alt' && !altPressed) setAltState(true, true);
    });
    document.addEventListener('keyup', e => {
        if (synthesizing || !realKeySyncEnabled) return;
        if (e.key === 'Alt' && altPressed) setAltState(false, true);
    });

    // ========== 初始化 ==========
    window.__florrAltPressed = false;
    window.__florrKPressed = false;

    (function init() {
        updatePanel();
        if (isDisclaimerAccepted()) {
            panel.style.display = 'flex';
        } else if (isDismissedToday()) {
            panel.style.display = 'none';
        } else {
            panel.style.display = 'none';
            showDisclaimer();
        }
    })();
})();