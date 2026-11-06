# 爱泼斯坦案 · 画面源码

成片：`../爱泼斯坦案_成片_v1.mp4`（不进仓库），字幕 `../爱泼斯坦案_成片_v1.srt`。4:20，1920×1080，30fps，−14 LUFS。

流程（在 film/ 下）：
1. `python3 tools/build.py`：旁白 ASR 对齐台词 → `film.json`（每段起止和逐字时间）、`cues.json`、srt
2. `python3 tools/fonts.py`：按全片用字重新子集化字体（改了字就要重跑）
3. `python3 tools/assemble.py`：page_head + helpers + beats.js + page_tail → index.html
4. `node tools/shoot.mjs video <workers> <t0> <t1>`：逐帧截图
5. `python3 tools/mix.py` 配乐与旁白混音，`bash tools/mux.sh` 合成

不进仓库：旁白音频（audio/）、字体、帧、out/。素材授权见 `CREDITS.md`。
