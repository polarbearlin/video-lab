// 第一场雪 / The first snow: a 10 s pop-up-book film (1920x1080, 30 fps) built on the papercraft skill's popup-3d
// harness (harness.js and lib/ unchanged). Everything is cut and printed in code: no images.
//
// PAPER SPEC (the style card, SKILL.md step 1)
//   Brief      a warm, healing picture-book moment: a cosy paper cottage on a snowy night, warm yellow windows; a tall
//              butler opens the door and leads a young lady out; big paper-cut flakes drift down; he wraps a scarf
//              round her; she catches a flake in her palm and looks up, delighted; snow piles on the pines and the roof;
//              the camera pushes in on the two side by side, the warm doorway behind them. Ends on a calm hold.
//   Subject    the two paper figures in front of the lit doorway (shot 3: ~30 % of the frame height)
//   Stock      cool card '#eef1f6' (a snow world), matte, thick (0.08; figures 0.05), fibre showing
//   Palette    snow ground #d6dce8 / drift shadow #aab4cc / lilac-grey trodden path #c6c1c8; lead: warm log cottage
//              #8e5634 #6a3c24 under a snow roof, deep pines #2c4c40 #3b6450; accents: window amber #ffc45a, scarf berry
//              #b3343c, the lady's ivory and latte, the butler's black and dark grey; shadows navy-lilac, never grey
//   Light      night: a pale moon key from the upper left (#c4d2ff 1.7), a frontal navy fill, navy sky; the warmth comes
//              from practicals: window panes, the open doorway, a door lantern, a lamp post, two path lanterns
//   Lens       fov 26, pitched 47 -> 38 deg, ground past every edge; tilt-shift band ~0.3 + 0.3 ramp, max blur 16 px
//   Ground     printed snow: three-scale washes, torn pale drifts and lilac shadow drifts, a trodden path with
//              footprints from the door, stepping stones, a frozen pond with cracks, sparkle ticks
//   Types      box fold (cottage, hinged door, lit interior card), full crosses (pines, birches), layered cards
//              (bushes), nested sails (drifts, hills), single cards (props, fence), 3D T-card figures, life (flakes,
//              chimney smoke)
//   Motion     hinges only: the world rises front to back (0.2-2 s), the door swings on a spring (2.3 s), drifts rise
//              slowly through the film, a scarf drops on its hinge; figures turn and stride on pivots; flakes unfold,
//              fall, land and shrink away
//   Film       3 shots of 3.4 s (one bar each at 70.6 bpm): wide crane-in on the cottage, the door opens; medium truck as
//              they step out and he drapes the scarf; close push-in as she catches a flake and looks up. Hold, no fade.
//   Sound      felt piano + soft high harp (music box), paper flaps for every rise, the door and the scarf, soft steps,
//              a low wind under everything
//   QA         stills at 1.0, 2.9, 4.6, 6.1, 8.6, 9.97 s; measure.py --profile night; figure clip check; continuity
import * as THREE from 'three';
import * as P2 from 'papercraft/lib/paperkit-2d.js';
import { makeCard, boxFold, layeredCard, cardClips } from 'papercraft/lib/paperkit-3d.js';
import * as EX from 'papercraft/examples/countryside.js';
import { createLife } from 'papercraft/lib/paper-life.js';
import { checkContinuity } from 'papercraft/lib/paper-motion.js';
import { FLAP_PRESETS } from 'papercraft/lib/paper-sound.js';
import { createHarness } from './harness.js';
import { buildFigures } from './figures.js';
import { createFlakes, flakeGeometry } from './flakes.js';
import { renderSoundtrack } from './score.js';

const D = P2.draw2, DEG = Math.PI / 180;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;

// ---- 1. palette (this world's only) -------------------------------------------------------------------------------
const C = {
  ground: '#d6dce8', snowHi: '#f4f6fb', snowMid: '#e4e9f2', snowLo: '#c3cbdb', drift: '#aab4cc', path: '#c6c1c8',
  pine: '#2c4c40', pineB: '#3b6450', pineC: '#33584a', trunk: '#5a3a2a',
  wood: '#8e5634', woodB: '#9c6038', woodDark: '#6a3c24', frame: '#3a2216', stone: '#8d93a6', roof: '#7a3a30', roofSnow: '#f2f5fa',
  window: '#ffd58a', door: '#6e2c28', wreath: '#3d6a4a', berry: '#c23a3a', iron: '#2b2a33', glass: '#ffd27a',
  birch: '#e9e6df', fence: '#7e5438', sled: '#b23a36', hill: '#9aa6c2',
};
const SH = 'rgba(24,30,72,0.42)';           // layer shadows inside prints: the night's navy
const SNOWSH = 'rgba(40,52,110,0.5)';       // under a snow layer: lilac-blue

// ---- 2. the cottage frame and the film's camera ---------------------------------------------------------------------
const HOUSE = { x: -3.5, z: -9, yaw: 0.35, w: 8.4, d: 6, wallH: 5.4, roofH: 3.4, ov: 0.25 };
const DOOR = { u: 1.7, w: 2.0, h: 4.4 };
const hc = Math.cos(HOUSE.yaw), hs = Math.sin(HOUSE.yaw);
const L2W = (u, v) => [HOUSE.x + u * hc + v * hs, HOUSE.z - u * hs + v * hc];   // cottage frame (u along the front, v out of the door) -> page
const W2L = (x, z) => { const dx = x - HOUSE.x, dz = z - HOUSE.z; return [dx * hc - dz * hs, dx * hs + dz * hc]; };

// one camera move per shot, cut on the bar (3.4 s); a target, yaw and pitch (deg) and distance at each end
const SHOTS = [
  { t0: 0, t1: 3.4, a: { tg: [-1.9, 1.6, -8.6], yaw: 3, pitch: 47, dist: 60 }, b: { tg: [-1.5, 1.7, -8.0], yaw: 6, pitch: 45.5, dist: 52 } },
  { t0: 3.4, t1: 6.8, a: { tg: [-1.75, 1.9, -8.5], yaw: 11, pitch: 43, dist: 34 }, b: { tg: [-0.95, 1.9, -7.25], yaw: 13, pitch: 42.5, dist: 31 } },
  { t0: 6.8, t1: 10.0, a: { tg: [-0.7, 1.9, -6.95], yaw: 17, pitch: 38.5, dist: 22 }, b: { tg: [-0.66, 1.85, -6.85], yaw: 19, pitch: 36, dist: 14.5 } },
];
const glide = (u) => { u = clamp(u); return 0.3 * u + 0.7 * u * u * (3 - 2 * u); };   // never quite still at a cut
function camAt(t) {
  const S = SHOTS.find((s) => t < s.t1) || SHOTS[SHOTS.length - 1], k = glide((t - S.t0) / (S.t1 - S.t0));
  return { shot: SHOTS.indexOf(S), tg: S.a.tg.map((v, i) => lerp(v, S.b.tg[i], k)), yaw: lerp(S.a.yaw, S.b.yaw, k), pitch: lerp(S.a.pitch, S.b.pitch, k), dist: lerp(S.a.dist, S.b.dist, k) };
}
const camPos = (c) => { const y = c.yaw * DEG, p = c.pitch * DEG; return [c.tg[0] + Math.sin(y) * Math.cos(p) * c.dist, c.tg[1] + Math.sin(p) * c.dist, c.tg[2] + Math.cos(y) * Math.cos(p) * c.dist]; };

// ---- 3. light: a snowy night, warmth from the practicals --------------------------------------------------------------
const MOODS = {
  snownight: { key: '#c4d2ff', ki: 1.75, dir: [-0.72, 0.85, 0.42], fill: '#8394d4', fi: 0.78, sky: '#4a64b8', skyG: '#2a2e4a', si: 0.85, leak: '#2c3c8c', wrap: 0.42, glow: 1.25, lamp: 4.2,
    post: { exposure: 0.84, tint: [0.98, 0.98, 1.03], saturation: 1.04, contrast: 1.14, haze: '#16224e', hazeStart: 30, hazeEnd: 90, hazeAmount: 0.6, vignette: 0.34, vignetteColor: '#0c1028', shadowTint: '#18204e', shadowLift: 0.04, greenDesat: 0.2 } },
};
const V0 = camAt(0);
const H = createHarness({ ground: C.ground, stock: '#eef1f6', heroHeight: 3.4, autoOpen: false, roam: true, crossTurn: 30, mood: 'snownight', moods: MOODS,
  view: { pitch: V0.pitch, dist: V0.dist, target: V0.tg, yaw: V0.yaw, fov: 26 }, testView: { dist: 26, target: [-0.8, 1.8, -7] },
  bounds: { x0: -64, x1: 60, z0: -66, z1: 34 }, flapVoicing: FLAP_PRESETS.soft,
  light: { keyDir: [-0.72, 0.85, 0.42], shadowExtent: 36, mapSize: 4096, softness: 0.3, maxPenumbra: 1.2 }, lens: { maxBlur: 16, focusBand: 0.3, ramp: 0.3 } });
const { flags } = H;
let nLamps = 0;
const lamp = (...a) => { nLamps++; H.lamp(...a); };

// ---- 4. the printed ground: snow ---------------------------------------------------------------------------------------
const PATH = P2.pathLine([L2W(DOOR.u, 0.3), L2W(1.75, 2.4), L2W(2.5, 5.2), L2W(4.4, 8.4), L2W(7.4, 11.6), L2W(11.5, 14.8), L2W(16, 18)], { step: 0.4 });
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

// ---- 5. pieces: silhouettes and layered prints, designed for this world --------------------------------------------
let rnd = P2.rng(101);
const between = (a, b) => a + rnd() * (b - a);
const peak = (w, h, lean = 0.15) => { const p = [[w / 2, 0]]; for (let i = 1; i < 28; i++) { const t = i / 28, x = w / 2 - t * w, k = Math.min(1, Math.abs(x / (w / 2) - lean)); p.push([x, h * (1 - Math.pow(k, 1.7)) * (0.95 + 0.05 * Math.sin(t * 11))]); } p.push([-w / 2, 0]); return p; };
const mound = (w, h, lobes = 7, depth = 0.18) => P2.shape.mound(rnd, { w, h, lobes, depth });
// a snow cap along a shape's top: white bumps over a band, drips below (used on pines, bushes, rocks, props)
function snowCapPath(g, pts, box, { depth = 0.22, drip = 0.5, r = rnd } = {}) {
  const top = (x) => { let y = -Infinity; for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ax - x) * (bx - x) <= 0 && ax !== bx) { const yy = ay + (by - ay) * (x - ax) / (bx - ax); if (yy > y) y = yy; } } return y; };
  const n = 22, th = depth * Math.min(box.h, box.w * 0.6), up = [], lo = [];
  for (let i = 0; i <= n; i++) { const x = box.x0 + box.w * (0.01 + 0.98 * i / n), y = top(x); if (!Number.isFinite(y)) continue; up.push([x, y + th * 0.25]); lo.push([x, y - th * (0.55 + drip * 0.45 * (0.5 + 0.5 * Math.sin(i * 2.7 + r() * 2)))]); }
  if (up.length < 2) return;
  g.beginPath(); up.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  for (let i = lo.length - 1; i > 0; i--) { const [x0, y0] = lo[i], [x1, y1] = lo[i - 1]; g.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - th * 0.35, x1, y1); }
  g.closePath(); g.fill();
}
const snowLayer = (P, opts = {}) => P.layer((g) => snowCapPath(g, P.pts, P.box, opts), C.snowHi, { lip: 1, shade: 0.7, shadowColor: SNOWSH, depth: 1.1 });

function tierSnow(g, cx, hw, yb, top, thick, dep) {
  g.beginPath(); g.moveTo(cx - hw * 1.05, yb + dep); g.lineTo(cx, top); g.lineTo(cx + hw * 1.05, yb + dep);
  const m = 8;
  for (let i = 1; i <= m; i++) {
    const u = 1 - 2 * i / m, x = cx + u * hw * 1.0, ys = yb + (top - yb) * (1 - Math.abs(u)) - thick * (0.8 + 0.3 * Math.sin(i * 2.1));
    const xm = cx + (u + 1 / m) * hw, ym = ys - thick * 0.5;
    g.quadraticCurveTo(xm, ym, x, Math.max(ys, yb - dep * 0.5));
  }
  g.closePath(); g.fill();
}
const paintSnowPine = (leaf, snow = 1) => (P) => {
  const { box, r, pts } = P, cx = (box.x0 + box.x1) / 2, pale = P2.mix(leaf, '#cfe0c4', 0.5), dark = P2.shade(leaf, -0.42);
  P.fill(P2.shade(leaf, -0.22)); P.felt(1);
  let tips = P2.tierTips(pts, box);
  if (tips.length < 2) tips = Array.from({ length: 4 }, (_, i) => [box.w * 0.5 * (1 - i / 4 * 0.7), box.y0 + box.h * (0.1 + 0.8 * i / 4)]);
  const st = P2.spanAt(pts, box.y0 + box.h * 0.02) || [cx - box.w * 0.07, cx + box.w * 0.07];
  P.layer((g) => g.fillRect(st[0] - box.w * 0.02, box.y0 - 1, st[1] - st[0] + box.w * 0.04, tips[0][1] - box.y0 + box.h * 0.06), C.trunk, { lip: 0.5, shadowColor: SH });
  tips.forEach(([hw, yb], k) => {
    const top = Math.min(box.y1, k + 1 < tips.length ? tips[k + 1][1] + (box.y1 - tips[k + 1][1]) * 0.6 : box.y1);
    const n = Math.max(3, Math.round(hw * 2 / (box.w * 0.22))), sw = hw * 2.12 / n, dep = Math.min(sw * 0.32, box.h * 0.035);
    P.layer((g) => {
      g.beginPath(); g.moveTo(cx - hw * 1.06, yb + dep);
      for (let i = 0; i < n; i++) { const x0 = cx - hw * 1.06 + i * sw; g.quadraticCurveTo(x0 + sw / 2, yb - dep, x0 + sw, yb + dep); }
      g.lineTo(cx, top + 1); g.closePath(); g.fill();
    }, k % 2 ? P2.mix(leaf, '#8fae86', 0.12) : leaf, { rim: 1, lip: 0.7, depth: 1, shadowColor: SH });
    const nh = (top - yb) * 0.55;
    P.draw((g) => { for (const [col, m] of [[pale, 6], [dark, 4]]) { g.fillStyle = col; for (let i = 0; i < m; i++) { const u = (r() - 0.5) * 1.5; P2.fillLeaf(g, cx + u * hw * 0.8, yb + dep * 1.5 + r() * nh * 0.6, nh * (0.3 + r() * 0.14), -Math.PI / 2 + u * 0.55, 0.16); } } });
    P.layer((g) => tierSnow(g, cx, hw, yb, top, (top - yb) * 0.5 * snow, dep), C.snowHi, { lip: 1, shade: 0.7, shadowColor: SNOWSH, depth: 1.2 });
  });
  P.marks('dot', { color: '#ffffff', alpha: 0.5, size: 0.02, density: 0.3 });
  P.innerShade('#141a38', { alpha: 0.32, blurPx: 10 });
};
const paintDrift = (col) => (P) => {
  const { box } = P;
  P.gradient(P2.shade(col, 0.1), P2.shade(col, -0.12), 0); P.felt(0.6);
  P.layer((g) => { g.beginPath(); P.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y * 1.0) : g.moveTo(x, y))); g.closePath(); g.fill(); }, P2.rgba('#ffffff', 0), { lip: 0 });
  P.draw((g) => { const gr = g.createLinearGradient(0, box.y1, 0, box.y1 - box.h * 0.35); gr.addColorStop(0, P2.rgba('#ffffff', 0.55)); gr.addColorStop(1, P2.rgba('#ffffff', 0)); g.fillStyle = gr; g.fillRect(box.x0 - 1, box.y1 - box.h * 0.35, box.w + 2, box.h * 0.36); });
  P.marks('dot', { color: '#ffffff', alpha: 0.6, size: 0.025, density: 0.5 });
  P.innerShade('#26305e', { alpha: 0.35, blurPx: 10 });
};
const paintRock = (P) => { P.gradient(P2.shade(C.stone, 0.12), P2.shade(C.stone, -0.18), 0.4); P.felt(0.7); P.marks('tick', { color: P2.shade(C.stone, -0.4), alpha: 0.35, size: 0.06, angle: 0.8 }); snowLayer(P, { depth: 0.3 }); P.innerShade('#1c2040', { alpha: 0.35, blurPx: 8 }); };
const paintBushBack = (P) => { const { r } = P; P.gradient(P2.shade(C.pine, 0.06), P2.shade(C.pine, -0.2), 0); P.felt(0.8); P.draw((g) => { g.fillStyle = P2.mix(C.pine, '#bcd2b4', 0.4); for (let i = 0; i < 26; i++) P2.fillLeaf(g, P.box.x0 + r() * P.box.w, P.box.y0 + r() * P.box.h * 0.8, P.box.h * 0.16, -Math.PI / 2 + (r() - 0.5), 0.2); }); snowLayer(P, { depth: 0.26 }); P.innerShade('#121a30', { alpha: 0.35, blurPx: 8 }); };
const paintBushFront = (P) => {
  const { r, box } = P; P.gradient(P2.shade(C.pineB, 0.1), P2.shade(C.pineB, -0.16), 0); P.felt(0.8);
  P.draw((g) => { g.fillStyle = P2.mix(C.pineB, '#d4e4c8', 0.45); for (let i = 0; i < 20; i++) P2.fillLeaf(g, box.x0 + r() * box.w, box.y0 + r() * box.h * 0.8, box.h * 0.18, -Math.PI / 2 + (r() - 0.5), 0.2); });
  P.parts((g, ink) => { for (let i = 0; i < 9; i++) { g.fillStyle = ink(i % 3 ? C.berry : '#e0504a'); D.ell(g, box.x0 + box.w * (0.15 + 0.7 * r()), box.y0 + box.h * (0.25 + 0.45 * r()), box.h * 0.06, box.h * 0.06); } }, { shadowColor: SH, depth: 0.6 });
  snowLayer(P, { depth: 0.24 }); P.innerShade('#121a30', { alpha: 0.3, blurPx: 8 });
};
const paintBirch = (P) => {
  const { box, r } = P; P.fill(C.birch); P.felt(0.6);
  P.draw((g) => { g.fillStyle = '#2a2830'; for (let i = 0; i < 40; i++) { const x = box.x0 + r() * box.w, y = box.y0 + r() * box.h; g.fillRect(x, y, box.w * (0.03 + r() * 0.05), box.h * 0.008); } });
  snowLayer(P, { depth: 0.04, drip: 0.2 }); P.innerShade('#3a3a52', { alpha: 0.35, blurPx: 6 });
};
const birchPts = (h) => P2.fromDrawing((g) => {
  D.poly(g, [[-0.09 * h, 0], [0.09 * h, 0], [0.04 * h, h], [-0.04 * h, h]]);
  for (const [y, a, l] of [[0.35, 0.7, 0.32], [0.5, -0.8, 0.3], [0.62, 0.6, 0.26], [0.74, -0.55, 0.22], [0.84, 0.45, 0.16]]) {
    const x0 = 0, y0 = y * h, x1 = Math.sin(a) * l * h, y1 = y0 + Math.cos(a) * l * h, w = 0.025 * h;
    D.poly(g, [[x0 - w, y0], [x0 + w, y0 + w], [x1 + w * 0.4, y1], [x1 - w * 0.4, y1]]);
  }
}, { w: 0.9 * h, h: 1.02 * h, name: 'birch' });
const paintWoodSnow = (wood, planks = 3, vertical = false) => (P) => { EX.paintWood({ wood }, { planks, vertical })(P); snowLayer(P, { depth: 0.1, drip: 0.4 }); };

const K = {
  pine: (k) => { const h = [7.5, 9, 10.5, 8.2, 6.4][k], w = h * [0.6, 0.56, 0.52, 0.62, 0.66][k]; return [P2.roughen(EX.shape.pine(rnd, { w, h, tiers: [4, 5, 5, 4, 4][k] }), rnd), paintSnowPine([C.pine, C.pineB, C.pineC, C.pine, C.pineB][k], 1)]; },
  birch: () => { const h = between(6.5, 8); return [birchPts(h), paintBirch]; },
  rock: () => { const w = between(1.8, 2.8); return [P2.roughen(mound(w, w * 0.55, 4, 0.1), rnd), paintRock]; },
  fence: () => {
    const w = 5.4, h = 1.35, pickets = 7, pw = w / (pickets * 1.6 - 0.6), gap = pw * 0.6;
    return [EX.shape.fence({ w, h, pickets }), (P) => {
      EX.paintWood({ wood: C.fence }, { planks: 1 })(P);
      P.layer((g) => { for (let i = 0; i < pickets; i++) { const x = -w / 2 + i * (pw + gap) + pw / 2; D.ell(g, x, h - pw * 0.28, pw * 0.62, pw * 0.42); } D.rect(g, -w / 2, 0.3, w, 0.08, 0.04); }, C.snowHi, { lip: 1, shadowColor: SNOWSH });
      P.innerShade('#1c1830', { alpha: 0.3, blurPx: 6 });
    }];
  },
  lampPost: () => [P2.fromDrawing((g) => { D.rect(g, -0.32, 0, 0.64, 0.24, 0.05); D.rect(g, -0.08, 0, 0.16, 3.8); D.rect(g, -0.32, 3.55, 0.64, 0.72, 0.06); D.poly(g, [[-0.42, 4.22], [0, 4.62], [0.42, 4.22]]); }, { w: 1.0, h: 4.7, name: 'lamp post' }),
    (P) => { const { box } = P; P.fill(C.iron); P.felt(0.5); P.layer((g) => g.fillRect(-0.22, 3.64, 0.44, 0.54), C.glass, { shadow: 0 }); P.draw((g) => { g.fillStyle = C.iron; g.fillRect(-0.02, 3.64, 0.04, 0.54); g.fillRect(-0.22, 3.9, 0.44, 0.03); });
      P.glow((g) => { g.fillRect(-0.22, 3.64, 0.2, 0.54); g.fillRect(0.02, 3.64, 0.2, 0.54); }); P.layer((g) => { D.poly(g, [[-0.46, 4.2], [0, 4.62], [0.46, 4.2], [0.3, 4.24], [0, 4.5], [-0.3, 4.24]]); D.ell(g, 0, 4.5, 0.14, 0.08); }, C.snowHi, { lip: 1, shadowColor: SNOWSH }); void box; }],
  lantern: () => [P2.fromDrawing((g) => { D.rect(g, -0.06, 0, 0.12, 0.8); D.rect(g, -0.2, 0.7, 0.4, 0.44, 0.05); D.poly(g, [[-0.28, 1.1], [0, 1.34], [0.28, 1.1]]); }, { w: 0.65, h: 1.4, name: 'lantern' }),
    (P) => { P.fill(C.iron); P.layer((g) => g.fillRect(-0.13, 0.77, 0.26, 0.3), C.glass, { shadow: 0 }); P.glow((g) => g.fillRect(-0.13, 0.77, 0.26, 0.3)); P.layer((g) => { D.poly(g, [[-0.3, 1.1], [0, 1.34], [0.3, 1.1]]); }, C.snowHi, { lip: 1, shadowColor: SNOWSH }); }],
  sled: () => [P2.fromDrawing((g) => { D.poly(g, [[-1.0, 0], [0.9, 0], [1.15, 0.12], [1.2, 0.35], [1.06, 0.36], [1.0, 0.16], [0.85, 0.1], [-1.0, 0.1]]); D.rect(g, -0.85, 0.08, 0.1, 0.4); D.rect(g, 0.65, 0.08, 0.1, 0.4); D.rect(g, -1.0, 0.42, 1.85, 0.14, 0.04); }, { w: 2.6, h: 0.7, name: 'sled' }).map(([x, y]) => [x * 1.3, y * 1.3]),
    (P) => { P.fill(C.sled); P.marks('stripe', { color: P2.shade(C.sled, -0.3), alpha: 0.4, size: 0.12 }); snowLayer(P, { depth: 0.12, drip: 0.3 }); P.innerShade('#2a0e10', { alpha: 0.35, blurPx: 5 }); }],
  woodpile: () => [P2.fromDrawing((g) => { D.rect(g, -1.2, 0, 2.4, 1.3, 0.1); D.ell(g, 0, 1.3, 1.2, 0.25); }, { w: 2.6, h: 1.6, name: 'woodpile' }),
    (P) => { const { box } = P; P.fill('#5a3622'); P.parts((g, ink) => { for (let row = 0; row < 4; row++) for (let i = 0; i < 7; i++) { const x = box.x0 + 0.2 + i * 0.33 + (row % 2) * 0.16, y = 0.18 + row * 0.3; if (x > box.x1 - 0.12) continue; g.fillStyle = ink(i % 2 ? '#c99566' : '#b98455'); D.ell(g, x, y, 0.15, 0.14); } }, { shadowColor: SH, depth: 0.6 });
      P.draw((g) => { g.strokeStyle = '#8a5a36'; g.lineWidth = 0.02; for (let row = 0; row < 4; row++) for (let i = 0; i < 7; i++) { const x = box.x0 + 0.2 + i * 0.33 + (row % 2) * 0.16, y = 0.18 + row * 0.3; g.beginPath(); g.arc(x, y, 0.07, 0, 7); g.stroke(); } });
      snowLayer(P, { depth: 0.22 }); P.innerShade('#1a1020', { alpha: 0.35, blurPx: 6 }); }],
  mailbox: () => [P2.fromDrawing((g) => { D.rect(g, -0.07, 0, 0.14, 1.3); D.rect(g, -0.38, 1.2, 0.76, 0.44, 0.06); D.ell(g, 0, 1.64, 0.38, 0.18); D.rect(g, 0.36, 1.4, 0.06, 0.4); D.rect(g, 0.36, 1.7, 0.22, 0.12); }, { w: 1.3, h: 2.0, name: 'mailbox' }),
    (P) => { P.fill('#5a3a28'); P.layer((g) => { D.rect(g, -0.38, 1.2, 0.76, 0.44, 0.06); D.ell(g, 0, 1.64, 0.38, 0.18); }, '#b8443a', { shadowColor: SH }); P.layer((g) => D.rect(g, 0.36, 1.7, 0.22, 0.12), '#e8c25a', { shadowColor: SH }); snowLayer(P, { depth: 0.12 }); P.innerShade('#1a1020', { alpha: 0.3, blurPx: 5 }); }],
  snowman: () => [P2.fromDrawing((g) => { D.ell(g, 0, 0.55, 0.62, 0.55); D.ell(g, 0, 1.35, 0.45, 0.42); D.ell(g, 0, 1.98, 0.32, 0.3); D.rect(g, -0.26, 2.18, 0.52, 0.1); D.rect(g, -0.17, 2.22, 0.34, 0.34, 0.03); }, { w: 1.4, h: 2.65, name: 'snowman' }),
    (P) => { P.gradient('#ffffff', '#d4dbe8', 0.3); P.felt(0.5);
      P.parts((g, ink) => { g.fillStyle = ink('#3e6a4c'); D.rect(g, -0.36, 1.64, 0.72, 0.14, 0.05); D.poly(g, [[0.12, 1.66], [0.3, 1.66], [0.34, 1.2], [0.18, 1.22]]); g.fillStyle = ink('#24222a'); D.rect(g, -0.26, 2.18, 0.52, 0.1); D.rect(g, -0.17, 2.22, 0.34, 0.34, 0.03); g.fillStyle = ink('#e0782e'); D.poly(g, [[0, 1.98], [0.22, 1.94], [0, 1.92]]); g.fillStyle = ink('#24222a', 'print'); for (const [x, y] of [[-0.1, 2.05], [0.1, 2.05], [0, 1.45], [0, 1.28], [0, 1.11]]) D.ell(g, x, y, 0.035, 0.035); }, { shadowColor: SH });
      P.innerShade('#3a4470', { alpha: 0.35, blurPx: 10 }); }],
  hare: () => [P2.fromDrawing((g) => { D.ell(g, 0, 0.32, 0.36, 0.3); D.ell(g, 0.26, 0.62, 0.17, 0.15); D.ell(g, 0.2, 0.92, 0.05, 0.2, -0.15); D.ell(g, 0.3, 0.9, 0.05, 0.19, 0.2); D.ell(g, -0.36, 0.38, 0.09, 0.08); }, { w: 1.0, h: 1.15, name: 'hare' }),
    (P) => { P.gradient('#ffffff', '#d8dde9', 0.4); P.felt(0.5); P.draw((g) => { g.fillStyle = '#2a2428'; g.beginPath(); g.arc(0.32, 0.65, 0.025, 0, 7); g.fill(); g.fillStyle = '#e8a8a8'; g.beginPath(); g.ellipse(0.2, 0.93, 0.02, 0.12, -0.15, 0, 7); g.fill(); }); P.innerShade('#3a4470', { alpha: 0.35, blurPx: 6 }); }],
};

// ---- 6. the cottage: a box fold with a hole for the door, a door on its own hinge, a lit hall behind it ---------------
function logs(P, x0, x1, y0, y1, h = 0.38) {
  P.parts((g, ink) => { for (let k = 0, y = y0; y < y1; k++, y += h) { g.fillStyle = ink(k % 2 ? C.wood : C.woodB); D.rect(g, x0 - 0.1, y + 0.02, x1 - x0 + 0.2, h - 0.04, h * 0.45); } }, { shadowColor: SH, depth: 0.7 });
  P.draw((g) => { g.strokeStyle = P2.rgba('#4a2814', 0.45); g.lineWidth = 0.015; for (let y = y0 + h * 0.5; y < y1; y += h) { g.beginPath(); for (let x = x0; x < x1; x += 0.6) { g.moveTo(x, y + 0.02 * Math.sin(x * 7)); g.lineTo(x + 0.35, y + 0.02 * Math.sin(x * 7 + 1)); } g.stroke(); } });
}
function windowAt(P, cx, y0, w, h, { curtains = false, box = false } = {}) {
  const x0 = cx - w / 2;
  P.parts((g, ink) => { g.fillStyle = ink(C.frame); D.rect(g, x0 - 0.14, y0 - 0.14, w + 0.28, h + 0.28, 0.04); g.fillStyle = ink(C.window); D.rect(g, x0, y0, w, h); }, { shadowColor: SH });
  P.draw((g) => { const gr = g.createRadialGradient(cx, y0 + h * 0.45, 0, cx, y0 + h * 0.45, Math.max(w, h) * 0.7); gr.addColorStop(0, '#fff0c0'); gr.addColorStop(1, '#f6a64a'); g.fillStyle = gr; g.fillRect(x0, y0, w, h); });
  const curt = (g) => { for (const s of [-1, 1]) { const xe = cx + s * w / 2; g.beginPath(); g.moveTo(xe, y0 + h); g.lineTo(xe - s * w * 0.3, y0 + h); g.quadraticCurveTo(xe - s * w * 0.12, y0 + h * 0.5, xe - s * w * 0.22, y0); g.lineTo(xe, y0); g.closePath(); g.fill(); } };
  P.glow((g) => { g.fillRect(x0, y0, w, h); if (curtains) { g.fillStyle = '#000'; curt(g); } });
  if (curtains) P.parts((g, ink) => { g.fillStyle = ink('#a8443c'); curt(g); }, { shadowColor: SH, depth: 0.5 });
  P.parts((g, ink) => { g.fillStyle = ink(C.frame); D.rect(g, cx - 0.05, y0, 0.1, h); D.rect(g, x0, y0 + h * 0.55 - 0.05, w, 0.1); }, { shadowColor: SH, depth: 0.5 });
  P.parts((g, ink) => { g.fillStyle = ink('#5a3420'); D.rect(g, x0 - 0.24, y0 - 0.26, w + 0.48, 0.14, 0.03); if (box) { g.fillStyle = ink('#6a3c24'); D.rect(g, x0 - 0.1, y0 - 0.62, w + 0.2, 0.36, 0.04); g.fillStyle = ink(C.wreath); for (let i = 0; i < 6; i++) D.ell(g, x0 + 0.05 + i * (w / 5.2), y0 - 0.24, 0.16, 0.12); }
    g.fillStyle = ink(C.snowHi); D.rect(g, x0 - 0.26, y0 - 0.14, w + 0.52, 0.1, 0.05); for (let i = 0; i < 7; i++) D.ell(g, x0 - 0.16 + i * (w + 0.32) / 6, y0 - 0.1, 0.11, 0.07); }, { shadowColor: SNOWSH });
}
const paintFront = (P) => {
  const { box } = P, dx0 = DOOR.u - DOOR.w / 2, dx1 = DOOR.u + DOOR.w / 2;
  P.fill(C.woodDark);
  logs(P, box.x0, box.x1, 0.45, box.y1 - 0.1);
  P.parts((g, ink) => { for (let y = 0.45 + 0.19; y < box.y1 - 0.1; y += 0.38) { g.fillStyle = ink('#c08a5a'); D.ell(g, box.x0 + 0.17, y, 0.17, 0.165); D.ell(g, box.x1 - 0.17, y, 0.17, 0.165); } }, { shadowColor: SH, depth: 0.6 });
  P.draw((g) => { g.strokeStyle = '#8a5a36'; g.lineWidth = 0.02; for (let y = 0.45 + 0.19; y < box.y1 - 0.1; y += 0.38) for (const x of [box.x0 + 0.17, box.x1 - 0.17]) { g.beginPath(); g.arc(x, y, 0.08, 0, 7); g.stroke(); } });
  P.parts((g, ink) => { for (let i = 0, x = box.x0; x < box.x1; i++, x += 0.62) { g.fillStyle = ink(i % 2 ? C.stone : P2.shade(C.stone, -0.08)); D.rect(g, x + 0.02, 0.02, 0.58, 0.44, 0.1); } }, { shadowColor: SH, depth: 0.6 });
  windowAt(P, -2.25, 1.55, 2.0, 2.0, { curtains: true, box: true });
  windowAt(P, 3.5, 1.9, 0.85, 1.5);
  // the door frame and a little snowy hood over it, the lantern on its bracket beside it
  P.parts((g, ink) => {
    g.fillStyle = ink(C.frame); D.rect(g, dx0 - 0.2, 0.04, 0.2, DOOR.h + 0.2); D.rect(g, dx1, 0.04, 0.2, DOOR.h + 0.2); D.rect(g, dx0 - 0.2, DOOR.h, DOOR.w + 0.4, 0.22);
    g.fillStyle = ink('#5a3020'); D.poly(g, [[dx0 - 0.45, DOOR.h + 0.22], [dx1 + 0.45, DOOR.h + 0.22], [dx1 + 0.2, DOOR.h + 0.62], [dx0 - 0.2, DOOR.h + 0.62]]);
    g.fillStyle = ink(C.iron); D.rect(g, -0.42, 3.62, 0.3, 0.06); D.rect(g, -0.42, 2.9, 0.06, 0.78);
  }, { shadowColor: SH });
  P.layer((g) => { D.rect(g, dx0 - 0.5, DOOR.h + 0.55, DOOR.w + 1.0, 0.16, 0.08); for (let i = 0; i < 6; i++) D.ell(g, dx0 - 0.35 + i * (DOOR.w + 0.7) / 5, DOOR.h + 0.66, 0.2, 0.12); }, C.snowHi, { lip: 1, shadowColor: SNOWSH });
  P.parts((g, ink) => { g.fillStyle = ink(C.iron); D.rect(g, -0.3, 2.95, 0.36, 0.6, 0.04); D.poly(g, [[-0.36, 3.5], [-0.12, 3.75], [0.12, 3.5]]); g.fillStyle = ink(C.glass); D.rect(g, -0.24, 3.0, 0.24, 0.48, 0.02); }, { shadowColor: SH });
  P.glow((g) => g.fillRect(-0.24, 3.0, 0.24, 0.48));
  // snow banked at the foot of the wall, broken at the door
  P.layer((g) => { for (const [a, b] of [[box.x0 - 0.1, dx0 - 0.25], [dx1 + 0.25, box.x1 + 0.1]]) { g.beginPath(); g.moveTo(a, -0.1); for (let x = a; x <= b; x += 0.3) g.lineTo(x, 0.4 + 0.14 * Math.sin(x * 2.3) + 0.08 * Math.sin(x * 5.1)); g.lineTo(b, -0.1); g.closePath(); g.fill(); } }, C.snowHi, { lip: 1, shadowColor: SNOWSH, depth: 1.2 });
  P.felt(0.35); P.innerShade('#141634', { alpha: 0.32, blurPx: 14 });
};
const paintGable = (P) => {
  const { box } = P, mx = (box.x0 + box.x1) / 2, wallH = HOUSE.wallH;
  P.fill(C.woodDark);
  logs(P, box.x0, box.x1, 0.45, wallH - 0.05);
  P.parts((g, ink) => { for (let i = 0, x = box.x0 + 0.05; x < box.x1 - 0.1; i++, x += 0.36) { g.fillStyle = ink(i % 2 ? '#a8683a' : '#9a5c34'); D.rect(g, x, wallH, 0.32, HOUSE.roofH + 0.3); } }, { shadowColor: SH, depth: 0.6 });
  P.parts((g, ink) => { for (let i = 0, x = box.x0; x < box.x1; i++, x += 0.62) { g.fillStyle = ink(i % 2 ? C.stone : P2.shade(C.stone, -0.08)); D.rect(g, x + 0.02, 0.02, 0.58, 0.44, 0.1); } }, { shadowColor: SH, depth: 0.6 });
  windowAt(P, mx, 2.0, 1.1, 1.4, { curtains: true });
  P.parts((g, ink) => { g.fillStyle = ink(C.frame); D.ell(g, mx, wallH + 1.25, 0.46, 0.46); g.fillStyle = ink(C.window); D.ell(g, mx, wallH + 1.25, 0.34, 0.34); }, { shadowColor: SH });
  P.glow((g) => { g.beginPath(); g.arc(mx, wallH + 1.25, 0.34, 0, 7); g.fill(); });
  P.layer((g) => { g.beginPath(); g.moveTo(box.x0 - 0.1, -0.1); for (let x = box.x0; x <= box.x1; x += 0.3) g.lineTo(x, 0.45 + 0.15 * Math.sin(x * 2.1)); g.lineTo(box.x1 + 0.1, -0.1); g.closePath(); g.fill(); }, C.snowHi, { lip: 1, shadowColor: SNOWSH, depth: 1.2 });
  P.felt(0.35); P.innerShade('#141634', { alpha: 0.32, blurPx: 14 });
};
const paintRoof = (P) => {
  const { box } = P, y0 = box.y0 + box.h * 0.11;
  P.fill(C.roof); P.marks('scallop', { color: P2.shade(C.roof, -0.35), alpha: 0.6, size: 0.09 });
  P.layer((g) => {
    g.beginPath(); g.moveTo(box.x0 - 1, box.y1 + 1); g.lineTo(box.x1 + 1, box.y1 + 1); g.lineTo(box.x1 + 1, y0);
    const n = Math.round(box.w / 0.5);
    for (let i = 1; i <= n; i++) { const x = box.x1 - box.w * i / n, drip = i % 3 === 1 ? 0.32 : i % 3 === 2 ? 0.12 : 0.2; g.quadraticCurveTo(x + box.w / n / 2, y0 - drip * 1.4, x, y0 + 0.04 * Math.sin(i)); }
    g.lineTo(box.x0 - 1, box.y1 + 1); g.closePath(); g.fill();
  }, C.roofSnow, { lip: 1, shade: 1, shadowColor: 'rgba(30,40,100,0.55)', depth: 1.8 });
  P.draw((g) => { for (let i = 0; i < 9; i++) { const x = box.x0 + (i + 0.5) * box.w / 9, y = y0 + box.h * (0.25 + 0.5 * ((i * 37) % 10) / 10); const gr = g.createRadialGradient(x, y, 0, x, y, box.h * 0.3); gr.addColorStop(0, 'rgba(160,172,210,0.22)'); gr.addColorStop(1, 'rgba(160,172,210,0)'); g.fillStyle = gr; g.fillRect(x - box.h * 0.3, y - box.h * 0.3, box.h * 0.6, box.h * 0.6); } });
  P.marks('dot', { color: '#ffffff', alpha: 0.6, size: 0.03, density: 0.4, region: { ...box, y0 } });
  P.innerShade('#28305a', { alpha: 0.22, blurPx: 10 });
};
const paintDoor = (P) => {
  const { box } = P, cx = (box.x0 + box.x1) / 2;
  P.fill(C.door); P.marks('stripe', { color: P2.shade(C.door, -0.25), alpha: 0.35, size: 0.16, angle: Math.PI / 2 });
  P.parts((g, ink) => { g.fillStyle = ink(P2.shade(C.door, 0.08)); D.rect(g, box.x0 + 0.2, 0.3, box.w - 0.4, 1.5, 0.06); D.rect(g, box.x0 + 0.2, 2.0, box.w - 0.4, 1.0, 0.06); g.fillStyle = ink(C.frame); D.rect(g, box.x0 + 0.3, 3.2, box.w - 0.6, 0.8, 0.3); g.fillStyle = ink(C.window); D.rect(g, box.x0 + 0.38, 3.28, box.w - 0.76, 0.64, 0.26); }, { shadowColor: SH, depth: 0.6 });
  P.glow((g) => { g.beginPath(); g.roundRect(box.x0 + 0.38, 3.28, box.w - 0.76, 0.64, 0.26); g.fill(); });
  P.draw((g) => { g.fillStyle = C.frame; g.fillRect(cx - 0.03, 3.28, 0.06, 0.64); });
  P.draw((g, PP) => { g.fillStyle = C.wreath; for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; P2.fillLeaf(g, cx + Math.cos(a) * 0.42, 2.45 + Math.sin(a) * 0.42, 0.2, a + Math.PI / 2 + (i % 2 ? 0.4 : -0.4), 0.38); } g.fillStyle = '#5a8a62'; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + 0.2; P2.fillLeaf(g, cx + Math.cos(a) * 0.42, 2.45 + Math.sin(a) * 0.42, 0.14, a, 0.38); } void PP; });
  P.parts((g, ink) => { g.fillStyle = ink(C.berry); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.3; D.ell(g, cx + Math.cos(a) * 0.44, 2.45 + Math.sin(a) * 0.44, 0.05, 0.05); } D.poly(g, [[cx, 2.05], [cx - 0.22, 1.92], [cx - 0.2, 2.12]]); D.poly(g, [[cx, 2.05], [cx + 0.22, 1.92], [cx + 0.2, 2.12]]); g.fillStyle = ink('#e8c25a'); D.ell(g, box.x1 - 0.22, 1.9, 0.07, 0.07); }, { shadowColor: SH, depth: 0.5 });
  P.innerShade('#1c0a10', { alpha: 0.35, blurPx: 8 });
};
const paintHall = (P) => {
  const { box } = P, cx = (box.x0 + box.x1) / 2;
  P.gradient('#f6c27a', '#d27e42', 0); P.marks('dot', { color: '#fbe0a8', alpha: 0.55, size: 0.07, density: 0.6 });
  P.parts((g, ink) => { g.fillStyle = ink('#7a4228'); D.rect(g, box.x0 - 0.1, 0, box.w + 0.2, 1.5); g.fillStyle = ink('#5a3020'); D.rect(g, cx - 1.0, 2.2, 1.0, 0.8, 0.03); g.fillStyle = ink('#9fb6c9'); D.rect(g, cx - 0.92, 2.28, 0.84, 0.64); g.fillStyle = ink('#e8eef6'); D.poly(g, [[cx - 0.92, 2.28], [cx - 0.6, 2.62], [cx - 0.4, 2.45], [cx - 0.08, 2.75], [cx - 0.08, 2.28]]);
    g.fillStyle = ink('#c8a050'); D.rect(g, cx + 0.55, 3.0, 0.12, 0.35); g.fillStyle = ink('#fff2c8'); D.ell(g, cx + 0.61, 3.5, 0.2, 0.17);
    g.fillStyle = ink('#6a3a22'); D.rect(g, cx + 0.1, 1.05, 1.0, 0.12); D.rect(g, cx + 0.18, 0, 0.08, 1.06); D.rect(g, cx + 0.94, 0, 0.08, 1.06); g.fillStyle = ink('#3e6a4c'); D.ell(g, cx + 0.62, 1.45, 0.2, 0.28); g.fillStyle = ink('#c8584a'); D.rect(g, cx + 0.5, 1.16, 0.24, 0.24, 0.05); }, { shadowColor: 'rgba(90,40,10,0.4)' });
  P.glow((g) => { g.fillStyle = 'rgba(255,255,255,0.42)'; g.fillRect(box.x0, 1.5, box.w, box.h); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx + 0.61, 3.5, 0.2, 0.17, 0, 0, 7); g.fill(); });
  P.innerShade('#5a2a10', { alpha: 0.4, blurPx: 16 });
};
const paintFloor = (P) => { const { box } = P; P.fill('#a8683e'); P.marks('stripe', { color: '#7a4428', alpha: 0.45, size: 0.22, angle: Math.PI / 2 }); P.parts((g, ink) => { g.fillStyle = ink('#9a3a34'); D.rect(g, box.x0 + 0.5, box.y0 + 0.4, box.w - 1.0, box.h - 0.8, 0.1); g.fillStyle = ink('#d8b070', 'print'); D.rect(g, box.x0 + 0.62, box.y0 + 0.52, box.w - 1.24, 0.05); D.rect(g, box.x0 + 0.62, box.y1 - 0.57, box.w - 1.24, 0.05); }, { shadowColor: 'rgba(60,20,10,0.4)' }); P.glow((g) => { g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(box.x0, box.y0, box.w, box.h); }); P.innerShade('#3a1a08', { alpha: 0.4, blurPx: 12 }); };

const HOUSE_PARTS = {};
function buildHouse() {
  const { w, d, wallH, roofH, ov } = HOUSE, dx0 = DOOR.u - DOOR.w / 2, dx1 = DOOR.u + DOOR.w / 2;
  const print = H.cardOpts(HOUSE.x, HOUSE.z);
  const node = boxFold({ w, d, wallH, roofH, overhang: ov, paper: H.paper, seed: 71, paints: { front: paintFront, gable: paintGable, roof: paintRoof },
    holes: { front: [[[dx0, 0.06], [dx1, 0.06], [dx1, DOOR.h], [dx0, DOOR.h]]] }, print });
  // the chimney on the ridge frame (it rides the roof and folds flat with it), stone with a snow cap
  const cw = 0.9, chH = roofH * 0.7;
  const ch = makeCard(P2.shape.rect(cw, chH), { paper: H.paper, thickness: 0.08, edgeWidth: 0.06, back: 'kraft', seed: 83, folds: ['bottom'], pxPerUnit: print.pxPerUnit,
    paint: (P) => { P.gradient(P2.shade(C.stone, 0.05), P2.shade(C.stone, -0.2), 0.5); P.marks('brick', { color: '#3a3c50', alpha: 0.5, size: 0.12 }); P.layer((g) => { D.rect(g, P.box.x0 - 0.1, P.box.y1 - 0.22, P.box.w + 0.2, 0.3); for (let i = 0; i < 4; i++) D.ell(g, P.box.x0 + i * P.box.w / 3, P.box.y1 - 0.2, 0.14, 0.1); }, C.snowHi, { lip: 1, shadowColor: SNOWSH }); P.innerShade('#141634', { alpha: 0.3, blurPx: 6 }); } });
  ch.position.set(-w * 0.26, -roofH * 0.2, 0); node.userData.ridge.add(ch);
  HOUSE_PARTS.chimneyTop = { object: ch, offset: [0, chH * 1.02, 0] };
  // the lit hall behind the door and its floor (both under the page while the house lies folded)
  const hall = makeCard(P2.shape.rect(3.4, 4.9), { paper: H.paper, thickness: 0.08, edgeWidth: 0.04, seed: 85, folds: ['bottom'], pxPerUnit: 44, paint: paintHall });
  hall.position.set(DOOR.u, 0, -2.5); node.add(hall);
  const floor = makeCard(P2.shape.rect(3.2, 2.45), { paper: H.paper, thickness: 0.06, edgeWidth: 0.0, seed: 86, folds: [], pxPerUnit: 40, paint: paintFloor });
  floor.rotation.x = -Math.PI / 2; floor.position.set(DOOR.u, 0.035, -0.05); node.add(floor);
  // the door: a card on a vertical hinge at the door's left jamb, a hair proud of the wall
  const doorPivot = new THREE.Group(); doorPivot.position.set(dx0 + 0.03, 0.08, 0.1); node.add(doorPivot);
  const leaf = makeCard(P2.shape.rect(DOOR.w - 0.08, DOOR.h - 0.1), { paper: H.paper, thickness: 0.08, edgeWidth: 0.05, seed: 87, folds: [], pxPerUnit: 56, paint: paintDoor, back: (P) => { P.fill('#5a2622'); P.marks('stripe', { color: '#3a1614', alpha: 0.35, size: 0.16, angle: Math.PI / 2 }); P.innerShade('#1c0a10', { alpha: 0.35, blurPx: 8 }); } });
  leaf.position.set((DOOR.w - 0.08) / 2, 0, 0); leaf.name = 'door'; doorPivot.add(leaf);
  const h = H.popup(null, null, { node, height: wallH + roofH, x: HOUSE.x, z: HOUSE.z, yaw: HOUSE.yaw, solid: 3.4 });
  H.glowing(h.group);
  Object.assign(HOUSE_PARTS, { node, handle: h, doorPivot, hall });
  return h;
}

// ---- 7. placement helpers ------------------------------------------------------------------------------------------------
const shotCams = [0.05, 1.7, 3.35, 3.45, 5.1, 6.75, 6.85, 8.4, 10].map((t) => {
  const c = camAt(t), cam = new THREE.PerspectiveCamera(26, 16 / 9, 1, 600);
  cam.position.set(...camPos(c)); cam.lookAt(...c.tg); cam.updateMatrixWorld(); cam.updateProjectionMatrix(); return cam;
});
const _v = new THREE.Vector3();
const inShots = (x, z, m = 0.1, y = 1) => shotCams.some((cam) => { _v.set(x, y, z).project(cam); return _v.z < 1 && Math.abs(_v.x) < 1 + 2 * m && _v.y > -1 - m && _v.y < 1 + m; });
const pathDist = (x, z) => PATH.dist(x, z);
const keepOut = [], mark = (x, z, r) => keepOut.push([x, z, r]);
// the yard the two walk and stand in, and the line of sight from the close shot to them: low things only there
const inYard = (x, z) => { const [u, v] = W2L(x, z); return u > -0.4 && u < 4.4 && v > -0.5 && v < 5.2; };
const inSight = (x, z) => { const [u, v] = W2L(x, z); return v >= 5.2 && v < 17 && u > -1.6 - (v - 5) * 0.12 && u < 5.0 + (v - 5) * 0.2; };
const inHouse = (x, z, m = 0) => { const [u, v] = W2L(x, z); return Math.abs(u) < HOUSE.w / 2 + 0.6 + m && v > -HOUSE.d - 0.8 - m && v < 0.9 + m; };
const free = (x, z, m = 0) => !inHouse(x, z, m) && !inYard(x, z) && pathDist(x, z) > 1.6 + m && !inPond(x, z, 1.08) && keepOut.every(([kx, kz, r]) => Math.hypot(x - kx, z - kz) > r + m);
const at = (u, v) => L2W(u, v);
const pop = (pts, paint, o) => H.popup(pts, paint, o);
const late = [];   // drifts that rise slowly through the film (the snow piling up); not part of the opening rise
function slowSail(x, z, { w = 3, h = 1.2, n = 2, yaw = null, t0 = 4, dur = 2.6, col = C.snowHi } = {}) {
  const layers = Array.from({ length: n }, (_, k) => ({ pts: P2.roughen(peak(w * (1 - k * 0.12), h * (1 - k * 0.2), 0.15 + (k % 2 ? 0.1 : -0.05)), rnd).map(([px, py]) => [px + (k - 1) * w * 0.1, py]), paint: paintDrift(P2.shade(col, -0.1 + k * 0.08)), z: k * 0.32 }));
  const node = layeredCard(layers, { ...H.cardOpts(x, z), back: 'kraft' });
  const grp = new THREE.Group(), pivot = new THREE.Group(); grp.position.set(x, 0.015, z);
  grp.rotation.y = yaw ?? Math.atan2(shotCams[4].position.x - x, shotCams[4].position.z - z); grp.add(pivot); pivot.add(node); H.scene.add(grp);
  late.push({ pivot, t0, dur, x, z }); mark(x, z, w * 0.45);
}

// ---- 8. the world -------------------------------------------------------------------------------------------------------
const PINES = [0, 1, 2, 3, 4].map((k) => { const [pts, paint] = K.pine(k); return { pts, materials: H.printed(pts, paint, { cross: true }) }; });
// nothing tall between the medium and close cameras and the couple (a soft edge pine at the frame's side is fine)
const COUPLE = new THREE.Vector3(-0.65, 1.6, -6.8);
const blocksCouple = (x, z, h) => shotCams.slice(3).some((cam) => [0.4, 0.5 * h, h].some((y) => {
  _v.set(x, y, z); const d = _v.distanceTo(cam.position); _v.project(cam);
  return _v.z < 1 && Math.abs(_v.x) < 0.82 && Math.abs(_v.y) < 1 && d < COUPLE.distanceTo(cam.position) - 1.5;
}));
const pine = (x, z, { k = Math.floor(rnd() * 5), scale = 1, sway = 0.25 } = {}) => { const P = PINES[k]; if (blocksCouple(x, z, 9 * scale)) return null; mark(x, z, 1.6 * scale); return pop(P.pts, null, { x, z, cross: true, materials: P.materials, scale, sway }); };
const LIFE = { chimneys: [] };
let FIG = null;
function buildWorld() {
  buildHouse(); LIFE.chimneys.push(HOUSE_PARTS.chimneyTop);
  // beside the cottage: a woodpile at the gable, berry bushes at the front corners, a sled, the lamp post, lanterns
  { const [x, z] = at(-5.6, -2.2); pop(...K.woodpile(), { x, z, yaw: HOUSE.yaw - 0.35, scale: 1.1 }); mark(x, z, 1.6); }
  for (const [u, v, s] of [[-3.6, 1.6, 0.9], [-5.6, 0.6, 0.75], [5.0, 1.2, 0.85]]) { const [x, z] = at(u, v), w = 3.6;
    pop(null, null, { node: layeredCard([{ pts: P2.roughen(mound(w, w * 0.45, 6, 0.2), rnd), paint: paintBushBack }, { pts: P2.roughen(mound(w * 0.72, w * 0.32, 5, 0.14), rnd), paint: paintBushFront, z: 0.35 }], H.cardOpts(x, z, s)), height: w * 0.45, x, z, yaw: HOUSE.yaw + (rnd() - 0.5) * 0.4, scale: s }); mark(x, z, 1.8 * s); }
  { const [x, z] = at(5.9, 3.3); pop(...K.sled(), { x, z, yaw: HOUSE.yaw - 0.3 }); mark(x, z, 1.6); }
  { const [x, z] = at(4.5, 4.7); pop(...K.lampPost(), { x, z, yaw: HOUSE.yaw - 0.1, scale: 1.0 }); lamp(x, 3.9, z + 0.3, 1.0, 13); mark(x, z, 0.8); H.spots.lamp = [x, z]; }
  for (const [u, v] of [[0.4, 6.0], [5.2, 9.2]]) { const [x, z] = at(u, v); pop(...K.lantern(), { x, z, yaw: HOUSE.yaw + (rnd() - 0.5) * 0.3 }); lamp(x, 1.0, z + 0.2, 0.32, 6); mark(x, z, 0.6); }
  { const [x, z] = at(7.0, 10.6); pop(...K.mailbox(), { x, z, yaw: HOUSE.yaw - 0.2 }); mark(x, z, 0.8); }
  { const [x, z] = at(-7.2, 7.4); pop(...K.snowman(), { x, z, yaw: HOUSE.yaw + 0.25, scale: 1.05 }); mark(x, z, 1.2); }
  { const [x, z] = at(-2.6, 6.4); pop(...K.hare(), { x, z, yaw: HOUSE.yaw + 0.6, scale: 0.9 }); mark(x, z, 0.6); }
  // the low fence across the front of the garden, a gap where the path runs out
  for (const u of [-14.3, -8.9, -3.5]) { const [x, z] = at(u, 11.2); pop(...K.fence(), { x, z, yaw: HOUSE.yaw + (rnd() - 0.5) * 0.08 }); mark(x, z, 2.6); }
  for (const u of [10.2, 15.6]) { const [x, z] = at(u, 11.6); pop(...K.fence(), { x, z, yaw: HOUSE.yaw - 0.1 }); mark(x, z, 2.6); }
  // pines: a stand behind the cottage, groups at both sides, two birches, rocks
  for (const [u, v, k, s] of [[-7.4, -6.8, 2, 1.15], [-10.2, -3.2, 1, 1.05], [-9.4, 1.4, 0, 0.9], [-12.6, -0.6, 3, 1.0], [-1.6, -10.5, 2, 1.25], [3.8, -11.2, 1, 1.15], [8.4, -7.6, 0, 1.05],
    [8.6, -2.0, 4, 0.95], [10.6, 1.8, 3, 1.0], [11.4, -4.2, 2, 1.1], [9.2, 6.6, 4, 0.85], [-14.6, 4.2, 1, 0.95], [-5.8, -12.5, 0, 1.1], [12.8, 8.5, 0, 0.9]]) {
    const [x, z] = at(u, v); pine(x, z, { k, scale: s });
  }
  for (const [u, v] of [[-6.4, 3.4], [7.6, 5.4]]) { const [x, z] = at(u, v); pop(...K.birch(), { x, z, cross: true, sway: 0.2 }); mark(x, z, 1.2); }
  for (const [u, v, s] of [[-4.6, 4.6, 1.0], [6.8, 8.0, 0.8], [-11.8, 7.6, 1.1], [3.0, -8.0, 0.0]]) { if (!s) continue; const [x, z] = at(u, v); pop(...K.rock(), { x, z, scale: s }); mark(x, z, 1.2 * s); }
  // drifts that stand from the start (nested sails), and the ones that pile up slowly through the film
  for (const [u, v, w, h] of [[-8.6, 9.2, 4.2, 1.6], [13.5, 4.0, 4.6, 1.8], [-13.6, -5.4, 4.0, 1.8]]) { const [x, z] = at(u, v);
    H.stack(x, z, Array.from({ length: 3 }, (_, k) => ({ pts: P2.roughen(peak(w * (1 - k * 0.12), h * (1 - k * 0.2), 0.18), rnd), paint: paintDrift(P2.shade(C.snowMid, -0.12 + k * 0.08)), d: k * 0.4, dx: (k - 1) * 0.3 }))); mark(x, z, w * 0.5); }
  for (const [u, v, w, h, t0] of [[-2.2, 1.1, 2.4, 0.75, 3.9], [-1.4, 7.2, 3.0, 0.9, 4.6], [6.6, 6.2, 2.8, 1.0, 5.2], [-4.8, 3.0, 2.6, 0.9, 6.0], [4.0, 9.4, 2.6, 0.8, 6.9], [-0.4, 9.0, 2.2, 0.7, 7.6]]) {
    const [x, z] = at(u, v); slowSail(x, z, { w, h, t0, dur: 2.8 });
  }
  // far snowy hills along the top of the wide shot
  for (const [x, z] of [[-30, -40], [2, -44], [30, -40]]) for (let k = 0; k < 3; k++) pop(P2.roughen(peak(16 - k * 2.4, 9 - k * 2, 0.1 + k * 0.08), rnd), paintDrift(P2.shade(C.hill, -0.12 + k * 0.1)), { x: x + (k - 1) * 1.2, z: z + k * 1.5 });
  // the figures stand behind the closed door; they are shown once the cottage stands round them
  FIG = buildFigures(H);
  for (const f of [FIG.lady, FIG.butler]) { H.scene.add(f); f.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }

  // the fill: pines and small groups wherever any shot can see, away from the yard, the path and the line of sight
  rnd = P2.rng(202);
  const cellSeed = (gx, gz, salt) => (Math.imul(Math.round(gx * 10), 73856093) ^ Math.imul(Math.round(gz * 10), 19349663) ^ Math.imul(salt, 83492791)) >>> 0;
  const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
  const lush = (x, z) => 0.5 + 0.26 * Math.sin(x * 0.13 + ph[0]) * Math.sin(z * 0.15 + ph[1]) + 0.18 * Math.sin(x * 0.21 + z * 0.17 + ph[2]);
  const placed = [];
  for (let gz = -46; gz <= 22; gz += 3.0) for (let gx = -46; gx <= 44; gx += 3.0) {
    rnd = P2.rng(cellSeed(gx, gz, 19));
    const x = gx + (rnd() - 0.5) * 2.4, z = gz + (rnd() - 0.5) * 2.4, l = lush(x, z);
    if (!inShots(x, z, 0.12, 2) || !free(x, z, 0.4) || placed.some(([px, pz]) => Math.hypot(x - px, z - pz) < 2.8)) continue;
    placed.push([x, z]);
    const low = inSight(x, z);
    if (!low && l > 0.5) pine(x, z, { k: Math.floor(rnd() * 5), scale: 0.75 + rnd() * 0.45 });
    else if (l > 0.32) {
      const r2 = rnd();
      if (r2 < 0.35) pop(...K.rock(), { x, z, scale: 0.7 + rnd() * 0.5 });
      else if (r2 < 0.7 || low) { const w = 3.2 * (0.6 + rnd() * 0.4); pop(null, null, { node: layeredCard([{ pts: P2.roughen(mound(w, w * 0.45, 6, 0.2), rnd), paint: paintBushBack }, { pts: P2.roughen(mound(w * 0.72, w * 0.32, 5, 0.14), rnd), paint: paintBushFront, z: 0.35 }], H.cardOpts(x, z)), height: w * 0.45, x, z }); }
      else H.stack(x, z, [0, 1].map((k) => ({ pts: P2.roughen(peak(3.2 - k * 0.5, 1.3 - k * 0.3, 0.2), rnd), paint: paintDrift(P2.shade(C.snowMid, -0.1 + k * 0.08)), d: k * 0.35 })));
    }
  }
  // big, soft pieces over the bottom edge of the wide and the close shot sell the miniature scale
  rnd = P2.rng(303);
  for (const [cam, spots] of [[shotCams[0], [[-0.95, 5, 1.7], [0.98, 6, 1.8]]]]) {
    for (const [sx, dz, s] of spots) {
      cam.updateMatrixWorld(); const ray = new THREE.Raycaster(); ray.setFromCamera({ x: sx, y: -1 }, cam);
      const p = new THREE.Vector3(); if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p)) continue;
      const x = p.x, z = p.z + dz;
      if (inSight(x, z) || inYard(x, z)) continue;
      pine(x, z, { k: Math.floor(rnd() * 5), scale: s });
    }
  }
}

if (flags.TEST) {
  buildHouse();
  FIG = buildFigures(H);
  for (const f of [FIG.lady, FIG.butler]) H.scene.add(f);
  pine(...at(-8, -2), { k: 1 });
  pop(...K.lampPost(), { x: at(4.5, 4.7)[0], z: at(4.5, 4.7)[1] });
} else buildWorld();

// ---- 9. the choreography: pure functions of time -----------------------------------------------------------------------
// keyed values with eased segments (zero speed at every key: calm), positions in the cottage frame
const keys = (t, K) => { if (t <= K[0][0]) return K[0][1]; for (let i = 0; i < K.length - 1; i++) if (t < K[i + 1][0]) { const k = sm(K[i][0], K[i + 1][0], t), a = K[i][1], b = K[i + 1][1]; return Array.isArray(a) ? a.map((v, j) => lerp(v, b[j], k)) : lerp(a, b, k); } return K[K.length - 1][1]; };
const LADY = {
  pos: [[0, [1.3, -1.55]], [3.95, [1.3, -1.55]], [4.85, [1.2, 1.15]], [5.6, [1.1, 2.9]]],
  yaw: [[0, 0], [3.95, 0], [4.3, -0.05], [5.55, 0], [5.75, 0.55], [6.3, 0.55], [6.65, 0.12]],
  arms: [[0, [[0, 0], [0, 0]]], [4.35, [[0, 0], [0, 0]]], [4.75, [[0, 0], [-0.35, 0.32]]], [5.5, [[0, 0], [-0.35, 0.32]]], [5.7, [[-0.15, 0], [-0.25, 0.1]]], [6.4, [[-0.15, 0], [-0.25, 0.1]]], [6.7, [[0, 0], [-0.08, 0.05]]],
    [7.0, [[0, 0], [-0.08, 0.05]]], [7.65, [[-1.05, -0.85], [-0.08, 0.05]]]],
  hold: [[0, [0, 0]], [4.4, [0, 0]], [4.7, [0, 1]], [5.5, [0, 1]], [6.7, [1, 1]]],
  head: [[0, [0, 0]], [5.6, [0, 0]], [5.8, [-0.06, 0.08]], [6.4, [-0.06, 0.08]], [6.8, [0, 0]], [7.35, [0.13, -0.1]], [7.95, [0.13, -0.1]], [8.5, [-0.2, 0.02]]],
};
const BUTLER = {
  pos: [[0, [1.95, -0.7]], [3.45, [1.95, -0.7]], [4.1, [2.65, 1.45]], [4.75, [2.75, 1.65]], [5.55, [2.75, 3.2]], [5.75, [2.5, 3.1]], [6.3, [2.5, 3.1]], [6.7, [2.75, 3.2]]],
  yaw: [[0, 0], [3.45, 0], [3.6, 0.3], [4.1, 0.3], [4.45, -1.9], [4.75, -1.9], [5.0, 0.05], [5.5, 0.05], [5.72, -1.25], [6.3, -1.25], [6.7, -0.22]],
  arms: [[0, [[0, 0], [0, 0]]], [4.15, [[0, 0], [0, 0]]], [4.45, [[-0.7, -0.15], [0, 0]]], [4.85, [[0.35, -0.38], [0, 0]]], [5.5, [[0.35, -0.38], [0, 0]]], [5.75, [[-0.95, 0.05], [-0.95, -0.05]]], [6.2, [[-0.95, 0.05], [-0.95, -0.05]]], [6.65, [[0, 0], [0, 0]]],
    [7.2, [[0, 0], [0, 0]]], [7.8, [[-0.12, 0.0], [0, 0]]]],
  hold: [[0, [0, 0]], [4.15, [0, 0]], [4.4, [1, 0]], [5.55, [1, 0]], [5.7, [1, 1]], [6.3, [1, 1]], [6.7, [1, 1]]],
  head: [[0, [0, 0]], [4.1, [0, 0]], [4.4, [0.1, 0]], [4.8, [0, 0]], [5.75, [0.12, 0]], [6.3, [0.12, 0]], [6.7, [0, 0]], [7.4, [0.05, -0.3]], [8.6, [-0.08, -0.26]]],
};
// arc length walked, tabulated once (the stride's phase runs with it, so planted feet stay put)
const walkTable = (P) => { const dt = 1 / 240, n = Math.ceil(10.5 / dt), out = new Float64Array(n + 1); let prev = keys(0, P); for (let i = 1; i <= n; i++) { const p = keys(i * dt, P); out[i] = out[i - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1]); prev = p; } return (t) => { const f = clamp(t / dt, 0, n), i = Math.floor(f), j = Math.min(n, i + 1); return out[i] + (out[j] - out[i]) * (f - i); }; };
const WALK = { lady: walkTable(LADY.pos), butler: walkTable(BUTLER.pos) };
const speedAt = (P, t) => { const a = keys(t - 0.04, P), b = keys(t + 0.04, P); return Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.08; };
function poseFigure(fig, S, walked, t) {
  const [u, v] = keys(t, S.pos), [x, z] = L2W(u, v);
  fig.position.set(x, 0.02, z); fig.rotation.y = HOUSE.yaw + keys(t, S.yaw);
  const gait = clamp(speedAt(S.pos, t) / 1.4);
  fig.userData.body.rotation.x = 0.02 * gait;
  fig.userData.pose({ walked: walked(t), gait, arms: keys(t, S.arms), hold: keys(t, S.hold), head: keys(t, S.head) });
  if (gait < 0.05) fig.userData.body.position.y = 0.008 * Math.sin(t * 2.1 + (fig === FIG.lady ? 0 : 1.3));   // breathing
}
const springIn = (u) => (u <= 0 ? 0 : 1 - Math.exp(-5 * u) * Math.cos(7.2 * u));       // ~10 % overshoot, a quiver, settled by ~1
const slowRise = (u) => (u <= 0 ? 0 : clamp(sm(0, 1, u) + 0.06 * Math.sin(Math.PI * clamp((u - 0.75) / 0.5)), 0, 1.06));
const DOOR_T = 2.3, SCARF_T = 5.9, CATCH_T = 7.85;
const doorOpen = (t) => springIn((t - DOOR_T) / 0.95);

// the flakes: they land on the page or on the roof slopes; the one she catches is scripted
const roofAt = (x, z) => {
  const [u, v] = W2L(x, z), { w, d, wallH, roofH, ov } = HOUSE;
  if (Math.abs(u) > w / 2 + ov || v > ov + 0.1 || v < -d - ov - 0.1) return null;
  const s = (v + d / 2) / (d / 2), y = wallH + roofH * (1 - Math.min(1, Math.abs(s))) + 0.07;
  const n = [0, d / 2, Math.sign(s || 1) * roofH], L = Math.hypot(...n);
  return { y, n: [(n[0] * hc + n[2] * hs) / L, n[1] / L, (-n[0] * hs + n[2] * hc) / L] };
};
const landAt = (x, z) => roofAt(x, z) || { y: 0, n: [0, 1, 0] };
const flakes = createFlakes({ scene: H.scene, box: { x0: -30, x1: 24, z0: -34, z1: 12 }, top: 16, count: flags.TEST ? 60 : 900, size: [0.38, 0.85], fall: [0.95, 1.45], rest: [5, 9], wind: [0.3, 0.12], landAt });
const palm = new THREE.Mesh(flakeGeometry(0.16), flakes.material); palm.name = 'life'; palm.scale.setScalar(0.42); palm.visible = false; H.scene.add(palm);
const _hand = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
function placePalmFlake(t) {
  if (!FIG || t < 6.6) { palm.visible = false; return; }
  const arm = FIG.lady.userData.arms[0]; arm.updateWorldMatrix(true, false);
  _hand.set(0, -0.9, 0.0).applyMatrix4(arm.matrixWorld); _hand.y += 0.11;   // resting on the palm of the raised right hand
  const u = clamp((t - 6.75) / (CATCH_T - 6.75)), e = 1 - (1 - u) * (1 - u);
  const sway = (1 - e) * 0.55;
  palm.position.set(_hand.x + 0.35 * (1 - e) + Math.sin(t * 2.6) * sway, _hand.y + 3.4 * (1 - e) * (1 - e * 0.25), _hand.z - 0.2 * (1 - e) + Math.cos(t * 2.1) * sway * 0.5);
  const flat = sm(CATCH_T - 0.5, CATCH_T, t);
  _e.set(lerp(-0.8 + 0.4 * Math.sin(t * 1.7), -Math.PI / 2, flat), t * 0.6 * (1 - flat) + 0.4, lerp(0.35 * Math.sin(t * 1.3), 0, flat), 'YXZ'); palm.quaternion.setFromEuler(_e);
  palm.visible = true;
}

// ---- 10. timeline -------------------------------------------------------------------------------------------------------
H.cue(0.2, () => { for (const h of H.hinges) H.fold(h, true, 0.05 + h.order * 0.075 + h.jit); });   // the world rises, front to back
H.cue(DOOR_T, () => { const p = new THREE.Vector3(); HOUSE_PARTS.doorPivot.getWorldPosition(p); p.project(H.camera); H.recordFlap({ size: 0.55, up: true, pan: clamp(p.x, -1, 1) * 0.6, distance: 2 }); });
H.cue(SCARF_T, () => H.recordFlap({ size: 0.25, up: false, pan: 0.05, distance: 0 }));
H.cue(CATCH_T, () => H.recordFlap({ size: 0.08, up: false, pan: -0.1, distance: 0 }));
for (const L of late) H.cue(L.t0, () => H.recordFlap({ size: 0.45, up: true, pan: 0, distance: 3 }));
const steps = { lady: 0, butler: 0 };
const life = flags.TEST ? null : createLife({ scene: H.scene, camera: H.camera, heroHeight: 3.4, seed: 41, wind: [0.94, 0.34] });
if (life) { life.puffs({ at: LIFE.chimneys, perEmitter: 4, life: 5, rise: 0.4, size: [0.3, 0.6], colors: ['#dfe4f0', '#cfd6e6'], night: 1 }); life.setNight(1); life.reset(H.target); }
let lampBase = null;
H.onStep((t, dt) => {
  if (FIG) {
    const shown = t >= 1.9;
    FIG.lady.visible = FIG.butler.visible = shown;
    poseFigure(FIG.lady, LADY, WALK.lady, t); poseFigure(FIG.butler, BUTLER, WALK.butler, t);
    // the scarf: folded over his forearm, lifted flat as he raises it to her, then dropped round her neck on its hinge
    const lift = sm(SCARF_T - 0.3, SCARF_T, t);
    FIG.butler.userData.carry.rotation.x = -1.5 * lift; FIG.butler.userData.carry.visible = t < SCARF_T;
    const sp = FIG.lady.userData.scarfPivot; sp.visible = t >= SCARF_T; sp.rotation.x = -Math.PI / 2 * (1 - springIn((t - SCARF_T) / 0.7));
    // soft footsteps on the snow, one per step walked
    for (const [name, fig, walked, len] of [['lady', FIG.lady, WALK.lady, 0.62], ['butler', FIG.butler, WALK.butler, 0.78]]) {
      const n = Math.floor(walked(t) / len);
      if (n !== steps[name] && shown) { steps[name] = n; H.recordStep({ surface: 'grass', foot: n & 1, pan: clamp(_v.copy(fig.position).project(H.camera).x, -1, 1) * 0.5 }); }
    }
  }
  if (HOUSE_PARTS.doorPivot) HOUSE_PARTS.doorPivot.rotation.y = -1.95 * doorOpen(t);
  for (const L of late) L.pivot.rotation.x = (-Math.PI / 2 + 0.01) * (1 - slowRise((t - L.t0) / L.dur));
  // practical lights: the lamps of H.lamp in the order they were made; the doorway's warmth grows as the door opens
  if (H.lampLights.length) {
    lampBase ??= H.lampLights.map((P) => P.intensity);
    const k = clamp(doorOpen(t), 0, 1);
    H.lampLights.forEach((P, i) => { P.intensity = lampBase[i]; });
    if (H.spots.doorLamps) { const [a, b] = H.spots.doorLamps; H.lampLights[a].intensity = lampBase[a] * (0.15 + 0.85 * k); H.lampLights[b].intensity = lampBase[b] * (0.9 + 0.1 * Math.sin(t * 9.1) * Math.sin(t * 5.3)); }
  }
  flakes.update(t, H.camera.position);
  placePalmFlake(t);
  if (life) life.update(dt, H.target);
});
H.onRestart(() => { steps.lady = steps.butler = 0; if (life) life.reset(H.target); });
// the cottage's own lights, made last so their indices are known: the warm spill of the open doorway, the lantern
// beside the door, the big window
{
  const [ax, az] = L2W(DOOR.u, 1.1), [bx, bz] = L2W(-0.3, 0.7), [wx, wz] = L2W(-2.25, 1.0);
  H.spots.doorLamps = [nLamps, nLamps + 1];
  lamp(ax, 1.8, az, 1.5, 11); lamp(bx, 3.3, bz, 0.7, 9); lamp(wx, 2.4, wz, 0.45, 8);
}

// ---- 11. the camera: three shots, one move each -------------------------------------------------------------------------
if (!flags.TEST) H.setCameraController((t, dt, ctx) => {
  const c = camAt(t);
  ctx.target.set(...c.tg); ctx.camera.position.set(...camPos(c)); ctx.camera.lookAt(ctx.target);
  ctx.fitShadow(ctx.lights, ctx.target);
  ctx.post.o.focusBand = [0.3, 0.26, 0.18][c.shot]; ctx.post.o.ramp = [0.3, 0.28, 0.24][c.shot]; ctx.post.o.vignette = [0.34, 0.38, 0.46][c.shot];   // the band narrows as the camera closes in
  if (c.shot === 0) { const [x, z] = L2W(DOOR.u, 2.5); ctx.setFocus(x, 2.2, z); }
  else { const m = FIG ? [(FIG.lady.position.x + FIG.butler.position.x) / 2, 2.0, (FIG.lady.position.z + FIG.butler.position.z) / 2] : c.tg; ctx.setFocus(...m); }
});
const continuity = checkContinuity((t) => { const c = camAt(t); return { pos: c.tg, yaw: c.yaw * DEG, pitchDeg: c.pitch, dist: c.dist }; }, { duration: 10, fps: 30, cuts: [3.4, 6.8] });
if (!continuity.ok) console.warn('papercraft snow: camera continuity', JSON.stringify(continuity.issues.slice(0, 5)));

// the audio: the score (with the wind in it) under the paper sounds the harness logs
H.setMusicRenderer((sec, sr, from) => renderSoundtrack(sec, sr, from));
H.start();

// review hooks: the figures' card-clipping check through the film, the continuity result
window.__snow = {
  continuity,
  clips(times = [2, 3.6, 4.2, 4.6, 5.0, 5.3, 5.8, 6.0, 6.2, 6.5, 7.0, 7.5, 8.0, 8.6, 9.5]) {
    const out = [];
    for (const t of times) { poseFigure(FIG.lady, LADY, WALK.lady, t); poseFigure(FIG.butler, BUTLER, WALK.butler, t);
      FIG.lady.userData.scarfPivot.visible = t >= SCARF_T; FIG.lady.userData.scarfPivot.rotation.x = -Math.PI / 2 * (1 - springIn((t - SCARF_T) / 0.7));
      FIG.butler.userData.carry.rotation.x = -1.5 * sm(SCARF_T - 0.3, SCARF_T, t); FIG.butler.userData.carry.visible = t < SCARF_T;
      for (const f of [FIG.lady, FIG.butler]) for (const c of cardClips(f)) out.push({ t, ...c }); }
    return out;
  },
};
