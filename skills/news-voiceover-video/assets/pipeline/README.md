# 渲染管线（来自《黄仁勋复职的十一天》，已出成片）

| 文件 | 作用 | 新项目要改什么 |
|---|---|---|
| `frame.py` | 竖屏外框 PNG（标题、画面窗、频道条） | 顶部常量：`BRAND`、`TAG`、`TITLE1`、`TITLE2`、主色 |
| `render.py` | 核心库：视频片段、撕纸截图卡、插画、涨跌柱、标题卡、拼接、ASS 字幕、套外框出片 | `GREEN/RED` 主色；`seg_bars` / `load_closes` 的默认日期、CSV 路径和标题是《黄仁勋》的，调用时传参数 |
| `fx.py` | 带标签的视频片段、示意插画、对比折线、计数器、片尾卡、合成音效 | `seg_lines` / `seg_counter` 的默认文字是旧项目的，调用时传参数 |
| `score.py` | 混音：人声总线、按小节拼接配乐、平滑闪避、停乐、音效、−14 LUFS + 限制器 | 一般不用改 |
| `example_full.py` | 旧项目的完整时间线（素材表、逐句镜头表 SHOTS、原声插入、字幕、配乐 cue、停乐、音效） | 复制成 `full.py`，按新文案重写素材表 `V`、`SHOTS`、原声 `B1–B3`、`build_audio` 里的 cue / drops / sfx |

路径约定：这些文件放在 `<仓库>/demos/<项目>/film/`（或 `film2/`），素材在 `demos/<项目>/素材/`，字体在 `<仓库>/assets/fonts/`（`scripts/setup_fonts.sh` 生成）。
环境变量：`VL_FONTS` 覆盖字体目录，`VL_OUT` 指定成片输出目录。

```sh
cd demos/<项目>/film && VL_OUT=/home/user/<项目>_film python3 full.py
```
