// Sorting timeline state + playback orchestration.
//
// This hook is sorting-specific (it owns the array, the algorithm, the data
// profile and the operation-stats history), but the generic step / scrub /
// replay / speed machinery now lives in the topic-agnostic PlaybackEngine
// (`common/PlaybackEngine/usePlayback`). useSortingVisualizer wraps that engine
// and adapts its API to the legacy public shape its consumers already expect,
// so SortingDashboard, MergeSortPlayground and the sorting controls keep
// working unchanged.
//
// Legacy ↔ engine mapping
//   animationSteps   ← the frames array passed to usePlayback
//   currentStep      = player.currentStep
//   currentFrame     = player.currentFrame
//   animationSpeed   = player.speed   (setAnimationSpeed = player.setSpeed)
//   isSorting        = a run exists and the cursor isn't parked on the last step
//   isPaused         = !player.isPlaying
//   onPlayPause      = player.toggle (no-op until a run is primed)
//   onStepForward/Back = player.stepForward / stepBack
//   seekToStep       = player.seek
//   resetAnimation   = clears the run (engine resets when frames empty)

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePlayback } from '../common/PlaybackEngine/usePlayback.js';
import { SORTING_FUNCTIONS } from '../utils/sorting';
import {
	createValuesForProfile,
	getDefaultDataProfile,
} from '../utils/sorting/dataProfiles.js';

export const useSortingVisualizer = (
	initialAlgorithm = 'bubbleSort',
	initialSize = 20
) => {
	const [array, setArray] = useState([]);
	const [arraySize, setArraySizeState] = useState(initialSize);
	const [sortingAlgorithm, setSortingAlgorithmState] =
		useState(initialAlgorithm);
	const [dataProfile, setDataProfileState] = useState(() =>
		getDefaultDataProfile(initialAlgorithm)
	);
	const [viewMode, setViewMode] = useState('bars');
	const [animationSteps, setAnimationSteps] = useState([]);
	const [operationStats, setOperationStats] = useState(null);
	const [throttledOperationStats, setThrottledOperationStats] = useState(null);

	const throttleTimerRef = useRef(null);
	// When startSort loads a fresh timeline, the engine won't see the new frames
	// until the next render, so we defer the auto-play kick to an effect. The
	// token bumps on every run so the effect re-fires even when a re-run
	// produces a timeline of identical length; the ref dedupes within a render.
	const [primeToken, setPrimeToken] = useState(0);
	const handledPrimeRef = useRef(0);

	// Generic playback engine drives the cursor / play loop / speed / scrub.
	const player = usePlayback(animationSteps, { speed: 100 });
	const {
		currentStep,
		currentFrame,
		totalSteps,
		isPlaying,
		toggle,
		stepForward,
		stepBack,
		advance,
		seek,
		replay,
		setSpeed,
		reset: resetPlayer,
		speed: animationSpeed,
	} = player;

	const setAnimationSpeed = setSpeed;

	// A run "exists" once steps are loaded; it's still sorting until the cursor
	// is parked on the final step. Mirrors the legacy isSorting/isPaused pair.
	const isSorting = totalSteps > 0 && currentStep < totalSteps - 1;
	const isPaused = !isPlaying;

	const resetAnimation = useCallback(() => {
		resetPlayer();
		setAnimationSteps([]);
		setOperationStats(null);
		setThrottledOperationStats(null);

		if (throttleTimerRef.current) {
			clearTimeout(throttleTimerRef.current);
			throttleTimerRef.current = null;
		}
	}, [resetPlayer]);

	const setSortingAlgorithm = useCallback(
		nextAlgorithm => {
			const resolvedAlgorithm =
				typeof nextAlgorithm === 'function'
					? nextAlgorithm(sortingAlgorithm)
					: nextAlgorithm;
			resetAnimation();
			setSortingAlgorithmState(resolvedAlgorithm);
			setDataProfileState(getDefaultDataProfile(resolvedAlgorithm));
		},
		[resetAnimation, sortingAlgorithm]
	);

	const setArraySize = useCallback(
		nextSize => {
			resetAnimation();
			setArraySizeState(prev =>
				typeof nextSize === 'function' ? nextSize(prev) : nextSize
			);
		},
		[resetAnimation]
	);

	const setDataProfile = useCallback(
		nextProfile => {
			resetAnimation();
			setDataProfileState(prev =>
				typeof nextProfile === 'function' ? nextProfile(prev) : nextProfile
			);
		},
		[resetAnimation]
	);

	const shuffleArray = useCallback(() => {
		const nums = createValuesForProfile(
			arraySize,
			sortingAlgorithm,
			dataProfile
		);
		const newArray = nums.map((value, index) => ({
			id: `item-${index}-${Math.random().toString(36).slice(2, 9)}`,
			value,
		}));
		setArray(newArray);
		resetAnimation();
	}, [arraySize, dataProfile, resetAnimation, sortingAlgorithm]);

	useEffect(() => {
		shuffleArray();
	}, [shuffleArray]);

	const toggleViewMode = useCallback(() => {
		resetAnimation();
		setViewMode(prev => (prev === 'bars' ? 'boxes' : 'bars'));
	}, [resetAnimation]);

	const startSort = useCallback(() => {
		if (isSorting) {
			resetAnimation();
			shuffleArray();
			return;
		}

		const plainArray = array.map(item => item.value);
		const sortingFunction = SORTING_FUNCTIONS[sortingAlgorithm];

		if (!sortingFunction) return;

		const result = sortingFunction(plainArray);
		if (!result || !result.steps || result.steps.length === 0) return;

		const steps = result.steps;
		const statsHistory = steps.map((step, index) => ({
			step: index + 1,
			comparisons: step.stats?.comparisons || 0,
			writes: step.stats?.writes ?? step.stats?.swaps ?? 0,
			swaps: step.stats?.swaps ?? 0,
			auxiliaryWrites: step.stats?.auxiliaryWrites ?? 0,
			arrayWrites: step.stats?.writes ?? step.stats?.swaps ?? 0,
			totalOperations: step.stats?.totalOperations || 0,
		}));

		setAnimationSteps(steps);
		setOperationStats(statsHistory);
		setThrottledOperationStats(statsHistory[0]);
		// The engine only sees these frames next render; arm auto-play then.
		setPrimeToken(token => token + 1);
	}, [isSorting, array, sortingAlgorithm, resetAnimation, shuffleArray]);

	// Start the freshly loaded run from step 0 once the timeline reaches the
	// engine (replay = seek(0) + play), matching the legacy startSort behaviour.
	// Keyed on primeToken so a re-run with an identical-length timeline re-fires;
	// handledPrimeRef ensures we replay exactly once per prime.
	useEffect(() => {
		if (primeToken === 0 || handledPrimeRef.current === primeToken) return;
		if (totalSteps === 0) return;
		handledPrimeRef.current = primeToken;
		replay();
	}, [primeToken, totalSteps, replay]);

	// Advance one step without pausing — used by view onAnimationComplete hooks
	// to drive the in-canvas transition cadence.
	const goToNextStep = useCallback(() => {
		advance();
	}, [advance]);

	const onPlayPause = useCallback(() => {
		if (!animationSteps.length) return;
		toggle();
	}, [animationSteps.length, toggle]);

	const onStepForward = useCallback(() => {
		stepForward();
	}, [stepForward]);

	const onStepBack = useCallback(() => {
		stepBack();
	}, [stepBack]);

	const seekToStep = useCallback(
		step => {
			seek(step);
		},
		[seek]
	);

	const isFastMode = useMemo(() => {
		return animationSpeed > 250;
	}, [animationSpeed]);

	// Throttled stats update effect — accumulates the stats history up to the
	// current step while running, for the live operation counters.
	useEffect(() => {
		if (!isSorting || isPaused || !operationStats) return;

		if (throttleTimerRef.current) {
			clearTimeout(throttleTimerRef.current);
		}

		throttleTimerRef.current = setTimeout(() => {
			const currentHistory = operationStats.slice(0, currentStep + 1);
			setThrottledOperationStats(currentHistory);
		}, 60);

		return () => {
			if (throttleTimerRef.current) {
				clearTimeout(throttleTimerRef.current);
			}
		};
	}, [currentStep, isSorting, isPaused, operationStats]);

	// Finalize stats when sorting completes.
	useEffect(() => {
		if (!isSorting && operationStats) {
			setThrottledOperationStats(operationStats);
		}
	}, [isSorting, operationStats]);

	return {
		array,
		arraySize,
		setArraySize,
		animationSpeed,
		setAnimationSpeed,
		sortingAlgorithm,
		setSortingAlgorithm,
		dataProfile,
		setDataProfile,
		viewMode,
		toggleViewMode,
		animationSteps,
		currentStep,
		isSorting,
		isPaused,
		operationStats,
		throttledOperationStats,
		shuffleArray,
		startSort,
		onPlayPause,
		onStepForward,
		onStepBack,
		currentFrame,
		isFastMode,
		goToNextStep,
		seekToStep,
		resetAnimation,
	};
};
