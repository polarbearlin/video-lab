"""用户发来的是一整条配音（没有按份分开）时：按配音脚本的分份，在两份之间的停顿处切开。

用法：python3 split_vo.py <豆包配音脚本.md> <整条配音.mp3> <asr_full.json> <输出目录>
- asr_full.json：先用 asr_vo.py 识别整条配音得到（只有一个键 "1"）。
- 输出：<输出目录>/narrator_part1.mp3 …（48 kHz）和按份切好、时间归零的 asr.json，
  之后照常跑 align_vo.py <脚本> <输出目录>/asr.json <输出目录>/lines_aligned.json。
- 切点：第 n 份最后一个字和第 n+1 份第一个字之间，最长那段静音的中点（不会切到字）。
"""
import difflib
import json
import re
import subprocess
import sys

import librosa
import numpy as np

script_md, audio, asr_path, out_dir = sys.argv[1:5]
asr = json.load(open(asr_path, encoding='utf-8'))
t = open(script_md, encoding='utf-8').read()
parts = re.split(r'<!-- ===== 第 \d+/\d+ 份 ===== -->', t)[1:]
P = re.compile(r'[\s，。：；、？！“”"《》（）—…·,:;?!「」『』]')
D = '零一二三四五六七八九'


def n2c(s):
    if '.' in s:
        a, b = s.split('.')
        return n2c(a) + '点' + ''.join(D[int(c)] for c in b)
    n = int(s)
    if n < 10:
        return D[n]
    if n < 20:
        return '十' + (D[n % 10] if n % 10 else '')
    if n < 100:
        return D[n // 10] + '十' + (D[n % 10] if n % 10 else '')
    return ''.join(D[int(c)] for c in s)


RULES = [(re.compile(r'(\d+(?:\.\d+)?)%'), lambda m: '百分之' + n2c(m.group(1))),
         (re.compile(r'\d+(?:\.\d+)?'), lambda m: n2c(m.group(0)))]


def chars_times(words):
    cs = []
    for w, a, b in words:
        ww = P.sub('', w)
        for k, ch in enumerate(ww):
            cs.append([ch, a + (b - a) * k / len(ww), a + (b - a) * (k + 1) / len(ww)])
    s = ''.join(c[0] for c in cs)
    for rx, fn in RULES:
        out, i = [], 0
        for m in rx.finditer(s):
            out.extend(cs[i:m.start()])
            rep = fn(m)
            a, b = cs[m.start()][1], cs[m.end() - 1][2]
            for k, ch in enumerate(rep):
                out.append([ch, a + (b - a) * k / len(rep), a + (b - a) * (k + 1) / len(rep)])
            i = m.end()
        out.extend(cs[i:])
        cs = out
        s = ''.join(c[0] for c in cs)
    return cs


texts = []
for p in parts:
    body = p.split('## 旁白台词')[1].split('\n---')[0]
    texts.append(P.sub('', body).replace('.', ''))
scr = ''.join(texts)
words = [w for s in asr['1'] for w in s['words']]
cs = chars_times(words)
asr_s = ''.join(c[0] for c in cs)
sm = difflib.SequenceMatcher(None, scr, asr_s, autojunk=False)
m = [None] * len(scr)
for blk in sm.get_matching_blocks():
    for k in range(blk.size):
        m[blk.a + k] = blk.b + k
print(f'整条配音与脚本一致度 {sm.ratio():.3f}')

y, sr = librosa.load(audio, sr=16000, mono=True)
dur = len(y) / sr
r = librosa.feature.rms(y=y, frame_length=400, hop_length=160)[0]
db = 20 * np.log10(r + 1e-7)
quiet = db < db.max() - 38


def best_gap(a, b):
    """a–b 之间最长的一段静音的中点。"""
    i0, i1 = int(max(a - 0.3, 0) * 100), int(min(b + 0.3, dur) * 100)
    best, st = None, None
    for i in range(i0, i1 + 1):
        q = i < len(quiet) and quiet[i]
        if q and st is None:
            st = i
        if (not q or i == i1) and st is not None:
            if best is None or i - st > best[1] - best[0]:
                best = (st, i)
            st = None
    return (best[0] + best[1]) / 200 if best else (a + b) / 2


cuts = [0.0]
pos = 0
for k in range(len(texts) - 1):
    pos += len(texts[k])
    last = next(m[i] for i in range(pos - 1, -1, -1) if m[i] is not None)
    first = next(m[i] for i in range(pos, len(scr)) if m[i] is not None)
    a, b = cs[last][2], cs[first][1]
    c = best_gap(a, b)
    print(f'第 {k + 1}/{k + 2} 份分界：上一份末字 {a:.2f}s，下一份首字 {b:.2f}s → 切在 {c:.2f}s')
    cuts.append(c)
cuts.append(dur)
out = {'_meta': {}}
for k in range(len(texts)):
    a, b = cuts[k], cuts[k + 1]
    f = f'{out_dir}/narrator_part{k + 1}.mp3'
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', audio, '-ss', f'{a:.3f}', '-to', f'{b:.3f}',
                    '-ar', '48000', '-c:a', 'libmp3lame', '-b:a', '320k', f], check=True)
    segs = []
    for s in asr['1']:
        ws = [(w, round(x0 - a, 3), round(x1 - a, 3)) for w, x0, x1 in s['words'] if a <= (x0 + x1) / 2 < b]
        if ws:
            segs.append({'start': ws[0][1], 'end': ws[-1][2], 'text': ''.join(w for w, _, _ in ws).strip(), 'words': ws})
    out[str(k + 1)] = segs
    out['_meta'][str(k + 1)] = {'file': f, 'dur': round(b - a, 2), 'offset_in_full': round(a, 3)}
    print(f'第 {k + 1} 份：{a:.2f}–{b:.2f}s（{b - a:.1f} 秒）→ {f}')
json.dump(out, open(f'{out_dir}/asr.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('写出', f'{out_dir}/asr.json')
