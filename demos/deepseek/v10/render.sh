#!/bin/bash
# 《大肥鱼 · 自我介绍》v10 前 30 秒（暗转亮 · 发布会舞台 · 分区手办材质）· 本地一键渲染（Mac 用 Metal 跑 EEVEE）
#   bash demos/deepseek/v10/render.sh prep     只生成界面素材和配乐
#   bash demos/deepseek/v10/render.sh stills   先出 12 张预览 + 审片图（几分钟）
#   bash demos/deepseek/v10/render.sh full     1920×1080 整段 + 配乐 + 叠加层（已渲的帧会跳过，断了重跑即可）
#   bash demos/deepseek/v10/render.sh upload   把成片和审片图传到 GitHub Release
set -e
cd "$(dirname "$0")/../../.."
D=demos/deepseek; B=$D/build
if [ -z "$BLENDER" ]; then
  for b in /Applications/Blender.app/Contents/MacOS/Blender "$(command -v blender || true)"; do [ -x "$b" ] && BLENDER="$b" && break; done
fi
prep() {
  for v in v5 v6 v7 v8 v9 v10; do python3 $D/$v/ui.py > /dev/null; done
  python3 $D/v10/audio.py
}
STILLS=30,75,100,125,170,200,270,330,390,440,530,560,640,700,770,850
need_blender() { [ -x "$BLENDER" ] || { echo "找不到 Blender，请设置 BLENDER=..."; exit 1; }; }
case "$1" in
  prep)   prep ;;
  stills) need_blender; prep
          time "$BLENDER" -b --factory-startup -P $D/v10/scene.py -- --stills $STILLS --scale 50 --samples 32 --out $B/v10st
          python3 $D/v10/compose.py --sheet $STILLS ;;
  full)   need_blender; prep
          time "$BLENDER" -b --factory-startup -P $D/v10/scene.py -- --render --scale 100 --samples 64 --out $B/v10render_hd
          python3 $D/v10/compose.py --frames $B/v10render_hd --out $B/大肥鱼v10_前30秒_高清.mp4 ;;
  upload) TAG=dafeiyu-v10-$(date +%m%d-%H%M)
          gh release create "$TAG" $(ls $B/大肥鱼v10_前30秒_高清.mp4 $B/v10st/audit_sheet.jpg 2>/dev/null) --repo polarbearlin/video-lab --title "大肥鱼 v10 前30秒 $TAG" --notes "本地渲染" --prerelease
          echo "已上传：$TAG" ;;
  *) sed -n 2,6p "$0" ;;
esac
