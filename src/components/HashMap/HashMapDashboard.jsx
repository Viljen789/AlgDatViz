import { useEffect, useMemo, useState } from 'react';
import HashMapHero from './HashMapHero/HashMapHero';
import StepControlBar from '../../common/StepControlBar/StepControlBar';
import PseudocodeRail from '../../common/PseudocodeRail/PseudocodeRail';
import { HASH_MAP_PRESETS, HASH_OPERATIONS, HASH_PSEUDO } from './hashMapMeta';
import {
	buildOperationTrace,
	createBucketsFromEntries,
} from './hashMapTrace';
import styles from './HashMapDashboard.module.css';

const INITIAL_PRESET = HASH_MAP_PRESETS[0];
const INITIAL_ENTRIES = INITIAL_PRESET.entries;
const INITIAL_CAPACITY = INITIAL_PRESET.capacity;

const SPEED_OPTIONS = [
	{ value: 1300, label: '0.5×' },
	{ value: 850, label: '1×' },
	{ value: 450, label: '2×' },
	{ value: 200, label: '5×' },
];

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
	description: 'Pick an operation, type a key, and run.',
});

const HashMapDashboard = () => {
	const [liveBuckets, setLiveBuckets] = useState(() =>
		createBucketsFromEntries(INITIAL_ENTRIES, INITIAL_CAPACITY)
	);
	const [liveCapacity, setLiveCapacity] = useState(INITIAL_CAPACITY);
	const [presetId, setPresetId] = useState(INITIAL_PRESET.id);

	const [operationId, setOperationId] = useState(INITIAL_PRESET.operationId);
	const [keyInput, setKeyInput] = useState(INITIAL_PRESET.key);
	const [valueInput, setValueInput] = useState(INITIAL_PRESET.value);

	const [frames, setFrames] = useState(() => [
		idleFrame(
			createBucketsFromEntries(INITIAL_ENTRIES, INITIAL_CAPACITY),
			INITIAL_CAPACITY
		),
	]);
	const [frameIdx, setFrameIdx] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [speed, setSpeed] = useState(850);

	const op = HASH_OPERATIONS[operationId];
	const currentFrame = frames[frameIdx] || frames[0];
	const renderBuckets = currentFrame?.buckets || liveBuckets;
	const renderCapacity = currentFrame?.capacity || liveCapacity;

	const entryCount = useMemo(
		() => liveBuckets.reduce((sum, b) => sum + b.length, 0),
		[liveBuckets]
	);
	const collisions = useMemo(
		() =>
			liveBuckets.reduce(
				(sum, b) => sum + Math.max(b.length - 1, 0),
				0
			),
		[liveBuckets]
	);
	const loadFactor = liveCapacity ? entryCount / liveCapacity : 0;

	useEffect(() => {
		if (!isPlaying) return;
		if (frameIdx >= frames.length - 1) {
			setIsPlaying(false);
			return;
		}
		const t = window.setTimeout(() => {
			setFrameIdx(idx => Math.min(idx + 1, frames.length - 1));
		}, speed);
		return () => window.clearTimeout(t);
	}, [isPlaying, frameIdx, frames.length, speed]);

	const handleRun = () => {
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
		setFrameIdx(0);
		setIsPlaying(true);
		// Commit final state immediately so subsequent ops use it.
		setLiveBuckets(result.finalBuckets);
		setLiveCapacity(result.finalCapacity);
	};

	const handleReset = () => {
		const preset =
			HASH_MAP_PRESETS.find(item => item.id === presetId) || INITIAL_PRESET;
		const fresh = createBucketsFromEntries(preset.entries, preset.capacity);
		setLiveBuckets(fresh);
		setLiveCapacity(preset.capacity);
		setKeyInput(preset.key);
		setValueInput(preset.value);
		setOperationId(preset.operationId);
		setFrames([idleFrame(fresh, preset.capacity)]);
		setFrameIdx(0);
		setIsPlaying(false);
	};

	const handlePresetChange = id => {
		const preset = HASH_MAP_PRESETS.find(item => item.id === id);
		if (!preset) return;
		const fresh = createBucketsFromEntries(preset.entries, preset.capacity);
		setPresetId(id);
		setLiveBuckets(fresh);
		setLiveCapacity(preset.capacity);
		setOperationId(preset.operationId);
		setKeyInput(preset.key);
		setValueInput(preset.value);
		setFrames([idleFrame(fresh, preset.capacity)]);
		setFrameIdx(0);
		setIsPlaying(false);
	};

	const handleOperationChange = id => {
		setOperationId(id);
		setIsPlaying(false);
		setFrames([idleFrame(liveBuckets, liveCapacity)]);
		setFrameIdx(0);
	};

	const handlePlayPause = () => {
		if (frames.length <= 1) {
			handleRun();
			return;
		}
		if (frameIdx >= frames.length - 1) {
			setFrameIdx(0);
			setIsPlaying(true);
			return;
		}
		setIsPlaying(p => !p);
	};

	const totalSteps = frames.length;
	const canStep = totalSteps > 1;
	const lines = HASH_PSEUDO[operationId] || [];
	const activeLine = currentFrame?.line ?? null;

	const statusSuffix = !canStep
		? 'ready'
		: frameIdx >= totalSteps - 1
			? 'done'
			: isPlaying
				? 'running'
				: 'paused';

	return (
		<div className={styles.shell}>
			<HashMapHero
				operationId={operationId}
				onOperationChange={handleOperationChange}
				presetId={presetId}
				onPresetChange={handlePresetChange}
				keyValue={keyInput}
				onKeyChange={setKeyInput}
				valueValue={valueInput}
				onValueChange={setValueInput}
				onRun={handleRun}
				onReset={handleReset}
				capacity={liveCapacity}
				entryCount={entryCount}
				collisions={collisions}
				loadFactor={loadFactor}
				statusSuffix={statusSuffix}
			/>

			<div className={styles.body}>
				<section className={styles.canvas} aria-label="Hash map canvas">
					<div className={styles.canvasOverlay}>
						<span className={styles.notation}>
							{op?.complexity}
						</span>
						<span className={styles.notationDot}>·</span>
						<span className={styles.stat}>
							m = {renderCapacity}
						</span>
						{currentFrame?.hash != null && (
							<>
								<span className={styles.notationDot}>·</span>
								<span className={styles.stat}>
									hash {currentFrame.hash}
								</span>
							</>
						)}
						{currentFrame?.title && (
							<>
								<span className={styles.notationDot}>·</span>
								<span className={styles.stat}>{currentFrame.title}</span>
							</>
						)}
					</div>

					<div className={styles.canvasStage}>
						<div className={styles.bucketGrid}>
							{renderBuckets.map((bucket, idx) => {
								const isSelected = idx === currentFrame?.selectedBucket;
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
														entry.key === currentFrame?.activeKey;
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

					{currentFrame?.description && (
						<div className={styles.frameNote} aria-live="polite">
							<span className={styles.frameNoteLabel}>STEP</span>
							<span className={styles.frameNoteText}>
								{currentFrame.description}
							</span>
						</div>
					)}
				</section>

				<PseudocodeRail
					lines={lines}
					activeLine={activeLine}
					isRunning={canStep}
				/>
			</div>

			<div className={styles.bar}>
				<StepControlBar
					isPlaying={isPlaying}
					canStep={canStep}
					currentStep={frameIdx}
					totalSteps={totalSteps}
					speed={speed}
					speedOptions={SPEED_OPTIONS}
					onPlayPause={handlePlayPause}
					onStepBack={() =>
						setFrameIdx(i => Math.max(i - 1, 0))
					}
					onStepForward={() =>
						setFrameIdx(i => Math.min(i + 1, frames.length - 1))
					}
					onSeek={s => {
						setFrameIdx(Math.max(0, Math.min(s, frames.length - 1)));
						setIsPlaying(false);
					}}
					onFirst={() => {
						setFrameIdx(0);
						setIsPlaying(false);
					}}
					onLast={() => {
						setFrameIdx(frames.length - 1);
						setIsPlaying(false);
					}}
					onSpeedChange={setSpeed}
				/>
			</div>
		</div>
	);
};

export default HashMapDashboard;
