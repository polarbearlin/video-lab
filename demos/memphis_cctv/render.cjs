// 用无头 Chrome 逐帧导出：node demos/memphis_cctv/render.cjs [--frames 0,150,260,360] [--out build/memphis/frames]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), get = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const HERE = __dirname, OUT = path.resolve(get('--out', path.join(HERE, '../../demos/memphis_cctv/build/frames')));
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('console', m => console.log('page:', m.text())); page.on('pageerror', e => { console.error('ERROR', e.message); process.exit(1); });
  await page.goto('file://' + path.join(HERE, 'index.html')); await page.evaluate(() => window.ready);
  const N = await page.evaluate(() => N);
  const list = get('--frames', null) ? get('--frames').split(',').map(Number) : [...Array(N).keys()];
  const canvas = await page.$('#c'); const t0 = Date.now();
  for (const i of list) {
    await page.evaluate(i => window.render(i), i);
    const b64 = await page.evaluate(() => document.getElementById('c').toDataURL('image/png').split(',')[1]);
    fs.writeFileSync(path.join(OUT, `f_${String(i).padStart(4, '0')}.png`), Buffer.from(b64, 'base64'));
    if (i % 30 === 0) console.log(`frame ${i} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
  await browser.close(); console.log('done →', OUT);
})();
