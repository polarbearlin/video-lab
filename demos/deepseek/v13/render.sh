#!/bin/bash
# 《大肥鱼 · 自我介绍》v13：Suno 的歌做配乐（剪到对上画面）+ 轻音效 + v12 的大事记卡。成片 91.5 秒（片尾卡多停 1.5 秒让最后一句唱完）
# 先把 Suno 的 mp3 放到 demos/deepseek/build/song/suno.mp3
#   bash demos/deepseek/v13/render.sh make     剪歌 + 混音效 + 叠大事记卡 → 成片（需要 v12 patch 已经跑过）
#   bash demos/deepseek/v13/render.sh upload   传到 GitHub Release
set -e
cd "$(dirname "$0")/../../.."
D=demos/deepseek; B=$D/build
case "$1" in
  make)   [ -f $B/song/suno.mp3 ] || { echo "缺少歌曲：请把 Suno 的 mp3 放到 $B/song/suno.mp3"; exit 1; }
          [ -f $B/大肥鱼_自我介绍_完整90秒.mp4 ] || { echo "缺少 90 秒成片：先跑 bash $D/v12/render.sh patch"; exit 1; }
          python3 -c "import librosa" 2>/dev/null || pip3 install librosa
          python3 $D/v13/song.py
          python3 $D/v12/remix.py --video $B/大肥鱼_自我介绍_完整90秒.mp4 --audio $B/v13_audio.wav --hold 1.5 --out $B/大肥鱼_自我介绍_v13_Suno配乐.mp4 ;;
  upload) TAG=dafeiyu-v13-$(date +%m%d-%H%M)
          gh release create "$TAG" $B/大肥鱼_自我介绍_v13_Suno配乐.mp4 --repo polarbearlin/video-lab --title "大肥鱼 v13 Suno 配乐版 $TAG" --notes "本地渲染" --prerelease
          echo "已上传：$TAG" ;;
  *) sed -n 2,5p "$0" ;;
esac
