// 《老板画饼》15 秒 · 纸雕微缩剧场（Three.js）。renderAt(t)，t ∈ [0,16)，0 = 歌曲 41.0 s。
import * as THREE from '/node_modules/three/build/three.module.js';
window.DEMO = { width: 1080, height: 1920, fps: 30, duration: 16 };

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const eIO = (t) => { t = clamp(t); return t < .5 ? 4 * t ** 3 : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const eBack = (t, c = 1.7) => { t = clamp(t); return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const K = { ink: '#1E1E1E', red: '#C8322B', cream: '#F6F0E2', white: '#FAF7F0' };
let LY = [];
const ch = (li, ci) => LY[li].chars[Math.min(ci, LY[li].chars.length - 1)];

// ---------- 渲染器 / 场景
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(1080, 1920, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#2a1d12');
scene.fog = new THREE.Fog('#2a1d12', 230, 420);
const camera = new THREE.PerspectiveCamera(50, 1080 / 1920, 1, 1000);

const loader = new THREE.TextureLoader();
const loadTex = (u, rep = [1, 1], color = true) => new Promise((r) => loader.load(u, (tx) => { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(...rep); if (color) tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; r(tx); }));
const TX = '/assets/stock/tex/';

// ---------- 纸片工具
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
  tx.userData = { c, g, draw };
  return tx;
}
function svgTex(svg, vb, px = 1024) {
  return new Promise((res) => {
    const [x, y, w, h] = vb, s = px / Math.max(w, h);
    const img = new Image();
    img.onload = () => res(canvasTex(Math.round(w * s), Math.round(h * s), (g) => g.drawImage(img, 0, 0, w * s, h * s)));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${w * s}" height="${h * s}">${svg}</svg>`);
  });
}
function imgTex(url) { return new Promise((res) => { const i = new Image(); i.onload = () => res({ img: i, tex: canvasTex(i.width, i.height, (g) => g.drawImage(i, 0, 0)) }); i.src = url; }); }
let paperN;
// 一张能「立起来」的纸片：铰链在底边
function standee(tex, heightCm, o = {}) {
  const asp = tex.image.width / tex.image.height, w = heightCm * asp, h = heightCm;
  const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0);
  const mat = new THREE.MeshStandardMaterial({ map: tex, normalMap: paperN, normalScale: new THREE.Vector2(.6, .6), roughness: .92, metalness: 0, alphaTest: .5, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: .5 });
  const hinge = new THREE.Group(); hinge.add(mesh);
  if (o.pos) hinge.position.set(...o.pos);
  if (o.ry) hinge.rotation.y = o.ry;
  scene.add(hinge);
  return { hinge, mesh, w, h };
}
// 立体书式弹起：从平躺（-90°）弹到直立，带回弹
function popUp(s, t, t0, d = .55, flatSign = -1) {
  const p = t - t0;
  if (p <= 0) { s.hinge.visible = false; return; }
  s.hinge.visible = true;
  s.mesh.rotation.x = flatSign * (Math.PI / 2) * (1 - eBack(p / d, 2.2));
}
function hangTag(text, sub, w, h, col = K.ink, bg = K.cream) {
  return canvasTex(Math.round(w * 20), Math.round(h * 20), (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${H * (sub ? .5 : .62)}px Serif`; g.fillText(text, W / 2, H * (sub ? .4 : .52));
    if (sub) { g.font = `500 ${H * .17}px Sans`; g.fillStyle = '#7a6f60'; g.fillText(sub, W / 2, H * .8); }
    g.beginPath(); g.arc(W / 2, H * .08, H * .035, 0, 7); g.fillStyle = '#5a4a38'; g.fill();
  });
}
function hanging(tex, w, pos, topY = 140) {
  const s = standee(tex, w * tex.image.height / tex.image.width, { pos });
  const strG = new THREE.CylinderGeometry(.08, .08, 1, 6); strG.translate(0, .5, 0);
  const str = new THREE.Mesh(strG, new THREE.MeshStandardMaterial({ color: '#d9cbb3', roughness: 1 }));
  str.position.set(0, s.h, 0); str.scale.y = topY - pos[1] - s.h; s.hinge.add(str);
  return s;
}
// 掉下来挂好：从上方落下 + 轻微摆动
function drop(s, t, t0, y, d = .6) {
  const p = t - t0;
  if (p <= 0) { s.hinge.visible = false; return; }
  s.hinge.visible = true;
  s.hinge.position.y = y + 60 * (1 - eBack(p / d, 1.4));
  s.hinge.rotation.z = Math.sin(p * 4.2) * .06 * Math.exp(-p * 1.2);
}

// ---------- 人物（来自 common.js 的半身 + 补全腿）
function chenSVG(expr) {
  const ink = K.ink, skin = '#F1C7A3', hair = '#2A2A2A', top = '#D9786B', sw = 6;
  const s = `stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"`;
  const face = { think: `<circle cx="-28" cy="-334" r="8" fill="${ink}"/><circle cx="28" cy="-334" r="8" fill="${ink}"/><path d="M-12,-288 h24" ${s}/>`,
    side: `<path d="M-40,-332 h22 M18,-332 h22" ${s}/><circle cx="-22" cy="-330" r="6" fill="${ink}"/><circle cx="34" cy="-330" r="6" fill="${ink}"/><path d="M-12,-286 q16,-8 30,4" fill="none" ${s}/>`,
    firm: `<circle cx="-28" cy="-330" r="8" fill="${ink}"/><circle cx="28" cy="-330" r="8" fill="${ink}"/><path d="M-46,-358 l28,8 M18,-350 l28,-8" ${s}/><path d="M-16,-288 h32" ${s}/>` }[expr];
  return `<path d="M-70,-10 L-80,200 L-20,200 L-6,40 L6,40 L20,200 L80,200 L70,-10 Z" fill="#3E4A5C" ${s}/><path d="M-90,200 h76 v20 h-86 Z M14,200 h76 v20 h-86 Z" fill="${ink}"/>
    <path d="M78,-372 C130,-360 140,-300 110,-262 C128,-300 112,-340 70,-350 Z" fill="${hair}" ${s}/>
    <path d="M-140,0 C-140,-130 -104,-218 0,-224 C104,-218 140,-130 140,0 Z" fill="${top}" ${s}/><path d="M-50,-214 L0,-160 L50,-214" fill="none" ${s}/>
    <rect x="-22" y="-262" width="44" height="44" fill="${skin}" ${s}/><ellipse cx="0" cy="-322" rx="78" ry="84" fill="${skin}" ${s}/>
    <path d="M-84,-300 C-100,-410 -30,-440 10,-430 C70,-436 104,-390 86,-300 C80,-340 70,-360 50,-366 C20,-350 -30,-350 -60,-366 C-74,-350 -80,-330 -84,-300 Z" fill="${hair}" ${s}/>
    <circle cx="-80" cy="-300" r="8" fill="${K.red}"/>${face}<circle cx="-48" cy="-300" r="12" fill="#E9A3A0" opacity=".7"/><circle cx="48" cy="-300" r="12" fill="#E9A3A0" opacity=".7"/>`;
}
function bossSVG() {
  const b = boss({ suit: '#3B3F4A', skin: '#F1C7A3', ink: K.ink, sw: 6, expr: 'laugh', shade: '#2E323B' });
  const s = `stroke="${K.ink}" stroke-width="6" stroke-linejoin="round"`;
  return `<path d="M-90,-10 L-96,210 L-22,210 L-8,40 L8,40 L22,210 L96,210 L90,-10 Z" fill="#2B2F38" ${s}/><path d="M-106,210 h86 v22 h-96 Z M20,210 h86 v22 h-96 Z" fill="${K.ink}"/>${b}
    <path d="M150,-170 C220,-210 250,-280 250,-330" fill="none" stroke="${K.ink}" stroke-width="58" stroke-linecap="round"/><path d="M150,-170 C220,-210 250,-280 250,-330" fill="none" stroke="#3B3F4A" stroke-width="44" stroke-linecap="round"/>
    <circle cx="250" cy="-340" r="24" fill="#F1C7A3" ${s}/><rect x="238" y="-430" width="20" height="90" rx="6" fill="${K.red}" ${s} transform="rotate(20,250,-385)"/>`;
}
// 剪纸白边：先画一圈粗白描边
const cutout = (body) => `<g>${body.replace(/fill="[^"]*"/g, `fill="${K.white}"`).replace(/stroke="[^"]*"/g, `stroke="${K.white}"`).replace(/stroke-width="[^"]*"/g, 'stroke-width="40"')}</g>${body}`;

// ---------- 搭场景
const S = {};
let markerTex, contractTex, phoneTex, phoneImg;
async function build() {
  paperN = await loadTex(TX + 'Paper004_2K-JPG_NormalGL.jpg', [1, 1], false);
  const [cardC, cardN, cardR, kraftC, kraftN, kraftR, whiteC] = await Promise.all([
    loadTex(TX + 'Cardboard002_2K-JPG_Color.jpg', [2.2, 1.4]), loadTex(TX + 'Cardboard002_2K-JPG_NormalGL.jpg', [2.2, 1.4], false), loadTex(TX + 'Cardboard002_2K-JPG_Roughness.jpg', [2.2, 1.4], false),
    loadTex(TX + 'Paper004_2K-JPG_Color.jpg', [2, 1.5]), loadTex(TX + 'Paper004_2K-JPG_NormalGL.jpg', [2, 1.5], false), loadTex(TX + 'Paper004_2K-JPG_Roughness.jpg', [2, 1.5], false),
    loadTex(TX + 'Paper001_2K-JPG_Color.jpg', [1, 1])]);
  // 地板（瓦楞纸板）+ 背墙（牛皮纸）+ 两侧墙
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(240, 160), new THREE.MeshStandardMaterial({ map: cardC, normalMap: cardN, roughnessMap: cardR, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wallM = new THREE.MeshStandardMaterial({ map: kraftC, normalMap: kraftN, roughnessMap: kraftR, roughness: 1 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(240, 200), wallM); wall.position.set(0, 100, -50); wall.receiveShadow = true; scene.add(wall);
  for (const sx of [-1, 1]) { const sw = new THREE.Mesh(new THREE.PlaneGeometry(120, 200), wallM); sw.position.set(sx * 92, 100, 10); sw.rotation.y = -sx * Math.PI / 2; sw.receiveShadow = true; scene.add(sw); }
  // 灯光：暖色台灯主光 + 冷色轮廓光 + 天光
  scene.add(new THREE.HemisphereLight('#fff1dd', '#4a3420', .55));
  const key = new THREE.SpotLight('#ffd6a0', 3.2, 0, .62, .9, 0);
  key.position.set(-70, 150, 110); key.target.position.set(10, 20, -15); scene.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 9; key.shadow.blurSamples = 16; key.shadow.bias = -.0004; key.shadow.camera.near = 50; key.shadow.camera.far = 400;
  const rim = new THREE.DirectionalLight('#a9c1ff', .45); rim.position.set(80, 90, -30); scene.add(rim);

  // 白纸材质（桌子、合同）
  const whiteM = new THREE.MeshStandardMaterial({ map: whiteC, normalMap: paperN, roughness: .95 });
  // A 区：小陈 + 书桌 + 计算器 + 「未来的账」吊牌
  const desk = new THREE.Mesh(new THREE.BoxGeometry(36, 15, 18), whiteM); desk.position.set(-45, 7.5, 6); desk.castShadow = desk.receiveShadow = true; scene.add(desk); S.desk = desk;
  S.chenA = standee(await svgTex(cutout(chenSVG('think')), [-200, -480, 400, 740]), 40, { pos: [-46, 0, -6] });
  const calc = await imgTex('/assets/stock/cut/calculator_02.png');
  S.calc = standee(canvasTex(calc.img.width, calc.img.height, (g, W, H) => { g.drawImage(calc.img, 0, 0); g.fillStyle = '#C9D1B6'; g.fillRect(W * .16, H * .09, W * .66, H * .13); g.fillStyle = '#222'; g.font = `800 ${H * .09}px Sans`; g.textAlign = 'right'; g.fillText('????', W * .78, H * .19); }), 11, { pos: [-33, 15, 9], ry: -.35 });
  S.tagA = hanging(hangTag('未来的账', '看病 · 失业 · 养老 · 工伤', 30, 14), 30, [-45, 47, -12]);
  S.qm = standee(await svgTex(cutout(`<text x="0" y="0" font-size="300" font-family="serif" font-weight="900" fill="${K.red}" stroke="${K.ink}" stroke-width="6" text-anchor="middle">?</text>`), [-130, -260, 260, 300]), 12, { pos: [-27, 40, -4] });
  // B 区：背墙上的红笔饼 + 老板 + 立体饼 + 吊牌
  markerTex = canvasTex(1024, 1024, () => {});
  const marker = new THREE.Mesh(new THREE.PlaneGeometry(62, 62), new THREE.MeshStandardMaterial({ map: markerTex, transparent: true, roughness: 1 }));
  marker.position.set(4, 78, -49.6); scene.add(marker);
  S.boss = standee(await svgTex(cutout(bossSVG()), [-230, -490, 520, 760]), 46, { pos: [-26, 0, -34] });
  const pieTop = canvasTex(1024, 1024, (g, W) => {
    const R = W / 2; g.fillStyle = '#E9C27A'; g.beginPath(); g.arc(R, R, R, 0, 7); g.fill();
    const gr = g.createRadialGradient(R, R, R * .3, R, R, R); gr.addColorStop(0, 'rgba(255,230,170,.6)'); gr.addColorStop(1, 'rgba(150,90,30,.55)'); g.fillStyle = gr; g.beginPath(); g.arc(R, R, R, 0, 7); g.fill();
    g.strokeStyle = '#1E1E1E'; g.lineWidth = 18; g.beginPath(); g.arc(R, R, R - 12, 0, 7); g.stroke(); g.lineWidth = 8; g.beginPath(); g.arc(R, R, R * .82, 0, 7); g.stroke();
    const rr = rng(9); for (let i = 0; i < 70; i++) { const a = rr() * 6.28, d = Math.sqrt(rr()) * R * .75; g.save(); g.translate(R + Math.cos(a) * d, R + Math.sin(a) * d); g.rotate(rr() * 3); g.fillStyle = rr() > .3 ? '#FFF6E0' : '#1E1E1E'; g.beginPath(); g.ellipse(0, 0, 14, 7, 0, 0, 7); g.fill(); g.restore(); }
    g.fillStyle = '#C8322B'; g.font = `400 ${R * .34}px Kuai`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('¥500/月', R, R);
  });
  const pieSide = new THREE.MeshStandardMaterial({ color: '#C9954B', normalMap: paperN, roughness: .9 });
  const pieTopM = new THREE.MeshStandardMaterial({ map: pieTop, normalMap: paperN, normalScale: new THREE.Vector2(.8, .8), roughness: .85 });
  const pie = new THREE.Mesh(new THREE.CylinderGeometry(25, 25, 4, 96), [pieSide, pieTopM, pieSide]);
  pie.rotation.x = Math.PI / 2; pieTop.center.set(.5, .5); pieTop.rotation = Math.PI / 2; pie.castShadow = true; pie.receiveShadow = true;
  S.pie = new THREE.Group(); S.pie.add(pie); S.pie.position.set(4, 78, -46); scene.add(S.pie);
  S.tagsB = [['每月+500', K.red, [-24, 106, -40]], ['前途无量', K.ink, [30, 112, -40]], ['以后升职', K.ink, [32, 50, -40]]].map(([w, c, p]) => hanging(hangTag(w, '', 24, 9, c), 24, p, 170));
  S.chenB = standee(await svgTex(cutout(chenSVG('side')), [-200, -480, 400, 740]), 30, { pos: [38, 0, -16] });
  // C 区：立体书房子 + ¥500 票 + 「买不走」
  S.house = new THREE.Group(); S.house.position.set(50, 0, -12); scene.add(S.house);
  S.houseHinge = new THREE.Group(); S.house.add(S.houseHinge);
  const facade = await svgTex(cutout(`<path d="M-160,0 V-200 L0,-340 L160,-200 V0 Z" fill="${K.white}" stroke="${K.ink}" stroke-width="8" stroke-linejoin="round"/><rect x="-40" y="-120" width="80" height="120" fill="#E9C96A" stroke="${K.ink}" stroke-width="8"/><rect x="70" y="-170" width="60" height="60" fill="#BFD7EA" stroke="${K.ink}" stroke-width="8"/><rect x="-130" y="-170" width="60" height="60" fill="#BFD7EA" stroke="${K.ink}" stroke-width="8"/><path d="M0,-230 c-24,-34 -70,-8 -50,26 l50,42 l50,-42 c20,-34 -26,-60 -50,-26 Z" fill="${K.red}"/>`), [-200, -380, 400, 400]);
  const hf = standee(facade, 30); scene.remove(hf.hinge); S.houseHinge.add(hf.hinge); hf.hinge.position.z = 6;
  const hb = standee(facade, 30); scene.remove(hb.hinge); S.houseHinge.add(hb.hinge); hb.hinge.position.z = -8;
  const roofM = new THREE.MeshStandardMaterial({ color: '#B8513F', normalMap: paperN, roughness: .9, side: THREE.DoubleSide });
  for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.PlaneGeometry(17, 14.5), roofM); r.position.set(sx * 6.4, 22.4, -1); r.rotation.set(0, 0, 0); r.rotation.order = 'YXZ'; r.rotation.y = Math.PI / 2; r.rotation.x = sx * -.7; r.castShadow = true; S.houseHinge.add(r); }
  const sideM = new THREE.MeshStandardMaterial({ map: whiteC, normalMap: paperN, roughness: .95, side: THREE.DoubleSide });
  for (const sx of [-1, 1]) { const w2 = new THREE.Mesh(new THREE.PlaneGeometry(14, 16.8), sideM); w2.position.set(sx * 12.9, 8.4, -1); w2.rotation.y = Math.PI / 2; w2.castShadow = w2.receiveShadow = true; S.houseHinge.add(w2); }
  S.ticket = standee(canvasTex(640, 300, (g, W, H) => { g.fillStyle = '#DDE8D5'; g.fillRect(0, 0, W, H); g.strokeStyle = '#2C5A3A'; g.lineWidth = 8; g.strokeRect(18, 18, W - 36, H - 36); g.fillStyle = '#2C5A3A'; g.font = `400 ${H * .5}px InsI`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('¥500', W / 2, H * .5); }), 8, { pos: [22, 18, 6] });
  S.tagC = hanging(hangTag('买不走', '我的家', 26, 13, K.red), 26, [50, 56, -14], 170);
  S.chenC = standee(await svgTex(cutout(chenSVG('firm')), [-200, -480, 400, 740]), 34, { pos: [64, 0, 6], ry: -.3 });
  // D 区：地上的合同 + 手机
  contractTex = canvasTex(820, 1100, () => {});
  const contract = new THREE.Mesh(new THREE.PlaneGeometry(33, 44), new THREE.MeshStandardMaterial({ map: contractTex, normalMap: paperN, roughness: .95 }));
  contract.rotation.x = -Math.PI / 2; contract.rotation.z = .06; contract.position.set(-6, .25, 28); contract.receiveShadow = true; scene.add(contract); S.contract = contract;
  const ph = await imgTex('/assets/stock/cut/hand_holding_smartphone_01.png'); phoneImg = ph.img;
  phoneTex = canvasTex(ph.img.width, ph.img.height, () => {});
  S.phone = standee(phoneTex, 30, { pos: [20, 0, 36], ry: -.25 });
  // E 区：12 张月份卡 + 已缴章 + 「按月 不能差」横幅
  S.cards = [];
  for (let i = 0; i < 12; i++) {
    const tx = canvasTex(300, 400, (g, W, H) => { g.fillStyle = K.white; g.fillRect(0, 0, W, H); g.strokeStyle = K.ink; g.lineWidth = 6; g.strokeRect(10, 10, W - 20, H - 20); g.fillStyle = K.ink; g.font = `400 ${H * .42}px InsI`; g.textAlign = 'center'; g.fillText(String(i + 1).padStart(2, '0'), W / 2, H * .5); g.font = `700 ${H * .1}px Sans`; g.fillText(`${i + 1}月`, W / 2, H * .7); });
    const cx = -19 + (i % 4) * 12.7, cz = 30 + Math.floor(i / 4) * 13; const c = standee(tx, 15, { pos: [cx, 0, cz] });
    const stamp = standee(canvasTex(256, 256, (g, W) => { g.strokeStyle = K.red; g.lineWidth = 16; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 14, 0, 7); g.stroke(); g.fillStyle = K.red; g.font = `900 ${W * .3}px Serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('已缴', W / 2, W / 2 + 4); }), 7, { pos: [cx + 2, 2, cz + .6] });
    S.cards.push([c, stamp]);
  }
  S.banner = hanging(canvasTex(1600, 560, (g, W, H) => { g.fillStyle = K.cream; g.fillRect(0, 0, W, H); g.fillStyle = K.ink; g.textBaseline = 'middle'; g.font = `900 ${H * .5}px Serif`; g.fillText('按月', W * .07, H * .52); g.fillStyle = K.red; g.fillRect(W * .44, H * .14, W * .5, H * .72); g.fillStyle = K.cream; g.textAlign = 'center'; g.fillText('不能差', W * .69, H * .52); }), 58, [0, 86, 10], 190);
}

// 每帧重画的画布：红笔饼、合同高亮、手机记录
function drawMarker(p) {
  const { g, c } = markerTex.userData; g.clearRect(0, 0, c.width, c.height);
  if (p <= 0) return;
  g.strokeStyle = '#C8322B'; g.lineWidth = 26; g.lineCap = 'round';
  g.beginPath(); const R = 440, a0 = -1.9;
  for (let i = 0; i <= 120 * p; i++) { const a = a0 + i / 120 * 6.6, r = R * (1 + .03 * Math.sin(i * .3)); const x = 512 + Math.cos(a) * r, y = 512 + Math.sin(a) * r * .96; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke(); markerTex.needsUpdate = true;
}
function drawContract(hl) {
  const { g, c } = contractTex.userData, W = c.width, H = c.height;
  g.fillStyle = '#FBF8F1'; g.fillRect(0, 0, W, H);
  g.fillStyle = K.ink; g.textAlign = 'center'; g.font = `900 70px Serif`; g.fillText('劳 动 合 同', W / 2, 140);
  g.textAlign = 'left'; g.font = `900 46px Serif`; g.fillText('第七条  社会保险', 70, 270);
  g.font = `500 42px Serif`; ['甲方应依法为乙方缴纳养老、', '医疗、失业、工伤等社会', '保险费。'].forEach((l, i) => g.fillText(l, 70, 360 + i * 70));
  g.fillStyle = '#B9B2A6'; for (let i = 0; i < 6; i++) g.fillRect(70, 640 + i * 60, 600 - (i % 3) * 120, 10);
  g.fillStyle = 'rgba(200,50,43,.9)'; g.fillRect(66, 372, 620 * clamp(hl * 2), 10); g.fillRect(66, 442, 520 * clamp(hl * 2 - 1), 10);
  g.font = `400 120px Kuai`; g.fillStyle = `rgba(200,50,43,${clamp(hl * 3 - 2)})`; g.save(); g.translate(560, 1000); g.rotate(-.18); g.fillText('白纸黑字', -230, 0); g.restore();
  contractTex.needsUpdate = true;
}
function drawPhone(t) {
  const { g, c } = phoneTex.userData, W = c.width, H = c.height;
  g.clearRect(0, 0, W, H);
  const sx = W * .06, sy = H * .04, sw = W * .72, sh = H * .78;
  g.fillStyle = '#fff'; g.fillRect(sx, sy, sw, sh);
  g.fillStyle = '#1F5FAF'; g.font = `900 ${W * .075}px Sans`; g.fillText('掌上12333', sx + 24, sy + 80);
  g.fillStyle = '#777'; g.font = `500 ${W * .045}px Sans`; g.fillText('个人缴费记录', sx + 24, sy + 122);
  for (let i = 0; i < 7; i++) {
    const p = clamp((t - 10.0 - i * .1) / .2); if (p <= 0) continue;
    const y = sy + 160 + i * sh * .1, bad = i === 5; g.globalAlpha = p;
    g.fillStyle = bad ? '#FBE3E0' : '#EEF3EA'; g.fillRect(sx + 14, y, sw - 28, sh * .085);
    g.fillStyle = '#222'; g.font = `600 ${W * .05}px Sans`; g.fillText(`2026-0${i + 1}`, sx + 30, y + sh * .058);
    g.fillStyle = bad ? '#C8322B' : '#4F8A5B'; g.textAlign = 'right'; g.font = `900 ${W * .05}px Sans`; g.fillText(bad ? '未缴 ✕' : '已缴 ✓', sx + sw - 30, y + sh * .058); g.textAlign = 'left';
  }
  g.globalAlpha = 1; g.drawImage(phoneImg, 0, 0); phoneTex.needsUpdate = true;
}

// ---------- 镜头
const CAM = [[0, [-45, 38, 78], [-45, 31, -4]], [2.95, [-45, 36, 68], [-45, 31, -4]], [3.75, [4, 64, 132], [4, 62, -40]], [5.9, [4, 62, 120], [4, 62, -40]], [6.6, [50, 40, 84], [50, 33, -8]], [9.05, [50, 38, 74], [50, 33, -8]], [9.8, [6, 74, 82], [6, 2, 30]], [12.4, [6, 68, 76], [6, 3, 30]], [13.15, [0, 62, 176], [0, 38, 22]], [16, [0, 60, 164], [0, 39, 22]]];
function setCam(t) {
  let k = 0; while (k < CAM.length - 2 && t > CAM[k + 1][0]) k++;
  const [t0, p0, l0] = CAM[k], [t1, p1, l1] = CAM[k + 1];
  const moving = (k % 2 === 1);           // 偶数段=缓慢推，奇数段=转场
  const q = moving ? eIO(prog(t, t0, t1)) : prog(t, t0, t1);
  camera.position.set(lerp(p0[0], p1[0], q), lerp(p0[1], p1[1], q), lerp(p0[2], p1[2], q));
  camera.lookAt(lerp(l0[0], l1[0], q), lerp(l0[1], l1[1], q), lerp(l0[2], l1[2], q));
}

// ---------- 动画
function animate(t) {
  setCam(t);
  // A
  popUp(S.chenA, t, .05); popUp(S.calc, t, .35); drop(S.tagA, t, .2, 47);
  S.qm.hinge.visible = t > ch(0, 9) && t < 3.4; S.qm.mesh.scale.setScalar(eBack(prog(t, ch(0, 9), ch(0, 9) + .35), 2.5) || .001); S.qm.mesh.rotation.y = Math.sin(t * 3) * .2;
  // B
  popUp(S.boss, t, 3.3); popUp(S.chenB, t, 3.7);
  drawMarker(eIO(prog(t, 3.45, 4.45)));
  const pp = eBack(prog(t, 4.35, 4.85), 2), big = eBack(prog(t, ch(1, 6) - .05, ch(1, 6) + .5), 2.4);
  S.pie.visible = t > 4.35; S.pie.scale.setScalar(Math.max(.001, pp * (1 + .6 * big)));
  S.pie.position.z = -46 + 12 * big; S.pie.rotation.z = Math.sin(t * 1.3) * .05 + big * .2; S.pie.rotation.y = -.25 * big;
  S.tagsB.forEach((s, i) => drop(s, t, 4.55 + i * .2, [106, 112, 50][i]));
  // C
  S.houseHinge.visible = t > 6.35; S.houseHinge.rotation.x = -(Math.PI / 2) * (1 - eBack(prog(t, 6.35, 7.0), 2.2));
  const fly = prog(t, ch(2, 3), ch(2, 3) + 1.1);
  popUp(S.ticket, t, 6.5, .4); if (fly > 0) { S.ticket.hinge.position.set(22 - 40 * eOut(fly), 18 + 30 * eOut(fly), 6 + 20 * fly); S.ticket.hinge.rotation.set(fly * 4, fly * 6, fly * 3); }
  drop(S.tagC, t, ch(2, 4) - .1, 56); popUp(S.chenC, t, 6.7);
  // D
  drawContract(prog(t, ch(3, 6), ch(3, 8) + .25)); popUp(S.phone, t, 9.6); drawPhone(t);
  // E
  S.cards.forEach(([c, st], i) => { popUp(c, t, 13.0 + i * .12, .45); const tp = 13.25 + i * .14; st.hinge.visible = t > tp; st.mesh.scale.setScalar(Math.max(.001, eBack(prog(t, tp, tp + .25), 2.6))); st.mesh.rotation.z = -.2; });
  drop(S.banner, t, ch(4, 4) - .1, 86);
}

// ---------- 字幕叠层（米色纸条 + 宋体，逐字浮现）
const ov = document.getElementById('ov');
function overlay(t) {
  let li = -1; for (let i = 0; i < LY.length; i++) if (t >= LY[i].start - .15 && t < LY[i].end + .2) li = i;
  let s = `<g transform="translate(64,96)"><rect width="300" height="60" fill="#1E1E1E" opacity=".85"/><text x="22" y="41" font-family="Sans" font-weight="800" font-size="28" fill="#F5D547">打工人社保课 · 02</text></g>`;
  if (li >= 0) {
    const L = LY[li], out = eOut(prog(t, L.end, L.end + .2)), a = eOut(prog(t, L.start - .15, L.start + .1)) * (1 - out);
    let hz = -1, x = 0, glyphs = '';
    const size = 56, w = [...L.text].reduce((acc, c) => acc + (c === ' ' ? size * .5 : size * 1.04), 0);
    for (const c of L.text) {
      if (/[一-鿿]/.test(c)) hz++;
      const tc = L.chars[Math.max(0, hz)], p = eOut(prog(t, tc - .08, tc + .18));
      if (c !== ' ' && p > 0) glyphs += `<text x="${x + size / 2}" y="${(1 - p) * 14}" text-anchor="middle" font-family="Serif" font-weight="700" font-size="${size}" fill="#1E1E1E" opacity="${p}">${c}</text>`;
      x += c === ' ' ? size * .5 : size * 1.04;
    }
    s += `<g opacity="${a}" transform="translate(${540 - w / 2},1660)"><rect x="-44" y="-74" width="${w + 88}" height="110" fill="#F6F0E2" transform="rotate(-1)"/><rect x="-44" y="-74" width="10" height="110" fill="#C8322B" transform="rotate(-1)"/>${glyphs}</g>`;
  }
  const vig = `<defs><radialGradient id="v" cx=".5" cy=".46" r=".72"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#140c04" stop-opacity=".55"/></radialGradient></defs><rect width="1080" height="1920" fill="url(#v)"/>`;
  const fadeIn = 1 - eOut(prog(t, 0, .35)), fadeOut = eIO(prog(t, 15.4, 16));
  ov.innerHTML = `<svg viewBox="0 0 1080 1920" width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">${vig}${s}${Math.max(fadeIn, fadeOut) > 0 ? `<rect width="1080" height="1920" fill="#120c06" opacity="${Math.max(fadeIn, fadeOut)}"/>` : ''}</svg>`;
}

window.renderAt = async (t) => { animate(t); renderer.render(scene, camera); overlay(t); };
(async () => {
  LY = await (await fetch('lyrics.json')).json();
  const all = LY.map((l) => l.text).join('') + '未来的账看病失业养老工伤每月前途无量以后升职买不走我的家劳动合同第七条社会保险甲方应依法为乙方缴纳医疗等费白纸黑字掌上个人缴费记录已未按月能差打工人社保课02¥500/月';
  await Promise.all([document.fonts.load('900 60px Serif', all), document.fonts.load('700 60px Serif', all), document.fonts.load('500 60px Serif', all), document.fonts.load('900 60px Sans', all + '0123456789✓✕-'), document.fonts.load('700 60px Sans', all), document.fonts.load('500 60px Sans', all), document.fonts.load('600 60px Sans', all + '0123456789-'), document.fonts.load('800 60px Sans', all), document.fonts.load('60px Kuai', all), document.fonts.load('60px InsI', '0123456789¥')]);
  await build();
  window.__ready = true;
})();
