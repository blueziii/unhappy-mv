import React from 'react';
import {AbsoluteFill, Img} from 'remotion';
import {C, F} from './theme';
import {withAlpha} from './components/Backdrop';
import c1 from './assets/covers/c1.jpg';
import c2 from './assets/covers/c2.jpg';
import c3 from './assets/covers/c3.jpg';
import c4 from './assets/covers/c4.jpg';

/**
 * 封面 4:3（2880×2160）
 * 版式：上面是 16:9 的成片原帧（完整不裁），下面留一条奶油色标题带。
 * 这样 4:3 里既没有裁掉画面，也不会让字压住歌词。
 */
const SRC: Record<string, string> = {c1, c2, c3, c4};

const LETTERS = ['u', 'n', 'h', 'a', 'p', 'p', 'y'];
const COLOR = [C.candy, C.butter, C.mint, C.sky, C.candySoft, C.lavender, C.candy];

const W = 2880;
const IMG_H = 1620; // 2880 * 9/16
const BAND_H = 2160 - IMG_H;

export const Cover: React.FC<{
  src: string;
  tag: string;
  zh: string;
  dark?: boolean;
}> = ({src, tag, zh, dark = false}) => {
  const bandTop = dark ? C.night : C.paper;
  const bandBottom = dark ? '#141420' : C.cream;
  const ink = dark ? C.paper : C.ink;

  return (
    <AbsoluteFill style={{backgroundColor: C.cream}}>
      {/* 成片原帧：完整 16:9，不裁 */}
      <img
        src={SRC[src]}
        style={{position: 'absolute', left: 0, top: 0, width: W, height: IMG_H, objectFit: 'cover'}}
      />

      {/* 画面底部的柔和过渡，避免和标题带硬切 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: IMG_H - 190,
          width: W,
          height: 190,
          background: `linear-gradient(to bottom, ${withAlpha(bandTop, 0)} 0%, ${withAlpha(bandTop, 0.75)} 62%, ${bandTop} 100%)`,
        }}
      />

      {/* 标题带 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: IMG_H,
          width: W,
          height: BAND_H,
          background: `linear-gradient(102deg, ${bandTop} 0%, ${bandBottom} 100%)`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 132px',
          gap: 96,
        }}
      >
        {/* 标题 */}
        <div style={{display: 'flex', alignItems: 'flex-end', gap: 6}}>
          {LETTERS.map((ch, i) => (
            <span
              key={i}
              style={{
                fontFamily: F.round,
                fontWeight: 700,
                fontSize: 300,
                lineHeight: 0.9,
                color: COLOR[i],
                textShadow: `0 12px 0 ${withAlpha(C.ink, 0.16)}`,
                transform: `rotate(${((i % 3) - 1) * 1.4}deg)`,
              }}
            >
              {ch}
            </span>
          ))}
        </div>

        {/* 右侧信息 */}
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0}}>
          <div
            style={{
              fontFamily: F.mono,
              fontSize: 38,
              letterSpacing: '0.3em',
              color: withAlpha(ink, 0.55),
              textTransform: 'uppercase',
            }}
          >
            {tag}
          </div>
          <div
            style={{
              fontFamily: `'WenKai', ${F.hand}`,
              fontSize: 74,
              lineHeight: 1.2,
              color: withAlpha(ink, 0.92),
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {zh}
          </div>
          <div
            style={{
              fontFamily: F.mono,
              fontSize: 34,
              letterSpacing: '0.2em',
              color: withAlpha(dark ? '#F6A896' : C.candy, 0.95),
            }}
          >
            s0rrow · ANIMATED MV · 4K 60FPS · 1'38"
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
