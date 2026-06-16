import { useMemo } from 'react';
import { leftChild, parentIndex, rightChild } from './heapTrace.js';
import { BUILD_OPS, INSERT_OPS, STAGE_HEAP } from './scenes.js';
import { COMPARE_INPUT } from './heapMeta.js';
import StateLegend from '../../common/StateLegend/StateLegend';
import styles from './HeapStage.module.css';

// Swatch colours mirror what HeapStage.module.css actually paints. The max/root,
// focus, child and sift states all ride the topic accent (heaps = magenta) at
// different intensities; the parent direction borrows --color-warning; the E1
// bars contrast --color-success (cheap build) against --color-warning (costly).
const SW_MAX = 'var(--topic-accent)';
const SW_FOCUS =
	'color-mix(in srgb, var(--topic-accent) 20%, var(--surface-2))';
const SW_CHILD =
	'color-mix(in srgb, var(--topic-accent) 14%, var(--surface-2))';
const SW_PARENT =
	'color-mix(in srgb, var(--color-warning) 18%, var(--surface-2))';
const SW_SIFT = 'color-mix(in srgb, var(--topic-accent) 22%, var(--surface-2))';
const SW_BUILD = 'color-mix(in srgb, var(--color-success) 32%, transparent)';
const SW_INSERT = 'color-mix(in srgb, var(--color-warning) 32%, transparent)';

// ── Implicit-tree layout from array indices ──
//
// A heap's tree is implicit in the indices, so the layout is purely arithmetic:
// node i sits at tree-depth ⌊log2(i+1)⌋, and we spread each level evenly across
// the width. This is what makes the dual view honest — the picture is computed
// from the SAME index math the algorithm uses (2i+1, 2i+2, ⌊(i-1)/2⌋).
const NODE_R = 20;
const LEVEL_H = 74;
const TOP = 30;

const buildLayout = (values, width) => {
	const nodes = values.map((value, i) => {
		const depth = Math.floor(Math.log2(i + 1));
		const levelStart = Math.pow(2, depth) - 1; // first index on this level
		const levelCount = Math.pow(2, depth); // capacity of this level
		const posInLevel = i - levelStart;
		const slot = (posInLevel + 0.5) / levelCount;
		return {
			i,
			value,
			depth,
			x: slot * width,
			y: TOP + depth * LEVEL_H,
		};
	});
	const edges = nodes
		.filter(n => n.i > 0)
		.map(n => ({ from: nodes[parentIndex(n.i)], to: n }));
	const height = TOP + (Math.max(...nodes.map(n => n.depth)) + 1) * LEVEL_H;
	return { nodes, edges, height };
};

// The Build-vs-insert (E1) panel: two measured op-count bars side by side, so the
// O(n) vs O(n log n) gap is something the learner SEES, not just reads.
const ComparePanel = () => {
	const max = Math.max(BUILD_OPS, INSERT_OPS);
	const rows = [
		{
			id: 'build',
			label: 'Build-Max-Heap (bottom-up)',
			cost: 'Θ(n)',
			ops: BUILD_OPS,
			good: true,
		},
		{
			id: 'insert',
			label: 'Insert n times, one by one',
			cost: 'Θ(n log n)',
			ops: INSERT_OPS,
			good: false,
		},
	];
	return (
		<div
			className={styles.compare}
			role="img"
			aria-label="Build-heap versus repeated insert operation counts"
		>
			<p className={styles.compareLead}>
				Same {COMPARE_INPUT.length} elements, two strategies — measured
				operations:
			</p>
			{rows.map(row => (
				<div
					key={row.id}
					className={`${styles.compareRow} ${row.good ? styles.compareGood : styles.compareBad}`}
				>
					<div className={styles.compareHead}>
						<span className={styles.compareLabel}>{row.label}</span>
						<span className={styles.compareCost}>{row.cost}</span>
					</div>
					<div className={styles.compareTrack}>
						<div
							className={styles.compareFill}
							style={{ '--pct': `${(row.ops / max) * 100}%` }}
						/>
						<span className={styles.compareOps}>{row.ops} ops</span>
					</div>
				</div>
			))}
			<p className={styles.compareNote}>
				Bottom-up build is the cheaper one — most nodes are leaves and barely
				sink.
			</p>
		</div>
	);
};

/**
 * HeapStage — the synchronized tree↔array dual view for the Heaps scrolly.
 *
 * The binary tree and its backing array sit side by side and stay in lockstep:
 * the same node is highlighted in both, and the index arithmetic (2i+1, 2i+2,
 * ⌊(i-1)/2⌋) lights up as the story walks through it.
 *
 * Scenes (index → emphasis):
 *   0 heap-property   — reveal the heap; mark the root as the maximum.
 *   1 heap-as-array   — draw the index ribbons from a focus node to its children.
 *   2 parent-index    — light the parent-of-6 edge (the ⌊(i-1)/2⌋ direction).
 *   3 sift            — show a sift path (root→leaf) glowing on tree + array.
 *   4 extract         — spotlight the root (the next element a PQ hands back).
 *   5 build-vs-insert — swap the tree for the two measured op-count bars (E1).
 */
const HeapStage = ({
	activeScene = 0,
	interactionMode = null,
	selectedNodes = [],
	exampleNodes = [],
	answerStatus = null,
	onNodeClick,
}) => {
	const WIDTH = 460;
	const layout = useMemo(() => buildLayout(STAGE_HEAP, WIDTH), []);

	const isProperty = activeScene === 0;
	const isAsArray = activeScene === 1;
	const isParent = activeScene === 2;
	const isSift = activeScene === 3;
	const isExtract = activeScene === 4;
	const isCompare = activeScene === 5;

	// Scene 1 is the host-graded 'pair' check: the learner clicks a node and its
	// left child (the 2i+1 relation) directly on the tree. Nodes become buttons
	// only while that check is live, and the array cells mirror the selection so
	// the index relation reads in both halves of the dual view.
	const isPairScene = interactionMode === 'pair' && isAsArray;
	const selectedSet = new Set(isPairScene ? selectedNodes : []);
	const exampleSet = new Set(
		isPairScene && answerStatus === 'incorrect' ? exampleNodes : []
	);

	// Scene 1: a focus node (index 1) and its children — the 2i+1 / 2i+2 ribbon.
	// The static ribbon only draws before the learner starts selecting, so it
	// hints at the relation without colliding with their own picks.
	const focusI = 1;
	const showFocusRibbon = isAsArray && selectedSet.size === 0;
	const focusKids = showFocusRibbon
		? [leftChild(focusI), rightChild(focusI)]
		: [];

	// Scene 2: the parent-of-6 direction (the ⌊(i-1)/2⌋ floor-division).
	const parentChild = isParent ? 6 : null;
	const parentTarget = parentChild != null ? parentIndex(parentChild) : null;

	// Scene 3: a representative sift-down path on the static heap (0 → 2 → 5)
	// just to illustrate "a single root-to-leaf path". The playground shows the
	// real, computed sift; here the stage only needs to convey the shape.
	const siftPath = isSift ? [0, 2, 5] : [];

	const highlightSet = new Set();
	if (showFocusRibbon) highlightSet.add(focusI);
	// The array cells track the learner's live selection so the 2i+1 relation is
	// visible in the flat array too, not only in the tree.
	selectedSet.forEach(i => highlightSet.add(i));
	if (isParent && parentChild != null) highlightSet.add(parentChild);
	siftPath.forEach(i => highlightSet.add(i));

	// Scene-aware key: only the states this scene actually paints. Scene 3 (sift)
	// and the dual-view scenes each name their 2-3 live colours; no invented hue.
	const legend = (() => {
		switch (activeScene) {
			case 0:
				return [{ swatch: SW_MAX, label: 'maximum (A[0])', aria: 'accent' }];
			case 1:
				if (isPairScene) {
					const items = [
						{ swatch: SW_FOCUS, label: 'your selection', aria: 'accent tint' },
					];
					if (answerStatus === 'correct') {
						items.push({
							swatch: SW_MAX,
							label: 'correct pair',
							aria: 'accent',
						});
					}
					if (answerStatus === 'incorrect') {
						items.push({
							swatch: SW_CHILD,
							label: 'an i and its 2i+1',
							aria: 'accent wash',
						});
					}
					return items;
				}
				return [
					{ swatch: SW_FOCUS, label: 'node i', aria: 'accent tint' },
					{
						swatch: SW_CHILD,
						label: 'children 2i+1, 2i+2',
						aria: 'accent wash',
					},
				];
			case 2:
				return [
					{ swatch: SW_CHILD, label: 'node i', aria: 'accent' },
					{ swatch: SW_PARENT, label: 'parent ⌊(i−1)/2⌋', aria: 'amber tint' },
				];
			case 3:
				return [
					{ swatch: SW_SIFT, label: 'sift path (root → leaf)', aria: 'accent' },
				];
			case 4:
				return [
					{ swatch: SW_MAX, label: 'extract-max (A[0])', aria: 'accent' },
				];
			case 5:
				return [
					{ swatch: SW_BUILD, label: 'build Θ(n)', aria: 'green' },
					{ swatch: SW_INSERT, label: 'insert ×n Θ(n log n)', aria: 'amber' },
				];
			default:
				return [];
		}
	})();

	const caption = (() => {
		switch (activeScene) {
			case 0:
				return 'Every parent ≥ its children — so A[0] is the maximum';
			case 1:
				if (isPairScene && answerStatus === 'correct') {
					return 'Yes — the left child of i sits at 2i+1';
				}
				if (isPairScene && answerStatus === 'incorrect') {
					return 'A left child is 2i+1 — the highlighted pair is one example';
				}
				if (isPairScene) {
					return 'Click a node, then its left child (index 2i+1)';
				}
				return 'children of i → 2i+1, 2i+2 · the array IS the tree';
			case 2:
				return 'parent of i → ⌊(i−1)/2⌋ · two children, one parent';
			case 3:
				return 'A broken node repairs along one root-to-leaf path';
			case 4:
				return 'Extract-max hands back A[0], then re-settles';
			case 5:
				return 'Build is O(n); inserting n times is O(n log n)';
			default:
				return '';
		}
	})();

	return (
		<div
			className={styles.wrap}
			data-scene={activeScene}
			role="img"
			aria-label="Binary max-heap shown as a tree and its backing array, scene by scene"
		>
			{isCompare ? (
				<ComparePanel />
			) : (
				<>
					<div className={styles.notation} aria-hidden="true">
						max-heap · A[0] = {STAGE_HEAP[0]} · n = {STAGE_HEAP.length}
					</div>

					{/* ---------- Tree ---------- */}
					<svg
						viewBox={`0 0 ${WIDTH} ${layout.height}`}
						className={styles.svg}
						preserveAspectRatio="xMidYMid meet"
					>
						{layout.edges.map(edge => {
							const onParent =
								isParent &&
								edge.to.i === parentChild &&
								edge.from.i === parentTarget;
							const onKid =
								isAsArray &&
								focusKids.includes(edge.to.i) &&
								edge.from.i === focusI;
							const onSift =
								isSift &&
								siftPath.includes(edge.from.i) &&
								siftPath.includes(edge.to.i);
							const cls = [styles.edge];
							if (onParent) cls.push(styles.edgeParent);
							if (onKid) cls.push(styles.edgeChild);
							if (onSift) cls.push(styles.edgeSift);
							return (
								<line
									key={`${edge.from.i}-${edge.to.i}`}
									x1={edge.from.x}
									y1={edge.from.y}
									x2={edge.to.x}
									y2={edge.to.y}
									className={cls.join(' ')}
								/>
							);
						})}

						{layout.nodes.map((node, idx) => {
							const isMax = node.i === 0 && (isProperty || isExtract);
							const isFocus = showFocusRibbon && node.i === focusI;
							const isKid = focusKids.includes(node.i);
							const isParentNode = isParent && node.i === parentTarget;
							const isChildNode = isParent && node.i === parentChild;
							const onSift = siftPath.includes(node.i);

							// Pair-check states (scene 1, host-graded). A picked node rides the
							// focus tint; once the host marks the pair correct, both jump to the
							// strong max accent; a wrong pick reveals one correct i/2i+1 example.
							const isPicked = selectedSet.has(node.i);
							const isExample = exampleSet.has(node.i);
							const isPairCorrect = isPairScene && answerStatus === 'correct';

							const cls = [styles.node];
							if (isProperty) cls.push(styles.nodeReveal);
							if (isMax) cls.push(styles.nodeMax);
							if (isFocus) cls.push(styles.nodeFocus);
							if (isKid) cls.push(styles.nodeChild);
							if (isParentNode) cls.push(styles.nodeParent);
							if (isChildNode) cls.push(styles.nodeChild);
							if (onSift) cls.push(styles.nodeSift);
							if (isPicked)
								cls.push(isPairCorrect ? styles.nodeMax : styles.nodeFocus);
							if (isExample) cls.push(styles.nodeChild);

							const interactive = isPairScene;
							const labelRelation = `node ${node.i}, value ${node.value}`;

							return (
								<g
									key={node.i}
									transform={`translate(${node.x}, ${node.y})`}
									style={
										isProperty
											? { '--delay': `${node.depth * 90 + idx * 14}ms` }
											: undefined
									}
								>
									<circle r={NODE_R} className={cls.join(' ')} />
									<text className={styles.nodeText} textAnchor="middle" dy="5">
										{node.value}
									</text>
									<text
										className={styles.nodeIdx}
										textAnchor="middle"
										dy={NODE_R + 14}
									>
										{node.i}
									</text>
									{interactive && (
										<circle
											r={NODE_R + 4}
											className={styles.nodeHit}
											onClick={() => onNodeClick?.(node.i)}
											role="button"
											tabIndex={0}
											aria-pressed={isPicked}
											aria-label={labelRelation}
											onKeyDown={event => {
												if (event.key === 'Enter' || event.key === ' ') {
													event.preventDefault();
													onNodeClick?.(node.i);
												}
											}}
										/>
									)}
								</g>
							);
						})}
					</svg>

					{/* ---------- Backing array (the dual view) ---------- */}
					<div className={styles.arrayRow} aria-label="Backing array">
						{STAGE_HEAP.map((value, i) => {
							const cls = [styles.cell];
							if (highlightSet.has(i)) cls.push(styles.cellActive);
							if (i === 0 && (isProperty || isExtract))
								cls.push(styles.cellMax);
							// Mirror the tree's pair-check states onto the flat array.
							if (
								isPairScene &&
								answerStatus === 'correct' &&
								selectedSet.has(i)
							)
								cls.push(styles.cellMax);
							if (isPairScene && exampleSet.has(i)) cls.push(styles.cellChild);
							if (isParent && i === parentTarget) cls.push(styles.cellParent);
							return (
								<div key={i} className={styles.cellWrap}>
									<div className={cls.join(' ')}>{value}</div>
									<span className={styles.cellIdx}>{i}</span>
								</div>
							);
						})}
					</div>

					{/* Index-math ribbon (scenes 1 & 2). */}
					{(isAsArray || isParent) && (
						<div className={styles.formula} aria-hidden="true">
							{isAsArray && (
								<span>
									children of {focusI} = 2·{focusI}+1, 2·{focusI}+2 ={' '}
									<strong>
										{focusKids[0]}, {focusKids[1]}
									</strong>
								</span>
							)}
							{isParent && (
								<span>
									parent of {parentChild} = ⌊({parentChild}−1)/2⌋ ={' '}
									<strong>{parentTarget}</strong>
								</span>
							)}
						</div>
					)}
				</>
			)}

			<StateLegend items={legend} />

			<p className={styles.caption}>{caption}</p>
		</div>
	);
};

export default HeapStage;
