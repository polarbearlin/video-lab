// The film's music: a slow felt-piano bed in a low register with a soft, high harp line on top (the music-box feel),
// three bars at 70.6 bpm so every bar is one shot (3.4 s), a small rising harp sparkle when the flake lands in her
// palm, and a gentle wind under all of it (filtered noise with slow gusts, mixed into the music stem so capture.py's
// loudness pass treats it as part of the score). Quiet and low-passed: the owner rule is soft, low, no bright bells.
import { renderScoreOffline } from 'papercraft/lib/paper-music.js';

const BPM = 240 / 3.4;              // one 4/4 bar = 3.4 s = one shot
const beat = 60 / BPM, bar = 4 * beat, T0 = 0.1;
const at = (b, k) => T0 + b * bar + k * beat;
const harp = (b, k, midi, vel = 0.1, dur = 2.2) => ({ t: at(b, k), midi, kind: 'harp', vel, dur, pan: 0.18 });

export const SCORE = {
  bpm: BPM, seed: 23, gain: 0.5, wet: 0.36, reverbDuration: 2.6, fadeIn: 0.6, fadeOut: 1.4, startOffset: T0, chordVel: 0.11, bassVel: 0.16,
  bars: [
    { beats: 4, chord: [53, 57, 60, 64], bass: [[0, 41, 0.16], [2.5, 48, 0.08]] },          // Fmaj7: the house in the snow
    { beats: 4, chord: [52, 55, 59, 64], bass: [[0, 40, 0.15], [2.5, 47, 0.07]] },          // Em7: the door opens, they step out
    { beats: 4, chord: [50, 57, 60, 65], bass: [[0, 38, 0.15], [2, 45, 0.08]] },            // Dm7 (add the F on top): the catch
  ],
  notes: [
    harp(0, 0, 76), harp(0, 1, 79, 0.085), harp(0, 2, 81), harp(0, 3, 79, 0.08),
    harp(1, 0, 76), harp(1, 1.5, 74, 0.08), harp(1, 2, 72), harp(1, 3, 74, 0.085),
    harp(2, 0, 76), harp(2, 1, 77, 0.085), harp(2, 2.5, 81, 0.1, 3.2),
    { t: 2.32, midi: 67, kind: 'harp', vel: 0.05, dur: 2.0, pan: -0.2 },                    // the door
    { t: 9.1, midi: 72, vel: 0.12, dur: 3.0 },                                                // a last low felt note under the hold
  ],
  flourishes: [{ t: 7.86, notes: [81, 84, 88, 91], step: 0.085, vel: 0.07, pan: 0.1 }],    // the flake lands in her palm
};

// deterministic noise
function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Wind: two decorrelated low-passed noise channels (~280 Hz and a breathy ~900 Hz band) under slow gust swells. */
function addWind(buf, from, { level = 0.035 } = {}) {
  const sr = buf.sampleRate, n = buf.length;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch), r = mulberry32(911 + ch * 7);
    let lp1 = 0, lp2 = 0, bp = 0, bpl = 0;
    const a1 = 1 - Math.exp(-2 * Math.PI * 260 / sr), a2 = 1 - Math.exp(-2 * Math.PI * 900 / sr), a3 = 1 - Math.exp(-2 * Math.PI * 420 / sr);
    for (let i = 0; i < n; i++) {
      const t = from + i / sr, x = r() * 2 - 1;
      lp1 += a1 * (x - lp1); lp2 += a1 * (lp1 - lp2);                    // a soft rumble
      bp += a2 * (x - bp); bpl += a3 * (bp - bpl);                         // the breathy hiss, band-limited
      const gust = 0.55 + 0.25 * Math.sin(t * 0.9 + ch * 0.6) + 0.2 * Math.sin(t * 2.3 + 1.1 + ch);
      const fade = Math.min(1, t / 1.2);
      d[i] += level * fade * gust * (lp2 * 3.2 + (bp - bpl) * 0.9);
    }
  }
  return buf;
}

export async function renderSoundtrack(sec, sampleRate, from = 0) {
  const buf = await renderScoreOffline(SCORE, sec, { sampleRate, from });
  return addWind(buf, from);
}
