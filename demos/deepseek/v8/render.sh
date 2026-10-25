#!/bin/bash
# 《大肥鱼 · 自我介绍》前 30 秒（一镜到底）· 本地一键渲染（Mac 用 Metal 跑 EEVEE）
#   bash demos/deepseek/v8/render.sh stills   先出几张预览 + 审片图（几分钟）
#   bash demos/deepseek/v8/render.sh full     1920×1080 整段 + 配乐 + 章节叠加层（已渲的帧会跳过，断了重跑即可）
#   bash demos/deepseek/v8/render.sh upload   把成片和审片图传到 GitHub Release
set -e
cd "$(dirname "$0")/../../.."
D=demos/deepseek; B=$D/build
if [ -z "$BLENDER" ]; then
  for b in /Applications/Blender.app/Contents/MacOS/Blender "$(command -v blender || true)"; do [ -x "$b" ] && BLENDER="$b" && break; done
fi
[ -x "$BLENDER" ] || { echo "找不到 Blender，请设置 BLENDER=..."; exit 1; }
prep() {   # 界面图（用到 v5/v6/v7 的部分素材）+ 配乐
  python3 $D/v5/ui.py && python3 $D/v6/ui.py && python3 $D/v7/ui.py && python3 $D/v8/ui.py && python3 $D/v8/audio.py
}
STILLS=45,100,170,215,330,470,640,735,790,875
case "$1" in
  stills) prep; time "$BLENDER" -b --factory-startup -P $D/v8/scene.py -- --stills $STILLS --scale 50 --samples 32 --out $B/v8st
          python3 $D/v8/compose.py --sheet $STILLS ;;
  full)   prep; time "$BLENDER" -b --factory-startup -P $D/v8/scene.py -- --render --scale 100 --samples 64 --out $B/v8render_hd
          python3 $D/v8/compose.py --frames $B/v8render_hd --out $B/大肥鱼_前30秒_高清.mp4 ;;
  upload) TAG=dafeiyu-v8-$(date +%m%d-%H%M)
          gh release create "$TAG" $(ls $B/大肥鱼_前30秒_高清.mp4 $B/v8st/audit_sheet.jpg 2>/dev/null) --repo polarbearlin/video-lab --title "大肥鱼 v8 前30秒 $TAG" --notes "本地渲染" --prerelease
          echo "已上传：$TAG" ;;
  *) sed -n 2,5p "$0" ;;
esac
