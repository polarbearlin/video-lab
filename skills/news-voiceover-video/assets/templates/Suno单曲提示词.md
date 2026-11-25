# 《片名》Suno 配乐提示词：一首完整纯音乐

完整样例：`assets/example/黄仁勋_Suno单曲提示词.md`（实际生成了两版，进了曲库）。
只生成**一首**，长约 <片长 + 20 秒>，按片子的段落顺序换情绪。整首统一 **<100> BPM、<D 小调>**（轻松段转关系大调），速度不变，只换曲风和配器。拍子固定，一小节就是 <2.4> 秒，我可以按小节剪开，把每个段落对准画面，衔接不会乱。

## 和片子的对应

| 片子段落 | 时间 | 这一段音乐 |
|---|---|---|
| 钩子 | 0:05–0:35 | 暗色陷阱鼓点：808、钢琴短和弦、紧张感 |
| …… | …… | …… |
| 结尾 | …… | 钢琴收尾，最后停在一个长音上 |

## Suno 设置

1. **Custom（自定义）** 模式，模型用最新版（支持长曲的版本）。
2. **先不要打开 Instrumental**，把下面的「结构」粘进歌词框。
3. Title、Style、Exclude Styles 照抄。
4. 生成两版，两版都发我（mp3，有 wav 更好）。

**结构框里的是什么？** 方括号里的是给 Suno 看的段落说明（哪一段用什么乐器、什么情绪），**不是歌词，不会被唱出来**。整首没有一句歌词。
**如果出现了人声**：打开 Instrumental 再生成一次（歌词框会消失，没关系，风格里已经写了段落顺序）。
**如果生成出来太短**：用 Extend（延长）从结尾接着生成，把结构里还没出现的段落标签粘进去。
**发布用**：请用 Suno 付费账号生成，免费账号的曲子不能商用。

### Title
```
<短英文名>_full_score
```

### Style
```
instrumental cinematic documentary score, one continuous track, <100> BPM, <D minor>, no vocals. Sections change mood in order: <段落 1 的曲风和配器>; <段落 2>; …; reflective solo piano outro ending on one sustained note. Same tempo throughout, clear section changes on the downbeat, sparse midrange that leaves space for voice-over, modern YouTube documentary mix
```

### Exclude Styles
```
vocals, singing, vocal chops, choir, rap, spoken word, shouts, guitar solo, tempo change, lo-fi crackle
```

### 结构（粘进歌词框）
```
[Instrumental]

[Intro: cinematic boom, filtered drums, 2 bars]

[Section A: <钩子段配器和情绪>]

[Stop: one bar of silence]

[Section B: <……>]

[Build: spiccato strings, taiko drums, rising tension, riser]

[Section C: <高潮段>]

[Big hit]

[Section D: <轻松 / 反转段>]

[Section E: <转冷段>]

[Outro: reflective solo piano, soft pad, gentle and restrained, ends on one sustained piano note]

[End]
```

## 试听标准

- 整首速度不变，段落之间曲风明显不同，但听起来是同一首歌。
- 推进段要明显越来越紧；轻松段一听就轻松。
- 全程没有人声；结尾干净地收在一个钢琴长音上。
- 段落长度不用卡准，我会按小节剪到画面长度。
