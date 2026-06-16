import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import useReducedMotion from '../../hooks/useReducedMotion.js';
import { SceneNarration } from '../../common/PlaybackEngine';
import { STAGE_VALUES } from './scenes.js';
import styles from './MergeSortStage.module.css';

// Stage geometry. Bars sit in a fixed 8-slot grid so vertical alignment across
// recursion levels is preserved. Width and height of the SVG viewBox are
// independent of the rendered size; the parent constrains scale.
const SLOT = 30;
const SLOT_PAD = 4;
const BAR_W = SLOT - SLOT_PAD * 2;
const PAD_X = 18;
const PAD_Y = 18;
const LEVEL_GAP = 50;
const BAR_MAX_H = 36;
const VALUE_MAX = Math.max(...STAGE_VALUES);
const VIEW_W = PAD_X * 2 + STAGE_VALUES.length * SLOT;
const VIEW_H = PAD_Y * 2 + 4 * LEVEL_GAP - 4;

// The "follow-me" element: the smallest value travels the full width (it ends at
// the far left of the sorted run), so tagging it lets the eye track ONE piece all
// the way down to its base case and back up — the lesson the stage exists to show.
const FOLLOW_IDX = STAGE_VALUES.indexOf(Math.min(...STAGE_VALUES));
const FOLLOW_VALUE = STAGE_VALUES[FOLLOW_IDX];

// Scene 3 ("Combine") zooms into ONE real merge: the two leftmost sorted
// leaf-pairs combine into their parent. Two cursors compare fronts, the smaller
// is copied out, repeat — the linear-scan invariant the whole lesson builds to.
// The follow-me value (3) is copied out first, so it visibly leads the run.
const MERGE_L = STAGE_VALUES.slice(0, 2)
	.slice()
	.sort((a, b) => a - b);
const MERGE_R = STAGE_VALUES.slice(2, 4)
	.slice()
	.sort((a, b) => a - b);
const MERGE_TOTAL = MERGE_L.length + MERGE_R.length;

// Pre-compute the merge as a list of frames (a compare, then a copy, per element)
// so the stage only steps an index. No paid plugins, deterministic, replayable.
const buildMergeSteps = (left, right) => {
	const steps = [];
	const out = [];
	let i = 0;
	let j = 0;
	while (i < left.length && j < right.length) {
		steps.push({
			i,
			j,
			out: [...out],
			comparing: true,
			copied: null,
			narr: `compare fronts: ${left[i]} vs ${right[j]}`,
		});
		if (left[i] <= right[j]) {
			out.push(left[i]);
			steps.push({
				i: i + 1,
				j,
				out: [...out],
				comparing: false,
				copied: left[i],
				narr: `${left[i]} ≤ ${right[j]}, so copy ${left[i]} out`,
			});
			i += 1;
		} else {
			out.push(right[j]);
			steps.push({
				i,
				j: j + 1,
				out: [...out],
				comparing: false,
				copied: right[j],
				narr: `${right[j]} < ${left[i]}, so copy ${right[j]} out`,
			});
			j += 1;
		}
	}
	while (i < left.length) {
		out.push(left[i]);
		steps.push({
			i: i + 1,
			j,
			out: [...out],
			comparing: false,
			copied: left[i],
			narr: `left is drained, copy ${left[i]}`,
		});
		i += 1;
	}
	while (j < right.length) {
		out.push(right[j]);
		steps.push({
			i,
			j: j + 1,
			out: [...out],
			comparing: false,
			copied: right[j],
			narr: `right is drained, copy ${right[j]}`,
		});
		j += 1;
	}
	steps.push({
		i,
		j,
		out: [...out],
		comparing: false,
		copied: null,
		narr: 'one sorted run; the merge is linear',
	});
	return steps;
};
const MERGE_STEPS = buildMergeSteps(MERGE_L, MERGE_R);

const heightFor = value => Math.max(4, (value / VALUE_MAX) * BAR_MAX_H);

// Return the slot index of each bar within the original array. We always
// render bars at their original array x-position so vertical alignment stays
// stable as the recursion descends and merges back.
const buildLevels = values => {
	const out = [];
	let current = [values.map((value, idx) => ({ value, idx }))];
	out.push(current);
	while (current[0].length > 1) {
		const next = current.flatMap(group => {
			const mid = Math.floor(group.length / 2);
			return [group.slice(0, mid), group.slice(mid)];
		});
		out.push(next);
		current = next;
	}
	return out;
};

const sortGroups = levels =>
	levels.map(level =>
		level.map(group => [...group].sort((a, b) => a.value - b.value))
	);

const groupCenter = group => {
	const xs = group.map(item => PAD_X + item.idx * SLOT + SLOT / 2);
	return (Math.min(...xs) + Math.max(...xs)) / 2;
};

const MergeSortStage = ({
	activeScene = 0,
	interactionMode = null,
	selectedSlots = [],
	exampleSlots = [],
	answerStatus = null,
	onBarClick,
}) => {
	const levels = useMemo(() => buildLevels(STAGE_VALUES), []);
	const sorted = useMemo(() => sortGroups(levels), [levels]);
	const reducedMotion = useReducedMotion();

	// Scope for GSAP cleanup, and a per-render collection of the bottom-row
	// <rect> nodes so the base-case "seat" can address exactly the leaves.
	const wrapRef = useRef(null);
	const leafRectsRef = useRef([]);
	leafRectsRef.current = [];

	// Scene 3 is the choreographed merge. Step an index through MERGE_STEPS while
	// it's active; reduced motion shows the finished run; leaving resets.
	const isCombine = activeScene === 3;
	const [mergeStep, setMergeStep] = useState(0);
	useEffect(() => {
		if (!isCombine) {
			setMergeStep(0);
			return undefined;
		}
		if (reducedMotion) {
			setMergeStep(MERGE_STEPS.length - 1);
			return undefined;
		}
		setMergeStep(0);
		let idx = 0;
		const id = window.setInterval(() => {
			idx += 1;
			// Hold the finished run for two ticks, then replay for late scrollers.
			if (idx >= MERGE_STEPS.length + 2) idx = 0;
			setMergeStep(Math.min(idx, MERGE_STEPS.length - 1));
		}, 1150);
		return () => window.clearInterval(id);
	}, [isCombine, reducedMotion]);

	const visibleLevels = activeScene >= 1 ? 4 : 1;
	const showRecurrence = activeScene >= 4;
	const leafPulse = activeScene === 2;

	// Honest per-scene narration for screen readers — the SAME thing the figure
	// shows at this scene, no value-ordering the index-packed bars do not satisfy.
	// The combine scene reuses the live compare/copy line that drives the demo.
	const sceneNarration = (() => {
		switch (activeScene) {
			case 0:
				return `Unsorted array of ${STAGE_VALUES.length} values, not yet split.`;
			case 1:
				return 'Split in half, and the halves in half, down to single elements.';
			case 2:
				return 'At the bottom every piece is one element, trivially sorted.';
			case 3:
				return (MERGE_STEPS[mergeStep] || MERGE_STEPS[0]).narr;
			default:
				return 'The same n-work merge runs at every level: n log n total.';
		}
	})();

	// The base-case "click": when scene 2 becomes active the recursion has reached
	// single-element leaves (already sorted), and the bottom row settles with one
	// crisp seat — left-to-right, like a line of type hitting a platen. It marks
	// the divide -> conquer turn: the eye gets a "floor reached" beat before the
	// merges rebuild upward. One overshoot only (the JS twin of --ease-spring),
	// fired once per entry into the scene; overwrite:'auto' so rapid scrolling
	// never strands a tween. Reduced motion skips it entirely — the barDone color
	// change alone carries "base case reached".
	useEffect(() => {
		if (!leafPulse || reducedMotion) return undefined;
		const rects = leafRectsRef.current.filter(Boolean);
		if (!rects.length) return undefined;
		// Address them strictly left-to-right regardless of DOM push order, so the
		// stagger reads as a typewriter sweep across the floor.
		rects.sort((a, b) => a.getBBox().x - b.getBBox().x);
		const ctx = gsap.context(() => {
			gsap.fromTo(
				rects,
				{ scaleY: 0.92, y: -1, transformOrigin: '50% 100%' },
				{
					scaleY: 1,
					y: 0,
					duration: 0.34,
					ease: 'back.out(1.4)',
					stagger: { each: 0.04, from: 'start' },
					overwrite: 'auto',
					// Hand the resting look back to the CSS state classes.
					clearProps: 'transform,transformOrigin',
				}
			);
		}, wrapRef);
		return () => ctx.revert();
	}, [leafPulse, reducedMotion]);

	const isClickableScene = interactionMode === 'pair' && activeScene === 0;

	// Sorting propagates from the leaves upward as the merge plays out.
	// Index = level depth (0 = root, 3 = leaves).
	const sortedMask = (() => {
		switch (activeScene) {
			case 2:
				return [false, false, false, true];
			case 3:
				return [false, false, true, true];
			case 4:
				return [true, true, true, true];
			default:
				return [false, false, false, false];
		}
	})();

	// Level 2 is the first merge that actually combines values. Highlight that
	// row in flight when the merge scene is active.
	const flightLevel = activeScene === 3 ? 2 : null;

	const renderBar = (bar, levelIdx, groupIdx, withinGroupIdx) => {
		const baseline = PAD_Y + levelIdx * LEVEL_GAP + BAR_MAX_H;
		const useSortedHere = sortedMask[levelIdx];
		const groupSource = useSortedHere
			? sorted[levelIdx][groupIdx]
			: levels[levelIdx][groupIdx];
		const groupSlotIndices = levels[levelIdx][groupIdx]
			.map(item => item.idx)
			.sort((a, b) => a - b);
		const renderSlot = useSortedHere
			? groupSlotIndices[withinGroupIdx]
			: groupSource[withinGroupIdx].idx;
		const x = PAD_X + renderSlot * SLOT + SLOT_PAD;
		const h = heightFor(bar.value);
		const y = baseline - h;

		const isLeaf = levelIdx === levels.length - 1;
		const isFlight = flightLevel === levelIdx;
		const isLeafPulse = isLeaf && leafPulse;
		const isInteractiveBar = isClickableScene && levelIdx === 0;
		const isSelected = isInteractiveBar && selectedSlots.includes(renderSlot);
		const isExample = isInteractiveBar && exampleSlots.includes(renderSlot);

		let fillClass;
		if (isInteractiveBar && answerStatus === 'correct' && isSelected) {
			fillClass = styles.barDone;
		} else if (isInteractiveBar && answerStatus === 'incorrect' && isExample) {
			fillClass = styles.barDone;
		} else if (isInteractiveBar && isSelected) {
			fillClass = styles.barSelected;
		} else if (isLeafPulse) {
			fillClass = styles.barDone;
		} else if (isFlight) {
			fillClass = styles.barFlight;
		} else if (useSortedHere) {
			fillClass = styles.barDoneFaint;
		} else {
			fillClass = styles.barDefault;
		}

		const hitX = PAD_X + renderSlot * SLOT;
		const hitY = baseline - BAR_MAX_H - 6;
		const hitW = SLOT;
		const hitH = BAR_MAX_H + 12;
		const isFollow = bar.idx === FOLLOW_IDX;
		const slotCenterX = PAD_X + renderSlot * SLOT + SLOT / 2;

		return (
			<g key={`${levelIdx}-${groupIdx}-${withinGroupIdx}`}>
				<rect
					ref={
						isLeaf
							? el => {
									if (el) leafRectsRef.current.push(el);
								}
							: undefined
					}
					x={x}
					y={y}
					width={BAR_W}
					height={h}
					rx="1.5"
					className={`${fillClass} ${isLeaf ? styles.leafSeat : ''} ${
						isFollow ? styles.barFollow : ''
					}`}
				/>
				{/* The value lives ON the bar so a student can follow one number down
				    to its base case and watch it re-join in sorted order. */}
				<text
					x={slotCenterX}
					y={baseline + 9}
					className={`${styles.barValue} ${isFollow ? styles.barValueFollow : ''}`}
				>
					{bar.value}
				</text>
				{isInteractiveBar && (
					<rect
						x={hitX}
						y={hitY}
						width={hitW}
						height={hitH}
						className={styles.hitTarget}
						onClick={() => onBarClick?.(renderSlot)}
						role="button"
						tabIndex={0}
						aria-label={`Bar ${renderSlot + 1} of ${STAGE_VALUES.length}, value ${bar.value}`}
						onKeyDown={event => {
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								onBarClick?.(renderSlot);
							}
						}}
					/>
				)}
			</g>
		);
	};

	const renderConnections = () => {
		if (activeScene < 1) return null;
		const lines = [];
		for (let levelIdx = 0; levelIdx < levels.length - 1; levelIdx++) {
			const parentLevel = levels[levelIdx];
			const childLevel = levels[levelIdx + 1];
			const parentBaselineY = PAD_Y + levelIdx * LEVEL_GAP + BAR_MAX_H + 1;
			const childTopY = PAD_Y + (levelIdx + 1) * LEVEL_GAP - 2;
			parentLevel.forEach((group, parentIdx) => {
				const left = childLevel[parentIdx * 2];
				const right = childLevel[parentIdx * 2 + 1];
				const px = groupCenter(group);
				if (left) {
					lines.push(
						<line
							key={`${levelIdx}-${parentIdx}-l`}
							x1={px}
							y1={parentBaselineY}
							x2={groupCenter(left)}
							y2={childTopY}
							className={styles.connector}
						/>
					);
				}
				if (right) {
					lines.push(
						<line
							key={`${levelIdx}-${parentIdx}-r`}
							x1={px}
							y1={parentBaselineY}
							x2={groupCenter(right)}
							y2={childTopY}
							className={styles.connector}
						/>
					);
				}
			});
		}
		return lines;
	};

	// Scene 3: the choreographed merge. Two sorted runs, a compare-and-copy that
	// builds the parent run one element at a time, with i/j cursors and a live
	// caption. Tokens reuse the State Quartet: comparing = active, just-copied =
	// in-flight, placed = done; the follow value keeps its accent outline.
	const renderMergeDemo = () => {
		const step = MERGE_STEPS[mergeStep] || MERGE_STEPS[0];
		const tokenClass = (value, role) =>
			[styles.mToken, role, value === FOLLOW_VALUE ? styles.mFollow : '']
				.filter(Boolean)
				.join(' ');
		const renderRun = (run, cursor, label, cursorKey) => (
			<div className={styles.mergeRun}>
				<span className={styles.mLabel}>{label}</span>
				<div className={styles.mRow}>
					{run.map((value, idx) => {
						const consumed = idx < cursor;
						const comparing = step.comparing && idx === cursor;
						const role = comparing
							? styles.mCompare
							: consumed
								? styles.mConsumed
								: '';
						return (
							<span key={idx} className={tokenClass(value, role)}>
								{value}
								{comparing && (
									<small className={styles.mCursor}>{cursorKey}</small>
								)}
							</span>
						);
					})}
				</div>
			</div>
		);
		return (
			<div className={styles.mergeDemo}>
				<div className={styles.mergeRuns}>
					{renderRun(MERGE_L, step.i, 'left, sorted', 'i')}
					{renderRun(MERGE_R, step.j, 'right, sorted', 'j')}
				</div>
				<div className={styles.mergeOut}>
					<span className={styles.mLabel}>merged</span>
					<div className={styles.mRow}>
						{Array.from({ length: MERGE_TOTAL }).map((_, k) => {
							const value = step.out[k];
							if (value == null)
								return (
									<span
										key={k}
										className={`${styles.mToken} ${styles.mEmpty}`}
									/>
								);
							const justCopied =
								k === step.out.length - 1 && step.copied != null;
							return (
								<span
									key={k}
									className={tokenClass(
										value,
										justCopied ? styles.mJust : styles.mDone
									)}
								>
									{value}
								</span>
							);
						})}
					</div>
				</div>
				<p className={styles.mergeNarr}>{step.narr}</p>
			</div>
		);
	};

	return (
		<>
			{/* Per-scene narration for screen readers, OUTSIDE the role=img figure
			    below (which collapses its in-figure caption into one static label). */}
			<SceneNarration>{sceneNarration}</SceneNarration>
			<div
				ref={wrapRef}
				className={styles.wrap}
				data-scene={activeScene}
				role="img"
				aria-label={
					isCombine
						? 'Merging two sorted runs into one'
						: 'Merge sort recursion tree visualization'
				}
			>
				{isCombine ? (
					renderMergeDemo()
				) : (
					<svg
						viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
						className={styles.svg}
						preserveAspectRatio="xMidYMid meet"
					>
						<g className={styles.connectorGroup}>{renderConnections()}</g>

						{Array.from({ length: visibleLevels }).map((_, levelIdx) => {
							const groups = sortedMask[levelIdx]
								? sorted[levelIdx]
								: levels[levelIdx];
							return (
								<g
									key={levelIdx}
									className={styles.levelGroup}
									style={{
										// Per-level entrance delay when first revealing the tree.
										'--delay': `${levelIdx * 90}ms`,
									}}
								>
									{groups.map((group, groupIdx) =>
										group.map((bar, withinIdx) =>
											renderBar(bar, levelIdx, groupIdx, withinIdx)
										)
									)}
								</g>
							);
						})}
					</svg>
				)}

				<div
					className={`${styles.recurrence} ${showRecurrence ? styles.recurrenceShow : ''}`}
					aria-hidden={!showRecurrence}
				>
					<div className={styles.recurrenceList}>
						<span>Level 0 · 1 merge × n</span>
						<span>Level 1 · 2 merges × n/2</span>
						<span>Level 2 · 4 merges × n/4</span>
					</div>
					<div className={styles.recurrenceTotal}>
						<span className={styles.recurrenceMath}>
							n × log<sub>2</sub> n
						</span>
						<span className={styles.recurrenceLabel}>= O(n log n)</span>
					</div>
				</div>

				<div className={styles.notation} aria-hidden="true">
					O(n log n) · n = {STAGE_VALUES.length}
				</div>
			</div>
		</>
	);
};

export default MergeSortStage;
