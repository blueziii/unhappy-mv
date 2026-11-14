"""把 out/review 里的抽帧拼成接触表，方便快速过一遍。

用法：python tools/sheets.py [每个表多少帧，默认 20]
文件名 element-000.jpeg 对应第 0 张，真实帧号 = 序号 × 30（--every-nth-frame=30）。
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "out", "review")
DST = os.path.join(ROOT, "out", "sheets")
COLS, CELL_W = 6, 460
STEP = 30

os.makedirs(DST, exist_ok=True)
files = sorted(f for f in os.listdir(SRC) if f.endswith(".jpeg"))
if not files:
    sys.exit("out/review 是空的")

per = int(sys.argv[1]) if len(sys.argv) > 1 else 20
font = ImageFont.truetype("arial.ttf", 18)
rows = (per + COLS - 1) // COLS

for s in range(0, len(files), per):
    batch = files[s : s + per]
    im0 = Image.open(os.path.join(SRC, batch[0]))
    ratio = CELL_W / im0.width
    CELL_H = int(im0.height * ratio)
    sheet = Image.new("RGB", (COLS * CELL_W, rows * CELL_H), (18, 18, 22))
    d = ImageDraw.Draw(sheet)
    for i, name in enumerate(batch):
        idx = int(name.split("-")[1].split(".")[0])
        im = Image.open(os.path.join(SRC, name)).convert("RGB").resize((CELL_W, CELL_H))
        x, y = (i % COLS) * CELL_W, (i // COLS) * CELL_H
        sheet.paste(im, (x, y))
        frame = idx * STEP
        d.rectangle([x, y, x + 132, y + 26], fill=(0, 0, 0))
        d.text((x + 6, y + 4), f"{frame / 60:5.1f}s f{frame}", fill=(255, 255, 255), font=font)
    out = os.path.join(DST, f"sheet_{s // per + 1:02d}.png")
    sheet.save(out)
    print(out, len(batch))
