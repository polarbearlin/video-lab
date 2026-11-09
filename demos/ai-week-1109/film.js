// 11.3–11.9 AI 周报拼贴。每一帧只由 t 决定。画面里的照片和网页都是素材/里的实拍。
const q = new URLSearchParams(location.search);
const VERT = q.get('layout') === '916';
const W = VERT ? 1080 : 1920;
const H = VERT ? 1920 : 1080;
const DUR = 55.2;

window.DEMO = { width: W, height: H, fps: 30, duration: DUR };

const canvas = document.getElementById('c');
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d');
const FONT = '"WenQuanYi Micro Hei", "Droid Sans Fallback", sans-serif';

const FILES = {
  poster: '素材/dreamina-seedream55.jpg',
  seed: '素材/shot-seed.png',
  demo: '素材/seedream-demo-f08.jpg',
  step: '素材/shot-step.png',
  glm: '素材/shot-glm.png',
  box: '素材/modretro-box.jpg',
  nov9: '素材/modretro-t11.jpg',
  logo: '素材/modretro-logo.jpg',
  gdb: '素材/shot-gdb.png',
  nv: '素材/shot-nvidia.png',
  opus: '素材/opus-nerf-chart.jpg',
  anth: '素材/shot-anthropic.png',
  game: '素材/shot-gamefeel.png',
  muse: '素材/shot-muse.png',
  museBlog: '素材/shot-muse-blog.png',
};

const BEATS = [
  { id: 'open', t0: 0, t1: 3.4 },
  { id: 'seed', t0: 3.4, t1: 8.2, kicker: '01  图像', title: '同一张图，连改一百轮', sub: '字节 Seedream 5.5：没改到的地方按像素留住，还能直接出透明底。', src: '来源  ByteDance Seed 博客 · Dreamina · 11月9日' },
  { id: 'step', t0: 8.2, t1: 12.8, kicker: '02  语音', title: '阶跃语音，免费到 17 号中午', sub: 'StepAudio 3 限免至北京时间 11 月 17 日 11:59:59，中午起按新价。', src: '来源  阶跃星辰开放平台 · 定价页' },
  { id: 'glm', t0: 12.8, t1: 17.6, kicker: '03  辟谣', title: '32B、122B、256B 是假消息', sub: '智谱研究员 Cunxiang Wang 回复：这几个规模是假的，别再传。', src: '来源  @CunxiangWang · 11月8日' },
  { id: 'retro', t0: 17.6, t1: 22.6, kicker: '04  预告', title: '掌机盒子\n写着明天开卖', sub: 'OpenAI Developers 只发了一个词 Tomorrow。\n片子里写着 11 月 9 日，Supply Co.。', src: '来源  @OpenAIDevs · 11月8日' },
  { id: 'gdb', t0: 22.6, t1: 27.0, kicker: '05  科学', title: '前沿模型\n被说成发现引擎', sub: 'Brockman：加上大量测试时计算，\n前沿模型正在成为科学发现的引擎。', src: '来源  @gdb · 11月8日 22:42 UTC' },
  { id: 'nv', t0: 27.0, t1: 31.8, kicker: '06  调查', title: '英伟达董事会，开始独立调查', sub: '声明称黄仁勋被指成为外国情报行动目标。董事会说，暂无证据表明机密受损。', src: '来源  NVIDIA Newsroom · 11月8日' },
  { id: 'opus', t0: 31.8, t1: 36.8, kicker: '07  争议', title: 'Opus 5.5\n真的被削了吗', sub: '11 月 3 日起，可见思考的措辞变了。\n原图写明：这不能证明权重被改。', src: '来源  @shanemelaugh · 11月7日' },
  { id: 'dream', t0: 36.8, t1: 41.6, kicker: '08  记忆', title: 'Claude 会在空档里“做梦”', sub: 'Anthropic：会话之间重放记录、改正笔记，再整理成一份新的记忆。', src: '来源  Anthropic 研究博客 · 11月6日' },
  { id: 'qwen', t0: 41.6, t1: 46.4, kicker: '09  榜单', title: '做小游戏\n千问暂居第一', sub: 'GameFeel 榜最高分 49.9，\n是还没发布的 Qwen-4-Flash-Early。', src: '来源  GameFeel Benchmark · 更新于 11月8日' },
  { id: 'muse', t0: 46.4, t1: 51.0, kicker: '10  Muse', title: '上线之前，先让它学会跳舞', sub: '发预告的是 Alexandr Wang。Meta 11 月 5 日已在美国开放 Muse 语音。', src: '来源  @alexandr_wang · 11月8日 · Meta Newsroom · 11月5日' },
  { id: 'end', t0: 51.0, t1: 55.2 },
];

const IMG = {};
let grain;

function load(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(src));
    im.src = src;
  });
}

function makeGrain() {
  const c = document.createElement('canvas');
  c.width = 240;
  c.height = 240;
  const g = c.getContext('2d');
  const img = g.createImageData(240, 240);
  let s = 1109;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rnd() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 38;
  }
  g.putImageData(img, 0, 0);
  return c;
}

Promise.all(Object.entries(FILES).map(async ([k, src]) => { IMG[k] = await load(src); }))
  .then(() => { grain = makeGrain(); window.__ready = true; })
  .catch((err) => { console.error(err); });

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const beatAt = (t) => BEATS.find((b) => t >= b.t0 && t < b.t1) || BEATS[BEATS.length - 1];

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function cutout(img, cx, cy, w, rot, crop) {
  const sx = crop ? crop.x * img.width : 0;
  const sy = crop ? crop.y * img.height : 0;
  const sw = crop ? crop.w * img.width : img.width;
  const sh = crop ? crop.h * img.height : img.height;
  const h = w * (sh / sw);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.shadowColor = 'rgba(48, 28, 12, 0.33)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = '#fffdf8';
  roundRect(-w / 2 - 16, -h / 2 - 16, w + 32, h + 32, 8);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.drawImage(img, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function desk() {
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#efe2cf';
  ctx.fillRect(0, 0, W, H);
  const ink = ctx.createLinearGradient(0, 0, 0, H);
  ink.addColorStop(0, 'rgba(255,248,236,0.55)');
  ink.addColorStop(1, 'rgba(120, 78, 40, 0.08)');
  ctx.fillStyle = ink;
  ctx.fillRect(0, 0, W, H);
  if (grain) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    for (let y = 0; y < H; y += grain.height) {
      for (let x = 0; x < W; x += grain.width) ctx.drawImage(grain, x, y);
    }
    ctx.restore();
  }
  ctx.fillStyle = '#c4372a';
  ctx.fillRect(0, 0, VERT ? 14 : 18, H);
}

function masthead() {
  ctx.fillStyle = '#1c1915';
  ctx.font = `700 ${VERT ? 28 : 26}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('北极熊 · AI周报', VERT ? 48 : 64, VERT ? 42 : 36);
  ctx.font = `500 ${VERT ? 24 : 22}px ${FONT}`;
  ctx.fillStyle = '#6d5844';
  ctx.textAlign = 'right';
  ctx.fillText('2026.11.03 — 11.09', W - (VERT ? 40 : 56), VERT ? 46 : 40);
  ctx.strokeStyle = 'rgba(28,25,21,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(VERT ? 48 : 64, VERT ? 92 : 82);
  ctx.lineTo(W - (VERT ? 40 : 56), VERT ? 92 : 82);
  ctx.stroke();
}

function wrap(text, max) {
  const lines = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const ch of para) {
      const test = line + ch;
      if (ctx.measureText(test).width > max && line) {
        lines.push(line);
        line = ch;
      } else line = test;
    }
    if (line) lines.push(line);
  }
  return lines;
}

function copyBlock(b, alpha) {
  const x = VERT ? 56 : 78;
  const y = VERT ? 130 : 160;
  const max = VERT ? W - 112 : 700;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#c4372a';
  ctx.font = `700 ${VERT ? 28 : 26}px ${FONT}`;
  ctx.fillText(b.kicker, x, y);
  ctx.fillStyle = '#1c1915';
  ctx.font = `700 ${VERT ? 68 : 64}px ${FONT}`;
  const title = wrap(b.title, max);
  title.forEach((ln, i) => ctx.fillText(ln, x, y + (VERT ? 56 : 52) + i * (VERT ? 84 : 78)));
  const subY = y + (VERT ? 56 : 52) + title.length * (VERT ? 84 : 78) + 8;
  ctx.fillStyle = '#3d3228';
  ctx.font = `500 ${VERT ? 32 : 28}px ${FONT}`;
  const sub = wrap(b.sub, max);
  sub.forEach((ln, i) => ctx.fillText(ln, x, subY + i * (VERT ? 46 : 42)));
  const srcY = subY + sub.length * (VERT ? 46 : 42) + 18;
  ctx.fillStyle = '#8a5a32';
  ctx.font = `500 ${VERT ? 24 : 22}px ${FONT}`;
  wrap(b.src, max).forEach((ln, i) => ctx.fillText(ln, x, srcY + i * 32));
  ctx.restore();
  return srcY + 40;
}

function scrap(key, cx, cy, w, rot, crop) {
  if (IMG[key]) cutout(IMG[key], cx, cy, w, rot, crop);
}

function content(b, t) {
  const u = (t - b.t0) / (b.t1 - b.t0);
  const inn = ease(u / 0.16);
  const drift = Math.sin(t * 1.3) * 5;
  const slide = (1 - inn) * (VERT ? 70 : 90);
  ctx.save();
  ctx.globalAlpha = inn;
  const textBottom = copyBlock(b, 1);

  if (VERT) {
    const top = Math.max(textBottom + 48, 700);
    if (b.id === 'seed') {
      scrap('poster', W / 2 - 170, top + 300 + drift, 480, -0.05);
      scrap('demo', W / 2 + 160, top + 620, 500, 0.04);
    } else if (b.id === 'step') scrap('step', W / 2, top + 480, 920, -0.02);
    else if (b.id === 'glm') scrap('glm', W / 2, top + 560, 780, 0.03);
    else if (b.id === 'retro') {
      const k = Math.floor(u * 3) % 3;
      scrap(['box', 'nov9', 'logo'][k], W / 2, top + 420, 880, k === 0 ? -0.03 : 0.02);
    } else if (b.id === 'gdb') scrap('gdb', W / 2, top + 260, 880, -0.02);
    else if (b.id === 'nv') scrap('nv', W / 2, top + 420, 900, 0.01, { x: 0, y: 0.34, w: 0.66, h: 0.58 });
    else if (b.id === 'opus') scrap('opus', W / 2, top + 520, 720, -0.02);
    else if (b.id === 'dream') scrap('anth', W / 2, top + 400, 900, 0.02);
    else if (b.id === 'qwen') scrap('game', W / 2, top + 380, 940, -0.012);
    else if (b.id === 'muse') {
      scrap('muse', W / 2, top + 280, 720, -0.03);
      scrap('museBlog', W / 2 + 40, top + 720, 800, 0.04, { x: 0.02, y: 0.18, w: 0.7, h: 0.55 });
    }
  } else {
    const rx = 1360 + slide;
    if (b.id === 'seed') {
      scrap('seed', rx - 20, 300 + drift, 520, 0.04, { x: 0.04, y: 0.08, w: 0.92, h: 0.38 });
      scrap('poster', rx - 80, 620, 400, -0.07);
      scrap('demo', rx + 250, 700, 480, 0.05);
    } else if (b.id === 'step') scrap('step', rx + 40, 560 + drift, 900, -0.025);
    else if (b.id === 'glm') scrap('glm', rx, 560, 600, 0.03);
    else if (b.id === 'retro') {
      const k = Math.floor(u * 3) % 3;
      scrap(['box', 'nov9', 'logo'][k], rx + 20, 560 + drift, 820, k === 0 ? -0.03 : 0.015);
    } else if (b.id === 'gdb') scrap('gdb', rx, 500, 780, -0.03);
    else if (b.id === 'nv') scrap('nv', rx + 10, 560, 860, 0.015, { x: 0.02, y: 0.46, w: 0.64, h: 0.48 });
    else if (b.id === 'opus') scrap('opus', rx - 20, 560, 580, -0.035);
    else if (b.id === 'dream') scrap('anth', rx + 10, 540 + drift, 860, 0.02);
    else if (b.id === 'qwen') scrap('game', rx + 20, 540, 920, -0.015);
    else if (b.id === 'muse') {
      scrap('muse', rx - 80, 460 + drift, 480, -0.05);
      scrap('museBlog', rx + 160, 740, 500, 0.04, { x: 0, y: 0.2, w: 0.62, h: 0.42 });
    }
  }
  ctx.restore();
}

function opening(t) {
  const u = t / 3.4;
  const a = ease(u / 0.35);
  ctx.save();
  ctx.globalAlpha = a;
  scrap('poster', VERT ? 240 : 300, VERT ? 1480 : 800, VERT ? 280 : 320, -0.12);
  scrap('game', VERT ? 820 : 1640, VERT ? 1560 : 820, VERT ? 320 : 380, 0.08);
  scrap('gdb', VERT ? 540 : 980, VERT ? 1420 : 900, VERT ? 280 : 340, 0.04);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = ease(clamp((u - 0.15) / 0.4, 0, 1));
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c4372a';
  ctx.font = `700 ${VERT ? 36 : 32}px ${FONT}`;
  ctx.fillText('本周核对过的十条', W / 2, VERT ? 620 : 340);
  ctx.fillStyle = '#1c1915';
  ctx.font = `700 ${VERT ? 108 : 92}px ${FONT}`;
  ctx.fillText('北极熊的', W / 2, VERT ? 760 : 460);
  ctx.fillText('AI周报', W / 2, VERT ? 890 : 570);
  ctx.fillStyle = '#6d5844';
  ctx.font = `500 ${VERT ? 36 : 32}px ${FONT}`;
  ctx.fillText('2026 年 11 月 3 日 — 9 日', W / 2, VERT ? 1020 : 680);
  ctx.restore();
}

function ending(t) {
  const u = (t - 51) / 4.2;
  const a = ease(u / 0.25);
  ctx.save();
  ctx.globalAlpha = 0.35 * a;
  scrap('poster', VERT ? 180 : 260, VERT ? 360 : 240, 220, -0.1);
  scrap('box', VERT ? 900 : 1680, VERT ? 400 : 220, 280, 0.08);
  scrap('opus', VERT ? 200 : 300, VERT ? 1600 : 900, 240, 0.06);
  scrap('muse', VERT ? 880 : 1640, VERT ? 1560 : 880, 260, -0.05);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1c1915';
  ctx.font = `700 ${VERT ? 84 : 78}px ${FONT}`;
  const y = VERT ? 860 : 430;
  ctx.fillText('北极熊的AI周报', W / 2, y);
  ctx.fillStyle = '#c4372a';
  ctx.fillRect(W / 2 - 70, y + (VERT ? 110 : 100), 140, 8);
  ctx.fillStyle = '#3d3228';
  ctx.font = `500 ${VERT ? 34 : 30}px ${FONT}`;
  ctx.fillText('11 月 3 日 — 11 月 9 日', W / 2, y + (VERT ? 180 : 160));
  ctx.font = `500 ${VERT ? 28 : 24}px ${FONT}`;
  ctx.fillStyle = '#6d5844';
  ctx.fillText('画面里的网页和帖子都来自公开页面', W / 2, y + (VERT ? 250 : 220));
  ctx.fillText('对不上的，这条片子里没有', W / 2, y + (VERT ? 300 : 262));
  ctx.restore();
}

function draw(t) {
  const tt = clamp(t, 0, DUR - 0.001);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, W, H);
  desk();
  masthead();
  const b = beatAt(tt);
  if (b.id === 'open') opening(tt);
  else if (b.id === 'end') ending(tt);
  else content(b, tt);
}

window.renderAt = async (t) => { draw(t); };
