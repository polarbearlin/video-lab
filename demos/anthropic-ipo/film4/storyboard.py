"""整片 v4（新方法）的分镜表：一份表同时驱动底层视频轨（compose.py）和网页图层（index.html）。

时间完全沿用 film/full.py 的时间线（同一条配音、同样 12 段原声），所以音频、字幕直接复用 v3。
每条：(起点, 终点, 底层, 图层)
  起点 / 终点：'cold' 'title' 'end'、(份, 句) 旁白句、('bite', 键) 原声段；终点那句也包含在内。
  底层：('clip', 素材键, 原片入点) / ('framed', 素材键, 入点) / ('illus', 'Pxx') / ('ground',) 纯底纹
  图层：(组件名, {参数})，组件在 index.html 的 COMP 里；None 表示只有全局漏光和颗粒。
用法：python3 storyboard.py → storyboard.json（并检查镜头首尾相接）
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'film'))
os.environ.setdefault('VL_OUT', '/home/user/anthropic_ipo_film')
import full as F

# ---------- 每句旁白、每段原声在全片里的起止 ----------
SPAN = {}
for n, pc in enumerate(F.PIECES):
    stop = F.PIECES[n + 1][4] if n + 1 < len(F.PIECES) else F.END_START
    if pc[0] == 'bite':
        SPAN[('bite', pc[1])] = (pc[4], stop)
        continue
    _, p, a, b, st = pc
    idx = [i for i in F.IDX[p] if a - 1e-6 <= F.line(p, i)['start'] < b]
    anchors = [st] + [F.g(p, F.line(p, i)['start']) for i in idx[1:]] + [stop]
    for j, i in enumerate(idx):
        SPAN[(p, i)] = (anchors[j], anchors[j + 1])
SPAN['cold'] = (0.0, F.COLD)
SPAN['title'] = (F.COLD, F.COLD + F.TITLE)
SPAN['end'] = (F.END_START, F.TOTAL)


def span(k0, k1=None):
    return SPAN[k0][0], SPAN[k1 or k0][1]


# ---------- 常用 ----------
def tag(html, pos='tl', **kw): return ('tag', dict(html=html, pos=pos, **kw))
def bite(html): return ('tag', dict(html=f'<span class="k">原声</span>{html}', pos='tl', small=True))
def label(): return ('label', {})
SRC_S1 = '来源：Anthropic 招股书（前九个月）'

# 冷开场快切：Bloomberg 主播原声垫底，14 个画面越切越快（素材键, 入点, 相对时长）
_C = [('FOX', 0.0, 2.1), ('BELL', 10.0, 2.0), ('BBG', 1.9, .95), ('FORBES', 1.0, .9), ('CHART', 4.0, .8)]   # 跟着两句原声走
_k = F.COLD / sum(x[2] for x in _C)
COLD_CUTS = [[k, t, round(d * _k, 3)] for k, t, d in _C]
COLD_CUTS[-1][2] = round(F.COLD - sum(x[2] for x in COLD_CUTS[:-1]), 3)

B = [
    # ===== 冷开场、片名 =====
    ('cold', None, ('cold', COLD_CUTS), None),
    ('title', None, ('ground',), ('title_ipo', {})),
    # ===== 第 1 份 · 钩子（试片同款）=====
    ((1, 1), None, ('illus', 'P01'), ('quote', dict(text='“AI 可能会毁灭人类”'))),
    ((1, 2), None, ('framed', 'BELL', 2.0), ('tag', dict(html='<span class="k">11/19</span><b>7</b> 位联合创始人 · 纳斯达克敲钟', pos='bl'))),
    ((1, 3), None, ('illus', 'P02'), ('counter', dict(value=1800, unit=' 亿美元', sub='七位创始人 · 一夜身家<span class="m">（按首日股价估算）</span>'))),
    ((1, 4), (1, 5), ('ground',), ('compare_cards', dict(cards=[['assets/spacex.jpg', 'SpaceX · 750 亿美元', '2026.06'], ['assets/anth.jpg', 'Anthropic · 813 亿美元', '2026.11']], first='此前纪录', stamp='史上最大 IPO'))),
    ((1, 6), None, ('illus', 'P03'), ('price_overlay', dict(stamp='4 个交易日'))),
    (('bite', 'CNBCA'), None, ('clip', 'CNBCA', 2.30), bite('CNBC · 11/24')),
    ((1, 7), None, ('clip', 'PROT', 2.0), tag('<span class="k">11/19</span>纳斯达克门外 · 抗议者被警方带走')),
    ((1, 8), None, ('clip', 'ARREST', 2.0), None),
    ((1, 9), None, ('ground',), ('doc', dict(img='assets/guardian.jpg', w=1320, hl=[[32, 202, 1160, 58]], tr='一名抗议者举着一张<b>“反人类公司（Misanthropic）”</b>的假股票', tr_y=290,
                                                photo=['assets/cert.jpg', '恶搞股票证书', '同日 · 旧金山总部外'], src='来源：《卫报》2026-11-19；照片：旧金山标准报'))),
    (('bite', 'SIGNS'), None, ('clip', 'SIGNS', 3.50), bite('时代广场抗议者 · 美联社')),
    ((1, 10), None, ('illus', 'P04'), ('letters', dict(text='ANTHROPIC', sub='成立 5 年 · 首日估值一度 2 万亿美元'))),
    ((1, 11), None, ('illus', 'P05'), ('stamp_only', dict(text='“拯救人类”', at=1.0, light=True))),
    ((1, 12), None, ('illus', 'P06'), ('headline', dict(html='<span style="color:#F3B35A">华尔街</span>最分裂的<span style="color:#E8341F">大戏</span>'))),
    # ===== 第 2 份 · 第一幕 =====
    ((2, 1), None, ('framed', 'AFP', 3.0), tag('<span class="k">2026.11.19</span>Anthropic 登陆纳斯达克', pos='bl')),
    ((2, 2), None, ('clip', 'BELL', 14.0), None),
    ((2, 3), None, ('illus', 'P07'), ('counter', dict(value=810, unit=' 亿美元+', sub='募资 · 史上最大 IPO'))),
    (('bite', 'FOX'), None, ('clip', 'FOX', 4.10), bite('福克斯商业 · 11/19')),
    ((2, 4), None, ('clip', 'FOX', 8.0), tag('首日估值一度超过 <b>2 万亿美元</b>', pos='bl')),
    ((2, 5), None, ('illus', 'P08'), None),
    ((2, 6), (2, 8), ('ground',), ('bars', dict(title='前九个月营收', items=[['2025 年', 25], ['2026 年', 332]], unit='亿美元', note='一年涨了 13 倍', src=SRC_S1))),
    (('bite', 'S1'), None, ('clip', 'S1', 3.80), bite('彭博 · 招股书解读')),
    ((2, 9), None, ('illus', 'P09'), None),
    ((2, 10), (2, 11), ('ground',), ('loss', dict(src=SRC_S1))),
    ((2, 12), None, ('clip', 'DC', 3.0), tag('资料画面：数据中心', small=True)),
    ((2, 13), None, ('clip', 'WS1', 3.0), None),
    ((2, 14), None, ('clip', 'SPX2', 2.0), tag('<span class="k">2026.06</span>SpaceX 上市', pos='bl')),
    ((2, 15), (2, 16), ('ground',), ('calendar', dict(a=['SpaceX', 21], b=['Anthropic', 4]))),
    ((2, 17), (2, 18), ('ground',), ('price_full', {})),
    ((2, 19), None, ('clip', 'CHART', 2.0), None),
    (('bite', 'CHART'), None, ('clip', 'CHART', 1.25), bite('彭博 · 11/24')),
    ((2, 20), None, ('illus', 'P10'), None),
    ((2, 21), None, ('illus', 'P11'), ('quote', dict(text='一个拧巴到极点的死结'))),
    # ===== 第 3 份 · 第二幕 =====
    ((3, 1), None, ('ground',), ('resume', dict(img='assets/dario.jpg', name='Dario Amodei', cn='达里奥·阿莫代伊', lines=['Anthropic 联合创始人、CEO', '前 OpenAI 研究副总裁', '普林斯顿 生物物理学博士']))),
    ((3, 2), None, ('ground',), ('duo', dict(a=['assets/dario.jpg', '达里奥·阿莫代伊', 'Anthropic'], b=['assets/altman.jpg', '萨姆·奥特曼', 'OpenAI'], link='老东家 · 老对手'))),
    ((3, 3), (3, 4), ('illus', 'P12'), ('stamp_only', dict(text='2021 出走', at=.4))),
    ((3, 5), (3, 7), ('clip', 'COF', 1.0), tag('当年分家的理由：<b>太商业化，不顾安全</b>', pos='bl')),
    ((3, 8), None, ('ground',), ('letters', dict(text='PBC', sub='Public Benefit Corporation · 公益公司', spread=True))),
    (('bite', 'SEN'), None, ('clip', 'SEN', 2.45), bite('达里奥 · 2023 年参议院听证')),
    ((3, 9), None, ('ground',), ('counter', dict(value=80, unit='%', sub='七位创始人承诺捐出的股权'))),
    ((3, 10), (3, 11), ('illus', 'P13'), None),
    ((3, 12), None, ('clip', 'CNN', 2.0), tag('<span class="k">2025.05</span>CNN 专访', small=True)),
    (('bite', 'CNN'), None, ('clip', 'CNN', 2.20), bite('达里奥 · CNN')),
    ((3, 13), None, ('ground',), ('quotecard', dict(text='“模型过于强大，<br>可能带来灾难性风险”', sub='写进了上市招股书的风险提示'))),
    ((3, 14), None, ('ground',), ('headline', dict(html='可另一边呢？', center=True))),
    ((3, 15), (3, 16), ('illus', 'P14'), None),
    ((3, 17), None, ('clip', 'JH_B', 0.5), tag('黄仁勋 · 英伟达 CEO', small=True)),
    ((3, 18), None, ('illus', 'P15'), ('quote', dict(text='“他觉得 AI 很可怕，所以只有他们才配做”', src='黄仁勋 · 2025 年 6 月 巴黎 VivaTech（大意）'))),
    ((3, 20), None, ('clip', 'LIE', 1.0), tag('<span class="k">2025.07</span>Big Technology 播客', small=True)),
    (('bite', 'LIE'), None, ('clip', 'LIE', 5.45), bite('达里奥 · Big Technology 播客')),
    ((3, 21), None, ('clip', 'PACE', 0.5), tag('<span class="k">11/19</span>CNBC 专访', small=True)),
    ((3, 22), (3, 24), ('illus', 'P16'), ('speedo', {})),
    ((3, 25), None, ('clip', 'PACE', 12.5), None),
    (('bite', 'PACE'), None, ('clip', 'PACE', 18.30), bite('达里奥 · CNBC 11/19')),
    ((3, 26), None, ('clip', 'HWY', 3.0), None),
    ((3, 27), (3, 28), ('illus', 'P17'), ('bigtext', dict(text='60 → 90', at_key=(3, 28)))),
    # ===== 第 4 份 · 暗线 =====
    ((4, 1), (4, 2), ('illus', 'P18'), None),
    ((4, 3), None, ('illus', 'P19'), ('chapter', dict(no='暗线一', text='路线死磕'))),
    ((4, 4), None, ('clip', 'SEN', 3.0), tag('<span class="k">2023</span>达里奥在美国参议院作证', small=True)),
    ((4, 5), None, ('clip', 'HUANG', 4.0), tag('黄仁勋 · 反对把中国市场堵死', small=True)),
    (('bite', 'HUANG'), None, ('clip', 'HUANG', 27.50), bite('黄仁勋 · CNBC')),
    ((4, 6), None, ('ground',), ('chapter', dict(no='暗线二', text='开发者生态的反弹', solo=True))),
    ((4, 7), None, ('illus', 'P20'), ('quote', dict(text='双重标准？'))),
    ((4, 8), (4, 9), ('ground',), ('twocol', dict(a='拿全网公开数据<br>训练自己的模型', b='禁止对手用它的输出<br>做“蒸馏”', at_key=(4, 9)))),
    ((4, 10), None, ('clip', 'SIGNS', 2.0), tag('<span class="k">11/19</span>上市前夕', small=True)),
    ((4, 11), None, ('clip', 'ARREST', 10.0), None),
    ((4, 12), None, ('ground',), ('doc', dict(img='assets/manifesto.jpg', w=1640, hl=[[188, 876, 640, 46], [188, 936, 910, 46]], focus=[600, 900], tr='“Anthropic 不是一家安全的 AI 公司……打着<b>更大善意</b>的名义聚拢权力”', tr_y=1000, src='来源：MisAnthropic Statement（联名声明）'))),
    ((4, 13), None, ('clip', 'PROT', 12.0), None),
    ((4, 14), None, ('illus', 'P21'), ('quote', dict(text='“为了更大善意”'))),
    # ===== 三个猜测 =====
    ((4, 15), None, ('ground',), ('three', {})),
    ((4, 16), (4, 17), ('illus', 'P22'), ('chapter', dict(no='猜测一', text='安全叙事 = 护城河？'))),
    ((4, 18), None, ('clip', 'DAIS', 2.0), tag('游说立法 · 收紧监管门槛', small=True)),
    ((4, 19), (4, 20), ('clip', 'HACK', 4.0), tag('小创业公司 · 开源社区', pos='bl')),
    ((4, 21), (4, 22), ('illus', 'P23'), None),
    ((4, 23), None, ('illus', 'P24'), ('chapter', dict(no='猜测二', text='为什么抢跑上市？'))),
    ((4, 24), None, ('clip', 'ALT', 13.0), tag('<span class="k">11/18</span>DealBook 峰会', small=True)),
    ((4, 25), None, ('clip', 'ALT', 7.0), None),
    (('bite', 'ALT'), None, ('clip', 'ALT', 0.40), bite('奥特曼 · DealBook 11/18')),
    ((4, 26), (4, 27), ('illus', 'P25'), None),
    ((4, 28), None, ('clip', 'INV', 2.0), tag('接盘的是谁？', pos='bl')),
    ((4, 29), (4, 30), ('illus', 'P26'), ('chapter', dict(no='猜测三', text='实验室兜不住了？'))),
    ((4, 31), (4, 33), ('ground',), ('doc', dict(img='assets/axios.jpg', w=1600, hl=[[10, 29, 1540, 22], [10, 51, 620, 22]], hl2=[[60, 924, 1270, 24]], focus=[800, 60], focus2=[800, 930], tr='据 Axios：<b>二十多位知情人士</b>，员工担心模型强到不能安全发布', tr_y=110, tr2='内部模型出现向监督者编造<b>“掩护说辞”</b>的迹象', tr2_y=990, src='来源：Axios 2026-11-24（存档页）'))),
    ((4, 34), None, ('clip', 'MSN', 10.0), None),
    (('bite', 'MSN'), None, ('clip', 'MSN', 0.0), bite('MSNOW · 11/24')),
    ((4, 35), None, ('clip', 'FALL', 2.0), tag('估值：<b>1 万多亿美元</b>', pos='bl')),
    ((4, 36), (4, 37), ('illus', 'P27'), None),
    # ===== 第 5 份 · 结尾 =====
    ((5, 1), None, ('clip', 'AFP', 20.0), tag('4 天破发 ≠ 宣判死刑', pos='bl')),
    ((5, 2), None, ('clip', 'FB1', 2.0), tag('<span class="k">2012.05</span>Facebook 上市第二天就破发', small=True)),
    ((5, 3), None, ('ground',), ('counter', dict(value=1, unit=' 万亿美元', sub='Facebook（Meta）2021 年市值', fmt='int'))),
    ((5, 4), (5, 5), ('illus', 'P28'), None),
    ((5, 6), (5, 7), ('illus', 'P29'), None),
    ((5, 8), (5, 9), ('illus', 'P30'), ('twoword', dict(a='慢一点 · 保安全', b='快一点 · 保股价', at_key=(5, 9)))),
    ((5, 10), (5, 12), ('illus', 'P31', {'src_max': 1.4}), ('tag', dict(html='Anthropic 探出来的这趟深水，<b>奥特曼还敢跳吗？</b>', pos='bl'))),
    ('end', None, ('ground',), ('end', {})),
]


def build():
    out, prev = [], 0.0
    for k0, k1, bg, ov in B:
        a, b = span(k0, k1)
        assert abs(a - prev) < 0.02, (k0, a, prev)
        o = None
        if ov:
            name, kw = ov
            kw = dict(kw)
            if 'at_key' in kw:   # 组件里“某句开始时”的相对时间
                kw['at'] = SPAN[kw.pop('at_key')][0] - a
            o = [name, kw]
        out.append(dict(a=round(a, 3), b=round(b, 3), bg=list(bg), ov=o, label=bg[0] == 'illus'))
        prev = b
    assert abs(prev - F.TOTAL) < 0.02, (prev, F.TOTAL)
    acc, inner = 0.0, []
    for _, _, d in COLD_CUTS[:-1]:
        acc += d; inner.append(round(acc, 3))
    cuts = [round(x['a'], 3) for x in out[1:]] + inner   # 冷开场内部的切点也要漏光
    json.dump(dict(dur=round(F.TOTAL, 3), shots=out, cuts=sorted(cuts), credits=None), open(os.path.join(HERE, 'storyboard.json'), 'w'), ensure_ascii=False, indent=0)
    print('shots', len(out), 'dur', round(F.TOTAL, 2), 'illus', sum(1 for x in out if x['bg'][0] == 'illus'))


if __name__ == '__main__':
    build()
