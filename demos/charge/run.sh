#!/bin/bash
# 分段渲染：快速段落开运动模糊，其余不开
cd /home/user/libai
export MG_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome MG_GPU_ARGS="--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader"
O=demos/charge/out/seg; mkdir -p $O; : > $O/list.txt
k=0
for s in "0 10.6 1" "10.6 12.8 4" "12.8 15.2 1" "15.2 19 3" "19 25.3 1" "25.3 28.5 3" "28.5 30 1"; do
  set -- $s; f=$O/seg$k.mp4; echo "file '$(realpath -m $f)'" >> $O/list.txt
  if [ ! -s $f ]; then echo "[$(date +%T)] seg$k $1-$2 mb=$3"; node harness/render.mjs demos/charge --from $1 --to $2 --mb $3 --shutter 0.5 --workers 3 --noaudio --out $f > $O/seg$k.log 2>&1 || { echo FAIL seg$k; tail -3 $O/seg$k.log; }; fi
  k=$((k+1))
done
ffmpeg -loglevel error -y -f concat -safe 0 -i $O/list.txt -c copy demos/charge/out/charge_noaudio.mp4 && echo ALLDONE
