# 先出歌：歌词与 Suno 风格提示词

## 歌词结构（按片子的章节排）

128 BPM 下一小节约 1.9 秒。90 秒片子的参考结构（大肥鱼 v13 实测能对上）：

| 段落 | 时长 | 情绪 / 编曲 |
|---|---|---|
| Intro | 2–4 小节 | 八音盒、悄悄话、轻轻哼；滤波扫上去冲进第一个"炸点" |
| Verse 1 | 4 小节 | 角色自我介绍，俏皮，拨弦加放克贝斯 |
| Pre-Chorus | 4–6 小节 | 越来越燃，军鼓滚奏；副歌前停一拍 |
| Chorus | 4 小节 | 最洗脑；放梗最多的一句（例："服务器繁忙～请稍后再试哦"） |
| Verse 2 | 6–8 小节 | 调皮；一句念白加一句悄悄话（笑点） |
| Bridge | 6 小节 | 全部撤掉，只剩八音盒和软钢琴，很安静；结尾一句念白把鼓带回来 |
| Final Chorus | 6–8 小节 | 最燃，加 8-bit 琶音 |
| Outro | 4–6 小节 | 软钢琴把副歌旋律慢慢弹一遍，渐慢；最后一句是给评论区的提问 |

## 钩子词：歌词和画面"对上"的地方

每段挑一个画面里的梗写进歌词，并且安排在那个画面出现的时候唱到。例：

| 画面 | 歌词 |
|---|---|
| 是鲸！ | 本鲸不是鱼，是鲸鲸 |
| 冲到第 1 名 | 排行榜上第一是我耶 |
| 服务器繁忙 | 服务器繁忙～请稍后再试哦 |
| 思考框露馅 | （悄悄话）深度思考中……要不要故意打错字 |
| 锁屏翻到 7:30 | （念白）叮～七点半，早安！ |
| 片尾提问 | 你家的鱼叫什么名字呀～ |

## 风格方向

| 方向 | 感觉 | 适合 |
|---|---|---|
| **卡哇伊未来贝斯（默认）** | 宽阔的合成器和弦、侧链律动、人声切片 | 明亮舞台、快跳、一停一炸的卡点 |
| 8-bit 芯片 J-pop | 小游戏感 | 只做点缀，通篇用会显得廉价 |
| 城市流行 / 放克 | 律动高级 | 不够萌 |

**风格（Style）模板：**
```
kawaii future bass, Mandarin cute pop, 128 BPM, F major, solo bright bubbly female vocal, airy and playful with giggles, wide supersaw chords, sidechain pumping, pitched vocal chops, funky bass, claps and finger snaps, chiptune 8-bit sparkles, stop-time before chorus, music box intro and bridge, clean punchy mix
```
**排除风格（Exclude Styles）：**
```
male vocals, rap, dubstep growl, metal, heavy autotune, sad ballad, English lyrics
```

## 交代给用户的生成要点
- 用 Suno 最新模型和自定义模式（Custom）；歌词和风格分开填。
- 多生成几版，重点听三处：副歌洗不洗脑、安静段有没有真的安静、念白是不是被唱成了歌。
- 时长不用卡死，长了短了都可以按小节剪。
