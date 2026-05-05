import OverlaySheet from '../../../common/OverlaySheet/OverlaySheet';
import { STRATEGY_ALGORITHMS } from '../strategiesMeta';
import styles from './StrategiesReadMoreOverlay.module.css';

const NOTES = {
	coinChange: {
		thinks:
			'Define dp[i] = the fewest coins that sum to i. The recurrence considers every coin c that fits, then picks the smallest of dp[i-c] + 1. Greedy bypasses the recurrence and just takes the largest coin every time. The cost of greedy\'s simplicity is correctness — it only works when the coin set is canonical.',
		watchOuts: [
			'Greedy is correct when each large coin is at least double the next smaller one — that is the canonicity condition.',
			'Real currency is canonical by design. Made-up coin sets often are not.',
			'DP\'s O(n · |coins|) cost is small in practice, but it does require remembering every subproblem.',
		],
		complexity: [
			{ label: 'DP TIME', value: 'O(target · |coins|)' },
			{ label: 'DP SPACE', value: 'O(target)' },
			{ label: 'GREEDY TIME', value: 'O(target / minCoin)' },
		],
	},
	climbingStairs: {
		thinks:
			'dp[i] = number of distinct sequences of 1- and 2-step moves that reach stair i. Every such sequence ends in either a 1-step from stair i-1 or a 2-step from stair i-2 — so dp[i] = dp[i-1] + dp[i-2]. The recurrence is Fibonacci.',
		watchOuts: [
			'Naive recursion recomputes the same subproblems exponentially.',
			'Memoization or table-filling collapses the work to linear.',
			'Space can be reduced to O(1) by keeping only the last two values.',
		],
		complexity: [
			{ label: 'TIME', value: 'O(n)' },
			{ label: 'SPACE', value: 'O(n) table · O(1) compressed' },
		],
	},
	intervalScheduling: {
		thinks:
			'Sort intervals by finish time. Greedily take the next interval whose start is at least the last finish. The exchange argument: any optimal solution can be transformed into one that includes the earliest-finishing interval without losing intervals.',
		watchOuts: [
			'Sorting by start time or duration is wrong — finish time is the safe rule.',
			'This is one of the rare problems where greedy provably matches the optimal.',
			'Variants (weighted intervals) need DP, not greedy.',
		],
		complexity: [
			{ label: 'TIME', value: 'O(n log n)' },
			{ label: 'SPACE', value: 'O(n)' },
		],
	},
};

const StrategiesReadMoreOverlay = ({ isOpen, onClose, algorithmId }) => {
	const algo = STRATEGY_ALGORITHMS[algorithmId];
	const note = NOTES[algorithmId];
	if (!algo || !note) return null;

	return (
		<OverlaySheet
			isOpen={isOpen}
			onClose={onClose}
			title={algo.name}
			subtitle={algo.oneLine}
			variant="bottom"
		>
			<div className={styles.body}>
				<section className={styles.section}>
					<h3 className={styles.h}>How it thinks</h3>
					<p className={styles.p}>{note.thinks}</p>
				</section>

				<section className={styles.complexity}>
					{note.complexity.map((c, i) => (
						<div key={i} className={styles.cBlock}>
							<span className={styles.cLabel}>{c.label}</span>
							<span className={styles.cVal}>{c.value}</span>
						</div>
					))}
				</section>

				<section className={styles.section}>
					<h3 className={styles.h}>Watch out for</h3>
					<ul className={styles.bullets}>
						{note.watchOuts.map((w, i) => (
							<li key={i}>{w}</li>
						))}
					</ul>
				</section>
			</div>
		</OverlaySheet>
	);
};

export default StrategiesReadMoreOverlay;
