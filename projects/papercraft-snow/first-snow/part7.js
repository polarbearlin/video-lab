
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
