// fillBlanks.js – 自定义问卷渲染与交互（稳定版）

import { decodeRichText } from './decode.js';

export function renderCustomSurvey(container, config, lang, user) {
  if (!container || !config) return;

  const t = config[lang] || config.zh;
  if (!t) return;

  const questions = Object.keys(t)
    .filter(k => /^question\d+$/.test(k))
    .sort((a, b) => parseInt(a.slice(8)) - parseInt(b.slice(8)));

  let html = `<form id="customSurveyForm" class="custom-survey" data-file="${config._file}">`;
  html += `<h3 class="survey-title">${decodeRichText(t.title, 18)}</h3>`;

  for (const qKey of questions) {
    const q = t[qKey];
    html += renderQuestion(q, qKey);
  }

  html += `<div class="survey-actions">
    <button type="button" id="surveySubmit">${lang === 'zh' ? '提交' : 'Submit'}</button>
  </div>`;
  html += `</form>`;

  container.innerHTML = html;

  // 所有题目直接显示（跳过条件判断）
  document.querySelectorAll('#customSurveyForm .survey-question').forEach(el => el.style.display = 'block');

  // 绑定提交按钮
  const submitBtn = document.getElementById('surveySubmit');
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      console.log('[FillBlanks] 提交按钮被点击');
      try {
        const module = await import('./submit.js');
        await module.submitSurvey(config, lang, user);
      } catch (e) {
        console.error('提交模块加载失败:', e);
        alert('提交模块加载失败，请刷新后重试');
      }
    });
  } else {
    console.error('[FillBlanks] 未找到提交按钮');
  }
}

function renderQuestion(q, qKey) {
  const text = q.text || '';
  const blankMatches = [...text.matchAll(/___(\w+)___/g)];
  const selectMatches = [...text.matchAll(/\(_(\w+)_\)/g)];

  let html = `<div class="survey-question" id="${qKey}">`;
  html += `<div class="q-text">`;

  let lastIdx = 0;
  const parts = [];
  const allMatches = [
    ...blankMatches.map(m => ({ type: 'blank', start: m.index, end: m.index + m[0].length, id: m[1] })),
    ...selectMatches.map(m => ({ type: 'select', start: m.index, end: m.index + m[0].length, id: m[1] }))
  ].sort((a, b) => a.start - b.start);

  for (const match of allMatches) {
    if (match.start > lastIdx) {
      parts.push(decodeRichText(text.substring(lastIdx, match.start), 16));
    }
    if (match.type === 'blank') {
      parts.push(renderBlank(match.id, q.blanks?.[match.id]));
    } else {
      parts.push(renderSelect(match.id, q.selects?.[match.id]));
    }
    lastIdx = match.end;
  }
  if (lastIdx < text.length) {
    parts.push(decodeRichText(text.substring(lastIdx), 16));
  }

  html += parts.join('');
  html += `</div></div>`;
  return html;
}

function renderBlank(id, cfg = {}) {
  const required = cfg.required ? 'required' : '';
  const type = cfg.type || 'str';
  let inputType = 'text';
  if (type === 'int' || type === 'float') inputType = 'number';
  let attrs = '';
  if (cfg.min !== undefined) attrs += ` min="${cfg.min}"`;
  if (cfg.max !== undefined) attrs += ` max="${cfg.max}"`;
  if (type === 'str') {
    if (cfg.min) attrs += ` minlength="${cfg.min}"`;
    if (cfg.max) attrs += ` maxlength="${cfg.max}"`;
  }
  return `<span class="blank-wrapper"><input type="${inputType}" name="blank_${id}" data-blank="${id}" ${required} ${attrs} placeholder="${escapeHTML(id)}"></span>`;
}

function renderSelect(id, cfg = {}) {
  const options = cfg.options || [];
  const max = cfg.max || 1;
  const inputType = max > 1 ? 'checkbox' : 'radio';
  let html = `<span class="select-wrapper" data-select="${id}" data-min="${cfg.min || 0}" data-max="${max}">`;
  options.forEach((opt, idx) => {
    html += `<label class="select-option"><input type="${inputType}" name="select_${id}" value="${escapeHTML(opt)}" data-option="${idx}"> ${escapeHTML(opt)}</label>`;
  });
  html += `</span>`;
  return html;
}

function escapeHTML(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}