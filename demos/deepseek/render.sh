#!/bin/bash
# 《大肥鱼，不是机器人》30 秒 · 本地一键渲染（Mac 用 Metal 显卡跑 EEVEE）
#   bash demos/deepseek/render.sh stills    先出 9 张预览图 + 总览图（几分钟）
#   bash demos/deepseek/render.sh preview   半分辨率整片小样（检查动作和节奏）
#   bash demos/deepseek/render.sh full      1080×1920 整片 + 配乐 + 字幕（已渲染的帧会跳过，中断了重跑即可）
#   bash demos/deepseek/render.sh upload    把成片和总览图传到 GitHub Release
# Blender 不在默认位置时：BLENDER=/path/to/blender bash demos/deepseek/render.sh full
set -e
cd "$(dirname "$0")/../.."
D=demos/deepseek; OUT=$D/build
if [ -z "$BLENDER" ]; then
  for b in /Applications/Blender.app/Contents/MacOS/Blender "$(command -v blender || true)"; do [ -x "$b" ] && BLENDER="$b" && break; done
fi
[ -x "$BLENDER" ] || { echo "找不到 Blender，请设置 BLENDER=..."; exit 1; }
STILLS=16,90,200,345,420,560,640,760,860
BL() { "$BLENDER" -b --factory-startup -P $D/scene.py -- "$@"; }
prep() { python3 $D/timeline.py && python3 $D/ui_states.py && python3 $D/score.py; }
sheet() {   # 把预览图拼成一张总览图
  python3 - "$@" <<'EOF'
import sys, glob, os
from PIL import Image, ImageDraw
src, dst = sys.argv[1], sys.argv[2]
fs = sorted(glob.glob(os.path.join(src, 'still_*.png')))
ims = [Image.open(f).convert('RGB') for f in fs]; w, h = 360, 640
s = Image.new('RGB', (w * len(ims) + 8 * (len(ims) - 1), h + 40), '#0b0f22'); d = ImageDraw.Draw(s)
for i, (f, im) in enumerate(zip(fs, ims)):
    x = i * (w + 8); s.paste(im.resize((w, h)), (x, 40)); n = int(os.path.basename(f)[6:10]); d.text((x + 8, 10), f'{(n - 1) / 30:.1f}s  #{n}', fill='#9fb4ff')
s.save(dst, quality=90); print(dst)
EOF
}
case "$1" in
  stills)
    prep
    time BL --stills $STILLS --out $OUT/stills
    sheet $OUT/stills $OUT/stills_sheet.jpg ;;
  preview)
    prep
    time BL --render --preview --out $OUT/preview
    python3 $D/compose.py --frames $OUT/preview --out $OUT/大肥鱼_30s_小样.mp4 ;;
  full)
    prep
    time BL --render --out $OUT/render
    python3 $D/compose.py --frames $OUT/render --out $OUT/大肥鱼_30s.mp4 ;;
  upload)
    TAG=dafeiyu-$(date +%m%d-%H%M)
    FILES=$(ls $OUT/大肥鱼_30s*.mp4 $OUT/stills_sheet.jpg 2>/dev/null)
    gh release create "$TAG" $FILES --repo polarbearlin/video-lab --title "大肥鱼 30s 渲染 $TAG" --notes "本地渲染结果（render.sh）" --prerelease
    echo "已上传：$TAG" ;;
  *) sed -n 2,8p "$0" ;;
esac
