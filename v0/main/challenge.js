// challenge.js – 一次性令牌验证（TOTP 模式）
import { show403 } from './error403.js';
import { test_admission, other_admission } from '../admission.js';

export function isDeveloper(user) {
  const devUsers = ['debug', 'dev', 'admin'];
  return devUsers.includes(user);
}

// 密钥通过 Actions 注入，默认值仅用于本地测试
const SHARED_SECRET = '461bfcfb2b55ea143d03d784436c73aba371d8ffbe5463d6296d3166bd9a1d48' || 'local-test-secret';

async function generateToken(timeWindow = 30) {
  const now = Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / timeWindow);
  const data = new TextEncoder().encode(counter.toString());
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SHARED_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, data);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function requestTokenFromScript() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
    const handler = (e) => {
      clearTimeout(timeout);
      window.removeEventListener('2n-token-response', handler);
      resolve(e.detail.token);
    };
    window.addEventListener('2n-token-response', handler);
    window.dispatchEvent(new CustomEvent('2n-token-request'));
  });
}

export async function runChallenge(user) {
  if (!test_admission) return;

  console.log(`[Challenge] 为 ${user} 启动一次性令牌验证...`);

  // 检查脚本是否就绪
  let waited = 0;
  while (!window.__tampermonkeyReady && waited < 5000) {
    await new Promise(r => setTimeout(r, 250));
    waited += 250;
  }
  if (!window.__tampermonkeyReady) {
    show403(2);
    throw new Error('脚本未就绪');
  }

  async function verify() {
    try {
      const token = await requestTokenFromScript();
      const expected = await generateToken();
      if (token === expected) return true;
      return false;
    } catch (e) {
      return false;
    }
  }

  // 初次验证
  if (!await verify()) {
    show403(3);
    throw new Error('令牌验证失败');
  }

  // 每 30 秒重新验证一次
  setInterval(async () => {
    console.log('[Challenge] 执行周期性验证...');
    if (!await verify()) {
      show403(3);
      // 验证失败后刷新页面
      location.reload();
    }
  }, 30000);

  console.log('[Challenge] 验证通过，开始周期性检测');
}

export async function initChallenge(user) {
  if (isDeveloper(user)) {
    if (test_admission) {
      await runChallenge(user);
    }
  } else {
    if (!other_admission) {
      show403(1);
      throw new Error('Access denied');
    }
  }
}