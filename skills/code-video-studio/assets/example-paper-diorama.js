// 《老板画饼》纸雕微缩剧场 · 完整版（整首歌 0:00–2:05.6）
// renderAt(t)，t = 歌曲时间（秒）。一条横向长舞台，镜头沿着它移动。
import * as THREE from '/node_modules/three/build/three.module.js';
window.DEMO = { width: 1080, height: 1920, fps: 30, duration: 125.57 };
const END = 125.57, SHIFT = 53.05;   // 第二轮（前副歌 + 两遍副歌）= 第一轮整体平移 53.05 s

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
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#2a1d12');
scene.fog = new THREE.Fog('#2a1d12', 260, 480);
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

// ---------- 人物 SVG
const cutout = (body) => `<g>${body.replace(/fill="[^"]*"/g, `fill="${K.white}"`).replace(/stroke="[^"]*"/g, `stroke="${K.white}"`).replace(/stroke-width="[^"]*"/g, 'stroke-width="40"')}</g>${body}`;
function chenSVG(expr, o = {}) {
  const ink = K.ink, skin = '#F1C7A3', hair = '#2A2A2A', top = '#D9786B', sw = 6;
  const s = `stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"`;
  const face = {
    think: `<circle cx="-28" cy="-334" r="8" fill="${ink}"/><circle cx="28" cy="-334" r="8" fill="${ink}"/><path d="M-12,-288 h24" ${s}/>`,
    side: `<path d="M-40,-332 h22 M18,-332 h22" ${s}/><circle cx="-22" cy="-330" r="6" fill="${ink}"/><circle cx="34" cy="-330" r="6" fill="${ink}"/><path d="M-12,-286 q16,-8 30,4" fill="none" ${s}/>`,
    firm: `<circle cx="-28" cy="-330" r="8" fill="${ink}"/><circle cx="28" cy="-330" r="8" fill="${ink}"/><path d="M-46,-358 l28,8 M18,-350 l28,-8" ${s}/><path d="M-16,-288 h32" ${s}/>`,
    smile: `<path d="M-40,-334 q11,-13 22,0 M18,-334 q11,-13 22,0" fill="none" ${s}/><path d="M-24,-296 q24,26 48,0" fill="none" ${s}/>`,
    laugh: `<path d="M-40,-336 q11,-13 22,0 M18,-336 q11,-13 22,0" fill="none" ${s}/><path d="M-30,-300 Q0,-250 30,-300 Z" fill="#8E3A2E" ${s}/>`,
    calm: `<circle cx="-28" cy="-330" r="8" fill="${ink}"/><circle cx="28" cy="-330" r="8" fill="${ink}"/><path d="M-14,-288 q14,10 28,0" fill="none" ${s}/>`,
  }[expr];
  const arm = o.arm === 'push' ? `<path d="M110,-170 C170,-190 210,-230 240,-250" fill="none" stroke="${ink}" stroke-width="56" stroke-linecap="round"/><path d="M110,-170 C170,-190 210,-230 240,-250" fill="none" stroke="${top}" stroke-width="42" stroke-linecap="round"/><circle cx="248" cy="-256" r="26" fill="${skin}" ${s}/>` : '';
  return `<path d="M-70,-10 L-80,200 L-20,200 L-6,40 L6,40 L20,200 L80,200 L70,-10 Z" fill="#3E4A5C" ${s}/><path d="M-90,200 h76 v20 h-86 Z M14,200 h76 v20 h-86 Z" fill="${ink}"/>
    <path d="M78,-372 C130,-360 140,-300 110,-262 C128,-300 112,-340 70,-350 Z" fill="${hair}" ${s}/>
    <path d="M-140,0 C-140,-130 -104,-218 0,-224 C104,-218 140,-130 140,0 Z" fill="${top}" ${s}/><path d="M-50,-214 L0,-160 L50,-214" fill="none" ${s}/>
    <rect x="-22" y="-262" width="44" height="44" fill="${skin}" ${s}/><ellipse cx="0" cy="-322" rx="78" ry="84" fill="${skin}" ${s}/>
    <path d="M-84,-300 C-100,-410 -30,-440 10,-430 C70,-436 104,-390 86,-300 C80,-340 70,-360 50,-366 C20,-350 -30,-350 -60,-366 C-74,-350 -80,-330 -84,-300 Z" fill="${hair}" ${s}/>
    <circle cx="-80" cy="-300" r="8" fill="${K.red}"/>${face}<circle cx="-48" cy="-300" r="12" fill="#E9A3A0" opacity=".7"/><circle cx="48" cy="-300" r="12" fill="#E9A3A0" opacity=".7"/>${arm}`;
}
function bossSVG(o = {}) {
  const b = boss({ suit: '#3B3F4A', skin: '#F1C7A3', ink: K.ink, sw: 6, expr: o.expr || 'laugh', shade: '#2E323B' });
  const s = `stroke="${K.ink}" stroke-width="6" stroke-linejoin="round"`;
  const legs = `<path d="M-90,-10 L-96,210 L-22,210 L-8,40 L8,40 L22,210 L96,210 L90,-10 Z" fill="#2B2F38" ${s}/><path d="M-106,210 h86 v22 h-96 Z M20,210 h86 v22 h-96 Z" fill="${K.ink}"/>`;
  const arm = o.arm === 'draw' ? `<path d="M150,-170 C220,-210 250,-280 250,-330" fill="none" stroke="${K.ink}" stroke-width="58" stroke-linecap="round"/><path d="M150,-170 C220,-210 250,-280 250,-330" fill="none" stroke="#3B3F4A" stroke-width="44" stroke-linecap="round"/><circle cx="250" cy="-340" r="24" fill="#F1C7A3" ${s}/><rect x="238" y="-430" width="20" height="90" rx="6" fill="${K.red}" ${s} transform="rotate(20,250,-385)"/>`
    : o.arm === 'offer' ? `<path d="M150,-170 C220,-170 260,-200 290,-220" fill="none" stroke="${K.ink}" stroke-width="58" stroke-linecap="round"/><path d="M150,-170 C220,-170 260,-200 290,-220" fill="none" stroke="#3B3F4A" stroke-width="44" stroke-linecap="round"/><circle cx="298" cy="-226" r="24" fill="#F1C7A3" ${s}/>` : '';
  return legs + b + arm;
}
const CHV = [-200, -480, 470, 740], BOV = [-230, -490, 560, 760];

// ---------- 搭场景
const S = {};
let marker1, marker2, contractTex, phoneTex, phoneImg, key, lamp, hemi;
async function build() {
  paperN = await loadTex(TX + 'Paper004_2K-JPG_NormalGL.jpg', [1, 1], false);
  const [cardC, cardN, cardR, kraftC, kraftN, kraftR, whiteC] = await Promise.all([
    loadTex(TX + 'Cardboard002_2K-JPG_Color.jpg', [4.4, 1.4]), loadTex(TX + 'Cardboard002_2K-JPG_NormalGL.jpg', [4.4, 1.4], false), loadTex(TX + 'Cardboard002_2K-JPG_Roughness.jpg', [4.4, 1.4], false),
    loadTex(TX + 'Paper004_2K-JPG_Color.jpg', [4, 1.5]), loadTex(TX + 'Paper004_2K-JPG_NormalGL.jpg', [4, 1.5], false), loadTex(TX + 'Paper004_2K-JPG_Roughness.jpg', [4, 1.5], false),
    loadTex(TX + 'Paper001_2K-JPG_Color.jpg', [1, 1])]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(480, 160), new THREE.MeshStandardMaterial({ map: cardC, normalMap: cardN, roughnessMap: cardR, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.x = -60; floor.receiveShadow = true; scene.add(floor);
  const wallM = new THREE.MeshStandardMaterial({ map: kraftC, normalMap: kraftN, roughnessMap: kraftR, roughness: 1 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(480, 200), wallM); wall.position.set(-60, 100, -50); wall.receiveShadow = true; scene.add(wall);
  for (const [x, sx] of [[-232, -1], [92, 1]]) { const sw = new THREE.Mesh(new THREE.PlaneGeometry(120, 200), wallM); sw.position.set(x, 100, 10); sw.rotation.y = -sx * Math.PI / 2; sw.receiveShadow = true; scene.add(sw); }
  hemi = new THREE.HemisphereLight('#fff1dd', '#4a3420', .55); scene.add(hemi);
  key = new THREE.SpotLight('#ffd6a0', 3.2, 0, .62, .9, 0);
  key.position.set(-70, 150, 110); scene.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(1536, 1536); key.shadow.bias = -.0005; key.shadow.camera.near = 50; key.shadow.camera.far = 420;
  const rim = new THREE.DirectionalLight('#a9c1ff', .45); rim.position.set(80, 90, -30); scene.add(rim);
  lamp = new THREE.PointLight('#ffbf70', 0, 70, 1.6); lamp.position.set(-30, 30, 10); scene.add(lamp);
  const whiteM = new THREE.MeshStandardMaterial({ map: whiteC, normalMap: paperN, roughness: .95 });
  const woodM = new THREE.MeshStandardMaterial({ color: '#B98A5E', normalMap: paperN, roughness: .9 });

  // ===== 城市区（x≈-175）：纸楼一栋栋立起 + 出租屋 + 拖行李的小陈
  const bcol = ['#E9DCC3', '#CDB894', '#F3EDE2', '#B8A27D', '#DCCFB6', '#C4B08C', '#EFE6D6'];
  S.buildings = [];
  const BX = [-212, -198, -186, -172, -160, -146, -138], BH = [46, 64, 38, 72, 52, 40, 58], BZ = [-30, -38, -24, -40, -32, -22, -36];
  for (let i = 0; i < 7; i++) {
    const tx = canvasTex(400, Math.round(400 * BH[i] / 18), (g, W, H) => {
      g.fillStyle = bcol[i]; g.fillRect(0, 0, W, H); g.strokeStyle = K.ink; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10);
      const rows = Math.floor((H - 60) / 90); for (let r = 0; r < rows; r++) for (let c = 0; c < 3; c++) { g.fillStyle = (r * 3 + c + i) % 4 ? '#F6D58B' : '#8FA3B0'; g.fillRect(50 + c * 110, 50 + r * 90, 70, 56); g.strokeRect(50 + c * 110, 50 + r * 90, 70, 56); }
    });
    S.buildings.push(standee(tx, BH[i], { pos: [BX[i], 0, BZ[i]] }));
  }
  const roomSVG = `<path d="M-150,0 V-170 L0,-280 L150,-170 V0 Z" fill="#F3EDE2" stroke="${K.ink}" stroke-width="8" stroke-linejoin="round"/><rect x="-30" y="-110" width="60" height="110" fill="#B98A5E" stroke="${K.ink}" stroke-width="8"/><rect x="50" y="-150" width="60" height="50" fill="#F6D58B" stroke="${K.ink}" stroke-width="8"/><rect x="-110" y="-230" width="220" height="44" fill="${K.red}"/><text x="0" y="-197" font-size="34" font-weight="900" text-anchor="middle" fill="#fff" font-family="serif">出租屋 · 12㎡</text>`;
  S.room = standee(await svgTex(cutout(roomSVG), [-190, -320, 380, 340]), 26, { pos: [-168, 0, -6] });
  S.chenWalk = standee(await svgTex(cutout(chenSVG('calm') + `<rect x="150" y="40" width="110" height="150" rx="16" fill="#5E7FA8" stroke="${K.ink}" stroke-width="6"/><path d="M180,40 v-30 h50 v30" fill="none" stroke="${K.ink}" stroke-width="8"/><circle cx="175" cy="200" r="12" fill="${K.ink}"/><circle cx="235" cy="200" r="12" fill="${K.ink}"/>`), [-200, -480, 500, 740]), 30, { pos: [-205, 0, 8] });

  // ===== 老板办公室（x≈-100）
  const desk = new THREE.Mesh(new THREE.BoxGeometry(34, 17, 16), woodM); desk.position.set(-104, 8.5, 2); desk.castShadow = desk.receiveShadow = true; scene.add(desk);
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(37, 1.2, 18), new THREE.MeshStandardMaterial({ color: '#8C6440', roughness: .8 })); deskTop.position.set(-104, 17.6, 2); deskTop.castShadow = deskTop.receiveShadow = true; scene.add(deskTop);
  S.bossOffice = standee(await svgTex(cutout(bossSVG({ arm: 'offer' })), BOV), 46, { pos: [-112, 0, -8] });
  S.bossPat = standee(await svgTex(cutout(bossSVG({ arm: 'offer', expr: 'smile' })), BOV), 46, { pos: [-96, 0, -2] });
  S.bossDraw = standee(await svgTex(cutout(bossSVG({ arm: 'draw' })), BOV), 46, { pos: [-122, 0, -30] });
  S.chenOffice = standee(await svgTex(cutout(chenSVG('calm')), CHV), 40, { pos: [-80, 0, 8], ry: -.25 });
  S.chenLaugh = standee(await svgTex(cutout(chenSVG('laugh', { arm: 'push' })), CHV), 40, { pos: [-80, 0, 8], ry: -.25 });
  S.chenFirm = standee(await svgTex(cutout(chenSVG('firm')), CHV), 40, { pos: [-80, 0, 8], ry: -.25 });
  S.chenSmile = standee(await svgTex(cutout(chenSVG('smile')), CHV), 40, { pos: [-80, 0, 8], ry: -.25 });
  S.chenSide = standee(await svgTex(cutout(chenSVG('side')), CHV), 40, { pos: [-80, 0, 8], ry: -.25 });
  S.title = hanging(canvasTex(1400, 620, (g, W, H) => { g.fillStyle = K.cream; g.fillRect(0, 0, W, H); g.fillStyle = K.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${H * .42}px Serif`; g.fillText('老板画饼', W / 2, H * .44); g.fillStyle = K.red; g.fillRect(W * .2, H * .76, W * .6, 8); g.fillStyle = '#7a6f60'; g.font = `500 ${H * .1}px Sans`; g.fillText('打工人社保课 · 02', W / 2, H * .88); }), 46, [-100, 46, -20], 190);
  const pieDisk = (txt) => canvasTex(600, 600, (g, W) => {
    const R = W / 2; g.fillStyle = '#E9C27A'; g.beginPath(); g.arc(R, R, R - 4, 0, 7); g.fill();
    g.strokeStyle = K.ink; g.lineWidth = 14; g.beginPath(); g.arc(R, R, R - 12, 0, 7); g.stroke();
    const rr = rng(4); for (let i = 0; i < 40; i++) { const a = rr() * 6.28, d = Math.sqrt(rr()) * R * .72; g.fillStyle = rr() > .3 ? '#FFF6E0' : K.ink; g.beginPath(); g.ellipse(R + Math.cos(a) * d, R + Math.sin(a) * d, 10, 5, a, 0, 7); g.fill(); }
    if (txt) { g.fillStyle = K.red; g.font = `400 ${R * .38}px Kuai`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, R, R); }
  });
  S.smallPie = standee(pieDisk('+500'), 13, { pos: [-90, 26, -4] });
  S.bub0 = standee(bubbleTex(['社保咱不交了，', '每月多发五百！']), 15, { pos: [-114, 50, -6], center: true });
  S.ha = standee(canvasTex(500, 400, (g, W, H) => { g.fillStyle = K.red; g.font = `400 ${H * .8}px Kuai`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeStyle = K.white; g.lineWidth = 30; g.strokeText('哈！', W / 2, H / 2); g.fillText('哈！', W / 2, H / 2); }), 11, { pos: [-70, 50, 10], center: true });
  S.bub1 = standee(bubbleTex(['饼太大，', '我可吃不下。'], { tail: 'right' }), 15, { pos: [-82, 52, 8], center: true });
  S.bub3 = standee(bubbleTex(['年轻人，别慌！']), 9, { pos: [-104, 52, -2], center: true });
  S.tag500 = hanging(hangTex('+500/月', '', 22, 9, K.red), 22, [-114, 52, -20], 190);
  S.tagSB = hanging(hangTex('社保', '先放一放', 18, 12), 18, [-96, 48, -20], 190);
  const agree = canvasTex(700, 900, (g, W, H) => { g.fillStyle = '#FBF8F1'; g.fillRect(0, 0, W, H); g.fillStyle = K.ink; g.textAlign = 'center'; g.font = '900 64px Serif'; g.fillText('自愿书', W / 2, 120); g.textAlign = 'left'; g.font = '500 40px Serif'; ['本人自愿放弃缴纳', '社会保险，公司每月', '另付补贴五百元。'].forEach((l, i) => g.fillText(l, 60, 240 + i * 66)); g.fillStyle = '#B9B2A6'; for (let i = 0; i < 4; i++) g.fillRect(60, 480 + i * 56, 560 - i * 80, 10); g.fillStyle = K.ink; g.font = '700 40px Serif'; g.fillText('签字：', 60, 800); g.fillRect(190, 806, 300, 4); });
  S.agree = new THREE.Mesh(new THREE.PlaneGeometry(13, 17), new THREE.MeshStandardMaterial({ map: agree, normalMap: paperN, roughness: .95 }));
  S.agree.rotation.x = -Math.PI / 2; S.agree.receiveShadow = true; scene.add(S.agree);
  const penG = new THREE.Group(); const pb = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 12, 16), new THREE.MeshStandardMaterial({ color: K.ink, roughness: .4 })); const pc = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 3, 16), new THREE.MeshStandardMaterial({ color: K.red, roughness: .4 })); pc.position.y = 5; penG.add(pb, pc); penG.traverse((m) => { m.castShadow = true; }); scene.add(penG); S.pen = penG;
  S.bub7 = standee(bubbleTex(['这饼画得圆，', '我可不敢尝。'], { tail: 'right' }), 15, { pos: [-82, 54, 8], center: true });
  marker1 = canvasTex(1024, 1024, () => {});
  const mk1 = new THREE.Mesh(new THREE.PlaneGeometry(56, 56), new THREE.MeshStandardMaterial({ map: marker1, transparent: true, roughness: 1 })); mk1.position.set(-100, 84, -49.6); scene.add(mk1);

  // ===== A 区（x≈-45）：小陈的书桌 + 台灯 + 账本
  const deskA = new THREE.Mesh(new THREE.BoxGeometry(36, 15, 18), whiteM); deskA.position.set(-45, 7.5, 6); deskA.castShadow = deskA.receiveShadow = true; scene.add(deskA);
  const lampG = new THREE.Group(); const lb = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 14, 10), new THREE.MeshStandardMaterial({ color: '#333', roughness: .5 })); lb.position.y = 7; const ls = new THREE.Mesh(new THREE.ConeGeometry(4, 5, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#C8322B', roughness: .7, side: THREE.DoubleSide })); ls.position.y = 15; lampG.add(lb, ls); lampG.position.set(-31, 15, 4); lampG.traverse((m) => { m.castShadow = true; }); scene.add(lampG);
  S.chenA = standee(await svgTex(cutout(chenSVG('think')), CHV), 40, { pos: [-46, 0, -6] });
  const calcImg = await imgTex('/assets/stock/cut/calculator_02.png');
  S.calc = standee(canvasTex(calcImg.width, calcImg.height, (g, W, H) => { g.drawImage(calcImg, 0, 0); g.fillStyle = '#C9D1B6'; g.fillRect(W * .16, H * .09, W * .66, H * .13); g.fillStyle = '#222'; g.font = `800 ${H * .09}px Sans`; g.textAlign = 'right'; g.fillText('????', W * .78, H * .19); }), 11, { pos: [-36, 15, 9], ry: -.35 });
  S.tagA = hanging(hangTex('未来的账', '看病 · 失业 · 养老 · 工伤', 30, 14), 30, [-45, 47, -12]);
  S.qm = standee(await svgTex(cutout(`<text x="0" y="0" font-size="300" font-family="serif" font-weight="900" fill="${K.red}" stroke="${K.ink}" stroke-width="6" text-anchor="middle">?</text>`), [-130, -260, 260, 300]), 12, { pos: [-27, 40, -4], center: true });

  // ===== B 区（x≈0）：墙上的饼 + 老板 + 立体饼 + 吊牌
  marker2 = canvasTex(1024, 1024, () => {});
  const mk2 = new THREE.Mesh(new THREE.PlaneGeometry(62, 62), new THREE.MeshStandardMaterial({ map: marker2, transparent: true, roughness: 1 })); mk2.position.set(4, 78, -49.6); scene.add(mk2);
  S.bossB = standee(await svgTex(cutout(bossSVG({ arm: 'draw' })), BOV), 46, { pos: [-26, 0, -34] });
  const pieTop = canvasTex(1024, 1024, (g, W) => {
    const R = W / 2; g.fillStyle = '#E9C27A'; g.beginPath(); g.arc(R, R, R, 0, 7); g.fill();
    const gr = g.createRadialGradient(R, R, R * .3, R, R, R); gr.addColorStop(0, 'rgba(255,230,170,.6)'); gr.addColorStop(1, 'rgba(150,90,30,.55)'); g.fillStyle = gr; g.beginPath(); g.arc(R, R, R, 0, 7); g.fill();
    g.strokeStyle = K.ink; g.lineWidth = 18; g.beginPath(); g.arc(R, R, R - 12, 0, 7); g.stroke(); g.lineWidth = 8; g.beginPath(); g.arc(R, R, R * .82, 0, 7); g.stroke();
    const rr = rng(9); for (let i = 0; i < 70; i++) { const a = rr() * 6.28, d = Math.sqrt(rr()) * R * .75; g.save(); g.translate(R + Math.cos(a) * d, R + Math.sin(a) * d); g.rotate(rr() * 3); g.fillStyle = rr() > .3 ? '#FFF6E0' : K.ink; g.beginPath(); g.ellipse(0, 0, 14, 7, 0, 0, 7); g.fill(); g.restore(); }
    g.fillStyle = K.red; g.font = `400 ${R * .34}px Kuai`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('¥500/月', R, R);
  });
  pieTop.center.set(.5, .5); pieTop.rotation = Math.PI / 2;
  const pieSide = new THREE.MeshStandardMaterial({ color: '#C9954B', normalMap: paperN, roughness: .9 });
  const pie = new THREE.Mesh(new THREE.CylinderGeometry(25, 25, 4, 96), [pieSide, new THREE.MeshStandardMaterial({ map: pieTop, normalMap: paperN, roughness: .85 }), pieSide]);
  pie.rotation.x = Math.PI / 2; pie.castShadow = pie.receiveShadow = true;
  S.pie = new THREE.Group(); S.pie.add(pie); S.pie.position.set(4, 78, -46); scene.add(S.pie);
  // 饼碎片（第二遍副歌戳破）
  S.shards = [];
  const shardM = new THREE.MeshStandardMaterial({ color: '#E2B56A', normalMap: paperN, roughness: .9, side: THREE.DoubleSide });
  for (let i = 0; i < 14; i++) { const a0 = i / 14 * Math.PI * 2, sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(Math.cos(a0) * 25, Math.sin(a0) * 25); sh.lineTo(Math.cos(a0 + .45) * 25, Math.sin(a0 + .45) * 25); sh.closePath(); const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 2, bevelEnabled: false }), shardM); m.castShadow = true; m.userData.a = a0; m.visible = false; scene.add(m); S.shards.push(m); }
  S.poof = standee(canvasTex(600, 400, (g, W, H) => { g.fillStyle = K.ink; g.font = `400 ${H * .7}px Kuai`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeStyle = K.white; g.lineWidth = 28; g.strokeText('噗——', W / 2, H / 2); g.fillText('噗——', W / 2, H / 2); }), 14, { pos: [10, 96, -30], center: true });
  S.tagsB = [['每月+500', K.red, [-24, 106, -40]], ['前途无量', K.ink, [30, 112, -40]], ['以后升职', K.ink, [32, 50, -40]]].map(([w, c, p]) => hanging(hangTex(w, '', 24, 9, c), 24, p, 190));
  S.chenB = standee(await svgTex(cutout(chenSVG('side')), CHV), 30, { pos: [38, 0, -16] });
  // ===== C 区（x≈50）：立体书房子 + ¥500 票 + 「买不走」
  S.house = new THREE.Group(); S.house.position.set(50, 0, -12); scene.add(S.house);
  S.houseHinge = new THREE.Group(); S.house.add(S.houseHinge);
  const facade = await svgTex(cutout(`<path d="M-160,0 V-200 L0,-340 L160,-200 V0 Z" fill="${K.white}" stroke="${K.ink}" stroke-width="8" stroke-linejoin="round"/><rect x="-40" y="-120" width="80" height="120" fill="#E9C96A" stroke="${K.ink}" stroke-width="8"/><rect x="70" y="-170" width="60" height="60" fill="#BFD7EA" stroke="${K.ink}" stroke-width="8"/><rect x="-130" y="-170" width="60" height="60" fill="#BFD7EA" stroke="${K.ink}" stroke-width="8"/><path d="M0,-230 c-24,-34 -70,-8 -50,26 l50,42 l50,-42 c20,-34 -26,-60 -50,-26 Z" fill="${K.red}"/>`), [-200, -380, 400, 400]);
  for (const z of [6, -8]) { const f = standee(facade, 30, { parent: S.houseHinge }); f.hinge.position.z = z; }
  const roofM = new THREE.MeshStandardMaterial({ color: '#B8513F', normalMap: paperN, roughness: .9, side: THREE.DoubleSide });
  for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.PlaneGeometry(17, 14.5), roofM); r.position.set(sx * 6.4, 22.4, -1); r.rotation.order = 'YXZ'; r.rotation.y = Math.PI / 2; r.rotation.x = sx * -.7; r.castShadow = true; S.houseHinge.add(r); }
  const sideM = new THREE.MeshStandardMaterial({ map: whiteC, normalMap: paperN, roughness: .95, side: THREE.DoubleSide });
  for (const sx of [-1, 1]) { const w2 = new THREE.Mesh(new THREE.PlaneGeometry(14, 16.8), sideM); w2.position.set(sx * 12.9, 8.4, -1); w2.rotation.y = Math.PI / 2; w2.castShadow = w2.receiveShadow = true; S.houseHinge.add(w2); }
  const ticketTex = canvasTex(640, 300, (g, W, H) => { g.fillStyle = '#DDE8D5'; g.fillRect(0, 0, W, H); g.strokeStyle = '#2C5A3A'; g.lineWidth = 8; g.strokeRect(18, 18, W - 36, H - 36); g.fillStyle = '#2C5A3A'; g.font = `400 ${H * .5}px InsI`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('¥500', W / 2, H * .5); });
  S.ticket = standee(ticketTex, 8, { pos: [24, 18, 6] });
  S.tagC = hanging(hangTex('买不走', '我的家', 26, 13, K.red), 26, [50, 56, -14], 190);
  S.chenC = standee(await svgTex(cutout(chenSVG('firm')), CHV), 34, { pos: [64, 0, 6], ry: -.3 });
  // ===== D 区：合同 + 手机
  contractTex = canvasTex(820, 1100, () => {});
  S.contract = standee(contractTex, 44, { pos: [-6, 0, 22] });
  const ph = await imgTex('/assets/stock/cut/hand_holding_smartphone_01.png'); phoneImg = ph;
  phoneTex = canvasTex(ph.width, ph.height, () => {});
  S.phone = standee(phoneTex, 30, { pos: [20, 0, 36], ry: -.25 });
  // ===== E 区：12 张月份卡（3 排 × 4）+ 已缴章 + 横幅
  S.cards = [];
  for (let i = 0; i < 12; i++) {
    const tx = canvasTex(300, 400, (g, W, H) => { g.fillStyle = K.white; g.fillRect(0, 0, W, H); g.strokeStyle = K.ink; g.lineWidth = 6; g.strokeRect(10, 10, W - 20, H - 20); g.fillStyle = K.ink; g.font = `400 ${H * .42}px InsI`; g.textAlign = 'center'; g.fillText(String(i + 1).padStart(2, '0'), W / 2, H * .5); g.font = `700 ${H * .1}px Sans`; g.fillText(`${i + 1}月`, W / 2, H * .7); });
    const cx = -19 + (i % 4) * 12.7, cz = 34 + Math.floor(i / 4) * 12;
    const c = standee(tx, 15, { pos: [cx, 0, cz] });
    const st = standee(canvasTex(256, 256, (g, W) => { g.strokeStyle = K.red; g.lineWidth = 16; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 14, 0, 7); g.stroke(); g.fillStyle = K.red; g.font = `900 ${W * .3}px Serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('已缴', W / 2, W / 2 + 4); }), 7, { pos: [cx + 2, 5.5, cz + .6], center: true });
    S.cards.push([c, st]);
  }
  const bannerTex = (word) => canvasTex(1600, 560, (g, W, H) => { g.fillStyle = K.cream; g.fillRect(0, 0, W, H); g.fillStyle = K.ink; g.textBaseline = 'middle'; g.font = `900 ${H * .5}px Serif`; g.fillText('按月', W * .07, H * .52); g.fillStyle = K.red; g.fillRect(W * .44, H * .14, W * .5, H * .72); g.fillStyle = K.cream; g.textAlign = 'center'; g.fillText(word, W * .69, H * .52); });
  S.banner1 = hanging(bannerTex('不能差'), 58, [0, 86, 10], 200);
  S.banner2 = hanging(bannerTex('不能塌'), 58, [0, 86, 10], 200);

  // ===== 主歌二：公告墙区（x≈-165）
  const V = {};
  V.poster = standee(canvasTex(900, 1200, (g, W, H) => {
    g.fillStyle = '#FBF8F1'; g.fillRect(0, 0, W, H); g.fillStyle = K.red; g.fillRect(0, 0, W, 170);
    g.fillStyle = '#fff'; g.font = '900 110px Serif'; g.textAlign = 'center'; g.fillText('通  知', W / 2, 125);
    g.fillStyle = K.ink; g.font = '900 64px Serif'; g.fillText('2026 年 11 月 1 日起', W / 2, 300);
    g.textAlign = 'left'; g.font = '500 50px Serif'; ['用人单位不缴、少缴社保费，', '经责令限期缴纳仍未缴的，', '可处欠缴数额'].forEach((l, i) => g.fillText(l, 70, 440 + i * 80));
    g.fillStyle = K.red; g.font = '900 96px Serif'; g.fillText('1–3 倍罚款', 70, 760);
    g.fillStyle = '#7a6f60'; g.font = '500 36px Sans'; g.fillText('—— 税务总局公告 2026 年第 20 号', 70, 880);
    g.fillStyle = K.red; [[60, 40], [W - 60, 40]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y + 200, 22, 0, 7); g.fill(); });
  }), 42, { pos: [-168, 34, -48.4] });
  V.cal = standee(canvasTex(500, 560, (g, W, H) => { g.fillStyle = K.white; g.fillRect(0, 0, W, H); g.fillStyle = K.red; g.fillRect(0, 0, W, 140); g.fillStyle = '#fff'; g.font = '900 64px Serif'; g.textAlign = 'center'; g.fillText('十一月', W / 2, 98); g.fillStyle = K.ink; g.font = `400 ${H * .5}px InsI`; g.fillText('1', W / 2, H * .86); }), 16, { pos: [-136, 60, -48.6] });
  V.oct = standee(canvasTex(500, 560, (g, W, H) => { g.fillStyle = '#F1EADC'; g.fillRect(0, 0, W, H); g.fillStyle = '#8A857C'; g.fillRect(0, 0, W, 140); g.fillStyle = '#fff'; g.font = '900 64px Serif'; g.textAlign = 'center'; g.fillText('十月', W / 2, 98); g.fillStyle = K.ink; g.font = `400 ${H * .5}px InsI`; g.fillText('31', W / 2, H * .86); }), 16, { pos: [-136, 60, -48.3] });
  V.oct.mesh.geometry.translate(0, -16, 0); V.oct.hinge.position.y = 76;   // 铰链在顶边：可以往上翻走
  V.leaves = [];
  const leafCol = ['#C8322B', '#E39B3A', '#B8513F', '#D9B26A'];
  for (let i = 0; i < 20; i++) V.leaves.push(standee(canvasTex(160, 120, (g, W, H) => { g.fillStyle = leafCol[i % 4]; g.beginPath(); g.ellipse(W / 2, H / 2, W * .45, H * .3, .4, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 5; g.beginPath(); g.moveTo(W * .1, H * .7); g.lineTo(W * .9, H * .3); g.stroke(); }), 7, { pos: [-210, 40, 0], center: true }));
  V.gear = standee(canvasTex(512, 512, (g, W) => { const R = W / 2; g.translate(R, R); g.fillStyle = '#CDB894'; g.strokeStyle = K.ink; g.lineWidth = 10; g.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? R * .78 : R * .96; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#FBF8F1'; g.beginPath(); g.arc(0, 0, R * .42, 0, 7); g.fill(); g.stroke(); g.fillStyle = K.red; g.font = `900 ${R * .3}px Serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('罚款', 0, 0); }), 18, { pos: [-184, 72, -44], center: true });
  V.letter = standee(canvasTex(700, 900, (g, W, H) => { g.fillStyle = '#FBF8F1'; g.fillRect(0, 0, W, H); g.fillStyle = K.ink; g.textAlign = 'center'; g.font = '900 54px Serif'; g.fillText('责令限期缴纳', W / 2, 130); g.fillText('通 知 书', W / 2, 210); g.fillStyle = '#B9B2A6'; for (let i = 0; i < 7; i++) g.fillRect(70, 300 + i * 70, 560 - (i % 3) * 90, 12); }), 22, { pos: [-176, 0, 14], ry: .3 });
  V.limit = standee(canvasTex(300, 300, (g, W) => { g.strokeStyle = K.red; g.lineWidth = 18; g.strokeRect(20, 20, W - 40, W - 40); g.fillStyle = K.red; g.font = `900 ${W * .32}px Serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('限期', W / 2, W / 2 + 6); }), 8, { pos: [-174, 13, 17], center: true });
  V.blocks = [1, 2, 3].map((n, i) => standee(canvasTex(300, 220 * n + 120, (g, W, H) => { for (let k = 0; k < n; k++) { g.fillStyle = ['#E9DCC3', '#DCC9A8', '#CDB894'][k]; g.fillRect(10, H - 220 * (k + 1) - 10, W - 20, 210); g.strokeStyle = K.ink; g.lineWidth = 8; g.strokeRect(10, H - 220 * (k + 1) - 10, W - 20, 210); } g.fillStyle = K.red; g.font = `400 110px InsI`; g.textAlign = 'center'; g.fillText(`×${n}`, W / 2, 100); }), 9 * n + 5, { pos: [-160 + i * 11, 0, 2] }));
  V.blockSign = standee(canvasTex(900, 220, (g, W, H) => { g.fillStyle = K.cream; g.fillRect(0, 0, W, H); g.fillStyle = K.ink; g.font = '900 86px Serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('欠缴金额的 1–3 倍', W / 2, H / 2); }), 6, { pos: [-150, 40, -48.2] });
  const shockSVG = bossSVG({ expr: 'shock' }) + `<path d="M110,-420 q20,40 0,60 q-20,-20 0,-60 Z M150,-380 q16,32 0,48 q-16,-16 0,-48 Z" fill="#8FD3F4" stroke="${K.ink}" stroke-width="5"/>`;
  V.bossShock = standee(await svgTex(cutout(shockSVG), BOV), 46, { pos: [-170, 0, -16] });
  // 办公室：再商量 / 账本 / 已缴
  V.bub21 = standee(bubbleTex(['再商量商量～']), 9, { pos: [-106, 52, -2], center: true });
  V.book = new THREE.Group(); V.book.position.set(-100, 18.3, 6); scene.add(V.book);
  const pageTex = (side) => canvasTex(500, 650, (g, W, H) => { g.fillStyle = '#FBF8F1'; g.fillRect(0, 0, W, H); g.strokeStyle = '#D7CFBF'; g.lineWidth = 4; for (let i = 0; i < 10; i++) { g.beginPath(); g.moveTo(30, 90 + i * 55); g.lineTo(W - 30, 90 + i * 55); g.stroke(); } g.fillStyle = K.ink; g.font = '900 56px Serif'; g.textAlign = 'left';
    if (side === 'L') { g.fillText('社保账本', 40, 70); g.font = '500 44px Serif'; ['养老', '医疗', '失业', '工伤'].forEach((w, i) => g.fillText(w, 50, 190 + i * 110)); }
    else { g.fillText('每月按时', 40, 70); g.font = '700 54px Sans'; g.fillStyle = '#4F8A5B'; for (let i = 0; i < 4; i++) g.fillText('✓ 已缴', 60, 190 + i * 110); } });
  const pm = (tx) => new THREE.MeshStandardMaterial({ map: tx, normalMap: paperN, roughness: .95, side: THREE.DoubleSide });
  const right = new THREE.Mesh(new THREE.PlaneGeometry(10, 13).translate(5, 0, 0), pm(pageTex('R'))); right.rotation.x = -Math.PI / 2; right.receiveShadow = true;
  V.leftPivot = new THREE.Group(); const left = new THREE.Mesh(new THREE.PlaneGeometry(10, 13).translate(-5, 0, 0), pm(pageTex('L'))); left.rotation.x = -Math.PI / 2; left.position.y = .05; left.castShadow = true; V.leftPivot.add(left);
  const cover = new THREE.Mesh(new THREE.BoxGeometry(21, .6, 14), new THREE.MeshStandardMaterial({ color: '#7A2F26', roughness: .8 })); cover.position.y = -.35; cover.receiveShadow = true;
  V.book.add(cover, right, V.leftPivot);
  V.paid = standee(canvasTex(300, 300, (g, W) => { g.strokeStyle = K.red; g.lineWidth = 16; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 14, 0, 7); g.stroke(); g.fillStyle = K.red; g.font = `900 ${W * .3}px Serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('已缴', W / 2, W / 2 + 4); }), 7, { pos: [-96, 23, 13], center: true });
  V.coins = [0, 1, 2].map((i) => standee(canvasTex(200, 200, (g, W) => { g.fillStyle = '#E8B93C'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 6, 0, 7); g.fill(); g.strokeStyle = '#8C6420'; g.lineWidth = 10; g.stroke(); g.fillStyle = '#8C6420'; g.font = `900 ${W * .5}px Sans`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('¥', W / 2, W / 2 + 4); }), 4, { pos: [-104 + i * 4, 40, 8], center: true }));
  S.V = V;
  // ===== 用户设计的新小陈（1:12 之后替换旧形象）
  // ===== 用户设计的新形象：小陈（chen2）+ 白猫老板（boss2），全片替换
  const nt = {};
  for (const [k, f] of [['walk', 'chen2/walk'], ['think', 'chen2/think'], ['side', 'chen2/side'], ['smile', 'chen2/smile'], ['firm', 'chen2/firm'],
    ['bStand', 'boss2/stand'], ['bOffer', 'boss2/offer'], ['bDraw', 'boss2/draw'], ['bWave', 'boss2/wave'], ['bShock', 'boss2/shock']]) {
    const im = await imgTex(`/assets/${f}.png`); nt[k] = canvasTex(im.width, im.height, (g) => g.drawImage(im, 0, 0));
  }
  const nu = (old, k, h) => standee(nt[k], h, { pos: [...old.base], ry: old.hinge.rotation.y });
  const mk = (old, k, h) => ({ old, pick: () => 0, nus: [nu(old, k, h)] });
  SWAP.push(mk(S.chenOffice, 'smile', 42), mk(S.chenLaugh, 'firm', 42), mk(S.chenFirm, 'firm', 42), mk(S.chenSide, 'side', 42), mk(S.chenSmile, 'smile', 42),
    mk(S.chenA, 'think', 42), mk(S.chenB, 'side', 32), mk(S.chenC, 'firm', 36), mk(S.chenWalk, 'walk', 34),
    mk(S.bossOffice, 'bOffer', 45), mk(S.bossDraw, 'bDraw', 46), mk(S.bossB, 'bDraw', 46), mk(V.bossShock, 'bShock', 44),
    { old: S.bossPat, pick: (t) => (t > 87.35 && t < 91 ? 1 : 0), nus: [nu(S.bossPat, 'bWave', 45), nu(S.bossPat, 'bStand', 45)] });
}
const SWAP = [];
function applySwap(t) {
  for (const { old, pick, nus } of SWAP) {
    const k = pick(t);
    nus.forEach((nu, i) => {
      nu.hinge.visible = i === k && old.hinge.visible;
      nu.hinge.position.copy(old.hinge.position); nu.hinge.rotation.copy(old.hinge.rotation);
      nu.mesh.rotation.copy(old.mesh.rotation); nu.mesh.scale.copy(old.mesh.scale);
    });
    old.hinge.visible = false;
  }
}

// 所有活动物件（每帧先全部隐藏，再由当前段落打开需要的）
function everything() {
  const out = [];
  const walk = (o) => { if (!o) return; if (o.hinge) out.push(o.hinge); else if (o.isObject3D) out.push(o); else if (Array.isArray(o)) o.forEach(walk); else if (typeof o === 'object') Object.values(o).forEach(walk); };
  Object.entries(S).forEach(([k, v]) => { if (k !== 'V') walk(v); });
  return out;
}
let ALL_OBJ = [], V_OBJ = [];

// ---------- 每帧重画的画布
function drawMarker(tex, p) {
  const { g, c } = tex.userData; g.clearRect(0, 0, c.width, c.height);
  if (p > 0) {
    g.strokeStyle = K.red; g.lineWidth = 26; g.lineCap = 'round'; g.beginPath();
    for (let i = 0; i <= 120 * p; i++) { const a = -1.9 + i / 120 * 6.6, r = 440 * (1 + .03 * Math.sin(i * .3)); const x = 512 + Math.cos(a) * r, y = 512 + Math.sin(a) * r * .96; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  tex.needsUpdate = true;
}
function drawContract(hl) {
  const { g, c } = contractTex.userData, W = c.width, H = c.height;
  g.fillStyle = '#FBF8F1'; g.fillRect(0, 0, W, H);
  g.fillStyle = K.ink; g.textAlign = 'center'; g.font = '900 70px Serif'; g.fillText('劳 动 合 同', W / 2, 140);
  g.textAlign = 'left'; g.font = '900 46px Serif'; g.fillText('第七条  社会保险', 70, 270);
  g.font = '500 42px Serif'; ['甲方应依法为乙方缴纳养老、', '医疗、失业、工伤等社会', '保险费。'].forEach((l, i) => g.fillText(l, 70, 360 + i * 70));
  g.fillStyle = '#B9B2A6'; for (let i = 0; i < 6; i++) g.fillRect(70, 640 + i * 60, 600 - (i % 3) * 120, 10);
  g.fillStyle = 'rgba(200,50,43,.9)'; g.fillRect(66, 372, 620 * clamp(hl * 2), 10); g.fillRect(66, 442, 520 * clamp(hl * 2 - 1), 10);
  g.font = '400 120px Kuai'; g.fillStyle = `rgba(200,50,43,${clamp(hl * 3 - 2)})`; g.save(); g.translate(560, 1000); g.rotate(-.18); g.fillText('白纸黑字', -230, 0); g.restore();
  contractTex.needsUpdate = true;
}
function drawPhone(t0, t) {
  const { g, c } = phoneTex.userData, W = c.width, H = c.height;
  g.clearRect(0, 0, W, H);
  const sx = W * .06, sy = H * .04, sw = W * .72, sh = H * .78;
  g.fillStyle = '#fff'; g.fillRect(sx, sy, sw, sh);
  g.fillStyle = '#1F5FAF'; g.font = `900 ${W * .075}px Sans`; g.textAlign = 'left'; g.fillText('掌上12333', sx + 24, sy + 80);
  g.fillStyle = '#777'; g.font = `500 ${W * .045}px Sans`; g.fillText('个人缴费记录', sx + 24, sy + 122);
  for (let i = 0; i < 7; i++) {
    const p = clamp((t - t0 - i * .1) / .2); if (p <= 0) continue;
    const y = sy + 160 + i * sh * .1, bad = i === 5; g.globalAlpha = p;
    g.fillStyle = bad ? '#FBE3E0' : '#EEF3EA'; g.fillRect(sx + 14, y, sw - 28, sh * .085);
    g.fillStyle = '#222'; g.font = `600 ${W * .05}px Sans`; g.fillText(`2026-0${i + 1}`, sx + 30, y + sh * .058);
    g.fillStyle = bad ? K.red : '#4F8A5B'; g.textAlign = 'right'; g.font = `900 ${W * .05}px Sans`; g.fillText(bad ? '未缴 ✕' : '已缴 ✓', sx + sw - 30, y + sh * .058); g.textAlign = 'left';
  }
  g.globalAlpha = 1; g.drawImage(phoneImg, 0, 0); phoneTex.needsUpdate = true;
}

// ---------- 镜头：机位 + 时间线（每个镜头 0.75 s 过渡，停留时缓慢推近）
const P = {
  open: [[-100, 52, 150], [-100, 40, -10]], office: [[-98, 40, 92], [-98, 33, -6]], boss: [[-110, 42, 68], [-108, 36, -6]], chen: [[-84, 38, 64], [-86, 34, -2]],
  city: [[-176, 44, 104], [-176, 32, -10]], desk: [[-96, 54, 64], [-98, 18, 4]], wallO: [[-98, 60, 112], [-98, 58, -40]],
  A: [[-45, 38, 78], [-45, 31, -4]], B: [[4, 64, 132], [4, 62, -40]], C: [[50, 40, 84], [50, 33, -8]], D: [[6, 74, 82], [6, 2, 30]], E: [[0, 62, 176], [0, 38, 22]],
  Clow: [[54, 14, 72], [50, 28, -8]], Dclose: [[2, 58, 62], [4, 4, 30]],
  notice: [[-162, 56, 104], [-162, 50, -40]], blocks: [[-150, 36, 86], [-152, 26, -6]], ledger: [[-100, 50, 52], [-100, 18, 4]],
};
const SHOTS = [[0, 'open'], [2.6, 'boss'], [9.8, 'chen'], [17.6, 'city'], [21.1, 'office'], [24.25, 'boss'], [27.65, 'desk'], [30.95, 'chen'], [33.85, 'wallO'], [37.4, 'A'],
  [44.0, 'B'], [46.95, 'C'], [50.1, 'D'], [53.45, 'E'], [57.1, 'B'], [59.95, 'Clow'], [63.3, 'Dclose'], [66.55, 'E'],
  [71.55, 'notice'], [77.55, 'blocks'], [80.85, 'office'], [84.15, 'chen'], [85.8, 'ledger'], [89.85, 'A']];
const FIRST = 18;   // 第一轮的镜头数
function shotState(i, t) {
  const [t0, name] = SHOTS[i], t1 = i + 1 < SHOTS.length ? SHOTS[i + 1][0] : END;
  const [p, l] = P[name], k = .07 * eIO(prog(t, t0, t1));
  return [p.map((v, j) => lerp(v, l[j], k)), l];
}
function setCam(t, o = {}) {
  const n = o.max || SHOTS.length;
  let i = 0; while (i < n - 1 && t >= SHOTS[i + 1][0]) i++;
  let [p, l] = shotState(i, t);
  const tr = prog(t, SHOTS[i][0], SHOTS[i][0] + .75);
  if (i > 0 && tr < 1 && SHOTS[i][0] >= (o.noBlendBefore || 0)) { const [pp, pl] = shotState(i - 1, SHOTS[i][0]); const q = eIO(tr); p = p.map((v, j) => lerp(pp[j], v, q)); l = l.map((v, j) => lerp(pl[j], v, q)); }
  camera.position.set(...p); camera.lookAt(...l);
  // 主光跟着镜头走（像跟随的舞台灯）
  key.position.set(l[0] - 75, 150, 110); key.target.position.set(l[0] + 8, 18, -15);
  const dim = eIO(prog(t, 37.5, 38.4)) * (1 - eIO(prog(t, 43.6, 44.3)));
  key.intensity = 3.2 * (1 - .62 * dim); hemi.intensity = .55 * (1 - .5 * dim); lamp.intensity = 60 * dim;
}

// ---------- 动画（全部是 t 的函数）
function animate(t, o = {}) {
  setCam(t, o);
  // 开场标题
  drop(S.title, t, .4, 46, 2.5);
  // 前奏对白：老板递饼，小陈「哈！」推开
  pop(S.bossOffice, t, ...(t < 24 ? [.2, 21.0] : [27.6, 33.8]));
  const showChen = (s, a, b) => pop(s, t, a, b, .35);
  showChen(S.chenOffice, .5, 10.0); showChen(S.chenLaugh, 10.05, 17.4);
  popScale(S.bub0, t, ch(0, 2) - .1, 9.6);
  const pieUp = t > ch(0, 10) - .1 && t < 17.5; S.smallPie.hinge.visible = pieUp;
  if (pieUp) { const a = eBack(prog(t, ch(0, 10) - .1, ch(0, 10) + .25), 2.2), push = eIO(prog(t, ch(1, 9), ch(1, 9) + .5)); S.smallPie.mesh.scale.setScalar(Math.max(.001, a)); S.smallPie.hinge.position.set(-104 - 10 * push, 28 + 10 * push - 40 * eIO(prog(t, ch(1, 9) + .3, ch(1, 9) + 1.1)), -4 - 6 * push); S.smallPie.hinge.rotation.z = push * 2.4; }
  popScale(S.ha, t, 10.08, 11.4); popScale(S.bub1, t, 11.45, 17.2);
  // 主歌一：城市 → 出租屋
  S.buildings.forEach((b, i) => pop(b, t, 17.7 + i * .16, 21.2));
  pop(S.room, t, 19.2, 21.2);
  const walk = prog(t, ch(2, 5) - .2, 21.0); S.chenWalk.hinge.position.x = lerp(-205, -178, eIO(walk)); S.chenWalk.hinge.position.y = Math.abs(Math.sin(walk * 18)) * .8; pop(S.chenWalk, t, 18.4, 21.2);
  // 拍肩膀
  showChen(S.chenFirm, 21.1, 31.2);
  const pat = t > 21.0 && t < 27.7; pop(S.bossPat, t, 21.15, 27.6, .35);
  if (pat) S.bossPat.hinge.rotation.z = -Math.max(0, Math.sin((t - 21.6) * 9)) * .08 * (t > 21.6 && t < 23.2);
  popScale(S.bub3, t, ch(3, 6) - .1, 24.3);
  drop(S.tag500, t, ch(4, 0) - .1, 52, 33.8); drop(S.tagSB, t, ch(4, 5) - .1, 48, ch(4, 9) + .2);
  // 自愿书滑上桌 + 笔
  const ag = eOut(prog(t, ch(5, 0) - .1, ch(5, 0) + .6)); S.agree.visible = t > ch(5, 0) - .1 && t < 37.5;
  S.agree.position.set(lerp(-118, -100, ag), 18.3, lerp(-2, 4, ag)); S.agree.rotation.z = lerp(.5, .08, ag);
  const penT = prog(t, ch(6, 6) - .1, ch(6, 9) + .1);
  S.pen.visible = t > 28.3 && t < 37.5; S.pen.position.set(lerp(-88, -96, eIO(penT)), lerp(19, 18.8, eIO(penT)), lerp(14, 6, eIO(penT))); S.pen.rotation.set(0, .4, lerp(.4, Math.PI / 2, eIO(penT)));
  showChen(S.chenSmile, 31.25, 34.0);
  // 墙上又画了个饼，小陈摇头
  pop(S.bossDraw, t, 33.9, 37.5);
  drawMarker(marker1, eIO(prog(t, 34.2, 35.3)));
  showChen(S.chenSide, 34.0, 37.5); if (t > 36.0 && t < 37.4) S.chenSide.hinge.rotation.y = -.25 + Math.sin((t - 36) * 14) * .25 * (1 - prog(t, 36, 37.4));
  popScale(S.bub7, t, ch(7, 5) - .1, 37.5);
  // 前副歌 + 「未来的账」：A 区
  pop(S.chenA, t, 37.3); pop(S.calc, t, 37.7); drop(S.tagA, t, 41.15, 47);
  popScale(S.qm, t, ch(9, 9), 44.2);
  // 第一遍副歌（与 15 秒版同一套动作）
  pop(S.bossB, t, 44.3); pop(S.chenB, t, 44.7);
  drawMarker(marker2, eIO(prog(t, 44.45, 45.45)));
  const burst = prog(t, ch(14, 6) - .02, ch(14, 6) + 1.4);
  const pp = eBack(prog(t, 45.35, 45.85), 2), big1 = eBack(prog(t, ch(10, 6) - .05, ch(10, 6) + .5), 2.4), big2 = eBack(prog(t, ch(14, 3), ch(14, 3) + .6), 2.4);
  const swell = big1 * (1 - .4 * prog(t, 57.2, 57.8)) + .5 * big2;
  S.pie.visible = t > 45.35 && burst <= 0; S.pie.scale.setScalar(Math.max(.001, pp * (1 + .6 * swell) * (1 + .06 * Math.sin(t * 20) * prog(t, 58.6, ch(14, 6)))));
  S.pie.position.z = -46 + 12 * Math.min(1, swell); S.pie.rotation.z = Math.sin(t * 1.3) * .05 + swell * .2; S.pie.rotation.y = -.25 * Math.min(1, swell);
  S.shards.forEach((m) => { m.visible = burst > 0 && burst < 1; if (!m.visible) return; const a = m.userData.a, d = eOut(burst) * 60; m.position.set(4 + Math.cos(a) * d, 78 + Math.sin(a) * d - 50 * burst * burst, -34 + 20 * burst); m.rotation.set(burst * 6 + a, burst * 4, a); m.scale.setScalar(1.5 * (1 - burst * .5)); });
  popScale(S.poof, t, ch(14, 6), 59.55 + 1.2);
  S.tagsB.forEach((s, i) => drop(s, t, 45.55 + i * .2, [106, 112, 50][i]));
  S.houseHinge.visible = t > 47.35; S.houseHinge.rotation.x = -(Math.PI / 2) * (1 - eBack(prog(t, 47.35, 48.0), 2.2));
  const fly = (t0) => prog(t, t0, t0 + 1.1);
  const f1 = fly(ch(11, 3)), f2 = fly(ch(15, 3));
  S.ticket.hinge.visible = (t > 47.5 && f1 < 1) || (t > 60.3 && f2 < 1);
  const f = t > 60 ? f2 : f1; const tup = t > 60 ? 60.3 : 47.5;
  S.ticket.mesh.rotation.x = -(Math.PI / 2) * (1 - eBack(prog(t, tup, tup + .4), 2.2));
  S.ticket.hinge.position.set(24 - 40 * eOut(f), 18 + 30 * eOut(f), 6 + 20 * f); S.ticket.hinge.rotation.set(f * 4, f * 6, f * 3);
  drop(S.tagC, t, ch(11, 4) - .1, 56); pop(S.chenC, t, 47.7);
  // 合同 + 手机：第一遍 50.6 起，53.4 收起；第二遍 63.5 起，66.5 收起
  const hl = t < 60 ? prog(t, ch(12, 6), ch(12, 8) + .25) : prog(t, ch(16, 6), ch(16, 8) + .25);
  drawContract(hl);
  const ctUp = t < 60 ? 50.5 : 63.5, ctDn = t < 60 ? 53.3 : 66.5;
  pop(S.contract, t, ctUp, ctDn); pop(S.phone, t, ctUp + .15, ctDn); drawPhone(ctUp + .4, t);
  S.contract.hinge.rotation.y = .06;
  // 12 个月：第一遍 54.0 起，第二遍收起后 66.9 再起
  S.cards.forEach(([c, st], i) => {
    const up1 = 54.0 + i * .12, up2 = 66.9 + i * .08;
    if (t < 63.2) { pop(c, t, up1, 63.0, .45); const ts = 54.25 + i * .14; st.hinge.visible = t > ts && t < 63.2; st.mesh.scale.setScalar(Math.max(.001, eBack(prog(t, ts, ts + .25), 2.6))); }
    else { pop(c, t, up2, 1e9, .45); const ts = 67.1 + i * .1; st.hinge.visible = t > ts; st.mesh.scale.setScalar(Math.max(.001, eBack(prog(t, ts, ts + .25), 2.6))); }
    st.mesh.rotation.z = -.2;
  });
  drop(S.banner1, t, ch(13, 4) - .1, 86, 56.9); drop(S.banner2, t, ch(17, 4) - .1, 86);
}

// ---------- 字幕叠层：米色纸条 + 宋体，逐字浮现，长句自动折成两行
const ov = document.getElementById('ov');
function splitLine(text) {
  if ([...text].length <= 12) return [text];
  const mid = text.length / 2; let best = -1;
  [...text].forEach((c, i) => { if (/[，、 ！]/.test(c) && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i; });
  return best < 0 ? [text] : [text.slice(0, best + 1), text.slice(best + 1)];
}
function overlay(t) {
  let li = -1; for (let i = 0; i < LY.length; i++) if (t >= LY[i].start - .15 && t < LY[i].end + .2) li = i;
  let s = `<g transform="translate(64,96)"><rect width="300" height="60" fill="#1E1E1E" opacity=".85"/><text x="22" y="41" font-family="Sans" font-weight="800" font-size="28" fill="#F5D547">打工人社保课 · 02</text></g>`;
  if (li >= 0) {
    const L = LY[li], out = eOut(prog(t, L.end, L.end + .2)), a = eOut(prog(t, L.start - .15, L.start + .1)) * (1 - out);
    const rows = splitLine(L.text.replace(/[。]$/, '')), size = 54;
    let hz = -1, glyphs = '', maxW = 0;
    rows.forEach((row, r) => {
      const w = [...row].reduce((acc, c) => acc + (c === ' ' ? size * .5 : size * 1.04), 0); maxW = Math.max(maxW, w);
      let x = -w / 2;
      for (const c of row) {
        if (/[一-鿿]/.test(c)) hz++;
        const tc = L.chars[Math.max(0, Math.min(hz, L.chars.length - 1))], p = eOut(prog(t, tc - .08, tc + .18));
        if (c !== ' ' && p > 0) glyphs += `<text x="${x + size / 2}" y="${r * 74 + (1 - p) * 14}" text-anchor="middle" font-family="Serif" font-weight="700" font-size="${size}" fill="#1E1E1E" opacity="${p}">${c}</text>`;
        x += c === ' ' ? size * .5 : size * 1.04;
      }
    });
    const h = 110 + (rows.length - 1) * 74, y0 = 1700 - (rows.length - 1) * 74;
    s += `<g opacity="${a}" transform="translate(540,${y0})"><rect x="${-maxW / 2 - 44}" y="-74" width="${maxW + 88}" height="${h}" fill="#F6F0E2" transform="rotate(-1)"/><rect x="${-maxW / 2 - 44}" y="-74" width="10" height="${h}" fill="#C8322B" transform="rotate(-1)"/>${glyphs}</g>`;
  }
  const vig = `<defs><radialGradient id="v" cx=".5" cy=".46" r=".72"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#140c04" stop-opacity=".55"/></radialGradient></defs><rect width="1080" height="1920" fill="url(#v)"/>`;
  const fade = Math.max(1 - eOut(prog(t, 0, .6)), eIO(prog(t, END - .7, END)));
  ov.innerHTML = `<svg viewBox="0 0 1080 1920" width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">${vig}${s}${fade > 0 ? `<rect width="1080" height="1920" fill="#120c06" opacity="${fade}"/>` : ''}</svg>`;
}

// ---------- 主歌二（71.55–90.79）
function verse2(t) {
  const V = S.V;
  setCam(t);
  const bright = eIO(prog(t, ch(23, 9) - .2, ch(23, 11))) * (1 - eIO(prog(t, 90.4, 90.8)));
  key.intensity = 3.2 * (1 + .35 * bright); hemi.intensity = .55 * (1 + .6 * bright);
  // 风吹落叶，十月那页被吹走，贴出新规
  V.leaves.forEach((lf, i) => { const p = prog(t, 71.5 + i * .07, 73.7 + i * .07); lf.hinge.visible = p > 0 && p < 1; if (!lf.hinge.visible) return; lf.hinge.position.set(-215 + 110 * p, 50 + 30 * Math.sin(i * 1.7) - 26 * p + 5 * Math.sin(p * 12 + i), 20 - (i % 5) * 9); lf.mesh.rotation.set(p * 9 + i, p * 6, p * 11 + i); });
  V.cal.hinge.visible = true;
  const fl = prog(t, ch(18, 3), ch(18, 3) + .7); V.oct.hinge.visible = fl < 1; V.oct.mesh.rotation.x = -2.6 * eIO(fl);
  drop(V.poster, t, ch(18, 8) - .15, 34);
  // 罚款齿轮转起来 + 责令限期通知书 + 「限期」章
  V.gear.hinge.visible = t > 74.4; V.gear.mesh.scale.setScalar(Math.max(.001, eBack(prog(t, 74.4, 74.8), 2.2))); V.gear.mesh.rotation.z = -Math.max(0, t - ch(19, 2)) * 2.2;
  pop(V.letter, t, ch(19, 5) - .1); popScale(V.limit, t, ch(19, 8));
  // 三倍：×1 ×2 ×3 依次立起 + 标注；老板冒汗探头
  V.blocks.forEach((b, i) => pop(b, t, ch(20, [0, 1, 3][i]) - .05, 1e9, .5));
  drop(V.blockSign, t, ch(20, 4), 40);
  pop(V.bossShock, t, ch(20, 7) - .1, 80.9); V.bossShock.hinge.position.x = lerp(-200, -170, eOut(prog(t, ch(20, 7) - .1, ch(20, 7) + .5)));
  // 办公室：老板招手「再商量商量」，小陈摇头，翻开账本，盖「已缴」，灯光变亮
  const showChen = (s2, a, b) => pop(s2, t, a, b, .35);
  pop(S.bossPat, t, 80.9, 1e9, .35); S.bossPat.hinge.rotation.z = Math.sin(Math.max(0, t - ch(21, 3)) * 10) * .07 * (t < 83.6);
  popScale(V.bub21, t, ch(21, 6) - .1, 84.2);
  showChen(S.chenFirm, 80.9, 84.3); showChen(S.chenSide, 84.3, 87.35); if (t > 84.5 && t < 85.6) S.chenSide.hinge.rotation.y = -.25 + Math.sin((t - 84.5) * 14) * .28 * (1 - prog(t, 84.5, 85.6)); else S.chenSide.hinge.rotation.y = -.25;
  showChen(S.chenSmile, 87.35, 1e9);
  V.book.visible = t > 84.8; V.leftPivot.rotation.z = Math.PI * (1 - eIO(prog(t, ch(22, 6) - .1, ch(22, 8))));
  popScale(V.paid, t, ch(23, 4)); 
  V.coins.forEach((c, i) => { const p = prog(t, ch(23, 0) + i * .18, ch(23, 0) + i * .18 + .45); c.hinge.visible = p > 0 && p < 1; c.hinge.position.y = lerp(42, 19, eIO(p)); c.mesh.rotation.y = p * 8; });
  // 墙上那个饼还在（主歌一画的），桌子、台灯是固定道具
}

window.renderAt = async (t) => {
  if (!ALL_OBJ.length) { ALL_OBJ = everything(); V_OBJ = []; const walk = (o) => { if (!o) return; if (o.hinge) V_OBJ.push(o.hinge); else if (o.isObject3D) V_OBJ.push(o); else if (Array.isArray(o)) o.forEach(walk); else if (typeof o === 'object') Object.values(o).forEach(walk); }; walk(S.V); }
  V_OBJ.forEach((o) => { o.visible = false; });
  if (t < 71.55 || t >= 90.75) ALL_OBJ.forEach((o) => { o.visible = true; });   // 先复位，animate 会逐个设定
  if (t < 71.55) animate(t);
  else if (t < 90.75) { ALL_OBJ.forEach((o) => { o.visible = false; }); S.chenA.hinge.visible = S.calc.hinge.visible = S.tagA.hinge.visible = true; S.V.leftPivot.visible = true; verse2(t); }
  else animate(t - SHIFT, { max: FIRST, noBlendBefore: 37.6 });
  applySwap(t);
  renderer.render(scene, camera); overlay(t);
};
(async () => {
  LY = await (await fetch('lyricsFull.json')).json();
  const all = LY.map((l) => l.text).join('') + '老板画饼打工人社保课02未来的账看病失业养老工伤每月前途无量以后升职买不走我的家劳动合同第七条社会保险甲方应依法为乙方缴纳医疗等费白纸黑字掌上个人缴费记录已未按月能差塌自愿书本人放弃公司另付补贴元签字出租屋·㎡年轻人别慌噗——哈！这饼画得圆我可不敢尝¥500/月+';
  await Promise.all(['900 60px Serif', '700 60px Serif', '500 60px Serif', '900 60px Sans', '800 60px Sans', '700 60px Sans', '600 60px Sans', '500 60px Sans', '60px Kuai'].map((f) => document.fonts.load(f, all + '0123456789✓✕-')).concat([document.fonts.load('60px InsI', '0123456789¥')]));
  await build();
  window.__ready = true;
})();
