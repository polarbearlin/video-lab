"""《Anthropic 上市四天破发》的动态数据图：K 线破发、营收 / 亏损计数、两根对比柱、车速表。
全部 1920×1080 逐帧绘制（R.seg_frames），中国配色：红涨绿跌；琥珀色是本片主色。
"""
import csv, math
from PIL import ImageDraw
import render as R
from render import F, W, H, WHITE, BLACK, ease_out

AMBER = R.GREEN                     # 本片主色（render.py 里改成了琥珀色）
UP, DOWN = (232, 58, 52), (52, 190, 110)
GREY = (150, 150, 146)


def _ease(t, a, b):
    return ease_out(max(0.0, min(1.0, (t - a) / max(b - a, 1e-6))))


def load_ohlc(rel='data/J01_ANT_daily_20261119-20261124.csv', sym='ANT'):
    rows = []
    for r in csv.DictReader(open(R.src_path(rel))):
        if r['symbol'] == sym:
            rows.append((r['date'], float(r['open']), float(r['high']), float(r['low']), float(r['close'])))
    return rows


def dashed(d, x0, x1, y, col, w=5, on=26, off=16):
    x = x0
    while x < x1:
        d.line([(x, y), (min(x + on, x1), y)], fill=col, width=w)
        x += on + off


def seg_price(out, dur, src='数据：雅虎财经日线（11/19–11/24）'):
    """四根日 K 线依次长出来，83 美元发行价红虚线，最后一根收在线下：盖“跌破发行价”章。"""
    rows = load_ohlc()
    bg = R.bg_dark()
    lo, hi = 70, 120
    x0, x1, y0, y1 = 300, 1500, 220, 900
    Y = lambda v: y1 - (v - lo) / (hi - lo) * (y1 - y0)
    step = (x1 - x0) / len(rows)

    def draw(t):
        im = bg.copy()
        d = ImageDraw.Draw(im)
        d.text((96, 70), 'Anthropic 上市头四个交易日', font=F('Black', 72), fill=WHITE)
        for v in (80, 90, 100, 110):
            d.line([(x0 - 20, Y(v)), (x1, Y(v))], fill=(40, 40, 42), width=2)
            d.text((x0 - 40, Y(v)), f'{v}', font=F('Medium', 34), fill=(120, 120, 116), anchor='rm')
        k_line = _ease(t, 0.1, 0.8)
        dashed(d, x0 - 20, x0 - 20 + (x1 + 120 - x0) * k_line, Y(83), UP)
        if k_line > 0.9:
            d.text((x1 + 110, Y(83) - 12), '发行价 83', font=F('Black', 44), fill=UP, anchor='rd')
        span = max(dur * 0.55, 2.0)
        for i, (day, o, h, l, c) in enumerate(rows):
            k = _ease(t, 0.6 + span * i / len(rows), 0.6 + span * (i + 1) / len(rows))
            if k <= 0:
                continue
            cx = x0 + step * (i + 0.5)
            col = UP if c >= o else DOWN
            mid = (o + c) / 2
            hh, ll = mid + (h - mid) * k, mid + (l - mid) * k
            oo, cc = mid + (o - mid) * k, mid + (c - mid) * k
            d.line([(cx, Y(hh)), (cx, Y(ll))], fill=col, width=6)
            d.rectangle((cx - step * 0.22, Y(max(oo, cc)), cx + step * 0.22, Y(min(oo, cc)) + 2), fill=col)
            d.text((cx, y1 + 24), day[5:].replace('-', '/'), font=F('Medium', 38), fill=(170, 170, 166), anchor='ma')
            if i == 0 and k > 0.9:
                d.text((cx + step * 0.26, Y(h)), f'首日最高 {h:.2f}', font=F('Black', 40), fill=WHITE, anchor='lm')
        tc = 0.6 + span + 0.2
        if t > tc:
            day, o, h, l, c = rows[-1]
            cx = x0 + step * (len(rows) - 0.5)
            k = _ease(t, tc, tc + 0.4)
            d.text((cx, Y(l) + 24), f'收 {c:.2f}', font=F('Black', 50), fill=DOWN, anchor='ma')
            if k > 0:
                R.stamp(d, (1180, 70 + int((1 - k) * 30)), '11/24', '跌破发行价', color=DOWN)
        R.source_tag(d, src)
        return im
    R.seg_frames(out, dur, draw)


def seg_compare(out, dur, title, a, b, unit, fmt='{:.0f}', note=None, src=None, cols=(GREY, AMBER)):
    """两根横向柱同时长出来，数字跟着滚。a、b = (名称, 数值)。"""
    bg = R.bg_dark()
    vmax = max(a[1], b[1])
    x0, xmax = 520, 1360

    def draw(t):
        im = bg.copy()
        d = ImageDraw.Draw(im)
        d.text((96, 70), title, font=F('Black', 72), fill=WHITE)
        for i, ((name, v), col) in enumerate(zip((a, b), cols)):
            y = 330 + i * 260
            k = _ease(t, 0.3 + 0.25 * i, 0.3 + 0.25 * i + dur * 0.5)
            d.text((x0 - 40, y + 60), name, font=F('Black', 64), fill=WHITE, anchor='rm')
            wbar = (xmax - x0) * v / vmax * k
            d.rectangle((x0, y, x0 + max(wbar, 4), y + 120), fill=col)
            d.text((x0 + wbar + 28, y + 60), fmt.format(v * k) + unit, font=F('Black', 84), fill=col, anchor='lm',
                   stroke_width=3, stroke_fill=BLACK)
        if note and t > 0.3 + dur * 0.7:
            d.text((W // 2, 900), note, font=F('Black', 60), fill=AMBER, anchor='ma')
        R.source_tag(d, src)
        return im
    R.seg_frames(out, dur, draw)


def seg_loss(out, dur, src='来源：Anthropic 招股书（前九个月）'):
    """1040 亿净亏损滚出来，再把其中 940 多亿切成灰色的“非现金账面亏损”。"""
    bg = R.bg_dark()
    total, noncash = 1040, 940
    x0, x1, y = 160, 1760, 520

    def draw(t):
        im = bg.copy()
        d = ImageDraw.Draw(im)
        d.text((96, 70), '前九个月 账面净亏损', font=F('Black', 72), fill=WHITE)
        k = _ease(t, 0.2, 0.2 + dur * 0.35)
        d.text((W // 2, 190), f'{int(total * k):,} 亿美元', font=F('Black', 170), fill=UP, anchor='ma',
               stroke_width=4, stroke_fill=BLACK)
        kb = _ease(t, 0.2, 0.2 + dur * 0.35)
        d.rectangle((x0, y, x0 + (x1 - x0) * kb, y + 130), fill=UP)
        ks = _ease(t, 0.3 + dur * 0.45, 0.3 + dur * 0.7)
        if ks > 0:
            xs = x0 + (x1 - x0) * noncash / total * ks
            d.rectangle((x0, y, xs, y + 130), fill=(88, 88, 86))
            for xx in range(x0, int(xs), 34):
                d.line([(xx, y + 130), (min(xx + 60, xs), y)], fill=(70, 70, 68), width=8)
            if ks > 0.6:
                d.text(((x0 + xs) / 2, y + 170), '其中 940 多亿：非现金账面亏损', font=F('Black', 64), fill=WHITE, anchor='ma')
                d.text(((x0 + xs) / 2, y + 260), '（优先股和融资工具估值变动）', font=F('Medium', 46), fill=GREY, anchor='ma')
        R.source_tag(d, src)
        return im
    R.seg_frames(out, dur, draw)


def seg_speedo(out, dur, src='比方：阿莫代伊上市当天接受 CNBC 采访'):
    """车速表：0–200 英里，200 那格先亮，指针从 60 拨到 90。"""
    bg = R.bg_dark()
    cx, cy, rad = W // 2, 640, 430
    A = lambda v: math.radians(210 - 240 * v / 200)     # 0 在左下，200 在右下

    def draw(t):
        im = bg.copy()
        d = ImageDraw.Draw(im)
        d.arc((cx - rad, cy - rad, cx + rad, cy + rad), -30 - 180 + 0, 30, fill=(55, 55, 56), width=18)
        k200 = _ease(t, 0.2, 0.7)
        for v in range(0, 201, 20):
            a = A(v)
            r1, r2 = rad - 40, rad - 6
            col = (110, 110, 108)
            if v == 200 and k200 > 0:
                col = UP
            d.line([(cx + r1 * math.cos(a), cy - r1 * math.sin(a)), (cx + r2 * math.cos(a), cy - r2 * math.sin(a))], fill=col, width=7)
            if v in (0, 40, 60, 120, 160, 200):
                rt = rad - 95
                d.text((cx + rt * math.cos(a), cy - rt * math.sin(a)), str(v), font=F('Black', 44 if v in (60, 200) else 36),
                       fill=UP if (v == 200 and k200 > 0) else (160, 160, 156), anchor='mm')
        a90 = A(90)
        rt = rad - 95
        d.text((cx + rt * math.cos(a90), cy - rt * math.sin(a90)), '90', font=F('Black', 52), fill=AMBER, anchor='mm')
        kn = _ease(t, 0.9, 0.9 + dur * 0.45)
        v = 60 + 30 * kn
        a = A(v)
        d.line([(cx, cy), (cx + (rad - 70) * math.cos(a), cy - (rad - 70) * math.sin(a))], fill=AMBER, width=14)
        d.ellipse((cx - 30, cy - 30, cx + 30, cy + 30), fill=AMBER)
        d.text((cx, cy + 250), f'{v:.0f} 英里/小时', font=F('Black', 96), fill=WHITE, anchor='ma', stroke_width=3, stroke_fill=BLACK)
        d.text((96, 70), '原本 60 · 技术能到 200 · “克制”在 90', font=F('Black', 64), fill=WHITE)
        R.source_tag(d, src)
        return im
    R.seg_frames(out, dur, draw)


def seg_bigcount(out, dur, value, unit, line1, line2=None, fmt='{:,.0f}', col=None):
    """大数字滚动到位，下面一两行说明。"""
    bg = R.bg_dark()
    col = col or AMBER

    def draw(t):
        im = bg.copy()
        d = ImageDraw.Draw(im)
        k = _ease(t, 0.1, 0.1 + dur * 0.55)
        d.text((W // 2, 230), fmt.format(value * k) + unit, font=F('Black', 220), fill=col, anchor='ma',
               stroke_width=4, stroke_fill=BLACK)
        if t > 0.4:
            d.text((W // 2, 600), line1, font=F('Black', 80), fill=WHITE, anchor='ma')
        if line2 and t > 0.6:
            d.text((W // 2, 730), line2, font=F('Medium', 52), fill=GREY, anchor='ma')
        return im
    R.seg_frames(out, dur, draw)
