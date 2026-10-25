#!/usr/bin/env python3
"""v5 两段测试的音效 + 简单铺底（时间点读 beats.py）→ build/v5_sfx.wav（30 秒长，只有 7–10、13–19 秒有声音）"""
import os, sys, numpy as np, soundfile as sf
from scipy.signal import fftconvolve, butter, sosfilt
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import beats as BT
SR = 48000; N = SR * 30; rng = np.random.default_rng(5)
T = lambda d: np.arange(int(d * SR)) / SR
mt = lambda m: 440 * 2 ** ((m - 69) / 12)
def noise(d, lo, hi, dec):
    t = T(d); y = sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), rng.standard_normal(len(t))); return y * np.exp(-t / dec) / (np.abs(y).max() + 1e-9)
def chirp(f0, f1, d, g=1.):
    t = T(d); return np.sin(2 * np.pi * np.cumsum(np.geomspace(f0, f1, len(t))) / SR) * np.sin(np.pi * t / d) * g
def thud(f=100, g=1.):
    t = T(.2); return (np.sin(2 * np.pi * np.cumsum(f * (1 + .8 * np.exp(-t / .02))) / SR) * np.exp(-t / .06) + .3 * noise(.2, 500, 2500, .02)) * g
def click(): return noise(.05, 3000, 9000, .004) + .6 * noise(.05, 300, 900, .01)
def boing(f=220, d=.5):   # 弹簧"嘣～"
    t = T(d); f_ = f * (1 + .5 * np.exp(-t / .05)) * (1 + .06 * np.sin(2 * np.pi * 18 * t))
    return np.sin(2 * np.pi * np.cumsum(f_) / SR) * np.exp(-t / (d * .4))
def whoosh(d=.4): t = T(d); return noise(d, 400, 3500, 10) * np.sin(np.pi * t / d) ** 2
def bell(f, d=1.):
    t = T(d); return np.sin(2 * np.pi * f * t + 1.5 * np.sin(2 * np.pi * f * 3.5 * t) * np.exp(-t / .1)) * np.exp(-t / (d * .3))
def slide(d):   # 滑行：越来越高的摩擦声
    t = T(d); y = sosfilt(butter(2, [800, 5000], 'band', fs=SR, output='sos'), rng.standard_normal(len(t)))
    return y / np.abs(y).max() * (t / d) ** 1.5 * .6 + .3 * np.sin(2 * np.pi * np.cumsum(np.linspace(300, 900, len(t))) / SR) * (t / d)
def skid(d=.45):  # 急停"吱——"
    t = T(d); f = np.linspace(1800, 1100, len(t)); y = np.sin(2 * np.pi * np.cumsum(f * (1 + .02 * np.sin(2 * np.pi * 40 * t))) / SR)
    return (y * .5 + .4 * noise(d, 2000, 6000, 10)) * np.exp(-t / (d * .6))
def key(): t = T(.04); return noise(.04, 2000, 7000, .005) + .4 * np.sin(2 * np.pi * 1700 * t) * np.exp(-t / .006)
def dizzy(d=.6):  # 晕："啾啾啾"小鸟
    out = np.zeros(int(d * SR))
    for i in range(4):
        s = chirp(2200, 3200, .08, .5); j = int(i * .14 * SR); out[j:j + len(s)] += s[:len(out) - j]
    return out

dry = np.zeros((N, 2)); send = np.zeros((N, 2))
def put(sig, t, g=1., pan=0., rev=.2):
    i = int(t * SR); sig = sig[:max(0, N - i)] * g; l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    st = np.stack([sig * l, sig * r], 1) * 1.41; dry[i:i + len(sig)] += st; send[i:i + len(sig)] += st * rev

B, E = BT.B, BT.E
# ---- 段 B
put(whoosh(.25), B['t0'], .25, .5)                               # 光标飞进来
for i, (c, h) in enumerate(zip(B['clicks'], B['heights'])):
    put(click(), c, .8, .2); put(boing(200 + 60 * i, .4 + .1 * i), c + .01, .45, 0)
    if i < 3:
        air = 2 * np.sqrt(2 * 9.8 * h) / 9.8; put(thud(130, .6), c + air, .7); put(dizzy(), c + air + .05, .12 * (i + 1), .3)
put(whoosh(.6), B['clicks'][-1] + .1, .3)
put(bell(mt(76), .5), B['busy'], .2); put(bell(mt(71), .5), B['busy'] + .08, .2)   # 弹窗"叮咚"
put(thud(70, 1.), B['splat'], 1.0); put(noise(.3, 300, 1500, .08), B['splat'], .5)
for tw in B['twitch']: put(chirp(600, 400, .06, .3), tw, 1.)
# ---- 段 E
s0, s1 = E['slide']; put(slide(s1 - s0), s0, .45, .4)
put(thud(150, .5), s1, .6); put(chirp(500, 1300, .1), E['hop_off'], .15)
put(thud(110, .6), E['land'], .7); put(skid(E['skid_stop'] - E['land'] + .1), E['land'], .35, -.2)
put(whoosh(.3), E['q_drop'][0], .3); put(thud(65, 1.), E['q_drop'][1], .9)
put(bell(mt(84), .6), E['think_in'], .15, -.3)
a, b = E['think_type']
for k in range(int((b - a) / .09)): put(key(), a + k * .09 + rng.uniform(0, .02), .12, -.3)
for r in E['reach']: put(chirp(500, 1000, .08, .5), r, .4, -.1)
put(chirp(700, 1500, .09), E['reply'], .3, .4)
put(chirp(1200, 500, .25, .5), E['look'], .4)                    # 僵住"呃——"

# ---- 简单铺底：120 BPM 的木琴+轻鼓，只在两段里
def marimba(f, d=.4): t = T(d); return np.sin(2 * np.pi * f * t) * np.exp(-t / .15) + .3 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / .03)
def kick(): t = T(.3); return np.sin(2 * np.pi * np.cumsum(50 * (1 + 2.5 * np.exp(-t / .03))) / SR) * np.exp(-t / .09)
mel = [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 79, 76, 74, 72]
for (a, b) in ((B['t0'], B['t1']), (E['t0'], E['t1'])):
    k = 0; t = a
    while t < b - .01:
        put(marimba(mt(mel[k % 16])), t, .1, .2 * ((k % 2) * 2 - 1), .3)
        if k % 2 == 0: put(kick(), t, .25, 0, .05)
        t += .25; k += 1

n = int(1.0 * SR); t = np.arange(n) / SR; ir = rng.standard_normal((n, 2)) * np.exp(-t * 6.9)[:, None]; ir[:int(.012 * SR)] = 0
ir = sosfilt(butter(2, 5500, 'low', fs=SR, output='sos'), ir, axis=0); ir /= np.sqrt((ir ** 2).sum(0))
mix = dry + np.stack([fftconvolve(send[:, c], ir[:, c])[:N] for c in range(2)], 1) * .8
mix = np.tanh(1.2 * mix) / np.tanh(1.2); mix *= 10 ** (-1.5 / 20) / np.abs(mix).max()
out = os.path.join(HERE, '..', 'build', 'v5_sfx.wav'); sf.write(out, mix, SR); print(out)
