// node demos/nianhua_onepiece/render.cjs --stills [--out build/stills]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), get = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUT = path.resolve(get('--out', path.join(__dirname, 'build/stills')));
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => { console.error('ERROR', e.message); process.exit(1); });
  await page.goto('file://' + path.join(__dirname, 'index.html')); await page.evaluate(() => window.ready);
  for (let k = 0; k < 8; k++) { await page.evaluate(k => window.still(k), k); const b64 = await page.evaluate(() => document.getElementById('c').toDataURL('image/png').split(',')[1]); fs.writeFileSync(path.join(OUT, `key_${k + 1}.png`), Buffer.from(b64, 'base64')); }
  await browser.close(); console.log('done →', OUT);
})();
