#!/bin/bash
# 成片音频 = 原视频号视频的原音轨，不改速、不重新配音。
#   bash demos/zhangxin-suowo/audio.sh <video.mp4>
# 产出：out/audio_original.m4a（原 AAC 流直接复制，无损）
#       out/audio.wav（同一条音轨解码成 PCM，harness/render.mjs 出片时会自动混进去）
set -e
cd "$(dirname "$0")"
SRC=${1:?需要原视频路径}
mkdir -p out
ffmpeg -y -v error -i "$SRC" -vn -map 0:a:0 -c:a copy out/audio_original.m4a
ffmpeg -y -v error -i "$SRC" -vn -map 0:a:0 -c:a pcm_s16le out/audio.wav
ffprobe -v error -show_entries format=duration -of csv=p=0 out/audio_original.m4a
