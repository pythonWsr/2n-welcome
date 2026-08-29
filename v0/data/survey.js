// survey.js – 问卷嵌入模块（增强调试版）

import { getUrlParam } from '../main/explicitPipe.js';
import { getLanguage } from '../main/implicitPipe.js';

async function loadSurveyConfig() {
  const surveyParam = getUrlParam('survey');
  if (surveyParam) {
    // 自动补全 .json 后缀（如果未提供）
    const fileName = surveyParam.endsWith('.json') ? surveyParam : `${surveyParam}.json`;
    console.log(`[Survey] 尝试直接加载指定问卷: ${fileName}`);
    try {
      const directRes = await fetch(`./data/Survey/${fileName}`);
      if (directRes.ok) {
        const config = await directRes.json();
        config._file = fileName;
        console.log(`[Survey] 指定问卷加载成功: ${fileName}`);
        return config;
      } else {
        console.error(`[Survey] 指定问卷加载失败: ${fileName} (HTTP ${directRes.status})`);
        return null;
      }
    } catch (e) {
      console.error(`[Survey] 指定问卷网络错误:`, e);
      return null;
    }
  }

  // 从索引随机选择
  try {
    const indexRes = await fetch('./data/Survey/index.json');
    if (!indexRes.ok) {
      console.error(`[Survey] index.json 加载失败 (HTTP ${indexRes.status})`);
      return null;
    }
    const surveys = await indexRes.json();
    if (!Array.isArray(surveys) || surveys.length === 0) {
      console.warn('[Survey] index.json 为空或无有效问卷');
      return null;
    }

    const today = new Date().toISOString().split('T')[0];
    const activeSurveys = surveys.filter(s => s.start <= today && today <= s.end);
    if (activeSurveys.length === 0) {
      console.warn('[Survey] 当前没有在有效期内的问卷');
      return null;
    }

    const chosen = activeSurveys[Math.floor(Math.random() * activeSurveys.length)];
    console.log(`[Survey] 随机选择问卷: ${chosen.file}`);
    const configRes = await fetch(`./data/Survey/${chosen.file}`);
    if (!configRes.ok) {
      console.error(`[Survey] 问卷文件加载失败: ${chosen.file}`);
      return null;
    }
    const config = await configRes.json();
    config._file = chosen.file;
    return config;
  } catch (e) {
    console.error('[Survey] 加载问卷配置时发生异常:', e);
    return null;
  }
}

export async function renderSurvey(container, user, isMobile = false) {
  if (!container || !user) {
    console.warn('[Survey] 容器不存在或 user 为空，跳过渲染');
    return;
  }

  const config = await loadSurveyConfig();
  if (!config) {
    console.warn('[Survey] 未能加载任何有效问卷');
    return;
  }

  const lang = getLanguage();

  if (config.type === 'iframe') {
    const height = isMobile ? '500px' : '600px';
    container.innerHTML = `
      <div class="survey-wrapper" style="margin-top:16px;">
        <iframe src="${config.link}"
                style="width:100%; height:${height}; border:none; border-radius:12px; overflow:auto;"
                frameborder="0"></iframe>
      </div>
    `;
  } else if (config.type === 'html') {
    try {
      const { renderCustomSurvey } = await import('../main/fillBlanks.js');
      renderCustomSurvey(container, config, lang, user);
    } catch (e) {
      console.error('[Survey] 动态导入 fillBlanks 失败:', e);
      container.innerHTML = '<div class="loading-placeholder">问卷模块加载失败</div>';
    }
  }
}