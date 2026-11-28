// The 60 s film's music: a slow felt-piano ballad (60 bpm, one 4-beat bar = 4 s) with a soft harp line, the demo's
// instruments and wind. The sled ride (32-42 s) gets running harp eighths (a little quicker, lighter); 48-56 s thins to
// long notes (the slowing, the space); it ends on an open Fadd9 under the closing book. Mixed under the dialogue later
// (first-snow/mix.py ducks it about 10 dB under each line).
import { renderScoreOffline } from 'papercraft/lib/paper-music.js';
import { addWind } from '../score.js';

const BPM = 60, T0 = 0.1, beat = 60 / BPM, bar = 4 * beat;
const BARS = [
  // chord (felt, low-mid), bass [[beat, midi, vel]], melody [[beat, midi, vel]]
  { chord: [53, 57, 60, 64], bass: [[0, 41, 0.13]], melody: [[1, 76, 0.1], [2.5, 79, 0.1]] },                               // 0  the cottage
  { chord: [52, 55, 60, 64], bass: [[0, 40, 0.13]], melody: [[0, 77, 0.11], [1, 76], [2, 74], [3.5, 72]] },                 // 4  the door
  { chord: [50, 57, 60, 65], bass: [[0, 38, 0.13], [2.5, 45, 0.07]], melody: [[0, 74], [2, 77], [3, 76]] },                  // 8  下雪了
  { chord: [50, 53, 57, 62], bass: [[0, 46, 0.12]], melody: [[0, 74], [1, 72], [2, 69]] },                                  // 12 she rushes out
  { chord: [53, 57, 60, 64], bass: [[0, 45, 0.12]], melody: [[1, 72], [2, 76], [3, 79]] },                                  // 16
  { chord: [50, 55, 58, 65], bass: [[0, 43, 0.12], [2.5, 48, 0.08]], melody: [[0, 81], [1.5, 79], [2, 77], [3, 76]] },       // 20 cocoa, scarf
  { chord: [53, 57, 60, 64], bass: [[0, 41, 0.12]], melody: [[0, 76], [2, 77], [3, 79]] },                                  // 24 the foam
  { chord: [52, 55, 60, 64], bass: [[0, 45, 0.12]], melody: [[0, 76], [1, 74], [2, 72]] },                                  // 28 the handkerchief
  { chord: [50, 57, 60, 64], bass: [[0, 38, 0.13], [2, 45, 0.08]], melody: [[0, 74], [0.5, 77], [1, 81], [2, 79], [2.5, 77], [3, 76]], run: true },   // 32 the sled
  { chord: [50, 53, 57, 60], bass: [[0, 46, 0.13], [2, 41, 0.08]], melody: [[0, 77], [0.5, 79], [1, 81], [1.5, 82], [2, 81], [3, 77]], run: true },   // 36 faster
  { chord: [52, 55, 57, 60], bass: [[0, 48, 0.13], [2, 43, 0.08]], melody: [[0, 79], [0.5, 81], [1, 84], [2, 81], [3, 79]], run: true },              // 40 the lake
  { chord: [52, 55, 60, 64], bass: [[0, 45, 0.12]], melody: [[0, 76], [1, 79], [2, 76], [3, 72]] },                         // 44 眼睛挺像的
  { chord: [50, 53, 57, 62], bass: [[0, 46, 0.11]], melody: [[0, 74, 0.1], [2.5, 77, 0.09]] },                              // 48 slowing
  { chord: [50, 53, 58, 65], bass: [[0, 43, 0.1]], melody: [[0, 77, 0.09], [2, 76, 0.08]] },                                // 52 her head on his shoulder
  { chord: [53, 55, 57, 60, 64], bass: [[0, 41, 0.11]], melody: [[0, 72, 0.09], [1.5, 76, 0.08], [3, 77, 0.07]] },          // 56 the book closes
];
const notes = [];
BARS.forEach((b, i) => {
  if (!b.run) return;
  const t0 = T0 + i * bar, up = b.chord.map((m) => m + 12);
  for (let k = 0; k < 8; k++) notes.push({ t: t0 + k * beat / 2, midi: up[[0, 1, 2, 3, 2, 1, 2, 3][k] % up.length], kind: 'harp', vel: 0.05 + 0.012 * (k % 2 ? 0 : 1), dur: 1.2, pan: 0.22 });
});
// sparse harp answers in the quiet bars, and two flourishes: the cat snowman pops up, the book closes
for (const [t, m] of [[2.6, 84], [10.6, 81], [22.6, 84], [30.6, 81], [46.9, 84], [53.6, 81]]) notes.push({ t, midi: m, kind: 'harp', vel: 0.06, dur: 2.4, pan: 0.2 });
notes.push({ t: 6.12, midi: 67, kind: 'harp', vel: 0.045, dur: 2.0, pan: -0.2 });   // the door
notes.push({ t: 58.2, midi: 65, vel: 0.1, dur: 3.0 });                               // a last low note under the closing page
export const SCORE = {
  bpm: BPM, seed: 29, gain: 0.5, wet: 0.4, reverbDuration: 3.0, fadeIn: 0.8, fadeOut: 2.2, startOffset: T0, chordVel: 0.1, bassVel: 0.13, melodyVel: 0.13,
  bars: BARS.map((b) => ({ beats: 4, chord: b.chord, bass: b.bass, melody: b.melody.map(([bt, m, v]) => [bt, m, v ?? 0.12]) })),
  notes,
  flourishes: [{ t: 42.1, notes: [79, 84, 88, 91], step: 0.09, vel: 0.06, pan: 0.15 }, { t: 56.6, notes: [72, 77, 81, 84, 88], step: 0.14, vel: 0.05, pan: -0.1 }],
};

export async function renderSoundtrack(sec, sampleRate, from = 0) {
  const buf = await renderScoreOffline(SCORE, sec, { sampleRate, from });
  return addWind(buf, from, { level: 0.03 });
}
