"""纸雕 72 秒版音效轨：时间全部取自 lyrics72.json，和 paper72.js 的动作时间表一致。"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'lib', 'audio'))
import mgaudio as mg
from mgaudio import sfx

L = json.load(open(os.path.join(HERE, 'lyrics72.json')))
c = lambda li, ci: L[li]['chars'][min(ci, len(L[li]['chars']) - 1)]
m = mg.Mix(duration=72.0, bpm=144)
flip = lambda t, g=-8, s=0: m.sfx(sfx.paper('flip', .35, seed=s or int(t * 13)), t, gain=g)

# 前奏对白
m.sfx(sfx.paper('slide', .6), .4, gain=-7)                     # 标题落下
flip(.25); flip(.55)
m.sfx(sfx.pop('soft'), c(0, 2) - .1, gain=-8)                   # 气泡
m.sfx(sfx.pop('bubble', pitch=1.2), c(0, 10) - .1, gain=-7)     # 递饼
m.sfx(sfx.text_hit('pop'), 10.08, gain=-4)                       # 哈！
m.sfx(sfx.pop('soft', pitch=1.1), 11.45, gain=-8)
m.sfx(sfx.swish(.3), c(1, 9), gain=-5)                           # 推开饼
m.sfx(sfx.impact('thud', size=.4), c(1, 9) + 1.0, gain=-9)
# 主歌一
for i in range(7): flip(17.7 + i * .16, -9, 50 + i)              # 纸楼立起
flip(19.2, -7); m.sfx(sfx.paper('slide', 1.2), 19.6, gain=-12)  # 出租屋 + 行李
flip(21.15, -8)
for t in (21.62, 21.98): m.sfx(sfx.click('wood'), t, gain=-9)   # 拍肩膀
m.sfx(sfx.pop('soft'), c(3, 6) - .1, gain=-8)
m.sfx(sfx.paper('rustle', .4), c(4, 0) - .1, gain=-9); m.sfx(sfx.paper('rustle', .4, seed=3), c(4, 5) - .1, gain=-9)
m.sfx(sfx.swish(.25, seed=7), c(4, 9) + .2, gain=-8)            # 「社保」被收走
m.sfx(sfx.paper('slide', .6, seed=5), c(5, 0) - .1, gain=-5)    # 自愿书滑上桌
m.sfx(sfx.click('hard'), c(6, 9) + .05, gain=-6)                 # 把笔放桌上
m.sfx(sfx.pen('marker', 1.1, strokes=[(0, .55), (.6, .5)]), 34.2, gain=-5)
m.sfx(sfx.swish(.2, seed=9), 36.1, gain=-10); m.sfx(sfx.swish(.2, seed=11), 36.5, gain=-10)
m.sfx(sfx.pop('soft', pitch=.9), c(7, 5) - .1, gain=-8)
# 前副歌
m.sfx(sfx.downlifter(1.2), 37.6, gain=-12)
flip(37.3); flip(37.7)
m.sfx(sfx.paper('rustle', .4, seed=8), 41.15, gain=-9)
m.sfx(sfx.pop('cork'), c(9, 9), gain=-7)
# 第一遍副歌
for t in (44.0, 46.95, 50.1, 53.45): m.sfx(sfx.whoosh(.6, 'soft', seed=int(t)), t + .35, gain=-9)
m.sfx(sfx.pen('marker', 1.0, strokes=[(0, .5), (.55, .45)]), 44.5, gain=-4)
m.sfx(sfx.pop('bubble'), 45.35, gain=-7)
m.sfx(sfx.impact('soft', size=.7), c(10, 6), gain=-3)
flip(47.35, -6); m.sfx(sfx.swish(.3, seed=4), c(11, 3), gain=-4)
flip(50.5, -6); m.sfx(sfx.pen('marker', .4), c(12, 6), gain=-7)
for i in range(12): m.sfx(sfx.tick('wood'), 54.25 + i * .14, gain=-10)
m.sfx(sfx.stamp('seal'), c(13, 4), gain=-1)
# 第二遍副歌：饼被戳破
for t in (57.1, 59.95, 63.3, 66.55): m.sfx(sfx.whoosh(.6, 'soft', seed=int(t) + 1), t + .35, gain=-9)
m.sfx(sfx.riser(1.2, 'tonal', note='D4'), c(14, 6), gain=-11)
m.sfx(sfx.impact('punch', size=.6), c(14, 6), gain=-3); m.sfx(sfx.pop('cork', pitch=.8), c(14, 6), gain=-4); m.sfx(sfx.paper('crumple', .8), c(14, 6) + .05, gain=-6)
m.sfx(sfx.swish(.3, seed=12), c(15, 3), gain=-4)
flip(63.5, -6); m.sfx(sfx.pen('marker', .4, seed=3), c(16, 6), gain=-7)
for i in range(12): m.sfx(sfx.tick('wood'), 67.1 + i * .1, gain=-10)
m.sfx(sfx.stamp('seal', seed=2), c(17, 4), gain=-1)

os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
m.export(os.path.join(HERE, 'out', 'sfx72.wav'), lufs=-25, tp=-6)
