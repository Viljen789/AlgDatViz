import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { Play, RotateCcw } from 'lucide-react';
import StepControlBar from '../../../common/StepControlBar/StepControlBar.jsx';
import useReducedMotion from '../../../hooks/useReducedMotion.js';
import {
	FrameTrace,
	PseudoState,
	usePlayback,
} from '../../../common/PlaybackEngine/index.js';
import {
	DISCIPLINE_ORDER,
	DISCIPLINES,
	ONE_FRONTIER_PSEUDO,
	buildOneFrontierTrace,
	formatKey,
	idleFrame,
} from '../oneFrontier.js';
import styles from './OneFrontier.module.css';

// Only ScrollTrigger is registered globally (in HomePage). Flip drives the
// frontier morph on a discipline swap; registering is idempotent.
gsap.registerPlugin(Flip);

// ── The ONE shared graph all four disciplines run on ──────────────────────────
//
// Weighted + connected so every discipline is meaningful (BFS/DFS ignore the
// weights; Dijkstra/Prim use them). Weights are distinct ⇒ a unique MST, so
// "min-edge builds THE minimum spanning tree" is literally true. Positions are
// hand-placed on a 0..100 × 0..70 canvas so edges rarely cross.
const NODES = [
	{ id: 'A', x: 14, y: 16 },
	{ id: 'B', x: 44, y: 8 },
	{ id: 'C', x: 80, y: 14 },
	{ id: 'D', x: 18, y: 52 },
	{ id: 'E', x: 50, y: 40 },
	{ id: 'F', x: 84, y: 50 },
	{ id: 'G', x: 50, y: 66 },
];

const EDGES = [
	{ from: 'A', to: 'B', weight: 2 },
	{ from: 'A', to: 'D', weight: 3 },
	{ from: 'B', to: 'C', weight: 9 },
	{ from: 'B', to: 'E', weight: 4 },
	{ from: 'C', to: 'F', weight: 5 },
	{ from: 'D', to: 'E', weight: 8 },
	{ from: 'D', to: 'G', weight: 12 },
	{ from: 'E', to: 'F', weight: 6 },
	{ from: 'E', to: 'G', weight: 7 },
	{ from: 'F', to: 'G', weight: 10 },
	{ from: 'C', to: 'E', weight: 11 },
];

const GRAPH = { nodes: NODES, edges: EDGES };
const POS = Object.fromEntries(NODES.map(n => [n.id, n]));
const START = 'A';

const VIEW_W = 100;
const VIEW_H = 74;
const NODE_R = 6;

const SPEED_OPTIONS = [
	{ value: 1500, label: '0.5×' },
	{ value: 950, label: '1×' },
	{ value: 500, label: '2×' },
	{ value: 220, label: '5×' },
];

// The graph SPEED_OPTIONS are per-frame delays in ms (lower = faster).
const speedToDelay = speed => speed;

// Undirected edge key (order-independent) for tree / consider highlighting.
const undirKey = (a, b) => [a, b].sort().join('--');
const treeKeysOf = tree => {
	const s = new Set();
	(tree || []).forEach(e => s.add(undirKey(e.from, e.to)));
	return s;
};

// Frontier SHAPE per discipline: a LIFO stack reads as a vertical pile (newest on
// top), everything else as a horizontal lane. The pile<->lane difference is the
// real layout delta GSAP Flip interpolates on a discipline swap — the surface's
// "same elements, re-disciplined" claim made literal. (PQ disciplines stay a lane
// but their chips arrive key-sorted, so the reorder is the visible re-sort.)
const isPile = discipline => discipline === 'lifo';

/**
 * OneFrontier — the signature "one frontier, four algorithms" interactive.
 *
 * One shared weighted graph, one generic traversal loop, and a swappable
 * frontier discipline. Switching the discipline (queue / stack / min-dist PQ /
 * min-edge PQ) re-runs THE SAME loop — and visibly becomes BFS / DFS / Dijkstra
 * / Prim. Driven by the shared PlaybackEngine (step / scrub / replay / speed +
 * scoped keyboard); the live frontier contents, the settle order, the resulting
 * tree, and the synced pseudocode (PseudoState) all update in lockstep. The
 * trace comes from the pure, unit-tested genericTraverse, so the picture and the
 * algorithm never drift.
 */
const OneFrontier = ({ onUserInteract }) => {
	const playerRef = useRef(null);
	const reducedMotion = useReducedMotion();

	// The frontier chip strip — the Flip shared-element set. `flipCtxRef` is one
	// persistent gsap.context scoped to the shell so every morph is torn down on
	// unmount; `pendingFlipRef` carries the pre-swap Flip.getState across React's
	// commit so Flip.from runs against the freshly committed (start-frame) chips.
	const chipsWrapperRef = useRef(null);
	const flipCtxRef = useRef(null);
	const pendingFlipRef = useRef(null);

	const [discipline, setDiscipline] = useState('fifo');
	const [frames, setFrames] = useState(() => [
		idleFrame(GRAPH, { discipline: 'fifo', start: START }),
	]);

	const player = usePlayback(frames, { speed: 950, speedToDelay });
	const { currentStep, currentFrame, totalSteps, seek, play } = player;

	const meta = DISCIPLINES[discipline];
	const frame = currentFrame || frames[0];
	const canStep = totalSteps > 1;
	const activeLine = frame?.line ?? null;

	const notify = useCallback(() => onUserInteract?.(), [onUserInteract]);

	const runDiscipline = useCallback(nextDiscipline => {
		const { frames: nextFrames } = buildOneFrontierTrace(
			nextDiscipline,
			GRAPH,
			{
				start: START,
			}
		);
		if (nextFrames.length) setFrames(nextFrames);
	}, []);

	// When a fresh timeline arrives, jump to the start and play it.
	const framesKeyRef = useRef(null);
	useEffect(() => {
		if (frames.length <= 1) return;
		if (framesKeyRef.current === frames) return;
		framesKeyRef.current = frames;
		seek(0);
		play();
	}, [frames, seek, play]);

	// One persistent gsap.context scoped to the shell: the discipline-swap Flip is
	// add()-ed into it, so it is torn down cleanly on unmount and never leaks a
	// stuck tween. Created once on mount.
	useEffect(() => {
		flipCtxRef.current = gsap.context(() => {}, playerRef);
		return () => {
			flipCtxRef.current?.revert();
			flipCtxRef.current = null;
		};
	}, []);

	// After a discipline swap commits, morph the captured chip set into the new
	// orientation (pile<->lane) and, for the PQs, the new key-sorted order. This is
	// a layout effect so it runs against the freshly committed start-frame chips,
	// before paint and before the framesKeyRef effect kicks off seek(0)+play() —
	// so Flip animates the correct (start) frontier, never stale mid-run chips.
	useLayoutEffect(() => {
		const state = pendingFlipRef.current;
		if (!state) return;
		pendingFlipRef.current = null;
		const wrapper = chipsWrapperRef.current;
		// Run inside the persistent context so the tween is torn down on unmount;
		// fall back to a bare call if the context has not mounted yet.
		const runIn = fn => {
			const ctx = flipCtxRef.current;
			if (ctx) ctx.add(fn);
			else fn();
		};

		// Reduced motion: keep the end-state (orientation + PQ re-sort already
		// committed by React — the lesson) but drop the travel, leaving a brief
		// opacity cross-fade so the change still registers as an event.
		if (reducedMotion) {
			if (wrapper) {
				runIn(() =>
					gsap.fromTo(
						wrapper,
						{ opacity: 0.45 },
						{ opacity: 1, duration: 0.12, ease: 'power1.inOut' }
					)
				);
			}
			return;
		}

		// One calm settle: the chips slide/reorient from their old geometry to the
		// new, capped stagger so 7 chips read as a single reflow, not a cascade.
		// absolute:true frees them from flex-wrap during the tween; entering/leaving
		// chips fade only. power3.inOut + ~0.5s matches the BarView restraint.
		runIn(() =>
			Flip.from(state, {
				duration: 0.5,
				ease: 'power3.inOut',
				absolute: true,
				stagger: 0.03,
				onEnter: el => gsap.fromTo(el, { opacity: 0 }, { opacity: 1 }),
				onLeave: el => gsap.to(el, { opacity: 0 }),
			})
		);
	}, [discipline, reducedMotion]);

	const handleDisciplineChange = useCallback(
		id => {
			if (id === discipline) return;
			notify();
			// Capture the frontier's geometry BEFORE React re-renders, so the swap
			// becomes a Flip morph instead of a remount. We grab the wrapper plus
			// every live chip; whichever chip ids survive into the new start frame
			// (always the seed) morph across, and any that leave fade out. Doing this
			// before setDiscipline is what lets Flip.from interpolate the pile<->lane
			// reflow (and the PQ re-sort) the surface's thesis depends on.
			const wrapper = chipsWrapperRef.current;
			if (wrapper) {
				const chips = wrapper.querySelectorAll(`.${styles.chip}`);
				pendingFlipRef.current = Flip.getState([wrapper, ...chips], {
					props: 'opacity',
				});
			} else {
				pendingFlipRef.current = null;
			}
			setDiscipline(id);
			// Seek to 0 in the SAME batch as the re-run, so the new discipline's first
			// committed render is its START frontier (just the seed). That is the
			// after-state the Flip lands on; without it the chips would briefly show
			// frames[oldStep] of the new trace and then snap back to 0 (the framesKeyRef
			// effect replays from the start), i.e. Flip would morph stale content.
			seek(0);
			// Re-run the SAME loop with the new frontier discipline.
			runDiscipline(id);
		},
		[discipline, notify, seek, runDiscipline]
	);

	const handleRun = useCallback(() => {
		notify();
		runDiscipline(discipline);
	}, [notify, discipline, runDiscipline]);

	const handleReset = useCallback(() => {
		notify();
		const idle = [idleFrame(GRAPH, { discipline, start: START })];
		framesKeyRef.current = idle;
		setFrames(idle);
	}, [notify, discipline]);

	const handlePlayPause = useCallback(() => {
		notify();
		if (frames.length <= 1) {
			handleRun();
			return;
		}
		if (currentStep >= totalSteps - 1) {
			player.replay();
			return;
		}
		player.toggle();
	}, [notify, frames.length, currentStep, totalSteps, player, handleRun]);

	// Highlight sets from the current frame.
	const visitedSet = useMemo(() => new Set(frame?.visited || []), [frame]);
	const visitIndex = useMemo(() => {
		const m = new Map();
		(frame?.visited || []).forEach((id, i) => m.set(id, i + 1));
		return m;
	}, [frame]);
	const frontierIds = useMemo(
		() => new Set((frame?.frontier || []).map(x => x.id)),
		[frame]
	);
	const treeSet = useMemo(() => treeKeysOf(frame?.tree), [frame]);
	const considerKey = frame?.edge
		? undirKey(frame.edge.from, frame.edge.to)
		: null;
	const current = frame?.current;
	const accepted = frame?.accepted;
	const isWeighted = discipline === 'min-dist' || discipline === 'min-edge';

	const narration = frame?.description || frame?.title;
	const stateRows = frame?.state || [];

	// Live frontier as ordered chips (next-to-extract first).
	const frontierChips = frame?.frontier || [];

	return (
		<div className={styles.shell} ref={playerRef}>
			{/* ---------- Discipline toggle ---------- */}
			<div className={styles.controls}>
				<div
					className={styles.tabs}
					role="tablist"
					aria-label="Frontier discipline"
				>
					{DISCIPLINE_ORDER.map(id => {
						const d = DISCIPLINES[id];
						const active = id === discipline;
						return (
							<button
								key={id}
								type="button"
								role="tab"
								aria-selected={active}
								className={`${styles.tab} ${active ? styles.tabActive : ''}`}
								onClick={() => handleDisciplineChange(id)}
								title={d.oneLine}
							>
								<span className={styles.tabStructure}>{d.structure}</span>
								<span className={styles.tabArrow} aria-hidden="true">
									→
								</span>
								<span className={styles.tabAlgo}>{d.algorithm}</span>
							</button>
						);
					})}
				</div>

				<div className={styles.actions}>
					<button type="button" className={styles.runBtn} onClick={handleRun}>
						<Play size={13} strokeWidth={2.4} fill="currentColor" />
						<span>Run</span>
					</button>
					<button
						type="button"
						className={styles.resetBtn}
						onClick={handleReset}
						aria-label="Reset"
						title="Reset"
					>
						<RotateCcw size={14} strokeWidth={2} />
						<span>Reset</span>
					</button>
				</div>
			</div>

			<p className={styles.opLine}>
				<span className={styles.opLead}>extract()</span> {meta.extractRule}.{' '}
				{meta.oneLine}
			</p>

			{/* ---------- Stats ---------- */}
			<div className={styles.stats}>
				<div className={styles.stat}>
					<span className={styles.statValue}>{meta.structure}</span>
					<span className={styles.statLabel}>frontier</span>
				</div>
				<div className={styles.stat}>
					<span className={styles.statValue}>{meta.algorithm}</span>
					<span className={styles.statLabel}>becomes</span>
				</div>
				<div className={styles.stat}>
					<span className={styles.statValue}>{START}</span>
					<span className={styles.statLabel}>start</span>
				</div>
				<div className={styles.stat}>
					<span className={styles.statValue}>
						{frame?.visited?.length ?? 0}
					</span>
					<span className={styles.statLabel}>settled</span>
				</div>
			</div>

			{/* ---------- Canvas + trace ---------- */}
			<div className={styles.body}>
				<section className={styles.canvas} aria-label="One-frontier graph view">
					<div className={styles.canvasOverlay} aria-hidden="true">
						<span className={styles.mono}>{meta.algorithm}</span>
						{frame?.title && (
							<>
								<span className={styles.dot}>·</span>
								<span className={styles.mono}>{frame.title}</span>
							</>
						)}
					</div>

					<svg
						viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
						className={styles.svg}
						preserveAspectRatio="xMidYMid meet"
						role="img"
						aria-label={`${meta.fullName} on the shared graph`}
					>
						{/* Edges */}
						{EDGES.map(e => {
							const a = POS[e.from];
							const b = POS[e.to];
							const key = undirKey(e.from, e.to);
							const isTree = treeSet.has(key);
							const isConsider = considerKey === key;
							const cls = [styles.edge];
							if (isTree) cls.push(styles.edgeTree);
							if (isConsider)
								cls.push(accepted ? styles.edgeAccept : styles.edgeConsider);
							const mx = (a.x + b.x) / 2;
							const my = (a.y + b.y) / 2;
							return (
								<g key={key}>
									<line
										x1={a.x}
										y1={a.y}
										x2={b.x}
										y2={b.y}
										className={cls.join(' ')}
									/>
									{isWeighted && (
										<text
											x={mx}
											y={my}
											className={`${styles.weight} ${isConsider ? styles.weightHot : ''}`}
											textAnchor="middle"
											dominantBaseline="central"
										>
											{e.weight}
										</text>
									)}
								</g>
							);
						})}

						{/* Nodes */}
						{NODES.map(n => {
							const isSettled = visitedSet.has(n.id);
							const isFrontier = frontierIds.has(n.id);
							const isCurrent = n.id === current;
							const isStart = n.id === START;
							const cls = [styles.node];
							if (isSettled) cls.push(styles.nodeSettled);
							else if (isFrontier) cls.push(styles.nodeFrontier);
							if (isCurrent) cls.push(styles.nodeCurrent);
							if (isStart) cls.push(styles.nodeStart);
							const order = visitIndex.get(n.id);
							const keyVal = frame?.dist?.[n.id];
							return (
								<g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
									<circle r={NODE_R} className={cls.join(' ')} />
									<text
										className={styles.nodeText}
										textAnchor="middle"
										dominantBaseline="central"
									>
										{n.id}
									</text>
									{isSettled && order != null && (
										<text
											className={styles.orderBadge}
											x={NODE_R - 1}
											y={-NODE_R + 1}
											textAnchor="middle"
											dominantBaseline="central"
										>
											{order}
										</text>
									)}
									{/* Key label: depth (BFS/DFS) or distance/edge-weight (Dijkstra/Prim) */}
									{(isSettled || isFrontier) && (
										<text
											className={styles.keyLabel}
											textAnchor="middle"
											dominantBaseline="central"
											y={-NODE_R - 3}
										>
											{formatKey(discipline, keyVal)}
										</text>
									)}
								</g>
							);
						})}
					</svg>

					{/* Live frontier (next-to-extract first) */}
					<div className={styles.frontierBar} aria-label="Frontier contents">
						<span className={styles.frontierLabel}>
							frontier
							<span className={styles.frontierKind}>{meta.structure}</span>
						</span>
						<div
							ref={chipsWrapperRef}
							className={`${styles.frontierChips} ${
								isPile(discipline)
									? styles.frontierChipsPile
									: styles.frontierChipsLane
							}`}
						>
							{frontierChips.length === 0 ? (
								<span className={styles.frontierEmpty}>∅ empty</span>
							) : (
								frontierChips.map((it, idx) => (
									<span
										key={it.id}
										className={`${styles.chip} ${idx === 0 ? styles.chipNext : ''}`}
									>
										<span className={styles.chipId}>{it.id}</span>
										<span className={styles.chipKey}>
											{formatKey(discipline, it.key)}
										</span>
									</span>
								))
							)}
							{frontierChips.length > 0 && (
								<span className={styles.frontierArrow} aria-hidden="true">
									← extract() next
								</span>
							)}
						</div>
					</div>
				</section>

				<div className={styles.trace}>
					<FrameTrace
						eyebrow={`${meta.structure} → ${meta.algorithm}`}
						step={currentStep}
						totalSteps={totalSteps}
						narration={narration}
					/>
					<PseudoState
						className={styles.pseudo}
						lines={ONE_FRONTIER_PSEUDO}
						line={activeLine}
						state={stateRows}
						isRunning={activeLine != null}
						label="One loop"
						stateLabel="Live state"
						step={currentStep}
						totalSteps={totalSteps}
					/>
				</div>
			</div>

			{/* ---------- Transport ---------- */}
			<div className={styles.transport}>
				<StepControlBar
					isPlaying={player.isPlaying}
					canStep={canStep}
					currentStep={currentStep}
					totalSteps={totalSteps}
					speed={player.speed}
					speedOptions={SPEED_OPTIONS}
					onPlayPause={handlePlayPause}
					onStepBack={player.stepBack}
					onStepForward={player.stepForward}
					onSeek={seek}
					onFirst={player.first}
					onLast={player.last}
					onSpeedChange={player.setSpeed}
					scopeRef={playerRef}
				/>
			</div>
		</div>
	);
};

export default OneFrontier;
