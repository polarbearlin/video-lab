#!/bin/bash
# 《汐屿的秋天》MV 一键出片（Canvas 逐帧 + Suno 的歌）
# 先把歌放到 demos/seaside_autumn/build/song/song.mp3
#   bash demos/seaside_autumn/make.sh           整片
#   bash demos/seaside_autumn/make.sh stills    只出 8 张风格样帧
set -e
cd "$(dirname "$0")"
[ -f build/song/song.mp3 ] || { echo "缺少歌曲：请放到 build/song/song.mp3"; exit 1; }
if [ "$1" = stills ]; then node render.cjs --stills --out build/stills; exit; fi
node render.cjs --out build/frames
ffmpeg -y -loglevel error -framerate 30 -start_number 0 -i build/frames/f_%04d.png -i build/song/song.mp3 \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest "build/汐屿的秋天_MV.mp4"
echo "build/汐屿的秋天_MV.mp4"
