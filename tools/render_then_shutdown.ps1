# 等 4K 渲染跑完 -> 编码成片 -> 校验 -> 关机
# powershell -NoProfile -ExecutionPolicy Bypass -File tools\render_then_shutdown.ps1 [-RenderPid 10332]
param([int]$RenderPid = 0)
$ErrorActionPreference = 'Continue'
$dsh = 'C:\Users\BLUE\Desktop\agent\unhappy-mv'
Set-Location $dsh
$LOG = "$dsh\out\pipeline.log"
$BASH = 'C:\Users\BLUE\.dsh\profiles\desktop\node_modules\@dsh-ops\bash-win32-x64\usr\bin\bash.exe'
$TOTAL = 5889

function Log($msg) { Add-Content $LOG "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] $msg" }
function Count-Frames { (Get-ChildItem 'out/seq' -Filter 'element-*.jpeg' -ErrorAction SilentlyContinue).Count }

Log "pipeline start (RenderPid=$RenderPid)"

# 1) 等帧数到齐（同时检测停滞：10 分钟没有新帧就续渲）
$last = -1; $lastChange = Get-Date; $resume = 0
while ($true) {
  $have = Count-Frames
  if ($have -ge $TOTAL) { Log "frames complete: $have"; break }
  if ($have -ne $last) { $last = $have; $lastChange = Get-Date }
  elseif (((Get-Date) - $lastChange).TotalMinutes -ge 10) {
    if ($resume -ge 4) { Log "ERROR: stalled at $have after $resume resumes"; exit 1 }
    $resume++
    Log "stalled at $have, resume #$resume from $have"
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'tools\render_all.ps1' $have *>> $LOG
    $lastChange = Get-Date
    continue
  }
  Start-Sleep -Seconds 60
}

# 2) 等渲染进程真正退出（它可能还在收尾）
if ($RenderPid -gt 0) {
  for ($i = 0; $i -lt 20; $i++) {
    if (-not (Get-Process -Id $RenderPid -ErrorAction SilentlyContinue)) { break }
    Start-Sleep -Seconds 15
  }
}
Log "render finished, encoding"

# 3) 编码（libx264 slow crf15 为主路径）
& $BASH 'tools/encode.sh' *>> $LOG
$mp4 = "$dsh\out\unhappy-mv.mp4"
if (Test-Path $mp4) {
  $mb = [math]::Round((Get-Item $mp4).Length / 1MB, 1)
  $dur = & 'C:\Program Files (x86)\ffmpeg\bin\ffprobe.exe' -v error -show_entries format=duration -of default=nw=1:nk=1 $mp4 2>$null
  Log "encoded: ${mb}MB duration=$dur"
  Log "shutting down in 120s"
  & shutdown.exe /s /t 120 /c "unhappy MV render+encode finished, shutting down"
} else {
  Log "ERROR: mp4 missing, skip shutdown"
}
