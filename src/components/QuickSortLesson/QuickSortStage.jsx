import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import useReducedMotion from '../../hooks/useReducedMotion.js';
import { getQuickSortFrames } from '../../utils/sorting/quickPartitionFrames.js';
import { SceneNarration } from '../../common/PlaybackEngine';
import StateLegend from '../../common/StateLegend/StateLegend';
import { STAGE_VALUES, SELECT_INPUT, SELECT_I } from './scenes.js';
import { quickselectTrace } from './quickselectTrace.js';
import styles from './QuickSortStage.module.css';

// Swatch colours mirror exactly what QuickSortStage.module.css paints, so the
// key never claims a hue the bars don't use. The pivot rides --state-active but
// is dashed-ringed in the CSS (barPivot), and the just-placed pivot is --state-done
// ringed in the accent (barPivotHome) — both are shape-differentiated so they never
// read by hue alone on a colour-blind canvas. The < pivot side is a faint accent
// wash (barBelow), the comparing pair is --state-active (barCompare), a mid-swap bar
// is --state-flight (barFlight), and any finalized index is --state-done (barLocked).
const SW_PIVOT = 'var(--state-active)';
const SW_COMPARE = 'var(--state-active)';
const SW_FLIGHT = 'var(--state-flight)';
const SW_BELOW = 'var(--topic-accent)';
const SW_HOME = 'var(--state-done)';
const SW_LOCKED = 'var(--state-done)';
// Recursion scene: the live call's range is a topic-accent wash (barLeftSide); the
// kept side of a quickselect partition is the secondary-ink wash (barRightSide).
const SW_ACTIVE_RANGE = 'var(--topic-accent)';
const SW_KEPT = 'var(--color-text-secondary)';

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

// The sorted array the recursion scene rests on: once the FIRST partition settles
// the bars never move again (recursion only re-orders WITHIN each side, but for
// STAGE_VALUES every later partition's writes leave the bars sorted), so the scene
// keeps one stable row and animates only WHICH range is active and which pivots are
// locked. We read the final array straight off the generator's last frame.
const RECURSE_VALUES = ALL_FRAMES[ALL_FRAMES.length - 1].array;

// RECURSE_STEPS is the full quicksort recursion over STAGE_VALUES, derived ENTIRELY
// from the same generator frames the partition scenes use. We never hand-place a
// step: a generator 'pivot' frame is a DESCENT into a range (its pivot not yet
// home), a 'place' frame is the RETURN where that range's pivot locks, and a
// 'locked' frame is a single-element BASE case clicking shut. The generator emits
// them in real call order (left subtree fully, then right), so stepping this list
// is literally watching the call stack: descend to a base case, then pivots lock on
// the way back up. depth(R) = how many partitioned ranges STRICTLY contain R, a
// pure function of the tree, so the staircase indent is honest too.
const buildRecurseSteps = () => {
	const placeRanges = ALL_FRAMES.filter(f => f.phase === 'place').map(
		f => f.range
	);
	const strictlyContains = (a, b) =>
		a[0] <= b[0] && a[1] >= b[1] && (a[0] !== b[0] || a[1] !== b[1]);
	const depthOf = r => placeRanges.filter(p => strictlyContains(p, r)).length;
	const steps = [];
	for (const f of ALL_FRAMES) {
		if (f.phase === 'pivot') {
			steps.push({
				activeRange: f.range,
				depth: depthOf(f.range),
				phase: 'descend',
				lockedPivots: f.locked,
				caption: `Descend into [${f.range[0]}…${f.range[1]}]. Pick its last value (${RECURSE_VALUES[f.range[1]]}) as the pivot.`,
			});
		} else if (f.phase === 'locked') {
			steps.push({
				activeRange: f.range,
				depth: depthOf(f.range),
				phase: 'base',
				lockedPivots: f.locked,
				caption: `Base case: the one-element range [${f.range[0]}] (${RECURSE_VALUES[f.range[0]]}) is already sorted. It clicks and returns.`,
			});
		} else if (f.phase === 'place') {
			steps.push({
				activeRange: f.range,
				depth: depthOf(f.range),
				phase: 'return',
				lockedPivots: f.locked,
				pivot: f.pivotIndex,
				caption: `Return: pivot ${RECURSE_VALUES[f.pivotIndex]} locks at index ${f.pivotIndex}. Now recurse on its two sides.`,
			});
		}
	}
	return steps;
};
const RECURSE_STEPS = buildRecurseSteps();
const RECURSE_LAST = RECURSE_STEPS.length - 1;
// The settled final frame: every index locked, no active range. Reduced motion
// settles straight here, and the closing tick rests on it before replaying.
const RECURSE_DONE = {
	activeRange: null,
	depth: 0,
	phase: 'return',
	lockedPivots: RECURSE_VALUES.map((_, idx) => idx),
	caption: 'Every range has bottomed out and every pivot is locked. Sorted.',
};

// The worst-case "stick": on a sorted input the last-element pivot is always the
// max, so each partition peels ONE element and recurses on the size n-1 rest.
// We render that as a staircase of shrinking ranges to make T(n)=T(n-1)+n visible.
const N = STAGE_VALUES.length;
const STICK_LEVELS = Array.from({ length: N }, (_, depth) => ({
	size: N - depth,
	from: depth,
}));

// QUICKSELECT scene (index 5). The SAME Lomuto partition, now doing selection:
// we show the array AFTER the first partition, with the pivot placed, the left
// (smaller) side discarded, and the right (larger) side kept as the search range.
// Every position here is read off the deterministic trace of the exam's
// quicksort-3 instance (./quickselectTrace.js) — nothing is hand-placed.
const SELECT_RUN = quickselectTrace(SELECT_INPUT, SELECT_I);
const SELECT_VALUES = SELECT_RUN.firstPartition.array; // array after partition 1
const SELECT_PIVOT_INDEX = SELECT_RUN.firstPartition.pivotFinalIndex; // 0-based
const SELECT_N = SELECT_VALUES.length;
// i (1-based) vs the pivot's rank (landing index + 1) decides the kept side. The
// answer is DERIVED, exactly as the scene's check derives it, so the bars and the
// prompt can never disagree: i > rank ⇒ keep the right, else keep the left.
const SELECT_KEEP_RIGHT = SELECT_I > SELECT_PIVOT_INDEX + 1;

// The select array has one more element than STAGE_VALUES, so give it its own slot
// grid (same SLOT/PAD metrics) — the partition scenes keep their own geometry.
const SELECT_VIEW_W = PAD_X * 2 + SELECT_N * SLOT;

const QuickSortStage = ({ activeScene = 0, holdReveal = false }) => {
	const reducedMotion = useReducedMotion();
	const wrapRef = useRef(null);

	// Scenes 0 (partition) and 1 (snap home) animate the partition timeline.
	// Scene 0 stops just before the final pivot swap; scene 1 plays it to the end.
	const isPartitionScene = activeScene === 0 || activeScene === 1;
	// Reveal gate: the partition scene (0) carries a predict-before-reveal check.
	// While its prediction is pending the template passes holdReveal=true, so the
	// stage HOLDS the honest pre-partition frame (nothing swapped, pivot marked,
	// boundary not started) and does not auto-play the sweep that would spoil
	// which values land on which side. The gate only ever applies to scene 0.
	const partitionHeld = activeScene === 0 && holdReveal;
	const isRecurse = activeScene === 2;
	const isWorstCase = activeScene === 3 || activeScene === 4;
	const showRecurrence = activeScene === 4;
	// Scene 5 (quickselect) reuses the bar row, never the worst-case stick or the
	// partition animation — it is a static "after one partition" snapshot.
	const isSelect = activeScene === 5;

	const [frameIdx, setFrameIdx] = useState(0);

	useEffect(() => {
		if (!isPartitionScene) {
			setFrameIdx(0);
			return undefined;
		}
		const last = PARTITION_FRAMES.length - 1;
		if (partitionHeld) {
			// Prediction pending: park on frame 0 (the honest pre-partition state:
			// pivot marked, nothing swapped yet) and do not start the sweep. The
			// instant the student answers, holdReveal flips false and this effect
			// re-runs to play the real partition from the top.
			setFrameIdx(0);
			return undefined;
		}
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
	}, [isPartitionScene, reducedMotion, partitionHeld]);

	const frame = PARTITION_FRAMES[frameIdx] || PARTITION_FRAMES[0];

	// The recursion scene steps RECURSE_STEPS (descend → base → return, in real call
	// order). It clones the partition scene's stepper exactly: an interval while
	// motion is allowed, a settle to the finished frame for reduced motion, and an
	// inline transport so a student can walk the unwind by hand. A small play flag
	// lets the inline Pause/Play stop the auto-advance without leaving the scene.
	const [recurseIdx, setRecurseIdx] = useState(0);
	const [recursePlaying, setRecursePlaying] = useState(true);

	useEffect(() => {
		if (!isRecurse) {
			setRecurseIdx(0);
			setRecursePlaying(true);
			return undefined;
		}
		if (reducedMotion) {
			// Settle on the finished recursion: every pivot locked, no active range.
			setRecurseIdx(RECURSE_LAST + 1);
			setRecursePlaying(false);
			return undefined;
		}
		setRecurseIdx(0);
		setRecursePlaying(true);
	}, [isRecurse, reducedMotion]);

	const recurseTickRef = useRef(recurseIdx);
	useEffect(() => {
		if (!isRecurse || reducedMotion || !recursePlaying) return undefined;
		// Resume the raw counter from wherever the visible step currently sits.
		recurseTickRef.current = recurseIdx;
		const id = window.setInterval(() => {
			let idx = recurseTickRef.current + 1;
			// One extra slot past the last step rests on RECURSE_DONE (all sorted);
			// hold it two ticks, then replay from the top for a late scroller.
			if (idx >= RECURSE_LAST + 3) idx = 0;
			recurseTickRef.current = idx;
			setRecurseIdx(Math.min(idx, RECURSE_LAST + 1));
		}, 1050);
		return () => window.clearInterval(id);
		// recurseIdx is the resume seed only; re-running on every tick would reset the
		// counter, so it is intentionally not in the dep list.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isRecurse, reducedMotion, recursePlaying]);

	const stepRecurse = delta => {
		setRecursePlaying(false);
		setRecurseIdx(prev =>
			Math.max(0, Math.min(prev + delta, RECURSE_LAST + 1))
		);
	};
	const toggleRecursePlay = () => {
		// Pressing play while parked on the finished frame replays from the top.
		if (!recursePlaying && recurseIdx > RECURSE_LAST) setRecurseIdx(0);
		setRecursePlaying(prev => !prev);
	};

	// The active recursion step: indices 0..RECURSE_LAST are real generator-derived
	// steps; the one slot past the end is the settled all-sorted frame.
	const recurseStep =
		recurseIdx > RECURSE_LAST ? RECURSE_DONE : RECURSE_STEPS[recurseIdx];

	// Which values + per-slot roles to render for the current scene.
	const view = useMemo(() => {
		if (isPartitionScene) {
			return { values: frame.array, frame };
		}
		if (isRecurse) {
			// One stable sorted row; the LIVE step (active range + locked pivots)
			// drives the colours, so the eye follows one range down to its base case
			// and watches pivots lock on the way back up.
			return { values: RECURSE_VALUES, frame: null };
		}
		if (isSelect) {
			// Selection: the array AFTER the first partition. No live frame — the
			// roles (placed pivot, discarded side, kept side) are static per slot.
			return { values: SELECT_VALUES, frame: null };
		}
		// Worst case + recurrence scenes reuse the sorted-stick illustration below;
		// the bar row shows the already-sorted array to motivate the bad pivot.
		return {
			values: [...STAGE_VALUES].sort((a, b) => a - b),
			frame: null,
		};
	}, [isPartitionScene, isRecurse, isSelect, frame]);

	const caption = useMemo(() => {
		if (isPartitionScene) return frame.caption;
		if (isRecurse) return recurseStep.caption;
		if (isSelect)
			return `Pivot ${SELECT_VALUES[SELECT_PIVOT_INDEX]} placed at rank ${SELECT_PIVOT_INDEX + 1}. Want the ${SELECT_I}th smallest, so search the ${SELECT_KEEP_RIGHT ? 'right' : 'left'} side only — the other side is discarded.`;
		if (activeScene === 3)
			return 'Already sorted: the last-element pivot is always the maximum, so every split is lopsided.';
		return 'Each partition peels one element: sizes n, n−1, …, 1. The work stacks to Θ(n²).';
	}, [isPartitionScene, isRecurse, isSelect, activeScene, frame, recurseStep]);

	// Scene-aware key: only the states THIS scene actually paints, mirroring the
	// merge/SSSP adopters. Hue is never the sole signal — the pivot tokens carry
	// rings (dashed while in flight, solid accent once home), so a colour-blind
	// reader tells them apart by shape too. Scenes with no live read/write state
	// (the worst-case stick, scenes 3 & 4) get an empty list and render no legend.
	const legend = (() => {
		if (isPartitionScene) {
			// Partition (0) and snap-home (1): the Lomuto roles. Scene 1 additionally
			// lands the pivot home (barPivotHome), so it names the placed pivot too.
			const items = [
				{
					swatch: SW_PIVOT,
					label: 'pivot (dashed)',
					aria: 'blue, dashed ring',
				},
				{ swatch: SW_COMPARE, label: 'comparing', aria: 'blue' },
				{ swatch: SW_FLIGHT, label: 'swapping', aria: 'orange' },
				{ swatch: SW_BELOW, label: '< pivot', aria: 'faint accent' },
			];
			if (activeScene === 1) {
				items.push({
					swatch: SW_HOME,
					label: 'pivot placed (ringed)',
					aria: 'green, accent ring',
				});
			}
			return items;
		}
		if (isRecurse) {
			// Recursion: the live call's range, pivots locking, and settled pivots.
			return [
				{ swatch: SW_ACTIVE_RANGE, label: 'active range', aria: 'accent' },
				{
					swatch: SW_HOME,
					label: 'pivot placed (ringed)',
					aria: 'green, accent ring',
				},
				{ swatch: SW_LOCKED, label: 'locked', aria: 'green' },
			];
		}
		if (isSelect) {
			// Quickselect: the placed pivot, the kept search side, the discarded side.
			return [
				{
					swatch: SW_HOME,
					label: 'pivot placed (ringed)',
					aria: 'green, accent ring',
				},
				{ swatch: SW_KEPT, label: 'kept side', aria: 'grey' },
				{ swatch: SW_LOCKED, label: 'discarded', aria: 'green' },
			];
		}
		// Worst-case scenes (3, 4) render the stick illustration, which has its own
		// labelled aria — no per-bar state to key, so no legend.
		return [];
	})();

	const barClassFor = slot => {
		const f = view.frame;
		if (isRecurse) {
			const step = recurseStep;
			const range = step.activeRange;
			const inActive = range && slot >= range[0] && slot <= range[1];
			// The pivot that LOCKS on this exact step (a return's placed pivot, or a
			// base case's single element) snaps to the home token: the visible "click".
			const justLocked =
				(step.phase === 'return' && slot === step.pivot) ||
				(step.phase === 'base' && inActive);
			if (justLocked) return styles.barPivotHome;
			// Any pivot already finalized by an earlier call sits as a settled token.
			if (step.lockedPivots.includes(slot)) return styles.barLocked;
			// The call we are inside right now: highlight the whole live range so the
			// eye follows ONE range down to its base case and back up.
			if (inActive) return styles.barLeftSide;
			// Everything outside the active call is dimmed (not part of this descent).
			return styles.barRecurseDim;
		}
		if (isSelect) {
			// Pivot placed at its final rank; the KEPT side (where the i-th smallest
			// lives) is highlighted as the search range, the DISCARDED side is dimmed.
			// Which side is kept is derived, so this never contradicts the prompt.
			if (slot === SELECT_PIVOT_INDEX) return styles.barPivotHome;
			const onRight = slot > SELECT_PIVOT_INDEX;
			const kept = SELECT_KEEP_RIGHT ? onRight : !onRight;
			return kept ? styles.barRightSide : styles.barLocked;
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

	const renderBars = () => {
		// The select scene shows a 9-value array (one wider than STAGE_VALUES) with a
		// larger max, so widen the viewBox and scale heights to its own max — every
		// other scene keeps the original 8-slot geometry.
		const viewW = isSelect ? SELECT_VIEW_W : VIEW_W;
		const maxValue = isSelect ? Math.max(...view.values, 1) : VALUE_MAX;
		const barHeight = value =>
			isSelect ? Math.max(8, (value / maxValue) * BAR_MAX_H) : heightFor(value);
		return (
			<svg
				viewBox={`0 0 ${viewW} ${VIEW_H}`}
				className={styles.svg}
				preserveAspectRatio="xMidYMid meet"
			>
				{/* Active-range bracket: under the recursion scene's bars, a bracket spans
				    exactly the call we are inside this step, so the eye sees the window
				    shrink as the recursion descends and the brackets vanish as ranges
				    return. Its slots come straight from the generator-derived step. */}
				{isRecurse && recurseStep.activeRange && (
					<RangeBracket
						range={recurseStep.activeRange}
						className={
							recurseStep.phase === 'base'
								? styles.bracketBase
								: styles.bracketActive
						}
					/>
				)}

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
					const h = barHeight(value);
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
	};

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
							? 'Quicksort recursion: ranges shrink to base cases and pivots lock as each call returns'
							: isSelect
								? 'Quickselect: after one partition, the pivot is placed, one side is discarded, and the other is kept as the search range'
								: 'Quicksort worst case: a lopsided recursion'
				}
			>
				{isWorstCase ? renderStick() : renderBars()}

				{/* Colour key for the live states this scene paints. Gated like the
				    merge/SSSP adopters: only the scenes with per-bar read/write state
				    pass items, so the worst-case stick (which has its own aria) shows
				    no key for colours that aren't on screen. */}
				{legend.length > 0 && (
					<div className={styles.legendDock}>
						<StateLegend items={legend} />
					</div>
				)}

				<p className={styles.caption}>{caption}</p>

				{/* Recursion transport: a depth read-out plus prev / play-pause / next so
				    a student can walk the descent and unwind one call at a time. The
				    depth chips make the call-stack height visible; the active chip is the
				    range we are in right now. Reduced-motion users keep prev/next to step
				    by hand (auto-play stays off for them by design, like the merge stage). */}
				{isRecurse && (
					<div className={styles.recurseTransport}>
						<div
							className={styles.depthStack}
							aria-label={`Call depth ${recurseStep.depth}`}
						>
							{Array.from({ length: recurseStep.depth + 1 }).map((_, d) => (
								<span
									key={d}
									className={`${styles.depthChip} ${d === recurseStep.depth ? styles.depthChipActive : ''}`}
								/>
							))}
							<span className={styles.depthLabel}>
								{recurseStep.activeRange
									? `depth ${recurseStep.depth} · [${recurseStep.activeRange[0]}…${recurseStep.activeRange[1]}]`
									: 'sorted'}
							</span>
						</div>
						<div className={styles.recurseControls}>
							<button
								type="button"
								className={styles.recurseBtn}
								onClick={() => stepRecurse(-1)}
								disabled={recurseIdx <= 0}
								aria-label="Previous recursion step"
								title="Previous recursion step"
							>
								<ChevronLeft size={15} strokeWidth={1.8} aria-hidden="true" />
							</button>
							{!reducedMotion && (
								<button
									type="button"
									className={`${styles.recurseBtn} ${styles.recursePlay}`}
									onClick={toggleRecursePlay}
									aria-pressed={recursePlaying}
									aria-label={
										recursePlaying ? 'Pause recursion' : 'Play recursion'
									}
									title={recursePlaying ? 'Pause recursion' : 'Play recursion'}
								>
									{recursePlaying ? (
										<Pause
											size={15}
											strokeWidth={1.8}
											fill="currentColor"
											aria-hidden="true"
										/>
									) : (
										<Play
											size={15}
											strokeWidth={1.8}
											fill="currentColor"
											aria-hidden="true"
										/>
									)}
								</button>
							)}
							<button
								type="button"
								className={styles.recurseBtn}
								onClick={() => stepRecurse(1)}
								disabled={recurseIdx > RECURSE_LAST}
								aria-label="Next recursion step"
								title="Next recursion step"
							>
								<ChevronRight size={15} strokeWidth={1.8} aria-hidden="true" />
							</button>
						</div>
					</div>
				)}

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
					{isSelect
						? `select · i = ${SELECT_I} · n = ${SELECT_N}`
						: `partition · n = ${STAGE_VALUES.length}`}
				</div>
			</div>
		</>
	);
};

// A bracket drawn just under a run of slots to mark the recursion's active range.
// It spans [lo, hi] using the same slot geometry as the bars, so the shrinking
// window in the recursion scene lines up exactly with the bars above it.
const RangeBracket = ({ range, className }) => {
	const [lo, hi] = range;
	const x1 = PAD_X + lo * SLOT + 3;
	const x2 = PAD_X + hi * SLOT + SLOT - 3;
	const y = BASE_Y + 36;
	const tick = 5;
	return (
		<path
			className={className}
			d={`M ${x1} ${y - tick} L ${x1} ${y} L ${x2} ${y} L ${x2} ${y - tick}`}
			fill="none"
			aria-hidden="true"
		/>
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
