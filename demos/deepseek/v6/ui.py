#!/usr/bin/env python3
"""v6《请证明你不是机器人》的界面图 → demos/deepseek/build/v6ui/
python3 demos/deepseek/v6/ui.py"""
import os, sys, subprocess, pathlib, math, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = pathlib.Path(__file__).resolve().parent; DS = HERE.parent
OUT = DS / 'build/v6ui'; OUT.mkdir(parents=True, exist_ok=True)
SCR = DS / 'ref/screens'
MAC = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
CHROME = os.environ.get('MG_CHROME') or (MAC if os.path.exists(MAC) else '/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
U = lambda p: pathlib.Path(p).resolve().as_uri()
FONT, AV, LOGO = U(DS / '../../assets/fonts/NotoSansSC.ttf'), U(SCR / 'bili_comments.png'), U(DS / 'whale.svg')
BASE = f"""@font-face{{font-family:S;src:url({FONT});font-weight:100 900}}
*{{box-sizing:border-box;margin:0;padding:0}}html,body{{width:100%;height:100%;overflow:hidden;font-family:S,'PingFang SC',sans-serif}}.a{{position:absolute}}"""

def shot(name, w, h, body, css=''):
    """按 1/2 尺寸写 HTML，zoom:2 输出 w×h；窗口开大再裁（无头 Chrome 小窗口会自己缩放）"""
    f = OUT / f'{name}.html'; png = OUT / f'{name}.png'
    f.write_text(f'<!doctype html><html><head><meta charset="utf-8"><style>{BASE}{css}</style></head><body><div style="zoom:2;width:{w // 2}px;height:{h // 2}px;position:relative;overflow:hidden">{body}</div></body></html>', encoding='utf-8')
    subprocess.run([CHROME, '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--allow-file-access-from-files',
                    f'--window-size={max(w, 1600) + 200},{max(h, 1600) + 200}', f'--screenshot={png}', f.as_uri()], check=True, capture_output=True)
    Image.open(png).crop((0, 0, w, h)).save(png)

TABLET = (2400, 1600)
def browser(inner, url='安全验证'):
    """平板浏览器外壳：状态栏 + 地址栏 + 页面"""
    return f"""<div class="a" style="left:0;top:0;width:1200px;height:800px;background:#eef1f7">
<div class="a" style="left:0;top:0;width:1200px;height:30px;font-size:13px;color:#333;display:flex;align-items:center;justify-content:space-between;padding:0 20px"><b>9:41　10月25日 周六</b><span>📶　100% ▮</span></div>
<div class="a" style="left:0;top:30px;width:1200px;height:52px;background:#f8f9fc;border-bottom:1px solid #dde2ec;display:flex;align-items:center;gap:14px;padding:0 20px">
<span style="color:#9aa3b5;font-size:20px">‹　›</span><div style="flex:1;height:34px;border-radius:17px;background:#e8ebf2;display:flex;align-items:center;justify-content:center;font-size:14px;color:#566">🔒 {url}</div><span style="color:#9aa3b5;font-size:18px">⟳　⋯</span></div>
{inner}</div>"""

def captcha(state):
    """通用人机验证卡（不用任何品牌样式）。state: off / on / fail"""
    if state == 'fail':
        card = """<div class="a" style="left:300px;top:250px;width:600px;height:260px;border-radius:24px;background:#fff;box-shadow:0 20px 60px rgba(200,40,60,.25);border:3px solid #ff4d5e;overflow:hidden">
<div style="height:110px;background:linear-gradient(90deg,#ff3b4f,#ff6b6b);display:flex;align-items:center;gap:18px;padding:0 34px;color:#fff;font-size:38px;font-weight:900">✕ 验证失败</div>
<div style="padding:28px 34px;font-size:26px;color:#3a3f4a">检测到 <b style="color:#ff3b4f">AI</b>，请重新验证</div>
<div class="a" style="right:30px;bottom:26px;font-size:20px;color:#9aa3b5">错误码 0x大肥鱼</div></div>"""
    else:
        box = ('<div style="width:76px;height:76px;border-radius:14px;background:#22c55e;display:flex;align-items:center;justify-content:center;color:#fff;font-size:58px;font-weight:900">✓</div>'
               if state == 'on' else '<div style="width:76px;height:76px;border-radius:14px;border:5px solid #9aa3b5;background:#fff"></div>')
        card = f"""<div class="a" style="left:300px;top:250px;width:600px;height:200px;border-radius:24px;background:#fff;box-shadow:0 20px 60px rgba(40,60,120,.18);display:flex;align-items:center;padding:0 40px;gap:28px">
{box}<div style="font-size:38px;font-weight:700;color:#1c1f26">我不是机器人</div>
<div style="margin-left:auto;text-align:center;color:#6b7085;font-size:15px"><div style="font-size:52px">🛡️</div>人机验证<br><span style="font-size:12px;color:#9aa3b5">隐私 · 条款</span></div></div>"""
    title = '<div class="a" style="left:0;top:150px;width:1200px;text-align:center;font-size:34px;font-weight:900;color:#1c1f26">请证明：你不是机器人</div>'
    steps = '<div class="a" style="left:0;top:560px;width:1200px;display:flex;justify-content:center;gap:16px">' + ''.join(
        f'<div style="width:46px;height:8px;border-radius:4px;background:{"#4d6bfe" if i == 0 else "#cfd6e6"}"></div>' for i in range(5)) + '</div>'
    shot(f'captcha_{state}', *TABLET, browser(title + card + steps))

def puzzle():
    """第二关：拖动滑块完成拼图。缺口是一个圆角拼图块形状（比她瘦）"""
    shot('puzzle', *TABLET, browser("""
<div class="a" style="left:0;top:110px;width:1200px;text-align:center;font-size:30px;font-weight:900;color:#1c1f26">第二关：拖动滑块完成拼图</div>
<div class="a" style="left:270px;top:170px;width:660px;height:440px;border-radius:24px;background:#fff;box-shadow:0 20px 60px rgba(40,60,120,.18);padding:24px">
 <div style="position:relative;width:612px;height:300px;border-radius:14px;overflow:hidden;background:linear-gradient(180deg,#7ec8ff 0%,#bfe6ff 45%,#4d6bfe 46%,#2b47c9 100%)">
  <div class="a" style="left:60px;top:40px;width:90px;height:90px;border-radius:50%;background:#fff3b0;box-shadow:0 0 40px #fff3b0"></div>
  <div class="a" style="left:0;top:150px;width:612px;height:20px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.5) 0 30px,transparent 30px 60px)"></div>
  <div class="a" style="left:400px;top:90px;width:120px;height:150px;border-radius:22px;background:rgba(10,20,50,.55);box-shadow:inset 0 0 0 4px rgba(255,255,255,.9)"></div>
  <div class="a" style="left:446px;top:72px;width:30px;height:30px;border-radius:50%;background:rgba(10,20,50,.55);box-shadow:inset 0 0 0 4px rgba(255,255,255,.9)"></div>
 </div>
 <div style="margin-top:26px;height:64px;border-radius:32px;background:#eef1f7;position:relative;display:flex;align-items:center;justify-content:center;color:#9aa3b5;font-size:20px">向右拖动滑块 →
  <div class="a" style="left:6px;top:6px;width:120px;height:52px;border-radius:26px;background:#4d6bfe;color:#fff;font-size:28px;display:flex;align-items:center;justify-content:center">⇢</div></div>
</div>"""))

def stock():
    """第三关：股票 App（国内配色：涨红跌绿），英伟达最后一根巨大的绿柱"""
    random.seed(4); W, H = 1200, 800
    x0, x1, y0, y1 = 70, 1130, 210, 690
    p = 142.0; cs = []
    for i in range(34):
        o = p; c = o + random.uniform(-3, 3.4); hi, lo = max(o, c) + random.uniform(.5, 2.5), min(o, c) - random.uniform(.5, 2.5); cs.append((o, c, hi, lo)); p = c
    o = p; c = o * .83; cs.append((o, c, o + 1, c - 1.5))
    mn, mx = min(x[3] for x in cs) - 2, max(x[2] for x in cs) + 2
    Y = lambda v: y0 + (mx - v) / (mx - mn) * (y1 - y0)
    svg = ''
    for i, (o, c, hi, lo) in enumerate(cs):
        cx = x0 + (i + .5) * (x1 - x0) / len(cs); w = (x1 - x0) / len(cs) * .62; col = '#f5455c' if c >= o else '#1fc77e'
        if i == len(cs) - 1: w *= 1.4
        svg += f'<line x1="{cx}" x2="{cx}" y1="{Y(hi)}" y2="{Y(lo)}" stroke="{col}" stroke-width="2"/><rect x="{cx - w / 2}" y="{Y(max(o, c))}" width="{w}" height="{max(2, Y(min(o, c)) - Y(max(o, c)))}" fill="{col}" rx="2"/>'
    grid = ''.join(f'<line x1="{x0}" x2="{x1}" y1="{y}" y2="{y}" stroke="#2a2f3a" stroke-width="1"/>' for y in range(y0, y1 + 1, 80))
    shot('stock', W * 2, H * 2, f"""<div class="a" style="left:0;top:0;width:{W}px;height:{H}px;background:#12151c;color:#e8ebf2">
<div class="a" style="left:40px;top:30px;font-size:22px;color:#9aa3b5">美股 · 纳斯达克　2025-01-27</div>
<div class="a" style="left:40px;top:66px;font-size:46px;font-weight:900">英伟达 <span style="font-size:28px;color:#9aa3b5;font-weight:500">NVDA</span></div>
<div class="a" style="left:40px;top:130px;font-size:52px;font-weight:900;color:#1fc77e">118.42 <span style="font-size:32px">−16.97%</span></div>
<div class="a" style="right:40px;top:80px;text-align:right;font-size:24px;color:#9aa3b5">单日市值蒸发<br><b style="font-size:44px;color:#1fc77e">约 5890 亿美元</b></div>
<svg class="a" style="left:0;top:0" width="{W}" height="{H}">{grid}{svg}</svg>
<div class="a" style="left:0;top:720px;width:{W}px;display:flex;justify-content:space-around;font-size:22px;color:#9aa3b5"><span style="color:#fff">日K</span><span>周K</span><span>月K</span><span>分时</span><span>五日</span></div></div>""")
    # 最后一根绿柱在图上的位置（给 3D 滑梯对齐用），写进一个小文件
    i = len(cs) - 1; cx = x0 + (i + .5) * (x1 - x0) / len(cs)
    (OUT / 'stock_slide.txt').write_text(f'{cx / W} {Y(cs[-1][0]) / H} {Y(cs[-1][1]) / H}')

def owner():
    """主人的那句话：DeepSeek 平板对话（GPT 生成的底图上加气泡）"""
    im = Image.open(SCR / 'ds_chat_tablet.png').convert('RGB'); k = 2
    im = im.resize((im.width * k, im.height * k), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 60, 2)); d = ImageDraw.Draw(im)
    def font(px, w=500):
        f = ImageFont.truetype(str(DS / '../../assets/fonts/NotoSansSC.ttf'), px)
        try: f.set_variation_by_axes([w])
        except Exception: pass
        return f
    # 她的回复（失败卡缩小版）+ 主人的话
    d.rounded_rectangle((440 * k, 150 * k, 900 * k, 240 * k), radius=24 * k, fill=(60, 30, 40)); d.text((470 * k, 172 * k), '✕ 验证失败：检测到 AI', font=font(30 * k, 700), fill=(255, 110, 120))
    lines = ['没关系，我知道你是谁。', '你是我的大肥鱼。']; f = font(36 * k, 600)
    tw = max(d.textlength(t, font=f) for t in lines); x1 = 1480 * k; y = 300 * k
    d.rounded_rectangle((x1 - tw - 70 * k, y, x1, y + 150 * k), radius=30 * k, fill=(77, 107, 254))
    for i, t in enumerate(lines): d.text((x1 - tw - 36 * k, y + 22 * k + i * 56 * k), t, font=f, fill='white')
    d.text((x1 - 120 * k, y + 160 * k), '主人 · 刚刚', font=font(20 * k, 400), fill=(150, 160, 185))
    im.save(OUT / 'owner.png')

def endcard():
    shot('endcard', 1600, 600, """<div class="a" style="left:0;top:0;width:800px;height:300px;background:#fff;display:flex;align-items:center;gap:40px;padding:0 60px">
<div style="width:120px;height:120px;border-radius:22px;border:8px solid #9aa3b5"></div><div style="font-size:64px;font-weight:900;color:#1c1f26">我也不是机器人</div></div>""")

def bubble():
    shot('bubble', 600, 260, """<div class="a" style="left:0;top:0;width:300px;height:130px;background:#4d6bfe;display:flex;align-items:center;justify-content:center;color:#fff;font-size:64px;font-weight:800">你好</div>""")

def crops():
    # 勾选框单独裁出来，做成 3D 小方块的顶面
    im = Image.open(OUT / 'captcha_on.png'); im.crop((680, 624, 832, 776)).save(OUT / 'check.png')

if __name__ == '__main__':
    for s in ('off', 'on', 'fail'): captcha(s)
    crops()
    puzzle(); stock(); owner(); endcard(); bubble()
    print('ok →', OUT)
