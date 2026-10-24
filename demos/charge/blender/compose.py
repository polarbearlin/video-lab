#!/usr/bin/env python3
"""Blender 渲染 + 网页字幕层 → 成片。热成像（51–62.25 s）在这里做：亮度 → 铁红 / 冰蓝色板、手机发热光斑、扫描线擦入、收成一个点。

用法（仓库根目录）：
  python3 demos/charge/blender/compose.py                       # build/render/NNNNN.png → build/charge3d_back45.mp4
  python3 demos/charge/blender/compose.py --still build/render/still_53.80.png --t 53.8   # 单张检查
"""
import argparse, json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument('--build', default=os.path.join(HERE, 'build'))
ap.add_argument('--render', default=os.path.join(HERE, 'build/render'))
ap.add_argument('--out', default=os.path.join(HERE, 'build/charge3d_back45.mp4'))
ap.add_argument('--still', default=''); ap.add_argument('--t', type=float, default=0)
A = ap.parse_args()
J = json.load(open(os.path.join(A.build, 'frames.json')))
FR, FIRST, STEP = J['frames'], J['first'], J.get('step', 1)
W, H = 1080, 1920

IRON = [(0, (0, 0, 10)), (.18, (40, 0, 90)), (.35, (120, 0, 150)), (.52, (200, 30, 100)), (.66, (235, 90, 20)), (.8, (252, 170, 0)), (.92, (255, 230, 90)), (1, (255, 255, 235))]
ICE = [(0, (0, 2, 12)), (.25, (10, 30, 90)), (.5, (20, 90, 170)), (.72, (70, 170, 230)), (.88, (170, 225, 250)), (1, (245, 252, 255))]
def lut(P):
    xs = np.array([p[0] for p in P]); cs = np.array([p[1] for p in P], float)
    v = np.linspace(0, 1, 256); return np.stack([np.interp(v, xs, cs[:, c]) for c in range(3)], 1).astype(np.uint8)
LUT_IRON, LUT_ICE = lut(IRON), lut(ICE)
clamp = lambda x, a=0., b=1.: min(b, max(a, x))
prog = lambda t, a, b: clamp((t - a) / (b - a))
eio = lambda x: 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2
eout = lambda x: 1 - (1 - x) ** 3
def temp_at(t):
    if t < 51.8: return 31
    if t < 54.2: return 31 + (43.6 - 31) * eout(prog(t, 51.8, 54.0))
    if t < 57.4: return 43.6
    return 43.6 + (-5 - 43.6) * eout(prog(t, 57.4, 58.2))

def frame_info(t):
    i = min(range(len(FR)), key=lambda j: abs(FR[j]['t'] - t)); return FR[i]

def thermal(img, t, px, py):
    """和网页版 drawThermal 同一套算法：在 1/4 分辨率上算，再放大模糊。"""
    cold = t >= 57.4; heat = 0 if cold else prog(temp_at(t), 31, 43.6)
    small = np.asarray(img.convert('RGB').resize((270, 480), Image.BILINEAR), float) / 255
    v = .15 + (small[..., 0] * .3 + small[..., 1] * .59 + small[..., 2] * .11) * .55
    yy, xx = np.mgrid[0:480, 0:270]
    hb = np.exp(-(((xx * 4 - px) / 320) ** 2 + ((yy * 4 - py) / 210) ** 2) * 2.2)
    v += hb * (-.25 if cold else .25 + .45 * heat)
    v += (np.sin(yy * 1.7 + t * 40) * .5 + .5) * .02
    th = (LUT_ICE if cold else LUT_IRON)[(np.clip(v, 0, 1) * 255).astype(int)]
    th = Image.fromarray(th).resize((W, H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(2))
    mask = Image.new('L', (W, H), 0); m = np.zeros((H, W), np.uint8)
    scan = int(H * eio(prog(t, 51.0, 51.8))); m[:scan] = 255
    col = eio(prog(t, 61.6, 62.2))
    if col > 0:   # 收成准星中心的一个点
        r = max(.1, 2300 * (1 - col)); Y, X = np.ogrid[0:H, 0:W]; m[(X - px) ** 2 + (Y - py) ** 2 > r * r] = 0
    mask = Image.fromarray(m)
    return Image.composite(th, img.convert('RGB'), mask)

def compose(path_render, t, path_overlay):
    img = Image.open(path_render).convert('RGB')
    if img.size != (W, H): img = img.resize((W, H), Image.LANCZOS)
    if 51.0 <= t < 62.25:
        px, py = frame_info(t)['therm']; img = thermal(img, t, px, py)
    if path_overlay and os.path.exists(path_overlay):
        ov = Image.open(path_overlay).convert('RGBA')
        img = Image.alpha_composite(img.convert('RGBA'), ov).convert('RGB')
    return img

def ov_path(fnum): return os.path.join(A.build, 'overlay', f'{fnum:05d}.png')
def t2fnum(t):
    i = min(range(len(FR)), key=lambda j: abs(FR[j]['t'] - t)); return FR[i].get('f', FIRST + i * STEP)

if A.still:
    out = A.still.replace('.png', '_comp.png'); compose(A.still, A.t, ov_path(t2fnum(A.t))).save(out); print(out); sys.exit()

files = sorted(f for f in os.listdir(A.render) if f[:5].isdigit() and f.endswith('.png'))
if not files: sys.exit('build/render 里没有 NNNNN.png（先用 scene.py --render 渲染）')
ff = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', '30', '-i', '-',
                       '-c:v', 'libx264', '-profile:v', 'high', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', A.out], stdin=subprocess.PIPE)
for k, f in enumerate(files):
    n = int(f[:5]); t = (n - 1) / 30
    ff.stdin.write(compose(os.path.join(A.render, f), t, ov_path(n)).tobytes())
    if k % 60 == 0: print(f'  {k}/{len(files)}  t={t:.2f}')
ff.stdin.close(); ff.wait(); print('done →', A.out)
