
// ---- 4. the printed ground: snow, the trodden path on out to the lake, the frozen lake ---------------------------------
const PATH = P2.pathLine([L2W(DOOR.u, 0.3), L2W(1.75, 2.4), L2W(2.5, 5.2), L2W(4.4, 8.4), L2W(7.4, 11.6), L2W(11.5, 14.8), L2W(15.4, 17.6), L2W(...SHORE), L2W(...LK(1.2, 0.6))], { step: 0.4 });
const POND = { c: L2W(-9.6, 4.6), rx: 4.2, rz: 2.4 };
const pondPts = (k) => Array.from({ length: 40 }, (_, i) => { const a = i / 40 * Math.PI * 2, w = 1 + 0.08 * Math.sin(a * 3 + 1) + 0.05 * Math.sin(a * 5); return [POND.c[0] + Math.cos(a) * POND.rx * k * w, POND.c[1] + Math.sin(a) * POND.rz * k * w]; });
const inPond = (x, z, k = 1) => ((x - POND.c[0]) / (POND.rx * k)) ** 2 + ((z - POND.c[1]) / (POND.rz * k)) ** 2 < 1;
H.printGround(({ g, ppu, X, Z, rnd, washes, torn, bandOf, line, drifts, water }) => {
  washes(['#c9d1e1', '#e9eef6', '#d3dae8', '#bcc6da', '#eef2f8', '#c4c9e0']);
  const blob = (x, z, r, n = 14) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2, w = 1 + 0.18 * Math.sin(a * 3 + x) + 0.1 * Math.sin(a * 5 + z); return [x + Math.cos(a) * r * 1.6 * w, z + Math.sin(a) * r * w]; });
  const B = H.bounds;
  for (let k = 0; k < 70; k++) torn(blob(B.x0 + rnd() * (B.x1 - B.x0), B.z0 + rnd() * (B.z1 - B.z0), 1.5 + rnd() * 3.5), P2.rgba('#f6f8fc', 0.55), 'rgba(255,255,255,0.5)');
  for (let k = 0; k < 55; k++) torn(blob(B.x0 + rnd() * (B.x1 - B.x0), B.z0 + rnd() * (B.z1 - B.z0), 1 + rnd() * 2.6), P2.rgba('#a9b3cc', 0.32), 'rgba(236,240,250,0.45)');
  // the frozen pond: a pale bank, blue ice, a deeper middle, cracks
  // the frozen lake: a wide snowy bank, pale blue ice with a deeper middle, long cracks, a few skate-scratch arcs
  torn(lakePts(1.14), P2.rgba('#f4f7fc', 0.9), 'rgba(255,255,255,0.6)');
  water(lakePts(1), { colors: ['#b4c4dc', '#7f96ba'], rim: '#f3f6fb', marks: 'cracks', markColor: 'rgba(246,250,255,0.85)', inset: 0.7 });
  for (let k = 0; k < 7; k++) { const a = rnd() * 6.28, r = 1.5 + rnd() * 3, cx = LAKE.c[0] + Math.cos(a) * r, cz = LAKE.c[1] + Math.sin(a) * r * 0.6; g.strokeStyle = P2.rgba('#eef3fb', 0.5); g.lineWidth = 0.05 * ppu; g.beginPath(); g.ellipse(X(cx), Z(cz), (1 + rnd() * 2) * ppu, (0.4 + rnd()) * ppu, a, 0, 2.2); g.stroke(); }
  water(pondPts(1), { colors: ['#a9bad4', '#8399bb'], rim: '#f1f4fa', marks: 'cracks', markColor: 'rgba(244,248,255,0.85)', inset: 0.55 });
  // the trodden path from the door: lilac-grey packed snow, a pale worn middle, footprints, a fringe of fresh snow
  torn(bandOf(PATH.pts, (s) => 1.0 + 0.18 * Math.sin(s * 9) + 0.1 * Math.sin(s * 23)), C.path, 'rgba(250,252,255,0.85)');
  line(PATH.pts, 0.75, P2.rgba('#d9d4d9', 0.6));
  for (let i = 2; i < PATH.pts.length - 1; i++) {
    const [x, z] = PATH.pts[i], [x1, z1] = PATH.pts[i + 1], a = Math.atan2(z1 - z, x1 - x), s = i % 2 ? 1 : -1;
    const fx = x - Math.sin(a) * 0.26 * s, fz = z + Math.cos(a) * 0.26 * s;
    g.save(); g.translate(X(fx), Z(fz)); g.rotate(a); g.fillStyle = P2.rgba('#9c97a8', 0.55);
    g.beginPath(); g.ellipse(0, 0, 0.2 * ppu, 0.09 * ppu, 0, 0, 7); g.fill(); g.fillStyle = P2.rgba('#f2f2f6', 0.5); g.beginPath(); g.ellipse(-0.03 * ppu, -0.03 * ppu, 0.13 * ppu, 0.04 * ppu, 0, 0, 7); g.fill(); g.restore();
  }
  // stepping stones before the door
  for (const [u, v, r] of [[1.25, 1.2, 0.42], [2.15, 1.9, 0.38], [1.5, 2.9, 0.4]]) {
    const [x, z] = L2W(u, v);
    torn(blob(x, z, r, 10), '#8f94a8', 'rgba(240,244,252,0.8)'); torn(blob(x - 0.06, z - 0.05, r * 0.55, 8), P2.rgba('#f4f6fb', 0.85), 'rgba(255,255,255,0)');
  }
  // fresh snow texture: sparkle ticks and cool flecks gathered in drifts
  drifts((x, y) => {
    if (rnd() < 0.55) { g.fillStyle = P2.rgba('#ffffff', 0.85); g.beginPath(); g.arc(x, y, 1.2 + rnd() * 1.4, 0, 7); g.fill(); }
    else { g.strokeStyle = P2.rgba(rnd() < 0.5 ? '#9aa6c4' : '#b9c2d8', 0.6); g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3 + rnd() * 4, y + (rnd() - 0.5) * 2); g.stroke(); }
  }, { n: 14000 });
});
