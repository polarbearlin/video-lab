// ---------- 真实素材层 ----------
// data/shots.json：{ 段落id: [镜头, ...] }。某段有镜头表就用素材打底，第一个镜头之前、以及没有镜头表的段落，退回 B[id] 代码画面。
// 镜头字段：
//   at   起点：秒（段内），或旁白里的词（取该词出现时刻 − 0.15 秒）
//   kind 'photo'（默认，铺满）| 'doc'（文件页、推文卡：深色底上的卡片）| 'video'（footage/v/<vid>/00001.jpg 起的帧序列，30fps）| 'code'（这一段时间用回代码画面）
//   img  footage/img/ 下的文件名；vid + in（片段内起点秒）
//   kb   [z0, z1, fx0, fy0, fx1, fy1]：慢推/平移，z 为缩放倍数，fx/fy 为取景中心（0–1）
//   hl   [{ r: [x, y, w, h]（图像内 0–1 坐标）, at: 秒或词 }]：荧光笔
//   src  角标（署名/授权）；tag 左上标签（日期 · 地点）；cap 大字（关键数字或原话，可选）
const SH = await J('data/shots.json');
const FIM = {}, VC = new Map();
await Promise.all([...new Set(Object.values(SH).flat().filter(s => s.img).map(s => s.img))].map(async f => { FIM[f] = await load(`footage/img/${f}`); }));
const atOf = (b, v) => typeof v === 'string' ? Math.max(0, b.kw(v, 0) - 0.15) : (v || 0);
async function vframe(vid, n) {
  const key = vid + '/' + n; if (VC.has(key)) return VC.get(key);
  const im = await load(`footage/v/${vid}/${String(n).padStart(5, '0')}.jpg`); VC.set(key, im); if (VC.size > 240) VC.delete(VC.keys().next().value); return im;
}
function kbBox(im, s, p, bw, bh) {   // 铺满 bw×bh 的缩放与偏移（带慢推/平移）
  const [z0, z1, fx0, fy0, fx1, fy1] = s.kb || [1.04, 1.12, 0.5, 0.45, 0.5, 0.42], e = p;   // 慢推用匀速
  const z = lerp(z0, z1, e), fx = lerp(fx0, fx1, e), fy = lerp(fy0, fy1, e);
  const r = Math.max(bw / im.naturalWidth, bh / im.naturalHeight) * z, iw = im.naturalWidth * r, ih = im.naturalHeight * r;
  return { x: clamp(bw / 2 - fx * iw, bw - iw, 0), y: clamp(bh / 2 - fy * ih, bh - ih, 0), iw, ih };
}
function grade() {   // 统一调子：上下压暗，给角标和字幕留底
  let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(8,8,9,.62)'); g.addColorStop(0.16, 'rgba(8,8,9,0)'); g.addColorStop(0.66, 'rgba(8,8,9,0)'); g.addColorStop(1, 'rgba(8,8,9,.78)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function hlDraw(s, b, k, box) {   // 荧光笔：box 为图像在画面上的位置
  for (const h of s.hl || []) { const p = (k - atOf(b, h.at)) / 0.45; if (p <= 0) continue; const [x, y, w, hh] = h.r;
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; marker(box.x + x * box.iw, box.y + y * box.ih, w * box.iw, hh * box.ih, clamp(p)); ctx.restore(); }
}
async function drawShot(s, b, k, k0, k1) {
  const p = clamp((k - k0) / Math.max(k1 - k0, 0.5));
  if (s.kind === 'code') { await B[b.id](k, b); return; }
  if (s.kind === 'doc') {
    const im = FIM[s.img]; ctx.fillStyle = C.ink2; ctx.fillRect(0, 0, W, H); if (!im) return;
    const bw = 1640, bh = 840, r0 = Math.min(bw / im.naturalWidth, bh / im.naturalHeight), [z0, z1, fx0, fy0, fx1, fy1] = s.kb || [1, 1.08, 0.5, 0.5, 0.5, 0.5];
    const z = lerp(z0, z1, ease(p)), r = r0 * z, iw = im.naturalWidth * r, ih = im.naturalHeight * r;
    const fx = lerp(fx0, fx1, ease(p)), fy = lerp(fy0, fy1, ease(p)), cx = W / 2, cy = 560;
    const box = { x: iw <= bw ? cx - iw / 2 : clamp(cx - fx * iw, cx + bw / 2 - iw, cx - bw / 2), y: ih <= bh ? cy - ih / 2 : clamp(cy - fy * ih, cy + bh / 2 - ih, cy - bh / 2), iw, ih };
    ctx.save(); ctx.beginPath(); ctx.rect(cx - bw / 2 - 30, cy - bh / 2 - 30, bw + 60, bh + 60); ctx.clip();
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12; ctx.fillStyle = '#fff'; ctx.fillRect(box.x, box.y, box.iw, box.ih); ctx.shadowColor = 'transparent';
    ctx.drawImage(im, box.x, box.y, box.iw, box.ih); hlDraw(s, b, k, box); ctx.restore(); return;
  }
  let im = null;
  if (s.kind === 'video') im = await vframe(s.vid, 1 + Math.floor(((s.in || 0) + k - k0) * 30));
  else im = FIM[s.img];
  if (!im) { ctx.fillStyle = C.ink2; ctx.fillRect(0, 0, W, H); return; }
  const box = kbBox(im, s.kind === 'video' ? { kb: s.kb || [1, 1, 0.5, 0.5, 0.5, 0.5] } : s, p, W, H);
  ctx.save(); ctx.filter = s.mono ? 'grayscale(1) contrast(1.1)' : 'saturate(.86) contrast(1.05)'; ctx.drawImage(im, box.x, box.y, box.iw, box.ih); ctx.restore();
  hlDraw(s, b, k, box); grade();
}
function overlay(s, b, k, k0) {   // 叠在素材上的信息层
  bug(true); layers(SEC[b.sec], true);
  if (s.tag) alpha(clamp((k - k0) / 0.3), () => { const f = '700 30px NSC', w = tw(s.tag, f) + 40; ctx.fillStyle = C.marker; ctx.fillRect(56, 116, w, 50); text(s.tag, 76, 152, f, C.ink); });
  if (s.cap) { const p = (k - atOf(b, s.capAt ?? s.at)) / 0.5; if (p > 0) alpha(clamp(p * 3), () => { const f = `${s.capSize || 120}px Black`; text(s.cap, 90, 860, f, C.white); ctx.fillStyle = C.marker; ctx.fillRect(90, 884, tw(s.cap, f) * easeOut(p), 10); }); }
  for (const c of s.caps || []) { const p = (k - atOf(b, c.at)) / 0.5; if (p <= 0) continue;   // 多行大字：{ s, at, size, y, col, font }
    alpha(clamp(p * 3), () => { const f = c.font === 'Num' ? `600 ${c.size || 110}px Num` : `${c.size || 110}px Black`; ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 4;
      text(c.s, 90, c.y || 860, f, c.col === 'marker' ? C.marker : c.col === 'grey' ? '#C9C6C0' : C.white); ctx.restore(); }); }
  if (s.src && s.kind !== 'code') chip(s.src, 90, 1046 - 0, true);
}
async function drawShots(b, k) {   // 返回 false：这一刻没有素材镜头，用代码画面
  const L = SH[b.id]; if (!L || !L.length) return false;
  const ats = L.map(s => atOf(b, s.at)); let i = -1; for (let j = 0; j < L.length; j++) if (k >= ats[j]) i = j;
  if (i < 0) return false;
  const s = L[i], k0 = ats[i], k1 = i + 1 < L.length ? ats[i + 1] : b.dur, X = 0.28;
  if (i > 0 && k - k0 < X && L[i - 1].kind !== 'code' && s.kind !== 'code') { await drawShot(L[i - 1], b, k, ats[i - 1], k0); ctx.save(); ctx.globalAlpha = ease((k - k0) / X); await drawShot(s, b, k, k0, k1); ctx.restore(); }
  else await drawShot(s, b, k, k0, k1);
  if (s.kind !== 'code') overlay(s, b, k, k0);
  return true;
}
window.SHOTS_MISSING = () => [...new Set(Object.values(SH).flat().filter(s => s.img && !FIM[s.img]).map(s => s.img))];
