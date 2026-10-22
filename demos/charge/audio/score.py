# 「充到 80%」音效：合成拟音放进同一个房间（一份混响），按画面事件摆放
import numpy as np, soundfile as sf, subprocess, os
SR = 48000; DUR = 30.0; N = int(SR * DUR)
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

# ---------- 事件（和 charge_body.js 的时间一致）
def paper(dur=.12):
    n = int(dur * SR); t = np.arange(n) / SR; return bp(rng.standard_normal(n), 2500, .8) * np.exp(-t / (dur * .25)) * .7
place(glass(1047, .8, .4), 0.02, .18, 0, .5)
place(glass(1319, .3, .3), 0.5, .2, 0, .3)
place(sub(70, .5, 2.5), 1.0, .6, 0, .3); place(wood(140), 1.0, .9, .2, .2); place(paper(.15), 1.0, .5, .2, .3)
place(air(.35, 2500, 700, 1.6), 2.85, .3, 0, .4)
place(bubble(700, .14), 3.02, .5, 0, .3); place(paper(.2), 3.22, .6, .3, .3)
place(air(.8, 400, 3000, 2.2), 3.45, .35, .3, .3)
place(bubble(520, .14), 4.25, .55, .4, .3); place(glass(1568, .5, .5), 4.27, .25, .4, .4)
place(bubble(900, .1), 4.3, .4, .2, .2); place(bubble(800, .1), 6.0, .4, .5, .2)
n = int(2.8 * SR); tt = np.arange(n) / SR; slow = np.sin(2 * np.pi * np.cumsum(np.linspace(392, 523, n)) / SR) * np.sin(np.pi * tt / 2.8) * .25
place(slow, 5.6, .5, .4, .5)
place(glass(784, .9, .3), 7.9, .22, .4, .5)
place(glass(1175, .5, .4), 10.35, .2, 0, .4)
place(air(.9, 200, 2600, 1.1), 11.0, .45, 0, .5); place(sub(55, .8, 1.4), 11.86, .5, 0, .5)
for i, a in enumerate([12.55, 12.85, 13.15, 13.45]): place(bubble(600 + 120 * i, .12), a, .5, (-.4, .4, .4, -.4)[i], .3)
SC = [(12.7 + i * .4, 1.0) for i in range(6)] + [(15.25 + i * .16, .55) for i in range(22)] + [(19.1 + i * .46, 1.3) for i in range(6)]
for k, (s, d) in enumerate(SC): place(wood(220 + k * 9, .06), s + d, .35 + .15 * rng.random(), rng.uniform(-.3, .3), .2)
for i in range(6): place(glass(988 + 40 * i, .25, .2), 19.1 + i * .46 + .75, .12, rng.uniform(-.4, .4), .4)
for i in range(12): place(wood(300, .05), 22.05 + i * .24 + .45, .5, rng.uniform(-.3, .3), .2)
for a in [22.6, 23.6, 24.6]: place(glass(2637, .35, 1.6), a, .3, 0, .3); place(sub(90, .3, 3), a, .45, 0, .2); place(air(.12, 4000, 1500, 2), a, .3, 0, .2)
place(sub(42, 1.6, 3.5), 25.4, 1.0, 0, .6); place(air(.6, 5000, 300, .8), 25.4, .6, 0, .6); place(wood(110, .1), 25.5, 1.0, 0, .3)
n = int(2.1 * SR); tt = np.arange(n) / SR; drone = (np.sin(2 * np.pi * 55 * tt) + .5 * np.sin(2 * np.pi * 58.3 * tt)) * np.sin(np.pi * tt / 2.1) * .3
place(drone, 25.5, .7, 0, .4)
place(air(.7, 3000, 200, 1.4)[::-1].copy(), 27.6, .45, 0, .4)
place(glass(784, 1.2, .3), 29.75, .25, -.1, .5)   # 慢慢停进最后的车位
for f in [523, 659, 784]: place(glass(f, 1.6, .3), 28.6, .14, 0, .6)

# ---------- 房间：一份合成脉冲响应（T60≈1.1 s，12 ms 预延迟，3 个早期反射）
n = int(1.4 * SR); t = np.arange(n) / SR
ir = rng.standard_normal((n, 2)) * np.exp(-t * 6.9 / 1.1)[:, None]
ir[:int(.012 * SR)] = 0
for d, g in [(.017, .5), (.029, .35), (.041, .25)]: ir[int(d * SR)] += g
from scipy.signal import fftconvolve, butter, sosfilt
ir = sosfilt(butter(2, 5000, 'low', fs=SR, output='sos'), ir, axis=0)
wet = np.stack([fftconvolve(send[:, c], ir[:, c])[:N] for c in range(2)], 1) * .35
mix = dry + wet


# ---------- 铺底：100 BPM 的轻律动（0–22），22–27.6 换成紧张的低频，28.3 后回到平和
tt = np.arange(N) / SR; bed = np.zeros(N); beat = 60 / 100
kick = sub(60, .35, 1.2) * .5; hat = bp(rng.standard_normal(int(.05 * SR)), 8000, 1.5) * np.exp(-np.arange(int(.05 * SR)) / SR / .01) * .15
def put(sig, t, g=1.):
    i = int(t * SR); sig = sig[:max(0, N - i)]; bed[i:i + len(sig)] += sig * g
b = 0.0
while b < 22.0:
    if not (9.3 < b < 10.7): put(kick, b, .8 if b > 3 else .5); put(hat, b + beat / 2, 1.)
    b += beat
for f in [261.6, 329.6, 392.0, 493.9]:
    bed += np.sin(2 * np.pi * f * tt) * .012 * np.clip(tt / 1, 0, 1) * np.clip((22 - tt) / .4, 0, 1)
    bed += np.sin(2 * np.pi * f * tt) * .012 * np.clip((tt - 28.3) / .8, 0, 1)
mix_bed = bed

mix_sfx = mix.copy()
mix = mix_sfx + mix_bed[:, None]
mix = np.tanh(1.3 * mix) / np.tanh(1.3)
mix *= 10 ** (-8 / 20) / np.abs(mix).max()
here = os.path.dirname(os.path.abspath(__file__))
sf.write(os.path.join(here, 'score.wav'), mix, SR)
print('ok')

m2 = np.tanh(1.3 * mix_sfx) / np.tanh(1.3); m2 *= 10 ** (-8 / 20) / np.abs(m2).max()
sf.write(os.path.join(here, 'sfx_only.wav'), m2, SR)
