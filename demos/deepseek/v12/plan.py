"""《大肥鱼 · 自我介绍》v12 · 完整 90 秒的"新配乐 + 文字引导"版。画面沿用 v10（0–30 秒）和 v11（30–90 秒）渲好的帧，不重渲 3D。
这里只管两件事：
1. CAPTIONS：屏幕上方的说明字卡（排行榜第几名、英伟达跌了多少……），让只看画面的人也不用猜。
2. 配乐的段落表：每一段什么风格、哪里停住、哪里炸开（audio.py 读）。"""
import importlib.util, pathlib
HERE = pathlib.Path(__file__).resolve().parent; DS = HERE.parent
def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
P10 = _load('plan10', DS / 'v10/plan.py'); P11 = _load('plan11', DS / 'v11/plan.py')
FPS, BPM, DUR = 30, 128, 90.0
BEAT = 60 / BPM; N = int(DUR * FPS)

# ---------------- 大事记卡（屏幕上方）：日历牌 + 一句话 + 年份刻度尺上滑动的点 → 看着像在翻 DeepSeek 的发展史
# (出现, 消失, 日历页眉, 日历日期, 刻度位置(年), 小字, 大字, 大字颜色)。大字可以是函数（随时间变）
def rank_text(t):
    n = int(round(P10.lift_pos(t))) + 1
    return ('第 1 名！', '#ff4d8d') if n == 1 else (f'第 {n} 名', '#4d6bfe')
NOW = 2026 + 9.8 / 12
MILESTONES = [
    (6.9, 8.75, '2023', '07月', 2023 + 6.5 / 12, '深度求索在杭州成立', 'DeepSeek 诞生', '#4d6bfe'),
    (8.95, 11.2, '2025', '01.20', 2025 + .6 / 12, 'DeepSeek-R1 发布', '会"深度思考"的 AI', '#4d6bfe'),
    (14.75, 17.5, '2025', '01.27', 2025 + .87 / 12, '美区 App Store 免费榜', rank_text, None),
    (17.75, 21.3, '2025', '01.27', 2025 + .87 / 12, '同一天 · 英伟达股价暴跌 17%', '市值蒸发约 5890 亿美元', '#0b8f55'),
    (22.75, 24.35, '2025', '02月', 2025 + 1.5 / 12, '全世界都涌进来打招呼', '你好 你好 你好……', '#4d6bfe'),
    (24.35, 25.9, '2025', '02月', 2025 + 1.5 / 12, '人实在太多', '服务器：挤爆了', '#ff8a00'),
    (35.4, 38.4, '2025', '春', 2025 + 3 / 12, '网友二创形象爆火', '评论区全是大肥鱼', '#ff4d8d'),
    (51.0, 53.6, 'NOW', '每天', NOW, '主人睡不着的时候', '凌晨两点也在', '#7b8bff'),
    (73.8, 76.5, '2026', '10月', NOW, '这条片子', '每一帧都是代码算出来的', '#4d6bfe'),
]
YEARS = (2023, 2027)

# ---------------- 配乐段落（秒）：风格名
SECTIONS = [
    (0.0, 'intro'),            # 暗场：电钢琴 + 黑胶噪声，越来越紧
    (P10.CUT, 'funk'),         # 白光一炸：放克律动 + 主旋律
    (P10.CH[1]['t'], 'hype'),  # 我火过：加 16 分音符、琶音，越来越燃
    (P10.RAIN[0], 'glitch'),   # "你好"雨：音乐开始卡顿
    (P10.POP_OUT, 'funk'),     # 钻出来：律动回来
    (P11.CH[0]['t'], 'bili'),  # B站：拨弦 + 木琴，俏皮
    (P11.NIGHT[0], 'night'),   # 深夜：八音盒摇篮曲 + 蛐蛐
    (P11.NOTE3, 'morning'),    # 早安：暖和弦，鸟叫，律动轻轻回来
    (P11.CH[2]['t'], 'tech'),  # 做片子：最燃，电子琶音 + 打字
    (P11.CUT, 'outro'),        # 回到暗场：电钢琴把主旋律慢慢弹一遍
    (P11.ENDCARD, 'end'),
]
# 音乐整体停住的地方（只留音效）：(开始, 结束, 方式)  'cut' 直接断 / 'tape' 像磁带停转一样掉下去
STOPS = [
    (P10.CUT - .18, P10.CUT, 'cut'),                   # 白光前一拍：吸一口气
    (P10.NUM_DROP[0], P10.NUM_DROP[1], 'cut'),         # "5890 亿美元"砸下来前：停顿
    (P10.POPUP_DROP[1], P10.POP_OUT, 'tape'),          # 弹窗砸下：磁带停转 → 安静 → 她钻出来再响
    (P11.Q_DROP[1], P11.THINK_IN, 'cut'),              # "你是不是 AI？"：唱片刮擦 → 冷场（只有蛐蛐）
    (P11.SLUMP, P11.PILE_ON[1] + .3, 'cut'),           # 泄气：伤心长号独奏
    (P11.FLASH[0], P11.CUT + .35, 'cut'),              # 钻进门：只剩呼啸和白光
]
def section(t):
    s = SECTIONS[0][1]
    for a, n in SECTIONS:
        if t >= a: s = n
    return s

def events():
    """前 30 秒 + 后 60 秒的所有音效事件（绝对时间）"""
    ev = [e for e in P10.events() if e[0] < 30] + [e for e in P11.events() if e[0] >= 30]
    ev += [(P10.LIFT[i], f'lift{i}') for i in range(len(P10.LIFT))]
    return sorted(ev, key=lambda e: e[0])
