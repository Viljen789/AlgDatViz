import { useMemo } from 'react';
import {
	buildResidual,
	edmondsKarpTrace,
	edgeKey,
} from './maxFlowTrace.js';
import { CLRS_NETWORK, MATCHING_NETWORK } from './maxFlowMeta.js';
import { buildEdges, projectNodes, VIEW_H, VIEW_W } from './graphLayout.js';
import StateLegend from '../../common/StateLegend/StateLegend.jsx';
import styles from './MaxFlowStage.module.css';

// Canonical run on the classic network, measured once and shared by the scenes.
const EK = edmondsKarpTrace(CLRS_NETWORK);
const FINAL_FLOW = EK.flow;
const MIN_CUT = EK.minCut;
const CLRS_EDGES = CLRS_NETWORK.edges.map(e => ({ ...e }));

// A mid-run flow snapshot: 12 units pushed along s→v1→v3→t, used to illustrate
// the residual network and an augmenting path before the final state.
const MID_FLOW = { 's->v1': 12, 'v1->v3': 12, 'v3->t': 12 };

const NODE_R = 6;

const pathEdgeSet = path => {
	const s = new Set();
	if (!path) return s;
	path.forEach(re => {
		// On the stage we highlight the ORIGINAL edge a residual edge belongs to.
		s.add(re.edgeKey);
		// Also mark the residual orientation so back edges can be styled.
		s.add(`${re.from}->${re.to}`);
	});
	return s;
};

// Per-scene emphasis on the CLRS network. Each returns which network to show,
// the flow snapshot, optional residual overlay, an augmenting path, the min-cut
// partition, and a caption.
const SCENE_VIEW = activeScene => {
	switch (activeScene) {
		// 0 flow network — just capacities, zero flow.
		case 0:
			return {
				network: CLRS_NETWORK,
				flow: {},
				caption: 'Capacities on every edge · source s · sink t',
			};
		// 1 residual network — show spare (forward) + cancel (back) capacities.
		case 1:
			return {
				network: CLRS_NETWORK,
				flow: MID_FLOW,
				showResidual: true,
				caption:
					'After pushing 12 on s→v1→v3→t: forward residual = c − f, back residual = f',
			};
		// 2 augmenting path — a residual s→t path with its bottleneck.
		case 2: {
			const path = [
				{ from: 's', to: 'v2', kind: 'forward', edgeKey: 's->v2', residual: 13 },
				{ from: 'v2', to: 'v4', kind: 'forward', edgeKey: 'v2->v4', residual: 14 },
				{ from: 'v4', to: 't', kind: 'forward', edgeKey: 'v4->t', residual: 4 },
			];
			return {
				network: CLRS_NETWORK,
				flow: MID_FLOW,
				showResidual: true,
				path,
				pathSet: pathEdgeSet(path),
				bottleneck: 4,
				caption: 'Augmenting path s → v2 → v4 → t · bottleneck = 4',
			};
		}
		// 3 Ford-Fulkerson — the augment-until-stuck loop reaching the max flow.
		case 3:
			return {
				network: CLRS_NETWORK,
				flow: FINAL_FLOW,
				showFlow: true,
				caption: `Augment until no path remains · max flow = ${EK.value}`,
			};
		// 4 Edmonds-Karp — same final flow, framed as shortest-path augmentation.
		case 4:
			return {
				network: CLRS_NETWORK,
				flow: FINAL_FLOW,
				showFlow: true,
				caption: 'Same loop, shortest augmenting path each time (BFS)',
			};
		// 5 max-flow / min-cut — reveal the cut partition.
		case 5:
			return {
				network: CLRS_NETWORK,
				flow: FINAL_FLOW,
				showFlow: true,
				minCut: MIN_CUT,
				caption: `Min cut S = {${MIN_CUT.S.join(', ')}} · capacity ${MIN_CUT.capacity} = max flow`,
			};
		// 6 integrality — final integer flow on every edge.
		case 6:
			return {
				network: CLRS_NETWORK,
				flow: FINAL_FLOW,
				showFlow: true,
				caption: 'Integer capacities → every edge flow is a whole number',
			};
		// 7 bipartite matching — the unit-capacity matching network.
		case 7:
		default: {
			const match = edmondsKarpTrace(MATCHING_NETWORK);
			return {
				network: MATCHING_NETWORK,
				flow: match.flow,
				showFlow: true,
				caption: `Unit capacities · max flow ${match.value} = maximum matching size`,
			};
		}
	}
};

// Per-scene legend: only the meanings actually drawn in that scene, named in
// words for the spoken key. Swatch colours mirror the on-canvas edge/node
// styling above (resting edge, topic-accent for flow, warning for the cut) so
// the picture and the key never disagree.
const ACCENT = 'var(--topic-accent)';
const WARNING = 'var(--color-warning)';
const RESTING = 'var(--color-border-strong)';

const SCENE_LEGEND = activeScene => {
	switch (activeScene) {
		// 0 flow network — bare capacities, nothing flowing yet.
		case 0:
			return [{ label: 'number = capacity c', swatch: RESTING, aria: 'grey edge' }];
		// 1 residual network — the label is the spare forward capacity; the back
		//   residual (f, cancellable) lives on the same edge.
		case 1:
			return [
				{ label: 'forward residual = c − f', swatch: RESTING, aria: 'grey edge' },
				{ label: 'back residual = f', swatch: RESTING, aria: 'cancellable' },
			];
		// 2 augmenting path — the chosen residual s→t path is the only highlight.
		case 2:
			return [
				{ label: 'augmenting path', swatch: ACCENT, aria: 'green dashed' },
				{ label: 'residual = c − f', swatch: RESTING, aria: 'grey edge' },
			];
		// 3-4, 6 flow on the network — flowing vs. saturated edges.
		case 3:
		case 4:
		case 6:
			return [
				{ label: 'label = f / c', swatch: ACCENT, aria: 'green' },
				{ label: 'saturated (f = c)', swatch: ACCENT, aria: 'bold green' },
			];
		// 5 min cut — the source side and the saturated cut edges.
		case 5:
			return [
				{ label: 'source side S', swatch: ACCENT, aria: 'green' },
				{ label: 'cut edge', swatch: WARNING, aria: 'amber' },
			];
		// 7 bipartite matching — unit-capacity matched edges.
		case 7:
		default:
			return [{ label: 'matched edge', swatch: ACCENT, aria: 'green' }];
	}
};

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
	const view = useMemo(() => SCENE_VIEW(activeScene), [activeScene]);
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
	const sSide = useMemo(
		() => new Set(minCut ? minCut.S : []),
		[minCut]
	);
	const cutEdgeSet = useMemo(() => {
		const s = new Set();
		if (minCut) minCut.edges.forEach(e => s.add(edgeKey(e.from, e.to)));
		return s;
	}, [minCut]);

	const flowOf = e => view.flow[edgeKey(e.from, e.to)] || 0;
	const legend = useMemo(() => SCENE_LEGEND(activeScene), [activeScene]);

	return (
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
				{minCut && <line x1="50" y1="4" x2="50" y2="96" className={styles.cutLine} />}

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
						<g
							key={node.id}
							transform={`translate(${node.px}, ${node.py})`}
						>
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
					|f| = {Object.keys(view.flow).reduce((sum, k) => {
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
	);
};

export default MaxFlowStage;
