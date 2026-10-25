#!/usr/bin/env python3
"""v7《大肥鱼 · 自我介绍》界面图 → demos/deepseek/build/v7ui/
python3 demos/deepseek/v7/ui.py   （会用到 v5/v6 生成的部分图，先跑那两个）"""
import os, sys, subprocess, pathlib, re
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import numpy as np
HERE = pathlib.Path(__file__).resolve().parent; DS = HERE.parent; REPO = DS.parent.parent
OUT = DS / 'build/v7ui'; OUT.mkdir(parents=True, exist_ok=True)
SCR = DS / 'ref/screens'
MAC = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
CHROME = os.environ.get('MG_CHROME') or (MAC if os.path.exists(MAC) else '/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
U = lambda p: pathlib.Path(p).resolve().as_uri()
FONTF = REPO / 'assets/fonts/NotoSansSC.ttf'
BASE = f"""@font-face{{font-family:S;src:url({U(FONTF)});font-weight:100 900}}
*{{box-sizing:border-box;margin:0;padding:0}}html,body{{width:100%;height:100%;overflow:hidden;font-family:S,'PingFang SC',sans-serif}}.a{{position:absolute}}"""
def font(px, w=500):
    f = ImageFont.truetype(str(FONTF), px)
    try: f.set_variation_by_axes([w])
    except Exception: pass
    return f
def shot(name, w, h, body, css=''):
    f = OUT / f'{name}.html'; png = OUT / f'{name}.png'
    f.write_text(f'<!doctype html><html><head><meta charset="utf-8"><style>{BASE}{css}</style></head><body><div style="zoom:2;width:{w // 2}px;height:{h // 2}px;position:relative;overflow:hidden">{body}</div></body></html>', encoding='utf-8')
    subprocess.run([CHROME, '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--allow-file-access-from-files',
                    f'--window-size={max(w, 1600) + 200},{max(h, 1600) + 200}', f'--screenshot={png}', f.as_uri()], check=True, capture_output=True)
    Image.open(png).crop((0, 0, w, h)).save(png)
def up(path, k=2):
    im = Image.open(path).convert('RGB'); return im.resize((im.width * k, im.height * k), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 60, 2))

# ---------------- 她的平面贴纸（从正面渲染图抠出来，加白色描边）
def sticker():
    im = Image.open(DS / 'build/chibi_check/chibi_front.png').convert('RGB'); a = np.array(im).astype(int)
    bg = a[4, 4]; m = (np.abs(a - bg).sum(2) > 30).astype(np.uint8) * 255
    mask = Image.fromarray(m).filter(ImageFilter.MedianFilter(5)); bb = mask.getbbox()
    im, mask = im.crop(bb), mask.crop(bb); pad = 40
    W, H = im.width + 2 * pad, im.height + 2 * pad
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0)); big = Image.new('L', (W, H), 0); big.paste(mask, (pad, pad))
    outline = big.filter(ImageFilter.MaxFilter(31)).filter(ImageFilter.GaussianBlur(2))
    out.paste((255, 255, 255, 255), (0, 0), outline); body = Image.new('RGBA', (W, H)); body.paste(im, (pad, pad)); out.paste(body, (0, 0), big)
    out.save(OUT / 'sticker.png')
    # 贴在纸片上的版本（不透明，白底）
    sq = Image.new('RGB', (W, H), (255, 255, 255)); sq.paste(out, (0, 0), out); sq.save(OUT / 'sticker_card.png')
    return out

# ---------------- 对话大本营：主人发的消息 + 她的回复
def chat(name, msg, reply=None, with_sticker_slot=False):
    im = up(SCR / 'ds_chat_tablet.png'); d = ImageDraw.Draw(im); k = 2
    f = font(32 * k, 500); tw = d.textlength(msg, font=f); x1 = 1480 * k
    d.rounded_rectangle((x1 - tw - 64 * k, 140 * k, x1, 214 * k), radius=26 * k, fill=(77, 107, 254)); d.text((x1 - tw - 32 * k, 152 * k), msg, font=f, fill='white')
    logo = Image.open(SCR / 'ds_chat_tablet.png').crop((846, 46, 912, 100)).resize((66 * k, 54 * k), Image.LANCZOS)
    im.paste(logo, (440 * k, 262 * k))
    if reply:
        f2 = font(34 * k, 700); rw = d.textlength(reply, font=f2)
        d.rounded_rectangle((520 * k, 255 * k, 520 * k + rw + 60 * k, 325 * k), radius=26 * k, fill=(40, 46, 64)); d.text((550 * k, 265 * k), reply, font=f2, fill='white')
    if with_sticker_slot:   # 贴纸原本的位置（揭起来以后留下的浅色印子）
        d.rounded_rectangle((530 * k, 350 * k, 760 * k, 600 * k), radius=20 * k, outline=(70, 80, 110), width=3 * k)
    im.save(OUT / f'{name}.png')

# ---------------- 第 1 步：放大的鲸鱼 logo
def logo_screen():
    svg = (DS / 'whale.svg').read_text()
    shot('logo', 2400, 1600, f"""<div class="a" style="left:0;top:0;width:1200px;height:800px;background:radial-gradient(circle at 50% 45%,#1d2a66,#0c1024 70%)">
<div class="a" style="left:0;top:26px;width:1200px;text-align:center;font-size:18px;color:#7f8bb5;letter-spacing:6px">DEEPSEEK · 深度求索</div>
<div class="a" style="left:380px;top:150px;width:440px;height:440px;filter:drop-shadow(0 0 40px #4d6bfe)">{svg.replace('<svg', '<svg width="440" height="440"', 1)}</div>
<div class="a" style="left:0;top:640px;width:1200px;text-align:center;font-size:46px;font-weight:900;color:#fff;letter-spacing:4px">DeepSeek</div></div>""")
def comment_card(name, text, path, fish=False):
    W, H = 1520, 400; c = Image.new('RGB', (W, H), (36, 38, 44)); d = ImageDraw.Draw(c)
    d.ellipse((60, 100, 260, 300), fill=(120, 128, 150)); d.text((128, 140), '🙂' if False else '?', font=font(110, 800), fill='white')
    d.text((310, 80), name, font=font(56, 700), fill=(160, 166, 176)); d.text((310, 170), text, font=font(96, 900), fill='white'); c.save(OUT / path)
def nameplate():
    shot('nameplate', 1200, 400, """<div class="a" style="left:0;top:0;width:600px;height:200px;background:linear-gradient(135deg,#4d6bfe,#7b5bff);display:flex;align-items:center;justify-content:center;gap:20px;color:#fff">
<span style="font-size:40px;opacity:.85">名字：</span><b style="font-size:96px">大肥鱼</b></div>""")

# ---------------- 第 4 步：凌晨的锁屏
def lock_night():
    im = Image.open(SCR / 'lock.png').convert('RGB'); W, H = im.size
    # 抹掉原来的 9:41 和日期：用上下两条背景插值填平（背景是平滑渐变）
    a = np.array(im).astype(float); y0, y1, x0, x1 = 165, 445, 240, 700
    top, bot = a[y0 - 4], a[y1 + 4]
    for y in range(y0, y1):
        t = (y - y0) / (y1 - y0); a[y, x0:x1] = (top[x0:x1] * (1 - t) + bot[x0:x1] * t)
    im = Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.GaussianBlur(0))
    im = im.resize((W * 2, H * 2), Image.LANCZOS); d = ImageDraw.Draw(im); k = 2
    f = font(170 * k, 300); t = '2:13'; tw = d.textlength(t, font=f); d.text(((W * k - tw) / 2, 175 * k), t, font=f, fill=(255, 255, 255))
    f = font(34 * k, 500); t = '10月25日 星期六'; tw = d.textlength(t, font=f); d.text(((W * k - tw) / 2, 395 * k), t, font=f, fill=(255, 255, 255))
    av = Image.open(SCR / 'bili_comments.png').crop((40, 176, 152, 288)).resize((100 * k, 100 * k))
    for i, (who, msg) in enumerate((('主人', '睡不着。'), ('大肥鱼', '本鲸陪你。'))):
        y = (560 + i * 190) * k
        card = Image.new('RGBA', (W * k - 80 * k, 165 * k), (255, 255, 255, 210)); m = Image.new('L', card.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, *card.size), radius=40 * k, fill=255)
        im.paste(card, (40 * k, y), m); dd = ImageDraw.Draw(im)
        if who == '大肥鱼':
            mm = Image.new('L', av.size, 0); ImageDraw.Draw(mm).rounded_rectangle((0, 0, *av.size), radius=24 * k, fill=255); im.paste(av, (72 * k, y + 32 * k), mm)
        else: dd.rounded_rectangle((72 * k, y + 32 * k, 172 * k, y + 132 * k), radius=24 * k, fill=(77, 107, 254)); dd.text((96 * k, y + 52 * k), '主', font=font(48 * k, 800), fill='white')
        dd.text((200 * k, y + 30 * k), f'{who} · 刚刚', font=font(28 * k, 500), fill=(90, 80, 100)); dd.text((200 * k, y + 76 * k), msg, font=font(44 * k, 800), fill=(40, 30, 50))
    im.save(OUT / 'lock_night.png')

# ---------------- 第 5 步：电脑桌面（AI 助手 / Blender / 终端）+ 真实统计
def desktop(stats):
    code = (DS / 'v6/scene.py').read_text().splitlines()[60:80]
    code_html = ''.join(f'<div><span style="color:#5c6370">{i + 61:>3}</span>  {re.sub("<", "&lt;", l[:70])}</div>' for i, l in enumerate(code))
    render = U(DS / 'build/v6keys/key3.png')
    shot('desktop', 2560, 1600, f"""<div class="a" style="left:0;top:0;width:1280px;height:800px;background:radial-gradient(circle at 30% 30%,#3b2a6b,#14102a 60%,#0b0a18)">
<div class="a" style="left:0;top:0;width:1280px;height:26px;background:rgba(0,0,0,.35);font-size:13px;color:#ddd;display:flex;align-items:center;gap:22px;padding:0 16px"><b>Finder</b><span>文件</span><span>编辑</span><span>窗口</span><span style="margin-left:auto">10月25日 周六 23:41</span></div>
<div class="a" style="left:40px;top:60px;width:560px;height:360px;border-radius:12px;background:#1e1f24;box-shadow:0 20px 50px rgba(0,0,0,.5);overflow:hidden;font:12px/1.55 Menlo,monospace;color:#c8ccd4">
 <div style="height:26px;background:#2a2b31;display:flex;align-items:center;gap:7px;padding:0 10px"><i style="width:11px;height:11px;border-radius:50%;background:#ff5f57"></i><i style="width:11px;height:11px;border-radius:50%;background:#febc2e"></i><i style="width:11px;height:11px;border-radius:50%;background:#28c840"></i><span style="margin-left:12px;color:#9aa">终端 — blender -b -P scene.py</span></div>
 <div style="padding:10px 12px">{code_html}</div></div>
<div class="a" style="left:640px;top:90px;width:600px;height:400px;border-radius:12px;background:#2b2b2b;box-shadow:0 20px 50px rgba(0,0,0,.5);overflow:hidden">
 <div style="height:26px;background:#3a3a3a;font-size:12px;color:#ddd;display:flex;align-items:center;padding:0 12px">Blender · 渲染　帧 1143 / 2700</div>
 <div style="position:relative;height:340px;background:#111;overflow:hidden"><img src="{render}" style="width:100%;height:100%;object-fit:cover">
  <div class="a" style="left:0;top:170px;width:600px;height:170px;background:repeating-linear-gradient(90deg,#1a1a1a 0 74px,#222 74px 75px),#1a1a1a"></div>
  <div class="a" style="left:300px;top:170px;width:75px;height:85px;border:2px solid #ff9a3c"></div></div>
 <div style="height:34px;display:flex;align-items:center;gap:10px;padding:0 12px;font-size:12px;color:#ccc">合成 <div style="flex:1;height:8px;border-radius:4px;background:#444"><div style="width:87%;height:100%;border-radius:4px;background:linear-gradient(90deg,#ff4f9a,#4d6bfe)"></div></div>87%</div></div>
<div class="a" style="left:330px;top:690px;width:620px;height:90px;border-radius:26px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;gap:34px">
 <div style="width:66px;height:66px;border-radius:16px;background:linear-gradient(135deg,#d97757,#b85c3c);display:flex;align-items:center;justify-content:center;color:#fff;font-size:30px;font-weight:900">AI</div>
 <div style="width:66px;height:66px;border-radius:16px;background:linear-gradient(135deg,#ff9a3c,#e87d0d);display:flex;align-items:center;justify-content:center;font-size:34px">🧊</div>
 <div style="width:66px;height:66px;border-radius:16px;background:#111;border:1px solid #444;display:flex;align-items:center;justify-content:center;color:#e8e8e8;font:700 26px Menlo,monospace">&gt;_</div>
 <div style="width:66px;height:66px;border-radius:16px;background:linear-gradient(135deg,#4d6bfe,#2b47c9)"></div>
 <div style="width:66px;height:66px;border-radius:16px;background:linear-gradient(135deg,#9aa3b5,#666e80)"></div></div>
<div class="a" style="left:40px;top:450px;font-size:13px;color:#aab">AI 助手　·　Blender　·　终端</div></div>""")
    shot('stats', 1600, 700, f"""<div class="a" style="left:0;top:0;width:800px;height:350px;background:linear-gradient(135deg,#ffffff,#eef1fb);padding:34px 44px">
<div style="font-size:24px;color:#6b7085;letter-spacing:3px">这条片子是这样做出来的</div>
<div style="display:flex;gap:30px;margin-top:30px">{''.join(f'<div style="flex:1;white-space:nowrap"><div style="font-size:52px;font-weight:900;color:#4d6bfe">{v}</div><div style="font-size:24px;color:#3a3f4a">{k}</div></div>' for k, v in stats)}</div>
<div style="font-size:18px;color:#9aa3b5;margin-top:28px">Blender + Python 脚本 · 全部由代码生成</div></div>""")

# ---------------- 叠加层：大号章节标题 / 左上角进度 / 底部导航
CHAPTERS = ['我是谁', '我火过', '我在 B站', '我每天', '这条片子怎么做的']
def overlay(W, H, chapter=None, big=False, nav=True, title=None):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im); s = W / 1920
    if title:   # 片头大标题
        f = font(int(120 * s), 900); tw = d.textlength(title[0], font=f); d.text(((W - tw) / 2, H * .36), title[0], font=f, fill='white', stroke_width=int(3 * s), stroke_fill=(20, 24, 50))
        f2 = font(int(44 * s), 700); tw = d.textlength(title[1], font=f2); d.text(((W - tw) / 2, H * .36 + 150 * s), title[1], font=f2, fill=(200, 210, 255))
    if chapter is not None:
        n = chapter + 1; name = CHAPTERS[chapter]
        if big:   # 大号步骤名
            r = int(52 * s); cx, cy = int(W / 2 - 300 * s), int(H * .2)
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(251, 114, 153)); f = font(int(64 * s), 900); d.text((cx - 18 * s, cy - 46 * s), str(n), font=f, fill='white')
            d.text((cx + 80 * s, cy - 70 * s), f'第 {n} 步', font=font(int(34 * s), 600), fill=(255, 220, 230))
            d.text((cx + 80 * s, cy - 30 * s), name, font=font(int(86 * s), 900), fill='white', stroke_width=int(2 * s), stroke_fill=(20, 24, 50))
        else:     # 缩到左上角的进度
            x, y = int(40 * s), int(36 * s)
            for i in range(5): d.rounded_rectangle((x + i * 34 * s, y, x + i * 34 * s + 26 * s, y + 6 * s), radius=3 * s, fill=(251, 114, 153) if i <= chapter else (110, 110, 130))
            d.text((x + 182 * s, y - 14 * s), f'{n}/5  {name}', font=font(int(26 * s), 700), fill='white')
    if nav:       # 底部导航
        y = H - int(46 * s); d.rectangle((0, y, W, H), fill=(14, 14, 20, 200))
        seg = W / 5
        for i, c in enumerate(CHAPTERS):
            f = font(int(22 * s), 600 if i == chapter else 400); tw = d.textlength(c, font=f)
            d.text((seg * i + (seg - tw) / 2, y + 10 * s), c, font=f, fill='white' if i == chapter else (150, 150, 165))
        if chapter is not None: d.rectangle((0, y, int(seg * (chapter + .5)), y + int(4 * s)), fill=(251, 114, 153))
    return im

if __name__ == '__main__':
    sticker()
    chat('chat_open', '大肥鱼，给大家介绍一下你自己吧？', '好嘞！', with_sticker_slot=False)
    chat('chat_open2', '大肥鱼，给大家介绍一下你自己吧？', '好嘞！', with_sticker_slot=True)
    logo_screen(); comment_card('网友 · 刚刚', '这不就是条大肥鱼吗？', 'c_fish.png'); nameplate()
    lock_night()
    loc = sum(len(p.read_text().splitlines()) for p in list(DS.glob('*.py')) + list(DS.glob('v*/*.py')))
    desktop([('代码', f'{loc:,} 行'), ('画面', '2,700 帧'), ('手调关键帧', '0 个')])
    print('ok →', OUT, 'loc', loc)
