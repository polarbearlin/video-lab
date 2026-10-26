#!/usr/bin/env python3
"""v12 新配乐 + 卡通音效（完整 90 秒，128 BPM）→ build/v12_audio.wav
和 v10/v11 的区别：
- 每一段换一种风格（暗场电钢琴 → 白光炸开的放克 → 越来越燃 → 卡顿 → B站俏皮拨弦 → 深夜八音盒 → 早安 → 做片子电子 → 结尾电钢琴把主旋律弹一遍）；
- 有一个记得住的主旋律（hook），贯穿全片，不同段落换乐器；
- 卡点：大事件前音乐停住、事件那一下炸开（STOPS），侧链让鼓点"一呼一吸"；
- 卡通音效：跳=滑哨、落地=橡皮吱、小分身蹦出来=按音阶 do re mi…、被问是不是 AI=唱片刮擦+冷场蛐蛐、泄气=伤心长号、深夜打呼、天亮鸟叫。"""
import os, sys, numpy as np, soundfile as sf
from scipy.signal import fftconvolve, butter, sosfilt
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import plan as P
P10, P11 = P.P10, P.P11
SONG = bool(os.environ.get('SFX_ONLY'))   # SFX_ONLY=1：只出音效轨（配 Suno 的歌用），去掉会和歌跑调的有音高的音效
SR = 48000; N = int(P.DUR * SR); rng = np.random.default_rng(12)
T = lambda d: np.arange(int(d * SR)) / SR
mt = lambda m: 440 * 2 ** ((m - 69) / 12)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f): return sosfilt(butter(2, min(f, SR / 2 - 100), 'low', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(2, f, 'high', fs=SR, output='sos'), x)
def env(d, a=.005, r=None):
    t = T(d); e = np.minimum(1, t / max(a, 1e-4)); r = r or d * .4; return e * np.exp(-t / r)
def noise(d): return rng.standard_normal(int(d * SR))
def saw(f, d, det=0.):
    t = T(d); fs = np.atleast_1d(f) * (1 + det)
    return 2 * ((np.cumsum(np.broadcast_to(fs, t.shape) if fs.size > 1 else np.full(t.shape, fs[0])) / SR) % 1) - 1
def glide(f0, f1, d, curve='geo'):
    n = int(d * SR); return np.geomspace(f0, f1, n) if curve == 'geo' else np.linspace(f0, f1, n)
def osc(freqs, shape='sin'):
    ph = 2 * np.pi * np.cumsum(freqs) / SR
    return np.sin(ph) if shape == 'sin' else np.tanh(4 * np.sin(ph)) if shape == 'sq' else 2 * ((ph / (2 * np.pi)) % 1) - 1

# ======================================================================= 乐器
def epiano(f, d=1.2):
    t = T(d); return np.sin(2 * np.pi * f * t + 1.8 * np.exp(-t / .25) * np.sin(2 * np.pi * f * t)) * env(d, .003, d * .35) * (1 + .3 * np.sin(2 * np.pi * 5 * t))
def supersaw(f, d, cut=3000, cut_env=False):
    x = sum(saw(f, d, det) for det in (-.012, -.005, 0, .006, .013)) / 5
    x = lp(x, cut) if not cut_env else np.concatenate([lp(x[:int(.06 * SR)], cut * 2), lp(x[int(.06 * SR):], cut)])
    return x * env(d, .004, d * .5)
def lead(f, d, vib=.012, shape='sq'):
    t = T(d); fr = f * (1 + vib * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / .12)); return lp(osc(fr, shape), 4500) * env(d, .01, d * .7) * .8
def slapbass(f, d):
    t = T(d); x = saw(f, d); x = lp(x, 900) * np.exp(-t / (d * .5)) + .4 * np.sin(2 * np.pi * f * t) * np.exp(-t / d)
    return np.tanh(2.2 * x) * np.minimum(1, t / .003)
def pluck(f, d=.5):   # Karplus–Strong 拨弦
    n = int(d * SR); L = max(2, int(SR / f)); buf = rng.uniform(-1, 1, L); out = np.zeros(n)
    for i in range(n): out[i] = buf[i % L]; buf[i % L] = .5 * (buf[i % L] + buf[(i + 1) % L]) * .996
    return out
def marimba(f, d=.45): t = T(d); return np.sin(2 * np.pi * f * t) * np.exp(-t / .14) + .25 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / .025)
def musicbox(f, d=1.4): t = T(d); return (np.sin(2 * np.pi * f * t) + .35 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t / .2)) * np.exp(-t / .7) * np.minimum(1, t / .002)
def bell(f, d=1.):
    t = T(d); return np.sin(2 * np.pi * f * t + 1.4 * np.sin(2 * np.pi * f * 3.5 * t) * np.exp(-t / .1)) * np.exp(-t / (d * .3))
def pad(fs, d):
    t = T(d); x = sum(sum(np.sin(2 * np.pi * f * (1 + dd) * t) for dd in (-.003, .003)) for f in fs) / (2 * len(fs))
    return x * np.minimum(1, t / .5) * np.minimum(1, (d - t) / .6)
def brass(fs, d):
    x = sum(saw(f, d, dd) for f in fs for dd in (-.004, .004)) / (2 * len(fs)); t = T(d)
    cut = 600 + 3500 * np.exp(-t / .12); y = np.zeros_like(x)   # 滤波器快速张开再合上 → "叭"的铜管感
    for k in range(0, len(x), 2400): y[k:k + 2400] = lp(x[k:k + 2400], float(cut[k]))
    return np.tanh(1.6 * y) * env(d, .02, d * .6)
# 鼓
def kick(g=1.): t = T(.35); return np.sin(2 * np.pi * np.cumsum(48 * (1 + 3 * np.exp(-t / .025))) / SR) * np.exp(-t / .1) * g + .15 * hp(noise(.35), 3000) * np.exp(-t / .004)
def clap(): x = np.zeros(int(.25 * SR)); t = T(.25); [x.__setitem__(slice(int(o * SR), None), x[int(o * SR):] + bp(noise(.25 - o), 900, 5000) * np.exp(-T(.25 - o) / .012)) for o in (0, .011, .022)]; return x + .5 * bp(noise(.25), 900, 4000) * np.exp(-t / .07)
def hat(op=False): d = .25 if op else .05; return hp(noise(d), 7500) * np.exp(-T(d) / (.08 if op else .012))
def crash(d=2.): return hp(noise(d), 4500) * np.exp(-T(d) / .6) * .7
def snap(): return bp(noise(.06), 2000, 6000) * np.exp(-T(.06) / .008)
# 音效
def riser(d): t = T(d); return bp(noise(d), 600, 8000) * (t / d) ** 2 * .6 + osc(glide(200, 1600, d)) * (t / d) ** 3 * .25
def rev_cym(d=1.2): return crash(d)[::-1] * .8
def whoosh(d=.45): t = T(d); return bp(noise(d), 500, 4000) * np.sin(np.pi * t / d) ** 2
def sub_boom(): t = T(1.2); return np.sin(2 * np.pi * np.cumsum(38 * (1 + 1.5 * np.exp(-t / .08))) / SR) * np.exp(-t / .45)
def slide_whistle(f0, f1, d): t = T(d); return osc(glide(f0, f1, d) * (1 + .03 * np.sin(2 * np.pi * 7 * t))) * np.sin(np.pi * t / d) ** .5 * .5
def squeak(f=1300): t = T(.09); return osc(glide(f, f * 1.6, .09)) * np.sin(np.pi * t / .09) * .5
def boing(f=200, d=.55): t = T(d); return osc(f * (1 + .7 * np.exp(-t / .05)) * (1 + .08 * np.sin(2 * np.pi * 14 * t))) * np.exp(-t / (d * .4))
def pop(f=900): t = T(.07); return osc(glide(f, f * 2.2, .07)) * np.exp(-t / .02)
def bonk(): t = T(.25); return (osc(glide(420, 300, .25)) + .5 * osc(glide(1260, 900, .25))) * np.exp(-t / .05)
def key_click(): t = T(.035); return bp(noise(.035), 2500, 8000) * np.exp(-t / .004) + .3 * np.sin(2 * np.pi * 1800 * t) * np.exp(-t / .005)
def scratch(d=.45):
    t = T(d); rate = 1 + 1.6 * np.sin(2 * np.pi * 3.2 * t) ; x = bp(noise(d), 300, 3500); idx = np.clip(np.cumsum(np.abs(rate)), 0, len(x) - 1).astype(int)
    return x[idx] * np.sin(np.pi * t / d) * .9 + .3 * osc(300 * np.abs(rate) + 80) * np.sin(np.pi * t / d)
def sad_trombone(t0_notes=(58, 57, 56, 55)):
    out = []
    for i, m in enumerate(t0_notes):
        d = .42 if i < 3 else 1.1; t = T(d); f = mt(m) * (1 + (.02 * np.sin(2 * np.pi * 6 * t) * (t > .3) if i == 3 else 0))
        x = osc(f, 'saw'); wah = .5 + .5 * np.sin(2 * np.pi * (2.2 if i == 3 else 1.2) * t - np.pi / 2)
        y = np.zeros_like(x)
        for k in range(0, len(x), 1200): y[k:k + 1200] = lp(x[k:k + 1200], 350 + 1600 * float(wah[k]))
        out.append(np.tanh(1.5 * y) * np.minimum(1, t / .03) * np.minimum(1, (d - t) / .05))
    return np.concatenate(out)
def giggle(f=1400):
    parts = []
    for k in range(5): d = .07; t = T(d); parts += [osc(glide(f * (1 + .1 * k), f * 1.25, d) * (1 + .05 * np.sin(2 * np.pi * 40 * t))) * np.sin(np.pi * t / d), np.zeros(int(.04 * SR))]
    return np.concatenate(parts) * .4
def crickets(d):
    t = T(d); chirp = (np.sin(2 * np.pi * 30 * t) > .3) * ((t % .9) < .25); return np.sin(2 * np.pi * 4600 * t) * chirp * .12 * np.minimum(1, t / .3)
def bird():
    parts = []
    for k in range(rng.integers(2, 5)): d = rng.uniform(.05, .11); t = T(d); f0 = rng.uniform(2800, 4200); parts += [osc(glide(f0, f0 * rng.uniform(1.2, 1.6), d)) * np.sin(np.pi * t / d), np.zeros(int(rng.uniform(.03, .08) * SR))]
    return np.concatenate(parts) * .35
def snore(d=1.6): t = T(d); return lp(noise(d), 380) * np.sin(np.pi * t / d) ** 2 * .5 + .2 * np.sin(2 * np.pi * 70 * t) * np.sin(np.pi * t / d) ** 2
def tick(): t = T(.03); return bp(noise(.03), 3000, 9000) * np.exp(-t / .003) + .4 * np.sin(2 * np.pi * 2500 * t) * np.exp(-t / .004)
def sparkle(): return sum(np.pad(bell(mt(96 + k * 3), .5) * .3, (int(k * .04 * SR), int((4 - k) * .04 * SR))) for k in range(5))
def peel(): t = T(.35); return bp(noise(.35), 1500, 6000) * (t / .35) * np.exp(-t / .3) * .8

music = np.zeros((N, 2)); drums = np.zeros((N, 2)); sfx = np.zeros((N, 2)); send = np.zeros((N, 2))
def put(buf, sig, t, g=1., pan=0., rev=.2):
    i = int(t * SR)
    if i >= N or i < 0 or g == 0: return
    sig = np.asarray(sig)[:N - i] * g; l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    st = np.stack([sig * l, sig * r], 1) * 1.41; buf[i:i + len(sig)] += st
    if not (SONG and buf is not sfx): send[i:i + len(sig)] += st * rev

# ======================================================================= 配乐
CHORDS = [(53, 57, 60), (48, 52, 55), (50, 53, 57), (46, 50, 53)]          # F – C – Dm – B♭
HOOK = [72, None, 74, 77, None, 74, 72, None, 69, None, 72, 74, 72, None, None, None,      # 主旋律：两小节一句（八分音符）
        72, None, 74, 77, None, 79, 77, None, 74, None, 72, 69, 65, None, None, None]
BASS = [0, None, 0, 12, None, 0, 10, 12]                                     # 放克贝斯（相对根音）
E8 = P.BEAT / 2
for k in range(int(P.DUR / E8) + 1):
    t = k * E8; beat = k // 2; bar = beat // 4; ch = CHORDS[bar % 4]; s = P.section(t); hk = HOOK[k % 32]; off = k % 2
    if s == 'end': continue
    if s == 'intro':
        if k % 8 == 0: [put(music, epiano(mt(m + 12), 2.), t, .07, (i - 1) * .4, .5) for i, m in enumerate(ch)]
        if hk and t > 1.4 and k % 2 == 0: put(music, epiano(mt(hk), .6), t, .05, .2, .5)
        put(drums, hat(), t, .03 * min(1, t / 2) if off else .015, -.3, .05)
        continue
    if s == 'outro':
        if k % 8 == 0: [put(music, epiano(mt(m + 12), 2.4), t, .07, (i - 1) * .4, .6) for i, m in enumerate(ch)]
        if hk and k % 2 == 0: put(music, epiano(mt(hk), .9), t, .07, .15, .6)
        if k % 8 == 0: put(music, pad([mt(m) for m in ch], P.BEAT * 4), t, .05, 0, .5)
        continue
    if s == 'night':   # 八音盒摇篮曲（主旋律放慢一半）+ 长音
        if k % 2 == 0 and HOOK[(k // 2) % 32]: put(music, musicbox(mt(HOOK[(k // 2) % 32] + 12)), t, .07, .3 * np.sin(k), .6)
        if k % 8 == 0: put(music, pad([mt(m) for m in ch], P.BEAT * 4), t, .045, 0, .6)
        continue
    # 有鼓的段落
    hot = s in ('hype', 'tech'); soft = s == 'morning' and t < P11.HOPS[6][0]
    if not soft:
        if k % 2 == 0: put(drums, kick(1. if beat % 2 == 0 else .8), t, .5, 0, .03)
        if k % 4 == 2: put(drums, clap(), t, .2 if hot else .14, 0, .25)
        put(drums, hat(op=off == 1 and s in ('funk', 'hype')), t, (.06 if off else .035) * (1.3 if hot else 1), -.25, .08)
        if hot: put(drums, hat(), t + E8 / 2, .03, .25, .05)
    if s in ('funk', 'hype', 'glitch'):
        b = BASS[k % 8]
        if b is not None: put(music, slapbass(mt(ch[0] - 12 + b), E8 * .9), t, .16, 0, .03)
        if k % 4 in (1, 3) or (hot and k % 2): put(music, sum(supersaw(mt(m), E8 * .8, 2600) for m in ch) / 3, t, .09, .25 * (1 if k % 4 == 1 else -1), .3)
        if hk and (s != 'funk' or t > 6.4): put(music, lead(mt(hk), E8 * 1.6), t, .08, .1, .35)
        if s == 'hype': put(music, pluck(mt(ch[k % 3] + 24), .3), t + E8 / 2, .07, -.3 * (k % 2 * 2 - 1), .3)
    elif s == 'bili':   # 俏皮：拨弦低音 + 木琴主旋律 + 断奏和弦
        if k % 2 == 0: put(music, pluck(mt(ch[0] - 12 + (7 if k % 4 == 2 else 0)), .5), t, .2, 0, .1)
        if hk: put(music, marimba(mt(hk)), t, .12, .25, .3)
        if k % 4 == 1: put(music, sum(pluck(mt(m + 12), .25) for m in ch) / 3, t, .12, -.25, .3)
    elif s == 'morning':
        if k % 8 == 0: put(music, pad([mt(m + 12) for m in ch] + [mt(ch[0])], P.BEAT * 4), t, .06, 0, .5)
        if hk: put(music, bell(mt(hk + 12), .8), t, .05, .2, .5)
        if not soft and k % 2 == 0: put(music, pluck(mt(ch[0] - 12), .5), t, .15, 0, .1)
    elif s == 'tech':   # 电子：16 分音符琶音 + 贝斯 + 主旋律锯齿
        for j in range(2): put(music, supersaw(mt(ch[(k * 2 + j) % 3] + 24), E8 * .45, 3500) * .6, t + j * E8 / 2, .07, .3 * (j * 2 - 1), .25)
        put(music, slapbass(mt(ch[0] - 12 + (12 if off else 0)), E8 * .9), t, .14, 0, .03)
        if hk: put(music, lead(mt(hk), E8 * 1.6, shape='saw'), t, .06, -.1, .35)

# 段落交界的"炸点"：白光、每章标题、统计卡
for t in [P10.CUT] + [c['t'] for c in P10.CH] + [c['t'] for c in P11.CH] + [P11.STATS]:
    put(drums, crash(), t, .22, 0, .3); put(music, brass([mt(m + 12) for m in CHORDS[0]], .7), t, .1, 0, .4); put(drums, sub_boom(), t, .35, 0, .05)
put(music, riser(P10.CUT - 1.4), 1.2, .5, 0, .3)                                              # 暗场 → 白光：越来越紧
put(music, riser(P10.LIFT[-1] - P10.LIFT[0] + .4), P10.LIFT[0] - .2, .35, 0, .3)               # 电梯往上顶
put(music, riser(1.0), P11.PORTAL_OPEN[0], .4, 0, .3); put(music, rev_cym(1.2), P11.FLASH[0] - 1.2, .5, 0, .3)
for j, m in enumerate((53, 57, 60, 65, 69, 72)): put(music, epiano(mt(m + 12), 3.5), P.P11.ENDCARD + .04 * j, .08, (j - 2.5) / 3, .7)
if not SONG: put(sfx, sparkle(), P11.ENDCARD + .1, .4, 0, .6)

# 侧链：鼓点一下，音乐"让一下"（一呼一吸的律动）
sc = np.ones(N)
for k in range(int(P.DUR / P.BEAT) + 1):
    t = k * P.BEAT
    if P.section(t) in ('funk', 'hype', 'tech', 'bili'):
        i = int(t * SR); n = int(.22 * SR); sc[i:i + n] = np.minimum(sc[i:i + n], 1 - .55 * np.exp(-np.arange(min(n, N - i)) / SR / .07))
music *= sc[:, None]
# 停住 / 磁带停转
bed = music + drums
for a, z, how in P.STOPS:
    i, j = int(a * SR), int(z * SR)
    if how == 'tape':
        d = int(.55 * SR); seg = bed[i:i + int(.9 * SR)].copy(); rate = np.linspace(1, 0, d); pos = np.cumsum(rate).astype(int)
        bed[i:i + d] = seg[np.clip(pos, 0, len(seg) - 1)] * np.linspace(1, .2, d)[:, None]; bed[i + d:j] = 0
    else:
        f_ = int(.015 * SR); bed[i:i + f_] *= np.linspace(1, 0, f_)[:, None]; bed[i + f_:j] = 0
    send[i:j] *= .3
    f_ = int(.01 * SR); bed[j:j + f_] *= np.linspace(0, 1, f_)[:, None]

# ======================================================================= 音效（卡通化）
CLONE_NOTE = [65, 67, 69, 70, 72, 74, 76]
for t, kind in P.events():
    p = rng.uniform(-.3, .3)
    if kind == 'key': put(sfx, key_click(), t, .25, -.2, .05)
    elif kind == 'send': put(sfx, osc(glide(700, 1600, .1)) * np.exp(-T(.1) / .04), t, .3, .3)
    elif kind == 'pop': put(sfx, pop(), t, .35); put(sfx, bell(mt(84), .4), t, .06)
    elif kind == 'bubble': put(sfx, pop(1100), t, .22, .2)
    elif kind == 'peel': put(sfx, peel(), t, .5, -.1)
    elif kind == 'whoosh': put(sfx, whoosh(.5), t - .15, .3)
    elif kind == 'jump': put(sfx, slide_whistle(500, 1100, .22), t, .14, p, .1)
    elif kind == 'land': put(sfx, squeak(rng.uniform(1100, 1500)), t, .18, p, .05); put(sfx, kick(.5), t, .12, p, .05)
    elif kind == 'boing': put(sfx, boing(), t, .35)
    elif kind == 'kick': put(sfx, bonk(), t, .45); put(sfx, whoosh(.4), t + .02, .3)
    elif kind == 'thud': put(sfx, bonk(), t, .4); put(sfx, kick(.8), t, .3)
    elif kind == 'thud_big': put(sfx, sub_boom(), t, .5); put(sfx, kick(1.), t, .5); put(sfx, crash(1.2), t, .12)
    elif kind.startswith('lift') and kind != 'lift': i = int(kind[4:]); put(sfx, marimba(mt(72 + [0, 2, 4, 7, 12][i])), t, 0 if SONG else .3, 0, .3); put(sfx, pop(700 + 150 * i), t, .2)
    elif kind == 'confetti': put(sfx, sparkle(), t, 0 if SONG else .35, 0, .5); [put(sfx, pop(1400 + 200 * j), t + .04 * j, .08, rng.uniform(-.7, .7)) for j in range(8)]
    elif kind == 'rain': [put(sfx, pop(rng.uniform(600, 1400)), t + j * .05, .15, rng.uniform(-.6, .6)) for j in range(30)]
    elif kind == 'portal' and not SONG: put(sfx, bell(mt(79), 1.5), t, .15, 0, .6); put(sfx, bell(mt(86), 1.5), t + .06, .1, 0, .6)
    elif kind == 'flash': put(sfx, whoosh(.7), t, .45); put(sfx, crash(2.5), t + .3, .15)
    elif kind == 'chapter': put(sfx, bell(mt(84), 1.), t, 0 if SONG else .1, 0, .5)
    elif kind == 'slide':
        d = (P11.RIDE[1] - P11.RIDE[0]) if t > 30 else (P10.SLIDE_END - P10.SLIDE_LAND); put(sfx, slide_whistle(1500, 380, d), t, .3, 0, .2)
    elif kind == 'clone': i = min(6, int(round((t - P11.CLONES[0]) / .3))); put(sfx, pop(900), t, .2, -.4); put(sfx, marimba(mt(CLONE_NOTE[i] + 12)), t, 0 if SONG else .3, -.3 + .1 * i, .3)
    elif kind == 'chime': put(sfx, bell(mt(88), 1.), t, .14, .2, .5); put(sfx, bell(mt(93), 1.), t + .12, .12, .2, .5)
    elif kind == 'flip': [put(sfx, tick(), t + .5 * (1 - (j / 14) ** .6), .4, .2 * (-1) ** j) for j in range(14)]; put(sfx, bell(mt(91), 1.2), P11.FLIP[1], .2, 0, .5)
    elif kind == 'tiles': [put(sfx, pop(1300 + 40 * j), t + j * .1, .06, rng.uniform(-.4, .4)) for j in range(30)]
    elif kind == 'deflate': pass   # 用伤心长号代替（见下面）
# 剧情专属音效
put(sfx, scratch(), P11.Q_DROP[1] - .1, .55, 0, .1)                                            # 唱片刮擦：冷场
put(sfx, crickets(P11.THINK_IN - P11.Q_DROP[1] + .3), P11.Q_DROP[1] + .25, 1., .4, .2)
for r in P11.REACH: put(sfx, squeak(1000 + 200 * P11.REACH.index(r)), r - .25, .25, -.2, .05)     # 蹦起来去捂：越蹦越急
for j in range(6): put(sfx, giggle(rng.uniform(1200, 1900)), P11.LAUGH[0] + j * .25, .35, rng.uniform(-.7, .7), .2)   # 小鱼们笑
put(sfx, sad_trombone(), P11.SLUMP, 0 if SONG else .3, 0, .35)                                                  # 泄气
for j in range(7): put(sfx, bonk(), P11.PILE_ON[0] + .13 * j + .45, .2, rng.uniform(-.5, .5))  # 一个个扑上来
put(sfx, pop(600), P11.HOPS[4][0] - P11.HOPS[4][4]['air'], .5); put(sfx, boing(160, .7), P11.HOPS[4][0] - P11.HOPS[4][4]['air'], .35)   # 蹦出小鱼堆
put(sfx, crickets(P11.FLIP[0] - P11.NIGHT[1]), P11.NIGHT[1], .7, .5, .3)                         # 深夜蛐蛐
for k in range(2): put(sfx, snore(), P11.NOTE2 + 1.4 + k * 1.8, .25, -.1, .3)                    # 打呼
for j in range(7): put(sfx, bird(), P11.DAWN[0] + .8 + j * .55, .45, rng.uniform(-.8, .8), .4)   # 天亮鸟叫
put(sfx, giggle(1700), P11.SHY[0], .3, 0, .3); put(sfx, sparkle(), P11.HEARTS, 0 if SONG else .3, 0, .5)        # 被谢谢：害羞

# ======================================================================= 混音
n = int(1.2 * SR); tt = np.arange(n) / SR; ir = rng.standard_normal((n, 2)) * np.exp(-tt * 5.5)[:, None]; ir[:int(.015 * SR)] = 0
ir = sosfilt(butter(2, 6000, 'low', fs=SR, output='sos'), ir, axis=0); ir /= np.sqrt((ir ** 2).sum(0))
wet = np.stack([fftconvolve(send[:, c], ir[:, c])[:N] for c in range(2)], 1)
mix = bed + 1.25 * sfx + wet * .7
if SONG:   # 只要音效轨：固定增益，不做归一化（和歌混的时候再定音量）
    st_ = 1.25 * sfx + wet * .7; out = os.path.join(HERE, '..', 'build', 'v12_sfx.wav'); sf.write(out, np.clip(st_, -1, 1), SR); print(os.path.abspath(out)); sys.exit()
mix = np.tanh(1.3 * mix) / np.tanh(1.3); mix *= 10 ** (-1.0 / 20) / np.abs(mix).max()
fi = int(.01 * SR); mix[:fi] *= np.linspace(0, 1, fi)[:, None]; fo = int(.6 * SR); mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
out = os.path.join(HERE, '..', 'build', 'v12_audio.wav'); sf.write(out, mix, SR); print(os.path.abspath(out))
