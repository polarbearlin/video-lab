"""两个角色的像素造型（原创）。角色都按"朝右"画，朝左时用 Xf 镜像坐标。
脚底中心为原点，y 向下为正。"""
import math
from gfx import ell, seg, poly, col, put_layer, Layer, outline_of

INK = col('#1D1435')          # 描边 / 深色
WHITE = col('#FFFFFF')

# 北极熊剑士
FUR = col('#F4FBFF'); FUR_SH = col('#B9D8E8'); FUR_HI = col('#FFFFFF')
NAVY = col('#2B3A67'); NAVY_D = col('#1D1435')
ICE = col('#7FD3F0'); ICE_HI = col('#F4FBFF')
RED = col('#D8453B'); GOLD = col('#F5C53A')

# 大馋猫小姑娘
SKIN = col('#FFD9B0'); SKIN_SH = col('#F2B896')
ORG = col('#F08A3C'); ORG_D = col('#7A3E1C')
PINK = col('#F7A1C4'); PINK_D = col('#E0457B')
BLUSH = col('#FF8FA3'); EYE = col('#1D1435')
FISH = col('#5BB7D6'); FISH_HI = col('#F4FBFF')


class Xf:
    """局部坐标 -> 屏幕坐标。s=-1 为镜像（朝左），rot 为整体旋转（倒地用）。"""

    def __init__(self, ox, oy, s=1, rot=0.0):
        self.ox, self.oy, self.s, self.rot = ox, oy, s, rot
        self.c, self.sn = math.cos(rot), math.sin(rot)

    def P(self, x, y):
        xx = self.s * x
        xr = xx * self.c - y * self.sn
        yr = xx * self.sn + y * self.c
        return self.ox + xr, self.oy + yr

    def D(self, dx, dy):
        """方向向量（不平移）。"""
        xx = self.s * dx
        return xx * self.c - dy * self.sn, xx * self.sn + dy * self.c


def _E(L, xf, x, y, rx, ry, c, clip=None):
    cx, cy = xf.P(x, y)
    ell(L, cx, cy, rx, ry, c, ang=xf.rot, clip=clip)


def _S(L, xf, x1, y1, x2, y2, w, c):
    ax, ay = xf.P(x1, y1); bx, by = xf.P(x2, y2)
    seg(L, ax, ay, bx, by, w, c)


def _G(L, xf, pts, c):
    poly(L, [xf.P(x, y) for x, y in pts], c)


def _fishsprite(L, xf, x, y, dirx, diry, k=1.0):
    """一条小鱼：沿 (dirx,diry) 方向，长约 10k 像素。"""
    cx, cy = xf.P(x, y)
    d = math.hypot(dirx, diry) or 1
    ux, uy = dirx / d, diry / d
    px, py = -uy, ux
    L_ = 5 * k
    body = (cx, cy)
    tailx, taily = cx - ux * L_ * 1.2, cy - uy * L_ * 1.2
    poly(L, [(cx + ux * L_, cy + uy * L_), (cx + px * 2 * k, cy + py * 2 * k), (cx - px * 2 * k, cy - py * 2 * k)], FISH)
    poly(L, [(cx + ux * L_ * 0.4 + px * 2 * k, cy + uy * L_ * 0.4 + py * 2 * k),
             (tailx + px * 3.5 * k, taily + py * 3.5 * k),
             (tailx - px * 3.5 * k, taily - py * 3.5 * k),
             (cx - ux * L_ * 0.4 - px * 2 * k, cy - uy * L_ * 0.4 - py * 2 * k)], FISH)
    ell(L, cx, cy + 0.6 * k, 4.2 * k, 2.2 * k, FISH_HI, ang=math.atan2(uy, ux) if True else 0)
    ell(L, cx, cy, 4.2 * k, 2.2 * k, FISH, ang=math.atan2(uy, ux))


# ---------------- 北极熊剑士 ----------------
def draw_bear(L, xf, p):
    fl = p.get('flash', False)
    cc = (lambda c: WHITE) if fl else (lambda c: c)
    lean = p.get('lean', 0.0); hdx = p.get('head_dx', 0.0); hdy = p.get('head_dy', 0.0)
    st = p.get('stance', 0.0)
    # 后腿 / 裤裙（深海军蓝）
    _G(L, xf, [(-9 - st, -23), (-1 - st, -23), (-3 - st, -3), (-10 - st, -3)], cc(NAVY))
    _G(L, xf, [(1 + st, -23), (9 + st, -23), (10 + st, -3), (2 + st, -3)], cc(NAVY))
    _E(L, xf, -7 - st, -2, 4, 2.6, cc(FUR)); _E(L, xf, 7 + st, -2, 4, 2.6, cc(FUR))
    # 后臂（身体后面）
    _S(L, xf, lean - 9, -38, lean - 13, -24, 6, cc(FUR))
    _E(L, xf, lean - 13, -22, 3, 3, cc(FUR))
    # 身体
    _E(L, xf, lean, -30, 13, 13, cc(FUR))
    _E(L, xf, lean + 2, -28, 8, 9, cc(FUR_HI))
    _E(L, xf, lean + 7, -23, 8, 7, cc(FUR_SH), clip=L.a)
    # 深蓝对襟马甲 + 冰蓝滚边
    _G(L, xf, [(lean - 10, -43), (lean + 5, -43), (lean + 9, -24), (lean - 6, -20), (lean - 12, -31)], cc(NAVY))
    _S(L, xf, lean + 4, -43, lean + 8, -25, 1.2, cc(ICE))
    # 头
    hx, hy = lean * 0.5 + 3 + hdx, -52 + hdy
    _E(L, xf, hx - 5, hy - 10, 4, 4, cc(FUR)); _E(L, xf, hx - 5, hy - 10, 2, 2, cc(FUR_SH))
    _E(L, xf, hx + 6, hy - 10, 4, 4, cc(FUR)); _E(L, xf, hx + 6, hy - 10, 2, 2, cc(FUR_SH))
    _E(L, xf, hx, hy, 12, 11, cc(FUR))
    _E(L, xf, hx + 1, hy + 6, 9, 4, cc(FUR_SH), clip=L.a)
    _E(L, xf, hx + 8, hy + 6, 6, 4.5, cc(FUR_HI))
    _E(L, xf, hx + 12, hy + 5, 2, 1.5, cc(NAVY_D))
    # 红色头巾，尾巴随风飘
    _S(L, xf, hx - 11, hy - 8, hx + 11, hy - 9, 3.2, cc(RED))
    _G(L, xf, [(hx - 11, hy - 9), (hx - 19, hy - 5), (hx - 17, hy - 2), (hx - 11, hy - 6)], cc(RED))
    # 眼睛 / 眉毛（严肃的剑士）
    ey = p.get('eyes', 'open')
    if ey == 'open':
        _E(L, xf, hx + 5, hy - 2, 1.7, 2.2, cc(INK)); _E(L, xf, hx + 5.6, hy - 2.8, 0.6, 0.6, cc(WHITE))
        _E(L, xf, hx - 1, hy - 2, 1.4, 1.9, cc(NAVY_D))
    elif ey == 'squint':
        _S(L, xf, hx + 3, hy - 2, hx + 7, hy - 2, 1.4, cc(INK))
    _S(L, xf, hx + 2, hy - 7, hx + 9, hy - 5.5, 1.1, cc(NAVY_D))
    # 后面（背面）的剑鞘和身前的手臂 + 剑
    ang = p.get('arm', -0.2)
    shx, shy = lean + 8, -37
    hxp, hyp = shx + 13 * math.cos(ang), shy + 13 * math.sin(ang)
    if p.get('arm_up'):
        hxp, hyp = shx + 4, shy - 14
    _S(L, xf, shx, shy, hxp, hyp, 6, cc(FUR))
    _E(L, xf, hxp, hyp, 3, 3, cc(FUR))
    dx, dy = math.cos(ang), math.sin(ang)
    if p.get('arm_up'):
        dx, dy = 0.0, -1.0
    px, py = -dy, dx
    # 剑：握把 / 护手 / 刀身（冰蓝） / 刀身高光
    _S(L, xf, hxp - 4 * dx, hyp - 4 * dy, hxp, hyp, 2.5, cc(NAVY_D))
    _S(L, xf, hxp + px * 3.5, hyp + py * 3.5, hxp - px * 3.5, hyp - py * 3.5, 2, cc(GOLD))
    tipx, tipy = hxp + dx * 42, hyp + dy * 42
    _S(L, xf, hxp, hyp, tipx, tipy, 3.2, cc(ICE))
    _S(L, xf, hxp + dx * 8 + px * 0.9, hyp + dy * 8 + py * 0.9, hxp + dx * 36 + px * 0.9, hyp + dy * 36 + py * 0.9, 1, cc(ICE_HI))
    # 剑尖（三角）
    _G(L, xf, [(0, 0)], cc(ICE))


# ---------------- 大馋猫小姑娘 ----------------
def draw_cat(L, xf, p):
    fl = p.get('flash', False)
    cc = (lambda c: WHITE) if fl else (lambda c: c)
    lean = p.get('lean', 0.0); hdx = p.get('head_dx', 0.0); hdy = p.get('head_dy', 0.0)
    tail = p.get('tail', 0.0); ch = p.get('cheek', 0.0)
    # 双马尾（身后）
    _S(L, xf, lean - 9, -45, lean - 15 + tail, -37, 4, cc(ORG))
    _S(L, xf, lean - 15 + tail, -37, lean - 13 + tail * 1.4, -24, 3.2, cc(ORG))
    _S(L, xf, lean + 9, -45, lean + 15 - tail, -37, 4, cc(ORG))
    _S(L, xf, lean + 15 - tail, -37, lean + 13 - tail * 1.4, -24, 3.2, cc(ORG))
    # 腿 + 粉色鞋 + 白袜
    _S(L, xf, -3, -9, -3, -2, 2.6, cc(SKIN)); _S(L, xf, 3, -9, 3, -2, 2.6, cc(SKIN))
    _E(L, xf, -3, -1.5, 3.2, 1.8, cc(PINK_D)); _E(L, xf, 3.5, -1.5, 3.2, 1.8, cc(PINK_D))
    # 裙子 + 白色花边
    _G(L, xf, [(lean - 6, -24), (lean + 6, -24), (lean + 10, -9), (lean - 10, -9)], cc(PINK))
    _G(L, xf, [(lean - 10, -9), (lean + 10, -9), (lean + 10, -7), (lean - 10, -7)], cc(WHITE))
    # 上衣
    _G(L, xf, [(lean - 5, -35), (lean + 5, -35), (lean + 6, -23), (lean - 6, -23)], cc(PINK))
    _S(L, xf, lean - 3, -35, lean, -31, 1, cc(WHITE)); _S(L, xf, lean + 3, -35, lean, -31, 1, cc(WHITE))
    # 后手（身后）
    _S(L, xf, lean - 5, -33, lean - 8, -24, 3, cc(SKIN))
    # 头：先画后面的头发（大团），再脸，再刘海
    hx, hy = lean * 0.5 + hdx, -46 + hdy
    _E(L, xf, hx, hy - 5, 12.5, 11.5, cc(ORG))
    _E(L, xf, hx, hy, 10.5, 10, cc(SKIN))
    _E(L, xf, hx, hy + 6, 8, 4, cc(SKIN_SH), clip=L.a)
    # 刘海（前额）
    _G(L, xf, [(hx - 11, hy - 1), (hx - 10, hy - 10), (hx, hy - 12), (hx + 10, hy - 10), (hx + 11, hy - 1),
               (hx + 7, hy - 5), (hx + 2, hy - 3), (hx - 3, hy - 6), (hx - 7, hy - 3)], cc(ORG))
    _S(L, xf, hx - 4, hy - 9, hx - 6, hy - 4, 1, cc(ORG_D)); _S(L, xf, hx + 4, hy - 9, hx + 6, hy - 4, 1, cc(ORG_D))
    # 猫耳（带黑色条纹）
    _G(L, xf, [(hx - 9, hy - 8), (hx - 6, hy - 19), (hx - 1, hy - 10)], cc(ORG))
    _G(L, xf, [(hx + 1, hy - 10), (hx + 6, hy - 19), (hx + 9, hy - 8)], cc(ORG))
    _G(L, xf, [(hx - 7, hy - 10), (hx - 6, hy - 16), (hx - 3, hy - 11)], cc(PINK))
    _G(L, xf, [(hx + 3, hy - 11), (hx + 6, hy - 16), (hx + 7, hy - 10)], cc(PINK))
    _S(L, xf, hx - 7, hy - 13, hx - 4, hy - 13, 1, cc(ORG_D)); _S(L, xf, hx + 4, hy - 13, hx + 7, hy - 13, 1, cc(ORG_D))
    # 小鱼发夹
    _E(L, xf, hx + 8, hy - 11, 2.4, 1.3, cc(FISH))
    # 眼睛
    ey = p.get('eyes', 'open')
    if ey == 'open':
        for ex in (hx - 4, hx + 4):
            _E(L, xf, ex, hy + 1, 2.4, 3.0, cc(EYE))
            _E(L, xf, ex - 0.8, hy - 0.8, 0.9, 0.9, cc(WHITE))
    elif ey == 'half':   # 撒娇：半眯 + 眼皮
        for ex in (hx - 4, hx + 4):
            _E(L, xf, ex, hy + 1.5, 2.4, 1.6, cc(EYE))
            _S(L, xf, ex - 2.5, hy - 0.5, ex + 2.5, hy - 0.5, 1.4, cc(SKIN))
    elif ey == 'happy':  # ^ ^
        for ex in (hx - 4, hx + 4):
            _S(L, xf, ex - 2.2, hy + 1.6, ex, hy - 1, 1.2, cc(EYE))
            _S(L, xf, ex, hy - 1, ex + 2.2, hy + 1.6, 1.2, cc(EYE))
    elif ey == 'squeeze':
        for ex in (hx - 4, hx + 4):
            _S(L, xf, ex - 2.2, hy + 0.5, ex + 2.2, hy + 0.5, 1.3, cc(EYE))
    # 腮红
    _E(L, xf, hx - 7, hy + 6, 2.2, 1.3, cc(BLUSH)); _E(L, xf, hx + 7, hy + 6, 2.2, 1.3, cc(BLUSH))
    # 嘴 / 鼓腮
    m = p.get('mouth', 0)
    if ch > 0:
        _E(L, xf, hx - 6, hy + 10, 2.5 + 2.5 * ch, 2.5 + 2 * ch, cc(SKIN))
        _E(L, xf, hx + 6, hy + 10, 2.5 + 2.5 * ch, 2.5 + 2 * ch, cc(SKIN))
    if m == 0:
        _S(L, xf, hx - 1.5, hy + 9, hx + 1.5, hy + 9, 1, cc(EYE))
    elif m == 1:
        _E(L, xf, hx, hy + 9.5, 1.6, 1.2, cc(EYE))
    elif m == 2:
        _E(L, xf, hx, hy + 9.5, 2.6, 2.4, cc(EYE))
    elif m == 3:   # 撅嘴
        _E(L, xf, hx, hy + 9, 1.1, 0.9, cc(PINK_D))
    # 前手：抱着鱼（或者托脸颊）
    if p.get('arms_up'):
        _S(L, xf, lean + 5, -33, hx + 7, hy + 8, 3, cc(SKIN))
        _S(L, xf, lean - 5, -33, hx - 7, hy + 8, 3, cc(SKIN))
    else:
        ang = p.get('arm', 0.3)
        sx, sy = lean + 5, -33
        ex_, ey_ = sx + 9 * math.cos(ang), sy + 9 * math.sin(ang)
        _S(L, xf, sx, sy, ex_, ey_, 3, cc(SKIN))
        _E(L, xf, ex_, ey_, 2, 2, cc(SKIN))
        if p.get('fish', True):
            fx, fy = xf.P(ex_, ey_)
            # 鱼在手上：用本地方向 (ang) 摆放
            fdx, fdy = xf.D(math.cos(ang + 0.6), math.sin(ang + 0.6))
            fsx, fsy = xf.P(ex_ + 3, ey_ + 1)
            _fishsprite(L, xf, ex_ + 3, ey_ + 1, fdx, fdy, 1.7)
