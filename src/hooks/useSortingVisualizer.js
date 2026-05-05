// Sorting timeline state and playback orchestration.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
	const [animationSpeed, setAnimationSpeedState] = useState(100);
	const [sortingAlgorithm, setSortingAlgorithmState] =
		useState(initialAlgorithm);
	const [dataProfile, setDataProfileState] = useState(() =>
		getDefaultDataProfile(initialAlgorithm)
	);
	const [viewMode, setViewMode] = useState('bars');
	const [animationSteps, setAnimationSteps] = useState([]);
	const [currentStep, setCurrentStep] = useState(0);
	const [isSorting, setIsSorting] = useState(false);
	const [isPaused, setIsPaused] = useState(true);
	const [operationStats, setOperationStats] = useState(null);
	const [throttledOperationStats, setThrottledOperationStats] = useState(null);

	const throttleTimerRef = useRef(null);
	const animationTimerRef = useRef(null);

	const resetAnimation = useCallback(() => {
		setIsSorting(false);
		setIsPaused(true);
		setCurrentStep(0);
		setAnimationSteps([]);
		setOperationStats(null);
		setThrottledOperationStats(null);

		if (throttleTimerRef.current) {
			clearTimeout(throttleTimerRef.current);
			throttleTimerRef.current = null;
		}
		if (animationTimerRef.current) {
			clearTimeout(animationTimerRef.current);
			animationTimerRef.current = null;
		}
	}, []);

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

	const setAnimationSpeed = useCallback(nextSpeed => {
		setAnimationSpeedState(prev =>
			typeof nextSpeed === 'function' ? nextSpeed(prev) : nextSpeed
		);
	}, []);

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
		setCurrentStep(0);
		setIsSorting(true);
		setIsPaused(false);
	}, [isSorting, array, sortingAlgorithm, resetAnimation, shuffleArray]);

	// Auto-play functionality for all views
	useEffect(() => {
		if (!isSorting || isPaused || !animationSteps.length) {
			if (animationTimerRef.current) {
				clearTimeout(animationTimerRef.current);
			}
			return;
		}

		// Calculate speed based on animationSpeed slider
		// animationSpeed typically ranges from 25 to 500 (from SortingControls)
		// We want a delay between 1000ms and 10ms
		const delay = Math.max(1050 - animationSpeed * 2, 10);

		animationTimerRef.current = setTimeout(() => {
			setCurrentStep(prev => {
				const next = Math.min(prev + 1, animationSteps.length - 1);
				if (next >= animationSteps.length - 1) {
					setIsSorting(false);
					setIsPaused(true);
				}
				return next;
			});
		}, delay);

		return () => {
			if (animationTimerRef.current) {
				clearTimeout(animationTimerRef.current);
			}
		};
	}, [currentStep, isSorting, isPaused, animationSteps.length, animationSpeed]);

	// Function to advance to the next step manually
	const goToNextStep = useCallback(() => {
		if (!animationSteps.length) return;
		const next = Math.min(currentStep + 1, animationSteps.length - 1);
		setCurrentStep(next);
		if (next >= animationSteps.length - 1) {
			setIsSorting(false);
			setIsPaused(true);
		}
	}, [currentStep, animationSteps.length]);

	const onPlayPause = () => {
		if (!isSorting) return;
		setIsPaused(prev => !prev);
	};

	const onStepForward = () => {
		if (!animationSteps.length) return;
		const next = Math.min(currentStep + 1, animationSteps.length - 1);
		setIsPaused(true);
		setCurrentStep(next);
		setIsSorting(next < animationSteps.length - 1);
	};

	const onStepBack = () => {
		if (!animationSteps.length) return;
		const next = Math.max(currentStep - 1, 0);
		setIsPaused(true);
		setCurrentStep(next);
		setIsSorting(next < animationSteps.length - 1);
	};

	const seekToStep = useCallback(
		step => {
			if (!animationSteps.length) return;
			const clamped = Math.max(0, Math.min(step, animationSteps.length - 1));
			setCurrentStep(clamped);
			setIsPaused(true);
			setIsSorting(clamped < animationSteps.length - 1);
		},
		[animationSteps.length]
	);

	const currentFrame = useMemo(() => {
		return animationSteps[currentStep];
	}, [animationSteps, currentStep]);

	const isFastMode = useMemo(() => {
		return animationSpeed > 250;
	}, [animationSpeed]);

	// Throttled stats update effect
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

	// Finalize stats when sorting completes
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
