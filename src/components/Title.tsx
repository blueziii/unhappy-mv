import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, F, H, clamp01, easeOutBack, sf, mix} from '../theme';
import {BEATS} from '../lib/beat';
import {withAlpha} from './Backdrop';

const LETTERS = ['u', 'n', 'h', 'a', 'p', 'p', 'y'];
const COLOR = [C.candy, C.butter, C.mint, C.sky, C.candySoft, C.lavender, C.candy];

const rnd = (seed: number) => {
  const x = Math.sin(seed * 51.3 + 17.9) * 43758.5453;
  return x - Math.floor(x);
};

/** 片头：贴纸字母一个一个砸下来 */
export const TitleCard: React.FC<{drain: number; out: number}> = ({drain, out}) => {
  const f = useCurrentFrame();
  const t = f / 60;

  // 从第 4 个拍子开始，每拍出来一个字母
  const beats = BEATS;
  const letterStart = (i: number) => {
    const b = beats[Math.min(beats.length - 1, 3 + i)] ?? 2;
    return sf(b);
  };

  const subP = clamp01((t - 6.0) / 1.2);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: H * 0.5 - 90,
        transform: `translateY(-50%) scale(${1 - out * 0.12}) `,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity: 1 - out,
        filter: out > 0.01 ? `blur(${out * 12}px)` : undefined,
      }}
    >
      {/* 小标签 */}
      <div
        style={{
          fontFamily: F.mono,
          fontSize: 32,
          letterSpacing: '0.42em',
          color: mix(C.inkSoft, C.gray, drain),
          opacity: 0.75 * clamp01((t - 1.0) / 0.8),
          marginBottom: 34,
          textTransform: 'uppercase',
        }}
      >
        now playing
      </div>

      <div style={{display: 'flex', alignItems: 'flex-end', gap: 22}}>
        {LETTERS.map((ch, i) => {
          const startF = letterStart(i);
          const p = clamp01((f - startF + 2) / 8);
          const pop = easeOutBack(p, 2.6);
          const rot = (rnd(i + 1) - 0.5) * 9 + Math.sin(f / 30 + i) * 0.8;
          const bob = Math.sin(f / 22 + i * 0.9) * 7 * p;
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                fontFamily: F.round,
                fontWeight: 700,
                fontSize: 320,
                lineHeight: 1,
                color: C.ink,
                background: mix(COLOR[i], C.gray, drain),
                padding: '0.02em 0.10em 0.05em',
                borderRadius: 62,
                boxShadow: `0 20px 0 ${withAlpha(C.ink, 0.14)}, 0 34px 60px ${withAlpha(C.ink, 0.12)}`,
                transform: `translateY(${(1 - pop) * -240 + bob}px) rotate(${rot}deg) scale(${0.7 + 0.3 * pop})`,
                opacity: p,
                visibility: p <= 0.01 ? 'hidden' : 'visible',
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 54,
          display: 'flex',
          alignItems: 'baseline',
          gap: 26,
          opacity: subP * (1 - out),
          transform: `translateY(${(1 - subP) * 26}px)`,
        }}
      >
        <span
          style={{
            fontFamily: F.round,
            fontWeight: 600,
            fontSize: 96,
            color: C.ink,
            letterSpacing: '0.02em',
          }}
        >
          s0rrow
        </span>
        <span
          style={{
            fontFamily: F.mono,
            fontSize: 32,
            letterSpacing: '0.3em',
            color: withAlpha(C.ink, 0.55),
          }}
        >
          SORROW RECORDS · 2025
        </span>
      </div>
    </div>
  );
};

/** 右下角常驻的小字，像 MV 的片头角标 */
export const Credit: React.FC<{opacity: number; drain: number}> = ({opacity, drain}) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: 120,
        bottom: 92,
        fontFamily: F.mono,
        fontSize: 30,
        letterSpacing: '0.28em',
        color: withAlpha(C.ink, 0.5),
        opacity,
        textTransform: 'uppercase',
      }}
    >
      s0rrow — unhappy
    </div>
  );
};

