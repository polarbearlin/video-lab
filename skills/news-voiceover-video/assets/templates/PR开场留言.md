# PR 说明（gh pr create --body-file）

```markdown
## 《片名》素材协作（Grokbot × Claude）

**分工**
- Grokbot：按任务单找视频、截图、数据，出示意插画，登记来源表。
- Claude：写任务单、验收、剪辑、配乐、渲染。
- Vasanti：定稿文案（已完成）、录豆包配音（进行中）、看成片。

**文件**
- 定稿文案：`demos/<项目>/versions/v1/自媒体文案_v2_定稿.md`
- 素材任务单：`demos/<项目>/versions/v1/素材任务单_v1.md`
- 插画任务单：`demos/<项目>/versions/v1/插画任务单_v1.md`
- 来源表：`demos/<项目>/素材/来源表.md`

**规矩**：不推 main、不合并本 PR；mp4 用 `git add -f`；> 50 MB 放草稿 Release；仓库公开，不放密钥和隐私信息。

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

# 第一条留言：素材任务

```markdown
## 【素材任务】Grok Bot 请开始找素材（V01–Vxx、J01–Jxx）

Grok Bot 你好。文案已定稿，Vasanti 正在录配音。请按任务单找素材：

**任务单**：`demos/<项目>/versions/v1/素材任务单_v1.md`
**定稿文案**：`demos/<项目>/versions/v1/自媒体文案_v2_定稿.md`

### 怎么做
1. 按任务单找，**第一批优先**：<编号>。
2. 放进本分支 `demos/<项目>/素材/`：视频 `video/`、截图 `img/`、原帖 `x/`、数据 `data/`、插画 `illus/`。
3. 每个文件在 `素材/来源表.md` 登记一行（格式见任务单）。
4. 每批推送后在本 PR 留言：`【交付】V01 V02 …；视频 N 段，截图 N 张；来源表已更新`。找不到写“未找到 + 原因”，找到相似的写“相似替代 Vxx：原因”。

### 急事（先回）
- <某句旁白要靠哪条来源，找不到就删>

### 口径
新闻台片段可以直接引用；找不到原件找相似的也行。不收：AI 图冒充实拍、与事件无关的私人照片和信息。X 截图里普通网友的头像和名字打码。

插画任务单另发一条，和视频同时进行。我这边开了监听，交付后我来核对。

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

# 验收留言

```markdown
【Claude】第 N 批收到，验收通过 / 部分通过。

**已核对**
- <哪些能用、怎么用>

**缺口换个找法（相似就行）**
- **Vxx**：<具体替代找法：新闻报道里插的同一画面 / 同一人物别的场合 / Wikimedia / Pexels / Mixkit 空镜>

**接下来**
<下一批编号和顺序>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

# 收尾留言

```markdown
【Claude】收尾：《片名》成片已交付 Vasanti（竖屏 X 分 X 秒）。最终用到视频 N 段、截图 N 张、插画 N 张，来源都在片尾署名和来源表里。辛苦了，本 PR 的监听我这边已关闭。

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
