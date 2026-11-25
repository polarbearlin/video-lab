"""豆包配音脚本发出前自检：每份字数、台词字数、台词里有没有阿拉伯数字 / 英文 / %。

用法：python3 check_doubao.py <片名>_豆包配音脚本_v1.md [每分钟字数，默认 270]
"""
import re
import sys

path = sys.argv[1]
rate = float(sys.argv[2]) if len(sys.argv) > 2 else 270
t = open(path, encoding='utf-8').read()
parts = re.split(r'<!-- ===== 第 \d+/\d+ 份 ===== -->', t)[1:]
if not parts:
    sys.exit('没找到分份标记 <!-- ===== 第 n/N 份 ===== -->')
total = 0
ok = True
for i, p in enumerate(parts, 1):
    p = p.split('## 交付说明')[0]          # 最后一份后面的交付说明不算进粘贴的字数
    if '## 旁白台词' not in p:
        print(f'第 {i} 份：缺「## 旁白台词」'); ok = False; continue
    lines = p.split('## 旁白台词')[1].split('\n---')[0]
    n = len(re.sub(r'[\s，。：；、？！“”"《》（）—…·,:;?!「」『』]', '', lines))
    total += n
    bad = re.findall(r'[0-9A-Za-z%]+', lines)
    size = len(p.strip())
    flag = []
    if size > 1900:
        flag.append('超过豆包输入框上限，必须再拆'); ok = False
    elif size > 1300:
        flag.append('偏长，最好再拆')
    if bad:
        flag.append('台词里还有：' + ' '.join(sorted(set(bad)))); ok = False
    print(f'第 {i} 份：全份 {size} 字，台词 {n} 字，约 {n / rate * 60:.0f} 秒  ' + '；'.join(flag))
print(f'合计台词 {total} 字，按每分钟 {rate:.0f} 字约 {total / rate:.1f} 分钟（不含停顿和原声）')
print('通过' if ok else '有问题，先改再发')
