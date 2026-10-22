// 《家庭教师》暗场纸雕剧场 · 样张（大空 / 岚 / 雨）
// 思路：保留原纸雕版的质感配方（真实纸张贴图、聚光、硬阴影、暗角、颗粒），颜色只来自低饱和的染色卡纸 + 角色自己的死气之炎。
// renderAt(t)：floor(t) = 场景（0 大空 · 1 岚 · 2 雨），小数部分驱动火焰和镜头微动。角色是空白纸人占位。
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
window.DEMO = { width: 1080, height: 1920, fps: 30, duration: 3 };
const INK = '#2a2420', WHITE = '#f6efe0';
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(1080, 1920, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(46, 1080 / 1920, 1, 1500);
const composer = new EffectComposer(renderer);
composer.renderTarget1.samples = composer.renderTarget2.samples = 4;
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(540, 960), .7, .5, 1.0); composer.addPass(bloom);
composer.addPass(new OutputPass());
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
  const s = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, 200, 5), strMat); s.position.set(pos[0], pos[1] + 100 - size * .05, pos[2] - .3); s.scale.set(.5, 1, .5); group.add(s);
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
  for (let i = 0; i < n; i++) { const life = ((t * .5 + rnd(i)) % 1); a.setXYZ(i, origin[0] + (rnd(i + 50) - .5) * 22 + Math.sin(t * 2 + i) * 2, origin[1] + life * 40 - 3, origin[2] + (rnd(i + 90) - .5) * 10); }
  a.needsUpdate = true;
}


// ---------- 灰度化真实纸张贴图：保留纤维和斑驳，颜色交给 material.color 染
function greyTex(img, rep, lift = .82) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), a = d.data; let m = 0;
  for (let i = 0; i < a.length; i += 4) m += a[i] * .3 + a[i + 1] * .59 + a[i + 2] * .11;
  m /= a.length / 4;
  for (let i = 0; i < a.length; i += 4) { const l = a[i] * .3 + a[i + 1] * .59 + a[i + 2] * .11, v = Math.min(255, 255 * lift + (l - m) * 1.5); a[i] = a[i + 1] = a[i + 2] = v; }
  g.putImageData(d, 0, 0);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(...rep); tx.anisotropy = 8; return tx;
}
const imgLoad = (u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = u; });
let kraftG, kraftN, cardG, cardN, kraftImg;
const dyed = (color, rep = [3, 1.2]) => { const m = kraftG.clone(); m.repeat.set(...rep); m.needsUpdate = true; const n = kraftN.clone(); n.repeat.set(...rep); n.needsUpdate = true; return new THREE.MeshStandardMaterial({ color, map: m, normalMap: n, normalScale: new THREE.Vector2(.9, .9), roughness: 1 }); };
function tintedTex(w, h, draw, rep = 1) {   // 画布道具：先画图案，再乘上灰度纸纹
  return canvasTex(w, h, (g, W, H) => {
    draw(g, W, H);
    g.globalCompositeOperation = 'multiply'; g.globalAlpha = .55;
    for (let y = 0; y < H; y += kraftImg.height * rep) for (let x = 0; x < W; x += kraftImg.width * rep) g.drawImage(kraftG.image, x, y, kraftImg.width * rep, kraftImg.height * rep);
    const mk = document.createElement('canvas'); mk.width = W; mk.height = H; draw(mk.getContext('2d'), W, H);
    g.globalCompositeOperation = 'destination-in'; g.globalAlpha = 1; g.drawImage(mk, 0, 0);
    g.globalCompositeOperation = 'source-over';
  });
}

// ---------- 空白纸人（米白卡纸 + 墨线 + 剪纸白边）
function dollTex(hair, pose) {
  const body = P((p) => { p.moveTo(170, 450); p.quadraticCurveTo(300, 410, 430, 450); p.lineTo(410, 800); p.lineTo(190, 800); p.closePath(); });
  const legs = P((p) => { p.rect(205, 790, 80, 360); p.rect(315, 790, 80, 360); p.ellipse(238, 1160, 68, 30, 0, 0, 7); p.ellipse(362, 1160, 68, 30, 0, 0, 7); });
  const neck = P((p) => p.rect(272, 380, 56, 90));
  const armL = P((p) => { p.moveTo(185, 480); pose === 'sword' ? p.lineTo(110, 700) : p.lineTo(130, 760); });
  const armR = P((p) => { p.moveTo(415, 480); pose === 'sword' ? p.lineTo(500, 640) : p.lineTo(520, 250); });
  const fist = pose === 'sword' ? circ(505, 650, 44) : circ(525, 235, 46);
  const parts = [{ p: legs }, { p: body }, { p: neck }, { p: armL, line: 66 }, { p: armR, line: 66 }, { p: fist }, { p: circ(300, 300, 122) }, { p: hairPath(hair), hair: true }];
  return tintedTex(620, 1220, (g) => {
    g.lineJoin = g.lineCap = 'round';
    parts.forEach((o) => { const p = o.p(); g.strokeStyle = g.fillStyle = WHITE; g.lineWidth = (o.line || 0) + 40; g.stroke(p); if (!o.line) g.fill(p); });
    parts.forEach((o) => { const p = o.p(); g.strokeStyle = INK; g.lineWidth = (o.line || 0) + 12; g.stroke(p); });
    parts.forEach((o) => { const p = o.p(); const f = o.hair ? '#5b5048' : '#efe5d0'; if (o.line) { g.strokeStyle = f; g.lineWidth = o.line; g.stroke(p); } else { g.fillStyle = f; g.fill(p); } });
    if (pose === 'sword') { g.strokeStyle = INK; g.lineWidth = 22; g.beginPath(); g.moveTo(470, 690); g.lineTo(610, 40); g.stroke(); g.strokeStyle = '#d9dde3'; g.lineWidth = 12; g.stroke(); }
  });
}

// ---------- 三个场景
const TH = [
  { k: 'sky', wall: '#3c4778', floor: '#7d6448', flame: '#ff8a1e', hemiG: '#3a2c3a', key: '#ffd9b0', hair: 'tsuna', pose: 'raise',
    tag: 'VONGOLA · 守护者 01', kanji: '大空', name: '泽田纲吉', cap: '废柴的他，点燃了额头的火', bar: '#ff8a1e' },
  { k: 'storm', wall: '#6e2a30', floor: '#4b3a35', flame: '#ff2a3d', hemiG: '#2a1a1a', key: '#ffd6b8', hair: 'goku', pose: 'raise',
    tag: 'VONGOLA · 守护者 02', kanji: '岚', name: '狱寺隼人', cap: '「十代目，我是您的左右手！」', bar: '#ff2a3d' },
  { k: 'rain', wall: '#22365c', floor: '#3b4654', flame: '#2f8cff', hemiG: '#1a2230', key: '#dfe6ff', hair: 'yama', pose: 'sword',
    tag: 'VONGOLA · 守护者 03', kanji: '雨', name: '山本武', cap: '天台那一天，他们成了朋友', bar: '#2f8cff' },
];
const hemi = new THREE.HemisphereLight('#ffffff', '#333333', .4); scene.add(hemi);
const key = new THREE.SpotLight('#ffd6a0', 3.4, 0, .5, .85, 0);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0005; key.shadow.camera.near = 40; key.shadow.camera.far = 500;
scene.add(key, key.target);
const fl = new THREE.PointLight('#ff8a1e', 0, 160, 1.4); fl.castShadow = true; fl.shadow.mapSize.set(1024, 1024); fl.shadow.bias = -.002; scene.add(fl);

function titleCard(th) {   // 吊着的米白标题卡（和原版"老板画饼"吊牌同一种做法）
  return tintedTex(900, 520, (g, W, H) => {
    g.fillStyle = '#f3ead8'; g.fillRect(0, 0, W, H);
    g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${th.kanji.length > 1 ? 230 : 280}px Serif`; g.fillText(th.kanji, W / 2, H * .43);
    g.fillStyle = th.bar; g.fillRect(W * .3, H * .78, W * .4, 10);
    g.fillStyle = '#6d6256'; g.font = `600 56px Sans`; g.fillText(th.name, W / 2, H * .9);
  });
}
function hangCard(G, tex, w, pos) {
  const m = standee(tex, w * tex.image.height / tex.image.width, pos, G);
  const s = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, 120, 5), strMat); s.position.set(pos[0] - w * .3, pos[1] + 60, pos[2] - .2);
  const s2 = s.clone(); s2.position.x = pos[0] + w * .3; G.add(s, s2); return m;
}
function box(G, w, h, d, mat, pos) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(...pos); m.castShadow = m.receiveShadow = true; G.add(m); return m; }

const SC = [];
function build(th, i) {
  const G = new THREE.Group(); G.visible = false; scene.add(G);
  const wallM = dyed(th.wall, [3, 1.4]);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(260, 220), wallM); wall.position.set(0, 100, -60); wall.receiveShadow = true; G.add(wall);
  const fc = cardG.clone(); fc.repeat.set(3, 1.6); fc.needsUpdate = true; const fn = cardN.clone(); fn.repeat.set(3, 1.6); fn.needsUpdate = true;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(260, 200), new THREE.MeshStandardMaterial({ color: th.floor, map: fc, normalMap: fn, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = 30; floor.receiveShadow = true; G.add(floor);
  const S = { G, th, flames: [], emb: [] };
  const doll = standee(dollTex(th.hair, th.pose), 66, [14, 0, 6], G);
  const sx = 66 * 620 / 1220 / 620, sy = 66 / 1220, wx = (px) => 14 + (px - 310) * sx, wy = (py) => (1220 - py) * sy;

  if (th.k === 'sky') {
    // 并盛中学剪纸 + 黄昏的纸太阳
    const school = tintedTex(1200, 700, (g, W, H) => {
      g.fillStyle = '#e8dcc2'; g.strokeStyle = INK; g.lineWidth = 10;
      g.fillRect(40, 200, W - 80, H - 200); g.strokeRect(40, 200, W - 80, H - 200);
      g.fillRect(480, 40, 240, 180); g.strokeRect(480, 40, 240, 180);
      g.beginPath(); g.arc(600, 125, 60, 0, 7); g.fillStyle = '#f6efe0'; g.fill(); g.stroke(); g.beginPath(); g.moveTo(600, 125); g.lineTo(600, 85); g.moveTo(600, 125); g.lineTo(630, 135); g.stroke();
      for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) { if (c === 4) continue; g.fillStyle = (r + c) % 3 ? '#f2c66d' : '#7f8ea3'; g.fillRect(90 + c * 118, 250 + r * 140, 76, 90); g.strokeRect(90 + c * 118, 250 + r * 140, 76, 90); }
      g.fillStyle = '#9b7a55'; g.fillRect(540, 520, 120, 180); g.strokeRect(540, 520, 120, 180);
      g.fillStyle = INK; g.font = '900 54px Serif'; g.textAlign = 'center'; g.fillText('并盛中学', 600, 495);
    });
    standee(school, 46, [-18, 0, -40], G);
    const sun = new THREE.Mesh(new THREE.CircleGeometry(26, 48), dyed('#d9772e', [.4, .4])); sun.position.set(-40, 76, -59); sun.receiveShadow = true; G.add(sun);
    const cloud = tintedTex(500, 260, (g) => { g.fillStyle = '#d8cfe6'; g.beginPath(); g.arc(150, 170, 80, 0, 7); g.arc(260, 120, 100, 0, 7); g.arc(360, 175, 70, 0, 7); g.rect(150, 170, 210, 80); g.fill(); });
    hang(G, cloud, 14, [-58, 92, -30]); hang(G, cloud, 11, [44, 100, -45]);
  }
  if (th.k === 'storm') {
    // 后巷砖墙 + 地上的炸药 + 纸烟团
    const brick = tintedTex(1000, 600, (g, W, H) => {
      g.fillStyle = '#8a3a36'; g.fillRect(0, 0, W, H); g.strokeStyle = '#3a1c1c'; g.lineWidth = 8;
      for (let r = 0; r < 10; r++) for (let c = -1; c < 9; c++) { const x = c * 120 + (r % 2) * 60, y = r * 60; g.fillStyle = ['#8a3a36', '#7a302e', '#97453f'][(r * 7 + c * 3 + 9) % 3]; g.fillRect(x + 4, y + 4, 112, 52); g.strokeRect(x + 4, y + 4, 112, 52); }
    });
    standee(brick, 54, [-24, 0, -42], G);
    const dyn = tintedTex(400, 360, (g) => { g.lineJoin = 'round'; [[110, 120], [175, 110], [240, 120]].forEach(([x, y]) => { g.fillStyle = '#b8282f'; g.strokeStyle = INK; g.lineWidth = 9; g.beginPath(); g.roundRect(x, y, 60, 220, 12); g.fill(); g.stroke(); }); g.fillStyle = '#2b2522'; g.fillRect(100, 210, 210, 34); g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.moveTo(205, 110); g.quadraticCurveTo(230, 50, 270, 60); g.stroke(); });
    [[-36, 0, 14, .3], [-24, 0, 22, -.4], [52, 0, 10, .2]].forEach(([x, y, z, r]) => { const m = standee(dyn, 11, [x, y, z], G); m.rotation.z = r; });
    const smoke = tintedTex(500, 300, (g) => { g.fillStyle = '#d9cfc4'; g.beginPath(); g.arc(140, 190, 90, 0, 7); g.arc(250, 130, 110, 0, 7); g.arc(370, 190, 85, 0, 7); g.rect(140, 190, 230, 90); g.fill(); });
    standee(smoke, 16, [-50, 0, -10], G); standee(smoke, 12, [50, 0, -20], G);
    hang(G, dyn, 10, [-48, 86, -30]);
  }
  if (th.k === 'rain') {
    // 天台：铁丝网 + 水塔 + 吊着的雨滴
    const fence = tintedTex(1200, 500, (g, W, H) => {
      g.strokeStyle = '#c9ced6'; g.lineWidth = 7;
      for (let x = -H; x < W; x += 46) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + H, 0); g.stroke(); g.beginPath(); g.moveTo(x, 0); g.lineTo(x + H, H); g.stroke(); }
      g.lineWidth = 22; g.strokeStyle = '#9aa3ae'; g.strokeRect(11, 11, W - 22, H - 22); for (let x = 300; x < W; x += 300) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    });
    const fm = standee(fence, 34, [0, 0, -30], G); fm.material.alphaTest = .3;
    const tank = tintedTex(400, 600, (g) => { g.fillStyle = '#b8c0c9'; g.strokeStyle = INK; g.lineWidth = 9; g.beginPath(); g.roundRect(60, 40, 280, 300, 40); g.fill(); g.stroke(); g.fillStyle = '#8c949e'; [[90, 340], [290, 340]].forEach(([x, y]) => { g.fillRect(x, y, 22, 250); g.strokeRect(x, y, 22, 250); }); g.fillStyle = INK; g.font = '900 60px Serif'; g.textAlign = 'center'; g.fillText('并盛', 200, 210); });
    standee(tank, 52, [-44, 0, -46], G);
    const drop = tintedTex(200, 300, (g) => { g.fillStyle = '#a9c8ee'; g.beginPath(); g.moveTo(100, 20); g.bezierCurveTo(130, 110, 180, 150, 180, 200); g.arc(100, 200, 80, 0, Math.PI); g.bezierCurveTo(20, 150, 70, 110, 100, 20); g.fill(); });
    [[-56, 96, -20], [-30, 84, -40], [40, 92, -28], [58, 76, -10], [-12, 104, -50], [24, 110, -36], [-62, 70, 0]].forEach((p) => hang(G, drop, 5, p));
  }

  hangCard(G, titleCard(th), 36, [-36, 104, -24]);
  // 火焰：拳头（雨是刀身）+ 大空额头
  const fist = th.pose === 'sword' ? [wx(560), wy(300), 9] : [wx(525), wy(235), 9];
  S.flames.push(flame(G, th.flame, th.pose === 'sword' ? 22 : 28, fist));
  if (th.k === 'sky') S.flames.push(flame(G, th.flame, 15, [wx(300), wy(130), 8]));
  if (th.pose === 'sword') S.flames.push(flame(G, th.flame, 14, [wx(530), wy(560), 9]));
  S.emb.push(embers(G, th.flame, fist, 24));
  S.light = [fist[0] + 4, fist[1] + 6, 30];
  return S;
}

const ov = document.getElementById('ov');
function overlay(th) {
  ov.innerHTML = `<div class="tag2">${th.tag}</div><div class="vig"></div>
  <div class="cap2" style="border-left:14px solid ${th.bar}">${th.cap}</div>`;
}
let cur = -1;
window.renderAt = async (t) => {
  const i = Math.min(2, Math.floor(t)), u = t - Math.floor(t), S = SC[i], th = S.th;
  if (i !== cur) { SC.forEach((s, j) => s.G.visible = j === i); overlay(th); cur = i; }
  hemi.groundColor.set(th.hemiG); key.color.set(th.key);
  key.position.set(-70, 150, 120); key.target.position.set(0, 30, -20);
  fl.color.set(th.flame); fl.position.set(...S.light); fl.intensity = 520 * (1 + .1 * Math.sin(t * 19) + .05 * Math.sin(t * 7));
  S.flames.forEach((f, j) => { f.mat.uniforms.uT.value = t + j * 1.7; f.halo.material.opacity = .3 + .05 * Math.sin(t * 13 + j); });
  S.emb.forEach((p) => { p.material.size = 1.6; updEmbers(p, t); });
  camera.position.set(-6 + u * 6, 62, 215 - u * 10); camera.lookAt(0, 60, 0);
  composer.render();
};

paperN = await loadTex('/assets/stock/tex/Paper004_2K-JPG_NormalGL.jpg', [1, 1], false);
kraftN = paperN.clone();
cardN = await loadTex('/assets/stock/tex/Cardboard002_2K-JPG_NormalGL.jpg', [1, 1], false);
kraftImg = await imgLoad('/assets/stock/tex/Paper004_1080.jpg');
kraftG = greyTex(kraftImg, [1, 1]);
cardG = greyTex(await imgLoad('/assets/stock/tex/Cardboard002_1080.jpg'), [1, 1], .8);
await Promise.all([document.fonts.load('900 100px Serif'), document.fonts.load('600 60px Sans')]);
TH.forEach((th, i) => SC.push(build(th, i)));
window.__SC = SC; window.__ready = true;
