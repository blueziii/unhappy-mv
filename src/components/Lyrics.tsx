import React from 'react';
import {spring, useCurrentFrame} from 'remotion';
import linesJson from '../data/words.json';
import {C, F, FPS, H, W, clamp01, sf, mix} from '../theme';
import {pulse} from '../lib/beat';
import {withAlpha} from './Backdrop';

type Word = { w: string; s: number; e: number };
type Line = { i: number; text: string; start: number; end: number; peak: number; words: Word[]; zh?: string };

const LINES = linesJson as unknown as Line[];

// 中文翻译用系统字体（英文贴纸字体没有汉字字形）
const ZH_FONT = "'WenKai', 'LXGW WenKai', 'Microsoft YaHei', serif";

/** 中文里和英文 SAD_WORDS 对应的情绪词，单独上糖果红 */
const ZH_STYLE = 1; // 1=纸带便签 2=逐字浮现 3=手写圈注+印章
const ZH_MT = 0.22;
const ZH_GAP = 0.55;
const ZH_KW_WORDS = ['难过', '难堪', '洞', '百叶窗'];
const ZH_KW_RE = new RegExp('(' + ZH_KW_WORDS.join('|') + ')');

const rnd = (seed: number) => {
  const x = Math.sin(seed * 91.7 + 47.3) * 43758.5453;
  return x - Math.floor(x);
};

const SAD_WORDS = new Set(['ugly', 'unhappy', 'misery', 'heart', 'blinds', 'piercing', 'love', 'dont']);
const norm = (w: string) => w.toLowerCase().replace(/[^a-z']/g, '').replace(/'/g, '');

const isChorus = (i: number) => (i >= 6 && i <= 11) || (i >= 16 && i <= 21);

/** 每个词：贴纸底 + 弹跳进场 + 唱到时放大 */
const WordSticker: React.FC<{
  word: Word;
  index: number;
  lineIndex: number;
  size: number;
  sticker: boolean;
  color: string;
  ink: string;
  dim: number;
  dark?: boolean;
  nextS: number;
}> = ({word, index, lineIndex, size, sticker, color, ink, dim, dark, nextS}) => {
  const f = useCurrentFrame();
  const startF = sf(word.s);
  const endF = sf(word.e);
  const key = norm(word.w);
  const sad = SAD_WORDS.has(key) && key !== 'love' && key !== 'dont';
  const giant = key === 'unhappy';

  // 弹簧进场：先冲过头再回落，像真的有重量
  const sp = spring({
    frame: Math.max(0, f - (startF - 4)),
    fps: FPS,
    config: {mass: 0.55, damping: 10, stiffness: 150},
  });
  const pop = Math.max(0, Math.min(1.32, sp));
  const lit = f >= startF - 3;

  // 强调窗口至少延续到下一个词开口（对齐器偶尔给出极短的词时长）
  const active = f >= startF && f <= Math.max(endF + 6, sf(nextS));
  const sinceStart = Math.max(0, f - startF);
  // 阻尼振荡：被唱到时“被敲了一下”，能量慢慢散掉
  const decay = active || sinceStart < 26 ? Math.exp(-sinceStart / 20) : 0;
  const osc = Math.sin(sinceStart / 2.3) * decay;
  const wobble = Math.sin(sinceStart / 7 + index) * (active ? 1.1 : 0.4);
  const beat = pulse(f, 12);

  // 和片头标题一样的浮动：每个贴纸有自己的相位，慢慢上下飘、轻轻转
  const bob = Math.sin(f / (22 + (index % 3) * 5) + lineIndex * 0.8 + index * 0.9) * 8 * pop;
  const sway = Math.sin(f / 30 + index * 1.1 + lineIndex * 0.5) * 0.9;
  const rot = (rnd(lineIndex * 13 + index) - 0.5) * 6 + wobble + osc * 1.6 + sway;
  const scale = (0.62 + 0.38 * pop) * (active ? 1 + 0.045 + 0.03 * beat + 0.05 * osc : 1);
  const ty = (1 - pop) * 54 + (active ? -6 - 8 * beat - 9 * osc : 0) + bob;

  const ugly = key === 'ugly';
  const jit = ugly && active ? Math.sin(f * 1.9) * 3.2 : 0;
  const ghost = ugly && active
    ? `3px 0 ${withAlpha(C.candy, 0.42)}, -3px 0 ${withAlpha(C.sky, 0.42)}`
    : undefined;
  const fontSize = giant ? size * 2.05 : sad ? size * 1.16 : size;
  // 最大的那张 "unhappy" 贴纸：唱到之后左半边还粘着，右半边慢慢垂下来（半掉不掉）
  const peel = giant && lit ? clamp01((sinceStart - 5) / 46) : 0;
  const flap = Math.sin(f / 9) * 1.2 * peel;
  const pad = giant ? '0.06em 0.24em' : '0.08em 0.32em';

  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: sad || giant ? F.hand : F.round,
        fontWeight: giant ? 700 : sad ? 700 : 600,
        fontSize,
        lineHeight: 1.06,
        color: lit
          ? sticker
            ? giant
              ? C.candy
              : ink
            : sad
            ? dark
              ? C.candySoft
              : C.candy
            : dark
            ? C.paper
            : ink
          : withAlpha(dark ? C.paper : ink, dark ? 0.82 : 0.75),
        background: lit && sticker ? (giant ? C.paper : dark ? mix(color, C.paper, 0.24) : color) : 'transparent',
        padding: sticker ? pad : '0 0.02em',
        borderRadius: giant ? 26 : 40,
        position: 'relative',
        boxShadow:
          lit && sticker
            ? giant
              ? `${-34 * peel}px ${26 + 30 * peel}px ${10 + 40 * peel}px ${withAlpha(C.ink, 0.12 + 0.16 * peel)}, 0 16px 0 ${withAlpha(
                  C.ink,
                  0.12 * (1 - peel)
                )}`
              : `13px 15px 0 ${withAlpha(C.ink, 0.13)}, 28px 34px 46px ${withAlpha(C.ink, 0.12)}, inset 0 0 0 2px ${withAlpha(
                  C.paper,
                  0.26,
                )}, inset -7px -9px 14px ${withAlpha(C.ink, 0.09)}`
            : 'none',
        textShadow: ghost ?? (dark && lit && !sticker ? `0 0 30px ${withAlpha(C.paper, 0.3)}` : undefined),
        textDecoration: ugly && active ? 'line-through' : undefined,
        textDecorationColor: withAlpha(C.candy, 0.85),
        textDecorationThickness: ugly && active ? '7px' : undefined,
        transform: lit
          ? giant
            ? `translateY(${ty}px) rotate(${rot}deg) scale(${scale}) perspective(2000px) rotateZ(${(11 * peel).toFixed(2)}deg) rotateX(${(
                -8 * peel + flap
              ).toFixed(2)}deg) translateY(${(7 * peel).toFixed(1)}px)`
            : `translateX(${jit.toFixed(2)}px) translateY(${ty}px) rotate(${rot}deg) scale(${scale})`
          : `rotate(${(rnd(lineIndex * 13 + index) - 0.5) * 3}deg) scale(0.92)`,
        transformOrigin: giant ? '9% 96%' : '50% 60%',
        opacity: lit ? 1 : 0.5,
        visibility: 'visible',
        whiteSpace: 'nowrap',
        letterSpacing: giant ? '-0.01em' : 0,
        filter: dim > 0 ? `grayscale(${dim * 0.7}) saturate(${1 - dim * 0.6})` : undefined,
      }}
    >
      {word.w}
      {giant && peel > 0.01 ? (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 26,
            background: `linear-gradient(104deg, ${withAlpha(C.ink, 0)} 34%, ${withAlpha(C.ink, 0.07 * peel)} 66%, ${withAlpha(
              C.ink,
              0.22 * peel
            )} 100%)`,
            boxShadow: `inset ${-26 * peel}px ${-14 * peel}px ${30 * peel}px ${withAlpha(C.ink, 0.14 * peel)}`,
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </span>
  );
};

/** 逐句浮现的歌词层 */
export const LyricStage: React.FC<{drain: number; dark?: boolean}> = ({drain, dark}) => {
  const f = useCurrentFrame();
  const ink = mix(C.ink, C.grayDark, drain);
  const palette = [C.butter, C.mint, C.sky, C.candySoft, C.pink, C.lavender];

  return (
    <div style={{position: 'absolute', inset: 0}}>
      {LINES.map((line, li) => {
        const inChorus = isChorus(li);
        const startF = sf(line.start);
        const lastEndF = sf(line.words[line.words.length - 1].e);
        const next = LINES[li + 1];
        const nextStartF = next ? sf(next.start) : 1e9; // 最后一句没有下一句（原来误用了 H=2160，导致末句永远被判定为已退场）
        // 关键：上一句必须在下一句进场之前彻底走完，否则两句叠在一起
        const LEAD = 6; // 进场提前量
        const OUT_DUR = 10; // 退场时长
        const CLEAR = 9; // 句与句之间的空场
        // 末句唱完就尽快退场（后面要接红心），其余句子靠"下一句进场前必须走完"来定
        const tailPad = next ? (inChorus ? 70 : 55) : 8;
        const outStart = Math.min(nextStartF - OUT_DUR - CLEAR, lastEndF + tailPad);
        if (f < startF - LEAD || f > outStart + OUT_DUR + 2) return null;

        const out = clamp01((f - outStart) / OUT_DUR);
        const len = line.text.length;
        const base = inChorus ? 236 : 200;
        const bx = line.text.includes('(') ? 0.92 : 1;
        const size = (len > 34 ? base * 0.54 : len > 27 ? base * 0.64 : len > 21 ? base * 0.8 : base) * bx;
        // 长句左右错位的幅度要跟着"还剩多少余量"走，否则整句会被推出画面中线
        // 中文单独定尺寸：跟着英文缩放但设下限，保证 4K 下也够大
        const zhSize = Math.min(Math.max(size * 0.46, 64), 104);
        const estPx = estimateEm(line, inChorus) * size;
        const slack = clamp01((W * 0.8 - estPx) / (W * 0.32));
        const offsetX = OFFSET_X[li % OFFSET_X.length] * slack;

        return (
          <div
            key={li}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: H * (inChorus ? (li % 2 === 0 ? 0.475 : 0.53) : li % 2 === 0 ? 0.45 : 0.55),
              transform: `translateY(-50%)`,
              display: 'flex',
              justifyContent: 'center',
              paddingLeft: W * 0.06,
              paddingRight: W * 0.06,
              opacity: Math.max(0, 1 - out * 1.15),
              filter: out > 0.01 ? `blur(${(out * 10).toFixed(1)}px)` : undefined,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: W * 0.84,
                transform: `translateY(${-out * 78}px) translateX(${offsetX.toFixed(1)}px) scale(${(1 - out * 0.06).toFixed(3)})`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  alignItems: 'center',
                  columnGap: giantGap(size),
                  rowGap: size * 0.22,
                  maxWidth: '100%',
                  position: 'relative',
                  zIndex: 2, // 英文贴纸永远压中文一层
                }}
              >
              {line.words.map((w, wi) => {
                const sticker = inChorus ? true : wi % 2 === 0;
                const color = palette[(li * 3 + wi) % palette.length];
                return (
                  <WordSticker
                    key={wi}
                    word={w}
                    index={wi}
                    lineIndex={li}
                    size={size}
                    sticker={sticker}
                    color={color}
                    ink={ink}
                    dim={drain}
                    dark={dark}
                    nextS={wi + 1 < line.words.length ? line.words[wi + 1].s : line.end}
                  />
                );
              })}
              </div>
              {line.zh ? (() => {
                // 中文跟英文贴纸同款动效：弹入 + 常态浮动 + 关键词圈"画出来"
                const zs = spring({frame: Math.max(0, f - startF - 5), fps: FPS, config: {mass: 0.6, damping: 11, stiffness: 160}});
                const zPop = Math.max(0, Math.min(1.28, zs));
                const zBob = Math.sin(f / (26 + (line.i % 3) * 6) + line.i * 1.3) * 7 * clamp01(zPop);
                const zSway = Math.sin(f / 34 + line.i * 0.9) * 0.7;
                const ringIn = clamp01((f - startF - 22) / 12);
                return (
                <div
                  style={{
                    marginTop: size * ZH_MT,
                    position: 'relative',
                    zIndex: 1,
                    transform: `translateY(${((1 - zPop) * 46 + zBob).toFixed(1)}px) rotate(${zSway.toFixed(2)}deg) scale(${zPop.toFixed(3)})`,
                    opacity: clamp01((f - startF - 2) / 8),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: zhSize * ZH_GAP,
                    maxWidth: '100%',
                  }}
                >
                  {ZH_STYLE === 1 ? (
                    // A：纸带便签（两条纸边 + 关键词大字 + 红笔下划）
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: zhSize * 0.2,
                        padding: `${(zhSize * 0.3).toFixed(0)}px ${(zhSize * 0.68).toFixed(0)}px`,
                        background: dark ? 'rgba(92,88,132,0.52)' : 'rgba(255,253,247,0.92)',
                        borderRadius: 40, // 与英文贴纸同一个圆角
                        transform: 'rotate(-0.6deg)',
                        boxShadow: dark
                          ? '0 10px 34px rgba(12,10,30,0.5), 0 0 26px rgba(190,186,232,0.16)'
                          : '0 10px 26px rgba(43,43,52,0.16)',
                        backdropFilter: dark ? 'blur(2px)' : undefined,
                        border: `${Math.max(1, zhSize * 0.02).toFixed(1)}px solid ${
                          dark ? 'rgba(206,202,238,0.34)' : withAlpha(C.ink, 0.1)
                        }`,
                      }}
                    >
                      {line.zh.split(ZH_KW_RE).map((part, zi) =>
                        ZH_KW_WORDS.includes(part) ? (
                          <span
                            key={zi}
                            style={{
                              fontFamily: ZH_FONT,
                              fontSize: zhSize * 1.32,
                              fontWeight: 700,
                              color: dark ? '#F6A896' : C.candy,
                              position: 'relative',
                              display: 'inline-block',
                            }}
                          >
                            {part}
                            {/* 红笔随手圈的椭圆 */}
                            <span
                              style={{
                                position: 'absolute',
                                inset: `${-zhSize * 0.24}px ${-zhSize * 0.3}px`,
                                border: `${Math.max(2.5, zhSize * 0.055).toFixed(1)}px solid ${
                                  dark ? '#F6A896' : C.candy
                                }`,
                                borderRadius: '50%',
                                transform: `rotate(${(-7 + (1 - ringIn) * 14).toFixed(1)}deg) scale(${(0.6 + 0.4 * ringIn).toFixed(2)})`,
                                opacity: 0.9 * ringIn,
                              }}
                            />
                          </span>
                        ) : (
                          <span
                            key={zi}
                            style={{
                              fontFamily: ZH_FONT,
                              fontSize: zhSize,
                              fontWeight: 600,
                              letterSpacing: '0.08em',
                              color: dark ? withAlpha(C.paper, 0.88) : withAlpha(C.ink, 0.78),
                            }}
                          >
                            {part}
                          </span>
                        ),
                      )}
                    </div>
                  ) : ZH_STYLE === 2 ? (
                    // B：逐字浮现 + 双色 + 引导点（无纸带，像字幕机）
                    <div style={{display: 'flex', alignItems: 'center', gap: zhSize * 0.1}}>
                      {Array.from(line.zh).map((ch, ci) => {
                        const lit = clamp01((f - startF - ci * 2.2) / 7);
                        const isKw = ZH_KW_WORDS.some((w) => line.zh!.includes(w) && w.includes(ch));
                        return (
                          <span
                            key={ci}
                            style={{
                              fontFamily: ZH_FONT,
                              fontSize: zhSize * (isKw ? 1.14 : 1),
                              fontWeight: isKw ? 700 : 500,
                              color: isKw
                                ? dark ? '#F6A896' : C.candy
                                : dark ? withAlpha(C.paper, 0.86) : withAlpha(C.ink, 0.74),
                              opacity: lit,
                              transform: `translateY(${(1 - lit) * zhSize * 0.3}px)`,
                              letterSpacing: '0.04em',
                              textShadow: dark ? '0 0 18px rgba(255,253,247,0.28)' : '0 2px 14px rgba(255,253,247,0.85)',
                            }}
                          >
                            {ch}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    // C：手写圈注 + 印章
                    <div style={{display: 'flex', alignItems: 'center', gap: zhSize * 0.28}}>
                      <span
                        style={{
                          fontFamily: ZH_FONT,
                          fontSize: zhSize,
                          fontWeight: 600,
                          letterSpacing: '0.08em',
                          color: dark ? withAlpha(C.paper, 0.84) : withAlpha(C.ink, 0.74),
                        }}
                      >
                        {line.zh.split(ZH_KW_RE).map((part, zi) =>
                          ZH_KW_WORDS.includes(part) ? (
                            <span key={zi} style={{position: 'relative', display: 'inline-block', color: dark ? '#F6A896' : C.candy}}>
                              {part}
                              <span
                                style={{
                                  position: 'absolute',
                                  inset: `${-zhSize * 0.22}px ${-zhSize * 0.26}px`,
                                  border: `${Math.max(2, zhSize * 0.05).toFixed(1)}px solid ${dark ? '#F6A896' : C.candy}`,
                                  borderRadius: '50%',
                                  transform: 'rotate(-7deg)',
                                  opacity: 0.85,
                                }}
                              />
                            </span>
                          ) : (
                            <span key={zi}>{part}</span>
                          ),
                        )}
                      </span>
                    </div>
                  )}
                </div>
                );
              })() : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const giantGap = (size: number) => size * 0.16;

/** 粗略估算一句歌词排成一行时有多少 em 宽（含贴纸内边距与词间距） */
const estimateEm = (line: Line, inChorus: boolean) => {
  let em = 0;
  line.words.forEach((w, wi) => {
    const key = norm(w.w);
    const sad = SAD_WORDS.has(key) && key !== 'love' && key !== 'dont';
    const giant = key === 'unhappy';
    const m = giant ? 2.05 : sad ? 1.16 : 1;
    const sticker = inChorus ? true : wi % 2 === 0;
    const padEm = sticker ? (giant ? 0.48 : 0.64) : 0.04;
    em += (w.w.length * (sad || giant ? 0.46 : 0.58) + padEm) * m;
  });
  em += Math.max(0, line.words.length - 1) * 0.16;
  return em;
};

/** 每一句左右错开一点，画面不至于从头到尾一个站位 */
const OFFSET_X = [0, -150, 120, -80, 160, -120];
