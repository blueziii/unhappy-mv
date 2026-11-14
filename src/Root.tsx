import {Composition} from 'remotion';
import React from 'react';
import {UnhappyVideo} from './Video';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Unhappy"
      component={UnhappyVideo}
      durationInFrames={5889}
      fps={60}
      width={3840}
      height={2160}
    />
  );
};
