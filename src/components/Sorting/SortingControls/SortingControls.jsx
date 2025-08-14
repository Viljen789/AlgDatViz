// src/components/Sorting/SortingControls/SortingControls.jsx
import styles from './SortingControls.module.css';
import DropdownControl from "../../../common/DropdownControl/DropdownControl.jsx";

const SortingControls = ({
	                         generateArray,
	                         setArraySize,
	                         arraySize,
	                         setAnimationSpeed,
	                         animationSpeed,
	                         setSortingAlgorithm,
	                         sortingAlgorithm,
	                         startSort,
	                         isSorting,
	                         isPaused,
	                         viewMode,
	                         toggleViewMode,
	                         animationSpeedMultiplier,
	                         setAnimationSpeedMultiplier
                         }) => {
	const algorithms = [
		{value: 'bubbleSort', label: 'Bubble Sort'},
		{value: 'quickSort', label: 'Quick Sort'},
		{value: 'mergeSort', label: 'Merge Sort'},
		{value: 'heapSort', label: 'Heap Sort'},
		{value: 'insertionSort', label: 'Insertion Sort'},
		{value: 'selectionSort', label: 'Selection Sort'}
	];
	const sizeOptions = [10, 20, 50, 100];
	const speedOptions = [0.5, 1, 2, 5, 10];

	return (
		<div className={styles.controlsContainer}>
			<div className={styles.controlGroup}>
				<button
					className={styles.controlButton}
					onClick={generateArray}
					disabled={isSorting && !isPaused}
				>
					Generate New Array
				</button>
			</div>


			<div className={styles.controlGroup}>
				<DropdownControl label="Array Size" value={arraySize}>
					{sizeOptions.map(size => (
						<button
							key={size}
							className={`${styles.optionButton} ${arraySize === size ? styles.activeOption : ''}`}
							onClick={() => setArraySize(size)}
						>
							{size}
						</button>
					))}
				</DropdownControl>
				<div className={styles.controlGroup}>
					<DropdownControl label="Speed" value={`${animationSpeedMultiplier}x`}>
						{speedOptions.map(speed => (
							<button
								key={speed}
								className={`${styles.optionButton} ${animationSpeedMultiplier === speed ? styles.activeOption : ''}`}
								onClick={() => setAnimationSpeedMultiplier(speed)}
							>
								{speed}x
							</button>
						))}
					</DropdownControl>
				</div>
			</div>

			<div className={styles.controlGroup}>
				<label htmlFor="algorithm">Algorithm:</label>
				<select
					id="algorithm"
					value={sortingAlgorithm}
					onChange={(e) => setSortingAlgorithm(e.target.value)}
					className={styles.select}
					disabled={isSorting && !isPaused}
				>
					{algorithms.map(algo => (
						<option key={algo.value} value={algo.value}>
							{algo.label}
						</option>
					))}
				</select>
			</div>

			<div className={styles.controlGroup}>
				<button
					className={`${styles.controlButton} ${styles.viewModeButton}`}
					onClick={toggleViewMode}
					disabled={isSorting && !isPaused}
				>
					View: {viewMode === 'bars' ? 'Bars' : 'Boxes'}
				</button>
			</div>

			<div className={styles.controlGroup}>
				<button
					className={`${styles.controlButton} ${styles.startButton}`}
					onClick={startSort}
					disabled={isSorting && !isPaused}
				>
					Sort!
				</button>
			</div>
		</div>
	);
};

export default SortingControls;
