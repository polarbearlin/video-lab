"""整片 v4 合成：按 storyboard.json 逐镜头 底层视频 + 网页图层 → 小段 mp4（有缓存）→ 拼接 → 加颗粒 → 竖屏外框、字幕、v3 的混音。

用法：cd film4 && python3 storyboard.py && python3 compose.py [进程数]
- 每个镜头的缓存名 = 序号 + 内容哈希（时长、底层、图层参数、插画视频是否已到），改了哪个只重渲哪个。
- 网页截帧由 shoot.mjs batch 在后台逐镜头进行，这里截完一个就合成一个、删掉帧，磁盘只留几个镜头的帧。
"""
import os, sys, json, hashlib, subprocess, shutil, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'film'))
os.environ.setdefault('VL_OUT', '/home/user/anthropic_ipo_film')
import render as R
import full as Fu
from frame import build as build_frame
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.environ['VL_OUT'], 'v4'); SEG = os.path.join(OUT, 'seg'); TMP = os.path.join(OUT, 'tmp')
for d in (SEG, TMP): os.makedirs(d, exist_ok=True)
V = Fu.V
OLD = ['illus/I01_a.png'] + [f'illus/I{n:02d}.png' for n in range(2, 13)]      # 插画视频没到时的占位
COLD = [('BBG', 0.0, 1.3), ('FORBES', 0.5, 1.35), ('CHART', 4.0, 1.3), ('ARREST', 4.0, 1.3), ('BELL', 2.0, 1.5)]


def ground(path):
    im = Image.new('RGB', (1920, 1080), (13, 10, 9)); d = ImageDraw.Draw(im, 'RGBA')
    for x0, w, a in [(-300, 520, 140), (380, 260, 90), (1250, 640, 115)]:
        d.polygon([(x0, 0), (x0 + w, 0), (x0 + w + 900, 1080), (x0 + 900, 1080)], fill=(170, 28, 18, a))
    im = im.filter(ImageFilter.GaussianBlur(40)); d = ImageDraw.Draw(im, 'RGBA')
    for x in range(0, 1920, 48): d.line([(x, 0), (x, 1080)], fill=(255, 240, 220, 12))
    for y in range(0, 1080, 48): d.line([(0, y), (1920, y)], fill=(255, 240, 220, 12))
    im.save(path, quality=92)


def bg_clip(out, bg, d, i):
    kind = bg[0]
    if kind == 'clip':
        R.seg_clip(out, V[bg[1]], bg[2], d, zoom=(1.0, 1.06))
    elif kind == 'framed':
        g = os.path.join(OUT, 'ground.jpg')
        if not os.path.exists(g): ground(g)
        vf = (f"[1:v]scale=1560:-2,setsar=1,pad=iw+40:ih+40:20:20:color=0xEFE6D2,format=rgba,rotate=-1.5*PI/180:c=none:ow=rotw(iw):oh=roth(ih)[v];"
              f"[0:v]scale=1920:1080,zoompan=z='1+0.0006*on':d=1:s=1920x1080:fps=30[b];[b][v]overlay=(W-w)/2:(H-h)/2-10,format=yuv420p[o]")
        R.ff(['-loop', '1', '-t', f'{d}', '-i', g, '-ss', f'{bg[2]}', '-t', f'{d}', '-i', R.src_path(V[bg[1]]), '-f', 'lavfi', '-t', f'{d}', '-i', 'anullsrc=r=48000:cl=stereo',
              '-filter_complex', vf, '-map', '[o]', '-map', '2:a', '-t', f'{d}'] + R.ENC + R.AENC + [out])
    elif kind == 'illus':
        mp4, png = R.src_path(f'illus_v2/{bg[1]}.mp4'), R.src_path(f'illus_v2/{bg[1]}.png')
        if os.path.exists(mp4):
            R.seg_clip(out, f'illus_v2/{bg[1]}.mp4', 0.0, d, zoom=(1.0, 1.04))
        else:
            R.seg_still(out, f'illus_v2/{bg[1]}.png' if os.path.exists(png) else OLD[i % len(OLD)], d, zoom=(1.0, 1.16), label=None)
    elif kind == 'cold':
        parts = []
        for k, (key, t_in, dd) in enumerate(COLD):
            o = os.path.join(TMP, f'cold{k}.mp4'); R.seg_clip(o, V[key], t_in, dd, zoom=(1.0, 1.06)); parts.append(o)
        R.concat(parts, out)
    else:   # ground：底下垫黑，网页图层是不透明的
        R.ff(['-f', 'lavfi', '-t', f'{d}', '-i', 'color=c=black:s=1920x1080:r=30', '-f', 'lavfi', '-t', f'{d}', '-i', 'anullsrc=r=48000:cl=stereo',
              '-map', '0:v', '-map', '1:a', '-t', f'{d}'] + R.ENC + R.AENC + [out])


def key(i, s):
    have = s['bg'][0] == 'illus' and os.path.exists(R.src_path(f"illus_v2/{s['bg'][1]}.mp4"))
    h = hashlib.md5(json.dumps([s, have, os.path.getmtime(os.path.join(HERE, 'index.html'))], sort_keys=True).encode()).hexdigest()[:8]
    return f'{i:03d}_{h}'


def main(workers=4):
    SB = json.load(open(os.path.join(HERE, 'storyboard.json')))
    shots = SB['shots']
    names = [key(i, s) for i, s in enumerate(shots)]
    todo = [i for i, n in enumerate(names) if not os.path.exists(os.path.join(SEG, n + '.mp4'))]
    print(f'镜头 {len(shots)} 个，要渲染 {len(todo)} 个', flush=True)
    if todo:
        jobs = [[shots[i]['a'], shots[i]['b'], os.path.join(TMP, names[i])] for i in todo]
        jf = os.path.join(TMP, 'jobs.json'); json.dump(jobs, open(jf, 'w'))
        node = subprocess.Popen(['node', 'shoot.mjs', 'batch', jf, str(workers)], cwd=HERE, stdout=subprocess.DEVNULL)
        for i in todo:
            s, n = shots[i], names[i]; d = round(s['b'] - s['a'], 4); fr = os.path.join(TMP, n)
            bgo = os.path.join(TMP, n + '_bg.mp4'); bg_clip(bgo, s['bg'], d, i)
            while not os.path.exists(os.path.join(fr, 'DONE')):
                if node.poll() not in (None, 0): sys.exit('截帧进程出错')
                time.sleep(1)
            R.ff(['-i', bgo, '-framerate', '30', '-i', os.path.join(fr, '%05d.png'), '-filter_complex', '[0:v][1:v]overlay=0:0:eof_action=repeat,format=yuv420p[v]',
                  '-map', '[v]', '-map', '0:a', '-t', f'{d}'] + R.ENC + R.AENC + [os.path.join(SEG, n + '.mp4')])
            shutil.rmtree(fr); os.remove(bgo)
            print(f'  {i + 1}/{len(shots)} {n} {d:.2f}s', flush=True)
        node.wait()
    master = os.path.join(OUT, 'master.mp4'); R.concat([os.path.join(SEG, n + '.mp4') for n in names], master)
    grainy = os.path.join(OUT, 'master_grain.mp4')
    R.ff(['-i', master, '-vf', 'noise=alls=7:allf=t,vignette=angle=PI/6', '-an'] + R.ENC + [grainy])
    audio = os.path.join(os.environ['VL_OUT'], 'full', 'mix.wav')
    frame_png = os.path.join(OUT, 'frame_vertical.png'); build_frame(frame_png)
    R.package(grainy, audio, Fu.build_subs(), OUT, frame_png, os.environ.get('VL_NAME', 'Anthropic上市四天破发_v4'), which=('v',))
    print('done', round(SB['dur'], 2))


if __name__ == '__main__':
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 4)
