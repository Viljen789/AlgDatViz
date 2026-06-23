import { useMemo } from 'react';
import {
	LESSON_GRAPH,
	BFS_ORDER,
	DFS_ORDER,
	TOPO_GRAPH,
	TOPO_ORDER,
	TOPO_SOURCE,
	TOPO_NEXT,
} from './graphScenes.js';
import StateLegend from '../../../common/StateLegend/StateLegend';
import { SceneNarration } from '../../../common/PlaybackEngine';
import styles from './GraphStage.module.css';

// Scene indices, named so a future scene insertion can't silently desync this
// stage's index branches from the SCENES array (a stepProbe scene inserted at
// index 4 once shifted every later scene by one). These MUST mirror the order of
// SCENES in graphScenes.js:
//   0 nodes-edges · 1 representations · 2 frontier · 3 bfs · 4 bfs-probe
//   5 bfs-order · 6 dfs · 7 one-frontier · 8 topo-sort · 9 topo-next
const SCENE = {
	REPRESENTATIONS: 1,
	FRONTIER: 2,
	BFS: 3,
	BFS_PROBE: 4,
	BFS_ORDER: 5,
	DFS: 6,
	ONE_FRONTIER: 7,
	TOPO_SORT: 8,
	TOPO_NEXT: 9,
};
// The scenes that paint the full BFS picture (the BFS run, the frozen-frame probe,
// the recall, and the one-frontier thesis all illustrate the SAME BFS spread).
const BFS_SCENES = new Set([
	SCENE.BFS,
	SCENE.BFS_PROBE,
	SCENE.BFS_ORDER,
	SCENE.ONE_FRONTIER,
]);
// The two directed-DAG scenes share the topological-sort visualization.
const TOPO_SCENES = new Set([SCENE.TOPO_SORT, SCENE.TOPO_NEXT]);

// The traversal scenes paint nodes with meaningful colour; the key names only
// the states that scene actually shows. Swatches mirror GraphStage's node
// styling: a visited node fills with --topic-accent, the frontier (scene 2)
// is the dashed --topic-graphs-wash. The structure-only scenes (0, 1) have no
// coloured state, so they carry no legend.
const VISITED_SWATCH = 'var(--topic-accent)';
const FRONTIER_SWATCH = 'var(--topic-graphs-wash)';

const sceneLegend = activeScene => {
	if (activeScene === SCENE.FRONTIER)
		return [
			{ label: 'visited', swatch: VISITED_SWATCH, aria: 'filled' },
			{ label: 'frontier (next up)', swatch: FRONTIER_SWATCH, aria: 'dashed' },
		];
	if (BFS_SCENES.has(activeScene))
		return [
			{ label: 'visited in BFS order', swatch: VISITED_SWATCH, aria: 'filled' },
		];
	if (activeScene === SCENE.DFS)
		return [
			{ label: 'visited in DFS order', swatch: VISITED_SWATCH, aria: 'filled' },
		];
	if (TOPO_SCENES.has(activeScene))
		return [
			{
				label: 'placed in topological order',
				swatch: VISITED_SWATCH,
				aria: 'filled',
			},
		];
	return [];
};

// Stage geometry. The graph is laid out in a fixed coordinate space so the
// nodes never move between scenes — only their highlight state changes as the
// concept advances. The parent constrains the rendered size.
const NODE_R = 19;
const VIEW_W = 460;
const VIEW_H = 220;

const nodeById = id => LESSON_GRAPH.nodes.find(n => n.id === id);

// Undirected adjacency, alphabetically sorted (matches the algorithm utils).
const buildAdjacency = () => {
	const adj = new Map(LESSON_GRAPH.nodes.map(n => [n.id, []]));
	LESSON_GRAPH.edges.forEach(({ from, to }) => {
		adj.get(from)?.push(to);
		adj.get(to)?.push(from);
	});
	adj.forEach(list => list.sort());
	return adj;
};

// How many nodes are "visited" by the active scene, and which traversal order
// drives the highlight. Earlier scenes show structure only. Scene indices are
// named in SCENE above and mirror SCENES in graphScenes.js.
//
// The topo-next scene is a PREDICT-before-reveal beat: while its prediction is
// pending (holdReveal), the figure numbers ONLY the already-emitted source, so the
// picture can't spoil "which vertex comes next?". Once answered, holdReveal clears
// and the full topological numbering reveals — the same picture the topo-sort
// scene shows.
const traversalFor = (activeScene, holdReveal = false) => {
	if (activeScene === SCENE.FRONTIER) return { order: BFS_ORDER, count: 1 }; // just A marked
	if (BFS_SCENES.has(activeScene))
		return { order: BFS_ORDER, count: BFS_ORDER.length };
	if (activeScene === SCENE.DFS)
		return { order: DFS_ORDER, count: DFS_ORDER.length };
	// The topo scenes paint the DAG's nodes 1..n in topological order, so the
	// numbered badges read left-to-right as the line every arrow respects.
	if (activeScene === SCENE.TOPO_NEXT && holdReveal)
		return { order: TOPO_ORDER, count: 1 }; // only the source emitted so far
	if (TOPO_SCENES.has(activeScene))
		return { order: TOPO_ORDER, count: TOPO_ORDER.length };
	return { order: [], count: 0 };
};

// The topo scenes swap the undirected LESSON_GRAPH for the directed DAG and draw
// arrowheads. Every other scene keeps the undirected rendering.
const TOPO_NODE_BY_ID = id => TOPO_GRAPH.nodes.find(n => n.id === id);

// holdReveal is the template's opt-in reveal gate: true while the topo-next
// predict beat is still unanswered, so the stage withholds the to-be-predicted
// numbering (the picture must not spoil the prediction).
const GraphStage = ({ activeScene = 0, holdReveal = false }) => {
	const adjacency = useMemo(buildAdjacency, []);
	const showMatrix = activeScene === SCENE.REPRESENTATIONS;
	const { order, count } = traversalFor(activeScene, holdReveal);

	// Visit-order index per node (1-based) for the highlighted prefix.
	const visitIndex = useMemo(() => {
		const map = new Map();
		order.slice(0, count).forEach((id, i) => map.set(id, i + 1));
		return map;
	}, [order, count]);

	// The current frontier (next candidates) at the frontier scene: A is marked,
	// B & C wait.
	const frontier = useMemo(() => {
		if (activeScene !== SCENE.FRONTIER) return new Set();
		const f = new Set();
		(adjacency.get('A') || []).forEach(n => f.add(n));
		return f;
	}, [activeScene, adjacency]);

	// The topo scenes render the directed DAG (with arrowheads) instead of the
	// undirected LESSON_GRAPH. isTraversalScene stays true for the shared
	// colour/order badges, but the frontier overlay never fires (gated to the
	// frontier scene only).
	const isTopo = TOPO_SCENES.has(activeScene);
	const isTraversalScene = activeScene >= SCENE.FRONTIER;
	const traversalLabel =
		activeScene === SCENE.BFS ||
		activeScene === SCENE.BFS_PROBE ||
		activeScene === SCENE.BFS_ORDER
			? 'BFS · queue'
			: activeScene === SCENE.DFS
				? 'DFS · stack'
				: activeScene === SCENE.ONE_FRONTIER
					? 'one loop · swap the frontier'
					: isTopo
						? 'topological order'
						: null;

	const renderEdge = ({ from, to }) => {
		const a = nodeById(from);
		const b = nodeById(to);
		if (!a || !b) return null;
		// An edge is "on the path" once both endpoints are visited and adjacent
		// in the traversal order — a light tree-edge hint for the traversal scenes.
		const ai = visitIndex.get(from);
		const bi = visitIndex.get(to);
		const onPath =
			isTraversalScene &&
			ai != null &&
			bi != null &&
			(order[ai - 1] === from || order[bi - 1] === to);
		return (
			<line
				key={`${from}-${to}`}
				x1={a.x}
				y1={a.y}
				x2={b.x}
				y2={b.y}
				className={`${styles.edge} ${onPath ? styles.edgePath : ''}`}
			/>
		);
	};

	const renderNode = node => {
		const idx = visitIndex.get(node.id);
		const isVisited = idx != null;
		const isFrontier = frontier.has(node.id);
		const isStart = isTraversalScene && node.id === 'A';

		let circleClass = styles.node;
		if (isVisited) circleClass = `${styles.node} ${styles.nodeVisited}`;
		else if (isFrontier) circleClass = `${styles.node} ${styles.nodeFrontier}`;

		return (
			<g key={node.id} className={styles.nodeGroup}>
				<circle cx={node.x} cy={node.y} r={NODE_R} className={circleClass} />
				<text
					x={node.x}
					y={node.y}
					className={`${styles.nodeText} ${isVisited ? styles.nodeTextVisited : ''}`}
					textAnchor="middle"
					dy="0.34em"
				>
					{node.label}
				</text>
				{isVisited && (
					<text
						x={node.x + NODE_R - 2}
						y={node.y - NODE_R + 4}
						className={styles.order}
						textAnchor="middle"
						dy="0.34em"
					>
						{idx}
					</text>
				)}
				{isStart && !isVisited && (
					<text
						x={node.x}
						y={node.y - NODE_R - 7}
						className={styles.startTag}
						textAnchor="middle"
					>
						start
					</text>
				)}
			</g>
		);
	};

	// Directed edge for the topo scene: a line that stops at the target node's rim
	// (so the arrowhead marker sits just outside the circle, not buried under it)
	// and carries an arrowhead pointing forward — the visible "u before v".
	const renderTopoEdge = ({ from, to }) => {
		const a = TOPO_NODE_BY_ID(from);
		const b = TOPO_NODE_BY_ID(to);
		if (!a || !b) return null;
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const len = Math.hypot(dx, dy) || 1;
		const ux = dx / len;
		const uy = dy / len;
		// Pull both ends in to the circle rim; leave a touch extra at the head so the
		// marker tip lands cleanly at the node border.
		const x1 = a.x + ux * NODE_R;
		const y1 = a.y + uy * NODE_R;
		const x2 = b.x - ux * (NODE_R + 6);
		const y2 = b.y - uy * (NODE_R + 6);
		return (
			<line
				key={`${from}-${to}`}
				x1={x1}
				y1={y1}
				x2={x2}
				y2={y2}
				className={styles.edge}
				markerEnd="url(#topoArrow)"
			/>
		);
	};

	// Topo node: numbered 1..n in topological order (the same visitIndex machinery
	// the traversal scenes use), with the unique in-degree-0 source tagged.
	const renderTopoNode = node => {
		const idx = visitIndex.get(node.id);
		const isVisited = idx != null;
		const isSource = node.id === TOPO_SOURCE;
		const circleClass = isVisited
			? `${styles.node} ${styles.nodeVisited}`
			: styles.node;
		return (
			<g key={node.id} className={styles.nodeGroup}>
				<circle cx={node.x} cy={node.y} r={NODE_R} className={circleClass} />
				<text
					x={node.x}
					y={node.y}
					className={`${styles.nodeText} ${isVisited ? styles.nodeTextVisited : ''}`}
					textAnchor="middle"
					dy="0.34em"
				>
					{node.label}
				</text>
				{isVisited && (
					<text
						x={node.x + NODE_R - 2}
						y={node.y - NODE_R + 4}
						className={styles.order}
						textAnchor="middle"
						dy="0.34em"
					>
						{idx}
					</text>
				)}
				{isSource && (
					<text
						x={node.x}
						y={node.y - NODE_R - 7}
						className={styles.startTag}
						textAnchor="middle"
					>
						source
					</text>
				)}
			</g>
		);
	};

	const matrixIds = LESSON_GRAPH.nodes.map(n => n.id);
	const hasEdge = (a, b) => (adjacency.get(a) || []).includes(b);

	const legend = useMemo(() => sceneLegend(activeScene), [activeScene]);

	// Per-scene narration for screen readers — the honest WHY the figure paints
	// (the same visit order it numbers on the nodes), spoken instead of frozen into
	// the figure's one static aria-label.
	const sceneNarration = (() => {
		if (activeScene === 0)
			return `A graph: ${LESSON_GRAPH.nodes.length} vertices joined by ${LESSON_GRAPH.edges.length} edges.`;
		if (activeScene === SCENE.REPRESENTATIONS)
			return 'The same graph as an adjacency list and an adjacency matrix.';
		if (activeScene === SCENE.FRONTIER)
			return `Start at A; its unvisited neighbors ${[...frontier].sort().join(' and ')} form the frontier.`;
		if (BFS_SCENES.has(activeScene) && activeScene !== SCENE.ONE_FRONTIER)
			return `Breadth-first from A visits nodes in the order ${BFS_ORDER.join(' → ')}.`;
		if (activeScene === SCENE.DFS)
			return `Depth-first from A visits nodes in the order ${DFS_ORDER.join(' → ')}.`;
		if (activeScene === SCENE.ONE_FRONTIER)
			return 'BFS and DFS are one loop; swapping the frontier (queue vs stack) is the only change.';
		if (activeScene === SCENE.TOPO_SORT)
			return `A directed acyclic graph; a topological order places its nodes as ${TOPO_ORDER.join(' → ')}, so every arrow points forward from ${TOPO_SOURCE}.`;
		if (activeScene === SCENE.TOPO_NEXT)
			return holdReveal
				? `Kahn's algorithm has emitted the source ${TOPO_SOURCE}; predict which vertex it emits next.`
				: `After ${TOPO_SOURCE}, Kahn's algorithm emits ${TOPO_NEXT} next; the full topological order is ${TOPO_ORDER.join(' → ')}.`;
		return 'Graph concept visualization.';
	})();

	return (
		<>
			{/* Per-scene narration for screen readers, OUTSIDE the role=img figure
			    below (whose visual order badges collapse into one static label). */}
			<SceneNarration>{sceneNarration}</SceneNarration>
			<div
				className={styles.wrap}
				data-scene={activeScene}
				role="img"
				aria-label="Graph concept visualization"
			>
				<svg
					viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
					className={styles.svg}
					preserveAspectRatio="xMidYMid meet"
				>
					{/* Arrowhead for the directed (topo) scene only. Auto-orients along
					    each edge and inherits the edge stroke colour via context-stroke. */}
					<defs>
						<marker
							id="topoArrow"
							viewBox="0 0 10 10"
							refX="8"
							refY="5"
							markerWidth="7"
							markerHeight="7"
							orient="auto-start-reverse"
						>
							<path d="M0,0 L10,5 L0,10 z" className={styles.arrowHead} />
						</marker>
					</defs>
					{isTopo ? (
						<>
							<g className={styles.edges}>
								{TOPO_GRAPH.edges.map(renderTopoEdge)}
							</g>
							<g>{TOPO_GRAPH.nodes.map(renderTopoNode)}</g>
						</>
					) : (
						<>
							<g className={styles.edges}>
								{LESSON_GRAPH.edges.map(renderEdge)}
							</g>
							<g>{LESSON_GRAPH.nodes.map(renderNode)}</g>
						</>
					)}
				</svg>

				{/* Representation panels (scene 1): list + matrix side by side. */}
				<div
					className={`${styles.repr} ${showMatrix ? styles.reprShow : ''}`}
					aria-hidden={!showMatrix}
				>
					<div className={styles.reprPanel}>
						<span className={styles.reprTitle}>Adjacency list</span>
						<ul className={styles.list}>
							{matrixIds.map(id => (
								<li key={id} className={styles.listRow}>
									<span className={styles.listKey}>{id}</span>
									<span className={styles.listVals}>
										{(adjacency.get(id) || []).join(' ') || '—'}
									</span>
								</li>
							))}
						</ul>
					</div>
					<div className={styles.reprPanel}>
						<span className={styles.reprTitle}>Adjacency matrix</span>
						<table className={styles.matrix}>
							<thead>
								<tr>
									<th aria-hidden="true" />
									{matrixIds.map(id => (
										<th key={id} scope="col">
											{id}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{matrixIds.map(rowId => (
									<tr key={rowId}>
										<th scope="row">{rowId}</th>
										{matrixIds.map(colId => (
											<td
												key={colId}
												className={hasEdge(rowId, colId) ? styles.cellOn : ''}
											>
												{hasEdge(rowId, colId) ? 1 : 0}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{traversalLabel && (
					<div className={styles.traversalTag} aria-hidden="true">
						{traversalLabel}
						<span className={styles.traversalOrder}>{order.join(' → ')}</span>
					</div>
				)}

				{legend.length > 0 && (
					<StateLegend className={styles.legend} items={legend} />
				)}

				<div className={styles.notation} aria-hidden="true">
					V = {(isTopo ? TOPO_GRAPH : LESSON_GRAPH).nodes.length} · E ={' '}
					{(isTopo ? TOPO_GRAPH : LESSON_GRAPH).edges.length}
				</div>
			</div>
		</>
	);
};

export default GraphStage;
