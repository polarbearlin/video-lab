#!/usr/bin/env python3
"""把用户给的角色图做成纸雕立牌用的 PNG：去背景 + 只留主体 + 米白剪纸边 (+ 可选左右镜像)。

用法: python3 cutout_character.py in1.webp [in2.png ...] --out DIR [--mirror] [--keep-all] [--border 29]
- 图片自带透明通道时直接用原图 alpha（最干净）；没有时才用 rembg 抠图。
- 默认只保留最大的连通区域，去掉边上误入的道具碎片；人和道具分开的图（如拖行李箱）用 --keep-all。
"""
import argparse, os
import numpy as np
from PIL import Image, ImageFilter, ImageOps
from scipy import ndimage as nd


def mask_of(im):
    arr = np.array(im.convert('RGBA'))
    a = arr[..., 3]
    if (a < 250).mean() > .05:                       # 自带透明背景
        return a
    from rembg import remove, new_session            # 纯色背景：抠图
    cut = remove(im.convert('RGB'), session=new_session('isnet-general-use'), post_process_mask=False)
    m = np.array(cut.split()[3]) > 40
    m = nd.binary_fill_holes(nd.binary_closing(m, iterations=6))
    return (m * 255).astype(np.uint8)


def process(path, out_dir, mirror, keep_all, border):
    im = Image.open(path).convert('RGBA')
    a = mask_of(im)
    solid = a > 128
    if not keep_all:
        lab, k = nd.label(solid)
        if k > 1:
            sizes = nd.sum(solid, lab, range(1, k + 1)); solid = lab == (np.argmax(sizes) + 1)
    am = Image.fromarray(np.where(solid, a, 0).astype(np.uint8))
    pad = border + 12; W, H = im.size
    canvas = Image.new('RGBA', (W + 2 * pad, H + 2 * pad), (0, 0, 0, 0))
    big = Image.new('L', canvas.size, 0); big.paste(am.point(lambda v: 255 if v > 128 else 0), (pad, pad))
    edge = big.filter(ImageFilter.MaxFilter(border)).filter(ImageFilter.GaussianBlur(3)).point(lambda v: 255 if v > 110 else 0)
    white = Image.new('RGBA', canvas.size, (250, 247, 240, 255)); white.putalpha(edge)
    canvas = Image.alpha_composite(canvas, white)
    body = im.copy(); body.putalpha(am)
    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0)); layer.paste(body, (pad, pad))
    canvas = Image.alpha_composite(canvas, layer)
    canvas = canvas.crop(canvas.getbbox())
    if mirror: canvas = ImageOps.mirror(canvas)
    out = os.path.join(out_dir, os.path.splitext(os.path.basename(path))[0] + '.png')
    canvas.save(out); print(out, canvas.size)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('images', nargs='+'); ap.add_argument('--out', required=True)
    ap.add_argument('--mirror', action='store_true'); ap.add_argument('--keep-all', action='store_true')
    ap.add_argument('--border', type=int, default=29, help='白边粗细（MaxFilter 尺寸，奇数）')
    a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
    for p in a.images: process(p, a.out, a.mirror, a.keep_all, a.border)
