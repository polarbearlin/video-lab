// 从网页版导出 Blender 需要的一切（不需要显卡，几分钟）：
//   build/scene.glb        静态纸雕场景 + 逐帧烘焙动画（手机除外，Blender 里用 phone.glb）
//   build/frames.json      每帧：镜头、焦点、光的分区、手机的世界矩阵、手机在画面上的位置
//   build/seq/screen|clock|window|plan/NNNNN.*   每帧变化的画布（手机屏幕、台钟、窗户、计划卡）
//   build/overlay/NNNNN.png   透明字幕层（字幕、手指、热成像 HUD、雪、暗角），compose.py 叠在 Blender 渲染上
// 用法（在仓库根目录）：node demos/charge/blender/export_web.mjs [--from 30] [--to 75]      全片
//                     node demos/charge/blender/export_web.mjs --times 31.8,38.6,…          只导出几个时刻（预览）
import puppeteer from 'puppeteer-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = path.join(ROOT, 'demos/charge/blender/build');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? +process.argv[i + 1] : d; };
const FROM = arg('from', 30), TO = arg('to', 75), STEP = arg('step', 1), FPS = 30;
const TI = process.argv.indexOf('--times'), TIMES = TI > 0 ? process.argv[TI + 1].split(',').map(Number) : null;   // 只导出这些时刻（预览截图用）
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ttf': 'font/ttf', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
}).listen(0);
const port = srv.address().port;
const GPU = process.env.MG_GPU_ARGS ? process.env.MG_GPU_ARGS.split(' ') : [];
const browser = await puppeteer.launch({ executablePath: process.env.MG_CHROME, headless: true, protocolTimeout: 600000, args: [...GPU, '--force-color-profile=srgb', '--font-render-hinting=none', '--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920 });
page.on('pageerror', (e) => console.log('[page error]', e.message));
await page.goto(`http://127.0.0.1:${port}/demos/charge/index.html?v=3d`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__ready === true', { timeout: 300000 });
await page.evaluate(() => document.fonts.ready);
// 字幕层要透明：藏掉 3D 画布和底色、颗粒
await page.addStyleTag({ content: 'html,body,#stage{background:transparent!important}#gl{visibility:hidden}#grain{display:none}' });

for (const d of ['seq/screen', 'seq/clock', 'seq/window', 'seq/plan', 'overlay']) fs.mkdirSync(path.join(OUT, d), { recursive: true });
const save = (rel, dataUrl) => fs.writeFileSync(path.join(OUT, rel), Buffer.from(dataUrl.split(',')[1], 'base64'));
const f0 = Math.round(FROM * FPS), f1 = Math.round(TO * FPS);
const t0 = Date.now();
const LIST = TIMES ? TIMES.map((t) => Math.round(t * FPS)) : Array.from({ length: Math.ceil((f1 - f0) / STEP) }, (_, i) => f0 + i * STEP);
for (const f of LIST) {
  const t = f / FPS, n = String(f + 1).padStart(5, '0');   // 帧号 = t × 30 + 1，和渲染器一致
  const r = await page.evaluate((t) => window.__exportStep(t), t);
  save(`seq/screen/${n}.jpg`, r.screen); save(`seq/clock/${n}.png`, r.clock); save(`seq/window/${n}.jpg`, r.window);
  if (r.plan) save(`seq/plan/${n}.png`, r.plan);
  fs.writeFileSync(path.join(OUT, `overlay/${n}.png`), await page.screenshot({ type: 'png', omitBackground: true, clip: { x: 0, y: 0, width: 1080, height: 1920 } }));
  if ((f - LIST[0]) % 60 === 0) console.log(`  t=${t.toFixed(2)}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
const { glb, frames } = await page.evaluate(() => window.__exportScene());
fs.writeFileSync(path.join(OUT, 'scene.glb'), Buffer.from(glb, 'base64'));
fs.writeFileSync(path.join(OUT, 'frames.json'), JSON.stringify({ fps: FPS, from: FROM, to: TO, step: STEP, first: f0 + 1, frames: frames.map((x, i) => ({ ...x, f: LIST[i] + 1 })) }));
console.log(`done: ${frames.length} frames → ${OUT}`);
await browser.close(); srv.close();
