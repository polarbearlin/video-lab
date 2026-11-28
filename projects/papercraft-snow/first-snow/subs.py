"""Burned-in subtitles for 第一场雪: the nine lines at their timeline times (Noto Sans SC Medium, lower third, a soft
shadow) and the two caption cards (LXGW WenKai, a touch larger, centred low, slow fades). Writes the ASS file and the
two fonts it uses, subset to the characters on screen (static instances: libass would take the variable font's Thin).

    python3 first-snow/subs.py TIMELINE.json NOTO_SANS_SC.ttf LXGW_WENKAI.ttf OUTDIR  -> OUTDIR/subs.ass, OUTDIR/fonts/
"""
import json, os, sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

CARDS = [(0.6, 5.7, '今年的第一场雪，下得很认真。'), (50.4, 55.8, '最好的冬天，是有人记得你怕冷。')]
LEAD, TAIL = 0.08, 0.25     # a line shows a hair before its voice and stays a moment after

HEAD = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Line,Noto Sans SC Medium,58,&H00F4F8FB,&H00F4F8FB,&H78201810,&H8C100C08,0,0,0,0,100,100,2,0,1,1.6,2.2,2,160,160,96,1
Style: Card,LXGW WenKai,70,&H00EAF4FB,&H00EAF4FB,&H8C201810,&H96100C08,0,0,0,0,100,100,6,0,1,1.2,2.6,2,160,160,150,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def ts(t):
    cs = int(round(t * 100))
    return f'{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}'


def font(src, dst, text, weight=None, family=None):
    f = TTFont(src)
    if 'fvar' in f:
        f = instancer.instantiateVariableFont(f, {'wght': weight})
    if family:
        for rec in f['name'].names:
            if rec.nameID in (1, 4, 16):
                rec.string = family
            if rec.nameID in (2, 17):
                rec.string = 'Regular'
            if rec.nameID == 6:
                rec.string = family.replace(' ', '')
    opts = subset.Options(); opts.layout_features = ['*']; opts.name_IDs = ['*']; opts.name_languages = ['*']
    s = subset.Subsetter(opts); s.populate(text=text + '…—！？，。、 '); s.subset(f)
    f.save(dst)


def main(tl, noto, wenkai, out):
    lines = json.load(open(tl))
    texts = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lines.json')))
    assert [(L['start'], L['end']) for L in lines] == [(T['start'], T['end']) for T in texts]
    os.makedirs(os.path.join(out, 'fonts'), exist_ok=True)
    ev = []
    for T in texts:
        ev.append(f'Dialogue: 1,{ts(T["start"] - LEAD)},{ts(T["end"] + TAIL)},Line,,0,0,0,,{{\\fad(120,180)\\blur0.6}}{T["text"]}')
    for t0, t1, text in CARDS:
        ev.append(f'Dialogue: 0,{ts(t0)},{ts(t1)},Card,,0,0,0,,{{\\fad(700,900)\\blur0.8}}{text}')
    with open(os.path.join(out, 'subs.ass'), 'w', encoding='utf-8') as f:
        f.write(HEAD + '\n'.join(ev) + '\n')
    font(noto, os.path.join(out, 'fonts', 'NotoSansSC-Medium-subset.ttf'), ''.join(T['text'] for T in texts), weight=500, family='Noto Sans SC Medium')
    font(wenkai, os.path.join(out, 'fonts', 'LXGWWenKai-subset.ttf'), ''.join(c for _, _, c in CARDS))


if __name__ == '__main__':
    main(*sys.argv[1:5])
