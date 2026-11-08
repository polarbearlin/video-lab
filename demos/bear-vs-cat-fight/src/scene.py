"""场景 + 时间线 + 特效 + UI。render_frame(t) 是 t 的纯函数（随机数全部固定种子）。"""
import math
import numpy as np
from gfx import (W, H, Layer, col, ell, rect, poly, seg, arc_band, put_layer, text, text_w, text_mask, _blit)
from sprites import Xf, draw_bear, draw_cat, INK, FUR, ICE, ICE_HI, ORG, RED, GOLD, FISH, FISH_HI, WHITE, NAVY_D

GROUND = 146
BEAR_X, CAT_X = 96, 226          # 站位（屏幕 x）
BEAR_HP_MAX = CAT_HP_MAX = 100

# ---------------- 动作关键帧（局部时间 u，单位秒；数值项线性插值，文字/布尔项保持） ----------------
def _interp(keys, u):
    if u <= keys[0][0]:
        return dict(keys[0][1])
    for (u0, p0), (u1, p1) in zip(keys, keys[1:]):
        if u0 <= u <= u1:
            k = (u - u0) / (u1 - u0) if u1 > u0 else 1.0
            out = dict(p0)
            for key, v1 in p1.items():
                v0 = p0.get(key, v1)
                if isinstance(v1, (int, float)) and not isinstance(v1, bool) and isinstance(v0, (int, float)):
                    out[key] = v0 + (v1 - v0) * k
                else:
                    out[key] = v1 if k >= 1 else v0
            return out
    return dict(keys[-1][1])


BEAR_ACT = {
    'idle':  dict(dur=1.0, loop=True, keys=[(0, {'arm': -0.2, 'bob': 0}), (0.5, {'arm': -0.25, 'bob': -1}), (1.0, {'arm': -0.2, 'bob': 0})]),
    'jab':   dict(dur=0.32, keys=[(0, {'arm': -0.2, 'lean': 0, 'x': 0}), (0.08, {'arm': -0.5, 'lean': -2, 'x': -2}),
                                  (0.14, {'arm': 0.0, 'lean': 3, 'x': 10}), (0.32, {'arm': -0.2, 'lean': 0, 'x': 0})]),
    'hook':  dict(dur=0.55, keys=[(0, {'arm': -0.2, 'x': 0}), (0.14, {'arm': -1.4, 'lean': -2, 'x': -2}),
                                  (0.30, {'arm': 0.9, 'lean': 4, 'x': 6}), (0.40, {'arm': 1.2, 'lean': 4, 'x': 6}),
                                  (0.55, {'arm': -0.2, 'lean': 0, 'x': 0})]),
    'guard': dict(dur=0.3, keys=[(0, {'arm': -0.2}), (0.06, {'arm': -1.5, 'lean': -2}), (0.25, {'arm': -1.5, 'lean': -2}), (0.3, {'arm': -0.2, 'lean': 0})]),
    'slash': dict(dur=0.5, keys=[(0, {'arm': 1.1, 'x': 0}), (0.2, {'arm': -1.0, 'lean': 4, 'x': 6}),
                                 (0.3, {'arm': -1.1, 'lean': 4, 'x': 6}), (0.5, {'arm': -0.2, 'lean': 0, 'x': 0})]),
    'charge': dict(dur=0.9, keys=[(0, {'arm': -0.2, 'eyes': 'open'}), (0.3, {'arm': -1.2, 'lean': -1}),
                                  (0.6, {'arm': -1.57, 'lean': -1, 'eyes': 'squint'}), (0.9, {'arm': -0.2, 'lean': 0, 'eyes': 'open'})]),
    'jump':  dict(dur=0.7, keys=[(0, {'arm': -0.2, 'bob': 0, 'x': 0}), (0.2, {'arm': -1.6, 'bob': -14, 'x': 6}),
                                 (0.35, {'arm': 1.0, 'bob': -16, 'x': 9, 'lean': 4}), (0.7, {'arm': -0.2, 'bob': 0, 'x': 0, 'lean': 0})]),
    'hurt':  dict(dur=0.4, keys=[(0, {'lean': -5, 'x': -6, 'eyes': 'squint', 'flash': True}), (0.07, {'flash': False}),
                                 (0.2, {'lean': -3, 'x': -3, 'flash': False}), (0.4, {'lean': 0, 'x': 0, 'eyes': 'open'})]),
    'kneel': dict(dur=5.0, keys=[(0, {'bob': -4, 'lean': 4, 'arm': 0.3, 'eyes': 'squint'}), (5.0, {'bob': -4, 'lean': 4, 'arm': 0.3, 'eyes': 'squint'})]),
    'win':   dict(dur=1.0, loop=True, keys=[(0, {'arm_up': True, 'bob': 0, 'eyes': 'open'}), (0.25, {'arm_up': True, 'bob': -3}),
                                           (0.5, {'arm_up': True, 'bob': 0}), (0.75, {'arm_up': True, 'bob': -3}), (1.0, {'arm_up': True, 'bob': 0})]),
}

CAT_ACT = {
    'idle':  dict(dur=1.0, loop=True, keys=[(0, {'bob': 0, 'tail': 0}), (0.5, {'bob': -1, 'tail': 2}), (1.0, {'bob': 0, 'tail': 0})]),
    'dash':  dict(dur=0.7, keys=[(0, {'x': 0, 'lean': -3, 'arm': 0.1}), (0.35, {'x': -70, 'lean': -6, 'arm': -0.2}),
                                 (0.7, {'x': -96, 'lean': 0, 'arm': 0.3})]),
    'hurt':  dict(dur=0.4, keys=[(0, {'lean': 5, 'x': 6, 'eyes': 'squeeze', 'flash': True}), (0.07, {'flash': False}),
                                 (0.2, {'lean': 3, 'x': 3, 'flash': False}), (0.4, {'lean': 0, 'x': 0, 'eyes': 'open'})]),
    'hurtbig': dict(dur=0.6, keys=[(0, {'lean': 8, 'x': 16, 'eyes': 'squeeze', 'flash': True}), (0.07, {'flash': False}),
                                   (0.3, {'lean': 6, 'x': 10}), (0.6, {'lean': 0, 'x': 0, 'eyes': 'open'})]),
    'taunt': dict(dur=2.0, keys=[(0, {'arms_up': False, 'fish': True, 'eyes': 'open', 'mouth': 0, 'head_dx': 0, 'tail': 0}),
                                 (0.3, {'arms_up': True, 'fish': False, 'eyes': 'half', 'mouth': 3, 'head_dx': 1, 'tail': 2}),
                                 (1.2, {'arms_up': True, 'fish': False, 'eyes': 'happy', 'mouth': 3, 'head_dx': 1, 'tail': -2}),
                                 (1.6, {'arms_up': True, 'fish': False, 'eyes': 'half', 'mouth': 3, 'head_dx': 0, 'tail': 2}),
                                 (2.0, {'arms_up': False, 'fish': True, 'eyes': 'open', 'mouth': 0, 'head_dx': 0, 'tail': 0})]),
    'throw': dict(dur=0.4, keys=[(0, {'arm': 0.3, 'fish': True, 'lean': 0}), (0.12, {'arm': -1.2, 'fish': True, 'lean': -2}),
                                 (0.2, {'arm': 0.8, 'fish': False, 'lean': 3}), (0.4, {'arm': 0.3, 'fish': True, 'lean': 0})]),
    'charge': dict(dur=2.2, keys=[(0, {'mouth': 0, 'cheek': 0.0, 'arm': 0.3, 'fish': True, 'eyes': 'open', 'bob': 0}),
                                  (0.2, {'mouth': 1, 'cheek': 0.1, 'arm': -0.9, 'bob': -1}),
                                  (0.4, {'mouth': 2, 'cheek': 0.2, 'arm': -0.9, 'bob': 0}),
                                  (0.6, {'mouth': 1, 'cheek': 0.3, 'arm': -0.9, 'bob': -1}),
                                  (0.8, {'mouth': 2, 'cheek': 0.4, 'arm': -0.9, 'bob': 0, 'eyes': 'squeeze'}),
                                  (1.0, {'mouth': 1, 'cheek': 0.5, 'arm': -0.9, 'bob': -1}),
                                  (1.2, {'mouth': 2, 'cheek': 0.6, 'arm': -0.9, 'bob': 0}),
                                  (1.4, {'mouth': 1, 'cheek': 0.7, 'arm': -0.9, 'bob': -1}),
                                  (1.6, {'mouth': 2, 'cheek': 0.8, 'arm': -0.9, 'bob': 0}),
                                  (1.8, {'mouth': 1, 'cheek': 0.9, 'arm': -0.9, 'bob': -1}),
                                  (2.0, {'mouth': 2, 'cheek': 1.0, 'arm': -0.9, 'bob': 0}),
                                  (2.2, {'mouth': 2, 'cheek': 1.0, 'arm': -0.9, 'bob': 0})]),
    'vortex': dict(dur=0.6, keys=[(0, {'mouth': 2, 'cheek': 1.0, 'eyes': 'squeeze', 'fish': False, 'arm': 0.6}),
                                  (0.3, {'mouth': 2, 'cheek': 0.4, 'eyes': 'open'}), (0.6, {'mouth': 0, 'cheek': 0.0, 'fish': True, 'arm': 0.3})]),
    'ko':    dict(dur=5.0, keys=[(0, {'rot': 0.0, 'bob': 0, 'eyes': 'squeeze', 'fish': True, 'arm': -0.6, 'mouth': 0}),
                                 (0.35, {'rot': -1.45, 'bob': 2, 'x': -6}), (5.0, {'rot': -1.45, 'bob': 2, 'x': -6})]),
    'pop':   dict(dur=5.0, keys=[(0, {'bob': 62, 'mouth': 2, 'arm': -1.2, 'eyes': 'happy', 'fish': True, 'cheek': 0.0}),
                                 (0.5, {'bob': 0, 'mouth': 2, 'arm': -1.2, 'eyes': 'happy', 'fish': True}),
                                 (0.9, {'bob': 0, 'mouth': 2, 'arm': -1.2, 'eyes': 'happy', 'fish': True})]),
}

BEAR_DEF = dict(arm=-0.2, lean=0, head_dx=0, head_dy=0, bob=0, stance=0, eyes='open', flash=False, arm_up=False, x=0)
CAT_DEF = dict(arm=0.3, lean=0, head_dx=0, head_dy=0, bob=0, tail=0, cheek=0, mouth=0, eyes='open', flash=False,
               arms_up=False, fish=True, x=0, rot=0.0)

# (开始时间, 动作名, 是否受击)。受击动作在被打的那一刻覆盖当前动作。
BEAR_SCHED = [
    (4.36, 'jab'), (4.95, 'jab'), (5.54, 'jab'),
    (6.92, 'guard'),                  # 挡住猫的鱼骨头
    (8.20, 'hook'),
    (11.80, 'slash'),
    (14.55, 'charge'),
    (15.80, 'hurt'), (19.40, 'hurt'),
    (16.00, 'kneel'),
    (19.20, 'hurt'),
    (21.60, 'jump'),
    (22.70, 'slash'),
    (26.00, 'win'),
]
CAT_SCHED = [
    (3.70, 'dash'),
    (4.50, 'hurt'), (5.09, 'hurt'), (5.68, 'hurt'),
    (6.40, 'throw'),
    (8.52, 'hurtbig'),
    (9.30, 'taunt'),
    (12.00, 'hurt'),
    (13.00, 'charge'),
    (15.15, 'vortex'),
    (15.80, 'hurt'),
    (19.00, 'throw'),
    (23.00, 'ko'),
    (27.90, 'pop'),
]
# 倒地/淡出：猫在 27.6 离场，由 27.9 的探头接上
CAT_HIDE_AT = 27.6

# 伤害事件：(时间, 目标, 扣血后数值)
BEAR_HP_EV = [(15.80, 60), (19.40, 52)]
CAT_HP_EV = [(4.50, 96), (5.09, 92), (5.68, 88), (8.52, 62), (12.00, 40), (15.80, 18), (22.00, 6), (23.00, 0)]


def _active(sched, acts, t, dflt):
    """取最近开始的、仍在进行中的动作；没有就用 idle。返回 (pose, 动作名, 局部时间)。"""
    best = None
    for t0, name in sched:
        if t0 <= t:
            act = acts[name]
            u = t - t0
            if act.get('loop') or u < act['dur']:
                best = (t0, name, u)
    if best is None:
        act = acts['idle']; u = t % act['dur']
        return dflt | _interp(act['keys'], round(u * 10) / 10), 'idle', u
    t0, name, u = best
    act = acts[name]
    if act.get('loop'):
        u = u % act['dur']
    uq = round(min(u, act['dur']) * 10) / 10          # 10 帧/秒的精灵节奏
    return dflt | _interp(act['keys'], uq), name, u


def _hp(events, start, t):
    """血量：返回 (当前值, 上一次值, 最近一次事件时间)。"""
    v, prev, when = start, start, -99.0
    for et, nv in events:
        if t >= et:
            prev, v, when = v, nv, et
    return v, prev, when


# ---------------- 背景 ----------------
_rng = np.random.default_rng(7)
STARS = [(int(_rng.integers(0, W)), int(_rng.integers(0, 100))) for _ in range(60)]
PENGUIN_X = [10 + i * 22 + int(_rng.integers(-3, 4)) for i in range(15)]


def _sky(img, t):
    bands = ['#1D1435', '#211940', '#262049', '#2D2459', '#352A66', '#3E3272', '#4A3F7E']
    for i, c in enumerate(bands):
        y0, y1 = i * 18, (i + 1) * 18
        img[y0:y1] = col(c)
    # 极光带：正弦起伏的像素带，交替两种颜色
    for x in range(W):
        y = int(22 + 7 * math.sin(x * 0.045 + t * 1.1) + 4 * math.sin(x * 0.12 - t * 0.6))
        for k in range(7):
            yy = y + k
            if 0 <= yy < 100 and (k + x // 3) % 2 == 0:
                img[yy, x] = col('#3FD29A') if k < 4 else col('#8E6BF2')
    for sx, sy in STARS:
        if (sx + int(t * 2)) % 37 != 0 and sy < 60:
            img[sy, sx] = col('#F4FBFF') if (sx + sy) % 3 else col('#B9D8E8')


def _mountains(img):
    L = Layer()
    poly(L, [(0, 118), (30, 92), (58, 112), (92, 84), (130, 116), (170, 90), (208, 112), (246, 86), (288, 114), (320, 96), (320, 146), (0, 146)], col('#2B3A67'))
    poly(L, [(92, 84), (84, 94), (92, 90), (100, 96)], col('#F4FBFF'))
    poly(L, [(170, 90), (162, 100), (170, 96), (178, 102)], col('#F4FBFF'))
    poly(L, [(246, 86), (238, 96), (246, 92), (254, 98)], col('#F4FBFF'))
    poly(L, [(30, 92), (23, 102), (30, 98), (37, 104)], col('#F4FBFF'))
    put_layer(img, L)


def _floor(img):
    img[GROUND:] = col('#CFEFFA')
    for y in range(GROUND + 2, H, 3):
        img[y] = col('#B8E3F2')
    img[GROUND] = col('#F4FBFF')
    img[GROUND + 1] = col('#7FD3F0')
    L = Layer()
    for (x0, y0, x1, y1) in [(40, 158, 62, 160), (250, 166, 276, 168), (150, 172, 170, 173), (20, 170, 36, 171)]:
        rect(L, x0, y0, x1, y1, col('#7FD3F0'))
    put_layer(img, L)


def _crates(img):
    L = Layer()
    for x0 in (6, 294):
        rect(L, x0, 124, x0 + 22, GROUND, col('#7A3E1C'))
        rect(L, x0 + 1, 125, x0 + 21, 126, col('#A65A2C'))
        rect(L, x0, 133, x0 + 22, 134, col('#4A2510'))
        rect(L, x0, 141, x0 + 22, 142, col('#4A2510'))
        for k in range(3):
            fx = x0 + 4 + k * 6
            ell(L, fx + 2, 129, 2.4, 1.6, FISH)
            ell(L, fx + 2, 129.6, 1.2, 0.5, FISH_HI)
    put_layer(img, L, INK)


def _crowd(img, t):
    L = Layer()
    beat = (t * 2.0) % 1.0
    for i, px in enumerate(PENGUIN_X):
        jump = 1 if (int(t * 2) + i) % 4 == 0 and beat < 0.35 else 0
        y = 136 - jump
        ell(L, px, y, 4, 6, INK)
        ell(L, px, y + 1, 2.2, 3.8, FUR)
        ell(L, px, y - 7, 3.4, 3.2, INK)
        rect(L, px + 2, y - 7, px + 4, y - 6, GOLD)
    put_layer(img, L)


# ---------------- 特效 ----------------
def _sparks(L, x, y, age, base_col):
    """击中火花：从中心放射的十字星，半径随时间变大，最长 0.25 秒。"""
    if age < 0 or age > 0.25:
        return
    r = 2 + age * 60
    for k in range(6):
        a = k * math.pi / 3 + 0.4
        cx, cy = x + math.cos(a) * r, y + math.sin(a) * r
        rect(L, int(cx), int(cy), int(cx) + 2, int(cy) + 1, base_col)
        rect(L, int(cx) + 1, int(cy) - 1, int(cx) + 2, int(cy) + 2, base_col)


def _slash_arc(L, cx, cy, age, a_from, a_to, rad, c):
    if age < 0 or age > 0.22:
        return
    k = age / 0.22
    a_now = a_from + (a_to - a_from) * k
    arc_band(L, cx, cy, rad - 1.5, rad + 1.5, min(a_from, a_now), max(a_from, a_now), c)


def _ice_wave(L, t, t0, cx0, cy0):
    age = t - t0
    if age < 0 or age > 0.7:
        return
    r = 12 + age * 150
    cx = cx0 + age * 210
    arc_band(L, cx, cy0, r - 9, r, -0.9, 0.9, ICE)
    arc_band(L, cx, cy0, r - 5, r - 2, -0.7, 0.7, ICE_HI)


def _fish_fly(L, x, y, dx, dy, k=1.0):
    ell(L, x, y, 4 * k, 2 * k, FISH)
    poly(L, [(x - 4 * k, y), (x - 7 * k, y - 2.5 * k), (x - 7 * k, y + 2.5 * k)], FISH)


# ---------------- UI ----------------
def _bar(img, x0, x1, y, v, ghost_from, ghost_t, fill_c):
    L = Layer()
    rect(L, x0 - 1, y - 1, x1 + 1, y + 6, INK)
    rect(L, x0, y, x1, y + 5, col('#2B3A67'))
    w = (x1 - x0) * max(0, v) / 100.0
    if ghost_t is not None and ghost_from > v:
        g = (x1 - x0) * ghost_from / 100.0
        rect(L, x0 + int(w), y, x0 + int(g), y + 5, RED)
    rect(L, x0, y, x0 + int(w), y + 5, fill_c)
    rect(L, x0, y, x0 + int(w), y + 1, WHITE if int(w) > 0 else INK)
    put_layer(img, L)


def _hud(img, t, bear_hp, cat_hp, combo, timer):
    bv, bprev, bwhen = bear_hp; cv, cprev, cwhen = cat_hp
    _bar(img, 14, 134, 12, bv, bprev, bwhen if t - bwhen < 0.6 else None, ICE)
    _bar(img, 186, 306, 12, cv, cprev, cwhen if t - cwhen < 0.6 else None, ORG)
    text(img, '1P', 14, 19, WHITE, k=1, size=16)
    text(img, 'CPU', 286, 19, WHITE, k=1, size=16, align='left') if False else None
    # 连击数
    if combo is not None:
        n, t0 = combo
        if 0 <= t - t0 < 1.0:
            text(img, f'{n} HIT', 14, 28, GOLD, k=2, size=16)
    # 计时
    if t < 25.9:
        text(img, f'{int(timer):02d}', 160 - 8, 6, GOLD, k=2, size=16, align='left')


def _banner(img, s, t, t0, t1, c, k, y=72):
    if t0 <= t < t1:
        bob = 0 if t - t0 > 0.12 else (1 - (t - t0) / 0.12) * 8
        text(img, s, 160, y - bob, c, k=k, size=16, align='center', shadow=INK)


# ---------------- 一帧 ----------------
def _title(img, t):
    img[:] = col('#0A0A0B')
    for sx, sy in STARS[:40]:
        if (sx * 7 + sy) % 5 == 0:
            img[sy % H, sx] = col('#F4FBFF')
    k = 2
    s1, s2 = '北极熊', '大馋猫'
    w1, w2 = text_w(s1, k), text_w(s2, k)
    pop = max(0.0, min(1.0, (t - 0.2) / 0.3))
    dy = int((1 - pop) * -40)
    text(img, s1, 104 - w1 // 2, 56 + dy, WHITE, k=k, size=16, shadow=INK)
    text(img, 'vs', 160, 80 + dy // 2, GOLD, k=1, size=16, align='center')
    text(img, s2, 216 - w2 // 2, 56 + dy, ORG, k=k, size=16, shadow=INK)
    if t > 1.2:
        text(img, 'ROUND 1', 160, 124, WHITE, k=2, size=16, align='center')
    if t > 1.6:
        text(img, '16-BIT ARCADE', 160, 150, col('#8C8A86'), k=1, size=16, align='center')


def render_frame(t):
    img = np.zeros((H, W, 3), np.uint8)
    flash = 0.0
    shake = (0, 0)
    if t < 2.5:
        _title(img, t)
    else:
        _sky(img, t); _mountains(img); _floor(img); _crowd(img, t); _crates(img)
        # 比赛胜负前的场地微晃动
        # 角色（阴影 + 本体）
        b_pose, b_name, b_u = _active(BEAR_SCHED, BEAR_ACT, t, BEAR_DEF)
        c_pose, c_name, c_u = _active(CAT_SCHED, CAT_ACT, t, CAT_DEF)
        # 猫的本体（隐藏 / 探头）
        cat_visible = True
        cat_oy = GROUND
        if t >= CAT_HIDE_AT and t < 27.9:
            cat_visible = False
        if t >= 27.9:
            cat_oy = GROUND + 62 * (1 - min(1.0, (t - 27.9) / 0.5)) if False else GROUND
        # 闪光 / 震动：重击前两帧
        for hit_t in (8.52, 15.80, 23.00):
            if 0 <= t - hit_t < 0.067:
                flash = 0.7
        if 15.80 <= t < 16.0 or 23.0 <= t < 23.07:
            flash = 0.7
        if 8.52 <= t < 8.72 or 15.80 <= t < 16.05 or 23.0 <= t < 23.3:
            amp = 2 if t - (8.52 if t < 9 else 15.8 if t < 16.1 else 23.0) < 0.2 else 0
            shake = (int(round(amp * math.sin(t * 90))), int(round(amp * math.cos(t * 70))))
        # 影子
        shadow = Layer()
        ell(shadow, BEAR_X + b_pose.get('x', 0) * 0 + 0, GROUND + 1, 14, 2.5, col('#9FD3E6'))
        ell(shadow, CAT_X, GROUND + 1, 14, 2.5, col('#9FD3E6'))
        put_layer(img, shadow)
        # 熊
        bl = Layer()
        b_ox = BEAR_X + b_pose.get('x', 0) + 0
        b_oy = GROUND + b_pose.get('bob', 0)
        draw_bear(bl, Xf(b_ox, b_oy, 1, 0.0), b_pose)
        put_layer(img, bl, INK)
        # 猫
        if cat_visible:
            cl = Layer()
            c_ox = CAT_X + c_pose.get('x', 0) + (40 if c_name == 'pop' else 0)
            c_oy = cat_oy + c_pose.get('bob', 0)
            if c_name == 'pop':
                k_ = min(1.0, max(0.0, (t - 27.9) / 0.5))
                c_oy = 230 - 40 * (1 - (1 - k_) ** 3)     # 从画面底边冒出来，最后只露出脑袋和鱼
            draw_cat(cl, Xf(c_ox, c_oy, -1, c_pose.get('rot', 0.0)), c_pose)
            put_layer(img, cl, INK)
        # 特效层：飞鱼、鱼骨、冰息、火花、斩击弧
        fx = Layer()
        # 猫的鱼骨头（投掷）：6.6 发出，7.0 被挡
        if 6.6 <= t < 7.0:
            p = (t - 6.6) / 0.4
            _fish_fly(fx, 210 - p * 60, 116 - math.sin(p * math.pi) * 22, -1, 0)
        # 猫的鱼骨头（投掷二）：19.2 发出，19.6 命中熊
        if 19.2 <= t < 19.6:
            p = (t - 19.2) / 0.4
            _fish_fly(fx, 210 - p * 88, 118 - math.sin(p * math.pi) * 20, -1, 0)
        # 吞鱼：15.15 起，鱼被吸向猫嘴（吸入）→ 15.15 后向熊喷出
        if 13.0 <= t < 15.15:
            for k in range(3):
                p = ((t - 13.0) * 1.2 + k / 3.0) % 1.0
                x = 230 - 10 - (1 - p) * 60; y = 120 + (1 - p) * -20 * 0 + math.sin(p * 9 + k) * 6
                if p < 0.9:
                    _fish_fly(fx, x, y, 1, 0, 0.8)
        if 15.15 <= t < 16.0:
            for k in range(5):
                p = ((t - 15.15) * 2.6 + k * 0.2) % 1.0
                x = 214 - p * 120
                y = 118 + math.sin(p * 7 + k) * 5
                _fish_fly(fx, x, y, -1, 0, 0.9)
        # 冰息（熊）：15.2 释放，向猫推进
        _ice_wave(fx, t, 15.2, 128, 118)
        # 斩击弧 / 挥拳弧（熊）
        for st_, a0, a1, rad in ((11.80, 1.1, -1.0, 40), (8.20, -1.4, 1.2, 36), (22.70, 1.1, -1.1, 38)):
            _slash_arc(fx, BEAR_X + 8, GROUND - 37, t - st_ - 0.2, a0, a1, rad, ICE_HI)
        # 火花：每次命中
        for hx, hy, ht in ((126, 112, 4.50), (126, 112, 5.09), (126, 112, 5.68), (206, 108, 8.52),
                           (176, 112, 15.80), (150, 112, 6.92), (150, 112, 7.00), (162, 118, 19.40),
                           (210, 120, 22.00), (216, 124, 23.00), (200, 120, 12.00)):
            _sparks(fx, hx, hy, t - ht, FISH_HI if ht != 15.80 else WHITE)
        put_layer(img, fx, INK)
        # UI
        bear_hp = _hp(BEAR_HP_EV, BEAR_HP_MAX, t)
        cat_hp = _hp(CAT_HP_EV, CAT_HP_MAX, t)
        combo = None
        for ht, n in ((4.50, 1), (5.09, 2), (5.68, 3)):
            if ht <= t < ht + 1.0:
                combo = (n, ht)
        timer = 99 - max(0.0, min(t, 21.0) - 2.5) * 5.1
        timer = max(4, timer)
        _hud(img, t, bear_hp, cat_hp, combo, timer)
        # 横幅
        _banner(img, 'ROUND 1', t, 2.5, 3.2, WHITE, 4)
        _banner(img, 'FIGHT!', t, 3.2, 3.9, GOLD, 5)
        _banner(img, 'K.O.', t, 23.1, 25.9, RED, 5, y=34)
        if 26.2 <= t < 29.9:
            text(img, 'WINNER', 160, 18, GOLD, k=3, size=16, align='center', shadow=INK)
            text(img, '北极熊', 160, 50, WHITE, k=2, size=16, align='center', shadow=INK)
        if 27.6 <= t < 30.0:
            text(img, 'CONTINUE?', 160, 98, WHITE, k=1, size=16, align='center')
            d = '9' if t < 28.1 else '8'
            text(img, d, 160 + text_w('CONTINUE?', 1) // 2 + 10, 94, RED, k=2, size=16)
        # 击中闪白
        if flash:
            img[:] = (img.astype(np.float32) * 0.3 + 255 * 0.7).astype(np.uint8)
        # 开场擦拭（2.2–2.5）
        if 2.2 <= t < 2.5:
            wipe = int((t - 2.2) / 0.3 * W)
            img[:, :wipe] = img[:, :wipe]
            img[:, wipe:] = col('#0A0A0B') if False else img[:, wipe:]
    if shake != (0, 0):
        img = np.roll(img, shake, axis=(0, 1))
    return img
