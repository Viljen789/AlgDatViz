import { useMemo } from 'react';
import {
	bellmanFordTrace,
	dijkstraTrace,
	formatDist,
	reconstructPath,
} from './relaxTrace.js';
import { SHARED_GRAPH, SHARED_SOURCE } from './ssspMeta.js';
import { buildEdges, projectNodes, VIEW_H, VIEW_W } from './graphLayout.js';
import styles from './ShortestPathsStage.module.css';

// Canonical answers measured once from the generators (shared by every scene).
const BF = bellmanFordTrace(SHARED_GRAPH, { source: SHARED_SOURCE });
const FINAL_DIST = BF.dist;
const FINAL_PRED = BF.pred;
const DIJ = dijkstraTrace(SHARED_GRAPH, { source: SHARED_SOURCE });
const PATH_TO_B = reconstructPath(BF.pred, SHARED_SOURCE, 'B'); // [S,C,A,B]

const NODES = projectNodes(SHARED_GRAPH.nodes);
const EDGES = buildEdges(SHARED_GRAPH.edges, NODES);

// Edge equality for the path / relax highlights.
const edgeKey = e => `${e.from}->${e.to}`;
const pathEdges = path => {
	if (!path || path.length < 2) return new Set();
	const s = new Set();
	for (let i = 0; i < path.length - 1; i++) s.add(`${path[i]}->${path[i + 1]}`);
	return s;
};
// Predecessor-tree edges (pred[v] -> v).
const predTreeEdges = pred => {
	const s = new Set();
	Object.entries(pred).forEach(([v, u]) => {
		if (u != null) s.add(`${u}->${v}`);
	});
	return s;
};

// Per-scene emphasis. Each returns the highlight sets + a dist/pred snapshot to
// render in the table. Distances build up across the three "story" snapshots so
// the picture matches what the prose claims.
const SCENE_VIEW = activeScene => {
	switch (activeScene) {
		// 0 relax — show the single relax C→A improving dist[A] from 10 to 7.
		case 0:
			return {
				dist: { S: 0, A: 7, B: formatDist(null), C: 3, D: formatDist(null) },
				pred: { S: null, A: 'C', B: null, C: 'S', D: null },
				relaxEdge: 'C->A',
				caption: 'Relax C → A: dist[C] + 4 = 7 < 10, so dist[A] = 7, pred[A] = C',
			};
		// 1 optimal substructure — the S→C→A→B path; subpath S→C→A glows.
		case 1:
			return {
				dist: FINAL_DIST,
				pred: FINAL_PRED,
				pathSet: pathEdges(PATH_TO_B),
				subpathSet: pathEdges(['S', 'C', 'A']),
				caption: 'A shortest S→B path; its S→A prefix is itself shortest',
			};
		// 2 triangle inequality — every edge satisfies dist[v] ≤ dist[u] + w.
		case 2:
			return {
				dist: FINAL_DIST,
				pred: FINAL_PRED,
				treeSet: predTreeEdges(FINAL_PRED),
				caption: 'Converged: no edge has dist[u] + w < dist[v]',
			};
		// 3 Bellman-Ford — relax ALL edges (every edge lit as "the schedule").
		case 3:
			return {
				dist: FINAL_DIST,
				pred: FINAL_PRED,
				allEdges: true,
				caption: 'Bellman-Ford relaxes every edge, |V|−1 times',
			};
		// 4 DAG-SP — relax in topological order; show the order.
		case 4:
			return {
				dist: FINAL_DIST,
				pred: FINAL_PRED,
				treeSet: predTreeEdges(FINAL_PRED),
				order: ['S', 'C', 'A', 'D', 'B'],
				caption: 'DAG-SP relaxes out-edges in topological order, once',
			};
		// 5 Dijkstra — settle order by increasing distance.
		case 5:
			return {
				dist: FINAL_DIST,
				pred: FINAL_PRED,
				treeSet: predTreeEdges(FINAL_PRED),
				settleOrder: ['S', 'C', 'D', 'A', 'B'],
				caption: 'Dijkstra settles vertices in increasing distance',
			};
		// 6 why non-negative — spotlight that the same Relax underlies all three.
		case 6:
			return {
				dist: FINAL_DIST,
				pred: FINAL_PRED,
				treeSet: predTreeEdges(FINAL_PRED),
				caption: 'Same Relax — Dijkstra alone needs non-negative weights',
			};
		// 7 predecessor subgraph — the pred tree + reconstructed path to B.
		case 7:
		default:
			return {
				dist: FINAL_DIST,
				pred: FINAL_PRED,
				treeSet: predTreeEdges(FINAL_PRED),
				pathSet: pathEdges(PATH_TO_B),
				caption: `pred tree rooted at S · path to B = ${PATH_TO_B.join(' → ')}`,
			};
	}
};

const NODE_R = 6;

/**
 * ShortestPathsStage — the synchronized graph + dist/pred table for the SSSP
 * scrolly. The Relax primitive is the spine: scene 0 shows one relax improving a
 * distance, and the later scenes reveal Bellman-Ford / DAG-SP / Dijkstra as
 * different *orders* of that same move, always against the same dist[]/pred[]
 * table so the unity is visible.
 */
const ShortestPathsStage = ({ activeScene = 0 }) => {
	const view = useMemo(() => SCENE_VIEW(activeScene), [activeScene]);
	const ids = SHARED_GRAPH.nodes.map(n => n.id);

	const relaxEdge = view.relaxEdge;
	const pathSet = view.pathSet || new Set();
	const subpathSet = view.subpathSet || new Set();
	const treeSet = view.treeSet || new Set();
	const allEdges = Boolean(view.allEdges);

	// Which node is the relax target (gets a glow) for scene 0.
	const relaxTarget = relaxEdge ? relaxEdge.split('->')[1] : null;

	return (
		<div
			className={styles.wrap}
			data-scene={activeScene}
			role="img"
			aria-label="Weighted directed graph with a live distance and predecessor table, scene by scene"
		>
			<div className={styles.notation} aria-hidden="true">
				source = {SHARED_SOURCE} · weighted digraph · |V| = {ids.length}
			</div>

			<div className={styles.layout}>
				{/* ---------- Graph ---------- */}
				<svg
					viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
					className={styles.svg}
					preserveAspectRatio="xMidYMid meet"
				>
					<defs>
						<marker
							id="ssspArrow"
							viewBox="0 0 10 10"
							refX="8"
							refY="5"
							markerWidth="5"
							markerHeight="5"
							orient="auto-start-reverse"
						>
							<path d="M 0 1 L 9 5 L 0 9 z" className={styles.arrowHead} />
						</marker>
						<marker
							id="ssspArrowHot"
							viewBox="0 0 10 10"
							refX="8"
							refY="5"
							markerWidth="5"
							markerHeight="5"
							orient="auto-start-reverse"
						>
							<path d="M 0 1 L 9 5 L 0 9 z" className={styles.arrowHeadHot} />
						</marker>
					</defs>

					{EDGES.map(edge => {
						const key = edgeKey(edge);
						const isRelax = relaxEdge === key;
						const isPath = pathSet.has(key);
						const isSub = subpathSet.has(key);
						const isTree = treeSet.has(key);
						const hot = isRelax || isPath || isSub || isTree || allEdges;
						const cls = [styles.edge];
						if (allEdges) cls.push(styles.edgeAll);
						if (isTree) cls.push(styles.edgeTree);
						if (isPath) cls.push(styles.edgePath);
						if (isSub) cls.push(styles.edgeSub);
						if (isRelax) cls.push(styles.edgeRelax);
						return (
							<g key={key}>
								<line
									x1={edge.x1}
									y1={edge.y1}
									x2={edge.x2}
									y2={edge.y2}
									className={cls.join(' ')}
									markerEnd={`url(#${hot ? 'ssspArrowHot' : 'ssspArrow'})`}
								/>
								<text
									x={edge.mx}
									y={edge.my}
									className={`${styles.weight} ${
										isRelax ? styles.weightHot : ''
									}`}
									textAnchor="middle"
									dominantBaseline="central"
								>
									{edge.weight}
								</text>
							</g>
						);
					})}

					{NODES.map(node => {
						const isSource = node.id === SHARED_SOURCE;
						const isRelaxTarget = node.id === relaxTarget;
						const cls = [styles.node];
						if (isSource) cls.push(styles.nodeSource);
						if (isRelaxTarget) cls.push(styles.nodeRelax);
						return (
							<g key={node.id} transform={`translate(${node.px}, ${node.py})`}>
								<circle r={NODE_R} className={cls.join(' ')} />
								<text
									className={styles.nodeText}
									textAnchor="middle"
									dominantBaseline="central"
								>
									{node.id}
								</text>
							</g>
						);
					})}
				</svg>

				{/* ---------- dist[] / pred[] table (the spine) ---------- */}
				<div className={styles.tableWrap}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th scope="col">v</th>
								<th scope="col">dist</th>
								<th scope="col">pred</th>
							</tr>
						</thead>
						<tbody>
							{ids.map(id => {
								const d = view.dist[id];
								const p = view.pred[id];
								const isTarget = id === relaxTarget;
								return (
									<tr
										key={id}
										className={isTarget ? styles.rowActive : ''}
									>
										<th scope="row" className={styles.rowKey}>
											{id}
										</th>
										<td className={styles.rowVal}>
											{d === null || d === undefined ? '∞' : d}
										</td>
										<td className={styles.rowPred}>{p ?? '—'}</td>
									</tr>
								);
							})}
						</tbody>
					</table>

					{view.order && (
						<div className={styles.orderRow}>
							<span className={styles.orderLabel}>topo order</span>
							<span className={styles.orderSeq}>{view.order.join(' → ')}</span>
						</div>
					)}
					{view.settleOrder && (
						<div className={styles.orderRow}>
							<span className={styles.orderLabel}>settle order</span>
							<span className={styles.orderSeq}>
								{view.settleOrder.join(' → ')}
							</span>
						</div>
					)}
				</div>
			</div>

			<p className={styles.caption}>{view.caption}</p>
		</div>
	);
};

export default ShortestPathsStage;
