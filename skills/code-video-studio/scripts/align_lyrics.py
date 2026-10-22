#!/usr/bin/env python3
"""歌词逐字对齐：人声分离 → 中文识别（逐字时间戳）→ 拼音对齐到用户歌词。

用法: python3 align_lyrics.py song.mp3 lyrics.txt out.json [--models DIR]
输出: [{"text": 歌词行, "start": 秒, "end": 秒, "chars": [每个汉字的秒数]}, ...]
依赖: pip install sherpa-onnx pypinyin librosa soundfile scipy
模型从 GitHub releases 自动下载（云端环境通常只能连 GitHub）。
"""
import argparse, difflib, json, os, subprocess, sys, tarfile, urllib.request
import numpy as np

REL = 'https://github.com/k2-fsa/sherpa-onnx/releases/download'
MODELS = {
    'sep': ('source-separation-models/sherpa-onnx-spleeter-2stems-fp16.tar.bz2', 'sherpa-onnx-spleeter-2stems-fp16'),
    'asr': ('asr-models/sherpa-onnx-paraformer-zh-2023-09-14.tar.bz2', 'sherpa-onnx-paraformer-zh-2023-09-14'),   # 这个版本带逐字时间戳
}


def fetch(models_dir, key):
    rel, name = MODELS[key]
    d = os.path.join(models_dir, name)
    if not os.path.isdir(d):
        os.makedirs(models_dir, exist_ok=True)
        tb = os.path.join(models_dir, os.path.basename(rel))
        print('下载模型', rel); urllib.request.urlretrieve(f'{REL}/{rel}', tb)
        with tarfile.open(tb) as t: t.extractall(models_dir)
        os.remove(tb)
    return d


def separate(song, models_dir):
    import soundfile as sf, sherpa_onnx as so
    m = fetch(models_dir, 'sep')
    wav = song + '.tmp.wav'
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', song, '-ar', '44100', '-ac', '2', wav], check=True)
    cfg = so.OfflineSourceSeparationConfig(model=so.OfflineSourceSeparationModelConfig(
        spleeter=so.OfflineSourceSeparationSpleeterModelConfig(vocals=f'{m}/vocals.fp16.onnx', accompaniment=f'{m}/accompaniment.fp16.onnx'), num_threads=4))
    x, sr = sf.read(wav, dtype='float32', always_2d=True); os.remove(wav)
    out = so.OfflineSourceSeparation(cfg).process(sample_rate=sr, samples=np.ascontiguousarray(x.T))
    return np.array(out.stems[0].data).mean(0), out.sample_rate


def recognize(vocals, sr, models_dir):
    import librosa, scipy.ndimage as nd, sherpa_onnx as so
    m = fetch(models_dir, 'asr')
    y = librosa.resample(vocals, orig_sr=sr, target_sr=16000); sr = 16000
    rec = so.OfflineRecognizer.from_paraformer(paraformer=f'{m}/model.int8.onnx', tokens=f'{m}/tokens.txt', num_threads=4)
    hop = 160; e = librosa.feature.rms(y=y, frame_length=640, hop_length=hop)[0]
    on = nd.binary_closing(nd.uniform_filter1d(e, 10) > max(.012, np.percentile(e, 35)), np.ones(30))
    lab, n = nd.label(on); toks = []
    for i in range(1, n + 1):          # 按人声停顿切块识别
        idx = np.where(lab == i)[0]
        a, b = max(0, idx[0] * hop - 1600), min(len(y), idx[-1] * hop + 1600)
        if b - a < 4000: continue
        s = rec.create_stream(); s.accept_waveform(sr, y[a:b]); rec.decode_stream(s)
        print(f'{a/sr:6.2f}  {s.result.text}')
        toks += [(tk, a / sr + ts) for tk, ts in zip(s.result.tokens, s.result.timestamps)]
    return [(c, t) for tk, t in toks for c in tk if '一' <= c <= '鿿']


def align(lyrics_path, rc, song_len):
    from pypinyin import lazy_pinyin
    lyr = [l.strip() for l in open(lyrics_path, encoding='utf-8') if l.strip() and not l.strip().startswith('[')]
    L = [(c, i) for i, l in enumerate(lyr) for c in l if '一' <= c <= '鿿']
    sm = difflib.SequenceMatcher(None, lazy_pinyin([c for c, _ in L]), lazy_pinyin([c for c, _ in rc]), autojunk=False)
    T = [None] * len(L)
    for a, b, n in sm.get_matching_blocks():
        for k in range(n): T[a + k] = rc[b + k][1]
    known = [i for i, v in enumerate(T) if v is not None]
    for i in range(len(T)):            # 没配上的字按前后插值
        if T[i] is None:
            p = max([j for j in known if j < i], default=None); q = min([j for j in known if j > i], default=None)
            T[i] = T[p] + (T[q] - T[p]) * (i - p) / (q - p) if p is not None and q is not None else (T[p] + .3 * (i - p) if p is not None else T[q] - .3 * (q - i))
    lines = []
    for li, l in enumerate(lyr):
        ts = [round(T[k], 2) for k, (_, i) in enumerate(L) if i == li]
        lines.append({'text': l, 'start': ts[0], 'chars': ts})
    for i, ln in enumerate(lines):
        nxt = lines[i + 1]['start'] if i + 1 < len(lines) else song_len
        ln['end'] = round(min(nxt - .05, ln['chars'][-1] + .6), 2)
    return lines


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('song'); ap.add_argument('lyrics'); ap.add_argument('out')
    ap.add_argument('--models', default=os.path.expanduser('~/.cache/lyric-models'))
    a = ap.parse_args()
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', a.song], capture_output=True, text=True).stdout)
    v, sr = separate(a.song, a.models)
    lines = align(a.lyrics, recognize(v, sr, a.models), dur)
    json.dump(lines, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for l in lines: print(f"{l['start']:7.2f} → {l['end']:7.2f}  {l['text']}")
