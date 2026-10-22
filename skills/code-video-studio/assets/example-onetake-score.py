# 「一句话 · 一条片」音效：合成拟音放进同一个房间（一份混响），按画面事件摆放
import numpy as np, soundfile as sf, subprocess, os
SR = 48000; DUR = 15.0; N = int(SR * DUR)
rng = np.random.default_rng(7)
dry = np.zeros((N, 2)); send = np.zeros((N, 2))
def env(n, a=.002, d=.2):
    t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-t / d)
def place(sig, t, gain=1., pan=0., rev=.25):
    i = int(t * SR); sig = sig[:max(0, N - i)] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    st = np.stack([sig * l, sig * r], 1) * 1.41
    dry[i:i + len(sig)] += st; send[i:i + len(sig)] += st * rev
def bp(x, f, q):   # 简单二阶带通（逐样本，频率可滑动）
    y = np.zeros_like(x); f = np.broadcast_to(f, x.shape); z1 = z2 = 0.
    for n in range(len(x)):
        w = 2 * np.pi * f[n] / SR; al = np.sin(w) / (2 * q); b0 = al; a0 = 1 + al; a1 = -2 * np.cos(w); a2 = 1 - al
        v = (b0 * x[n] - a1 * z1 - a2 * z2) / a0; y[n] = v - (z2 * 0); z2 = z1; z1 = v
    return y - np.concatenate([[0, 0], y[:-2]]) * 1.0
def air(dur, f0, f1, q=1.2):
    n = int(dur * SR); x = rng.standard_normal(n); f = np.geomspace(f0, f1, n)
    y = bp(x, f, q); return y / (np.abs(y).max() + 1e-9) * np.sin(np.pi * np.arange(n) / n) ** 1.5
def glass(f, dur=.6, bright=1.):
    n = int(dur * SR); t = np.arange(n) / SR
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / (dur * .45)) + .4 * bright * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / (dur * .2)) + .2 * bright * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / (dur * .1))
    y[:200] += rng.standard_normal(200) * .3 * np.linspace(1, 0, 200); return y * np.minimum(1, t / .001) * .5
def wood(f=180, dur=.08):
    n = int(dur * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (f * t - 30 * t * t * f / 180)) * np.exp(-t / .025)
    snap = bp(rng.standard_normal(n), 3200, 2.) * np.exp(-t / .006)
    return (body * .7 + snap * .6) * .6
def sub(f=55, dur=.9, drive=2.):
    n = int(dur * SR); t = np.arange(n) / SR; ph = 2 * np.pi * np.cumsum(f * (1 + 1.5 * np.exp(-t / .04))) / SR
    y = np.tanh(drive * np.sin(ph) * np.exp(-t / (dur * .35))); y[:400] += rng.standard_normal(400) * .5 * np.linspace(1, 0, 400); return y * .8
def bubble(f=600, dur=.12):
    n = int(dur * SR); t = np.arange(n) / SR; ph = 2 * np.pi * np.cumsum(f * (1 + 1.2 * t / dur)) / SR
    return np.sin(ph) * np.exp(-t / (dur * .3)) * np.minimum(1, t / .002) * .6
px = lambda x: np.clip(x / 540 * .6, -.6, .6)

# ---------- 事件（和 film.js 的时间一致）
TEXT = '把《老板画饼》做成纸雕MV'
TYPE_T = [1.95 + i * .078 + (.05 if i % 4 == 3 else 0) + (.06 if i > 7 else 0) for i in range(len(TEXT))]
place(air(.5, 300, 2200, 1.5), 1.15, .35, 0, .5); place(bubble(420, .16), 1.32, .5)
for i, t in enumerate(TYPE_T): place(wood(170 + rng.uniform(-25, 25), .07), t, rng.uniform(.35, .6), -.1 + i * .02, .15)
place(wood(150), 3.1, .8, .3, .15); place(wood(200), 3.16, .6, .3, .15); place(glass(1320, .7), 3.18, .35, .3, .35)
place(air(.45, 2400, 500, 1.8), 3.32, .5, 0, .4); place(sub(62, .7, 1.6), 3.74, .55, 0, .3)
place(air(.3, 800, 4000, 2.5), 3.78, .18, -.3, .3)
CH = [(3.98, -330), (4.12, -20), (4.24, 300), (4.52, -330), (4.63, -30), (4.74, 260)]
SC = [659, 784, 880, 988, 1175, 1319]
for (t, x), f in zip(CH, SC): place(bubble(f * .5, .12), t + .07, .55, px(x), .3); place(glass(f, .35, .4), t + .07, .12, px(x), .4)
place(glass(1568, .6), 5.06, .3, 0, .45)
place(air(.7, 400, 1800, 1.2), 5.55, .35, 0, .5); place(air(.5, 1500, 600, 1.4), 5.95, .25, -.5, .5); place(air(.5, 1500, 600, 1.4), 5.97, .25, .5, .5)
place(wood(150), 6.9, .8, 0, .15); place(wood(200), 6.96, .6, 0, .15); place(glass(1047, .9), 6.97, .3, 0, .4); place(glass(1568, .9), 6.97, .18, 0, .4)
place(air(.4, 1800, 400, 1.6), 7.02, .35, -.6, .4); place(air(.4, 1800, 400, 1.6), 7.04, .35, .6, .4)
place(air(.8, 200, 900, 1.0), 7.05, .4, 0, .45); place(sub(48, .6, 1.2), 7.85, .4, 0, .3)
for i in range(8): place(glass(880 * 2 ** (i / 12 * 2), .25, .3), 7.95 + i * .11, .16, -.3 + (i % 2) * .6, .3)
place(air(.6, 600, 3000, 1.3), 8.95, .35, 0, .5); place(air(1.0, 150, 700, .9), 9.35, .35, 0, .6)
for i, t in enumerate([11.45, 11.85, 12.25]): place(sub(52 if i < 2 else 44, .8 if i < 2 else 1.4, 2.5), t, .75 if i < 2 else 1., 0, .35 if i < 2 else .55); place(air(.08, 3000, 1500, 1.), t, .4, 0, .2)
place(air(.8, 3000, 300, 1.4), 12.95, .45, 0, .55); place(bubble(500, .14), 13.74, .55, 0, .4)
place(glass(988, .4, .6), 13.86, .25, 0, .4)
for f in [523, 659, 784, 1047]: place(glass(f, 1.8, .5), 14.24, .2, 0, .6)

# ---------- 房间：一份合成脉冲响应（T60≈1.1 s，12 ms 预延迟，3 个早期反射）
n = int(1.4 * SR); t = np.arange(n) / SR
ir = rng.standard_normal((n, 2)) * np.exp(-t * 6.9 / 1.1)[:, None]
ir[:int(.012 * SR)] = 0
for d, g in [(.017, .5), (.029, .35), (.041, .25)]: ir[int(d * SR)] += g
from scipy.signal import fftconvolve, butter, sosfilt
ir = sosfilt(butter(2, 5000, 'low', fs=SR, output='sos'), ir, axis=0)
wet = np.stack([fftconvolve(send[:, c], ir[:, c])[:N] for c in range(2)], 1) * .35
mix = dry + wet

# 铺底：很轻的和弦垫（0–9 s），9 s 起换成真实成片的歌（那几秒画面就是它）
pad = np.zeros(N); tt = np.arange(N) / SR
for f in [130.81, 196.0, 246.94, 329.63]: pad += np.sin(2 * np.pi * f * tt + rng.uniform(0, 6)) * (1 + .3 * np.sin(2 * np.pi * .2 * tt))
pad *= np.clip(tt / 1.5, 0, 1) * np.clip((9.2 - tt) / .6, 0, 1) * .025
mix += pad[:, None]
here = os.path.dirname(os.path.abspath(__file__))
song = os.path.join(here, 'song_seg.wav')
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', '18', '-t', '3.9', '-i', '/home/user/libai/老板画饼72s_新形象.mp4', '-vn', '-ac', '2', '-ar', str(SR), song], check=True)
s, _ = sf.read(song); i0 = int(9.0 * SR); s = s[:N - i0]
fade = np.ones(len(s)); fade[:int(.25 * SR)] = np.linspace(0, 1, int(.25 * SR)); k = int(2.45 * SR); fade[k:] = np.linspace(1, 0, len(s) - k).clip(0) ** 2
duck = np.ones(len(s))
mix[i0:i0 + len(s)] += (s * (fade * .55)[:, None])
mix = np.tanh(1.3 * mix) / np.tanh(1.3)
mix *= 10 ** (-8 / 20) / np.abs(mix).max()
sf.write(os.path.join(here, 'score.wav'), mix, SR)
print('ok', np.abs(mix).max())
