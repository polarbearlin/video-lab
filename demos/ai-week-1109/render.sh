#!/bin/bash
# 16:9 成片，然后 9:16。音频是 audio.py 生成的纸页声。
set -euo pipefail
cd "$(dirname "$0")/../.."
export MG_CHROME="${MG_CHROME:-/usr/local/bin/google-chrome}"
export MG_GPU_ARGS="${MG_GPU_ARGS:---disable-gpu --no-sandbox}"
python3 demos/ai-week-1109/audio.py
node harness/render.mjs demos/ai-week-1109 --workers 3 --mb 1 --crf 18 \
  --out demos/ai-week-1109/ai-week-1109-16x9.mp4
node harness/render.mjs demos/ai-week-1109 --workers 3 --mb 1 --crf 18 \
  --query layout=916 \
  --out demos/ai-week-1109/ai-week-1109-9x16.mp4
