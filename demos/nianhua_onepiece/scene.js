// 《海上年画 · 英雄谱》年画风格探索 · 竖屏 30 秒（1080×1920）
// 年画规则（从杨柳青、桃花坞木版年画里提炼）：
//   色：大红、桃红、明黄、金、翠绿、靛蓝、紫，平涂不渐变，满构图少留白；
//   线：粗黑墨线勾边（线宽有一点粗细变化）；颜色版和墨线版故意错位几像素，模仿木版套色印刷；
//   构图：人物居中、左右对称、"门神"站姿；上横批、左右对联（上联在右、下联在左）；
//   纹样：海水江崖纹（海浪 + 山石，正好配海贼）、祥云、回纹边框、铜钱、如意；
//   人物：大头小身（头约占身高三分之一），圆脸、红脸蛋，表情喜庆；
//   质感：宣纸底色 + 纸纤维斑点 + 套色颗粒；落款印章。
const W = 1080, H = 1920, FPS = 30;
const C = { red: '#D7261E', peach: '#F06C9B', yellow: '#F7C21B', gold: '#E0A526', green: '#1E9E5A', grass: '#7CC242', indigo: '#1F4E9C', cyan: '#3FA7D6',
  purple: '#7B3F98', orange: '#F2862E', ink: '#1B1B1B', paper: '#F4E6C8', paper2: '#EAD7AE', skin: '#FBD7B5', tan: '#E8B27E', blush: '#F48A8A', white: '#FFFDF4' };
const FONT_BRUSH = '"MaShan", "WenKai"', FONT_TXT = '"WenKai"';
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (a, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, a));
const smooth = a => { a = clamp(a); return a * a * (3 - 2 * a); };

// 年画笔触：颜色版先印（错位 MIS 像素），墨线版后印
let MIS = [4, 3];
function nh(ctx, path, fill, o = {}) {
  if (fill) { ctx.save(); ctx.translate(MIS[0], MIS[1]); path(); ctx.fillStyle = fill; ctx.fill(); if (o.pat) { ctx.save(); path(); ctx.clip(); o.pat(); ctx.restore(); } ctx.restore(); }
  if (o.lw !== 0) { path(); ctx.lineWidth = o.lw || 6; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
}
const Q = ctx => ({
  circ: (x, y, r) => () => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); },
  ell: (x, y, rx, ry, a = 0) => () => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); },
  rr: (x, y, w, h, r) => () => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); },
  poly: pts => () => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); },
  path: fn => () => { ctx.beginPath(); fn(); },
});
function line(ctx, pts, w = 6, col = C.ink) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }

// ---------------------------------------------------------------- 年画纹样
function xiangyun(ctx, x, y, s, fill = C.white, edge = C.cyan) {   // 祥云：三个卷涡 + 尾巴
  const q = Q(ctx);
  nh(ctx, q.path(() => { ctx.arc(x - s * .55, y, s * .45, Math.PI * .5, Math.PI * 1.9); ctx.arc(x, y - s * .2, s * .55, Math.PI * 1.05, Math.PI * 1.95); ctx.arc(x + s * .6, y, s * .42, Math.PI * 1.2, Math.PI * .5); ctx.quadraticCurveTo(x, y + s * .7, x - s * .55, y + s * .45); ctx.closePath(); }), fill, { lw: 5 });
  ctx.strokeStyle = edge; ctx.lineWidth = 5; for (const [cx, cy, r] of [[x - s * .55, y, s * .22], [x, y - s * .2, s * .28], [x + s * .6, y, s * .2]]) { ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * .6, Math.PI * 2.2); ctx.stroke(); }
}
function haishui(ctx, x0, x1, y, h, t, cols = [C.indigo, C.cyan, C.white], rock = true) {   // 海水江崖纹：斜条立水 + 卷浪 + 中间的山石
  const q = Q(ctx), n = 9;
  for (let k = 0; k < n; k++) { const yy = y + k * h / n; ctx.fillStyle = cols[k % 3]; ctx.fillRect(x0, yy, x1 - x0, h / n + 1); }
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y, x1 - x0, h); ctx.clip(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
  for (let x = x0 - h; x < x1 + h; x += 26) { ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + h * .5, y); ctx.stroke(); } ctx.restore();
  for (let x = x0; x < x1 + 120; x += 120) {   // 卷浪
    const yy = y - 6 + Math.sin(t * 2 + x * .02) * 6;
    nh(ctx, q.path(() => { ctx.moveTo(x - 70, yy + 30); ctx.quadraticCurveTo(x - 40, yy - 50, x + 10, yy - 30); ctx.quadraticCurveTo(x + 40, yy - 18, x + 20, yy + 2); ctx.quadraticCurveTo(x - 4, yy - 16, x - 10, yy + 6); ctx.quadraticCurveTo(x + 10, yy + 30, x + 50, yy + 30); ctx.closePath(); }), C.white, { lw: 4 });
    ctx.strokeStyle = C.cyan; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x + 6, yy - 6, 10, 0, 5); ctx.stroke();
  }
  if (!rock) return;
  const mx = (x0 + x1) / 2;   // 山石
  nh(ctx, q.poly([[mx - 90, y + h * .6], [mx - 50, y - 70], [mx - 10, y - 30], [mx + 30, y - 110], [mx + 90, y + h * .6]]), C.green, { lw: 5, pat: () => { ctx.strokeStyle = C.grass; ctx.lineWidth = 6; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(mx - 60 + k * 30, y + 20); ctx.lineTo(mx - 30 + k * 30, y - 60 + (k % 2) * 30); ctx.stroke(); } } });
}
function huiwen(ctx, x, y, w, h, col = C.gold, step = 34) {   // 回纹边框
  ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'square';
  const unit = (ux, uy, a) => { ctx.save(); ctx.translate(ux, uy); ctx.rotate(a); ctx.beginPath(); const s = step * .8; ctx.moveTo(-s / 2, s / 2); ctx.lineTo(-s / 2, -s / 2); ctx.lineTo(s / 2, -s / 2); ctx.lineTo(s / 2, s / 4); ctx.lineTo(-s / 6, s / 4); ctx.lineTo(-s / 6, -s / 6); ctx.lineTo(s / 6, -s / 6); ctx.stroke(); ctx.restore(); };
  for (let ux = x + step / 2; ux < x + w; ux += step) { unit(ux, y + step / 2, 0); unit(ux, y + h - step / 2, Math.PI); }
  for (let uy = y + step * 1.5; uy < y + h - step; uy += step) { unit(x + step / 2, uy, -Math.PI / 2); unit(x + w - step / 2, uy, Math.PI / 2); }
}
function coin(ctx, x, y, r) { const q = Q(ctx); nh(ctx, q.circ(x, y, r), C.gold, { lw: 4 }); nh(ctx, q.rr(x - r * .3, y - r * .3, r * .6, r * .6, 2), C.red, { lw: 3 }); }
function paperTex(ctx, x, y, w, h, seed = 1) {
  const r = rng(seed); for (let k = 0; k < 900; k++) { ctx.fillStyle = r() < .5 ? 'rgba(120,80,30,.07)' : 'rgba(255,255,255,.18)'; ctx.fillRect(x + r() * w, y + r() * h, 1 + r() * 3, 1 + r() * 2); }
  ctx.strokeStyle = 'rgba(120,80,30,.06)'; ctx.lineWidth = 1; for (let k = 0; k < 60; k++) { const px = x + r() * w, py = y + r() * h; ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + 20, py + 6, px + 30 + r() * 30, py + r() * 10); ctx.stroke(); }
}
function grain(ctx, x, y, w, h, seed = 9) { const r = rng(seed); for (let k = 0; k < 1600; k++) { ctx.fillStyle = `rgba(${r() < .5 ? '255,255,255' : '0,0,0'},.05)`; ctx.fillRect(x + r() * w, y + r() * h, 2, 2); } }   // 套色颗粒

// 竖排文字（对联）
function vtext(ctx, s, x, y0, px, col, gap = 1.12) { ctx.save(); ctx.font = `${px}px ${FONT_BRUSH}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = col; [...s].forEach((c, i) => ctx.fillText(c, x, y0 + i * px * gap)); ctx.restore(); }
function htext(ctx, s, x, y, px, col, font = FONT_BRUSH) { ctx.save(); ctx.font = `${px}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.restore(); }
function seal(ctx, s, x, y, size) {   // 落款印章（朱文方印）
  const q = Q(ctx); ctx.save(); ctx.translate(x, y); ctx.rotate(-.04); nh(ctx, q.rr(-size / 2, -size / 2, size, size, 6), C.red, { lw: 0 });
  ctx.strokeStyle = C.white; ctx.lineWidth = 4; ctx.strokeRect(-size / 2 + 8, -size / 2 + 8, size - 16, size - 16);
  const chars = [...s]; const n = chars.length, cols = n > 2 ? 2 : 1, rows = Math.ceil(n / cols), cs = (size - 30) / Math.max(rows, cols);
  ctx.font = `${cs}px ${FONT_BRUSH}`; ctx.fillStyle = C.white; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  chars.forEach((c, i) => { const col = cols - 1 - Math.floor(i / rows), row = i % rows; ctx.fillText(c, (col - (cols - 1) / 2) * cs, (row - (rows - 1) / 2) * cs); }); ctx.restore();
}

// ---------------------------------------------------------------- 人物零件
function face(ctx, x, y, R, o = {}) {   // 年画圆脸：红脸蛋、弯眉
  const q = Q(ctx); nh(ctx, q.ell(x, y, R, R * (o.long || 1.02)), o.skin || C.skin, { lw: 6 });
  ctx.fillStyle = C.blush; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + sx * R * .55, y + R * .3, R * .2, R * .13, 0, 0, 7); ctx.fill(); }
  const ey = y - R * .02;
  if (o.eyes === 'fierce') { line(ctx, [[x - R * .62, ey - R * .3], [x - R * .2, ey - R * .16]], 9); line(ctx, [[x + R * .62, ey - R * .3], [x + R * .2, ey - R * .16]], 9);
    for (const sx of [-1, 1]) { nh(ctx, q.ell(x + sx * R * .38, ey, R * .14, R * .1), C.white, { lw: 4 }); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x + sx * R * .36, ey, R * .06, 0, 7); ctx.fill(); } }
  else if (o.eyes === 'closed') { for (const sx of [-1, 1]) line(ctx, [[x + sx * R * .52, ey], [x + sx * R * .38, ey - R * .08], [x + sx * R * .24, ey]], 5); }
  else { for (const sx of [-1, 1]) { line(ctx, [[x + sx * R * .55, ey - R * .28], [x + sx * R * .2, ey - R * .3]], 6); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(x + sx * R * .38, ey, R * .08, R * .11, 0, 0, 7); ctx.fill(); ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(x + sx * R * .36, ey - R * .04, R * .03, 0, 7); ctx.fill(); } }
  if (o.mouth !== false) { line(ctx, [[x - R * .16, y + R * .45], [x, y + R * .52], [x + R * .16, y + R * .45]], 5); }
}
function robe(ctx, x, top, w, h, fill, trim = C.gold, pat) {   // 年画长袍（梯形）+ 金边腰带
  const q = Q(ctx); nh(ctx, q.poly([[x - w * .36, top], [x + w * .36, top], [x + w * .5, top + h], [x - w * .5, top + h]]), fill, { lw: 7, pat });
  nh(ctx, q.rr(x - w * .42, top + h * .38, w * .84, h * .1, 8), trim, { lw: 5, pat: () => { for (let k = -4; k <= 4; k++) coin(ctx, x + k * w * .1, top + h * .43, h * .03); } });
}
function flames(ctx, x, y, s, t, seed = 1) {   // 年画火焰纹：卷曲的三层火舌
  const r = rng(seed), q = Q(ctx);
  for (const [col, k] of [[C.red, 1], [C.orange, .72], [C.yellow, .45]]) {
    nh(ctx, q.path(() => { const n = 7; for (let i = 0; i <= n; i++) { const a = Math.PI + i / n * Math.PI, rr = s * k * (1 + .25 * Math.sin(t * 6 + i * 2 + seed)), px = x + Math.cos(a) * s * k * .8, py = y + Math.sin(a) * rr * 1.2;
      const cx = x + Math.cos(a - .2) * rr * 1.25, cy = y + Math.sin(a - .2) * rr * 1.45 - s * .2; i ? ctx.quadraticCurveTo(cx, cy, px, py) : ctx.moveTo(px, py); } ctx.quadraticCurveTo(x, y + s * k * .5, x - s * k * .8, y); }), col, { lw: k === 1 ? 6 : 0 });
  }
}

// ---------------------------------------------------------------- 角色（都画在以胸口为原点、头半径约 130 的坐标里）
// 大头小身：身体按 62% 高度画（以领口 y=-80 为基准），头保持原大 → 年画胖娃娃的比例
function squash(ctx) { ctx.save(); ctx.translate(0, -80); ctx.scale(1, .62); ctx.translate(0, 80); }
const CHAR = {};
CHAR.whitebeard = (ctx, t) => {   // 白胡子：白色新月胡子、黑头巾、披风、薙刀
  const q = Q(ctx), R = 135;
  squash(ctx);
  line(ctx, [[300, -520], [300, 700]], 18); line(ctx, [[300, -520], [300, 700]], 10, C.gold);   // 薙刀杆
  nh(ctx, q.path(() => { ctx.moveTo(300, -520); ctx.quadraticCurveTo(410, -640, 360, -820); ctx.quadraticCurveTo(320, -650, 280, -560); ctx.closePath(); }), C.white, { lw: 6 });
  nh(ctx, q.poly([[-340, -40], [340, -40], [420, 700], [-420, 700]]), C.white, { lw: 7, pat: () => { for (let k = 0; k < 5; k++) xiangyun(ctx, -260 + k * 130, 420 + (k % 2) * 120, 70, C.paper, C.cyan); } });   // 白披风
  robe(ctx, 0, -60, 520, 760, C.indigo, C.gold, () => { ctx.strokeStyle = C.cyan; ctx.lineWidth = 6; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(-150 + k * 60, 520, 40, Math.PI, 0); ctx.stroke(); } });
  ctx.restore();   // 身体画完，头按原大
  face(ctx, 0, -230, R, { skin: C.tan, eyes: 'fierce', mouth: false });
  nh(ctx, q.path(() => { ctx.ellipse(0, -330, R * 1.05, R * .55, 0, Math.PI, 0); ctx.closePath(); }), C.ink, { lw: 6 });   // 黑头巾
  line(ctx, [[R * .9, -340], [R * 1.5, -300 + Math.sin(t * 3) * 10], [R * 1.7, -250]], 22); line(ctx, [[R * .9, -340], [R * 1.4, -280 + Math.sin(t * 3 + 1) * 10]], 18);
  for (const sx of [-1, 1]) nh(ctx, q.path(() => { ctx.moveTo(sx * 18, -175); ctx.quadraticCurveTo(sx * 160, -170, sx * 230, -330); ctx.quadraticCurveTo(sx * 120, -215, sx * 18, -150); ctx.closePath(); }), C.white, { lw: 6 });   // 新月胡子
  for (const sx of [-1, 1]) nh(ctx, q.ell(sx * 300, 120, 70, 90), C.tan, { lw: 6 });   // 拳头
};
CHAR.ace = (ctx, t) => {   // 艾斯：橙色牛仔帽 + 两枚笑哭徽章、雀斑、红珠项链、火拳
  const q = Q(ctx), R = 130;
  squash(ctx);
  flames(ctx, 300, 40, 170, t, 3);
  nh(ctx, q.rr(-230, -80, 460, 420, 120), C.tan, { lw: 7 });                                                // 赤膊上身
  for (let k = 0; k < 13; k++) { const a = Math.PI * .15 + k / 12 * Math.PI * .7; nh(ctx, q.circ(Math.cos(a) * 170, -80 + Math.sin(a) * 110, 18), C.red, { lw: 3 }); }   // 红珠项链
  nh(ctx, q.poly([[-240, 300], [240, 300], [280, 700], [40, 700], [0, 520], [-40, 700], [-280, 700]]), C.ink, { lw: 6 });   // 黑短裤
  nh(ctx, q.rr(-250, 280, 500, 50, 10), C.orange, { lw: 5 });
  nh(ctx, q.ell(-300, 120, 70, 90), C.tan, { lw: 6 }); nh(ctx, q.ell(300, 60, 80, 95), C.tan, { lw: 6 });
  ctx.restore();   // 身体画完，头按原大
  face(ctx, 0, -240, R, { skin: C.skin });
  ctx.fillStyle = '#B0632F'; for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(sx * (R * .5 + k * 9), -240 + R * .18 + (k % 2) * 8, 4, 0, 7); ctx.fill(); }   // 雀斑
  nh(ctx, q.path(() => { ctx.moveTo(-R * 1.05, -260); for (let k = 0; k <= 8; k++) ctx.lineTo(-R * 1.05 + k * R * .26, -330 + (k % 2) * 50); ctx.closePath(); }), C.ink, { lw: 5 });   // 黑发
  nh(ctx, q.ell(0, -335, R * 1.6, R * .35), C.orange, { lw: 6 }); nh(ctx, q.path(() => { ctx.ellipse(0, -360, R * .85, R * .7, 0, Math.PI, 0); ctx.closePath(); }), C.orange, { lw: 6 });   // 牛仔帽
  nh(ctx, q.rr(-R * .85, -395, R * 1.7, 30, 4), C.red, { lw: 4 });
  for (const [sx, smile] of [[-.4, true], [.4, false]]) { nh(ctx, q.circ(sx * R, -380, 22), C.yellow, { lw: 3 }); line(ctx, smile ? [[sx * R - 10, -376], [sx * R, -368], [sx * R + 10, -376]] : [[sx * R - 10, -368], [sx * R, -376], [sx * R + 10, -368]], 3); }   // 笑脸 / 哭脸徽章
};
CHAR.shanks = (ctx, t) => {   // 香克斯：红发、左眼三道疤、黑披风、空荡荡的左袖、腰间佩刀、举着酒碗
  const q = Q(ctx), R = 128, sway = Math.sin(t * 1.4) * 10;
  squash(ctx);
  nh(ctx, q.path(() => { ctx.moveTo(-200, -90); ctx.quadraticCurveTo(-420, 300, -380 - sway, 720); ctx.lineTo(380 + sway, 720); ctx.quadraticCurveTo(420, 300, 200, -90); ctx.closePath(); }), C.ink, { lw: 7, pat: () => { ctx.strokeStyle = C.purple; ctx.lineWidth = 6; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(-300 + k * 120, 100); ctx.quadraticCurveTo(-280 + k * 120, 400, -320 + k * 120, 700); ctx.stroke(); } } });   // 黑披风
  robe(ctx, 0, -70, 400, 760, C.white, C.red, () => { ctx.strokeStyle = C.paper2; ctx.lineWidth = 5; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(-150, 40 + k * 80); ctx.lineTo(150, 60 + k * 80); ctx.stroke(); } });   // 白衬衫
  nh(ctx, q.path(() => { ctx.moveTo(-200, -40); ctx.quadraticCurveTo(-260, 120, -230 + sway * .5, 330); ctx.quadraticCurveTo(-200, 340, -180, 300); ctx.quadraticCurveTo(-200, 120, -160, -20); ctx.closePath(); }), C.white, { lw: 5 });   // 空荡荡的左袖（随风晃）
  ctx.save(); ctx.translate(150, 260); ctx.rotate(.4); nh(ctx, q.rr(-14, -40, 28, 420, 6), C.ink, { lw: 4 }); nh(ctx, q.rr(-40, -60, 80, 24, 6), C.gold, { lw: 4 }); ctx.restore();   // 佩刀
  nh(ctx, q.ell(280, 40, 62, 80), C.skin, { lw: 6 }); nh(ctx, q.path(() => { ctx.moveTo(220, -40); ctx.lineTo(360, -40); ctx.quadraticCurveTo(350, 30, 290, 34); ctx.quadraticCurveTo(230, 30, 220, -40); ctx.closePath(); }), C.red, { lw: 5, pat: () => { ctx.fillStyle = C.gold; ctx.fillRect(220, -32, 140, 10); } });   // 酒碗
  ctx.restore();   // 身体画完，头按原大
  face(ctx, 0, -240, R, { skin: C.skin });
  for (let k = 0; k < 3; k++) line(ctx, [[-R * .62 + k * 22, -320], [-R * .3 + k * 22, -170]], 5, '#A2402F');   // 左眼三道疤
  nh(ctx, q.path(() => { ctx.moveTo(-R * 1.15, -200); for (let k = 0; k <= 10; k++) { const a = Math.PI + k / 10 * Math.PI; ctx.lineTo(Math.cos(a) * R * (k % 2 ? 1.05 : 1.35), -260 + Math.sin(a) * R * (k % 2 ? 1 : 1.25)); } ctx.lineTo(R * 1.15, -200); ctx.quadraticCurveTo(R * .8, -330, 0, -340); ctx.quadraticCurveTo(-R * .8, -330, -R * 1.15, -200); ctx.closePath(); }), C.red, { lw: 6 });   // 红发
  line(ctx, [[-30, -150], [30, -150]], 4); line(ctx, [[-40, -140], [0, -128], [40, -140]], 4);   // 小胡子
};
CHAR.garp = (ctx, t) => {   // 卡普：白发白胡子、左眼旁的疤、海军大衣"正义"、爱之铁拳、甜甜圈
  const q = Q(ctx), R = 135, punch = Math.max(0, Math.sin(t * 2.4)) * 40;
  squash(ctx);
  nh(ctx, q.poly([[-330, -50], [330, -50], [430, 720], [-430, 720]]), C.white, { lw: 7, pat: () => { ctx.fillStyle = C.indigo; ctx.fillRect(-430, 660, 860, 60); } });   // 海军大衣
  robe(ctx, 0, -60, 440, 760, C.indigo, C.gold, () => { ctx.fillStyle = C.white; ctx.fillRect(-40, -60, 80, 300); });
  ctx.save(); ctx.translate(-260, 360); ctx.rotate(-.12); nh(ctx, q.rr(-70, -40, 140, 80, 10), C.white, { lw: 4 }); htext(ctx, '正义', 0, 2, 56, C.ink, FONT_BRUSH); ctx.restore();   // "正义"
  nh(ctx, q.circ(310 + punch, 40 - punch * .5, 95), C.tan, { lw: 7 }); for (let k = 0; k < 3; k++) line(ctx, [[260 + punch + k * 30, 0 - punch * .5], [270 + punch + k * 30, 60 - punch * .5]], 4);   // 爱之铁拳
  for (let k = 0; k < 3; k++) { const a = (t * 2 + k / 3) % 1; ctx.globalAlpha = 1 - a; line(ctx, [[430 + punch + a * 60, -60 + k * 50], [500 + punch + a * 60, -70 + k * 50]], 6); ctx.globalAlpha = 1; }   // 出拳速度线
  nh(ctx, q.circ(-300, 100, 72), C.orange, { lw: 6, pat: () => { ctx.fillStyle = C.peach; ctx.beginPath(); ctx.arc(-300, 100, 60, 0, 7); ctx.fill(); ctx.fillStyle = C.white; for (let k = 0; k < 8; k++) ctx.fillRect(-340 + (k % 4) * 22, 70 + Math.floor(k / 4) * 40, 10, 4); } }); nh(ctx, q.circ(-300, 100, 22), BG.garp, { lw: 4 });   // 甜甜圈
  ctx.restore();   // 身体画完，头按原大
  face(ctx, 0, -240, R, { skin: C.tan });
  line(ctx, [[-R * .7, -330], [-R * .25, -260]], 5, '#7A3A20'); line(ctx, [[-R * .65, -300], [-R * .45, -320]], 5, '#7A3A20');   // 疤
  nh(ctx, q.path(() => { ctx.moveTo(-R * .9, -170); ctx.quadraticCurveTo(-R * .9, -60, 0, -40); ctx.quadraticCurveTo(R * .9, -60, R * .9, -170); ctx.quadraticCurveTo(R * .5, -120, 0, -130); ctx.quadraticCurveTo(-R * .5, -120, -R * .9, -170); ctx.closePath(); }), C.white, { lw: 5 });   // 白胡子
  line(ctx, [[-30, -150], [30, -150]], 5);
  nh(ctx, q.path(() => { ctx.ellipse(0, -300, R * 1.02, R * .55, 0, Math.PI, 0); ctx.closePath(); }), C.white, { lw: 5 });   // 白发
  nh(ctx, q.path(() => { ctx.ellipse(0, -345, R * .95, R * .62, 0, Math.PI, 0); ctx.closePath(); }), C.white, { lw: 6 }); nh(ctx, q.ell(0, -345, R * 1.25, 26), C.indigo, { lw: 5 });   // 海军帽
  nh(ctx, q.path(() => { ctx.moveTo(-30, -400); ctx.lineTo(0, -440); ctx.lineTo(30, -400); ctx.lineTo(0, -370); ctx.closePath(); }), C.indigo, { lw: 4 });   // 帽徽
};
CHAR.law = (ctx, t) => {   // 罗：白底黑斑毛绒帽、黄黑连帽衫（胸前笑脸骷髅）、扛着长刀鬼哭、蓝色 ROOM
  const q = Q(ctx), R = 128;
  squash(ctx);
  const room = .85 + .15 * Math.sin(t * 2); ctx.fillStyle = 'rgba(63,167,214,.22)'; ctx.beginPath(); ctx.arc(0, 0, 520 * room, 0, 7); ctx.fill(); ctx.strokeStyle = C.cyan; ctx.lineWidth = 6; ctx.setLineDash([22, 14]); ctx.stroke(); ctx.setLineDash([]);
  ctx.save(); ctx.rotate(-.75); nh(ctx, q.rr(-20, -560, 40, 1000, 8), C.ink, { lw: 5 }); nh(ctx, q.rr(-34, -200, 68, 30, 6), C.gold, { lw: 4 }); for (let k = 0; k < 8; k++) line(ctx, [[-18, -540 + k * 40], [18, -520 + k * 40]], 4, C.red); ctx.restore();   // 长刀
  robe(ctx, 0, -60, 470, 760, C.yellow, C.ink, () => { ctx.fillStyle = C.ink; ctx.fillRect(-235, -60, 120, 760); ctx.fillRect(115, -60, 120, 760); });   // 黄黑卫衣
  nh(ctx, q.circ(0, 100, 75), C.yellow, { lw: 5 }); face(ctx, 0, 100, 48, { skin: C.yellow, eyes: 'closed' });   // 胸前的笑脸骷髅（简化）
  for (const sx of [-1, 1]) nh(ctx, q.ell(sx * 290, 140, 65, 85), C.skin, { lw: 6 });
  ctx.restore();   // 身体画完，头按原大
  face(ctx, 0, -240, R, { skin: C.skin, eyes: 'fierce', mouth: false });
  nh(ctx, q.poly([[-16, -150], [16, -150], [0, -110]]), C.ink, { lw: 0 }); line(ctx, [[-40, -175], [0, -168], [40, -175]], 4);   // 山羊胡
  for (const sx of [-1, 1]) nh(ctx, q.circ(sx * R * .98, -200, 12), C.gold, { lw: 3 });   // 耳环
  nh(ctx, q.path(() => { ctx.ellipse(0, -320, R * 1.15, R * .8, 0, Math.PI, 0); ctx.closePath(); }), C.white, { lw: 6, pat: () => { ctx.fillStyle = C.ink; const r = rng(7); for (let k = 0; k < 12; k++) { ctx.beginPath(); ctx.ellipse(-R + r() * R * 2, -400 + r() * 80, 14, 10, r(), 0, 7); ctx.fill(); } } });   // 毛绒斑点帽
  nh(ctx, q.rr(-R * 1.18, -330, R * 2.36, 36, 16), C.white, { lw: 5 });
  htext(ctx, 'ROOM', 0, -520, 70, C.cyan, '"KuaiLe"');
};
CHAR.hancock = (ctx, t) => {   // 汉库克：黑长直、仕女长裙、往后仰的"看不起"姿势、白蛇萨洛美、爱心
  const q = Q(ctx), R = 120, lean = -.12;
  squash(ctx);
  ctx.save(); ctx.rotate(lean);
  nh(ctx, q.path(() => { ctx.moveTo(-170, -330); ctx.quadraticCurveTo(-260, 200, -200, 640); ctx.lineTo(200, 640); ctx.quadraticCurveTo(260, 200, 170, -330); ctx.closePath(); }), C.ink, { lw: 6 });   // 黑长直
  nh(ctx, q.path(() => { ctx.moveTo(-150, -60); ctx.lineTo(150, -60); ctx.quadraticCurveTo(320, 400, 360, 720); ctx.lineTo(-360, 720); ctx.quadraticCurveTo(-320, 400, -150, -60); ctx.closePath(); }), C.red, { lw: 7, pat: () => { for (let k = 0; k < 7; k++) { const x = -260 + k * 90, y = 300 + (k % 2) * 160; ctx.fillStyle = C.peach; ctx.beginPath(); ctx.arc(x, y, 30, 0, 7); ctx.fill(); ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill(); } } });   // 牡丹纹长裙
  nh(ctx, q.rr(-170, 60, 340, 60, 10), C.gold, { lw: 5 });
  nh(ctx, q.poly([[-150, -60], [0, 60], [150, -60], [110, -90], [0, 10], [-110, -90]]), C.purple, { lw: 5 });
  ctx.restore();   // 身体画完，头按原大
  face(ctx, 0, -230, R, { eyes: 'closed' });
  line(ctx, [[-36, -168], [0, -160], [36, -168]], 5, C.red);
  nh(ctx, q.path(() => { ctx.ellipse(0, -300, R * 1.05, R * .7, 0, Math.PI, 0); ctx.closePath(); }), C.ink, { lw: 5 });   // 齐刘海
  for (const sx of [-1, 1]) nh(ctx, q.path(() => { ctx.moveTo(sx * 30, -390); ctx.lineTo(sx * 80, -450); ctx.lineTo(sx * 120, -380); ctx.closePath(); }), C.gold, { lw: 4 });   // 发饰
  ctx.restore();
  // 白蛇萨洛美（盘在脚边，戴骷髅耳环）
  nh(ctx, q.path(() => { ctx.moveTo(-380, 650); ctx.bezierCurveTo(-520, 450, -200, 420, -360, 250); ctx.bezierCurveTo(-420, 180, -340, 120, -300, 140); ctx.bezierCurveTo(-260, 180, -320, 240, -260, 320); ctx.bezierCurveTo(-140, 470, -380, 520, -300, 650); ctx.closePath(); }), C.white, { lw: 6, pat: () => { ctx.strokeStyle = C.cyan; ctx.lineWidth = 4; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.arc(-360, 260 + k * 50, 30, 0, Math.PI); ctx.stroke(); } } });
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(-310, 160, 7, 0, 7); ctx.fill(); nh(ctx, q.circ(-280, 190, 14), C.white, { lw: 3 });
  for (let k = 0; k < 4; k++) { const a = (t * .8 + k / 4) % 1, x = 230 + Math.sin(k * 2) * 60, y = -100 - a * 360; ctx.globalAlpha = 1 - a; heart(ctx, x, y, 30 + k * 6); ctx.globalAlpha = 1; }   // 爱心（甜甜果实）
};
function heart(ctx, x, y, s) { const q = Q(ctx); nh(ctx, q.path(() => { ctx.moveTo(x, y + s * .8); ctx.bezierCurveTo(x - s * 1.4, y - s * .2, x - s * .6, y - s * 1.1, x, y - s * .35); ctx.bezierCurveTo(x + s * .6, y - s * 1.1, x + s * 1.4, y - s * .2, x, y + s * .8); }), C.peach, { lw: 4 }); }
function ship(ctx, x, y, s, t) {   // 年画海船：骷髅旗（通用海贼旗，不是草帽团的）
  const q = Q(ctx), rock = Math.sin(t * 1.6) * .04; ctx.save(); ctx.translate(x, y); ctx.rotate(rock);
  nh(ctx, q.poly([[-s, 0], [s, 0], [s * .75, s * .35], [-s * .8, s * .35]]), C.red, { lw: 6, pat: () => { ctx.fillStyle = C.gold; ctx.fillRect(-s, s * .08, s * 2, s * .07); for (let k = -4; k <= 4; k++) coin(ctx, k * s * .2, s * .24, s * .05); } });
  line(ctx, [[0, 0], [0, -s * 1.2]], 10);
  nh(ctx, q.path(() => { ctx.moveTo(-s * .05, -s * 1.1); ctx.quadraticCurveTo(-s * .8, -s * .7, -s * .6, -s * .1); ctx.lineTo(-s * .05, -s * .1); ctx.closePath(); }), C.white, { lw: 5 });
  nh(ctx, q.path(() => { ctx.moveTo(s * .05, -s * 1.1); ctx.quadraticCurveTo(s * .9, -s * .7, s * .7, -s * .1); ctx.lineTo(s * .05, -s * .1); ctx.closePath(); }), C.yellow, { lw: 5 });
  nh(ctx, q.rr(s * .02, -s * 1.5, s * .5, s * .32, 4), C.ink, { lw: 4 }); nh(ctx, q.circ(s * .27, -s * 1.36, s * .09), C.white, { lw: 0 });   // 骷髅旗
  line(ctx, [[s * .14, -s * 1.24], [s * .4, -s * 1.44]], 4, C.white); line(ctx, [[s * .4, -s * 1.24], [s * .14, -s * 1.44]], 4, C.white);
  ctx.restore();
}

// ---------------------------------------------------------------- 文案（由独立评审三轮打磨后定稿，见 copy.md）
let COPY = {   // 第 2 轮评审后（平仄按普通话新韵）
  open:       { top: '海上年画', up: '四海风波藏故事', down: '一张红纸画英雄', seal: '英雄谱', name: '海上年画 · 英雄谱', en: 'Heroes of the Sea · New Year Prints' },
  whitebeard: { top: '老爹', up: '一拳震裂天和海', down: '满船尽是好儿郎', seal: '白胡子', name: '白胡子 · 爱德华·纽盖特', en: 'Whitebeard' },
  ace:        { top: '火拳', up: '以身挡拳护幼弟', down: '含笑临别谢深情', seal: '火拳', name: '火拳 · 波特卡斯·D·艾斯', en: 'Portgas D. Ace' },
  shanks:     { top: '红发', up: '一臂押注新时代', down: '草帽托付好少年', seal: '红发', name: '红发 · 香克斯', en: 'Shanks' },
  law:        { top: '外科', up: '一刀切开天下势', down: '半生不忘柯拉松', seal: '死亡外科', name: '死亡外科医生 · 特拉法尔加·罗', en: 'Trafalgar Law' },
  garp:       { top: '爷爷', up: '爱之铁拳打孙子', down: '海军英雄不升官', seal: '卡普', name: '海军中将 · 蒙奇·D·卡普', en: 'Monkey D. Garp' },
  hancock:    { top: '女帝', up: '千夫见我皆石化', down: '路飞令我尽倾心', seal: '女帝', name: '海贼女帝 · 波雅·汉库克', en: 'Boa Hancock' },
  end:        { top: '扬帆大吉', up: '各怀梦想乘风去', down: '同在大海等你来', seal: '大吉', name: '海上年画 · 完', en: 'Fair Winds' },
};
const BG = { whitebeard: C.yellow, ace: C.peach, shanks: C.grass, law: C.cyan, garp: C.yellow, hancock: C.peach, open: C.yellow, end: C.yellow };

// ---------------------------------------------------------------- 一张年画
function sheet(ctx, key, t) {
  const cp = COPY[key], q = Q(ctx);
  ctx.fillStyle = C.red; ctx.fillRect(0, 0, W, H); huiwen(ctx, 10, 10, W - 20, H - 20, C.gold, 36);   // 红色回纹外框
  ctx.fillStyle = C.paper; ctx.fillRect(56, 56, W - 112, H - 112); paperTex(ctx, 56, 56, W - 112, H - 112, 3);
  // 横批
  nh(ctx, q.rr(200, 76, 680, 150, 10), C.red, { lw: 6, pat: () => { ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.strokeRect(214, 90, 652, 122); } });
  htext(ctx, cp.top, 540, 152, cp.top.length > 3 ? 104 : 120, C.ink); ctx.globalCompositeOperation = 'source-over';
  // 对联：上联在右，下联在左
  for (const [x, s] of [[W - 130, cp.up], [130, cp.down]]) { nh(ctx, q.rr(x - 62, 250, 124, 1070, 10), C.red, { lw: 6, pat: () => { ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.strokeRect(x - 52, 260, 104, 1050); } }); vtext(ctx, s, x, 340, 104, C.ink, 1.38); }
  // 中间画心
  const cx = 540, cy = 860;
  ctx.save(); ctx.beginPath(); ctx.roundRect(206, 250, 668, 1180, 20); ctx.clip();
  ctx.fillStyle = BG[key]; ctx.fillRect(206, 250, 668, 1180);
  for (const [x, y, s] of [[300, 360, 70], [760, 330, 60], [800, 620, 50], [260, 700, 46]]) xiangyun(ctx, x + Math.sin(t * .8 + x) * 8, y, s);
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.arc(cx, cy - 120, 140 + k * 36, 0, 7); ctx.stroke(); }   // 背光圈
  haishui(ctx, 206, 874, 1240, 190, t, undefined, key === 'open');
  ctx.save(); ctx.translate(cx, cy + 10); ctx.scale(.86, .86);
  if (CHAR[key]) CHAR[key](ctx, t);
  else if (key === 'open') { ship(ctx, 0, 140, 300, t); for (let k = 0; k < 6; k++) coin(ctx, -330 + k * 132, -560, 34); }
  else if (key === 'end') {   // 六个团花圆框，每个里面是一位角色的半身像；下面是扬帆的海船
    const keys = ['whitebeard', 'ace', 'shanks', 'law', 'garp', 'hancock'], q2 = Q(ctx);
    keys.forEach((k, i) => { const col = i % 3, row = Math.floor(i / 3), mx = -250 + col * 250, my = -540 + row * 300;
      nh(ctx, q2.circ(mx, my, 125), C.gold, { lw: 6 }); nh(ctx, q2.circ(mx, my, 108), BG[k], { lw: 4 });
      ctx.save(); ctx.beginPath(); ctx.arc(mx, my, 104, 0, 7); ctx.clip(); ctx.translate(mx, my + 130); ctx.scale(.5, .5); CHAR[k](ctx, t); ctx.restore();
      ctx.strokeStyle = C.red; ctx.lineWidth = 5; for (let a = 0; a < 12; a++) { const ang = a * Math.PI / 6 + t * .2; ctx.beginPath(); ctx.arc(mx + Math.cos(ang) * 118, my + Math.sin(ang) * 118, 6, 0, 7); ctx.stroke(); } });
    ship(ctx, 0, 380, 260, t); }
  ctx.restore(); ctx.restore();
  ctx.lineWidth = 8; ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.roundRect(206, 250, 668, 1180, 20); ctx.stroke();
  // 底部：名牌 + 印章
  nh(ctx, q.rr(206, 1470, 668, 130, 14), C.white, { lw: 6, pat: () => { for (let k = 0; k < 9; k++) coin(ctx, 240 + k * 76, 1585, 10); } });
  htext(ctx, cp.name, 540, 1515, cp.name.length > 12 ? 44 : 52, C.ink, FONT_TXT); htext(ctx, cp.en, 540, 1562, 30, C.indigo, FONT_TXT);
  seal(ctx, cp.seal, 940, 1560, 120);
  for (const [x, y] of [[110, 1440], [970, 1440]]) xiangyun(ctx, x, y, 60, C.white, C.red);
  htext(ctx, '海上年画 · 英雄谱', 540, 1700, 40, C.red, FONT_BRUSH); htext(ctx, '同人二创 · 角色版权归原作者所有', 540, 1760, 26, '#8A6A3A', FONT_TXT);
  grain(ctx, 56, 56, W - 112, H - 112, 5);
}
const ORDER = ['open', 'whitebeard', 'ace', 'shanks', 'law', 'garp', 'hancock', 'end'];
function keyframe(k, ctx) { sheet(ctx, ORDER[k], 1.3); }
