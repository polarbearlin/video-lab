"""把豆包配音脚本的每一行台词对齐到识别出的逐字时间，得到每句旁白的起止秒数。

用法：python3 align_vo.py <豆包配音脚本.md> <asr.json> <lines_aligned.json>
输出：[{part, text, start, end, ratio}]，ratio 是这一行有多少字对上了（< 0.6 要人工看）。
同时打印：每份的一致度、脚本和实际配音不一样的地方（用户念的和稿子不同很常见，以配音为准）、每份的语速（字/分钟）。

要点
- 识别结果里的阿拉伯数字先换成汉字读法再比（“11月” → “十一月”，“31.5%” → “百分之三十一点五”），
  不然数字多的句子对不上。
- 起止时间只是字级估计；排镜头前再用 full.py 里的 silences() 把句子边界吸到真实停顿上。
"""
import difflib
import json
import re
import sys

script_md, asr_path, out_path = sys.argv[1:4]
asr = json.load(open(asr_path, encoding='utf-8'))
meta = asr.get('_meta', {})
t = open(script_md, encoding='utf-8').read()
parts = re.split(r'<!-- ===== 第 \d+/\d+ 份 ===== -->', t)[1:]
P = re.compile(r'[\s，。：；、？！“”"《》（）—…·,:;?!「」『』]')
D = '零一二三四五六七八九'


def n2c(s):
    if '.' in s:
        a, b = s.split('.')
        return n2c(a) + '点' + ''.join(D[int(c)] for c in b)
    n = int(s)
    if n < 10:
        return D[n]
    if n < 20:
        return '十' + (D[n % 10] if n % 10 else '')
    if n < 100:
        return D[n // 10] + '十' + (D[n % 10] if n % 10 else '')
    if n < 1000 and len(s) == 3:
        r = D[n // 100] + '百'
        t2 = n % 100
        if t2 == 0:
            return r
        if t2 < 10:
            return r + '零' + D[t2]
        return r + D[t2 // 10] + '十' + (D[t2 % 10] if t2 % 10 else '')
    return ''.join(D[int(c)] for c in s)   # 年份、编号逐字读


RULES = [(re.compile(r'(\d+(?:\.\d+)?)%'), lambda m: '百分之' + n2c(m.group(1))),
         (re.compile(r'\d+(?:\.\d+)?'), lambda m: n2c(m.group(0)))]


def chars_times(words):
    cs = []
    for w, a, b in words:
        ww = P.sub('', w)
        n = len(ww)
        for k, ch in enumerate(ww):
            cs.append([ch, a + (b - a) * k / max(n, 1), a + (b - a) * (k + 1) / max(n, 1)])
    s = ''.join(c[0] for c in cs)
    for rx, fn in RULES:
        out, i = [], 0
        for m in rx.finditer(s):
            out.extend(cs[i:m.start()])
            rep = fn(m)
            a, b = cs[m.start()][1], cs[m.end() - 1][2]
            for k, ch in enumerate(rep):
                out.append([ch, a + (b - a) * k / len(rep), a + (b - a) * (k + 1) / len(rep)])
            i = m.end()
        out.extend(cs[i:])
        cs = out
        s = ''.join(c[0] for c in cs)
    return cs


res = []
for pi, p in enumerate(parts, 1):
    if str(pi) not in asr:
        print(f'第 {pi} 份：asr.json 里没有，跳过')
        continue
    body = p.split('## 旁白台词')[1].split('\n---')[0]
    lines = [ln.strip() for ln in body.strip().split('\n') if ln.strip()]
    cs = chars_times([w for s in asr[str(pi)] for w in s['words']])
    asr_s = ''.join(c[0] for c in cs)
    scr = [P.sub('', ln).replace('.', '') for ln in lines]
    scr_s = ''.join(scr)
    sm = difflib.SequenceMatcher(None, scr_s, asr_s, autojunk=False)
    m = [None] * len(scr_s)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            m[blk.a + k] = blk.b + k
    pos = 0
    for ln, s in zip(lines, scr):
        idx = [m[i] for i in range(pos, pos + len(s)) if m[i] is not None]
        res.append({'part': pi, 'text': ln, 'start': cs[idx[0]][1] if idx else None,
                    'end': cs[idx[-1]][2] if idx else None, 'ratio': round(len(idx) / max(len(s), 1), 2)})
        pos += len(s)
    dur = meta.get(str(pi), {}).get('dur') or (cs[-1][2] if cs else 0)
    rate = len(asr_s) / dur * 60 if dur else 0
    print(f'第 {pi} 份：一致度 {sm.ratio():.3f}，时长 {dur:.1f} 秒，语速约 {rate:.0f} 字/分钟')
    for op, a1, a2, b1, b2 in sm.get_opcodes():
        if op != 'equal' and (a2 - a1 > 1 or b2 - b1 > 1):
            print(f'   差异 {op}: 脚本「{scr_s[a1:a2]}」 配音「{asr_s[b1:b2]}」')
low = [r for r in res if r['ratio'] < 0.6]
for r in low:
    print(f'   对不上（{r["ratio"]}）：第 {r["part"]} 份「{r["text"]}」')
json.dump(res, open(out_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('写出', out_path, '共', len(res), '行')
