"""render.py 的补充：带标签的视频片段、带字的插画、英伟达 vs 纳指折线、片尾署名卡、合成音效。"""
import os, wave
import numpy as np
from PIL import Image, ImageDraw
import render as R
from render import F, W, H, GREEN, RED, WHITE, BLACK, ease_out

TMP = '/tmp/claude-0/jh_fx'
os.makedirs(TMP, exist_ok=True)


def label_png(path, label=None, date=None, date_sub=None, quote=None, quote_col=WHITE, src=None):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if date:
        R.stamp(d, (96, 80), date, date_sub)
    if quote:
        qy = 80 + (140 if date else 0)
        f = F('Black', 96)
        d.text((96, qy), quote, font=f, fill=quote_col, stroke_width=5, stroke_fill=BLACK)
        d.rectangle((96, qy + 122, 96 + int(f.getlength(quote)), qy + 132), fill=GREEN)
    if label:
        f = F('Black', 46)
        w = int(f.getlength(label)) + 40
        ly = 80 if not (date or quote) else 80 + (140 if date else 0) + (150 if quote else 0)
        d.rectangle((96, ly, 96 + w, ly + 68), fill=(10, 10, 11, 220))
        d.rectangle((96, ly, 104, ly + 68), fill=GREEN)
        d.text((120, ly + 4), label, font=f, fill=WHITE)
    R.source_tag(d, src)
    im.save(path)
    return path


def seg_clip_l(out, file, t_in, dur, zoom=(1.0, 1.06), **kw):
    """视频片段 + 叠加标签 / 日期章 / 中文大字。"""
    if not kw:
        return R.seg_clip(out, file, t_in, dur, zoom=zoom)
    png = label_png(os.path.join(TMP, os.path.basename(out) + '.png'), **kw)
    z0, z1 = zoom
    vf = (f"[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,"
          f"scale=w='trunc(1920*({z0}+({z1}-{z0})*t/{dur})/2)*2':h=-2:eval=frame,crop=1920:1080,"
          f"eq=contrast=1.06:saturation=0.9:brightness=-0.02,vignette=angle=PI/5,fps=30,tpad=stop_mode=clone:stop_duration=15[b];"
          f"[b][2:v]overlay=0:0,format=yuv420p[v]")
    R.ff(['-ss', f'{t_in}', '-t', f'{dur}', '-i', R.src_path(file),
          '-f', 'lavfi', '-t', f'{dur}', '-i', 'anullsrc=r=48000:cl=stereo', '-loop', '1', '-t', f'{dur}', '-i', png,
          '-filter_complex', vf, '-map', '[v]', '-map', '1:a', '-t', f'{dur}'] + R.ENC + R.AENC + [out])


def seg_still_t(out, rel, dur, zoom=(1.0, 1.08), darken=0.15, lines=None, label='示意图'):
    """插画慢推 + 可选大字（lines: [(文字, 字号, 颜色)]，居中偏下）。"""
    src = Image.open(R.src_path(rel)).convert('RGB').resize((int(W * 1.12), int(H * 1.12)), Image.LANCZOS)
    if darken:
        src = Image.blend(src, Image.new('RGB', src.size, BLACK), darken)

    def draw(t):
        z = zoom[0] + (zoom[1] - zoom[0]) * t / dur
        cw, ch = int(src.width / z), int(src.height / z)
        x0, y0 = (src.width - cw) // 2, (src.height - ch) // 2
        im = src.crop((x0, y0, x0 + cw, y0 + ch)).resize((W, H), Image.BICUBIC)
        d = ImageDraw.Draw(im)
        if lines:
            y = H // 2 - sum(int(s * 1.25) for _, s, _ in lines) // 2
            for i, (txt, size, col) in enumerate(lines):
                k = ease_out((t - 0.12 * i) / 0.4)
                if k > 0:
                    d.text((W // 2, y + int((1 - k) * 30)), txt, font=F('Black', size), fill=col, anchor='ma',
                           stroke_width=max(3, size // 24), stroke_fill=BLACK)
                y += int(size * 1.25)
        if label:
            d.text((W - 48, H - 74), label, font=F('Medium', 40), fill=(210, 210, 206), anchor='ra',
                   stroke_width=2, stroke_fill=BLACK)
        return im
    R.seg_frames(out, dur, draw)


def seg_lines(out, dur, start='2026-11-11', end='2026-11-20', src='数据：纳斯达克官网日线'):
    a = [r for r in R.load_closes('data/J1_nvda_daily.csv') if start <= r[0] <= end]
    b = [r for r in R.load_closes('data/J1_ixic_daily.csv') if start <= r[0] <= end]
    na = [v / a[0][1] * 100 for _, v in a]
    nb = [v / b[0][1] * 100 for _, v in b]
    lo, hi = min(na + nb) - 4, 104
    x0, x1, y0, y1 = 200, 1330, 250, 860
    Y = lambda v: y1 - (v - lo) / (hi - lo) * (y1 - y0)
    X = lambda i: x0 + (x1 - x0) * i / (len(a) - 1)
    bg = R.bg_dark()

    def draw(t):
        im = bg.copy()
        d = ImageDraw.Draw(im)
        d.text((96, 80), '辞职前一天 → 上周五（收盘，起点 = 100）', font=F('Black', 60), fill=WHITE)
        d.line([(x0, Y(100)), (x1, Y(100))], fill=(80, 80, 80), width=3)
        k = ease_out(t / (dur * 0.85))
        n = max(2, int(1 + k * (len(a) - 1)))
        for series, col, name in ((nb, (190, 190, 186), '纳指'), (na, (240, 50, 50), '英伟达')):
            pts = [(X(i), Y(v)) for i, v in enumerate(series[:n])]
            d.line(pts, fill=col, width=9)
            if k > 0.95:
                d.text((x1 + 24, Y(series[-1]) - 34), f'{name} {series[-1] - 100:+.1f}%', font=F('Black', 64),
                       fill=col, stroke_width=3, stroke_fill=BLACK)
        for i, (day, _) in enumerate(a):
            d.text((X(i), y1 + 20), day[5:].replace('-', '/'), font=F('Medium', 34), fill=(160, 160, 156), anchor='ma')
        R.source_tag(d, src)
        return im
    R.seg_frames(out, dur, draw)


def seg_counter(out, dur, big='10,000+', line1='名英伟达员工签名请愿', line2='约占全公司四分之一（CBS）'):
    bg = R.bg_dark()

    def draw(t):
        im = bg.copy()
        d = ImageDraw.Draw(im)
        k = ease_out(t / (dur * 0.65))
        n = int(10000 * k)
        txt = f'{n:,}' + ('+' if k >= 1 else '')
        d.text((W // 2, 260), txt, font=F('Black', 280), fill=GREEN, anchor='ma', stroke_width=4, stroke_fill=BLACK)
        if t > 0.5:
            d.text((W // 2, 640), line1, font=F('Black', 80), fill=WHITE, anchor='ma')
            d.text((W // 2, 770), line2, font=F('Medium', 52), fill=(180, 180, 176), anchor='ma')
        return im
    R.seg_frames(out, dur, draw)


def seg_end(out, dur, credits):
    bg = R.bg_dark()

    def draw(t):
        im = bg.copy()
        d = ImageDraw.Draw(im)
        k = ease_out(t / 0.6)
        d.text((W // 2, 300 + int((1 - k) * 20)), '北极熊吃海豹', font=F('Black', 120), fill=WHITE, anchor='ma')
        d.rectangle((W // 2 - 90, 470, W // 2 + 90, 480), fill=GREEN)
        y = 560
        for c in credits:
            d.text((W // 2, y), c, font=F('Medium', 32), fill=(170, 170, 166), anchor='ma')
            y += 52
        return im
    R.seg_frames(out, dur, draw)


# ---------------- 合成音效 ----------------

def _write(path, x, sr=48000):
    x = np.clip(x, -1, 1)
    st = np.stack([x, x], 1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((st * 32767).astype(np.int16).tobytes())


def sfx_whoosh(path, dur=0.9, sr=48000, seed=1):
    rng = np.random.default_rng(seed)
    n = int(dur * sr)
    t = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    # 频率从低扫到高再回落：用一阶低通，截止频率随时间变化
    fc = 300 + 5000 * np.sin(np.pi * t) ** 2
    y = np.zeros(n); acc = 0.0
    for i in range(n):
        a = np.exp(-2 * np.pi * fc[i] / sr)
        acc = (1 - a) * noise[i] + a * acc
        y[i] = acc
    env = np.sin(np.pi * t) ** 1.5
    y = y * env
    y = y / (np.abs(y).max() + 1e-9) * 0.5
    _write(path, y, sr)


def sfx_thud(path, dur=0.45, sr=48000):
    n = int(dur * sr)
    t = np.arange(n) / sr
    f = 90 * np.exp(-t * 6) + 45
    ph = 2 * np.pi * np.cumsum(f) / sr
    y = np.sin(ph) * np.exp(-t * 9)
    y += 0.15 * np.random.default_rng(2).standard_normal(n) * np.exp(-t * 40)
    _write(path, y / np.abs(y).max() * 0.7, sr)
