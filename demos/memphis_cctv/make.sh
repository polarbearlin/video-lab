#!/bin/bash
# 《东三环 · 央视大楼》一键出片：逐帧导出 → 音效时间点 → 配乐 → 合成
#   bash demos/memphis_cctv/make.sh            整片
#   bash demos/memphis_cctv/make.sh samples    只出 4 张样帧拼图
set -e
cd "$(dirname "$0")"
if [ "$1" = samples ]; then node render.cjs --frames 30,258,345,420 --out build/samples; exit; fi
node render.cjs --out build/frames
node events.cjs > /dev/null
python3 audio.py
ffmpeg -y -loglevel error -framerate 30 -start_number 0 -i build/frames/f_%04d.png -i build/audio.wav \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest build/东三环_央视大楼_孟菲斯.mp4
echo build/东三环_央视大楼_孟菲斯.mp4
