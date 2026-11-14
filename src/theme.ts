export const W = 3840;
export const H = 2160;
export const FPS = 60;

// 糖果色外壳 + 一点冷灰；歌是“欢快的节奏讲悲伤的故事”，配色也照这个来
export const C = {
  cream: '#F7EFE1',
  cream2: '#FDF9F0',
  pink: '#F2CFC7',
  candy: '#E7442C',
  candySoft: '#F59A83',
  butter: '#F4C25C',
  mint: '#A8CDBB',
  sky: '#AFCCE4',
  lavender: '#C9C0E4',
  ink: '#2B2B34',
  inkSoft: '#575765',
  paper: '#FFFDF7',
  bone: '#E9E5DB',
  gray: '#9A9AA2',
  grayDark: '#4A4A52',
  night: '#101014',
};

export const F = {
  round: '"Fredoka", "Baloo 2", sans-serif',
  baloo: '"Baloo 2", "Fredoka", sans-serif',
  hand: '"Caveat", "Instrument Serif", cursive',
  serif: '"Instrument Serif", Georgia, serif',
  mono: '"Space Mono", ui-monospace, monospace',
};

/** 同时接受 #rrggbb 与 mix() 产出的 rgb()/rgba()，否则二次 mix 会算出 NaN 变纯黑 */
const hex2rgb = (h: string): [number, number, number] => {
  const rgb = h.match(/rgba?\(([^)]+)\)/i);
  if (rgb) {
    const [r, g, b] = rgb[1].split(',').map((v) => parseFloat(v));
    return [r || 0, g || 0, b || 0];
  }
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16) || 0, parseInt(s.slice(2, 4), 16) || 0, parseInt(s.slice(4, 6), 16) || 0];
};

/** 两个颜色按 k (0..1) 插值，返回 rgb() */
export const mix = (a: string, b: string, k: number): string => {
  const kk = Math.min(1, Math.max(0, k));
  const [r1, g1, b1] = hex2rgb(a);
  const [r2, g2, b2] = hex2rgb(b);
  return `rgb(${Math.round(r1 + (r2 - r1) * kk)}, ${Math.round(g1 + (g2 - g1) * kk)}, ${Math.round(
    b1 + (b2 - b1) * kk
  )})`;
};

export const rgba = (hex: string, alpha: number): string => {
  const [r, g, b] = hex2rgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * clamp01(k);

export const easeOut = (k: number) => 1 - Math.pow(1 - clamp01(k), 3);
export const easeIn = (k: number) => Math.pow(clamp01(k), 3);
export const easeInOut = (k: number) => {
  const x = clamp01(k);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/** 带一点回弹的进场曲线，贴纸“啪”地弹出来的感觉 */
export const easeOutBack = (k: number, s = 1.9) => {
  const x = clamp01(k) - 1;
  return 1 + (s + 1) * x * x * x + s * x * x;
};

/** 秒 -> 帧 */
export const sf = (sec: number) => Math.round(sec * FPS);
