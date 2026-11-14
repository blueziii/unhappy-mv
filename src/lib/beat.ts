import beatsJson from '../data/beats.json';
import {FPS} from '../theme';

type Beats = { bpm: number; period: number; phase: number; beats: number[]; mag: number[] };

const B = beatsJson as unknown as Beats;

export const BPM = B.bpm;
export const BEAT_PERIOD = B.period;

/**
 * 当前帧距离上一个拍子过去了几帧。没到拍子时为负数。
 */
export const sinceBeat = (f: number): number => {
  const t = f / FPS;
  let best = -999;
  for (let i = 0; i < B.beats.length; i++) {
    const d = t - B.beats[i];
    if (d >= 0 && d > best) best = d;
  }
  return best * FPS;
};

/** 拍点脉冲：拍上为 1，随后指数衰减 */
export const pulse = (f: number, decayFrames = 13): number => {
  const d = sinceBeat(f);
  if (d < 0) return 0;
  return Math.exp(-d / decayFrames);
};

/** 第 n 个拍子（整拍）的脉冲；n=1 每拍, n=4 每小节 */
export const barPulse = (f: number, every = 4, decayFrames = 18): number => {
  const t = f / FPS;
  let idx = -1;
  for (let i = 0; i < B.beats.length; i++) {
    if (B.beats[i] <= t) idx = i;
    else break;
  }
  if (idx < 0) return 0;
  const base = idx - (idx % every);
  const d = (t - B.beats[base]) * FPS;
  if (d < 0) return 0;
  return Math.exp(-d / decayFrames);
};

export const beatIndexAt = (f: number): number => {
  const t = f / FPS;
  let idx = -1;
  for (let i = 0; i < B.beats.length; i++) {
    if (B.beats[i] <= t) idx = i;
    else break;
  }
  return idx;
};

export const BEATS = B.beats;
