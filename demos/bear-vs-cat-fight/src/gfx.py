"""16-bit 像素绘图库：在 320×180 虚拟屏上逐像素画，无抗锯齿，最后整数倍放大到 1920×1080。"""
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 320, 180          # 虚拟屏（像素艺术分辨率）
SCALE = 6                # 1920/320 = 6，1080/180 = 6，整数倍
FONT_PATH = '/usr/share/fonts/opentype/unifont/unifont.otf'   # 16px 点阵字体，中英文都有


def col(hexstr):
    h = hexstr.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.uint8)


class Layer:
    """一层像素：颜色 + 覆盖遮罩。角色先画在独立的层上，再统一描边。"""

    def __init__(self):
        self.rgb = np.zeros((H, W, 3), np.uint8)
        self.a = np.zeros((H, W), bool)


def _box(x0, y0, x1, y1):
    x0 = max(0, int(math.floor(x0))); x1 = min(W, int(math.ceil(x1)) + 1)
    y0 = max(0, int(math.floor(y0))); y1 = min(H, int(math.ceil(y1)) + 1)
    if x0 >= x1 or y0 >= y1:
        return None
    return x0, x1, y0, y1


def _paint(L, box, m, c):
    x0, x1, y0, y1 = box
    L.a[y0:y1, x0:x1] |= m
    L.rgb[y0:y1, x0:x1][m] = c


def ell(L, cx, cy, rx, ry, c, ang=0.0, clip=None):
    """椭圆（可旋转）。像素中心落在椭圆内就涂色。"""
    box = _box(cx - max(rx, ry) - 1, cy - max(rx, ry) - 1, cx + max(rx, ry) + 1, cy + max(rx, ry) + 1)
    if box is None:
        return
    x0, x1, y0, y1 = box
    xs = np.arange(x0, x1) + 0.5 - cx
    ys = np.arange(y0, y1) + 0.5 - cy
    X, Y = np.meshgrid(xs, ys)
    if ang:
        ca, sa = math.cos(-ang), math.sin(-ang)
        X, Y = X * ca - Y * sa, X * sa + Y * ca
    m = (X / rx) ** 2 + (Y / ry) ** 2 <= 1
    if clip is not None:
        m &= clip[y0:y1, x0:x1]
    _paint(L, box, m, c)


def rect(L, x0, y0, x1, y1, c):
    """整数像素矩形，包含左上、不含右下。"""
    box = _box(x0, y0, x1 - 1, y1 - 1)
    if box is None:
        return
    x0, x1, y0, y1 = box
    m = np.ones((y1 - y0, x1 - x0), bool)
    _paint(L, box, m, c)


def poly(L, pts, c):
    """多边形（奇偶规则）。"""
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    box = _box(min(xs), min(ys), max(xs), max(ys))
    if box is None:
        return
    x0, x1, y0, y1 = box
    X, Y = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5)
    m = np.zeros(X.shape, bool)
    n = len(pts)
    for i in range(n):
        x1_, y1_ = pts[i]; x2_, y2_ = pts[(i + 1) % n]
        if y1_ == y2_:
            continue
        cond = (y1_ > Y) != (y2_ > Y)
        xint = x1_ + (Y - y1_) * (x2_ - x1_) / (y2_ - y1_)
        m ^= cond & (X < xint)
    _paint(L, box, m, c)


def seg(L, x1, y1, x2, y2, w, c):
    """粗线段（胶囊形），半宽 w/2。"""
    box = _box(min(x1, x2) - w, min(y1, y2) - w, max(x1, x2) + w, max(y1, y2) + w)
    if box is None:
        return
    x0, x1b, y0, y1b = box
    X, Y = np.meshgrid(np.arange(x0, x1b) + 0.5, np.arange(y0, y1b) + 0.5)
    dx, dy = x2 - x1, y2 - y1
    L2 = dx * dx + dy * dy
    t = np.clip(((X - x1) * dx + (Y - y1) * dy) / L2, 0, 1) if L2 > 0 else np.zeros_like(X)
    d2 = (X - (x1 + t * dx)) ** 2 + (Y - (y1 + t * dy)) ** 2
    _paint(L, box, d2 <= (w / 2) ** 2, c)


def arc_band(L, cx, cy, r0, r1, a0, a1, c, clip=None):
    """圆环扇形：半径 r0..r1，角度 a0..a1（弧度，屏幕坐标 y 向下）。"""
    R = r1 + 1
    box = _box(cx - R, cy - R, cx + R, cy + R)
    if box is None:
        return
    x0, x1, y0, y1 = box
    X, Y = np.meshgrid(np.arange(x0, x1) + 0.5 - cx, np.arange(y0, y1) + 0.5 - cy)
    r = np.sqrt(X * X + Y * Y)
    ang = np.arctan2(Y, X)
    m = (r >= r0) & (r <= r1)
    a0n, a1n = a0 % (2 * math.pi), a1 % (2 * math.pi)
    if a0n <= a1n:
        m &= (ang % (2 * math.pi) >= a0n) & (ang % (2 * math.pi) <= a1n)
    else:
        m &= (ang % (2 * math.pi) >= a0n) | (ang % (2 * math.pi) <= a1n)
    if clip is not None:
        m &= clip[y0:y1, x0:x1]
    _paint(L, box, m, c)


def outline_of(a):
    """8 邻域外扩一圈，只留外圈像素，用来描深色边。"""
    d = a.copy()
    d[1:] |= a[:-1]; d[:-1] |= a[1:]
    d[:, 1:] |= a[:, :-1]; d[:, :-1] |= a[:, 1:]
    d[1:, 1:] |= a[:-1, :-1]; d[:-1, :-1] |= a[1:, 1:]
    d[1:, :-1] |= a[:-1, 1:]; d[:-1, 1:] |= a[1:, :-1]
    return d & ~a


def put_layer(img, L, outline_col=None):
    """把一层叠到画面上；可选先描边。"""
    if outline_col is not None:
        o = outline_of(L.a)
        img[o] = outline_col
    img[L.a] = L.rgb[L.a]


_font_cache = {}
_text_cache = {}


def text_mask(s, size=16):
    """Unifont 点阵文字 -> 布尔遮罩（无抗锯齿）。"""
    key = (s, size)
    if key in _text_cache:
        return _text_cache[key]
    if size not in _font_cache:
        _font_cache[size] = ImageFont.truetype(FONT_PATH, size)
    f = _font_cache[size]
    bbox = f.getbbox(s)
    w, h = max(1, bbox[2] + 2), max(1, bbox[3] + 2)
    im = Image.new('L', (w, h), 0)
    ImageDraw.Draw(im).text((0, 0), s, font=f, fill=255)
    m = np.array(im) >= 128
    ys, xs = np.where(m)
    if len(xs):
        m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    _text_cache[key] = m
    return m


def text(img, s, x, y, c, k=1, size=16, align='left', shadow=None):
    """在画面上写字。k 为整数放大倍数（像素块）；(x,y) 为左上角（align=center 时为中心 x）。"""
    m = text_mask(s, size)
    if k != 1:
        m = np.kron(m, np.ones((k, k), bool))
    h, w = m.shape
    x0 = int(x - (w / 2 if align == 'center' else 0)); y0 = int(y)
    for sx, sy in ([(1, 1)] if shadow is None else [(1, 1)]):
        pass
    if shadow is not None:
        _blit(img, m, x0 + k, y0 + k, shadow)
    _blit(img, m, x0, y0, c)


def _blit(img, m, x0, y0, c):
    h, w = m.shape
    xa, ya = max(0, x0), max(0, y0)
    xb, yb = min(W, x0 + w), min(H, y0 + h)
    if xa >= xb or ya >= yb:
        return
    sub = m[ya - y0:yb - y0, xa - x0:xb - x0]
    img[ya:yb, xa:xb][sub] = c


def text_w(s, k=1, size=16):
    return text_mask(s, size).shape[1] * k


def upscale(img):
    """320×180 -> 1920×1080，整数 6 倍 + 隔行压暗 15%（CRT 扫描线）。"""
    big = np.repeat(np.repeat(img, SCALE, 0), SCALE, 1)
    rows = (np.arange(big.shape[0]) // SCALE) % 2 == 1
    big[rows] = (big[rows].astype(np.uint16) * 85 // 100).astype(np.uint8)
    return big
