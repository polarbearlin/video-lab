"""李白 · 40 s ink-wash film — soundtrack (D 宫 pentatonic, 80 bpm).
Scene cues (s): 0 开场 · 5 出蜀 · 12 黄河 · 19 长安 · 24 赐金放还 · 26 流放 · 28.5 轻舟 · 33 捉月 · 37.2 终"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'lib', 'audio'))
import mgaudio as mg
from mgaudio import sfx, drums as D, synth as S, pluck as P, wind as W

DUR = 40.0
BEAT = 0.75            # 80 bpm
m = mg.Mix(duration=DUR, bpm=80)

# pentatonic pool, D gong: D E F# A B
N = dict(A3=57, B3=59, D4=62, E4=64, Fs4=66, A4=69, B4=71, D5=74, E5=76, Fs5=78, A5=81, B5=83, D6=86, E6=88)
CH = {'D': ['D3', 'A3', 'D4', 'F#4', 'A4'], 'Bm': ['B2', 'F#3', 'B3', 'D4', 'F#4'],
      'G': ['G2', 'D3', 'G3', 'B3', 'D4'], 'A': ['A2', 'E3', 'A3', 'C#4', 'E4'],
      'Em': ['E2', 'B2', 'E3', 'G3', 'B3'], 'Bdark': ['B1', 'F#2', 'B2', 'D3', 'F#3']}

# ---------------- strings bed: chord per segment
pad = m.track('pad', level=-25, sends={'hall': -7})
segs = [(0, 5, 'D'), (5, 6.5, 'D'), (6.5, 8, 'Bm'), (8, 9.5, 'G'), (9.5, 12, 'A'),
        (12, 13.5, 'D'), (13.5, 15, 'Bm'), (15, 16.5, 'G'), (16.5, 19, 'A'),
        (19, 20.5, 'G'), (20.5, 22, 'A'), (22, 24, 'D'), (24, 26, 'Em'),
        (26, 28.5, 'Bdark'), (28.5, 30, 'D'), (30, 31.5, 'A'), (31.5, 33, 'Bm'),
        (33, 35, 'G'), (35, 37.2, 'A'), (37.2, 40, 'D')]
for a, b, c in segs:
    pad.add(S.pad(CH[c], b - a + 0.6, 0.6, 'strings', attack=0.5, release=1.4), a)
pad.automate('lpf', [(0, 1500), (5, 2600), (12, 7000), (19, 9000), (24, 3000), (26, 1200), (28.5, 6000),
                     (33, 2200), (37.2, 5000), (40, 3000)])

gz = m.track('guzheng', level=-22, sends={'hall': -9, 'room': -15}, pan=-0.12)
gl = m.track('gliss', level=-21, sends={'hall': -7}, pan=-0.15)
dz = m.track('dizi', level=-22.5, sends={'hall': -6}, pan=0.12)
pp = m.track('pipa', level=-23, sends={'hall': -10}, pan=0.2)
dr = m.track('drums', level=-20, sends={'hall': -12})
gong = m.track('gong', level=-23, sends={'hall': -6})


def pent_arp(t0, t1, chord_tones, step=0.375, vel=0.55, cell=(0, 2, 1, 3, 2, 1)):
    i, t = 0, t0
    while t < t1 - 1e-6:
        n = chord_tones[cell[i % len(cell)] % len(chord_tones)]
        gz.add(P.guzheng(n, 1.0, vel * (1.0 if i % 4 == 0 else 0.8)), t)
        t += step; i += 1


# ---------------- 0–5 开场
gong.add(D.gong('chinese', 0.55), 0.3)
gl.add(P.guzheng_gliss('D4', 'D6', dur=0.6, key='D', mode='gong', vel=0.7, ring=2.4), 0.9)   # sync = last string
gz.add(P.guzheng(N['D5'], 2.0, 0.8, orn='rou'), 1.0)
gz.add(P.guzheng(N['A5'], 2.0, 0.75, orn='rou'), 1.6)
m.sfx(sfx.stamp('seal'), 2.6, gain=1)
dz.add(W.wind_line([(0, 0.7, 'A4', 0.6, 'grace'), (0.75, 0.6, 'B4', 0.65), (1.4, 1.6, 'D5', 0.7, 'slide')],
                   kind='xiao', seed=1), 2.9)

# ---------------- 5–12 出蜀 (gentle, guzheng arps + dizi)
for a, b, c in [(5, 6.5, [N['D4'], N['A4'], N['D5'], N['Fs5']]), (6.5, 8, [N['B3'], N['Fs4'], N['B4'], N['D5']]),
                (8, 9.5, [N['D4'], N['B4'], N['D5'], N['E5']]), (9.5, 12, [N['E4'], N['A4'], N['E5'], N['A5']])]:
    pent_arp(a, b, c, vel=0.5)
dz.add(W.wind_line([(0, 0.7, 'A5', 0.7, 'grace'), (0.75, 0.35, 'B5', 0.65), (1.1, 0.4, 'A5', 0.6),
                    (1.5, 1.4, 'F#5', 0.7, 'trill'), (3.0, 0.7, 'E5', 0.6), (3.75, 0.35, 'F#5', 0.6),
                    (4.1, 0.4, 'A5', 0.65), (4.5, 1.9, 'E5', 0.7, 'slide')], kind='dizi', seed=2), 5.3)
m.sfx(sfx.whoosh(1.0, 'soft', direction=0), 5.0, gain=-6)

# ---------------- 12–19 黄河 (drums, pipa, ostinato)
gong.add(D.gong('chinese', 0.95), 12.0)
m.sfx(sfx.boom(2.5, 44), 12.0, gain=-2)
m.sfx(sfx.whoosh(1.2, 'heavy', direction=-1), 11.9, gain=-3)
for k in range(9):                       # 君不见黄河之水天上来 — one hit per char from 12.6
    t = 12.6 + k * 0.24
    dr.add(D.taiko('tanggu', 0.55 + 0.04 * k), t)
t = 12.0
while t < 18.9:
    bt = round((t - 12.0) / BEAT)
    dr.add(D.taiko('taiko' if bt % 4 == 0 else 'dagu', 1.0 if bt % 4 == 0 else 0.7), t)
    if bt % 2 == 1:
        dr.add(D.taiko('rim', 0.5), t + BEAT / 2)
    t += BEAT
for a, b, c in [(12, 13.5, [N['D5'], N['A5'], N['Fs5'], N['D6']]), (13.5, 15, [N['B4'], N['Fs5'], N['D5'], N['B5']]),
                (15, 16.5, [N['D5'], N['B5'], N['E5'], N['D6']]), (16.5, 19, [N['E5'], N['A5'], N['E5'], N['B5']])]:
    pent_arp(a, b, c, step=0.1875, vel=0.42, cell=(0, 1, 2, 1, 3, 1, 2, 1))
for t0, du, n in [(15.0, 0.75, 'A4'), (15.75, 0.75, 'B4'), (16.5, 1.5, 'D5'), (18.0, 0.9, 'E5')]:
    pp.add(P.pipa(n, du, 0.75, tremolo=True), t0)
m.sfx(sfx.reverse_cymbal(1.6), 19.0, gain=-3)

# ---------------- 19–26 长安 (grand, then 赐金放还)
gong.add(D.gong('small', 0.7), 19.0)
t = 19.0
while t < 23.9:
    bt = round((t - 19.0) / BEAT)
    if bt % 2 == 0:
        dr.add(D.taiko('dagu', 0.65), t)
    dr.add(D.woodblock('bangzi', 0.35), t + BEAT / 2)
    t += BEAT
dz.add(W.wind_line([(0, 0.5, 'D6', 0.75, 'grace'), (0.5, 0.5, 'B5', 0.7), (1.0, 1.0, 'A5', 0.75, 'trill'),
                    (2.0, 0.5, 'B5', 0.7), (2.5, 0.5, 'D6', 0.75), (3.0, 1.8, 'E6', 0.8, 'slide')],
                   kind='dizi', seed=3), 19.2)
for a, b, c in [(19, 20.5, [N['D4'], N['B4'], N['D5'], N['E5']]), (20.5, 22, [N['E4'], N['A4'], N['E5'], N['A5']]),
                (22, 24, [N['D4'], N['A4'], N['D5'], N['Fs5']])]:
    pent_arp(a, b, c, step=0.375, vel=0.5)
m.sfx(sfx.stamp('seal'), 24.0, gain=2)
gong.add(D.gong('chinese', 0.6, tune=-3), 24.0)
gz.add(P.guzheng(N['E4'], 2.0, 0.7, orn='slide_down'), 24.4)
gz.add(P.guzheng(N['B3'], 2.0, 0.6, orn='rou'), 25.1)

# ---------------- 26–33 流放 → 遇赦 · 轻舟
m.sfx(sfx.boom(2.5, 40), 26.0, gain=0)
for i in range(14):                      # 急急风-style low roll, accelerating into 28.5
    t = 26.3 + 2.2 * (1 - (1 - i / 14) ** 1.6)
    dr.add(D.taiko('dagu', 0.35 + 0.035 * i), t)
m.sfx(sfx.riser(1.8, 'noise'), 28.5, gain=-4)
gl.add(P.guzheng_gliss('D4', 'D6', dur=0.5, key='D', mode='gong', vel=0.8, ring=1.8), 28.5)
gong.add(D.gong('small', 0.8), 28.5)
m.sfx(sfx.whoosh(0.9, 'air', direction=1), 29.4, gain=-2)
m.sfx(sfx.whoosh(0.9, 'air', direction=-1, seed=3), 30.6, gain=-3)
m.sfx(sfx.whoosh(0.9, 'air', direction=1, seed=5), 31.8, gain=-3)
for a, b, c in [(28.6, 30, [N['D5'], N['A5'], N['Fs5'], N['D6']]), (30, 31.5, [N['E5'], N['A5'], N['B5'], N['E6']]),
                (31.5, 32.8, [N['B4'], N['Fs5'], N['D5'], N['B5']])]:
    pent_arp(a, b, c, step=0.1875, vel=0.45, cell=(0, 1, 2, 3, 2, 1))
t = 28.5
while t < 32.7:
    bt = round((t - 28.5) / (BEAT / 2))
    dr.add(D.taiko('tanggu' if bt % 2 else 'dagu', 0.55 if bt % 2 else 0.8), t)
    t += BEAT / 2
dz.add(W.wind_line([(0, 0.4, 'A5', 0.75, 'grace'), (0.4, 0.4, 'B5', 0.7), (0.8, 0.8, 'D6', 0.8, 'trill'),
                    (1.7, 0.4, 'B5', 0.7), (2.1, 0.4, 'A5', 0.7), (2.5, 1.5, 'F#5', 0.75, 'slide')],
                   kind='dizi', seed=4), 29.0)

# ---------------- 33–40 捉月 · 终
gl.add(P.guzheng_gliss('A4', 'A5', dur=0.6, key='D', mode='gong', vel=0.55, up=False, ring=2.5), 33.0)
dz.add(W.wind_line([(0, 1.2, 'F#4', 0.6, 'grace'), (1.3, 0.6, 'A4', 0.6), (2.0, 1.6, 'B4', 0.65, 'slide'),
                    (3.7, 0.5, 'A4', 0.55)], kind='xiao', seed=5), 33.3)
for t0, n in [(34.0, 'A5'), (35.5, 'F#5'), (36.25, 'E5')]:
    gz.add(P.guzheng(n, 1.5, 0.45, orn='rou'), t0)
m.sfx(sfx.reverse_cymbal(1.4), 37.2, gain=-4)
gong.add(D.gong('chinese', 0.9), 37.2)
dr.add(D.taiko('taiko', 1.0), 37.2)
gz.add(P.guzheng(N['D4'], 3.0, 0.8, orn='rou'), 37.2)
gl.add(P.guzheng_gliss('D4', 'D6', dur=0.7, key='D', mode='gong', vel=0.6, up=False, ring=2.6), 38.0)
m.sfx(sfx.stamp('seal'), 38.3, gain=1)

os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
res = m.export(os.path.join(HERE, 'out', 'audio.wav'), lufs=-14, tp=-1)
print(res.get('warnings'))
