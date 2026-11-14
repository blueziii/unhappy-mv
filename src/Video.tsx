import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, useCurrentFrame} from 'remotion';
import {C, F, H, W, FPS, clamp01, mix, rgba} from './theme';
import {pulse, barPulse} from './lib/beat';
import {lowAt} from './lib/audio';
import {Backdrop, withAlpha} from './components/Backdrop';
import {
  Balloons,
  Bokeh,
  Confetti,
  DoodleWall,
  Drift,
  Dust,
  Equalizer,
  CamCtx,
  HangingLamp,
  Heart,
  Lamp,
  Layer,
  PARALLAX_P,
  Plant,
  WallClock,
  Mug,
  RoomFloor,
  Suitcase,
  Polaroids,
  RainHeavy,
  RainWindow,
  Moon,
  Smiley,
  Sparkles,
  StringLights,
  Sunburst,
  LineRoom,
} from './components/Decor';
import {LyricStage} from './components/Lyrics';
import {Credit, TitleCard} from './components/Title';
import song from './assets/song.mp3';
import grain0 from './assets/tex/grain_0.png';

const SEC = [
  {t0: 0, top: '#FDF9F0', bottom: C.pink, a: C.butter, b: C.lavender, c: C.mint, cheer: 0.6},
  {t0: 16.6, top: '#F7EFE1', bottom: C.sky, a: C.mint, b: C.lavender, c: C.butter, cheer: 0.48},
  {t0: 33.03, top: '#FFF6E4', bottom: C.candySoft, a: C.butter, b: C.pink, c: C.mint, cheer: 1.0},
  {t0: 49.4, top: '#F6EFE4', bottom: C.lavender, a: C.sky, b: C.mint, c: C.butter, cheer: 0.44},
  {t0: 65.57, top: '#F6EFE4', bottom: C.lavender, a: C.sky, b: C.mint, c: C.butter, cheer: 0.95},
  {t0: 81.6, top: '#FFF3E0', bottom: C.candySoft, a: C.pink, b: C.butter, c: C.lavender, cheer: 0.12},
];

// 每个边界的混合时长（秒）：其它 1.0，尾奏（81.6s）从亮掉进夜里给 3.0
const fadeAt = (_b: number) => 1.0;

const secAt = (t: number) => {
  let i = 0;
  for (let k = 0; k < SEC.length; k++) if (t >= SEC[k].t0) i = k;
  const cur = SEC[i];
  let top = cur.top,
    bottom = cur.bottom,
    a = cur.a,
    b = cur.b,
    c = cur.c,
    cheer = cur.cheer;
  // 与上一段：刚过边界时仍留一半
  const prev = i > 0 ? SEC[i - 1] : null;
  if (prev) {
    const d = fadeAt(cur.t0);
    const w = 1 - clamp01((t - (cur.t0 - d / 2)) / d);
    if (w > 0) {
      top = mix(top, prev.top, w);
      bottom = mix(bottom, prev.bottom, w);
      a = mix(a, prev.a, w);
      b = mix(b, prev.b, w);
      c = mix(c, prev.c, w);
      cheer = cheer + (prev.cheer - cheer) * w;
    }
  }
  // 与下一段：边界前升到一半
  const nxt = i < SEC.length - 1 ? SEC[i + 1] : null;
  if (nxt) {
    const d = fadeAt(nxt.t0);
    const w = clamp01((t - (nxt.t0 - d / 2)) / d);
    if (w > 0) {
      top = mix(top, nxt.top, w);
      bottom = mix(bottom, nxt.bottom, w);
      a = mix(a, nxt.a, w);
      b = mix(b, nxt.b, w);
      c = mix(c, nxt.c, w);
      cheer = cheer + (nxt.cheer - cheer) * w;
    }
  }
  return {top, bottom, a, b, c, cheer};
};

const BOUNDARIES = [33.03, 49.4, 65.57, 81.6];

// 两套配色之间过渡（结尾复位时用）
const mixCol = (p: any, q: any, w: number) => ({
  top: mix(p.top, q.top, w),
  bottom: mix(p.bottom, q.bottom, w),
  a: mix(p.a, q.a, w),
  b: mix(p.b, q.b, w),
  c: mix(p.c, q.c, w),
  cheer: p.cheer + (q.cheer - p.cheer) * w,
});

export const UnhappyVideo: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;

  // ---- 结尾复位：唱完之后房间重新亮起来，最后停回第 0 帧的样子，循环播放没有接缝 ----
  // 88.55s 起灯“啪”地闪两下重新亮起；90–93.4s 冷色调褪回暖色；94.8–97.6s 环境收回开场姿态
  const relightFx = interpolate(t, [84.55, 84.67, 84.77, 84.89, 85.0, 85.2], [0, 1, 0.12, 0.86, 0.2, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const relight = interpolate(t, [84.55, 85.75], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // 开灯瞬间的暖光过曝：灯管"啪"一下亮透，再收回正常曝光
  const relightBloom = interpolate(t, [84.55, 85.0, 85.35, 85.85], [0, 0.28, 0.12, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const loopBack = interpolate(t, [86.0, 90.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // tD：环境动效用的“回卷时间”，最后回到 0 = 与第 0 帧完全一致
  const tD = t; // 结尾不再把镜头荡回开场机位（用户反馈那样不好看），改由墙上的东西逐个离场
  // 颜色/滤镜比镜头更早回来（避免回暖途中有 1 秒多"发白发灰"的雾感）
  const relightCol = 1 - (1 - relight) * (1 - relight);
  const keep = 1 - relightCol;
  // 冷色调的退场：跟着灯闪那一下直接切回暖色（用户要求：不要 1 秒慢慢变亮）
  const warmCut = interpolate(t, [84.55, 84.78], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  // 结尾：世界褪成一张手绘线稿（从边缘往里），开灯时颜色重新灌回来
  const sketchIn = interpolate(t, [82.9, 84.45], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const sketchOut = interpolate(t, [84.5, 85.15], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const sketch = sketchIn * sketchOut;
  const keepGrade = 1 - warmCut;
  // 哭脸变回笑脸：比开灯慢得多，6 秒多慢慢回来
  const smileBack = interpolate(t, [85.2, 91.4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  // 最后溶到第 0 帧的静帧（房间空下来之后，循环接缝零误差）
  const loopSeal = interpolate(t, [92.4, 95.4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const col = mixCol(secAt(t), secAt(0), warmCut);
  const drain = interpolate(t, [85.55, 88.5], [0, 0.8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }) * keepGrade;
  const inChorus = (t >= 33.03 && t < 49.4) || (t >= 65.57 && t < 81.6);
  const inIntro = t < 16.6;

  // 镜头：真的在 3D 空间里平移/摇摆/推拉，各层不同 z 就有了视差
  const bp = barPulse(f, 4, 22);
  const hit = pulse(f, 11);
  const _camYaw = Math.sin(tD / 11.3) * 4.6 + Math.sin(tD / 4.7) * 0.7 + (inChorus ? Math.sin(tD / 3.4) * 1.1 : 0);
  const _camPitch = Math.cos(tD / 14.7) * 2.7 + Math.sin(tD / 6.1) * 0.6;
  const _camRoll = Math.sin(tD / 13.3) * 0.6 + Math.sin(tD / 5.9) * 0.2; // 手持镜头的轻微歪斜
  const _camX = Math.sin(tD / 9.5) * 46 + Math.sin(tD / 3.7) * 10;
  const _camY = Math.cos(tD / 12) * 30 + Math.cos(tD / 4.3) * 8;
  // 结尾：镜头极慢地回到第 0 帧的机位（只有几十像素和 2.7°，看不出来，但循环接缝是齐的）
  const camBack = interpolate(t, [91.5, 97.6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const camYaw = _camYaw * (1 - camBack);
  const camPitch = _camPitch * (1 - camBack) + 2.7 * camBack;
  const camRoll = _camRoll * (1 - camBack);
  const camX = _camX * (1 - camBack);
  const camY = _camY * (1 - camBack) + 38 * camBack;
  const camZ = -tD * 2.0 - (bp * 52 + hit * (inChorus ? 40 : 14)) * (1 - loopBack); // 全片缓慢推进 + 打点一顶
  const breathe = (1 + 0.007 * Math.sin(tD / 6.5)) * (1 - camBack) + camBack; // 极慢的呼吸，画面永远不完全静止
  // 舞台层（窗口/笑脸/律动条/歌词）不再随拍缩放：哪怕 0.6% 也会被看成画面在跳
  const stageScale = 1;
  const shake = (inChorus ? 2.4 : 1.0) * hit;
  // 行李箱：唱到 "pack all my things" 的时候出现在地上
  const bagApp = interpolate(t, [28.4, 29.6, 33.0, 33.6], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // 唱到 "And I'll run far away" 时，行李箱颠着滑出画面
  const bagSlide = interpolate(t, [31.0, 33.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // 钟：指针越走越慢，最后停住
  const clockStop = interpolate(t, [16, 46, 72, 90], [0, 0.35, 0.86, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }) * keep;
  // 钟：唱到 "You never ever pay attention to me"（52.95–56.81）指针倒着走
  const clockReel = interpolate(t, [52.95, 53.4, 56.4, 56.81], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }) * keep;

  // 副歌进场闪白
  const flash = 0; // 段落交界不再闪白（用户要求去掉 33.03s 的闪光）
  const _flashUnused = BOUNDARIES.reduce((acc, b) => {
    const d = (t - b) * FPS;
    if (b === 81.6) return acc;
    if (d >= 0 && d < 13) return Math.max(acc, (1 - d / 13) * 0.34);
    return acc;
  }, 0);

  // 心：只在尾奏那句 “piercing through my heart” 出现（吊灯那一段不用心了）
  const heartA = false; // 红心已去掉（用户要求）
  // 红心等末句歌词退场之后再出现（歌词最后一句唱到 82.26s，82.4s 起快速淡出）
  const heartB = false; // 红心已去掉（用户要求）
  const heartApp = heartB
    ? interpolate(t, [82.8, 83.2, 83.9, 84.6], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
    : 0;
  const crackP = heartA ? clamp01((t - 48.9) / 1.2) : clamp01((t - 82.95) / 1.0);

  // 窗口保持原来的大小：尾奏不再把窗放大，只让整幅画面沉下去
  const grow = 0;
  // 窗户永远不透明：原来副歌用 0.62，副歌一结束跳到 1，墙从玻璃里透出来
  // 会让窗在 81.6s 那一下突然变暗（视觉上像"关上灯了"）
  // 窗户全程都在（第 0 帧与最后一帧必须一致，否则循环时窗会"凭空出现"）
  const winOpacity = 1;

  const sadness = interpolate(
    t,
    [0, 16.6, 33.03, 46.25, 65.57, 78.89, 84, 92],
    [0.0, 0.1, 0.32, 0.5, 0.62, 0.78, 0.95, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  ) * (1 - smileBack);
  // 笑脸的眼睛：关灯之后才开始、慢慢地闭起来（跟悲剧感一起走完）
  const eyeMix = 0; // 眼睛永远是圆的（用户要求：不要变成曲线）
  const crack = interpolate(t, [78.9, 82.5, 86], [0, 0.75, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }) * keep;

  // “I should get a piercing through my heart”：房间上方亮起一盏吊灯，唱到 heart 时“啪”地关掉，
  // 之后整幅画面（连歌词一起）沉进冷紫的暗色调，一直到第二段副歌才回到暖色。

  // 吊灯从一开始就挂在那儿（没开之前只是一只暗灯罩）
  const lampApp = 1;

  // 关灯那一下的闪烁：0 → 亮 → 抖两下 → 灭
  // 关灯：亮 → 抖三下（闪三下）→ 灭，最后留一点点余辉
  const lampOnBase = interpolate(
    t,
    [0, 48.94, 48.99, 49.04, 49.09, 49.14, 49.19, 49.24, 49.29, 49.42],
    [1, 1, 0.05, 0.92, 0.12, 0.7, 0.04, 0.34, 0, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );
  // 结尾：灯重新亮起（闪两下再稳住）
  const lampOn = t >= 84.5 ? relightFx : lampOnBase;
  // 关灯那一下灯罩的抖动
  const lampJolt = t >= 48.94 && t < 49.7 ? Math.sin((t - 48.94) * 74) * 6 * (1 - (t - 48.94) / 0.76) : 0;
  // 灯灭之后整幅画面变暗、换色调（压暗但依然看得清东西）
  const darkAmt = interpolate(t, [48.94, 49.12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }) * keepGrade;

  // 尾奏不再额外压暗（心碎之后是一路回暖，压暗会和"重新开灯"打架）
  const outroDark = 0;

  // 暗线：窗边那盆草一开始挺拔，越唱越蔫
  const wiltP = interpolate(t, [54, 62, 74, 92], [0, 0.18, 0.6, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }) * keep;

  const titleOut = interpolate(t, [14.3, 16.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 首尾要能无缝循环：开头不再黑场淡入，结尾由 ffmpeg 与第 0 帧做交叉溶解
  const fadeIn = 0;
  const fadeOut = 0;
  const endCard = 0; // 旧的"黑底手写 unhappy"结尾已去掉：唱完直接重新开灯、房间复位
  // 歌名停留期间极慢地推近一点，避免十秒画面完全静止
  const titlePush = interpolate(t, [84.6, 86.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cheer = col.cheer * (1 - drain * 0.85);

  // 段落包络：让背景元素进出都是淡入淡出，不会“啪”地跳出来
  const env = (t0: number, t1: number, fade = 1.1) =>
    Math.min(clamp01((t - t0) / fade), clamp01((t1 - t) / fade));
  const eIntro = env(0, 16.6, 1.6);
  const eVerse1 = env(16.6, 33.03);
  const eChorus1 = env(33.03, 49.4, 0.9);
  const eVerse2 = env(49.4, 65.57);
  const eChorus2 = env(65.57, 82.4, 1.8);
  const eChorus = Math.max(eChorus1, eChorus2);
  const eVerse = Math.max(eVerse1, eVerse2);
  const eSong = Math.max(eIntro, eVerse, eChorus);
  // 房间道具（钟、伞、杯、纸团）从第一句歌词开始出现，片头标题保持干净
  // 房间道具从片头过去之后一直在，别跟段落包络（交界处会掉到 0，道具就闪一下）
  const propOp = 0.92 * clamp01((t - 16.2) / 1.6) * (1 - clamp01((t - 89.6) / 2.2));
  // 暗场里挂钟必须完全不透明，否则会透出后面的拍立得
  const clockOp = 0.85 * propOp + (1 - 0.85 * propOp) * clamp01(darkAmt);
  const lampVis = 0.9 * (1 - drain * 0.5);
  // 台灯在 Layer z=-360 里，滤镜外的暖光要跟它位移一致才对得齐
  const lampPx = -360 * Math.sin((camYaw * Math.PI) / 180);
  const lampPy = 360 * Math.sin((camPitch * Math.PI) / 180);
  const eOutro = clamp01((t - 81.6) / 6);

  const fadeDecor = 1 - drain * 0.75;

  // 世界的镜头变换：背景层与歌词层共用（歌词另起一层压在暗色调之上）
  const worldTf = `scale(1.06) translate3d(${camX.toFixed(2)}px, ${camY.toFixed(
    2
  )}px, ${camZ.toFixed(2)}px) rotate(${camRoll.toFixed(3)}deg) rotateY(${camYaw.toFixed(
    3
  )}deg) rotateX(${camPitch.toFixed(3)}deg) scale(${breathe.toFixed(4)})`;
  // 关灯 = 换一套配色：整间屋子重新打光成月光蓝，而不是简单地压暗
  const nightK = darkAmt;
  const lumW = [0.3, 0.59, 0.11];
  const shadowC = [0.03, 0.035, 0.105];
  const highC = [0.72, 0.8, 1.0];
  const gain = 0.62;
  const mRow = (c: number) => {
    const sC = shadowC[c];
    const hC = highC[c];
    return [
      (c === 0 ? 1 : 0) * (1 - nightK) + nightK * (hC - sC) * gain * lumW[0],
      (c === 1 ? 1 : 0) * (1 - nightK) + nightK * (hC - sC) * gain * lumW[1],
      (c === 2 ? 1 : 0) * (1 - nightK) + nightK * (hC - sC) * gain * lumW[2],
      nightK * sC,
    ];
  };
  const nightMatrix = [...mRow(0), ...mRow(1), ...mRow(2), 0, 0, 0, 1, 0].map((v) => v.toFixed(4)).join(' ');
  const stageTf = `scale(${stageScale}) translate(${(Math.sin(f * 2.1) * shake).toFixed(2)}px, ${(
    Math.cos(f * 1.7) * shake
  ).toFixed(2)}px)`;

  return (
    <>
    <AbsoluteFill
      style={{
        backgroundColor: C.cream,
        // 全片调色：尾奏褪色 + 关灯后整套换成月光配色（滤镜必须挂在最外层，3D 子层会让内层滤镜失效）
        filter: [
          drain > 0.02
            ? `saturate(${(1 - drain * 0.85).toFixed(3)}) contrast(${(1 + drain * 0.05).toFixed(3)})`
            : null,
          darkAmt > 0.002
            ? `brightness(${(1 - 0.4 * darkAmt).toFixed(3)}) sepia(${(0.62 * darkAmt).toFixed(
                3
              )}) hue-rotate(196deg) saturate(${(1 + 0.25 * darkAmt).toFixed(
                3
              )}) contrast(${(1 + 0.36 * darkAmt).toFixed(3)})`
            : null,
        ]
          .filter(Boolean)
          .join(' '),
      }}
    >
      <Audio src={song} />

      <svg
        width="1"
        height="1"
        style={{position: 'absolute', left: 0, top: 0, opacity: 0, pointerEvents: 'none'}}
        aria-hidden
      >
        <filter id="nightTone" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={nightMatrix} />
        </filter>
      </svg>



      <AbsoluteFill>
        <AbsoluteFill
          style={{
            transform: `scale(1.05) translate(${(Math.sin(t / 22) * 34).toFixed(2)}px, ${(
              Math.cos(t / 27) * 22
            ).toFixed(2)}px)`,
          }}
        >
          <Backdrop
            top={col.top}
            bottom={col.bottom}
            blobA={col.a}
            blobB={col.b}
            blobC={col.c}
            drain={drain}
            night={darkAmt}
          />
        </AbsoluteFill>

        {/* ——— 3D 世界：各层放在不同 z 上，镜头一动就有视差 ——— */}
        <AbsoluteFill style={{isolation: 'isolate'}}>
          <AbsoluteFill
            style={{
              transform: worldTf,
            }}
          >
            {/* 最远：舞台光 + 手账涂鸦墙 */}
            <CamCtx.Provider value={{yaw: camYaw, pitch: camPitch}}>
            <Layer z={-980}>
              <Sunburst opacity={clamp01((cheer - 0.5) * 1.4) * (1 - darkAmt)} spin={inChorus ? 0.16 : 0.05} drain={drain} />
            </Layer>
            <Layer z={-780}>
              <DoodleWall opacity={0.62 * eSong * fadeDecor * (1 - eChorus * 0.45)} accent={col.a} drain={drain} />
            </Layer>

            {/* 室内空间：地面、窗帘、台灯、盆栽、行李箱 */}
            <Layer z={-880}>
              <RoomFloor opacity={0.55 * (1 - drain * 0.3)} floor={col.a} drain={drain} />
            </Layer>
            <Layer z={-660}>
              <WallClock opacity={clockOp * (1 - drain * 0.4)} stop={clockStop} reel={clockReel} night={darkAmt} />
            </Layer>
            <Layer z={-520}>
              <Plant opacity={0.85 * (1 - drain * 0.35)} wilt={wiltP} drain={drain} night={darkAmt} />
            </Layer>
            <Layer z={-360}>
              <Lamp opacity={lampVis} drain={drain} night={darkAmt} />
            </Layer>
            <Layer z={-300}>
              <Mug
                opacity={propOp * 0.8 * (1 - drain * 0.45)}
                warm={1 - clamp01((t - 56) / 22)}
              />
            </Layer>
            <Layer z={-140}>
              <Suitcase app={bagApp * (1 - drain * 0.6)} slide={bagSlide} drain={drain} />
            </Layer>

            {/* 中景：飘浮涂鸦、彩灯、拍立得、气球 */}
            <Layer z={-460}>
              <Drift opacity={(0.85 * eVerse + 0.45 * eChorus) * fadeDecor * (1 - darkAmt * 0.65)} drain={drain} />
            </Layer>
            <Layer z={40}>
              <StringLights power={clamp01(Math.max(0.92 * eVerse, 0.85 * eIntro) * fadeDecor)} drain={drain} night={darkAmt} />
            </Layer>
            <Layer z={-280}>
              <Polaroids opacity={0.95 * (1 - drain * 0.3)} drain={drain} night={darkAmt} />
            </Layer>
            <Layer z={-220}>
              <Balloons opacity={(0.9 * eChorus + 0.55 * eIntro) * fadeDecor * (1 - darkAmt)} drain={drain} />
            </Layer>

            {/* 吊灯：挂在房间上方、挡在灯串与窗户之前 */}
            <Layer z={100}>
              <HangingLamp app={lampApp} on={lampOn} jolt={lampJolt} drain={drain} />
            </Layer>

            {/* 舞台层：窗口、律动条、百叶窗、心、笑脸、歌词都在同一平面 */}
            <Layer z={0}>
              <AbsoluteFill
                style={{
                  transform: stageTf,
                }}
              >
                <RainWindow
                  grow={grow}
                  dim={0.14 + drain * 0.3 + darkAmt * 1.1}
                  opacity={winOpacity * (1 - drain * 0.15) * (1 - darkAmt * 0.12)}
                />
                <Equalizer
                  opacity={(inIntro ? clamp01((t - 7.5) / 1.5) * 0.9 : 0.95) * (1 - clamp01(darkAmt * 2)) * (1 - loopBack)}
                  flat={drain * 0.8}
                  night={darkAmt}
                />

                {/* 片头标题照常一个字母一个字母砸下来；结尾会回到“标题还没出现”的那一帧，循环时刚好接上 */}
                {t < 16.8 ? <TitleCard drain={drain} out={titleOut} /> : null}
              </AbsoluteFill>
            </Layer>

            {/* 一层层的粒子与前景 */}
            <Layer z={120}>
              <RainHeavy
                opacity={Math.max(eOutro * 0.8, darkAmt * 0.45) * (1 - loopBack)}
                dark={drain > 0.45 || darkAmt > 0.3}
              />
            </Layer>
            {/* 笑脸：一直在，慢慢垮掉。单独一层，不跟标题的打点抖动一起晃 */}
            <Layer z={6}>
              <div style={{position: 'absolute', left: 560, top: H - 680, opacity: 0.96 * (1 - drain * 0.25)}}>
                <Smiley
                  sadness={sadness}
                  crack={crack}
                  eyeMix={eyeMix}
                  night={darkAmt}
                  size={265}
                />
              </div>
            </Layer>
            <Layer z={140}>
              <Confetti amount={0.55 + cheer * 0.65} drain={drain} clean={darkAmt} />
            </Layer>
            <Layer z={210}>
              <Sparkles opacity={0.95 * eChorus * fadeDecor * (1 - darkAmt)} drain={drain} />
            </Layer>
            <Layer z={260}>
              <Dust opacity={(0.5 + 0.28 * cheer) * (1 - darkAmt * 0.6)} drain={drain} />
            </Layer>
            <Layer z={380}>
              <Bokeh opacity={(0.42 + 0.3 * cheer) * (1 - darkAmt * 0.75)} drain={drain} />
            </Layer>
            </CamCtx.Provider>
          </AbsoluteFill>
        </AbsoluteFill>

        {/* 灯灭之后的整体暗色调：盖住整幅画面（歌词、粒子一起暗下去） */}
        {darkAmt > 0.002 ? (
          <AbsoluteFill
            style={{
              background: `linear-gradient(178deg, #191436 0%, #2A2145 42%, #453552 100%)`,
              opacity: darkAmt * 0.2,
              mixBlendMode: 'multiply',
            }}
          />
        ) : null}
        {darkAmt > 0.002 ? (
          <AbsoluteFill
            style={{
              background: `radial-gradient(ellipse 70% 90% at 86% 20%, ${rgba(C.sky, 0.62)} 0%, ${rgba(
                C.sky,
                0.18
              )} 34%, ${rgba(C.sky, 0)} 62%), radial-gradient(ellipse 60% 50% at 50% 92%, ${rgba(
                C.lavender,
                0.22
              )} 0%, ${rgba(C.lavender, 0)} 58%)`,
              opacity: darkAmt * 0.26,
              mixBlendMode: 'screen',
            }}
          />
        ) : null}

        {/* 夜里的一层暗角：把视线收到窗口那束光里 */}
        {darkAmt > 0.002 ? (
          <AbsoluteFill
            style={{
              background: `radial-gradient(ellipse at 74% 26%, ${rgba(C.night, 0)} 22%, ${rgba(
                '#0B0C1A',
                0.62
              )} 100%)`,
              opacity: darkAmt * 0.85,
              pointerEvents: 'none',
            }}
          />
        ) : null}

        {/* 暗场再压一层暗角，把视线收到窗口 */}
        {darkAmt > 0.002 ? (
          <AbsoluteFill
            style={{
              background: `radial-gradient(ellipse at 78% 30%, ${rgba(C.night, 0)} 0%, ${rgba(
                C.night,
                0.45
              )} 74%)`,
              opacity: darkAmt * 0.55,
            }}
          />
        ) : null}

        {/* 歌词：单独一层压在暗色调之上——房间可以黑，字必须亮 */}
        <AbsoluteFill style={{transform: worldTf}}>
          <AbsoluteFill style={{transform: stageTf}}>
            <LyricStage drain={drain} dark={darkAmt > 0.3 || drain > 0.55} />
          </AbsoluteFill>
        </AbsoluteFill>

        <Credit opacity={clamp01((t - 6) / 1.5) * (1 - endCard) * (1 - loopBack)} drain={drain} />

        {/* 压暗（百叶窗段落）——已移到背景层 */}

        {/* 鼓点闪白 */}
        <AbsoluteFill style={{background: C.paper, opacity: flash * (1 - darkAmt), mixBlendMode: 'screen'}} />
        {relightBloom > 0.002 ? (
          <AbsoluteFill style={{background: C.butter, opacity: relightBloom * 0.4, mixBlendMode: 'screen'}} />
        ) : null}

        {/* 颗粒 + 暗角 */}
        <AbsoluteFill
          style={{
            backgroundImage: `url(${grain0})`,
            backgroundSize: '420px 420px',
            backgroundPosition: `${(f * 53) % 420}px ${(f * 31) % 420}px`,
            opacity: 0.12 + 0.05 * lowAt(f),
            mixBlendMode: 'soft-light',
          }}
        />

        {/* 尾奏：整幅画面慢慢沉下去 */}
        {outroDark > 0.002 ? (
          <AbsoluteFill style={{background: C.night, opacity: outroDark * 0.6}} />
        ) : null}
      </AbsoluteFill>

    </AbsoluteFill>

    {/* 结尾：世界褪成一张手绘线稿。画在滤镜之外，纸才是纸色、线才是墨色 */}
    {sketch > 0.002 ? (
      <AbsoluteFill style={{transform: worldTf, pointerEvents: 'none'}}>
        <AbsoluteFill style={{transform: stageTf, pointerEvents: 'none'}}>
          <AbsoluteFill style={{background: C.paper, opacity: 0.97 * sketch}} />
          <AbsoluteFill style={{opacity: sketch}}>
            <LineRoom progress={sketch} drain={drain} />
          </AbsoluteFill>
        </AbsoluteFill>
      </AbsoluteFill>
    ) : null}

    {/* 暗场的音频条画在滤镜之外，否则会被暗角吃掉 */}
    {darkAmt > 0.02 ? (
      <AbsoluteFill style={{transform: worldTf, opacity: clamp01(darkAmt * 1.4) * (1 - endCard) * (1 - sketch) }}>
        <AbsoluteFill style={{transform: stageTf}}>
          <Equalizer opacity={0.78} flat={drain * 0.8} night={1} />
        </AbsoluteFill>
      </AbsoluteFill>
    ) : null}

    {/* 窗外的月亮：画在调色滤镜之外才够亮。关灯是月亮，开灯就回到下雨 */}
    {darkAmt > 0.002 ? (
      <AbsoluteFill style={{transform: worldTf, pointerEvents: 'none'}}>
        <AbsoluteFill style={{transform: stageTf, pointerEvents: 'none'}}>
          <Moon opacity={clamp01((0.14 + drain * 0.3 + darkAmt * 1.1 - 0.3) / 0.32) * (1 - sketch)} />
        </AbsoluteFill>
      </AbsoluteFill>
    ) : null}

    {/* 台灯在滤镜之外的那点暖光：灯罩被自己打亮 + 光锥 + 地面光斑 */}
    {darkAmt > 0.002 ? (
      <AbsoluteFill style={{transform: worldTf, pointerEvents: 'none'}}>
        <AbsoluteFill style={{transform: `${stageTf} translate(${lampPx}px, ${lampPy}px)`, pointerEvents: 'none'}}>
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: darkAmt * lampVis * 0.78 * (1 - endCard) * (1 - sketch)}}
        >
          <defs>
            <linearGradient id="lampBeam" x1="0" y1="1126" x2="0" y2="1700" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={C.butter} stopOpacity={0.5} />
              <stop offset="45%" stopColor={C.butter} stopOpacity={0.24} />
              <stop offset="100%" stopColor={C.butter} stopOpacity={0.07} />
            </linearGradient>
            <linearGradient id="lampShadeWarm" x1="0" y1="-560" x2="0" y2="-704" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={C.butter} stopOpacity={0.8} />
              <stop offset="60%" stopColor={C.butter} stopOpacity={0.34} />
              <stop offset="100%" stopColor={C.butter} stopOpacity={0.12} />
            </linearGradient>
            <filter id="lampBeamBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation={22} />
            </filter>
          </defs>
          {/* 光锥：从罩口往下铺开 */}
          <path d="M196 1132 L404 1132 L700 1700 L-100 1700 Z" fill="url(#lampBeam)" filter="url(#lampBeamBlur)" />
          <path
            d="M236 1136 L364 1136 L452 1700 L148 1700 Z"
            fill="url(#lampBeam)"
            filter="url(#lampBeamBlur)"
            opacity={0.8}
          />
          {/* 灯罩被自己的光打亮：罩口最亮，越往上越暗 */}
          <g transform={`translate(300 ${H * 0.775})`}>
            <path d="M-150 -700 L150 -700 L96 -560 L-96 -560 Z" fill="url(#lampShadeWarm)" />
            <path d="M-150 -700 L150 -700 L140 -726 L-140 -726 Z" fill={C.candySoft} opacity={0.5} />
            <rect x="-7" y="-560" width="14" height="560" fill={C.butter} opacity={0.14} />
          </g>
        </svg>
        <AbsoluteFill
          style={{
            position: 'absolute',
            left: 300 - 560,
            top: H * 0.775 - 556 - 560,
            width: 1120,
            height: 1120,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${rgba(C.butter, 0.2)} 0%, ${rgba(
              C.butter,
              0.07
            )} 34%, ${rgba(C.butter, 0)} 62%)`,
            mixBlendMode: 'screen',
            opacity: darkAmt * lampVis * (1.15 + 0.14 * Math.sin(t / 2.4)) * (1 - endCard),
          }}
        />
        <AbsoluteFill
          style={{
            position: 'absolute',
            left: 300 - 300,
            top: H * 0.775 - 70,
            width: 600,
            height: 140,
            borderRadius: '50%',
            background: `radial-gradient(ellipse, ${rgba(C.butter, 0.24)} 0%, ${rgba(
              C.butter,
              0
            )} 64%)`,
            mixBlendMode: 'screen',
            opacity: darkAmt * lampVis * (1 - endCard),
          }}
        />
        </AbsoluteFill>
      </AbsoluteFill>
    ) : null}

    {/* 尾奏那颗心在滤镜之外：关灯换配色时它必须还是红色 */}
    {heartApp > 0.01 ? (
      <AbsoluteFill
        style={{perspective: PARALLAX_P, perspectiveOrigin: '50% 50%', transformStyle: 'preserve-3d'}}
      >
        <AbsoluteFill style={{transformStyle: 'preserve-3d', transform: worldTf}}>
          <AbsoluteFill style={{transform: stageTf}}>
            <div
              style={{
                position: 'absolute',
                left: W / 2 - 330,
                top: 150,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Heart crack={crackP} app={heartApp} pierce={0} size={660} />
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      </AbsoluteFill>
    ) : null}

    {/* 结束卡画在滤镜之外：歌名是纯白，不被冷色调吃掉 */}
    {endCard > 0.01 ? (
      <>
        <AbsoluteFill style={{background: C.night, opacity: endCard}} />
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            opacity: clamp01((endCard - 0.15) / 0.7),
            transform: `scale(${(1 + 0.02 * titlePush).toFixed(4)})`,
          }}
        >
          <div
            style={{
              fontFamily: F.hand,
              fontWeight: 400,
              fontSize: 430,
              color: withAlpha(C.paper, 0.97),
              letterSpacing: '0.02em',
              textShadow: `0 0 70px ${withAlpha(C.paper, 0.22)}`,
            }}
          >
            unhappy
          </div>
          <div
            style={{
              marginTop: 30,
              fontFamily: F.mono,
              fontSize: 46,
              letterSpacing: '0.62em',
              color: withAlpha(C.bone, 0.55),
              textTransform: 'uppercase',
            }}
          >
            s0rrow
          </div>
        </AbsoluteFill>
      </>
    ) : null}

    <AbsoluteFill style={{background: C.night, opacity: Math.max(fadeIn, fadeOut)}} />
    </>
  );
};
