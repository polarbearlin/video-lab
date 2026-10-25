#!/usr/bin/env python3
"""v9（暗转亮 · 发布会）关键帧用的素材：对话气泡（主人蓝 / 大肥鱼白）、网友评论卡、开场对话图、DeepSeek 图标块。
→ build/v9ui/   python3 demos/deepseek/v9/ui.py（先跑 v5/v6/v7/v8 的 ui.py）"""
import sys, pathlib, importlib.util
from PIL import Image, ImageDraw, ImageFont
HERE = pathlib.Path(__file__).resolve().parent; DS = HERE.parent
OUT = DS / 'build/v9ui'; OUT.mkdir(parents=True, exist_ok=True)
SCR = DS / 'ref/screens'; FONTF = DS.parent.parent / 'assets/fonts/NotoSansSC.ttf'
def font(px, w=500):
    f = ImageFont.truetype(str(FONTF), px)
    try: f.set_variation_by_axes([w])
    except Exception: pass
    return f

def bubble(name, text, who):
    """对话气泡（透明底 PNG）。who='master' 蓝底白字、尾巴在右下；'her' 白底深字、尾巴在左下，左边带个小鲸鱼"""
    f = font(120, 800); d0 = ImageDraw.Draw(Image.new('RGB', (10, 10))); tw = d0.textlength(text, font=f)
    pad = 70; icon = 150 if who == 'her' else 0; W, H = int(tw + 2 * pad + icon), 300
    im = Image.new('RGBA', (W, H + 70), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    fill, fg = ((77, 107, 254, 255), 'white') if who == 'master' else ((255, 255, 255, 255), (28, 31, 38))
    d.rounded_rectangle((0, 0, W - 1, H - 1), radius=110, fill=fill)
    if who == 'master': d.polygon([(W - 190, H - 20), (W - 70, H - 20), (W - 40, H + 60)], fill=fill)
    else: d.polygon([(70, H - 20), (190, H - 20), (40, H + 60)], fill=fill)
    if who == 'her':
        logo = Image.open(SCR / 'ds_chat_tablet.png').convert('RGBA').crop((846, 46, 912, 100)).resize((150, 123), Image.LANCZOS)
        px = logo.load()
        for y in range(logo.height):       # 把深色底抠掉，只留蓝色鲸鱼
            for x in range(logo.width):
                r, g, b_, a = px[x, y]; px[x, y] = (r, g, b_, 255 if b_ > 120 and b_ > r + 40 else 0)
        im.paste(logo, (pad - 10, (H - 123) // 2), logo)
    d.text((pad + icon, (H - 160) // 2), text, font=f, fill=fg)
    im.save(OUT / f'{name}.png'); return im.size

def comment(name, user, text):
    W, H = 1520, 400; c = Image.new('RGB', (W, H), (36, 38, 44)); d = ImageDraw.Draw(c)
    d.ellipse((60, 100, 260, 300), fill=(120, 128, 150)); d.text((126, 138), '?', font=font(110, 800), fill='white')
    d.text((310, 80), user, font=font(56, 700), fill=(160, 166, 176)); d.text((310, 170), text, font=font(96, 900), fill='white')
    c.save(OUT / f'{name}.png')

def icon():
    """App Store 截图里的 DeepSeek 图标，裁出来做成会弹起来的立体图标块的顶面"""
    Image.open(SCR / 'appstore.png').convert('RGB').crop((112, 241, 248, 367)).resize((400, 370), Image.LANCZOS).save(OUT / 'ds_icon.png')

if __name__ == '__main__':
    spec = importlib.util.spec_from_file_location('ui7', DS / 'v7/ui.py'); ui7 = importlib.util.module_from_spec(spec); spec.loader.exec_module(ui7)
    ui7.chat('chat_v9', '大肥鱼，介绍下你自己？', '好嘞！', with_sticker_slot=True)   # 写到 build/v7ui/chat_v9.png
    for n, t, w in (('b_intro', '本鲸，DeepSeek 家的 AI！', 'her'), ('b_whale', '是鲸！', 'her'), ('b_fire_q', '听说你火过？', 'master'), ('b_fire_a', '何止！', 'her'),
                    ('b_busy_q', '那服务器怎么老繁忙？', 'master'), ('b_busy_a', '人太多啦～', 'her')):
        print(n, bubble(n, t, w))
    comment('c1', '网友 · 刚刚', '这不就是条大肥鱼吗？'); comment('c2', '网友 · 刚刚', '蓝色大肥鱼！'); comment('c3', '网友 · 1分钟前', '好胖的鲸 hhh')
    icon()
    # 发布会大字上方的一行说明（Blender 里挤出可变字体的中文会糊，做成贴图）
    f = font(150, 800); t = '英伟达市值 · 一天蒸发'; tw = ImageDraw.Draw(Image.new('RGB', (1, 1))).textlength(t, font=f)
    im = Image.new('RGBA', (int(tw) + 40, 220), (0, 0, 0, 0)); ImageDraw.Draw(im).text((20, 10), t, font=f, fill=(43, 71, 201, 255)); im.save(OUT / 'num7s.png')
    print('ok →', OUT)
