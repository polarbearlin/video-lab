"""配音整体变速（保持音高和共振峰，人声不变调、不变尖），并把逐句时间表同步缩放。

用法：python3 speed_vo.py --tempo 1.2 --src 配音/v1 --dst 配音/v1_x1.2
- 处理 src 下所有 .mp3/.wav/.m4a，输出到 dst（同名 mp3，48 kHz）。
- src 里有 lines_aligned.json 的话，起止时间除以 tempo 写到 dst。
- 优先用 ffmpeg 的 rubberband 滤镜（tempo=X:pitch=1:transients=crisp:formant=preserved）；没有就退到 atempo。

经验：豆包克隆音色常常念得偏慢（约 220 字/分钟）。时政口播目标 260–290 字/分钟，
1.2 倍听感最自然；1.25 倍开始发赶。先变速、再排镜头，镜头时间全部按变速后的配音算。
"""
import argparse
import glob
import json
import os
import subprocess

ap = argparse.ArgumentParser()
ap.add_argument('--tempo', type=float, required=True)
ap.add_argument('--src', required=True)
ap.add_argument('--dst', required=True)
a = ap.parse_args()
os.makedirs(a.dst, exist_ok=True)
has_rb = ' rubberband ' in subprocess.run(['ffmpeg', '-hide_banner', '-filters'], capture_output=True, text=True).stdout
af = (f'rubberband=tempo={a.tempo}:pitch=1:transients=crisp:formant=preserved' if has_rb else f'atempo={a.tempo}')


def dur(f):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f],
                                capture_output=True, text=True).stdout)


files = sorted(sum([glob.glob(os.path.join(a.src, e)) for e in ('*.mp3', '*.wav', '*.m4a')], []))
for f in files:
    out = os.path.join(a.dst, os.path.splitext(os.path.basename(f))[0] + '.mp3')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', f, '-af', af, '-ar', '48000',
                    '-c:a', 'libmp3lame', '-q:a', '1', out], check=True)
    print(f'{os.path.basename(f)}: {dur(f):.1f}s -> {dur(out):.1f}s  ({af})')
la = os.path.join(a.src, 'lines_aligned.json')
if os.path.exists(la):
    d = json.load(open(la, encoding='utf-8'))
    for x in d:
        for k in ('start', 'end'):
            if x.get(k) is not None:
                x[k] = x[k] / a.tempo
    json.dump(d, open(os.path.join(a.dst, 'lines_aligned.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print('逐句时间表已缩放', len(d), '行')
