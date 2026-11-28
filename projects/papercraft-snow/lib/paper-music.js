// papercraft / paper-music.js
// Procedural storybook music for Web Audio API (live + OfflineAudioContext): muted felt-piano notes, warm wooden-hall
// stereo reverb, gentle harp plucks, and resonant arrival bells. Zero external audio samples, seeded (an offline render
// repeats within 1 LSB), designed to pair with paper-sound.js (music-forward mix with paper foley sitting 16-20 dB
// beneath). The bus has headroom and a soft knee: at the defaults nothing clips.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// one set of defaults for the offline render and the live player, so a score sounds the same in the page and the video
const DEFAULTS = { bpm: 76, gain: 0.58, dry: 0.85, wet: 0.32, reverbDuration: 2.1, seed: 17, chordVel: 0.16, bassVel: 0.22, melodyVel: 0.26 };

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** How long a felt-piano note rings by itself (s): longer in the bass. */
const naturalDur = (midi) => clamp(4.1 - (midi - 48) * 0.045, 1.5, 4.6);

/**
 * Synthesise one muted felt-piano note into a mono Float32Array (peak 0.92).
 * 3 softly detuned strings with subtle inharmonicity, felt-damped harmonic roll-off, a warm wooden hammer thump
 * (~28 ms), register-aware decay and a gentle 1-pole low-pass tilt.
 */
export function synthFeltPiano(midi, seed = 1, sr = 48000, { duration = null, warmth = 1 } = {}) {
  const f0 = midiToHz(midi);
  const dur = duration ?? naturalDur(midi);
  const n = Math.max(1, Math.ceil(dur * sr));
  const out = new Float32Array(n);
  const r = mulberry32((seed * 7919 + Math.round(midi * 131)) >>> 0);
  const detunes = [0, 0.9 + (r() - 0.5) * 0.3, -0.75 + (r() - 0.5) * 0.3];
  const inharm = 0.00018 * clamp(f0 / 261.63, 0.5, 2.2);
  const maxH = Math.min(8, Math.floor((sr * 0.32) / f0));
  const hPhases = Array.from({ length: maxH }, () => r() * Math.PI * 2);
  const hAmps = Array.from({ length: maxH }, (_, k) => {
    const h = k + 1;
    // felt hammer heavily damps upper partials (> 3rd harmonic)
    const felt = Math.pow(h, -1.95 - 0.35 * warmth) * (h === 2 ? 0.85 : 1);
    return felt * (0.92 + r() * 0.16);
  });
  const baseTau = dur * 0.38;
  const hDecay = Array.from({ length: maxH }, (_, k) => {
    const h = k + 1;
    return Math.exp(-1 / (Math.max(0.06, baseTau / Math.pow(h, 0.72)) * sr));
  });
  const stringMults = detunes.map((cents) => Math.pow(2, cents / 1200));

  // Precompute oscillator increments & decaying envelopes per harmonic x string
  const osc = [];
  for (let s = 0; s < stringMults.length; s++) {
    const sGain = s === 0 ? 0.5 : 0.25;
    for (let k = 0; k < maxH; k++) {
      const h = k + 1;
      const fh = f0 * stringMults[s] * h * Math.sqrt(1 + inharm * h * h);
      if (fh > sr * 0.42) continue;
      osc.push({
        w: (2 * Math.PI * fh) / sr,
        ph: hPhases[k] + s * 1.17,
        env: hAmps[k] * sGain,
        dec: hDecay[k],
      });
    }
  }

  // Soft felt hammer thump (warm low-mid noise transient over ~28 ms)
  const thumpN = Math.min(n, Math.ceil(0.028 * sr));
  const thumpDec = Math.exp(-1 / (0.006 * sr));
  const aThump = 1 - Math.exp((-2 * Math.PI * clamp(f0 * 2.1, 220, 900)) / sr);
  let thEnv = 0.085, thLp = 0;

  // Register-dependent warm tilt filter
  const lpHz = clamp(1250 + (midi - 48) * 18, 950, 2250) / Math.max(0.6, warmth);
  const aLp = 1 - Math.exp((-2 * Math.PI * lpHz) / sr);
  const attN = Math.max(1, Math.round(0.0075 * sr));
  const tail0 = Math.floor(n * 0.86), tailN = Math.max(1, n - tail0);
  let lp = 0, peak = 1e-6;

  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < osc.length; j++) {
      const o = osc[j];
      sum += Math.sin(o.ph) * o.env;
      o.ph += o.w;
      o.env *= o.dec;
    }
    if (i < thumpN) {
      thLp += aThump * ((r() * 2 - 1) - thLp);
      sum += thLp * thEnv;
      thEnv *= thumpDec;
    }
    lp += aLp * (sum - lp);
    let y = lp;
    if (i < attN) { const u = i / attN; y *= u * u * (3 - 2 * u); }
    if (i >= tail0) { const u = 1 - (i - tail0) / tailN; y *= u * u * (3 - 2 * u); }
    out[i] = y;
    const a = Math.abs(y);
    if (a > peak) peak = a;
  }

  const norm = 0.92 / peak;
  for (let i = 0; i < n; i++) out[i] *= norm;
  return out;
}

/**
 * Warm wooden storybook hall impulse response (stereo, decorrelated, low-passed diffuse tail), scaled to unit energy
 * per channel so the bus's `wet` alone sets the reverb's level (left as generated it adds ~15 dB and clips the bus).
 */
export function makeHallIR(ctx, { duration = 2.0, seed = 17, preDelay = 0.018, lpHz = 2200 } = {}) {
  const sr = ctx.sampleRate;
  const n = Math.max(1, Math.ceil(duration * sr));
  const ir = ctx.createBuffer(2, n, sr);
  const preN = Math.round(preDelay * sr);
  const aLp = 1 - Math.exp((-2 * Math.PI * lpHz) / sr);
  const taps = [
    [0.014, 0.24, -0.45], [0.023, 0.20, 0.50], [0.037, 0.16, -0.65],
    [0.053, 0.13, 0.60], [0.071, 0.10, -0.35], [0.094, 0.08, 0.40],
  ];
  for (let ch = 0; ch < 2; ch++) {
    const r = mulberry32((seed * 1013 + ch * 4999) >>> 0);
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = preN; i < n; i++) {
      const t = (i - preN) / sr;
      const env = Math.exp(-t / (duration * 0.28)) * Math.min(1, t / 0.04);
      lp += aLp * ((r() * 2 - 1) - lp);
      d[i] += lp * env * 0.24;
    }
    for (const [t, g, pan] of taps) {
      const idx = Math.round(t * sr);
      if (idx > 1 && idx + 1 < n) {
        const gg = g * Math.min(1, ch ? 1 + pan : 1 - pan);
        d[idx - 1] += gg * 0.25; d[idx] += gg * 0.5; d[idx + 1] += gg * 0.25;
      }
    }
    const fade = Math.round(0.08 * sr);
    for (let i = Math.max(0, n - fade); i < n; i++) d[i] *= (n - i) / fade;
    let e = 0;
    for (let i = 0; i < n; i++) e += d[i] * d[i];
    const k = e > 0 ? 1 / Math.sqrt(e) : 1;
    for (let i = 0; i < n; i++) d[i] *= k;
  }
  return ir;
}

// every voice goes through a panner (also at pan 0), so a centred note is as loud as a panned one
function toDest(ctx, node, dest, pan) {
  if (typeof ctx.createStereoPanner !== 'function') { node.connect(dest); return; }
  const p = ctx.createStereoPanner();
  p.pan.value = clamp(pan || 0, -1, 1);
  node.connect(p); p.connect(dest);
}

/** The felt-piano AudioBuffer of a pitch, synthesised once per (pitch, length, warmth, seed) and kept in `cache`. */
export function feltBuffer(ctx, cache, midi, { seed = 1, duration = null, warmth = 1 } = {}) {
  // a note held longer than its natural decay is synthesised at that length (to the next half second)
  const longDur = duration && duration > naturalDur(midi) ? Math.ceil(duration * 2) / 2 : null;
  const key = `${midi}|${longDur ?? 'nat'}|${warmth}|${seed}`;
  let ab = cache.get(key);
  if (!ab) {
    const pcm = synthFeltPiano(midi, seed, ctx.sampleRate, { duration: longDur, warmth });
    ab = ctx.createBuffer(1, pcm.length, ctx.sampleRate);
    ab.getChannelData(0).set(pcm);
    cache.set(key, ab);
  }
  return ab;
}

/**
 * Schedule one felt-piano note on ctx -> dest at `when` (s) with velocity `vel`. duration (s): shorter than the note's
 * natural decay releases it early; longer holds it. Keep one seed per score: each new (pitch, seed) costs a synthesis
 * (~50 ms). Returns the source node.
 */
export function scheduleFeltNote(ctx, dest, cache, midi, vel = 0.28, when = 0, { seed = 1, pan = 0, duration = null, warmth = 1 } = {}) {
  const t0 = Math.max(0, when), v0 = Math.max(0.0005, vel);
  const ab = feltBuffer(ctx, cache, midi, { seed, duration, warmth });
  const src = ctx.createBufferSource();
  src.buffer = ab;
  const g = ctx.createGain();
  g.gain.setValueAtTime(v0, t0);
  const cut = duration && duration > 0 && duration < ab.duration;
  if (cut) {
    const rel = Math.min(0.28, duration * 0.5);
    g.gain.setValueAtTime(v0, t0 + duration - rel);
    g.gain.exponentialRampToValueAtTime(0.0005, t0 + duration);
  }
  src.connect(g);
  toDest(ctx, g, dest, pan);
  src.start(t0);
  if (cut) src.stop(t0 + duration + 0.05);
  return src;
}

/** Schedule a gentle storybook harp pluck (soft sine/triangle blend + lowpass envelope). */
export function scheduleHarpPluck(ctx, dest, midi, when = 0, { vel = 0.14, pan = 0, dur = 1.6 } = {}) {
  const f0 = midiToHz(midi);
  const t0 = Math.max(0, when), v0 = Math.max(0.0005, vel), d0 = Math.max(0.05, dur);
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
  o1.type = 'triangle'; o1.frequency.setValueAtTime(f0, t0);
  o2.type = 'sine'; o2.frequency.setValueAtTime(f0 * 2, t0);
  const g1 = ctx.createGain(), g2 = ctx.createGain(), lp = ctx.createBiquadFilter();
  g1.gain.setValueAtTime(0.0001, t0);
  g1.gain.linearRampToValueAtTime(v0, t0 + 0.009);
  g1.gain.exponentialRampToValueAtTime(0.0004, t0 + d0);
  g2.gain.setValueAtTime(0.0001, t0);
  g2.gain.linearRampToValueAtTime(Math.max(0.0005, v0 * 0.28), t0 + 0.006);
  g2.gain.exponentialRampToValueAtTime(0.0004, t0 + d0 * 0.45);
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(clamp(f0 * 4.5, 900, 3200), t0);
  lp.frequency.exponentialRampToValueAtTime(clamp(f0 * 1.4, 420, 1200), t0 + d0 * 0.7);
  o1.connect(g1); o2.connect(g2); g1.connect(lp); g2.connect(lp);
  toDest(ctx, lp, dest, pan);
  o1.start(t0); o2.start(t0);
  o1.stop(t0 + d0 + 0.05); o2.stop(t0 + d0 + 0.05);
}

/** Schedule a warm resonant bell / celesta chime for landmark reveals or hero moments. */
export function scheduleWarmBell(ctx, dest, midi, when = 0, { vel = 0.11, pan = 0, dur = 2.4 } = {}) {
  const f0 = midiToHz(midi);
  const t0 = Math.max(0, when), v0 = Math.max(0.0005, vel), d0 = Math.max(0.08, dur);
  const partials = [[1, 1.0, 1.0], [2, 0.35, 0.55], [3, 0.12, 0.28]];
  const out = ctx.createGain();
  out.gain.value = 1;
  toDest(ctx, out, dest, pan);
  for (const [mult, amp, dFrac] of partials) {
    const osc = ctx.createOscillator();
    osc.type = 'sine'; osc.frequency.setValueAtTime(f0 * mult, t0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(Math.max(0.0004, v0 * amp), t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0003, t0 + d0 * dFrac);
    osc.connect(g); g.connect(out);
    osc.start(t0); osc.stop(t0 + d0 * dFrac + 0.05);
  }
}

// bus -> dry + hall -> soft knee -> master. The knee's curve spans +-2 behind a 0.5 pre-gain: unity gain up to 0.72,
// then a soft shoulder with 6 dB of headroom before anything flattens (a full chord with its reverb peaks near 0.9).
function buildMusicBus(ctx, dest, { gain = DEFAULTS.gain, dry = DEFAULTS.dry, wet = DEFAULTS.wet, reverbDuration = DEFAULTS.reverbDuration, seed = DEFAULTS.seed } = {}) {
  const bus = ctx.createGain();
  const dryG = ctx.createGain(); dryG.gain.value = dry;
  const wetG = ctx.createGain(); wetG.gain.value = wet;
  const conv = ctx.createConvolver(); conv.normalize = false; conv.buffer = makeHallIR(ctx, { duration: reverbDuration, seed });
  const pre = ctx.createGain(); pre.gain.value = 0.5;
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(4097), k = 0.72;
  for (let i = 0; i < curve.length; i++) {
    const x = (i / 2048 - 1) * 2, a = Math.abs(x);
    curve[i] = Math.sign(x) * (a <= k ? a : k + (1 - k) * Math.tanh((a - k) / (1 - k)));
  }
  shaper.curve = curve;
  const master = ctx.createGain(); master.gain.value = gain;
  bus.connect(dryG); bus.connect(conv); conv.connect(wetG);
  dryG.connect(pre); wetG.connect(pre); pre.connect(shaper); shaper.connect(master); master.connect(dest);
  return { bus, master };
}

const tempo = (score) => 60 / (score.bpm > 0 ? score.bpm : DEFAULTS.bpm);                 // seconds per beat
const barBeats = (bar) => Math.max(0.25, Number(bar.beats) > 0 ? Number(bar.beats) : 4);   // a bar always advances

/**
 * Render a storybook felt-piano score offline to a stereo AudioBuffer (for capture.py --audio).
 * score:
 *   bpm: tempo (default 76)
 *   bars: [{ beats: 4, chord: [midi...], melody: [[beat, midi, vel?], ...], bass: [[beat, midi, vel?], ...] }] (loops to fill duration)
 *   notes: [{ t, midi, vel?, pan?, kind?: 'piano'|'harp'|'bell', dur? }] (explicit timed notes in seconds)
 *   flourishes: [{ t, notes: [midi...], step?: 0.075, vel?: 0.14, pan?: 0 }] (harp arpeggios)
 *   bells: [{ t, midi, vel?: 0.11, pan?: 0, dur?: 2.4 }]
 *   gain, dry, wet, reverbDuration, seed, startOffset (s before the first bar, default 0.1), fadeIn, fadeOut
 * from: start that many seconds into the score (a clip that begins mid-timeline: the 3D harness passes it as the third
 * argument of the music renderer): the score is rendered from its start and the window [from, from + seconds) returned,
 * so notes still ringing at the cut are there.
 */
export async function renderScoreOffline(score = {}, durationSec = 10, { sampleRate = 48000, from = 0 } = {}) {
  const start = Math.max(0, Number(from) || 0), dur = start + Math.max(0.1, durationSec);
  const ctx = new OfflineAudioContext(2, Math.ceil(dur * sampleRate), sampleRate);
  const { bus, master } = buildMusicBus(ctx, ctx.destination, score);
  const cache = new Map();
  const beatSec = tempo(score), seed = score.seed ?? DEFAULTS.seed;
  const r = mulberry32(seed ^ 0x9e3779b9);

  // Fade-in at the score's start and fade-out at the end of the render, so tails never truncate abruptly
  const fadeIn = Math.min(score.fadeIn ?? 0.25, dur * 0.25);
  const fadeOut = Math.min(score.fadeOut ?? 1.2, dur * 0.35);
  const g0 = score.gain ?? DEFAULTS.gain;
  master.gain.setValueAtTime(fadeIn > 0.01 ? 0.0001 : g0, 0);
  if (fadeIn > 0.01) master.gain.linearRampToValueAtTime(g0, fadeIn);
  if (fadeOut > 0.05) {
    master.gain.setValueAtTime(g0, Math.max(fadeIn, dur - fadeOut));
    master.gain.linearRampToValueAtTime(0.0001, dur);
  }

  // Schedule looping bar structure if provided
  if (Array.isArray(score.bars) && score.bars.length) {
    let t = score.startOffset ?? 0.1;
    let barIdx = 0;
    const stopBefore = dur - Math.min(0.45, fadeOut * 0.4);
    while (t < stopBefore) {
      const bar = score.bars[barIdx % score.bars.length];
      if (Array.isArray(bar.chord)) {
        bar.chord.forEach((m, idx) => {
          const wt = t + idx * 0.028 + (r() - 0.5) * 0.008;
          if (wt < stopBefore) scheduleFeltNote(ctx, bus, cache, m, (bar.chordVel ?? DEFAULTS.chordVel) * (0.9 + r() * 0.18), wt, { seed, pan: -0.25 + idx * 0.14 });
        });
      }
      if (Array.isArray(bar.bass)) {
        for (const [b, m, v = DEFAULTS.bassVel] of bar.bass) {
          const wt = t + b * beatSec + (r() - 0.5) * 0.008;
          if (wt < stopBefore) scheduleFeltNote(ctx, bus, cache, m, v, wt, { seed, pan: -0.2 });
        }
      }
      if (Array.isArray(bar.melody)) {
        for (const [b, m, v = DEFAULTS.melodyVel] of bar.melody) {
          const wt = t + b * beatSec + (r() - 0.5) * 0.01;
          if (wt < stopBefore) scheduleFeltNote(ctx, bus, cache, m, v * (0.92 + r() * 0.15), wt, { seed, pan: 0.15 });
        }
      }
      t += barBeats(bar) * beatSec;
      barIdx++;
    }
  }

  // Explicit timed notes
  if (Array.isArray(score.notes)) {
    for (const ev of score.notes) {
      if (!(ev.t >= 0) || ev.t >= dur - 0.05) continue;
      if (ev.kind === 'harp') scheduleHarpPluck(ctx, bus, ev.midi, ev.t, { vel: ev.vel ?? 0.14, pan: ev.pan ?? 0, dur: ev.dur ?? 1.6 });
      else if (ev.kind === 'bell') scheduleWarmBell(ctx, bus, ev.midi, ev.t, { vel: ev.vel ?? 0.11, pan: ev.pan ?? 0, dur: ev.dur ?? 2.4 });
      else scheduleFeltNote(ctx, bus, cache, ev.midi, ev.vel ?? 0.25, ev.t, { seed, pan: ev.pan ?? 0, duration: ev.dur ?? null });
    }
  }

  // Harp flourishes (e.g. hero jump, banner unfurl, scene transition)
  if (Array.isArray(score.flourishes)) {
    for (const fl of score.flourishes) {
      const step = fl.step ?? 0.075, vel = fl.vel ?? 0.14, pan = fl.pan ?? 0;
      (fl.notes || []).forEach((m, idx) => {
        const wt = fl.t + idx * step;
        if (wt >= 0 && wt < dur - 0.05) scheduleHarpPluck(ctx, bus, m, wt, { vel: vel * (0.9 + idx * 0.04), pan: clamp(pan + (idx - 1.5) * 0.08, -0.8, 0.8) });
      });
    }
  }

  // Arrival bells
  if (Array.isArray(score.bells)) {
    for (const bl of score.bells) {
      if (bl.t >= 0 && bl.t < dur - 0.05) scheduleWarmBell(ctx, bus, bl.midi, bl.t, { vel: bl.vel ?? 0.11, pan: bl.pan ?? 0, dur: bl.dur ?? 2.4 });
    }
  }

  const full = await ctx.startRendering();
  if (start <= 0) return full;
  // the window from `from`, with a short fade so the cut does not click
  const n0 = Math.min(full.length - 1, Math.round(start * sampleRate)), n = full.length - n0, fadeN = Math.min(n, Math.round(0.02 * sampleRate));
  const out = new AudioBuffer({ numberOfChannels: full.numberOfChannels, length: n, sampleRate });
  for (let ch = 0; ch < full.numberOfChannels; ch++) {
    const d = out.getChannelData(ch);
    d.set(full.getChannelData(ch).subarray(n0));
    for (let i = 0; i < fadeN; i++) d[i] *= i / fadeN;
  }
  return out;
}

/**
 * Live storybook felt-piano player with lookahead scheduling and chord-tone discovery chimes.
 * Call player.unlock() inside a pointerdown / keydown handler, then player.start(). It loops score.bars with the
 * offline render's defaults (tempo, gain, hall, velocities); a score's timed notes, flourishes, bells and fades belong
 * to the offline render only (use chime() for moments). start() synthesises each pitch once first, one per task, so
 * the page never stalls on a bar's worth of notes; stop() fades out and silences what was already scheduled.
 */
export class FeltPianoPlayer {
  constructor(score = {}) {
    this.score = { ...DEFAULTS, bars: [], ...score };
    this.ctx = null; this.chain = null; this.cache = new Map();
    this.running = false; this.muted = false; this.barIdx = 0; this.nextBarAt = 0; this._timer = null; this._live = new Set();
  }
  unlock(sharedCtx = null) {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = sharedCtx || (() => { try { return new AC({ sampleRate: 48000 }); } catch { return new AC(); } })();
      this.chain = buildMusicBus(this.ctx, this.ctx.destination, this.score);
      if (this.muted) this.chain.master.gain.value = 0;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  async start() {
    if (this.running || !this.score.bars?.length) return;
    this.unlock();
    this.running = true;
    const { ctx, score, cache } = this, seed = score.seed;
    const pitches = new Set();
    for (const bar of score.bars) {
      for (const m of bar.chord || []) pitches.add(m);
      for (const [, m] of bar.bass || []) pitches.add(m);
      for (const [, m] of bar.melody || []) pitches.add(m);
    }
    for (const m of pitches) {
      if (!this.running) return;
      feltBuffer(ctx, cache, m, { seed });
      await new Promise((res) => setTimeout(res, 0));
    }
    if (!this.running) return;
    const g = this.chain.master.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setTargetAtTime(this.muted ? 0 : score.gain, ctx.currentTime, 0.05);
    this.barIdx = 0;
    this.nextBarAt = ctx.currentTime + 0.12;
    const note = (m, vel, when, pan) => {
      const src = scheduleFeltNote(ctx, this.chain.bus, cache, m, vel, when, { seed, pan });
      this._live.add(src);
      src.onended = () => this._live.delete(src);
    };
    const tick = () => {
      if (!this.running) return;
      const beatSec = tempo(score), now = ctx.currentTime;
      if (this.nextBarAt < now) this.nextBarAt = now + 0.05;     // a stalled tab: pick up now, never schedule in the past
      while (this.nextBarAt < now + 1.5) {
        const bar = score.bars[this.barIdx % score.bars.length], t = this.nextBarAt;
        (bar.chord || []).forEach((m, i) => note(m, bar.chordVel ?? score.chordVel, t + i * 0.028, -0.25 + i * 0.14));
        for (const [b, m, v = score.bassVel] of bar.bass || []) note(m, v, t + b * beatSec, -0.2);
        for (const [b, m, v = score.melodyVel] of bar.melody || []) note(m, v, t + b * beatSec, 0.15);
        this.nextBarAt += barBeats(bar) * beatSec;
        this.barIdx++;
      }
      this._timer = setTimeout(tick, 350);
    };
    tick();
  }
  stop() {
    this.running = false;
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    if (!this.ctx || !this.chain) return;
    const now = this.ctx.currentTime, g = this.chain.master.gain;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(0, now, 0.04);
    for (const src of this._live) { try { src.stop(now + 0.25); } catch { /* already stopped */ } }
    this._live.clear();
  }
  setMuted(m) {
    this.muted = m;
    if (this.ctx && this.chain) this.chain.master.gain.setTargetAtTime(m ? 0 : this.score.gain, this.ctx.currentTime, 0.05);
  }
  /** Play a gentle chord-tone harp flourish for interactive discoveries or milestone arrivals. */
  chime(notes = [72, 76, 79, 84], { vel = 0.12, step = 0.07 } = {}) {
    if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
    const t0 = this.ctx.currentTime + 0.02;
    notes.forEach((m, i) => scheduleHarpPluck(this.ctx, this.chain.bus, m, t0 + i * step, { vel, pan: clamp((i - 1.5) * 0.15, -0.6, 0.6) }));
  }
}
