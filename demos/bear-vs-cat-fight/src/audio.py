"""8 位音乐 + 音效，全部用 numpy 合成（固定随机种子，结果可复现）。采样率 48kHz，立体声（单声道复制）。"""
import numpy as np

SR = 48000
DUR = 30.0
rng = np.random.default_rng(11)


def _t(d):
    return np.arange(int(d * SR)) / SR


def sine(f, d, f2=None):
    t = _t(d)
    if f2 is None:
        return np.sin(2 * np.pi * f * t)
    fr = f + (f2 - f) * t / d
    return np.sin(2 * np.pi * np.cumsum(fr) / SR)


def square(f, d, duty=0.5):
    t = _t(d)
    return np.where((f * t) % 1.0 < duty, 1.0, -1.0)


def tri(f, d):
    t = _t(d)
    return 2 * np.abs(2 * ((f * t) % 1.0) - 1) - 1


def noise(d, smooth=1):
    n = rng.uniform(-1, 1, int(d * SR))
    if smooth > 1:
        k = np.ones(smooth) / smooth
        n = np.convolve(n, k, 'same')
    return n


def env(n, a=0.005, decay=6.0):
    t = np.arange(n) / SR
    e = np.minimum(1.0, t / a) if a > 0 else np.ones(n)
    return e * np.exp(-decay * t)


def put(buf, x, t0, gain=1.0):
    i = int(t0 * SR)
    if i < 0 or i >= len(buf):
        return
    n = min(len(x), len(buf) - i)
    buf[i:i + n] += gain * x[:n]


# ---------- 音效 ----------
def punch(v=1.0):
    d = 0.16
    body = sine(240, d, 70) * env(int(d * SR), 0.002, 14)
    crack = noise(d, 2) * env(int(d * SR), 0.001, 40)
    return v * (0.7 * body + 0.5 * crack)


def heavy(v=1.0):
    d = 0.45
    body = sine(110, d, 32) * env(int(d * SR), 0.002, 7)
    crack = noise(d, 3) * env(int(d * SR), 0.001, 16)
    return v * (0.9 * body + 0.5 * crack)


def swish(v=0.5, d=0.22):
    n = noise(d, 2)
    hp = np.diff(n, prepend=0)
    return v * hp * env(len(hp), 0.05, 8)


def clang(v=0.5):
    d = 0.35
    t = _t(d)
    s = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * k) for f, k in ((1180, 9), (1770, 12), (2510, 16)))
    return v * (0.35 * s + 0.25 * noise(d, 1) * env(int(d * SR), 0.001, 30))


def chomp(v=0.6):
    d = 0.09
    return v * (0.8 * noise(d, 2) * env(int(d * SR), 0.001, 40) + 0.4 * sine(300, d, 150) * env(int(d * SR), 0.001, 25))


def gurgle(v=0.5, d=0.9):
    vib = np.sin(2 * np.pi * 9 * _t(d)) * 25
    t = _t(d)
    f = 180 + 140 * t / d + vib
    return v * np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.05, 2.5)


def charge_hum(v=0.25, d=2.2):
    t = _t(d)
    f = 120 + 260 * (t / d) ** 2
    return v * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / 0.4)


def wave_whoosh(v=0.5, d=0.7):
    n = noise(d, 3)
    t = _t(d)
    return v * n * (np.sin(np.pi * t / d) ** 0.7) * (0.3 + 0.7 * t / d)


def blip(v=0.35, f=880):
    d = 0.06
    return v * square(f, d, 0.4) * env(int(d * SR), 0.001, 20)


def boing(v=0.45):
    d = 0.4
    return v * sine(260, d, 620) * env(int(d * SR), 0.005, 5)


def chime(v=0.4, notes=(880, 660, 440, 330), step=0.12):
    out = np.zeros(int((step * len(notes) + 0.4) * SR))
    for i, f in enumerate(notes):
        put(out, square(f, 0.35) * env(int(0.35 * SR), 0.003, 6), i * step, v)
    return out


# ---------- 音乐 ----------
A_MIN_BASS = [110, 110, 165, 165, 87.3, 87.3, 98, 165]          # A2 A2 E3 E3 F2 F2 G2 E3
A_MIN_LEAD = [440, 523.3, 659.3, 880, 783.99, 659.3, 523.3, 659.3]


def battle_loop(bpm=150):
    """约 2.5 秒一小节 × 4 小节循环，返回 18.5 秒的音乐片段。"""
    beat = 60 / bpm
    total = 18.5
    out = np.zeros(int(total * SR))
    step8 = beat / 2
    step16 = beat / 4
    n8 = int(total / step8) + 1
    for i in range(n8):
        t0 = i * step8
        f_b = A_MIN_BASS[i % len(A_MIN_BASS)]
        put(out, tri(f_b, step8 * 0.9) * env(int(step8 * 0.9 * SR), 0.003, 3), t0, 0.32)
        # 主旋律：每个 8 分音符两个 16 分
        for k in range(2):
            f_l = A_MIN_LEAD[(i * 2 + k) % len(A_MIN_LEAD)]
            put(out, square(f_l, step16 * 0.8, 0.3) * env(int(step16 * 0.8 * SR), 0.002, 7), t0 + k * step16, 0.12)
        # 鼓：底鼓在拍上，踩镲在 8 分音符
        if i % 2 == 0:
            d = 0.12
            put(out, sine(140, d, 45) * env(int(d * SR), 0.001, 22), t0, 0.5)
        put(out, noise(0.03, 1) * env(int(0.03 * SR), 0.001, 90), t0 + step8 / 2, 0.12)
    return out


def victory_jingle():
    out = np.zeros(int(3.6 * SR))
    seq = [(523.3, 0.0, 0.18), (659.3, 0.18, 0.18), (784, 0.36, 0.18), (1046.5, 0.54, 0.5), (784, 1.1, 0.16), (1046.5, 1.3, 1.6)]
    for f, t0, d in seq:
        put(out, square(f, d, 0.45) * env(int(d * SR), 0.005, 2.5), t0, 0.22)
        put(out, tri(f / 2, d) * env(int(d * SR), 0.005, 2.5), t0, 0.18)
    return out


def title_fanfare():
    out = np.zeros(int(2.4 * SR))
    for f, t0 in ((392, 0.0), (523.3, 0.16), (659.3, 0.32), (784, 0.48), (1046.5, 0.72)):
        put(out, square(f, 0.5, 0.5) * env(int(0.5 * SR), 0.003, 3), t0, 0.2)
    return out


def build():
    buf = np.zeros(int(DUR * SR) + SR)
    # 标题：开场音效
    put(buf, title_fanfare(), 0.0, 0.8)
    put(buf, boing(0.5), 0.2)
    # 战斗音乐 2.5–23.0；在 21.0–23.0 慢慢消失，KO 时停
    loop = battle_loop()
    cut = int(20.5 * SR)
    loop = loop[:int(20.5 * SR)]
    fade = np.ones(len(loop)); fl = int(1.5 * SR); fade[-fl:] = np.linspace(1, 0, fl)
    put(buf, loop * fade, 2.5, 0.8)
    # 倒计时 / 开场哨音
    put(buf, blip(0.5, 660), 2.5); put(buf, blip(0.5, 660), 2.9); put(buf, blip(0.6, 990), 3.2)
    # 出招音效
    for t0 in (4.50, 5.09, 5.68):
        put(buf, punch(0.9), t0)
    put(buf, swish(0.45), 3.7)                 # 猫冲刺
    put(buf, swish(0.35, 0.3), 6.40)           # 扔鱼骨
    put(buf, clang(0.7), 6.92)                 # 剑格挡
    put(buf, heavy(1.0), 8.52)                 # 勾拳重击
    put(buf, boing(0.4), 9.30)                 # 猫撒娇的弹跳声
    put(buf, swish(0.55), 11.85)               # 剑斩挥空
    put(buf, clang(0.6), 12.00); put(buf, heavy(0.5), 12.00)
    put(buf, charge_hum(0.3, 2.2), 13.0)       # 猫吞鱼蓄力
    for k in range(6):
        put(buf, chomp(0.55), 13.2 + k * 0.33)
    put(buf, gurgle(0.5, 0.9), 13.3)
    put(buf, wave_whoosh(0.7, 0.75), 15.20)    # 冰息
    put(buf, heavy(1.0), 15.80); put(buf, clang(0.6), 15.80)
    put(buf, heavy(0.9), 19.40)                # 鱼骨击中
    put(buf, swish(0.4, 0.2), 19.20)
    put(buf, swish(0.55), 21.60)               # 跳斩
    put(buf, heavy(0.9), 22.00)
    put(buf, swish(0.6), 22.70); put(buf, heavy(1.0), 23.00)   # 最后一斩 + KO
    put(buf, chime(0.45, (880, 660, 440, 330), 0.12), 23.1)
    # 胜利：音乐 + 计数
    put(buf, victory_jingle(), 26.0, 0.9)
    put(buf, blip(0.5, 990), 27.6); put(buf, blip(0.5, 880), 28.1)
    put(buf, boing(0.5), 27.9)
    put(buf, chomp(0.8), 28.5)
    buf = buf[:int(DUR * SR)]
    # 限幅，避免爆音
    buf = np.tanh(buf * 0.9) * 0.85
    stereo = np.stack([buf, buf], axis=1).astype(np.float32)
    return stereo


if __name__ == '__main__':
    import sys, wave
    out = build()
    pcm = (np.clip(out, -1, 1) * 32767).astype('<i2').tobytes()
    w = wave.open(sys.argv[1], 'wb')
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm); w.close()
    print('wrote', sys.argv[1], round(len(out) / SR, 2), 's')
