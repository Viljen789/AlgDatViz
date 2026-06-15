import { useMemo, useState } from 'react';
import styles from './OperationsComparison.module.css';
import AlgorithmStats from '../../components/Sorting/AlgorithmInfoPanel/Views/AlgorithmStats/AlgorithmStats.jsx';

const StatCard = ({ label, value }) => (
	<div className={styles.statCard}>
		<h4>{label}</h4>
		<span>{value}</span>
	</div>
);

// The four plotted series: the measured run vs. the three complexity envelopes.
const SERIES = [
	{ key: 'Actual Operations', color: 'var(--color-primary)', dashed: false },
	{ key: 'O(n²)', color: 'var(--color-error)', dashed: true },
	{ key: 'O(n log n)', color: 'var(--color-warning)', dashed: true },
	{ key: 'O(n)', color: 'var(--color-success)', dashed: true },
];

const formatTick = v =>
	v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`;

// "Nice" round y-axis ticks from 0 to >= max, so the top gridline clears the data.
const niceTicks = (max, count = 4) => {
	if (!(max > 0)) return [0, 1];
	const rawStep = max / count;
	const mag = 10 ** Math.floor(Math.log10(rawStep));
	const norm = rawStep / mag;
	const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
	const ticks = [];
	for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
	return ticks;
};

/**
 * OperationsChart — a hand-built SVG line chart (replaces the recharts LineChart).
 * The plot lines live in a 0..100 viewBox stretched to fill (preserveAspectRatio
 * "none") with non-scaling strokes, so they stay crisp at any width with no
 * resize measurement. Axes, legend, and the hover readout are positioned HTML.
 */
const OperationsChart = ({ data }) => {
	const [hover, setHover] = useState(null);

	if (!Array.isArray(data) || data.length === 0) return null;

	const steps = data.map(d => d.step);
	const minStep = Math.min(...steps);
	const maxStep = Math.max(...steps);
	const stepSpan = Math.max(1, maxStep - minStep);

	const rawMax = Math.max(1, ...data.flatMap(d => SERIES.map(s => d[s.key] || 0)));
	const yTicks = niceTicks(rawMax, 4);
	const yMax = yTicks[yTicks.length - 1] || rawMax;

	const xPct = step => ((step - minStep) / stepSpan) * 100;
	const yFromBottom = val => (val / yMax) * 100;
	const yPct = val => 100 - yFromBottom(val);

	// ~5 evenly spaced x ticks taken from real data steps (deduped).
	const xTickCount = Math.min(5, data.length);
	const xTicks = [
		...new Set(
			Array.from({ length: xTickCount }, (_, i) => {
				const idx = Math.round(
					(i / Math.max(1, xTickCount - 1)) * (data.length - 1)
				);
				return data[idx].step;
			})
		),
	];

	const onMove = e => {
		const rect = e.currentTarget.getBoundingClientRect();
		if (rect.width === 0) return;
		const frac = (e.clientX - rect.left) / rect.width;
		const target = minStep + frac * stepSpan;
		let best = 0;
		let bestDist = Infinity;
		data.forEach((d, i) => {
			const dist = Math.abs(d.step - target);
			if (dist < bestDist) {
				bestDist = dist;
				best = i;
			}
		});
		setHover(best);
	};

	const hovered = hover != null ? data[hover] : null;
	const hoveredX = hovered ? xPct(hovered.step) : 0;

	return (
		<div className={styles.chart}>
			<div className={styles.yAxis} aria-hidden="true">
				{yTicks.map(t => (
					<span
						key={t}
						className={styles.yTick}
						style={{ bottom: `${yFromBottom(t)}%` }}
					>
						{formatTick(t)}
					</span>
				))}
			</div>

			<div
				className={styles.plot}
				onMouseMove={onMove}
				onMouseLeave={() => setHover(null)}
			>
				<svg
					className={styles.svg}
					viewBox="0 0 100 100"
					preserveAspectRatio="none"
					aria-hidden="true"
				>
					{yTicks.map(t => (
						<line
							key={t}
							className={styles.grid}
							x1="0"
							x2="100"
							y1={yPct(t)}
							y2={yPct(t)}
							vectorEffect="non-scaling-stroke"
						/>
					))}
					{hovered && (
						<line
							className={styles.guide}
							x1={hoveredX}
							x2={hoveredX}
							y1="0"
							y2="100"
							vectorEffect="non-scaling-stroke"
						/>
					)}
					{SERIES.map(s => (
						<polyline
							key={s.key}
							className={styles.line}
							points={data.map(d => `${xPct(d.step)},${yPct(d[s.key] || 0)}`).join(' ')}
							style={{ stroke: s.color }}
							strokeDasharray={s.dashed ? '5 4' : undefined}
							vectorEffect="non-scaling-stroke"
						/>
					))}
				</svg>

				{hovered &&
					SERIES.map(s => (
						<span
							key={s.key}
							className={styles.dot}
							style={{
								left: `${hoveredX}%`,
								bottom: `${yFromBottom(hovered[s.key] || 0)}%`,
								background: s.color,
							}}
						/>
					))}

				{hovered && (
					<div
						className={styles.tooltip}
						style={{
							left: `${hoveredX}%`,
							transform:
								hoveredX > 60
									? 'translateX(-100%) translateX(-14px)'
									: 'translateX(14px)',
						}}
					>
						<span className={styles.tipStep}>Step {hovered.step}</span>
						{SERIES.map(s => (
							<span key={s.key} className={styles.tipRow}>
								<span
									className={styles.tipSwatch}
									style={{ background: s.color }}
								/>
								<span className={styles.tipName}>{s.key}</span>
								<span className={styles.tipVal}>
									{(hovered[s.key] || 0).toLocaleString()}
								</span>
							</span>
						))}
					</div>
				)}
			</div>

			<div className={styles.xAxis} aria-hidden="true">
				{xTicks.map(t => (
					<span
						key={t}
						className={styles.xTick}
						style={{ left: `${xPct(t)}%` }}
					>
						{t}
					</span>
				))}
			</div>

			<ul className={styles.legend}>
				{SERIES.map(s => (
					<li key={s.key} className={styles.legendItem}>
						<span
							className={styles.legendSwatch}
							style={
								s.dashed
									? {
											backgroundImage: `repeating-linear-gradient(90deg, ${s.color} 0 5px, transparent 5px 9px)`,
										}
									: { backgroundColor: s.color }
							}
						/>
						{s.key}
					</li>
				))}
			</ul>
		</div>
	);
};

const calculateTheoreticalOps = (step, totalSteps, arraySize) => {
	if (arraySize <= 1 || totalSteps === 0) return { on2: 0, onlogn: 0, on: 0 };

	const progress = step / totalSteps;

	const n = arraySize;
	const currentN = Math.ceil(progress * n);

	return {
		on2: Math.round(currentN * currentN * 0.5),
		onlogn: Math.round(currentN * Math.log2(Math.max(currentN, 1))),
		on: currentN,
	};
};

const OperationsComparison = ({ operationStats, algorithmInfo, arraySize }) => {
	const chartData = useMemo(() => {
		if (
			!operationStats ||
			!Array.isArray(operationStats) ||
			operationStats.length === 0
		) {
			return (
				<div className={styles.comparisonContainer}>
					<AlgorithmStats info={algorithmInfo} />
					<div className={styles.placeholder}>
						<h4>Live Performance Analysis</h4>
						<p>Run a sorting algorithm to see the chart.</p>
					</div>
				</div>
			);
		}

		const totalSteps = operationStats[operationStats.length - 1]?.step || 1;

		const maxPoints = 100;
		const sampleRate = Math.max(
			1,
			Math.floor(operationStats.length / maxPoints)
		);

		return operationStats
			.filter(
				(_, index) =>
					index % sampleRate === 0 || index === operationStats.length - 1
			)
			.map(stat => {
				const theoretical = calculateTheoreticalOps(
					stat.step,
					totalSteps,
					arraySize
				);

				return {
					name: `Step ${stat.step}`,
					step: stat.step,
					'Actual Operations': stat.totalOperations,
					'O(n²)': theoretical.on2,
					'O(n log n)': theoretical.onlogn,
					'O(n)': theoretical.on,
				};
			});
	}, [operationStats, arraySize, algorithmInfo]);

	const finalStats = useMemo(() => {
		return operationStats && operationStats.length > 0
			? operationStats[operationStats.length - 1]
			: null;
	}, [operationStats]);

	const expectedOperations = useMemo(() => {
		if (!algorithmInfo || arraySize <= 1) return 0;

		const complexity = algorithmInfo?.complexity?.time?.average || 'O(n²)';
		const n = arraySize;

		if (complexity.includes('d') && complexity.includes('n + k')) {
			const digitPasses = Math.max(1, String(Math.max(n, 1)).length);
			const radixBuckets = 10;
			return digitPasses * (n + radixBuckets);
		}

		if (complexity.includes('n + k')) {
			const rangeOrBuckets =
				algorithmInfo?.name === 'Bucket Sort'
					? Math.max(1, Math.round(Math.sqrt(n)))
					: n;
			return n + rangeOrBuckets;
		}

		if (complexity.includes('n log n')) return Math.round(n * Math.log2(n));
		if (complexity.includes('n²')) return Math.round(n * n * 0.5);
		if (complexity.includes('n')) return n;

		return Math.round(n * n * 0.5);
	}, [algorithmInfo, arraySize]);

	if (
		!operationStats ||
		!Array.isArray(operationStats) ||
		operationStats.length === 0
	) {
		return (
			<div className={styles.comparisonContainer}>
				<AlgorithmStats info={algorithmInfo} />
				<div className={styles.placeholder}>
					<h4>Performance Analysis</h4>
					<p>
						Run a sorting algorithm to see its performance analysis and
						complexity chart.
					</p>
				</div>
			</div>
		);
	}

	if (!finalStats) return null;

	const expectedComplexity =
		algorithmInfo?.complexity?.time?.average || 'O(n²)';

	return (
		<div className={styles.comparisonContainer}>
			<AlgorithmStats info={algorithmInfo} />

			<div className={styles.statsGrid}>
				<StatCard
					label="Total Operations"
					value={finalStats.totalOperations.toLocaleString()}
				/>
				<StatCard
					label={`Expected (${expectedComplexity})`}
					value={expectedOperations.toLocaleString()}
				/>
				<StatCard
					label="Comparisons"
					value={finalStats.comparisons.toLocaleString()}
				/>
				<StatCard
					label="Array Writes"
					value={finalStats.arrayWrites.toLocaleString()}
				/>
			</div>

			<div className={styles.chartContainer}>
				<OperationsChart data={chartData} />
			</div>
		</div>
	);
};

export default OperationsComparison;
