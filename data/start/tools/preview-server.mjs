// Local QA only. Production remains a buildless static website.
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const base = resolve('dist');
const portArg = process.argv.indexOf('--port');
const port = Number(portArg >= 0 ? process.argv[portArg + 1] : process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4' };
http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if(url.pathname==='/__qa/liquid-benchmark') {
      response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
      response.end(await readFile(resolve('tools/liquid-benchmark.html')));return;
    }
    if (url.pathname === '/__qa/') {
      response.writeHead(200, { 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store' });
      response.end(await readFile(resolve('tools/qa.html'))); return;
    }
    if (url.pathname === '/__qa/missing-app') {
      const html = (await readFile(resolve(base, 'index.html'), 'utf8'))
        .replace('<head>', '<head><base href="/">')
        .replace(/<script src="app\.js(?:\?[^\"]*)?" defer><\/script>/, '');
      if (html.includes('src="app.js')) throw new Error('QA fallback must omit app.js');
      response.writeHead(200, { 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store' });
      response.end(html); return;
    }
    let filename = resolve(base, '.' + decodeURIComponent(url.pathname));
    if (filename !== base && !filename.startsWith(base + sep)) {
      response.writeHead(403); response.end(); return;
    }
    if ((await stat(filename)).isDirectory()) filename = resolve(filename, 'index.html');
    const info = await stat(filename);
    let start = 0, end = info.size - 1, status = 200;
    if (request.headers.range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range);
      if (!match) { response.writeHead(416); response.end(); return; }
      start = Number(match[1]); end = match[2] ? Number(match[2]) : end;
      if (start > end || end >= info.size) { response.writeHead(416); response.end(); return; }
      status = 206;
    }
    const headers = { 'Content-Type': types[extname(filename)] || 'application/octet-stream', 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
    if (status === 206) headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
    response.writeHead(status, headers);
    if (request.method === 'HEAD') response.end();
    else createReadStream(filename, { start, end }).pipe(response);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(port, '0.0.0.0', () => console.log(`2n QA server ready on ${port}`));
