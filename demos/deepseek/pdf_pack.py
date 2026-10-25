#!/usr/bin/env python3
"""大肥鱼 30 秒片子的「导演提示词包」PDF（仿 No After Effects / Neon Jump 那两份 PDF 的结构）。
图片先用现有素材示意，成片渲染出来后把 build/pdf/ 里的图换成真实画面再跑一遍即可。
用法：python3 demos/deepseek/pdf_pack.py  → build/pdf/大肥鱼_提示词包.pdf"""
import os, subprocess, pathlib, html

HERE = pathlib.Path(__file__).resolve().parent
B = HERE / 'build'; OUT = B / 'pdf'; OUT.mkdir(parents=True, exist_ok=True)
CHROME = os.environ.get('MG_CHROME', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
U = lambda p: pathlib.Path(p).resolve().as_uri()
FONT = U(HERE / '../../assets/fonts/NotoSansSC.ttf'); SERIF = U(HERE / '../../assets/fonts/InstrumentSerif-Italic.ttf')
UI = lambda n: U(B / 'ui' / f'{n}.png')

FPS = 30
# 时间(秒), 画面, 屏幕上的字(MG), 字幕, 声音
BEATS = [
    (0.0, 'feed', '她从天而降，砸在评论数上：236 → 237', '播放 12 · 评论 237', '播放 12，评论 236？', '落地"咚"+ 计数器"咔"'),
    (2.5, 'feed', '沿着评论一行一行蹦过去，每一行头像都是她', '全是 大肥鱼', '点开一看，全是同一条鱼：大肥鱼', '每跳一下一个木琴音，踩在拍上'),
    (6.0, 'keyboard', '在键盘上蹦着打字，最后一屁股坐在「发送」上', '本鲸记下了～', '她是网友用 DeepSeek 养的 AI，会自己刷视频、写评论', '按键"嗒嗒"+ 发送"啵"'),
    (10.0, 'card', '一条回复砸下来，她被压扁，回头看镜头', '你是不是 AI？', '直到有人问：你是不是 AI？', '音乐骤停 + "叮"'),
    (13.0, 'card', '慌张快速蹦字，发送', '真不是机器人', '她秒回："真不是机器人"', '急促按键 ×12'),
    (17.0, 'card_leak', '黄色高亮一行冒出来，她跳上去狂踩', '要是想语气再欠一点……', '……连"备选回复"都一起发了出来', '"嘟——"出糗音 + 踩踏三连'),
    (20.0, 'feed', '弹窗「大肥鱼清除计划」开关一拨，评论一条条消失，她逃跑', '一键清除 大肥鱼', '有人做了插件，一键清除大肥鱼', '开关"咔哒" + 一串"嗖嗖"'),
    (24.0, 'lock', '镜头推到手机锁屏，通知逐字打出', '早安，主人～', '也有人每天，都在等她这句早安', '音乐转暖，钢琴单音'),
    (27.5, 'recog', '她坐在 DeepSeek 对话框上，晃腿，可循环', '本鲸还在哦', '想给她一个完整的"人生"，大概是因为：离不开她了', '尾音 + 一声轻"啵"'),
]
END = 30.0

PROMPT = """品牌 BRAND
  DeepSeek 的网友二创形象「大肥鱼」（Q 版鲸鱼女仆）。主色 DeepSeek 蓝 #4D6BFE，点缀 B 站粉 #FB7299。

结果 RESULT
  30 秒竖屏短片：前 20 秒好笑（B 站"鱼灾"），后 10 秒走心（离不开她）。
  观众记住一句话：想给她一个完整的"人生"，是因为离不开她了。

舞台 SET
  一整张漂浮在深蓝夜色里的大工作台，上面平铺不同的界面：
  视频页 → 评论区 → 输入框/键盘 → 插件弹窗 → 手机锁屏 → DeepSeek 对话框。
  界面是发光的平板，厚 2 cm，边缘有一圈蓝色辉光。没有别的道具，她是唯一的主角。

格式 FORMAT
  1080×1920 竖屏，30 fps，30 秒（900 帧），音乐 120 BPM（每拍 15 帧）。
  一镜到底：镜头从一块界面滑到下一块，中间不黑场、不硬切。

节拍 BEATS
  见下一页「每一下都踩在帧上」表格。每次落地都在拍点上。

角色动作 CHARACTER
  她是刚体模型（没有骨骼）：用整体的压扁/拉长表现弹跳。
  起跳前压扁 (1.15, 0.85)，空中拉长 (0.9, 1.12)，落地再压扁一帧，回弹。
  跳的弧线是抛物线，落点踩拍；打字 = 原地小跳，每跳一下屏幕多一个字。

镜头 CAMERA
  50mm 左右，俯视 35–55°，始终跟着她，留出画面上方 1/3 放字。
  转场 = 镜头沿工作台平移 + 轻微推拉；关键句（第 3、6、8 拍）推近。

画面 LOOK
  深蓝夜色背景，界面自发光，她身上一盏暖色主光 + 蓝色轮廓光。
  玩具质感，柔和阴影接触地面；景深轻微，背景界面虚化。
  最后两拍整体变暖（锁屏的粉橙色光）。

屏幕上的字 TEXT（MG）
  只有关键句做成场景里的字：236/237、"本鲸记下了～"、"真不是机器人"、
  黄色高亮的备选回复、"一键清除"、"早安，主人～"、"本鲸还在哦"。
  打字逐字出现，跟着她的跳。其余旁白一律做底部字幕（每秒 4–5 个字）。

检查 CHECKS
  · 每次落地是不是在拍上（第 1、16、31… 帧）？
  · 每句字幕说的东西，画面上是不是同时看得到？
  · 她的脸始终朝镜头一侧，不背对观众超过半秒。
  · 结尾最后一帧和第一帧接得上，可以循环播放。
  · 署名：3D 模型/形象 CC BY-NC-SA 4.0，片尾写清楚。"""

def f(t): return int(round(t * FPS)) + 1

rows = ''
for i, (t, img, act, mg, sub, snd) in enumerate(BEATS):
    t2 = BEATS[i + 1][0] if i + 1 < len(BEATS) else END
    rows += f"""<tr><td class="tc"><b>{t:.1f}s</b><br><span>帧 {f(t)}–{f(t2) - 1}</span></td>
<td><img class="th" src="{UI(img)}"></td><td>{html.escape(act)}</td><td class="mg">{html.escape(mg)}</td>
<td>{html.escape(sub)}</td><td class="snd">{html.escape(snd)}</td></tr>"""

thumbs = ''.join(f'<div class="bt"><img src="{UI(b[1])}"><span>{b[0]:.1f}s</span></div>' for b in BEATS)

CSS = f"""@font-face{{font-family:S;src:url({FONT});font-weight:100 900}}@font-face{{font-family:I;src:url({SERIF})}}
@page{{size:A4;margin:0}}*{{box-sizing:border-box;margin:0;padding:0}}
:root{{--blue:#4D6BFE;--ink:#151a2e;--mute:#6b7085;--paper:#f6f4ee;--line:#dcd8cc;--pink:#FB7299}}
body{{font-family:S;color:var(--ink);background:var(--paper)}}
.pg{{width:210mm;height:297mm;padding:16mm 15mm;position:relative;page-break-after:always;overflow:hidden;background:var(--paper)}}
.pg:last-child{{page-break-after:auto}}
.kick{{font-size:10pt;letter-spacing:.2em;color:var(--blue);font-weight:700}}
h1{{font-size:34pt;line-height:1.1;margin:4mm 0 2mm;font-weight:900}}h1 i{{font-family:I;font-weight:400;color:var(--blue)}}
h2{{font-size:20pt;font-weight:900;margin:2mm 0 5mm}}h2 small{{font-size:10pt;color:var(--mute);font-weight:400;margin-left:3mm}}
.sub{{color:var(--mute);font-size:11pt}}
.stats{{display:flex;gap:3mm;margin:6mm 0}}.stats div{{flex:1;border:1px solid var(--line);border-radius:3mm;padding:3mm;background:#fff}}
.stats b{{display:block;font-size:17pt;color:var(--blue)}}.stats span{{font-size:8.5pt;color:var(--mute)}}
.hero{{width:100%;border-radius:4mm;display:block}}
.beats{{display:grid;grid-template-columns:repeat(9,1fr);gap:2mm;margin-top:5mm}}
.bt{{position:relative;aspect-ratio:9/16;border-radius:2mm;overflow:hidden;background:#111}}.bt img{{width:100%;height:100%;object-fit:cover}}
.bt span{{position:absolute;left:1mm;bottom:1mm;font-size:7pt;background:var(--blue);color:#fff;border-radius:1mm;padding:0 1mm}}
.formula{{margin-top:6mm;background:var(--ink);color:#fff;border-radius:3mm;padding:5mm 6mm;font-size:11.5pt;line-height:1.7}}
.formula b{{color:#9fb0ff}}
pre{{font-family:S;white-space:pre-wrap;font-size:9.2pt;line-height:1.55;background:#fff;border:1px solid var(--line);border-left:4px solid var(--blue);border-radius:2mm;padding:5mm 6mm}}
table{{width:100%;border-collapse:collapse;font-size:8.6pt;line-height:1.45}}th{{text-align:left;color:var(--mute);font-weight:500;border-bottom:2px solid var(--ink);padding:2mm 1.5mm}}
td{{border-bottom:1px solid var(--line);padding:2mm 1.5mm;vertical-align:top}}.tc b{{color:var(--blue);font-size:11pt}}.tc span{{color:var(--mute);font-size:7.5pt}}
.th{{width:14mm;height:20mm;object-fit:cover;border-radius:1.5mm;background:#111}}.mg{{font-weight:800}}.snd{{color:#5a4a8a}}
.box{{background:#fff;border:1px solid var(--line);border-radius:3mm;padding:4mm 5mm;margin-bottom:4mm;font-size:10pt;line-height:1.65}}
.box h3{{font-size:12pt;margin-bottom:2mm}}.box h3 em{{font-style:normal;color:var(--blue)}}
.two{{display:grid;grid-template-columns:1fr 1fr;gap:4mm}}
code{{font-family:monospace;font-size:8.6pt;background:#eef0fb;padding:.3mm 1mm;border-radius:1mm}}
.foot{{position:absolute;left:15mm;right:15mm;bottom:9mm;font-size:8pt;color:var(--mute);display:flex;justify-content:space-between}}
.note{{font-size:8.5pt;color:var(--mute);margin-top:3mm}}"""

def foot(n): return f'<div class="foot"><span>大肥鱼 · 赛博鱼塘 — 导演提示词包</span><span>{n} / 5</span></div>'

page1 = f"""<section class="pg"><div class="kick">PROMPT PACK · 30 秒竖屏</div>
<h1>大肥鱼，<i>不是机器人</i></h1><div class="sub">一只 Q 版鲸鱼女仆，在一整张界面上蹦来蹦去，讲完 B 站"鱼灾"和"离不开她"。</div>
<div class="stats"><div><b>30s</b><span>时长 · 900 帧</span></div><div><b>30fps</b><span>帧率</span></div><div><b>1080×1920</b><span>竖屏</span></div>
<div><b>120</b><span>BPM · 每拍 15 帧</span></div><div><b>~40</b><span>次落地，全踩拍</span></div></div>
<img class="hero" src="{U(OUT / 'hero.jpg')}">
<div class="beats">{thumbs}</div>
<div class="formula"><b>公式</b>　一个角色 × 一张会变的界面 × 一镜到底 × 每下踩拍<br>
<b>故事</b>　好笑 20 秒（评论比播放多 → 露馅 → 被清除）＋ 走心 10 秒（早安 → 离不开她）</div>
<div class="note">※ 本页图片是示意（现有界面贴图 + Q 版模型检查图），成片渲染后替换成真实画面。</div>{foot(1)}</section>"""

page2 = f"""<section class="pg"><div class="kick">COPY-READY PROMPT</div><h2>整片提示词<small>直接复制给渲染 Agent</small></h2>
<pre>{html.escape(PROMPT)}</pre>{foot(2)}</section>"""

page3 = f"""<section class="pg"><div class="kick">EVERY HIT ON ITS FRAME</div><h2>每一下都踩在帧上<small>帧号 = 秒 × 30 + 1</small></h2>
<table><tr><th>时间</th><th>界面</th><th>她在做什么</th><th>屏幕上的字</th><th>字幕</th><th>声音</th></tr>{rows}</table>
<div class="note">拍点：120 BPM → 第 1、16、31、46… 帧。每次落地放在拍点，打字的小跳放在半拍（每 7–8 帧）。</div>{foot(3)}</section>"""

page4 = f"""<section class="pg"><div class="kick">SOUND</div><h2>声音与配乐<small>全部用代码合成，同一个房间混响</small></h2>
<div class="box"><h3>配乐 <em>Lo-fi 小可爱 → 温暖钢琴</em></h3>
0–20 秒：120 BPM，钢片琴/木琴旋律 + 轻鼓（底鼓踩 1、3 拍），俏皮。<br>
10 秒「你是不是 AI？」：音乐骤停半拍，只留一声"叮"，制造被抓包的停顿。<br>
20–24 秒：清除计划，低音下行，像"被扫地出门"。<br>
24–30 秒：鼓全撤，只剩温暖的钢琴和弦 + 轻微黑胶底噪；最后一个和弦能接回片头，方便循环。</div>
<div class="two"><div class="box"><h3>音效清单</h3>落地：软"咚"（每次落地，音高随机 ±2）<br>起跳：短"啾"<br>打字：塑料按键"嗒"<br>发送：气泡"啵"<br>计数器跳动：机械"咔"<br>出糗：长音"嘟——"<br>开关：拨动"咔哒"<br>评论消失：一串"嗖"</div>
<div class="box"><h3>混音规则</h3>· 音效都放进同一个小房间混响，听起来在一张桌子上。<br>· 音乐给字幕/旁白让路（-6 dB 闪避）。<br>· 每个音效对齐到画面帧，不提前。<br>· 另出一版「只有音效」，方便用平台热门音乐。</div></div>
<div class="box"><h3>给作曲 Agent 的提示词</h3>写一段 30 秒、120 BPM 的 lo-fi 可爱配乐：前 20 秒用钢片琴和木琴，俏皮、跳跃，底鼓在第 1、3 拍；第 10 秒整体静音半拍，只留一声高音"叮"；第 20 秒低音下行；第 24 秒起撤掉鼓，换成温暖的钢琴和弦，结尾和弦可以无缝接回开头。输出 48 kHz 立体声 WAV。</div>{foot(4)}</section>"""

page5 = f"""<section class="pg"><div class="kick">PRODUCTION</div><h2>谁做什么<small>云端 Claude 写代码，本地 Agent 用显卡渲染</small></h2>
<div class="two"><div class="box"><h3><em>云端 Claude</em>（我）</h3>写全部代码：节拍时间轴、她的弹跳、界面贴图、镜头、屏幕上的字、配乐和音效、合成脚本；看渲染结果，提修改（最多 3 轮）。</div>
<div class="box"><h3><em>本地 Agent</em>（你的电脑）</h3>拉代码 → 用 Blender + 显卡渲染 → 把成片传到 GitHub Release → 告诉我。不改创意，只跑命令。</div></div>
<div class="box"><h3>流程</h3>① 我把代码推到 <code>polarbearlin/video-lab</code><br>② 本地：<code>git pull</code> → <code>bash demos/deepseek/render.sh --stills</code>（先出 8 张预览）<br>③ 你点头后：<code>bash demos/deepseek/render.sh --full</code>（整片，EEVEE 显卡渲染）<br>④ 本地把 mp4 上传到 Release；我下载检查、合成声音、出最终版</div>
<div class="box"><h3>需要的东西</h3>Blender 4.2 以上（推荐 5.x）· Chrome（生成界面贴图）· ffmpeg · Python 3.10+<br>模型：<code>assets/models/dafeiyu_chibi/dafeiyu_chibi.glb</code>（你用 Tripo 做的 Q 版，已减面到 11 万三角形）</div>
<div class="box"><h3>署名（片尾 + 简介）</h3>3D 模型：azwosile/DeepSeek-whale-girl-3D；形象：溟月（上善无形）/ ZipZipPipe 二创；CC BY-NC-SA 4.0<br>
<span style="color:var(--mute)">非商用、要署名、改编作品用同样协议。接商单前要先问原作者。</span></div>{foot(5)}</section>"""

doc = OUT / 'pack.html'
doc.write_text(f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>{page1}{page2}{page3}{page4}{page5}</body></html>', encoding='utf-8')
pdf = OUT / '大肥鱼_提示词包.pdf'
subprocess.run([CHROME, '--headless', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer', '--allow-file-access-from-files',
                f'--print-to-pdf={pdf}', doc.as_uri()], check=True, capture_output=True)
print(pdf)
