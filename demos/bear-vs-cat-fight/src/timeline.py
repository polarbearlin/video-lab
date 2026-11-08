"""唯一的时间表：动作、命中、停顿、镜头切入（cut-in）、台词气泡、音效。画面和声音都读这里。"""

GROUND = 146
BEAR_X, CAT_X = 96, 226

# ---------- 动作关键帧（局部时间，秒；数值线性插值，文字/布尔保持） ----------
BEAR_ACT = {
    'idle':   dict(dur=1.0, loop=True, keys=[(0, {'arm': -0.2, 'bob': 0}), (0.5, {'arm': -0.3, 'bob': -1}), (1.0, {'arm': -0.2, 'bob': 0})]),
    'draw':   dict(dur=0.3, keys=[(0, {'arm': 0.9, 'arm_up': False, 'lean': 0}), (0.12, {'arm': -1.1, 'arm_up': False, 'lean': -2}), (0.3, {'arm': -1.57, 'arm_up': True, 'lean': 0})]),
    'dash':   dict(dur=0.3, ghost=True, keys=[(0, {'x': 0, 'arm': -0.6, 'lean': 0}), (0.12, {'x': 36, 'arm': -0.4, 'lean': 4}), (0.3, {'x': 56, 'arm': 0.6, 'lean': 4})]),
    'slash1': dict(dur=0.3, keys=[(0, {'arm': 1.1, 'lean': 0}), (0.12, {'arm': -0.7, 'lean': 4}), (0.3, {'arm': -1.1, 'lean': 4})]),
    'slash2': dict(dur=0.3, keys=[(0, {'arm': -1.1, 'lean': 4}), (0.12, {'arm': 0.2, 'lean': 4}), (0.3, {'arm': 1.1, 'lean': 2})]),
    'upper':  dict(dur=0.35, keys=[(0, {'arm': 1.2, 'bob': 0, 'lean': 0}), (0.15, {'arm': -1.57, 'bob': -10, 'lean': -2}), (0.35, {'arm': -1.57, 'bob': -4, 'lean': 0})]),
    'guard':  dict(dur=0.3, keys=[(0, {'arm': -0.2}), (0.06, {'arm': -1.5, 'lean': -2}), (0.25, {'arm': -1.5, 'lean': -2}), (0.3, {'arm': -0.2, 'lean': 0})]),
    'charge': dict(dur=1.2, keys=[(0, {'arm': -1.2, 'lean': -1, 'eyes': 'squint', 'arm_up': False}), (0.6, {'arm': -1.57, 'lean': -2, 'eyes': 'squint', 'arm_up': True}),
                                  (1.2, {'arm': -1.57, 'lean': -2, 'eyes': 'squint', 'arm_up': True})]),
    'thrust': dict(dur=0.35, keys=[(0, {'arm': -1.57, 'arm_up': True, 'lean': -2, 'eyes': 'open'}), (0.1, {'arm': -0.1, 'arm_up': False, 'lean': 6}), (0.35, {'arm': -0.2, 'lean': 0})]),
    'jump':   dict(dur=0.5, keys=[(0, {'bob': 0, 'arm': -0.4, 'x': 0}), (0.25, {'bob': -26, 'arm': -1.2, 'x': 8}), (0.5, {'bob': -28, 'arm': -1.0, 'x': 8})]),
    'air_slash': dict(dur=0.3, keys=[(0, {'arm': 1.2, 'bob': -26, 'lean': 0}), (0.15, {'arm': -0.6, 'bob': -26, 'lean': 4}), (0.3, {'arm': -1.2, 'bob': -26, 'lean': 4})]),
    'slam':   dict(dur=0.45, keys=[(0, {'bob': -28, 'arm': 1.5, 'lean': 6}), (0.2, {'bob': 0, 'arm': 1.5, 'lean': 6}), (0.45, {'bob': 0, 'arm': 0.3, 'lean': 0})]),
    'hurt':   dict(dur=0.4, keys=[(0, {'lean': -5, 'x': -6, 'eyes': 'squint', 'flash': True}), (0.07, {'flash': False}), (0.2, {'lean': -3, 'x': -3}), (0.4, {'lean': 0, 'x': 0, 'eyes': 'open'})]),
    'moon':   dict(dur=0.9, keys=[(0, {'arm': 1.2, 'arm_up': False, 'lean': 0}), (0.35, {'arm': -1.57, 'arm_up': True, 'lean': -3}), (0.6, {'arm': -1.57, 'arm_up': True, 'lean': -3}), (0.9, {'arm': 0.6, 'arm_up': False, 'lean': 5})]),
    'win':    dict(dur=1.0, loop=True, keys=[(0, {'arm_up': True, 'arm': -1.57, 'bob': 0}), (0.25, {'arm_up': True, 'arm': -1.57, 'bob': -3}), (0.5, {'arm_up': True, 'arm': -1.57, 'bob': 0}), (0.75, {'arm_up': True, 'arm': -1.57, 'bob': -3}), (1.0, {'arm_up': True, 'arm': -1.57, 'bob': 0})]),
}

CAT_ACT = {
    'idle':    dict(dur=1.0, loop=True, keys=[(0, {'bob': 0, 'tail': 0}), (0.5, {'bob': -1, 'tail': 2}), (1.0, {'bob': 0, 'tail': 0})]),
    'taunt':   dict(dur=0.9, keys=[(0, {'arms_up': False, 'fish': True, 'eyes': 'open', 'mouth': 0, 'head_dx': 0}),
                                   (0.15, {'arms_up': True, 'fish': False, 'eyes': 'half', 'mouth': 3, 'head_dx': 1, 'tail': 2}),
                                   (0.8, {'arms_up': True, 'fish': False, 'eyes': 'happy', 'mouth': 3, 'head_dx': 1, 'tail': -2}),
                                   (0.9, {'arms_up': False, 'fish': True, 'eyes': 'open', 'mouth': 0, 'head_dx': 0})]),
    'throw3':  dict(dur=0.5, keys=[(0, {'arm': 0.3, 'fish': True, 'lean': 0}), (0.1, {'arm': -1.2, 'fish': True, 'lean': -2}),
                                   (0.2, {'arm': 0.8, 'fish': False, 'lean': 3}), (0.5, {'arm': 0.3, 'fish': True, 'lean': 0})]),
    'dodge':   dict(dur=0.35, ghost=True, keys=[(0, {'x': 0, 'lean': 0}), (0.1, {'x': 20, 'lean': -4}), (0.35, {'x': 26, 'lean': 0})]),
    'charge':  dict(dur=2.2, keys=[(0, {'mouth': 0, 'cheek': 0.0, 'arm': 0.3, 'fish': True, 'eyes': 'open', 'bob': 0}),
                                   (0.2, {'mouth': 1, 'cheek': 0.1, 'arm': -0.9, 'bob': -1}), (0.4, {'mouth': 2, 'cheek': 0.2, 'arm': -0.9, 'bob': 0}),
                                   (0.6, {'mouth': 1, 'cheek': 0.3, 'arm': -0.9, 'bob': -1}), (0.8, {'mouth': 2, 'cheek': 0.4, 'arm': -0.9, 'bob': 0, 'eyes': 'squeeze'}),
                                   (1.0, {'mouth': 1, 'cheek': 0.5, 'arm': -0.9, 'bob': -1}), (1.2, {'mouth': 2, 'cheek': 0.6, 'arm': -0.9, 'bob': 0}),
                                   (1.4, {'mouth': 1, 'cheek': 0.7, 'arm': -0.9, 'bob': -1}), (1.6, {'mouth': 2, 'cheek': 0.8, 'arm': -0.9, 'bob': 0}),
                                   (1.8, {'mouth': 1, 'cheek': 0.9, 'arm': -0.9, 'bob': -1}), (2.0, {'mouth': 2, 'cheek': 1.0, 'arm': -0.9, 'bob': 0}),
                                   (2.2, {'mouth': 2, 'cheek': 1.0, 'arm': -0.9, 'bob': 0})]),
    'vortex':  dict(dur=0.4, keys=[(0, {'mouth': 2, 'cheek': 1.0, 'eyes': 'squeeze', 'fish': False, 'arm': 0.6}), (0.4, {'mouth': 0, 'cheek': 0.0, 'eyes': 'open', 'fish': True, 'arm': 0.3})]),
    'hurt':    dict(dur=0.4, keys=[(0, {'lean': 5, 'x': 6, 'eyes': 'squeeze', 'flash': True}), (0.07, {'flash': False}), (0.2, {'lean': 3, 'x': 3}), (0.4, {'lean': 0, 'x': 0, 'eyes': 'open'})]),
    'launch':  dict(dur=0.9, keys=[(0, {'bob': 0, 'rot': 0.0, 'lean': 0, 'eyes': 'squeeze', 'flash': True}), (0.07, {'flash': False}),
                                   (0.3, {'bob': -48, 'rot': -0.7, 'x': 14}), (0.6, {'bob': -36, 'rot': -0.4, 'x': 20}), (0.9, {'bob': 0, 'rot': 0.0, 'x': 24, 'eyes': 'open'})]),
    'heart':   dict(dur=0.5, keys=[(0, {'arm': -0.8, 'arms_up': False, 'fish': False}), (0.15, {'arm': 0.2, 'arms_up': False, 'fish': False, 'eyes': 'happy'}), (0.5, {'arm': 0.3, 'fish': True, 'eyes': 'open'})]),
    'fan':     dict(dur=0.5, keys=[(0, {'arm': -1.0, 'fish': True}), (0.12, {'arm': 0.3, 'fish': False}), (0.5, {'arm': 0.3, 'fish': True})]),
    'jump':    dict(dur=0.5, keys=[(0, {'bob': 0, 'x': 0}), (0.25, {'bob': -26, 'x': -8}), (0.5, {'bob': -26, 'x': -8})]),
    'ko':      dict(dur=6.0, keys=[(0, {'rot': 0.0, 'bob': 0, 'eyes': 'squeeze', 'fish': True, 'arm': -0.6, 'mouth': 0}),
                                   (0.35, {'rot': -1.45, 'bob': 2, 'x': -6}), (6.0, {'rot': -1.45, 'bob': 2, 'x': -6})]),
    'pop':     dict(dur=6.0, keys=[(0, {'bob': 62, 'mouth': 2, 'arm': -1.2, 'eyes': 'happy', 'fish': True, 'cheek': 0.0}),
                                   (0.5, {'bob': 0, 'mouth': 2, 'arm': -1.2, 'eyes': 'happy', 'fish': True}), (6.0, {'bob': 0, 'mouth': 2, 'arm': -1.2, 'eyes': 'happy', 'fish': True})]),
}

# (开始时间, 动作名)。同一时刻取"开始最晚、仍在进行中"的动作。
BEAR_SCHED = [
    (3.00, 'draw'), (4.20, 'dash'), (4.50, 'slash1'), (4.90, 'slash2'), (5.30, 'upper'),
    (6.45, 'guard'), (7.20, 'charge'), (8.35, 'thrust'),
    (8.95, 'jump'), (9.45, 'air_slash'), (9.80, 'air_slash'), (10.10, 'air_slash'), (10.30, 'slam'),
    (13.80, 'guard'), (15.60, 'guard'), (16.00, 'dash'), (16.25, 'slash1'),
    (18.40, 'jump'), (19.30, 'air_slash'), (20.00, 'hurt'),
    (21.20, 'moon'), (22.25, 'thrust'),
    (25.40, 'win'),
]
CAT_SCHED = [
    (3.30, 'taunt'),
    (4.55, 'hurt'), (4.95, 'hurt'), (5.35, 'launch'),
    (6.50, 'throw3'),
    (8.80, 'launch'),
    (9.40, 'hurt'), (9.70, 'hurt'), (10.00, 'hurt'),
    (10.40, 'launch'),
    (11.20, 'charge'),
    (13.40, 'vortex'),
    (14.20, 'hurt'),
    (15.60, 'fan'), (16.20, 'hurt'), (16.80, 'dodge'), (17.30, 'heart'),
    (19.30, 'jump'), (20.00, 'hurt'),
    (22.90, 'ko'),
    (27.90, 'pop'),
]
CAT_HIDE_AT = 27.6          # 27.6 猫离场，27.9 从底边探头

# ---------- 命中：(时间, 受击方, 扣血后血量, 停顿秒数, 反色闪, 震屏, 放射速度线) ----------
HITS = [
    (4.55, 'cat', 96, 0.10, False, False, False),
    (4.95, 'cat', 92, 0.10, False, False, False),
    (5.35, 'cat', 84, 0.14, False, True, False),
    (6.60, 'bear', 100, 0.06, False, False, False),     # 格挡，血量不变
    (8.80, 'cat', 48, 0.20, True, True, True),
    (9.40, 'cat', 44, 0.08, False, False, False),
    (9.70, 'cat', 40, 0.08, False, False, False),
    (10.00, 'cat', 34, 0.08, False, False, False),
    (10.40, 'cat', 26, 0.18, True, True, False),
    (14.20, 'bear', 66, 0.25, True, True, True),
    (14.20, 'cat', 18, 0.25, True, True, True),
    (16.20, 'cat', 12, 0.15, False, True, False),
    (17.90, 'bear', 58, 0.10, False, False, False),
    (20.00, 'bear', 50, 0.30, True, True, True),
    (20.00, 'cat', 8, 0.30, True, True, True),
    (22.90, 'cat', 0, 0.25, True, True, True),
]
BEAR_HP_EV = [(14.20, 66), (17.90, 58), (20.00, 50)]
CAT_HP_EV = [(4.55, 96), (4.95, 92), (5.35, 84), (8.80, 48), (9.40, 44), (9.70, 40), (10.00, 34), (10.40, 26),
             (14.20, 18), (16.20, 12), (20.00, 8), (22.90, 0)]
COMBO = [(4.55, 1), (4.95, 2), (5.35, 3)]    # 熊的连击数

# ---------- 镜头切入（cut-in）：(开始, 结束, 谁, 招式名) ----------
CUTINS = [
    (7.75, 8.25, 'bear', '霜龙斩'),
    (12.15, 12.65, 'cat', '鱼海漩涡'),
    (21.20, 21.70, 'bear', '月牙斩'),
    (25.40, 26.00, 'bear', '北极熊·胜'),
]

# ---------- 台词气泡：(开始, 结束, 谁, 文字) ----------
BUBBLES = [
    (3.30, 4.50, 'cat', '来吧～'),
    (7.20, 7.90, 'bear', '……接好了。'),
    (11.20, 12.00, 'cat', '这个可是认真的哦！'),
    (16.40, 17.20, 'cat', '哼！讨厌！'),
    (23.00, 23.90, 'cat', '咕……'),
    (26.00, 27.80, 'bear', '鱼，归我了。'),
    (28.00, 29.70, 'cat', '咕噜～'),
]

# ---------- 音效：(时间, 名字, 音量) ----------
SFX = [
    (0.20, 'ding', 0.6), (0.00, 'title', 0.7),
    (2.40, 'blip', 0.6), (2.80, 'blip', 0.6), (3.00, 'blip_hi', 0.7), (3.00, 'draw', 0.6),
    (3.30, 'boing', 0.4), (4.20, 'dash', 0.5),
    (4.55, 'punch', 0.9), (4.95, 'punch', 0.9), (5.35, 'upper', 0.9),
    (6.45, 'swish', 0.3), (6.50, 'fishbone', 0.5), (6.62, 'fishbone', 0.5), (6.74, 'fishbone', 0.5),
    (6.60, 'clang', 0.7),
    (7.20, 'charge', 0.35), (7.75, 'cutin', 0.8),
    (8.35, 'dragon', 0.9), (8.80, 'heavy', 1.0),
    (9.40, 'punch', 0.7), (9.70, 'punch', 0.7), (10.00, 'punch', 0.7), (10.40, 'slam', 1.0),
    (11.20, 'gulp', 0.5), (11.20, 'charge', 0.3), (12.15, 'cutin', 0.8),
    (13.20, 'chomp', 0.5), (13.40, 'vortex', 0.8),
    (14.20, 'heavy', 1.0), (14.20, 'clang', 0.6),
    (15.60, 'fishbone', 0.5), (15.66, 'fishbone', 0.5), (15.72, 'fishbone', 0.5),
    (16.00, 'dash', 0.5), (16.20, 'punch', 0.9), (16.80, 'dash', 0.4),
    (17.30, 'boing', 0.5), (17.90, 'punch', 0.5),
    (19.30, 'swish', 0.5), (20.00, 'heavy', 1.0), (20.00, 'clang', 0.7),
    (21.20, 'cutin', 0.8), (22.25, 'swish', 0.6), (22.90, 'heavy', 1.0), (23.00, 'chime', 0.5),
    (25.40, 'cutin', 0.8), (26.00, 'victory', 0.9),
    (27.60, 'blip', 0.5), (27.90, 'boing', 0.5), (28.50, 'chomp', 0.8),
]

# 命中停顿：(开始, 时长)。停顿期间两个角色的姿势冻结，特效照常走。
HITSTOP = [(t, d) for (t, _w, _h, d, _f, _s, _r) in HITS if d > 0]


def ptime(t):
    """姿势用的时间：命中停顿期间冻结在停顿开始的那一刻。"""
    for t0, d in HITSTOP:
        if t0 <= t < t0 + d:
            return t0
    return t
