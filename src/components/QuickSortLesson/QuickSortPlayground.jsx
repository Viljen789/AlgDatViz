import { useCallback, useMemo, useRef, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { SPEED_OPTIONS } from '../../utils/sorting/algorithmMeta.js';
import { PSEUDO_CODE } from '../../utils/sorting/algorithmInfo.js';
import { getQuickSortFrames } from '../../utils/sorting/quickPartitionFrames.js';
import { quickStepToPseudoFrame } from '../../utils/sorting/quickFrames.js';
import StepControlBar from '../../common/StepControlBar/StepControlBar.jsx';
import Input from '../../common/Input/Input.jsx';
import Button from '../../common/Button/Button.jsx';
import { usePlayback, PseudoState } from '../../common/PlaybackEngine';
import styles from './QuickSortPlayground.module.css';

const QUICK_SORT_LINES = PSEUDO_CODE.quickSort;
const PLAYGROUND_SIZE = 8;

// Custom-array limits — keep the bars readable and the partition followable.
// A sorted input (e.g. 1,2,3,4,5,6) drives Lomuto into its O(n^2) worst case.
const MAX_VALUES = 10;
const MAX_VALUE = 99;

// A fresh random permutation of small distinct-ish values. Kept modest so the
// bars stay readable and the partition is followable.
const randomArray = (size = PLAYGROUND_SIZE) =>
	Array.from({ length: size }, () => 5 + Math.floor(Math.random() * 90));

/**
 * parseArrayInput — mirror of AdjacencyList's validateInput: split on commas or
 * whitespace, reject anything that isn't a clean non-negative integer, and CLAMP
 * length + value range so the bars stay readable. Returns either { values } on
 * success or { hint } describing what to fix (calm guidance, not an error).
 */
const parseArrayInput = raw => {
	const tokens = raw
		.split(/[\s,]+/)
		.map(t => t.trim())
		.filter(Boolean);

	if (tokens.length === 0) {
		return { hint: 'Enter a few numbers, e.g. 1, 2, 3, 4, 5.' };
	}
	if (tokens.some(t => !/^\d+$/.test(t))) {
		return { hint: `Whole numbers only, 0–${MAX_VALUE}, separated by commas.` };
	}

	const values = tokens
		.slice(0, MAX_VALUES)
		.map(t => Math.min(MAX_VALUE, Number(t)));

	return { values };
};

// The same honest generator the lesson Stage uses — so the playground shows
// EXACTLY the algorithm's partition, never a re-skin of a different trace.
const framesFor = values => getQuickSortFrames(values).frames;

const QuickSortPlayground = ({ onUserInteract }) => {
	const playerRef = useRef(null);
	const [values, setValues] = useState(() => randomArray());
	const [customText, setCustomText] = useState('');
	const [customHint, setCustomHint] = useState('');
	const frames = useMemo(() => framesFor(values), [values]);
	const valueMax = useMemo(() => Math.max(...values, 1), [values]);

	const player = usePlayback(frames, { speed: 50 });
	const {
		currentStep,
		currentFrame,
		totalSteps,
		isPlaying,
		speed,
		setSpeed,
		toggle,
		stepForward,
		stepBack,
		seek,
		first,
		last,
	} = player;

	const canStep = totalSteps > 0;

	const wrap = useCallback(
		fn =>
			(...args) => {
				onUserInteract?.();
				fn(...args);
			},
		[onUserInteract]
	);

	const handleShuffle = () => {
		onUserInteract?.();
		setCustomHint('');
		setValues(randomArray());
		first();
	};

	// Run the partition on a typed array. Reset the timeline to the start the
	// same way Shuffle does, so the new run plays from frame 0.
	const handleCustomSubmit = () => {
		const result = parseArrayInput(customText);
		if (result.hint) {
			setCustomHint(result.hint);
			return;
		}
		onUserInteract?.();
		setCustomHint('');
		setValues(result.values);
		first();
	};

	const frame = currentFrame;
	const arr = frame?.array || values;

	// Per-slot role colouring, identical vocabulary to the Stage: the pivot, the
	// two compared cells, an in-flight swap, the values already inside the
	// boundary, and any locked-final pivot.
	const barClassFor = slot => {
		if (!frame) return styles.barDefault;
		const locked = frame.locked?.includes(slot);
		const isPivot = slot === frame.pivotIndex;
		const inSwap = frame.swapped?.includes(slot);
		const inCompare =
			frame.compared?.includes(slot) && slot !== frame.pivotIndex;
		const belowBoundary =
			frame.i != null && slot <= frame.i && slot >= (frame.range?.[0] ?? 0);

		if (frame.phase === 'place' && isPivot) return styles.barPivotHome;
		if (locked) return styles.barLocked;
		if (isPivot) return styles.barPivot;
		if (inSwap) return styles.barFlight;
		if (inCompare) return styles.barCompare;
		if (belowBoundary) return styles.barBelow;
		return styles.barDefault;
	};

	const narration = useMemo(() => {
		if (!frame) return 'Step or play to run the partition.';
		return frame.caption;
	}, [frame]);

	const pseudoFrame = useMemo(() => quickStepToPseudoFrame(frame), [frame]);

	const stats = frame?.stats;

	return (
		<div className={styles.shell} ref={playerRef}>
			<div className={styles.layout}>
				<div className={styles.canvas}>
					<div className={styles.notation} aria-hidden="true">
						{stats
							? `compares ${stats.comparisons} · swaps ${stats.swaps}`
							: `n = ${PLAYGROUND_SIZE}`}
					</div>

					<div className={styles.canvasStage}>
						<svg
							viewBox={`0 0 ${arr.length * 46 + 16} 200`}
							className={styles.svg}
							preserveAspectRatio="xMidYMid meet"
							role="img"
							aria-label="Quicksort partition in progress"
						>
							{frame?.i != null && frame.i >= (frame.range?.[0] ?? 0) && (
								<Pointer slot={frame.i} label="i" variant="boundary" />
							)}
							{frame?.j != null && (
								<Pointer slot={frame.j} label="j" variant="scan" />
							)}
							{arr.map((value, slot) => {
								const h = Math.max(8, (value / valueMax) * 120);
								const x = 8 + slot * 46 + 7;
								const y = 150 - h;
								return (
									<g key={slot}>
										<rect
											x={x}
											y={y}
											width={32}
											height={h}
											rx="2"
											className={barClassFor(slot)}
										/>
										<text
											x={8 + slot * 46 + 23}
											y={166}
											className={styles.barValue}
										>
											{value}
										</text>
										<text
											x={8 + slot * 46 + 23}
											y={180}
											className={styles.slotIndex}
										>
											{slot}
										</text>
									</g>
								);
							})}
						</svg>
					</div>

					<p className={styles.narration} aria-live="polite">
						{narration}
					</p>
				</div>

				<PseudoState
					className={styles.pseudo}
					lines={QUICK_SORT_LINES}
					frame={pseudoFrame}
					isRunning={canStep}
					step={currentStep || 0}
					totalSteps={totalSteps}
					stateLabel="LIVE STATE"
				/>
			</div>

			<div className={styles.controlsDock}>
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
						placeholder="Try 1,2,3,4,5,6"
						inputMode="numeric"
						hint={customHint || undefined}
					/>
					<Button type="submit" variant="ghost" size="sm">
						<span>Run</span>
					</Button>
				</form>
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
					isPlaying={isPlaying}
					canStep={canStep}
					currentStep={currentStep || 0}
					totalSteps={totalSteps}
					speed={speed}
					speedOptions={SPEED_OPTIONS}
					onPlayPause={wrap(toggle)}
					onStepBack={wrap(stepBack)}
					onStepForward={wrap(stepForward)}
					onSeek={wrap(seek)}
					onFirst={wrap(first)}
					onLast={wrap(last)}
					onSpeedChange={setSpeed}
					scopeRef={playerRef}
				/>
			</div>
		</div>
	);
};

// A pointer caret + label hung above a slot. SLOT geometry matches the bars.
const Pointer = ({ slot, label, variant }) => {
	const cx = 8 + slot * 46 + 23;
	return (
		<g
			className={
				variant === 'boundary' ? styles.pointerBoundary : styles.pointerScan
			}
		>
			<text x={cx} y={16} className={styles.pointerLabel}>
				{label}
			</text>
			<path
				d={`M ${cx - 5} 18 L ${cx + 5} 18 L ${cx} 24 Z`}
				className={styles.pointerCaret}
			/>
		</g>
	);
};

export default QuickSortPlayground;
