#!/bin/bash
# 新环境一键准备：安装依赖、下载字体和乐器采样（这些文件体积大，不放进仓库）
set -e
cd "$(dirname "$0")"
npm install
pip install numpy scipy soundfile numba pedalboard pyloudnorm librosa pillow fonttools "rembg[cpu]" sherpa-onnx pypinyin

mkdir -p assets/fonts && cd assets/fonts
G=https://raw.githubusercontent.com/google/fonts/main/ofl
for f in mashanzheng/MaShanZheng-Regular.ttf zhimangxing/ZhiMangXing-Regular.ttf liujianmaocao/LiuJianMaoCao-Regular.ttf \
         zcoolkuaile/ZCOOLKuaiLe-Regular.ttf zcoolxiaowei/ZCOOLXiaoWei-Regular.ttf \
         instrumentserif/InstrumentSerif-Regular.ttf instrumentserif/InstrumentSerif-Italic.ttf; do
  [ -s "$(basename $f)" ] || curl -sSfLO "$G/$f"
done
[ -s NotoSerifSC.ttf ] || curl -sSfL -o NotoSerifSC.ttf "$G/notoserifsc/NotoSerifSC%5Bwght%5D.ttf"
[ -s NotoSansSC.ttf ] || curl -sSfL -o NotoSansSC.ttf "$G/notosanssc/NotoSansSC%5Bwght%5D.ttf"
[ -s LXGWWenKai-Regular.ttf ] || curl -sSfL -o LXGWWenKai-Regular.ttf https://github.com/lxgw/LxgwWenKai/releases/download/v1.520/LXGWWenKai-Regular.ttf
# 燃气歌用的是霞鹜文楷子集
[ -s WenKai-sub.ttf ] || pyftsubset LXGWWenKai-Regular.ttf --text-file=<(python3 -c "import json;print(''.join(l['text'] for l in json.load(open('../../demos/gas/lyrics_timed.json')))+'路上慢点儿闻到煤气味，记住这四步')") --output-file=WenKai-sub.ttf
cd ../..

# 乐器采样：来自 mg-styles-15（MIT），古筝采样来自 VCSL（CC0）
if [ ! -d lib/audio/samples ]; then
  tmp=$(mktemp -d); git clone --depth 1 https://github.com/Vincentwei1021/mg-styles-15 "$tmp/mg"
  cp -r "$tmp/mg/lib/audio/samples" lib/audio/; rm -rf "$tmp"
fi
echo "准备完成。渲染示例：MG_CHROME=<chrome 路径> node harness/render.mjs demos/pie --page paperV3.html --from 0 --to 12 --out demos/pie/out/seg0.mp4"
