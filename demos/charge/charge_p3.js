
// ================= 后 45 秒 · 3D 手机版（?v=3d）=================
// 一部真 3D 手机（代码建模的占位，Blender / Sketchfab 模型到了再替换）贯穿全段：纸雕世界 ⇄ 白色影棚 ⇄ 热成像 ⇄ 玻璃卡片清单
// 反差：粗糙的纸 vs 光滑的金属玻璃；纸雕段暖光硬影，影棚段纯白柔光 + 景深
const V3D = new URLSearchParams(location.search).get('v') === '3d';
const STU = 700;   // 白色影棚的 x
const PH = { H: 26 }; PH.W = PH.H * 71.6 / 147.6; PH.D = PH.H * 8.25 / 147.6;
let P3 = {}, comp3, bokeh, envTex, scr3, scrTex;
let THERM_PT = new THREE.Vector3(SX, 26, 10);

function squircle(w, h, r = 2.0, n = 4, seg = 24) {   // 圆角矩形，四角是超椭圆（像苹果的连续曲率圆角）
  r = Math.min(r, w / 2, h / 2);
  const s = new THREE.Shape(), C = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 1], [-w / 2 + r, -h / 2 + r, 2], [w / 2 - r, -h / 2 + r, 3]];
  let first = true;
  C.forEach(([cx, cy, q]) => {
    for (let i = 0; i <= seg; i++) {
      const a = (q + i / seg) * Math.PI / 2, c = Math.cos(a), si = Math.sin(a);
      const x = cx + Math.sign(c) * Math.abs(c) ** (2 / n) * r, y = cy + Math.sign(si) * Math.abs(si) ** (2 / n) * r;
      if (first) { s.moveTo(x, y); first = false; } else s.lineTo(x, y);
    }
  });
  s.closePath(); return s;
}
function uvFit(geo) {   // ShapeGeometry 的 UV 铺满 0–1
  geo.computeBoundingBox(); const b = geo.boundingBox, p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - b.min.x) / (b.max.x - b.min.x), (p.getY(i) - b.min.y) / (b.max.y - b.min.y));
  uv.needsUpdate = true; return geo;
}
// 本地 Agent 用 Blender 建的手机（assets/models/phone_agent/phone/phone.glb）：米制、Y 向上、屏幕朝 +Z、原点在机身中心
async function loadPhoneGLB() {
  const gltf = await new P3.GLTFLoader().loadAsync('/assets/models/phone_agent/phone/' + (new URLSearchParams(location.search).get('lo') ? 'phone_lo.glb' : 'phone.glb'));
  const root = gltf.scene, g = new THREE.Group(); root.scale.setScalar(PH.H / .1476); g.add(root);
  scrTex = canvasTex(620, 1306, () => {}); scr3 = scrTex.userData;
  const tune = { Frame: { color: '#8f9296', metalness: 1, roughness: .26 }, BackGlass: { color: '#cbc6bd', roughness: .5 }, FrontGlass: { roughness: .04 }, CameraPlateau: { roughness: .3 }, LensRing: { metalness: 1, roughness: .2 }, LensGlass: { roughness: .03 }, Buttons: { metalness: 1, roughness: .3 } };
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    if (o.name === 'Screen' || [].concat(o.material).some((m) => m.name === 'Screen')) {
      o.material = new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false }); P3.screen = o; return;
    }
    [].concat(o.material).forEach((m) => { Object.assign(m, tune[m.name] || {}); if (tune[m.name]?.color) m.color = new THREE.Color(tune[m.name].color); m.envMap = envTex; m.envMapIntensity = 1.2; m.needsUpdate = true; });
  });
  return g;
}
function makePhone() {
  const { W, H, D } = PH, g = new THREE.Group();
  const env = (m) => { m.envMap = envTex; m.envMapIntensity = 1.2; return m; };
  const frameM = env(new THREE.MeshPhysicalMaterial({ color: '#9a9c9f', metalness: 1, roughness: .28, clearcoat: .3 }));
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(squircle(W - .5, H - .5, 2.0), { depth: D - .5, bevelEnabled: true, bevelThickness: .25, bevelSize: .25, bevelSegments: 5, curveSegments: 24 }), frameM);
  body.position.z = -(D - .5) / 2; body.castShadow = true; g.add(body);
  const front = new THREE.Mesh(new THREE.ShapeGeometry(squircle(W - .12, H - .12, 2.2), 24), env(new THREE.MeshPhysicalMaterial({ color: '#060607', roughness: .04, clearcoat: 1, metalness: 0 })));
  front.position.z = D / 2 + .005; g.add(front);
  scrTex = canvasTex(620, 1280, () => {}); scr3 = scrTex.userData;
  const screen = new THREE.Mesh(uvFit(new THREE.ShapeGeometry(squircle(W - .62, H - .62, 1.9), 24)), new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false }));
  screen.position.z = D / 2 + .012; g.add(screen); P3.screen = screen;
  const glare = new THREE.Mesh(screen.geometry, env(new THREE.MeshPhysicalMaterial({ color: '#000', transparent: true, opacity: .18, roughness: .02, clearcoat: 1, depthWrite: false })));
  glare.position.z = D / 2 + .02; g.add(glare);
  const island = new THREE.Mesh(new THREE.ShapeGeometry(squircle(3.1, .95, .47, 2), 12), new THREE.MeshBasicMaterial({ color: '#000' }));
  island.position.set(0, H / 2 - 1.55, D / 2 + .03); g.add(island);
  const back = new THREE.Mesh(new THREE.ShapeGeometry(squircle(W - .7, H - .7, 1.9), 24), env(new THREE.MeshPhysicalMaterial({ color: '#c8c3ba', roughness: .5, clearcoat: .5, clearcoatRoughness: .4 })));
  back.position.z = -D / 2 - .005; back.rotation.y = Math.PI; g.add(back);
  // 摄像头凸台 + 三颗镜头
  const plat = new THREE.Mesh(new THREE.ExtrudeGeometry(squircle(6.4, 6.4, 1.6), { depth: .22, bevelEnabled: true, bevelThickness: .12, bevelSize: .12, bevelSegments: 4, curveSegments: 16 }), env(new THREE.MeshPhysicalMaterial({ color: '#bdb7ad', roughness: .25, clearcoat: .8 })));
  plat.rotation.y = Math.PI; plat.position.set(W / 2 - 3.9, H / 2 - 3.9, -D / 2 - .02); g.add(plat);
  const ringM = env(new THREE.MeshPhysicalMaterial({ color: '#8f9195', metalness: 1, roughness: .22 })), lensM = env(new THREE.MeshPhysicalMaterial({ color: '#0b0d14', roughness: .02, clearcoat: 1, metalness: .3 }));
  [[-1.45, 1.45], [-1.45, -1.45], [1.35, 0]].forEach(([dx, dy]) => {
    const cx = W / 2 - 3.9 - dx, cy = H / 2 - 3.9 + dy;   // 背面：x 镜像
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.28, .55, 48), ringM); ring.rotation.x = Math.PI / 2; ring.position.set(cx, cy, -D / 2 - .5); g.add(ring);
    const glass = new THREE.Mesh(new THREE.SphereGeometry(.95, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2.6), lensM); glass.rotation.x = -Math.PI / 2; glass.position.set(cx, cy, -D / 2 - .72); g.add(glass);
  });
  const flash = new THREE.Mesh(new THREE.CircleGeometry(.38, 24), new THREE.MeshStandardMaterial({ color: '#f3ecd8', emissive: '#4a4434' })); flash.rotation.y = Math.PI; flash.position.set(W / 2 - 3.9 - 1.4, H / 2 - 3.9 + 1.6, -D / 2 - .36); g.add(flash);
  // 侧键
  const btnM = frameM;
  [[W / 2 + .05, 3.2, 2.6], [-W / 2 - .05, 4.6, 1.6], [-W / 2 - .05, 2.4, 1.6]].forEach(([x, y, l]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(.18, l, .5), btnM); b.position.set(x, y, 0); g.add(b); });
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------- 屏幕内容（画布，每帧重画）
function scrBase(g, W, H, bg = '#0f151c') { g.clearRect(0, 0, W, H); g.fillStyle = bg; g.fillRect(0, 0, W, H); }
function drawScreen3(t) {
  const { g } = scr3, W = 620, H = scr3.c.height; g.textAlign = 'left';
  const mode = t < 36.4 ? 'night' : t < 46.4 ? 'set' : t < 51.0 ? 'game' : t < 62 ? 'game' : t < 72 ? 'home' : 'end';
  if (mode === 'night') {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#22303f'); gr.addColorStop(1, '#0b1016'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e9eef3'; g.font = '600 34px Sans'; g.fillText(t < 33.4 ? '23:00' : '04:12', 54, 74);
    const p = t < 33.3 ? 96 + 4 * prog(t, 30.8, 33.0) : 100;
    g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = '800 230px Sans'; g.fillText(String(Math.round(p)), W / 2 - 40, 560); g.font = '700 100px Sans'; g.fillText('%', W / 2 + 165, 560);
    g.lineWidth = 16; g.strokeStyle = '#2d3b48'; g.beginPath(); g.arc(W / 2, 800, 110, 0, 7); g.stroke();
    g.strokeStyle = p >= 100 ? '#ff453a' : '#30d158'; g.lineCap = 'round'; g.beginPath(); g.arc(W / 2, 800, 110, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p / 100); g.stroke();
    if (p >= 100) { g.fillStyle = '#ff453a'; g.font = '700 44px Sans'; g.fillText('100% · 仍在插电', W / 2, 1010); }
    const navyA = 1 - prog(t, 30.2, 30.9); if (navyA > 0) { g.globalAlpha = navyA; g.fillStyle = '#2c4258'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  } else if (mode === 'set') {
    scrBase(g, W, H, '#f2f2f7');
    g.fillStyle = '#1c1c1e'; g.font = '600 32px Sans'; g.fillText(t < 41.2 ? '23:00' : '06:30', 50, 72);
    g.fillStyle = '#ff9f0a'; g.font = '500 34px Sans'; g.fillText('‹ 电池', 34, 170);
    g.fillStyle = '#1c1c1e'; g.font = '800 76px Sans'; g.fillText('充电', 34, 270);
    g.fillStyle = '#fff'; rr(g, 26, 310, W - 52, 300, 30); g.fill();
    g.fillStyle = '#1c1c1e'; g.font = '600 38px Sans'; g.fillText('优化充电', 58, 382);
    g.fillStyle = '#8e8e93'; g.font = '400 26px Sans'; g.globalAlpha = prog(t, 38.3, 38.7); g.fillText('学习你的作息：先充到 80%，', 58, 430); g.fillText('快起床时再充满', 58, 466); g.globalAlpha = 1;
    const k = sp2(t - 38.0, 9, 13), on = t >= 38.0;
    g.fillStyle = on ? `rgb(${lerp(229, 52, clamp(k))},${lerp(229, 199, clamp(k))},${lerp(234, 89, clamp(k))})` : '#e5e5ea'; rr(g, W - 170, 352, 112, 66, 33); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(W - 137 + 46 * k, 385, 28, 0, 7); g.fill();
    g.strokeStyle = '#e5e5ea'; g.lineWidth = 2; g.beginPath(); g.moveTo(58, 500); g.lineTo(W - 26, 500); g.stroke();
    g.fillStyle = '#1c1c1e'; g.font = '600 38px Sans'; g.fillText('充电上限', 58, 568);
    const pill = t < 38.6 ? 0 : eBack(prog(t, 38.6, 38.9), 2.4); if (pill > 0) { g.save(); g.translate(W - 110, 556); g.scale(pill, pill); g.fillStyle = '#ff9f0a'; rr(g, -60, -32, 120, 60, 30); g.fill(); g.fillStyle = '#fff'; g.font = '700 34px Sans'; g.textAlign = 'center'; g.fillText('80%', 0, 12); g.restore(); g.textAlign = 'left'; }
    // 手指点按的涟漪
    const rp = prog(t, 37.95, 38.45); if (rp > 0 && rp < 1) { g.strokeStyle = `rgba(52,199,89,${1 - rp})`; g.lineWidth = 6; g.beginPath(); g.arc(W - 114, 385, 30 + rp * 90, 0, 7); g.stroke(); }
  } else if (mode === 'game') {
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#5b3fd1'); gr.addColorStop(1, '#ff6a4a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.save(); g.translate(W / 2, H / 2); g.rotate(Math.PI / 2); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '900 120px Sans'; g.fillText('VICTORY', 0, 40); g.restore();
    g.fillStyle = '#ffde59'; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc((i * 97 + t * 160) % W, (i * 211) % H, 10, 0, 7); g.fill(); }
  } else {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#18242f'); gr.addColorStop(1, '#0b1016'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = '800 230px Sans'; g.fillText('80', W / 2 - 40, 560); g.font = '700 100px Sans'; g.fillText('%', W / 2 + 165, 560);
    g.lineWidth = 16; g.strokeStyle = '#2d3b48'; g.beginPath(); g.arc(W / 2, 800, 110, 0, 7); g.stroke(); g.strokeStyle = '#34c759'; g.lineCap = 'round'; g.beginPath(); g.arc(W / 2, 800, 110, -Math.PI / 2, -Math.PI / 2 + Math.PI * 1.6); g.stroke();
    g.fillStyle = '#34c759'; rr(g, W / 2 - 170, 950, 340, 80, 40); g.fill(); g.fillStyle = '#062010'; g.font = '700 42px Sans'; g.fillText('已优化充电', W / 2, 1005);
  }
  scrTex.needsUpdate = true;
}

// ---------- 漂浮的玻璃卡片（影棚里）
function glassCard(w, h, draw) {
  const tex = canvasTex(Math.round(w * 40), Math.round(h * 40), draw);
  const m = new THREE.Mesh(uvFit(new THREE.ShapeGeometry(squircle(w, h, 1.4), 16)), new THREE.MeshPhysicalMaterial({ map: tex, transparent: true, roughness: .15, clearcoat: 1, envMap: envTex, envMapIntensity: .6 }));
  m.castShadow = true; scene.add(m); return m;
}
const cardBg = (g, W, H) => { g.fillStyle = 'rgba(255,255,255,.92)'; g.fillRect(0, 0, W, H); };
async function initP3() {
  const { RoomEnvironment } = await import('/node_modules/three/examples/jsm/environments/RoomEnvironment.js');
  const { EffectComposer } = await import('/node_modules/three/examples/jsm/postprocessing/EffectComposer.js');
  const { RenderPass } = await import('/node_modules/three/examples/jsm/postprocessing/RenderPass.js');
  const { BokehPass } = await import('/node_modules/three/examples/jsm/postprocessing/BokehPass.js');
  const { OutputPass } = await import('/node_modules/three/examples/jsm/postprocessing/OutputPass.js');
  ({ GLTFLoader: P3.GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js'));
  const pm = new THREE.PMREMGenerator(renderer); envTex = pm.fromScene(new RoomEnvironment(), .04).texture;
  comp3 = new EffectComposer(renderer); comp3.renderTarget1.samples = comp3.renderTarget2.samples = 4;
  comp3.addPass(new RenderPass(scene, camera));
  bokeh = new BokehPass(scene, camera, { focus: 100, aperture: .0004, maxblur: .012 }); comp3.addPass(bokeh);
  comp3.addPass(new OutputPass());
  P3.phone = await loadPhoneGLB().catch((e) => { console.warn('GLB 失败，用代码手机', e); return makePhone(); }); scene.add(P3.phone);
  // 白色影棚：地面 + 远处的背景板（景深把接缝虚掉）
  const white = new THREE.MeshStandardMaterial({ color: '#e2ded8', roughness: .9 });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), white); fl.rotation.x = -Math.PI / 2; fl.position.set(STU, 0, 0); fl.receiveShadow = true; scene.add(fl);
  const bw = new THREE.Mesh(new THREE.PlaneGeometry(600, 400), white); bw.position.set(STU, 150, -160); bw.receiveShadow = true; scene.add(bw);
  // 沙发上的手（不带手机，3D 手机横放在手里）
  P3.hands = standee(canvasTex(900, 600, (g) => {
    const skin = '#f1c7a3';
    [[150, 1], [750, -1]].forEach(([x, f]) => { g.save(); g.translate(x, 330); g.scale(f, 1); g.fillStyle = K.white; g.beginPath(); g.ellipse(0, 40, 120, 150, .3, 0, 7); g.fill(); g.fillStyle = skin; g.strokeStyle = K.ink; g.lineWidth = 8; g.beginPath(); g.ellipse(0, 40, 100, 130, .3, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#5a7fb0'; g.fillRect(-80, 150, 160, 160); g.restore(); });
  }), 30, { pos: [SX, 14, 6] }); P3.hands.mesh.rotation.x = -.18;
  // 充电计划卡（从屏幕里弹出来）、清单三张卡
  P3.plan = glassCard(22, 13, (g, W, H) => { cardBg(g, W, H); });
  P3.planTex = P3.plan.material.map;
  P3.cards = ['日常充到 80% 左右就够', '别边充边玩大型游戏', '不用等到 0% 再充'].map((s, i) => glassCard(26, 7, (g, W, H) => {
    cardBg(g, W, H); g.fillStyle = '#ff5a1f'; g.beginPath(); g.arc(70, H / 2, 40, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '900 52px Sans'; g.textAlign = 'center'; g.fillText('✓', 70, H / 2 + 18);
    g.textAlign = 'left'; g.fillStyle = '#161412'; g.font = '800 58px Serif'; g.fillText(s, 140, H / 2 + 20);
    g.fillStyle = '#b8ab98'; g.font = '400 30px InsI'; g.fillText(`0${i + 1}`, W - 70, 46);
  }));
  P3.title = glassCard(26, 5, (g, W, H) => { g.clearRect(0, 0, W, H); g.fillStyle = '#161412'; g.font = '900 92px Serif'; g.textAlign = 'center'; g.fillText('护电池，记住 3 件事', W / 2, H / 2 + 32); });
  P3.title.material.clearcoat = 0;
}
function drawPlan(t) {
  const { g } = P3.planTex.userData, W = 880, H = 520;
  g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,.94)'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#1c1c1e'; g.font = '700 46px Sans'; g.fillText('今晚的充电计划', 50, 80);
  const T = (m) => 70 + (m / 480) * 720, Pp = (p) => 430 - p * 2.6;
  const plan = (m) => m < 40 ? 50 + 30 * (m / 40) : m < 420 ? 80 : m < 450 ? 80 + 20 * ((m - 420) / 30) : 100;
  const now = t < 41.0 ? 0 : t < 41.6 ? 40 * eIO(prog(t, 41.0, 41.6)) : t < 42.9 ? lerp(40, 410, eIO(prog(t, 41.6, 42.9))) : lerp(410, 450, eIO(prog(t, 42.9, 43.5)));
  g.setLineDash([10, 10]); g.strokeStyle = '#d6d6dc'; g.lineWidth = 3; g.beginPath(); g.moveTo(70, Pp(80)); g.lineTo(790, Pp(80)); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#8e8e93'; g.font = '400 28px Sans'; g.fillText('80%', 800, Pp(80) + 10); g.fillText('100%', 800, Pp(100) + 10);
  [['23:00', 0], ['03:00', 240], ['07:00', 480]].forEach(([s, m]) => { g.textAlign = 'center'; g.fillText(s, T(m), 490); }); g.textAlign = 'left';
  g.strokeStyle = now > 420 ? '#34c759' : '#ff9f0a'; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); for (let m = 0; m <= now; m += 4) { m ? g.lineTo(T(m), Pp(plan(m))) : g.moveTo(T(m), Pp(plan(m))); } g.stroke();
  if (t >= 41) { g.fillStyle = '#fff'; g.strokeStyle = '#1c1c1e'; g.lineWidth = 5; g.beginPath(); g.arc(T(now), Pp(plan(now)), 15, 0, 7); g.fill(); g.stroke(); }
  if (now > 60 && now < 420) { g.fillStyle = '#ff9f0a'; g.font = '700 34px Sans'; g.textAlign = 'center'; g.fillText('停在 80%，等你', (T(40) + T(420)) / 2, Pp(80) - 26); g.textAlign = 'left'; }
  g.fillStyle = now >= 445 ? '#ff9f0a' : '#d1d1d6'; g.beginPath(); g.arc(T(450), 130, 26, 0, 7); g.fill(); g.fillStyle = '#1c1c1e'; g.font = '700 28px Sans'; g.textAlign = 'center'; g.fillText('06:30', T(450), 92); g.textAlign = 'left';
  P3.planTex.needsUpdate = true;
}

// ---------- 镜头 + 手机位置（后 45 秒 3D 版）
// [t, 机位x,y,z, 看向x,y,z, 焦点物（'p' 手机 / 数字=距离）]
const CAM3 = [
  [30.0, RX - 5, 40, 3, RX - 5, 40, 0], [33.0, RX + 18, 50, 92, RX + 1, 40, 0], [36.2, RX - 20, 44, 60, RX - 4, 40, 0],
  [36.25, STU + 6, 34, 46, STU, 32, 0], [40.6, STU - 1, 32.5, 38, STU, 32, 0], [41.2, STU + 22, 36, 58, STU + 9, 33, 0], [43.9, STU + 26, 36, 54, STU + 10, 33, 0],
  [44.0, RX + 4, 56, 104, RX + 4, 54, -20], [44.8, RX + 4, 54, 100, RX + 4, 52, -20], [47.6, RX + 2, 46, 92, RX - 2, 38, 0],
  [48.0, RX + 2, 46, 92, RX - 2, 38, 0], [48.55, SX + 18, 46, 96, SX, 30, 0], [51.0, SX + 12, 44, 88, SX, 29, 0], [61.6, SX + 8, 42, 80, SX, 29, 0],
  [61.65, STU - 30, 58, 70, STU, 36, -8], [64.0, STU - 22, 52, 64, STU, 36, -8], [70.9, STU - 8, 44, 56, STU, 34, -8],
  [70.95, 14, 44, 78, 2, 38, 0], [72.0, 10, 44, 84, 2, 38, 0], [75.0, 6, 48, 112, 2, 40, 0]];
function phonePose(t) {   // 手机的位置 / 朝向
  const lean = -.12;
  if (t < 36.25) { const lift = eIO(prog(t, 35.6, 36.25)); return { p: [RX - 5, 26 + PH.H / 2 + .4 + lift * 8, 3 + lift * 10], r: [lean * (1 - lift), lerp(.35, 0, lift) + lift * 1.2, 0] }; }
  if (t < 44.0) { const spin = eOut(prog(t, 36.25, 37.2)), turn = eIO(prog(t, 41.0, 41.8)); return { p: [STU, 32 + Math.sin(t * 1.4) * .4, 0], r: [-.05, lerp(-1.6, 0, spin) - .55 * turn, 0] }; }
  if (t < 48.0) return { p: [RX - 5, 26 + PH.D / 2 + .3, 5], r: [-Math.PI / 2, 0, .3] };
  if (t < 61.6) return { p: [SX, 28 + Math.sin(t * 7) * .15, 12], r: [-.35, 0, Math.PI / 2] };
  if (t < 71.0) { const u = eIO(prog(t, 61.65, 63.0)); return { p: [STU + 14, 6 + PH.D / 2 + 2 * (1 - u), -6], r: [-Math.PI / 2 + .02, 0, lerp(.6, .25, u)] }; }
  return { p: [0, PH.H / 2 + 3.2, 3], r: [-.1, -.18, 0] };
}
function setCam3(t) {
  let k = 0; while (k < CAM3.length - 1 && t > CAM3[k + 1][0]) k++;
  const A = CAM3[k], B = CAM3[Math.min(k + 1, CAM3.length - 1)];
  const u = A === B || B[0] - A[0] < .1 ? (t >= B[0] ? 1 : 0) : eIO((t - A[0]) / (B[0] - A[0]));
  const v = A.map((a, j) => lerp(a, B[j], u));
  const [jx, jy] = hh(t), q = (t > 41.6 && t < 42.9) || t > 74.2 ? .1 : .5;
  camera.position.set(v[1] + jx * q, v[2] + jy * q, v[3]); camera.lookAt(v[4] + jx * q * .6, v[5] + jy * q * .6, v[6]);
  const zone = v[1] > 400 ? 'studio' : (t < 44.2 && v[1] < -200) ? 'night' : 'day';
  key.position.set(v[1] - 70, 150, 110); key.target.position.set(v[4], v[5] - 10, 0); key.target.updateMatrixWorld(); rim.position.set(v[1] + 80, 90, -30);
  if (zone === 'studio') { hemi.color.set('#ffffff'); hemi.groundColor.set('#bdb6ab'); hemi.intensity = 1.2; key.color.set('#ffffff'); key.intensity = 2.0; scene.background.set('#dcd8d2'); S2.lamp.intensity = 0; }
  else if (zone === 'night') { hemi.color.set('#8fa6e8'); hemi.groundColor.set('#151a2c'); hemi.intensity = .6; key.color.set('#9fb4ff'); key.intensity = 1.3; scene.background.set('#10131c'); S2.lamp.intensity = 420; }
  else { hemi.color.set('#fff1dd'); hemi.groundColor.set('#4a3420'); hemi.intensity = .55; key.color.set('#ffd6a0'); key.intensity = 3.2; scene.background.set('#2a1d12'); S2.lamp.intensity = 0; }
  return zone;
}
function renderP3(t) {
  const zone = setCam3(t);
  animate2(t);
  S2.phone.hinge.visible = false; S2.hands.hinge.visible = false; S.phone.hinge.visible = false;
  P3.hands.hinge.visible = t >= 47 && t < 62;
  const pose = phonePose(t); P3.phone.position.set(...pose.p); P3.phone.rotation.set(...pose.r);
  drawScreen3(t);
  // 计划卡：41.0 从屏幕里弹到手机右侧
  P3.plan.visible = t >= 40.8 && t < 44.0;
  if (P3.plan.visible) { drawPlan(t); const u = eBack(prog(t, 40.8, 41.5), 1.4); P3.plan.position.set(STU + lerp(0, 17, u), 32 + lerp(0, 4, u), lerp(0, 6, u)); P3.plan.scale.setScalar(lerp(.3, 1, clamp(u))); P3.plan.rotation.set(0, lerp(0, -.35, u), 0); }
  // 清单：三张玻璃卡依次立起，焦点逐张移动（rack focus）
  const show3 = t >= 61.65 && t < 71.0;
  P3.title.visible = show3; P3.title.position.set(STU, 52 + 2 * (1 - eOut(prog(t, 62.6, 63.2))), -14); P3.title.material.opacity = prog(t, 62.6, 63.0);
  const at = [64.0, 66.2, 68.4];
  P3.cards.forEach((c, i) => { c.visible = show3 && t >= at[i]; const u = eBack(prog(t, at[i], at[i] + .4), 2); c.position.set(STU - 2 + i * 1.5, 43 - i * 9, -6 + i * 7 + 6 * (1 - clamp(u))); c.rotation.set(-.08, .12, 0); c.scale.setScalar(Math.max(.01, u)); });
  // 焦点：手机，或者正在打勾的那张卡
  let fp = P3.phone.position.clone();
  if (show3) { let i = at.filter((a) => t >= a).length - 1; fp = i >= 0 ? P3.cards[i].position.clone() : P3.title.position.clone(); }
  if (t >= 44.0 && t < 48) fp = new THREE.Vector3(RX + 4, 60, -40);
  if (P3.plan.visible && t > 41.4) fp = P3.plan.position.clone();
  bokeh.uniforms.focus.value = camera.position.distanceTo(fp);
  bokeh.uniforms.aperture.value = zone === 'studio' ? .0011 : .0007;
  bokeh.uniforms.maxblur.value = zone === 'studio' ? .016 : .01;
  THERM_PT = P3.phone.position.clone();
  comp3.render();
  drawUI1Hand3(t); drawThermal(t); overlay2(t);
  if (zone === 'studio') document.getElementById('grain').style.opacity = .06;
}
function drawUI1Hand3(t) {   // 影棚里点开关的手指（叠层，对准 3D 屏幕上的开关位置）
  ui1.style.display = 'none'; ui3.style.display = 'none';
  let h = document.getElementById('hand3');
  if (!h) { h = document.createElement('div'); h.id = 'hand3'; h.innerHTML = '<svg viewBox="0 0 90 110" width="110" height="134"><path d="M8 4 L8 84 L28 66 L42 98 L56 92 L42 60 L70 60 Z" fill="#161412" stroke="#fff" stroke-width="6" stroke-linejoin="round"/></svg>'; h.style.cssText = 'position:absolute;left:0;top:0'; document.getElementById('ui').appendChild(h); }
  const on = t > 37.1 && t < 38.9; h.style.display = on ? 'block' : 'none'; if (!on) return;
  P3.screen.updateMatrixWorld(); const b = (P3.screen.geometry.computeBoundingBox(), P3.screen.geometry.boundingBox);
  const tgt = new THREE.Vector3(lerp(b.min.x, b.max.x, (620 - 114) / 620), lerp(b.max.y, b.min.y, 385 / 1280), 0).applyMatrix4(P3.screen.matrixWorld);
  const [tx, ty] = projPt(tgt), u = eIO(prog(t, 37.1, 37.85)), away = eIO(prog(t, 38.3, 38.9));
  h.style.transform = `translate(${lerp(980, tx - 8, u) + 400 * away}px,${lerp(1500, ty - 4, u) + 400 * away}px) scale(${1 - .15 * Math.sin(Math.PI * prog(t, 37.9, 38.15))})`;
}
