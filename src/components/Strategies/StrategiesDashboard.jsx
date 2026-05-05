import { useEffect, useMemo, useState } from 'react';
import StrategiesHero from './StrategiesHero/StrategiesHero';
import StepControlBar from '../../common/StepControlBar/StepControlBar';
import PseudocodeRail from '../../common/PseudocodeRail/PseudocodeRail';
import CoinChangeCanvas from './CoinChangeCanvas/CoinChangeCanvas';
import ClimbingStairsCanvas from './ClimbingStairsCanvas/ClimbingStairsCanvas';
import IntervalSchedulingCanvas from './IntervalSchedulingCanvas/IntervalSchedulingCanvas';
import {
	STRATEGY_ALGORITHMS,
	COIN_CHANGE_PRESETS,
	COIN_CHANGE_PSEUDO,
	CLIMBING_STAIRS_PSEUDO,
	INTERVAL_SCHEDULING_PSEUDO,
} from './strategiesMeta';
import {
	buildCoinChangeFrames,
	buildClimbingStairsFrames,
	buildIntervalSchedulingFrames,
} from './coinChangeFrames';
import styles from './StrategiesDashboard.module.css';

const STAIRS_N = 6;

const SCHEDULING_INTERVALS = [
	{ id: 'A', start: 0, end: 2 },
	{ id: 'B', start: 1, end: 4 },
	{ id: 'C', start: 3, end: 5 },
	{ id: 'D', start: 4, end: 7 },
	{ id: 'E', start: 6, end: 8 },
];

const SPEED_OPTIONS = [
	{ value: 1300, label: '0.5×' },
	{ value: 850, label: '1×' },
	{ value: 450, label: '2×' },
	{ value: 200, label: '5×' },
];

const StrategiesDashboard = () => {
	const [algorithmId, setAlgorithmId] = useState('coinChange');
	const [presetId, setPresetId] = useState('trap');
	const [stepIndex, setStepIndex] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [speed, setSpeed] = useState(850);

	const preset = useMemo(
		() => COIN_CHANGE_PRESETS.find(p => p.id === presetId) || COIN_CHANGE_PRESETS[0],
		[presetId]
	);

	const { frames, lines } = useMemo(() => {
		if (algorithmId === 'coinChange') {
			const built = buildCoinChangeFrames({
				target: preset.target,
				coins: preset.coins,
			});
			return { frames: built.frames, lines: COIN_CHANGE_PSEUDO };
		}
		if (algorithmId === 'climbingStairs') {
			const built = buildClimbingStairsFrames(STAIRS_N);
			return { frames: built.frames, lines: CLIMBING_STAIRS_PSEUDO };
		}
		const built = buildIntervalSchedulingFrames(SCHEDULING_INTERVALS);
		return { frames: built.frames, lines: INTERVAL_SCHEDULING_PSEUDO };
	}, [algorithmId, preset]);

	const totalSteps = frames.length;
	const safeStepIndex = Math.min(stepIndex, totalSteps - 1);
	const frame = frames[safeStepIndex];
	const algo = STRATEGY_ALGORITHMS[algorithmId];

	useEffect(() => {
		if (!isPlaying) return;
		if (safeStepIndex >= totalSteps - 1) {
			setIsPlaying(false);
			return;
		}
		const t = window.setTimeout(() => {
			setStepIndex(idx => Math.min(idx + 1, totalSteps - 1));
		}, speed);
		return () => window.clearTimeout(t);
	}, [isPlaying, safeStepIndex, totalSteps, speed]);

	const handleAlgorithmChange = id => {
		setAlgorithmId(id);
		setStepIndex(0);
		setIsPlaying(false);
	};

	const handlePresetChange = id => {
		setPresetId(id);
		setStepIndex(0);
		setIsPlaying(false);
	};

	const handleReset = () => {
		setStepIndex(0);
		setIsPlaying(false);
	};

	const handlePlayPause = () => {
		if (safeStepIndex >= totalSteps - 1) {
			setStepIndex(0);
			setIsPlaying(true);
			return;
		}
		setIsPlaying(p => !p);
	};

	const canStep = totalSteps > 1;
	const statusSuffix = !canStep
		? 'ready'
		: safeStepIndex >= totalSteps - 1
			? 'done'
			: isPlaying
				? 'running'
				: safeStepIndex === 0
					? 'ready'
					: 'paused';

	const overlayTitle = frame?.title;
	const activeLine = frame?.line ?? null;

	return (
		<div className={styles.shell}>
			<StrategiesHero
				algorithmId={algorithmId}
				onAlgorithmChange={handleAlgorithmChange}
				presetId={presetId}
				onPresetChange={handlePresetChange}
				onReset={handleReset}
				statusSuffix={statusSuffix}
			/>

			<div className={styles.body}>
				<section className={styles.canvas} aria-label={`${algo?.name} canvas`}>
					<div className={styles.canvasOverlay}>
						<span className={styles.notation}>{algo?.complexity}</span>
						{overlayTitle && (
							<>
								<span className={styles.notationDot}>·</span>
								<span className={styles.stat}>{overlayTitle}</span>
							</>
						)}
					</div>
					<div className={styles.canvasStage}>
						{algorithmId === 'coinChange' && (
							<CoinChangeCanvas frame={frame} preset={preset} />
						)}
						{algorithmId === 'climbingStairs' && (
							<ClimbingStairsCanvas frame={frame} n={STAIRS_N} />
						)}
						{algorithmId === 'intervalScheduling' && (
							<IntervalSchedulingCanvas
								frame={frame}
								intervals={SCHEDULING_INTERVALS}
							/>
						)}
					</div>
					{frame?.description && (
						<div className={styles.frameNote} aria-live="polite">
							<span className={styles.frameNoteLabel}>STEP</span>
							<span className={styles.frameNoteText}>
								{frame.description}
							</span>
						</div>
					)}
				</section>

				<PseudocodeRail
					lines={lines}
					activeLine={activeLine}
					isRunning={canStep && safeStepIndex > 0}
				/>
			</div>

			<div className={styles.bar}>
				<StepControlBar
					isPlaying={isPlaying}
					canStep={canStep}
					currentStep={safeStepIndex}
					totalSteps={totalSteps}
					speed={speed}
					speedOptions={SPEED_OPTIONS}
					onPlayPause={handlePlayPause}
					onStepBack={() =>
						setStepIndex(idx => Math.max(idx - 1, 0))
					}
					onStepForward={() =>
						setStepIndex(idx => Math.min(idx + 1, totalSteps - 1))
					}
					onSeek={s => {
						setStepIndex(Math.max(0, Math.min(s, totalSteps - 1)));
						setIsPlaying(false);
					}}
					onFirst={() => {
						setStepIndex(0);
						setIsPlaying(false);
					}}
					onLast={() => {
						setStepIndex(totalSteps - 1);
						setIsPlaying(false);
					}}
					onSpeedChange={setSpeed}
				/>
			</div>
		</div>
	);
};

export default StrategiesDashboard;
