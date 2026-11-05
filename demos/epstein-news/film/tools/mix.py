import json, subprocess, re
import numpy as np, soundfile as sf
from scipy import signal

SR = 48000
F = json.load(open('film.json'))
rng = np.random.default_rng(1971)

def load(path, sr=SR):
    a = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(a, np.float32).astype(np.float64)

def add(buf, x, t, gain=1.0):
    i = int(t * SR)
    if i >= len(buf): return
    x = x[:len(buf) - i]
    buf[i:i + len(x)] += x * gain

def env(n, a=0.005, r=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / r)

def bandpass(x, lo, hi, order=4):
    sos = signal.butter(order, [lo, hi], 'bandpass', fs=SR, output='sos')
    return signal.sosfilt(sos, x)

def lowpass(x, f, order=4):
    return signal.sosfilt(signal.butter(order, f, 'lowpass', fs=SR, output='sos'), x)

def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)

def compress(x, thr_db=-24, ratio=3.0, att=0.005, rel=0.12):
    e = np.abs(x); out = np.zeros_like(e); ga, gr = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR)); v = 0.0
    for i, s in enumerate(e[::32]):          # 每 32 个样本算一次包络，够用也快
        v = ga * v + (1 - ga) * s if s > v else gr * v + (1 - gr) * s
        out[i * 32:(i + 1) * 32] = v
    lvl = 20 * np.log10(out + 1e-9); over = np.maximum(0, lvl - thr_db)
    return x * 10 ** (-over * (1 - 1 / ratio) / 20)

midi = lambda m: 440 * 2 ** ((m - 69) / 12)
T = lambda d: np.arange(int(d * SR)) / SR

# ---------- 乐器 ----------
def bass_drone(f, d):           # 低音提琴持续音：锯齿波 + 低通 + 慢起慢收
    t = T(d); x = signal.sawtooth(2 * np.pi * f * t) * 0.6 + np.sin(2 * np.pi * f * 2 * t) * 0.25 + np.sin(2 * np.pi * f * 3 * t) * 0.12
    x = lowpass(x, 420) * (1 + 0.05 * np.sin(2 * np.pi * 0.2 * t))
    a = np.minimum(1, t / 2.5) * np.minimum(1, (d - t) / 2.5); return x * a

def pizz(f, d=0.6):             # 拨弦：Karplus–Strong
    n = int(d * SR); p = int(SR / f); buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]; buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * 0.994
    return lowpass(out, 2500) * env(n, 0.002, 0.25)

def pad(fs, d):                 # 弦乐长音：失谐锯齿 + 低通
    t = T(d); x = np.zeros_like(t)
    for f in fs:
        for det in (-0.12, 0.0, 0.13): x += signal.sawtooth(2 * np.pi * f * (1 + det / 100) * t + rng.uniform(0, 6))
    x = lowpass(x / (len(fs) * 3), 1800)
    return x * np.minimum(1, t / 3.0) * np.minimum(1, (d - t) / 3.0)

def tremolo_cluster(d):         # 小二度颤音簇（D5 + E♭5）
    t = T(d); x = (np.sin(2 * np.pi * midi(74) * t) + np.sin(2 * np.pi * midi(75) * t)) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t))
    return lowpass(x, 3000) * np.minimum(1, t / 1.5) * np.minimum(1, (d - t) / 0.8) * 0.5

def mallet(f, d=1.6):           # 木琴 / 颤音琴
    t = T(d); x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 8)
    return x * env(len(t), 0.002, 0.5) * (1 + 0.15 * np.sin(2 * np.pi * 5.5 * t))

def tick(accent=False):         # 钟摆 / 秒表滴答
    n = int(0.03 * SR); x = bandpass(rng.normal(0, 1, n), 2500, 6000) * env(n, 0.0005, 0.006)
    return x * (1.0 if accent else 0.55)

def flash_tap():                # 证据切入的"嗒"
    n = int(0.06 * SR); return bandpass(rng.normal(0, 1, n), 1200, 7000) * env(n, 0.0005, 0.012)

def scratch(d=0.5):             # 红圈：铅笔划过
    n = int(d * SR); x = bandpass(rng.normal(0, 1, n), 2500, 8000) * (0.5 + 0.5 * np.abs(np.sin(np.linspace(0, 9, n))))
    return x * np.minimum(1, np.arange(n) / (0.03 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.08 * SR)) * 0.25

def thump():                    # 低音重击
    t = T(1.4); f = 70 * np.exp(-t * 3) + 38; x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.2)
    return x

def rewind(d=1.0):              # 倒带扫频
    t = T(d); f = 3000 * np.exp(-t * 2.2) + 200; x = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) * 0.3 + rng.normal(0, 0.3, len(t))
    return bandpass(x, 300, 6000) * np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.1)

def room(d):                    # 房间底噪
    return lowpass(rng.normal(0, 1, int(d * SR)), 300) * 0.5

# ---------- 时间表 ----------
F = json.load(open('film.json')); BEATS = F['beats']; BY = {b['id']: b for b in BEATS}
DUR = F['dur']; N = int(DUR * SR)
strip = lambda s: re.sub(r'[\s，。、：；？！,.:;?!《》“”"\'（）()—·]', '', s)
def kw(bid, w):   # 与页面里 b.kw 同一算法：该词在这一段里出现的成片时间
    b = BY[bid]; i = strip(b['zh']).find(strip(w)); return b['t'] + b['chars'][min(max(i, 0), len(b['chars']) - 1)]

# ---------- 新增音色 ----------
def pulse(f, d, cut=900):       # 新闻包装的脉冲贝斯：锯齿 + 低通 + 每拍压缩感
    t = T(d); x = signal.sawtooth(2 * np.pi * f * t) * 0.7 + np.sin(2 * np.pi * f * t) * 0.5
    x = lowpass(x, cut); return x * env(len(t), 0.004, 0.18)
def whoosh(d=0.35):             # 红蓝条转场
    t = T(d); x = rng.normal(0, 1, len(t)); k = t / d; y = bandpass(x, 800, 6000) * np.sin(np.pi * k) ** 2
    return y * 0.45
def riser(d=1.2):               # 揭晓前的上扫
    t = T(d); f = 300 + 2200 * (t / d) ** 2; x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 + bandpass(rng.normal(0, 1, len(t)), 2000, 9000) * 0.15
    return x * (t / d) ** 2
def hit():                      # 数字落定：重击 + 嗒
    a = thump() * 0.8; b = np.zeros(len(a)); b[:len(flash_tap())] += flash_tap() * 0.8; return a + b


# ================= 配乐 v2：按剧情走的悬疑配乐 =================
# 每一章一种情绪；"否决"三音下行主题在 v07 埋下、v37 回收、片尾再响一次。
S = lambda b: BY[b]['t']
E = lambda b: BY[b]['t'] + BY[b]['span']

# ---------- 悬疑片音色 ----------
def heartbeat():                # 心跳：咚—咚
    t = T(0.9); x = np.zeros(len(t))
    for off, f, g in ((0.0, 58, 1.0), (0.22, 47, 0.7)):
        tt = t - off; m = tt >= 0; x[m] += g * np.sin(2 * np.pi * f * tt[m] * (1 - 0.25 * tt[m])) * np.exp(-tt[m] * 13)
    return lowpass(x, 220)
def taiko():                    # 大鼓
    t = T(1.0); f = 115 * np.exp(-t * 5) + 52; x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4.5)
    return x + bandpass(rng.normal(0, 1, len(t)), 80, 900) * np.exp(-t * 28) * 0.6
def boom(d=2.6):                # 电影预告片式的重低音轰响
    t = T(d); f = 72 * np.exp(-t * 2.2) + 27; x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.3)
    return x + lowpass(rng.normal(0, 1, len(t)), 260) * np.exp(-t * 3) * 0.9
def swell(d=1.4):               # 反向镲：轰响前的吸气
    t = T(d); return bandpass(rng.normal(0, 1, len(t)), 2500, 12000) * (t / d) ** 3 * 0.7
def trem(freqs, d, rate=11, cut=2600):   # 弦乐颤音（不和谐音簇）
    t = T(d); x = sum(signal.sawtooth(2 * np.pi * f * t + rng.uniform(0, 6)) for f in freqs) / len(freqs)
    return lowpass(x, cut) * (0.6 + 0.4 * np.sin(2 * np.pi * rate * t)) * np.minimum(1, t / 1.2) * np.minimum(1, (d - t) / 0.6)
def brass(fs, d, cut=850):      # 低音铜管铺底
    t = T(d); x = sum(signal.sawtooth(2 * np.pi * f * (1 + det) * t) for f in fs for det in (-0.003, 0, 0.004)) / (3 * len(fs))
    return lowpass(x, cut) * np.minimum(1, t / 0.9) * np.minimum(1, (d - t) / 0.9)
def bell(f, d=2.6):             # FM 钟琴：主题旋律
    t = T(d); mod = np.sin(2 * np.pi * f * 3.5 * t) * 1.8 * np.exp(-t * 3)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 1.5) * np.minimum(1, t / 0.003)
def mbox(f, d=1.4):             # 八音盒
    t = T(d); return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 5.04 * f * t)) * np.exp(-t * 3.2)
def hat(open_=False):
    n = int((0.2 if open_ else 0.05) * SR); return bandpass(rng.normal(0, 1, n), 7000, 15000) * env(n, 0.001, 0.07 if open_ else 0.015) * 0.5
def brush():                    # 刷子军鼓
    n = int(0.25 * SR); return bandpass(rng.normal(0, 1, n), 1500, 7000) * env(n, 0.01, 0.09) * 0.4
def choir(fs, d):               # 合唱"啊"：锯齿 + 元音共振峰
    t = T(d); x = sum(signal.sawtooth(2 * np.pi * f * (1 + 0.003 * np.sin(2 * np.pi * 5.2 * t + i)) * t) for i, f in enumerate(fs))
    y = (bandpass(x, 600, 900) + 0.7 * bandpass(x, 1050, 1300)) / len(fs); return y * np.minimum(1, t / 1.6) * np.minimum(1, (d - t) / 1.4)
def shatter():                  # 碎裂
    t = T(0.9); n = len(t); x = bandpass(rng.normal(0, 1, n), 2500, 11000) * env(n, 0.001, 0.13)
    return x + 0.3 * sum(np.sin(2 * np.pi * f * t) * np.exp(-t * 6) for f in (2310, 3170, 4410))
def ping(f=1100, d=2.5):        # 声呐
    t = T(d); return np.sin(2 * np.pi * f * t) * np.exp(-t * 2.2) * np.minimum(1, t / 0.01)
def stab(fs, d=0.5):            # 短促和弦重音
    t = T(d); x = sum(signal.sawtooth(2 * np.pi * f * t) for f in fs) / len(fs); return lowpass(x, 1800) * env(len(t), 0.003, 0.14)
def every(t0, t1, step, fn, start=None):
    t = t0 if start is None else start; i = 0
    while t < t1 - 0.02: fn(t, i); t += step; i += 1
VETO = [midi(69), midi(65), midi(64)]   # “否决”主题：A4–F4–E4，三音下行
def veto_motif(t, g=0.13, step=0.42):
    for i, f in enumerate(VETO): add(music, bell(f, 3.0), t + i * step, g)

music = np.zeros(N); sfx = np.zeros(N); amb = np.zeros(N)
add(music, room(DUR), 0, 0.012)


# ==================== 《国王的弟弟被抓了》配乐 ====================
S = lambda b: BY[b]['t']; E = lambda b: BY[b]['t'] + BY[b]['dur']
D2, A2, F2, E2 = midi(38), midi(45), midi(41), midi(40)

# 钩子 h1–h6：不安，心跳加速
add(music, bass_drone(D2, E('h6') - 0.0), 0, 0.22)
t, gap = 0.3, 1.0
while t < S('h6'): add(amb, heartbeat(), t, 0.5); t += gap; gap = max(0.55, gap * 0.94)
add(sfx, boom(), kw('h1', '带走') - 0.05, 0.55); add(sfx, hit(), kw('h1', '带走') + 0.25, 0.5)
add(sfx, hit(), kw('h2', '四百') + 0.55, 0.45)
add(sfx, scratch(), kw('h3', '不是那桩') + 0.5, 0.5); add(sfx, flash_tap(), kw('h3', '几封邮件'), 0.6)
add(sfx, thump(), kw('h4', '英国抓了') + 0.5, 0.6); add(sfx, thump(), kw('h4', '一个没抓'), 0.6)
add(music, riser(1.4), S('h6') - 0.2, 0.35); add(sfx, taiko(), kw('h6', '卡在哪'), 0.6)

# 第一层 a1–a6：侦探律动
def detect(t, i):
    add(music, pizz([D2 * 2, F2 * 2, A2 * 2, F2 * 2][i % 4], 0.5), t, 0.16)
    if i % 2 == 0: add(music, pulse(D2, 0.35), t, 0.10)
every(S('a1'), E('a6'), 0.6, detect)
add(music, pad([D2 * 2, F2 * 2, A2 * 2], E('a6') - S('a1')), S('a1'), 0.07)
every(S('a2'), E('a3'), 0.5, lambda t, i: add(sfx, tick(i % 4 == 0), t, 0.22))
add(sfx, hit(), kw('a2', '五分钟') + 0.4, 0.45); add(sfx, hit(), kw('a3', '十一') + 0.5, 0.4)
add(sfx, flash_tap(), kw('a4', '曼德尔森'), 0.5); add(sfx, boom(1.8), kw('a5', '扩大'), 0.35)

# 第二层 b1–b6：她，克制
add(music, pad([D2 * 2, A2 * 2, F2 * 4], E('b5') - S('b1')), S('b1'), 0.10)
add(music, bell(midi(62), 3.0), S('b1') + 0.3, 0.10)
for w in ['回忆录', '一猜']: add(music, mbox(midi(74), 1.6), kw('b3', w), 0.08)
add(music, choir([midi(50), midi(57)], 4.0), kw('b4', '她回了'), 0.06)
add(sfx, stamp_s := thump(), kw('b5', '没有承认'), 0.35)
add(music, bell(midi(57), 3.5), kw('b6', '九天后') + 0.3, 0.10)

# 第三层 c1–c4：反讽与反转
every(S('c1'), E('c4'), 0.48, lambda t, i: add(music, pulse([D2, D2, F2, E2][(i // 4) % 4], 0.3, 700), t, 0.11 if i % 4 else 0.16))
add(music, stab([midi(62), midi(65), midi(69)], 0.6), kw('c1', '就在我桌上'), 0.20)
add(sfx, boom(), kw('c2', '根本没有') + 0.25, 0.55); add(sfx, hit(), kw('c2', '根本没有') + 0.3, 0.5)
add(sfx, hit(), kw('c3', '四百二十七') + 0.6, 0.45)
every(kw('c3', '三百多万页'), E('c3'), 0.12, lambda t, i: add(sfx, flash_tap(), t, 0.10))
add(sfx, scratch(), kw('c4', '下台'), 0.5)

# 第四层 d1–d4：名字，紧张
add(music, trem([midi(62), midi(63)], E('d4') - S('d1'), 9, 2200), S('d1'), 0.05)
add(music, brass([D2, A2], E('d4') - S('d1')), S('d1'), 0.10)
add(sfx, taiko(), kw('d1', '不等于'), 0.45)
add(sfx, shatter(), kw('d2', '删了'), 0.40)
add(sfx, flash_tap(), kw('d3', '私人飞机'), 0.4); add(sfx, thump(), kw('d3', '除了'), 0.4)
add(sfx, scratch(), kw('d4', '藐视'), 0.35)

# 第五层 e1–e2：沉下来
every(S('e1'), E('e2'), 1.05, lambda t, i: add(amb, heartbeat(), t, 0.32))
add(music, brass([D2, F2], E('e2') - S('e1')), S('e1'), 0.12)
add(sfx, boom(1.8), kw('e1', '不能'), 0.35); add(music, ping(880), kw('e2', '律师开价'), 0.18)

# 结尾 z1–z4：收束
add(music, pad([D2 * 2, A2 * 2, midi(64) * 2], DUR - S('z1')), S('z1'), 0.10)
add(sfx, hit(), kw('z1', '美国卡在'), 0.4)
add(music, stab([midi(62), midi(65), midi(69)], 0.6), kw('z2', '就在我桌上'), 0.16)
for i, f in enumerate([midi(69), midi(65), midi(62)]): add(music, bell(f, 3.2), kw('z4', '关注') + i * 0.45, 0.14)

# ---------- 转场 ----------
for b in BEATS:
    if b['t'] > 0.5: add(sfx, whoosh(), b['t'] - 0.14, 0.55)
fade = np.ones(N); fi = int((DUR - 2.5) * SR); fade[fi:] = np.linspace(1, 0, N - fi)

# ---------- 人声：整条旁白 ----------
vo = np.zeros(N); x = load('audio/vo_full.wav'); x = compress(x, -22, 2.5); x *= 10 ** ((-19 - rms_db(x[np.abs(x) > 0.01])) / 20); add(vo, x, F['voAt'])
envv = np.convolve(np.abs(vo), np.ones(2400) / 2400, 'same'); act = (envv > 0.004).astype(float)
k = int(0.35 * SR); act = np.convolve(act, np.ones(k) / k, 'same'); act = np.clip(act * 3, 0, 1)
quiet = np.zeros(N); qa, qb = kw('b6', '去年') - 0.3, kw('b6', '半年后'); quiet[int(qa * SR):int(qb * SR)] = 1
quiet = np.convolve(quiet, np.ones(int(0.2 * SR)) / int(0.2 * SR), 'same')
duck = 10 ** ((-9 * act - 22 * quiet) / 20)
bed = (music + sfx * 0.9) * duck * fade + amb * 10 ** ((-6 * act) / 20) * fade
wide = lowpass(np.roll(music * duck * fade, int(0.012 * SR)), 8000)
L = bed + vo + 0.08 * wide; R = bed + vo - 0.08 * wide
out = np.stack([L, R], 1); out /= max(1.0, np.abs(out).max() / 0.95)
sf.write('out/mix.wav', out.astype(np.float32), SR)
print('mix', out.shape, round(len(out) / SR, 2), 's', 'vo rms', round(rms_db(vo[vo != 0]), 1))
