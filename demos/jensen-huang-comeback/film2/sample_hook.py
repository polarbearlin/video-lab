"""样片：冷开场 + 钩子（约 39 秒），用来定风格。旁白还没到，先出“无旁白版”：原声冷开场 + 配乐 + 字幕。
时长按每秒约 4.4 字估算，配音到了以后按实际时长重排。
"""
import os, subprocess
import render as R
from frame import build as build_frame

OUT = '/home/user/jh_film/v2/sample'
os.makedirs(OUT, exist_ok=True)
SEG = os.path.join(OUT, 'seg')
os.makedirs(SEG, exist_ok=True)

ABC = 'video/V01_abc_reinstatement_coldopen.mp4'
CNBC = 'video/V01_cnbc_reinstatement_coldopen.mp4'
NBC = 'video/V24_nbc_shares_soar_31.mp4'
CLAP = 'video/V23_cnbc_hq_applause.mp4'
TRUMP = 'video/V26_cnbc_i_convinced.mp4'

shots = []   # (name, dur, fn)


def add(name, dur, fn):
    shots.append((name, dur, fn))


# 冷开场（0–5.0s）：画面快切，声音是 ABC 主播原声
add('c1', 1.10, lambda o, d: R.seg_clip(o, ABC, 0.0, d, zoom=(1.0, 1.03)))
add('c2', 1.10, lambda o, d: R.seg_clip(o, NBC, 1.5, d, zoom=(1.04, 1.10)))
add('c3', 1.00, lambda o, d: R.seg_clip(o, CLAP, 20.0, d, zoom=(1.0, 1.05)))
add('c4', 0.60, lambda o, d: R.seg_clip(o, CNBC, 2.0, d, zoom=(1.05, 1.08)))
add('c5', 1.20, lambda o, d: R.seg_clip(o, CLAP, 30.0, d, zoom=(1.0, 1.06)))
# 片名闪现
add('t0', 1.20, lambda o, d: R.seg_title(o, d, [('黄仁勋 11 天被请回', 120, R.GREEN), ('一通电话，董事会为何全票反转？', 64, R.WHITE)]))
# 钩子
add('h1', 4.40, lambda o, d: R.seg_card(o, 'img/J11_abc_1117_crop.png', d, bg=R.bg_blurshot('img/J11_abc_1117.png'),
                                        date='11/17', date_sub='财报会', quote='“不打算让他复职”', src='来源：ABC 新闻时间线'))
add('h2', 3.00, lambda o, d: R.seg_still(o, 'illus/I12_a.png', d, darken=0.15))
add('h3', 3.60, lambda o, d: R.seg_card(o, 'img/J14_nvidia_reinstate_crop1.png', d, bg=R.bg_blurshot('img/J14_nvidia_reinstate.png'),
                                        date='11/23', date_sub='英伟达公告', quote='“董事会全票通过，即日复职”', src='来源：英伟达新闻稿 2026-11-23', rot=1.0, seed=3))
add('h4a', 2.40, lambda o, d: R.seg_bars(o, d, src='数据：纳斯达克官网日线'))
add('h4b', 1.70, lambda o, d: R.seg_clip(o, NBC, 2.0, d, zoom=(1.0, 1.06)))
add('h5a', 2.40, lambda o, d: R.seg_clip(o, TRUMP, 9.0, d, zoom=(1.0, 1.05)))
add('h5b', 2.80, lambda o, d: R.seg_card(o, 'img/J2_inquirer_nyt.png', d, hl=False, quote='《纽约时报》电话采访', src='《纽约时报》报道（费城询问报转载）', crop=(0, 0, 1920, 560), maxh=560, seed=5))
add('h6', 2.60, lambda o, d: R.seg_card(o, 'img/J2_nightly_nyt_crop_goodjob.png', d, quote='“我昨晚干得不错吧？”', src='《纽约时报》2026-11-23', seed=7, rot=-0.6))
add('h7a', 1.65, lambda o, d: R.seg_card(o, 'img/J7_nvidia_ceo_transition.png', d, hl=False, date='11/12', date_sub='辞职', maxh=520, seed=11))
add('h7b', 1.65, lambda o, d: R.seg_card(o, 'img/J11_abc_1117_crop.png', d, date='11/17', date_sub='被拒', seed=13, rot=1.4))
add('h7c', 1.70, lambda o, d: R.seg_card(o, 'img/J14_nvidia_reinstate_crop1.png', d, date='11/23', date_sub='复职', seed=17, rot=-1.6))
add('h8a', 2.20, lambda o, d: R.seg_clip(o, CLAP, 8.0, d, zoom=(1.0, 1.06)))
add('h8b', 2.40, lambda o, d: R.seg_title(o, d, [('11 天', 220, R.GREEN), ('到底发生了什么？', 72, R.WHITE)]))

SUBS_TEXT = [
    ('h1', '六天前，全球最值钱的公司之一才把话说死：'),
    ('h2', '绝不请刚辞职的 CEO 回来。'),
    ('h3', '结果一个周末过去，董事会全票反转，'),
    ('h4a', '不仅把他请了回去，股价还一天暴涨三成。'),
    ('h5a', '转头，特朗普就在《纽约时报》的电话采访里冒出一句：'),
    ('h6', '“我昨晚干得不错吧？”'),
    ('h7a', '从突然辞职、被董事会当众拒绝，到全票官宣复职，'),
    ('h8a', '短短十一天，英伟达和黄仁勋到底经历了什么？'),
]


def main():
    segs, t, starts = [], 0.0, {}
    for name, dur, fn in shots:
        o = os.path.join(SEG, f'{name}.mp4')
        if not os.path.exists(o):
            fn(o, dur)
        segs.append(o)
        starts[name] = t
        t += dur
    total = t
    master = os.path.join(OUT, 'master.mp4')
    R.concat(segs, master)
    # 字幕：每句从对应镜头开始，到下一句开始
    names = [n for n, _ in SUBS_TEXT]
    subs = []
    for i, (n, txt) in enumerate(SUBS_TEXT):
        a = starts[n]
        b = starts[names[i + 1]] - 0.05 if i + 1 < len(names) else total - 0.3
        subs.append((a, b, txt))
    subs.insert(0, (0.0, 3.8, '突发新闻：英伟达恢复黄仁勋的 CEO 职务。\\N{\\fs30\\c&HB4B4B4&}Breaking news. NVIDIA has reinstated Jensen Huang as CEO.'))
    subs.insert(1, (3.85, 5.0, '现在，他回来了。\\N{\\fs30\\c&HB4B4B4&}Now, he\'s back.'))
    # 声音：ABC 原声两段 + 配乐
    audio = os.path.join(OUT, 'audio.wav')
    abc = R.src_path(ABC)
    music = R.src_path('audio/A1_volatile_reaction_macleod.mp3')
    R.ff(['-i', abc, '-i', abc, '-i', music, '-filter_complex',
          "[0:a]atrim=0:3.8,asetpts=PTS-STARTPTS,aresample=48000,volume=1.6[a0];"
          "[1:a]atrim=8.15:9.35,asetpts=PTS-STARTPTS,aresample=48000,volume=1.6,adelay=3850|3850[a1];"
          f"[2:a]atrim=0:{total - 4.6},asetpts=PTS-STARTPTS,aresample=48000,volume=0.45,afade=t=in:d=0.6,"
          f"afade=t=out:st={total - 4.6 - 1.5}:d=1.5,adelay=4600|4600[m];"
          f"[a0][a1][m]amix=inputs=3:normalize=0,alimiter=limit=0.9,apad,atrim=0:{total}[a]",
          '-map', '[a]', '-ar', '48000', '-ac', '2', audio])
    frame_png = os.path.join(OUT, 'frame_vertical.png')
    build_frame(frame_png)
    R.package(master, audio, subs, OUT, frame_png, '样片_冷开场钩子')
    print('total', round(total, 2), 's ->', OUT)


if __name__ == '__main__':
    main()
