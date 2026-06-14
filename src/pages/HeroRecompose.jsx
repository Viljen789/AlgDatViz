import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import {
	BARS,
	BFS_ORDER,
	EDGE_POOL,
	HEAPIFY_PATH,
	STATES,
	VIEWBOX,
	WASH_HUE,
	edgeFrame,
} from './recomposeLayout.js';
import styles from './HeroRecompose.module.css';

// "Recompose" — one conserved company of 14 atoms re-forming itself through
// array → sorted → tree → heap → graph → array, forever. The same data, every
// structure. See recomposeLayout.js for the geometry; this file owns the GSAP
// loop and the static reduced-motion frame (a drawn binary tree).

const ATOM_R = 6;
const BAR_W = 3;
const EDGE_OP = 0.42;
const BAR_OP = 0.5;
const MORPH = 1.7;
const HOLD = 1.4;

const HeroRecompose = ({ className }) => {
	const rootRef = useRef(null);
	const svgRef = useRef(null);

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
				const lines = gsap.utils.toArray('[data-edge]', svg);

				// Scale/rotate about each element's own origin (the atom centre).
				gsap.set([...atoms, ...cores, ...halos], {
					transformOrigin: '0px 0px',
				});

				// Resting/intro start: atoms gathered as the array, hidden.
				gsap.set(atoms, {
					x: i => STATES.array.atoms[i].x,
					y: i => STATES.array.atoms[i].y,
					scale: 0.5,
					autoAlpha: 0,
				});
				gsap.set(bars, { attr: { height: i => BARS[i].h, y: 0 }, autoAlpha: 0 });
				gsap.set(lines, { autoAlpha: 0 });
				gsap.set(halos, { autoAlpha: 0, scale: 1 });
				gsap.set(svg, { '--wash-h': WASH_HUE.array });

				const master = gsap.timeline();

				// Intro: gather into the array (plays once).
				master.to(atoms, {
					scale: 1,
					autoAlpha: 1,
					duration: 0.9,
					ease: 'power3.out',
					stagger: { each: 0.02, from: 'center' },
				});
				master.to(bars, { autoAlpha: BAR_OP, duration: 0.6 }, '<0.2');

				// The forever loop.
				const loop = gsap.timeline({
					repeat: -1,
					defaults: { ease: 'power2.inOut' },
				});
				const hold = (d = HOLD) => loop.to({}, { duration: d });

				const morphTo = state => {
					loop.to(atoms, {
						x: i => STATES[state].atoms[i].x,
						y: i => STATES[state].atoms[i].y,
						scale: i => STATES[state].atoms[i].scale,
						duration: MORPH,
						stagger: { each: 0.02, from: 'center' },
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
							autoAlpha: k => (edgeFrame(state, k).active ? EDGE_OP : 0),
							duration: MORPH,
						},
						'<'
					);
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
							{ autoAlpha: 0.85, scale: 2.2, duration: 0.55, ease: 'power2.out' },
							at
						);
						tl.to(halos[idx], { autoAlpha: 0, duration: 0.3 }, at + 0.34);
					});
					return tl;
				};

				hold(); // dwell on the array
				morphTo('sorted');
				hold();
				morphTo('tree');
				hold();
				morphTo('heap');
				loop.add(beat(HEAPIFY_PATH, { step: 0.34, pop: 1.5 })); // heapify sift
				morphTo('graph');
				loop.add(beat(BFS_ORDER, { step: 0.1, pop: 1.32 })); // BFS frontier
				morphTo('array'); // collapse back — lands exactly on the start

				master.add(loop);

				// Don't burn frames off-screen or in a hidden tab.
				const io = new IntersectionObserver(
					([entry]) => (entry.isIntersecting ? master.resume() : master.pause()),
					{ threshold: 0 }
				);
				if (root) io.observe(root);
				const onVisibility = () =>
					document.hidden ? master.pause() : master.resume();
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
						<g
							key={i}
							data-atom
							transform={`translate(${a.x} ${a.y})`}
						>
							<rect
								data-bar
								className={styles.bar}
								x={-BAR_W / 2}
								y={0}
								width={BAR_W}
								height={BARS[i].h}
								rx={1.5}
							/>
							<circle data-halo className={styles.halo} cx={0} cy={0} r={ATOM_R} />
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
