# 交给本地 Agent：《充到 80%》3D 手机版接入与渲染

> **更新（推荐用 Blender 版）**：后 45 秒已经做好 Blender 管线（真实光线追踪、玻璃金属、景深、运动模糊），手机直接用 `assets/models/phone_agent/phone/phone.glb`。按 `demos/charge/blender/README.md` 操作即可：导出 → 预览截图 → 全片渲染 → 合成。下面的 three.js 网页渲染方案保留作备选。

> 把这整份文件交给本地 Agent（Claude Code / Codex 等）。它负责：接入 Blender 手机模型 → 出 8 张关键帧 → 渲染完整 75 秒 → 拼接。

## 0. 背景（给 Agent 看）

- 仓库：`polarbearlin/video-lab`（私有）。视频是网页逐帧渲染：页面暴露 `window.renderAt(t)`，`harness/render.mjs` 用无头 Chrome 一帧一帧截图，再用 ffmpeg 合成。每一帧都是时间 t 的纯函数，可以任意分段、断点续跑。
- 这条片：`demos/charge/`，竖屏 1080×1920，30fps，75 秒。
  - 0–30 秒：纸雕微缩剧场 + UI 动效（已定稿，云端渲染过）。
  - 30–75 秒：纸雕 + 真 3D 手机 + 白色影棚 + 热成像 + 玻璃卡片。URL 参数 `?v=3d` 开启这一版（渲染时加 `--query v=3d`）。
- `charge.js` 是由 5 个文件拼起来的，**改的时候改分文件，再重新拼**：
  ```bash
  cd demos/charge && cat charge_head.js charge_body.js charge_p2.js charge_p3.js charge_foot.js > charge.js
  ```
- 手机模型：`assets/models/phone_agent/phone/phone.glb`（你之前在 Blender 里做的那个；`phone_lo.glb` 是低面数版）。说明见同目录 `README.md`。

## 1. 准备环境（只做一次）

```bash
git clone https://github.com/polarbearlin/video-lab.git
cd video-lab
bash setup.sh          # 安装 npm 依赖（three、puppeteer-core）和 python 依赖，下载字体
```

需要：Node 18+、Python 3.10+、ffmpeg、本机装好的 Chrome。

`setup.sh` 里 pip 装的东西比较多（rembg、sherpa-onnx 是做抠图和歌词对齐用的）。这次只渲染的话，失败可以跳过，只要 `npm install` 成功、字体下载成功就行。

## 2. 接入手机模型（代码任务）

现在 `charge_p3.js` 里的 `makePhone()` 是用代码捏的占位手机。改成加载 GLB：

1. 在 `initP3()` 里动态导入 GLTFLoader：
   `const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');`
2. 新写 `loadPhoneGLB()`：
   - 加载 `/assets/models/phone_agent/phone/phone.glb`；
   - 套一层 Group，模型 `scale = PH.H / 0.1476`（PH.H = 26，模型单位是米、Y 向上、屏幕朝 +Z、原点在机身中心，和占位手机一致）。
3. 屏幕：
   - 找到名为 `Screen` 的网格，材质换成 `new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false })`，`scrTex` 保持 CanvasTexture 默认 `flipY = true`（模型 README 特别说明了这一点）；
   - 把 `P3.screen` 指向这个网格（`drawUI1Hand3` 用它算手指点的位置）。
4. 屏幕画布改成模型屏幕的比例 68.7 : 144.7：`scrTex = canvasTex(620, 1306, …)`。`drawScreen3` 里的 `H` 改为读画布高度，不要写死 1280。
5. 其他材质：给所有材质加 `envMap = envTex; envMapIntensity = 1.2`；按材质名微调：
   - Frame：metalness 1，roughness 0.26，颜色 #8f9296
   - BackGlass：颜色 #cbc6bd，roughness 0.5
   - FrontGlass：roughness 0.04
   - LensRing：metalness 1，roughness 0.2
6. 所有网格 `castShadow = true`。加载失败时退回 `makePhone()`。
7. `initP3()` 里把 `P3.phone = makePhone()` 换成 `await loadPhoneGLB()`。

## 3. 先出 8 张关键帧，发给用户确认

```bash
# Mac（Apple 芯片）：不设 MG_GPU_ARGS，默认用 Metal 显卡
export MG_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
# Windows（NVIDIA 显卡）：
#   set MG_CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe
#   set MG_GPU_ARGS=--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist
node harness/render.mjs demos/charge --query v=3d --stills 31.8,35,38.6,42.4,50,53.8,69.8,74.5
```

截图在 `demos/charge/out/stills/`，拼成一张总览图给用户看。要检查的点：
- 手机屏幕上的界面方向正确（不上下颠倒、不镜像），药丸挖孔不遮住时间；
- 0:38 手指对准屏幕上的开关；0:42 计划卡清楚；
- 0:50 沙发那段手机横屏，游戏画面上的 "VICTORY" 是正的；
- 金属中框有反光，景深自然。

## 4. 渲染完整 75 秒

分段渲染（失败可重跑，已完成的段会跳过）。快速转场段开运动模糊（`--mb`）：

```bash
O=demos/charge/out/seg3d; mkdir -p $O; : > $O/list.txt; k=0
for s in "0 10.6 1" "10.6 12.8 4" "12.8 15.2 1" "15.2 19 3" "19 25.3 1" "25.3 28.5 3" "28.5 30 1" \
         "30 36.2 1" "36.2 37.4 4" "37.4 43.9 1" "43.9 44.9 4" "44.9 48.4 1" "48.4 48.8 4" "48.8 51 1" "51 52 3" "52 61.5 1" "61.5 62.4 4" "62.4 70.9 1" "70.9 72.1 4" "72.1 75 1"; do
  set -- $s; f=$O/seg$k.mp4; echo "file '$(pwd)/$f'" >> $O/list.txt
  [ -s $f ] || node harness/render.mjs demos/charge --query v=3d --from $1 --to $2 --mb $3 --shutter 0.5 --workers 4 --noaudio --out $f
  k=$((k+1))
done
ffmpeg -y -f concat -safe 0 -i $O/list.txt -c copy demos/charge/out/charge3d_noaudio.mp4
```

- `--workers`：每个进程一个 Chrome，按 CPU 核数和显存定，4–8 个。
- 有显卡时每帧大约零点几秒，整片预计 10–30 分钟。
- 声音：0–30 秒的音效脚本是 `demos/charge/audio/score.py`。后 45 秒的音效还没写，画面定稿后再做，可以交回云端的 Claude，或者参照这份脚本写。

## 5. 交付

- 无声成片：`demos/charge/out/charge3d_noaudio.mp4`
- 关键帧总览图
- 改过的代码提交到仓库（不提交视频；`.gitignore` 已经排除了 mp4 和 wav）：
  ```bash
  git add demos/charge && git commit -m "接入 Blender 手机模型" && git push
  ```
