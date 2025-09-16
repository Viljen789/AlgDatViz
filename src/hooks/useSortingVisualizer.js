// Updated useSortingVisualizer.js - Add auto-animation for merge sort recursive view

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SORTING_FUNCTIONS } from '../utils/sorting';

export const useSortingVisualizer = (
	initialAlgorithm = 'bubbleSort',
	initialSize = 20
) => {
	const [array, setArray] = useState([]);
	const [arraySize, setArraySize] = useState(initialSize);
	const [animationSpeed, setAnimationSpeed] = useState(100);
	const [sortingAlgorithm, setSortingAlgorithm] = useState(initialAlgorithm);
	const [viewMode, setViewMode] = useState('bars');
	const [animationSteps, setAnimationSteps] = useState([]);
	const [currentStep, setCurrentStep] = useState(0);
	const [isSorting, setIsSorting] = useState(false);
	const [isPaused, setIsPaused] = useState(true);
	const [operationStats, setOperationStats] = useState(null);
	const [throttledOperationStats, setThrottledOperationStats] = useState(null);
	const [isAutoPlaying, setIsAutoPlaying] = useState(false); // NEW: For recursive view auto-play

	const throttleTimerRef = useRef(null);
	const autoPlayTimerRef = useRef(null); // NEW: For auto-play timer

	const resetAnimation = useCallback(() => {
		setIsSorting(false);
		setIsPaused(true);
		setCurrentStep(0);
		setAnimationSteps([]);
		setOperationStats(null);
		setThrottledOperationStats(null);
		setIsAutoPlaying(false); // NEW: Reset auto-play

		if (throttleTimerRef.current) {
			clearTimeout(throttleTimerRef.current);
		}
		if (autoPlayTimerRef.current) {
			// NEW: Clear auto-play timer
			clearTimeout(autoPlayTimerRef.current);
		}
	}, []);

	const shuffleArray = useCallback(() => {
		const nums = Array.from({ length: arraySize }, (_, i) => i + 1);
		for (let i = nums.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[nums[i], nums[j]] = [nums[j], nums[i]];
		}
		const newArray = nums.map((value, index) => ({
			id: `item-${index}-${Math.random().toString(36).slice(2, 9)}`,
			value,
		}));
		setArray(newArray);
		resetAnimation();
	}, [arraySize, resetAnimation]);

	useEffect(() => {
		shuffleArray();
	}, [arraySize]);

	const toggleViewMode = () =>
		setViewMode(prev => (prev === 'bars' ? 'boxes' : 'bars'));

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
			arrayWrites: step.stats?.swaps || 0,
			totalOperations: step.stats?.totalOperations || 0,
		}));

		setAnimationSteps(steps);
		setOperationStats(statsHistory);
		setThrottledOperationStats(statsHistory[0]);
		setCurrentStep(0);
		setIsSorting(true);
		setIsPaused(false);

		// NEW: Enable auto-play for merge sort recursive view
		if (sortingAlgorithm === 'mergeSort' && arraySize <= 20) {
			setIsAutoPlaying(true);
		}
	}, [
		isSorting,
		array,
		sortingAlgorithm,
		resetAnimation,
		shuffleArray,
		arraySize,
	]);

	// NEW: Auto-play functionality for recursive views
	useEffect(() => {
		if (!isSorting || isPaused || !isAutoPlaying || !animationSteps.length) {
			if (autoPlayTimerRef.current) {
				clearTimeout(autoPlayTimerRef.current);
			}
			return;
		}

		const speed = Math.max(1500 - animationSpeed * 12, 300); // Slower for recursive view
		autoPlayTimerRef.current = setTimeout(() => {
			setCurrentStep(prev => {
				if (prev < animationSteps.length - 1) {
					return prev + 1;
				} else {
					setIsPaused(true);
					setIsAutoPlaying(false);
					return prev;
				}
			});
		}, speed);

		return () => {
			if (autoPlayTimerRef.current) {
				clearTimeout(autoPlayTimerRef.current);
			}
		};
	}, [
		currentStep,
		isSorting,
		isPaused,
		isAutoPlaying,
		animationSteps.length,
		animationSpeed,
	]);

	// Function to advance to the next step manually
	const goToNextStep = useCallback(() => {
		if (currentStep < animationSteps.length - 1) {
			setCurrentStep(prev => prev + 1);
		} else {
			setIsPaused(true);
		}
	}, [currentStep, animationSteps.length]);

	const onPlayPause = () => {
		if (!isSorting) return;
		setIsPaused(prev => !prev);
	};

	const onStepForward = () => {
		if (isSorting) {
			goToNextStep();
		}
	};

	const onStepBack = () => {
		if (isSorting) {
			setCurrentStep(prev => Math.max(prev - 1, 0));
		}
	};

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
		isAutoPlaying, // NEW: Export auto-play state
		setIsAutoPlaying, // NEW: Export auto-play control
	};
};
