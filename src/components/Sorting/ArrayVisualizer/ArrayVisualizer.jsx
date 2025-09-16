import BarView from './BarView';
import BoxView from './BoxView';
import AlgorithmSpecificView from './AlgorithmViews/AlgorithmSpecificViews.jsx';
import PlaybackControls from '../SortingControls/PlaybackControls';
import styles from './ArrayVisualizer.module.css';

const ArrayVisualizer = ({
	viewMode,
	array,
	sortingAlgorithm,
	currentFrame,
	isSorting,
	isPaused,
	onPlayPause,
	onStepBack,
	onStepForward,
	arraySize,
	onAnimationComplete,
	...animationProps
}) => {
	const SPECIAL_ALGORITHMS = [
		'countingSort',
		'bucketSort',
		'mergeSort',
		'heapSort',
		'radixSort',
	];

	const shouldUseSpecialView =
		SPECIAL_ALGORITHMS.includes(sortingAlgorithm) && arraySize <= 20;

	return (
		<div className={styles.visualizerLayout}>
			<div className={styles.contentWrapper}>
				{shouldUseSpecialView ? (
					<AlgorithmSpecificView
						algorithm={sortingAlgorithm}
						array={array}
						currentFrame={currentFrame}
						onAnimationComplete={onAnimationComplete}
						{...animationProps}
					/>
				) : viewMode === 'bars' ? (
					<BarView
						array={array}
						onAnimationComplete={onAnimationComplete}
						{...animationProps}
					/>
				) : (
					<BoxView
						array={array}
						onAnimationComplete={onAnimationComplete}
						{...animationProps}
					/>
				)}
			</div>

			{isSorting && (
				<div className={styles.footerControls}>
					<PlaybackControls
						onPlayPause={onPlayPause}
						onStepBack={onStepBack}
						onStepForward={onStepForward}
						isSorting={isSorting}
						isPaused={isPaused}
					/>
				</div>
			)}
		</div>
	);
};

export default ArrayVisualizer;
