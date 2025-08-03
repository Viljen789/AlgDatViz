import styles from './SortingControls.module.css';

const SortingControls = ({
	                         generateArray,
	                         setArraySize,
	                         arraySize,
	                         setAnimationSpeed,
	                         animationSpeed,
	                         setSortingAlgorithm,
	                         sortingAlgorithm,
	                         startSort,
	                         isSorting
                         }) => {
	return (
		<div className={styles.controlsContainer}>
			<div className={styles.controlGroup}>
				<button
					className={styles.controlButton}
					onClick={generateArray}
					disabled={isSorting}
				>
					Generate New Array
				</button>
			</div>

			<div className={styles.controlGroup}>
				<label htmlFor="size">Array Size</label>
				<input
					type="range"
					id="size"
					min="5"
					max="100"
					value={arraySize}
					onChange={(e) => setArraySize(parseInt(e.target.value))}
					className={styles.slider}
					disabled={isSorting}
				/>
			</div>

			<div className={styles.controlGroup}>
				<label htmlFor="speed">Speed</label>
				<input
					type="range"
					id="speed"
					min="10"
					max="200"
					value={animationSpeed}
					onChange={(e) => setAnimationSpeed(parseInt(e.target.value))}
					className={styles.slider}
					disabled={isSorting}
				/>
			</div>

			<div className={styles.controlGroup}>
				<select
					className={styles.select}
					value={sortingAlgorithm}
					onChange={(e) => setSortingAlgorithm(e.target.value)}
					disabled={isSorting}
				>
					<option value="bubbleSort">Bubble Sort</option>
					<option value="mergeSort">Merge Sort</option>
					<option value="quickSort">Quick Sort</option>
				</select>
				<button
					className={styles.controlButton}
					onClick={startSort}
					disabled={isSorting}
				>
					{isSorting ? 'Sorting...' : 'Sort!'}
				</button>
			</div>
		</div>
	);
};

export default SortingControls;
