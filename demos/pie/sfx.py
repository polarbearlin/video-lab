"""《老板画饼》15 秒片段的音效轨（两个版本共用同一张时间表）。用法：python3 sfx.py ed|paper"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'lib', 'audio'))
import mgaudio as mg
from mgaudio import sfx

L = json.load(open(os.path.join(HERE, 'lyrics.json')))
c = lambda li, ci: L[li]['chars'][ci]
kind = sys.argv[1] if len(sys.argv) > 1 else 'ed'
m = mg.Mix(duration=16.0, bpm=144)

for t in (3.1, 6.05, 9.2, 12.6):                      # 换页
    m.sfx(sfx.paper('slide', .5, seed=int(t * 10)), t, gain=-6)
m.sfx(sfx.pen('marker', 1.0, strokes=[(0, .5), (.55, .45)]), 3.5, gain=-4)   # 红笔画饼
m.sfx(sfx.impact('soft', size=.7), c(1, 6), gain=-3)                        # 「大」：饼变大
m.sfx(sfx.swish(.25), c(1, 4), gain=-6)                                      # 划掉「画饼」
m.sfx(sfx.swish(.3, seed=4), c(2, 3), gain=-4)                               # 划掉 ¥500
m.sfx(sfx.pen('marker', .4), c(3, 7) - .1, gain=-7)                          # 划重点
for i in range(12):                                                           # 12 个月依次点亮
    m.sfx(sfx.tick('wood' if kind == 'paper' else 'hi', ), 13.2 + i * .14, gain=-10)
m.sfx(sfx.stamp('rubber' if kind == 'ed' else 'seal'), c(4, 4), gain=-1)    # 不能差
if kind == 'paper':
    for t in (.3, 3.5, 6.4, 9.6):
        m.sfx(sfx.paper('flip', .4, seed=int(t * 7)), t, gain=-7)

os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
m.export(os.path.join(HERE, 'out', f'sfx_{kind}.wav'), lufs=-26, tp=-6)
