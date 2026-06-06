// PlaybackEngine — topic-agnostic step / scrub / replay engine + trace.
//
// Phase 3b topic agents import from here:
//
//   import { usePlayback, usePlaybackKeys, FrameTrace } from '../../common/PlaybackEngine';
//
//   const player = usePlayback(frames, { speed: 100 });
//   usePlaybackKeys(containerRef, { ...player keys });
//   <FrameTrace narration={...} step={player.currentStep} totalSteps={player.totalSteps} />
//
// See each module's header comment for the full API.

export { default as usePlayback, usePlayback as usePlaybackHook } from './usePlayback.js';
export { default as usePlaybackKeys } from './usePlaybackKeys.js';
export { default as FrameTrace } from './FrameTrace.jsx';
export { default as PseudoState } from './PseudoState.jsx';
