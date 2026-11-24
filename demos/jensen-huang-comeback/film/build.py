"""黄仁勋复职的十一天 · 静音草稿渲染器（案卷 + 数据版式）。

纯黑 / 夜蓝 / 报纸三种底色，黄红强调，左上角标，右上角六格进度，底部字幕条。
K 线、对比折线用代码画（draft_prices.json，正式版换 J1 官方 CSV）。
截图还没到的地方用“引语卡 + 来源”，右上角标“截图待补 Jx”，不做假截图。
字幕用定稿文案原文；时长按每秒 4.5 字估算，配音回来后按音频重排。

用法：python3 demos/jensen-huang-comeback/film/build.py  → /home/user/jh_film/draft_v1.mp4
"""
import json, os, re, shutil, subprocess
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, '..', '素材', 'img')
OUT = '/home/user/jh_film'
FR = os.path.join(OUT, 'frames')
W, H = 1920, 1080
FONT = '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'
YEL, RED, GRN = (255, 212, 59), (200, 16, 46), (46, 160, 90)
BLACK, PAPER, LIGHT = (10, 10, 11), (241, 236, 226), (244, 242, 238)
PAL = {
    'dark':  dict(fg=LIGHT, fg2=(140, 138, 134), acc=YEL, dim=(60, 60, 64), card=(24, 24, 27)),
    'night': dict(fg=LIGHT, fg2=(150, 160, 178), acc=YEL, dim=(60, 72, 98), card=(22, 34, 58)),
    'paper': dict(fg=BLACK, fg2=(90, 88, 84), acc=RED, dim=(200, 196, 188), card=(250, 247, 240)),
}
LAYERS = ['钩子', '认错信', '辞职被拒', '白宫出手', '狂欢质疑', '结尾']
TITLE, SUB = '英伟达 11 天', '黄仁勋：辞职、被拒、复职'
PRICES = json.load(open(os.path.join(HERE, 'draft_prices.json')))
_fc = {}


def F(sz):
    if sz not in _fc:
        _fc[sz] = ImageFont.truetype(FONT, sz, index=0)
    return _fc[sz]


def bg(mode):
    if mode == 'dark':
        return Image.new('RGB', (W, H), BLACK)
    if mode == 'paper':
        return Image.new('RGB', (W, H), PAPER)
    im = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(im)
    c1, c2 = (19, 34, 61), (11, 20, 38)
    for y in range(H):
        t = y / (H - 1)
        d.line([(0, y), (W, y)], fill=tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3)))
    return im


def T(d, xy, s, sz, fill, anchor=None, bold=False):
    d.text(xy, s, font=F(sz), fill=fill, anchor=anchor,
           stroke_width=max(1, sz // 40) if bold else 0, stroke_fill=fill)


CLOSE_P = '，。、；：！？”’）》,.;:!?)'


def wrap(s, sz, maxw):
    """英文按单词换行；中文逐字；收尾标点不放到行首。"""
    f, out, cur = F(sz), [], ''
    toks = re.findall(r'[A-Za-z0-9\'’\-.,%$]+\s?|\s|.', s)
    for tk in toks:
        if cur and f.getlength(cur + tk) > maxw and tk.strip() and tk[0] not in CLOSE_P:
            out.append(cur.rstrip())
            cur = tk.lstrip()
        else:
            cur += tk
    return out + ([cur.rstrip()] if cur.strip() else [])


def PARA(d, xy, s, sz, fill, maxw, lh=1.35, bold=False):
    x, y = xy
    for ln in wrap(s, sz, maxw):
        T(d, (x, y), ln, sz, fill, bold=bold)
        y += int(sz * lh)
    return y


def chrome(d, p, mode, layer):
    d.rectangle((56, 44, 84, 84), fill=RED if mode == 'paper' else YEL)
    T(d, (98, 50), TITLE, 30, p['fg'], bold=True)
    T(d, (98 + int(F(30).getlength(TITLE)) + 18, 58), SUB, 20, p['fg2'])
    n = len(LAYERS)
    x0 = W - 78 - n * 52 + 8
    T(d, (x0 - 16, 60), LAYERS[layer - 1], 26, p['fg'], anchor='ra')
    for i in range(n):
        d.rectangle((x0 + i * 52, 56, x0 + i * 52 + 44, 78), fill=p['acc'] if i < layer else p['dim'])


def todo(d, p, code):
    """右上角“截图待补”标签（草稿用）。"""
    s = f'截图待补 {code}'
    w = int(F(22).getlength(s)) + 24
    d.rectangle((W - 90 - w, 100, W - 90, 134), outline=p['fg2'], width=2)
    T(d, (W - 90 - w + 12, 105), s, 22, p['fg2'])


def card(im, name, box, mode):
    path = os.path.join(IMG, name)
    if not os.path.exists(path):
        return False
    x, y, mw, mh = box
    c = Image.open(path).convert('RGB')
    c.thumbnail((mw, mh), Image.LANCZOS)
    w, h = c.size
    px, py = x + (mw - w) // 2, y + (mh - h) // 2
    d = ImageDraw.Draw(im)
    d.rectangle((px + 10, py + 12, px + w + 10, py + h + 12), fill=(120, 114, 104) if mode == 'paper' else (0, 0, 0))
    im.paste(c, (px, py))
    d.rectangle((px - 2, py - 2, px + w + 1, py + h + 1), outline=BLACK if mode == 'paper' else (150, 150, 150), width=2)
    return True


def quote_card(d, p, box, quote, who, sz=48, accent=False):
    x0, y0, x1, y1 = box
    d.rectangle(box, fill=p['card'], outline=p['dim'], width=2)
    d.rectangle((x0, y0, x0 + 10, y1), fill=p['acc'])
    y = PARA(d, (x0 + 44, y0 + 36), quote, sz, p['acc'] if accent else p['fg'], x1 - x0 - 88, bold=True)
    T(d, (x0 + 44, max(y + 10, y1 - 60)), who, 28, p['fg2'])


def stamp(d, p, xy, date, label):
    x, y = xy
    d.rectangle((x, y, x + 300, y + 150), outline=p['acc'], width=4)
    T(d, (x + 150, y + 22), date, 52, p['acc'], anchor='ma', bold=True)
    T(d, (x + 150, y + 92), label, 38, p['fg'], anchor='ma')


def kline(d, p, box, rows, hi=None, label=None, upto=None):
    """中国习惯：红涨绿跌。hi=要高亮的日期。"""
    x0, y0, x1, y1 = box
    rows = [r for r in rows if upto is None or r[0] <= upto]
    lo_v, hi_v = min(r[3] for r in rows), max(r[2] for r in rows)
    pad = (hi_v - lo_v) * 0.08
    lo_v, hi_v = lo_v - pad, hi_v + pad
    Y = lambda v: y1 - (v - lo_v) / (hi_v - lo_v) * (y1 - y0)
    step = (x1 - x0) / len(rows)
    for k in range(5):
        v = lo_v + (hi_v - lo_v) * k / 4
        d.line([(x0, Y(v)), (x1, Y(v))], fill=p['dim'], width=1)
        T(d, (x1 + 14, Y(v) - 14), f'{v:.0f}', 24, p['fg2'])
    for i, (day, o, h, l, c) in enumerate(rows):
        cx = x0 + step * (i + 0.5)
        col = RED if c >= o else GRN
        d.line([(cx, Y(h)), (cx, Y(l))], fill=col, width=3)
        bw = step * 0.32
        d.rectangle((cx - bw, Y(max(o, c)), cx + bw, Y(min(o, c)) + 1), fill=col)
        if i % 3 == 0 or day == hi:
            T(d, (cx, y1 + 14), day[5:].replace('-', '/'), 22, p['fg2'], anchor='ma')
        if day == hi:
            d.rectangle((cx - step * 0.48, y0 - 10, cx + step * 0.48, y1 + 6), outline=YEL, width=4)
            if label:
                T(d, (cx - step * 0.6, y0 - 70), label, 52, YEL, anchor='ra', bold=True)


def lines_vs(d, p, box, a, b, start, end):
    """两条归一化折线：英伟达 vs 纳指，起点 = 100。"""
    x0, y0, x1, y1 = box
    A = [(r[0], r[4]) for r in a if start <= r[0] <= end]
    B = [(r[0], r[4]) for r in b if start <= r[0] <= end]
    na = [v / A[0][1] * 100 for _, v in A]
    nb = [v / B[0][1] * 100 for _, v in B]
    lo_v, hi_v = min(na + nb) - 3, max(na + nb) + 3
    Y = lambda v: y1 - (v - lo_v) / (hi_v - lo_v) * (y1 - y0)
    X = lambda i: x0 + (x1 - x0) * i / (len(A) - 1)
    d.line([(x0, Y(100)), (x1, Y(100))], fill=p['dim'], width=2)
    for series, col, name in ((na, RED, '英伟达'), (nb, p['fg2'], '纳指')):
        d.line([(X(i), Y(v)) for i, v in enumerate(series)], fill=col, width=6)
        T(d, (x1 + 16, Y(series[-1]) - 20), f'{name} {series[-1] - 100:+.1f}%', 36, col, bold=True)
    for i, (day, _) in enumerate(A):
        T(d, (X(i), y1 + 14), day[5:].replace('-', '/'), 22, p['fg2'], anchor='ma')


# ---------------- 场景 ----------------
NV, IX = PRICES['NVDA'], PRICES['IXIC']


def s_hook1(im, d, p, m):
    T(d, (120, 230), '六天前', 64, p['fg2'])
    T(d, (120, 320), '“不打算让他复职”', 120, p['fg'], bold=True)
    d.rectangle((120, 490, 900, 516), fill=p['acc'])
    T(d, (120, 560), '——英伟达董事会主席 哈维·琼斯，11 月 17 日', 40, p['fg2'])


def s_hook2(im, d, p, m):
    T(d, (120, 170), '一个周末后：全票复职，一天涨三成', 56, p['fg'], bold=True)
    kline(d, p, (160, 330, 1680, 880), NV, hi='2026-11-23', label='+31.5%', upto='2026-11-23')


def s_hook3(im, d, p, m):
    T(d, (120, 200), '特朗普接受《纽约时报》电话采访', 44, p['fg2'])
    T(d, (120, 330), '“我昨晚干得', 150, p['acc'], bold=True)
    T(d, (120, 510), '不错吧？”', 150, p['acc'], bold=True)
    T(d, (120, 740), '“Did I do a good job last night?”', 48, p['fg'])
    if not card(im, 'J2_nyt_quote_crop.png', (1180, 300, 640, 500), m):
        todo(d, p, 'J2')


def s_hook4(im, d, p, m):
    for i, (dt, lb) in enumerate([('11/12', '辞职'), ('11/17', '被拒'), ('11/23', '复职')]):
        stamp(d, p, (180 + i * 560, 300), dt, lb)
    T(d, (960, 620), '短短十一天', 110, p['fg'], anchor='ma', bold=True)


def s_leak(im, d, p, m):
    quote_card(d, p, (120, 200, 900, 560), '“关系密切”', '《纽约时报》· 10 月 29 日', 72)
    quote_card(d, p, (1020, 200, 1800, 560), '“有理由认为她可能是中国间谍”', '《华尔街日报》· 10 月 31 日（据美、新、台情报官员）', 56)
    T(d, (120, 640), '对象：新加坡科技公司 Megaspeed 的一名女高管', 44, p['fg'])
    T(d, (120, 720), '（本片不出现其照片）', 30, p['fg2'])
    todo(d, p, 'J3')


def s_notfinal(im, d, p, m):
    T(d, (120, 300), '有理由认为', 160, p['acc'], bold=True)
    T(d, (1000, 330), '≠', 160, p['fg'], bold=True)
    T(d, (1200, 300), '定论', 160, p['fg'], bold=True)
    T(d, (120, 620), '但在华盛顿和华尔街，光这几个字，杀伤力就够大了。', 52, p['fg2'])


def s_memo(im, d, p, m):
    d.rectangle((300, 170, 1620, 900), fill=(252, 250, 245), outline=BLACK, width=2)
    T(d, (380, 230), 'To: All NVIDIA employees · Nov 8, 2026', 32, (90, 88, 84))
    T(d, (380, 380), 'I was unfaithful to my wife.', 72, BLACK, bold=True)
    T(d, (380, 500), 'There is no excuse for what I did.', 56, BLACK)
    T(d, (380, 590), 'I am deeply sorry.', 56, BLACK)
    T(d, (380, 740), '“我对妻子不忠。没有借口。”', 60, RED, bold=True)
    todo(d, p, 'J4')


def s_reactions(im, d, p, m):
    quote_card(d, p, (120, 220, 920, 700), '“完全没有根据，纯属污蔑”', '中国外交部发言人郭嘉昆 · 11 月 9 日', 60)
    quote_card(d, p, (1000, 220, 1800, 700), '“我真的相信他”', '特朗普 · 11 月 9 日（CNBC）', 60, accent=True)
    todo(d, p, 'J5 J6')


def s_resign(im, d, p, m):
    if not card(im, 'J7_nvidia_1112.png', (120, 190, 1000, 620), m):
        quote_card(d, p, (120, 200, 1100, 700),
                   '“Jensen Huang has resigned as President, Chief Executive Officer, and a member of the Board, effective immediately.”',
                   '英伟达公告 · 2026-11-12', 44)
        todo(d, p, 'J7')
    T(d, (1180, 260), '公告没写原因', 64, p['acc'], bold=True)
    T(d, (1180, 380), '临时 CEO：财务长克雷斯', 44, p['fg'])
    T(d, (1180, 450), '董事会主席：哈维·琼斯', 44, p['fg'])


def s_petition(im, d, p, m):
    T(d, (120, 220), '请愿：“把詹森带回来”', 64, p['fg'], bold=True)
    T(d, (120, 340), '10,000+', 240, p['acc'], bold=True)
    T(d, (120, 640), '名员工签名，约占全公司四分之一（CBS）', 48, p['fg'])
    T(d, (120, 740), '马斯克：自己也签了', 48, p['fg2'])
    todo(d, p, 'J8 J9')


def s_refuse(im, d, p, m):
    quote_card(d, p, (120, 220, 920, 760), '“如果董事会认为我回来符合股东、员工、公司和美国的利益，我很荣幸回来。”', '黄仁勋 · 11 月 17 日', 46)
    quote_card(d, p, (1000, 220, 1800, 760), '“一致接受辞职，不打算让他复职。”', '董事会主席 哈维·琼斯 · 11 月 17 日财报会', 60, accent=True)
    todo(d, p, 'J10 J11')


def s_drop(im, d, p, m):
    T(d, (120, 170), '辞职前一天 → 上周五（收盘，起点 = 100）', 44, p['fg'])
    lines_vs(d, p, (160, 300, 1500, 860), NV, IX, '2026-11-11', '2026-11-20')


def s_weekend(im, d, p, m):
    T(d, (120, 200), '改变一切的周末', 110, p['fg'], bold=True)
    T(d, (120, 380), '《纽约时报》引述知情人士：特朗普推动，给董事会两颗定心丸', 44, p['fg2'])
    quote_card(d, p, (120, 470, 900, 800), '没有面临刑事指控', '定心丸 ①', 64, accent=True)
    quote_card(d, p, (1000, 470, 1800, 800), '不构成国家安全风险', '定心丸 ②', 64, accent=True)
    todo(d, p, 'J12')


def s_vance(im, d, p, m):
    nodes = [(360, 520, '特朗普'), (960, 300, '副总统 万斯'), (960, 760, '英伟达董事会'), (1560, 520, '黄仁勋')]
    for a, b in [(0, 1), (1, 3), (1, 2), (0, 2)]:
        d.line([nodes[a][:2], nodes[b][:2]], fill=p['dim'], width=4)
    for x, y, s in nodes:
        w = int(F(48).getlength(s)) + 60
        d.rectangle((x - w // 2, y - 50, x + w // 2, y + 50), fill=p['card'], outline=p['acc'], width=3)
        T(d, (x, y - 26), s, 48, p['fg'], anchor='ma', bold=True)
    T(d, (960, 900), '那个周末，万斯私下见了黄仁勋（《纽约时报》、PBS 引述知情人士）', 34, p['fg2'], anchor='ma')


def s_briefed(im, d, p, m):
    quote_card(d, p, (120, 220, 900, 700), '至少两次通报国安疑虑', '据《纽约时报》、ABC：国务卿鲁比奥等人', 64)
    quote_card(d, p, (1000, 220, 1800, 700), '“没人告诉过我”', '特朗普此前的说法', 64, accent=True)


def s_notice(im, d, p, m):
    if not card(im, 'J14_nvidia_1123.png', (120, 170, 760, 420), m):
        todo(d, p, 'J14')
    T(d, (920, 190), '11 月 23 日复职公告里的两句话', 44, p['fg'], bold=True)
    quote_card(d, p, (120, 620, 940, 960), '听取了美国政府高层的意见，确信他回来不构成国家安全风险', '前一句', 44)
    quote_card(d, p, (1000, 620, 1800, 960), '针对他成为外国情报目标的独立调查，会进行到底', '后一句', 44, accent=True)


def s_entity(im, d, p, m):
    T(d, (120, 200), '同一天：美国商务部实体清单', 64, p['fg'], bold=True)
    for i, (n, s) in enumerate([('Megaspeed', '新加坡 · 女高管所在公司'), ('Apex Enterprise Solutions', '阿里巴巴旗下新加坡公司')]):
        y = 340 + i * 190
        d.rectangle((120, y, 1300, y + 150), fill=p['card'], outline=p['dim'], width=2)
        T(d, (160, y + 24), n, 60, p['fg'], bold=True)
        T(d, (160, y + 98), s, 32, p['fg2'])
    T(d, (120, 760), '阿里方面：列入清单是“错误的”', 52, p['acc'], bold=True)
    todo(d, p, 'J16')


def s_rally(im, d, p, m):
    kline(d, p, (160, 300, 1500, 860), NV, hi='2026-11-23', label='收涨 31%，盘中 36%', upto='2026-11-23')
    T(d, (120, 170), '周一：英伟达 vs 大盘', 48, p['fg'], bold=True)
    d.rectangle((1560, 360, 1840, 480), outline=p['fg2'], width=2)
    T(d, (1700, 380), '纳指', 32, p['fg2'], anchor='ma')
    T(d, (1700, 420), '+6.5%', 44, p['fg'], anchor='ma', bold=True)


def s_memes(im, d, p, m):
    quote_card(d, p, (120, 200, 900, 520), '“the mistake has been corrected”', '马斯克 · X（据路透）', 50)
    quote_card(d, p, (1000, 200, 1800, 520), '“GPU Jesus has risen!”', '网友调侃（Jason Calacanis · X）', 56, accent=True)
    quote_card(d, p, (120, 600, 1800, 860), '克莱默刚说跌势还会更糟，转头就是暴涨', '网友调侃“反指”', 50)
    todo(d, p, 'J17 J18')


def s_trump(im, d, p, m):
    quote_card(d, p, (120, 220, 900, 700), '“我相信我的介入非常重要”', '特朗普 · CNBC（据 PBS）', 60)
    quote_card(d, p, (1000, 220, 1800, 700), '“性比股票好卖”', '特朗普 · 对《纽约时报》', 72, accent=True)
    todo(d, p, 'J13 J20')


def s_critics(im, d, p, m):
    quote_card(d, p, (120, 180, 900, 520), '到底是哪些高层、给了什么“意见”？', '参议员 沃伦', 48)
    quote_card(d, p, (1000, 180, 1800, 520), '“无法辩护”（indefensible）', '众议院候任议长 杰弗里斯', 52)
    quote_card(d, p, (120, 600, 1800, 880), '“我不知道有哪个董事会，能对总统说不。”', '哥伦比亚商学院教授 Shiva Rajgopal（CBS）', 56, accent=True)
    todo(d, p, 'J21 J22 J23')


def s_hold(im, d, p, m):
    T(d, (120, 300), '特朗普本人持有的英伟达股票', 64, p['fg'], bold=True)
    T(d, (120, 420), '上千万美元', 200, p['acc'], bold=True)
    T(d, (120, 700), '截至 2025 年底至少 1200 万美元（ABC 新闻查阅的年度财产披露）', 44, p['fg2'])
    T(d, (120, 780), '白宫：投资组合由第三方金融机构独立管理', 44, p['fg2'])
    todo(d, p, 'J24')


def s_fall(im, d, p, m):
    T(d, (120, 170), '第二天', 56, p['fg'], bold=True)
    kline(d, p, (160, 300, 1500, 860), NV, hi='2026-11-24', label='回落', upto='2026-11-24')
    T(d, (120, 960), '11/24 为盘中价，待收盘数据（J26）', 26, p['fg2'])


def s_next(im, d, p, m):
    T(d, (120, 200), '才刚刚排上日程', 64, p['fg'], bold=True)
    for i, (dt, s) in enumerate([('12/1', '众议院 闭门问询'), ('12/3', '参议院 出口管制听证'), ('进行中', '董事会独立调查')]):
        x = 120 + i * 580
        d.rectangle((x, 360, x + 520, 720), fill=p['card'], outline=p['acc'], width=3)
        T(d, (x + 260, 410), dt, 96, p['acc'], anchor='ma', bold=True)
        T(d, (x + 260, 580), s, 44, p['fg'], anchor='ma')
    todo(d, p, 'J27')


def s_who(im, d, p, m):
    T(d, (120, 180), '这十一天，到底谁赢了？', 72, p['fg'], bold=True)
    for i, s in enumerate(['股价：赢了一天', '黄仁勋：回到了办公室', '特朗普：一个可以邀功的周一']):
        T(d, (160, 360 + i * 150), s, 72, p['acc'] if i == 2 else p['fg'], bold=True)


def s_end(im, d, p, m):
    for i, s in enumerate(['情报疑云', '芯片流向', '政府到底向董事会保证了什么']):
        T(d, (120, 200 + i * 110), f'？ {s}', 56, p['fg2'])
    T(d, (120, 620), '人回来了。', 120, p['fg'], bold=True)
    T(d, (120, 790), '但故事，还远没结束。', 96, p['acc'], bold=True)


# (画面, 底色, 层, 角标/来源, 字幕 = 定稿文案原文)
SCENES = [
    (s_hook1, 'dark', 1, '来源：ABC 时间线 11/17；Axios', '六天前，全球最值钱的公司之一才把话说死：绝不请刚辞职的 CEO 回来。'),
    (s_hook2, 'night', 1, '草稿数据：雅虎财经日线（正式版换 Nasdaq 官方数据）', '结果一个周末过去，董事会全票反转，不仅把他请了回去，股价还一天暴涨三成。'),
    (s_hook3, 'dark', 1, '来源：《纽约时报》Haberman / Swan，2026-11-23', '转头，特朗普就在《纽约时报》的电话采访里冒出一句：“我昨晚干得不错吧？”'),
    (s_hook4, 'dark', 1, '', '从突然辞职、被董事会当众拒绝，到全票官宣复职，短短十一天，英伟达和黄仁勋到底经历了什么？'),
    (s_leak, 'paper', 2, '来源：ABC 时间线（引《纽约时报》10/29、《华尔街日报》10/31）', '故事要从十月底说起。先是《纽约时报》爆出，黄仁勋和新加坡科技公司 Megaspeed 的一名女高管关系密切。仅仅两天后，《华尔街日报》跟着加码：美国、新加坡和台湾的情报官员，有理由认为，她可能是中国间谍。'),
    (s_notfinal, 'dark', 2, '', '注意这个措辞，是“有理由认为”，不是最终定论。但在华盛顿和华尔街，光这几个字，杀伤力就已经够大了。'),
    (s_memo, 'paper', 2, '来源：黄仁勋全员信（The Verge 全文 / ABC）', '十一月八日，黄仁勋给全体员工写了一封信。里面有一句话，后来被全网反复转发：“我对妻子不忠。没有借口。”'),
    (s_reactions, 'night', 2, '来源：中国外交部 11/9；CNBC 11/9', '第二天，各方反应几乎同时炸开。中国外交部直接回应，间谍说法完全没有根据，纯属污蔑。同一天，特朗普对记者说，他当面问过黄仁勋，对方表示完全不知道所谓间谍身份，特朗普还补了一句：“我真的相信他。”'),
    (s_resign, 'paper', 3, '来源：英伟达新闻室 2026-11-12《NVIDIA Announces CEO Transition》', '可光靠表态，压不住风暴。十一月十二日，英伟达发了一则短到反常的公告：黄仁勋辞去总裁、CEO 和董事职务，即时生效。连原因都没写，财务长克雷斯临时接任。'),
    (s_petition, 'dark', 3, '来源：CBS 2026-11-24', '公司内部先坐不住了。员工们发起请愿，要“把詹森带回来”。超过一万名员工签了名，差不多占了全公司的四分之一，连马斯克都说，自己也签了。'),
    (s_refuse, 'night', 3, '来源：ABC 时间线 11/17', '到了十一月十七日，黄仁勋公开表态：只要董事会认为他回来对公司和美国有利，他愿意回来。眼看像是要峰回路转了？结果同一天的财报会上，董事会主席哈维·琼斯直接把话说死：一致接受辞职，不打算让他复职。'),
    (s_drop, 'night', 3, '草稿数据：雅虎财经日线（正式版换 Nasdaq 官方数据）', '市场立刻用脚投票。到上周五，英伟达股价跌了近三成，而同期纳斯达克只跌了一成多。'),
    (s_weekend, 'dark', 4, '来源：《纽约时报》2026-11-23（引两名知情人士）', '就在所有人都觉得大局已定时，改变一切的周末来了。《纽约时报》引述知情人士称，是特朗普在背后推动了反转。思路很明确：董事会不敢放人，无非是怕踩到刑事和国安红线，那就给董事会两颗定心丸——黄仁勋没有面临刑事指控，也不构成国家安全风险。'),
    (s_vance, 'night', 4, '来源：《纽约时报》；PBS / 美联社', '那个周末，副总统万斯私下见了黄仁勋。'),
    (s_briefed, 'dark', 4, '来源：《纽约时报》；ABC 时间线', '但报道里还有个耐人寻味的细节：鲁比奥等人此前至少两次向特朗普通报过国安疑虑，而特朗普却公开说过，没人告诉他。'),
    (s_notice, 'paper', 4, '来源：英伟达新闻室 2026-11-23；SEC 8-K', '周一一早，英伟达正式官宣：董事会全票通过，黄仁勋即日复职。这份公告里有两句话，放一起看特别有意思。前一句说，董事会听取了美国政府高层的意见，确信他回来不构成国家安全风险；后一句紧跟着说，针对他成为外国情报目标的独立调查，会进行到底。'),
    (s_entity, 'paper', 4, '来源：美国商务部；RTE / 路透 2026-11-24', '更微妙的是，就在同一天，美国商务部把 Megaspeed，以及阿里巴巴旗下一家新加坡公司，列入了实体清单。阿里方面随即回应，这是错误的。'),
    (s_rally, 'night', 5, '数据：CNBC；草稿 K 线为雅虎财经日线', '资本市场的反应最直接。周一，英伟达收涨百分之三十一，盘中一度冲高百分之三十六；当天大盘也在反弹，纳指涨了百分之六点五。'),
    (s_memes, 'dark', 5, '来源：路透各方反应；Decrypt 2026-11-23（网友调侃）', '总部里，员工鼓掌欢迎他回来。网上更热闹，马斯克发帖说“错误已经纠正”，还有网友调侃“GPU 耶稣复活了”。财经主持人克莱默前脚刚预言跌势还会更糟，转头就迎来暴涨，又被全网拿来当反指玩梗。'),
    (s_trump, 'dark', 5, '来源：PBS / 美联社；《纽约时报》', '特朗普则表示，自己的介入“非常重要”，还对《纽约时报》补了一句：“性比股票好卖。”'),
    (s_critics, 'paper', 5, '来源：路透各方反应；杰弗里斯声明；CBS', '但掌声之外，质疑声同样刺耳。参议员沃伦要求政府说清楚，到底是哪些高层、给了什么“意见”；众议院候任议长杰弗里斯直言，这个决定无法辩护。有商学院教授说得更直白：“我不知道有哪个董事会，能对总统说不。”'),
    (s_hold, 'night', 5, '来源：ABC 新闻 2026-11-23（截至 2025 年底至少 1200 万美元，据其年度财产披露）', '顺带一提，按财产披露估算，特朗普本人也持有上千万美元的英伟达股票，白宫方面则表示，资产由第三方管理。'),
    (s_fall, 'night', 6, '草稿数据：雅虎财经（11/24 盘中）', '不过，狂欢来得快，退潮也快。第二天，英伟达股价就回落了。'),
    (s_next, 'dark', 6, '来源：ABC 时间线 11/16；CNBC 2026-11-23', '而真正的考验，才刚刚排上日程：十二月一日，众议院要闭门问询黄仁勋；十二月三日，参议院要就出口管制召开听证；董事会的独立调查，也还没有画上句号。'),
    (s_who, 'dark', 6, '', '回头看这跌宕的十一天，到底谁赢了？股价赢了一天；黄仁勋回到了自己的办公室；特朗普，拿到了一个可以邀功的周一。'),
    (s_end, 'dark', 6, '', '至于情报疑云、芯片流向，还有政府到底向董事会保证了什么——这些问题，一个都还没有答案。人回来了。但故事，还远没结束。'),
]


def chip(im, s):
    d = ImageDraw.Draw(im)
    tw = int(F(46).getlength(s))
    x = (W - tw) // 2
    d.rectangle((x - 24, 968, x + tw + 24, 1024), fill=BLACK)
    d.text((x, 980), s, font=F(46), fill=LIGHT)


def chunks(s, maxn=24):
    parts = [x for x in re.split(r'(?<=[。！？；，：])', s) if x]
    out, cur = [], ''
    for pt in parts:
        while len(pt) > maxn:
            if cur:
                out.append(cur)
                cur = ''
            out.append(pt[:maxn])
            pt = pt[maxn:]
        if cur and len(cur) + len(pt) > maxn:
            out.append(cur)
            cur = pt
        else:
            cur += pt
    return out + ([cur] if cur else [])


def dur(c):
    return max(1.2, len(c) / 4.5) + (0.4 if c[-1] in '。？！' else 0.15)


def main():
    shutil.rmtree(FR, ignore_errors=True)
    os.makedirs(FR)
    entries, thumbs = [], []
    for k_s, (draw, mode, layer, src, narr) in enumerate(SCENES):
        im = bg(mode)
        d = ImageDraw.Draw(im)
        p = PAL[mode]
        chrome(d, p, mode, layer)
        draw(im, d, p, mode)
        if src:
            T(d, (90, 1046), src, 22, p['fg2'])
        thumbs.append(im.resize((480, 270), Image.LANCZOS))
        for c in chunks(narr):
            f = im.copy()
            chip(f, c)
            fn = os.path.join(FR, f'f{len(entries):04d}.jpg')
            f.save(fn, quality=92)
            entries.append((fn, dur(c)))
    rows = (len(thumbs) + 3) // 4
    sheet = Image.new('RGB', (1920, 270 * rows), (0, 0, 0))
    for i, t in enumerate(thumbs):
        sheet.paste(t, ((i % 4) * 480, (i // 4) * 270))
    sheet.save(os.path.join(OUT, 'sheet.jpg'), quality=88)
    lst = os.path.join(FR, 'list.txt')
    with open(lst, 'w') as f:
        for fn, dd in entries:
            f.write(f"file '{fn}'\nduration {dd:.3f}\n")
        f.write(f"file '{entries[-1][0]}'\n")
    print('scenes', len(SCENES), 'frames', len(entries), 'total_s', round(sum(x for _, x in entries), 1))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst,
                    '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '20', '-preset', 'medium',
                    '-movflags', '+faststart', os.path.join(OUT, 'draft_v1.mp4')], check=True)
    print('done', os.path.join(OUT, 'draft_v1.mp4'))


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    main()
