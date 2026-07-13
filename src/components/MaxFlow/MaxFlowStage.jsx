import { useMemo } from 'react';
import { buildResidual, edgeKey } from './maxFlowTrace.js';
import { SCENES, selectViewForScene } from './scenes.js';
import { buildEdges, projectNodes, VIEW_H, VIEW_W } from './graphLayout.js';
import StateLegend from '../../common/StateLegend/StateLegend.jsx';
import { SceneNarration } from '../../common/PlaybackEngine';
import styles from './MaxFlowStage.module.css';

const NODE_R = 6;

/**
 * MaxFlowStage — the synchronized flow-network view for the max-flow scrolly.
 *
 * The spine is one digraph that, scene by scene, becomes: the raw capacity
 * network → the residual network (forward spare + back cancel) → an augmenting
 * path with its bottleneck → the saturated max-flow state → the revealed minimum
 * cut → integrality → the bipartite-matching network. Every number is measured
 * by the pure generators so the picture always matches the prose.
 */
const MaxFlowStage = ({ activeScene = 0 }) => {
	// Scene → sticky view by stable id (never a numeric index): the selector lives
	// in scenes.js so an inserted/reordered scene can't desync the network view or
	// its legend (both are carried on the id-keyed view).
	const view = useMemo(
		() => selectViewForScene(SCENES[activeScene]?.id),
		[activeScene]
	);
	const network = view.network;

	const projected = useMemo(() => projectNodes(network.nodes), [network]);
	const drawEdges = useMemo(
		() => buildEdges(network.edges, projected),
		[network, projected]
	);

	// Residual overlay (forward + back) for the residual scenes.
	const residual = useMemo(() => {
		if (!view.showResidual) return [];
		return buildResidual(
			network.edges.map(e => ({ ...e })),
			view.flow
		);
	}, [view.showResidual, network, view.flow]);
	const residualByKey = useMemo(() => {
		const m = {};
		residual.forEach(re => {
			m[`${re.from}->${re.to}`] = re;
		});
		return m;
	}, [residual]);

	const pathSet = view.pathSet || new Set();
	const minCut = view.minCut || null;
	const sSide = useMemo(() => new Set(minCut ? minCut.S : []), [minCut]);
	const cutEdgeSet = useMemo(() => {
		const s = new Set();
		if (minCut) minCut.edges.forEach(e => s.add(edgeKey(e.from, e.to)));
		return s;
	}, [minCut]);

	const flowOf = e => view.flow[edgeKey(e.from, e.to)] || 0;
	const legend = view.legend;

	return (
		<>
			{/* Per-scene narration for screen readers, OUTSIDE the role=img figure
			    below (which collapses its in-figure caption into one static label). */}
			<SceneNarration>{view.caption}</SceneNarration>
			<div
				className={styles.wrap}
				data-scene={activeScene}
				role="img"
				aria-label="Directed flow network with capacities, flow, the residual network, an augmenting path, and the minimum cut, scene by scene"
			>
				<div className={styles.notation} aria-hidden="true">
					source = {network.source} · sink = {network.sink} · |V| ={' '}
					{network.nodes.length}
				</div>

				<svg
					viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
					className={styles.svg}
					preserveAspectRatio="xMidYMid meet"
				>
					<defs>
						<marker
							id="mfArrow"
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
							id="mfArrowHot"
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

					{/* Min-cut divider line behind everything, when revealed. */}
					{minCut && (
						<line x1="50" y1="4" x2="50" y2="96" className={styles.cutLine} />
					)}

					{drawEdges.map(edge => {
						const key = edgeKey(edge.from, edge.to);
						const onPath = pathSet.has(key);
						const isCutEdge = cutEdgeSet.has(key);
						const f = flowOf(edge);
						const saturated = view.showFlow && f >= edge.capacity && f > 0;
						const re = residualByKey[key];
						const hot = onPath || isCutEdge;
						const cls = [styles.edge];
						if (saturated) cls.push(styles.edgeSaturated);
						else if (view.showFlow && f > 0) cls.push(styles.edgeFlowing);
						if (isCutEdge) cls.push(styles.edgeCut);
						if (onPath) cls.push(styles.edgePath);

						// Label text per mode.
						let label;
						if (view.showResidual && re) {
							label = re.residual; // forward residual capacity
						} else if (view.showFlow) {
							label = `${f}/${edge.capacity}`;
						} else {
							label = edge.capacity;
						}

						return (
							<g key={key}>
								<path
									d={edge.path}
									className={cls.join(' ')}
									fill="none"
									markerEnd={`url(#${hot ? 'mfArrowHot' : 'mfArrow'})`}
								/>
								<text
									x={edge.lx}
									y={edge.ly}
									className={`${styles.weight} ${
										onPath || saturated ? styles.weightHot : ''
									}`}
									textAnchor="middle"
									dominantBaseline="central"
								>
									{label}
								</text>
							</g>
						);
					})}

					{projected.map(node => {
						const isSource = node.id === network.source;
						const isSink = node.id === network.sink;
						const inS = minCut ? sSide.has(node.id) : false;
						const cls = [styles.node];
						if (isSource) cls.push(styles.nodeSource);
						else if (isSink) cls.push(styles.nodeSink);
						if (minCut) cls.push(inS ? styles.nodeInS : styles.nodeInT);
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
								{/* Spatial orientation for a student new to flow networks:
							    s is the origin, t the drain. Recedes in secondary ink. */}
								{(isSource || isSink) && (
									<text
										className={styles.nodeRole}
										y={NODE_R + 5.5}
										textAnchor="middle"
										dominantBaseline="central"
									>
										{isSource ? 'source' : 'sink'}
									</text>
								)}
							</g>
						);
					})}
				</svg>

				<StateLegend className={styles.legend} items={legend} />

				{view.bottleneck != null && (
					<div className={styles.badge} aria-hidden="true">
						bottleneck = {view.bottleneck}
					</div>
				)}
				{view.showFlow && !minCut && (
					<div className={styles.badge} aria-hidden="true">
						|f| ={' '}
						{Object.keys(view.flow).reduce((sum, k) => {
							return k.startsWith(`${network.source}->`)
								? sum + (view.flow[k] || 0)
								: sum;
						}, 0)}
					</div>
				)}
				{minCut && (
					<div className={styles.badge} aria-hidden="true">
						cut capacity = {minCut.capacity}
					</div>
				)}

				<p className={styles.caption}>{view.caption}</p>
			</div>
		</>
	);
};

export default MaxFlowStage;
