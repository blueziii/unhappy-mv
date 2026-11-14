#!/usr/bin/env bash
# 分段渲染全片帧序列：每段 500 帧，失败重试一次。
# 分段是为了避免一次跑 4 小时中途挂掉全部作废（并发 >12 会崩）。
set -u
cd "$(dirname "$0")/.." || exit 1

TOTAL=5889
CHUNK=500
CONC=11
OUT=out/seq
mkdir -p "$OUT"

start=${1:-0}
while [ "$start" -lt "$TOTAL" ]; do
  end=$((start + CHUNK - 1))
  if [ "$end" -ge "$TOTAL" ]; then end=$((TOTAL - 1)); fi
  echo "[$(date +%H:%M:%S)] chunk $start-$end"
  for try in 1 2 3; do
    npx remotion render Unhappy "$OUT" --sequence --frames="$start-$end" \
      --concurrency="$CONC" --jpeg-quality=92 --gl=angle >>out/render.log 2>&1
    # 该段帧数是否齐全
    have=$(ls "$OUT" | awk -F'[-.]' '{print $2+0}' | awk -v a="$start" -v b="$end" '$1>=a && $1<=b' | wc -l)
    want=$((end - start + 1))
    if [ "$have" -ge "$want" ]; then
      echo "[$(date +%H:%M:%S)] chunk $start-$end ok ($have/$want)"
      break
    fi
    echo "[$(date +%H:%M:%S)] chunk $start-$end retry $try ($have/$want)"
  done
  start=$((end + 1))
done
echo "[$(date +%H:%M:%S)] ALL DONE"
