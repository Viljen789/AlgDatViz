import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import {
	ArrowUpRight,
	Sparkles,
	Compass,
	Map as MapIcon,
	RotateCcw,
	GraduationCap,
} from 'lucide-react';
import { CURRICULUM } from '../../data/curriculum.js';
import styles from './LabAurora.module.css';

// ── Aurora Glass / Depth ──────────────────────────────────────────────
// Dark, atmospheric, premium-tech. A single conserved dataset of luminous
// nodes drifts and re-links through structures (array → heap-tree → graph
// constellation) in a soft-focus, depth-layered space. Nothing snaps;
// everything eases continuously. The aurora glow behind it never stops
// breathing. Motion character: SMOOTH & CONTINUOUS.
//
// Implementation note on the signature animation: rather than transform the
// node <g> elements directly (which would leave SVG <line> endpoints unable
// to follow), each token owns a plain JS state object {x,y,z}. GSAP tweens
// those numbers; a single rAF loop is the *only* writer to the DOM — it
// re-points the node transforms, the halos, the value text, AND the edge
// endpoints from one source of truth every frame. Edges therefore stay
// glued to node centres through every morph. One rAF, torn down on unmount.

const DATA = [6, 10, 2, 13, 4, 8, 0, 11, 5, 9, 1, 12, 7, 3];
const N = DATA.length;

// Six real curriculum topics, hand-picked to read like a course arc.
const FEATURED_IDS = [
	'foundations',
	'sorting',
	'heaps',
	'graphs',
	'shortest-paths',
	'np-completeness',
];

// The signature stage is laid out in an abstract 1000×620 space; the SVG
// viewBox matches, so it scales fluidly to any panel size.
const VW = 1000;
const VH = 620;

// ── Layout generators ─────────────────────────────────────────────────
// Each returns N positions with depth z∈[0,1] (bigger = nearer/brighter)
// plus the edge list defining that structure. The SAME N tokens are reused
// across all three — that is the "one dataset, every structure" thesis,
// expressed as continuous re-forming rather than a hard cut.

function layoutArray() {
	const pts = [];
	const margin = 92;
	const span = VW - margin * 2;
	const step = span / (N - 1);
	for (let i = 0; i < N; i++) {
		const v = DATA[i];
		const x = margin + i * step;
		const baseY = VH * 0.76;
		const y = baseY - (v / 13) * (VH * 0.5);
		const z = 0.45 + 0.34 * Math.sin((i / N) * Math.PI * 1.6);
		pts.push({ x, y, z });
	}
	const edges = [];
	for (let i = 0; i < N - 1; i++) edges.push([i, i + 1]);
	return { pts, edges };
}

function layoutHeap() {
	const pts = new Array(N);
	const cx = VW / 2;
	const topY = VH * 0.15;
	const levelGap = VH * 0.165;
	for (let i = 0; i < N; i++) {
		const level = Math.floor(Math.log2(i + 1));
		const levelStart = Math.pow(2, level) - 1;
		const indexInLevel = i - levelStart;
		const countInLevel = Math.pow(2, level);
		const levelWidth = VW * (0.2 + 0.17 * level);
		const slot = (indexInLevel + 0.5) / countInLevel;
		const x = cx - levelWidth / 2 + slot * levelWidth;
		const y = topY + level * levelGap;
		const z = 0.86 - level * 0.16;
		pts[i] = { x, y, z };
	}
	const edges = [];
	for (let i = 1; i < N; i++) edges.push([Math.floor((i - 1) / 2), i]);
	return { pts, edges };
}

function layoutGraph() {
	const pts = [];
	const cx = VW / 2;
	const cy = VH * 0.5;
	for (let i = 0; i < N; i++) {
		const ring = i % 2;
		const r = ring === 0 ? VW * 0.18 : VW * 0.33;
		const angle = (i / N) * Math.PI * 2 + (ring ? 0.35 : 0);
		const x = cx + Math.cos(angle) * r;
		const y = cy + Math.sin(angle) * r * 0.62;
		const z = (ring === 0 ? 0.86 : 0.5) + 0.08 * Math.cos(i * 1.7);
		pts.push({ x, y, z });
	}
	const edges = [
		[0, 1],
		[0, 2],
		[1, 3],
		[2, 4],
		[3, 5],
		[4, 6],
		[5, 7],
		[6, 8],
		[7, 9],
		[8, 10],
		[9, 11],
		[10, 12],
		[11, 13],
		[12, 13],
		[0, 6],
		[2, 8],
		[4, 10],
		[1, 9],
		[3, 11],
		[5, 13],
	];
	return { pts, edges };
}

const STRUCTURES = [
	{ key: 'array', label: 'array', generator: layoutArray },
	{ key: 'heap', label: 'heap', generator: layoutHeap },
	{ key: 'graph', label: 'graph', generator: layoutGraph },
];

const PALETTE = [
	'#7afcd6', // aurora teal
	'#8ab4ff', // glacial blue
	'#c5a8ff', // soft violet
	'#7afcd6',
	'#8ab4ff',
];
const colorFor = i => PALETTE[i % PALETTE.length];

const edgeKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

export default function LabAurora() {
	const rootRef = useRef(null);
	const stageRef = useRef(null);
	const nodeRefs = useRef([]);
	const haloRefs = useRef([]);
	const edgeMapRef = useRef(new Map()); // "a-b" -> <line>
	const [phase, setPhase] = useState(0); // index into STRUCTURES

	// Build all three layouts + the union of every edge once.
	const layoutsRef = useRef(null);
	if (!layoutsRef.current) {
		layoutsRef.current = STRUCTURES.map(s => s.generator());
	}
	const allEdgeKeysRef = useRef(null);
	if (!allEdgeKeysRef.current) {
		const set = new Set();
		layoutsRef.current.forEach(({ edges }) =>
			edges.forEach(([a, b]) => set.add(edgeKey(a, b)))
		);
		allEdgeKeysRef.current = [...set];
	}
	const allEdgeKeys = allEdgeKeysRef.current;

	// Single source of truth for node geometry. GSAP tweens these numbers;
	// the rAF loop is the only thing that writes them to the DOM.
	const stateRef = useRef(null);
	if (!stateRef.current) {
		const init = layoutsRef.current[0].pts;
		stateRef.current = init.map(p => ({
			x: p.x,
			y: p.y,
			z: p.z,
			// independent perpetual-drift phase so the field is alive between morphs
			dx: 0,
			dy: 0,
		}));
	}

	useLayoutEffect(() => {
		const reduce = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')
			.matches;

		const state = stateRef.current;
		const layouts = layoutsRef.current;
		const edgeMap = edgeMapRef.current;

		// Set edge opacities for a given structure (continuous fades).
		const setEdgesForPhase = (idx, instant = false) => {
			const active = new Set(layouts[idx].edges.map(([a, b]) => edgeKey(a, b)));
			edgeMap.forEach((line, key) => {
				const on = active.has(key);
				if (instant) {
					gsap.set(line, { opacity: on ? 0.5 : 0 });
				} else {
					gsap.to(line, {
						opacity: on ? 0.5 : 0,
						duration: on ? 2.0 : 1.1,
						ease: on ? 'power2.out' : 'power1.in',
						overwrite: 'auto',
					});
				}
			});
		};

		// ── The single rAF writer: positions, depth, edges, parallax ──
		let raf = 0;
		let pointerX = 0;
		let pointerY = 0;
		let tiltX = 0;
		let tiltY = 0;

		const render = () => {
			// ease the parallax tilt toward the pointer target (continuous)
			tiltX += (pointerX - tiltX) * 0.05;
			tiltY += (pointerY - tiltY) * 0.05;

			for (let i = 0; i < N; i++) {
				const s = state[i];
				const x = s.x + s.dx + tiltX * (0.4 + s.z * 0.6) * 36;
				const y = s.y + s.dy + tiltY * (0.4 + s.z * 0.6) * 26;
				const scale = 0.6 + s.z * 0.95;
				const node = nodeRefs.current[i];
				const halo = haloRefs.current[i];
				if (node) {
					node.setAttribute(
						'transform',
						`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(3)})`
					);
					node.style.opacity = (0.5 + s.z * 0.5).toFixed(3);
				}
				if (halo) {
					halo.setAttribute('cx', x.toFixed(2));
					halo.setAttribute('cy', y.toFixed(2));
					halo.setAttribute('r', (26 * scale).toFixed(2));
					halo.style.opacity = (0.14 + s.z * 0.4).toFixed(3);
				}
				// stash screen-space centre for edge drawing
				s._sx = x;
				s._sy = y;
			}

			// Edges glued to node centres (edges sit on the far/parallax layer,
			// so they use a slightly damped tilt for depth separation).
			edgeMap.forEach((line, key) => {
				const [a, b] = key.split('-').map(Number);
				const A = state[a];
				const B = state[b];
				line.setAttribute('x1', A._sx.toFixed(2));
				line.setAttribute('y1', A._sy.toFixed(2));
				line.setAttribute('x2', B._sx.toFixed(2));
				line.setAttribute('y2', B._sy.toFixed(2));
			});

			raf = requestAnimationFrame(render);
		};

		const ctx = gsap.context(() => {
			// Entrance: hero copy + chrome rise softly out of the dark.
			gsap.from(`.${styles.reveal}`, {
				y: 26,
				opacity: 0,
				duration: 1.1,
				ease: 'power3.out',
				stagger: 0.08,
				delay: 0.15,
			});
			gsap.from(`.${styles.card}`, {
				y: 34,
				opacity: 0,
				duration: 1.0,
				ease: 'power2.out',
				stagger: 0.07,
				delay: 0.5,
			});

			// Soft glow pulse on each core (always on, even in reduced motion off).
			nodeRefs.current.forEach((node, i) => {
				if (!node) return;
				const core = node.querySelector(`.${styles.core}`);
				const spark = node.querySelector(`.${styles.spark}`);
				if (core && !reduce) {
					gsap.to(core, {
						opacity: 0.62,
						duration: 2.2 + (i % 4) * 0.6,
						ease: 'sine.inOut',
						repeat: -1,
						yoyo: true,
						delay: i * 0.12,
					});
				}
				if (spark && !reduce) {
					gsap.to(spark, {
						scale: 1.5,
						transformOrigin: 'center',
						opacity: 0.7,
						duration: 1.8 + (i % 3) * 0.5,
						ease: 'sine.inOut',
						repeat: -1,
						yoyo: true,
						delay: i * 0.2,
					});
				}
			});

			if (reduce) {
				// Static fallback: settle on the graph constellation, no looping
				// motion. Snap state to the graph layout, draw its edges, render once.
				const g = layouts[2].pts;
				for (let i = 0; i < N; i++) {
					state[i].x = g[i].x;
					state[i].y = g[i].y;
					state[i].z = g[i].z;
					state[i].dx = 0;
					state[i].dy = 0;
				}
				setEdgesForPhase(2, true);
				setPhase(2);
				render(); // one frame; rAF keeps a gentle static refresh but no tweens
				return;
			}

			// ── Per-node perpetual drift (independent slow float) ──
			state.forEach((s, i) => {
				gsap.to(s, {
					dx: (i % 2 ? 1 : -1) * (10 + (i % 4) * 4),
					dy: (i % 3 ? -1 : 1) * (12 + (i % 3) * 5),
					duration: 6 + (i % 5) * 1.3,
					ease: 'sine.inOut',
					repeat: -1,
					yoyo: true,
				});
			});

			// ── The morph loop: re-form through array → heap → graph ──
			const morphTo = idx => {
				const pts = layouts[idx].pts;
				for (let i = 0; i < N; i++) {
					const p = pts[i];
					const s = state[i];
					// nearer nodes lead, far nodes trail → parallax in time
					gsap.to(s, {
						x: p.x,
						y: p.y,
						z: p.z,
						duration: 3.4,
						ease: 'power2.inOut',
						delay: (1 - p.z) * 0.5,
						overwrite: 'auto',
					});
				}
				setEdgesForPhase(idx);
			};

			setEdgesForPhase(0, true);
			setPhase(0);

			let phaseIdx = 0;
			const advance = () => {
				phaseIdx = (phaseIdx + 1) % STRUCTURES.length;
				setPhase(phaseIdx);
				morphTo(phaseIdx);
			};

			// A relaxed cadence — each structure holds, breathes, then re-forms.
			const loop = gsap.timeline({ repeat: -1 });
			loop
				.to({}, { duration: 4.6 })
				.add(advance)
				.to({}, { duration: 4.6 })
				.add(advance)
				.to({}, { duration: 4.6 })
				.add(advance);

			// kick off the single render loop
			raf = requestAnimationFrame(render);
		}, rootRef);

		// ── Ambient pointer parallax (target only; rAF eases toward it) ──
		const onMove = e => {
			const rect = rootRef.current?.getBoundingClientRect();
			if (!rect) return;
			pointerX = (e.clientX - rect.left) / rect.width - 0.5;
			pointerY = (e.clientY - rect.top) / rect.height - 0.5;
			if (stageRef.current) {
				gsap.to(stageRef.current, {
					rotateY: pointerX * 6,
					rotateX: -pointerY * 4.5,
					duration: 1.6,
					ease: 'power2.out',
					overwrite: 'auto',
				});
			}
		};
		const node = rootRef.current;
		if (!reduce) node?.addEventListener('pointermove', onMove);

		return () => {
			cancelAnimationFrame(raf);
			node?.removeEventListener('pointermove', onMove);
			ctx.revert();
		};
	}, []);

	const initial = layoutsRef.current[0];

	return (
		<div className={styles.root} ref={rootRef}>
			{/* ── Living aurora field (pure CSS, never stops breathing) ── */}
			<div className={styles.aurora} aria-hidden="true">
				<span className={`${styles.blob} ${styles.blobA}`} />
				<span className={`${styles.blob} ${styles.blobB}`} />
				<span className={`${styles.blob} ${styles.blobC}`} />
				<span className={`${styles.blob} ${styles.blobD}`} />
			</div>
			<div className={styles.grain} aria-hidden="true" />
			<div className={styles.vignette} aria-hidden="true" />

			{/* ── Top nav / wordmark ── */}
			<header className={styles.nav}>
				<div className={`${styles.brand} ${styles.reveal}`}>
					<span className={styles.brandMark} aria-hidden="true">
						<Sparkles size={16} strokeWidth={1.6} />
					</span>
					<span className={styles.brandText}>
						AlgDatViz <span className={styles.brandDot}>·</span>{' '}
						<span className={styles.brandSub}>TDT4120</span>
					</span>
				</div>
				<nav className={`${styles.navLinks} ${styles.reveal}`}>
					<a className={`${styles.navLink} ${styles.navActive}`} href="#home">
						<Compass size={14} strokeWidth={1.6} /> Home
					</a>
					<a className={styles.navLink} href="#path">
						<MapIcon size={14} strokeWidth={1.6} /> Path
					</a>
					<a className={styles.navLink} href="#review">
						<RotateCcw size={14} strokeWidth={1.6} /> Review
					</a>
					<a className={styles.navLink} href="#exam">
						<GraduationCap size={14} strokeWidth={1.6} /> Exam
					</a>
				</nav>
			</header>

			{/* ── Hero ── */}
			<main className={styles.hero}>
				<section className={styles.heroCopy}>
					<p className={`${styles.kicker} ${styles.reveal}`}>
						<span className={styles.kickerDot} /> one dataset · every structure
					</p>
					<h1 className={`${styles.headline} ${styles.reveal}`}>
						Watch fourteen numbers
						<br />
						<span className={styles.headlineGlow}>become every structure</span>
						<br />
						in the course.
					</h1>
					<p className={`${styles.support} ${styles.reveal}`}>
						A guided, interactive path through all of TDT4120 — the same
						conserved data drifting from array to heap to graph, so the shape of
						each idea is something you can see, not just memorise.
					</p>
					<div className={`${styles.ctaRow} ${styles.reveal}`}>
						<a className={styles.ctaPrimary} href="#path">
							Begin the path
							<ArrowUpRight size={17} strokeWidth={1.8} />
						</a>
						<a className={styles.ctaGhost} href="#review">
							How it works
						</a>
					</div>
					<dl className={`${styles.stats} ${styles.reveal}`}>
						<div className={styles.stat}>
							<dt>16</dt>
							<dd>topics</dd>
						</div>
						<div className={styles.statDiv} aria-hidden="true" />
						<div className={styles.stat}>
							<dt>5</dt>
							<dd>phases</dd>
						</div>
						<div className={styles.statDiv} aria-hidden="true" />
						<div className={styles.stat}>
							<dt>1</dt>
							<dd>dataset</dd>
						</div>
					</dl>
				</section>

				{/* ── THE SIGNATURE ANIMATION ── */}
				<section className={`${styles.stageWrap} ${styles.reveal}`}>
					<div className={styles.stageGlass}>
						<div className={styles.stageHeader}>
							<span className={styles.stageLabel}>now forming</span>
							<div className={styles.stageSteps}>
								{STRUCTURES.map((s, i) => (
									<span
										key={s.key}
										className={`${styles.stageStep} ${
											phase === i ? styles.stageStepActive : ''
										}`}
									>
										{s.label}
									</span>
								))}
							</div>
						</div>

						<div className={styles.stagePerspective}>
							<svg
								ref={stageRef}
								className={styles.stage}
								viewBox={`0 0 ${VW} ${VH}`}
								role="img"
								aria-label="A conserved set of fourteen luminous nodes drifting and re-linking through an array, a heap and a graph constellation."
								preserveAspectRatio="xMidYMid meet"
							>
								<defs>
									<radialGradient id="auroraNode" cx="50%" cy="42%" r="60%">
										<stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
										<stop offset="45%" stopColor="#aef6e6" stopOpacity="0.85" />
										<stop offset="100%" stopColor="#5fb8ff" stopOpacity="0.1" />
									</radialGradient>
									<filter
										id="softGlow"
										x="-90%"
										y="-90%"
										width="280%"
										height="280%"
									>
										<feGaussianBlur stdDeviation="9" result="b" />
										<feMerge>
											<feMergeNode in="b" />
											<feMergeNode in="SourceGraphic" />
										</feMerge>
									</filter>
								</defs>

								{/* Edge layer — drawn first so nodes sit above */}
								<g className={styles.edges}>
									{allEdgeKeys.map(key => {
										const [a, b] = key.split('-').map(Number);
										const pa = initial.pts[a];
										const pb = initial.pts[b];
										return (
											<line
												key={key}
												ref={el => {
													if (el) edgeMapRef.current.set(key, el);
												}}
												x1={pa.x}
												y1={pa.y}
												x2={pb.x}
												y2={pb.y}
												className={styles.edge}
											/>
										);
									})}
								</g>

								{/* Node halos — soft depth wash behind the cores */}
								<g className={styles.halos}>
									{initial.pts.map((p, i) => (
										<circle
											key={`halo-${i}`}
											ref={el => (haloRefs.current[i] = el)}
											cx={p.x}
											cy={p.y}
											r={26}
											fill={colorFor(i)}
											className={styles.halo}
										/>
									))}
								</g>

								{/* Node cores — the conserved tokens */}
								<g className={styles.nodes}>
									{initial.pts.map((p, i) => (
										<g
											key={`node-${i}`}
											ref={el => (nodeRefs.current[i] = el)}
											className={styles.node}
											transform={`translate(${p.x} ${p.y})`}
										>
											<circle
												r={22}
												fill="url(#auroraNode)"
												className={styles.glow}
												filter="url(#softGlow)"
											/>
											<circle
												r={13}
												fill={colorFor(i)}
												className={styles.core}
											/>
											<circle r={5.5} fill="#ffffff" className={styles.spark} />
											<text
												className={styles.nodeVal}
												dy="0.35em"
												textAnchor="middle"
											>
												{DATA[i]}
											</text>
										</g>
									))}
								</g>
							</svg>
						</div>

						<p className={styles.stageCaption}>
							The same fourteen tokens — never destroyed, only re-arranged.
						</p>
					</div>
				</section>
			</main>

			{/* ── Curriculum rail ── */}
			<section className={styles.curriculum} id="path">
				<div className={`${styles.curriculumHead} ${styles.reveal}`}>
					<h2>The path</h2>
					<p>Six waypoints across five phases of TDT4120.</p>
				</div>
				<div className={styles.rail}>
					{FEATURED_IDS.map(id => {
						const t = CURRICULUM.find(c => c.id === id);
						if (!t) return null;
						return (
							<a key={t.id} href={t.to} className={styles.card}>
								<div className={styles.cardGlow} aria-hidden="true" />
								<div className={styles.cardTop}>
									<span className={styles.cardNum}>{t.number}</span>
									<span className={styles.cardPhase}>{t.phase}</span>
								</div>
								<h3 className={styles.cardName}>{t.name}</h3>
								<p className={styles.cardQuote}>{t.pullQuote}</p>
								<div className={styles.cardFoot}>
									<span className={styles.cardCx}>{t.complexity}</span>
									<ArrowUpRight
										size={15}
										strokeWidth={1.7}
										className={styles.cardArrow}
									/>
								</div>
							</a>
						);
					})}
				</div>
			</section>
		</div>
	);
}
