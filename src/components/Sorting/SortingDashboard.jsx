import {useEffect, useState} from 'react';
import styles from './SortingDashboard.module.css';
import SortingControls from './SortingControls/SortingControls';
import ArrayVisualizer from './ArrayVisualizer/ArrayVisualizer';
import PseudoCodeViewer from "./PseudoCode/PseudoCodeViewer.jsx";

// Import all the step generators
import {
    getBubbleSortSteps,
    getBucketSortSteps,
    getCountingSortSteps,
    getHeapSortSteps,
    getInsertionSortSteps,
    getMergeSortSteps,
    getQuickSortSteps,
    getRadixSortSteps,
    getSelectionSortSteps,
} from '../../utils/sortingAlgorithms.js';

const SortingDashboard = () => {
  // --- STATE MANAGEMENT ---
  const [array, setArray] = useState([]);
  const [arraySize, setArraySize] = useState(50);
  const [animationSpeed, setAnimationSpeed] = useState(100);
  const [sortingAlgorithm, setSortingAlgorithm] = useState('bubbleSort');
  const [viewMode, setViewMode] = useState('bars');
  const [animationSteps, setAnimationSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSorting, setIsSorting] = useState(false);
  const [isPaused, setIsPaused] = useState(true);

  // --- CORE LOGIC ---
  const generateArray = () => {
    const newArray = Array.from({length: arraySize}, () => ({
      id: Math.random().toString(36).substr(2, 9),
      value: Math.floor(Math.random() * 250) + 10,
    }));
    setArray(newArray);
    resetAnimation();
  };

  const resetAnimation = () => {
    setIsSorting(false);
    setIsPaused(true);
    setCurrentStep(0);
    setAnimationSteps([]);
  };

  useEffect(generateArray, [arraySize]);

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'bars' ? 'boxes' : 'bars');
  };

  const startSort = () => {
    if (isSorting) {
      // Stop and reset
      resetAnimation();
      generateArray();
      return;
    }

    const plainArray = array.map(item => item.value);
    let steps = [];

    switch (sortingAlgorithm) {
      case 'bubbleSort':
        steps = getBubbleSortSteps(plainArray);
        break;
      case 'selectionSort':
        steps = getSelectionSortSteps(plainArray);
        break;
      case 'heapSort':
        steps = getHeapSortSteps(plainArray);
        break;
      case 'insertionSort':
        steps = getInsertionSortSteps(plainArray);
        break;
      case 'quickSort':
        steps = getQuickSortSteps(plainArray);
        break;
      case 'mergeSort':
        steps = getMergeSortSteps(plainArray);
        break;
      case 'countingSort':
        steps = getCountingSortSteps(plainArray);
        break;
      case 'radixSort':
        steps = getRadixSortSteps(plainArray);
        break;
      case 'bucketSort':
        steps = getBucketSortSteps(plainArray);
        break;
      default:
        steps = getBubbleSortSteps(plainArray);
    }

    setAnimationSteps(steps);
    setCurrentStep(0);
    setIsSorting(true);
    setIsPaused(false);
  };

  // --- PLAYBACK HANDLERS ---
  const onPlayPause = () => {
    if (!isSorting) return;
    setIsPaused(prev => !prev);
  };

  const onStepForward = () => {
    if (!isSorting) return;
    setCurrentStep(prev => Math.min(prev + 1, animationSteps.length - 1));
  };

  const onStepBack = () => {
    if (!isSorting) return;
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  // --- ANIMATION ENGINE ---
  const currentFrame = animationSteps[currentStep] || {};

  useEffect(() => {
    if (isPaused || !isSorting || currentStep >= animationSteps.length - 1) {
      if (currentStep >= animationSteps.length - 1 && isSorting) {
        setIsPaused(true);
      }
      return;
    }

    const delay = 210 - animationSpeed;
    const timer = setTimeout(() => {
      setCurrentStep(prev => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [currentStep, isPaused, isSorting, animationSteps, animationSpeed]);

  // Update array based on history
  useEffect(() => {
    if (currentFrame.array) {
      const newArrayState = currentFrame.array.map((value, index) => ({
        id: array[index]?.id || `item-${index}`,
        value,
      }));
      setArray(newArrayState);
    }
  }, [currentFrame.array]);

  return (
    <div className={styles.dashboardContainer}>
      <SortingControls
        generateArray={generateArray}
        setArraySize={setArraySize}
        arraySize={arraySize}
        setAnimationSpeed={setAnimationSpeed}
        animationSpeed={animationSpeed}
        setSortingAlgorithm={setSortingAlgorithm}
        sortingAlgorithm={sortingAlgorithm}
        startSort={startSort}
        isSorting={isSorting}
        viewMode={viewMode}
        toggleViewMode={toggleViewMode}
      />

      <div className={styles.visualizationArea}>
        <ArrayVisualizer
          viewMode={viewMode}
          array={array}
          isSorting={isSorting}
          isPaused={isPaused}
          onPlayPause={onPlayPause}
          onStepBack={onStepBack}
          onStepForward={onStepForward}
          comparingIndices={currentFrame.comparing || []}
          swappingIndices={currentFrame.swapping || []}
          sortedIndices={currentFrame.sorted || []}
          currentIndex={currentFrame.currentIndex}
        />

        <div className={styles.controlsArea}>
          <PseudoCodeViewer
            algorithm={sortingAlgorithm}
            activeLine={currentFrame.line}
          />
        </div>
      </div>
    </div>
  );
};

export default SortingDashboard;
