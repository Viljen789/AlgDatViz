import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { Play, RotateCcw } from 'lucide-react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import useReducedMotion from '../../hooks/useReducedMotion.js';
import Button from '../../common/Button/Button.jsx';
import Input from '../../common/Input/Input.jsx';
import StepControlBar from '../../common/StepControlBar/StepControlBar.jsx';
import {
	usePlayback,
	FrameTrace,
	PseudoState,
} from '../../common/PlaybackEngine/index.js';
import {
	HASH_MAP_PRESETS,
	HASH_OPERATIONS,
	HASH_OP_ORDER,
	HASH_PSEUDO,
} from './hashMapMeta.js';
import {
	buildOperationTrace,
	buildStateRows,
	createBucketsFromEntries,
} from './hashMapTrace.js';
import styles from './HashMapPlayground.module.css';

// Flip captures the old-table layout at the allocate boundary; MotionPath arcs
// the one rehashed entry from its old bucket into its new one. Registration is
// idempotent (mirrors HomePage's gsap.registerPlugin pattern).
gsap.registerPlugin(Flip, MotionPathPlugin);

const INITIAL_PRESET = HASH_MAP_PRESETS[0];

const SPEED_OPTIONS = [
	{ value: 25, label: '0.5×' },
	{ value: 100, label: '1×' },
	{ value: 200, label: '2×' },
	{ value: 320, label: '5×' },
];

// A single idle frame so the table renders before any operation is run. Shares
// the frame shape produced by hashMapTrace so the canvas reads it uniformly.
const idleFrame = (buckets, capacity) => ({
	buckets,
	capacity,
	selectedBucket: null,
	activeKey: null,
	phase: 'idle',
	hash: null,
	scanIndex: null,
	collision: false,
	line: null,
	title: 'Ready',
	description: 'Pick an operation, type a key, then run.',
});

/**
 * HashMapPlayground — the interactive sandbox for the Hashing topic.
 *
 * Preserves the full HashMapDashboard behaviour (put / get / delete / resize,
 * separate chaining, load factor, resize-rehash) but rebuilt on the shared
 * design system: canonical tokens + primitives, the PlaybackEngine for
 * step/scrub/replay with scoped keyboard, and FrameTrace for synchronized,
 * screen-reader-friendly narration.
 */
const HashMapPlayground = ({ onUserInteract }) => {
	const playerRef = useRef(null);
	const reducedMotion = useReducedMotion();
	// The grid is the gsap.context scope and the lookup root for the entry cells
	// the rehash arc moves; cells register themselves by their (unique) key.
	const gridRef = useRef(null);
	const cellRefs = useRef(new Map());
	const registerCell = useCallback((key, el) => {
		if (el) cellRefs.current.set(key, el);
		else cellRefs.current.delete(key);
	}, []);
	// Flip state of the full old table, captured at the 'plan' frame (the last
	// frame before 'allocate' empties it). Each 'rehash' frame reads the recorded
	// old-bucket rect for its one arriving key from here.
	const oldTableStateRef = useRef(null);
	// The key whose arc we last launched, so a passive re-render on the same
	// rehash frame never re-fires the tween (we arc on activeKey change only).
	const lastFlownKeyRef = useRef(null);
	// One component-scoped gsap.context for the whole lifetime: every rehash arc
	// is added through it, and it is reverted once on unmount (BarView/HomePage
	// idiom) so a mid-flight tween is never killed by a per-step cleanup.
	const arcCtxRef = useRef(null);
	// The single in-flight arc. Before launching the next entry we snap the
	// previous one home, so at fast step rates there is still only ONE arc moving
	// at a time — the rule that keeps the rehash a sequence, not confetti.
	const activeArcRef = useRef(null);

	const [liveBuckets, setLiveBuckets] = useState(() =>
		createBucketsFromEntries(INITIAL_PRESET.entries, INITIAL_PRESET.capacity)
	);
	const [liveCapacity, setLiveCapacity] = useState(INITIAL_PRESET.capacity);
	const [presetId, setPresetId] = useState(INITIAL_PRESET.id);

	const [operationId, setOperationId] = useState(INITIAL_PRESET.operationId);
	const [keyInput, setKeyInput] = useState(INITIAL_PRESET.key);
	const [valueInput, setValueInput] = useState(INITIAL_PRESET.value);

	const [frames, setFrames] = useState(() => [
		idleFrame(
			createBucketsFromEntries(INITIAL_PRESET.entries, INITIAL_PRESET.capacity),
			INITIAL_PRESET.capacity
		),
	]);

	const player = usePlayback(frames, { speed: 100 });
	const { currentStep, currentFrame, totalSteps, seek, play } = player;

	const op = HASH_OPERATIONS[operationId];
	const frame = currentFrame || frames[0];
	const renderBuckets = frame?.buckets || liveBuckets;
	const renderCapacity = frame?.capacity || liveCapacity;

	const entryCount = useMemo(
		() => liveBuckets.reduce((sum, b) => sum + b.length, 0),
		[liveBuckets]
	);
	const collisions = useMemo(
		() => liveBuckets.reduce((sum, b) => sum + Math.max(b.length - 1, 0), 0),
		[liveBuckets]
	);
	const loadFactor = liveCapacity ? entryCount / liveCapacity : 0;
	const overloaded = loadFactor > 0.75;

	const canStep = totalSteps > 1;
	const lines = useMemo(() => HASH_PSEUDO[operationId] || [], [operationId]);
	const activeLine = frame?.line ?? null;

	const notify = useCallback(() => onUserInteract?.(), [onUserInteract]);

	const handleRun = useCallback(() => {
		notify();
		const args = {
			key: keyInput.trim(),
			value: valueInput.trim() || 'value',
			buckets: liveBuckets,
			capacity: liveCapacity,
		};
		if (op.needsKey && !args.key) return;
		const result = buildOperationTrace(operationId, args);
		if (!result.frames.length) return;
		setFrames(result.frames);
		// Commit the final state immediately so subsequent ops build on it.
		setLiveBuckets(result.finalBuckets);
		setLiveCapacity(result.finalCapacity);
	}, [
		notify,
		keyInput,
		valueInput,
		liveBuckets,
		liveCapacity,
		op,
		operationId,
	]);

	// When a fresh operation timeline arrives, jump to the start and play it.
	const framesKeyRef = useRef(null);
	useEffect(() => {
		const isOperation = frames.length > 1;
		if (!isOperation) return;
		if (framesKeyRef.current === frames) return;
		framesKeyRef.current = frames;
		seek(0);
		play();
	}, [frames, seek, play]);

	const applyPreset = useCallback((preset, keepKeyValue = false) => {
		const fresh = createBucketsFromEntries(preset.entries, preset.capacity);
		setLiveBuckets(fresh);
		setLiveCapacity(preset.capacity);
		setOperationId(preset.operationId);
		if (!keepKeyValue) {
			setKeyInput(preset.key);
			setValueInput(preset.value);
		}
		const idle = [idleFrame(fresh, preset.capacity)];
		framesKeyRef.current = idle;
		setFrames(idle);
	}, []);

	const handlePresetChange = useCallback(
		id => {
			const preset = HASH_MAP_PRESETS.find(item => item.id === id);
			if (!preset) return;
			notify();
			setPresetId(id);
			applyPreset(preset);
		},
		[notify, applyPreset]
	);

	const handleReset = useCallback(() => {
		notify();
		const preset =
			HASH_MAP_PRESETS.find(item => item.id === presetId) || INITIAL_PRESET;
		applyPreset(preset);
	}, [notify, presetId, applyPreset]);

	const handleOperationChange = useCallback(
		id => {
			notify();
			setOperationId(id);
			const idle = [idleFrame(liveBuckets, liveCapacity)];
			framesKeyRef.current = idle;
			setFrames(idle);
		},
		[notify, liveBuckets, liveCapacity]
	);

	const handlePlayPause = useCallback(() => {
		notify();
		// If there is no timeline yet, running the operation builds one.
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
		if (frame.phase === 'idle') {
			return frame.description;
		}
		return frame.description || frame.title;
	}, [frame]);

	// Live variable-state rows derived purely from the active frame so the
	// pseudocode rail and the readout (hash, bucket index, chain length, α) move
	// in lockstep with the canvas. buildStateRows is unit-tested in isolation.
	const stateRows = useMemo(() => buildStateRows(frame), [frame]);

	// Create the shared arc context once, scoped to the grid; revert on unmount.
	useEffect(() => {
		const ctx = gsap.context(() => {}, gridRef.current || undefined);
		arcCtxRef.current = ctx;
		return () => {
			ctx.revert();
			arcCtxRef.current = null;
		};
	}, []);

	// The rehash re-fly. buildResizeTrace serializes the resize into one frame per
	// entry (phase 'rehash', carrying activeKey + its NEW selectedBucket), so we
	// honor that pacing: exactly ONE entry is ever in flight. At the 'plan' frame
	// (the full old table, just before 'allocate' empties it) we Flip-capture every
	// entry cell; on each 'rehash' frame we arc only the arriving key from its
	// recorded OLD-bucket position into its new bucket along a low arc — the cue
	// that resize re-places entries under a new modulus, it does not copy slots.
	useLayoutEffect(() => {
		const phase = frame?.phase;
		const grid = gridRef.current;
		if (!grid) return undefined;

		// Capture the old table the instant it is fully laid out, before 'allocate'
		// clears it. getState records each cell's bounds + transforms. ('allocate'
		// keeps the capture alive so the first rehash can still read it.)
		if (phase === 'plan') {
			oldTableStateRef.current = Flip.getState(
				grid.querySelectorAll('[data-flip-id]')
			);
			lastFlownKeyRef.current = null;
			return undefined;
		}

		// Outside the resize sequence, leave every cell to the CSS state classes
		// exactly as before and drop the stale capture.
		if (phase !== 'rehash') {
			if (phase !== 'allocate') {
				oldTableStateRef.current = null;
				lastFlownKeyRef.current = null;
			}
			return undefined;
		}

		// One arc per arriving entry: the generator serializes the rehash one key
		// per frame, so we fire only when activeKey advances — never batching the
		// table, never re-firing on an incidental re-render of the same frame.
		const key = frame?.activeKey;
		if (key == null || key === lastFlownKeyRef.current) return undefined;
		lastFlownKeyRef.current = key;

		const cell = cellRefs.current.get(key);
		const savedState = oldTableStateRef.current;
		if (!cell || !savedState) return undefined;

		// Read the recorded OLD position by data-flip-id, not by element ref:
		// 'allocate' unmounts the old cells, so the rehash cell is a brand-new node.
		// Flip's idLookup is keyed on data-flip-id (= the entry key) and survives
		// that remount, where getElementState(element) would miss.
		const oldEl = savedState.idLookup ? savedState.idLookup[key] : null;
		const oldBounds = oldEl?.bounds || null;
		const ctx = arcCtxRef.current;
		if (!ctx || !oldBounds) return undefined;

		ctx.add(() => {
			// Land the previous entry instantly before this one departs, so the
			// "one in flight" rule holds even when steps arrive faster than an arc.
			const prev = activeArcRef.current;
			if (prev && prev.isActive()) prev.progress(1, false).kill();

			const newBounds = cell.getBoundingClientRect();
			// Delta from the new (laid-out) slot back to the old one — the same
			// offset idiom BarView uses for the cross-swap, now in 2D.
			const dx = oldBounds.left - newBounds.left;
			const dy = oldBounds.top - newBounds.top;

			const onStart = () => cell.classList.add(styles.entryFlying);
			const onComplete = () => cell.classList.remove(styles.entryFlying);

			if (reducedMotion) {
				// Keep the lesson — the entry still arrives one at a time, in
				// sequence — but collapse the arc to a short straight settle.
				activeArcRef.current = gsap.fromTo(
					cell,
					{ x: dx * 0.18, y: dy * 0.18, autoAlpha: 0.55 },
					{
						x: 0,
						y: 0,
						autoAlpha: 1,
						duration: 0.16,
						ease: 'power1.inOut',
						overwrite: 'auto',
						clearProps: 'transform,opacity',
						onStart,
						onComplete,
						onInterrupt: onComplete,
					}
				);
				return;
			}

			// A low arc: bow the midpoint above the straight chord so the move
			// reads as "pulled out of the old table and dropped by a new modulus",
			// not a teleport. The apex scales gently with travel and stays capped.
			const arcLift = Math.min(46, 18 + Math.abs(dy) * 0.18);
			activeArcRef.current = gsap.fromTo(
				cell,
				{ x: dx, y: dy },
				{
					duration: 0.55,
					ease: 'power3.inOut',
					overwrite: 'auto',
					clearProps: 'transform',
					onStart,
					onComplete,
					onInterrupt: onComplete,
					motionPath: {
						path: [
							{ x: dx, y: dy },
							{ x: dx / 2, y: dy / 2 - arcLift },
							{ x: 0, y: 0 },
						],
						curviness: 1,
					},
				}
			);
		});

		return undefined;
	}, [frame, reducedMotion]);

	return (
		<div className={styles.shell} ref={playerRef}>
			{/* ---------- Controls ---------- */}
			<div className={styles.controls}>
				<div
					className={styles.opTabs}
					role="tablist"
					aria-label="Hash map operation"
				>
					{HASH_OP_ORDER.map(id => {
						const item = HASH_OPERATIONS[id];
						const active = id === operationId;
						return (
							<button
								key={id}
								type="button"
								role="tab"
								aria-selected={active}
								className={`${styles.opTab} ${
									active ? styles.opTabActive : ''
								}`}
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
							value={keyInput}
							onChange={e => setKeyInput(e.target.value)}
							onKeyDown={e => {
								if (e.key === 'Enter') handleRun();
							}}
							placeholder="key"
							className={styles.input}
						/>
					)}
					{op?.needsValue && (
						<Input
							size="sm"
							label="Value"
							value={valueInput}
							onChange={e => setValueInput(e.target.value)}
							onKeyDown={e => {
								if (e.key === 'Enter') handleRun();
							}}
							placeholder="value"
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
							aria-label="Reset table"
							title="Reset table"
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
					{HASH_MAP_PRESETS.map(preset => (
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
					<span className={styles.statValue}>{renderCapacity}</span>
					<span className={styles.statLabel}>buckets</span>
				</div>
				<div className={styles.stat}>
					<span className={styles.statValue}>{entryCount}</span>
					<span className={styles.statLabel}>entries</span>
				</div>
				<div className={`${styles.stat} ${overloaded ? styles.statWarn : ''}`}>
					<span className={styles.statValue}>{loadFactor.toFixed(2)}</span>
					<span className={styles.statLabel}>load α</span>
				</div>
				<div
					className={`${styles.stat} ${collisions > 0 ? styles.statWarn : ''}`}
				>
					<span className={styles.statValue}>{collisions}</span>
					<span className={styles.statLabel}>collisions</span>
				</div>
			</div>

			{/* ---------- Canvas + trace ---------- */}
			<div className={styles.body}>
				<section className={styles.canvas} aria-label="Hash map table">
					<div className={styles.canvasOverlay} aria-hidden="true">
						<span className={styles.mono}>m = {renderCapacity}</span>
						{frame?.hash != null && (
							<>
								<span className={styles.dot}>·</span>
								<span className={styles.mono}>hash {frame.hash}</span>
							</>
						)}
						{frame?.title && (
							<>
								<span className={styles.dot}>·</span>
								<span className={styles.mono}>{frame.title}</span>
							</>
						)}
					</div>

					<div className={styles.canvasStage}>
						<div className={styles.bucketGrid} ref={gridRef}>
							{renderBuckets.map((bucket, idx) => {
								const isSelected = idx === frame?.selectedBucket;
								return (
									<div
										key={idx}
										className={`${styles.bucketRow} ${
											isSelected ? styles.bucketActive : ''
										}`}
									>
										<span className={styles.bucketIndex}>{idx}</span>
										<div className={styles.chain}>
											{bucket.length === 0 ? (
												<span className={styles.bucketEmpty}>null</span>
											) : (
												bucket.map((entry, j) => {
													const isMatch =
														isSelected && entry.key === frame?.activeKey;
													return (
														<div
															key={`${entry.key}-${j}`}
															ref={el => registerCell(entry.key, el)}
															data-flip-id={entry.key}
															className={`${styles.entry} ${
																isMatch ? styles.entryActive : ''
															}`}
														>
															<span className={styles.entryKey}>
																{entry.key}
															</span>
															<span className={styles.entryArrow}>→</span>
															<span className={styles.entryValue}>
																{entry.value}
															</span>
														</div>
													);
												})
											)}
										</div>
									</div>
								);
							})}
						</div>
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

export default HashMapPlayground;
