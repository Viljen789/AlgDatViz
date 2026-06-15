// MstGraph — a reusable, read-only SVG renderer for the shared weighted graph.
//
// Hand-rolled SVG (no new libs): vertices at their fixed layout positions, edges
// drawn as weighted line segments with a weight pill at the midpoint. The caller
// passes per-edge and per-node visual states (highlight sets) so the SAME
// component drives both the teaching stage and the playground in lockstep.
//
// All emphasis is expressed through CSS-module classes that resolve to design
// tokens; this file never names a colour at REST. The one runtime colour read
// (--color-warning) is only borrowed for the transient reject-recoil tween, then
// handed straight back to the CSS state class.
//
// MOTION — edge accretion. A committed edge does not just flip to "tree": it
// inks from u to v (strokeDashoffset 1->0, the hero's proven draw-on idiom on
// the same kind of <line>), then its weight pill pops and the joining vertex
// settles in — so the tree visibly GROWS one safe edge at a time. A rejected
// edge draws ~60% on in the warning colour then reverse-erases: a visible "this
// would close a cycle, take it back". GSAP only owns the property mid-tween;
// clearProps / context.revert hands the resting look back to the state classes,
// so the rest-state stays pixel-identical to the class-only renderer.

import { useLayoutEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { edgeId } from './mstTrace.js';
import { MST_NODES, NODE_POS } from './mstMeta.js';
import useReducedMotion from '../../hooks/useReducedMotion.js';
import styles from './MstGraph.module.css';

const VIEW = 100; // the layout positions live in a 0..100 square

// Resolve the warning hue at runtime so the reject recoil tween has a concrete
// colour to animate to (re-read each beat so a theme toggle is picked up next
// frame). Same pattern BarView uses for the state quartet.
const resolveWarning = () =>
	getComputedStyle(document.documentElement)
		.getPropertyValue('--color-warning')
		.trim() || 'currentColor';

// Find a tagged element for an edge/vertex id within this graph's <svg>.
const pick = (root, attr, id) =>
	root?.querySelector(`[${attr}][data-id="${CSS.escape(id)}"]`) || null;

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
	// Stable identity (the effect depends on it): only changes when the caller's
	// own tree set does, never on an unrelated re-render via the `new Set()` fallback.
	const treeNodes = useMemo(() => nodeSets.tree || new Set(), [nodeSets.tree]);
	const reducedMotion = useReducedMotion();
	const svgRef = useRef(null);
	// The tree vertices the previous beat showed — so an accept can tell WHICH
	// endpoint just joined (the one newly in the tree) and settle only that one.
	const prevTreeNodesRef = useRef(null);

	// Recover the accreting edge from the highlight sets the caller already
	// passes — no extra prop, so every surface (stage, playground, compare) drives
	// the motion through the very state map it already builds:
	//   accept — the light edge that is ALSO committed to the tree this beat
	//            (on a plain "consider" beat the light edge is not yet in tree).
	//   reject — the single edge in `consider` (set only on a reject beat, and
	//            simultaneously dropped into `rejected`).
	const treeSet = edgeSets.tree;
	const lightSet = edgeSets.light;
	const considerSet = edgeSets.consider;
	let accreteId = null;
	let accretePhase = null;
	if (lightSet && treeSet) {
		for (const id of lightSet) {
			if (treeSet.has(id)) {
				accreteId = id;
				accretePhase = 'accept';
				break;
			}
		}
	}
	if (!accreteId && considerSet) {
		for (const id of considerSet) {
			accreteId = id;
			accretePhase = 'reject';
			break;
		}
	}

	useLayoutEffect(() => {
		const svg = svgRef.current;
		// Snapshot which vertices are newly in the tree this beat, then remember
		// the current set for the next one (kept current on every beat, even the
		// ones we do not animate, so the diff never drifts).
		const prevTree = prevTreeNodesRef.current;
		prevTreeNodesRef.current = treeNodes;

		if (!svg) return;
		if (accretePhase !== 'accept' && accretePhase !== 'reject') return;
		if (!accreteId) return;

		const line = pick(svg, 'data-edge', accreteId);
		if (!line) return;

		// Reduced motion KEEPS the lesson (the growth) but shortens it, and SKIPS
		// the reject recoil entirely — the rejected edge simply rests dashed-and-
		// dimmed as the CSS class already paints it. Matches the BarView pattern.
		if (reducedMotion && accretePhase === 'reject') return;

		const ctx = gsap.context(() => {
			if (accretePhase === 'accept') {
				const drawDur = reducedMotion ? 0.12 : 0.5;
				// 1) Ink the committed edge on from u to v. pathLength="1" normalises
				//    the segment, so dashoffset 1->0 is a clean draw-on regardless of
				//    length (the hero's idiom). clearProps hands the solid resting
				//    look back to .edgeTree, so the rest-state is unchanged.
				gsap.set(line, { strokeDasharray: 1, strokeDashoffset: 1 });
				const tl = gsap.timeline();
				tl.to(line, {
					strokeDashoffset: 0,
					duration: drawDur,
					ease: 'power1.inOut',
					overwrite: 'auto',
					onComplete: () =>
						gsap.set(line, {
							clearProps: 'strokeDasharray,strokeDashoffset',
						}),
				});

				// 2) The weight pill pops in — a single quiet 0.7->1 (power2.out,
				//    NOT a back.out bounce) as the edge lands.
				const pill = pick(svg, 'data-pill', accreteId);
				if (pill) {
					gsap.set(pill, { transformOrigin: '0px 0px' });
					tl.fromTo(
						pill,
						{ scale: 0.7 },
						{
							scale: 1,
							duration: reducedMotion ? 0.12 : 0.3,
							ease: 'power2.out',
							overwrite: 'auto',
							onComplete: () => gsap.set(pill, { clearProps: 'scale' }),
						},
						reducedMotion ? '<' : '-=0.16'
					);
				}

				// 3) The joining vertex settles in — the endpoint(s) newly in the
				//    tree this beat. The CSS class cross-fades the fill colour; this
				//    small scale settle ties that fill to the edge landing so the
				//    vertex visibly "joins" rather than blinking.
				if (!reducedMotion) {
					const [a, b] = accreteId.split('|');
					const joined = [a, b].filter(
						n => treeNodes.has(n) && !(prevTree && prevTree.has(n))
					);
					joined.forEach(n => {
						const vtx = pick(svg, 'data-vertex', n);
						if (!vtx) return;
						gsap.fromTo(
							vtx,
							{ scale: 0.8, transformOrigin: '0px 0px' },
							{
								scale: 1,
								duration: 0.34,
								ease: 'power2.out',
								overwrite: 'auto',
								onComplete: () => gsap.set(vtx, { clearProps: 'scale' }),
							},
							'<0.04'
						);
					});
				}
			} else {
				// REJECT — draw ~60% on in the warning colour, then reverse-erase
				// to nothing: the union-find cycle test, made watchable. clearProps
				// returns the line to its resting .edgeRejected (dashed + dimmed).
				const warn = resolveWarning();
				gsap.set(line, {
					stroke: warn,
					strokeWidth: 2,
					opacity: 1,
					strokeDasharray: 1,
					strokeDashoffset: 1,
				});
				const tl = gsap.timeline({
					onComplete: () =>
						gsap.set(line, {
							clearProps:
								'stroke,strokeWidth,opacity,strokeDasharray,strokeDashoffset',
						}),
				});
				tl.to(line, {
					strokeDashoffset: 0.4, // 60% inked
					duration: 0.19,
					ease: 'power1.inOut',
					overwrite: 'auto',
				});
				tl.to(line, {
					strokeDashoffset: 1, // take it back
					duration: 0.17,
					ease: 'power1.inOut',
				});
			}
		}, svgRef);

		// Rapid stepping / unmount: revert restores the pre-tween (CSS) resting
		// look, so a fast scrub never strands a half-drawn or warning-coloured edge.
		return () => ctx.revert();
	}, [accreteId, accretePhase, reducedMotion, treeNodes]);

	return (
		<svg
			ref={svgRef}
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
							data-edge
							data-id={id}
							pathLength="1"
							x1={a.x}
							y1={a.y}
							x2={b.x}
							y2={b.y}
							className={edgeClassFor(id, edgeSets)}
						/>
						<g transform={`translate(${mx}, ${my})`}>
							<circle
								data-pill
								data-id={id}
								r={4.4}
								className={`${styles.weightPill} ${
									isStrong ? styles.weightPillStrong : ''
								}`}
							/>
							<text className={styles.weightText} textAnchor="middle" dy="2.2">
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
						<circle
							data-vertex
							data-id={n.id}
							r={6.5}
							className={cls.join(' ')}
						/>
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
