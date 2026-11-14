#!/usr/bin/env bash
# 等帧序列渲完（5889 帧），再改名 + 编码成片。渲染跑完后无人值守也能出片。
set -u
cd "$(dirname "$0")/.." || exit 1

TOTAL=5889
echo "[$(date +%H:%M:%S)] watcher start"
while true; do
  n=$(ls out/seq 2>/dev/null | grep -c '\.jpeg$')
  if [ "$n" -ge "$TOTAL" ]; then
    echo "[$(date +%H:%M:%S)] frames complete: $n"
    break
  fi
  sleep 60
done

echo "[$(date +%H:%M:%S)] encoding..."
bash tools/encode.sh
echo "[$(date +%H:%M:%S)] encode done"
