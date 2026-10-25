#!/usr/bin/env python3
"""v10 暗场聊天的逐帧状态图（打字 → 发送 → "好嘞！" → 贴纸印子）→ build/v10ui/chat_*.png + frames.json
其余素材复用 v5–v9 的 ui.py 输出。python3 demos/deepseek/v10/ui.py"""
import sys, json, pathlib
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = pathlib.Path(__file__).resolve().parent; DS = HERE.parent; sys.path.insert(0, str(HERE))
import plan as P
OUT = DS / 'build/v10ui'; OUT.mkdir(parents=True, exist_ok=True)
SCR = DS / 'ref/screens'; FONTF = DS.parent.parent / 'assets/fonts/NotoSansSC.ttf'
def font(px, w=500):
    f = ImageFont.truetype(str(FONTF), px)
    try: f.set_variation_by_axes([w])
    except Exception: pass
    return f
K = 2
BASE = Image.open(SCR / 'ds_chat_tablet.png').convert('RGB')
BASE = BASE.resize((BASE.width * K, BASE.height * K), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 60, 2))
LOGO = Image.open(SCR / 'ds_chat_tablet.png').crop((846, 46, 912, 100)).resize((66 * K, 54 * K), Image.LANCZOS)

def state(typed, sent, reply, slot):
    im = BASE.copy(); d = ImageDraw.Draw(im); t = P.MSG['text']
    if sent:
        f = font(32 * K, 500); tw = d.textlength(t, font=f); x1, y = 1480 * K, 140 * K
        d.rounded_rectangle((x1 - tw - 64 * K, y, x1, y + 74 * K), radius=26 * K, fill=(77, 107, 254)); d.text((x1 - tw - 32 * K, y + 12 * K), t, font=f, fill='white')
    elif typed >= 0:
        d.rectangle((425 * K, 852 * K, 1320 * K, 910 * K), fill=(31, 37, 46)); f3 = font(30 * K, 500); s = t[:typed]
        d.text((435 * K, 862 * K), s, font=f3, fill='white'); cx = 435 * K + d.textlength(s, font=f3) + 4 * K; d.rectangle((cx, 864 * K, cx + 3 * K, 900 * K), fill=(77, 107, 254))
    if reply:
        im.paste(LOGO, (440 * K, 262 * K)); f2 = font(34 * K, 700); rw = d.textlength('好嘞！', font=f2)
        d.rounded_rectangle((520 * K, 255 * K, 520 * K + rw + 60 * K, 325 * K), radius=26 * K, fill=(40, 46, 64)); d.text((550 * K, 265 * K), '好嘞！', font=f2, fill='white')
    if slot:
        x0, y0, x1, y1 = P.STICKER['px']; d.rounded_rectangle((x0 * K, y0 * K, x1 * K, y1 * K), radius=18 * K, outline=(70, 82, 120), width=3 * K)
    return im

def key_at(t):
    a, z = P.MSG['type']; n = len(P.MSG['text'])
    typed = -1 if t < a else min(n, int((t - a) / (z - a) * n) + 1)
    return (typed, t >= P.MSG['send'], t >= P.REPLY_T, t >= P.STICKER['peel'][0])

if __name__ == '__main__':
    states, idx = {}, []
    for f in range(1, P.N + 1):
        k = key_at((f - 1) / P.FPS)
        if k not in states: states[k] = len(states); state(*k).save(OUT / f'chat_{states[k]:03d}.png')
        idx.append(states[k])
    json.dump(dict(chat=idx, chat_n=len(states)), open(OUT / 'frames.json', 'w')); print('states', len(states), '→', OUT)
