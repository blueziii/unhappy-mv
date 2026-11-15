import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F, H, W} from './theme';
import {withAlpha} from './components/Backdrop';
import {DoodleWall, Equalizer, Lamp, Moon, Plant, RainWindow, Smiley, Sparkles} from './components/Decor';

/**
 * 黑色版封面主画面（16:9，3840×2160），渲染第 600 帧。
 * 把主要元素都摆进来：标题贴纸、笑脸、落地台灯、音频条、盆栽、雨窗、月亮。
 */
const LETTERS = ['u', 'n', 'h', 'a', 'p', 'p', 'y'];
const COLOR = [C.candy, C.butter, C.mint, C.sky, C.candySoft, C.lavender, C.candy];

export const CoverDark: React.FC = () => {
  const floorY = H * 0.775;

  return (
    <AbsoluteFill style={{background: 'linear-gradient(178deg, #0D0B1E 0%, #17143A 40%, #221E46 72%, #2C2850 100%)'}}>
      {/* 远处涂鸦墙，很淡 */}
      <AbsoluteFill style={{opacity: 0.1}}>
        <DoodleWall opacity={1} accent={C.lavender} drain={1} />
      </AbsoluteFill>

      {/* 窗外：雨夜 + 弯月 */}
      <RainWindow grow={0} dim={1} opacity={1} />
      <Moon opacity={1} />

      {/* 地板与墙角，给一个空间感 */}
      <AbsoluteFill style={{background: `linear-gradient(to bottom, transparent ${floorY - 260}px, ${withAlpha('#0A0918', 0.78)} ${floorY}px, ${withAlpha('#08070F', 0.95)} 100%)`}} />

      {/* 空中星芒 */}
      <AbsoluteFill style={{opacity: 0.75}}>
        <Sparkles opacity={1} drain={1} />
      </AbsoluteFill>

      {/* 底部音频条 */}
      <Equalizer opacity={1} flat={0} night={1} />

      {/* 台灯暖光锥：从灯罩下沿斜铺到地面 */}
      <div
        style={{
          position: 'absolute',
          left: 40,
          top: H * 0.775 - 760,
          width: 720,
          height: 900,
          background: `radial-gradient(ellipse 60% 90% at 42% 6%, ${withAlpha(C.butter, 0.3)} 0%, ${withAlpha(C.butter, 0.12)} 45%, transparent 78%)`,
          mixBlendMode: 'screen',
          filter: 'blur(28px)',
        }}
      />

      {/* 盆栽（右）、落地灯（左） */}
      <Plant opacity={1} wilt={0} night={1} />
      <Lamp opacity={1} night={1} />

      {/* 笑脸：画面中偏左，正好在灯和盆栽之间 */}
      <div style={{position: 'absolute', left: 1420, top: floorY - 700, filter: `drop-shadow(26px 34px 46px ${withAlpha('#05050C', 0.5)})`}}>
        <Smiley sadness={0} crack={0} size={620} night={1} eyeMix={0} />
      </div>

      {/* 标题：贴纸字母 */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 176, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <div
          style={{
            fontFamily: F.mono,
            fontSize: 34,
            letterSpacing: '0.46em',
            color: withAlpha(C.paper, 0.5),
            textTransform: 'uppercase',
            marginBottom: 26,
          }}
        >
          now playing
        </div>
        <div style={{display: 'flex', alignItems: 'flex-end', gap: 18}}>
          {LETTERS.map((ch, i) => (
            <span
              key={i}
              style={{
                fontFamily: F.round,
                fontWeight: 700,
                fontSize: 300,
                lineHeight: 0.92,
                color: COLOR[i],
                textShadow: `0 14px 0 ${withAlpha('#07060E', 0.55)}, 0 40px 70px ${withAlpha('#07060E', 0.45)}`,
                transform: `rotate(${((i % 3) - 1) * 1.6}deg) translateY(${i % 2 === 0 ? 0 : -8}px)`,
              }}
            >
              {ch}
            </span>
          ))}
        </div>
        <div style={{fontFamily: F.mono, fontSize: 40, letterSpacing: '0.62em', color: withAlpha(C.paper, 0.72), marginTop: 34}}>
          S0RROW
        </div>
        <div
          style={{
            fontFamily: `'WenKai', ${F.hand}`,
            fontSize: 58,
            color: withAlpha(C.paper, 0.62),
            marginTop: 18,
            letterSpacing: '0.06em',
          }}
        >
          用欢快的节拍，唱一个悲伤的故事
        </div>
      </div>
    </AbsoluteFill>
  );
};
