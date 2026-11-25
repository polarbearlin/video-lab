"""《Anthropic 上市四天破发》完整时间线（删减版文案 v3，用户的豆包配音，原速）。

时间线：冷开场（Bloomberg 原声）→ 日期快闪 → 配音第 1–5 份（第 3 份插达里奥原声，第 4 份插奥特曼原声）→ 片尾署名。
每句旁白的起止时间来自 配音/v1/lines_aligned.json（整条配音按份切开后逐句对齐）。
用法：cd film && VL_OUT=/home/user/anthropic_ipo_film python3 render_parallel.py 4
结构照《黄仁勋复职的十一天》的 example_full.py，镜头表、原声、配乐段落按本片重写；默认纯配乐、不加音效。
"""
import json, os, re, subprocess, hashlib
import render as R
import fx
import charts as CH
from render import GREEN, RED, WHITE
from frame import build as build_frame

PROJ = R.PROJ
OUT = os.path.join(os.environ.get('VL_OUT', os.path.join(R.ROOT, '..', 'film_out')), 'full')
SEG = os.path.join(OUT, 'seg')
os.makedirs(SEG, exist_ok=True)
VOD = os.path.join(PROJ, '配音', os.environ.get('AN_VO', 'v1'))
PARTS = (1, 2, 3, 4, 5)
VO = {p: os.path.join(VOD, f'narrator_part{p}.mp3') for p in PARTS}

# ---------------- 素材 ----------------
V = {k: 'video/' + v for k, v in dict(
    BBG='V01_bloomberg_ant_ticker_open.mp4', CNBCA='V01d_cnbc_options_anchor_below_ipo.mp4',
    FOX='V01e_foxbiz_largest_ipo_record.mp4', FORBES='V01_forbes_falls_below_ipo.mp4',
    BELL='V02_bloomberg_nasdaq_opening_bell.mp4', TSQ='V02b_bloomberg_times_square_screen.mp4', AFP='V02c_afp_opening_bell.mp4',
    PROT='V03_indiatoday_nasdaq_doors_protest.mp4', ARREST='V03b_dws_nasdaq_arrests.mp4', SIGNS='V03c_ap_times_square_signs.mp4',
    D_STAGE='V05a_amodei_nasdaq_stage.mp4', D_SPEECH='V05b_amodei_cnbc_ipo_speech.mp4', D_SORKIN='V05c_amodei_cnbc_sorkin_interview.mp4',
    D_CBS='V05d_amodei_cbs_sunday_morning.mp4', D_WEF1='V05e_amodei_wef_ai_code.mp4', D_WEF2='V05f_amodei_wef_adolescence.mp4',
    D_WEF3='V05g_amodei_wef_confidence.mp4', D_CU='V05h_amodei_cnbc_interview_cu.mp4',
    SPX='V09_spacex_nasdaq_opening_bell.mp4', SPX2='V09b_spacex_first_trade_floor.mp4', CHART='V10_bloomberg_falls_below_ipo.mp4',
    COF='V14_amodei_cofounders_table.mp4', CNN='V16_amodei_cnn_entry_level_jobs.mp4', LIE='V20_amodei_outrageous_lie.mp4',
    PACE='V21_cnbc_amodei_pacing_miles.mp4', ALT='V30_altman_dealbook_public_company.mp4',
    FB1='V34a_cbs_zuck_rings_bell.mp4', FB2='V34b_cbs_facebook_falls_below_ipo.mp4',
    STOCK='JH_V03_mixkit_stock_screen.mp4', JH_B='JH_J29b_GTCBerlin2026_medium.mp4', JH_D='JH_J29d_GTCBerlin2026_gesture.mp4',
    JH_E='JH_J29e_GTCBerlin2026_wide.mp4', S1='V07_bloomberg_s1_revenue.mp4', DC='V08_google_data_center.mp4',
    WS1='V12a_wall_street_sign.mp4', WS2='V12b_wall_street_canyon.mp4', ALT_A='V13a_altman_safety_ahead.mp4',
    ALT_C='V13c_altman_safety_claims.mp4', CC='V17b_anthropic_claude_code_talk.mp4', SPEED='V22a_speedometer.mp4',
    HWY='V22b_night_highway.mp4', SEN='V23_amodei_senate_opening.mp4', HUANG='V24_huang_china_export_controls.mp4',
    DAIS='V28_senate_hearing_dais_wide.mp4', HACK='V29_anthropic_hackathon.mp4', INV='V31a_investor_screens.mp4',
    FALL='V31b_falling_chart.mp4', MSN='V32_msnow_axios_employee_warning.mp4', SRV='V33a_server_hallway.mp4',
    RACK='V33b_server_racks.mp4', TSN='V35a_times_square_night.mp4', DIVE='V35b_underwater_dive.mp4').items()}
_dur = {}


def vdur(rel):
    if rel not in _dur:
        _dur[rel] = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0',
                                          R.src_path(rel)], capture_output=True, text=True).stdout)
    return _dur[rel]


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


def G(fn, *a, **kw):
    return lambda o, d: fn(o, d, *a, **kw)


EXT = 'EXT'
I = lambda n: f'illus/I{n:02d}.png' if n != 1 else 'illus/I01_a.png'
AXIOS = dict(src='来源：Axios 2026-11-24（存档页）')

# ---------------- 镜头表：(份, 句) -> [(权重, 镜头)] ----------------
SHOTS = {
    # ===== 第 1 份 · 钩子 =====
    (1, 1): [(1, C('D_WEF2', 1.0, label='达里奥·阿莫代伊 · 达沃斯'))],
    (1, 2): [(1, C('BELL', 2.0))],
    (1, 3): [(1, G(CH.seg_bigcount, 1800, ' 亿美元', '七位创始人 · 一夜身家', '按首日股价估算'))],
    (1, 4): [(1, C('TSQ', 2.0))],
    (1, 5): [(1.2, C('SPX', 3.0, label='马斯克的 SpaceX · 6 月上市')), (1.4, C('FOX', 0.0))],
    (1, 6): [(1.6, C('FORBES', 1.0)), (1.2, S(I(3)))],
    (1, 7): [(1, C('PROT', 2.0, label='11/19 · 纳斯达克门口'))],
    (1, 8): [(1, C('ARREST', 2.0))],
    (1, 9): [(1.3, K('img/V03_sfstandard_misanthropic_certificate.jpg', hl=False, quote='恶搞股票：“Misanthropic”', src='同日 · 旧金山总部外（旧金山标准报）', maxh=520)),
             (1.2, K('img/J06_guardian_protest_crop.png', quote='《卫报》：一张“反人类公司”的假股票', src='来源：《卫报》2026-11-19', seed=5, rot=1.0))],
    (1, 10): [(1, C('D_SPEECH', 2.0))],
    (1, 11): [(1, C('D_CBS', 1.0))],
    (1, 12): [(1, S(I(1)))],
    # ===== 第 2 份 · 第一幕 =====
    (2, 1): [(1, C('AFP', 3.0, date='11/19', date_sub='纳斯达克上市'))],
    (2, 2): [(1, C('BELL', 14.0))],
    (2, 3): [(1, G(CH.seg_bigcount, 810, ' 亿美元+', '募资 · 史上最大 IPO', '超过 SpaceX 6 月的 750 亿'))],
    (2, 4): [(1, C('FOX', 8.0, label='福克斯商业：估值超过 2 万亿'))],
    (2, 5): [(1, C('S1', 2.0, label='彭博：营收增长'))],
    (2, 6): [(1, G(CH.seg_compare, '前九个月营收', ('2025 年', 25), ('2026 年', 332), ' 亿美元', src='来源：Anthropic 招股书'))],
    (2, 7): EXT, (2, 8): EXT,
    (2, 9): [(1, C('S1', 12.0))],
    (2, 10): [(1, G(CH.seg_loss))],
    (2, 11): EXT,
    (2, 12): [(1, C('DC', 3.0, label='资料画面：数据中心')), (1, S(I(4)))],
    (2, 13): [(1, C('WS1', 3.0))],
    (2, 14): [(1, C('SPX2', 2.0, label='SpaceX · 2026 年 6 月上市'))],
    (2, 15): [(1, G(CH.seg_compare, '上市多久跌破发行价', ('SpaceX', 21), ('Anthropic', 4), ' 个交易日', src='数据：雅虎财经', note='快了五倍'))],
    (2, 16): EXT,
    (2, 17): [(1, G(CH.seg_price))],
    (2, 18): EXT,
    (2, 19): [(1, C('CHART', 2.0))],
    (2, 20): [(1, C('CNBCA', 0.5))],
    (2, 21): [(1, C('D_WEF3', 0.5))],
    # ===== 第 3 份 · 第二幕 =====
    (3, 1): [(1, C('D_WEF1', 1.0, label='达里奥·阿莫代伊 · Anthropic CEO'))],
    (3, 2): [(1, C('ALT_C', 2.0, label='萨姆·奥特曼 · OpenAI CEO'))],
    (3, 3): [(1, C('COF', 1.0, date='2021', date_sub='出走 OpenAI'))],
    (3, 4): [(1, S(I(5)))],
    (3, 5): [(1, C('COF', 9.0))],
    (3, 6): [(1, C('ALT_A', 2.0))], (3, 7): EXT,
    (3, 8): [(1, TT([('公益公司', 200, GREEN)], sub='Public Benefit Corporation'))],
    (3, 9): [(1, G(CH.seg_bigcount, 80, '%', '七位创始人承诺捐出的股权', '来源：招股书', fmt='{:.0f}'))],
    (3, 10): [(1, S(I(6)))], (3, 11): EXT,
    (3, 12): [(1, C('CNN', 2.0, label='CNN · 2025 年 5 月'))],
    (3, 13): [(1, TT([('“模型过于强大', 110, WHITE), ('可能带来灾难性风险”', 110, GREEN)], sub='写进了上市招股书的风险提示'))],
    (3, 14): [(1, S(I(1)))],
    (3, 15): [(1, C('CC', 3.0, label='Anthropic 发布会'))], (3, 16): EXT,
    (3, 17): [(1, C('JH_B', 0.5, label='黄仁勋 · 英伟达 CEO'))],
    (3, 18): [(1.4, TT([('“他觉得 AI 非常可怕，', 92, WHITE), ('所以只有他们才配做。”', 92, GREEN)], sub='黄仁勋 · 2025 年 6 月 巴黎 VivaTech（大意）')),
              (1, C('JH_D', 1.0))],
    (3, 20): [(1, C('LIE', 1.0, label='Big Technology 播客 · 2025 年 7 月'))],
    (3, 21): [(1, C('PACE', 0.5, label='11/19 · CNBC'))],
    (3, 22): [(1, G(CH.seg_speedo))], (3, 23): EXT, (3, 24): EXT,
    (3, 25): [(1, C('PACE', 20.0))],
    (3, 26): [(1, C('HWY', 3.0))],
    (3, 27): [(1, S(I(2)))],
    (3, 28): [(1, C('SPEED', 2.0)), (1.2, S(I(1), lines=[('60 → 90', 170, GREEN)]))],
    # ===== 第 4 份 · 暗线与三个猜测 =====
    (4, 1): [(1, C('TSN', 2.0))], (4, 2): EXT,
    (4, 3): [(1, S(I(7), lines=[('暗线一：路线死磕', 110, WHITE)]))],
    (4, 4): [(1, C('SEN', 3.0, label='2023 年 · 美国参议院听证'))],
    (4, 5): [(1, C('HUANG', 4.0, label='黄仁勋 · 英伟达 CEO'))],
    (4, 6): [(1, TT([('暗线二', 120, GREEN), ('开发者生态的反弹', 110, WHITE)]))],
    (4, 7): [(1, C('D_SORKIN', 6.0))],
    (4, 8): [(1, TT([('拿全网公开数据训练模型', 96, WHITE)]))],
    (4, 9): [(1, TT([('却禁止对手“蒸馏”它的输出', 96, GREEN)]))],
    (4, 10): [(1, C('SIGNS', 2.0))],
    (4, 11): [(1, C('ARREST', 10.0))],
    (4, 12): [(1, TT([('《反 Anthropic 宣言》', 120, GREEN)], sub='上市前夕 · 联名发布'))],
    (4, 13): [(1, C('PROT', 12.0))],
    (4, 14): [(1, TT([('“为了更大善意”', 120, GREEN), ('→ 聚拢权力', 110, WHITE)], sub='宣言的指责'))],
    (4, 15): [(1, C('CNBCA', 6.0))],
    (4, 16): [(1, S(I(8), lines=[('猜测一', 100, GREEN), ('安全叙事 = 护城河？', 100, WHITE)]))],
    (4, 17): EXT,
    (4, 18): [(1, C('DAIS', 2.0, label='资料画面：美国参议院'))],
    (4, 19): [(1, S(I(8)))], (4, 20): [(1, C('HACK', 4.0))],
    (4, 21): [(1, C('BELL', 20.0))], (4, 22): EXT,
    (4, 23): [(1, S(I(9), lines=[('猜测二', 100, GREEN), ('为什么抢跑上市？', 100, WHITE)]))],
    (4, 24): [(1, C('ALT', 13.0, date='11/18', date_sub='DealBook 峰会'))],
    (4, 25): [(1, C('ALT', 0.0))],
    (4, 26): [(1, S(I(9)))], (4, 27): EXT,
    (4, 28): [(1, C('INV', 2.0))],
    (4, 29): [(1, S(I(10), lines=[('猜测三', 100, GREEN), ('实验室兜不住了？', 100, WHITE)]))], (4, 30): EXT,
    (4, 31): [(1, K('img/J19_axios_live_title_lede.png', hl=False, date='11/24', date_sub='Axios 独家', maxh=520, **AXIOS))],
    (4, 32): [(1, C('MSN', 2.0))],
    (4, 33): [(1, K('img/J19_axios_employee_warning_crop.png', quote='据 Axios：二十多位知情人士', seed=9, **AXIOS))],
    (4, 34): [(1, S(I(10), lines=[('据报道：内部模型', 90, WHITE), ('会给监督者编“掩护说辞”', 96, GREEN)]))],
    (4, 35): [(1, C('FALL', 2.0))],
    (4, 36): [(1, C('SRV', 2.0))], (4, 37): [(1, S(I(10)))],
    # ===== 第 5 份 · 结尾 =====
    (5, 1): [(1, C('AFP', 20.0))],
    (5, 2): [(1, C('FB1', 2.0, label='2012 年 5 月 · Facebook 上市'))],
    (5, 3): [(1, C('FB2', 3.0, label='资料画面'))],
    (5, 4): [(1, C('BELL', 4.0))],
    (5, 5): [(1, C('D_STAGE', 4.0))],
    (5, 6): [(1, C('D_SORKIN', 8.0))],
    (5, 7): [(1, C('WS2', 2.0))],
    (5, 8): [(1, S(I(11)))], (5, 9): EXT,
    (5, 10): [(1, C('ALT', 14.0))],
    (5, 11): [(1, C('DIVE', 2.0))], (5, 12): [(1, S(I(12)))],
}

# ---------------- 配音逐句时间 ----------------
VO_LEN = {p: float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', VO[p]],
                                  capture_output=True, text=True).stdout) for p in PARTS}
byp = {p: [] for p in PARTS}
for x in json.load(open(os.path.join(VOD, 'lines_aligned.json'))):
    byp[x['part']].append(x)
IDX = {p: list(range(1, len(byp[p]) + 1)) for p in PARTS}     # 原始句号（和 SHOTS 的键一致）
for p in PARTS:   # 只有标点的行（如单独一个”）并到上一句，不单独占镜头
    keep = []
    for i, x in zip(IDX[p], byp[p]):
        if x['start'] is None and not re.sub(r'[“”"‘’，。、：；？！—\s]', '', x['text']):
            keep[-1][1]['text'] += x['text']
            continue
        keep.append((i, x))
    IDX[p], byp[p] = [i for i, _ in keep], [x for _, x in keep]


def silences(part, min_len=0.12):
    import librosa, numpy as np
    y, sr = librosa.load(VO[part], sr=16000, mono=True)
    r = librosa.feature.rms(y=y, frame_length=400, hop_length=160)[0]
    db = 20 * np.log10(r + 1e-7); thr = db.max() - 38
    out, st = [], None
    for i, q in enumerate(db < thr):
        if q and st is None: st = i
        if (not q or i == len(db) - 1) and st is not None:
            if (i - st) * 0.01 >= min_len: out.append((st * 0.01, i * 0.01))
            st = None
    return out


for p in PARTS:
    L = byp[p]
    for i, x in enumerate(L):
        if x['start'] is None:
            x['start'] = L[i - 1]['end'] + 0.1
        if x['end'] is None:
            x['end'] = L[i + 1]['start'] - 0.1 if i + 1 < len(L) else x['start'] + 1
    sil = silences(p)
    for i in range(len(L) - 1):
        e, s2 = L[i]['end'], L[i + 1]['start']
        cand = [(a0, b0) for a0, b0 in sil if a0 <= max(e, s2) + 0.6 and b0 >= min(e, s2) - 0.6]
        if cand:
            a0, b0 = min(cand, key=lambda z: abs((z[0] + z[1]) / 2 - (e + s2) / 2))
            L[i]['end'], L[i + 1]['start'] = a0, b0


def line(p, i):
    return byp[p][IDX[p].index(i)]


# 原声：(镜头键, 原片起, 原片止, 中文字幕, 英文原话)；插在 (份, 句) 之后，剪接点在两句之间静音的中点
BITES = {   # (份, 句) 之后插入：(镜头键, 原片起, 原片止, 中文字幕, 英文原话, 画面标签)
    (1, 6): ('CNBCA', 2.30, 4.55, '“Anthropic 股价跌了 9%。”', 'See Anthropic shares down 9%.', 'CNBC · 11/24'),
    (1, 9): ('SIGNS', 3.50, 7.45, '“等 AI 泡沫破了，谁来接盘？”', "When the AI bubble bursts, who's going to be holding the bag, right?", '时代广场抗议者 · 美联社'),
    (2, 3): ('FOX', 4.10, 7.20, '“我们说的是 813.4 亿美元。”', "We're talking $81.34 billion.", '福克斯商业 · 11/19'),
    (2, 8): ('S1', 3.80, 6.70, '“营收增长可能不可持续。”', 'Revenue growth might not be sustainable.', '彭博 · 招股书解读'),
    (2, 19): ('CHART', 1.25, 9.15, '“投资者对纯 AI 概念股，没有原先想的那么有把握。”', "We've seen investors not really as sure of the pure play AI trade as we thought they might be.", '彭博 · 11/24'),
    (3, 8): ('SEN', 2.45, 4.40, '“Anthropic 是一家公益公司。”', 'Anthropic is a public benefit corporation.', '达里奥 · 2023 年参议院听证'),
    (3, 12): ('CNN', 2.20, 11.90, '“我真的担心入门级岗位：AI 正在做入门员工的核心工作。”', 'I really worry, particularly at the entry level, that the AI models are very much at the center of what an entry-level human worker would do.', '达里奥 · CNN'),
    (3, 20): ('LIE', 5.45, 8.15, '“这是我听过最离谱的谎言。”', "That's the most outrageous lie I've ever heard.", '达里奥 · Big Technology 播客'),
    (3, 25): ('PACE', 18.30, 23.65, '“我们本可以开到 200 英里，那就只开 90 英里吧。”', 'We could drive at 200 miles an hour, maybe let\'s only drive at 90 miles an hour.', '达里奥 · CNBC 11/19'),
    (4, 5): ('HUANG', 27.50, 30.80, '“全世界一半的 AI 研究人员在中国。”', 'China is home to 50% of the AI researchers in the world.', '黄仁勋 · CNBC'),
    (4, 25): ('ALT', 0.40, 5.30, '“我们计划在某个时候成为上市公司。”', 'I mean, we plan to be a public company at some point.', '奥特曼 · DealBook 11/18'),
    (4, 34): ('MSN', 0.00, 8.95, '“Anthropic 和 OpenAI 未发布的模型越来越强，一些员工已不相信它们能安全发布。”', 'Unreleased AI models from Anthropic and OpenAI are becoming so powerful that some employees no longer believe they can be safely released.', 'MSNOW · 11/24'),
}
CUT = {p: [] for p in PARTS}
for (p, i), b in BITES.items():
    nxt = IDX[p][IDX[p].index(i) + 1]
    CUT[p].append(((line(p, i)['end'] + line(p, nxt)['start']) / 2, i, b))

# ---------------- 时间线 ----------------
COLD, TITLE, GAP, BGAP = 6.75, 1.30, 0.12, 0.30
PIECES = []    # ('vo', 份, 源起, 源止, 全片起) / ('bite', 键, 源起, 源止, 全片起, 中文, 英文)
t = COLD + TITLE
for p in PARTS:
    a = 0.0
    for c, i, (key, b0, b1, zh, en, lab) in sorted(CUT[p]):
        PIECES.append(('vo', p, a, c, t)); t += c - a + BGAP
        PIECES.append(('bite', key, b0, b1, t, zh, en, lab)); t += b1 - b0 + BGAP
        a = c
    PIECES.append(('vo', p, a, VO_LEN[p], t)); t += VO_LEN[p] - a + GAP
END_START, END_LEN = t + 0.4, 4.5
TOTAL = END_START + END_LEN


def g(part, s):
    for pc in PIECES:
        if pc[0] == 'vo' and pc[1] == part and pc[2] <= s < pc[3] + 1e-6:
            return pc[4] + s - pc[2]
    last = [pc for pc in PIECES if pc[0] == 'vo' and pc[1] == part][-1]
    return last[4] + s - last[2]


def build_timeline():
    T = []
    cold = [(1.30, C('BBG', 0.0, zoom=(1.0, 1.04))), (1.35, C('FORBES', 0.5)), (1.30, C('CHART', 4.0)),
            (1.30, C('ARREST', 4.0)), (1.50, C('BELL', 2.0))]
    tt = 0.0
    for i, (d, fn) in enumerate(cold):
        T.append((tt, d, f'c{i}', fn)); tt += d
    T.append((tt, TITLE, 't0', TT([('11/19 上市', 100, WHITE), ('11/24 破发', 150, GREEN)])))
    for n, pc in enumerate(PIECES):
        stop = PIECES[n + 1][4] if n + 1 < len(PIECES) else END_START
        if pc[0] == 'bite':
            key, b0, b1, st = pc[1], pc[2], pc[3], pc[4]
            T.append((st, stop - st, f'b_{key}', C(key, b0, label='原声 · ' + pc[7])))
            continue
        _, p, a, b, st = pc
        idx = [i for i in IDX[p] if a - 1e-6 <= line(p, i)['start'] < b]
        anchors = [st] + [g(p, line(p, i)['start']) for i in idx[1:]] + [stop]
        for j, i in enumerate(idx):
            s0, e0 = anchors[j], anchors[j + 1]
            spec = SHOTS[(p, i)]
            if spec == EXT:
                s1, d1, n1, f1 = T[-1]
                T[-1] = (s1, d1 + (e0 - s0), n1, f1)
                continue
            tot = sum(w for w, _ in spec)
            x = s0
            for k, (w, fn) in enumerate(spec):
                d = (e0 - s0) * w / tot
                T.append((x, d, f'p{p}_{i:02d}_{k}', fn)); x += d
    credits = ['配乐：Suno 定制纯音乐', '新闻画面版权归 Bloomberg、CNBC、福克斯商业、CBS、CNN、法新社、India Today 等原播出机构，仅作评论引用',
               '图片：《卫报》、旧金山标准报；数据：雅虎财经、Anthropic 招股书', '插画为 AI 生成的示意图，非新闻实拍', '',
               '你觉得 AI 是泡沫，还是才刚开始？评论区聊聊。']
    T.append((END_START, END_LEN,
              'end_' + hashlib.md5('|'.join(credits).encode()).hexdigest()[:6], lambda o, d: fx.seg_end(o, d, credits)))
    return T


# ---------------- 字幕 ----------------
NUM = [('二零二六年十一月十九日', '2026年11月19日'), ('十一月二十四日', '11月24日'), ('二零二一年', '2021年'), ('十一月', '11月'),
       ('一千八百亿', '1800亿'), ('八百一十亿', '810亿'), ('两万亿', '2万亿'), ('二十五亿', '25亿'), ('三百三十二亿', '332亿'),
       ('一千零四十亿', '1040亿'), ('九百四十多亿', '940多亿'), ('二十一个', '21个'), ('八十三美元', '83美元'),
       ('百分之八十', '80%'), ('六十英里', '60英里'), ('两百英里', '200英里'), ('九十英里', '90英里'), ('一万多亿', '1万多亿'),
       ('八百亿', '800亿'), ('四个交易日', '4个交易日'), ('四天', '4天'), ('七个', '7个'), ('六月', '6月'),
       ('首席执行官', 'CEO'), ('阿克西奥斯新闻网', 'Axios'), ('脸书', 'Facebook'),
       ('“欺骗试图控制它的人类”', '欺骗试图控制它的人类')]   # Axios 原文不是这句原话，字幕不加引号


def disp(s):
    for a, b in NUM:
        s = s.replace(a, b)
    return re.sub(r'\s+', ' ', s).replace(' CEO ', ' CEO ').strip()


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
    subs = [(0.0, 4.1, 'Anthropic 完成了史上最大的 IPO。\\N{\\fs30\\c&HB4B4B4&}Anthropic raised the largest IPO offering on record.'),
            (4.2, 6.7, '股价跌破了 83 美元发行价。\\N{\\fs30\\c&HB4B4B4&}Shares fell below their $83 IPO price.')]
    for p in PARTS:
        L = byp[p]
        for i, x in enumerate(L):
            a, b = g(p, x['start']), g(p, x['end']) + 0.15
            if i + 1 < len(L):
                b = min(b, g(p, L[i + 1]['start']) - 0.05)
            cs = chunks(disp(x['text']))
            n = sum(len(c) for c in cs)
            tt = a
            for c in cs:
                d = (b - a) * len(c) / n
                subs.append((tt, tt + d, c.rstrip('，、：；—')))
                tt += d
    for pc in PIECES:
        if pc[0] == 'bite':
            subs.append((pc[4], pc[4] + pc[3] - pc[2], f'{pc[5]}\\N{{\\fs30\\c&HB4B4B4&}}{pc[6]}'))
    return sorted(subs)


# ---------------- 声音 ----------------
def L0(p, i):
    return g(p, line(p, i)['start'])


def L1(p, i):
    return g(p, line(p, i)['end'])


def build_audio(path):
    import score
    speech = [(R.src_path(V['FOX']), 0.0, 4.08, 0.0, -16.0, False),        # 冷开场：史上最大 IPO → 跌破发行价（黄金 5 秒：第一句就点题）
              (R.src_path(V['BBG']), 1.82, 4.30, 4.20, -16.0, False)]
    for pc in PIECES:
        if pc[0] == 'vo':
            speech.append((VO[pc[1]], pc[2], pc[3], pc[4], -16.0, True))
        else:
            speech.append((R.src_path(V[pc[1]]), pc[2], pc[3], pc[4], -17.5, False))
    SA, SB = R.src_path('audio/suno/suno_a.mp3'), R.src_path('audio/suno/suno_b.mp3')
    BARS = json.load(open(R.src_path('audio/suno/bars.json')))

    def snap(seglist):
        out = []
        for pth, a, b in seglist:
            bars = BARS['suno_a' if pth == SA else 'suno_b']['bars']
            f = lambda x: min(bars, key=lambda y: abs(y - x)) if min(abs(y - x) for y in bars) < 0.4 else x
            out.append((pth, f(a), f(b)))
        return out
    t1 = L0(2, 1)          # 第一幕
    t2 = L0(3, 1)          # 第二幕：出走、理想主义
    t3 = L0(3, 10)         # 可现实的撕裂感
    t4 = L0(4, 1)          # 暗线
    t5 = L0(4, 15)         # 三个猜测
    t6 = L0(5, 1)          # 结尾
    cues = [dict(segments=snap([(SB, 67.3, 105.7), (SB, 86.6, 105.7)]), start=COLD, end=t1, level=-7, fade_in=0.05),        # 钩子：暗色满编
            dict(segments=snap([(SA, 19.4, 67.4), (SA, 38.6, 67.4)]), start=t1, end=t2, level=-8),                        # 第一幕：推进
            dict(segments=snap([(SA, 0.16, 67.4)]), start=t2, end=t3, level=-8),                                          # 出走：轻→推进
            dict(segments=snap([(SA, 86.6, 134.6), (SA, 105.8, 134.6)]), start=t3, end=t4, level=-8),                     # 撕裂：持续推进
            dict(segments=snap([(SB, 0.0, 19.4), (SB, 57.8, 67.3), (SA, 77.0, 86.6), (SB, 0.0, 19.4)]), start=t4, end=t5, level=-8),  # 暗线：稀疏
            dict(segments=snap([(SB, 105.7, 125.0), (SB, 67.3, 105.7), (SB, 86.6, 105.7)]), start=t5, end=t6, level=-8),  # 三个猜测：压力
            dict(segments=snap([(SB, 134.6, 175.3), (SA, 134.6, 162.4)]), start=t6, end=TOTAL - 0.2, level=-9, align='end', fade_out=0.6)]  # 结尾
    for c in cues[:-1]:
        c['fade_in'] = max(c.get('fade_in', 0.35), 0.15)
        c['fade_out'] = 0.8
    bites = [pc for pc in PIECES if pc[0] == 'bite']
    drops = [(COLD - 6.75, 6.64, 0.35, 0.05, 0.6)]   # 冷开场主播原声下配乐压低
    for pc in bites:
        drops.append((pc[4] - 0.3, pc[4] + pc[3] - pc[2] + 0.3, 0.3, 0.3, 0.7))
    drops += [(L0(3, 28) - 0.4, L1(3, 28) + 0.4, 0.2, 0.35, 0.9),      # 加速到了九十英里
              (L0(4, 37) - 0.4, L1(4, 37) + 0.5, 0.2, 0.35, 0.9),      # 心里不发毛才怪
              (L0(5, 9) - 0.45, L1(5, 9) + 0.45, 0.18, 0.4, 1.0),      # 资本市场从来只认一个答案
              (L0(5, 12) - 0.5, TOTAL, 0.3, 0.6, 0.1)]                 # 最后一问
    score.build_mix(path, TOTAL, speech, cues, drops, [])


TL = []


def main():
    T = build_timeline()
    TL.extend(T)
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
    R.package(master, audio, build_subs(), OUT, frame_png, os.environ.get('AN_NAME', 'Anthropic上市四天破发_v3'), which=('v',))
    json.dump([(round(s, 2), round(d, 2), n) for s, d, n, _ in T], open(os.path.join(OUT, 'timeline.json'), 'w'), ensure_ascii=False)
    print('shots', len(T), 'total', round(TOTAL, 2))


if __name__ == '__main__':
    main()
