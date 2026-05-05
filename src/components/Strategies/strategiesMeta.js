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
		intent: 'Greedy takes 6 first and is stuck with four 1¢ coins. DP finds 5+5.',
	},
	{
		id: 'canonical',
		label: 'Greedy succeeds (canonical set)',
		target: 14,
		coins: [1, 5, 10],
		intent:
			'A canonical coin set (like real currency) — greedy and DP agree.',
	},
	{
		id: 'wider-trap',
		label: 'Greedy fails harder',
		target: 8,
		coins: [1, 4, 5],
		intent: 'Greedy reaches 5+1+1+1 = 4 coins. DP finds 4+4 = 2.',
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
