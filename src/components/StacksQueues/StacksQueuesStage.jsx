import { SEQUENCE } from './scenes.js';
import { SceneNarration } from '../../common/PlaybackEngine';
import styles from './StacksQueuesStage.module.css';

// The scrolly stage. It is driven entirely by `activeScene` so it stays in
// lockstep with the prose:
//   0 (why)       — both disciplines side by side, neutral, as an overview.
//   1 (stack)     — the stack pile, newest on top, top highlighted.
//   2 (queue)     — the queue lane, front and rear marked.
//   3 (traversal) — DFS (stack) vs BFS (queue) frontier on the same tiny graph.
//
// All motion is CSS-token driven and respects prefers-reduced-motion. No
// playback here — this is conceptual scaffolding before the playground.

const StackPile = ({ active }) => (
	<div
		className={`${styles.discipline} ${active ? styles.disciplineActive : ''}`}
	>
		<div className={styles.disciplineHead}>
			<span className={styles.disciplineName}>Stack</span>
			<span className={styles.disciplineAcronym}>LIFO</span>
		</div>
		<div className={styles.stackPile}>
			{[...SEQUENCE].reverse().map((value, idx) => {
				const isTop = idx === 0;
				return (
					<div
						key={value}
						className={`${styles.cell} ${styles.stackCell} ${
							isTop ? styles.cellTop : ''
						}`}
						style={{ '--enter-delay': `${idx * 70}ms` }}
					>
						<span className={styles.cellLabel}>{value}</span>
						{isTop && <span className={styles.anchor}>top</span>}
					</div>
				);
			})}
			<div className={styles.stackFloor} aria-hidden="true">
				bottom
			</div>
		</div>
		<p className={styles.flow}>
			push &amp; pop both touch the <strong>top</strong>
		</p>
	</div>
);

const QueueLane = ({ active }) => (
	<div
		className={`${styles.discipline} ${active ? styles.disciplineActive : ''}`}
	>
		<div className={styles.disciplineHead}>
			<span className={styles.disciplineName}>Queue</span>
			<span className={styles.disciplineAcronym}>FIFO</span>
		</div>
		<div className={styles.queueLane}>
			<span className={styles.endLabel}>front</span>
			<div className={styles.queueTrack}>
				{SEQUENCE.map((value, idx) => {
					const isFront = idx === 0;
					const isRear = idx === SEQUENCE.length - 1;
					return (
						<div
							key={value}
							className={`${styles.cell} ${styles.queueCell} ${
								isFront ? styles.cellFront : ''
							} ${isRear ? styles.cellRear : ''}`}
							style={{ '--enter-delay': `${idx * 70}ms` }}
						>
							<span className={styles.cellLabel}>{value}</span>
							{isFront && <span className={styles.anchor}>front</span>}
							{isRear && !isFront && (
								<span className={styles.anchor}>rear</span>
							)}
						</div>
					);
				})}
			</div>
			<span className={styles.endLabel}>rear</span>
		</div>
		<p className={styles.flow}>
			enqueue at the <strong>rear</strong>, dequeue at the{' '}
			<strong>front</strong>
		</p>
	</div>
);

// A tiny fixed graph (root 1, children 2 & 3, grandchildren 4–7) with the visit
// order each discipline produces. Numbers double as the visit-step badges.
const DFS_ORDER = [1, 2, 4, 5, 3, 6, 7];
const BFS_ORDER = [1, 2, 3, 4, 5, 6, 7];

const NODES = {
	1: { cx: 100, cy: 28 },
	2: { cx: 56, cy: 78 },
	3: { cx: 144, cy: 78 },
	4: { cx: 34, cy: 128 },
	5: { cx: 78, cy: 128 },
	6: { cx: 122, cy: 128 },
	7: { cx: 166, cy: 128 },
};
const EDGES = [
	[1, 2],
	[1, 3],
	[2, 4],
	[2, 5],
	[3, 6],
	[3, 7],
];

const TraversalGraph = ({ order, label, acronym, structure }) => (
	<div className={styles.traversalCard}>
		<div className={styles.disciplineHead}>
			<span className={styles.disciplineName}>{label}</span>
			<span className={styles.disciplineAcronym}>{acronym}</span>
		</div>
		<svg
			viewBox="0 0 200 156"
			className={styles.graphSvg}
			role="img"
			aria-label={`${label} visit order on a small tree, using a ${structure}`}
		>
			{EDGES.map(([a, b]) => (
				<line
					key={`${a}-${b}`}
					x1={NODES[a].cx}
					y1={NODES[a].cy}
					x2={NODES[b].cx}
					y2={NODES[b].cy}
					className={styles.graphEdge}
				/>
			))}
			{Object.entries(NODES).map(([id, { cx, cy }]) => {
				const step = order.indexOf(Number(id)) + 1;
				return (
					<g key={id}>
						<circle cx={cx} cy={cy} r="13" className={styles.graphNode} />
						<text x={cx} y={cy} className={styles.graphStep}>
							{step}
						</text>
					</g>
				);
			})}
		</svg>
		<p className={styles.traversalOrder}>
			<span className={styles.traversalOrderLabel}>via {structure}:</span>{' '}
			{order.join(' → ')}
		</p>
	</div>
);

const StacksQueuesStage = ({ activeScene = 0 }) => {
	const showStack = activeScene === 0 || activeScene === 1;
	const showQueue = activeScene === 0 || activeScene === 2;
	const isTraversal = activeScene === 3;

	// Per-scene narration for screen readers — the honest WHY each scene paints, so
	// the swapped figure is re-announced as the reader scrolls.
	const sceneNarration = [
		'Stacks and queues side by side: both are O(1) at one end, they differ in which end.',
		'A stack is LIFO: push and pop both touch the top.',
		'A queue is FIFO: enqueue at the rear, dequeue at the front.',
		`Same tree: depth-first (a stack) visits ${DFS_ORDER.join(' → ')}; breadth-first (a queue) visits ${BFS_ORDER.join(' → ')}.`,
	][Math.min(activeScene, 3)];

	return (
		<>
			{/* Per-scene narration for screen readers, announcing each scene as the
			    sticky figure swaps (role=group does not auto-announce on change). */}
			<SceneNarration>{sceneNarration}</SceneNarration>
			<div
				className={styles.wrap}
				data-scene={activeScene}
				role="group"
				aria-label="Stacks and queues concept visualization"
			>
				{isTraversal ? (
					<div className={styles.traversalGrid}>
						<TraversalGraph
							order={DFS_ORDER}
							label="Depth-first"
							acronym="DFS"
							structure="stack"
						/>
						<TraversalGraph
							order={BFS_ORDER}
							label="Breadth-first"
							acronym="BFS"
							structure="queue"
						/>
					</div>
				) : (
					<div
						className={`${styles.disciplineGrid} ${
							activeScene === 0 ? styles.disciplineGridBoth : ''
						}`}
					>
						{showStack && <StackPile active={activeScene === 1} />}
						{showQueue && <QueueLane active={activeScene === 2} />}
					</div>
				)}

				<div className={styles.notation} aria-hidden="true">
					O(1) · push · pop · enqueue · dequeue
				</div>
			</div>
		</>
	);
};

export default StacksQueuesStage;
