#!/bin/bash
# 《大肥鱼 · 自我介绍》v11 后 60 秒（30–90 秒）· 本地一键渲染（Mac 用 Metal 跑 EEVEE）
#   bash demos/deepseek/v11/render.sh prep     只生成界面素材和配乐
#   bash demos/deepseek/v11/render.sh stills   先出 16 张预览 + 审片图（几分钟）
#   bash demos/deepseek/v11/render.sh full     1920×1080 整段（帧 901–2700）+ 配乐 + 叠加层（已渲的帧会跳过，断了重跑即可）
#   bash demos/deepseek/v11/render.sh join     和 v10 的前 30 秒拼成完整 90 秒
#   bash demos/deepseek/v11/render.sh upload   把成片（后 60 秒 + 完整 90 秒）和审片图传到 GitHub Release
set -e
cd "$(dirname "$0")/../../.."
D=demos/deepseek; B=$D/build
if [ -z "$BLENDER" ]; then
  for b in /Applications/Blender.app/Contents/MacOS/Blender "$(command -v blender || true)"; do [ -x "$b" ] && BLENDER="$b" && break; done
fi
prep() {
  for v in v5 v6 v7 v8 v9 v10 v11; do python3 $D/$v/ui.py > /dev/null; done
  python3 $D/v11/audio.py
}
STILLS=901,1000,1100,1180,1250,1290,1330,1430,1530,1640,1720,1800,2030,2100,2250,2350,2420,2560,2640,2680
need_blender() { [ -x "$BLENDER" ] || { echo "找不到 Blender，请设置 BLENDER=..."; exit 1; }; }
case "$1" in
  prep)   prep ;;
  stills) need_blender; prep
          time "$BLENDER" -b --factory-startup -P $D/v11/scene.py -- --stills $STILLS --scale 50 --samples 32 --out $B/v11st
          python3 $D/v11/compose.py --sheet $STILLS ;;
  full)   need_blender; prep
          time "$BLENDER" -b --factory-startup -P $D/v11/scene.py -- --render --scale 100 --samples 64 --out $B/v11render_hd
          python3 $D/v11/compose.py --frames $B/v11render_hd --out $B/大肥鱼v11_后60秒_高清.mp4 ;;
  join)   [ -f $B/大肥鱼v10_前30秒_高清.mp4 ] || { echo "缺少 v10 前30秒成片：先跑 bash $D/v10/render.sh full"; exit 1; }
          python3 $D/v11/compose.py --join $B/大肥鱼v10_前30秒_高清.mp4 $B/大肥鱼v11_后60秒_高清.mp4 --out $B/大肥鱼_自我介绍_完整90秒.mp4 ;;
  upload) TAG=dafeiyu-v11-$(date +%m%d-%H%M)
          gh release create "$TAG" $(ls $B/大肥鱼v11_后60秒_高清.mp4 $B/大肥鱼_自我介绍_完整90秒.mp4 $B/v11st/audit_sheet.jpg 2>/dev/null) --repo polarbearlin/video-lab --title "大肥鱼 v11 后60秒 + 完整90秒 $TAG" --notes "本地渲染" --prerelease
          echo "已上传：$TAG" ;;
  *) sed -n 2,7p "$0" ;;
esac
