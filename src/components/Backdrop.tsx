import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, H, W, mix, rgba} from '../theme';
import {pulse} from '../lib/beat';
import grain0 from '../assets/tex/grain_0.png';
import grain1 from '../assets/tex/grain_1.png';
import grain2 from '../assets/tex/grain_2.png';
import grain3 from '../assets/tex/grain_3.png';

// 4 张颗粒轮流上，画面才有"胶片呼吸"，不再是一张死图铺到底
const GRAINS = [grain0, grain1, grain2, grain3];
const grainAt = (f: number, k: number) => GRAINS[(Math.floor(f / 3) + k) % GRAINS.length];
const drift = (f: number, speed: number, span: number) => `${((f * speed) % span).toFixed(2)}px`;

const parse = (color: string): [number, number, number] => {
  if (color.startsWith('#')) {
    const s = color.slice(1);
    return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  }
  const m = color.match(/(\d+(?:\.\d+)?)/g) ?? ['0', '0', '0'];
  return [Number(m[0]), Number(m[1]), Number(m[2])];
};

export const withAlpha = (color: string, a: number): string => {
  const [r, g, b] = parse(color);
  return `rgba(${r}, ${g}, ${b}, ${Math.min(1, Math.max(0, a))})`;
};

export type BackdropProps = {
  top: string;
  bottom: string;
  blobA: string;
  blobB: string;
  blobC: string;
  drain: number;
  night?: number;
};

/**
 * 底：糖果色渐变 + 缓慢漂浮的柔光斑 + 纸纹颗粒 + 暗角
 */
export const Backdrop: React.FC<BackdropProps> = ({top, bottom, blobA, blobB, blobC, drain, night = 0}) => {
  const f = useCurrentFrame();
  // 暗色调：把底板压成同一个夜蓝，避免"糖果色 × 深色"调出发闷的棕
  const nm = (c: string) => (night > 0.002 ? mix(c, C.night, 0.35 * night) : c);
  const topC = nm(top);
  const botC = nm(bottom);
  const aC = nm(blobA);
  const bC = nm(blobB);
  const cC = nm(blobC);
  const p = pulse(f, 22);
  const ax = Math.sin(f / 210) * 90;
  const ay = Math.cos(f / 260) * 70;
  const bx = Math.cos(f / 300) * 110;
  const by = Math.sin(f / 240) * 60;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: `linear-gradient(170deg, ${topC} 0%, ${botC} 100%)`}} />
      {/* 柔光斑：让背景有呼吸感 */}
      <div
        style={{
          position: 'absolute',
          left: -600 + ax,
          top: -700 + ay,
          width: 2600,
          height: 2600,
          background: `radial-gradient(circle at 50% 50%, ${withAlpha(aC, 0.5 * (0.75 + p * 0.25))} 0%, ${withAlpha(
            aC,
            0
          )} 62%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: W - 1500 + bx,
          top: H - 1500 + by,
          width: 2400,
          height: 2400,
          background: `radial-gradient(circle at 50% 50%, ${withAlpha(bC, 0.45)} 0%, ${withAlpha(bC, 0)} 60%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: W / 2 - 900 + bx * 0.6,
          top: -400 + by,
          width: 1800,
          height: 1400,
          background: `radial-gradient(circle at 50% 50%, ${withAlpha(cC, 0.4)} 0%, ${withAlpha(cC, 0)} 65%)`,
        }}
      />
      {/* 顶部日光晕：给上沿一点热度，别让画面发灰 */}
      <div
        style={{
          position: 'absolute',
          left: W * 0.5 - 1900,
          top: -1250 + ay * 0.5,
          width: 3800,
          height: 2400,
          background: `radial-gradient(ellipse at 50% 50%, ${withAlpha(C.paper, 0.55 * (1 - drain * 0.9) * (1 - night))} 0%, ${withAlpha(
            C.paper,
            0
          )} 58%)`,
        }}
      />
      {/* 纸纹 */}
      <AbsoluteFill
        style={{
          backgroundImage: `url(${grainAt(f, 0)})`,
          backgroundSize: '560px 560px',
          backgroundPosition: `${drift(f, 0.35, 560)} ${drift(f, 0.22, 560)}`,
          opacity: 0.16,
          mixBlendMode: 'multiply',
        }}
      />
      {/* 慢速颗粒闪动 */}
      <AbsoluteFill
        style={{
          backgroundImage: `url(${grainAt(f, 2)})`,
          backgroundSize: '300px 300px',
          backgroundPosition: `${drift(f, 0.5, 300)} ${drift(f, -0.31, 300)}`,
          opacity: 0.1 + 0.04 * p,
          mixBlendMode: 'soft-light',
        }}
      />
      {/* 暗角 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 42%, ${rgba(
            drain > 0.5 ? C.night : C.ink,
            0.16 + 0.32 * drain
          )} 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
