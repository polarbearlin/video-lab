#!/usr/bin/env python3
"""v13：用 Suno 生成的歌《大肥鱼》做配乐。把歌剪到和画面对上，再叠一层轻音效 → build/v13_audio.wav
剪法（拍点是 librosa 测出来的，128/129 BPM，剪接点都落在拍子上，节奏不乱）：
1. 从歌的 9.52 秒开始放（前奏剪短）→ 画面 4.6 秒的白光正好落在一个小节的第一拍，主歌"叫我大肥鱼"在 6.4 秒进来；
2. 副歌里去掉"排排队 别慌张"（第 81–89 拍，正好 2 小节）→ "服务器在发烫"落在服务器弹窗那段，"上班摸鱼刷 B 站"落在 B站 章节；
3. 第二段副歌和尾声之间那 1 小节间奏放两遍 → 最后一句"你家的鱼叫什么名字～"在 90 秒前唱完。
python3 demos/deepseek/v13/song.py [--song build/song/suno.mp3]"""
import os, sys, argparse, subprocess, numpy as np, soundfile as sf, librosa
HERE = os.path.dirname(os.path.abspath(__file__)); DS = os.path.dirname(HERE)
ap = argparse.ArgumentParser(); ap.add_argument('--song', default=os.path.join(DS, 'build/song/suno.mp3')); A = ap.parse_args()
SR = 48000; DUR = 91.5   # 片尾卡多停 1.5 秒，让最后一句唱完
y, _ = librosa.load(A.song, sr=SR, mono=False); y = y.T if y.ndim == 2 else np.stack([y, y], 1)
y22 = librosa.to_mono(y.T); y22 = librosa.resample(y22, orig_sr=SR, target_sr=22050)
_, beats = librosa.beat.beat_track(y=y22, sr=22050, units='time')
def beat_near(t): return float(beats[np.argmin(abs(beats - t))])
S0 = beat_near(9.52)                        # 歌从这里开始
CUT_A = beat_near(37.25); CUT_B = float(beats[np.argmin(abs(beats - CUT_A)) + 8])   # 去掉 8 拍：排排队 别慌张
GAP_A = beat_near(87.70); GAP_B = float(beats[np.argmin(abs(beats - GAP_A)) + 4])   # 这 4 拍间奏放两遍
seg = lambda a, b: y[int(a * SR):int(b * SR)]
parts = [seg(S0, CUT_A), seg(CUT_B, GAP_B), seg(GAP_A, len(y) / SR)]
XF = int(.03 * SR)   # 接缝 30 毫秒等功率交叉淡化
out = parts[0]
for p in parts[1:]:
    k = np.linspace(0, np.pi / 2, XF)[:, None]; out = np.concatenate([out[:-XF], out[-XF:] * np.cos(k) + p[:XF] * np.sin(k), p[XF:]])
n = int(DUR * SR); out = out[:n] if len(out) >= n else np.pad(out, ((0, n - len(out)), (0, 0)))
fi = int(.35 * SR); out[:fi] *= np.linspace(0, 1, fi)[:, None]; fo = int(1.0 * SR); out[-fo:] *= np.linspace(1, 0, fo)[:, None]
def to_video(t):   # 歌的时间 → 画面时间
    if t < CUT_A: return t - S0
    if t < GAP_B: return t - S0 - (CUT_B - CUT_A)
    return t - S0 - (CUT_B - CUT_A) + (GAP_B - GAP_A)
print(f'从歌的 {S0:.2f}s 开始；去掉 {CUT_A:.2f}–{CUT_B:.2f}s；重复 {GAP_A:.2f}–{GAP_B:.2f}s')
for t, w in ((15.88, '叫我大肥鱼'), (26.58, '我第一'), (34.18, '人太多我好忙'), (41.84, '服务器在发烫'), (44.92, '上班摸鱼刷B站'), (53.36, '才不是呢'),
             (55.64, '打两个错别字'), (60.0, '凌晨两点'), (71.56, '七点半早安'), (74.02, '这支视频怎么做'), (84.54, '没有一帧手调'), (89.62, '谢谢你'), (94.02, '评论区告诉我'), (97.86, '你家的鱼叫什么名字')):
    print(f'  {w:<10} 画面 {to_video(t):6.2f}s')
# 音效轨（去掉有音高的音效），压在歌下面
sfx_p = os.path.join(DS, 'build/v12_sfx.wav')
subprocess.run([sys.executable, os.path.join(DS, 'v12/audio.py')], env={**os.environ, 'SFX_ONLY': '1'}, check=True, stdout=subprocess.DEVNULL)
fx, _ = sf.read(sfx_p); fx = fx[:n] if len(fx) >= n else np.pad(fx, ((0, n - len(fx)), (0, 0)))
song = out / (np.abs(out).max() + 1e-9) * .9
mix = song + .45 * fx
mix = np.tanh(1.1 * mix) / np.tanh(1.1); mix *= 10 ** (-1.0 / 20) / np.abs(mix).max()
dst = os.path.join(DS, 'build/v13_audio.wav'); sf.write(dst, mix, SR); print(dst)
