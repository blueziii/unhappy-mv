# unhappy — s0rrow 动画 MV

用 Remotion 做的 4K60 动画 MV：糖果色的欢快外壳，底下慢慢渗出悲伤（雨、垮掉的笑脸、褪成灰的尾奏）。

- 成片：`out/unhappy-mv.mp4` — 3840×2160 / 60fps / 98.1s / H.264 + AAC 320k
- 封面：`cover/`（4:3 2880×2160 与 16:9 3840×2160，各含 PNG + JPG）
- 同款复刻：**[STYLE-PROMPT.md](STYLE-PROMPT.md)** —— 提示词包 + 本片完整参数（配色/时间轴/元素/夜戏配方/踩坑清单）
- 工程：Remotion 4.0.543 + React 19

## 目录

```
src/
  index.ts            入口（先加载 fonts.css）
  Root.tsx            合成注册：Unhappy 3840×2160 / 60fps / 5889 帧
  Video.tsx           时间轴总控：段落配色、镜头、3D 视差分层、各处进出场
  theme.ts            调色板 C、字体 F、缓动与混色工具
  fonts.css / fonts/  Fredoka / Baloo 2 / Caveat / Instrument Serif / Space Mono
  assets/             song.mp3 + 胶片颗粒贴图（import 方式引用，不用 public/）
  data/               audio.json（逐帧能量/低频/中频/高频/onset）
                      lyrics.json（22 行）· words.json（词级时间，最终用）
                      words_global.json（整首一次对齐）· words2.json（逐句重对齐）· beats.json（BPM 117.5 / 192 拍）
  lib/                beat.ts（拍点脉冲）· audio.ts（频段取样）
  components/
    Backdrop.tsx      渐变背景 + 柔光斑 + 日光晕 + 颗粒 + 暗角（导出 withAlpha）
    Decor.tsx         全部装饰：Confetti / Dust / RainHeavy / Bokeh / Sunburst / DoodleWall /
                      Drift / Balloons / Sparkles / StringLights / Polaroids / RainWindow /
                      RoomFloor / Curtains / Plant / Lamp / HangingLamp / Suitcase /
                      Smiley / Heart / Equalizer，以及 3D 视差层 Layer
    Lyrics.tsx        词级弹跳贴纸歌词（弹簧进场 + 阻尼振荡；未唱的词是浅色幽灵字）+ 中文翻译纸带
    Title.tsx         标题卡（字母逐拍砸落）与角标（夜里可切换浅色字）
  Cover.tsx           4:3 平台封面合成（Cover1..4）
  CoverDark.tsx       备用黑底海报合成
tools/                音频/歌词/节拍分析与对齐脚本：
                      analyze（逐帧能量）· tempo（BPM/相位）· merge_words
                      align_lines（逐句强制对齐）· merge_words2（逐句结果择优并入 words.json）
                      textures（胶片颗粒）
```

## 时间轴

| 时间 | 段落 | 画面 |
|---|---|---|
| 0–16.6 | 前奏 | 贴纸标题砸落、彩灯、雨窗、笑脸 |
| 16.6–33.0 | 主歌 1 | 手账涂鸦墙、飘浮小涂鸦、蓝紫冷色 |
| 33.0–49.4 | 副歌 1 | 放射舞台光、气球、星芒、暖糖果色 |
| 49.4–65.6 | 主歌 2 | 拍立得回忆、彩灯；56.5s 房间上方亮起吊灯，唱到 "misery" 时灯闪两下灭掉，房间转成冷紫夜色（60.2–65.2s） |
| 65.6–81.6 | 副歌 2 | 更热的副歌；末句 "piercing through my heart" 收在 82.26s |
| 82.3–86.4 | 线稿 | 世界一笔一笔褪成墨底白线（`LineRoom`），停住 1.2s；线稿里的吊灯先闪 |
| 85.9–98.1 | 重新开灯 | 真灯闪两下亮起、冷色 0.25s 切回暖色、彩签逐张掉落、镜头缓慢回到开场机位——**最后一帧 = 第 0 帧**，循环无痕 |

## 常用命令

```bash
npx remotion studio                                   # 预览
npx remotion still Unhappy out/x.png --frame=1300 --scale=0.34 --gl=angle
npx remotion render Unhappy out/seq --sequence --gl=angle --concurrency=12 --jpeg-quality=82
```

Remotion 自带的 ffmpeg 在本机会崩（`write EOF`），所以走"帧序列 + 系统 ffmpeg"：

```bash
# 推荐：NVENC（4K 全片约 2 分钟；encode.sh 失败会自动回退 libx264 -crf 17）
"/c/Program Files (x86)/ffmpeg/bin/ffmpeg.exe" -y -framerate 60 -start_number 0\
  -i out/seq/element-%04d.jpeg -i src/assets/song.mp3 -map 0:v -map 1:a\
  -c:v h264_nvenc -preset p6 -rc vbr -cq 21 -b:v 0 -multipass disabled\
  -pix_fmt yuv420p -profile:v high -level 5.2\
  -c:a aac -b:a 320k -shortest -movflags +faststart out/unhappy-mv.mp4
```

现成脚本：
- `tools/render_all.ps1`（推荐；每段 500 帧、失败重试、校验帧数）
- `tools/encode.sh`（归一文件名 → 编码；主线 `libx264 -preset slow -crf 15 -tune film`，兜底 NVENC）
- `tools/sheets.py`（把 `out/review` 的抽查帧拼成接触表）
- `tools/render_then_shutdown.ps1`（渲完 → 编码 → 校验 → 关机；注意它内部直接调 ffmpeg，别去调 bash）

画面之外的小工具：`tools/align_lines.py`（逐句强制对齐）、`tools/merge_words2.py`（择优并入 `words.json`）。

> 结尾段有大量静止帧时，可以只渲到最后一帧再复制填充（本片早期版本用过这招省 40 分钟）；现在结尾有开灯/掉落动画，需整段渲。

## 性能注意（都是实测踩出来的）

- `remotion.config.ts` 必须 `Config.setBrowserExecutable('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')`，否则会卡在下载 chrome-headless-shell。
- 渲染是"无头 Chrome 逐帧截图"，走软件光栅化，**GPU 基本不参与**；4K 单帧成本高。
- 不要开多进程并行（实测反而慢 4 倍，Chrome 实例互相抢内存）。
- 别给每个粒子加 `filter: blur()`、别用全屏 `blur()`，软件渲染下极贵；用径向渐变代替。
- 视差不要用 `preserve-3d` + `translateZ`（在带 `filter` 的祖先里会被压平、排序失效）：改成每层按 `z·sin(偏航/俯仰)` 主动位移 + `zIndex: z + 2000` 显式排序。
- 全片 `saturate()` 只在尾奏才挂，前 80% 时间不要给整棵树加滤镜。
- 静态图层加 `willChange: 'transform'`，让它只被合成、不重绘。

## 素材来源

- 音频：网易云 `id=3332771263`（下载到 `src/assets/song.mp3`）
- 歌词：LRC 时间轴 + Qwen3-ForcedAligner 强制对齐得到词级时间
- 字体：Google Fonts（OFL）

## 封面

`src/Cover.tsx` 出 4:3 平台封面：上半放完整 16:9 原帧（不裁），下半是信息带。

```bash
npx remotion still Cover1 out/cover1.png --frame=0 --gl=angle   # Cover1..4 对应四个段落
```

道具/调色开关（都挂在 `UnhappyVideo` 上，只影响封面渲染，不影响成片）：
`forceProps`（道具一开场就在）、`forceDark`（强制关灯调色）、`coverInset`（道具向中间收）、`Equalizer` 的 `lift`（音频条上提）。

另有一批"每 30 帧一张"的抽查与对比脚本产物在 `out/`（不入库）。
