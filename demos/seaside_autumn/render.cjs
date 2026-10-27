// 无头 Chrome 逐帧导出：node demos/seaside_autumn/render.cjs [--stills] [--frames 0,10] [--out build/frames]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), get = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUT = path.resolve(get('--out', path.join(__dirname, 'build/frames')));
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => { console.error('ERROR', e.message); process.exit(1); });
  await page.goto('file://' + path.join(__dirname, 'index.html')); await page.evaluate(() => window.ready);
  const grab = async name => { const b64 = await page.evaluate(() => document.getElementById('c').toDataURL('image/png').split(',')[1]); fs.writeFileSync(path.join(OUT, name), Buffer.from(b64, 'base64')); };
  if (args.includes('--stills')) { const n = await page.evaluate(() => SHOTS.length); for (let k = 0; k < n; k++) { await page.evaluate(k => window.still(k), k); await grab(`shot_${k + 1}.png`); } }
  else { const N = await page.evaluate(() => N); const list = get('--frames') ? get('--frames').split(',').map(Number) : [...Array(N).keys()];
    for (const i of list) { await page.evaluate(i => window.render(i), i); await grab(`f_${String(i).padStart(4, '0')}.png`); if (i % 60 === 0) console.log('frame', i); } }
  await browser.close(); console.log('done →', OUT);
})();
