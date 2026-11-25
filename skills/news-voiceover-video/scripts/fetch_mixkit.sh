#!/bin/bash
# 下载《黄仁勋》片用过的 Mixkit 免费配乐 7 首 + 音效 14 个（Mixkit Free License，可商用、不用署名，
# 但不允许把素材文件单独再分发，所以只放下载地址、不把 mp3 传进公开仓库）。
# 用法：bash fetch_mixkit.sh [目标目录，默认 ./素材/audio]   → music/ 和 sfx/ 两个子目录
set -e
DEST=${1:-素材/audio}
mkdir -p "$DEST/music" "$DEST/sfx"
get() { [ -s "$1" ] || curl -sSfL --retry 3 -A "Mozilla/5.0" -o "$1" "$2"; }
M=https://assets.mixkit.co/music
get "$DEST/music/mixkit_318_Thunder.mp3"               $M/318/318.mp3   # 暗色鼓点，钩子（前 20 秒是安静前奏，入点要往后放）
get "$DEST/music/mixkit_134_Deep_Techno_Ambience.mp3"  $M/134/134.mp3   # 调查感脉冲
get "$DEST/music/mixkit_281_Complicated.mp3"           $M/281/281.mp3   # 沉稳、有压力
get "$DEST/music/mixkit_106_Deep_Techno.mp3"           $M/106/106.mp3   # 持续推进（政治惊悚）
get "$DEST/music/mixkit_872_Gimme_that_Groove.mp3"     $M/872/872.mp3   # 放克，狂欢 / 玩梗
get "$DEST/music/mixkit_404_Greed.mp3"                 $M/404/404.mp3   # 冷、质疑
get "$DEST/music/mixkit_122_Slow_Rain.mp3"             $M/122/122.mp3   # 钢琴收尾
S=https://assets.mixkit.co/active_storage/sfx
get "$DEST/sfx/news_intro.mp3"            $S/1151/1151-preview.mp3   # 新闻片头
get "$DEST/sfx/hit_glitchy_suspense.mp3"  $S/679/679-preview.mp3     # 故障感重击
get "$DEST/sfx/glitch_break.mp3"          $S/2951/2951-preview.mp3   # 数字故障
get "$DEST/sfx/heartbeat_deep.mp3"        $S/498/498-preview.mp3     # 心跳
get "$DEST/sfx/riser_reverse_impact.mp3"  $S/784/784-preview.mp3     # 上升音 + 重击（揭晓）
get "$DEST/sfx/logo_impact.mp3"           $S/2900/2900-preview.mp3   # 片尾标志
get "$DEST/sfx/hit_suspense.mp3"          $S/2917/2917-preview.mp3   # 悬疑重击
get "$DEST/sfx/swoosh_fast.mp3"           $S/3115/3115-preview.mp3   # 快速转场
get "$DEST/sfx/whoosh_fast.mp3"           $S/1492/1492-preview.mp3   # 嗖
get "$DEST/sfx/hit_cool_trailer.mp3"      $S/2909/2909-preview.mp3   # 预告片重击
get "$DEST/sfx/hit_trailer_whoosh.mp3"    $S/2919/2919-preview.mp3   # 嗖 + 重击
get "$DEST/sfx/tv_transition.mp3"         $S/3089/3089-preview.mp3   # 电视新闻转场
get "$DEST/sfx/typing_device.mp3"         $S/1376/1376-preview.mp3   # 键盘
get "$DEST/sfx/typewriter_hit.mp3"        $S/1367/1367-preview.mp3   # 打字机重击（日期章落下）
ls -la "$DEST/music" "$DEST/sfx"
