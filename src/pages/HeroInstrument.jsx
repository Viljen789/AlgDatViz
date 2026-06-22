import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
	animate,
	useMotionValue,
	useMotionValueEvent,
	useReducedMotion,
} from 'framer-motion';
import styles from './HeroInstrument.module.css';

// The Home hero instrument: one conserved set of 14 values that the reader GRABS
// and scrubs between structures (drag the slider or click a stop). The same data
// the whole way — only how you read it changes. Calm, legible, controllable, in
// the app's own tokens (so it inherits dark mode + the per-topic hues); the graph
// state earns a soft glow. Replaces the old passive looping figure.

const VALUES = [6, 10, 2, 13, 4, 8, 0, 11, 5, 9, 1, 12, 7, 3];
const N = VALUES.length;
const W = 880;
const BASE = 392;
const MX = 64;
const STEP = (W - 2 * MX) / (N - 1);
const barOf = v => 26 + (v / 13) * 226;

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

// Each structure carries its course topic's signature hue (foundations / sorting /
// heaps / graphs), used for the soft wash behind the field — so the instrument
// speaks the app's per-topic palette as you scrub.
const STOPS = [
	{
		name: 'Array',
		note: 'Fourteen values, in the order they arrived.',
		cost: 'index · O(1)',
		hue: 'var(--topic-foundations-h)',
	},
	{
		name: 'Sorted',
		note: 'The same values, arranged by size.',
		cost: 'search · O(log n)',
		hue: 'var(--topic-sorting-h)',
	},
	{
		name: 'Heap',
		note: 'The same array, read as a complete tree.',
		cost: 'next-best · O(log n)',
		hue: 'var(--topic-heaps-h)',
	},
	{
		name: 'Graph',
		note: 'The same nodes, linked as a network.',
		cost: 'traverse · O(V + E)',
		hue: 'var(--topic-graphs-h)',
	},
];

const SPRING = { type: 'spring', stiffness: 170, damping: 24, mass: 0.9 };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, f) => a + (b - a) * f;

const HeroInstrument = ({ className }) => {
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
			l.style.opacity = treeOp * 0.55;
		});
		graphEdges.forEach((e, k) => {
			setLine(graphRefs.current[k], pos[e[0]], pos[e[1]]);
			setLine(glowRefs.current[k], pos[e[0]], pos[e[1]]);
			if (graphRefs.current[k])
				graphRefs.current[k].style.opacity = graphOp * 0.6;
			if (glowRefs.current[k])
				glowRefs.current[k].style.opacity = graphOp * 0.55;
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
		}, 3000);
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
		<figure
			className={`${styles.figure} ${className ?? ''}`}
			data-hero-instrument
			style={{ '--active-h': stop.hue }}
		>
			<div className={styles.plate}>
				<svg
					className={styles.svg}
					viewBox={`0 0 ${W} 440`}
					preserveAspectRatio="xMidYMid meet"
					aria-hidden="true"
				>
					<rect className={styles.wash} x="0" y="0" width={W} height="440" />
					<line
						className={styles.baseline}
						x1={MX - 16}
						y1={BASE}
						x2={W - MX + 16}
						y2={BASE}
					/>
					<g className={styles.glowLayer}>
						{graphEdges.map((e, k) => (
							<line
								key={`gl-${k}`}
								ref={el => (glowRefs.current[k] = el)}
								className={styles.glow}
							/>
						))}
					</g>
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
					aria-label="Read the dataset as a structure"
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
					<span className={styles.thumb} ref={thumbRef} aria-hidden="true" />
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
			</div>

			<figcaption className={styles.caption} aria-live="polite">
				<span className={styles.capName}>{stop.name}</span>
				<span className={styles.capNote}>{stop.note}</span>
				<span className={styles.capCost}>{stop.cost}</span>
			</figcaption>
		</figure>
	);
};

export default HeroInstrument;
