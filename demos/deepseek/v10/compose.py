#!/usr/bin/env python3
"""v10 合成：章节大标题 → 左上角进度 / 底部导航 + 白光转场 + 配乐 → mp4。
python3 demos/deepseek/v10/compose.py [--frames build/v10render] [--out build/大肥鱼v10_前30秒.mp4]
python3 demos/deepseek/v10/compose.py --sheet 30,75,…   只把几张预览帧叠上叠加层、拼成审片图"""
import os, sys, argparse, subprocess, importlib.util, pathlib
from PIL import Image, ImageDraw
HERE = pathlib.Path(__file__).resolve().parent; DS = HERE.parent; sys.path.insert(0, str(HERE))
import plan as P
spec = importlib.util.spec_from_file_location('ui7', DS / 'v7/ui.py'); ui7 = importlib.util.module_from_spec(spec); spec.loader.exec_module(ui7)
ap = argparse.ArgumentParser()
ap.add_argument('--frames', default=str(DS / 'build/v10render')); ap.add_argument('--out', default=str(DS / 'build/大肥鱼v10_前30秒.mp4'))
ap.add_argument('--sheet', default=''); ap.add_argument('--stills', default=str(DS / 'build/v10st'))
A = ap.parse_args()
W, H = 1920, 1080; OV = DS / 'build/v10ov'; OV.mkdir(parents=True, exist_ok=True)

def state(t):
    """这一刻叠加层的状态：(章节序号或 None, 是否大号, 片头标题)"""
    ch, big = None, False
    for i, c in enumerate(P.CH):
        if t >= c['t']: ch, big = i, t < c['t'] + 4 * P.BEAT   # 大号标题停 4 拍再缩到角落
    title = None
    return ch, big, title
def layer(st, w=W, h=H):
    ch, big, title = st; return ui7.overlay(w, h, chapter=ch, big=big, nav=ch is not None, title=title)

if A.sheet:
    fs = [int(x) for x in A.sheet.split(',')]; tiles = []
    for f in fs:
        t = (f - 1) / P.FPS; im = Image.open(f'{A.stills}/still_{f:04d}.png').convert('RGBA').resize((960, 540), Image.LANCZOS)
        im.alpha_composite(layer(state(t), 960, 540)); tiles.append((t, im.convert('RGB')))
    cols = 3; rows = (len(tiles) + cols - 1) // cols; S = Image.new('RGB', (cols * 964, rows * 574), '#0b0f22'); d = ImageDraw.Draw(S)
    for i, (t, im) in enumerate(tiles):
        x, y = (i % cols) * 964, (i // cols) * 574; d.text((x + 6, y + 4), f'{t:.1f}s', font=ui7.font(24, 800), fill='#ffd36b'); S.paste(im, (x, y + 32))
    out = f'{A.stills}/audit_sheet.jpg'; S.save(out, quality=88); print(out); sys.exit()

# 整片：叠加层只在状态变化时生成一张，用 ffmpeg concat 做成一条透明视频再叠
segs, last, start = [], None, 0
for f in range(1, P.N + 2):
    st = state((f - 1) / P.FPS) if f <= P.N else 'END'
    if st != last:
        if last is not None: segs.append((start, f - 1, last))
        last, start = st, f
lst = OV / 'list.txt'
with open(lst, 'w') as fo:
    for i, (a, z, st) in enumerate(segs):
        p = OV / f'ov{i:02d}.png'; layer(st).save(p); fo.write(f"file '{p}'\nduration {(z - a + 1) / P.FPS:.4f}\n")
    fo.write(f"file '{OV / f'ov{len(segs) - 1:02d}.png'}'\n")
audio = DS / 'build/v10_audio.wav'
cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(P.FPS), '-i', f'{A.frames}/f_%04d.png', '-f', 'concat', '-safe', '0', '-i', str(lst), '-i', str(audio),
       '-f', 'lavfi', '-i', f'color=white:size={W}x{H}:duration={P.DUR}:rate={P.FPS},format=rgba',
       '-filter_complex', (f'[0:v]scale={W}:{H}:flags=lanczos[b];[1:v]fps={P.FPS},format=rgba[o];[b][o]overlay=0:0:shortest=1[v1];'
                           f'[3:v]fade=t=in:st={P.FLASH[0]}:d={P.CUT - P.FLASH[0]:.3f}:alpha=1,fade=t=out:st={P.CUT}:d={P.FLASH[1] - P.CUT:.3f}:alpha=1[wf];'   # 钻进传送门的白光
                           f'[v1][wf]overlay=0:0[v]'), '-map', '[v]', '-map', '2:a',
       '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-t', str(P.DUR), A.out]
subprocess.run(cmd, check=True); print(A.out)
