"""试片合成：底层视频轨（真实视频 / 图生视频 / 占位插画）+ 网页图层序列（out/ov/*.png，透明）→ 竖屏成片。

用法：cd pilot && node shoot.mjs video 4 && python3 compose.py
音频和字幕直接取完整片 v3 的前 48.79 秒（同一条时间线），所以和正片完全对齐。
"""
import os, sys, json, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'film'))
os.environ.setdefault('VL_OUT', '/home/user/anthropic_ipo_film')
import render as R
import full as Fu
from frame import build as build_frame
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

OUT = os.path.join(HERE, 'out')
BG = os.path.join(OUT, 'bg'); os.makedirs(BG, exist_ok=True)
DUR = 48.79
V = Fu.V
# Grokbot 的图生视频（素材/illus_v2/Pxx.mp4）到了就用；没到先用旧插画慢推占位
PLACE = {'P01': 'illus/I06.png', 'P02': 'illus/I04.png', 'P03': 'illus/I03.png', 'P04': 'illus/I05.png', 'P05': 'illus/I12.png', 'P06': 'illus/I07.png'}


def ground(path):
    """纸框镜头的底：深色 + 红色斜光 + 网格（和网页里的 makeGround 一致）。"""
    im = Image.new('RGB', (1920, 1080), (13, 10, 9)); d = ImageDraw.Draw(im, 'RGBA')
    for x0, w, a in [(-300, 520, 140), (380, 260, 90), (1250, 640, 115)]:
        d.polygon([(x0, 0), (x0 + w, 0), (x0 + w + 900, 1080), (x0 + 900, 1080)], fill=(170, 28, 18, a))
    im = im.filter(ImageFilter.GaussianBlur(40)); d = ImageDraw.Draw(im, 'RGBA')
    for x in range(0, 1920, 48): d.line([(x, 0), (x, 1080)], fill=(255, 240, 220, 12))
    for y in range(0, 1080, 48): d.line([(0, y), (1920, y)], fill=(255, 240, 220, 12))
    im.save(path, quality=92)


def framed(out, rel, t_in, dur):
    """视频装进米黄纸框、轻微倾斜、落在深色底上（参考片的“照片贴在画布上”）。"""
    g = os.path.join(BG, 'ground.jpg')
    if not os.path.exists(g): ground(g)
    vf = (f"[1:v]scale=1560:-2,setsar=1,pad=iw+40:ih+40:20:20:color=0xEFE6D2,format=rgba,rotate=-1.5*PI/180:c=none:ow=rotw(iw):oh=roth(ih)[v];"
          f"[0:v]scale=1920:1080,zoompan=z='1+0.0006*on':d=1:s=1920x1080:fps=30[b];[b][v]overlay=(W-w)/2:(H-h)/2-10,format=yuv420p[o]")
    R.ff(['-loop', '1', '-t', f'{dur}', '-i', g, '-ss', f'{t_in}', '-t', f'{dur}', '-i', R.src_path(rel),
          '-f', 'lavfi', '-t', f'{dur}', '-i', 'anullsrc=r=48000:cl=stereo',
          '-filter_complex', vf, '-map', '[o]', '-map', '2:a', '-t', f'{dur}'] + R.ENC + R.AENC + [out])


def black(out, dur):
    R.ff(['-f', 'lavfi', '-t', f'{dur}', '-i', 'color=c=black:s=1920x1080:r=30', '-f', 'lavfi', '-t', f'{dur}', '-i', 'anullsrc=r=48000:cl=stereo',
          '-map', '0:v', '-map', '1:a', '-t', f'{dur}'] + R.ENC + R.AENC + [out])


def illus(out, key, dur):
    mp4 = R.src_path(f'illus_v2/{key}.mp4')
    if os.path.exists(mp4):
        R.seg_clip(out, f'illus_v2/{key}.mp4', 0.0, dur, zoom=(1.0, 1.04))
    else:
        R.seg_still(out, PLACE[key], dur, zoom=(1.0, 1.16), label=None)


# (起, 止, 类型, 参数)
TRACK = [(0.0, 1.3, 'clip', ('BBG', 0.0)), (1.3, 2.65, 'clip', ('FORBES', 0.5)), (2.65, 3.95, 'clip', ('CHART', 4.0)),
         (3.95, 5.25, 'clip', ('ARREST', 4.0)), (5.25, 6.75, 'clip', ('BELL', 2.0)), (6.75, 8.05, 'black', None),
         (8.05, 11.53, 'illus', 'P01'), (11.53, 14.42, 'framed', ('BELL', 2.0)), (14.42, 16.22, 'illus', 'P02'),
         (16.22, 21.43, 'black', None), (21.43, 24.8, 'illus', 'P03'), (24.8, 27.35, 'clip', ('CNBCA', 2.30)),
         (27.35, 30.08, 'clip', ('PROT', 2.0)), (30.08, 33.21, 'clip', ('ARREST', 2.0)), (33.21, 36.28, 'black', None),
         (36.28, 40.53, 'clip', ('SIGNS', 3.50)), (40.53, 42.65, 'illus', 'P04'), (42.65, 45.72, 'illus', 'P05'), (45.72, DUR, 'illus', 'P06')]


def main():
    segs = []
    for i, (a, b, kind, arg) in enumerate(TRACK):
        d = round(b - a, 4)
        tag = f'{i:02d}_{kind}_{arg if isinstance(arg, str) else (arg[0] if arg else "")}'
        src_mtime = ''
        if kind == 'illus' and os.path.exists(R.src_path(f'illus_v2/{arg}.mp4')):
            tag += '_v'                                   # 图生视频到了：换一个缓存名
        o = os.path.join(BG, tag + '.mp4')
        if not os.path.exists(o):
            if kind == 'clip':
                R.seg_clip(o, V[arg[0]], arg[1], d, zoom=(1.0, 1.06))
            elif kind == 'framed':
                framed(o, V[arg[0]], arg[1], d)
            elif kind == 'black':
                black(o, d)
            else:
                illus(o, arg, d)
        segs.append(o)
    bg = os.path.join(OUT, 'bg.mp4'); R.concat(segs, bg)
    master = os.path.join(OUT, 'master.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', bg, '-framerate', '30', '-i', os.path.join(OUT, 'ov', '%05d.png'),
                    '-filter_complex', '[0:v][1:v]overlay=0:0:shortest=1,format=yuv420p[v]', '-map', '[v]', '-t', f'{DUR}'] + R.ENC + [master], check=True)
    audio = os.path.join(OUT, 'mix.wav')
    full_mix = os.path.join(os.environ['VL_OUT'], 'full', 'mix.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', full_mix, '-t', f'{DUR}', '-af', f'afade=t=out:st={DUR - 0.8}:d=0.8', audio], check=True)
    subs = [(a, min(b, DUR), s) for a, b, s in Fu.build_subs() if a < DUR - 0.05]
    frame_png = os.path.join(OUT, 'frame_vertical.png'); build_frame(frame_png)
    R.package(master, audio, subs, OUT, frame_png, 'Anthropic试片_新方法', which=('v',))
    print('done')


if __name__ == '__main__':
    main()
