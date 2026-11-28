#!/usr/bin/env bash
# Final encodes of 第一场雪: the captured 1920x1080 30 fps picture + the burned-in subtitles + the mix, H.264 two-pass
# (~5 Mbps: under 45 MB for the minute) and AAC 192 kbps, cut to the dialogue's exact length; then the contact sheet.
#   first-snow/encode.sh PICTURE.mp4 MIXDIR OUTDIR     (MIXDIR from mix.py; subs/ from subs.py next to this script)
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
pic="$1"; mixdir="$2"; out="$3"
mkdir -p "$out"
dur=60.000
subs="$here/subs"
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT

# the no-dialogue cut keeps the two caption cards, not the lines nobody speaks in it
grep -v ',Line,' "$subs/subs.ass" > "$work/cards.ass"

enc() {  # enc ASS WAV OUT
  local vf="ass=$1:fontsdir=$subs/fonts,format=yuv420p"
  local x264=(-c:v libx264 -preset slow -b:v 5000k -maxrate 8000k -bufsize 10000k -profile:v high -level 4.1
              -g 60 -bf 3 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -movflags +faststart)
  ffmpeg -hide_banner -loglevel error -y -i "$pic" -vf "$vf" "${x264[@]}" -pass 1 -passlogfile "$work/x264" -an -t $dur -f mp4 /dev/null
  ffmpeg -hide_banner -loglevel error -y -i "$pic" -i "$2" -map 0:v:0 -map 1:a:0 -vf "$vf" "${x264[@]}" -pass 2 -passlogfile "$work/x264" \
    -c:a aac -b:a 192k -ar 48000 -t $dur "$3"
}
enc "$subs/subs.ass" "$mixdir/mix.wav" "$out/第一场雪_60s_16x9.mp4"
enc "$work/cards.ass" "$mixdir/nodialogue.wav" "$out/第一场雪_60s_16x9_nodialogue.mp4"

# contact sheet: one frame every 5 s (0, 5, ... 55), 4 x 3, each stamped with its time
ffmpeg -hide_banner -loglevel error -y -i "$out/第一场雪_60s_16x9.mp4" \
  -vf "select='not(mod(n\,150))',scale=640:-1,drawtext=fontfile=$(fc-match -f '%{file}' 'DejaVu Sans:bold'):text='%{eif\:t\:d}s':x=14:y=12:fontsize=26:fontcolor=white:shadowcolor=black@0.7:shadowx=2:shadowy=2,tile=4x3:padding=6:margin=6:color=0x101418" \
  -fps_mode passthrough -frames:v 1 -q:v 3 "$out/第一场雪_60s_contact.jpg"
