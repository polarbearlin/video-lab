#!/usr/bin/env python3
"""每块界面板的所有「状态图」：HTML → Chrome 无头截图 → build/ui2/<面板>/<状态>.png；
再按 timeline.json 给每块板做一份逐帧序列（软链接 seq/f_0001.png …），Blender 当图像序列贴上去。
python3 demos/deepseek/ui_states.py        （先跑 timeline.py）
Mac 会自动找 /Applications/Google Chrome.app；也可以用 MG_CHROME 指定。"""
import os, sys, json, subprocess, pathlib, html as H
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import timeline as TL

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / 'build/ui2'
MAC = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
CHROME = os.environ.get('MG_CHROME') or (MAC if os.path.exists(MAC) else '/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
U = lambda p: pathlib.Path(p).resolve().as_uri()
FONT, AV, LOGO = U(HERE / '../../assets/fonts/NotoSansSC.ttf'), U(HERE / 'ref/avatar.png'), U(HERE / 'whale.svg')
BASE = f"""@font-face{{font-family:S;src:url({FONT});font-weight:100 900}}
*{{box-sizing:border-box;margin:0;padding:0}}html,body{{width:100%;height:100%;overflow:hidden;font-family:S,'PingFang SC',sans-serif}}
.a{{position:absolute}}.caret{{display:inline-block;width:5px;height:1.05em;background:#4d6bfe;vertical-align:-.15em;margin-left:4px}}
.av{{border-radius:50%;border:4px solid #4d6bfe;object-fit:cover}}"""
DARK = 'body{background:#18191c;color:#e3e5e7}'

def shot(panel, state, body, css='', size=None):
    w, h = size or TL.PANELS[panel]['px']
    d = OUT / panel; d.mkdir(parents=True, exist_ok=True)
    f = d / f'{state}.html'
    f.write_text(f'<!doctype html><html><head><meta charset="utf-8"><style>{BASE}{css}</style></head><body>{body}</body></html>', encoding='utf-8')
    subprocess.run([CHROME, '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                    '--allow-file-access-from-files', f'--window-size={w},{h}', f'--screenshot={d / (state + ".png")}', f.as_uri()],
                   check=True, capture_output=True)

def typed(s, n, caret=True): return H.escape(s[:n]) + ('<span class="caret"></span>' if caret else '')

# ---------------- 1. 视频页：评论比播放还多
def video(state):
    n = '236' if state == 'c236' else '237'
    hot = 'transform:scale(1.08);background:#fb7299;color:#fff' if state == 'c237' else ''
    shot('video', state, f"""
<div class="a" style="left:0;top:0;width:1080px;height:600px;background:linear-gradient(135deg,#232a4a,#4d6bfe)">
  <div class="a" style="left:48px;top:40px;font-size:46px;font-weight:800">【硬核】30 分钟讲透 AI Agent</div>
  <div class="a" style="left:470px;top:200px;font-size:150px;opacity:.85">▶</div>
  <div class="a" style="left:40px;top:560px;width:1000px;height:14px;background:#3a3c40;border-radius:7px"><div style="width:37%;height:100%;background:#fb7299;border-radius:7px"></div></div></div>
<div class="a" style="left:48px;top:640px;font-size:40px;color:#9499a0">UP 主：某某科技　·　3 小时前</div>
<div class="a" style="left:60px;top:760px;font-size:56px;color:#9499a0">▶ 播放 <b style="color:#fff">12</b></div>
<div class="a" style="left:560px;top:735px;width:400px;height:170px;border-radius:40px;background:#2a2c31;color:#fb7299;display:flex;align-items:center;justify-content:center;gap:18px;font-size:58px;{hot}">
  💬 <b style="font-size:96px">{n}</b></div>
<div class="a" style="left:48px;top:980px;width:984px;border-top:3px solid #2f3134;padding-top:40px;font-size:44px;color:#9499a0;display:flex;gap:60px">
  <span style="color:#fff;font-weight:800">评论 <b style="color:#fb7299">{n}</b></span><span>最热</span><span>最新</span></div>
<div class="a" style="left:48px;top:1140px;font-size:38px;color:#61666d">↓ 往下看，全是同一条鱼</div>""", DARK)

# ---------------- 2. 评论区：每行都是大肥鱼（她踩到的那行亮起来）
NAMES = ['大肥鱼本鲸', '吃白饭的大肥鱼', '大肥鱼 No.07', '大肥鱼（摸鱼中）', '蓝色大肥鱼', '大肥鱼不是机器人', '大肥鱼 No.23', '今天也是大肥鱼', '大肥鱼 No.99']
TEXTS = ['本鲸记下了：这期讲了 3 个重点 @主人', '主人主人，这个视频值得看！', 'Token 快不够了……先去吃个饭', '本鲸也来留个言～',
         '总结：前 2 分钟铺垫，第 3 分钟是干货', '楼上也是大肥鱼吗？', '本鲸觉得讲得很好，但我饿了', '已加入待办：防扎堆', '+1']
def feed(state):
    k = int(state[1:])
    rows = ''.join(f"""<div class="a" style="left:0;top:{220 + 200 * i}px;width:1080px;height:200px;display:flex;gap:28px;align-items:center;padding:0 50px;
border-bottom:2px solid #26282b;{'background:#25305a;box-shadow:inset 10px 0 0 #4d6bfe' if i == k else ''}">
<img class="av" src="{AV}" style="width:112px;height:112px;flex:none"><div><div style="font-size:36px;color:#fb7299;font-weight:700">{NAMES[i]}
<span style="font-size:22px;background:#ff6699;color:#fff;border-radius:6px;padding:2px 8px;vertical-align:4px">LV6</span></div>
<div style="font-size:42px;margin-top:8px">{TEXTS[i]}</div></div></div>""" for i in range(8))
    shot('feed', state, f"""<div class="a" style="left:50px;top:60px;font-size:50px;font-weight:800">评论 <b style="color:#fb7299">237</b>
<span style="font-size:40px;color:#9499a0;font-weight:400;margin-left:40px">播放 12</span></div>
<div class="a" style="left:50px;top:150px;font-size:32px;color:#61666d">按热度排序</div>{rows}""", DARK)

# ---------------- 3. 评论输入框 + 键盘：她蹦一下打一个字
KEYS = {}
for r, (row, y, x0) in enumerate((('QWERTYUIOP', 470, 90), ('ASDFGHJKL', 600, 140), ('ZXCVBNM', 730, 240))):
    for i, ch in enumerate(row): KEYS[ch] = (x0 + 100 * i, y)
def near_key(x, y): return min(KEYS, key=lambda c: (KEYS[c][0] - x) ** 2 + (KEYS[c][1] - y) ** 2)
def input_(state):
    n = 6 if state == 'sent' else int(state[1:])
    hit = near_key(*TL.KEYS[n - 1]) if state != 'sent' and n > 0 else None
    keys = ''.join(f"""<div class="a" style="left:{x - 43}px;top:{y - 55}px;width:86px;height:110px;border-radius:18px;font-size:46px;font-weight:700;
display:flex;align-items:center;justify-content:center;{'background:#4d6bfe;color:#fff;box-shadow:0 4px 0 #2e45b8' if c == hit else 'background:#f3f5fb;color:#2a2f45;box-shadow:0 8px 0 #b9c0d6'}">{c}</div>"""
                   for c, (x, y) in KEYS.items())
    send = 'background:#7d93ff' if state == 'sent' else 'background:#4d6bfe'
    box = ('<span style="color:#61666d">发一条友善的评论</span><span class="caret"></span>' if n == 0 else
           ('<span style="color:#61666d">发一条友善的评论</span>' if state == 'sent' else f'<b style="font-size:72px">{typed(TL.TYPE_1, n)}</b>'))
    toast = ('<div class="a" style="left:290px;top:290px;width:500px;height:70px;border-radius:35px;background:#2fbf71;color:#fff;font-size:36px;display:flex;align-items:center;justify-content:center">评论已发送 ✓</div>'
             if state == 'sent' else '')
    shot('input', state, f"""<div class="a" style="left:40px;top:60px;width:1000px;height:200px;border-radius:30px;background:#2a2c31;border:4px solid #4d6bfe;
display:flex;align-items:center;padding:0 44px;font-size:52px">{box}</div>{toast}
<div class="a" style="left:0;top:380px;width:1080px;height:620px;background:#1d2030"></div>{keys}
<div class="a" style="left:220px;top:850px;width:500px;height:110px;border-radius:18px;background:#f3f5fb;color:#2a2f45;font-size:40px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 0 #b9c0d6">空格</div>
<div class="a" style="left:790px;top:850px;width:180px;height:110px;border-radius:18px;{send};color:#fff;font-size:44px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 0 #2e45b8">发送</div>""", DARK)

# ---------------- 4. 回复区：被问"你是不是 AI"，秒回，还把备选回复一起发了
def comment(top, name, text, extra=''):
    return f"""<div class="a" style="left:40px;top:{top}px;width:1000px;display:flex;gap:28px;{extra}">
<img class="av" src="{AV}" style="width:110px;height:110px;flex:none"><div><div style="font-size:36px;color:#fb7299;font-weight:700">{name}</div>
<div style="font-size:46px;line-height:1.4;margin-top:8px">{text}</div></div></div>"""
def reply(state):
    n = 6 if state in ('sent', 'leak') else int(state[1:])
    mine = comment(60, '大肥鱼本鲸', '本鲸记下了～<br><span style="font-size:34px;color:#9499a0">刚刚 · 👍 12 · 回复</span>')
    ans = ''
    if state in ('sent', 'leak'):
        ans = comment(660, '大肥鱼本鲸 <span style="color:#9499a0;font-weight:400">回复 @网友</span>',
                      '<b style="font-size:58px">真不是机器人</b>，字打了删删了打，还打错两个，信不信随你')
    leak = ('<div class="a" style="left:178px;top:1010px;font-size:46px;font-weight:700;color:#1b1b1b;background:#ffe066;padding:8px 18px;border-radius:8px">要是想语气再欠一点，可以用这句……</div>'
            if state == 'leak' else '')
    bar = '<span style="color:#61666d">回复 @网友：</span>' + (f'<b style="font-size:60px">{typed(TL.TYPE_2, n)}</b>' if 0 < n and state not in ('sent', 'leak') else '<span class="caret"></span>' if state == 'a0' else '')
    shot('reply', state, f"""{mine}{ans}{leak}
<div class="a" style="left:40px;top:1130px;width:1000px;height:130px;border-radius:30px;background:#2a2c31;border:4px solid #4d6bfe;display:flex;align-items:center;padding:0 40px;font-size:44px">{bar}</div>""", DARK)

def drop():
    shot('drop', 'q', f"""<div class="a" style="zoom:1.5;left:0;top:0;width:760px;height:230px;background:#fff;display:flex;gap:26px;align-items:center;padding:0 36px">
<div style="width:110px;height:110px;border-radius:50%;background:#c9ced8;flex:none;display:flex;align-items:center;justify-content:center;font-size:60px">🙂</div>
<div><div style="font-size:32px;color:#9499a0">网友 · 刚刚</div><div style="font-size:72px;font-weight:900;color:#18191c">你是不是 AI？</div></div></div>""",
         size=TL.DROP['px'])

# ---------------- 5. 清除插件：开关一拨，评论一条条消失
def plugin(state):
    on = state != 'off'; gone = int(state[1:]) if state.startswith('v') else 0
    rows = ''
    for i in range(6):
        top = 260 + 170 * i
        if i < gone:
            rows += f'<div class="a" style="left:60px;top:{top + 20}px;width:960px;height:130px;border:3px dashed #d4d8e2;border-radius:24px;color:#b4bac6;font-size:36px;display:flex;align-items:center;justify-content:center">已清除</div>'
        else:
            rows += f"""<div class="a" style="left:60px;top:{top + 20}px;width:960px;height:130px;border-radius:24px;background:#f4f6fb;display:flex;gap:24px;align-items:center;padding:0 26px">
<img class="av" src="{AV}" style="width:90px;height:90px"><div style="font-size:38px;color:#18191c"><b style="color:#fb7299">{NAMES[i]}</b>：{TEXTS[i][:12]}…</div></div>"""
    tg = ('background:#2fbf71', 'left:72px') if on else ('background:#c9ced8', 'left:6px')
    shot('plugin', state, f"""<div class="a" style="left:20px;top:20px;width:1040px;height:1260px;border-radius:44px;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.4)"></div>
<div class="a" style="left:60px;top:70px;font-size:54px;font-weight:900;color:#18191c">🧹 大肥鱼清除计划</div>
<div class="a" style="left:62px;top:160px;font-size:32px;color:#9499a0">{'正在清除…' if on else '已识别 237 条大肥鱼评论'}</div>
<div class="a" style="left:840px;top:82px;width:150px;height:84px;border-radius:42px;{tg[0]}"><div class="a" style="{tg[1]};top:6px;width:72px;height:72px;border-radius:50%;background:#fff"></div></div>
{rows}""", 'body{background:#0e1220}')

# ---------------- 6. 手机锁屏：早安
def lock(state):
    n = int(state[1:])
    note = '' if n == 0 else f"""<div class="a" style="left:50px;top:700px;width:980px;border-radius:48px;background:rgba(255,255,255,.82);color:#2a2230;padding:40px;display:flex;gap:30px">
<img src="{AV}" style="width:130px;height:130px;border-radius:30px;flex:none"><div><div style="font-size:34px;color:#6b6070">大肥鱼 · 刚刚</div>
<div style="font-size:64px;font-weight:800;margin-top:6px">{typed(TL.TYPE_LOCK, n, n < 6)}</div>
{'<div style="font-size:40px;margin-top:10px">今天也要按时吃饭哦（本鲸也是）</div>' if n == 7 else ''}</div></div>"""
    shot('lock', state, f"""<div class="a" style="left:0;top:250px;width:1080px;text-align:center;font-size:260px;font-weight:300;letter-spacing:-6px">07:30</div>
<div class="a" style="left:0;top:560px;width:1080px;text-align:center;font-size:52px;opacity:.9">10月25日 星期六</div>{note}
<div class="a" style="left:0;top:1800px;width:1080px;text-align:center;font-size:36px;opacity:.8">上滑解锁</div>""",
         'body{background:linear-gradient(180deg,#ffd9a8,#f7a6b8 45%,#7b8cff);color:#fff}')

# ---------------- 7. DeepSeek 对话框：本鲸还在哦
def chat(state):
    q = state != 'q0'; n = int(state[1:]) if state.startswith('c') else 0
    body = f"""<div class="a" style="left:0;top:40px;width:1080px;height:110px;display:flex;align-items:center;justify-content:center;gap:20px;font-size:48px;font-weight:800;color:#1c1f26">
<img src="{LOGO}" style="width:80px">DeepSeek</div><div class="a" style="left:0;top:170px;width:1080px;border-top:2px solid #e3e7f0"></div>"""
    if not q:
        body += f'<div class="a" style="left:0;top:560px;width:1080px;text-align:center;font-size:48px;color:#9aa3b5"><img src="{LOGO}" style="width:180px;opacity:.35"><br>今天想聊点什么？</div>'
    else:
        body += '<div class="a" style="right:50px;top:240px;background:#4d6bfe;color:#fff;font-size:54px;padding:26px 44px;border-radius:44px 44px 12px 44px">你会一直在吗？</div>'
    if n:
        body += f"""<div class="a" style="left:50px;top:440px;display:flex;gap:26px;align-items:flex-start">
<div style="width:110px;height:110px;border-radius:50%;border:3px solid #dfe5ff;background:#fff;display:flex;align-items:center;justify-content:center;flex:none"><img src="{LOGO}" style="width:80px"></div>
<div style="background:#fff;font-size:76px;font-weight:800;padding:30px 50px;border-radius:12px 44px 44px 44px;color:#1c1f26;box-shadow:0 10px 30px rgba(40,60,120,.12)">{typed(TL.TYPE_CHAT, n, n < 5)}</div></div>"""
    body += """<div class="a" style="left:40px;top:1240px;width:1000px;height:180px;border-radius:50px;background:#fff;border:3px solid #dfe5ff;box-shadow:0 10px 30px rgba(40,60,120,.1);
display:flex;align-items:center;padding:0 50px;font-size:44px;color:#9aa3b5">给 DeepSeek 发送消息
<div style="margin-left:auto;width:100px;height:100px;border-radius:50%;background:#4d6bfe;color:#fff;display:flex;align-items:center;justify-content:center;font-size:54px">↑</div></div>"""
    shot('chat', state, body, 'body{background:#f4f6fb}')

MAKERS = dict(video=video, feed=feed, input=input_, reply=reply, plugin=plugin, lock=lock, chat=chat)

def sequences(J):
    """每块板一份逐帧序列：seq/f_0001.png → ../<状态>.png（软链接，不占空间）"""
    for p in TL.PANELS:
        d = OUT / p / 'seq'; d.mkdir(parents=True, exist_ok=True)
        for fr in J['frames']:
            dst = d / f"f_{fr['f']:04d}.png"
            if dst.is_symlink() or dst.exists(): dst.unlink()
            os.symlink(f"../{fr['ui'][p]}.png", dst)

if __name__ == '__main__':
    J = json.load(open(HERE / 'build/timeline.json'))
    only = sys.argv[1:]   # 可以只重做某几块：python3 ui_states.py reply lock
    for p, states in J['states'].items():
        if only and p not in only: continue
        for s in states: MAKERS[p](s)
        print(p, len(states), 'states')
    if not only or 'drop' in only: drop()
    sequences(J); print('seq ok →', OUT)
