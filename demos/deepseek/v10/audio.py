#!/usr/bin/env python3
"""v10 配乐 + 音效（128 BPM），事件全部读 plan.events()。→ build/v10_audio.wav
配乐：暗场只有轻轻的铃声 → 白光一闪进鼓（发布会感）→ 第 2 步更燃（加贝斯和军鼓）→ 结尾收住。"""
import os, sys, numpy as np, soundfile as sf
from scipy.signal import fftconvolve, butter, sosfilt
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import plan as P
SR = 48000; N = int(P.DUR * SR); rng = np.random.default_rng(8)
T = lambda d: np.arange(int(d * SR)) / SR
mt = lambda m: 440 * 2 ** ((m - 69) / 12)
def noise(d, lo, hi, dec):
    t = T(d); y = sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), rng.standard_normal(len(t))); return y * np.exp(-t / dec) / (np.abs(y).max() + 1e-9)
def chirp(f0, f1, d, g=1.):
    t = T(d); return np.sin(2 * np.pi * np.cumsum(np.geomspace(f0, f1, len(t))) / SR) * np.sin(np.pi * t / d) * g
def bell(f, d=1.):
    t = T(d); return np.sin(2 * np.pi * f * t + 1.4 * np.sin(2 * np.pi * f * 3.5 * t) * np.exp(-t / .1)) * np.exp(-t / (d * .3))
def marimba(f, d=.4): t = T(d); return np.sin(2 * np.pi * f * t) * np.exp(-t / .15) + .3 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / .03)
def kick(): t = T(.3); return np.sin(2 * np.pi * np.cumsum(50 * (1 + 2.5 * np.exp(-t / .03))) / SR) * np.exp(-t / .09)
def snare(): return noise(.18, 1500, 7000, .05) * .7 + noise(.18, 150, 300, .04) * .4
def hat(): return noise(.05, 7000, 14000, .012)
def bass(f, d): t = T(d); return np.tanh(2 * np.sin(2 * np.pi * f * t)) * np.exp(-t / (d * .6)) * np.minimum(1, t / .005)
def thud(f=100, g=1.):
    t = T(.2); return (np.sin(2 * np.pi * np.cumsum(f * (1 + .8 * np.exp(-t / .02))) / SR) * np.exp(-t / .06) + .3 * noise(.2, 500, 2500, .02)) * g
def key(): t = T(.04); return noise(.04, 2000, 7000, .005) + .4 * np.sin(2 * np.pi * 1700 * t) * np.exp(-t / .006)
def whoosh(d=.4): t = T(d); return noise(d, 400, 3500, 10) * np.sin(np.pi * t / d) ** 2
def boing(f=220, d=.5):
    t = T(d); f_ = f * (1 + .6 * np.exp(-t / .05)) * (1 + .05 * np.sin(2 * np.pi * 16 * t)); return np.sin(2 * np.pi * np.cumsum(f_) / SR) * np.exp(-t / (d * .4))
def peel(): t = T(.35); return noise(.35, 1500, 6000, 10) * (t / .35) * np.exp(-t / .3) * .8

music = np.zeros((N, 2)); sfx = np.zeros((N, 2)); send = np.zeros((N, 2))
def put(buf, sig, t, g=1., pan=0., rev=.2):
    i = int(t * SR)
    if i >= N: return
    sig = sig[:N - i] * g; l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    st = np.stack([sig * l, sig * r], 1) * 1.41; buf[i:i + len(sig)] += st; send[i:i + len(sig)] += st * rev

# ---------------- 配乐：F 大调 I–V–vi–IV，每小节一个和弦
CH = [(53, 57, 60), (48, 52, 55), (50, 53, 57), (46, 50, 53)]
MEL = [72, 74, 77, 74, 79, 77, 74, 72]
beat = P.BEAT
for k in range(int(P.DUR / beat)):
    t = k * beat; bar = k // 4; ch = CH[bar % 4]
    intro = t < P.CUT; hot = P.CH[1]['t'] <= t < P.REVEAL
    if intro:                                    # 开场：只有轻轻的铃声琶音
        put(music, bell(mt(ch[k % 3] + 24), .8), t, .05, .3 * (k % 2 * 2 - 1), .5); continue
    put(music, kick(), t, .45 if k % 2 == 0 else .25, 0, .05)
    if k % 4 in (1, 3): put(music, snare(), t, .22 if hot else .12, 0, .2)
    put(music, hat(), t + beat / 2, .08, -.3, .1)
    put(music, marimba(mt(MEL[k % 8])), t, .1, .25, .3); put(music, marimba(mt(MEL[(k + 3) % 8] - 12)), t + beat / 2, .06, -.25, .3)
    if hot or k % 2 == 0: put(music, bass(mt(ch[0] - 12), beat * .9), t, .14 if hot else .08, 0, .05)

# ---------------- 音效
for t, kind in P.events():
    p = rng.uniform(-.25, .25)
    if kind == 'key': put(sfx, key(), t, .25, -.2)
    elif kind == 'send': put(sfx, chirp(700, 1500, .09), t, .35, .3)
    elif kind == 'pop': put(sfx, chirp(500, 1200, .08), t, .4); put(sfx, bell(mt(84), .4), t, .08)
    elif kind == 'peel': put(sfx, peel(), t, .5, -.1)
    elif kind == 'whoosh': put(sfx, whoosh(.5), t - .15, .3)
    elif kind == 'boing': put(sfx, boing(240, .5), t, .4)
    elif kind == 'ripple': put(sfx, bell(mt(79), 1.2), t, .12, 0, .6); put(sfx, bell(mt(86), 1.2), t + .05, .08, 0, .6)
    elif kind == 'jump': put(sfx, chirp(500, 1100, .08), t, .1, p)
    elif kind == 'land': put(sfx, thud(110, .6), t, .5, p)
    elif kind == 'thud': put(sfx, thud(85, 1.), t, .7)
    elif kind == 'thud_big': put(sfx, thud(65, 1.), t, .9); put(sfx, whoosh(.3), t - .3, .25)
    elif kind == 'lift': put(sfx, chirp(400, 800, .12), t, .25); put(sfx, key(), t, .3)
    elif kind == 'slide':
        d = P.SLIDE_END - P.SLIDE_LAND; tt = T(d); put(sfx, np.sin(2 * np.pi * np.cumsum(np.linspace(900, 250, len(tt))) / SR) * .4 * np.minimum(1, tt / .1) + noise(d, 800, 4000, 10) * .3, t, .4)
    elif kind == 'chapter': put(sfx, bell(mt(84), 1.), t, .14, 0, .5); put(sfx, bell(mt(91), 1.), t + .1, .1, 0, .5)
    elif kind == 'portal': put(sfx, bell(mt(79), 1.2), t, .14, 0, .6); put(sfx, whoosh(.4), t, .2)
    elif kind == 'flash': put(sfx, whoosh(.6), t, .4); put(sfx, bell(mt(84), 2.), t + .3, .18, 0, .7); put(sfx, bell(mt(91), 2.), t + .35, .12, 0, .7)
    elif kind == 'kick': put(sfx, thud(140, .8), t, .6); put(sfx, whoosh(.4), t + .02, .35)
    elif kind == 'confetti': [put(sfx, chirp(1500 + 300 * j, 2500 + 300 * j, .06), t + .03 * j, .12, rng.uniform(-.6, .6)) for j in range(10)]
    elif kind == 'rain': [put(sfx, thud(180 + 10 * (j % 7), .3), t + j * .06, .25, rng.uniform(-.5, .5)) for j in range(24)]
    elif kind == 'bubble': put(sfx, chirp(600, 1300, .08), t, .25, .2)

n = int(1.0 * SR); tt = np.arange(n) / SR; ir = rng.standard_normal((n, 2)) * np.exp(-tt * 6.9)[:, None]; ir[:int(.012 * SR)] = 0
ir = sosfilt(butter(2, 5500, 'low', fs=SR, output='sos'), ir, axis=0); ir /= np.sqrt((ir ** 2).sum(0))
mix = music + 1.4 * sfx + np.stack([fftconvolve(send[:, c], ir[:, c])[:N] for c in range(2)], 1) * .8
mix = np.tanh(1.2 * mix) / np.tanh(1.2); mix *= 10 ** (-1.5 / 20) / np.abs(mix).max()
fade = np.ones(N); fade[-int(.4 * SR):] = np.linspace(1, 0, int(.4 * SR))
if not os.environ.get('NOFADE'): mix *= fade[:, None]   # NOFADE=1：接后 60 秒时不要淡出
out = os.path.join(HERE, '..', 'build', 'v10_audio.wav'); sf.write(out, mix, SR); print(out)
