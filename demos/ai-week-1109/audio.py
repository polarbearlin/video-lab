#!/usr/bin/env python3
"""轻量纸页音：底噪 + 每条换场的一声纸响。不使用任何外部曲库。"""
import math
import random
import struct
import wave
from pathlib import Path

SR = 48000
DUR = 55.2
CUTS = [0.05, 3.4, 8.2, 12.8, 17.6, 22.6, 27.0, 31.8, 36.8, 41.6, 46.4, 51.0]
rng = random.Random(1109)
N = int(SR * DUR)
buf = [0.0] * N


def add(i, v):
    if 0 <= i < N:
        buf[i] += v


# 很低的房间底噪
for i in range(N):
    buf[i] += (rng.random() * 2 - 1) * 0.012

# 换场纸响
for t0 in CUTS:
    i0 = int(t0 * SR)
    length = int(0.16 * SR)
    for k in range(length):
        env = math.exp(-k / (0.028 * SR))
        noise = (rng.random() * 2 - 1)
        add(i0 + k, noise * env * 0.22)
        # 一点低频
        add(i0 + k, math.sin(2 * math.pi * 90 * k / SR) * env * 0.05)

# 片尾轻轻收一下
i0 = int(51.15 * SR)
for k in range(int(1.4 * SR)):
    env = math.exp(-k / (0.45 * SR))
    tone = math.sin(2 * math.pi * 220 * k / SR) * 0.5 + math.sin(2 * math.pi * 330 * k / SR) * 0.25
    add(i0 + k, tone * env * 0.04)

out = Path(__file__).resolve().parent / "out" / "audio.wav"
out.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(out), "w") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    frames = bytearray()
    for s in buf:
        v = max(-1.0, min(1.0, s))
        frames += struct.pack("<h", int(v * 32000))
    w.writeframes(frames)
print(out, f"{DUR:.1f}s")
