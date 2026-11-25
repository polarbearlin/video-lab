// node shoot.mjs still 7.9 18 34.5 …   → out/stills/<t>.png（带透明通道）
// node shoot.mjs video <进程数>          → out/ov/NNNNN.png（30fps，透明背景的图层序列）
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const req = createRequire(import.meta.url); let pw; for (const p of ['playwright', '/opt/node-tools/node_modules/playwright/index.js']) { try { pw = req(p); break; } catch {} }
const root = path.resolve('.'), T = { '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.ttf': 'font/ttf' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const port = srv.address().port, [mode, ...args] = process.argv.slice(2), browser = await pw.chromium.launch();
async function open() { const pg = await browser.newPage({ viewport: { width: 1920, height: 1080 } }); pg.on('pageerror', e => { console.error('PAGEERROR', e.message); process.exitCode = 1; });
  await pg.goto(`http://127.0.0.1:${port}/index.html`); await pg.waitForFunction(() => window.READY, null, { timeout: 120000 }); return pg; }
if (mode === 'still') { fs.mkdirSync('out/stills', { recursive: true }); const pg = await open();
  for (const t of args.map(Number)) { await pg.evaluate(t => window.render(t), t); await pg.screenshot({ path: `out/stills/${t.toFixed(2)}.png`, omitBackground: true }); } }
else { const workers = Number(args[0] || 4), pg0 = await open(), dur = await pg0.evaluate(() => window.DUR), N = Math.round(dur * 30);
  fs.mkdirSync('out/ov', { recursive: true }); let next = 0; const t0 = Date.now();
  await Promise.all([...Array(workers)].map(async (_, w) => { const pg = w ? await open() : pg0; while (next < N) { const n = next++; await pg.evaluate(t => window.render(t), n / 30);
    await pg.screenshot({ path: `out/ov/${String(n).padStart(5, '0')}.png`, omitBackground: true }); if (n % 150 === 0) console.log('frame', n, '/', N, ((Date.now() - t0) / 1000).toFixed(0) + 's'); } }));
  console.log('OPAQUE', JSON.stringify(await pg0.evaluate(() => window.OPAQUE))); }
await browser.close(); srv.close();
