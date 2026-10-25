#!/bin/bash
# 下载开源的大肥鱼 3D 工程（github.com/azwosile/DeepSeek-whale-girl-3D，CC BY-NC-SA 4.0）
# 仓库的 .blend / 贴图在 Git LFS 里，这里直接从 GitHub 的文件直链下载需要的两个文件 + 普通文件（Tripo 贴图）。
set -e
cd "$(dirname "$0")"; mkdir -p model && cd model
[ -d DeepSeek-whale-girl-3D ] || GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/azwosile/DeepSeek-whale-girl-3D
cd DeepSeek-whale-girl-3D
M=https://media.githubusercontent.com/media/azwosile/DeepSeek-whale-girl-3D/main
for f in "大肥鱼第二版/装配/FISH2_toon_t002.blend" "大肥鱼第二版/装配/tex/FISH2_body_tex_f004.png"; do
  q=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$f")
  curl -sSL -o "$f" "$M/$q"; echo "$f $(du -h "$f" | cut -f1)"
done
echo "完成：$(pwd)/大肥鱼第二版/装配/FISH2_toon_t002.blend"
