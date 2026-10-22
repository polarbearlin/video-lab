"""音效轨：只做点缀，叠在歌曲下面。时间全部取自 lyrics_timed.json，和画面同一张时间表。"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'lib', 'audio'))
import mgaudio as mg
from mgaudio import sfx

L = json.load(open(os.path.join(HERE, 'lyrics_timed.json')))
c = lambda li, ci: L[li]['chars'][ci]
m = mg.Mix(duration=79.2, bpm=108)

# 冻结：「哎」「等一下」
m.sfx(sfx.impact('soft', size=.6), 0.71, gain=-2)
m.sfx(sfx.impact('soft', size=.6, seed=2), 18.24, gain=-3)
for t in (c(0, 1), c(0, 2), c(0, 3)):
    m.sfx(sfx.pop('soft', pitch=1.0), t, gain=-8)
# 开关上的火花
for t in (0.25, 18.0):
    m.sfx(sfx.glitch(0.18, 'crunch'), t, gain=-12)
# 浓度计上涨
m.sfx(sfx.riser(3.0, 'tonal', note='D4'), 16.6, gain=-10)
m.sfx(sfx.whoosh(.8, 'soft'), 21.9, gain=-6)                    # 圆形转场
# 三张卡片：滑入 + 火花 + 打叉
for li in (6, 7, 8):
    m.sfx(sfx.swish(.28), L[li]['start'] - .02, gain=-7)
for t in (c(6, 2), c(6, 5), c(7, 8), c(8, 6)):
    m.sfx(sfx.glitch(0.12, 'crunch', seed=int(t * 10)), t, gain=-12)
for t in (c(6, 5) + .15, c(7, 8) + .1, c(8, 6)):
    m.sfx(sfx.pen('marker', .35), t + .05, gain=-6)
m.sfx(sfx.ui('open'), 29.7, gain=-8)                              # 开门
m.sfx(sfx.whoosh(1.2, 'air', direction=1), 33.4, gain=-5)          # 俯冲进门
# 副歌：每一步弹出 + 对勾
for t in (33.46, 35.66, 37.08, 46.82):
    m.sfx(sfx.pop('bubble', pitch=1.1), t, gain=-8)
for t in (34.89, 36.6, 38.9, 49.62):
    m.sfx(sfx.ding('A5'), t, gain=-9)
m.sfx(sfx.pop('cork'), 39.85, gain=-6)                             # 记住了吗
m.sfx(sfx.swish(.3), 42.3, gain=-6)
m.sfx(sfx.whoosh(.7, 'soft', direction=-1), 50.4, gain=-7)          # 上推转场
for t in (50.63, 53.68):
    m.sfx(sfx.stamp('rubber'), t, gain=-5)
m.sfx(sfx.ui('notify'), 49.4, gain=-10)
m.sfx(sfx.whoosh(.6, 'soft'), 69.1, gain=-8)
for t in (c(18, 5) - .2, L[19]['start'] - .1, c(19, 4) - .1):
    m.sfx(sfx.ui('notify'), t, gain=-8)
for i in range(4):
    m.sfx(sfx.pop('soft', pitch=1.0 + i * .08), 77.3 + i * .16, gain=-9)

res = m.export(os.path.join(HERE, 'out', 'sfx.wav'), lufs=-27, tp=-6)
