// MstGraph — a reusable, read-only SVG renderer for the shared weighted graph.
//
// Hand-rolled SVG (no new libs): vertices at their fixed layout positions, edges
// drawn as weighted line segments with a weight pill at the midpoint. The caller
// passes per-edge and per-node visual states (highlight sets) so the SAME
// component drives both the teaching stage and the playground in lockstep.
//
// All emphasis is expressed through CSS-module classes that resolve to design
// tokens; this file never names a colour.

import { edgeId } from './mstTrace.js';
import { MST_NODES, NODE_POS } from './mstMeta.js';
import styles from './MstGraph.module.css';

const VIEW = 100; // the layout positions live in a 0..100 square

// Resolve the edge class from the supplied state sets (first match wins, so the
// strongest semantic — the light/considered edge — overrides duller ones).
const edgeClassFor = (id, sets) => {
	const cls = [styles.edge];
	if (sets.tree?.has(id)) cls.push(styles.edgeTree);
	if (sets.frontier?.has(id)) cls.push(styles.edgeFrontier);
	if (sets.rejected?.has(id)) cls.push(styles.edgeRejected);
	if (sets.light?.has(id)) cls.push(styles.edgeLight);
	if (sets.consider?.has(id)) cls.push(styles.edgeConsider);
	return cls.join(' ');
};

const nodeSideClass = (id, cutSets) => {
	if (cutSets?.inside?.has(id)) return styles.nodeInside;
	if (cutSets?.outside?.has(id)) return styles.nodeOutside;
	return '';
};

/**
 * MstGraph
 * @param {Array<{u,v,w,id?}>} edges  edges to draw (normalised or raw).
 * @param {object} edgeSets  { tree, frontier, rejected, light, consider } Sets of edge ids.
 * @param {object} nodeSets  { tree } Set of vertex ids inside the growing tree.
 * @param {object} cutSets   { inside, outside } Sets of vertex ids — when present,
 *                           a dashed boundary is implied and the sides are tinted.
 * @param {string} className extra root class.
 */
const MstGraph = ({
	edges,
	edgeSets = {},
	nodeSets = {},
	cutSets = null,
	className = '',
}) => {
	const treeNodes = nodeSets.tree || new Set();

	return (
		<svg
			viewBox={`0 0 ${VIEW} ${VIEW}`}
			className={`${styles.svg} ${className}`}
			preserveAspectRatio="xMidYMid meet"
			role="img"
			aria-label="Weighted graph"
		>
			{/* Edges first so nodes sit on top. */}
			{edges.map(e => {
				const id = e.id || edgeId(e.u, e.v);
				const a = NODE_POS[e.u];
				const b = NODE_POS[e.v];
				if (!a || !b) return null;
				const mx = (a.x + b.x) / 2;
				const my = (a.y + b.y) / 2;
				const isStrong =
					edgeSets.light?.has(id) ||
					edgeSets.consider?.has(id) ||
					edgeSets.tree?.has(id);
				return (
					<g key={id}>
						<line
							x1={a.x}
							y1={a.y}
							x2={b.x}
							y2={b.y}
							className={edgeClassFor(id, edgeSets)}
						/>
						<g transform={`translate(${mx}, ${my})`}>
							<circle
								r={4.4}
								className={`${styles.weightPill} ${
									isStrong ? styles.weightPillStrong : ''
								}`}
							/>
							<text
								className={styles.weightText}
								textAnchor="middle"
								dy="2.2"
							>
								{e.w}
							</text>
						</g>
					</g>
				);
			})}

			{/* Vertices */}
			{MST_NODES.map(n => {
				const inTree = treeNodes.has(n.id);
				const cls = [styles.node];
				if (inTree) cls.push(styles.nodeTree);
				const sideCls = nodeSideClass(n.id, cutSets);
				if (sideCls) cls.push(sideCls);
				return (
					<g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
						<circle r={6.5} className={cls.join(' ')} />
						<text className={styles.nodeText} textAnchor="middle" dy="2.4">
							{n.id}
						</text>
					</g>
				);
			})}
		</svg>
	);
};

export default MstGraph;
