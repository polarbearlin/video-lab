# 音频：歌词对齐、音效、混音

## 歌词逐字对齐（用户给了歌 + 歌词）

`scripts/align_lyrics.py song.mp3 lyrics.txt out.json`，三步：

1. **人声分离**：sherpa-onnx 的 spleeter 2stems（fp16）。模型在 GitHub releases（`k2-fsa/sherpa-onnx/releases/download/source-separation-models/sherpa-onnx-spleeter-2stems-fp16.tar.bz2`），云端环境常常只能连 GitHub，HuggingFace 和 modelscope 会被拦。
2. **中文识别带逐字时间戳**：`sherpa-onnx-paraformer-zh-2023-09-14`（这个版本输出 timestamps；2024-03-09 版不输出）。按人声停顿切块识别，减少长段误差。
3. **拼音对齐**：识别结果和歌词都转成拼音（pypinyin），用 difflib 逐字配对；识别错的字（"手先"→"首先"）靠读音也能对上。没配上的字按前后插值。输出每行的 start / end / chars（每个汉字的秒数）。

歌词文件里 `[Verse]` 这类标签行会被跳过。字幕永远显示用户的歌词，不显示识别结果。

对齐后要告诉用户：
- 实际唱的和歌词有没有出入（例如"我可吃不下"没唱出来）；
- 歌词有没有事实错误（例如"三倍基数"应为"欠缴金额 1–3 倍"），画面上写准确说法。

要核对时，用 ffmpeg 把 SRT 烧进纯色视频，做一个"歌词时间轴核对视频"给用户听。

## 音效

用 `lib/audio` 的 mgaudio（来自 mg-styles-15）。每个 `sfx.*` 都已经做过响度归一，`m.sfx(sound, t, gain=...)` 的 t 是"视觉事件发生的时刻"（撞击在瞬态、whoosh 在擦过点、riser 在结尾）。常用：

| 画面动作 | 音效 |
|---|---|
| 纸片翻起 | `sfx.paper('flip', .35)` |
| 吊牌落下 | `sfx.paper('rustle', .4)` |
| 文件滑上桌 | `sfx.paper('slide', .6)` |
| 气泡弹出 | `sfx.pop('soft')` |
| 大字出现 | `sfx.text_hit('pop')` |
| 盖章 | `sfx.stamp('seal')` |
| 红笔画圈 | `sfx.pen('marker', 1.0, strokes=[...])` |
| 镜头转场 | `sfx.whoosh(.6, 'soft')` |
| 东西被戳破 | `sfx.impact('punch')` + `sfx.pop('cork')` + `sfx.paper('crumple')` |
| 12 个月依次点亮 | `sfx.tick('wood')` 每 0.1–0.14 秒一个 |
| 硬币 | `sfx.coin()` |
| 敞亮、成功 | `sfx.shimmer_hit('A5')` |

重复段落的音效用平移包装器复用（见 `assets/example-sfx.py` 的 `round_sfx(S)`）。导出响度 -25 LUFS 左右（只是点缀）。

合成音效干净、不侵权，但真实感不如录音。用户要更真实时，用 Freesound（CC0 筛选，需要 API key，放在环境的网络密钥里，Authorization 前缀是 `Token`），或者让用户用手机录撕纸、胶带、盖章。避开 BBC Sound Effects（仅限非商业）。

## 混音

```
ffmpeg -i video.mp4 -i song.wav -i sfx.wav -filter_complex \
 "[2:a]volume=3dB[s];[1:a][s]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.85:level=false[a]" \
 -map 0:v -map "[a]" -c:v libx264 -crf 22 -c:a aac -b:a 256k out.mp4
```

截取片段时给歌曲加 0.15 秒淡入、0.7 秒淡出。成片响度对齐原曲（-14 LUFS 左右），用 `ebur128` 检查。

## 没有歌时

纯代码配乐用 mgaudio 的 recipes（guofeng、lofi、ambient、pop、chiptune 等），按场景切换时间点编排乐器。代码配乐适合铺底和卡点，做主旋律时感染力有限。自媒体正片建议用户用 AI 音乐工具出歌，或者用正版曲库。
