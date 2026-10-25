#!/usr/bin/env python3
"""关键帧加字幕（白色圆角气泡 + 关键词品牌蓝），拼总览图。用法：python3 demos/deepseek/captions.py"""
import os, re
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); KF = os.path.join(HERE, 'build/keyframes')
FONT = os.path.join(HERE, '../../assets/fonts/NotoSansSC.ttf')
CAP = {1: 'B 站评论区，最近闹【"鱼灾"】了', 2: '起因是 DeepSeek 把自家 logo，\n认成了【"蓝色大肥鱼"】', 3: '网友就把她画成了\n【爱吃白饭】的鲸鱼女仆', 4: '现在，她能自己\n【刷视频、写评论、回私信】',
       5: '被问是不是 AI，她说：\n【"真不是机器人"】', 6: '……却把【"备选回复"】\n也一起发了出来', 7: '有人嫌她刷屏，\n做了插件把她【清除】', 8: '想给她一个完整的"人生"，\n大概是因为：【离不开她了】'}
TIME = {1: '0:01', 2: '0:05', 3: '0:09', 4: '0:12', 5: '0:16', 6: '0:19', 7: '0:22', 8: '0:28'}
def font(px, w=800):
    f = ImageFont.truetype(FONT, px)
    try: f.set_variation_by_axes([w])
    except Exception: pass
    return f
def draw_caption(im, text):
    W, H = im.size; k = W / 1080; f = font(int(58 * k), 800)
    lines = text.split('\n'); d = ImageDraw.Draw(im, 'RGBA')
    segs = [[(m.group(1) or m.group(2), bool(m.group(1))) for m in re.finditer(r'【([^】]*)】|([^【]+)', ln)] for ln in lines]
    lw = [sum(d.textlength(t, font=f) for t, _ in s) for s in segs]; lh = int(80 * k)
    bw, bh = max(lw) + 90 * k, lh * len(lines) + 56 * k; x0, y0 = (W - bw) / 2, H - bh - 210 * k
    d.rounded_rectangle((x0 + 8 * k, y0 + 10 * k, x0 + bw + 8 * k, y0 + bh + 10 * k), radius=40 * k, fill=(20, 30, 80, 90))
    d.rounded_rectangle((x0, y0, x0 + bw, y0 + bh), radius=40 * k, fill=(255, 255, 255, 245))
    for i, s in enumerate(segs):
        x = (W - lw[i]) / 2; y = y0 + 28 * k + i * lh
        for t, hot in s:
            d.text((x, y), t, font=f, fill=(77, 107, 254) if hot else (26, 28, 40)); x += d.textlength(t, font=f)
    tag = font(int(30 * k), 700); d.rounded_rectangle((40 * k, 60 * k, 360 * k, 116 * k), radius=28 * k, fill=(77, 107, 254, 230))
    d.text((64 * k, 68 * k), '大肥鱼 · 赛博鱼塘', font=tag, fill='white')
    return im
os.makedirs(os.path.join(KF, 'cap'), exist_ok=True)
tiles = []
for k in range(1, 9):
    p = os.path.join(KF, f'kf{k}.png')
    if not os.path.exists(p): continue
    im = draw_caption(Image.open(p).convert('RGB'), CAP[k]); im.save(os.path.join(KF, 'cap', f'kf{k}.png')); tiles.append((k, im))
TW, TH = 540, 960; sheet = Image.new('RGB', (4 * TW, 2 * (TH + 60)), '#0b0f22'); d = ImageDraw.Draw(sheet); lab = font(30, 700)
for i, (k, im) in enumerate(tiles):
    x, y = (i % 4) * TW, (i // 4) * (TH + 60); d.text((x + 16, y + 14), f'{TIME[k]}  关键帧 {k}', font=lab, fill='#9fb4ff'); sheet.paste(im.resize((TW, TH)), (x, y + 60))
sheet.save(os.path.join(KF, 'keyframes_sheet.jpg'), quality=88); print('ok')
