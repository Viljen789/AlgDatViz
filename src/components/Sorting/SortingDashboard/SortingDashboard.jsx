import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGrid, ListOrdered, Squircle } from 'lucide-react';
import styles from './SortingDashboard.module.css';
import { useSortingVisualizer } from '../../../hooks/useSortingVisualizer';
import {
	ALGORITHM_INFO,
	compareSortingAlgorithms,
} from '../../../utils/sorting';
import {
	ALGORITHM_META,
	SPEED_OPTIONS,
} from '../../../utils/sorting/algorithmMeta';
import SortingHero from '../SortingHero/SortingHero';
import PseudocodeRail from '../../../common/PseudocodeRail/PseudocodeRail';
import StepControlBar from '../../../common/StepControlBar/StepControlBar';
import { PSEUDO_CODE } from '../../../utils/sorting';
import BarView from '../ArrayVisualizer/BarView';
import BoxView from '../ArrayVisualizer/BoxView';
import MergeSortRecursiveView from '../ArrayVisualizer/AlgorithmViews/MergeSort/MergeSortRecursiveView.jsx';
import CountingSortView from '../ArrayVisualizer/AlgorithmViews/CountingSort/CountingSortView.jsx';
import BucketSortView from '../ArrayVisualizer/AlgorithmViews/BucketSort/BucketSortView.jsx';
import HeapSortView from '../ArrayVisualizer/AlgorithmViews/HeapSort/HeapSortView.jsx';
import RadixSortView from '../ArrayVisualizer/AlgorithmViews/RadixSort/RadixSortView.jsx';

const VIEW_OPTIONS = [
	{ value: 'bars', label: 'Bars', icon: LayoutGrid },
	{ value: 'boxes', label: 'Boxes', icon: Squircle },
	{ value: 'recursive', label: 'Recursive tree', icon: ListOrdered },
];

const ALGORITHMS_WITH_SPECIAL = {
	mergeSort: MergeSortRecursiveView,
	countingSort: CountingSortView,
	bucketSort: BucketSortView,
	heapSort: HeapSortView,
	radixSort: RadixSortView,
};

class VisualizationErrorBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError() {
		return { hasError: true };
	}

	componentDidUpdate(prevProps) {
		if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
			this.setState({ hasError: false });
		}
	}

	componentDidCatch(error) {
		console.error('Sorting visualizer failed', error);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className={styles.canvasError} role="alert">
					<strong>Visualizer paused</strong>
					<span>
						This algorithm view hit a rendering error. Change view or reset the
						run to continue.
					</span>
				</div>
			);
		}

		return this.props.children;
	}
}

const VIEW_MODES_FOR = algorithm => {
	if (algorithm === 'mergeSort') return ['recursive', 'bars', 'boxes'];
	if (algorithm in ALGORITHMS_WITH_SPECIAL) return ['bars', 'boxes'];
	return ['bars', 'boxes'];
};

const getActiveCue = (algorithm, currentFrame, canStep) => {
	if (!canStep) return 'Start a run to see the signature move on the canvas.';

	const metadata = currentFrame?.metadata || {};
	if (algorithm === 'bucketSort') {
		if (
			metadata.phase === 'distributing' &&
			metadata.targetBucket !== undefined
		) {
			return `Value ${metadata.activeValue} moves into bucket ${metadata.targetBucket} by range.`;
		}
		if (metadata.phase === 'sorting' && metadata.currentBucket !== undefined) {
			return `Bucket ${metadata.currentBucket} is sorted locally before collection.`;
		}
		if (
			metadata.phase === 'collecting' &&
			metadata.currentBucket !== undefined
		) {
			return `Bucket ${metadata.currentBucket} writes back in global range order.`;
		}
	}

	if (algorithm === 'countingSort') {
		if (metadata.phase === 'counting') {
			return 'The value itself chooses which frequency slot increases.';
		}
		if (metadata.phase === 'reconstructing') {
			return 'Counts are replayed from low value to high value.';
		}
	}

	if (algorithm === 'radixSort') {
		if (metadata.phase === 'distributing') {
			return `Only the ${metadata.exp || 1}s digit matters in this pass.`;
		}
		if (metadata.phase === 'collecting') {
			return 'Stable collection preserves the order from earlier digit passes.';
		}
	}

	if (algorithm === 'heapSort') {
		if (metadata.phase === 'building') {
			return 'Parent and child comparisons are forming the max-heap.';
		}
		if (metadata.phase === 'extracting') {
			return 'The root is the largest remaining value and moves to the sorted tail.';
		}
		if (metadata.phase === 'heapifying') {
			return 'The root is pushed down until the heap property returns.';
		}
	}

	if (currentFrame?.swapping?.length) {
		return 'The highlighted write is the algorithm changing the array.';
	}
	if (currentFrame?.comparing?.length) {
		return 'The highlighted values are the current decision point.';
	}
	if (currentFrame?.sorted?.length) {
		return 'The verified region shows what the algorithm no longer revisits.';
	}

	return 'Follow the highlighted values to see the algorithm choose its next move.';
};

const LEGEND_ITEMS = {
	default: [
		{ key: 'active', label: 'comparing', className: 'legendActive' },
		{ key: 'flight', label: 'write / swap', className: 'legendFlight' },
		{ key: 'special', label: 'pivot / cursor', className: 'legendSpecial' },
		{ key: 'done', label: 'sorted', className: 'legendDone' },
	],
	countingSort: [
		{ key: 'active', label: 'input value', className: 'legendActive' },
		{ key: 'flight', label: 'write output', className: 'legendFlight' },
		{ key: 'done', label: 'replayed', className: 'legendDone' },
		{ key: 'slot', label: 'count slot', className: 'legendSpecial' },
	],
	bucketSort: [
		{ key: 'active', label: 'range test', className: 'legendActive' },
		{ key: 'flight', label: 'collect', className: 'legendFlight' },
		{ key: 'done', label: 'sorted bucket', className: 'legendDone' },
	],
	radixSort: [
		{ key: 'active', label: 'active digit', className: 'legendFlight' },
		{ key: 'bucket', label: 'digit bucket', className: 'legendActive' },
		{ key: 'done', label: 'stable output', className: 'legendDone' },
	],
	heapSort: [
		{ key: 'active', label: 'parent / child', className: 'legendActive' },
		{ key: 'flight', label: 'extract / swap', className: 'legendFlight' },
		{ key: 'special', label: 'root / max', className: 'legendSpecial' },
		{ key: 'done', label: 'sorted tail', className: 'legendDone' },
	],
	mergeSort: [
		{ key: 'active', label: 'front cursor', className: 'legendActive' },
		{ key: 'flight', label: 'copy to output', className: 'legendFlight' },
		{ key: 'done', label: 'merged range', className: 'legendDone' },
	],
};

const getLegendItems = algorithm =>
	LEGEND_ITEMS[algorithm] || LEGEND_ITEMS.default;

const getFrameNarration = (algorithm, currentFrame, canStep) => {
	if (!canStep || !currentFrame) {
		return 'Choose a data profile, then start the run. The next frame will explain the active decision.';
	}

	const metadata = currentFrame.metadata || {};
	if (algorithm === 'countingSort') {
		if (metadata.phase === 'counting' && metadata.activeValue !== undefined) {
			return `Value ${metadata.activeValue} increments count[${metadata.activeSlot}], so k decides table size.`;
		}
		if (metadata.phase === 'counting') {
			return `The count table has k = ${metadata.k ?? '?'} slots before the input scan begins.`;
		}
		if (metadata.phase === 'reconstructing') {
			return `count[${metadata.activeSlot}] writes ${metadata.activeValue} back into position ${metadata.outputIndex}.`;
		}
	}

	if (algorithm === 'bucketSort') {
		if (
			metadata.phase === 'distributing' &&
			metadata.targetBucket !== undefined
		) {
			return `Value ${metadata.activeValue} lands in bucket ${metadata.targetBucket}; bucket balance is the lesson.`;
		}
		if (metadata.phase === 'distributing') {
			return 'Bucket ranges are ready; distribution quality depends on how evenly values land.';
		}
		if (metadata.phase === 'sorting') {
			return `Bucket ${metadata.currentBucket} is sorted locally before the global array is rebuilt.`;
		}
		if (metadata.phase === 'collecting') {
			return `Bucket ${metadata.currentBucket} is concatenated into the output array.`;
		}
	}

	if (algorithm === 'radixSort') {
		if (metadata.phase === 'distributing') {
			return `Only the ${metadata.placeLabel || metadata.exp + 's'} digit sends ${metadata.activeValue} to bucket ${metadata.currentDigit}.`;
		}
		if (metadata.phase === 'collecting') {
			return `Stable collection places ${metadata.activeValue} at output index ${metadata.destinationIndex}.`;
		}
		if (metadata.phase === 'writing') {
			return 'The completed digit pass becomes the input order for the next place.';
		}
	}

	if (algorithm === 'mergeSort') {
		if (metadata.phase === 'dividing') {
			return `Range ${metadata.range?.[0]}-${metadata.range?.[1]} splits into two smaller promises.`;
		}
		if (metadata.phase === 'merging') {
			if (metadata.movedElement !== undefined) {
				return `${metadata.movedElement} is copied from the ${metadata.movedFrom} half into output index ${metadata.outputIndex}.`;
			}
			return 'The two front cursors decide the next output slot.';
		}
	}

	if (algorithm === 'heapSort') {
		if (metadata.phase === 'extracting') {
			return 'The heap root moves to the sorted tail, then the remaining heap is repaired.';
		}
		if (metadata.phase === 'heapifying') {
			return 'Parent and child values are checked to restore the max-heap property.';
		}
	}

	if (currentFrame.swapping?.length === 2) {
		return `Indices ${currentFrame.swapping.join(' and ')} swap places.`;
	}
	if (currentFrame.swapping?.length === 1) {
		return `Index ${currentFrame.swapping[0]} receives a new value.`;
	}
	if (currentFrame.comparing?.length) {
		return `The algorithm compares indices ${currentFrame.comparing.join(' and ')}.`;
	}
	if (currentFrame.sorted?.length) {
		return 'A verified region grows; the algorithm no longer needs to revisit it.';
	}

	return 'The next highlighted state shows the algorithm choice.';
};

const SortingDashboard = ({
	initialAlgorithm = 'bubbleSort',
	onStoryRequest,
	embedded = false,
}) => {
	const {
		array,
		arraySize,
		setArraySize,
		animationSpeed,
		setAnimationSpeed,
		sortingAlgorithm,
		setSortingAlgorithm,
		dataProfile,
		setDataProfile,
		isSorting,
		isPaused,
		isFastMode,
		shuffleArray,
		startSort,
		onPlayPause,
		onStepBack,
		onStepForward,
		currentFrame,
		animationSteps,
		currentStep,
		goToNextStep,
		seekToStep,
		resetAnimation,
	} = useSortingVisualizer(initialAlgorithm);

	const [viewMode, setViewMode] = useState(() =>
		sortingAlgorithm === 'mergeSort' ? 'recursive' : 'bars'
	);
	const [comparisonRows, setComparisonRows] = useState(null);
	// Scopes playback keyboard control to this dashboard so it doesn't double-fire
	// with the lesson playground when both are mounted (the merge-sort lesson).
	const playerRef = useRef(null);

	useEffect(() => {
		setViewMode(VIEW_MODES_FOR(sortingAlgorithm)[0]);
	}, [sortingAlgorithm]);

	useEffect(() => {
		setComparisonRows(null);
	}, [array]);

	const handleViewModeChange = nextView => {
		resetAnimation();
		setViewMode(nextView);
	};

	const totalSteps = animationSteps?.length || 0;
	const isComplete =
		totalSteps > 0 && currentStep >= totalSteps - 1 && !isSorting;
	const canStep = totalSteps > 0;
	const maxStep = Math.max(totalSteps - 1, 0);
	const progressPct = maxStep > 0 ? (currentStep / maxStep) * 100 : 0;

	const statusSuffix = useMemo(() => {
		if (!canStep) return 'ready';
		if (isComplete) return `${totalSteps - 1} steps`;
		if (!isPaused) return `running`;
		return `paused`;
	}, [canStep, isComplete, isPaused, totalSteps]);

	const operationStats = currentFrame?.stats;
	const showcase = ALGORITHM_META[sortingAlgorithm]?.showcase;
	const activeCue = getActiveCue(sortingAlgorithm, currentFrame, canStep);
	const frameNarration = getFrameNarration(
		sortingAlgorithm,
		currentFrame,
		canStep
	);
	const legendItems = getLegendItems(sortingAlgorithm);

	const handlePrimaryRun = () => {
		if (isSorting) {
			resetAnimation();
		} else {
			startSort();
		}
	};

	const primaryLabel = isSorting
		? 'Reset run'
		: isComplete
			? 'Run again'
			: canStep
				? 'Replay sort'
				: 'Start sorting';

	const playbackState = !canStep
		? 'Ready'
		: isComplete
			? 'Complete'
			: !isPaused
				? 'Running'
				: 'Paused';

	const handlePlayPause = () => {
		if (!isSorting) {
			startSort();
		} else {
			onPlayPause();
		}
	};

	const handleSeek = step => seekToStep(step);
	const handleCompareAlgorithms = () => {
		const values = array.map(item => item.value);
		setComparisonRows(compareSortingAlgorithms(values));
	};

	const handleFirst = () => seekToStep(0);
	const handleLast = () =>
		seekToStep(Math.max((animationSteps?.length || 1) - 1, 0));

	const SpecialView = ALGORITHMS_WITH_SPECIAL[sortingAlgorithm];
	const allowedViews = VIEW_MODES_FOR(sortingAlgorithm);
	const useSpecial =
		sortingAlgorithm === 'mergeSort'
			? viewMode === 'recursive'
			: SpecialView && arraySize <= 20 && viewMode === 'bars';

	const canvasContent = useSpecial ? (
		<SpecialView
			array={array}
			currentFrame={currentFrame}
			comparingIndices={currentFrame?.comparing || []}
			swappingIndices={currentFrame?.swapping || []}
			sortedIndices={currentFrame?.sorted || []}
			onAnimationComplete={goToNextStep}
			isFastMode={isFastMode}
			arraySize={arraySize}
		/>
	) : viewMode === 'boxes' ? (
		<BoxView
			array={array}
			currentFrame={currentFrame}
			comparingIndices={currentFrame?.comparing || []}
			swappingIndices={currentFrame?.swapping || []}
			sortedIndices={currentFrame?.sorted || []}
			isFastMode={isFastMode}
		/>
	) : (
		<BarView
			array={array}
			currentFrame={currentFrame}
			comparingIndices={currentFrame?.comparing || []}
			swappingIndices={currentFrame?.swapping || []}
			sortedIndices={currentFrame?.sorted || []}
			isFastMode={isFastMode}
		/>
	);

	const viewToggle = allowedViews.length > 1 && (
		<div
			className={styles.viewToggle}
			role="group"
			aria-label="Visualization mode"
		>
			{VIEW_OPTIONS.filter(opt => allowedViews.includes(opt.value)).map(opt => {
				const Icon = opt.icon;
				const isActive = viewMode === opt.value;
				return (
					<button
						key={opt.value}
						type="button"
						className={`${styles.viewBtn} ${isActive ? styles.viewBtnActive : ''}`}
						onClick={() => handleViewModeChange(opt.value)}
						aria-pressed={isActive}
						title={opt.label}
					>
						<Icon size={14} strokeWidth={1.5} />
						<span>{opt.label}</span>
					</button>
				);
			})}
		</div>
	);

	return (
		<div
			className={`${styles.shell} ${embedded ? styles.embedded : ''}`}
			ref={playerRef}
		>
			<SortingHero
				sortingAlgorithm={sortingAlgorithm}
				setSortingAlgorithm={setSortingAlgorithm}
				arraySize={arraySize}
				setArraySize={setArraySize}
				dataProfile={dataProfile}
				setDataProfile={setDataProfile}
				shuffleArray={shuffleArray}
				isSorting={isSorting}
				statusSuffix={statusSuffix}
				onStoryRequest={onStoryRequest}
				showBreadcrumb={!embedded}
			/>

			<div className={styles.body}>
				<section
					className={styles.canvasShell}
					aria-label="Visualization canvas"
				>
					<div className={styles.canvas}>
						<div className={styles.canvasOverlay}>
							<span className={styles.notation}>
								{ALGORITHM_META[sortingAlgorithm]?.complexity ||
									ALGORITHM_INFO[sortingAlgorithm]?.complexity?.time?.average}
							</span>
							{operationStats && (
								<>
									<span className={styles.notationDot}>·</span>
									<span className={styles.stat}>
										{operationStats.comparisons ?? 0} compares
									</span>
									<span className={styles.notationDot}>·</span>
									<span className={styles.stat}>
										{operationStats.writes ?? operationStats.swaps ?? 0} writes
									</span>
									{operationStats.auxiliaryWrites > 0 && (
										<>
											<span className={styles.notationDot}>·</span>
											<span className={styles.stat}>
												{operationStats.auxiliaryWrites} aux
											</span>
										</>
									)}
									{operationStats.swaps > 0 && (
										<>
											<span className={styles.notationDot}>·</span>
											<span className={styles.stat}>
												{operationStats.swaps} swaps
											</span>
										</>
									)}
								</>
							)}
						</div>
						<div className={styles.canvasStage}>
							<VisualizationErrorBoundary
								resetKey={`${sortingAlgorithm}-${viewMode}-${dataProfile}-${arraySize}`}
							>
								{canvasContent}
							</VisualizationErrorBoundary>
						</div>
						<div className={styles.canvasFooter}>
							<div className={styles.frameNarration} aria-live="polite">
								{frameNarration}
							</div>
							<div className={styles.stateLegend} aria-label="State legend">
								{legendItems.map(item => (
									<span key={item.key} className={styles.legendItem}>
										<i className={styles[item.className]} aria-hidden="true" />
										{item.label}
									</span>
								))}
							</div>
						</div>
					</div>
				</section>

				<aside className={styles.cockpit} aria-label="Sorting controls">
					{showcase && (
						<section className={styles.lensShell}>
							<div className={styles.lensCore}>
								<div className={styles.lensTopline}>
									<span className={styles.eyebrow}>Algorithm lens</span>
									<span className={styles.lensTag}>{showcase.tag}</span>
								</div>
								<p className={styles.lensSignature}>{showcase.signature}</p>
								{showcase.sample && (
									<p className={styles.lensSample}>{showcase.sample}</p>
								)}
								<p className={styles.lensCue}>{activeCue}</p>
								<div className={styles.lensContrast}>
									<span>Differs from others</span>
									<p>{showcase.contrast}</p>
								</div>
								<div className={styles.watchList} aria-label="What to watch">
									{showcase.watch.map(item => (
										<span key={item}>{item}</span>
									))}
								</div>
							</div>
						</section>
					)}

					<section className={styles.controlShell}>
						<div className={styles.controlCore}>
							<div className={styles.panelHeader}>
								<div>
									<span className={styles.eyebrow}>Playback console</span>
									<h2 className={styles.panelTitle}>{playbackState}</h2>
								</div>
								<span className={styles.stepBadge}>
									{currentStep || 0}/{maxStep}
								</span>
							</div>

							<div
								className={styles.progressTrack}
								style={{ '--progress-scale': progressPct / 100 }}
								aria-hidden="true"
							>
								<span className={styles.progressFill} />
							</div>

							<button
								type="button"
								className={styles.primaryRun}
								onClick={handlePrimaryRun}
							>
								<span>{primaryLabel}</span>
								<span className={styles.primaryGlyph} aria-hidden="true" />
							</button>

							<div className={styles.quickActions}>
								<button type="button" onClick={shuffleArray}>
									Shuffle
								</button>
								<button
									type="button"
									onClick={resetAnimation}
									disabled={!canStep && !isSorting}
								>
									Reset view
								</button>
							</div>

							<StepControlBar
								isPlaying={isSorting && !isPaused}
								canStep={canStep}
								currentStep={currentStep || 0}
								totalSteps={totalSteps}
								speed={animationSpeed}
								speedOptions={SPEED_OPTIONS}
								onPlayPause={handlePlayPause}
								onStepBack={onStepBack}
								onStepForward={onStepForward}
								onSeek={handleSeek}
								onFirst={handleFirst}
								onLast={handleLast}
								onSpeedChange={setAnimationSpeed}
								rightSlot={viewToggle}
								layout="panel"
								scopeRef={playerRef}
							/>
						</div>
					</section>

					<section className={styles.compareShell} aria-label="Algorithm comparison">
						<div className={styles.compareCore}>
							<div className={styles.compareHeader}>
								<div>
									<span className={styles.eyebrow}>Comparison mode</span>
									<h2 className={styles.compareTitle}>
										{comparisonRows?.[0]?.name || 'Same array, all algorithms'}
									</h2>
								</div>
								<button
									type="button"
									className={styles.compareButton}
									onClick={handleCompareAlgorithms}
									disabled={!array.length}
								>
									Compare
								</button>
							</div>

							{comparisonRows ? (
								<div className={styles.compareList}>
									{comparisonRows.map(row => {
										const maxOps = Math.max(
											...comparisonRows.map(item => item.totalOperations),
											1
										);
										return (
											<div
												key={row.key}
												className={`${styles.compareRow} ${
													row.key === sortingAlgorithm
														? styles.compareRowActive
														: ''
												}`}
												style={{
													'--score-scale': row.totalOperations / maxOps,
												}}
											>
												<span className={styles.compareRank}>#{row.rank}</span>
												<span className={styles.compareName}>{row.name}</span>
												<span className={styles.compareOps}>
													{row.totalOperations} ops
												</span>
												<span className={styles.compareMeter} aria-hidden="true">
													<i />
												</span>
											</div>
										);
									})}
								</div>
							) : (
								<p className={styles.compareEmpty}>
									Benchmark the current data profile without changing the live
									run.
								</p>
							)}
						</div>
					</section>

					<div className={styles.pseudocodeShell}>
						<PseudocodeRail
							lines={PSEUDO_CODE[sortingAlgorithm] || []}
							activeLine={currentFrame?.line ?? null}
							isRunning={canStep}
						/>
					</div>
				</aside>
			</div>
		</div>
	);
};

export default SortingDashboard;
