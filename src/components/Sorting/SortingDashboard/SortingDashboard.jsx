import styles from './SortingDashboard.module.css';
import { useSortingVisualizer } from '../../../hooks/useSortingVisualizer';
import DashboardLayout from '../../../common/DashboardLayout/DashboardLayout';
import Panel from '../../../common/Panel/Panel';
import SortingControls from '../SortingControls/SortingControls';
import ArrayVisualizer from '../ArrayVisualizer/ArrayVisualizer';
import SidebarHub from '../AlgorithmInfoPanel/Views/SidebarHub/SidebarHub';
import { ALGORITHM_INFO } from '../../../utils/sorting';

const SortingDashboard = () => {
	const {
		array,
		arraySize,
		setArraySize,
		animationSpeed,
		setAnimationSpeed,
		sortingAlgorithm,
		setSortingAlgorithm,
		viewMode,
		toggleViewMode,
		isSorting,
		isPaused,
		isFastMode,
		throttledOperationStats,
		shuffleArray,
		startSort,
		onPlayPause,
		onStepBack,
		onStepForward,
		currentFrame,
	} = useSortingVisualizer();

	const SPECIAL_ALGORITHMS = [
		'countingSort',
		'bucketSort',
		'mergeSort',
		'heapSort',
		'radixSort',
	];
	const isSpecialAlgorithm = SPECIAL_ALGORITHMS.includes(sortingAlgorithm);
	const shouldShowWarning = isSpecialAlgorithm && arraySize > 20;

	return (
		<DashboardLayout
			controls={
				<SortingControls
					shuffleArray={shuffleArray}
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
					isSpecialAlgorithm={isSpecialAlgorithm}
					shouldShowWarning={shouldShowWarning}
				/>
			}
		>
			<div className={styles.contentGrid}>
				<Panel className={styles.visualizerWrapper}>
					{shouldShowWarning && (
						<div className={styles.algorithmWarning}>
							<strong>
								{ALGORITHM_INFO[sortingAlgorithm]?.name}
							</strong>{' '}
							works best with smaller arrays (≤20 elements) for
							detailed visualization. Consider reducing array size
							for better learning experience.
						</div>
					)}

					<ArrayVisualizer
						viewMode={viewMode}
						array={array}
						arraySize={arraySize}
						sortingAlgorithm={sortingAlgorithm}
						isSorting={isSorting}
						isPaused={isPaused}
						onPlayPause={onPlayPause}
						onStepBack={onStepBack}
						onStepForward={onStepForward}
						isFastMode={isFastMode}
						comparingIndices={currentFrame.comparing || []}
						swappingIndices={currentFrame.swapping || []}
						sortedIndices={currentFrame.sorted || []}
						currentFrame={currentFrame}
					/>
				</Panel>

				<Panel className={styles.sidebarWrapper}>
					<SidebarHub
						sortingAlgorithm={sortingAlgorithm}
						currentFrame={currentFrame}
						operationStats={throttledOperationStats}
						info={ALGORITHM_INFO[sortingAlgorithm]}
						arraySize={arraySize}
						isSorting={isSorting}
						isFastMode={isFastMode}
						isSpecialVisualization={
							isSpecialAlgorithm && arraySize <= 20
						}
					/>
				</Panel>
			</div>
		</DashboardLayout>
	);
};

export default SortingDashboard;
