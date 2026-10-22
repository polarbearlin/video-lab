
// ================= 文案（字幕时间 = 画面时间）=================
const HOOK = [0, 3.0];
const COPY = [
  [3.05, 5.6, '很多快充，半小时就能冲到【80%】'],
  [5.6, 8.6, '剩下的【20%】，却可能还要再等半小时'],
  [8.7, 11.0, '手机坏了？不，它是【故意的】'],
  [12.5, 15.2, '充电，就是把【锂离子】搬进负极的“车位”'],
  [15.2, 19.0, '一开始车位全空，冲得【越快越好】'],
  [19.0, 22.0, '快满时，空车位【越来越难找】'],
  [22.0, 25.5, '还硬往里塞，锂就堆在表面，长出【“刺”】'],
  [25.5, 27.6, '电池老化、鼓包，甚至【短路】'],
  [27.6, 30.0, '所以过了 80%，手机【主动减速】'],
];
const BX = 400;   // 电池内部场景的 x
const hh = (t) => [Math.sin(t * 1.3) * .35 + Math.sin(t * 2.9) * .15, Math.cos(t * 1.1) * .3 + Math.sin(t * 2.3) * .12];

// ================= 每帧重画的画布 =================
let phoneTex, chartTex, gaugeState = {};
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function pctAt(t) {   // 手机屏幕上的电量
  if (t < .5) return 79; if (t < 10.4) return 80; return 80;
}
function drawPhone(t) {
  const { g } = phoneTex.userData, W = 600, H = 1200;
  g.clearRect(0, 0, W, H);
  g.fillStyle = K.white; rr(g, 0, 0, W, H, 96); g.fill();
  g.fillStyle = '#18181c'; rr(g, 26, 26, W - 52, H - 52, 76); g.fill();
  const sx = 46, sy = 46, sw = W - 92, sh = H - 92;
  g.save(); rr(g, sx, sy, sw, sh, 58); g.clip();
  const gr = g.createLinearGradient(0, sy, 0, sy + sh); gr.addColorStop(0, '#22303f'); gr.addColorStop(1, '#0f151c'); g.fillStyle = gr; g.fillRect(sx, sy, sw, sh);
  g.fillStyle = '#e9eef3'; g.font = '600 34px Sans'; g.fillText('21:30', sx + 44, sy + 62);
  g.fillStyle = '#000'; rr(g, W / 2 - 70, sy + 22, 140, 40, 20); g.fill();
  const fly = prog(t, 3.0, 3.18);
  if (t < 10.3) {
    // 大数字（3.0 s 跳出屏幕，变成 3D 里的小标签飞去曲线）
    g.globalAlpha = 1 - fly; g.textAlign = 'center';
    g.fillStyle = '#ffffff'; g.font = '800 250px Sans'; g.fillText(String(pctAt(t)), W / 2 - 40, 520);
    g.font = '700 110px Sans'; g.fillText('%', W / 2 + 175, 520); g.globalAlpha = 1;
    if (fly >= 1) { g.fillStyle = '#7d8a96'; g.font = '600 46px Sans'; g.fillText('已充至 80%', W / 2, 470); }
    // 充电环
    g.lineWidth = 16; g.strokeStyle = '#2d3b48'; g.beginPath(); g.arc(W / 2, 760, 120, 0, 7); g.stroke();
    const slow = t >= 1.0;
    g.strokeStyle = slow ? '#45c2b1' : '#ff8a3c'; g.lineCap = 'round'; g.beginPath(); g.arc(W / 2, 760, 120, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * .8 + (slow ? .02 * Math.sin(t * 2) : 0)); g.stroke();
    // 闪电
    g.fillStyle = slow ? '#45c2b1' : '#ff8a3c'; g.beginPath(); g.moveTo(W / 2 + 14, 690); g.lineTo(W / 2 - 34, 772); g.lineTo(W / 2 - 2, 772); g.lineTo(W / 2 - 14, 830); g.lineTo(W / 2 + 36, 744); g.lineTo(W / 2 + 4, 744); g.closePath(); g.fill();
    // 速度条：快充 → 被划掉 → 慢充（1.0 s 一下重击）
    const k = eBack(prog(t, 1.0, 1.3), 2.2);
    g.font = '700 44px Sans';
    if (t < 1.0) { g.fillStyle = '#ff8a3c'; rr(g, W / 2 - 170, 940, 340, 80, 40); g.fill(); g.fillStyle = '#fff'; g.fillText('快充 65W', W / 2, 996); }
    else {
      g.save(); g.translate(W / 2, 980); g.scale(k, k); g.fillStyle = '#45c2b1'; rr(g, -170, -40, 340, 80, 40); g.fill(); g.fillStyle = '#06201d'; g.fillText('慢充 10W', 0, 16); g.restore();
      g.globalAlpha = 1 - prog(t, 1.0, 1.4); g.fillStyle = '#ff8a3c'; rr(g, W / 2 - 170, 940 - 60 * prog(t, 1, 1.4), 340, 80, 40); g.fill(); g.globalAlpha = 1;
    }
    g.textAlign = 'left';
  } else {
    // 10.3 起：屏幕变成电池图标，电池里的颜色涨满整块屏幕（推进去的接力色）
    const u = eIO(prog(t, 10.35, 11.0)), fill = eIO(prog(t, 11.0, 11.7));
    g.globalAlpha = u; g.strokeStyle = '#e9eef3'; g.lineWidth = 18;
    rr(g, W / 2 - 150, 330, 300, 560, 40); g.stroke(); g.fillStyle = '#e9eef3'; rr(g, W / 2 - 60, 296, 120, 40, 12); g.fill();
    g.fillStyle = '#2c4258'; rr(g, W / 2 - 132, 348 + 524 * .2, 264, 524 * .8, 26); g.fill();
    g.globalAlpha = 1;
    if (fill > 0) { g.fillStyle = '#2c4258'; g.globalAlpha = fill; g.fillRect(sx, sy, sw, sh); g.globalAlpha = 1; }
  }
  g.restore();
  phoneTex.needsUpdate = true;
}
// 充电曲线：横轴时间 0–60 分钟，纵轴电量
const CH = { x0: 130, x1: 930, y0: 690, y1: 110 };
function curveAt(m) {   // m 分钟 → 电量 %
  return m <= 30 ? 10 + 70 * (m / 30) ** .92 : 80 + 20 * (1 - Math.exp(-(m - 30) / 9));
}
const cxy = (m, p) => [CH.x0 + (CH.x1 - CH.x0) * m / 60, CH.y0 - (CH.y0 - CH.y1) * p / 100];
function drawChart(t) {
  const { g } = chartTex.userData, W = 1000, H = 800;
  g.clearRect(0, 0, W, H);
  g.fillStyle = K.white; rr(g, 0, 0, W, H, 30); g.fill();
  g.fillStyle = '#f3ecdc'; rr(g, 22, 22, W - 44, H - 44, 18); g.fill();
  g.strokeStyle = K.ink; g.lineWidth = 6; g.beginPath(); g.moveTo(CH.x0, CH.y1 - 30); g.lineTo(CH.x0, CH.y0); g.lineTo(CH.x1 + 20, CH.y0); g.stroke();
  g.fillStyle = K.ink; g.font = '700 36px Sans'; g.fillText('电量', 40, 90); g.fillText('时间', CH.x1 - 30, CH.y0 + 70);
  g.font = '400 34px InsI'; g.fillStyle = '#7a6f60';
  [[0, '0'], [30, '30 分钟'], [60, '60 分钟']].forEach(([m, s]) => { const [x] = cxy(m, 0); g.fillText(s, x - 20, CH.y0 + 48); });
  [[80, '80%'], [100, '100%']].forEach(([p, s]) => { const [, y] = cxy(0, p); g.fillText(s, 34, y + 12); g.setLineDash([10, 12]); g.strokeStyle = '#cbbfa8'; g.lineWidth = 3; g.beginPath(); g.moveTo(CH.x0, y); g.lineTo(CH.x1, y); g.stroke(); g.setLineDash([]); });
  // 恒流段：0.8 s 画完（快）；恒压段：2.8 s 慢慢爬（慢）
  const a = eIO(prog(t, 3.45, 4.25)), b = prog(t, 5.6, 8.4);
  const seg = (m0, m1, u, col) => { if (u <= 0) return; g.strokeStyle = col; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); for (let i = 0; i <= 60; i++) { const m = m0 + (m1 - m0) * u * i / 60, [x, y] = cxy(m, curveAt(m)); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
  seg(0, 30, a, '#ff8a3c'); seg(30, 60, b, '#45c2b1');
  if (b > 0) { const m = 30 + 30 * b, [x, y] = cxy(m, curveAt(m)); g.fillStyle = '#45c2b1'; g.beginPath(); g.arc(x, y, 16, 0, 7); g.fill(); }
  const lab = (s, x, y, col, u) => { if (u <= 0) return; g.save(); g.translate(x, y); g.scale(eBack(u, 2), eBack(u, 2)); g.font = '800 40px Sans'; const w = g.measureText(s).width + 44; g.fillStyle = col; rr(g, -w / 2, -34, w, 64, 32); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(s, 0, 12); g.restore(); };
  lab('恒流 · 快', 330, 330, '#ff8a3c', prog(t, 4.3, 4.6));
  lab('恒压 · 慢', 720, 300, '#2fa595', prog(t, 6.0, 6.3));
  g.fillStyle = K.ink; g.font = '700 36px Sans'; g.textAlign = 'center';
  if (t > 4.55) { g.globalAlpha = prog(t, 4.55, 4.8); g.fillText('30 分钟 → 80%', 330, 420); }
  if (t > 7.9) { g.globalAlpha = prog(t, 7.9, 8.2); g.fillText('再 30 分钟 → 100%', 720, 210); }
  g.globalAlpha = 1; g.textAlign = 'left';
  chartTex.needsUpdate = true;
}

// ================= 搭场景 =================
const S = {};
let key, hemi, rim;
const CHART = { x: 50, z: -10, h: 44 };
const chartPx = (px, py) => { const w = CHART.h * 1000 / 800; return [CHART.x + (px / 1000 - .5) * w, (1 - py / 800) * CHART.h, CHART.z + .6]; };
const SLOT = (r, c) => [BX - 25 + c * 10, 14 + r * 11];
const IONS = [];
async function build() {
  paperN = await loadTex(TX + 'Paper004_2K-JPG_NormalGL.jpg', [1, 1], false);
  const [cardC, cardN, cardR, kraftC, kraftN, kraftR, whiteC] = await Promise.all([
    loadTex(TX + 'Cardboard002_2K-JPG_Color.jpg', [4.4, 1.4]), loadTex(TX + 'Cardboard002_2K-JPG_NormalGL.jpg', [4.4, 1.4], false), loadTex(TX + 'Cardboard002_2K-JPG_Roughness.jpg', [4.4, 1.4], false),
    loadTex(TX + 'Paper004_2K-JPG_Color.jpg', [4, 1.5]), loadTex(TX + 'Paper004_2K-JPG_NormalGL.jpg', [4, 1.5], false), loadTex(TX + 'Paper004_2K-JPG_Roughness.jpg', [4, 1.5], false),
    loadTex(TX + 'Paper001_2K-JPG_Color.jpg', [2, 2])]);
  // ---- 书桌（A）
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(320, 200), new THREE.MeshStandardMaterial({ map: cardC, normalMap: cardN, roughnessMap: cardR, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.x = 40; floor.receiveShadow = true; scene.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(320, 220), new THREE.MeshStandardMaterial({ map: kraftC, normalMap: kraftN, roughnessMap: kraftR, roughness: 1 }));
  wall.position.set(40, 100, -50); wall.receiveShadow = true; scene.add(wall);
  hemi = new THREE.HemisphereLight('#fff1dd', '#4a3420', .55); scene.add(hemi);
  key = new THREE.SpotLight('#ffd6a0', 3.2, 0, .62, .9, 0); scene.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0005; key.shadow.camera.near = 40; key.shadow.camera.far = 420;
  rim = new THREE.DirectionalLight('#a9c1ff', .45); rim.position.set(80, 90, -30); scene.add(rim);
  phoneTex = canvasTex(600, 1200, () => {}); drawPhone(0);
  S.phone = standee(phoneTex, 64, { pos: [0, 0, 0] }); S.phone.mesh.rotation.x = -.1;
  const stand = new THREE.Mesh(new THREE.BoxGeometry(26, 3, 12), new THREE.MeshStandardMaterial({ color: '#c9b48e', normalMap: paperN, roughness: .9 })); stand.position.set(0, 1.5, 3); stand.castShadow = stand.receiveShadow = true; scene.add(stand);
  const brick = new THREE.Mesh(new THREE.BoxGeometry(11, 13, 9), new THREE.MeshStandardMaterial({ map: whiteC, normalMap: paperN, roughness: .95 })); brick.position.set(-30, 6.5, 6); brick.castShadow = brick.receiveShadow = true; scene.add(brick);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-30, 4, 10.5), new THREE.Vector3(-26, .8, 18), new THREE.Vector3(-10, .8, 16), new THREE.Vector3(-2, .8, 9), new THREE.Vector3(0, 2.2, 4)]), 40, .8, 8), new THREE.MeshStandardMaterial({ color: '#f1ebe0', roughness: .8 }));
  cable.castShadow = true; scene.add(cable);
  // 速度贴纸：65W → 10W（1.0 s 盖章）
  const sticker = (txt, sub, bg, fg) => canvasTex(560, 300, (g, W, H) => { g.fillStyle = K.white; rr(g, 0, 0, W, H, 150); g.fill(); g.fillStyle = bg; rr(g, 18, 18, W - 36, H - 36, 132); g.fill(); g.fillStyle = fg; g.textAlign = 'center'; g.font = '900 110px Sans'; g.fillText(txt, W / 2, 160); g.font = '700 46px Sans'; g.fillText(sub, W / 2, 230); });
  S.fast = standee(sticker('65W', '快充', '#ff8a3c', '#fff'), 9, { pos: [21, 30, 8], center: true });
  S.slow = standee(sticker('10W', '慢充', '#45c2b1', '#06201d'), 9.5, { pos: [22, 30, 9], center: true });
  // 充电曲线：立体书式翻起
  chartTex = canvasTex(1000, 800, () => {}); drawChart(0);
  S.chart = standee(chartTex, CHART.h, { pos: [CHART.x, 0, CHART.z] });
  S.chip = standee(canvasTex(420, 220, (g, W, H) => { g.fillStyle = K.white; rr(g, 0, 0, W, H, 110); g.fill(); g.fillStyle = '#ff8a3c'; rr(g, 16, 16, W - 32, H - 32, 94); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '900 130px Sans'; g.fillText('80%', W / 2, 155); }), 8, { pos: [0, 40, 3], center: true }); S.chip.mesh.castShadow = false;

  // ---- 电池内部（B）：上面正极、中间隔膜、下面负极石墨"停车场"
  const navy = (c, rep = [3, 2]) => { const m = whiteC.clone(); m.repeat.set(...rep); m.needsUpdate = true; return new THREE.MeshStandardMaterial({ color: c, map: m, normalMap: paperN, normalScale: new THREE.Vector2(.8, .8), roughness: 1 }); };
  const bfloor = new THREE.Mesh(new THREE.PlaneGeometry(200, 160), navy('#3d5875')); bfloor.rotation.x = -Math.PI / 2; bfloor.position.set(BX, 0, 20); bfloor.receiveShadow = true; scene.add(bfloor);
  const bwall = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), navy('#4a6a8c')); bwall.position.set(BX, 100, -30); bwall.receiveShadow = true; scene.add(bwall);
  const box = (w, h, d, mat, p) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(...p); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
  box(68, 24, 12, navy('#b9573f', [1, .5]), [BX, 112, -2]);                                     // 正极
  S.sep = box(70, 1.4, 18, navy('#efe6d4', [1, .3]), [BX, 88, 0]);                             // 隔膜
  S.anode = new THREE.Group(); S.anode.position.set(BX, 0, 0); scene.add(S.anode);
  const back = new THREE.Mesh(new THREE.BoxGeometry(66, 70, 4), navy('#2a2f36', [1, 1])); back.position.set(0, 40, -6); back.receiveShadow = true; S.anode.add(back);
  for (let r = 0; r <= 6; r++) { const l = new THREE.Mesh(new THREE.BoxGeometry(66, 1.6, 12), navy('#3b4048', [1, .2])); l.position.set(0, 8.5 + r * 11, 0); l.castShadow = l.receiveShadow = true; S.anode.add(l); }
  // 锂离子：橙色纸圆片
  const ionM = new THREE.MeshStandardMaterial({ color: '#ff8a3c', emissive: '#ff5a10', emissiveIntensity: .35, normalMap: paperN, roughness: .7 });
  const ionG = new THREE.CylinderGeometry(3.4, 3.4, 1.2, 28); ionG.rotateX(Math.PI / 2);
  const plus = canvasTex(128, 128, (g) => { g.fillStyle = '#fff'; g.fillRect(52, 24, 24, 80); g.fillRect(24, 52, 80, 24); });
  for (let i = 0; i < 46; i++) {
    const m = new THREE.Mesh(ionG, ionM); m.castShadow = true;
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ map: plus, transparent: true, depthWrite: false })); pl.position.z = .65; m.add(pl);
    scene.add(m); IONS.push(m);
  }
  // 枝晶（灰色金属"刺"）
  const spikeM = new THREE.MeshStandardMaterial({ color: '#dfe5ec', emissive: '#556070', emissiveIntensity: .4, metalness: .6, roughness: .3 });
  S.spikes = [[-21, 0], [11, 1], [-3, 2]].map(([x]) => { const g = new THREE.ConeGeometry(2.6, 1, 6); g.translate(0, .5, 0); const m = new THREE.Mesh(g, spikeM); m.position.set(BX + x, 75.4, 7); m.castShadow = true; scene.add(m); return m; });
  // 标签贴纸（踩拍弹出）
  const tag = (s, bg) => canvasTex(460, 160, (g, W, H) => { g.fillStyle = K.white; rr(g, 0, 0, W, H, 30); g.fill(); g.fillStyle = bg; rr(g, 12, 12, W - 24, H - 24, 22); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '800 78px Sans'; g.fillText(s, W / 2, 108); });
  S.tagP = standee(tag('正极', '#8f3a26'), 7, { pos: [BX - 39, 96, 14], center: true });
  S.tagS = standee(tag('隔膜', '#6b6255'), 7, { pos: [BX + 39, 93, 14], center: true });
  S.tagN = standee(tag('负极·石墨', '#20252c'), 7, { pos: [BX + 36, 4, 14], center: true });
  S.tagI = standee(tag('锂离子', '#e0702a'), 7, { pos: [BX - 37, 85, 14], center: true });
  // 慢充的"闸门"：隔膜上方两片纸，最后几秒合拢
  S.gate = [-1, 1].map((sgn) => box(30, 3, 3, navy('#efe6d4', [1, .3]), [BX + sgn * 22, 91, 9]));
}

// ================= 离子路线 =================
const ORDER = []; for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) ORDER.push([r, [2, 3, 1, 4, 0, 5][c]]);
const SCHED = [];
for (let i = 0; i < 6; i++) SCHED.push({ s: 12.7 + i * .4, d: 1.0, slot: i });
for (let i = 0; i < 22; i++) SCHED.push({ s: 15.25 + i * .16, d: .55, slot: 6 + i });
for (let i = 0; i < 6; i++) SCHED.push({ s: 19.1 + i * .46, d: 1.3, slot: 28 + i, hunt: true });
for (let i = 0; i < 12; i++) SCHED.push({ s: 22.05 + i * .24, d: .45, pile: i });
const cathode = (i) => [BX - 23 + (i % 12) * 4.2, 104 + Math.floor(i / 12) * 5.2, 5];
function along(pts, u) { const n = pts.length - 1, k = Math.min(n - 1, Math.floor(u * n)), f = eIO(u * n - k); return pts[k].map((v, j) => lerp(v, pts[k + 1][j], f)); }
function ionPos(i, t) {
  let sc = SCHED[i], tt = t;
  if (sc.pile !== undefined) {
    if (t >= 27.6 && t < 28.35) tt = lerp(26.9, 21.9, eIO(prog(t, 27.6, 28.3)));   // 倒回去
    else if (t >= 28.35) { if (sc.pile < 2) sc = { s: 28.45 + sc.pile * .8, d: 1.3, slot: 34 + sc.pile }; else tt = 21.9; }
  }
  const p0 = cathode(i);
  if (tt < sc.s) return p0;
  const u = clamp((tt - sc.s) / sc.d);
  const hx = BX + ((i * 7) % 5 - 2) * 6;
  if (sc.slot !== undefined) {
    const [r, c] = ORDER[sc.slot], [x, y] = SLOT(r, c);
    const pts = [p0, [hx, 91, 9], [hx, 86, 9], [x, y, 9], [x, y, 1.5]];
    const p = along(pts, u);
    if (sc.hunt && u > .5 && u < .8) p[0] += Math.sin((u - .5) * 40) * 14 * (1 - (u - .5) / .3);   // 找车位：左右试探
    return p;
  }
  const px = BX - 26 + (sc.pile % 6) * 8.6 + (sc.pile >= 6 ? 4.3 : 0), py = 78.6 + (sc.pile >= 6 ? 5 : 0);
  return along([p0, [hx, 91, 9], [px, py, 3]], u);
}

// ================= 镜头 =================
const CAM = [
  [0, 2, 44, 96, 2, 42, 0], [2.8, 0, 43, 90, 0, 42, 0], [3.55, 34, 31, 112, 36, 28, -5], [4.5, 38, 30, 104, 40, 26, -6], [8.4, 42, 28, 96, 44, 26, -6],
  [9.2, 0, 38, 80, 0, 37, 0], [10.6, 0, 38, 70, 0, 37, 0], [11.85, 0, 36.5, 7, 0, 36.5, 0],
  [11.86, BX, 60, 60, BX, 58, 0], [13.0, BX, 58, 195, BX, 56, 0], [15.2, BX, 58, 190, BX, 56, 0], [19.0, BX, 57, 172, BX, 55, 0], [22.0, BX, 70, 120, BX, 70, 0],
  [25.5, BX, 74, 104, BX, 74, 0], [26.0, BX, 58, 195, BX, 56, 0], [27.6, BX, 58, 193, BX, 56, 0], [30, BX, 57, 178, BX, 55, 0]];
function setCam(t) {
  let k = 0; while (k < CAM.length - 1 && t > CAM[k + 1][0]) k++;
  const A = CAM[k], B = CAM[Math.min(k + 1, CAM.length - 1)];
  const u = A === B || B[0] - A[0] < .05 ? (t >= B[0] ? 1 : 0) : eIO((t - A[0]) / (B[0] - A[0]));
  const v = A.map((a, j) => lerp(a, B[j], u));
  const still = (t > 9.4 && t < 10.6) || t > 29.2;
  const [jx, jy] = hh(t), q = still ? .15 : 1;
  let sx = 0, sy = 0; [[1.0, .6], [22.6, .5], [23.6, .5], [24.6, .5], [25.4, 2.2]].forEach(([h, a]) => { const d = t - h; if (d > 0 && d < .6) { sx += a * Math.exp(-d * 10) * Math.sin(d * 70); sy += a * Math.exp(-d * 10) * Math.cos(d * 63); } });
  camera.position.set(v[1] + jx * q + sx, v[2] + jy * q + sy, v[3]);
  camera.lookAt(v[4] + jx * q * .6, v[5] + jy * q * .6, v[6]);
  key.position.set(v[1] - 70, 150, 110); key.target.position.set(v[4], v[5] - 10, 0); key.target.updateMatrixWorld();
  rim.position.set(v[1] + 80, 90, -30);
  const inB = v[1] > 200;
  hemi.color.set(inB ? '#dfe8ff' : '#fff1dd'); hemi.groundColor.set(inB ? '#1c2a3a' : '#4a3420'); hemi.intensity = inB ? .75 : .55;
  key.color.set(inB ? '#ffe6c8' : '#ffd6a0');
  scene.background.set(inB ? '#152230' : '#2a1d12');
}

// ================= 动画 =================
function animate(t) {
  drawPhone(t); drawChart(t);
  // 贴纸：65W 在第一帧就在；1.0 s 被 10W 盖住
  S.fast.hinge.visible = t < 1.25 && t < 11.8;
  S.fast.mesh.scale.setScalar(1 - .3 * prog(t, 1.0, 1.25));
  popScale(S.slow, t, 1.0, 2.9);
  // 曲线卡 3.2 s 翻起
  pop(S.chart, t, 3.2, 1e9, .5); if (t > 11.9) S.chart.hinge.visible = false;
  // 80% 小标签：3.0 从屏幕数字处跳出 → 4.25 落到曲线 80% 那个点上
  const [dx, dy, dz] = chartPx(...cxy(30, 80));
  if (t >= 3.0 && t < 11.0) {
    S.chip.hinge.visible = true;
    const u = eIO(prog(t, 3.0, 4.25)), arc = Math.sin(Math.PI * u) * 14;
    S.chip.hinge.position.set(lerp(-1, dx, u), lerp(40, dy + 4.2, u) + arc, lerp(4, dz + .5, u));
    const s = lerp(1.5, .62, u) * (1 + .25 * Math.exp(-Math.max(0, t - 4.25) * 9) * Math.sin(Math.max(0, t - 4.25) * 30));
    S.chip.mesh.scale.setScalar(s); S.chip.mesh.rotation.z = Math.sin(u * Math.PI) * .4;
  } else S.chip.hinge.visible = false;
  // 电池内部
  IONS.forEach((m, i) => { const p = ionPos(i, t); m.position.set(...p); m.visible = t > 11.8; });
  const tagUp = [[S.tagP, 12.55], [S.tagS, 12.85], [S.tagN, 13.15], [S.tagI, 13.45]];
  tagUp.forEach(([s, a]) => popScale(s, t, a, 15.0));
  const rew = t >= 27.6 && t < 28.35 ? lerp(26.9, 21.9, eIO(prog(t, 27.6, 28.3))) : t >= 28.35 ? 21.9 : t;
  S.spikes.forEach((m, j) => { const a = [22.6, 23.6, 24.6][j]; const h = rew < a ? 0 : eBack(prog(rew, a, a + .25), 2) * (j === 2 ? 7 + 5.2 * eIO(prog(rew, 24.9, 25.4)) : 7 + j * 2); m.scale.set(1, Math.max(.001, h), 1); m.visible = h > .01; });
  const bulge = t > 25.5 && t < 28.3 ? eBack(prog(t, 25.5, 25.9), 2) * (1 - eIO(prog(t, 27.6, 28.2))) : 0;
  S.anode.scale.set(1 + .05 * bulge, 1 + .04 * bulge, 1 + .2 * bulge);
  const gate = eIO(prog(t, 28.35, 28.9));
  S.gate.forEach((m, j) => { m.position.x = BX + (j ? 1 : -1) * lerp(48, 6.5, gate); m.visible = t > 28.3; });
}

// ================= UI 叠层：栏目角标、开头大标题、字幕、电量表、警告章 =================
const ov = document.getElementById('ov');
function capSVG(text, a, reveal) {
  const parts = []; let red = false; for (const c of text) { if (c === '【') { red = true; continue; } if (c === '】') { red = false; continue; } parts.push([c, red]); }
  let rows = [parts];
  if (parts.length > 13) { const mid = parts.length / 2; let best = -1; parts.forEach(([c], i) => { if (/[，、？]/.test(c) && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i; }); if (best > 0) rows = [parts.slice(0, best + 1), parts.slice(best + 1)]; }
  const size = 56; let k = 0, glyph = '', maxW = 0;
  const cw = (c) => /[0-9%A-Za-z ]/.test(c) ? size * .62 : size * 1.02;
  rows.forEach((row, r) => { const w = row.reduce((a, [c]) => a + cw(c), 0); maxW = Math.max(maxW, w); let x = -w / 2; row.forEach(([c, rd]) => { const p = clamp(reveal * parts.length - k); k++; if (p > 0) glyph += `<text x="${x + size / 2}" y="${r * 78 + (1 - p) * 10}" text-anchor="middle" font-family="Serif" font-weight="${rd ? 900 : 700}" font-size="${size}" fill="${rd ? '#C8322B' : '#1E1E1E'}" opacity="${p}">${c}</text>`.replace(`x="${x + size / 2}"`, `x="${x + cw(c) / 2}"`); x += cw(c); }); });
  const h = 112 + (rows.length - 1) * 78, y0 = 1690 - (rows.length - 1) * 78;
  return `<g opacity="${a}" transform="translate(540,${y0 + (1 - a) * 16})"><rect x="${-maxW / 2 - 46}" y="-76" width="${maxW + 92}" height="${h}" fill="#F6F0E2" transform="rotate(-1)"/><rect x="${-maxW / 2 - 46}" y="-76" width="12" height="${h}" fill="#C8322B" transform="rotate(-1)"/>${glyph}</g>`;
}
function gaugeAt(t) {
  if (t < 12.4) return null;
  let p, mode;
  if (t < 15.2) { p = lerp(10, 22, prog(t, 12.4, 15.2)); mode = 0; }
  else if (t < 19.0) { p = lerp(22, 72, eOut(prog(t, 15.2, 18.9))); mode = 0; }
  else if (t < 22.0) { p = lerp(72, 80, prog(t, 19.0, 21.9)); mode = 0; }
  else if (t < 27.6) { p = lerp(80, 86, prog(t, 22.0, 25.0)); mode = 1; }
  else if (t < 28.35) { p = lerp(86, 80, prog(t, 27.6, 28.3)); mode = 2; }
  else { p = lerp(80, 81.6, prog(t, 28.5, 30)); mode = 3; }
  return { p, mode };
}
function overlay(t) {
  let s = `<g transform="translate(64,96)"><rect width="300" height="60" fill="#1E1E1E" opacity=".85"/><text x="22" y="41" font-family="Sans" font-weight="800" font-size="28" fill="#F5D547">生活冷知识 · 01</text></g>`;
  // 开头大标题：第一帧就完整
  if (t < 3.3) {
    const out = eIO(prog(t, 2.85, 3.25));
    s += `<g transform="translate(540,${300 - out * 380}) rotate(-1.5)" opacity="${1 - out}">
      <rect x="-470" y="-120" width="940" height="290" fill="#F6F0E2"/><rect x="-470" y="-120" width="14" height="290" fill="#C8322B"/>
      <text x="0" y="-8" text-anchor="middle" font-family="Serif" font-weight="900" font-size="104" fill="#1E1E1E">充到 <tspan fill="#C8322B">80%</tspan>，</text>
      <text x="0" y="118" text-anchor="middle" font-family="Serif" font-weight="900" font-size="96" fill="#1E1E1E">为什么突然变慢了？</text></g>`;
  }
  const L = COPY.find(([a, b]) => t >= a - .1 && t < b + .1);
  if (L) { const [a, b, txt] = L; const al = eOut(prog(t, a - .1, a + .12)) * (1 - eOut(prog(t, b - .05, b + .1))); s += capSVG(txt, al, prog(t, a, a + .45)); }
  // 电量表（电池内部）：颜色和模式随剧情变
  const G = gaugeAt(t);
  if (G) {
    const inA = eBack(prog(t, 12.4, 12.8), 2);
    const col = ['#ff8a3c', '#C8322B', '#8a8a8a', '#2fa595'][G.mode], lab = ['快充 65W', '硬塞！', '◀◀ 倒回去', '慢充 10W'][G.mode];
    s += `<g transform="translate(830,140) scale(${inA})"><rect x="-190" y="-50" width="380" height="140" rx="26" fill="#F6F0E2"/>
      <rect x="-166" y="-28" width="200" height="96" rx="14" fill="none" stroke="#1E1E1E" stroke-width="7"/><rect x="38" y="4" width="12" height="32" rx="4" fill="#1E1E1E"/>
      <rect x="-156" y="-18" width="${180 * G.p / 100}" height="76" rx="8" fill="${col}"/>
      <text x="-66" y="34" text-anchor="middle" font-family="Sans" font-weight="900" font-size="46" fill="#1E1E1E">${Math.round(G.p)}%</text>
      <text x="120" y="10" text-anchor="middle" font-family="Sans" font-weight="800" font-size="30" fill="${col}">${lab.split(' ')[0]}</text>
      <text x="120" y="54" text-anchor="middle" font-family="Sans" font-weight="800" font-size="30" fill="${col}">${lab.split(' ')[1] || ''}</text></g>`;
  }
  // 短路警告章
  if (t > 25.45 && t < 27.7) {
    const k = 1 + 1.2 * Math.exp(-(t - 25.45) * 14), a = 1 - prog(t, 27.4, 27.7);
    s += `<g transform="translate(540,760) rotate(-8) scale(${k})" opacity="${a}"><rect x="-260" y="-90" width="520" height="180" rx="20" fill="none" stroke="#C8322B" stroke-width="16"/><text x="0" y="40" text-anchor="middle" font-family="Serif" font-weight="900" font-size="120" fill="#C8322B">短路风险</text></g>`;
  }
  const vig = `<defs><radialGradient id="v" cx=".5" cy=".46" r=".72"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#0c0806" stop-opacity=".5"/></radialGradient></defs><rect width="1080" height="1920" fill="url(#v)"/>`;
  // 接力色：推进屏幕的最后一刻，整屏是电池里的颜色
  const join = Math.max(0, Math.min(prog(t, 11.55, 11.85), 1 - prog(t, 11.95, 12.6)));
  const flash = t > 25.35 && t < 25.8 ? .85 * (1 - prog(t, 25.38, 25.8)) : 0;
  ov.innerHTML = `<svg viewBox="0 0 1080 1920" width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">${join > 0 ? `<rect width="1080" height="1920" fill="#2c4258" opacity="${join}"/>` : ''}${vig}${s}${flash > 0 ? `<rect width="1080" height="1920" fill="#fff" opacity="${flash}"/>` : ''}</svg>`;
}

window.renderAt = async (t) => {
  if (t >= 30) { V3D ? renderP3(t) : renderP2(t); return; }
  setCam(t); animate(t);
  renderer.render(scene, camera); overlay(t);
};
