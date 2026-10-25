#!/usr/bin/env python3
"""v11 合成（后 60 秒）：章节大标题 → 左上角进度 / 底部导航 + 主人的话（屏幕左上方的 2D 气泡）+ 白光转场 + 片尾卡 + 配乐 → mp4。
python3 demos/deepseek/v11/compose.py [--frames build/v11render] [--out build/大肥鱼v11_后60秒.mp4]
python3 demos/deepseek/v11/compose.py --sheet 901,1000,…   只把几张预览帧叠上叠加层、拼成审片图
python3 demos/deepseek/v11/compose.py --join build/大肥鱼v10_前30秒_高清.mp4 build/大肥鱼v11_后60秒_高清.mp4 --out build/大肥鱼_完整90秒.mp4"""
import os, sys, math, argparse, subprocess, importlib.util, pathlib
from PIL import Image, ImageDraw
HERE = pathlib.Path(__file__).resolve().parent; DS = HERE.parent; sys.path.insert(0, str(HERE))
import plan as P
spec = importlib.util.spec_from_file_location('ui7', DS / 'v7/ui.py'); ui7 = importlib.util.module_from_spec(spec); spec.loader.exec_module(ui7)
ap = argparse.ArgumentParser()
ap.add_argument('--frames', default=str(DS / 'build/v11render')); ap.add_argument('--out', default=str(DS / 'build/大肥鱼v11_后60秒.mp4'))
ap.add_argument('--sheet', default=''); ap.add_argument('--stills', default=str(DS / 'build/v11st')); ap.add_argument('--join', nargs=2, default=None)
A = ap.parse_args()
W, H = 1920, 1080; OV = DS / 'build/v11ov'; OV.mkdir(parents=True, exist_ok=True); UI = DS / 'build/v11ui'
DUR = P.T1 - P.T0

if A.join:   # 前 30 秒 + 后 60 秒 → 完整 90 秒（重新编码一次，接缝处不跳）
    a, b = A.join   # 声音：前 30 秒重新生成一份不淡出的，和后 60 秒的配乐直接接上（同一个拍子）
    subprocess.run([sys.executable, str(DS / 'v10/audio.py')], env={**os.environ, 'NOFADE': '1'}, check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', a, '-i', b, '-i', str(DS / 'build/v10_audio.wav'), '-i', str(DS / 'build/v11_audio.wav'),
                    '-filter_complex', '[0:v][1:v]concat=n=2:v=1:a=0[v];[2:a][3:a]concat=n=2:v=0:a=1[a]', '-map', '[v]', '-map', '[a]',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', A.out], check=True); print(A.out); sys.exit()

def smooth(a): a = max(0., min(1., a)); return a * a * (3 - 2 * a)
def back_out(a, s=1.7): a = max(0., min(1., a)) - 1; return a * a * ((s + 1) * a + s) + 1
def state(t):
    """这一刻叠加层的状态：(章节序号, 是否大号, 主人气泡(名字, 缩放档), 片尾卡透明度档)"""
    ch, big = None, False
    for c in P.CH:
        if t >= c['t']: ch, big = c['i'], t < c['t'] + 4 * P.BEAT   # 大号标题停 4 拍再缩到角落
    if P.CUT - .5 <= t < P.CUT + .9: ch = None if t >= P.CUT else ch   # 钻传送门那一下先把导航收掉，白光过后再回来
    bub = None
    for a, z, n, who in P.LINES:
        if who == 'cam' and a <= t < z:
            s = back_out((t - a) / .25) * (1 - smooth((t - (z - .2)) / .2)); bub = (n, round(s * 10) / 10)
    end = round(smooth((t - P.ENDCARD) / .5) * 8) / 8 if t >= P.ENDCARD else 0
    if end: ch = None
    return ch, big, bub, end
def layer(st, w=W, h=H):
    ch, big, bub, end = st
    im = ui7.overlay(w, h, chapter=ch, big=big, nav=ch is not None, title=None) if ch is not None else Image.new('RGBA', (w, h), (0, 0, 0, 0))
    if bub and bub[1] > .05:   # 主人的话：屏幕左上方弹出来
        b = Image.open(UI / f'{bub[0]}.png').convert('RGBA'); bh = int(h * .115 * bub[1]); bw = int(b.width * bh / b.height)
        b = b.resize((max(bw, 1), max(bh, 1)), Image.LANCZOS); x0, y0 = int(w * .06), int(h * .27)
        im.alpha_composite(b, (x0, y0 + int(h * .115 * (1 - bub[1]) / 2)))
    if end:
        e = Image.open(UI / 'endcard.png').convert('RGBA').resize((w, h), Image.LANCZOS); e.putalpha(e.getchannel('A').point(lambda v: int(v * end)))
        im.alpha_composite(e)
    return im

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
segs, last, start = [], None, P.F0
for f in range(P.F0, P.F1 + 2):
    st = state((f - 1) / P.FPS) if f <= P.F1 else 'END'
    if st != last:
        if last is not None: segs.append((start, f - 1, last))
        last, start = st, f
lst = OV / 'list.txt'
with open(lst, 'w') as fo:
    for i, (a, z, st) in enumerate(segs):
        p = OV / f'ov{i:03d}.png'; layer(st).save(p); fo.write(f"file '{p}'\nduration {(z - a + 1) / P.FPS:.4f}\n")
    fo.write(f"file '{OV / f'ov{len(segs) - 1:03d}.png'}'\n")
audio = DS / 'build/v11_audio.wav'; fl0, fl1, cut = P.FLASH[0] - P.T0, P.FLASH[1] - P.T0, P.CUT - P.T0
cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(P.FPS), '-start_number', str(P.F0), '-i', f'{A.frames}/f_%04d.png', '-f', 'concat', '-safe', '0', '-i', str(lst), '-i', str(audio),
       '-f', 'lavfi', '-i', f'color=white:size={W}x{H}:duration={DUR}:rate={P.FPS},format=rgba',
       '-filter_complex', (f'[0:v]scale={W}:{H}:flags=lanczos[b];[1:v]fps={P.FPS},format=rgba[o];[b][o]overlay=0:0:shortest=1[v1];'
                           f'[3:v]fade=t=in:st={fl0:.3f}:d={cut - fl0:.3f}:alpha=1,fade=t=out:st={cut:.3f}:d={fl1 - cut:.3f}:alpha=1[wf];'   # 钻进传送门的白光
                           f'[v1][wf]overlay=0:0[v]'), '-map', '[v]', '-map', '2:a',
       '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-t', str(DUR), A.out]
subprocess.run(cmd, check=True); print(A.out)
