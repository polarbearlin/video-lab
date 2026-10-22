# video-lab

用代码做短视频的实验仓库：画面是 Canvas / SVG / Three.js 网页，按时间逐帧截图（`harness/render.mjs`，来自 [mg-styles-15](https://github.com/Vincentwei1021/mg-styles-15)），配乐和音效用 `lib/audio`（mgaudio）合成，ffmpeg 合成成片。

## 作品

| 目录 | 内容 |
|---|---|
| `demos/pie` | 《老板画饼》打工人社保课 02 · 纸雕微缩剧场（`paperV3.*` = 新形象完整版，`paperFull.*` = 旧形象完整版）、杂志排版版（`ed.*`） |
| `demos/gas` | 《闻到煤气味》生活安全课 01 · 扁平插画歌曲版 |
| `demos/libai` | 李白的一生 · 40 秒水墨 |
| `demos/shebao`、`demos/sb15` | 社保题材风格探索截图 |
| `assets/chen2`、`assets/boss2` | 角色形象（小陈、白猫老板），作者原创 |
| `songs/` | 歌词与逐字时间轴（歌曲音频不在仓库里） |

## 在新环境里继续

```bash
./setup.sh                      # 装依赖、下载字体和乐器采样
# 把歌曲 mp3 放到 demos/pie/out/ 后：
python3 demos/pie/sfxFull.py    # 生成音效轨
node harness/render.mjs demos/pie --page paperV3.html --workers 3 --noaudio --from 0 --to 12 --out demos/pie/out/segV3/seg0.mp4
```

纸雕版没有显卡时很慢（约 2 秒一帧），按 12 秒一段分段渲染，`demos/pie/runV3.sh` 会跳过已完成的段。素材来源见 `assets/stock/CREDITS.md`。
