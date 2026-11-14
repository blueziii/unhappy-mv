#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把 ForcedAligner 的词级时间戳按 LRC 行合并，输出 src/data/words.json。

- 行边界用 LRC（人工校对过的，比较稳）
- 词内时间用对齐结果，做单调性 / 最小时长 / 行边界夹紧修正
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALIGNED = os.path.join(ROOT, "..", "tmp_audio", "aligned.json")
LYRICS = os.path.join(ROOT, "src", "data", "lyrics.json")
OUT = os.path.join(ROOT, "src", "data", "words.json")

MIN_TOKEN = 0.10  # 每个词最短显示时间（秒）


def main():
    lines = json.load(open(LYRICS, encoding="utf-8"))
    # 去掉开头的作词/作曲两条
    lines = [ln for ln in lines if not ln["text"].startswith("作")]
    units = json.load(open(ALIGNED, encoding="utf-8"))["units"]

    tokens_per_line = [[t for t in ln["text"].split(" ") if t] for ln in lines]
    total = sum(len(t) for t in tokens_per_line)
    assert total == len(units), f"词数不匹配 line={total} aligned={len(units)}"

    out, k = [], 0
    for idx, ln in enumerate(lines):
        toks = tokens_per_line[idx]
        start, end = ln["t"], ln["end"]
        words = []
        for t in toks:
            u = units[k]
            k += 1
            words.append({"w": t, "s": float(u["start"]), "e": float(u["end"])})
        # 修正：单调、不越界、最小时长
        for j, w in enumerate(words):
            lo = start if j == 0 else words[j - 1]["e"] + MIN_TOKEN * 0.5
            w["s"] = min(max(w["s"], lo), end)
            if w["e"] <= w["s"]:
                w["e"] = w["s"] + MIN_TOKEN
            w["e"] = min(w["e"], end + 0.4)
            if j + 1 < len(words):
                w["e"] = min(w["e"], words[j + 1]["s"])
            w["s"] = round(w["s"], 3)
            w["e"] = round(max(w["e"], w["s"] + 0.06), 3)
        words[0]["s"] = round(start, 3)
        out.append({"i": idx, "text": ln["text"], "start": round(start, 3),
                    "end": round(end, 3), "peak": ln["peak"], "words": words})
        print(f"{start:6.2f}-{end:6.2f}  {' '.join(w['w'] for w in words)}")

    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("->", OUT, len(out), "lines")


if __name__ == "__main__":
    main()
