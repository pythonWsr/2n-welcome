// submit.js – 收集答案并提交到 Cloudflare Worker

export async function submitSurvey(config, lang, user) {
  // 收集填空题
  const blankInputs = document.querySelectorAll('[data-blank]');
  const blanks = {};
  for (const inp of blankInputs) {
    blanks[inp.dataset.blank] = inp.value;
  }

  // 收集选择题
  const selectWrappers = document.querySelectorAll('[data-select]');
  const selects = {};
  for (const wrapper of selectWrappers) {
    const id = wrapper.dataset.select;
    const checked = Array.from(wrapper.querySelectorAll('input:checked')).map(el => el.value);
    selects[id] = checked;
  }

  const payload = {
    file: config._file,
    user,
    lang,
    answers: { blanks, selects },
    weights: config.weights
  };

  console.log('提交数据:', payload);

  const WORKER_URL = 'https://super-feather-a36a.wusiruibaidu04.workers.dev/';
  // 如果 ca0d00d22e154bfb7ee5e180409c5a33 被注入，则使用真实密钥；否则使用一个不会暴露的占位，但此时将无法通过验证。
  let SUBMIT_SECRET = 'ca0d00d22e154bfb7ee5e180409c5a33';
  if (SUBMIT_SECRET.startsWith('__') && SUBMIT_SECRET.endsWith('__')) {
    console.error('SUBMIT_SECRET 尚未注入，请确保 GitHub Actions 已运行成功');
    alert('提交功能未就绪，请联系管理员。');
    return;
  }

  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Submit-Secret': SUBMIT_SECRET
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert(lang === 'zh' ? '提交成功！' : 'Submitted successfully!');
    } else {
      const text = await res.text();
      alert(lang === 'zh' ? `提交失败 (${res.status}): ${text}` : `Submission failed (${res.status}): ${text}`);
    }
  } catch (e) {
    alert(lang === 'zh' ? `网络错误: ${e.message}` : `Network error: ${e.message}`);
  }
}