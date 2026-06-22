import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
	animate,
	useMotionValue,
	useMotionValueEvent,
	useReducedMotion,
} from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { CURRICULUM } from '../../data/curriculum.js';
import styles from './LabStudio.module.css';

// ---------------------------------------------------------------------------
// The "study instrument": the current paper-and-ink hero idea, but the reader
// GRABS the dataset and scrubs it between structures (drag the slider or click a
// structure). One conserved set of 14 values; only how you read it changes. The
// graph state earns a soft glow. Calm, legible, controllable — a study tool, not
// a toy. (Throwaway /lab prototype; self-contained.)
// ---------------------------------------------------------------------------

const VALUES = [6, 10, 2, 13, 4, 8, 0, 11, 5, 9, 1, 12, 7, 3];
const N = VALUES.length;
const W = 880;
const BASE = 392;
const MX = 64;
const STEP = (W - 2 * MX) / (N - 1);
const barOf = v => 26 + (v / 13) * 226;

// Sorted ranks (so array → sorted is the same bars, re-ordered by size).
const order = [...VALUES.keys()].sort((a, b) => VALUES[a] - VALUES[b]);
const rank = [];
order.forEach((id, pos) => {
	rank[id] = pos;
});

const arrayPos = VALUES.map((v, i) => ({
	x: MX + i * STEP,
	y: BASE - barOf(v),
	bar: barOf(v),
}));
const sortedPos = VALUES.map((v, i) => ({
	x: MX + rank[i] * STEP,
	y: BASE - barOf(v),
	bar: barOf(v),
}));

// Heap: a complete binary tree, level by level (1, 2, 4, 7 = 14).
const HMX = 120;
const HTOP = 78;
const HGAP = 100;
const heapPos = Array.from({ length: N }, (_, i) => {
	const lvl = Math.floor(Math.log2(i + 1));
	const slot = i - (2 ** lvl - 1);
	const count = 2 ** lvl;
	return {
		x: HMX + ((slot + 0.5) * (W - 2 * HMX)) / count,
		y: HTOP + lvl * HGAP,
		bar: 0,
	};
});

// Graph: a hand-placed constellation on the same 14 nodes.
const graphXY = [
	[440, 88],
	[252, 152],
	[628, 152],
	[160, 250],
	[362, 232],
	[520, 232],
	[720, 250],
	[236, 346],
	[440, 360],
	[596, 344],
	[116, 160],
	[764, 168],
	[332, 118],
	[558, 118],
];
const graphPos = graphXY.map(([x, y]) => ({ x, y, bar: 0 }));

const LAYOUTS = [arrayPos, sortedPos, heapPos, graphPos];
const LAST = LAYOUTS.length - 1;

// Edges. Tree edges peak at the heap stop; graph edges (+ their glow) at the graph
// stop. Endpoints always follow the live, interpolated atom positions.
const treeEdges = [];
for (let i = 0; i < N; i += 1) {
	if (2 * i + 1 < N) treeEdges.push([i, 2 * i + 1]);
	if (2 * i + 2 < N) treeEdges.push([i, 2 * i + 2]);
}
const graphEdges = [
	[0, 12],
	[0, 13],
	[12, 1],
	[13, 2],
	[1, 10],
	[1, 3],
	[1, 4],
	[3, 7],
	[4, 8],
	[2, 5],
	[2, 6],
	[5, 9],
	[6, 11],
	[8, 9],
	[7, 8],
	[4, 5],
];

const STOPS = [
	{
		name: 'Array',
		note: 'Fourteen values, in the order they arrived.',
		cost: 'index · O(1)',
	},
	{
		name: 'Sorted',
		note: 'The same values, arranged by size.',
		cost: 'search · O(log n)',
	},
	{
		name: 'Heap',
		note: 'The same array, read as a complete tree.',
		cost: 'next-best · O(log n)',
	},
	{
		name: 'Graph',
		note: 'The same nodes, linked as a network.',
		cost: 'traverse · O(V + E)',
	},
];

const PATH_TOPICS = [
	CURRICULUM[0],
	CURRICULUM[3],
	CURRICULUM[7],
	CURRICULUM[9],
	CURRICULUM[15],
];

const SPRING = { type: 'spring', stiffness: 170, damping: 24, mass: 0.9 };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, f) => a + (b - a) * f;

const LabStudio = () => {
	const reduced = useReducedMotion();
	const progress = useMotionValue(0);
	const [active, setActive] = useState(0);
	const [autoplay, setAutoplay] = useState(true);
	const touched = useRef(false);

	const atomRefs = useRef([]);
	const barRefs = useRef([]);
	const treeRefs = useRef([]);
	const graphRefs = useRef([]);
	const glowRefs = useRef([]);
	const thumbRef = useRef(null);
	const fillRef = useRef(null);
	const trackRef = useRef(null);

	const setLine = (l, a, b) => {
		if (!l) return;
		l.setAttribute('x1', a.x.toFixed(2));
		l.setAttribute('y1', a.y.toFixed(2));
		l.setAttribute('x2', b.x.toFixed(2));
		l.setAttribute('y2', b.y.toFixed(2));
	};

	const render = p => {
		const lo = Math.floor(p);
		const hi = Math.min(lo + 1, LAST);
		const f = p - lo;
		const pos = LAYOUTS[0].map((_, i) => ({
			x: lerp(LAYOUTS[lo][i].x, LAYOUTS[hi][i].x, f),
			y: lerp(LAYOUTS[lo][i].y, LAYOUTS[hi][i].y, f),
			bar: lerp(LAYOUTS[lo][i].bar, LAYOUTS[hi][i].bar, f),
		}));
		pos.forEach((a, i) => {
			const g = atomRefs.current[i];
			if (g)
				g.setAttribute(
					'transform',
					`translate(${a.x.toFixed(2)} ${a.y.toFixed(2)})`
				);
			const bar = barRefs.current[i];
			if (bar) {
				bar.setAttribute('height', Math.max(0, a.bar).toFixed(2));
				bar.style.opacity = clamp(a.bar / 26, 0, 1) * 0.5;
			}
		});
		const treeOp = clamp(1 - Math.abs(p - 2), 0, 1);
		const graphOp = clamp(p - 2, 0, 1);
		treeEdges.forEach((e, k) => {
			const l = treeRefs.current[k];
			if (!l) return;
			setLine(l, pos[e[0]], pos[e[1]]);
			l.style.opacity = treeOp * 0.5;
		});
		graphEdges.forEach((e, k) => {
			setLine(graphRefs.current[k], pos[e[0]], pos[e[1]]);
			setLine(glowRefs.current[k], pos[e[0]], pos[e[1]]);
			if (graphRefs.current[k])
				graphRefs.current[k].style.opacity = graphOp * 0.55;
			if (glowRefs.current[k])
				glowRefs.current[k].style.opacity = graphOp * 0.5;
		});
		if (thumbRef.current) thumbRef.current.style.left = `${(p / LAST) * 100}%`;
		if (fillRef.current) fillRef.current.style.width = `${(p / LAST) * 100}%`;
		const near = clamp(Math.round(p), 0, LAST);
		setActive(prev => (prev === near ? prev : near));
	};

	useMotionValueEvent(progress, 'change', render);
	useLayoutEffect(() => {
		render(progress.get());
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Gentle auto-play (ping-pong) until the reader takes over, then it's theirs.
	useEffect(() => {
		if (!autoplay || reduced || touched.current) return undefined;
		let cur = clamp(Math.round(progress.get()), 0, LAST);
		let dir = cur >= LAST ? -1 : 1;
		const id = setInterval(() => {
			if (touched.current) {
				clearInterval(id);
				return;
			}
			cur += dir;
			if (cur >= LAST) dir = -1;
			else if (cur <= 0) dir = 1;
			animate(progress, cur, SPRING);
		}, 2800);
		return () => clearInterval(id);
	}, [autoplay, reduced, progress]);

	const takeOver = () => {
		touched.current = true;
		if (autoplay) setAutoplay(false);
	};
	const settle = () =>
		animate(
			progress,
			clamp(Math.round(progress.get()), 0, LAST),
			reduced ? { duration: 0 } : SPRING
		);
	const goTo = i => {
		takeOver();
		animate(progress, i, reduced ? { duration: 0 } : SPRING);
	};
	const scrubFrom = clientX => {
		const r = trackRef.current.getBoundingClientRect();
		progress.set(clamp((clientX - r.left) / r.width, 0, 1) * LAST);
	};
	const onDown = e => {
		takeOver();
		try {
			e.currentTarget.setPointerCapture?.(e.pointerId);
		} catch {
			/* no-op */
		}
		scrubFrom(e.clientX);
	};
	const onMove = e => {
		if (e.buttons) scrubFrom(e.clientX);
	};
	const onUp = e => {
		try {
			e.currentTarget.releasePointerCapture?.(e.pointerId);
		} catch {
			/* no-op */
		}
		settle();
	};
	const onKey = e => {
		if (e.key === 'ArrowRight') {
			e.preventDefault();
			goTo(clamp(active + 1, 0, LAST));
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			goTo(clamp(active - 1, 0, LAST));
		}
	};

	const stop = STOPS[active];

	return (
		<div className={styles.page}>
			<header className={styles.nav}>
				<a className={styles.brand} href="/">
					<span className={styles.mark} aria-hidden="true" />
					<span className={styles.brandName}>AlgDatViz</span>
					<span className={styles.brandCourse}>TDT4120</span>
				</a>
				<nav className={styles.navLinks} aria-label="Primary">
					<span data-active="true">Home</span>
					<span>Path</span>
					<span>Review</span>
					<span>Exam</span>
				</nav>
			</header>

			<main className={styles.hero}>
				<div className={styles.intro}>
					<p className={styles.eyebrow}>Interactive · TDT4120</p>
					<h1 className={styles.title}>
						One dataset.
						<br />
						Every structure.
					</h1>
					<p className={styles.sub}>
						These fourteen values never change — only how you read them. Drag
						through the structures and watch the same data become an array, a
						heap, a graph.
					</p>

					<div className={styles.readout} aria-live="polite">
						<span className={styles.readoutName}>{stop.name}</span>
						<span className={styles.readoutNote}>{stop.note}</span>
						<span className={styles.readoutCost}>{stop.cost}</span>
					</div>

					<button
						type="button"
						className={styles.cta}
						onClick={() => goTo(active >= LAST ? 0 : active + 1)}
					>
						{active >= LAST
							? 'Back to the start'
							: `See it as a ${STOPS[active + 1].name.toLowerCase()}`}
						<ArrowRight size={16} strokeWidth={2} />
					</button>
				</div>

				<figure className={styles.stage}>
					<div className={styles.plate}>
						<svg
							className={styles.svg}
							viewBox={`0 0 ${W} 440`}
							preserveAspectRatio="xMidYMid meet"
							aria-hidden="true"
						>
							{/* baseline the bars rest on */}
							<line
								className={styles.baseline}
								x1={MX - 16}
								y1={BASE}
								x2={W - MX + 16}
								y2={BASE}
							/>
							{/* graph-edge glow (under), lit only near the graph stop */}
							<g className={styles.glowLayer}>
								{graphEdges.map((e, k) => (
									<line
										key={`gl-${k}`}
										ref={el => (glowRefs.current[k] = el)}
										className={styles.glow}
									/>
								))}
							</g>
							{/* ink edges */}
							<g>
								{treeEdges.map((e, k) => (
									<line
										key={`te-${k}`}
										ref={el => (treeRefs.current[k] = el)}
										className={styles.edge}
									/>
								))}
								{graphEdges.map((e, k) => (
									<line
										key={`ge-${k}`}
										ref={el => (graphRefs.current[k] = el)}
										className={styles.edge}
									/>
								))}
							</g>
							{/* atoms — value-bearing tokens, conserved across every structure */}
							<g>
								{VALUES.map((v, i) => (
									<g
										key={i}
										ref={el => (atomRefs.current[i] = el)}
										className={`${styles.atom} ${i === 0 ? styles.atomLead : ''}`}
									>
										<rect
											ref={el => (barRefs.current[i] = el)}
											className={styles.bar}
											x={-2}
											y={0}
											width={4}
											rx={2}
										/>
										<circle className={styles.dot} r={12} />
										<text className={styles.value} dy="0.34em">
											{v}
										</text>
									</g>
								))}
							</g>
						</svg>
					</div>

					<div className={styles.scrub}>
						<div
							className={styles.track}
							ref={trackRef}
							role="slider"
							tabIndex={0}
							aria-label="Structure"
							aria-valuemin={0}
							aria-valuemax={LAST}
							aria-valuenow={active}
							aria-valuetext={stop.name}
							onPointerDown={onDown}
							onPointerMove={onMove}
							onPointerUp={onUp}
							onKeyDown={onKey}
						>
							<span className={styles.trackBase} />
							<span className={styles.trackFill} ref={fillRef} />
							{STOPS.map((s, i) => (
								<button
									key={s.name}
									type="button"
									className={styles.stopDot}
									style={{ left: `${(i / LAST) * 100}%` }}
									data-active={i === active ? 'true' : undefined}
									onClick={() => goTo(i)}
									aria-label={s.name}
									tabIndex={-1}
								/>
							))}
							<span
								className={styles.thumb}
								ref={thumbRef}
								aria-hidden="true"
							/>
						</div>
						<div className={styles.stopLabels}>
							{STOPS.map((s, i) => (
								<button
									key={s.name}
									type="button"
									className={styles.stopLabel}
									data-active={i === active ? 'true' : undefined}
									onClick={() => goTo(i)}
								>
									{s.name}
								</button>
							))}
						</div>
						<p className={styles.hint}>↔ drag to morph · or pick a structure</p>
					</div>
				</figure>
			</main>

			<footer className={styles.path}>
				<span className={styles.pathLabel}>The path</span>
				<ul className={styles.pathList}>
					{PATH_TOPICS.map(t => (
						<li key={t.id} className={styles.pathItem}>
							<span className={styles.pathNum}>{t.number}</span>
							<span className={styles.pathName}>{t.name}</span>
						</li>
					))}
					<li className={styles.pathMore}>+11 more</li>
				</ul>
			</footer>
		</div>
	);
};

export default LabStudio;
