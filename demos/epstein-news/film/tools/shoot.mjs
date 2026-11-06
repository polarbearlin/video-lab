// 用法：node tools/shoot.mjs still 5 58 97        → out/stills/<t>.png
//       node tools/shoot.mjs video [workers] [t0] [t1] → out/frames/NNNNN.jpg
import { createRequire } from 'node:module';
// playwright：先找全局安装的，再找云端容器预装的位置
const req = createRequire(import.meta.url); let pw; for (const p of ['playwright', '/opt/node-tools/node_modules/playwright/index.js']) { try { pw = req(p); break; } catch {} }
if (!pw) { console.error('找不到 playwright：npm i -g playwright 或设置 NODE_PATH'); process.exit(1); } const { chromium } = pw;
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve('.');
const SIZE = JSON.parse(fs.readFileSync('film.json', 'utf8')).size || [1920, 1080];   // 画幅从 film.json 读
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const port = srv.address().port, [mode, ...args] = process.argv.slice(2);
const browser = await chromium.launch();
async function open() {
  const pg = await browser.newPage({ viewport: { width: SIZE[0], height: SIZE[1] } });
  pg.on('pageerror', e => { console.error('PAGEERROR', e.message); process.exitCode = 1; });
  pg.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
  await pg.goto(`http://127.0.0.1:${port}/index.html`);
  await pg.waitForFunction(() => window.READY, null, { timeout: 60000 });
  return pg;
}
if (mode === 'still') {
  fs.mkdirSync('out/stills', { recursive: true }); const pg = await open();
  for (const t of args.map(Number)) { await pg.evaluate(t => window.render(t), t); await pg.locator('#c').screenshot({ path: `out/stills/${t.toFixed(2)}.png` }); console.log('still', t); }
  console.log('SUBCHECK', JSON.stringify(await pg.evaluate(() => window.SUBCHECK())));
} else if (mode === 'video') {
  const workers = Number(args[0] || 3), dur = await (await open()).evaluate(() => window.DUR);
  const t0 = Number(args[1] || 0), t1 = Number(args[2] || dur), n0 = Math.round(t0 * 30), n1 = Math.round(t1 * 30);
  fs.mkdirSync('out/frames', { recursive: true }); let next = n0; const start = Date.now();
  await Promise.all([...Array(workers)].map(async () => { const pg = await open(); while (next < n1) { const n = next++; await pg.evaluate(t => window.render(t), n / 30); await pg.locator('#c').screenshot({ path: `out/frames/${String(n).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 94 }); if (n % 150 === 0) console.log('frame', n, ((Date.now() - start) / 1000).toFixed(0) + 's'); } }));
}
await browser.close(); srv.close();
