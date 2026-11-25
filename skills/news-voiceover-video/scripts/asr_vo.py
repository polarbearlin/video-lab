"""配音逐字识别（faster-whisper，带每个字的时间），给 align_vo.py 用。

用法：python3 asr_vo.py --out 配音/v1/asr.json --prompt "黄仁勋，英伟达，特朗普" 配音/v1/narrator_part1.mp3 配音/v1/narrator_part2.mp3 ...
- 文件按份的顺序给（第 1 份、第 2 份……），输出里的键就是 "1"、"2"……
- --prompt 填片中的人名、机构、专有名词，能明显减少识别错字。
- 模型默认 medium（CPU 上 5 分钟配音约 3–6 分钟）；装不上自动退到 small。
"""
import argparse
import json
import subprocess

import numpy as np
from faster_whisper import WhisperModel

ap = argparse.ArgumentParser()
ap.add_argument('files', nargs='+')
ap.add_argument('--out', required=True)
ap.add_argument('--prompt', default='')
ap.add_argument('--model', default='medium')
a = ap.parse_args()
try:
    m = WhisperModel(a.model, device='cpu', compute_type='int8')
except Exception as e:  # noqa: BLE001
    print('退到 small：', e)
    m = WhisperModel('small', device='cpu', compute_type='int8')
out = {'_meta': {}}
for i, f in enumerate(a.files, 1):
    pcm = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', f, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    audio = np.frombuffer(pcm, dtype=np.float32)
    segs, _ = m.transcribe(audio, language='zh', word_timestamps=True, initial_prompt=a.prompt or None,
                           vad_filter=False, condition_on_previous_text=True)
    segs = [{'start': s.start, 'end': s.end, 'text': s.text.strip(),
             'words': [(w.word, round(w.start, 3), round(w.end, 3)) for w in s.words]} for s in segs]
    out[str(i)] = segs
    out['_meta'][str(i)] = {'file': f, 'dur': round(len(audio) / 16000, 2)}
    for s in segs:
        print(f'P{i} {s["start"]:6.2f}-{s["end"]:6.2f} {s["text"]}')
json.dump(out, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('写出', a.out)
