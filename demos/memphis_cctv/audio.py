#!/usr/bin/env python3
"""《东三环 · 央视大楼》配乐 + 环境声（15 秒）→ build/audio.wav
- 配乐：C 大调五声音阶（do re mi sol la）的轻旋律，木琴 + 钢片琴，拨弦低音，柔和长音铺底，96 BPM；
- 环境声：城市低频嗡嗡声、远处车流、偶尔的小鸟；
- 音效卡点读 build/events.json（node events.cjs 生成）：鸟群飞过、钻过立交桥、每辆车从旁边经过、明黄公交驶过、落叶被卷起 / 落地。"""
import os, json, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve
HERE = os.path.dirname(os.path.abspath(__file__))
SR, DUR = 48000, 15.0; N = int(SR * DUR); rng = np.random.default_rng(15)
T = lambda d: np.arange(int(d * SR)) / SR
mt = lambda m: 440 * 2 ** ((m - 69) / 12)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f): return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
def noise(d): return rng.standard_normal(int(d * SR))
music = np.zeros((N, 2)); amb = np.zeros((N, 2)); sfx = np.zeros((N, 2)); send = np.zeros((N, 2))
def put(buf, sig, t, g=1., pan=0., rev=.25):
    i = int(t * SR)
    if i >= N or i < 0: return
    sig = np.asarray(sig)[:N - i] * g; l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    st = np.stack([sig * l, sig * r], 1) * 1.41; buf[i:i + len(sig)] += st; send[i:i + len(sig)] += st * rev
# 乐器
def marimba(f, d=.6): t = T(d); return np.sin(2 * np.pi * f * t) * np.exp(-t / .2) + .25 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / .03)
def celesta(f, d=1.2): t = T(d); return (np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / .15)) * np.exp(-t / .45) * np.minimum(1, t / .003)
def pluck(f, d=.7): t = T(d); return lp(2 * ((f * t) % 1) - 1, 900) * np.exp(-t / .22) * np.minimum(1, t / .004)
def pad(fs, d): t = T(d); return sum(np.sin(2 * np.pi * f * (1 + k) * t) for f in fs for k in (-.002, .002)) / (2 * len(fs)) * np.minimum(1, t / .8) * np.minimum(1, (d - t) / .8)
def chirp(f0, f1, d): t = T(d); return np.sin(2 * np.pi * np.cumsum(np.geomspace(f0, f1, len(t))) / SR) * np.sin(np.pi * t / d)
def whoosh(d, lo=300, hi=3000): t = T(d); return bp(noise(d), lo, hi) * np.sin(np.pi * t / d) ** 2

# ---------------- 配乐：96 BPM，C 大调五声音阶
BPM = 96; B = 60 / BPM; PENTA = [60, 62, 64, 67, 69, 72, 74, 76, 79]
CH = [(48, 55, 64), (45, 52, 60), (41, 48, 57), (43, 50, 59)]                 # C – Am – F – G（只用五声音阶里的音做旋律）
MEL = [4, 5, 7, 5, 4, 2, 3, None, 4, 5, 7, 8, 7, 5, 4, None, 2, 3, 4, 5, 4, 3, 2, None, 3, 4, 5, 7, 5, 4, 5, None]   # 八分音符，PENTA 的序号
E = B / 2
for k in range(int(DUR / E) + 1):
    t = k * E; bar = int(t / (4 * B)); ch = CH[bar % 4]
    if k % 8 == 0: put(music, pad([mt(m) for m in ch], 4 * B), t, .05, 0, .5)
    if k % 2 == 0: put(music, pluck(mt(ch[0] - 12 + (7 if k % 4 == 2 else 0))), t, .12, 0, .1)
    m = MEL[k % 32]
    if m is not None and t > .4: put(music, marimba(mt(PENTA[m])), t, .11, .2 * np.sin(k), .3)
    if k % 4 == 3 and t > 3.5: put(music, celesta(mt(PENTA[(m or 4) % len(PENTA)] + 12)), t, .035, -.3, .5)
music[-int(1.2 * SR):] *= np.linspace(1, 0, int(1.2 * SR))[:, None]
fi = int(.6 * SR); music[:fi] *= np.linspace(0, 1, fi)[:, None]

# ---------------- 环境声：城市低频嗡嗡 + 远处车流（一直在）
hum = lp(noise(DUR), 220) * .5 + bp(noise(DUR), 400, 1600) * .12
for c in range(2): amb[:, c] += np.roll(hum, c * 900)[:N] * .06
for t0 in np.arange(.5, DUR, 2.3): put(amb, whoosh(2.2, 200, 1200), t0 + rng.uniform(0, .6), .05, rng.uniform(-.8, .8), .4)

# ---------------- 音效卡点
ev = json.load(open(os.path.join(HERE, 'build/events.json')))
for e in ev:
    t, k = e['t'], e['kind']
    if k == 'birds':   # 鸟群从右往左飞过：叽叽喳喳，声像从右移到左
        for j in range(14): tt = t + j * e['d'] / 14; put(sfx, chirp(rng.uniform(2800, 4200), rng.uniform(3500, 5200), rng.uniform(.06, .12)), tt, .12, .8 - 1.6 * j / 14, .4)
    elif k == 'oncoming': put(sfx, whoosh(.9, 250, 2600), t - .45, .28, max(-1, e['pan'] - .3), .15)
    elif k == 'overtake': put(sfx, whoosh(1.2, 200, 1800), t - .6, .18, e['pan'], .15)
    elif k == 'bridge':    # 钻过立交桥：声音一下变闷、带回声
        d = 1.4; tt = T(d); put(sfx, lp(noise(d), 500) * np.sin(np.pi * tt / d) ** 2, t - .5, .22, 0, .9)
        put(sfx, whoosh(.8, 400, 2500), t - .2, .15, 0, .9)
    elif k == 'bus':       # 明黄公交：发动机低吼由远及近 + 驶过的呼啸 + 一声轻快的"叭"
        d = 3.4; tt = T(d); eng = np.sin(2 * np.pi * np.cumsum(55 + 25 * np.sin(np.pi * tt / d)) / SR); eng = np.tanh(2 * eng) * np.exp(-((tt - 1.6) / .9) ** 2)
        put(sfx, lp(eng, 400), t - 1.6, .35, .6, .1); put(sfx, whoosh(1.4, 200, 3000), t - .7, .35, .7, .2)
        horn = np.sin(2 * np.pi * 440 * T(.22)) + .5 * np.sin(2 * np.pi * 554 * T(.22)); put(sfx, lp(np.tanh(2 * horn), 2500) * np.sin(np.pi * T(.22) / .22), t + .9, .08, .5, .4)
    elif k == 'leaf_up':   # 落叶被卷起：一阵小风 + 树叶沙沙 + 轻轻上扬的风铃
        put(sfx, whoosh(1.0, 800, 6000), t - .2, .2, .3, .4)
        for j in range(10): put(sfx, bp(noise(.05), 3000, 8000) * np.exp(-T(.05) / .015), t + .1 + j * .2 + rng.uniform(0, .08), .1, rng.uniform(-.3, .5), .3)
        for j, m in enumerate((72, 74, 76, 79, 81)): put(sfx, celesta(mt(m + 12), .8), t + .15 + j * .08, .05, .2, .6)
    elif k == 'leaf_land': put(sfx, bp(noise(.08), 1500, 6000) * np.exp(-T(.08) / .02), t, .25, .6, .3); put(sfx, marimba(mt(84), .5), t, .06, .6, .4)

n = int(1.0 * SR); tt = np.arange(n) / SR; ir = rng.standard_normal((n, 2)) * np.exp(-tt * 6)[:, None]; ir[:int(.012 * SR)] = 0
ir = sosfilt(butter(2, 6000, 'low', fs=SR, output='sos'), ir, axis=0); ir /= np.sqrt((ir ** 2).sum(0))
wet = np.stack([fftconvolve(send[:, c], ir[:, c])[:N] for c in range(2)], 1)
mix = music + amb + sfx * 1.1 + wet * .6
mix = np.tanh(1.2 * mix) / np.tanh(1.2); mix *= 10 ** (-1.5 / 20) / np.abs(mix).max()
fo = int(.5 * SR); mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
out = os.path.join(HERE, 'build/audio.wav'); sf.write(out, mix, SR); print(out)
