#!/usr/bin/env python3
"""v8 界面：对话平板的所有状态（打字、发送、回复、贴纸印子）+ App Store 电梯的 6 个状态 + 叠加层。
输出 build/v8ui/，并写一份逐帧状态表 build/v8ui/frames.json。python3 demos/deepseek/v8/ui.py"""
import os, sys, json, pathlib
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = pathlib.Path(__file__).resolve().parent; DS = HERE.parent; sys.path.insert(0, str(HERE))
import plan as P
OUT = DS / 'build/v8ui'; OUT.mkdir(parents=True, exist_ok=True)
SCR = DS / 'ref/screens'; FONTF = DS.parent.parent / 'assets/fonts/NotoSansSC.ttf'
def font(px, w=500):
    f = ImageFont.truetype(str(FONTF), px)
    try: f.set_variation_by_axes([w])
    except Exception: pass
    return f
K = 2   # 原图放大 2 倍
BASE = Image.open(SCR / 'ds_chat_tablet.png').convert('RGB')
BASE = BASE.resize((BASE.width * K, BASE.height * K), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 60, 2))
LOGO = Image.open(SCR / 'ds_chat_tablet.png').crop((846, 46, 912, 100)).resize((66 * K, 54 * K), Image.LANCZOS)

def chat_state(n_sent, typing, typed, reply, slot):
    """n_sent：已发出几条；typing：正在输入第几条（-1 没有）；typed：已打几个字；reply：是否已回复；slot：贴纸印子"""
    im = BASE.copy(); d = ImageDraw.Draw(im)
    f = font(32 * K, 500)
    for i in range(n_sent):
        m = P.MSGS[i]; tw = d.textlength(m['text'], font=f); x1, y = 1480 * K, m['y'] * K
        d.rounded_rectangle((x1 - tw - 64 * K, y, x1, y + 74 * K), radius=26 * K, fill=(77, 107, 254)); d.text((x1 - tw - 32 * K, y + 12 * K), m['text'], font=f, fill='white')
    if reply:
        im.paste(LOGO, (440 * K, 262 * K)); f2 = font(34 * K, 700); rw = d.textlength(P.REPLY['text'], font=f2)
        d.rounded_rectangle((520 * K, 255 * K, 520 * K + rw + 60 * K, 325 * K), radius=26 * K, fill=(40, 46, 64)); d.text((550 * K, 265 * K), P.REPLY['text'], font=f2, fill='white')
    if slot:
        x0, y0, x1, y1 = P.STICKER['px']; d.rounded_rectangle((x0 * K, y0 * K, x1 * K, y1 * K), radius=18 * K, outline=(70, 82, 120), width=3 * K)
    if typing >= 0:   # 输入框：盖住占位文字，逐字打出来 + 光标
        d.rectangle((425 * K, 852 * K, 1320 * K, 910 * K), fill=(31, 37, 46))
        t = P.MSGS[typing]['text'][:typed]; f3 = font(30 * K, 500); d.text((435 * K, 862 * K), t, font=f3, fill='white')
        cx = 435 * K + d.textlength(t, font=f3) + 4 * K; d.rectangle((cx, 864 * K, cx + 3 * K, 900 * K), fill=(77, 107, 254))
    return im

def chat_at(t):
    n_sent = sum(1 for m in P.MSGS if t >= m['send']); typing, typed = -1, 0
    for i, m in enumerate(P.MSGS):
        a, z = m['type']
        if a <= t < m['send']: typing = i; typed = min(len(m['text']), int((t - a) / (z - a) * len(m['text'])) + 1) if t < z else len(m['text'])
    return (n_sent, typing, typed, t >= P.REPLY['t'], t >= P.STICKER['peel'][0])

# ---------------- App Store：DeepSeek 从第 6 名一格一格顶到第 1 名
SB = Image.open(SCR / 'appstore.png').convert('RGB'); Y0, RH = P.STORE_ROWS
ROWS = [SB.crop((0, Y0 + RH * i, SB.width, Y0 + RH * (i + 1))) for i in range(8)]
def store_state(pos):
    order = [1, 2, 3, 4, 5, 6, 7]; order.insert(pos, 0); order = order[:8]
    im = SB.copy(); d = ImageDraw.Draw(im)
    for p, ri in enumerate(order):
        row = ROWS[ri].copy(); dr = ImageDraw.Draw(row); dr.rectangle((20, 20, 100, RH - 20), fill=(12, 14, 16))
        dr.text((38 if p < 9 else 30, RH / 2 - 30), str(p + 1), font=font(52, 600), fill='white')
        if ri == 0: row = Image.blend(row, Image.new('RGB', row.size, (40, 70, 200)), .18)
        im.paste(row, (0, Y0 + RH * p))
    return im.resize((im.width * K, im.height * K), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 60, 2))

if __name__ == '__main__':
    states, idx = {}, []
    for f in range(1, P.N + 1):
        key = chat_at((f - 1) / P.FPS)
        if key not in states: states[key] = len(states); chat_state(*key).save(OUT / f'chat_{states[key]:03d}.png')
        idx.append(states[key])
    store_idx = []
    for pos in range(6): store_state(pos).save(OUT / f'store_{pos}.png')
    for f in range(1, P.N + 1): store_idx.append(int(round(P.lift_pos((f - 1) / P.FPS))))
    json.dump(dict(chat=idx, chat_n=len(states), store=store_idx), open(OUT / 'frames.json', 'w'))
    print('chat states', len(states), '→', OUT)
