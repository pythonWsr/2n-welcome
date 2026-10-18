import { connect } from 'cloudflare:sockets';

// 2n mail transport protocol v2. Public protected-repo recipient config only.
const WORKER_VERSION = '0.2.2';
const PROTOCOL_VERSION = 2;
const MAX_PART_BYTES = 4 * 1024 * 1024; // hard upper bound, NOT a safe tested size
const MAX_JSON_BYTES = 6 * 1024 * 1024;
const SMTP_HOST = 'smtp.qq.com';
const SMTP_PORT = 465;
const enc = new TextEncoder();
// The exact public GitHub raw path is pinned. Requests cannot select a different repository.
const PUBLIC_RECIPIENTS_URL = 'https://raw.githubusercontent.com/pythonWsr/2n-welcome/main/config/mail-recipients.json';
const CONFIG_TTL_SECONDS = 300;
const CONFIG_MAX_BYTES = 8192;

function response(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

function fail(code, status) {
  const e = new Error(code);
  e.status = status;
  throw e;
}

function equalTokens(a, b) {
  const aa = enc.encode(a);
  const bb = enc.encode(b);
  let difference = aa.length ^ bb.length;
  for (let i = 0; i < Math.max(aa.length, bb.length); ++i) difference |= (aa[i] ?? 0) ^ (bb[i] ?? 0);
  return difference === 0;
}

const SHA = /^[a-f0-9]{40}$|^[a-f0-9]{64}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const IDENTIFIER = /^[a-zA-Z0-9_-]{1,72}$/;
const STATUS = new Set(['up-to-date', 'not-ancestor', 'unknown-base', 'too-large', 'manual-action', 'failed']);

function isUTC(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 19) === value.slice(0, 19);
}
function common(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail('invalid_json_fields', 400);
  for (const x of ['job_id', 'base_sha', 'target_sha', 'generated_at']) {
    if (typeof data[x] !== 'string') fail(`invalid_${x}`, 400);
  }
  if (!IDENTIFIER.test(data.job_id)) fail('invalid_job_id', 400);
  if (!SHA.test(data.base_sha)) fail('invalid_base_sha', 400);
  if (!SHA.test(data.target_sha)) fail('invalid_target_sha', 400);
  if (!isUTC(data.generated_at)) fail('invalid_generated_at', 400);
  if (data.recipient_id !== undefined && !IDENTIFIER.test(data.recipient_id)) fail('invalid_recipient_id', 400);
  return data;
}
function validEmail(v) {
  return typeof v === 'string' && v.length <= 254 && /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,24}$/.test(v);
}
function cleanNotify(data) {
  common(data);
  if (!STATUS.has(data.status)) fail('invalid_status', 400);
  if (typeof data.message !== 'string' || data.message.length > 1200 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(data.message)) fail('invalid_message', 400);
  return data;
}
function toHex(buf) { return [...new Uint8Array(buf)].map(v => v.toString(16).padStart(2, '0')).join(''); }
async function validatePart(data) {
  common(data);
  if (!DIGEST.test(data.sha256)) fail('invalid_sha256', 400);
  if (!DIGEST.test(data.bundle_sha256)) fail('invalid_bundle_sha256', 400);
  if (!Number.isInteger(data.part_index) || !Number.isInteger(data.part_total) || data.part_index < 1 || data.part_total > 256 || data.part_total < 1 || data.part_index > data.part_total) fail('invalid_parts', 400);
  const expectedFile = `bundle.part.${String(data.part_index).padStart(3, '0')}`;
  if (data.filename !== expectedFile) fail('invalid_filename', 400);
  if (typeof data.content_base64 !== 'string') fail('invalid_base64', 400);
  const base64 = data.content_base64;
  const rawSize = base64.length * 3 / 4 - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
  // Reject oversize input before regex/decoding: repeated-group base64 regexes can
  // overflow the JavaScript stack on multi-MiB inputs.
  if (rawSize > MAX_PART_BYTES) fail('invalid_part_size', 413);
  if (!rawSize || base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) fail('invalid_base64', 400);
  const raw = atob(data.content_base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  if (!equalTokens(toHex(await crypto.subtle.digest('SHA-256', bytes)), data.sha256)) fail('sha256_mismatch', 400);
  return data;
}
async function readJson(req) {
  if (req.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') fail('unsupported_media_type', 415);
  const body = req.body;
  if (!body) fail('empty_request', 400);
  const reader = body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_JSON_BYTES) fail('body_too_large', 413);
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const merged = new Uint8Array(total); let pos = 0;
  for (const chunk of chunks) { merged.set(chunk, pos); pos += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(merged)); } catch (_) { fail('invalid_json', 400); }
}

// PUBLIC CONFIG: fixed, audited raw URL. No fourth Cloudflare binding needed.
// If a legacy RECIPIENTS_CONFIG_URL binding is present it must match the fixed
// address; a mismatch fails closed rather than silently redirecting mail.
// Cloudflare Cache API stores validated config for 300 seconds per data center.
function checkConfigURL(env) {
  if (env.RECIPIENTS_CONFIG_URL != null && env.RECIPIENTS_CONFIG_URL !== PUBLIC_RECIPIENTS_URL)
    fail('invalid_config_url', 503);
  return PUBLIC_RECIPIENTS_URL;
}
function parseRecipientConfig(object) {
  if (!object || object.version !== 1 || !Array.isArray(object.recipients) ||
      object.recipients.length < 1 || object.recipients.length > 30) fail('invalid_recipient_config', 503);
  const map = new Map(); let defaultId = null;
  for (const item of object.recipients) {
    if (!item || !IDENTIFIER.test(item.id) || !validEmail(item.email) || map.has(item.id) ||
        (item.default !== undefined && typeof item.default !== 'boolean')) fail('invalid_recipient_config', 503);
    map.set(item.id, item.email);
    if (item.default === true) {
      if (defaultId !== null) fail('invalid_recipient_config', 503);
      defaultId = item.id;
    }
  }
  if (defaultId === null) fail('invalid_recipient_config', 503);
  return { map, defaultId };
}
async function loadRecipients(env) {
  const url = checkConfigURL(env);
  const key = new Request(url, { method: 'GET' });
  const cache = caches.default;
  try {
    const cached = await cache.match(key);
    if (cached) {
      const raw = await cached.text();
      if (enc.encode(raw).byteLength <= CONFIG_MAX_BYTES) {
        try { return parseRecipientConfig(JSON.parse(raw)); }
        catch (_) { /* Do not trust an invalid cache entry */ }
      }
      await cache.delete(key);
    }
  } catch (_) { /* Cache API outage: fetch fresh; never use stale configuration */ }

  let result;
  try {
    result = await fetch(url, {
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
      // Bypass Cloudflare's implicit outbound cache. The validated config is
      // cached explicitly below in the Cache API, not in an upstream API token.
      cf: { cacheTtl: 0 },
      signal: AbortSignal.timeout(8000),
    });
  } catch (_) { fail('recipient_config_unavailable', 503); }
  if (!result.ok) fail('recipient_config_unavailable', 503);
  const length = result.headers.get('Content-Length');
  if (length && Number(length) > CONFIG_MAX_BYTES) fail('invalid_recipient_config', 503);
  let raw;
  try { raw = await result.text(); }
  catch (_) { fail('recipient_config_unavailable', 503); }
  if (enc.encode(raw).byteLength > CONFIG_MAX_BYTES) fail('invalid_recipient_config', 503);
  let object;
  try { object = JSON.parse(raw); }
  catch (_) { fail('invalid_recipient_config', 503); }
  const parsed = parseRecipientConfig(object);
  // Write only a validated representation. Failed fetches and bad configs are never cached.
  try {
    await cache.put(key, new Response(JSON.stringify(object), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CONFIG_TTL_SECONDS}` },
    }));
  } catch (_) { /* Sending still works when Cache API is temporarily unavailable */ }
  return parsed;
}
async function resolveRecipient(env, id) {
  const config = await loadRecipients(env);
  const recipientId = id ?? config.defaultId;
  const email = config.map.get(recipientId);
  if (!email) fail('unknown_recipient_id', 400);
  return { recipientId, email };
}

class SMTP {
  constructor(socket) {
    this.socket = socket;
    this.reader = socket.readable.getReader();
    this.writer = socket.writable.getWriter();
    this.buffer = '';
    this.decoder = new TextDecoder();
  }
  async recv() {
    let replyCode = null;
    for (;;) {
      const at = this.buffer.indexOf('\n');
      if (at >= 0) {
        const line = this.buffer.slice(0, at + 1).replace(/\r?\n$/, '');
        this.buffer = this.buffer.slice(at + 1);
        const match = /^(\d{3})([- ])/.exec(line);
        if (!match || (replyCode && replyCode !== match[1])) throw new Error('smtp_bad_reply');
        replyCode = match[1];
        if (match[2] === ' ') return Number(replyCode);
        continue;
      }
      if (this.buffer.length > 65536) throw new Error('smtp_bad_reply');
      const { done, value } = await this.reader.read();
      if (done) throw new Error('smtp_disconnected');
      this.buffer += this.decoder.decode(value, { stream: true });
    }
  }
  async write(s) { await this.writer.write(enc.encode(s)); }
  async command(s, codes) {
    await this.write(s + '\r\n');
    const code = await this.recv();
    if (!codes.includes(code)) throw new Error(`smtp_response_${code}`);
  }
  async expect(codes) {
    const code = await this.recv();
    if (!codes.includes(code)) throw new Error(`smtp_response_${code}`);
  }
  async close() {
    try { this.writer.releaseLock(); } catch (_) {}
    try { this.reader.releaseLock(); } catch (_) {}
    try { await this.socket.close(); } catch (_) {}
  }
}
async function base64Lines(session, b64) {
  let buffer = '';
  for (let pos = 0; pos < b64.length; pos += 76) {
    buffer += b64.slice(pos, pos + 76) + '\r\n';
    if (buffer.length > 65536) { await session.write(buffer); buffer = ''; }
  }
  if (buffer) await session.write(buffer);
}
function mailFields(p, recipientId, kind) {
  const heads = [
    'X-2N-Protocol-Version: 2',
    `X-2N-Job-ID: ${p.job_id}`,
    `X-2N-Base-SHA: ${p.base_sha}`,
    `X-2N-Target-SHA: ${p.target_sha}`,
    `X-2N-Generated-At: ${p.generated_at}`,
    `X-2N-Recipient-ID: ${recipientId}`,
    `X-2N-Type: ${kind}`,
  ];
  if (kind === 'part') heads.push(
    `X-2N-Bundle-SHA256: ${p.bundle_sha256}`,
    `X-2N-Part: ${String(p.part_index).padStart(3, '0')}/${String(p.part_total).padStart(3, '0')}`,
    `X-2N-SHA256: ${p.sha256}`,
  );
  if (kind === 'notify') heads.push(`X-2N-Status: ${p.status}`);
  return heads;
}
async function deliver(env, p, recipient, kind) {
  if (!env.SMTP_AUTH_CODE || !validEmail(env.SMTP_USERNAME)) fail('smtp_not_configured', 503);
  const socket = connect({ hostname: SMTP_HOST, port: SMTP_PORT }, { secureTransport: 'on' });
  const smtp = new SMTP(socket);
  try {
    await socket.opened;
    await smtp.expect([220]);
    await smtp.command('EHLO 2n-sync-worker', [250]);
    await smtp.command('AUTH LOGIN', [334]);
    await smtp.command(btoa(env.SMTP_USERNAME), [334]);
    await smtp.command(btoa(env.SMTP_AUTH_CODE), [235]);
    await smtp.command(`MAIL FROM:<${env.SMTP_USERNAME}>`, [250]);
    await smtp.command(`RCPT TO:<${recipient.email}>`, [250, 251]);
    await smtp.command('DATA', [354]);
    const subject = kind === 'part' ? `[2n Sync] ${p.job_id} part ${p.part_index}/${p.part_total}` : `[2n Sync] ${p.job_id} ${p.status}`;
    const fields = [
      `From: <${env.SMTP_USERNAME}>`,
      `To: <${recipient.email}>`,
      `Subject: ${subject}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${p.job_id}-${kind === 'part' ? p.part_index : p.status}-${crypto.randomUUID()}@${env.SMTP_USERNAME.split('@')[1]}>`,
      'MIME-Version: 1.0',
      ...mailFields(p, recipient.recipientId, kind),
    ];
    if (kind === 'part') {
      const boundary = `2n-${p.job_id}-${p.part_index}-${crypto.randomUUID()}`;
      const plain = [
        '2n Git Bundle incremental part.',
        `Job: ${p.job_id}`,
        `Base: ${p.base_sha}`,
        `Target: ${p.target_sha}`,
        `Part: ${String(p.part_index).padStart(3, '0')}/${String(p.part_total).padStart(3, '0')}`,
        `SHA256: ${p.sha256}`,
        `BundleSHA256: ${p.bundle_sha256}`,
      ].join('\r\n');
      await smtp.write(fields.concat([
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=us-ascii',
        'Content-Transfer-Encoding: 7bit',
        '',
        plain,
        `--${boundary}`,
        `Content-Type: application/octet-stream; name="${p.filename}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${p.filename}"`,
        '',
        '',
      ]).join('\r\n'));
      await base64Lines(smtp, p.content_base64);
      await smtp.write(`--${boundary}--\r\n.\r\n`);
    } else {
      // Status mail: plain text utf-8 is encoded with base64 to keep message well formed.
      const body = `Status: ${p.status}\nJob: ${p.job_id}\nBase: ${p.base_sha}\nTarget: ${p.target_sha}\nGeneratedAt: ${p.generated_at}\nMessage:\n${p.message}`;
      const bytes = enc.encode(body);
      let latin = '';
      for (const b of bytes) latin += String.fromCharCode(b);
      await smtp.write(fields.concat([
        'Content-Type: text/plain; charset=utf-8',
        'Content-Transfer-Encoding: base64',
        '',
      ]).join('\r\n') + '\r\n');
      await base64Lines(smtp, btoa(latin));
      await smtp.write('.\r\n');
    }
    await smtp.expect([250]);
    try { await smtp.command('QUIT', [221]); } catch (_) { /* accepted already */ }
  } finally { await smtp.close(); }
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/health' && request.method === 'GET') {
      return response({ ok: true, service: '2n-qq-smtp-worker', protocol_version: PROTOCOL_VERSION,
        worker_version: WORKER_VERSION, mail_configured: Boolean(env.SMTP_USERNAME && env.SMTP_AUTH_CODE && env.SEND_API_TOKEN && (env.RECIPIENTS_CONFIG_URL == null || env.RECIPIENTS_CONFIG_URL === PUBLIC_RECIPIENTS_URL)) });
    }
    if (!['/v1/send', '/v1/notify'].includes(path) || request.method !== 'POST') return response({ ok: false, error: 'not_found' }, 404);
    if (!env.SEND_API_TOKEN) return response({ ok: false, error: 'server_not_configured' }, 503);
    const auth = request.headers.get('Authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token || !equalTokens(token, env.SEND_API_TOKEN)) return response({ ok: false, error: 'unauthorized' }, 401);
    try {
      const data = await readJson(request);
      if (path === '/v1/send') await validatePart(data); else cleanNotify(data);
      const recipient = await resolveRecipient(env, data.recipient_id);
      const received_at = new Date().toISOString();
      await deliver(env, data, recipient, path === '/v1/send' ? 'part' : 'notify');
      const result = { ok: true, mail_accepted: true, worker_version: WORKER_VERSION,
        protocol_version: PROTOCOL_VERSION, job_id: data.job_id,
        recipient_id: recipient.recipientId, received_at };
      if (path === '/v1/send') Object.assign(result, { part_index: data.part_index,
        part_total: data.part_total, sha256: data.sha256, bundle_sha256: data.bundle_sha256 });
      else result.status = data.status;
      return response(result);
    } catch (e) {
      const code = String(e?.message || 'internal_error');
      if (e?.status) return response({ ok: false, error: code, worker_version: WORKER_VERSION }, e.status,
        e.status === 503 ? { 'Retry-After': '30' } : {});
      // SMTP may already have accepted a message before a transport timeout. Caller must dedup.
      console.error('mail_delivery_failure', /^smtp_response_\d{3}$/.test(code) ? code : 'transport_error');
      return response({ ok: false, error: 'smtp_delivery_failed', worker_version: WORKER_VERSION }, 502);
    }
  },
};
