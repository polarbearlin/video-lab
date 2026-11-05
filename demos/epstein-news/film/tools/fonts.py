# 按片中用字从 Google Fonts 取子集字体（OFL），存成 fonts/*.woff2
import re, json, urllib.request, urllib.parse
src = open('index.html', encoding='utf-8').read() + open('cues.json', encoding='utf-8').read() + open('film.json', encoding='utf-8').read()
chars = ''.join(sorted(set(src) | set(chr(i) for i in range(32, 127)) | set('…—–→·（）【】：，。？！“”°')))
chars = ''.join(c for c in chars if c.isprintable())
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
FONTS = [('NotoSansSC-900', 'Noto+Sans+SC:wght@900', ''), ('NotoSansSC-700', 'Noto+Sans+SC:wght@700', ''), ('NotoSansSC-400', 'Noto+Sans+SC:wght@400', ''),
         ('NotoSerifSC-900', 'Noto+Serif+SC:wght@900', ''), ('NotoSerifSC-500', 'Noto+Serif+SC:wght@500', ''),
         ('BarlowCondensed-600', 'Barlow+Condensed:wght@600', ''), ('IBMPlexMono-500', 'IBM+Plex+Mono:wght@500', ''), ('SourceSerif4-400i', 'Source+Serif+4:ital,wght@1,400', '')]
for name, fam, _ in FONTS:
    url = f'https://fonts.googleapis.com/css2?family={fam}&text={urllib.parse.quote(chars)}'
    css = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA})).read().decode()
    furl = re.search(r'url\((https://[^)]+)\)', css).group(1)
    data = urllib.request.urlopen(urllib.request.Request(furl, headers={'User-Agent': UA})).read()
    open(f'fonts/{name}.woff2', 'wb').write(data); print(name, len(data), 'bytes', len(chars), 'chars')
