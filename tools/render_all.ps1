$ErrorActionPreference = 'Continue'
$dsh = 'C:\Users\BLUE\Desktop\agent\unhappy-mv'
Set-Location $dsh
$TOTAL = 5889
$CHUNK = 500
$CONC = 11
$OUT = 'out/seq'
$NPX = 'C:\Program Files\nodejs\npx.cmd'
New-Item -ItemType Directory -Force -Path $OUT | Out-Null

$start = 0
if ($args.Count -ge 1) { $start = [int]$args[0] }

while ($start -lt $TOTAL) {
  $end = [Math]::Min($start + $CHUNK - 1, $TOTAL - 1)
  $ok = $false
  $have = 0
  for ($try = 1; $try -le 3 -and -not $ok; $try++) {
    Add-Content 'out/render.log' "[$((Get-Date).ToString('HH:mm:ss'))] chunk $start-$end try $try"
    & $NPX remotion render Unhappy $OUT --sequence --frames="$start-$end" --concurrency=$CONC --jpeg-quality=92 --gl=angle *>> 'out/render.log'
    $have = (Get-ChildItem $OUT -Filter 'element-*.jpeg' | Where-Object {
        $m = [regex]::Match($_.Name, '(\d+)')
        if ($m.Success) { $n = [int]$m.Groups[1].Value; $n -ge $start -and $n -le $end } else { $false }
      }).Count
    if ($have -ge ($end - $start + 1)) { $ok = $true }
  }
  Add-Content 'out/render.log' "[$((Get-Date).ToString('HH:mm:ss'))] chunk $start-$end finished have=$have want=$($end-$start+1) ok=$ok"
  $start = $end + 1
}
Add-Content 'out/render.log' "[$((Get-Date).ToString('HH:mm:ss'))] ALL DONE"
