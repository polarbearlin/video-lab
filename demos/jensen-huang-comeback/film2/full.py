"""《黄仁勋复职的十一天》完整初版：按 Vasanti 的配音排镜头。

时间线：冷开场（ABC 原声）→ 片名 → 配音第 1 份 → 特朗普原声 1 → 第 2 份（中间插原声 2）→ 第 3 份（中间插原声 3）→ 片尾署名。
每句旁白的起止时间来自 配音/lines_aligned.json（配音脚本逐句对齐到语音识别的逐字时间）。
用法：python3 full.py   输出 /home/user/jh_film/v2/full/
"""
import json, os, re, subprocess
import render as R
import fx
from render import GREEN, RED, WHITE
from frame import build as build_frame

PROJ = R.PROJ
OUT = '/home/user/jh_film/v2/full'
SEG = os.path.join(OUT, 'seg')
os.makedirs(SEG, exist_ok=True)
VO = {p: os.path.join(PROJ, '配音', f'narrator_part{p}.mp3') for p in (1, 2, 3)}

# ---------------- 素材 ----------------
V = {k: 'video/' + v for k, v in dict(
    ABC='V01_abc_reinstatement_coldopen.mp4', CNBC1='V01_cnbc_reinstatement_coldopen.mp4',
    V03='V03_cnbc_nvda_board.mp4', V03M='V03_mixkit_stock_screen.mp4', V04='V04_fox_trump_wh_nov9.mp4',
    V05='V05_pbs_hq_endeavor_voyager.mp4', V06='V06b_wikimedia_newspaper_web_press.mp4',
    V07='V07_mixkit_singapore_marina.mp4', V08='V08_pbs_spy_open.mp4', V09='V09_mixkit_typing.mp4',
    V10='V10_pbs_guo_jiakun.mp4', V11='V11_pbs_trump_believe_him.mp4', V12='V12_cnbc_resignation.mp4',
    V15='V15_cnbc_jones_earnings.mp4', V16='V16_cnbc_shares_drop.mp4', V17='V17_mixkit_white_house.mp4',
    V18='V18_fox_vance_ingraham.mp4', V20='V20_pbs_trump_huang_handshake.mp4', V21='V21_abc_reinstatement_report.mp4',
    V22P='V22_mixkit_shanghai_port.mp4', V22C='V22_pbs_chip_render.mp4', V23='V23_cnbc_hq_applause.mp4',
    V24='V24_nbc_shares_soar_31.mp4', V26C='V26_cnbc_i_convinced.mp4', V26S='V26_cnbc_sex_sells.mp4',
    V27='V27_pbs_jeffries.mp4', V30='V30_cnbc_gtc_nightstage.mp4',
    J28a='J28a_CES2026_chip.mp4', J28b='J28b_CES2026_stage.mp4', J28c='J28c_GTCDC2025_stage.mp4',
    J29a='J29a_GTCBerlin2026_entrance.mp4', J29b='J29b_GTCBerlin2026_medium.mp4', J29c='J29c_GTCBerlin2026_gpu.mp4',
    J29d='J29d_GTCBerlin2026_gesture.mp4', J29e='J29e_GTCBerlin2026_wide.mp4', J29k='J29k_keynote_45s.mp4').items()}
_dur = {}


def vdur(rel):
    if rel not in _dur:
        _dur[rel] = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0',
                                          R.src_path(rel)], capture_output=True, text=True).stdout)
    return _dur[rel]


# 镜头构造器：每个返回 fn(out, dur)
def C(key, t_in, **kw):
    rel = V[key]

    def fn(o, d):
        t = min(t_in, max(0.0, vdur(rel) - d - 0.05))
        fx.seg_clip_l(o, rel, t, d, **kw)
    return fn


def K(img, **kw):
    return lambda o, d: R.seg_card(o, img, d, **kw)


def S(img, **kw):
    return lambda o, d: fx.seg_still_t(o, img, d, **kw)


def TT(lines, **kw):
    return lambda o, d: R.seg_title(o, d, lines, **kw)


BARS = lambda **kw: (lambda o, d: R.seg_bars(o, d, **kw))
EXT = 'EXT'   # 本句沿用上一句最后一个镜头
NYT = dict(src='《纽约时报》2026-11-23')

# ---------------- 镜头表：(份, 句) -> [(权重, 镜头)] ----------------
SHOTS = {
    # ===== 第 1 份 =====
    (1, 1): [(1.4, C('V15', 2.0)), (3.0, K('img/J11_abc_1117_crop.png', bg=R.bg_blurshot('img/J11_abc_1117.png'), date='11/17', date_sub='财报会', quote='“不打算让他复职”', src='来源：ABC 新闻时间线'))],
    (1, 2): [(1, S('illus/I12_a.png'))],
    (1, 3): [(1.2, C('V21', 1.0)), (2.4, K('img/J14_nvidia_reinstate_crop1.png', bg=R.bg_blurshot('img/J14_nvidia_reinstate.png'), date='11/23', date_sub='英伟达公告', quote='“全票通过，即日复职”', src='来源：英伟达新闻稿 2026-11-23', rot=1.0, seed=3))],
    (1, 4): [(2.2, BARS(src='数据：纳斯达克官网日线')), (1.6, C('V24', 1.5))],
    (1, 5): [(1.8, C('V26C', 9.0)), (2.4, K('img/J2_inquirer_nyt.png', hl=False, quote='《纽约时报》电话采访', crop=(0, 0, 1920, 560), maxh=560, seed=5, src='《纽约时报》（费城询问报转载）'))],
    (1, 6): [(1, K('img/J2_nightly_nyt_crop_goodjob.png', quote='“我昨晚干得不错吧？”', seed=7, rot=-0.6, **NYT))],
    (1, 7): [(1, K('img/J7_nvidia_ceo_transition.png', hl=False, date='11/12', date_sub='辞职', maxh=520, seed=11)),
             (1, K('img/J11_abc_1117_crop.png', date='11/17', date_sub='被拒', seed=13, rot=1.4)),
             (1, K('img/J14_nvidia_reinstate_crop1.png', date='11/23', date_sub='复职', seed=17, rot=-1.6))],
    (1, 8): [(1, TT([('11 天', 260, GREEN)]))],
    (1, 9): [(1.4, C('J29a', 0.5)), (1.8, C('V23', 8.0))],
    (1, 10): [(1, C('V06', 1.0, label='十月底'))],
    (1, 11): [(1, K('img/J3_abc_timeline.png', hl=False, quote='10/29《纽约时报》', maxh=560, seed=21, src='来源：ABC 新闻时间线'))],
    (1, 12): [(1.6, C('V07', 0.5, label='新加坡')), (2.4, C('V08', 3.0))],
    (1, 13): [(1, S('illus/I05_a.png', lines=[('10/31《华尔街日报》', 96, WHITE)]))],
    (1, 14): [(1, S('illus/I05_b.png', lines=[('美国 · 新加坡 · 台湾', 84, WHITE), ('情报官员：有理由认为', 96, GREEN)]))],
    (1, 15): [(1, TT([('她可能是', 110, WHITE), ('中国间谍', 160, RED)], sub='据《华尔街日报》10/31 报道'))],
    (1, 16): [(1, TT([('“有理由认为”', 150, GREEN), ('≠ 最终定论', 120, WHITE)]))],
    (1, 17): [(1.3, C('V17', 1.0, label='华盛顿')), (1.3, C('V03M', 1.0, label='华尔街'))],
    (1, 18): [(1.4, C('V09', 1.0)), (2.0, S('illus/I06_a.png', lines=[('11/8 全员信', 110, WHITE)]))],
    (1, 19): [(1, K('img/J4_verge_memo.png', hl=False, maxh=600, seed=23, src='全文：The Verge'))],
    (1, 20): [(1, K('img/J4_verge_memo_crop1.png', quote='“我对妻子不忠。没有借口。”', seed=25, src='黄仁勋全员信 2026-11-08'))],
    (1, 21): [(1, C('V10', 0.5, label='中国外交部 · 11/9'))],
    (1, 22): [(2.0, C('V10', 3.5)), (3.0, K('img/J5_fmprc_1109_crop.png', quote='“完全没有根据，纯属污蔑”', seed=27, src='来源：中国外交部 11/9 例行记者会'))],
    (1, 23): [(1, C('V04', 1.0, label='特朗普 · 11/9 白宫'))],
    (1, 24): [(1, C('V11', 2.0))],
    (1, 25): [(1, K('img/J6_cnbc_1109_crop.png', quote='“我真的相信他”', seed=29, src='来源：CNBC 2026-11-09'))],
    # ===== 第 2 份 =====
    (2, 1): [(1.4, C('V16', 1.0)), (1.4, S('illus/I08_b.png'))],
    (2, 2): [(1.6, C('V12', 1.0, date='11/12', date_sub='辞职')), (1.6, K('img/J7_nvidia_ceo_transition.png', hl=False, maxh=600, seed=31, src='来源：英伟达新闻稿 2026-11-12'))],
    (2, 3): [(1, S('illus/I01_a.png'))],
    (2, 4): [(1, K('img/J7_nvidia_ceo_transition.png', quote='公告没写原因', maxh=520, seed=33, rot=1.2, src='来源：英伟达新闻稿 2026-11-12'))],
    (2, 5): [(1, C('V05', 0.0, label='英伟达总部 · 圣克拉拉'))],
    (2, 6): [(1, K('img/J8_cbs_crop_petition.png', quote='“把詹森带回来”', seed=35, src='来源：CBS 2026-11-24'))],
    (2, 7): [(1, lambda o, d: fx.seg_counter(o, d))],
    (2, 8): [(1, K('img/J9_x_musk_petition.png', hl=False, maxh=620, seed=37, src='马斯克 X 帖 11/13'))],
    (2, 9): [(1, K('img/J10_x_huang_1117.png', hl=False, date='11/17', date_sub='黄仁勋发声明', maxh=520, seed=39))],
    (2, 10): [(2.4, K('img/J10_cnbc_1117_crop.png', quote='“我很荣幸回来担任 CEO”', seed=41, src='来源：CNBC 2026-11-17')), (2.0, C('J28c', 0.0))],
    (2, 11): [(1, C('J29b', 0.5))],
    (2, 12): [(2.2, C('V15', 4.0, label='11/17 英伟达财报会')), (2.4, K('img/J11_politico_1117_crop.png', quote='董事会主席 哈维·琼斯', seed=43, src='来源：Politico'))],
    (2, 13): [(1, K('img/J11_abc_1117_crop.png', quote='“一致接受辞职，不打算让他复职”', seed=45, rot=-1.0, src='来源：ABC 新闻时间线'))],
    (2, 14): [(1, C('V16', 6.0))],
    (2, 15): [(1, lambda o, d: fx.seg_lines(o, d))],
    (2, 16): EXT,
    (2, 17): [(1.6, S('illus/I02_a.png')), (2.0, C('V17', 4.0))],
    (2, 18): [(2.0, K('img/J2_inquirer_nyt.png', hl=False, quote='《纽约时报》：知情人士称', crop=(0, 0, 1920, 560), maxh=520, seed=47)), (2.6, C('V26C', 8.0, label='特朗普 · CNBC 电话采访'))],
    (2, 19): [(1, S('illus/I03_a.png'))],
    (2, 20): [(1, S('illus/I04_a.png', lines=[('两颗定心丸', 130, GREEN)]))],
    (2, 21): [(1, K('img/J12_nightly_nyt_crop_assurances.png', quote='没有刑事指控 · 不构成国安风险', seed=49, **NYT))],
    (2, 22): [(1.6, C('V18', 0.5, label='副总统 万斯')), (1.4, K('img/J13_pbs_crop_vance.png', seed=51, src='来源：PBS / 美联社'))],
    (2, 23): [(1, S('illus/I05_b.png'))],
    (2, 24): [(1, K('img/J12_nightly_nyt_crop_rubio.png', quote='鲁比奥等人：至少两次通报', seed=53, **NYT))],
    (2, 25): [(1, C('V04', 6.0, label='特朗普此前：没人通报过他'))],
    (2, 26): [(1, C('V21', 6.0, label='11/23 周一'))],
    (2, 27): [(1, K('img/J14_nvidia_reinstate.png', hl=False, date='11/23', date_sub='即日复职', maxh=520, seed=55))],
    (2, 28): [(1, K('img/J15_sec_8k.png', hl=False, maxh=640, seed=57, rot=0.8, src='来源：英伟达 8-K 文件（SEC）'))],
    (2, 29): [(1, K('img/J14_nvidia_reinstate_crop1.png', quote='① 听取了美国政府高层的意见', seed=59, src='来源：英伟达新闻稿 2026-11-23'))],
    (2, 30): EXT,
    (2, 31): [(1, K('img/J14_nvidia_reinstate_crop2.png', quote='② 独立调查会进行到底', seed=61, rot=1.2, src='来源：英伟达新闻稿 2026-11-23'))],
    (2, 32): EXT,
    (2, 33): [(1, S('illus/I11_a.png'))],
    (2, 34): [(1.2, C('V22P', 0.5)), (1.6, K('img/J16_rte_megaspeed.png', hl=False, quote='美国商务部：实体清单', maxh=560, seed=63, src='来源：RTE / 路透 2026-11-24'))],
    (2, 35): [(1, K('img/J16_rte_crop_apex.png', quote='Megaspeed · 阿里旗下 Apex', seed=65, src='来源：RTE / 路透'))],
    (2, 36): [(1, K('img/J16_rte_crop_erroneous.png', quote='阿里：列入清单是“错误的”', seed=67, src='来源：RTE / 路透'))],
    # ===== 第 3 份 =====
    (3, 1): [(1, S('illus/I07_a.png'))],
    (3, 2): [(2.4, BARS(src='数据：纳斯达克官网日线')), (2.4, C('V26S', 1.0))],
    (3, 3): [(1, C('V24', 11.0))],
    (3, 4): [(1, C('V23', 14.0))],
    (3, 5): [(1, K('img/J17_x_musk_corrected.png', hl=False, maxh=640, seed=69, src='马斯克 X 帖 11/23'))],
    (3, 6): [(1, K('img/J18_x_calacanis.png', hl=False, quote='“GPU Jesus has risen!”', maxh=520, seed=71, src='Jason Calacanis · X'))],
    (3, 7): [(1, K('img/J19_decrypt_crop_cramer.png', quote='克莱默：跌势还会更糟', seed=73, src='来源：Decrypt（网友调侃）'))],
    (3, 8): [(1, C('V03', 1.0))],
    (3, 9): [(1, K('img/J13_pbs_crop_intervention.png', quote='“我的介入非常重要”', seed=75, src='来源：PBS / 美联社'))],
    (3, 10): [(1, K('img/J2_inquirer_nyt.png', hl=False, crop=(0, 0, 1920, 560), quote='对《纽约时报》', maxh=520, seed=77))],
    (3, 11): [(1, K('img/J20_nightly_nyt_crop_sexsells.png', quote='“性比股票好卖”', seed=79, **NYT))],
    (3, 12): [(1, S('illus/I09_a.png'))],
    (3, 13): [(1, K('img/J21_investing_crop_warren.png', quote='沃伦：哪些高层，给了什么“意见”？', seed=81, src='来源：路透各方反应'))],
    (3, 14): [(1.6, C('V27', 1.0, label='杰弗里斯')), (2.4, K('img/J22_jeffries_crop.png', quote='“无法辩护”', seed=83, src='来源：杰弗里斯声明 2026-11-23'))],
    (3, 15): [(1, K('img/J23_cbs_crop_rajgopal.png', quote='“没有哪个董事会能对总统说不”', seed=85, src='哥伦比亚商学院 Shiva Rajgopal（CBS）'))],
    (3, 16): EXT,
    (3, 17): [(1, K('img/J24_abc_holding.png', hl=False, maxh=560, seed=87, src='来源：ABC 新闻 2026-11-23'))],
    (3, 18): [(1, K('img/J24_abc_holding_crop.png', quote='至少 1200 万美元（2025 年底）', seed=89, src='来源：ABC 新闻（年度财产披露）'))],
    (3, 19): [(1, K('img/J24_abc_holding_crop2.png', quote='白宫：由第三方管理', seed=91, src='来源：ABC 新闻'))],
    (3, 20): [(1, S('illus/I08_a.png'))],
    (3, 21): None,   # 运行时决定：有 11/24 收盘就放涨跌柱，没有就放插画
    (3, 22): [(1, S('illus/I09_b.png'))],
    (3, 23): [(1, K('img/J27_abc_timeline_crop_1116.png', date='12/1', date_sub='众议院闭门问询', seed=93, src='来源：ABC 新闻时间线'))],
    (3, 24): [(1, C('V21', 12.0, date='12/3', date_sub='参议院出口管制听证'))],
    (3, 25): [(1, S('illus/I05_a.png', lines=[('独立调查：进行中', 110, WHITE)]))],
    (3, 26): [(1, C('V30', 0.5))],
    (3, 27): [(1, C('V24', 3.0, label='股价：赢了一天'))],
    (3, 28): [(1, C('V23', 22.0, label='黄仁勋：回到了办公室'))],
    (3, 29): [(1, C('V26C', 2.0, label='特朗普：一个可以邀功的周一'))],
    (3, 30): [(1, S('illus/I10_a.png', lines=[('情报疑云？', 110, WHITE), ('芯片流向？', 110, WHITE)]))],
    (3, 31): [(1, S('illus/I04_b.png', lines=[('政府到底保证了什么？', 110, GREEN)]))],
    (3, 32): EXT,
    (3, 33): [(1, C('J29e', 0.5))],
    (3, 34): [(1, S('illus/I12_a.png', lines=[('故事，还远没结束。', 110, WHITE)]))],
}


def has_close_1124():
    return any(d == '2026-11-24' for d, _ in R.load_closes())


SHOTS[(3, 21)] = ([(1, BARS(start='2026-11-03', end='2026-11-24', hi='2026-11-24', src='数据：纳斯达克官网日线'))]
                  if has_close_1124() else [(1, S('illus/I08_b.png', lines=[('第二天：回落', 120, RED)]))])

# ---------------- 时间线 ----------------
COLD, TITLE = 5.05, 1.25
P1_OFF = COLD + TITLE                       # 6.30
P1_END = P1_OFF + 87.456
B1 = (P1_END + 0.10, 'V11', 7.50, 8.70)     # 原声 1：And I really believe him.
P2_OFF = B1[0] + (B1[3] - B1[2]) + 0.45
S2 = 63.40                                   # 第 2 份在这里插原声 2
B2_LEN = 13.40 - 9.00
P2_SHIFT = B2_LEN + 0.20
P3_OFF = P2_OFF + 125.376 + P2_SHIFT + 0.60
S3 = 38.20
B3_LEN = 8.10 - 5.30
P3_SHIFT = B3_LEN + 0.30
END_START = P3_OFF + 107.76 + P3_SHIFT + 0.60
END_LEN = 5.0
TOTAL = END_START + END_LEN


def g(part, t):
    if part == 1:
        return P1_OFF + t
    if part == 2:
        return P2_OFF + t + (P2_SHIFT if t >= S2 else 0)
    return P3_OFF + t + (P3_SHIFT if t >= S3 else 0)


B2_AT = g(2, S2) - P2_SHIFT + 0.05
B3_AT = g(3, S3) - P3_SHIFT + 0.10

LINES = json.load(open(os.path.join(PROJ, '配音', 'lines_aligned.json')))
byp = {1: [], 2: [], 3: []}
for x in LINES:
    byp[x['part']].append(x)
for p in byp:  # 补缺失的起止时间
    L = byp[p]
    for i, x in enumerate(L):
        if x['start'] is None:
            x['start'] = L[i - 1]['end'] + 0.1
        if x['end'] is None:
            x['end'] = L[i + 1]['start'] - 0.1 if i + 1 < len(L) else x['start'] + 1


def build_timeline():
    """返回 [(开始, 时长, 名称, fn)]，镜头首尾相接没有空隙。"""
    T = []
    # 冷开场 + 片名
    cold = [(1.10, C('ABC', 0.0, zoom=(1.0, 1.03))), (1.10, C('V24', 1.5, zoom=(1.04, 1.10))), (1.00, C('V23', 20.0)),
            (0.60, C('CNBC1', 2.0, zoom=(1.05, 1.08))), (1.25, C('V23', 30.0))]
    t = 0.0
    for i, (d, fn) in enumerate(cold):
        T.append((t, d, f'c{i}', fn)); t += d
    T.append((t, TITLE, 't0', TT([('黄仁勋 11 天被请回', 120, GREEN), ('一通电话，董事会为何全票反转？', 64, WHITE)])))
    # 每份旁白的区间
    blocks = [(1, 1, 25, P1_OFF, B1[0]), (2, 1, 18, P2_OFF, B2_AT), (2, 19, 36, B2_AT + B2_LEN + 0.2, P3_OFF),
              (3, 1, 11, P3_OFF, B3_AT), (3, 12, 34, B3_AT + B3_LEN + 0.3, END_START)]
    bites = {B1[0]: ('b1', P2_OFF - B1[0], C('V11', 7.50, label='特朗普原声 · 11/9')),
             B2_AT: ('b2', B2_LEN + 0.2, C('V26C', 9.0, label='特朗普原声 · CNBC 11/23')),
             B3_AT: ('b3', B3_LEN + 0.3, C('V26S', 5.30, label='特朗普原声 · CNBC 11/23'))}
    for part, a, b, start, stop in blocks:
        L = byp[part]
        anchors = [start] + [g(part, L[i - 1]['start']) for i in range(a + 1, b + 1)] + [stop]
        for j, i in enumerate(range(a, b + 1)):
            st, en = anchors[j], anchors[j + 1]
            spec = SHOTS[(part, i)]
            if spec == EXT:
                s0, d0, n0, f0 = T[-1]
                T[-1] = (s0, d0 + (en - st), n0, f0)
                continue
            tot = sum(w for w, _ in spec)
            tt = st
            for k, (w, fn) in enumerate(spec):
                d = (en - st) * w / tot
                T.append((tt, d, f'p{part}_{i:02d}_{k}', fn)); tt += d
        if stop in bites:
            n, d, fn = bites[stop]
            T.append((stop, d, n, fn))
    credits = ['音乐：Kevin MacLeod（incompetech.com）《Volatile Reaction》《Dark Walk》《Thunderbird》CC BY 4.0',
               '印刷机画面：Harrison Keely，Wikimedia Commons，CC BY 4.0；空镜：Mixkit',
               '新闻画面版权归 ABC、CNBC、NBC、PBS、福克斯新闻等原播出机构，仅作评论引用',
               '插画为示意图，非新闻实拍']
    T.append((END_START, END_LEN, 'end', lambda o, d: fx.seg_end(o, d, credits)))
    return T


# ---------------- 字幕 ----------------
NUM = [('十一月八日', '11月8日'), ('十一月十二日', '11月12日'), ('十一月十七日', '11月17日'), ('十二月一日', '12月1日'),
       ('十二月三日', '12月3日'), ('百分之三十一', '31%'), ('百分之三十六', '36%'), ('百分之六点五', '6.5%'),
       ('十一天', '11天'), ('一万名', '1万名')]


def disp(s):
    for a, b in NUM:
        s = s.replace(a, b)
    return s


def chunks(text, maxn=18):
    parts = [x for x in re.split(r'(?<=[，、：；。？！—])', text) if x]
    out, cur = [], ''
    for p in parts:
        if cur and len(cur) + len(p) > maxn:
            out.append(cur); cur = p
        else:
            cur += p
    return out + ([cur] if cur else [])


def build_subs():
    subs = [(0.0, 3.80, '突发新闻：英伟达恢复黄仁勋的 CEO 职务。\\N{\\fs30\\c&HB4B4B4&}Breaking news. NVIDIA has reinstated Jensen Huang as CEO.'),
            (3.85, 5.0, '现在，他回来了。\\N{\\fs30\\c&HB4B4B4&}Now, he\'s back.')]
    for p in (1, 2, 3):
        L = byp[p]
        for i, x in enumerate(L):
            a, b = g(p, x['start']), g(p, x['end']) + 0.15
            if i + 1 < len(L):
                b = min(b, g(p, L[i + 1]['start']) - 0.05)
            cs = chunks(disp(x['text']))
            n = sum(len(c) for c in cs)
            t = a
            for c in cs:
                d = (b - a) * len(c) / n
                subs.append((t, t + d, c.rstrip('，、：；—')))
                t += d
    subs.append((B1[0], B1[0] + 1.2, '“我真的相信他。”\\N{\\fs30\\c&HB4B4B4&}And I really believe him.'))
    subs.append((B2_AT, B2_AT + B2_LEN, '“我跟他们谈了……我说服了他们。”\\N{\\fs30\\c&HB4B4B4&}I spoke to him. Let me just put it that way and I convinced him.'))
    subs.append((B3_AT, B3_AT + B3_LEN, '“因为性就是好卖，伙计们。”\\N{\\fs30\\c&HB4B4B4&}Because sex sells, fellas.'))
    return sorted(subs)


# ---------------- 声音 ----------------
def build_audio(path):
    fx.sfx_whoosh('/tmp/claude-0/jh_fx/whoosh.wav')
    fx.sfx_thud('/tmp/claude-0/jh_fx/thud.wav')
    M = lambda n: R.src_path(f'audio/A1_{n}_macleod.mp3')
    ins, filt, speech, music, sfx = [], [], [], [], []

    def add_in(path):
        ins.extend(['-i', path]); return len(ins) // 2 - 1

    def ms(t):
        return int(round(t * 1000))
    abc = add_in(R.src_path(V['ABC']))
    filt.append(f'[{abc}:a]atrim=0:3.8,asetpts=PTS-STARTPTS,aresample=48000,volume=1.5,adelay={ms(0)}:all=1[s0]'); speech.append('s0')
    abc2 = add_in(R.src_path(V['ABC']))
    filt.append(f'[{abc2}:a]atrim=8.15:9.35,asetpts=PTS-STARTPTS,aresample=48000,volume=1.5,adelay={ms(3.85)}:all=1[s1]'); speech.append('s1')
    vo_chain = 'aresample=48000,highpass=f=70,acompressor=threshold=0.1:ratio=2.5:attack=10:release=200,volume=1.15'
    p1 = add_in(VO[1])
    filt.append(f'[{p1}:a]{vo_chain},adelay={ms(P1_OFF)}:all=1[s2]'); speech.append('s2')
    for k, (key, a, b, at, vol) in enumerate([('V11', 7.50, 8.70, B1[0], 1.6), ('V26C', 9.0, 13.4, B2_AT, 1.4),
                                               ('V26S', 5.30, 8.10, B3_AT, 1.4)]):
        i = add_in(R.src_path(V[key]))
        filt.append(f'[{i}:a]atrim={a}:{b},asetpts=PTS-STARTPTS,aresample=48000,volume={vol},afade=t=in:d=0.05,afade=t=out:st={b - a - 0.08}:d=0.08,adelay={ms(at)}:all=1[b{k}]'); speech.append(f'b{k}')
    for k, (p, a, b) in enumerate([(2, 0, S2), (2, S2, 200), (3, 0, S3), (3, S3, 200)]):
        i = add_in(VO[p])
        filt.append(f'[{i}:a]atrim={a}:{b},asetpts=PTS-STARTPTS,{vo_chain},adelay={ms(g(p, a))}:all=1[v{k}]'); speech.append(f'v{k}')
    # 配乐三段
    t_b = g(2, byp[2][16]['start'])            # “就在所有人都觉得大局已定时”
    for k, (name, a, b) in enumerate([('volatile_reaction', COLD, t_b + 1.5), ('dark_walk', t_b, P3_OFF + 1.0),
                                      ('thunderbird', P3_OFF, TOTAL)]):
        i = add_in(M(name))
        L = b - a
        filt.append(f'[{i}:a]atrim=0:{L},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,volume=0.30,'
                    f'afade=t=in:d=1.2,afade=t=out:st={L - 2.0}:d=2.0,adelay={ms(a)}:all=1[m{k}]'); music.append(f'm{k}')
    # 音效：转场 whoosh、片名 thud
    wh = [COLD - 0.45, g(1, byp[1][9]['start']) - 0.5, P2_OFF - 0.4, t_b - 0.5, P3_OFF - 0.4,
          g(3, byp[3][19]['start']) - 0.5, END_START - 0.4]
    for k, at in enumerate(wh):
        i = add_in('/tmp/claude-0/jh_fx/whoosh.wav')
        filt.append(f'[{i}:a]volume=0.55,adelay={ms(at)}:all=1[w{k}]'); sfx.append(f'w{k}')
    i = add_in('/tmp/claude-0/jh_fx/thud.wav')
    filt.append(f'[{i}:a]volume=0.8,adelay={ms(COLD)}:all=1[th]'); sfx.append('th')
    filt.append(''.join(f'[{x}]' for x in speech) + f'amix=inputs={len(speech)}:normalize=0,aformat=channel_layouts=stereo,apad,atrim=0:{TOTAL}[sp]')
    filt.append('[sp]asplit=2[sp1][key]')
    filt.append(''.join(f'[{x}]' for x in music) + f'amix=inputs={len(music)}:normalize=0,apad,atrim=0:{TOTAL}[mu]')
    filt.append('[mu][key]sidechaincompress=threshold=0.02:ratio=6:attack=20:release=350[mud]')
    filt.append(''.join(f'[{x}]' for x in sfx) + f'amix=inputs={len(sfx)}:normalize=0,apad,atrim=0:{TOTAL}[fx]')
    filt.append('[sp1][mud][fx]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.0:LRA=11,aresample=48000[out]')
    R.ff(ins + ['-filter_complex', ';'.join(filt), '-map', '[out]', '-ac', '2', '-ar', '48000', path])


def main():
    T = build_timeline()
    segs = []
    for st, d, name, fn in T:
        o = os.path.join(SEG, f'{name}.mp4')
        tag = os.path.join(SEG, f'{name}.dur')
        if not (os.path.exists(o) and os.path.exists(tag) and abs(float(open(tag).read()) - d) < 0.01):
            fn(o, d)
            open(tag, 'w').write(f'{d:.4f}')
        segs.append(o)
    master = os.path.join(OUT, 'master.mp4')
    R.concat(segs, master)
    audio = os.path.join(OUT, 'mix.wav')
    build_audio(audio)
    frame_png = os.path.join(OUT, 'frame_vertical.png')
    build_frame(frame_png)
    R.package(master, audio, build_subs(), OUT, frame_png, '黄仁勋复职的十一天_初版v1')
    json.dump([(round(s, 2), round(d, 2), n) for s, d, n, _ in T], open(os.path.join(OUT, 'timeline.json'), 'w'), ensure_ascii=False)
    print('shots', len(T), 'total', round(TOTAL, 2))


if __name__ == '__main__':
    main()
