import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

let source = await readFile(new URL('../src/index.js', import.meta.url), 'utf8');
source = source.replace("import { connect } from 'cloudflare:sockets';", 'const connect = globalThis.__mockConnect;');
const smtpReplies = [220, 250, 334, 334, 235, 250, 250, 354, 250, 221]
  .map(n => `${n} ${n} Mock OK\r\n`).join('');
let sent = '';
let smtpConnections = 0;
globalThis.__mockConnect = () => {
  smtpConnections++;
  const readable = new ReadableStream({
    start(ctrl) { ctrl.enqueue(new TextEncoder().encode(smtpReplies)); ctrl.close(); },
  });
  const writable = new WritableStream({ write(bytes) { sent += new TextDecoder().decode(bytes); } });
  return { opened: Promise.resolve(), readable, writable, close: async () => {} };
};
const config = {
  version: 1,
  recipients: [{ id: '20180333', email: 'receiver@example.com', default: true }],
};
let liveConfig = config;
let fetchCount = 0;
let fetchedURL;
globalThis.fetch = async (url) => {
  fetchCount++; fetchedURL = url;
  return new Response(JSON.stringify(liveConfig), {
    headers: { 'content-type': 'application/json' },
  });
};
const stored = new Map();
globalThis.caches = { default: {
  async match(req) {
    const item = stored.get(req.url);
    if (!item || Date.now() >= item.expires) { stored.delete(req.url); return undefined; }
    return item.value.clone();
  },
  async put(req, resp) {
    const maxAge = Number(resp.headers.get('cache-control').match(/max-age=(\d+)/)[1]);
    stored.set(req.url, { expires: Date.now() + maxAge * 1000, value: resp.clone() });
  },
  async delete(req) { return stored.delete(req.url); },
}};
const mod = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const url = 'https://mail.example.test';
const configURL = 'https://raw.githubusercontent.com/pythonWsr/2n-welcome/main/config/mail-recipients.json';
const env = {
  SEND_API_TOKEN: 'test-secret', SMTP_USERNAME: 'sender@qq.com', SMTP_AUTH_CODE: 'test-authorization',
  // No RECIPIENTS_CONFIG_URL needed: the production raw URL is pinned in code.
};
const health = await (await mod.default.fetch(new Request(url + '/health'), env)).json();
assert.equal(health.worker_version, '0.2.2');
assert.equal(health.protocol_version, 2);
assert.equal(health.mail_configured, true);
// A legacy binding is accepted only when it equals the pinned URL.
const goodLegacyHealth = await (await mod.default.fetch(new Request(url + '/health'), { ...env, RECIPIENTS_CONFIG_URL: configURL })).json();
assert.equal(goodLegacyHealth.mail_configured, true);
const badLegacyHealth = await (await mod.default.fetch(new Request(url + '/health'), { ...env, RECIPIENTS_CONFIG_URL: 'https://evil.example/config' })).json();
assert.equal(badLegacyHealth.mail_configured, false);
const healthEmpty = await (await mod.default.fetch(new Request(url + '/health'), {})).json();
assert.equal(healthEmpty.mail_configured, false);
const shaA = 'a'.repeat(40), shaB = 'b'.repeat(40);
const partBytes = Buffer.from('this is one git bundle part');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const part = {
  recipient_id: '20180333', job_id: '123456-1-bbbbbbb', base_sha: shaA, target_sha: shaB,
  generated_at: '2026-10-17T12:00:00Z', part_index: 1, part_total: 1,
  filename: 'bundle.part.001', sha256: hash(partBytes), bundle_sha256: hash(partBytes),
  content_base64: partBytes.toString('base64'),
};
const request = (path, body, token = env.SEND_API_TOKEN) => new Request(url + path, {
  method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
async function status(req, bindings = env) { return mod.default.fetch(req, bindings); }
let r = await status(request('/v1/send', part, 'bad-token'));
assert.equal(r.status, 401);
assert.equal(fetchCount, 0);
for (const [payload, expected] of [
  [{ ...part, filename: 'bundle.part.000' }, 400],
  [{ ...part, sha256: 'f'.repeat(64) }, 400],
  [{ ...part, part_total: 257 }, 400],
  [{ ...part, content_base64: Buffer.alloc(4 * 1024 * 1024 + 1).toString('base64') }, 413],
]) {
  r = await status(request('/v1/send', payload));
  assert.equal(r.status, expected);
}
assert.equal(fetchCount, 0);
r = await status(request('/v1/send', part), { ...env, RECIPIENTS_CONFIG_URL: 'https://evil.example/config' });
assert.equal(r.status, 503);
assert.equal((await r.json()).error, 'invalid_config_url');
assert.equal(fetchCount, 0);
liveConfig = { version: 1, recipients: [{ id: 'bad', email: 'receiver@example.com' }] };
r = await status(request('/v1/send', part));
assert.equal(r.status, 503);
assert.equal((await r.json()).error, 'invalid_recipient_config');
assert.equal(stored.size, 0, 'invalid config must not be cached');
liveConfig = config;
sent = '';
r = await status(request('/v1/send', { ...part, recipient_id: 'unknown' }));
assert.equal(r.status, 400);
assert.equal((await r.json()).error, 'unknown_recipient_id');
assert.equal(smtpConnections, 0);
r = await status(request('/v1/send', part));
assert.equal(r.status, 200);
const receipt = await r.json();
assert.equal(receipt.bundle_sha256, part.bundle_sha256);
assert.equal(receipt.worker_version, '0.2.2');
assert.equal(receipt.protocol_version, 2);
assert.match(receipt.received_at, /^\d{4}-\d\d-\d\dT/);
assert.equal(fetchedURL, configURL);
assert.equal(stored.size, 1);
assert.equal(fetchCount, 2, 'invalid config + later valid config, then cached');
for (const header of ['X-2N-Protocol-Version: 2', 'X-2N-Job-ID:', 'X-2N-Base-SHA:',
  'X-2N-Target-SHA:', 'X-2N-Bundle-SHA256:', 'X-2N-Generated-At:',
  'X-2N-Recipient-ID: 20180333', 'X-2N-Type: part', 'X-2N-Part: 001/001',
  'X-2N-SHA256:', 'filename="bundle.part.001"']) assert.ok(sent.includes(header), header);
assert.ok(!sent.includes(env.SEND_API_TOKEN));
assert.equal((sent.match(/Content-Disposition: attachment/g) ?? []).length, 1);
const lines = part.content_base64.match(/.{1,76}/g).join('\r\n') + '\r\n';
assert.ok(sent.includes(lines + '--2n-'), 'exactly one CRLF between base64 and end boundary');
assert.ok(!sent.includes(lines + '\r\n--2n-'), 'no extra CRLF before end boundary');
const partCount = smtpConnections;
sent = '';
r = await status(request('/v1/notify', {
  job_id: part.job_id, base_sha: shaA, target_sha: shaB,
  generated_at: part.generated_at, status: 'too-large', message: 'Too many parts',
}));
assert.equal(r.status, 200);
assert.equal(smtpConnections, partCount + 1);
assert.ok(sent.includes('X-2N-Type: notify'));
assert.ok(sent.includes('X-2N-Status: too-large'));
assert.ok(!sent.includes('Content-Disposition: attachment'));
assert.match(sent, /[A-Za-z0-9+/=]+\r\n\.\r\nQUIT/);
assert.equal(fetchCount, 2, 'valid cache should avoid additional raw GitHub requests');
r = await status(request('/v1/notify', {
  job_id: part.job_id, base_sha: shaA, target_sha: shaB, generated_at: part.generated_at,
  status: 'too-large', message: 'bad\u0000message',
}));
assert.equal(r.status, 400);
console.log('PASS v0.2.2: auth, config validation/cache, MIME boundaries, notify, headers, SHA, size, status');
