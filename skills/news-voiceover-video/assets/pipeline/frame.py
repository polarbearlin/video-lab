"""竖屏外框（对标参考视频）：顶部两行固定标题、中间 16:9 画面窗、窗下字幕区、底部频道名。

输出 frame_vertical.png（1080×1920，画面窗区域透明），合成时把 1920×1080 的画面缩到 1080×608 放进窗口。
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
FONTS = os.environ.get('VL_FONTS', os.path.join(ROOT, 'assets', 'fonts'))
W, H = 1080, 1920
WIN = (0, 600, 1080, 1208)          # 画面窗：x0, y0, x1, y1（1080×608 = 16:9）
SUB_Y = 1238                         # 字幕基线区域起点（窗下）
GREEN, RED, WHITE = (118, 185, 0), (214, 40, 40), (245, 245, 242)
BG = (10, 10, 11)
BRAND = '北极熊吃海豹'
TAG = '北极熊吃海豹 · 热点拆解'
TITLE1 = '黄仁勋 11 天被请回'
TITLE2 = '一通电话，董事会为何全票反转？'


def F(weight, size):
    return ImageFont.truetype(os.path.join(FONTS, f'NotoSansSC-{weight}.ttf'), size)


def build(out):
    im = Image.new('RGBA', (W, H), BG + (255,))
    d = ImageDraw.Draw(im)
    # 背景纹理：极淡的斜线
    for x in range(-H, W, 46):
        d.line([(x, 0), (x + H, H)], fill=(16, 17, 18, 255), width=10)
    # 顶部小标签
    d.text((48, 330), TAG, font=F('Medium', 26), fill=(120, 120, 118))
    d.rectangle((48, 372, 48 + 64, 378), fill=GREEN)
    # 两行标题
    d.text((48, 392), TITLE1, font=F('Black', 82), fill=GREEN)
    d.text((48, 494), TITLE2, font=F('Black', 58), fill=WHITE)
    # 画面窗挖空
    d.rectangle(WIN, fill=(0, 0, 0, 0))
    # 窗口上下细线
    d.line([(0, WIN[1] - 2), (W, WIN[1] - 2)], fill=(40, 40, 42, 255), width=2)
    d.line([(0, WIN[3] + 1), (W, WIN[3] + 1)], fill=(40, 40, 42, 255), width=2)
    # 底部频道条
    by = 1352
    d.rectangle((48, by + 6, 48 + 14, by + 40), fill=GREEN)
    d.text((76, by), BRAND, font=F('Black', 34), fill=WHITE)
    d.text((W - 48, by + 6), '看热闹，也看门道。', font=F('Medium', 26), fill=(150, 150, 146), anchor='ra')
    # 底部大号淡字
    d.text((40, 1430), BRAND, font=F('Black', 170), fill=(26, 26, 28, 255))
    im.save(out)
    return im


if __name__ == '__main__':
    out_dir = os.environ.get('VL_OUT', os.path.join(ROOT, '..', 'film_out'))
    os.makedirs(out_dir, exist_ok=True)
    build(os.path.join(out_dir, 'frame_vertical.png'))
    print('ok')
