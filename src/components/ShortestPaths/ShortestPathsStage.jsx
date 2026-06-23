import { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { SCENES, selectViewForScene } from './scenes.js';
import { SHARED_GRAPH, SHARED_SOURCE } from './ssspMeta.js';
import { buildEdges, projectNodes, VIEW_H, VIEW_W } from './graphLayout.js';
import useReducedMotion from '../../hooks/useReducedMotion.js';
import StateLegend from '../../common/StateLegend/StateLegend';
import { SceneNarration } from '../../common/PlaybackEngine';
import styles from './ShortestPathsStage.module.css';

// Same idempotent-registration pattern HomePage uses for ScrollTrigger.
gsap.registerPlugin(MotionPathPlugin);

// Swatch colours mirror what ShortestPathsStage.module.css actually paints. The
// settled source, pred tree, shortest path and relaxing edge all ride the topic
// accent (sssp = blue-violet) at different intensities; the over-estimate
// subpath edge borrows --color-warning and is dashed, so it never reads by hue
// alone. The relax dot is the shared --state-active blue.
const SW_SETTLED = 'var(--topic-accent)';
const SW_RELAX = 'var(--state-active)';
const SW_OVERSHOOT = 'var(--color-warning)';
const SW_FRONTIER =
	'color-mix(in srgb, var(--topic-accent) 55%, var(--color-border-strong))';

// Node + edge geometry for the SVG. The per-scene view (which dist/pred snapshot
// and which edges to highlight) is selected by scene id in scenes.js
// (selectViewForScene), so an inserted/reordered scene always paints its own
// visual instead of inheriting a stale numeric case.
const NODES = projectNodes(SHARED_GRAPH.nodes);
const EDGES = buildEdges(SHARED_GRAPH.edges, NODES);

// Edge equality for the path / relax highlights.
const edgeKey = e => `${e.from}->${e.to}`;

const NODE_R = 6;

/**
 * ShortestPathsStage — the synchronized graph + dist/pred table for the SSSP
 * scrolly. The Relax primitive is the spine: scene 0 shows one relax improving a
 * distance, and the later scenes reveal Bellman-Ford / DAG-SP / Dijkstra as
 * different *orders* of that same move, always against the same dist[]/pred[]
 * table so the unity is visible.
 */
const ShortestPathsStage = ({ activeScene = 0 }) => {
	// Derive the scene id from the SCENES array, then pick the view by id, so an
	// inserted/reordered scene always paints its own visual (see VIEW_FOR_SCENE).
	const sceneId = SCENES[activeScene]?.id ?? SCENES[0].id;
	const view = useMemo(() => selectViewForScene(sceneId), [sceneId]);
	const ids = useMemo(() => SHARED_GRAPH.nodes.map(n => n.id), []);
	const reducedMotion = useReducedMotion();

	const relaxEdge = view.relaxEdge;
	const pathSet = view.pathSet || new Set();
	const subpathSet = view.subpathSet || new Set();
	const treeSet = view.treeSet || new Set();
	const allEdges = Boolean(view.allEdges);

	// Which node is the relax target (gets a glow) for scene 0.
	const relaxTarget = relaxEdge ? relaxEdge.split('->')[1] : null;

	// The Relax primitive, staged. The edge fires, the target glows, then the
	// distance counts DOWN to its new estimate — so the drop reads as an arrival
	// caused by THIS edge, not a flicker. One shared timeline keeps it lockstep.
	const svgRef = useRef(null);
	const dotRef = useRef(null);
	const edgeLineRefs = useRef({});
	const nodeRef = useRef({});
	const distTextRefs = useRef({});
	// The numeric distance shown the previous render, per node, so the count knows
	// where to fall FROM (∞ is held as null and triggers the count-UP variant).
	const prevDistRef = useRef({});

	useEffect(() => {
		const target = relaxTarget;
		const numeric = target == null ? null : view.dist[target];
		const finalN =
			numeric == null || numeric === Infinity ? null : Number(numeric);
		// A finite previous value means "found shorter" (count down); null/∞ means
		// "first ever reached" (fade ∞, count up from a held start). On a cold mount
		// the scene can name the pre-relax estimate (relaxFrom) so the canonical
		// relax still reads as a fall rather than an appearance.
		const tracked = target == null ? null : prevDistRef.current[target];
		const fromRaw = tracked == null ? view.relaxFrom : tracked;
		const fromN =
			fromRaw == null || fromRaw === Infinity ? null : Number(fromRaw);

		const distEl = target ? distTextRefs.current[target] : null;
		const lineEl = relaxEdge ? edgeLineRefs.current[relaxEdge] : null;
		const nodeEl = target ? nodeRef.current[target] : null;
		const dotEl = dotRef.current;

		// Record what this render is now showing for next time, regardless of path.
		ids.forEach(id => {
			const d = view.dist[id];
			prevDistRef.current[id] = d == null || d === Infinity ? null : Number(d);
		});

		// No relax to stage (later scenes have no relaxEdge): leave the resting CSS
		// state untouched and make sure no stray dot/proxy lingers.
		if (!relaxEdge || finalN == null) {
			if (dotEl) gsap.set(dotEl, { opacity: 0 });
			return;
		}

		const ctx = gsap.context(() => {
			if (reducedMotion) {
				// Keep the lesson, drop only travel + digit-roll: snap the number,
				// flash the edge, blink the target once so cause↔effect still reads.
				if (distEl) distEl.textContent = String(finalN);
				if (lineEl) {
					gsap.fromTo(
						lineEl,
						{ strokeWidth: 3.4 },
						{
							strokeWidth: 2,
							duration: 0.2,
							ease: 'power1.out',
							overwrite: 'auto',
						}
					);
				}
				if (nodeEl) {
					gsap.fromTo(
						nodeEl,
						{ filter: 'brightness(1.35)' },
						{
							filter: 'brightness(1)',
							duration: 0.26,
							ease: 'power1.out',
							overwrite: 'auto',
							clearProps: 'filter',
						}
					);
				}
				return;
			}

			const firstReach = fromN == null;
			// Hold the number at its starting point so React's already-rendered final
			// value doesn't flash before the count plays.
			if (distEl) {
				distEl.textContent = firstReach ? '∞' : String(fromN);
			}

			const tl = gsap.timeline();

			// 1 — a single small ink dot rides the relaxing edge from u to v.
			if (dotEl && lineEl) {
				// MotionPath needs a path string (or point array), not a raw <line>
				// element: a <line> carries no path geometry, so the plugin's align
				// step dereferences undefined and throws. Build the segment from the
				// line's own endpoints so the dot rides u -> v in the same SVG space.
				const mx1 = lineEl.getAttribute('x1');
				const my1 = lineEl.getAttribute('y1');
				const mx2 = lineEl.getAttribute('x2');
				const my2 = lineEl.getAttribute('y2');
				tl.fromTo(
					dotEl,
					{ opacity: 0 },
					{ opacity: 1, duration: 0.12, ease: 'power1.out' },
					0
				).to(
					dotEl,
					{
						duration: 0.46,
						ease: 'power2.inOut',
						motionPath: {
							path: `M${mx1},${my1} L${mx2},${my2}`,
							alignOrigin: [0.5, 0.5],
							start: 0,
							end: 1,
						},
					},
					0
				);
			}

			// 2 — on arrival the target node glows (nodeRelax does the resting tint;
			// this is the moment-of-arrival brightening on top of it).
			if (nodeEl) {
				tl.fromTo(
					nodeEl,
					{ filter: 'brightness(1.32)' },
					{
						filter: 'brightness(1)',
						duration: 0.34,
						ease: 'power2.out',
						clearProps: 'filter',
					},
					'>-0.04'
				);
			}
			if (dotEl) {
				tl.to(dotEl, { opacity: 0, duration: 0.14, ease: 'power1.out' }, '<');
			}

			// 3 — the distance settles to its new estimate. Count DOWN for a shorter
			// route found; for the first-ever reach, fade ∞ and count UP from 0 so
			// "newly reachable" reads differently from "improved".
			if (distEl) {
				const proxy = { n: firstReach ? 0 : fromN };
				if (firstReach) distEl.textContent = '0';
				tl.to(
					proxy,
					{
						n: finalN,
						duration: 0.3,
						ease: 'power2.out',
						snap: { n: 1 },
						overwrite: 'auto',
						onUpdate: () => {
							distEl.textContent = String(Math.round(proxy.n));
						},
						onComplete: () => {
							distEl.textContent = String(finalN);
						},
					},
					'<0.02'
				);
			}
		}, svgRef);

		return () => ctx.revert();
	}, [relaxEdge, relaxTarget, activeScene, reducedMotion, view, ids]);

	// Scene-aware key: only the states this scene actually paints. Hue is never
	// the sole signal — the over-estimate subpath edge stays dashed as well as
	// amber, so it reads apart from the accent path on a colour-blind canvas.
	const legend = (() => {
		switch (activeScene) {
			// 0 relax: the firing edge plus the node it settles.
			case 0:
				return [
					{ swatch: SW_SETTLED, label: 'relaxing edge', aria: 'accent' },
					{ swatch: SW_RELAX, label: 'settling node', aria: 'blue' },
				];
			// 1 optimal substructure: shortest path vs its longer over-estimate.
			case 1:
				return [
					{ swatch: SW_SETTLED, label: 'shortest s→b', aria: 'accent' },
					{
						swatch: SW_OVERSHOOT,
						label: 'over-estimate (dashed)',
						aria: 'amber',
					},
				];
			// 3 Bellman-Ford: every edge lit as "the schedule".
			case 3:
				return [
					{ swatch: SW_FRONTIER, label: 'every edge relaxed', aria: 'accent' },
				];
			// 2, 4-7: the converged pred tree (rooted at the source).
			default:
				return [{ swatch: SW_SETTLED, label: 'pred tree', aria: 'accent' }];
		}
	})();

	return (
		<>
			{/* Per-scene narration for screen readers, OUTSIDE the role=img figure
			    below (which collapses its in-figure caption into one static label). */}
			<SceneNarration>{view.caption}</SceneNarration>
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
						ref={svgRef}
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
										ref={el => {
											if (el) edgeLineRefs.current[key] = el;
											else delete edgeLineRefs.current[key];
										}}
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

						{/* The relax pulse: one small ink dot that rides the firing edge from
					    u to v. Hidden (opacity 0) at rest so the picture is unchanged. */}
						<circle
							ref={dotRef}
							className={styles.relaxDot}
							r={1.7}
							cx={0}
							cy={0}
							opacity={0}
							aria-hidden="true"
						/>

						{NODES.map(node => {
							const isSource = node.id === SHARED_SOURCE;
							const isRelaxTarget = node.id === relaxTarget;
							const cls = [styles.node];
							if (isSource) cls.push(styles.nodeSource);
							if (isRelaxTarget) cls.push(styles.nodeRelax);
							// The distance lives ON the node, not only in the side table, so a
							// relax reads as one event on one object: this edge fired, that
							// node's number dropped. ∞ until first reached.
							const d = view.dist[node.id];
							const distText = d == null || d === Infinity ? '∞' : d;
							return (
								<g
									key={node.id}
									transform={`translate(${node.px}, ${node.py})`}
								>
									<circle
										ref={el => {
											if (el) nodeRef.current[node.id] = el;
											else delete nodeRef.current[node.id];
										}}
										r={NODE_R}
										className={cls.join(' ')}
									/>
									<text
										className={styles.nodeText}
										textAnchor="middle"
										dominantBaseline="central"
									>
										{node.id}
									</text>
									<text
										ref={el => {
											if (el) distTextRefs.current[node.id] = el;
											else delete distTextRefs.current[node.id];
										}}
										className={`${styles.nodeDist} ${
											isRelaxTarget ? styles.nodeDistActive : ''
										}`}
										y={NODE_R + 7}
										textAnchor="middle"
									>
										{distText}
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
										<tr key={id} className={isTarget ? styles.rowActive : ''}>
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
								<span className={styles.orderSeq}>
									{view.order.join(' → ')}
								</span>
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

				<StateLegend items={legend} />

				<p className={styles.caption}>{view.caption}</p>
			</div>
		</>
	);
};

export default ShortestPathsStage;
