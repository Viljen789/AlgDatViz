// src/hooks/useSortingVisualizer.js

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {SORTING_FUNCTIONS} from '../utils/sorting';

export const useSortingVisualizer = (initialAlgorithm = 'bubbleSort', initialSize = 50) => {
    // --- STATE MANAGEMENT ---
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
    const [isGraphVisible, setIsGraphVisible] = useState(false);


    // --- REFS ---
    const throttleTimerRef = useRef(null);

    // --- CORE LOGIC & HANDLERS ---
    const resetAnimation = useCallback(() => {
        setIsSorting(false);
        setIsPaused(true);
        setCurrentStep(0);
        setAnimationSteps([]);
        setOperationStats(null);
        setThrottledOperationStats(null);
        if (throttleTimerRef.current) {
            clearTimeout(throttleTimerRef.current);
        }
        setIsGraphVisible(false);
    }, []);
    const toggleGraphVisibility = useCallback(() => {
        setIsGraphVisible(prev => !prev);
    }, []);

    const shuffleArray = useCallback(() => {
        const nums = Array.from({length: arraySize}, (_, i) => i + 1);
        for (let i = nums.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nums[i], nums[j]] = [nums[j], nums[i]];
        }
        const newArray = nums.map((value, index) => ({
            id: `item-${index}-${Math.random().toString(36).slice(2, 9)}`, value,
        }));
        setArray(newArray);
        resetAnimation();
    }, [arraySize, resetAnimation]);

    useEffect(shuffleArray, [arraySize]);

    const toggleViewMode = () => setViewMode(prev => (prev === 'bars' ? 'boxes' : 'bars'));

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
        if (!result || !result.steps || !result.steps.length === 0) return;

        const steps = result.steps;
        const statsHistory = steps.map((step, index) => ({
            step: index + 1,
            comparisons: step.stats?.comparisons || 0,
            arrayWrites: step.stats?.swaps || 0,
            totalOperations: step.stats?.totalOperations || 0,
        }));

        setAnimationSteps(steps);
        setOperationStats(statsHistory);
        // Initialize the throttled stats with just the first step
        setThrottledOperationStats([statsHistory[0]]);
        setCurrentStep(0);
        setIsSorting(true);
        setIsPaused(false);
    }, [isSorting, array, sortingAlgorithm, resetAnimation, shuffleArray]);

    const onPlayPause = () => !isSorting || setIsPaused(prev => !prev);
    const onStepForward = () => isSorting && setCurrentStep(prev => Math.min(prev + 1, animationSteps.length - 1));
    const onStepBack = () => isSorting && setCurrentStep(prev => Math.max(prev - 1, 0));

    // --- MEMOIZED VALUES ---
    const currentFrame = useMemo(() => animationSteps[currentStep] || {}, [animationSteps, currentStep]);
    const isFastMode = useMemo(() => animationSpeed > 250, [animationSpeed]);


    // --- EFFECTS ---
    useEffect(() => {
        if (currentFrame.array) {
            const newArrayState = currentFrame.array.map((value, index) => ({
                id: array[index]?.id || `item-${index}`, value,
            }));
            setArray(newArrayState);
        }
    }, [currentFrame]); // Dependency array simplified for clarity

    // Animation Engine
    useEffect(() => {
        if (isPaused || !isSorting || currentStep >= animationSteps.length - 1) {
            if (currentStep >= animationSteps.length - 1 && isSorting) setIsPaused(true);
            return;
        }
        const delay = 210 - animationSpeed;
        const timer = setTimeout(() => setCurrentStep(prev => prev + 1), delay);
        return () => clearTimeout(timer);
    }, [currentStep, isPaused, isSorting, animationSteps.length, animationSpeed]);

    // The Throttling Logic for the Chart
    useEffect(() => {
        if (!isSorting || isPaused || !operationStats) return;

        if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);

        throttleTimerRef.current = setTimeout(() => {
            const currentHistory = operationStats.slice(0, currentStep + 1);
            setThrottledOperationStats(currentHistory);
        }, 60); // Approx. 16fps update rate for smoothness

        return () => {
            if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
        };
    }, [currentStep, isSorting, isPaused, operationStats]);

    // Ensure the FINAL chart is always 100% accurate when sorting finishes
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
        isGraphVisible,
        toggleGraphVisibility,
        isFastMode
    };
};
