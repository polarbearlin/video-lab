#!/usr/bin/env python3
"""爱泼斯坦案：整条旁白（audio/vo_full.wav）→ film.json（每段画面起止 + 逐字时间）、cues.json、out/epstein.srt。
做法同 midterms/film/tools/build_doubao.py：ASR 逐字对齐台词 → 估计段落切点 → 吸附到附近停顿。旁白整条连续播放。
在 film/ 下运行：python3 tools/build.py
"""
import json, re, subprocess, difflib, os
import numpy as np
SR = 48000; LEAD = 0.4; TAIL = 2.6
BEATS = json.load(open('data/beats.json'))
DIG = '零一二三四五六七八九'
def num_zh(tok):
    if '.' in tok:
        i, f = tok.split('.'); return num_zh(i) + '点' + ''.join(DIG[int(c)] for c in f)
    n = int(tok)
    if len(tok) == 4 and 1900 <= n <= 2099: return ''.join(DIG[int(c)] for c in tok)
    if n == 0: return '零'
    out, units = '', ['', '十', '百', '千']
    for big, name in ((10 ** 8, '亿'), (10 ** 4, '万'), (1, '')):
        q, n = divmod(n, big)
        if q == 0: continue
        s = ''
        for p in range(3, -1, -1):
            d = (q // 10 ** p) % 10
            if d: s += DIG[d] + units[p]
            elif s and not s.endswith('零') and q % (10 ** p): s += '零'
        out += s + name
    return re.sub(r'^一十', '十', out)
HOMO = str.maketrans({'两': '二', '德': '得', '艾': '爱', '波': '泼', '思': '斯', '维': '韦', '〇': '零'})
def norm_tok(t):
    t = re.sub(r'\d+(?:\.\d+)?', lambda m: num_zh(m.group(0)), t)
    return ''.join(re.findall(r'[一-鿿A-Za-z〇]', t)).translate(HOMO)
strip = lambda s: re.sub(r'[\s，。、：；？！,.:;?!《》“”"\'（）()—·]', '', s)
def tokens(zh):
    return [(len(strip(m.group(0))), norm_tok(m.group(0))) for m in re.finditer(r'\d+(?:\.\d+)?|.', zh)]

x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', 'audio/vo_full.wav', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout, np.float32)
VO = len(x) / SR
hop = int(0.01 * SR); fr = np.sqrt(np.convolve(x ** 2, np.ones(hop * 2) / (hop * 2), 'same')[::hop] + 1e-12)
db = 20 * np.log10(fr / (fr.max() + 1e-9)); quiet = db < -42
runs, i = [], 0
while i < len(quiet):
    if quiet[i]:
        j = i
        while j < len(quiet) and quiet[j]: j += 1
        if (j - i) * 0.01 >= 0.15: runs.append(((i + j) / 2 * 0.01, (j - i) * 0.01, i * 0.01, j * 0.01))
        i = j
    else: i += 1

ch = []
for s in json.load(open('data/asr_small.json')):
    for w, w0, w1 in s['w']:
        t = norm_tok(w)
        if t: d = (w1 - w0) / len(t); ch += [(c, w0 + k * d, w0 + (k + 1) * d) for k, c in enumerate(t)]
asr = ''.join(c for c, _, _ in ch); tS = np.array([c[1] for c in ch]); tE = np.array([c[2] for c in ch])
script, starts, btok = '', [], []
for _, _, zh in BEATS:
    starts.append(len(script)); tk = tokens(zh); btok.append(tk); script += ''.join(n for _, n in tk)
sm = difflib.SequenceMatcher(None, script, asr, autojunk=False)
pa, pb = [-1], [-1]
for m in sm.get_matching_blocks():
    for k in range(m.size): pa.append(m.a + k); pb.append(m.b + k)
pa.append(len(script)); pb.append(len(asr)); pa, pb = np.array(pa, float), np.array(pb, float)
print(f'ASR 与台词相似度 {sm.ratio():.3f}')
def time_at(k, edge):
    j = min(max(float(np.interp(k, pa, pb)), 0), len(ch) - 1)
    return float(np.interp(j, np.arange(len(ch)), tS if edge == 's' else tE))
est = []
for k in starts[1:]:
    lo, hi = time_at(k - 1, 'e'), time_at(k, 's')
    if hi < lo: lo, hi = hi, lo
    est.append(((lo + hi) / 2, lo, hi))
def cost(i, r):
    e, lo, hi = est[i]; d = 0.0 if lo - 0.15 <= r[0] <= hi + 0.15 else min(abs(r[0] - lo), abs(r[0] - hi))
    return 4.0 * d + 0.3 * abs(r[0] - e) - 1.0 * min(r[1], 1.0)
k, m = len(est), len(runs); INF = 1e18; DP = np.full((k + 1, m + 1), INF); DP[0, :] = 0; P = np.zeros((k + 1, m + 1), int)
for i in range(1, k + 1):
    best, arg = INF, -1
    for j in range(i, m + 1):
        if DP[i - 1, j - 1] < best: best, arg = DP[i - 1, j - 1], j - 1
        DP[i, j] = best + cost(i - 1, runs[j - 1]); P[i, j] = arg
j = int(np.argmin(DP[k, k:])) + k; chosen = []
for i in range(k, 0, -1): chosen.append(runs[j - 1]); j = P[i, j]
cuts = [0.0] + [c[0] for c in chosen[::-1]] + [VO]

beats = []
for n, (bid, sec, zh) in enumerate(BEATS):
    t0 = LEAD + (0.0 if n == 0 else cuts[n]); t1 = LEAD + cuts[n + 1] if n + 1 < len(BEATS) else LEAD + VO + TAIL
    chars, pos = [], starts[n]
    for nz, nr in btok[n]:
        if nz == 0: pos += len(nr); continue
        a0 = time_at(pos, 's'); a1 = time_at(pos + max(len(nr), 1) - 1, 'e') if nr else a0
        for q in range(nz): chars.append(LEAD + a0 + (a1 - a0) * q / nz - t0)
        pos += len(nr)
    chars = [round(max(0.0, c), 3) for c in np.maximum.accumulate(np.array(chars))]
    beats.append({'id': bid, 'sec': sec, 't': round(t0, 3), 'dur': round(t1 - t0, 3), 'zh': zh, 'chars': chars})
DUR = round(LEAD + VO + TAIL, 2)

cues = []
def split(zh):
    sg, cur = [], ''
    for c in zh:
        if c in '”"' and not cur and sg: sg[-1] += c; continue
        cur += c
        if c in '，。；：？！' and len(strip(cur)) >= 6: sg.append(cur); cur = ''
    if cur: sg.append(cur)
    out = []
    for s in sg:
        if out and len(strip(out[-1])) + len(strip(s)) <= 18: out[-1] += s
        else: out.append(s)
    return [s.rstrip('，；：') for s in out]
for b in beats:
    pos = 0
    for s in split(b['zh']):
        n = len(strip(s)); c0 = b['chars'][min(pos, len(b['chars']) - 1)]; pos += n
        c1 = b['chars'][pos] if pos < len(b['chars']) else b['dur']
        cues.append({'t0': round(b['t'] + c0 - 0.08, 2), 't1': round(b['t'] + c1 - 0.05, 2), 'zh': s.rstrip('。')})
for a_, b2 in zip(cues, cues[1:]):
    if a_['t1'] > b2['t0']: a_['t1'] = b2['t0']
json.dump({'name': 'epstein', 'size': [1920, 1080], 'fps': 30, 'dur': DUR, 'voAt': LEAD, 'beats': beats}, open('film.json', 'w'), ensure_ascii=False, indent=1)
json.dump(cues, open('cues.json', 'w'), ensure_ascii=False, indent=1)
def ts(v): h, mm, s = int(v // 3600), int(v % 3600 // 60), v % 60; return f"{h:02d}:{mm:02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}"
os.makedirs('out', exist_ok=True)
with open('out/epstein.srt', 'w') as f:
    for i, c in enumerate(cues, 1): f.write(f"{i}\n{ts(c['t0'])} --> {ts(c['t1'])}\n{c['zh']}\n\n")
for b in beats: print(f"{b['id']} {b['t']:7.2f} {b['dur']:5.2f}s {b['zh'][:16]}")
print('总长', DUR, 's；字幕', len(cues), '条')
