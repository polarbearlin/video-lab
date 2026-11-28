"""Mix 第一场雪 (60 s): the approved dialogue untouched and unshifted, over the code-made bed: the score (piano + wind,
stems.py), the paper sounds (stems.py) and a snow ambience made here (snow air, a gust or two, the sled's runners on
the ride). The bed ducks at least 10 dB under every line, deeper under a soft line until the speech clears it by
MIN_CLEAR. The dialogue gets one fixed gain (its lines at SPEECH_LUFS), the bed is levelled so the master reads
-16 LUFS integrated, and a true-peak limiter holds it under -1 dBTP (it touches only the dialogue's rare peaks).

    python3 first-snow/mix.py DIALOGUE.wav TIMELINE.json STEMDIR OUTDIR
        -> OUTDIR/mix.wav (with dialogue), OUTDIR/nodialogue.wav (music + ambience + paper, unducked, same bed gain)
"""
import json, os, sys

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from scipy.signal import butter, resample_poly, sosfilt

SR = 48000
DUCK_DB, ATTACK, RELEASE = -10.0, 0.25, 0.4
MIN_CLEAR = 10.0             # dB the speech must sit over the ducked bed on every line
SPEECH_LUFS = -13.5          # the lines' own loudness in the master (one fixed gain on the whole dialogue track)
AMB_UNDER_MUSIC = 16.0       # dB; the bed's level is then solved for the master's integrated target
TARGET_LUFS, CEIL_DBTP = -16.0, -1.0
RIDE = (32.0, 42.0)
db = lambda x: 10 ** (x / 20)


def stereo(x):
    return np.stack([x, x], 1) if x.ndim == 1 else x


def fit(x, n):
    return x[:n] if len(x) >= n else np.pad(x, ((0, n - len(x)), (0, 0)))


def env(n, keys):
    """piecewise-linear envelope from (sec, value) keys"""
    t = np.arange(n) / SR
    k = np.array(keys, float)
    return np.interp(t, k[:, 0], k[:, 1])


def ambience(n, rng):
    """snow air: soft dark noise breathing slowly, a few gusts; the sled's runners hissing over the ride"""
    t = np.arange(n) / SR
    noise = rng.standard_normal((n, 2))
    air = sosfilt(butter(2, [90, 900], 'bandpass', fs=SR, output='sos'), noise, axis=0)
    air *= (0.75 + 0.25 * np.sin(2 * np.pi * t / 7.3))[:, None]
    for c, w in ((15.5, 3.0), (39.0, 2.5), (57.5, 3.5)):
        air *= (1 + 1.2 * np.exp(-0.5 * ((t - c) / w) ** 2))[:, None]
    hiss = sosfilt(butter(2, [2500, 7000], 'bandpass', fs=SR, output='sos'), rng.standard_normal((n, 2)), axis=0)
    runner = sosfilt(butter(2, [180, 520], 'bandpass', fs=SR, output='sos'), rng.standard_normal((n, 2)), axis=0)
    shape = env(n, [(0, 0), (RIDE[0], 0), (RIDE[0] + 1.2, 1), (RIDE[1] - 1.5, 1), (RIDE[1] + 0.3, 0), (60, 0)])
    bumps = 0.8 + 0.2 * np.sin(2 * np.pi * 1.7 * t) * np.sin(2 * np.pi * 0.31 * t)
    sled = (0.35 * hiss + 1.0 * runner) * (shape * bumps)[:, None]
    return air / np.sqrt(np.mean(air ** 2)), sled / np.sqrt(np.mean(air ** 2))


def duck_curve(n, lines, depths):
    """0 dB off the lines, each line's depth (dB, negative) on it: raised-cosine ramps ATTACK before, RELEASE after"""
    d = np.zeros(n)
    t = np.arange(n) / SR
    for (s, e), depth in zip(lines, depths):
        a = np.clip((t - (s - ATTACK)) / ATTACK, 0, 1)
        r = np.clip(1 - (t - e) / RELEASE, 0, 1)
        g = np.where(t < s, a, np.where(t <= e, 1.0, r))
        d = np.minimum(d, depth * (0.5 - 0.5 * np.cos(np.pi * g)))
    return db(d)


def clearance(dlg, bed, s, e):
    a, b = int(s * SR), int(e * SR)
    return 10 * np.log10(np.mean(dlg[a:b] ** 2) / (np.mean(bed[a:b] ** 2) + 1e-12))


def true_peak(x):
    return 20 * np.log10(np.max(np.abs(resample_poly(x, 4, 1, axis=0))) + 1e-12)


def limit(x, ceil_db, look=0.003):
    """look-ahead peak limiter on the 4x-oversampled level (true peak), gain smoothed over the look-ahead"""
    thr = db(ceil_db)
    up = np.max(np.abs(resample_poly(x, 4, 1, axis=0)), axis=1)
    lvl = np.maximum(np.max(np.abs(x), axis=1), up[: 4 * len(x)].reshape(len(x), 4).max(1))
    need = np.minimum(1.0, thr / np.maximum(lvl, 1e-12))
    L = max(3, int(look * SR))
    g = uniform_filter1d(minimum_filter1d(need, 2 * L + 1), L)
    rel = int(0.08 * SR)
    g = np.minimum(g, uniform_filter1d(minimum_filter1d(g, rel), rel // 2))
    return x * g[:, None], 20 * np.log10(g.min())


def master(dlg, bed, meter):
    """the dialogue at SPEECH_LUFS, the bed raised or lowered until the limited master reads TARGET_LUFS"""
    lo, hi = -30.0, 12.0
    for _ in range(18):
        b = 0.5 * (lo + hi)
        y, gr = limit(dlg + bed * db(b), CEIL_DBTP - 0.3)
        L = meter.integrated_loudness(y)
        if abs(L - TARGET_LUFS) < 0.05:
            break
        lo, hi = (b, hi) if L < TARGET_LUFS else (lo, b)
    return y, b, gr


def main(dlg_path, tl_path, stems, out):
    os.makedirs(out, exist_ok=True)
    dlg, sr = sf.read(dlg_path)
    assert sr == SR
    n = len(dlg)
    dlg = stereo(dlg)
    lines = [(L['start'], L['end']) for L in json.load(open(tl_path))]
    music = fit(stereo(sf.read(os.path.join(stems, 'music.wav'))[0]), n)
    paper = fit(stereo(sf.read(os.path.join(stems, 'paper.wav'))[0]), n)
    air, sled = ambience(n, np.random.default_rng(1203))

    meter = pyln.Meter(SR)
    t = np.arange(n) / SR
    on = np.zeros(n, bool)
    for s, e in lines:
        on |= (t >= s) & (t < e)
    speech = meter.integrated_loudness(dlg[on])
    dgain = SPEECH_LUFS - speech
    dlg = dlg * db(dgain)
    music *= db(SPEECH_LUFS - meter.integrated_loudness(music))
    amb = (air + sled * 0.8) * db(SPEECH_LUFS - AMB_UNDER_MUSIC - meter.integrated_loudness(air))
    # paper sounds: the harness's own balance, peak 18 dB under the score's peak
    paper *= db(20 * np.log10(np.abs(music).max()) - 18 - 20 * np.log10(np.abs(paper).max() + 1e-12))
    fade = env(n, [(0, 0), (0.05, 1), (58.4, 1), (60, 0)])[:, None]
    depths = [DUCK_DB] * len(lines)
    for _ in range(4):
        duck = duck_curve(n, lines, depths)[:, None]
        bed_ducked = (music * duck + amb * duck + paper) * fade
        full, bgain, gr = master(dlg, bed_ducked, meter)
        clear = [clearance(dlg, bed_ducked * db(bgain), s, e) for s, e in lines]
        if min(clear) >= MIN_CLEAR - 0.2:
            break
        depths = [d - max(0.0, MIN_CLEAR - c) for d, c in zip(depths, clear)]
    nod, _ = limit((music + amb + paper) * fade * db(bgain), CEIL_DBTP - 0.3)

    for name, x in (('mix', full), ('nodialogue', nod)):
        sf.write(os.path.join(out, f'{name}.wav'), x.astype(np.float32), SR, subtype='FLOAT')
        print(f'{name}: {meter.integrated_loudness(x):.2f} LUFS, true peak {true_peak(x):.2f} dBTP, {len(x) / SR:.3f} s')
    print(f'speech {speech:.1f} LUFS on the lines, dialogue gain {dgain:+.2f} dB; bed {bgain:+.2f} dB from the speech level; limiter max {gr:.2f} dB')
    # dialogue over the bed, per line: the speech's level against the ducked bed under it
    for (s, e), c, d in zip(lines, clear, depths):
        print(f'  {s:6.2f}-{e:6.2f}  duck {d:6.1f} dB, speech over bed {c:+.1f} dB')


if __name__ == '__main__':
    main(*sys.argv[1:5])
