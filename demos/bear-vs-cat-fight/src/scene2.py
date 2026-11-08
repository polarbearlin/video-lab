"""第二版场景：招式特效、镜头切入（cut-in）、命中停顿、镜头推近、台词气泡。
render_frame(t) 是 t 的纯函数。读 timeline.py 的时间表。"""
import math
import numpy as np
from gfx import W, H, Layer, col, ell, rect, poly, seg, arc_band, put_layer, text, text_w
from sprites import Xf, draw_bear, draw_cat, _fishsprite, INK, FUR, FUR_HI, FUR_SH, ICE, ICE_HI, ORG, RED, GOLD, FISH, FISH_HI, WHITE, NAVY_D, PINK, PINK_D, BLUSH
import timeline as TL
from timeline import GROUND, BEAR_X, CAT_X, ptime

PINK_L = col('#F7A1C4')
DARK = col('#0A0A0B')
ICE_D = col('#2B6F8A')


# ---------------- 动作采样 ----------------
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


def _active(sched, acts, t, dflt):
    """返回 (姿势, 动作名, 动作本身)。"""
    best = None
    for t0, name in sched:
        if t0 <= t:
            act = acts[name]
            if act.get('loop') or t - t0 < act['dur']:
                best = (t0, name)
    if best is None:
        act = acts['idle']
        u = round((t % act['dur']) * 10) / 10
        return dict(dflt, **_interp(act['keys'], u)), 'idle', act
    t0, name = best
    act = acts[name]
    u = t - t0
    if act.get('loop'):
        u = u % act['dur']
    u = round(min(u, act['dur']) * 10) / 10
    return dict(dflt, **_interp(act['keys'], u)), name, act


BEAR_DEF = dict(arm=-0.2, lean=0, head_dx=0, head_dy=0, bob=0, stance=0, eyes='open', flash=False, arm_up=False, x=0, rot=0.0)
CAT_DEF = dict(arm=0.3, lean=0, head_dx=0, head_dy=0, bob=0, tail=0, cheek=0, mouth=0, eyes='open', flash=False,
               arms_up=False, fish=True, x=0, rot=0.0)


def bear_pose(t):
    return _active(TL.BEAR_SCHED, TL.BEAR_ACT, ptime(t), BEAR_DEF)


def cat_pose(t):
    return _active(TL.CAT_SCHED, TL.CAT_ACT, ptime(t), CAT_DEF)


def _hp(events, start, t):
    v, prev, when = start, start, -99.0
    for et, nv in events:
        if t >= et:
            prev, v, when = v, nv, et
    return v, prev, when


# ---------------- 通用绘制小工具 ----------------
def _tint_blend(img, L, c, a):
    """把一层当剪影，按 a 透明度混进画面（残影用）。"""
    m = L.a
    img[m] = (img[m].astype(np.float32) * (1 - a) + c.astype(np.float32) * a).astype(np.uint8)


def _silhouette(L, c):
    out = Layer()
    out.a = L.a.copy()
    out.rgb[out.a] = c
    return out


def _img_rect(img, x0, y0, x1, y1, c):
    L = Layer(); rect(L, x0, y0, x1, y1, c); put_layer(img, L)


def _img_poly(img, pts, c):
    L = Layer(); poly(L, pts, c); put_layer(img, L)


def _heart(L, x, y, s, c):
    ell(L, x - 1.6 * s, y - 1.0 * s, 1.9 * s, 1.9 * s, c)
    ell(L, x + 1.6 * s, y - 1.0 * s, 1.9 * s, 1.9 * s, c)
    poly(L, [(x - 3.4 * s, y - 0.2 * s), (x + 3.4 * s, y - 0.2 * s), (x, y + 3.6 * s)], c)


def _speed_lines(img, cx, cy, n, r0, r1, c, seed, alpha_t=1.0):
    rng = np.random.default_rng(seed)
    L = Layer()
    for i in range(n):
        a = rng.uniform(0, 2 * math.pi)
        rr0 = rng.uniform(r0, r1 * 0.7); rr1 = rr0 + rng.uniform(r1 * 0.2, r1 * 0.5)
        seg(L, cx + math.cos(a) * rr0, cy + math.sin(a) * rr0, cx + math.cos(a) * rr1, cy + math.sin(a) * rr1, 1.0, c)
    put_layer(img, L)


def _sparks(L, x, y, age, c, life=0.25):
    if age < 0 or age > life:
        return
    r = 2 + age * 70
    for k in range(7):
        a = k * 2 * math.pi / 7 + 0.3
        cx, cy = x + math.cos(a) * r, y + math.sin(a) * r
        rect(L, int(cx), int(cy), int(cx) + 2, int(cy) + 2, c)


def _zoom(img, z, cx, cy):
    """推近：取中心附近 1/z 的区域，最近邻放大回 320×180。"""
    sw, sh = W / z, H / z
    x0 = min(max(0, cx - sw / 2), W - sw); y0 = min(max(0, cy - sh / 2), H - sh)
    ix = (x0 + (np.arange(W) + 0.5) * sw / W).astype(int).clip(0, W - 1)
    iy = (y0 + (np.arange(H) + 0.5) * sh / H).astype(int).clip(0, H - 1)
    return img[iy][:, ix]


def _bubble(img, s, cx, by):
    w = text_w(s, 1) + 10
    h = 18
    x0 = int(min(max(2, cx - w / 2), W - w - 2)); y0 = int(by - h - 6)
    _img_rect(img, x0 - 1, y0 - 1, x0 + w + 1, y0 + h + 1, INK)
    _img_rect(img, x0, y0, x0 + w, y0 + h, WHITE)
    _img_poly(img, [(cx - 3, y0 + h), (cx + 3, y0 + h), (cx, y0 + h + 5)], INK)
    _img_poly(img, [(cx - 2, y0 + h), (cx + 2, y0 + h), (cx, y0 + h + 3)], WHITE)
    text(img, s, x0 + 5, y0 + 2, INK, k=1, size=16)


# ---------------- 战斗画面（不含 HUD / 横幅） ----------------
_rng = np.random.default_rng(7)
STARS = [(int(_rng.integers(0, W)), int(_rng.integers(0, 100))) for _ in range(60)]
PENGUIN_X = [10 + i * 22 + int(_rng.integers(-3, 4)) for i in range(15)]


def _sky(img, t):
    bands = ['#1D1435', '#211940', '#262049', '#2D2459', '#352A66', '#3E3272', '#4A3F7E']
    for i, c in enumerate(bands):
        img[i * 18:(i + 1) * 18] = col(c)
    for x in range(W):
        y = int(22 + 6 * math.sin(x * 0.045 + t * 1.1) + 3 * math.sin(x * 0.12 - t * 0.6))
        for k in range(5):
            yy = y + k
            if 0 <= yy < 100 and (k + x // 3) % 2 == 0:
                img[yy, x] = col('#3FD29A') if k < 3 else col('#8E6BF2')
    for sx, sy in STARS:
        if (sx + int(t * 2)) % 37 != 0 and sy < 60:
            img[sy, sx] = col('#F4FBFF') if (sx + sy) % 3 else col('#B9D8E8')


def _mountains(img):
    L = Layer()
    poly(L, [(0, 118), (30, 92), (58, 112), (92, 84), (130, 116), (170, 90), (208, 112), (246, 86), (288, 114), (320, 96), (320, 146), (0, 146)], col('#2B3A67'))
    for p in [(92, 84, 84, 94, 100, 96), (170, 90, 162, 100, 178, 102), (246, 86, 238, 96, 254, 98), (30, 92, 23, 102, 37, 104)]:
        poly(L, [(p[0], p[1]), (p[2], p[3]), (p[4], p[5]), (p[0] + 2, p[1] + 3)], col('#F4FBFF'))
    put_layer(img, L)


def _floor(img):
    img[GROUND:] = col('#CFEFFA')
    for y in range(GROUND + 2, H, 3):
        img[y] = col('#B8E3F2')
    img[GROUND] = col('#F4FBFF'); img[GROUND + 1] = col('#7FD3F0')
    L = Layer()
    for (x0, y0, x1, y1) in [(40, 158, 62, 160), (250, 166, 276, 168), (150, 172, 170, 173), (20, 170, 36, 171)]:
        rect(L, x0, y0, x1, y1, ICE)
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
    put_layer(img, L, INK)


def _crowd(img, t, cheer):
    L = Layer()
    beat = (t * 2.0) % 1.0
    for i, px in enumerate(PENGUIN_X):
        jump = 1 if ((int(t * 2) + i) % 4 == 0 and beat < 0.35) or cheer > 0 and i % 2 == 0 else 0
        y = 136 - jump
        ell(L, px, y, 4, 6, INK)
        ell(L, px, y + 1, 2.2, 3.8, FUR)
        ell(L, px, y - 7, 3.4, 3.2, INK)
        rect(L, px + 2, y - 7, px + 4, y - 6, GOLD)
    put_layer(img, L)


def battle(t, ui=True):
    """画出战斗场景。ui=False 时不画血条、横幅、气泡（给镜头切入取景用）。"""
    img = np.zeros((H, W, 3), np.uint8)
    _sky(img, t); _mountains(img); _floor(img)
    cheer = 1 if any(abs(t - h[0]) < 0.4 for h in TL.HITS) else 0
    _crowd(img, t, cheer); _crates(img)

    bp, bname, bact = bear_pose(t)
    cp, cname, cact = cat_pose(t)
    # 闪白只看真实时间：命中后 0.07 秒，不随命中停顿拖长
    bp['flash'] = _flash_on(t, 'bear')
    cp['flash'] = _flash_on(t, 'cat')
    b_ox = BEAR_X + bp.get('x', 0)
    c_ox = CAT_X + cp.get('x', 0)
    c_oy = GROUND + cp.get('bob', 0)
    if cname == 'pop':
        k_ = min(1.0, max(0.0, (t - 27.9) / 0.5))
        c_oy = 230 - 40 * (1 - (1 - k_) ** 3) if t >= 27.9 else c_oy
        c_ox += 40
    cat_visible = not (TL.CAT_HIDE_AT <= t < 27.9)

    # 阴影
    sh = Layer()
    ell(sh, b_ox, GROUND + 1, 14, 2.5, col('#9FD3E6'))
    ell(sh, c_ox, GROUND + 1, 14, 2.5, col('#9FD3E6'))
    put_layer(img, sh)

    # 残影（冲刺 / 闪避）：取动作前两个采样时刻，剪影半透明
    tp = ptime(t)
    if bact.get('ghost'):
        for lag, a in ((0.10, 0.35), (0.20, 0.2)):
            gp, _, _ = _active(TL.BEAR_SCHED, TL.BEAR_ACT, tp - lag, BEAR_DEF)
            gl = Layer(); draw_bear(gl, Xf(BEAR_X + gp.get('x', 0), GROUND + gp.get('bob', 0), 1, 0.0), gp)
            _tint_blend_layer(img, gl, ICE, a)
    if cact.get('ghost') and cat_visible:
        for lag, a in ((0.10, 0.35), (0.20, 0.2)):
            gp, _, _ = _active(TL.CAT_SCHED, TL.CAT_ACT, tp - lag, CAT_DEF)
            gl = Layer(); draw_cat(gl, Xf(CAT_X + gp.get('x', 0), GROUND + gp.get('bob', 0), -1, 0.0), gp)
            _tint_blend_layer(img, gl, PINK_L, a)

    # 熊
    bl = Layer()
    draw_bear(bl, Xf(b_ox, GROUND + bp.get('bob', 0), 1, bp.get('rot', 0.0)), bp)
    put_layer(img, bl, INK)
    # 猫
    if cat_visible:
        cl = Layer()
        draw_cat(cl, Xf(c_ox, c_oy, -1, cp.get('rot', 0.0)), cp)
        put_layer(img, cl, INK)

    fx = Layer()
    _effects(fx, img, t, bp, cp)
    put_layer(img, fx, INK)

    if ui:
        _hud(img, t)
        _banners(img, t)
        for a, b_, who, s in TL.BUBBLES:
            if a <= t < b_:
                cx = b_ox if who == 'bear' else c_ox
                if who == 'cat' and cname == 'pop':
                    cx = c_ox
                by = (GROUND - 66) if who == 'bear' else (c_oy - 70)
                _bubble(img, s, cx, by)
    return img


def _flash_on(t, who):
    return any(0 <= t - h[0] < 0.07 for h in TL.HITS if h[1] == who)


def _tint_blend_layer(img, L, c, a):
    m = L.a
    img[m] = (img[m].astype(np.float32) * (1 - a) + c.astype(np.float32) * a).astype(np.uint8)


def _effects(fx, img, t, bp, cp):
    """招式特效：斩击弧、霜龙、冰刺、鱼海漩涡、鱼骨弹、爱心鱼雷、月牙斩、地裂、火花。"""
    bsx, bsy = BEAR_X + 8, GROUND - 37          # 熊的肩膀
    # 斩击弧（熊）
    for st, a0, a1, rad in ((4.50, 1.1, -1.1, 40), (4.90, -1.1, 1.1, 40), (5.30, 1.2, -1.5, 40),
                            (9.45, 1.2, -0.6, 42), (9.80, -0.6, 1.0, 42), (10.10, 1.0, -1.0, 42), (19.30, 1.0, -0.8, 40)):
        age = t - st
        if 0 <= age <= 0.22:
            k = age / 0.22
            arc_band(fx, bsx, bsy, rad - 1.5, rad + 1.5, min(a0, a0 + (a1 - a0) * k), max(a0, a0 + (a1 - a0) * k), ICE_HI)
    # 月牙斩（熊，大弧）
    age = t - 21.20
    if 0.1 <= age <= 0.7:
        grow = min(1.0, (age - 0.1) / 0.25)
        fade = max(0.0, 1 - max(0, age - 0.4) / 0.3)
        if fade > 0:
            arc_band(fx, bsx, bsy, 50 * grow - 3, 50 * grow + 1, -2.6, 0.6, ICE if fade > 0.5 else ICE_D)
            arc_band(fx, bsx, bsy, 46 * grow - 2, 46 * grow - 0.5, -2.4, 0.4, ICE_HI)
    # 冲刺速度线（熊 4.2 / 16.0）
    for st in (4.20, 16.00):
        age = t - st
        if 0 <= age <= 0.3:
            for k in range(4):
                y = bsy + 4 + k * 7
                x1 = BEAR_X + 24 + age * 220
                seg(fx, BEAR_X - 14 - age * 10, y, x1 - 40, y, 1.2, ICE_HI)
    # 霜龙斩（熊）：蓄力冰刺 + 冰龙飞出
    age = t - 7.20
    if 0 <= age <= 1.2:
        for i in range(6):
            x = 112 + i * 9
            hgt = 16 * min(1.0, max(0.0, (age - i * 0.05) / 0.35))
            if hgt > 0:
                poly(fx, [(x - 3, GROUND), (x, GROUND - hgt), (x + 3, GROUND)], ICE)
                poly(fx, [(x - 1, GROUND), (x, GROUND - hgt * 0.8), (x + 1, GROUND)], ICE_HI)
    age = t - 8.35
    if 0 <= age <= 0.9:
        p = min(1.0, age / 0.5)
        hx = 120 + p * 100
        hy = 112 + math.sin(p * 4.0) * 3
        for i in range(10):
            bx = hx - i * 6.5
            by = hy + math.sin(i * 0.8 - p * 6.0) * 3.5
            r = max(1.5, 4.2 - i * 0.3)
            ell(fx, bx, by, r, r, ICE)
            if i < 4:
                ell(fx, bx, by - 1, r * 0.5, r * 0.5, ICE_HI)
        ell(fx, hx + 2, hy - 1, 5.5, 4.2, ICE)
        ell(fx, hx + 3, hy - 2, 1.3, 1.3, INK)
        poly(fx, [(hx + 6, hy - 6), (hx + 12, hy - 9), (hx + 9, hy - 1)], ICE_HI)
    # 熊的跳斩 / 地裂
    age = t - 10.40
    if 0 <= age <= 0.5:
        for d in (-1, 1):
            for k in range(3):
                x_end = BEAR_X + 30 + d * (10 + k * 18 + age * 60)
                seg(fx, BEAR_X + 30, GROUND + 2, x_end, GROUND + 3 + k, 1.0, WHITE)
        for k in range(6):
            px = BEAR_X + 30 + (k - 3) * (4 + age * 40)
            py = GROUND - (age * 50) + k * 2
            rect(fx, int(px), int(py), int(px) + 2, int(py) + 2, ICE_HI)
    # 熊月牙 / 最终突刺（22.25）：冰光直线
    age = t - 22.25
    if 0 <= age <= 0.25:
        seg(fx, BEAR_X + 40, 112, BEAR_X + 40 + age * 500, 112, 2.0, ICE_HI)
        seg(fx, BEAR_X + 40, 116, BEAR_X + 40 + age * 500, 116, 1.0, ICE)

    # 猫：吞鱼蓄力（11.2–13.4）鱼绕嘴转；13.4 起鱼海喷向熊
    mx, my = CAT_X - 12, 110
    if 11.2 <= t < 13.4:
        ph = (t - 11.2)
        for k in range(5):
            a = ph * 7.0 + k * (2 * math.pi / 5)
            r = 9 - ph * 1.2
            _fishsprite(fx, Xf(0, 0), mx + math.cos(a) * r, my + math.sin(a) * r * 0.5, math.cos(a + 1.57), math.sin(a + 1.57) * 0.5, 0.9)
    if 13.4 <= t < 14.3:
        p = (t - 13.4) / 0.9
        for k in range(7):
            q = min(1.0, max(0.0, p - k * 0.04))
            x = mx + (170 - mx) * q
            y = my + math.sin(q * math.pi) * -18 + math.sin(k + q * 8) * 4
            _fishsprite(fx, Xf(0, 0), x, y, 170 - mx, 0, 1.0)
        # 漩涡圈
        arc_band(fx, mx, my, 12, 14, 0, 2 * math.pi, PINK_L)
    # 猫：三连鱼骨弹（6.5、15.6）
    for st in (6.50, 15.60):
        for k in range(3):
            t0 = st + k * 0.12 if st == 6.50 else st + k * 0.06
            age = t - t0
            if 0 <= age <= 0.42:
                p = age / 0.42
                x = CAT_X - 10 - p * (CAT_X - BEAR_X - 40)
                y = 108 - math.sin(p * math.pi) * 14 + k * 4
                _fishsprite(fx, Xf(0, 0), x, y, -1, 0, 1.2)
    # 猫：爱心鱼雷（17.30）
    age = t - 17.30
    if 0 <= age <= 0.6:
        for k in range(4):
            p = min(1.0, max(0.0, (age - k * 0.06) / 0.4))
            x = CAT_X - 10 - p * (CAT_X - BEAR_X - 30)
            y = 104 - math.sin(p * math.pi) * 16 + k * 2
            _heart(fx, x, y, 1.6, PINK_D if k % 2 else PINK_L)
    # 猫：闪避残影（16.8）已由残影处理

    # 命中：火花 / 速度线 / 闪光
    hits = [(h[0], h[1], h[3]) for h in TL.HITS]
    for ht, who, _d in hits:
        x = BEAR_X + 40 if who == 'cat' else CAT_X - 40
        y = 108
        if ht in (14.20, 20.00):
            x = 170
        if ht == 22.90:
            x = CAT_X - 6
        _sparks(fx, x, y, t - ht, WHITE if ht in (14.20, 20.00) else FISH_HI)
        if ht == 22.90:
            _sparks(fx, x, y + 10, t - ht, ICE_HI)
    for ht, _w, _hp_, _d, fl, _sh, rays in TL.HITS:
        if rays and 0 <= t - ht < 0.12:
            _speed_lines(img, 170, 110, 10, 30, 150, WHITE, int(ht * 100))


def _hud(img, t):
    bv, bprev, bwhen = _hp(TL.BEAR_HP_EV, 100, t)
    cv, cprev, cwhen = _hp(TL.CAT_HP_EV, 100, t)
    _bar(img, 14, 134, 12, bv, bprev, bwhen if t - bwhen < 0.6 else None, ICE)
    _bar(img, 186, 306, 12, cv, cprev, cwhen if t - cwhen < 0.6 else None, ORG)
    text(img, '1P', 14, 19, WHITE, k=1, size=16)
    for ht, n in TL.COMBO:
        if ht <= t < ht + 1.0:
            text(img, f'{n} HIT', 14, 28, GOLD, k=2, size=16)
    if t < 25.9:
        timer = max(4, 99 - max(0.0, min(t, 21.0) - 2.5) * 5.1)
        text(img, f'{int(timer):02d}', 152, 6, GOLD, k=2, size=16, align='left')


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


def _banners(img, t):
    def banner(s, t0, t1, c, k, y=72):
        if t0 <= t < t1:
            bob = 0 if t - t0 > 0.12 else (1 - (t - t0) / 0.12) * 8
            text(img, s, 160, y - bob, c, k=k, size=16, align='center', shadow=INK)
    if 2.4 <= t < 3.0:
        banner('ROUND 1', 2.4, 3.0, WHITE, 4)
    if 3.0 <= t < 3.6:
        _speed_lines(img, 160, 90, 14, 30, 170, WHITE, 3)
        banner('FIGHT!', 3.0, 3.6, GOLD, 5)
    banner('K.O.', 23.2, 25.2, RED, 5, y=34)
    if 26.2 <= t < 29.9:
        text(img, 'WINNER', 160, 18, GOLD, k=3, size=16, align='center', shadow=INK)
    if 27.6 <= t < 30.0:
        text(img, 'CONTINUE?', 160, 98, WHITE, k=1, size=16, align='center')
        d = '9' if t < 28.1 else '8'
        text(img, d, 160 + text_w('CONTINUE?', 1) // 2 + 10, 94, RED, k=2, size=16)


# ---------------- 镜头切入 ----------------
def cut_in(img, t, who, name, t0, t1):
    p = (t - t0) / (t1 - t0)
    # 背景：深色 + 放射速度线
    img[:] = DARK
    _speed_lines(img, 160, 90, 26, 20, 200, ICE if who == 'bear' else PINK_L, int(t0 * 10), 1.0)
    # 取景：战斗中角色那一刻的画面，裁成角色特写
    snap = battle(t0 + 0.22, ui=False)
    ax = (BEAR_X if who == 'bear' else CAT_X) + (bear_pose(t0 + 0.22)[0].get('x', 0) if who == 'bear' else cat_pose(t0 + 0.22)[0].get('x', 0))
    x0, x1 = int(ax - 30), int(ax + 34)
    y0, y1 = 52, 146
    crop = snap[y0:y1, max(0, x0):min(W, x1)]
    big = np.repeat(np.repeat(crop, 2, 0), 2, 1)
    ph, pw = big.shape[0], big.shape[1]
    slide = int((1 - min(1.0, p / 0.25)) ** 2 * 170) * (1 if who == 'bear' else -1)
    px0 = 160 - pw // 2 + slide
    py0 = 0
    yy0, xx0 = max(0, py0), max(0, px0)
    sub = big[(yy0 - py0):(yy0 - py0) + min(ph, H - yy0), (xx0 - px0):(xx0 - px0) + min(pw, W - xx0)]
    if sub.size:
        h_, w_ = sub.shape[:2]
        img[yy0:yy0 + h_, xx0:xx0 + w_] = sub
    # 招式名
    if p > 0.2:
        text(img, name, 160 + (1 if who == 'bear' else -1), 150, WHITE, k=2, size=16, align='center', shadow=INK)
    return img


# ---------------- 整帧 ----------------
def _zoom_amount(t):
    """命中瞬间的镜头推近：返回 (倍数, 中心x, 中心y)。"""
    z, cx, cy = 1.0, 160, 90
    for ht, z0, dur in ((8.80, 1.08, 0.15), (14.20, 1.12, 0.18), (20.00, 1.16, 0.22), (22.90, 1.10, 0.2)):
        if ht <= t < ht + dur:
            z = z0; cx, cy = (170, 110) if ht != 8.8 else (150, 110)
    return z, cx, cy


def _title(img, t):
    img[:] = DARK
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
    return img


def render_frame(t):
    if t < 2.5:
        img = _title(np.zeros((H, W, 3), np.uint8), t)
        return img
    cut = None
    for t0, t1, who, name in TL.CUTINS:
        if t0 <= t < t1:
            cut = (t0, t1, who, name)
    if cut:
        img = np.zeros((H, W, 3), np.uint8)
        cut_in(img, t, cut[2], cut[3], cut[0], cut[1])
    else:
        img = battle(t, ui=True)
    # 反色闪（命中关键帧，每次 1 帧）
    for ht, _w, _hp_, _d, fl, _sh, _r in TL.HITS:
        if fl and 0 <= t - ht < 1 / 30:
            img = 255 - img
    # 推近（命中）
    z, cx, cy = _zoom_amount(t)
    if z > 1.0:
        img = _zoom(img, z, cx, cy)
    # 震屏
    for ht, _w, _hp_, _d, _fl, sh, _r in TL.HITS:
        if sh and 0 <= t - ht < 0.12:
            amp = 2
            img = np.roll(img, (int(round(amp * math.sin(t * 90))), int(round(amp * math.cos(t * 70)))), axis=(0, 1))
            break
    return img


def _tint_blend_dummy():
    pass
