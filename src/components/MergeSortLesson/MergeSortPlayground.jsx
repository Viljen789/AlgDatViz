import { useEffect, useMemo, useRef } from 'react';
import { Shuffle } from 'lucide-react';
import { useSortingVisualizer } from '../../hooks/useSortingVisualizer.js';
import { SPEED_OPTIONS } from '../../utils/sorting/algorithmMeta.js';
import { PSEUDO_CODE } from '../../utils/sorting/algorithmInfo.js';
import { mergeStepToPseudoFrame } from '../../utils/sorting/mergeFrames.js';
import StepControlBar from '../../common/StepControlBar/StepControlBar.jsx';
import { PseudoState } from '../../common/PlaybackEngine';
import MergeSortRecursiveView from '../Sorting/ArrayVisualizer/AlgorithmViews/MergeSort/MergeSortRecursiveView.jsx';
import styles from './MergeSortPlayground.module.css';

const MERGE_SORT_LINES = PSEUDO_CODE.mergeSort;

const PLAYGROUND_SIZE = 8;

const MergeSortPlayground = ({ onUserInteract }) => {
	// Scopes playback keyboard control to this playground so the embedded
	// multi-algorithm sandbox on the same page can't react to the same keypress.
	const playerRef = useRef(null);
	const {
		array,
		animationSpeed,
		setAnimationSpeed,
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
	} = useSortingVisualizer('mergeSort', PLAYGROUND_SIZE);

	const totalSteps = animationSteps?.length || 0;
	const canStep = totalSteps > 0;
	const maxStep = Math.max(totalSteps - 1, 0);

	// Two-phase priming: build the step timeline as soon as we have an array,
	// then pause immediately so the user lands on step 0 and is in control.
	const primedKeyRef = useRef(null);
	const pausedAfterPrimeRef = useRef(false);

	useEffect(() => {
		if (!array.length) return;
		const arrayKey = array.map(item => item.value).join(',');
		if (primedKeyRef.current === arrayKey) return;
		if (isSorting) return;
		primedKeyRef.current = arrayKey;
		pausedAfterPrimeRef.current = false;
		startSort();
	}, [array, isSorting, startSort]);

	useEffect(() => {
		if (!canStep) return;
		if (pausedAfterPrimeRef.current) return;
		if (isPaused) {
			pausedAfterPrimeRef.current = true;
			return;
		}
		pausedAfterPrimeRef.current = true;
		onPlayPause();
	}, [canStep, isPaused, onPlayPause]);

	const handlePlayPause = () => {
		onUserInteract?.();
		onPlayPause();
	};

	const handleStepForward = () => {
		onUserInteract?.();
		onStepForward();
	};

	const handleStepBack = () => {
		onUserInteract?.();
		onStepBack();
	};

	const handleSeek = step => {
		onUserInteract?.();
		seekToStep(step);
	};

	const handleFirst = () => {
		onUserInteract?.();
		seekToStep(0);
	};

	const handleLast = () => {
		onUserInteract?.();
		seekToStep(maxStep);
	};

	const handleShuffle = () => {
		onUserInteract?.();
		primedKeyRef.current = null;
		pausedAfterPrimeRef.current = false;
		shuffleArray();
	};

	const frameNarration = useMemo(() => {
		if (!canStep || !currentFrame) {
			return 'The recursion tree appears below. Step or play to watch the splits, then the merges.';
		}
		const metadata = currentFrame.metadata || {};
		if (metadata.phase === 'dividing') {
			return `Range ${metadata.range?.[0]}–${metadata.range?.[1]} splits into two smaller promises.`;
		}
		if (metadata.phase === 'merging') {
			if (metadata.movedElement !== undefined) {
				return `${metadata.movedElement} is copied from the ${metadata.movedFrom} half into output index ${metadata.outputIndex}.`;
			}
			return 'The two front cursors decide the next output slot.';
		}
		if (metadata.phase === 'completed') {
			return 'Every merge has returned to the root. The original range is now sorted.';
		}
		return 'Follow the highlighted ranges to see the algorithm choose its next move.';
	}, [canStep, currentFrame]);

	// Drive the synced pseudocode + live-state panel from the *real* algorithm
	// frame. The mapping is the pure, unit-tested mergeStepToPseudoFrame, so the
	// executing MERGE/recurse line and the i / j / output-index readout lockstep
	// with the visualization above.
	const pseudoFrame = useMemo(
		() => mergeStepToPseudoFrame(currentFrame),
		[currentFrame]
	);

	return (
		<div className={styles.shell} ref={playerRef}>
			<div className={styles.canvasWrap}>
				<div className={styles.layout}>
					<div className={styles.canvas}>
						<div className={styles.notation} aria-hidden="true">
							O(n log n) · n = {PLAYGROUND_SIZE}
						</div>

						<div className={styles.canvasStage}>
							<MergeSortRecursiveView
								array={array}
								currentFrame={currentFrame}
								comparingIndices={currentFrame?.comparing || []}
								swappingIndices={currentFrame?.swapping || []}
								sortedIndices={currentFrame?.sorted || []}
								onAnimationComplete={goToNextStep}
								isFastMode={isFastMode}
								arraySize={PLAYGROUND_SIZE}
							/>
						</div>

						<p className={styles.narration} aria-live="polite">
							{frameNarration}
						</p>
					</div>

					<PseudoState
						className={styles.pseudo}
						lines={MERGE_SORT_LINES}
						frame={pseudoFrame}
						isRunning={canStep}
						step={currentStep || 0}
						totalSteps={totalSteps}
						stateLabel="LIVE STATE"
					/>
				</div>

				<div className={styles.controlsDock}>
					<button
						type="button"
						className={styles.shuffleBtn}
						onClick={handleShuffle}
						aria-label="Shuffle array"
						title="Shuffle"
					>
						<Shuffle size={14} strokeWidth={2} />
						<span>Shuffle</span>
					</button>
					<StepControlBar
						isPlaying={isSorting && !isPaused}
						canStep={canStep}
						currentStep={currentStep || 0}
						totalSteps={totalSteps}
						speed={animationSpeed}
						speedOptions={SPEED_OPTIONS}
						onPlayPause={handlePlayPause}
						onStepBack={handleStepBack}
						onStepForward={handleStepForward}
						onSeek={handleSeek}
						onFirst={handleFirst}
						onLast={handleLast}
						onSpeedChange={setAnimationSpeed}
						scopeRef={playerRef}
					/>
				</div>
			</div>
		</div>
	);
};

export default MergeSortPlayground;
