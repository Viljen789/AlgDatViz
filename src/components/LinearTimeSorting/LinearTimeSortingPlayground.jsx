import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Shuffle } from 'lucide-react';
import Button from '../../common/Button/Button.jsx';
import Input from '../../common/Input/Input.jsx';
import StepControlBar from '../../common/StepControlBar/StepControlBar.jsx';
import {
	usePlayback,
	FrameTrace,
	PseudoState,
} from '../../common/PlaybackEngine/index.js';
import { getCountingSortStepsWithStats } from '../../utils/sorting/algorithms/countingSort.js';
import { getRadixSortStepsWithStats } from '../../utils/sorting/algorithms/radixSort.js';
import { getBucketSortStepsWithStats } from '../../utils/sorting/algorithms/bucketSort.js';
import CountingSortView from '../Sorting/ArrayVisualizer/AlgorithmViews/CountingSort/CountingSortView.jsx';
import RadixSortView from '../Sorting/ArrayVisualizer/AlgorithmViews/RadixSort/RadixSortView.jsx';
import BucketSortView from '../Sorting/ArrayVisualizer/AlgorithmViews/BucketSort/BucketSortView.jsx';
import { PSEUDO_BY_ALGORITHM, stepToPseudoFrame } from './sortingPseudo.js';
import styles from './LinearTimeSortingPlayground.module.css';

const SPEED_OPTIONS = [
	{ value: 25, label: '0.5×' },
	{ value: 100, label: '1×' },
	{ value: 200, label: '2×' },
	{ value: 320, label: '5×' },
];

// The three comparison-free sorts, each driven by its EXISTING pure step
// generator (imported read-only from src/utils/sorting/*) and its existing view.
const ALGORITHMS = {
	counting: {
		id: 'counting',
		name: 'Counting',
		generate: getCountingSortStepsWithStats,
		View: CountingSortView,
		oneLine: 'Tally each value, then replay the tallies low → high. O(n + k).',
		// A small range so the count table stays compact.
		demo: [4, 2, 2, 0, 3, 2, 1, 4, 0],
		randomize: () =>
			Array.from({ length: 9 }, () => Math.floor(Math.random() * 6)),
	},
	radix: {
		id: 'radix',
		name: 'Radix',
		generate: getRadixSortStepsWithStats,
		View: RadixSortView,
		oneLine: 'Sort by each digit, LSD first, with a stable pass. O(d·(n + k)).',
		// Two-digit numbers so both the ones and tens passes are visible.
		demo: [21, 12, 11, 22, 13, 31, 23],
		randomize: () =>
			Array.from({ length: 7 }, () => 10 + Math.floor(Math.random() * 89)),
	},
	bucket: {
		id: 'bucket',
		name: 'Bucket',
		generate: getBucketSortStepsWithStats,
		View: BucketSortView,
		oneLine:
			'Scatter into range buckets, sort each, concatenate. O(n) expected.',
		demo: [12, 4, 27, 8, 31, 19, 2, 23, 16],
		randomize: () =>
			Array.from({ length: 9 }, () => Math.floor(Math.random() * 36)),
	},
};

const ALGORITHM_ORDER = ['counting', 'radix', 'bucket'];

// Custom-array limits — keep the count table + bars readable, and the keys
// small enough that counting/radix stay legible (try all-equal, or a huge max).
const MAX_VALUES = 12;
const MAX_VALUE = 99;

/**
 * parseArrayInput — mirror of AdjacencyList's validateInput: split on commas
 * or whitespace, reject anything that isn't a clean non-negative integer, and
 * CLAMP length + value range so the canvas stays readable. Returns either
 * { values } on success or { hint } describing what to fix (calm, not an error).
 */
const parseArrayInput = raw => {
	const tokens = raw
		.split(/[\s,]+/)
		.map(t => t.trim())
		.filter(Boolean);

	if (tokens.length === 0) {
		return { hint: 'Enter a few numbers, e.g. 4, 2, 2, 0, 3.' };
	}
	if (tokens.some(t => !/^\d+$/.test(t))) {
		return { hint: `Whole numbers only, 0–${MAX_VALUE}, separated by commas.` };
	}

	const values = tokens
		.slice(0, MAX_VALUES)
		.map(t => Math.min(MAX_VALUE, Number(t)));

	return { values };
};

/**
 * LinearTimeSortingPlayground — the interactive sandbox for the topic.
 *
 * Runs the three comparison-free sorts on the shared PlaybackEngine
 * (step / scrub / replay + scoped keyboard) using the EXISTING pure step
 * generators and AlgorithmViews (imported, never edited). PseudoState shows the
 * matching pseudocode highlighted in lockstep with a live variable-state
 * readout, driven by the pure, unit-tested stepToPseudoFrame bridge.
 */
const LinearTimeSortingPlayground = ({ onUserInteract }) => {
	const playerRef = useRef(null);
	const [algorithmId, setAlgorithmId] = useState('counting');
	const [array, setArray] = useState(ALGORITHMS.counting.demo);
	const [customText, setCustomText] = useState('');
	const [customHint, setCustomHint] = useState('');

	const algorithm = ALGORITHMS[algorithmId];

	// The frames ARE the existing generator's steps — the engine is content-
	// agnostic, so we feed them straight through.
	const frames = useMemo(
		() => algorithm.generate(array).steps,
		[algorithm, array]
	);

	const player = usePlayback(frames, { speed: 100 });
	const { currentStep, currentFrame, totalSteps, seek, play } = player;
	const canStep = totalSteps > 1;

	const View = algorithm.View;
	const frame = currentFrame || frames[0] || null;

	const comparing = frame?.comparing || [];
	const swapping = frame?.swapping || [];
	const sorted = frame?.sorted || [];

	// Synced pseudocode + live state, from the pure bridge.
	const lines = useMemo(
		() => PSEUDO_BY_ALGORITHM[algorithmId] || [],
		[algorithmId]
	);
	const pseudoFrame = useMemo(
		() => stepToPseudoFrame(algorithmId, frame),
		[algorithmId, frame]
	);

	const notify = useCallback(() => onUserInteract?.(), [onUserInteract]);

	// On a fresh timeline (new algorithm or new array), restart and play it.
	const framesKeyRef = useRef(null);
	useEffect(() => {
		if (framesKeyRef.current === frames) return;
		framesKeyRef.current = frames;
		seek(0);
		if (frames.length > 1) play();
	}, [frames, seek, play]);

	const handleAlgorithmChange = useCallback(
		id => {
			notify();
			setAlgorithmId(id);
			setArray(ALGORITHMS[id].demo);
		},
		[notify]
	);

	const handleShuffle = useCallback(() => {
		notify();
		setCustomHint('');
		setArray(algorithm.randomize());
	}, [notify, algorithm]);

	const handleReset = useCallback(() => {
		notify();
		setCustomText('');
		setCustomHint('');
		setArray(algorithm.demo);
	}, [notify, algorithm]);

	// Run the sort on a typed array. The shared seek(0)+replay effect already
	// reseeds the timeline whenever `array` (hence `frames`) changes.
	const handleCustomSubmit = useCallback(() => {
		const result = parseArrayInput(customText);
		if (result.hint) {
			setCustomHint(result.hint);
			return;
		}
		notify();
		setCustomHint('');
		setArray(result.values);
	}, [customText, notify]);

	const handlePlayPause = useCallback(() => {
		notify();
		if (currentStep >= totalSteps - 1) {
			player.replay();
			return;
		}
		player.toggle();
	}, [notify, currentStep, totalSteps, player]);

	const narration = useMemo(() => {
		const phase = frame?.metadata?.phase;
		if (!phase || phase === 'ready') return 'Press play to run the sort.';
		const map = {
			counting: 'Counting values into the tally table, then replaying them.',
			reconstructing: 'Replaying the tallies from low value to high.',
			distributing: 'Distributing values into buckets by key.',
			collecting: 'Collecting values back, stably, in order.',
			writing: 'Writing the stably ordered values back into the array.',
			'pass-complete': 'One digit pass complete — on to the next place.',
			sorting: 'Sorting one bucket locally.',
			completed: 'Sorted — no key was ever compared to another.',
		};
		return map[phase] || `Phase: ${phase}.`;
	}, [frame]);

	return (
		<div className={styles.shell} ref={playerRef}>
			{/* ---------- Controls ---------- */}
			<div className={styles.controls}>
				<div
					className={styles.algTabs}
					role="tablist"
					aria-label="Linear-time sort"
				>
					{ALGORITHM_ORDER.map(id => {
						const item = ALGORITHMS[id];
						const active = id === algorithmId;
						return (
							<button
								key={id}
								type="button"
								role="tab"
								aria-selected={active}
								className={`${styles.algTab} ${active ? styles.algTabActive : ''}`}
								onClick={() => handleAlgorithmChange(id)}
							>
								{item.name}
							</button>
						);
					})}
				</div>

				<div className={styles.actions}>
					<form
						className={styles.customForm}
						onSubmit={e => {
							e.preventDefault();
							handleCustomSubmit();
						}}
					>
						<Input
							size="sm"
							aria-label="Enter your own array"
							className={styles.customField}
							value={customText}
							onChange={e => {
								setCustomText(e.target.value);
								if (customHint) setCustomHint('');
							}}
							placeholder="Try 7,7,7,7 or 5,4,3,2,1"
							inputMode="numeric"
							hint={customHint || undefined}
						/>
						<Button type="submit" variant="ghost" size="sm">
							<span>Run</span>
						</Button>
					</form>
					<Button variant="ghost" size="sm" onClick={handleShuffle}>
						<Shuffle size={14} strokeWidth={2} />
						<span>Shuffle</span>
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleReset}
						aria-label="Reset to demo array"
						title="Reset to demo array"
					>
						<RotateCcw size={14} strokeWidth={2} />
						<span>Reset</span>
					</Button>
				</div>
			</div>

			<p className={styles.opLine}>{algorithm.oneLine}</p>

			{/* ---------- Canvas + trace ---------- */}
			<div className={styles.body}>
				<section
					className={styles.canvas}
					aria-label={`${algorithm.name} sort`}
				>
					<View
						array={frame?.array || array}
						currentFrame={frame}
						comparingIndices={comparing}
						swappingIndices={swapping}
						sortedIndices={sorted}
					/>
				</section>

				<div className={styles.trace}>
					<FrameTrace
						eyebrow={`${algorithm.name} sort`}
						step={currentStep}
						totalSteps={totalSteps}
						narration={narration}
					/>
					<PseudoState
						className={styles.pseudo}
						lines={lines}
						line={pseudoFrame.line}
						state={pseudoFrame.state}
						isRunning={pseudoFrame.line != null}
						label="Pseudocode"
						stateLabel="Live state"
						step={currentStep}
						totalSteps={totalSteps}
					/>
				</div>
			</div>

			{/* ---------- Transport ---------- */}
			<div className={styles.transport}>
				<StepControlBar
					isPlaying={player.isPlaying}
					canStep={canStep}
					currentStep={currentStep}
					totalSteps={totalSteps}
					speed={player.speed}
					speedOptions={SPEED_OPTIONS}
					onPlayPause={handlePlayPause}
					onStepBack={player.stepBack}
					onStepForward={player.stepForward}
					onSeek={seek}
					onFirst={player.first}
					onLast={player.last}
					onSpeedChange={player.setSpeed}
					scopeRef={playerRef}
				/>
			</div>
		</div>
	);
};

export default LinearTimeSortingPlayground;
