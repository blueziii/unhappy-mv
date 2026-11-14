#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""按句切片做强制对齐：每一句只在自己的音频窗口里对齐，
比整首一次对齐更贴字（整首对齐容易在长句/拖腔处漂）。

用法（在项目根）：
  ../qwen-tts/.venv/Scripts/python.exe tools/align_lines.py
输出：src/data/words2.json
"""
import json
import os
import subprocess
import sys
import tempfile

import torch

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
QWEN = os.path.join(os.path.dirname(ROOT), "qwen-tts")
sys.path.insert(0, QWEN)

from qwen_asr import Qwen3ForcedAligner  # noqa: E402

AUDIO = os.path.join(ROOT, "src", "assets", "song.mp3")
ALIGNER_DIR = os.path.join(QWEN, "models", "Qwen3-ForcedAligner-0.6B")
LINES = json.load(open(os.path.join(ROOT, "src", "data", "words.json"), encoding="utf-8"))
FFMPEG = r"C:\Program Files (x86)\ffmpeg\bin\ffmpeg.exe"

PAD_L = 0.30
PAD_R = 0.12

model = Qwen3ForcedAligner.from_pretrained(
    ALIGNER_DIR, dtype=torch.bfloat16, device_map="cuda:0"
)
print("[load] ok", flush=True)

tmp = tempfile.mkdtemp(prefix="alignlines_")
out = []
for ln in LINES:
    i = ln["i"]
    text = ln["text"]
    a = max(0.0, ln["start"] - PAD_L)
    # 右边界收紧：宁可略短，也不要把下一句的开头吃进来（line21 的 LRC 句尾是假的）
    b = min(ln["end"] + PAD_R, ln["start"] + 0.42 * len(ln["words"]) + 0.7)
    wav = os.path.join(tmp, f"l{i}.wav")
    subprocess.run(
        [FFMPEG, "-y", "-loglevel", "error", "-ss", f"{a:.3f}", "-to", f"{b:.3f}",
         "-i", AUDIO, "-ac", "1", "-ar", "16000", wav],
        check=True,
    )
    try:
        res = model.align(audio=wav, text=text, language="English")
        items = res[0]
    except Exception as e:  # 对齐失败就退回原来的时间
        print(f"[warn] line {i} 对齐失败: {e}", flush=True)
        out.append(ln)
        continue
    toks = [(it.text, float(it.start_time), float(it.end_time)) for it in items]
    words = [{"w": w, "s": s + a, "e": e + a} for w, s, e in toks]
    # 词数必须对得上，否则可能是对齐器把标点算成单元
    if len(words) != len(ln["words"]):
        print(f"[warn] line {i} 词数不符 {len(words)} != {len(ln['words'])}，保留原时间", flush=True)
        out.append(ln)
        continue
    # 单调化 + 最小时长
    for k in range(len(words)):
        words[k]["s"] = max(words[k]["s"], words[k - 1]["e"] + 0.01 if k else a)
        words[k]["e"] = max(words[k]["e"], words[k]["s"] + 0.06)
    # 保留原来的 w 字段（对齐器可能把小写/大写改了）
    for k, w in enumerate(words):
        w["w"] = ln["words"][k]["w"]
    new = dict(ln)
    new["words"] = words
    new["start"] = words[0]["s"]
    new["end"] = max(ln["end"], words[-1]["e"])
    drift = max(abs(words[k]["s"] - ln["words"][k]["s"]) for k in range(len(words)))
    print(f"[line {i:2d}] words={len(words)} maxdrift={drift:.3f}s  {text[:38]}", flush=True)
    out.append(new)

dst = os.path.join(ROOT, "src", "data", "words2.json")
json.dump(out, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"[json] {dst}", flush=True)
