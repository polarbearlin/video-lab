// 风格 A ·「墨卦」水墨卦象
// 规则：宣纸底 + 远中近三层墨山 + 雾带；卦爻用干笔飞白的横笔写出；朱砂只用在印章和太阳上（一帧最多两处）；
// 大字用马善政楷书，字幕用霞鹜文楷，竖排引文用思源宋体；镜头只做极慢的推近和雾的横移。
const A = (() => {
  const C = { paper: '#EEE5D0', paper2: '#E4D8BE', ink: '#1A1714', ink2: '#4A453E', ink3: '#8B847A', cinnabar: '#B4302A', mist: 'rgba(238,229,208,' };
  const F = { brush: '"MaShan", "WenKai"', kai: '"WenKai"', serif: '"NotoSerif"' };
  let PAPER = null;
  function init() {
    PAPER = noiseCanvas(W, H, 7, (g, r, w, h) => {
      const gr = g.createRadialGradient(w * .5, h * .45, 100, w * .5, h * .5, w * .75);
      gr.addColorStop(0, C.paper); gr.addColorStop(1, C.paper2); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 9000; k++) { g.fillStyle = r() < .55 ? 'rgba(120,95,60,.05)' : 'rgba(255,255,255,.22)'; g.fillRect(r() * w, r() * h, 1 + r() * 2.5, 1 + r() * 1.5); }
      g.lineWidth = 1; for (let k = 0; k < 420; k++) { g.strokeStyle = `rgba(120,95,60,${.03 + r() * .05})`; const x = r() * w, y = r() * h, a = r() * 6.28, l = 20 + r() * 70; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + .6) * l * .5, y + Math.sin(a + .6) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    });
  }

  // 干笔：沿折线排 n 根笔毛，越往后越容易断（飞白）
  function brush(ctx, pts, w, col, seed, o = {}) {
    const r = rng(seed), dry = o.dry ?? .35, n = o.hairs || 18;
    const S = []; for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], d = Math.hypot(x1 - x0, y1 - y0), m = Math.max(1, Math.ceil(d / 3)); for (let j = 0; j < m; j++) S.push([lerp(x0, x1, j / m), lerp(y0, y1, j / m)]); }
    S.push(pts[pts.length - 1]);
    const N = S.length, prog = o.prog ?? 1, end = Math.max(2, Math.floor(N * prog));
    const wid = i => { const u = i / (N - 1); return w * (o.taper === false ? 1 : Math.min(1, u / .06 + .35) * (u > .82 ? lerp(1, .3, (u - .82) / .18) : 1)) * (1 + .08 * Math.sin(u * 17 + seed)); };
    const nrm = i => { const a = S[Math.max(0, i - 1)], b = S[Math.min(N - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
    const e1 = rng(seed + 1), jt = Array.from({ length: 64 }, () => e1() - .5);
    const edge = (i, side) => 1 + .07 * jt[(i * 7 + (side > 0 ? 0 : 31)) % 64] + .05 * Math.sin(i * .21 + side * seed);
    ctx.save(); ctx.lineCap = 'round';
    ctx.globalAlpha = o.alpha ?? 1; ctx.beginPath();
    for (let i = 0; i < end; i++) { const [nx, ny] = nrm(i), hw = wid(i) * .5 * edge(i, 1); ctx.lineTo(S[i][0] + nx * hw, S[i][1] + ny * hw); }
    for (let i = end - 1; i >= 0; i--) { const [nx, ny] = nrm(i), hw = wid(i) * .5 * edge(i, -1); ctx.lineTo(S[i][0] - nx * hw, S[i][1] - ny * hw); }
    ctx.fillStyle = col; ctx.fill();
    // 飞白：在笔画里面留出纸色的细缝，越靠笔尾越多，越靠两边越多
    ctx.strokeStyle = o.paper || C.paper;
    for (let h = 0; h < n; h++) {
      const off = (r() - .5) * 1.7, th = dry * (.6 + r() * .7), ph = r() * 100, fq = .04 + r() * .08;
      ctx.globalAlpha = (o.alpha ?? 1) * (.55 + r() * .45); ctx.lineWidth = Math.max(1, w * (.02 + r() * .035));
      let down = false;
      for (let i = 0; i < end; i++) {
        const u = i / N, on = Math.sin(i * fq + ph) * .5 + .5 < th * (u * 1.4 + .1) * (Math.abs(off) * 1.3 + .25);
        const [nx, ny] = nrm(i), hw = wid(i) * .5 * off;
        if (!on) { if (down) ctx.stroke(); down = false; continue; }
        if (!down) { ctx.beginPath(); ctx.moveTo(S[i][0] + nx * hw, S[i][1] + ny * hw); down = true; } else ctx.lineTo(S[i][0] + nx * hw, S[i][1] + ny * hw);
      }
      if (down) ctx.stroke();
    }
    ctx.restore();
  }
  function yao(ctx, x, y, w, yang, seed, o = {}) {
    const th = o.th || 46;
    if (yang) brush(ctx, [[x, y + 2], [x + w * .5, y - 3], [x + w, y + 1]], th, C.ink, seed, { dry: .45, ...o });
    else { const g = w * .14; brush(ctx, [[x, y + 1], [x + w * .5 - g / 2, y - 2]], th, C.ink, seed, { dry: .45, ...o }); brush(ctx, [[x + w * .5 + g / 2, y + 2], [x + w, y - 1]], th, C.ink, seed + 9, { dry: .45, ...o }); }
  }
  function gua(ctx, lines, x, y, w, gap, seed, o = {}) { lines.forEach((v, i) => yao(ctx, x, y - i * gap, w, v, seed + i * 31, o)); }

  function mountains(ctx, t, base, layers) {
    layers.forEach(([amp, yOff, col, seed, freq], li) => {
      const r = rng(seed), ph = [r() * 6, r() * 6, r() * 6], drift = t * (4 + li * 3);
      ctx.save(); ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) {
        const u = (x + drift) / W * freq;
        const y = base + yOff - amp * (.55 * Math.sin(u * 2.1 + ph[0]) + .3 * Math.sin(u * 5.3 + ph[1]) + .15 * Math.sin(u * 13.7 + ph[2]) + Math.pow(Math.max(0, Math.sin(u * 1.3 + ph[0])), 3) * .9);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H); ctx.closePath();
      const gr = ctx.createLinearGradient(0, base + yOff - amp * 1.6, 0, base + yOff + 160);
      gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(238,229,208,0)');
      ctx.fillStyle = gr; ctx.fill(); ctx.restore();
    });
  }
  function mist(ctx, y, h, t, a = .85) { const gr = ctx.createLinearGradient(0, y - h, 0, y + h); gr.addColorStop(0, C.mist + '0)'); gr.addColorStop(.5, C.mist + a + ')'); gr.addColorStop(1, C.mist + '0)'); ctx.fillStyle = gr; ctx.fillRect(0, y - h, W, h * 2); }
  function seal(ctx, s, x, y, size, rot = -.05, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const r = rng(s.length * 97 + size);
    ctx.fillStyle = C.cinnabar; ctx.globalAlpha = .92; ctx.beginPath(); ctx.roundRect(-size / 2, -size / 2, size, size, size * .06); ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = C.paper; ctx.lineWidth = size * .035; ctx.strokeRect(-size / 2 + size * .07, -size / 2 + size * .07, size * .86, size * .86);
    const ch = [...s], n = ch.length, cols = n > 2 ? 2 : 1, rows = Math.ceil(n / cols), cs = size * .78 / Math.max(rows, cols);
    ch.forEach((c, i) => { const col = cols - 1 - Math.floor(i / rows), row = i % rows; text(ctx, c, (col - (cols - 1) / 2) * cs, (row - (rows - 1) / 2) * cs + cs * .04, { px: cs * .92, fam: F.brush, color: C.paper, layer: o.layer || 'seal' }); });
    ctx.globalCompositeOperation = 'destination-out'; for (let k = 0; k < size * 1.2; k++) { ctx.globalAlpha = .5 + r() * .5; ctx.fillRect((r() - .5) * size, (r() - .5) * size, 1 + r() * 3, 1 + r() * 3); }
    ctx.restore();
  }
  function badge(ctx) {
    seal(ctx, BADGE, 92, 92, 92, -.03, { layer: 'badge' });
    text(ctx, TITLE, 160, 92, { px: 30, fam: F.kai, color: C.ink2, align: 'left', layer: 'badge' });
  }
  function subtitle(ctx, t) {
    const s = subAt(t); if (!s) return;
    const px = fitPx(ctx, s.text, 54, 1500, F.kai), y = 978;
    ctx.save(); ctx.globalAlpha = s.k;
    const gr = ctx.createLinearGradient(0, y - 70, 0, y + 70); gr.addColorStop(0, C.mist + '0)'); gr.addColorStop(.5, C.mist + '.92)'); gr.addColorStop(1, C.mist + '0)');
    ctx.fillStyle = gr; ctx.fillRect(0, y - 70, W, 140);
    text(ctx, s.text, W / 2, y, { px, fam: F.kai, color: C.ink, layer: 'sub', ls: 2 });
    ctx.restore();
  }

  // ---- 场景
  function open(ctx, t) {
    const sc = SCENES[0], p = (t - sc.t0) / (sc.t1 - sc.t0);
    ctx.save(); const z = 1 + p * .04; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    mountains(ctx, t, 760, [[150, -60, 'rgba(139,132,122,.45)', 11, 2.2], [120, 40, 'rgba(74,69,62,.65)', 23, 3.1], [90, 160, 'rgba(26,23,20,.92)', 37, 4.3]]);
    mist(ctx, 760, 70, t, .7);
    // 一柄剑：剑鞘是一道浓墨，剑身是出鞘的细锋，出鞘长度随这句话推进
    const k = easeOut((t - 0.15) / 1.6);
    const ang = -.30, cx = 820, cy = 660;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
    brush(ctx, [[-430, 0], [-150, -2], [20, 0]], 38, C.ink, 101, { dry: .2 });
    brush(ctx, [[30, -26], [36, 26]], 18, C.ink, 103, { dry: .1, taper: false });
    const L = 40 + 380 * k;
    ctx.fillStyle = C.ink2; ctx.beginPath(); ctx.moveTo(40, -9); ctx.lineTo(40 + L - 46, -7); ctx.lineTo(40 + L, 0); ctx.lineTo(40 + L - 46, 7); ctx.lineTo(40, 9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(238,229,208,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(48, 0); ctx.lineTo(40 + L - 40, 0); ctx.stroke();
    ctx.restore();
    ctx.restore();
    // 大字：胜券在握（右上竖排两列），小字：才肯拔剑
    const a = smooth((t - 0.05) / .6);
    ctx.save(); ctx.globalAlpha = a;
    vtext(ctx, '胜券', 1640, 250, { px: 150, fam: F.brush, color: C.ink, layer: 'hero', gap: 1.05 });
    vtext(ctx, '在握', 1470, 330, { px: 150, fam: F.brush, color: C.ink, layer: 'hero', gap: 1.05 });
    ctx.restore();
    const b = smooth((t - .7) / .5);
    ctx.save(); ctx.globalAlpha = b; vtext(ctx, '才肯拔剑', 1330, 420, { px: 46, fam: F.serif, color: C.ink2, layer: 'hero', gap: 1.25, weight: 600 }); ctx.restore();
    seal(ctx, '投机', 1720, 640, 112, .04);
  }
  function guaScene(ctx, t) {
    const sc = SCENES[1], p = (t - sc.t0) / (sc.t1 - sc.t0);
    mountains(ctx, t, 880, [[110, -20, 'rgba(139,132,122,.35)', 51, 2.6], [80, 90, 'rgba(74,69,62,.5)', 53, 3.6]]);
    // 淡墨手掌（掌纹）在卦后面
    ctx.save(); ctx.translate(450, 540); ctx.rotate(-.08);
    const hp = handPath(520);
    ctx.strokeStyle = 'rgba(74,69,62,.38)'; ctx.lineWidth = 10; ctx.stroke(hp);
    ctx.fillStyle = C.paper; ctx.fill(hp);
    ctx.fillStyle = 'rgba(74,69,62,.12)'; ctx.fill(hp);
    ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(26,23,20,.45)'; ctx.lineWidth = 9; palmLines(520).forEach(l => ctx.stroke(l));
    ctx.restore();
    mist(ctx, 880, 90, t, .95);
    // 否卦：坤下乾上，逐爻写出
    const x = 820, y0 = 720, w = 400, gap = 92;
    GUA.pi.forEach((v, i) => { const k = clamp((t - (15.84 + i * .14)) / .3); if (k > 0) yao(ctx, x, y0 - i * gap, w, v, 300 + i * 31, { prog: easeOut(k) }); });
    text(ctx, '否', x + w / 2, 160, { px: 64, fam: F.serif, color: C.ink2, layer: 'hero', weight: 700, alpha: smooth((t - 15.9) / .4) });
    vtext(ctx, '天地不交', 700, 280, { px: 40, fam: F.serif, color: C.ink3, layer: 'hero', weight: 500, alpha: smooth((t - 16.1) / .4) });
    // 朱印：大凶，落在「大凶」两个字被说出来的那一刻
    const k = clamp((t - 17.15) / .18), s = lerp(1.5, 1, easeOut(k));
    if (k > 0) { ctx.save(); ctx.globalAlpha = k; ctx.translate(1450, 470); ctx.scale(s, s); seal(ctx, '大凶', 0, 0, 260, -.07); ctx.restore(); }
    vtext(ctx, '起初的卦象', 1700, 330, { px: 38, fam: F.kai, color: C.ink2, layer: 'hero', alpha: smooth((t - 15.84) / .4) });
  }
  function end(ctx, t) {
    const sc = SCENES[2], p = (t - sc.t0) / (sc.t1 - sc.t0);
    // 朱砂日
    const gr = ctx.createRadialGradient(1500, 520, 10, 1500, 520, 260); gr.addColorStop(0, 'rgba(180,48,42,.95)'); gr.addColorStop(.42, 'rgba(180,48,42,.9)'); gr.addColorStop(.47, 'rgba(180,48,42,.15)'); gr.addColorStop(1, 'rgba(180,48,42,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(1500, 520, 260, 0, 7); ctx.fill();
    mountains(ctx, t, 800, [[130, -40, 'rgba(139,132,122,.5)', 71, 2.4], [100, 60, 'rgba(74,69,62,.7)', 73, 3.3], [70, 170, 'rgba(26,23,20,.95)', 79, 4.6]]);
    mist(ctx, 790, 60, t, .75);
    // 一笔横扫向日：向前
    const k = easeOut((t - 36.04) / .45);
    brush(ctx, [[260, 740], [700, 700], [1100, 640], [1380, 590]], 64, C.ink, 707, { dry: .4, prog: Math.max(.02, k) });
    // 乾卦 + 竖排引文（左侧，淡墨，是前面「天行健」段落留下来的）
    ctx.save(); ctx.globalAlpha = .55; gua(ctx, GUA.qian, 120, 640, 170, 48, 600, { th: 24 }); ctx.restore();
    text(ctx, '乾', 205, 300, { px: 50, fam: F.serif, color: C.ink3, layer: 'deco', weight: 700 });
    vtext(ctx, '天行健', 400, 240, { px: 44, fam: F.serif, color: C.ink2, layer: 'deco', weight: 600 });
    vtext(ctx, '君子以自强不息', 340, 240, { px: 34, fam: F.serif, color: C.ink3, layer: 'deco', weight: 500, gap: 1.2 });
    // 大字
    const a = easeOut((t - 36.04) / .35);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(lerp(-40, 0, a), 0);
    text(ctx, '向前', 960, 420, { px: 280, fam: F.brush, color: C.ink, layer: 'hero', ls: 30 });
    ctx.restore();
  }

  function render(ctx, t) {
    if (!PAPER) init();
    ctx.drawImage(PAPER, 0, 0);
    const id = sceneAt(t).id;
    if (id === 'open') open(ctx, t); else if (id === 'gua') guaScene(ctx, t); else end(ctx, t);
    badge(ctx); subtitle(ctx, t);
  }
  return { render, fonts: [['400 100px "MaShan"'], ['400 50px "WenKai"'], ['600 50px "NotoSerif"']] };
})();
