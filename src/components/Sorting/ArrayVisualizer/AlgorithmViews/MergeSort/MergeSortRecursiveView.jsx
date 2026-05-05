import { useMemo } from 'react';
import styles from './MergeSortRecursiveView.module.css';

const valueOf = item =>
	item && typeof item === 'object' && 'value' in item ? item.value : item;

const sameRange = (a, b) =>
	Array.isArray(a) && Array.isArray(b) && a[0] === b[0] && a[1] === b[1];

const rangeListIncludes = (ranges, target) =>
	Array.isArray(ranges) && ranges.some(range => sameRange(range, target));

const rangeValues = (values, range) => {
	if (!Array.isArray(range)) return [];
	return values.slice(range[0], range[1] + 1);
};

const buildLevels = values => {
	const levels = [];

	const visit = (start, end, depth) => {
		if (start > end) return;
		if (!levels[depth]) levels[depth] = [];
		levels[depth].push({
			id: `${depth}-${start}-${end}`,
			range: [start, end],
			values: values.slice(start, end + 1),
		});

		if (start === end) return;
		const mid = Math.floor((start + end) / 2);
		visit(start, mid, depth + 1);
		visit(mid + 1, end, depth + 1);
	};

	visit(0, values.length - 1, 0);
	return levels;
};

const phaseCopy = {
	ready: {
		label: 'Ready',
		title: 'Split until every piece is trivial.',
		body: 'Merge sort does not hunt for swaps. It creates tiny sorted pieces, then merges them back in order.',
	},
	initializing: {
		label: 'Initialize',
		title: 'The full range enters the recursion tree.',
		body: 'Every row below is a smaller version of the same problem.',
	},
	dividing: {
		label: 'Divide',
		title: 'The active range splits into left and right halves.',
		body: 'No values are sorted yet. The algorithm is only reducing the problem size.',
	},
	merging: {
		label: 'Merge',
		title: 'Two sorted halves compete for the next output slot.',
		body: 'The smaller front value is copied into the target range, then the cursor advances.',
	},
	completed: {
		label: 'Complete',
		title: 'Every merge has returned to the root.',
		body: 'The original range is now sorted because each child range was sorted first.',
	},
};

const operationLabel = operation => {
	switch (operation) {
		case 'merge_prepare':
			return 'prepare merge';
		case 'comparing':
			return 'compare fronts';
		case 'move_from_left':
			return 'copy left';
		case 'move_from_right':
			return 'copy right';
		case 'move_remaining_left':
			return 'drain left';
		case 'move_remaining_right':
			return 'drain right';
		case 'merge_complete':
			return 'range complete';
		default:
			return 'trace';
	}
};

const MergeSortRecursiveView = ({ array = [], currentFrame = null }) => {
	const frame =
		currentFrame && typeof currentFrame === 'object' ? currentFrame : null;
	const metadata = frame?.metadata || {};
	const values = useMemo(() => {
		const source = frame?.array || array || [];
		return source.map(valueOf);
	}, [array, frame]);
	const initialValues = useMemo(() => (array || []).map(valueOf), [array]);

	const levels = useMemo(
		() => buildLevels(initialValues.length ? initialValues : values),
		[initialValues, values]
	);
	const phase = metadata.phase || 'ready';
	const copy = phaseCopy[phase] || phaseCopy.ready;
	const activeRange = metadata.target ||
		metadata.range || [0, values.length - 1];
	const leftValues = rangeValues(values, metadata.left);
	const rightValues = rangeValues(values, metadata.right);
	const activeValues = rangeValues(values, activeRange);
	const outputValues =
		metadata.outputSnapshot || rangeValues(values, metadata.target);
	const movedElement = metadata.movedElement;
	const leftCursor = metadata.leftCursor;
	const rightCursor = metadata.rightCursor;
	const outputIndex = metadata.outputIndex;
	const targetStart = metadata.target?.[0] ?? activeRange?.[0] ?? 0;
	const isMerging = phase === 'merging';
	const isDividing = phase === 'dividing';
	const completed =
		phase === 'completed' || currentFrame?.sorted?.length === values.length;

	return (
		<div className={styles.container}>
			<header className={styles.header}>
				<div>
					<span className={styles.phaseBadge}>{copy.label}</span>
					<h3>{copy.title}</h3>
				</div>
				<div className={styles.rangeBadge}>
					<span>range</span>
					<strong>
						{activeRange?.[0] ?? 0}-{activeRange?.[1] ?? values.length - 1}
					</strong>
				</div>
			</header>

			<section className={styles.workspace} aria-label="Merge sort workspace">
				<div className={styles.narration}>
					<p>{copy.body}</p>
					<span>{operationLabel(metadata.operation)}</span>
				</div>

				<div className={styles.activeRange}>
					<div className={styles.rangeLabel}>active range</div>
					<div className={styles.tokenRow}>
						{activeValues.map((value, index) => (
							<span
								key={`active-${index}-${value}`}
								className={`${styles.token} ${completed ? styles.verified : ''}`}
							>
								{value}
							</span>
						))}
					</div>
				</div>

				<div className={styles.lanes}>
					<div
						className={`${styles.lane} ${
							isDividing || isMerging ? styles.laneActive : ''
						}`}
					>
						<div className={styles.laneTitle}>
							<span>left half</span>
							<small>
								{metadata.left
									? `${metadata.left[0]}-${metadata.left[1]}`
									: '-'}
							</small>
						</div>
						<div className={styles.tokenRow}>
							{leftValues.map((value, index) => {
								const globalIndex = (metadata.left?.[0] ?? 0) + index;
								const hasCursor = leftCursor === globalIndex;
								return (
									<span
										key={`left-${globalIndex}-${value}`}
										className={`${styles.token} ${
											hasCursor ? styles.comparing : ''
										} ${hasCursor ? styles.cursorToken : ''}`}
									>
										{value}
										{hasCursor && (
											<small className={styles.cursorLabel}>i</small>
										)}
									</span>
								);
							})}
						</div>
					</div>

					<div className={styles.flowColumn} aria-hidden="true">
						<span className={isDividing ? styles.flowActive : ''}>split</span>
						<span className={isMerging ? styles.flowActive : ''}>merge</span>
					</div>

					<div
						className={`${styles.lane} ${
							isDividing || isMerging ? styles.laneActive : ''
						}`}
					>
						<div className={styles.laneTitle}>
							<span>right half</span>
							<small>
								{metadata.right
									? `${metadata.right[0]}-${metadata.right[1]}`
									: '-'}
							</small>
						</div>
						<div className={styles.tokenRow}>
							{rightValues.map((value, index) => {
								const globalIndex = (metadata.right?.[0] ?? 0) + index;
								const hasCursor = rightCursor === globalIndex;
								return (
									<span
										key={`right-${globalIndex}-${value}`}
										className={`${styles.token} ${
											hasCursor ? styles.comparing : ''
										} ${hasCursor ? styles.cursorToken : ''}`}
									>
										{value}
										{hasCursor && (
											<small className={styles.cursorLabel}>j</small>
										)}
									</span>
								);
							})}
						</div>
					</div>
				</div>

				<div className={styles.outputLane}>
					<div className={styles.laneTitle}>
						<span>merged output</span>
						<small>
							{outputIndex !== undefined
								? `write cursor k = ${outputIndex}`
								: movedElement !== undefined
									? `copy ${movedElement}`
									: ''}
						</small>
					</div>
					<div className={styles.outputSlots}>
						{(outputValues.length ? outputValues : activeValues).map(
							(value, index) => {
								const globalIndex = targetStart + index;
								const hasCursor = outputIndex === globalIndex;
								return (
									<span
										key={`output-${index}-${value}`}
										className={`${styles.token} ${
											hasCursor || value === movedElement ? styles.moving : ''
										} ${hasCursor ? styles.cursorToken : ''} ${
											completed ? styles.verified : ''
										}`}
									>
										{value}
										{hasCursor && (
											<small className={styles.cursorLabel}>k</small>
										)}
									</span>
								);
							}
						)}
					</div>
				</div>
			</section>

			<section className={styles.recursionMap} aria-label="Recursion levels">
				{levels.map((level, levelIndex) => (
					<div key={levelIndex} className={styles.levelRow}>
						<div className={styles.levelLabel}>L{levelIndex}</div>
						<div className={styles.segmentRow}>
							{level.map(segment => {
								const isActive =
									sameRange(segment.range, activeRange) ||
									sameRange(segment.range, metadata.left) ||
									sameRange(segment.range, metadata.right);
								const isTarget = sameRange(segment.range, metadata.target);
								const isComplete = rangeListIncludes(
									metadata.completedRanges,
									segment.range
								);
								const isLeaf = segment.range[0] === segment.range[1];

								return (
									<div
										key={segment.id}
										className={`${styles.segment} ${
											isActive ? styles.segmentActive : ''
										} ${isTarget ? styles.segmentTarget : ''} ${
											isComplete ? styles.segmentComplete : ''
										} ${isLeaf ? styles.segmentLeaf : ''}`}
									>
										<span className={styles.segmentRange}>
											{segment.range[0]}-{segment.range[1]}
										</span>
										<span className={styles.segmentValues}>
											{segment.values.join(' ')}
										</span>
									</div>
								);
							})}
						</div>
					</div>
				))}
			</section>
		</div>
	);
};

export default MergeSortRecursiveView;
