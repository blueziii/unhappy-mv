#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""分析 unhappy.mp3：按帧算能量 / 低频 / 频谱通量，挑节拍点，输出 JSON 供 Remotion 用。

用法（在项目根目录）：
    python tools/analyze.py
输出：src/data/audio.json  src/data/lyrics.json
"""
import json
import os
import re
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WAV = os.path.join(ROOT, "..", "tmp_audio", "an.wav")
FPS = 60
SR = 22050


def read_wav(path):
    with wave.open(path, "rb") as w:
        n = w.getnframes()
        raw = w.readframes(n)
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def frame_feats(x, fps=FPS, sr=SR):
    hop = int(round(sr / fps))
    win = 2048
    n_frames = int(np.floor((len(x) - win) / hop)) + 1
    idx = np.arange(win)[None, :] + hop * np.arange(n_frames)[:, None]
    frames = x[idx] * np.hanning(win)[None, :]
    spec = np.abs(np.fft.rfft(frames, axis=1))
    freqs = np.fft.rfftfreq(win, 1.0 / sr)

    def band(lo, hi):
        m = (freqs >= lo) & (freqs < hi)
        return spec[:, m].mean(axis=1)

    def rms(sig):
        return np.sqrt(np.mean(sig ** 2, axis=1))

    energy = rms(frames)
    low = band(30, 140)      # 底鼓 / bass
    mid = band(300, 2000)    # 人声主体
    high = band(4000, 9000)  # 气声 / 镲

    # 频谱通量（半波整流）
    flux = np.maximum(0.0, np.diff(spec, axis=0)).mean(axis=1)
    flux = np.concatenate([[0.0], flux])

    def norm(v, p=98):
        v = np.asarray(v, dtype=np.float64)
        s = np.percentile(v, p) or 1.0
        return np.clip(v / s, 0, 1.2)

    return {
        "n": n_frames,
        "energy": norm(energy),
        "low": norm(low),
        "mid": norm(mid),
        "high": norm(high),
        "flux": norm(flux, 96),
        "rawLow": low,
        "rawEnergy": energy,
    }


def pick_onsets(raw, fps=FPS, thresh_ratio=1.6, min_gap_s=0.18):
    """在低频包络上挑峰值当鼓点。"""
    # 平滑（~5 帧）
    k = np.ones(5) / 5
    s = np.convolve(raw, k, mode="same")
    d = np.diff(s, prepend=s[0])
    gap = int(min_gap_s * fps)
    peaks = []
    for i in range(1, len(d) - 1):
        if d[i] > 0 and d[i] >= d[i - 1] and d[i] > d[i + 1]:
            thr = np.percentile(d, 92) * thresh_ratio / 1.6
            if d[i] > thr:
                if not peaks or i - peaks[-1] >= gap:
                    peaks.append(i)
                elif d[i] > d[peaks[-1]]:
                    peaks[-1] = i
    return peaks


LRC_TIME = re.compile(r"^\[(\d+):(\d+)(?:[.:](\d+))?\]\s*(.*)$")


def parse_lrc(path):
    lines = []
    with open(path, "r", encoding="utf-8-sig") as f:
        for line in f:
            m = LRC_TIME.match(line.strip())
            if not m:
                continue
            mm, ss, frac, text = m.groups()
            t = int(mm) * 60 + int(ss) + (int(frac) / (10 ** len(frac)) if frac else 0)
            if text.strip():
                lines.append({"t": round(t, 3), "text": text.strip()})
    return lines


def main():
    x = read_wav(WAV)
    dur = len(x) / SR
    f = frame_feats(x)
    n = f["n"]
    onsets = pick_onsets(f["rawLow"])
    loud = np.percentile(f["rawEnergy"], 60)

    # 逐句取“这一句期间的能量峰值”，用来决定字幕节奏
    lyrics = parse_lrc(os.path.join(ROOT, "assets", "unhappy.lrc"))
    for i, ly in enumerate(lyrics):
        end = lyrics[i + 1]["t"] if i + 1 < len(lyrics) else dur
        a, b = int(ly["t"] * FPS), min(int(end * FPS), n)
        seg = f["rawEnergy"][a:b]
        ly["end"] = round(end, 3)
        ly["peak"] = round(float(np.max(seg) / loud), 3) if len(seg) else 1.0

    os.makedirs(os.path.join(ROOT, "src", "data"), exist_ok=True)
    out = {
        "duration": round(dur, 3),
        "fps": FPS,
        "frames": n,
        "energy": [round(float(v), 3) for v in f["energy"]],
        "low": [round(float(v), 3) for v in f["low"]],
        "mid": [round(float(v), 3) for v in f["mid"]],
        "high": [round(float(v), 3) for v in f["high"]],
        "flux": [round(float(v), 3) for v in f["flux"]],
        "onsets": [round(i / FPS, 3) for i in onsets],
    }
    with open(os.path.join(ROOT, "src", "data", "audio.json"), "w", encoding="utf-8") as fp:
        json.dump(out, fp, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(ROOT, "src", "data", "lyrics.json"), "w", encoding="utf-8") as fp:
        json.dump(lyrics, fp, ensure_ascii=False, indent=1)

    print("duration", round(dur, 3), "frames", n, "onsets", len(onsets))
    for ly in lyrics:
        print(f"{ly['t']:>7.2f} -> {ly['end']:>7.2f}  peak={ly['peak']:.2f}  {ly['text']}")


if __name__ == "__main__":
    main()
