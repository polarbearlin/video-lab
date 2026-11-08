# 北极熊 vs 大馋猫（30 秒 16-bit 像素格斗）

提示词见 `提示词.md`，成片 `bear_vs_cat_30s.mp4`（1920×1080，30fps，−14 LUFS）。

**做法**：不用浏览器，直接用 Python 逐像素绘制 320×180 的虚拟屏，再整数 6 倍放大，最后用 ffmpeg 编码。

- `src/gfx.py`：像素绘图库（椭圆、多边形、线段、圆环扇形、描边、点阵文字）
- `src/sprites.py`：两个角色的像素造型
- `src/scene.py`：舞台、动作时间线、特效、血条、横幅，`render_frame(t)` 是 t 的纯函数
- `src/audio.py`：8 位音乐和音效（numpy 合成）
- `src/build.py`：逐帧渲染 → ffmpeg 管道 → 音频归一 → MP4

运行：`python3 src/build.py 输出.mp4`（需要 numpy、Pillow、ffmpeg，以及 Unifont 点阵字体）。
源码里的路径是在云端工作区里写的，换环境时改 `build.py` 和 `gfx.py` 里的字体路径、输出目录即可。
