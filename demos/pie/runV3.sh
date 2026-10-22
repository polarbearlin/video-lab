#!/bin/bash
# 新形象完整版：等旧版渲染结束后开始，0–125.57 s 分 11 段
until grep -q ALLDONE_FULL$ /home/user/libai/demos/pie/out/runFull.log; do sleep 30; done
cd /home/user/libai
export MG_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome MG_GPU_ARGS="--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader"
OUT=demos/pie/out/segV3; mkdir -p $OUT
for k in 0 1 2 3 4 5 6 7 8 9 10; do
  f=$((k*12)); t=$((f+12)); [ $k -eq 10 ] && t=125.57; seg=$OUT/seg$k.mp4
  [ -s $seg ] && { echo "seg$k exists, skip"; continue; }
  for attempt in 1 2; do
    echo "[$(date +%H:%M:%S)] seg$k ($f-$t s) attempt $attempt"
    if node harness/render.mjs demos/pie --page paperV3.html --workers 3 --noaudio --from $f --to $t --out $seg > $OUT/seg$k.log 2>&1; then echo "[$(date +%H:%M:%S)] seg$k done"; break; fi
    echo "seg$k failed"; tail -3 $OUT/seg$k.log; rm -f $seg
  done
done
echo ALLDONE_V3
