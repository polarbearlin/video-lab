# 《黄仁勋复职的十一天》Suno 配乐提示词 v2：一首完整纯音乐

取代 v1（7 段分开生成）。这一版只生成**一首**，长约 5 分 40 秒，按片子的段落顺序换情绪。
整首统一 **100 BPM、D 小调**（狂欢段转到关系大调 F 大调），速度不变，只换曲风和配器。拍子固定，一小节就是 2.4 秒，我可以按小节剪开，把每个段落对准画面，衔接不会乱。

## 和片子的对应

| 片子段落 | 时间 | 这一段音乐 |
|---|---|---|
| 钩子 | 0:05–0:38 | 暗色陷阱鼓点：808、钢琴短和弦、紧张感 |
| 起因 | 0:38–1:35 | 调查感：脉冲合成器琶音、时钟声、低音铺底，鼓变轻 |
| 辞职被拒 | 1:35–2:31 | 沉稳：钢琴动机、大提琴、克制的鼓 |
| 白宫出手 | 2:31–3:46 | 先蓄力（弦乐断奏 + 太鼓），再进入持续推进的惊悚段 |
| 狂欢 | 3:46–4:24 | 转放克：拍击贝斯、铜管、拍手，轻快有梗 |
| 质疑 | 4:24–4:56 | 一下转冷：稀疏的低音和钟声 |
| 结尾 | 4:56–5:42 | 钢琴收尾，最后停在一个长音上 |

## Suno 设置

1. **Custom（自定义）** 模式，模型用最新版（支持 8 分钟长度的版本）。
2. **先不要打开 Instrumental**，把下面的「结构」粘进歌词框（只有方括号标签，没有歌词，Suno 会按它分段）。
3. Title、Style、Exclude Styles 照抄。
4. 生成两版，挑一版发我（mp3，有 wav 更好）。

**如果出现了人声**：打开 Instrumental 再生成一次（这时歌词框会消失，没关系，风格里已经写了段落顺序）。
**如果生成出来不到 5 分 30 秒**：用 Extend（延长）从结尾接着生成，把结构里还没出现的段落标签粘进去。

### Title
```
JH_full_score
```

### Style
```
instrumental cinematic documentary score, one continuous track, 100 BPM, D minor, no vocals. Sections change mood in order: dark trap news beat with 808 and piano stabs; minimal investigative pulse with synth arpeggio and ticking clock; serious felt piano and cello with restrained drums; rising spiccato strings and taiko build into a driving political thriller section; sudden switch to playful funk in F major with slap bass, brass stabs and claps; cold sparse dark minimal section; reflective solo piano outro ending on one sustained note. Same tempo throughout, clear section changes on the downbeat, sparse midrange that leaves space for voice-over, modern YouTube documentary mix
```

### Exclude Styles
```
vocals, singing, vocal chops, choir, rap, spoken word, shouts, guitar solo, tempo change, lo-fi crackle
```

### 结构（粘进歌词框）
```
[Instrumental]

[Intro: cinematic boom, filtered drums, 2 bars]

[Section A: hard dark trap beat, 808 sub bass, rolling hi-hats, dark piano stabs, tense strings]

[Stop: one bar of silence]

[Section B: minimal investigative pulse, synth bass arpeggio, ticking clock, low drone, light drums]

[Section C: serious felt piano ostinato, cello swells, restrained hip-hop drums, boardroom pressure]

[Build: spiccato strings, taiko drums, rising tension, riser]

[Section D: driving political thriller, full strings, pulsing synth bass, big drums]

[Big hit]

[Section E: playful funk in F major, slap bass, wah guitar, brass stabs, claps, bouncy and cheeky]

[Section F: cold sparse dark minimal, low sub bass, distant bells, half-time drums]

[Outro: reflective solo piano, soft pad, gentle and restrained, ends on one sustained piano note]

[End]
```

## 试听标准

- 整首速度不变（100 BPM），段落之间曲风明显不同，但听起来是同一首歌。
- 白宫那段（Section D）要明显越来越紧；放克那段（Section E）要一听就轻松。
- 全程没有人声。
- 结尾干净地收在一个钢琴长音上。
- 段落长度不用卡准，我会按小节剪到画面长度。

## 我拿到以后怎么做

1. 测出准确的拍速和每一小节的位置，找出七个段落的起点。
2. 按小节把每段剪到对应画面的长度（多了裁掉，少了按小节循环），在段落起点对齐鼓点。
3. 保留现在的停乐、上升音、重击、打字机等设计，重新混音。
4. 画面不用重渲，只换音轨，出修订 v3。
