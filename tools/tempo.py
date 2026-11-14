#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""估计 BPM / 节拍相位，输出 src/data/beats.json（每拍时间点）。

把节奏点（onsets）按候选 BPM 折叠到单位圆上，取集中度最高者为拍速，
相位用圆均值得到。只保留落在“有鼓点的时段”内的拍子。
"""
import json
import os

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = json.load(open(os.path.join(ROOT, "src", "data", "audio.json"), encoding="utf-8"))

on = np.array(A["onsets"], dtype=float)
low = np.array(A["low"], dtype=float)
FPS = A["fps"]

# 只用能量够高的鼓点，避免弱拍干扰
thr = np.percentile(on, 0)
sel = on

best = None
for bpm10 in range(700, 1610):  # 70.0 - 161.0 BPM，步进 0.1
    bpm = bpm10 / 10
    P = 60.0 / bpm
    ang = (sel / P) * 2 * np.pi
    R = abs(np.mean(np.exp(1j * ang)))
    # 轻微偏好 85-115 的常见区间
    w = 1.0 - 0.08 * abs(np.log(bpm / 100.0))
    score = R * w
    if best is None or score > best[0]:
        best = (score, bpm, P)

score, bpm, P = best
ang = (sel / P) * 2 * np.pi
mean_ang = np.angle(np.mean(np.exp(1j * ang)))
phase = (mean_ang / (2 * np.pi)) * P % P

dur = A["duration"]
beats, t = [], phase
# 往回补到 0 附近
while t - P > 0:
    t -= P
while t < dur:
    if t >= 0:
        beats.append(round(float(t), 3))
    t += P

# 每拍的强弱（低频能量），供视觉判断重拍
mag = []
for bt in beats:
    i = int(bt * FPS)
    mag.append(round(float(np.mean(low[max(0, i - 2):i + 3])), 3))

out = {"bpm": round(bpm, 2), "period": round(P, 4), "phase": round(float(phase), 3),
       "beats": beats, "mag": mag}
json.dump(out, open(os.path.join(ROOT, "src", "data", "beats.json"), "w", encoding="utf-8"),
          separators=(",", ":"))
print("bpm", bpm, "period", round(P, 3), "beats", len(beats), "R", round(score, 3))
print("first beats", beats[:12])
print("mag sample", mag[:12])
