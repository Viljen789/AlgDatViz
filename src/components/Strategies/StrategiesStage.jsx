import { useMemo } from 'react';
import styles from './StrategiesStage.module.css';

// The synchronized concept stage. It reacts to the active scrolly scene and
// visualizes the greedy-vs-DP fork on two running examples:
//   • coin change (target 10, coins {1,5,6}) — where greedy is trapped and DP
//     wins, used for the first three scenes plus the closing summary;
//   • interval scheduling — where the earliest-finish greedy choice is safe,
//     used for the "when greedy wins" scene.
// Everything is token-tinted; the topic hue arrives via --topic-accent.

const COINS = [1, 5, 6];
const TARGET = 10;

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

const CoinBoard = ({ activeScene }) => {
	const dp = useMemo(buildDpTable, []);

	// How many DP cells have been "filled" — scene 2 reveals the table cell by
	// cell as the prose explains it; scene 0/1 keep it dormant.
	const filledThrough = (() => {
		switch (activeScene) {
			case 2:
				return TARGET; // dp-remembers: whole table is settled
			case 4:
				return TARGET; // summary: keep the answer visible
			default:
				return 0;
		}
	})();

	const showGreedy = activeScene <= 1 || activeScene === 4;
	const greedyTrapped = activeScene >= 1;
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

const StrategiesStage = ({ activeScene = 0 }) => {
	const showIntervals = activeScene === 3;

	return (
		<div
			className={styles.wrap}
			data-scene={activeScene}
			role="img"
			aria-label={
				showIntervals
					? 'Interval scheduling timeline — earliest-finish greedy choice'
					: 'Coin change — greedy commitment versus the dynamic-programming table'
			}
		>
			{showIntervals ? (
				<IntervalBoard />
			) : (
				<CoinBoard activeScene={activeScene} />
			)}

			<div className={styles.notation} aria-hidden="true">
				{showIntervals ? 'O(n log n) · greedy' : 'target = 10¢ · coins {1, 5, 6}'}
			</div>
		</div>
	);
};

export default StrategiesStage;
