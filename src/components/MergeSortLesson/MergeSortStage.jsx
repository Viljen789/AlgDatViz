import { useMemo } from 'react';
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

	const visibleLevels = activeScene >= 1 ? 4 : 1;
	const showRecurrence = activeScene >= 4;
	const leafPulse = activeScene === 2;
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
		const isSelected =
			isInteractiveBar && selectedSlots.includes(renderSlot);
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
					x={x}
					y={y}
					width={BAR_W}
					height={h}
					rx="1.5"
					className={`${fillClass} ${isFollow ? styles.barFollow : ''}`}
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
			const parentBaselineY =
				PAD_Y + levelIdx * LEVEL_GAP + BAR_MAX_H + 1;
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

	return (
		<div
			className={styles.wrap}
			data-scene={activeScene}
			role="img"
			aria-label="Merge sort recursion tree visualization"
		>
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
					<span className={styles.recurrenceLabel}>
						= O(n log n)
					</span>
				</div>
			</div>

			<div className={styles.notation} aria-hidden="true">
				O(n log n) · n = {STAGE_VALUES.length}
			</div>
		</div>
	);
};

export default MergeSortStage;
