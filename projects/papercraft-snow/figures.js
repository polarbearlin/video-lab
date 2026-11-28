// The two paper figures of the film, rebuilt from the character sheets: a tall butler (black wavy hair with a fringe,
// black peak-lapel suit, dark-grey waistcoat, white shirt, black tie, white pocket square, white gloves) and a young
// lady (long wavy brown hair, pearl earrings, ivory satin pyjamas with piping, fluffy slippers; a fluffy latte coat
// over them for the snow). Each is a small 3D paper model like the template's hero: every body part is a frontal card
// with a profile card standing right behind it (a T), layers kept a gap apart so no card ever cuts another, limbs on
// pivots BESIDE the body (their swing never sweeps through it), faces in front at ~1.3x scale and printed lighter.
// The models face +z. pose() only rotates pivots: nothing scales or slides.
import * as P2 from 'papercraft/lib/paperkit-2d.js';
import { makeCard } from 'papercraft/lib/paperkit-3d.js';

const D = P2.draw2;
const T = 0.05, GAP = 0.03, SIDE = 0.012, PROFILE = -Math.PI / 2;
const SH = 'rgba(24,28,66,0.42)';   // the print's own layer shadows take the night's navy, never a warm brown

const ext = ([pts]) => pts.reduce((e, [x, y]) => ({ x0: Math.min(e.x0, x), x1: Math.max(e.x1, x), y0: Math.min(e.y0, y), y1: Math.max(e.y1, y) }), { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity });
const behind = (piece, z0) => z0 - T / 2 - GAP - ext(piece).x1;
const band = (pts, lo, hi, k = 1) => [[lo, 1], [hi, -1]].reduce((poly, [v, s]) => {   // keep lo <= y (k 0: x) <= hi
  const out = [], ok = (p) => s * (p[k] - v) >= 0;
  poly.forEach((a, i) => { const b = poly[(i + 1) % poly.length]; if (ok(a)) out.push(a); if (ok(a) !== ok(b)) { const t = (v - a[k]) / (b[k] - a[k]); out.push(k ? [a[0] + (b[0] - a[0]) * t, v] : [v, a[1] + (b[1] - a[1]) * t]); } });
  return out;
}, pts);
const piece = (draw, w, h, name) => P2.drawnPiece(draw, { w, h, name, layer: { shadowColor: SH } });
const plain = (c) => (P) => { P.gradient(P2.shade(c, 0.08), P2.shade(c, -0.1), 0.5); P.felt(); P.innerShade(P2.shade(c, -0.5), { alpha: 0.25, blurPx: 8 }); };
const bumps = (gg, x0, x1, y, r, n) => { for (let k = 0; k <= n; k++) D.ell(gg, x0 + (x1 - x0) * k / n, y, r, r * 0.85); };

// the stride (motion.md section 8): stance linear in distance (the planted foot stays put), the swing eased forward
function strider(legs, arms, body, legLen, stepLen) {
  const R = stepLen / (2 * legLen);
  const leg = (ph, gait) => { const u = (ph / Math.PI) % 2, A = gait * R; if (u >= 1) return A * (3 - 2 * u); const e = u * u * (3 - 2 * u); return A * (2 * e - 1); };
  return (walked, gait) => {
    const ph = walked / stepLen * Math.PI, l0 = leg(ph, gait), l1 = leg(ph + Math.PI, gait);
    legs[0].rotation.x = -l0; legs[1].rotation.x = -l1;
    body.position.y = Math.abs(Math.sin(ph)) * 0.035 * gait;
    return [l0 * 0.6, l1 * 0.6];   // the arm swing, opposite the leg on its side
  };
}

// the hot cocoa: a cream mug with a berry band, cocoa and a curl of foam on top
const mugArt = () => piece((gg, ink) => {
  gg.fillStyle = ink('#efe4d0'); D.rect(gg, 0.115, 0.07, 0.07, 0.13, 0.04);
  gg.fillStyle = ink('#f7f0e2'); D.rect(gg, -0.12, 0, 0.24, 0.26, 0.04);
  gg.fillStyle = ink('#b3343c', 'print'); D.rect(gg, -0.12, 0.09, 0.24, 0.035);
  gg.fillStyle = ink('#6a3a24'); D.ell(gg, 0, 0.255, 0.115, 0.03);
  gg.fillStyle = ink('#fbf3e4'); D.ell(gg, -0.03, 0.27, 0.06, 0.025); D.ell(gg, 0.04, 0.268, 0.045, 0.02);
}, 0.34, 0.32, 'mug');
// the handkerchief: white linen, a lace edge, folded corner down
const kerchiefArt = () => piece((gg, ink) => {
  gg.fillStyle = ink('#fbfaf6'); D.poly(gg, [[-0.15, 0.28], [0.15, 0.28], [0.17, 0.1], [0, -0.02], [-0.17, 0.1]]);
  gg.fillStyle = ink('#e6e1d6', 'print'); D.poly(gg, [[-0.15, 0.28], [0.15, 0.28], [0, 0.14]]);
  gg.fillStyle = ink('#d8d2c4', 'print'); for (let k = 0; k < 7; k++) D.ell(gg, -0.15 + k * 0.05, 0.285, 0.012, 0.012);
}, 0.4, 0.34, 'handkerchief');
// the cocoa moustache: two brown lobes curling up at the ends, white foam bubbles along the top (white alone vanishes
// against her skin in the door's warm light)
const foamArt = () => piece((gg, ink) => {
  gg.fillStyle = ink('#6e3f22');
  for (const [x, y, r] of [[-0.135, 0.07, 0.024], [-0.105, 0.048, 0.03], [-0.06, 0.04, 0.036], [-0.02, 0.042, 0.028], [0.02, 0.042, 0.028], [0.06, 0.04, 0.036], [0.105, 0.048, 0.03], [0.135, 0.07, 0.024]]) D.ell(gg, x, y, r, r * 0.9);
  gg.fillStyle = ink('#fffaf0', 'print');
  for (const [x, y, r] of [[-0.11, 0.066, 0.013], [-0.075, 0.064, 0.016], [-0.04, 0.066, 0.012], [0.035, 0.066, 0.013], [0.07, 0.064, 0.016], [0.108, 0.066, 0.012]]) D.ell(gg, x, y, r, r);
  gg.fillStyle = ink('#9a6640', 'print'); D.ell(gg, -0.06, 0.03, 0.025, 0.01); D.ell(gg, 0.06, 0.03, 0.025, 0.01);
}, 0.34, 0.11, 'foam');

export function buildFigures(H, { blanket = false } = {}) {
  const THREE = H.THREE;
  const mk = (root, px) => ([pts, paint], seed, { x = 0, y = 0, z = 0, ry = 0, parent = root, back = 'mirror', name = '', cut = null } = {}) => {
    const m = makeCard(pts, { paint, paper: H.paper, thickness: T, edgeWidth: 0.03, pxPerUnit: px, seed, back, folds: [], geomPts: cut, contact: null });
    m.position.set(x, y, z); m.rotation.y = ry; m.name = name; parent.add(m); return m;
  };
  // pose: { walked, gait, arms: [[rx, rz], [rx, rz]] (0 = the RIGHT arm, at -x), hold: [0..1, 0..1] (how much the
  // keyed arm pose replaces the walking swing), head: [rx, ry], roll (head about z), sit (0..1: the legs swing forward
  // to sitAngle), lean (the body about z) }
  const poser = (stride, arms, head, legs, body) => ({ walked = 0, gait = 0, arms: A = [[0, 0], [0, 0]], hold = [0, 0], head: hd = [0, 0], roll = 0, sit = 0, sitAngle = -1.45, lean = 0 } = {}) => {
    const sw = stride(walked, gait * (1 - sit));
    arms.forEach((a, i) => { a.rotation.x = sw[i] * (1 - hold[i]) + A[i][0]; a.rotation.z = A[i][1]; });
    head.rotation.x = hd[0]; head.rotation.y = hd[1]; head.rotation.z = roll;
    if (sit > 0) legs.forEach((l) => { l.rotation.x = l.rotation.x * (1 - sit) + sitAngle * sit; });
    body.rotation.z = lean;
  };
  // a thin card on a pivot, scaled about its centre (the mouth, the foam): drawn centred at (0, h / 2)
  const flat = (parent, [pts, paint], seed, { x = 0, y = 0, z = 0, h = 0.1, px = 220, name = '' } = {}) => {
    const pv = new THREE.Group(); pv.position.set(x, y, z); parent.add(pv);
    const m = makeCard(pts, { paint, paper: H.paper, thickness: 0.012, edgeWidth: 0.008, pxPerUnit: px, seed, back: 'mirror', folds: [], contact: null });
    m.position.y = -h / 2; m.name = name; pv.add(m); pv.visible = false; return pv;
  };
  const mouthArt = (w, h, name) => piece((gg, ink) => {
    gg.fillStyle = ink('#5a1e26'); D.ell(gg, 0, h / 2, w / 2, h / 2);
    gg.fillStyle = ink('#c85a5e', 'print'); D.ell(gg, 0, h * 0.28, w * 0.3, h * 0.2);
  }, w * 1.1, h * 1.1, name);
  // a prop held in a hand: a group at the hand (the scene keeps it upright), the card centred on it
  const prop = (arm, handY, [pts, paint], seed, { z = 0.11, lift = 0, name = '', back = 'mirror' } = {}) => {
    const pv = new THREE.Group(); pv.position.set(0, handY, z); arm.add(pv);
    const m = makeCard(pts, { paint, paper: H.paper, thickness: 0.035, edgeWidth: 0.02, pxPerUnit: 160, seed, back, folds: [], contact: null });
    m.position.y = lift; m.name = name; pv.add(m); pv.visible = false; return pv;
  };

  // ---------------------------------------------------------------- the lady (~3.3 tall)
  function lady() {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body); g.name = 'lady';
    const card = mk(body, 120);
    const skin = '#f9e4d6', blush = '#f2a594', hair = '#5c3424', hairHi = '#82533a', hairDk = '#3b2016';
    const pj = '#f5eddd', pjS = '#e3d5bc', pip = '#c4a77c';
    // the coat of the demo, or (blanket) a soft oatmeal wool blanket with a rose-brown plaid wrapped round her
    const [coat, coatHi, coatS] = blanket ? ['#d6b98e', '#e6cfa8', '#b8976a'] : ['#b8875c', '#cfa47a', '#9c7048'];
    const plaid = (gg, ink, x0, x1, y0, y1) => {
      if (!blanket) return;
      gg.fillStyle = ink(P2.rgba('#9a564c', 0.55), 'print');
      for (let x = x0 + 0.08; x < x1; x += 0.2) D.rect(gg, x, y0, 0.03, y1 - y0);
      for (let y = y0 + 0.1; y < y1; y += 0.24) D.rect(gg, x0, y, x1 - x0, 0.03);
      gg.fillStyle = ink(P2.rgba('#fff6e6', 0.5), 'print');
      for (let x = x0 + 0.17; x < x1; x += 0.2) D.rect(gg, x, y0, 0.012, y1 - y0);
    };
    const slip = '#f8f2e8', slipS = '#e2d5c2', pearl = '#fbf8f0', eye = '#2b1a14', lip = '#cf6a60';
    const Z = { lock: 0.15, face: 0.085, coat: 0, legs: -0.17 };
    // legs: wide ivory satin trousers with piping at the hem and the outer seam, a fluffy slipper at the foot
    const legFront = (i) => piece((gg, ink) => {
      gg.fillStyle = ink(pj); D.poly(gg, [[-0.15, 0.17], [0.15, 0.17], [0.17, 0.27], [0.15, 1.32], [-0.15, 1.32], [-0.17, 0.27]]);
      gg.fillStyle = ink(pip, 'print'); D.rect(gg, -0.17, 0.27, 0.34, 0.028); D.rect(gg, i ? 0.115 : -0.135, 0.3, 0.022, 1.0);
      gg.fillStyle = ink(P2.shade(pj, -0.05), 'print'); D.rect(gg, i ? -0.06 : 0.03, 0.32, 0.03, 0.9);
      gg.fillStyle = ink(slipS); D.ell(gg, 0, 0.1, 0.2, 0.1);
      gg.fillStyle = ink(slip); for (const [x, y, r] of [[-0.13, 0.13, 0.07], [-0.045, 0.165, 0.08], [0.055, 0.165, 0.08], [0.14, 0.125, 0.07]]) D.ell(gg, x, y, r, r);
    }, 0.5, 1.36, `lady leg ${i}`);
    const legSide = (i) => piece((gg, ink) => {
      gg.fillStyle = ink(pjS); D.poly(gg, [[-0.13, 0.17], [0.15, 0.17], [0.13, 1.32], [-0.13, 1.32]]);
      gg.fillStyle = ink(pip, 'print'); D.rect(gg, -0.13, 0.27, 0.28, 0.028);
      gg.fillStyle = ink(slipS); D.ell(gg, 0.06, 0.1, 0.25, 0.1);
      gg.fillStyle = ink(slip); for (const [x, y, r] of [[-0.12, 0.13, 0.07], [0.0, 0.16, 0.08], [0.12, 0.15, 0.08], [0.24, 0.11, 0.06]]) D.ell(gg, x, y, r, r);
    }, 0.66, 1.36, `lady leg ${i} side`);
    const hipX = ext(legFront(0)).x1 + T / 2 + SIDE, hipY = 1.3;
    const legs = [-hipX, hipX].map((x, i) => {
      const hip = new THREE.Group(); hip.position.set(x, hipY, Z.legs); body.add(hip);
      const side = legSide(i);
      card(legFront(i), 410 + i, { y: -hipY, parent: hip, name: `lady leg ${i}` });
      card(side, 420 + i, { y: -hipY, z: behind(side, 0), ry: PROFILE, parent: hip, name: `lady leg ${i} side` });
      return hip;
    });
    // torso: the fluffy coat, open over the pyjama top (notch collar, piping, buttons)
    const coatFront = piece((gg, ink) => {
      gg.fillStyle = ink(coat);
      D.poly(gg, [[-0.48, 0.07], [0.48, 0.07], [0.45, 1.05], [0.44, 1.24], [0.36, 1.32], [-0.36, 1.32], [-0.44, 1.24], [-0.45, 1.05]]);
      bumps(gg, -0.44, 0.44, 0.08, 0.06, 8);
      gg.fillStyle = ink(pj); D.poly(gg, [[-0.19, 1.32], [0.19, 1.32], [0.08, 0.07], [-0.08, 0.07]]);
      gg.fillStyle = ink(pip, 'print'); D.rect(gg, -0.012, 0.1, 0.024, 1.0);
      gg.fillStyle = ink('#efe6d4', 'print'); for (const y of [0.3, 0.55, 0.8]) D.ell(gg, 0.04, y, 0.028, 0.028);
      gg.fillStyle = ink(pjS); D.poly(gg, [[-0.21, 1.32], [-0.03, 1.02], [-0.11, 1.07], [-0.25, 1.22]]); D.poly(gg, [[0.21, 1.32], [0.03, 1.02], [0.11, 1.07], [0.25, 1.22]]);
      gg.fillStyle = ink(coatHi); D.poly(gg, [[-0.37, 1.32], [-0.17, 1.32], [-0.08, 0.5], [-0.2, 0.56]]); D.poly(gg, [[0.37, 1.32], [0.17, 1.32], [0.08, 0.5], [0.2, 0.56]]);
      if (blanket) { plaid(gg, ink, -0.46, -0.2, 0.1, 1.3); plaid(gg, ink, 0.2, 0.46, 0.1, 1.3); gg.fillStyle = ink(coatHi); for (let k = 0; k < 12; k++) D.rect(gg, -0.44 + k * 0.08, 0.0, 0.025, 0.1, 0.01); }
      else { gg.fillStyle = ink(coatS); D.rect(gg, -0.41, 0.28, 0.17, 0.2, 0.05); D.rect(gg, 0.24, 0.28, 0.17, 0.2, 0.05); }
      gg.fillStyle = ink(P2.rgba('#fff8ec', 0.55), 'print'); for (let k = 0; k < 70; k++) { const x = -0.44 + ((k * 37) % 88) / 100, y = 0.12 + ((k * 53) % 117) / 100; if (Math.abs(x) > 0.2) D.ell(gg, x, y, 0.016, 0.012); }
    }, 1.1, 1.36, 'lady coat');
    const coatY = 1.08, cx = ext(coatFront), coatTop = coatY + cx.y1;
    card(coatFront, 401, { y: coatY, z: Z.coat, back: plain(coat), name: 'lady coat' });
    const coatSide = piece((gg, ink) => {
      gg.fillStyle = ink(coatS); D.rect(gg, -0.22, 0.07, 0.44, 1.22, 0.14); bumps(gg, -0.2, 0.2, 0.08, 0.055, 4);
      gg.fillStyle = ink(P2.shade(coatS, -0.12), 'print'); D.rect(gg, -0.015, 0.12, 0.03, 1.1);
    }, 0.55, 1.36, 'lady coat side');
    const TORSO = 0.34, coatSideZ = behind(coatSide, Z.coat), coatBack = Z.coat - T / 2 - GAP - TORSO;
    card(coatSide, 402, { y: coatY, z: coatSideZ, ry: PROFILE, name: 'lady coat side', cut: band(coatSide[0], coatBack - coatSideZ, 9, 0) });
    // arms: coat sleeves with an ivory pyjama cuff, beside the coat on shoulder pivots
    const armArt = (c, name) => piece((gg, ink) => {
      gg.fillStyle = ink(c); D.rect(gg, -0.13, 0.17, 0.26, 0.86, 0.12); bumps(gg, -0.11, 0.11, 0.2, 0.04, 3);
      plaid(gg, ink, -0.13, 0.13, 0.22, 1.0);
      gg.fillStyle = ink(pj); D.rect(gg, -0.1, 0.12, 0.2, 0.09, 0.03);
      gg.fillStyle = ink(pip, 'print'); D.rect(gg, -0.1, 0.135, 0.2, 0.016);
      gg.fillStyle = ink(skin); D.ell(gg, 0, 0.08, 0.085, 0.085);
    }, 0.3, 1.04, name);
    const shoulderX = 0.45 + ext(armArt(coat, 'arm')).x1 + SIDE, shoulderY = coatTop - 0.1;   // against the coat's side (its hem bumps sit below the hand)
    const arms = [-shoulderX, shoulderX].map((x, i) => {
      const sh = new THREE.Group(); sh.position.set(x, shoulderY, Z.coat); body.add(sh);
      const side = armArt(coatS, `lady arm ${i} side`);
      card(armArt(coat, `lady arm ${i}`), 430 + i, { y: -1.0, parent: sh, name: `lady arm ${i}` });
      card(side, 440 + i, { y: -1.0, z: behind(side, 0), ry: PROFILE, parent: sh, name: `lady arm ${i} side` });
      return sh;
    });
    // the head on a neck pivot: face (pearls at the lobes), the hair as a U in front of it (centre parting, waves
    // down past the shoulders), the head's profile behind it, the long hair behind all of it (it rides the head pivot,
    // so tilting never brings two of the head's cards together)
    const head = new THREE.Group(); head.position.set(0, coatTop - 0.02, 0); body.add(head);
    const hcard = mk(head, 150);
    const face = piece((gg, ink) => {
      gg.fillStyle = ink(skin); D.rect(gg, -0.075, 0, 0.15, 0.22, 0.04); D.ell(gg, 0, 0.5, 0.3, 0.355);
      D.ell(gg, -0.235, 0.29, 0.05, 0.09); D.ell(gg, 0.235, 0.29, 0.05, 0.09);   // the lobes the pearls hang from
      gg.fillStyle = ink(pearl); D.ell(gg, -0.245, 0.19, 0.036, 0.036); D.ell(gg, 0.245, 0.19, 0.036, 0.036);
      gg.fillStyle = ink('#d9d2c4', 'print'); D.ell(gg, -0.235, 0.18, 0.014, 0.014); D.ell(gg, 0.255, 0.18, 0.014, 0.014);
      gg.fillStyle = ink(P2.rgba(blush, 0.55), 'print'); D.ell(gg, -0.16, 0.38, 0.065, 0.04); D.ell(gg, 0.16, 0.38, 0.065, 0.04);
      gg.fillStyle = ink(eye, 'print'); D.ell(gg, -0.115, 0.47, 0.042, 0.055); D.ell(gg, 0.115, 0.47, 0.042, 0.055);
      gg.fillStyle = ink('#ffffff', 'print'); D.ell(gg, -0.1, 0.49, 0.014, 0.016); D.ell(gg, 0.13, 0.49, 0.014, 0.016);
      gg.fillStyle = ink(hairDk, 'print'); D.rect(gg, -0.17, 0.585, 0.1, 0.018, 0.009); D.rect(gg, 0.07, 0.585, 0.1, 0.018, 0.009);
      gg.fillStyle = ink('#e8b8a2', 'print'); D.ell(gg, 0, 0.39, 0.018, 0.012);
      gg.fillStyle = ink(lip, 'print'); D.ell(gg, 0, 0.3, 0.05, 0.024); gg.fillStyle = ink(skin, 'print'); D.ell(gg, 0, 0.315, 0.05, 0.016);
    }, 0.72, 0.9, 'lady face');
    hcard(face, 450, { z: Z.face, back: plain(hair), name: 'lady face' });
    const locks = piece((gg, ink) => {
      gg.translate(0, 0.37);   // drawn about the neck pivot; the drawing box starts at y = 0
      gg.fillStyle = ink(hair);
      const cap = []; for (let k = 0; k <= 16; k++) { const a = Math.PI * (0.02 + 0.96 * k / 16); cap.push([Math.cos(a) * 0.37, 0.52 + Math.sin(a) * 0.38]); }
      D.poly(gg, [...cap.reverse(), [-0.3, 0.56], [-0.16, 0.7], [-0.03, 0.74], [0, 0.71], [0.03, 0.74], [0.16, 0.7], [0.3, 0.56]].reverse());
      for (const s of [-1, 1]) {
        D.poly(gg, [[s * 0.28, 0.6], [s * 0.38, 0.62], [s * 0.42, 0.4], [s * 0.39, 0.2], [s * 0.45, 0.0], [s * 0.41, -0.2], [s * 0.44, -0.36], [s * 0.3, -0.3], [s * 0.33, -0.12], [s * 0.27, 0.06], [s * 0.3, 0.24], [s * 0.26, 0.42]]);
      }
      gg.fillStyle = ink(hairHi, 'print');
      for (const s of [-1, 1]) { D.poly(gg, [[s * 0.34, 0.52], [s * 0.37, 0.44], [s * 0.35, 0.24], [s * 0.4, 0.03], [s * 0.37, -0.15], [s * 0.35, -0.12], [s * 0.37, 0.03], [s * 0.32, 0.24], [s * 0.33, 0.44]]); D.poly(gg, [[s * 0.06, 0.86], [s * 0.2, 0.82], [s * 0.28, 0.66], [s * 0.18, 0.76]]); }
    }, 1.0, 1.36, 'lady hair');
    hcard(locks, 451, { y: -0.37, z: Z.lock, back: plain(hair), name: 'lady hair' });
    const headSide = piece((gg, ink) => {
      gg.fillStyle = ink(P2.shade(skin, -0.04)); D.ell(gg, 0.02, 0.5, 0.28, 0.35); D.rect(gg, -0.07, 0.02, 0.15, 0.2, 0.04);
      gg.fillStyle = ink(hair); D.ell(gg, -0.1, 0.56, 0.27, 0.34); D.poly(gg, [[-0.36, 0.5], [-0.05, 0.5], [-0.08, 0.1], [-0.3, 0.08]]);
      gg.fillStyle = ink(eye, 'print'); D.ell(gg, 0.2, 0.47, 0.025, 0.045);
      gg.fillStyle = ink(pearl); D.ell(gg, 0.0, 0.19, 0.034, 0.034);
    }, 0.8, 0.95, 'lady head side');
    const headSideZ = behind(headSide, Z.face), headBack = headSideZ + ext(headSide).x0;
    hcard(headSide, 452, { z: headSideZ, ry: PROFILE, name: 'lady head side', cut: band(headSide[0], 0.06, 0.66) });   // its crown would rise over the face in the high camera
    const longHair = piece((gg, ink) => {
      // wavy brown hair falling behind the shoulders, cut off below the head: from the film's high camera a card this
      // far back rises in the frame, so any crown would stand over her head like a hat
      const edge = (s) => { const p = []; for (let k = 0; k <= 9; k++) { const y = 0.8 - 0.72 * k / 9; p.push([s * (0.42 + 0.05 * Math.sin(k * 1.6) + 0.03 * k / 9), y]); } return p; };
      const hem = []; for (let k = 0; k <= 8; k++) { const x = 0.45 - 0.9 * k / 8; hem.push([x, 0.06 + 0.07 * (k % 2)]); }
      gg.fillStyle = ink(hair); D.poly(gg, [[0.3, 0.88], ...edge(1), ...hem, ...edge(-1).reverse(), [-0.3, 0.88]]);
      gg.fillStyle = ink(hairDk, 'print'); for (let k = 0; k < 6; k++) { const x = -0.3 + k * 0.12; D.poly(gg, [[x, 0.8], [x + 0.025, 0.8], [x + 0.05 * Math.sin(k * 2), 0.18], [x + 0.05 * Math.sin(k * 2) - 0.025, 0.18]]); }
      gg.fillStyle = ink(hairHi, 'print'); for (let k = 0; k < 4; k++) { const x = -0.26 + k * 0.17; D.poly(gg, [[x, 0.72], [x + 0.02, 0.72], [x + 0.04, 0.3], [x + 0.02, 0.3]]); }
    }, 1.0, 1.4, 'lady long hair');
    hcard(longHair, 453, { y: -0.62, z: Math.min(headBack - T / 2 - GAP - 0.06, -0.64), back: plain(hairDk), name: 'lady long hair' });
    // the scarf the butler wraps round her: a band at the neck and a tail on her left, hinged at its top edge (it
    // drops from straight out to hanging, the drape), in front of the hair and the coat
    const scarfPivot = new THREE.Group(); scarfPivot.position.set(0, coatTop + 0.17, 0.26); body.add(scarfPivot);
    const scarf = scarfArt('worn');
    mk(scarfPivot, 120)(scarf, 460, { y: -ext(scarf).y1, back: plain('#9a2c32'), name: 'lady scarf' });
    scarfPivot.visible = false;
    const mouth = flat(head, mouthArt(0.075, 0.06, 'lady mouth'), 470, { y: 0.3, z: Z.face + T / 2 + 0.014, h: 0.066, px: 700, name: 'lady mouth' });
    const foam = flat(head, foamArt(), 471, { y: 0.35, z: Z.face + T / 2 + 0.03, h: 0.12, px: 900, name: 'lady foam' });
    const mug = prop(arms[0], -0.92, mugArt(), 472, { lift: -0.06, name: 'lady mug' });
    const stride = strider(legs, arms, body, hipY, 0.62);
    g.userData = { body, arms, head, legs, scarfPivot, mouth, foam, mug, hipY, pose: poser(stride, arms, head, legs, body), height: coatTop + 0.9, handY: shoulderY - 0.92 };
    return g;
  }

  // the scarf: deep berry red with cream stripes and a fringe; 'worn' = neck band + tail, 'folded' = over a forearm
  function scarfArt(kind) {
    const red = '#b3343c', cream = '#efe1c8';
    if (kind === 'worn') return piece((gg, ink) => {
      gg.fillStyle = ink(red); D.rect(gg, -0.31, 0.62, 0.62, 0.24, 0.09); D.poly(gg, [[0.02, 0.7], [0.23, 0.68], [0.25, 0.08], [0.06, 0.1]]);
      gg.fillStyle = ink(P2.shade(red, -0.15), 'print'); D.rect(gg, -0.31, 0.72, 0.62, 0.025);
      gg.fillStyle = ink(cream, 'print'); for (const y of [0.22, 0.3, 0.52]) D.poly(gg, [[0.055, y], [0.245, y - 0.01], [0.245, y + 0.03], [0.055, y + 0.04]]);
      gg.fillStyle = ink(cream); for (let k = 0; k < 5; k++) D.rect(gg, 0.065 + k * 0.038, 0.0, 0.018, 0.12);
    }, 0.7, 0.9, 'scarf');
    return piece((gg, ink) => {
      gg.fillStyle = ink(red); D.rect(gg, -0.12, 0.1, 0.24, 0.62, 0.05);
      gg.fillStyle = ink(cream, 'print'); for (const y of [0.24, 0.32, 0.56]) D.rect(gg, -0.12, y, 0.24, 0.035);
      gg.fillStyle = ink(cream); for (let k = 0; k < 5; k++) D.rect(gg, -0.1 + k * 0.045, 0.0, 0.018, 0.12);
    }, 0.3, 0.75, 'scarf folded');
  }

  // ---------------------------------------------------------------- the butler (~3.9 tall)
  function butler() {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body); g.name = 'butler';
    const card = mk(body, 110);
    const suit = '#2a2a33', suitS = '#22222a', lapel = '#383844', vest = '#55555f', shirt = '#f3f1ec', tie = '#141418';
    const skin = '#f4dcc9', hair = '#19171c', hairHi = '#3a3842', glove = '#f7f7f3', shoe = '#141418', eye = '#1e1a1a';
    const Z = { hair: 0.16, face: 0.09, suit: 0, legs: -0.18 };
    const legFront = (i) => piece((gg, ink) => {
      gg.fillStyle = ink(suit); D.rect(gg, -0.14, 0.16, 0.28, 1.47, 0.04);
      gg.fillStyle = ink('#3c3c48', 'print'); D.rect(gg, i ? -0.01 : -0.01, 0.22, 0.02, 1.3);
      gg.fillStyle = ink(shoe); D.rect(gg, -0.16, 0, 0.32, 0.19, 0.08);
      gg.fillStyle = ink('#5a5a6a', 'print'); D.ell(gg, -0.05, 0.13, 0.06, 0.025);
    }, 0.38, 1.66, `butler leg ${i}`);
    const legSide = (i) => piece((gg, ink) => {
      gg.fillStyle = ink(suitS); D.rect(gg, -0.13, 0.16, 0.27, 1.47, 0.04);
      gg.fillStyle = ink(shoe); D.rect(gg, -0.14, 0, 0.42, 0.19, 0.09);
      gg.fillStyle = ink('#5a5a6a', 'print'); D.ell(gg, 0.16, 0.13, 0.07, 0.025);
    }, 0.6, 1.66, `butler leg ${i} side`);
    const hipX = ext(legFront(0)).x1 + T / 2 + SIDE, hipY = 1.6;
    const legs = [-hipX, hipX].map((x, i) => {
      const hip = new THREE.Group(); hip.position.set(x, hipY, Z.legs); body.add(hip);
      const side = legSide(i);
      card(legFront(i), 510 + i, { y: -hipY, parent: hip, name: `butler leg ${i}` });
      card(side, 520 + i, { y: -hipY, z: behind(side, 0), ry: PROFILE, parent: hip, name: `butler leg ${i} side` });
      return hip;
    });
    // jacket: peak lapels open on a white shirt, the dark-grey waistcoat, a black tie, a white pocket square on his left
    const jacket = piece((gg, ink) => {
      gg.fillStyle = ink(suit); D.poly(gg, [[-0.47, 0], [0.47, 0], [0.46, 0.9], [0.47, 1.4], [0.42, 1.56], [-0.42, 1.56], [-0.47, 1.4], [-0.46, 0.9]]);
      gg.fillStyle = ink(shirt); D.poly(gg, [[-0.21, 1.56], [0.21, 1.56], [0, 0.84]]);
      gg.fillStyle = ink(tie); D.rect(gg, -0.045, 1.43, 0.09, 0.09, 0.02); D.poly(gg, [[-0.035, 1.44], [0.035, 1.44], [0.055, 0.98], [0, 0.93], [-0.055, 0.98]]);
      gg.fillStyle = ink(vest); D.poly(gg, [[-0.2, 1.34], [-0.07, 1.06], [0, 0.98], [0.07, 1.06], [0.2, 1.34], [0.17, 0.72], [0, 0.6], [-0.17, 0.72]]);
      gg.fillStyle = ink('#8a8a96', 'print'); for (const y of [0.9, 0.8, 0.7]) D.ell(gg, 0, y, 0.018, 0.018);
      gg.fillStyle = ink(shirt); D.poly(gg, [[-0.2, 1.56], [-0.05, 1.46], [-0.13, 1.42]]); D.poly(gg, [[0.2, 1.56], [0.05, 1.46], [0.13, 1.42]]);
      gg.fillStyle = ink(lapel);
      D.poly(gg, [[-0.22, 1.56], [-0.36, 1.5], [-0.34, 1.32], [-0.43, 1.31], [-0.3, 1.18], [-0.09, 0.72], [-0.03, 0.74], [-0.17, 1.2]]);
      D.poly(gg, [[0.22, 1.56], [0.36, 1.5], [0.34, 1.32], [0.43, 1.31], [0.3, 1.18], [0.09, 0.72], [0.03, 0.74], [0.17, 1.2]]);
      gg.fillStyle = ink('#4c4c5a', 'print'); D.poly(gg, [[0.3, 1.18], [0.43, 1.31], [0.41, 1.3]]); D.poly(gg, [[-0.3, 1.18], [-0.43, 1.31], [-0.41, 1.3]]);
      gg.fillStyle = ink('#1a1a20', 'print'); D.rect(gg, 0.2, 1.06, 0.2, 0.02); D.rect(gg, -0.4, 0.42, 0.22, 0.03); D.rect(gg, 0.18, 0.42, 0.22, 0.03);
      gg.fillStyle = ink(shirt); D.poly(gg, [[0.23, 1.08], [0.38, 1.08], [0.37, 1.15], [0.34, 1.12], [0.315, 1.17], [0.29, 1.12], [0.26, 1.16]]);
      gg.fillStyle = ink('#0e0e12'); D.ell(gg, 0.02, 0.62, 0.028, 0.028);
      gg.fillStyle = ink('#15151b', 'print'); D.poly(gg, [[-0.02, 0], [0.06, 0], [0.03, 0.5]]);
    }, 1.05, 1.6, 'butler jacket');
    const jY = 1.36, jx = ext(jacket), jTop = jY + jx.y1;
    card(jacket, 501, { y: jY, z: Z.suit, back: plain(suit), name: 'butler jacket' });
    const jSide = piece((gg, ink) => {
      gg.fillStyle = ink(suitS); D.rect(gg, -0.22, 0, 0.44, 1.5, 0.1);
      gg.fillStyle = ink('#34343e', 'print'); D.rect(gg, -0.012, 0.05, 0.024, 1.4); D.rect(gg, 0.04, 0.4, 0.14, 0.03);
    }, 0.55, 1.6, 'butler jacket side');
    const TORSO = 0.36, jSideZ = behind(jSide, Z.suit), jBack = Z.suit - T / 2 - GAP - TORSO;
    card(jSide, 502, { y: jY, z: jSideZ, ry: PROFILE, name: 'butler jacket side', cut: band(jSide[0], jBack - jSideZ, 9, 0) });
    const armArt = (c, name) => piece((gg, ink) => {
      gg.fillStyle = ink(c); D.rect(gg, -0.12, 0.2, 0.24, 0.96, 0.1);
      gg.fillStyle = ink(shirt); D.rect(gg, -0.105, 0.15, 0.21, 0.08, 0.02);
      gg.fillStyle = ink(glove); D.ell(gg, 0, 0.09, 0.1, 0.095);
      gg.fillStyle = ink('#d8d8d2', 'print'); D.rect(gg, -0.04, 0.05, 0.008, 0.07); D.rect(gg, 0.03, 0.05, 0.008, 0.07);
    }, 0.32, 1.2, name);
    const shoulderX = 0.47 + ext(armArt(suit, 'arm')).x1 + SIDE, shoulderY = jTop - 0.12;
    const arms = [-shoulderX, shoulderX].map((x, i) => {
      const sh = new THREE.Group(); sh.position.set(x, shoulderY, Z.suit); body.add(sh);
      const side = armArt(suitS, `butler arm ${i} side`);
      card(armArt(suit, `butler arm ${i}`), 530 + i, { y: -1.14, parent: sh, name: `butler arm ${i}` });
      card(side, 540 + i, { y: -1.14, z: behind(side, 0), ry: PROFILE, parent: sh, name: `butler arm ${i} side` });
      return sh;
    });
    // the scarf he carries folded over his left forearm, hinged at the arm (it folds up as he lifts it to her)
    const carry = new THREE.Group(); carry.position.set(0, -0.5, 0.075); arms[1].add(carry);
    const folded = scarfArt('folded');
    mk(carry, 110)(folded, 560, { y: -ext(folded).y1, back: plain('#9a2c32'), name: 'butler scarf' });
    // head: a calm face, the black hair as a cap with a swept, slightly wavy fringe in front, the profile behind
    const head = new THREE.Group(); head.position.set(0, jTop - 0.06, 0); body.add(head);
    const hcard = mk(head, 140);
    const face = piece((gg, ink) => {
      gg.fillStyle = ink(skin); D.rect(gg, -0.08, 0, 0.16, 0.24, 0.04); D.ell(gg, 0, 0.52, 0.285, 0.36);
      D.ell(gg, -0.285, 0.5, 0.05, 0.075); D.ell(gg, 0.285, 0.5, 0.05, 0.075);
      gg.fillStyle = ink(eye, 'print'); D.ell(gg, -0.11, 0.48, 0.045, 0.032); D.ell(gg, 0.11, 0.48, 0.045, 0.032);
      gg.fillStyle = ink('#ffffff', 'print'); D.ell(gg, -0.098, 0.488, 0.012, 0.01); D.ell(gg, 0.122, 0.488, 0.012, 0.01);
      gg.fillStyle = ink(hair, 'print'); D.rect(gg, -0.17, 0.555, 0.11, 0.022, 0.01); D.rect(gg, 0.06, 0.555, 0.11, 0.022, 0.01);
      gg.fillStyle = ink('#e0b9a2', 'print'); D.poly(gg, [[0.0, 0.46], [0.025, 0.37], [-0.02, 0.37]]);
      gg.fillStyle = ink('#b8705e', 'print'); D.poly(gg, [[-0.06, 0.29], [0.06, 0.29], [0.04, 0.275], [-0.04, 0.275]]);
      gg.fillStyle = ink(P2.rgba('#eaa898', 0.35), 'print'); D.ell(gg, -0.17, 0.38, 0.05, 0.03); D.ell(gg, 0.17, 0.38, 0.05, 0.03);
    }, 0.72, 0.92, 'butler face');
    hcard(face, 550, { z: Z.face, back: plain(hair), name: 'butler face' });
    const hairFront = piece((gg, ink) => {
      gg.fillStyle = ink(hair);
      const cap = []; for (let k = 0; k <= 16; k++) { const a = Math.PI * (k / 16); cap.push([Math.cos(a) * 0.35, 0.6 + Math.sin(a) * 0.37]); }
      D.poly(gg, [...cap, [-0.36, 0.5], [-0.3, 0.42], [-0.26, 0.56], [-0.18, 0.6], [-0.1, 0.57], [-0.02, 0.63], [0.06, 0.58], [0.15, 0.62], [0.24, 0.56], [0.31, 0.44], [0.36, 0.52]]);
      gg.fillStyle = ink(hairHi, 'print');
      for (const [x0, x1] of [[-0.2, -0.05], [0.0, 0.15], [0.12, 0.27]]) D.poly(gg, [[x0, 0.9], [x0 + 0.04, 0.9], [x1, 0.66], [x1 - 0.03, 0.66]]);
    }, 0.8, 1.0, 'butler hair');
    hcard(hairFront, 551, { z: Z.hair, back: plain(hair), name: 'butler hair' });
    const headSide = piece((gg, ink) => {
      gg.fillStyle = ink(P2.shade(skin, -0.04)); D.ell(gg, 0.03, 0.52, 0.27, 0.36); D.rect(gg, -0.07, 0.02, 0.15, 0.22, 0.04);
      gg.fillStyle = ink(hair); D.ell(gg, -0.07, 0.62, 0.29, 0.3); D.poly(gg, [[-0.33, 0.62], [-0.1, 0.62], [-0.12, 0.34], [-0.3, 0.36]]);
      gg.fillStyle = ink(P2.shade(skin, -0.1)); D.ell(gg, -0.02, 0.48, 0.05, 0.075);
      gg.fillStyle = ink(eye, 'print'); D.ell(gg, 0.21, 0.48, 0.022, 0.03);
    }, 0.76, 0.98, 'butler head side');
    const headSideZ = behind(headSide, Z.face), headBack = headSideZ + ext(headSide).x0;
    hcard(headSide, 552, { z: headSideZ, ry: PROFILE, name: 'butler head side', cut: band(headSide[0], 0.06, 0.7) });
    const hairBack = piece((gg, ink) => { gg.fillStyle = ink(hair); D.rect(gg, -0.3, 0.3, 0.6, 0.32, 0.12); }, 0.8, 1.0, 'butler hair back');   // no crown: it would stand over his head in the high camera
    hcard(hairBack, 553, { z: headBack - T / 2 - GAP, back: plain(hair), name: 'butler hair back' });
    const mouth = flat(head, mouthArt(0.085, 0.06, 'butler mouth'), 570, { y: 0.285, z: Z.face + T / 2 + 0.014, h: 0.066, px: 700, name: 'butler mouth' });
    const mug = prop(arms[0], -1.05, mugArt(), 571, { lift: -0.06, name: 'butler mug' });
    const kerchief = prop(arms[0], -1.05, kerchiefArt(), 572, { lift: -0.1, name: 'handkerchief' });
    const stride = strider(legs, arms, body, hipY, 0.78);
    g.userData = { body, arms, head, legs, carry, mouth, mug, kerchief, hipY, pose: poser(stride, arms, head, legs, body), height: jTop + 0.95 };
    return g;
  }

  return { lady: lady(), butler: butler() };
}
