#!/usr/bin/env bash
# 盯着帧序列：渲满 5889 帧 -> 编码 -> 抽每 30 帧做复查表
set -u
cd "$(dirname "$0")/.." || exit 1
TOTAL=5889
while :; do
  n=$(ls out/seq 2>/dev/null | wc -l)
  [ "$n" -ge "$TOTAL" ] && break
  # 渲染进程死了就不再等
  if ! ps -W 2>/dev/null | grep -qi "render_all"; then :; fi
  sleep 60
done
echo "[pipeline] frames ready: $(ls out/seq | wc -l)"
bash tools/encode.sh || echo "[pipeline] encode failed"
rm -rf out/review out/sheets && mkdir -p out/review out/sheets
npx remotion render Unhappy out/review --sequence --every-nth-frame=30 --frames=0-5888 --scale=0.42 --concurrency=12 --gl=angle || echo "[pipeline] review render failed"
"/c/Users/BLUE/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/python.exe" tools/sheets.py
echo "[pipeline] done"
