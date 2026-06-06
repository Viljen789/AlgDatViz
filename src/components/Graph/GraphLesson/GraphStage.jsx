import { useMemo } from 'react';
import { LESSON_GRAPH, BFS_ORDER, DFS_ORDER } from './graphScenes.js';
import styles from './GraphStage.module.css';

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
// drives the highlight. Earlier scenes show structure only. Scene indices match
// SCENES in graphScenes.js:
//   2 frontier · 3 bfs · 4 bfs-order (recall, shows full BFS) · 5 dfs
const traversalFor = activeScene => {
	if (activeScene === 2) return { order: BFS_ORDER, count: 1 }; // just A marked
	if (activeScene === 3 || activeScene === 4)
		return { order: BFS_ORDER, count: BFS_ORDER.length };
	if (activeScene === 5) return { order: DFS_ORDER, count: DFS_ORDER.length };
	return { order: [], count: 0 };
};

const GraphStage = ({ activeScene = 0 }) => {
	const adjacency = useMemo(buildAdjacency, []);
	const showMatrix = activeScene === 1;
	const { order, count } = traversalFor(activeScene);

	// Visit-order index per node (1-based) for the highlighted prefix.
	const visitIndex = useMemo(() => {
		const map = new Map();
		order.slice(0, count).forEach((id, i) => map.set(id, i + 1));
		return map;
	}, [order, count]);

	// The current frontier (next candidates) at scene 2: A is marked, B & C wait.
	const frontier = useMemo(() => {
		if (activeScene !== 2) return new Set();
		const f = new Set();
		(adjacency.get('A') || []).forEach(n => f.add(n));
		return f;
	}, [activeScene, adjacency]);

	const isTraversalScene = activeScene >= 2;
	const traversalLabel =
		activeScene === 3 || activeScene === 4
			? 'BFS · queue'
			: activeScene === 5
				? 'DFS · stack'
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

	const matrixIds = LESSON_GRAPH.nodes.map(n => n.id);
	const hasEdge = (a, b) => (adjacency.get(a) || []).includes(b);

	return (
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
				<g className={styles.edges}>{LESSON_GRAPH.edges.map(renderEdge)}</g>
				<g>{LESSON_GRAPH.nodes.map(renderNode)}</g>
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
					<span className={styles.traversalOrder}>
						{order.join(' → ')}
					</span>
				</div>
			)}

			<div className={styles.notation} aria-hidden="true">
				V = {LESSON_GRAPH.nodes.length} · E = {LESSON_GRAPH.edges.length}
			</div>
		</div>
	);
};

export default GraphStage;
