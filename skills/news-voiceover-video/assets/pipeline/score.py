"""配乐与混音（numpy 逐样本）：人声总线 + 分段配乐（按鼓点切入、交叉淡化、平滑闪避、停乐）+ 音效。

build_mix(out_wav, total, speech, cues, drops, sfx)
- speech: [(文件, 入点, 出点, 放在第几秒, 目标响度LUFS, 是否加人声处理)]
- cues:   [dict(file, start, end, level=-8, fade_in=0.35, fade_out=1.2)]  level 是相对 -24 LUFS 的增益
- drops:  [(t0, t1, gain)]  配乐在这段时间里乘以 gain（0=停乐），两端 60ms 斜坡
- sfx:    [(文件, 时间, 增益dB, 对齐方式 'start'|'end')]
"""
import subprocess
import numpy as np
import pyloudnorm as pyln
import librosa

SR = 48000
METER = pyln.Meter(SR)


def load(path, t_in=None, t_out=None, af=None):
    args = ['ffmpeg', '-loglevel', 'error']
    if t_in is not None:
        args += ['-ss', f'{t_in}']
    if t_out is not None:
        args += ['-t', f'{t_out - (t_in or 0)}']
    args += ['-i', path]
    if af:
        args += ['-af', af]
    args += ['-ac', '2', '-ar', str(SR), '-f', 'f32le', '-']
    raw = subprocess.run(args, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def norm(x, target):
    if len(x) < SR * 0.4:
        return x
    lv = METER.integrated_loudness(x)
    if not np.isfinite(lv):
        return x
    return x * 10 ** ((target - lv) / 20)


def place(bus, x, at):
    i = int(round(at * SR))
    if i >= len(bus):
        return
    j = min(len(bus), i + len(x))
    bus[max(i, 0):j] += x[max(0, -i):j - i]


def first_beat(path):
    y, sr = librosa.load(path, sr=22050, mono=True, duration=20)
    _, beats = librosa.beat.beat_track(y=y, sr=sr)
    bt = librosa.frames_to_time(beats, sr=sr)
    return float(bt[0]) if len(bt) else 0.0


def smooth(env, fps, attack, release):
    out = np.zeros_like(env)
    a, r = np.exp(-1 / (attack * fps)), np.exp(-1 / (release * fps))
    v = 0.0
    for i, e in enumerate(env):
        c = a if e > v else r
        v = c * v + (1 - c) * e
        out[i] = v
    return out


def xfade(x, y, sec=0.06):
    k = int(sec * SR)
    if len(x) < k or len(y) < k:
        return np.concatenate([x, y])
    w = np.linspace(0, 1, k)[:, None]
    return np.concatenate([x[:-k], x[-k:] * (1 - w) + y[:k] * w, y[k:]])


def join_segments(segs):
    """[(文件, 起, 止)] 依次接起来，接缝 60ms 交叉淡化（起止都放在小节线上）。"""
    out = None
    for path, a, b in segs:
        y = load(path, a, b)
        out = y if out is None else xfade(out, y)
    return out


def build_mix(out_wav, total, speech, cues, drops, sfx, duck_db=7.0):
    n = int(total * SR) + SR
    sp = np.zeros((n, 2), np.float32)
    mu = np.zeros((n, 2), np.float32)
    fx = np.zeros((n, 2), np.float32)
    vo_chain = 'highpass=f=70,acompressor=threshold=0.1:ratio=2.5:attack=10:release=200'
    for path, a, b, at, target, chain in speech:
        x = load(path, a, b, vo_chain if chain else None)
        x = norm(x, target)
        k = int(0.012 * SR)                       # 两端 12ms 淡入淡出，防止接缝咔哒声
        if len(x) > 2 * k:
            ramp = np.linspace(0, 1, k)[:, None]
            x[:k] *= ramp; x[-k:] *= ramp[::-1]
        place(sp, x, at)
    for c in cues:
        need = c['end'] - c['start'] + c.get('fade_out', 1.2)
        if 'segments' in c:
            x = join_segments(c['segments'])
            while len(x) < need * SR:             # 还不够长：整段再接一遍
                x = xfade(x, join_segments(c['segments'][-1:]))
            if c.get('align') == 'end':           # 片尾：从结尾倒着取，保留自然收尾
                need = c['end'] - c['start']
                x = x[-int(need * SR):]
            else:
                x = x[:int(need * SR)]
            x = norm(x, -24 + c.get('level', -8))
            fi, fo = int(c.get('fade_in', 0.35) * SR), int(c.get('fade_out', 1.2) * SR)
            x[:fi] *= np.linspace(0, 1, fi)[:, None]
            x[-fo:] *= np.linspace(1, 0, fo)[:, None]
            place(mu, x, c['start'])
            continue
        off = c.get('offset', first_beat(c['file']))
        x = load(c['file'], off, None)
        while len(x) < need * SR:                 # 不够长就接一遍（交叉 2 秒）
            y = load(c['file'], off, None)
            xf = int(2 * SR)
            w = np.linspace(0, 1, xf)[:, None]
            x = np.concatenate([x[:-xf], x[-xf:] * (1 - w) + y[:xf] * w, y[xf:]])
        x = norm(x[:int(need * SR)], -24 + c.get('level', -8))
        fi, fo = int(c.get('fade_in', 0.35) * SR), int(c.get('fade_out', 1.2) * SR)
        x[:fi] *= np.linspace(0, 1, fi)[:, None]
        x[-fo:] *= np.linspace(1, 0, fo)[:, None]
        place(mu, x, c['start'])
    # 停乐 / 减弱
    g = np.ones(n, np.float32)
    for t0, t1, gain in drops:
        i0, i1, r = int(t0 * SR), int(t1 * SR), int(0.06 * SR)
        seg = np.full(i1 - i0, gain, np.float32)
        seg[:r] = np.linspace(1, gain, r); seg[-r:] = np.linspace(gain, 1, r)
        g[i0:i1] = np.minimum(g[i0:i1], seg)
    # 平滑闪避：人声越响，配乐越低（起 60ms，回 600ms）
    hop = SR // 100
    rms = np.sqrt(np.mean(sp[:len(sp) // hop * hop, 0].reshape(-1, hop) ** 2, axis=1) + 1e-12)
    act = np.clip((20 * np.log10(rms) + 48) / 12, 0, 1)
    act = smooth(act, 100, 0.06, 0.6)
    duck = 10 ** (-duck_db * act / 20)
    duck = np.repeat(duck, hop)[:n]
    duck = np.pad(duck, (0, n - len(duck)), constant_values=1)
    mu *= (g * duck)[:, None]
    for path, at, gain_db, align in sfx:
        x = load(path)
        pk = np.abs(x).max() + 1e-9
        x = x / pk * 10 ** ((-6 + gain_db) / 20)
        place(fx, x, at - (len(x) / SR if align == 'end' else 0))
    mix = (sp + mu + fx)[:int(total * SR)]
    mix = norm(mix, -14.0)
    raw = (np.clip(mix, -4, 4)).astype(np.float32).tobytes()
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-',
                    '-af', 'alimiter=limit=0.708:attack=2:release=50:level=false', '-ar', str(SR), out_wav],
                   input=raw, check=True)
    return out_wav
