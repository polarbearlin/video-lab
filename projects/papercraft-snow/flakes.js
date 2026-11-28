// Big paper-cut snowflakes ("goose-feather" flakes): a six-armed cut flake with a printed cut edge, folded once down
// the middle (a real paper flake is creased), falling, fluttering and landing on whatever is under it (the page, the
// cottage's roof slopes), resting there a while and then shrinking away on the page (paper-life's verb for small
// things). Everything is a pure function of the film's time: a capture of frame N is the same in every run.
import * as THREE from 'three';
import { paperMaterial } from 'papercraft/lib/paperkit-3d.js';

/** The cut: six spokes with side branches and a hexagonal centre, in white card with a thin cool cut edge. */
export function flakeTexture(size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), R = size * 0.47, cx = size / 2;
  const arms = (w, col) => {
    g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
    for (let a = 0; a < 6; a++) {
      g.save(); g.translate(cx, cx); g.rotate(a * Math.PI / 3);
      g.lineWidth = w; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -R * 0.94); g.stroke();
      for (const [d, l, k] of [[0.36, 0.3, 1], [0.6, 0.24, 0.85], [0.8, 0.13, 0.7]]) {
        g.lineWidth = w * k;
        for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, -R * d); g.lineTo(s * Math.sin(Math.PI / 3) * R * l, -R * d - Math.cos(Math.PI / 3) * R * l); g.stroke(); }
      }
      g.restore();
    }
    g.fillStyle = col; g.beginPath();
    for (let a = 0; a < 6; a++) { const t = a * Math.PI / 3 + Math.PI / 6, r = R * 0.2 + (w - size * 0.075) * 0.5; g.lineTo(cx + Math.cos(t) * r, cx + Math.sin(t) * r); }
    g.closePath(); g.fill();
  };
  arms(size * 0.075 + 5, '#8f9bb8');            // the cut edge: a thin cool line round the white card
  arms(size * 0.075, '#f9fafd');
  g.fillStyle = 'rgba(0,0,0,0)';
  g.globalCompositeOperation = 'destination-out';  // a small hexagonal hole cut through the centre
  g.beginPath(); for (let a = 0; a < 6; a++) { const t = a * Math.PI / 3, r = R * 0.075; g.lineTo(cx + Math.cos(t) * r, cx + Math.sin(t) * r); } g.closePath(); g.fillStyle = '#000'; g.fill();
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = 'rgba(150,162,190,0.55)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, cx - R); g.lineTo(cx, cx + R); g.stroke();   // the crease
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/** A unit square folded once along its vertical centre line into a shallow V (the crease), facing +z. */
export function flakeGeometry(crease = 0.2) {
  const geo = new THREE.BufferGeometry();
  const P = [[-0.5, -0.5], [0, -0.5], [0.5, -0.5], [-0.5, 0.5], [0, 0.5], [0.5, 0.5]];
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P.flatMap(([x, y]) => [x, y, -Math.abs(x) * crease]), 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(P.flatMap(([x, y]) => [x + 0.5, y + 0.5]), 2));
  geo.setIndex([0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4]);
  geo.computeVertexNormals();
  return geo;
}

const hash = (a, b) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b + 0x632be59b) | 0, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
};
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * createFlakes({ scene, box: { x0, x1, z0, z1 }, top, count, size, fall, rest, wind, landAt(x, z) -> { y, n: [x,y,z] } })
 * returns { mesh, material, geometry, update(t, cameraPosition) }.
 */
export function createFlakes({ scene, box, top = 15, count = 700, size = [0.3, 0.7], fall = [0.9, 1.4], rest = [5, 9], wind = [0.32, 0.1],
  landAt = () => ({ y: 0, n: [0, 1, 0] }), near = [6, 10], seed = 11, active = null, color = '#f4f6fb', emissive = '#28304c' } = {}) {
  const map = flakeTexture(), geometry = flakeGeometry();
  const material = paperMaterial({ color, map, alphaTest: 0.5, side: THREE.DoubleSide });
  if (emissive) { material.emissive = new THREE.Color(emissive); material.emissiveIntensity = 1; }
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = 'life'; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false;
  scene.add(mesh);
  const F = [];
  for (let i = 0; i < count; i++) {
    const r = (k) => hash(seed * 7919 + i, k);
    const big = r(1) < 0.12;   // a few really big ones
    F.push({
      s: big ? size[1] * (1.05 + r(2) * 0.25) : size[0] + (size[1] - size[0]) * r(2) ** 1.4,
      v: fall[0] + (fall[1] - fall[0]) * r(3), off: r(4) * 60, rest: rest[0] + (rest[1] - rest[0]) * r(5),
      amp: 0.25 + r(6) * 0.45, f: 0.35 + r(7) * 0.35, p1: r(8) * 6.28, p2: r(9) * 6.28, w1: 0.7 + r(10) * 0.8, w2: 0.5 + r(11) * 0.7,
      spin: (r(12) - 0.5) * 1.6, tilt: -0.75 + (r(13) - 0.5) * 0.5, roll: r(14) * 6.28,
    });
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
  const Z = new THREE.Vector3(0, 0, 1), nv = new THREE.Vector3(), qs = new THREE.Quaternion();
  const fallPos = (f, x0, z0, tau, out) => {
    const ph = 2 * Math.PI * f.f * tau;
    return out.set(x0 + wind[0] * tau + f.amp * Math.sin(ph + f.p1), top - f.v * tau, z0 + wind[1] * tau + f.amp * 0.6 * Math.cos(ph * 0.8 + f.p2));
  };
  const restQ = (L, f, out) => { nv.set(...L.n).normalize(); out.setFromUnitVectors(Z, nv); qs.setFromAxisAngle(nv, f.roll); return out.premultiply(qs); };
  function update(t, cam) {
    const live = active ? active(t) * count : count;   // active(t): the falling fraction (the snow thickening)
    for (let i = 0; i < count; i++) {
      const f = F[i], fallT = top / f.v, period = fallT + f.rest, T = t + f.off, k = Math.floor(T / period), tau = T - k * period;
      const x0 = box.x0 + hash(i * 31 + 7, k) * (box.x1 - box.x0) - wind[0] * fallT * 0.5;
      const z0 = box.z0 + hash(i * 17 + 3, k) * (box.z1 - box.z0) - wind[1] * fallT * 0.5;
      // where it lands: the falling path against the surface under it (two refinements; the roof is the only slope)
      let L = landAt(x0 + wind[0] * fallT, z0 + wind[1] * fallT), tL = (top - L.y) / f.v;
      fallPos(f, x0, z0, tL, pos); L = landAt(pos.x, pos.z); tL = (top - L.y) / f.v;
      let s = f.s, open = 1;
      if (tau < tL) {
        fallPos(f, x0, z0, tau, pos);
        e.set(f.tilt + 0.55 * Math.sin(f.w1 * tau + f.p1), f.spin * tau, 0.45 * Math.sin(f.w2 * tau + f.p2), 'YXZ'); q.setFromEuler(e);
        const settle = sm(tL - 0.6, tL, tau);
        if (settle > 0) q.slerp(restQ(L, f, q2), settle);
        open = sm(0, 0.6, tau);                         // it unfolds as it starts to fall (the crease opens)
        pos.y = Math.max(pos.y, L.y + 0.02);
      } else {
        fallPos(f, x0, z0, tL, pos); pos.y = L.y + 0.02 + 0.004 * (i % 5);
        restQ(L, f, q);
        s *= 1 - sm(0.55, 1, (tau - tL) / f.rest);      // and shrinks away on the page
      }
      if (cam) open *= sm(near[0], near[1], pos.distanceTo(cam));   // folds shut right in front of the lens
      if (i >= live) s = 0;
      sc.set(s * Math.max(0.001, open), s, s);
      m4.compose(pos, q, sc); mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { mesh, material, geometry, update };
}
