# 《充到 80%》后 45 秒 · Blender 版

网页版（`demos/charge/index.html?v=3d`）仍然是唯一的时间表：镜头、手机动作、字幕、UI 全在 JS 里。这里把它"搬进" Blender，用 Cycles 渲染出真实的玻璃、金属、景深和运动模糊。

```
export_web.mjs  网页 → build/：scene.glb（纸雕场景 + 逐帧动画）、frames.json（镜头 / 光 / 手机矩阵）、seq/（手机屏幕等画布序列）、overlay/（透明字幕层）
scene.py        Blender 5：导入 scene.glb + 手机模型 phone.glb，按 frames.json 打关键帧（镜头、焦点、灯光、手机），屏幕贴图序列，Cycles 渲染
compose.py      Blender 渲染 + 热成像调色（51–62 s）+ 字幕层 → mp4
```

## 一次完整流程（仓库根目录）

```bash
# 0. 准备：bash setup.sh；装好 Blender 5.x、Chrome、ffmpeg
export MG_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"     # Windows: C:\Program Files\Google\Chrome\Application\chrome.exe

# 1. 先导出 8 个时刻，出预览截图（几分钟）
node demos/charge/blender/export_web.mjs --times 31.8,35,38.6,42.4,50,53.8,69.8,74.5
blender -b --factory-startup -P demos/charge/blender/scene.py -- --stills 31.8,35,38.6,42.4,50,53.8,69.8,74.5 --preview
for t in 31.80 35.00 38.60 42.40 50.00 53.80 69.80 74.50; do python3 demos/charge/blender/compose.py --still demos/charge/blender/build/render/still_$t.png --t $t; done
#    → build/render/still_*_comp.png，拼成总览发给用户确认

# 2. 确认后导出全片（1350 帧，约 10–20 分钟，不需要显卡）
rm -rf demos/charge/blender/build && node demos/charge/blender/export_web.mjs --from 30 --to 75

# 3. 先计时一帧，再渲染全片（scene.py 会自动用 OptiX / CUDA / Metal；日志第一行打印 render device）
blender -b --factory-startup -P demos/charge/blender/scene.py -- --stills 42.4
blender -b --factory-startup -P demos/charge/blender/scene.py -- --render                 # 全部 901–2250 帧
blender -b --factory-startup -P demos/charge/blender/scene.py -- --render --frames 1501-1600   # 只重渲一段

# 4. 合成
python3 demos/charge/blender/compose.py      # → build/charge3d_back45.mp4（无声）
```

## 参数

| 参数 | 作用 |
|---|---|
| `--preview` | 50% 分辨率、40 采样 |
| `--samples N` / `--scale P` | 采样数 / 分辨率百分比 |
| `--cpu` | 强制 CPU（只用于没有显卡时试跑） |
| `--save path.blend` | 存一个 .blend，可以在 Blender 里打开看场景、调灯 |

## 调画面时改哪里

- **镜头、手机动作、出场时间、字幕**：改网页版 `charge_p3.js` / `charge_p2.js`（改完重新拼 `charge.js`），再跑 export_web.mjs。
- **灯光、材质、景深**：改 `scene.py`。灯光强度在"灯光"一节，景深光圈在"镜头"一节（影棚 f/2.0，其他 f/2.8）。
- **热成像**：`compose.py` 的 `thermal()`。

## 已知要注意的

- `phone.glb` 屏幕 UV 是 V 向上，网页画布序列也需要翻转，scene.py 已用 Mapping 节点处理（`flip_v`）。
- 主光和影棚柔光对光泽射线不可见（`visible_glossy = False`），否则手机屏幕和玻璃卡上会出现大块白斑。
- scene.glb 有一百多 MB（画布贴图重复），不进仓库，每次本地导出即可。
- 云端没有显卡：同样的预览截图在 4 核 CPU 上每张约 20 秒（50% 分辨率、32 采样）；正式渲染请在有显卡的电脑上跑。
