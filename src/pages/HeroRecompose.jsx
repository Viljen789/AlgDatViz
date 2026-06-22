import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import {
	BARS,
	BFS_ORDER,
	EDGE_POOL,
	HEAPIFY_PATH,
	ORDER,
	STATES,
	VIEWBOX,
	WASH_HUE,
	edgeFrame,
} from './recomposeLayout.js';
import styles from './HeroRecompose.module.css';

// "Recompose" — one conserved company of 14 atoms re-forming itself through the
// curriculum's spine, forever:
//   array → sorted → tree → heap → graph → shortest path → spanning tree → max flow → array
// The same data, every structure. See recomposeLayout.js for the geometry; this
// file owns the GSAP loop, the per-edge "look" (path dim/highlight, flow fill),
// and the static reduced-motion frame (a drawn binary tree).

const ATOM_R = 6;
const BAR_W = 3;
const EDGE_OP = 0.42;
const BASE_EDGE_W = 1.5; // matches .edge stroke-width; animated as inline style
const BAR_OP = 0.5;
const MORPH = 1.7;
const HOLD = 1.4;

// Largest flow capacity in the constellation — scales pipe thickness in maxFlow.
const MAX_CAP = Math.max(
	1,
	...Array.from(
		{ length: EDGE_POOL },
		(_, k) => edgeFrame('maxFlow', k).cap ?? 0
	)
);

// edgeLook — the non-geometry visual target (opacity, stroke width, dash offset)
// for pooled line k in a given state. Endpoints come from edgeFrame; this is where
// each state's *meaning* is painted:
//   • shortest path → light the route bright (its brand colour comes from a CSS
//                     class, see lightRoute), keep the rest a faint-but-legible
//                     graph as context.
//   • max flow      → width ∝ capacity, brightness ∝ flow; every pipe FULLY drawn
//                     (a fat bright pipe carries flow, a thin faint one is slack).
//   • every other state → a uniform ink, fully drawn.
// Because every morph animates toward these targets, dim/width/brightness all
// self-reset the moment the loop leaves a state — no per-state teardown needed.
const edgeLook = (state, k) => {
	const f = edgeFrame(state, k);
	if (!f.active) return { opacity: 0, width: BASE_EDGE_W, offset: 1 };
	if (f.flow != null && f.cap != null) {
		// Max flow: width ∝ capacity (the pipe's bore), brightness ∝ flow. Pipes are
		// FULLY drawn (offset 0); the old partial-length fill read as broken segments.
		const frac = f.cap > 0 ? f.flow / f.cap : 0;
		return {
			opacity: frac > 0 ? 0.45 + 0.4 * frac : EDGE_OP * 0.28,
			width: BASE_EDGE_W + 3 * (f.cap / MAX_CAP),
			offset: 0,
		};
	}
	// Shortest path: the route is fully lit + a touch thicker; the rest of the graph
	// stays faint but LEGIBLE context (the old 0.18 dimming made it vanish, so the
	// route read as a few floating segments instead of a path picked out of a graph).
	if (f.highlight)
		return { opacity: 0.95, width: BASE_EDGE_W + 1.6, offset: 0 };
	if (f.dim) return { opacity: EDGE_OP * 0.34, width: BASE_EDGE_W, offset: 0 };
	return { opacity: EDGE_OP, width: BASE_EDGE_W, offset: 0 };
};

const HeroRecompose = ({ className, onState }) => {
	const rootRef = useRef(null);
	const svgRef = useRef(null);
	// Keep the latest callback without re-running the GSAP setup effect.
	const onStateRef = useRef(onState);
	onStateRef.current = onState;

	useLayoutEffect(() => {
		const svg = svgRef.current;
		const root = rootRef.current;
		if (!svg) return undefined;

		const ctx = gsap.context(() => {
			const mm = gsap.matchMedia();
			mm.add('(prefers-reduced-motion: no-preference)', () => {
				const atoms = gsap.utils.toArray('[data-atom]', svg);
				const bars = gsap.utils.toArray('[data-bar]', svg);
				const cores = gsap.utils.toArray('[data-core]', svg);
				const halos = gsap.utils.toArray('[data-halo]', svg);
				const rings = gsap.utils.toArray('[data-ring]', svg);
				const lines = gsap.utils.toArray('[data-edge]', svg);

				// Scale/rotate about each element's own origin (the atom centre).
				gsap.set([...atoms, ...cores, ...halos, ...rings], {
					transformOrigin: '0px 0px',
				});

				// Resting/intro start: atoms gathered as the array, hidden.
				gsap.set(atoms, {
					x: i => STATES.array.atoms[i].x,
					y: i => STATES.array.atoms[i].y,
					scale: 0.5,
					autoAlpha: 0,
				});
				gsap.set(bars, {
					attr: { height: i => BARS[i].h, y: 0 },
					autoAlpha: 0,
					scaleY: 0,
					// Grow each stem down from its atom (the dot), like an inked stroke.
					transformOrigin: '0px 0px',
				});
				// Inline strokeWidth so it overrides the .edge stylesheet rule, letting
				// maxFlow vary pipe thickness per capacity.
				gsap.set(lines, {
					autoAlpha: 0,
					strokeWidth: BASE_EDGE_W,
					strokeDashoffset: 1,
				});
				gsap.set(halos, { autoAlpha: 0, scale: 1 });
				gsap.set(rings, { autoAlpha: 0, scale: 0.6 });
				gsap.set(svg, { '--wash-h': WASH_HUE.array });

				// Opt the edges into draw-on ink (stroke-dasharray gated by .motion,
				// so the reduced-motion / no-JS static tree keeps solid edges).
				const emit = state => onStateRef.current?.(state);
				svg.classList.add('motion');

				// onStart names the opening state once the loop actually begins — on
				// the next tick, after React's commit, so the figcaption refs are
				// attached (a synchronous call at setup would race ahead of them).
				const master = gsap.timeline({ onStart: () => emit('array') });

				// Intro: gather into the array (plays once).
				master.to(atoms, {
					scale: 1,
					autoAlpha: 1,
					duration: 0.9,
					ease: 'power3.out',
					stagger: { each: 0.02, from: 'center' },
				});
				// Stems ink on: each grows down from its dot, lightly staggered from
				// the centre, so the array draws itself in rather than fading. The
				// loop only ever toggles bar autoAlpha, so leaving scaleY at 1 here is
				// safe — later bar states reappear at full height.
				master.to(
					bars,
					{
						autoAlpha: BAR_OP,
						scaleY: 1,
						duration: 0.7,
						ease: 'power2.out',
						stagger: { each: 0.03, from: 'center' },
					},
					'<0.1'
				);

				// The forever loop. repeatRefresh re-rolls every function-based value
				// (the random holds + the twinkle below) on each pass, so it never plays
				// back identically — the company feels alive rather than on a fixed reel.
				const loop = gsap.timeline({
					repeat: -1,
					repeatRefresh: true,
					defaults: { ease: 'power2.inOut' },
				});
				const hold = (d = HOLD) =>
					loop.to({}, { duration: () => gsap.utils.random(d * 0.7, d * 1.5) });

				// `ink` controls only the stroke-dashoffset tween (the draw-on flourish):
				//   'draw'  → ink the active lines on, parent→child, with a growth stagger
				//   'flow'  → settle each pipe to its flow/cap fill (staggered)
				//   'undraw'→ un-ink everything as the structure collapses to the array
				//   'keep'  → snap each line to its resting fill (bend a tree, trim a graph,
				//             re-tint a path) with no staggered re-ink
				// Endpoints, opacity and width always retarget to edgeLook, so dim/width/
				// fill self-reset between states regardless of ink mode.
				const morphTo = (state, { ink = 'keep' } = {}) => {
					loop.to(atoms, {
						x: i => STATES[state].atoms[i].x,
						y: i => STATES[state].atoms[i].y,
						scale: i => STATES[state].atoms[i].scale,
						duration: MORPH,
						// Reassemble in a scattered order (not tidy centre-out) so each
						// structure forms organically.
						stagger: { each: 0.02, from: 'random' },
						// Name the structure the instant it has FORMED (not on start —
						// that would lead the morph by a full MORPH and lie for ~1.7s).
						onComplete: () => emit(state),
					});
					loop.to(
						lines,
						{
							attr: {
								x1: k => edgeFrame(state, k).x1,
								y1: k => edgeFrame(state, k).y1,
								x2: k => edgeFrame(state, k).x2,
								y2: k => edgeFrame(state, k).y2,
							},
							strokeWidth: k => edgeLook(state, k).width,
							autoAlpha: k => edgeLook(state, k).opacity,
							duration: MORPH,
						},
						'<'
					);
					if (ink === 'draw' || ink === 'flow') {
						// A plain `to` (not fromTo) means lines already at their target stay
						// put, so a denser state inks only its NEW lines instead of re-inking
						// the ones already on screen; the stagger reads as growth.
						loop.to(
							lines,
							{
								strokeDashoffset: k => edgeLook(state, k).offset,
								duration: 0.7,
								stagger: { each: 0.05 },
								ease: 'power1.inOut',
							},
							'<0.2'
						);
					} else if (ink === 'undraw') {
						loop.to(
							lines,
							{ strokeDashoffset: 1, duration: MORPH * 0.7, ease: 'power1.in' },
							'<'
						);
					} else {
						loop.to(
							lines,
							{
								strokeDashoffset: k => edgeLook(state, k).offset,
								duration: MORPH,
							},
							'<'
						);
					}
					const sb = STATES[state].bars;
					loop.to(
						bars,
						{
							attr: { height: i => (sb ? sb[i].h : 0) },
							autoAlpha: sb ? BAR_OP : 0,
							duration: MORPH,
						},
						'<'
					);
					loop.to(svg, { '--wash-h': WASH_HUE[state], duration: MORPH }, '<');
				};

				// A "beat": pulse a sequence of atoms (sift cascade / BFS frontier).
				const beat = (sequence, { step, pop }) => {
					const tl = gsap.timeline();
					sequence.forEach((idx, n) => {
						const at = n * step;
						tl.to(
							cores[idx],
							{
								scale: pop,
								duration: 0.28,
								yoyo: true,
								repeat: 1,
								ease: 'power2.inOut',
							},
							at
						);
						tl.fromTo(
							halos[idx],
							{ autoAlpha: 0, scale: 0.6 },
							{
								autoAlpha: 0.85,
								scale: 2.2,
								duration: 0.55,
								ease: 'power2.out',
							},
							at
						);
						tl.to(halos[idx], { autoAlpha: 0, duration: 0.3 }, at + 0.34);
					});
					return tl;
				};

				// A soft random sparkle across the company during a dwell — a few atoms
				// glow at random, a little differently each pass (repeatRefresh re-rolls
				// the function values), so the resting instrument feels alive, not frozen.
				const twinkle = pos =>
					loop.to(
						halos,
						{
							autoAlpha: () =>
								gsap.utils.random(0, 1) > 0.65
									? gsap.utils.random(0.22, 0.5)
									: 0,
							scale: () => gsap.utils.random(1.5, 2.2),
							duration: () => gsap.utils.random(0.7, 1.2),
							ease: 'sine.inOut',
							yoyo: true,
							repeat: 1,
							stagger: { each: 0.07, from: 'random' },
						},
						pos
					);

				hold(); // dwell on the array
				twinkle('<'); // sparkle over the opening dwell
				morphTo('sorted'); // the same dots slide into rank order (bars stay)
				hold();
				morphTo('tree', { ink: 'draw' }); // ink the tree pointers on, root → leaves
				hold();
				morphTo('heap'); // pack into a tight, compact complete tree
				loop.add(beat(HEAPIFY_PATH, { step: 0.34, pop: 1.5 })); // heapify sift
				morphTo('graph', { ink: 'draw' }); // fly to the constellation; cycle edges ink on
				loop.add(beat(BFS_ORDER, { step: 0.1, pop: 1.32 })); // BFS frontier wave
				hold();
				twinkle('<'); // sparkle over the settled graph
				morphTo('spanningTree'); // trim the cycles to a tree that still spans all
				hold();
				morphTo('array', { ink: 'undraw' }); // un-ink, collapse to baseline — lands on start

				master.add(loop);

				// Don't burn frames off-screen or in a hidden tab.
				const io = new IntersectionObserver(
					([entry]) =>
						entry.isIntersecting ? master.resume() : master.pause(),
					{ threshold: 0 }
				);
				if (root) io.observe(root);
				const onVisibility = () =>
					document.hidden ? master.pause() : master.resume();
				document.addEventListener('visibilitychange', onVisibility);

				return () => {
					io.disconnect();
					document.removeEventListener('visibilitychange', onVisibility);
					svg.classList.remove('motion');
				};
			});

			// Reduced motion: still tell the whole story — one dataset re-read as every
			// structure, each named — but with NO sliding, scaling, or draw-on. Every
			// frame is positioned while invisible, then revealed with an opacity-only
			// dissolve (prefers-reduced-motion targets motion, not fades). The static
			// drawn tree below remains the no-JS fallback. Edges stay solid here
			// (.motion is not added), so path/flow read through opacity + width, not
			// the dash fill.
			mm.add('(prefers-reduced-motion: reduce)', () => {
				const atoms = gsap.utils.toArray('[data-atom]', svg);
				const bars = gsap.utils.toArray('[data-bar]', svg);
				const lines = gsap.utils.toArray('[data-edge]', svg);
				const emit = state => onStateRef.current?.(state);

				gsap.set(atoms, { transformOrigin: '0px 0px' });
				// Hide the authored frame before first paint so it doesn't flash ahead
				// of the dissolve cycle.
				gsap.set(atoms, { autoAlpha: 0 });
				gsap.set(bars, { autoAlpha: 0 });
				gsap.set(lines, { autoAlpha: 0, strokeWidth: BASE_EDGE_W });

				const FADE_IN = 0.8;
				const FADE_OUT = 0.5;
				const DWELL = 2.6;

				const cycle = gsap.timeline({ repeat: -1 });
				ORDER.forEach(state => {
					const sb = STATES[state].bars;
					// Reposition while invisible — pure attribute sets, no animated motion.
					cycle.set(atoms, {
						x: i => STATES[state].atoms[i].x,
						y: i => STATES[state].atoms[i].y,
						scale: i => STATES[state].atoms[i].scale,
					});
					cycle.set(lines, {
						attr: {
							x1: k => edgeFrame(state, k).x1,
							y1: k => edgeFrame(state, k).y1,
							x2: k => edgeFrame(state, k).x2,
							y2: k => edgeFrame(state, k).y2,
						},
						strokeWidth: k => edgeLook(state, k).width,
					});
					cycle.set(bars, { attr: { height: i => (sb ? sb[i].h : 0) } });
					cycle.set(svg, { '--wash-h': WASH_HUE[state] });
					cycle.call(() => emit(state));
					// Dissolve the new frame in.
					cycle.to(atoms, {
						autoAlpha: 1,
						duration: FADE_IN,
						ease: 'power1.out',
					});
					cycle.to(
						lines,
						{
							autoAlpha: k => edgeLook(state, k).opacity,
							duration: FADE_IN,
							ease: 'power1.out',
						},
						'<'
					);
					cycle.to(
						bars,
						{
							autoAlpha: sb ? BAR_OP : 0,
							duration: FADE_IN,
							ease: 'power1.out',
						},
						'<'
					);
					cycle.to({}, { duration: DWELL }); // dwell so the legend can be read
					// Dissolve out before the next frame repositions (while invisible).
					cycle.to([...atoms, ...lines, ...bars], {
						autoAlpha: 0,
						duration: FADE_OUT,
						ease: 'power1.in',
					});
				});

				const io = new IntersectionObserver(
					([entry]) => (entry.isIntersecting ? cycle.resume() : cycle.pause()),
					{ threshold: 0 }
				);
				if (root) io.observe(root);
				const onVisibility = () =>
					document.hidden ? cycle.pause() : cycle.resume();
				document.addEventListener('visibilitychange', onVisibility);

				return () => {
					io.disconnect();
					document.removeEventListener('visibilitychange', onVisibility);
				};
			});
		}, svgRef);

		return () => ctx.revert();
	}, []);

	// Static skeleton, authored at the TREE state so reduced-motion / no-JS users
	// see a legible drawn binary tree. GSAP overrides on top when motion is on.
	return (
		<div ref={rootRef} className={className} data-hero-recompose>
			<svg
				ref={svgRef}
				className={styles.svg}
				viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
				preserveAspectRatio="xMidYMid meet"
				aria-hidden="true"
				style={{ '--wash-h': WASH_HUE.tree }}
			>
				<rect
					data-wash
					className={styles.wash}
					x="0"
					y="0"
					width={VIEWBOX.w}
					height={VIEWBOX.h}
				/>
				<g data-edges>
					{Array.from({ length: EDGE_POOL }, (_, k) => {
						const f = edgeFrame('tree', k);
						return (
							<line
								key={k}
								data-edge
								className={styles.edge}
								pathLength="1"
								x1={f.x1}
								y1={f.y1}
								x2={f.x2}
								y2={f.y2}
								style={{ opacity: f.active ? EDGE_OP : 0 }}
							/>
						);
					})}
				</g>
				<g data-atoms>
					{STATES.tree.atoms.map((a, i) => (
						<g key={i} data-atom transform={`translate(${a.x} ${a.y})`}>
							<rect
								data-bar
								className={styles.bar}
								x={-BAR_W / 2}
								y={0}
								width={BAR_W}
								height={BARS[i].h}
								rx={1.5}
							/>
							<circle
								data-ring
								className={styles.ring}
								cx={0}
								cy={0}
								r={ATOM_R * 2.3}
							/>
							<circle
								data-halo
								className={styles.halo}
								cx={0}
								cy={0}
								r={ATOM_R}
							/>
							<circle
								data-core
								className={`${styles.core} ${i === 0 ? styles.coreAccent : ''}`}
								cx={0}
								cy={0}
								r={ATOM_R}
							/>
						</g>
					))}
				</g>
			</svg>
		</div>
	);
};

export default HeroRecompose;
