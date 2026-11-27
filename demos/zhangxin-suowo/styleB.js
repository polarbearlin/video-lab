// 风格 B ·「纸境」纸雕光影
// 规则：所有东西都是一层层剪出来的纸（边缘轻微抖动），每层有真实的投影，越近投影越深越大；
// 夜靛底色 + 背后一盏暖金色的光（太阳 / 背光）；字都印在米白纸条上；珊瑚红只出现在「大凶」那张签上；
// 标题用思源宋体粗体，字幕用思源黑体；镜头只做缓慢的视差（近层移动比远层多）。
const B = (() => {
  const C = { night: '#111C33', navy: '#1B2A49', deep: '#24395F', mid: '#3D5A80', far: '#5E7AA3', haze: '#8FA6C4',
    cream: '#F3EBDD', cream2: '#E6DAC4', gold: '#F2B950', gold2: '#E39B2D', coral: '#E0644F', ink: '#1B2A49' };
  const F = { serif: '"NotoSerif"', sans: '"NotoSans"' };
  let GRAIN = null;
  function init() {
    GRAIN = noiseCanvas(W, H, 21, (g, r, w, h) => {
      for (let k = 0; k < 26000; k++) { const v = r(); g.fillStyle = v < .5 ? `rgba(0,0,0,${.05 + r() * .05})` : `rgba(255,248,230,${.04 + r() * .05})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
      g.lineWidth = 1; for (let k = 0; k < 700; k++) { g.strokeStyle = `rgba(255,248,230,${.03 + r() * .04})`; const x = r() * w, y = r() * h, a = r() * 6.28, l = 10 + r() * 40; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    });
  }
  // 一层纸：投影 + 纸面 + 上沿受光
  function layer(ctx, path, col, depth = 1, o = {}) {
    ctx.save();
    ctx.shadowColor = `rgba(4,8,20,${.35 + depth * .08})`; ctx.shadowBlur = 10 + depth * 9; ctx.shadowOffsetY = 4 + depth * 4; ctx.shadowOffsetX = o.sx ?? depth * 1.5;
    ctx.fillStyle = col; ctx.fill(path); ctx.restore();
    ctx.save(); ctx.clip(path); ctx.translate(0, 2.5); ctx.strokeStyle = o.rim || 'rgba(255,226,170,.28)'; ctx.lineWidth = 3; ctx.stroke(path); ctx.restore();
  }
  function wobbly(pts, seed, amp = 2) {   // 剪刀剪出来的边：沿边加一点抖动
    const r = rng(seed), p = new Path2D();
    pts.forEach(([x, y], i) => { const jx = (r() - .5) * amp, jy = (r() - .5) * amp; i ? p.lineTo(x + jx, y + jy) : p.moveTo(x + jx, y + jy); });
    p.closePath(); return p;
  }
  function ridge(seed, base, amp, freq, shift = 0) {
    const r = rng(seed), ph = [r() * 6, r() * 6, r() * 6], pts = [[-20, H + 20]];
    for (let x = -20; x <= W + 20; x += 14) { const u = (x + shift) / W * freq; pts.push([x, base - amp * (.6 * Math.sin(u * 2 + ph[0]) + .3 * Math.sin(u * 4.7 + ph[1]) + .12 * Math.sin(u * 11 + ph[2]))]); }
    pts.push([W + 20, H + 20]); return wobbly(pts, seed + 5, 3);
  }
  function rect(x, y, w, h, seed, amp = 1.6) { return wobbly([[x, y], [x + w * .5, y], [x + w, y], [x + w, y + h], [x + w * .5, y + h], [x, y + h]], seed, amp); }
  function sky(ctx, gx, gy, gr = 700, warm = 1) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, C.night); g.addColorStop(1, C.deep); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const r = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr); r.addColorStop(0, `rgba(242,185,80,${.55 * warm})`); r.addColorStop(.35, `rgba(227,155,45,${.22 * warm})`); r.addColorStop(1, 'rgba(227,155,45,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  }
  function sun(ctx, x, y, R) {
    const g = ctx.createRadialGradient(x - R * .2, y - R * .2, R * .1, x, y, R); g.addColorStop(0, '#FFD98A'); g.addColorStop(1, C.gold);
    const p = new Path2D(); const r = rng(R | 0); for (let k = 0; k <= 72; k++) { const a = k / 72 * Math.PI * 2, rr = R + (r() - .5) * 2.5; k ? p.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : p.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } p.closePath();
    layer(ctx, p, g, 1.5, { rim: 'rgba(255,255,255,.35)' });
  }
  // 纸条（字印在上面）
  function tag(ctx, s, cx, cy, o = {}) {
    const px = o.px || 46, fam = o.fam || F.sans, wt = o.weight || 600, padX = o.padX ?? px * .9, padY = o.padY ?? px * .45;
    ctx.save(); ctx.font = fontStr(px, fam, wt); ctx.letterSpacing = (o.ls || 0) + 'px'; const tw = ctx.measureText(s).width; ctx.restore();
    const w = tw + padX * 2, h = px + padY * 2;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(o.rot || 0);
    if (o.string) { ctx.strokeStyle = 'rgba(243,235,221,.55)'; ctx.lineWidth = 2; for (const sx of [-w * .3, w * .3]) { ctx.beginPath(); ctx.moveTo(sx, -h / 2); ctx.lineTo(sx * 1.1, -h / 2 - o.string); ctx.stroke(); } }
    layer(ctx, rect(-w / 2, -h / 2, w, h, s.length * 13 + px, 2.2), o.bg || C.cream, o.depth ?? 2, { rim: 'rgba(255,255,255,.5)' });
    text(ctx, s, 0, px * .04, { px, fam, weight: wt, color: o.color || C.ink, layer: o.layer || 'hero', ls: o.ls });
    ctx.restore(); return { w, h };
  }
  function badge(ctx) {
    tag(ctx, BADGE, 150, 82, { px: 30, fam: F.serif, weight: 800, padX: 22, padY: 14, depth: 1.5, layer: 'badge', ls: 4 });
    text(ctx, TITLE, 268, 82, { px: 26, fam: F.sans, weight: 400, color: 'rgba(243,235,221,.82)', align: 'left', layer: 'badge' });
  }
  function subtitle(ctx, t) {
    const s = subAt(t); if (!s) return;
    const px = fitPx(ctx, s.text, 48, 1500, F.sans, 600, 2);
    ctx.save(); ctx.globalAlpha = s.k; tag(ctx, s.text, W / 2, 985 + (1 - s.k) * 10, { px, fam: F.sans, weight: 600, layer: 'sub', depth: 2.5, padX: 44, padY: 20, ls: 2 }); ctx.restore();
  }
  function hexStrips(ctx, lines, x, y, w, h, gap, seed, col = C.gold) {
    lines.forEach((v, i) => {
      const yy = y - i * gap, r = rng(seed + i);
      ctx.save(); ctx.translate(x + w / 2, yy + h / 2); ctx.rotate((r() - .5) * .04); ctx.translate(-w / 2, -h / 2);
      if (v) layer(ctx, rect(0, 0, w, h, seed + i * 7), col, 2.2, { rim: 'rgba(255,255,255,.45)' });
      else { const g = w * .14, hw = (w - g) / 2; layer(ctx, rect(0, 0, hw, h, seed + i * 7), col, 2.2, { rim: 'rgba(255,255,255,.45)' }); layer(ctx, rect(hw + g, 0, hw, h, seed + i * 7 + 3), col, 2.2, { rim: 'rgba(255,255,255,.45)' }); }
      ctx.restore();
    });
  }

  function open(ctx, t) {
    const sc = SCENES[0], p = (t - sc.t0) / (sc.t1 - sc.t0);
    sky(ctx, 1380, 360, 760);
    sun(ctx, 1380 - p * 20, 360, 150);
    const L = [[C.haze, 560, 110, 2.2, 1], [C.far, 640, 120, 3.0, 2], [C.mid, 730, 110, 3.6, 3], [C.deep, 820, 90, 4.4, 4]];
    L.forEach(([col, base, amp, fq, d], i) => layer(ctx, ridge(100 + i * 17, base, amp, fq, p * 30 * d), col, d * .8));
    // 石头和插在里面的剑
    const rx = 1000, ry = 820;
    const rock = wobbly([[rx - 230, ry + 120], [rx - 190, ry - 10], [rx - 90, ry - 60], [rx + 40, ry - 70], [rx + 170, ry - 20], [rx + 240, ry + 120]], 300, 4);
    ctx.save(); ctx.translate(0, 0);
    const k = easeOut((t - .2) / 1.5), lift = 70 * k;
    const top = ry - 300 - lift;   // 护手的位置：剑身朝下插在石头里，剑柄朝上
    const sw = new Path2D(); sw.moveTo(rx - 15, top); sw.lineTo(rx + 15, top); sw.lineTo(rx + 15, ry); sw.lineTo(rx - 15, ry); sw.closePath();
    layer(ctx, sw, '#D9DEE6', 2.5, { rim: 'rgba(255,255,255,.7)' });
    ctx.save(); ctx.strokeStyle = 'rgba(27,42,73,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rx, top + 10); ctx.lineTo(rx, ry); ctx.stroke(); ctx.restore();
    layer(ctx, rect(rx - 75, top - 22, 150, 24, 311), C.gold, 3);
    layer(ctx, rect(rx - 13, top - 140, 26, 120, 312), C.gold2, 3);
    const pm = new Path2D(); pm.arc(rx, top - 150, 20, 0, 7); layer(ctx, pm, C.gold, 3);
    layer(ctx, rock, C.navy, 4);
    ctx.restore();
    layer(ctx, ridge(170, 960, 50, 5.2, p * 160), C.night, 5);
    // 挂着的标题签
    const a = easeOut((t - .05) / .5);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(0, lerp(-60, 0, a));
    tag(ctx, '胜券在握', 470, 300, { px: 120, fam: F.serif, weight: 900, rot: -.03, depth: 3, ls: 10, padX: 60, padY: 36 });
    ctx.restore();
    const b = easeOut((t - .7) / .5);
    ctx.save(); ctx.globalAlpha = b; tag(ctx, '才肯拔剑？', 520, 470, { px: 52, fam: F.serif, weight: 700, rot: .04, string: 40, depth: 2, bg: C.gold, ls: 6 }); ctx.restore();
  }
  function guaScene(ctx, t) {
    const sc = SCENES[1], p = (t - sc.t0) / (sc.t1 - sc.t0);
    sky(ctx, 620, 520, 780, .9);
    // 背后一圈圈纸环，像隧道
    [[560, C.deep], [470, C.mid], [380, C.far], [290, '#7E97BA']].forEach(([R, col], i) => {
      const p2 = new Path2D(); const r = rng(40 + i); for (let k = 0; k <= 90; k++) { const a = k / 90 * Math.PI * 2, rr = R + (r() - .5) * 4; k ? p2.lineTo(620 + Math.cos(a) * rr, 540 + Math.sin(a) * rr) : p2.moveTo(620 + Math.cos(a) * rr, 540 + Math.sin(a) * rr); } p2.closePath();
      layer(ctx, p2, col, 1 + i * .6);
    });
    // 剪纸手掌：掌纹剪穿，露出后面的暗色
    ctx.save(); ctx.translate(620, 545 - p * 10); ctx.rotate(-.06);
    const hp = handPath(530);
    layer(ctx, hp, C.cream, 4, { rim: 'rgba(0,0,0,0)' });
    ctx.save(); ctx.clip(hp);
    const g = ctx.createRadialGradient(-80, -160, 40, 0, 0, 520); g.addColorStop(0, 'rgba(255,230,180,.35)'); g.addColorStop(1, 'rgba(120,90,50,.18)'); ctx.fillStyle = g; ctx.fillRect(-400, -500, 800, 900);
    ctx.lineCap = 'round';
    palmLines(530).forEach(l => { ctx.strokeStyle = C.navy; ctx.lineWidth = 13; ctx.stroke(l); ctx.save(); ctx.translate(0, -3); ctx.strokeStyle = 'rgba(4,8,20,.55)'; ctx.lineWidth = 6; ctx.stroke(l); ctx.restore(); });
    ctx.restore(); ctx.restore();
    // 否卦：金色纸条
    const x = 1110, y0 = 760, w = 380, h = 46, gap = 86;
    GUA.pi.forEach((v, i) => { const k = easeOut((t - (15.84 + i * .14)) / .35); if (k <= 0) return; ctx.save(); ctx.globalAlpha = k; ctx.translate(0, (1 - k) * 30); hexStrips(ctx, [v], x, y0 - i * gap, w, h, 0, 500 + i * 3); ctx.restore(); });
    const a = easeOut((t - 15.9) / .4);
    ctx.save(); ctx.globalAlpha = a; tag(ctx, '否 · 天地不交', x + w / 2, 200, { px: 40, fam: F.serif, weight: 700, depth: 2, ls: 4 }); ctx.restore();
    // 珊瑚红的签：大凶
    const k = easeOut((t - 17.1) / .25);
    if (k > 0) { ctx.save(); ctx.globalAlpha = clamp(k * 1.5); ctx.translate(1700, lerp(250, 470, k)); ctx.rotate(lerp(.25, .06, k));
      ctx.strokeStyle = 'rgba(243,235,221,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -160); ctx.lineTo(0, -400); ctx.stroke();
      layer(ctx, rect(-70, -170, 140, 340, 777, 2.5), C.coral, 3.5, { rim: 'rgba(255,255,255,.45)' });
      ctx.beginPath(); ctx.arc(0, -140, 9, 0, 7); ctx.fillStyle = C.navy; ctx.fill();
      vtext(ctx, '大凶', 0, -45, { px: 96, fam: F.serif, weight: 900, color: C.cream, layer: 'hero', gap: 1.08 });
      ctx.restore(); }
  }
  function end(ctx, t) {
    const sc = SCENES[2], p = (t - sc.t0) / (sc.t1 - sc.t0);
    sky(ctx, 960, 640, 900, 1.15);
    // 放射状纸条光芒
    const r = rng(9);
    for (let k = 0; k < 18; k++) {
      const a0 = Math.PI + k / 18 * Math.PI, a1 = a0 + Math.PI / 18 * .55, R = 1200;
      const p2 = new Path2D(); p2.moveTo(960, 640); p2.lineTo(960 + Math.cos(a0) * R, 640 + Math.sin(a0) * R); p2.lineTo(960 + Math.cos(a1) * R, 640 + Math.sin(a1) * R); p2.closePath();
      ctx.save(); ctx.globalAlpha = .14 + r() * .06; ctx.fillStyle = C.gold; ctx.fill(p2); ctx.restore();
    }
    sun(ctx, 960, 650, 250);
    // 两边的山夹出一道山谷
    const valley = (side, base, amp, col, d, seed) => {
      const pts = [[side < 0 ? -20 : W + 20, H + 20]]; const r = rng(seed);
      for (let k = 0; k <= 30; k++) { const u = k / 30, x = side < 0 ? lerp(-20, 960 - 120 + d * 40, u) : lerp(W + 20, 960 + 120 - d * 40, u); pts.push([x, base - amp * (1 - u) * (.8 + .2 * Math.sin(u * 9 + seed)) + u * 220 + (r() - .5) * 6]); }
      pts.push([960, H + 20]); layer(ctx, wobbly(pts, seed, 3), col, d);
    };
    [[C.far, 560, 260, 1], [C.mid, 640, 260, 2], [C.deep, 720, 240, 3], [C.night, 800, 220, 4]].forEach(([col, base, amp, d], i) => { valley(-1, base, amp, col, d, 60 + i); valley(1, base, amp, col, d, 80 + i); });
    // 小路通向太阳
    const rc = u => [960 + 150 * Math.sin(u * Math.PI * 1.2) * (1 - u), H + 10 - (H + 10 - 752) * u], rw = u => 320 * Math.pow(1 - u, 1.7) + 3;
    const Lp = [], Rp = []; for (let k = 0; k <= 40; k++) { const u = k / 40, [cx, cy] = rc(u); Lp.push([cx - rw(u), cy]); Rp.unshift([cx + rw(u), cy]); }
    layer(ctx, wobbly([...Lp, ...Rp], 404, 2), C.cream2, 3);
    // 小人
    const wk = Math.sin(t * 9) * .5;
    const [mx, my] = rc(.5); ctx.save(); ctx.translate(mx, my); ctx.scale(.9, .9);
    const man = new Path2D(); man.arc(0, -78, 13, 0, 7); man.roundRect(-11, -62, 22, 48, 8);
    const leg = (a) => { const l = new Path2D(); l.roundRect(-5, 0, 10, 40, 5); man.addPath(l, new DOMMatrix().translate(0, -18).rotate(a * 25)); };
    leg(wk); leg(-wk); layer(ctx, man, C.night, 2.5, { rim: 'rgba(242,185,80,.8)' });
    ctx.restore();
    // 乾卦 + 引文（左上），是前面「天行健」段落留下来的
    hexStrips(ctx, GUA.qian, 140, 560, 180, 22, 44, 900);
    tag(ctx, '乾', 230, 290, { px: 34, fam: F.serif, weight: 800, depth: 1.5, padX: 18, padY: 10, layer: 'deco' });
    vtext(ctx, '天行健', 1790, 190, { px: 46, fam: F.serif, weight: 800, color: C.cream, layer: 'deco' });
    vtext(ctx, '君子以自强不息', 1720, 190, { px: 32, fam: F.serif, weight: 500, color: 'rgba(243,235,221,.75)', layer: 'deco', gap: 1.12 });
    const a = easeOut((t - 36.04) / .35);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(0, lerp(30, 0, a));
    text(ctx, '向前', 960, 270, { px: 210, fam: F.serif, weight: 900, color: C.cream, layer: 'hero', ls: 40, shadow: 'rgba(4,8,20,.55)', shadowBlur: 24, shadowY: 10 });
    ctx.restore();
  }

  function render(ctx, t) {
    if (!GRAIN) init();
    const id = sceneAt(t).id;
    if (id === 'open') open(ctx, t); else if (id === 'gua') guaScene(ctx, t); else end(ctx, t);
    ctx.save(); ctx.globalAlpha = 1; ctx.drawImage(GRAIN, 0, 0); ctx.restore();
    badge(ctx); subtitle(ctx, t);
  }
  return { render, fonts: [['900 100px "NotoSerif"'], ['600 50px "NotoSans"']], extra: '胜券在握才肯拔剑？否天地不交大凶乾向前' };
})();
