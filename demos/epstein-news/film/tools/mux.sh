#!/bin/sh
# 用法：sh tools/mux.sh   —— out/frames/*.jpg + out/mix.wav → out/<name>.mp4（−14 LUFS，真峰值 ≤ −1.2 dB）
# 两遍 loudnorm（线性）→ 192 kHz 上采样做真峰值限幅 → 48 kHz。只做 loudnorm 时真峰值常超标到 −0.8 dB。需要 ffmpeg 7+。
set -e
cd "$(dirname "$0")/.."
NAME=$(python3 -c "import json;print(json.load(open('film.json'))['name'])")
FPS=$(python3 -c "import json;print(json.load(open('film.json')).get('fps', 30))")
J=$(ffmpeg -hide_banner -i out/mix.wav -af loudnorm=I=-14:TP=-1.2:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$J" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -v error -y -i out/mix.wav -af "loudnorm=I=-14:TP=-1.2:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=192000,alimiter=limit=0.82:attack=1:release=60:level=false,aresample=48000" -c:a pcm_s16le out/mix_norm.wav
ffmpeg -v error -y -framerate $FPS -i out/frames/%05d.jpg -i out/mix_norm.wav -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 256k -shortest out/$NAME.mp4
ffmpeg -hide_banner -i out/$NAME.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:" | tail -2
ffprobe -v error -show_entries format=duration -of csv=p=0 out/$NAME.mp4
