
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
