# 不信掌纹吉否，只信掌心所握 · 16:9 风格选样

原视频号口播（37.08 秒，竖屏 720×1280）改成横屏 1920×1080 的代码视频。画面全部用 Canvas 2D 代码画，不用 AI 生图/生视频；音频直接用原视频的音轨。**这一轮只做风格选样（每种风格 3 张关键帧），不出正片。**

| 风格 | 名字 | 一句话 | 配色 |
|---|---|---|---|
| A | 墨卦 · 水墨卦象 | 宣纸、远山、干笔飞白写出卦爻，朱砂印章「盖章」落下结论 | 宣纸 `#EEE5D0`、墨 `#1A1714`、淡墨 `#8B847A`、朱砂 `#B4302A` |
| B | 纸境 · 纸雕光影 | 一层层剪纸叠出纵深，背后一盏暖金色的光，字都印在米白纸条上 | 夜靛 `#111C33`、雾蓝 `#3D5A80`、米白纸 `#F3EBDD`、暖金 `#F2B950`、珊瑚红 `#E0644F`（只给「大凶」） |
| C | 大字报 · 极简大字排版 | 白底黑字、超粗黑体占半个画面，信号红只给最关键的词，结尾反转成黑底 | 纸白 `#F2F0EB`、墨黑 `#111111`、信号红 `#E2231A`、灰 `#8F8B84` |

关键帧时间（和字幕对应）：开头 1.40 秒「如果你只是在胜券在握的时候才肯拔剑」/ 中段 17.60 秒「往往是大凶」/ 结尾 36.50 秒「向前」。

## 文件

- `shared.js`：时间轴（校对版字幕，来自 `transcript_checked.srt`）、段落、手掌和掌纹、卦象数据、文字框登记
- `styleA.js` / `styleB.js` / `styleC.js`：三种风格，`render(ctx, t)` 是时间 t 的纯函数
- `index.html?style=A|B|C`：页面，兼容 `harness/render.mjs`（`window.renderAt` / `window.DEMO` / `window.__ready`）
- `stills.mjs`：出 9 张关键帧到 `stills/`，同时检查文字出框、字幕被压、大字互相重叠
- `check_glyphs.py`：按字体文件的字符表查缺字（关键帧里的每个字 + 全部字幕）
- `audio.sh`：从原视频抽出原音轨（AAC 直接复制 + 解码 WAV）

## 复现

```bash
./setup.sh                                   # 只需要 npm install 和字体那几步
node demos/zhangxin-suowo/stills.mjs         # MG_CHROME 默认 /usr/local/bin/google-chrome
python3 demos/zhangxin-suowo/check_glyphs.py
```

选定风格后出正片（下一轮）：`bash demos/zhangxin-suowo/audio.sh <video.mp4>`，再
`MG_GPU_ARGS=--no-sandbox MG_CHROME=/usr/local/bin/google-chrome node harness/render.mjs demos/zhangxin-suowo --query style=A`。
现在三种风格各只设计了三段画面（开头 / 卦象掌纹 / 周易向前），正片阶段再按每句字幕细分镜头。

字幕显示时去掉了句末的 ，。；：（句中标点和问号保留），文字以校对版为准。
