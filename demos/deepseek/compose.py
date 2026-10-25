#!/usr/bin/env python3
"""把 Blender 渲出来的帧 + 字幕 + 配乐合成成片。
python3 demos/deepseek/compose.py [--frames build/render] [--out build/大肥鱼_30s.mp4]
同时出一版「只有音效」的（方便配平台热门音乐）。帧是半分辨率预览也行，会自动放大到 1080×1920。"""
import os, re, sys, json, argparse, subprocess
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import timeline as TL

HERE = os.path.dirname(os.path.abspath(__file__)); B = os.path.join(HERE, 'build')
ap = argparse.ArgumentParser()
ap.add_argument('--frames', default=os.path.join(B, 'render'))
ap.add_argument('--out', default=os.path.join(B, '大肥鱼_30s.mp4'))
A = ap.parse_args()
FONT = os.path.join(HERE, '../../assets/fonts/NotoSansSC.ttf')
W, H = 1080, 1920
CREDIT = '3D 模型：azwosile/DeepSeek-whale-girl-3D　形象：溟月（上善无形）/ ZipZipPipe 二创　CC BY-NC-SA 4.0'

def font(px, w=800):
    f = ImageFont.truetype(FONT, px)
    try: f.set_variation_by_axes([w])
    except Exception: pass
    return f

def caption(text, path, credit=False):
    """白色圆角气泡字幕，【】里的字用 DeepSeek 蓝；左上角一个小标签"""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im); f = font(58)
    lines = text.split('\n')
    segs = [[(m.group(1) or m.group(2), bool(m.group(1))) for m in re.finditer(r'【([^】]*)】|([^【]+)', ln)] for ln in lines]
    lw = [sum(d.textlength(t, font=f) for t, _ in s) for s in segs]; lh = 80
    bw, bh = max(lw) + 90, lh * len(lines) + 56; x0, y0 = (W - bw) / 2, H - bh - 230
    d.rounded_rectangle((x0 + 8, y0 + 10, x0 + bw + 8, y0 + bh + 10), radius=40, fill=(10, 16, 50, 110))
    d.rounded_rectangle((x0, y0, x0 + bw, y0 + bh), radius=40, fill=(255, 255, 255, 245))
    for i, s in enumerate(segs):
        x = (W - lw[i]) / 2; y = y0 + 26 + i * lh
        for t, hot in s:
            d.text((x, y), t, font=f, fill=(77, 107, 254) if hot else (26, 28, 40)); x += d.textlength(t, font=f)
    tag = font(30, 700); d.rounded_rectangle((40, 70, 360, 126), radius=28, fill=(77, 107, 254, 230))
    d.text((64, 78), '大肥鱼 · 赛博鱼塘', font=tag, fill='white')
    if credit:
        cf = font(22, 400); tw = d.textlength(CREDIT, font=cf); d.text(((W - tw) / 2, H - 70), CREDIT, font=cf, fill=(255, 255, 255, 190))
    im.save(path)

cap_dir = os.path.join(B, 'captions'); os.makedirs(cap_dir, exist_ok=True)
caps = []
for i, (a, b, text) in enumerate(TL.SUBS):
    p = os.path.join(cap_dir, f'sub{i}.png'); caption(text, p, credit=(i == len(TL.SUBS) - 1)); caps.append((a, b, p))

def run(audio, out):
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(TL.FPS), '-i', os.path.join(A.frames, 'f_%04d.png')]
    for _, _, p in caps: cmd += ['-i', p]
    cmd += ['-i', audio]
    fl = f'[0:v]scale={W}:{H}:flags=lanczos,format=rgba[v0]'
    for i, (a, b, _) in enumerate(caps):
        fl += f';[v{i}][{i + 1}:v]overlay=0:0:enable=\'between(t,{a},{b - 1 / TL.FPS:.3f})\'[v{i + 1}]'
    cmd += ['-filter_complex', fl, '-map', f'[v{len(caps)}]', '-map', f'{len(caps) + 1}:a',
            '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-shortest', out]
    subprocess.run(cmd, check=True); print(out)

run(os.path.join(B, 'score.wav'), A.out)
run(os.path.join(B, 'sfx_only.wav'), A.out.replace('.mp4', '_仅音效.mp4'))
