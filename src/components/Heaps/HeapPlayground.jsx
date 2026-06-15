import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { Play, RotateCcw } from 'lucide-react';
import Button from '../../common/Button/Button.jsx';
import Input from '../../common/Input/Input.jsx';
import StepControlBar from '../../common/StepControlBar/StepControlBar.jsx';
import useReducedMotion from '../../hooks/useReducedMotion.js';
import {
	usePlayback,
	FrameTrace,
	PseudoState,
} from '../../common/PlaybackEngine/index.js';
import { HEAP_OPERATIONS, HEAP_OP_ORDER, HEAP_PRESETS } from './heapMeta.js';
import {
	HEAP_PSEUDO,
	buildOperationTrace,
	buildStateRows,
	leftChild,
	parentIndex,
	rightChild,
} from './heapTrace.js';
import styles from './HeapPlayground.module.css';

const INITIAL_PRESET = HEAP_PRESETS[0];

const SPEED_OPTIONS = [
	{ value: 25, label: '0.5×' },
	{ value: 100, label: '1×' },
	{ value: 200, label: '2×' },
	{ value: 320, label: '5×' },
];

// The pseudocode key for the on-screen rail. Build reuses sift-down internally,
// but the rail shows the operation the user actually picked.
const PSEUDO_FOR = {
	insert: HEAP_PSEUDO.insert,
	extractMax: HEAP_PSEUDO.extractMax,
	build: HEAP_PSEUDO.build,
};

// A single idle frame so the heap renders before any operation runs. Shares the
// frame shape produced by heapTrace so the canvas reads it uniformly.
const idleFrame = heap => ({
	heap: [...heap],
	heapSize: heap.length,
	active: null,
	compare: [],
	swap: [],
	path: [],
	sorted: [],
	phase: 'idle',
	line: null,
	title: 'Ready',
	description: 'Pick an operation, then run.',
	comparisons: 0,
	swaps: 0,
});

// ── Implicit-tree layout (same arithmetic the algorithm uses) ──
const NODE_R = 17;
const LEVEL_H = 62;
const TOP = 24;

const layoutOf = (values, width) => {
	const nodes = values.map((value, i) => {
		const depth = Math.floor(Math.log2(i + 1));
		const levelStart = Math.pow(2, depth) - 1;
		const levelCount = Math.pow(2, depth);
		const slot = (i - levelStart + 0.5) / levelCount;
		return { i, value, depth, x: slot * width, y: TOP + depth * LEVEL_H };
	});
	const edges = nodes
		.filter(n => n.i > 0)
		.map(n => ({ from: nodes[parentIndex(n.i)], to: n }));
	const depthMax = nodes.length ? Math.max(...nodes.map(n => n.depth)) : 0;
	return { nodes, edges, height: TOP + (depthMax + 1) * LEVEL_H };
};

/**
 * HeapPlayground — the interactive max-heap sandbox for the Heaps topic.
 *
 * Insert / extract-max / build-heap on a live heap, driven by the shared
 * PlaybackEngine (step / scrub / replay / speed + scoped keyboard). The canvas
 * is a dual view: the implicit binary tree above its backing array, both lit in
 * lockstep with the synced pseudocode (PseudoState) and live state (the active
 * index, its 2i+1/2i+2 children, the parent, and running op counts).
 */
const HeapPlayground = ({ onUserInteract }) => {
	const playerRef = useRef(null);
	const reducedMotion = useReducedMotion();

	// The dual view animates in lockstep: each tree node's <g> and its backing
	// array cell are captured by index so one timeline can travel both together.
	const canvasRef = useRef(null);
	const nodeRefs = useRef([]);
	const cellRefs = useRef([]);
	const lastSwapKeyRef = useRef('');

	const [liveHeap, setLiveHeap] = useState(() => [...INITIAL_PRESET.heap]);
	const [presetId, setPresetId] = useState(INITIAL_PRESET.id);
	const [operationId, setOperationId] = useState(INITIAL_PRESET.operationId);
	const [keyInput, setKeyInput] = useState(String(INITIAL_PRESET.key));

	const [frames, setFrames] = useState(() => [idleFrame(INITIAL_PRESET.heap)]);

	const player = usePlayback(frames, { speed: 100 });
	const { currentStep, currentFrame, totalSteps, seek, play } = player;

	const op = HEAP_OPERATIONS[operationId];
	const frame = currentFrame || frames[0];
	const renderHeap = frame?.heap || liveHeap;
	const renderSize = frame?.heapSize ?? renderHeap.length;

	const WIDTH = 360;
	const layout = useMemo(() => layoutOf(renderHeap, WIDTH), [renderHeap]);

	const canStep = totalSteps > 1;
	const lines = useMemo(() => PSEUDO_FOR[operationId] || [], [operationId]);
	const activeLine = frame?.line ?? null;
	const stateRows = useMemo(() => buildStateRows(frame), [frame]);

	const notify = useCallback(() => onUserInteract?.(), [onUserInteract]);

	const handleRun = useCallback(() => {
		notify();
		const args = { heap: liveHeap, key: Number(keyInput) };
		if (op.needsKey && (keyInput.trim() === '' || Number.isNaN(args.key)))
			return;
		const result = buildOperationTrace(operationId, args);
		if (!result.frames.length) return;
		setFrames(result.frames);
		// Commit the final heap immediately so subsequent ops build on it.
		setLiveHeap(result.finalHeap);
	}, [notify, liveHeap, keyInput, op, operationId]);

	// When a fresh operation timeline arrives, jump to the start and play it.
	const framesKeyRef = useRef(null);
	useEffect(() => {
		if (frames.length <= 1) return;
		if (framesKeyRef.current === frames) return;
		framesKeyRef.current = frames;
		seek(0);
		play();
	}, [frames, seek, play]);

	const applyPreset = useCallback(preset => {
		setLiveHeap([...preset.heap]);
		setOperationId(preset.operationId);
		setKeyInput(String(preset.key));
		const idle = [idleFrame(preset.heap)];
		framesKeyRef.current = idle;
		setFrames(idle);
	}, []);

	const handlePresetChange = useCallback(
		id => {
			const preset = HEAP_PRESETS.find(p => p.id === id);
			if (!preset) return;
			notify();
			setPresetId(id);
			applyPreset(preset);
		},
		[notify, applyPreset]
	);

	const handleReset = useCallback(() => {
		notify();
		const preset = HEAP_PRESETS.find(p => p.id === presetId) || INITIAL_PRESET;
		applyPreset(preset);
	}, [notify, presetId, applyPreset]);

	const handleOperationChange = useCallback(
		id => {
			notify();
			setOperationId(id);
			const idle = [idleFrame(liveHeap)];
			framesKeyRef.current = idle;
			setFrames(idle);
		},
		[notify, liveHeap]
	);

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

	const narration = useMemo(() => {
		if (!frame) return null;
		return frame.description || frame.title;
	}, [frame]);

	const isMaxHeap = useMemo(() => {
		for (let i = 0; i < liveHeap.length; i++) {
			const l = leftChild(i);
			const r = rightChild(i);
			if (l < liveHeap.length && liveHeap[l] > liveHeap[i]) return false;
			if (r < liveHeap.length && liveHeap[r] > liveHeap[i]) return false;
		}
		return true;
	}, [liveHeap]);

	// Index sets for highlighting the dual view from the current frame.
	const compareSet = new Set(frame?.compare || []);
	const swapSet = new Set(frame?.swap || []);
	const pathSet = new Set(frame?.path || []);
	const sortedSet = new Set(frame?.sorted || []);
	const activeIdx = frame?.active;

	// ── The travel: a value physically SINKS (or rises) along its tree edge,
	// welded to its backing-array cell. One gsap.timeline drives the tree <g>
	// and the array cell in lockstep so the tree↔array duality never inverts.
	//
	// The frame already carries the POST-move array, so a token at its
	// destination slot is animated as if it had just crossed FROM its source
	// slot — `travel(from, to)` means "the token now sitting at `to` arrives
	// from `from`'s position". Tree offset comes from layoutOf's index math (no
	// measurement); the array offset is the BarView offsetLeft delta verbatim.
	const layoutNodes = layout.nodes;
	const swapPair = frame?.swap;
	const phase = frame?.phase;

	// One persistent gsap.context, scoped to the canvas, created on mount and
	// reverted only on unmount. Every travel is add()-ed into it so normal frame
	// advances never kill an in-flight tween (only overwrite:'auto' supersedes a
	// re-stepped target), yet unmount tears everything down cleanly.
	const ctxRef = useRef(null);
	useEffect(() => {
		ctxRef.current = gsap.context(() => {}, canvasRef);
		return () => {
			ctxRef.current?.revert();
			ctxRef.current = null;
		};
	}, []);

	useEffect(() => {
		const ctx = ctxRef.current;
		if (!ctx) return;
		const nodes = nodeRefs.current;
		const cells = cellRefs.current;
		const swapKey = `${phase}:${(swapPair || []).join('-')}`;
		// Only fire on a *fresh* move beat — scrubbing back onto the same frame,
		// or any non-moving beat (compare/settle/idle), leaves the layout to CSS.
		const isMove =
			(phase === 'swap' || phase === 'replace') &&
			Array.isArray(swapPair) &&
			swapPair.length === 2;
		if (!isMove || swapKey === lastSwapKeyRef.current) {
			lastSwapKeyRef.current = swapKey;
			return;
		}
		lastSwapKeyRef.current = swapKey;

		// expo.out to match BarView; reduced motion shrinks travel to a near-zero
		// crossfade-with-nudge so the sink DIRECTION still reads.
		const dur = reducedMotion ? 0.16 : 0.52;
		const ease = 'expo.out';

		ctx.add(() => {
			const tl = gsap.timeline({ defaults: { ease, overwrite: 'auto' } });

			// Move one value token (its tree <g> + its array cell) from `from`→`to`,
			// crossing the connecting edge. `dip` lifts/shrinks mid-flight like the
			// sorting bars; reduced motion flattens the spatial part to a nudge.
			const travel = (from, to, dip) => {
				const treeEl = nodes[to];
				const cellFrom = cells[from];
				const cellTo = cells[to];
				const nFrom = layoutNodes[from];
				const nTo = layoutNodes[to];
				if (treeEl && nFrom && nTo) {
					const dx = reducedMotion ? 0 : nFrom.x - nTo.x;
					const dy = reducedMotion ? 0 : nFrom.y - nTo.y;
					const nudge = reducedMotion ? (to < from ? -4 : 4) : 0;
					tl.fromTo(
						treeEl,
						{
							x: dx,
							y: dy + nudge,
							scale: dip && !reducedMotion ? 0.82 : 1,
							transformOrigin: '50% 50%',
						},
						{
							x: 0,
							y: 0,
							scale: 1,
							duration: dur,
							clearProps: 'transform',
						},
						0
					);
				}
				if (cellFrom && cellTo) {
					// BarView idiom: the horizontal gap between the two cells.
					const fromX = reducedMotion
						? 0
						: cellFrom.offsetLeft - cellTo.offsetLeft;
					tl.fromTo(
						cellTo,
						{
							x: fromX,
							y: dip && !reducedMotion ? -10 : 0,
							scaleX: dip && !reducedMotion ? 0.86 : 1,
							transformOrigin: '50% 100%',
						},
						{
							x: 0,
							y: 0,
							scaleX: 1,
							duration: dur,
							clearProps: 'transform',
						},
						0
					);
				}
			};

			if (phase === 'replace') {
				// EXTRACT-MAX: the last leaf rises up its leaf→root edge to the now
				// empty root slot (mirrored in the array). The old maximum has just
				// been parked at the tail (cellSorted) — lift+fade it in from above
				// so it reads as having risen straight OUT of the heap. The sift
				// travel from a later `swap` frame only yields AFTER this.
				const [root, last] = swapPair;
				travel(last, root, true);
				const parked = cells[last];
				if (parked) {
					tl.fromTo(
						parked,
						{
							y: reducedMotion ? 0 : -14,
							opacity: reducedMotion ? 0.4 : 0,
						},
						{
							y: 0,
							opacity: 1,
							duration: dur,
							// Release opacity + transform so the cellSorted / cellOut
							// classes own the resting look once the lift lands.
							clearProps: 'opacity,transform',
						},
						0
					);
				}
				const rootNode = nodes[root];
				if (rootNode && reducedMotion) {
					// Reduced motion: one brightness blink stands in for the lift.
					tl.fromTo(
						rootNode,
						{ filter: 'brightness(1.4)' },
						{ filter: 'brightness(1)', duration: 0.18, clearProps: 'filter' },
						0
					);
				}
			} else {
				// SIFT SWAP: the larger child RISES to the parent slot while the
				// too-small parent SINKS to the child slot, crossing mid-edge.
				const [parent, child] = swapPair;
				travel(child, parent, true); // child → parent (rises)
				travel(parent, child, true); // parent → child (sinks)
			}
		});
	}, [phase, swapPair, layoutNodes, reducedMotion]);

	return (
		<div className={styles.shell} ref={playerRef}>
			{/* ---------- Controls ---------- */}
			<div className={styles.controls}>
				<div
					className={styles.opTabs}
					role="tablist"
					aria-label="Heap operation"
				>
					{HEAP_OP_ORDER.map(id => {
						const item = HEAP_OPERATIONS[id];
						const active = id === operationId;
						return (
							<button
								key={id}
								type="button"
								role="tab"
								aria-selected={active}
								className={`${styles.opTab} ${active ? styles.opTabActive : ''}`}
								onClick={() => handleOperationChange(id)}
							>
								{item.name}
							</button>
						);
					})}
				</div>

				<div className={styles.inputs}>
					{op?.needsKey && (
						<Input
							size="sm"
							label="Key"
							type="number"
							value={keyInput}
							onChange={e => setKeyInput(e.target.value)}
							onKeyDown={e => {
								if (e.key === 'Enter') handleRun();
							}}
							placeholder="number"
							className={styles.input}
						/>
					)}
					<div className={styles.actions}>
						<Button variant="primary" size="sm" onClick={handleRun}>
							<Play size={13} strokeWidth={2.4} fill="currentColor" />
							<span>Run</span>
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={handleReset}
							aria-label="Reset heap"
							title="Reset heap"
						>
							<RotateCcw size={14} strokeWidth={2} />
							<span>Reset</span>
						</Button>
					</div>
				</div>
			</div>

			<p className={styles.opLine}>{op?.oneLine}</p>

			<div className={styles.scenarioRow}>
				<span className={styles.scenarioLabel}>Scenario</span>
				<div className={styles.scenarioChips} role="group">
					{HEAP_PRESETS.map(preset => (
						<button
							key={preset.id}
							type="button"
							className={`${styles.scenarioChip} ${
								preset.id === presetId ? styles.scenarioChipActive : ''
							}`}
							aria-pressed={preset.id === presetId}
							onClick={() => handlePresetChange(preset.id)}
							title={preset.intent}
						>
							{preset.label}
						</button>
					))}
				</div>
			</div>

			{/* ---------- Stats ---------- */}
			<div className={styles.stats}>
				<div className={styles.stat}>
					<span className={styles.statValue}>{op?.complexity}</span>
					<span className={styles.statLabel}>complexity</span>
				</div>
				<div className={styles.stat}>
					<span className={styles.statValue}>{liveHeap.length}</span>
					<span className={styles.statLabel}>elements</span>
				</div>
				<div className={styles.stat}>
					<span className={styles.statValue}>
						{liveHeap.length ? liveHeap[0] : '—'}
					</span>
					<span className={styles.statLabel}>max (A[0])</span>
				</div>
				<div className={styles.stat}>
					<span className={styles.statValue}>{frame?.comparisons ?? 0}</span>
					<span className={styles.statLabel}>comparisons</span>
				</div>
				<div className={`${styles.stat} ${isMaxHeap ? '' : styles.statWarn}`}>
					<span className={styles.statValue}>{isMaxHeap ? 'valid' : '…'}</span>
					<span className={styles.statLabel}>heap property</span>
				</div>
			</div>

			{/* ---------- Canvas + trace ---------- */}
			<div className={styles.body}>
				<section
					className={styles.canvas}
					aria-label="Max-heap dual view"
					ref={canvasRef}
				>
					<div className={styles.canvasOverlay} aria-hidden="true">
						<span className={styles.mono}>n = {renderHeap.length}</span>
						{frame?.title && (
							<>
								<span className={styles.dot}>·</span>
								<span className={styles.mono}>{frame.title}</span>
							</>
						)}
					</div>

					{/* Tree */}
					<div className={styles.treeBox}>
						<svg
							viewBox={`0 0 ${WIDTH} ${layout.height}`}
							className={styles.svg}
							preserveAspectRatio="xMidYMid meet"
						>
							{layout.edges.map(edge => {
								const onPath =
									pathSet.has(edge.from.i) && pathSet.has(edge.to.i);
								return (
									<line
										key={`${edge.from.i}-${edge.to.i}`}
										x1={edge.from.x}
										y1={edge.from.y}
										x2={edge.to.x}
										y2={edge.to.y}
										className={onPath ? styles.edgeActive : styles.edge}
									/>
								);
							})}
							{layout.nodes.map(node => {
								const inHeap = node.i < renderSize;
								const cls = [styles.node];
								if (!inHeap) cls.push(styles.nodeOut);
								if (sortedSet.has(node.i)) cls.push(styles.nodeSorted);
								if (compareSet.has(node.i)) cls.push(styles.nodeCompare);
								if (swapSet.has(node.i)) cls.push(styles.nodeSwap);
								if (node.i === activeIdx) cls.push(styles.nodeActive);
								return (
									// Outer <g> holds the layout translate (index math, React
									// owns it). The inner <g> starts at identity so GSAP can own
									// its transform outright — no fighting the attribute baseline.
									<g key={node.i} transform={`translate(${node.x}, ${node.y})`}>
										<g ref={el => (nodeRefs.current[node.i] = el)}>
											<circle r={NODE_R} className={cls.join(' ')} />
											<text
												className={styles.nodeText}
												textAnchor="middle"
												dy="4"
											>
												{node.value}
											</text>
										</g>
									</g>
								);
							})}
						</svg>
					</div>

					{/* Backing array */}
					<div className={styles.arrayRow} aria-label="Backing array">
						{renderHeap.map((value, i) => {
							const inHeap = i < renderSize;
							const cls = [styles.cell];
							if (!inHeap) cls.push(styles.cellOut);
							if (sortedSet.has(i)) cls.push(styles.cellSorted);
							if (compareSet.has(i)) cls.push(styles.cellCompare);
							if (swapSet.has(i)) cls.push(styles.cellSwap);
							if (i === activeIdx) cls.push(styles.cellActive);
							return (
								<div key={i} className={styles.cellWrap}>
									<div
										ref={el => (cellRefs.current[i] = el)}
										className={cls.join(' ')}
									>
										{value}
									</div>
									<span className={styles.cellIdx}>{i}</span>
								</div>
							);
						})}
					</div>
				</section>

				<div className={styles.trace}>
					<FrameTrace
						eyebrow={op?.name}
						step={currentStep}
						totalSteps={totalSteps}
						narration={narration}
					/>
					<PseudoState
						className={styles.pseudo}
						lines={lines}
						line={activeLine}
						state={stateRows}
						isRunning={activeLine != null}
						label="Pseudocode"
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

export default HeapPlayground;
