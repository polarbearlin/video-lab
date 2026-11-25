"""配乐分析：测拍速、找小节线、按 4 小节一块列出响度 / 低频 / 亮度 / 打击乐比例，可选检测人声。

用法：python3 music_bars.py <曲子.mp3> [--bpm 100] [--name suno_a] [--json bars.json] [--vocal]
- --bpm：已知速度就填（Suno 提示词里写的 BPM），拍点会稳很多。
- --json：把 {name: {bar, bars, blocks}} 合并写进这个文件（score.join_segments 和 full.py 的 snap() 用它）。
- --vocal：用 faster-whisper small 听一遍，报告有没有能识别出的歌词（纯音乐也偶尔会冒人声）。

怎么读结果
- 每块 = 4 小节。响度和打击乐比例一起高 → 鼓组全开，适合钩子 / 推进段；低频低、亮度低 → 安静段，适合认错信、质疑、结尾。
- 剪配乐时只在小节线上切（score.join_segments 在切点做 60 ms 交叉淡化），段落之间就不会乱拍。
"""
import argparse
import json
import os

import librosa
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('file')
ap.add_argument('--bpm', type=float)
ap.add_argument('--name')
ap.add_argument('--json')
ap.add_argument('--vocal', action='store_true')
a = ap.parse_args()
name = a.name or os.path.splitext(os.path.basename(a.file))[0]
y, sr = librosa.load(a.file, sr=22050, mono=True)
hop = 512
oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
kw = dict(start_bpm=a.bpm, tightness=400) if a.bpm else {}
tempo, beats = librosa.beat.beat_track(onset_envelope=oenv, sr=sr, hop_length=hop, **kw)
bt = librosa.frames_to_time(beats, sr=sr, hop_length=hop)
# 小节第一拍的相位：低频重拍最强的那一路
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))
f = librosa.fft_frequencies(sr=sr, n_fft=2048)
lowenv = S[f < 120].sum(0)
fr = librosa.time_to_frames(bt, sr=sr, hop_length=hop)
ph = int(np.argmax([lowenv[fr[k::4]].mean() for k in range(4)]))
bars = bt[ph::4]
H, Pp = librosa.effects.hpss(y)
rows = []
for i in range(0, len(bars) - 4, 4):
    s0, s1 = int(bars[i] * sr), int(bars[i + 4] * sr)
    seg, h, p = y[s0:s1], H[s0:s1], Pp[s0:s1]
    rms = 20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)
    Ss = np.abs(librosa.stft(seg, n_fft=2048))
    low = 20 * np.log10(Ss[f < 110].sum(0).mean() + 1e-6)
    cen = librosa.feature.spectral_centroid(y=seg, sr=sr).mean()
    perc = (p ** 2).sum() / ((h ** 2).sum() + (p ** 2).sum() + 1e-9)
    rows.append(dict(a=round(float(bars[i]), 2), b=round(float(bars[i + 4]), 2), rms=round(float(rms), 1),
                     low=round(float(low), 1), bright=int(cen), perc=round(float(perc), 2)))
bar = float(np.median(np.diff(bars)))
print(f'== {name}  时长 {len(y) / sr:.1f}s  速度约 {float(np.atleast_1d(tempo)[0]):.1f} BPM  '
      f'小节长 {bar:.3f}s  第一条小节线 {bars[0]:.2f}s  共 {len(bars)} 小节')
print('  块   起-止(秒)        响度   低频  亮度  打击乐')
for k, r in enumerate(rows):
    print(f"  {k:2d} {r['a']:6.1f}-{r['b']:6.1f}  {r['rms']:6.1f} {r['low']:6.1f} {r['bright']:5d}  {r['perc']:.2f}")
if a.vocal:
    from faster_whisper import WhisperModel
    wm = WhisperModel('small', device='cpu', compute_type='int8')
    a16 = librosa.resample(y, orig_sr=sr, target_sr=16000).astype(np.float32)
    segs, _ = wm.transcribe(a16, vad_filter=True)
    ws = [(round(s.start), s.text.strip()) for s in segs if s.avg_logprob > -0.9 and s.no_speech_prob < 0.5]
    print('  人声检测：', ws[:8] if ws else '无')
if a.json:
    d = json.load(open(a.json)) if os.path.exists(a.json) else {}
    d[name] = dict(bar=bar, bars=[round(float(x), 3) for x in bars], blocks=rows)
    json.dump(d, open(a.json, 'w'), ensure_ascii=False)
    print('写入', a.json)
