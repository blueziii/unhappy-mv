import {FPS} from '../theme';

type AudioData = {
  duration: number;
  fps: number;
  frames: number;
  energy: number[];
  low: number[];
  mid: number[];
  high: number[];
  flux: number[];
  onsets: number[];
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
import raw from '../data/audio.json';

const A = raw as unknown as AudioData;

const at = (arr: number[], f: number): number => {
  if (!arr.length) return 0;
  const i = Math.round(f);
  return arr[Math.max(0, Math.min(arr.length - 1, i))];
};

export const energyAt = (f: number) => at(A.energy, f);
export const lowAt = (f: number) => at(A.low, f);
export const midAt = (f: number) => at(A.mid, f);
export const highAt = (f: number) => at(A.high, f);
export const fluxAt = (f: number) => at(A.flux, f);

/** 距离最近一个鼓点越近越接近 1，用来做“打点”式的强调 */
export const hitAt = (f: number, win = 11): number => {
  let best = 0;
  for (let i = 0; i < A.onsets.length; i++) {
    const d = f - A.onsets[i] * FPS;
    if (d >= -0.5 && d < win) {
      const v = 1 - d / win;
      if (v > best) best = v;
    }
  }
  return best;
};

/** 某段时间内的平均能量，做段落级的明暗呼吸 */
export const spanEnergy = (fromFrame: number, toFrame: number): number => {
  const a = Math.max(0, Math.round(fromFrame));
  const b = Math.min(A.energy.length - 1, Math.round(toFrame));
  if (b <= a) return energyAt(a);
  let s = 0;
  for (let i = a; i <= b; i++) s += A.energy[i];
  return s / (b - a + 1);
};

export const AUDIO_DURATION = A.duration;
export const ONSETS = A.onsets;
