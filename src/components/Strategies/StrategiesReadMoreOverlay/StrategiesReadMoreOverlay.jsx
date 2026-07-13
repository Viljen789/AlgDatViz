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
	rodCutting: {
		thinks:
			'Let dp[j] be the most revenue obtainable from a rod of length j. Any way of cutting it has some leading piece of length i (1 ≤ i ≤ j) that sells for price[i], leaving a rod of length j−i solved optimally — so dp[j] = max over i of (price[i] + dp[j−i]). Recording which i won lets you reconstruct the actual pieces. The subproblems dp[0..j−1] are reused by every larger length, which is exactly why a table beats naive recursion.',
		watchOuts: [
			'Greedy by best price-per-length can lose — only DP guarantees the optimum here.',
			'Keep a firstCut[] (or choice) array, or you get the value but not the cuts.',
			'There are O(n) leading-piece choices for each of n lengths → O(n²) time.',
			'If prices are super-additive, the optimal answer may be to not cut at all.',
		],
		complexity: [
			{ label: 'TIME', value: 'O(n²)' },
			{ label: 'SPACE', value: 'O(n)' },
		],
	},
	lcs: {
		thinks:
			'dp[i][j] is the length of the longest common subsequence of the prefixes X[1..i] and Y[1..j]. If the last characters match, the LCS must include them, so dp[i][j] = dp[i−1][j−1] + 1 (a diagonal step). If they differ, at least one of those characters is unused, so dp[i][j] = max(dp[i−1][j], dp[i][j−1]). The border is zero. Tracing back from the bottom-right — diagonals on matches — reconstructs an actual subsequence. A subsequence keeps order but need not be contiguous, which is what makes the 2-D table necessary.',
		watchOuts: [
			'Subsequence ≠ substring: the characters keep their order but can have gaps.',
			'The LCS is not always unique — several length-k subsequences may tie.',
			'You need the whole table (or clever row-rolling) to trace the string back, even though the length alone needs only two rows.',
			'It generalises directly to edit distance and diff tools.',
		],
		complexity: [
			{ label: 'TIME', value: 'O(m·n)' },
			{ label: 'SPACE', value: 'O(m·n)' },
		],
	},
	knapsack01: {
		thinks:
			'dp[i][w] is the best value from the first i items within capacity w. For each item you either skip it — dp[i−1][w] — or, if it fits, take it — value[i] + dp[i−1][w−weight[i]] — and keep the larger. The top row (no items) is zero. Because items are indivisible, you cannot just take the densest-per-weight item first: that greedy rule can strand capacity. Only filling the table considers every combination implicitly. Tracing back, a value that differs from the row above means that item was taken.',
		watchOuts: [
			'Greedy by value-per-weight is WRONG for 0/1 — it works only when items can be split (the fractional version).',
			'Runtime O(n·W) is pseudo-polynomial: it depends on the numeric capacity, not just the item count — this is why binary knapsack is NP-hard in general.',
			'Each item contributes at most once; that is the whole difference from unbounded knapsack.',
			'Keep the table (or a choice array) to recover which items were taken, not just the value.',
		],
		complexity: [
			{ label: 'TIME', value: 'O(n·W)' },
			{ label: 'SPACE', value: 'O(n·W)' },
			{ label: 'CLASS', value: 'pseudo-poly' },
		],
	},
	fractionalKnapsack: {
		thinks:
			'When items can be divided, sort by density (value ÷ weight) and keep taking the densest, splitting the last item to fill the bag exactly. The greedy-choice property holds: an exchange argument shows that swapping any taken weight for an equal weight of a denser item never lowers the total, so the densest-first choice is always part of some optimum. This is the rare case where the simple greedy rule provably matches the optimum — and it is exactly what fails for the indivisible 0/1 version.',
		watchOuts: [
			'The split happens to at most one item — the first that does not fit whole.',
			'This greedy proof does NOT carry over to 0/1 knapsack; do not reuse it there.',
			'Sorting dominates the cost at O(n log n); the fill itself is linear.',
			'Fractional value is always ≥ the 0/1 value on the same instance — splitting can only help.',
		],
		complexity: [
			{ label: 'TIME', value: 'O(n log n)' },
			{ label: 'SPACE', value: 'O(n)' },
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
	huffman: {
		thinks:
			'Keep a min-priority-queue of trees keyed by frequency. Repeatedly extract the two lightest and merge them under a new parent whose weight is their sum; after n−1 merges one tree remains. Codes are read by writing 0 down every left edge and 1 down every right edge — so no codeword is a prefix of another (prefix-free). The greedy choice is provably optimal: an exchange argument shows the two rarest symbols can always be the two deepest siblings without increasing the total encoded length Σ freq(c)·depth(c).',
		watchOuts: [
			'It is greedy, but the proof of optimality is the whole point — merging the two rarest is what an exchange argument justifies.',
			'Prefix-free codes need no separators: the tree structure makes decoding unambiguous.',
			'When all frequencies are equal, Huffman degenerates to a balanced tree and saves nothing over a fixed-width code.',
			'Building the queue is the cost: n extract-mins and inserts give O(n log n).',
		],
		complexity: [
			{ label: 'TIME', value: 'O(n log n)' },
			{ label: 'SPACE', value: 'O(n)' },
			{ label: 'OPTIMUM', value: 'min Σ freq·depth' },
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
