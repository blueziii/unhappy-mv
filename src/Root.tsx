import {Composition} from 'remotion';
import React from 'react';
import {UnhappyVideo} from './Video';
import {Cover} from './Cover';
import {CoverDark} from './CoverDark';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Unhappy"
        component={UnhappyVideo}
        durationInFrames={5889}
        fps={60}
        width={3840}
        height={2160}
      />
      {/* 封面 4:3（2880×2160），四个备选 */}
      <Composition
        id="Cover1"
        component={Cover}
        durationInFrames={1}
        fps={30}
        width={2880}
        height={2160}
        defaultProps={{
          src: 'c1',
          tag: 'now playing',
          zh: '用欢快的节拍，唱一个悲伤的故事',
        } as never}
      />
      <Composition
        id="Cover2"
        component={Cover}
        durationInFrames={1}
        fps={30}
        width={2880}
        height={2160}
        defaultProps={{
          src: 'c2',
          tag: 'unhappy',
          zh: '我把所有的东西都打包好，然后跑得很远',
        } as never}
      />
      <Composition
        id="Cover3"
        component={Cover}
        durationInFrames={1}
        fps={30}
        width={2880}
        height={2160}
        defaultProps={{
          src: 'c3',
          tag: 'makes me unhappy',
          zh: '关灯以后，房间只剩下窗外的月亮',
          dark: true,
          accent: '#F6A896',
        } as never}
      />
      <Composition
        id="Cover4"
        component={Cover}
        durationInFrames={1}
        fps={30}
        width={2880}
        height={2160}
        defaultProps={{
          src: 'c4',
          tag: 'loop',
          zh: '天亮了，房间又回到原来的样子',
          dark: true,
          accent: '#F6A896',
        } as never}
      />
      {/* 开灯版主画面：成片第 600 帧布局，道具全部显示，正常日间调色 */}
      <Composition
        id="CoverDayFilm"
        component={UnhappyVideo}
        durationInFrames={601}
        fps={60}
        width={3840}
        height={2160}
        defaultProps={{forceProps: 1, coverInset: 430} as never}
      />
      {/* 关灯版本主画面：直接用成片合成、强制夜晚调色，渲第 600 帧 */}
      <Composition
        id="CoverDarkFilm"
        component={UnhappyVideo}
        durationInFrames={601}
        fps={60}
        width={3840}
        height={2160}
        defaultProps={{forceDark: 1} as never}
      />
      {/* 黑色版主画面：16:9，渲第 600 帧 */}
      <Composition
        id="CoverDark"
        component={CoverDark}
        durationInFrames={601}
        fps={60}
        width={3840}
        height={2160}
      />
    </>
  );
};
