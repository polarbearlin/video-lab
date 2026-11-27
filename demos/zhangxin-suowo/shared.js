// 《不信掌纹吉否，只信掌心所握》16:9 横屏（1920×1080）· 三种风格共用：时间轴、字幕、工具函数
// 每一帧都是时间 t 的纯函数：随机数全部固定种子，不读真实时钟，不保留上一帧状态。
const W = 1920, H = 1080, FPS = 24, DUR = 37.083;

// 字幕：transcript_checked.srt（校对版）。显示时去掉句末的 ，。；：（保留 ？ 和句中标点）
const SUBS = [
  [0.00, 2.08, '如果你只是在胜券在握的时候才肯拔剑，'],
  [2.08, 3.98, '那么你根本就不是命运的挑战者，'],
  [3.98, 5.66, '你只不过是命运的投机者。'],
  [5.66, 7.94, '当一个社会的所有人都死死的盯住'],
  [7.94, 9.66, '一个吉象才肯下注的时候，'],
  [9.66, 12.40, '那么生命的质地就会变得如此的轻薄。'],
  [12.40, 14.10, '因为一个真正的能够伟大的'],
  [14.10, 15.84, '拓宽人类边界的事业，'],
  [15.84, 16.82, '起初的卦象'],
  [16.82, 18.30, '往往是大凶。'],
  [18.30, 20.36, '我们不要相信手掌上面的纹路，'],
  [20.36, 22.68, '而要相信我们攥紧手掌的力量。'],
  [22.68, 24.10, '人终其一生，世途三千，'],
  [24.10, 25.12, '不也就是见天地、'],
  [25.12, 25.78, '见众生、'],
  [25.78, 26.58, '见自己吗？'],
  [26.58, 27.92, '莫忘周易的第一句：'],
  [27.92, 28.76, '天行健，'],
  [28.76, 30.24, '君子以自强不息；'],
  [30.24, 31.04, '地势坤，'],
  [31.04, 32.60, '君子以厚德载物。'],
  [32.60, 34.86, '所以既然命运的洪流不可以阻挡，'],
  [34.86, 36.04, '那么我们的回答是：'],
  [36.04, 37.083, '向前。'],
];

// 三张选样关键帧：开头（拔剑）/ 中段（卦象大凶 + 掌纹）/ 结尾（天行健 → 向前）
const KEYS = [1.40, 17.60, 36.50];

// 画面段落。选样阶段每种风格只设计这三段；正片阶段再按 SUBS 细分镜头。
const SCENES = [
  { id: 'open', t0: 0, t1: 12.40 },     // 拔剑 / 挑战者 vs 投机者 / 吉象
  { id: 'gua', t0: 12.40, t1: 22.68 },  // 卦象大凶 / 掌纹 / 攥紧手掌
  { id: 'end', t0: 22.68, t1: DUR },    // 见天地 / 周易 / 向前
];

const BADGE = '掌心所握';
const TITLE = '不信掌纹吉否 · 只信掌心所握';
const QIAN = '天行健，君子以自强不息';
const KUN = '地势坤，君子以厚德载物';

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (a, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, a));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = a => { a = clamp(a); return a * a * (3 - 2 * a); };
const easeOut = a => 1 - Math.pow(1 - clamp(a), 3);

function sceneAt(t) { return SCENES.find(s => t >= s.t0 && t < s.t1) || SCENES[SCENES.length - 1]; }
function subAt(t) {
  const s = SUBS.find(([a, b]) => t >= a && t < b) || (t >= DUR - 0.01 ? SUBS[SUBS.length - 1] : null);
  if (!s) return null;
  return { t0: s[0], t1: s[1], text: s[2].replace(/[，。；：]$/, ''), k: clamp((t - s[0]) / 0.14) };
}

// 文字框登记：stills.mjs 读 window.__boxes 检查出框 / 互相遮挡，check_glyphs.py 按字体查缺字
const BOX = [];
function fontStr(px, fam, weight = 400) { return `${weight} ${px}px ${fam}`; }
function text(ctx, s, x, y, o = {}) {
  const px = o.px || 48, fam = o.fam || '"NotoSans"', wt = o.weight || 400;
  ctx.save();
  ctx.font = fontStr(px, fam, wt);
  ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
  if (o.ls) ctx.letterSpacing = o.ls + 'px';
  const m = ctx.measureText(s);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o.strokeW || 8; ctx.strokeStyle = o.stroke; ctx.strokeText(s, x, y); }
  if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.shadowBlur || 20; ctx.shadowOffsetY = o.shadowY || 0; }
  ctx.fillStyle = o.color || '#000'; ctx.fillText(s, x, y);
  const tr = ctx.getTransform();
  ctx.restore();
  const x0 = x - m.actualBoundingBoxLeft, x1 = x + m.actualBoundingBoxRight, y0 = y - m.actualBoundingBoxAscent, y1 = y + m.actualBoundingBoxDescent;
  const p = [tr.transformPoint({ x: x0, y: y0 }), tr.transformPoint({ x: x1, y: y0 }), tr.transformPoint({ x: x0, y: y1 }), tr.transformPoint({ x: x1, y: y1 })];
  BOX.push({ text: s, fam: fam.split(',')[0].replace(/"/g, '').trim(), weight: wt, layer: o.layer || 'deco',
    x0: Math.min(...p.map(q => q.x)), x1: Math.max(...p.map(q => q.x)), y0: Math.min(...p.map(q => q.y)), y1: Math.max(...p.map(q => q.y)) });
  return m.width;
}
// 竖排（逐字）
function vtext(ctx, s, x, y0, o = {}) { const px = o.px || 48, gap = o.gap || 1.15; [...s].forEach((c, i) => { if (/[，、；：。]/.test(c)) return; text(ctx, c, x, y0 + i * px * gap, o); }); return [...s].length * px * gap; }
// 字号自适应：超过 maxW 就缩小
function fitPx(ctx, s, px, maxW, fam, wt = 400, ls = 0) {
  ctx.save(); for (; px > 12; px -= 2) { ctx.font = fontStr(px, fam, wt); ctx.letterSpacing = ls + 'px'; if (ctx.measureText(s).width <= maxW) break; } ctx.restore(); return px;
}

// 一只张开的手（掌心朝外，手指朝上），单位尺寸：高约 1.25s，原点在掌心
function handPath(s) {
  const P = new Path2D();
  const palm = new Path2D();
  palm.moveTo(-0.30, 0.62); palm.bezierCurveTo(-0.40, 0.42, -0.42, 0.10, -0.38, -0.14);
  palm.lineTo(0.38, -0.17); palm.bezierCurveTo(0.43, 0.10, 0.38, 0.44, 0.27, 0.62); palm.closePath();
  P.addPath(palm);
  const cap = (x, y, ang, len, w) => { const c = new Path2D(); c.roundRect(-w / 2, -len, w, len + w * 0.6, w / 2); P.addPath(c, new DOMMatrix().translate(x, y).rotate(ang * 180 / Math.PI)); };
  cap(-0.27, -0.06, -0.13, 0.52, 0.165);
  cap(-0.09, -0.10, -0.04, 0.60, 0.17);
  cap(0.10, -0.10, 0.05, 0.56, 0.165);
  cap(0.27, -0.06, 0.15, 0.42, 0.15);
  cap(-0.33, 0.22, -0.95, 0.42, 0.18);
  const out = new Path2D(); out.addPath(P, new DOMMatrix().scale(s)); return out;
}
// 掌纹：感情线、智慧线、生命线（同一单位坐标）
function palmLines(s) {
  const L = [[[0.37, -0.02], [0.12, 0.08], [-0.10, -0.06], [-0.27, -0.03]],
    [[-0.37, 0.06], [-0.10, 0.06], [0.08, 0.16], [0.28, 0.24]],
    [[-0.33, 0.04], [-0.12, 0.16], [-0.16, 0.42], [-0.06, 0.60]]];
  return L.map(q => { const p = new Path2D(); p.moveTo(q[0][0] * s, q[0][1] * s); p.bezierCurveTo(q[1][0] * s, q[1][1] * s, q[2][0] * s, q[2][1] * s, q[3][0] * s, q[3][1] * s); return p; });
}

// 卦象：从下往上 6 爻，1 = 阳爻（一整画），0 = 阴爻（中间断开）
const GUA = { qian: [1, 1, 1, 1, 1, 1], kun: [0, 0, 0, 0, 0, 0], pi: [0, 0, 0, 1, 1, 1] };   // 否卦：坤下乾上，天地不交

// 种子噪声纹理（初始化一次，内容固定）
function noiseCanvas(w, h, seed, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, rng(seed), w, h); return c; }
