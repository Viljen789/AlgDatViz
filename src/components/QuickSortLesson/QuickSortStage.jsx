import { useEffect, useMemo, useRef, useState } from 'react';
import useReducedMotion from '../../hooks/useReducedMotion.js';
import { getQuickSortFrames } from '../../utils/sorting/quickPartitionFrames.js';
import { SceneNarration } from '../../common/PlaybackEngine';
import { STAGE_VALUES } from './scenes.js';
import styles from './QuickSortStage.module.css';

// Stage geometry. A fixed slot grid keeps each value's column stable while the
// partition shuffles bars, so the eye can track one value snapping home.
const SLOT = 46;
const PAD_X = 16;
const PAD_TOP = 22;
const BAR_MAX_H = 120;
const BASE_Y = PAD_TOP + BAR_MAX_H;
const VALUE_MAX = Math.max(...STAGE_VALUES);
const VIEW_W = PAD_X * 2 + STAGE_VALUES.length * SLOT;
const VIEW_H = BASE_Y + 64;
const BAR_W = SLOT - 14;

const heightFor = value => Math.max(8, (value / VALUE_MAX) * BAR_MAX_H);

// The honest partition timeline for the lesson's eight values, computed ONCE
// from the shared generator. Scenes 0 and 1 step through the FIRST partition
// (range covering the whole array). The stage shows exactly these frames — it
// never invents a move the algorithm did not make.
const ALL_FRAMES = getQuickSortFrames(STAGE_VALUES).frames;
const firstPlaceIdx = ALL_FRAMES.findIndex(f => f.phase === 'place');
// Frames 1..firstPlace are the first partition (frame 0 is the global init).
const PARTITION_FRAMES = ALL_FRAMES.slice(1, firstPlaceIdx + 1);

// The settled array after the first partition (pivot home), used by the
// recursion scene. The two subranges flank the pivot.
const PLACE_FRAME = ALL_FRAMES[firstPlaceIdx];
const PARTITIONED = PLACE_FRAME.array;
const PIVOT_AT = PLACE_FRAME.pivotIndex;
const LEFT_RANGE = PLACE_FRAME.subranges.left; // [0, pivot-1]
const RIGHT_RANGE = PLACE_FRAME.subranges.right; // [pivot+1, n-1]

// The worst-case "stick": on a sorted input the last-element pivot is always the
// max, so each partition peels ONE element and recurses on the size n-1 rest.
// We render that as a staircase of shrinking ranges to make T(n)=T(n-1)+n visible.
const N = STAGE_VALUES.length;
const STICK_LEVELS = Array.from({ length: N }, (_, depth) => ({
	size: N - depth,
	from: depth,
}));

const QuickSortStage = ({ activeScene = 0 }) => {
	const reducedMotion = useReducedMotion();
	const wrapRef = useRef(null);

	// Scenes 0 (partition) and 1 (snap home) animate the partition timeline.
	// Scene 0 stops just before the final pivot swap; scene 1 plays it to the end.
	const isPartitionScene = activeScene === 0 || activeScene === 1;
	const isRecurse = activeScene === 2;
	const isWorstCase = activeScene === 3 || activeScene === 4;
	const showRecurrence = activeScene === 4;

	const [frameIdx, setFrameIdx] = useState(0);

	useEffect(() => {
		if (!isPartitionScene) {
			setFrameIdx(0);
			return undefined;
		}
		const last = PARTITION_FRAMES.length - 1;
		if (reducedMotion) {
			// Settle on the finished partition — the pivot already home.
			setFrameIdx(last);
			return undefined;
		}
		setFrameIdx(0);
		let idx = 0;
		const id = window.setInterval(() => {
			idx += 1;
			// Hold the finished partition for two ticks, then replay for late scrollers.
			if (idx >= PARTITION_FRAMES.length + 2) idx = 0;
			setFrameIdx(Math.min(idx, last));
		}, 950);
		return () => window.clearInterval(id);
	}, [isPartitionScene, reducedMotion]);

	const frame = PARTITION_FRAMES[frameIdx] || PARTITION_FRAMES[0];

	// Which values + per-slot roles to render for the current scene.
	const view = useMemo(() => {
		if (isPartitionScene) {
			return { values: frame.array, frame };
		}
		if (isRecurse) {
			return { values: PARTITIONED, frame: PLACE_FRAME };
		}
		// Worst case + recurrence scenes reuse the sorted-stick illustration below;
		// the bar row shows the already-sorted array to motivate the bad pivot.
		return {
			values: [...STAGE_VALUES].sort((a, b) => a - b),
			frame: null,
		};
	}, [isPartitionScene, isRecurse, frame]);

	const caption = useMemo(() => {
		if (isPartitionScene) return frame.caption;
		if (isRecurse)
			return 'Pivot home. Recurse on the left range and the right range — never across the pivot.';
		if (activeScene === 3)
			return 'Already sorted: the last-element pivot is always the maximum, so every split is lopsided.';
		return 'Each partition peels one element: sizes n, n−1, …, 1. The work stacks to Θ(n²).';
	}, [isPartitionScene, isRecurse, activeScene, frame]);

	const barClassFor = slot => {
		const f = view.frame;
		if (isRecurse) {
			if (slot === PIVOT_AT) return styles.barPivotHome;
			if (LEFT_RANGE && slot >= LEFT_RANGE[0] && slot <= LEFT_RANGE[1])
				return styles.barLeftSide;
			if (RIGHT_RANGE && slot >= RIGHT_RANGE[0] && slot <= RIGHT_RANGE[1])
				return styles.barRightSide;
			return styles.barDefault;
		}
		if (!f) return styles.barDefault;
		// Partition scenes: colour by the live algorithm role at this frame.
		const locked = f.locked.includes(slot);
		const isPivot = slot === f.pivotIndex;
		const inSwap = f.swapped && f.swapped.includes(slot);
		const inCompare =
			f.compared && f.compared.includes(slot) && slot !== f.pivotIndex;
		const belowBoundary =
			f.i != null && slot <= f.i && slot >= (f.range?.[0] ?? 0);

		if (f.phase === 'place' && isPivot) return styles.barPivotHome;
		if (locked) return styles.barLocked;
		if (isPivot) return styles.barPivot;
		if (inSwap) return styles.barFlight;
		if (inCompare) return styles.barCompare;
		if (belowBoundary) return styles.barBelow;
		return styles.barDefault;
	};

	const renderBars = () => (
		<svg
			viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
			className={styles.svg}
			preserveAspectRatio="xMidYMid meet"
		>
			{/* Pointer rails (i boundary, j scanner) only during the partition. */}
			{isPartitionScene && view.frame && (
				<g aria-hidden="true">
					{view.frame.i != null &&
						view.frame.i >= (view.frame.range?.[0] ?? 0) && (
							<PointerMark
								slot={view.frame.i}
								label="i"
								className={styles.pointerBoundary}
							/>
						)}
					{view.frame.j != null && (
						<PointerMark
							slot={view.frame.j}
							label="j"
							className={styles.pointerScan}
						/>
					)}
				</g>
			)}

			{view.values.map((value, slot) => {
				const h = heightFor(value);
				const x = PAD_X + slot * SLOT + (SLOT - BAR_W) / 2;
				const y = BASE_Y - h;
				return (
					<g key={slot}>
						<rect
							x={x}
							y={y}
							width={BAR_W}
							height={h}
							rx="2"
							className={barClassFor(slot)}
						/>
						<text
							x={PAD_X + slot * SLOT + SLOT / 2}
							y={BASE_Y + 16}
							className={styles.barValue}
						>
							{value}
						</text>
						<text
							x={PAD_X + slot * SLOT + SLOT / 2}
							y={BASE_Y + 30}
							className={styles.slotIndex}
						>
							{slot}
						</text>
					</g>
				);
			})}
		</svg>
	);

	// The lopsided-recursion staircase for the worst-case scenes. Each row is a
	// range; the top is the full array, each lower row drops the just-placed
	// pivot — a literal picture of T(n) = T(n-1) + n.
	const renderStick = () => (
		<div
			className={styles.stick}
			role="img"
			aria-label="Worst-case recursion: each partition removes one element, leaving a chain n levels deep"
		>
			{STICK_LEVELS.map(level => (
				<div key={level.from} className={styles.stickRow}>
					<span className={styles.stickSize}>
						n{level.from === 0 ? '' : `−${level.from}`}
					</span>
					<div className={styles.stickBlocks}>
						{Array.from({ length: level.size }).map((_, k) => (
							<span
								key={k}
								className={`${styles.stickCell} ${k === level.size - 1 ? styles.stickPivot : ''}`}
							/>
						))}
					</div>
				</div>
			))}
		</div>
	);

	return (
		<>
			{/* Per-scene narration for screen readers, OUTSIDE the role=img figure
			    below (which collapses its in-figure caption into one static label). */}
			<SceneNarration>{caption}</SceneNarration>
			<div
				ref={wrapRef}
				className={styles.wrap}
				data-scene={activeScene}
				role="img"
				aria-label={
					isPartitionScene
						? 'Lomuto partition: two pointers sweep and the pivot snaps to its final index'
						: isRecurse
							? 'The array partitioned around its pivot, with the two recursion subranges marked'
							: 'Quicksort worst case: a lopsided recursion'
				}
			>
				{isWorstCase ? renderStick() : renderBars()}

				<p className={styles.caption}>{caption}</p>

				<div
					className={`${styles.recurrence} ${showRecurrence ? styles.recurrenceShow : ''}`}
					aria-hidden={!showRecurrence}
				>
					<div className={styles.recurrenceList}>
						<span>Worst: T(n) = T(n−1) + n</span>
						<span>= n + (n−1) + … + 1</span>
					</div>
					<div className={styles.recurrenceTotal}>
						<span className={styles.recurrenceMath}>Θ(n²)</span>
						<span className={styles.recurrenceLabel}>
							balanced: 2T(n/2) + n = Θ(n log n)
						</span>
					</div>
				</div>

				<div className={styles.notation} aria-hidden="true">
					partition · n = {STAGE_VALUES.length}
				</div>
			</div>
		</>
	);
};

// A small caret + label hung under a slot to mark a pointer (i or j). Kept inline
// because it needs the same slot geometry as the bars.
const PointerMark = ({ slot, label, className }) => {
	const cx = PAD_X + slot * SLOT + SLOT / 2;
	return (
		<g className={className}>
			<text x={cx} y={PAD_TOP - 8} className={styles.pointerLabel}>
				{label}
			</text>
			<path
				d={`M ${cx - 5} ${PAD_TOP - 6} L ${cx + 5} ${PAD_TOP - 6} L ${cx} ${PAD_TOP} Z`}
				className={styles.pointerCaret}
			/>
		</g>
	);
};

export default QuickSortStage;
