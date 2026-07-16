import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Minus, Plus, RotateCcw } from 'lucide-react';
import {
	usePlayback,
	FrameTrace,
	PseudoState,
} from '../../common/PlaybackEngine/index.js';
import StepControlBar from '../../common/StepControlBar/StepControlBar.jsx';
import CoinChangeCanvas from './CoinChangeCanvas/CoinChangeCanvas.jsx';
import ClimbingStairsCanvas from './ClimbingStairsCanvas/ClimbingStairsCanvas.jsx';
import IntervalSchedulingCanvas from './IntervalSchedulingCanvas/IntervalSchedulingCanvas.jsx';
import RodCuttingCanvas from './RodCuttingCanvas/RodCuttingCanvas.jsx';
import LcsCanvas from './LcsCanvas/LcsCanvas.jsx';
import Knapsack01Canvas from './Knapsack01Canvas/Knapsack01Canvas.jsx';
import FractionalKnapsackCanvas from './FractionalKnapsackCanvas/FractionalKnapsackCanvas.jsx';
import HuffmanCanvas from './HuffmanCanvas/HuffmanCanvas.jsx';
import StrategiesAlgorithmPicker from './StrategiesAlgorithmPicker/StrategiesAlgorithmPicker.jsx';
import StrategiesReadMoreOverlay from './StrategiesReadMoreOverlay/StrategiesReadMoreOverlay.jsx';
import {
	STRATEGY_ALGORITHMS,
	COIN_CHANGE_PRESETS,
	COIN_CHANGE_PSEUDO,
	CLIMBING_STAIRS_PSEUDO,
	CLIMBING_STAIRS_RANGE,
	INTERVAL_SCHEDULING_PSEUDO,
	INTERVAL_SCHEDULING_PRESETS,
	ROD_CUTTING_PSEUDO,
	ROD_CUTTING_PRESETS,
	LCS_PSEUDO,
	LCS_PRESETS,
	KNAPSACK01_PSEUDO,
	FRACTIONAL_KNAPSACK_PSEUDO,
	KNAPSACK_PRESETS,
	HUFFMAN_PSEUDO,
	HUFFMAN_PRESETS,
} from './strategiesMeta.js';
import {
	buildCoinChangeFrames,
	buildClimbingStairsFrames,
	buildIntervalSchedulingFrames,
} from './coinChangeFrames.js';
import { buildHuffmanFrames } from './huffmanFrames.js';
import { buildRodCuttingFrames } from './rodCuttingFrames.js';
import { buildLcsFrames } from './lcsFrames.js';
import { buildKnapsack01Frames } from './knapsack01Frames.js';
import { buildFractionalKnapsackFrames } from './fractionalKnapsackFrames.js';
import styles from './StrategiesDashboard.module.css';
import { useTeachingStateSnapshot } from '../../lib/useTeachingStateSnapshot.js';

// Playback speed values map directly onto usePlayback's speed. Higher = faster.
const SPEED_OPTIONS = [
	{ value: 120, label: '0.5×' },
	{ value: 200, label: '1×' },
	{ value: 360, label: '2×' },
	{ value: 600, label: '5×' },
];

const StrategiesDashboard = ({ onUserInteract }) => {
	const [algorithmId, setAlgorithmId] = useState('coinChange');
	const [presetId, setPresetId] = useState('trap');
	const [intervalPresetId, setIntervalPresetId] = useState(
		INTERVAL_SCHEDULING_PRESETS[0].id
	);
	const [huffmanPresetId, setHuffmanPresetId] = useState(HUFFMAN_PRESETS[0].id);
	const [rodPresetId, setRodPresetId] = useState(ROD_CUTTING_PRESETS[0].id);
	const [lcsPresetId, setLcsPresetId] = useState(LCS_PRESETS[0].id);
	// 0/1 and fractional knapsack share one instance selector so the same bag can
	// be solved both ways.
	const [knapsackPresetId, setKnapsackPresetId] = useState(
		KNAPSACK_PRESETS[0].id
	);
	const [stairsN, setStairsN] = useState(CLIMBING_STAIRS_RANGE.default);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [presetOpen, setPresetOpen] = useState(false);
	const [readMoreOpen, setReadMoreOpen] = useState(false);
	useTeachingStateSnapshot(
		'controls',
		{
			algorithmId,
			presetId,
			intervalPresetId,
			huffmanPresetId,
			rodPresetId,
			lcsPresetId,
			knapsackPresetId,
			stairsN,
		},
		snapshot => {
			if (!snapshot || !(snapshot.algorithmId in STRATEGY_ALGORITHMS)) return;
			setAlgorithmId(snapshot.algorithmId);
			if (typeof snapshot.presetId === 'string') setPresetId(snapshot.presetId);
			if (typeof snapshot.intervalPresetId === 'string')
				setIntervalPresetId(snapshot.intervalPresetId);
			if (typeof snapshot.huffmanPresetId === 'string')
				setHuffmanPresetId(snapshot.huffmanPresetId);
			if (typeof snapshot.rodPresetId === 'string')
				setRodPresetId(snapshot.rodPresetId);
			if (typeof snapshot.lcsPresetId === 'string')
				setLcsPresetId(snapshot.lcsPresetId);
			if (typeof snapshot.knapsackPresetId === 'string')
				setKnapsackPresetId(snapshot.knapsackPresetId);
			if (Number.isFinite(snapshot.stairsN)) setStairsN(snapshot.stairsN);
		}
	);

	// Scope playback keys to this player so a second playground on the page
	// (e.g. the embedded sorting sandbox) cannot react to the same keypress.
	const playerRef = useRef(null);
	const presetWrapRef = useRef(null);

	const preset = useMemo(
		() =>
			COIN_CHANGE_PRESETS.find(p => p.id === presetId) ||
			COIN_CHANGE_PRESETS[0],
		[presetId]
	);

	const intervalPreset = useMemo(
		() =>
			INTERVAL_SCHEDULING_PRESETS.find(p => p.id === intervalPresetId) ||
			INTERVAL_SCHEDULING_PRESETS[0],
		[intervalPresetId]
	);

	const huffmanPreset = useMemo(
		() =>
			HUFFMAN_PRESETS.find(p => p.id === huffmanPresetId) || HUFFMAN_PRESETS[0],
		[huffmanPresetId]
	);

	const rodPreset = useMemo(
		() =>
			ROD_CUTTING_PRESETS.find(p => p.id === rodPresetId) ||
			ROD_CUTTING_PRESETS[0],
		[rodPresetId]
	);

	const lcsPreset = useMemo(
		() => LCS_PRESETS.find(p => p.id === lcsPresetId) || LCS_PRESETS[0],
		[lcsPresetId]
	);

	const knapsackPreset = useMemo(
		() =>
			KNAPSACK_PRESETS.find(p => p.id === knapsackPresetId) ||
			KNAPSACK_PRESETS[0],
		[knapsackPresetId]
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
			const built = buildClimbingStairsFrames(stairsN);
			return { frames: built.frames, lines: CLIMBING_STAIRS_PSEUDO };
		}
		if (algorithmId === 'rodCutting') {
			const built = buildRodCuttingFrames({
				prices: rodPreset.prices,
				n: rodPreset.n,
			});
			return { frames: built.frames, lines: ROD_CUTTING_PSEUDO };
		}
		if (algorithmId === 'lcs') {
			const built = buildLcsFrames({ x: lcsPreset.x, y: lcsPreset.y });
			return { frames: built.frames, lines: LCS_PSEUDO };
		}
		if (algorithmId === 'knapsack01') {
			const built = buildKnapsack01Frames({
				items: knapsackPreset.items,
				capacity: knapsackPreset.capacity,
			});
			return { frames: built.frames, lines: KNAPSACK01_PSEUDO };
		}
		if (algorithmId === 'fractionalKnapsack') {
			const built = buildFractionalKnapsackFrames({
				items: knapsackPreset.items,
				capacity: knapsackPreset.capacity,
			});
			return { frames: built.frames, lines: FRACTIONAL_KNAPSACK_PSEUDO };
		}
		if (algorithmId === 'huffman') {
			const built = buildHuffmanFrames(huffmanPreset.symbols);
			return { frames: built.frames, lines: HUFFMAN_PSEUDO };
		}
		const built = buildIntervalSchedulingFrames(intervalPreset.intervals);
		return { frames: built.frames, lines: INTERVAL_SCHEDULING_PSEUDO };
	}, [
		algorithmId,
		preset,
		stairsN,
		intervalPreset,
		huffmanPreset,
		rodPreset,
		lcsPreset,
		knapsackPreset,
	]);

	const player = usePlayback(frames, { speed: 200 });
	const {
		currentStep,
		currentFrame,
		totalSteps,
		isPlaying,
		toggle,
		stepBack,
		stepForward,
		seek,
		first,
		last,
		speed,
		setSpeed,
		reset,
	} = player;

	// Reset the cursor whenever the timeline identity changes — algorithm swap,
	// coin preset, stairs count, or interval preset all rebuild the frame list.
	useEffect(() => {
		reset();
	}, [
		algorithmId,
		presetId,
		stairsN,
		intervalPresetId,
		huffmanPresetId,
		rodPresetId,
		lcsPresetId,
		knapsackPresetId,
		reset,
	]);

	const algo = STRATEGY_ALGORITHMS[algorithmId];
	const frame = currentFrame;
	const canStep = totalSteps > 1;

	const notifyInteract = () => onUserInteract?.();

	const handleAlgorithmChange = id => {
		notifyInteract();
		setAlgorithmId(id);
		setPickerOpen(false);
	};

	const handlePresetChange = id => {
		notifyInteract();
		setPresetId(id);
		setPresetOpen(false);
	};

	const handleIntervalPresetChange = id => {
		notifyInteract();
		setIntervalPresetId(id);
		setPresetOpen(false);
	};

	const handleHuffmanPresetChange = id => {
		notifyInteract();
		setHuffmanPresetId(id);
		setPresetOpen(false);
	};

	const handleRodPresetChange = id => {
		notifyInteract();
		setRodPresetId(id);
		setPresetOpen(false);
	};

	const handleLcsPresetChange = id => {
		notifyInteract();
		setLcsPresetId(id);
		setPresetOpen(false);
	};

	const handleKnapsackPresetChange = id => {
		notifyInteract();
		setKnapsackPresetId(id);
		setPresetOpen(false);
	};

	const { min: stairsMin, max: stairsMax } = CLIMBING_STAIRS_RANGE;

	const handleStairsChange = next => {
		const clamped = Math.min(stairsMax, Math.max(stairsMin, next));
		if (clamped === stairsN) return;
		notifyInteract();
		setStairsN(clamped);
	};

	const handleReset = () => {
		notifyInteract();
		reset();
	};

	// Close the preset menu on outside click / Escape.
	useEffect(() => {
		if (!presetOpen) return undefined;
		const onDown = e => {
			if (presetWrapRef.current && !presetWrapRef.current.contains(e.target)) {
				setPresetOpen(false);
			}
		};
		const onKey = e => {
			if (e.key === 'Escape') setPresetOpen(false);
		};
		document.addEventListener('mousedown', onDown);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDown);
			document.removeEventListener('keydown', onKey);
		};
	}, [presetOpen]);

	const showCoinPreset = algorithmId === 'coinChange';
	const showIntervalPreset = algorithmId === 'intervalScheduling';
	const showHuffmanPreset = algorithmId === 'huffman';
	const showRodPreset = algorithmId === 'rodCutting';
	const showLcsPreset = algorithmId === 'lcs';
	const showKnapsackPreset =
		algorithmId === 'knapsack01' || algorithmId === 'fractionalKnapsack';
	const showStairsControl = algorithmId === 'climbingStairs';

	const narration = useMemo(() => {
		if (!frame) {
			return 'Pick a problem, then step or play to watch the strategy unfold.';
		}
		return frame.verdict || frame.description || frame.title || ' ';
	}, [frame]);

	return (
		<div className={styles.shell} ref={playerRef}>
			<header className={styles.header}>
				<div className={styles.headLeft}>
					<button
						type="button"
						className={styles.title}
						onClick={() => setPickerOpen(true)}
						aria-haspopup="dialog"
						title="Choose strategy problem"
					>
						<span>{algo?.name || 'Strategies'}</span>
						<ChevronDown
							size={18}
							strokeWidth={2}
							className={styles.titleChevron}
							aria-hidden="true"
						/>
					</button>
					<p className={styles.oneLine}>{algo?.oneLine}</p>
				</div>

				<div className={styles.headRight}>
					<div className={styles.notation}>
						<span className={styles.complexity}>{algo?.complexity}</span>
						{showCoinPreset && (
							<>
								<span className={styles.notationDot} aria-hidden="true">
									·
								</span>
								<div className={styles.presetWrap} ref={presetWrapRef}>
									<button
										type="button"
										className={styles.presetBtn}
										onClick={() => setPresetOpen(o => !o)}
										aria-haspopup="listbox"
										aria-expanded={presetOpen}
										title="Pick a target and coin set"
									>
										<span>
											target = {preset.target}¢ · coins [
											{preset.coins.join(', ')}]
										</span>
										<ChevronDown size={12} strokeWidth={2} aria-hidden="true" />
									</button>
									{presetOpen && (
										<ul className={styles.presetMenu} role="listbox">
											{COIN_CHANGE_PRESETS.map(p => (
												<li
													key={p.id}
													role="option"
													aria-selected={p.id === presetId}
												>
													<button
														type="button"
														className={`${styles.presetItem} ${
															p.id === presetId ? styles.presetItemActive : ''
														}`}
														onClick={() => handlePresetChange(p.id)}
													>
														<span className={styles.presetItemHead}>
															{p.label}
														</span>
														<span className={styles.presetItemMath}>
															target = {p.target}¢ · coins [{p.coins.join(', ')}
															]
														</span>
														<span className={styles.presetItemIntent}>
															{p.intent}
														</span>
													</button>
												</li>
											))}
										</ul>
									)}
								</div>
							</>
						)}
						{showIntervalPreset && (
							<>
								<span className={styles.notationDot} aria-hidden="true">
									·
								</span>
								<div className={styles.presetWrap} ref={presetWrapRef}>
									<button
										type="button"
										className={styles.presetBtn}
										onClick={() => setPresetOpen(o => !o)}
										aria-haspopup="listbox"
										aria-expanded={presetOpen}
										title="Pick an interval scenario"
									>
										<span>
											{intervalPreset.intervals.length} intervals ·{' '}
											{intervalPreset.label}
										</span>
										<ChevronDown size={12} strokeWidth={2} aria-hidden="true" />
									</button>
									{presetOpen && (
										<ul className={styles.presetMenu} role="listbox">
											{INTERVAL_SCHEDULING_PRESETS.map(p => (
												<li
													key={p.id}
													role="option"
													aria-selected={p.id === intervalPresetId}
												>
													<button
														type="button"
														className={`${styles.presetItem} ${
															p.id === intervalPresetId
																? styles.presetItemActive
																: ''
														}`}
														onClick={() => handleIntervalPresetChange(p.id)}
													>
														<span className={styles.presetItemHead}>
															{p.label}
														</span>
														<span className={styles.presetItemMath}>
															{p.intervals
																.map(iv => `${iv.id}[${iv.start}–${iv.end}]`)
																.join('  ')}
														</span>
														<span className={styles.presetItemIntent}>
															{p.intent}
														</span>
													</button>
												</li>
											))}
										</ul>
									)}
								</div>
							</>
						)}
						{showRodPreset && (
							<>
								<span className={styles.notationDot} aria-hidden="true">
									·
								</span>
								<div className={styles.presetWrap} ref={presetWrapRef}>
									<button
										type="button"
										className={styles.presetBtn}
										onClick={() => setPresetOpen(o => !o)}
										aria-haspopup="listbox"
										aria-expanded={presetOpen}
										title="Pick a price table"
									>
										<span>
											n = {rodPreset.n} · {rodPreset.label}
										</span>
										<ChevronDown size={12} strokeWidth={2} aria-hidden="true" />
									</button>
									{presetOpen && (
										<ul className={styles.presetMenu} role="listbox">
											{ROD_CUTTING_PRESETS.map(p => (
												<li
													key={p.id}
													role="option"
													aria-selected={p.id === rodPresetId}
												>
													<button
														type="button"
														className={`${styles.presetItem} ${
															p.id === rodPresetId
																? styles.presetItemActive
																: ''
														}`}
														onClick={() => handleRodPresetChange(p.id)}
													>
														<span className={styles.presetItemHead}>
															{p.label}
														</span>
														<span className={styles.presetItemMath}>
															n = {p.n} · price [{p.prices.join(', ')}]
														</span>
														<span className={styles.presetItemIntent}>
															{p.intent}
														</span>
													</button>
												</li>
											))}
										</ul>
									)}
								</div>
							</>
						)}
						{showLcsPreset && (
							<>
								<span className={styles.notationDot} aria-hidden="true">
									·
								</span>
								<div className={styles.presetWrap} ref={presetWrapRef}>
									<button
										type="button"
										className={styles.presetBtn}
										onClick={() => setPresetOpen(o => !o)}
										aria-haspopup="listbox"
										aria-expanded={presetOpen}
										title="Pick a string pair"
									>
										<span>
											{lcsPreset.x} / {lcsPreset.y}
										</span>
										<ChevronDown size={12} strokeWidth={2} aria-hidden="true" />
									</button>
									{presetOpen && (
										<ul className={styles.presetMenu} role="listbox">
											{LCS_PRESETS.map(p => (
												<li
													key={p.id}
													role="option"
													aria-selected={p.id === lcsPresetId}
												>
													<button
														type="button"
														className={`${styles.presetItem} ${
															p.id === lcsPresetId
																? styles.presetItemActive
																: ''
														}`}
														onClick={() => handleLcsPresetChange(p.id)}
													>
														<span className={styles.presetItemHead}>
															{p.label}
														</span>
														<span className={styles.presetItemMath}>
															X = {p.x} · Y = {p.y}
														</span>
														<span className={styles.presetItemIntent}>
															{p.intent}
														</span>
													</button>
												</li>
											))}
										</ul>
									)}
								</div>
							</>
						)}
						{showKnapsackPreset && (
							<>
								<span className={styles.notationDot} aria-hidden="true">
									·
								</span>
								<div className={styles.presetWrap} ref={presetWrapRef}>
									<button
										type="button"
										className={styles.presetBtn}
										onClick={() => setPresetOpen(o => !o)}
										aria-haspopup="listbox"
										aria-expanded={presetOpen}
										title="Pick a knapsack instance"
									>
										<span>
											W = {knapsackPreset.capacity} ·{' '}
											{knapsackPreset.items.length} items
										</span>
										<ChevronDown size={12} strokeWidth={2} aria-hidden="true" />
									</button>
									{presetOpen && (
										<ul className={styles.presetMenu} role="listbox">
											{KNAPSACK_PRESETS.map(p => (
												<li
													key={p.id}
													role="option"
													aria-selected={p.id === knapsackPresetId}
												>
													<button
														type="button"
														className={`${styles.presetItem} ${
															p.id === knapsackPresetId
																? styles.presetItemActive
																: ''
														}`}
														onClick={() => handleKnapsackPresetChange(p.id)}
													>
														<span className={styles.presetItemHead}>
															{p.label}
														</span>
														<span className={styles.presetItemMath}>
															W = {p.capacity} ·{' '}
															{p.items
																.map(
																	it => `${it.name}(${it.weight}/${it.value})`
																)
																.join('  ')}
														</span>
														<span className={styles.presetItemIntent}>
															{p.intent}
														</span>
													</button>
												</li>
											))}
										</ul>
									)}
								</div>
							</>
						)}
						{showHuffmanPreset && (
							<>
								<span className={styles.notationDot} aria-hidden="true">
									·
								</span>
								<div className={styles.presetWrap} ref={presetWrapRef}>
									<button
										type="button"
										className={styles.presetBtn}
										onClick={() => setPresetOpen(o => !o)}
										aria-haspopup="listbox"
										aria-expanded={presetOpen}
										title="Pick a symbol table"
									>
										<span>
											{huffmanPreset.symbols.length} symbols ·{' '}
											{huffmanPreset.label}
										</span>
										<ChevronDown size={12} strokeWidth={2} aria-hidden="true" />
									</button>
									{presetOpen && (
										<ul className={styles.presetMenu} role="listbox">
											{HUFFMAN_PRESETS.map(p => (
												<li
													key={p.id}
													role="option"
													aria-selected={p.id === huffmanPresetId}
												>
													<button
														type="button"
														className={`${styles.presetItem} ${
															p.id === huffmanPresetId
																? styles.presetItemActive
																: ''
														}`}
														onClick={() => handleHuffmanPresetChange(p.id)}
													>
														<span className={styles.presetItemHead}>
															{p.label}
														</span>
														<span className={styles.presetItemMath}>
															{p.symbols
																.map(s => `${s.char}:${s.freq}`)
																.join('  ')}
														</span>
														<span className={styles.presetItemIntent}>
															{p.intent}
														</span>
													</button>
												</li>
											))}
										</ul>
									)}
								</div>
							</>
						)}
						{showStairsControl && (
							<>
								<span className={styles.notationDot} aria-hidden="true">
									·
								</span>
								<div className={styles.stepper}>
									<span className={styles.stepperLabel}>n =</span>
									<button
										type="button"
										className={styles.stepperBtn}
										onClick={() => handleStairsChange(stairsN - 1)}
										disabled={stairsN <= stairsMin}
										aria-label="Fewer stairs"
										title="Fewer stairs"
									>
										<Minus size={14} strokeWidth={2.5} aria-hidden="true" />
									</button>
									<input
										type="range"
										className={styles.stepperSlider}
										min={stairsMin}
										max={stairsMax}
										step={1}
										value={stairsN}
										onChange={e => handleStairsChange(Number(e.target.value))}
										aria-label={`Number of stairs: ${stairsN}`}
									/>
									<button
										type="button"
										className={styles.stepperBtn}
										onClick={() => handleStairsChange(stairsN + 1)}
										disabled={stairsN >= stairsMax}
										aria-label="More stairs"
										title="More stairs"
									>
										<Plus size={14} strokeWidth={2.5} aria-hidden="true" />
									</button>
									<span className={styles.stepperValue}>{stairsN}</span>
								</div>
							</>
						)}
					</div>

					<div className={styles.actions}>
						<button
							type="button"
							className={styles.ghostBtn}
							onClick={() => setReadMoreOpen(true)}
						>
							Read more
						</button>
						<button
							type="button"
							className={styles.ghostBtn}
							onClick={handleReset}
							title="Reset walkthrough"
						>
							<RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
							<span>Reset</span>
						</button>
					</div>
				</div>
			</header>

			<div className={styles.body}>
				<section
					className={styles.canvas}
					aria-label={`${algo?.name} visualization`}
				>
					<div className={styles.canvasOverlay} aria-hidden="true">
						<span className={styles.overlayNotation}>{algo?.complexity}</span>
						{frame?.title && (
							<>
								<span className={styles.overlayDot}>·</span>
								<span className={styles.overlayStat}>{frame.title}</span>
							</>
						)}
					</div>

					<div className={styles.canvasStage}>
						{algorithmId === 'coinChange' && (
							<CoinChangeCanvas frame={frame} preset={preset} />
						)}
						{algorithmId === 'climbingStairs' && (
							<ClimbingStairsCanvas frame={frame} n={stairsN} />
						)}
						{algorithmId === 'intervalScheduling' && (
							<IntervalSchedulingCanvas
								frame={frame}
								intervals={intervalPreset.intervals}
							/>
						)}
						{algorithmId === 'rodCutting' && <RodCuttingCanvas frame={frame} />}
						{algorithmId === 'lcs' && <LcsCanvas frame={frame} />}
						{algorithmId === 'knapsack01' && <Knapsack01Canvas frame={frame} />}
						{algorithmId === 'fractionalKnapsack' && (
							<FractionalKnapsackCanvas frame={frame} />
						)}
						{algorithmId === 'huffman' && <HuffmanCanvas frame={frame} />}
					</div>

					<FrameTrace
						className={styles.trace}
						eyebrow="Step"
						narration={narration}
						step={currentStep}
						totalSteps={totalSteps}
					/>
				</section>

				<PseudoState
					className={styles.pseudo}
					lines={lines}
					frame={frame}
					step={currentStep}
					totalSteps={totalSteps}
					isRunning={canStep && currentStep > 0}
				/>
			</div>

			<div className={styles.bar}>
				<StepControlBar
					isPlaying={isPlaying}
					canStep={canStep}
					currentStep={currentStep}
					totalSteps={totalSteps}
					speed={speed}
					speedOptions={SPEED_OPTIONS}
					onPlayPause={() => {
						notifyInteract();
						toggle();
					}}
					onStepBack={() => {
						notifyInteract();
						stepBack();
					}}
					onStepForward={() => {
						notifyInteract();
						stepForward();
					}}
					onSeek={s => {
						notifyInteract();
						seek(s);
					}}
					onFirst={() => {
						notifyInteract();
						first();
					}}
					onLast={() => {
						notifyInteract();
						last();
					}}
					onSpeedChange={setSpeed}
					scopeRef={playerRef}
				/>
			</div>

			<StrategiesAlgorithmPicker
				isOpen={pickerOpen}
				onClose={() => setPickerOpen(false)}
				value={algorithmId}
				onChange={handleAlgorithmChange}
			/>

			<StrategiesReadMoreOverlay
				isOpen={readMoreOpen}
				onClose={() => setReadMoreOpen(false)}
				algorithmId={algorithmId}
			/>
		</div>
	);
};

export default StrategiesDashboard;
