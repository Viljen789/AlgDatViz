export const STRATEGY_ALGORITHMS = {
	coinChange: {
		id: 'coinChange',
		name: 'Coin change',
		category: 'DP vs Greedy',
		oneLine:
			'Find the fewest coins that sum to a target. Greedy commits early; DP remembers every option.',
		motionPhrase: 'fill the table, follow the arrows back',
		complexity: 'O(n · |coins|) DP · O(n / minCoin) greedy',
	},
	climbingStairs: {
		id: 'climbingStairs',
		name: 'Climbing stairs',
		category: 'DP',
		oneLine:
			'Count the ways to climb n stairs taking 1- or 2-step moves at a time.',
		motionPhrase: 'each cell looks two cells back',
		complexity: 'O(n)',
	},
	rodCutting: {
		id: 'rodCutting',
		name: 'Rod cutting',
		category: 'DP',
		oneLine:
			'Cut a rod into pieces to maximize revenue from a length-priced table.',
		motionPhrase: 'best of price[i] + dp[n − i]',
		complexity: 'O(n²)',
	},
	lcs: {
		id: 'lcs',
		name: 'Longest common subsequence',
		category: 'DP',
		oneLine:
			'Find the longest sequence of characters two strings share, in order but not adjacent.',
		motionPhrase: 'match → diagonal, else max(↑, ←)',
		complexity: 'O(m·n)',
	},
	knapsack01: {
		id: 'knapsack01',
		name: '0/1 knapsack',
		category: 'DP',
		oneLine:
			'Pack indivisible items for maximum value within a weight budget — take each whole or not at all.',
		motionPhrase: 'each cell: take it or skip it',
		complexity: 'O(n·W)',
	},
	fractionalKnapsack: {
		id: 'fractionalKnapsack',
		name: 'Fractional knapsack',
		category: 'Greedy',
		oneLine:
			'The same bag, but items can be split — so greedily taking the densest first is optimal.',
		motionPhrase: 'densest first, split the last',
		complexity: 'O(n log n)',
	},
	intervalScheduling: {
		id: 'intervalScheduling',
		name: 'Interval scheduling',
		category: 'Greedy',
		oneLine:
			'Pick the most non-overlapping intervals. Always commit to whoever finishes first.',
		motionPhrase: 'sort by finish, never overlap',
		complexity: 'O(n log n)',
	},
	huffman: {
		id: 'huffman',
		name: 'Huffman coding',
		category: 'Greedy',
		oneLine:
			'Build an optimal prefix-free code by greedily merging the two rarest symbols.',
		motionPhrase: 'merge the two rarest, repeat',
		complexity: 'O(n log n)',
	},
};

export const STRATEGY_ALGORITHM_ORDER = [
	'coinChange',
	'climbingStairs',
	'rodCutting',
	'lcs',
	'knapsack01',
	'intervalScheduling',
	'huffman',
	'fractionalKnapsack',
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

export const ROD_CUTTING_PSEUDO = [
	'dp[0] = 0',
	'for j from 1 to n:',
	'  best = −∞',
	'  for i from 1 to j:',
	'    if price[i] + dp[j − i] > best:',
	'      best = price[i] + dp[j − i];  firstCut[j] = i',
	'  dp[j] = best',
	'follow firstCut[] from n to read the pieces',
];

// Curated rod-cutting instances. `prices[i−1]` is the price of a piece of
// length i; `n` is the rod to cut. Mirrors the other preset shapes.
export const ROD_CUTTING_PRESETS = [
	{
		id: 'clrs',
		label: 'Classic (CLRS, n = 8)',
		prices: [1, 5, 8, 9, 10, 17, 17, 20],
		n: 8,
		intent:
			'The textbook table — cutting an 8-rod into 2 + 6 earns 22, beating the 20 a whole rod sells for.',
	},
	{
		id: 'whole-wins',
		label: 'Whole rod wins',
		prices: [2, 5, 9, 30],
		n: 4,
		intent:
			'Prices climb fast enough that no split beats selling the length-4 rod intact.',
	},
	{
		id: 'all-ones',
		label: 'Length is everything',
		prices: [1, 2, 3, 4, 5, 6],
		n: 6,
		intent:
			'Strictly linear prices — every decomposition ties, so cutting never helps.',
	},
];

export const LCS_PSEUDO = [
	'dp[i][0] = dp[0][j] = 0   // empty prefix',
	'for i from 1 to m:',
	'  for j from 1 to n:',
	'    if X[i] == Y[j]:',
	'      dp[i][j] = dp[i−1][j−1] + 1',
	'    else:',
	'      dp[i][j] = max(dp[i−1][j], dp[i][j−1])',
	'trace back from dp[m][n] to read the subsequence',
];

// Curated string pairs for the LCS playground. `x` runs down the rows, `y` along
// the columns. Mirrors the other preset shapes.
export const LCS_PRESETS = [
	{
		id: 'dna',
		label: 'Short (AGCAT / GAC)',
		x: 'AGCAT',
		y: 'GAC',
		intent:
			'Small enough to step through every cell — watch matches jump diagonally.',
	},
	{
		id: 'clrs',
		label: 'Classic (ABCBDAB / BDCAB)',
		x: 'ABCBDAB',
		y: 'BDCAB',
		intent:
			'The textbook instance — a length-4 subsequence like BCBA threads through both strings.',
	},
	{
		id: 'words',
		label: 'Words (HUMAN / CHIMP)',
		x: 'HUMAN',
		y: 'CHIMP',
		intent:
			'Two real words sharing only a couple of letters in order — the LCS is short.',
	},
];

export const KNAPSACK01_PSEUDO = [
	'dp[0][w] = 0 for all w        // no items',
	'for i from 1 to n:',
	'  for w from 0 to W:',
	'    if weight[i] > w:',
	'      dp[i][w] = dp[i−1][w]',
	'    else:',
	'      dp[i][w] = max(dp[i−1][w], value[i] + dp[i−1][w − weight[i]])',
	'trace back from dp[n][W] to read the chosen items',
];

export const FRACTIONAL_KNAPSACK_PSEUDO = [
	'sort items by value / weight, descending',
	'remaining = W;  total = 0',
	'for each item in ratio order:',
	'  if item.weight <= remaining:',
	'    take all of it;  total += value;  remaining −= weight',
	'  else:',
	'    f = remaining / item.weight        // take a fraction',
	'    total += f · value;  remaining = 0;  stop',
	'return total',
];

// Shared knapsack instances, used by BOTH the 0/1 (DP) and fractional (greedy)
// playgrounds so the same bag can be solved two ways. Capacities are kept small
// so the 0/1 dp grid (n × W) stays legible, while the fractional run still beats
// the 0/1 optimum on the same instance.
export const KNAPSACK_PRESETS = [
	{
		id: 'contrast',
		label: 'Greedy splits win (W = 10)',
		capacity: 10,
		items: [
			{ name: 'A', weight: 5, value: 10 },
			{ name: 'B', weight: 4, value: 40 },
			{ name: 'C', weight: 6, value: 30 },
			{ name: 'D', weight: 3, value: 50 },
		],
		intent:
			'0/1 packs B + D for 90; fractional splits C to reach 105 — splitting is worth 15 here.',
	},
	{
		id: 'ratio-trap',
		label: 'The ratio trap (W = 4)',
		capacity: 4,
		items: [
			{ name: 'P', weight: 1, value: 2 },
			{ name: 'Q', weight: 4, value: 7 },
		],
		intent:
			'Densest-first grabs P and strands 3 capacity → only 0/1-greedy fails; DP finds Q = 7, fractional 7.25.',
	},
	{
		id: 'roomy',
		label: 'Balanced (W = 8)',
		capacity: 8,
		items: [
			{ name: 'A', weight: 2, value: 12 },
			{ name: 'B', weight: 3, value: 15 },
			{ name: 'C', weight: 5, value: 25 },
			{ name: 'D', weight: 4, value: 16 },
		],
		intent:
			'A roomier bag where several items fit — compare which the two strategies choose.',
	},
];

export const HUFFMAN_PSEUDO = [
	'Q ← min-heap of leaves, keyed by frequency',
	'while Q has more than one tree:',
	'  x ← extract-min(Q)        // smallest',
	'  y ← extract-min(Q)        // next smallest',
	'  z ← new node, z.freq = x.freq + y.freq',
	'  z.left ← x;  z.right ← y',
	'  insert z into Q',
	'root ← the one tree left in Q',
	'read codes: 0 down left edges, 1 down right edges',
];

// Curated symbol tables for the Huffman playground. Each feeds
// buildHuffmanFrames(symbols) directly. Mirrors the preset shape used by the
// other Strategies problems so the same preset menu renders them.
export const HUFFMAN_PRESETS = [
	{
		id: 'clrs',
		label: 'Classic (CLRS a–f)',
		symbols: [
			{ char: 'a', freq: 45 },
			{ char: 'b', freq: 13 },
			{ char: 'c', freq: 12 },
			{ char: 'd', freq: 16 },
			{ char: 'e', freq: 9 },
			{ char: 'f', freq: 5 },
		],
		intent:
			'The textbook instance: a is so common it gets a 1-bit code while f sinks four levels deep.',
	},
	{
		id: 'abracadabra',
		label: 'Letters of ABRACADABRA',
		symbols: [
			{ char: 'A', freq: 5 },
			{ char: 'B', freq: 2 },
			{ char: 'R', freq: 2 },
			{ char: 'C', freq: 1 },
			{ char: 'D', freq: 1 },
		],
		intent:
			'Real letter counts — A dominates, so it earns the shortest code; the singletons go deepest.',
	},
	{
		id: 'uniform',
		label: 'Near-uniform (no gain)',
		symbols: [
			{ char: 'p', freq: 4 },
			{ char: 'q', freq: 4 },
			{ char: 'r', freq: 4 },
			{ char: 's', freq: 4 },
		],
		intent:
			'When every symbol is equally likely, Huffman collapses to a balanced tree — no better than fixed-width.',
	},
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
