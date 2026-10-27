// 从 scene.js 里读出音效要卡的时间点：鸟、过桥、公交、落叶，以及每辆车从镜头旁经过的时刻 → build/events.json
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { module: {}, console }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'scene.js'), 'utf8') + '\n;this.WORLD = WORLD; this.T = T; this.camera = camera; this.DUR = DUR;', ctx);
const { WORLD, T, camera, DUR } = ctx, ev = [];
for (const c of WORLD.cars) {
  if (c.bridge) continue;
  for (let t = 0; t < DUR; t += 1 / 60) { const cz = camera(t).z, z = c.z0 + c.v * t, z2 = c.z0 + c.v * (t + 1 / 60), cz2 = camera(t + 1 / 60).z;
    if ((z - cz) * (z2 - cz2) <= 0) { ev.push({ t, kind: c.v < 0 ? 'oncoming' : 'overtake', pan: Math.max(-1, Math.min(1, (c.lane - 5.5) / 12)) }); break; } }
}
const bz = WORLD.BZ; for (let t = 0; t < DUR; t += 1 / 60) if (camera(t).z >= bz) { ev.push({ t, kind: 'bridge' }); break; }
ev.push({ t: T.BIRDS[0], kind: 'birds', d: T.BIRDS[1] - T.BIRDS[0] }, { t: T.LEAF[0], kind: 'leaf_up' }, { t: T.LEAF[1], kind: 'leaf_land' });
for (let t = T.BUS[0]; t < T.BUS[1]; t += 1 / 60) { const rel = -22 + 13.5 * (t - T.BUS[0]) + 1.2 * (t - T.BUS[0]) ** 2; if (rel >= 0) { ev.push({ t, kind: 'bus' }); break; } }
fs.mkdirSync(path.join(__dirname, 'build'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'build/events.json'), JSON.stringify(ev.sort((a, b) => a.t - b.t), null, 1));
console.log(ev.map(e => `${e.t.toFixed(2)} ${e.kind}`).join('\n'));
