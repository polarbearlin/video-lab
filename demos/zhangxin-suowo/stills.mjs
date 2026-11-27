// 出选样关键帧 + 自动检查文字框
//   node demos/zhangxin-suowo/stills.mjs            → stills/styleA_1.png … styleC_3.png + stills/report.json
//   node demos/zhangxin-suowo/stills.mjs B 17.6     → 只出 B 风格在 17.6 秒的一帧（调试用，写到 out/）
// 检查项：文字框出画（距边 < 16px）、字幕和其它文字互相压住；缺字由 check_glyphs.py 按字体 cmap 查。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.MG_CHROME || '/usr/local/bin/google-chrome';
const [only, onlyT] = process.argv.slice(2);
const KEYS = [1.40, 17.60, 36.50];
const W = 1920, H = 1080, M = 16;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--allow-file-access-from-files', '--font-render-hinting=none'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H });
page.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exitCode = 1; });
page.on('console', m => console.log('[page]', m.text()));

const report = [];
const problems = [];
const outDir = path.join(DIR, only ? 'out' : 'stills');
fs.mkdirSync(outDir, { recursive: true });
for (const style of only ? [only] : ['A', 'B', 'C']) {
  await page.goto('file://' + path.join(DIR, 'index.html') + '?style=' + style, { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true', { timeout: 120000 });
  const times = onlyT ? [+onlyT] : KEYS;
  for (let k = 0; k < times.length; k++) {
    const t = times[k];
    await page.evaluate(t => window.renderAt(t), t);
    const b64 = await page.evaluate(() => document.getElementById('c').toDataURL('image/png').split(',')[1]);
    const name = onlyT ? `style${style}_t${t}_${Date.now() % 1e6}.png` : `style${style}_${k + 1}.png`;
    fs.writeFileSync(path.join(outDir, name), Buffer.from(b64, 'base64'));
    const boxes = await page.evaluate(() => window.__boxes);
    report.push({ file: name, t, boxes });
    for (const b of boxes) {
      if (b.x0 < M || b.y0 < M || b.x1 > W - M || b.y1 > H - M) problems.push(`${name}: 出框「${b.text}」 [${b.x0.toFixed(0)},${b.y0.toFixed(0)},${b.x1.toFixed(0)},${b.y1.toFixed(0)}]`);
    }
    const subs = boxes.filter(b => b.layer === 'sub');
    if (!subs.length) problems.push(`${name}: 没有字幕`);
    for (const s of subs) for (const o of boxes) {
      if (o === s || o.layer === 'sub') continue;
      if (o.x0 < s.x1 && o.x1 > s.x0 && o.y0 < s.y1 && o.y1 > s.y0) problems.push(`${name}: 字幕「${s.text}」和「${o.text}」(${o.layer}) 重叠`);
    }
    const heroes = boxes.filter(b => b.layer === 'hero' || b.layer === 'badge');
    for (let i = 0; i < heroes.length; i++) for (let j = i + 1; j < heroes.length; j++) {
      const a = heroes[i], c = heroes[j];
      if (a.x0 < c.x1 - 2 && a.x1 > c.x0 + 2 && a.y0 < c.y1 - 2 && a.y1 > c.y0 + 2) problems.push(`${name}: 「${a.text}」和「${c.text}」重叠`);
    }
    console.log(name, 'subtitle:', subs.map(s => s.text).join(' | '));
  }
}
await browser.close();
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 1));
console.log(problems.length ? '问题：\n' + problems.join('\n') : '文字框检查通过：无出框、无字幕遮挡、无大字互相重叠');
