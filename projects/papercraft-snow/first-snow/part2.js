
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
