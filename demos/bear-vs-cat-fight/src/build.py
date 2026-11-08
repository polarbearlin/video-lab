"""逐帧渲染 -> ffmpeg 管道 -> 音频响度归一 -> MP4。用法：python3 build.py [输出路径]"""
import subprocess, sys, time, json, re
import numpy as np
from PIL import Image

sys.path.insert(0, '/home/user/fighting/src')
import scene
from gfx import upscale
import audio

OUT = sys.argv[1] if len(sys.argv) > 1 else '/home/user/fighting/out/bear_vs_cat_30s.mp4'
FPS, DUR = 30, 30
N = FPS * DUR
RAW = '/home/user/fighting/out/mix_raw.wav'
NORM = '/home/user/fighting/out/mix_norm.wav'
STILLS = [1.0, 2.9, 4.6, 6.9, 8.6, 11.9, 13.6, 15.6, 16.5, 18.3, 19.8, 22.3, 23.5, 26.8, 28.4, 29.6]

# 1) 音频：生成 + 响度归一（-14 LUFS，真峰值 -1.5 dB）
pcm_wav = audio.build()
import wave
w = wave.open(RAW, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(audio.SR)
w.writeframes((np.clip(pcm_wav, -1, 1) * 32767).astype('<i2').tobytes()); w.close()
m = subprocess.run(['ffmpeg', '-hide_banner', '-i', RAW, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                   capture_output=True, text=True).stderr
j = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', m, re.S).group(0))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', RAW, '-af',
                f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true",
                '-ar', str(audio.SR), NORM], check=True)
print('音频归一：输入 %s LUFS' % j['input_i'])

# 2) 视频：逐帧渲染，直接写进 ffmpeg
ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y',
                       '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '1920x1080', '-r', str(FPS), '-i', '-',
                       '-i', NORM, '-map', '0:v', '-map', '1:a',
                       '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
                       '-c:a', 'aac', '-b:a', '192k', '-shortest', OUT], stdin=subprocess.PIPE)
t0 = time.time()
for n in range(N):
    t = n / FPS
    img = scene.render_frame(t)
    ff.stdin.write(upscale(img).tobytes())
    if n % 150 == 0:
        print('frame', n, round(time.time() - t0, 1), 's', flush=True)
    if any(abs(t - s) < 1e-6 for s in STILLS):
        Image.fromarray(img).resize((960, 540), Image.NEAREST).save('/home/user/fighting/stills/t_%05.2f.png' % t)
ff.stdin.close(); ff.wait()
print('done', OUT, round(time.time() - t0, 1), 's')
