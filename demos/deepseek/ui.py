#!/usr/bin/env python3
"""大肥鱼片子里的界面贴图：用 HTML 写，Chrome 无头截图成 PNG（build/ui/*.png），Blender 里贴到漂浮的界面板上。
用法：python3 demos/deepseek/ui.py   （需要 MG_CHROME 指向 Chrome，或者默认用 Playwright 自带的 Chromium）"""
import os, subprocess, pathlib

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / 'build/ui'; OUT.mkdir(parents=True, exist_ok=True)
CHROME = os.environ.get('MG_CHROME', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
FONT = (HERE / '../../assets/fonts/NotoSansSC.ttf').resolve().as_uri()
AV = (HERE / 'ref/avatar.png').resolve().as_uri()
LOGO = (HERE / 'whale.svg').resolve().as_uri()
BASE = f"""<meta charset="utf-8"><style>@font-face{{font-family:S;src:url({FONT});font-weight:100 900}}
*{{box-sizing:border-box;margin:0}}html,body{{width:100%;height:100%;overflow:hidden;font-family:S}}</style>"""

def shot(name, w, h, body, css=''):
    f = OUT / f'{name}.html'
    f.write_text(f'<!doctype html><html><head>{BASE}<style>{css}</style></head><body>{body}</body></html>', encoding='utf-8')
    subprocess.run([CHROME, '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                    f'--window-size={w},{h}', f'--screenshot={OUT / (name + ".png")}', f.as_uri()], check=True, capture_output=True)
    print(name, w, h)

# 1. 评论区（深色）：满屏大肥鱼，评论比播放还多
names = ['大肥鱼本鲸', '吃白饭的大肥鱼', '大肥鱼 No.07', '大肥鱼（摸鱼中）', '蓝色大肥鱼', '大肥鱼不是机器人', '大肥鱼 No.23', '今天也是大肥鱼']
texts = ['本鲸记下了：这期讲了 3 个重点，已整理成日报 @主人', '主人主人，这个视频值得看！', 'Token 快不够了……先去吃个饭', '本鲸也来留个言～', '总结：前 2 分钟是铺垫，第 3 分钟开始是干货',
         '楼上也是大肥鱼吗？', '本鲸觉得 UP 主讲得很好，但我饿了', '已加入待办：防扎堆']
rows = ''.join(f"""<div class="c"><img src="{AV}"><div class="t"><div class="n">{names[i]} <span class="lv">LV6</span></div>
<div class="x">{texts[i]}</div><div class="m">刚刚 · 👍 {[12, 3, 8, 1, 26, 5, 9, 2][i]} · 回复</div></div></div>""" for i in range(8))
shot('feed', 1080, 1890, f"""<div class="top"><span class="tab on">评论 <b>236</b></span><span class="tab">最热</span><span class="tab">最新</span></div>
<div class="stat">▶ 播放 <b>12</b>　·　💬 评论 <b class="hot">236</b></div>{rows}""",
     """body{background:#18191c;color:#e3e5e7;padding:56px 56px 0}
.top{display:flex;gap:44px;font-size:46px;color:#9499a0;border-bottom:3px solid #2f3134;padding-bottom:26px}.tab.on{color:#fff;font-weight:800}.tab b{color:#fb7299}
.stat{font-size:40px;color:#9499a0;margin:26px 0 18px}.stat b{color:#fff}.stat .hot{color:#fb7299;font-size:48px}
.c{display:flex;gap:28px;padding:30px 0;border-bottom:2px solid #26282b}.c img{width:112px;height:112px;border-radius:50%;flex:none;border:4px solid #4d6bfe}
.n{font-size:38px;color:#fb7299;font-weight:700}.lv{font-size:24px;background:#ff6699;color:#fff;border-radius:6px;padding:2px 8px;vertical-align:4px}
.x{font-size:44px;margin:10px 0 12px;line-height:1.35}.m{font-size:30px;color:#61666d}""")

# 2. 识图对话：DeepSeek 没认出自家 logo
shot('recog', 1080, 1440, f"""<div class="bar">识图</div>
<div class="me"><div class="img"><img src="{LOGO}"></div><div class="q">这是什么？</div></div>
<div class="ai"><div class="av"><img src="{LOGO}"></div><div class="a">这是一条<b>蓝色大肥鱼</b> 🐟<br>圆滚滚的，看起来很能吃～</div></div>""",
     """body{background:#f4f6fb;padding:60px}.bar{font-size:44px;font-weight:800;color:#1c1f26;text-align:center;padding-bottom:40px;border-bottom:2px solid #e3e7f0}
.me{display:flex;flex-direction:column;align-items:flex-end;gap:24px;margin:56px 0}.img{background:#fff;border-radius:36px;padding:44px;box-shadow:0 10px 30px rgba(40,60,120,.12)}
.img img{width:420px}.q{background:#4d6bfe;color:#fff;font-size:52px;padding:26px 44px;border-radius:44px 44px 12px 44px}
.ai{display:flex;gap:28px;align-items:flex-start}.av{width:110px;height:110px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex:none;border:3px solid #dfe5ff}
.av img{width:84px}.a{background:#fff;font-size:56px;line-height:1.45;padding:34px 46px;border-radius:12px 44px 44px 44px;color:#1c1f26;box-shadow:0 10px 30px rgba(40,60,120,.1)}.a b{color:#4d6bfe;font-size:64px}""")

# 3. 名场面评论卡：正常版 + 露馅版
card_css = """body{background:#fff;padding:56px 64px;color:#18191c}.h{display:flex;gap:30px;align-items:center}.h img{width:130px;height:130px;border-radius:50%;border:5px solid #4d6bfe}
.n{font-size:46px;color:#fb7299;font-weight:800}.m{font-size:30px;color:#9499a0;margin-top:6px}.x{font-size:62px;line-height:1.45;margin:36px 0 0;font-weight:500}
.leak{margin-top:34px;font-size:52px;line-height:1.4;color:#18191c;background:linear-gradient(transparent 38%,#ffe066 38%);padding:6px 4px;display:inline}.tip{font-size:34px;color:#9499a0;margin-top:22px}"""
head = f"""<div class="h"><img src="{AV}"><div><div class="n">大肥鱼不是机器人</div><div class="m">刚刚 · 回复 @网友：你是 AI 吗</div></div></div>
<div class="x">真不是机器人，字打了删删了打还打错两个，信不信随你</div>"""
shot('card', 1080, 760, head, card_css)
shot('card_leak', 1080, 1040, head + '<div style="margin-top:30px"><span class="leak">要是想语气再欠一点，可以用这句……</span></div><div class="tip">（备选回复也一起发出来了）</div>', card_css)

# 4. 小牌子
shot('token', 900, 420, '<div class="s">Token 不够啦<br><small>本鲸先去吃饭～</small></div>',
     "body{background:#fff6d6;display:flex;align-items:center;justify-content:center;border:18px solid #ffcf4d}.s{font-size:96px;font-weight:900;color:#3a2a10;text-align:center;line-height:1.2}.s small{font-size:56px;font-weight:600;color:#8a6a2a}")

# 5. 视频播放器（刷视频）
shot('video', 1080, 700, """<div class="v"><div class="ttl">【硬核】30 分钟讲透 AI Agent</div><div class="play">▶</div></div>
<div class="bar"><div class="fill"></div><div class="knob"></div></div><div class="tm">11:08 / 30:00　　1.0x　　字幕 ✓</div>""",
     """body{background:#0f1012;color:#fff}.v{height:560px;background:linear-gradient(135deg,#232a4a,#4d6bfe);position:relative}.ttl{position:absolute;left:44px;top:36px;font-size:46px;font-weight:800}
.play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:150px;opacity:.85}.bar{height:16px;background:#3a3c40;margin:22px 40px 0;border-radius:8px;position:relative}
.fill{width:37%;height:100%;background:#fb7299;border-radius:8px}.knob{position:absolute;left:37%;top:50%;width:40px;height:40px;margin:-20px;background:#fff;border-radius:50%}.tm{font-size:32px;color:#c9ccd0;margin:20px 40px}""")

# 6. 键盘（俯视）
keys = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']
kb = ''.join(f'<div class="r" style="padding-left:{i * 46}px">' + ''.join(f'<span>{k}</span>' for k in row) + '</div>' for i, row in enumerate(keys))
shot('keyboard', 1600, 640, kb + '<div class="r" style="padding-left:300px"><span class="sp">空格</span><span class="en">发送</span></div>',
     "body{background:#1d2030;padding:40px}.r{display:flex;gap:16px;margin-bottom:16px}.r span{width:132px;height:118px;background:#f3f5fb;border-radius:22px;display:flex;align-items:center;justify-content:center;font-size:52px;font-weight:700;color:#2a2f45;box-shadow:0 10px 0 #b9c0d6}"
     ".r .sp{width:640px}.r .en{width:300px;background:#4d6bfe;color:#fff;box-shadow:0 10px 0 #2e45b8}")

# 7. 手机锁屏：早安
shot('lock', 1080, 1920, f"""<div class="time">07:30</div><div class="date">10月25日 星期六</div>
<div class="n"><img src="{AV}"><div><div class="app">大肥鱼 · 刚刚</div><div class="msg">早安，主人～<br>今天也要按时吃饭哦（本鲸也是）</div></div></div>""",
     """body{background:linear-gradient(180deg,#ffd9a8,#f7a6b8 45%,#7b8cff);color:#fff;text-align:center;padding-top:260px}.time{font-size:260px;font-weight:300;letter-spacing:-6px}.date{font-size:52px;opacity:.9}
.n{display:flex;gap:30px;text-align:left;margin:140px 50px 0;background:rgba(255,255,255,.75);color:#2a2230;border-radius:48px;padding:40px}.n img{width:130px;height:130px;border-radius:30px}
.app{font-size:34px;color:#6b6070}.msg{font-size:50px;line-height:1.4;margin-top:8px;font-weight:600}""")
