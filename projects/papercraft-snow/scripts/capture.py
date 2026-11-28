"""Deterministic review captures and videos of a papercraft build (window.__papercraft hook).

Serves the project folder, opens the page in Chrome (headless, GPU), waits for the build, runs each shot on the fixed
clock and saves a PNG or an MP4 into <project>/frames/ (--out). Prints the build time, the frame, the pieces, the
standing cards in frame, the slowest prints, the hero's card-clipping check and every page error, and exits non-zero
on a page error, a clipping hero, a walk that does not arrive or a video whose frames do not add up.

    python scripts/capture.py <project folder> [shots ...]
                              [--page index.html] [--out frames] [--size 1600x900] [--ss 1]
                              [--safe all|meta|tiktok|shorts] [--hook __papercraft]
                              [--audio] [--loop] [--paper-ratio 18] [--lufs -16] [--paper-gain 0]
                              [--paper-wav PATH] [--music-wav PATH]
                              [--png-frames] [--verify-frames N]

--size: WxH, a ratio (9:16 = 1080x1920: the short side 1080) or a format (references/formats.md):
    1080p 1920x1080 | 720p | 1440p | 4k 3840x2160 | reel / story / tiktok / shorts / vertical 1080x1920 |
    reel-hd 1440x2560 | feed / portrait 1080x1350 (4:5) | grid 1080x1440 (3:4) | square 1080x1080 |
    ultrawide 2560x1080 | flat 1998x1080 (1.85) | scope 2048x858 (2.39)
The default 1600x900 is the review size measure.py's gates assume.

Shots (default: overview):
    overview                          restart(); step(3.2): the opening frame, risen
    midrise                           restart(); step(0.8): mid-rise
    test                              the ?test page (close, your test cards)
    key                               ?diag=key: the key light alone (shadow shapes)
    mood=NAME                         ?mood=NAME (golden, dusk, night or one of yours), risen
    look=X,Z[,DIST[,Y]]               a close look at (X, Z) (DIST default 30)
    spot=NAME[,DIST]                  a close look at H.spots[NAME]
    walk=X,Z;X,Z;...                  scripted walk from start through waypoints; prints { reached, of, stuck, ... }
    at=X,Z                            place hero at (X, Z), walking camera framing him
    hold=KEYS,SEC                     from start, hold keys (e.g. ArrowUp+ArrowLeft) for SEC seconds at 60 fps
    timeline=SEC[,FPS[,FROM]]         choreographed / scrolling / hero-less film: SEC seconds at FPS (default 30)
                                      starting after FROM seconds (default 0)
    time=SEC[,FPS]                    one still of that film at SEC seconds: restart(); step to SEC in 1/FPS steps
                                      (default 30), so cues, cameras and light are where the video has them
    video=SEC[,FPS[,KEYS[,FROM]]]     from restart, SEC seconds at FPS (default 30) on the fixed clock; KEYS
                                      (ArrowLeft+ArrowUp, or -) are held while recording; FROM skips seconds first
    route=SEC,FPS[,FROM];X,Z;X,Z;...  video of the hero walking through waypoints (FROM default 3.2: world risen)
FPS may be fractional (23.976, 29.97, 59.94). Name a shot's file with NAME: before it (bridge:spot=bridge).

Video. Frames go through Chrome's WebCodecs H.264 encoder (GPU: 60-200 fps instead of ~3) and are re-encoded with
ffmpeg to the MP4 every platform takes (H.264 High, yuv420p, BT.709, +faststart). The first encoded frame is a set of
colour patches, read back to learn which range and matrix this encoder wrote (they differ by machine and are not
tagged): without it blacks crush and colours shift. PNG screenshots are used instead (lossless frames, slower) with
--png-frames, --safe, --ss above 1, an odd frame size, HTML drawn over the canvas (the fast path records the canvas
alone), no WebCodecs, an encoder failure or a failed colour check. Every MP4's frame count is checked.

Audio (--audio). The page's hook renders the stems (renderAudio: the paper sounds the harness logged, the score of
H.setMusicRenderer); --paper-wav / --music-wav replace them with files of any format ffmpeg reads, cut to the clip.
With music, the paper peak is set --paper-ratio dB under the music peak and the mix brought to --lufs with one gain
(nothing is compressed). Without music, the paper keeps the kit's own quiet level (--paper-gain adds dB): paper is
never normalised. A paper stem with under ~78 % of its energy below 1.5 kHz gets a gentle low-pass (it is bright).
The music fades out over the clip's last second or less; --loop leaves it unfaded, for a film whose end runs back
into its start (render the score without its own fades too: references/sound.md).
"""
import argparse, base64, functools, http.server, json, math, os, re, secrets, shutil, subprocess, sys, tempfile, threading, time, wave

FORMATS = {
    '720p': (1280, 720), '1080p': (1920, 1080), '1440p': (2560, 1440), '4k': (3840, 2160), 'uhd': (3840, 2160),
    'vertical': (1080, 1920), 'reel': (1080, 1920), 'reels': (1080, 1920), 'story': (1080, 1920), 'tiktok': (1080, 1920),
    'shorts': (1080, 1920), 'reel-hd': (1440, 2560), 'feed': (1080, 1350), 'portrait': (1080, 1350), 'grid': (1080, 1440),
    'square': (1080, 1080), 'ultrawide': (2560, 1080), 'flat': (1998, 1080), 'scope': (2048, 858),
}
# the calibration frame: 4 x 2 flat patches (sRGB) the encoder's colour handling is read from
CAL = [(20, 20, 20), (128, 128, 128), (235, 235, 235), (200, 40, 40), (40, 180, 60), (50, 60, 200), (230, 200, 60), (60, 200, 200)]
MAX_CHUNK = 64 << 20


def parse_size(s):
    s = s.strip().lower()
    if s in FORMATS:
        return FORMATS[s]
    m = re.fullmatch(r'(\d+)x(\d+)', s)
    if m:
        return int(m[1]), int(m[2])
    m = re.fullmatch(r'([\d.]+):([\d.]+)', s)
    if m:
        a, b = float(m[1]), float(m[2])
        w, h = (1080 * a / b, 1080) if a >= b else (1080, 1080 * b / a)
        return int(round(w / 2)) * 2, int(round(h / 2)) * 2
    raise SystemExit(f'capture.py: --size {s!r}: use WxH, a ratio like 9:16, or one of {", ".join(FORMATS)}')


def parse_fps(s, default=30):
    """A frame rate: whole (30) or fractional (29.97)."""
    if s is None or s == '':
        return default
    try:
        v = float(s)
    except ValueError:
        raise SystemExit(f'capture.py: frame rate {s!r}: use a number such as 30, 24, 60 or 29.97')
    if not 1 <= v <= 240:
        raise SystemExit(f'capture.py: frame rate {s}: use 1-240')
    return int(v) if v == int(v) else v


def fps_arg(fps):
    """ffmpeg's exact form of a frame rate (the NTSC rates as fractions)."""
    for near, frac in ((23.976, '24000/1001'), (29.97, '30000/1001'), (59.94, '60000/1001')):
        if abs(fps - near) < 0.01:
            return frac
    return f'{fps:g}'


def serve(root, upload_state):
    """The project over http on 127.0.0.1, plus one upload path (a per-run token) the page streams video chunks to."""
    lock = threading.Lock()
    token = secrets.token_hex(12)

    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_POST(self):
            m = re.fullmatch(rf'/__pc_chunk/{token}/(\d+)', self.path)
            if not m:
                self.send_response(404); self.end_headers(); return
            try:
                n = int(self.headers.get('Content-Length', '0'))
            except ValueError:
                n = -1
            if n < 0 or n > MAX_CHUNK:
                self.send_response(400); self.end_headers(); return
            data = self.rfile.read(n) if n > 0 else b''
            with lock:   # chunks are numbered: a retried upload is written once, and only in order
                fp, seq = upload_state.get('fp'), int(m[1])
                if fp is None or seq > upload_state.get('seq', 0):
                    self.send_response(409); self.end_headers(); return
                if seq == upload_state.get('seq', 0):
                    fp.write(data)
                    upload_state['seq'] = seq + 1
            self.send_response(204)
            self.end_headers()

    class Server(http.server.ThreadingHTTPServer):
        request_queue_size = 128   # a page that loads dozens of images at once: the default backlog of 5 refuses some

    srv = Server(('127.0.0.1', 0), functools.partial(Handler, directory=root))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv.server_address[1], f'/__pc_chunk/{token}'


def safe_replace(src, dst):
    """Atomic rename with graceful Windows file-lock fallback (when target MP4 is open in a player)."""
    try:
        os.replace(src, dst)
        return dst
    except PermissionError:
        stem, ext = os.path.splitext(dst)
        for i in range(1, 100):
            alt = f'{stem}_new{"" if i == 1 else i}{ext}'
            try:
                os.replace(src, alt)
                print(f'  note: {os.path.basename(dst)} is locked by another program; wrote {os.path.basename(alt)} instead')
                return alt
            except PermissionError:
                continue
        raise


def plan(shot):
    """(file name, url query, js or payload, kind)"""
    name = None
    if ':' in shot.split('=')[0]:
        name, shot = shot.split(':', 1)
    key, _, arg = shot.partition('=')
    base = 'restart(); step(3.2);'
    if key == 'overview': return name or 'overview', '', base, 'frame'
    if key == 'midrise': return name or 'midrise', '', 'restart(); step(0.8);', 'frame'
    if key == 'test': return name or 'test', 'test', 'restart(); step(2.5);', 'frame'
    if key == 'key': return name or 'key', 'diag=key', base, 'frame'
    if key == 'mood': return name or f'mood-{arg}', f'mood={arg}', base, 'frame'
    if key == 'look':
        v = [float(t) for t in arg.split(',')]
        return name or 'look-' + '_'.join(f'{t:g}' for t in v[:2]), '', base + f' look({", ".join(str(t) for t in v)}); step(1 / 60);', 'frame'
    if key == 'spot':
        sp, _, d = arg.partition(',')
        return name or f'spot-{sp}', '', base + f' look(spots[{json.dumps(sp)}][0], spots[{json.dumps(sp)}][1], {d or 30}); step(1 / 60);', 'frame'
    if key == 'walk':
        pts = [[float(t) for t in p.split(',')] for p in arg.split(';') if p]
        return name or 'walk', '', pts, 'walk'
    if key == 'at':
        x, z = [float(t) for t in arg.split(',')]
        return name or f'at-{x:g}_{z:g}', '', base + f' const y = place({x}, {z}); step(0.5); return y;', 'at'
    if key == 'hold':
        keys, _, sec = arg.partition(',')
        return name or 'hold', '', (keys.split('+'), float(sec or 1)), 'hold'
    if key == 'time':
        p = arg.split(',')
        sec, fps = float(p[0] or 0), parse_fps(p[1] if len(p) > 1 else None)
        return name or f'time-{sec:g}', '', f'restart(); step(0); if ({sec} > 0) step({sec}, {fps});', 'frame'
    if key == 'timeline':
        p = arg.split(',')
        sec = float(p[0] or 6) if p and p[0] else 6.0
        fps = parse_fps(p[1] if len(p) > 1 else None)
        start = float(p[2]) if len(p) > 2 and p[2] else 0.0
        return name or 'timeline', '', (sec, fps, [], start, None), 'video'
    if key == 'video':
        p = arg.split(',')
        sec = float(p[0] or 4) if p and p[0] else 4.0
        fps = parse_fps(p[1] if len(p) > 1 else None)
        keys = p[2].split('+') if len(p) > 2 and p[2] and p[2] != '-' else []
        start = float(p[3]) if len(p) > 3 and p[3] else 0.0
        return name or 'video', '', (sec, fps, keys, start, None), 'video'
    if key == 'route':
        head, *pts = arg.split(';')
        p = head.split(',')
        sec, fps = float(p[0] or 4), parse_fps(p[1] if len(p) > 1 else None)
        start = float(p[2]) if len(p) > 2 and p[2] else 3.2
        way = [[float(t) for t in q.split(',')] for q in pts if q]
        return name or 'route', '', (sec, fps, [], start, way), 'video'
    raise SystemExit(f'capture.py: unknown shot "{shot}" (see the docstring)')


def prep_wav(src, dst, start, sec):
    """Any audio ffmpeg reads -> the clip's window as 48 kHz stereo 16-bit WAV (what the level checks read)."""
    r = subprocess.run([shutil.which('ffmpeg'), '-y', '-v', 'error', '-ss', f'{max(0.0, start):.3f}', '-t', f'{sec:.3f}', '-i', src,
                        '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', dst], capture_output=True, text=True)
    if r.returncode or not os.path.exists(dst) or os.path.getsize(dst) < 64:
        raise SystemExit(f'capture.py: could not read audio from {src}: {r.stderr.strip()[-300:] or "no audio in the clip window"}')
    return dst


def wav_hygiene(path):
    """Peak, RMS and tail level (dBFS) and spectral warmth (<1.5 kHz and <2.5 kHz energy %) of a 16-bit WAV."""
    with wave.open(path, 'rb') as wf:
        ch, sw, sr, n = wf.getnchannels(), wf.getsampwidth(), wf.getframerate(), wf.getnframes()
        raw = wf.readframes(n)
    dur = n / max(1, sr)
    quiet = {'duration': dur, 'sr': sr, 'ch': ch, 'peak_db': -120.0, 'rms_db': -120.0, 'tail_db': -120.0, 'pct_1500': 100.0, 'pct_2500': 100.0}
    if sw != 2 or not raw:
        return quiet
    to_db = lambda v: 20.0 * math.log10(max(v, 1e-6))
    try:
        import numpy as np
        x = np.frombuffer(raw, dtype='<i2').astype(np.float32) / 32768.0
        mono = x.reshape(-1, ch).mean(axis=1) if ch > 1 else x
        peak = float(np.max(np.abs(x))) if x.size else 0.0
        rms = float(np.sqrt(np.mean(x * x))) if x.size else 0.0
        tail_n = min(len(mono), max(1, int(sr * 0.25)))
        tail_rms = float(np.sqrt(np.mean(mono[-tail_n:] ** 2))) if tail_n else 0.0
        pct_1500 = pct_2500 = 100.0
        if rms > 1e-5 and len(mono) >= 64:
            spec = np.abs(np.fft.rfft(mono)) ** 2
            freqs = np.fft.rfftfreq(len(mono), 1.0 / sr)
            tot = float(spec.sum()) + 1e-18
            pct_1500 = 100.0 * float(spec[freqs <= 1500.0].sum()) / tot
            pct_2500 = 100.0 * float(spec[freqs <= 2500.0].sum()) / tot
        return {'duration': dur, 'sr': sr, 'ch': ch, 'peak_db': to_db(peak), 'rms_db': to_db(rms), 'tail_db': to_db(tail_rms),
                'pct_1500': pct_1500, 'pct_2500': pct_2500}
    except ImportError:
        import array
        arr = array.array('h')
        arr.frombytes(raw)
        peak = max(abs(v) for v in arr) / 32768.0
        rms = math.sqrt(sum((v / 32768.0) ** 2 for v in arr) / len(arr))
        return {**quiet, 'peak_db': to_db(peak), 'rms_db': to_db(rms)}


def loudness(inputs, graph):
    """Integrated loudness (LUFS) and peak (dBFS) of an audio filter graph's [mix] output; None where unmeasurable."""
    cmd = [shutil.which('ffmpeg'), '-hide_banner', '-nostats']
    for i in inputs:
        cmd += ['-i', i]
    cmd += ['-filter_complex', graph + ';[mix]ebur128=peak=sample[o]', '-map', '[o]', '-f', 'null', '-']
    r = subprocess.run(cmd, capture_output=True, text=True)
    i_all = re.findall(r'\bI:\s+(-?[\d.]+) LUFS', r.stderr)
    p_all = re.findall(r'\bPeak:\s+(-?[\d.]+) dBFS', r.stderr)
    return (float(i_all[-1]) if i_all else None, float(p_all[-1]) if p_all else None)


def probe_mp4(mp4):
    exe = shutil.which('ffprobe')
    if not exe or not os.path.exists(mp4):
        return None
    r = subprocess.run([
        exe, '-v', 'error',
        '-show_entries', 'format=duration,size',
        '-show_entries', 'stream=codec_type,codec_name,profile,width,height,r_frame_rate,pix_fmt,sample_rate,channels,nb_frames',
        '-of', 'json', mp4
    ], capture_output=True, text=True)
    if r.returncode:
        return None
    try:
        info = json.loads(r.stdout)
        v = next((s for s in info.get('streams', []) if s.get('codec_type') == 'video'), None)
        au = next((s for s in info.get('streams', []) if s.get('codec_type') == 'audio'), None)
        fmt = info.get('format', {})
        return {'video': v, 'audio': au, 'duration': float(fmt.get('duration', 0)), 'size': int(fmt.get('size', 0))}
    except Exception:
        return None


def extract_verify_frames(mp4, out_dir, count, dur):
    exe = shutil.which('ffmpeg')
    if not exe or count <= 0 or dur <= 0:
        return []
    os.makedirs(out_dir, exist_ok=True)
    for old in os.listdir(out_dir):
        if re.fullmatch(r'v_\d+_[\d.]+s\.png', old): os.remove(os.path.join(out_dir, old))
    paths = []
    for i in range(count):
        t = dur * (0.08 + 0.84 * i / max(1, count - 1)) if count > 1 else dur * 0.5
        p = os.path.join(out_dir, f'v_{i + 1:02d}_{t:.2f}s.png')
        r = subprocess.run([exe, '-y', '-loglevel', 'error', '-ss', f'{t:.3f}', '-i', mp4, '-frames:v', '1', p], capture_output=True, text=True)
        if r.returncode == 0 and os.path.exists(p):
            paths.append(p)
    return paths


def capture_webcodecs(pg, hook, W, H, sec, fps, keys, start, way, h264_path, upload_state, upload_url):
    """Stream the canvas through Chrome's WebCodecs H.264 encoder to an Annex B file: a calibration frame of colour
    patches first, then the clip's frames. Returns { ok, frames, ... } or { ok: False, reason }."""
    preflight = pg.evaluate("""async ({ W, H, fps }) => {
      const cv = document.querySelector('canvas');
      if (!cv || typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') return { ok: false, reason: 'no WebCodecs in this browser' };
      if (cv.width !== W || cv.height !== H) return { ok: false, reason: `the canvas is ${cv.width}x${cv.height}, not ${W}x${H}` };
      // the fast path records the canvas alone: anything drawn over it in HTML would be missing from the video
      const r = cv.getBoundingClientRect();
      for (const el of document.body.querySelectorAll('*')) {
        if (el === cv || el.contains(cv) || ['SCRIPT', 'STYLE', 'LINK', 'META', 'TEMPLATE'].includes(el.tagName)) continue;
        const s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) continue;
        const b = el.getBoundingClientRect();
        if (b.width > 0 && b.height > 0 && b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top)
          return { ok: false, reason: `HTML is drawn over the canvas (<${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}>)` };
      }
      const base = { width: W, height: H, framerate: fps, avc: { format: 'annexb' } };
      const rate = Math.min(240_000_000, Math.max(40_000_000, Math.round(W * H * fps * 1.2)));
      // a fixed quantizer first (constant quality, whatever the content), then a generous bitrate
      const tries = [
        [{ bitrateMode: 'quantizer', hardwareAcceleration: 'prefer-hardware' }, 16],
        [{ bitrateMode: 'quantizer' }, 16],
        [{ bitrate: rate, bitrateMode: 'constant', hardwareAcceleration: 'prefer-hardware' }, null],
        [{ bitrate: rate }, null],
      ];
      for (const [extra, qp] of tries) for (const codec of ['avc1.640033', 'avc1.64002a', 'avc1.4d0033']) {
        try {
          const cfg = { codec, ...base, ...extra };
          const sup = await VideoEncoder.isConfigSupported(cfg);
          if (sup && sup.supported) return { ok: true, cfg, qp };
        } catch {}
      }
      return { ok: false, reason: 'no supported H.264 encoder configuration' };
    }""", {'W': W, 'H': H, 'fps': fps})
    if not preflight.get('ok'):
        return preflight

    t0 = time.perf_counter()
    with open(h264_path, 'wb') as fp:
        upload_state['fp'], upload_state['seq'] = fp, 0
        try:
            res = pg.evaluate("""async ({ hook, W, H, sec, fps, keys, start, way, cfg, qp, url, cal }) => {
              const P = window[hook];
              const cv = document.querySelector('canvas');
              const n = Math.max(1, Math.round(sec * fps));
              const gop = Math.max(1, Math.round(fps / 2)), frameUs = Math.round(1e6 / fps);
              let encErr = null;
              let pending = [], pendingBytes = 0, seq = 0;
              const flushBytes = async () => {
                if (!pending.length) return;
                const merged = new Uint8Array(pendingBytes);
                let off = 0;
                for (const c of pending) { merged.set(c, off); off += c.byteLength; }
                pending = []; pendingBytes = 0;
                for (let tries = 0; ; tries++) {   // numbered chunks: a retry after a dropped connection is written once
                  try {
                    const resp = await fetch(`${url}/${seq}`, { method: 'POST', body: merged });
                    if (resp.ok) break;
                    throw new Error('chunk upload failed: ' + resp.status);
                  } catch (e) {
                    if (tries >= 3) throw e;
                    await new Promise((r) => setTimeout(r, 200));
                  }
                }
                seq++;
              };
              const enc = new VideoEncoder({
                output: (chunk) => {
                  const buf = new Uint8Array(chunk.byteLength);
                  chunk.copyTo(buf);
                  pending.push(buf);
                  pendingBytes += buf.byteLength;
                },
                error: (e) => { encErr = String(e); },
              });
              enc.configure(cfg);
              const opts = (key) => (qp != null ? { keyFrame: key, avc: { quantizer: qp } } : { keyFrame: key });
              // frame 0: flat colour patches through this same encoder (the tool reads back which range and matrix it wrote)
              {
                const c = new OffscreenCanvas(W, H), g = c.getContext('2d');
                cal.forEach(([r, gg, b], i) => { g.fillStyle = `rgb(${r},${gg},${b})`; g.fillRect((i % 4) * W / 4, Math.floor(i / 4) * H / 2, W / 4 + 1, H / 2 + 1); });
                const vf = new VideoFrame(c, { timestamp: 0, duration: frameUs });
                enc.encode(vf, opts(true));
                vf.close();
              }
              P.restart();
              if (start > 0) P.step(start);
              for (const k of keys) dispatchEvent(new KeyboardEvent('keydown', { code: k, key: k }));
              let wi = 0;
              for (let i = 0; i < n; i++) {
                if (encErr) throw new Error(encErr);
                if (way && way.length) {
                  while (wi < way.length) {
                    const h = P.heroPos;
                    const dx = way[wi][0] - h.x, dz = way[wi][1] - h.z;
                    if (dx * dx + dz * dz > 0.36) { P.steer(dx, dz); break; }
                    wi++;
                  }
                  if (wi >= way.length) P.steer(null);
                }
                P.step(1 / fps, fps);
                const vf = new VideoFrame(cv, { timestamp: Math.round((i + 1) * 1e6 / fps), duration: frameUs });
                enc.encode(vf, opts((i % gop) === 0));
                vf.close();
                while (enc.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 1));
                if (pendingBytes >= 524288) await flushBytes();
              }
              for (const k of keys) dispatchEvent(new KeyboardEvent('keyup', { code: k, key: k }));
              if (way && way.length) P.steer(null);
              await enc.flush();
              enc.close();
              if (encErr) throw new Error(encErr);
              await flushBytes();
              const hp = P.heroPos ? [+P.heroPos.x.toFixed(1), +P.heroPos.z.toFixed(1)] : null;
              return { ok: true, frames: n, wi, heroPos: hp };
            }""", {'hook': hook, 'W': W, 'H': H, 'sec': sec, 'fps': fps, 'keys': keys, 'start': start, 'way': way,
                   'cfg': preflight['cfg'], 'qp': preflight['qp'], 'url': upload_url, 'cal': CAL})
        finally:
            upload_state['fp'] = None
    res['elapsed'] = time.perf_counter() - t0
    res['mode'] = 'quantizer' if preflight['qp'] is not None else 'bitrate'
    return res


def detect_colour(h264_path):
    """Which range and matrix did the encoder write? Decodes the calibration frame under each reading and keeps the
    one closest to the patches drawn. Returns (range, matrix, mean error in levels, ffmpeg colourspace tag) or None."""
    exe, best = shutil.which('ffmpeg'), None
    for rng in ('pc', 'tv'):
        for mat, tag in (('bt709', 'bt709'), ('bt601', 'smpte170m')):
            r = subprocess.run([exe, '-v', 'error', '-color_range', rng, '-colorspace', tag, '-f', 'h264', '-i', h264_path, '-vf',
                                f'select=eq(n\\,0),scale=in_range={rng}:in_color_matrix={mat}:out_color_matrix=bt709:out_range=pc,format=rgb24,scale=32:16:flags=neighbor',
                                '-frames:v', '1', '-f', 'rawvideo', '-'], capture_output=True)
            px = r.stdout
            if r.returncode or len(px) < 32 * 16 * 3:
                continue
            err = 0.0
            for i, want in enumerate(CAL):
                o = (((i // 4) * 8 + 4) * 32 + (i % 4) * 8 + 4) * 3
                err += sum(abs(px[o + k] - want[k]) for k in range(3)) / 3
            err /= len(CAL)
            if best is None or err < best[2]:
                best = (rng, mat, err, tag)
    return best


def encode_mp4(source, colour, fps, n, mp4, paper_wav=None, music_wav=None, paper_ratio=18.0, lufs=-16.0, paper_gain=0.0, loop=False):
    """PNG frames (colour None) or the WebCodecs stream (colour from detect_colour: its calibration frame is dropped)
    plus optional stems -> the MP4 every platform takes: H.264 High, yuv420p, BT.709 tagged, limited range, a closed GOP
    of half a second, +faststart, exactly n frames. Returns the written path or None."""
    exe = shutil.which('ffmpeg')
    sec = n / fps
    cmd = [exe, '-y', '-loglevel', 'error']
    to709 = 'out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv'
    if colour:
        rng, mat, _, tag = colour
        cmd += ['-color_range', rng, '-colorspace', tag, '-r', fps_arg(fps), '-f', 'h264', '-i', source]
        vf = f'select=gte(n\\,1),setpts=PTS-STARTPTS,scale=in_range={rng}:in_color_matrix={mat}:{to709}'
    else:
        cmd += ['-framerate', fps_arg(fps), '-i', os.path.join(source, 'f_%05d.png')]
        vf = f'scale={to709}'

    has_paper, has_music = bool(paper_wav), bool(music_wav)
    ph = mh = None
    if has_paper:
        ph = wav_hygiene(paper_wav)
        print(f'  audio paper: peak {ph["peak_db"]:.1f} dBFS, rms {ph["rms_db"]:.1f} dBFS, <1.5kHz {ph["pct_1500"]:.1f}%, <2.5kHz {ph["pct_2500"]:.1f}%')
        has_paper = ph['peak_db'] > -75.0
    if has_music:
        mh = wav_hygiene(music_wav)
        print(f'  audio music: peak {mh["peak_db"]:.1f} dBFS, rms {mh["rms_db"]:.1f} dBFS, <1.5kHz {mh["pct_1500"]:.1f}%, tail {mh["tail_db"]:.1f} dBFS')
        has_music = mh['peak_db'] > -75.0

    audio = []
    if has_paper or has_music:
        fade_d = min(1.0, max(0.2, sec * 0.15))
        warm = 'lowpass=f=1750:poles=1,' if has_paper and ph['pct_1500'] < 78.0 else ''
        if warm:
            print(f'  audio qa: paper <1.5kHz is {ph["pct_1500"]:.1f}% (bright): a gentle low-pass is applied')

        def graph(pi, mi, p_db):   # the mix as [mix], from paper input pi and music input mi (either may be None)
            parts = []
            if pi is not None: parts.append(f'[{pi}:a]{warm}volume={p_db:.2f}dB[p]')
            if mi is not None: parts.append(f'[{mi}:a]anull[m]' if loop else f'[{mi}:a]afade=t=out:st={max(0.0, sec - fade_d):.3f}:d={fade_d:.3f}[m]')
            if pi is not None and mi is not None: parts.append('[p][m]amix=inputs=2:duration=longest:normalize=0[mix]')
            else: parts[-1] = parts[-1][:-3] + '[mix]'
            return ';'.join(parts)

        if has_music:
            # music leads: the paper peak sits paper_ratio dB under the music peak, then ONE gain brings the mix to lufs
            p_db = max(-42.0, min(6.0, (mh['peak_db'] - paper_ratio) - ph['peak_db'])) if has_paper else 0.0
            files = ([paper_wav] if has_paper else []) + [music_wav]
            meas = graph(0 if has_paper else None, 1 if has_paper else 0, p_db)
            i_lufs, peak = loudness(files, meas)
            gain = 0.0
            if i_lufs is not None and i_lufs > -60.0:
                gain = lufs - i_lufs
                if peak is not None: gain = min(gain, -1.5 - peak)   # never past -1.5 dBFS
            mix = graph(1 if has_paper else None, 2 if has_paper else 1, p_db)
            print('  audio mix: music leads' + (f', paper peak {paper_ratio:.0f} dB under it (paper {p_db:+.1f} dB)' if has_paper else '')
                  + (f', {gain:+.1f} dB to {i_lufs + gain:.1f} LUFS' if i_lufs is not None else ''))
        else:
            # paper alone keeps the kit's own level: it is quiet by design and is never normalised
            p_db = min(paper_gain, -1.5 - ph['peak_db'])
            files, gain = [paper_wav], 0.0
            mix = graph(1, None, p_db)
            print(f'  audio mix: paper alone at the kit\'s own level ({p_db:+.1f} dB): quiet by design, --paper-gain raises it')
        for f in files:
            cmd += ['-i', f]
        cmd += ['-filter_complex', f'{mix};[mix]volume={gain:.2f}dB,apad,atrim=0:{sec:.4f}[aout]']
        audio = ['-map', '0:v:0', '-map', '[aout]', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2']

    tmp_mp4 = mp4 + '.tmp.mp4'
    cmd += ['-vf', vf, '-frames:v', str(n), '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'medium' if colour else 'slow', '-crf', '18',
            '-g', str(max(1, round(fps / 2))), '-bf', '2',
            '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
            *(audio or ['-an']), '-movflags', '+faststart', tmp_mp4]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print('  ffmpeg failed:', r.stderr[-800:])
        if os.path.exists(tmp_mp4):
            os.remove(tmp_mp4)
        return None
    return safe_replace(tmp_mp4, mp4)


def main():
    try:
        sys.stdout.reconfigure(line_buffering=True)
    except Exception:
        pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('project'); ap.add_argument('shots', nargs='*')
    ap.add_argument('--page', default='index.html'); ap.add_argument('--out', default='frames')
    ap.add_argument('--size', default='1600x900'); ap.add_argument('--ss', default='1')
    ap.add_argument('--safe', default=None, help='outline a vertical platform safe area: all | meta | tiktok | shorts')
    ap.add_argument('--hook', default='__papercraft', help='global window hook name (default: __papercraft)')
    ap.add_argument('--audio', action='store_true', help='render the paper sounds and the scene\'s music through the hook and mix them into the MP4')
    ap.add_argument('--loop', action='store_true', help='with --audio: do not fade the music out at the end (a film that loops)')
    ap.add_argument('--paper-wav', default=None, help='a paper-sound file instead of the hook\'s (any format ffmpeg reads)')
    ap.add_argument('--music-wav', default=None, help='a music file instead of the hook\'s (any format ffmpeg reads)')
    ap.add_argument('--paper-ratio', type=float, default=18.0, help='with music: dB the paper peak sits under the music peak (default 18)')
    ap.add_argument('--lufs', type=float, default=-16.0, help='with music: integrated loudness of the mix in LUFS (default -16)')
    ap.add_argument('--paper-gain', type=float, default=0.0, help='without music: dB added to the paper stem (default 0: the kit\'s own level)')
    ap.add_argument('--png-frames', action='store_true', help='PNG screenshots per frame instead of WebCodecs (lossless frames, slower)')
    ap.add_argument('--verify-frames', type=int, default=0, help='extract N PNG frames from each final MP4 to look at')
    a = ap.parse_args()
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise SystemExit('capture.py needs Playwright: pip install playwright (and `playwright install chromium` if Chrome is not installed)')
    for label, f in (('--paper-wav', a.paper_wav), ('--music-wav', a.music_wav)):
        if f and not os.path.isfile(f):
            raise SystemExit(f'capture.py: {label} {f}: no such file')
    have_ffmpeg = bool(shutil.which('ffmpeg'))
    root = os.path.abspath(a.project); out = os.path.join(root, a.out) if not os.path.isabs(a.out) else a.out
    os.makedirs(out, exist_ok=True)
    W, H = parse_size(a.size)
    if W % 2 or H % 2:
        print(f'note: {W}x{H} has an odd side; H.264 (yuv420p) needs even sides for a video')
    page, _, page_q = a.page.partition('?')
    hook, hk = a.hook, f'window[{json.dumps(a.hook)}]'
    upload_state = {'fp': None}
    port, upload_url = serve(root, upload_state)
    failed = False
    with sync_playwright() as p:
        args = ['--enable-gpu', '--ignore-gpu-blocklist'] + (['--use-angle=d3d11'] if os.name == 'nt' else [])
        try: b = p.chromium.launch(channel='chrome', headless=True, args=args)
        except Exception: b = p.chromium.launch(headless=True, args=args)
        logs, errors = [], []
        pg, cur = None, None
        for shot in (a.shots or ['overview']):
            name, query, js, kind = plan(shot)
            q = '&'.join(t for t in ('capture', f'size={W}x{H}', f'ss={a.ss}' if a.ss != '1' else '',
                                     f'safe={a.safe}' if a.safe else '', page_q, query) if t)
            if q != cur:
                if pg: pg.close()
                pg = b.new_page(viewport={'width': W, 'height': H})
                pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
                pg.on('pageerror', lambda e: errors.append(str(e)))
                pg.on('crash', lambda *_: errors.append('the page crashed'))
                pg.on('response', lambda r: errors.append(f'HTTP {r.status} loading {r.url}') if r.status >= 400 and r.request.resource_type in ('script', 'document') else None)
                pg.on('requestfailed', lambda req: errors.append(f'request failed ({req.failure}) loading {req.url}') if req.resource_type in ('script', 'document') else None)
                pg.goto(f'http://127.0.0.1:{port}/{page}?{q}')
                ready, e0 = False, len(errors)   # an error on an earlier page is reported at the end, not here
                deadline = time.monotonic() + 300.0
                while time.monotonic() < deadline and len(errors) == e0:
                    try:
                        pg.wait_for_function(f'{hk} && {hk}.ready', timeout=300)
                        ready = True
                        break
                    except Exception:
                        pass
                if len(errors) > e0 or not ready:
                    print('the page failed while loading:' if len(errors) > e0 else f'the page never became ready (no window.{hook}.ready after 300 s):')
                    for e in errors: print('  PAGE ERROR', e)
                    for l in logs[:30]: print('  ', l[:300])
                    raise SystemExit(1)
                cur = q
                s = pg.evaluate(f'{hk}.printStats ? {hk}.printStats(5) : null')
                f = pg.evaluate(f'{hk}.frame || null')
                fr = (f' | frame {f["w"]}x{f["h"]}, fovY {f["fovY"]:.1f}, mag {f.get("mag", 1):.2f}, print x{f.get("printScale", 1):.2f}' if f and 'fovY' in f else '')
                print(f'[{q}] build {pg.evaluate(f"{hk}.buildMs")} ms, pieces {pg.evaluate(f"{hk}.pieces")}'
                      + (f', {s["prints"]} prints {s["printMs"]} ms ({s["mpx"]} Mpx)' if s else '') + fr)
                if s:
                    for e in s['top']: print(f'    {e["ms"]:6d} ms  {e["prints"]:4d} x {e["each"]:6.1f} ms  {e["at"]}')
                # the hero's cards, standing and through his stride (references/mechanisms.md section 12)
                cl = pg.evaluate(f'{hk}.clips && {hk}.hasHero !== false ? {hk}.clips() : null')
                if cl:
                    print(f'  hero: {len(cl)} card pair(s) cut into each other')
                    for c in cl[:12]: print(f'    {c["a"]} / {c["b"]}: {c["kind"]} by {c["depth"]} ({c["at"]})')
                    failed = True
                elif cl is not None:
                    print('  hero: no card cuts into another, standing or walking')
            if kind == 'video':
                sec, fps, keys, start, way = js
                n = max(1, round(sec * fps))
                tmp_dir = tempfile.mkdtemp(prefix='papercraft_cap_')
                h264_path = os.path.join(tmp_dir, 'raw.h264')
                colour, wi, hero_end = None, 0, None
                try:
                    why = ('--png-frames' if a.png_frames else '--safe draws over the canvas' if a.safe else '--ss above 1' if a.ss != '1'
                           else 'an odd frame size' if (W % 2 or H % 2) else 'ffmpeg is not on PATH' if not have_ffmpeg else None)
                    if why is None:
                        try:
                            wc = capture_webcodecs(pg, hook, W, H, sec, fps, keys, start, way, h264_path, upload_state, upload_url)
                            if wc.get('ok') and os.path.getsize(h264_path) > 0:
                                colour = detect_colour(h264_path)
                                if colour and colour[2] <= 10.0:
                                    wi, hero_end = wc.get('wi', 0), wc.get('heroPos')
                                    print(f'{name}: {n} frames through WebCodecs ({wc["mode"]}) in {wc["elapsed"]:.2f} s ({n / max(0.001, wc["elapsed"]):.0f} fps); '
                                          f'the encoder wrote {"full" if colour[0] == "pc" else "limited"}-range {colour[1]} (patches off by {colour[2]:.1f})')
                                else:
                                    why, colour = 'the encoder\'s colours could not be verified' + (f' (patches off by {colour[2]:.0f} levels)' if colour else ''), None
                            else:
                                why = wc.get('reason', 'the encoder wrote nothing')
                        except SystemExit:
                            raise
                        except Exception as e:
                            why = 'the WebCodecs capture failed: ' + str(e).strip().splitlines()[0][:140]
                    if why is not None and not a.png_frames:
                        print(f'{name}: PNG frames instead of the WebCodecs stream ({why})')

                    if not colour:
                        fdir = os.path.join(out, name)
                        os.makedirs(fdir, exist_ok=True)
                        for old in os.listdir(fdir):
                            if re.fullmatch(r'f_\d{5}\.png', old): os.remove(os.path.join(fdir, old))
                        # restart and freeze the clock in ONE call (step(0) stops the page's live loop): left running
                        # between two calls it advances the world by a few real-time frames before the first step
                        pg.evaluate(f'() => {{ const P = {hk}; P.restart(); P.step(0); if ({start} > 0) P.step({start}); }}')
                        for k in keys: pg.evaluate('(k) => dispatchEvent(new KeyboardEvent("keydown", { code: k, key: k }))', k)
                        wi = 0
                        for i in range(n):
                            if way:
                                while wi < len(way):
                                    h = pg.evaluate(f'(() => {{ const h = {hk}.heroPos; return [h.x, h.z]; }})()')
                                    dx, dz = way[wi][0] - h[0], way[wi][1] - h[1]
                                    if dx * dx + dz * dz > 0.36: break
                                    wi += 1
                                pg.evaluate(f'() => {hk}.steer({dx}, {dz})' if wi < len(way) else f'() => {hk}.steer(null)')
                            pg.evaluate(f'() => {hk}.step({1 / fps}, {fps})')
                            pg.screenshot(path=os.path.join(fdir, f'f_{i:05d}.png'))
                        for k in keys: pg.evaluate('(k) => dispatchEvent(new KeyboardEvent("keyup", { code: k, key: k }))', k)
                        if way:
                            pg.evaluate(f'() => {hk}.steer(null)')
                            hero_end = pg.evaluate(f'(() => {{ const h = {hk}.heroPos; return [+h.x.toFixed(1), +h.z.toFixed(1)]; }})()')

                    if way:
                        print(f'{name}: waypoints reached {wi} of {len(way)}, hero at {hero_end}')
                        if wi < len(way): failed = True
                    if not have_ffmpeg:
                        print(f'{name}: {n} frames at {fps:g} fps in {os.path.join(a.out, name)} (ffmpeg is not on PATH: no MP4)')
                        continue

                    # the stems: the hook's (the paper sounds the harness logged, the scene's score) or the files given
                    paper_wav = prep_wav(a.paper_wav, os.path.join(tmp_dir, 'paper.wav'), start, sec) if a.paper_wav else None
                    music_wav = prep_wav(a.music_wav, os.path.join(tmp_dir, 'music.wav'), start, sec) if a.music_wav else None
                    if a.audio and (not paper_wav or not music_wav):
                        au_res = pg.evaluate(f'async ([dur, from]) => {hk}.renderAudio ? await {hk}.renderAudio(dur, {{ from }}) : null', [n / fps, start])
                        if au_res:
                            for key, stem in (('paperWavB64', 'paper'), ('musicWavB64', 'music')):
                                if (paper_wav if stem == 'paper' else music_wav) or not au_res.get(key): continue
                                raw = os.path.join(tmp_dir, f'{stem}_hook.wav')
                                with open(raw, 'wb') as wf:
                                    wf.write(base64.b64decode(au_res[key]))
                                done = prep_wav(raw, os.path.join(tmp_dir, f'{stem}.wav'), 0.0, sec)
                                if stem == 'paper': paper_wav = done
                                else: music_wav = done
                            if not paper_wav and not music_wav:
                                print('  audio: no paper sound was logged in this window and the scene has no music renderer: a silent video')
                        else:
                            print(f'  audio: window.{hook}.renderAudio is not available on this page (pass --paper-wav / --music-wav)')

                    mp4_target = os.path.join(out, name + '.mp4')
                    src = h264_path if colour else os.path.join(out, name)
                    written = encode_mp4(src, colour, fps, n, mp4_target, paper_wav=paper_wav, music_wav=music_wav,
                                         paper_ratio=a.paper_ratio, lufs=a.lufs, paper_gain=a.paper_gain, loop=a.loop)
                    if not written:
                        failed = True
                        continue
                    pr = probe_mp4(written)
                    if not (pr and pr['video']):
                        print(f'{name}: -> {written}  (ffprobe could not read it back)')
                        failed = True
                        continue
                    v, au = pr['video'], pr['audio']
                    au_str = f' + {au["codec_name"]} {au["sample_rate"]} Hz {au["channels"]} ch' if au else ' (silent)'
                    print(f'{name}: -> {written}  [{v["codec_name"]} {v["width"]}x{v["height"]} {v["pix_fmt"]} {pr["duration"]:.2f} s{au_str}, {pr["size"] / 1048576:.2f} MB]')
                    got = int(v.get('nb_frames') or 0)
                    if got != n:
                        print(f'  ERROR: the MP4 holds {got} frames, {n} were captured')
                        failed = True
                    if (paper_wav or music_wav) and not au:
                        print('  ERROR: the stems did not make it into the MP4')
                        failed = True
                    if a.verify_frames > 0:
                        vpaths = extract_verify_frames(written, os.path.join(out, f'{name}_verify'), a.verify_frames, pr['duration'])
                        print(f'  verify frames ({len(vpaths)}): ' + ', '.join(os.path.basename(vp) for vp in vpaths))
                finally:
                    shutil.rmtree(tmp_dir, ignore_errors=True)
                continue
            if kind == 'walk':
                r = pg.evaluate(f'(pts) => {{ const P = {hk}; P.restart(); P.step(3.2); const r = P.walkPath(pts); P.step(1 / 60); return r; }}', js)
                r.pop('heights', None); print(f'{name}: walk {json.dumps(r)}')
                if r.get('reached', 0) < r.get('of', 0): failed = True
            elif kind == 'hold':
                keys, sec = js
                pg.evaluate(f'() => {{ const P = {hk}; P.restart(); P.step(3.2); }}')
                for k in keys: pg.evaluate('(k) => dispatchEvent(new KeyboardEvent("keydown", { code: k, key: k }))', k)
                pg.evaluate(f'() => {hk}.step({sec})')
                for k in keys: pg.evaluate('(k) => dispatchEvent(new KeyboardEvent("keyup", { code: k, key: k }))', k)
                pos = pg.evaluate(f'(() => {{ const h = {hk}.heroPos; return [+h.x.toFixed(2), +h.y.toFixed(2), +h.z.toFixed(2)]; }})()')
                print(f'{name}: hero at {pos}')
            else:
                r = pg.evaluate(f'(() => {{ const P = {hk}; with (P) {{ {js} }} }})()')
                if kind == 'at': print(f'{name}: hero at ({shot.split("=")[1]}), y {r}' + ('  (outside the walk field: blocked there)' if r is None else ''))
            cards = pg.evaluate(f'{hk}.cards ? {hk}.cards() : null')
            pg.screenshot(path=os.path.join(out, f'{name}.png'))
            print(f'  -> {os.path.join(a.out, name + ".png")}' + (f'  ({cards} standing cards in frame)' if cards is not None else ''))
        b.close()
    noise = re.compile(r'X4000|willReadFrequently|favicon')
    shown = [l for l in logs if not noise.search(l)]
    for e in errors: print('PAGE ERROR', e)
    for l in shown[:40]: print(l[:400])
    if errors or failed: sys.exit(1)


if __name__ == '__main__':
    main()
