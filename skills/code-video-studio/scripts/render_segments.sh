#!/bin/bash
# 分段渲染（防崩溃、可断点续跑）：每段单独启动浏览器，失败重试一次，已完成的段跳过，最后无损拼接。
# 用法: render_segments.sh <demo目录> <页面.html> <总时长秒> <输出目录> [每段秒数=12] [进程数=3]
# 例:   render_segments.sh demos/pie paperV3.html 72 demos/pie/out/segV3
# 在仓库根目录运行（harness/render.mjs 所在处）。完成后输出 <输出目录>/all_noaudio.mp4，日志末尾写 ALLDONE。
set -u
DEMO=$1; PAGE=$2; DUR=$3; OUT=$4; SEG=${5:-12}; WORKERS=${6:-3}
export MG_CHROME=${MG_CHROME:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}
# 无显卡环境用 SwiftShader 跑 WebGL；有显卡时可以覆盖 MG_GPU_ARGS
export MG_GPU_ARGS=${MG_GPU_ARGS:---no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader}
mkdir -p "$OUT"
n=$(python3 -c "import math;print(math.ceil($DUR/$SEG))")
: > "$OUT/list.txt"
for ((k=0; k<n; k++)); do
  f=$(python3 -c "print($k*$SEG)"); t=$(python3 -c "print(min($DUR, ($k+1)*$SEG))")
  seg="$OUT/seg$k.mp4"; echo "file '$(realpath -m "$seg")'" >> "$OUT/list.txt"
  [ -s "$seg" ] && { echo "seg$k 已存在，跳过"; continue; }
  for attempt in 1 2; do
    echo "[$(date +%H:%M:%S)] seg$k ($f–$t s) 第 $attempt 次"
    if node harness/render.mjs "$DEMO" --page "$PAGE" --workers "$WORKERS" --noaudio --from "$f" --to "$t" --out "$seg" > "$OUT/seg$k.log" 2>&1; then
      echo "[$(date +%H:%M:%S)] seg$k 完成"; break
    fi
    echo "seg$k 失败："; tail -3 "$OUT/seg$k.log"; rm -f "$seg"
  done
done
ffmpeg -loglevel error -y -f concat -safe 0 -i "$OUT/list.txt" -c copy "$OUT/all_noaudio.mp4" && echo "拼接完成：$OUT/all_noaudio.mp4"
echo ALLDONE
