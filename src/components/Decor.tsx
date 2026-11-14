import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, FPS, H, W, lerp, clamp01, easeInOut, mix} from '../theme';
import {pulse} from '../lib/beat';
import {lowAt, midAt, highAt} from '../lib/audio';
import {withAlpha} from './Backdrop';

const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** 3D 视差层：translateZ 之后用 scale 抵消透视缩放，只留下位移差 */
export const PARALLAX_P = 12000;

/** 镜头偏航/俯仰：各层按自己的 z 主动算位移，不依赖 3D 排序（3D 排序会被 filter 压平） */
export const CamCtx = React.createContext<{yaw: number; pitch: number}>({yaw: 0, pitch: 0});

export const Layer: React.FC<{z: number; children: React.ReactNode}> = ({z, children}) => {
  const cam = React.useContext(CamCtx);
  const yr = (cam.yaw * Math.PI) / 180;
  const pr = (cam.pitch * Math.PI) / 180;
  // 真实透视里镜头一转，深度 z 处的物体会多走 z·sin(θ)；这里直接算，越远动得越慢（反向）
  const px = z * Math.sin(yr);
  const py = -z * Math.sin(pr);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transform: `translate(${px.toFixed(2)}px, ${py.toFixed(2)}px)`,
        zIndex: Math.round(z) + 2000,
      }}
    >
      {children}
    </div>
  );
};

/** 纸屑粒子：三层景深 + 真实翻面，近的大而清楚、远的碎而虚 */
export const Confetti: React.FC<{amount: number; drain: number; clean?: number}> = ({amount, drain, clean = 0}) => {
  const f = useCurrentFrame();
  const N = 150;
  const palette = [C.candy, C.butter, C.mint, C.sky, C.lavender, C.candySoft, C.paper];
  return (
    <div style={{position: 'absolute', inset: 0, opacity: amount * (1 - drain * 0.9) * (1 - clean)}}>
      {new Array(N).fill(0).map((_, i) => {
        const depth = rnd(i + 11); // 0 = 远 / 1 = 近
        const size = lerp(7, 46, depth) * (0.65 + rnd(i + 1) * 0.7);
        const speed = lerp(0.4, 3.4, depth) * (0.75 + rnd(i + 2) * 0.8);
        const span = H + 460;
        const x0 = rnd(i + 3) * W;
        const y0 = rnd(i + 4) * span;
        const y = ((((y0 - (f * speed) % span) % span) + span) % span) - 220;
        const sway = Math.sin(f / (38 + depth * 26) + i * 1.7) * (34 + depth * 96);
        const x = x0 + sway + Math.sin(f / 7 + i * 2.3) * 3 * depth;
        // 纸片的翻转是"每秒 0.5~2.5 圈"，不是电风扇：原值最快到 230°/帧（≈38 圈/秒）
        const spin = f * (0.08 + rnd(i + 5) * 0.35) * (0.4 + depth) + i * 37;
        const flipA = f * lerp(3, 15, depth) * (0.6 + rnd(i + 8) * 0.7) + i * 53;
        const flipB = f * lerp(2, 11, depth) * (0.7 + rnd(i + 9) * 0.7) + i * 29;
        const color = palette[i % palette.length];
        const kind = Math.floor(rnd(i + 6) * 3);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: size,
              height: kind === 1 ? size * 2.1 : size,
              background: color,
              borderRadius: kind === 0 ? '50%' : kind === 1 ? size * 0.5 : '3px 3px 45% 3px',
              transform: `rotate(${spin}deg) rotateY(${flipA}deg) rotateX(${flipB}deg)`,
              opacity: (0.28 + rnd(i + 7) * 0.55) * (0.45 + depth * 0.65),
              filter: undefined,
              boxShadow: depth > 0.75 ? `0 ${size * 0.14}px ${size * 0.26}px ${withAlpha(C.ink, 0.1)}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
};

/** 空气里的浮尘：靠景深与模糊让画面“有空气” */
export const Dust: React.FC<{opacity: number; drain: number}> = ({opacity, drain}) => {
  const f = useCurrentFrame();
  const N = 190;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: opacity * (1 - drain * 0.7)}}>
      {new Array(N).fill(0).map((_, i) => {
        const depth = rnd(i + 71);
        const size = lerp(3, 13, depth);
        const span = H + 260;
        const y = ((((rnd(i + 72) * span - f * lerp(0.12, 0.9, depth)) % span) + span) % span) - 130;
        const x = rnd(i + 73) * W + Math.sin(f / 70 + i) * (20 + depth * 46);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${withAlpha(
                i % 3 === 0 ? C.paper : C.bone,
                0.55 + rnd(i + 74) * 0.4
              )} 0%, ${withAlpha(C.paper, 0)} 70%)`,
              opacity: (0.16 + rnd(i + 75) * 0.26) * (0.5 + depth * 0.7),
            }}
          />
        );
      })}
    </div>
  );
};

/** 大雨：尾奏与百叶窗段落用，两层景深，带运动模糊感 */
export const RainHeavy: React.FC<{opacity: number; dark?: boolean}> = ({opacity, dark}) => {
  const f = useCurrentFrame();
  const N = 130;
  const col = dark ? C.bone : C.paper;
  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      {new Array(N).fill(0).map((_, i) => {
        const depth = rnd(i + 121);
        const len = lerp(90, 420, depth) * (0.7 + rnd(i + 122) * 0.6);
        const w = lerp(2, 6, depth);
        const speed = lerp(26, 78, depth) * (0.8 + rnd(i + 123) * 0.5);
        const span = H + 520;
        const y = ((((rnd(i + 124) * span - f * speed) % span) + span) % span) - 260;
        const x = rnd(i + 125) * (W + 500) - 250 + (y / H) * 26;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: w,
              height: len,
              borderRadius: w,
              background: `linear-gradient(to bottom, ${withAlpha(col, 0)} 0%, ${withAlpha(col, 0.5)} 55%, ${withAlpha(
                col,
                0.1
              )} 100%)`,
              transform: `rotate(7deg)`,
              filter: undefined,
              opacity: 0.1 + depth * 0.34,
            }}
          />
        );
      })}
    </div>
  );
};

/** 室内地面：一条地平线，画面才不是一块漂浮的纸 */
export const RoomFloor: React.FC<{opacity: number; floor: string; drain?: number}> = ({
  opacity,
  floor,
  drain = 0,
}) => {
  const line = H * 0.775;
  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      <div
        style={{
          position: 'absolute',
          left: '-12%',
          right: '-12%',
          top: line,
          bottom: 0,
          background: `linear-gradient(180deg, ${withAlpha(floor, 0.92)} 0%, ${withAlpha(
            floor,
            0.6
          )} 45%, ${withAlpha(floor, 0.28)} 100%)`,
        }}
      />
      {/* 踢脚线 */}
      <div
        style={{
          position: 'absolute',
          left: '-12%',
          right: '-12%',
          top: line - 6,
          height: 12,
          background: withAlpha(C.ink, 0.09 + drain * 0.05),
        }}
      />
      {/* 地板上的一滩光 */}
      <div
        style={{
          position: 'absolute',
          left: '-6%',
          top: line,
          width: '62%',
          height: H * 0.2,
          background: `radial-gradient(ellipse at 34% 0%, ${withAlpha(C.paper, 0.6 - drain * 0.4)} 0%, ${withAlpha(
            C.paper,
            0
          )} 72%)`,
        }}
      />
    </div>
  );
};

/** 盆栽：屋里唯一还活着的东西，叶子跟着拍子摆 */
export const Plant: React.FC<{opacity: number; wilt?: number; drain?: number; night?: number}> = ({
  opacity,
  wilt = 0,
  drain = 0,
  night = 0,
}) => {
  const f = useCurrentFrame();
  const nk = clamp01(night);
  // 暗线：一开始挺拔，越到后面越蔫
  const w = clamp01(wilt);
  const sw = (Math.sin(f / 62) * 1.5 + Math.sin(f / 29) * 0.5) * (1 - w * 0.7);
  // 丛生叶片：从盆土中心向外散开的披针形叶，越靠外越短（一丛虎皮兰／龙舌兰的感觉）
  const leaves = [
    {a: -64, len: 210, wd: 54},
    {a: -42, len: 280, wd: 62},
    {a: -22, len: 336, wd: 68},
    {a: -4, len: 362, wd: 68},
    {a: 16, len: 340, wd: 65},
    {a: 38, len: 288, wd: 60},
    {a: 60, len: 222, wd: 52},
  ];
  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(${W - 500} ${H * 0.775})`}>
          {leaves.map((lf, i) => {
            // 蔫：叶片向外张得更开、变短、叶尖下坠
            const a = lf.a * (1 + w * 1.05) + sw * (1 + i * 0.12);
            const len = lf.len * (1 - w * 0.22);
            const wd = lf.wd * (1 - w * 0.1);
            const sag = 1 + w * 0.9;
            const col = mix(mix(i % 2 ? C.mint : '#7FA98F', C.grayDark, w * 0.4), C.night, nk * 0.12);
            return (
              <g key={i} transform={`translate(${lf.a * 0.5} 24) rotate(${a})`}>
                <path
                  d={`M0 0 C ${wd} ${(-len * 0.28) / sag}, ${wd * 0.72} ${(-len * 0.8) / sag}, 0 ${-len} C ${
                    -wd * 0.72
                  } ${(-len * 0.8) / sag}, ${-wd} ${(-len * 0.28) / sag}, 0 0 Z`}
                  fill={withAlpha(col, 0.94 - drain * 0.25 - w * 0.08)}
                />
                <path
                  d={`M0 -6 C ${wd * 0.16} ${-len * 0.36}, ${wd * 0.1} ${-len * 0.68}, 0 ${-len * 0.94}`}
                  stroke={withAlpha(C.ink, 0.14)}
                  strokeWidth="4"
                  fill="none"
                />
              </g>
            );
          })}
          {/* 花盆 */}
          <path d="M-110 0 L110 0 L86 200 L-86 200 Z" fill={withAlpha(C.candySoft, 0.9)} />
          <path d="M-118 0 L118 0 L112 34 L-112 34 Z" fill={withAlpha(C.candy, 0.55)} />
        </g>
      </svg>
    </div>
  );
};

/** 台灯：给屋里一个光源，也让暖色有出处 */
export const Lamp: React.FC<{opacity: number; drain?: number; night?: number}> = ({
  opacity,
  drain = 0,
  night = 0,
}) => {
  const f = useCurrentFrame();
  const nk = clamp01(night);
  // 关灯之后主照明熄灭，但这盏台灯还留一点微弱的暖黄余光
  const glow = (0.9 + 0.1 * Math.sin(f / 26)) * (1 - nk * 0.5);
  const nightGlow = nk * (0.85 + 0.12 * Math.sin(f / 31));
  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      {/* 光晕 */}
      <div
        style={{
          position: 'absolute',
          left: 90,
          top: H * 0.2,
          width: 1000,
          height: 1000,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${withAlpha(C.butter, 0.34 * glow * (1 - drain * 0.5) + 0.1 * nightGlow)} 0%, ${withAlpha(
            C.butter,
            0
          )} 68%)`,
        }}
      />
      {/* 夜里灯下的一团暖光 */}
      <div
        style={{
          position: 'absolute',
          left: 40,
          top: H * 0.775 - 860,
          width: 520,
          height: 520,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${withAlpha(C.butter, 0.22 * nightGlow)} 0%, ${withAlpha(C.butter, 0)} 64%)`,
        }}
      />
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(300 ${H * 0.775})`}>
          {/* 灯杆 */}
          <rect x="-7" y="-560" width="14" height="560" fill={withAlpha(C.ink, 0.55)} />
          <ellipse cx="0" cy="6" rx="110" ry="20" fill={withAlpha(C.ink, 0.18)} />
          <ellipse cx="0" cy="4" rx="210" ry="42" fill={withAlpha(C.butter, 0.12 * nightGlow)} />
          {/* 灯罩 */}
          <path
            d="M-150 -700 L150 -700 L96 -560 L-96 -560 Z"
            fill={withAlpha(mix(C.butter, C.night, nk * 0.4), 0.95)}
          />
          <path d="M-150 -700 L150 -700 L140 -726 L-140 -726 Z" fill={withAlpha(C.candySoft, 0.9)} />
          <ellipse cx="0" cy="-556" rx="96" ry="16" fill={withAlpha(mix(C.paper, C.butter, nk), 0.85 * glow * (1 - nk))} />
        </g>
      </svg>
    </div>
  );
};

/** 窗帘：两侧的纱帘，风一过就轻轻荡 */
/** 吊灯：挂在房间上方，灯亮时地面有一滩暖光，灯灭后就只剩一个剪影 */
export const HangingLamp: React.FC<{app: number; on: number; jolt?: number; drain?: number}> = ({
  app,
  on,
  jolt = 0,
  drain = 0,
}) => {
  const f = useCurrentFrame();
  const sway = Math.sin(f / 34) * 1.4 + Math.sin(f / 13) * 0.5 + jolt;
  const lit = clamp01(on);
  const cx = W * 0.5;
  const shadeTop = 150;
  const shadeBot = 330;
  // 光从罩口出来（不是从灯泡）：罩口在 svg 里的 y=168，页面坐标 = shadeTop + 168
  const rimY = shadeTop + 168;
  const rimRx = 148;
  const warm = (0.32 * lit * (1 - drain * 0.4)).toFixed(3);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: clamp01(app), pointerEvents: 'none'}}>
      {/* 灯光锥 */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={withAlpha(C.butter, Number(warm) * 1.6)} />
            <stop offset="55%" stopColor={withAlpha(C.butter, Number(warm) * 0.55)} />
            <stop offset="100%" stopColor={withAlpha(C.butter, 0)} />
          </linearGradient>
          <radialGradient id="pool" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor={withAlpha(C.butter, Number(warm) * 0.9)} />
            <stop offset="100%" stopColor={withAlpha(C.butter, 0)} />
          </radialGradient>
        </defs>
        <ellipse
          cx={cx}
          cy={H * 0.845}
          rx={520 * (0.2 + 0.8 * lit)}
          ry={86 * (0.25 + 0.75 * lit)}
          fill="url(#pool)"
          opacity={0.35 + 0.65 * lit}
        />
        {lit > 0.01 ? (
          <g style={{filter: 'blur(16px)', opacity: 0.35 + 0.65 * lit}}>
            <polygon
              points={`${cx - rimRx},${rimY} ${cx + rimRx},${rimY} ${cx + 660},${H * 0.87} ${cx - 660},${H * 0.87}`}
              fill="url(#cone)"
            />
          </g>
        ) : null}
        <ellipse cx={cx} cy={H * 0.845} rx={520 * (0.35 + 0.65 * lit)} ry={86 * (0.4 + 0.6 * lit)} fill="url(#pool)" />
      </svg>

      {/* 灯绳 + 灯罩 */}
      <div
        style={{
          position: 'absolute',
          left: cx - 5,
          top: -60,
          width: 10,
          height: shadeTop + 60,
          background: withAlpha(C.ink, 0.5),
          transform: `rotate(${sway}deg)`,
          transformOrigin: 'top center',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: cx - 170,
          top: shadeTop,
          width: 340,
          height: shadeBot - shadeTop + 40,
          transform: `rotate(${sway}deg)`,
          transformOrigin: '50% 0%',
        }}
      >
        <svg width={340} height={shadeBot - shadeTop + 40} viewBox="0 0 340 220">
          {/* 灯罩 */}
          <path
            d="M132 0 L208 0 L318 168 L22 168 Z"
            fill={withAlpha(lit > 0.5 ? C.butter : C.inkSoft, 1)}
          />
          <path d="M132 0 L208 0 L204 -14 L136 -14 Z" fill={withAlpha(C.candySoft, 0.9)} />
          {/* 罩口内壁：亮的时候是暖白光 */}
          <ellipse cx="170" cy="168" rx="148" ry="22" fill={withAlpha(lit > 0.5 ? C.paper : C.ink, 1)} />
        </svg>
      </div>
    </div>
  );
};

export const Curtains: React.FC<{opacity: number; drain?: number}> = ({opacity, drain = 0}) => {
  const f = useCurrentFrame();
  const sway = Math.sin(f / 55) * 1.1 + Math.sin(f / 23) * 0.5;
  const folds = 'repeating-linear-gradient(90deg, rgba(255,255,255,0.34) 0px, rgba(255,255,255,0.06) 22px, rgba(255,255,255,0.3) 46px)';
  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      {[0, 1].map((k) => (
        <div
          key={k}
          style={{
            position: 'absolute',
            top: 0,
            [k === 0 ? 'left' : 'right']: 0,
            width: 300,
            height: H,
            transform: `skewX(${(k === 0 ? -1 : 1) * (2.4 + sway)}deg)`,
            transformOrigin: k === 0 ? 'top left' : 'top right',
            background: `linear-gradient(90deg, ${withAlpha(C.paper, 0.62 - drain * 0.35)} 0%, ${withAlpha(
              C.pink,
              0.3 - drain * 0.2
            )} 60%, ${withAlpha(C.paper, 0.05)} 100%)`,
            backgroundImage: folds,
            opacity: 0.9,
          }}
        />
      ))}
      {/* 帘杆 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 74,
          height: 10,
          background: withAlpha(C.ink, 0.18),
        }}
      />
    </div>
  );
};

/** 行李箱：唱到 "pack all my things" 时出现在地上 */
export const Suitcase: React.FC<{app: number; slide?: number; drain?: number}> = ({
  app,
  slide = 0,
  drain = 0,
}) => {
  const f = useCurrentFrame();
  const sl = clamp01(slide);
  const tilt = Math.sin(f / 40) * 0.8;
  const bounce = Math.abs(Math.sin(f / 3.2)) * 10 * sl;
  return (
    <div
      style={{
        position: 'absolute',
        left: W * 0.56,
        top: H * 0.70,
        opacity: app,
        transform: `translate(${-sl * 2500}px, ${(1 - app) * 60 - bounce}px) rotate(${tilt}deg)`,
      }}
    >
      <svg width="520" height="420" viewBox="0 0 520 420">
        <ellipse cx="260" cy="392" rx="200" ry="24" fill={withAlpha(C.ink, 0.16)} />
        <rect x="70" y="120" width="380" height="250" rx="26" fill={withAlpha(C.sky, 0.95 - drain * 0.3)} />
        <rect x="70" y="120" width="380" height="250" rx="26" fill="none" stroke={withAlpha(C.ink, 0.18)} strokeWidth="6" />
        <rect x="96" y="146" width="150" height="198" rx="14" fill={withAlpha(C.paper, 0.35)} />
        <rect x="274" y="146" width="150" height="198" rx="14" fill={withAlpha(C.paper, 0.22)} />
        {/* 提手 */}
        <path d="M210 120 V86 Q210 66 232 66 H288 Q310 66 310 86 V120" fill="none" stroke={withAlpha(C.ink, 0.3)} strokeWidth="12" />
        {/* 轮子 */}
        <circle cx="130" cy="374" r="18" fill={withAlpha(C.ink, 0.4)} />
        <circle cx="390" cy="374" r="18" fill={withAlpha(C.ink, 0.4)} />
      </svg>
    </div>
  );
};

/** 底部律动条：把“欢快的节奏”直接画出来 */
export const Equalizer: React.FC<{opacity: number; flat: number; night?: number}> = ({opacity, flat, night = 0}) => {
  const nk = clamp01(night);
  const f = useCurrentFrame();
  const p = pulse(f, 15);
  const bars = 26;
  const barW = 26;
  const gap = 20;
  const items: React.ReactNode[] = [];
  const palette = [C.candy, C.butter, C.mint, C.sky, C.lavender];
  for (let k = 0; k < bars; k++) {
    // 越靠中间越低频
    const d = Math.abs(k - (bars - 1) / 2) / ((bars - 1) / 2);
    const lag = k * 2.4;
    const band = d < 0.45 ? lowAt(f - lag) : d < 0.75 ? midAt(f - lag) : highAt(f - lag);
    const h = (36 + band * (300 - 120 * d)) * (0.82 + 0.26 * p) * (1 - flat);
    // 夜里有专门的配色：冷调夜灯（靛蓝/青/紫/雾玫瑰/灰绿），不是把白天的颜色压暗
    const nightPal = ['#8B7BC0', '#4E93A8', '#6D86C8', '#A87CA0', '#7FA6B8'];
    const color = mix(palette[k % palette.length], nightPal[k % nightPal.length], nk);
    items.push(
      <div
        key={k}
        style={{
          width: barW,
          height: Math.max(18, h),
          borderRadius: barW / 2,
          background: color,
          opacity: (0.92 + 0.08 * nk) * (1 - 0.22 * nk),
          boxShadow: nk > 0.02
            ? `0 0 ${(20 + 14 * nk).toFixed(0)}px ${withAlpha(color, 0.3 * nk)}`
            : `0 6px 0 ${withAlpha(C.ink, 0.07)}`,
        }}
      />
    );
  }
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 96,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap,
        opacity,
      }}
    >
      {items}
    </div>
  );
};

/** 窗：外面一直在下雨。sadness 涨起来时它会慢慢吞掉整个画面 */
export const RainWindow: React.FC<{grow: number; dim: number; opacity: number}> = ({
  grow,
  dim,
  opacity,
}) => {
  const f = useCurrentFrame();
  const g = easeInOut(grow);
  const w = lerp(780, 3040, g);
  const h = lerp(580, 1740, g);
  const x = lerp(W - 780 - 130, (W - 3040) / 2, g);
  const y = lerp(210, (H - 1740) / 2, g);
  const radius = lerp(48, 26, g);
  // 窗外有多“夜”：暗场（dim 大）和尾奏（g 大）都算
  const night = clamp01(Math.max(g * 1.15, (dim - 0.26) / 0.4));
  const frame = lerp(26, 44, g);
  const drops = 34;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: radius,
        overflow: 'hidden',
        background: `linear-gradient(180deg, ${withAlpha(C.sky, 0.55)} 0%, ${withAlpha(
          C.lavender,
          0.5
        )} 100%)`,
        border: `${frame}px solid ${withAlpha(C.paper, lerp(0.92, 0.22, g))}`,
        boxShadow: `inset 0 0 90px ${withAlpha(C.ink, 0.18)}, 34px 26px 60px ${withAlpha(C.ink, 0.14)}`,
        opacity,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(200deg, ${withAlpha(C.cream2, 0.5)} 0%, ${withAlpha(
            C.grayDark,
            0.22
          )} 100%)`,
        }}
      />
      {/* 雨夜的天空：深蓝紫 + 远方城市的光 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: night * 0.96,
          background: `linear-gradient(178deg, #12102B 0%, #1E1A3E 42%, #2E2A52 78%, #3B3763 100%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: night,
          background: `radial-gradient(ellipse at 50% 96%, ${withAlpha(C.sky, 0.5)} 0%, ${withAlpha(
            C.sky,
            0
          )} 46%)`,
        }}
      />
      <svg width="100%" height="100%" style={{position: 'absolute', inset: 0}}>
        {new Array(drops).fill(0).map((_, i) => {
          const dx = rnd(i + 11) * 100;
          const len = 40 + rnd(i + 12) * 120;
          const speed = 5 + rnd(i + 13) * 12;
          const yy = ((f * speed + rnd(i + 14) * 2000) % (h + len)) - len;
          const tilt = -6 + rnd(i + 15) * 4;
          return (
            <line
              key={i}
              x1={`${dx}%`}
              y1={yy}
              x2={`${dx}%`}
              y2={yy + len}
              stroke={withAlpha(mix('#8FB6CE', C.ink, 0.3), (0.3 + rnd(i + 16) * 0.3) * (1 + g * 1.3) * (1 - night * 0.95))}
              strokeWidth={2 + rnd(i + 17) * 3}
              strokeLinecap="round"
              transform={`rotate(${tilt} ${(dx / 100) * w} ${yy})`}
            />
          );
        })}
        {/* 玻璃上的水珠 */}
        {new Array(16).fill(0).map((_, i) => {
          const cx = rnd(i + 21) * w;
          const cy = rnd(i + 22) * h;
          const r = 3 + rnd(i + 23) * 7;
          const slow = 0.15 + rnd(i + 24) * 0.5;
          const cyy = (cy + f * slow) % h;
          return (
            <circle key={i} cx={cx} cy={cyy} r={r} fill={withAlpha(mix('#9CC0D6', C.paper, 0.3), 0.42 * (1 - 0.35 * night))} />
          );
        })}
      </svg>
      {/* 窗棂：占满画面后淡出，别让十字压着字 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          width: lerp(18, 34, g),
          height: '100%',
          marginLeft: -lerp(9, 17, g),
          background: withAlpha(C.paper, 0.92 * (1 - g)),
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '48%',
          left: 0,
          width: '100%',
          height: lerp(18, 34, g),
          background: withAlpha(C.paper, 0.92 * (1 - g)),
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: withAlpha(C.night, (dim * 0.45 + g * 0.34) * (1 - night * 0.7)),
        }}
      />
      {/* 远处的街灯：只在窗口长大后出现，给尾奏一点温度 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: Math.max(g, night * 0.8),
          background: `radial-gradient(circle at 28% 78%, ${withAlpha(C.butter, 0.42)} 0%, ${withAlpha(
            C.candySoft,
            0.2
          )} 22%, ${withAlpha(C.night, 0)} 58%)`,
        }}
      />
      {/* 玻璃上的反光，让窗还有“玻璃”的体积 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(115deg, ${withAlpha(C.paper, 0.12)} 0%, ${withAlpha(C.paper, 0)} 34%, ${withAlpha(
            C.paper,
            0
          )} 62%, ${withAlpha(C.paper, 0.07)} 100%)`,
        }}
      />
    </div>
  );
};

/** 副歌的放射光：跟着拍子一涨一缩，像舞台灯 */
export const Sunburst: React.FC<{opacity: number; spin?: number; drain?: number}> = ({
  opacity,
  spin = 0.12,
  drain = 0,
}) => {
  const f = useCurrentFrame();
  const p = pulse(f, 24);
  const rot = f * spin;
  return (
    <div
      style={{
        position: 'absolute',
        left: W / 2,
        top: H * 0.5,
        width: 0,
        height: 0,
        opacity: opacity * (0.55 + 0.45 * p),
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: -W,
          top: -W,
          width: W * 2,
          height: W * 2,
          transform: `rotate(${rot}deg)`,
          background: `repeating-conic-gradient(from 0deg, ${withAlpha(C.butter, 0.42)} 0deg 3.5deg, ${withAlpha(
            C.butter,
            0
          )} 4.5deg 16deg)`,
          maskImage: `radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 6%, #000 30%, rgba(0,0,0,0) 64%)`,
          WebkitMaskImage: `radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 6%, #000 30%, rgba(0,0,0,0) 64%)`,
        }}
      />
      {/* 反向慢转的第二层，颜色偏粉，光看起来更厚 */}
      <div
        style={{
          position: 'absolute',
          left: -W,
          top: -W,
          width: W * 2,
          height: W * 2,
          transform: `rotate(${-rot * 0.55}deg)`,
          background: `repeating-conic-gradient(from 0deg, ${withAlpha(C.candySoft, 0.2)} 0deg 7deg, ${withAlpha(
            C.candySoft,
            0
          )} 8deg 34deg)`,
          maskImage: `radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 10%, #000 36%, rgba(0,0,0,0) 70%)`,
          WebkitMaskImage: `radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 10%, #000 36%, rgba(0,0,0,0) 70%)`,
        }}
      />
      {/* 中心的光核 */}
      <div
        style={{
          position: 'absolute',
          left: -1500,
          top: -1500,
          width: 3000,
          height: 3000,
          background: `radial-gradient(circle at 50% 50%, ${withAlpha(C.paper, 0.28)} 0%, ${withAlpha(
            C.butter,
            0.1
          )} 28%, ${withAlpha(C.butter, 0)} 62%)`,
          opacity: 1 - drain,
        }}
      />
    </div>
  );
};

/** 前景虚化光斑：给一点景深，别让画面像一张纸 */
export const Bokeh: React.FC<{opacity: number; drain?: number}> = ({opacity, drain = 0}) => {
  const f = useCurrentFrame();
  const palette = [C.butter, C.candySoft, C.mint, C.lavender, C.paper];
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: opacity * (1 - drain * 0.6),
        mixBlendMode: 'screen',
      }}
    >
      {new Array(9).fill(0).map((_, i) => {
        const size = 90 + rnd(i + 71) * 190;
        const x = rnd(i + 72) * W;
        const y = (rnd(i + 73) * H + Math.sin(f / (60 + i * 9) + i) * 90) % H;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: size * 2.4,
              height: size * 2.4,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${withAlpha(
                palette[i % palette.length],
                0.2 + rnd(i + 74) * 0.14
              )} 0%, ${withAlpha(palette[i % palette.length], 0)} 68%)`,
            }}
          />
        );
      })}
    </div>
  );
};

/** 拍立得：一个人留下的几张照片，飘在第二段主歌里 */
export const Polaroids: React.FC<{opacity: number; drain?: number; night?: number}> = ({
  opacity,
  drain = 0,
  night = 0,
}) => {
  const f = useCurrentFrame();
  const N = 4;
  const captions = ['us', 'summer', 'last time', 'me'];
  const inner = [C.pink, C.sky, C.mint, C.lavender];
  // 四张照片内容各不相同：合影 / 山景 / 空房间的窗 / 撕掉的一张
  const photos: Array<(k: number) => React.ReactNode> = [
    // 0 两张脸的合影
    (k) => (
      <g opacity={0.55}>
        <circle cx="34" cy="44" r="10" fill={withAlpha(C.ink, 0.3 * k + 0.18)} />
        <circle cx="64" cy="40" r="11" fill={withAlpha(C.ink, 0.3 * k + 0.18)} />
        <path d="M16 100 Q18 62 34 60 Q50 62 52 100 Z" fill={withAlpha(C.ink, 0.24)} />
        <path d="M46 100 Q48 58 64 56 Q82 58 84 100 Z" fill={withAlpha(C.ink, 0.2)} />
      </g>
    ),
    // 1 山景 + 太阳
    () => (
      <g opacity={0.5}>
        <circle cx="74" cy="24" r="11" fill={withAlpha(C.butter, 0.85)} />
        <path d="M-2 100 L34 42 L58 74 L74 50 L102 100 Z" fill={withAlpha(C.ink, 0.18)} />
        <path d="M40 100 L68 62 L102 100 Z" fill={withAlpha(C.ink, 0.26)} />
        <line x1="0" y1="86" x2="100" y2="86" stroke={withAlpha(C.ink, 0.14)} strokeWidth="2" />
      </g>
    ),
    // 2 空房间里的窗
    () => (
      <g opacity={0.55}>
        <rect x="24" y="14" width="52" height="66" fill="none" stroke={withAlpha(C.ink, 0.34)} strokeWidth="4" />
        <line x1="50" y1="14" x2="50" y2="80" stroke={withAlpha(C.ink, 0.3)} strokeWidth="3" />
        <line x1="24" y1="46" x2="76" y2="46" stroke={withAlpha(C.ink, 0.3)} strokeWidth="3" />
        <path d="M24 80 L76 80 L96 100 L8 100 Z" fill={withAlpha(C.paper, 0.5)} />
      </g>
    ),
    // 3 撕掉的一角
    () => (
      <g opacity={0.6}>
        <path d="M0 0 L100 0 L100 62 L72 78 L58 100 L0 100 Z" fill={withAlpha(C.paper, 0.62)} />
        <path d="M100 62 L72 78 L58 100" fill="none" stroke={withAlpha(C.ink, 0.22)} strokeWidth="3" />
        <line x1="14" y1="30" x2="70" y2="34" stroke={withAlpha(C.ink, 0.12)} strokeWidth="2" />
        <line x1="14" y1="48" x2="58" y2="51" stroke={withAlpha(C.ink, 0.1)} strokeWidth="2" />
      </g>
    ),
  ];
  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      {new Array(N).fill(0).map((_, i) => {
        const w = [300, 250, 340, 230][i] + rnd(i + 501) * 40;
        const h = w * [1.26, 1.2, 1.3, 1.34][i];
        // 四角各一张，别挤在歌词上
        const slots = [
          [0.02, 0.035],
          [0.885, 0.46],
          [0.22, 0.12],
          [0.315, 0.05],
        ];
        const x = slots[i][0] * W + rnd(i + 502) * 40;
        const y = slots[i][1] * H + rnd(i + 503) * 40;
        const rot = [-7, 9, -14, 5][i] + (rnd(i + 504) - 0.5) * 6;
        // 彩签随歌往下走，一张一张贴上来
        const appAt = [21.2, 33.2, 45.2, 56.6][i];
        const app = clamp01((f - appAt * FPS) / (1.3 * FPS));
        // 结尾：多出来的彩签一张一张从墙上掉下去消失（89.2s 起，每张差 0.8s）
        const fallAt = 87.6 + i * 0.75;
        const fo = clamp01((f / FPS - fallAt) / 0.9);
        if (app <= 0 || fo >= 1) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: w,
              height: h,
              transform: `rotate(${rot + fo * 42}deg) scale(${0.86 + 0.14 * app}) translate(${fo * 40}px, ${(1 - app) * 60 + fo * 1250}px)`,
              opacity: app * (1 - fo),
              background: withAlpha(C.paper, 0.94 - 0.5 * clamp01(night)),
              padding: 18,
              borderRadius: 6,
              boxShadow: `22px 30px 54px ${withAlpha(C.ink, 0.2 + 0.1 * clamp01(night))}, 6px 9px 0 ${withAlpha(C.ink, 0.06)}`,
            }}
          >
            {/* 有的照片用胶带贴在墙上 */}
            {i === 1 || i === 3 ? (
              <div
                style={{
                  position: 'absolute',
                  left: w * 0.5 - 52,
                  top: -16,
                  width: 104,
                  height: 32,
                  transform: `rotate(${i === 1 ? -5 : 4}deg)`,
                  background: withAlpha(i === 1 ? C.mint : C.butter, 0.55),
                  boxShadow: `3px 4px 7px ${withAlpha(C.ink, 0.12)}`,
                }}
              />
            ) : null}
            {/* “照片”内容：一块被雨糊掉的色块 + 几个涂鸦 */}
            <div
              style={{
                width: '100%',
                height: h - 18 * 2 - w * 0.34,
                borderRadius: 3,
                background: `linear-gradient(160deg, ${withAlpha(inner[i], 0.9)} 0%, ${withAlpha(C.gray, 0.55)} 100%)`,
                opacity: 0.9 - drain * 0.4 + 0.06 * clamp01(night),
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                {photos[i](rnd(i + 511))}
              </svg>
            </div>
            <div
              style={{
                marginTop: 8,
                lineHeight: 1,
                fontFamily: '"Caveat", cursive',
                fontSize: 40,
                color: withAlpha(C.inkSoft, 0.75),
                textAlign: 'center',
              }}
            >
              {captions[i]}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** 彩灯串：从左到右垂下来一道，灯泡跟着拍子亮 */
export const StringLights: React.FC<{power?: number; drain?: number; night?: number}> = ({
  power = 1,
  drain = 0,
  night = 0,
}) => {
  const f = useCurrentFrame();
  const bulbs = 15;
  const palette = [C.candy, C.butter, C.mint, C.sky, C.lavender, C.candySoft];
  const sag = 130;
  const yAt = (k: number) => 120 + Math.sin(k * Math.PI) * sag;
  const pts = new Array(bulbs)
    .fill(0)
    .map((_, i) => {
      const k = i / (bulbs - 1);
      return {x: 120 + k * (W - 240), y: yAt(k)};
    });
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  // 关键：整层不做半透明（会透出后面的墙），亮度只体现在灯泡本身的颜色与光晕上
  const lit = clamp01(power);
  const nk = clamp01(night);
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <path d={d} stroke={withAlpha(mix(C.inkSoft, C.night, nk), 0.34)} strokeWidth="4" fill="none" />
        {pts.map((p, i) => {
          const on = Math.max(0, Math.sin(f / 9 + i * 0.9)) * lit * (1 - nk);
          const r = 15 + 4 * on;
          const base = palette[i % palette.length];
          const col = mix(mix(C.bone, base, 0.35 + 0.65 * lit), C.night, nk * 0.78);
          return (
            <g key={i} transform={`rotate(${Math.sin(f / 40 + i) * 6} ${p.x} ${p.y})`}>
              <line x1={p.x} y1={p.y} x2={p.x} y2={p.y + 26} stroke={withAlpha(mix(C.inkSoft, C.night, nk), 0.3)} strokeWidth="3" />
              {/* 光晕只在亮的时候有，且永远不盖出边界 */}
              <circle cx={p.x} cy={p.y + 32} r={r * 2.4} fill={withAlpha(base, (0.16 + 0.2 * on) * lit * (1 - nk * 0.95))} />
              {/* 灯泡本体：不透明，暗的时候变成冷色玻璃 */}
              <circle cx={p.x} cy={p.y + 32} r={r} fill={col} />
              <circle cx={p.x} cy={p.y + 32 - r * 0.34} r={r * 0.42} fill={withAlpha(C.paper, (0.3 + 0.35 * (1 - drain) * lit) * (1 - nk * 0.85))} />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/** 手账纸底纹：细小的涂鸦图案铺满背景，给空画面一点密度 */
export const DoodleWall: React.FC<{opacity: number; accent: string; drain?: number}> = ({
  opacity,
  accent,
  drain = 0,
}) => {
  const f = useCurrentFrame();
  const cols = 13;
  const rows = 9;
  const cw = W / cols;
  const ch = H / rows;
  const drift = (f * 0.12) % ch;
  const ink = drain > 0.4 ? C.grayDark : C.inkSoft;
  return (
    <div
      style={{
        position: 'absolute',
        inset: -ch,
        opacity,
        willChange: 'transform',
        transform: `translateY(${drift * 0.6}px)`,
      }}
    >
      {new Array(rows + 1).fill(0).map((_, r) =>
        new Array(cols).fill(0).map((_, c) => {
          const seed = r * 17 + c * 5;
          const kind = Math.floor(rnd(seed) * 6);
          const size = 54 + rnd(seed + 1) * 74;
          const rot = (rnd(seed + 2) - 0.5) * 40;
          const alt = rnd(seed + 3) > 0.5;
          const o = 0.5 + rnd(seed + 4) * 0.5;
          const shape = (() => {
            const col = alt ? accent : ink;
            switch (kind) {
              case 0:
                return <circle cx="50" cy="50" r="9" fill={col} />;
              case 1:
                return (
                  <g stroke={col} strokeWidth="5" strokeLinecap="round" fill="none">
                    <path d="M32 50 H68" />
                    <path d="M50 32 V68" />
                  </g>
                );
              case 2:
                return (
                  <g stroke={col} strokeWidth="5" strokeLinecap="round" fill="none">
                    <path d="M34 34 L66 66" />
                    <path d="M66 34 L34 66" />
                  </g>
                );
              case 3:
                return <path d="M28 50 A22 22 0 0 1 72 50" stroke={col} strokeWidth="5" fill="none" strokeLinecap="round" />;
              case 4:
                return (
                  <path
                    d="M50 74 C 24 56, 22 34, 38 32 C 46 31, 50 38, 50 42 C 50 38, 54 31, 62 32 C 78 34, 76 56, 50 74 Z"
                    stroke={col}
                    strokeWidth="4.5"
                    fill="none"
                  />
                );
              default:
                return (
                  <path
                    d="M50 26 L57 43 L75 45 L61 57 L65 75 L50 65 L35 75 L39 57 L25 45 L43 43 Z"
                    stroke={col}
                    strokeWidth="4"
                    fill="none"
                  />
                );
            }
          })();
          return (
            <svg
              key={`${r}-${c}`}
              width={size}
              height={size}
              viewBox="0 0 100 100"
              style={{
                position: 'absolute',
                left: c * cw + cw * 0.18,
                top: r * ch + ch * 0.12,
                transform: `rotate(${rot}deg)`,
                opacity: o * 0.62,
              }}
            >
              {shape}
            </svg>
          );
        })
      )}
    </div>
  );
};

/** 慢慢往上飘的小涂鸦：星星、音符、纸飞机、爱心 */
export const Drift: React.FC<{opacity: number; drain?: number}> = ({opacity, drain = 0}) => {
  const f = useCurrentFrame();
  const items = 16;
  const palette = [C.candySoft, C.butter, C.mint, C.sky, C.lavender];
  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      {new Array(items).fill(0).map((_, i) => {
        const size = 54 + rnd(i + 201) * 96;
        const speed = 0.5 + rnd(i + 202) * 1.3;
        const span = H + 320;
        const y0 = rnd(i + 203) * span;
        const y = span - ((y0 + f * speed) % span) - 160;
        const x = rnd(i + 204) * W + Math.sin(f / (70 + rnd(i + 205) * 60) + i) * 70;
        const rot = (rnd(i + 206) - 0.5) * 40 + Math.sin(f / (90 + i * 7)) * 12;
        const col = palette[i % palette.length];
        const kind = i % 4;
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 100 100"
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: `rotate(${rot}deg)`,
              opacity: 0.55 - drain * 0.35,
            }}
          >
            {kind === 0 ? (
              <path
                d="M50 22 L57 42 L78 44 L62 58 L67 78 L50 67 L33 78 L38 58 L22 44 L43 42 Z"
                fill={withAlpha(col, 0.75)}
              />
            ) : kind === 1 ? (
              <g>
                <ellipse cx="38" cy="66" rx="16" ry="12" fill={withAlpha(col, 0.8)} transform="rotate(-20 38 66)" />
                <path d="M50 58 L50 24 L72 32 L50 38" stroke={withAlpha(col, 0.8)} strokeWidth="6" fill="none" />
              </g>
            ) : kind === 2 ? (
              <path d="M18 50 L84 26 L60 82 L50 60 Z" fill={withAlpha(col, 0.8)} />
            ) : (
              <path
                d="M50 78 C 22 58, 20 34, 37 32 C 46 31, 50 39, 50 44 C 50 39, 54 31, 63 32 C 80 34, 78 58, 50 78 Z"
                fill={withAlpha(col, 0.8)}
              />
            )}
          </svg>
        );
      })}
    </div>
  );
};

/** 气球：副歌的热闹担当，跟着拍子一晃一晃 */
export const Balloons: React.FC<{opacity: number; drain?: number}> = ({opacity, drain = 0}) => {
  const f = useCurrentFrame();
  const p = pulse(f, 18);
  const palette = [C.candySoft, C.butter, C.mint, C.sky, C.lavender, C.pink];
  const N = 9;
  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      {new Array(N).fill(0).map((_, i) => {
        const size = 150 + rnd(i + 301) * 130;
        const x0 = rnd(i + 302) * W;
        const span = H + 900;
        const speed = 0.35 + rnd(i + 303) * 0.8;
        const y = span - ((rnd(i + 304) * span + f * speed) % span) - 700;
        const sway = Math.sin(f / (55 + i * 11) + i) * 46;
        const rot = Math.sin(f / (70 + i * 9)) * 5;
        const col = palette[i % palette.length];
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x0 + sway,
              top: y,
              width: size,
              transform: `rotate(${rot}deg) scale(${1 + 0.03 * p})`,
              opacity: 0.9 - drain * 0.5,
            }}
          >
            <svg width={size} height={size * 1.5} viewBox="0 0 100 150">
              <path d="M50 44 C 20 44, 8 66, 8 84 C 8 108, 30 122, 50 122 C 70 122, 92 108, 92 84 C 92 66, 80 44, 50 44 Z" fill={withAlpha(col, 0.92)} />
              <path d="M46 122 L50 132 L54 122 Z" fill={withAlpha(col, 0.92)} />
              <path d="M50 132 C 42 142, 58 146, 50 156" stroke={withAlpha(C.ink, 0.3)} strokeWidth="2.5" fill="none" />
              <ellipse cx="32" cy="66" rx="9" ry="13" fill={withAlpha(C.paper, 0.4)} transform="rotate(-24 32 66)" />
            </svg>
          </div>
        );
      })}
    </div>
  );
};

/** 四角星光：在鼓点上闪一下 */
export const Sparkles: React.FC<{opacity: number; drain?: number}> = ({opacity, drain = 0}) => {
  const f = useCurrentFrame();
  const N = 22;
  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      {new Array(N).fill(0).map((_, i) => {
        const x = rnd(i + 401) * W;
        const y = rnd(i + 402) * H;
        const size = 40 + rnd(i + 403) * 90;
        const ph = rnd(i + 404) * 6.28;
        const tw = Math.max(0, Math.sin(f / 7 + ph));
        const s = 0.15 + 0.85 * Math.pow(tw, 3);
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 100 100"
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: `scale(${s})`,
              opacity: 0.85 - drain * 0.6,
            }}
          >
            <path d="M50 6 C 56 34, 66 44, 94 50 C 66 56, 56 66, 50 94 C 44 66, 34 56, 6 50 C 34 44, 44 34, 50 6 Z" fill={withAlpha(C.paper, 0.9)} />
          </svg>
        );
      })}
    </div>
  );
};

/** 百叶窗：唱到 “close my blinds in misery” 时真的合上 */
export const Blinds: React.FC<{close: number; drain?: number}> = ({close, drain = 0}) => {
  const c = clamp01(close);
  const slats = 9;
  const sh = H / slats;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: c > 0.001 ? 1 : 0, pointerEvents: 'none'}}>
      {new Array(slats).fill(0).map((_, i) => {
        const stagger = clamp01(c * (slats + 3) - i * 0.6);
        const eased = easeInOut(stagger);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: i * sh,
              height: sh + 2,
              transform: `translateY(${(1 - eased) * -sh * 1.05}px)`,
              background: `linear-gradient(180deg, ${withAlpha(C.ink, 0.82 + drain * 0.1)} 0%, ${withAlpha(
                C.grayDark,
                0.86
              )} 62%, ${withAlpha(C.ink, 0.92)} 100%)`,
              borderBottom: `6px solid ${withAlpha(C.inkSoft, 0.5)}`,
              boxShadow: `0 18px 40px ${withAlpha(C.night, 0.45)}`,
            }}
          >
            {/* 叶片上的细纹 */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: sh * 0.42,
                height: 3,
                background: withAlpha(C.gray, 0.16),
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

/** 笑脸贴纸：嘴角按 sadness 从笑到垮，最后裂开 */
export const Smiley: React.FC<{
  sadness: number;
  crack: number;
  size?: number;
  opacity?: number;
  eyeMix?: number;
  night?: number;
}> = ({sadness, crack, size = 260, opacity = 1, eyeMix, night = 0}) => {
  const f = useCurrentFrame();
  const nk = clamp01(night);
  const s = clamp01(sadness);
  const mouthY = lerp(168, 90, s);
  // 嘴的位置随悲伤往下走：开心时保持原来的位置，难过时才拉开与眼睛的距离
  const mouthE = lerp(122, 134, s);
  // 眼睛交接用一个独立的进度（eyeMix）：圆眼先压扁消失，空一小下，弯眼再慢慢张开
  const eyeT = clamp01(eyeMix === undefined ? (s - 0.5) / 0.12 : eyeMix);
  const eyeRoundOp = clamp01((0.46 - eyeT) / 0.06);
  const eyeArcOp = clamp01((eyeT - 0.52) / 0.28);
  const eyeRoundSquash = 0.22 + 0.78 * clamp01(1 - eyeT / 0.5);
  const tearY = ((f * 3) % 160) + 60;
  const bob = Math.sin(f / 26) * 6;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={{transform: `translateY(${bob}px)`, opacity}}
    >
      <circle
        cx="100"
        cy="100"
        r="86"
        fill={mix(mix(C.butter, C.paper, nk * 0.3), C.night, nk * 0.08)}
        stroke={mix(C.ink, C.night, nk * 0.16)}
        strokeWidth="9"
      />
      {/* 眼睛：圆眼先闭成一条缝，缝再张开成下垂的弯眼——同一时刻只有一种眼睛，不会叠影 */}
      <g
        opacity={eyeRoundOp}
        style={{transformOrigin: '100px 82px', transform: `translateY(${(eyeRoundOp < 0.999 ? 0 : 0)}px) scaleY(${eyeRoundSquash})`}}
      >
        <circle cx="72" cy="82" r="13" fill={C.ink} />
        <circle cx="128" cy="82" r="13" fill={C.ink} />
      </g>
      <g opacity={eyeArcOp} style={{transformOrigin: '100px 82px', transform: `translateY(${(1 - eyeArcOp) * 8}px)`}}>
        <path d="M54 86 Q73 64 92 86" stroke={C.ink} strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d="M108 86 Q127 64 146 86" stroke={C.ink} strokeWidth="9" fill="none" strokeLinecap="round" />
      </g>
      {/* 嘴 */}
      <path
        d={`M58 ${mouthE} Q100 ${mouthY} 142 ${mouthE}`}
        stroke={C.ink}
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
      />
      {/* 眼泪 */}
      {s > 0.45 ? (
        <ellipse
          cx="66"
          cy={tearY}
          rx="7"
          ry="11"
          fill={C.sky}
          opacity={clamp01((s - 0.45) / 0.3) * 0.95}
        />
      ) : null}
      {/* 裂缝 */}
      {crack > 0.02 ? (
        <path
          d="M100 16 L94 52 L106 74 L92 104 L104 132 L96 168"
          stroke={C.candy}
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - clamp01(crack)}
        />
      ) : null}
    </svg>
  );
};

/** 心：被一根红线穿透 */
export const Heart: React.FC<{crack: number; app: number; size?: number; pierce?: number}> = ({
  crack,
  app,
  size = 420,
  pierce = 0,
}) => {
  const f = useCurrentFrame();
  const beatScale = 1 + 0.045 * pulse(f, 12);
  const p = clamp01(pierce);
  return (
    <div style={{position: 'relative', width: size, height: size, opacity: app}}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        style={{transform: `scale(${beatScale})`, transformOrigin: '50% 50%'}}
      >
        <path
          d="M100 176 C 22 122, 20 44, 68 40 C 90 38, 100 56, 100 66 C 100 56, 110 38, 132 40 C 180 44, 178 122, 100 176 Z"
          fill={C.candySoft}
          stroke={C.candy}
          strokeWidth="7"
        />
        {/* 裂纹 */}
        <path
          d="M100 66 L92 96 L108 116 L94 146 L100 168"
          stroke={C.candy}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - clamp01(crack)}
        />
      </svg>
      {/* 穿透的红线 */}
      {p > 0.01 ? (
        <div
          style={{
            position: 'absolute',
            left: size / 2 - 3,
            top: -size * 0.25,
            width: 6,
            height: size * 1.5 * p,
            background: `linear-gradient(180deg, ${withAlpha(C.candy, 0)} 0%, ${C.candy} 22%, ${C.candy} 100%)`,
            borderRadius: 3,
          }}
        />
      ) : null}
    </div>
  );
};


/** 墙上的钟：指针先飞快地转，后来慢慢停住（时间不再往前走） */
export const WallClock: React.FC<{opacity: number; stop?: number; reel?: number; night?: number}> = ({
  opacity,
  stop = 0,
  reel = 0,
  night = 0,
}) => {
  const f = useCurrentFrame();
  const nk = clamp01(night);
  const t = f / FPS;
  // 两圈多一点，越到后面越慢，最后停住；reel 期间倒着走
  // 分针：本来就该很慢；秒针：一秒跳一格（被歌词 cue 到时会倒着甩）
  const hand = -90 + 0.5 * t - clamp01(reel) * 420;
  const sec = -90 + 6 * Math.floor(t) - clamp01(reel) * 900;
  return (
    <div style={{position: 'absolute', left: W * 0.115, top: H * 0.17, opacity}}>
      <svg width="380" height="380" viewBox="0 0 380 380">
        <circle cx="190" cy="190" r="150" fill={withAlpha(mix(C.paper, C.night, nk * 0.45), 1)} stroke={withAlpha(mix(C.candy, C.night, nk * 0.4), 1)} strokeWidth="16" />
        <circle cx="190" cy="190" r="142" fill="none" stroke={withAlpha(mix(C.ink, C.night, nk * 0.4), 0.08 + 0.1 * nk)} strokeWidth="4" />
        {new Array(12).fill(0).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <circle
              key={i}
              cx={190 + Math.sin(a) * 116}
              cy={190 - Math.cos(a) * 116}
              r={i % 3 === 0 ? 9 : 5}
              fill={withAlpha(mix(C.ink, C.paper, nk * 0.5), 0.75)}
            />
          );
        })}
        <g transform={`rotate(${hand} 190 190)`}>
          <rect x="183" y="96" width="14" height="96" rx="7" fill={withAlpha(mix(C.ink, C.paper, nk * 0.5), 0.8)} />
        </g>
        <g transform={`rotate(${sec} 190 190)`}>
          <rect x="186" y="64" width="8" height="126" rx="4" fill={withAlpha(mix(C.candy, C.night, nk * 0.35), 1)} />
        </g>
        <circle cx="190" cy="190" r="12" fill={withAlpha(mix(C.ink, C.paper, nk * 0.45), 1)} />
      </svg>
    </div>
  );
};

/** 地上的马克杯：热气越来越淡 */
export const Mug: React.FC<{opacity: number; warm?: number}> = ({opacity, warm = 1}) => {
  const f = useCurrentFrame();
  return (
    <div style={{position: 'absolute', left: W * 0.30, top: H * 0.79, opacity}}>
      <svg width="240" height="240" viewBox="0 0 240 240">
        <ellipse cx="112" cy="208" rx="76" ry="14" fill={withAlpha(C.ink, 0.14)} />
        <path d="M40 96 H176 V150 Q176 196 130 196 H86 Q40 196 40 150 Z" fill={withAlpha(C.mint, 0.95)} stroke={withAlpha(C.ink, 0.16)} strokeWidth="6" />
        <path d="M176 108 Q214 112 214 142 Q214 172 176 176" fill="none" stroke={withAlpha(C.ink, 0.16)} strokeWidth="12" strokeLinecap="round" />
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M${84 + i * 26} 78 C ${72 + i * 26} 56, ${96 + i * 26} 46, ${84 + i * 26} 24`}
            fill="none"
            stroke={withAlpha(C.paper, 0.5 * warm)}
            strokeWidth="7"
            strokeLinecap="round"
            style={{
              transform: `translateY(${-(f * 0.6 + i * 40) % 70}px)`,
              opacity: (0.55 + 0.2 * Math.sin(f / 26 + i)) * (0.6 + 0.4 * ((i + 1) / 3)),
            }}
          />
        ))}
      </svg>
    </div>
  );
};

/** 揉皱的纸团：越到后面越多 */
export const PaperBalls: React.FC<{opacity: number; more?: number}> = ({opacity, more = 0}) => {
  const f = useCurrentFrame();
  const n = 3 + Math.round(clamp01(more) * 5);
  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      {new Array(n).fill(0).map((_, i) => {
        const x = W * (0.36 + rnd(i + 71) * 0.34);
        const y = H * (0.775 + rnd(i + 72) * 0.09);
        const r = 22 + rnd(i + 73) * 20;
        const rot = (f / (30 + i * 11)) * (i % 2 ? 1 : -1);
        return (
          <svg key={i} width={r * 3} height={r * 3} style={{position: 'absolute', left: x, top: y, transform: `rotate(${rot}deg)`}}>
            <circle cx={r * 1.5} cy={r * 1.5} r={r} fill={withAlpha(C.paper, 0.95)} stroke={withAlpha(C.ink, 0.18)} strokeWidth="4" />
            <path
              d={`M${r * 0.7} ${r * 1.2} L${r * 1.4} ${r * 1.7} L${r * 2.1} ${r * 1.1}`}
              fill="none"
              stroke={withAlpha(C.ink, 0.16)}
              strokeWidth="4"
            />
          </svg>
        );
      })}
    </div>
  );
};

/** 门边靠着的伞：伞尖在滴水 */
export const Umbrella: React.FC<{opacity: number; fall?: number}> = ({opacity, fall = 0}) => {
  const f = useCurrentFrame();
  const fl = clamp01(fall);
  // 倒下时带一点回弹，落地后再轻轻沉一下就停住
  const drop = fl < 1 ? 74 * fl + Math.sin(fl * Math.PI) * 9 : 74;
  const shiver = Math.sin(f / 6) * 1.1 + pulse(f, 30) * 1.2;
  return (
    <div
      style={{
        position: 'absolute',
        left: W * 0.075,
        top: H * 0.44,
        opacity,
        transform: `rotate(${(13 + drop + shiver * (1 - fl)).toFixed(2)}deg)`,
        transformOrigin: '50% 92%',
      }}
    >
      <svg width="280" height="820" viewBox="0 0 200 620">
        <path d="M96 34 Q92 320 96 548" fill="none" stroke={withAlpha(C.ink, 0.62)} strokeWidth="20" strokeLinecap="round" />
        <path d="M14 164 Q96 80 178 164 L170 206 Q96 162 22 206 Z" fill={withAlpha(C.candySoft, 1)} stroke={withAlpha(C.ink, 0.28)} strokeWidth="8" />
        <path d="M96 196 Q96 246 60 262" fill="none" stroke={withAlpha(C.ink, 0.4)} strokeWidth="18" strokeLinecap="round" />
        <ellipse cx="96" cy="596" rx="34" ry="10" fill={withAlpha(C.ink, 0.12)} />
        {[0, 1].map((i) => (
          <circle
            key={i}
            cx={92 + i * 8}
            cy={40 + ((f * (2 + i) + i * 90) % 240)}
            r={6}
            fill={withAlpha(C.sky, 0.7)}
          />
        ))}
      </svg>
    </div>
  );
};

// 窗外的月亮：画在调色滤镜之外（夜里台灯/红心同层），所以不会被冷色滤镜压暗。
// 位置对准 RainWindow 的右上那格玻璃（窗口 left 2930 / top 210 / 780x580，边框 26，十字棂 18）。
export const Moon: React.FC<{opacity: number}> = ({opacity}) => {
  const o = clamp01(opacity);
  if (o <= 0.001) {
    return null;
  }
  const size = 150;
  return (
    <div style={{position: 'absolute', left: 3431, top: 288, width: size, height: size, opacity: o}}>
      {/* 外圈光晕 */}
      <div
        style={{
          position: 'absolute',
          left: -110,
          top: -110,
          width: size + 220,
          height: size + 220,
          borderRadius: '50%',
          background: `radial-gradient(circle at 54% 44%, ${withAlpha(C.paper, 0.42)} 0%, ${withAlpha(
            C.butter,
            0.2
          )} 26%, ${withAlpha(C.butter, 0)} 64%)`,
          filter: 'blur(16px)',
        }}
      />
      {/* 月牙本身 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: '#FFFFFF',
          maskImage: 'radial-gradient(circle at 112% 4%, rgba(0,0,0,0) 0 57%, #000 58%)',
          WebkitMaskImage: 'radial-gradient(circle at 112% 4%, rgba(0,0,0,0) 0 57%, #000 58%)',
          filter: 'drop-shadow(0 0 22px rgba(255,255,255,0.9)) drop-shadow(0 0 58px rgba(255,240,190,0.6))',
        }}
      />
      {/* 月牙上的暖灰暗面，别太白 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          opacity: 0.16,
          background: `radial-gradient(circle at 30% 24%, ${withAlpha('#FFF3D0', 0.9)} 0%, ${withAlpha(
            '#FFF3D0',
            0
          )} 62%)`,
          maskImage: 'radial-gradient(circle at 112% 4%, rgba(0,0,0,0) 0 57%, #000 58%)',
          WebkitMaskImage: 'radial-gradient(circle at 112% 4%, rgba(0,0,0,0) 0 57%, #000 58%)',
        }}
      />
    </div>
  );
};

// ——— 线稿版房间：结尾处世界"褪成一张手绘底稿"，开灯时颜色再灌回来 ———
// 所有坐标都从真实组件反推（WallClock / Lamp / Plant / Mug / Polaroids / RainWindow），不是估的
export const LineRoom: React.FC<{progress: number; lampFlicker?: number}> = ({progress, lampFlicker = 0}) => {
  const p = clamp01(progress);
  const ink = withAlpha(mix(C.paper, C.sky, 0.28), 0.9);
  const soft = withAlpha(C.paper, 0.42);
  const draw = (delay: number) => {
    const q = clamp01((p - delay) / Math.max(0.001, 1 - delay));
    return {strokeDasharray: 1, strokeDashoffset: 1 - q, opacity: q > 0 ? 1 : 0} as unknown as {pathLength?: number};
  };
  const D = (delay: number) => ({...draw(delay), pathLength: 1}) as unknown as {pathLength?: number};

  // —— 真实几何 ——
  const floorY = H * 0.775; // 1674
  const clockCx = W * 0.115 + 190;
  const clockCy = H * 0.17 + 190;
  const clockR = 150;
  const faceCx = 560 + 132.5;
  const faceCy = H - 680 + 132.5;
  const potX = W - 500;
  const winX = 2930;
  const winY = 210;
  const winW = 780;
  const winH = 580;
  const hangX = W * 0.5;
  // 彩灯串：与 StringLights 完全同一套坐标（x 从 120 到 W-120，y = 120 + sin(kπ)*130）
  const _lampN = 15;
  const stringLightBulbs = Array.from({length: _lampN}, (_, i) => {
    const k = i / (_lampN - 1);
    return {x: 120 + k * (W - 240), y: 120 + Math.sin(k * Math.PI) * 130};
  });
  const stringLightPath = stringLightBulbs
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  // 彩签：跟 Polaroids 完全一致的槽位/尺寸/角度
  const cards = [
    {x: 0.02, y: 0.035, w: 300, rot: -7},
    {x: 0.885, y: 0.46, w: 250, rot: 9},
    {x: 0.22, y: 0.12, w: 340, rot: -14},
    {x: 0.315, y: 0.05, w: 230, rot: 5},
  ].map((c, i) => ({
    ...c,
    h: c.w * [1.26, 1.2, 1.3, 1.34][i],
    px: c.x * W,
    py: c.y * H,
    i,
  }));

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
      <g stroke={ink} fill="none" strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round" style={{filter: 'drop-shadow(0 0 7px rgba(255,250,235,0.42))'}}>
        {/* 地平线 + 踢脚线 */}
        <path d={`M-40 ${floorY} L${W + 40} ${floorY}`} {...D(0)} />
        <path d={`M-40 ${floorY + 34} L${W + 40} ${floorY + 34}`} stroke={soft} strokeWidth={4} {...D(0.06)} />
        {/* 墙角 */}
        <path d={`M${W * 0.155} 0 L${W * 0.155} ${floorY}`} stroke={soft} strokeWidth={4} {...D(0.1)} />
        <path d={`M${W * 0.925} 0 L${W * 0.925} ${floorY}`} stroke={soft} strokeWidth={4} {...D(0.11)} />
        {/* 地板拼缝 */}
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <path
            key={`f${k}`}
            d={`M${W * (0.5 + (k - 2.5) * 0.055)} ${floorY + 10} L${W * (0.5 + (k - 2.5) * 0.2)} ${H}`}
            stroke={soft}
            strokeWidth={3}
            {...D(0.3 + k * 0.01)}
          />
        ))}
        {/* 窗户（RainWindow 的真实位置） */}
        <rect x={winX} y={winY} width={winW} height={winH} rx={26} {...D(0.04)} />
        <path d={`M${winX} ${winY + winH * 0.5} L${winX + winW} ${winY + winH * 0.5}`} {...D(0.14)} />
        <path d={`M${winX + winW * 0.5} ${winY} L${winX + winW * 0.5} ${winY + winH}`} {...D(0.18)} />
        {/* 窗外：月牙 + 远处地平线 */}
        <path d={`M${winX + winW * 0.8} ${winY + 90} A70 70 0 1 0 ${winX + winW * 0.8} ${winY + 230}`} {...D(0.4)} />
        <path d={`M${winX + 40} ${winY + winH * 0.88} L${winX + winW - 40} ${winY + winH * 0.88}`} stroke={soft} strokeWidth={3} {...D(0.42)} />
        {/* 吊灯 */}
        <path d={`M${hangX} 0 L${hangX} 150`} {...D(0.08)} />
        <path d={`M${hangX - 120} 150 L${hangX + 120} 150 L${hangX + 210} 330 L${hangX - 210} 330 Z`} {...D(0.12)} />
        {/* 落地灯：真实形状是上宽下窄的锥形灯罩 */}
        <path d={`M160 948 L440 948 L450 974 L150 974 Z`} {...D(0.2)} />
        <path d={`M150 974 L450 974 L396 1114 L204 1114 Z`} {...D(0.22)} />
        <ellipse cx={300} cy={1118} rx={96} ry={16} {...D(0.24)} />
        <path d={`M300 1114 L300 ${floorY}`} strokeWidth={10} {...D(0.26)} />
        <ellipse cx={300} cy={floorY + 8} rx={110} ry={20} {...D(0.28)} />
        {/* 线稿里的灯先亮：亮的是头顶那盏吊灯（不是落地灯） */}
        {lampFlicker > 0.02 ? (
          <g opacity={lampFlicker}>
            <ellipse cx={hangX} cy={300} rx={300} ry={280} fill={withAlpha(C.butter, 0.32)} style={{filter: 'blur(56px)'}} stroke="none" />
            <path d={`M${hangX - 120} 150 L${hangX + 120} 150 L${hangX + 210} 330 L${hangX - 210} 330 Z`} stroke={withAlpha(C.butter, 0.95)} strokeWidth={9} />
            <ellipse cx={hangX} cy={332} rx={210} ry={20} stroke={withAlpha(C.butter, 1)} strokeWidth={8} />
            <path d={`M${hangX - 200} 344 L${hangX + 200} 344 L${hangX + 520} ${floorY + 40} L${hangX - 520} ${floorY + 40} Z`} stroke={withAlpha(C.butter, 0.3)} strokeWidth={3} />
          </g>
        ) : null}
        {/* 笑脸 */}
        <circle cx={faceCx} cy={faceCy} r={132} {...D(0.3)} />
        <path d={`M${faceCx - 46} ${faceCy - 28} L${faceCx - 30} ${faceCy - 28}`} strokeWidth={14} {...D(0.34)} />
        <path d={`M${faceCx + 30} ${faceCy - 28} L${faceCx + 46} ${faceCy - 28}`} strokeWidth={14} {...D(0.35)} />
        <path d={`M${faceCx - 44} ${faceCy + 42} Q${faceCx} ${faceCy + 74} ${faceCx + 44} ${faceCy + 42}`} {...D(0.36)} />
        {/* 盆栽（盆坐在踢脚线上，底边到地面线以下） */}
        <path d={`M${potX - 110} ${floorY} L${potX + 110} ${floorY} L${potX + 86} ${floorY + 200} L${potX - 86} ${floorY + 200} Z`} {...D(0.3)} />
        {[-52, -26, 0, 26, 52].map((ang, k) => {
          const rad = (ang * Math.PI) / 180;
          const len = 300 - Math.abs(ang) * 1.1;
          const tx = potX + Math.sin(rad) * len;
          const ty = floorY - Math.cos(rad) * len;
          return (
            <path
              key={`leaf${k}`}
              d={`M${potX} ${floorY} Q${potX + (tx - potX) * 0.35} ${floorY - len * 0.75} ${tx} ${ty}`}
              {...D(0.32 + k * 0.02)}
            />
          );
        })}
        {/* 挂钟（真实：left W*0.115 / top H*0.17，圆 r150） */}
        <circle cx={clockCx} cy={clockCy} r={clockR} {...D(0.16)} />
        <circle cx={clockCx} cy={clockCy} r={clockR - 18} stroke={soft} strokeWidth={3} {...D(0.18)} />
        <path d={`M${clockCx} ${clockCy} L${clockCx} ${clockCy - 94}`} {...D(0.38)} />
        <path d={`M${clockCx} ${clockCy} L${clockCx + clockR * 0.42} ${clockCy - clockR * 0.62}`} strokeWidth={5} {...D(0.4)} />
        {/* 彩灯串：坐标照抄 StringLights（15 个灯泡，绳下垂 130px） */}
        <path d={stringLightPath} {...D(0.2)} />
        {stringLightBulbs.map((p, k) => (
          <g key={`b${k}`}>
            <path d={`M${p.x} ${p.y} L${p.x} ${p.y + 26}`} strokeWidth={3} {...D(0.24 + k * 0.008)} />
            <circle cx={p.x} cy={p.y + 32} r={15} {...D(0.26 + k * 0.008)} />
          </g>
        ))}
        {/* 墙上的彩签：位置/尺寸/角度与真实一致 */}
        {cards.map((c) => (
          <g key={`c${c.i}`} transform={`rotate(${c.rot} ${c.px} ${c.py})`}>
            <rect x={c.px} y={c.py} width={c.w} height={c.h} rx={6} {...D(0.36 + c.i * 0.03)} />
            <rect
              x={c.px + 18}
              y={c.py + 18}
              width={c.w - 36}
              height={c.h - 36 - c.w * 0.22}
              {...D(0.42 + c.i * 0.03)}
            />
            <path
              d={`M${c.px + 40} ${c.py + c.h - 58} L${c.px + c.w - 60} ${c.py + c.h - 58}`}
              stroke={soft}
              strokeWidth={4}
              {...D(0.48 + c.i * 0.02)}
            />
          </g>
        ))}
        {/* 地上的马克杯（真实：left W*0.30 / top H*0.79，svg 240） */}
        <path
          d={`M${W * 0.30 + 40} ${H * 0.79 + 96} L${W * 0.30 + 176} ${H * 0.79 + 96} V${H * 0.79 + 150} Q${W * 0.30 + 176} ${H * 0.79 + 196} ${W * 0.30 + 130} ${H * 0.79 + 196} H${W * 0.30 + 86} Q${W * 0.30 + 40} ${H * 0.79 + 196} ${W * 0.30 + 40} ${H * 0.79 + 150} Z`}
          {...D(0.44)}
        />
        <path
          d={`M${W * 0.30 + 176} ${H * 0.79 + 108} Q${W * 0.30 + 214} ${H * 0.79 + 112} ${W * 0.30 + 214} ${H * 0.79 + 142} Q${W * 0.30 + 214} ${H * 0.79 + 172} ${W * 0.30 + 176} ${H * 0.79 + 176}`}
          {...D(0.46)}
        />
        {/* 墙上的小涂鸦 */}
        <path d={`M${W * 0.40} ${H * 0.28} l30 0 M${W * 0.40 + 15} ${H * 0.28 - 15} l0 30`} stroke={soft} strokeWidth={4} {...D(0.5)} />
        <path d={`M${W * 0.47} ${H * 0.33} l14 -24 l14 24 z`} stroke={soft} strokeWidth={4} {...D(0.52)} />
        <path d={`M${W * 0.42} ${H * 0.42} l22 0 M${W * 0.42} ${H * 0.42} q7 12 18 0`} stroke={soft} strokeWidth={4} {...D(0.54)} />
      </g>
    </svg>
  );
};
