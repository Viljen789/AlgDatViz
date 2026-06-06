// PlaybackEngine — topic-agnostic step / scrub / replay engine.
//
// Give it a precomputed `frames` array (any shape — the engine never inspects
// the contents) and it owns the cursor, the play/pause loop, scrubbing, speed
// and reset. Every topic (sorting, graphs, trees, hashing, …) drives the same
// playback ergonomics through this one hook, so behaviour stays consistent.
//
// ──────────────────────────────────────────────────────────────────────────
// USAGE (Phase 3b topic agents)
//
//   const frames = useMemo(() => buildFrames(input), [input]); // your timeline
//   const player = usePlayback(frames, { speed: 100, autoPlay: false });
//   // wire player.* into <StepControlBar /> and read player.currentFrame
//
// API
//   currentStep   number      — active frame index (0-based, clamped)
//   currentFrame  any         — frames[currentStep] (undefined if empty)
//   totalSteps    number      — frames.length
//   isPlaying     boolean     — auto-advance loop is running
//   play()                    — start auto-advance (no-op at last frame / empty)
//   pause()                   — stop auto-advance
//   toggle()                  — play if paused, pause if playing
//   stepForward()             — +1 frame, pauses, clamps at last
//   stepBack()                — -1 frame, pauses, clamps at 0
//   advance()                 — +1 frame WITHOUT pausing (for animation-driven
//                               cadence; don't use for user step buttons)
//   seek(n)                   — jump to frame n, pauses, clamps to range
//   first()                   — seek(0)
//   last()                    — seek(totalSteps - 1)
//   speed         number      — current speed value (higher = faster)
//   setSpeed(v)               — set speed (accepts value or updater fn)
//   reset()                   — back to frame 0, paused
//   replay()                  — back to frame 0, then play from the start
//
// OPTIONS
//   speed       initial speed value (default 100). The control bar's
//               SPEED_OPTIONS values map directly onto this.
//   autoPlay    start playing once frames are available (default false)
//   speedToDelay(speed) => ms
//               maps a speed value to the per-frame delay. Default matches the
//               legacy sorting curve: max(1050 - speed*2, 10) ms, i.e. higher
//               speed → shorter delay. Reduced-motion forces a long, calm delay.
//
// NOTES
//   • Respects prefers-reduced-motion via the shared useReducedMotion hook:
//     when reduced, the auto-advance delay is floored to a calm, readable pace.
//   • The cursor is clamped whenever `frames` changes length, so swapping the
//     timeline never leaves the cursor out of bounds.
//   • The engine is content-agnostic — it never reads inside a frame.
// ──────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';

const DEFAULT_SPEED = 100;
const REDUCED_MOTION_DELAY = 900;

// Legacy sorting curve: speed 25→1000ms … speed 500→50ms (floored at 10ms).
const defaultSpeedToDelay = speed => Math.max(1050 - speed * 2, 10);

export const usePlayback = (frames = [], options = {}) => {
	const {
		speed: initialSpeed = DEFAULT_SPEED,
		autoPlay = false,
		speedToDelay = defaultSpeedToDelay,
	} = options;

	const reducedMotion = useReducedMotion();
	const [currentStep, setCurrentStep] = useState(0);
	const [isPlaying, setIsPlaying] = useState(autoPlay);
	const [speed, setSpeedState] = useState(initialSpeed);

	const totalSteps = frames.length;
	const maxStep = Math.max(totalSteps - 1, 0);

	const timerRef = useRef(null);
	// Keep the latest delay mapper without re-subscribing the loop effect.
	const speedToDelayRef = useRef(speedToDelay);
	speedToDelayRef.current = speedToDelay;

	const clearTimer = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	// Keep the cursor in range whenever the timeline length changes.
	useEffect(() => {
		setCurrentStep(prev => {
			const clamped = Math.min(prev, maxStep);
			return clamped < 0 ? 0 : clamped;
		});
	}, [maxStep]);

	const play = useCallback(() => {
		if (frames.length === 0) return;
		// Nothing to advance to — replaying is the caller's job (replay()).
		setCurrentStep(prev => {
			if (prev >= frames.length - 1) {
				setIsPlaying(false);
				return prev;
			}
			setIsPlaying(true);
			return prev;
		});
	}, [frames.length]);

	const pause = useCallback(() => {
		setIsPlaying(false);
	}, []);

	const toggle = useCallback(() => {
		if (frames.length === 0) return;
		setIsPlaying(prev => {
			if (prev) return false;
			// Don't start a play loop that has nowhere to go.
			return currentStep < frames.length - 1;
		});
	}, [frames.length, currentStep]);

	const seek = useCallback(
		step => {
			if (frames.length === 0) return;
			const clamped = Math.max(0, Math.min(step, frames.length - 1));
			setIsPlaying(false);
			setCurrentStep(clamped);
		},
		[frames.length]
	);

	const stepForward = useCallback(() => {
		if (frames.length === 0) return;
		setIsPlaying(false);
		setCurrentStep(prev => Math.min(prev + 1, frames.length - 1));
	}, [frames.length]);

	// Advance one frame WITHOUT changing play state. Useful when an external
	// animation-complete callback drives the cadence and must not pause the loop.
	const advance = useCallback(() => {
		if (frames.length === 0) return;
		setCurrentStep(prev => Math.min(prev + 1, frames.length - 1));
	}, [frames.length]);

	const stepBack = useCallback(() => {
		if (frames.length === 0) return;
		setIsPlaying(false);
		setCurrentStep(prev => Math.max(prev - 1, 0));
	}, [frames.length]);

	const first = useCallback(() => seek(0), [seek]);
	const last = useCallback(() => seek(maxStep), [seek, maxStep]);

	const setSpeed = useCallback(value => {
		setSpeedState(prev => (typeof value === 'function' ? value(prev) : value));
	}, []);

	const reset = useCallback(() => {
		setIsPlaying(false);
		setCurrentStep(0);
	}, []);

	const replay = useCallback(() => {
		if (frames.length === 0) return;
		setCurrentStep(0);
		setIsPlaying(frames.length > 1);
	}, [frames.length]);

	// Auto-advance loop. Re-armed on each cursor move while playing.
	useEffect(() => {
		if (!isPlaying || totalSteps === 0) {
			clearTimer();
			return;
		}
		if (currentStep >= totalSteps - 1) {
			setIsPlaying(false);
			clearTimer();
			return;
		}

		const baseDelay = speedToDelayRef.current(speed);
		const delay = reducedMotion ? Math.max(baseDelay, REDUCED_MOTION_DELAY) : baseDelay;

		timerRef.current = setTimeout(() => {
			setCurrentStep(prev => {
				const next = Math.min(prev + 1, totalSteps - 1);
				if (next >= totalSteps - 1) setIsPlaying(false);
				return next;
			});
		}, delay);

		return clearTimer;
	}, [isPlaying, currentStep, totalSteps, speed, reducedMotion, clearTimer]);

	// Clean up the timer on unmount.
	useEffect(() => clearTimer, [clearTimer]);

	const currentFrame = useMemo(
		() => frames[currentStep],
		[frames, currentStep]
	);

	return {
		currentStep,
		currentFrame,
		totalSteps,
		isPlaying,
		play,
		pause,
		toggle,
		stepForward,
		stepBack,
		advance,
		seek,
		first,
		last,
		speed,
		setSpeed,
		reset,
		replay,
	};
};

export default usePlayback;
