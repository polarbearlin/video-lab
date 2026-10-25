#!/usr/bin/env python3
"""给 8 张关键帧叠上章节系统（大号步骤名 / 左上角进度 / 底部导航），再拼成一张分镜总览。
python3 demos/deepseek/v7/overlay.py"""
import os, sys, pathlib
from PIL import Image, ImageDraw
HERE = pathlib.Path(__file__).resolve().parent; sys.path.insert(0, str(HERE))
from ui import overlay, font, DS
K = DS / 'build/v7keys'
# (时间, 章节序号或 None, 是否大号标题, 片头标题, 这一刻主人发的消息 / 画面说明)
PLAN = [('0:04', None, False, None, '主人："大肥鱼，给大家介绍一下你自己吧？" → 贴纸被揭起来'),
        ('0:07', None, False, ('大肥鱼', '自我介绍'), '转一圈变立体，蹬一下跳出屏幕，屏幕荡开波纹'),
        ('0:13', 0, True, None, '主人："你到底是什么鱼？" → 网友：这不就是条大肥鱼吗？'),
        ('0:30', 1, False, None, '主人："听说你很火？" → 英伟达暴跌的绿柱变成滑梯'),
        ('0:38', 1, False, None, '章末转场：扎进屏幕上开的洞，钻到下一个世界'),
        ('0:47', 2, False, None, '主人："你在 B站干嘛呢？" → 深度思考框把内心戏露出来了'),
        ('1:00', 3, False, None, '主人："那你每天都在干嘛？" → 凌晨 2:13，"本鲸陪你。"'),
        ('1:14', 4, False, None, '主人："这条视频是怎么做出来的？" → 跳上 Blender 图标，真实统计')]
tiles = []
for k, (tm, ch, big, title, note) in enumerate(PLAN, 1):
    im = Image.open(K / f'key{k}.png').convert('RGBA').resize((1920, 1080), Image.LANCZOS)
    im.alpha_composite(overlay(1920, 1080, chapter=ch, big=big, nav=ch is not None, title=title))
    im = im.convert('RGB'); im.save(K / f'ov{k}.jpg', quality=90); tiles.append((tm, note, im))
TW, TH = 960, 540; S = Image.new('RGB', (2 * TW + 30, 4 * (TH + 56) + 10), '#0b0f22'); d = ImageDraw.Draw(S)
for i, (tm, note, im) in enumerate(tiles):
    x, y = 10 + (i % 2) * (TW + 10), 10 + (i // 2) * (TH + 56)
    d.text((x + 6, y + 8), f'{i + 1} · {tm}', font=font(28, 800), fill='#9fb4ff'); d.text((x + 120, y + 12), note, font=font(22, 500), fill='#d8dcea')
    S.paste(im.resize((TW, TH), Image.LANCZOS), (x, y + 50))
out = '/home/user/libai/大肥鱼v7_自我介绍90秒_8张关键帧.jpg'; S.save(out, quality=88); print(out)
