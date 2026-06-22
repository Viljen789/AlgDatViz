import { useEffect, useMemo, useRef, useState } from 'react';
import {
	motion as Motion,
	useReducedMotion,
	useMotionValue,
	useSpring,
	useTransform,
} from 'framer-motion';
import {
	Home,
	Route as RouteIcon,
	RotateCcw,
	GraduationCap,
	ArrowRight,
	MousePointer2,
	Sparkles,
} from 'lucide-react';
import { CURRICULUM } from '../../data/curriculum.js';
import styles from './LabKinetic.module.css';

// ---------------------------------------------------------------------------
// One conserved dataset — 14 tokens — that re-forms through three structures.
// Values double as the height of each "brick" so the array reading stays true,
// while the tree/graph layouts reuse the *same* token identities (by id).
// ---------------------------------------------------------------------------
const VALUES = [6, 10, 2, 13, 4, 8, 0, 11, 5, 9, 1, 12, 7, 3];

const TOKENS = VALUES.map((v, i) => ({ id: i, value: v }));

// Vivid triadic sticker palette assigned by value-band so the same token keeps
// a stable colour across every structure (colour encodes magnitude, not order).
const BANDS = [
	'var(--k-grape)',
	'var(--k-tangerine)',
	'var(--k-mint)',
	'var(--k-bubble)',
];
const colourFor = value => BANDS[Math.floor((value / 14) * BANDS.length)];

// Stage geometry (the animation canvas is a 0..1000 x 0..560 design box that
// the SVG-free absolute layout maps into via percentages).
const STAGE_W = 1000;
const STAGE_H = 560;

// ---- ARRAY layout: a row of chunky bars along the floor ----
const arrayLayout = () => {
	const n = TOKENS.length;
	const gap = 16;
	const slot = (STAGE_W - gap * (n + 1)) / n;
	const baseY = STAGE_H - 70;
	return TOKENS.map((t, i) => {
		const h = 70 + (t.value / 13) * 300;
		return {
			x: gap + i * (slot + gap) + slot / 2,
			y: baseY - h / 2,
			w: slot,
			h,
			rot: 0,
		};
	});
};

// ---- TREE layout: a binary heap shape, level by level ----
const treeLayout = () => {
	const levels = [1, 2, 4, 7]; // 1+2+4+7 = 14
	const topPad = 70;
	const levelGap = (STAGE_H - topPad - 80) / (levels.length - 1);
	const node = 60;
	const pos = [];
	let idx = 0;
	levels.forEach((count, lvl) => {
		const span = STAGE_W * (0.18 + lvl * 0.22);
		const left = (STAGE_W - span) / 2;
		const step = count > 1 ? span / (count - 1) : 0;
		for (let c = 0; c < count && idx < TOKENS.length; c++, idx++) {
			pos[idx] = {
				x: count > 1 ? left + c * step : STAGE_W / 2,
				y: topPad + lvl * levelGap,
				w: node,
				h: node,
				rot: 0,
			};
		}
	});
	return pos;
};

// ---- GRAPH layout: a loose constellation on two orbits ----
const graphLayout = () => {
	const cx = STAGE_W / 2;
	const cy = STAGE_H / 2 - 6;
	const node = 58;
	return TOKENS.map((t, i) => {
		const ring = i % 3 === 0 ? 0 : 1;
		const inRing = ring === 0 ? 5 : 9;
		// stable index within the ring
		const seq =
			TOKENS.slice(0, i + 1).filter((_, j) =>
				ring === 0 ? j % 3 === 0 : j % 3 !== 0
			).length - 1;
		const radius = ring === 0 ? 110 : 235;
		const angle = (seq / inRing) * Math.PI * 2 + (ring === 0 ? 0 : 0.4);
		const wobble = ((t.value % 5) - 2) * 8;
		return {
			x: cx + Math.cos(angle) * (radius + wobble) * 1.5,
			y: cy + Math.sin(angle) * (radius + wobble),
			w: node,
			h: node,
			rot: 0,
		};
	});
};

const LAYOUTS = {
	array: arrayLayout(),
	tree: treeLayout(),
	graph: graphLayout(),
};

// Edges drawn between conserved tokens in tree + graph stages (by token id).
const TREE_EDGES = [
	[0, 1],
	[0, 2],
	[1, 3],
	[1, 4],
	[2, 5],
	[2, 6],
	[3, 7],
	[3, 8],
	[4, 9],
	[4, 10],
	[5, 11],
	[5, 12],
	[6, 13],
];
const GRAPH_EDGES = [
	[0, 3],
	[3, 6],
	[6, 9],
	[9, 12],
	[12, 0],
	[0, 1],
	[3, 4],
	[6, 7],
	[9, 10],
	[12, 13],
	[1, 5],
	[4, 8],
	[7, 11],
	[10, 2],
];

const STAGES = ['array', 'tree', 'graph'];
const STAGE_LABEL = {
	array: 'Array',
	tree: 'Tree / Heap',
	graph: 'Graph',
};
const STAGE_CAPTION = {
	array: 'fourteen bricks, one per value',
	tree: 'the same fourteen, stacked as a heap',
	graph: 'and again — flung into a constellation',
};

// Spring presets — the personality of the whole piece.
const SNAP = { type: 'spring', stiffness: 320, damping: 18, mass: 0.7 };
const SNAP_SOFT = { type: 'spring', stiffness: 220, damping: 20, mass: 0.8 };

// A handful of real curriculum topics for the rail.
const RAIL_TOPICS = [
	CURRICULUM[0],
	CURRICULUM[3],
	CURRICULUM[8],
	CURRICULUM[9],
	CURRICULUM[12],
	CURRICULUM[15],
];

const RAIL_COLOURS = [
	'var(--k-grape)',
	'var(--k-tangerine)',
	'var(--k-mint)',
	'var(--k-bubble)',
	'var(--k-grape)',
	'var(--k-tangerine)',
];

// ---------------------------------------------------------------------------
// A single conserved token. Draggable; springs back to its slot on release.
// ---------------------------------------------------------------------------
function Token({ token, slot, stage, reduced, onPoke }) {
	const colour = colourFor(token.value);
	const fontScale = stage === 'array' ? 1 : 1.15;

	// Drag offset relative to the slot anchor.
	const dx = useMotionValue(0);
	const dy = useMotionValue(0);
	// Tilt the brick toward the drag direction for a physical feel.
	const rot = useTransform([dx, dy], ([x, y]) => (x + y) * 0.04);
	const springRot = useSpring(rot, { stiffness: 200, damping: 12 });

	const animate = reduced
		? {
				left: `${(slot.x / STAGE_W) * 100}%`,
				top: `${(slot.y / STAGE_H) * 100}%`,
				opacity: 1,
			}
		: {
				left: `${(slot.x / STAGE_W) * 100}%`,
				top: `${(slot.y / STAGE_H) * 100}%`,
				width: `${(slot.w / STAGE_W) * 100}%`,
				height:
					stage === 'array'
						? `${(slot.h / STAGE_H) * 100}%`
						: `${(slot.h / STAGE_H) * 100}%`,
				opacity: 1,
			};

	return (
		<Motion.div
			className={styles.token}
			data-stage={stage}
			style={{
				background: colour,
				x: dx,
				y: dy,
				rotate: reduced ? 0 : springRot,
				width: `${(slot.w / STAGE_W) * 100}%`,
				height: `${(slot.h / STAGE_H) * 100}%`,
			}}
			initial={{
				left: '50%',
				top: '-20%',
				opacity: 0,
				scale: 0.4,
			}}
			animate={{ ...animate, scale: 1 }}
			transition={
				reduced
					? { duration: 0 }
					: {
							...SNAP,
							scale: { ...SNAP, delay: (token.id % 7) * 0.012 },
							left: { ...SNAP, delay: (token.id % 7) * 0.018 },
							top: { ...SNAP, delay: (token.id % 7) * 0.018 },
						}
			}
			drag={!reduced}
			dragSnapToOrigin
			dragElastic={0.55}
			dragTransition={{ bounceStiffness: 380, bounceDamping: 16 }}
			whileTap={{ scale: 1.18, zIndex: 50, cursor: 'grabbing' }}
			whileHover={reduced ? undefined : { scale: 1.1, zIndex: 40 }}
			onDragStart={onPoke}
		>
			<span
				className={styles.tokenLabel}
				style={{ fontSize: `calc(${fontScale}rem + 0.4vw)` }}
			>
				{token.value}
			</span>
		</Motion.div>
	);
}

// ---------------------------------------------------------------------------
// Edge layer — thick rounded connectors between conserved tokens.
// ---------------------------------------------------------------------------
function Edges({ stage, reduced }) {
	const edges =
		stage === 'tree' ? TREE_EDGES : stage === 'graph' ? GRAPH_EDGES : [];
	const layout = LAYOUTS[stage] || [];
	return (
		<svg
			className={styles.edgeLayer}
			viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			{edges.map(([a, b], i) => {
				const pa = layout[a];
				const pb = layout[b];
				if (!pa || !pb) return null;
				return (
					<Motion.line
						key={`${stage}-${a}-${b}`}
						x1={pa.x}
						y1={pa.y}
						x2={pb.x}
						y2={pb.y}
						className={styles.edge}
						initial={reduced ? false : { pathLength: 0, opacity: 0 }}
						animate={{ pathLength: 1, opacity: 1 }}
						transition={
							reduced
								? { duration: 0 }
								: { ...SNAP_SOFT, delay: 0.15 + i * 0.03 }
						}
					/>
				);
			})}
		</svg>
	);
}

// ---------------------------------------------------------------------------
// Main showcase component.
// ---------------------------------------------------------------------------
export default function LabKinetic() {
	const reduced = useReducedMotion();
	const [stageIdx, setStageIdx] = useState(0);
	const [autoplay, setAutoplay] = useState(true);
	const [poke, setPoke] = useState(0); // bumps a little "wobble" reaction
	const timerRef = useRef(null);

	const stage = STAGES[stageIdx];
	const layout = LAYOUTS[stage];

	// Auto-cycle the three structures unless the user has taken manual control
	// or prefers reduced motion.
	useEffect(() => {
		if (reduced || !autoplay) return undefined;
		timerRef.current = window.setInterval(() => {
			setStageIdx(i => (i + 1) % STAGES.length);
		}, 3200);
		return () => {
			if (timerRef.current) window.clearInterval(timerRef.current);
		};
	}, [reduced, autoplay]);

	const selectStage = idx => {
		setAutoplay(false);
		setStageIdx(idx);
		if (timerRef.current) window.clearInterval(timerRef.current);
	};

	const handlePoke = () => setPoke(p => p + 1);

	const navItems = useMemo(
		() => [
			{ label: 'Home', icon: Home },
			{ label: 'Path', icon: RouteIcon },
			{ label: 'Review', icon: RotateCcw },
			{ label: 'Exam', icon: GraduationCap },
		],
		[]
	);

	return (
		<div className={styles.root}>
			{/* floating sticker blobs in the background */}
			<div className={styles.bgField} aria-hidden="true">
				<span className={styles.blob} data-b="1" />
				<span className={styles.blob} data-b="2" />
				<span className={styles.blob} data-b="3" />
			</div>

			{/* ----- NAV ----- */}
			<header className={styles.nav}>
				<a className={styles.wordmark} href="#top">
					<span className={styles.mark} aria-hidden="true">
						<span className={styles.markDot} data-d="1" />
						<span className={styles.markDot} data-d="2" />
						<span className={styles.markDot} data-d="3" />
					</span>
					<span className={styles.wordmarkText}>
						AlgDatViz
						<small>TDT4120</small>
					</span>
				</a>
				<nav className={styles.navLinks} aria-label="Primary">
					{navItems.map((item, i) => {
						const NavIcon = item.icon;
						return (
							<Motion.a
								key={item.label}
								href={`#${item.label.toLowerCase()}`}
								className={styles.navLink}
								data-active={i === 0 ? 'true' : undefined}
								whileHover={reduced ? undefined : { y: -3, scale: 1.05 }}
								whileTap={{ scale: 0.94 }}
								transition={SNAP}
							>
								<NavIcon size={16} strokeWidth={2.6} aria-hidden="true" />
								{item.label}
							</Motion.a>
						);
					})}
				</nav>
			</header>

			{/* ----- HERO ----- */}
			<main className={styles.hero} id="top">
				<div className={styles.heroCopy}>
					<Motion.span
						className={styles.kicker}
						initial={reduced ? false : { opacity: 0, x: -24, rotate: -6 }}
						animate={{ opacity: 1, x: 0, rotate: -3 }}
						transition={{ ...SNAP, delay: 0.05 }}
					>
						<Sparkles size={15} strokeWidth={2.6} aria-hidden="true" />
						one dataset · every structure
					</Motion.span>

					<h1 className={styles.headline}>
						<Motion.span
							className={styles.hWord}
							initial={reduced ? false : { y: 40, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							transition={{ ...SNAP, delay: 0.08 }}
						>
							Fourteen
						</Motion.span>{' '}
						<Motion.span
							className={`${styles.hWord} ${styles.hPop}`}
							initial={reduced ? false : { y: 40, opacity: 0, rotate: -4 }}
							animate={{ y: 0, opacity: 1, rotate: -2 }}
							transition={{ ...SNAP, delay: 0.16 }}
						>
							numbers,
						</Motion.span>
						<br />
						<Motion.span
							className={styles.hWord}
							initial={reduced ? false : { y: 40, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							transition={{ ...SNAP, delay: 0.24 }}
						>
							the whole
						</Motion.span>{' '}
						<Motion.span
							className={`${styles.hWord} ${styles.hUnder}`}
							initial={reduced ? false : { y: 40, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							transition={{ ...SNAP, delay: 0.32 }}
						>
							course.
						</Motion.span>
					</h1>

					<Motion.p
						className={styles.sub}
						initial={reduced ? false : { opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ ...SNAP_SOFT, delay: 0.4 }}
					>
						Watch a single set of tokens snap from an array into a heap into a
						graph — the same data, re-formed for every algorithm in TDT4120.
						Grab a brick and toss it. It springs right back.
					</Motion.p>

					<Motion.div
						className={styles.ctaRow}
						initial={reduced ? false : { opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ ...SNAP_SOFT, delay: 0.48 }}
					>
						<Motion.a
							href="#path"
							className={styles.ctaPrimary}
							whileHover={reduced ? undefined : { y: -4, scale: 1.04 }}
							whileTap={{ scale: 0.95, y: 0 }}
							transition={SNAP}
						>
							Start the path
							<ArrowRight size={18} strokeWidth={3} aria-hidden="true" />
						</Motion.a>
						<span className={styles.dragHint}>
							<MousePointer2 size={15} strokeWidth={2.6} aria-hidden="true" />
							drag a brick
						</span>
					</Motion.div>
				</div>

				{/* ----- SIGNATURE ANIMATION ----- */}
				<div className={styles.stageWrap}>
					<Motion.div
						className={styles.stage}
						aria-label={`Animated stage showing the data as a ${STAGE_LABEL[stage]}`}
						animate={
							reduced
								? undefined
								: poke
									? { rotate: [0, -0.8, 0.8, 0] }
									: undefined
						}
						transition={{ duration: 0.5 }}
						key="stage"
					>
						<Edges stage={stage} reduced={reduced} />
						<div className={styles.floor} data-show={stage === 'array'} />
						{TOKENS.map(token => (
							<Token
								key={token.id}
								token={token}
								slot={layout[token.id]}
								stage={stage}
								reduced={reduced}
								onPoke={handlePoke}
							/>
						))}
					</Motion.div>

					{/* stage caption + segmented control */}
					<div className={styles.stageBar}>
						<div className={styles.stageCaption}>
							<strong>{STAGE_LABEL[stage]}</strong>
							<span>{STAGE_CAPTION[stage]}</span>
						</div>
						<div
							className={styles.segmented}
							role="tablist"
							aria-label="Structure"
						>
							{STAGES.map((s, i) => (
								<button
									key={s}
									type="button"
									role="tab"
									aria-selected={i === stageIdx}
									className={styles.seg}
									data-active={i === stageIdx}
									onClick={() => selectStage(i)}
								>
									{i === stageIdx && (
										<Motion.span
											layoutId="segPill"
											className={styles.segPill}
											transition={SNAP}
										/>
									)}
									<span className={styles.segText}>{STAGE_LABEL[s]}</span>
								</button>
							))}
						</div>
					</div>
				</div>
			</main>

			{/* ----- CURRICULUM RAIL ----- */}
			<section className={styles.rail} id="path" aria-label="Curriculum">
				<div className={styles.railHead}>
					<h2 className={styles.railTitle}>The run of show</h2>
					<p className={styles.railSub}>
						Sixteen topics, one continuous thread. Here are six of them.
					</p>
				</div>
				<div className={styles.cards}>
					{RAIL_TOPICS.map((topic, i) => (
						<Motion.a
							key={topic.id}
							href={topic.to}
							className={styles.card}
							style={{ '--card-accent': RAIL_COLOURS[i] }}
							initial={reduced ? false : { y: 48, opacity: 0, rotate: -2 }}
							whileInView={{ y: 0, opacity: 1, rotate: i % 2 ? 1.5 : -1.5 }}
							viewport={{ once: true, margin: '-60px' }}
							transition={
								reduced ? { duration: 0 } : { ...SNAP, delay: i * 0.06 }
							}
							whileHover={
								reduced ? undefined : { y: -10, rotate: 0, scale: 1.03 }
							}
							whileTap={{ scale: 0.97 }}
						>
							<span className={styles.cardNum}>{topic.number}</span>
							<span className={styles.cardName}>{topic.name}</span>
							<span className={styles.cardQuote}>{topic.pullQuote}</span>
							<span className={styles.cardFoot}>
								<code className={styles.cardCx}>{topic.complexity}</code>
								<span className={styles.cardPhase}>{topic.phase}</span>
							</span>
						</Motion.a>
					))}
				</div>
			</section>

			<footer className={styles.foot}>
				<span>AlgDatViz · a kinetic study lab for TDT4120</span>
				<span className={styles.footTag}>/lab · throwaway exploration</span>
			</footer>
		</div>
	);
}
