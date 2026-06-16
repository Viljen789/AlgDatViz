// The five scrolly scenes that build quicksort intuition before the playground.
//
// The same eight values as the merge-sort lesson, so a student recognises the
// data and can contrast the two strategies. Quicksort here is LOMUTO partition
// with the pivot = the last element (the CLRS variant, matching the synced
// pseudocode and the sandbox generator).
//
// Each scene carries a `check` graded by the shared checkAnswer. Wrong answers
// are never punished: the explanation reveals regardless, and every choice-style
// distractor carries a misconception line (guardrail: misconceptionCoverage.test).
//
// The stage visualizes these scenes from the real frame generator
// (utils/sorting/quickPartitionFrames.js) — the partition pass it shows is the
// partition pass it computes. Honest by construction.

export const STAGE_VALUES = [38, 27, 43, 3, 9, 82, 10, 51];

// Ground truth for the first Lomuto partition of STAGE_VALUES, used by the scene
// copy below and verified by the generator (and quickPartitionFrames.test.js):
// the pivot is the last value, 51; six values are smaller, so it lands at index
// 6, leaving the left range [0, 5] and the right range [7, 7] (just 82). The
// Stage re-derives all of this from getQuickSortFrames at runtime, so these
// numbers live only here, in prose, as the source the prompts cite.

export const SCENES = [
	{
		id: 'partition',
		eyebrow: 'The pass',
		title: 'Quicksort makes progress with one move: partition.',
		body: 'Pick a pivot — here, the last value, 51. Sweep the rest left to right with two pointers. A boundary i trails behind, marking everything smaller than the pivot; a scanner j walks ahead. When j finds a value below the pivot, it gets pulled inside the boundary with a swap.',
		check: {
			kind: 'choice',
			prompt:
				'After one full partition pass, what is true of the pivot value 51?',
			options: [
				'It sits in its final sorted position and never moves again.',
				'It is now the smallest value in the array.',
				'It still has to be sorted on the next pass.',
				'It moved to the exact middle index of the array.',
			],
			answer: 'It sits in its final sorted position and never moves again.',
			misconceptions: {
				'It is now the smallest value in the array.':
					'Partition does not rank the pivot — it only splits the rest into "below" and "not below". 51 ends up wherever that boundary falls, with smaller values left and larger values right, not as the minimum.',
				'It still has to be sorted on the next pass.':
					'The whole point of partition is that the pivot is DONE. Once values are split around it, its index is correct for the fully sorted array, so recursion never touches it again — it only sorts the two sides.',
				'It moved to the exact middle index of the array.':
					'The pivot lands wherever the count of smaller values puts it, not at the middle. With these values 51 lands at index 6, because six values are below it — an off-centre split, which is exactly how quicksort can go lopsided.',
			},
			explanation:
				'Partition places the pivot at its FINAL index in one linear pass: every value below it is moved left, every value at-or-above it stays right, and the pivot is swapped into the gap between them. That index never changes again — it is the one element each partition fully sorts. Everything else quicksort does is recursion on the two sides.',
		},
	},
	{
		id: 'place',
		eyebrow: 'Snap home',
		title: 'The boundary decides where the pivot lands.',
		body: 'When the sweep finishes, the boundary i marks the last value smaller than the pivot. One final swap drops the pivot into the slot just past the boundary — its home. Watch 51 snap into place between the values below it and the values above it.',
		check: {
			kind: 'numeric',
			prompt:
				'Six of the eight values are smaller than the pivot 51. At which 0-based index does 51 come to rest?',
			answer: 6,
			explanation:
				'The pivot lands just past all the values smaller than it. Six values are below 51, so they fill indices 0 through 5, and the pivot snaps into index 6. In general the pivot lands at (low + number of values below it) — the boundary position. The single value larger than 51 (which is 82) is the only thing left on its right.',
			placeholder: 'Final index of the pivot',
		},
	},
	{
		id: 'recurse',
		eyebrow: 'Divide & conquer',
		title: 'Now recurse on the two sides. Never across the pivot.',
		body: 'Partition left two smaller ranges: everything below the pivot, and everything above it. Quicksort calls itself on each. The pivot in the middle is already final, so it is excluded from both calls — the recursion only ever shrinks.',
		check: {
			kind: 'order',
			prompt:
				'Order these by when quicksort finishes them, soonest first: a one-element range, the left subarray below the pivot, the original whole array.',
			items: [
				'left subarray below the pivot',
				'the original whole array',
				'a one-element range',
			],
			answer: [
				'a one-element range',
				'left subarray below the pivot',
				'the original whole array',
			],
			explanation:
				'Recursion bottoms out first: a one-element (or empty) range is sorted with zero work — the base case. A subarray finishes once both of its own sides return. The original call finishes last of all, only after every partition beneath it has placed its pivot. That is the divide-and-conquer shape: small pieces resolve, then their parents, up to the root.',
		},
	},
	{
		id: 'pivot-choice',
		eyebrow: 'When it goes wrong',
		title: 'The pivot choice is everything. A bad split is quadratic.',
		body: 'A good pivot halves the range, so the recursion is log n deep — the average case is Θ(n log n). But the last-element pivot has a nemesis: an already-sorted array. Then every partition peels off just one element and recurses on the rest. The tree is a stick, n levels tall.',
		check: {
			kind: 'choice',
			prompt:
				'You run this last-element-pivot quicksort on an array that is ALREADY sorted ascending. What is the running time?',
			options: ['Θ(n log n)', 'Θ(n²)', 'Θ(n)', 'Θ(log n)'],
			answer: 'Θ(n²)',
			misconceptions: {
				'Θ(n log n)':
					'Θ(n log n) is the AVERAGE (and best) case, when pivots split the range roughly in half. A sorted input with a last-element pivot never splits in half — the pivot is always the maximum, so one side is empty and the recursion goes n levels deep, not log n.',
				'Θ(n)':
					'A single partition is Θ(n), but quicksort runs many of them. On sorted input there are n partitions whose sizes are n, n-1, n-2, …, and that sum is Θ(n²), not Θ(n). No comparison sort can hit Θ(n) anyway.',
				'Θ(log n)':
					'Θ(log n) is smaller than the time to even look at every element once, so no sort can achieve it. You may be thinking of the recursion DEPTH in the good case (log n) — but depth is not total work, and here the depth is n, not log n.',
			},
			explanation:
				'On a sorted array the last value is always the largest, so every partition puts all n-1 others on the left and an empty range on the right. The pivot peels one element per level: ranges of size n, n-1, n-2, …, 1. Each does linear work, and n + (n-1) + … + 1 = n(n-1)/2 = Θ(n²). The very input you would hope is easiest is quicksort’s worst case — which is why real implementations randomize or use median-of-three pivots.',
		},
	},
	{
		id: 'recurrence',
		eyebrow: 'Cost',
		title:
			'The worst case is T(n) = T(n − 1) + n — a recurrence you have already solved.',
		body: 'A lopsided partition leaves one empty side and one side of size n − 1, after doing n work to scan. That is T(n) = T(n − 1) + Θ(n). Unrolling it stacks n + (n − 1) + … + 1 = Θ(n²). The good case, T(n) = 2T(n/2) + Θ(n), is the Master-Theorem case that gives Θ(n log n) — the same recurrence as merge sort.',
		check: {
			kind: 'numeric',
			prompt:
				'Unroll the worst case for n = 8: the partitions do 8 + 7 + 6 + … + 1 comparisons. What is that total?',
			answer: 28,
			explanation:
				'8 + 7 + 6 + 5 + 4 + 3 + 2 + 1 = 36, but the size-1 ranges are base cases that compare nothing, so the partitions that actually compare are sizes 8 down to 2, giving 7 + 6 + 5 + 4 + 3 + 2 + 1 = 28 = n(n-1)/2. That quadratic total is what T(n) = T(n − 1) + n unrolls to. Contrast the Master Theorem: a balanced split is T(n) = 2T(n/2) + Θ(n) with a = 2, b = 2, f(n) = Θ(n) = Θ(n^{log_b a}), the tie case that yields Θ(n log n). Same algorithm, two different recurrences — the pivot decides which one you get.',
			placeholder: 'Worst-case comparison count',
		},
	},
];
