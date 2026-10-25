#!/usr/bin/env python3
"""《大肥鱼》配乐 + 音效，全部用代码合成；音效时间点直接读 timeline.py（和画面同一份数据）。
python3 demos/deepseek/score.py  → build/score.wav（配乐+音效）、build/sfx_only.wav（只有音效，配平台热门音乐用）
120 BPM：0.5–11 俏皮 → 11 秒停半拍只留"叮" → 11.5–20 继续 → 20–23.5 下行（被清除）→ 24 起温暖钢琴"""
import os, sys, numpy as np, soundfile as sf
from scipy.signal import fftconvolve, butter, sosfilt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import timeline as TL

SR = 48000; DUR = TL.DUR; N = int(SR * DUR); BEAT = 60 / TL.BPM
rng = np.random.default_rng(3)
HERE = os.path.dirname(os.path.abspath(__file__))
mt = lambda m: 440 * 2 ** ((m - 69) / 12)   # MIDI → Hz
def T(n): return np.arange(int(n * SR)) / SR

# ---------------- 乐器
def bell(f, dur=1.2, g=1.):          # 钢片琴：FM 铃声
    t = T(dur); mod = np.sin(2 * np.pi * f * 3.5 * t) * 1.6 * np.exp(-t / .12)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t / (dur * .3)) * np.minimum(1, t / .002) * g
def marimba(f, dur=.5, g=1.):
    t = T(dur); y = np.sin(2 * np.pi * f * t) * np.exp(-t / .16) + .35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / .03)
    return y * np.minimum(1, t / .001) * g
def piano(f, dur=2.5, g=1.):
    t = T(dur); y = sum(a * np.sin(2 * np.pi * f * k * t * (1 + .0004 * k * k)) * np.exp(-t * (1.1 + .9 * k) / dur * 2)
                        for k, a in ((1, 1), (2, .5), (3, .25), (4, .12), (5, .06)))
    return y * np.minimum(1, t / .004) * g
def pad(fs, dur, g=1.):
    t = T(dur); y = sum(np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 1.003 * t) for f in fs)
    return y * np.sin(np.pi * t / dur) ** 1.5 * g / len(fs)
def kick(g=1.):
    t = T(.3); ph = 2 * np.pi * np.cumsum(50 * (1 + 2.5 * np.exp(-t / .03))) / SR
    return np.sin(ph) * np.exp(-t / .09) * g
def noise(dur, lo, hi, dec):
    t = T(dur); y = sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), rng.standard_normal(len(t)))
    return y * np.exp(-t / dec) / (np.abs(y).max() + 1e-9)
def hat(g=1.): return noise(.06, 6000, 14000, .012) * g
def snap(g=1.): return noise(.12, 1200, 5000, .03) * g

# ---------------- 音效
def thud(g=1., f=110):   # 软"咚"
    t = T(.18); ph = 2 * np.pi * np.cumsum(f * (1 + .8 * np.exp(-t / .02))) / SR
    return (np.sin(ph) * np.exp(-t / .05) + .3 * noise(.18, 600, 2500, .015)) * g
def chirp(f0, f1, dur, g=1.):
    t = T(dur); ph = 2 * np.pi * np.cumsum(np.geomspace(f0, f1, len(t))) / SR
    return np.sin(ph) * np.sin(np.pi * t / dur) * g
def key(g=1.):   # 塑料按键"嗒"
    t = T(.05); return (noise(.05, 2000, 7000, .006) + .5 * np.sin(2 * np.pi * 1800 * t) * np.exp(-t / .008)) * g
def pop(g=1., f=700): return chirp(f, f * 2.2, .09, g)
def whoosh(dur=.4, g=1.):
    t = T(dur); y = noise(dur, 500, 4000, 10) * np.sin(np.pi * t / dur) ** 2; return y * g
def oops(g=1.):          # 出糗的"嘟——"（下滑的方波）
    t = T(.9); f = np.linspace(330, 196, len(t)); ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.tanh(3 * np.sin(ph)) * (1 + .3 * np.sin(2 * np.pi * 6 * t)) * np.minimum(1, t / .02) * np.exp(-t / .6)
    return sosfilt(butter(2, 2200, 'low', fs=SR, output='sos'), y) * g
def click(g=1.): return (noise(.05, 3000, 9000, .004) + noise(.05, 300, 900, .01) * .6) * g

# ---------------- 混音台：干声 + 送混响（同一个房间）
music = np.zeros((N, 2)); sfx = np.zeros((N, 2)); sends = {'m': np.zeros((N, 2)), 's': np.zeros((N, 2))}
def place(buf, sig, t, g=1., pan=0., rev=.2, bus='s'):
    i = int(round(t * SR))
    if i >= N or i + len(sig) <= 0: return
    if i < 0: sig = sig[-i:]; i = 0
    sig = sig[:N - i] * g; l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    st = np.stack([sig * l, sig * r], 1) * 1.41; buf[i:i + len(sig)] += st; sends[bus][i:i + len(sig)] += st * rev
M = lambda sig, t, g=1., pan=0., rev=.25: place(music, sig, t, g, pan, rev, 'm')
S = lambda sig, t, g=1., pan=0., rev=.18: place(sfx, sig, t, g, pan, rev, 's')

# ---------------- 配乐
SILENT = (11.0, 11.5)
CH = {'C': (60, 64, 67), 'Am': (57, 60, 64), 'F': (53, 57, 60), 'G': (55, 59, 62), 'Em': (52, 55, 59), 'E': (52, 56, 59), 'Dm': (50, 53, 57)}
PLAY = ['C', 'Am', 'F', 'G']                         # 每小节 2 秒
MEL = [0, 2, 4, 7, 9, 7, 4, 2, 4, 7, 9, 12, 9, 7, 4, 7]   # 五声音阶的小动机（八分音符）
def bar_chord(t, prog): return prog[int(t // (4 * BEAT)) % len(prog)]
b = 0.5
while b < 20.0 - 1e-6:                                # 俏皮段
    k = round((b - .5) / BEAT)
    if not (SILENT[0] - .01 <= b < SILENT[1]):
        ch = CH[bar_chord(b - .5, PLAY)]
        if k % 2 == 0: M(kick(), b, .55)
        else: M(snap(), b, .18, .2)
        M(hat(), b + BEAT / 2, .12, -.3)
        M(marimba(mt(ch[0] - 12), .45), b, .35, -.1)
        for j in range(2):                            # 八分音符旋律（打字那段更密）
            tt = b + j * BEAT / 2
            if SILENT[0] <= tt < SILENT[1]: continue
            step = MEL[(2 * k + j) % len(MEL)]
            note = 72 + step                          # C 大调五声音阶，和四个和弦都不冲突
            M(bell(mt(note), .7), tt, .12 if not 13 <= tt < 15 else .16, .25 * (1 if j else -1))
        if k % 4 == 0: M(pad([mt(x) for x in ch], 2.0), b, .05)
    b += BEAT
M(bell(mt(96), 1.6), SILENT[0], .28, 0, .6)          # 停顿里的那声"叮"
b = 20.0                                              # 被清除：低音下行，变小调
for i, root in enumerate([57, 55, 53, 52, 50, 48, 47]):
    t = 20.0 + i * BEAT
    M(marimba(mt(root - 12), .5), t, .4); M(marimba(mt(root), .4), t + BEAT / 2, .15, .3)
    if i % 2 == 0: M(kick(), t, .35)
M(pad([mt(x) for x in CH['Dm']], 3.4), 20.0, .05)
WARM = [(24.0, 'F'), (25.0, 'G'), (26.0, 'Em'), (27.0, 'Am'), (27.75, 'F'), (28.5, 'G'), (29.25, 'C')]
for t, c in WARM:                                     # 温暖钢琴
    ch = CH[c]
    M(piano(mt(ch[0] - 12), 3.0), t, .14, -.1, .45)
    for j, n in enumerate(ch): M(piano(mt(n), 2.6), t + .03 * j, .08, .15 * (j - 1), .45)
M(pad([mt(x) for x in CH['F']] + [mt(72)], 6.0), 24.0, .07)
for i, n in enumerate([72, 76, 79, 77, 76, 74, 72]):   # 一条很简单的高音旋律
    M(piano(mt(n), 1.6), 24.5 + i * .75, .07, .3, .5)
M(bell(mt(84), 2.0), 29.25, .1, 0, .6)
vinyl = noise(DUR, 800, 6000, 1e9) * .004 * np.clip((np.arange(N) / SR - 23.5) / 1.0, 0, 1)
music += np.stack([vinyl, vinyl], 1)

# ---------------- 音效（读时间轴）
for t, kind, x in TL.sfx_events():
    p = rng.uniform(-.25, .25)
    if kind == 'jump': S(chirp(500, 1100 + 1500 * min(x, .4), .09), t, .08, p)
    elif kind == 'land_big': S(thud(1, 80), t, .9); S(whoosh(.5), t - .5, .25)
    elif kind == 'land_soft': S(thud(.6, 110 * 2 ** rng.uniform(-.15, .15)), t, .5, p)
    elif kind == 'land_key': S(key(), t, .5, p); S(thud(.3, 150), t, .3, p)
    elif kind == 'land_send': S(pop(1, 650), t, .45); S(thud(.5), t, .4)
    elif kind == 'land_shock': S(chirp(900, 1800, .12), t - .1, .25); S(thud(.5), t, .4)
    elif kind == 'land_stomp': S(thud(1, 90), t, .7, p); S(key(), t, .3)
    elif kind == 'counter': S(click(), t + .03, .5); S(bell(mt(88), .3), t + .05, .12)
    elif kind == 'drop': S(whoosh(.4), t - .4, .3); S(thud(1, 70), t, .8)
    elif kind == 'oops': S(oops(), t, .35)
    elif kind == 'toggle': S(click(), t, .7)
    elif kind == 'vanish': S(whoosh(.18), t, .3, -.4 + .15 * x); S(pop(.5, 1200 - 80 * x), t + .1, .15)
    elif kind == 'type_soft': S(key(.6), t, .3, p)
    elif kind == 'chime': S(bell(mt(84), 1.2), t, .15); S(bell(mt(91), 1.2), t + .08, .1)
    elif kind == 'pop': S(pop(1, 900), t, .3)

# ---------------- 房间混响（一份合成脉冲响应），母带
n = int(1.2 * SR); t = np.arange(n) / SR
ir = rng.standard_normal((n, 2)) * np.exp(-t * 6.9 / 1.0)[:, None]; ir[:int(.012 * SR)] = 0
for d, g in ((.017, .5), (.029, .35), (.041, .25)): ir[int(d * SR)] += g
ir = sosfilt(butter(2, 5500, 'low', fs=SR, output='sos'), ir, axis=0); ir /= np.sqrt((ir ** 2).sum(0))   # 能量归一
def wet(x): return np.stack([fftconvolve(x[:, c], ir[:, c])[:N] for c in range(2)], 1) * .8
def master(x, db=-1.5):
    x = np.tanh(1.2 * x) / np.tanh(1.2); x *= 10 ** (db / 20) / (np.abs(x).max() + 1e-9)
    fade = np.ones(N); fade[-int(.3 * SR):] = np.linspace(1, 0, int(.3 * SR)); return x * fade[:, None]
ws, wm = wet(sends['s']), wet(sends['m'])
os.makedirs(os.path.join(HERE, 'build'), exist_ok=True)
sf.write(os.path.join(HERE, 'build/score.wav'), master(music + wm + 1.6 * (sfx + ws)), SR)
sf.write(os.path.join(HERE, 'build/sfx_only.wav'), master(sfx + ws), SR)
print('ok → build/score.wav, build/sfx_only.wav')
