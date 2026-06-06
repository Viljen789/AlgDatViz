import { useEffect, useMemo, useRef } from 'react';
import {
	Bar,
	BarChart,
	Cell,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from 'recharts';
import { usePlayback, PseudoState } from '../../common/PlaybackEngine/index.js';
import StepControlBar from '../../common/StepControlBar/StepControlBar.jsx';
import { SPEED_OPTIONS } from '../../utils/sorting/algorithmMeta.js';
import {
	analyseRecurrence,
	buildLevels,
	buildRecursionFrames,
	EXAMPLES,
	formatNumber,
	RECURSION_PSEUDOCODE,
} from './masterMath.js';
import styles from './MasterTheoremPlayground.module.css';

const TREE_DEPTH = 6;

const NumberControl = ({ label, hint, value, min, max, step = 1, onChange }) => (
	<label className={styles.control}>
		<span className={styles.controlLabel}>
			{label}
			<span className={styles.controlHint}>{hint}</span>
		</span>
		<div className={styles.controlInputs}>
			<input
				type="range"
				className={styles.range}
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={e => onChange(Number(e.target.value))}
				aria-label={label}
			/>
			<input
				type="number"
				className={styles.number}
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={e => onChange(Number(e.target.value))}
				aria-label={`${label} value`}
			/>
		</div>
	</label>
);

/**
 * MasterTheoremPlayground — the restyled, engine-driven sandbox.
 *
 * The student sets a, b, d, k for T(n) = a·T(n/b) + f(n). The playback engine
 * then "reveals" the recursion tree one level at a time: each frame uncovers a
 * deeper level so the leaves-vs-combine comparison builds up visibly. A recharts
 * bar chart shows relative work per level, the dominant side is highlighted, and
 * the Master Theorem verdict updates live.
 */
const MasterTheoremPlayground = ({ onUserInteract, params, onParamsChange }) => {
	const playerRef = useRef(null);

	const analysis = useMemo(() => analyseRecurrence(params), [params]);
	const levels = useMemo(() => buildLevels(params, TREE_DEPTH), [params]);

	// Synced pseudocode/state frames: one per unfolded level (frame i reveals
	// levels 0..i), then a closing verdict frame. The engine never inspects the
	// frame shape; we read currentStep back out to drive both the chart reveal
	// and the live PseudoState panel from a single source of truth (masterMath,
	// pure + unit-tested).
	const frames = useMemo(
		() => buildRecursionFrames(params, TREE_DEPTH),
		[params]
	);

	const player = usePlayback(frames, { speed: 100 });
	const { currentStep, totalSteps } = player;
	const activeFrame = frames[currentStep] ?? frames[0];
	// The last frame is the verdict; cap the chart reveal at the deepest level.
	const revealed = Math.min(currentStep, TREE_DEPTH);

	// When the recurrence changes, snap the reveal back to the root so the build
	// up reads cleanly for the new tree.
	useEffect(() => {
		player.first();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params]);

	const updateParam = (key, value) => {
		onUserInteract?.();
		onParamsChange(current => ({ ...current, label: 'Custom', [key]: value }));
	};

	const selectExample = example => {
		onUserInteract?.();
		onParamsChange(example);
	};

	const dominant = analysis.dominant;
	const isDominantLevel = level => {
		if (dominant === 'leaves') return level === TREE_DEPTH;
		if (dominant === 'root') return level === 0;
		return true;
	};

	const chartData = useMemo(
		() =>
			levels.map(level => ({
				name: `L${level.level}`,
				work: Number(level.relativeWork.toFixed(3)),
				revealed: level.level <= revealed,
				dominant: isDominantLevel(level.level),
			})),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[levels, revealed, dominant]
	);

	return (
		<div className={styles.shell} ref={playerRef}>
			{/* Recurrence + presets */}
			<header className={styles.bar}>
				<p className={styles.recurrence}>
					T(n) = <b>{params.a}</b>·T(n/<b>{params.b}</b>) + f(n),{' '}
					f(n) = n<sup>{formatNumber(params.d)}</sup>
					{params.k > 0 && (
						<>
							{' '}
							log<sup>{formatNumber(params.k)}</sup> n
						</>
					)}
				</p>
				<div className={styles.presets} role="group" aria-label="Example recurrences">
					{EXAMPLES.map(example => (
						<button
							key={example.label}
							type="button"
							className={`${styles.preset} ${
								params.label === example.label ? styles.presetActive : ''
							}`}
							aria-pressed={params.label === example.label}
							onClick={() => selectExample(example)}
						>
							{example.label}
						</button>
					))}
				</div>
			</header>

			<div className={styles.body}>
				{/* Left: controls + chart */}
				<div className={styles.main}>
					<div className={styles.controls}>
						<NumberControl
							label="Subproblems"
							hint="a"
							value={params.a}
							min={1}
							max={9}
							onChange={v => updateParam('a', Math.max(1, v))}
						/>
						<NumberControl
							label="Shrink factor"
							hint="b"
							value={params.b}
							min={2}
							max={6}
							onChange={v => updateParam('b', Math.max(2, v))}
						/>
						<NumberControl
							label="Combine exponent"
							hint="d in f(n)=n^d"
							value={params.d}
							min={0}
							max={4}
							step={0.25}
							onChange={v => updateParam('d', Math.max(0, v))}
						/>
						<NumberControl
							label="Log power"
							hint="k in log^k n"
							value={params.k}
							min={0}
							max={3}
							onChange={v => updateParam('k', Math.max(0, v))}
						/>
					</div>

					<div className={styles.chartCard}>
						<div className={styles.chartHead}>
							<span className={styles.chartTitle}>
								Relative work per level
							</span>
							<span className={styles.chartHint}>
								revealing level {revealed} / {TREE_DEPTH}
							</span>
						</div>
						<div className={styles.chartArea}>
							<ResponsiveContainer width="100%" height="100%">
								<BarChart
									data={chartData}
									margin={{ top: 8, right: 8, bottom: 4, left: 8 }}
								>
									<XAxis
										dataKey="name"
										tick={{
											fill: 'var(--color-text-muted)',
											fontSize: 11,
											fontFamily: 'var(--font-family-mono)',
										}}
										tickLine={false}
										axisLine={{ stroke: 'var(--color-border)' }}
									/>
									<YAxis hide domain={[0, 'dataMax']} />
									<Bar
										dataKey="work"
										radius={[3, 3, 0, 0]}
										isAnimationActive={false}
									>
										{chartData.map(entry => (
											<Cell
												key={entry.name}
												fill={
													entry.dominant
														? 'var(--topic-accent)'
														: 'var(--color-text-dim)'
												}
												fillOpacity={entry.revealed ? 1 : 0.18}
											/>
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</div>

					<div className={styles.controlsDock}>
						<StepControlBar
							isPlaying={player.isPlaying}
							canStep={totalSteps > 0}
							currentStep={currentStep}
							totalSteps={totalSteps}
							speed={player.speed}
							speedOptions={SPEED_OPTIONS}
							onPlayPause={() => {
								onUserInteract?.();
								player.toggle();
							}}
							onStepBack={() => {
								onUserInteract?.();
								player.stepBack();
							}}
							onStepForward={() => {
								onUserInteract?.();
								player.stepForward();
							}}
							onSeek={step => {
								onUserInteract?.();
								player.seek(step);
							}}
							onFirst={() => {
								onUserInteract?.();
								player.first();
							}}
							onLast={() => {
								onUserInteract?.();
								player.last();
							}}
							onSpeedChange={player.setSpeed}
							scopeRef={playerRef}
						/>
					</div>
				</div>

				{/* Right: verdict + synced pseudocode walk */}
				<aside className={styles.side}>
					<div className={styles.verdict}>
						<span className={styles.verdictCase}>{analysis.name}</span>
						<strong className={styles.verdictTone}>{analysis.tone}</strong>
						<code className={styles.verdictResult}>{analysis.result}</code>
					</div>

					<PseudoState
						lines={RECURSION_PSEUDOCODE}
						frame={activeFrame}
						label="Recursion walk"
						stateLabel="This level"
						step={currentStep}
						totalSteps={totalSteps}
						isRunning
					/>
				</aside>
			</div>
		</div>
	);
};

export default MasterTheoremPlayground;
