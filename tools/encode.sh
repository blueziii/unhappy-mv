#!/usr/bin/env bash
# 帧序列 -> 成片：先把分段渲染出来的文件名统一成 4 位补零，再用系统 ffmpeg 编码混音。
# （Remotion 自带的 ffmpeg 在这台机器上会 write EOF 崩，所以走系统 ffmpeg）
set -eu
cd "$(dirname "$0")/.." || exit 1

"/c/Users/BLUE/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/python.exe" - <<'PY'
import glob, os, re
fs = glob.glob('out/seq/*.jpeg')
pat = re.compile(r'element-(\d+)\.jpeg$')
for f in fs:
    m = pat.search(f)
    if not m:
        continue
    n = int(m.group(1))
    want = f'out/seq/element-{n:04d}.jpeg'
    if f.replace('\\', '/') != want:
        os.replace(f, want)
nums = sorted(int(pat.search(f).group(1)) for f in glob.glob('out/seq/*.jpeg'))
print('frames:', len(nums), 'range:', nums[0], '-', nums[-1])
missing = [i for i in range(nums[0], nums[-1] + 1) if i not in set(nums)]
print('missing:', len(missing), missing[:10])
PY

FFMPEG="/c/Program Files (x86)/ffmpeg/bin/ffmpeg.exe"

# 主路径：libx264 slow crf15（最高画质）；NVENC 作为兜底
"$FFMPEG" -y \
  -framerate 60 -start_number 0 -i out/seq/element-%04d.jpeg \
  -i src/assets/song.mp3 \
  -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 15 -tune film \
  -pix_fmt yuv420p -profile:v high -level 5.2 \
  -c:a aac -b:a 320k -shortest -movflags +faststart \
  out/unhappy-mv.mp4 || {
    echo "libx264 失败，回退 NVENC"
    "$FFMPEG" -y \
      -framerate 60 -start_number 0 -i out/seq/element-%04d.jpeg \
      -i src/assets/song.mp3 \
      -map 0:v -map 1:a \
      -c:v h264_nvenc -preset p6 -rc vbr -cq 21 -b:v 0 -multipass disabled -pix_fmt yuv420p -profile:v high -level 5.2 \
      -c:a aac -b:a 320k -shortest -movflags +faststart \
      out/unhappy-mv.mp4
  }

ls -lh out/unhappy-mv.mp4
