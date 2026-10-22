// 「一句话 · 一条片」15 秒 UI 动效一镜到底（借鉴 onetake 的方法：每个节拍从上一个节拍里长出来，镜头不切）
// 承接链：光标 → 输入框 → 收成一条线 → 线变成歌词时间轴 → 最后一个歌词块长成风格卡 → 选中的卡长成手机 → 推进手机屏幕即成片 → 收回成一个点 → 点落在字标上
window.DEMO = { width: 1080, height: 1920, fps: 30, duration: 15 };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eIO = (t) => { t = clamp(t); return t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2; };
const eOut = (t) => 1 - (1 - clamp(t)) ** 3;
const eIn = (t) => clamp(t) ** 3;
const sp = (x, k = 7, w = 10) => x <= 0 ? 0 : 1 - Math.exp(-k * x) * Math.cos(w * x);   // 弹簧：x 秒
const $ = (id) => document.getElementById(id);
const W = $('world');
function place(el, x, y, w, h, o = {}) {
  el.style.width = w + 'px'; el.style.height = h + 'px';
  el.style.transform = `translate(${x - w / 2}px,${y - h / 2}px) rotate(${o.r || 0}deg) scale(${o.s ?? 1})`;
  el.style.opacity = o.a ?? 1; el.style.display = (o.a ?? 1) <= 0.001 ? 'none' : 'block';
}

// ---------- 素材
const LINE_Y = 170, BAR_Y = -200, CARD_Y = -330;
const TEXT = '把《老板画饼》做成纸雕MV';
const TYPE_T = [...TEXT].map((_, i) => 1.95 + i * .078 + (i % 4 === 3 ? .05 : 0) + (i > 7 ? .06 : 0));
const CHIPS = [
  { s: '小陈', tc: '0:04', x: -330, t: 3.98 }, { s: '社保咱不交了', tc: '0:07', x: -20, t: 4.12 }, { s: '每月多发五百', tc: '0:10', x: 300, t: 4.24 },
  { s: '画饼', tc: '0:21', x: -330, t: 4.52, row: 1 }, { s: '我可吃不下', tc: '0:25', x: -30, t: 4.63, row: 1 }, { s: '五险一金', tc: '0:31', x: 260, t: 4.74, row: 1 },
];
CHIPS.forEach((c) => { c.el = document.createElement('div'); c.el.className = 'chip'; c.el.innerHTML = `<small>${c.tc}</small>${c.s}`; W.insertBefore(c.el, $('line')); });
const hot = document.createElement('div'); hot.className = 'chip hot'; hot.innerHTML = '选个风格？'; W.insertBefore(hot, $('cardL'));
const WV = []; for (let i = 0; i < 56; i++) { const d = document.createElement('div'); d.className = 'wv'; $('wave').appendChild(d); WV.push(d); }
$('wave').style.cssText = 'position:absolute;left:0;top:0';
const imgs = {}; const load = (k, u) => new Promise((r) => { const i = new Image(); i.onload = () => { imgs[k] = i; r(); }; i.src = u; });
const SEQ = 78, THUMBS = [4, 12, 20, 28, 40, 50, 58, 66];
let markW = 600;
const scr = $('scr'), g = scr.getContext('2d');

// ---------- 镜头：关键帧 [t, cx, cy, s]，段间 eIO
const CAM = [[0, 0, BAR_Y, 2.4], [1.2, 0, BAR_Y, 2.4], [1.85, 0, BAR_Y, 1.2], [3.05, 20, BAR_Y, 1.12], [3.3, 20, BAR_Y, 1.12], [3.95, 0, 60, 1.0],
  [5.35, 0, 40, 1.0], [6.25, 0, CARD_Y + 40, 1.12], [6.95, 0, CARD_Y + 40, 1.12], [7.85, 0, 0, 1.0], [9.35, 0, 0, 1.0], [10.35, 0, 0, 2.0], [12.9, 0, 0, 2.0]];
function cam(t) {
  let k = 0; while (k < CAM.length - 1 && t > CAM[k + 1][0]) k++;
  const A = CAM[k], B = CAM[Math.min(k + 1, CAM.length - 1)], u = A === B ? 0 : eIO((t - A[0]) / (B[0] - A[0]));
  return [lerp(A[1], B[1], u), lerp(A[2], B[2], u), lerp(A[3], B[3], u)];
}
const HITS = [3.15, 6.95, 11.45, 11.85, 12.25];
function shake(t) { let x = 0, y = 0; HITS.forEach((h, i) => { const d = t - h; if (d > 0 && d < .5) { const a = (i >= 2 ? 16 : 6) * Math.exp(-d * 12); x += a * Math.sin(d * 71 + i); y += a * Math.cos(d * 59 + i * 2); } }); return [x, y]; }

window.renderAt = async (t) => {
  // ===== 镜头（12.9 s 之后改由手机自身缩小来收尾）
  let [cx, cy, s] = cam(t);
  const end = t >= 12.9;
  if (end) { cx = 0; cy = 0; s = 1; }
  const still = (t > 10.35 && t < 11.4) || t > 14.3;          // 停顿：手持感也收住
  const hh = still ? .25 : 1;
  const [sx, sy] = shake(t);
  cx += hh * (2.2 * Math.sin(t * 1.3) + 1.2 * Math.sin(t * 3.1)); cy += hh * (1.8 * Math.cos(t * 1.1) + 1.1 * Math.sin(t * 2.7));
  W.style.transform = `translate(${540 + sx}px,${960 + sy}px) scale(${s}) translate(${-cx}px,${-cy}px) rotate(${hh * .12 * Math.sin(t * .9)}deg)`;
  $('dots').style.transform = `translate(${(-cx * s * .3) % 48}px,${(-cy * s * .3) % 48}px)`;

  // ===== 0–1.2 光标；1.2–1.8 光标长成输入框；1.9–3.0 打字；3.15 点发送
  const grow = sp(t - 1.2, 8, 11), coll = eIO(prog(t, 3.3, 3.75));
  const dot = $('dot');
  if (t < 1.25) place(dot, 0, BAR_Y, 8, 64, { a: Math.floor(t * 2.2) % 2 ? .25 : 1 });
  else if (!end) place(dot, 0, 0, 0, 0, { a: 0 });
  const bar = $('bar');
  if (t >= 1.2 && t < 3.8) {
    const bw = lerp(8, 880, grow), bh = lerp(64, 150, grow) * (1 - .08 * Math.sin(Math.PI * prog(t, 3.15, 3.32)));
    const w2 = lerp(bw, 940, coll), h2 = lerp(bh, 10, coll), y2 = lerp(BAR_Y, LINE_Y, eIn(prog(t, 3.42, 3.75)));
    place(bar, w2 > 860 ? 0 : 0, y2, w2, h2);
    bar.style.background = coll > 0 ? `rgb(${lerp(255, 255, coll)},${lerp(255, 90, coll)},${lerp(255, 31, coll)})` : '#fff';
    bar.style.borderRadius = lerp(40, 5, coll) + 'px';
    $('typed').style.opacity = 1 - prog(t, 3.3, 3.45); $('send').style.opacity = clamp(grow * 1.4 - .4) * (1 - prog(t, 3.3, 3.42));
    $('send').style.transform = `scale(${1 - .14 * Math.sin(Math.PI * prog(t, 3.12, 3.3))})`;
    const n = TYPE_T.filter((x) => t >= x).length; $('tt').textContent = TEXT.slice(0, n);
    $('tcaret').style.opacity = t > 3.0 && Math.floor(t * 3) % 2 ? 0 : 1;
  } else place(bar, 0, 0, 0, 0, { a: 0 });
  // 手：滑到发送键 → 点 → 离开 → 回来点中间的卡
  let hx = 620, hy = 900, hs = 1;
  if (t > 2.55 && t < 3.6) { const u = eIO(prog(t, 2.55, 3.05)); hx = lerp(560, 380, u); hy = lerp(220, BAR_Y + 30, u); hs = 1 - .16 * Math.sin(Math.PI * prog(t, 3.08, 3.25)); hx += 60 * eIn(prog(t, 3.3, 3.6)); hy += 300 * eIn(prog(t, 3.3, 3.6)); }
  else if (t > 6.2 && t < 7.5) { const u = eIO(prog(t, 6.2, 6.85)); hx = lerp(420, 40, u); hy = lerp(200, CARD_Y + 120, u); hs = 1 - .16 * Math.sin(Math.PI * prog(t, 6.88, 7.05)); hx += 400 * eIn(prog(t, 7.1, 7.5)); hy += 200 * eIn(prog(t, 7.1, 7.5)); }
  place($('hand'), hx + 30, hy + 40, 90, 110, { s: hs, a: (t > 2.55 && t < 3.6) || (t > 6.2 && t < 7.5) ? 1 : 0 });

  // ===== 3.75–5.4 线就是时间轴：波形扫出来，歌词块落在上面（一阵密集的"爆发"）
  const lineOn = t >= 3.75 && t < 6.6, sink = eIO(prog(t, 5.6, 6.4));
  place($('line'), 0, LINE_Y + sink * 260, 940, 10, { a: lineOn ? 1 - sink : 0 });
  WV.forEach((d, i) => { const x = -462 + i * 16.8, hgt = (14 + 70 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * .43))) * eOut(prog(t, 3.78 + i * .012, 4.0 + i * .012)); place(d, x, LINE_Y + 18 + hgt / 2 + sink * 260, 9, Math.max(.1, hgt), { a: lineOn ? 1 - sink : 0 }); });
  CHIPS.forEach((c) => { const d = sp(t - c.t, 9, 13), y = LINE_Y - 60 - (c.row ? 92 : 0); place(c.el, c.x, lerp(y - 120, y, d) + sink * 260, c.s.length * 32 + 110, 62, { a: t >= c.t && lineOn ? clamp((t - c.t) * 8) * (1 - sink) : 0, r: (1 - d) * (c.x > 0 ? 8 : -8) }); });
  // ===== 5.0 最后一块"选个风格？"落下 → 5.55–6.3 长成中间那张风格卡，两侧的卡从它背后滑出
  const hotD = sp(t - 5.0, 9, 13), toCard = eIO(prog(t, 5.55, 6.3));
  const CW = 300, CH = 533;
  if (t >= 5.0 && t < 6.3) {
    const y0 = lerp(LINE_Y - 330, LINE_Y - 244, hotD);
    place(hot, 0, lerp(y0, CARD_Y, toCard), lerp(260, CW, toCard), lerp(66, CH, toCard), { a: clamp((t - 5) * 8) });
    hot.style.borderRadius = lerp(30, 28, toCard) + 'px'; hot.style.color = `rgba(255,255,255,${1 - toCard * 2})`;
  } else place(hot, 0, 0, 0, 0, { a: 0 });
  const fan = eOut(prog(t, 5.95, 6.45)), flyOut = eIn(prog(t, 7.02, 7.4));
  const sideOn = t >= 5.95 && t < 7.45;
  place($('cardL'), lerp(0, -340, fan) - 900 * flyOut, CARD_Y + 20 * fan, CW, CH, { r: -7 * fan - 20 * flyOut, a: sideOn ? 1 : 0, s: lerp(.9, .92, fan) });
  place($('cardR'), lerp(0, 340, fan) + 900 * flyOut, CARD_Y + 20 * fan, CW, CH, { r: 7 * fan + 20 * flyOut, a: sideOn ? 1 : 0, s: lerp(.9, .92, fan) });
  const labA = sideOn ? fan * (1 - flyOut * 3) : 0;
  place($('labL'), lerp(0, -340, fan) - 900 * flyOut, CARD_Y + 320, 300, 60, { a: labA, r: -7 * fan });
  place($('labR'), lerp(0, 340, fan) + 900 * flyOut, CARD_Y + 320, 300, 60, { a: labA, r: 7 * fan });
  place($('labC'), 0, CARD_Y + 310, 300, 60, { a: t >= 6.1 && t < 7.3 ? clamp((t - 6.1) * 5) * (1 - prog(t, 7.05, 7.25)) : 0 });

  // ===== 中间的卡 = 手机：6.3 起就是它；7.05–7.85 长成手机；屏幕里：卡图 → 渲染格子 → 成片
  const ph = $('phone');
  const toPh = eIO(prog(t, 7.05, 7.85)), pick = 1 + .05 * Math.sin(Math.PI * prog(t, 6.9, 7.15));
  const PW = 576, PH = 996, BORDER = 18;
  if (t >= 5.55 && t < 6.3) {   // 卡图在"选个风格？"长大的同时浮现：同一个东西，不是换了一张
    const w = lerp(260, CW, toCard), h = lerp(66, CH, toCard);
    place(ph, 0, lerp(LINE_Y - 244, CARD_Y, toCard), w, h, { a: prog(t, 5.85, 6.25) });
    ph.style.borderRadius = '28px'; ph.style.background = '#ff5a1f';
    scr.style.left = scr.style.top = '0px'; scr.style.width = w + 'px'; scr.style.height = h + 'px'; scr.style.borderRadius = '28px'; scr.style.opacity = 1;
    drawScreen(t);
  } else if (t >= 6.3) {
    let w = lerp(CW, PW, toPh), h = lerp(CH, PH, toPh), x = 0, y = lerp(CARD_Y, 0, toPh), b = lerp(0, BORDER, toPh), r = lerp(28, 66, toPh), sc = pick;
    if (end) {   // 收尾：整部手机（此刻正好铺满全屏）缩回一个点
      const u = eIO(prog(t, 12.95, 13.75)); sc = lerp(2, 32 / PW, u); h = lerp(PH, PW, eIO(prog(t, 13.1, 13.6))); r = lerp(66, PW / 2 * 1.0, eIO(prog(t, 13.2, 13.75)));
      b = lerp(BORDER, 0, prog(t, 13.3, 13.6));
    }
    place(ph, x, y, w, h, { s: sc, a: end && t > 13.75 ? 0 : 1 });
    ph.style.borderRadius = r + 'px'; ph.style.padding = '0';
    ph.style.background = end && t > 13.4 ? '#ff5a1f' : '#161412';
    scr.style.left = b + 'px'; scr.style.top = b + 'px'; scr.style.width = (w - 2 * b) + 'px'; scr.style.height = (h - 2 * b) + 'px';
    scr.style.borderRadius = Math.max(0, r - b) + 'px'; scr.style.opacity = end ? 1 - prog(t, 13.35, 13.6) : 1;
    drawScreen(t);
  } else place(ph, 0, 0, 0, 0, { a: 0 });

  // ===== 11.45 / 11.85 / 12.25 三下重击
  const words = ['一句话', '一首歌', '一条片']; let wi = -1; HITS.slice(2).forEach((h, i) => { if (t >= h) wi = i; });
  const wEl = $('w');
  if (wi >= 0 && t < 12.95) {
    const d = t - HITS[2 + wi]; wEl.textContent = words[wi]; wEl.style.color = wi === 2 ? '#ff7a45' : '#fff7ec';
    wEl.style.transform = `scale(${1 + .35 * Math.exp(-d * 22)})`; wEl.style.opacity = 1 - prog(t, 12.75, 12.95);
    $('words').style.background = `rgba(15,10,6,${.45 * (1 - prog(t, 12.75, 12.95))})`;
  } else { wEl.textContent = ''; $('words').style.background = 'transparent'; }

  // ===== 13.75 点出来，跳到字标的位置当句号；字标升起
  if (end && t >= 13.7) {
    const u = sp(t - 13.85, 8, 12), j = eIO(prog(t, 13.85, 14.25));
    const MX = -20, MY = 40, ex = MX + markW / 2 + 22, ey = MY + 52;   // 字标末尾的句号位置
    const arc = -170 * Math.sin(Math.PI * j);
    const dsz = lerp(32, 30, u);
    place(dot, lerp(0, ex, j), lerp(0, ey, j) + arc, dsz, dsz, { a: 1 }); dot.style.borderRadius = '50%';
    const m = eOut(prog(t, 13.95, 14.4));
    place($('mark'), MX, MY + 40 * (1 - m), markW + 4, 200, { a: m });
    place($('sub'), 0, 170 + 20 * (1 - eOut(prog(t, 14.25, 14.6))), 600, 60, { a: eOut(prog(t, 14.25, 14.6)) });
  } else { place($('mark'), 0, 0, 0, 0, { a: 0 }); place($('sub'), 0, 0, 0, 0, { a: 0 }); if (t >= 1.25) dot.style.borderRadius = '6px'; }
};

function drawScreen(t) {
  g.fillStyle = '#161412'; g.fillRect(0, 0, 540, 960);
  if (t < 7.85) { g.drawImage(imgs.paper, 0, 0, 540, 960); return; }
  // 7.85–9.35 渲染格子：缩略图一格格亮起，进度条走完
  const mergeU = eIO(prog(t, 8.95, 9.5));
  if (t < 9.5) {
    const cols = 2, rows = 4, gw = 230, gh = 180, ox = 30, oy = 120;
    g.fillStyle = '#f7f2ea'; g.font = '700 30px Sans'; g.fillText('渲染中', 30, 70);
    const fr = Math.min(2160, Math.round(2160 * eIO(prog(t, 7.95, 8.95))));
    g.font = '400 30px Ins'; g.fillStyle = '#ff9a6b'; g.textAlign = 'right'; g.fillText(`${fr} / 2160 帧`, 510, 70); g.textAlign = 'left';
    THUMBS.forEach((k, i) => {
      const on = prog(t, 7.95 + i * .11, 8.07 + i * .11), x = ox + (i % cols) * (gw + 20), y = oy + Math.floor(i / cols) * (gh + 20);
      g.globalAlpha = (.15 + .85 * on) * (1 - mergeU); g.save(); g.beginPath(); g.roundRect(x, y, gw, gh, 14); g.clip();
      g.drawImage(imgs['th' + k], x, y - 60, gw, gw * 16 / 9); g.restore(); g.globalAlpha = 1;
    });
    g.fillStyle = '#3a332c'; g.fillRect(30, 930, 480, 8); g.fillStyle = '#ff5a1f'; g.fillRect(30, 930, 480 * fr / 2160, 8);
  }
  // 9.0 起：成片画面从中间那格放大铺满，播放真实渲染的画面
  if (t >= 9.0) {
    const fi = Math.min(SEQ - 1, Math.max(0, Math.floor((t - 9.0) * 30)));
    const x = lerp(270, 0, mergeU), y = lerp(500, 0, mergeU), w = lerp(0, 540, mergeU), h = lerp(0, 960, mergeU);
    g.drawImage(imgs['f' + fi], x, y, w, h);
    if (t > 12.6) { const fi2 = SEQ - 1; g.drawImage(imgs['f' + fi2], 0, 0, 540, 960); }
  }
}

(async () => {
  const L = [load('paper', 'img/paper.jpg')];
  THUMBS.forEach((k) => L.push(load('th' + k, `img/th${k}.jpg`)));
  for (let i = 0; i < SEQ; i++) L.push(load('f' + i, `img/seq/f${String(i + 1).padStart(3, '0')}.jpg`));
  await Promise.all(L);
  await Promise.all([document.fonts.load('600 46px Sans'), document.fonts.load('900 200px Serif'), document.fonts.load('190px Ins'), document.fonts.load('24px InsI')]);
  [...document.images].forEach((i) => i.decode && i.decode());
  await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => i.onload = r)));
  { const c = document.createElement('canvas').getContext('2d'); c.font = '190px Ins'; markW = c.measureText('video lab').width - 2 * 2; }
  window.__ready = true;
})();
