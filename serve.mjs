// Minimal static file server for local dev: `node serve.mjs` -> http://localhost:8000
import http from 'http';
import { readFile } from 'fs/promises';
import { extname, join, normalize } from 'path';

const PORT = process.env.PORT || 8000;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };

http.createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(req.url.split('?')[0]));
  if (p === '/') p = '/index.html';
  try {
    const data = await readFile(join(process.cwd(), p));
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch { res.writeHead(404); res.end('not found'); }
}).listen(PORT, () => console.log(`Shardfall dev server → http://localhost:${PORT}`));
