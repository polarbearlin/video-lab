"""v2 渲染库：每个镜头渲成一段 1920×1080 / 30fps 的 mp4（带音轨，没原声就是静音），再拼接、混音、套竖屏外框和字幕。

镜头类型
- clip   ：新闻 / 真实视频片段，慢推、轻调色，可保留原声
- card   ：网页截图做成撕纸卡片，滑入 + 慢推 + 绿色高亮扫过，可加日期章和来源角标
- still  ：插画慢推，角落标“示意图”
- bars   ：英伟达单日涨跌幅柱状图动画（数据：素材/data/J1_nvda_daily.csv）
- title  ：大字标题卡
"""
import csv, math, os, random, subprocess
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(PROJ, '..', '..'))
SRC = os.path.join(PROJ, '素材')
FONTS = os.path.join(ROOT, 'assets', 'fonts')
W, H, FPS = 1920, 1080, 30
GREEN, RED, WHITE, BLACK = (118, 185, 0), (214, 40, 40), (245, 245, 242), (10, 10, 11)
PAPER = (247, 245, 238)
ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', str(FPS)]
AENC = ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2']
_fc = {}


def F(weight, size):
    k = (weight, size)
    if k not in _fc:
        _fc[k] = ImageFont.truetype(os.path.join(FONTS, f'NotoSansSC-{weight}.ttf'), size)
    return _fc[k]


def src_path(rel):
    return rel if os.path.isabs(rel) else os.path.join(SRC, rel)


def ff(args):
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y'] + args, check=True)


def ease_out(x):
    x = max(0.0, min(1.0, x))
    return 1 - (1 - x) ** 3


# ---------------- 视频片段 ----------------

def seg_clip(out, file, t_in, dur, zoom=(1.0, 1.06), audio=False, vol=1.0, grade=True):
    z0, z1 = zoom
    vf = (f"[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,"
          f"scale=w='trunc(1920*({z0}+({z1}-{z0})*t/{dur})/2)*2':h=-2:eval=frame,crop=1920:1080")
    if grade:
        vf += ",eq=contrast=1.06:saturation=0.9:brightness=-0.02,vignette=angle=PI/5"
    vf += ",fps=30,tpad=stop_mode=clone:stop_duration=15,format=yuv420p[v]"
    if audio:
        af = f"[0:a]aresample=48000,aformat=channel_layouts=stereo,volume={vol},apad[a]"
        ff(['-ss', f'{t_in}', '-t', f'{dur}', '-i', src_path(file), '-filter_complex', vf + ';' + af,
            '-map', '[v]', '-map', '[a]', '-t', f'{dur}'] + ENC + AENC + [out])
    else:
        ff(['-ss', f'{t_in}', '-t', f'{dur}', '-i', src_path(file),
            '-f', 'lavfi', '-t', f'{dur}', '-i', 'anullsrc=r=48000:cl=stereo',
            '-filter_complex', vf, '-map', '[v]', '-map', '1:a', '-t', f'{dur}'] + ENC + AENC + [out])


# ---------------- 逐帧生成的镜头 ----------------

def seg_frames(out, dur, draw):
    n = int(round(dur * FPS))
    p = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
                          '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-f', 'lavfi', '-t', f'{dur}', '-i', 'anullsrc=r=48000:cl=stereo',
                          '-map', '0:v', '-map', '1:a', '-t', f'{dur}'] + ENC + AENC + [out], stdin=subprocess.PIPE)
    for i in range(n):
        p.stdin.write(draw(i / FPS).convert('RGB').tobytes())
    p.stdin.close()
    p.wait()


def bg_dark(seed=0):
    im = Image.new('RGB', (W, H), BLACK)
    d = ImageDraw.Draw(im)
    for x in range(0, W, 80):
        d.line([(x, 0), (x, H)], fill=(18, 20, 18), width=1)
    for y in range(0, H, 80):
        d.line([(0, y), (W, y)], fill=(18, 20, 18), width=1)
    return vignette(im)


def bg_blurshot(rel, dark=0.35):
    im = Image.open(src_path(rel)).convert('RGB').resize((W, H))
    im = im.filter(ImageFilter.GaussianBlur(18))
    im = Image.blend(Image.new('RGB', (W, H), BLACK), im, dark)
    return vignette(im)


def vignette(im, strength=0.55):
    mask = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((-W * 0.2, -H * 0.35, W * 1.2, H * 1.35), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(160))
    dark = Image.new('RGB', (W, H), BLACK)
    return Image.composite(im, Image.blend(im, dark, strength), mask)


def torn_card(rel, maxw=1400, maxh=600, seed=1, pad=34, maxup=2.4):
    """截图做成撕边纸卡（RGBA，含阴影）。"""
    rnd = random.Random(seed)
    src = Image.open(src_path(rel)).convert('RGB')
    s = min(maxw / src.width, maxh / src.height, maxup)
    src = src.resize((int(src.width * s), int(src.height * s)), Image.LANCZOS)
    cw, ch = src.width + pad * 2, src.height + pad * 2
    paper = Image.new('RGB', (cw, ch), PAPER)
    paper.paste(src, (pad, pad))
    pts, step, amp = [], 14, 6
    for x in range(0, cw + step, step):
        pts.append((min(x, cw), rnd.uniform(0, amp)))
    for y in range(0, ch + step, step):
        pts.append((cw - rnd.uniform(0, amp), min(y, ch)))
    for x in range(cw, -step, -step):
        pts.append((max(x, 0), ch - rnd.uniform(0, amp)))
    for y in range(ch, -step, -step):
        pts.append((rnd.uniform(0, amp), max(y, 0)))
    m = Image.new('L', (cw, ch), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    card = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    card.paste(paper, (0, 0), m)
    sh_pad = 40
    out = Image.new('RGBA', (cw + sh_pad * 2, ch + sh_pad * 2), (0, 0, 0, 0))
    shadow = Image.new('RGBA', out.size, (0, 0, 0, 0))
    shadow.paste((0, 0, 0, 170), (sh_pad + 14, sh_pad + 18, sh_pad + 14 + cw, sh_pad + 18 + ch), m)
    out = Image.alpha_composite(out, shadow.filter(ImageFilter.GaussianBlur(16)))
    out.alpha_composite(card, (sh_pad, sh_pad))
    return out, (sh_pad + pad, sh_pad + pad, sh_pad + pad + src.width, sh_pad + pad + src.height)


def stamp(d, xy, text, sub=None, color=GREEN):
    x, y = xy
    f = F('Black', 84)
    w = int(f.getlength(text)) + 52
    d.rectangle((x, y, x + w, y + 118), fill=color)
    d.text((x + 26, y + 8), text, font=f, fill=BLACK)
    if sub:
        d.text((x + w + 24, y + 18), sub, font=F('Black', 72), fill=WHITE, stroke_width=3, stroke_fill=BLACK)


def source_tag(d, text):
    if text:
        d.text((48, H - 74), text, font=F('Medium', 44), fill=(190, 190, 186), stroke_width=3, stroke_fill=BLACK)


def seg_card(out, rel, dur, bg=None, rot=-1.2, hl=True, date=None, date_sub=None, src=None,
             maxw=1640, maxh=560, seed=1, cy=None, quote=None, crop=None):
    bgi = bg if bg is not None else bg_dark()
    if crop:
        tmp = os.path.join('/tmp/claude-0', 'crop_' + os.path.basename(rel))
        os.makedirs('/tmp/claude-0', exist_ok=True)
        Image.open(src_path(rel)).convert('RGB').crop(crop).save(tmp)
        rel = tmp
    card, inner = torn_card(rel, maxw, maxh, seed, maxup=3.2)
    card = card.rotate(rot, resample=Image.BICUBIC, expand=False)
    cw, ch = card.size
    top = 90 + (140 if date else 0) + (130 if quote else 0)
    cy = cy if cy is not None else top + (H - 70 - top) // 2

    def draw(t):
        im = bgi.copy()
        k = ease_out(t / 0.35)
        sc = 1.0 + 0.04 * t / dur
        c = card.resize((int(cw * sc), int(ch * sc)), Image.BICUBIC) if sc != 1 else card
        if hl and t > 0.35:
            c = c.copy()
            x0, y0, x1, y1 = [int(v * sc) for v in inner]
            prog = ease_out((t - 0.35) / 0.7)
            band = Image.new('RGBA', c.size, (0, 0, 0, 0))
            ImageDraw.Draw(band).rectangle((x0 - 6, y1 + 4, x0 + int((x1 - x0 + 12) * prog), y1 + 14),
                                           fill=GREEN + (255,))
            c = Image.alpha_composite(c, band)
        x = (W - c.width) // 2
        y = cy - c.height // 2 + int((1 - k) * 90)
        a = c if k >= 1 else Image.blend(Image.new('RGBA', c.size, (0, 0, 0, 0)), c, k)
        im = im.convert('RGBA')
        im.alpha_composite(a, (x, y))
        d = ImageDraw.Draw(im)
        if date:
            stamp(d, (96, 80), date, date_sub)
        if quote:
            qy = 80 + (140 if date else 0)
            kq = ease_out((t - 0.15) / 0.4)
            f = F('Black', 96)
            d.text((96, qy + int((1 - kq) * 30)), quote, font=f, fill=WHITE, stroke_width=4, stroke_fill=BLACK)
            d.rectangle((96, qy + 120, 96 + int(f.getlength(quote) * kq), qy + 130), fill=GREEN)
        source_tag(d, src)
        return im
    seg_frames(out, dur, draw)


def seg_still(out, rel, dur, zoom=(1.0, 1.08), label='示意图', darken=0.0):
    src = Image.open(src_path(rel)).convert('RGB')
    src = src.resize((int(W * 1.12), int(H * 1.12)), Image.LANCZOS)
    if darken:
        src = Image.blend(src, Image.new('RGB', src.size, BLACK), darken)

    def draw(t):
        z = zoom[0] + (zoom[1] - zoom[0]) * t / dur
        cw, ch = int(src.width / z), int(src.height / z)
        x0, y0 = (src.width - cw) // 2, (src.height - ch) // 2
        im = src.crop((x0, y0, x0 + cw, y0 + ch)).resize((W, H), Image.BICUBIC)
        d = ImageDraw.Draw(im)
        if label:
            d.text((W - 48, H - 74), label, font=F('Medium', 40), fill=(210, 210, 206), anchor='ra',
                   stroke_width=2, stroke_fill=BLACK)
        return im
    seg_frames(out, dur, draw)


def load_closes(rel='data/J1_nvda_daily.csv'):
    rows = []
    with open(src_path(rel)) as f:
        for r in csv.reader(l for l in f if not l.startswith('#')):
            if r and r[0] != 'date' and r[4]:
                rows.append((r[0], float(r[4])))
    return rows


def seg_bars(out, dur, start='2026-11-03', end='2026-11-23', hi='2026-11-23', title='英伟达 单日涨跌幅', src=None):
    rows = load_closes()
    chg = []
    for (d0, c0), (d1, c1) in zip(rows, rows[1:]):
        if start <= d1 <= end:
            chg.append((d1, (c1 / c0 - 1) * 100))
    bgi = bg_dark()
    x0, x1, base_y, top = 200, 1720, 760, 230
    vmax = max(abs(v) for _, v in chg)
    scale = (base_y - top) / vmax
    bw = (x1 - x0) / len(chg)

    def draw(t):
        im = bgi.copy()
        d = ImageDraw.Draw(im)
        d.text((96, 80), title, font=F('Black', 84), fill=WHITE)
        d.line([(x0, base_y), (x1, base_y)], fill=(90, 90, 90), width=3)
        for i, (day, v) in enumerate(chg):
            k = ease_out((t - 0.05 * i) / 0.5)
            if day == hi:
                k = ease_out((t - 0.9) / 0.6)
            h = v * scale * k
            cx = x0 + bw * (i + 0.5)
            col = RED if v >= 0 else GREEN      # 中国习惯：红涨绿跌
            if day == hi:
                col = (240, 50, 50)
            d.rectangle((cx - bw * 0.32, min(base_y, base_y - h), cx + bw * 0.32, max(base_y, base_y - h)), fill=col)
            if day == hi or i % 3 == 0:
                d.text((cx, base_y + 24 if v >= 0 else base_y - h + 18), day[5:].replace('-', '/'),
                       font=F('Medium', 36), fill=(170, 170, 166), anchor='ma')
            if day == hi and k > 0.6:
                d.text((cx - bw * 0.5, base_y - h - 20), f'+{v:.1f}%', font=F('Black', 150), fill=(240, 50, 50),
                       anchor='rd')
        source_tag(d, src)
        return im
    seg_frames(out, dur, draw)


def seg_title(out, dur, lines, bg=None, sub=None):
    bgi = bg if bg is not None else bg_dark()

    def draw(t):
        im = bgi.copy()
        d = ImageDraw.Draw(im)
        y = H // 2 - 60 * len(lines)
        for i, (txt, size, col) in enumerate(lines):
            k = ease_out((t - 0.15 * i) / 0.4)
            if k <= 0:
                continue
            f = F('Black', size)
            d.text((W // 2, y + int((1 - k) * 40)), txt, font=f, fill=col, anchor='ma')
            y += int(size * 1.25)
        if sub:
            source_tag(d, sub)
        return im
    seg_frames(out, dur, draw)


# ---------------- 拼接、包装 ----------------

def concat(segs, out):
    lst = out + '.txt'
    with open(lst, 'w') as f:
        for s in segs:
            f.write(f"file '{s}'\n")
    ff(['-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', out])


def ass_header(w, h, size, margin_v, align):
    return f"""[Script Info]
ScriptType: v4.00+
PlayResX: {w}
PlayResY: {h}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Noto Sans SC Bold,{size},&H00F2F5F5,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,1,0,1,3,1,{align},60,60,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def _ts(s):
    h, m = int(s // 3600), int(s % 3600 // 60)
    return f'{h}:{m:02d}:{s % 60:05.2f}'


def write_ass(path, subs, vertical):
    if vertical:
        head = ass_header(1080, 1920, 50, 1238, 8)
    else:
        head = ass_header(1920, 1080, 58, 54, 2)
    with open(path, 'w') as f:
        f.write(head)
        for a, b, txt in subs:
            f.write(f'Dialogue: 0,{_ts(a)},{_ts(b)},Sub,,0,0,0,,{txt}\n')


def package(master, audio, subs, out_dir, frame_png, name):
    va = os.path.join(out_dir, f'{name}_vertical.ass')
    ha = os.path.join(out_dir, f'{name}_horizontal.ass')
    write_ass(va, subs, True)
    write_ass(ha, subs, False)
    fd = os.path.join(FONTS)
    ff(['-i', master, '-i', frame_png, '-i', audio, '-filter_complex',
        f"[0:v]scale=1080:608,pad=1080:1920:0:600:color=black[w];[w][1:v]overlay=0:0,"
        f"ass={va}:fontsdir={fd}[v]", '-map', '[v]', '-map', '2:a', '-shortest'] + ENC + AENC +
       ['-movflags', '+faststart', os.path.join(out_dir, f'{name}_竖屏.mp4')])
    ff(['-i', master, '-i', audio, '-filter_complex',
        f"[0:v]drawtext=fontfile={FONTS}/NotoSansSC-Black.ttf:text='北极熊吃海豹':x=48:y=40:fontsize=34:"
        f"fontcolor=white@0.85:borderw=2:bordercolor=black,ass={ha}:fontsdir={fd}[v]",
        '-map', '[v]', '-map', '1:a', '-shortest'] + ENC + AENC +
       ['-movflags', '+faststart', os.path.join(out_dir, f'{name}_横屏.mp4')])
