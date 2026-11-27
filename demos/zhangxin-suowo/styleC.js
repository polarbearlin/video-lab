// 风格 C ·「大字报」极简大字排版
// 规则：只用纸白 / 墨黑 / 信号红三种颜色（红色只给最关键的一个词或一个图形）；12 栏细网格，所有元素左对齐到栏线；
// 超粗黑体大字占画面一半以上，编号和时间码用 Instrument Serif 斜体；动效只有「砸下」「横切」两种，硬朗、不柔化；
// 结尾段从白底反转成黑底。
const Cs = (() => {
  const C = { paper: '#F2F0EB', ink: '#111111', red: '#E2231A', gray: '#8F8B84', gray2: '#C9C5BD' };
  const F = { sans: '"NotoSans"', num: '"InstrumentSerif"' };
  const X0 = 110, COL = (W - X0 * 2) / 12;
  function grid(ctx, dark) {
    ctx.save(); ctx.strokeStyle = dark ? 'rgba(242,240,235,.07)' : 'rgba(17,17,17,.07)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 12; i++) { const x = Math.round(X0 + i * COL) + .5; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (const y of [150, 900]) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); ctx.stroke(); }
    ctx.restore();
  }
  function badge(ctx, dark, t) {
    ctx.fillStyle = C.red; ctx.fillRect(X0, 62, 196, 56);
    text(ctx, BADGE, X0 + 98, 90, { px: 32, fam: F.sans, weight: 900, color: C.paper, layer: 'badge', ls: 4 });
    text(ctx, TITLE, X0 + 222, 90, { px: 26, fam: F.sans, weight: 500, color: dark ? C.gray2 : C.gray, align: 'left', layer: 'badge' });
    const tc = `${t.toFixed(2).padStart(5, '0')} / ${DUR.toFixed(2)}`;
    text(ctx, tc, W - X0, 92, { px: 34, fam: F.num, color: dark ? C.gray2 : C.gray, align: 'right', layer: 'badge' });
  }
  function subtitle(ctx, t, dark) {
    const s = subAt(t); if (!s) return;
    const px = fitPx(ctx, s.text, 50, W - X0 * 2 - 40, F.sans, 700, 1), y = 985;
    ctx.save(); ctx.globalAlpha = s.k;
    ctx.fillStyle = C.red; ctx.fillRect(X0, y - 30, 10, 60);
    text(ctx, s.text, X0 + 34, y, { px, fam: F.sans, weight: 700, color: dark ? C.paper : C.ink, align: 'left', layer: 'sub', ls: 1 });
    ctx.restore();
  }
  const drop = (t, t0, d = .22) => easeOut((t - t0) / d);   // 砸下

  function open(ctx, t) {
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H); grid(ctx, false);
    const a = drop(t, .05), b = drop(t, .75);
    ctx.save(); ctx.globalAlpha = clamp(a * 2); ctx.translate(0, (1 - a) * -40);
    text(ctx, '胜券在握', X0 - 12, 400, { px: 290, fam: F.sans, weight: 900, color: C.ink, align: 'left', layer: 'hero', ls: -6 });
    ctx.restore();
    ctx.save(); ctx.globalAlpha = clamp(b * 2); ctx.translate((1 - b) * -60, 0);
    const w1 = text(ctx, '才肯', X0, 680, { px: 150, fam: F.sans, weight: 900, color: C.ink, align: 'left', layer: 'hero' });
    const w2 = text(ctx, '拔剑', X0 + w1 + 10, 680, { px: 150, fam: F.sans, weight: 900, color: C.red, align: 'left', layer: 'hero' });
    text(ctx, '？', X0 + w1 + w2 + 20, 680, { px: 150, fam: F.sans, weight: 900, color: C.ink, align: 'left', layer: 'hero' });
    ctx.restore();
    // 一道红色斜切 = 剑光
    const k = easeOut((t - .3) / .5);
    ctx.save(); ctx.translate(1560, 560); ctx.rotate(-.9); ctx.fillStyle = C.red; ctx.fillRect(-380 * k, -9, 760 * k, 18); ctx.restore();
    text(ctx, 'No.01', W - X0, 830, { px: 120, fam: F.num, color: C.ink, align: 'right', layer: 'hero' });
  }
  function guaScene(ctx, t) {
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H); grid(ctx, false);
    // 手掌线稿（大字后面）：灰色外轮廓 + 红色掌纹
    ctx.save(); ctx.translate(560, 560); ctx.rotate(-.05);
    const hp = handPath(620);
    ctx.strokeStyle = C.gray2; ctx.lineWidth = 8; ctx.stroke(hp); ctx.fillStyle = C.paper; ctx.fill(hp);
    ctx.lineCap = 'round'; ctx.strokeStyle = C.red; ctx.lineWidth = 7; ctx.globalAlpha = .9; palmLines(620).forEach(l => ctx.stroke(l));
    ctx.restore();
    text(ctx, '起初的卦象', X0, 215, { px: 48, fam: F.sans, weight: 700, color: C.ink, align: 'left', layer: 'hero', alpha: drop(t, 15.84) });
    const a = drop(t, 16.95, .18);
    ctx.save(); ctx.globalAlpha = clamp(a * 2); ctx.translate(0, (1 - a) * -60);
    text(ctx, '大凶', X0 - 20, 580, { px: 470, fam: F.sans, weight: 900, color: C.ink, align: 'left', layer: 'hero', ls: -10 });
    ctx.restore();
    // 否卦：六根红条
    const x = 1260, y0 = 760, w = 450, h = 48, gap = 92;
    GUA.pi.forEach((v, i) => {
      const k = easeOut((t - (15.84 + i * .14)) / .25); if (k <= 0) return;
      const ww = w * k; ctx.fillStyle = C.red;
      if (v) ctx.fillRect(x, y0 - i * gap, ww, h); else { const g = w * .16, hw = (w - g) / 2; ctx.fillRect(x, y0 - i * gap, Math.min(hw, ww), h); if (ww > hw + g) ctx.fillRect(x + hw + g, y0 - i * gap, ww - hw - g, h); }
    });
    text(ctx, '否', x, 230, { px: 64, fam: F.sans, weight: 900, color: C.ink, align: 'left', layer: 'hero' });
    text(ctx, '天地不交 · 第十二卦', x + 84, 236, { px: 30, fam: F.sans, weight: 500, color: C.gray, align: 'left', layer: 'hero' });
    text(ctx, 'No.02', W - X0, 860, { px: 60, fam: F.num, color: C.ink, align: 'right', layer: 'deco' });
  }
  function end(ctx, t) {
    ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H); grid(ctx, true);
    text(ctx, QIAN, X0, 220, { px: 44, fam: F.sans, weight: 700, color: C.paper, align: 'left', layer: 'hero' });
    text(ctx, KUN, X0, 285, { px: 32, fam: F.sans, weight: 500, color: C.gray, align: 'left', layer: 'hero' });
    // 乾卦（右上，白条）
    GUA.qian.forEach((v, i) => { ctx.fillStyle = C.paper; ctx.fillRect(W - X0 - 200, 330 - i * 30, 200, 16); });
    text(ctx, '乾', W - X0 - 230, 260, { px: 44, fam: F.sans, weight: 900, color: C.paper, align: 'right', layer: 'hero' });
    const a = drop(t, 36.04, .2);
    ctx.save(); ctx.globalAlpha = clamp(a * 2); ctx.translate((1 - a) * -80, 0);
    const w = text(ctx, '向前', X0 - 16, 640, { px: 400, fam: F.sans, weight: 900, color: C.paper, align: 'left', layer: 'hero', ls: -8 });
    ctx.restore();
    // 红色箭头一路冲出画面右侧
    const k = easeOut((t - 36.1) / .3), ax = X0 + w + 40, ay = 640;
    if (k > 0) {
      const len = (W + 40 - ax) * k;
      ctx.fillStyle = C.red; ctx.fillRect(ax, ay - 22, Math.max(0, len - 90), 44);
      ctx.beginPath(); ctx.moveTo(ax + len - 120, ay - 80); ctx.lineTo(ax + len, ay); ctx.lineTo(ax + len - 120, ay + 80); ctx.closePath(); ctx.fill();
    }
    text(ctx, 'No.03', W - X0, 860, { px: 60, fam: F.num, color: C.gray2, align: 'right', layer: 'deco' });
  }

  function render(ctx, t) {
    const id = sceneAt(t).id, dark = id === 'end';
    if (id === 'open') open(ctx, t); else if (id === 'gua') guaScene(ctx, t); else end(ctx, t);
    badge(ctx, dark, t); subtitle(ctx, t, dark);
  }
  return { render, fonts: [['900 100px "NotoSans"'], ['500 30px "NotoSans"'], ['400 60px "InstrumentSerif"']], extra: '胜券在握才肯拔剑？起初的卦象大凶否天地不交第十二卦乾向前No.0123456789/' };
})();
const C = Cs;
