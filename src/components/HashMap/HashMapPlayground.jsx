import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import Button from '../../common/Button/Button.jsx';
import Input from '../../common/Input/Input.jsx';
import StepControlBar from '../../common/StepControlBar/StepControlBar.jsx';
import { usePlayback, FrameTrace } from '../../common/PlaybackEngine/index.js';
import {
	HASH_MAP_PRESETS,
	HASH_OPERATIONS,
	HASH_OP_ORDER,
	HASH_PSEUDO,
} from './hashMapMeta.js';
import {
	buildOperationTrace,
	createBucketsFromEntries,
} from './hashMapTrace.js';
import styles from './HashMapPlayground.module.css';

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
			createBucketsFromEntries(
				INITIAL_PRESET.entries,
				INITIAL_PRESET.capacity
			),
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

	const traceEntries = useMemo(
		() =>
			lines.map((text, idx) => ({
				id: `line-${idx}`,
				label: text,
				active: idx === activeLine,
			})),
		[lines, activeLine]
	);

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
						<div className={styles.bucketGrid}>
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
														isSelected &&
														entry.key === frame?.activeKey;
													return (
														<div
															key={`${entry.key}-${j}`}
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

				<FrameTrace
					className={styles.trace}
					eyebrow={op?.name}
					step={currentStep}
					totalSteps={totalSteps}
					narration={narration}
					entries={traceEntries}
					traceLabel="Pseudocode"
					renderEntry={entry => (
						<code className={styles.codeLine}>{entry.label}</code>
					)}
				/>
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
