#!/usr/bin/env python3
"""v11（后 60 秒）的素材 → build/v11ui/：台词气泡、锁屏三个状态（2:13 两条通知 / 翻页中 / 7:30 早安）、
桌面上立起来的代码窗口和渲染窗口（含一格格渲出来的状态）、结尾暗场聊天的逐帧状态。先跑 v5–v10 的 ui.py。"""
import sys, json, pathlib, importlib.util
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = pathlib.Path(__file__).resolve().parent; DS = HERE.parent; sys.path.insert(0, str(HERE))
import plan as P
OUT = DS / 'build/v11ui'; OUT.mkdir(parents=True, exist_ok=True)
SCR = DS / 'ref/screens'; FONTF = DS.parent.parent / 'assets/fonts/NotoSansSC.ttf'
def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
def font(px, w=500):
    f = ImageFont.truetype(str(FONTF), px)
    try: f.set_variation_by_axes([w])
    except Exception: pass
    return f

def lock(name, time_str, notes):
    """锁屏：抹掉原图的 9:41，写上新时间；notes = [(谁, 内容)]"""
    im = Image.open(SCR / 'lock.png').convert('RGB'); W, H = im.size
    a = np.array(im).astype(float); y0, y1, x0, x1 = 165, 445, 240, 700; top, bot = a[y0 - 4], a[y1 + 4]
    for y in range(y0, y1): t = (y - y0) / (y1 - y0); a[y, x0:x1] = top[x0:x1] * (1 - t) + bot[x0:x1] * t
    im = Image.fromarray(a.astype(np.uint8)).resize((W * 2, H * 2), Image.LANCZOS); d = ImageDraw.Draw(im); k = 2
    f = font(170 * k, 300); tw = d.textlength(time_str, font=f); d.text(((W * k - tw) / 2, 175 * k), time_str, font=f, fill='white')
    f = font(34 * k, 500); s = '10月25日 星期日'; tw = d.textlength(s, font=f); d.text(((W * k - tw) / 2, 395 * k), s, font=f, fill='white')
    av = Image.open(SCR / 'bili_comments.png').crop((40, 176, 152, 288)).resize((100 * k, 100 * k))
    for i, (who, msg) in enumerate(notes):
        y = (560 + i * 190) * k
        card = Image.new('RGBA', (W * k - 80 * k, 165 * k), (255, 255, 255, 215)); m = Image.new('L', card.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, *card.size), radius=40 * k, fill=255)
        im.paste(card, (40 * k, y), m); dd = ImageDraw.Draw(im)
        if who == '大肥鱼':
            mm = Image.new('L', av.size, 0); ImageDraw.Draw(mm).rounded_rectangle((0, 0, *av.size), radius=24 * k, fill=255); im.paste(av, (72 * k, y + 32 * k), mm)
        else: dd.rounded_rectangle((72 * k, y + 32 * k, 172 * k, y + 132 * k), radius=24 * k, fill=(77, 107, 254)); dd.text((96 * k, y + 52 * k), '主', font=font(48 * k, 800), fill='white')
        dd.text((200 * k, y + 30 * k), f'{who} · 刚刚', font=font(28 * k, 500), fill=(90, 80, 100)); dd.text((200 * k, y + 76 * k), msg, font=font(44 * k, 800), fill=(40, 30, 50))
    im.save(OUT / f'{name}.png')

def windows():
    """从桌面截图里裁出终端窗口和渲染窗口，做成会立起来的 3D 卡片；渲染窗口再做 7 个"一格格渲出来"的状态"""
    dt = Image.open(DS / 'build/v7ui/desktop.png').convert('RGB')    # 2560×1600（按 1280×800 布局 ×2）
    dt.crop((80, 120, 1200, 840)).save(OUT / 'win_code.png')
    rw = dt.crop((1280, 180, 2480, 980)); rw.save(OUT / 'win_render.png')
    src = DS / 'build/v10st/still_0390.png'; frame = Image.open(src if src.exists() else SCR / 'appstore.png').convert('RGB')
    frame = frame.resize((1200, 680), Image.LANCZOS); cols, rows = 8, 4; tw, th = 1200 // cols, 680 // rows
    for s in range(7):
        im = rw.copy(); canvas = Image.new('RGB', (1200, 680), (26, 26, 26)); d = ImageDraw.Draw(canvas); n = int(cols * rows * s / 6)
        for i in range(cols * rows):
            x, y = (i % cols) * tw, (i // cols) * th
            if i < n: canvas.paste(frame.crop((x, y, x + tw, y + th)), (x, y))
            else: d.rectangle((x, y, x + tw - 2, y + th - 2), outline=(50, 50, 50))
        if n < cols * rows: x, y = (n % cols) * tw, (n // cols) * th; d.rectangle((x, y, x + tw - 2, y + th - 2), outline=(255, 154, 60), width=4)
        im.paste(canvas, (0, 52)); dd = ImageDraw.Draw(im); dd.rectangle((0, 0, 1200, 51), fill=(58, 58, 60)); dd.text((24, 12), f'Blender · 渲染　帧 {900 + 300 * s} / 2700', font=font(26, 500), fill=(220, 220, 220))
        im.save(OUT / f'win_render{s}.png')
    for n, x in (('icon_ai', .344), ('icon_term', .5), ('icon_bl', .422)):   # Dock 上的三个图标，做成会被踩下去的小方块
        c = int(x * 2560); dt.crop((c - 66, 1470 - 66, c + 66, 1470 + 66)).save(OUT / f'{n}.png')

def endcard():
    W, H = 1920, 1080; im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((W / 2 - 720, H / 2 - 130, W / 2 + 720, H / 2 + 130), radius=60, fill=(255, 255, 255, 235))
    f = font(84, 900); t = 'Made with DeepSeek × Claude'; tw = d.textlength(t, font=f); d.text(((W - tw) / 2, H / 2 - 62), t, font=f, fill=(28, 31, 38))
    f = font(24, 500); t = '3D 模型：azwosile/DeepSeek-whale-girl-3D（CC BY-NC-SA 4.0）　形象：溟月（上善无形）/ ZipZipPipe 二创'; tw = d.textlength(t, font=f); d.text(((W - tw) / 2, H / 2 + 50), t, font=f, fill=(107, 112, 133))
    im.save(OUT / 'endcard.png')

def heart():
    im = Image.new('RGBA', (256, 256), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse((28, 40, 132, 144), fill=(255, 111, 168)); d.ellipse((124, 40, 228, 144), fill=(255, 111, 168)); d.polygon([(34, 110), (222, 110), (128, 226)], fill=(255, 111, 168))
    d.ellipse((60, 62, 92, 94), fill=(255, 200, 225)); im.save(OUT / 'heart.png')

def end_chat():
    """结尾回到开场的暗色聊天：前面的对话都在，主人再发一句"谢谢你，大肥鱼。" """
    K = 2; base = Image.open(DS / 'build/v10ui/chat_014.png').convert('RGB') if (DS / 'build/v10ui/chat_014.png').exists() else None
    if base is None:
        v10 = load('ui10', DS / 'v10/ui.py'); base = v10.state(-1, True, True, True)
    states, idx = {}, []
    for f in range(P.fr(P.CUT), P.F1 + 1):
        t = (f - 1) / P.FPS; a, z = P.MSG['type']; n = len(P.MSG['text'])
        k = (-1 if t < a else min(n, int((t - a) / (z - a) * n) + 1), t >= P.MSG['send'])
        if k not in states:
            im = base.copy(); d = ImageDraw.Draw(im); s = P.MSG['text']
            if k[1]:
                f_ = font(32 * K, 500); tw = d.textlength(s, font=f_); x1, y = 1480 * K, 620 * K
                d.rounded_rectangle((x1 - tw - 64 * K, y, x1, y + 74 * K), radius=26 * K, fill=(77, 107, 254)); d.text((x1 - tw - 32 * K, y + 12 * K), s, font=f_, fill='white')
            elif k[0] >= 0:
                d.rectangle((425 * K, 852 * K, 1320 * K, 910 * K), fill=(31, 37, 46)); f3 = font(30 * K, 500); ss = s[:k[0]]
                d.text((435 * K, 862 * K), ss, font=f3, fill='white'); cx = 435 * K + d.textlength(ss, font=f3) + 4 * K; d.rectangle((cx, 864 * K, cx + 3 * K, 900 * K), fill=(77, 107, 254))
            states[k] = len(states); im.save(OUT / f'echat_{states[k]:03d}.png')
        idx.append(states[k])
    return idx, len(states)

if __name__ == '__main__':
    ui9 = load('ui9', DS / 'v9/ui.py'); ui9.OUT = OUT
    for n, t, w in (('q_bili', '你在 B站干嘛呢？', 'master'), ('a_bili', '上班摸鱼～', 'her'), ('a_robot', '真不是机器人！', 'her'),
                    ('q_make', '这条视频怎么做的？', 'master'), ('a_make', '全是代码！', 'her'), ('a_end', '评论区告诉本鲸，你家的鱼叫什么～', 'her')):
        ui9.bubble(n, t, w)
    lock('lock_night', '2:13', [('主人', '睡不着。')]); lock('lock_night2', '2:13', [('主人', '睡不着。'), ('大肥鱼', '本鲸陪你。')])
    for i, tm in enumerate(('3:40', '5:05', '6:20')): lock(f'lock_flip{i}', tm, [('主人', '睡不着。'), ('大肥鱼', '本鲸陪你。')])
    lock('lock_morning', '7:30', [('大肥鱼', '早安，主人～')]); lock('lock_m0', '7:30', []); lock('lock_empty', '2:13', [])
    windows(); endcard(); heart()
    for q in sorted((DS / 'build/v5ui').glob('scr_think*.png')):   # 深度思考框只要上面有字的那一截，字就大了
        Image.open(q).crop((0, 0, 3072, 1150)).save(OUT / q.name.replace('scr_', ''))
    idx, n = end_chat()
    json.dump(dict(echat=idx, echat_n=n, echat_f0=P.fr(P.CUT)), open(OUT / 'frames.json', 'w')); print('ok →', OUT)
