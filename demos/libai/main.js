// 李白 · 40 s ink-wash film. Deterministic: window.renderAt(t) draws the frame for time t.
const W = 1920, H = 1080;
window.DEMO = { width: W, height: H, fps: 30, duration: 40 };

const INK = '20,18,16';
const PAPER = '#efe6d3';
const CINNABAR = '#b4281d';

// ---------- math / noise
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const eOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const eInOut = (t) => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const eBack = (t) => { t = clamp(t); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
function hash(i, j = 0, k = 0) { let h = (i * 374761393 + j * 668265263 + k * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function n1(x, s = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i, s), hash(i + 1, s), u); }
function n2(x, y, s = 0) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return lerp(lerp(hash(i, j, s), hash(i + 1, j, s), u), lerp(hash(i, j + 1, s), hash(i + 1, j + 1, s), u), v);
}
function fbm1(x, s = 0, o = 5) { let a = 0, amp = .5, f = 1, n = 0; for (let k = 0; k < o; k++) { a += amp * n1(x * f, s + k * 17); n += amp; amp *= .5; f *= 2.03; } return a / n; }
function fbm2(x, y, s = 0, o = 5) { let a = 0, amp = .5, f = 1, n = 0; for (let k = 0; k < o; k++) { a += amp * n2(x * f, y * f, s + k * 31); n += amp; amp *= .5; f *= 2.01; } return a / n; }

function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// ---------- assets built at load
const A = {};

function makeRange({ w, h, seed, base, amp, freq, steep = 1, alpha = .8, fade = 200, cun = 600, ridge = .7, blur = 1.2 }) {
  const c = mk(w, h), g = c.getContext('2d'), R = rng(seed);
  const ry = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    const v = fbm1(x * freq, seed, 6);
    ry[x] = base - amp * Math.pow(clamp((v - .25) / .6), steep);
  }
  // column wash: dark at the ridge, fading into mist below
  const img = g.createImageData(w, h), d = img.data;
  for (let x = 0; x < w; x++) {
    const r0 = ry[x], fx = fade * (.75 + .5 * n1(x * .004, seed + 5));
    for (let y = Math.max(0, Math.floor(r0)); y < h; y++) {
      const dy = y - r0;
      let a = alpha * Math.exp(-dy / fx) * (.82 + .3 * fbm2(x * .02, y * .006, seed + 9, 3));
      if (dy < 1) a *= clamp(dy + 1);
      const i = (y * w + x) * 4;
      d[i] = 20; d[i + 1] = 18; d[i + 2] = 16; d[i + 3] = clamp(a) * 255;
    }
  }
  g.putImageData(img, 0, 0);
  // 皴 texture strokes
  g.lineCap = 'round';
  for (let k = 0; k < cun; k++) {
    const x = R() * w, r0 = ry[Math.floor(x)], y = r0 + Math.pow(R(), 1.6) * fade * 1.1;
    const L = 8 + R() * 34, ang = Math.PI / 2 + (R() - .5) * 1.1;
    g.strokeStyle = `rgba(${INK},${(.05 + R() * .16) * alpha})`; g.lineWidth = .8 + R() * 2.4;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(ang) * L * .5 + (R() - .5) * 6, y + Math.sin(ang) * L * .5, x + Math.cos(ang) * L, y + Math.sin(ang) * L); g.stroke();
  }
  // dry-brush ridge line
  for (let pass = 0; pass < 2; pass++) {
    g.strokeStyle = `rgba(${INK},${ridge * alpha * (pass ? .35 : .7)})`;
    for (let x = 0; x < w - 6; x += 6) {
      g.lineWidth = (.6 + 3.2 * n1(x * .01, seed + 40 + pass)) * (pass ? 2 : 1);
      g.beginPath(); g.moveTo(x, ry[x] + pass * 1.5); g.lineTo(x + 6, ry[x + 6] + pass * 1.5); g.stroke();
    }
  }
  if (!blur) return c;
  const c2 = mk(w, h), g2 = c2.getContext('2d');
  g2.filter = `blur(${blur}px)`; g2.drawImage(c, 0, 0);
  return c2;
}

function makeBloom(size, seed) {
  // ink drop on wet paper: dark core, feathered, noisy rim
  const c = mk(size, size), g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data, h = size / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (x - h) / h, dy = (y - h) / h, r = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
    const edge = .78 + .2 * fbm2(Math.cos(th) * 2.2 + 5, Math.sin(th) * 2.2 + 5, seed, 5);
    const rim = Math.exp(-Math.pow((r - edge * .96) / .035, 2)) * .5;
    const body = (1 - sstep(edge * .82, edge, r)) * (.55 + .45 * Math.exp(-r * r * 8)) * (.75 + .35 * fbm2(x * .01, y * .01, seed + 3, 4));
    const a = clamp(body + rim * (r < edge * 1.02 ? 1 : 0));
    const i = (y * size + x) * 4; d[i] = 20; d[i + 1] = 18; d[i + 2] = 16; d[i + 3] = a * 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

function makeSplat(size, seed) {
  const c = mk(size, size), g = c.getContext('2d'), R = rng(seed), h = size / 2;
  g.fillStyle = `rgb(${INK})`;
  g.beginPath();
  for (let k = 0; k <= 64; k++) { const a = k / 64 * Math.PI * 2, r = h * (.28 + .16 * fbm1(k * .35, seed, 3)); k ? g.lineTo(h + Math.cos(a) * r, h + Math.sin(a) * r) : g.moveTo(h + Math.cos(a) * r, h + Math.sin(a) * r); }
  g.fill();
  for (let k = 0; k < 70; k++) {
    const a = R() * Math.PI * 2, r = h * (.3 + Math.pow(R(), .7) * .65), s = (1 - r / h) * 22 * R() + 2;
    g.beginPath(); g.ellipse(h + Math.cos(a) * r, h + Math.sin(a) * r, s * 1.5, s, a, 0, Math.PI * 2); g.fill();
  }
  return c;
}

function makeHall() {
  // 长安 palace: three halls on a terrace, curved up-turned eaves
  const c = mk(1600, 700), g = c.getContext('2d');
  const hall = (cx, by, w, s, a) => {
    g.fillStyle = `rgba(${INK},${a})`; g.strokeStyle = `rgba(${INK},${a})`;
    g.fillRect(cx - w * .62, by - 22 * s, w * 1.24, 22 * s);                       // platform
    g.fillRect(cx - w * .7, by - 8 * s, w * 1.4, 8 * s);
    const ch = 90 * s;
    for (let k = 0; k <= 8; k++) g.fillRect(cx - w * .42 + k * w * .84 / 8 - 3 * s, by - 22 * s - ch, 6 * s, ch); // columns
    g.globalAlpha = .45; g.fillRect(cx - w * .44, by - 22 * s - ch, w * .88, ch); g.globalAlpha = 1;
    const roof = (y, rw, rh) => {
      g.beginPath();
      g.moveTo(cx - rw * .62, y - rh * .2);
      g.quadraticCurveTo(cx - rw * .5, y + rh * .05, cx - rw * .32, y - rh * .05);
      g.quadraticCurveTo(cx - rw * .2, y - rh * .7, cx - rw * .14, y - rh);
      g.lineTo(cx + rw * .14, y - rh);
      g.quadraticCurveTo(cx + rw * .2, y - rh * .7, cx + rw * .32, y - rh * .05);
      g.quadraticCurveTo(cx + rw * .5, y + rh * .05, cx + rw * .62, y - rh * .2);
      g.quadraticCurveTo(cx + rw * .5, y + rh * .14, cx, y + rh * .1);
      g.quadraticCurveTo(cx - rw * .5, y + rh * .14, cx - rw * .62, y - rh * .2);
      g.fill();
      g.fillRect(cx - rw * .15, y - rh - 5 * s, rw * .3, 6 * s);                      // ridge
    };
    const top = by - 22 * s - ch;
    roof(top, w * 1.25, 70 * s);
    g.fillRect(cx - w * .36, top - 70 * s - 40 * s, w * .72, 40 * s);
    roof(top - 70 * s - 30 * s, w * .95, 60 * s);
  };
  hall(330, 640, 330, .85, .55);
  hall(1270, 640, 330, .85, .55);
  hall(800, 660, 520, 1.25, .92);
  const c2 = mk(1600, 700), g2 = c2.getContext('2d'); g2.filter = 'blur(1.2px)'; g2.drawImage(c, 0, 0);
  return c2;
}

function makeMaskField() {
  const w = 480, h = 270, f = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) f[y * w + x] = fbm2(x / 70, y / 70, 77, 6);
  return f;
}

function fadeInner(c, x0, x1) {
  const g = c.getContext('2d'), gr = g.createLinearGradient(x0, 0, x1, 0);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalCompositeOperation = 'destination-in'; g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  return c;
}

async function loadImg(src) { const i = new Image(); i.src = src; await i.decode(); return i; }

// ---------- primitives
function paper(g, tint = 0) {
  g.drawImage(A.paper, 0, 0);
  if (tint) { g.fillStyle = `rgba(150,110,60,${tint})`; g.fillRect(0, 0, W, H); }
}

function wash(g, x, y, rx, ry, a, col = INK) {
  const gr = g.createRadialGradient(x, y, 0, x, y, 1);
  gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(.55, `rgba(${col},${a * .5})`); gr.addColorStop(1, `rgba(${col},0)`);
  g.save(); g.translate(x, y); g.scale(rx, ry); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill(); g.restore();
}

// one character bleeding into paper: blurred & swollen → crisp, with a lasting soft halo
function inkChar(g, ch, x, y, size, font, p, col = INK, alpha = 1) {
  if (p <= 0) return;
  const q = eOut(p);
  g.save();
  g.translate(x, y); g.scale(1.12 - .12 * q, 1.12 - .12 * q);
  g.font = `${size}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.globalAlpha = alpha * clamp(p * 2.2) * .22;
  g.filter = `blur(${size * .06}px)`; g.fillStyle = `rgb(${col})`; g.fillText(ch, 0, 0);
  g.globalAlpha = alpha * clamp(p * 1.6);
  g.filter = q < .98 ? `blur(${(1 - q) * size * .12}px)` : 'none';
  g.fillText(ch, 0, 0);
  g.restore();
}

function column(g, text, x, y, size, font, t, t0, stagger = .14, dur = .55, col = INK, alpha = 1, lead = 1.08) {
  [...text].forEach((ch, i) => inkChar(g, ch, x, y + i * size * lead, size, font, prog(t, t0 + i * stagger, t0 + i * stagger + dur), col, alpha));
}

function seal(g, chars, x, y, s, p, rot = -.04) {
  if (p <= 0) return;
  const k = p < 1 ? lerp(1.5, 1, eOut(p / .35 > 1 ? 1 : p / .35)) : 1;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(k, k);
  g.globalAlpha = clamp(p * 4) * .92;
  const R = rng(chars.charCodeAt(0));
  g.fillStyle = CINNABAR;
  g.beginPath();
  const pts = [];
  const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let k2 = 0; k2 < 4; k2++) for (let j = 0; j < 8; j++) {
    const [ax, ay] = C[k2], [bx, by] = C[(k2 + 1) % 4], u = j / 8;
    pts.push([lerp(ax, bx, u) * s / 2 + (R() - .5) * s * .04, lerp(ay, by, u) * s / 2 + (R() - .5) * s * .04]);
  }
  pts.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.closePath(); g.fill();
  // carved characters (白文)
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const cs = [...chars];
  if (cs.length === 2) { g.font = `${s * .42}px Serif`; g.font = `900 ${s * .44}px Serif`; cs.forEach((c, i) => g.fillText(c, 0, (i - .5) * s * .44)); }
  else if (cs.length === 4) { g.font = `900 ${s * .4}px Serif`; [[1, 0], [1, 1], [0, 0], [0, 1]].forEach(([cx, cy], i) => g.fillText(cs[i], (cx - .5) * s * .44, (cy - .5) * s * .44)); }
  else { g.font = `900 ${s * .66}px Serif`; g.fillText(cs[0], 0, s * .03); }
  // worn speckles
  for (let k2 = 0; k2 < 40; k2++) { g.beginPath(); g.arc((R() - .5) * s, (R() - .5) * s, R() * s * .02, 0, 7); g.fill(); }
  g.restore();
}

function serifCol(g, text, x, y, size, a, col = INK, weight = 500) {
  if (a <= 0) return;
  g.save(); g.font = `${weight} ${size}px Serif`; g.fillStyle = `rgba(${col},${a})`; g.textAlign = 'center'; g.textBaseline = 'middle';
  [...text].forEach((ch, i) => { if (ch !== ' ') g.fillText(ch, x, y + i * size * 1.25); });
  g.restore();
}

// chapter block (left): big brush title, number seal, two small serif lines
function chapter(g, lt, name, num, l1, l2, col = INK) {
  column(g, name, 230, 190, 140, 'Cao', lt, .25, .22, .7, col);
  seal(g, num, 230, 190 + 140 * 1.08 * [...name].length - 10, 58, prog(lt, .75, 1.6));
  const a1 = eOut(prog(lt, .9, 1.6)), a2 = eOut(prog(lt, 1.2, 1.9));
  g.save(); g.translate(0, (1 - a1) * 14); serifCol(g, l1, 345, 160, 26, a1 * .85, col); g.restore();
  g.save(); g.translate(0, (1 - a2) * 14); serifCol(g, l2, 392, 160, 26, a2 * .7, col, 400); g.restore();
}

function boat(g, x, y, s, a = 1, reach = 0) {
  g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = a;
  g.fillStyle = `rgb(${INK})`; g.strokeStyle = `rgb(${INK})`; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-78, -14); g.quadraticCurveTo(-50, 2, 0, 3); g.quadraticCurveTo(52, 2, 80, -16);
  g.quadraticCurveTo(60, 16, 0, 16); g.quadraticCurveTo(-58, 16, -78, -14); g.fill();
  g.fillRect(-30, -12, 34, 10);                       // little cabin roof
  g.beginPath(); g.moveTo(-26, -12); g.quadraticCurveTo(-13, -26, 6, -12); g.fill();
  // figure in robe
  g.save(); g.translate(30, -2);
  g.beginPath(); g.moveTo(-15, 0); g.quadraticCurveTo(-9, -24, -6, -40); g.lineTo(6, -40); g.quadraticCurveTo(9, -24, 16, 0); g.fill();
  g.beginPath(); g.arc(0, -47, 6.5, 0, 7); g.fill();
  g.beginPath(); g.ellipse(-1, -55, 4, 3, 0, 0, 7); g.fill();     // hair bun
  g.lineWidth = 2.2; g.beginPath(); g.moveTo(-12, -16); g.lineTo(10, -46); g.stroke();   // sword on back
  g.lineWidth = 3.2; g.beginPath(); g.moveTo(5, -36);
  if (reach > 0) g.quadraticCurveTo(22, -30 + reach * 10, 24 + reach * 16, -18 + reach * 22); else g.quadraticCurveTo(14, -28, 10, -20);
  g.stroke();
  g.restore();
  g.lineWidth = 2.2; g.beginPath(); g.moveTo(-70, -60); g.lineTo(-40, 26); g.stroke();   // pole
  g.restore();
}

function ripples(g, y0, y1, t, a, seed, speed = 20, col = INK) {
  const R = rng(seed);
  g.lineCap = 'round';
  for (let k = 0; k < 90; k++) {
    const yy = y0 + Math.pow(R(), 1.4) * (y1 - y0), dep = (yy - y0) / (y1 - y0);
    const L = 30 + R() * 140 * (.4 + dep), x = ((R() * (W + 400) + t * speed * (.5 + dep)) % (W + 400)) - 200;
    g.strokeStyle = `rgba(${col},${a * (.25 + .5 * R())})`; g.lineWidth = .8 + dep * 2.2;
    g.beginPath(); g.moveTo(x, yy); g.quadraticCurveTo(x + L / 2, yy - 2 - dep * 3, x + L, yy); g.stroke();
  }
}

// ---------- scenes (lt = local time since the scene start)
function S0(g, lt) {
  paper(g);
  const p = prog(lt, .3, 2.6);
  if (p > 0) {
    const r = 120 + 760 * eOut(p);
    g.globalAlpha = lerp(.95, .22, eOut(prog(lt, .4, 2.2)));
    g.drawImage(A.bloom, 960 - r, 520 - r * .62, r * 2, r * 1.24);
    g.globalAlpha = 1;
  }
  const push = 1 + lt * .012;
  g.save(); g.translate(960, 520); g.scale(push, push); g.translate(-960, -520);
  inkChar(g, '李', 770, 500, 380, 'Cao', prog(lt, 1.0, 1.7));
  inkChar(g, '白', 1150, 520, 380, 'Cao', prog(lt, 1.6, 2.3));
  seal(g, '诗仙', 1395, 650, 104, prog(lt, 2.6, 3.3));
  const a = eOut(prog(lt, 2.9, 3.8));
  g.save(); g.globalAlpha = a; g.font = '400 34px Serif'; g.textAlign = 'center'; g.fillStyle = `rgba(${INK},.8)`;
  if (g.letterSpacing !== undefined) g.letterSpacing = '14px';
  g.fillText('唐 · 公元七〇一 — 七六二', 960, 820 + (1 - a) * 16);
  g.font = '300 22px Serif'; if (g.letterSpacing !== undefined) g.letterSpacing = '10px'; g.fillStyle = `rgba(${INK},.55)`;
  g.fillText('诗 仙 的 一 生', 960, 870 + (1 - a) * 16);
  g.restore();
  g.restore();
}

function S1(g, lt) {                                      // 出蜀 · 724
  paper(g);
  const gr = g.createLinearGradient(0, 0, 0, 700); gr.addColorStop(0, 'rgba(120,100,70,.10)'); gr.addColorStop(1, 'rgba(120,100,70,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, 700);
  // half moon 半轮秋
  const mx = 1330, my = 210;
  wash(g, mx, my, 260, 200, .16);
  g.fillStyle = '#f5eedd'; g.beginPath(); g.arc(mx, my, 62, 0, 7); g.fill();
  g.fillStyle = `rgba(${INK},.13)`; g.beginPath(); g.arc(mx, my, 62, -Math.PI / 2, Math.PI / 2, true); g.ellipse(mx, my, 20, 62, 0, Math.PI / 2, -Math.PI / 2, true); g.fill();
  const z = 1 + lt * .01;
  g.save(); g.translate(960, 600); g.scale(z, z); g.translate(-960, -600);
  g.drawImage(A.r1far, -200 - lt * 10, 160);
  g.drawImage(A.r1mid, -300 - lt * 22, 300);
  // river band
  ripples(g, 790, 1080, lt, .32, 11, 18);
  g.fillStyle = 'rgba(245,238,221,.55)';
  for (let k = 0; k < 6; k++) { const yy = 820 + k * 34; g.fillRect(mx - 26 + Math.sin(lt * 2 + k) * 8, yy, 52 - k * 6, 3); }   // moon in the water
  boat(g, 440 + lt * 46, 880 + Math.sin(lt * 1.8) * 3, 1.05);
  g.drawImage(A.r1near, -400 - lt * 55, 560);
  g.restore();
  chapter(g, lt, '出蜀', '壹', '开元十二年 · 七二四', '仗剑去国 辞亲远游');
  column(g, '峨眉山月半轮秋', 1720, 170, 74, 'Kai', lt, .6, .16);
  column(g, '影入平羌江水流', 1620, 250, 74, 'Kai', lt, 1.9, .16);
}

function S2(g, lt) {                                      // 漫游 · 黄河之水天上来
  paper(g);
  const hz = 330, shake = (lt > 0 && lt < 7) ? Math.sin(lt * 53) * 1.6 * Math.exp(-((lt % .75) * 6)) : 0;
  g.save(); g.translate(0, shake);
  // sky wash + distant ranges
  wash(g, 960, hz - 40, 900, 200, .12);
  g.drawImage(A.r2far, -lt * 6 - 300, hz - 230);
  // river: widening from the horizon
  const halfW = (y) => 30 + Math.pow((y - hz) / (H - hz), 1.25) * 1250;
  g.beginPath(); g.moveTo(960 - 30, hz);
  for (let y = hz; y <= H + 40; y += 20) g.lineTo(960 - halfW(y) + Math.sin(y * .01) * 30, y);
  for (let y = H + 40; y >= hz; y -= 20) g.lineTo(960 + halfW(y) + Math.sin(y * .012 + 1) * 30, y);
  const rg = g.createLinearGradient(0, hz, 0, H); rg.addColorStop(0, 'rgba(160,112,52,.55)'); rg.addColorStop(1, 'rgba(150,104,48,.22)');
  g.fillStyle = rg; g.fill();
  // waves rushing toward camera
  const R = rng(5); g.lineCap = 'round';
  for (let k = 0; k < 150; k++) {
    const u0 = R(), s = R() * 2 - 1, sp = .22 + R() * .14, wob = R();
    const u = (u0 + lt * sp) % 1, y = hz + (H - hz + 120) * Math.pow(u, 2.1);
    const sc = .04 + Math.pow(u, 1.6) * 1.5, x = 960 + s * halfW(Math.min(y, H)) * .95;
    const L = 60 + 180 * sc, a = clamp(u * 5) * clamp((1 - u) * 6) * (.35 + .4 * wob);
    g.strokeStyle = `rgba(${INK},${a})`; g.lineWidth = 1 + 9 * sc;
    g.beginPath(); g.moveTo(x - L / 2, y); g.bezierCurveTo(x - L * .2, y - 26 * sc, x + L * .1, y - 30 * sc, x + L / 2, y - 4 * sc); g.stroke();
    if (wob > .7) { g.lineWidth = .6 + 3 * sc; g.beginPath(); g.moveTo(x + L * .2, y - 26 * sc); g.quadraticCurveTo(x + L * .45, y - 40 * sc, x + L * .55, y - 18 * sc); g.stroke(); }
  }
  // banks
  g.drawImage(A.bankL, -60 - lt * 4, 420, 900, 700);
  g.save(); g.translate(W + 60 + lt * 4, 420); g.scale(-1, 1); g.drawImage(A.bankR, 0, 0, 900, 700); g.restore();
  g.restore();
  chapter(g, lt, '漫游', '贰', '七二五 — 七四二', '东涉溟海 散金三十万');
  column(g, '君不见', 1760, 150, 72, 'Kai', lt, .55, .24, .4);
  column(g, '黄河之水天上来', 1640, 150, 108, 'Cao', lt, 1.27, .24, .4, INK, 1, 1.0);
  column(g, '天生我材必有用', 1480, 250, 64, 'Kai', lt, 4.0, .18);
}

function S3(g, lt) {                                      // 长安 · 742 → 赐金放还 744
  paper(g);
  const fall = eInOut(prog(lt, 5, 6.2));
  // vermilion sun
  g.save(); g.globalAlpha = lerp(.85, .25, fall);
  const sy = 330 + fall * 60;
  wash(g, 960, sy, 340, 340, .14, '180,40,29');
  g.fillStyle = 'rgba(180,40,29,.78)'; g.beginPath(); g.arc(960, sy, 150, 0, 7); g.fill();
  g.restore();
  const z = lerp(1.0 + lt * .015, .92, fall);
  g.save(); g.translate(960, 760); g.scale(z, z); g.translate(-960, -760);
  g.drawImage(A.r3far, -300 - lt * 8, 380);
  // mist bands
  g.globalAlpha = lerp(1, .55, fall);
  g.drawImage(A.hall, 160, 210);
  g.globalAlpha = 1;
  for (let k = 0; k < 3; k++) { const gr = g.createLinearGradient(0, 760 + k * 70, 0, 860 + k * 70); gr.addColorStop(0, 'rgba(239,230,211,0)'); gr.addColorStop(.5, 'rgba(239,230,211,.85)'); gr.addColorStop(1, 'rgba(239,230,211,0)'); g.fillStyle = gr; g.fillRect(0, 760 + k * 70, W, 100); }
  g.drawImage(A.r3near, -500 - lt * 26, 720);
  g.restore();
  if (fall > 0) { g.fillStyle = `rgba(110,100,85,${fall * .18})`; g.fillRect(0, 0, W, H); }
  chapter(g, lt, '长安', '叁', '天宝元年 · 七四二', '奉诏入京 供奉翰林');
  const pa = lerp(1, .32, fall);
  column(g, '仰天大笑出门去', 1720, 170, 74, 'Kai', lt, .4, .16, .55, INK, pa);
  column(g, '我辈岂是蓬蒿人', 1620, 250, 74, 'Kai', lt, 1.8, .16, .55, INK, pa);
  // 赐金放还
  seal(g, '赐金放还', 1300, 560, 210, prog(lt, 5.0, 5.8), .05);
  const a = eOut(prog(lt, 5.4, 6.2));
  serifCol(g, '天宝三载 · 七四四', 1460, 470, 26, a * .8);
}

function S4(g, lt) {                                      // 流放 757 → 遇赦 759 · 轻舟
  const cut = 2.5;
  // A: storm
  const storm = (g) => {
    paper(g);
    g.fillStyle = `rgba(${INK},.55)`; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 7; k++) {
      const x = ((k * 397 + lt * (60 + k * 25)) % 2600) - 340, y = 200 + (k * 173) % 600;
      wash(g, x, y, 520 + k * 40, 260 + k * 20, .55);
    }
    wash(g, 960, 1120, 1200, 260, .35, '180,40,29');      // 安史 fire on the horizon
    g.drawImage(A.r4dark, -lt * 30 - 200, 560);
    [[.3, 560, 360, 420], [.95, 1340, 300, 520], [1.6, 820, 640, 360]].forEach(([t0, x, y, s], i) => {
      const p = prog(lt, t0, t0 + .18); if (p <= 0) return;
      const k = .6 + .4 * eBack(p); g.globalAlpha = .9;
      g.drawImage(A.splat[i], x - s * k / 2, y - s * k / 2, s * k, s * k); g.globalAlpha = 1;
    });
    const L = (s) => `rgba(239,230,211,${s})`;
    column(g, '流放', 230, 190, 140, 'Cao', lt, .25, .22, .7, '239,230,211');
    seal(g, '肆', 230, 480, 58, prog(lt, .75, 1.4));
    serifCol(g, '至德二载 · 七五七', 345, 160, 26, eOut(prog(lt, .9, 1.6)) * .85, '239,230,211');
    serifCol(g, '长流夜郎', 392, 160, 26, eOut(prog(lt, 1.2, 1.9)) * .7, '239,230,211', 400);
    void L;
  };
  // B: gorge — boat flying through ten thousand peaks
  const gorge = (g) => {
    const u = lt - cut;
    paper(g);
    wash(g, 1100, 200, 900, 260, .1);
    g.fillStyle = '#f2ead8'; g.beginPath(); g.arc(1500, 190, 46, 0, 7); g.fill();
    g.drawImage(A.r4far, -200 - u * 90, 120);
    g.drawImage(A.r4mid, -300 - u * 260, 250);
    ripples(g, 820, 1080, u, .4, 21, -700);
    const bx = 760 + Math.sin(u * 1.3) * 30, by = 880 + Math.sin(u * 3.1) * 5;
    g.strokeStyle = `rgba(${INK},.25)`; g.lineWidth = 2;
    for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(bx - 90 - k * 40, by + 12 + k * 4); g.lineTo(bx - 300 - k * 90, by + 14 + k * 5); g.stroke(); }
    boat(g, bx, by, 1.15);
    for (let k = 0; k < 3; k++) { g.globalAlpha = [1, .35, .15][k]; g.drawImage(A.r4near, -600 - u * 900 + k * 40, 430); }
    g.globalAlpha = 1;
    serifCol(g, '乾元二年 · 七五九', 230, 170, 26, eOut(prog(u, .3, 1)) * .85);
    serifCol(g, '白帝城遇赦', 277, 170, 26, eOut(prog(u, .5, 1.2)) * .7, INK, 400);
    column(g, '两岸猿声啼不住', 1720, 160, 74, 'Kai', u, .4, .11, .4);
    column(g, '轻舟已过万重山', 1610, 240, 82, 'Cao', u, 1.55, .11, .4);
  };
  if (lt < cut - .45) return storm(g);
  if (lt > cut + .45) return gorge(g);
  inkDissolve(g, storm, gorge, prog(lt, cut - .45, cut + .45), 760, 880, .55);
}

function S5(g, lt) {                                      // 捉月 · 762 → 终
  paper(g);
  const L = '239,230,211';
  const night = g.createLinearGradient(0, 0, 0, H); night.addColorStop(0, `rgba(${INK},.86)`); night.addColorStop(.62, `rgba(${INK},.62)`); night.addColorStop(1, `rgba(${INK},.8)`);
  g.fillStyle = night; g.fillRect(0, 0, W, H);
  const rise = eOut(prog(lt, 0, 3.5)), my = lerp(470, 360, rise), mr = 150;
  wash(g, 960, my, 620, 520, .22, L);
  g.fillStyle = '#f3ebd8'; g.beginPath(); g.arc(960, my, mr, 0, 7); g.fill();
  g.fillStyle = 'rgba(120,105,85,.10)';
  [[-40, -30, 40], [50, 30, 28], [10, 60, 22]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(960 + dx, my + dy, r, 0, 7); g.fill(); });
  g.drawImage(A.r5far, -200 - lt * 8, 470);
  // water + broken moon reflection
  g.fillStyle = `rgba(${INK},.35)`; g.fillRect(0, 760, W, 320);
  for (let k = 0; k < 16; k++) {
    const yy = 780 + k * 18, w2 = (150 - k * 6) * (.7 + .3 * Math.sin(lt * 2.2 + k * 1.7));
    g.fillStyle = `rgba(243,235,216,${.55 - k * .025})`; g.fillRect(960 - w2 / 2 + Math.sin(lt * 1.5 + k) * 12, yy, w2, 4);
  }
  ripples(g, 770, 1080, lt, .35, 31, 14, L);
  const reach = eInOut(prog(lt, 1.2, 3.4));
  boat(g, 640, 820, 1.0, 1, reach);
  const fin = eInOut(prog(lt, 4.0, 5.0));
  const pa = 1 - fin * .85;
  column(g, '举头望明月', 1720, 220, 78, 'Kai', lt, .3, .16, .55, L, pa);
  column(g, '低头思故乡', 1610, 300, 78, 'Kai', lt, 1.4, .16, .55, L, pa);
  g.save(); g.globalAlpha = pa;
  column(g, '捉月', 230, 190, 140, 'Cao', lt, .25, .22, .7, L);
  seal(g, '伍', 230, 480, 58, prog(lt, .75, 1.4));
  serifCol(g, '宝应元年 · 七六二', 345, 160, 26, eOut(prog(lt, .9, 1.6)) * .85, L);
  serifCol(g, '卒于当涂 传醉后捉月', 392, 160, 26, eOut(prog(lt, 1.2, 1.9)) * .7, L, 400);
  g.restore();
  // finale card
  const q1 = prog(lt, 4.3, 5.1);
  if (q1 > 0) {
    const s = '绣口一吐 就半个盛唐';
    [...s].forEach((ch, i) => { if (ch !== ' ') inkChar(g, ch, 960 + (i - 4.5) * 92, 640, 84, 'Kai', prog(lt, 4.3 + i * .07, 4.9 + i * .07), L); });
    const a = eOut(prog(lt, 5.0, 5.7));
    g.save(); g.font = '300 24px Serif'; g.textAlign = 'center'; g.fillStyle = `rgba(${L},${a * .7})`; if (g.letterSpacing !== undefined) g.letterSpacing = '6px';
    g.fillText('—— 余光中《寻李白》', 1260, 712); g.restore();
    inkChar(g, '李', 900, 860, 120, 'Cao', prog(lt, 5.2, 5.8), L);
    inkChar(g, '白', 1010, 868, 120, 'Cao', prog(lt, 5.35, 5.95), L);
    seal(g, '诗仙', 1110, 880, 64, prog(lt, 5.3, 6.0));
    g.save(); g.font = '400 24px Serif'; g.textAlign = 'center'; g.fillStyle = `rgba(${L},${eOut(prog(lt, 5.6, 6.3)) * .65})`; if (g.letterSpacing !== undefined) g.letterSpacing = '10px';
    g.fillText('七〇一 — 七六二', 960, 960); g.restore();
  }
}

// ---------- ink-bleed dissolve between two scene painters
const buf = { a: mk(W, H), b: mk(W, H), t: mk(W, H), m: mk(480, 270), e: mk(480, 270) };
function inkDissolve(g, drawA, drawB, p, ox = 960, oy = 540, rad = .45) {
  const ga = buf.a.getContext('2d'), gb = buf.b.getContext('2d'), gt = buf.t.getContext('2d');
  ga.setTransform(1, 0, 0, 1, 0, 0); gb.setTransform(1, 0, 0, 1, 0, 0);
  drawA(ga); drawB(gb);
  const mw = 480, mh = 270, mc = buf.m.getContext('2d'), ec = buf.e.getContext('2d');
  const mi = mc.createImageData(mw, mh), ei = ec.createImageData(mw, mh), md = mi.data, ed = ei.data;
  const th = lerp(-.12, 1.15, eInOut(p)), wd = .035;
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const i = y * mw + x, dist = Math.hypot((x * 4 - ox) / 1920, (y * 4 - oy) / 1920) * 1.6;
    const v = A.field[i] * (1 - rad) + dist * rad;
    const a = 1 - sstep(th - wd, th + wd, v);
    md[i * 4 + 3] = a * 255;
    const e = Math.exp(-Math.pow((v - th - wd) / .045, 2)) * (p < .95 ? 1 : (1 - p) * 20);
    ed[i * 4] = 20; ed[i * 4 + 1] = 18; ed[i * 4 + 2] = 16; ed[i * 4 + 3] = clamp(e * .75) * 255;
  }
  mc.putImageData(mi, 0, 0); ec.putImageData(ei, 0, 0);
  g.drawImage(buf.a, 0, 0);
  gt.globalCompositeOperation = 'copy'; gt.imageSmoothingQuality = 'high'; gt.drawImage(buf.m, 0, 0, W, H);
  gt.globalCompositeOperation = 'source-in'; gt.drawImage(buf.b, 0, 0);
  g.drawImage(buf.t, 0, 0);
  g.save(); g.filter = 'blur(6px)'; g.imageSmoothingQuality = 'high'; g.drawImage(buf.e, 0, 0, W, H); g.restore();
}

const SCENES = [[0, 5, S0], [5, 12, S1], [12, 19, S2], [19, 26, S3], [26, 33, S4], [33, 40.2, S5]];
const XF = .55;
const ORIGINS = [[960, 540], [1400, 260], [960, 330], [960, 330], [760, 880], [960, 400]];

const cv = document.getElementById('c'), G = cv.getContext('2d');
window.renderAt = async (t) => {
  G.setTransform(1, 0, 0, 1, 0, 0); G.globalAlpha = 1; G.globalCompositeOperation = 'source-over'; G.filter = 'none';
  let done = false;
  for (let i = 1; i < SCENES.length; i++) {
    const b = SCENES[i][0];
    if (t > b - XF && t < b + XF) {
      const [sa, , fa] = SCENES[i - 1], [sb, , fb] = SCENES[i];
      inkDissolve(G, (g) => fa(g, t - sa), (g) => fb(g, t - sb), prog(t, b - XF, b + XF), ...ORIGINS[i]);
      done = true; break;
    }
  }
  if (!done) { const s = SCENES.find(([a, b]) => t >= a && t < b) || SCENES[SCENES.length - 1]; s[2](G, t - s[0]); }
  // finish: paper grain multiply, film grain, vignette, fade in/out
  G.save();
  G.globalCompositeOperation = 'multiply'; G.globalAlpha = .35; G.drawImage(A.paper, 0, 0);
  G.globalCompositeOperation = 'soft-light'; G.globalAlpha = .22;
  const f = Math.floor(t * 30), ox = (f * 397) % 900, oy = (f * 211) % 900;
  G.drawImage(A.grain, ox, oy, 1100, 1100, 0, 0, W, H);
  G.restore();
  G.drawImage(A.vig, 0, 0);
  const fade = Math.max(1 - prog(t, 0, .35), prog(t, 39.4, 40));
  if (fade > 0) { G.fillStyle = `rgba(14,12,10,${fade})`; G.fillRect(0, 0, W, H); }
};

(async () => {
  A.paper = await loadImg('paper.jpg');
  A.grain = await loadImg('/assets/textures/grain/grain_film35_2048.png');
  await Promise.all(['Cao', 'Kai', 'Xing'].map((f) => document.fonts.load(`80px ${f}`, '李白诗仙出蜀峨眉山月半轮秋影入平羌江水流漫游君不见黄河之水天上来生我材必有用长安仰笑门去辈岂是蓬蒿人流放两岸猿声啼不住轻舟已过万重捉举头望明低思故乡绣口一吐就个盛唐')));
  await document.fonts.load('900 80px Serif', '唐公元七〇一六二诗的生开十年四仗剑去国辞亲远游壹贰叁肆伍东涉溟海散金三万天宝奉诏入京供翰林赐还载至德长夜郎乾白帝城遇赦应卒于当涂传醉后余光中寻');
  A.bloom = makeBloom(700, 3);
  A.splat = [makeSplat(500, 1), makeSplat(500, 2), makeSplat(500, 3)];
  A.field = makeMaskField();
  A.hall = makeHall();
  A.r1far = makeRange({ w: 2600, h: 600, seed: 11, base: 380, amp: 260, freq: .0022, alpha: .32, fade: 160, cun: 300, steep: 1.3 });
  A.r1mid = makeRange({ w: 2900, h: 600, seed: 12, base: 460, amp: 330, freq: .0028, alpha: .55, fade: 170, cun: 700, steep: 1.5 });
  A.r1near = makeRange({ w: 3200, h: 600, seed: 13, base: 420, amp: 220, freq: .0035, alpha: .92, fade: 130, cun: 900, steep: 1.2 });
  A.r2far = makeRange({ w: 2600, h: 300, seed: 21, base: 240, amp: 120, freq: .004, alpha: .35, fade: 70, cun: 200 });
  A.bankL = fadeInner(makeRange({ w: 900, h: 700, seed: 22, base: 640, amp: 560, freq: .0045, alpha: .85, fade: 260, cun: 700, steep: 1.1 }), 480, 880);
  A.bankR = fadeInner(makeRange({ w: 900, h: 700, seed: 23, base: 640, amp: 520, freq: .0045, alpha: .85, fade: 260, cun: 700, steep: 1.1 }), 480, 880);
  A.r3far = makeRange({ w: 2600, h: 500, seed: 31, base: 380, amp: 220, freq: .0026, alpha: .3, fade: 140, cun: 300 });
  A.r3near = makeRange({ w: 3200, h: 400, seed: 32, base: 300, amp: 160, freq: .004, alpha: .9, fade: 110, cun: 700 });
  A.r4dark = makeRange({ w: 2600, h: 520, seed: 41, base: 460, amp: 300, freq: .003, alpha: .95, fade: 220, cun: 500, steep: 1.4 });
  A.r4far = makeRange({ w: 3400, h: 700, seed: 42, base: 600, amp: 480, freq: .004, alpha: .35, fade: 200, cun: 400, steep: 2.0 });
  A.r4mid = makeRange({ w: 4600, h: 700, seed: 43, base: 640, amp: 560, freq: .005, alpha: .62, fade: 220, cun: 1200, steep: 2.2 });
  A.r4near = makeRange({ w: 9000, h: 700, seed: 44, base: 660, amp: 600, freq: .006, alpha: .95, fade: 200, cun: 2600, steep: 2.4 });
  A.r5far = makeRange({ w: 2600, h: 400, seed: 51, base: 300, amp: 170, freq: .003, alpha: .7, fade: 140, cun: 300 });
  A.vig = mk(W, H);
  { const g = A.vig.getContext('2d'), gr = g.createRadialGradient(960, 540, 400, 960, 540, 1150); gr.addColorStop(0, 'rgba(40,30,20,0)'); gr.addColorStop(1, 'rgba(40,30,20,.42)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  window.__ready = true;
})();
