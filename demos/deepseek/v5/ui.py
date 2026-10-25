#!/usr/bin/env python3
"""v5 两段测试用的界面图（HTML → Chrome 截图）→ demos/deepseek/build/v5ui/
python3 demos/deepseek/v5/ui.py"""
import os, sys, subprocess, pathlib, html as H
HERE = pathlib.Path(__file__).resolve().parent; DS = HERE.parent
sys.path.insert(0, str(HERE))
import beats as BT
OUT = DS / 'build/v5ui'; OUT.mkdir(parents=True, exist_ok=True)
MAC = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
CHROME = os.environ.get('MG_CHROME') or (MAC if os.path.exists(MAC) else '/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
U = lambda p: pathlib.Path(p).resolve().as_uri()
FONT, AV, LOGO = U(DS / '../../assets/fonts/NotoSansSC.ttf'), U(DS / 'ref/avatar.png'), U(DS / 'whale.svg')
BASE = f"""@font-face{{font-family:S;src:url({FONT});font-weight:100 900}}
*{{box-sizing:border-box;margin:0;padding:0}}html,body{{width:100%;height:100%;overflow:hidden;font-family:S,'PingFang SC',sans-serif}}
.a{{position:absolute}}.av{{border-radius:50%;object-fit:cover}}"""

def shot(name, w, h, body, css=''):
    """按 1/2 尺寸写 HTML，zoom:2 放大成 w×h"""
    f = OUT / f'{name}.html'
    f.write_text(f'<!doctype html><html><head><meta charset="utf-8"><style>{BASE}{css}</style></head><body><div style="zoom:2;width:{w // 2}px;height:{h // 2}px;position:relative">{body}</div></body></html>', encoding='utf-8')
    # 窗口开大一点再裁（Chrome 无头模式窗口太小时会自己缩放，结果不准）
    png = OUT / (name + '.png'); W, Hh = max(w, 1600) + 200, max(h, 1600) + 200
    subprocess.run([CHROME, '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--allow-file-access-from-files',
                    f'--window-size={W},{Hh}', f'--screenshot={png}', f.as_uri()], check=True, capture_output=True)
    from PIL import Image
    Image.open(png).crop((0, 0, w, h)).save(png)

# ---------------- 段 B：DeepSeek 对话页 + 重新生成按钮 + 服务器繁忙弹窗（尺寸按 1/2 写，zoom 放大）
def seg_b():
    shot('chat_b', 1080, 1500, f"""
<div class="a" style="left:0;top:20px;width:540px;height:55px;display:flex;align-items:center;justify-content:center;gap:10px;font-size:24px;font-weight:800;color:#1c1f26"><img src="{LOGO}" style="width:40px">DeepSeek</div>
<div class="a" style="left:0;top:85px;width:540px;border-top:1px solid #e3e7f0"></div>
<div class="a" style="right:25px;top:115px;background:#4d6bfe;color:#fff;font-size:26px;padding:13px 22px;border-radius:22px 22px 6px 22px">帮我写个周报</div>
<div class="a" style="left:25px;top:210px;display:flex;gap:13px;align-items:center"><div style="width:55px;height:55px;border-radius:50%;border:2px solid #dfe5ff;background:#fff;display:flex;align-items:center;justify-content:center"><img src="{LOGO}" style="width:40px"></div>
<div style="font-size:24px;color:#9aa3b5">思考中 · · ·</div></div>
<div class="a" style="left:20px;top:620px;width:500px;height:90px;border-radius:25px;background:#fff;border:2px solid #dfe5ff;display:flex;align-items:center;padding:0 25px;font-size:22px;color:#9aa3b5">给 DeepSeek 发送消息</div>""",
         'body{background:#f4f6fb}')
    shot('btn', 520, 160, '<div class="a" style="left:0;top:0;width:260px;height:80px;background:#4d6bfe;color:#fff;font-size:30px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px">↻ 重新生成</div>')
    shot('busy', 1000, 440, """<div class="a" style="left:0;top:0;width:500px;height:220px;background:#fff;padding:30px 34px">
<div style="font-size:36px;font-weight:900;color:#1c1f26">⚠️ 服务器繁忙</div><div style="font-size:26px;color:#6b7085;margin-top:12px">请稍后再试</div>
<div class="a" style="right:30px;bottom:26px;font-size:24px;color:#4d6bfe;font-weight:700">重试</div></div>""")

# ---------------- 段 E：评论区（头像一行行翻成她）+ 你是不是 AI + 深度思考框 + 她的回复
OTHERS = [('用户8273', '这视频讲得真清楚'), ('momo_吃不饱', '前排！'), ('路过的猫', 'UP 主更新好快'), ('阿杰今天不加班', '收藏了'),
          ('一只小透明', '第三分钟那里没看懂'), ('Kiwi', '求 BGM'), ('老王学 AI', '学到了'), ('夜猫子', '已三连')]
FISH = [('大肥鱼本鲸', '本鲸记下了：这期 3 个重点 @主人'), ('吃白饭的大肥鱼', '主人主人，这个视频值得看！'), ('大肥鱼 No.07', 'Token 快不够了……先去吃饭'),
        ('大肥鱼（摸鱼中）', '本鲸也来留个言～'), ('蓝色大肥鱼', '总结：前 2 分钟是铺垫'), ('大肥鱼不是机器人', '楼上也是大肥鱼吗？'), ('大肥鱼 No.23', '讲得好，但我饿了'), ('今天也是大肥鱼', '已加入待办')]
def feed(k):
    rows = ''
    for i in range(8):
        n, t = FISH[i] if i < k else OTHERS[i]
        av = f'<img class="av" src="{AV}" style="width:62px;height:62px;border:2px solid #4d6bfe">' if i < k else \
             f'<div style="width:62px;height:62px;border-radius:50%;background:{["#c9a27e", "#8fb3a8", "#b9a3c9", "#d7b46a", "#9fb0c8", "#c98f8f", "#a8b88f", "#8f9fc9"][i]};display:flex;align-items:center;justify-content:center;font-size:30px">{["🐱", "🍩", "🐈", "☕", "🌱", "🥝", "📘", "🌙"][i]}</div>'
        rows += f"""<div class="a" style="left:0;top:{100 + 130 * i}px;width:540px;height:130px;display:flex;gap:16px;align-items:center;padding:0 26px;border-bottom:1px solid #26282b">
{av}<div><div style="font-size:19px;color:{'#fb7299' if i < k else '#9499a0'};font-weight:700">{n}</div><div style="font-size:23px;margin-top:5px">{t}</div></div></div>"""
    shot(f'feed{k}', 1080, 2400, f"""<div class="a" style="left:26px;top:30px;font-size:27px;font-weight:800">评论 <b style="color:#fb7299">237</b>
<span style="font-size:21px;color:#9499a0;font-weight:400;margin-left:20px">播放 12</span></div>{rows}""", 'body{background:#18191c;color:#e3e5e7}')

def think(n):
    s = BT.THINK; done = n >= len(s)
    shot(f'think{n:02d}', 1000, 460, f"""<div class="a" style="left:0;top:0;width:500px;height:230px;background:rgba(244,246,251,.92);padding:20px 26px;border-left:6px solid #4d6bfe">
<div style="font-size:19px;color:#4d6bfe;font-weight:700">{'🔍 已深度思考（用时 2 秒）' if done else '🔍 深度思考中…'}</div>
<div style="font-size:24px;line-height:1.45;color:#5a6070;margin-top:10px;font-style:italic">{H.escape(s[:n])}</div></div>""")

def seg_e():
    for k in range(9): feed(k)
    for n in BT.think_steps(): think(n)
    shot('q', 760, 230, f"""<div class="a" style="left:0;top:0;width:380px;height:115px;background:#fff;display:flex;gap:13px;align-items:center;padding:0 18px">
<div style="width:55px;height:55px;border-radius:50%;background:#c9ced8;flex:none;display:flex;align-items:center;justify-content:center;font-size:30px">🙂</div>
<div><div style="font-size:16px;color:#9499a0">网友 · 刚刚</div><div style="font-size:36px;font-weight:900;color:#18191c">你是不是 AI？</div></div></div>""")
    shot('reply', 900, 200, f"""<div class="a" style="left:0;top:0;width:450px;height:100px;background:#25305a;display:flex;gap:13px;align-items:center;padding:0 16px;color:#fff">
<img class="av" src="{AV}" style="width:56px;height:56px;border:2px solid #4d6bfe"><div><div style="font-size:16px;color:#fb7299;font-weight:700">大肥鱼本鲸 回复 @网友</div>
<div style="font-size:28px;font-weight:900">真不是机器人</div></div></div>""")

# ======================================================================= 真实界面（GPT 生成的高细节截图，demos/deepseek/ref/screens/）
from PIL import Image, ImageDraw, ImageFont, ImageFilter
SCR = DS / 'ref/screens'
def font(px, w=500):
    f = ImageFont.truetype(str(DS / '../../assets/fonts/NotoSansSC.ttf'), px)
    try: f.set_variation_by_axes([w])
    except Exception: pass
    return f
def up(name, k=2):
    """放大 k 倍 + 轻微锐化（贴到大屏幕上更清楚）"""
    im = Image.open(SCR / f'{name}.png').convert('RGB')
    return im.resize((im.width * k, im.height * k), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 60, 2))
def bubble(d, box, fill, r=28): d.rounded_rectangle(box, radius=r, fill=fill)
def real_screens():
    # 段 B：DeepSeek 平板 + 主人发的消息 + 正在思考
    im = up('ds_chat_tablet'); d = ImageDraw.Draw(im); k = 2
    f = font(30 * k, 500); t = '帮我写个周报'; tw = d.textlength(t, font=f)
    x1 = 1480 * k; bubble(d, (x1 - tw - 64 * k, 150 * k, x1, 222 * k), (77, 107, 254)); d.text((x1 - tw - 32 * k, 162 * k), t, font=f, fill='white')
    logo = Image.open(SCR / 'ds_chat_tablet.png').crop((846, 46, 912, 100)).resize((66 * k, 54 * k), Image.LANCZOS)
    im.paste(logo, (440 * k, 262 * k)); d.text((524 * k, 270 * k), '思考中 · · ·', font=font(28 * k, 400), fill=(150, 160, 185))
    im.save(OUT / 'scr_chat_b.png')
    # 服务器繁忙弹窗（DeepSeek 深色风格）
    W, H = 1000, 440; p = Image.new('RGB', (W, H), (30, 34, 48)); d = ImageDraw.Draw(p)
    d.rounded_rectangle((0, 0, W - 1, H - 1), radius=40, outline=(70, 78, 104), width=4)
    d.polygon([(70, 150), (110, 80), (150, 150)], fill=(255, 176, 64)); d.text((103, 98), '!', font=font(46, 800), fill=(30, 34, 48))
    d.text((180, 78), '服务器繁忙', font=font(64, 800), fill='white'); d.text((182, 170), '请稍后再试', font=font(40, 400), fill=(160, 168, 190))
    d.rounded_rectangle((640, 300, 940, 390), radius=45, fill=(77, 107, 254)); d.text((728, 314), '重试', font=font(44, 700), fill='white')
    p.save(OUT / 'scr_busy.png')
    # 段 E：评论区
    up('bili_comments').save(OUT / 'scr_comments.png')
    # 深度思考框：逐字出现
    base = up('think_box'); f = font(66 * 2, 500)
    for n in BT.think_steps():
        im = base.copy(); d = ImageDraw.Draw(im); x0, y, line = 110 * 2, 210 * 2, ''
        for ch in BT.THINK[:n]:
            if d.textlength(line + ch, font=f) > 1300 * 2: d.text((x0, y), line, font=f, fill=(90, 96, 112)); y += 100 * 2; line = ''
            line += ch
        d.text((x0, y), line, font=f, fill=(90, 96, 112))
        im.save(OUT / f'scr_think{n:02d}.png')
    # 你是不是 AI（B站深色评论卡）+ 她的回复卡
    def card(path, name, text, av_fill, me=False):
        W, H = 1520, 400; c = Image.new('RGB', (W, H), (36, 38, 44) if not me else (37, 48, 90)); d = ImageDraw.Draw(c)
        if me:
            a = Image.open(SCR / 'bili_comments.png').crop((40, 176, 152, 288)).resize((200, 200)); m = Image.new('L', (200, 200), 0); ImageDraw.Draw(m).ellipse((0, 0, 199, 199), fill=255); c.paste(a, (60, 100), m)
        else: d.ellipse((60, 100, 260, 300), fill=av_fill); d.text((118, 140), '?', font=font(110, 800), fill='white')
        d.text((310, 80), name, font=font(56, 700), fill=(251, 114, 153) if me else (160, 166, 176)); d.text((310, 170), text, font=font(110, 900), fill='white')
        c.save(OUT / path)
    card('scr_q.png', '网友 · 刚刚', '你是不是 AI？', (120, 128, 150))
    card('scr_reply.png', '大肥鱼本鲸 回复 @网友', '真不是机器人', None, me=True)

if __name__ == '__main__':
    seg_b(); seg_e(); real_screens(); print('ok →', OUT)
