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

