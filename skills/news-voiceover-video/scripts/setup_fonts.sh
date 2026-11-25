#!/bin/bash
# 下载思源黑体（Noto Sans SC 可变字体，OFL 授权），切出 Medium / Bold / Black 三个字重，渲染管线用。
# 用法：bash setup_fonts.sh [目标目录，默认 仓库根/assets/fonts]
# 字体在 .gitignore 里，不进仓库；每个新的云端会话跑一次。
set -e
DEST=${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)/assets/fonts}
mkdir -p "$DEST" && cd "$DEST"
G=https://raw.githubusercontent.com/google/fonts/main/ofl
[ -s NotoSansSC.ttf ] || curl -sSfL --retry 3 -o NotoSansSC.ttf "$G/notosanssc/NotoSansSC%5Bwght%5D.ttf"
python3 -c "import fontTools" 2>/dev/null || pip install -q fonttools
python3 - <<'EOF'
import os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
for name, w in [('Medium', 500), ('Bold', 700), ('Black', 900)]:
    if os.path.exists(f'NotoSansSC-{name}.ttf'):
        continue
    inst = instancer.instantiateVariableFont(TTFont('NotoSansSC.ttf'), {'wght': w})
    for rec in inst['name'].names:
        if rec.nameID in (1, 4, 16): rec.string = f'Noto Sans SC {name}'
        if rec.nameID in (2, 17): rec.string = 'Regular'
        if rec.nameID == 6: rec.string = f'NotoSansSC-{name}'
    inst.save(f'NotoSansSC-{name}.ttf')
    print(name, 'ok')
EOF
# 字幕（ASS）走 libass，要让 fontconfig 也认得
mkdir -p ~/.fonts && cp NotoSansSC-*.ttf ~/.fonts/ && fc-cache -f >/dev/null
ls -la "$DEST"
