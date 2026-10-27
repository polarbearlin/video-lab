// 《东三环 · 央视大楼》孟菲斯风格 · 竖屏 15 秒（1080×1920，30fps）
// frame(i)：输入帧号，输出一张图。所有东西按世界坐标 + 固定随机种子生成，同一帧号永远画出同一张图。
// 坐标：x 向东（右），y 向上，z 向北（前），单位米。镜头沿东三环中路往北开，央视大楼在右前方。
const W = 1080, H = 1920, FPS = 30, DUR = 15, N = FPS * DUR;
const VX = 56, VY = 70, VW = 968, VH = 1500;          // 画框里的画面
const C = { yellow: '#FFC93C', pink: '#FF8DB5', cobalt: '#2E5BE6', coral: '#FF5A5F', mint: '#A9E6C6', sky: '#8DD3F6', lilac: '#D3BEFF',
  ink: '#25214A', cream: '#FFF6E5', road: '#5B5488', walk: '#F3E6D2', white: '#FFFFFF' };
const PAL = [C.yellow, C.pink, C.cobalt, C.coral, C.mint, C.sky, C.lilac];
const T = { BUS: [6.6, 11.5], LEAF: [10.2, 13.9], BIRDS: [1.0, 7.5], UNDER: 6.1 };   // 事件时间（秒），音效也读这里

// ---------------------------------------------------------------- 工具
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (a, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, a));
const smooth = a => { a = clamp(a); return a * a * (3 - 2 * a); };
const lerp = (a, b, k) => a + (b - a) * k;
const v3 = (x, y, z) => ({ x, y, z });
const sub = (a, b) => v3(a.x - b.x, a.y - b.y, a.z - b.z), add = (a, b) => v3(a.x + b.x, a.y + b.y, a.z + b.z), mul = (a, k) => v3(a.x * k, a.y * k, a.z * k);
const cross = (a, b) => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x), dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];

// ---------------------------------------------------------------- 镜头（一镜到底：匀速往前 + 慢慢右转 + 抬头 + 推近）
let cam;
function camera(t) {
  const k = t / DUR;
  return { x: 5.5 + .3 * Math.sin(t * .7), y: 2.9, z: 9 * t, yaw: (2 + 15 * smooth(k * 1.1)) * Math.PI / 180,
           pitch: (-1.5 + 9 * smooth((k - .2) / .8)) * Math.PI / 180, f: 900 + 260 * smooth(k), cy: VY + VH * .6 };
}
function toCam(p) {
  const dx = p.x - cam.x, dy = p.y - cam.y, dz = p.z - cam.z, cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const x1 = dx * cy - dz * sy, z1 = dx * sy + dz * cy;
  return v3(x1, dy * cp - z1 * sp, dy * sp + z1 * cp);
}
const NEAR = .4;
function proj(c) { return [VX + VW / 2 + cam.f * c.x / c.z, cam.cy - cam.f * c.y / c.z]; }
function clipNear(pts) {   // 相机空间里按近平面裁剪多边形
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], ia = a.z >= NEAR, ib = b.z >= NEAR;
    if (ia) out.push(a);
    if (ia !== ib) { const k = (NEAR - a.z) / (b.z - a.z); out.push(v3(lerp(a.x, b.x, k), lerp(a.y, b.y, k), NEAR)); }
  }
  return out;
}
function clipPlane(pts, n, d, keepGreater) {   // 世界空间按平面 dot(p,n)=d 裁剪
  const out = [], s = p => (dot(p, n) - d) * (keepGreater ? 1 : -1);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], sa = s(a), sb = s(b);
    if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) { const k = sa / (sa - sb); out.push(add(a, mul(sub(b, a), k))); }
  }
  return out;
}
function poly2d(worldPts) { const c = clipNear(worldPts.map(toCam)); return c.length < 3 ? null : c.map(proj); }
function pathPts(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }
function lw(depth, k = .22) { return clamp(cam.f * k / Math.max(depth, 1), 1.2, 5); }

// ---------------------------------------------------------------- 云影：斜着的光带在世界里匀速扫过（楼面、路面都会被扫到）
const CLOUD_N = v3(.8, 0, .6);
function cloudBands(t) { const out = []; for (let k = -2; k < 8; k++) { const s0 = -260 + 140 * k + 7 * t; out.push([s0, s0 + 46]); } return out; }
function drawCloudShadow(ctx, worldPts, t) {
  for (const [a, b] of cloudBands(t)) {
    let p = clipPlane(worldPts, CLOUD_N, a, true); if (p.length < 3) continue; p = clipPlane(p, CLOUD_N, b, false); if (p.length < 3) continue;
    const q = poly2d(p); if (!q) continue; ctx.fillStyle = 'rgba(37,33,74,.18)'; pathPts(ctx, q); ctx.fill();
  }
}

// ---------------------------------------------------------------- 面上的小图案（圆点 / 条纹 / 折线 / 窗格），按面的 uv 生成，跟着透视走
function faceUV(P, idx) {
  const A = P[idx[0]], e1 = sub(P[idx[1]], A), e3 = sub(P[idx[idx.length - 1]], A);
  return Math.abs(e1.y) >= Math.abs(e3.y) ? { A, U: e3, V: e1 } : { A, U: e1, V: e3 };
}
function uvPt(F, u, v) { return add(F.A, add(mul(F.U, u), mul(F.V, v))); }
function drawPattern(ctx, F, pat, depth) {
  if (!pat) return;
  const Lu = Math.hypot(F.U.x, F.U.y, F.U.z), Lv = Math.hypot(F.V.x, F.V.y, F.V.z), px = cam.f / Math.max(depth, 1);
  ctx.strokeStyle = pat.col; ctx.fillStyle = pat.col;
  const P2 = (u, v) => { const c = toCam(uvPt(F, u, v)); return c.z > NEAR ? proj(c) : null; };
  if (pat.t === 'dots') {
    const s = pat.s || 3, nu = Math.min(60, Math.floor(Lu / s)), nv = Math.min(80, Math.floor(Lv / s)), r = Math.max(.8, px * s * .18);
    if (r < 1 && depth > 250) return;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const p = P2((i + .5 + (j % 2) * .5) / nu, (j + .5) / nv); if (p) { ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.fill(); } }
  } else if (pat.t === 'stripes' || pat.t === 'zig') {
    const s = pat.s || 4, nv = Math.min(70, Math.floor(Lv / s)); ctx.lineWidth = Math.max(1, px * s * .22);
    for (let j = 1; j < nv; j++) {
      ctx.beginPath(); const steps = pat.t === 'zig' ? Math.max(2, Math.floor(Lu / s)) * 2 : 1;
      for (let k = 0; k <= steps; k++) { const v = (j + (pat.t === 'zig' ? (k % 2 ? .35 : -.35) : 0)) / nv, p = P2(k / steps, v); if (p) k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
      ctx.stroke();
    }
  } else if (pat.t === 'grid') {
    const su = pat.su || 3.5, sv = pat.sv || 3.6, nu = Math.min(40, Math.floor(Lu / su)), nv = Math.min(70, Math.floor(Lv / sv));
    if (px * su < 2.2) return;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      if (pat.skip && ((i * 7 + j * 13) % pat.skip === 0)) continue;
      const u0 = (i + .22) / nu, u1 = (i + .78) / nu, w0 = (j + .25) / nv, w1 = (j + .75) / nv, q = [P2(u0, w0), P2(u1, w0), P2(u1, w1), P2(u0, w1)];
      if (q.every(Boolean)) { pathPts(ctx, q); ctx.fill(); }
    }
  } else if (pat.t === 'diag') {   // 央视大楼外立面那种不规则的斜交网格
    const n = pat.n || 10; ctx.lineWidth = Math.max(1, px * 1.1);
    for (let k = -n; k <= n * 2; k++) for (const sgn of [1, -1]) {
      ctx.beginPath(); let started = false;
      for (let s = 0; s <= 12; s++) { const v = s / 12, u = (k + sgn * v * n * (1 + .25 * Math.sin(k))) / n; if (u < 0 || u > 1) { started = false; continue; } const p = P2(u, v); if (!p) continue; started ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); started = true; }
      ctx.stroke();
    }
  }
}

// ---------------------------------------------------------------- 实体：8 个角点 + 面（盒子、倾斜塔楼都用它）
const FACES = { front: [0, 3, 2, 1], back: [4, 5, 6, 7], left: [0, 4, 7, 3], right: [1, 2, 6, 5], top: [3, 7, 6, 2] };
function boxPts(x0, y0, z0, x1, y1, z1) { return [v3(x0, y0, z0), v3(x1, y0, z0), v3(x1, y1, z0), v3(x0, y1, z0), v3(x0, y0, z1), v3(x1, y0, z1), v3(x1, y1, z1), v3(x0, y1, z1)]; }
function solid(P, cols, pats = {}, opt = {}) { return { kind: 'solid', P, cols, pats, opt, c: P.reduce((a, p) => add(a, mul(p, 1 / P.length)), v3(0, 0, 0)) }; }
function drawSolid(ctx, o, t) {
  const faces = [];
  for (const [name, idx] of Object.entries(FACES)) {
    if (!o.cols[name]) continue;
    const P = o.P, n = cross(sub(P[idx[1]], P[idx[0]]), sub(P[idx[2]], P[idx[0]])), ctr = idx.reduce((a, i) => add(a, mul(P[i], .25)), v3(0, 0, 0));
    if (dot(n, sub(cam, ctr)) <= 0) continue;
    const d = Math.hypot(ctr.x - cam.x, ctr.y - cam.y, ctr.z - cam.z); faces.push({ name, idx, ctr, d });
  }
  faces.sort((a, b) => b.d - a.d);
  for (const fc of faces) {
    const wp = fc.idx.map(i => o.P[i]), q = poly2d(wp); if (!q) continue;
    ctx.save(); pathPts(ctx, q); ctx.fillStyle = o.cols[fc.name]; ctx.fill(); ctx.clip();
    drawPattern(ctx, faceUV(o.P, fc.idx), o.pats[fc.name], fc.d);
    if (!o.opt.noCloud) drawCloudShadow(ctx, wp, t);
    ctx.restore();
    pathPts(ctx, q); ctx.strokeStyle = C.ink; ctx.lineWidth = lw(fc.d, o.opt.lw || .22); ctx.lineJoin = 'round'; ctx.stroke();
  }
}
const SUN = v3(.55, 0, .75);   // 午后太阳在西南，影子往东北倒：每米高度影子的水平偏移
function drawGroundShadow(ctx, o) {
  if (o.opt.noShadow) return;
  const P = o.P, base = [P[0], P[1], P[5], P[4]], top = [P[3], P[2], P[6], P[7]].map(p => v3(p.x + SUN.x * p.y, .02, p.z + SUN.z * p.y));
  const pts = [...base.map(p => v3(p.x, .02, p.z)), ...top], hull = convexHullXZ(pts), q = poly2d(hull); if (!q) return;
  ctx.fillStyle = 'rgba(37,33,74,.26)'; pathPts(ctx, q); ctx.fill();
}
function convexHullXZ(pts) {
  const p = pts.slice().sort((a, b) => a.x - b.x || a.z - b.z), cr = (o, a, b) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x), lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

// ---------------------------------------------------------------- 世界（只建一次）
const WORLD = (() => {
  const r = rng(20261027), objs = [], sprites = [];
  const scheme = () => { const a = pick(r, PAL), b = pick(r, PAL.filter(c => c !== a)), c = pick(r, PAL.filter(x => x !== a && x !== b)); return { front: a, left: b, right: b, back: a, top: c }; };
  const patFor = (front) => { const kinds = ['grid', 'grid', 'dots', 'stripes', 'zig']; const t = pick(r, kinds); return { t, col: front === C.cobalt ? C.sky : C.ink, s: 2.5 + r() * 2, skip: 5 + Math.floor(r() * 4) }; };
  // CBD 楼群：左边一排、右边近处一排（挡住央视，直到公交车开过才露出来）、远处一排
  const row = (side, z0, z1, hMin, hMax, xNear) => {
    let z = z0;
    while (z < z1) {
      const w = 16 + r() * 22, d = 18 + r() * 26, h = hMin + r() * (hMax - hMin), x0 = side > 0 ? xNear + r() * 6 : -xNear - r() * 6 - d;
      const s = scheme(), pf = patFor(s.front), ps = { ...patFor(s.left), t: pick(r, ['stripes', 'grid', 'dots']) };
      objs.push(solid(boxPts(x0, 0, z, x0 + d, h, z + w), s, { front: pf, back: pf, left: ps, right: ps }));
      if (r() < .45) { const h2 = 6 + r() * 10, inset = 3; objs.push(solid(boxPts(x0 + inset, h, z + inset, x0 + d - inset, h + h2, z + w - inset), { front: s.top, back: s.top, left: s.front, right: s.front, top: pick(r, PAL) }, { left: { t: 'stripes', col: C.ink, s: 2 }, right: { t: 'stripes', col: C.ink, s: 2 } })); }
      z += w + 8 + r() * 12;
    }
  };
  row(-1, -30, 700, 30, 150, 27); row(-1, 60, 700, 80, 220, 75);
  row(1, -30, 118, 55, 105, 27);
  row(1, 560, 760, 60, 160, 40);
  // 远处天际线（很远、很淡的一排方块）
  for (let i = 0; i < 26; i++) { const x = -400 + i * 34 + r() * 10, h = 40 + r() * 140, z = 900 + r() * 80; objs.push(solid(boxPts(x, 0, z, x + 24 + r() * 14, h, z + 20), { front: C.lilac, left: C.lilac, right: C.lilac, top: C.lilac }, {}, { noShadow: true, noCloud: true, lw: .5 })); }
  // ---- 央视总部大楼：底部 L 形裙楼 + 两座倾斜塔楼 + 顶部 L 形悬挑（真实结构的简化）
  const X0 = 56, Z0 = 352, ROT = (typeof CCTV_ROT !== 'undefined' ? CCTV_ROT : 66) * Math.PI / 180, CX = X0 + 60, CZ = Z0 + 55;
  const R_ = p => { const dx = p.x - CX, dz = p.z - CZ; return v3(CX + dx * Math.cos(ROT) - dz * Math.sin(ROT), p.y, CZ + dx * Math.sin(ROT) + dz * Math.cos(ROT)); };
  const L = (x, z) => [X0 + x, Z0 + z];
  const cc = { front: C.cobalt, back: C.cobalt, left: C.lilac, right: C.lilac, top: C.sky }, cc2 = { front: C.lilac, back: C.lilac, left: C.cobalt, right: C.cobalt, top: C.sky };
  const dg = { t: 'diag', col: C.sky, n: 7 }, dg2 = { t: 'diag', col: C.ink, n: 7 };
  const cctv = [];
  const bx = (x0, y0, z0, x1, y1, z1, c) => cctv.push(solid(boxPts(...L(x0, z0).flatMap((v, i) => i ? [y0, v] : [v]), ...L(x1, z1).flatMap((v, i) => i ? [y1, v] : [v])).map(R_), c, { front: dg, back: dg, left: dg2, right: dg2 }));
  bx(0, 0, 0, 120, 52, 40, cc); bx(80, 0, 40, 120, 52, 110, cc2);                         // 裙楼 L
  const tower = (bx0, bz0, dx, dz, c) => {                                                 // 倾斜塔楼：底面 40×40，顶面平移 (dx,dz)
    const b = [L(bx0, bz0), L(bx0 + 40, bz0), L(bx0 + 40, bz0 + 40), L(bx0, bz0 + 40)], y0 = 52, y1 = 182;
    const P = [v3(b[0][0], y0, b[0][1]), v3(b[1][0], y0, b[1][1]), v3(b[1][0] + dx, y1, b[1][1] + dz), v3(b[0][0] + dx, y1, b[0][1] + dz),
               v3(b[3][0], y0, b[3][1]), v3(b[2][0], y0, b[2][1]), v3(b[2][0] + dx, y1, b[2][1] + dz), v3(b[3][0] + dx, y1, b[3][1] + dz)].map(R_);
    cctv.push(solid(P, c, { front: dg, back: dg, left: dg2, right: dg2 }));
  };
  tower(0, 0, 14, 16, cc); tower(80, 70, -14, -16, cc2);
  bx(14, 182, 16, 54, 234, 94, cc); bx(54, 182, 54, 106, 234, 94, cc2);                     // 顶部 L 形悬挑（西北角悬空）
  objs.push(...cctv);
  // ---- 立交桥（镜头从下面穿过）+ 桥上横穿的小车
  const BZ = 52;
  objs.push(solid(boxPts(-70, 6.2, BZ, 70, 7.8, BZ + 13), { front: C.yellow, back: C.yellow, top: C.mint, left: C.coral, right: C.coral }, { front: { t: 'zig', col: C.ink, s: 1.6 } }, { lw: .3 }));
  objs.push(solid(boxPts(-70, 7.8, BZ, 70, 8.9, BZ + .6), { front: C.pink, top: C.pink, left: C.pink, right: C.pink }, { front: { t: 'dots', col: C.ink, s: 1 } }, { noShadow: true }));
  for (const x of [-15.5, 0, 15.5]) objs.push(solid(boxPts(x - .9, 0, BZ + 4.6, x + .9, 6.2, BZ + 8.4), { front: C.pink, back: C.pink, left: C.lilac, right: C.lilac }, { front: { t: 'stripes', col: C.ink, s: .9 } }));
  // ---- 公交站（右边人行道）+ 等车的人；路口斑马线 + 等红灯的人
  const SZ = 88;
  objs.push(solid(boxPts(15.6, 2.6, SZ, 18.6, 2.9, SZ + 7), { front: C.coral, back: C.coral, left: C.coral, right: C.coral, top: C.yellow }, {}, { lw: .3 }));
  for (const z of [SZ + .3, SZ + 6.4]) objs.push(solid(boxPts(18.1, 0, z, 18.4, 2.6, z + .3), { front: C.ink, left: C.ink, right: C.ink }, {}, { noShadow: true }));
  objs.push(solid(boxPts(18.3, .6, SZ + 1.5, 18.45, 2.3, SZ + 5.5), { left: C.sky, front: C.sky, right: C.sky }, { left: { t: 'dots', col: C.white, s: .5 } }, { noShadow: true }));
  const pr = rng(7);
  for (let k = 0; k < 4; k++) sprites.push({ kind: 'person', x: 16.4 + pr() * 1.4, z: SZ + 1 + k * 1.5, col: pick(pr, [C.coral, C.cobalt, C.yellow, C.pink, C.mint]), ph: pr() * 6, h: 1.6 + pr() * .2 });
  const XZ = 150;
  for (let k = 0; k < 5; k++) sprites.push({ kind: 'person', x: 15.4 + pr() * 2.2, z: XZ - 2 - pr() * 2, col: pick(pr, [C.coral, C.cobalt, C.yellow, C.pink, C.lilac]), ph: pr() * 6, h: 1.55 + pr() * .25 });
  for (let k = 0; k < 4; k++) sprites.push({ kind: 'person', x: -15.4 - pr() * 2.2, z: XZ - 2 - pr() * 2, col: pick(pr, [C.coral, C.cobalt, C.yellow, C.mint]), ph: pr() * 6, h: 1.55 + pr() * .25 });
  sprites.push({ kind: 'light', x: 15.2, z: XZ - 4 }, { kind: 'light', x: -15.2, z: XZ - 4 });
  // ---- 行道树（初秋：大多还绿，夹着几棵变黄、变红的）
  for (let z = -10; z < 700; z += 11) for (const x of [15.2, -15.2]) {
    if (Math.abs(z - SZ - 3) < 6 && x > 0) continue;
    sprites.push({ kind: 'tree', x: x + (r() - .5) * .6, z: z + r() * 3, col: r() < .62 ? C.mint : pick(r, [C.yellow, C.yellow, C.coral, C.pink]), shape: pick(r, ['round', 'round', 'cone', 'blob']), s: .9 + r() * .35, ph: r() * 6 });
  }
  // ---- 车流：同向（往北）和对向（往南）
  const cars = [];
  for (let k = 0; k < 22; k++) cars.push({ lane: pick(r, [2, 12.5, 2, 9]), z0: -30 + k * 22 + r() * 10, v: 6.5 + r() * 4, col: pick(r, PAL), len: 4.4, h: 1.5 });
  for (let k = 0; k < 18; k++) cars.push({ lane: pick(r, [-2.5, -6, -9.5, -13]), z0: 40 + k * 46 + r() * 20, v: -13 - r() * 4, col: pick(r, PAL), len: 4.4, h: 1.5 });
  for (let k = 0; k < 6; k++) cars.push({ bridge: true, x0: -80 + k * 30, v: k % 2 ? 9 : -9, col: pick(r, PAL), len: 4.2, h: 1.4 });
  const birds = []; for (let k = 0; k < 6; k++) birds.push({ dx: [0, -1, 1, -2, 2, -3][k] * 2.2, dy: Math.abs([0, -1, 1, -2, 2, -3][k]) * 1.3, ph: k * .7 });
  return { objs, sprites, cars, birds, SZ, XZ, BZ };
})();

function carSolids(car, t) {
  let x, z, len = car.len;
  if (car.bridge) { x = ((car.x0 + car.v * t + 80) % 160 + 160) % 160 - 80; z = WORLD.BZ + (car.v > 0 ? 4 : 9); }
  else { x = car.lane; z = car.z0 + car.v * t; }
  const y0 = car.bridge ? 7.8 : 0, dirZ = !car.bridge, hw = .95;
  const body = dirZ ? boxPts(x - hw, y0 + .25, z - len / 2, x + hw, y0 + car.h * .62, z + len / 2) : boxPts(x - len / 2, y0 + .25, z - hw, x + len / 2, y0 + car.h * .62, z + hw);
  const cab = dirZ ? boxPts(x - hw * .85, y0 + car.h * .62, z - len * .22, x + hw * .85, y0 + car.h, z + len * .22) : boxPts(x - len * .22, y0 + car.h * .62, z - hw * .85, x + len * .22, y0 + car.h, z + hw * .85);
  const cols = { front: car.col, back: car.col, left: car.col, right: car.col, top: car.col };
  const win = { front: C.sky, back: C.sky, left: C.sky, right: C.sky, top: car.col };
  return [solid(body, cols, {}, { lw: .14, noCloud: true }), solid(cab, win, { left: { t: 'stripes', col: C.white, s: .5 }, right: { t: 'stripes', col: C.white, s: .5 } }, { lw: .14, noCloud: true, noShadow: true })];
}
function busState(t) {   // 明黄色公交车：从镜头右后方追上来，开过去以后正好露出后面完整的央视大楼
  const [a, b] = T.BUS; if (t < a - .5 || t > b + 3) return null;
  return { x: 9.2, z: cam.z - 22 + 13.5 * (t - a) + 1.2 * (t - a) * (t - a), len: 12, h: 3.2 };
}
function busSolids(bs) {
  const { x, z, len, h } = bs, hw = 1.3, P = boxPts(x - hw, .35, z - len / 2, x + hw, h, z + len / 2);
  const out = [solid(P, { front: C.yellow, back: C.yellow, left: C.yellow, right: C.yellow, top: C.yellow },
    { left: { t: 'grid', col: C.sky, su: 1.6, sv: 1.1 }, right: { t: 'grid', col: C.sky, su: 1.6, sv: 1.1 }, back: { t: 'stripes', col: C.coral, s: .7 } }, { lw: .16, noCloud: true })];
  out.push(solid(boxPts(x - hw, .35, z - len / 2, x + hw, .9, z + len / 2), { left: C.coral, right: C.coral, back: C.coral, front: C.coral }, {}, { lw: .14, noShadow: true, noCloud: true }));
  return out;
}

// ---------------------------------------------------------------- 小精灵：树、人、红绿灯（面朝镜头的平面图形，带硬投影）
function spriteDepth(s) { return toCam(v3(s.x, 0, s.z)).z; }
function drawSprite(ctx, s, t) {
  const base = toCam(v3(s.x, 0, s.z)); if (base.z < 1.2) return;
  const [bx, by] = proj(base), k = cam.f / base.z, L = clamp(k * .09, 1.2, 5), sh = clamp(k * .18, 2, 12);
  const shape = (draw) => { ctx.save(); ctx.translate(sh, sh); ctx.fillStyle = C.ink; draw(true); ctx.restore(); draw(false); };
  if (s.kind === 'tree') {
    const sway = Math.sin(t * 1.6 + s.ph) * .06, th = 3.2 * s.s * k, cr = 2.1 * s.s * k, tx = bx + sway * th;
    shape(sd => { ctx.lineWidth = L; ctx.strokeStyle = C.ink; ctx.fillStyle = sd ? C.ink : '#B9774A';
      ctx.fillRect(bx - .18 * k, by - th, .36 * k, th); if (!sd) ctx.strokeRect(bx - .18 * k, by - th, .36 * k, th);
      ctx.fillStyle = sd ? C.ink : s.col; ctx.beginPath();
      if (s.shape === 'cone') { ctx.moveTo(tx, by - th - cr * 2.2); ctx.lineTo(tx + cr, by - th + cr * .3); ctx.lineTo(tx - cr, by - th + cr * .3); ctx.closePath(); }
      else if (s.shape === 'blob') { ctx.ellipse(tx, by - th - cr * .5, cr * .8, cr * 1.25, 0, 0, 7); }
      else ctx.arc(tx, by - th - cr * .4, cr, 0, 7);
      ctx.fill(); if (!sd) { ctx.stroke(); ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(37,33,74,.25)'; for (let i = -3; i <= 3; i++) for (let j = -4; j <= 2; j++) { ctx.beginPath(); ctx.arc(tx + i * cr * .45 + (j % 2) * cr * .22, by - th + j * cr * .45, Math.max(.8, cr * .06), 0, 7); ctx.fill(); } ctx.restore(); }
    });
  } else if (s.kind === 'person') {
    const bob = Math.abs(Math.sin(t * 2.2 + s.ph)) * .04 * k, hh = s.h * k;
    shape(sd => { ctx.lineWidth = L; ctx.strokeStyle = C.ink; ctx.fillStyle = sd ? C.ink : s.col;
      ctx.beginPath(); ctx.roundRect(bx - .24 * k, by - hh * .78 - bob, .48 * k, hh * .62, .2 * k); ctx.fill(); if (!sd) ctx.stroke();
      ctx.fillStyle = sd ? C.ink : C.ink; ctx.fillRect(bx - .16 * k, by - hh * .2, .12 * k, hh * .2); ctx.fillRect(bx + .04 * k, by - hh * .2, .12 * k, hh * .2);
      ctx.fillStyle = sd ? C.ink : '#FFD9B8'; ctx.beginPath(); ctx.arc(bx, by - hh * .9 - bob, .16 * k, 0, 7); ctx.fill(); if (!sd) ctx.stroke();
    });
  } else if (s.kind === 'light') {
    const ph = 4.2 * k; shape(sd => { ctx.fillStyle = C.ink; ctx.fillRect(bx - .08 * k, by - ph, .16 * k, ph);
      ctx.fillStyle = sd ? C.ink : C.ink; ctx.beginPath(); ctx.roundRect(bx - .3 * k, by - ph - 1.2 * k, .6 * k, 1.3 * k, .15 * k); ctx.fill();
      if (!sd) { ctx.fillStyle = C.coral; ctx.beginPath(); ctx.arc(bx, by - ph - .85 * k, .17 * k, 0, 7); ctx.fill(); ctx.fillStyle = '#4b4570'; ctx.beginPath(); ctx.arc(bx, by - ph - .35 * k, .17 * k, 0, 7); ctx.fill(); } });
  }
}

// ---------------------------------------------------------------- 天空：平涂天蓝 + 条纹太阳 + 带描边的云 + 一队飞过的鸟
function azimuthX(az, el) { const d = v3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)); const c = toCam(add(cam, mul(d, 1000))); return c.z > 1 ? proj(c) : null; }
function drawSky(ctx, t) {
  ctx.fillStyle = C.sky; ctx.fillRect(VX, VY, VW, VH);
  // 太阳（西南方，偏左上）
  const sp = azimuthX(-.45, .55); if (sp) { const R = 92; ctx.save(); ctx.translate(sp[0] + 10, sp[1] + 10); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill(); ctx.restore();
    ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(sp[0], sp[1], R, 0, 7); ctx.fill(); ctx.save(); ctx.clip(); ctx.strokeStyle = C.coral; ctx.lineWidth = 7; for (let i = -6; i < 6; i++) { ctx.beginPath(); ctx.moveTo(sp[0] - R, sp[1] + i * 22); ctx.lineTo(sp[0] + R, sp[1] + i * 22 - 30); ctx.stroke(); } ctx.restore();
    ctx.lineWidth = 4; ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.arc(sp[0], sp[1], R, 0, 7); ctx.stroke(); }
  // 云（很远，跟着方位角走，自己也慢慢飘）
  const cr = rng(99);
  for (let i = 0; i < 7; i++) {
    const az = -.9 + i * .33 + cr() * .1 + t * .006, el = .2 + cr() * .38, p = azimuthX(az, el); if (!p) continue; const s = 70 + cr() * 60;
    const blob = () => { ctx.beginPath(); ctx.roundRect(p[0] - s * 1.3, p[1] - s * .2, s * 2.6, s * .55, s * .27); ctx.arc(p[0] - s * .45, p[1] - s * .15, s * .42, Math.PI, 0); ctx.arc(p[0] + s * .35, p[1] - s * .2, s * .55, Math.PI, 0); ctx.closePath(); };
    ctx.save(); ctx.translate(9, 9); ctx.fillStyle = C.ink; blob(); ctx.fill(); ctx.restore(); ctx.fillStyle = C.white; blob(); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = C.ink; ctx.stroke();
    ctx.save(); blob(); ctx.clip(); ctx.strokeStyle = C.lilac; ctx.lineWidth = 3; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(p[0] - s, p[1] + s * .1 + k * 9); ctx.lineTo(p[0] + s * .8, p[1] + s * .1 + k * 9); ctx.stroke(); } ctx.restore();
  }
  // 鸟群：从右往左飞过
  const [a, b] = T.BIRDS;
  if (t > a && t < b) {
    const k = (t - a) / (b - a), p = azimuthX(.75 - 1.3 * k, .42 + .06 * Math.sin(k * 3)); if (p) for (const bd of WORLD.birds) {
      const x = p[0] + bd.dx * 14, y = p[1] + bd.dy * 14, fl = Math.sin(t * 14 + bd.ph) * 9; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 16, y - fl); ctx.quadraticCurveTo(x - 7, y - 6, x, y); ctx.quadraticCurveTo(x + 7, y - 6, x + 16, y - fl); ctx.stroke();
    }
  }
}

// ---------------------------------------------------------------- 地面：草地 / 人行道 / 路面 / 车道线 / 斑马线
function groundQuad(ctx, x0, x1, z0, z1, col, t, pat) {
  const wp = [v3(x0, 0, z0), v3(x1, 0, z0), v3(x1, 0, z1), v3(x0, 0, z1)], q = poly2d(wp); if (!q) return;
  ctx.save(); pathPts(ctx, q); ctx.fillStyle = col; ctx.fill(); ctx.clip();
  if (pat) drawPattern(ctx, { A: wp[0], U: sub(wp[1], wp[0]), V: sub(wp[3], wp[0]) }, pat, Math.max(8, (z0 + z1) / 2 - cam.z));
  drawCloudShadow(ctx, wp, t); ctx.restore();
}
function drawGround(ctx, t) {
  const z0 = cam.z - 6, z1 = cam.z + 1200;
  groundQuad(ctx, -600, 600, z0, z1, C.mint, t, null);
  groundQuad(ctx, 14, 60, z0, z1, C.walk, t, null); groundQuad(ctx, -60, -14, z0, z1, C.walk, t, null);
  groundQuad(ctx, 70, 230, 300, 520, C.pink, t, { t: 'stripes', col: C.white, s: 6 });   // 央视大楼前的广场
  groundQuad(ctx, -14, 14, z0, z1, C.road, t, null);
  groundQuad(ctx, -.35, .35, z0, z1, C.yellow, t, null);
  groundQuad(ctx, 13.4, 14, z0, z1, C.white, t, null); groundQuad(ctx, -14, -13.4, z0, z1, C.white, t, null);
  for (const x of [3.6, 7.2, 10.8, -3.6, -7.2, -10.8]) for (let z = Math.floor(cam.z / 12) * 12 - 12; z < cam.z + 260; z += 12) groundQuad(ctx, x - .14, x + .14, z, z + 5, C.white, t, null);
  for (let x = -13; x < 13; x += 1.6) groundQuad(ctx, x, x + .8, WORLD.XZ, WORLD.XZ + 5, C.white, t, null);   // 斑马线
}

// ---------------------------------------------------------------- 落叶：被公交车带起来，跟着镜头飘一会儿，再落到路边
function drawLeaf(ctx, t) {
  const [a, b] = T.LEAF; let p;
  const road = v3(9.6, .05, 9 * a + 24), curb = v3(13.6, .05, 9 * b + 6);                      // 路面上的起点、路边的落点（世界坐标，不动）
  const follow = tt => v3(cam.x + .9 + .5 * Math.sin(tt * 2.1), cam.y - .35 + .25 * Math.sin(tt * 3.3), cam.z + 3.4 + .4 * Math.sin(tt * 1.3));   // 贴着镜头飘
  if (t < a) p = road;
  else if (t < a + 1.0) { const k = smooth((t - a) / 1.0), f = follow(t); p = add(mul(road, 1 - k), mul(f, k)); p.y += Math.sin(Math.PI * k) * .8; }
  else if (t < b - 1.3) p = follow(t);
  else if (t < b) { const k = smooth((t - (b - 1.3)) / 1.3), f = follow(t); p = add(mul(f, 1 - k), mul(curb, k)); p.y += Math.sin(Math.PI * k) * .4; }
  else p = curb;
  const c = toCam(p); if (c.z < .6) return; const [x, y] = proj(c), k = cam.f / c.z, s = clamp(.6 * k, 5, 110), ang = t * 4.3 + Math.sin(t * 2.3);
  const leaf = () => { ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * .7, s, 0); ctx.quadraticCurveTo(0, s * .7, -s, 0); ctx.closePath(); };
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(1, .55 + .45 * Math.abs(Math.sin(t * 6)));
  ctx.save(); ctx.translate(s * .12, s * .12); ctx.fillStyle = C.ink; leaf(); ctx.fill(); ctx.restore();
  ctx.fillStyle = C.yellow; leaf(); ctx.fill(); ctx.lineWidth = clamp(s * .1, 1.5, 4); ctx.strokeStyle = C.ink; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s * .8, 0); ctx.lineTo(s * .8, 0); ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- 画框 + 底部三行字
function drawFrameBg(ctx) {
  ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
  const r = rng(3); ctx.fillStyle = 'rgba(37,33,74,.08)'; for (let i = 0; i < 420; i++) { ctx.beginPath(); ctx.arc(r() * W, r() * H, 3, 0, 7); ctx.fill(); }
  ctx.fillStyle = C.ink; ctx.fillRect(VX + 14, VY + 14, VW, VH);
  // 画框四角的孟菲斯小装饰
  ctx.lineWidth = 5; ctx.strokeStyle = C.ink;
  ctx.fillStyle = C.coral; ctx.beginPath(); ctx.moveTo(18, 1690); ctx.lineTo(70, 1690); ctx.lineTo(44, 1645); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(1040, 1690, 22, 0, 7); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = C.cobalt; ctx.lineWidth = 6; ctx.beginPath(); for (let i = 0; i <= 6; i++) ctx.lineTo(880 + i * 22, 1872 + (i % 2 ? -12 : 12)); ctx.stroke();
  ctx.strokeStyle = C.pink; ctx.beginPath(); for (let i = 0; i <= 6; i++) ctx.lineTo(70 + i * 22, 1872 + (i % 2 ? -12 : 12)); ctx.stroke();
}
function drawCaption(ctx, t) {
  const lat = 39.90951 + cam.z / 111000, lon = 116.46108;
  const lines = [['东三环 · 央视总部大楼　CCTV Headquarters, East 3rd Ring', '800 34px', C.ink],
                 ['初秋 · 车流穿过 CBD 的晴朗午后　Early Autumn · A Sunny Afternoon in the CBD', '500 24px', '#5B5488'],
                 [`${lat.toFixed(5)}°N　${lon.toFixed(5)}°E`, '600 26px', C.cobalt]];
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach(([s, f, col], i) => { ctx.font = `${f} "NotoSC", sans-serif`; ctx.fillStyle = col; ctx.fillText(s, W / 2, 1650 + i * 58); });
}

// ---------------------------------------------------------------- 一帧
function frame(i, ctx) {
  const t = i / FPS; cam = camera(t);
  drawFrameBg(ctx);
  ctx.save(); ctx.beginPath(); ctx.rect(VX, VY, VW, VH); ctx.clip();
  drawSky(ctx, t); drawGround(ctx, t);
  // 所有物体：楼、立交桥、央视、车、公交、公交站 + 树和人，按离镜头远近从远到近画
  const items = [];
  for (const o of WORLD.objs) items.push(o);
  for (const car of WORLD.cars) items.push(...carSolids(car, t));
  const bs = busState(t); if (bs) items.push(...busSolids(bs));
  const vis = items.filter(o => { const c = toCam(o.c); return c.z > -60 && c.z < 1400; });
  for (const o of vis) drawGroundShadow(ctx, o);
  const draw = vis.map(o => ({ o, d: Math.hypot(o.c.x - cam.x, o.c.z - cam.z) }));
  for (const s of WORLD.sprites) { const d = spriteDepth(s); if (d > 1.2 && d < 400) draw.push({ s, d: Math.hypot(s.x - cam.x, s.z - cam.z) }); }
  draw.sort((a, b) => b.d - a.d);
  for (const it of draw) it.o ? drawSolid(ctx, it.o, t) : drawSprite(ctx, it.s, t);
  drawLeaf(ctx, t);
  ctx.restore();
  ctx.lineWidth = 8; ctx.strokeStyle = C.ink; ctx.strokeRect(VX, VY, VW, VH);
  drawCaption(ctx, t);
}
if (typeof module !== 'undefined') module.exports = { frame, N, FPS, T };
