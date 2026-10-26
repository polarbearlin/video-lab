"""大事记卡（MG 动画）：屏幕上方一张白卡 —— 左边日历牌（红页眉写年份，日期从下往上翻出来），右边一句话，
底部一条 2023→2026 的年份刻度尺，发光的点从上一件事滑到这一件事。card(t, w, h) 返回这一帧的透明叠加层（没有就返回 None）。"""
import sys, math, pathlib, importlib.util
from PIL import Image, ImageDraw, ImageFilter
HERE = pathlib.Path(__file__).resolve().parent; DS = HERE.parent; sys.path.insert(0, str(HERE))
import plan as P
spec = importlib.util.spec_from_file_location('ui7', DS / 'v7/ui.py'); ui7 = importlib.util.module_from_spec(spec); spec.loader.exec_module(ui7)
font = ui7.font
def smooth(a): a = max(0., min(1., a)); return a * a * (3 - 2 * a)
def back_out(a, s=1.6): a = max(0., min(1., a)) - 1; return a * a * ((s + 1) * a + s) + 1
def rgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
CW, CH_ = 860, 200          # 卡片大小（1920 宽画面下）
FONTS = {}
def F(px, w):
    k = (px, w)
    if k not in FONTS: FONTS[k] = font(px, w)
    return FONTS[k]

def _card_img(i, e):
    """画第 i 条大事记、出现后 e 秒的卡片（原尺寸 CW×CH_）"""
    a, z, head, body, pos, small, big, col = P.MILESTONES[i]
    if callable(big): big, col = big(a + e)
    prev = P.MILESTONES[i - 1][4] if i > 0 else P.YEARS[0]
    im = Image.new('RGBA', (CW + 60, CH_ + 60), (0, 0, 0, 0))
    sh = Image.new('L', im.size, 0); ImageDraw.Draw(sh).rounded_rectangle((30, 36, 30 + CW, 36 + CH_), 30, fill=70)
    im.putalpha(sh.filter(ImageFilter.GaussianBlur(14)))   # 柔和投影
    d = ImageDraw.Draw(im); x0, y0 = 30, 30
    d.rounded_rectangle((x0, y0, x0 + CW, y0 + CH_), 30, fill=(255, 255, 255, 245))
    # 日历牌
    tx, ty, tw, th = x0 + 26, y0 + 22, 118, 118
    d.rounded_rectangle((tx, ty, tx + tw, ty + th), 16, fill=(246, 247, 251, 255), outline=(225, 228, 238, 255), width=2)
    d.rounded_rectangle((tx, ty, tx + tw, ty + 36), 16, fill=(255, 77, 77, 255)); d.rectangle((tx, ty + 20, tx + tw, ty + 36), fill=(255, 77, 77, 255))
    for rx in (tx + 30, tx + tw - 30): d.ellipse((rx - 5, ty - 6, rx + 5, ty + 4), fill=(80, 84, 100, 255))   # 日历的两个挂环
    f = F(22, 800); w_ = d.textlength(head, font=f); d.text((tx + (tw - w_) / 2, ty + 5), head, font=f, fill='white')
    # 日期从下往上翻出来（裁在日历牌里面）
    roll = 1 - smooth((e - .08) / .32); fb = F(40 if len(body) > 3 else 46, 900)
    lay = Image.new('RGBA', (tw, th - 38), (0, 0, 0, 0)); ld = ImageDraw.Draw(lay); w_ = ld.textlength(body, font=fb)
    ld.text(((tw - w_) / 2, 12 + roll * 60), body, font=fb, fill=(28, 31, 38, int(255 * (1 - roll))))
    im.alpha_composite(lay, (tx, ty + 38))
    # 文字：小字一行 + 大字从右边滑进来
    lx = tx + tw + 30
    d.text((lx, y0 + 26), small, font=F(28, 600), fill=(107, 112, 133, 255))
    k = smooth((e - .12) / .3); fbg = F(52, 900)
    d.text((lx + 40 * (1 - k), y0 + 66), big, font=fbg, fill=(*rgb(col), int(255 * k)))
    # 年份刻度尺 + 滑动的点
    rx0, rx1, ry = lx, x0 + CW - 40, y0 + CH_ - 34
    d.line((rx0, ry, rx1, ry), fill=(220, 223, 233, 255), width=4)
    ys = range(P.YEARS[0], P.YEARS[1])
    X = lambda yr: rx0 + (yr - P.YEARS[0]) / (P.YEARS[1] - P.YEARS[0]) * (rx1 - rx0)
    for yr in ys:
        d.line((X(yr), ry - 7, X(yr), ry + 7), fill=(200, 204, 216, 255), width=2); d.text((X(yr) + 6, ry + 4), str(yr), font=F(18, 600), fill=(150, 154, 170, 255))
    for m in P.MILESTONES[:i]: d.ellipse((X(m[4]) - 4, ry - 4, X(m[4]) + 4, ry + 4), fill=(170, 176, 196, 255))   # 走过的里程碑
    cur = prev + (pos - prev) * smooth((e - .2) / .6)
    d.line((rx0, ry, X(cur), ry), fill=(*rgb(col), 255), width=4)
    glow = Image.new('RGBA', im.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(glow); pr = 14 + 4 * math.sin(e * 8)
    gd.ellipse((X(cur) - pr, ry - pr, X(cur) + pr, ry + pr), fill=(*rgb(col), 110)); im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(5)))
    d.ellipse((X(cur) - 8, ry - 8, X(cur) + 8, ry + 8), fill=(*rgb(col), 255), outline='white', width=3)
    return im

def card(t, w=1920, h=1080):
    for i, (a, z, *_r) in enumerate(P.MILESTONES):
        if a <= t < z:
            e = t - a; same_prev = i > 0 and abs(P.MILESTONES[i - 1][1] - a) < .05   # 紧接着上一条：不重新弹，只换内容
            s = 1. if same_prev else back_out(e / .32); fade = 1 - smooth((t - (z - .25)) / .25)
            nxt_same = i + 1 < len(P.MILESTONES) and abs(P.MILESTONES[i + 1][0] - z) < .05
            if nxt_same: fade = 1.
            im = _card_img(i, e if not same_prev else e + .0)
            left = a < 12   # 第 1 章她头顶上有台词气泡：卡片挪到左上角、小一点
            k = w / 1920 * (.86 if left else 1); W2, H2 = int(im.width * k * s), int(im.height * k * s)
            if W2 < 4 or H2 < 4: return None
            im = im.resize((W2, H2), Image.LANCZOS)
            if fade < 1: im.putalpha(im.getchannel('A').point(lambda v: int(v * fade)))
            out = Image.new('RGBA', (w, h), (0, 0, 0, 0)); out.alpha_composite(im, (int(w * .005) if left else (w - W2) // 2, int(h * (.06 if left else .035) - 30 * k * s + (1 - fade) * -20 * k)))
            return out
    return None
