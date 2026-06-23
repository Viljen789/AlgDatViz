export const STRATEGY_ALGORITHMS = {
	coinChange: {
		id: 'coinChange',
		name: 'Coin Change',
		category: 'DP vs Greedy',
		oneLine:
			'Find the fewest coins that sum to a target. Greedy commits early; DP remembers every option.',
		motionPhrase: 'fill the table, follow the arrows back',
		complexity: 'O(n · |coins|) DP · O(n / minCoin) greedy',
	},
	climbingStairs: {
		id: 'climbingStairs',
		name: 'Climbing Stairs',
		category: 'DP',
		oneLine:
			'Count the ways to climb n stairs taking 1- or 2-step moves at a time.',
		motionPhrase: 'each cell looks two cells back',
		complexity: 'O(n)',
	},
	intervalScheduling: {
		id: 'intervalScheduling',
		name: 'Interval Scheduling',
		category: 'Greedy',
		oneLine:
			'Pick the most non-overlapping intervals. Always commit to whoever finishes first.',
		motionPhrase: 'sort by finish, never overlap',
		complexity: 'O(n log n)',
	},
};

export const STRATEGY_ALGORITHM_ORDER = [
	'coinChange',
	'climbingStairs',
	'intervalScheduling',
];

export const STRATEGY_CATEGORY_ORDER = ['DP vs Greedy', 'DP', 'Greedy'];

export const COIN_CHANGE_PRESETS = [
	{
		id: 'trap',
		label: 'Greedy fails (textbook trap)',
		target: 10,
		coins: [1, 5, 6],
		intent:
			'Greedy takes 6 first and is stuck with four 1¢ coins. DP finds 5+5.',
	},
	{
		id: 'canonical',
		label: 'Greedy succeeds (canonical set)',
		target: 14,
		coins: [1, 5, 10],
		intent: 'A canonical coin set (like real currency) — greedy and DP agree.',
	},
	{
		id: 'wider-trap',
		label: 'Greedy fails harder',
		target: 8,
		coins: [1, 4, 5],
		intent: 'Greedy reaches 5+1+1+1 = 4 coins. DP finds 4+4 = 2.',
	},
];

// Climbing Stairs takes a single input n (the number of stairs). The stepper
// stays in this band so the DP table fits the canvas and the Fibonacci growth
// is legible without overflowing.
export const CLIMBING_STAIRS_RANGE = {
	min: 2,
	max: 12,
	default: 6,
};

// Curated interval scenarios for the Interval Scheduling playground. Each feeds
// buildIntervalSchedulingFrames(intervals) directly. Mirrors the shape of
// COIN_CHANGE_PRESETS so the same preset-menu component renders both.
export const INTERVAL_SCHEDULING_PRESETS = [
	{
		id: 'overlapping-trap',
		label: 'Overlapping (earliest-finish wins)',
		intervals: [
			{ id: 'A', start: 0, end: 2 },
			{ id: 'B', start: 1, end: 4 },
			{ id: 'C', start: 3, end: 5 },
			{ id: 'D', start: 4, end: 7 },
			{ id: 'E', start: 6, end: 8 },
		],
		intent:
			'A tangle of overlaps — greedy keeps whoever finishes first and skips the rest.',
	},
	{
		id: 'all-disjoint',
		label: 'All disjoint (everyone fits)',
		intervals: [
			{ id: 'A', start: 0, end: 1 },
			{ id: 'B', start: 1, end: 2 },
			{ id: 'C', start: 2, end: 3 },
			{ id: 'D', start: 3, end: 4 },
		],
		intent: 'Nothing overlaps, so every interval is compatible and taken.',
	},
	{
		id: 'nested',
		label: 'Nested (long one swallows the rest)',
		intervals: [
			{ id: 'A', start: 0, end: 7 },
			{ id: 'B', start: 1, end: 2 },
			{ id: 'C', start: 3, end: 4 },
			{ id: 'D', start: 5, end: 6 },
		],
		intent:
			'A wide interval contains three short ones — earliest-finish keeps the three, not the giant.',
	},
];

export const COIN_CHANGE_PSEUDO = [
	'dp[0] = 0',
	'for i from 1 to target:',
	'  best = ∞',
	'  for each coin c in coins:',
	'    if i - c >= 0 and dp[i - c] is known:',
	'      best = min(best, dp[i - c] + 1)',
	'  dp[i] = best',
	'return dp[target]',
];

export const CLIMBING_STAIRS_PSEUDO = [
	'dp[0] = 1',
	'dp[1] = 1',
	'for i from 2 to n:',
	'  dp[i] = dp[i - 1] + dp[i - 2]',
	'return dp[n]',
];

export const INTERVAL_SCHEDULING_PSEUDO = [
	'sort intervals by finish time',
	'lastFinish = -∞',
	'for each interval in order:',
	'  if interval.start >= lastFinish:',
	'    take interval',
	'    lastFinish = interval.end',
	'  else: skip interval',
	'return chosen set',
];

// Cheat sheet for the Strategies topic. Names the three distinct properties and
// the explicit decision rule built from them.
export const STRATEGIES_CHEAT_SHEET = {
	keyIdea:
		'The decision rule: optimal substructure is the shared base for both strategies. Add a provable greedy-choice property ⇒ greedy is safe. Find overlapping subproblems instead ⇒ use DP (memoize/tabulate). One counterexample to the greedy choice ⇒ greedy is unsafe.',
	sections: [
		{
			title: 'The two strategies',
			items: [
				{
					term: 'Greedy',
					def: 'Commit to the locally best move now, never revise. Fast, but only correct when provably safe.',
				},
				{
					term: 'Dynamic programming',
					def: 'Solve each subproblem once, store the answer, build the optimum from already-optimal smaller answers.',
				},
			],
		},
		{
			title: 'When greedy is safe',
			items: [
				{
					term: 'Greedy-choice property',
					def: 'A locally optimal choice can be extended to a globally optimal solution — provable by an exchange argument (e.g. interval scheduling: earliest finish).',
				},
				{
					term: 'Optimal substructure',
					def: 'An optimal solution is built from optimal solutions to its subproblems. Required by both greedy AND DP.',
				},
			],
		},
		{
			title: 'When you need DP',
			items: [
				{
					term: 'Overlapping subproblems',
					def: 'The same subproblem recurs many times (e.g. dp[i − c] reused across amounts). DP solves each once instead of recomputing.',
				},
				{
					term: 'Memoization (top-down)',
					def: 'Recurse, but cache each subproblem result so repeats are free.',
				},
				{
					term: 'Tabulation (bottom-up)',
					def: 'Fill a table from base cases upward, so every cell is read only after it is final.',
				},
			],
		},
	],
};
