// 《充到 80% 为什么变慢》30 秒开头样片：纸雕微缩剧场 + UI 动效，一镜到底
// 承接链：80% 大数字 → 跳出屏幕成为曲线上的点 → 推进手机屏幕 → 电池内部（同色接力）→ 电量表；节奏本身讲道理：快充段快、慢充段慢
import * as THREE from '/node_modules/three/build/three.module.js';
window.DEMO = { width: 1080, height: 1920, fps: 30, duration: 75 };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const eIO = (t) => { t = clamp(t); return t < .5 ? 4 * t ** 3 : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const eBack = (t, c = 1.7) => { t = clamp(t); return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const K = { ink: '#1E1E1E', red: '#C8322B', cream: '#F6F0E2', white: '#FAF7F0' };
const ease = { eIO, eOut };
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(1080, 1920, false); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#2a1d12');
const camera = new THREE.PerspectiveCamera(50, 1080 / 1920, 1, 1200);
const loader = new THREE.TextureLoader();
const loadTex = (u, rep = [1, 1], color = true) => new Promise((r) => loader.load(u, (tx) => { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(...rep); if (color) tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; r(tx); }));
const TX = '/assets/stock/tex/';

// ---------- 纸片工具
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
  tx.userData = { c, g };
  return tx;
}
function svgTex(svg, vb, px = 1024) {
  return new Promise((res) => {
    const [, , w, h] = vb, s = px / Math.max(w, h), img = new Image();
    img.onload = () => res(canvasTex(Math.round(w * s), Math.round(h * s), (g) => g.drawImage(img, 0, 0, w * s, h * s)));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${w * s}" height="${h * s}">${svg}</svg>`);
  });
}
function imgTex(url) { return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = url; }); }
let paperN;
function standee(tex, heightCm, o = {}) {
  const asp = tex.image.width / tex.image.height, w = heightCm * asp, h = heightCm;
  const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, o.center ? 0 : h / 2, 0);
  const mat = new THREE.MeshStandardMaterial({ map: tex, normalMap: paperN, normalScale: new THREE.Vector2(.6, .6), roughness: .92, metalness: 0, alphaTest: .5, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: .5 });
  const hinge = new THREE.Group(); hinge.add(mesh);
  if (o.pos) hinge.position.set(...o.pos);
  if (o.ry) hinge.rotation.y = o.ry;
  (o.parent || scene).add(hinge);
  return { hinge, mesh, w, h, base: o.pos ? [...o.pos] : [0, 0, 0] };
}
// 立体书式弹起 / 收起：up 时从平躺弹到直立，down 时再倒回去
function pop(s, t, up, down = 1e9, d = .55) {
  if (t < up || t > down + .5) { s.hinge.visible = false; return 0; }
  s.hinge.visible = true;
  const a = eBack((t - up) / d, 2.2) * (1 - eIO((t - down) / .45));
  s.mesh.rotation.x = -(Math.PI / 2) * (1 - a);
  return a;
}
// 缩放弹出（气泡、问号）
function popScale(s, t, up, down = 1e9) {
  if (t < up || t > down + .3) { s.hinge.visible = false; return; }
  s.hinge.visible = true;
  const a = Math.max(.001, eBack((t - up) / .3, 2.4) * (1 - eIO((t - down) / .3)));
  s.mesh.scale.setScalar(a);
  s.mesh.rotation.z = Math.sin(t * 2.3 + s.base[0]) * .03;
}
function hangTex(text, sub, w, h, col = K.ink, bg = K.cream) {
  return canvasTex(Math.round(w * 20), Math.round(h * 20), (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${H * (sub ? .5 : .62)}px Serif`; g.fillText(text, W / 2, H * (sub ? .4 : .52));
    if (sub) { g.font = `500 ${H * .17}px Sans`; g.fillStyle = '#7a6f60'; g.fillText(sub, W / 2, H * .8); }
    g.beginPath(); g.arc(W / 2, H * .08, H * .035, 0, 7); g.fillStyle = '#5a4a38'; g.fill();
  });
}
function hanging(tex, w, pos, topY = 170) {
  const s = standee(tex, w * tex.image.height / tex.image.width, { pos });
  const strG = new THREE.CylinderGeometry(.08, .08, 1, 6); strG.translate(0, .5, 0);
  const str = new THREE.Mesh(strG, new THREE.MeshStandardMaterial({ color: '#d9cbb3', roughness: 1 }));
  str.position.set(0, s.h, 0); str.scale.y = topY - pos[1] - s.h; s.hinge.add(str);
  return s;
}
// 落下挂好 / 收上去
function drop(s, t, up, y, down = 1e9) {
  if (t < up || t > down + .6) { s.hinge.visible = false; return; }
  s.hinge.visible = true;
  const p = t - up;
  s.hinge.position.y = y + 70 * (1 - eBack(p / .6, 1.4)) + 90 * eIO((t - down) / .6);
  s.hinge.rotation.z = Math.sin(p * 4.2) * .06 * Math.exp(-p * 1.2);
}
// 对话气泡：剪纸白底 + 小尾巴
function bubbleTex(lines, o = {}) {
  const fs = 96, pad = 70, W = Math.max(...lines.map((l) => l.length)) * fs * 1.04 + pad * 2, H = lines.length * fs * 1.3 + pad * 2 + 70;
  return canvasTex(Math.round(W), Math.round(H), (g) => {
    const r = 60, h = H - 70;
    g.fillStyle = K.white; g.strokeStyle = K.ink; g.lineWidth = 12;
    g.beginPath(); g.moveTo(r, 6); g.arcTo(W - 6, 6, W - 6, h, r); g.arcTo(W - 6, h, 6, h, r);
    const tx = o.tail === 'right' ? W * .72 : W * .28;
    g.lineTo(tx + 40, h); g.lineTo(tx + (o.tail === 'right' ? 50 : -50), H - 8); g.lineTo(tx - 40, h);
    g.arcTo(6, h, 6, 6, r); g.arcTo(6, 6, W - 6, 6, r); g.closePath(); g.fill(); g.stroke();
    g.textBaseline = 'middle'; g.textAlign = 'center';
    lines.forEach((l, i) => { g.fillStyle = o.col || K.ink; g.font = `${o.kuai ? '400' : '900'} ${fs}px ${o.kuai ? 'Kuai' : 'Serif'}`; g.fillText(l, W / 2, pad + fs * .6 + i * fs * 1.3); });
  });
}


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
  const cold = t >= 57.4, [px, py] = projPt(THERM_PT);
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
  const [px, py] = projPt(THERM_PT);
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
  const { g } = scr3, W = 620, H = 1280; g.textAlign = 'left';
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
  const pm = new THREE.PMREMGenerator(renderer); envTex = pm.fromScene(new RoomEnvironment(), .04).texture;
  comp3 = new EffectComposer(renderer); comp3.renderTarget1.samples = comp3.renderTarget2.samples = 4;
  comp3.addPass(new RenderPass(scene, camera));
  bokeh = new BokehPass(scene, camera, { focus: 100, aperture: .0004, maxblur: .012 }); comp3.addPass(bokeh);
  comp3.addPass(new OutputPass());
  P3.phone = makePhone(); scene.add(P3.phone);
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
await build(); await initP2(); if (V3D) await initP3();
await Promise.all([document.fonts.load('900 100px Serif'), document.fonts.load('800 40px Sans'), document.fonts.load('30px InsI')]);
window.__ready = true;
