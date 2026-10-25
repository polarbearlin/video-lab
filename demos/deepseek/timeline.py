#!/usr/bin/env python3
"""《大肥鱼，不是机器人》30 秒 · 唯一的时间轴（不依赖 Blender）。
界面状态、她的每一跳、镜头、字幕、音效事件都在这里定，其他脚本（ui_states / scene / score / compose）都读它。
python3 demos/deepseek/timeline.py   → build/timeline.json（逐帧数据）"""
import json, math, os, pathlib

HERE = pathlib.Path(__file__).resolve().parent
FPS, DUR, BPM = 30, 30.0, 120
N = int(DUR * FPS)                       # 900 帧
fr = lambda t: int(round(t * FPS)) + 1   # 秒 → 帧号（第 1 帧 = 0 秒）
RES = (1920, 1080)                       # 横屏；改回竖屏写 (1080, 1920)、FOV_K = 1.0
BIAS_K = (0.5, 0.4, -0.06)               # 横屏垂直空间少：看向点的偏移收小，并让她在画面里稍微靠上（避开底部字幕）
FOV_K = 0.9                              # 镜头视角整体缩放（横屏画面更宽，垂直方向稍微收一点）
CHAR_H = 0.42                            # 她的身高（米）；界面板 1.3–1.6 米宽

# ---------------- 舞台：一整张大桌面上平铺的界面板（图片上方朝 +Y，镜头在 -Y 一侧往下看）
PANELS = {
    'video':  dict(px=(1080, 1300), w=1.5, c=(0.0, 2.6)),
    'feed':   dict(px=(1080, 1900), w=1.5, c=(0.0, 0.2)),
    'input':  dict(px=(1080, 1000), w=1.6, c=(1.95, -1.3)),
    'reply':  dict(px=(1080, 1300), w=1.5, c=(3.9, -0.8)),
    'plugin': dict(px=(1080, 1300), w=1.5, c=(5.85, -1.4)),
    'lock':   dict(px=(1080, 1920), w=1.3, c=(7.7, -0.9)),
    'chat':   dict(px=(1080, 1500), w=1.5, c=(9.55, -1.3)),
}
for p in PANELS.values(): p['h'] = p['w'] * p['px'][1] / p['px'][0]
def world(panel, px, py):
    p = PANELS[panel]; W, H = p['px']
    return (p['c'][0] + (px / W - .5) * p['w'], p['c'][1] + (.5 - py / H) * p['h'])

# 砸下来的那条回复「你是不是 AI？」：单独一块小板，落在 reply 面板上
DROP = dict(px=(1140, 345), w=1.06, at=('reply', 420, 500), t_fall=10.6, t_land=11.0)

# ---------------- 文案（字幕在底部，【】里的字用品牌蓝；关键句另外做在界面里）
SUBS = [
    (0.0, 2.5, '播放 12，评论【236】？'),
    (2.5, 6.0, '点开一看，全是同一条鱼：【大肥鱼】'),
    (6.0, 10.5, '她是网友用 DeepSeek 养的 AI\n会自己【刷视频、写评论】'),
    (10.5, 13.0, '直到有人问：【你是不是 AI？】'),
    (13.0, 17.0, '她秒回：【"真不是机器人"】'),
    (17.0, 20.0, '……连【"备选回复"】都一起发了出来'),
    (20.0, 23.8, '有人做了插件，【一键清除】大肥鱼'),
    (23.8, 27.3, '也有人每天，都在等她这句【早安】'),
    (27.3, 30.0, '想给她一个完整的"人生"\n大概是因为：【离不开她了】'),
]
TYPE_1 = '本鲸记下了～'
TYPE_2 = '真不是机器人'
TYPE_LOCK = '早安，主人～'
TYPE_CHAT = '本鲸还在哦'

# ---------------- 她的每一次落地：(落地秒, 面板, 像素x, 像素y, 选项)
# 选项：air 空中时间(秒)，h 跳高(米)，spin 空中转几圈，kind 落地音效种类
HOPS = [(0.5, 'video', 760, 820, dict(air=.5, start_z=2.4, kind='big'))]   # 从天而降，砸在评论数上
HOPS += [(1.0, 'video', 740, 830, dict(air=.25, h=.08)), (1.5, 'video', 780, 820, dict(air=.25, h=.08)),
         (2.0, 'video', 560, 1150, dict(air=.35))]
for k in range(7):                                                      # 沿评论一行行往下蹦
    HOPS.append((2.5 + .5 * k, 'feed', 330 if k % 2 == 0 else 760, 320 + 200 * k, dict(air=.4 if k == 0 else .32)))
KEYS = [(240, 470), (520, 600), (330, 730), (700, 470), (430, 600), (610, 730)]   # 键盘上打字的落点
HOPS.append((6.0, 'input', 500, 600, dict(air=.4)))
for i, (x, y) in enumerate(KEYS):
    HOPS.append((6.5 + .5 * i, 'input', x, y, dict(air=.3, h=.1, kind='key', type=('input', i + 1))))
HOPS.append((9.5, 'input', 880, 905, dict(air=.3, h=.14, kind='send')))   # 坐上「发送」
HOPS.append((10.5, 'reply', 760, 190, dict(air=.45)))                   # 跳到自己发出去的评论上
HOPS.append((11.3, 'reply', 770, 200, dict(air=.22, h=.12, kind='shock')))   # 被砸下来的问题吓一跳
HOPS.append((12.5, 'reply', 840, 1195, dict(air=.35)))                  # 跳到回复框
for i in range(6):                                                      # 秒回：快速蹦字
    HOPS.append((13.0 + .25 * i, 'reply', 790 if i % 2 == 0 else 900, 1195, dict(air=.16, h=.06, kind='key', type=('reply', i + 1))))
HOPS.append((15.0, 'reply', 860, 1195, dict(air=.3, h=.14, kind='send')))
HOPS.append((16.0, 'reply', 860, 1195, dict(air=.25, h=.08)))            # 得意地蹦一下
HOPS.append((17.5, 'reply', 900, 1050, dict(air=.3)))                   # 跳上露馅的那一行
for i, t in enumerate((18.0, 18.5, 19.0)):                              # 狂踩
    HOPS.append((t, 'reply', 880 + 20 * i, 1050, dict(air=.22, h=.1, kind='stomp')))
HOPS.append((20.0, 'plugin', 540, 650, dict(air=.45)))                  # 跳到清除插件上
HOPS.append((21.25, 'plugin', 640, 990, dict(air=.3)))                  # 评论一条条消失，往下逃
HOPS.append((21.75, 'plugin', 560, 1160, dict(air=.3)))
HOPS.append((22.5, 'lock', 540, 1420, dict(air=.45, h=.35, spin=1)))     # 逃到手机锁屏上
HOPS.append((26.0, 'lock', 540, 1420, dict(air=.25, h=.07)))             # 看到早安，开心地蹦一下
HOPS.append((27.5, 'chat', 720, 1330, dict(air=.45, h=.35, spin=1)))     # 跳到 DeepSeek 对话框上
HOPS.append((29.5, 'chat', 720, 1330, dict(air=.25, h=.06)))

FACE_CAM = {(11.4, 12.4)}   # 这段时间整个转过来正对镜头（被问"你是不是 AI"）

# ---------------- 界面状态：每块板在什么时候换成哪张图（ui_states.py 按名字生成图片）
STATES = {
    'video':  [(0, 'c236'), (0.5, 'c237')],
    'feed':   [(0, 'r-1')] + [(2.5 + .5 * k, f'r{k}') for k in range(7)] + [(6.1, 'r-1')],
    'input':  [(0, 't0')] + [(6.5 + .5 * i, f't{i + 1}') for i in range(6)] + [(9.5, 'sent')],
    'reply':  [(0, 'a0')] + [(13.0 + .25 * i, f'a{i + 1}') for i in range(6)] + [(15.0, 'sent'), (17.0, 'leak')],
    'plugin': [(0, 'off'), (20.5, 'on')] + [(21.0 + .25 * k, f'v{k + 1}') for k in range(6)],
    'lock':   [(0, 'n0')] + [(24.0 + .25 * i, f'n{i + 1}') for i in range(6)] + [(25.6, 'n7')],
    'chat':   [(0, 'q0'), (27.9, 'q1')] + [(28.25 + .2 * i, f'c{i + 1}') for i in range(5)],
}

# ---------------- 镜头：(秒, 相对她的偏移 dx,dy,dz, 垂直视角°, 看向点的偏移 bx,by)
CAM = [
    (0.0, (0.0, -2.2, 2.3), 46, (0.0, 0.3)),
    (2.3, (0.15, -1.9, 1.8), 44, (0.0, -0.1)),
    (6.0, (0.1, -1.8, 1.7), 42, (0.0, 0.3)),
    (10.3, (0.1, -1.7, 1.6), 42, (-0.3, -0.1)),
    (11.2, (0.0, -1.6, 1.45), 42, (-0.4, -0.2)),
    (12.4, (0.1, -1.7, 1.65), 42, (-0.3, 0.3)),
    (17.0, (0.1, -1.6, 1.6), 42, (-0.45, 0.2)),
    (19.8, (0.2, -2.0, 2.0), 46, (0.0, 0.25)),
    (22.6, (0.1, -1.8, 1.8), 44, (0.0, 0.4)),
    (24.2, (0.05, -1.55, 1.55), 40, (0.0, 0.5)),
    (27.4, (0.1, -1.7, 1.6), 42, (-0.15, 0.4)),
    (30.0, (0.15, -2.0, 1.9), 44, (-0.15, 0.4)),
]
CAM_K = 1.0  # 镜头整体远近
WARM = (23.4, 24.6)   # 这段时间从深海蓝过渡到暖色（锁屏的早安）

# ---------------- 音效事件（score.py 读）
def sfx_events():
    ev = []
    for t, panel, x, y, o in HOPS:
        ev.append((t - o.get('air', .4), 'jump', o.get('h', .2)))
        ev.append((t, 'land_' + o.get('kind', 'soft'), 0))
    ev += [(0.5, 'counter', 0), (DROP['t_land'], 'drop', 0), (DROP['t_land'], 'ding', 0), (17.0, 'oops', 0),
           (20.5, 'toggle', 0), (25.6, 'chime', 0), (27.9, 'pop', 0)]
    ev += [(21.0 + .25 * k, 'vanish', k) for k in range(6)]
    ev += [(24.0 + .25 * i, 'type_soft', i) for i in range(6)] + [(28.25 + .2 * i, 'type_soft', i) for i in range(5)]
    return sorted(ev)

# ======================================================================= 逐帧计算
def smooth(a): a = max(0., min(1., a)); return a * a * (3 - 2 * a)
def state_at(lst, t):
    s = lst[0][1]
    for t0, name in lst:
        if t >= t0 - 1e-6: s = name
    return s
def lerp(a, b, k): return tuple(x + (y - x) * k for x, y in zip(a, b)) if isinstance(a, tuple) else a + (b - a) * k

def char_track():
    """她每一帧的位置 / 朝向 / 压扁拉长。刚体模型没有骨骼，弹性全靠整体缩放（脚底是原点，所以缩放不会离地）。"""
    pts = [(t, world(p, x, y), o) for t, p, x, y, o in HOPS]
    out = []
    yaw_prev = -90.0
    for f in range(1, N + 1):
        t = (f - 1) / FPS
        # 找到当前所处的那一跳
        i = 0
        while i + 1 < len(pts) and pts[i + 1][0] - pts[i + 1][2].get('air', .4) <= t: i += 1
        tl, (x, y), o = pts[i]
        z, sx, sz, spin = 0., 1., 1., 0.
        air = o.get('air', .4); t0 = tl - air
        if i == 0 and t < tl:                          # 片头：从天上掉下来
            k = max(0, t - t0) / air; z = o['start_z'] * (1 - k * k); sz, sx = 1.18, .88
            px, py = x, y; nx, ny = x, y
        else:
            nxt = pts[i + 1] if i + 1 < len(pts) else None
            # 判断是在空中（飞向第 i 跳的落点）还是站在第 i 跳的落点上
            prev = pts[i - 1] if i > 0 else pts[0]
            if t < tl:                                 # 在空中：从上一个落点飞到这一个
                (px, py) = prev[1]; k = (t - t0) / air
                dist = math.hypot(x - px, y - py); hh = o.get('h', .12 + .22 * dist)
                cx, cy = px + (x - px) * k, py + (y - py) * k; z = 4 * hh * k * (1 - k)
                sz, sx = 1 + .12 * abs(1 - 2 * k), 1 - .07 * abs(1 - 2 * k)   # 起跳和落地时拉长，顶点时恢复
                spin = o.get('spin', 0) * 360 * smooth(k)
                x, y = cx, cy; nx, ny = pts[i][1]
            else:                                      # 站着：落地压扁回弹 + 起跳前蓄力 + 呼吸
                dt = t - tl
                amp = {'big': .32, 'stomp': .26, 'shock': .2, 'send': .2}.get(o.get('kind'), .16)
                sq = amp * math.exp(-dt * 14) * math.cos(dt * 34)
                if nxt:
                    tn = nxt[0] - nxt[2].get('air', .4); lead = tn - t
                    if lead < .12: sq += .14 * smooth(1 - lead / .12)   # 蓄力
                sq += .015 * math.sin(t * math.tau * BPM / 60 / 2)     # 跟着节拍轻轻呼吸
                sz, sx = 1 - sq, 1 + sq * .6
                px, py = x, y
                nx, ny = (nxt[1] if nxt else (x + .01, y))
        # 朝向：大体朝镜头（-Y），带一点行进方向
        dx, dy = nx - px, ny - py; L = math.hypot(dx, dy)
        fx, fy = (0.25, -1.0)
        if L > .05: fx, fy = fx + .9 * dx / L, fy + .9 * dy / L
        if any(a <= t <= b for a, b in FACE_CAM): fx, fy = 0.05, -1.0
        yaw = math.degrees(math.atan2(fy, fx))
        while yaw - yaw_prev > 180: yaw -= 360
        while yaw - yaw_prev < -180: yaw += 360
        yaw = yaw_prev + (yaw - yaw_prev) * .25; yaw_prev = yaw   # 转身有个过程
        out.append(dict(x=x, y=y, z=z, yaw=yaw + spin, sx=sx, sz=sz))
    return out

def cam_track(ch):
    # 镜头跟的是她「平滑后」的位置（前后对称的高斯平滑，不会拖后）
    sig = 9; K = [math.exp(-(i / sig) ** 2 / 2) for i in range(-3 * sig, 3 * sig + 1)]
    sm = []
    for f in range(N):
        sx = sy = w = 0
        for j, k in enumerate(K):
            g = min(N - 1, max(0, f + j - 3 * sig)); sx += ch[g]['x'] * k; sy += ch[g]['y'] * k; w += k
        sm.append((sx / w, sy / w))
    out = []
    for f in range(N):
        t = f / FPS
        j = 0
        while j + 1 < len(CAM) and CAM[j + 1][0] <= t: j += 1
        a, b = CAM[j], CAM[min(j + 1, len(CAM) - 1)]
        k = smooth((t - a[0]) / (b[0] - a[0])) if b[0] > a[0] else 0
        off, fov, bias = lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k)
        off = tuple(v * CAM_K for v in off)
        tx, ty = sm[f][0] + bias[0] * BIAS_K[0], sm[f][1] + bias[1] * BIAS_K[1] + BIAS_K[2]
        out.append(dict(loc=(tx + off[0], ty + off[1], off[2]), look=(tx, ty, CHAR_H * .45), fov=fov * FOV_K))
    return out

def build():
    ch = char_track(); cam = cam_track(ch)
    frames = []
    for f in range(1, N + 1):
        t = (f - 1) / FPS
        d = dict(f=f, char=ch[f - 1], cam=cam[f - 1], warm=smooth((t - WARM[0]) / (WARM[1] - WARM[0])),
                 ui={p: state_at(lst, t) for p, lst in STATES.items()})
        k = (t - DROP['t_fall']) / (DROP['t_land'] - DROP['t_fall'])
        d['drop_z'] = None if k < 0 else (2.2 * (1 - k * k) if k < 1 else 0.0)
        frames.append(d)
    return dict(fps=FPS, n=N, bpm=BPM, res=RES, char_h=CHAR_H, panels=PANELS, drop=DROP, subs=SUBS,
                states={p: sorted({s for _, s in lst}) for p, lst in STATES.items()},
                events=sfx_events(), frames=frames)

if __name__ == '__main__':
    out = HERE / 'build/timeline.json'; out.parent.mkdir(parents=True, exist_ok=True)
    J = build(); out.write_text(json.dumps(J, ensure_ascii=False))
    print(out, len(J['frames']), 'frames,', len(HOPS), 'hops')
