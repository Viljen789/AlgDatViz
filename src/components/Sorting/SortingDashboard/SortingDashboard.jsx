import styles from './SortingDashboard.module.css';
import { useSortingVisualizer } from '../../../hooks/useSortingVisualizer';
import DashboardLayout from '../../../common/DashboardLayout/DashboardLayout';
import Panel from '../../../common/Panel/Panel';
import SortingControls from '../SortingControls/SortingControls';
import ArrayVisualizer from '../ArrayVisualizer/ArrayVisualizer';
import SidebarHub from '../AlgorithmInfoPanel/Views/SidebarHub/SidebarHub';
import { ALGORITHM_INFO } from '../../../utils/sorting';
import MergeSortExplanation from '../AlgorithmInfoPanel/Views/CustomAlgorithmInstructions/MergeSortExplanation.jsx';

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
		goToNextStep,
	} = useSortingVisualizer();

	const SPECIAL_ALGORITHMS = [
		'countingSort',
		'bucketSort',
		'mergeSort',
		'heapSort',
		'radixSort',
	];
	const isSpecialAlgorithm = SPECIAL_ALGORITHMS.includes(sortingAlgorithm);
	/*const shouldShowWarning = isSpecialAlgorithm && arraySize > 20;*/ /*May use later*/
	const isSpecialMergeSort =
		sortingAlgorithm === 'mergeSort' && arraySize <= 20;
	return (
		<DashboardLayout
			controls={
				<SortingControls
					arraySize={arraySize}
					setArraySize={setArraySize}
					animationSpeed={animationSpeed}
					setAnimationSpeed={setAnimationSpeed}
					sortingAlgorithm={sortingAlgorithm}
					setSortingAlgorithm={setSortingAlgorithm}
					viewMode={viewMode}
					toggleViewMode={toggleViewMode}
					isSorting={isSorting}
					isPaused={isPaused}
					isFastMode={isFastMode}
					shuffleArray={shuffleArray}
					startSort={startSort}
					onPlayPause={onPlayPause}
					onStepBack={onStepBack}
					onStepForward={onStepForward}
				/>
			}
		>
			<div className={styles.contentGrid}>
				<div className={styles.visualizerColumn}>
					<Panel className={styles.visualizerWrapper}>
						<ArrayVisualizer
							viewMode={viewMode}
							array={array}
							isSorting={isSorting}
							isPaused={isPaused}
							onPlayPause={onPlayPause}
							onStepBack={onStepBack}
							onStepForward={onStepForward}
							isFastMode={isFastMode}
							sortingAlgorithm={sortingAlgorithm}
							arraySize={arraySize}
							currentFrame={currentFrame}
							comparingIndices={currentFrame?.comparing || []}
							swappingIndices={currentFrame?.swapping || []}
							sortedIndices={currentFrame?.sorted || []}
							onAnimationComplete={goToNextStep}
						/>
					</Panel>

					{isSpecialMergeSort && (
						<Panel className={styles.explanationWrapper}>
							<MergeSortExplanation currentFrame={currentFrame} />
						</Panel>
					)}
				</div>

				<Panel className={styles.sidebarWrapper}>
					<SidebarHub
						sortingAlgorithm={sortingAlgorithm}
						currentFrame={currentFrame}
						operationStats={throttledOperationStats}
						info={ALGORITHM_INFO[sortingAlgorithm]}
						arraySize={arraySize}
						isSorting={isSorting}
						isFastMode={isFastMode}
					/>
				</Panel>
			</div>
		</DashboardLayout>
	);
};

export default SortingDashboard;
