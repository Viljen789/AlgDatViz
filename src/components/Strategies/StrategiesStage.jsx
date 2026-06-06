import { useMemo } from 'react';
import {
	buildRecursionTree,
	recursionTreeToLevels,
} from './climbingStairsRecursion.js';
import { SCENES } from './scenes.js';
import styles from './StrategiesStage.module.css';

// The synchronized concept stage. It reacts to the active scrolly scene (by id,
// not a fragile integer index) and visualizes the greedy-vs-DP fork on three
// running examples:
//   • coin change (target 10, coins {1,5,6}) — where greedy is trapped and DP
//     wins, used for the first scenes plus the closing summary;
//   • climbing stairs — the overlapping-subproblems vehicle: a naive recursion
//     tree whose repeated subproblems collapse into a one-cell-per-state table;
//   • interval scheduling — where the earliest-finish greedy choice is safe.
// Everything is token-tinted; the topic hue arrives via --topic-accent.

const COINS = [1, 5, 6];
const TARGET = 10;
const STAIRS_N = 5;

// dp[i] = fewest coins to make i, for coins {1,5,6}, target 10.
const buildDpTable = () => {
	const dp = new Array(TARGET + 1).fill(null);
	dp[0] = 0;
	for (let i = 1; i <= TARGET; i++) {
		let best = null;
		for (const c of COINS) {
			if (i - c >= 0 && dp[i - c] != null) {
				const cand = dp[i - c] + 1;
				if (best == null || cand < best) best = cand;
			}
		}
		dp[i] = best;
	}
	return dp;
};

// Greedy on {6,5,1}: 6 then four 1s — stuck at five coins.
const GREEDY_CHOICES = [6, 1, 1, 1, 1];

// Interval scheduling demo (sorted by finish time). Chosen by earliest-finish.
const INTERVALS = [
	{ id: 'A', start: 0, end: 2, chosen: true },
	{ id: 'B', start: 1, end: 4, chosen: false },
	{ id: 'C', start: 3, end: 5, chosen: true },
	{ id: 'D', start: 4, end: 7, chosen: false },
	{ id: 'E', start: 6, end: 8, chosen: true },
];
const INTERVAL_MAX = 8;

const CoinBoard = ({ sceneId }) => {
	const dp = useMemo(buildDpTable, []);

	// Scene-driven reveal. The DP table is dormant until the scene that explains
	// it, then settles fully; the summary keeps the answer visible.
	const dpSettled = sceneId === 'dp-remembers' || sceneId === 'choose-what';
	const filledThrough = dpSettled ? TARGET : 0;

	const showGreedy =
		sceneId === 'two-shapes' ||
		sceneId === 'greedy-trap' ||
		sceneId === 'choose-what';
	const greedyTrapped = sceneId !== 'two-shapes';
	const dpAnswer = dp[TARGET];

	return (
		<div className={styles.coinBoard}>
			<div className={styles.lane}>
				<div className={styles.laneHead}>
					<span className={styles.laneTag}>Greedy</span>
					<span className={styles.laneSub}>take the biggest coin that fits</span>
				</div>
				<div className={styles.coinRow}>
					{showGreedy ? (
						GREEDY_CHOICES.map((c, i) => (
							<span
								key={i}
								className={`${styles.coin} ${
									greedyTrapped && c === 1 ? styles.coinWaste : styles.coinTake
								}`}
								style={{ '--coin-delay': `${i * 70}ms` }}
							>
								{c}¢
							</span>
						))
					) : (
						<span className={styles.coinPlaceholder}>10¢ to make…</span>
					)}
				</div>
				<p
					className={`${styles.laneVerdict} ${
						greedyTrapped ? styles.laneVerdictBad : ''
					}`}
				>
					{greedyTrapped
						? `${GREEDY_CHOICES.length} coins — stuck after taking 6¢ first`
						: 'commits to the largest coin first'}
				</p>
			</div>

			<div className={styles.lane}>
				<div className={styles.laneHead}>
					<span className={`${styles.laneTag} ${styles.laneTagDp}`}>
						Dynamic programming
					</span>
					<span className={styles.laneSub}>1 + min(dp[i − c]) for every coin</span>
				</div>
				<ol className={styles.dpRow} aria-label="DP table">
					{dp.map((value, i) => {
						const isFilled = i <= filledThrough && value != null;
						const isTarget = i === TARGET;
						return (
							<li
								key={i}
								className={`${styles.dpCell} ${
									isFilled ? styles.dpCellFilled : ''
								} ${isTarget && isFilled ? styles.dpCellAnswer : ''}`}
								style={{ '--cell-delay': `${i * 55}ms` }}
							>
								<span className={styles.dpIndex}>{i}</span>
								<span className={styles.dpValue}>
									{isFilled ? value : '·'}
								</span>
							</li>
						);
					})}
				</ol>
				<p
					className={`${styles.laneVerdict} ${
						filledThrough >= TARGET ? styles.laneVerdictGood : ''
					}`}
				>
					{filledThrough >= TARGET
						? `${dpAnswer} coins — found 5 + 5 by remembering every option`
						: 'fills a table, never commits early'}
				</p>
			</div>
		</div>
	);
};

// The overlapping-subproblems board (Climbing Stairs). Left: the naive recursion
// tree for ways(n), with repeated subproblems glowing. Right: the memoized table
// — each distinct subproblem solved exactly once. The contrast IS the DP idea.
const RecursionBoard = () => {
	const { tree, levels, census } = useMemo(() => {
		const t = buildRecursionTree(STAIRS_N);
		return {
			tree: t,
			levels: recursionTreeToLevels(t.root),
			census: t.census,
		};
	}, []);

	return (
		<div className={styles.recursionBoard}>
			<div className={styles.lane}>
				<div className={styles.laneHead}>
					<span className={styles.laneTag}>Naive recursion</span>
					<span className={styles.laneSub}>
						ways({STAIRS_N}) calls itself — repeated nodes glow
					</span>
				</div>
				<div className={styles.tree} aria-hidden="true">
					{levels.map((level, depth) => (
						<div key={depth} className={styles.treeLevel}>
							{level.map(node => (
								<span
									key={node.id}
									className={`${styles.treeNode} ${
										node.isRepeated ? styles.treeNodeRepeat : ''
									} ${node.isBase ? styles.treeNodeBase : ''}`}
								>
									ways({node.k})
								</span>
							))}
						</div>
					))}
				</div>
				<p className={`${styles.laneVerdict} ${styles.laneVerdictBad}`}>
					{tree.nodeCount} calls — ways(2) alone is recomputed{' '}
					{census.rows.find(r => r.k === 2)?.naive}× (exponential blow-up)
				</p>
			</div>

			<div className={styles.lane}>
				<div className={styles.laneHead}>
					<span className={`${styles.laneTag} ${styles.laneTagDp}`}>
						Memoized table
					</span>
					<span className={styles.laneSub}>
						each ways(k) solved once, then reused
					</span>
				</div>
				<ol className={styles.censusRow} aria-label="Memoized subproblems">
					{census.rows.map(row => (
						<li key={row.k} className={styles.censusCell}>
							<span className={styles.dpIndex}>ways({row.k})</span>
							<span className={styles.censusNaive}>
								naive ×{row.naive}
							</span>
							<span className={styles.censusMemo}>memo ×1</span>
						</li>
					))}
				</ol>
				<p className={`${styles.laneVerdict} ${styles.laneVerdictGood}`}>
					{census.memoTotal} cells — every subproblem solved exactly once, O(n)
				</p>
			</div>
		</div>
	);
};

const IntervalBoard = () => (
	<div className={styles.intervalBoard}>
		<div className={styles.intervalHead}>
			<span className={`${styles.laneTag} ${styles.laneTagSafe}`}>
				Greedy — provably safe
			</span>
			<span className={styles.laneSub}>always take the earliest finish</span>
		</div>
		<ul className={styles.intervalRows}>
			{INTERVALS.map((iv, idx) => {
				const left = (iv.start / INTERVAL_MAX) * 100;
				const width = ((iv.end - iv.start) / INTERVAL_MAX) * 100;
				return (
					<li key={iv.id} className={styles.intervalRow}>
						<span className={styles.intervalLabel}>{iv.id}</span>
						<div className={styles.intervalTrack}>
							<span
								className={`${styles.intervalBar} ${
									iv.chosen ? styles.intervalChosen : styles.intervalSkipped
								}`}
								style={{
									left: `${left}%`,
									width: `${width}%`,
									'--bar-delay': `${idx * 80}ms`,
								}}
							>
								{iv.start}–{iv.end}
							</span>
						</div>
					</li>
				);
			})}
		</ul>
		<p className={`${styles.laneVerdict} ${styles.laneVerdictGood}`}>
			3 activities — the exchange argument proves this is optimal
		</p>
	</div>
);

// The decision-rule board (two-properties scene): optimal substructure is the
// shared base; the *second* ingredient decides the tool.
const DECISION_ROWS = [
	{
		id: 'base',
		label: 'Optimal substructure',
		def: 'An optimal solution is built from optimal sub-solutions.',
		tag: 'needed by both',
		variant: 'shared',
	},
	{
		id: 'greedy',
		label: '+ Greedy-choice property',
		def: 'A local choice is provably part of some optimum (exchange argument).',
		tag: '→ Greedy',
		variant: 'greedy',
	},
	{
		id: 'dp',
		label: '+ Overlapping subproblems',
		def: 'The same subproblem recurs many times → memoize / tabulate.',
		tag: '→ DP',
		variant: 'dp',
	},
];

const DecisionBoard = () => (
	<div className={styles.decisionBoard}>
		<div className={styles.laneHead}>
			<span className={styles.laneTag}>The decision rule</span>
			<span className={styles.laneSub}>
				one shared base + one distinguishing ingredient
			</span>
		</div>
		<ul className={styles.decisionList}>
			{DECISION_ROWS.map(row => (
				<li
					key={row.id}
					className={`${styles.decisionRow} ${
						styles[`decision-${row.variant}`]
					}`}
				>
					<div className={styles.decisionMain}>
						<span className={styles.decisionLabel}>{row.label}</span>
						<span className={styles.decisionDef}>{row.def}</span>
					</div>
					<span className={styles.decisionTag}>{row.tag}</span>
				</li>
			))}
		</ul>
	</div>
);

// Map each scene id to the board it drives + the accessible label + the corner
// notation. Keying by id keeps the stage stable when scenes are added/reordered.
const SCENE_BOARDS = {
	'two-shapes': 'coin',
	'greedy-trap': 'coin',
	'dp-remembers': 'coin',
	'overlapping-subproblems': 'recursion',
	'greedy-safe': 'interval',
	'two-properties': 'decision',
	'choose-what': 'coin',
};

const BOARD_META = {
	coin: {
		label: 'Coin change — greedy commitment versus the dynamic-programming table',
		notation: 'target = 10¢ · coins {1, 5, 6}',
	},
	recursion: {
		label: 'Climbing stairs — naive recursion tree with repeated subproblems versus a memoized table',
		notation: `ways(${STAIRS_N}) · naive vs memo`,
	},
	interval: {
		label: 'Interval scheduling timeline — earliest-finish greedy choice',
		notation: 'O(n log n) · greedy',
	},
	decision: {
		label: 'The greedy-vs-DP decision rule built from optimal substructure',
		notation: 'optimal substructure + ?',
	},
};

const StrategiesStage = ({ activeScene = 0 }) => {
	const sceneId = SCENES[activeScene]?.id ?? SCENES[0].id;
	const board = SCENE_BOARDS[sceneId] ?? 'coin';
	const meta = BOARD_META[board];

	return (
		<div
			className={styles.wrap}
			data-scene={activeScene}
			role="img"
			aria-label={meta.label}
		>
			{board === 'coin' && <CoinBoard sceneId={sceneId} />}
			{board === 'recursion' && <RecursionBoard />}
			{board === 'interval' && <IntervalBoard />}
			{board === 'decision' && <DecisionBoard />}

			<div className={styles.notation} aria-hidden="true">
				{meta.notation}
			</div>
		</div>
	);
};

export default StrategiesStage;
