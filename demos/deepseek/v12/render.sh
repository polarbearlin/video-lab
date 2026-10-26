#!/bin/bash
# 《大肥鱼 · 自我介绍》v12：新配乐 + 大事记卡（MG 时间轴）+ 修"5890 亿美元"立体字和卡在角落的"一天蒸发"小卡
#   bash demos/deepseek/v12/render.sh patch    只重渲受影响的帧（前30秒 551–900、后60秒 901–1000），重新合成并拼成 90 秒
#   bash demos/deepseek/v12/render.sh remix    在 90 秒成片上叠大事记卡 + 换新配乐（不用 Blender，几分钟）
#   bash demos/deepseek/v12/render.sh upload   把 v12 成片和审片图传到 GitHub Release
set -e
cd "$(dirname "$0")/../../.."
D=demos/deepseek; B=$D/build
if [ -z "$BLENDER" ]; then
  for b in /Applications/Blender.app/Contents/MacOS/Blender "$(command -v blender || true)"; do [ -x "$b" ] && BLENDER="$b" && break; done
fi
case "$1" in
  patch)  [ -x "$BLENDER" ] || { echo "找不到 Blender，请设置 BLENDER=..."; exit 1; }
          [ -f $B/v10render_hd/f_0550.png ] && [ -f $B/v11render_hd/f_2700.png ] || { echo "找不到之前渲好的帧（build/v10render_hd、build/v11render_hd）"; exit 1; }
          for v in v5 v6 v7 v8 v9 v10 v11; do python3 $D/$v/ui.py > /dev/null; done
          python3 $D/v10/audio.py; python3 $D/v11/audio.py
          for f in $(seq 551 900); do rm -f $B/v10render_hd/f_$(printf %04d $f).png; done
          for f in $(seq 901 1000); do rm -f $B/v11render_hd/f_$(printf %04d $f).png; done
          time "$BLENDER" -b --factory-startup -P $D/v10/scene.py -- --render --frames 551-900 --scale 100 --samples 64 --out $B/v10render_hd
          time "$BLENDER" -b --factory-startup -P $D/v11/scene.py -- --render --frames 901-1000 --scale 100 --samples 64 --out $B/v11render_hd
          python3 $D/v10/compose.py --frames $B/v10render_hd --out $B/大肥鱼v10_前30秒_高清.mp4
          python3 $D/v11/compose.py --frames $B/v11render_hd --out $B/大肥鱼v11_后60秒_高清.mp4
          python3 $D/v11/compose.py --join $B/大肥鱼v10_前30秒_高清.mp4 $B/大肥鱼v11_后60秒_高清.mp4 --out $B/大肥鱼_自我介绍_完整90秒.mp4 ;;
  remix)  python3 $D/v12/audio.py
          python3 $D/v12/remix.py --video $B/大肥鱼_自我介绍_完整90秒.mp4 --out $B/大肥鱼_自我介绍_90秒_v12.mp4
          python3 $D/v12/remix.py --video $B/大肥鱼_自我介绍_90秒_v12.mp4 --sheet ;;
  upload) TAG=dafeiyu-v12-$(date +%m%d-%H%M)
          gh release create "$TAG" $(ls $B/大肥鱼_自我介绍_90秒_v12.mp4 $B/v12_sheet.jpg 2>/dev/null) --repo polarbearlin/video-lab --title "大肥鱼 v12 新配乐 + 大事记卡 $TAG" --notes "本地渲染" --prerelease
          echo "已上传：$TAG" ;;
  *) sed -n 2,5p "$0" ;;
esac
