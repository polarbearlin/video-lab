"""《大肥鱼 · 自我介绍》v10 · 前 30 秒总计划（暗转亮 · 发布会舞台）。ui / scene / audio / compose 都只读这一个文件。
128 BPM。0–4.6 秒在暗色房间（聊天、贴纸、钻进传送门），白光一闪，之后在明亮的发布会舞台上一镜到底。"""
FPS, DUR, BPM = 30, 30.0, 128
BEAT = 60 / BPM
N = int(DUR * FPS)
fr = lambda t: int(round(t * FPS)) + 1

# ---------------- 暗场：聊天平板（放在 x=-40，和舞台互不干扰）
DARK_C = (-40.0, 0.0)
TAB = (2.6, 2.6 * 1024 / 1536)
MSG = dict(text='大肥鱼，介绍下你自己？', type=(0.15, 0.8), send=0.9)   # 主人：只有这一句逐字打（0.65 秒）
REPLY_T = 1.3                                                             # 她：贴纸 + "好嘞！"
STICKER = dict(px=(530, 345, 700, 560), peel=(1.9, 2.5), spin=(2.5, 3.2), swap=2.68)
PORTAL_OPEN = (3.2, 3.55)        # 屏幕上开传送门
DIVE = (3.6, 4.15)               # 她扑进去
FLASH = (4.25, 4.75)             # 镜头钻进门里 → 白光 → 舞台
CUT = 4.6                        # 换到舞台（白光最亮的一帧）

# ---------------- 舞台布局（同一个舞台，从左到右）
DEV = {
    'logo':  dict(c=(0.6, 0.0), size=(2.0, 2.0 * 1600 / 2400)),
    'store': dict(c=(3.75, 0.15), size=(1.2, 1.2 * 1536 / 1024)),
    'stock': dict(c=(6.95, 0.25), size=(2.6, 2.6 * 1600 / 2400)),
    'chat':  dict(c=(10.35, 0.1), size=(2.6, 2.6 * 1024 / 1536)),
}
def at(dev, u, v, z=0.):
    d = DEV[dev]; w, h = d['size']; cx, cy = d['c']; return (cx + (u - .5) * w, cy + (.5 - v) * h, z)
PORTAL = (-1.45, 0.35, 1.0)      # 舞台上空的出口传送门（立着）
WHALE = (1.45, 1.3)              # 立体鲸鱼 logo
NUMBER = (6.55, 1.55)            # "5890 亿美元"立体大字

# ---------------- 台词（气泡）：(出现, 消失, 图片名, 跟谁) —— 'her' 跟着她头顶，其他是固定位置
LINES = [
    (6.85, 8.5, 'b_intro', 'her'),         # 本鲸，DeepSeek 家的 AI！（章节大标题收起后再说）
    (9.2, 10.6, 'b_whale', 'her'),         # 是鲸！
    (13.45, 14.6, 'b_fire_a', 'her'),      # 何止！
    (21.2, 23.8, 'b_busy_q', 'master'),    # 主人：那服务器怎么老繁忙？
    (25.9, 29.6, 'b_busy_a', 'her'),       # 人太多啦～
]
CH = [dict(name='我是谁', t=4.95), dict(name='我火过', t=11.45)]   # 大号标题停 4 拍，不和台词气泡同时出现

# ---------------- 第 1 步：网友评论卡飞进来 → 被她踢飞；名字牌砸下来把她砸扁
CARD_IN = (7.95, 8.4); KICK = 9.25; CARD_OUT = (9.25, 10.15)
PLATE = (10.55, 10.8)            # 名字牌从天而降，砸在她头上
SQUASH = (10.8, 11.5)            # 被砸扁，然后弹回来

# ---------------- 第 2 步：主人的消息飞来当冲浪板 → 冲到 App Store → 电梯顶到第 1 → 被顶飞 → 绿柱变滑梯 → 滑下去
BOARD_IN = (11.9, 12.6)          # "听说你火过？"气泡从右边飞来
SURF = (12.9, 14.35)             # 冲浪：从 logo 平板到 App Store
LIFT = [15.0 + i * .4 for i in range(5)]          # DeepSeek 从第 6 名一格格顶到第 1 名
ICON_POP = 17.0; CONFETTI = 17.0
LAUNCH = 17.55; SLIDE_LAND = 18.45               # 被顶飞，翻一圈落到滑梯顶上
BAR_RISE = (17.55, 17.95); BAR_FALL = (18.05, 18.35)   # 绿柱从屏幕里竖起来 → 倒下变成滑梯
NUM_DROP = (18.35, 18.65)                        # "5890 亿美元"砸到台上
SLIDE_END = 20.8
# ---------------- 第 2 步结尾：服务器繁忙
RAIN = (22.75, 24.3)             # "你好"从天上倒下来，把她埋了
POPUP_DROP = (24.35, 24.6)       # "服务器繁忙"弹窗砸在顶上
POP_OUT = 25.6                   # 她顶着弹窗钻出来
REVEAL = 26.6                    # 镜头升高拉远，整个舞台全景

# ---------------- 她的落点：(落地秒, 设备或 None, u, v, 选项)。舞台部分
HOPS = [
    (5.6, 'logo', .68, .6, dict(air=1.0, h=.9, from_portal=1, spin=1)),   # 从传送门飞出来，长抛物线落到 logo 平板上
    (8.7, 'logo', .5, .62, dict(air=.26, h=.08)),                         # 两步小跳冲向评论卡
    (9.0, 'logo', .36, .62, dict(air=.26, h=.08)),
    (12.9, 'logo', .25, .6, dict(air=.32, h=.25, onto_board=1)),          # 跳上冲浪板
    (14.7, 'store', 180 / 1024, -1, dict(air=.4, h=.35, store=1)),        # 从冲浪板跳到 DeepSeek 图标上（第 6 名）
    (21.85, 'chat', .08, .62, dict(air=.5, h=.35)),                       # 滑到底以后，跳向对话平板
    (22.45, 'chat', .5, .6, dict(air=.35, h=.15)),
    (28.0, 'chat', .5, .6, dict(air=.45, h=.3, spin=1)),                  # 结尾开心地转一圈
]
STORE_ROWS = (231, 148)
STORE_ICON_U = 180 / 1024
def store_row_v(pos): return (STORE_ROWS[0] + STORE_ROWS[1] * (pos + .5)) / 1536
def lift_pos(t):
    p = 5.
    for tl in LIFT:
        k = min(1., max(0., (t - tl) / .2)); p -= k * k * (3 - 2 * k)
    return p

# ---------------- 镜头（舞台部分）：(秒, 看哪里, 偏移, 垂直视角)。'her' 紧跟她；(设备,u,v) 看界面；('mix',设备,u,v,权重)
CAM = [
    (CUT, 'her', (.6, -2.0, .55), 50),                       # 白光散开：贴着她，看她从传送门飞出来
    (5.4, ('mix', 'logo', .55, .5, .6), (.1, -1.75, 1.1), 42),
    (7.0, ('mix', 'logo', .4, .55, .5), (-.1, -1.65, 1.0), 42),
    (10.2, 'her', (.15, -1.25, .75), 40),                     # 名字牌砸下来：推近
    (11.8, ('mix', 'logo', .3, .6, .6), (.3, -1.9, 1.2), 44),
    (12.9, 'her', (.35, -1.6, .8), 44),                       # 冲浪：侧前方紧跟
    (14.6, ('mix', 'store', .3, .45, .5), (.25, -1.35, 1.3), 42),
    (LAUNCH, ('mix', 'stock', .85, .4, .55), (.2, -2.4, 1.5), 46),
    (SLIDE_LAND + .1, ('mix', 'stock', .6, .4, .45), (.2, -2.2, 1.35), 46),
    (21.0, 'her', (.2, -1.8, 1.0), 44),
    (22.6, ('mix', 'chat', .5, .55, .5), (.1, -1.9, 1.25), 42),
    (25.4, 'her', (.1, -1.5, .8), 40),
    (REVEAL, ('mix', 'chat', .5, .55, .3), (-.4, -3.8, 2.4), 46),
    (DUR, ('mix', 'chat', .5, .55, .3), (-.8, -4.6, 2.9), 48),
]
# 暗场镜头：(秒, 看向的 u,v, 偏移, 视角)
DARK_CAM = [(0.0, (.58, .45), (.25, -1.25, 1.35), 40), (1.6, (.42, .45), (.15, -1.0, .95), 38), (3.1, (.6, .55), (.1, -1.05, 1.0), 40)]

def events():
    ev = [(MSG['type'][0] + (MSG['type'][1] - MSG['type'][0]) * i / len(MSG['text']), 'key') for i in range(len(MSG['text']))]
    ev += [(MSG['send'], 'send'), (REPLY_T, 'pop'), (STICKER['peel'][0], 'peel'), (STICKER['swap'], 'whoosh'), (PORTAL_OPEN[0], 'portal'), (DIVE[0], 'jump'),
           (FLASH[0], 'flash'), (CUT, 'whoosh'), (CARD_IN[1], 'pop'), (KICK, 'kick'), (PLATE[1], 'thud_big'), (BOARD_IN[0], 'whoosh'), (SURF[0], 'land'),
           (ICON_POP, 'pop'), (CONFETTI, 'confetti'), (LAUNCH, 'boing'), (BAR_FALL[1], 'thud_big'), (NUM_DROP[1], 'thud_big'), (SLIDE_LAND, 'land'),
           (SLIDE_LAND + .05, 'slide'), (SLIDE_END, 'land'), (RAIN[0], 'rain'), (POPUP_DROP[1], 'thud'), (POP_OUT, 'boing')]
    ev += [(t, 'lift') for t in LIFT] + [(c['t'], 'chapter') for c in CH] + [(a, 'bubble') for a, *_ in LINES]
    for t, *_r, o in HOPS: ev += [(t - o.get('air', .4), 'jump'), (t, 'land')]
    return sorted(ev)
