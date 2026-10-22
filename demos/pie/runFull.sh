#!/bin/bash
# 分段渲染 72 秒纸雕版：每段 12 秒，单独启动浏览器，失败自动重试一次
cd /home/user/libai
export MG_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome MG_GPU_ARGS="--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader"
OUT=demos/pie/out/segFull; mkdir -p $OUT
for k in 5 6 7 8 9 10; do
  f=$((k*12)); t=$((f+12)); [ $k -eq 10 ] && t=125.57; seg=$OUT/seg$k.mp4
  [ -s $seg ] && { echo "seg$k exists, skip"; continue; }
  for attempt in 1 2; do
    echo "[$(date +%H:%M:%S)] seg$k ($f-$t s) attempt $attempt"
    if node harness/render.mjs demos/pie --page paperFull.html --workers 3 --noaudio --from $f --to $t --out $seg > $OUT/seg$k.log 2>&1; then echo "[$(date +%H:%M:%S)] seg$k done"; break; fi
    echo "seg$k failed"; tail -3 $OUT/seg$k.log; rm -f $seg
  done
done
echo ALLDONE_FULL
