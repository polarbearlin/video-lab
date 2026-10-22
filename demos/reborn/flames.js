// 《家庭教师》彭格列七色 · 配色样张（彩色卡纸纸雕 + 发光死气之炎）
// renderAt(t)：floor(t) = 场景序号（0 废柴阿纲 · 1–7 七属性 · 8 七色汇聚），小数部分驱动火焰和镜头微动。
// 角色是占位剪影，用户的角色图到了以后换成 PNG 立牌。
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
window.DEMO = { width: 1080, height: 1920, fps: 30, duration: 9 };

const INK = '#22223a', WHITE = '#fffaf0';
// 每个场景：背景渐变（上→下）、四层卡纸（远→近）、地面、火焰色、点缀色、文案
const TH = [
  { k: 'grey', sky: ['#e9eaec', '#cfd2d6'], layers: ['#bcc0c6', '#a7abb3', '#959aa3', '#82878f'], floor: '#9a9ea6', flame: null, accent: '#c8322b',
    tag: 'EPISODE 00', kanji: '废柴', en: 'Dame', name: '泽田纲吉', cap: '平凡的一天，什么都做不好', hair: 'tsuna', props: ['test', 'test'], edge: 'city' },
  { k: 'sky', sky: ['#ffb36b', '#ffe3b0'], layers: ['#ffc98a', '#ffad5c', '#ff8f33', '#f2711c'], floor: '#ff9d4a', flame: '#ff8a1e', accent: '#7fd3ff',
    tag: 'VONGOLA · 01/07', kanji: '大空', en: 'Sky', name: '泽田纲吉', cap: '「包容一切的天空」', hair: 'tsuna', props: ['cloud', 'cloud', 'cloud'], edge: 'cloud' },
  { k: 'storm', sky: ['#ff9aa6', '#ffd6da'], layers: ['#ff8a95', '#f25366', '#df2f48', '#b81d38'], floor: '#e8435a', flame: '#ff2a3d', accent: '#e9ecf5',
    tag: 'VONGOLA · 02/07', kanji: '岚', en: 'Storm', name: '狱寺隼人', cap: '「十代目的左右手」', hair: 'goku', props: ['dyn', 'dyn', 'dyn'], edge: 'mount' },
  { k: 'rain', sky: ['#9fd1ff', '#e6f4ff'], layers: ['#90caf9', '#4fa8f0', '#1e88e5', '#1262bd'], floor: '#3d97e8', flame: '#2f8cff', accent: '#ffffff',
    tag: 'VONGOLA · 03/07', kanji: '雨', en: 'Rain', name: '山本武', cap: '「镇静一切的雨」', hair: 'yama', props: ['drop', 'ball', 'drop', 'drop'], edge: 'wave' },
  { k: 'sun', sky: ['#ffe066', '#fff6cf'], layers: ['#ffe58a', '#ffd34d', '#fbbd1e', '#f29f05'], floor: '#ffc93a', flame: '#ffd21a', accent: '#ff6b3d',
    tag: 'VONGOLA · 04/07', kanji: '晴', en: 'Sun', name: '笹川了平', cap: '「照亮家族的极限晴天」', hair: 'ryo', props: ['sun'], edge: 'hill' },
  { k: 'thunder', sky: ['#b8f5c8', '#ecfff1'], layers: ['#a5edb6', '#5fd97f', '#2bbf5e', '#178f45'], floor: '#3fcc6c', flame: '#3dff6e', accent: '#ffe94d',
    tag: 'VONGOLA · 05/07', kanji: '雷', en: 'Lightning', name: '蓝波', cap: '「替家族承受一切的避雷针」', hair: 'lambo', props: ['bolt', 'bolt', 'candy'], edge: 'zig' },
  { k: 'cloud', sky: ['#24123f', '#6a3fa0'], layers: ['#c7a6ee', '#9c64d9', '#7b3fbf', '#56288c'], floor: '#6d36ad', flame: '#b45cff', accent: '#ffe066',
    tag: 'VONGOLA · 06/07', kanji: '云', en: 'Cloud', name: '云雀恭弥', cap: '「不受任何束缚的浮云」', hair: 'hiba', props: ['moon', 'cloud', 'bird'], edge: 'cloud' },
  { k: 'mist', sky: ['#14123a', '#3f3a9e'], layers: ['#8f89e3', '#5b54c6', '#3f3aa0', '#2a2678'], floor: '#3a3596', flame: '#6a4dff', accent: '#ff7ab8',
    tag: 'VONGOLA · 07/07', kanji: '雾', en: 'Mist', name: '六道骸', cap: '「虚实难辨的幻觉」', hair: 'muku', props: ['lotus', 'lotus', 'orb', 'orb'], edge: 'swirl' },
  { k: 'final', sky: ['#ff9a3c', '#ffe7b8'], layers: ['#8f89e3', '#3fcc6c', '#ffd34d', '#4fa8f0'], floor: '#ff9d4a', flame: '#ff8a1e', accent: '#ffffff',
    tag: 'VONGOLA FAMIGLIA', kanji: '彭格列', en: 'Famiglia', name: '七色汇聚', cap: '「大空，包容所有的颜色」', hair: 'tsuna', props: [], edge: 'cloud' },
];
const FLAMES7 = ['#ff8a1e', '#ff2a3d', '#2f8cff', '#ffd21a', '#3dff6e', '#b45cff', '#6a4dff'];

// ---------- 渲染器
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(1080, 1920, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;   // 比 ACES 保色
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(46, 1080 / 1920, 1, 2000);
const composer = new EffectComposer(renderer);
composer.renderTarget1.samples = composer.renderTarget2.samples = 4;
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(540, 960), .75, .55, 1.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const hemi = new THREE.HemisphereLight('#ffffff', '#888888', 1.25); scene.add(hemi);
const key = new THREE.DirectionalLight('#fff6ea', 2.3);
key.position.set(-120, 260, 260); key.target.position.set(0, 40, -40);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -260, right: 260, top: 300, bottom: -80, near: 10, far: 900 });
key.shadow.bias = -.0006; key.shadow.radius = 6;
scene.add(key, key.target);
const flameLight = new THREE.PointLight('#ff8a1e', 0, 220, 1.2); scene.add(flameLight);

const loader = new THREE.TextureLoader();
const loadTex = (u, rep, color) => new Promise((r) => loader.load(u, (tx) => { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(...rep); if (color) tx.colorSpace = THREE.SRGBColorSpace; r(tx); }));
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; return tx;
}
const shade = (hex, f) => { const c = new THREE.Color(hex); return f < 1 ? c.multiplyScalar(f) : c.lerp(new THREE.Color('#fff'), f - 1); };

// ---------- 卡纸层：上沿轮廓 → 挤出薄片
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function edgeFn(kind, seed, amp) {
  return (x) => {
    const s = seed * 7.3;
    switch (kind) {
      case 'cloud': { const p = 46 + seed * 6, m = ((x + s * 13) % p + p) % p - p / 2; return amp * Math.sqrt(Math.max(0, 1 - (m / (p / 2)) ** 2)) + amp * .25 * Math.sin(x * .02 + s); }
      case 'mount': { const p = 70, i = Math.floor((x + 400 + s * 10) / p), f = ((x + 400 + s * 10) % p) / p, h = amp * (.5 + rnd(i + seed * 9)); return (1 - Math.abs(f - .5) * 2) * h; }
      case 'wave': return amp * .5 * (1 + Math.sin(x * .045 + s)) + amp * .15 * Math.sin(x * .13 + s * 2);
      case 'hill': return amp * .55 * (1 + Math.sin(x * .016 + s)) + amp * .1 * Math.sin(x * .07);
      case 'zig': { const p = 26, f = ((x + 400 + s * 5) % p) / p; return amp * (.35 + .65 * Math.abs(f - .5) * 2) * (.7 + .3 * Math.sin(x * .02 + s)); }
      case 'swirl': return amp * .5 * (1 + Math.sin(x * .03 + s) * Math.cos(x * .011 - s));
      case 'city': { const p = 34, i = Math.floor((x + 400 + s * 10) / p); return amp * (.25 + .75 * rnd(i + seed * 5)) * (((x + 400 + s * 10) % p) < p - 6 ? 1 : 0); }
    }
    return 0;
  };
}
let paperN;
function paperMat(color, rep = [3, 3]) {
  const n = paperN.clone(); n.repeat.set(...rep); n.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ color, roughness: .93, metalness: 0, normalMap: n, normalScale: new THREE.Vector2(.55, .55) });
}
function layer(group, kind, color, z, base, amp, seed, width = 520) {
  const f = edgeFn(kind, seed, amp), sh = new THREE.Shape();
  sh.moveTo(-width / 2, -30);
  for (let x = -width / 2; x <= width / 2; x += 2) sh.lineTo(x, base + f(x));
  sh.lineTo(width / 2, -30); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 1.6, bevelEnabled: false, curveSegments: 4 });
  const m = new THREE.Mesh(geo, [paperMat(color), new THREE.MeshStandardMaterial({ color: shade(color, 1.35), roughness: 1 })]);
  m.position.z = z; m.castShadow = m.receiveShadow = true; group.add(m); return m;
}

// ---------- 剪纸立牌（画布绘制，带米白剪纸边）
function cutTex(w, h, paths) {   // paths: [{p: Path2D 构造函数, fill, line?}]
  return canvasTex(w, h, (g) => {
    g.lineJoin = g.lineCap = 'round';
    g.strokeStyle = WHITE; g.fillStyle = WHITE; g.lineWidth = 34;
    paths.forEach((o) => { const p = o.p(); g.fill(p); g.stroke(p); if (o.line) { g.lineWidth = o.line + 34; g.stroke(p); g.lineWidth = 34; } });
    paths.forEach((o) => { const p = o.p(); if (o.line) { g.strokeStyle = o.fill; g.lineWidth = o.line; g.stroke(p); g.strokeStyle = WHITE; g.lineWidth = 34; } else { g.fillStyle = o.fill; g.fill(p); } });
  });
}
const P = (fn) => () => { const p = new Path2D(); fn(p); return p; };
const circ = (x, y, r) => P((p) => p.arc(x, y, r, 0, 7));
function hairPath(kind) {
  return P((p) => {
    const cx = 300, cy = 300;
    const spikes = (n, r0, r1, a0, a1, jit = 0) => { p.moveTo(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0); for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, am = a0 + (a1 - a0) * (i + .5) / n; p.lineTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); if (i < n) p.lineTo(cx + Math.cos(am) * (r1 + jit * Math.sin(i * 2.3)), cy + Math.sin(am) * (r1 + jit * Math.sin(i * 2.3))); } p.closePath(); };
    switch (kind) {
      case 'tsuna': spikes(9, 110, 215, Math.PI * .92, Math.PI * 2.08, 25); break;
      case 'goku': p.ellipse(cx, cy - 20, 140, 130, 0, Math.PI, 0); p.lineTo(cx + 150, cy + 130); p.lineTo(cx + 95, cy + 40); p.lineTo(cx - 95, cy + 40); p.lineTo(cx - 150, cy + 130); p.closePath(); break;
      case 'yama': spikes(11, 112, 160, Math.PI * .95, Math.PI * 2.05, 10); break;
      case 'ryo': p.ellipse(cx, cy - 15, 128, 118, 0, Math.PI * .97, Math.PI * 2.03); p.closePath(); break;
      case 'lambo': p.arc(cx, cy - 40, 175, 0, 7); p.moveTo(cx - 120, cy - 150); p.lineTo(cx - 175, cy - 260); p.lineTo(cx - 70, cy - 190); p.moveTo(cx + 120, cy - 150); p.lineTo(cx + 175, cy - 260); p.lineTo(cx + 70, cy - 190); break;
      case 'hiba': spikes(7, 118, 150, Math.PI * .9, Math.PI * 2.1, 6); p.moveTo(cx - 120, cy - 20); p.lineTo(cx - 60, cy + 40); p.lineTo(cx - 20, cy - 30); p.lineTo(cx + 30, cy + 40); p.lineTo(cx + 80, cy - 20); p.lineTo(cx + 125, cy + 30); p.lineTo(cx + 120, cy - 40); p.closePath(); break;
      case 'muku': p.ellipse(cx, cy - 10, 132, 125, 0, Math.PI, 0); p.closePath(); for (let i = -2; i <= 2; i++) { const a = -Math.PI / 2 + i * .32; p.moveTo(cx + Math.cos(a - .12) * 100, cy - 60 + Math.sin(a - .12) * 100); p.lineTo(cx + Math.cos(a) * 260, cy - 60 + Math.sin(a) * 260); p.lineTo(cx + Math.cos(a + .12) * 100, cy - 60 + Math.sin(a + .12) * 100); p.closePath(); } p.moveTo(cx + 90, cy + 40); p.lineTo(cx + 120, cy + 330); p.lineTo(cx + 150, cy + 30); p.closePath(); break;
    }
  });
}
function charTex(hair, raise = true, INK = '#22223a') {
  const body = P((p) => { p.moveTo(170, 450); p.quadraticCurveTo(300, 410, 430, 450); p.lineTo(410, 800); p.lineTo(190, 800); p.closePath(); p.rect(200, 780, 85, 380); p.rect(315, 780, 85, 380); p.ellipse(235, 1165, 70, 32, 0, 0, 7); p.ellipse(365, 1165, 70, 32, 0, 0, 7); p.rect(270, 380, 60, 90); });
  const armL = P((p) => { p.moveTo(185, 480); p.lineTo(130, 760); });
  const armR = P((p) => { p.moveTo(415, 480); raise ? p.lineTo(520, 250) : p.lineTo(470, 760); });
  return cutTex(620, 1220, [
    { p: hairPath(hair), fill: INK }, { p: body, fill: INK }, { p: armL, fill: INK, line: 68 }, { p: armR, fill: INK, line: 68 },
    { p: circ(raise ? 525 : 470, raise ? 235 : 770, 46), fill: INK }, { p: circ(300, 300, 122), fill: INK }, { p: hairPath(hair), fill: INK },
  ]);
}
function propTex(kind, th) {
  const W = 400, H = 400, c = th.layers[3], a = th.accent;
  const list = {
    cloud: [{ p: P((p) => { p.arc(140, 230, 80, 0, 7); p.arc(220, 180, 100, 0, 7); p.arc(300, 240, 70, 0, 7); p.rect(140, 230, 160, 80); }), fill: th.k === 'cloud' ? '#efe6ff' : '#fffdf6' }],
    dyn: [{ p: P((p) => { p.roundRect(110, 120, 60, 220, 12); p.roundRect(175, 110, 60, 230, 12); p.roundRect(240, 120, 60, 220, 12); }), fill: '#d81f3a' }, { p: P((p) => p.rect(100, 210, 210, 34)), fill: '#2b2b3a' }, { p: P((p) => { p.moveTo(205, 110); p.quadraticCurveTo(230, 50, 270, 60); }), fill: '#2b2b3a', line: 12 }, { p: circ(272, 58, 16), fill: '#ffd21a' }],
    drop: [{ p: P((p) => { p.moveTo(200, 60); p.bezierCurveTo(230, 150, 300, 200, 300, 260); p.arc(200, 260, 100, 0, Math.PI); p.bezierCurveTo(100, 200, 170, 150, 200, 60); }), fill: '#5fb4ff' }],
    ball: [{ p: circ(200, 200, 130), fill: '#fffdf6' }, { p: P((p) => { p.arc(60, 200, 110, -.9, .9); }), fill: '#e53935', line: 10 }, { p: P((p) => { p.arc(340, 200, 110, Math.PI - .9, Math.PI + .9); }), fill: '#e53935', line: 10 }],
    sun: [{ p: P((p) => { for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; p.moveTo(200 + Math.cos(a - .14) * 120, 200 + Math.sin(a - .14) * 120); p.lineTo(200 + Math.cos(a) * 190, 200 + Math.sin(a) * 190); p.lineTo(200 + Math.cos(a + .14) * 120, 200 + Math.sin(a + .14) * 120); p.closePath(); } }), fill: '#ff8a1e' }, { p: circ(200, 200, 125), fill: '#ffb31a' }],
    bolt: [{ p: P((p) => { p.moveTo(230, 30); p.lineTo(110, 220); p.lineTo(190, 220); p.lineTo(150, 370); p.lineTo(300, 160); p.lineTo(215, 160); p.closePath(); }), fill: '#ffe94d' }],
    candy: [{ p: circ(200, 200, 90), fill: '#9b5de5' }, { p: P((p) => { p.moveTo(110, 200); p.lineTo(40, 150); p.lineTo(40, 250); p.closePath(); p.moveTo(290, 200); p.lineTo(360, 150); p.lineTo(360, 250); p.closePath(); }), fill: '#c39bff' }],
    moon: [{ p: P((p) => { p.arc(200, 200, 150, 0, 7); p.arc(260, 160, 130, 0, 7, true); }), fill: '#ffe9a6' }],
    bird: [{ p: P((p) => p.ellipse(200, 220, 120, 100, 0, 0, 7)), fill: '#ffd93b' }, { p: P((p) => { p.moveTo(310, 200); p.lineTo(370, 220); p.lineTo(310, 240); p.closePath(); }), fill: '#ff9b2f' }, { p: circ(260, 190, 14), fill: INK }],
    lotus: [{ p: P((p) => { for (let i = -2; i <= 2; i++) { p.ellipse(200 + i * 55, 230 - (2 - Math.abs(i)) * 30, 45, 110, i * .38, 0, 7); } }), fill: '#ff7ab8' }, { p: P((p) => p.ellipse(200, 320, 160, 36, 0, 0, 7)), fill: '#3fcc8c' }],
    orb: [{ p: circ(200, 200, 110), fill: '#a99cff' }, { p: P((p) => { p.arc(200, 200, 70, 0, 4.5); p.arc(200, 200, 35, 4.5, 0, true); }), fill: '#3f3aa0', line: 14 }],
    test: [{ p: P((p) => p.rect(60, 40, 280, 340)), fill: '#fffdf6' }, { p: P((p) => { for (let i = 0; i < 6; i++) { p.moveTo(90, 110 + i * 42); p.lineTo(220, 110 + i * 42); } }), fill: '#b7bcc4', line: 8 }, { p: P((p) => p.ellipse(270, 190, 50, 80, 0, 0, 7)), fill: '#e53935', line: 20 }],
  };
  return cutTex(W, H, list[kind]);
}
function standee(tex, h, pos, group) {
  const w = h * tex.image.width / tex.image.height, geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .92, normalMap: paperN, normalScale: new THREE.Vector2(.5, .5), alphaTest: .5, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true;
  m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: .5 });
  m.position.set(...pos); group.add(m); return m;
}
const strMat = new THREE.MeshStandardMaterial({ color: '#f3ead8', roughness: 1 });
function hang(group, tex, size, pos) {   // 吊在细线上的道具
  const m = standee(tex, size, [pos[0], pos[1] - size / 2, pos[2]], group);
  m.geometry.translate(0, -size / 2, 0); m.position.y = pos[1];
  const s = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, 200, 5), strMat); s.position.set(pos[0], pos[1] + 100 - size * .05, pos[2] - .3); group.add(s);
  return m;
}

// ---------- 死气之炎：噪声着色器 + 光晕 + 火星
const flameVS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }';
const flameFS = `
uniform float uT; uniform vec3 uC; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a*n(p); p *= 2.03; a *= .5; } return v; }
void main(){
  vec2 uv = vUv; vec2 q = uv - vec2(.5, .2);
  float nz = fbm(vec2(uv.x*4., uv.y*3. - uT*3.2));
  float w = mix(.40, .05, pow(clamp(q.y/.62, 0., 1.), .7));            // 越往上越窄：泪滴形
  float d = abs(q.x + (nz-.5)*.22*uv.y) / max(w, .001);
  float body = (1. - smoothstep(.55, 1., d)) * smoothstep(-.18, .02, q.y) * (1. - smoothstep(.3, .62, q.y + (nz-.5)*.45));
  float core = (1. - smoothstep(.15, .6, d)) * (1. - smoothstep(.05, .38, q.y + (nz-.5)*.2)) * smoothstep(-.12, .0, q.y);
  vec3 col = mix(uC * 2.2, vec3(1.6, 1.55, 1.4), core);
  float a = clamp(body, 0., 1.);
  gl_FragColor = vec4(col * a, a);
}`;
function flame(group, color, size, pos) {
  const mat = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(color) } }, vertexShader: flameVS, fragmentShader: flameFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size * .7, size), mat); m.position.set(pos[0], pos[1] + size * .3, pos[2]);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(size * 1.8, size * 1.8), new THREE.MeshBasicMaterial({ map: haloTex, color, transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  halo.position.set(pos[0], pos[1] + size * .15, pos[2] - .5);
  group.add(m, halo); return { m, halo, mat, pos, color, size };
}
const haloTex = canvasTex(256, 256, (g) => { const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); });
function embers(group, color, origin, n = 36) {
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: haloTex, color, size: 4.5, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  pts.userData = { origin, n }; group.add(pts); return pts;
}
function updEmbers(pts, t) {
  const { origin, n } = pts.userData, a = pts.geometry.attributes.position;
  for (let i = 0; i < n; i++) { const life = ((t * .5 + rnd(i)) % 1); a.setXYZ(i, origin[0] + (rnd(i + 50) - .5) * 70 + Math.sin(t * 2 + i) * 6, origin[1] + life * 120 - 10, origin[2] + (rnd(i + 90) - .5) * 30); }
  a.needsUpdate = true;
}

// ---------- 搭场景
const SC = [];
function skyTex(a, b) { return canvasTex(64, 512, (g) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, 64, 512); }); }
function build(th, i) {
  const G = new THREE.Group(); G.visible = false; scene.add(G);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1100), new THREE.MeshBasicMaterial({ map: skyTex(...th.sky), toneMapped: false }));
  sky.position.set(0, 300, -380); G.add(sky);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(900, 700), paperMat(th.floor, [6, 5])); floor.rotation.x = -Math.PI / 2; floor.position.z = -50; floor.receiveShadow = true; G.add(floor);
  const L = th.layers, e = th.edge;
  if (th.k === 'final') {   // 汇聚：七色层层叠叠
    const cols = ['#6a4dff', '#b45cff', '#3fcc6c', '#ffd34d', '#4fa8f0', '#f25366', '#ff8f33'];
    cols.forEach((c, j) => layer(G, 'cloud', c, -300 + j * 32, 190 - j * 24, 26, j + 1, 680));
  } else {
    layer(G, e, L[0], -230, 170, 45, 1, 640);
    layer(G, e, L[1], -170, 120, 40, 2, 600);
    layer(G, e, L[2], -110, 72, 34, 3, 560);
    layer(G, e, L[3], -55, 30, 22, 4, 520);
  }
  layer(G, e === 'city' ? 'hill' : e, shade(th.floor, .82), 95, 6, 14, 9, 400);   // 前景低矮一层
  const S = { G, th, flames: [], emb: [] };
  const ch = standee(charTex(th.hair, th.k !== 'grey', th.k === 'grey' || th.k === 'final' ? INK : shade(th.layers[3], .42).getStyle()), 128, [i === 8 ? 0 : 18, 0, 0], G);
  S.char = ch;
  const W = 128 * 620 / 1220, sx = W / 620, sy = 128 / 1220, wx = (px) => ch.position.x + (px - 310) * sx, wy = (py) => (1220 - py) * sy;
  if (th.flame) {
    const fist = [wx(525), wy(235), 3];
    S.flames.push(flame(G, th.flame, th.k === 'final' ? 62 : 56, fist));
    if (th.hair === 'tsuna') S.flames.push(flame(G, th.flame, 40, [wx(300), wy(120), 2]));
    S.emb.push(embers(G, th.flame, fist));
    S.light = { color: th.flame, pos: [fist[0], fist[1] + 12, 30] };
  }
  if (th.k === 'final') {
    FLAMES7.forEach((c, j) => { const a = -Math.PI / 2 + (j / 7) * Math.PI * 2 + Math.PI; const p = [Math.cos(a) * 82, 64 + Math.sin(a) * 70, 30]; S.flames.push(flame(G, c, 30, p)); S.emb.push(embers(G, c, p, 12)); });
    ['goku', 'yama', 'ryo', 'lambo', 'hiba', 'muku'].forEach((h, j) => { const x = (j < 3 ? -1 : 1) * (52 + (j % 3) * 24) * (j < 3 ? 1 : 1); standee(charTex(h, false, shade(FLAMES7[j + 1], .45).getStyle()), 96 - (j % 3) * 8, [j < 3 ? -52 - (2 - j) * 22 : 52 + (j - 3) * 22, 0, -20 - (j % 3) * 14], G); });
  }
  const spots = [[-72, 150, -10], [80, 162, -60], [-40, 112, -80], [-92, 88, -30]];
  th.props.forEach((k, j) => hang(G, propTex(k, th), k === 'sun' ? 80 : k === 'moon' ? 62 : 40, k === 'sun' ? [-62, 150, -90] : spots[j]));
  return S;
}

// ---------- 文案层
const ov = document.getElementById('ov');
function overlay(th) {
  const deep = th.k === 'grey' ? '#5c616b' : th.k === 'final' ? '#f2711c' : th.layers[3];
  const light = th.k === 'cloud' || th.k === 'mist';
  const small = th.kanji.length > 1;
  ov.innerHTML = `<div class="tag" style="color:${light ? '#fffaf0' : deep}">${th.tag}</div>
  <div class="kanji" style="color:${deep};font-size:${small ? (th.kanji.length > 2 ? 230 : 300) : 380}px;filter:drop-shadow(10px 12px 0 ${light ? 'rgba(0,0,0,.35)' : shade(deep, .55).getStyle() + '55'})">${th.kanji}</div>
  <div class="en" style="color:${th.flame || deep};${small ? 'left:' + (th.kanji.length > 2 ? 560 : 640) + 'px;top:' + (th.kanji.length > 2 ? 380 : 120) + 'px;font-size:120px' : ''}">${th.en}</div>
  <div class="name" style="background:${deep};${small ? 'left:' + (th.kanji.length > 2 ? 560 : 650) + 'px;top:' + (th.kanji.length > 2 ? 520 : 270) + 'px' : ''}">${th.name}</div>
  <div class="cap" style="color:${INK};border-bottom:10px solid ${th.flame || th.accent}">${th.cap}</div>`;
}

// ---------- renderAt
let cur = -1;
window.renderAt = async (t) => {
  const i = Math.min(8, Math.floor(t)), u = t - Math.floor(t), S = SC[i], th = S.th;
  if (i !== cur) { SC.forEach((s, j) => s.G.visible = j === i); overlay(th); cur = i; }
  hemi.groundColor.set(shade(th.layers[3], .7)); hemi.color.set(th.k === 'cloud' || th.k === 'mist' ? '#c9c2ff' : '#ffffff');
  hemi.intensity = th.k === 'cloud' || th.k === 'mist' ? 1.3 : 1.7;
  key.intensity = th.k === 'cloud' || th.k === 'mist' ? 1.2 : 1.9;
  key.color.set(th.k === 'cloud' || th.k === 'mist' ? '#d9d0ff' : '#fff6ea');
  if (S.light) { flameLight.color.set(S.light.color); flameLight.position.set(...S.light.pos); flameLight.intensity = (th.k === 'final' ? 260 : 220) * (1 + .08 * Math.sin(t * 17)); } else flameLight.intensity = 0;
  S.flames.forEach((f, j) => { f.mat.uniforms.uT.value = t + j * 1.7; f.halo.material.opacity = .32 + .05 * Math.sin(t * 13 + j); });
  S.emb.forEach((p) => updEmbers(p, t));
  bloom.strength = th.k === 'grey' ? 0 : th.k === 'cloud' || th.k === 'mist' ? 1.0 : .75;
  camera.position.set(-12 + u * 10, 104, 420 - u * 14); camera.lookAt(2, 104, 0);
  composer.render();
};

paperN = await loadTex('/assets/stock/tex/Paper001_2K-JPG_NormalGL.jpg', [1, 1], false);
await Promise.all([document.fonts.load('900 100px Sans'), document.fonts.load('700 60px Serif'), document.fonts.load('100px InsI')]);
TH.forEach((th, i) => SC.push(build(th, i)));
window.__ready = true;
