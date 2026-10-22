
// ================= 后 45 秒（30–75 s）：纸雕为主，穿插三种 UI（系统界面 / 热成像 / 清单）=================
// 承接链：电池里倒退出卧室手机屏幕 → 屏幕剥纸边放大成设置页（UI-1）→ 开关圆钮掉进窗外变太阳 → 镜头甩到沙发 →
//        扫描线把纸雕扫成热图（UI-2）→ 热图收成一个点 → 点拉成线，清单升起（UI-3）→ 清单翻面成牛皮纸便签落回书桌
const COPY2 = [
  [30.3, 33.3, '那整夜插着充电，会不会伤电池？'],
  [33.3, 36.6, '一直挂在 100%，电池其实也在【“硬撑”】'],
  [37.4, 40.8, '所以手机有【“优化充电”】：先停在 80%'],
  [40.8, 44.0, '快到你起床，才充满【最后 20%】'],
  [44.8, 48.0, '去设置里搜“充电”，【把它打开】'],
  [48.0, 51.0, '比充满更伤电池的，是【“热”】'],
  [51.8, 55.2, '边充边打游戏，手机能到【40 多度】'],
  [55.2, 57.4, '高温会让电池【老得更快】'],
  [57.4, 61.6, '太冷也不行：冬天在室外快充，锂更容易长【“刺”】'],
  [72.0, 75.0, '你的手机，现在充到【多少】了？'],
];
const RX = -300, SX = -150;   // 卧室、沙发的 x
const S2 = {};
let phone2Tex, winTex, clockTex, ui1, therm, tg, hud, ui3, off, og;

// ---------- 画布：卧室手机、窗户、台钟
function drawPhone2(t) {
  const { g } = phone2Tex.userData, W = 600, H = 1200;
  g.clearRect(0, 0, W, H);
  g.fillStyle = K.white; rr(g, 0, 0, W, H, 96); g.fill();
  g.fillStyle = '#18181c'; rr(g, 26, 26, W - 52, H - 52, 76); g.fill();
  const sx = 46, sy = 46, sw = W - 92, sh = H - 92;
  g.save(); rr(g, sx, sy, sw, sh, 58); g.clip();
  const gr = g.createLinearGradient(0, sy, 0, sy + sh); gr.addColorStop(0, '#22303f'); gr.addColorStop(1, '#0f151c'); g.fillStyle = gr; g.fillRect(sx, sy, sw, sh);
  const ff = clockAt(t), hh = Math.floor(ff / 60) % 24, mm = Math.floor(ff % 60);
  g.fillStyle = '#e9eef3'; g.font = '600 34px Sans'; g.fillText(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, sx + 44, sy + 62);
  const p = t < 33.3 ? 96 + 4 * prog(t, 30.8, 33.0) : 100;
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = '800 230px Sans'; g.fillText(String(Math.round(p)), W / 2 - 40, 560); g.font = '700 100px Sans'; g.fillText('%', W / 2 + 165, 560);
  g.lineWidth = 16; g.strokeStyle = '#2d3b48'; g.beginPath(); g.arc(W / 2, 800, 110, 0, 7); g.stroke();
  g.strokeStyle = p >= 100 ? '#e0574a' : '#45c2b1'; g.lineCap = 'round'; g.beginPath(); g.arc(W / 2, 800, 110, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p / 100); g.stroke();
  if (t > 44.8) { g.fillStyle = '#45c2b1'; g.font = '700 46px Sans'; g.fillText('起床前刚好充满', W / 2, 1010); }
  else if (p >= 100) { g.fillStyle = '#e0574a'; g.font = '700 46px Sans'; g.fillText('100% · 仍在插电', W / 2, 1010); }
  g.textAlign = 'left';
  // 从电池里退出来：开头屏幕是电池里的深蓝
  const navyA = 1 - prog(t, 30.25, 30.9); if (navyA > 0) { g.globalAlpha = navyA; g.fillStyle = '#2c4258'; g.fillRect(sx, sy, sw, sh); g.globalAlpha = 1; }
  g.restore(); phone2Tex.needsUpdate = true;
}
function clockAt(t) {   // 卧室里的时间（分钟）：23:00 → 快进 → 06:30
  if (t < 33.4) return 23 * 60;
  if (t < 36.4) return 23 * 60 + eIO(prog(t, 33.4, 36.4)) * 6 * 60;    // 快进到 05:00
  if (t < 44.0) return 5 * 60;
  return 6 * 60 + 30;
}
function drawClock(t) {
  const { g } = clockTex.userData, W = 400, H = 460, m = clockAt(t), ring = t > 44.8 && t < 47.6;
  g.clearRect(0, 0, W, H);
  g.fillStyle = K.white; g.beginPath(); g.arc(200, 250, 190, 0, 7); g.fill(); g.fillRect(60, 40, 60, 60); g.fillRect(280, 40, 60, 60);
  g.fillStyle = '#c8322b'; g.beginPath(); g.arc(200, 250, 172, 0, 7); g.fill();
  g.fillStyle = '#f6f0e2'; g.beginPath(); g.arc(200, 250, 145, 0, 7); g.fill();
  g.fillStyle = '#c8322b'; g.beginPath(); g.arc(90, 70, 46, 0, 7); g.arc(310, 70, 46, 0, 7); g.fill();
  g.strokeStyle = K.ink; g.lineCap = 'round';
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.lineWidth = 8; g.beginPath(); g.moveTo(200 + Math.cos(a) * 120, 250 + Math.sin(a) * 120); g.lineTo(200 + Math.cos(a) * 135, 250 + Math.sin(a) * 135); g.stroke(); }
  const ha = (m / 720) * Math.PI * 2 - Math.PI / 2, ma = (m % 60) / 60 * Math.PI * 2 - Math.PI / 2;
  g.lineWidth = 16; g.beginPath(); g.moveTo(200, 250); g.lineTo(200 + Math.cos(ha) * 70, 250 + Math.sin(ha) * 70); g.stroke();
  g.lineWidth = 10; g.beginPath(); g.moveTo(200, 250); g.lineTo(200 + Math.cos(ma) * 110, 250 + Math.sin(ma) * 110); g.stroke();
  clockTex.needsUpdate = true;
  return ring;
}
function drawWindow(t) {
  const { g } = winTex.userData, W = 800, H = 680, day = eIO(prog(t, 44.2, 45.4));
  g.fillStyle = K.white; g.fillRect(0, 0, W, H);
  const gr = g.createLinearGradient(0, 40, 0, H - 40);
  gr.addColorStop(0, `rgb(${lerp(28, 255, day)},${lerp(40, 196, day)},${lerp(72, 140, day)})`); gr.addColorStop(1, `rgb(${lerp(58, 255, day)},${lerp(70, 232, day)},${lerp(110, 196, day)})`);
  g.fillStyle = gr; g.fillRect(40, 40, W - 80, H - 80);
  g.fillStyle = `rgba(255,255,255,${.85 * (1 - day)})`; [[150, 140], [560, 110], [660, 300], [260, 420], [470, 520]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); });
  g.fillStyle = `rgb(${lerp(70, 210, day)},${lerp(80, 160, day)},${lerp(110, 120, day)})`;   // 远处的纸楼
  [[40, 470, 120], [150, 410, 90], [240, 500, 140], [380, 440, 100], [480, 380, 120], [600, 470, 160]].forEach(([x, y, w]) => g.fillRect(x, y, w, H - 40 - y));
  g.fillStyle = K.white; g.fillRect(W / 2 - 14, 40, 28, H - 80); g.fillRect(40, H / 2 - 14, W - 80, 28);
  winTex.needsUpdate = true;
}
const paperCanvas = (w, h, draw) => canvasTex(w, h, draw);

// ---------- 搭场景
async function build2() {
  const [cardC, cardN, kraftC, kraftN, whiteC] = await Promise.all([
    loadTex(TX + 'Cardboard002_2K-JPG_Color.jpg', [4.4, 1.4]), loadTex(TX + 'Cardboard002_2K-JPG_NormalGL.jpg', [4.4, 1.4], false),
    loadTex(TX + 'Paper004_2K-JPG_Color.jpg', [4, 1.5]), loadTex(TX + 'Paper004_2K-JPG_NormalGL.jpg', [4, 1.5], false), loadTex(TX + 'Paper001_2K-JPG_Color.jpg', [2, 2])]);
  const add = (m, cast = true) => { m.castShadow = cast; m.receiveShadow = true; scene.add(m); return m; };
  const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(320, 200), new THREE.MeshStandardMaterial({ map: cardC, normalMap: cardN, roughness: 1 })), false);
  floor.rotation.x = -Math.PI / 2; floor.position.x = -262; floor.scale.x = 280 / 320;
  const wall = add(new THREE.Mesh(new THREE.PlaneGeometry(320, 220), new THREE.MeshStandardMaterial({ map: kraftC, normalMap: kraftN, roughness: 1 })), false); wall.position.set(-262, 100, -50); wall.scale.x = 280 / 320;
  const paperM = (c) => new THREE.MeshStandardMaterial({ color: c, map: whiteC, normalMap: paperN, roughness: .95 });
  const box = (w, h, d, c, p) => { const m = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paperM(c))); m.position.set(...p); return m; };
  // 卧室
  box(34, 24, 22, '#c9a77c', [RX, 12, -2]); box(36, 2, 24, '#b48a5e', [RX, 25, -2]);                 // 床头柜
  box(70, 16, 60, '#e8dccb', [RX + 58, 8, -14]); box(66, 6, 56, '#7f9cc0', [RX + 60, 19, -12]);     // 床 + 被子
  box(20, 9, 16, '#f6f0e2', [RX + 36, 26, -32]);                                                       // 枕头
  winTex = canvasTex(800, 680, () => {}); drawWindow(30);
  S2.win = standee(winTex, 40, { pos: [RX + 8, 52, -49] });
  S2.sun = add(new THREE.Mesh(new THREE.CircleGeometry(5.5, 40), new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff9a2e', emissiveIntensity: .6, roughness: .8 })), false);
  S2.sun.position.set(RX + 2, 74, -48.5);
  S2.moon = add(new THREE.Mesh(new THREE.CircleGeometry(4.5, 40), new THREE.MeshStandardMaterial({ color: '#f3ead2', emissive: '#e8dfc0', emissiveIntensity: .5 })), false);
  S2.moon.position.set(RX + 20, 82, -48.5);
  phone2Tex = canvasTex(600, 1200, () => {}); drawPhone2(30);
  S2.phone = standee(phone2Tex, 24, { pos: [RX - 5, 26, 2] }); S2.phone.mesh.rotation.x = -.12;
  clockTex = canvasTex(400, 460, () => {}); drawClock(30);
  S2.clock = standee(clockTex, 11, { pos: [RX + 11, 26, 0] });
  S2.lamp = new THREE.PointLight('#ffbf70', 0, 90, 1.4); S2.lamp.position.set(RX - 12, 40, 14); scene.add(S2.lamp);
  S2.cable = add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(RX - 5, 27, 3), new THREE.Vector3(RX - 9, 26.2, 9), new THREE.Vector3(RX - 15, 20, 10), new THREE.Vector3(RX - 17, 4, 8), new THREE.Vector3(RX - 22, .8, 14)]), 40, .5, 8), new THREE.MeshStandardMaterial({ color: '#f1ebe0' })));
  // 举重的纸电池小人
  S2.lifter = standee(paperCanvas(420, 520, (g) => {
    g.lineJoin = g.lineCap = 'round';
    const out = (fn) => { g.strokeStyle = K.white; g.lineWidth = 40; fn(); g.stroke(); g.fillStyle = K.white; g.fill(); };
    out(() => { g.beginPath(); g.roundRect(130, 170, 160, 260, 26); g.rect(185, 145, 50, 30); });
    g.fillStyle = '#2d3b48'; g.beginPath(); g.roundRect(130, 170, 160, 260, 26); g.fill(); g.fillRect(185, 145, 50, 30);
    g.fillStyle = '#e0574a'; g.beginPath(); g.roundRect(145, 185, 130, 230, 16); g.fill();
    g.strokeStyle = K.ink; g.lineWidth = 16; g.beginPath(); g.moveTo(130, 230); g.lineTo(70, 90); g.moveTo(290, 230); g.lineTo(350, 90); g.moveTo(170, 430); g.lineTo(160, 500); g.moveTo(250, 430); g.lineTo(260, 500); g.stroke();
    g.lineWidth = 14; g.beginPath(); g.moveTo(20, 85); g.lineTo(400, 85); g.stroke();
    g.fillStyle = K.ink; [[20, 85], [400, 85]].forEach(([x, y]) => { g.beginPath(); g.roundRect(x - 18, y - 46, 36, 92, 8); g.fill(); });
    g.fillStyle = '#fff'; g.beginPath(); g.arc(180, 270, 12, 0, 7); g.arc(240, 270, 12, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 8; g.beginPath(); g.arc(210, 330, 26, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.fillStyle = '#7fc4ff'; [[100, 200], [330, 180], [320, 300]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x, y - 22); g.quadraticCurveTo(x + 16, y + 6, x, y + 14); g.quadraticCurveTo(x - 16, y + 6, x, y - 22); g.fill(); });
  }), 13, { pos: [RX - 22, 26, 6] });
  // 沙发 + 打游戏的双手
  box(80, 14, 34, '#8c5a4a', [SX, 7, -14]); box(80, 26, 10, '#9b6656', [SX, 20, -30]); box(10, 20, 34, '#9b6656', [SX - 42, 10, -14]); box(10, 20, 34, '#9b6656', [SX + 42, 10, -14]);
  S2.hands = standee(paperCanvas(900, 600, (g) => {
    g.lineJoin = g.lineCap = 'round';
    const skin = '#f1c7a3';
    const hand = (x, flip) => { g.save(); g.translate(x, 330); g.scale(flip, 1); g.fillStyle = K.white; g.beginPath(); g.ellipse(0, 40, 120, 150, .3, 0, 7); g.fill(); g.fillStyle = skin; g.strokeStyle = K.ink; g.lineWidth = 8; g.beginPath(); g.ellipse(0, 40, 100, 130, .3, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#5a7fb0'; g.fillRect(-80, 150, 160, 160); g.restore(); };
    hand(170, 1); hand(730, -1);
    g.fillStyle = K.white; rr(g, 120, 170, 660, 330, 70); g.fill();
    g.fillStyle = '#18181c'; rr(g, 140, 190, 620, 290, 56); g.fill();
    const gr = g.createLinearGradient(170, 210, 730, 460); gr.addColorStop(0, '#5b3fd1'); gr.addColorStop(1, '#ff6a4a'); g.fillStyle = gr; rr(g, 165, 212, 570, 246, 40); g.fill();
    g.fillStyle = '#fff'; g.font = '900 64px Sans'; g.textAlign = 'center'; g.fillText('VICTORY', 450, 360);
    g.fillStyle = '#ffde59'; [[260, 280], [640, 300], [330, 420], [580, 410]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); });
    g.fillStyle = skin; g.strokeStyle = K.ink; g.lineWidth = 7; [[230, 300], [670, 300]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 34, 24, 0, 0, 7); g.fill(); g.stroke(); });
  }), 30, { pos: [SX, 14, 8] });
  S2.hands.mesh.rotation.x = -.18;
  S2.cable2 = add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(SX + 22, 22, 9), new THREE.Vector3(SX + 34, 14, 14), new THREE.Vector3(SX + 40, 1, 20), new THREE.Vector3(SX + 60, .8, 24)]), 30, .5, 8), new THREE.MeshStandardMaterial({ color: '#f1ebe0' })));
  S2.steam = [0, 1, 2].map((i) => standee(paperCanvas(160, 360, (g) => { g.strokeStyle = K.white; g.lineWidth = 34; g.lineCap = 'round'; g.beginPath(); g.moveTo(80, 340); g.bezierCurveTo(10, 260, 150, 180, 80, 100); g.bezierCurveTo(40, 60, 90, 30, 90, 20); g.stroke(); g.strokeStyle = '#e8a07a'; g.lineWidth = 18; g.stroke(); }), 9, { pos: [SX - 14 + i * 14, 34, 9] }));
  // 书桌上的便签（结尾，清单落下来变成它）
  S2.note = standee(paperCanvas(600, 700, (g) => {
    g.fillStyle = K.white; g.fillRect(0, 0, 600, 700); g.fillStyle = '#d9b98a'; g.fillRect(16, 16, 568, 668);
    g.fillStyle = K.ink; g.font = '900 54px Serif'; g.fillText('护电池 · 3 件事', 54, 120);
    g.font = '700 40px Serif'; ['充到 80% 左右', '别边充边玩游戏', '不用等到 0%'].forEach((s, i) => { g.fillStyle = '#e0702a'; g.beginPath(); g.arc(78, 236 + i * 130, 22, 0, 7); g.fill(); g.fillStyle = K.ink; g.fillText(s, 122, 250 + i * 130); });
    g.fillStyle = 'rgba(255,240,200,.6)'; g.save(); g.translate(300, 18); g.rotate(-.05); g.fillRect(-90, -24, 180, 48); g.restore();
  }), 18, { pos: [24, 0, 22] });
  S2.note.mesh.rotation.x = -1.3;
  S2.teaser = hanging(paperCanvas(1100, 300, (g, W, H) => { g.fillStyle = K.cream; g.fillRect(0, 0, W, H); g.fillStyle = '#c8322b'; g.fillRect(0, 0, 18, H); g.fillStyle = '#7a6f60'; g.font = '700 54px Sans'; g.fillText('下期', 60, 100); g.fillStyle = K.ink; g.font = '900 84px Serif'; g.fillText('快充头越大，越伤电池吗？', 60, 220); }), 40, [8, 66, -14], 190);
  // ---------- DOM 层
  const ui = document.getElementById('ui');
  ui1 = document.createElement('div'); ui1.id = 'ui1'; ui1.innerHTML = UI1_HTML; ui.appendChild(ui1);
  therm = document.createElement('canvas'); therm.width = 1080; therm.height = 1920; therm.id = 'therm'; ui.appendChild(therm); tg = therm.getContext('2d');
  hud = document.createElement('div'); hud.id = 'hud'; ui.appendChild(hud);
  ui3 = document.createElement('div'); ui3.id = 'ui3'; ui3.innerHTML = UI3_HTML; ui.appendChild(ui3);
  off = document.createElement('canvas'); off.width = 270; off.height = 480; og = off.getContext('2d', { willReadFrequently: true });
}

// ---------- UI-1：系统设置页（干净、无纸纹、苹果式弹簧）
const UI1_HTML = `<div class="u1c"><div class="u1in"><div class="u1bar"><span id="u1time">23:00</span><span class="u1isl"></span><span>⚡ 100%</span></div>
<div class="u1nav">‹ 电池</div><div class="u1title">充电</div>
<div class="u1group"><div class="u1row"><div><div class="u1lab">优化充电</div><div class="u1sub" id="u1sub">学习你的作息：先充到 80%，快起床时再充满</div></div><div class="u1tog" id="u1tog"><div class="u1knob" id="u1knob"></div></div></div>
<div class="u1row"><div class="u1lab">充电上限</div><div class="u1pill" id="u1pill">80%</div></div></div>
<div class="u1card" id="u1card"><div class="u1ct">今晚的充电计划</div><svg id="u1plan" viewBox="0 0 880 420" width="880" height="370"></svg></div>
<svg id="u1hand" viewBox="0 0 90 110" width="110" height="134"><path d="M8 4 L8 84 L28 66 L42 98 L56 92 L42 60 L70 60 Z" fill="#161412" stroke="#fff" stroke-width="6" stroke-linejoin="round"/></svg></div></div>
<div id="u1fly"></div>`;
const sp2 = (x, k = 7, w = 10) => x <= 0 ? 0 : 1 - Math.exp(-k * x) * Math.cos(w * x);
function projRect(mesh, x0, y0, x1, y1) {   // 立牌上一块区域（0–1 坐标）投到屏幕
  mesh.updateMatrixWorld(); const g = mesh.geometry; g.computeBoundingBox(); const b = g.boundingBox;
  const pts = [[x0, y0], [x1, y1]].map(([u, v]) => new THREE.Vector3(lerp(b.min.x, b.max.x, u), lerp(b.max.y, b.min.y, v), 0).applyMatrix4(mesh.matrixWorld).project(camera));
  return { x: (pts[0].x + 1) / 2 * 1080, y: (1 - pts[0].y) / 2 * 1920, x2: (pts[1].x + 1) / 2 * 1080, y2: (1 - pts[1].y) / 2 * 1920 };
}
const projPt = (v) => { const p = v.clone().project(camera); return [(p.x + 1) / 2 * 1080, (1 - p.y) / 2 * 1920]; };
function drawUI1(t) {
  const on = t >= 36.6 && t < 44.9;
  ui1.style.display = on ? 'block' : 'none'; if (!on) return;
  // 36.6–37.3 手机屏幕剥掉纸边，放大成全屏
  const r = projRect(S2.phone.mesh, 46 / 600, 46 / 1200, 554 / 600, 1154 / 1200), u = eIO(prog(t, 36.6, 37.3));
  const x = lerp(r.x, 0, u), y = lerp(r.y, 0, u), w = lerp(r.x2 - r.x, 1080, u), h = lerp(r.y2 - r.y, 1920, u);
  const c = ui1.querySelector('.u1c');
  const out = eIO(prog(t, 44.0, 44.35));
  c.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${lerp(60, 0, u)}px;opacity:${1 - out}`;
  c.style.setProperty('--s', w / 1080);
  ui1.querySelector('#u1time').textContent = t < 40.8 ? '23:00' : '06:30';
  // 开关：37.95 被点下
  const k = sp2(t - 38.0, 9, 13), tog = ui1.querySelector('#u1tog'), knob = ui1.querySelector('#u1knob');
  tog.style.background = t >= 38.0 ? `rgb(${lerp(229, 52, clamp(k))},${lerp(229, 199, clamp(k))},${lerp(234, 89, clamp(k))})` : '#e5e5ea';
  knob.style.transform = `translateX(${lerp(0, 68, k)}px) scale(${1 + .12 * Math.sin(Math.PI * prog(t, 37.9, 38.15))},${1 - .1 * Math.sin(Math.PI * prog(t, 37.9, 38.15))})`;
  knob.style.visibility = t >= 44.0 ? 'hidden' : 'visible';
  ui1.querySelector('#u1sub').style.opacity = prog(t, 38.3, 38.7);
  ui1.querySelector('#u1pill').style.transform = `scale(${t < 38.6 ? 0 : eBack(prog(t, 38.6, 38.9), 2.4)})`;
  // 手
  const sc1 = w / 1080, tr = tog.getBoundingClientRect(), tx0 = (tr.left - x) / sc1 + 74, ty0 = (tr.top - y) / sc1 + 30;
  const hd = ui1.querySelector('#u1hand'), hu = eIO(prog(t, 37.2, 37.85)), hx = lerp(1000, tx0, hu) + 500 * eIO(prog(t, 38.3, 38.9)), hy = lerp(1500, ty0, hu) + 400 * eIO(prog(t, 38.3, 38.9));
  hd.style.transform = `translate(${hx}px,${hy}px) scale(${1 - .15 * Math.sin(Math.PI * prog(t, 37.9, 38.15))})`; hd.style.opacity = t > 37.2 && t < 38.9 ? 1 : 0;
  // 计划卡：40.8 弹出，时间条扫过（停在 80% 那段几乎不动）
  const card = ui1.querySelector('#u1card'), cu = eBack(prog(t, 40.6, 41.0), 1.6);
  card.style.transform = `translateY(${(1 - cu) * 120}px) scale(${lerp(.92, 1, cu)})`; card.style.opacity = prog(t, 40.6, 40.8);
  const T = (m) => 60 + (m / 480) * 760;   // 23:00(0) → 07:00(480)
  const P = (p) => 340 - p * 2.6;
  const plan = (m) => m < 40 ? 50 + 30 * (m / 40) : m < 420 ? 80 : m < 450 ? 80 + 20 * ((m - 420) / 30) : 100;
  const now = t < 41.0 ? 0 : t < 41.6 ? 40 * eIO(prog(t, 41.0, 41.6)) : t < 42.9 ? lerp(40, 410, eIO(prog(t, 41.6, 42.9)) ** 1.0) : lerp(410, 450, eIO(prog(t, 42.9, 43.5)));
  let path = ''; for (let m = 0; m <= now; m += 4) path += `${m ? 'L' : 'M'}${T(m).toFixed(1)},${P(plan(m)).toFixed(1)}`;
  const nx = T(now), ny = P(plan(now));
  ui1.querySelector('#u1plan').innerHTML = `
    <line x1="60" y1="${P(80)}" x2="820" y2="${P(80)}" stroke="#d6d6dc" stroke-width="3" stroke-dasharray="10 10"/><text x="830" y="${P(80) + 10}" font-family="Sans" font-size="34" fill="#8e8e93">80%</text>
    <line x1="60" y1="${P(100)}" x2="820" y2="${P(100)}" stroke="#ececf0" stroke-width="3"/><text x="830" y="${P(100) + 10}" font-family="Sans" font-size="34" fill="#8e8e93">100%</text>
    <line x1="60" y1="345" x2="820" y2="345" stroke="#1c1c1e" stroke-width="3"/>
    ${[['23:00', 0], ['03:00', 240], ['07:00', 480]].map(([s, m]) => `<text x="${T(m)}" y="392" text-anchor="middle" font-family="Sans" font-size="34" fill="#8e8e93">${s}</text>`).join('')}
    <g transform="translate(${T(450)},70)"><circle r="30" fill="${now >= 445 ? '#ff9f0a' : '#f2f2f7'}"/><text y="10" text-anchor="middle" font-size="30">⏰</text><text y="-44" text-anchor="middle" font-family="Sans" font-weight="700" font-size="28" fill="#1c1c1e">06:30</text></g>
    <path d="${path}" fill="none" stroke="${now > 420 ? '#34c759' : '#ff9f0a'}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    ${t >= 41.0 ? `<circle cx="${nx}" cy="${ny}" r="16" fill="#fff" stroke="#1c1c1e" stroke-width="5"/>` : ''}
    ${now > 60 && now < 420 ? `<text x="${(T(40) + T(420)) / 2}" y="${P(80) - 26}" text-anchor="middle" font-family="Sans" font-weight="700" font-size="32" fill="#ff9f0a">停在 80%，等你</text>` : ''}`;
  // 44.0 开关圆钮脱出 → 落进窗外，变成太阳
  const fly = ui1.querySelector('#u1fly');
  if (t >= 44.0) {
    const kr = knob.getBoundingClientRect(), kn = { x: kr.left + kr.width / 2, y: kr.top + kr.height / 2 }, [sx2, sy2] = projPt(S2.sun.position), f = eIO(prog(t, 44.0, 44.75));
    const sunR = (projPt(S2.sun.position.clone().add(new THREE.Vector3(5.5, 0, 0)))[0] - sx2);
    const fx = lerp(kn.x, sx2, f), fy = lerp(kn.y, sy2, f) - Math.sin(Math.PI * f) * 260, rr2 = lerp(26, sunR, f);
    fly.style.cssText = `display:block;left:${fx - rr2}px;top:${fy - rr2}px;width:${rr2 * 2}px;height:${rr2 * 2}px;background:rgb(255,${lerp(255, 179, f)},${lerp(255, 71, f)});opacity:${1 - prog(t, 44.7, 44.85)}`;
  } else fly.style.display = 'none';
}

// ---------- UI-2：热成像
const IRON = [[0, [0, 0, 10]], [.18, [40, 0, 90]], [.35, [120, 0, 150]], [.52, [200, 30, 100]], [.66, [235, 90, 20]], [.8, [252, 170, 0]], [.92, [255, 230, 90]], [1, [255, 255, 235]]];
const ICE = [[0, [0, 2, 12]], [.25, [10, 30, 90]], [.5, [20, 90, 170]], [.72, [70, 170, 230]], [.88, [170, 225, 250]], [1, [245, 252, 255]]];
const pal = (P, v) => { for (let i = 1; i < P.length; i++) if (v <= P[i][0]) { const u = (v - P[i - 1][0]) / (P[i][0] - P[i - 1][0]); return P[i - 1][1].map((c, j) => c + (P[i][1][j] - c) * u); } return P[P.length - 1][1]; };
function tempAt(t) { if (t < 51.8) return 31; if (t < 54.2) return lerp(31, 43.6, eOut(prog(t, 51.8, 54.0))) + (t < 54.0 ? Math.sin(t * 60) * .4 : 0); if (t < 57.4) return 43.6; return lerp(43.6, -5, eOut(prog(t, 57.4, 58.2))); }
function drawThermal(t) {
  const on = t >= 51.0 && t < 62.25;
  therm.style.display = hud.style.display = on ? 'block' : 'none'; if (!on) return;
  const cold = t >= 57.4, [px, py] = projPt(new THREE.Vector3(SX, 26, 10));
  og.drawImage(canvas, 0, 0, 270, 480);
  const id = og.getImageData(0, 0, 270, 480), d = id.data, heat = cold ? 0 : prog(tempAt(t), 31, 43.6);
  for (let y = 0; y < 480; y++) for (let x = 0; x < 270; x++) {
    const i = (y * 270 + x) * 4; let v = (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255;
    v = .15 + v * .55;
    const dx = (x * 4 - px) / 320, dy = (y * 4 - py) / 210, hb = Math.exp(-(dx * dx + dy * dy) * 2.2);
    v += hb * (cold ? -.25 : .25 + .45 * heat);
    v += (Math.sin(y * 1.7 + t * 40) * .5 + .5) * .02;
    const c = pal(cold ? ICE : IRON, clamp(v));
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
  }
  og.putImageData(id, 0, 0);
  tg.clearRect(0, 0, 1080, 1920); tg.save();
  const scanY = 1920 * eIO(prog(t, 51.0, 51.8));
  // 61.6–62.2：整幅热图收进准星中心的一个点
  const col = eIO(prog(t, 61.6, 62.2));
  if (col > 0) { const r = lerp(2300, 0, col); tg.beginPath(); tg.arc(px, py, Math.max(.1, r), 0, 7); tg.clip(); }
  tg.beginPath(); tg.rect(0, 0, 1080, scanY); tg.clip();
  tg.imageSmoothingEnabled = true; tg.filter = 'blur(2px)'; tg.drawImage(off, 0, 0, 1080, 1920); tg.filter = 'none';
  tg.restore();
  if (t < 51.85) { tg.fillStyle = 'rgba(255,255,255,.9)'; tg.fillRect(0, scanY - 3, 1080, 6); tg.fillStyle = 'rgba(255,200,120,.25)'; tg.fillRect(0, scanY - 40, 1080, 40); }
  if (cold) {   // 雪
    tg.fillStyle = 'rgba(235,248,255,.9)';
    for (let i = 0; i < 70; i++) { const sx = (i * 137.5) % 1080, sy = ((i * 211 + (t - 57.4) * (120 + (i % 5) * 30)) % 1980) - 40; tg.beginPath(); tg.arc(sx + Math.sin(t * 2 + i) * 14, sy, 3 + (i % 3) * 2, 0, 7); tg.fill(); }
  }
  // HUD
  const T = tempAt(t), lock = eOut(prog(t, 51.5, 52.1)), cs = lerp(260, 120, lock), hudA = 1 - col;
  const cx = lerp(540, px, lock), cy = lerp(900, py, lock), colr = cold ? '#bfe8ff' : '#ffffff';
  const inset = t >= 55.2 && t < 61.6 ? eBack(prog(t, 55.2, 55.55), 1.8) : 0;
  hud.innerHTML = `<svg viewBox="0 0 1080 1920" width="1080" height="1920" style="opacity:${hudA}">
    <g fill="none" stroke="${colr}" stroke-width="5">${[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => `<path d="M${cx + a * cs},${cy + b * cs + -b * 44} L${cx + a * cs},${cy + b * cs} L${cx + a * cs - a * 44},${cy + b * cs}"/>`).join('')}
      <circle cx="${cx}" cy="${cy}" r="10"/><line x1="${cx - 34}" y1="${cy}" x2="${cx - 16}" y2="${cy}"/><line x1="${cx + 16}" y1="${cy}" x2="${cx + 34}" y2="${cy}"/></g>
    <g transform="translate(${cx + cs + 24},${cy - cs})"><rect width="270" height="96" rx="10" fill="rgba(0,0,0,.55)"/><text x="24" y="68" font-family="Sans" font-weight="800" font-size="62" fill="${colr}">${T.toFixed(1)}°C</text></g>
    <g transform="translate(64,96)"><rect width="300" height="60" fill="rgba(0,0,0,.6)"/><text x="22" y="41" font-family="Sans" font-weight="800" font-size="28" fill="${colr}">IR · 热成像  ● REC</text></g>
    <defs><linearGradient id="sc" x1="0" y1="1" x2="0" y2="0">${(cold ? ICE : IRON).map(([o, c]) => `<stop offset="${o}" stop-color="rgb(${c.join(',')})"/>`).join('')}</linearGradient></defs>
    <g transform="translate(980,420)"><rect width="30" height="560" rx="6" fill="url(#sc)" stroke="#fff" stroke-width="3"/><text x="15" y="-18" text-anchor="middle" font-family="Sans" font-size="26" fill="#fff">${cold ? '0°' : '50°'}</text><text x="15" y="600" text-anchor="middle" font-family="Sans" font-size="26" fill="#fff">${cold ? '-20°' : '20°'}</text></g>
    ${inset > 0 ? insetSVG(t, inset, cold) : ''}
  </svg>`;
}
function insetSVG(t, s, cold) {   // 小窗：电池里的车位，高温变旧 / 低温长刺
  let cells = '';
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
    const age = cold ? 0 : prog(t, 55.4 + (r * 5 + c) * .05, 56.6 + (r * 5 + c) * .05);
    cells += `<rect x="${24 + c * 66}" y="${70 + r * 52}" width="56" height="40" rx="6" fill="${age > 0 ? `rgb(${lerp(255, 140, age)},${lerp(138, 110, age)},${lerp(60, 90, age)})` : '#ff8a3c'}"/>`;
    if (age > .6 && (r + c) % 3 === 0) cells += `<path d="M${30 + c * 66},${78 + r * 52} l18,14 l-8,6 l20,12" stroke="#3a2a22" stroke-width="3" fill="none"/>`;
  }
  const spike = cold ? eBack(prog(t, 58.4, 58.8), 2) : 0;
  return `<g transform="translate(110,1160) scale(${s})"><rect width="380" height="300" rx="18" fill="rgba(10,10,14,.82)" stroke="${cold ? '#bfe8ff' : '#ffd36a'}" stroke-width="4"/>
    <text x="24" y="48" font-family="Sans" font-weight="800" font-size="30" fill="#fff">${cold ? '低温快充：锂析出' : '电池内部：老化中'}</text>${cells}
    ${spike > 0 ? `<path d="M170,280 L190,${280 - 150 * spike} L210,280 Z" fill="#dfe5ec" stroke="#fff" stroke-width="3"/>` : ''}</g>`;
}

// ---------- UI-3：清单（米白底、墨黑大字、橙色勾）
const UI3_HTML = `<div class="u3g"></div><div class="u3card" id="u3card"><div class="u3face"><div class="u3line" id="u3line"></div>
<div class="u3title"><span id="u3t">护电池，记住 3 件事</span></div>
${['日常充到 <b>80%</b> 左右就够', '别<b>边充边玩</b>大型游戏', '不用等到 <b>0%</b> 再充'].map((s, i) => `<div class="u3row" id="u3r${i}" style="top:${300 + i * 210}px"><span class="u3tick" id="u3k${i}">✓</span><span>${s}</span></div>`).join('')}
<div class="u3note" id="u3note">锂电池没有"记忆效应"，经常用光反而伤</div></div><div class="u3back"></div></div><div id="u3dot"></div>`;
function drawUI3(t) {
  const on = t >= 61.6 && t < 72.1;
  ui3.style.display = on ? 'block' : 'none'; if (!on) return;
  const groundA = 1 - prog(t, 71.0, 71.5);
  ui3.querySelector('.u3g').style.opacity = t < 61.75 ? prog(t, 61.6, 61.75) : groundA;
  // 点 → 线 → 标题从线后升起
  const [px, py] = projPt(new THREE.Vector3(SX, 26, 10));
  const dot = ui3.querySelector('#u3dot'), mv = eIO(prog(t, 62.15, 62.5)), dx = lerp(px, 540, mv), dy = lerp(py, 520, mv);
  dot.style.cssText = `display:${t < 62.6 ? 'block' : 'none'};left:${dx - 14}px;top:${dy - 14}px`;
  const line = ui3.querySelector('#u3line'), lw = eIO(prog(t, 62.5, 62.9)) * 820;
  line.style.cssText = `width:${lw}px;left:${540 - lw / 2 - 90}px;opacity:${t >= 62.5 ? 1 : 0}`;
  const tt = ui3.querySelector('#u3t'); tt.style.transform = `translateY(${(1 - eOut(prog(t, 62.75, 63.3))) * 140}px)`;
  [64.0, 66.2, 68.4].forEach((a, i) => {
    const r = ui3.querySelector('#u3r' + i), k = ui3.querySelector('#u3k' + i), hit = Math.exp(-Math.max(0, t - a) * 16);
    r.style.opacity = t >= a ? 1 : 0; r.style.transform = `scale(${1 + .3 * hit}) translateY(${-30 * hit}px)`;
    k.style.transform = `scale(${t < a + .25 ? 0 : eBack(prog(t, a + .25, a + .5), 3)})`;
  });
  ui3.querySelector('#u3note').style.opacity = prog(t, 69.2, 69.6);
  // 71.0–72.0 卡片翻面成牛皮纸便签，飘落到书桌上
  const card = ui3.querySelector('#u3card'), f = eIO(prog(t, 71.0, 72.0));
  const [nx, ny] = projPt(S2.note.mesh.localToWorld(new THREE.Vector3(0, 10, 0)));
  const sc = lerp(1, .13, f), rot = 180 * eIO(prog(t, 71.0, 71.6)), tilt = lerp(0, 60, prog(t, 71.6, 72.0));
  card.style.transform = `translate(${lerp(0, nx - 540, f)}px,${lerp(0, ny - 980, f) - Math.sin(Math.PI * f) * 120}px) scale(${sc}) rotateY(${rot}deg) rotateX(${tilt}deg) rotateZ(${f * -8}deg)`;
}

// ---------- 镜头（后 45 秒）
const CAM2 = [
  [30.0, RX - 5, 37, 7, RX - 5, 37, 0], [33.0, RX + 2, 42, 96, RX + 2, 38, 0], [36.0, RX - 3, 38, 66, RX - 4, 37, 0], [36.6, RX - 5, 37.5, 46, RX - 5, 37, 0],
  [43.9, RX - 5, 37.5, 46, RX - 5, 37, 0], [44.0, RX + 4, 56, 104, RX + 4, 54, -20], [44.8, RX + 4, 54, 100, RX + 4, 52, -20], [47.6, RX + 2, 44, 96, RX + 2, 40, 0],
  [48.0, RX + 2, 44, 96, RX + 2, 40, 0], [48.55, SX, 34, 92, SX, 30, 0], [51.0, SX, 33, 80, SX, 29, 0], [61.6, SX, 32, 70, SX, 28, 0],
  [70.9, SX, 32, 70, SX, 28, 0], [70.95, 6, 40, 92, 6, 36, 0], [72.0, 6, 42, 100, 6, 38, 0], [75.0, 4, 46, 124, 4, 40, 0]];
function setCam2(t) {
  let k = 0; while (k < CAM2.length - 1 && t > CAM2[k + 1][0]) k++;
  const A = CAM2[k], B = CAM2[Math.min(k + 1, CAM2.length - 1)];
  const u = A === B || B[0] - A[0] < .1 ? (t >= B[0] ? 1 : 0) : eIO((t - A[0]) / (B[0] - A[0]));
  const v = A.map((a, j) => lerp(a, B[j], u));
  const still = (t > 41.6 && t < 42.9) || t > 74.2 || (t > 54.2 && t < 55.2);
  const [jx, jy] = hh(t), q = still ? .1 : .7;
  let sx = 0, sy = 0; [[35.6, .4], [44.75, .5], [57.4, .8]].forEach(([h, a]) => { const d = t - h; if (d > 0 && d < .6) { sx += a * Math.exp(-d * 10) * Math.sin(d * 70); sy += a * Math.exp(-d * 10) * Math.cos(d * 63); } });
  camera.position.set(v[1] + jx * q + sx, v[2] + jy * q + sy, v[3]); camera.lookAt(v[4] + jx * q * .6, v[5] + jy * q * .6, v[6]);
  key.position.set(v[1] - 70, 150, 110); key.target.position.set(v[4], v[5] - 10, 0); key.target.updateMatrixWorld(); rim.position.set(v[1] + 80, 90, -30);
  const night = t < 44.2 && v[1] < -200;
  hemi.color.set(night ? '#8fa6e8' : '#fff1dd'); hemi.groundColor.set(night ? '#151a2c' : '#4a3420'); hemi.intensity = night ? .6 : .55;
  key.color.set(night ? '#9fb4ff' : '#ffd6a0'); key.intensity = night ? 1.3 : 3.2;
  S2.lamp.intensity = night ? 420 : 0;
  scene.background.set(night ? '#10131c' : '#2a1d12');
}
function animate2(t) {
  drawPhone2(t); drawWindow(t); const ring = drawClock(t);
  S2.clock.mesh.rotation.z = ring ? Math.sin(t * 60) * .08 : 0; S2.clock.mesh.position.y = ring ? Math.abs(Math.sin(t * 30)) * .6 : 0;
  S2.sun.visible = t >= 44.75; S2.sun.position.y = 74 + (t >= 44.75 ? 4 * eOut(prog(t, 44.75, 47.5)) : 0); S2.moon.visible = t < 44.3;
  popScale(S2.lifter, t, 34.4, 36.4); S2.lifter.mesh.position.y = Math.abs(Math.sin(t * 9)) * .5;
  S2.steam.forEach((s, i) => { popScale(s, t, 49.0 + i * .25, 1e9); s.mesh.position.y = Math.sin(t * 3 + i) * .6; });
  S2.hands.mesh.position.x = Math.sin(t * 7) * .25;
  S2.note.hinge.visible = t >= 72.0;
  drop(S2.teaser, t, 72.6, 66);
  // 书桌手机：80% · 已优化
  const { g } = phoneTex.userData, W = 600, H = 1200;
  g.clearRect(0, 0, W, H); g.fillStyle = K.white; rr(g, 0, 0, W, H, 96); g.fill(); g.fillStyle = '#18181c'; rr(g, 26, 26, W - 52, H - 52, 76); g.fill();
  g.fillStyle = '#18242f'; rr(g, 46, 46, W - 92, H - 92, 58); g.fill();
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = '800 250px Sans'; g.fillText('80', W / 2 - 40, 520); g.font = '700 110px Sans'; g.fillText('%', W / 2 + 175, 520);
  g.lineWidth = 16; g.strokeStyle = '#2d3b48'; g.beginPath(); g.arc(W / 2, 760, 120, 0, 7); g.stroke(); g.strokeStyle = '#34c759'; g.lineCap = 'round'; g.beginPath(); g.arc(W / 2, 760, 120, -Math.PI / 2, -Math.PI / 2 + Math.PI * 1.6); g.stroke();
  g.fillStyle = '#34c759'; rr(g, W / 2 - 170, 940, 340, 80, 40); g.fill(); g.fillStyle = '#062010'; g.font = '700 42px Sans'; g.fillText('已优化充电', W / 2, 996); g.textAlign = 'left';
  phoneTex.needsUpdate = true;
  S.chart.hinge.visible = false; S.chip.hinge.visible = false; S.fast.hinge.visible = false; S.slow.hinge.visible = false;
  IONS.forEach((m) => m.visible = false);
}
function overlay2(t) {
  let s = '';
  const showTag = !(t >= 51.0 && t < 62.2) && !(t >= 37.0 && t < 44.3) && !(t >= 61.6 && t < 71.6);
  if (showTag) s += `<g transform="translate(64,96)"><rect width="300" height="60" fill="#1E1E1E" opacity=".85"/><text x="22" y="41" font-family="Sans" font-weight="800" font-size="28" fill="#F5D547">生活冷知识 · 01</text></g>`;
  const L = COPY2.find(([a, b]) => t >= a - .1 && t < b + .1);
  if (L) { const [a, b, txt] = L; const al = eOut(prog(t, a - .1, a + .12)) * (1 - eOut(prog(t, b - .05, b + .1))); s += capSVG(txt, al, prog(t, a, a + .45)); }
  const paper = !(t >= 37.3 && t < 44.0) && !(t >= 51.8 && t < 61.6) && !(t >= 61.75 && t < 71.4);
  const vig = paper ? `<defs><radialGradient id="v" cx=".5" cy=".46" r=".72"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#0c0806" stop-opacity=".5"/></radialGradient></defs><rect width="1080" height="1920" fill="url(#v)"/>` : '';
  const navy = 1 - prog(t, 30.0, 30.35);
  ov.innerHTML = `<svg viewBox="0 0 1080 1920" width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">${navy > 0 ? `<rect width="1080" height="1920" fill="#2c4258" opacity="${navy}"/>` : ''}${vig}${s}</svg>`;
  document.getElementById('grain').style.opacity = paper ? .3 : (t >= 51.8 && t < 61.6 ? .18 : .05);
}
async function initP2() { await build2(); }
function renderP2(t) {
  setCam2(t); animate2(t);
  renderer.render(scene, camera);
  drawUI1(t); drawThermal(t); drawUI3(t); overlay2(t);
}
