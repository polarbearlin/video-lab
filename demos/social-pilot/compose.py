"""社会焦点试片合成：网页逐帧（不透明）→ mp4 → 竖屏外框 + 字幕 + 配乐。用法：python3 compose.py"""
import os, sys, json, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
FILM = '/home/user/video-lab/demos/anthropic-ipo/film'      # 复用 render.package 和外框
sys.path.insert(0, FILM)
import render as R, frame
OUT = '/home/user/social_pilot'; os.makedirs(OUT, exist_ok=True)
P = json.load(open(os.path.join(HERE, 'plan.json')))
master = os.path.join(OUT, 'master.mp4')
if not os.path.exists(master):
    subprocess.run(['node', 'shoot.mjs', 'video', '4'], cwd=HERE, check=True)
    R.ff(['-framerate', '30', '-i', os.path.join(HERE, 'out', 'ov', '%05d.png'), '-vf', 'noise=alls=5:allf=t,format=yuv420p', '-t', str(P['dur'])] + R.ENC + [master])
music = os.path.join(FILM, '..', '素材', 'audio', 'suno', 'suno_a.mp3')   # 稀疏、调查感的那段，低音量垫底
audio = os.path.join(OUT, 'mix.wav')
R.ff(['-ss', '0.16', '-t', str(P['dur']), '-i', music, '-af', f"loudnorm=I=-20:TP=-2,volume=-4dB,afade=t=in:d=1.0,afade=t=out:st={P['dur'] - 2.5}:d=2.5", '-ar', '48000', '-ac', '2', audio])
frame.TITLE1, frame.TITLE2 = P['title1'], P['title2']
fp = os.path.join(OUT, 'frame.png'); frame.build(fp)
import re
def chunks(text, maxn=17):          # 竖屏字幕每条不超过 17 字，按标点切，时间按字数分
    parts = [x for x in re.split(r'(?<=[，、：；。？！])', text) if x]; out, cur = [], ''
    for p in parts:
        if cur and len(cur) + len(p) > maxn: out.append(cur); cur = p
        else: cur += p
    return out + ([cur] if cur else [])
subs = []
for a, b, s in P['subs']:
    cs = chunks(s); n = sum(len(c) for c in cs); x = a
    for c in cs:
        d = (b - a) * len(c) / n; subs.append((x, x + d, c.rstrip('，、：；。'))); x += d
R.package(master, audio, subs, OUT, fp, '社会焦点试片_HUD时间轴', which=('v',))
print('done')
