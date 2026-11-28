// 第一场雪 / First Snow: the 60 s film (1920x1080, 30 fps), the approved 10 s demo's world carried on: the snow-forest
// cottage, the door, the butler (北极熊管家) and the lady (大馋猫小姐, now wrapped in a blanket), hot cocoa and the
// scarf, the cocoa-foam moustache and the handkerchief, a sled ride under the streetlamps to the frozen lake, a little
// chubby cat snowman with twig whiskers, her head on his shoulder, and the paper book half closing on the lit cottage.
// harness.js and lib/ are the papercraft skill's (unchanged); palette, ground, pieces and cottage are scene.js's.
//
// FILM (cuts on the story beats; each line lands inside the shot of the one who speaks: voice60.js)
//   0-6 wide crane-in on the cottage | 6-12 the door opens, he steps out, catches a flake, "小姐，下雪了。"
//   12-18 she rushes out, shivers, scolds | 18-24 cocoa from behind his back, the scarf, "哼，这还差不多。" under the lamp
//   24-32 close: the sip, the foam moustache, his stifled laugh, "笑什么笑！", the handkerchief
//   32-38.4 tracking the sled under the lamps ("慢点慢点——好吧，再快一点！") | 38.4-42 wide follow, the pines bow and spring
//   42-44.4 the cat snowman pops up, "像您。" | 44.4-50 her: "哪里像！……眼睛挺像的。"
//   50-56 the two on the sled by the lake, her head on his shoulder | 56-60 the camera rises, the page folds up halfway
// LOOK (the Korean-drama brief): warm practicals behind the subject (a moving backlight on the speaker), streetlamp
//   pools, heavy goose-feather flakes plus soft out-of-focus flakes before the lens, slow push-ins, a narrow focus band
import * as THREE from 'three';
import * as P2 from 'papercraft/lib/paperkit-2d.js';
import { makeCard, boxFold, layeredCard, cardClips } from 'papercraft/lib/paperkit-3d.js';
import * as EX from 'papercraft/examples/countryside.js';
import { createLife } from 'papercraft/lib/paper-life.js';
import { FLAP_PRESETS } from 'papercraft/lib/paper-sound.js';
import { createHarness } from '../harness.js';
import { buildFigures } from '../figures.js';
import { createFlakes, flakeGeometry } from '../flakes.js';
import { renderSoundtrack } from './score60.js';
import { LINES, ENV, DURATION } from './voice60.js';

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

// ---- 2. the cottage frame -----------------------------------------------------------------------------------------------
// ---- 2. the cottage frame and the film's camera ---------------------------------------------------------------------
const HOUSE = { x: -3.5, z: -9, yaw: 0.35, w: 8.4, d: 6, wallH: 5.4, roofH: 3.4, ov: 0.25 };
const DOOR = { u: 1.7, w: 2.0, h: 4.4 };
const hc = Math.cos(HOUSE.yaw), hs = Math.sin(HOUSE.yaw);
const L2W = (u, v) => [HOUSE.x + u * hc + v * hs, HOUSE.z - u * hs + v * hc];   // cottage frame (u along the front, v out of the door) -> page
const W2L = (x, z) => { const dx = x - HOUSE.x, dz = z - HOUSE.z; return [dx * hc - dz * hs, dx * hs + dz * hc]; };

// ---- 2b. the film's layout: the lane to the lake, the lake, the sled's ride -------------------------------------------
const DUR = DURATION;
const keysAt = (t, K) => { if (t <= K[0][0]) return K[0][1]; for (let i = 0; i < K.length - 1; i++) if (t < K[i + 1][0]) { const k = sm(K[i][0], K[i + 1][0], t), a = K[i][1], b = K[i + 1][1]; return Array.isArray(a) ? a.map((v, j) => (Array.isArray(v) ? v.map((w, q) => lerp(w, b[j][q], k)) : lerp(v, b[j], k))) : lerp(a, b, k); } return K[K.length - 1][1]; };
const norm2 = ([a, b]) => { const l = Math.hypot(a, b) || 1; return [a / l, b / l]; };
const uvDir = ([du, dv]) => [du * hc + dv * hs, -du * hs + dv * hc];          // a direction in the cottage frame -> page
const yawOfW = ([dx, dz]) => Math.atan2(dx, dz);                               // page direction -> a figure's / camera's yaw
// the lake frame: S the shore point the ride ends at, F toward the lake (and the lake camera), R to the right of F
const SHORE = [18.5, 19], LF = norm2([0.64, 0.77]), LR = [LF[1], -LF[0]];
const LK = (f, r) => [SHORE[0] + LF[0] * f + LR[0] * r, SHORE[1] + LF[1] * f + LR[1] * r];   // -> cottage frame (u, v)
const LAKE = { c: L2W(...LK(7.6, 0)), a: 8.6, b: 5.6, dir: uvDir(LR) };       // an ellipse: a along R, b along F
const lakeAt = (x, z, k = 1) => { const dx = x - LAKE.c[0], dz = z - LAKE.c[1], p = dx * LAKE.dir[0] + dz * LAKE.dir[1], q = -dx * LAKE.dir[1] + dz * LAKE.dir[0]; return (p / (LAKE.a * k)) ** 2 + (q / (LAKE.b * k)) ** 2; };
const lakePts = (k) => Array.from({ length: 56 }, (_, i) => { const a = i / 56 * Math.PI * 2, w = 1 + 0.05 * Math.sin(a * 3 + 0.7) + 0.04 * Math.sin(a * 7), p = Math.cos(a) * LAKE.a * k * w, q = Math.sin(a) * LAKE.b * k * w; return [LAKE.c[0] + p * LAKE.dir[0] - q * LAKE.dir[1], LAKE.c[1] + p * LAKE.dir[1] + q * LAKE.dir[0]]; });
// the ride: from the yard under the first streetlamp, along the trodden path, out to the shore (and on over the ice for
// the one pulling, a rope's length ahead)
const RIDE_UV = [[2.4, 5.0], [4.4, 8.4], [7.4, 11.6], [11.5, 14.8], [15.4, 17.6], SHORE, LK(1.4, 0.9), LK(4.5, 2.2)];
const ROUTE = (() => {
  const pts = P2.pathLine(RIDE_UV.map((p) => L2W(...p)), { step: 0.12 }).pts, cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const [sx, sz] = L2W(...SHORE); let iS = 0, best = Infinity;
  pts.forEach(([x, z], i) => { const d = Math.hypot(x - sx, z - sz); if (d < best) { best = d; iS = i; } });
  const at = (s) => {
    s = clamp(s, 0, cum[cum.length - 1]); let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
    const k = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1), [x0, z0] = pts[i - 1], [x1, z1] = pts[i];
    return { x: lerp(x0, x1, k), z: lerp(z0, z1, k), dir: norm2([x1 - x0, z1 - z0]) };
  };
  return { pts, at, len: cum[cum.length - 1], shore: cum[iS], dist: (x, z) => Math.min(...pts.map(([px, pz]) => Math.hypot(x - px, z - pz))) };
})();
const RIDE = { t0: 32, t1: 42, lead: 2.7 };
// the sled's speed through the ride (units/s, scaled so it reaches the shore at t1): a careful start, slower at "慢点慢点",
// faster from "好吧，再快一点！", a glide in to the shore
const rideSpeed = (t) => keysAt(t, [[32, 0], [33.4, 1.0], [34.0, 0.45], [35.1, 0.45], [38.2, 2.5], [40.8, 3.3], [41.6, 1.6], [42, 0]]);
const RIDE_S = (() => {
  const dt = 1 / 120, n = Math.ceil((RIDE.t1 - RIDE.t0) / dt), out = new Float64Array(n + 1);
  for (let i = 1; i <= n; i++) out[i] = out[i - 1] + rideSpeed(RIDE.t0 + (i - 0.5) * dt) * dt;
  const k = ROUTE.shore / out[n];
  return (t) => { const f = clamp((t - RIDE.t0) / dt, 0, n), i = Math.floor(f), j = Math.min(n, i + 1); return k * (out[i] + (out[j] - out[i]) * (f - i)); };
})();
// the time the sled passes arc length s (the lane's pines bow then)
const passTime = (s) => { for (let t = RIDE.t0; t <= RIDE.t1; t += 1 / 60) if (RIDE_S(t) >= s) return t; return null; };
const SLED_PARK = { uv: [5.9, 3.3], yaw: HOUSE.yaw - 0.3 + Math.PI / 2 };
const SEAT = 0.74;

// ---- 2c. the camera: ten shots, one slow move each (a slow push-in, almost always) ----------------------------------
const tgUV = (u, v, y) => { const [x, z] = L2W(u, v); return [x, y, z]; };
const yawF = yawOfW(uvDir(LF)) / DEG;
const sledW = (t) => { const p = ROUTE.at(RIDE_S(t)); return p; };
const SHOTS = [
  { t0: 0, t1: 6, a: { tg: [-1.9, 1.6, -8.6], yaw: 2, pitch: 46, dist: 66 }, b: { tg: [-1.4, 1.8, -7.8], yaw: 6, pitch: 43, dist: 46 }, band: 0.3, name: 'cottage' },
  { t0: 6, t1: 12, a: { tg: tgUV(2.0, 0.9, 2.3), yaw: 11, pitch: 31, dist: 25 }, b: { tg: tgUV(2.4, 1.4, 2.4), yaw: 14, pitch: 26, dist: 15 }, band: 0.2, name: 'door' },
  { t0: 12, t1: 18, a: { tg: tgUV(1.95, 2.0, 2.2), yaw: 3, pitch: 27, dist: 19 }, b: { tg: tgUV(1.95, 2.2, 2.3), yaw: 6, pitch: 24, dist: 14.5 }, band: 0.18, name: 'scold' },
  { t0: 18, t1: 24, a: { tg: tgUV(1.95, 2.2, 2.4), yaw: 12, pitch: 23, dist: 14 }, b: { tg: tgUV(1.95, 2.2, 2.5), yaw: 15, pitch: 21, dist: 11 }, band: 0.16, name: 'cocoa' },
  { t0: 24, t1: 32, a: { tg: tgUV(1.95, 2.2, 2.8), yaw: 9, pitch: 19, dist: 10.5 }, b: { tg: tgUV(1.95, 2.2, 2.85), yaw: 12, pitch: 17, dist: 8 }, band: 0.13, name: 'foam' },
  { t0: 32, t1: 38.4, track: (t) => { const p = sledW(t); return [p.x + p.dir[0] * 1.5, 1.8, p.z + p.dir[1] * 1.5]; }, a: { yaw: -12, pitch: 21, dist: 11.5 }, b: { yaw: -4, pitch: 19, dist: 9.5 }, band: 0.16, name: 'ride' },
  { t0: 38.4, t1: 42, track: (t) => { const p = sledW(t); return [p.x + p.dir[0] * 3.5, 1.6, p.z + p.dir[1] * 3.5]; }, a: { yaw: -28, pitch: 33, dist: 27 }, b: { yaw: -16, pitch: 29, dist: 23 }, band: 0.24, name: 'follow' },
  { t0: 42, t1: 44.4, a: { tg: tgUV(...LK(0.9, 1.3), 1.7), yaw: yawF + 40, pitch: 22, dist: 14.5 }, b: { tg: tgUV(...LK(0.9, 1.3), 1.8), yaw: yawF + 43, pitch: 20, dist: 12.5 }, band: 0.18, name: 'snowman' },
  { t0: 44.4, t1: 50, a: { tg: tgUV(...LK(0.8, 0.9), 1.9), yaw: yawF + 18, pitch: 19, dist: 11 }, b: { tg: tgUV(...LK(0.7, 0.7), 2.0), yaw: yawF + 20, pitch: 17, dist: 8.8 }, band: 0.14, name: 'eyes' },
  { t0: 50, t1: 56, a: { tg: tgUV(...LK(0, 0), 2.1), yaw: yawF + 4, pitch: 19, dist: 14 }, b: { tg: tgUV(...LK(0, 0), 2.2), yaw: yawF + 2, pitch: 17, dist: 10.5 }, band: 0.15, name: 'shoulder' },
  { t0: 56, t1: DUR + 0.05, a: { tg: tgUV(...LK(0, 0), 2.2), yaw: yawF + 2, pitch: 17, dist: 10.5 }, b: { tg: tgUV(...LK(-12, -0.5), 1.5), yaw: yawF - 3, pitch: 40, dist: 56 }, band: 0.3, ease: 'in-out', name: 'book' },
];
const CUTS = SHOTS.slice(1).map((s) => s.t0);
const glide = (u) => { u = clamp(u); return 0.3 * u + 0.7 * u * u * (3 - 2 * u); };   // never quite still at a cut
const inOut = (u) => { u = clamp(u); return u * u * u * (u * (6 * u - 15) + 10); };
function camAt(t) {
  const S = SHOTS.find((s) => t < s.t1) || SHOTS[SHOTS.length - 1], u = (t - S.t0) / (S.t1 - S.t0), k = S.ease === 'in-out' ? inOut(u) : glide(u);
  const tg = S.track ? S.track(t) : S.a.tg.map((v, i) => lerp(v, S.b.tg[i], k));
  return { shot: SHOTS.indexOf(S), S, tg, yaw: lerp(S.a.yaw, S.b.yaw, k), pitch: lerp(S.a.pitch, S.b.pitch, k), dist: lerp(S.a.dist, S.b.dist, k) };
}
const camPos = (c) => { const y = c.yaw * DEG, p = c.pitch * DEG; return [c.tg[0] + Math.sin(y) * Math.cos(p) * c.dist, c.tg[1] + Math.sin(p) * c.dist, c.tg[2] + Math.cos(y) * Math.cos(p) * c.dist]; };

// ---- 3. light: a snowy night, warmth from the practicals --------------------------------------------------------------
const MOODS = {
  snownight: { key: '#c4d2ff', ki: 1.6, dir: [-0.72, 0.85, 0.42], fill: '#8394d4', fi: 0.74, sky: '#4a64b8', skyG: '#2a2e4a', si: 0.82, leak: '#2c3c8c', wrap: 0.42, glow: 1.35, lamp: 4.6,
    post: { exposure: 0.85, tint: [1.0, 0.98, 1.02], saturation: 1.05, contrast: 1.13, haze: '#1a2350', hazeStart: 30, hazeEnd: 95, hazeAmount: 0.6, vignette: 0.38, vignetteColor: '#0c1028', shadowTint: '#18204e', shadowLift: 0.045, greenDesat: 0.2 } },
};
const V0 = camAt(0);
const H = createHarness({ ground: C.ground, stock: '#eef1f6', heroHeight: 3.4, autoOpen: false, roam: true, crossTurn: 30, mood: 'snownight', moods: MOODS,
  view: { pitch: V0.pitch, dist: V0.dist, target: V0.tg, yaw: V0.yaw, fov: 26 }, testView: { dist: 26, target: [-0.8, 1.8, -7] },
  bounds: { x0: -64, x1: 64, z0: -66, z1: 40 }, flapVoicing: FLAP_PRESETS.soft,
  light: { keyDir: [-0.72, 0.85, 0.42], shadowExtent: 36, mapSize: 4096, softness: 0.3, maxPenumbra: 1.2 }, lens: { maxBlur: 20, focusBand: 0.3, ramp: 0.3 } });
const { flags } = H;
let nLamps = 0;
const lamp = (...a) => { nLamps++; H.lamp(...a); return nLamps - 1; };

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

// ---- 6b. this film's new pieces: the cat snowman, its twig whiskers, the sled that rides, the book's left page --------
const catPts = P2.fromDrawing((g) => {
  D.ell(g, 0, 0.5, 0.64, 0.52); D.ell(g, 0, 1.17, 0.47, 0.39);
  D.poly(g, [[-0.42, 1.28], [-0.33, 1.7], [-0.1, 1.5]]); D.poly(g, [[0.42, 1.28], [0.33, 1.7], [0.1, 1.5]]);
  D.ell(g, 0.62, 0.32, 0.17, 0.13); D.ell(g, 0.74, 0.5, 0.11, 0.12);
}, { w: 1.8, h: 1.8, name: 'cat snowman' });
const paintCat = (P) => {
  P.gradient('#ffffff', '#d2d9e8', 0.3); P.felt(0.5);
  P.parts((g, ink) => {
    g.fillStyle = ink('#f2b8b8'); D.poly(g, [[-0.36, 1.33], [-0.31, 1.6], [-0.16, 1.46]]); D.poly(g, [[0.36, 1.33], [0.31, 1.6], [0.16, 1.46]]);
    g.fillStyle = ink('#b3343c'); D.rect(g, -0.44, 0.84, 0.88, 0.11, 0.05); D.poly(g, [[0.14, 0.88], [0.32, 0.88], [0.36, 0.5], [0.2, 0.52]]);
    g.fillStyle = ink('#efe1c8', 'print'); D.rect(g, 0.2, 0.62, 0.15, 0.03); D.rect(g, 0.19, 0.7, 0.15, 0.03);
    g.fillStyle = ink('#2b1a14'); D.ell(g, -0.17, 1.2, 0.085, 0.095); D.ell(g, 0.17, 1.2, 0.085, 0.095);
    g.fillStyle = ink('#ffffff', 'print'); D.ell(g, -0.145, 1.235, 0.03, 0.032); D.ell(g, 0.195, 1.235, 0.03, 0.032);
    g.fillStyle = ink('#e88a8a', 'print'); D.poly(g, [[-0.04, 1.1], [0.04, 1.1], [0, 1.06]]);
    g.fillStyle = ink(P2.rgba('#f2a594', 0.5), 'print'); D.ell(g, -0.3, 1.08, 0.08, 0.045); D.ell(g, 0.3, 1.08, 0.08, 0.045);
  }, { shadowColor: SH });
  P.draw((g) => { g.strokeStyle = '#6a4a40'; g.lineWidth = 0.018; g.beginPath(); g.moveTo(-0.07, 1.02); g.quadraticCurveTo(-0.035, 0.98, 0, 1.03); g.quadraticCurveTo(0.035, 0.98, 0.07, 1.02); g.stroke(); });
  P.marks('dot', { color: '#ffffff', alpha: 0.6, size: 0.02, density: 0.4 });
  P.innerShade('#3a4470', { alpha: 0.32, blurPx: 10 });
};
const twigArt = (s) => P2.drawnPiece((g, ink) => {
  g.fillStyle = ink('#5a3a2a'); D.poly(g, [[-0.3 * s, 0.02], [0.3 * s, 0.09], [0.3 * s, 0.12], [-0.3 * s, 0.06]]);
  D.poly(g, [[0.06 * s, 0.08], [0.18 * s, 0.19], [0.16 * s, 0.2], [0.03 * s, 0.1]]);
}, { w: 0.7, h: 0.25, name: 'twig', layer: { shadowColor: SH } });
const paintPage = (P) => {
  const { box, r } = P;
  P.gradient('#e6ebf4', '#cfd7e6', 0.2); P.felt(0.6);
  P.draw((g) => {
    for (let k = 0; k < 120; k++) { const x = box.x0 + r() * box.w, y = box.y0 + r() * box.h, rr = 0.8 + r() * 2.6; const gr = g.createRadialGradient(x, y, 0, x, y, rr); const c = r() < 0.55 ? '255,255,255' : '170,180,206'; gr.addColorStop(0, `rgba(${c},0.32)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    const gr = g.createLinearGradient(0, 0, 0, 2.2); gr.addColorStop(0, 'rgba(40,50,100,0.45)'); gr.addColorStop(1, 'rgba(40,50,100,0)'); g.fillStyle = gr; g.fillRect(box.x0, 0, box.w, 2.2);   // the gutter
  });
  P.marks('dot', { color: '#ffffff', alpha: 0.7, size: 0.05, density: 0.35 });
  P.innerShade('#26305e', { alpha: 0.3, blurPx: 12 });
};

// ---- 7. placement helpers -------------------------------------------------------------------------------------------------
const at = (u, v) => L2W(u, v);
const _v = new THREE.Vector3();
const camOf = (t) => { const c = camAt(t), cam = new THREE.PerspectiveCamera(26, 16 / 9, 1, 600); cam.position.set(...camPos(c)); cam.lookAt(...c.tg); cam.updateMatrixWorld(); cam.updateProjectionMatrix(); cam.userData.tg = c.tg; cam.userData.band = c.S.band; return cam; };
const shotCams = [];
for (const S of SHOTS) for (let k = 0; k <= 4; k++) shotCams.push(camOf(Math.min(S.t1 - 0.02, S.t0 + 0.02 + (S.t1 - S.t0 - 0.04) * k / 4)));
const inShots = (x, z, m = 0.1, y = 1) => shotCams.some((cam) => { _v.set(x, y, z).project(cam); return _v.z < 1 && Math.abs(_v.x) < 1 + 2 * m && _v.y > -1 - m && _v.y < 1 + m; });
// nothing tall between a camera and what it looks at (soft edge pieces at the frame's sides are fine); wide = false
// leaves out the two widest shots (the lane's pines may stand in the opening and closing views)
const blocks = (x, z, h, wide = true) => shotCams.some((cam) => (wide || cam.userData.band < 0.3) && [0.4, 0.5 * h, h].some((y) => {
  const tg = cam.userData.tg; _v.set(x, y, z); const d = _v.distanceTo(cam.position); _v.project(cam);
  return _v.z < 1 && Math.abs(_v.x) < 0.8 && Math.abs(_v.y) < 1 && d < Math.hypot(tg[0] - cam.position.x, tg[1] - cam.position.y, tg[2] - cam.position.z) - 1.8;
}));
const faceYaw = (x, z) => { let best = null, bd = Infinity; for (const cam of shotCams) { _v.set(x, 1, z).project(cam); if (!(_v.z < 1 && Math.abs(_v.x) < 1.15 && Math.abs(_v.y) < 1.15)) continue; const d = Math.hypot(cam.position.x - x, cam.position.z - z); if (d < bd) { bd = d; best = cam; } } return best ? Math.atan2(best.position.x - x, best.position.z - z) + (rnd() - 0.5) * 0.3 : null; };
const keepOut = [], mark = (x, z, r) => keepOut.push([x, z, r]);
const inYard = (x, z) => { const [u, v] = W2L(x, z); return u > -0.4 && u < 4.8 && v > -0.5 && v < 5.4; };
const inHouse = (x, z, m = 0) => { const [u, v] = W2L(x, z); return Math.abs(u) < HOUSE.w / 2 + 0.6 + m && v > -HOUSE.d - 0.8 - m && v < 0.9 + m; };
const nearShore = (x, z) => { const [sx, sz] = at(...LK(0.6, 0.6)); return Math.hypot(x - sx, z - sz) < 6.2; };
// the book's left page lies under the snow to the left of the last shot; nothing may stand where it will rise
const PAGE = (() => {
  const yaw = SHOTS[SHOTS.length - 1].b.yaw * DEG, f = [-Math.sin(yaw), -Math.cos(yaw)], left = [-Math.cos(yaw), Math.sin(yaw)];
  const [cx, cz] = at(...LK(0, 0)), off = 13, len = 90, depth = 30;
  return { f, left, p0: [cx + left[0] * off, cz + left[1] * off], len, depth, yaw };
})();
const onPage = (x, z, m = 0) => { const dx = x - PAGE.p0[0], dz = z - PAGE.p0[1], a = dx * PAGE.left[0] + dz * PAGE.left[1], b = dx * PAGE.f[0] + dz * PAGE.f[1]; return a > -1.5 - m && a < PAGE.depth + m && Math.abs(b) < PAGE.len / 2 + m; };
const free = (x, z, m = 0) => !inHouse(x, z, m) && !inYard(x, z) && PATH.dist(x, z) > 1.6 + m && ROUTE.dist(x, z) > 2.6 + m && !inPond(x, z, 1.08) && lakeAt(x, z) > 1.25 && !nearShore(x, z) && !onPage(x, z, 1)
  && keepOut.every(([kx, kz, r]) => Math.hypot(x - kx, z - kz) > r + m);
const pop = (pts, paint, o) => H.popup(pts, paint, o);
const late = [];
function slowSail(x, z, { w = 3, h = 1.2, n = 2, yaw = null, t0 = 4, dur = 2.6, col = C.snowHi } = {}) {
  const layers = Array.from({ length: n }, (_, k) => ({ pts: P2.roughen(peak(w * (1 - k * 0.12), h * (1 - k * 0.2), 0.15 + (k % 2 ? 0.1 : -0.05)), rnd).map(([px, py]) => [px + (k - 1) * w * 0.1, py]), paint: paintDrift(P2.shade(col, -0.1 + k * 0.08)), z: k * 0.32 }));
  const node = layeredCard(layers, { ...H.cardOpts(x, z), back: 'kraft' });
  const grp = new THREE.Group(), pivot = new THREE.Group(); grp.position.set(x, 0.015, z);
  grp.rotation.y = yaw ?? Math.atan2(shotCams[6].position.x - x, shotCams[6].position.z - z); grp.add(pivot); pivot.add(node); H.scene.add(grp);
  late.push({ pivot, t0, dur, x, z }); mark(x, z, w * 0.45);
}

// ---- 8. the world -----------------------------------------------------------------------------------------------------------
const PINES = [0, 1, 2, 3, 4].map((k) => { const [pts, paint] = K.pine(k); return { pts, materials: H.printed(pts, paint, { cross: true }) }; });
const pine = (x, z, { k = Math.floor(rnd() * 5), scale = 1, sway = 0.25, force = false, parent = null, wide = true } = {}) => { const P = PINES[k]; if (!force && blocks(x, z, 9 * scale, wide)) return null; if (!parent) mark(x, z, 1.6 * scale); return pop(P.pts, null, { x, z, cross: true, materials: P.materials, scale, sway, parent }); };
const LIFE = { chimneys: [], mugs: [] };
const DEFER = new Set();      // hinges that do not rise with the world (the snowman: it is built at the lake)
const LANE = [];              // the lane's pines: they bow as the sled passes and spring back up
const W = { };                // this film's moving parts
let FIG = null;
function buildSled() {
  const [spts, spaint] = K.sled(), grp = new THREE.Group(); grp.name = 'sled';
  for (const s of [-1, 1]) {
    const side = makeCard(spts, { paint: spaint, paper: H.paper, thickness: 0.06, edgeWidth: 0.05, pxPerUnit: 60, seed: 900 + s, back: 'mirror', folds: [], contact: null });
    side.rotation.y = -Math.PI / 2; side.position.x = s * 0.5; grp.add(side);
  }
  const plank = makeCard(P2.shape.rect(1.06, 2.6), { paper: H.paper, thickness: 0.06, edgeWidth: 0.04, pxPerUnit: 60, seed: 903, folds: [], contact: null,
    paint: (P) => { EX.paintWood({ wood: '#9a5a36' }, { planks: 4, vertical: true })(P); P.layer((g) => { D.rect(g, -0.42, 0.5, 0.84, 1.3, 0.12); }, '#c9b48e', { shadowColor: SH }); P.marks('stripe', { color: '#9a564c', alpha: 0.35, size: 0.18 }); } });
  plank.rotation.x = -Math.PI / 2; plank.position.set(0, SEAT - 0.03, 1.3 - 0.15); grp.add(plank);
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  H.scene.add(grp); W.sled = grp;
  // the rope: paper twine from the sled's nose to his hand
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), new THREE.MeshStandardMaterial({ color: '#c9a46a', roughness: 0.9 }));
  rope.castShadow = true; rope.visible = false; H.scene.add(rope); W.rope = rope;
}
function buildCat() {
  const [x, z] = at(...LK(1.75, 2.4)), node = makeCard(catPts, { paint: paintCat, ...H.cardOpts(x, z, 1, true), back: 'kraft', folds: ['bottom'] });
  const twigs = [-1, 1].map((s) => { const [pts, paint] = twigArt(s); const m = makeCard(pts, { paint, paper: H.paper, thickness: 0.03, edgeWidth: 0.02, pxPerUnit: 200, seed: 950 + s, back: 'mirror', folds: [], contact: null }); m.position.set(s * 0.5, 1.02, 0.07); m.visible = false; node.add(m); return m; });
  const nrm = uvDir(norm2([LF[0] + LR[0] * 0.55, LF[1] + LR[1] * 0.55]));
  const h = pop(null, null, { node, height: 1.8, x, z, yaw: yawOfW(nrm), scale: 0.95 });
  DEFER.add(h); mark(x, z, 1.2);
  W.cat = { h, twigs };
}
function buildPage() {
  const pivot = new THREE.Group(), leaf = new THREE.Group();
  pivot.position.set(PAGE.p0[0], -0.07, PAGE.p0[1]); pivot.rotation.y = Math.atan2(-PAGE.left[0], -PAGE.left[1]);   // local -z = left
  pivot.add(leaf); H.scene.add(pivot);
  const card = makeCard(P2.shape.rect(PAGE.len, PAGE.depth), { paint: paintPage, paper: H.paper, thickness: 0.12, edgeWidth: 0.1, pxPerUnit: 12, seed: 990, back: 'kraft', folds: ['bottom'], contact: null, effects: 0 });
  card.rotation.x = -Math.PI / 2; card.receiveShadow = true; leaf.add(card);
  // its own pines ride the page (they stand through the snow until it rises, then fold over with it)
  rnd = P2.rng(515);
  for (let k = 0; k < 26; k++) {
    const lx = (rnd() - 0.5) * PAGE.len * 0.8, lz = -(3 + rnd() * (PAGE.depth - 6));
    const th = pivot.rotation.y, chk = [PAGE.p0[0] + lx * Math.cos(th) + lz * Math.sin(th), PAGE.p0[1] - lx * Math.sin(th) + lz * Math.cos(th)];
    if (!inShots(chk[0], chk[1], 0.3, 2) && rnd() < 0.7) continue;
    if (lakeAt(chk[0], chk[1]) < 1.3 || ROUTE.dist(chk[0], chk[1]) < 4) continue;
    pine(lx, lz, { k: Math.floor(rnd() * 5), scale: 0.8 + rnd() * 0.5, force: true, parent: leaf });
  }
  W.page = { pivot, leaf };
}
function buildWorld() {
  buildHouse(); LIFE.chimneys.push(HOUSE_PARTS.chimneyTop);
  { const [x, z] = at(-5.6, -2.2); pop(...K.woodpile(), { x, z, yaw: HOUSE.yaw - 0.35, scale: 1.1 }); mark(x, z, 1.6); }
  for (const [u, v, s] of [[-3.6, 1.6, 0.9], [-5.6, 0.6, 0.75], [5.0, 1.2, 0.85]]) { const [x, z] = at(u, v), w = 3.6;
    pop(null, null, { node: layeredCard([{ pts: P2.roughen(mound(w, w * 0.45, 6, 0.2), rnd), paint: paintBushBack }, { pts: P2.roughen(mound(w * 0.72, w * 0.32, 5, 0.14), rnd), paint: paintBushFront, z: 0.35 }], H.cardOpts(x, z, s)), height: w * 0.45, x, z, yaw: HOUSE.yaw + (rnd() - 0.5) * 0.4, scale: s }); mark(x, z, 1.8 * s); }
  // the streetlamps: the yard's, then down the lane to the lake, one on the shore behind the bench (the backlight)
  W.lampIdx = [];
  { const [x, z] = at(4.5, 4.7); pop(...K.lampPost(), { x, z, yaw: HOUSE.yaw - 0.1, scale: 1.0 }); W.lampIdx.push(lamp(x, 3.9, z + 0.3, 1.0, 13)); mark(x, z, 0.8); H.spots.lamp = [x, z]; }
  for (const [s, side] of [[5.4, -1], [9.8, -1], [14.2, -1], [18.6, -1]]) {
    const p = ROUTE.at(s), n = [-p.dir[1] * side, p.dir[0] * side], x = p.x + n[0] * 2.1, z = p.z + n[1] * 2.1;
    pop(...K.lampPost(), { x, z, yaw: faceYaw(x, z), scale: 1.05 }); W.lampIdx.push(lamp(x, 4.0, z, 1.0, 13)); mark(x, z, 0.9);
  }
  { const [x, z] = at(...LK(-2.4, -2.6)); pop(...K.lampPost(), { x, z, yaw: faceYaw(x, z), scale: 1.1 }); W.lampIdx.push(lamp(x, 4.2, z, 1.25, 14)); mark(x, z, 0.9); }
  for (const [u, v] of [[0.4, 6.0], [6.9, 8.0]]) { const [x, z] = at(u, v); pop(...K.lantern(), { x, z, yaw: HOUSE.yaw + (rnd() - 0.5) * 0.3 }); lamp(x, 1.0, z + 0.2, 0.32, 6); mark(x, z, 0.6); }
  { const [x, z] = at(9.0, 10.0); pop(...K.mailbox(), { x, z, yaw: HOUSE.yaw - 0.2 }); mark(x, z, 0.8); }
  { const [x, z] = at(-7.2, 7.4); pop(...K.snowman(), { x, z, yaw: HOUSE.yaw + 0.25, scale: 1.05 }); mark(x, z, 1.2); }
  { const [x, z] = at(-2.6, 6.4); pop(...K.hare(), { x, z, yaw: HOUSE.yaw + 0.6, scale: 0.9 }); mark(x, z, 0.6); }
  for (const u of [-14.3, -8.9, -3.5]) { const [x, z] = at(u, 11.2); pop(...K.fence(), { x, z, yaw: HOUSE.yaw + (rnd() - 0.5) * 0.08 }); mark(x, z, 2.6); }
  for (const u of [12.6, 18.0]) { const [x, z] = at(u, 11.0); if (ROUTE.dist(x, z) > 3.2) { pop(...K.fence(), { x, z, yaw: HOUSE.yaw - 0.1 }); mark(x, z, 2.6); } }
  for (const [u, v, k, s] of [[-7.4, -6.8, 2, 1.15], [-10.2, -3.2, 1, 1.05], [-9.4, 1.4, 0, 0.9], [-12.6, -0.6, 3, 1.0], [-1.6, -10.5, 2, 1.25], [3.8, -11.2, 1, 1.15], [8.4, -7.6, 0, 1.05],
    [8.6, -2.0, 4, 0.95], [10.6, 1.8, 3, 1.0], [11.4, -4.2, 2, 1.1], [-14.6, 4.2, 1, 0.95], [-5.8, -12.5, 0, 1.1]]) {
    const [x, z] = at(u, v); pine(x, z, { k, scale: s });
  }
  for (const [u, v] of [[-6.4, 3.4], [8.2, 4.8]]) { const [x, z] = at(u, v); if (!blocks(x, z, 7)) { pop(...K.birch(), { x, z, cross: true, sway: 0.2 }); mark(x, z, 1.2); } }
  for (const [u, v, s] of [[-4.6, 4.6, 1.0], [-11.8, 7.6, 1.1]]) { const [x, z] = at(u, v); pop(...K.rock(), { x, z, scale: s }); mark(x, z, 1.2 * s); }
  for (const [u, v, w, h] of [[-8.6, 9.2, 4.2, 1.6], [-13.6, -5.4, 4.0, 1.8]]) { const [x, z] = at(u, v);
    H.stack(x, z, Array.from({ length: 3 }, (_, k) => ({ pts: P2.roughen(peak(w * (1 - k * 0.12), h * (1 - k * 0.2), 0.18), rnd), paint: paintDrift(P2.shade(C.snowMid, -0.12 + k * 0.08)), d: k * 0.4, dx: (k - 1) * 0.3 }))); mark(x, z, w * 0.5); }
  for (const [u, v, w, h, t0] of [[-2.2, 1.1, 2.4, 0.75, 3.0], [-1.4, 7.2, 3.0, 0.9, 3.8], [-4.8, 3.0, 2.6, 0.9, 4.6]]) { const [x, z] = at(u, v); slowSail(x, z, { w, h, t0, dur: 2.8 }); }
  for (const [x, z] of [[-30, -40], [2, -44], [30, -40]]) for (let k = 0; k < 3; k++) pop(P2.roughen(peak(16 - k * 2.4, 9 - k * 2, 0.1 + k * 0.08), rnd), paintDrift(P2.shade(C.hill, -0.12 + k * 0.1)), { x: x + (k - 1) * 1.2, z: z + k * 1.5 });
  // the lane's pines, on the far side of the ride from its cameras; they bow as the sled passes
  rnd = P2.rng(404);
  for (let s = 3.5; s < ROUTE.shore - 1.5; s += 1.7) {
    const side = -1;
    const p = ROUTE.at(s + (rnd() - 0.5) * 0.8), off = 3.4 + rnd() * 1.6, x = p.x - p.dir[1] * side * off, z = p.z + p.dir[0] * side * off;
    if (!free(x, z, -0.6) && ROUTE.dist(x, z) < 3.2) continue;
    if (inHouse(x, z, 1) || inYard(x, z) || lakeAt(x, z) < 1.3 || keepOut.some(([kx, kz, r]) => Math.hypot(x - kx, z - kz) < r + 0.4)) continue;
    const h = pine(x, z, { k: Math.floor(rnd() * 5), scale: 0.62 + rnd() * 0.3, wide: false });
    if (h) LANE.push({ h, s, t: passTime(s - 0.6) });
  }
  // the shore: a few drifts and rocks round the bench, birches behind it, the lake's far bank of pines
  for (const [f, r, w, h] of [[-2.2, 3.4, 3.2, 1.1], [-1.8, -4.4, 3.6, 1.3], [-3.6, 0.8, 4.2, 1.4]]) { const [x, z] = at(...LK(f, r)); H.stack(x, z, [0, 1].map((k) => ({ pts: P2.roughen(peak(w - k * 0.5, h - k * 0.3, 0.2), rnd), paint: paintDrift(P2.shade(C.snowMid, -0.1 + k * 0.08)), d: k * 0.35 })), { yaw: faceYaw(x, z) }); mark(x, z, w * 0.45); }
  for (const [f, r, s] of [[-3.2, -2.0, 1.0], [0.2, 4.3, 0.8]]) { const [x, z] = at(...LK(f, r)); pop(...K.rock(), { x, z, scale: s, yaw: faceYaw(x, z) }); mark(x, z, 1.2 * s); }
  for (const [f, r] of [[-4.2, 2.4], [-3.0, -5.6]]) { const [x, z] = at(...LK(f, r)); if (!blocks(x, z, 7)) { pop(...K.birch(), { x, z, cross: true, sway: 0.2 }); mark(x, z, 1.2); } }
  for (let k = 0; k < 16; k++) { const a = -1.2 + k * 0.17, [x, z] = [LAKE.c[0] + Math.cos(a) * LAKE.a * 1.32 * LAKE.dir[0] - Math.sin(a) * LAKE.b * 1.4 * LAKE.dir[1], LAKE.c[1] + Math.cos(a) * LAKE.a * 1.32 * LAKE.dir[1] + Math.sin(a) * LAKE.b * 1.4 * LAKE.dir[0]]; if (free(x, z, 0.2)) pine(x, z, { k: k % 5, scale: 0.9 + (k % 3) * 0.12 }); }
  buildCat(); buildSled(); buildPage();
  FIG = buildFigures(H, { blanket: true });
  for (const f of [FIG.lady, FIG.butler]) { H.scene.add(f); f.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }

  // the fill: pines and small groups wherever any shot can see, away from the yard, the paths, the lake and the page
  rnd = P2.rng(202);
  const cellSeed = (gx, gz, salt) => (Math.imul(Math.round(gx * 10), 73856093) ^ Math.imul(Math.round(gz * 10), 19349663) ^ Math.imul(salt, 83492791)) >>> 0;
  const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
  const lush = (x, z) => 0.5 + 0.26 * Math.sin(x * 0.13 + ph[0]) * Math.sin(z * 0.15 + ph[1]) + 0.18 * Math.sin(x * 0.21 + z * 0.17 + ph[2]);
  const placed = [];
  for (let gz = -50; gz <= 34; gz += 3.0) for (let gx = -50; gx <= 56; gx += 3.0) {
    rnd = P2.rng(cellSeed(gx, gz, 19));
    const x = gx + (rnd() - 0.5) * 2.4, z = gz + (rnd() - 0.5) * 2.4, l = lush(x, z);
    if (!inShots(x, z, 0.12, 2) || !free(x, z, 0.4) || placed.some(([px, pz]) => Math.hypot(x - px, z - pz) < 2.8)) continue;
    placed.push([x, z]);
    if (l > 0.48) pine(x, z, { k: Math.floor(rnd() * 5), scale: 0.75 + rnd() * 0.45 });
    else if (l > 0.3) {
      const r2 = rnd();
      const fy = faceYaw(x, z);
      if (r2 < 0.35) pop(...K.rock(), { x, z, scale: 0.7 + rnd() * 0.5, yaw: fy });
      else if (r2 < 0.7) { const w = 3.2 * (0.6 + rnd() * 0.4); if (!blocks(x, z, 1.5)) pop(null, null, { node: layeredCard([{ pts: P2.roughen(mound(w, w * 0.45, 6, 0.2), rnd), paint: paintBushBack }, { pts: P2.roughen(mound(w * 0.72, w * 0.32, 5, 0.14), rnd), paint: paintBushFront, z: 0.35 }], H.cardOpts(x, z)), height: w * 0.45, x, z, yaw: fy }); }
      else H.stack(x, z, [0, 1].map((k) => ({ pts: P2.roughen(peak(3.2 - k * 0.5, 1.3 - k * 0.3, 0.2), rnd), paint: paintDrift(P2.shade(C.snowMid, -0.1 + k * 0.08)), d: k * 0.35 })), { yaw: fy });
    }
  }
}

if (flags.TEST) {
  buildHouse(); buildSled(); buildCat();
  FIG = buildFigures(H, { blanket: true });
  for (const f of [FIG.lady, FIG.butler]) H.scene.add(f);
} else buildWorld();

// ---- 9. the choreography: pure functions of time ---------------------------------------------------------------------
// yard positions in the cottage frame (u, v), yaws relative to the cottage; lake yaws relative to F (toward the lake)
const YAW_F = yawOfW(uvDir(LF)), YAW_R = yawOfW(uvDir(LR));
const A0 = [[0, 0], [0, 0]];
const LADY = {
  pos: [[0, [1.3, -1.55]], [11.85, [1.3, -1.55]], [12.75, [1.3, 2.35]], [31.9, [1.3, 2.35]], [42, LK(0, -0.35)], [49.9, LK(0, -0.35)], [50, LK(0, -0.8)]],
  yawYard: [[0, 0], [12.6, 0], [12.95, 0.6], [17.3, 0.6], [17.7, 0.4], [18.4, 0.55], [19.15, 0.55], [19.5, -0.25], [21.6, -0.25], [22.4, 0.4], [25.6, 0.4], [25.95, 0.7], [28.8, 0.7], [29.2, 0.6], [30.5, 0.6], [31.2, 0.25]],
  yawLake: [[42, 0], [44.5, 0], [44.75, 0.35], [46.2, 0.35], [46.6, 0.5], [49.9, 0.5], [50, 0]],
  arms: [[0, A0], [12.0, A0], [12.8, [[-0.55, 0.5], [-0.55, -0.5]]], [14.8, [[-0.55, 0.5], [-0.55, -0.5]]], [15.2, [[-0.55, 0.5], [-1.35, 0.05]]], [16.3, [[-0.55, 0.5], [-1.35, 0.05]]],
    [16.8, [[-0.55, 0.5], [-0.55, -0.5]]], [18.3, [[-0.55, 0.5], [-0.55, -0.5]]], [18.75, [[-1.05, 0.15], [-0.55, -0.5]]], [19.1, [[-0.85, 0.35], [-0.55, -0.5]]],
    [24.2, [[-0.85, 0.35], [-0.55, -0.5]]], [24.55, [[-2.0, 0.5], [-0.55, -0.5]]], [24.8, [[-2.0, 0.5], [-0.55, -0.5]]], [25.15, [[-0.85, 0.35], [-0.55, -0.5]]],
    [25.9, [[-0.85, 0.35], [0.05, -0.55]]], [28.7, [[-0.85, 0.35], [0.05, -0.55]]], [29.1, [[-0.85, 0.35], [-0.4, -0.3]]], [31.95, [[-0.85, 0.35], [-0.4, -0.3]]],
    [32, [[-0.45, 0.3], [-0.45, -0.3]]], [33.5, [[-0.45, 0.3], [-0.45, -0.3]]], [33.8, [[-1.6, 0.3], [-1.6, -0.3]]], [34.7, [[-1.6, 0.3], [-1.6, -0.3]]], [35.0, [[-0.5, 0.3], [-0.5, -0.3]]],
    [35.6, [[-0.5, 0.3], [-0.5, -0.3]]], [36.0, [[-2.7, 0.1], [-0.5, -0.3]]], [38.4, [[-2.7, 0.1], [-0.5, -0.3]]], [39.0, [[-2.6, -0.2], [-2.6, 0.2]]], [41.95, [[-2.6, -0.2], [-2.6, 0.2]]],
    [42, [[-0.6, 0.35], [-0.6, -0.35]]], [44.6, [[-0.6, 0.35], [-0.6, -0.35]]], [44.85, [[-0.6, 0.35], [-1.45, -0.1]]], [46.1, [[-0.6, 0.35], [-1.45, -0.1]]],
    [46.5, [[-0.75, 0.4], [-0.75, -0.4]]], [49.95, [[-0.75, 0.4], [-0.75, -0.4]]], [50, [[-0.85, 0.3], [-0.85, -0.3]]]],
  hold: [[0, [0, 0]], [12.0, [0, 0]], [12.8, [1, 1]]],
  head: [[0, [0, 0]], [12.9, [0.05, 0]], [13.2, [-0.04, 0.05]], [17.2, [-0.04, 0.05]], [17.6, [0, 0]], [19.25, [-0.1, -0.3]], [20.9, [-0.1, -0.3]], [21.5, [0, 0]], [24.45, [-0.14, 0]], [24.85, [-0.14, 0]], [25.2, [0, 0]],
    [25.95, [-0.04, 0.1]], [28.8, [-0.04, 0.1]], [29.0, [-0.06, 0.05]], [30.4, [-0.06, 0.05]], [31.0, [0.1, -0.25]], [31.95, [0.1, -0.25]], [32, [0, 0]], [35.6, [0, 0]], [36, [-0.15, 0]], [38.4, [-0.15, 0]],
    [39, [-0.2, 0]], [41.9, [-0.2, 0]], [42, [0, 0.2]], [44.6, [0, 0.2]], [44.9, [-0.05, 0.25]], [46.2, [-0.05, 0.25]], [46.6, [0.08, 0.3]], [49.9, [0.08, 0.3]], [50, [0, 0]], [50.8, [0, 0]], [52.2, [0.05, 0.1]]],
  roll: [[0, 0], [46.6, 0], [47.0, -0.12], [49.9, -0.12], [50, 0], [50.9, 0], [52.2, -0.3]],
  lean: [[0, 0], [50.9, 0], [52.2, -0.27]],
  bow: [[0, 0], [44.6, 0], [44.85, 0.12], [46.1, 0.12], [46.4, 0]],
  sit: [[0, 0], [31.95, 0], [32, 1]],
  sitAngle: [[0, -1.45], [41.95, -1.45], [42, -1.1]],
};
const BUTLER = {
  pos: [[0, [1.95, -0.7]], [6.15, [1.95, -0.7]], [7.05, [2.65, 2.05]], [31.9, [2.65, 2.05]], [42, LK(0.6, 2.6)], [49.9, LK(0.6, 2.6)], [50, LK(0, 0.8)]],
  yawYard: [[0, 0], [6.15, 0], [7.05, 0.15], [7.75, 0.15], [8.05, -1.75], [11.6, -1.75], [12.3, -0.7], [31.9, -0.7]],
  yawLake: [[42, -0.17], [42.95, -0.17], [43.2, 0.15], [49.9, 0.15], [50, 0]],
  arms: [[0, A0], [7.05, A0], [7.45, [[-1.05, -0.55], [0, 0]]], [11.5, [[-1.05, -0.55], [0, 0]]], [12.2, A0], [17.0, A0], [17.5, [[0.55, 0.12], [0, 0]]], [18.0, [[0.55, 0.12], [0, 0]]],
    [18.5, [[-1.15, 0.1], [0, 0]]], [18.85, [[-1.15, 0.1], [0, 0]]], [19.15, [[-0.95, 0.05], [-0.95, -0.05]]], [19.5, [[-0.95, 0.05], [-0.95, -0.05]]], [20.0, A0],
    [24.95, A0], [25.2, [[0, 0], [-2.05, -0.4]]], [25.9, [[0, 0], [-2.05, -0.4]]], [26.3, A0], [27.2, A0], [27.6, [[-0.9, 0.05], [0, 0]]], [28.7, [[-0.9, 0.05], [0, 0]]],
    [29.0, [[-1.55, 0.15], [0, 0]]], [30.3, [[-1.55, 0.15], [0, 0]]], [30.8, A0], [31.95, A0], [32, [[0, 0], [0.55, -0.1]]], [41.95, [[0, 0], [0.55, -0.1]]],
    [42, [[-0.95, 0.12], [-0.95, -0.12]]], [42.6, [[-0.95, 0.12], [-0.95, -0.12]]], [42.8, [[-1.15, 0.25], [0, 0]]], [43.1, [[-1.15, 0.25], [0, 0]]], [43.35, [[0, 0], [-0.85, -0.55]]],
    [44.4, [[0, 0], [-0.85, -0.55]]], [44.9, A0], [49.95, A0], [50, [[-0.45, 0.05], [-0.45, -0.05]]]],
  hold: [[0, [0, 0]], [6.9, [0, 0]], [7.05, [1, 1]], [31.95, [1, 1]], [32, [0, 1]], [41.95, [0, 1]], [42, [1, 1]]],
  head: [[0, [0, 0]], [7.3, [0, 0]], [7.6, [0.12, 0]], [7.9, [0.12, 0]], [8.1, [0, -0.6]], [11.6, [0, -0.6]], [12.2, [0, 0]], [24.95, [0, 0]], [25.2, [0.16, 0.15]], [25.9, [0.16, 0.15]], [26.3, [0, 0]],
    [28.9, [0.06, 0]], [30.4, [0.06, 0]], [31, [0.02, -0.1]], [31.95, [0, 0]], [32, [0, 0]], [41.95, [0, 0]], [42, [0.18, 0]], [43.1, [0.18, 0]], [43.3, [0, -0.5]], [44.5, [0, -0.5]], [45, [0, -0.45]],
    [49.9, [0.04, -0.45]], [50, [0, 0]], [52.0, [0, 0]], [52.6, [0.04, -0.12]]],
  roll: [[0, 0], [51.6, 0], [52.6, 0.12]],
  lean: [[0, 0]],
  bow: [[0, 0], [41.95, 0], [42, 0.3], [42.7, 0.3], [43.1, 0.12], [43.3, 0]],
  sit: [[0, 0], [49.95, 0], [50, 1]],
  sitAngle: [[0, -1.1]],
};
const RIDE_SEAT = -0.55;
// where a figure stands (page x, z, y) and which way it faces, through the whole film
function placeOf(who, t) {
  const S = who === 'lady' ? LADY : BUTLER;
  if (t >= RIDE.t0 && t < RIDE.t1) {
    if (who === 'lady') { const p = sledW(t); return { x: p.x + p.dir[0] * RIDE_SEAT, z: p.z + p.dir[1] * RIDE_SEAT, yaw: yawOfW(p.dir), seated: true }; }
    const p = ROUTE.at(RIDE_S(t) + RIDE.lead); return { x: p.x, z: p.z, yaw: yawOfW(p.dir), seated: false };
  }
  const [x, z] = L2W(...keysAt(t, S.pos));
  const yaw = t < RIDE.t0 ? HOUSE.yaw + keysAt(t, S.yawYard) : YAW_F + keysAt(t, S.yawLake);
  return { x, z, yaw, seated: keysAt(t, S.sit) > 0.5 };
}
const walkTable = (who) => { const dt = 1 / 240, n = Math.ceil((DUR + 0.5) / dt), out = new Float64Array(n + 1); let prev = placeOf(who, 0); for (let i = 1; i <= n; i++) { const p = placeOf(who, i * dt), d = Math.hypot(p.x - prev.x, p.z - prev.z); out[i] = out[i - 1] + (d < 0.5 ? d : 0); prev = p; } return (t) => { const f = clamp(t / dt, 0, n), i = Math.floor(f), j = Math.min(n, i + 1); return out[i] + (out[j] - out[i]) * (f - i); }; };
const WALK = { lady: walkTable('lady'), butler: walkTable('butler') };
const speedOf = (who, t) => { const a = placeOf(who, t - 0.04), b = placeOf(who, t + 0.04), d = Math.hypot(b.x - a.x, b.z - a.z); return d > 0.4 ? 0 : d / 0.08; };
// who speaks now, and how wide the voice is (the approved track's envelope, 30 fps)
const speakerAt = (t) => LINES.find((L) => t >= L.start - 0.04 && t <= L.end + 0.04) || null;
const envAt = (t) => { const i = Math.round(t * 30); return i >= 0 && i < ENV.length ? +ENV[i] / 9 : 0; };
function poseFigure(fig, who, t) {
  const S = who === 'lady' ? LADY : BUTLER, P = placeOf(who, t), U = fig.userData;
  const sit = keysAt(t, S.sit), seatY = SEAT + 0.07 - U.hipY;
  fig.position.set(P.x, 0.02 + (sit > 0.5 ? seatY : 0), P.z); fig.rotation.y = P.yaw;
  const gait = sit > 0.5 ? 0 : clamp(speedOf(who, t) / 1.4);
  const spk = speakerAt(t), talking = spk && spk.who === who, e = talking ? envAt(t) : 0;
  const hard = talking && [2, 4, 5, 6, 8].includes(spk.id) ? 1.6 : 1;   // the scolding and the shouting nod harder
  const head = keysAt(t, S.head).slice(), arms = keysAt(t, S.arms).map((a) => a.slice());
  head[0] += e * 0.05 * hard * Math.sin(t * 2 * Math.PI * 2.6) + e * 0.025;
  head[1] += e * 0.04 * hard * Math.sin(t * 2 * Math.PI * 1.3 + 0.7);
  let lean = keysAt(t, S.lean), bow = keysAt(t, S.bow) + 0.02 * gait;
  if (who === 'lady') {
    const shiver = sm(12.7, 12.9, t) * (1 - sm(13.6, 14.0, t)); lean += 0.035 * shiver * Math.sin(t * 2 * Math.PI * 9);   // the cold
    if (t > 33.75 && t < 34.75) { const w = Math.sin(t * 2 * Math.PI * 3.2) * 0.22; arms[0][0] += w; arms[1][0] -= w; head[1] += 0.12 * Math.sin(t * 2 * Math.PI * 2.4); }   // 慢点慢点
    if (t > 36.1 && t < 38.4) arms[0][1] += 0.18 * Math.sin(t * 2 * Math.PI * 2.2);
    if (t > 39 && t < 42) { const w = 0.12 * Math.sin(t * 2 * Math.PI * 1.6); arms[0][1] += w; arms[1][1] += w; }
  } else {
    const laugh = sm(25.0, 25.15, t) * (1 - sm(25.8, 26.0, t)); lean += 0.025 * laugh * Math.sin(t * 2 * Math.PI * 7.5); bow += 0.05 * laugh;
    if (t > 29.0 && t < 30.3) arms[0][1] += 0.12 * Math.sin((t - 29) * 2 * Math.PI * 2.4);   // the wipe
    if (t > 42 && t < 42.65) { const w = 0.15 * Math.abs(Math.sin((t - 42) * 2 * Math.PI * 2.5)); arms[0][0] += w; arms[1][0] += w; }   // patting the snow
  }
  U.body.rotation.x = bow;
  U.pose({ walked: WALK[who](t), gait, arms, hold: keysAt(t, S.hold), head, roll: keysAt(t, S.roll), sit, sitAngle: keysAt(t, S.sitAngle), lean });
  if (gait < 0.05 && sit < 0.5) U.body.position.y = 0.008 * Math.sin(t * 2.1 + (who === 'lady' ? 0 : 1.3));   // breathing
  // the mouth opens with the voice
  U.mouth.visible = e > 0.08; U.mouth.scale.set(0.85 + 0.15 * e, Math.max(0.15, e), 1);
}
const springIn = (u) => (u <= 0 ? 0 : 1 - Math.exp(-5 * u) * Math.cos(7.2 * u));       // ~10 % overshoot, a quiver, settled by ~1
const slowRise = (u) => (u <= 0 ? 0 : clamp(sm(0, 1, u) + 0.06 * Math.sin(Math.PI * clamp((u - 0.75) / 0.5)), 0, 1.06));
const DOOR_T = 6.1, SCARF_T = 19.35, CATCH_T = 7.6, CAT_T = 42.05, PAGE_T = 56.5;
const doorOpen = (t) => springIn((t - DOOR_T) / 0.95);

// the flakes: heavy goose-feather snow over the cottage, the lane and the lake; the one he catches is scripted
const roofAt = (x, z) => {
  const [u, v] = W2L(x, z), { w, d, wallH, roofH, ov } = HOUSE;
  if (Math.abs(u) > w / 2 + ov || v > ov + 0.1 || v < -d - ov - 0.1) return null;
  const s = (v + d / 2) / (d / 2), y = wallH + roofH * (1 - Math.min(1, Math.abs(s))) + 0.07;
  const n = [0, d / 2, Math.sign(s || 1) * roofH], L = Math.hypot(...n);
  return { y, n: [(n[0] * hc + n[2] * hs) / L, n[1] / L, (-n[0] * hs + n[2] * hc) / L] };
};
const landAt = (x, z) => roofAt(x, z) || { y: 0, n: [0, 1, 0] };
const flakes = createFlakes({ scene: H.scene, box: { x0: -30, x1: 46, z0: -34, z1: 22 }, top: 16, count: flags.TEST ? 60 : 2600, size: [0.42, 0.95], fall: [0.9, 1.4], rest: [5, 9], wind: [0.3, 0.12], landAt,
  active: (t) => 0.62 + 0.38 * sm(4, 30, t) });
const palm = new THREE.Mesh(flakeGeometry(0.16), flakes.material); palm.name = 'life'; palm.scale.setScalar(0.42); palm.visible = false; H.scene.add(palm);
const _hand = new THREE.Vector3(), _e = new THREE.Euler();
function placePalmFlake(t) {
  if (!FIG || t < 6.9 || t > 11.7) { palm.visible = false; return; }
  const arm = FIG.butler.userData.arms[0]; arm.updateWorldMatrix(true, false);
  _hand.set(0, -1.05, 0.0).applyMatrix4(arm.matrixWorld); _hand.y += 0.11;
  const u = clamp((t - 6.9) / (CATCH_T - 6.9)), e = 1 - (1 - u) * (1 - u), sway = (1 - e) * 0.55;
  palm.position.set(_hand.x + 0.35 * (1 - e) + Math.sin(t * 2.6) * sway, _hand.y + 3.4 * (1 - e) * (1 - e * 0.25), _hand.z - 0.2 * (1 - e) + Math.cos(t * 2.1) * sway * 0.5);
  const fl = sm(CATCH_T - 0.5, CATCH_T, t);
  _e.set(lerp(-0.8 + 0.4 * Math.sin(t * 1.7), -Math.PI / 2, fl), t * 0.6 * (1 - fl) + 0.4, lerp(0.35 * Math.sin(t * 1.3), 0, fl), 'YXZ'); palm.quaternion.setFromEuler(_e);
  palm.scale.setScalar(0.42 * (1 - sm(10.5, 11.6, t)));
  palm.visible = true;
}
// soft out-of-focus flakes drifting just before the lens (the Korean-drama snow): camera-space, deterministic
const BOKEH = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
  const items = Array.from({ length: flags.TEST ? 0 : 46 }, (_, i) => {
    const h = (k) => { let x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: h(9) < 0.3 ? '#ffe2b8' : '#f2f5ff', transparent: true, opacity: 0.25 + 0.35 * h(1), depthWrite: false, depthTest: false }));
    m.renderOrder = 10; m.name = 'life'; H.scene.add(m);
    return { m, x: h(2) * 2 - 1, y: h(3), d: 3.2 + h(4) * 4.5, v: 0.05 + h(5) * 0.06, s: 0.09 + h(6) * 0.22, w: h(7) * 6.28, f: 0.2 + h(8) * 0.3 };
  });
  const r = new THREE.Vector3(), u = new THREE.Vector3(), fw = new THREE.Vector3();
  return { update(t, cam) {
    cam.updateMatrixWorld(); r.setFromMatrixColumn(cam.matrixWorld, 0); u.setFromMatrixColumn(cam.matrixWorld, 1); fw.setFromMatrixColumn(cam.matrixWorld, 2).negate();
    const th = Math.tan(13 * DEG);
    for (const b of items) {
      const hh = th * b.d, ww = hh * 16 / 9, yy = (((b.y - b.v * t) % 1) + 1) % 1, xx = b.x + 0.06 * Math.sin(t * b.f * 6.28 + b.w);
      b.m.position.copy(cam.position).addScaledVector(fw, b.d).addScaledVector(r, xx * ww * 1.1).addScaledVector(u, (yy * 2 - 1) * hh * 1.15);
      b.m.scale.setScalar(b.s * b.d * 0.18);
    }
  } };
})();

// ---- 10. timeline -----------------------------------------------------------------------------------------------------
H.cue(0.2, () => { for (const h of H.hinges) if (!DEFER.has(h)) H.fold(h, true, 0.05 + h.order * 0.075 + h.jit); });   // the world rises, front to back
H.cue(DOOR_T, () => { const p = new THREE.Vector3(); HOUSE_PARTS.doorPivot.getWorldPosition(p); p.project(H.camera); H.recordFlap({ size: 0.55, up: true, pan: clamp(p.x, -1, 1) * 0.6, distance: 2 }); });
H.cue(SCARF_T, () => H.recordFlap({ size: 0.25, up: false, pan: 0.05, distance: 0 }));
H.cue(CATCH_T, () => H.recordFlap({ size: 0.08, up: false, pan: 0.1, distance: 0 }));
H.cue(29.0, () => H.recordFlap({ size: 0.12, up: false, pan: 0, distance: 0 }));
for (const L of late) H.cue(L.t0, () => H.recordFlap({ size: 0.45, up: true, pan: 0, distance: 3 }));
for (const L of LANE) if (L.t) { H.cue(L.t, () => H.fold(L.h, false, 0)); H.cue(L.t + 1.15, () => H.fold(L.h, true, 0)); }
if (W.cat) H.cue(CAT_T, () => H.fold(W.cat.h, true, 0));
for (const tw of [42.75, 43.0]) H.cue(tw, () => H.recordFlap({ size: 0.06, up: true, pan: 0.2, distance: 0 }));
H.cue(PAGE_T, () => H.recordFlap({ size: 1, up: true, pan: -0.6, distance: 4 }));
const steps = { lady: 0, butler: 0 };
const life = flags.TEST ? null : createLife({ scene: H.scene, camera: H.camera, heroHeight: 3.4, seed: 41, wind: [0.94, 0.34] });
if (life) {
  life.puffs({ at: LIFE.chimneys, perEmitter: 4, life: 5, rise: 0.4, size: [0.3, 0.6], colors: ['#dfe4f0', '#cfd6e6'], night: 1 });
  life.puffs({ at: [{ object: FIG.lady.userData.mug, offset: [0, 0.3, 0] }], perEmitter: 4, life: 2.2, rise: 0.12, size: [0.015, 0.05], drift: 0.04, wobble: 0.012, colors: ['#f4f2ee', '#e8e6e2'], night: 1 });
  life.setNight(1); life.reset(H.target);
}
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const keepUpright = (obj, ref) => { obj.parent.getWorldQuaternion(_q1); ref.getWorldQuaternion(_q2); obj.quaternion.copy(_q1.invert().multiply(_q2)); };
const BACK = { idx: -1, at: new THREE.Vector3(1e3, -50, 1e3) };
let lampBase = null;
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
H.onStep((t, dt) => {
  if (FIG) {
    const L = FIG.lady.userData, B = FIG.butler.userData;
    FIG.butler.visible = t >= 5.4; FIG.lady.visible = t >= 11.6;
    poseFigure(FIG.lady, 'lady', t); poseFigure(FIG.butler, 'butler', t);
    // props: the folded scarf, then worn; the cocoa from behind his back into her hands; the foam; the handkerchief
    const lift = sm(SCARF_T - 0.35, SCARF_T, t);
    B.carry.rotation.x = -1.5 * lift; B.carry.visible = t < SCARF_T;
    L.scarfPivot.visible = t >= SCARF_T; L.scarfPivot.rotation.x = -Math.PI / 2 * (1 - springIn((t - SCARF_T) / 0.7));
    B.mug.visible = t >= 18.05 && t < 18.85;
    L.mug.visible = (t >= 18.85 && t < 31.95) || t >= 50;
    B.kerchief.visible = t >= 27.45 && t < 30.7;
    L.foam.visible = t >= 24.85 && t < 30.2; L.foam.scale.set(1 - 0.85 * sm(29.2, 30.15, t), 1 - 0.5 * sm(29.2, 30.15, t), 1);
    FIG.lady.updateMatrixWorld(true); FIG.butler.updateMatrixWorld(true);
    for (const [m, f] of [[L.mug, FIG.lady], [B.mug, FIG.butler], [B.kerchief, FIG.butler]]) keepUpright(m, f.userData.body);
    if (!L.mug.visible) L.mug.rotation.x += Math.PI / 2;    // no steam from a mug that is not there
    // soft footsteps on the snow, one per step walked
    for (const [name, fig, len] of [['lady', FIG.lady, 0.62], ['butler', FIG.butler, 0.78]]) {
      const n = Math.floor(WALK[name](t) / len);
      if (n !== steps[name] && fig.visible) { steps[name] = n; H.recordStep({ surface: 'grass', foot: n & 1, pan: clamp(_v.copy(fig.position).project(H.camera).x, -1, 1) * 0.5 }); }
    }
  }
  // the sled: parked by the cottage, the ride, then a bench on the shore; the rope while he pulls it
  if (W.sled) {
    let x, z, yaw;
    if (t < RIDE.t0) { [x, z] = L2W(...SLED_PARK.uv); yaw = SLED_PARK.yaw; }
    else if (t < RIDE.t1) { const p = sledW(t); x = p.x; z = p.z; yaw = yawOfW(p.dir); }
    else { [x, z] = L2W(...LK(0, 0)); yaw = YAW_R; }
    W.sled.position.set(x, 0.02, z); W.sled.rotation.y = yaw;
    W.rope.visible = t >= RIDE.t0 && t < RIDE.t1 && !!FIG;
    if (W.rope.visible) {
      const arm = FIG.butler.userData.arms[1]; arm.updateWorldMatrix(true, false); _a.set(0, -1.05, 0.05).applyMatrix4(arm.matrixWorld);
      _b.set(0, 0.42, 1.5).applyMatrix4(W.sled.matrixWorld);
      W.rope.position.copy(_a).add(_b).multiplyScalar(0.5); W.rope.scale.set(1, _a.distanceTo(_b), 1);
      W.rope.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _b.sub(_a).normalize());
    }
  }
  // the cat snowman's twig whiskers, poked in one by one
  if (W.cat) W.cat.twigs.forEach((m, i) => { const t0 = [42.75, 43.0][i], k = sm(t0, t0 + 0.22, t), s = i ? 1 : -1; m.visible = t >= t0; m.position.x = s * (0.5 + 0.45 * (1 - k)); });
  // the book's left page folds up halfway at the end
  if (W.page) W.page.leaf.rotation.x = 1.62 * inOut((t - PAGE_T) / 3.3);
  if (HOUSE_PARTS.doorPivot) HOUSE_PARTS.doorPivot.rotation.y = -1.95 * doorOpen(t);
  for (const L of late) L.pivot.rotation.x = (-Math.PI / 2 + 0.01) * (1 - slowRise((t - L.t0) / L.dur));
  // practical lights; the doorway's warmth grows as the door opens; the backlight rides behind whoever the shot is on
  if (H.lampLights.length) {
    lampBase ??= H.lampLights.map((P) => P.intensity);
    const k = clamp(doorOpen(t), 0, 1);
    H.lampLights.forEach((P, i) => { P.intensity = lampBase[i]; });
    if (H.spots.doorLamps) { const [a, b] = H.spots.doorLamps; H.lampLights[a].intensity = lampBase[a] * (0.15 + 0.85 * k); H.lampLights[b].intensity = lampBase[b] * (0.9 + 0.1 * Math.sin(t * 9.1) * Math.sin(t * 5.3)); }
    if (BACK.idx >= 0 && H.lampLights[BACK.idx]) { H.lampLights[BACK.idx].position.copy(BACK.at); H.lampLights[BACK.idx].intensity = lampBase[BACK.idx] * (t > 6 ? 1 : 0); }
  }
  flakes.update(t, H.camera.position);
  placePalmFlake(t);
  BOKEH.update(t, H.camera);
  if (life) life.update(dt, H.target);
});
H.onRestart(() => { steps.lady = steps.butler = 0; if (life) life.reset(H.target); });
// the cottage's own lights (their indices known): the open doorway's spill, the lantern by the door, the big window;
// then the moving backlight
{
  const [ax, az] = L2W(DOOR.u, 1.1), [bx, bz] = L2W(-0.3, 0.7), [wx, wz] = L2W(-2.25, 1.0);
  H.spots.doorLamps = [nLamps, nLamps + 1];
  lamp(ax, 1.8, az, 1.5, 11); lamp(bx, 3.3, bz, 0.7, 9); lamp(wx, 2.4, wz, 0.45, 8);
  BACK.idx = lamp(0, -50, 0, 0.75, 7.5);
}

// ---- 11. the camera: one slow move per shot; the focus and the backlight on the speaker --------------------------------
const focusOf = (t, c) => {
  if (!FIG || c.shot === 0) { const [x, z] = L2W(DOOR.u, 2.5); return [x, 2.2, z]; }
  const spk = speakerAt(t), f = spk ? FIG[spk.who] : null;
  if (f && f.visible) return [f.position.x, f.position.y + f.userData.height * 0.8, f.position.z];
  return c.tg;
};
let focusS = null, KEY0 = null;
const _Y = new THREE.Vector3(0, 1, 0);
// the moon key and the fill turn with the camera (a film cheat): every shot keeps the demo's light on the faces
function KEYTURN(L, yawDeg) {
  KEY0 ??= [L.key, L.fill].map((l) => l && l.position.clone().sub(l.target.position));
  [L.key, L.fill].forEach((l, i) => { if (l) l.position.copy(l.target.position).add(KEY0[i].clone().applyAxisAngle(_Y, (yawDeg - 4) * DEG)); });
}
if (!flags.TEST) H.setCameraController((t, dt, ctx) => {
  const c = camAt(t);
  ctx.target.set(...c.tg); ctx.camera.position.set(...camPos(c)); ctx.camera.lookAt(ctx.target);
  KEYTURN(ctx.lights, c.yaw);
  ctx.fitShadow(ctx.lights, ctx.target);
  const band = c.S.band; ctx.post.o.focusBand = band; ctx.post.o.ramp = 0.2 + band * 0.4; ctx.post.o.vignette = 0.5 - band * 0.5;
  const goal = focusOf(t, c), cut = CUTS.some((ct) => t >= ct && t - dt < ct);
  if (!focusS || cut || t < 0.05) focusS = goal.slice(); else for (let i = 0; i < 3; i++) focusS[i] += (goal[i] - focusS[i]) * Math.min(1, dt * 3);
  ctx.setFocus(...focusS);
  // the backlight: behind the subject as seen from this camera, high, warm (a streetlamp's rim on hair and shoulders)
  const sx = focusS[0], sz = focusS[2], cx = ctx.camera.position.x, cz = ctx.camera.position.z, d = Math.hypot(sx - cx, sz - cz) || 1;
  BACK.at.set(sx + (sx - cx) / d * 1.8, 3.6, sz + (sz - cz) / d * 1.8);
});

// the audio: the score (piano, harp, wind) under the paper sounds the harness logs
H.setMusicRenderer((sec, sr, from) => renderSoundtrack(sec, sr, from));
H.start();

// review hooks: the figures' card-clipping check, the shot table, the lane
window.__snow60 = {
  probe(names) { const out = {}; H.scene.traverse((o) => { if (names.includes(o.name)) { let v = true; for (let p = o; p; p = p.parent) v = v && p.visible; const w = new H.THREE.Vector3(); o.getWorldPosition(w); out[o.name] = { vis: v, w: w.toArray().map((x) => +x.toFixed(3)), s: o.parent.scale.toArray() }; } }); return out; },
  shots: SHOTS.map((s) => ({ name: s.name, t0: s.t0, t1: s.t1 })), lane: LANE.length, lines: LINES,
  clips(times = [7.5, 13, 15.5, 18.6, 19.5, 24.6, 26, 29.5, 33, 36, 40, 42.4, 43.5, 45, 47, 51, 53, 57]) {
    const out = [];
    for (const t of times) { poseFigure(FIG.lady, 'lady', t); poseFigure(FIG.butler, 'butler', t); for (const f of [FIG.lady, FIG.butler]) for (const c of cardClips(f)) out.push({ t, ...c }); }
    return out;
  },
};
