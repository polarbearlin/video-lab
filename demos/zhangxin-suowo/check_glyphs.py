"""缺字检查：画面里每个字都要在它指定的字体里真的有字形（否则浏览器会悄悄换成别的字体，或者显示方块）。
用法：python3 demos/zhangxin-suowo/check_glyphs.py   （先跑 stills.mjs 生成 stills/report.json）
除了关键帧里出现的字，还把全部字幕在三种风格的字幕字体里各查一遍，为出正片做准备。"""
import json, os, re, sys
from fontTools.ttLib import TTFont

D = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(D, '../../assets/fonts')
FAM = {'MaShan': 'MaShanZheng-Regular.ttf', 'WenKai': 'LXGWWenKai-Regular.ttf', 'NotoSerif': 'NotoSerifSC.ttf',
       'NotoSans': 'NotoSansSC.ttf', 'InstrumentSerif': 'InstrumentSerif-Italic.ttf'}
cmap = {k: TTFont(os.path.join(FONTS, v), fontNumber=0).getBestCmap() for k, v in FAM.items()}

missing, n = [], 0
for f in json.load(open(os.path.join(D, 'stills/report.json'))):
    for b in f['boxes']:
        for ch in b['text']:
            if ch.isspace(): continue
            n += 1
            if ord(ch) not in cmap[b['fam']]: missing.append(f"{f['file']}: {b['fam']} 缺「{ch}」（{b['text']}）")

subs = ''.join(re.findall(r"\[\s*[\d.]+,\s*[\d.]+,\s*'([^']+)'\]", open(os.path.join(D, 'shared.js'), encoding='utf-8').read()))
for fam in ('WenKai', 'NotoSans'):
    for ch in sorted(set(subs)):
        n += 1
        if ord(ch) not in cmap[fam]: missing.append(f"全部字幕: {fam} 缺「{ch}」")

print(f'查了 {n} 个字，缺字 {len(missing)} 个')
print('\n'.join(missing))
sys.exit(1 if missing else 0)
