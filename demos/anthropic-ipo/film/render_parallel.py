"""并行版的 full.main()：没缓存的镜头分给多个进程同时渲染，其余步骤（拼接、混音、外框、字幕）不变。

用法：JH_VO=v3 python3 render_parallel.py [进程数，默认 CPU 数-1]
镜头函数是闭包，不能跨进程传，所以用 fork：子进程继承已经建好的时间线，只传镜头序号。
"""
import json
import multiprocessing as mp
import os
import sys

import full as Fu
import render as R
from frame import build as build_frame

T = Fu.build_timeline()
Fu.TL.extend(T)


def todo(i):
    st, d, name, fn = T[i]
    o = os.path.join(Fu.SEG, f'{name}.mp4')
    tag = os.path.join(Fu.SEG, f'{name}.dur')
    return not (os.path.exists(o) and os.path.exists(tag) and abs(float(open(tag).read()) - d) < 0.01)


def work(i):
    st, d, name, fn = T[i]
    o = os.path.join(Fu.SEG, f'{name}.mp4')
    fn(o, d)
    open(os.path.join(Fu.SEG, f'{name}.dur'), 'w').write(f'{d:.4f}')
    return name


if __name__ == '__main__':
    n = int(sys.argv[1]) if len(sys.argv) > 1 else max(1, os.cpu_count() - 1)
    need = [i for i in range(len(T)) if todo(i)]
    print(f'镜头 {len(T)} 个，要渲染 {len(need)} 个，{n} 个进程', flush=True)
    with mp.get_context('fork').Pool(n) as pool:
        for k, name in enumerate(pool.imap_unordered(work, need), 1):
            if k % 10 == 0 or k == len(need):
                print(f'  {k}/{len(need)} {name}', flush=True)
    segs = [os.path.join(Fu.SEG, f'{name}.mp4') for _, _, name, _ in T]
    master = os.path.join(Fu.OUT, 'master.mp4')
    R.concat(segs, master)
    audio = os.path.join(Fu.OUT, 'mix.wav')
    Fu.build_audio(audio)
    frame_png = os.path.join(Fu.OUT, 'frame_vertical.png')
    build_frame(frame_png)
    R.package(master, audio, Fu.build_subs(), Fu.OUT, frame_png,
              os.environ.get('AN_NAME', 'Anthropic上市四天破发_v3'), which=('v',))
    json.dump([(round(s, 2), round(d, 2), nm) for s, d, nm, _ in T],
              open(os.path.join(Fu.OUT, 'timeline.json'), 'w'), ensure_ascii=False)
    print('shots', len(T), 'total', round(Fu.TOTAL, 2), flush=True)
