// 《汐屿的秋天》MV · 孟菲斯风格 · 竖屏（1080×1920，30fps）
// 每个分镜是一张"分层插画"：前景 / 中景 / 远景按不同速度跟着镜头动（视差），换机位只是换镜头参数。
// 关键歌词是画面里的真东西：黑板上的粉笔字、海堤上的刷墙字、柚子摊的招牌、课本里的纸条、灯塔光里的字。
// frame(i, ctx)：确定性，同一帧号永远画出同一张图。shotStill(k, ctx)：第 k 个分镜的代表帧（样帧用）。
const W = 1080, H = 1920, FPS = 30;
const VX = 56, VY = 70, VW = 968, VH = 1500;
const C = { yellow: '#FFC93C', pink: '#FF8DB5', cobalt: '#2E5BE6', coral: '#FF5A5F', mint: '#A9E6C6', sky: '#8DD3F6', lilac: '#D3BEFF',
  ink: '#25214A', cream: '#FFF6E5', white: '#FFFFFF', paper: '#F6E7C1', wood: '#C98A55', board: '#2C3B4F' };
const FONT_HAND = '"WenKai"', FONT_FUN = '"KuaiLe"', FONT_UI = '"NotoSC"';

// ---------------------------------------------------------------- 工具
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (a, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, a));
const smooth = a => { a = clamp(a); return a * a * (3 - 2 * a); };
const lerp = (a, b, k) => a + (b - a) * k;

// 孟菲斯基本笔触：先画深靛色硬投影，再填色，再铺图案，最后描边
function ink(ctx, path, fill, o = {}) {
  const sh = o.sh ?? 10, lw = o.lw ?? 5;
  if (sh) { ctx.save(); ctx.translate(sh, sh); path(); ctx.fillStyle = C.ink; ctx.fill(); ctx.restore(); }
  path(); ctx.fillStyle = fill; ctx.fill();
  if (o.pat) { ctx.save(); path(); ctx.clip(); o.pat(); ctx.restore(); }
  if (lw) { path(); ctx.lineWidth = lw; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
}
const P = ctx => ({   // 常用形状
  rect: (x, y, w, h) => () => { ctx.beginPath(); ctx.rect(x, y, w, h); },
  rr: (x, y, w, h, r) => () => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); },
  circ: (x, y, r) => () => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); },
  ell: (x, y, rx, ry, a = 0) => () => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); },
  poly: pts => () => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); },
});
function dots(ctx, x0, y0, x1, y1, step, r, col, stagger = true) {
  ctx.fillStyle = col;
  for (let y = y0, j = 0; y < y1 + step; y += step, j++) for (let x = x0 + (stagger && j % 2 ? step / 2 : 0); x < x1 + step; x += step) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
}
function stripes(ctx, x0, y0, x1, y1, step, w, col, ang = 0) {
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0);
  ctx.translate(cx, cy); ctx.rotate(ang); for (let y = -R; y < R; y += step) { ctx.beginPath(); ctx.moveTo(-R, y); ctx.lineTo(R, y); ctx.stroke(); } ctx.restore();
}
function zig(ctx, x0, x1, y, amp, step, col, w = 4) {
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'miter'; ctx.beginPath();
  for (let x = x0, k = 0; x <= x1 + step; x += step, k++) ctx.lineTo(x, y + (k % 2 ? -amp : amp)); ctx.stroke();
}
function waveRow(ctx, x0, x1, y, amp, step, col, w = 4, ph = 0) {
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
  for (let x = x0; x <= x1; x += 6) ctx.lineTo(x, y + Math.sin((x / step) * Math.PI * 2 + ph) * amp); ctx.stroke();
}
// 文字：刷墙字 / 招牌字（快乐体，填色 + 描边 + 硬投影）
function painted(ctx, s, x, y, px, fill, o = {}) {
  ctx.save(); ctx.font = `${px}px ${FONT_FUN}`; ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  if (o.rot) { ctx.translate(x, y); ctx.rotate(o.rot); x = 0; y = 0; }
  const sh = o.sh ?? px * .07; ctx.fillStyle = C.ink; ctx.fillText(s, x + sh, y + sh);
  ctx.lineWidth = o.lw ?? px * .09; ctx.strokeStyle = C.ink; ctx.strokeText(s, x, y); ctx.fillStyle = fill; ctx.fillText(s, x, y); ctx.restore();
}
// 粉笔字（文楷，白色、带一点抖动和粉笔灰）
function chalk(ctx, s, x, y, px, o = {}) {
  ctx.save(); ctx.font = `${px}px ${FONT_HAND}`; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'middle';
  const r = rng(s.length * 31 + px); for (let k = 0; k < 4; k++) { ctx.fillStyle = `rgba(255,255,255,${k ? .22 : .85})`; ctx.fillText(s, x + (r() - .5) * 3, y + (r() - .5) * 3); }
  ctx.restore();
}
// 手写字（文楷，墨色，可以褪色）
function hand(ctx, s, x, y, px, col, o = {}) {
  ctx.save(); ctx.font = `${px}px ${FONT_HAND}`; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = col;
  if (o.rot) { ctx.translate(x, y); ctx.rotate(o.rot); x = 0; y = 0; } ctx.fillText(s, x, y); ctx.restore();
}

// 镜头：每个分镜一个 cam = {x, y, z, r}（画面坐标 0..VW × 0..VH）；layer(p) 是视差系数（0 不动的远景，1 正常，>1 前景）
function layer(ctx, cam, p, draw) {
  ctx.save(); ctx.translate(VX + VW / 2, VY + VH / 2); ctx.rotate(cam.r * p); ctx.scale(1 + (cam.z - 1) * p, 1 + (cam.z - 1) * p);
  ctx.translate(-(VW / 2 + (cam.x - VW / 2) * p), -(VH / 2 + (cam.y - VH / 2) * p)); draw(); ctx.restore();
}

// ---------------------------------------------------------------- 公共小物件
function gull(ctx, x, y, s, t, ph = 0) {
  const fl = Math.sin(t * 9 + ph) * s * .45; ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(3, s * .16); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - s, y - fl); ctx.quadraticCurveTo(x - s * .4, y - s * .35, x, y); ctx.quadraticCurveTo(x + s * .4, y - s * .35, x + s, y - fl); ctx.stroke();
}
function cloud(ctx, x, y, s) {
  const q = P(ctx), path = () => { ctx.beginPath(); ctx.roundRect(x - s * 1.3, y - s * .2, s * 2.6, s * .55, s * .27); ctx.arc(x - s * .45, y - s * .15, s * .42, Math.PI, 0); ctx.arc(x + s * .35, y - s * .2, s * .55, Math.PI, 0); ctx.closePath(); };
  ink(ctx, path, C.white, { sh: 9, lw: 4, pat: () => { ctx.strokeStyle = C.lilac; ctx.lineWidth = 3; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x - s, y + s * .12 + k * 9); ctx.lineTo(x + s * .8, y + s * .12 + k * 9); ctx.stroke(); } } });
}
function sun(ctx, x, y, R, col = C.yellow, sc = C.coral) {
  const q = P(ctx); ink(ctx, q.circ(x, y, R), col, { sh: 10, lw: 5, pat: () => { for (let i = -8; i < 8; i++) { ctx.strokeStyle = sc; ctx.lineWidth = R * .07; ctx.beginPath(); ctx.moveTo(x - R, y + i * R * .24); ctx.lineTo(x + R, y + i * R * .24 - R * .3); ctx.stroke(); } } });
}
function lighthouse(ctx, x, base, h, t, lit = false) {   // 红白条纹灯塔
  const q = P(ctx), w0 = h * .2, w1 = h * .13;
  ink(ctx, q.poly([[x - w0 / 2, base], [x + w0 / 2, base], [x + w1 / 2, base - h * .78], [x - w1 / 2, base - h * .78]]), C.white,
    { sh: 10, pat: () => { ctx.fillStyle = C.coral; for (let k = 0; k < 4; k++) ctx.fillRect(x - w0, base - h * .78 + k * h * .2, w0 * 2, h * .1); } });
  ink(ctx, q.rect(x - w1 * .75, base - h * .92, w1 * 1.5, h * .14), lit ? C.yellow : C.sky, { sh: 6, lw: 4, pat: () => stripes(ctx, x - w1, base - h, x + w1, base - h * .78, 10, 3, C.ink, Math.PI / 2) });
  ink(ctx, q.poly([[x - w1, base - h * .92], [x + w1, base - h * .92], [x, base - h * 1.05]]), C.coral, { sh: 6, lw: 4 });
  ink(ctx, q.rect(x - w1 * 1.05, base - h * .79, w1 * 2.1, h * .025), C.ink, { sh: 0, lw: 2 });
}
function boatSide(ctx, x, y, s, hull, cabin, bob = 0) {
  const q = P(ctx); y += bob;
  ink(ctx, q.poly([[x - s, y - s * .25], [x + s, y - s * .25], [x + s * .75, y + s * .18], [x - s * .8, y + s * .18]]), hull, { sh: 8, pat: () => stripes(ctx, x - s, y - s * .1, x + s, y - s * .02, 14, 4, C.white) });
  ink(ctx, q.rect(x - s * .35, y - s * .62, s * .55, s * .37), cabin, { sh: 6, lw: 4, pat: () => dots(ctx, x - s * .3, y - s * .55, x + s * .2, y - s * .3, 16, 3.5, C.ink) });
  ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + s * .35, y - s * .25); ctx.lineTo(x + s * .35, y - s * 1.1); ctx.stroke();
}
function windChime(ctx, x, y, s, t) {   // 屋檐下的风铃（前奏的风铃声）
  const sw = Math.sin(t * 2.4) * .18, q = P(ctx);
  ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, s * .5); ctx.stroke();
  ink(ctx, q.poly([[-s * .45, s * .9], [s * .45, s * .9], [s * .3, s * .5], [-s * .3, s * .5]]), C.sky, { sh: 6, lw: 4, pat: () => dots(ctx, -s * .5, s * .5, s * .5, s * .9, 14, 3, C.white) });
  for (const [dx, len, col] of [[-.28, 1.2, C.yellow], [0, 1.45, C.coral], [.28, 1.1, C.mint]]) {
    const a = Math.sin(t * 3.1 + dx * 9) * .12; ctx.save(); ctx.translate(dx * s, s * .9); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, s * (len - .9)); ctx.stroke(); ink(ctx, q.rr(-s * .07, s * (len - .9), s * .14, s * .38, s * .05), col, { sh: 4, lw: 3 }); ctx.restore();
  }
  ctx.beginPath(); ctx.moveTo(0, s * .9); ctx.lineTo(0, s * 1.6); ctx.stroke(); ink(ctx, q.poly([[-s * .12, s * 1.6], [s * .12, s * 1.6], [0, s * 1.95]]), C.pink, { sh: 4, lw: 3 });
  ctx.restore();
}
function bike(ctx, x, y, s, frame = C.coral, t = 0, rider = null) {   // 侧面单车（可带一个骑车的少年）
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; const R = s * .42, rot = t * 8;
  for (const wx of [x - s * .62, x + s * .62]) {
    ctx.save(); ctx.translate(6, 6); ctx.strokeStyle = C.ink; ctx.lineWidth = s * .09; ctx.beginPath(); ctx.arc(wx, y, R, 0, 7); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = C.ink; ctx.lineWidth = s * .09; ctx.beginPath(); ctx.arc(wx, y, R, 0, 7); ctx.stroke();
    ctx.lineWidth = 2.5; for (let k = 0; k < 4; k++) { const a = rot + k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(wx - Math.cos(a) * R, y - Math.sin(a) * R); ctx.lineTo(wx + Math.cos(a) * R, y + Math.sin(a) * R); ctx.stroke(); }
  }
  const seat = [x - s * .2, y - s * .62], bar = [x + s * .45, y - s * .72], crank = [x - s * .02, y];
  ctx.strokeStyle = C.ink; ctx.lineWidth = s * .16; ctx.beginPath(); ctx.moveTo(x - s * .62, y); ctx.lineTo(...crank); ctx.lineTo(...seat); ctx.closePath(); ctx.moveTo(...crank); ctx.lineTo(bar[0] - s * .05, bar[1] + s * .1); ctx.lineTo(...seat); ctx.moveTo(bar[0] - s * .05, bar[1] + s * .1); ctx.lineTo(x + s * .62, y); ctx.stroke();
  ctx.strokeStyle = frame; ctx.lineWidth = s * .09; ctx.stroke();
  ctx.strokeStyle = C.ink; ctx.lineWidth = s * .08; ctx.beginPath(); ctx.moveTo(...bar); ctx.lineTo(bar[0] - s * .12, bar[1] - s * .05); ctx.moveTo(seat[0] - s * .12, seat[1] - s * .04); ctx.lineTo(seat[0] + s * .1, seat[1] - s * .04); ctx.stroke();
  const q = P(ctx);
  ink(ctx, q.rr(bar[0] - s * .02, bar[1] + s * .02, s * .3, s * .2, s * .04), C.yellow, { sh: 4, lw: 3, pat: () => stripes(ctx, bar[0], bar[1], bar[0] + s * .3, bar[1] + s * .25, 8, 2, C.ink, Math.PI / 4) });   // 车筐
  if (rider) {   // 穿校服的少年（背影 / 侧影，不画五官）
    const pd = Math.sin(t * 8) * s * .12, hip = [seat[0], seat[1] - s * .08], sh_ = [x + s * .05, y - s * 1.35];
    ctx.strokeStyle = C.ink; ctx.lineWidth = s * .13; ctx.beginPath(); ctx.moveTo(...hip); ctx.lineTo(crank[0] + s * .15, crank[1] - s * .35 + pd); ctx.lineTo(crank[0] + pd * .5, crank[1] + s * .05); ctx.stroke();
    ctx.strokeStyle = C.cobalt; ctx.lineWidth = s * .08; ctx.stroke();
    ink(ctx, q.poly([[hip[0] - s * .14, hip[1] + s * .04], [hip[0] + s * .16, hip[1] + s * .04], [sh_[0] + s * .17, sh_[1]], [sh_[0] - s * .17, sh_[1] + s * .02]]), rider.shirt, { sh: 5, lw: 4, pat: () => stripes(ctx, hip[0] - s * .3, sh_[1], hip[0] + s * .4, hip[1], 22, 5, rider.stripe, 0) });
    ctx.strokeStyle = C.ink; ctx.lineWidth = s * .1; ctx.beginPath(); ctx.moveTo(sh_[0] + s * .08, sh_[1] + s * .1); ctx.lineTo(...bar); ctx.stroke(); ctx.strokeStyle = '#FFD9B8'; ctx.lineWidth = s * .05; ctx.stroke();
    ink(ctx, q.circ(sh_[0], sh_[1] - s * .2, s * .17), C.ink, { sh: 4, lw: 3 });
    if (rider.bag) ink(ctx, q.rr(sh_[0] - s * .36, sh_[1] + s * .05, s * .2, s * .34, s * .05), rider.bag, { sh: 4, lw: 3 });
  }
}
function pomelo(ctx, x, y, r) {
  const q = P(ctx); ink(ctx, q.ell(x, y, r, r * 1.08), C.yellow, { sh: Math.max(3, r * .18), lw: Math.max(2.5, r * .12), pat: () => dots(ctx, x - r, y - r, x + r, y + r, r * .38, r * .045, '#E0A82A') });
  ctx.fillStyle = C.white; ctx.beginPath(); ctx.ellipse(x - r * .35, y - r * .4, r * .16, r * .1, -.6, 0, 7); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(2, r * .1); ctx.beginPath(); ctx.moveTo(x, y - r * 1.05); ctx.lineTo(x + r * .05, y - r * 1.4); ctx.stroke();
}
function leaf(ctx, x, y, s, ang, col = C.yellow) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  const path = () => { ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * .7, s, 0); ctx.quadraticCurveTo(0, s * .7, -s, 0); ctx.closePath(); };
  ink(ctx, path, col, { sh: Math.max(2, s * .12), lw: Math.max(2, s * .1) }); ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(1.5, s * .07); ctx.beginPath(); ctx.moveTo(-s * .8, 0); ctx.lineTo(s * .8, 0); ctx.stroke();
  ctx.restore();
}
function seaBlock(ctx, x0, y0, x1, y1, t, col = C.cobalt, line = C.sky, dot = C.white) {   // 孟菲斯海面：色块 + 波浪线 + 圆点
  const q = P(ctx); ink(ctx, q.rect(x0, y0, x1 - x0, y1 - y0), col, { sh: 0, lw: 0, pat: () => {
    for (let y = y0 + 30, k = 0; y < y1; y += 46, k++) waveRow(ctx, x0, x1, y, 6 + k * .4, 70 + k * 6, line, 4, t * 1.6 + k);
    dots(ctx, x0 + 20, y0 + 52, x1, y1, 92, 4, dot);
  } });
}

// ---------------------------------------------------------------- 分镜（每个返回 {cap, draw(ctx, t)}；t 是这个分镜里的秒数）
const SHOTS = [];
// 1 · 前奏 · 航拍下降：清晨的海、条纹灯塔、小城屋顶；前景屋檐下的风铃在晃
SHOTS.push({ key: 'harbor', cap: ['十月 · 清晨的渔港', 'October · Dawn over the Harbor'], geo: [24.6213, 118.2702], dur: 5, draw(ctx, t, v = 'dawn') {
  const night = v === 'night', noon = v === 'noon', q = P(ctx);
  const cam = noon ? { x: VW / 2, y: VH / 2 + 40 - t * 40, z: 1.14 - t * .03, r: 0 } : { x: VW / 2, y: VH / 2 - 60 + t * 18, z: 1.12 - t * .02, r: 0 };
  layer(ctx, cam, .15, () => {
    const bands = night ? [['#1E2A6B', -200], [C.cobalt, 260], ['#3B3A86', 420], [C.lilac, 540]] : noon ? [[C.sky, -200], [C.sky, 260], ['#BDE7FA', 420], [C.cream, 540]] : [[C.lilac, -200], [C.pink, 260], [C.yellow, 420], [C.cream, 520]];
    for (const [c, y] of bands) { ctx.fillStyle = c; ctx.fillRect(-200, y, VW + 400, 500); }
    if (night) { const r = rng(6); for (let k = 0; k < 40; k++) { ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(r() * VW, r() * 560 - 100, 2 + r() * 3, 0, 7); ctx.fill(); } ink(ctx, q.circ(260, 200, 70), C.cream, { sh: 8, lw: 5, pat: () => dots(ctx, 190, 130, 330, 270, 30, 6, C.lilac) }); }
    else { sun(ctx, VW * .62, noon ? 240 : 600, noon ? 100 : 120, C.yellow, C.coral); cloud(ctx, 230, 330, 70); cloud(ctx, 520, 170, 52); }
  });
  layer(ctx, cam, .4, () => { seaBlock(ctx, -200, 600, VW + 200, 1700, t, night ? '#2B2F7A' : C.cobalt, night ? C.lilac : C.sky, night ? C.yellow : C.white); if (!night) for (let k = 0; k < 4; k++) gull(ctx, 300 + k * 70 + t * 30, 330 + Math.sin(k) * 40, 22, t, k); });
  layer(ctx, cam, .7, () => {
    ink(ctx, q.poly([[520, 980], [VW + 200, 930], [VW + 200, 1010], [540, 1030]]), C.lilac, { sh: 8, pat: () => stripes(ctx, 520, 930, VW + 200, 1030, 20, 5, C.ink, -.8) });   // 防波堤
    if (night) { const a = t * .9; ctx.save(); ctx.translate(780, 659); ctx.rotate(a); ctx.fillStyle = 'rgba(255,233,140,.38)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1300, -150); ctx.lineTo(1300, 150); ctx.closePath(); ctx.fill(); ctx.restore(); }
    lighthouse(ctx, 780, 960, 330, t, night);
    boatSide(ctx, 300, 1020, 70, C.coral, C.yellow, Math.sin(t * 1.5) * 4);
  });
  layer(ctx, cam, 1.1, () => {   // 小城屋顶
    const r = rng(11), cols = [C.coral, C.yellow, C.pink, C.mint, C.sky, C.lilac];
    for (let i = 0; i < 7; i++) { const x = -60 + i * 160, h = 120 + r() * 80, top = 1250 - h * .4, c = cols[i % 6];
      ink(ctx, q.rect(x, top + 60, 150, 600), night ? C.lilac : C.cream, { sh: 10, pat: () => { for (let k = 0; k < 2; k++) ink(ctx, q.rect(x + 25 + k * 60, top + 110, 36, 46), night ? C.yellow : C.sky, { sh: 0, lw: 3 }); } });
      ink(ctx, q.poly([[x - 14, top + 64], [x + 75, top - 10], [x + 164, top + 64]]), c, { sh: 10, pat: () => stripes(ctx, x - 14, top - 10, x + 164, top + 64, 16, 4, C.ink, .3) }); }
  });
  if (!noon) layer(ctx, cam, 1.6, () => { ink(ctx, q.rect(-100, -40, VW + 200, 110), C.coral, { sh: 12, pat: () => zig(ctx, -100, VW + 100, 25, 14, 30, C.yellow, 6) }); windChime(ctx, VW * .78, 70, 170, t); });
} });
// 2 · 前奏 · 正上方俯拍：渔船进港，码头上鱼筐排开，水面一圈圈波纹
SHOTS.push({ key: 'dock', cap: ['十月 · 渔船进港', 'October · Boats Coming Home'], geo: [24.6198, 118.2731], dur: 5, draw(ctx, t) {
  const cam = { x: VW / 2, y: VH / 2, z: 1.0 + t * .015, r: -.05 + t * .012 }, q = P(ctx);
  layer(ctx, cam, 1, () => {
    ink(ctx, q.rect(-300, -300, VW + 600, VH + 600), C.cobalt, { sh: 0, lw: 0, pat: () => dots(ctx, -300, -300, VW + 300, VH + 300, 60, 4, C.sky) });
    const bx = 520, by = 760 - Math.max(0, 2.2 - t) * 120;   // 进港的船（俯视）+ 波纹
    for (let k = 0; k < 4; k++) { const rr = ((t * 70 + k * 90) % 360) + 40; ctx.strokeStyle = `rgba(255,255,255,${.9 - rr / 420})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(bx, by, rr, rr * .7, 0, 0, 7); ctx.stroke(); }
    ink(ctx, q.rect(-300, 980, VW + 600, 900), C.paper, { sh: 14, pat: () => { stripes(ctx, -300, 980, VW + 300, 1900, 44, 4, C.wood, Math.PI / 2); } });   // 码头木板
    for (let i = 0; i < 6; i++) ink(ctx, q.circ(120 + i * 140, 1100 + (i % 2) * 70, 48), [C.yellow, C.mint, C.coral, C.sky][i % 4], { sh: 8, pat: () => stripes(ctx, 60 + i * 140, 1040, 180 + i * 140, 1180, 14, 4, C.ink, .8) });   // 鱼筐
    for (let i = 0; i < 5; i++) { const px = 180 + i * 150, py = 1300 + Math.sin(t * 2 + i) * 6; ink(ctx, q.circ(px, py, 30), [C.coral, C.cobalt, C.pink, C.yellow, C.mint][i], { sh: 6, lw: 4 }); ink(ctx, q.circ(px, py, 14), C.ink, { sh: 0, lw: 0 }); }   // 人（俯视：肩膀 + 头）
    for (const [x, y, c, a] of [[200, 520, C.yellow, .3], [800, 420, C.pink, -.2], [bx, by, C.coral, 0]]) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ink(ctx, q.poly([[0, -150], [62, -60], [62, 120], [-62, 120], [-62, -60]]), c, { sh: 10, pat: () => stripes(ctx, -70, -150, 70, 130, 30, 6, C.white, Math.PI / 2) });
      ink(ctx, q.rect(-36, -20, 72, 70), C.white, { sh: 5, lw: 4, pat: () => dots(ctx, -30, -14, 30, 44, 18, 3.5, C.ink) }); ctx.restore(); }
    ink(ctx, q.rect(-300, 960, VW + 600, 26), C.coral, { sh: 0, lw: 4, pat: () => stripes(ctx, -300, 960, VW + 300, 986, 26, 10, C.white, Math.PI / 4) });
  });
} });
// 3 · 主歌 · 教室：黑板上的粉笔字"海风把十月 吹进教室的窗"，窗外是海，窗帘鼓起来，粉笔灰在阳光里飘
SHOTS.push({ key: 'classroom', cap: ['十月 · 海风吹进教室', 'October · Sea Breeze in the Classroom'], geo: [24.6231, 118.2689], dur: 5, lyric: '海风把十月 吹进教室的窗', draw(ctx, t) {
  const cam = { x: VW / 2 - 40 + t * 16, y: VH / 2, z: 1.04 + t * .012, r: 0 }, q = P(ctx);
  layer(ctx, cam, .9, () => {
    ink(ctx, q.rect(-100, -100, VW + 200, VH + 200), C.mint, { sh: 0, lw: 0, pat: () => dots(ctx, -100, -100, VW + 100, VH + 100, 70, 4, 'rgba(37,33,74,.12)') });
    ink(ctx, q.rect(-100, 1080, VW + 200, 600), C.lilac, { sh: 0, pat: () => stripes(ctx, -100, 1080, VW + 100, 1700, 60, 4, C.ink, .35) });   // 地面
    ink(ctx, q.rect(40, 230, 600, 400), C.board, { sh: 14, lw: 8 });                                                                 // 黑板
    ink(ctx, q.rect(40, 618, 600, 22), C.wood, { sh: 0, lw: 4 });
    chalk(ctx, '十月', 90, 360, 150); chalk(ctx, '海风把十月', 92, 500, 52); chalk(ctx, '吹进教室的窗', 150, 566, 52);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(90, 440); ctx.quadraticCurveTo(220, 455, 330, 432); ctx.stroke();   // 粉笔下划线
    // 窗：窗外是海和灯塔
    ink(ctx, q.rect(690, 180, 300, 520), C.sky, { sh: 12, lw: 8, pat: () => { seaBlock(ctx, 690, 470, 990, 700, t); lighthouse(ctx, 900, 500, 170, t); cloud(ctx, 780, 290, 40); } });
    ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(840, 180); ctx.lineTo(840, 700); ctx.moveTo(690, 440); ctx.lineTo(990, 440); ctx.stroke();
    const bl = Math.sin(t * 2.2) * 30 + 90;   // 窗帘：从窗帘杆垂下来，被海风鼓进教室
    ctx.strokeStyle = C.ink; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(660, 168); ctx.lineTo(1000, 168); ctx.stroke();
    const curtain = () => { ctx.beginPath(); ctx.moveTo(680, 168); ctx.lineTo(800, 168); ctx.bezierCurveTo(800 - bl * .2, 330, 790 - bl * .9, 520, 770 - bl * 1.2, 720); ctx.quadraticCurveTo(720 - bl * 1.3, 760, 660 - bl * 1.1, 730); ctx.bezierCurveTo(670 - bl * .8, 520, 690 - bl * .3, 330, 680, 168); ctx.closePath(); };
    ink(ctx, curtain, C.pink, { sh: 10, pat: () => { dots(ctx, 500, 160, 820, 780, 26, 6, C.white); ctx.strokeStyle = 'rgba(37,33,74,.35)'; ctx.lineWidth = 4; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(680 + k * 30, 170); ctx.quadraticCurveTo(690 + k * 20 - bl * .6, 450, 670 - bl * (1.2 - k * .1) + k * 25, 730); ctx.stroke(); } } });
    // 课桌（两排，越近越大）
    for (const [y, s] of [[980, 1], [1240, 1.35]]) for (let i = 0; i < 3; i++) { const x = 120 + i * 300 * s - (s - 1) * 260, w = 200 * s;
      ink(ctx, q.poly([[x, y], [x + w, y], [x + w + 30 * s, y + 60 * s], [x - 30 * s, y + 60 * s]]), C.yellow, { sh: 10, pat: () => stripes(ctx, x - 30 * s, y, x + w + 30 * s, y + 60 * s, 18, 3, C.ink, .1) });
      ink(ctx, q.rect(x - 20 * s, y + 60 * s, w + 40 * s, 22 * s), C.wood, { sh: 6, lw: 4 }); }
  });
  layer(ctx, cam, 1.05, () => {   // 斜进来的阳光 + 粉笔灰
    ctx.fillStyle = 'rgba(255,201,60,.22)'; ctx.beginPath(); ctx.moveTo(700, 200); ctx.lineTo(990, 200); ctx.lineTo(420, 1250); ctx.lineTo(60, 1250); ctx.closePath(); ctx.fill();
    const r = rng(5); for (let k = 0; k < 40; k++) { const x = 160 + r() * 600 + Math.sin(t + k) * 20, y = 300 + ((r() * 900 + t * 25 * (1 + r())) % 900); ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(x, y, 2 + r() * 4, 0, 7); ctx.fill(); }
  });
} });
// 4 · 主歌 · 海堤横移：海堤上刷着"沿着海堤往前闯"，两个少年骑车从字上骑过
SHOTS.push({ key: 'seawall', cap: ['十月 · 沿着海堤上学', 'October · Riding Along the Seawall'], geo: [24.6177, 118.2765], dur: 5, lyric: '单车铃一响 沿着海堤往前闯', draw(ctx, t) {
  const cam = { x: VW / 2 + t * 60, y: VH / 2, z: 1, r: 0 }, q = P(ctx);
  layer(ctx, cam, .1, () => { ctx.fillStyle = C.sky; ctx.fillRect(-300, -100, VW + 900, 900); sun(ctx, 820, 260, 90); cloud(ctx, 260, 300, 64); });
  layer(ctx, cam, .35, () => { seaBlock(ctx, -300, 560, VW + 900, 900, t); boatSide(ctx, 600, 640, 60, C.yellow, C.coral, Math.sin(t * 1.4) * 3); for (let k = 0; k < 3; k++) gull(ctx, 200 + k * 80, 420 + k * 18, 18, t, k); });
  layer(ctx, cam, 1, () => {
    ink(ctx, q.rect(-300, 860, VW + 1400, 90), C.mint, { sh: 10, pat: () => dots(ctx, -300, 870, VW + 1100, 940, 30, 5, C.ink) });                // 堤顶
    ink(ctx, q.rect(-300, 950, VW + 1400, 520), C.coral, { sh: 0, pat: () => stripes(ctx, -300, 950, VW + 1100, 1470, 70, 18, 'rgba(255,255,255,.18)', -.7) });   // 堤身
    painted(ctx, '沿着海堤', 540, 1110, 150, C.yellow, { rot: -.03 }); painted(ctx, '往前闯！', 900, 1290, 170, C.white, { rot: .02 });                         // 刷墙字
    for (let k = 0; k < 9; k++) { const x = -260 + k * 230, sp = Math.sin(t * 3 + k) * 20; ink(ctx, q.poly([[x, 1470], [x + 60, 1400 - sp], [x + 120, 1470]]), C.white, { sh: 0, lw: 4 }); }   // 拍堤的浪花
    const rx = 260 + t * 120;
    bike(ctx, rx, 838, 120, C.cobalt, t, { shirt: C.white, stripe: C.cobalt, bag: C.yellow });
    bike(ctx, rx - 250 + Math.sin(t * 1.3) * 12, 838, 112, C.coral, t * 1.05 + .5, { shirt: C.white, stripe: C.coral, bag: C.mint });
  });
} });
// 5 · 副歌 · 仰拍柚子树：枝头挂满柚子，柚子摊的手写招牌"秋天会结果"
SHOTS.push({ key: 'pomelo', cap: ['十月 · 柚子熟了', 'October · The Pomelos Are Ripe'], geo: [24.6242, 118.2711], dur: 5, lyric: '秋天会结果 风开始有点凉', draw(ctx, t, v) {
  const cam = { x: VW / 2, y: VH / 2 + 30 - t * 10, z: 1.05, r: Math.sin(t * .5) * .02 }, q = P(ctx);
  layer(ctx, cam, .2, () => { ctx.fillStyle = v === 'dusk' ? C.pink : C.sky; ctx.fillRect(-200, -200, VW + 400, VH + 400); if (v === 'dusk') { ctx.fillStyle = C.lilac; ctx.fillRect(-200, -200, VW + 400, 420); } sun(ctx, 760, v === 'dusk' ? 560 : 260, 110, C.yellow, v === 'dusk' ? C.pink : C.coral); });
  layer(ctx, cam, .7, () => {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 44; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(480, 1700); ctx.quadraticCurveTo(470, 1200, 520, 820); ctx.stroke(); ctx.strokeStyle = C.wood; ctx.lineWidth = 30; ctx.stroke();
    for (const [x, y, rx, ry, c] of [[260, 560, 300, 230, C.mint], [700, 520, 320, 250, C.mint], [480, 300, 330, 220, '#C9EBC0'], [160, 870, 220, 160, C.mint], [820, 860, 230, 170, '#C9EBC0']])
      ink(ctx, q.ell(x, y, rx, ry), c, { sh: 14, lw: 6, pat: () => dots(ctx, x - rx, y - ry, x + rx, y + ry, 46, 5, 'rgba(37,33,74,.22)') });
    const r = rng(8); for (let k = 0; k < 14; k++) { const x = 80 + r() * 820, y = 300 + r() * 640, sw = Math.sin(t * 1.8 + k) * 4; pomelo(ctx, x + sw, y, 34 + r() * 22); }
    // 手写招牌，挂在树枝上晃
    ctx.save(); ctx.translate(500, 1000); ctx.rotate(Math.sin(t * 1.6) * .05);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-180, -80); ctx.lineTo(-150, 0); ctx.moveTo(180, -80); ctx.lineTo(150, 0); ctx.stroke();
    ink(ctx, q.rr(-260, 0, 520, 230, 18), C.cream, { sh: 12, lw: 6, pat: () => stripes(ctx, -260, 0, 260, 230, 32, 3, 'rgba(201,138,85,.35)', 0) });
    painted(ctx, '秋天会结果', 0, 95, 92, C.coral, { sh: 6 }); hand(ctx, '新摘柚子 · 甜', 0, 182, 40, C.ink, { align: 'center' }); ctx.restore();
  });
  layer(ctx, cam, 1.4, () => { const r = rng(21); for (let k = 0; k < 7; k++) { const x = (r() * VW + t * 40 * (r() - .3)) % VW, y = ((r() * VH) + t * 110 * (.6 + r())) % (VH + 100) - 50; leaf(ctx, x, y, 26 + r() * 16, t * 2 + k, r() < .6 ? C.yellow : C.coral); } });
} });
// 6 · 副歌 · 从巷口升起：白墙小巷挂着柚子，越过屋顶看到一片金黄的海（这一镜不出字，留白）
SHOTS.push({ key: 'lane', cap: ['十月 · 海面一片金黄', 'October · A Golden Sea'], geo: [24.6205, 118.2748], dur: 5, draw(ctx, t) {
  const rise = smooth(t / 5), cam = { x: VW / 2, y: VH / 2 + 260 - rise * 520, z: 1.08, r: 0 }, q = P(ctx);
  layer(ctx, cam, .25, () => { ctx.fillStyle = C.pink; ctx.fillRect(-200, -800, VW + 400, 900); ctx.fillStyle = C.yellow; ctx.fillRect(-200, 60, VW + 400, 300); sun(ctx, 300, 180, 100, C.coral, C.yellow);
    ink(ctx, q.rect(-200, 330, VW + 400, 700), C.yellow, { sh: 0, lw: 0, pat: () => { for (let y = 360, k = 0; y < 1000; y += 42, k++) zig(ctx, -200, VW + 200, y, 7, 34, k % 2 ? C.coral : '#E8A93A', 4); } });
    for (let k = 0; k < 3; k++) boatSide(ctx, 260 + k * 260, 470 + k * 30, 34 + k * 6, [C.cobalt, C.coral, C.mint][k], C.white, Math.sin(t + k) * 2); });
  layer(ctx, cam, .75, () => { const r = rng(4); for (let i = 0; i < 8; i++) { const x = -80 + i * 140, top = 720 + r() * 60;
    ink(ctx, q.rect(x, top, 132, 500), C.cream, { sh: 8, pat: () => ink(ctx, q.rect(x + 40, top + 50, 50, 60), C.sky, { sh: 0, lw: 3 }) });
    ink(ctx, q.poly([[x - 10, top + 4], [x + 66, top - 56], [x + 142, top + 4]]), [C.coral, C.lilac, C.mint, C.yellow][i % 4], { sh: 8, pat: () => stripes(ctx, x, top - 60, x + 140, top + 4, 14, 3, C.ink, .4) }); } });
  layer(ctx, cam, 1, () => {   // 小巷：两边白墙，巷口挂着柚子
    ink(ctx, q.poly([[-100, 1000], [330, 1150], [330, 2300], [-100, 2300]]), C.cream, { sh: 0, pat: () => stripes(ctx, -100, 1000, 330, 2300, 60, 3, 'rgba(37,33,74,.15)', 0) });
    ink(ctx, q.poly([[VW + 100, 1000], [VW - 330, 1150], [VW - 330, 2300], [VW + 100, 2300]]), C.white, { sh: 0, pat: () => dots(ctx, VW - 330, 1000, VW + 100, 2300, 40, 4, 'rgba(37,33,74,.15)') });
    ink(ctx, q.poly([[330, 1150], [VW - 330, 1150], [VW - 100, 2300], [100, 2300]]), C.lilac, { sh: 0, pat: () => stripes(ctx, 100, 1150, VW - 100, 2300, 50, 4, C.ink, Math.PI / 2) });
    ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-100, 1180); ctx.quadraticCurveTo(VW / 2, 1290, VW + 100, 1180); ctx.stroke();   // 晾绳
    for (let k = 0; k < 6; k++) { const x = 90 + k * 160, y = 1215 + Math.sin(k / 5 * Math.PI) * 50 + Math.sin(t * 2 + k) * 4; ctx.beginPath(); ctx.moveTo(x, y - 40); ctx.lineTo(x, y - 20); ctx.stroke(); pomelo(ctx, x, y + 20, 36); }
    ink(ctx, q.rect(30, 1420, 150, 300), C.cobalt, { sh: 10, pat: () => stripes(ctx, 30, 1420, 180, 1720, 24, 6, 'rgba(255,255,255,.25)', Math.PI / 2) });   // 左边的门 + 门牌
    ink(ctx, q.rr(60, 1370, 90, 40, 6), C.coral, { sh: 5, lw: 3 }); hand(ctx, '汐屿巷 7', 105, 1390, 22, C.white, { align: 'center' });
    bike(ctx, VW - 210, 1640, 100, C.yellow, 0);                                                                                                     // 右边靠墙的单车
    for (const [x, c] of [[250, C.coral], [700, C.mint]]) { const y = 1265 + Math.sin(t * 2.4 + x) * 5; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2 + x) * .08);   // 晾着的校服
      ink(ctx, q.poly([[-50, 0], [50, 0], [80, 40], [55, 60], [45, 140], [-45, 140], [-55, 60], [-80, 40]]), c, { sh: 6, lw: 4, pat: () => stripes(ctx, -80, 0, 80, 140, 26, 5, C.white, 0) }); ctx.restore(); }
  });
} });
// 7 · 桥段 · 特写：课本里夹着的泛黄纸条"就像那年十月 我们不慌不忙"，百叶窗的光一条条斜过来
SHOTS.push({ key: 'note', cap: ['十月 · 课本里的纸条', 'October · A Note in the Textbook'], geo: [24.6231, 118.2689], dur: 5, lyric: '就像那年十月 我们不慌不忙', draw(ctx, t) {
  const cam = { x: VW / 2, y: VH / 2, z: 1.0 + t * .02, r: -.04 + t * .006 }, q = P(ctx);
  layer(ctx, cam, 1, () => {
    ink(ctx, q.rect(-200, -200, VW + 400, VH + 400), C.wood, { sh: 0, lw: 0, pat: () => stripes(ctx, -200, -200, VW + 200, VH + 200, 38, 6, 'rgba(37,33,74,.12)', .05) });   // 木桌
    ctx.save(); ctx.translate(VW / 2, VH / 2 - 40); ctx.rotate(-.06);
    ink(ctx, q.rect(-430, -560, 430, 1120), C.cream, { sh: 16, lw: 6, pat: () => { for (let y = -470; y < 520; y += 56) { ctx.fillStyle = 'rgba(37,33,74,.18)'; ctx.fillRect(-380, y, 340 - (y % 3) * 40, 10); } } });
    ink(ctx, q.rect(0, -560, 430, 1120), C.white, { sh: 16, lw: 6, pat: () => { for (let y = -470; y < 520; y += 56) { ctx.fillStyle = 'rgba(37,33,74,.18)'; ctx.fillRect(40, y, 330 - (y % 5) * 30, 10); } } });
    hand(ctx, '第七章　海洋与季风', -390, -500, 34, C.cobalt);
    ctx.save(); ctx.translate(40, -60); ctx.rotate(.09);   // 泛黄的纸条（胶带贴着）
    ink(ctx, q.rect(-300, -150, 600, 330), '#F2D98C', { sh: 12, lw: 5, pat: () => { ctx.fillStyle = 'rgba(201,138,85,.25)'; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(-260 + k * 110, 150 - (k % 2) * 260, 40, 0, 7); ctx.fill(); } } });
    ink(ctx, q.rect(-60, -180, 120, 50), 'rgba(211,190,255,.85)', { sh: 0, lw: 3 });
    hand(ctx, '就像那年十月', -260, -40, 70, 'rgba(110,70,40,.82)'); hand(ctx, '我们不慌不忙', -170, 70, 70, 'rgba(110,70,40,.66)');
    ctx.restore();
    leaf(ctx, 300, 420, 70, 2.3, C.mint); ctx.restore();
  });
  layer(ctx, cam, 1.08, () => { for (let k = 0; k < 6; k++) { const x0 = -300 + k * 260 + Math.sin(t * .6) * 30; ctx.fillStyle = 'rgba(255,233,160,.26)'; ctx.beginPath(); ctx.moveTo(x0, -200); ctx.lineTo(x0 + 110, -200); ctx.lineTo(x0 + 610, VH + 200); ctx.lineTo(x0 + 500, VH + 200); ctx.closePath(); ctx.fill(); } });
} });
// 8 · 桥段尾 · 黄昏：两辆单车靠在海堤栏杆上，灯塔的光扫过海面，光里浮现"海风还是那样 咸咸的 凉凉的"
SHOTS.push({ key: 'dusk', cap: ['十月 · 黄昏的灯塔', 'October · The Lighthouse at Dusk'], geo: [24.6169, 118.2779], dur: 6, lyric: '海风还是那样 咸咸的 凉凉的', draw(ctx, t) {
  const cam = { x: VW / 2, y: VH / 2, z: 1.06 - t * .01, r: 0 }, q = P(ctx);
  layer(ctx, cam, .15, () => { const bands = [[C.cobalt, -200], [C.lilac, 140], [C.pink, 360], [C.coral, 520]]; for (const [c, y] of bands) { ctx.fillStyle = c; ctx.fillRect(-200, y, VW + 400, 500); }
    sun(ctx, 300, 650, 120, C.yellow, C.pink); const r = rng(2); for (let k = 0; k < 18; k++) { ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(r() * VW, 40 + r() * 260, 3 + r() * 3, 0, 7); ctx.fill(); } });
  layer(ctx, cam, .4, () => { seaBlock(ctx, -200, 660, VW + 200, 1300, t, '#3B3A86', C.pink, C.yellow); lighthouse(ctx, 800, 820, 300, t, true); });
  layer(ctx, cam, .55, () => {   // 灯塔的光：一道慢慢扫过来的光束，字浮在光里
    const a = -.35 + Math.sin(t * .5) * .08; ctx.save(); ctx.translate(800, 548); ctx.rotate(Math.PI + a);
    ctx.fillStyle = 'rgba(255,233,140,.42)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1100, -130); ctx.lineTo(1100, 160); ctx.closePath(); ctx.fill(); ctx.restore();
    const k = smooth((t - .6) / 1.2); ctx.globalAlpha = k;
    painted(ctx, '海风还是那样', 560, 330, 92, C.cream, { rot: -.05, sh: 6 }); painted(ctx, '咸咸的 凉凉的', 600, 450, 80, C.yellow, { rot: -.05, sh: 6 }); ctx.globalAlpha = 1;
  });
  layer(ctx, cam, 1, () => {
    ink(ctx, q.rect(-200, 1180, VW + 400, 600), C.lilac, { sh: 0, pat: () => stripes(ctx, -200, 1180, VW + 200, 1780, 60, 14, 'rgba(37,33,74,.18)', -.7) });   // 堤顶
    ctx.strokeStyle = C.ink; ctx.lineWidth = 10; for (let x = -60; x < VW + 100; x += 120) { ctx.beginPath(); ctx.moveTo(x, 1180); ctx.lineTo(x, 1040); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-200, 1040); ctx.lineTo(VW + 200, 1040); ctx.stroke(); ctx.strokeStyle = C.coral; ctx.lineWidth = 5; ctx.stroke();   // 栏杆
    ctx.fillStyle = 'rgba(37,33,74,.35)'; ctx.beginPath(); ctx.moveTo(250, 1250); ctx.lineTo(700, 1250); ctx.lineTo(980, 1500); ctx.lineTo(520, 1500); ctx.closePath(); ctx.fill();   // 长长的影子
    bike(ctx, 330, 1170, 120, C.cobalt, 0); bike(ctx, 590, 1175, 116, C.coral, .7);
    const q2 = P(ctx);   // 两个大人的背影（比第 4 镜的少年高）
    for (const [x, c] of [[760, C.cobalt], [880, C.coral]]) { ink(ctx, q2.rr(x - 34, 960, 68, 210, 26), c, { sh: 8, lw: 5 }); ink(ctx, q2.circ(x, 925, 30), C.ink, { sh: 6, lw: 4 });
      ctx.strokeStyle = C.ink; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(x - 14, 1165); ctx.lineTo(x - 16, 1250); ctx.moveTo(x + 14, 1165); ctx.lineTo(x + 16, 1250); ctx.stroke(); }
  });
} });

// ================================================================ 整首歌用到的其他分镜
const SKIN = '#D9976A';
// 粉笔灰落在 晒黑的手掌上：特写，晒黑的手握着粉笔在黑板上写，粉笔灰在阳光里飘
SHOTS.push({ key: 'hand', cap: ['十月 · 粉笔灰', 'October · Chalk Dust'], geo: [24.6232, 118.2690], dur: 5, draw(ctx, t) {
  const cam = { x: VW / 2, y: VH / 2, z: 1.05 + t * .02, r: .03 }, q = P(ctx);
  layer(ctx, cam, 1, () => {
    ink(ctx, q.rect(-200, -200, VW + 400, VH + 400), C.board, { sh: 0, lw: 0 });
    chalk(ctx, '十月', 60, 330, 300); chalk(ctx, '海风把十月', 120, 760, 110);
    const k = clamp(t / 3), lx = 140 + k * 560, ly = 1000 + Math.sin(k * 9) * 14;   // 粉笔正在写的那一笔
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); for (let u = 0; u <= k; u += .02) ctx.lineTo(140 + u * 560, 1000 + Math.sin(u * 9) * 14); ctx.stroke();
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(-.5);
    ink(ctx, q.rr(-14, -70, 28, 90, 8), C.white, { sh: 6, lw: 4 });                                       // 粉笔
    ink(ctx, q.rr(-90, 0, 180, 230, 70), SKIN, { sh: 12, lw: 6 });                                         // 手掌
    for (let f = 0; f < 3; f++) ink(ctx, q.rr(-80 + f * 52, -40, 46, 110, 23), SKIN, { sh: 6, lw: 5 });    // 手指
    ink(ctx, q.rr(-130, 40, 60, 120, 30), SKIN, { sh: 6, lw: 5 });                                         // 大拇指
    ink(ctx, q.rect(-110, 220, 220, 400), C.white, { sh: 10, lw: 6, pat: () => stripes(ctx, -110, 220, 110, 620, 30, 8, C.cobalt, 0) });   // 校服袖子
    ctx.restore();
  });
  layer(ctx, cam, 1.1, () => { ctx.fillStyle = 'rgba(255,201,60,.2)'; ctx.beginPath(); ctx.moveTo(VW, 0); ctx.lineTo(VW, 500); ctx.lineTo(0, VH); ctx.lineTo(0, VH - 500); ctx.closePath(); ctx.fill();
    const r = rng(9); for (let k = 0; k < 70; k++) { const x = r() * VW + Math.sin(t * .8 + k) * 30, y = (r() * VH - t * 40 * (1 + r())) % VH; ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(x, (y + VH) % VH, 2 + r() * 6, 0, 7); ctx.fill(); } });
} });
// 那年我们说 要去很远的地方：低角度仰拍，两个少年站在海堤上，一个指着海平线，远处货轮慢慢开过
SHOTS.push({ key: 'far', cap: ['十月 · 很远的地方', 'October · Somewhere Far Away'], geo: [24.6171, 118.2772], dur: 5, draw(ctx, t) {
  const cam = { x: VW / 2, y: VH / 2 + 20 - t * 8, z: 1.03 + t * .012, r: 0 }, q = P(ctx);
  layer(ctx, cam, .15, () => { ctx.fillStyle = C.sky; ctx.fillRect(-200, -200, VW + 400, VH + 400); sun(ctx, 790, 300, 100); cloud(ctx, 240, 260, 80); cloud(ctx, 620, 520, 50); });
  layer(ctx, cam, .4, () => { seaBlock(ctx, -200, 1050, VW + 200, 1500, t);
    const sx = 120 + t * 26; ink(ctx, q.poly([[sx - 140, 1040], [sx + 160, 1040], [sx + 130, 1080], [sx - 120, 1080]]), C.ink, { sh: 0, lw: 3 });   // 货轮
    [C.coral, C.yellow, C.mint, C.cobalt, C.pink].forEach((c, i) => ink(ctx, q.rect(sx - 110 + i * 46, 1000 - (i % 2) * 34, 44, 40 + (i % 2) * 34), c, { sh: 0, lw: 3 }));
    for (let k = 0; k < 3; k++) gull(ctx, 380 + k * 60 + t * 20, 700 + k * 30, 20, t, k); });
  layer(ctx, cam, 1, () => {
    ink(ctx, q.rect(-200, 1330, VW + 400, 400), C.coral, { sh: 0, pat: () => stripes(ctx, -200, 1330, VW + 200, 1730, 60, 16, 'rgba(255,255,255,.2)', -.7) });
    for (const [x, s, c, point] of [[360, 1, C.cobalt, true], [600, .95, C.coral, false]]) {   // 两个少年（侧背影，不画脸）
      const top = 1330 - 560 * s, q2 = P(ctx);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 34 * s; ctx.beginPath(); ctx.moveTo(x - 30 * s, 1335); ctx.lineTo(x - 26 * s, top + 330 * s); ctx.moveTo(x + 30 * s, 1335); ctx.lineTo(x + 26 * s, top + 330 * s); ctx.stroke();
      ctx.strokeStyle = C.cobalt; ctx.lineWidth = 20 * s; ctx.stroke();
      ink(ctx, q2.rr(x - 80 * s, top + 110 * s, 160 * s, 240 * s, 40 * s), C.white, { sh: 8, lw: 5, pat: () => stripes(ctx, x - 80 * s, top + 110 * s, x + 80 * s, top + 350 * s, 46 * s, 10 * s, c, 0) });
      ink(ctx, q2.circ(x, top + 60 * s, 62 * s), C.ink, { sh: 6, lw: 4 });
      ink(ctx, q2.rr(x + 40 * s, top + 130 * s, 50 * s, 120 * s, 12 * s), C.yellow, { sh: 5, lw: 4 });   // 书包
      ctx.strokeStyle = C.ink; ctx.lineWidth = 26 * s; ctx.lineCap = 'round'; ctx.beginPath();
      if (point) { const a = -.35 + Math.sin(t * 1.2) * .04; ctx.moveTo(x - 50 * s, top + 140 * s); ctx.lineTo(x - 50 * s - Math.cos(a) * 250 * s, top + 140 * s + Math.sin(a) * 250 * s); }
      else { ctx.moveTo(x - 60 * s, top + 140 * s); ctx.lineTo(x - 70 * s, top + 320 * s); }
      ctx.stroke(); ctx.strokeStyle = SKIN; ctx.lineWidth = 14 * s; ctx.stroke();
    }
  });
} });
// 春天埋下的种子 不说话 / 夏天的蝉鸣 替它长大：校园角落同一棵小树，从春到夏一路长大（快进）
function growthShot(season) { return function (ctx, t, v, dur) {
  const cam = { x: VW / 2, y: VH / 2, z: 1, r: 0 }, q = P(ctx), k0 = season === 'spring' ? 0 : .5, g = k0 + .5 * clamp(t / dur);
  layer(ctx, cam, .2, () => { ctx.fillStyle = season === 'spring' ? '#CFF0E0' : C.sky; ctx.fillRect(-200, -200, VW + 400, VH + 400);
    const sa = (t * .9) % Math.PI, sx = 120 + (sa / Math.PI) * 760, sy = 520 - Math.sin(sa) * 380; sun(ctx, sx, sy, 80, C.yellow, season === 'spring' ? C.pink : C.coral);   // 快进：太阳一天天划过
    for (let k = 0; k < 3; k++) cloud(ctx, ((t * 260 + k * 400) % (VW + 400)) - 200, 240 + k * 140, 50 + k * 12); });
  layer(ctx, cam, 1, () => {
    ink(ctx, q.rect(-200, 820, VW + 400, 420), C.coral, { sh: 0, pat: () => { for (let y = 820; y < 1240; y += 52) for (let x = -200 + (Math.round(y / 52) % 2) * 50; x < VW + 200; x += 100) ink(ctx, q.rect(x, y, 96, 48), C.coral, { sh: 0, lw: 3 }); } });   // 校园围墙
    ink(ctx, q.rect(-200, 1240, VW + 400, 500), '#C98A55', { sh: 0, pat: () => dots(ctx, -200, 1260, VW + 200, 1740, 40, 5, 'rgba(37,33,74,.25)') });
    ink(ctx, q.ell(VW / 2, 1250, 240, 50), C.wood, { sh: 6, lw: 5 });
    const h = 120 + g * 620, tw = 12 + g * 40, cx = VW / 2;
    ctx.strokeStyle = C.ink; ctx.lineWidth = tw + 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, 1255); ctx.lineTo(cx, 1255 - h); ctx.stroke(); ctx.strokeStyle = C.wood; ctx.lineWidth = tw; ctx.stroke();
    const cr = 50 + g * 330, col = season === 'spring' ? '#C9EBC0' : C.mint;
    ink(ctx, q.ell(cx, 1255 - h - cr * .45, cr, cr * .8), col, { sh: 12, lw: 6, pat: () => dots(ctx, cx - cr, 1255 - h - cr * 1.3, cx + cr, 1255 - h + cr * .4, 40, 5, 'rgba(37,33,74,.2)') });
    if (season === 'spring') { const r = rng(4); for (let k = 0; k < 10; k++) ink(ctx, q.circ(80 + r() * 820, 1290 + r() * 300, 12), C.pink, { sh: 3, lw: 3 }); }
    else {   // 树干上的知了 + 叫声
      const by = 1255 - h * .55; ink(ctx, q.ell(cx + tw / 2 + 16, by, 18, 30), C.ink, { sh: 4, lw: 3 }); ink(ctx, q.ell(cx + tw / 2 + 30, by + 4, 22, 12, .6), C.sky, { sh: 0, lw: 3 });
      for (let k = 0; k < 3; k++) { const a = (t * 6 + k) % 1; ctx.globalAlpha = 1 - a; zig(ctx, cx + tw + 60 + a * 80, cx + tw + 140 + a * 80, by - 40 + k * 40, 8, 14, C.ink, 4); ctx.globalAlpha = 1; } }
  });
}; }
SHOTS.push({ key: 'spring', cap: ['春天 · 埋下一颗种子', 'Spring · A Seed in the Ground'], geo: [24.6236, 118.2694], dur: 5, draw: growthShot('spring') });
SHOTS.push({ key: 'summer', cap: ['夏天 · 蝉鸣里长大', 'Summer · Growing up with the Cicadas'], geo: [24.6236, 118.2694], dur: 5, draw: growthShot('summer') });
// 那些种下的梦 都在枝头发光：枝头的柚子特写，一个接一个亮起来（孟菲斯星芒）
SHOTS.push({ key: 'glow', cap: ['十月 · 枝头发光', 'October · Glowing on the Branches'], geo: [24.6243, 118.2712], dur: 5, draw(ctx, t) {
  const cam = { x: VW / 2 + Math.sin(t * .5) * 40, y: VH / 2, z: 1.02 + t * .02, r: Math.sin(t * .4) * .04 }, q = P(ctx);
  layer(ctx, cam, .3, () => { ctx.fillStyle = C.sky; ctx.fillRect(-200, -200, VW + 400, VH + 400); dots(ctx, -200, -200, VW + 200, VH + 200, 90, 6, 'rgba(255,255,255,.6)'); });
  layer(ctx, cam, 1, () => {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 46; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-100, 300); ctx.quadraticCurveTo(500, 520, VW + 100, 420); ctx.stroke(); ctx.strokeStyle = C.wood; ctx.lineWidth = 32; ctx.stroke();
    const r = rng(12); for (let k = 0; k < 9; k++) leaf(ctx, 60 + k * 110, 380 + Math.sin(k) * 60, 60, -1 + r() * 2, k % 3 ? C.mint : '#C9EBC0');
    const fruits = [[220, 720, 120], [520, 900, 150], [800, 680, 115], [380, 1220, 105], [720, 1180, 125]];
    fruits.forEach(([x, y, rr], i) => {
      ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x, y - rr); ctx.lineTo(x + (i % 2 ? 20 : -20), 440); ctx.stroke();
      const on = smooth((t - .4 - i * .7) / .35);
      if (on > 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(t * .4 + i); ctx.fillStyle = C.yellow; ctx.strokeStyle = C.ink; ctx.lineWidth = 5;   // 星芒
        ctx.beginPath(); for (let k = 0; k < 24; k++) { const R = k % 2 ? rr * 1.15 : rr * (1.35 + .45 * on); ctx.lineTo(Math.cos(k * Math.PI / 12) * R, Math.sin(k * Math.PI / 12) * R); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
      pomelo(ctx, x, y, rr);
      if (on > 0) for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + t; ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr * 1.7, y + Math.sin(a) * rr * 1.7, 8 * on, 0, 7); ctx.fill(); }
    });
  });
} });
// 有点萧瑟 有点清爽：海堤上坐着两个少年的背影，单车在后面，午后的风吹过
SHOTS.push({ key: 'sit', cap: ['十月 · 有点萧瑟 有点清爽', 'October · A Little Bleak, a Little Fresh'], geo: [24.6175, 118.2768], dur: 5, draw(ctx, t) {
  const cam = { x: VW / 2 + t * 10, y: VH / 2, z: 1.08 - t * .012, r: 0 }, q = P(ctx);
  layer(ctx, cam, .15, () => { const bands = [[C.sky, -200], ['#BDE7FA', 300], [C.yellow, 520]]; for (const [c, y] of bands) { ctx.fillStyle = c; ctx.fillRect(-200, y, VW + 400, 500); } sun(ctx, 700, 560, 110); cloud(ctx, 260, 230, 70); });
  layer(ctx, cam, .4, () => seaBlock(ctx, -200, 660, VW + 200, 1300, t, C.cobalt, C.yellow, C.white));
  layer(ctx, cam, 1, () => {
    ink(ctx, q.rect(-200, 1180, VW + 400, 600), C.lilac, { sh: 12, pat: () => stripes(ctx, -200, 1180, VW + 200, 1780, 60, 14, 'rgba(37,33,74,.18)', -.7) });
    bike(ctx, 160, 1170, 110, C.cobalt, 0); bike(ctx, 860, 1172, 104, C.coral, .6);
    for (const [x, c] of [[400, C.cobalt], [600, C.coral]]) { const sw = Math.sin(t * 2 + x) * 6, q2 = P(ctx);   // 背影：坐在堤边
      ink(ctx, q2.rr(x - 70, 1000, 140, 200, 40), C.white, { sh: 8, lw: 5, pat: () => stripes(ctx, x - 70, 1000, x + 70, 1200, 40, 9, c, 0) });
      ink(ctx, q2.circ(x, 950, 56), C.ink, { sh: 6, lw: 4 });
      ink(ctx, q2.poly([[x + 60, 1030], [x + 120 + sw, 1050], [x + 70, 1090]]), c, { sh: 0, lw: 3 });   // 被风吹起的衣角
    }
  });
  layer(ctx, cam, 1.4, () => { const r = rng(31); for (let k = 0; k < 5; k++) leaf(ctx, ((r() * VW + t * 160) % (VW + 200)) - 100, 300 + r() * 900 + Math.sin(t * 2 + k) * 40, 30, t * 3 + k, k % 2 ? C.yellow : C.coral); });
} });
// 落叶不是告别 是把果实献上：空教室的窗台，几片落叶慢慢落下，窗台上放着一个柚子
SHOTS.push({ key: 'sill', cap: ['十月 · 窗台上的落叶', 'October · Leaves on the Windowsill'], geo: [24.6232, 118.2690], dur: 5, draw(ctx, t, v, dur) {
  const cam = { x: VW / 2, y: VH / 2, z: 1.04 + t * .01, r: 0 }, q = P(ctx);
  layer(ctx, cam, .35, () => { ctx.fillStyle = C.pink; ctx.fillRect(-200, -200, VW + 400, VH + 400); ctx.fillStyle = C.lilac; ctx.fillRect(-200, -200, VW + 400, 400); sun(ctx, 640, 520, 90, C.yellow, C.coral);
    seaBlock(ctx, -200, 640, VW + 200, 1100, t, C.cobalt, C.pink, C.yellow); lighthouse(ctx, 260, 700, 200, t); });
  layer(ctx, cam, 1, () => {
    ctx.fillStyle = C.mint; ctx.fillRect(-200, -200, VW + 400, 240); ctx.fillRect(-200, -200, 220, VH + 400); ctx.fillRect(VW - 20, -200, 220, VH + 400);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 12; ctx.strokeRect(20, 40, VW - 40, 1080); ctx.beginPath(); ctx.moveTo(VW / 2, 40); ctx.lineTo(VW / 2, 1120); ctx.stroke();
    ink(ctx, q.rect(-200, 1110, VW + 400, 90), C.wood, { sh: 14, lw: 6 }); ink(ctx, q.rect(-200, 1200, VW + 400, 600), C.mint, { sh: 0, pat: () => dots(ctx, -200, 1200, VW + 200, 1800, 70, 4, 'rgba(37,33,74,.12)') });
    pomelo(ctx, 690, 1040, 64);
    const r = rng(17); for (let k = 0; k < 6; k++) {   // 一片一片落下来，落在窗台上停住
      const t0 = k * .6, e = clamp((t - t0) / 1.8), x = 160 + r() * 640, y0 = -40, y1 = 1100 - r() * 20;
      if (t < t0) continue; leaf(ctx, x + Math.sin(e * 6 + k) * 60 * (1 - e), lerp(y0, y1, e), 34, e < 1 ? t * 3 + k : .2 + k, k % 2 ? C.yellow : C.coral);
    }
  });
} });
// 海风还是那样（后半句）：黄昏的风铃特写（和前奏的风铃首尾呼应）
SHOTS.push({ key: 'chime', cap: ['十月 · 风铃', 'October · Wind Chimes'], geo: [24.6213, 118.2702], dur: 5, draw(ctx, t) {
  const cam = { x: VW / 2, y: VH / 2, z: 1 + t * .015, r: 0 }, q = P(ctx);
  layer(ctx, cam, .2, () => { const bands = [[C.lilac, -200], [C.pink, 520], [C.coral, 900]]; for (const [c, y] of bands) { ctx.fillStyle = c; ctx.fillRect(-200, y, VW + 400, 700); } sun(ctx, 300, 1000, 150, C.yellow, C.pink);
    seaBlock(ctx, -200, 1060, VW + 200, 1800, t, '#3B3A86', C.pink, C.yellow); });
  layer(ctx, cam, 1, () => { ink(ctx, q.rect(-100, -40, VW + 200, 160), C.coral, { sh: 14, pat: () => zig(ctx, -100, VW + 100, 50, 18, 40, C.yellow, 8) }); windChime(ctx, VW * .55, 120, 380, t * 1.2); });
} });
// 片尾：标题卡（风铃 + 灯塔 + "秋天会结果"）
SHOTS.push({ key: 'end', cap: ['十月 · 秋天会结果', 'October · Autumn Bears Fruit'], geo: [24.6213, 118.2702], dur: 8, draw(ctx, t, v, dur) {
  const cam = { x: VW / 2, y: VH / 2, z: 1, r: 0 }, q = P(ctx);
  layer(ctx, cam, 1, () => {
    ctx.fillStyle = C.cream; ctx.fillRect(-100, -100, VW + 200, VH + 200); dots(ctx, -100, -100, VW + 100, VH + 100, 60, 4, 'rgba(37,33,74,.1)');
    ink(ctx, q.circ(170, 260, 90), C.pink, { sh: 10, pat: () => stripes(ctx, 80, 170, 260, 350, 22, 6, C.white, .7) }); ink(ctx, q.poly([[780, 140], [900, 360], [660, 360]]), C.yellow, { sh: 10 });
    zig(ctx, 90, 420, 1230, 18, 40, C.cobalt, 8); ink(ctx, q.rr(640, 1150, 220, 80, 40), C.mint, { sh: 8, pat: () => dots(ctx, 640, 1150, 860, 1230, 22, 5, C.ink) });
    windChime(ctx, VW / 2, 0, 200, t);
    const k = smooth((t - .3) / 1.2), k2 = smooth((t - 1.5) / 1.2);
    ctx.globalAlpha = k; painted(ctx, '汐屿的秋天', VW / 2, 760 + (1 - k) * 40, 150, C.coral); ctx.globalAlpha = k2;
    painted(ctx, '秋天会结果', VW / 2, 950, 80, C.cobalt, { sh: 5 }); hand(ctx, 'Autumn in Xiyu · October', VW / 2, 1060, 40, C.ink, { align: 'center' });
    ctx.globalAlpha = 1; lighthouse(ctx, 480, 1500, 190, t, true);
    const fade = smooth((t - (dur - 1.2)) / 1.2); if (fade > 0) { ctx.fillStyle = `rgba(255,246,229,${fade})`; ctx.fillRect(-100, -100, VW + 200, VH + 200); }
  });
} });

// ================================================================ 时间线：按歌（1 分 45 秒，92 BPM）排，切点都落在拍子上、一句歌词开头
const SONG_DUR = 105.6;
const TIMELINE = [
  [0.00, 'harbor', 'dawn'],   // 前奏：风铃 + 海风
  [5.99, 'dock'],
  [11.73, 'classroom'],       // 海风把十月 吹进教室的窗
  [16.21, 'hand'],            // 粉笔灰落在 晒黑的手掌上
  [20.69, 'seawall'],         // 单车铃一响 沿着海堤往前闯
  [26.47, 'far'],             // 那年我们说 要去很远的地方
  [30.95, 'spring'],          // 春天埋下的种子 不说话
  [36.71, 'summer'],          // 夏天的蝉鸣 替它长大
  [41.19, 'pomelo'],          // 秋天会结果 风开始有点凉
  [46.30, 'glow'],            // 那些种下的梦 都在枝头发光
  [51.43, 'lane'],            // 柚子香漫过巷口 海面一片金黄
  [57.19, 'sit'],             // 有点萧瑟 有点清爽
  [62.30, 'harbor', 'noon'],  // 是我们的模样（镜头拉高，整个小城）
  [67.43, 'sill'],            // 落叶不是告别 是把果实献上
  [72.54, 'note'],            // 就像那年十月 我们不慌不忙
  [77.67, 'dusk'],            // 海风还是那样
  [82.83, 'chime'],           // 咸咸的 凉凉的
  [87.33, 'pomelo', 'dusk'],  // 秋天会结果（第一次重复：招牌在黄昏里）
  [92.53, 'harbor', 'night'], // 间奏：夜里，灯塔亮了
  [97.71, 'end'],             // 秋天会结果（最后一次）→ 片尾
];
const WIPES = [41.19, 67.43];   // 副歌、桥段开头：孟菲斯色块扫过去
const BYKEY = Object.fromEntries(SHOTS.map(s => [s.key, s]));

// ---------------------------------------------------------------- 画框 + 底部三行字
function frameBg(ctx) {
  ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
  const r = rng(3); ctx.fillStyle = 'rgba(37,33,74,.08)'; for (let i = 0; i < 420; i++) { ctx.beginPath(); ctx.arc(r() * W, r() * H, 3, 0, 7); ctx.fill(); }
  ctx.fillStyle = C.ink; ctx.fillRect(VX + 14, VY + 14, VW, VH);
  ctx.lineWidth = 5; ctx.strokeStyle = C.ink;
  ctx.fillStyle = C.coral; ctx.beginPath(); ctx.moveTo(18, 1690); ctx.lineTo(70, 1690); ctx.lineTo(44, 1645); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(1040, 1690, 22, 0, 7); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = C.cobalt; ctx.lineWidth = 6; ctx.beginPath(); for (let i = 0; i <= 6; i++) ctx.lineTo(880 + i * 22, 1872 + (i % 2 ? -12 : 12)); ctx.stroke();
  ctx.strokeStyle = C.pink; ctx.beginPath(); for (let i = 0; i <= 6; i++) ctx.lineTo(70 + i * 22, 1872 + (i % 2 ? -12 : 12)); ctx.stroke();
}
function caption(ctx, shot, t) {
  const [lat, lon] = shot.geo, dl = t * .00004;
  const lines = [['汐屿的秋天　Autumn in Xiyu', `800 36px ${FONT_UI}`, C.ink],
                 [`${shot.cap[0]}　${shot.cap[1]}`, `500 25px ${FONT_UI}`, '#5B5488'],
                 [`${(lat + dl).toFixed(4)}°N　${(lon + dl * .6).toFixed(4)}°E`, `600 26px ${FONT_UI}`, C.cobalt]];
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach(([s, f, col], i) => { ctx.font = f; ctx.fillStyle = col; ctx.fillText(s, W / 2, 1650 + i * 58); });
}
function wipe(ctx, T) {   // 孟菲斯色块转场：一块带圆点的大色块从左扫到右，切点在它盖满画面的那一刻
  for (const c of WIPES) { const e = (T - c) / .5; if (e < -1 || e > 1) continue;
    const x = VX - VW * 1.4 + (e + 1) / 2 * (VW * 2.8 + VW * .4); ctx.save(); ctx.translate(x, VY);
    const q = P(ctx); ink(ctx, q.poly([[0, -60], [VW * 1.4, -60], [VW * 1.4 - 260, VH + 60], [-260, VH + 60]]), C.yellow, { sh: 16, lw: 8, pat: () => dots(ctx, -300, -60, VW * 1.5, VH + 60, 48, 9, C.coral) });
    ctx.restore(); }
}
function drawShot(ctx, k, t, v, dur, T) {
  const shot = SHOTS[k]; frameBg(ctx);
  ctx.save(); ctx.beginPath(); ctx.rect(VX, VY, VW, VH); ctx.clip(); shot.draw(ctx, t, v, dur || shot.dur); if (T !== undefined) wipe(ctx, T); ctx.restore();
  ctx.lineWidth = 8; ctx.strokeStyle = C.ink; ctx.strokeRect(VX, VY, VW, VH); caption(ctx, shot, t);
}
// 样帧：每个分镜取中间偏后的一刻
function shotStill(k, ctx) { drawShot(ctx, k, SHOTS[k].dur * .6); }
// 整片：按时间线（每镜开头留 0.4 秒缓冲，镜头运动从这一刻开始）
function frame(i, ctx) {
  const T = i / FPS; let j = 0; while (j + 1 < TIMELINE.length && T >= TIMELINE[j + 1][0]) j++;
  const [a, key, v] = TIMELINE[j], z = j + 1 < TIMELINE.length ? TIMELINE[j + 1][0] : SONG_DUR;
  drawShot(ctx, SHOTS.indexOf(BYKEY[key]), T - a, v, z - a, T);
}
const N = Math.round(SONG_DUR * FPS);
