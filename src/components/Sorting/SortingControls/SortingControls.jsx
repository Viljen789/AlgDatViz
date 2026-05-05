import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import styles from './SortingControls.module.css';
import HoverDropdown from '../../../common/DropdownControl/HoverDropdown.jsx';
import Button from '../../../common/Button/Button.jsx';
import Tooltip from '../../../common/Tooltip/Tooltip.jsx';

const SortingControls = ({
	shuffleArray,
	setArraySize,
	arraySize,
	setAnimationSpeed,
	animationSpeed,
	setSimplifiedMode,
	setSortingAlgorithm,
	sortingAlgorithm,
	startSort,
	isSorting,
	viewMode,
	toggleViewMode,
	isSpecialAlgorithm,
}) => {
	const [showPulse, setShowPulse] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (!isSorting) setShowPulse(true);
		}, 5000);
		return () => clearTimeout(timer);
	}, [isSorting]);

	const stopPulse = () => setShowPulse(false);

	const algorithms = [
		{ value: 'bubbleSort', label: 'Bubble Sort' },
		{ value: 'quickSort', label: 'Quick Sort' },
		{ value: 'mergeSort', label: 'Merge Sort' },
		{ value: 'heapSort', label: 'Heap Sort' },
		{ value: 'insertionSort', label: 'Insertion Sort' },
		{ value: 'selectionSort', label: 'Selection Sort' },
		{ value: 'countingSort', label: 'Counting Sort' },
		{ value: 'radixSort', label: 'Radix Sort' },
		{ value: 'bucketSort', label: 'Bucket Sort' },
	];

	const sizeOptions = [
		{ value: 10, label: '10 elements' },
		{ value: 20, label: '20 elements' },
		{ value: 50, label: '50 elements' },
		{ value: 100, label: '100 elements' },
	];

	const speedOptions = [
		{ value: 25, label: 'Study 0.5x' },
		{ value: 50, label: 'Lesson 1x' },
		{ value: 100, label: 'Flow 2x' },
		{ value: 250, label: 'Review 5x' },
		{ value: 500, label: 'Scan 10x' },
	];
	const handleSpeedChange = newSpeed => {
		const isSimplified = newSpeed >= 250;
		setAnimationSpeed(newSpeed);
		if (setSimplifiedMode) {
			setSimplifiedMode(isSimplified);
		}
	};
	const handleAlgorithmChange = algorithm => {
		setSortingAlgorithm(algorithm);
		if (isSorting) shuffleArray();
	};

	return (
		<div className={styles.controlsContainer} onClick={stopPulse}>
			<div className={styles.controlGroup}>
				<HoverDropdown
					label="Algorithm"
					options={algorithms}
					value={sortingAlgorithm}
					onChange={handleAlgorithmChange}
				/>
				<Tooltip text="Select a sorting technique to visualize its logic.">
					<Info size={14} className={styles.infoIcon} />
				</Tooltip>
			</div>
			<div className={styles.controlGroup}>
				<HoverDropdown
					label="Size"
					options={sizeOptions}
					value={arraySize}
					onChange={setArraySize}
				/>
			</div>
			<div className={styles.controlGroup}>
				<HoverDropdown
					label="Speed"
					options={speedOptions}
					value={animationSpeed}
					onChange={handleSpeedChange}
				/>
				<Tooltip text="Higher speed (e.g. 5x) may use simplified animations.">
					<Info size={14} className={styles.infoIcon} />
				</Tooltip>
			</div>
			<Button onClick={shuffleArray} disabled={isSorting}>
				Shuffle Array
			</Button>
			{(!isSpecialAlgorithm || arraySize > 20) && (
				<Button onClick={toggleViewMode}>
					{viewMode === 'bars' ? 'Show Box View' : ' Show Bar View'}
				</Button>
			)}
			<div className={showPulse ? 'pulse-hint' : ''}>
				<Button
					onClick={() => {
						stopPulse();
						startSort();
					}}
					variant="primary"
				>
					{isSorting ? 'Stop' : 'Start Sorting'}
				</Button>
			</div>
		</div>
	);
};

export default SortingControls;
