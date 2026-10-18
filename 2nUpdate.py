"""2n protocol 2: send exactly one Git Bundle part to the Worker.
Only run this in a trusted CI job; credentials come from WORKER_URL/TOKEN env vars.
"""
import argparse
import base64
import hashlib
import json
import os
import pathlib
import urllib.error
import urllib.request

MAX_PART_BYTES = 4 * 1024 * 1024


def request_worker(endpoint: str, payload: dict) -> dict:
    url = os.environ['WORKER_URL'].rstrip('/') + endpoint
    token = os.environ['WORKER_TOKEN']
    request = urllib.request.Request(
        url,
        json.dumps(payload, separators=(',', ':')).encode(),
        # 增加 User-Agent，防止被 Cloudflare WAF 拦截返回 403
        {
            'Authorization': 'Bearer ' + token, 
            'Content-Type': 'application/json',
            'User-Agent': '2n-sync-client/1.0'
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            result = json.load(response)
    except urllib.error.HTTPError as exc:
        # Never log authorization headers, mailbox address, or attachment content.
        raise RuntimeError(f'Worker HTTP {exc.code} (see API retry table)') from None
    if not result.get('ok') or not result.get('mail_accepted'):
        raise RuntimeError('Worker did not accept email')
    return result


def send_part(opts):
    path = pathlib.Path(opts.file)
    data = path.read_bytes()
    if not 0 < len(data) <= MAX_PART_BYTES:
        raise ValueError('part must be 1 byte to 4 MiB')
    filename = f'bundle.part.{opts.part_index:03d}'
    if path.name != filename:
        raise ValueError(f'filename must equal {filename}')
    payload = {
        'recipient_id': opts.recipient_id,
        'job_id': opts.job_id,
        'base_sha': opts.base.lower(),
        'target_sha': opts.target.lower(),
        'generated_at': opts.generated_at,
        'part_index': opts.part_index,
        'part_total': opts.part_total,
        'filename': filename,
        'sha256': hashlib.sha256(data).hexdigest(),
        'bundle_sha256': opts.bundle_sha256.lower(),
        'content_base64': base64.b64encode(data).decode('ascii'),
    }
    if payload['recipient_id'] is None:
        del payload['recipient_id']
    return request_worker('/v1/send', payload)


def notify(opts):
    payload = {
        'recipient_id': opts.recipient_id,
        'job_id': opts.job_id,
        'base_sha': opts.base.lower(),
        'target_sha': opts.target.lower(),
        'generated_at': opts.generated_at,
        'status': opts.status,
        'message': opts.message,
    }
    if payload['recipient_id'] is None:
        del payload['recipient_id']
    return request_worker('/v1/notify', payload)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    subs = parser.add_subparsers(dest='operation', required=True)
    for name in ('send', 'notify'):
        sub = subs.add_parser(name)
        sub.add_argument('--job-id', required=True)
        sub.add_argument('--base', required=True)
        sub.add_argument('--target', required=True)
        sub.add_argument('--generated-at', required=True, help='ISO 8601 UTC, e.g. 2026-10-17T12:00:00Z')
        sub.add_argument('--recipient-id', default=None, help='Omit to select configured default recipient')
        if name == 'send':
            sub.add_argument('--file', required=True)
            sub.add_argument('--part-index', type=int, required=True)
            sub.add_argument('--part-total', type=int, required=True)
            sub.add_argument('--bundle-sha256', required=True)
        else:
            sub.add_argument('--status', required=True,
                             choices=['up-to-date', 'not-ancestor', 'unknown-base', 'too-large', 'manual-action', 'failed'])
            sub.add_argument('--message', required=True)
    opts = parser.parse_args()
    result = send_part(opts) if opts.operation == 'send' else notify(opts)
    print(json.dumps({k: v for k, v in result.items() if k not in ('email', 'content_base64')}))


if __name__ == '__main__':
    main()
