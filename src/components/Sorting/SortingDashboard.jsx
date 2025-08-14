import styles from './SortingDashboard.module.css';
import SortingControls from './SortingControls/SortingControls';
import ArrayVisualizer from './ArrayVisualizer/ArrayVisualizer';
import {useEffect, useState} from 'react';
import {
	getBubbleSortAnimations,
	getHeapSortAnimations,
	getInsertionSortAnimations,
	getMergeSortAnimations,
	getQuickSortAnimations,
	getSelectionSortAnimations,
} from '../../utils/sortingAlgorithms.js';
import PseudoCodeViewer from "./PseudoCode/PseudoCodeViewer.jsx";
import PlaybackControls from './SortingControls/PlaybackControls';

const SortingDashboard = () => {
	// Array state
	const [array, setArray] = useState([]);
	const [arraySize, setArraySize] = useState(50);

	// Animation controls
	const [animationSpeed, setAnimationSpeed] = useState(50);
	const [sortingAlgorithm, setSortingAlgorithm] = useState('bubbleSort');
	const [isSorting, setIsSorting] = useState(false);
	const [isPaused, setIsPaused] = useState(true);

	// Visualization state
	const [comparingIndices, setComparingIndices] = useState([]);
	const [swappingIndices, setSwappingIndices] = useState([]);
	const [sortedIndices, setSortedIndices] = useState([]);
	const [activeLine, setActiveLine] = useState(null);
	const [viewMode, setViewMode] = useState('bars');

	// Animation state
	const [currentStep, setCurrentStep] = useState(0);
	const [animations, setAnimations] = useState([]);
	const [arrayHistory, setArrayHistory] = useState([]);
	const [animationSpeedMultiplier, setAnimationSpeedMultiplier] = useState(1);

	// Generate a new random array
	const generateArray = () => {
		const newArray = [];
		for (let i = 0; i < arraySize; i++) {
			// Create array with IDs for box view
			newArray.push({
				id: `item-${i}`, value: Math.floor(Math.random() * 250) + 10
			});
		}
		setArray(newArray);
		setComparingIndices([]);
		setSwappingIndices([]);
		setSortedIndices([]);
		setIsSorting(false);
		setCurrentStep(0);
		setAnimations([]);
		setArrayHistory([]);
		setActiveLine(null);
	};

	// Initialize array when size changes
	useEffect(() => {
		generateArray();
	}, [arraySize]);


	// Prepare animations but don't play them yet
	const startSort = () => {
		if (isSorting) return;

		// Extract values for algorithms that expect plain arrays
		const arrayValues = array.map(item => item.value);

		let animationSteps = [];
		switch (sortingAlgorithm) {
			case 'bubbleSort':
				animationSteps = getBubbleSortAnimations(arrayValues);
				break;
			case 'quickSort':
				animationSteps = getQuickSortAnimations(arrayValues);
				break;
			case 'mergeSort':
				animationSteps = getMergeSortAnimations(arrayValues);
				break;
			case 'heapSort':
				animationSteps = getHeapSortAnimations(arrayValues);
				break;
			case 'insertionSort':
				animationSteps = getInsertionSortAnimations(arrayValues);
				break;
			case 'selectionSort':
				animationSteps = getSelectionSortAnimations(arrayValues);
				break;
			default:
				animationSteps = getBubbleSortAnimations(arrayValues);
		}

		// Pre-compute array states for each step to enable stepping backward
		const history = computeArrayHistory(arrayValues, animationSteps);

		setAnimations(animationSteps);
		setArrayHistory(history);
		setIsSorting(true);
		setCurrentStep(0);
		setIsPaused(false);
	};

	// Compute all array states for each animation step
	const computeArrayHistory = (initialArray, animations) => {
		const history = [initialArray.map((value, index) => ({id: array[index].id, value}))];
		let currentArray = [...initialArray];

		for (const anim of animations) {
			const {type, indices, value, index} = anim;
			const newArray = [...currentArray];

			if (type === 'swap') {
				[newArray[indices[0]], newArray[indices[1]]] = [newArray[indices[1]], newArray[indices[0]]];
			} else if (type === 'overwrite') {
				newArray[index] = value;
			}

			currentArray = newArray;
			// Store array with IDs for box view
			history.push(currentArray.map((value, index) => ({id: array[index].id, value})));
		}

		return history;
	};

	// Playback controls
	const onPlayPause = () => {
		if (!isSorting || currentStep >= animations.length) return;
		setIsPaused(prev => !prev);
	};

	const onStepForward = () => {
		if (!isSorting || currentStep >= animations.length - 1) return;
		setIsPaused(true);
		setCurrentStep(prev => prev + 1);
	};

	const onStepBack = () => {
		if (!isSorting || currentStep <= 0) return;
		setIsPaused(true);
		setCurrentStep(prev => prev - 1);
	};

	// Apply animation step effects
	useEffect(() => {
		if (!isSorting || animations.length === 0) return;

		// Get the current animation step
		const stepData = animations[currentStep];
		if (!stepData) return;

		// Update visualization state based on step type
		const {type, indices, line, index} = stepData;

		// Update the current array state from pre-computed history
		if (arrayHistory[currentStep]) {
			setArray(arrayHistory[currentStep]);
		}

		// Update the visualization highlights
		if (line) setActiveLine(line);

		// Update the highlighting indices
		if (type === 'compare') {
			setComparingIndices(indices);
			setSwappingIndices([]);
		} else if (type === 'swap' || type === 'overwrite') {
			setComparingIndices([]);
			setSwappingIndices(indices || [index]);
		} else if (type === 'sorted') {
			const newSortedIndices = new Set(sortedIndices);
			newSortedIndices.add(index);
			setSortedIndices(Array.from(newSortedIndices));
		}

		// Check if sorting is complete
		if (currentStep === animations.length - 1) {
			setSortedIndices(Array.from({length: array.length}, (_, i) => i));
			setComparingIndices([]);
			setSwappingIndices([]);
			setIsPaused(true);
		}
	}, [currentStep, isSorting, animations, arrayHistory]);

	// Auto-play effect
	const getAnimationDelay = () => {
		const baseDelay = 200;
		return baseDelay / animationSpeed;
	}
	useEffect(() => {
		if (isPaused || !isSorting || currentStep >= animations.length - 1) {
			return;
		}

		const timer = setTimeout(() => {
			setCurrentStep(prev => prev + 1);
		}, getAnimationDelay());

		return () => clearTimeout(timer);
	}, [isPaused, isSorting, currentStep, animations, animationSpeed]);

	// Toggle view mode between bars and boxes
	const toggleViewMode = () => {
		setViewMode(prev => prev === 'bars' ? 'boxes' : 'bars');
	};


	return (<div className={styles.dashboardContainer}>
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
			animationSpeedMultiplier={animationSpeedMultiplier}
			setAnimationSpeedMultiplier={setAnimationSpeedMultiplier}
		/>

		<div className={styles.visualizationArea}>
			<ArrayVisualizer
				viewMode={viewMode}
				array={array}
				comparingIndices={comparingIndices}
				swappingIndices={swappingIndices}
				sortedIndices={sortedIndices}
			/>

			<div className={styles.controlsArea}>
				<PlaybackControls
					onPlayPause={onPlayPause}
					onStepBack={onStepBack}
					onStepForward={onStepForward}
					isSorting={isSorting}
					isPaused={isPaused}
				/>
				<PseudoCodeViewer algorithm={sortingAlgorithm} activeLine={activeLine}/>
			</div>
		</div>
	</div>);
};

export default SortingDashboard;
