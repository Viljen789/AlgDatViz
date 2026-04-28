import { Calculator, GitFork, Layers, Sigma } from 'lucide-react';
import { useMemo, useState } from 'react';
import LearningPanel from '../../common/LearningPanel/LearningPanel.jsx';
import styles from './MasterTheoremDashboard.module.css';

const EXAMPLES = [
	{ label: 'Merge sort', a: 2, b: 2, d: 1, k: 0 },
	{ label: 'Binary search', a: 1, b: 2, d: 0, k: 0 },
	{ label: 'Karatsuba', a: 3, b: 2, d: 1, k: 0 },
	{ label: 'Strassen', a: 7, b: 2, d: 2, k: 0 },
	{ label: 'Log-balanced', a: 4, b: 2, d: 2, k: 1 },
];

const formatNumber = value => {
	if (Number.isInteger(value)) return String(value);
	return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
};

const formatPower = value => {
	if (Math.abs(value) < 0.001) return '1';
	if (Math.abs(value - 1) < 0.001) return 'n';
	return `n^${formatNumber(value)}`;
};

const formatLog = k => {
	if (k === 0) return '';
	if (k === 1) return ' log n';
	return ` log^${k} n`;
};

const getCase = ({ a, b, d, k }) => {
	const critical = Math.log(a) / Math.log(b);
	const diff = d - critical;
	const tolerance = 0.04;

	if (diff > tolerance) {
		return {
			name: 'Case 3',
			tone: 'Root work wins',
			result: `Theta(${formatPower(d)}${formatLog(k)})`,
			explanation:
				'The combine work grows faster than the number of leaves, so most work is near the top of the recursion tree.',
			accent: '#f8a74f',
			critical,
			ratio: a / b ** d,
		};
	}

	if (diff < -tolerance) {
		return {
			name: 'Case 1',
			tone: 'Leaves win',
			result: `Theta(${formatPower(critical)})`,
			explanation:
				'The recursive subproblems multiply faster than the combine work shrinks, so the bottom levels dominate.',
			accent: '#38c9a0',
			critical,
			ratio: a / b ** d,
		};
	}

	return {
		name: 'Case 2',
		tone: 'Every level ties',
		result: `Theta(${formatPower(d)}${formatLog(k + 1)})`,
		explanation:
			'Each level costs about the same, so the extra log n levels multiply the work.',
		accent: '#4f7cf8',
		critical,
		ratio: a / b ** d,
	};
};

const buildLevels = ({ a, b, d }) => {
	const ratio = a / b ** d;
	const levels = Array.from({ length: 8 }, (_, level) => {
		const nodes = a ** level;
		const subproblem = `n/${formatNumber(b ** level)}`;
		const relativeWork = ratio ** level;
		return {
			level,
			nodes,
			subproblem,
			relativeWork,
		};
	});
	const maxWork = Math.max(...levels.map(level => level.relativeWork), 1);
	return levels.map(level => ({
		...level,
		width: Math.max(10, (level.relativeWork / maxWork) * 100),
	}));
};

const getMasterLearningContent = (params, analysis) => {
	const critical = formatNumber(analysis.critical);
	const d = formatNumber(params.d);
	return {
		name: 'Master Theorem',
		category: 'Recurrence analysis',
		summary:
			'Compare work created by recursive leaves with work done at each level of the recursion tree.',
		intuition:
			'The theorem asks where the work piles up: at the leaves, evenly across levels, or near the root.',
		strategy: [
			`Compute c = log_b(a) = ${critical}.`,
			`Compare c with d = ${d}.`,
			'If c is larger, leaves dominate.',
			'If c and d tie, every level contributes about the same work.',
			'If d is larger, root-side combine work dominates.',
		],
		complexity: {
			time: { result: analysis.result },
			space: { worst: 'Recursion depth' },
			variables: [
				{ symbol: 'a', label: 'subproblems' },
				{ symbol: 'b', label: 'shrink factor' },
				{ symbol: 'd', label: 'combine exponent' },
				{ symbol: 'k', label: 'log power' },
			],
			why: [
				`The leaf-growth exponent is log_b(a) = ${critical}.`,
				`The combine-work exponent is d = ${d}.`,
				analysis.explanation,
			],
		},
		tradeoffs: {
			useWhen: [
				'The recurrence has the form T(n) = aT(n / b) + f(n).',
				'f(n) can be compared against n^log_b(a).',
			],
			watchOut: [
				'It does not fit every recurrence shape.',
				'Boundary cases need careful handling of logarithmic factors.',
			],
		},
		legend: [
			{ label: 'Small relative work', color: 'var(--color-accent-blue)' },
			{ label: 'Dominant work level', color: analysis.accent },
			{ label: 'Case boundary', color: 'var(--color-accent-yellow)' },
		],
		compareCards: [
			{
				label: 'Case 1',
				title: 'Leaves win',
				text: 'log_b(a) is larger than d, so lower levels dominate.',
			},
			{
				label: 'Case 2',
				title: 'Levels tie',
				text: 'log_b(a) and d match, so the log number of levels multiplies the work.',
			},
			{
				label: 'Case 3',
				title: 'Root work wins',
				text: 'd is larger than log_b(a), so combine work dominates near the top.',
			},
		],
		pseudocode: [
			'identify a, b, d, and k',
			'c = log_b(a)',
			'if c > d: return Case 1',
			'if c == d: return Case 2',
			'if c < d: return Case 3',
			'apply the matching Theta formula',
		],
		conceptChecks: [
			{
				question: 'What does log_b(a) represent?',
				answer:
					'It is the exponent describing how much work exists at the leaves of the recursion tree.',
			},
			{
				question: 'Why does Case 2 add a log factor?',
				answer:
					'Each level contributes about the same work, and there are about log n levels.',
			},
			{
				question: 'What does the level ratio show?',
				answer:
					'It shows whether relative work grows, shrinks, or stays flat as the recursion gets deeper.',
			},
		],
		prompt: 'Try Merge sort, Binary search, and Karatsuba to see all three comparison outcomes.',
	};
};

const NumberControl = ({ label, value, min, max, step = 1, onChange }) => (
	<label className={styles.numberControl}>
		<span>{label}</span>
		<div>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={event => onChange(Number(event.target.value))}
			/>
			<input
				type="number"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={event => onChange(Number(event.target.value))}
			/>
		</div>
	</label>
);

const MasterTheoremDashboard = () => {
	const [params, setParams] = useState(EXAMPLES[0]);
	const analysis = useMemo(() => getCase(params), [params]);
	const levels = useMemo(() => buildLevels(params), [params]);
	const learningContent = useMemo(
		() => getMasterLearningContent(params, analysis),
		[params, analysis]
	);

	const updateParam = (key, value) => {
		setParams(current => ({
			...current,
			label: 'Custom',
			[key]: value,
		}));
	};

	return (
		<div className={styles.dashboard}>
			<section className={styles.workbench}>
				<div className={styles.heroBand}>
					<div className={styles.heroTitle}>
						<Sigma size={24} />
						<div>
							<strong>Master Theorem lab</strong>
							<span>T(n) = aT(n / b) + f(n), where f(n) = n^d log^k n</span>
						</div>
					</div>
					<div className={styles.exampleRow}>
						{EXAMPLES.map(example => (
							<button
								key={example.label}
								type="button"
								onClick={() => setParams(example)}
								className={params.label === example.label ? styles.exampleActive : ''}
							>
								{example.label}
							</button>
						))}
					</div>
				</div>

				<div className={styles.controls}>
					<NumberControl
						label="Subproblems (a)"
						value={params.a}
						min={1}
						max={9}
						onChange={value => updateParam('a', Math.max(1, value))}
					/>
					<NumberControl
						label="Shrink factor (b)"
						value={params.b}
						min={2}
						max={6}
						onChange={value => updateParam('b', Math.max(2, value))}
					/>
					<NumberControl
						label="Combine exponent (d)"
						value={params.d}
						min={0}
						max={4}
						step={0.25}
						onChange={value => updateParam('d', Math.max(0, value))}
					/>
					<NumberControl
						label="Log power (k)"
						value={params.k}
						min={0}
						max={3}
						onChange={value => updateParam('k', Math.max(0, value))}
					/>
				</div>

				<div className={styles.treeArea}>
					<div className={styles.recursionTree}>
						{levels.map(level => (
							<div key={level.level} className={styles.levelRow}>
								<div className={styles.levelMeta}>
									<strong>Level {level.level}</strong>
									<span>
										{formatNumber(level.nodes)} calls of size {level.subproblem}
									</span>
								</div>
								<div className={styles.levelBarTrack}>
									<div
										className={styles.levelBar}
										style={{
											width: `${level.width}%`,
											backgroundColor: analysis.accent,
										}}
									/>
								</div>
								<span className={styles.workValue}>
									{level.relativeWork.toFixed(2)}x
								</span>
							</div>
						))}
					</div>
				</div>
			</section>

			<aside className={styles.lessonPanel}>
				<div className={styles.resultCard} style={{ borderColor: analysis.accent }}>
					<span>{analysis.name}</span>
					<strong>{analysis.tone}</strong>
					<p>{analysis.result}</p>
				</div>

				<div className={styles.compareGrid}>
					<div>
						<GitFork size={17} />
						<span>Leaf exponent</span>
						<strong>log_b(a) = {formatNumber(analysis.critical)}</strong>
					</div>
					<div>
						<Layers size={17} />
						<span>Combine exponent</span>
						<strong>d = {formatNumber(params.d)}</strong>
					</div>
					<div>
						<Calculator size={17} />
						<span>Level ratio</span>
						<strong>{analysis.ratio.toFixed(2)}</strong>
					</div>
				</div>

				<LearningPanel
					content={learningContent}
					trace={{
						title: analysis.name,
						text: analysis.explanation,
						steps: [
							{
								label: 'Leaf exponent',
								text: `log_b(a) = ${formatNumber(analysis.critical)}`,
							},
							{
								label: 'Combine exponent',
								text: `d = ${formatNumber(params.d)}`,
							},
							{
								label: 'Result',
								text: analysis.result,
							},
						],
					}}
					accent={analysis.accent}
				/>
			</aside>
		</div>
	);
};

export default MasterTheoremDashboard;
