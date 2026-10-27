# 云端写代码 ↔ 本地 Mac 渲染（GitHub 联动）

为什么要这样分工：云端容器没有 GPU，Blender 渲 1080p 64 采样一帧要几十秒。用户的 Mac 用 Metal 跑 EEVEE 快得多。所以：**我在云端写代码、出低清预览，推到 GitHub；用户本地的 Agent 拉代码、用 GPU 渲高清、传 GitHub Release；我再下载下来审片。**

仓库：`polarbearlin/video-lab`。分支：`main`（这个项目一直直接推 main）。

## 1. 每个版本都写一个 render.sh

放在版本目录里（如 `demos/deepseek/v11/render.sh`），本地 Agent 只需要跑这一个脚本。固定几个子命令：

| 子命令 | 做什么 |
|---|---|
| `prep` | 只生成界面素材和配乐（跑各版本的 `ui.py`、`audio.py`） |
| `stills` | 先出 16–20 张预览加审片图（scale 50、samples 32，几分钟） |
| `full` | 1920×1080、samples 64 整段渲染，再合成 mp4。已渲的帧会跳过，断了重跑同一条命令即可 |
| `patch`（可选） | 只重渲受影响的帧：先 `rm` 那段 `f_XXXX.png`，再 `--frames a-b`，然后重新合成、拼接 |
| `join`（可选） | 多段拼成完整片 |
| `upload` | `gh release create dafeiyu-vNN-$(date +%m%d-%H%M) <成片> <审片图> --prerelease` |

脚本要求：
- `cd "$(dirname "$0")/../../.."`，从仓库根目录跑；
- 自动找 Blender：`/Applications/Blender.app/Contents/MacOS/Blender`，或者用环境变量 `BLENDER`；
- 依赖的文件缺了要给出清楚的中文提示（例如"缺少 v10 前30秒成片：先跑 …"）。

**脚本不能依赖 `build/` 里只有云端才有的文件。** 本地是全新的 build 目录。踩过的坑：`v7/ui.py` 引用了 `build/chibi_check/...`，在 Mac 上直接报 FileNotFoundError。参考图要提交进 `ref/`，或者写好找不到时的退路。

## 2. 推送前的检查

1. 云端先跑一遍 `prep`，再出几张低清 stills，确认没有报错。
2. 合成链路用"假帧"测一遍：把一张灰图软链成全部帧号，跑 `compose.py`，确认 ffmpeg 命令、时长、叠加层时间都对。
3. `bash -n render.sh` 检查语法。
4. `git add` 只加代码，不加视频、音频、`build/`；commit 信息末尾加约定的署名行；`git push origin main`。

## 3. 给用户的提示词模板（直接复制给本地 Agent）

```
请帮我在本地渲染视频，步骤如下：
1. 进入 video-lab 仓库，执行 git pull，确认最新提交是 <commit 短哈希>（<版本说明>）。
2. 先出预览：bash demos/deepseek/<版本>/render.sh stills
   完成后打开 demos/deepseek/build/<版本>st/audit_sheet.jpg 看一眼，确认画面正常（有角色、有界面、没有全黑或全粉）。
3. 渲染整段（时间较长，防止休眠）：caffeinate -i bash demos/deepseek/<版本>/render.sh full
   如果中途中断，重新执行同一条命令即可，已渲染的帧会自动跳过。
4. 上传：bash demos/deepseek/<版本>/render.sh upload
5. 最后告诉我 Release 的名字（dafeiyu-<版本>- 开头），以及有没有报错。
注意：不要上传任何密码、密钥、账号信息；不要把视频或 build 目录提交到 git。
```

需要用户手动提供的文件（例如 Suno 的 mp3），在提示词里写成"把 xxx 复制到 demos/…/build/song/suno.mp3：【这里填你电脑上的路径】"，让用户自己填路径。

## 4. 渲染好以后我怎么审片

```bash
gh api repos/polarbearlin/video-lab/releases --jq '.[0:3][] | {tag_name, assets: [.assets[] | {name, id, size}]}'
gh api -H "Accept: application/octet-stream" repos/polarbearlin/video-lab/releases/assets/<id> > build/relNN/full.mp4
ffmpeg -i full.mp4 -vf "fps=1,scale=480:-1" fr/%03d.jpg     # 每秒一帧拼成三张总览图
ffmpeg -ss <秒> -i full.mp4 -frames:v 1 hd_<秒>.jpg          # 关键几秒抽原图细看
```
然后自己打分，再叫独立 Agent 审一遍，把问题和改法告诉用户。

## 5. 不用重渲就能改的东西

只改叠加层、字卡、配乐时，不需要 Blender：直接在本地或云端已有的成片上叠加、换声音（`demos/deepseek/v12/remix.py`）。云端可以直接下载用户的 Release 合成预览，用 SendUserFile 发给用户先听先看；确认后再让本地 Agent 出最终版。
