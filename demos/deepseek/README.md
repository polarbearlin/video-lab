# 《大肥鱼，不是机器人》30 秒 · 渲染说明

Q 版大肥鱼在一整张发光的界面桌面上蹦来蹦去，故事靠界面变化来讲：视频页 → 评论区 → 键盘打字 → 被问"你是不是 AI" → 清除插件 → 锁屏早安 → DeepSeek 对话框。

## 文件

| 文件 | 作用 |
|---|---|
| `timeline.py` | **唯一的时间轴**：每一跳、界面状态、镜头、字幕、音效时间点都在这里 |
| `ui_states.py` | 界面状态图（HTML → Chrome 截图）+ 每块板的逐帧序列 |
| `scene.py` | Blender 场景（EEVEE）：界面板、角色、灯光、镜头，逐帧关键帧 |
| `score.py` | 配乐 + 音效（代码合成，读同一份时间轴） |
| `compose.py` | 帧 + 字幕 + 配乐 → mp4（另出一版只有音效的） |
| `render.sh` | 本地一键：`stills` / `preview` / `full` / `upload` |

角色模型：`assets/models/dafeiyu_chibi/dafeiyu_chibi.glb`（用户用 Tripo 做的 Q 版，减面到约 11 万三角形）。

## 给本地 Agent 的提示词（复制整段）

```
你在我的 Mac 上负责渲染，不改创意、不改代码逻辑，只跑命令、报告结果。
仓库：polarbearlin/video-lab（已在本机就 cd 进去，没有就 git clone）。

1. git pull
2. 检查环境：Blender（/Applications/Blender.app）、Google Chrome、ffmpeg、python3（需要 numpy scipy soundfile pillow，缺了就 pip install）。
   字体：如果 assets/fonts/NotoSansSC.ttf 不存在，运行 bash setup.sh 里下载字体那部分（或整个 setup.sh，pip 装失败的可以跳过）。
3. 先出预览图：bash demos/deepseek/render.sh stills
   记下终端里每张图的耗时（STILL xx 秒），把 demos/deepseek/build/stills_sheet.jpg 发给我看。
4. 我确认后再跑整片：bash demos/deepseek/render.sh full
   中途断了直接重跑同一条命令，已经渲好的帧会跳过。
5. 上传：bash demos/deepseek/render.sh upload
   （需要 gh 已登录；没装 gh 就手动在 GitHub 仓库的 Releases 页面新建一个 release，把 demos/deepseek/build/ 里的 mp4 和 stills_sheet.jpg 拖进去）
6. 告诉我 release 的名字和每帧平均耗时。

注意：
- 报错就把完整报错贴给我，不要自己改 scene.py / timeline.py。
- 不要把视频、图片、build/ 目录提交到 git。
- 不要上传任何密码、密钥、账号信息。
```

## 改东西改哪里

- 换跳的位置 / 节奏：`timeline.py` 的 `HOPS`
- 界面文字：`timeline.py` 的 `TYPE_*`、`SUBS`，界面样式在 `ui_states.py`
- 镜头远近：`timeline.py` 的 `CAM`
- 署名：`compose.py` 的 `CREDIT`（CC BY-NC-SA 4.0，非商用）
