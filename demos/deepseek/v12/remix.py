#!/usr/bin/env python3
"""v12 合成：在已经渲好的完整 90 秒成片上，叠大事记卡（MG 动画）+ 换成新配乐。不需要 Blender。
python3 demos/deepseek/v12/remix.py --video build/大肥鱼_自我介绍_完整90秒.mp4 [--out build/大肥鱼_自我介绍_90秒_v12.mp4]
python3 demos/deepseek/v12/remix.py --sheet   只出一张审片图（从成片里抽帧 + 叠卡片）"""
import os, sys, argparse, subprocess, pathlib
from PIL import Image, ImageDraw
HERE = pathlib.Path(__file__).resolve().parent; DS = HERE.parent; sys.path.insert(0, str(HERE))
import plan as P, mg
ap = argparse.ArgumentParser()
ap.add_argument('--video', default=str(DS / 'build/大肥鱼_自我介绍_完整90秒.mp4')); ap.add_argument('--out', default=str(DS / 'build/大肥鱼_自我介绍_90秒_v12.mp4'))
ap.add_argument('--audio', default=str(DS / 'build/v12_audio.wav')); ap.add_argument('--sheet', action='store_true')
A = ap.parse_args()
W, H = 1920, 1080; OV = DS / 'build/v12ov'; OV.mkdir(parents=True, exist_ok=True)

if A.sheet:
    ts = [7.6, 9.9, 15.4, 16.9, 19.0, 23.5, 25.0, 36.5, 52.0, 75.0]; tiles = []
    for t in ts:
        f = OV / 'grab.png'; subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(t), '-i', A.video, '-frames:v', '1', str(f)], check=True)
        im = Image.open(f).convert('RGBA'); c = mg.card(t)
        if c: im.alpha_composite(c)
        tiles.append((t, im.convert('RGB').resize((960, 540), Image.LANCZOS)))
    S = Image.new('RGB', (2 * 964, 5 * 574), '#0b0f22'); d = ImageDraw.Draw(S)
    for i, (t, im) in enumerate(tiles):
        x, y = (i % 2) * 964, (i // 2) * 574; d.text((x + 6, y + 4), f'{t:.1f}s', font=mg.F(24, 800), fill='#ffd36b'); S.paste(im, (x, y + 32))
    out = DS / 'build/v12_sheet.jpg'; S.save(out, quality=88); print(out); sys.exit()

# 叠加层逐帧出图（没有卡片的帧都指向同一张透明图）
blank = OV / 'blank.png'; Image.new('RGBA', (W, H), (0, 0, 0, 0)).save(blank)
for f in range(1, P.N + 1):
    t = (f - 1) / P.FPS; dst = OV / f'o_{f:04d}.png'
    if dst.exists() or dst.is_symlink(): dst.unlink()
    c = mg.card(t)
    if c is None: os.symlink(blank, dst)
    else: c.save(dst, compress_level=1)
if not os.path.exists(A.audio): subprocess.run([sys.executable, str(HERE / 'audio.py')], check=True)
cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-i', A.video, '-framerate', str(P.FPS), '-i', str(OV / 'o_%04d.png'), '-i', A.audio,
       '-filter_complex', '[1:v]format=rgba[o];[0:v][o]overlay=0:0:shortest=1[v]', '-map', '[v]', '-map', '2:a',
       '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-t', str(P.DUR), A.out]
subprocess.run(cmd, check=True); print(A.out)
