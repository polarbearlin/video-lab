// ---------- 排版小件 ----------
function text(s, x, y, font, col, align = 'left') { ctx.font = font; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.textAlign = 'left'; }
const tw = (s, font) => { ctx.font = font; return ctx.measureText(s).width; };
function alpha(a, fn) { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= clamp(a); fn(); ctx.restore(); }
function marker(x, y, w, h, p = 1) { if (p <= 0) return; ctx.save(); ctx.globalAlpha *= 0.92; ctx.fillStyle = C.marker; const ww = (w + 14) * easeOut(p); ctx.beginPath(); ctx.moveTo(x - 6, y + 4); ctx.lineTo(x - 6 + ww, y); ctx.lineTo(x - 10 + ww, y + h); ctx.lineTo(x - 4, y + h + 3); ctx.closePath(); ctx.fill(); ctx.restore(); }
function slam(p) { return p <= 0 ? 0 : 1 + 0.35 * (1 - easeOut(clamp(p / 0.18))); }   // 砸下：先大后落定
function card(im, x, y, w, h, { src = '', tone = 'color', rot = 0, p = 1, zoom = 1, fx = 0.5, fy = 0.38, label = '' } = {}) {
  if (p <= 0) return; const e = easeOut(p / 0.5), dy = (1 - e) * 40;
  ctx.save(); ctx.globalAlpha *= clamp(p * 3); ctx.translate(x + w / 2, y + h / 2 + dy); ctx.rotate(rot); ctx.translate(-w / 2, -h / 2);
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#FBFAF7'; ctx.fillRect(-14, -14, w + 28, h + 28 + (src ? 40 : 0)); ctx.shadowColor = 'transparent';
  if (src) text(src, 0, h + 34, '400 18px NSC', '#7A7468');
  ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  if (im) { const r = Math.max(w / im.naturalWidth, h / im.naturalHeight) * zoom, iw = im.naturalWidth * r, ih = im.naturalHeight * r;
    ctx.filter = tone === 'mono' ? 'grayscale(1) contrast(1.08)' : tone === 'dim' ? 'saturate(.55) brightness(.8)' : 'saturate(.8) contrast(1.04)';
    ctx.drawImage(im, (w - iw) * fx, (h - ih) * fy, iw, ih); ctx.filter = 'none'; }
  else { ctx.fillStyle = '#D9D4CA'; ctx.fillRect(0, 0, w, h); text(label, w / 2, h / 2 + 12, '700 34px NSC', '#8C857A', 'center'); }
  ctx.restore();
}
function cover(im, { zoom = 1, fx = 0.5, fy = 0.5, filter = 'none', a = 1 } = {}) {   // 整屏铺满
  if (!im) return; const r = Math.max(W / im.naturalWidth, H / im.naturalHeight) * zoom, iw = im.naturalWidth * r, ih = im.naturalHeight * r;
  ctx.save(); ctx.globalAlpha *= a; ctx.filter = filter; ctx.drawImage(im, (W - iw) * fx, (H - ih) * fy, iw, ih); ctx.restore();
}
function shade(a, col = '10,10,11') { ctx.fillStyle = `rgba(${col},${a})`; ctx.fillRect(0, 0, W, H); }
function stamp(s, x, y, p, rot = -0.12, col = C.stamp) { if (p <= 0) return; const sc = slam(p); ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); ctx.globalAlpha *= clamp(p * 6); ctx.strokeStyle = col; ctx.lineWidth = 5; const w = tw(s, '40px Black') + 40; ctx.strokeRect(-w / 2, -38, w, 64); text(s, 0, 8, '40px Black', col, 'center'); ctx.restore(); }
function chip(s, x, y, dark = true) { const f = '700 24px NSC', w = tw(s, f) + 28; ctx.fillStyle = dark ? 'rgba(10,10,11,.78)' : 'rgba(21,20,18,.88)'; ctx.fillRect(x, y - 30, w, 42); text(s, x + 14, y, f, C.white); }
function big(s, x, y, size, col, p, align = 'left', font = 'Black') { if (p <= 0) return; const sc = slam(p); ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha *= clamp(p * 6); text(s, 0, 0, `${size}px ${font}`, col, align); ctx.restore(); }
function num(v, x, y, size, col, p, { suffix = '', prefix = '', dec = 0, align = 'left', label = '', labCol } = {}) {   // 读数：数字从 0 滚到落点
  if (p <= 0) return; const k = easeOut(p / 0.6), s = prefix + (v * k).toFixed(dec) + suffix, sc = slam(p - 0.55);
  ctx.save(); ctx.translate(x, y); ctx.scale(p > 0.55 ? sc : 1, p > 0.55 ? sc : 1); text(s, 0, 0, `600 ${size}px Num`, col, align); ctx.restore();
  if (label) text(label, x, y + size * 0.34 + 18, '700 30px NSC', labCol || col, align);
}
function quoteCard(x, y, w, lines, who, p, dark = false) {
  if (p <= 0) return; const e = easeOut(p / 0.4); ctx.save(); ctx.globalAlpha *= clamp(p * 3); ctx.translate((1 - e) * 60, 0);
  const h = 60 + lines.length * 62 + 50; ctx.fillStyle = dark ? '#16181D' : '#FBFAF7'; ctx.fillRect(x, y, w, h); ctx.fillStyle = C.marker; ctx.fillRect(x, y, 8, h);
  lines.forEach((l, i) => text(l, x + 40, y + 72 + i * 62, '700 42px NSC', dark ? C.white : C.ink)); text(who, x + 40, y + h - 26, '400 22px NSC', dark ? C.grey : C.sub); ctx.restore();
}
function nameCard(x, y, name, role, p, { strike = 0, party = null, tag = '' } = {}) {
  if (p <= 0) return; const e = easeOut(p / 0.4); ctx.save(); ctx.globalAlpha *= clamp(p * 3); ctx.translate(0, (1 - e) * 40);
  ctx.fillStyle = '#F7F5F0'; ctx.fillRect(x, y, 520, 200); if (party) { ctx.fillStyle = party; ctx.fillRect(x, y, 520, 12); }
  text(name, x + 36, y + 106, '64px Black', C.ink); text(role, x + 36, y + 160, '700 30px NSC', C.sub);
  if (strike > 0) { ctx.strokeStyle = C.gop; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x + 20, y + 86); ctx.lineTo(x + 20 + 480 * easeOut(strike / 0.3), y + 86 - 20 * easeOut(strike / 0.3)); ctx.stroke(); }
  if (tag) { const f = '700 26px NSC', w = tw(tag, f) + 28; ctx.fillStyle = C.marker; ctx.fillRect(x + 520 - w - 16, y - 18, w, 40); text(tag, x + 520 - 16 - w / 2, y + 12, f, C.ink, 'center'); }
  ctx.restore();
}
function bg(mode) {
  if (mode === 'paper') { ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H); }
  else if (mode === 'night') { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, C.night2); g.addColorStop(1, C.night); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  else { ctx.fillStyle = C.black; ctx.fillRect(0, 0, W, H); }
}
function lowerThird(tag, txt, p, col = C.dem) { if (p <= 0) return; const e = easeOut(p / 0.35), w = 1920 * e; ctx.save(); ctx.beginPath(); ctx.rect(0, 800, w, 74); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(0, 800, W, 74); text(tag, 40, 852, '40px Black', C.marker); text(txt, 60 + tw(tag, '40px Black') + 20, 852, '700 40px NSC', C.white); ctx.restore(); }
