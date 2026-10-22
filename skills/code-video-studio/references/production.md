# 制作要点：环境、素材、角色、评审

## 云端环境

- **网络**：默认可能只通 GitHub。图库（Pexels、Unsplash、Pixabay）、ambientCG、Poly Haven、Wikimedia 需要用户在环境设置里放开网络。Openverse 能搜 CC0 / CC BY 图但很慢；Flickr 原图常被限流，可退回 600px 预览图做小道具。
- **API 密钥**：不要让用户把 key 贴进聊天。让用户在环境的 Network secrets 里添加（允许的域名、路径前缀、请求头名、前缀、值），新会话才生效；当前会话里该域名会被直接拦截。
- **GitHub**：会话里不能新建仓库，让用户在 github.com/new 建空私有仓库（不勾 README），再确认 Claude GitHub App 有该仓库的权限，然后用 add_repo 挂载推送。
- **容器会重启**：长渲染一定要分段，完成的段写在磁盘上；后台任务完成通知会在重启后丢失，回来时先查日志和已完成的段。
- **没有 GPU**：Three.js 走 SwiftShader 软件渲染，约 2 秒一帧。告诉用户本地有显卡的电脑能快几十倍。

## 素材授权

- 只用 CC0 / 公有领域 / CC BY（记录作者）/ OFL 字体。每个项目写 `CREDITS.md`。
- 人物不要用图库里的真人照片演反面角色（肖像权），用插画角色，或者只拍手、背影。
- 人民币图样只用局部、虚化，或者直接用 ¥ 符号。截图里的姓名、身份证号要打码，或者重排假数据。
- 字体（全部开源）：思源宋体 Noto Serif SC、思源黑体 Noto Sans SC、霞鹜文楷、站酷快乐体、马善政、柳建毛草、Instrument Serif。中文大字体可以用 pyftsubset 子集化。

## 用户提供角色形象：出图要求

每个角色需要一套姿势和表情图（不做骨骼动画，靠切换图片）：

| 要求 | 原因 |
|---|---|
| 全身、正面、头到脚完整、四周留白 | 立牌要站在地板上 |
| 透明背景最好，否则纯白 | 抠图干净 |
| 不要阴影和渐变光 | 场景里有真实光影 |
| 不要文字和道具 | 道具在场景里单独做动画 |
| 高度 1500px 以上 | 近景不糊 |
| 同一角色风格一致；两个角色最好同一画风 | 切换时不"换人"，同框时不割裂 |

提示词模板（先出定稿，再用定稿当参考图出各个姿势）：

```
<角色外貌：年龄、发型、服装、颜色>
Style: papercraft cut-out character, flat illustration printed on matte paper, simple shapes, clean outlines, soft flat colors, no shading, no cast shadow.
Full body, standing, front view, centered, head to feet visible with margin. Transparent (or pure white) background. No text, no props.
```

```
Same character as the reference image, exactly the same face, hair, clothes, colors and art style.
Pose: [动作描述].
Full body, front view, head to feet visible, transparent background. No text, no props, no shadow.
```

典型清单：主角 7 张（平静、大笑推开、严肃抬手拒绝、微笑、抱臂斜眼、托腮思考、拖行李走路），对手 5 张（伸手递东西、举马克笔、招手拍肩、震惊冒汗、满意站立）。

## 独立评审提示词（用户要高标准时）

起一个没参与制作的子代理，让它：
1. 用 ffmpeg 抽每秒一帧的总览、转场处的 10fps 胶片条、8–10 张全分辨率关键帧来看；
2. 检查规格（时长、分辨率、帧率、响度、黑帧）；
3. 按 7 个维度打 1–10 分：风格一致性、创意惊艳度、动效、版式字体、质感、音画同步、技术（5 = 学生作业，6 = 模板，7 = 扎实专业，8 = 高端广告）；
4. 给 6–10 条按影响排序的修改，每条带时间码、问题、原因和具体做法，至少两条用来提升惊艳度或情绪；
5. 标出 AI 模板感、不自然的中文、缺字方块、错误的安全或政策信息。

最多改 3 轮。

## 交付清单

- 原画质 mp4（下载卡片）+ 在线放映页（Artifact，每个视频不超过 15MB，`viewer/index.html` 的样式可复用）。
- 说明：做了什么、片段范围、已知不足、下一步可选项。
- 代码推到 GitHub：代码、角色图、材质、歌词时间轴；不推视频、字体、采样库（写 .gitignore 和 setup.sh）。
