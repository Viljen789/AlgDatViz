// The six scrolly scenes that build quicksort intuition before the playground.
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
// partition pass it computes. Honest by construction. The closing QUICKSELECT
// scene reuses ./quickselectTrace.js the same way, so its prompt and answer are
// DERIVED from the trace (the exam's quicksort-3 instance), never hand-typed.

import { quickselectTrace } from './quickselectTrace.js';

export const STAGE_VALUES = [38, 27, 43, 3, 9, 82, 10, 51];

// The QUICKSELECT scene reuses the exam's quicksort-3 instance verbatim, so a
// student who missed that exam question studies the very same numbers here.
// Everything the scene asserts is read off the deterministic trace — the pivot's
// landing index, its rank, the array after the first partition, and the answer —
// so the lesson can never drift from the generator (or from the exam key).
export const SELECT_INPUT = [50, 80, 20, 90, 10, 70, 40, 60, 30];
export const SELECT_I = 4; // 1-based rank: find the 4th-smallest element
const SELECT_RUN = quickselectTrace(SELECT_INPUT, SELECT_I);
const SELECT_PIVOT = SELECT_INPUT[SELECT_INPUT.length - 1]; // last-element pivot = 30
// The pivot's RANK is its 0-based landing index + 1 (i = 1 is the minimum). The
// recursion compares the requested rank i against this to pick a side: i < rank
// ⇒ left, i > rank ⇒ right, i === rank ⇒ done. We DERIVE the side, never pick it.
const SELECT_PIVOT_RANK = SELECT_RUN.firstPartition.pivotFinalIndex + 1; // = 3
const SELECT_RIGHT_OPTION = 'The right part (values greater than the pivot)';
const SELECT_LEFT_OPTION = 'The left part (values less than the pivot)';
const SELECT_SIDE_ANSWER =
	SELECT_I > SELECT_PIVOT_RANK ? SELECT_RIGHT_OPTION : SELECT_LEFT_OPTION;

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
			kind: 'predict',
			// Opt-in reveal gate: the stage holds the honest pre-partition frame (no
			// auto-play) until this prediction is answered, so the sweep cannot spoil
			// which values land on which side. An inert extra field — graders never
			// read it (same pattern as the merge lesson's predict gate), so grading is
			// untouched. The answer is DERIVED from the real first partition of
			// STAGE_VALUES (see the ground-truth note above): every value below 51
			// goes left, so 82 is the ONLY value that ends up on the pivot's right.
			revealGate: true,
			prompt:
				'Before the sweep runs: the pivot is the last value, 51. Which single value ends up to the RIGHT of the pivot after this one partition?',
			options: [82, 43, 3, 38],
			answer: 82,
			misconceptions: {
				43: 'Partition does not care about position, only "below the pivot or not". 43 < 51, so 43 belongs on the LEFT. The only value that goes right is one that is at-or-above the pivot.',
				3: '3 is far below 51, so it gets pulled inside the boundary early and ends up on the LEFT. Small values never land on the right of the pivot, since that side is for values not below it.',
				38: '38 < 51, so it stays to the LEFT of the pivot. Being near the front of the array does not matter; partition splits purely by value, and everything below 51 goes left.',
			},
			explanation:
				'Partition splits the rest into "below the pivot" and "not below". Of these eight values, only 82 is at-or-above 51, so 82 is the single value on the pivot’s right; the other six (38, 27, 43, 3, 9, 10) are all smaller and land on its left. The pivot then drops into the gap between the two sides, index 6 here, its final sorted slot. Watch the sweep below confirm exactly this.',
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
	{
		id: 'select',
		eyebrow: 'Same engine, new job',
		title: 'The same partition also finds the k-th smallest.',
		body: `Partition does more than sort. After one pass the pivot sits at its FINAL rank r — every value below it is to the left, every value above to the right. If you only want the i-th smallest, you do not need the other side: recurse LEFT when i < r, recurse RIGHT when i > r, and you are DONE the moment i = r. Here partition lands ${SELECT_PIVOT} at rank ${SELECT_PIVOT_RANK}; we want the ${SELECT_I}-th, so ${SELECT_I} > ${SELECT_PIVOT_RANK} sends us right — the values less than the pivot are discarded untouched. Throwing away one side each step makes the expected time Θ(n), far below quicksort's Θ(n log n); the worst case is still Θ(n²). This is RANDOMIZED-SELECT.`,
		check: {
			kind: 'choice',
			prompt: `Pivot ${SELECT_PIVOT} has landed at its final spot — it is the ${SELECT_PIVOT_RANK}rd smallest. To find the ${SELECT_I}th smallest, which side do you search next?`,
			options: [
				SELECT_RIGHT_OPTION,
				SELECT_LEFT_OPTION,
				`Neither — ${SELECT_PIVOT} is the answer`,
				'Both parts, fully',
			],
			answer: SELECT_SIDE_ANSWER,
			misconceptions: {
				[SELECT_LEFT_OPTION]: `The left part holds the values SMALLER than ${SELECT_PIVOT} — ranks 1 and 2, both below the ${SELECT_I}th. You go left only when the rank you want is LESS than the pivot's rank (i < r). Here i = ${SELECT_I} is greater than r = ${SELECT_PIVOT_RANK}, so the answer must lie among the larger values on the right.`,
				[`Neither — ${SELECT_PIVOT} is the answer`]: `The pivot would be the answer only if its rank equalled the rank you want (i = r). It landed at rank ${SELECT_PIVOT_RANK}, but you asked for rank ${SELECT_I}, and ${SELECT_I} ≠ ${SELECT_PIVOT_RANK} — so ${SELECT_PIVOT} is the wrong element and the search continues on one side.`,
				'Both parts, fully': `Searching both sides is what QUICKSORT does, and it is exactly the work quickselect avoids. Because the pivot's rank already tells you which side can contain the i-th smallest, you recurse into ONLY that side and discard the other. Discarding a side each step is what buys the Θ(n) expected time instead of Θ(n log n).`,
			},
			explanation: `The pivot's landing index fixes its rank r = ${SELECT_PIVOT_RANK} (rank 1 is the minimum). Compare it to the rank you want, i = ${SELECT_I}: since ${SELECT_I} > ${SELECT_PIVOT_RANK}, the i-th smallest must be among the values GREATER than the pivot, so you recurse RIGHT and drop the ${SELECT_PIVOT_RANK} values on the left forever (had i < r you would go left; had i = r the pivot itself would be the answer). Continuing this way, RANDOMIZED-SELECT here returns the ${SELECT_I}th smallest, ${SELECT_RUN.selected}, without ever fully sorting — discarding one side each step is why the expected cost is Θ(n), not Θ(n log n).`,
		},
	},
];
