"""第二版音频：音效名字和时间全部来自 timeline.SFX，音乐沿用 audio.py。"""
import numpy as np
import audio as A
import timeline as TL

SR = A.SR


def add(*xs):
    """把几段音效叠在一起（长度不同时补零）。"""
    n = max(len(x) for x in xs)
    out = np.zeros(n)
    for x in xs:
        out[:len(x)] += x
    return out


def _sfx(name):
    if name == 'title':
        return A.title_fanfare()
    if name == 'ding':
        return A.blip(0.6, 1320)
    if name == 'blip':
        return A.blip(0.5, 660)
    if name == 'blip_hi':
        return A.blip(0.6, 990)
    if name == 'boing':
        return A.boing(0.45)
    if name == 'draw':                       # 拔剑：高频金属摩擦 + 清脆一声
        return add(A.swish(0.45, 0.2), A.clang(0.35))
    if name == 'dash':                       # 瞬影：急促的风声
        return A.swish(0.5, 0.25)
    if name == 'punch':
        return A.punch(1.0)
    if name == 'upper':                      # 上勾拳：比普通拳重，带一点风声
        return add(A.punch(1.0), A.swish(0.3, 0.2))
    if name == 'swish':
        return A.swish(0.45, 0.22)
    if name == 'clang':
        return A.clang(0.6)
    if name == 'fishbone':                   # 鱼骨弹：短促破风声
        return add(A.swish(0.35, 0.12), 0.5 * A.blip(0.35, 1500))
    if name == 'charge':                     # 蓄力嗡鸣
        return A.charge_hum(0.4, 1.2)
    if name == 'cutin':                      # 镜头切入：低频推进 + 风声
        d = 0.5
        bass = A.sine(90, d, 40) * A.env(int(d * SR), 0.01, 4)
        return add(0.6 * bass, A.swish(0.6, 0.35))
    if name == 'dragon':                     # 霜龙：低沉咆哮（下滑音）
        d = 0.9
        t = np.arange(int(d * SR)) / SR
        f = 340 - 220 * t / d
        roar = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-2.2 * t)
        return add(0.6 * roar, A.wave_whoosh(0.5, 0.8))
    if name == 'heavy':
        return A.heavy(1.0)
    if name == 'slam':                       # 地裂：重击 + 余震
        d = 0.8
        rumble = A.noise(d, 6) * A.env(int(d * SR), 0.01, 3)
        return add(A.heavy(0.9), 0.4 * rumble)
    if name == 'gulp':
        return A.gurgle(0.5, 0.4)
    if name == 'chomp':
        return A.chomp(0.8)
    if name == 'vortex':                     # 鱼海漩涡：咕噜 + 风声
        return add(A.gurgle(0.5, 0.9), A.wave_whoosh(0.4, 0.5))
    if name == 'chime':
        return A.chime(0.5, (880, 660, 440, 330), 0.12)
    if name == 'victory':
        return A.victory_jingle()
    raise KeyError(name)


def build():
    buf = np.zeros(int(A.DUR * SR) + SR)
    # 战斗音乐：2.5–21 秒正常播，21–23 秒渐弱，23 秒 K.O. 后停
    loop = A.battle_loop()
    cut = int(20.5 * SR)
    loop = loop[:cut]
    fade = np.ones(len(loop)); fl = int(1.5 * SR); fade[-fl:] = np.linspace(1, 0, fl)
    A.put(buf, loop * fade, 2.5, 0.8)
    for t0, name, g in TL.SFX:
        A.put(buf, _sfx(name), t0, g)
    buf = buf[:int(A.DUR * SR)]
    buf = np.tanh(buf * 0.9) * 0.7
    return np.stack([buf, buf], axis=1).astype(np.float32)
