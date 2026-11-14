#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""生成胶片颗粒 / 灰尘纹理贴图（Remotion 里平铺叠加用）。

输出到 public/tex/：grain_0..3.png（512×512 灰度噪声）、speck.png
"""
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "tex")
os.makedirs(OUT, exist_ok=True)

rng = np.random.default_rng(7)
S = 512
for i in range(4):
    # 多尺度噪声：细颗粒 + 少量粗颗粒，模拟胶片
    fine = rng.normal(0.5, 0.10, (S, S))
    coarse = rng.normal(0.5, 0.06, (S // 8, S // 8))
    coarse = np.array(Image.fromarray((np.clip(coarse, 0, 1) * 255).astype(np.uint8))
                      .resize((S, S), Image.BICUBIC), dtype=np.float32) / 255.0
    n = np.clip(fine * 0.55 + coarse * 0.45, 0, 1)
    img = Image.fromarray((n * 255).astype(np.uint8), mode="L").convert("RGB")
    img.save(os.path.join(OUT, f"grain_{i}.png"), optimize=True)
    print("grain", i, img.size)

# 灰尘 / 划痕用的稀疏噪点（大部分透明）
a = np.zeros((S, S, 4), dtype=np.uint8)
for _ in range(140):
    x, y = rng.integers(0, S, 2)
    r = rng.integers(1, 3)
    a[max(0, y - r):y + r, max(0, x - r):x + r] = [255, 255, 255, rng.integers(40, 120)]
Image.fromarray(a, mode="RGBA").save(os.path.join(OUT, "speck.png"), optimize=True)
print("speck ok")
