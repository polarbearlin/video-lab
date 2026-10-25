"""《大肥鱼 · 自我介绍》v8 · 前 30 秒（一镜到底）的总计划：时间点、桌面布局、界面状态。
ui.py / scene.py / audio.py / compose.py 都只读这一个文件。128 BPM：1 拍 = 0.469 秒，1 小节 = 1.875 秒。"""
FPS, DUR, BPM = 30, 30.0, 128
BEAT = 60 / BPM; BAR = 4 * BEAT
N = int(DUR * FPS)
fr = lambda t: int(round(t * FPS)) + 1
b = lambda bar, beat=0: (bar - 1) * BAR + beat * BEAT   # 第几小节第几拍 → 秒（小节从 1 开始）

# ---------------- 桌面布局：同一张桌子上 4 台设备，从左到右（屏幕图片上方朝 +Y）
TAB = (2.6, 2.6 * 1024 / 1536)
DEV = {
    'chat':  dict(c=(0.0, 0.0), size=TAB, kind='tablet'),
    'logo':  dict(c=(3.05, 0.25), size=(2.0, 2.0 * 1600 / 2400), kind='tablet'),
    'store': dict(c=(5.55, -0.05), size=(1.2, 1.2 * 1536 / 1024), kind='phone'),
    'stock': dict(c=(8.25, 0.2), size=(2.6, 2.6 * 1600 / 2400), kind='tablet'),
}
def at(dev, u, v, z=0.):
    """设备屏幕上的 (u,v)（左上角 0,0，右下角 1,1）→ 世界坐标"""
    d = DEV[dev]; w, h = d['size']; cx, cy = d['c']
    return (cx + (u - .5) * w, cy + (.5 - v) * h, z)

# ---------------- 对话（主人发的消息）。打字时间 = 输入框里逐字出现，发送后变成气泡
MSGS = [dict(text='大肥鱼，给大家介绍一下你自己吧？', type=(0.3, 2.0), send=2.15, y=140),
        dict(text='你到底是什么鱼？', type=(b(6, 1), b(6, 3.5)), send=b(7), y=600),
        dict(text='听说你很火？', type=(b(12, 1), b(12, 3)), send=b(12, 3.6), y=700)]
REPLY = dict(text='好嘞！', t=2.8)                    # 她的回复 + 平面贴纸
STICKER = dict(px=(530, 345, 700, 560), peel=(3.75, 5.0), spin=(5.0, 6.4), swap=5.7)   # 贴纸在图上的位置、揭起、转一圈（转到侧面时换成 3D）
JUMP_OUT = 6.9                                        # 蹬一下跳出屏幕（波纹）
TITLE = (7.4, b(6))                                    # 片头标题"大肥鱼 · 自我介绍"
CH = [dict(name='我是谁', t=b(6)), dict(name='我火过', t=b(12))]   # 章节：大号标题 2 拍后缩到左上角

# ---------------- 第 1 步：logo 平板上的道具
CARD_POP = 13.3      # 网友评论"这不就是条大肥鱼吗？"弹起来
PLATE_DROP = (14.6, 15.0)   # 名字牌砸下来

# ---------------- 第 2 步：App Store 电梯 + 英伟达滑梯
STORE_ROWS = (231, 148)            # 第一行顶部 y、行高（原图 1024×1536 像素）
LIFT = [24.0 + i * .5 for i in range(5)]   # 她落稳以后，DeepSeek 一行一行往上顶（从第 6 名到第 1 名）
LAUNCH = LIFT[-1] + .35            # 到第 1 名被顶飞
SLIDE_LAND = LAUNCH + .85          # 落到滑梯顶上
SLIDE_END = 29.5                   # 滑到底

# ---------------- 她的落点：(落地秒, 设备, u, v, 选项)。起跳时间 = 落地 - air
HOPS = [
    (7.6, 'chat', .66, .56, dict(air=.7, h=.55, spin=1)),            # 跳出屏幕，转一圈落到对话框右边
    (b(7, 1), 'chat', .66, .56, dict(air=.25, h=.08)),                 # 看到主人的新问题，原地一蹦
    (12.15, 'chat', .93, .5, dict(air=.4)),
    (12.85, 'logo', .68, .5, dict(air=.6, h=.4)),                      # 跳过缝，落到鲸鱼 logo 旁边（不挡 logo）
    (13.75, 'logo', .62, .55, dict(air=.3, h=.12)),                    # 转向评论卡，小跳
    (15.6, 'logo', .7, .5, dict(air=.45, h=.25, spin=1)),              # 名字牌砸下来后，开心地转一圈
    (16.7, 'logo', .82, .62, dict(air=.35, h=.06, slide=1)),           # 侧滑
    (17.7, 'logo', .66, .6, dict(air=.5, h=.3, flip=1)),               # 前空翻
    (19.3, 'logo', .12, .62, dict(air=.45)),                           # 回到对话框
    (20.0, 'chat', .66, .56, dict(air=.6, h=.35)),
    (b(12, 3.8), 'chat', .93, .52, dict(air=.4)),                      # 主人问"听说你很火？" → 出发
    (23.05, 'logo', .25, .85, dict(air=.55, h=.35)),
    (23.75, 'store', .17, .0, dict(air=.6, h=.4, store_pos=5)),        # 落到 App Store 里 DeepSeek 的图标上（第 6 名）
]
STORE_ICON_U = 180 / 1024
def store_row_v(pos):   # 第 pos 名那一行中心的 v
    return (STORE_ROWS[0] + STORE_ROWS[1] * (pos + .5)) / 1536

def lift_pos(t):
    """DeepSeek 当前在第几名（0 = 第 1 名，5 = 第 6 名），带一点平滑"""
    p = 5.
    for i, tl in enumerate(LIFT):
        k = min(1., max(0., (t - tl) / .22)); k = k * k * (3 - 2 * k); p -= k
    return p

# ---------------- 镜头：(秒, 看哪里, 偏移, 垂直视角)。看哪里 = 'her' 跟她 / (设备, u, v) 看界面上的某个点 / ('mix', 设备, u, v, 权重) 两者之间
CAM = [
    (0.0, ('chat', .62, .5), (.25, -2.05, 1.85), 40),
    (3.4, ('chat', .5, .4), (.25, -1.45, 1.2), 40),
    (6.3, 'her', (.3, -2.6, 2.1), 44),                              # 跳出屏幕：提前拉远，跟着她往上
    (8.6, ('mix', 'chat', .55, .6, .45), (.2, -1.85, 1.55), 40),
    (11.6, 'her', (.3, -1.9, 1.5), 42),
    (12.45, ('mix', 'logo', .68, .5, .5), (.3, -2.0, 1.6), 42),   # 跨设备：腾空中点就看向落点
    (13.0, ('mix', 'logo', .5, .45, .55), (.2, -1.75, 1.4), 40),
    (18.6, 'her', (.25, -1.7, 1.3), 40),
    (20.2, ('mix', 'chat', .6, .65, .5), (.2, -1.85, 1.55), 40),
    (22.2, 'her', (.3, -1.9, 1.5), 42),
    (23.4, ('mix', 'store', .3, .7, .5), (.25, -2.0, 1.7), 42),
    (23.8, ('mix', 'store', .5, .45, .55), (.15, -1.45, 1.65), 40),
    (LAUNCH, ('mix', 'stock', .8, .4, .5), (.5, -2.3, 1.6), 44),   # 被顶飞：拉远，看向滑梯
    (SLIDE_LAND + .2, 'her', (.5, -1.6, 1.3), 40),
    (DUR, 'her', (.5, -1.6, 1.3), 40),
]

# ---------------- 音效事件（audio.py 读）
def events():
    ev = []
    for m in MSGS:
        a, z = m['type']; n = len(m['text'])
        ev += [(a + (z - a) * i / n, 'key') for i in range(n)]; ev.append((m['send'], 'send'))
    ev += [(REPLY['t'], 'pop'), (STICKER['peel'][0], 'peel'), (STICKER['swap'], 'whoosh'), (JUMP_OUT, 'boing'), (JUMP_OUT, 'ripple'),
           (CARD_POP, 'pop'), (PLATE_DROP[1], 'thud_big'), (LAUNCH, 'boing'), (SLIDE_LAND, 'thud'), (SLIDE_LAND + .1, 'slide'), (SLIDE_END, 'thud')]
    ev += [(t, 'lift') for t in LIFT]
    for t, *_rest, o in HOPS: ev += [(t - o.get('air', .4), 'jump'), (t, 'land')]
    ev += [(c['t'], 'chapter') for c in CH] + [(TITLE[0], 'title')]
    return sorted(ev)
