// Headless screenshots of public pages and tweet embeds. No login.
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, '素材');
const CHROME = process.env.MG_CHROME || '/usr/local/bin/google-chrome';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--font-render-hinting=none', '--force-color-profile=srgb'],
});

async function open(url, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  page.setDefaultNavigationTimeout(50000);
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 50000 });
  } catch (e) {
    console.log('  goto:', e.message.split('\n')[0]);
  }
  await new Promise((r) => setTimeout(r, 1500));
  return page;
}

async function shotTweet(file, id) {
  const url = `https://platform.twitter.com/embed/Tweet.html?id=${id}&theme=light&dnt=true&hide_thread=false`;
  console.log('tweet', file, id);
  const page = await open(url, 700, 1400);
  const box = await page.evaluate(() => {
    const a = document.querySelector('article');
    if (!a) return null;
    const r = a.getBoundingClientRect();
    return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.min(r.width, 680), height: Math.min(r.height, 1300) };
  });
  const dest = path.join(OUT, file);
  if (box && box.width > 40 && box.height > 40) await page.screenshot({ path: dest, clip: box });
  else await page.screenshot({ path: dest });
  console.log('  ', box, dest);
  await page.close();
}

async function shotScroll(file, url, needle, w = 1280, h = 900) {
  console.log('page', file);
  const page = await open(url, w, h);
  const found = await page.evaluate((q) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (n.textContent && n.textContent.includes(q)) {
        const el = n.parentElement;
        el.scrollIntoView({ block: 'center', inline: 'center' });
        return n.textContent.trim().slice(0, 180);
      }
    }
    return '';
  }, needle);
  await new Promise((r) => setTimeout(r, 600));
  const dest = path.join(OUT, file);
  await page.screenshot({ path: dest });
  console.log('  hit:', JSON.stringify(found).slice(0, 200));
  await page.close();
}

try {
  await shotTweet('shot-glm.png', '2119277602066292830');
  await shotTweet('shot-gdb.png', '2119561347805687848');
  await shotTweet('shot-muse.png', '2119263837845369286');
  await shotTweet('shot-openai.png', '2119521359185478140');
  await shotScroll(
    'shot-seed.png',
    'https://seed.bytedance.com/en/blog/more-realistic-images-more-stable-editing-across-100-rounds-introducing-seedream-5-5',
    'Seedream 5.5',
  );
  await shotScroll(
    'shot-step.png',
    'https://platform.stepfun.com/docs/zh/guides/pricing/details',
    '11 月 17',
    1280,
    1000,
  );
  await shotScroll(
    'shot-nvidia.png',
    'https://nvidianews.nvidia.com/news/statement-from-nvidia-board-of-directors',
    'independent investigation',
    1200,
    900,
  );
  await shotScroll(
    'shot-anthropic.png',
    'https://www.anthropic.com/research/components-of-agent-memory',
    'dreaming',
    1280,
    1000,
  );
  await shotScroll(
    'shot-gamefeel.png',
    'https://kodasdream.github.io/gamefeel-benchmark/',
    'Qwen-4-Flash-Early',
    1400,
    1000,
  );
  await shotScroll(
    'shot-muse-blog.png',
    'https://about.fb.com/news/2026/11/introducing-muse-ai-voice-expressive-avatars/',
    'Give Your Muse a Voice',
    1280,
    900,
  );
} finally {
  await browser.close();
}
