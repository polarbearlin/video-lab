"""Render the film's two code-made stems at 48 kHz: the paper sounds the harness logs while the film plays (pop-ups,
flaps, steps) and the score (piano bed + wind, score60.js). Steps the page at the video's 30 fps so the paper events
land on the same frames as the capture.

    python3 first-snow/stems.py OUTDIR      -> OUTDIR/paper.wav, OUTDIR/music.wav
"""
import base64, functools, http.server, os, sys, threading

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DUR, FPS, SR = 60.0, 30, 48000


def main(out):
    os.makedirs(out, exist_ok=True)
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    handler = functools.partial(Quiet, directory=ROOT)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    with sync_playwright() as p:
        b = p.chromium.launch(channel='chrome', headless=True, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = b.new_page()
        pg.on('console', lambda m: print('page:', m.text) if m.type == 'error' else None)
        pg.goto(f'http://127.0.0.1:{srv.server_address[1]}/first-snow-60.html?capture&size=480x270')
        pg.wait_for_function('window.__papercraft && window.__papercraft.ready', timeout=180000)
        pg.evaluate('() => { const P = window.__papercraft; P.restart(); P.step(0); }')
        for _ in range(int(DUR)):
            pg.evaluate(f'() => window.__papercraft.step(1, {FPS})')
        res = pg.evaluate(f'async () => {{ const r = await window.__papercraft.renderAudio({DUR}, {{ sampleRate: {SR} }}); return r; }}')
        print(f'paper events: {res["flapCount"]}')
        for key, name in (('paperWavB64', 'paper'), ('musicWavB64', 'music')):
            if not res.get(key):
                sys.exit(f'no {name} stem')
            with open(os.path.join(out, f'{name}.wav'), 'wb') as f:
                f.write(base64.b64decode(res[key]))
        b.close()


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'out', 'first-snow'))
